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
import { Receipt, Search, Download, Send, X, Plus, Trash2, Loader2, MapPin, Mail } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useRecibos, useDescargarRecibo, useReenviarRecibo } from '../../hooks/queries/useRecibosAdmin';
import type { ReciboFila } from '../../services/recibosService';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Tooltip } from '../ui/Tooltip';
import { AvatarNegocio } from '../negocios/avatares';

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
        {/* Negocio (con logo) — referencia */}
        <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
          <AvatarNegocio nombre={recibo.negocioNombre ?? '—'} logoUrl={recibo.logoUrl} tam={36} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-texto">{recibo.negocioNombre ?? 'Negocio'}</p>
            <p className="truncate text-[12px] text-texto-3">
              Recibo {fmtFolio(recibo.folio)}
              {recibo.ciudad ? ` · ${recibo.ciudad}` : ''}
            </p>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-texto-3">
          Se enviará el comprobante a estos correos. Por defecto va el del negocio; puedes cambiarlo o agregar otros.
        </p>

        <label className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-texto-2">Correos de destino</label>
        <div className="flex flex-col gap-2">
          {correos.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
                <input
                  type="email"
                  inputMode="email"
                  data-testid={`reenviar-correo-${i}`}
                  value={c}
                  onChange={(e) => setCorreo(i, e.target.value)}
                  placeholder="correo@ejemplo.com"
                  autoFocus={i === 0}
                  className="w-full rounded-[10px] border border-campo-borde bg-campo py-2.5 pl-9 pr-3 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
                />
              </div>
              {correos.length > 1 && (
                <button type="button" onClick={() => quitar(i)} aria-label="Quitar correo" className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-4 transition hover:bg-peligro-suave hover:text-peligro">
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
  }, [esEscritorio, setScrollEl, isLoading, isError, items.length]);

  // Columnas del grid (escritorio): el header fijo y las filas comparten el mismo template.
  const cols = '96px minmax(220px,2.2fr) 1.2fr 0.9fr 1fr 92px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {/* Buscador (mismo estilo que Negocios) */}
        <div className="relative mb-4 w-full shrink-0">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
          <input
            data-testid="recibos-buscar"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio o negocio…"
            className="w-full rounded-full border border-borde bg-superficie-2 py-2.5 pl-10 pr-9 text-[13.5px] font-medium text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
          />
          {busqueda && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
            >
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde bg-superficie shadow-tarjeta-panel">
            {/* Header de columnas (fijo, fuera del scroll) */}
            <div
              className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4"
              style={{ gridTemplateColumns: cols }}
            >
              <span>Folio</span>
              <span>Negocio</span>
              <span>Forma de pago</span>
              <span className="text-right">Monto</span>
              <span>Fecha</span>
              <span className="text-right">Acciones</span>
            </div>
            {/* Cuerpo (scroll interno, debajo del header) */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              {items.map((r) => (
                <div
                  key={r.id}
                  data-testid={`recibo-${r.id}`}
                  className="grid items-center gap-3.5 border-b border-borde px-4 py-2.5 text-[13px] last:border-b-0"
                  style={{ gridTemplateColumns: cols }}
                >
                  <span className="font-semibold tabular-nums text-texto">{fmtFolio(r.folio)}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <AvatarNegocio nombre={r.negocioNombre ?? '—'} logoUrl={r.logoUrl} tam={38} />
                    <span className="flex min-w-0 flex-col">
                      <span className={`truncate text-[14px] font-semibold ${r.anulado ? 'text-texto-4 line-through' : 'text-texto'}`}>{r.negocioNombre ?? '—'}</span>
                      <span className={`inline-flex items-center gap-1 text-[13px] ${r.ciudad ? 'text-texto-3' : 'text-texto-4'}`}>
                        <MapPin size={12} className="shrink-0" />
                        {r.ciudad ?? 'Sin ciudad'}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 truncate text-texto-2">
                    {CONCEPTO_LABEL[r.concepto] ?? r.concepto}
                    {r.anulado && <span className="ml-2"><BadgeAnulado /></span>}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-texto">{fmtMonto(r.monto)}</span>
                  <span className="text-texto-3">{fmtFecha(r.fechaPago)}</span>
                  <span className="flex items-center justify-end gap-1">
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
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            {items.map((r) => (
              <div key={r.id} data-testid={`recibo-${r.id}`} className="rounded-[12px] border border-borde bg-superficie-2 p-3.5 shadow-tarjeta-panel">
                <div className="flex items-start gap-3">
                  <AvatarNegocio nombre={r.negocioNombre ?? '—'} logoUrl={r.logoUrl} tam={42} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[14.5px] font-semibold ${r.anulado ? 'text-texto-4 line-through' : 'text-texto'}`}>{r.negocioNombre ?? '—'}</p>
                    <p className={`truncate text-[12px] ${r.ciudad ? 'text-texto-3' : 'text-texto-4'}`}>{r.ciudad ?? 'Sin ciudad'}</p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-texto">{fmtMonto(r.monto)}</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-texto-4">
                  <span className="font-semibold tabular-nums text-texto-3">{fmtFolio(r.folio)}</span>
                  <span aria-hidden>·</span>
                  <span>{CONCEPTO_LABEL[r.concepto] ?? r.concepto}</span>
                  <span aria-hidden>·</span>
                  <span>{fmtFecha(r.fechaPago)}</span>
                  {r.anulado && <BadgeAnulado />}
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
          <div className="mt-4 flex shrink-0 items-center justify-end gap-2 text-[12.5px]">
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
