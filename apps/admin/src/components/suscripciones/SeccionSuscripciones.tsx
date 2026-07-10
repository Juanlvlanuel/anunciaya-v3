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
import { Search, X, ChevronLeft, ChevronRight, ArrowUpDown, Calendar, Layers, MapPin, ScrollText, FileCheck2, Landmark, CircleDot, History, Ban, type LucideIcon } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useNavegacionPanel } from '../../stores/useNavegacionPanel';
import { useBitacora, usePrefetchEvento, useSolicitudesPendientes } from '../../hooks/queries/useSuscripcionesAdmin';
import type { OrdenEvento, EventoFila, ConteosEventos } from '../../services/suscripcionesService';
import { metaTipoEvento, BadgeTipoEvento, TIPOS_EVENTO_FILTRO } from './estadoEvento';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { TabsSegmento } from '../ui/TabsSegmento';
import { AvatarNegocio } from '../negocios/avatares';
import { FichaEvento } from './FichaEvento';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { PestanaPorVerificar } from './PestanaPorVerificar';
import { PestanaHistorial } from './PestanaHistorial';
import { PestanaDatosCobro } from './PestanaDatosCobro';

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

const CONTEOS_CERO: ConteosEventos = { total: 0, porTipo: [], porOrigen: [], porPeriodo: [], ingresos: 0, fallidos: 0 };
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
/** Monto sin centavos para los KPIs compactos (móvil): el dato estrella nunca se trunca. */
const FMT_MONTO_CORTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

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

/** Monto a mostrar en la tabla: si el pago está ANULADO, el monto original tachado (o "—" si no se
 *  guardó); si no, el monto normal. El KPI de ingresos ya excluye los anulados por separado. */
function montoAnuladoInfo(e: EventoFila): { texto: string; clase: string } {
  if (e.anulado) {
    const orig = e.montoAnulado != null ? montoTexto(e.montoAnulado) : null;
    return { texto: orig ?? montoTexto(e.monto), clase: orig ? 'text-texto-4 line-through' : 'text-texto-4' };
  }
  return { texto: montoTexto(e.monto), clase: e.monto != null ? 'text-texto' : 'text-texto-4' };
}

/** Chip "Anulado" para la columna Estado de la Bitácora (mismo look que el chip del detalle). */
function BadgeAnulado() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-peligro-suave px-2 py-0.5 text-[11px] font-semibold text-peligro">
      <Ban size={11} /> Anulado
    </span>
  );
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

