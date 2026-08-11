/**
 * TablaCompletaSorteo.tsx
 * =========================
 * Revelación del sorteo para el método `tabla_completa` (Fase 4.3) — motor
 * distinto a tómbola/carta única (`ejecutarSorteoTablaCompleta`): no hay
 * K×N bolas fijas, se cantan cartas de la baraja (54, sin reemplazo) y gana
 * el PRIMERO en completar su tabla — al revés de los otros 2 métodos, aquí
 * el Primer Lugar sale primero, no al final.
 *
 * Reusa el mismo lenguaje visual que `CartaSorteo.tsx` (reverso oscuro +
 * zoom de entrada `bolaZoomCamara`, tira de historial) para la carta que se
 * va cantando, y agrega una pieza nueva propia de este método: "Tu tabla" —
 * el 4×4 del boleto del usuario actual, marcado en vivo según se van
 * cantando las cartas.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/TablaCompletaSorteo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Grid3x3, Trophy } from 'lucide-react';
import type { CartaCantadaEvento } from '../../../types/dinamicas';
import { CARTAS_LOTERIA } from '../../../data/cartasLoteria';
import type { TablaLoteria } from '../../../data/tablasLoteria';

interface TablaCompletaSorteoProps {
    cartasReveladas: CartaCantadaEvento[];
    numeroLugaresGanadores: number;
    salaCerrada: boolean;
    /** Tabla(s) del usuario actual en esta Dinámica — vacío si no compró
     *  boleto (o no tiene sesión). Puede tener más de 1 si compró varios. */
    misTablas: TablaLoteria[];
}

