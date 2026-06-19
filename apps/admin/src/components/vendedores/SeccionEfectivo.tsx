/**
 * SeccionEfectivo.tsx
 * ===================
 * Pestaña "Efectivo" del detalle del vendedor (Vendedores y comisiones · Fase 2 · pieza D — cortes de efectivo).
 * El efectivo que el vendedor te DEBE entregar (cobró membresías en efectivo). Muestra el corte
 * (cobrado / entregado / descontado / saldo) + la bitácora de movimientos, y —super/gerente— el botón
 * "Registrar entrega". El cobro es automático (al dar de alta / marcar pagado en efectivo); el neteo
 * (descuento al pagarle comisión) lo hace la pestaña Pagos.
 *
 * Ubicación: apps/admin/src/components/vendedores/SeccionEfectivo.tsx
 */

import { useState } from 'react';
import { Banknote, Plus, ArrowDownLeft, ArrowUpRight, Link2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorFecha } from '../ui/SelectorFecha';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useEfectivoVendedor, useRegistrarMovimientoEfectivo } from '../../hooks/queries/useVendedoresAdmin';
import type { MovimientoEfectivoFila } from '../../services/vendedoresService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCorta(f: string | null): string {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return MESES[Number(m) - 1] ? `${d} ${MESES[Number(m) - 1]} ${y}` : f;
}
function pesos(n: number): string {
  return `$${n.toLocaleString('es-MX')}`;
}

/** Meta visual por tipo de movimiento. El signo es respecto a la DEUDA del vendedor. */
const META: Record<string, { etiqueta: string; icono: typeof ArrowDownLeft; signo: '+' | '−' }> = {
  cobro: { etiqueta: 'Cobró efectivo', icono: ArrowDownLeft, signo: '+' },
  entrega: { etiqueta: 'Entregó', icono: ArrowUpRight, signo: '−' },
  compensacion: { etiqueta: 'Descontado de su pago', icono: Link2, signo: '−' },
};

