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
 *    el cambio y ejecuta `history.back()` para limpiar la entrada que
 *    nosotros pusheamos. Esto evita "entradas fantasma" en el stack.
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
    // Ref a `onCerrar` para que el listener no quede capturado con un
    // closure stale si el componente padre re-crea la función entre
    // renders.
    const onCerrarRef = useRef(onCerrar);
    onCerrarRef.current = onCerrar;

    useEffect(() => {
        // ── Cierre por cambio de prop (X, ESC, backdrop, etc.) ──────────
        if (!abierto) {
            if (historyPushedRef.current) {
                historyPushedRef.current = false;
                // Remover listener ANTES del history.back para que el
                // popstate que disparamos nosotros no llegue al handler
                // (lo que duplicaría el cierre o lanzaría onCerrar).
                if (popStateHandlerRef.current) {
                    window.removeEventListener('popstate', popStateHandlerRef.current);
                    popStateHandlerRef.current = null;
                }
                // Solo hacer back si nuestra entrada SIGUE siendo la actual.
                // Si entre el push y este cleanup alguien hizo `navigate(...)`
                // (típico flujo "login → cerrar modal → navegar a /inicio"),
                // nuestra entrada ya quedó enterrada en el stack — un `back`
                // aquí retrocedería la navegación posterior y dejaría al
                // usuario en la URL del modal en lugar del destino.
                const stateActual = window.history.state as Record<string, unknown> | null;
                if (stateActual?.[discriminador] === idRef.current) {
                    window.history.back();
                }
            }
            return;
        }

        const id = idRef.current;

        // Push solo una vez (StrictMode double-mount safe).
        if (!historyPushedRef.current) {
            const prevState = (window.history.state ?? {}) as Record<string, unknown>;
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
            // Si nuestra entrada fue consumida por el back del navegador
            // (el id que dejamos ya no está en el state), notificar al
            // consumidor para que cierre el modal.
            if (stateActual?.[discriminador] !== id) {
                historyPushedRef.current = false;
                popStateHandlerRef.current = null;
                onCerrarRef.current();
            }
        };

        popStateHandlerRef.current = handler;
        window.addEventListener('popstate', handler);
        return () => {
            window.removeEventListener('popstate', handler);
            popStateHandlerRef.current = null;
        };
    }, [abierto, discriminador]);
}

export default useBackNativo;
