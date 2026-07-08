/**
 * SeccionVendedores.tsx
 * =====================
 * Sección "Vendedores y comisiones" del Panel (VER, solo lectura) — pieza A: la CARTERA.
 * Bifurca por rol:
 *   - superadmin / gerente → lista de la red de ventas (tabla/tarjetas) + drawer con la cartera.
 *   - vendedor → su PROPIA cartera a pantalla completa ("Mis comisiones"), sin tabla intermedia.
 *
 * La acota el backend: super ve toda la red; el gerente solo SU equipo (su región); el vendedor solo
 * a sí mismo. Las comisiones, los pagos y los cortes de efectivo son Fase 2.
 *
 * Ubicación: apps/admin/src/components/vendedores/SeccionVendedores.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, CircleDollarSign, ArrowUpDown } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useVendedoresLista, usePrefetchVendedor, useVendedor } from '../../hooks/queries/useVendedoresAdmin';
import type { OrdenVendedores, VendedorFila, ConteosEstado } from '../../services/vendedoresService';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { MenuFiltro } from '../negocios/MenuFiltro';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DetalleVendedor, CuerpoCartera, type TabVendedor } from './DetalleVendedor';
import { useNavegacionPanel } from '../../stores/useNavegacionPanel';

type RolPanel = 'superadmin' | 'gerente' | 'vendedor';

const POR_PAGINA = 20;

const TABS_VENDEDOR: TabVendedor[] = ['cartera', 'comisiones', 'pagos', 'efectivo'];

/** Placeholder mínimo para abrir el detalle por deep-link (React Query rellena con `useCartera`). */
function placeholderDesdeFiltro(f: { usuarioId?: string; embajadorId?: string; nombre?: string }): VendedorFila {
  return {
    id: f.usuarioId ?? '',
    embajadorId: f.embajadorId ?? '',
    nombre: f.nombre ?? '',
    avatarUrl: null,
    correo: '',
    codigoReferido: '',
    linkReferido: null,
    estadoEmbajador: 'activo',
    regionNombre: null,
    ciudades: null,
    negociosEnCartera: 0,
    negociosActivos: 0,
  };
}

const TABS_ESTADO = [
  { id: '', label: 'Todos' },
  { id: 'activo', label: 'Activos' },
  { id: 'inactivo', label: 'Inactivos' },
  { id: 'suspendido', label: 'Suspendidos' },
] as const;

/** Color del estado del vendedor (para el punto y el resaltado del chip de filtro). */
function colorEstadoVendedor(id: string): string {
  return id === 'activo'
    ? 'var(--panel-ok)'
    : id === 'suspendido'
      ? 'var(--panel-danger)'
      : id === 'inactivo'
        ? 'var(--panel-text-4)'
        : 'var(--panel-brand)';
}

const OPCIONES_ORDEN: { valor: OrdenVendedores; etiqueta: string }[] = [
  { valor: 'nombre_az', etiqueta: 'Nombre (A–Z)' },
  { valor: 'nombre_za', etiqueta: 'Nombre (Z–A)' },
  { valor: 'cartera_desc', etiqueta: 'Cartera (mayor)' },
  { valor: 'activos_desc', etiqueta: 'Activos (mayor)' },
];

const CONTEOS_CERO: ConteosEstado = { total: 0, porEstado: [] };

/** Metadatos del estado del embajador (sobrio, Regla 13: punto de color + etiqueta neutra). */
const EMB_META: Record<string, { etiqueta: string; color: string }> = {
  activo: { etiqueta: 'Activo', color: 'var(--panel-ok)' },
  inactivo: { etiqueta: 'Inactivo', color: 'var(--panel-text-4)' },
  suspendido: { etiqueta: 'Suspendido', color: 'var(--panel-danger)' },
};

function BadgeEmbajador({ estado, small }: { estado: string; small?: boolean }) {
  const meta = EMB_META[estado] ?? { etiqueta: estado, color: 'var(--panel-text-4)' };
  return (
    <span
      className={`txt-badge inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      }`}
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.etiqueta}
    </span>
  );
}

export function SeccionVendedores({ rol }: { rol: RolPanel }) {
  if (rol === 'vendedor') return <MiCartera />;
  return <ListaVendedores />;
}

// =============================================================================
// VISTA DEL VENDEDOR — su propia cartera a pantalla completa
// =============================================================================

