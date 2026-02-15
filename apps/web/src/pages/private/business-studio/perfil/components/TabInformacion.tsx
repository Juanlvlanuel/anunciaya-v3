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
    <div className="space-y-5 lg:space-y-3 2xl:space-y-4">

      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 2xl:gap-8">

        {/* COLUMNA IZQUIERDA - FORMULARIO */}
        <div className="lg:col-span-7 space-y-5 lg:space-y-5 2xl:space-y-5">

          {/* Nombre del Negocio - Solo visible si tiene 1 sucursal O si tiene 2+ y la activa es principal */}
          {(datosInformacion.totalSucursales === 1 || datosInformacion.esPrincipal) && (
            <div>
              <label htmlFor="input-nombre-negocio" className="flex items-center gap-2.5 text-base 2xl:text-base lg:text-sm font-bold text-slate-700 mb-2 lg:mb-2 2xl:mb-2">
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Nombre del Negocio <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <input
                  id="input-nombre-negocio"
                  name="input-nombre-negocio"
                  type="text"
                  value={datosInformacion.nombre}
                  onChange={(e) => setDatosInformacion({ ...datosInformacion, nombre: e.target.value })}
                  className="flex-1 bg-transparent outline-none text-lg lg:text-sm 2xl:text-base font-medium text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Nombre de la Sucursal - Solo visible si tiene 2+ sucursales */}
          {datosInformacion.totalSucursales > 1 && (
            <div>
              <label htmlFor="input-nombre-sucursal" className="flex items-center gap-2.5 text-base 2xl:text-base lg:text-sm font-bold text-slate-700 mb-2 lg:mb-2 2xl:mb-2">
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {datosInformacion.esPrincipal ? 'Nombre de la Sucursal Principal' : 'Nombre de la Sucursal'} <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
                style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <input
                  id="input-nombre-sucursal"
                  name="input-nombre-sucursal"
                  type="text"
                  value={datosInformacion.nombreSucursal}
                  onChange={(e) => setDatosInformacion({ ...datosInformacion, nombreSucursal: e.target.value })}
                  placeholder={datosInformacion.esPrincipal ? 'Ej: Mi Negocio Centro' : 'Ej: Mi Negocio Plaza Norte'}
                  className="flex-1 bg-transparent outline-none text-lg lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label htmlFor="input-descripcion-negocio" className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2 lg:mb-2 2xl:mb-2">
              <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Descripción
            </label>
            <div
              className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
              style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <input
                id="input-descripcion-negocio"
                name="input-descripcion-negocio"
                type="text"
                value={datosInformacion.descripcion}
                onChange={(e) => setDatosInformacion({ ...datosInformacion, descripcion: e.target.value })}
                placeholder="Describe tu negocio..."
                className="flex-1 bg-transparent outline-none text-lg lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
          </div>

          {/* Categoría - SIN CARD */}
          <div>
            <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2 lg:mb-2 2xl:mb-2">
              <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Categoría <span className="text-red-500">*</span>
            </div>
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
          </div>

          {/* Subcategorías - SIN CARD */}
          {datosInformacion.categoriaId > 0 && (
            <div>
              <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2 lg:mb-2 2xl:mb-2">
                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Subcategorías • <span className="text-blue-600">{datosInformacion.subcategoriasIds.length} de 3</span>
              </div>
              <div className="flex flex-wrap gap-2.5 lg:gap-2.5 2xl:gap-2.5">
                {subcategorias.map((sub) => {
                  const isSelected = datosInformacion.subcategoriasIds.includes(sub.id);
                  const canSelect = datosInformacion.subcategoriasIds.length < 3;

                  return (
                    <label
                      key={sub.id}
                      className={`
                        inline-flex items-center gap-2.5 px-4 py-2.5 lg:px-4 lg:py-2.5 2xl:px-4 2xl:py-2.5 text-base  lg:text-sm 2xl:text-base font-semibold rounded-lg cursor-pointer border transition-all
                        ${isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : canSelect
                            ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
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
                        className="w-4.5 h-4.5 accent-blue-600 shrink-0"
                      />
                      <span className="leading-tight">
                        {sub.nombre}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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