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
import { Wallet, RefreshCw, Plus, Paperclip, Check, ImageIcon, Landmark, Banknote } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorFecha } from '../ui/SelectorFecha';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import {
  usePagosVendedor,
  useComisionesVendedor,
  useRegistrarPago,
  useDatosCobro,
  useGuardarDatosCobro,
  useEfectivoVendedor,
} from '../../hooks/queries/useVendedoresAdmin';
import { subirComprobante, descartarComprobante, type ComisionFila, type PagoFila, type DatosCobro } from '../../services/vendedoresService';
import { SelectorPeriodo, periodosDe } from './SelectorPeriodo';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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
  const { data: corte } = useEfectivoVendedor(vendedorId);
  const fileRef = useRef<HTMLInputElement>(null);
  // URLs subidas en esta sesión: al cerrar/quitar se mandan al backend, que borra de R2 las que ningún
  // pago referencia (las guardadas quedan protegidas por reference count).
  const subidasSesion = useRef<Set<string>>(new Set());

  const [transferencia, setTransferencia] = useState('');
  const [efectivoMonto, setEfectivoMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [nota, setNota] = useState('');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState<string | null>(null);

  // Saldo a pagar = comisiones pendientes (lo que falta de cada una) − efectivo que el vendedor debe.
  const devengadoPendiente = useMemo(() => pendientes.reduce((s, c) => s + (c.monto - c.montoPagado), 0), [pendientes]);
  const deuda = Math.max(0, corte?.saldo ?? 0);
  const compensado = Math.min(devengadoPendiente, deuda);
  const saldoNeto = Math.max(0, Math.round((devengadoPendiente - compensado) * 100) / 100);

  const montoT = Number(transferencia) || 0;
  const montoE = Number(efectivoMonto) || 0;
  const abono = Math.round((montoT + montoE) * 100) / 100;
  const excede = abono > saldoNeto + 0.01;
  const puedeGuardar = abono > 0 && !excede && !registrar.isPending && !subiendo;

  const soloNum = (v: string) => v.replace(/[^0-9.]/g, '');
  // Subida OPTIMISTA (mismo patrón que apps/web · useR2Upload): preview local INMEDIATO con un blob URL y,
  // al terminar la subida real a R2, se reemplaza el blob por la URL pública (revocando el blob).
  const onArchivo = async (file: File | undefined) => {
    if (!file) return;
    const anterior = comprobanteUrl;
    const blobUrl = URL.createObjectURL(file);
    setComprobanteUrl(blobUrl); // se ve YA, sin esperar la subida
    setSubiendo(true);
    setErrorComprobante(null);
    try {
      const url = await subirComprobante(file);
      if (url) {
        subidasSesion.current.add(url);
        setComprobanteUrl(url); // blob → URL pública de R2
        if (anterior && anterior !== url && !anterior.startsWith('blob:')) {
          subidasSesion.current.delete(anterior);
          void descartarComprobante([anterior]); // si reemplazó una de R2, bórrala
        }
      } else {
        setComprobanteUrl(anterior && !anterior.startsWith('blob:') ? anterior : null); // falló → restaurar/limpiar
        setErrorComprobante('No se pudo subir el comprobante. Revisa el formato (JPG/PNG/WEBP) o la conexión y vuelve a intentar.');
      }
    } finally {
      URL.revokeObjectURL(blobUrl);
      setSubiendo(false);
    }
  };

  // Quitar el comprobante: lo saca del estado y, como no quedó ligado a un pago, lo BORRA de R2 al instante.
  const quitarComprobante = () => {
    const url = comprobanteUrl;
    setComprobanteUrl(null);
    if (url && !url.startsWith('blob:')) {
      subidasSesion.current.delete(url);
      void descartarComprobante([url]);
    }
  };

  // Al cerrar (X / Cancelar / tras registrar): descarta de R2 los comprobantes subidos pero no ligados a un pago.
  const cerrarConLimpieza = () => {
    void descartarComprobante(Array.from(subidasSesion.current));
    onCerrar();
  };

  const enviar = () => {
    if (!puedeGuardar) return;
    registrar.mutate(
      { id: vendedorId, datos: { montoTransferencia: montoT, montoEfectivo: montoE, fechaPago, nota: nota.trim() || null, comprobanteUrl } },
      { onSuccess: cerrarConLimpieza },
    );
  };

  return (
    <ModalAdaptativo abierto onCerrar={cerrarConLimpieza} mostrarHeader={false} sinScrollInterno ancho="md" alturaMaxima="xl" discriminador="registrar-pago">
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-registrar-pago">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca"><Wallet size={17} /></span>
          <div>
            <div className="text-[16px] font-bold text-texto">Registrar abono</div>
            <div className="text-[12px] text-texto-3">Abona contra el saldo. Puedes pagar una parte y dividir en transferencia/efectivo.</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Saldo a pagar */}
          <div className="rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3" data-testid="pago-saldo">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-texto-3">Comisiones pendientes</span>
              <span className="font-semibold tabular-nums text-texto">{pesos(devengadoPendiente)}</span>
            </div>
            {compensado > 0 && (
              <div className="mt-1.5 flex items-center justify-between text-[13px]">
                <span className="text-texto-3">− Efectivo por entregar</span>
                <span className="font-semibold tabular-nums text-texto-2" data-testid="pago-compensado">−{pesos(compensado)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-borde pt-2">
              <span className="text-[13px] font-semibold text-texto-2">Saldo a pagar</span>
              <span className="text-[16px] font-bold tabular-nums text-texto" data-testid="pago-saldo-neto">{pesos(saldoNeto)}</span>
            </div>
          </div>

          {/* Comisiones (informativo, con parciales). El abono se aplica de la más antigua a la más nueva. */}
          {pendientes.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[12.5px] font-semibold text-texto-2">Se aplica de la más antigua</div>
              <div className="flex flex-col gap-1.5">
                {pendientes.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-[10px] border border-borde bg-superficie px-3 py-2" data-testid={`pago-comision-${c.id}`}>
                    <span className="flex-1 text-[13px] capitalize text-texto-2">{c.tipo === 'alta' ? 'Comisión de alta' : periodoLegible(c.periodo)}</span>
                    {c.montoPagado > 0 && <span className="text-[11.5px] text-texto-4">abonado {pesos(c.montoPagado)} de</span>}
                    <span className="text-[13.5px] font-semibold tabular-nums text-texto">{pesos(c.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abono dividido: transferencia + efectivo */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className={LABEL + ' mb-0'}>¿Cuánto abonas?</label>
              <button type="button" data-testid="pago-todo" onClick={() => { setTransferencia(String(saldoNeto)); setEfectivoMonto(''); }} className="text-[12px] font-semibold text-marca hover:underline">Abonar todo</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-[12px] text-texto-3">Transferencia</span>
                <div className="flex items-center gap-1"><span className="text-[14px] text-texto-3">$</span><input value={transferencia} onChange={(e) => setTransferencia(soloNum(e.target.value))} inputMode="decimal" placeholder="0" className={`${CLASE_CAMPO} font-semibold tabular-nums`} data-testid="pago-transferencia" /></div>
              </div>
              <div>
                <span className="mb-1 block text-[12px] text-texto-3">Efectivo</span>
                <div className="flex items-center gap-1"><span className="text-[14px] text-texto-3">$</span><input value={efectivoMonto} onChange={(e) => setEfectivoMonto(soloNum(e.target.value))} inputMode="decimal" placeholder="0" className={`${CLASE_CAMPO} font-semibold tabular-nums`} data-testid="pago-efectivo" /></div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[12.5px]">
              <span className="text-texto-3">Abono total</span>
              <span className={`font-semibold tabular-nums ${excede ? 'text-peligro' : 'text-texto'}`} data-testid="pago-abono">{pesos(abono)}</span>
            </div>
            {excede && <p className="mt-1 text-[11.5px] font-medium text-peligro">El abono supera el saldo a pagar ({pesos(saldoNeto)}).</p>}
            {!excede && abono > 0 && abono < saldoNeto && <p className="mt-1 text-[11.5px] text-texto-4">Quedará pendiente {pesos(saldoNeto - abono)}.</p>}
          </div>

          {/* Fecha + nota */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Fecha</label>
              <SelectorFecha value={fechaPago} onChange={setFechaPago} maxDate={hoyISO} testid="pago-fecha" />
            </div>
            <div>
              <label className={LABEL}>Nota <span className="font-normal text-texto-4">(opcional)</span></label>
              <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Referencia, folio…" className={CLASE_CAMPO} data-testid="pago-nota" />
            </div>
          </div>

          {/* Comprobante */}
          <div className="mt-3">
            <label className={LABEL}>Comprobante <span className="font-normal text-texto-4">(foto, opcional)</span></label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onArchivo(f); }} data-testid="pago-archivo" />
            {comprobanteUrl ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-borde bg-superficie px-3 py-2">
                <img src={comprobanteUrl} alt="comprobante" className={`h-12 w-12 rounded-[8px] object-cover ${subiendo ? 'opacity-60' : ''}`} />
                {subiendo ? (
                  <span className="flex-1 text-[12.5px] text-texto-3 inline-flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Subiendo…</span>
                ) : (
                  <span className="flex-1 text-[12.5px] text-ok inline-flex items-center gap-1"><Check size={14} /> Comprobante adjunto</span>
                )}
                {!subiendo && (
                  <button type="button" onClick={quitarComprobante} className="text-[12px] font-semibold text-texto-3 hover:text-peligro">Quitar</button>
                )}
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
            {errorComprobante && (
              <p className="mt-1.5 text-[12px] font-medium text-peligro" data-testid="pago-comprobante-error">{errorComprobante}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button type="button" onClick={cerrarConLimpieza} disabled={registrar.isPending} className={BTN_CANCELAR}>Cancelar</button>
          <button type="button" data-testid="pago-registrar" onClick={enviar} disabled={!puedeGuardar} className={BTN_GUARDAR}>
            {registrar.isPending ? 'Registrando…' : `Registrar ${pesos(abono)}`}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// SECCIÓN PAGOS (pestaña)
// =============================================================================

function FilaPago({ p, cols }: { p: PagoFila; cols: string }) {
  return (
    <div
      data-testid={`pago-${p.id}`}
      className="grid items-center gap-3.5 border-b border-borde px-4 py-2.5 text-[13px] last:border-b-0"
      style={{ gridTemplateColumns: cols }}
    >
      {/* Fecha */}
      <span className="font-semibold text-texto">{fechaCorta(p.fechaPago)}</span>
      {/* Método (+ nota) */}
      <span className="flex min-w-0 flex-col">
        <span className="truncate capitalize text-texto-2">{p.metodo}</span>
        {p.nota && <span className="truncate text-[12px] text-texto-4">{p.nota}</span>}
      </span>
      {/* Comprobante */}
      <span className="flex justify-center">
        {p.comprobanteUrl ? (
          <a href={p.comprobanteUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={p.comprobanteUrl} alt="comprobante" className="h-9 w-9 rounded-[8px] border border-borde object-cover" />
          </a>
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-[8px] border border-borde bg-superficie text-texto-4"><ImageIcon size={15} /></span>
        )}
      </span>
      {/* Monto */}
      <span className="text-right text-[14px] font-semibold tabular-nums" style={{ color: 'var(--panel-ok)' }}>{pesos(p.monto)}</span>
    </div>
  );
}

export function SeccionPagos({ vendedorId }: { vendedorId: string }) {
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const esSuper = rol === 'superadmin';
  const esVendedor = rol === 'vendedor'; // el vendedor solo se ve a sí mismo → copy en 1ª persona
  const { data: bitacora, isLoading, isError } = usePagosVendedor(vendedorId);
  const { data: comisiones } = useComisionesVendedor(vendedorId);
  const { data: datosCobro } = useDatosCobro(vendedorId, esSuper || esVendedor);

  const [registrando, setRegistrando] = useState(false);
  const [editandoCobro, setEditandoCobro] = useState(false);

  const pagos = bitacora?.items ?? [];
  const totalPagado = bitacora?.totalPagado ?? 0;
  const pendientes = (comisiones?.items ?? []).filter((c) => c.estado === 'pendiente' || c.estado === 'parcial');

  // Columnas del grid (header + filas comparten el mismo template, como la tabla de Recibos).
  const cols = 'minmax(100px,1fr) minmax(140px,1.8fr) 70px minmax(90px,1fr)';

  // Filtro por periodo (mes del pago): filtra la bitácora y recalcula el total mostrado.
  const [periodoSel, setPeriodoSel] = useState<string | null>(null);
  const periodos = useMemo(() => periodosDe(pagos.map((p) => p.fechaPago)), [pagos]);
  const pagosFiltrados = periodoSel ? pagos.filter((p) => p.fechaPago?.slice(0, 7) === periodoSel) : pagos;
  const totalMostrado = periodoSel ? pagosFiltrados.reduce((s, p) => s + p.monto, 0) : totalPagado;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="seccion-pagos">
      {/* Datos de cobro: los ve/edita el super y el PROPIO vendedor (el gerente no — dato sensible). */}
      {(esSuper || esVendedor) && (
        <div className="mb-3 flex shrink-0 items-center gap-3 rounded-[12px] border border-borde bg-superficie-2 px-4 py-3">
          {/* Ícono del método de cobro */}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-marca-suave text-marca">
            {datosCobro?.metodo === 'efectivo' ? <Banknote size={20} /> : <Landmark size={20} />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-texto-4">{esVendedor ? 'Mis datos de cobro' : 'Datos de cobro'}</span>
              {datosCobro && (
                <span className="rounded-full bg-marca-suave px-2 py-0.5 text-[10.5px] font-semibold capitalize text-marca">{datosCobro.metodo}</span>
              )}
            </div>

            {datosCobro ? (
              datosCobro.metodo === 'transferencia' ? (
                <div className="mt-1">
                  <div className="truncate text-[15px] font-bold tabular-nums tracking-[0.02em] text-texto" title={datosCobro.clabe ?? ''}>
                    {datosCobro.clabe ?? '—'}
                  </div>
                  {(datosCobro.banco || datosCobro.titular) && (
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-texto-3">
                      {datosCobro.banco && <span className="shrink-0 font-semibold text-texto-2">{datosCobro.banco}</span>}
                      {datosCobro.banco && datosCobro.titular && <span className="text-texto-4">·</span>}
                      {datosCobro.titular && <span className="truncate">{datosCobro.titular}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 truncate text-[13.5px] font-semibold text-texto">{datosCobro.titular ?? 'Pago en efectivo'}</div>
              )
            ) : (
              <div className="mt-1 text-[13px] text-texto-4">{esVendedor ? 'Captura dónde quieres recibir tus pagos.' : 'El vendedor aún no capturó sus datos de cobro.'}</div>
            )}
          </div>

          {/* Solo el PROPIO vendedor edita su CLABE (anti-fraude). El super solo la ve para pagar. */}
          {esVendedor && (
            <button type="button" data-testid="editar-datos-cobro" onClick={() => setEditandoCobro(true)} className="shrink-0 rounded-full border border-borde-fuerte bg-superficie px-3.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca">
              {datosCobro ? 'Editar' : 'Capturar'}
            </button>
          )}
        </div>
      )}

      {/* Encabezado + filtro de periodo + registrar */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-texto-2">{esVendedor ? 'Mis pagos' : 'Pagos al vendedor'} <span className="text-texto-4">· {pesos(totalMostrado)} {esVendedor ? 'recibido' : 'pagado'}</span></h3>
        <div className="flex items-center gap-2">
          {periodos.length > 0 && <SelectorPeriodo periodos={periodos} valor={periodoSel} onCambiar={setPeriodoSel} testid="pagos-periodo" />}
          {esSuper && (
            <button
              type="button"
              data-testid="abrir-registrar-pago"
              onClick={() => setRegistrando(true)}
              className="group inline-flex items-center gap-1.5 rounded-full bg-marca px-4 py-2 text-[12.5px] font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95"
            >
              <Plus size={14} className="transition-transform duration-300 group-hover:rotate-90" /> Registrar pago
            </button>
          )}
        </div>
      </div>

      {/* Bitácora (tabla, mismo patrón que Recibos) */}
      {isLoading && !bitacora ? (
        <EstadoSeccion variante="cargando" icono={Wallet} titulo="Cargando pagos…" />
      ) : isError ? (
        <EstadoSeccion variante="error" icono={Wallet} titulo="No se pudieron cargar los pagos." />
      ) : pagosFiltrados.length === 0 ? (
        <EstadoSeccion icono={Wallet} titulo={periodoSel ? 'Sin pagos en este periodo' : 'Sin pagos todavía'} descripcion={periodoSel ? 'Prueba con otro periodo o vuelve a "Todo el tiempo".' : esVendedor ? 'Cuando recibas un pago, aparecerá aquí con su comprobante.' : 'Cuando registres un pago al vendedor, aparecerá aquí con su comprobante.'} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde bg-superficie shadow-tarjeta-panel">
          {/* Header de columnas (fijo, fuera del scroll) */}
          <div
            className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4"
            style={{ gridTemplateColumns: cols }}
          >
            <span>Fecha</span>
            <span>Método</span>
            <span className="text-center">Comprobante</span>
            <span className="text-right">Monto</span>
          </div>
          {/* Cuerpo (scroll interno) */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pagosFiltrados.map((p) => <FilaPago key={p.id} p={p} cols={cols} />)}
          </div>
        </div>
      )}

      {registrando && <DialogoRegistrarPago vendedorId={vendedorId} pendientes={pendientes} onCerrar={() => setRegistrando(false)} />}
      {editandoCobro && <DialogoDatosCobro vendedorId={vendedorId} actual={datosCobro ?? null} onCerrar={() => setEditandoCobro(false)} />}
    </div>
  );
}

export default SeccionPagos;
