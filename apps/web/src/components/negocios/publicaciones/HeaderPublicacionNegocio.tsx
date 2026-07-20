/**
 * HeaderPublicacionNegocio.tsx
 * ===============================
 * Header de una publicación de negocio: avatar (click → expande en grande),
 * nombre de la sucursal (click → perfil), tiempo relativo y badge de
 * distancia. Autocontenido — trae su propio estado para el zoom del avatar.
 *
 * Extraído de `PublicacionNegocioCuerpo.tsx` para poder fijarlo aparte del
 * resto del cuerpo — lo usa `ModalComentariosPublicacionNegocio.tsx` como
 * header sticky del modal en escritorio.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/HeaderPublicacionNegocio.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronRight } from 'lucide-react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { formatearTiempoRelativo } from '../../../utils/marketplace';
import type { PublicacionNegocioDetalle } from '../../../types/negocioPublicaciones';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

/** Mismo formato que CardPublicacionNegocioFeed/CardNegocio: metros si es <1km. */
function formatearDistancia(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface HeaderPublicacionNegocioProps {
    publicacion: PublicacionNegocioDetalle;
}

export function HeaderPublicacionNegocio({ publicacion }: HeaderPublicacionNegocioProps) {
    const navigate = useNavigate();
    const [logoAbierto, setLogoAbierto] = useState(false);
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                data-testid="logo-negocio-publicacion"
                onClick={() => publicacion.sucursalAvatarUrl && setLogoAbierto(true)}
                aria-label="Ver logo en grande"
                className={`shrink-0 ${publicacion.sucursalAvatarUrl ? 'lg:cursor-pointer' : ''}`}
            >
                {publicacion.sucursalAvatarUrl ? (
                    <img
                        src={publicacion.sucursalAvatarUrl}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                    />
                ) : (
                    <div
                        aria-hidden
                        className="h-14 w-14 rounded-full bg-blue-600 grid place-items-center text-white"
                    >
                        <Store className="h-6 w-6" strokeWidth={2} />
                    </div>
                )}
            </button>
            <button
                type="button"
                data-testid="header-negocio-publicacion"
                onClick={() => navigate(`/negocios/${publicacion.sucursalId}`)}
                className="min-w-0 flex-1 text-left lg:cursor-pointer"
            >
                <div className="flex items-center gap-1.5 leading-tight">
                    <span className="truncate text-[17px] font-extrabold text-slate-900 lg:hover:underline">
                        {publicacion.sucursalNombre}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-blue-600 animate-bounceX" strokeWidth={2.5} />
                </div>
                <div className="mt-1 text-sm text-slate-600 font-semibold">
                    {tiempo}
                </div>
            </button>

            {/* Distancia — badge aparte a la orilla derecha, en azul,
                separada del tiempo (mismo patrón que la card del feed). */}
            {publicacion.distanciaKm !== null && (
                <span className="shrink-0 flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-700">
                    <MapPin className="w-3.5 h-3.5" />
                    {formatearDistancia(publicacion.distanciaKm)}
                </span>
            )}

            {logoAbierto && publicacion.sucursalAvatarUrl && (
                <ModalImagenes
                    images={[publicacion.sucursalAvatarUrl]}
                    initialIndex={0}
                    isOpen={logoAbierto}
                    onClose={() => setLogoAbierto(false)}
                />
            )}
        </div>
    );
}

export default HeaderPublicacionNegocio;
