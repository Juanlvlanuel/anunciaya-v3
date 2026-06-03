/**
 * AdornoRailCoyo.tsx — Adorno decorativo del rail de Coyo (Home).
 * ===============================================================
 * PURAMENTE DECORATIVO (sin interacción). Un rastro de huellitas de pata de
 * Coyo que SALE de su guarida (una cueva) y avanza hacia Coyo — da la
 * sensación de que Coyo viene de su guarida.
 *
 *   - Desktop (AdornoRailCoyo): la cueva está al pie del rail (centrada) y el
 *     rastro sube serpenteando desde ella hasta los pies de Coyo.
 *   - Móvil (AdornoCoyoMovil): la cueva está en el borde izquierdo y el rastro
 *     entra en zigzag hacia Coyo (centro).
 *
 * El padre lo monta como `absolute inset-0` detrás del contenido (z-0). Las
 * huellas y la cueva se posicionan por porcentaje para escalar con el alto del
 * contenedor en cualquier resolución.
 *
 * Ubicación: apps/web/src/components/home/AdornoRailCoyo.tsx
 */

import type { CSSProperties } from 'react';

// =============================================================================
// CUEVA — guarida de Coyo (origen del rastro de huellas)
// =============================================================================

// Cueva (guarida) vista de FRENTE: roca/montaña con la boca en arco VERTICAL
// (alto, tipo boca de túnel) oscuro y con profundidad interior. El lado plano
// es la base (queda sobre el borde inferior del contenedor); las huellas salen
// de la boca. `id` único por instancia evita IDs de gradiente duplicados
// cuando se montan dos cuevas en el mismo documento.
function Cueva({ id, className = '', style }: { id: string; className?: string; style?: CSSProperties }) {
    const rocaId = `cueva-roca-${id}`;
    const fadeId = `cueva-fade-${id}`;
    const maskId = `cueva-mask-${id}`;
    return (
        <svg viewBox="0 0 120 100" className={className} style={style} fill="none" aria-hidden="true">
            <defs>
                {/* Luz arriba-izquierda → sombra abajo-derecha (volumen de la roca) */}
                <radialGradient id={rocaId} cx="0.4" cy="0.28" r="0.95">
                    <stop offset="0" stopColor="#9fb3cf" />
                    <stop offset="0.55" stopColor="#6f7f9b" />
                    <stop offset="1" stopColor="#46546d" />
                </radialGradient>
                {/* Desvanecido inferior: difumina el corte recto de la base */}
                <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0.62" stopColor="white" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <mask id={maskId}>
                    <rect x="0" y="0" width="120" height="100" fill={`url(#${fadeId})`} />
                </mask>
            </defs>
            <g mask={`url(#${maskId})`}>
            {/* Sombra proyectada en el suelo */}
            <ellipse cx="60" cy="98" rx="58" ry="6" fill="#28344c" opacity="0.4" />
            {/* Roca trasera — asoma por detrás (capas = profundidad) */}
            <path d="M5 100 C -3 48, 22 10, 60 10 C 100 10, 124 50, 115 100 Z" fill="#3a4860" />
            {/* Roca / montaña principal con volumen */}
            <path d="M9 100 C 2 50, 26 18, 60 18 C 97 18, 121 52, 112 100 Z" fill={`url(#${rocaId})`} />
            {/* Faceta en sombra (cara derecha) — relieve */}
            <path d="M60 18 C 97 18, 121 52, 112 100 L60 100 Z" fill="#3a4760" opacity="0.42" />
            {/* Arista central (separa cara iluminada / en sombra) */}
            <path d="M60 19 C 58 48, 60 76, 60 100" stroke="#d6e0ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.18" />
            {/* Highlight del lomo (luz) */}
            <path d="M24 30 C 38 16, 60 14, 60 18" stroke="#d6e0ee" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
            {/* Repisas / grietas (relieve de la roca) */}
            <path d="M22 60 C 32 64, 38 62, 44 66" stroke="#2c3950" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            <path d="M78 50 C 88 54, 94 53, 100 59" stroke="#2c3950" strokeWidth="2" strokeLinecap="round" opacity="0.3" />

            {/* Sombra de contacto alrededor de la boca (integra la entrada a la roca) */}
            <path d="M37 100 L37 49 C 37 23, 83 23, 83 49 L83 100 Z" fill="#1f2a40" opacity="0.55" />
            {/* Túnel — arcos concéntricos hacia el punto de fuga (profundidad 3D) */}
            <path d="M42 100 L42 52 C 42 29, 78 29, 78 52 L78 100 Z" fill="#3a4861" />
            <path d="M47 97 L47 55 C 47 36, 73 36, 73 55 L73 97 Z" fill="#26324a" />
            <path d="M52 92 L52 59 C 52 45, 68 45, 68 59 L68 92 Z" fill="#141d31" />
            <path d="M56 86 L56 64 C 56 55, 64 55, 64 64 L64 86 Z" fill="#070b16" />
            {/* Reborde iluminado del arco (labio de la entrada) */}
            <path d="M42 52 C 42 29, 78 29, 78 52" stroke="#aebed6" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

            {/* Piedritas al pie */}
            <circle cx="20" cy="94" r="4" fill="#4f5e78" />
            <circle cx="100" cy="92" r="4.5" fill="#4f5e78" />
            </g>
        </svg>
    );
}

