/**
 * DialogoEditarPago.tsx
 * =====================
 * Corrige una fila del historial de pagos manuales: concepto (efectivo/transferencia/cortesía),
 * monto y meses cubiertos. Precargado con los valores actuales de la fila.
 *
 * - El MONTO se autocalcula del precio de membresía al cambiar los meses o el concepto, pero
 *   queda editable (scroll por décimas).
 * - Los MESES se eligen con chips de atajo (1/3/6/12) o tecleando en el campo (solo enteros
 *   positivos, 1–36).
 * - Corregir los meses traslada la "Vigencia hasta" del negocio si este es su pago más reciente
 *   (lo resuelve el backend). Super + gerente (lo blinda el service).
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoEditarPago.tsx
 */

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { precioPorMeses } from './membresia';
import { usePrecioMembresia } from '../../hooks/queries/usePrecioMembresia';
import type { ConceptoPago, DatosEditarPago, PagoMembresia } from '../../services/negociosService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';

/** Campo numérico estrecho de meses (centrado), a juego con los chips. */
const CLASE_MESES =
  'h-[34px] w-16 rounded-[9px] border border-campo-borde bg-campo px-2 text-center text-[13px] font-semibold text-texto outline-none transition focus:border-marca focus:bg-superficie';

/** Etiqueta de sección (densa, uppercase) — jerarquía por peso, no por tamaño. */
const SECCION = 'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4';

const OPCIONES_CONCEPTO: { valor: ConceptoPago; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
];

const MESES_CHIP = [1, 3, 6, 12];
const MAX_MESES = 36;

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
/** Formatea "18 Jun 2026" con el mes capitalizado (Intl en español lo devuelve en minúscula). */
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FMT_FECHA = {
  format: (d: Date): string => `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`,
};
function fmtFecha(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  return FMT_FECHA.format(d);
}

interface DialogoEditarPagoProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Fila a editar (precarga los valores actuales). */
  pago: PagoMembresia;
  /** Si false, oculta la opción de cortesía (solo el superadmin puede regalar membresías). */
  permiteCortesia?: boolean;
  cargando?: boolean;
  onConfirmar: (datos: DatosEditarPago) => void;
}

export function DialogoEditarPago({ abierto, onCerrar, pago, cargando = false, onConfirmar, permiteCortesia = true }: DialogoEditarPagoProps) {
  const conceptos = permiteCortesia ? OPCIONES_CONCEPTO : OPCIONES_CONCEPTO.filter((c) => c.valor !== 'cortesia');
  const precioBase = usePrecioMembresia();
  const [concepto, setConcepto] = useState<ConceptoPago>((pago.concepto as ConceptoPago) ?? 'efectivo');
  const [monto, setMonto] = useState(pago.monto ?? '');
  const [mesesStr, setMesesStr] = useState(String(pago.mesesCubiertos ?? 1));

  const mesesNum = Number(mesesStr);
  const mesesValido = Number.isInteger(mesesNum) && mesesNum >= 1 && mesesNum <= MAX_MESES;

  const pideMonto = concepto !== 'cortesia';
  const montoNum = Number(monto);
  const montoValido = !pideMonto || (String(monto).trim() !== '' && !Number.isNaN(montoNum) && montoNum > 0);

  const puedeConfirmar = montoValido && mesesValido && !cargando;

  // Cambiar los meses recalcula el monto sugerido (salvo cortesía). El campo solo acepta enteros.
  const aplicarMeses = (valor: string) => {
    const soloDigitos = valor.replace(/\D/g, '');
    setMesesStr(soloDigitos);
    const n = Number(soloDigitos);
    if (concepto !== 'cortesia' && Number.isInteger(n) && n >= 1) setMonto(String(precioPorMeses(n, precioBase)));
  };

  // Pasar a efectivo/transferencia precarga el precio sugerido de los meses actuales.
  const aplicarConcepto = (c: ConceptoPago) => {
    setConcepto(c);
    if (c !== 'cortesia' && mesesValido) setMonto(String(precioPorMeses(mesesNum, precioBase)));
  };

  // Vista previa: hasta cuándo cubre el pago corregido (fecha de pago + meses).
  const cubreHasta = (() => {
    if (!mesesValido || !pago.fechaPago) return null;
    const d = new Date(pago.fechaPago);
    if (Number.isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + mesesNum);
    return d;
  })();

  const confirmar = () => {
    if (!puedeConfirmar) return;
    onConfirmar({ concepto, monto: pideMonto ? montoNum : undefined, meses: mesesNum });
  };

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
      titulo="Editar pago"
      discriminador="dialogo-editar-pago"
    >
      <div className="p-5" data-testid="dialogo-editar-pago">
        {/* Contexto: el pago que se está corrigiendo */}
        <div className="mb-4 flex items-center gap-2 text-[12.5px] text-texto-3">
          <Receipt size={15} className="shrink-0 text-texto-4" />
          <span className="min-w-0 truncate">
            Corrigiendo el pago de{' '}
            <span className="font-semibold text-texto-2">
              {pago.monto != null ? FMT_MONTO.format(Number(pago.monto)) : 'cortesía'}
            </span>
          </span>
        </div>

        {/* Concepto */}
        <div className={SECCION}>¿Cómo pagó?</div>
        <div className="flex flex-wrap gap-2" data-testid="editar-concepto">
          {conceptos.map((c) => (
            <button
              key={c.valor}
              type="button"
              data-testid={`editar-concepto-${c.valor}`}
              onClick={() => aplicarConcepto(c.valor)}
              className={chip(concepto === c.valor)}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>

        {/* Meses cubiertos: chips de atajo + campo numérico (solo enteros) */}
        <div className="mt-4">
          <div className={SECCION}>Meses cubiertos</div>
          <div className="flex flex-wrap items-center gap-2" data-testid="editar-meses">
            {MESES_CHIP.map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`editar-mes-${m}`}
                onClick={() => aplicarMeses(String(m))}
                className={chip(mesesNum === m)}
              >
                {m} {m === 1 ? 'mes' : 'meses'}
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              data-testid="editar-mes-input"
              value={mesesStr}
              onChange={(e) => aplicarMeses(e.target.value)}
              aria-label="Meses cubiertos"
              className={CLASE_MESES}
            />
          </div>
          {mesesStr !== '' && !mesesValido && (
            <p className="mt-1 text-[11.5px] font-medium text-peligro">Indica un número entero entre 1 y 36.</p>
          )}
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
                data-testid="editar-monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder={`${precioBase}.00`}
                className={`${CLASE_CAMPO} pl-6`}
              />
            </div>
          </div>
        )}

        {/* Vista previa: hasta cuándo cubre el pago corregido */}
        <div className="mt-4 rounded-[10px] bg-superficie-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-texto-3">Cubre hasta</span>
            <span className="font-semibold text-texto" data-testid="editar-cubre-hasta">{fmtFecha(cubreHasta)}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-texto-4">Si es el pago más reciente, mueve la vigencia del negocio.</div>
        </div>

        {/* Botones */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            data-testid="editar-cancelar"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="editar-confirmar"
            onClick={confirmar}
            disabled={!puedeConfirmar}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarPago;