function MiCartera() {
  const esEscritorio = useEsEscritorio();
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  const [pagina, setPagina] = useState(1);
  // El vendedor solo se ve a sí mismo: la lista trae su única fila → de ahí su id.
  const { data: lista, isLoading: cargandoLista } = useVendedoresLista({ pagina: 1, porPagina: 1 });
  const mi = lista?.items[0] ?? null;
  // Su ficha (gerente, último acceso…). La LISTA de negocios la ve en "Mi cartera" (Negocios), no aquí.
  const { data: detalle, isLoading, isError } = useVendedor(mi?.id ?? null);

  return (
    <div ref={listaRef} className="h-full min-h-0 overflow-y-auto p-4 lg:overflow-hidden lg:p-5">
      {cargandoLista ? (
        <EstadoSeccion variante="cargando" icono={CircleDollarSign} titulo="Cargando…" />
      ) : !mi ? (
        <EstadoSeccion icono={CircleDollarSign} titulo="Aún no tienes cartera" descripcion="Cuando registres tu primer negocio, aparecerá en “Mi cartera”." />
      ) : (
        <CuerpoCartera cartera={null} placeholder={detalle ?? mi} isLoading={isLoading} isError={isError} pagina={pagina} setPagina={setPagina} vistaVendedor />
      )}
    </div>
  );
}

// =============================================================================
// VISTA SUPER / GERENTE — lista de la red de ventas
// =============================================================================

