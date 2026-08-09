/**
 * TombolaSorteo.tsx
 * ===================
 * Revelación del sorteo — orquesta 3 piezas cinematográficas alrededor del
 * escenario (`EscenarioTombola3D`, canvas 3D real vía Three.js, mismo
 * diseño en escritorio y móvil — dibuja la jaula/circuito/bola viajando):
 *
 * 1. Banner ("Sorteando el Lugar N" / "Premio mayor") ANTES/DURANTE cada
 *    ronda — se deriva de N (intentos por lugar) y K (lugares), sin pedir
 *    nada nuevo al backend: cada ronda de N bolas sortea un lugar, en
 *    orden descendente (K, K-1, ..., 1).
 * 2. Revelación — DEBAJO de la escena (no encima: un overlay tapando la
 *    tómbola mientras gira se sentía mal), con la bola/número que acaba de
 *    salir, tipo "zoom de cámara" que aparece justo cuando la bola
 *    termina su recorrido.
 * 3. Historial de bolas anteriores en una tira horizontal (mismo patrón de
 *    "reel" del resto de la app) — ícono + texto en cada una (no solo el
 *    tono) para que "no ganó" vs "lugar N" quede inequívoco.
 *
 * Identidad: LIGHT, no dark — el ámbar reservado SOLO para lo que de
 * verdad importa resaltar: el banner de ronda, la bola que viaja y el
 * resultado ganador.
 *
 * Cada lugar premiado corre su propia ronda de N bolas (ver `sorteo.ts`);
 * el premio mayor (lugar #1) es siempre la última bola de todo el sorteo.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/TombolaSorteo.tsx
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import type { IntentoSorteoEvento } from '../../../types/dinamicas';

const EscenarioTombola3D = lazy(() => import('./EscenarioTombola3D'));

/** Fallback de `<Suspense>` mientras carga el chunk de Three.js — un
 *  spinner simple, mismo tamaño de caja que el canvas 3D para que no haya
 *  salto de layout al resolver. */
function CargandoEscenario3D() {
    return (
        <div className="mx-auto my-2 flex items-center justify-center" style={{ width: 300, height: 280, maxWidth: '100%' }}>
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
        </div>
    );
}

interface TombolaSorteoProps {
    intentosRevelados: IntentoSorteoEvento[];
    /** Intentos POR lugar (N) — cada uno de los `numeroLugaresGanadores`
     *  corre su propia ronda de N bolas (ver `sorteo.ts`). El total de
     *  bolas del sorteo completo es `numeroLugaresGanadores * numeroIntentosSorteo`. */
    numeroIntentosSorteo: number | null;
    numeroLugaresGanadores: number;
    /** Señal directa de que la sala ya cerró — no depender SOLO del conteo
     *  de bolas vs N×K: `numeroIntentosSorteo`/`numeroLugaresGanadores`
     *  llegan por socket y pueden tardar un instante más en hidratarse que
     *  el historial (cargado por HTTP), dejando "Sorteando…" pintado un
     *  momento de más aunque ya esté cerrada. */
    salaCerrada: boolean;
}

