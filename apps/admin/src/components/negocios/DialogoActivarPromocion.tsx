/**
 * DialogoActivarPromocion.tsx
 * ===========================
 * Activa un negocio dado de alta ANTICIPADA (pendiente de activación): cobra el paquete (mesesCobrados ×
 * precio), inicia la vigencia desde HOY (hoy + mesesOtorgados) y publica el negocio. Solo se elige el
 * concepto (efectivo/transferencia); los meses y el monto los define el paquete. Calco sobrio de
 * DialogoMarcarPagado. Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoActivarPromocion.tsx
 */

import { useState } from 'react';
import { Rocket } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { usePrecioMembresia } from '../../hooks/queries/usePrecioMembresia';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

interface DialogoActivarPromocionProps {
  abierto: boolean;
  onCerrar: () => void;
  nombreNegocio?: string;
  mesesOtorgados: number;
  mesesCobrados: number;
  cargando?: boolean;
  onConfirmar: (concepto: 'efectivo' | 'transferencia') => void;
}

export function DialogoActivarPromocion({
  abierto,
  onCerrar,
  nombreNegocio,
  mesesOtorgados,
  mesesCobrados,
  cargando = false,
  onConfirmar,
}: DialogoActivarPromocionProps) {
  const precioBase = usePrecioMembresia();
  const [concepto, setConcepto] = useState<'efectivo' | 'transferencia'>('efectivo');
  const monto = mesesCobrados * precioBase;
  const venc = new Date();
  venc.setMonth(venc.getMonth() + mesesOtorgados);

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
      titulo="Activar promoción"
      discriminador="dialogo-activar-promo"
    >
      <div className="p-5" data-testid="dialogo-activar-promo">
        {/* Contexto */}
        <div className="mb-4 flex items-center gap-2 text-[12.5px] text-texto-3">
          <Rocket size={15} className="shrink-0 text-texto-4" />
          <span className="min-w-0 truncate">
            {nombreNegocio && <span className="font-semibold text-texto-2">{nombreNegocio}</span>}
            {nombreNegocio && ' · '}inicia su membresía hoy
          </span>
        </div>

        {/* Resumen del paquete */}
        <div className="rounded-[10px] bg-superficie-2 px-3 py-2.5 text-[12.5px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-texto-3">Otorga</span>
            <span className="font-semibold text-texto">{mesesOtorgados} {mesesOtorgados === 1 ? 'mes' : 'meses'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-texto-3">Cobra ahora</span>
            <span className="font-semibold text-texto" data-testid="activar-promo-monto">
              ${monto} <span className="font-normal text-texto-4">({mesesCobrados} {mesesCobrados === 1 ? 'mes' : 'meses'})</span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-texto-3">Vigencia hasta</span>
            <span className="font-semibold text-texto" data-testid="activar-promo-vigencia">{fmt(venc)}</span>
          </div>
        </div>

        {/* Concepto */}
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4">¿Cómo pagó?</div>
          <div className="flex flex-wrap gap-2" data-testid="activar-promo-concepto">
            {(['efectivo', 'transferencia'] as const).map((c) => (
              <button
                key={c}
                type="button"
                data-testid={`activar-promo-concepto-${c}`}
                onClick={() => setConcepto(c)}
                className={chip(concepto === c)}
              >
                {c === 'efectivo' ? 'Efectivo' : 'Transferencia'}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 rounded-[10px] bg-marca-suave px-3 py-2 text-[11.5px] font-medium text-marca">
          Al activar se cobra el mes, la vigencia corre desde hoy y el negocio se publica (si su onboarding está completo).
        </p>

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
            data-testid="activar-promo-confirmar"
            onClick={() => onConfirmar(concepto)}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Activando…' : 'Activar y cobrar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoActivarPromocion;
