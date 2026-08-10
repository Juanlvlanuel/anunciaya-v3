/**
 * CartaSorteo.tsx
 * =================
 * Revelación del sorteo para el método `carta_unica` (Fase 4.3) — hermano
 * de `TombolaSorteo.tsx`, MISMO shape de props y misma lógica derivada
 * (título, banner de ronda, guardia de animación solo para bolas en vivo
 * genuinas, historial en tira horizontal). Se duplica ese esqueleto a
 * propósito en vez de compartirlo con la tómbola — evita el riesgo de
 * regresionar ese componente (ya pulido/probado) por una abstracción que
 * ahorraría ~30 líneas.
 *
 * Lo único que cambia es la piel visual: en vez de una escena 3D con
 * Three.js, cada boleto se identifica con una carta de la baraja de
 * lotería mexicana (`data/cartasLoteria.ts`) — mapeo puro y determinista
 * de `numeroBoleto`, sin tabla ni columna en BD (ver
 * docs/arquitectura/Dinamicas.md). Los assets son webp bundleados
 * livianos, así que no hace falta `Suspense`/lazy-load como con el chunk
 * de Three.js.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/CartaSorteo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Ticket, Trophy, X } from 'lucide-react';
import type { IntentoSorteoEvento } from '../../../types/dinamicas';
import { obtenerCartaPorBoleto } from '../../../data/cartasLoteria';

interface CartaSorteoProps {
    intentosRevelados: IntentoSorteoEvento[];
    /** Intentos POR lugar (N) — ver mismo comentario en `TombolaSorteo.tsx`. */
    numeroIntentosSorteo: number | null;
    numeroLugaresGanadores: number;
    salaCerrada: boolean;
}

