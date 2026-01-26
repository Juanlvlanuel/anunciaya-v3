/**
 * ============================================================================
 * COMPONENTE: ModalCatalogo - VERSIÓN 2.0 (Patrón Adaptativo)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalCatalogo.tsx
 *
 * COMPORTAMIENTO:
 * - MÓVIL (< 1024px): ModalBottom (slide up con drag)
 * - PC/LAPTOP (≥ 1024px): Modal centrado tradicional
 *
 * CARACTERÍSTICAS:
 * - Buscador con debounce
 * - Tabs de tipo (Productos/Servicios)
 * - Pills de categorías
 * - Grid de cards verticales
 * - Click en item abre ModalDetalleItem
 * - 3 breakpoints: móvil (2 cols), laptop lg: (3 cols), desktop 2xl: (4 cols)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ShoppingBag,
  Wrench,
  Search,
  Clock,
  ImageIcon,
  Star,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { ModalDetalleItem } from './ModalDetalleItem';
import { useBreakpoint } from '../../hooks/useBreakpoint';

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

interface ModalCatalogoProps {
  /** ¿Modal abierto? */
  abierto: boolean;
  /** Función para cerrar */
  onCerrar: () => void;
  /** Array de items del catálogo */
  catalogo: ItemCatalogo[];
  /** WhatsApp del negocio (para ModalDetalleItem) */
  whatsapp?: string | null;
  /** Nombre del negocio (para el título) */
  nombreNegocio?: string;
}

// =============================================================================
// COMPONENTE: CardCatalogoVertical
// =============================================================================

interface CardCatalogoVerticalProps {
  item: ItemCatalogo;
  onItemClick?: (item: ItemCatalogo) => void;
}

