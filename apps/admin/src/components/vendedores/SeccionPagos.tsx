/**
 * SeccionPagos.tsx
 * ================
 * Pestaña "Pagos" del detalle del vendedor (Vendedores y comisiones · Fase 2 · pieza E — liquidación).
 * Muestra los datos de cobro + la bitácora de pagos (egresos), y —solo para el SuperAdmin— el botón
 * "Registrar pago" (selección de comisiones pendientes + monto editable + foto-comprobante) y la edición
 * de los datos de cobro. Diseño calcado de `SeccionComisiones` + `DialogosConfig`; tokens `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/vendedores/SeccionPagos.tsx
 */

import { useMemo, useRef, useState } from 'react';
import { Wallet, RefreshCw, Plus, Paperclip, Check, ImageIcon } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import {
  usePagosVendedor,
  useComisionesVendedor,
  useRegistrarPago,
  useDatosCobro,
  useGuardarDatosCobro,
} from '../../hooks/queries/useVendedoresAdmin';
import { subirComprobante, type ComisionFila, type PagoFila, type DatosCobro } from '../../services/vendedoresService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function periodoLegible(p: string | null): string {
  if (!p) return '—';
  const [y, m] = p.split('-');
  return MESES[Number(m) - 1] ? `${MESES[Number(m) - 1]} ${y}` : p;
}
function fechaCorta(f: string | null): string {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return MESES[Number(m) - 1] ? `${d} ${MESES[Number(m) - 1]} ${y}` : f;
}
function pesos(n: number): string {
  return `$${n.toLocaleString('es-MX')}`;
}