function FilaMovimiento({ m }: { m: MovimientoEfectivoFila }) {
  const meta = META[m.tipo] ?? META.cobro;
  const Icono = meta.icono;
  return (
    <div data-testid={`efectivo-mov-${m.id}`} className="flex items-center gap-3 border-b border-borde px-4 py-3 last:border-b-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-borde bg-superficie text-texto-3"><Icono size={15} /></span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-semibold text-texto">{meta.etiqueta}{m.negocioNombre ? ` · ${m.negocioNombre}` : ''}</span>
        <span className="truncate text-[12px] text-texto-3">{fechaCorta(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</span>
      </div>
      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-texto-2">{meta.signo}{pesos(m.monto)}</span>
    </div>
  );
}

// =============================================================================
// DIÁLOGO: REGISTRAR MOVIMIENTO (cobro / entrega)
// =============================================================================

function DialogoMovimiento({ vendedorId, saldo, onCerrar }: { vendedorId: string; saldo: number; onCerrar: () => void }) {
  const registrar = useRegistrarMovimientoEfectivo();
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const hoyISO = new Date().toISOString().slice(0, 10);

  const montoNum = Number(monto);
  const excede = saldo > 0 && montoNum > saldo + 0.01;
  const valido = Number.isFinite(montoNum) && montoNum > 0 && !excede;
  const puede = valido && !registrar.isPending;

  const enviar = () => {
    if (!puede) return;
    registrar.mutate(
      { id: vendedorId, datos: { tipo: 'entrega', monto: montoNum, fecha, nota: nota.trim() || null } },
      { onSuccess: onCerrar },
    );
  };

  return (
    <ModalAdaptativo abierto onCerrar={onCerrar} mostrarHeader={false} ancho="sm" discriminador="efectivo-mov">
      <div data-testid="dialogo-efectivo-mov">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-borde px-5 pt-4 pb-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca"><ArrowUpRight size={17} /></span>
          <div>
            <div className="text-[16px] font-bold text-texto">Registrar entrega</div>
            <div className="text-[12px] text-texto-3">El efectivo que el vendedor te entregó.</div>
          </div>
        </div>

        <div className="p-5">
          {/* Saldo por entregar */}
          <div className="mb-4 flex items-center justify-between rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
            <span className="text-[13px] text-texto-3">Por entregar</span>
            <span className="text-[16px] font-bold tabular-nums text-texto" data-testid="efectivo-por-entregar">{pesos(saldo)}</span>
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 items-end gap-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={LABEL + ' mb-0'}>Monto</label>
                {saldo > 0 && <button type="button" data-testid="efectivo-todo" onClick={() => setMonto(String(saldo))} className="text-[11.5px] font-semibold text-marca hover:underline">Todo</button>}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[14px] text-texto-3">$</span>
                <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" className={`${CLASE_CAMPO} font-semibold tabular-nums`} data-testid="efectivo-monto" />
              </div>
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <SelectorFecha value={fecha} onChange={setFecha} maxDate={hoyISO} testid="efectivo-fecha" />
            </div>
          </div>
          {excede && <p className="mt-1 text-[11.5px] font-medium text-peligro">No puede entregar más de lo que debe ({pesos(saldo)}).</p>}

          {/* Nota */}
          <div className="mt-3">
            <label className={LABEL}>Nota <span className="font-normal text-texto-4">(opcional)</span></label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Referencia, observaciones…" className={CLASE_CAMPO} data-testid="efectivo-nota" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" onClick={onCerrar} disabled={registrar.isPending} className={BTN_CANCELAR}>Cancelar</button>
        <button type="button" data-testid="efectivo-guardar" onClick={enviar} disabled={!puede} className={BTN_GUARDAR}>
          {registrar.isPending ? 'Guardando…' : `Registrar ${pesos(montoNum > 0 ? montoNum : 0)}`}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// SECCIÓN EFECTIVO (pestaña)
// =============================================================================

export function SeccionEfectivo({ vendedorId }: { vendedorId: string }) {
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const puedeRegistrar = rol === 'superadmin' || rol === 'gerente';
  const esVendedor = rol === 'vendedor'; // el vendedor solo se ve a sí mismo → copy en 1ª persona
  const { data: corte, isLoading, isError } = useEfectivoVendedor(vendedorId);
  const [registrando, setRegistrando] = useState(false);

  const movs = corte?.items ?? [];
  const saldo = corte?.saldo ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="seccion-efectivo">
      {/* Corte de caja */}
      <div className="mb-3 shrink-0 rounded-[12px] border border-borde bg-superficie-2 px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-texto-4">Por entregar</div>
            <div className="text-[24px] font-bold tabular-nums text-texto" data-testid="efectivo-saldo">{pesos(saldo)}</div>
          </div>
          <div className="flex gap-4 text-right">
            <div><div className="text-[11px] text-texto-4">Cobrado</div><div className="text-[14px] font-semibold tabular-nums text-texto-2">{pesos(corte?.cobrado ?? 0)}</div></div>
            <div><div className="text-[11px] text-texto-4">Entregado</div><div className="text-[14px] font-semibold tabular-nums text-texto-2">{pesos(corte?.entregado ?? 0)}</div></div>
            <div><div className="text-[11px] text-texto-4">Descontado</div><div className="text-[14px] font-semibold tabular-nums text-texto-2">{pesos(corte?.compensado ?? 0)}</div></div>
          </div>
        </div>
      </div>

      {/* Encabezado + registrar */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-texto-2">Movimientos</h3>
        {puedeRegistrar && (
          <button type="button" data-testid="abrir-registrar-efectivo" onClick={() => setRegistrando(true)} className="inline-flex items-center gap-1.5 rounded-[9px] bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition">
            <Plus size={14} /> Registrar entrega
          </button>
        )}
      </div>

      {/* Bitácora */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-borde">
        {isLoading && !corte ? (
          <EstadoSeccion variante="cargando" icono={Banknote} titulo="Cargando corte…" />
        ) : isError ? (
          <EstadoSeccion variante="error" icono={Banknote} titulo="No se pudo cargar el corte." />
        ) : movs.length === 0 ? (
          <EstadoSeccion icono={Banknote} titulo="Sin movimientos" descripcion={esVendedor ? 'Aquí verás lo que cobraste en efectivo, lo que entregaste y lo descontado en tus pagos.' : 'Aquí verás lo que el vendedor cobró en efectivo, lo que entregó y lo descontado en sus pagos.'} />
        ) : (
          movs.map((m) => <FilaMovimiento key={m.id} m={m} />)
        )}
      </div>

      {registrando && <DialogoMovimiento vendedorId={vendedorId} saldo={saldo} onCerrar={() => setRegistrando(false)} />}
    </div>
  );
}

export default SeccionEfectivo;
