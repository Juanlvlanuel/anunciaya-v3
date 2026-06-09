/**
 * DialogoMarcarPagado.tsx
 * ========================
 * Diálogo "Registrar pago" de la membresía (Parada 2 · SOLO SuperAdmin).
 *
 * Plazo en dos formas: por MESES (chips 1/3/6/12) o FECHA EXACTA (calendario, máx 2 años).
 * Concepto: efectivo / transferencia (llevan monto obligatorio) o cortesía (sin monto).
 * Con suscripción de Stripe, al confirmar se EMPUJA el próximo cobro a la fecha elegida
 * (trial_end) y la tarjeta retoma sola al vencer. Sin suscripción: solo registro en BD.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoMarcarPagado.tsx
 */

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';

/** Etiqueta de sección (densa, uppercase) — jerarquía por peso, no por tamaño. */
const SECCION = 'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4';

const OPCIONES_MESES = [1, 3, 6, 12];

const OPCIONES_CONCEPTO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
] as const;

type Concepto = (typeof OPCIONES_CONCEPTO)[number]['valor'];

/** Tope de Stripe para trial_end: 2 años (730 días). Espejo del guard del controller. */
const MAX_MS_2_ANIOS = 730 * 24 * 60 * 60 * 1000;

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

/** Fecha (yyyy-mm-dd) máxima del calendario: hoy + 2 años (tope de Stripe). */
function maxFecha(): string {
  return new Date(Date.now() + MAX_MS_2_ANIOS).toISOString().slice(0, 10);
}

interface DatosPago {
  concepto: Concepto;
  /** Monto en MXN (efectivo/transferencia). En cortesía va undefined. */
  monto?: number;
  /** N meses elegidos en modo "Por meses"; undefined en "Fecha exacta". */
  meses?: number;
}

interface DialogoMarcarPagadoProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Nombre del negocio (contexto compacto). Opcional. */
  nombreNegocio?: string;
  /** fechaVencimiento actual del negocio (referencia). */
  vencimientoActual: string | null;
  /** ¿El dueño tiene suscripción de Stripe? Controla el texto del efecto. */
  tieneSuscripcion: boolean;
  cargando?: boolean;
  onConfirmar: (hastaISO: string, datos: DatosPago) => void;
}

export function DialogoMarcarPagado({
  abierto,
  onCerrar,
  nombreNegocio,
  vencimientoActual,
  tieneSuscripcion,
  cargando = false,
  onConfirmar,
}: DialogoMarcarPagadoProps) {
  const [modo, setModo] = useState<'meses' | 'fecha'>('meses');
  const [meses, setMeses] = useState(1);
  const [fechaManual, setFechaManual] = useState('');
  const [concepto, setConcepto] = useState<Concepto>('efectivo');
  const [monto, setMonto] = useState('');

  const venceActual = vencimientoActual ? new Date(vencimientoActual) : null;

  const hastaDate =
    modo === 'meses'
      ? sumarMeses(meses)
      : fechaManual
        ? new Date(`${fechaManual}T23:59:59`)
        : null;

  const ahoraMs = Date.now();
  const hastaValida =
    !!hastaDate &&
    !Number.isNaN(hastaDate.getTime()) &&
    hastaDate.getTime() > ahoraMs &&
    hastaDate.getTime() <= ahoraMs + MAX_MS_2_ANIOS;

  // Monto obligatorio (> 0) solo en efectivo/transferencia; en cortesía no se pide.
  const pideMonto = concepto !== 'cortesia';
  const montoNum = Number(monto);
  const montoValido = !pideMonto || (monto.trim() !== '' && !Number.isNaN(montoNum) && montoNum > 0);

  const puedeConfirmar = hastaValida && montoValido;

  const confirmar = () => {
    if (!puedeConfirmar || !hastaDate) return;
    onConfirmar(hastaDate.toISOString(), {
      concepto,
      monto: pideMonto ? montoNum : undefined,
      meses: modo === 'meses' ? meses : undefined,
    });
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
      titulo="Registrar pago"
      discriminador="dialogo-marcar-pagado"
    >
      <div className="p-5" data-testid="dialogo-registrar-pago">
        {/* Contexto: negocio + vencimiento actual (una línea sutil) */}
        <div className="mb-4 flex items-center gap-2 text-[12.5px] text-texto-3">
          <CreditCard size={15} className="shrink-0 text-texto-4" />
          <span className="min-w-0 truncate">
            {nombreNegocio && <span className="font-semibold text-texto-2">{nombreNegocio}</span>}
            {nombreNegocio && ' · '}
            {venceActual ? <>vence {fmt(venceActual)}</> : 'sin vencimiento registrado'}
          </span>
        </div>

        {/* Plazo */}
        <div className={SECCION}>Plazo</div>
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
            max={maxFecha()}
            onChange={(e) => setFechaManual(e.target.value)}
            className={CLASE_CAMPO}
          />
        )}

        {/* Concepto del pago */}
        <div className="mt-4">
          <div className={SECCION}>¿Cómo pagó?</div>
          <div className="flex flex-wrap gap-2" data-testid="marcar-concepto">
            {OPCIONES_CONCEPTO.map((c) => (
              <button
                key={c.valor}
                type="button"
                data-testid={`marcar-concepto-${c.valor}`}
                onClick={() => setConcepto(c.valor)}
                className={chip(concepto === c.valor)}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Monto (solo efectivo/transferencia; obligatorio > 0) */}
        {pideMonto && (
          <div className="mt-4">
            <div className={SECCION}>Monto</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                data-testid="marcar-monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="449.00"
                className={`${CLASE_CAMPO} pl-6`}
              />
            </div>
          </div>
        )}

        {/* Resumen: vigencia + efecto del cobro */}
        <div className="mt-4 rounded-[10px] bg-superficie-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-texto-3">Vigencia hasta</span>
            <span className="font-semibold text-texto" data-testid="marcar-preview">{fmt(hastaDate)}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-texto-4">
            {tieneSuscripcion
              ? 'La tarjeta retomará el cobro automático al vencer.'
              : 'Quedará como cobro manual (sin suscripción de Stripe).'}
          </div>
        </div>

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
            data-testid="registrar-confirmar"
            onClick={confirmar}
            disabled={!puedeConfirmar || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Procesando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoMarcarPagado;
