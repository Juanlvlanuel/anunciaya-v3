/**
 * CardArticuloReel.tsx
 * =====================
 * Card compacta del reel horizontal móvil (arriba del feed de MarketPlace).
 * Mismo molde que `CardNegocioReel.tsx` del reel de Negocios — foto arriba
 * (aspect 4:3) + bloque blanco con la info clave + ChatYA centrado abajo —
 * para que ambos reels se sientan del mismo módulo visual. Mismo ancho
 * (`w-44 lg:w-52`).
 *
 * A diferencia de la versión anterior (foto full-bleed con overlay de
 * avatar/nombre/precio encima), acá se prioriza título + precio (identidad
 * del artículo, no del vendedor) — es lo más útil en un carrusel de "recién
 * publicado".
 *
 * Ubicación: apps/web/src/components/marketplace/CardArticuloReel.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatMarketplace } from '../../hooks/useIniciarChatMarketplace';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';
import { formatearPrecio, obtenerFotoPortada } from '../../utils/marketplace';
import type { ArticuloFeedInfinito, ArticuloMarketplaceDetalle } from '../../types/marketplace';

interface CardArticuloReelProps {
    articulo: ArticuloFeedInfinito;
}

export function CardArticuloReel({ articulo }: CardArticuloReelProps) {
    const navigate = useNavigate();
    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);

    // ChatYA — mismo patrón on-demand que `CardArticulo` (variant='glass') y
    // `CardArticuloGuardado`: `ArticuloFeedInfinito` no trae los datos
    // completos del vendedor que pide `useIniciarChatMarketplace`, así que
    // se hace fetch del detalle al presionar el ícono (cacheado por React
    // Query, un segundo click no vuelve a pegarle al backend).
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const qc = useQueryClient();
    const iniciarChatMarketplace = useIniciarChatMarketplace();
    const mostrarChatYA = !!articulo.usuarioId && usuarioActualId !== articulo.usuarioId;

    const handleChatYA = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            const detalle = await qc.fetchQuery({
                queryKey: queryKeys.marketplace.articulo(articulo.id),
                queryFn: async (): Promise<ArticuloMarketplaceDetalle | null> => {
                    const response = await api.get<{
                        success: boolean;
                        data: ArticuloMarketplaceDetalle;
                    }>(`/marketplace/articulos/${articulo.id}`);
                    return response.data.success ? response.data.data : null;
                },
                staleTime: 60 * 1000,
            });
            if (!detalle) {
                notificar.error('No se pudo cargar el artículo');
                return;
            }
            await iniciarChatMarketplace(detalle);
        } catch {
            notificar.error('No se pudo iniciar el chat');
        }
    };

    return (
        <article
            data-testid={`card-reel-${articulo.id}`}
            onClick={() => navigate(`/marketplace/articulo/${articulo.id}`)}
            className="group w-44 shrink-0 cursor-pointer snap-start overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-transform hover:scale-[1.02] lg:w-52 lg:cursor-pointer"
        >
            {/* Foto */}
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200">
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={articulo.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            {/* Info: título + precio */}
            <div className="px-2.5 pt-2.5 text-left">
                <h3 className="truncate text-sm font-bold leading-tight text-slate-900">
                    {articulo.titulo}
                </h3>
                <div className="truncate text-base font-bold leading-tight text-teal-700">
                    {formatearPrecio(articulo.precio)}
                    {articulo.unidadVenta && (
                        <span className="ml-0.5 text-sm font-medium text-teal-700/80">
                            {articulo.unidadVenta}
                        </span>
                    )}
                </div>
            </div>

            {/* ChatYA — centrado horizontalmente */}
            {mostrarChatYA && (
                <div className="flex justify-center px-2.5 pb-2.5 pt-1.5">
                    <button
                        type="button"
                        data-testid={`btn-chatya-card-reel-${articulo.id}`}
                        onClick={handleChatYA}
                        aria-label="Contactar por ChatYA"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                    >
                        <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                    </button>
                </div>
            )}
        </article>
    );
}

export default CardArticuloReel;
