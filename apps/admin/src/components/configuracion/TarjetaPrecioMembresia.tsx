/**
 * TarjetaPrecioMembresia.tsx
 * ==========================
 * Tarjeta del módulo Configuración para el PRECIO de la membresía comercial (Sprint Stripe · Pieza 1c).
 * Va SEPARADA de los campos editables simples porque toca Stripe (los Prices son inmutables → se crean
 * nuevos). Dos controles independientes, sin mezclarlos:
 *
 *   - Precio mensual  → botón "Cambiar" + diálogo (solo el monto mensual).
 *   - Plan anual      → toggle ON/OFF (crea o archiva el Price anual = 10× el mensual, 2 meses gratis).
 *
 * Cambiar el precio o togglear el anual reapunta la config (de donde lee el checkout, §1b) SIN redeploy.
 * Las suscripciones vigentes NO se migran (Stripe las deja en su precio anterior). Solo superadmin.
 *
 * Ubicación: apps/admin/src/components/configuracion/TarjetaPrecioMembresia.tsx
 */

import { useState } from 'react';
import { Tag, CalendarRange, AlertTriangle, Check } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { PanelAcordeon } from './PanelAcordeon';
import { useConfigPublica } from '../../hooks/queries/usePrecioMembresia';
import { useCambiarPrecioMensual, useActivarPlanAnual } from '../../hooks/queries/useConfiguracionAdmin';

/** El plan anual se cobra como 10 meses (2 gratis), consistente con el backend y el alta manual. */
const FACTOR_ANUAL = 10;
const PRECIO_MIN = 100;
const PRECIO_MAX = 100000;
const FMT = new Intl.NumberFormat('es-MX');
const pesos = (n: number) => `$${FMT.format(n)}`;

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

/** Cuadro neutro con ícono (estilo profesional, no caricaturesco). */
function CajaIcono({ Icono }: { Icono: typeof Tag }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-borde bg-superficie-2 text-texto-3">
      <Icono size={16} />
    </span>
  );
}

