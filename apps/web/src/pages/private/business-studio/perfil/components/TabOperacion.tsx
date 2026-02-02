/**
 * ============================================================================
 * TAB: Operación (REDISEÑO MODERNO v2.0)
 * ============================================================================
 */

import { Banknote, CreditCard, ArrowLeftRight, Truck, Home, Info, AlertTriangle } from 'lucide-react';
import type { DatosOperacion } from '../hooks/usePerfil';

interface TabOperacionProps {
  datosOperacion: DatosOperacion;
  setDatosOperacion: (datos: DatosOperacion) => void;
}

export default function TabOperacion({
  datosOperacion,
  setDatosOperacion,
}: TabOperacionProps) {

  const hayMetodoPago = datosOperacion.metodosPago.efectivo || 
                        datosOperacion.metodosPago.tarjeta || 
                        datosOperacion.metodosPago.transferencia;

  return (
    <div className="space-y-5 lg:space-y-3 2xl:space-y-5">

      {/* ========================================================================= */}
      {/* SECCIÓN 1: MÉTODOS DE PAGO */}
      {/* ========================================================================= */}
      
      <div className="space-y-3 lg:space-y-2 2xl:space-y-3">
        <div>
          <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">
            <Banknote className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
            Métodos de Pago
            <span className="text-red-500">*</span>
          </div>
          <p className="text-sm text-slate-600">
            Selecciona los métodos de pago que aceptas. <span className="font-semibold text-slate-700">Mínimo 1 requerido.</span>
          </p>
        </div>

        {/* Card única con todas las opciones */}
        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
          
          {/* Efectivo */}
          <div 
            onClick={() => setDatosOperacion({
              ...datosOperacion,
              metodosPago: { ...datosOperacion.metodosPago, efectivo: !datosOperacion.metodosPago.efectivo }
            })}
            className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${datosOperacion.metodosPago.efectivo ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <Banknote className={`w-4 h-4 ${datosOperacion.metodosPago.efectivo ? 'text-green-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${datosOperacion.metodosPago.efectivo ? 'text-green-700' : 'text-slate-700'}`}>
                    Efectivo
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-500 truncate hidden lg:inline">
                    Pagos en efectivo en tu establecimiento
                  </span>
                </div>
              </div>
              <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={datosOperacion.metodosPago.efectivo}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDatosOperacion({
                      ...datosOperacion,
                      metodosPago: { ...datosOperacion.metodosPago, efectivo: e.target.checked }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-green-500 rounded-full transition-all"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-200"></div>

          {/* Tarjeta */}
          <div 
            onClick={() => setDatosOperacion({
              ...datosOperacion,
              metodosPago: { ...datosOperacion.metodosPago, tarjeta: !datosOperacion.metodosPago.tarjeta }
            })}
            className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${datosOperacion.metodosPago.tarjeta ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <CreditCard className={`w-4 h-4 ${datosOperacion.metodosPago.tarjeta ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${datosOperacion.metodosPago.tarjeta ? 'text-blue-700' : 'text-slate-700'}`}>
                    Tarjeta
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-500 truncate hidden lg:inline">
                    Débito, crédito o pagos con terminal
                  </span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={datosOperacion.metodosPago.tarjeta}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDatosOperacion({
                      ...datosOperacion,
                      metodosPago: { ...datosOperacion.metodosPago, tarjeta: e.target.checked }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-500 rounded-full transition-all"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-200"></div>

          {/* Transferencia */}
          <div 
            onClick={() => setDatosOperacion({
              ...datosOperacion,
              metodosPago: { ...datosOperacion.metodosPago, transferencia: !datosOperacion.metodosPago.transferencia }
            })}
            className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${datosOperacion.metodosPago.transferencia ? 'bg-purple-100' : 'bg-slate-100'}`}>
                  <ArrowLeftRight className={`w-4 h-4 ${datosOperacion.metodosPago.transferencia ? 'text-purple-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${datosOperacion.metodosPago.transferencia ? 'text-purple-700' : 'text-slate-700'}`}>
                    Transferencia
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-500 truncate hidden lg:inline">
                    Transferencias bancarias o apps de pago
                  </span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={datosOperacion.metodosPago.transferencia}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDatosOperacion({
                      ...datosOperacion,
                      metodosPago: { ...datosOperacion.metodosPago, transferencia: e.target.checked }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-purple-500 rounded-full transition-all"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>

        </div>

        {/* Advertencia si no hay métodos seleccionados */}
        {!hayMetodoPago && (
          <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-300 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              Debes seleccionar al menos un método de pago
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: OPCIONES DE ENTREGA */}
      {/* ========================================================================= */}

      <div className="space-y-3 mt-10 lg:space-y-2 2xl:space-y-3">
        <div>
          <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">
            <Truck className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
            Opciones de Entrega
          </div>
          <p className="text-sm text-slate-600">
            Indica si ofreces envío de productos o servicios a domicilio.
          </p>
        </div>

        {/* Card única con todas las opciones */}
        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
          
          {/* Envío a Domicilio */}
          <div 
            onClick={() => setDatosOperacion({ ...datosOperacion, tieneEnvio: !datosOperacion.tieneEnvio })}
            className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${datosOperacion.tieneEnvio ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <Truck className={`w-4 h-4 ${datosOperacion.tieneEnvio ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${datosOperacion.tieneEnvio ? 'text-emerald-700' : 'text-slate-700'}`}>
                    Envío a Domicilio
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-500 truncate hidden lg:inline">
                    Envías productos al cliente (tienda, restaurante, farmacia)
                  </span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={datosOperacion.tieneEnvio}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDatosOperacion({ ...datosOperacion, tieneEnvio: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-emerald-500 rounded-full transition-all"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-200"></div>

          {/* Servicio a Domicilio */}
          <div 
            onClick={() => setDatosOperacion({ ...datosOperacion, tieneServicio: !datosOperacion.tieneServicio })}
            className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${datosOperacion.tieneServicio ? 'bg-orange-100' : 'bg-slate-100'}`}>
                  <Home className={`w-4 h-4 ${datosOperacion.tieneServicio ? 'text-orange-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${datosOperacion.tieneServicio ? 'text-orange-700' : 'text-slate-700'}`}>
                    Servicio a Domicilio
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-500 truncate hidden lg:inline">
                    Tú vas al domicilio del cliente (plomero, electricista)
                  </span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={datosOperacion.tieneServicio}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDatosOperacion({ ...datosOperacion, tieneServicio: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-checked:bg-orange-500 rounded-full transition-all"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOTA INFORMATIVA */}
      {/* ========================================================================= */}

      <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">
          Los clientes pueden filtrar por estos criterios al buscar negocios.
        </p>
      </div>

    </div>
  );
}