export function CartaSorteo({ intentosRevelados, numeroIntentosSorteo, numeroLugaresGanadores, salaCerrada }: CartaSorteoProps) {
    const ultimo = intentosRevelados[intentosRevelados.length - 1] ?? null;
    const anteriores = intentosRevelados.slice(0, -1);
    const totalBolasSorteo = numeroIntentosSorteo !== null ? numeroIntentosSorteo * numeroLugaresGanadores : null;
    const terminando = salaCerrada || (totalBolasSorteo !== null && intentosRevelados.length >= totalBolasSorteo);
    const esPremioMayor = !!ultimo?.esGanador && ultimo.lugar === 1;

    // Misma guardia que TombolaSorteo: solo animar cuando la última carta
    // llegó como incremento genuino EN VIVO, no cuando el arreglo ya venía
    // cargado de una vez (sala cerrada, o "ponte al día" al entrar a mitad
    // del sorteo).
    const longitudAnteriorRef = useRef<number | null>(null);
    const [numeroIntentoAnimable, setNumeroIntentoAnimable] = useState<number | null>(null);
    useEffect(() => {
        const anterior = longitudAnteriorRef.current;
        longitudAnteriorRef.current = intentosRevelados.length;
        setNumeroIntentoAnimable(anterior !== null && intentosRevelados.length === anterior + 1 ? (ultimo?.numeroIntento ?? null) : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intentosRevelados.length]);
    const animarRevelacion = ultimo !== null && ultimo.numeroIntento === numeroIntentoAnimable;

    const rondaActual = numeroIntentosSorteo ? Math.floor(intentosRevelados.length / numeroIntentosSorteo) : null;
    const lugarRondaActual = rondaActual !== null && rondaActual < numeroLugaresGanadores ? numeroLugaresGanadores - rondaActual : null;

    const cartaActual = ultimo ? obtenerCartaPorBoleto(ultimo.numeroBoleto) : null;

    return (
        <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{terminando ? 'Sorteo terminado' : 'Revelando cartas…'}</h3>
                {totalBolasSorteo && (
                    <span className="text-sm font-semibold text-slate-500">
                        {intentosRevelados.length}/{totalBolasSorteo} cartas
                    </span>
                )}
            </div>

            {!terminando && lugarRondaActual !== null && (
                <div className="mx-auto mb-8 flex w-fit items-center justify-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-5 py-2 shadow-md shadow-amber-600/20">
                    <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
                    <span className="text-sm font-extrabold uppercase tracking-wide text-white">
                        {lugarRondaActual === 1 ? 'Sorteando el Primer Lugar' : `Sorteando el Lugar ${lugarRondaActual}`}
                    </span>
                </div>
            )}

            {/* Escenario — reverso de la carta en reposo (visual fijo, como
                la jaula de la tómbola) ANTES de la primera carta; en cuanto
                hay una revelación, se muestra directo la cara real (sin
                intercambio de contenido a media animación — eso es lo que
                causaba el parpadeo de un intento anterior con flip 3D). El
                único efecto es un zoom de entrada en la carta misma
                (reutiliza `bolaZoomCamara`, igual que la tómbola). */}
            <div key={ultimo ? ultimo.numeroIntento : 'reposo'} className="mx-auto my-3 flex flex-col items-center">
                <div
                    className="relative flex flex-col items-center gap-2"
                    style={ultimo && animarRevelacion ? { animation: 'bolaZoomCamara 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both' } : undefined}
                >
                    {ultimo?.esGanador && (
                        <span
                            aria-hidden
                            className="pointer-events-none absolute -inset-3 rounded-2xl border-2 border-amber-400/50"
                            style={{ animation: `cardHeartRingPulse ${esPremioMayor ? '1.6s' : '2.2s'} ease-in-out infinite` }}
                        />
                    )}
                    <div className="relative" style={{ width: 132, height: 198 }}>
                        {!ultimo || !cartaActual ? (
                            /* Reverso — lo único visible en reposo antes de la
                                primera carta. Mismo estilo dark que el header
                                de la sala ("Sala en vivo"): fondo negro +
                                resplandor ámbar radial + textura de rejilla
                                fina. */
                            <div
                                className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl border-2 border-amber-300 shadow-md"
                                style={{ background: '#000000' }}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{ background: 'radial-gradient(ellipse at 70% 20%, rgba(245,158,11,0.28) 0%, transparent 60%)' }}
                                />
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        opacity: 0.08,
                                        backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 16px),
                                                          repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 16px)`,
                                    }}
                                />
                                <div className="absolute inset-1.5 rounded-lg border-2 border-white/20" />
                                <Ticket className="relative h-9 w-9 text-amber-400" strokeWidth={1.5} />
                            </div>
                        ) : (
                            <div
                                className={`absolute inset-0 overflow-hidden rounded-xl border-2 shadow-md ${
                                    ultimo.esGanador ? 'border-amber-400' : 'border-slate-300'
                                }`}
                                style={ultimo.esGanador ? { animation: 'cartaGanadoraFlota 2.4s ease-in-out infinite' } : undefined}
                            >
                                <img src={cartaActual.archivo} alt={cartaActual.nombre} className="h-full w-full object-cover" />
                                <span
                                    className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ${
                                        ultimo.esGanador ? 'bg-amber-500' : 'bg-slate-900/60'
                                    }`}
                                >
                                    {ultimo.esGanador ? (
                                        <Trophy className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                                    ) : (
                                        <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    {ultimo && cartaActual && (
                        <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-lg font-extrabold ${ultimo.esGanador ? 'text-amber-700' : 'text-slate-700'}`}>{cartaActual.nombre}</span>
                            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                {esPremioMayor ? 'Primer lugar' : ultimo.esGanador ? `Lugar ${ultimo.lugar}` : 'No ganó'} · Boleto #{ultimo.numeroBoleto}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {intentosRevelados.length === 0 ? (
                <p className="pb-2 pt-2 text-center text-sm font-medium text-slate-500">Esperando la primera carta…</p>
            ) : (
                anteriores.length > 0 && (
                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                        {anteriores.map((intento) => {
                            const carta = obtenerCartaPorBoleto(intento.numeroBoleto);
                            return (
                                <div key={intento.numeroIntento} className="flex shrink-0 flex-col items-center gap-1">
                                    <div
                                        className={`relative overflow-hidden rounded-lg border-2 ${
                                            intento.esGanador ? 'border-amber-400' : 'border-slate-200'
                                        }`}
                                        style={{ width: 44, height: 66 }}
                                    >
                                        <img src={carta.archivo} alt={carta.nombre} className="h-full w-full object-cover" />
                                        <span
                                            className={`absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${
                                                intento.esGanador ? 'bg-amber-500' : 'bg-slate-900/60'
                                            }`}
                                        >
                                            {intento.esGanador ? (
                                                <Trophy className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                            ) : (
                                                <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                            )}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${intento.esGanador ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {intento.esGanador ? `Lugar ${intento.lugar}` : 'No ganó'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

export default CartaSorteo;
