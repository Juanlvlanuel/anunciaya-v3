/**
 * ============================================================================
 * COMPONENTE: SeccionResenas
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/SeccionResenas.tsx
 *
 * Diseño moderno estilo Google/Yelp - Compacto con modal para ver más
 */

import { useState, useEffect } from 'react';
import {
  Star,
  ChevronRight,
  Plus,
  User,
} from 'lucide-react';
import { ModalResenas } from './ModalResenas';
import { ModalEscribirResena } from './ModalEscribirResena';

// =============================================================================
// TIPOS
// =============================================================================

interface Resena {
  id: string;
  rating: number | null;
  texto: string | null;
  createdAt: string | null;
  autor: {
    id: string;
    nombre: string;
    avatarUrl: string | null;
  };
  likes?: number;
  tieneRespuesta?: boolean;
  respuestaNegocio?: {
    texto: string;
    fecha: string;
    negocioNombre: string;
    negocioLogo: string | null;
  } | null;
}

interface SeccionResenasProps {
  resenas: Resena[];
  promedioRating?: number;
  tieneCompraVerificada?: boolean;
  resenaDestacadaId?: string | null;
  onResenaDestacadaVista?: () => void;
  onEscribirResena?: () => Promise<void> | void;
  onEnviarResena?: (rating: number, texto: string) => void;
  onEditarResena?: (resenaId: string, rating: number, texto: string) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const RESENAS_PREVIEW = 3; // Mostrar 3 en el preview (ancho completo)

// =============================================================================
// HELPERS
// =============================================================================

const formatearFecha = (fecha: string | null): string => {
  if (!fecha) return '';
  const ahora = new Date();
  const fechaResena = new Date(fecha);
  const diffMs = ahora.getTime() - fechaResena.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `hace ${diffDias}d`;
  if (diffDias < 30) return `hace ${Math.floor(diffDias / 7)}sem`;
  if (diffDias < 365) return `hace ${Math.floor(diffDias / 30)}m`;
  return `hace ${Math.floor(diffDias / 365)}a`;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionResenas({
  resenas,
  promedioRating,
  tieneCompraVerificada,
  resenaDestacadaId,
  onResenaDestacadaVista,
  onEscribirResena,
  onEnviarResena,
  onEditarResena,
}: SeccionResenasProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resenaEditando, setResenaEditando] = useState<{
    id: string;
    rating: number | null;
    texto: string | null;
  } | null>(null);
  const [modalEscribirAbierto, setModalEscribirAbierto] = useState(false);

  useEffect(() => {
    if (resenaDestacadaId) {
      if (resenas.length > 0) {
        setModalAbierto(true);
      } else if (resenaDestacadaId === 'abrir') {
        setModalEscribirAbierto(true);
      }
    }
  }, [resenaDestacadaId, resenas]);

  // Preview de las primeras reseñas
  const resenasPreview = resenas.slice(0, RESENAS_PREVIEW);
  const tieneResenas = resenas.length > 0;
  const hayMasResenas = resenas.length > RESENAS_PREVIEW;

  // Abrir modal escribir nueva reseña (espera verificación de compra)
  const handleEscribirResena = async () => {
    setResenaEditando(null);
    await onEscribirResena?.();
    setModalEscribirAbierto(true);
  };

  // Abrir modal editar reseña existente
  const handleEditarResena = (resena: Resena) => {
    setModalAbierto(false); // Cerrar modal de lista
    setResenaEditando({ id: resena.id, rating: resena.rating, texto: resena.texto });
    setModalEscribirAbierto(true);
  };

  // Cerrar modal escribir/editar
  const handleCerrarEscribir = () => {
    setModalEscribirAbierto(false);
    setResenaEditando(null);
    onResenaDestacadaVista?.();
  };

  return (
    <>
      <div className="space-y-3 lg:space-y-2 2xl:space-y-3">
        {/* Header con degradado */}
        <div
          className="flex items-center justify-between bg-linear-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:via-amber-500 hover:to-yellow-500 text-white rounded-xl px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 cursor-pointer transition-all"
          onClick={() => tieneResenas && setModalAbierto(true)}
        >
          <h2 className="flex items-center gap-2 text-lg lg:text-base 2xl:text-lg font-semibold">
            <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 fill-current" />
            <span>Reseñas</span>
            <span className="text-sm font-normal text-amber-100">({resenas.length})</span>
            {promedioRating && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-sm font-bold">
                {promedioRating.toFixed(1)}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Botón escribir reseña - discreto */}
            {onEscribirResena && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEscribirResena();
                }}
                className="flex items-center gap-1 px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 bg-white hover:bg-amber-50 text-amber-500 rounded-lg text-xs lg:text-xs 2xl:text-xs font-medium transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                <span className="hidden lg:inline">Escribir</span>
              </button>
            )}
            {tieneResenas && (
              <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110">
                <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        {tieneResenas ? (
          <div className="space-y-2">
            {/* Preview de reseñas - Grid 2 columnas en PC */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3 2xl:gap-3">
              {resenasPreview.map((resena) => (
                <CardResenaCompacta
                  key={resena.id}
                  resena={resena}
                  onClick={() => setModalAbierto(true)}
                />
              ))}
            </div>

            {/* Botón ver más */}
            {hayMasResenas && (
              <button
                onClick={() => setModalAbierto(true)}
                className="w-full py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                Ver todas las reseñas ({resenas.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* Estado vacío - Compacto */
          <div className="bg-amber-50 rounded-xl p-6 text-center border border-amber-200">
            <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              ¡Sé el primero en opinar!
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Comparte tu experiencia
            </p>
            {onEscribirResena && (
              <button
                onClick={handleEscribirResena}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Escribir reseña
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de todas las reseñas */}
      <ModalResenas
        abierto={modalAbierto}
        onCerrar={() => {
          setModalAbierto(false);
          onResenaDestacadaVista?.();
        }}
        resenas={resenas}
        promedioRating={promedioRating}
        onEscribirResena={handleEscribirResena}
        onEditarResena={handleEditarResena}
        resenaDestacadaId={resenaDestacadaId}
      />

      {/* Modal escribir / editar reseña */}
      <ModalEscribirResena
        abierto={modalEscribirAbierto}
        onCerrar={handleCerrarEscribir}
        tieneCompraVerificada={tieneCompraVerificada}
        onEnviar={onEnviarResena}
        resenaEditar={resenaEditando}
        onEditar={onEditarResena}
      />
    </>
  );
}

// =============================================================================
// COMPONENTE: CardResenaCompacta
// =============================================================================

interface CardResenaCompactaProps {
  resena: Resena;
  onClick?: () => void;
}

function CardResenaCompacta({ resena, onClick }: CardResenaCompactaProps) {
  return (
    <div
      className="flex flex-col gap-0 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {resena.autor.avatarUrl ? (
            <img
              src={resena.autor.avatarUrl}
              alt={resena.autor.nombre}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Header: nombre + fecha */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-medium text-slate-900 text-sm truncate">
              {resena.autor.nombre}
            </span>
            <span className="text-xs text-slate-400 shrink-0">
              {formatearFecha(resena.createdAt)}
            </span>
          </div>

          {/* Estrellas */}
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${resena.rating && star <= resena.rating
                  ? 'text-amber-400 fill-current'
                  : 'text-slate-200'
                  }`}
              />
            ))}
          </div>

          {/* Texto */}
          {resena.texto && (
            <p className="text-sm text-slate-600 line-clamp-2">{resena.texto}</p>
          )}
        </div>
      </div>

      {/* Respuesta del negocio */}
      {resena.respuestaNegocio && (
        <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            {resena.respuestaNegocio.negocioLogo ? (
              <img
                src={resena.respuestaNegocio.negocioLogo}
                alt={resena.respuestaNegocio.negocioNombre}
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                {resena.respuestaNegocio.negocioNombre?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-blue-700 truncate">
              {resena.respuestaNegocio.negocioNombre}
            </span>
            <span className="text-[10px] text-blue-400 ml-auto shrink-0">
              {formatearFecha(resena.respuestaNegocio.fecha)}
            </span>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2">{resena.respuestaNegocio.texto}</p>
        </div>
      )}
    </div>
  );
}

export default SeccionResenas;