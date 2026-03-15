/**
 * ============================================================================
 * TAB: Operación
 * ============================================================================
 */

import { Banknote, CreditCard, ArrowLeftRight, Truck, Home, Info, AlertTriangle } from 'lucide-react';
import type { DatosOperacion } from '../hooks/usePerfil';

interface TabOperacionProps {
  datosOperacion: DatosOperacion;
  setDatosOperacion: (datos: DatosOperacion) => void;
}

// =============================================================================
// HELPER: Fila toggle reutilizable
// =============================================================================

interface FilaToggleProps {
  icono: React.ReactNode;
  iconoActivo: React.ReactNode;
  label: string;
  descripcion: string;
  activo: boolean;
  colorCheck: string; // clase bg-* para el toggle activo
  colorTexto: string; // clase text-* cuando está activo
  onChange: (valor: boolean) => void;
}

function FilaToggle({ icono, iconoActivo, label, descripcion, activo, colorCheck, colorTexto, onChange }: FilaToggleProps) {
  return (
    <div
      onClick={() => onChange(!activo)}
      className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-100 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${activo ? 'bg-opacity-100' : 'bg-slate-100'}`}
            style={activo ? undefined : undefined}
          >
            {activo ? iconoActivo : icono}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${activo ? colorTexto : 'text-slate-700'}`}>
              {label}
            </span>
            <span className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium truncate">
              {descripcion}
            </span>
          </div>
        </div>
        <label className="relative inline-block w-11 h-6 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => { e.stopPropagation(); onChange(e.target.checked); }}
            className="sr-only peer"
          />
          <div className={`w-11 h-6 rounded-full bg-slate-300 ${colorCheck}`}></div>
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md peer-checked:translate-x-5"></div>
        </label>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function TabOperacion({
  datosOperacion,
  setDatosOperacion,
}: TabOperacionProps) {

  const hayMetodoPago = datosOperacion.metodosPago.efectivo ||
    datosOperacion.metodosPago.tarjeta ||
    datosOperacion.metodosPago.transferencia;

  return (
    <div className="space-y-4 lg:space-y-3 2xl:space-y-4">

      {/* LAYOUT: 2 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4">

        {/* ================================================================ */}
        {/* COLUMNA 1: MÉTODOS DE PAGO */}
        {/* ================================================================ */}

        <div className="space-y-2">
          <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <Banknote className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Métodos de Pago</span>
              <span className="text-red-400 ml-0.5">*</span>
              <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Mínimo 1</span>
            </div>

            {/* Efectivo */}
            <FilaToggle
              icono={<Banknote className="w-4 h-4 text-slate-400" />}
              iconoActivo={<Banknote className="w-4 h-4 text-green-600" />}
              label="Efectivo"
              descripcion="Pagos en efectivo en tu establecimiento"
              activo={datosOperacion.metodosPago.efectivo}
              colorCheck="peer-checked:bg-green-500"
              colorTexto="text-green-700"
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, efectivo: v } })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Tarjeta */}
            <FilaToggle
              icono={<CreditCard className="w-4 h-4 text-slate-400" />}
              iconoActivo={<CreditCard className="w-4 h-4 text-blue-600" />}
              label="Tarjeta"
              descripcion="Débito, crédito o pagos con terminal"
              activo={datosOperacion.metodosPago.tarjeta}
              colorCheck="peer-checked:bg-blue-500"
              colorTexto="text-blue-700"
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, tarjeta: v } })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Transferencia */}
            <FilaToggle
              icono={<ArrowLeftRight className="w-4 h-4 text-slate-400" />}
              iconoActivo={<ArrowLeftRight className="w-4 h-4 text-purple-600" />}
              label="Transferencia"
              descripcion="Transferencias bancarias o apps de pago"
              activo={datosOperacion.metodosPago.transferencia}
              colorCheck="peer-checked:bg-purple-500"
              colorTexto="text-purple-700"
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, transferencia: v } })}
            />

          </div>

          {/* Advertencia */}
          {!hayMetodoPago && (
            <div className="flex items-center gap-2.5 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-red-700">
                Debes seleccionar al menos un método de pago
              </p>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* COLUMNA 2: OPCIONES DE ENTREGA + NOTA */}
        {/* ================================================================ */}

        <div className="space-y-2">
          <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <Truck className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Opciones de Entrega</span>
            </div>

            {/* Envío a Domicilio */}
            <FilaToggle
              icono={<Truck className="w-4 h-4 text-slate-400" />}
              iconoActivo={<Truck className="w-4 h-4 text-emerald-600" />}
              label="Envío a Domicilio"
              descripcion="Envías productos al cliente (tienda, restaurante)"
              activo={datosOperacion.tieneEnvio}
              colorCheck="peer-checked:bg-emerald-500"
              colorTexto="text-emerald-700"
              onChange={(v) => setDatosOperacion({ ...datosOperacion, tieneEnvio: v })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Servicio a Domicilio */}
            <FilaToggle
              icono={<Home className="w-4 h-4 text-slate-400" />}
              iconoActivo={<Home className="w-4 h-4 text-orange-600" />}
              label="Servicio a Domicilio"
              descripcion="Tú vas al domicilio del cliente (plomero, electricista)"
              activo={datosOperacion.tieneServicio}
              colorCheck="peer-checked:bg-orange-500"
              colorTexto="text-orange-700"
              onChange={(v) => setDatosOperacion({ ...datosOperacion, tieneServicio: v })}
            />

          </div>

          {/* Nota informativa */}
          <div className="flex items-center gap-2.5 p-3 bg-blue-100 border-2 border-blue-300 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-sm lg:text-xs 2xl:text-sm text-blue-700 font-medium">
              Los clientes pueden filtrar por estos criterios al buscar negocios.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
