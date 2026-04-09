// =============================================================================
// COMPONENTE: ChipsFiltros
// Chips de filtros reutilizable (barra flotante sobre mapa y header grid)
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Locate,
  CreditCard,
  Truck,
  Home,
  X,
  ChevronDown,
  Store,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface ChipsFiltrosProps {
  variante: 'flotante' | 'inline';
  cercaDeMi: boolean;
  toggleCercaDeMi: () => void;
  distancia: number;
  setDistancia: (v: number) => void;
  categoria: number | null;
  categorias: { id: number; nombre: string }[];
  dropdownCategoria: boolean;
  setDropdownCategoria: (v: boolean) => void;
  btnCategoriaRef: React.RefObject<HTMLButtonElement | null>;
  setPosicionDropdownCat: (v: { top: number; left: number }) => void;
  opcionesSubcategorias: { id: number; nombre: string }[];
  subcategoriasSeleccionadas: number[];
  dropdownSubcategoria: boolean;
  setDropdownSubcategoria: (v: boolean) => void;
  btnSubcategoriaRef: React.RefObject<HTMLButtonElement | null>;
  setPosicionDropdownSub: (v: { top: number; left: number }) => void;
  soloCardya: boolean;
  toggleSoloCardya: () => void;
  conEnvio: boolean;
  toggleConEnvio: () => void;
  conServicioDomicilio: boolean;
  toggleConServicioDomicilio: () => void;
  dropdownDistancia: boolean;
  setDropdownDistancia: (v: boolean) => void;
  posDropdownDist: { top: number; left: number };
  setPosDropdownDist: (v: { top: number; left: number }) => void;
  filtrosActivos: () => number;
  limpiarFiltros: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ChipsFiltros({
  variante,
  cercaDeMi, toggleCercaDeMi,
  distancia, setDistancia,
  categoria, categorias,
  dropdownCategoria, setDropdownCategoria, btnCategoriaRef, setPosicionDropdownCat,
  opcionesSubcategorias, subcategoriasSeleccionadas,
  dropdownSubcategoria, setDropdownSubcategoria, btnSubcategoriaRef, setPosicionDropdownSub,
  soloCardya, toggleSoloCardya,
  conEnvio, toggleConEnvio,
  conServicioDomicilio, toggleConServicioDomicilio,
  dropdownDistancia, setDropdownDistancia,
  posDropdownDist, setPosDropdownDist,
  filtrosActivos, limpiarFiltros,
}: ChipsFiltrosProps) {
  const esFlotante = variante === 'flotante';

  // Estado local del slider: visual instantáneo, commit al store solo al soltar
  const [distanciaLocal, setDistanciaLocal] = useState(distancia);
  const [arrastrando, setArrastrando] = useState(false);
  const btnDistanciaRef = React.useRef<HTMLButtonElement>(null);

  // Sincronizar si el store cambia externamente (ej: limpiar filtros)
  useEffect(() => {
    if (!arrastrando) setDistanciaLocal(distancia);
  }, [distancia, arrastrando]);

  // Estilos según variante
  const chipBase = esFlotante
    ? 'rounded-full shadow-lg px-3 py-2 lg:px-3.5 lg:py-2 text-sm lg:text-[13px]'
    : 'rounded-full px-3.5 py-2 text-[13px]';
  const chipInactivo = esFlotante
    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400'
    : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20 hover:text-white hover:border-white/30';
  const chipActivo = esFlotante
    ? 'bg-slate-800 text-white border-slate-800 shadow-slate-300'
    : 'bg-white text-slate-900 border-white shadow-md shadow-white/30';
  const limpiarSize = esFlotante ? 'w-8 h-8 lg:w-9 lg:h-9' : 'w-8 h-8';

  const abrirDropdown = (
    ref: React.RefObject<HTMLButtonElement | null>,
    setPos: (v: { top: number; left: number }) => void,
    toggle: () => void,
    cerrarOtros: () => void,
  ) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    cerrarOtros();
    toggle();
  };

  return (
    <>
      {/* Ubicación — chip con dropdown (dropdown se renderiza en PaginaNegocios) */}
      <div className="relative shrink-0" data-dropdown>
        <button
          ref={btnDistanciaRef}
          onClick={() => {
            if (btnDistanciaRef.current) {
              const rect = btnDistanciaRef.current.getBoundingClientRect();
              setPosDropdownDist({ top: rect.bottom + 8, left: rect.left });
            }
            setDropdownDistancia(!dropdownDistancia);
          }}
          className={`${chipBase} flex items-center gap-1.5 font-semibold transition-all cursor-pointer border w-[140px] justify-center whitespace-nowrap ${
            cercaDeMi ? chipActivo : chipInactivo
          }`}
          data-testid="chip-cerca-de-mi"
        >
          <Locate className="w-3.5 h-3.5" />
          {cercaDeMi ? `${distanciaLocal} km` : 'Mi ciudad'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownDistancia ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Categoría */}
      <div className="relative shrink-0" data-dropdown>
        <button
          ref={btnCategoriaRef}
          onClick={abrirDropdown(
            btnCategoriaRef, setPosicionDropdownCat,
            () => setDropdownCategoria(!dropdownCategoria),
            () => { setDropdownSubcategoria(false); }
          )}
          className={`${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border ${
            categoria ? chipActivo : chipInactivo
          }`}
          data-testid="chip-categoria"
        >
          <Store className="w-3.5 h-3.5" />
          {categoria ? categorias.find(c => c.id === categoria)?.nombre || 'Categoría' : 'Categoría'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownCategoria ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Subcategoría — siempre visible */}
      <div className="relative shrink-0" data-dropdown>
          <button
            ref={btnSubcategoriaRef}
            onClick={categoria && opcionesSubcategorias.length > 0 ? abrirDropdown(
              btnSubcategoriaRef, setPosicionDropdownSub,
              () => setDropdownSubcategoria(!dropdownSubcategoria),
              () => { setDropdownCategoria(false); }
            ) : undefined}
            className={`${chipBase} flex items-center gap-1.5 font-medium transition-all border ${
              !categoria ? 'opacity-40 cursor-default ' + chipInactivo
              : subcategoriasSeleccionadas.length > 0 ? chipActivo : chipInactivo + ' cursor-pointer'
            }`}
            data-testid="chip-subcategoria"
          >
            {subcategoriasSeleccionadas.length > 0
              ? opcionesSubcategorias.find(s => s.id === subcategoriasSeleccionadas[0])?.nombre || 'Sub'
              : 'Subcategoría'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownSubcategoria ? 'rotate-180' : ''}`} />
          </button>
        </div>

      {/* CardYA */}
      <button
        onClick={toggleSoloCardya}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border ${
          soloCardya ? chipActivo : chipInactivo
        }`}
        data-testid="chip-cardya"
      >
        <CreditCard className="w-3.5 h-3.5" />
        CardYA
      </button>

      {/* Envío */}
      <button
        onClick={toggleConEnvio}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border ${
          conEnvio ? chipActivo : chipInactivo
        }`}
        data-testid="chip-envio"
      >
        <Truck className="w-3.5 h-3.5" />
        Envíos
      </button>

      {/* A domicilio */}
      <button
        onClick={toggleConServicioDomicilio}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border ${
          conServicioDomicilio ? chipActivo : chipInactivo
        }`}
        data-testid="chip-servicio-domicilio"
      >
        <Home className="w-3.5 h-3.5" />
        Servicio a domicilio
      </button>

      {/* Limpiar - Siempre visible */}
      <button
        onClick={filtrosActivos() > 0 ? limpiarFiltros : undefined}
        disabled={filtrosActivos() === 0}
        className={`
          shrink-0 rounded-full ${limpiarSize} flex items-center justify-center border transition-all
          ${esFlotante ? 'shadow-lg' : ''}
          ${filtrosActivos() > 0
            ? 'bg-white text-red-500 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-400 cursor-pointer'
            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }
        `}
        title={filtrosActivos() > 0 ? "Limpiar filtros" : "Sin filtros activos"}
        data-testid="chip-limpiar"
      >
        <X className="w-4 h-4" />
      </button>
    </>
  );
}

export default React.memo(ChipsFiltros);