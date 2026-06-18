/**
 * SeccionEfectivo.tsx
 * ===================
 * Pestaña "Efectivo" del detalle del vendedor (Vendedores y comisiones · Fase 2 · pieza D — cortes de efectivo).
 * El efectivo que el vendedor te DEBE entregar (cobró membresías en efectivo). Muestra el corte
 * (cobrado / entregado / descontado / saldo) + la bitácora de movimientos, y —super/gerente— el botón
 * "Registrar movimiento" (cobro o entrega). El neteo (descuento al pagarle comisión) lo hace la pestaña Pagos.
 *
 * Ubicación: apps/admin/src/components/vendedores/SeccionEfectivo.tsx
 */

import { useState } from 'react';
import { Banknote, Plus, ArrowDownLeft, ArrowUpRight, Link2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
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
  const [tipo, setTipo] = useState<'cobro' | 'entrega'>('entrega');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');

  const montoNum = Number(monto);
  const valido = Number.isFinite(montoNum) && montoNum > 0;
  const puede = valido && !registrar.isPending;

  const enviar = () => {
    if (!puede) return;
    registrar.mutate(
      { id: vendedorId, datos: { tipo, monto: montoNum, fecha, nota: nota.trim() || null } },
      { onSuccess: onCerrar },
    );
  };

  return (
    <ModalAdaptativo abierto onCerrar={onCerrar} titulo="Registrar movimiento" ancho="sm" discriminador="efectivo-mov">
      <div className="p-5" data-testid="dialogo-efectivo-mov">
        <div className="mb-4">
          <label className={LABEL}>Tipo</label>
          <div className="inline-flex rounded-[10px] border border-borde bg-superficie-2 p-0.5">
            {([['entrega', 'Entrega'], ['cobro', 'Cobro']] as const).map(([v, etq]) => (
              <button
                key={v}
                type="button"
                data-testid={`efectivo-tipo-${v}`}
                onClick={() => setTipo(v)}
                className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${tipo === v ? 'bg-marca text-marca-contraste' : 'text-texto-3 hover:text-texto'}`}
              >
                {etq}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-texto-4">
            {tipo === 'entrega' ? 'El vendedor te entregó efectivo (baja su deuda).' : 'El vendedor cobró efectivo de un negocio (sube su deuda).'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Monto</label>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] text-texto-3">$</span>
              <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" className={`${CLASE_CAMPO} text-[15px] font-semibold tabular-nums`} data-testid="efectivo-monto" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CLASE_CAMPO} data-testid="efectivo-fecha" />
          </div>
        </div>

        <div className="mt-3">
          <label className={LABEL}>Nota <span className="font-normal text-texto-4">(opcional)</span></label>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Referencia, observaciones…" className={CLASE_CAMPO} data-testid="efectivo-nota" />
        </div>

        {tipo === 'entrega' && saldo > 0 && (
          <p className="mt-3 text-[12px] text-texto-3">Saldo actual por entregar: <span className="font-semibold text-texto">{pesos(saldo)}</span></p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" onClick={onCerrar} disabled={registrar.isPending} className={BTN_CANCELAR}>Cancelar</button>
        <button type="button" data-testid="efectivo-guardar" onClick={enviar} disabled={!puede} className={BTN_GUARDAR}>
          {registrar.isPending ? 'Guardando…' : 'Registrar'}
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
            <Plus size={14} /> Registrar movimiento
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
          <EstadoSeccion icono={Banknote} titulo="Sin movimientos" descripcion="Aquí verás lo que el vendedor cobró en efectivo, lo que entregó y lo descontado en sus pagos." />
        ) : (
          movs.map((m) => <FilaMovimiento key={m.id} m={m} />)
        )}
      </div>

      {registrando && <DialogoMovimiento vendedorId={vendedorId} saldo={saldo} onCerrar={() => setRegistrando(false)} />}
    </div>
  );
}

export default SeccionEfectivo;
