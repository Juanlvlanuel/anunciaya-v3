/**
 * CardOfertaCarrusel.tsx
 * =======================
 * Card chica para los carruseles autoplay del feed editorial.
 *
 * Lenguaje visual coherente con `CardOfertaHero` variante 'destacado':
 *  - Cinta ámbar superior (`border-t-[2px] border-t-amber-500`).
 *  - Pill de descuento sobre la foto, esquina sup. izquierda (negro, bold).
 *  - Pill flotante NUEVA / POPULAR en sup. derecha cuando aplica.
 *  - Logo circular del negocio flotando entre la foto y el panel inferior
 *    (se monta sobre el borde, mismo patrón de "ring-amber-400/40" de Hero).
 *  - Eyebrow ámbar bold con el nombre del negocio.
 *  - Distancia en uppercase ámbar (acento).
 *  - Microseñal "Vence en X" en el footer cuando es urgente.
 *  - Hover: foto scale + sombra.
 *
 * Ancho fijo: 200/220/240 (móvil/lg/2xl) — el padre `BloqueCarruselAuto`
 * controla el track horizontal con animación de loop infinito.
 *
 * Ubicación: apps/web/src/components/ofertas/CardOfertaCarrusel.tsx
 */

import { useRef } from 'react';
import { Tag, Store, MapPin, Eye } from 'lucide-react';
import { useViewTracker } from '@/hooks/useViewTracker';
import { registrarVistaOferta } from '@/services/ofertasService';
import type { OfertaFeed } from '@/types/ofertas';

interface CardOfertaCarruselProps {
  oferta: OfertaFeed;
  microsenal?: 'vence_pronto' | 'nueva' | 'popular' | null;
  onClick: () => void;
}

// =============================================================================
// HELPERS LOCALES
// =============================================================================

