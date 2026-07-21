/**
 * HeaderPublicacionServicio.tsx
 * ================================
 * Header de una publicación de Servicios: avatar/logo (click → expande en
 * grande), nombre (click → perfil del oferente o del negocio) y tiempo
 * relativo. Mismo patrón visual que el header de `CardServicioFeed.tsx`,
 * extraído aparte para poder fijarlo en el header del modal de comentarios
 * en escritorio (`ModalComentariosServicio.tsx`). Calcado de
 * `HeaderArticuloMarketplace.tsx`.
 *
 * Universal para los 3 tipos: vacante-empresa muestra logo+nombre del
 * negocio; servicio-persona/solicito muestran avatar+nombre del oferente.
 *
 * Ubicación: apps/web/src/components/servicios/HeaderPublicacionServicio.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Store } from 'lucide-react';
import { ModalImagenes } from '../ui/ModalImagenes';
import { formatearTiempoRelativo } from '../../utils/servicios';
import type { PublicacionDetalle } from '../../types/servicios';

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

interface HeaderPublicacionServicioProps {
    publicacion: PublicacionDetalle;
}

export function HeaderPublicacionServicio({ publicacion }: HeaderPublicacionServicioProps) {
    const navigate = useNavigate();
    const [avatarAbierto, setAvatarAbierto] = useState(false);

    const esVacante = publicacion.tipo === 'vacante-empresa';
    const nombreOferente = `${publicacion.oferente.nombre} ${publicacion.oferente.apellidos}`.trim();
    const iniciales = obtenerIniciales(publicacion.oferente.nombre, publicacion.oferente.apellidos);
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);

    const nombreHeader = esVacante ? (publicacion.negocioNombre ?? 'Negocio') : nombreOferente;
    const avatarHeader = esVacante ? publicacion.negocioLogo ?? null : publicacion.oferente.avatarUrl;

    const irAlPerfil = () => {
        if (esVacante) {
            if (publicacion.sucursalId) navigate(`/negocios/${publicacion.sucursalId}`);
            return;
        }
        navigate(`/servicios/usuario/${publicacion.oferente.id}`);
    };

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                data-testid="avatar-oferente-publicacion-servicio"
                onClick={() => avatarHeader && setAvatarAbierto(true)}
                aria-label="Ver avatar en grande"
                className={`shrink-0 ${avatarHeader ? 'lg:cursor-pointer' : ''}`}
            >
                {avatarHeader ? (
                    <img
                        src={avatarHeader}
                        alt={nombreHeader}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200"
                    />
                ) : esVacante ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white ring-2 ring-slate-200">
                        <Store className="h-6 w-6" strokeWidth={2} />
                    </div>
                ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-base font-bold text-white ring-2 ring-slate-200">
                        {iniciales}
                    </div>
                )}
            </button>
            <button
                type="button"
                data-testid="header-oferente-publicacion-servicio"
                onClick={irAlPerfil}
                className="min-w-0 flex-1 text-left lg:cursor-pointer"
            >
                <div className="flex items-center gap-1.5 leading-tight">
                    <span className="truncate text-[17px] font-extrabold text-slate-900 lg:hover:underline">
                        {nombreHeader}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-sky-600 animate-bounceX" strokeWidth={2.5} />
                </div>
                <div className="mt-1 text-sm text-slate-600 font-semibold">
                    {tiempo}
                </div>
            </button>

            {avatarAbierto && avatarHeader && (
                <ModalImagenes
                    images={[avatarHeader]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
        </div>
    );
}

export default HeaderPublicacionServicio;