/** Cuerpo de la pestaña "Bitácora" (el libro mayor financiero). Es la vista original del módulo. */
function PestanaBitacora({ tab, setTab }: { tab: TabSuscripciones; setTab: (t: TabSuscripciones) => void }) {
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

  // Deep-link desde el Resumen: si llegó un filtro inicial (ej. tipo "cobro_fallido"), aplicarlo
  // y consumirlo (one-shot).
  const filtroInicial = useNavegacionPanel((s) => s.filtroSuscripciones);
  const consumirFiltro = useNavegacionPanel((s) => s.consumirFiltroSuscripciones);
  useEffect(() => {
    if (filtroInicial?.tipo) {
      setTipo(filtroInicial.tipo);
      consumirFiltro();
    }
  }, [filtroInicial, consumirFiltro]);

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

  const { data, isLoading, isError } = useBitacora(filtros);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  // ── Filtros activos para distinguir "vacío con filtros" de "vacío real" ──────
  // Incluye el orden (cualquier filtro local fuera de su default).
  const hayFiltrosActivos = !!(busqueda || tipo || origen || periodo) || orden !== 'fecha_recientes';
  const limpiarFiltros = () => {
    setBusqueda('');
    setTipo('');
    setOrigen('');
    setPeriodo('');
    setOrden('fecha_recientes');
  };

  const etiquetaOrigen = OPCIONES_ORIGEN.find((o) => o.valor === origen)?.etiqueta ?? 'Todos los orígenes';
  const etiquetaPeriodo = OPCIONES_PERIODO.find((o) => o.valor === periodo)?.etiqueta ?? 'Todo el tiempo';
  const etiquetaTipo = tipo === '' ? 'Todos los tipos' : (TABS_TIPO.find((t) => t.id === tipo)?.label ?? 'Tipo');

  // Opciones del dropdown de origen con el conteo por origen inyectado (badge dentro del menú).
  // "Todos los orígenes" = suma (cada evento tiene un solo origen, así que particionan).
  const opcionesOrigen = useMemo<OpcionMenu[]>(
    () =>
      OPCIONES_ORIGEN.map((o) => ({
        ...o,
        conteo:
          o.valor === ''
            ? (conteos.porOrigen?.reduce((s, r) => s + r.total, 0) ?? 0)
            : (conteos.porOrigen?.find((r) => r.origen === o.valor)?.total ?? 0),
      })),
    [conteos],
  );

  // Opciones del dropdown de periodo con su conteo (badge dentro del menú). Ventanas ACUMULATIVAS:
  // cada badge = movimientos en esa ventana (no particionan; hoy ≤ 7d ≤ 30d ≤ año ≤ todo).
  const opcionesPeriodo = useMemo<OpcionMenu[]>(
    () =>
      OPCIONES_PERIODO.map((o) => ({
        ...o,
        conteo: conteos.porPeriodo?.find((p) => p.periodo === o.valor)?.total ?? 0,
      })),
    [conteos],
  );
  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Fecha (recientes)';

  // Opciones del dropdown de TIPO (antes chips): punto de color por tipo + badge de conteo.
  // "Todos los tipos" = total; cada tipo = su conteo (conteos.porTipo).
  const opcionesTipo = useMemo<OpcionMenu[]>(
    () =>
      TABS_TIPO.map((t) => ({
        valor: t.id,
        etiqueta: t.id === '' ? 'Todos los tipos' : t.label,
        color: t.id ? metaTipoEvento(t.id).color : 'var(--panel-brand)',
        conteo: t.id === '' ? conteos.total : (conteos.porTipo?.find((c) => c.tipo === t.id)?.total ?? 0),
      })),
    [conteos],
  );

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
    <div className="flex shrink-0 items-stretch py-1">
      <KpiTira etiqueta="Ingresos" valor={FMT_MONTO_CORTO.format(conteos.ingresos)} acento="ok" testid="suscripciones-kpi-ingresos" />
      <span className="w-px shrink-0 self-stretch bg-borde" />
      <KpiTira etiqueta="Fallidos" valor={String(conteos.fallidos)} acento={conteos.fallidos > 0 ? 'danger' : undefined} testid="suscripciones-kpi-fallidos" />
      <span className="w-px shrink-0 self-stretch bg-borde" />
      <KpiTira etiqueta="Movimientos" valor={String(conteos.total)} testid="suscripciones-kpi-total" />
    </div>
  );

  const ficha = seleccionado ? (
    <FichaEvento previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        <div className="mb-2.5"><TabsNavSuscripciones tab={tab} setTab={setTab} /></div>
        <div className="mb-2.5">{kpis}</div>

        {/* Buscador + filtros (icono) */}
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">{buscador}</div>
          <MenuFiltro
            testid="suscripciones-filtro-tipo"
            icono={<CircleDot size={18} />}
            etiquetaBoton={etiquetaTipo}
            opciones={opcionesTipo}
            valor={tipo}
            onCambiar={setTipo}
            alineacion="derecha"
            soloIcono
          />
          <MenuFiltro
            testid="suscripciones-filtro-periodo"
            icono={<Calendar size={18} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={opcionesPeriodo}
            valor={periodo}
            onCambiar={setPeriodo}
            alineacion="derecha"
            soloIcono
          />
        </div>

        {/* Lista de cards */}
        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={Layers} titulo="Cargando movimientos…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={Layers}
              titulo="No se pudieron cargar los movimientos."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={Layers}
                titulo="Sin movimientos"
                descripcion="Ningún movimiento coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={Layers} titulo="Aún no hay movimientos" />
            )
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
  const cols = 'minmax(200px,2.4fr) 1fr 1.1fr 1.3fr 1fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Navegación (chips, izq) · buscador (centro, equidistante) · KPIs discretos (der) — mismo renglón */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <TabsNavSuscripciones tab={tab} setTab={setTab} />
        <div className="flex shrink-0 items-stretch divide-x divide-borde">
          <KpiInline etiqueta="Ingresos" valor={FMT_MONTO.format(conteos.ingresos)} acento="ok" testid="suscripciones-kpi-ingresos" />
          <KpiInline etiqueta="Cobros fallidos" valor={String(conteos.fallidos)} acento={conteos.fallidos > 0 ? 'danger' : undefined} testid="suscripciones-kpi-fallidos" />
          <KpiInline etiqueta="Movimientos" valor={String(conteos.total)} testid="suscripciones-kpi-total" />
        </div>
      </div>

      {/* Fila 2: buscador (izq) + filtros en dropdown (der) */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-3">
        <div className="w-[300px] 2xl:w-[360px]">{buscador}</div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:ml-auto">
          <MenuFiltro
            testid="suscripciones-filtro-tipo"
            icono={<CircleDot size={16} />}
            etiquetaBoton={etiquetaTipo}
            opciones={opcionesTipo}
            valor={tipo}
            onCambiar={setTipo}
            tam="chip"
          />
          <MenuFiltro
            testid="suscripciones-filtro-origen"
            icono={<Layers size={16} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={opcionesOrigen}
            valor={origen}
            onCambiar={setOrigen}
            tam="chip"
          />
          <MenuFiltro
            testid="suscripciones-filtro-periodo"
            icono={<Calendar size={16} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={opcionesPeriodo}
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde shadow-tarjeta-panel">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Negocio</span>
          <span>Monto</span>
          <span>Fecha</span>
          <span>Tipo</span>
          <span>Estado</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={Layers} titulo="Cargando movimientos…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={Layers}
              titulo="No se pudieron cargar los movimientos."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={Layers}
                titulo="Sin movimientos"
                descripcion="Ningún movimiento coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={Layers} titulo="Aún no hay movimientos" />
            )
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

/** KPI en "tira" (móvil): columna centrada etiqueta + valor, separadas por líneas verticales
 *  en el contenedor. Sin card individual para que los 3 quepan sin truncar. La etiqueta usa
 *  `txt-badge` (12.5px) a propósito: es un micro-label, no cuerpo, así no la sube el piso de
 *  texto de 14px y conserva jerarquía contra el valor. */
function KpiTira({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'danger'; testid?: string }) {
  const color = acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
  return (
    <div data-testid={testid} className="flex min-w-0 flex-1 flex-col items-center px-1.5 text-center leading-tight">
      <span className="txt-badge max-w-full truncate font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className="mt-1 max-w-full truncate text-[17px] font-bold" style={{ color }}>{valor}</span>
    </div>
  );
}

/** KPI discreto inline (escritorio): etiqueta chica + valor, sin card. Va en el renglón del buscador. */
function KpiInline({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'danger'; testid?: string }) {
  const color = acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
  return (
    <div data-testid={testid} className="flex min-w-0 flex-col items-center justify-center px-5 text-center leading-tight">
      <span className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className="max-w-full truncate text-[22px] font-bold leading-tight" style={{ color }}>{valor}</span>
    </div>
  );
}

function FilaEvento({ e, cols, onAbrir, onPrefetch }: { e: EventoFila; cols: string; onAbrir: () => void; onPrefetch: () => void }) {
  const montoInfo = montoAnuladoInfo(e);
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
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{e.negocioNombre ?? '—'}</span>
          <span className={`inline-flex items-center gap-1 text-[13px] ${e.ciudad ? 'text-texto-3' : 'text-texto-4'}`}>
            <MapPin size={12} className="shrink-0" />
            {e.ciudad ?? 'Sin ciudad'}
          </span>
        </span>
      </span>
      <span className={`text-[13.5px] font-semibold ${montoInfo.clase}`}>{montoInfo.texto}</span>
      <span className="text-[13px] text-texto-2">{fechaCorta(e.fecha)}</span>
      <span><BadgeTipoEvento tipo={e.tipo} /></span>
      <span>{e.anulado ? <BadgeAnulado /> : null}</span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardEvento({ e, onAbrir, onPrefetch }: { e: EventoFila; onAbrir: () => void; onPrefetch: () => void }) {
  const montoInfo = montoAnuladoInfo(e);
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
        {e.anulado && <BadgeAnulado />}
        <BadgeTipoEvento tipo={e.tipo} small />
        <span className={`text-[13.5px] font-bold ${montoInfo.clase}`}>{montoInfo.texto}</span>
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

// =============================================================================
// WRAPPER CON PESTAÑAS
// =============================================================================

type TabSuscripciones = 'bitacora' | 'por-verificar' | 'historial' | 'datos-cobro';

const TABS_SUSCRIPCIONES: { id: TabSuscripciones; etiqueta: string; etiquetaCorta?: string; Icono: LucideIcon }[] = [
  { id: 'bitacora', etiqueta: 'Bitácora', Icono: ScrollText },
  { id: 'por-verificar', etiqueta: 'Por verificar', etiquetaCorta: 'Verificar', Icono: FileCheck2 },
  { id: 'historial', etiqueta: 'Historial', Icono: History },
  { id: 'datos-cobro', etiqueta: 'Datos de depósito', etiquetaCorta: 'Depósito', Icono: Landmark },
];

/** Chips de navegación entre pestañas (Bitácora / Por verificar / Datos de depósito).
 *  Se renderiza junto al buscador en Bitácora y arriba en las otras dos pestañas, así la
 *  navegación siempre está visible. El badge de "Por verificar" usa el mismo hook que la cola. */
function TabsNavSuscripciones({ tab, setTab }: { tab: TabSuscripciones; setTab: (t: TabSuscripciones) => void }) {
  const { data: solicitudes } = useSolicitudesPendientes();
  const pendientes = solicitudes?.length ?? 0;
  return (
    <TabsSegmento
      tabs={TABS_SUSCRIPCIONES.map((t) => ({
        id: t.id,
        label: t.etiqueta,
        labelCorto: t.etiquetaCorta,
        icono: <t.Icono size={14} />,
        // "Por verificar" siempre muestra su badge (incluso 0); con alerta marca si hay pendientes.
        badge: t.id === 'por-verificar' ? pendientes : undefined,
        badgeAlerta: t.id === 'por-verificar',
      }))}
      valor={tab}
      onCambiar={setTab}
      testidPrefijo="suscripciones-tab"
      className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    />
  );
}

/**
 * Sección Suscripciones del Panel con 3 pestañas:
 *   - Bitácora      → el libro mayor financiero (vista original, autogestiona su alto/scroll).
 *   - Por verificar → cola de pagos manuales con comprobante (aprobar/rechazar).
 *   - Datos de depósito → cuenta bancaria que ve el dueño (editar = solo superadmin).
 *
 * Alcance por rol/región lo aplica el backend. El badge "Por verificar" usa el mismo hook que
 * la pestaña, así su contador y la lista siempre cuadran.
 */
export function SeccionSuscripciones({ rol: _rol }: { rol: RolPanel }) {
  // Pestaña inicial: respeta un deep-link entrante (ej. campana → "Por verificar"). Se lee del store al
  // montar (getState, sin suscripción) para no parpadear en Bitácora antes de saltar a la pestaña pedida.
  const [tab, setTab] = useState<TabSuscripciones>(() => {
    const p = useNavegacionPanel.getState().filtroSuscripciones?.pestana;
    return p === 'por-verificar' || p === 'datos-cobro' ? p : 'bitacora';
  });
  // Si el deep-link de pestaña llega con el módulo ya montado, salta y consume el filtro (one-shot). El
  // deep-link de `tipo` (cobros fallidos → Bitácora) lo sigue consumiendo PestanaBitacora.
  const filtroSusc = useNavegacionPanel((s) => s.filtroSuscripciones);
  const consumirFiltroSuscripciones = useNavegacionPanel((s) => s.consumirFiltroSuscripciones);
  useEffect(() => {
    const p = filtroSusc?.pestana;
    if (p === 'por-verificar' || p === 'datos-cobro') {
      setTab(p);
      consumirFiltroSuscripciones();
    }
  }, [filtroSusc, consumirFiltroSuscripciones]);

  // Scroll de las pestañas no-bitácora (móvil) → ocultar la barra inferior. Bitácora registra el suyo.
  const esEscritorioTabs = useEsEscritorio();
  const listaTabsRef = useRef<HTMLDivElement>(null);
  const setScrollElTabs = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    if (tab === 'bitacora') return;
    setScrollElTabs(esEscritorioTabs ? null : listaTabsRef.current);
    return () => setScrollElTabs(null);
  }, [tab, esEscritorioTabs, setScrollElTabs]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Vista activa. Los chips de navegación (TabsNavSuscripciones) viven junto al
          buscador en Bitácora y arriba en las otras dos pestañas. */}
      {tab === 'bitacora' ? (
        <div className="min-h-0 flex-1">
          <PestanaBitacora tab={tab} setTab={setTab} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-5">
          <div className="mb-3 shrink-0">
            <TabsNavSuscripciones tab={tab} setTab={setTab} />
          </div>
          <div ref={listaTabsRef} className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'por-verificar' ? <PestanaPorVerificar /> : tab === 'historial' ? <PestanaHistorial /> : <PestanaDatosCobro />}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeccionSuscripciones;
