/**
 * SeccionNegocios.tsx
 * ====================
 * Sección Negocios del Panel (VER, solo lectura) — calcada del diseño nuevo.
 *   - Escritorio (lg:+): tabla con toolbar (búsqueda, chips de estado con conteos,
 *     vendedor, ciudad) + "Ordenar" + paginación.
 *   - Móvil: buscador, chips de estado (carrusel), filtro de ciudad y tarjetas.
 *
 * Alcance por rol lo aplica el backend. El front solo oculta la columna/filtro de
 * vendedor para el rol vendedor. Orden, conteos y paginado corren en servidor.
 *
 * Ubicación: apps/admin/src/components/negocios/SeccionNegocios.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Store, MapPin, User, ArrowUpDown } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useNegociosLista, useVendedoresFiltro, useCiudadesFiltro, usePrefetchNegocio } from '../../hooks/queries/useNegociosAdmin';
import type { OrdenNegocios, NegocioFila, ConteosEstado } from '../../services/negociosService';
import { metaEstado, BadgeEstadoPago, estadoEfectivo } from './estadoPago';
import { AvatarNegocio, AvatarVendedor, AvatarVacio } from './avatares';
import { MenuFiltro, type OpcionMenu } from './MenuFiltro';
import { FichaNegocio } from './FichaNegocio';

const POR_PAGINA = 20;
const SIN = '__none';

const TABS_ESTADO = [
  { id: '', label: 'Todos' },
  { id: 'al_corriente', label: 'Al corriente' },
  { id: 'en_gracia', label: 'En gracia' },
  { id: 'suspendido', label: 'Suspendido' },
  { id: 'cancelado', label: 'Cancelado' },
] as const;

const OPCIONES_ORDEN: { valor: OrdenNegocios; etiqueta: string }[] = [
  { valor: 'nombre_az', etiqueta: 'Nombre (A–Z)' },
  { valor: 'nombre_za', etiqueta: 'Nombre (Z–A)' },
  { valor: 'alta_recientes', etiqueta: 'Alta (recientes)' },
  { valor: 'alta_antiguos', etiqueta: 'Alta (antiguos)' },
  { valor: 'proximo_cobro', etiqueta: 'Próximo cobro' },
  { valor: 'estado', etiqueta: 'Estado de pago' },
];

const CONTEOS_CERO: ConteosEstado = { total: 0, porEstado: [] };
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}

/** Ciudad para mostrar: el placeholder del onboarding cuenta como "sin ciudad". */
function ciudadVisible(c: string | null): string | null {
  if (!c || c === 'Por configurar') return null;
  return c;
}

