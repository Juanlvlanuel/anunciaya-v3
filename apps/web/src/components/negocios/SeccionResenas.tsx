/**
 * ============================================================================
 * COMPONENTE: SeccionResenas
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/SeccionResenas.tsx
 *
 * Diseño moderno con panel de rating + barras de distribución + cards de
 * reseñas con acento dorado. Estilo inspirado en Google/Booking.
 */

import { useState, useEffect, useMemo } from 'react';
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
    sucursalNombre?: string | null;
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

  // Distribución de ratings por estrellas (5 → 1)
  const distribucion = useMemo(() => {
    return [5, 4, 3, 2, 1].map((estrellas) => {
      const count = resenas.filter((r) => r.rating === estrellas).length;
      const pct = resenas.length > 0 ? (count / resenas.length) * 100 : 0;
      return { estrellas, count, pct };
    });
  }, [resenas]);

  // Últimas 5 reseñas para el carrusel
  const ultimasResenas = useMemo(() => resenas.slice(0, 5), [resenas]);
  const tieneResenas = resenas.length > 0;

  // Carrusel automático vertical (cambia cada 5s si hay más de 1)
  const [carruselIdx, setCarruselIdx] = useState(0);
  useEffect(() => {
    if (ultimasResenas.length <= 1) return;
    const interval = setInterval(() => {
      setCarruselIdx((i) => (i + 1) % ultimasResenas.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ultimasResenas.length]);

  const resenaActual = ultimasResenas[carruselIdx] ?? ultimasResenas[0];

  const handleEscribirResena = async () => {
    setResenaEditando(null);
    await onEscribirResena?.();
    setModalEscribirAbierto(true);
  };

  const handleEditarResena = (resena: Resena) => {
    setModalAbierto(false);
    setResenaEditando({ id: resena.id, rating: resena.rating, texto: resena.texto });
    setModalEscribirAbierto(true);
  };

  const handleCerrarEscribir = () => {
    setModalEscribirAbierto(false);
    setResenaEditando(null);
    onResenaDestacadaVista?.();
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-md lg:pb-0 2xl:pb-0">
        {/* ═══════════ HEADER DORADO ═══════════ */}
        <div
          className="flex items-center justify-between px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 text-white"
          style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #d4a017 100%)' }}
        >
          <h2 className="flex items-center gap-2 text-lg lg:text-base 2xl:text-lg font-bold tracking-tight">
            <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 fill-white" strokeWidth={0} />
            <span>Reseñas</span>
            <span className="text-sm lg:text-[11px] 2xl:text-sm text-yellow-100 font-semibold">
              ({resenas.length})
            </span>
            {promedioRating !== undefined && resenas.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/25 backdrop-blur-sm rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold">
                {promedioRating.toFixed(1)}
              </span>
            )}
          </h2>
          {onEscribirResena && (
            <button
              onClick={handleEscribirResena}
              className="flex items-center gap-1.5 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 bg-white text-yellow-700 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-bold cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
              Escribir
            </button>
          )}
        </div>

        {/* ═══════════ CONTENIDO ═══════════ */}
        {tieneResenas ? (
          <div className="p-3 lg:p-3 2xl:p-4">
            {/* Layout PC: stats + reseñas horizontales | Móvil: apilado */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 2xl:gap-5">
              {/* Panel de estadísticas */}
              <div className="lg:w-[340px] 2xl:w-[380px] shrink-0 flex gap-3 lg:gap-2 2xl:gap-3 items-center">
                {/* Rating prominente */}
                <div className="text-center shrink-0 flex flex-col items-center justify-center w-24 lg:w-20 2xl:w-24">
                  <div className="text-4xl lg:text-3xl 2xl:text-4xl font-black text-slate-800 leading-none">
                    {promedioRating?.toFixed(1) ?? '—'}
                  </div>
                  <div className="flex gap-0.5 mt-1.5 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${
                          promedioRating && s <= Math.round(promedioRating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'fill-slate-200 text-slate-200'
                        }`}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                    {resenas.length} {resenas.length === 1 ? 'reseña' : 'reseñas'}
                  </span>
                </div>

                {/* Barras de distribución */}
                <div className="flex-1 flex flex-col justify-center gap-1 lg:gap-0.5 2xl:gap-1">
                  {distribucion.map(({ estrellas, count, pct }) => (
                    <div key={estrellas} className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                      <span className="w-3 text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 shrink-0">
                        {estrellas}
                      </span>
                      <Star
                        className="w-3 h-3 fill-yellow-500 text-yellow-500 shrink-0"
                        strokeWidth={0}
                      />
                      <div className="flex-1 h-2 lg:h-1.5 2xl:h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #facc15 0%, #eab308 50%, #ca8a04 100%)',
                          }}
                        />
                      </div>
                      <span className="w-8 lg:w-6 2xl:w-8 text-right text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 shrink-0 tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divisor vertical (solo PC) */}
              <div className="hidden lg:block w-px bg-slate-300 shrink-0" />

              {/* Carrusel vertical automático — 1 reseña visible, rota cada 5s */}
              <div className="flex-1 min-w-0">
                <div className="relative h-full min-h-[160px] lg:min-h-[150px] 2xl:min-h-[170px] bg-white border-2 border-slate-300 rounded-xl p-3 lg:p-3 2xl:p-4 overflow-hidden flex flex-col">
                  {/* Animación vertical en cada cambio usando key */}
                  <div
                    key={resenaActual.id}
                    className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-500"
                  >
                    {/* Header: avatar + nombre/fecha + rating */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 rounded-full bg-yellow-100 ring-2 ring-yellow-300 flex items-center justify-center shrink-0 overflow-hidden">
                        {resenaActual.autor.avatarUrl ? (
                          <img
                            src={resenaActual.autor.avatarUrl}
                            alt={resenaActual.autor.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-yellow-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base lg:text-sm 2xl:text-base text-slate-900 truncate">
                          {resenaActual.autor.nombre}
                        </p>
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                          {formatearFecha(resenaActual.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-900 tabular-nums">
                          {resenaActual.rating?.toFixed(1) ?? '—'}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 ${
                                resenaActual.rating && s <= resenaActual.rating
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'fill-slate-200 text-slate-200'
                              }`}
                              strokeWidth={0}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Texto */}
                    {resenaActual.texto && (
                      <p className="mt-2 text-sm lg:text-[13px] 2xl:text-sm font-medium text-slate-700 leading-snug line-clamp-3">
                        {resenaActual.texto}
                      </p>
                    )}
                  </div>

                  {/* Footer: dots + "Ver todas" abajo a la derecha */}
                  <div className="mt-2 pt-2 border-t border-slate-300 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      {ultimasResenas.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCarruselIdx(i);
                          }}
                          className={`h-1.5 rounded-full transition-all ${
                            i === carruselIdx
                              ? 'w-5 bg-yellow-500'
                              : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                          aria-label={`Ir a reseña ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalAbierto(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-bold text-white cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                    >
                      Ver todas ({resenas.length})
                      <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Estado vacío */
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center ring-2 ring-yellow-200">
              <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" strokeWidth={0} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              ¡Sé el primero en opinar!
            </h3>
            <p className="text-sm font-medium text-slate-600 mb-3">
              Comparte tu experiencia
            </p>
            {onEscribirResena && (
              <button
                onClick={handleEscribirResena}
                className="inline-flex items-center gap-2 px-4 py-2 text-white font-bold rounded-lg cursor-pointer active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
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

export default SeccionResenas;
