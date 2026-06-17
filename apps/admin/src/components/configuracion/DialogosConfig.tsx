/**
 * DialogosConfig.tsx
 * ==================
 * Diálogos de edición de la sección "Configuración" del Panel (módulo 9, Fase 2). Dos editores:
 *
 *   - DialogoEditarNumero   → un valor numérico simple (trial, gracia): input + rango + guardar.
 *   - DialogoEditarEscalera → editor de TRAMOS de la escalera de comisiones. El usuario define los
 *     cortes (topes) y montos; el inicio de cada tramo se deriva del tope del anterior (sin huecos ni
 *     solapes por construcción), con vista previa en vivo. El último tramo siempre queda "en adelante".
 *
 * Ambos consumen `useActualizarConfiguracion` (PATCH /admin/configuracion/:clave) y cierran al guardar.
 * El backend revalida todo (defensa en profundidad). Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/DialogosConfig.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useActualizarConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearEscalera, type ConfigFila, type TramoEscalera } from '../../services/configuracionService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const CAMPO_MINI =
  'rounded-[8px] border border-campo-borde bg-campo px-2 py-1.5 text-[13px] text-texto text-center outline-none transition tabular-nums focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

// =============================================================================
// CAMPO NUMÉRICO CON RUEDA DEL MOUSE
// =============================================================================

/**
 * Input de solo dígitos que además sube/baja con la rueda del mouse cuando está ENFOCADO (igual que un
 * `<input type=number>` nativo: requiere foco para no cambiar valores sin querer al scrollear el modal).
 * El listener `wheel` se registra no-passive para poder frenar el scroll de la página mientras se ajusta.
 */
function CampoNumero({
  valor,
  onCambiar,
  className,
  maxLen,
  min = 0,
  autoFocus,
  onEnter,
  testid,
}: {
  valor: string;
  onCambiar: (v: string) => void;
  className: string;
  maxLen: number;
  min?: number;
  autoFocus?: boolean;
  onEnter?: () => void;
  testid?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Refs para que el listener (montado una sola vez) lea siempre los valores frescos.
  const cbRef = useRef(onCambiar);
  cbRef.current = onCambiar;
  const minRef = useRef(min);
  minRef.current = min;
  const maxLenRef = useRef(maxLen);
  maxLenRef.current = maxLen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el) return; // solo cuando el campo tiene el foco
      e.preventDefault();
      const actual = Number(el.value || '0') || 0;
      const paso = e.deltaY < 0 ? 1 : -1;
      cbRef.current(String(Math.max(minRef.current, actual + paso)).slice(0, maxLenRef.current));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <input
      ref={ref}
      inputMode="numeric"
      autoFocus={autoFocus}
      data-testid={testid}
      value={valor}
      onChange={(e) => onCambiar(e.target.value.replace(/[^0-9]/g, '').slice(0, maxLen))}
      onKeyDown={(e) => onEnter && e.key === 'Enter' && onEnter()}
      className={className}
    />
  );
}

// =============================================================================
// EDITAR UN NÚMERO (trial / gracia)
// =============================================================================

