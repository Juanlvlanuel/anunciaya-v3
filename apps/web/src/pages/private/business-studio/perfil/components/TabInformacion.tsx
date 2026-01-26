/**
 * ============================================================================
 * TAB: Información
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabInformacion.tsx
 * 
 * PROPÓSITO:
 * Tab para editar información general del negocio (nombre, categorías, tipo, CardYA)
 * Solo visible para DUEÑOS
 * 
 * FEATURES:
 * - Campo Ciudad condicional para negocios Online
 * - Autocomplete de ciudades
 */

import { useCategorias } from '../../../../../hooks/useCategorias';
import { useSubcategorias } from '../../../../../hooks/useSubcategorias';
import CardYA from './CardYA';
import SelectorCategoria from './SelectorCategoria';
import type { DatosInformacion } from '../hooks/usePerfil';

interface TabInformacionProps {
  datosInformacion: DatosInformacion;
  setDatosInformacion: (datos: DatosInformacion) => void;
}

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

    // Máximo 3 subcategorías
    if (nuevasSubcategorias.length <= 3) {
      setDatosInformacion({
        ...datosInformacion,
        subcategoriasIds: nuevasSubcategorias,
      });
    }
  };

  return (
    <div className="space-y-6">

      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* COLUMNA IZQUIERDA - FORMULARIO */}
        <div className="lg:col-span-7 space-y-6 lg:space-y-4 2xl:space-y-6">

          {/* Nombre + Descripción */}
          <div className="space-y-5 lg:space-y-3 2xl:space-y-5">
            <div>
              <label htmlFor="input-nombre-negocio" className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2 lg:mb-1.5 2xl:mb-2">
                Nombre del Negocio *
              </label>
              <input
                id="input-nombre-negocio"
                name="input-nombre-negocio"
                type="text"
                value={datosInformacion.nombre}
                onChange={(e) => setDatosInformacion({ ...datosInformacion, nombre: e.target.value })}
                className="w-full px-4 py-3 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 text-base lg:text-sm 2xl:text-base bg-slate-50 border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="input-descripcion-negocio" className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2 lg:mb-1.5 2xl:mb-2">
                Descripción (opcional)
              </label>
              <input
                id="input-descripcion-negocio"
                name="input-descripcion-negocio"
                type="text"
                value={datosInformacion.descripcion}
                onChange={(e) => setDatosInformacion({ ...datosInformacion, descripcion: e.target.value })}
                placeholder="Describe tu negocio..."
                className="w-full px-4 py-3 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 text-base lg:text-sm 2xl:text-base bg-slate-50 border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Categorías */}
          <div className="bg-linear-to-br from-slate-50 to-blue-50/30 rounded-xl lg:rounded-lg 2xl:rounded-xl p-5 lg:p-3 2xl:p-5 border-2 border-slate-200 shadow-lg">
            <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-4 lg:mb-3 2xl:mb-4 flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
              <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Categoría y Subcategorías
            </h3>

            <div className="space-y-4 lg:space-y-3 2xl:space-y-4">
              {/* Selector de categoría moderno */}
              <SelectorCategoria
                categorias={categorias}
                categoriaSeleccionada={datosInformacion.categoriaId}
                onSeleccionar={(id) => {
                  setDatosInformacion({
                    ...datosInformacion,
                    categoriaId: id,
                    subcategoriasIds: [], // Reset subcategorías al cambiar categoría
                  });
                }}
              />

              {/* Subcategorías - Grid 2 cols en móvil */}
              {datosInformacion.categoriaId > 0 && (
                <div>
                  <span className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2 lg:mb-1.5 2xl:mb-2">
                    Subcategorías (máx 3) *
                  </span>
                  <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-1.5 2xl:gap-2">
                    {subcategorias.map((sub) => {
                      const isSelected = datosInformacion.subcategoriasIds.includes(sub.id);
                      const canSelect = datosInformacion.subcategoriasIds.length < 3;

                      return (
                        <label
                          key={sub.id}
                          className={`
                            flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-3 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg cursor-pointer text-xs lg:text-xs 2xl:text-sm border-2
                            ${isSelected
                              ? 'bg-blue-50 border-blue-500'
                              : canSelect
                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                            }
                          `}
                        >
                          <input
                            id={`checkbox-subcategoria-${sub.id}`}
                            name={`checkbox-subcategoria-${sub.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSubcategoriaToggle(sub.id)}
                            disabled={!isSelected && !canSelect}
                            className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 accent-blue-600 shrink-0"
                          />
                          <span className={`font-medium leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {sub.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-sm lg:text-xs 2xl:text-sm text-slate-500 mt-2 lg:mt-1.5 2xl:mt-2">
                    {datosInformacion.subcategoriasIds.length} de 3 seleccionadas
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CardYA - SOLO DESKTOP */}
        <div className="hidden lg:block lg:col-span-5 sticky top-4 lg:top-2 2xl:top-4 self-start">
          <CardYA
            participaCardYA={datosInformacion.participaCardYA}
            onToggle={(valor) => setDatosInformacion({ ...datosInformacion, participaCardYA: valor })}
          />
        </div>

      </div>

      {/* CARDYA - ABAJO EN MÓVIL */}
      <div className="lg:hidden">
        <CardYA
          participaCardYA={datosInformacion.participaCardYA}
          onToggle={(valor) => setDatosInformacion({ ...datosInformacion, participaCardYA: valor })}
        />
      </div>

    </div>
  );
}