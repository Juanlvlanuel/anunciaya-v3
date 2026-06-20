/**
 * SeccionAuditoria.tsx
 * ====================
 * Sección Auditoría del Panel = la BITÁCORA DE ACCIONES del equipo (quién hizo qué y
 * cuándo). Solo lectura. Calcada de SeccionSuscripciones (sin KPIs de dinero ni búsqueda
 * de texto — el filtrado es por acción / persona / periodo).
 *   - Escritorio (lg:+): total + filtros (acción, persona, periodo, orden) + tabla + paginación.
 *   - Móvil: filtros (icono) + cards + paginación.
 *
 * Alcance por rol lo aplica el backend (super = todo · gerente = su equipo · vendedor 403).
 * Orden y paginado corren en servidor.
 *
 * Ubicación: apps/admin/src/components/auditoria/SeccionAuditoria.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Calendar, User, ScrollText } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useAuditoria, useActoresAuditoria, usePrefetchAuditoria } from '../../hooks/queries/useAuditoriaAdmin';
import type { OrdenAuditoria, AuditoriaFila } from '../../services/auditoriaService';
import { etiquetaAccion, BadgeModulo, OPCIONES_ACCION, etiquetaEntidad } from './accionesAuditoria';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { FichaAuditoria } from './FichaAuditoria';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const POR_PAGINA = 20;

const OPCIONES_ORDEN: { valor: OrdenAuditoria; etiqueta: string }[] = [
  { valor: 'fecha_recientes', etiqueta: 'Fecha (recientes)' },
  { valor: 'fecha_antiguos', etiqueta: 'Fecha (antiguos)' },
];

const OPCIONES_PERIODO: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todo el tiempo' },
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: '7d', etiqueta: 'Últimos 7 días' },
  { valor: '30d', etiqueta: 'Últimos 30 días' },
  { valor: 'anio', etiqueta: 'Último año' },
];

const OPCIONES_ACCION_MENU: OpcionMenu[] = [{ valor: '', etiqueta: 'Todas las acciones' }, ...OPCIONES_ACCION];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ROL_LABEL: Record<string, string> = { superadmin: 'Superadmin', gerente: 'Gerente', vendedor: 'Vendedor' };

/** Fecha + hora corta es-MX. */
function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}

/** Iniciales (máx 2) del nombre del actor para el mini-avatar. */
function inicialesDe(nombre: string | null): string {
  if (!nombre) return '—';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '—';
}

