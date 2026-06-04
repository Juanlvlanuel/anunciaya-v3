/**
 * coyoTokens.ts — paletas de ambiente y colores de marca de la escena "Casa de Coyo".
 * ===================================================================================
 * Del design handoff (`design_handoff_casa_de_coyo`). Colores/medidas FINALES:
 * `PALETTES` y `BRAND` son la única fuente de color de la escena. No tocar.
 *
 * Ambientes: grass=Día · sand=Amanecer/Atardecer · night=Noche.
 *
 * Ubicación: apps/web/src/components/home/escena-coyo/coyoTokens.ts
 */

export type Variant = 'grass' | 'sand' | 'night';

export interface Palette {
    skyA: string; skyB: string; backHill: string;
    hillHi: string; hillLo: string; grassHi: string; fore: string;
    caveRim: string; caveInner: string; caveMid: string; caveEdge: string;
    glow?: string;
}

/** Colores de marca AnunciaYA. */
export const BRAND = {
    blue: '#2C6FE0',
    blueNight: '#7FB6FF',
    orange: '#F4A23B',
    heart: '#E23B3B',
    navy: '#1E2A3A',
    ya: '#FFD23B',
    ink: '#22304A',
    inkNight: '#EAF1FF',
    border: '#DBE6F5',
} as const;

/** Una paleta por ambiente. */
export const PALETTES: Record<Variant, Palette> = {
    grass: {
        skyA: '#CFE3FA', skyB: '#E9F3FD', backHill: '#A9CF8E',
        hillHi: '#7FB86A', hillLo: '#5C9A4C', grassHi: '#8FCB6F', fore: '#4E8C3F',
        caveRim: '#6B4F32', caveInner: '#140C06', caveMid: '#241710', caveEdge: '#3A2A1C',
    },
    sand: {
        skyA: '#FBDFB0', skyB: '#FCEFD3', backHill: '#E2A968',
        hillHi: '#E0A75F', hillLo: '#C8843E', grassHi: '#E8B873', fore: '#B5772F',
        caveRim: '#8A5A2E', caveInner: '#1A0E06', caveMid: '#33200F', caveEdge: '#4A2F18',
    },
    night: {
        skyA: '#243B6B', skyB: '#3A5488', backHill: '#2E4576',
        hillHi: '#2C4670', hillLo: '#1B2E52', grassHi: '#46638F', fore: '#1F3258',
        caveRim: '#16233F', caveInner: '#070C1A', caveMid: '#0E1A33', caveEdge: '#1B2B4D', glow: '#7EC8FF',
    },
};

/** hex (#rrggbb) → rgba con alfa. */
export function hexA(hex: string, a: number): string {
    const m = hex.replace('#', '');
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}