/** Switch ON/OFF sobrio (marca cuando activo, borde cuando apagado). */
function Switch({ activo, onClick, disabled }: { activo: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={onClick}
      disabled={disabled}
      data-testid="toggle-plan-anual"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${activo ? 'bg-marca' : 'bg-borde-fuerte'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${activo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

// =============================================================================
// DIÁLOGO: cambiar SOLO el precio mensual
// =============================================================================

function DialogoCambiarPrecioMensual({
  actualMensual,
  anualActivo,
  onCerrar,
}: {
  actualMensual: number;
  anualActivo: boolean;
  onCerrar: () => void;
}) {
  const cambiar = useCambiarPrecioMensual();
  const [valor, setValor] = useState(String(actualMensual));

  const n = Number(valor);
  const valido = valor.trim() !== '' && Number.isInteger(n) && n >= PRECIO_MIN && n <= PRECIO_MAX;
  const cambiado = n !== actualMensual;
  const puede = valido && cambiado && !cambiar.isPending;

  const enviar = () => {
    if (!puede) return;
    cambiar.mutate(n, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Cambiar precio mensual"
      iconoTitulo={<span className="grid h-8 w-8 place-items-center rounded-[9px] bg-marca-suave text-marca"><Tag size={16} /></span>}
      ancho="sm"
      discriminador="precio-mensual"
    >
      <div className="p-5" data-testid="dialogo-precio-mensual">
        <label className={LABEL}>Nuevo precio mensual</label>
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold text-texto-3">$</span>
          <input
            inputMode="numeric"
            autoFocus
            data-testid="precio-input"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            className={`${CLASE_CAMPO} w-32 text-center text-[18px] font-bold`}
          />
          <span className="text-[14px] text-texto-3">MXN / mes</span>
        </div>

        {valor.trim() !== '' && !valido && (
          <p className="mt-1.5 text-[12px] font-medium text-peligro">
            Escribe un entero entre {pesos(PRECIO_MIN)} y {pesos(PRECIO_MAX)}.
          </p>
        )}
        {anualActivo && valido && (
          <p className="mt-2.5 text-[12.5px] text-texto-3">
            El plan anual (activo) se recalculará a <b className="font-semibold text-texto">{pesos(n * FACTOR_ANUAL)}</b> (10 meses).
          </p>
        )}

        <div className="mt-4 flex gap-2.5 rounded-[10px] border border-borde-fuerte bg-superficie px-3 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-texto-2" />
          <p className="text-[12.5px] leading-relaxed text-texto-3">
            Se crea un Price nuevo en Stripe y el cobro de los <b className="font-semibold text-texto">registros nuevos</b> cambia al
            instante. Las <b className="font-semibold text-texto">suscripciones vigentes siguen en su precio anterior</b> (Stripe no
            las migra). No afecta los pagos manuales ni las cortesías.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" data-testid="precio-cancelar" onClick={onCerrar} disabled={cambiar.isPending} className={BTN_CANCELAR}>
          Cancelar
        </button>
        <button type="button" data-testid="precio-guardar" onClick={enviar} disabled={!puede} className={BTN_GUARDAR}>
          {cambiar.isPending ? 'Guardando…' : (<><Check size={15} /> Guardar precio</>)}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// TARJETA (en la sección Configuración)
// =============================================================================

export function TarjetaPrecioMembresia({ abierto, onToggle }: { abierto: boolean; onToggle: () => void }) {
  const config = useConfigPublica();
  const activarAnual = useActivarPlanAnual();
  const [modalAbierto, setModalAbierto] = useState(false);

  const resumen = `${pesos(config.precioMembresia)}/mes · ${config.anualDisponible ? 'anual activo' : 'sin anual'}`;

  return (
    <PanelAcordeon id="precio" titulo="Precio de la membresía" Icono={Tag} resumen={resumen} abierto={abierto} onToggle={onToggle}>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 2xl:grid-cols-2">
        {/* Precio mensual — tarjeta vertical con su botón Cambiar */}
        <div className="flex flex-col rounded-[12px] border border-borde bg-superficie p-4" data-testid="config-precio-membresia">
          <div className="flex items-start justify-between gap-2">
            <CajaIcono Icono={Tag} />
          </div>
          <h4 className="mt-3 text-[14.5px] font-semibold text-texto">Precio de la membresía comercial</h4>
          <p className="mt-0.5 flex-1 text-[13px] leading-relaxed text-texto-3">
            Lo que paga un comercio al mes. Cambiarlo crea el Price nuevo en Stripe y reapunta el cobro al instante.
          </p>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-borde pt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold leading-none text-texto">{pesos(config.precioMembresia)}</span>
              <span className="text-[12px] text-texto-3">/mes</span>
            </div>
            <button
              type="button"
              data-testid="config-cambiar-precio"
              onClick={() => setModalAbierto(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Plan anual — tarjeta vertical con toggle */}
        <div className="flex flex-col rounded-[12px] border border-borde bg-superficie p-4" data-testid="config-plan-anual">
          <div className="flex items-start justify-between gap-2">
            <CajaIcono Icono={CalendarRange} />
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{
                color: config.anualDisponible ? 'var(--panel-ok)' : 'var(--panel-text-4)',
                borderColor: config.anualDisponible ? 'var(--panel-ok)' : 'var(--panel-border)',
              }}
            >
              {config.anualDisponible ? 'Activo en el registro' : 'Desactivado'}
            </span>
          </div>
          <h4 className="mt-3 text-[14.5px] font-semibold text-texto">Plan anual</h4>
          <p className="mt-0.5 flex-1 text-[13px] leading-relaxed text-texto-3">
            Ofrece pagar el año completo: <b className="font-semibold text-texto">{pesos(config.precioMembresiaAnual)}/año</b> (10 meses,
            2 gratis). Al activarlo aparece como opción en el registro; al apagarlo deja de ofrecerse (las anuales vigentes no se tocan).
          </p>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-borde pt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold leading-none text-texto">{pesos(config.precioMembresiaAnual)}</span>
              <span className="text-[12px] text-texto-3">/año</span>
            </div>
            <Switch
              activo={config.anualDisponible}
              disabled={activarAnual.isPending}
              onClick={() => activarAnual.mutate(!config.anualDisponible)}
            />
          </div>
        </div>
      </div>

      {modalAbierto && (
        <DialogoCambiarPrecioMensual
          actualMensual={config.precioMembresia}
          anualActivo={config.anualDisponible}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </PanelAcordeon>
  );
}

export default TarjetaPrecioMembresia;
