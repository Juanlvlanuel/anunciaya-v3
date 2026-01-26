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
 * - 3 breakpoints: móvil (3 cols), laptop lg: (5 cols), desktop 2xl: (6 cols)
 */

import { useState, useMemo } from 'react';
import {
  ShoppingBag,
  ChevronRight,
  ImageIcon,
  Wrench,
  Star,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
}

// =============================================================================
// CONSTANTES - Items a mostrar en preview por breakpoint
// =============================================================================

// Móvil: 2 cols → mostrar 2 items (FAB encima del 2do)
// Laptop: 3 cols → mostrar 3 items (FAB encima del 3ro)
// Desktop: 4 cols → mostrar 4 items (FAB encima del 4to)
const ITEMS_PREVIEW_MOVIL = 2;
const ITEMS_PREVIEW_LAPTOP = 3;
const ITEMS_PREVIEW_DESKTOP = 4;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionCatalogo({
  catalogo,
  whatsapp,
  nombreNegocio = 'Catálogo',
}: SeccionCatalogoProps) {
  // ---------------------------------------------------------------------------
  // ESTADOS
  // ---------------------------------------------------------------------------
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const { esMobile } = useBreakpoint();
  // ---------------------------------------------------------------------------
  // CÁLCULOS
  // ---------------------------------------------------------------------------

  // Total de items
  const totalItems = catalogo.length;

  // Items para preview (destacados primero, luego los primeros)
  const itemsPreview = useMemo(() => {
    // Ordenar: destacados primero
    const ordenados = [...catalogo].sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return 0;
    });
    // Tomar máximo para desktop (el CSS oculta los extras en móvil/laptop)
    return ordenados.slice(0, ITEMS_PREVIEW_DESKTOP);
  }, [catalogo]);

  // Cuántos items quedan por mostrar
  const itemsRestantesMovil = Math.max(0, totalItems - ITEMS_PREVIEW_MOVIL);
  const itemsRestantesLaptop = Math.max(0, totalItems - ITEMS_PREVIEW_LAPTOP);
  const itemsRestantesDesktop = Math.max(0, totalItems - ITEMS_PREVIEW_DESKTOP);

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
      <div className="space-y-3 lg:space-y-2 2xl:space-y-3">
        {/* Header con franja divisoria - Degradado igual a Galería */}
        <div
          className="flex items-center justify-between bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 hover:from-slate-700 hover:via-slate-600 hover:to-slate-500 text-white rounded-xl px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 cursor-pointer transition-all"
          onClick={handleAbrirModal}
        >
          <h2 className="flex items-center gap-2 text-lg lg:text-base 2xl:text-lg font-semibold">
            <ShoppingBag className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
            <span>Catálogo</span>
            <span className="text-sm font-normal text-slate-300">({totalItems})</span>
          </h2>
          {/* Móvil: "Ver todos" + flecha animada | Desktop: solo flecha */}
          {esMobile ? (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">Ver todos</span>
              <ChevronRight className="h-5 w-5 animate-bounceX" />
            </div>
          ) : (
            <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110">
              <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white animate-bounceX" />
            </div>
          )}
        </div>

        {/* Grid de preview con FAB externo */}
        <div className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-2.5 2xl:gap-4 pr-0 lg:pr-8">
            {/* Cards de preview */}
            {itemsPreview.map((item, index) => (
              <CardPreview
                key={item.id}
                item={item}
                index={index}
                onItemClick={handleItemClick}
              />
            ))}
          </div>

          {/* FAB circular - Solo Laptop */}
          {itemsRestantesLaptop > 0 && (
            <button
              onClick={handleAbrirModal}
              className="hidden lg:flex 2xl:hidden absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center gap-0.5 rounded-full bg-blue-600 text-white shadow-xl transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer animate-pulseScale"
              title={`Ver ${itemsRestantesLaptop} items más`}
            >
              <span className="text-[10px] font-bold">+{itemsRestantesLaptop}</span>
              <ChevronRight className="h-3 w-3 animate-bounceX" />
            </button>
          )}

          {/* FAB circular - Desktop */}
          {itemsRestantesDesktop > 0 && (
            <button
              onClick={handleAbrirModal}
              className="hidden 2xl:flex absolute -right-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center gap-0.5 rounded-full bg-blue-600 text-white shadow-xl transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer animate-pulseScale"
              title={`Ver ${itemsRestantesDesktop} items más`}
            >
              <span className="text-xs font-bold">+{itemsRestantesDesktop}</span>
              <ChevronRight className="h-3.5 w-3.5 animate-bounceX" />
            </button>
          )}
        </div>
      </div>

      {/* ============ MODAL CATÁLOGO ============ */}
      <ModalCatalogo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        catalogo={catalogo}
        whatsapp={whatsapp}
        nombreNegocio={nombreNegocio}
      />

      {/* ============ MODAL DETALLE ITEM ============ */}
      <ModalDetalleItem
        item={itemSeleccionado}
        onClose={() => setItemSeleccionado(null)}
        whatsapp={whatsapp}
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
  index, 
  onItemClick
}: CardPreviewProps) {
  const esServicio = item.tipo === 'servicio';
  const esDestacado = item.destacado === true;

  // Clases para ocultar items según breakpoint
  // index 0-1: visible en todos (móvil muestra 2)
  // index 2: visible en lg+ (laptop muestra 3)
  // index 3: visible en 2xl+ (desktop muestra 4)
  const clasesVisibilidad =
    index < 2
      ? '' // Siempre visible
      : index < 3
        ? 'hidden lg:block' // Visible desde laptop
        : 'hidden 2xl:block'; // Visible solo en desktop

  // Card DESTACADO
  if (esDestacado) {
    return (
      <div
        className={`group relative bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-md overflow-hidden border-2 border-amber-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${clasesVisibilidad}`}
        onClick={(e) => onItemClick?.(item, e)}
      >
        {/* Badge con animación - MÁS GRANDE */}
        <div className="absolute top-2 left-2 lg:top-1.5 lg:left-1.5 2xl:top-2 2xl:left-2 z-10 bg-amber-500 text-white p-2 lg:p-1.5 2xl:p-2 rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg animate-badgeBounce">
          <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 fill-current animate-starSpin" />
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
                <Wrench className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 text-amber-300" />
              ) : (
                <ImageIcon className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 text-amber-300" />
              )}
            </div>
          )}
        </div>

        {/* Info - texto más grande */}
        <div className="p-3 lg:p-2 2xl:p-3">
          <h4 className="font-bold text-slate-800 text-base lg:text-sm 2xl:text-base line-clamp-1">
            {item.nombre}
          </h4>
          <p className="text-green-600 font-bold text-lg lg:text-base 2xl:text-lg">
            ${parseFloat(item.precioBase).toFixed(0)}
          </p>
        </div>
      </div>
    );
  }

  // Card NORMAL
  return (
    <div
      className={`group relative bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-sm overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${clasesVisibilidad}`}
      onClick={(e) => onItemClick?.(item, e)}
    >
      {/* Imagen con zoom hover y efecto shine */}
      <div className="aspect-4/3 overflow-hidden bg-slate-100 relative">
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
              <Wrench className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 text-slate-300" />
            ) : (
              <ImageIcon className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 text-slate-300" />
            )}
          </div>
        )}
      </div>

      {/* Info - texto más grande */}
      <div className="p-3 lg:p-2 2xl:p-3">
        <h4 className="font-semibold text-slate-800 text-base lg:text-sm 2xl:text-base line-clamp-1">
          {item.nombre}
        </h4>
        <p className="text-green-600 font-bold text-lg lg:text-base 2xl:text-lg">
          ${parseFloat(item.precioBase).toFixed(0)}
        </p>
      </div>
    </div>
  );
}

export default SeccionCatalogo;