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

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Wrench,
  Search,
  Clock,
  ImageIcon,
  Star,
  X,
  ChevronDown,
  Check,
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
  /** ID del usuario dueño del negocio (para ChatYA) */
  negocioUsuarioId?: string | null;
  /** ID de la sucursal activa (para ChatYA) */
  sucursalId?: string | null;
  /** Nombre del negocio para el chat temporal (para ChatYA) */
  negocioNombre?: string | null;
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
        className="relative bg-white rounded-xl shadow-md overflow-hidden border-2 border-amber-300 cursor-pointer"
        onClick={() => onItemClick?.(item)}
      >
        {/* Badge destacado */}
        <div className="absolute top-2 left-2 lg:top-1 lg:left-1 2xl:top-1.5 2xl:left-1.5 z-10 bg-amber-500 text-white px-2 py-1 lg:px-1.5 lg:py-0.5 2xl:px-1.5 2xl:py-0.5 rounded-lg flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5">
          <Star className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-2.5 2xl:h-2.5 fill-current" />
          <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold">Top</span>
        </div>

        {/* Imagen */}
        <div className="aspect-4/3 lg:aspect-3/2 2xl:aspect-3/2 overflow-hidden bg-amber-50">
          {item.imagenPrincipal ? (
            <img
              src={item.imagenPrincipal}
              alt={item.nombre}
              className="w-full h-full object-cover "
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
          <h4 className="font-bold text-slate-800 text-sm lg:text-[11px] 2xl:text-sm line-clamp-2">
            {item.nombre}
          </h4>
          {item.descripcion && (
            <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium line-clamp-1 mt-0.5">
              {item.descripcion}
            </p>
          )}
          {esServicio && item.duracionEstimada && (
            <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5 mt-1.5 lg:mt-1 2xl:mt-1">
              <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-2.5 2xl:h-2.5 text-amber-600" />
              <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                {item.duracionEstimada} min
              </span>
            </div>
          )}
          <p className="text-green-600 font-bold text-base lg:text-sm 2xl:text-base mt-1.5 lg:mt-1 2xl:mt-1">
            {item.precioDesde && <span className="text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Desde </span>}
            ${parseFloat(item.precioBase).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }

  // Card NORMAL
  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-slate-300 cursor-pointer"
      onClick={() => onItemClick?.(item)}
    >
      {/* Imagen */}
      <div className="aspect-4/3 lg:aspect-3/2 2xl:aspect-3/2 overflow-hidden bg-slate-300">
        {item.imagenPrincipal ? (
          <img
            src={item.imagenPrincipal}
            alt={item.nombre}
            className="w-full h-full object-cover "
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
        <h4 className="font-semibold text-slate-800 text-sm lg:text-[11px] 2xl:text-sm line-clamp-2">
          {item.nombre}
        </h4>
        {item.descripcion && (
          <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium line-clamp-1 mt-0.5">
            {item.descripcion}
          </p>
        )}
        {esServicio && item.duracionEstimada && (
          <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-0.5 mt-1.5 lg:mt-1 2xl:mt-1">
            <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-slate-600" />
            <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
              {item.duracionEstimada} min
            </span>
          </div>
        )}
        <p className="text-green-600 font-bold text-base lg:text-sm 2xl:text-base mt-1.5 lg:mt-1 2xl:mt-1">
          {item.precioDesde && <span className="text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Desde </span>}
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
  /** Flag del hook useBreakpoint (respeta BreakpointOverride del preview/ChatYA) */
  esMobile: boolean;
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
  esMobile,
}: ContenidoCatalogoProps) {
  const [dropdownCatAbierto, setDropdownCatAbierto] = useState(false);
  const dropdownCatRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    if (!dropdownCatAbierto) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownCatRef.current?.contains(e.target as Node)) setDropdownCatAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownCatAbierto]);

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
      <div className="px-3 py-2 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 border-b border-slate-300 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
          <input
            id="input-buscar-catalogo"
            name="input-buscar-catalogo"
            type="text"
            placeholder="Buscar productos o servicios..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-11 lg:h-10 2xl:h-11 pl-10 pr-10 bg-white rounded-lg text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 border-2 border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-50 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>
      </div>

      {/* ============ DESKTOP: Tabs + Dropdown categoría en 1 fila ============ */}
      {mostrarTabs && (
        <div className="px-3 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            {/* Botones Productos/Servicios */}
            {tieneAmbos && (
              <>
                <button
                  onClick={() => handleCambiarTipo('producto')}
                  className={`flex-1 h-10 2xl:h-11 px-2.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold flex items-center justify-center gap-1.5 border-2 cursor-pointer ${
                    tipoSeleccionado === 'producto'
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  Productos
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    tipoSeleccionado === 'producto' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {totalProductos}
                  </span>
                </button>
                <button
                  onClick={() => handleCambiarTipo('servicio')}
                  className={`flex-1 h-10 2xl:h-11 px-2.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold flex items-center justify-center gap-1.5 border-2 cursor-pointer ${
                    tipoSeleccionado === 'servicio'
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Wrench className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  Servicios
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    tipoSeleccionado === 'servicio' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {totalServicios}
                  </span>
                </button>
              </>
            )}

            {/* Dropdown Categoría */}
            {categorias.length > 0 && (
              <div ref={dropdownCatRef} className="relative flex-1">
                <button
                  onClick={() => setDropdownCatAbierto(!dropdownCatAbierto)}
                  className={`w-full flex items-center justify-between gap-1.5 h-10 2xl:h-11 pl-3 pr-2.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold border-2 cursor-pointer ${
                    categoriaSeleccionada
                      ? 'bg-slate-300 border-slate-400 text-slate-800'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{categoriaSeleccionada || 'Categoría'}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 ${dropdownCatAbierto ? 'rotate-180' : ''}`} />
                </button>

                {dropdownCatAbierto && (
                  <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg py-1 z-50 overflow-hidden">
                    <button
                      onClick={() => { setCategoriaSeleccionada(null); setDropdownCatAbierto(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer ${
                        !categoriaSeleccionada ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!categoriaSeleccionada ? 'bg-slate-700' : 'bg-slate-300'}`}>
                        {!categoriaSeleccionada && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Todas
                    </button>
                    {categorias.map((cat) => {
                      const activo = categoriaSeleccionada === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => { setCategoriaSeleccionada(cat); setDropdownCatAbierto(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer ${
                            activo ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-slate-700' : 'bg-slate-300'}`}>
                            {activo && <Check className="w-3 h-3 text-white" />}
                          </div>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ MOBILE: PILLS CATEGORÍAS ============ */}
      {!mostrarTabs && categorias.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-300 shrink-0">
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer ${
                categoriaSeleccionada === null
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer ${
                  categoriaSeleccionada === cat
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
          <div className={esMobile ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2'}>
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
            <Search className="w-12 h-12 lg:w-8 lg:h-8 2xl:w-8 2xl:h-8 text-slate-400 mx-auto mb-3 lg:mb-2 2xl:mb-2" />
            <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">No se encontraron resultados</p>
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="mt-2 lg:mt-1.5 2xl:mt-1.5 text-blue-600 text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer hover:underline"
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
  negocioUsuarioId,
  sucursalId,
  negocioNombre,
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
          headerOscuro
          sinScrollInterno={true}
          alturaMaxima="lg"
          className="h-[80vh]!"
        >
          {/* Header con gradiente slate */}
          <div
            className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Catálogo</h3>
              </div>

              {/* Tabs en el header */}
              {tieneAmbos && (
                <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => handleCambiarTipo('producto')}
                    className={`py-1.5 px-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                      tipoSeleccionado === 'producto'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/60'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Prod</span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                      tipoSeleccionado === 'producto' ? 'bg-slate-300' : 'bg-white/15'
                    }`}>
                      {totalProductos}
                    </span>
                  </button>
                  <button
                    onClick={() => handleCambiarTipo('servicio')}
                    className={`py-1.5 px-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                      tipoSeleccionado === 'servicio'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/60'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Serv</span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                      tipoSeleccionado === 'servicio' ? 'bg-slate-300' : 'bg-white/15'
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
            esMobile={esMobile}
          />
        </ModalBottom>

        {/* Modal Detalle Item */}
        <ModalDetalleItem
          item={itemSeleccionado}
          whatsapp={whatsapp}
          negocioUsuarioId={negocioUsuarioId}
          sucursalId={sucursalId}
          negocioNombre={negocioNombre}
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
        mostrarHeader={false}
        ancho="lg"
        paddingContenido="none"
        className="flex flex-col h-[75vh]! lg:h-[80vh]!"
      >
        {/* Header con gradiente slate */}
        <div
          className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2 2xl:gap-3">
              <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
              </div>
              <h3 className="text-white font-bold text-base 2xl:text-lg">Catálogo</h3>
            </div>
            <button onClick={onCerrar} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex flex-col flex-1 min-h-0">
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
          esMobile={esMobile}
        />
        </div>
      </Modal>

      {/* Modal Detalle Item */}
      <ModalDetalleItem
        item={itemSeleccionado}
        whatsapp={whatsapp}
        negocioUsuarioId={negocioUsuarioId}
        sucursalId={sucursalId}
        negocioNombre={negocioNombre}
        onClose={() => setItemSeleccionado(null)}
        openedFromModal={true}
      />
    </>
  );
}

export default ModalCatalogo;