// =============================================================================
// HUELLA + SPARKLE
// =============================================================================

function Huella({
    top,
    left,
    rot,
    op,
    sizeClass = 'w-11 h-11 2xl:w-12 2xl:h-12',
}: {
    top: number;
    left: number;
    rot: number;
    op: number;
    sizeClass?: string;
}) {
    return (
        <svg
            viewBox="-14 -14 28 28"
            className={`absolute ${sizeClass}`}
            style={{
                top: `${top}%`,
                left: `${left}%`,
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                opacity: op,
            }}
            fill="#2563eb"
            aria-hidden="true"
        >
            <ellipse cx="0" cy="5.5" rx="5.6" ry="7" />
            <circle cx="-5.6" cy="-3.2" r="2.3" />
            <circle cx="-1.9" cy="-6.6" r="2.3" />
            <circle cx="1.9" cy="-6.6" r="2.3" />
            <circle cx="5.6" cy="-3.2" r="2.3" />
        </svg>
    );
}

function Sparkle({ top, left, size, color, op = 0.4 }: { top: number; left: number; size: number; color: string; op?: number }) {
    const t = size / 2;
    const k = t * 0.32;
    const d = `M${t} 0 L${t + k} ${t - k} L${size} ${t} L${t + k} ${t + k} L${t} ${size} L${t - k} ${t + k} L0 ${t} L${t - k} ${t - k} Z`;
    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            className="absolute"
            style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, transform: 'translate(-50%, -50%)', opacity: op }}
            fill={color}
            aria-hidden="true"
        >
            <path d={d} />
        </svg>
    );
}

// =============================================================================
// DESKTOP — cueva al pie + rastro que sube hacia Coyo
// =============================================================================

// El rastro SALE de la cueva (abajo, centrada) y sube serpenteando hasta los
// pies de Coyo. Las pisadas apuntan hacia arriba (dirección de avance, hacia
// Coyo), con leve apertura por lado. La opacidad sube hacia Coyo (la pisada
// más reciente, ya fuera de la guarida, es la más visible).
const HUELLAS = [
    { top: 44, left: 55, rot: -10 },
    { top: 50, left: 43, rot: 12 },
    { top: 57, left: 57, rot: -12 },
    { top: 64, left: 43, rot: 11 },
    { top: 71, left: 57, rot: -12 },
    { top: 78, left: 45, rot: 14 },
    { top: 84, left: 52, rot: 2 },
] as const;

export function AdornoRailCoyo({ className = '' }: { className?: string }) {
    return (
        <div className={className} aria-hidden="true">
            {HUELLAS.map((h, i) => (
                <Huella key={i} {...h} op={0.16 + (HUELLAS.length - 1 - i) * 0.035} />
            ))}

            <Sparkle top={47} left={70} size={14} color="#f59e0b" op={0.5} />
            <Sparkle top={67} left={31} size={12} color="#3b82f6" op={0.5} />
            <Sparkle top={80} left={66} size={13} color="#f59e0b" op={0.5} />

            {/* Guarida de Coyo — incrustada en el borde inferior; se hunde un
                poco (translate-y) para que asome menos (la base la recorta el
                overflow-hidden del rail). */}
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-10">
                <Cueva id="rail" className="w-32 2xl:w-36" style={{ filter: 'drop-shadow(0 -2px 6px rgba(15,23,42,0.18))' }} />
            </div>
        </div>
    );
}

// =============================================================================
// MÓVIL — cueva a la izquierda + rastro que entra hacia Coyo
// =============================================================================

// Coyo SALE de su guarida (borde izquierdo) y camina en zigzag hacia su lugar
// (centro). Las huellas apuntan a la derecha (rot≈78°); la opacidad sube hacia
// Coyo (pisada reciente). + sparkles dispersos.
const HUELLAS_MOVIL = [
    { top: 70, left: 26, rot: 78, op: 0.13 },
    { top: 62, left: 32, rot: 78, op: 0.16 },
    { top: 70, left: 38, rot: 78, op: 0.19 },
    { top: 62, left: 44, rot: 78, op: 0.22 },
    { top: 70, left: 50, rot: 78, op: 0.25 },
] as const;

export function AdornoCoyoMovil({ className = '' }: { className?: string }) {
    return (
        <div className={className} aria-hidden="true">
            {/* Guarida de Coyo — pegada al borde izquierdo (la roca se recorta
                un poco contra la orilla; la boca vertical queda visible). */}
            <div className="absolute left-0 top-[58%]" style={{ transform: 'translate(-24%, -50%)' }}>
                <Cueva id="movil" className="w-28" style={{ filter: 'drop-shadow(0 -2px 6px rgba(15,23,42,0.18))' }} />
            </div>

            {HUELLAS_MOVIL.map((h, i) => (
                <Huella key={i} {...h} sizeClass="w-7 h-7" />
            ))}

            <Sparkle top={26} left={84} size={15} color="#f59e0b" op={0.4} />
            <Sparkle top={48} left={90} size={13} color="#3b82f6" op={0.34} />
            <Sparkle top={70} left={85} size={14} color="#f59e0b" op={0.32} />
            <Sparkle top={40} left={20} size={13} color="#3b82f6" op={0.3} />
        </div>
    );
}

export default AdornoRailCoyo;
