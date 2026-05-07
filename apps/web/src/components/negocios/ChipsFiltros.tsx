// =============================================================================
// COMPONENTE: ChipsFiltros
// Chips de filtros reutilizable (barra flotante sobre mapa y header grid)
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Locate,
  CreditCard,
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
  /** [legacy] Mantenido para variante flotante / paneles que aún los usan. */
  conEnvio: boolean;
  toggleConEnvio: () => void;
  conServicioDomicilio: boolean;
  toggleConServicioDomicilio: () => void;
  /** Filtro combinado "A domicilio" (OR de envío + servicio domicilio). */
  aDomicilio: boolean;
  toggleADomicilio: () => void;
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
  conEnvio: _conEnvio, toggleConEnvio: _toggleConEnvio,
  conServicioDomicilio: _conServicioDomicilio, toggleConServicioDomicilio: _toggleConServicioDomicilio,
  aDomicilio, toggleADomicilio,
  dropdownDistancia: _dropdownDistancia, setDropdownDistancia: _setDropdownDistancia,
  posDropdownDist: _posDropdownDist, setPosDropdownDist: _setPosDropdownDist,
  filtrosActivos, limpiarFiltros,
}: ChipsFiltrosProps) {
  const esFlotante = variante === 'flotante';

  // Estado local del slider: visual instantáneo, commit al store solo al soltar
  const [distanciaLocal, setDistanciaLocal] = useState(distancia);
  const [arrastrando] = useState(false);

  // Dropdown del chip secundario "📍 N km ▾" — usa createPortal a document.body
  // (igual que el toggle Mapa/Lista de PaginaNegocios) para evitar que el
  // overflow-hidden del header dark lo recorte. Posición fixed con coords
  // calculadas desde el botón con getBoundingClientRect.
  const [dropdownRadioAbierto, setDropdownRadioAbierto] = useState(false);
  const [posDropdownRadio, setPosDropdownRadio] = useState({ top: 0, left: 0 });
  const btnRadioRef = useRef<HTMLButtonElement>(null);
  const dropdownRadioRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown del radio al hacer click fuera.
  useEffect(() => {
    if (!dropdownRadioAbierto) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const enBoton = btnRadioRef.current?.contains(target);
      const enDropdown = dropdownRadioRef.current?.contains(target);
      if (!enBoton && !enDropdown) {
        setDropdownRadioAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownRadioAbierto]);

  const abrirDropdownRadio = () => {
    if (btnRadioRef.current) {
      const rect = btnRadioRef.current.getBoundingClientRect();
      setPosDropdownRadio({ top: rect.bottom + 8, left: rect.left });
    }
    setDropdownRadioAbierto((v) => !v);
  };

  // Sincronizar si el store cambia externamente (ej: limpiar filtros)
  useEffect(() => {
    if (!arrastrando) setDistanciaLocal(distancia);
  }, [distancia, arrastrando]);

  // Estilos según variante. La variante 'inline' iguala al chip dark de
  // MarketPlace/Ofertas con la identidad temática de Negocios (blue).
  const chipBase = esFlotante
    ? 'rounded-full shadow-lg px-3 py-2 lg:px-3.5 lg:py-2 text-sm lg:text-[13px]'
    : 'rounded-full px-3.5 py-1.5 text-sm font-semibold';
  const chipInactivo = esFlotante
    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400'
    : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-blue-400/60';
  const chipActivo = esFlotante
    ? 'bg-slate-800 text-white border-slate-800 shadow-slate-300'
    : 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20';
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
      {/* Cerca de ti — toggle simple. Click activa/desactiva el filtro de
          proximidad. Cuando está activo, el feed filtra a `distancia` km
          (default 5km, ajustable con el chip secundario). */}
      <button
        onClick={toggleCercaDeMi}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 whitespace-nowrap ${cercaDeMi ? chipActivo : chipInactivo
          }`}
        data-testid="chip-cerca-de-ti"
      >
        <Locate className="w-4 h-4" strokeWidth={2.5} />
        Cerca de ti
      </button>

      {/* Chip secundario: ajuste del radio. Solo aparece cuando "Cerca de ti"
          está activo. Tiene su propio dropdown con slider 1-50 km que actualiza
          la distancia en tiempo real (sin botón Aplicar). El dropdown se
          renderiza con createPortal a document.body para evitar que el
          overflow-hidden del header dark lo recorte. */}
      {cercaDeMi && (
        <button
          ref={btnRadioRef}
          onClick={abrirDropdownRadio}
          className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 whitespace-nowrap ${chipInactivo}`}
          data-testid="chip-radio-distancia"
          aria-label={`Radio de búsqueda: ${distanciaLocal} kilómetros`}
        >
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-sm shadow-blue-400/60" />
          <span className="tabular-nums">{distanciaLocal} km</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${dropdownRadioAbierto ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      )}

      {/* Dropdown del radio — portal a document.body para escapar del
          overflow-hidden del header dark. Estilo "panel de control" dark
          minimalista: fondo casi negro, accent blue eléctrico, presets
          rápidos, sin uppercase ni tracking-wider. */}
      {cercaDeMi && dropdownRadioAbierto && createPortal(
        <div
          ref={dropdownRadioRef}
          data-dropdown
          data-testid="dropdown-radio-distancia"
          className="fixed z-99999 w-72 rounded-2xl bg-slate-100 p-4 border border-slate-300 shadow-md"
          style={{ top: posDropdownRadio.top, left: posDropdownRadio.left }}
        >
          {/* Header con valor destacado a la derecha */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Locate className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />
              <span className="text-[13px] font-semibold text-slate-700">
                Distancia
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-extrabold tabular-nums text-slate-900 leading-none">
                {distanciaLocal}
              </span>
              <span className="text-xs font-bold text-blue-500">km</span>
            </div>
          </div>

          {/* Slider con thumb halo */}
          <input
            type="range"
            min="1"
            max="50"
            value={distanciaLocal}
            onChange={(e) => {
              const valor = Number(e.target.value);
              setDistanciaLocal(valor);
              setDistancia(valor);
            }}
            aria-label="Radio en kilómetros"
            className="mt-4 w-full cursor-pointer appearance-none rounded-full h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((distanciaLocal - 1) / 49) * 100}%, #cbd5e1 ${((distanciaLocal - 1) / 49) * 100}%, #cbd5e1 100%)`,
            }}
            data-testid="slider-radio-distancia"
          />

          {/* Presets rápidos */}
          <div className="mt-4 flex gap-1.5">
            {[1, 5, 10, 25, 50].map((preset) => {
              const activo = distanciaLocal === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDistanciaLocal(preset);
                    setDistancia(preset);
                  }}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${activo
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200/70'
                    }`}
                  data-testid={`preset-radio-${preset}`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Categoría */}
      <div className="relative shrink-0" data-dropdown>
        <button
          ref={btnCategoriaRef}
          onClick={(e) => {
            e.stopPropagation();
            // Usamos `e.currentTarget` directo (siempre apunta al botón
            // clickeado). Más confiable que refs prop-drilled, evita
            // race conditions con timing de getBoundingClientRect.
            const rect = e.currentTarget.getBoundingClientRect();
            setPosicionDropdownCat({ top: rect.bottom + 8, left: rect.left });
            setDropdownSubcategoria(false);
            setDropdownCategoria(!dropdownCategoria);
          }}
          className={`${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 w-[140px] ${
            categoria ? chipActivo : chipInactivo
          }`}
          data-testid="chip-categoria"
        >
          <Store className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span className="flex-1 truncate text-left">
            {categoria ? categorias.find(c => c.id === categoria)?.nombre || 'Categoría' : 'Categoría'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${dropdownCategoria ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Subcategoría — solo visible cuando hay categoría activa con subcategorías
          disponibles. Si no, se oculta para ahorrar espacio en el header. */}
      {categoria && opcionesSubcategorias.length > 0 && (
        <div className="relative shrink-0" data-dropdown>
          <button
            ref={btnSubcategoriaRef}
            onClick={(e) => {
              e.stopPropagation();
              // Usamos `e.currentTarget` directo (siempre apunta al botón
              // clickeado). Más confiable que refs prop-drilled.
              const rect = e.currentTarget.getBoundingClientRect();
              setPosicionDropdownSub({ top: rect.bottom + 8, left: rect.left });
              setDropdownCategoria(false);
              setDropdownSubcategoria(!dropdownSubcategoria);
            }}
            className={`${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 w-[140px] ${
              subcategoriasSeleccionadas.length > 0 ? chipActivo : chipInactivo
            }`}
            data-testid="chip-subcategoria"
          >
            <span className="flex-1 truncate text-left">
              {subcategoriasSeleccionadas.length > 0
                ? opcionesSubcategorias.find(s => s.id === subcategoriasSeleccionadas[0])?.nombre || 'Sub'
                : 'Subcategoría'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${dropdownSubcategoria ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* CardYA */}
      <button
        onClick={toggleSoloCardya}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 ${
          soloCardya ? chipActivo : chipInactivo
        }`}
        data-testid="chip-cardya"
      >
        <CreditCard className="w-4 h-4" strokeWidth={2.5} />
        CardYA
      </button>

      {/* A domicilio — toggle del flag combinado del backend (OR).
          El backend interpreta `aDomicilio=true` como una unión: muestra
          negocios con envío O servicio a domicilio (o ambos). */}
      <button
        onClick={toggleADomicilio}
        className={`shrink-0 ${chipBase} flex items-center gap-1.5 font-medium transition-all cursor-pointer border-2 whitespace-nowrap ${aDomicilio ? chipActivo : chipInactivo
          }`}
        data-testid="chip-a-domicilio"
      >
        <Home className="w-4 h-4" strokeWidth={2.5} />
        A domicilio
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