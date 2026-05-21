/**
 * useBackNativo.ts
 * =================
 * Hook centralizado para que modales / overlays / drawers / paneles
 * full-screen se cierren con el botón "atrás" del celular (Android), el
 * gesto swipe-back de iOS, y la flecha "atrás" del navegador en desktop.
 *
 * Encapsula el patrón `pushState` + `popstate` que estaba duplicado en
 * `ModalBottom.tsx`, `ModalImagenes.tsx`, `ModalArticuloDetalle.tsx`,
 * `PanelInfoContacto.tsx`, `PanelPreviewNegocio.tsx` y otros.
 *
 * Cómo funciona:
 *  - Cuando `abierto` pasa a `true`, el hook empuja una entrada al
 *    history con un state que lleva un id único bajo la key
 *    `discriminador`. Esa entrada apunta a la misma URL.
 *  - Si el usuario hace back nativo, la entrada se consume y nuestro
 *    listener detecta que el state ya no tiene el id propio → llama
 *    a `onCerrar()`. El consumidor cambia su prop `abierto` a `false`,
 *    el modal se cierra.
 *  - Si el usuario cierra el modal por otro camino (X, ESC, backdrop),
 *    el consumidor pone `abierto: false` directamente. El hook detecta
 *    el cambio y ejecuta `history.back()` (en el cleanup del effect)
 *    para limpiar la entrada que nosotros pusheamos. Esto evita
 *    "entradas fantasma" en el stack.
 *  - Si el padre desmonta el componente directamente (típico patrón
 *    `{condicion && <Modal/>}` → condicion=false), el cleanup del
 *    effect TAMBIÉN se ejecuta y limpia la entrada del history. Esto
 *    cubre el caso D8: modal cerrado con X custom que llama `onClose`
 *    del padre, donde el padre desmonta el modal sin pasar por el
 *    ciclo `abierto: false`.
 *  - Modales anidados (modal B sobre modal A) funcionan correctamente
 *    porque cada uno tiene su propio `id` único; el back cierra el
 *    último abierto sin afectar a los anteriores.
 *
 * Patrón de uso típico:
 * ```tsx
 * function MiModal({ abierto, onCerrar }: Props) {
 *   useBackNativo({ abierto, onCerrar });
 *   if (!abierto) return null;
 *   return <div>...</div>;
 * }
 * ```
 *
 * Para modales con animación de cierre, pasarle el handler con
 * animación (no el `onCerrar` directo) — así el back nativo dispara
 * la misma animación de salida que el botón X:
 * ```tsx
 * useBackNativo({ abierto, onCerrar: handleCerrarConAnimacion });
 * ```
 *
 * Documentado en `docs/estandares/LECCIONES_TECNICAS.md`.
 *
 * UBICACIÓN: apps/web/src/hooks/useBackNativo.ts
 */

import { useEffect, useRef } from 'react';

interface UseBackNativoOptions {
    /** Estado actual del modal/overlay. Cuando pasa de false → true se
     *  empuja al history; cuando pasa de true → false se limpia. */
    abierto: boolean;
    /** Función que el hook llama cuando el usuario hace back nativo y se
     *  detecta que la entrada propia ya no está en el history. Debe
     *  encargarse de actualizar el estado del componente para que
     *  `abierto` pase a `false`. */
    onCerrar: () => void;
    /**
     * Key bajo la que se guarda el id en el state del history. Default:
     * `'_back_modal'`. Útil pasar uno custom para overlays con
     * comportamiento especial (ej. ChatYA usa `'chatya'`, modales de
     * ScanYA usan `'scanyaModal'`) y para evitar choques cuando se
     * anidan distintos tipos de overlays.
     */
    discriminador?: string;
}

/**
 * Hook que conecta un modal/overlay con el botón atrás del navegador.
 * Ver doc del archivo para detalles.
 */
