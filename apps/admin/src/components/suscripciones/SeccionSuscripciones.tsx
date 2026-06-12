/**
 * SeccionSuscripciones.tsx
 * ========================
 * Sección Suscripciones del Panel = la BITÁCORA FINANCIERA global (libro mayor de la
 * membresía). Solo lectura. Calcada de SeccionNegocios.
 *   - Escritorio (lg:+): buscador + KPIs discretos (mismo renglón) + chips de tipo con
 *     conteos, filtros (origen, periodo) y "Ordenar" + tabla + paginación.
 *   - Móvil: KPIs + buscador + filtros (icono) + chips de tipo (carrusel) + cards.
 *
 * Alcance por rol lo aplica el backend (super = todo · gerente = su región · vendedor 403).
 * Orden, conteos, KPIs y paginado corren en servidor.
 *
 * Ubicación: apps/admin/src/components/suscripciones/SeccionSuscripciones.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ArrowUpDown, Calendar, Layers } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useBitacora, usePrefetchEvento } from '../../hooks/queries/useSuscripcionesAdmin';
import type { OrdenEvento, EventoFila, ConteosEventos } from '../../services/suscripcionesService';
import { metaTipoEvento, BadgeTipoEvento, TIPOS_EVENTO_FILTRO } from './estadoEvento';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { AvatarNegocio } from '../negocios/avatares';
import { FichaEvento } from './FichaEvento';

const POR_PAGINA = 20;

const TABS_TIPO = [{ id: '', label: 'Todos' }, ...TIPOS_EVENTO_FILTRO.map((t) => ({ id: t.valor, label: t.etiqueta }))];

const OPCIONES_ORDEN: { valor: OrdenEvento; etiqueta: string }[] = [
  { valor: 'fecha_recientes', etiqueta: 'Fecha (recientes)' },
  { valor: 'fecha_antiguos', etiqueta: 'Fecha (antiguos)' },
  { valor: 'monto_mayor', etiqueta: 'Monto (mayor)' },
  { valor: 'monto_menor', etiqueta: 'Monto (menor)' },
];

const OPCIONES_ORIGEN: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los orígenes' },
  { valor: 'stripe', etiqueta: 'Stripe (automático)' },
  { valor: 'manual', etiqueta: 'Manual (registrado)' },
];

const OPCIONES_PERIODO: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todo el tiempo' },
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7d', etiqueta: 'Últimos 7 días' },
  { valor: '30d', etiqueta: 'Últimos 30 días' },
  { valor: 'anio', etiqueta: 'Último año' },
];

const CONTEOS_CERO: ConteosEventos = { total: 0, porTipo: [], ingresos: 0, fallidos: 0 };
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '').replace(/ ([a-z])/i, (_m, l: string) => ` ${l.toUpperCase()}`);
}

function montoTexto(m: string | null): string {
  if (m == null) return '—';
  const n = Number(m);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

/** Traduce el preset de periodo a `desde` (ISO de inicio del día → estable entre renders,
 *  solo cambia al cambiar de día o de preset; evita el bucle de refetch). */
function desdeDelPeriodo(periodo: string): string | undefined {
  if (!periodo) return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (periodo === '7d') d.setDate(d.getDate() - 6);
  else if (periodo === '30d') d.setDate(d.getDate() - 29);
  else if (periodo === 'anio') d.setFullYear(d.getFullYear() - 1);
  // 'hoy' → desde = inicio de hoy
  return d.toISOString();
}

