/**
 * EscenaCoyo.tsx — escena "Casa de Coyo" del Home (cerro + cueva + ambiente).
 * ===========================================================================
 * Adapta el design handoff (`design_handoff_casa_de_coyo`) a la app real:
 *   - La ESCENA visual del handoff es el fondo: cielo (gradiente por ambiente),
 *     Sol/Luna, cerro con cueva (back/front) y adornos (letrero, faroles,
 *     arbustos/cactus/hongos) según la hora del día (`useAmbient`).
 *   - ENCIMA van los componentes VIVOS de la app (no los estáticos del handoff):
 *     el saludo tecleado, la burbuja "¿Qué andas buscando hoy?", el input real
 *     (`CoyoInput`) y **Coyo Rive saliendo de la cueva** (`CoyoAnimado`, en sus
 *     estados) en lugar del PNG.
 *
 * Reemplaza a `AreaPreguntaCoyo` + `AdornoRailCoyo` en el rail del Home.
 * Mismos props que `AreaPreguntaCoyo` para que `PaginaInicio` lo monte igual.
 *
 * Ubicación: apps/web/src/components/home/escena-coyo/EscenaCoyo.tsx
 */

import { useId, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { CoyoAnimado, type EstadoCoyoVisual } from '../../CoyoAnimado';
import { SaludoTecleado, TextoTecleado, CoyoInput } from '../AreaPreguntaCoyo';
import { useAmbient } from './useAmbient';
import { PALETTES, BRAND, hexA, type Variant, type Palette } from './coyoTokens';
import { Sparkle, Dot, Bush, Cactus, Mushroom, Lantern, Sign } from './CoyoDecor';

const FUENTE = "'Nunito', system-ui, sans-serif";

interface EscenaCoyoProps {
    nombreUsuario: string;
    estadoCoyo: EstadoCoyoVisual;
    conInput?: boolean;
    hayCiudad?: boolean;
    texto?: string;
    onTextoChange?: (v: string) => void;
    onEnviar?: () => void;
    enviando?: boolean;
    puedeEnviar?: boolean;
    /** true en móvil (medidas/altura más compactas). */
    compact?: boolean;
    /** id del <input> (móvil usa 'coyo-input-movil' para enfoque/observer). */
    idInput?: string;
}

export function EscenaCoyo({
    nombreUsuario,
    estadoCoyo,
    conInput = true,
    hayCiudad = true,
    texto = '',
    onTextoChange,
    onEnviar,
    enviando = false,
    puedeEnviar = false,
    compact = false,
    idInput,
}: EscenaCoyoProps) {
    const { variant } = useAmbient();
    const p = PALETTES[variant];
    const night = variant === 'night';
    const uid = useId();

    return (
        <div
            data-coyo-scene
            className="relative flex flex-col overflow-hidden"
            style={{
                height: '100%',
                minHeight: compact ? 520 : 600,
                background: `linear-gradient(180deg, ${p.skyA} 0%, ${p.skyB} 46%, ${p.skyB} 100%)`,
                fontFamily: FUENTE,
                borderRadius: compact ? '0 0 20px 20px' : 18,
            }}
        >
            <SunMoon variant={variant} />

            {/* chispas arriba */}
            <Sparkle x="14%" y="20%" s={15} c={night ? '#FFE9A8' : BRAND.orange} delay={0} />
            <Sparkle x="84%" y="15%" s={13} c={night ? '#CFE8FF' : '#9DBDEC'} delay={0.8} />
            <Sparkle x="80%" y="33%" s={12} c={night ? '#FFE9A8' : BRAND.orange} delay={1.4} />

            {/* ---- TOP: saludo + burbuja + input (componentes vivos) ---- */}
            <div
                className="relative flex flex-col items-center text-center"
                style={{ padding: compact ? '16px 22px 4px' : '28px 26px 6px', zIndex: 3 }}
            >
                <SaludoTecleado nombre={nombreUsuario} night={night} />

                <div style={{ marginTop: compact ? 16 : 22 }}>
                    <div
                        style={{
                            display: 'inline-block', background: '#fff', border: `1px solid ${BRAND.border}`,
                            borderRadius: 24, padding: '12px 24px', whiteSpace: 'nowrap',
                            boxShadow: '0 6px 16px rgba(40,70,120,.10)',
                        }}
                    >
                        <TextoTecleado
                            texto="¿Qué andas buscando hoy?"
                            retrasoMs={`¡Hola, ${nombreUsuario}!`.length * 65 + 350}
                            className="text-lg 2xl:text-xl font-extrabold leading-snug text-[#2C3E5C]"
                        />
                    </div>
                </div>

                {conInput && (
                    <div className="w-full" style={{ marginTop: 38 }}>
                        <p
                            className="flex items-center gap-2 pl-1 mb-2 text-base 2xl:text-lg font-extrabold"
                            style={{ color: night ? '#CFE0FF' : '#34507A' }}
                        >
                            <Sparkles size={19} strokeWidth={2.5} className="text-amber-500" />
                            <span>Pregúntale a <span style={{ color: '#d97534' }}>Coyo</span></span>
                        </p>
                        <CoyoInput
                            id={idInput}
                            compact={compact}
                            texto={texto}
                            onTextoChange={onTextoChange ?? (() => {})}
                            onEnviar={onEnviar ?? (() => {})}
                            enviando={enviando}
                            puedeEnviar={puedeEnviar}
                            placeholder={hayCiudad ? 'Escribe lo que buscas…' : 'Activa tu ubicación para preguntar'}
                        />
                    </div>
                )}
            </div>

            {/* ---- MEDIO: cielo abierto con chispas ---- */}
            <div className="relative" style={{ flex: '0 1 auto', minHeight: compact ? 20 : 34, zIndex: 2 }}>
                <Sparkle x="28%" y="42%" s={12} c={night ? '#FFE9A8' : BRAND.orange} delay={0.5} />
                <Sparkle x="72%" y="66%" s={11} c={night ? '#CFE8FF' : '#9DBDEC'} delay={1.1} />
                <Dot x="60%" y="24%" s={6} c={night ? '#7EC8FF' : '#9DBDEC'} delay={0.3} />
            </div>

            {/* ---- ABAJO: la cueva (su casa) con Coyo Rive saliendo ---- */}
            <div className="relative" style={{ minHeight: compact ? 200 : 272, flex: '1 0 auto', zIndex: 2 }}>
                <ColumnHill id={`${uid}-b`} p={p} night={night} layer="back" />

                {/* letrero por ENCIMA de Coyo y su sombra (zIndex 3 > Coyo 2):
                    Coyo está cargado a la derecha, así que no le tapa la cola. */}
                <div style={{ position: 'absolute', left: '3%', bottom: '24%', zIndex: 3 }}>
                    <Sign text="Casa de Coyo" />
                </div>

                <CoyoEmerge estado={estadoCoyo} p={p} night={night} width={compact ? 210 : 258} />
                <ColumnHill id={`${uid}-f`} p={p} night={night} layer="front" />

                {/* adornos por ambiente */}
                <div className="absolute inset-0" style={{ zIndex: 5 }}>
                    {variant === 'grass' && (<>
                        <div style={{ position: 'absolute', right: '5%', bottom: '11%', transform: 'scale(1.5)', transformOrigin: 'bottom right' }}><Bush /></div>
                        <div style={{ position: 'absolute', right: '15%', bottom: '9%' }}><Mushroom /></div>
                        <div style={{ position: 'absolute', left: '14%', top: 34 }}><Lantern s={1.1} /></div>
                    </>)}
                    {variant === 'sand' && (<>
                        <div style={{ position: 'absolute', right: '6%', bottom: '10%', transform: 'scale(1.2)', transformOrigin: 'bottom right' }}><Cactus /></div>
                        <div style={{ position: 'absolute', left: '14%', top: 30 }}><Lantern s={1.15} /></div>
                    </>)}
                    {variant === 'night' && (<>
                        <div style={{ position: 'absolute', left: '12%', top: 30 }}><Lantern s={1.15} /></div>
                        <div style={{ position: 'absolute', right: '12%', top: 36 }}><Lantern s={1} /></div>
                        <div style={{ position: 'absolute', right: '6%', bottom: '11%', transform: 'scale(1.3)', transformOrigin: 'bottom right' }}><Mushroom glow /></div>
                        <div style={{ position: 'absolute', right: '16%', bottom: '9%', transform: 'scale(0.9)', transformOrigin: 'bottom right' }}><Mushroom glow /></div>
                    </>)}
                </div>
            </div>
        </div>
    );
}

/* ---------------- subcomponentes de la escena ---------------- */

/** Sol (día/atardecer) o Luna (noche), en el cielo. */
function SunMoon({ variant }: { variant: Variant }) {
    const C = ({
        grass: { top: '44%', right: '9%', size: 60, a: '#FFF3C8', b: '#FFD86A' },
        sand: { top: '50%', right: '11%', size: 80, a: '#FFDDA6', b: '#FF9E45' },
        night: { top: '42%', right: '10%', size: 58, a: '', b: '' },
    } as const)[variant];
    const moon = variant === 'night';
    return (
        <div style={{ position: 'absolute', top: C.top, right: C.right, width: C.size, height: C.size, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
                position: 'absolute', inset: '-45%', borderRadius: '50%',
                background: moon
                    ? 'radial-gradient(circle, rgba(231,224,190,.5), rgba(231,224,190,0) 70%)'
                    : `radial-gradient(circle, ${C.b}66, ${C.b}00 70%)`,
            }} />
            <div style={{
                position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
                background: moon
                    ? 'radial-gradient(circle at 38% 36%, #F6F1D8, #DED7B2)'
                    : `radial-gradient(circle at 40% 36%, ${C.a}, ${C.b})`,
                boxShadow: moon ? '0 0 22px rgba(231,224,190,.5)' : `0 0 30px ${C.b}88`,
            }}>
                {moon && <>
                    <div style={{ position: 'absolute', left: '22%', top: '28%', width: '17%', height: '17%', borderRadius: '50%', background: 'rgba(120,110,80,.15)' }} />
                    <div style={{ position: 'absolute', left: '54%', top: '52%', width: '24%', height: '24%', borderRadius: '50%', background: 'rgba(120,110,80,.13)' }} />
                    <div style={{ position: 'absolute', left: '60%', top: '22%', width: '12%', height: '12%', borderRadius: '50%', background: 'rgba(120,110,80,.12)' }} />
                </>}
            </div>
        </div>
    );
}

/** Coyo Rive saliendo de la cueva: su mitad inferior se funde con la sombra. */
function CoyoEmerge({ estado, p, night, width = 150 }: { estado: EstadoCoyoVisual; p: Palette; night: boolean; width?: number }) {
    // Estable entre renders (solo depende de night/width): así el `memo` de
    // CoyoAnimado NO se invalida en cada tecla del input controlado del Home.
    const estiloCoyo = useMemo(() => ({
        height: width,
        filter: night
            ? 'drop-shadow(0 0 14px rgba(126,200,255,.45)) drop-shadow(0 8px 10px rgba(0,0,0,.4))'
            : 'drop-shadow(0 10px 12px rgba(0,0,0,.3))',
        animation: 'cdc-bob 5s ease-in-out infinite',
    }), [night, width]);

    return (
        <div style={{ position: 'absolute', left: '57%', bottom: -2, width, transform: 'translateX(-50%)', zIndex: 2 }}>
            <CoyoAnimado
                estado={estado}
                align="center"
                alt="Coyo, asistente de AnunciaYA"
                className="block w-full select-none"
                style={estiloCoyo}
            />
            <div style={{
                position: 'absolute', left: '-8%', right: '-8%', bottom: 0, height: '42%', pointerEvents: 'none',
                background: `linear-gradient(180deg, ${hexA(p.caveMid, 0)} 0%, ${hexA(p.caveMid, 0.5)} 52%, ${hexA(p.caveMid, 0.92)} 100%)`,
                borderRadius: '0 0 40% 40%',
            }} />
        </div>
    );
}

/** Cerro + cueva. Cielo transparente (lo pone el contenedor). back/front para encajar a Coyo en medio. */
function ColumnHill({ id, p, night, layer = 'full' }: { id: string; p: Palette; night: boolean; layer?: 'full' | 'back' | 'front' }) {
    const back = layer === 'full' || layer === 'back';
    const front = layer === 'full' || layer === 'front';
    return (
        <svg viewBox="0 0 500 300" width="100%" height="100%" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0 }}>
            <defs>
                <radialGradient id={`${id}-cave`} cx="50%" cy="42%" r="62%">
                    <stop offset="0" stopColor={p.caveInner} />
                    <stop offset="0.55" stopColor={p.caveMid} />
                    <stop offset="1" stopColor={p.caveEdge} />
                </radialGradient>
                <linearGradient id={`${id}-hill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={p.hillHi} />
                    <stop offset="1" stopColor={p.hillLo} />
                </linearGradient>
            </defs>

            {back && <>
                <path d="M-20 168 Q120 92 260 150 Q380 196 520 132 L520 300 L-20 300Z" fill={p.backHill} opacity="0.55" />
                <path d="M-20 205 Q140 140 280 196 Q400 240 520 188 L520 300 L-20 300Z" fill={p.backHill} />
                <path d="M60 300 Q110 66 250 56 Q390 66 440 300 Z" fill={`url(#${id}-hill)`} />
                <path d="M150 150 Q200 96 250 92 Q300 96 350 150 Q300 122 250 120 Q200 122 150 150Z" fill={p.hillHi} opacity="0.5" />
                <ellipse cx="250" cy="178" rx="82" ry="92" fill={p.caveRim} />
                <ellipse cx="250" cy="186" rx="68" ry="78" fill={`url(#${id}-cave)`} />
                <ellipse cx="250" cy="210" rx="44" ry="30" fill={night ? '#7EC8FF' : '#FFC36B'} opacity={night ? 0.4 : 0.5} />
            </>}

            {front && <>
                <path d="M-20 300 Q150 232 250 256 Q350 232 520 300 Z" fill={p.fore} />
                <path d="M-20 300 Q150 246 250 268 Q350 246 520 300 Z" fill={p.grassHi} opacity="0.45" />
            </>}
        </svg>
    );
}

export default EscenaCoyo;
