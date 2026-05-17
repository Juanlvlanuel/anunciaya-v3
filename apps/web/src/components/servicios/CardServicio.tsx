/**
 * CardServicio.tsx
 * =================
 * Card del feed cuando `tipo='servicio-persona'` — persona física que ofrece
 * sus habilidades.
 *
 * Layout: foto del trabajo arriba (aspect 4:3) + bloque blanco abajo con
 * avatar+nombre del oferente, título, precio, modalidad, distancia/tiempo.
 *
 * Ubicación: apps/web/src/components/servicios/CardServicio.tsx
 */

import { MapPin } from 'lucide-react';
import type {
    PublicacionServicio,
    OferenteServicio,
} from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearTiempoRelativo,
    formatearDistancia,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';

interface CardServicioProps {
    publicacion: PublicacionServicio;
    /** Embebido cuando el feed enriquecido lo trae (Sprint 3+). */
    oferente?: Pick<OferenteServicio, 'nombre' | 'apellidos' | 'avatarUrl'>;
    /** Distancia en metros desde el GPS del usuario. */
    distanciaMetros?: number | null;
    onClick?: () => void;
}

export function CardServicio({
    publicacion,
    oferente,
    distanciaMetros = null,
    onClick,
}: CardServicioProps) {
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex
    );
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const distancia = formatearDistancia(distanciaMetros);
    const distanciaTiempo = distancia ? `${distancia} · ${tiempo}` : tiempo;

    const nombreCompleto = oferente
        ? `${oferente.nombre} ${oferente.apellidos.charAt(0)}.`
        : 'Vendedor';
    const iniciales = oferente
        ? `${oferente.nombre.charAt(0)}${oferente.apellidos.charAt(0)}`.toUpperCase()
        : '··';

    return (
        <article
            data-testid={`card-servicio-${publicacion.id}`}
            onClick={onClick}
            className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
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
                            foto del trabajo
                        </span>
                    </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Servicio
                </span>
            </div>
            <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                    {oferente?.avatarUrl ? (
                        <img
                            src={oferente.avatarUrl}
                            alt={nombreCompleto}
                            className="w-5 h-5 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-linear-to-br from-slate-300 to-slate-500 grid place-items-center text-[9px] font-bold text-white">
                            {iniciales}
                        </div>
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 truncate">
                        {nombreCompleto}
                    </span>
                </div>
                <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">
                    {publicacion.titulo}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[15px] font-extrabold text-slate-900">
                        {formatearPrecioServicio(publicacion.precio)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                        · {modalidadLabel(publicacion.modalidad)}
                    </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <MapPin className="w-[11px] h-[11px]" strokeWidth={1.75} />
                    {distanciaTiempo}
                </div>
            </div>
        </article>
    );
}

export default CardServicio;