function ListaVendedores() {
  const esEscritorio = useEsEscritorio();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [estado, setEstado] = useState('');
  const [orden, setOrden] = useState<OrdenVendedores>('cartera_desc');
  const [pagina, setPagina] = useState(1);
  // Deep-link desde un pendiente (campana/Resumen): abre directo el vendedor en la pestaña de la tarea
  // (efectivo → "Por entregar", comisiones → "Pagos"). Se lee al montar (getState) para no parpadear.
  const [vendedorAbierto, setVendedorAbierto] = useState<VendedorFila | null>(() => {
    const f = useNavegacionPanel.getState().filtroVendedores;
    return f?.usuarioId ? placeholderDesdeFiltro(f) : null;
  });
  const [tabInicial, setTabInicial] = useState<TabVendedor | undefined>(() => {
    const f = useNavegacionPanel.getState().filtroVendedores;
    return f?.usuarioId && f.tab && (TABS_VENDEDOR as string[]).includes(f.tab) ? (f.tab as TabVendedor) : undefined;
  });
  const [paginaCartera, setPaginaCartera] = useState(1);
  const prefetch = usePrefetchVendedor();

  // Consume el filtro one-shot (ya se leyó en los initializers de arriba) para que no se reaplique al
  // volver a la sección desde el menú.
  useEffect(() => {
    if (useNavegacionPanel.getState().filtroVendedores) {
      useNavegacionPanel.getState().consumirFiltroVendedores();
    }
  }, []);

  const abrir = (v: VendedorFila) => { setVendedorAbierto(v); setTabInicial(undefined); setPaginaCartera(1); };
  const cerrar = () => { setVendedorAbierto(null); setTabInicial(undefined); setPaginaCartera(1); };

  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    // Con el detalle abierto, la lista no se renderiza: su scroll lo registra DetalleVendedor.
    setScrollEl(esEscritorio || vendedorAbierto ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl, vendedorAbierto]);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busquedaDeb, estado, orden]);

  const filtros = useMemo(
    () => ({
      busqueda: busquedaDeb || undefined,
      estado: estado || undefined,
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [busquedaDeb, estado, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useVendedoresLista(filtros);

  // Master-detail: al abrir un vendedor, su detalle reemplaza la lista (full-width).
  if (vendedorAbierto) {
    return <DetalleVendedor previo={vendedorAbierto} onCerrar={cerrar} pagina={paginaCartera} setPagina={setPaginaCartera} tabInicial={tabInicial} />;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(busquedaDeb || estado);

  const hayFiltrosActivos = !!(busqueda.trim() || estado) || orden !== 'cartera_desc';
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstado('');
    setOrden('cartera_desc');
  };

  const conteoDe = (id: string): number =>
    id === '' ? conteos.total : (conteos.porEstado.find((c) => c.estado === id)?.total ?? 0);

  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Cartera (mayor)';

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="vendedores-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, correo o código…"
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

  const chipsEstado = (
    <div className="flex flex-wrap items-center gap-2">
      {TABS_ESTADO.map((t) => {
        const activo = estado === t.id;
        const color = colorEstadoVendedor(t.id);
        return (
          <button
            key={t.id || 'todos'}
            type="button"
            data-testid={`vendedores-filtro-estado-${t.id || 'todos'}`}
            onClick={() => setEstado(t.id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
            style={activo ? { background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 34%, transparent)`, color } : undefined}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
            {t.label}
            <span
              className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums"
              style={activo
                ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color }
                : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }}
            >
              {conteoDe(t.id)}
            </span>
          </button>
        );
      })}
    </div>
  );

  const ordenar = (
    <MenuFiltro
      testid="vendedores-orden"
      icono={<ArrowUpDown size={15} />}
      etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
      opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
      valor={orden}
      onCambiar={(v) => setOrden(v as OrdenVendedores)}
      anchoMenu={210}
      tam="chip"
    />
  );

  const estadoLista = isLoading ? (
    <EstadoSeccion variante="cargando" icono={CircleDollarSign} titulo="Cargando vendedores…" />
  ) : isError ? (
    <EstadoSeccion variante="error" icono={CircleDollarSign} titulo="No se pudieron cargar los vendedores." descripcion="Revisa tu conexión e inténtalo de nuevo." />
  ) : items.length === 0 ? (
    hayFiltrosActivos ? (
      <EstadoSeccion icono={CircleDollarSign} titulo="Sin resultados" descripcion="Ningún vendedor coincide con tu búsqueda o filtros." accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }} />
    ) : (
      <EstadoSeccion icono={CircleDollarSign} titulo="Aún no hay vendedores" />
    )
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        {/* Móvil: filtros (chips con punto de color) arriba, buscador debajo. */}
        <div className="mb-2.5 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS_ESTADO.map((t) => {
            const activo = estado === t.id;
            const color = colorEstadoVendedor(t.id);
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`vendedores-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstado(t.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition"
                style={activo ? { background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 34%, transparent)`, color } : undefined}
              >
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
                {t.label}
                <span
                  className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums"
                  style={activo
                    ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color }
                    : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }}
                >
                  {conteoDe(t.id)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mb-2.5 shrink-0">{buscador}</div>

        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {estadoLista ?? (
            <div className="flex flex-col gap-2.5">
              {items.map((v) => (
                <CardVendedor key={v.id} v={v} onAbrir={() => abrir(v)} onPrefetch={() => prefetch(v.id)} />
              ))}
            </div>
          )}
        </div>

        {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
      </div>
    );
  }

  // ── Vista ESCRITORIO ────────────────────────────────────────────────────────
  const cols = 'minmax(220px,2.4fr) minmax(150px,1.6fr) 0.8fr 0.8fr 1fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      <div className="mb-3 shrink-0">
        <div className="w-full max-w-[420px]">{buscador}</div>
      </div>

      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        {chipsEstado}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-texto-3" data-testid="vendedores-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'vendedor' : 'vendedores'}
            {hayFiltro ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
          {ordenar}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde shadow-tarjeta-panel">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Vendedor</span>
          <span>Región</span>
          <span>Cartera</span>
          <span>Activos</span>
          <span>Estado</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {estadoLista ?? items.map((v) => (
            <FilaVendedor key={v.id} v={v} cols={cols} onAbrir={() => abrir(v)} onPrefetch={() => prefetch(v.id)} />
          ))}
        </div>
      </div>

      {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function FilaVendedor({ v, cols, onAbrir, onPrefetch }: { v: VendedorFila; cols: string; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`vendedores-fila-${v.id}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir();
        }
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="grid w-full cursor-pointer items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave focus:bg-marca-suave focus:outline-none"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <AvatarUsuario nombre={v.nombre || v.correo} avatarUrl={v.avatarUrl} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{v.nombre || '(Sin nombre)'}</span>
          <span className="truncate text-[13px] text-texto-3">{v.correo}</span>
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13.5px] text-texto-2">{v.regionNombre ?? '—'}</span>
        {v.ciudades && <span className="truncate text-[13px] text-texto-4">{v.ciudades}</span>}
      </span>
      <span className="text-[14px] font-semibold text-texto">{v.negociosEnCartera}</span>
      <span className="text-[14px] font-semibold" style={{ color: 'var(--panel-ok)' }}>{v.negociosActivos}</span>
      <span><BadgeEmbajador estado={v.estadoEmbajador} small /></span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardVendedor({ v, onAbrir, onPrefetch }: { v: VendedorFila; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`vendedores-card-${v.id}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir();
        }
      }}
      onTouchStart={onPrefetch}
      onMouseEnter={onPrefetch}
      className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarUsuario nombre={v.nombre || v.correo} avatarUrl={v.avatarUrl} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-texto">{v.nombre || '(Sin nombre)'}</span>
        <span className="truncate text-[13.5px] text-texto-3">{v.regionNombre ?? '—'}</span>
        <span className="mt-0.5 text-[13px] text-texto-4">
          <b className="font-semibold text-texto-2">{v.negociosEnCartera}</b> en cartera ·{' '}
          <b className="font-semibold" style={{ color: 'var(--panel-ok)' }}>{v.negociosActivos}</b> activos
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeEmbajador estado={v.estadoEmbajador} small />
        <ChevronRight size={16} className="text-texto-4" />
      </span>
    </div>
  );
}

function Paginacion({ desde, hasta, total, pagina, totalPaginas, setPagina }: { desde: number; hasta: number; total: number; pagina: number; totalPaginas: number; setPagina: (fn: (p: number) => number) => void }) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-between text-[12.5px] text-texto-3 lg:pt-1">
      <span data-testid="vendedores-rango">{desde}–{hasta} de {total}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="vendedores-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="vendedores-siguiente"
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

export default SeccionVendedores;
