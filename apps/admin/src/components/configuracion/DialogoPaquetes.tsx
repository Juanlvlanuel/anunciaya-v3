/**
 * DialogoPaquetes.tsx
 * ===================
 * Editor de PAQUETES promocionales de apertura (Configuración · Membresía · Promociones). Cada paquete
 * otorga N meses de membresía cobrando M (ej. "Apertura 3x1" = 3 meses por el pago de 1). El super los
 * define, activa/desactiva y ajusta; gerentes y vendedores los aplican con 1 clic al afiliar un negocio.
 *
 * Reglas (espejo de `validarPaquetes` del backend): al menos un paquete; nombre no vacío; meses otorgados
 * entero 1–36; meses cobrados entero 1..otorgados. El `id` (slug estable) se conserva en las filas
 * existentes y se deriva del nombre en las nuevas, garantizando unicidad. Tokens: `Tokens_Panel.md`
 * (calcado de DialogoPeriodos.tsx).
 *
 * Ubicación: apps/admin/src/components/configuracion/DialogoPaquetes.tsx
 */

import { useState } from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useActualizarConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearPaquetes, type ConfigFila, type PaquetePromocion } from '../../services/configuracionService';

const CAMPO_BASE =
  'rounded-[8px] border border-campo-borde bg-campo text-[13px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

interface FilaPaquete {
  id: string;        // id original (vacío en filas nuevas → se deriva del nombre al guardar)
  nombre: string;
  otorgados: string; // meses de vigencia (entero 1–36)
  cobrados: string;  // meses cobrados (entero 1..otorgados)
  activo: boolean;
}

const soloEnteros = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2);

/** Deriva un slug estable a partir del nombre (para el id de un paquete nuevo). */
function slugify(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'paquete';
}

function aFilas(paquetes: PaquetePromocion[]): FilaPaquete[] {
  if (paquetes.length === 0) return [{ id: '', nombre: 'Apertura 3x1', otorgados: '3', cobrados: '1', activo: true }];
  return paquetes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    otorgados: String(p.mesesOtorgados),
    cobrados: String(p.mesesCobrados),
    activo: p.activo,
  }));
}

/** Construye y valida los paquetes finales a partir de las filas (espejo de la validación del backend). */
function construir(filas: FilaPaquete[]): { ok: true; paquetes: PaquetePromocion[] } | { ok: false; error: string } {
  const out: PaquetePromocion[] = [];
  const ids = new Set<string>();
  for (const f of filas) {
    const nombre = f.nombre.trim();
    if (nombre === '') return { ok: false, error: 'Cada paquete necesita un nombre.' };
    const otorgados = Number(f.otorgados);
    if (f.otorgados.trim() === '' || !Number.isInteger(otorgados) || otorgados < 1 || otorgados > 36) {
      return { ok: false, error: 'Los meses otorgados deben ser un entero entre 1 y 36.' };
    }
    const cobrados = Number(f.cobrados);
    if (f.cobrados.trim() === '' || !Number.isInteger(cobrados) || cobrados < 1 || cobrados > otorgados) {
      return { ok: false, error: 'Los meses cobrados deben ser un entero entre 1 y los meses otorgados.' };
    }
    // id estable: conserva el original válido; si es nuevo, lo deriva del nombre y asegura unicidad.
    let id = f.id && /^[a-z0-9_]+$/.test(f.id) ? f.id : slugify(nombre);
    if (ids.has(id)) {
      let n = 2;
      while (ids.has(`${id}_${n}`)) n++;
      id = `${id}_${n}`;
    }
    ids.add(id);
    out.push({ id, nombre, mesesOtorgados: otorgados, mesesCobrados: cobrados, activo: f.activo });
  }
  return { ok: true, paquetes: out };
}