export function SeccionNegocios({ rol }: { rol: RolPanel }) {
  const esEscritorio = useEsEscritorio();
  const mostrarVendedor = rol !== 'vendedor';

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [estadoPago, setEstadoPago] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [orden, setOrden] = useState<OrdenNegocios>('nombre_az');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<NegocioFila | null>(null);
  const prefetchNegocio = usePrefetchNegocio();

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busquedaDeb, estadoPago, vendedorId, ciudad, orden]);

  const filtros = useMemo(
    () => ({
      busqueda: busquedaDeb || undefined,
      estadoPago: estadoPago || undefined,
      vendedorId: vendedorId || undefined,
      ciudad: ciudad || undefined,
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [busquedaDeb, estadoPago, vendedorId, ciudad, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useNegociosLista(filtros);
  const { data: vendedores } = useVendedoresFiltro(mostrarVendedor);
  const { data: ciudades } = useCiudadesFiltro();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(busquedaDeb || estadoPago || vendedorId || ciudad);

  const conteoDe = (id: string): number =>
    id === '' ? conteos.total : (conteos.porEstado.find((c) => c.estado === id)?.total ?? 0);

  // ── Opciones de los dropdowns ───────────────────────────────────────────────
  const opcionesVendedor: OpcionMenu[] = [
    { valor: '', etiqueta: 'Todos los vendedores' },
    { valor: SIN, etiqueta: 'Sin asignar' },
    ...(vendedores ?? []).map((v) => ({
      valor: v.id,
      etiqueta: v.nombre,
      adorno: <AvatarVendedor nombre={v.nombre} tam={22} />,
    })),
  ];
  const etiquetaVendedor =
    vendedorId === '' ? 'Todos los vendedores'
      : vendedorId === SIN ? 'Sin asignar'
        : vendedores?.find((v) => v.id === vendedorId)?.nombre ?? 'Vendedor';

  const opcionesCiudad: OpcionMenu[] = [
    { valor: '', etiqueta: 'Todas las ciudades' },
    { valor: SIN, etiqueta: 'Sin ciudad' },
    ...(ciudades ?? []).map((c) => ({
      valor: c,
      etiqueta: c,
      adorno: <MapPin size={16} className="text-texto-3" />,
    })),
  ];
  const etiquetaCiudad =
    ciudad === '' ? 'Todas las ciudades' : ciudad === SIN ? 'Sin ciudad' : ciudad;

  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Nombre (A–Z)';

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="negocios-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre…"
        className="w-full rounded-[10px] border border-borde bg-superficie-2 py-2.5 pl-9 pr-9 text-[13.5px] font-medium text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
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

  const ficha = seleccionado ? (
    <FichaNegocio previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-2.5 shrink-0">{buscador}</div>

        {/* Chips estado (carrusel) */}
        <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS_ESTADO.map((t) => {
            const activo = estadoPago === t.id;
            const dot = t.id ? metaEstado(t.id).color : null;
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`negocios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstadoPago(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  activo ? 'border-marca bg-marca text-white' : 'border-borde bg-superficie text-texto-2'
                }`}
              >
                {dot && <span className="h-[7px] w-[7px] rounded-full" style={{ background: activo ? '#fff' : dot }} />}
                {t.label} <span className="text-[11px] opacity-80">{conteoDe(t.id)}</span>
              </button>
            );
          })}
        </div>

        {/* Total + ciudad */}
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <span className="text-[12.5px] text-texto-3">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'negocio' : 'negocios'}
          </span>
          <MenuFiltro
            testid="negocios-filtro-ciudad"
            icono={<MapPin size={16} />}
            etiquetaBoton={etiquetaCiudad}
            opciones={opcionesCiudad}
            valor={ciudad}
            onCambiar={setCiudad}
            alineacion="derecha"
            compacto
          />
        </div>

        {/* Lista de cards */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoMensaje texto="Cargando negocios…" />
          ) : isError ? (
            <EstadoMensaje texto="No se pudieron cargar los negocios." tono="error" />
          ) : items.length === 0 ? (
            <EstadoMensaje texto={rol === 'vendedor' ? 'No tienes negocios en tu cartera todavía.' : 'Sin resultados. Ajusta la búsqueda o los filtros.'} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((n) => (
                <CardNegocio key={n.id} n={n} mostrarVendedor={mostrarVendedor} onAbrir={() => setSeleccionado(n)} onPrefetch={() => prefetchNegocio(n.id)} />
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
  const cols = mostrarVendedor
    ? 'minmax(220px,2.4fr) 1.3fr 1.1fr 1fr 0.9fr 28px'
    : 'minmax(220px,2.4fr) 1.1fr 1fr 0.9fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Toolbar */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <div className="min-w-[220px] max-w-[360px] flex-1">{buscador}</div>

        {/* Chips estado segmentados */}
        <div className="inline-flex items-center gap-1 rounded-[11px] border border-borde bg-superficie-2 p-[3px]">
          {TABS_ESTADO.map((t) => {
            const activo = estadoPago === t.id;
            const dot = t.id ? metaEstado(t.id).color : null;
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`negocios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstadoPago(t.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
                  activo ? 'bg-superficie text-marca shadow-[0_1px_2px_rgba(20,22,28,0.06)]' : 'text-texto-2 hover:text-texto'
                }`}
              >
                {dot && <span className="h-[7px] w-[7px] rounded-full" style={{ background: dot }} />}
                {t.label}
                <span
                  className={`min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold ${activo ? 'bg-marca-suave text-marca' : 'text-texto-3'}`}
                  style={!activo ? { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)' } : undefined}
                >
                  {conteoDe(t.id)}
                </span>
              </button>
            );
          })}
        </div>

        {mostrarVendedor && (
          <MenuFiltro
            testid="negocios-filtro-vendedor"
            icono={<User size={16} />}
            etiquetaBoton={etiquetaVendedor}
            opciones={opcionesVendedor}
            valor={vendedorId}
            onCambiar={setVendedorId}
          />
        )}
        <MenuFiltro
          testid="negocios-filtro-ciudad"
          icono={<MapPin size={16} />}
          etiquetaBoton={etiquetaCiudad}
          opciones={opcionesCiudad}
          valor={ciudad}
          onCambiar={setCiudad}
        />
      </div>

      {/* Subhead: total + ordenar */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="text-[13px] text-texto-3" data-testid="negocios-total">
          <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'negocio' : 'negocios'}
          {hayFiltro ? ' · filtrado' : ''}
          {isFetching && !isLoading ? ' · actualizando…' : ''}
        </span>
        <MenuFiltro
          testid="negocios-orden"
          plano
          icono={<ArrowUpDown size={15} />}
          etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
          opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
          valor={orden}
          onCambiar={(v) => setOrden(v as OrdenNegocios)}
          anchoMenu={200}
        />
      </div>

      {/* Tabla */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Negocio</span>
          {mostrarVendedor && <span>Vendedor</span>}
          <span>Estado de pago</span>
          <span>Próximo cobro</span>
          <span>Alta</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoMensaje texto="Cargando negocios…" />
          ) : isError ? (
            <EstadoMensaje texto="No se pudieron cargar los negocios." tono="error" />
          ) : items.length === 0 ? (
            <EstadoMensaje texto={rol === 'vendedor' ? 'No tienes negocios en tu cartera todavía.' : 'Sin resultados. Ajusta la búsqueda o los filtros.'} />
          ) : (
            items.map((n) => (
              <FilaNegocio key={n.id} n={n} cols={cols} mostrarVendedor={mostrarVendedor} onAbrir={() => setSeleccionado(n)} onPrefetch={() => prefetchNegocio(n.id)} />
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

function CeldaVendedor({ nombre }: { nombre: string | null }) {
  if (!nombre) {
    return (
      <span className="inline-flex items-center gap-2 text-[12.5px] text-texto-4">
        <AvatarVacio tam={26} /> Sin asignar
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <AvatarVendedor nombre={nombre} tam={26} />
      <span className="truncate text-[13px] text-texto-2">{nombre}</span>
    </span>
  );
}

function FilaNegocio({
  n,
  cols,
  mostrarVendedor,
  onAbrir,
  onPrefetch,
}: {
  n: NegocioFila;
  cols: string;
  mostrarVendedor: boolean;
  onAbrir: () => void;
  onPrefetch: () => void;
}) {
  const ciudad = ciudadVisible(n.ciudad);
  return (
    <button
      type="button"
      data-testid={`negocio-fila-${n.id}`}
      onClick={onAbrir}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="grid w-full items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <AvatarNegocio nombre={n.nombre} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{n.nombre}</span>
          <span className={`inline-flex items-center gap-1 text-[12px] ${ciudad ? 'text-texto-3' : 'text-texto-4'}`}>
            <MapPin size={12} className="shrink-0" />
            {ciudad ?? 'Sin ciudad'}
          </span>
        </span>
      </span>
      {mostrarVendedor && (
        <span className="min-w-0">
          <CeldaVendedor nombre={n.vendedorNombre} />
        </span>
      )}
      <span><BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} /></span>
      <span className={`text-[13px] ${n.proximoCobro ? 'text-texto-2' : 'text-texto-4'}`}>{fechaCorta(n.proximoCobro)}</span>
      <span className="text-[13px] text-texto-2">{fechaCorta(n.alta)}</span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </button>
  );
}

function CardNegocio({ n, mostrarVendedor, onAbrir, onPrefetch }: { n: NegocioFila; mostrarVendedor: boolean; onAbrir: () => void; onPrefetch: () => void }) {
  const ciudad = ciudadVisible(n.ciudad);
  return (
    <button
      type="button"
      data-testid={`negocio-card-${n.id}`}
      onClick={onAbrir}
      onTouchStart={onPrefetch}
      onMouseEnter={onPrefetch}
      className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarNegocio nombre={n.nombre} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{n.nombre}</span>
        <span className="flex items-center gap-2 text-[12px] text-texto-3">
          <span className="truncate">{ciudad ?? 'Sin ciudad'}</span>
          {mostrarVendedor && (
            <>
              <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-texto-4" />
              <span className="inline-flex min-w-0 items-center gap-1">
                <User size={12} className="shrink-0" />
                <span className="truncate">{n.vendedorNombre ?? 'Sin asignar'}</span>
              </span>
            </>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} small />
        <ChevronRight size={16} className="text-texto-4" />
      </span>
    </button>
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
    <div className="mt-3 flex shrink-0 items-center justify-between border-t border-borde pt-3 text-[12.5px] text-texto-3">
      <span data-testid="negocios-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="negocios-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-[9px] border border-borde-fuerte px-2.5 py-1.5 font-medium text-texto-2 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-texto-2"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="negocios-siguiente"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina >= totalPaginas}
          className="inline-flex items-center gap-1 rounded-[9px] border border-borde-fuerte px-2.5 py-1.5 font-medium text-texto-2 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-texto-2"
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
        <Store size={28} className="mx-auto mb-3 text-texto-4" />
        <p className={`text-sm ${tono === 'error' ? 'text-peligro' : 'text-texto-3'}`}>{texto}</p>
      </div>
    </div>
  );
}

export default SeccionNegocios;
