/**
 * GanadoresSala.tsx
 * ===================
 * Card de resultado final de la sala — lista ordenada por lugar (1ro
 * arriba). Cada fila separa claramente 4 piezas de información: el lugar
 * (badge numerado), el avatar, el nombre del competidor y su boleto — sin
 * mezclarlas en un solo texto (antes decía "Lugar #2 · #55" pegado al
 * nombre "Competidor 055", que se leía repetido).
 *
 * Avatar real (con `ModalImagenes` al hacer click) si el ganador tiene
 * cuenta AY, iniciales genéricas si no.
 *
 * Sin colores gold/silver/bronze por rango (Regla 13 de TOKENS_GLOBALES.md
 * — nada de medallas de colores) — el lugar #1 se distingue por tamaño y
 * un fondo ámbar sutil, no por un color de medalla distinto por puesto.
 *
 * Usado por `PaginaSalaDinamica.tsx` y `PaginaSalaDinamicaPublica.tsx`.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/GanadoresSala.tsx
 */

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { ModalImagenes } from '../../ui/ModalImagenes';
import type { GanadorDinamica, MetodoSorteo } from '../../../types/dinamicas';
import { obtenerCartaPorBoleto } from '../../../data/cartasLoteria';

interface GanadoresSalaProps {
    ganadores: GanadorDinamica[];
    /** Si el método es `carta_unica`, cada fila muestra la miniatura de la
     *  carta asignada junto a "Boleto #N" (ver `data/cartasLoteria.ts`). */
    metodoSorteo?: MetodoSorteo | null;
}

function nombreDe(g: GanadorDinamica): string {
    if (g.usuarioId) return `${g.usuarioNombre ?? ''} ${g.usuarioApellidos ?? ''}`.trim() || 'Usuario AY';
    return g.nombreManual ?? 'Sin cuenta AY';
}

function AvatarGanador({ g, esPrimero }: { g: GanadorDinamica; esPrimero: boolean }) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const nombre = nombreDe(g);
    const inicial = (nombre.charAt(0) || '?').toUpperCase();
    const clase = esPrimero ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';

    return (
        <>
            <button
                type="button"
                onClick={() => g.usuarioAvatarUrl && setModalAbierto(true)}
                aria-label={`Foto de ${nombre}`}
                className={`${clase} shrink-0 overflow-hidden rounded-full ring-2 ${esPrimero ? 'ring-amber-400' : 'ring-slate-200'} lg:cursor-pointer`}
            >
                {g.usuarioAvatarUrl ? (
                    <img src={g.usuarioAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span
                        className="flex h-full w-full items-center justify-center font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                        {inicial}
                    </span>
                )}
            </button>
            {modalAbierto && g.usuarioAvatarUrl && (
                <ModalImagenes isOpen={modalAbierto} onClose={() => setModalAbierto(false)} images={[g.usuarioAvatarUrl]} initialIndex={0} />
            )}
        </>
    );
}

function FilaGanador({ g, mostrarCarta }: { g: GanadorDinamica; mostrarCarta: boolean }) {
    const esPrimero = g.lugar === 1;
    const carta = mostrarCarta ? obtenerCartaPorBoleto(g.numeroBoleto) : null;
    return (
        <div
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                esPrimero ? 'border border-amber-300 bg-amber-50' : 'bg-slate-50'
            }`}
        >
            <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    esPrimero ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
                {g.lugar}
            </span>
            <AvatarGanador g={g} esPrimero={esPrimero} />
            <div className="min-w-0 flex-1">
                <p className={`truncate font-bold text-slate-900 ${esPrimero ? 'text-sm' : 'text-[13px]'}`}>{nombreDe(g)}</p>
                <div className="flex items-center gap-1.5">
                    {carta && <img src={carta.archivo} alt={carta.nombre} className="h-5 w-3.5 shrink-0 rounded-xs object-cover" />}
                    <p className="text-xs font-semibold text-slate-500">Boleto #{g.numeroBoleto}</p>
                </div>
            </div>
            {esPrimero && <Trophy className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={2.5} />}
        </div>
    );
}

export function GanadoresSala({ ganadores, metodoSorteo }: GanadoresSalaProps) {
    if (ganadores.length === 0) return null;

    const ordenados = [...ganadores].sort((a, b) => a.lugar - b.lugar);
    const mostrarCarta = metodoSorteo === 'carta_unica';

    return (
        <div className="rounded-2xl border-2 border-slate-300 bg-white p-5">
            <h3 className="mb-4 flex items-center justify-center gap-1.5 text-base font-extrabold uppercase tracking-wide text-slate-900">
                <Trophy className="h-5 w-5 text-amber-500" strokeWidth={2.5} />
                Ganadores
            </h3>

            <div className="space-y-2">
                {ordenados.map((g) => (
                    <FilaGanador key={g.lugar} g={g} mostrarCarta={mostrarCarta} />
                ))}
            </div>
        </div>
    );
}

export default GanadoresSala;
