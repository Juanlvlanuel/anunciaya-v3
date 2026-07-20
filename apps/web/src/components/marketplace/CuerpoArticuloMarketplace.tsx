/**
 * CuerpoArticuloMarketplace.tsx
 * ===============================
 * Cuerpo de un artículo de MarketPlace SIN el header (ver
 * `HeaderArticuloMarketplace.tsx`): título, precio, chips (categoría,
 * condición, acepta ofertas, urgente), descripción completa, galería y
 * contador de vistas. Puramente presentacional.
 *
 * Mismo contenido que muestra `CardArticuloFeed.tsx` en su cuerpo, pero
 * extraído aparte para reusarse en el modal de comentarios de escritorio
 * (`ModalComentariosMarketplace.tsx`), donde el cuerpo scrollea junto con
 * los comentarios.
 *
 * Ubicación: apps/web/src/components/marketplace/CuerpoArticuloMarketplace.tsx
 */

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { GaleriaArticulo } from './GaleriaArticulo';
import { etiquetaPrecioArticulo } from '../../utils/marketplace';
import type { ArticuloMarketplaceDetalle } from '../../types/marketplace';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;

const ETIQUETA_CONDICION: Record<string, string> = {
    nuevo: 'Nuevo',
    seminuevo: 'Seminuevo',
    usado: 'Usado',
    para_reparar: 'Para reparar',
};

interface CuerpoArticuloMarketplaceProps {
    articulo: ArticuloMarketplaceDetalle;
}

export function CuerpoArticuloMarketplace({ articulo }: CuerpoArticuloMarketplaceProps) {
    const condicionLabel = articulo.condicion
        ? (ETIQUETA_CONDICION[articulo.condicion] ?? articulo.condicion)
        : null;
    const fotos = articulo.fotos ?? [];

    return (
        <>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {articulo.titulo}
            </h3>

            <div className="flex items-baseline gap-2">
                {articulo.modo === 'busco' && (
                    <span className="self-center rounded-md bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700">
                        Se busca
                    </span>
                )}
                <span className="text-2xl font-extrabold text-teal-700">
                    {etiquetaPrecioArticulo(articulo)}
                </span>
                {articulo.modo !== 'busco' && articulo.unidadVenta && (
                    <span className="text-lg font-semibold text-teal-700/80 lg:text-xl">
                        {articulo.unidadVenta}
                    </span>
                )}
            </div>

            {(articulo.categoriaNombre
                || condicionLabel
                || articulo.aceptaOfertas
                || (articulo.modo === 'busco' && articulo.urgente)) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {articulo.categoriaNombre && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                            {articulo.categoriaNombre}
                        </span>
                    )}
                    {articulo.modo === 'busco'
                        ? articulo.urgente && (
                              <span className="rounded-md bg-red-100 px-2 py-0.5 text-sm font-bold text-red-600">
                                  Urgente
                              </span>
                          )
                        : (
                              <>
                                  {articulo.aceptaOfertas && (
                                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-700">
                                          Acepta ofertas
                                      </span>
                                  )}
                                  {condicionLabel && (
                                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-sm font-medium text-slate-700">
                                          {condicionLabel}
                                      </span>
                                  )}
                              </>
                          )}
                </div>
            )}

            {articulo.descripcion && (
                <p className="text-[15px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {articulo.descripcion}
                </p>
            )}

            <GaleriaArticulo fotos={fotos} titulo={articulo.titulo} fotoPortadaIndex={articulo.fotoPortadaIndex} />

            <div className="flex items-center gap-1.5 text-base text-slate-600 font-semibold">
                <Eye className="h-5 w-5" />
                {articulo.totalVistas} vistas
            </div>
        </>
    );
}

export default CuerpoArticuloMarketplace;
