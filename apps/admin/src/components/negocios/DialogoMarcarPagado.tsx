/**
 * DialogoMarcarPagado.tsx
 * ========================
 * Diálogo "Registrar pago" de la membresía (Parada 2 · SuperAdmin + Gerente).
 *
 * Plazo en dos formas: por MESES (chips 1/3/6/12 + campo de enteros) o FECHA EXACTA (calendario,
 * máx 2 años). Concepto: efectivo / transferencia (llevan monto) o cortesía (sin monto). En modo
 * "por meses" el MONTO se autocalcula del precio de membresía (editable; scroll por décimas).
 * Con suscripción de Stripe, al confirmar se EMPUJA el próximo cobro a la fecha elegida (trial_end)
 * y la tarjeta retoma sola al vencer. Sin suscripción: solo registro en BD.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoMarcarPagado.tsx
 */

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { precioPorMeses } from './membresia';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';

/** Campo numérico estrecho de meses (centrado), a juego con los chips. */
const CLASE_MESES =
  'h-[34px] w-16 rounded-[9px] border border-campo-borde bg-campo px-2 text-center text-[13px] font-semibold text-texto outline-none transition focus:border-marca focus:bg-superficie';

/** Etiqueta de sección (densa, uppercase) — jerarquía por peso, no por tamaño. */
const SECCION = 'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4';

const OPCIONES_MESES = [1, 3, 6, 12];
const MAX_MESES = 36;

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

/** Plazo del pago: parte del MAYOR entre hoy y el vencimiento vigente, + N meses, al final del
 *  día. Así, si al negocio aún le quedan días pagados, el nuevo pago SE ACUMULA (no se los come);
 *  si ya venció (o no hay vencimiento), cuenta desde hoy. JS maneja el desborde de mes. */
function sumarMeses(meses: number, vencimiento: Date | null): Date {
  const hoy = new Date();
  const aunVigente = !!vencimiento && !Number.isNaN(vencimiento.getTime()) && vencimiento.getTime() > hoy.getTime();
  const base = aunVigente ? new Date(vencimiento as Date) : hoy;
  base.setHours(23, 59, 59, 0);
  base.setMonth(base.getMonth() + meses);
  return base;
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

/** Días NUEVOS que cubre una fecha exacta: del mayor entre hoy y el vencimiento vigente hasta la
 *  fecha elegida. 0 si no agrega tiempo (fecha igual o anterior → estaría acortando). */
function diasNuevos(fechaDate: Date | null, vencimiento: Date | null): number {
  if (!fechaDate || Number.isNaN(fechaDate.getTime())) return 0;
  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 0);
  const aunVigente = !!vencimiento && !Number.isNaN(vencimiento.getTime()) && vencimiento.getTime() > Date.now();
  const baseMs = aunVigente ? (vencimiento as Date).getTime() : hoyFin.getTime();
  const d = Math.round((fechaDate.getTime() - baseMs) / (24 * 60 * 60 * 1000));
  return d > 0 ? d : 0;
}

/** Monto sugerido para "Fecha exacta": días nuevos × precio por día (precio mensual base / 30),
 *  redondeado al peso. 0 si no agrega tiempo. */
function montoProporcional(fechaDate: Date | null, vencimiento: Date | null): number {
  const dias = diasNuevos(fechaDate, vencimiento);
  return dias > 0 ? Math.round((precioPorMeses(1) / 30) * dias) : 0;
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
  /** Si false, oculta la opción de cortesía (el vendedor no puede regalar membresías). */
  permiteCortesia?: boolean;
  cargando?: boolean;
  onConfirmar: (hastaISO: string, datos: DatosPago) => void;
}

