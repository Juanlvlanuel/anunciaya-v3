/**
 * ============================================================================
 * COMPONENTE: SeccionCatalogo (Preview)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/SeccionCatalogo.tsx
 *
 * CARACTERÍSTICAS:
 * - Muestra preview de 2-5 items + card "Ver más"
 * - Cards VERTICALES (imagen arriba, info abajo)
 * - Click en cualquier parte abre ModalCatalogo completo
 * - Click en imagen abre ModalImagenes
 * - Sin scroll infinito (eso está en el modal)
 * - 3 breakpoints: móvil (3 cols), laptop @5xl: (5 cols), desktop @[96rem]: (6 cols)
 */

import { useState, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDragScroll } from '@/hooks/useDragScroll';
import { ModalCatalogo } from './ModalCatalogo';
import { ModalDetalleItem } from './ModalDetalleItem';

// =============================================================================
// TIPOS
// =============================================================================

interface ItemCatalogo {
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precioBase: string;
  precioDesde?: boolean | null;
  imagenPrincipal?: string | null;
  requiereCita?: boolean | null;
  duracionEstimada?: number | null;
  disponible?: boolean | null;
  destacado?: boolean | null;
}

interface SeccionCatalogoProps {
  catalogo: ItemCatalogo[];
  whatsapp?: string | null;
  nombreNegocio?: string;
  negocioUsuarioId?: string | null;
  sucursalId?: string | null;
  negocioNombre?: string | null;
  /** Logo/foto de perfil del negocio. Se propaga a ModalCatalogo y
   *  ModalDetalleItem para que el chat temporal muestre el avatar. */
  logoUrl?: string | null;
}

// =============================================================================
// CONSTANTES - Items a mostrar en preview por breakpoint
// =============================================================================

