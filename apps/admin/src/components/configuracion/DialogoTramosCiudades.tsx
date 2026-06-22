/**
 * DialogoTramosCiudades.tsx
 * =========================
 * Editor de TRAMOS del multiplicador por # de ciudades de Publicidad (Configuración · módulo 9).
 * Dedicado — NO toca la escalera de comisiones. Diferencias clave con aquella: empieza en 1 ciudad
 * (no en 0) y su valor es un `factor` (multiplicador decimal, p. ej. 1.8), no un monto en pesos.
 *
 * El usuario define los cortes (topes en # de ciudades) y el factor de cada tramo; el inicio de cada
 * tramo se deriva del tope del anterior (sin huecos ni solapes por construcción), con vista previa en
 * vivo. El último tramo siempre queda "en adelante". El backend revalida (validarTramosCiudades).
 *
 * Ubicación: apps/admin/src/components/configuracion/DialogoTramosCiudades.tsx
 */

import { useState } from 'react';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useActualizarConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearTramosCiudades, type ConfigFila, type TramoCiudades } from '../../services/configuracionService';

const CAMPO_BASE =
  'rounded-[8px] border border-campo-borde bg-campo text-[13px] text-texto tabular-nums outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

interface FilaTramo {
  tope: string;   // max del tramo (# de ciudades); '' = sin tope (solo el último)
  factor: string; // multiplicador (decimal)
}

const soloEnteros = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 3);
function soloDecimal(v: string): string {
  const s = v.replace(/[^0-9.]/g, '');
  const partes = s.split('.');
  return (partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : s).slice(0, 6);
}

function aFilas(tramos: TramoCiudades[]): FilaTramo[] {
  if (tramos.length === 0) return [{ tope: '', factor: '1' }];
  return tramos.map((t) => ({ tope: t.max === null ? '' : String(t.max), factor: String(t.factor) }));
}

/** Inicio (min) de cada tramo, derivado del tope del anterior. NaN si el tope previo no es válido. */
function minsDe(filas: FilaTramo[]): number[] {
  const r: number[] = [1];
  for (let i = 1; i < filas.length; i++) {
    const prev = Number(filas[i - 1].tope);
    r.push(filas[i - 1].tope.trim() !== '' && Number.isInteger(prev) ? prev + 1 : NaN);
  }
  return r;
}

/** Construye y valida los tramos finales a partir de las filas (espejo de la validación del backend). */
function construir(filas: FilaTramo[]): { ok: true; tramos: TramoCiudades[] } | { ok: false; error: string } {
  const out: TramoCiudades[] = [];
  let min = 1;
  for (let i = 0; i < filas.length; i++) {
    const esUltimo = i === filas.length - 1;
    const factor = Number(filas[i].factor);
    if (filas[i].factor.trim() === '' || !Number.isFinite(factor) || factor < 0) {
      return { ok: false, error: 'Cada tramo necesita un factor válido (≥ 0).' };
    }
    let max: number | null;
    if (esUltimo) {
      max = null;
    } else {
      const t = Number(filas[i].tope);
      if (filas[i].tope.trim() === '' || !Number.isInteger(t)) return { ok: false, error: 'Falta el tope de un tramo.' };
      if (t < min) return { ok: false, error: `Un tope (${t}) no puede ser menor que el inicio del tramo (${min}).` };
      max = t;
    }
    out.push({ min, max, factor });
    if (max !== null) min = max + 1;
  }
  return { ok: true, tramos: out };
}