function CardCatalogoVertical({ item, onItemClick }: CardCatalogoVerticalProps) {
  const esServicio = item.tipo === 'servicio';
  const esDestacado = item.destacado === true;

  // Card DESTACADO
  if (esDestacado) {
    return (
      <div
        className="relative bg-white rounded-2xl lg:rounded-lg 2xl:rounded-xl shadow-md overflow-hidden border-2 border-amber-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
        onClick={() => onItemClick?.(item)}
      >
        {/* Badge destacado */}
        <div className="absolute top-2 left-2 lg:top-1 lg:left-1 2xl:top-1.5 2xl:left-1.5 z-10 bg-amber-500 text-white px-2 py-1 lg:px-1.5 lg:py-0.5 2xl:px-1.5 2xl:py-0.5 rounded-lg lg:rounded 2xl:rounded-md flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5">
          <Star className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-2.5 2xl:h-2.5 fill-current" />
          <span className="text-[10px] lg:text-[9px] 2xl:text-[9px] font-bold">Top</span>
        </div>

        {/* Imagen */}
        <div className="aspect-4/3 lg:aspect-3/2 2xl:aspect-3/2 overflow-hidden bg-amber-50">
          {item.imagenPrincipal ? (
            <img
              src={item.imagenPrincipal}
              alt={item.nombre}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {esServicio ? (
                <Wrench className="w-12 h-12 lg:w-6 lg:h-6 2xl:w-6 2xl:h-6 text-amber-300" />
              ) : (
                <ImageIcon className="w-12 h-12 lg:w-6 lg:h-6 2xl:w-6 2xl:h-6 text-amber-300" />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 lg:p-2 2xl:p-2">
          <h4 className="font-bold text-slate-800 text-sm lg:text-xs 2xl:text-xs line-clamp-2">
            {item.nombre}
          </h4>
          {item.descripcion && (
            <p className="text-slate-500 text-xs lg:text-[11px] 2xl:text-[11px] line-clamp-1 mt-0.5">
              {item.descripcion}
            </p>
          )}
          {esServicio && item.duracionEstimada && (
            <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5 mt-1.5 lg:mt-1 2xl:mt-1">
              <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-2.5 2xl:h-2.5 text-amber-600" />
              <span className="text-[10px] lg:text-[10px] 2xl:text-[10px] text-slate-600">
                {item.duracionEstimada} min
              </span>
            </div>
          )}
          <p className="text-green-600 font-bold text-base lg:text-sm 2xl:text-sm mt-1.5 lg:mt-1 2xl:mt-1">
            {item.precioDesde && <span className="text-slate-500 font-normal text-xs lg:text-[10px] 2xl:text-[10px]">Desde </span>}
            ${parseFloat(item.precioBase).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }

  // Card NORMAL
  return (
    <div
      className="bg-white rounded-2xl lg:rounded-lg 2xl:rounded-xl shadow-sm overflow-hidden border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
      onClick={() => onItemClick?.(item)}
    >
      {/* Imagen */}
      <div className="aspect-4/3 lg:aspect-3/2 2xl:aspect-3/2 overflow-hidden bg-slate-100">
        {item.imagenPrincipal ? (
          <img
            src={item.imagenPrincipal}
            alt={item.nombre}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {esServicio ? (
              <Wrench className="w-10 h-10 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5 text-slate-300" />
            ) : (
              <ImageIcon className="w-10 h-10 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5 text-slate-300" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 lg:p-2 2xl:p-2">
        <h4 className="font-semibold text-slate-800 text-sm lg:text-xs 2xl:text-xs line-clamp-2">
          {item.nombre}
        </h4>
        {item.descripcion && (
          <p className="text-slate-400 text-xs lg:text-[11px] 2xl:text-[11px] line-clamp-1 mt-0.5">
            {item.descripcion}
          </p>
        )}
        {esServicio && item.duracionEstimada && (
          <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5 mt-1.5 lg:mt-1 2xl:mt-1">
            <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-2.5 2xl:h-2.5 text-slate-400" />
            <span className="text-[10px] lg:text-[10px] 2xl:text-[10px] text-slate-500">
              {item.duracionEstimada} min
            </span>
          </div>
        )}
        <p className="text-green-600 font-bold text-sm lg:text-sm 2xl:text-sm mt-1.5 lg:mt-1 2xl:mt-1">
          {item.precioDesde && <span className="text-slate-500 font-normal text-xs lg:text-[10px] 2xl:text-[10px]">Desde </span>}
          ${parseFloat(item.precioBase).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Contenido del Catálogo (reutilizable)
// =============================================================================

interface ContenidoCatalogoProps {
  catalogo: ItemCatalogo[];
  busqueda: string;
  setBusqueda: (value: string) => void;
  tipoSeleccionado: 'producto' | 'servicio' | null;
  setTipoSeleccionado: (tipo: 'producto' | 'servicio') => void;
  categoriaSeleccionada: string | null;
  setCategoriaSeleccionada: (cat: string | null) => void;
  onItemClick: (item: ItemCatalogo) => void;
  tieneAmbos: boolean;
  totalProductos: number;
  totalServicios: number;
  /** ¿Mostrar tabs de Productos/Servicios? (false en móvil porque van en header) */
  mostrarTabs?: boolean;
}

function ContenidoCatalogo({
  catalogo,
  busqueda,
  setBusqueda,
  tipoSeleccionado,
  setTipoSeleccionado,
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  onItemClick,
  tieneAmbos,
  totalProductos,
  totalServicios,
  mostrarTabs = true,
}: ContenidoCatalogoProps) {
  // Filtrar items por tipo
  const itemsPorTipo = useMemo(() => {
    if (!tipoSeleccionado) return catalogo;
    return catalogo.filter((item) => item.tipo === tipoSeleccionado);
  }, [catalogo, tipoSeleccionado]);

  // Obtener categorías únicas
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    itemsPorTipo.forEach((item) => {
      if (item.categoria) cats.add(item.categoria);
    });
    return Array.from(cats).sort();
  }, [itemsPorTipo]);

  // Filtrar por categoría
  const itemsPorCategoria = useMemo(() => {
    if (!categoriaSeleccionada) return itemsPorTipo;
    return itemsPorTipo.filter((item) => item.categoria === categoriaSeleccionada);
  }, [itemsPorTipo, categoriaSeleccionada]);

  // Filtrar por búsqueda
  const itemsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return itemsPorCategoria;
    const termino = busqueda.toLowerCase().trim();
    return itemsPorCategoria.filter(
      (item) =>
        item.nombre.toLowerCase().includes(termino) ||
        item.descripcion?.toLowerCase().includes(termino) ||
        item.categoria?.toLowerCase().includes(termino)
    );
  }, [itemsPorCategoria, busqueda]);

  // Ordenar: destacados primero
  const itemsOrdenados = useMemo(() => {
    return [...itemsFiltrados].sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return 0;
    });
  }, [itemsFiltrados]);

  const handleCambiarTipo = (tipo: 'producto' | 'servicio') => {
    setTipoSeleccionado(tipo);
    setCategoriaSeleccionada(null);
  };

  return (
    <>
      {/* ============ BUSCADOR ============ */}
      <div className="px-3 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-slate-50 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-buscar-catalogo"
            name="input-buscar-catalogo"
            type="text"
            placeholder="Buscar productos o servicios..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 lg:pl-10 lg:pr-4 lg:py-2 2xl:pl-10 2xl:pr-4 2xl:py-2 bg-white rounded-lg lg:rounded-lg 2xl:rounded-lg text-sm border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* ============ TABS PRODUCTOS/SERVICIOS (solo desktop) ============ */}
      {mostrarTabs && tieneAmbos && (
        <div className="px-3 py-1.5 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 border-b border-slate-100 shrink-0">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => handleCambiarTipo('producto')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tipoSeleccionado === 'producto'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Productos
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  tipoSeleccionado === 'producto' ? 'bg-white/20' : 'bg-slate-200'
                }`}
              >
                {totalProductos}
              </span>
            </button>
            <button
              onClick={() => handleCambiarTipo('servicio')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tipoSeleccionado === 'servicio'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Servicios
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  tipoSeleccionado === 'servicio' ? 'bg-white/20' : 'bg-slate-200'
                }`}
              >
                {totalServicios}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ============ PILLS CATEGORÍAS ============ */}
      {categorias.length > 0 && (
        <div className="px-3 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 border-b border-slate-100 shrink-0">
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaSeleccionada === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoriaSeleccionada === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ GRID DE PRODUCTOS ============ */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 lg:p-1.5 2xl:p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {itemsOrdenados.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
            {itemsOrdenados.map((item) => (
              <CardCatalogoVertical
                key={item.id}
                item={item}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 lg:py-6 2xl:py-6 text-center">
            <Search className="w-12 h-12 lg:w-8 lg:h-8 2xl:w-8 2xl:h-8 text-slate-300 mx-auto mb-3 lg:mb-2 2xl:mb-2" />
            <p className="text-slate-500 text-sm lg:text-[11px] 2xl:text-xs">No se encontraron resultados</p>
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="mt-2 lg:mt-1.5 2xl:mt-1.5 text-blue-600 text-sm lg:text-[11px] 2xl:text-xs hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalCatalogo({
  abierto,
  onCerrar,
  catalogo,
  whatsapp,
  nombreNegocio = 'Catálogo',
}: ModalCatalogoProps) {
  const { esMobile } = useBreakpoint();

  // ---------------------------------------------------------------------------
  // ESTADOS
  // ---------------------------------------------------------------------------
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'producto' | 'servicio' | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);

  // ---------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS
  // ---------------------------------------------------------------------------

  // Contar productos y servicios
  const { totalProductos, totalServicios, tieneAmbos } = useMemo(() => {
    const productos = catalogo.filter((item) => item.tipo === 'producto').length;
    const servicios = catalogo.filter((item) => item.tipo === 'servicio').length;
    return {
      totalProductos: productos,
      totalServicios: servicios,
      tieneAmbos: productos > 0 && servicios > 0,
    };
  }, [catalogo]);

  // Establecer tipo inicial
  useEffect(() => {
    if (abierto) {
      if (!tieneAmbos) {
        if (totalProductos > 0) setTipoSeleccionado('producto');
        else if (totalServicios > 0) setTipoSeleccionado('servicio');
      } else if (tipoSeleccionado === null) {
        setTipoSeleccionado(totalProductos >= totalServicios ? 'producto' : 'servicio');
      }
    }
  }, [abierto, tieneAmbos, totalProductos, totalServicios, tipoSeleccionado]);

  // Reset al cerrar
  useEffect(() => {
    if (!abierto) {
      setBusqueda('');
      setCategoriaSeleccionada(null);
    }
  }, [abierto]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleItemClick = useCallback((item: ItemCatalogo) => {
    setItemSeleccionado(item);
  }, []);

  const handleCambiarTipo = useCallback((tipo: 'producto' | 'servicio') => {
    setTipoSeleccionado(tipo);
    setCategoriaSeleccionada(null);
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER - MÓVIL: ModalBottom
  // ---------------------------------------------------------------------------
  if (esMobile) {
    return (
      <>
        <ModalBottom
          abierto={abierto}
          onCerrar={onCerrar}
          titulo="Catálogo"
          iconoTitulo={<ShoppingBag className="w-5 h-5 text-white" />}
          mostrarHeader={false}
          sinScrollInterno={true}
          alturaMaxima="lg"
        >
          {/* Header con tabs integrados */}
          <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-slate-800 font-bold text-lg">Catálogo</h3>
              </div>
              
              {/* Tabs en el header */}
              {tieneAmbos && (
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => handleCambiarTipo('producto')}
                    className={`py-1.5 px-2.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      tipoSeleccionado === 'producto'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Prod</span>
                    <span className={`px-1.5 rounded text-xs ${
                      tipoSeleccionado === 'producto' ? 'bg-white/20' : 'bg-slate-200'
                    }`}>
                      {totalProductos}
                    </span>
                  </button>
                  <button
                    onClick={() => handleCambiarTipo('servicio')}
                    className={`py-1.5 px-2.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      tipoSeleccionado === 'servicio'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Serv</span>
                    <span className={`px-1.5 rounded text-xs ${
                      tipoSeleccionado === 'servicio' ? 'bg-white/20' : 'bg-slate-200'
                    }`}>
                      {totalServicios}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <ContenidoCatalogo
            catalogo={catalogo}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            tipoSeleccionado={tipoSeleccionado}
            setTipoSeleccionado={setTipoSeleccionado}
            categoriaSeleccionada={categoriaSeleccionada}
            setCategoriaSeleccionada={setCategoriaSeleccionada}
            onItemClick={handleItemClick}
            tieneAmbos={tieneAmbos}
            totalProductos={totalProductos}
            totalServicios={totalServicios}
            mostrarTabs={false}
          />
        </ModalBottom>

        {/* Modal Detalle Item */}
        <ModalDetalleItem
          item={itemSeleccionado}
          whatsapp={whatsapp}
          onClose={() => setItemSeleccionado(null)}
          openedFromModal={true}
        />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - DESKTOP: Modal centrado
  // ---------------------------------------------------------------------------
  return (
    <>
      <Modal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={nombreNegocio}
        iconoTitulo={<ShoppingBag className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />}
        ancho="lg"
        paddingContenido="none"
        className="flex flex-col max-h-[75vh]! lg:max-h-[80vh]!"
      >
        <ContenidoCatalogo
          catalogo={catalogo}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          tipoSeleccionado={tipoSeleccionado}
          setTipoSeleccionado={setTipoSeleccionado}
          categoriaSeleccionada={categoriaSeleccionada}
          setCategoriaSeleccionada={setCategoriaSeleccionada}
          onItemClick={handleItemClick}
          tieneAmbos={tieneAmbos}
          totalProductos={totalProductos}
          totalServicios={totalServicios}
        />
      </Modal>

      {/* Modal Detalle Item */}
      <ModalDetalleItem
        item={itemSeleccionado}
        whatsapp={whatsapp}
        onClose={() => setItemSeleccionado(null)}
        openedFromModal={true}
      />
    </>
  );
}

export default ModalCatalogo;