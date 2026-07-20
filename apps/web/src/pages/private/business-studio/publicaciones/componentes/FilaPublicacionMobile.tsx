/**
 * FilaPublicacionMobile.tsx
 * ============================
 * Fila de publicación para vista móvil (< lg) — patrón "tabla unida" (mismo
 * que Promociones/Empleados en BS): el padre agrupa las filas en un solo
 * contenedor con `divide-y`, en vez de cards sueltas con borde/sombra/margen
 * individual cada una. Calca `FilaMovilOferta` (PaginaOfertas.tsx).
 *
 * Tokens: título `text-base font-bold`, texto secundario `text-sm`, pills
 * `text-sm font-bold` (mismo `CLASES_PILL_BASE` que el resto de BS). La fila
 * de stats+acciones (Vistas/Comentarios/Ver/Archivar) calca el tamaño real
 * de Catálogo/Promociones (`w-6 h-6`, sin fondo ni padding en las acciones —
 * ver `PaginaCatalogo.tsx` bloque "Stats + Acciones"), no el `w-4/w-5` que
 * se usó aquí en un primer intento.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/componentes/FilaPublicacionMobile.tsx
 */

import { Archive, Eye, ExternalLink, MessageCircle, Newspaper } from 'lucide-react';
import { formatearTiempoRelativo } from '../../../../../utils/marketplace';
import { PillEstadoPublicacion } from './PublicacionAtoms';
import type { PublicacionNegocioBSRow } from '../../../../../types/negocioPublicaciones';

interface FilaPublicacionMobileProps {
    publicacion: PublicacionNegocioBSRow;
    onEditar: () => void;
    onArchivar: () => void;
    onVerEnFeedPublico: () => void;
}

export function FilaPublicacionMobile({
    publicacion,
    onEditar,
    onArchivar,
    onVerEnFeedPublico,
}: FilaPublicacionMobileProps) {
    const fotoPortada = publicacion.fotos[publicacion.fotoPortadaIndex] ?? publicacion.fotos[0];

    const stopPropagation = (ev: React.MouseEvent<HTMLButtonElement>, handler: () => void) => {
        ev.stopPropagation();
        handler();
    };

    return (
        <div
            onClick={onEditar}
            className="w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50"
            data-testid={`fila-publicacion-movil-${publicacion.id}`}
        >
            {/* Imagen */}
            <div className="w-[76px] h-[76px] rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0 overflow-hidden">
                {fotoPortada ? (
                    <img src={fotoPortada} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Newspaper className="w-8 h-8" strokeWidth={1.75} />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-slate-800 truncate">{publicacion.texto}</span>
                    <div className="shrink-0">
                        <PillEstadoPublicacion estado={publicacion.estado} />
                    </div>
                </div>
                <span className="text-sm text-slate-600 font-medium truncate">
                    {publicacion.sucursalNombre} · {formatearTiempoRelativo(publicacion.createdAt)}
                </span>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-lg font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <Eye className="w-6 h-6" />
                            {publicacion.totalVistas}
                        </span>
                        <span className="w-px h-4 bg-slate-400" />
                        <span className="flex items-center gap-1.5">
                            <MessageCircle className="w-6 h-6" />
                            {publicacion.totalComentarios}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onVerEnFeedPublico)}
                            aria-label="Ver en el feed público"
                            className="cursor-pointer text-slate-600"
                            data-testid={`btn-ver-feed-movil-${publicacion.id}`}
                        >
                            <ExternalLink className="w-6 h-6" />
                        </button>
                        {publicacion.estado === 'activa' && (
                            <button
                                type="button"
                                onClick={(ev) => stopPropagation(ev, onArchivar)}
                                aria-label="Archivar"
                                className="cursor-pointer text-red-600"
                                data-testid={`btn-archivar-movil-${publicacion.id}`}
                            >
                                <Archive className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