// Laptop: 3 cols → mostrar 3 items (FAB encima del 3ro)
// Desktop: 4 cols → mostrar 4 items (FAB encima del 4to)
const ITEMS_PREVIEW_LAPTOP = 3;
const ITEMS_PREVIEW_DESKTOP = 4;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionCatalogo({
  catalogo,
  whatsapp,
  nombreNegocio = 'Catálogo',
  negocioUsuarioId,
  sucursalId,
  negocioNombre,
  logoUrl,
}: SeccionCatalogoProps) {
  // ---------------------------------------------------------------------------
  // ESTADOS
  // ---------------------------------------------------------------------------
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const { esMobile, esDesktop } = useBreakpoint();

  // Drag-to-scroll en el carrusel mobile — affordance desktop al embeberse en preview/ChatYA
  const refScroll = useRef<HTMLDivElement>(null);
  useDragScroll(refScroll);
  // ---------------------------------------------------------------------------
  // CÁLCULOS
  // ---------------------------------------------------------------------------

  // Total de items
  const totalItems = catalogo.length;

  // Items para preview (destacados primero, luego los primeros)
  const previewCount = esDesktop ? ITEMS_PREVIEW_DESKTOP : ITEMS_PREVIEW_LAPTOP;
  const itemsPreview = useMemo(() => {
    const ordenados = [...catalogo].sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return 0;
    });
    return ordenados.slice(0, previewCount);
  }, [catalogo, previewCount]);


  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleAbrirModal = () => {
    setModalAbierto(true);
  };

  const handleItemClick = (item: ItemCatalogo, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemSeleccionado(item);
  };

  // ---------------------------------------------------------------------------
  // RENDER - Si no hay catálogo, no mostrar nada
  // ---------------------------------------------------------------------------

  if (totalItems === 0) return null;

  return (
    <>
      {/* Estilos de animación */}
      <style>{`
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        
        @keyframes bounceX {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        
        @keyframes badgeBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-4px) scale(1.1); }
          50% { transform: translateY(0) scale(1); }
          75% { transform: translateY(-2px) scale(1.05); }
        }
        
        @keyframes starSpin {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.2); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-15deg) scale(1.1); }
        }
        
        .animate-bounceX {
          animation: bounceX 1s ease-in-out infinite;
        }
        
        .animate-pulseScale {
          animation: pulseScale 2s ease-in-out infinite;
        }
        
        .animate-badgeBounce {
          animation: badgeBounce 2s ease-in-out infinite;
        }
        
        .animate-starSpin {
          animation: starSpin 2s ease-in-out infinite;
        }
      `}</style>

      {/* ============ SECCIÓN PREVIEW ============ */}
      <div className="space-y-3 @5xl:space-y-2 @[96rem]:space-y-3">
        {/* Header con franja divisoria - Degradado igual a Galería */}
        <div
          className="flex items-center justify-between bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 hover:from-slate-700 hover:via-slate-600 hover:to-slate-500 text-white rounded-xl px-4 py-2 @5xl:px-3 @5xl:py-1.5 @[96rem]:px-4 @[96rem]:py-2 cursor-pointer transition-all"
          onClick={handleAbrirModal}
        >
          <h2 className="flex items-center gap-2 text-lg @5xl:text-base @[96rem]:text-lg font-semibold">
            <ShoppingBag className="w-5 h-5 @5xl:w-4 @5xl:h-4 @[96rem]:w-5 @[96rem]:h-5" />
            <span>Catálogo</span>
            <span className="text-sm font-medium text-white/70">({totalItems})</span>
          </h2>
          {/* Móvil: "Ver todos" + flecha animada | Desktop: solo flecha */}
          {esMobile ? (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">Ver todos</span>
              <ChevronRight className="h-5 w-5 animate-bounceX" />
            </div>
          ) : (
            <div className="w-8 h-8 @5xl:w-7 @5xl:h-7 @[96rem]:w-8 @[96rem]:h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110">
              <ChevronRight className="w-5 h-5 @5xl:w-4 @5xl:h-4 @[96rem]:w-5 @[96rem]:h-5 text-white animate-bounceX" />
            </div>
          )}
        </div>

        {/* Grid de preview con FAB externo */}
        <div className="relative">
          {/* Fade borde derecho: indicador visual de "hay más contenido → desliza".
              Oscuro para destacar sobre fondos claros. Altura acotada al item (bottom-2 alinea con pb-2 del scroll).
              z-20 para cubrir contenido del card. Solo aparece en mobile/preview. */}
          <div className="pointer-events-none absolute top-0 bottom-2 right-0 w-12 bg-gradient-to-l from-black/90 via-black/50 to-transparent @5xl:hidden z-20" />
          {/* Mobile: scroll horizontal | Desktop: grid 4 items
              [&_*]:cursor-grab fuerza el cursor en descendientes (los cards tienen cursor-pointer propio). */}
          <div
            ref={refScroll}
            className="flex gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing select-none [&_*]:cursor-grab @5xl:[&_*]:cursor-pointer @5xl:pb-0 @5xl:grid @5xl:grid-cols-3 @[96rem]:grid-cols-4 @5xl:gap-2.5 @[96rem]:gap-4 @5xl:overflow-visible @5xl:cursor-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {(esMobile
              ? [...catalogo].sort((a, b) => (a.destacado && !b.destacado ? -1 : !a.destacado && b.destacado ? 1 : 0)).slice(0, 10)
              : itemsPreview
            ).map((item, index) => {
              const esUltimoDesktop = !esMobile && index === itemsPreview.length - 1 && totalItems > itemsPreview.length;
              return (
                <div key={item.id} className="shrink-0 w-[180px] @5xl:w-auto relative">
                  <CardPreview
                    item={item}
                    index={index}
                    onItemClick={esUltimoDesktop ? () => handleAbrirModal() : handleItemClick}
                  />
                  {/* Overlay "Ver todos" en el último item desktop */}
                  {esUltimoDesktop && (
                    <div
                      className="absolute inset-0 z-30 rounded-xl bg-black/60 flex flex-col items-center justify-center gap-1 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleAbrirModal(); }}
                    >
                      <span className="text-3xl font-bold text-white">+{totalItems - itemsPreview.length}</span>
                      <span className="text-sm font-semibold text-white/80">Ver todos</span>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Botón "Ver todos" al final del scroll en mobile */}
            {esMobile && catalogo.length > 10 && (
              <div className="shrink-0 w-[180px] flex items-center justify-center">
                <button
                  onClick={handleAbrirModal}
                  className="w-full h-full min-h-[120px] rounded-xl border-2 border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                >
                  <span className="text-2xl font-bold text-white">+{catalogo.length - 10}</span>
                  <span className="text-sm font-semibold text-white/70">Ver todos</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ MODAL CATÁLOGO ============ */}
      <ModalCatalogo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        catalogo={catalogo}
        whatsapp={whatsapp}
        nombreNegocio={nombreNegocio}
        negocioUsuarioId={negocioUsuarioId}
        sucursalId={sucursalId}
        negocioNombre={negocioNombre}
        logoUrl={logoUrl}
      />

      {/* ============ MODAL DETALLE ITEM ============ */}
      <ModalDetalleItem
        item={itemSeleccionado}
        onClose={() => setItemSeleccionado(null)}
        whatsapp={whatsapp}
        negocioUsuarioId={negocioUsuarioId}
        sucursalId={sucursalId}
        negocioNombre={negocioNombre}
        logoUrl={logoUrl}
      />
    </>
  );
}

// =============================================================================
// COMPONENTE: CardPreview (Card vertical compacta con FAB opcional)
// =============================================================================

interface CardPreviewProps {
  item: ItemCatalogo;
  index: number;
  onItemClick?: (item: ItemCatalogo, e: React.MouseEvent) => void;
}

function CardPreview({
  item,
  index: _index,
  onItemClick
}: CardPreviewProps) {
  const esServicio = item.tipo === 'servicio';
  const esDestacado = item.destacado === true;

  // En mobile: todos visibles (scroll horizontal)
  // En desktop: ocultar extras según breakpoint
  const clasesVisibilidad = '';

  // Card DESTACADO
  if (esDestacado) {
    return (
      <div
        className={`group relative bg-white rounded-2xl @5xl:rounded-xl @[96rem]:rounded-2xl shadow-md overflow-hidden border-2 border-amber-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${clasesVisibilidad}`}
        onClick={(e) => onItemClick?.(item, e)}
      >
        {/* Badge con animación */}
        <div className="absolute top-2 left-2 @5xl:top-1.5 @5xl:left-1.5 @[96rem]:top-2 @[96rem]:left-2 z-10 bg-amber-500 text-white p-1.5 @5xl:p-1 @[96rem]:p-1.5 rounded-lg @5xl:rounded-md @[96rem]:rounded-lg shadow-lg animate-badgeBounce">
          <Star className="w-3.5 h-3.5 @5xl:w-3 @5xl:h-3 @[96rem]:w-3.5 @[96rem]:h-3.5 fill-current animate-starSpin" />
        </div>

        {/* Imagen con zoom hover y efecto shine */}
        <div className="aspect-4/3 overflow-hidden bg-amber-50 relative">
          {item.imagenPrincipal ? (
            <>
              <img
                src={item.imagenPrincipal}
                alt={item.nombre}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Efecto shine */}
              <div className="absolute -left-full top-0 h-full w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent transition-all duration-500 group-hover:left-[150%]" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {esServicio ? (
                <Wrench className="w-10 h-10 @5xl:w-8 @5xl:h-8 @[96rem]:w-10 @[96rem]:h-10 text-amber-300" />
              ) : (
                <ImageIcon className="w-10 h-10 @5xl:w-8 @5xl:h-8 @[96rem]:w-10 @[96rem]:h-10 text-amber-300" />
              )}
            </div>
          )}
        </div>

        {/* Info - texto más grande */}
        <div className="p-3 @5xl:p-2 @[96rem]:p-3">
          <h4 className="font-bold text-slate-800 text-base @5xl:text-sm @[96rem]:text-base line-clamp-1">
            {item.nombre}
          </h4>
          <p className="text-green-600 font-bold text-lg @5xl:text-base @[96rem]:text-lg">
            ${parseFloat(item.precioBase).toFixed(0)}
          </p>
        </div>
      </div>
    );
  }

  // Card NORMAL
  return (
    <div
      className={`group relative bg-white rounded-2xl @5xl:rounded-xl @[96rem]:rounded-2xl shadow-sm overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${clasesVisibilidad}`}
      onClick={(e) => onItemClick?.(item, e)}
    >
      {/* Imagen con zoom hover y efecto shine */}
      <div className="aspect-4/3 overflow-hidden bg-slate-200 relative">
        {item.imagenPrincipal ? (
          <>
            <img
              src={item.imagenPrincipal}
              alt={item.nombre}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {/* Efecto shine */}
            <div className="absolute -left-full top-0 h-full w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent transition-all duration-500 group-hover:left-[150%]" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {esServicio ? (
              <Wrench className="w-10 h-10 @5xl:w-8 @5xl:h-8 @[96rem]:w-10 @[96rem]:h-10 text-slate-600" />
            ) : (
              <ImageIcon className="w-10 h-10 @5xl:w-8 @5xl:h-8 @[96rem]:w-10 @[96rem]:h-10 text-slate-600" />
            )}
          </div>
        )}
      </div>

      {/* Info - texto más grande */}
      <div className="p-3 @5xl:p-2 @[96rem]:p-3">
        <h4 className="font-semibold text-slate-800 text-base @5xl:text-sm @[96rem]:text-base line-clamp-1">
          {item.nombre}
        </h4>
        <p className="text-green-600 font-bold text-lg @5xl:text-base @[96rem]:text-lg">
          ${parseFloat(item.precioBase).toFixed(0)}
        </p>
      </div>
    </div>
  );
}

export default SeccionCatalogo;