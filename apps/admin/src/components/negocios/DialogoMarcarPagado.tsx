/**
 * DialogoMarcarPagado.tsx
 * ========================
 * Diálogo de "Marcar membresía como pagada" (Parada 2 · SOLO SuperAdmin).
 *
 * Deja elegir el plazo de dos formas (Opción C):
 *   - Por MESES (default): chips 1/3/6/12 → calcula la fecha solo (hoy + meses).
 *   - Fecha EXACTA: calendario para fijar un vencimiento puntual.
 * Muestra el vencimiento ACTUAL como referencia antes de elegir.
 *
 * Toggle de Stripe SOLO si el negocio tiene suscripción de tarjeta:
 *   - Apagado (default): no toca Stripe; la tarjeta sigue cobrándose (método 'tarjeta').
 *   - Encendido: pausa el cobro de la tarjeta (cortesía; método 'manual').
 * Sin suscripción: no hay toggle; el método queda 'manual'.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoMarcarPagado.tsx
 */

import { useState } from 'react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';

const OPCIONES_MESES = [1, 3, 6, 12];

const FMT = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
function fmt(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  return FMT.format(d).replace('.', '');
}

/** Hoy + N meses, al final del día. JS maneja el desborde de mes correctamente. */
function sumarMeses(meses: number): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  d.setMonth(d.getMonth() + meses);
  return d;
}

/** Fecha (yyyy-mm-dd) de mañana, como mínimo del calendario. */
function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface DialogoMarcarPagadoProps {
  abierto: boolean;
  onCerrar: () => void;
  /** fechaVencimiento actual del negocio (referencia). */
  vencimientoActual: string | null;
  /** ¿El dueño tiene suscripción de Stripe? Controla si se muestra el toggle. */
  tieneSuscripcion: boolean;
  cargando?: boolean;
  onConfirmar: (hastaISO: string, pausarStripe: boolean) => void;
}

export function DialogoMarcarPagado({
  abierto,
  onCerrar,
  vencimientoActual,
  tieneSuscripcion,
  cargando = false,
  onConfirmar,
}: DialogoMarcarPagadoProps) {
  const [modo, setModo] = useState<'meses' | 'fecha'>('meses');
  const [meses, setMeses] = useState(1);
  const [fechaManual, setFechaManual] = useState('');
  const [pausarStripe, setPausarStripe] = useState(false);

  const venceActual = vencimientoActual ? new Date(vencimientoActual) : null;

  const hastaDate =
    modo === 'meses'
      ? sumarMeses(meses)
      : fechaManual
        ? new Date(`${fechaManual}T23:59:59`)
        : null;

  const hastaValida = !!hastaDate && !Number.isNaN(hastaDate.getTime()) && hastaDate.getTime() > Date.now();

  const confirmar = () => {
    if (!hastaValida || !hastaDate) return;
    onConfirmar(hastaDate.toISOString(), tieneSuscripcion ? pausarStripe : false);
  };

  const segmento = (activo: boolean) =>
    `flex-1 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
      activo ? 'bg-marca text-marca-contraste' : 'text-texto-3 hover:text-texto'
    }`;

  const chip = (activo: boolean) =>
    `rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition ${
      activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde text-texto-2 hover:bg-marca-suave'
    }`;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo="Marcar como pagada"
      discriminador="dialogo-marcar-pagado"
    >
      <div className="p-5" data-testid="dialogo-marcar-pagado">
        {/* Referencia: vencimiento actual */}
        <div className="mb-3 rounded-[10px] bg-superficie-2 px-3 py-2 text-[12.5px] text-texto-3">
          {venceActual ? (
            <>Vence actualmente: <span className="font-semibold text-texto-2">{fmt(venceActual)}</span></>
          ) : (
            'Sin vencimiento registrado.'
          )}
        </div>

        {/* Selector de modo */}
        <div className="mb-3 flex rounded-[10px] border border-borde p-0.5">
          <button type="button" data-testid="marcar-modo-meses" onClick={() => setModo('meses')} className={segmento(modo === 'meses')}>
            Por meses
          </button>
          <button type="button" data-testid="marcar-modo-fecha" onClick={() => setModo('fecha')} className={segmento(modo === 'fecha')}>
            Fecha exacta
          </button>
        </div>

        {modo === 'meses' ? (
          <div className="flex flex-wrap gap-2" data-testid="marcar-meses">
            {OPCIONES_MESES.map((m) => (
              <button key={m} type="button" data-testid={`marcar-mes-${m}`} onClick={() => setMeses(m)} className={chip(meses === m)}>
                {m} {m === 1 ? 'mes' : 'meses'}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="date"
            data-testid="marcar-fecha"
            value={fechaManual}
            min={manana()}
            onChange={(e) => setFechaManual(e.target.value)}
            className={CLASE_CAMPO}
          />
        )}

        {/* Preview del nuevo vencimiento */}
        <div className="mt-3 text-[13px] text-texto-2">
          Nuevo vencimiento: <span className="font-semibold text-texto" data-testid="marcar-preview">{fmt(hastaDate)}</span>
        </div>

        {/* Toggle de Stripe (solo con suscripción) */}
        {tieneSuscripcion ? (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5" data-testid="marcar-toggle-stripe-label">
            <input
              type="checkbox"
              data-testid="marcar-toggle-stripe"
              checked={pausarStripe}
              onChange={(e) => setPausarStripe(e.target.checked)}
              className="mt-0.5 accent-[var(--panel-marca,currentColor)]"
            />
            <span className="text-[12.5px] text-texto-2">
              Pausar el cobro automático de la tarjeta
              <span className="mt-0.5 block text-[11.5px] text-texto-4">
                Para cortesías. Si lo dejas apagado, la tarjeta se sigue cobrando normal.
              </span>
            </span>
          </label>
        ) : (
          <div className="mt-4 text-[11.5px] text-texto-4">
            Este negocio no tiene suscripción de Stripe; el cobro quedará como manual.
          </div>
        )}

        {/* Botones */}
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
            data-testid="marcar-confirmar"
            onClick={confirmar}
            disabled={!hastaValida || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Procesando…' : 'Marcar pagada'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoMarcarPagado;