export function useBackNativo({
    abierto,
    onCerrar,
    discriminador = '_back_modal',
}: UseBackNativoOptions): void {
    const historyPushedRef = useRef(false);
    // Id único por instancia. Identifica nuestra entrada del history sin
    // confundirla con la de otros overlays anidados que usen la misma key.
    const idRef = useRef(
        `${discriminador}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    );
    const popStateHandlerRef = useRef<(() => void) | null>(null);
    // Snapshot del state que había en `history.state` ANTES de nuestro
    // push. Lo usamos en el cleanup para detectar si otro overlay pusheó
    // su propia entrada encima de nosotros (en cuyo caso NO debemos
    // hacer `history.back()` — consumiría la entrada del overlay encima
    // y lo cerraría sin querer).
    const prevStateRef = useRef<Record<string, unknown>>({});
    // Ref a `onCerrar` para que el listener no quede capturado con un
    // closure stale si el componente padre re-crea la función entre
    // renders.
    const onCerrarRef = useRef(onCerrar);
    onCerrarRef.current = onCerrar;

    useEffect(() => {
        // Si no está abierto, no hacemos nada en este effect — la limpieza
        // (back + remove listener) la maneja el cleanup del effect previo
        // que sí pusheó.
        if (!abierto) return;

        const id = idRef.current;

        // Push solo una vez (StrictMode double-mount safe).
        if (!historyPushedRef.current) {
            const prevState = (window.history.state ?? {}) as Record<string, unknown>;
            prevStateRef.current = prevState;
            window.history.pushState(
                { ...prevState, [discriminador]: id },
                '',
                window.location.href,
            );
            historyPushedRef.current = true;
        }

        const handler = () => {
            // Si ya nos limpiamos (cierre programático), ignorar.
            if (!historyPushedRef.current) return;
            const stateActual = window.history.state as Record<string, unknown> | null;
            // Cerrar SOLO si nuestra key fue REMOVIDA por completo del state
            // (back nativo real consumió nuestra entrada). Antes el chequeo
            // era `stateActual?.[discriminador] !== id`, lo cual también
            // disparaba cierre si otro componente mutaba el state via
            // `pushState`/`replaceState` poniendo un id distinto en el
            // mismo discriminador — caso falso positivo (StrictMode dev,
            // fantasmas de RootLayout, etc.).
            const keyAusente = !stateActual || !(discriminador in stateActual);
            if (keyAusente) {
                historyPushedRef.current = false;
                popStateHandlerRef.current = null;
                onCerrarRef.current();
            }
        };

        popStateHandlerRef.current = handler;
        window.addEventListener('popstate', handler);

        // ── Cleanup: única ruta de limpieza ─────────────────────────────
        // Se ejecuta cuando:
        //   (a) `abierto` pasa a false (X, ESC, backdrop, programático)
        //   (b) el componente se desmonta directamente sin pasar por
        //       `abierto: false` (típico cuando el padre hace
        //       `{condicion && <Modal/>}` y pone condicion=false).
        //   (c) StrictMode dev (mount → unmount → remount).
        // Antes esta lógica vivía dentro del bloque `if (!abierto)` del
        // mismo effect, lo que la dejaba inerte en el caso (b) — el modal
        // pusheaba una entrada al history y al desmontarse no la limpiaba,
        // dejando un fantasma que el siguiente back nativo consumía sin
        // navegar. Ese era el bug D8 (modal cerrado con X custom).
        return () => {
            // Remover listener ANTES del history.back para que el popstate
            // que disparamos nosotros no llegue al handler (duplicaría el
            // cierre o lanzaría onCerrar).
            window.removeEventListener('popstate', handler);
            popStateHandlerRef.current = null;
            if (!historyPushedRef.current) return;
            historyPushedRef.current = false;
            const stateAlCleanup = window.history.state as Record<string, unknown> | null;
            if (stateAlCleanup?.[discriminador] !== id) return;

            // Snapshot del state previo a NUESTRO push. Lo usamos abajo
            // (dentro del setTimeout) para detectar overlays apilados encima.
            const prevState = prevStateRef.current;

            // Diferir con `setTimeout(0)` para:
            //   (1) Sobrevivir StrictMode dev mount → cleanup → remount.
            //   (2) Esperar a que cualquier `pushState` de un overlay que
            //       se está montando en el mismo render (ej. modal que se
            //       abre al cerrar nosotros) ya esté aplicado en
            //       `history.state`. Esto permite que la verificación de
            //       "marcas encima" abajo vea el state REAL post-push.
            setTimeout(() => {
                const stateAhora = window.history.state as Record<string, unknown> | null;
                if (stateAhora?.[discriminador] !== id) return;

                // Guard contra race condition con overlay apilado encima
                // (típico wizard que abre modal de confirmación interno):
                // si en el state ACTUAL hay keys que NO estaban en el state
                // ANTES de nuestro push, es porque otro overlay pusheó su
                // entrada encima conservando nuestra marca (pushState hace
                // `{...prev, ...nuevo}`). Hacer `history.back()` aquí
                // consumiría la entrada del overlay encima y lo cerraría
                // sin querer.
                //
                // Detección: comparar keys de stateAhora vs prevState
                // capturado en el push. Cualquier key extra (≠ nuestro
                // discriminador, ≠ keys del prev) es de un overlay encima.
                //
                // Acción: usar `replaceState` para borrar nuestra marca sin
                // tocar el cursor. El overlay encima queda intacto y
                // nuestra entrada deja de interceptar (correcto — ya
                // entregamos el control al overlay encima).
                const marcasEncima = Object.keys(stateAhora ?? {}).filter(
                    (k) => k !== discriminador && !(k in prevState),
                );
                if (marcasEncima.length > 0) {
                    const stateLimpio = { ...(stateAhora ?? {}) };
                    delete stateLimpio[discriminador];
                    window.history.replaceState(stateLimpio, '', window.location.href);
                    return;
                }

                window.history.back();
            }, 0);
        };
    }, [abierto, discriminador]);
}

export default useBackNativo;