export function DialogoEditarNumero({ fila, onCerrar }: { fila: ConfigFila; onCerrar: () => void }) {
  const guardar = useActualizarConfiguracion();
  const [valor, setValor] = useState(fila.valor);

  const n = Number(valor);
  const valido =
    valor.trim() !== '' &&
    Number.isInteger(n) &&
    (fila.min === null || n >= fila.min) &&
    (fila.max === null || n <= fila.max);
  const cambiado = valor.trim() !== fila.valor;
  const puedeGuardar = valido && cambiado && !guardar.isPending;

  const enviar = () => {
    if (!puedeGuardar) return;
    guardar.mutate({ clave: fila.clave, valor: String(n) }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo={fila.etiqueta}
      iconoTitulo={<span className="grid h-8 w-8 place-items-center rounded-[9px] bg-marca-suave text-marca"><Layers size={16} /></span>}
      ancho="sm"
      discriminador="config-numero"
    >
      <div className="p-5" data-testid="dialogo-config-numero">
        <p className="text-[13px] leading-relaxed text-texto-3">{fila.descripcion}</p>
        <div className="mt-4">
          <label className={LABEL}>Nuevo valor</label>
          <div className="flex items-center gap-2.5">
            <CampoNumero
              valor={valor}
              onCambiar={setValor}
              autoFocus
              onEnter={enviar}
              min={fila.min ?? 0}
              maxLen={4}
              testid="config-num-input"
              className={`${CLASE_CAMPO} w-24 text-center text-[18px] font-bold`}
            />
            {fila.unidad && <span className="text-[14px] text-texto-3">{fila.unidad}</span>}
          </div>
          <p className="mt-2 text-[11.5px] text-texto-4">
            Permitido entre {fila.min ?? 0} y {fila.max ?? '∞'} {fila.unidad ?? ''}.
          </p>
          {valor.trim() !== '' && !valido && (
            <p className="mt-1 text-[12px] font-medium text-peligro">
              Escribe un número entero entre {fila.min ?? 0} y {fila.max ?? '∞'}.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" data-testid="config-num-cancelar" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>
          Cancelar
        </button>
        <button type="button" data-testid="config-num-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// EDITAR LA ESCALERA (tramos)
// =============================================================================

interface FilaTramo {
  tope: string; // max del tramo como texto; '' = sin tope (solo el último)
  monto: string;
}

function aFilas(tramos: TramoEscalera[]): FilaTramo[] {
  if (tramos.length === 0) return [{ tope: '', monto: '0' }];
  return tramos.map((t) => ({ tope: t.max === null ? '' : String(t.max), monto: String(t.montoPorActivo) }));
}

/** Inicio (min) de cada tramo, derivado del tope del anterior. NaN si el tope previo no es válido. */
function minsDe(filas: FilaTramo[]): number[] {
  const r: number[] = [0];
  for (let i = 1; i < filas.length; i++) {
    const prev = Number(filas[i - 1].tope);
    r.push(filas[i - 1].tope.trim() !== '' && Number.isInteger(prev) ? prev + 1 : NaN);
  }
  return r;
}

/** Construye y valida la escalera final a partir de las filas (espejo de la validación del backend). */
function construir(filas: FilaTramo[]): { ok: true; tramos: TramoEscalera[] } | { ok: false; error: string } {
  const out: TramoEscalera[] = [];
  let min = 0;
  for (let i = 0; i < filas.length; i++) {
    const esUltimo = i === filas.length - 1;
    const monto = Number(filas[i].monto);
    if (filas[i].monto.trim() === '' || !Number.isFinite(monto) || monto < 0) {
      return { ok: false, error: 'Cada tramo necesita un monto válido (≥ 0).' };
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
    out.push({ min, max, montoPorActivo: monto });
    if (max !== null) min = max + 1;
  }
  return { ok: true, tramos: out };
}

export function DialogoEditarEscalera({ fila, onCerrar }: { fila: ConfigFila; onCerrar: () => void }) {
  const guardar = useActualizarConfiguracion();
  const [filas, setFilas] = useState<FilaTramo[]>(() => aFilas(parsearEscalera(fila.valor)));

  const mins = minsDe(filas);
  const resultado = construir(filas);
  const cambiado = resultado.ok && JSON.stringify(resultado.tramos) !== JSON.stringify(parsearEscalera(fila.valor));
  const puedeGuardar = resultado.ok && cambiado && !guardar.isPending;

  // El filtrado/clamp lo hace CampoNumero; aquí solo se asienta el valor.
  const setTope = (i: number, v: string) =>
    setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, tope: v } : f)));
  const setMonto = (i: number, v: string) =>
    setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, monto: v } : f)));

  const agregar = () =>
    setFilas((fs) => {
      const minUltimo = minsDe(fs)[fs.length - 1];
      const topeSugerido = Number.isInteger(minUltimo) ? String(minUltimo + 9) : '';
      const nuevas = [...fs];
      nuevas[nuevas.length - 1] = { ...nuevas[nuevas.length - 1], tope: topeSugerido };
      nuevas.push({ tope: '', monto: nuevas[nuevas.length - 1].monto });
      return nuevas;
    });
  const quitar = (i: number) =>
    setFilas((fs) => {
      if (fs.length <= 1) return fs;
      const nuevas = fs.filter((_, idx) => idx !== i);
      nuevas[nuevas.length - 1] = { ...nuevas[nuevas.length - 1], tope: '' }; // el nuevo último siempre "en adelante"
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
      discriminador="config-escalera"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-config-escalera">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <Layers size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-texto">Escalera de comisiones</div>
            <div className="text-[12px] text-texto-3">Define los tramos por número de negocios activos.</div>
          </div>
        </div>

        {/* Tramos */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-2 grid grid-cols-[1fr_auto] px-1 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
            <span>Negocios activos</span>
            <span>Monto por activo / mes</span>
          </div>
          <div className="flex flex-col gap-2">
            {filas.map((f, i) => {
              const min = mins[i];
              const esUltimo = i === filas.length - 1;
              return (
                <div key={i} className="flex items-center gap-2 rounded-[10px] border border-borde bg-superficie px-3 py-2.5" data-testid={`tramo-${i}`}>
                  <div className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-texto-2">
                    <span className="text-texto-3">De</span>
                    <span className="font-semibold tabular-nums">{Number.isInteger(min) ? min : '—'}</span>
                    {esUltimo ? (
                      <span className="text-texto-3">en adelante</span>
                    ) : (
                      <>
                        <span className="text-texto-3">a</span>
                        <CampoNumero
                          valor={f.tope}
                          onCambiar={(v) => setTope(i, v)}
                          maxLen={5}
                          testid={`tramo-${i}-tope`}
                          className={`${CAMPO_MINI} w-16`}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[13px] text-texto-3">$</span>
                    <CampoNumero
                      valor={f.monto}
                      onCambiar={(v) => setMonto(i, v)}
                      maxLen={7}
                      testid={`tramo-${i}-monto`}
                      className={`${CAMPO_MINI} w-20`}
                    />
                    <button
                      type="button"
                      data-testid={`tramo-${i}-quitar`}
                      onClick={() => quitar(i)}
                      disabled={filas.length <= 1}
                      aria-label="Quitar tramo"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-texto-4 transition hover:bg-peligro-suave hover:text-peligro disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="config-escalera-agregar"
            onClick={agregar}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-[9px] border border-dashed border-borde-fuerte px-3 py-2 text-[12.5px] font-semibold text-texto-3 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
          >
            <Plus size={15} /> Agregar tramo
          </button>

          {/* Vista previa / error */}
          <div className="mt-4 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Vista previa</div>
            {resultado.ok ? (
              <p className="text-[13px] text-texto-2">
                {resultado.tramos.map((t, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-texto-4"> · </span>}
                    <span className="tabular-nums">{t.max === null ? `${t.min}+` : `${t.min}–${t.max}`}</span>
                    <span className="text-texto-3"> → </span>
                    <span className="font-semibold" style={{ color: t.montoPorActivo > 0 ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}>
                      {t.montoPorActivo > 0 ? `$${t.montoPorActivo}` : '$0'}
                    </span>
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-[12.5px] font-medium text-peligro">{resultado.error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button type="button" data-testid="config-escalera-cancelar" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>
            Cancelar
          </button>
          <button type="button" data-testid="config-escalera-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {guardar.isPending ? 'Guardando…' : 'Guardar escalera'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}
