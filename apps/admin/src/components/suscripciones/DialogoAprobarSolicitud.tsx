/**
 * DialogoAprobarSolicitud.tsx
 * ===========================
 * Diálogo para aprobar una solicitud de pago manual de la cola "Por verificar". Muestra el
 * negocio, el monto y los meses DECLARADOS por el dueño, ambos editables (input de monto +
 * chips/input de meses 1–24). Al confirmar, dispara la mutación de aprobar con { monto, meses }.
 *
 * Usa el ModalAdaptativo base forzado a `centrado` (consistente con DialogoConfirmar). El
 * `cargando` lo controla el padre (la mutación); el padre cierra en el onSuccess.
 *
 * Ubicación: apps/admin/src/components/suscripciones/DialogoAprobarSolicitud.tsx
 */

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import type { SolicitudCola } from '../../services/suscripcionesService';

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const MESES_CHIPS = [1, 3, 6, 12];

interface DialogoAprobarSolicitudProps {
  solicitud: SolicitudCola;
  cargando?: boolean;
  onCerrar: () => void;
  onConfirmar: (datos: { monto: number; meses: number }) => void;
}

export function DialogoAprobarSolicitud({ solicitud, cargando = false, onCerrar, onConfirmar }: DialogoAprobarSolicitudProps) {
  const montoDeclarado = Number(solicitud.monto);
  const [monto, setMonto] = useState<string>(Number.isFinite(montoDeclarado) ? String(montoDeclarado) : '');
  const [meses, setMeses] = useState<number>(solicitud.mesesDeclarados || 1);

  const montoNum = Number(monto);
  const montoInvalido = !Number.isFinite(montoNum) || montoNum <= 0;
  const mesesInvalido = !Number.isInteger(meses) || meses < 1 || meses > 24;
  const invalido = montoInvalido || mesesInvalido;

  const totalVigencia =
    !montoInvalido && !mesesInvalido ? FMT_MONTO.format(montoNum * meses) : '—';

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      centrado
      ancho="md"
      titulo="Aprobar pago"
      iconoTitulo={<BadgeCheck size={18} className="text-marca" />}
      discriminador="aprobar-solicitud"
    >
      <div className="p-5">
        <p className="text-[13.5px] leading-relaxed text-texto-2">
          Vas a verificar el comprobante de{' '}
          <b className="font-semibold text-texto">{solicitud.negocioNombre}</b> y activar su
          membresía. Ajusta el monto y los meses si no coinciden con lo depositado.
        </p>

        {/* Monto */}
        <div className="mt-4">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Monto cobrado (MXN)</label>
          <input
            data-testid="aprobar-monto"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto en pesos"
            className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13.5px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
          />
          <span className="mt-1 block text-[11.5px] text-texto-4">Declarado: {FMT_MONTO.format(montoDeclarado || 0)}</span>
        </div>

        {/* Meses */}
        <div className="mt-4">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Meses de vigencia</label>
          <div className="flex flex-wrap items-center gap-2">
            {MESES_CHIPS.map((m) => {
              const activo = meses === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-testid={`aprobar-meses-${m}`}
                  onClick={() => setMeses(m)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                    activo
                      ? 'border-marca bg-marca-suave text-marca'
                      : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
                  }`}
                >
                  {m} {m === 1 ? 'mes' : 'meses'}
                </button>
              );
            })}
            <input
              data-testid="aprobar-meses-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={24}
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
              aria-label="Meses personalizados"
              className="w-[88px] rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13.5px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
            />
          </div>
          <span className="mt-1 block text-[11.5px] text-texto-4">
            Declarado: {solicitud.mesesDeclarados} {solicitud.mesesDeclarados === 1 ? 'mes' : 'meses'} · entre 1 y 24
          </span>
        </div>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
          <span className="text-[12.5px] font-medium text-texto-3">Total del periodo</span>
          <span className="text-[14px] font-bold text-texto" data-testid="aprobar-total">{totalVigencia}</span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="aprobar-confirmar"
            onClick={() => onConfirmar({ monto: montoNum, meses })}
            disabled={invalido || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Aprobando…' : 'Aprobar y activar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoAprobarSolicitud;