export function SeccionSuscripciones({ rol: _rol }: { rol: RolPanel }) {
  const esEscritorio = useEsEscritorio();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [tipo, setTipo] = useState('');
  const [origen, setOrigen] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [orden, setOrden] = useState<OrdenEvento>('fecha_recientes');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<EventoFila | null>(null);
  const prefetchEvento = usePrefetchEvento();

  // Registra el contenedor scrolleable (móvil) para el auto-ocultado de la barra inferior.
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busquedaDeb, tipo, origen, periodo, orden]);

  const filtros = useMemo(
    () => ({
      busqueda: busquedaDeb || undefined,
      tipo: tipo || undefined,
      origen: origen || undefined,
      desde: desdeDelPeriodo(periodo),
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [busquedaDeb, tipo, origen, periodo, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useBitacora(filtros);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(busquedaDeb || tipo || origen || periodo);

  const conteoDe = (id: string): number =>
    id === '' ? conteos.total : (conteos.porTipo.find((c) => c.tipo === id)?.total ?? 0);

  const etiquetaOrigen = OPCIONES_ORIGEN.find((o) => o.valor === origen)?.etiqueta ?? 'Todos los orígenes';
  const etiquetaPeriodo = OPCIONES_PERIODO.find((o) => o.valor === periodo)?.etiqueta ?? 'Todo el tiempo';
  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Fecha (recientes)';

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="suscripciones-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por negocio…"
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
  );

  const kpis = (
    <div className="grid shrink-0 grid-cols-3 gap-2.5 lg:gap-3">
      <KpiCard etiqueta="Ingresos" valor={FMT_MONTO.format(conteos.ingresos)} acento="ok" testid="suscripciones-kpi-ingresos" />
      <KpiCard etiqueta="Cobros fallidos" valor={String(conteos.fallidos)} acento={conteos.fallidos > 0 ? 'danger' : undefined} testid="suscripciones-kpi-fallidos" />
      <KpiCard etiqueta="Movimientos" valor={String(conteos.total)} testid="suscripciones-kpi-total" />
    </div>
  );

  const ficha = seleccionado ? (
    <FichaEvento previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        <div className="mb-2.5">{kpis}</div>

        {/* Buscador + filtros (icono) */}
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">{buscador}</div>
          <MenuFiltro
            testid="suscripciones-filtro-periodo"
            icono={<Calendar size={18} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={OPCIONES_PERIODO}
            valor={periodo}
            onCambiar={setPeriodo}
            alineacion="derecha"
            soloIcono
          />
          <MenuFiltro
            testid="suscripciones-filtro-origen"
            icono={<Layers size={18} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={OPCIONES_ORIGEN}
            valor={origen}
            onCambiar={setOrigen}
            alineacion="derecha"
            soloIcono
          />
        </div>

        {/* Chips de tipo (carrusel) */}
        <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS_TIPO.map((t) => {
            const activo = tipo === t.id;
            const color = t.id ? metaTipoEvento(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`suscripciones-filtro-tipo-${t.id || 'todos'}`}
                onClick={() => setTipo(t.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition"
                style={activo ? { background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 34%, transparent)`, color } : undefined}
              >
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
                {t.label} <span className="text-[11px] opacity-70">{conteoDe(t.id)}</span>
              </button>
            );
          })}
        </div>

        {/* Lista de cards */}
        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoMensaje texto="Cargando movimientos…" />
          ) : isError ? (
            <EstadoMensaje texto="No se pudieron cargar los movimientos." tono="error" />
          ) : items.length === 0 ? (
            <EstadoMensaje texto="Sin movimientos. Ajusta la búsqueda o los filtros." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((e) => (
                <CardEvento key={e.id} e={e} onAbrir={() => setSeleccionado(e)} onPrefetch={() => prefetchEvento(e.id)} />
              ))}
            </div>
          )}
        </div>

        {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
        {ficha}
      </div>
    );
  }

  // ── Vista ESCRITORIO ────────────────────────────────────────────────────────
  const cols = 'minmax(200px,2.4fr) 1fr 1.1fr 1.3fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Buscador (izq) + KPIs discretos (der) — mismo renglón */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-[220px] max-w-[360px] flex-1">{buscador}</div>
        <div className="flex shrink-0 items-stretch divide-x divide-borde">
          <KpiInline etiqueta="Ingresos" valor={FMT_MONTO.format(conteos.ingresos)} acento="ok" testid="suscripciones-kpi-ingresos" />
          <KpiInline etiqueta="Cobros fallidos" valor={String(conteos.fallidos)} acento={conteos.fallidos > 0 ? 'danger' : undefined} testid="suscripciones-kpi-fallidos" />
          <KpiInline etiqueta="Movimientos" valor={String(conteos.total)} testid="suscripciones-kpi-total" />
        </div>
      </div>

      {/* Subhead: chips de tipo (izq) + total y ordenar (der) */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS_TIPO.map((t) => {
            const activo = tipo === t.id;
            const color = t.id ? metaTipoEvento(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`suscripciones-filtro-tipo-${t.id || 'todos'}`}
                onClick={() => setTipo(t.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
                style={activo ? { background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 34%, transparent)`, color } : undefined}
              >
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
                {t.label}
                <span
                  className="min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold"
                  style={activo ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color } : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }}
                >
                  {conteoDe(t.id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-texto-3" data-testid="suscripciones-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'movimiento' : 'movimientos'}
            {hayFiltro ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
          <MenuFiltro
            testid="suscripciones-filtro-origen"
            icono={<Layers size={16} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={OPCIONES_ORIGEN}
            valor={origen}
            onCambiar={setOrigen}
            tam="chip"
          />
          <MenuFiltro
            testid="suscripciones-filtro-periodo"
            icono={<Calendar size={16} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={OPCIONES_PERIODO}
            valor={periodo}
            onCambiar={setPeriodo}
            tam="chip"
          />
          <MenuFiltro
            testid="suscripciones-orden"
            icono={<ArrowUpDown size={15} />}
            etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
            opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            valor={orden}
            onCambiar={(v) => setOrden(v as OrdenEvento)}
            anchoMenu={210}
            tam="chip"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Negocio</span>
          <span>Monto</span>
          <span>Fecha</span>
          <span>Tipo</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoMensaje texto="Cargando movimientos…" />
          ) : isError ? (
            <EstadoMensaje texto="No se pudieron cargar los movimientos." tono="error" />
          ) : items.length === 0 ? (
            <EstadoMensaje texto="Sin movimientos. Ajusta la búsqueda o los filtros." />
          ) : (
            items.map((e) => (
              <FilaEvento key={e.id} e={e} cols={cols} onAbrir={() => setSeleccionado(e)} onPrefetch={() => prefetchEvento(e.id)} />
            ))
          )}
        </div>
      </div>

      {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
      {ficha}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function KpiCard({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'danger'; testid?: string }) {
  const color = acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
  return (
    <div data-testid={testid} className="min-w-0 rounded-[12px] border border-borde bg-superficie-2 px-3.5 py-2.5 lg:px-4 lg:py-3">
      <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</p>
      <p className="mt-0.5 truncate text-[17px] font-bold lg:text-[19px]" style={{ color }}>{valor}</p>
    </div>
  );
}

/** KPI discreto inline (escritorio): etiqueta chica + valor, sin card. Va en el renglón del buscador. */
function KpiInline({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'danger'; testid?: string }) {
  const color = acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
  return (
    <div data-testid={testid} className="flex min-w-0 flex-col justify-center px-5 leading-tight first:pl-0 last:pr-0">
      <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className="truncate text-[22px] font-bold leading-tight" style={{ color }}>{valor}</span>
    </div>
  );
}

function FilaEvento({ e, cols, onAbrir, onPrefetch }: { e: EventoFila; cols: string; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`suscripcion-fila-${e.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="grid w-full cursor-pointer items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave focus:bg-marca-suave focus:outline-none"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AvatarNegocio nombre={e.negocioNombre ?? '—'} logoUrl={e.logoUrl} tam={38} />
        <span className="truncate text-[13.5px] font-semibold text-texto">{e.negocioNombre ?? '—'}</span>
      </span>
      <span className={`text-[13.5px] font-semibold ${e.monto != null ? 'text-texto' : 'text-texto-4'}`}>{montoTexto(e.monto)}</span>
      <span className="text-[13px] text-texto-2">{fechaCorta(e.fecha)}</span>
      <span><BadgeTipoEvento tipo={e.tipo} /></span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardEvento({ e, onAbrir, onPrefetch }: { e: EventoFila; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`suscripcion-card-${e.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      onTouchStart={onPrefetch}
      className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarNegocio nombre={e.negocioNombre ?? '—'} logoUrl={e.logoUrl} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{e.negocioNombre ?? '—'}</span>
        <span className="text-[12px] text-texto-3">{fechaCorta(e.fecha)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeTipoEvento tipo={e.tipo} small />
        <span className={`text-[13.5px] font-bold ${e.monto != null ? 'text-texto' : 'text-texto-4'}`}>{montoTexto(e.monto)}</span>
      </span>
    </div>
  );
}

function Paginacion({
  desde,
  hasta,
  total,
  pagina,
  totalPaginas,
  setPagina,
}: {
  desde: number;
  hasta: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  setPagina: (fn: (p: number) => number) => void;
}) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-between text-[12.5px] text-texto-3 lg:pt-1">
      <span data-testid="suscripciones-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="suscripciones-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="suscripciones-siguiente"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina >= totalPaginas}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function EstadoMensaje({ texto, tono }: { texto: string; tono?: 'error' }) {
  return (
    <div className="grid h-full min-h-[220px] place-items-center px-6 text-center">
      <div>
        <Layers size={28} className="mx-auto mb-3 text-texto-4" />
        <p className={`text-sm ${tono === 'error' ? 'text-peligro' : 'text-texto-3'}`}>{texto}</p>
      </div>
    </div>
  );
}

export default SeccionSuscripciones;
