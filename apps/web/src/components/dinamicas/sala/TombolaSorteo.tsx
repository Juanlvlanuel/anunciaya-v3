/**
 * TombolaSorteo.tsx
 * ===================
 * Revelación del sorteo — STUB de Fase 4.1: transición simple (fade + zoom)
 * conforme llegan los eventos `dinamica:sala:intento` desde el socket, sin
 * animación cinematográfica de tómbola (eso es Fase 4.2, aparte — aislado
 * en este componente para poder reemplazarlo sin tocar el resto de la sala).
 *
 * Cada bola aparece en orden: las primeras (no ganadoras) quedan marcadas
 * "Descalificado"; las últimas K (según `numeroLugaresGanadores`) se
 * revelan como ganadoras, el premio grande (lugar #1) al final.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/TombolaSorteo.tsx
 */

import { Trophy } from 'lucide-react';
import type { IntentoSorteoEvento } from '../../../types/dinamicas';

interface TombolaSorteoProps {
    intentosRevelados: IntentoSorteoEvento[];
    numeroIntentosSorteo: number | null;
}

export function TombolaSorteo({ intentosRevelados, numeroIntentosSorteo }: TombolaSorteoProps) {
    return (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-900">Sorteando…</h3>
                {numeroIntentosSorteo && (
                    <span className="text-sm font-semibold text-amber-700">
                        {intentosRevelados.length}/{numeroIntentosSorteo} bolas
                    </span>
                )}
            </div>

            {intentosRevelados.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-amber-700">Esperando la primera bola…</p>
            ) : (
                <div className="flex flex-wrap gap-2.5">
                    {intentosRevelados.map((intento) => (
                        <div
                            key={intento.numeroIntento}
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center animate-in fade-in zoom-in duration-300 ${
                                intento.esGanador
                                    ? 'border-2 border-amber-500 bg-white shadow-md'
                                    : 'border-2 border-slate-300 bg-white opacity-60'
                            }`}
                        >
                            {intento.esGanador && <Trophy className="h-4 w-4 text-amber-500" strokeWidth={2.5} />}
                            <span className={`text-lg font-extrabold ${intento.esGanador ? 'text-amber-700' : 'text-slate-500'}`}>
                                #{intento.numeroBoleto}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                {intento.esGanador ? `Lugar ${intento.lugar}` : 'Descalificado'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
