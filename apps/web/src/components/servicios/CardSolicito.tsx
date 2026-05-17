/**
 * CardSolicito.tsx
 * =================
 * Card del feed cuando `tipo='solicito'` — usuario que busca contratar.
 *
 * Fondo amber-50/70 sutil (única excepción al sistema sky-only para diferenciar
 * visualmente las solicitudes de las ofertas). Sin foto grande — iconografía
 * por categoría implícita + bloque de presupuesto.
 *
 * Ubicación: apps/web/src/components/servicios/CardSolicito.tsx
 */

import { MapPin, User, Wrench, Briefcase, Image as ImageIcon } from 'lucide-react';
import type {
    PublicacionServicio,
    OferenteServicio,
} from '../../types/servicios';
import {
    formatearPresupuesto,
    formatearTiempoRelativo,
} from '../../utils/servicios';

type CategoriaIcono = 'tool' | 'briefcase' | 'image' | 'user';

interface CardSolicitoProps {
    publicacion: PublicacionServicio;
    /** Solicitante. */
    solicitante?: Pick<OferenteServicio, 'nombre' | 'apellidos'>;
    /** Ícono representativo de la categoría. Sin foto grande para este tipo. */
    categoriaIcono?: CategoriaIcono;
    onClick?: () => void;
}

const ICONO_MAP: Record<CategoriaIcono, typeof Wrench> = {
    tool: Wrench,
    briefcase: Briefcase,
    image: ImageIcon,
    user: User,
};

export function CardSolicito({
    publicacion,
    solicitante,
    categoriaIcono = 'tool',
    onClick,
}: CardSolicitoProps) {
    const Icono = ICONO_MAP[categoriaIcono];

    const nombreCorto = solicitante
        ? `${solicitante.nombre} ${solicitante.apellidos.charAt(0)}.`
        : 'Vecino';

    const presupuesto = publicacion.presupuesto
        ? formatearPresupuesto(publicacion.presupuesto)
        : 'A convenir';

    const zona =
        publicacion.zonasAproximadas[0] ?? publicacion.ciudad.split(',')[0];
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);

    return (
        <article
            data-testid={`card-solicito-${publicacion.id}`}
            onClick={onClick}
            className="rounded-2xl overflow-hidden bg-amber-50/70 border border-amber-200/70 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
            <div className="p-3.5">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 grid place-items-center text-amber-700 shrink-0">
                        <Icono className="w-[26px] h-[26px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                            Solicito
                        </span>
                        <div className="mt-1 text-[14px] font-bold text-slate-900 leading-snug truncate">
                            {publicacion.titulo}
                        </div>
                        <div className="mt-0.5 text-[12px] font-semibold text-slate-700">
                            Presupuesto {presupuesto}
                        </div>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1 min-w-0">
                        <User className="w-[11px] h-[11px]" strokeWidth={1.75} />
                        <span className="truncate">{nombreCorto}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="w-[11px] h-[11px]" strokeWidth={1.75} />
                        {zona} · {tiempo}
                    </span>
                </div>
            </div>
        </article>
    );
}

export default CardSolicito;
