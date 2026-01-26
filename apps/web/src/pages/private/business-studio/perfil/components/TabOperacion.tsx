/**
 * ============================================================================
 * TAB: Operación
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabOperacion.tsx
 * 
 * PROPÓSITO:
 * Tab para configurar métodos de pago y opciones de entrega
 * 
 * CARACTERÍSTICAS:
 * - Métodos de pago: Efectivo, Tarjeta, Transferencia
 * - Opciones de entrega: Envío a Domicilio, Servicio a Domicilio
 * - Grid responsive: 2 cols (mobile) / 3 cols (laptop/desktop)
 * - Checkboxes grandes con iconos y colores distintivos
 * - 100% responsive
 */

import type { DatosOperacion } from '../hooks/usePerfil';

interface TabOperacionProps {
  datosOperacion: DatosOperacion;
  setDatosOperacion: (datos: DatosOperacion) => void;
}

export default function TabOperacion({
  datosOperacion,
  setDatosOperacion,
}: TabOperacionProps) {

  return (
    <div className="space-y-5 lg:space-y-6 2xl:space-y-8">

      {/* ========================================================================= */}
      {/* SECCIÓN 1: MÉTODOS DE PAGO */}
      {/* ========================================================================= */}
      
      <div className="space-y-3 lg:space-y-3 2xl:space-y-4">
        <div>
          <h3 className="text-base lg:text-base 2xl:text-lg font-bold text-slate-800 mb-1">
            Métodos de Pago <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm lg:text-sm 2xl:text-base text-slate-600">
            Selecciona los métodos de pago que aceptas en tu negocio. <span className="font-semibold text-slate-700">Mínimo 1 requerido.</span>
          </p>
        </div>

        {/* Grid de Métodos de Pago - 3 columnas */}
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-3 lg:gap-3 2xl:gap-4">
          
          {/* Efectivo */}
          <label className={`
            flex items-center gap-2 lg:gap-2 2xl:gap-2.5 px-3 lg:px-3 2xl:px-5 py-3 lg:py-3 2xl:py-4 rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all border-2
            ${datosOperacion.metodosPago.efectivo
              ? 'bg-linear-to-br from-green-50 to-emerald-50 border-green-500'
              : 'bg-white border-slate-200 hover:border-green-300'
            }
          `}>
            <input
              type="checkbox"
              checked={datosOperacion.metodosPago.efectivo}
              onChange={(e) => setDatosOperacion({
                ...datosOperacion,
                metodosPago: { ...datosOperacion.metodosPago, efectivo: e.target.checked }
              })}
              className="w-4 lg:w-4 2xl:w-5 h-4 lg:h-4 2xl:h-5 accent-green-600"
            />
            <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-green-700">Efectivo</span>
          </label>

          {/* Tarjeta */}
          <label className={`
            flex items-center gap-2 lg:gap-2 2xl:gap-2.5 px-3 lg:px-3 2xl:px-5 py-3 lg:py-3 2xl:py-4 rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all border-2
            ${datosOperacion.metodosPago.tarjeta
              ? 'bg-linear-to-br from-blue-50 to-indigo-50 border-blue-500'
              : 'bg-white border-slate-200 hover:border-blue-300'
            }
          `}>
            <input
              type="checkbox"
              checked={datosOperacion.metodosPago.tarjeta}
              onChange={(e) => setDatosOperacion({
                ...datosOperacion,
                metodosPago: { ...datosOperacion.metodosPago, tarjeta: e.target.checked }
              })}
              className="w-4 lg:w-4 2xl:w-5 h-4 lg:h-4 2xl:h-5 accent-blue-600"
            />
            <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-blue-700">Tarjeta</span>
          </label>

          {/* Transferencia */}
          <label className={`
            flex items-center gap-2 lg:gap-2 2xl:gap-2.5 px-3 lg:px-3 2xl:px-5 py-3 lg:py-3 2xl:py-4 rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all border-2
            ${datosOperacion.metodosPago.transferencia
              ? 'bg-linear-to-br from-purple-50 to-violet-50 border-purple-500'
              : 'bg-white border-slate-200 hover:border-purple-300'
            }
          `}>
            <input
              type="checkbox"
              checked={datosOperacion.metodosPago.transferencia}
              onChange={(e) => setDatosOperacion({
                ...datosOperacion,
                metodosPago: { ...datosOperacion.metodosPago, transferencia: e.target.checked }
              })}
              className="w-4 lg:w-4 2xl:w-5 h-4 lg:h-4 2xl:h-5 accent-purple-600"
            />
            <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-purple-700">Transferencia</span>
          </label>

        </div>

        {/* Advertencia si no hay métodos seleccionados */}
        {!datosOperacion.metodosPago.efectivo && 
         !datosOperacion.metodosPago.tarjeta && 
         !datosOperacion.metodosPago.transferencia && (
          <div className="flex items-start gap-2 lg:gap-1.5 2xl:gap-2 p-3 lg:p-2.5 2xl:p-3 bg-red-50 border-2 border-red-300 rounded-xl lg:rounded-lg 2xl:rounded-xl">
            <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-red-700">
              Debes seleccionar al menos un método de pago
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: OPCIONES DE ENTREGA */}
      {/* ========================================================================= */}

      <div className="space-y-3 lg:space-y-3 2xl:space-y-4">
        <div>
          <h3 className="text-base lg:text-base 2xl:text-lg font-bold text-slate-800 mb-1">
            Opciones de Entrega
          </h3>
          <p className="text-sm lg:text-sm 2xl:text-base text-slate-600">
            Indica si ofreces envío de productos o servicios a domicilio.
          </p>
        </div>

        {/* Grid de Opciones de Entrega - 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3 lg:gap-3 2xl:gap-4">
          
          {/* Envío a Domicilio */}
          <label className={`
            flex flex-col gap-2 lg:gap-2 2xl:gap-3 px-4 lg:px-4 2xl:px-5 py-3 lg:py-4 2xl:py-5 rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all border-2
            ${datosOperacion.tieneEnvio
              ? 'bg-linear-to-br from-emerald-50 to-teal-50 border-emerald-500'
              : 'bg-white border-slate-200 hover:border-emerald-300'
            }
          `}>
            <div className="flex items-center gap-2 lg:gap-2 2xl:gap-2.5">
              <input
                type="checkbox"
                checked={datosOperacion.tieneEnvio}
                onChange={(e) => setDatosOperacion({ ...datosOperacion, tieneEnvio: e.target.checked })}
                className="w-4 lg:w-4 2xl:w-5 h-4 lg:h-4 2xl:h-5 accent-emerald-600"
              />
              <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-emerald-700">Envío a Domicilio</span>
            </div>
            <p className="text-xs lg:text-xs 2xl:text-sm text-slate-600 pl-6 lg:pl-7 2xl:pl-8">
              Envías productos al cliente (tienda, farmacia, restaurante)
            </p>
          </label>

          {/* Servicio a Domicilio */}
          <label className={`
            flex flex-col gap-2 lg:gap-2 2xl:gap-3 px-4 lg:px-4 2xl:px-5 py-3 lg:py-4 2xl:py-5 rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all border-2
            ${datosOperacion.tieneServicio
              ? 'bg-linear-to-br from-orange-50 to-amber-50 border-orange-500'
              : 'bg-white border-slate-200 hover:border-orange-300'
            }
          `}>
            <div className="flex items-center gap-2 lg:gap-2 2xl:gap-2.5">
              <input
                type="checkbox"
                checked={datosOperacion.tieneServicio}
                onChange={(e) => setDatosOperacion({ ...datosOperacion, tieneServicio: e.target.checked })}
                className="w-4 lg:w-4 2xl:w-5 h-4 lg:h-4 2xl:h-5 accent-orange-600"
              />
              <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-orange-700">Servicio a Domicilio</span>
            </div>
            <p className="text-xs lg:text-xs 2xl:text-sm text-slate-600 pl-6 lg:pl-7 2xl:pl-8">
              Tú vas al domicilio del cliente (plomero, electricista, masajista)
            </p>
          </label>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOTA INFORMATIVA */}
      {/* ========================================================================= */}

      <div className="flex items-start gap-2 lg:gap-2 2xl:gap-3 p-3 lg:p-3.5 2xl:p-5 bg-blue-50 border-2 border-blue-300 rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md">
        <svg className="w-5 lg:w-5 2xl:w-6 h-5 lg:h-5 2xl:h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm lg:text-sm 2xl:text-base font-semibold text-blue-900 mb-1">¿Por qué es importante?</p>
          <p className="text-xs lg:text-xs 2xl:text-sm text-blue-700">
            Los clientes pueden filtrar por estos criterios al buscar negocios.
          </p>
        </div>
      </div>

    </div>
  );
}