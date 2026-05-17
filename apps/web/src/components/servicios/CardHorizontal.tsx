/**
 * CardHorizontal.tsx
 * ====================
 * Variante compacta usada en el carrusel "Recién publicado". Ancho fijo
 * 220px, aspect 4:3. Sin avatar visible para ahorrar espacio — la info
 * mínima es título + precio + meta (modalidad/tiempo).
 *
 * Ubicación: apps/web/src/components/servicios/CardHorizontal.tsx
 */

import type { PublicacionServicio } from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearTiempoRelativo,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';

interface CardHorizontalProps {
    publicacion: PublicacionServicio;
    onClick?: () => void;
}

export function CardHorizontal({ publicacion, onClick }: CardHorizontalProps) {
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex
    );
    const meta = `${modalidadLabel(publicacion.modalidad)} · ${formatearTiempoRelativo(publicacion.createdAt)}`;

    return (
        <article
            data-testid={`card-horizontal-${publicacion.id}`}
            onClick={onClick}
            className="w-[220px] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md shrink-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all snap-start"
        >
            <div className="aspect-[4/3] relative bg-stripe">
                {fotoUrl ? (
                    <img
                        src={fotoUrl}
                        alt={publicacion.titulo}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center">
                        <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">
                            foto / publicación
                        </span>
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="text-[13px] font-bold text-slate-900 leading-snug truncate">
                    {publicacion.titulo}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-extrabold text-slate-900 truncate">
                        {formatearPrecioServicio(publicacion.precio)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 truncate">
                        {meta}
                    </span>
                </div>
            </div>
        </article>
    );
}

export default CardHorizontal;