export function DialogoMarcarPagado({
  abierto,
  onCerrar,
  nombreNegocio,
  vencimientoActual,
  tieneSuscripcion,
  permiteCortesia = true,
  cargando = false,
  onConfirmar,
}: DialogoMarcarPagadoProps) {
  const conceptos = permiteCortesia ? OPCIONES_CONCEPTO : OPCIONES_CONCEPTO.filter((c) => c.valor !== 'cortesia');
  const [modo, setModo] = useState<'meses' | 'fecha'>('meses');
  const [mesesStr, setMesesStr] = useState('1');
  const [fechaManual, setFechaManual] = useState('');
  const [concepto, setConcepto] = useState<Concepto>('efectivo');
  const [monto, setMonto] = useState(String(precioPorMeses(1)));

  const venceActual = vencimientoActual ? new Date(vencimientoActual) : null;

  const mesesNum = Number(mesesStr);
  const mesesValido = Number.isInteger(mesesNum) && mesesNum >= 1 && mesesNum <= MAX_MESES;

  const hastaDate =
    modo === 'meses'
      ? (mesesValido ? sumarMeses(mesesNum, venceActual) : null)
      : fechaManual
        ? new Date(`${fechaManual}T23:59:59`)
        : null;

  const ahoraMs = Date.now();
  const hastaValida =
    !!hastaDate &&
    !Number.isNaN(hastaDate.getTime()) &&
    hastaDate.getTime() > ahoraMs &&
    hastaDate.getTime() <= ahoraMs + MAX_MS_2_ANIOS;

  // ¿El nuevo plazo se SUMA sobre días aún vigentes? (solo en modo "por meses").
  const vigenteFuturo = !!venceActual && !Number.isNaN(venceActual.getTime()) && venceActual.getTime() > ahoraMs;
  const acumula = modo === 'meses' && vigenteFuturo;
  // El plazo acumulado puede pasar el tope de 2 años de Stripe (trial_end) → se avisa y se bloquea.
  const excedeTope = modo === 'meses' && !!hastaDate && hastaDate.getTime() > ahoraMs + MAX_MS_2_ANIOS;
  // Fecha exacta ANTERIOR al vencimiento vigente → le acortaría la vigencia. Se AVISA pero se permite:
  // acortar puede ser a propósito (p. ej. alinear el cobro a un día fijo del mes).
  const acorta =
    modo === 'fecha' && !!hastaDate && !!venceActual && venceActual.getTime() > ahoraMs && hastaDate.getTime() < venceActual.getTime();
  // Días nuevos que cubre la fecha exacta (para el texto de ayuda del monto proporcional).
  const diasFecha = modo === 'fecha' ? diasNuevos(hastaDate, venceActual) : 0;

  // Monto obligatorio (> 0) solo en efectivo/transferencia; en cortesía no se pide.
  const pideMonto = concepto !== 'cortesia';
  const montoNum = Number(monto);
  const montoValido = !pideMonto || (monto.trim() !== '' && !Number.isNaN(montoNum) && montoNum > 0);

  const puedeConfirmar = hastaValida && montoValido;

  // Cambiar los meses recalcula el monto sugerido (salvo cortesía). El campo solo acepta enteros.
  const aplicarMeses = (valor: string) => {
    const soloDigitos = valor.replace(/\D/g, '');
    setMesesStr(soloDigitos);
    const n = Number(soloDigitos);
    if (concepto !== 'cortesia' && Number.isInteger(n) && n >= 1) setMonto(String(precioPorMeses(n)));
  };

  // Elegir/cambiar la fecha exacta recalcula el monto a PROPORCIÓN de los días nuevos (salvo
  // cortesía). Si no agrega tiempo (fecha igual o anterior al vencimiento), limpia el monto.
  const aplicarFecha = (valor: string) => {
    setFechaManual(valor);
    if (concepto === 'cortesia' || !valor) return;
    const prop = montoProporcional(new Date(`${valor}T23:59:59`), venceActual);
    setMonto(prop > 0 ? String(prop) : '');
  };

  // Pasar a efectivo/transferencia precarga el monto sugerido del modo actual.
  const aplicarConcepto = (c: Concepto) => {
    setConcepto(c);
    if (c === 'cortesia') return;
    if (modo === 'meses' && mesesValido) setMonto(String(precioPorMeses(mesesNum)));
    else if (modo === 'fecha' && fechaManual) {
      const prop = montoProporcional(new Date(`${fechaManual}T23:59:59`), venceActual);
      setMonto(prop > 0 ? String(prop) : '');
    }
  };

  // Cambiar de modo recalcula el monto sugerido (meses → precio×meses; fecha → proporción de días).
  const aplicarModo = (m: 'meses' | 'fecha') => {
    setModo(m);
    if (concepto === 'cortesia') return;
    if (m === 'meses' && mesesValido) setMonto(String(precioPorMeses(mesesNum)));
    else if (m === 'fecha' && fechaManual) {
      const prop = montoProporcional(new Date(`${fechaManual}T23:59:59`), venceActual);
      setMonto(prop > 0 ? String(prop) : '');
    }
  };

  const confirmar = () => {
    if (!puedeConfirmar || !hastaDate) return;
    onConfirmar(hastaDate.toISOString(), {
      concepto,
      monto: pideMonto ? montoNum : undefined,
      meses: modo === 'meses' ? mesesNum : undefined,
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
          <button type="button" data-testid="marcar-modo-meses" onClick={() => aplicarModo('meses')} className={segmento(modo === 'meses')}>
            Por meses
          </button>
          <button type="button" data-testid="marcar-modo-fecha" onClick={() => aplicarModo('fecha')} className={segmento(modo === 'fecha')}>
            Fecha exacta
          </button>
        </div>

        {modo === 'meses' ? (
          <>
            <div className="flex flex-wrap items-center gap-2" data-testid="marcar-meses">
              {OPCIONES_MESES.map((m) => (
                <button key={m} type="button" data-testid={`marcar-mes-${m}`} onClick={() => aplicarMeses(String(m))} className={chip(mesesNum === m)}>
                  {m} {m === 1 ? 'mes' : 'meses'}
                </button>
              ))}
              <input
                type="text"
                inputMode="numeric"
                data-testid="marcar-mes-input"
                value={mesesStr}
                onChange={(e) => aplicarMeses(e.target.value)}
                aria-label="Meses"
                className={CLASE_MESES}
              />
            </div>
            {mesesStr !== '' && !mesesValido && (
              <p className="mt-1 text-[11.5px] font-medium text-peligro">Indica un número entero entre 1 y 36.</p>
            )}
          </>
        ) : (
          <input
            type="date"
            data-testid="marcar-fecha"
            value={fechaManual}
            min={manana()}
            max={maxFecha()}
            onChange={(e) => aplicarFecha(e.target.value)}
            className={CLASE_CAMPO}
          />
        )}

        {/* Concepto del pago */}
        <div className="mt-4">
          <div className={SECCION}>¿Cómo pagó?</div>
          <div className="flex flex-wrap gap-2" data-testid="marcar-concepto">
            {conceptos.map((c) => (
              <button
                key={c.valor}
                type="button"
                data-testid={`marcar-concepto-${c.valor}`}
                onClick={() => aplicarConcepto(c.valor)}
                className={chip(concepto === c.valor)}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Monto (solo efectivo/transferencia; autocalculado, editable; scroll por décimas) */}
        {pideMonto && (
          <div className="mt-4">
            <div className={SECCION}>Monto</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                data-testid="marcar-monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="449.00"
                className={`${CLASE_CAMPO} pl-6`}
              />
            </div>
            {modo === 'fecha' && diasFecha > 0 && (
              <p className="mt-1 text-[11px] text-texto-4">
                Sugerido proporcional a {diasFecha} {diasFecha === 1 ? 'día' : 'días'} (editable).
              </p>
            )}
          </div>
        )}

        {/* Resumen: vigencia + efecto del cobro */}
        <div className="mt-4 rounded-[10px] bg-superficie-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-texto-3">Vigencia hasta</span>
            <span className="font-semibold text-texto" data-testid="marcar-preview">{fmt(hastaDate)}</span>
          </div>
          {excedeTope ? (
            <div className="mt-1 text-[11.5px] font-medium text-peligro">
              El plazo acumulado supera el tope de 2 años de Stripe. Reduce los meses o usa "Fecha exacta".
            </div>
          ) : acorta ? (
            <div className="mt-1 text-[11.5px] font-medium text-[#d97706]" data-testid="marcar-acorta">
              Esta fecha es anterior a su vencimiento actual ({fmt(venceActual)}) — le acortarías la vigencia.
            </div>
          ) : acumula ? (
            <div className="mt-1 text-[11.5px] text-texto-3" data-testid="marcar-acumula">
              Se suma a los días que aún tiene (hasta el {fmt(venceActual)}).
            </div>
          ) : null}
          <div className="mt-1 text-[11.5px] text-texto-4">
            {tieneSuscripcion
              ? 'Su tarjeta volverá a cobrar sola al vencer (este pago solo difiere el próximo cobro).'
              : 'Quedará como cobro manual (el negocio no tiene tarjeta automática).'}
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
