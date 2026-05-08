/**
 * CardOfertaHero.tsx
 * ===================
 * Card grande "boutique editorial" para "Oferta del día" / "Destacado".
 * Foto a sangre + panel BLANCO con info del negocio y la oferta.
 *
 * Variantes:
 *  - 'normal' (default): pill discreto, eyebrow gris, título medium.
 *  - 'destacado': cinta ámbar superior, pill descuento grande con ring
 *    ámbar pulsando + sheen al cargar, eyebrow ámbar bold, título
 *    extrabold más grande, descripción opcional, "vence X" con icono
 *    de urgencia animado (flama flicker), CTA "Ver oferta →".
 *    Reservado para las 2 zonas privilegiadas del feed (par superior).
 *
 * Animaciones (variante destacado):
 *  - Pill descuento: sheen diagonal one-shot al cargar + ring ámbar pulse.
 *  - Flama "Vence X" (cuando ≤2 días): flicker infinito (scale + rotate).
 *  - Hover: imagen scale [1.03], sombra ámbar.
 *
 * Respeta `prefers-reduced-motion` para todas las animaciones.
 *
 * Ubicación: apps/web/src/components/ofertas/CardOfertaHero.tsx
 */

import { memo, useEffect, useId, useRef } from 'react';
import { Tag, Clock, ArrowRight, Store, MapPin, Eye } from 'lucide-react';
import { useViewTracker } from '@/hooks/useViewTracker';
import { registrarVistaOferta } from '@/services/ofertasService';
import type { OfertaFeed } from '@/types/ofertas';

// =============================================================================
// SUBCOMPONENTE: Flama con gradient rojo→naranja→amarillo (SVG inline)
// =============================================================================
//
// Lucide Flame solo soporta `currentColor`, no gradients. Para tener una
// flama con gradient real (rojo abajo → amarillo arriba) inlineamos el path
// de Lucide y aplicamos `fill="url(#gradient)"` con `<defs>` propio.
//
// Cada instancia genera su `id` único con `useId` para no chocar entre
// múltiples cards en la misma página (par superior renderiza 2).

interface FlameRedYellowProps {
  className?: string;
}

function FlameRedYellow({ className }: FlameRedYellowProps) {
  const gradientId = `flame-red-yellow-${useId()}`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fde047" />
        </linearGradient>
      </defs>
      {/* Path original de Lucide `Flame` */}
      <path
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth={1}
        strokeLinejoin="round"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
    </svg>
  );
}

// Flama blanca con contorno rojo — para usarse SOBRE fondos de color
// (pill ámbar/naranja) donde un gradient cálido se confundiría con el
// fondo. El contorno rojo intenso le da definición clara.
function FlameWhiteRed({ className }: FlameRedYellowProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#ffffff"
        stroke="#dc2626"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
    </svg>
  );
}

interface CardOfertaHeroProps {
  oferta: OfertaFeed;
  onClick: () => void;
  /** Variante visual.
   *  - 'normal' (default): tamaños y colores discretos.
   *  - 'destacado': cinta ámbar superior, pill grande con animación,
   *    descripción + CTA, hover con sombra ámbar. Para las 2 zonas
   *    privilegiadas del par superior. */
  variante?: 'normal' | 'destacado';
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
      return '2x1';
    case '3x2':
      return '3x2';
    case 'envio_gratis':
      return 'Envío gratis';
    case 'otro':
      return oferta.valor && Number.isNaN(Number(oferta.valor))
        ? oferta.valor
        : 'Oferta';
    default:
      return 'Oferta';
  }
}

/**
 * Calcula días calendario restantes hasta `fechaFin`, normalizando ambas
 * fechas a medianoche local. Mismo cálculo que `ModalOfertaDetalle` para
 * evitar el off-by-one que producía la versión basada en `Date.now()` con
 * horas parciales (ej: hoy 17:00 → mañana 23:59 daba 2 días en vez de 1).
 */
