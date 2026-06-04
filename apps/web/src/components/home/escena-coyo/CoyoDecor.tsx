/**
 * CoyoDecor.tsx — piezas decorativas de la escena "Casa de Coyo" (SVG + CSS).
 * ===========================================================================
 * Del design handoff. Todas se posicionan en absoluto dentro de un contenedor
 * relativo. Las animaciones usan las clases `cdc-*` definidas en `index.css`
 * (twinkle, float, bob, sway) — respetan `prefers-reduced-motion` ahí.
 *
 * Ubicación: apps/web/src/components/home/escena-coyo/CoyoDecor.tsx
 */

type Pos = { x?: number; y?: number };

/** Estrella de 4 puntas — motivo de marca. */
export function Sparkle({
    x, y, s = 14, c = '#F4A23B', o = 1, delay = 0,
}: { x: number | string; y: number | string; s?: number; c?: string; o?: number; delay?: number }) {
    return (
        <svg
            width={s} height={s} viewBox="0 0 24 24"
            style={{
                position: 'absolute', left: x, top: y, opacity: o,
                animation: `cdc-twinkle 3.2s ease-in-out ${delay}s infinite`, transformOrigin: 'center',
            }}
        >
            <path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0Z" fill={c} />
        </svg>
    );
}

/** Puntito flotante. */
export function Dot({
    x, y, s = 7, c = '#9DBDEC', delay = 0,
}: { x: number | string; y: number | string; s?: number; c?: string; delay?: number }) {
    return (
        <div style={{
            position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%',
            background: c, animation: `cdc-float 4s ease-in-out ${delay}s infinite`,
        }} />
    );
}

/** Arbusto = 3 blobs. */
export function Bush({ x = 0, y = 0, s = 1, c = '#6FA84E', c2 = '#5C9440' }: Pos & { s?: number; c?: string; c2?: string }) {
    return (
        <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'bottom center', width: 70, height: 46 }}>
            <div style={{ position: 'absolute', left: 0, bottom: 0, width: 36, height: 36, borderRadius: '50%', background: c2 }} />
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, borderRadius: '50%', background: c2 }} />
            <div style={{ position: 'absolute', left: 16, bottom: 6, width: 42, height: 42, borderRadius: '50%', background: c }} />
        </div>
    );
}

/** Cactus simple con florecita. */
export function Cactus({ x = 0, y = 0, s = 1 }: Pos & { s?: number }) {
    return (
        <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'bottom center', width: 54, height: 72 }}>
            <div style={{ position: 'absolute', left: 20, bottom: 0, width: 16, height: 70, borderRadius: 10, background: '#5C9A55' }} />
            <div style={{ position: 'absolute', left: 4, bottom: 30, width: 14, height: 26, borderRadius: 8, background: '#5C9A55' }} />
            <div style={{ position: 'absolute', left: 4, bottom: 44, width: 14, height: 10, borderRadius: 8, background: '#5C9A55' }} />
            <div style={{ position: 'absolute', left: 38, bottom: 38, width: 13, height: 22, borderRadius: 8, background: '#5C9A55' }} />
            <div style={{ position: 'absolute', left: 38, bottom: 50, width: 13, height: 9, borderRadius: 8, background: '#5C9A55' }} />
            <div style={{ position: 'absolute', left: 24, bottom: 58, width: 8, height: 8, borderRadius: '50%', background: '#F2C94C' }} />
        </div>
    );
}

/** Hongo (glow opcional para la noche). */
export function Mushroom({ x = 0, y = 0, s = 1, cap = '#E2574C', glow = false }: Pos & { s?: number; cap?: string; glow?: boolean }) {
    return (
        <div style={{
            position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'bottom center', width: 38, height: 40,
            filter: glow ? 'drop-shadow(0 0 8px rgba(120,200,255,.85))' : 'none',
        }}>
            <div style={{ position: 'absolute', left: 12, bottom: 0, width: 14, height: 22, borderRadius: 7, background: glow ? '#CFE8FF' : '#F4E7CE' }} />
            <div style={{ position: 'absolute', left: 0, bottom: 16, width: 38, height: 22, borderRadius: '20px 20px 8px 8px', background: glow ? '#7EC8FF' : cap }} />
            <div style={{ position: 'absolute', left: 8, bottom: 24, width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,.85)' }} />
            <div style={{ position: 'absolute', left: 22, bottom: 20, width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.85)' }} />
        </div>
    );
}

/** Farol colgante con luz cálida; balanceo pendular suave (cdc-sway). */
export function Lantern({ x = 0, y = 0, s = 1, on = true }: Pos & { s?: number; on?: boolean }) {
    return (
        <div style={{
            position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'top center', width: 30, height: 56,
            animation: 'cdc-sway 4.5s ease-in-out infinite',
        }}>
            <div style={{ position: 'absolute', left: 14, top: 0, width: 2, height: 12, background: '#5A4632' }} />
            <div style={{ position: 'absolute', left: 6, top: 11, width: 18, height: 6, borderRadius: 3, background: '#5A4632' }} />
            <div style={{
                position: 'absolute', left: 4, top: 16, width: 22, height: 26, borderRadius: 6,
                background: on ? 'radial-gradient(circle at 50% 40%, #FFE9A8, #F4A23B)' : '#8A7B63',
                boxShadow: on ? '0 0 16px 4px rgba(255,200,90,.6)' : 'none', border: '2px solid #5A4632',
            }} />
            <div style={{ position: 'absolute', left: 10, top: 42, width: 10, height: 5, borderRadius: 2, background: '#5A4632' }} />
        </div>
    );
}

/** Letrero de madera "Casa de Coyo". */
export function Sign({ x = 0, y = 0, text = 'Casa de Coyo', s = 1 }: Pos & { text?: string; s?: number }) {
    return (
        <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'bottom left' }}>
            <div style={{ position: 'absolute', left: 30, top: 26, width: 7, height: 40, background: '#6B4F32', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: 56, top: 30, width: 7, height: 36, background: '#6B4F32', borderRadius: 3 }} />
            <div style={{
                position: 'relative', padding: '8px 14px', background: 'linear-gradient(180deg,#B07A45,#9A6736)',
                border: '3px solid #7B5430', borderRadius: 10, color: '#FFF6E6', fontWeight: 800, fontSize: 15,
                whiteSpace: 'nowrap', boxShadow: '0 4px 0 rgba(0,0,0,.12)',
            }}>
                {text}
            </div>
        </div>
    );
}
