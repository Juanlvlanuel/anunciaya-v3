/**
 * OferenteCard.tsx
 * =================
 * Bloque del oferente en el detalle del servicio. Distingue visualmente
 * entre persona física (servicio-persona / solicito) y negocio
 * (vacante-empresa).
 *
 * - Persona: avatar circular gradient sky + nombre + rating placeholder.
 * - Negocio: logo cuadrado con badge "Verificado".
 *
 * Click en el bloque → navegará al perfil del prestador en Sprint 5. Por
 * ahora solo muestra "Ver perfil →" como hint.
 *
 * Ubicación: apps/web/src/components/servicios/OferenteCard.tsx
 */

import { ChevronRight, ShieldCheck } from 'lucide-react';
import type { PublicacionDetalle } from '../../types/servicios';

interface OferenteCardProps {
    publicacion: PublicacionDetalle;
    onClick?: () => void;
}

export function OferenteCard({ publicacion, onClick }: OferenteCardProps) {
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';
    const iniciales = obtenerIniciales(oferente.nombre, oferente.apellidos);
    const nombreCompleto = `${oferente.nombre} ${oferente.apellidos}`.trim();

    return (
        <button
            type="button"
            data-testid="oferente-card"
            onClick={onClick}
            className="mt-4 flex w-full items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 lg:cursor-pointer lg:hover:border-sky-300 lg:hover:bg-sky-50/40 transition text-left"
        >
            {esEmpresa ? (
                <div className="w-12 h-12 rounded-xl bg-white grid place-items-center text-sky-700 font-extrabold border border-sky-100 shrink-0 overflow-hidden">
                    {oferente.avatarUrl ? (
                        <img
                            src={oferente.avatarUrl}
                            alt={nombreCompleto}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        iniciales
                    )}
                </div>
            ) : (
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold shrink-0 overflow-hidden">
                    {oferente.avatarUrl ? (
                        <img
                            src={oferente.avatarUrl}
                            alt={nombreCompleto}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        iniciales
                    )}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-slate-900 truncate">
                        {nombreCompleto}
                    </span>
                    {esEmpresa && (
                        <ShieldCheck
                            className="w-[13px] h-[13px] text-sky-600 shrink-0"
                            strokeWidth={2.5}
                        />
                    )}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    {esEmpresa
                        ? 'Empresa verificada'
                        : oferente.ciudad ?? 'Puerto Peñasco'}
                </div>
            </div>

            <span className="text-[12px] font-semibold text-sky-700 flex items-center gap-1 shrink-0">
                {esEmpresa ? 'Ver negocio' : 'Ver perfil'}
                <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            </span>
        </button>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre ?? '').trim().charAt(0).toUpperCase();
    const b = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || '··';
}

export default OferenteCard;
