/**
 * ============================================================================
 * COMPONENTE: PanelFiltros (Exclusivo Móvil)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/negocios/PanelFiltros.tsx
 * 
 * PROPÓSITO:
 * Panel drawer con filtros para la lista de negocios (solo móvil)
 * 
 * CARACTERÍSTICAS:
 * - Dropdown personalizado de categorías
 * - Selector de subcategorías inline
 * - Selector de distancia (rango)
 * - Toggles: Solo CardYA, Con envío
 * - Métodos de pago: Efectivo, Tarjeta, Transferencia
 * - Botón limpiar filtros (rojo, al final)
 * - Botón cerrar (X)
 */

import { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  X,
  CreditCard,
  Truck,
  Loader2,
  ChevronDown,
  Check,
  Banknote,
  Landmark,
} from 'lucide-react';
import { useFiltrosNegociosStore } from '../../stores/useFiltrosNegociosStore';
import { useCategorias } from '../../hooks/useCategorias';
import { useSubcategorias } from '../../hooks/useSubcategorias';

// =============================================================================
// DATOS ESTÁTICOS
// =============================================================================

const OPCIONES_DISTANCIA = [
  { value: 1, label: '1' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
];

// =============================================================================
// TIPOS
// =============================================================================

interface PanelFiltrosProps {
  /** Función para cerrar el drawer */
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelFiltros({ onCerrar }: PanelFiltrosProps) {
  // =============================================================================
  // STORE DE FILTROS
  // =============================================================================

  const {
    distancia,
    soloCardya,
    conEnvio,
    categoria,
    subcategorias,
    metodosPago,
    setCategoria,
    toggleSubcategoria,
    setDistancia,
    toggleSoloCardya,
    toggleConEnvio,
    toggleMetodoPago,
    limpiarFiltros,
    hayFiltrosActivos,
  } = useFiltrosNegociosStore();

  // =============================================================================
  // HOOKS DE CATEGORÍAS
  // =============================================================================

  const {
    categorias,
    loading: loadingCategorias
  } = useCategorias();

  const {
    subcategorias: subcategoriasLista,
    loading: loadingSubcategorias
  } = useSubcategorias(categoria);

  const subcategoriasSeleccionadas = subcategorias;

  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================

  const [dropdownCategoriasAbierto, setDropdownCategoriasAbierto] = useState(false);
  const [subcategoriasExpandidas, setSubcategoriasExpandidas] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // EFECTOS
  // =============================================================================

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownCategoriasAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar subcategorías cuando se cambia de categoría
  useEffect(() => {
    setSubcategoriasExpandidas(false);
  }, [categoria]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleLimpiarTodo = () => {
    setSubcategoriasExpandidas(false);
    setDropdownCategoriasAbierto(false);
    limpiarFiltros();
  };

  const handleSeleccionarCategoria = (catId: number | null) => {
    setCategoria(catId);
    setDropdownCategoriasAbierto(false);
  };

  // =============================================================================
  // HELPERS
  // =============================================================================

  const categoriaSeleccionada = categorias.find(c => c.id === categoria);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="bg-white overflow-hidden h-full">

      {/* HEADER */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Filtros</h2>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="p-4 space-y-4">

        {/* ============================================================= */}
        {/* DISTANCIA MÁXIMA */}
        {/* ============================================================= */}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">
              Distancia máxima
            </label>
            <span className="text-sm font-semibold text-blue-600">
              {distancia} km
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={distancia}
            onChange={(e) => setDistancia(Number(e.target.value))}
            className="
              w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-blue-500
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:bg-blue-500
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer
            "
          />

          <div className="flex gap-1.5 mt-3">
            {OPCIONES_DISTANCIA.map((opcion) => (
              <button
                key={opcion.value}
                onClick={() => setDistancia(opcion.value)}
                className={`
                  flex-1 py-2 rounded-lg text-center transition-colors
                  ${distancia === opcion.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                <div className="text-sm font-semibold">{opcion.label}</div>
                <div className="text-[10px] opacity-70">km</div>
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================= */}
        {/* CATEGORÍA (Dropdown personalizado) */}
        {/* ============================================================= */}

        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Categoría
          </label>

          <button
            type="button"
            onClick={() => setDropdownCategoriasAbierto(!dropdownCategoriasAbierto)}
            className={`
              w-full h-12 px-4 flex items-center justify-between
              border rounded-lg transition-all
              ${dropdownCategoriasAbierto
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-slate-300 hover:border-slate-400'
              }
              ${categoria ? 'bg-blue-50' : 'bg-white'}
            `}
          >
            <div className="flex items-center gap-2">
              {categoriaSeleccionada ? (
                <>
                  <span className="text-lg">{categoriaSeleccionada.icono}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {categoriaSeleccionada.nombre}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-500">Todas las categorías</span>
              )}
            </div>

            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${dropdownCategoriasAbierto ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownCategoriasAbierto && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-300 rounded-xl shadow-xl z-50 max-h-[350px] overflow-y-auto ring-4 ring-blue-100">
              {/* Opción: Todas (sticky) */}
              <button
                type="button"
                onClick={() => handleSeleccionarCategoria(null)}
                className="w-full px-4 py-3 flex items-center justify-center gap-2 sticky top-0 z-10 bg-blue-600 border-b border-blue-700"
              >
                <Check className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white whitespace-nowrap">Todas las categorías</span>
              </button>

              {/* Lista de categorías */}
              {loadingCategorias ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : (
                categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSeleccionarCategoria(cat.id)}
                    className={`
                      w-full px-4 py-2 flex items-center justify-between text-left
                      ${categoria === cat.id ? 'bg-blue-50' : 'hover:bg-slate-50'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.icono}</span>
                      <span className={`text-sm ${categoria === cat.id ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                        {cat.nombre}
                      </span>
                    </div>

                    {categoria === cat.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* SUBCATEGORÍAS (Solo si hay categoría seleccionada) */}
        {/* ============================================================= */}

        {categoria && (
          <div>
            {/* Botón para expandir/colapsar */}
            {!subcategoriasExpandidas ? (
              <button
                type="button"
                onClick={() => setSubcategoriasExpandidas(true)}
                className={`
                  w-full h-12 px-4 flex items-center justify-between
                  border rounded-lg transition-all
                  ${subcategoriasSeleccionadas.length > 0
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">
                    {subcategoriasSeleccionadas.length > 0
                      ? `${subcategoriasSeleccionadas.length} subcategoría${subcategoriasSeleccionadas.length > 1 ? 's' : ''}`
                      : 'Subcategorías'
                    }
                  </span>
                </div>

                <ChevronDown className="w-5 h-5 text-slate-400" />
              </button>
            ) : (
              /* Panel expandido de subcategorías */
              <div className="border-2 border-blue-300 rounded-xl shadow-xl ring-4 ring-blue-100 bg-white overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-blue-600 flex items-center justify-center gap-2 sticky top-0 z-10">
                  <Check className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white">Subcategorías</span>
                  <button
                    type="button"
                    onClick={() => setSubcategoriasExpandidas(false)}
                    className="absolute right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Lista con scroll */}
                <div className="max-h-[350px] overflow-y-auto p-2">
                  {loadingSubcategorias ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  ) : subcategoriasLista.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                      Sin subcategorías disponibles
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {subcategoriasLista.map((sub) => {
                        const isSelected = subcategoriasSeleccionadas.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => toggleSubcategoria(sub.id)}
                            className={`
                              w-full flex items-center justify-between
                              px-3 py-2 rounded-lg transition-colors text-left
                              ${isSelected
                                ? 'bg-blue-100 border border-blue-300'
                                : 'hover:bg-white border border-transparent'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{sub.icono}</span>
                              <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                                {sub.nombre}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer contador */}
                {subcategoriasSeleccionadas.length > 0 && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-center">
                    <span className="text-xs text-blue-600">
                      {subcategoriasSeleccionadas.length} seleccionadas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TOGGLES (Ocultos cuando subcategorías están expandidas) */}
        {/* ============================================================= */}

        {!subcategoriasExpandidas && (
          <div className="space-y-4">

            {/* Toggle: Solo CardYA */}
            <button
              onClick={toggleSoloCardya}
              className={`
                w-full h-12 flex items-center justify-between px-4
                rounded-lg border transition-all
                ${soloCardya
                  ? 'bg-purple-50 border-purple-500'
                  : 'bg-white border-slate-300 hover:border-slate-400'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <CreditCard className={`w-5 h-5 flex-shrink-0 ${soloCardya ? 'text-purple-600' : 'text-slate-600'}`} />
                <span className={`text-sm font-medium whitespace-nowrap ${soloCardya ? 'text-purple-900' : 'text-slate-700'}`}>
                  Acepta CardYA
                </span>
              </div>

              <div className={`w-11 h-6 rounded-full transition-colors relative ${soloCardya ? 'bg-purple-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${soloCardya ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Toggle: Con envío a domicilio */}
            <button
              onClick={toggleConEnvio}
              className={`
                w-full h-12 flex items-center justify-between px-4
                rounded-lg border transition-all
                ${conEnvio
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-slate-300 hover:border-slate-400'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Truck className={`w-5 h-5 flex-shrink-0 ${conEnvio ? 'text-green-600' : 'text-slate-600'}`} />
                <span className={`text-sm font-medium whitespace-nowrap ${conEnvio ? 'text-green-900' : 'text-slate-700'}`}>
                  Con envío
                </span>
              </div>

              <div className={`w-11 h-6 rounded-full transition-colors relative ${conEnvio ? 'bg-green-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${conEnvio ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* ============================================================= */}
            {/* MÉTODOS DE PAGO */}
            {/* ============================================================= */}

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Métodos de pago
              </label>

              <div className="flex gap-2">
                {/* Efectivo */}
                <button
                  type="button"
                  onClick={() => toggleMetodoPago('efectivo')}
                  className={`
                    flex-1 h-12 flex flex-col items-center justify-center
                    rounded-lg border transition-all
                    ${metodosPago.includes('efectivo')
                      ? 'border-2 border-emerald-500 bg-emerald-50'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                    }
                  `}
                >
                  <Banknote className={`w-5 h-5 ${metodosPago.includes('efectivo') ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-medium mt-0.5 ${metodosPago.includes('efectivo') ? 'text-emerald-700' : 'text-slate-600'}`}>
                    Efectivo
                  </span>
                </button>

                {/* Tarjeta */}
                <button
                  type="button"
                  onClick={() => toggleMetodoPago('tarjeta')}
                  className={`
                    flex-1 h-12 flex flex-col items-center justify-center
                    rounded-lg border transition-all
                    ${metodosPago.includes('tarjeta')
                      ? 'border-2 border-emerald-500 bg-emerald-50'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                    }
                  `}
                >
                  <CreditCard className={`w-5 h-5 ${metodosPago.includes('tarjeta') ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-medium mt-0.5 ${metodosPago.includes('tarjeta') ? 'text-emerald-700' : 'text-slate-600'}`}>
                    Tarjeta
                  </span>
                </button>

                {/* Transferencia */}
                <button
                  type="button"
                  onClick={() => toggleMetodoPago('transferencia')}
                  className={`
                    flex-1 h-12 flex flex-col items-center justify-center
                    rounded-lg border transition-all
                    ${metodosPago.includes('transferencia')
                      ? 'border-2 border-emerald-500 bg-emerald-50'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                    }
                  `}
                >
                  <Landmark className={`w-5 h-5 ${metodosPago.includes('transferencia') ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-medium mt-0.5 ${metodosPago.includes('transferencia') ? 'text-emerald-700' : 'text-slate-600'}`}>
                    Transfer.
                  </span>
                </button>
              </div>
            </div>

            {/* ============================================================= */}
            {/* BOTÓN LIMPIAR FILTROS */}
            {/* ============================================================= */}

            {hayFiltrosActivos() && (
              <button
                onClick={handleLimpiarTodo}
                className="w-full mt-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <X className="w-5 h-5" />
                Limpiar filtros
              </button>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PanelFiltros;