/** Traduce el preset de periodo a `desde` (ISO de inicio del día → estable entre renders). */
function desdeDelPeriodo(periodo: string): string | undefined {
  if (!periodo) return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (periodo === '7d') d.setDate(d.getDate() - 6);
  else if (periodo === '30d') d.setDate(d.getDate() - 29);
  else if (periodo === 'anio') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

export function SeccionAuditoria({ rol: _rol }: { rol: RolPanel }) {
  const esEscritorio = useEsEscritorio();

  const [accion, setAccion] = useState('');
  const [actorId, setActorId] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [orden, setOrden] = useState<OrdenAuditoria>('fecha_recientes');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<AuditoriaFila | null>(null);
  const prefetch = usePrefetchAuditoria();

  // Registra el contenedor scrolleable (móvil) para el auto-ocultado de la barra inferior.
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  useEffect(() => {
    setPagina(1);
  }, [accion, actorId, periodo, orden]);

  const filtros = useMemo(
    () => ({
      accion: accion || undefined,
      actorId: actorId || undefined,
      desde: desdeDelPeriodo(periodo),
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [accion, actorId, periodo, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useAuditoria(filtros);
  const { data: actores } = useActoresAuditoria();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(accion || actorId || periodo);
  const hayFiltrosActivos = hayFiltro || orden !== 'fecha_recientes';

  const limpiarFiltros = () => {
    setAccion('');
    setActorId('');
    setPeriodo('');
    setOrden('fecha_recientes');
  };

  const opcionesActor: OpcionMenu[] = useMemo(
    () => [{ valor: '', etiqueta: 'Todas las personas' }, ...(actores ?? []).map((a) => ({ valor: a.id, etiqueta: a.nombre ?? '—' }))],
    [actores],
  );

  const etiquetaAccionSel = accion ? etiquetaAccion(accion) : 'Todas las acciones';
  const etiquetaActor = opcionesActor.find((o) => o.valor === actorId)?.etiqueta ?? 'Todas las personas';
  const etiquetaPeriodo = OPCIONES_PERIODO.find((o) => o.valor === periodo)?.etiqueta ?? 'Todo el tiempo';
  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Fecha (recientes)';

  const ficha = seleccionado ? <FichaAuditoria previo={seleccionado} onCerrar={() => setSeleccionado(null)} /> : null;

  const vacioOError = isLoading ? (
    <EstadoSeccion variante="cargando" icono={ScrollText} titulo="Cargando bitácora…" />
  ) : isError ? (
    <EstadoSeccion
      variante="error"
      icono={ScrollText}
      titulo="No se pudo cargar la bitácora."
      descripcion="Revisa tu conexión e inténtalo de nuevo."
    />
  ) : items.length === 0 ? (
    hayFiltrosActivos ? (
      <EstadoSeccion
        icono={ScrollText}
        titulo="Sin registros"
        descripcion="Ninguna acción coincide con los filtros."
        accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
      />
    ) : (
      <EstadoSeccion icono={ScrollText} titulo="Aún no hay acciones registradas" />
    )
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        {/* Filtros (icono) */}
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">
            <MenuFiltro
              testid="auditoria-filtro-accion"
              icono={<ScrollText size={18} />}
              etiquetaBoton={etiquetaAccionSel}
              opciones={OPCIONES_ACCION_MENU}
              valor={accion}
              onCambiar={setAccion}
              anchoMenu={250}
            />
          </div>
          <MenuFiltro
            testid="auditoria-filtro-actor"
            icono={<User size={18} />}
            etiquetaBoton={etiquetaActor}
            opciones={opcionesActor}
            valor={actorId}
            onCambiar={setActorId}
            alineacion="derecha"
            soloIcono
          />
          <MenuFiltro
            testid="auditoria-filtro-periodo"
            icono={<Calendar size={18} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={OPCIONES_PERIODO}
            valor={periodo}
            onCambiar={setPeriodo}
            alineacion="derecha"
            soloIcono
          />
        </div>

        {/* Lista de cards */}
        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {vacioOError ?? (
            <div className="flex flex-col gap-2.5">
              {items.map((r) => (
                <CardAccion key={r.id} r={r} onAbrir={() => setSeleccionado(r)} onPrefetch={() => prefetch(r.id)} />
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
  const cols = 'minmax(180px,1.8fr) minmax(200px,2.2fr) 1.4fr 1fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Total (izq) + filtros (der) */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-[13px] text-texto-3" data-testid="auditoria-total">
          <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'acción' : 'acciones'}
          {hayFiltro ? ' · filtrado' : ''}
          {isFetching && !isLoading ? ' · actualizando…' : ''}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <MenuFiltro
            testid="auditoria-filtro-accion"
            icono={<ScrollText size={16} />}
            etiquetaBoton={etiquetaAccionSel}
            opciones={OPCIONES_ACCION_MENU}
            valor={accion}
            onCambiar={setAccion}
            anchoMenu={260}
            tam="chip"
          />
          <MenuFiltro
            testid="auditoria-filtro-actor"
            icono={<User size={16} />}
            etiquetaBoton={etiquetaActor}
            opciones={opcionesActor}
            valor={actorId}
            onCambiar={setActorId}
            anchoMenu={220}
            tam="chip"
          />
          <MenuFiltro
            testid="auditoria-filtro-periodo"
            icono={<Calendar size={16} />}
            etiquetaBoton={etiquetaPeriodo}
            opciones={OPCIONES_PERIODO}
            valor={periodo}
            onCambiar={setPeriodo}
            tam="chip"
          />
          <MenuFiltro
            testid="auditoria-orden"
            icono={<ArrowUpDown size={15} />}
            etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
            opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            valor={orden}
            onCambiar={(v) => setOrden(v as OrdenAuditoria)}
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
          <span>Quién</span>
          <span>Acción</span>
          <span>Sobre</span>
          <span>Cuándo</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {vacioOError ??
            items.map((r) => (
              <FilaAccion key={r.id} r={r} cols={cols} onAbrir={() => setSeleccionado(r)} onPrefetch={() => prefetch(r.id)} />
            ))}
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

/** Mini-avatar de iniciales del actor (sobrio, sin foto — la auditoría no la trae). */
function AvatarActor({ nombre, tam = 38 }: { nombre: string | null; tam?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-borde bg-superficie-2 font-semibold text-texto-3"
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
    >
      {inicialesDe(nombre)}
    </span>
  );
}

function TextoEntidad({ r }: { r: AuditoriaFila }) {
  return <span className="truncate text-[13px] text-texto-2">{etiquetaEntidad(r.entidadTipo, r.entidadNombre, !!r.entidadId)}</span>;
}

function FilaAccion({ r, cols, onAbrir, onPrefetch }: { r: AuditoriaFila; cols: string; onAbrir: () => void; onPrefetch: () => void }) {
  const rolLegible = r.actorRol ? (ROL_LABEL[r.actorRol] ?? r.actorRol) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`auditoria-fila-${r.id}`}
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
        <AvatarActor nombre={r.actorNombre} tam={34} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{r.actorNombre ?? 'Sistema'}</span>
          {rolLegible && <span className="truncate text-[12px] text-texto-4">{rolLegible}</span>}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <BadgeModulo accion={r.accion} />
        <span className="truncate text-[13.5px] font-medium text-texto">{etiquetaAccion(r.accion)}</span>
      </span>
      <span className="flex min-w-0"><TextoEntidad r={r} /></span>
      <span className="text-[13px] text-texto-2">{fechaCorta(r.fecha)}</span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardAccion({ r, onAbrir, onPrefetch }: { r: AuditoriaFila; onAbrir: () => void; onPrefetch: () => void }) {
  const rolLegible = r.actorRol ? (ROL_LABEL[r.actorRol] ?? r.actorRol) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`auditoria-card-${r.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      onTouchStart={onPrefetch}
      className="flex items-start gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarActor nombre={r.actorNombre} tam={40} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[14px] font-semibold text-texto">{etiquetaAccion(r.accion)}</span>
        <span className="truncate text-[12.5px] text-texto-3">
          {r.actorNombre ?? 'Sistema'}
          {rolLegible ? ` · ${rolLegible}` : ''}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <BadgeModulo accion={r.accion} small />
          <span className="truncate text-[12px] text-texto-4">{fechaCorta(r.fecha)}</span>
        </span>
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
      <span data-testid="auditoria-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="auditoria-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="auditoria-siguiente"
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

export default SeccionAuditoria;
