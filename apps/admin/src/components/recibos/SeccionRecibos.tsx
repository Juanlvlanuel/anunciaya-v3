/**
 * SeccionRecibos.tsx
 * ==================
 * Módulo "Recibos" del Panel: lista de comprobantes de pago de membresía (ya foliados — manuales +
 * tarjeta), con búsqueda por folio/negocio, descarga del PDF y reenvío por correo a 1+ destinatarios.
 * Alcance por rol resuelto en el backend (super = todos · gerente = su región · vendedor = sus negocios).
 *
 * Calca el patrón de Suscripciones (tabla en escritorio · cards en móvil · paginación · EstadoSeccion).
 * Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/recibos/SeccionRecibos.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Receipt, Search, Download, Send, X, Plus, Trash2, Loader2 } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useRecibos, useDescargarRecibo, useReenviarRecibo } from '../../hooks/queries/useRecibosAdmin';
import type { ReciboFila } from '../../services/recibosService';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Tooltip } from '../ui/Tooltip';

const POR_PAGINA = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const CONCEPTO_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cortesia: 'Cortesía', tarjeta: 'Tarjeta' };

function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}
function fmtFolio(folio: number | null): string {
  return folio != null ? `#${String(folio).padStart(5, '0')}` : '—';
}
function fmtMonto(monto: string | null): string {
  return monto != null ? FMT_MONTO.format(Number(monto)) : '—';
}

const BadgeAnulado = () => (
  <span className="rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
    Anulado
  </span>
);

// =============================================================================
// DIÁLOGO: reenviar a 1+ correos
// =============================================================================

function DialogoReenviar({ recibo, onCerrar }: { recibo: ReciboFila; onCerrar: () => void }) {
  const reenviar = useReenviarRecibo();
  const [correos, setCorreos] = useState<string[]>(recibo.correoDueno ? [recibo.correoDueno] : ['']);

  const limpios = correos.map((c) => c.trim()).filter(Boolean);
  const validos = limpios.length > 0 && limpios.every((c) => EMAIL_REGEX.test(c));
  const puede = validos && !reenviar.isPending;

  const setCorreo = (i: number, v: string) => setCorreos((cs) => cs.map((c, idx) => (idx === i ? v : c)));
  const agregar = () => setCorreos((cs) => [...cs, '']);
  const quitar = (i: number) => setCorreos((cs) => (cs.length > 1 ? cs.filter((_, idx) => idx !== i) : cs));

  const enviar = () => {
    if (!puede) return;
    reenviar.mutate({ id: recibo.id, correos: limpios }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo={`Reenviar recibo ${fmtFolio(recibo.folio)}`}
      iconoTitulo={<span className="grid h-8 w-8 place-items-center rounded-[9px] bg-marca-suave text-marca"><Send size={16} /></span>}
      ancho="sm"
      discriminador="reenviar-recibo"
    >
      <div className="p-5" data-testid="dialogo-reenviar-recibo">
        <p className="text-[13px] leading-relaxed text-texto-3">
          Se enviará el comprobante de <b className="font-semibold text-texto">{recibo.negocioNombre ?? 'el negocio'}</b> a estos
          correos. Por defecto va el del negocio; puedes cambiarlo o agregar otros.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {correos.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="email"
                inputMode="email"
                data-testid={`reenviar-correo-${i}`}
                value={c}
                onChange={(e) => setCorreo(i, e.target.value)}
                placeholder="correo@ejemplo.com"
                autoFocus={i === 0}
                className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie"
              />
              {correos.length > 1 && (
                <button type="button" onClick={() => quitar(i)} aria-label="Quitar correo" className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-4 transition hover:text-peligro">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={agregar} data-testid="reenviar-agregar" className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-marca transition hover:underline">
          <Plus size={14} /> Agregar otro correo
        </button>

        {limpios.length > 0 && !validos && (
          <p className="mt-2 text-[12px] font-medium text-peligro">Hay un correo con formato inválido.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" data-testid="reenviar-cancelar" onClick={onCerrar} disabled={reenviar.isPending} className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
          Cancelar
        </button>
        <button type="button" data-testid="reenviar-enviar" onClick={enviar} disabled={!puede} className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50">
          <Send size={15} /> {reenviar.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// SECCIÓN
// =============================================================================

export function SeccionRecibos({ rol: _rol }: { rol: RolPanel }) {
  const esEscritorio = useEsEscritorio();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [reenviando, setReenviando] = useState<ReciboFila | null>(null);

  // Debounce: aplica la búsqueda 350 ms después de teclear y vuelve a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const { data, isLoading, isError } = useRecibos({
    busqueda: busquedaAplicada || undefined,
    orden: 'folio_desc',
    pagina,
    porPagina: POR_PAGINA,
  });
  const descargar = useDescargarRecibo();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-[1180px]">
        {/* Encabezado */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-borde bg-superficie text-texto-3">
            <Receipt size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold tracking-[-0.2px] text-texto">Recibos</h2>
            <p className="text-[13px] text-texto-3">Comprobantes de pago de membresía. Búscalos por folio, descárgalos o reenvíalos.</p>
          </div>
        </div>

        {/* Buscador (ícono + input + X como hermanos flex → sin empalmes de padding) */}
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-campo-borde bg-campo px-3 transition focus-within:border-marca focus-within:bg-superficie">
          <Search size={16} className="shrink-0 text-texto-4" />
          <input
            data-testid="recibos-buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio o negocio…"
            className="w-full bg-transparent py-2.5 text-[13px] text-texto outline-none placeholder:text-texto-4"
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar" className="shrink-0 text-texto-4 transition hover:text-texto">
              <X size={15} />
            </button>
          )}
        </div>

        {isLoading ? (
          <EstadoSeccion variante="cargando" icono={Receipt} titulo="Cargando recibos…" />
        ) : isError ? (
          <EstadoSeccion variante="error" icono={Receipt} titulo="No se pudieron cargar los recibos." descripcion="Revisa tu conexión e inténtalo de nuevo." />
        ) : items.length === 0 ? (
          busquedaAplicada ? (
            <EstadoSeccion icono={Receipt} titulo="Sin resultados" descripcion="Ningún recibo coincide con tu búsqueda." accion={{ etiqueta: 'Limpiar búsqueda', onClick: () => setBusqueda('') }} />
          ) : (
            <EstadoSeccion icono={Receipt} titulo="Aún no hay recibos" />
          )
        ) : esEscritorio ? (
          <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2 shadow-tarjeta-panel">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-borde text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4">
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Forma de pago</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {items.map((r) => (
                  <tr key={r.id} data-testid={`recibo-${r.id}`} className="text-[13px]">
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-texto">{fmtFolio(r.folio)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${r.anulado ? 'text-texto-4 line-through' : 'text-texto'}`}>{r.negocioNombre ?? '—'}</span>
                        {r.ciudad && <span className="text-[11.5px] text-texto-4">{r.ciudad}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-texto-2">{CONCEPTO_LABEL[r.concepto] ?? r.concepto}</span>
                      {r.anulado && <span className="ml-2"><BadgeAnulado /></span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-texto">{fmtMonto(r.monto)}</td>
                    <td className="px-4 py-2.5 text-texto-3">{fmtFecha(r.fechaPago)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip text="Descargar PDF">
                          <button type="button" data-testid={`recibo-descargar-${r.id}`} onClick={() => descargar.mutate(r.id)} disabled={descargar.isPending && descargar.variables === r.id} aria-label="Descargar PDF" className="grid h-8 w-8 place-items-center rounded-[8px] text-marca transition hover:bg-marca-suave disabled:opacity-50">
                            {descargar.isPending && descargar.variables === r.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          </button>
                        </Tooltip>
                        {!r.anulado && (
                          <Tooltip text="Reenviar por correo">
                            <button type="button" data-testid={`recibo-reenviar-${r.id}`} onClick={() => setReenviando(r)} aria-label="Reenviar por correo" className="grid h-8 w-8 place-items-center rounded-[8px] text-texto-2 transition hover:bg-marca-suave hover:text-marca">
                              <Send size={16} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((r) => (
              <div key={r.id} data-testid={`recibo-${r.id}`} className="rounded-[12px] border border-borde bg-superficie-2 p-3.5 shadow-tarjeta-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-texto">{fmtFolio(r.folio)}</span>
                      {r.anulado && <BadgeAnulado />}
                    </div>
                    <p className={`mt-0.5 truncate text-[13.5px] font-semibold ${r.anulado ? 'text-texto-4 line-through' : 'text-texto'}`}>{r.negocioNombre ?? '—'}</p>
                    <p className="text-[11.5px] text-texto-4">{CONCEPTO_LABEL[r.concepto] ?? r.concepto} · {fmtFecha(r.fechaPago)}</p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-texto">{fmtMonto(r.monto)}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 border-t border-borde pt-2.5">
                  <button type="button" onClick={() => descargar.mutate(r.id)} disabled={descargar.isPending && descargar.variables === r.id} className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:text-marca disabled:opacity-50">
                    {descargar.isPending && descargar.variables === r.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                  </button>
                  {!r.anulado && (
                    <button type="button" onClick={() => setReenviando(r)} className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:text-marca">
                      <Send size={14} /> Reenviar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {!isLoading && !isError && items.length > 0 && totalPaginas > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-[12.5px]">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="rounded-[8px] border border-borde-fuerte bg-superficie px-3 py-1.5 font-semibold text-texto-2 transition hover:bg-marca-suave disabled:opacity-40">
              Anterior
            </button>
            <span className="text-texto-4">{pagina} / {totalPaginas}</span>
            <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="rounded-[8px] border border-borde-fuerte bg-superficie px-3 py-1.5 font-semibold text-texto-2 transition hover:bg-marca-suave disabled:opacity-40">
              Siguiente
            </button>
          </div>
        )}
      </div>

      {reenviando && <DialogoReenviar recibo={reenviando} onCerrar={() => setReenviando(null)} />}
    </div>
  );
}

export default SeccionRecibos;