export function TombolaSorteo({ intentosRevelados, numeroIntentosSorteo, numeroLugaresGanadores, salaCerrada }: TombolaSorteoProps) {
    const ultimo = intentosRevelados[intentosRevelados.length - 1] ?? null;
    const anteriores = intentosRevelados.slice(0, -1);
    const totalBolasSorteo = numeroIntentosSorteo !== null ? numeroIntentosSorteo * numeroLugaresGanadores : null;
    const terminando = salaCerrada || (totalBolasSorteo !== null && intentosRevelados.length >= totalBolasSorteo);
    const esPremioMayor = !!ultimo?.esGanador && ultimo.lugar === 1;
    const girando = !terminando;

    // Solo se anima la revelación (bola viajando + zoom del resultado)
    // cuando la última bola llegó como un incremento genuino EN VIVO — si
    // el arreglo ya venía cargado de una vez (sala cerrada, o "ponte al
    // día" al entrar a mitad del sorteo), se muestra directo, sin animar
    // (si no, entrar a ver resultados ya definidos se sentía como que la
    // tómbola "aventaba una bola" de nuevo).
    const longitudAnteriorRef = useRef<number | null>(null);
    const [numeroIntentoAnimable, setNumeroIntentoAnimable] = useState<number | null>(null);
    useEffect(() => {
        const anterior = longitudAnteriorRef.current;
        longitudAnteriorRef.current = intentosRevelados.length;
        setNumeroIntentoAnimable(anterior !== null && intentosRevelados.length === anterior + 1 ? (ultimo?.numeroIntento ?? null) : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intentosRevelados.length]);
    const animarRevelacion = ultimo !== null && ultimo.numeroIntento === numeroIntentoAnimable;
    const numeroIntentoActual = animarRevelacion ? (ultimo?.numeroIntento ?? null) : null;

    // Qué lugar se está sorteando AHORA MISMO — se deriva de N/K, sin pedir
    // nada nuevo al backend: cada ronda de N bolas sortea un lugar (ver
    // `sorteo.ts`), en orden descendente (K, K-1, ..., 1), así que
    // `Math.floor(reveladas / N)` da la ronda y `K - ronda` el lugar.
    const rondaActual = numeroIntentosSorteo ? Math.floor(intentosRevelados.length / numeroIntentosSorteo) : null;
    const lugarRondaActual = rondaActual !== null && rondaActual < numeroLugaresGanadores ? numeroLugaresGanadores - rondaActual : null;

    return (
        <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{terminando ? 'Sorteo terminado' : 'Sorteando…'}</h3>
                {totalBolasSorteo && (
                    <span className="text-sm font-semibold text-slate-500">
                        {intentosRevelados.length}/{totalBolasSorteo} bolas
                    </span>
                )}
            </div>

            {/* Banner — anuncia qué lugar se sortea ANTES/DURANTE su ronda,
                para que quede claro por qué premio va cada tanda de bolas. */}
            {!terminando && lugarRondaActual !== null && (
                <div className="mx-auto mb-3 flex w-fit items-center justify-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-5 py-2 shadow-md shadow-amber-600/20">
                    <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
                    <span className="text-sm font-extrabold uppercase tracking-wide text-white">
                        {lugarRondaActual === 1 ? 'Sorteando el Premio Mayor' : `Sorteando el Lugar ${lugarRondaActual}`}
                    </span>
                </div>
            )}

            {/* Escenario — canvas 3D real (Three.js), mismo diseño en
                escritorio y en móvil, cargado bajo demanda con un spinner
                simple como fallback mientras carga el chunk. */}
            <Suspense fallback={<CargandoEscenario3D />}>
                <EscenarioTombola3D numeroIntentoActual={numeroIntentoActual} girando={girando} />
            </Suspense>

            {/* Revelación actual — debajo de la escena, NO encima (un overlay
                que tapa la tómbola mientras gira se sentía mal). El
                `animation-delay` mantiene todo invisible mientras la bola
                todavía viaja (`fill-mode: both`), y aparece justo cuando
                llega. `key` fuerza el remount para que la secuencia se
                repita con cada bola — pero SOLO si `animarRevelacion` (bola
                en vivo genuina); si el resultado ya venía cargado (sala
                cerrada o "ponte al día"), se muestra directo sin animar. */}
            {ultimo && (
                <div key={ultimo.numeroIntento} className="mx-auto mb-2 flex flex-col items-center">
                    <div
                        className="relative flex flex-col items-center justify-center gap-1"
                        style={animarRevelacion ? { animation: 'bolaZoomCamara 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 780ms both' } : undefined}
                    >
                        {ultimo.esGanador && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-amber-400/50"
                                style={{ animation: `cardHeartRingPulse ${esPremioMayor ? '1.6s' : '2.2s'} ease-in-out infinite` }}
                            />
                        )}
                        <div
                            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-5 py-3 shadow-md ${
                                ultimo.esGanador ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-white'
                            }`}
                        >
                            {ultimo.esGanador ? (
                                <Trophy className={esPremioMayor ? 'h-6 w-6 text-amber-500' : 'h-5 w-5 text-amber-500'} strokeWidth={2.5} />
                            ) : (
                                <X className="h-5 w-5 text-slate-400" strokeWidth={2.5} />
                            )}
                            <span className={`font-extrabold tabular-nums ${esPremioMayor ? 'text-3xl' : 'text-2xl'} ${ultimo.esGanador ? 'text-amber-700' : 'text-slate-500'}`}>
                                #{ultimo.numeroBoleto}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                {esPremioMayor ? 'Premio mayor' : ultimo.esGanador ? `Lugar ${ultimo.lugar}` : 'No ganó'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {intentosRevelados.length === 0 ? (
                <p className="pb-2 pt-2 text-center text-sm font-medium text-slate-500">Esperando la primera bola…</p>
            ) : (
                anteriores.length > 0 && (
                    /* Historial — bolas anteriores, en tira horizontal (mismo
                       patrón de "reel" que el resto de la app), con forma de
                       talón de boleto (franja de color lateral + layout
                       horizontal) en vez de una tarjeta cuadrada con el
                       ícono arriba. Ícono + texto en cada uno (no solo el
                       tono) para que "no ganó" vs "lugar N" quede
                       inequívoco de un vistazo. */
                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                        {anteriores.map((intento) => (
                            <div
                                key={intento.numeroIntento}
                                className={`flex shrink-0 items-center gap-3 rounded-xl border-y border-r py-3 pl-3.5 pr-5 shadow-sm ${
                                    intento.esGanador
                                        ? 'border-l-4 border-l-amber-500 border-y-amber-200 border-r-amber-200 bg-amber-50'
                                        : 'border-l-4 border-l-slate-300 border-y-slate-200 border-r-slate-200 bg-white'
                                }`}
                            >
                                {intento.esGanador ? (
                                    <Trophy className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={2.5} />
                                ) : (
                                    <X className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2.5} />
                                )}
                                <div className="flex flex-col leading-tight">
                                    <span className={`text-lg font-bold tabular-nums ${intento.esGanador ? 'text-amber-700' : 'text-slate-600'}`}>
                                        #{intento.numeroBoleto}
                                    </span>
                                    <span className={`text-xs font-bold uppercase tracking-wide ${intento.esGanador ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {intento.esGanador ? `Lugar ${intento.lugar}` : 'No ganó'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default TombolaSorteo;
