/**
 * ChipsFiltrosFeed.tsx
 * =====================
 * Barra de chips horizontales sticky para filtrar el feed v1.2 del MarketPlace.
 *
 * Comportamiento (decisiones del rediseño):
 *  - **Un solo chip activo** a la vez (no son combinables — si quieres
 *    combinables, se reabre la decisión).
 *  - **Default**: "Recientes". Es el orden cronológico inverso.
 *  - Al activar un chip distinto al default → el reel desaparece (decisión de
 *    Juan: el reel solo se muestra en el "home" del marketplace, sin filtros).
 *    Esa lógica vive en el padre (`PaginaMarketplace`); este componente solo
 *    notifica el cambio.
 *  - **Sin categorías** — MarketPlace v1 no tiene categorías.
 *
 * Ubicación: apps/web/src/components/marketplace/ChipsFiltrosFeed.tsx
 */

import { Clock, Eye, MapPin } from 'lucide-react';
import type { OrdenFeedInfinito } from '../../types/marketplace';

interface ChipsFiltrosFeedProps {
    valor: OrdenFeedInfinito;
    onCambio: (nuevo: OrdenFeedInfinito) => void;
    /** Si es false, el chip "Cerca de ti" se muestra deshabilitado (sin GPS). */
    gpsDisponible?: boolean;
    /** Variante visual: 'light' (default) sobre fondo claro, 'dark' sobre el header dark. */
    variant?: 'light' | 'dark';
}

interface OpcionChip {
    valor: OrdenFeedInfinito;
    etiqueta: string;
    icono: React.ReactNode;
}

const OPCIONES: OpcionChip[] = [
    {
        valor: 'recientes',
        etiqueta: 'Recientes',
        icono: <Clock className="h-4 w-4" strokeWidth={2.5} />,
    },
    {
        valor: 'vistos',
        etiqueta: 'Más vistos',
        icono: <Eye className="h-4 w-4" strokeWidth={2.5} />,
    },
    {
        valor: 'cerca',
        etiqueta: 'Cerca de ti',
        icono: <MapPin className="h-4 w-4" strokeWidth={2.5} />,
    },
];

export function ChipsFiltrosFeed({
    valor,
    onCambio,
    gpsDisponible = true,
    variant = 'light',
}: ChipsFiltrosFeedProps) {
    return (
        <div
            data-testid="chips-filtros-feed"
            className={`flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] ${variant === 'dark' ? '' : 'px-4 py-3'
                }`}
        >
            {OPCIONES.map((opcion) => {
                const activo = valor === opcion.valor;
                const disabled = opcion.valor === 'cerca' && !gpsDisponible;

                const clasesActivo =
                    variant === 'dark'
                        ? 'border-teal-400 bg-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'border-teal-600 bg-teal-600 text-white shadow-sm';
                const clasesDisabled =
                    variant === 'dark'
                        ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                        : 'border-slate-300 bg-slate-100 text-slate-600 opacity-60 cursor-not-allowed';
                const clasesInactivo =
                    variant === 'dark'
                        ? 'border-white/15 bg-white/5 text-slate-200 lg:hover:border-teal-400/60 lg:hover:bg-white/10 lg:hover:text-white'
                        : 'border-slate-300 bg-white text-slate-700 lg:hover:border-teal-400 lg:hover:text-teal-700';

                return (
                    <button
                        type="button"
                        key={opcion.valor}
                        data-testid={`chip-filtro-${opcion.valor}`}
                        onClick={() => !disabled && onCambio(opcion.valor)}
                        disabled={disabled}
                        aria-pressed={activo}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold lg:cursor-pointer ${activo ? clasesActivo : disabled ? clasesDisabled : clasesInactivo
                            }`}
                    >
                        {opcion.icono}
                        <span>{opcion.etiqueta}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default ChipsFiltrosFeed;