export function TablaCompletaSorteo({ cartasReveladas, numeroLugaresGanadores, salaCerrada, misTablas }: TablaCompletaSorteoProps) {
    const ultima = cartasReveladas[cartasReveladas.length - 1] ?? null;
    const anteriores = cartasReveladas.slice(0, -1);
    const cantadas = new Set(cartasReveladas.map((c) => c.cartaIndice));
    const lugaresAsignados = cartasReveladas.reduce((n, c) => n + c.ganadores.length, 0);
    const mazoAgotado = cartasReveladas.length >= 54;
    const terminando = salaCerrada || lugaresAsignados >= numeroLugaresGanadores || mazoAgotado;
    const siguienteLugar = lugaresAsignados + 1;

    // Misma guardia que CartaSorteo: solo animar cuando la última carta
    // llegó como incremento genuino EN VIVO, no cuando el arreglo ya venía
    // cargado de una vez (sala cerrada, o "ponte al día" a mitad del sorteo).
    const longitudAnteriorRef = useRef<number | null>(null);
    const [numeroIntentoAnimable, setNumeroIntentoAnimable] = useState<number | null>(null);
    useEffect(() => {
        const anterior = longitudAnteriorRef.current;
        longitudAnteriorRef.current = cartasReveladas.length;
        setNumeroIntentoAnimable(anterior !== null && cartasReveladas.length === anterior + 1 ? (ultima?.numeroIntento ?? null) : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartasReveladas.length]);
    const animarRevelacion = ultima !== null && ultima.numeroIntento === numeroIntentoAnimable;

    const cartaActual = ultima ? CARTAS_LOTERIA[ultima.cartaIndice - 1] : null;
    const gananciaUltima = ultima?.ganadores ?? [];

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{terminando ? 'Sorteo terminado' : 'Cantando cartas…'}</h3>
                    <span className="text-sm font-semibold text-slate-500">{cartasReveladas.length}/54 cartas</span>
                </div>

                {!terminando && (
                    <div className="mx-auto mb-8 flex w-fit items-center justify-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-5 py-2 shadow-md shadow-amber-600/20">
                        <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
                        <span className="text-sm font-extrabold uppercase tracking-wide text-white">
                            {siguienteLugar === 1 ? 'Buscando el Primer Lugar' : `Buscando el Lugar ${siguienteLugar}`}
                        </span>
                    </div>
                )}

                {/* Escenario — mismo reverso oscuro que CartaSorteo antes de la
                    primera carta; en cuanto hay una revelación, se muestra
                    directo la cara real con un zoom de entrada. */}
                <div key={ultima ? ultima.numeroIntento : 'reposo'} className="mx-auto my-3 flex flex-col items-center">
                    <div
                        className="relative flex flex-col items-center gap-2"
                        style={ultima && animarRevelacion ? { animation: 'bolaZoomCamara 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both' } : undefined}
                    >
                        {gananciaUltima.length > 0 && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute -inset-3 rounded-2xl border-2 border-amber-400/50"
                                style={{ animation: `cardHeartRingPulse ${gananciaUltima.some((g) => g.lugar === 1) ? '1.6s' : '2.2s'} ease-in-out infinite` }}
                            />
                        )}
                        <div className="relative" style={{ width: 132, height: 198 }}>
                            {!ultima || !cartaActual ? (
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
                                    <Grid3x3 className="relative h-9 w-9 text-amber-400" strokeWidth={1.5} />
                                </div>
                            ) : (
                                <div
                                    className={`absolute inset-0 overflow-hidden rounded-xl border-2 shadow-md ${
                                        gananciaUltima.length > 0 ? 'border-amber-400' : 'border-slate-300'
                                    }`}
                                    style={gananciaUltima.length > 0 ? { animation: 'cartaGanadoraFlota 2.4s ease-in-out infinite' } : undefined}
                                >
                                    <img src={cartaActual.archivo} alt={cartaActual.nombre} className="h-full w-full object-cover" />
                                    {gananciaUltima.length > 0 && (
                                        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                                            <Trophy className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {ultima && cartaActual && (
                            <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-lg font-extrabold ${gananciaUltima.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                                    {cartaActual.nombre}
                                </span>
                                {gananciaUltima.length > 0 ? (
                                    <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                        {gananciaUltima
                                            .map((g) => (g.lugar === 1 ? `¡Primer lugar! Boleto #${g.numeroBoleto}` : `Lugar ${g.lugar} · Boleto #${g.numeroBoleto}`))
                                            .join(' · ')}
                                    </span>
                                ) : (
                                    <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Nadie completó todavía</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {cartasReveladas.length === 0 ? (
                    <p className="pb-2 pt-2 text-center text-sm font-medium text-slate-500">Esperando la primera carta…</p>
                ) : (
                    anteriores.length > 0 && (
                        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                            {anteriores.map((carta) => {
                                const info = CARTAS_LOTERIA[carta.cartaIndice - 1];
                                const gano = carta.ganadores.length > 0;
                                return (
                                    <div key={carta.numeroIntento} className="flex shrink-0 flex-col items-center gap-1">
                                        <div
                                            className={`relative overflow-hidden rounded-lg border-2 ${gano ? 'border-amber-400' : 'border-slate-200'}`}
                                            style={{ width: 44, height: 66 }}
                                        >
                                            <img src={info.archivo} alt={info.nombre} className="h-full w-full object-cover" />
                                            {gano && (
                                                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                                                    <Trophy className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                                </span>
                                            )}
                                        </div>
                                        {gano && (
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                                                {carta.ganadores.map((g) => `Lugar ${g.lugar}`).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* "Tu tabla" — solo si el usuario actual tiene boleto(s) pagado(s)
                en esta Dinámica. Se marca en vivo según se van cantando las
                cartas, igual que un bingo real. */}
            {misTablas.length > 0 && (
                <div className="space-y-3">
                    {misTablas.map((tabla, i) => {
                        const marcadas = tabla.cartas.filter((c) => cantadas.has(c.numero)).length;
                        const completa = marcadas === tabla.cartas.length;
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border-2 bg-white p-3 ${completa ? 'border-amber-400 shadow-md shadow-amber-500/20' : 'border-slate-300'}`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-700">
                                        Tu tabla{misTablas.length > 1 ? ` #${i + 1}` : ''}
                                    </span>
                                    <span className={`text-xs font-bold uppercase tracking-wide ${completa ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {completa ? '¡Tabla completa!' : `${marcadas}/16`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    {tabla.cartas.map((carta) => {
                                        const marcada = cantadas.has(carta.numero);
                                        return (
                                            <div
                                                key={carta.numero}
                                                className={`relative aspect-[2/3] overflow-hidden rounded-md border ${marcada ? 'border-amber-400' : 'border-slate-200'}`}
                                            >
                                                <img
                                                    src={carta.archivo}
                                                    alt={carta.nombre}
                                                    className={`h-full w-full object-cover ${marcada ? '' : 'opacity-40 grayscale'}`}
                                                />
                                                {marcada && (
                                                    <span className="absolute inset-0 flex items-center justify-center bg-amber-500/25">
                                                        <Trophy className="h-3.5 w-3.5 text-amber-600 drop-shadow" strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default TablaCompletaSorteo;
