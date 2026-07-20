/**
 * TablaPublicaciones.tsx
 * ========================
 * Tabla densa B2B (desktop) de Publicaciones con filas clickeables.
 * Calca `TablaVacantes.tsx`.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/componentes/TablaPublicaciones.tsx
 */

import { ExternalLink, MessageCircle, Pencil, Archive, Newspaper } from 'lucide-react';
import Tooltip from '../../../../../components/ui/Tooltip';
import { formatearTiempoRelativo } from '../../../../../utils/marketplace';
import { PillEstadoPublicacion } from './PublicacionAtoms';
import type { PublicacionNegocioBSRow } from '../../../../../types/negocioPublicaciones';

interface TablaPublicacionesProps {
    publicaciones: PublicacionNegocioBSRow[];
    onEditar: (publicacion: PublicacionNegocioBSRow) => void;
    onArchivar: (publicacion: PublicacionNegocioBSRow) => void;
    onVerEnFeedPublico: (publicacion: PublicacionNegocioBSRow) => void;
}

// Publicación absorbe el ancho sobrante (minmax(0,1fr)); el resto son columnas
// angostas de ancho fijo para que Vistas..Publicada queden compactas y pegadas
// a Acciones en vez de repartirse por todo el ancho de la tabla.
const COLUMNAS = 'minmax(0,1fr) 90px 130px 110px 110px 120px';

export function TablaPublicaciones({
    publicaciones,
    onEditar,
    onArchivar,
    onVerEnFeedPublico,
}: TablaPublicacionesProps) {
    if (publicaciones.length === 0) {
        return (
            <div
                className="bg-white border-2 border-slate-300 rounded-xl px-5 py-10 text-center text-slate-600 text-sm font-medium"
                data-testid="tabla-publicaciones-vacia"
            >
                No hay publicaciones que coincidan con el filtro.
            </div>
        );
    }

    return (
        <div
            className="rounded-xl overflow-hidden border-2 border-slate-300"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            data-testid="tabla-publicaciones-desktop"
        >
            {/* Header con gradient BS (TC-9) */}
            <div
                className="grid items-center gap-x-4 px-4 lg:px-3 2xl:px-5 py-2 h-12"
                style={{
                    gridTemplateColumns: COLUMNAS,
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                }}
            >
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider">
                    Publicación
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Vistas
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Comentarios
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Estado
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Publicada
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-right">
                    Acciones
                </span>
            </div>

            {/* Body */}
            <div className="bg-white">
                {publicaciones.map((publicacion, idx) => (
                    <FilaPublicacion
                        key={publicacion.id}
                        publicacion={publicacion}
                        indice={idx}
                        onEditar={() => onEditar(publicacion)}
                        onArchivar={() => onArchivar(publicacion)}
                        onVerEnFeedPublico={() => onVerEnFeedPublico(publicacion)}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// FILA
// =============================================================================

interface FilaPublicacionProps {
    publicacion: PublicacionNegocioBSRow;
    indice: number;
    onEditar: () => void;
    onArchivar: () => void;
    onVerEnFeedPublico: () => void;
}

function FilaPublicacion({
    publicacion,
    indice,
    onEditar,
    onArchivar,
    onVerEnFeedPublico,
}: FilaPublicacionProps) {
    const stopPropagation = (
        ev: React.MouseEvent<HTMLButtonElement>,
        handler: () => void,
    ) => {
        ev.stopPropagation();
        handler();
    };

    const fotoPortada = publicacion.fotos[publicacion.fotoPortadaIndex] ?? publicacion.fotos[0];

    return (
        <div
            className={
                'grid items-center gap-x-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5 ' +
                'text-sm lg:text-xs 2xl:text-sm ' +
                'border-b border-slate-300 lg:cursor-pointer hover:bg-slate-200 ' +
                (indice % 2 === 0 ? 'bg-white' : 'bg-slate-100')
            }
            style={{ gridTemplateColumns: COLUMNAS }}
            onClick={onEditar}
            data-testid={`fila-publicacion-${publicacion.id}`}
        >
            {/* Col 1 — Publicación */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0 overflow-hidden">
                    {fotoPortada ? (
                        <img src={fotoPortada} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Newspaper
                            className="w-5 h-5 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5"
                            strokeWidth={1.75}
                        />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{publicacion.texto}</p>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate mt-0.5">
                        {publicacion.sucursalNombre}
                    </p>
                </div>
            </div>

            {/* Col 2 — Vistas */}
            <div className="text-center font-bold tabular-nums text-slate-900">
                {publicacion.totalVistas}
            </div>

            {/* Col 3 — Comentarios */}
            <div className="flex items-center justify-center gap-1 font-bold tabular-nums text-slate-900">
                <MessageCircle className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-slate-400" strokeWidth={2} />
                {publicacion.totalComentarios}
            </div>

            {/* Col 4 — Estado */}
            <div className="flex items-center justify-center">
                <PillEstadoPublicacion estado={publicacion.estado} />
            </div>

            {/* Col 5 — Publicada */}
            <div className="text-center text-slate-800 tabular-nums font-semibold whitespace-nowrap">
                {formatearTiempoRelativo(publicacion.createdAt)}
            </div>

            {/* Col 6 — Acciones (TC-1D: inline, sin border, color semántico directo) */}
            <div className="flex justify-end gap-0.5">
                <Tooltip text="Ver en el feed público">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onVerEnFeedPublico)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 lg:cursor-pointer"
                        data-testid={`btn-ver-feed-${publicacion.id}`}
                    >
                        <ExternalLink className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                </Tooltip>
                <Tooltip text="Editar">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onEditar)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 lg:cursor-pointer"
                        data-testid={`btn-editar-${publicacion.id}`}
                    >
                        <Pencil className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                </Tooltip>
                {publicacion.estado === 'activa' && (
                    <Tooltip text="Archivar">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onArchivar)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 lg:cursor-pointer"
                            data-testid={`btn-archivar-${publicacion.id}`}
                        >
                            <Archive className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
