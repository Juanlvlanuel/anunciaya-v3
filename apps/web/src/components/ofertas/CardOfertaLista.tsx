/**
 * CardOfertaLista.tsx
 * ====================
 * Fila de lista con foto a sangre full-height que se desvanece
 * hacia la derecha. Logo flotante + info + badge negro.
 *
 * Ubicación: apps/web/src/components/ofertas/CardOfertaLista.tsx
 */

import { useRef } from 'react';
import { Tag, Store } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';
import { useViewTracker } from '@/hooks/useViewTracker';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
import { registrarVistaOferta } from '@/services/ofertasService';
import type { OfertaFeed } from '@/types/ofertas';
import { formatearSucursalLabel } from '@/utils/sucursalOferta';

interface CardOfertaListaProps {
  oferta: OfertaFeed;
  onClick: () => void;
}

function getValorNumerico(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function getBadgeTexto(oferta: OfertaFeed): string {
  const n = getValorNumerico(oferta.valor);
  switch (oferta.tipo) {
    case 'porcentaje':   return `${n ?? 0}%`;
    case 'monto_fijo':   return `$${n ?? 0}`;
    case '2x1':          return '2×1';
    case '3x2':          return '3×2';
    case 'envio_gratis': return 'Envío';
    case 'otro':
      return oferta.valor && Number.isNaN(Number(oferta.valor))
        ? oferta.valor : 'Oferta';
    default: return 'Oferta';
  }
}

function formatDistancia(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// `getSucursalLabel` movido a `utils/sucursalOferta.ts` (`formatearSucursalLabel`)
// para que las 4 vistas de oferta usen la MISMA regla. Sprint 9.3.

export default function CardOfertaLista({ oferta, onClick }: CardOfertaListaProps) {
  const badge         = getBadgeTexto(oferta);
  const distancia     = formatDistancia(oferta.distanciaKm);
  const sucursalLabel = formatearSucursalLabel(
    oferta.sucursalNombre,
    oferta.negocioNombre,
    oferta.negocioTotalSucursales,
  );

  // Tracking de vista: ≥50% visible por ≥1s. Backend deduplica per día.
  const refCard = useRef<HTMLButtonElement>(null);
  useViewTracker(refCard, {
    onVisto: () => {
      registrarVistaOferta(oferta.ofertaId).catch(() => { /* silent */ });
    },
  });

  return (
    <button
      ref={refCard}
      data-testid={`fila-oferta-${oferta.ofertaId}`}
      onClick={onClick}
      // `h-full` es CRÍTICO: el grid 2-cols del padre alinea las cards
      // de cada fila al alto del card más alto (el que tiene 2 líneas
      // de título + subtítulo). Sin `h-full`, el button interior se
      // quedaba en su altura natural y la foto `absolute h-full` medía
      // ese alto menor → quedaba franja blanca abajo en los cards más
      // cortos. Con `h-full`, el button se estira al alto del wrapper
      // (que ya se estira por el grid) y la foto llena todo.
      className="group relative flex items-center w-full h-full min-h-[140px] lg:min-h-[118px] 2xl:min-h-[130px] cursor-pointer text-left overflow-hidden hover:bg-[#faf9f5] transition-colors duration-200"
    >
      {/* ── Foto full-height con fade hacia la derecha ──
           Sprint 9.3: reducida de w-36/w-[220px]/w-60 a w-32/w-[160px]/w-[180px]
           para dar más aire al contenido. En PC cada card mide ~434px (grid
           2 cols dentro de max-w-[920px]); antes la foto se comía 220px y
           dejaba sólo ~212px al texto (nombres del negocio se truncaban a
           "Im..."). Ahora el contenido tiene ~274px → caben los nombres
           completos. */}
      <div className="absolute left-0 top-0 w-32 lg:w-[160px] 2xl:w-[180px] h-full pointer-events-none">
        {oferta.imagen ? (
          <img
            src={oferta.imagen}
            alt={oferta.titulo}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          // Placeholder con gradiente slate puro (sin sky). Neutral —
          // no compite visualmente con los amber del feed editorial
          // (hero/destacado) ni con el azul/sky de otras secciones.
          <div className="h-full w-full bg-linear-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center">
            <Tag className="w-12 h-12 text-slate-400/70" strokeWidth={1.5} />
          </div>
        )}
        {/* Badge descuento — esquina sup-izq DENTRO de la imagen.
            z-10 para quedar sobre el gradiente. */}
        <span className="absolute top-2 left-2 z-10 inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-md bg-[#111] text-white text-[13px] font-bold tabular-nums shadow-md">
          {badge}
        </span>
        {/* Pill de vistas — esquina inf-izq DENTRO de la imagen. Mismo
            estilo dark que las otras cards. */}
        <span
          className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[13px] font-bold tabular-nums leading-none shadow-md"
          title={`${oferta.totalVistas} ${oferta.totalVistas === 1 ? 'vista' : 'vistas'}`}
        >
          <Eye
            className="w-3.5 h-3.5 shrink-0 text-white"
            strokeWidth={2.5}
          />
          {oferta.totalVistas}
        </span>
        {/* Gradiente suave uniforme de izquierda a derecha */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent from-70% to-white" />
      </div>

      {/* ── Línea punteada estilo cupón ──
           Alineada al borde derecho de la foto (foto-width − 2px del border-l).
           Mantener sincronizada con los anchos de la foto arriba. */}
      <div className="absolute inset-y-0 left-[126px] lg:left-[158px] 2xl:left-[178px] border-l-2 border-dashed border-[#a8a49a] pointer-events-none" />

      {/* ── Contenido a la derecha de la línea punteada ──                */}
      {/* `justify-center` mantiene el contenido agrupado verticalmente    */}
      {/* (sin estirarse a los extremos del card aunque éste sea más alto  */}
      {/* por la imagen). `gap-2.5` da el aire mínimo entre los 2 bloques. */}
      {/* El padding-left es 12px más que la línea punteada para dejar     */}
      {/* respiro entre la línea y el inicio del texto.                    */}
      <div className="relative flex flex-col justify-center gap-2.5 w-full pl-[138px] lg:pl-[170px] 2xl:pl-[190px] pr-3 lg:pr-5 py-1.5 lg:py-2">

        {/* ── BLOQUE SUPERIOR: Logo + Nombre del negocio + Sucursal ── */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden bg-white ring-2 ring-[#e8e6e0] shadow-sm flex items-center justify-center mt-0.5">
            {oferta.logoUrl ? (
              <img
                src={oferta.logoUrl}
                alt={oferta.negocioNombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="w-4 h-4 text-[#888]" strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* Nombre del negocio — sin truncar, puede pasar a 2 líneas */}
            <div className="text-[17px] lg:text-[18px] font-bold text-[#1a1a1a] tracking-tight leading-tight">
              {oferta.negocioNombre}
            </div>
            {/* Sucursal — fuerza 1 línea con el badge "+N más".
                `sucursalLabel` puede ser null (sucursal matriz única →
                el helper omite el label porque repetir "Matriz" cuando
                solo hay 1 sucursal no aporta info). En ese caso solo
                renderizamos el badge "+N" si aplica. */}
            {(sucursalLabel || oferta.totalSucursales > 1) && (
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                {sucursalLabel && (
                  <span className="text-[14px] text-[#555] font-medium truncate min-w-0">
                    {sucursalLabel}
                  </span>
                )}
                {oferta.totalSucursales > 1 && (
                  <span className="shrink-0 text-[12px] bg-[#efefeb] text-[#555] rounded-full px-2.5 py-1 font-semibold leading-none whitespace-nowrap">
                    +{oferta.totalSucursales - 1}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── BLOQUE INFERIOR: Título + Descripción + Distancia ── */}
        <div className="space-y-1">
          {/* Tag icon a la izquierda, título y descripción a la derecha */}
          <div className="flex items-start gap-2">
            <Tag className="w-5 h-5 lg:w-6 lg:h-6 shrink-0 text-amber-600 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <h4 className="text-[16px] lg:text-[17px] 2xl:text-[18px] font-extrabold text-[#111] leading-tight tracking-tight line-clamp-1">
                {oferta.titulo}
              </h4>
              {oferta.descripcion && (
                <p className="text-[13px] text-[#444] leading-snug font-medium line-clamp-1 mt-0.5">
                  {oferta.descripcion}
                </p>
              )}
            </div>
          </div>

          {distancia && (
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1 text-[12px] lg:text-[13px] tracking-[1px] uppercase font-bold text-amber-600">
                <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                {distancia}
              </span>
            </div>
          )}
        </div>
      </div>

    </button>
  );
}
