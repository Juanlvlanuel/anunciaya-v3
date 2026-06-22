/**
 * DialogoPeriodos.tsx
 * ===================
 * Editor de PERIODOS de meses por adelantado de Publicidad (Configuración · módulo 9). El anunciante
 * elige pagar 1 / 3 / 6 / 12 meses (o lo que se defina) y cada periodo otorga un % de descuento —
 * son las opciones de "¿por cuánto tiempo?" del wizard `/anunciate` y su ahorro. Dedicado.
 *
 * Reglas (espejo de `validarPeriodos` del backend): debe existir la opción de 1 mes (la base, normal-
 * mente sin descuento), los meses son enteros ≥ 1 sin repetir, y el descuento va de 0 a 90 %. Vista
 * previa en vivo; el backend ordena por meses al guardar. Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/DialogoPeriodos.tsx
 */

import { useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useActualizarConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearPeriodos, type ConfigFila, type TramoPeriodo } from '../../services/configuracionService';

const CAMPO_BASE =
  'rounded-[8px] border border-campo-borde bg-campo text-[13px] text-texto tabular-nums outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

interface FilaPeriodo {
  meses: string;     // # de meses por adelantado (entero ≥ 1)
  descuento: string; // % de descuento (0–90)
}

const soloEnteros = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 3);

function aFilas(periodos: TramoPeriodo[]): FilaPeriodo[] {
  if (periodos.length === 0) return [{ meses: '1', descuento: '0' }];
  return periodos.map((p) => ({ meses: String(p.meses), descuento: String(p.descuento) }));
}

/** Construye y valida los periodos finales a partir de las filas (espejo de la validación del backend). */
function construir(filas: FilaPeriodo[]): { ok: true; periodos: TramoPeriodo[] } | { ok: false; error: string } {
  const out: TramoPeriodo[] = [];
  const vistos = new Set<number>();
  for (const f of filas) {
    const meses = Number(f.meses);
    if (f.meses.trim() === '' || !Number.isInteger(meses) || meses < 1) {
      return { ok: false, error: 'Cada periodo necesita un número de meses entero ≥ 1.' };
    }
    if (vistos.has(meses)) return { ok: false, error: 'No repitas el mismo número de meses.' };
    vistos.add(meses);
    const descuento = f.descuento.trim() === '' ? 0 : Number(f.descuento);
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 90) {
      return { ok: false, error: 'El descuento de cada periodo debe estar entre 0 y 90 %.' };
    }
    out.push({ meses, descuento });
  }
  out.sort((a, b) => a.meses - b.meses);
  if (out[0].meses !== 1) return { ok: false, error: 'Debe existir la opción de 1 mes (la base).' };
  return { ok: true, periodos: out };
}

export function DialogoEditarPeriodos({ fila, onCerrar }: { fila: ConfigFila; onCerrar: () => void }) {
  const guardar = useActualizarConfiguracion();
  const [filas, setFilas] = useState<FilaPeriodo[]>(() => aFilas(parsearPeriodos(fila.valor)));

  const resultado = construir(filas);
  const original = [...parsearPeriodos(fila.valor)].sort((a, b) => a.meses - b.meses);
  const cambiado = resultado.ok && JSON.stringify(resultado.periodos) !== JSON.stringify(original);
  const puedeGuardar = resultado.ok && cambiado && !guardar.isPending;

  const setMeses = (i: number, v: string) => setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, meses: soloEnteros(v) } : f)));
  const setDescuento = (i: number, v: string) => setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, descuento: soloEnteros(v) } : f)));

  const agregar = () => setFilas((fs) => [...fs, { meses: '', descuento: '' }]);
  const quitar = (i: number) => setFilas((fs) => (fs.length <= 1 ? fs : fs.filter((_, idx) => idx !== i)));

  const enviar = () => {
    if (!puedeGuardar || !resultado.ok) return;
    guardar.mutate({ clave: fila.clave, valor: JSON.stringify(resultado.periodos) }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="xl"
      discriminador="config-periodos"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-config-periodos">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <CalendarClock size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-texto">Meses por adelantado</div>
            <div className="text-[12px] text-texto-3">El cliente paga varios meses de una vez y recibe un descuento.</div>
          </div>
        </div>

        {/* Periodos */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
            <span>Meses</span>
            <span className="pr-10">Descuento (%)</span>
          </div>
          <div className="flex flex-col gap-2">
            {filas.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] border border-borde bg-superficie px-3.5 py-3" data-testid={`periodo-${i}`}>
                <div className="flex flex-1 items-center gap-2 text-[13px] text-texto-2">
                  <input
                    inputMode="numeric"
                    value={f.meses}
                    onChange={(e) => setMeses(i, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    data-testid={`periodo-${i}-meses`}
                    className={`${CAMPO_BASE} h-9 w-16 px-2 text-center font-semibold`}
                  />
                  <span className="text-texto-3">{f.meses === '1' ? 'mes' : 'meses'}</span>
                </div>
                <div className="relative shrink-0">
                  <input
                    inputMode="numeric"
                    value={f.descuento}
                    onChange={(e) => setDescuento(i, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    data-testid={`periodo-${i}-descuento`}
                    className={`${CAMPO_BASE} h-9 w-24 pl-2.5 pr-7 text-right font-semibold`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[13px] font-medium text-texto-3">%</span>
                </div>
                <button
                  type="button"
                  data-testid={`periodo-${i}-quitar`}
                  onClick={() => quitar(i)}
                  disabled={filas.length <= 1}
                  aria-label="Quitar periodo"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-texto-4 transition hover:bg-peligro-suave hover:text-peligro disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            data-testid="config-periodos-agregar"
            onClick={agregar}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-borde-fuerte py-2.5 text-[12.5px] font-semibold text-texto-3 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
          >
            <Plus size={15} /> Agregar periodo
          </button>

          {/* Vista previa / error */}
          <div className="mt-4 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Vista previa</div>
            {resultado.ok ? (
              <div className="flex flex-wrap gap-1.5">
                {resultado.periodos.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2.5 py-1 text-[12px]">
                    <span className="tabular-nums text-texto-2">{p.meses} {p.meses === 1 ? 'mes' : 'meses'}</span>
                    <span className="font-semibold tabular-nums" style={{ color: p.descuento > 0 ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}>
                      {p.descuento > 0 ? `−${p.descuento}%` : 'base'}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] font-medium text-peligro">{resultado.error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button type="button" data-testid="config-periodos-cancelar" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>
            Cancelar
          </button>
          <button type="button" data-testid="config-periodos-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarPeriodos;
