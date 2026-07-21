/**
 * useMinDuracionVisible.ts — sostiene un estado "visible" un mínimo de tiempo
 * ============================================================================
 * Evita que un indicador de carga parpadee sin alcanzar a percibirse cuando
 * la operación real resuelve casi instantáneo (ej. un refetch que responde
 * 304 Not Modified por ETag). `activo` puede prenderse y apagarse en
 * milisegundos; el valor devuelto se prende al instante pero se apaga como
 * mínimo `minMs` después de haberse prendido.
 *
 * Usado por el indicador de refresco de Negocios/MarketPlace — ver
 * `IndicadorRefrescoFeed.tsx`.
 *
 * Ubicación: apps/web/src/hooks/useMinDuracionVisible.ts
 */

import { useEffect, useRef, useState } from 'react';

export function useMinDuracionVisible(activo: boolean, minMs: number): boolean {
    const [visible, setVisible] = useState(activo);
    const iniciadoEnRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (activo) {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            iniciadoEnRef.current = Date.now();
            setVisible(true);
            return;
        }

        const transcurrido = iniciadoEnRef.current !== null ? Date.now() - iniciadoEnRef.current : minMs;
        const restante = Math.max(0, minMs - transcurrido);
        timerRef.current = window.setTimeout(() => {
            setVisible(false);
            timerRef.current = null;
        }, restante);

        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        };
    }, [activo, minMs]);

    return visible;
}

export default useMinDuracionVisible;
