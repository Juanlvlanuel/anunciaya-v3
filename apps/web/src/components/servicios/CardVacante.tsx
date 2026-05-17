/**
 * CardVacante.tsx
 * =================
 * Card del feed cuando `tipo='vacante-empresa'` — negocio con vacante de empleo.
 *
 * Layout: banda superior sky-50 con logo + badge "Verificado" + bloque blanco
 * con título de la vacante, salario y zona. Sin foto del trabajo (la identidad
 * de marca lleva el peso visual).
 *
 * Ubicación: apps/web/src/components/servicios/CardVacante.tsx
 */

import { Briefcase, Check } from 'lucide-react';
import type {
    PublicacionServicio,
    OferenteServicio,
} from '../../types/servicios';
import { formatearPrecioServicio } from '../../utils/servicios';

interface CardVacanteProps {
    publicacion: PublicacionServicio;
    /** Empresa publicadora (BS Vacantes, Sprint 8). */
    empresa?: Pick<OferenteServicio, 'nombre' | 'avatarUrl'>;
    /** Si true, muestra el badge "Verificado". Default true. */
    verificada?: boolean;
    onClick?: () => void;
}

export function CardVacante({
    publicacion,
    empresa,
    verificada = true,
    onClick,
}: CardVacanteProps) {
    const nombreEmpresa = empresa?.nombre ?? 'Empresa';
    const iniciales = empresa?.nombre
        ? empresa.nombre
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s.charAt(0).toUpperCase())
              .join('')
        : '··';
    const zona = publicacion.zonasAproximadas[0] ?? publicacion.ciudad.split(',')[0];

    return (
        <article
            data-testid={`card-vacante-${publicacion.id}`}
            onClick={onClick}
            className="rounded-2xl overflow-hidden bg-white border border-sky-200 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
            <div className="bg-sky-50 px-3 py-4 flex flex-col items-center relative">
                <div className="w-12 h-12 rounded-xl bg-white border border-sky-100 grid place-items-center text-sky-700 font-extrabold text-base shadow-sm overflow-hidden">
                    {empresa?.avatarUrl ? (
                        <img
                            src={empresa.avatarUrl}
                            alt={nombreEmpresa}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        iniciales
                    )}
                </div>
                <div className="mt-1.5 text-[11px] font-semibold text-slate-700 truncate max-w-full">
                    {nombreEmpresa}
                </div>
                {verificada && (
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-bold">
                        <Check className="w-[9px] h-[9px]" strokeWidth={3} />
                        Verificado
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">
                    {publicacion.titulo}
                </div>
                <div className="mt-1.5">
                    <span className="text-[15px] font-extrabold text-slate-900">
                        {formatearPrecioServicio(publicacion.precio)}
                    </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wider">
                        <Briefcase className="w-[10px] h-[10px]" strokeWidth={1.75} />
                        Vacante
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 truncate">
                        {zona}
                    </span>
                </div>
            </div>
        </article>
    );
}

export default CardVacante;