export function DialogoEditarPaquetes({ fila, onCerrar }: { fila: ConfigFila; onCerrar: () => void }) {
  const guardar = useActualizarConfiguracion();
  const [filas, setFilas] = useState<FilaPaquete[]>(() => aFilas(parsearPaquetes(fila.valor)));

  const resultado = construir(filas);
  const original = parsearPaquetes(fila.valor);
  const cambiado = resultado.ok && JSON.stringify(resultado.paquetes) !== JSON.stringify(original);
  const puedeGuardar = resultado.ok && cambiado && !guardar.isPending;

  const setCampo = (i: number, campo: keyof FilaPaquete, v: string | boolean) =>
    setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, [campo]: v } : f)));

  const agregar = () => setFilas((fs) => [...fs, { id: '', nombre: '', otorgados: '', cobrados: '1', activo: true }]);
  const quitar = (i: number) => setFilas((fs) => (fs.length <= 1 ? fs : fs.filter((_, idx) => idx !== i)));

  const enviar = () => {
    if (!puedeGuardar || !resultado.ok) return;
    guardar.mutate({ clave: fila.clave, valor: JSON.stringify(resultado.paquetes) }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="xl"
      discriminador="config-paquetes"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-config-paquetes">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <Gift size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-texto">Paquetes de apertura</div>
            <div className="text-[12px] text-texto-3">Otorgan varios meses cobrando 1 (ej. 3x1). Gerentes y vendedores los aplican al afiliar.</div>
          </div>
        </div>

        {/* Paquetes */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-2">
            {filas.map((f, i) => (
              <div key={i} className="rounded-[10px] border border-borde bg-superficie px-3.5 py-3" data-testid={`paquete-${i}`}>
                <div className="flex items-center gap-2">
                  <input
                    value={f.nombre}
                    onChange={(e) => setCampo(i, 'nombre', e.target.value.slice(0, 40))}
                    onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    placeholder="Nombre (ej. Apertura 3x1)"
                    data-testid={`paquete-${i}-nombre`}
                    className={`${CAMPO_BASE} h-9 flex-1 px-2.5 font-semibold placeholder:font-normal placeholder:text-texto-4`}
                  />
                  {/* Toggle activo */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={f.activo}
                    aria-label={f.activo ? 'Paquete activo' : 'Paquete inactivo'}
                    onClick={() => setCampo(i, 'activo', !f.activo)}
                    data-testid={`paquete-${i}-activo`}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${f.activo ? 'bg-marca' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f.activo ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <button
                    type="button"
                    data-testid={`paquete-${i}-quitar`}
                    onClick={() => quitar(i)}
                    disabled={filas.length <= 1}
                    aria-label="Quitar paquete"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-texto-4 transition hover:bg-peligro-suave hover:text-peligro disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-4 pl-0.5 text-[13px] text-texto-2">
                  <label className="flex items-center gap-2">
                    <span className="text-texto-3">Otorga</span>
                    <input
                      inputMode="numeric"
                      value={f.otorgados}
                      onChange={(e) => setCampo(i, 'otorgados', soloEnteros(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && enviar()}
                      data-testid={`paquete-${i}-otorgados`}
                      className={`${CAMPO_BASE} h-9 w-14 px-2 text-center font-semibold tabular-nums`}
                    />
                    <span className="text-texto-3">meses</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-texto-3">cobrando</span>
                    <input
                      inputMode="numeric"
                      value={f.cobrados}
                      onChange={(e) => setCampo(i, 'cobrados', soloEnteros(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && enviar()}
                      data-testid={`paquete-${i}-cobrados`}
                      className={`${CAMPO_BASE} h-9 w-14 px-2 text-center font-semibold tabular-nums`}
                    />
                    <span className="text-texto-3">{f.cobrados === '1' ? 'mes' : 'meses'}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            data-testid="config-paquetes-agregar"
            onClick={agregar}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-borde-fuerte py-2.5 text-[12.5px] font-semibold text-texto-3 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
          >
            <Plus size={15} /> Agregar paquete
          </button>

          {/* Vista previa / error */}
          <div className="mt-4 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Vista previa</div>
            {resultado.ok ? (
              <div className="flex flex-wrap gap-1.5">
                {resultado.paquetes.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2.5 py-1 text-[12px]">
                    <span className="font-semibold text-texto-2">{p.nombre}</span>
                    <span className="tabular-nums text-texto-3">{p.mesesOtorgados}×{p.mesesCobrados}</span>
                    <span className="font-semibold tabular-nums" style={{ color: p.activo ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}>
                      {p.activo ? 'activo' : 'inactivo'}
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
          <button type="button" data-testid="config-paquetes-cancelar" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>
            Cancelar
          </button>
          <button type="button" data-testid="config-paquetes-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarPaquetes;
