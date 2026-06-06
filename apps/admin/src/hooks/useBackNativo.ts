/**
 * useBackNativo.ts
 * =================
 * Hook base del Panel para que modales / overlays / bottom-sheets se cierren con
 * el botón "atrás" del celular (Android), el gesto swipe-back de iOS y la flecha
 * "atrás" del navegador en escritorio — sin salir de la sección ni de la app.
 *
 * Réplica del patrón de apps/web (NO se importa: apps separadas). Se le quitó la
 * parte específica de ChatYA, que no aplica al Panel. La mecánica es la misma:
 * `pushState` + `popstate` con un id único por instancia, robusto ante modales
 * anidados y "entradas fantasma".
 *
 * Cómo funciona:
 *  - Al pasar `abierto` a true, empuja una entrada al history con un id propio.
 *  - Si el usuario hace back nativo, esa entrada se consume; el listener detecta
 *    que la marca ya no está y llama `onCerrar()` → el consumidor cierra el modal.
 *  - Si el modal se cierra por otro camino (X, Escape, backdrop) o se desmonta,
 *    el cleanup hace `history.back()` para limpiar la entrada que empujamos
 *    (evita entradas fantasma en el stack).
 *  - Modales anidados funcionan: cada uno tiene su propio id, el back cierra el
 *    último abierto.
 *
 * Uso:
 * ```tsx
 * function MiModal({ abierto, onCerrar }: Props) {
 *   useBackNativo({ abierto, onCerrar });
 *   if (!abierto) return null;
 *   return <div>…</div>;
 * }
 * ```
 *
 * Ubicación: apps/admin/src/hooks/useBackNativo.ts
 */

import { useEffect, useRef } from 'react';

interface UseBackNativoOptions {
  /** Estado del modal/overlay. false → true empuja al history; true → false limpia. */
  abierto: boolean;
  /** Se llama cuando el usuario hace back nativo y se detecta que la entrada propia
   *  ya no está. Debe actualizar el estado para que `abierto` pase a false. */
  onCerrar: () => void;
  /** Key bajo la que se guarda el id en el state del history. Default `'_back_panel'`.
   *  Usar uno propio para anidar distintos tipos de overlays sin choques. */
  discriminador?: string;
}

export function useBackNativo({
  abierto,
  onCerrar,
  discriminador = '_back_panel',
}: UseBackNativoOptions): void {
  const historyPushedRef = useRef(false);
  const idRef = useRef(
    `${discriminador}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  );
  const prevStateRef = useRef<Record<string, unknown>>({});
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;

    const id = idRef.current;

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
      if (!historyPushedRef.current) return;
      const stateActual = window.history.state as Record<string, unknown> | null;
      // Cerrar solo si NUESTRA key fue removida (back nativo real consumió la entrada).
      const keyAusente = !stateActual || !(discriminador in stateActual);
      if (keyAusente) {
        historyPushedRef.current = false;
        onCerrarRef.current();
      }
    };

    window.addEventListener('popstate', handler);

    return () => {
      window.removeEventListener('popstate', handler);
      if (!historyPushedRef.current) return;
      historyPushedRef.current = false;
      const stateAlCleanup = window.history.state as Record<string, unknown> | null;
      if (stateAlCleanup?.[discriminador] !== id) return;

      const prevState = prevStateRef.current;

      // Diferir para sobrevivir StrictMode (mount→cleanup→remount) y para ver el
      // state real tras un posible push de otro overlay que se abra al cerrar este.
      setTimeout(() => {
        const stateAhora = window.history.state as Record<string, unknown> | null;
        if (stateAhora?.[discriminador] !== id) return;

        // Si hay marcas de otro overlay encima (apilado), no hacer back: solo
        // borrar nuestra marca con replaceState para no cerrar el de encima.
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
