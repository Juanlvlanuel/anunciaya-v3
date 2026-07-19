/**
 * DetallePublicacionNegocioContenido.tsx
 * =========================================
 * Cuerpo COMPARTIDO del detalle de una publicación de negocio: header
 * clickeable del negocio (logo expande, nombre → perfil), texto completo,
 * precio, galería swipeable de fotos, vistas y comentarios estilo Facebook
 * (reusa `SeccionComentariosPublicacionNegocio`).
 *
 * Encapsula el data-fetching de la publicación a partir de un solo
 * `publicacionId` — el caller solo pone el chrome alrededor (página privada,
 * página pública). Los comentarios los resuelve `SeccionComentariosPublicacionNegocio`
 * por su cuenta (mismo componente que usa el modal del feed).
 *
 * Usado por:
 *  - `PaginaPublicacionNegocio.tsx` (página privada, deep-link — se llega
 *    aquí desde "Ver publicación" en el feed).
 *  - `PaginaPublicacionNegocioPublica.tsx` (página pública, compartir).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/DetallePublicacionNegocioContenido.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Store, ChevronRight } from 'lucide-react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { GaleriaPublicacionNegocio } from './GaleriaPublicacionNegocio';
import { SeccionComentariosPublicacionNegocio } from './SeccionComentariosPublicacionNegocio';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { useGpsStore } from '../../../stores/useGpsStore';
import { formatearTiempoRelativo, formatearPrecio } from '../../../utils/marketplace';
import { usePublicacionNegocio } from '../../../hooks/queries/useNegocioPublicaciones';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

/** Mismo formato que CardPublicacionNegocioFeed/CardNegocio: metros si es <1km. */
function formatearDistancia(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface DetallePublicacionNegocioContenidoProps {
    publicacionId: string;
}

export function DetallePublicacionNegocioContenido({
    publicacionId,
}: DetallePublicacionNegocioContenidoProps) {
    const navigate = useNavigate();
    const [logoAbierto, setLogoAbierto] = useState(false);
    const { latitud, longitud } = useGpsStore();

    const { data: publicacion, isLoading } = usePublicacionNegocio(publicacionId, { latitud, longitud });

    if (isLoading || !publicacion) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const fotos = publicacion.fotos ?? [];
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);

    return (
        <div className="space-y-4" data-testid="detalle-publicacion-negocio">
            {/* Header: logo (click → expande) + nombre (click → perfil) + tiempo. */}
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
            </div>

            {/* Texto completo */}
            <p className="text-[15px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                {publicacion.texto}
            </p>

            {/* Precio */}
            {publicacion.precio && (
                <span className="inline-block text-xl font-extrabold text-blue-700 tabular-nums">
                    {formatearPrecio(publicacion.precio)}
                </span>
            )}

            {/* Galería: foto grande deslizable + thumbnails abajo */}
            <GaleriaPublicacionNegocio fotos={fotos} fotoPortadaIndex={publicacion.fotoPortadaIndex} />

            <div className="flex items-center gap-1.5 text-base text-slate-600 font-semibold">
                <Eye className="h-5 w-5" />
                {publicacion.totalVistas} vistas
            </div>

            {/* ── Comentarios — estilo Facebook, mismo componente que usa el
                modal del feed (sin card por hilo, respuestas colapsadas,
                input sin avatar). ── */}
            <div className="pt-3 border-t-[1.5px] border-slate-300">
                <SeccionComentariosPublicacionNegocio
                    publicacionId={publicacionId}
                    negocioId={publicacion.negocioId}
                    autorUsuarioId={publicacion.autorUsuarioId}
                />
            </div>

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

export default DetallePublicacionNegocioContenido;
