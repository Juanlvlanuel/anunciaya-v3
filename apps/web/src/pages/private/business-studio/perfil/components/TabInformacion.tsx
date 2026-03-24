/**
 * ============================================================================
 * TAB: Información
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabInformacion.tsx
 */

import { useState, useRef, useEffect } from 'react';
import { Building2, AlignLeft, Tag, MapPin, ChevronDown, Check } from 'lucide-react';
import { useCategorias } from '../../../../../hooks/useCategorias';
import { useSubcategorias } from '../../../../../hooks/useSubcategorias';
import CardYA from './CardYA';
import SelectorCategoria from './SelectorCategoria';
import type { DatosInformacion } from '../hooks/usePerfil';

interface TabInformacionProps {
  datosInformacion: DatosInformacion;
  setDatosInformacion: (datos: DatosInformacion) => void;
}

const ESTILO_INPUT = { border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' } as const;

// ============================================================================
// COMPONENTE LOCAL: SelectorSubcategoria (dropdown multi-select)
// ============================================================================

interface SelectorSubcategoriaProps {
  subcategorias: { id: number; nombre: string }[];
  seleccionados: number[];
  onToggle: (id: number) => void;
  deshabilitado?: boolean;
}

function SelectorSubcategoria({ subcategorias, seleccionados, onToggle, deshabilitado }: SelectorSubcategoriaProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [abierto]);


  useEffect(() => {
    if (!abierto || window.innerWidth >= 1024) return;

    const main = document.querySelector('main');
    if (!main) return;

    const paddingOriginal = main.style.paddingBottom;

    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      let offsetTop = 0;
      let current: HTMLElement | null = el;
      while (current && current !== main) {
        offsetTop += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }

      const targetScroll = offsetTop + el.offsetHeight + 400 - main.clientHeight + 16;
      const extraPadding = Math.max(0, targetScroll - (main.scrollHeight - main.clientHeight));
      if (extraPadding > 0) main.style.paddingBottom = `${extraPadding}px`;

      main.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }, 50);

    return () => {
      clearTimeout(timer);
      main.style.paddingBottom = paddingOriginal;
    };
  }, [abierto]);

  if (deshabilitado) {
    return (
      <div
        className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300 opacity-50 cursor-not-allowed"
      >
        <span className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium flex-1">Elige categoría primero</span>
        <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0" />
      </div>
    );
  }

  const primerNombre = seleccionados.length > 0
    ? subcategorias.find(s => s.id === seleccionados[0])?.nombre
    : null;

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setAbierto(!abierto)}
        className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300 hover:border-slate-400 cursor-pointer gap-2"
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
      >
        <div className="flex-1 flex items-center overflow-hidden min-w-0">
          {seleccionados.length === 0 ? (
            <span className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium truncate">Selecciona hasta 3</span>
          ) : (
            <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800 truncate">{primerNombre}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-base lg:text-sm 2xl:text-base font-bold ${seleccionados.length >= 3 ? 'text-red-600' : 'text-slate-600'}`}>
            {seleccionados.length}/3
          </span>
          <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {abierto && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
          <div className="max-h-[400px] lg:max-h-80 2xl:max-h-[400px] overflow-y-auto py-1">
            {subcategorias.map(sub => {
              const isSelected = seleccionados.includes(sub.id);
              const canSelect = seleccionados.length < 3;
              const disabled = !isSelected && !canSelect;

              return (
                <button
                  key={sub.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(sub.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : disabled
                        ? 'opacity-40 cursor-not-allowed bg-white text-slate-600'
                        : 'hover:bg-blue-50 text-slate-600 font-medium'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-500' : 'bg-slate-200'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-base lg:text-sm 2xl:text-base">{sub.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function TabInformacion({
  datosInformacion,
  setDatosInformacion,
}: TabInformacionProps) {

  const { categorias } = useCategorias();
  const { subcategorias } = useSubcategorias(datosInformacion.categoriaId);

  const handleSubcategoriaToggle = (id: number) => {
    const nuevasSubcategorias = datosInformacion.subcategoriasIds.includes(id)
      ? datosInformacion.subcategoriasIds.filter(subId => subId !== id)
      : [...datosInformacion.subcategoriasIds, id];

    if (nuevasSubcategorias.length <= 3) {
      setDatosInformacion({ ...datosInformacion, subcategoriasIds: nuevasSubcategorias });
    }
  };

  return (
    <div className="space-y-4 lg:space-y-3 2xl:space-y-4">

      {/* ================================================================ */}
      {/* FILA 1: Datos del Negocio + Categorización (2 columnas)         */}
      {/* ================================================================ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4">

        {/* CARD: Datos del Negocio */}
        <div className="bg-white border-2 border-slate-300 rounded-xl"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Building2 className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Datos del Negocio</span>
          </div>

          <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

            {/* Nombre del Negocio */}
            {(datosInformacion.totalSucursales === 1 || datosInformacion.esPrincipal) && (
              <div>
                <label htmlFor="input-nombre-negocio"
                  className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  <Building2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" />
                  Nombre del Negocio <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={ESTILO_INPUT}>
                  <input
                    id="input-nombre-negocio"
                    name="input-nombre-negocio"
                    type="text"
                    value={datosInformacion.nombre}
                    onChange={(e) => setDatosInformacion({ ...datosInformacion, nombre: e.target.value })}
                    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Nombre de la Sucursal */}
            {datosInformacion.totalSucursales > 1 && (
              <div>
                <label htmlFor="input-nombre-sucursal"
                  className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" />
                  {datosInformacion.esPrincipal ? 'Nombre Sucursal Principal' : 'Nombre de la Sucursal'} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={ESTILO_INPUT}>
                  <input
                    id="input-nombre-sucursal"
                    name="input-nombre-sucursal"
                    type="text"
                    value={datosInformacion.nombreSucursal}
                    onChange={(e) => setDatosInformacion({ ...datosInformacion, nombreSucursal: e.target.value })}
                    placeholder={datosInformacion.esPrincipal ? 'Ej: Mi Negocio Centro' : 'Ej: Mi Negocio Plaza Norte'}
                    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Descripción */}
            <div>
              <label htmlFor="input-descripcion-negocio"
                className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                <AlignLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" />
                Descripción
              </label>
              <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={ESTILO_INPUT}>
                <input
                  id="input-descripcion-negocio"
                  name="input-descripcion-negocio"
                  type="text"
                  value={datosInformacion.descripcion}
                  onChange={(e) => setDatosInformacion({ ...datosInformacion, descripcion: e.target.value })}
                  placeholder="Describe tu negocio..."
                  className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                />
              </div>
            </div>

          </div>
        </div>

        {/* CARD: Categorización */}
        <div className="bg-white border-2 border-slate-300 rounded-xl"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Tag className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Categorización</span>
            {datosInformacion.categoriaId > 0 && (
              <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">
                {datosInformacion.subcategoriasIds.length}/3 sub
              </span>
            )}
          </div>

          <div className="p-4 lg:p-3 2xl:p-4">

            {/* 2 columnas: Categoría | Subcategorías */}
            <div className="grid grid-cols-2 gap-3 lg:gap-2 2xl:gap-3">

              {/* Categoría */}
              <div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  Categoría <span className="text-red-500">*</span>
                </div>
                <SelectorCategoria
                  categorias={categorias}
                  categoriaSeleccionada={datosInformacion.categoriaId}
                  onSeleccionar={(id) => setDatosInformacion({
                    ...datosInformacion,
                    categoriaId: id,
                    subcategoriasIds: [],
                  })}
                />
              </div>

              {/* Subcategorías */}
              <div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  Subcategorías
                </div>
                <SelectorSubcategoria
                  subcategorias={subcategorias}
                  seleccionados={datosInformacion.subcategoriasIds}
                  onToggle={handleSubcategoriaToggle}
                  deshabilitado={datosInformacion.categoriaId === 0}
                />
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* ================================================================ */}
      {/* FILA 2: CardYA Widget Horizontal (full width)                   */}
      {/* ================================================================ */}

      <CardYA
        participaCardYA={datosInformacion.participaCardYA}
        onToggle={(valor) => setDatosInformacion({ ...datosInformacion, participaCardYA: valor })}
      />

    </div>
  );
}