export function DialogoEditarTramosCiudades({ fila, onCerrar }: { fila: ConfigFila; onCerrar: () => void }) {
  const guardar = useActualizarConfiguracion();
  const [filas, setFilas] = useState<FilaTramo[]>(() => aFilas(parsearTramosCiudades(fila.valor)));

  const mins = minsDe(filas);
  const resultado = construir(filas);
  const cambiado = resultado.ok && JSON.stringify(resultado.tramos) !== JSON.stringify(parsearTramosCiudades(fila.valor));
  const puedeGuardar = resultado.ok && cambiado && !guardar.isPending;

  const setTope = (i: number, v: string) => setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, tope: soloEnteros(v) } : f)));
  const setFactor = (i: number, v: string) => setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, factor: soloDecimal(v) } : f)));

  const agregar = () =>
    setFilas((fs) => {
      const minUltimo = minsDe(fs)[fs.length - 1];
      const topeSugerido = Number.isInteger(minUltimo) ? String(minUltimo + 2) : '';
      const nuevas = [...fs];
      nuevas[nuevas.length - 1] = { ...nuevas[nuevas.length - 1], tope: topeSugerido };
      nuevas.push({ tope: '', factor: nuevas[nuevas.length - 1].factor });
      return nuevas;
    });
  const quitar = (i: number) =>
    setFilas((fs) => {
      if (fs.length <= 1) return fs;
      const nuevas = fs.filter((_, idx) => idx !== i);
      nuevas[nuevas.length - 1] = { ...nuevas[nuevas.length - 1], tope: '' };
      return nuevas;
    });

  const enviar = () => {
    if (!puedeGuardar || !resultado.ok) return;
    guardar.mutate({ clave: fila.clave, valor: JSON.stringify(resultado.tramos) }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="xl"
      discriminador="config-tramos-ciudades"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-config-tramos-ciudades">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <LayoutGrid size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-texto">Multiplicador por ciudades</div>
            <div className="text-[12px] text-texto-3">A más ciudades, mayor factor sobre el precio base.</div>
          </div>
        </div>

        {/* Tramos */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
            <span>Ciudades</span>
            <span className="pr-10">Factor (×)</span>
          </div>
          <div className="flex flex-col gap-2">
            {filas.map((f, i) => {
              const min = mins[i];
              const esUltimo = i === filas.length - 1;
              return (
                <div key={i} className="flex items-center gap-3 rounded-[10px] border border-borde bg-superficie px-3.5 py-3" data-testid={`tramo-ciudad-${i}`}>
                  <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-texto-2">
                    <span className="text-texto-3">De</span>
                    <span className="grid h-7 min-w-[28px] place-items-center rounded-[7px] bg-superficie-2 px-1.5 font-semibold tabular-nums text-texto">
                      {Number.isInteger(min) ? min : '—'}
                    </span>
                    {esUltimo ? (
                      <span className="text-texto-3">en adelante</span>
                    ) : (
                      <>
                        <span className="text-texto-3">a</span>
                        <input
                          inputMode="numeric"
                          value={f.tope}
                          onChange={(e) => setTope(i, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && enviar()}
                          data-testid={`tramo-ciudad-${i}-tope`}
                          className={`${CAMPO_BASE} h-7 w-16 px-2 text-center`}
                        />
                      </>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[13px] font-medium text-texto-3">×</span>
                    <input
                      inputMode="decimal"
                      value={f.factor}
                      onChange={(e) => setFactor(i, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enviar()}
                      data-testid={`tramo-ciudad-${i}-factor`}
                      className={`${CAMPO_BASE} h-9 w-24 pl-6 pr-2.5 text-right font-semibold`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid={`tramo-ciudad-${i}-quitar`}
                    onClick={() => quitar(i)}
                    disabled={filas.length <= 1}
                    aria-label="Quitar tramo"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-texto-4 transition hover:bg-peligro-suave hover:text-peligro disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="config-tramos-ciudades-agregar"
            onClick={agregar}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-borde-fuerte py-2.5 text-[12.5px] font-semibold text-texto-3 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
          >
            <Plus size={15} /> Agregar tramo
          </button>

          {/* Vista previa / error */}
          <div className="mt-4 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Vista previa</div>
            {resultado.ok ? (
              <div className="flex flex-wrap gap-1.5">
                {resultado.tramos.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2.5 py-1 text-[12px]">
                    <span className="tabular-nums text-texto-2">{t.max === null ? `${t.min}+` : t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`}</span>
                    <span className="font-semibold tabular-nums text-texto">×{t.factor}</span>
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
          <button type="button" data-testid="config-tramos-ciudades-cancelar" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>
            Cancelar
          </button>
          <button type="button" data-testid="config-tramos-ciudades-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarTramosCiudades;
