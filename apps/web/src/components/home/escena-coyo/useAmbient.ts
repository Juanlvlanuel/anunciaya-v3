/**
 * useAmbient.ts — calcula el ambiente de la escena "Casa de Coyo" por la hora local.
 * ==================================================================================
 * Del design handoff. En producción el ambiente es AUTOMÁTICO por hora (no hay
 * selector). Recalcula cada minuto y al volver la pestaña a foco.
 *
 *   Día (08–18) → grass · Amanecer (06–08) / Atardecer (18–20) → sand · Noche (20–06) → night
 *
 * Ubicación: apps/web/src/components/home/escena-coyo/useAmbient.ts
 */

import { useEffect, useState } from 'react';
import type { Variant } from './coyoTokens';

export interface AmbientInfo {
    variant: Variant;
    label: string; // "Día" | "Amanecer" | "Atardecer" | "Noche"
    emoji: string;
}

/** Calcula el ambiente a partir de la hora local. */
export function ambientFor(d: Date = new Date()): AmbientInfo {
    const h = d.getHours();
    if (h >= 20 || h < 6) return { variant: 'night', label: 'Noche', emoji: '🌙' };
    if (h >= 18) return { variant: 'sand', label: 'Atardecer', emoji: '🌇' };
    if (h < 8) return { variant: 'sand', label: 'Amanecer', emoji: '🌅' };
    return { variant: 'grass', label: 'Día', emoji: '☀️' };
}

/**
 * Devuelve el ambiente actual y lo mantiene al día (recalcula cada `intervalMs`
 * —60s por defecto— y cuando la pestaña vuelve a foco).
 */
export function useAmbient(intervalMs = 60_000): AmbientInfo {
    const [info, setInfo] = useState<AmbientInfo>(() => ambientFor());

    useEffect(() => {
        const tick = () => setInfo(ambientFor());
        const id = window.setInterval(tick, intervalMs);
        const onVis = () => { if (!document.hidden) tick(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [intervalMs]);

    return info;
}