function diasRestantes(fechaFin: string): number | null {
  const fin = new Date(fechaFin);
  if (Number.isNaN(fin.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  const diff = Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

function formatDistancia(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function textoVence(fechaFin: string): string | null {
  const d = diasRestantes(fechaFin);
  if (d === null) return null;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  return `Vence en ${d} días`;
}

// =============================================================================
// ESTILOS GLOBALES (animaciones de la variante destacado)
// =============================================================================

const STYLES_ID = 'card-oferta-hero-styles';
const STYLES_CSS = `
/* Flama "Vence X" — flicker sutil tipo fuego */
@keyframes hero-flame-flicker {
  0%, 100% { transform: scale(1) rotate(-3deg); opacity: 1; }
  25%      { transform: scale(1.12) rotate(3deg); opacity: 0.92; }
  50%      { transform: scale(0.96) rotate(-2deg); opacity: 1; }
  75%      { transform: scale(1.08) rotate(4deg); opacity: 0.95; }
}
.hero-flame {
  animation: hero-flame-flicker 1500ms ease-in-out infinite;
  transform-origin: center bottom;
  display: inline-block;
}

/* Pill descuento — sheen diagonal one-shot al cargar */
@keyframes hero-pill-sheen {
  0%   { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(250%) skewX(-20deg); }
}
.hero-pill-sheen {
  position: absolute;
  top: 0;
  left: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.35) 50%,
    rgba(255,255,255,0) 100%
  );
  animation: hero-pill-sheen 1500ms ease-out 600ms 1;
  pointer-events: none;
}

/* Ring ámbar del pill — pulsa lento */
@keyframes hero-pill-ring {
  0%, 100% { box-shadow: 0 0 0 2px rgba(251,191,36,0.40), 0 10px 15px -3px rgba(0,0,0,0.1); }
  50%      { box-shadow: 0 0 0 4px rgba(251,191,36,0.60), 0 10px 15px -3px rgba(0,0,0,0.15); }
}
.hero-pill-ring {
  animation: hero-pill-ring 3500ms ease-in-out infinite;
}

/* CTA "Ver oferta →" — flecha que se desliza al hover de la card */
.hero-cta-arrow {
  transition: transform 250ms ease-out;
}
.group:hover .hero-cta-arrow {
  transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
  .hero-flame,
  .hero-pill-sheen,
  .hero-pill-ring,
  .hero-cta-arrow {
    animation: none !important;
    transition: none !important;
  }
}
`;

// =============================================================================
// COMPONENTE
// =============================================================================

function CardOfertaHeroBase({
  oferta,
  onClick,
  variante = 'normal',
}: CardOfertaHeroProps) {
  // Inyectar keyframes una sola vez al montar
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = STYLES_CSS;
    document.head.appendChild(style);
  }, []);

  const badge = getBadgeTexto(oferta);
  const distancia = formatDistancia(oferta.distanciaKm);
  const vence = textoVence(oferta.fechaFin);
  const dias = diasRestantes(oferta.fechaFin);

  const esDestacado = variante === 'destacado';
  const venceUrgente = dias !== null && dias <= 2; // hoy / mañana / 2 días

  // Clases por variante.
  const containerClasses = esDestacado
    ? 'group block w-full text-left cursor-pointer bg-white border-2 border-[#e8e6e0] border-t-[3px] border-t-amber-500 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:shadow-amber-500/15 transition-shadow duration-300'
    : 'group block w-full text-left cursor-pointer bg-white border-2 border-[#e8e6e0] rounded-xl overflow-hidden shadow-md';

  const eyebrowClasses = esDestacado
    ? 'text-[11px] lg:text-xs tracking-[1.5px] text-amber-600 uppercase font-bold'
    : 'text-[10px] tracking-[1px] text-[#888] uppercase font-medium';

  const tituloClasses = esDestacado
    ? 'text-lg lg:text-xl 2xl:text-2xl font-extrabold text-[#1a1a1a] leading-tight tracking-tight'
    : 'text-base lg:text-lg 2xl:text-xl font-bold text-[#1a1a1a] leading-tight tracking-tight';

  const venceTextoClasses = esDestacado
    ? venceUrgente
      ? 'inline-flex items-center gap-1.5 text-[12px] text-amber-600 font-bold'
      : 'inline-flex items-center gap-1.5 text-[12px] text-[#6b6b6b] font-medium'
    : 'text-[11px] text-[#6b6b6b]';

  // Tracking de vista (impression): la card cuenta como vista cuando
  // ≥50% es visible por ≥1s. Backend deduplica per día/usuario.
  const refCard = useRef<HTMLButtonElement>(null);
  useViewTracker(refCard, {
    onVisto: () => {
      registrarVistaOferta(oferta.ofertaId).catch(() => { /* silent */ });
    },
  });

  return (
    <button
      ref={refCard}
      data-testid="card-oferta-hero"
      onClick={onClick}
      className={containerClasses}
    >
      {/* Foto a sangre. En desktop reducimos el aspect ratio (16/10 → 21/9)
          para que la card sea más baja. En móvil mantenemos 4/3. */}
      <div className="relative w-full overflow-hidden aspect-[4/3] lg:aspect-[21/9] 2xl:aspect-[21/9] bg-[#e8e6e0]">
        {oferta.imagen ? (
          <img
            src={oferta.imagen}
            alt={oferta.titulo}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag className="w-10 h-10 text-[#b8b4a8]" strokeWidth={2} />
          </div>
        )}

        {/* Pill descuento — esquina sup. izquierda */}
        <div className="absolute top-3 left-3">
          {esDestacado ? (
            <span className="hero-pill-ring relative inline-flex items-center px-3.5 py-2 rounded-lg bg-[#1a1a1a] text-white text-base lg:text-lg font-extrabold tabular-nums overflow-hidden">
              <span className="relative z-10">{badge}</span>
              {/* Sheen diagonal — se reproduce una vez al cargar */}
              <span className="hero-pill-sheen" aria-hidden="true" />
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#1a1a1a] text-white text-xs font-semibold">
              {badge}
            </span>
          )}
        </div>

        {/* Flama gradient rojo→amarillo en esquina sup. derecha            */}
        {/* (solo destacado). Refuerza visualmente la "urgencia" o          */}
        {/* "calidez" de la oferta del día. Animada con flicker.            */}
        {esDestacado && (
          <span
            className="hero-flame absolute top-2 right-2 lg:top-3 lg:right-3 z-10 drop-shadow-[0_4px_12px_rgba(220,38,38,0.7)]"
            aria-hidden="true"
          >
            <FlameRedYellow className="w-10 h-10 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16" />
          </span>
        )}

        {/* Pill de vistas — esquina inf. derecha de la imagen. Estilo */}
        {/* "live count" tipo YouTube/Netflix: backdrop oscuro semi-       */}
        {/* transparente, texto blanco, Eye con fill blanco. Le da peso   */}
        {/* visual al filtro "Lo más visto" sin competir con el pill de   */}
        {/* descuento (top-left) ni la flama (top-right).                  */}
        <span
          className="absolute bottom-2 right-2 lg:bottom-3 lg:right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs lg:text-sm font-bold tabular-nums leading-none shadow-md"
          title={`${oferta.totalVistas} ${oferta.totalVistas === 1 ? 'vista' : 'vistas'}`}
        >
          <Eye
            className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0"
            strokeWidth={2.5}
            fill="currentColor"
            fillOpacity={0.25}
          />
          {oferta.totalVistas}
        </span>
      </div>

      {/* Panel inferior BLANCO. Padding y separación reducidos en lg para
          que la card sea compacta sin aire vacío. */}
      <div
        className={
          esDestacado
            ? 'p-4 lg:p-3 lg:px-4 space-y-2 lg:space-y-1.5'
            : 'p-3.5 lg:p-4 space-y-1.5'
        }
      >
        {/* Encabezado del negocio: logo circular + (nombre │ distancia)   */}
        {/* en UNA sola fila, separados por divisor vertical degradado.    */}
        {esDestacado ? (
          <div className="flex items-center gap-3">
            {/* Logo circular del negocio — protagonista */}
            <div className="shrink-0 w-11 h-11 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-[#e8e6e0] ring-2 ring-amber-400/40 flex items-center justify-center shadow-sm">
              {oferta.logoUrl ? (
                <img
                  src={oferta.logoUrl}
                  alt={oferta.negocioNombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4 text-[#6b6b6b]" strokeWidth={2.5} />
              )}
            </div>

            {/* Nombre + distancia en una sola fila con divisor vertical */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="text-lg lg:text-xl font-bold text-[#1a1a1a] tracking-tight truncate leading-tight">
                {oferta.negocioNombre}
              </div>
              {distancia && (
                <>
                  {/* Divisor vertical degradado ámbar — más alto y grueso */}
                  <div
                    className="shrink-0 w-[1.5px] h-7 lg:h-8 rounded-full"
                    style={{
                      background:
                        'linear-gradient(to bottom, transparent 0%, rgba(245,158,11,0.85) 50%, transparent 100%)',
                    }}
                    aria-hidden="true"
                  />
                  <div className="shrink-0 inline-flex items-center gap-1 text-sm lg:text-[15px] tracking-[1px] text-amber-600 uppercase font-bold">
                    <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    {distancia}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={eyebrowClasses}>
            {oferta.negocioNombre}
            {distancia ? ` · ${distancia}` : ''}
          </div>
        )}

        {/* Título de la oferta */}
        <h3 className={tituloClasses}>{oferta.titulo}</h3>

        {/* Descripción — solo en variante destacado. Reserva siempre
            el alto de 2 líneas (`min-h`) aunque no haya texto, para que
            TODAS las cards rotativas del par superior queden del MISMO
            tamaño sin saltos visuales al cambiar de oferta. */}
        {esDestacado && (
          <div className="min-h-[2.75rem] lg:min-h-[3rem]">
            {oferta.descripcion && (
              <p className="text-sm lg:text-base text-[#6b6b6b] leading-relaxed line-clamp-2 font-medium">
                {oferta.descripcion}
              </p>
            )}
          </div>
        )}

        {/* Footer: pill urgencia + CTA "Ver oferta" (solo destacado) */}
        {esDestacado ? (
          <div className="flex items-center justify-between gap-3 pt-1.5">
            {vence ? (
              venceUrgente ? (
                // Pill prominente con FLAMA INDEPENDIENTE — blanca con
                // contorno rojo. La flama es un elemento absoluto, ancla al
                // pill pero vive fuera de su flujo → puede ser mucho más
                // grande sin estar restringida por el padding del pill.
                <span className="relative inline-flex items-center pl-10 lg:pl-12 pr-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs lg:text-sm font-bold uppercase tracking-wide shadow-md shadow-orange-500/30">
                  <span
                    className="hero-flame absolute -left-2.5 lg:-left-3 top-1/2 -translate-y-1/2 z-10 drop-shadow-[0_3px_8px_rgba(220,38,38,0.6)]"
                    aria-hidden="true"
                  >
                    <FlameWhiteRed className="w-10 h-10 lg:w-12 lg:h-12" />
                  </span>
                  {vence}
                </span>
              ) : (
                // Vence con margen — pill discreto gris
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0eee9] text-[#6b6b6b] text-xs lg:text-sm font-semibold">
                  <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  {vence}
                </span>
              )
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1.5 text-sm lg:text-base font-bold text-amber-600 uppercase tracking-wide shrink-0">
              Ver oferta
              <ArrowRight
                className="hero-cta-arrow w-6 h-6 lg:w-7 lg:h-7 shrink-0"
                strokeWidth={2.5}
              />
            </span>
          </div>
        ) : (
          vence && <div className={venceTextoClasses}>{vence}</div>
        )}
      </div>
    </button>
  );
}

// Memoización: durante el swipe del carrusel rotativo (PaginaOfertas), el
// padre actualiza `offsetPx` y re-renderiza. Sin memo, los subárboles pesados
// (SVG flame con gradient, animaciones, useViewTracker) se reconcilian en
// cada touchmove → swipe rígido. Con memo, las cards solo se re-renderizan
// cuando cambia la oferta (no por cambios del wrapper).
const CardOfertaHero = memo(CardOfertaHeroBase);

export default CardOfertaHero;