/** Toggle método transferencia / efectivo. */
function ToggleMetodo({ valor, onCambiar }: { valor: string; onCambiar: (m: 'transferencia' | 'efectivo') => void }) {
  return (
    <div className="inline-flex rounded-[10px] border border-borde bg-superficie-2 p-0.5">
      {(['transferencia', 'efectivo'] as const).map((m) => (
        <button
          key={m}
          type="button"
          data-testid={`metodo-${m}`}
          onClick={() => onCambiar(m)}
          className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold capitalize transition ${
            valor === m ? 'bg-marca text-marca-contraste' : 'text-texto-3 hover:text-texto'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// DIÁLOGO: DATOS DE COBRO
// =============================================================================

function DialogoDatosCobro({ vendedorId, actual, onCerrar }: { vendedorId: string; actual: DatosCobro | null; onCerrar: () => void }) {
  const guardar = useGuardarDatosCobro();
  const [metodo, setMetodo] = useState<'transferencia' | 'efectivo'>((actual?.metodo as 'transferencia' | 'efectivo') || 'transferencia');
  const [banco, setBanco] = useState(actual?.banco ?? '');
  const [clabe, setClabe] = useState(actual?.clabe ?? '');
  const [titular, setTitular] = useState(actual?.titular ?? '');
  const [nota, setNota] = useState(actual?.nota ?? '');

  const clabeOk = metodo !== 'transferencia' || clabe.replace(/\D/g, '').length === 18 || clabe.trim() === '';
  const puedeGuardar = clabeOk && !guardar.isPending;

  const enviar = () => {
    if (!puedeGuardar) return;
    guardar.mutate(
      { id: vendedorId, datos: { metodo, banco: banco.trim() || null, clabe: clabe.replace(/\D/g, '') || null, titular: titular.trim() || null, nota: nota.trim() || null } },
      { onSuccess: onCerrar },
    );
  };

  return (
    <ModalAdaptativo abierto onCerrar={onCerrar} titulo="Datos de cobro" ancho="sm" discriminador="datos-cobro">
      <div className="p-5" data-testid="dialogo-datos-cobro">
        <div className="mb-4">
          <label className={LABEL}>Método</label>
          <ToggleMetodo valor={metodo} onCambiar={setMetodo} />
        </div>
        {metodo === 'transferencia' && (
          <>
            <div className="mb-3">
              <label className={LABEL}>Banco</label>
              <input value={banco} onChange={(e) => setBanco(e.target.value)} maxLength={80} placeholder="Ej. BBVA" className={CLASE_CAMPO} data-testid="cobro-banco" />
            </div>
            <div className="mb-3">
              <label className={LABEL}>CLABE (18 dígitos)</label>
              <input
                value={clabe}
                onChange={(e) => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
                inputMode="numeric"
                placeholder="18 dígitos"
                className={`${CLASE_CAMPO} font-mono tabular-nums`}
                data-testid="cobro-clabe"
              />
              {clabe.trim() !== '' && !clabeOk && <p className="mt-1 text-[12px] font-medium text-peligro">La CLABE debe tener 18 dígitos.</p>}
            </div>
            <div className="mb-3">
              <label className={LABEL}>Titular</label>
              <input value={titular} onChange={(e) => setTitular(e.target.value)} maxLength={120} placeholder="Nombre del titular" className={CLASE_CAMPO} data-testid="cobro-titular" />
            </div>
          </>
        )}
        <div>
          <label className={LABEL}>Nota <span className="font-normal text-texto-4">(opcional)</span></label>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Referencia, observaciones…" className={CLASE_CAMPO} data-testid="cobro-nota" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" onClick={onCerrar} disabled={guardar.isPending} className={BTN_CANCELAR}>Cancelar</button>
        <button type="button" data-testid="cobro-guardar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// DIÁLOGO: REGISTRAR PAGO
// =============================================================================

function DialogoRegistrarPago({ vendedorId, pendientes, onCerrar }: { vendedorId: string; pendientes: ComisionFila[]; onCerrar: () => void }) {
  const registrar = useRegistrarPago();
  const fileRef = useRef<HTMLInputElement>(null);

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(() => new Set(pendientes.map((c) => c.id)));
  const [montoEditado, setMontoEditado] = useState<string | null>(null); // null = sigue la suma de lo seleccionado
  const [metodo, setMetodo] = useState<'transferencia' | 'efectivo'>('transferencia');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const sumaSel = useMemo(
    () => pendientes.filter((c) => seleccionadas.has(c.id)).reduce((s, c) => s + c.monto, 0),
    [pendientes, seleccionadas],
  );
  const montoStr = montoEditado ?? String(sumaSel);
  const monto = Number(montoStr);
  const montoValido = Number.isFinite(monto) && monto > 0;

  const toggle = (id: string) =>
    setSeleccionadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const onArchivo = async (file: File | undefined) => {
    if (!file) return;
    setSubiendo(true);
    try {
      const url = await subirComprobante(file);
      setComprobanteUrl(url);
    } finally {
      setSubiendo(false);
    }
  };

  const puedeGuardar = montoValido && !registrar.isPending && !subiendo;
  const enviar = () => {
    if (!puedeGuardar) return;
    registrar.mutate(
      {
        id: vendedorId,
        datos: {
          monto,
          metodo,
          fechaPago,
          nota: nota.trim() || null,
          comprobanteUrl,
          comisionIds: [...seleccionadas],
        },
      },
      { onSuccess: onCerrar },
    );
  };

  return (
    <ModalAdaptativo abierto onCerrar={onCerrar} mostrarHeader={false} sinScrollInterno ancho="md" alturaMaxima="xl" discriminador="registrar-pago">
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-registrar-pago">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca"><Wallet size={17} /></span>
          <div>
            <div className="text-[16px] font-bold text-texto">Registrar pago</div>
            <div className="text-[12px] text-texto-3">Marca las comisiones que cubre este pago.</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Comisiones pendientes */}
          {pendientes.length > 0 ? (
            <div className="mb-4">
              <div className="mb-1.5 text-[12.5px] font-semibold text-texto-2">Comisiones pendientes</div>
              <div className="flex flex-col gap-1.5">
                {pendientes.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-borde bg-superficie px-3 py-2.5" data-testid={`pago-comision-${c.id}`}>
                    <input type="checkbox" checked={seleccionadas.has(c.id)} onChange={() => { toggle(c.id); setMontoEditado(null); }} className="h-4 w-4 accent-[var(--panel-marca)]" />
                    <span className="flex-1 text-[13.5px] capitalize text-texto-2">{periodoLegible(c.periodo)}</span>
                    <span className="text-[14px] font-semibold tabular-nums text-texto">{pesos(c.monto)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-4 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5 text-[13px] text-texto-3">
              Sin comisiones pendientes. Puedes registrar un pago (abono) de monto libre.
            </p>
          )}

          {/* Monto + método + fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Monto a pagar</label>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] text-texto-3">$</span>
                <input
                  value={montoStr}
                  onChange={(e) => setMontoEditado(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  data-testid="pago-monto"
                  className={`${CLASE_CAMPO} text-[15px] font-semibold tabular-nums`}
                />
              </div>
              {montoEditado !== null && Number(montoEditado) !== sumaSel && (
                <p className="mt-1 text-[11.5px] text-texto-4">Seleccionado: {pesos(sumaSel)}</p>
              )}
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={CLASE_CAMPO} data-testid="pago-fecha" />
            </div>
          </div>

          <div className="mt-3">
            <label className={LABEL}>Método</label>
            <ToggleMetodo valor={metodo} onCambiar={setMetodo} />
          </div>

          <div className="mt-3">
            <label className={LABEL}>Nota <span className="font-normal text-texto-4">(opcional)</span></label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Referencia, folio…" className={CLASE_CAMPO} data-testid="pago-nota" />
          </div>

          {/* Comprobante */}
          <div className="mt-3">
            <label className={LABEL}>Comprobante <span className="font-normal text-texto-4">(foto, opcional)</span></label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onArchivo(e.target.files?.[0])} data-testid="pago-archivo" />
            {comprobanteUrl ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-borde bg-superficie px-3 py-2">
                <img src={comprobanteUrl} alt="comprobante" className="h-12 w-12 rounded-[8px] object-cover" />
                <span className="flex-1 text-[12.5px] text-ok inline-flex items-center gap-1"><Check size={14} /> Comprobante adjunto</span>
                <button type="button" onClick={() => setComprobanteUrl(null)} className="text-[12px] font-semibold text-texto-3 hover:text-peligro">Quitar</button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="pago-adjuntar"
                onClick={() => fileRef.current?.click()}
                disabled={subiendo}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-dashed border-borde-fuerte px-3 py-2 text-[12.5px] font-semibold text-texto-3 transition hover:border-marca hover:bg-marca-suave hover:text-marca disabled:opacity-50"
              >
                {subiendo ? <><RefreshCw size={14} className="animate-spin" /> Subiendo…</> : <><Paperclip size={14} /> Adjuntar foto</>}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button type="button" onClick={onCerrar} disabled={registrar.isPending} className={BTN_CANCELAR}>Cancelar</button>
          <button type="button" data-testid="pago-registrar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {registrar.isPending ? 'Registrando…' : `Registrar ${pesos(monto || 0)}`}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// SECCIÓN PAGOS (pestaña)
// =============================================================================

function FilaPago({ p }: { p: PagoFila }) {
  return (
    <div data-testid={`pago-${p.id}`} className="flex items-center gap-3 border-b border-borde px-4 py-3 last:border-b-0">
      {p.comprobanteUrl ? (
        <a href={p.comprobanteUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={p.comprobanteUrl} alt="" className="h-9 w-9 rounded-[8px] border border-borde object-cover" />
        </a>
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-borde bg-superficie text-texto-4"><ImageIcon size={15} /></span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold text-texto">{fechaCorta(p.fechaPago)}</span>
        <span className="truncate text-[13px] capitalize text-texto-3">{p.metodo}{p.nota ? ` · ${p.nota}` : ''}</span>
      </div>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: 'var(--panel-ok)' }}>{pesos(p.monto)}</span>
    </div>
  );
}

export function SeccionPagos({ vendedorId }: { vendedorId: string }) {
  const esSuper = useAuthPanelStore((s) => s.usuario?.rolEquipo) === 'superadmin';
  const { data: bitacora, isLoading, isError } = usePagosVendedor(vendedorId);
  const { data: comisiones } = useComisionesVendedor(vendedorId);
  const { data: datosCobro } = useDatosCobro(vendedorId, esSuper);

  const [registrando, setRegistrando] = useState(false);
  const [editandoCobro, setEditandoCobro] = useState(false);

  const pagos = bitacora?.items ?? [];
  const totalPagado = bitacora?.totalPagado ?? 0;
  const pendientes = (comisiones?.items ?? []).filter((c) => c.estado === 'pendiente');

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="seccion-pagos">
      {/* Datos de cobro (solo super) */}
      {esSuper && (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-[12px] border border-borde bg-superficie-2 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-texto-4">Datos de cobro</div>
            {datosCobro ? (
              <div className="text-[13px] text-texto-2">
                <span className="capitalize">{datosCobro.metodo}</span>
                {datosCobro.metodo === 'transferencia' && (datosCobro.clabe || datosCobro.banco) && (
                  <span className="text-texto-3"> · {datosCobro.banco ?? ''} {datosCobro.clabe ? `CLABE ${datosCobro.clabe}` : ''}{datosCobro.titular ? ` · ${datosCobro.titular}` : ''}</span>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-texto-4">Sin datos de cobro capturados.</div>
            )}
          </div>
          <button type="button" data-testid="editar-datos-cobro" onClick={() => setEditandoCobro(true)} className="shrink-0 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca">
            {datosCobro ? 'Editar' : 'Capturar'}
          </button>
        </div>
      )}

      {/* Encabezado + registrar */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-texto-2">Pagos al vendedor <span className="text-texto-4">· {pesos(totalPagado)} pagado</span></h3>
        {esSuper && (
          <button type="button" data-testid="abrir-registrar-pago" onClick={() => setRegistrando(true)} className="inline-flex items-center gap-1.5 rounded-[9px] bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition">
            <Plus size={14} /> Registrar pago
          </button>
        )}
      </div>

      {/* Bitácora */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-borde">
        {isLoading && !bitacora ? (
          <EstadoSeccion variante="cargando" icono={Wallet} titulo="Cargando pagos…" />
        ) : isError ? (
          <EstadoSeccion variante="error" icono={Wallet} titulo="No se pudieron cargar los pagos." />
        ) : pagos.length === 0 ? (
          <EstadoSeccion icono={Wallet} titulo="Sin pagos todavía" descripcion="Cuando registres un pago al vendedor, aparecerá aquí con su comprobante." />
        ) : (
          pagos.map((p) => <FilaPago key={p.id} p={p} />)
        )}
      </div>

      {registrando && <DialogoRegistrarPago vendedorId={vendedorId} pendientes={pendientes} onCerrar={() => setRegistrando(false)} />}
      {editandoCobro && <DialogoDatosCobro vendedorId={vendedorId} actual={datosCobro ?? null} onCerrar={() => setEditandoCobro(false)} />}
    </div>
  );
}

export default SeccionPagos;