function getValorNumerico(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function getBadgeTexto(oferta: OfertaFeed): string {
  const n = getValorNumerico(oferta.valor);
  switch (oferta.tipo) {
    case 'porcentaje':
      return `${n ?? 0}%`;
    case 'monto_fijo':
      return `$${n ?? 0}`;
    case '2x1':
      return '2×1';
    case '3x2':
      return '3×2';
    case 'envio_gratis':
      return 'Envío';
    case 'otro':
      return oferta.valor && Number.isNaN(Number(oferta.valor))
        ? oferta.valor
        : 'Oferta';
    default:
      return 'Oferta';
  }
}

function formatDistancia(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Días calendario hasta fechaFin, normalizando ambas fechas a medianoche
 * local. Mismo criterio que `ModalOfertaDetalle` y `CardOfertaHero` —
 * evita el off-by-one por horas parciales.
 */
function diasCalendarioRestantes(fechaFin: string): number {
  const fin = new Date(fechaFin);
  if (Number.isNaN(fin.getTime())) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  const diff = Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

function textoMicrosenal(
  m: 'vence_pronto' | 'nueva' | 'popular' | null | undefined,
  fechaFin: string,
): string | null {
  switch (m) {
    case 'vence_pronto': {
      const dias = diasCalendarioRestantes(fechaFin);
      if (dias === 0) return 'Vence hoy';
      if (dias === 1) return 'Vence mañana';
      // Para urgencia <24h dentro del mismo día calendario podríamos mostrar
      // horas, pero `vence_pronto` se asigna en frontend por umbral de 48h
      // contra fecha_fin local; mostrar días es consistente con el resto.
      return `Vence en ${dias} d`;
    }
    case 'nueva':
      return 'Nueva';
    case 'popular':
      return 'Popular';
    default:
      return null;
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CardOfertaCarrusel({
  oferta,
  microsenal,
  onClick,
}: CardOfertaCarruselProps) {
  const badge = getBadgeTexto(oferta);
  const distancia = formatDistancia(oferta.distanciaKm);
  const senal = textoMicrosenal(microsenal, oferta.fechaFin);

  // Tracking de vista (impression): cuando ≥50% de la card está visible
  // por ≥1s, registramos la vista. El backend deduplica por (oferta, user, día).
  const refCard = useRef<HTMLButtonElement>(null);
  useViewTracker(refCard, {
    onVisto: () => {
      registrarVistaOferta(oferta.ofertaId).catch(() => { /* silent */ });
    },
  });

  // Pill flotante en esquina sup. derecha.
  const pillFlotante: 'NUEVA' | 'POPULAR' | null =
    microsenal === 'nueva' ? 'NUEVA'
    : microsenal === 'popular' ? 'POPULAR'
    : null;

  return (
    <button
      ref={refCard}
      data-testid={`card-carrusel-${oferta.ofertaId}`}
      onClick={onClick}
      className="group block w-[200px] lg:w-[220px] 2xl:w-[240px] shrink-0 text-left cursor-pointer bg-white border-2 border-[#e8e6e0] border-t-[2px] border-t-amber-500 rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:shadow-amber-500/10 transition-shadow duration-300"
    >
      {/* ── Foto cuadrada ─────────────────────────────────────────────── */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#e8e6e0]">
        {oferta.imagen ? (
          <img
            src={oferta.imagen}
            alt={oferta.titulo}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag className="w-7 h-7 text-[#b8b4a8]" strokeWidth={2} />
          </div>
        )}

        {/* Pill descuento — esquina sup. izquierda */}
        <span className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-md bg-[#1a1a1a] text-white text-xs font-extrabold tabular-nums shadow-md">
          {badge}
        </span>

        {/* Pill flotante NUEVA / POPULAR — esquina sup. derecha */}
        {pillFlotante && (
          <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold tracking-[0.5px] shadow-sm">
            {pillFlotante}
          </span>
        )}

      </div>

      {/* ── Panel inferior con logo flotante ──────────────────────────── */}
      <div className="relative px-3 pt-3 pb-3 space-y-1">
        {/* Header: Logo + nombre del negocio en la misma línea (mismo
            patrón que `CardOfertaLista`). */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-white ring-2 ring-[#e8e6e0] shadow-sm flex items-center justify-center">
            {oferta.logoUrl ? (
              <img
                src={oferta.logoUrl}
                alt={oferta.negocioNombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="w-3 h-3 text-[#888]" strokeWidth={2} />
            )}
          </div>
          <span className="text-[14px] lg:text-[15px] font-bold text-[#1a1a1a] tracking-tight truncate leading-tight">
            {oferta.negocioNombre}
          </span>
        </div>

        {/* Título de la oferta — `min-h` reserva siempre 2 líneas de espacio
            para que TODAS las cards del carrusel tengan la misma altura,
            sin importar si el título es corto (1 línea) o largo (2 líneas). */}
        <h4 className="text-sm lg:text-base font-extrabold text-[#1a1a1a] line-clamp-2 leading-snug tracking-tight min-h-[2.75rem] lg:min-h-[2.75rem]">
          {oferta.titulo}
        </h4>

        {/* Footer: distancia (izq) + vistas pill (der), misma línea. */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 truncate text-[13px] lg:text-sm">
            {distancia && (
              <span className="inline-flex items-center gap-1 text-amber-600 uppercase font-bold tracking-[0.5px]">
                <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                {distancia}
              </span>
            )}
            {distancia && senal && (
              <span className="text-[#c8c4bc]">·</span>
            )}
            {senal && (
              <span className="text-[#6b6b6b] font-medium truncate">
                {senal}
              </span>
            )}
          </div>
          {/* Pill de vistas — alineado a la derecha en la misma línea
              que la distancia. Estilo dark "live count" consistente con
              el de la card hero (sobre la imagen). */}
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1a] text-white text-[12px] lg:text-[13px] font-bold tabular-nums leading-none shadow-sm"
            title={`${oferta.totalVistas} ${oferta.totalVistas === 1 ? 'vista' : 'vistas'}`}
          >
            <Eye
              className="w-3.5 h-3.5 shrink-0"
              strokeWidth={2.5}
              fill="currentColor"
              fillOpacity={0.25}
            />
            {oferta.totalVistas}
          </span>
        </div>
      </div>
    </button>
  );
}
