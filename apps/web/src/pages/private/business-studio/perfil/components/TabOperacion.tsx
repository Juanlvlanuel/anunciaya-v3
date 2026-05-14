/**
 * ============================================================================
 * TAB: Operación
 * ============================================================================
 */

import { Banknote, ArrowLeftRight, Home, Info, AlertTriangle } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const CreditCard = (p: IconoWrapperProps) => <Icon icon={ICONOS.pagos} {...p} />;
const Truck = (p: IconoWrapperProps) => <Icon icon={ICONOS.envio} {...p} />;
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
  onChange: (valor: boolean) => void;
}

function FilaToggle({ icono, iconoActivo, label, descripcion, activo, onChange }: FilaToggleProps) {
  return (
    <div
      onClick={() => onChange(!activo)}
      className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-100 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg shrink-0 bg-slate-100">
            {activo ? iconoActivo : icono}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${activo ? 'text-slate-700' : 'text-slate-400'}`}>
              {label}
            </span>
            <span className={`text-sm lg:text-xs 2xl:text-sm font-medium truncate ${activo ? 'text-slate-600' : 'text-slate-400'}`}>
              {descripcion}
            </span>
          </div>
        </div>
        <label className="shrink-0 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            name="toggleOperacion"
            checked={activo}
            onChange={(e) => { e.stopPropagation(); onChange(e.target.checked); }}
            className="sr-only"
          />
          <div className="relative w-12 h-6 lg:w-10 lg:h-5">
            <div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors"></div>
            <div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5"></div>
          </div>
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
          <div className="bg-white border-2 border-slate-300 rounded-xl"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Header */}
            <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                <Banknote className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
              </div>
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Métodos de Pago</span>
              <span className="text-red-400 ml-0.5">*</span>
              <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Mínimo 1</span>
            </div>

            {/* Efectivo */}
            <FilaToggle
              icono={<Banknote className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              iconoActivo={<Banknote className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              label="Efectivo"
              descripcion="Pagos en efectivo en tu establecimiento"
              activo={datosOperacion.metodosPago.efectivo}
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, efectivo: v } })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Tarjeta */}
            <FilaToggle
              icono={<CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              iconoActivo={<CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              label="Tarjeta"
              descripcion="Débito, crédito o pagos con terminal"
              activo={datosOperacion.metodosPago.tarjeta}
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, tarjeta: v } })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Transferencia */}
            <FilaToggle
              icono={<ArrowLeftRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              iconoActivo={<ArrowLeftRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              label="Transferencia"
              descripcion="Transferencias bancarias o apps de pago"
              activo={datosOperacion.metodosPago.transferencia}
              onChange={(v) => setDatosOperacion({ ...datosOperacion, metodosPago: { ...datosOperacion.metodosPago, transferencia: v } })}
            />

          </div>

          {/* Advertencia */}
          {!hayMetodoPago && (
            <div className="flex items-center gap-2.5 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
              <AlertTriangle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" />
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
          <div className="bg-white border-2 border-slate-300 rounded-xl"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Header */}
            <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                <Truck className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
              </div>
              <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Opciones de Entrega</span>
            </div>

            {/* Envío a Domicilio */}
            <FilaToggle
              icono={<Truck className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              iconoActivo={<Truck className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              label="Envío a Domicilio"
              descripcion="Envías productos al cliente (tienda, restaurante)"
              activo={datosOperacion.tieneEnvio}
              onChange={(v) => setDatosOperacion({ ...datosOperacion, tieneEnvio: v })}
            />

            <div className="border-t border-slate-200"></div>

            {/* Servicio a Domicilio */}
            <FilaToggle
              icono={<Home className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              iconoActivo={<Home className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />}
              label="Servicio a Domicilio"
              descripcion="Tú vas al domicilio del cliente (plomero, electricista)"
              activo={datosOperacion.tieneServicio}
              onChange={(v) => setDatosOperacion({ ...datosOperacion, tieneServicio: v })}
            />

          </div>

          {/* Nota informativa */}
          <div className="flex items-center gap-2.5 p-3 bg-amber-100 border-2 border-amber-300 rounded-lg">
            <Info className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-600 shrink-0" />
            <p className="text-sm lg:text-xs 2xl:text-sm text-amber-700 font-medium">
              Los clientes pueden filtrar por estos criterios al buscar negocios.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
