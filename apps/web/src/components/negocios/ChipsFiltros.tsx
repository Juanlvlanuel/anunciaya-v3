// =============================================================================
// COMPONENTE: ChipsFiltros
// Chips de filtros reutilizable (barra flotante sobre mapa y header grid)
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CreditCard,
  Truck,
  X,
  ChevronDown,
  Store,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface ChipsFiltrosProps {
  variante: 'flotante' | 'inline';
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
  filtrosActivos: () => number;
  limpiarFiltros: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ChipsFiltros({
  variante,
  distancia, setDistancia,
  categoria, categorias,
  dropdownCategoria, setDropdownCategoria, btnCategoriaRef, setPosicionDropdownCat,
  opcionesSubcategorias, subcategoriasSeleccionadas,
  dropdownSubcategoria, setDropdownSubcategoria, btnSubcategoriaRef, setPosicionDropdownSub,
  soloCardya, toggleSoloCardya,
  conEnvio, toggleConEnvio,
  filtrosActivos, limpiarFiltros,
}: ChipsFiltrosProps) {
  const esFlotante = variante === 'flotante';

  // Estado local del slider: visual instantáneo, commit al store solo al soltar
  const [distanciaLocal, setDistanciaLocal] = useState(distancia);
  const [arrastrando, setArrastrando] = useState(false);

  // Sincronizar si el store cambia externamente (ej: limpiar filtros)
  useEffect(() => {
    if (!arrastrando) setDistanciaLocal(distancia);
  }, [distancia, arrastrando]);

  // Estilos según variante
  const chipBase = esFlotante
    ? 'rounded-full shadow-lg px-3 py-2 lg:px-3.5 lg:py-2 text-sm lg:text-[13px]'
    : 'rounded-full px-3.5 py-2 text-[13px]';
  const chipInactivo = esFlotante
    ? 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400'
    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400';
  const chipActivo = esFlotante
    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
    : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200';
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
      {/* Distancia — slider inline */}
      <div className="shrink-0 flex items-center gap-2 bg-white/10 rounded-full px-3.5 py-1.5 border border-white/10">
        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-[13px] font-semibold text-white whitespace-nowrap min-w-12 text-center">{distanciaLocal} km</span>
        <input
          type="range"
          min="1"
          max="50"
          value={distanciaLocal}
          onChange={(e) => { setDistanciaLocal(Number(e.target.value)); setArrastrando(true); }}
          onMouseUp={() => { setArrastrando(false); setDistancia(distanciaLocal); }}
          onTouchEnd={() => { setArrastrando(false); setDistancia(distanciaLocal); }}
          className="w-[90px] h-[5px] rounded-full appearance-none cursor-pointer accent-blue-500"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${((distanciaLocal - 1) / 49) * 100}%, rgba(255,255,255,0.15) ${((distanciaLocal - 1) / 49) * 100}%)`,
          }}
        />
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
      >
        <Truck className="w-3.5 h-3.5" />
        Envío
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
      >
        <X className="w-4 h-4" />
      </button>
    </>
  );
}

export default ChipsFiltros;