/**
 * usePullToRefresh.ts — gesto "jalar para refrescar" (estilo Facebook)
 * =====================================================================
 * Engancha touch listeners al contenedor scrolleable y, cuando el usuario
 * jala hacia abajo ESTANDO en el tope (scrollTop ≤ 0), expone la distancia
 * del jalón para pintar un indicador. Al soltar pasando el umbral, dispara
 * `onRefresh` y mantiene el estado "refrescando" hasta que la promesa resuelve.
 *
 * Diseño:
 *   - Solo móvil/táctil (en desktop no hay touch; el caller pasa `habilitado`).
 *   - `preventDefault` en `touchmove` (passive:false) cuando se está jalando
 *     desde el tope → anula el pull-to-refresh NATIVO del navegador (que
 *     recargaría toda la página) y el scroll-chaining.
 *   - Resistencia: la distancia visible es una fracción del arrastre real,
 *     para que se sienta "con peso" como en apps nativas.
 *   - Reutilizable: el Home es el primero, pero sirve para MarketPlace /
 *     Servicios / cualquier feed con scroll propio.
 *
 * Ubicación: apps/web/src/hooks/usePullToRefresh.ts
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UsePullToRefreshOpciones {
    /** Qué hacer al refrescar (típicamente `() => query.refetch()`). */
    onRefresh: () => Promise<unknown> | unknown;
    /** Contenedor scrolleable al que se enganchan los listeners. */
    scrollRef: RefObject<HTMLElement | null> | null | undefined;
    /** Si false, no engancha nada (ej. en desktop). Default true. */
    habilitado?: boolean;
}

/** Distancia (px de arrastre real ya con resistencia) para disparar. */
const UMBRAL_PX = 70;
/** Fracción del arrastre real que se traduce en distancia visible. */
const RESISTENCIA = 0.5;
/** Tope visual del jalón (no crece más aunque sigas jalando). */
const MAX_PULL_PX = 100;

export function usePullToRefresh({
    onRefresh,
    scrollRef,
    habilitado = true,
}: UsePullToRefreshOpciones) {
    const [distancia, setDistancia] = useState(0);
    const [refrescando, setRefrescando] = useState(false);
    // Dedo en contacto jalando: el indicador sigue el dedo SIN transición
    // mientras es true, y anima su salida/recogida cuando vuelve a false.
    const [gestoActivo, setGestoActivo] = useState(false);

    // Refs para leer valores actuales dentro de los listeners sin recrearlos.
    const inicioY = useRef<number | null>(null);
    const jalando = useRef(false);
    const distanciaRef = useRef(0);
    const refrescandoRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    useEffect(() => {
        const el = scrollRef?.current;
        if (!el || !habilitado) return;

        const onTouchStart = (e: TouchEvent) => {
            if (refrescandoRef.current) return;
            // Solo armamos el gesto si estamos pegados al tope del scroll.
            if (el.scrollTop <= 0) {
                inicioY.current = e.touches[0].clientY;
                jalando.current = true;
                setGestoActivo(true);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!jalando.current || inicioY.current === null) return;
            const delta = e.touches[0].clientY - inicioY.current;
            if (delta <= 0) {
                // El usuario empezó a subir/scrollear normal: cancelamos.
                if (distanciaRef.current !== 0) {
                    distanciaRef.current = 0;
                    setDistancia(0);
                }
                jalando.current = false;
                setGestoActivo(false);
                return;
            }
            // Está jalando hacia abajo desde el tope: prevenimos el pull nativo
            // del navegador y aplicamos resistencia.
            if (e.cancelable) e.preventDefault();
            const visible = Math.min(delta * RESISTENCIA, MAX_PULL_PX);
            distanciaRef.current = visible;
            setDistancia(visible);
        };

        const onTouchEnd = () => {
            // Siempre apagamos el gesto al soltar — aunque no se haya jalado.
            setGestoActivo(false);
            const estabaJalando = jalando.current;
            jalando.current = false;
            inicioY.current = null;

            if (estabaJalando && distanciaRef.current >= UMBRAL_PX && !refrescandoRef.current) {
                refrescandoRef.current = true;
                setRefrescando(true);
                distanciaRef.current = UMBRAL_PX;
                setDistancia(UMBRAL_PX);
                // Disparamos el refresco en segundo plano (no esperamos su
                // promesa: si se cuelga, no debe dejar el indicador pegado).
                Promise.resolve(onRefreshRef.current()).catch(() => {});
                // La cabeza gira un tiempo ACOTADO y se recoge sí o sí.
                setTimeout(() => {
                    refrescandoRef.current = false;
                    setRefrescando(false);
                    distanciaRef.current = 0;
                    setDistancia(0);
                }, 1100);
            } else {
                // No alcanzó el umbral (o no se jaló): reset total.
                distanciaRef.current = 0;
                setDistancia(0);
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        // passive:false para poder preventDefault y matar el pull nativo.
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        // touchend/cancel en WINDOW (no en el elemento): garantiza capturar
        // el fin del gesto aunque el dedo se levante fuera del feed o el
        // touchend no llegue al elemento — así el indicador no queda pegado.
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [scrollRef, habilitado]);

    /** 0..1 — qué tan cerca del umbral va el jalón (para animar el indicador). */
    const progreso = Math.min(distancia / UMBRAL_PX, 1);

    return {
        distancia,
        refrescando,
        progreso,
        gestoActivo,
        umbralAlcanzado: distancia >= UMBRAL_PX,
    };
}

export default usePullToRefresh;
