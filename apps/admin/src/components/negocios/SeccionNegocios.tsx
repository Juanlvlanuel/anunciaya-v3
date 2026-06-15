/**
 * SeccionNegocios.tsx
 * ====================
 * Sección Negocios del Panel (VER, solo lectura) — calcada del diseño nuevo.
 *   - Escritorio (lg:+): buscador + acción "Registrar" · chips de estado con conteos,
 *     filtros (vendedor, ciudad) y "Ordenar" al nivel de los chips + tabla + paginación.
 *   - Móvil: buscador, chips de estado (carrusel), filtro de ciudad y tarjetas.
 *
 * Alcance por rol lo aplica el backend. El front solo oculta la columna/filtro de
 * vendedor para el rol vendedor, y la opción "Sin ciudad" para no-superadmin. Orden,
 * conteos y paginado corren en servidor.
 *
 * Ubicación: apps/admin/src/components/negocios/SeccionNegocios.tsx
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, X, ChevronLeft, ChevronRight, CornerDownRight, Store, MapPin, User, ArrowUpDown, Plus, Loader2 } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useNegociosLista, useVendedoresFiltro, useCiudadesFiltro, usePrefetchNegocio, useSucursalesNegocio, PAGOS_INICIAL_FICHA } from '../../hooks/queries/useNegociosAdmin';
import { queryKeys } from '../../config/queryKeys';
import { listarPagosNegocio, obtenerDetalleNegocio } from '../../services/negociosService';
import type { OrdenNegocios, NegocioFila, SucursalFila, ConteosEstado } from '../../services/negociosService';
import { metaEstado, BadgeEstadoPago, estadoEfectivo } from './estadoPago';
import { AvatarNegocio, AvatarVendedor, AvatarVacio } from './avatares';
import { MenuFiltro, type OpcionMenu } from './MenuFiltro';
import { FichaNegocio } from './FichaNegocio';
import { FichaSucursal } from './FichaSucursal';
import { DialogoRegistrarNegocio } from './DialogoRegistrarNegocio';

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
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '').replace(/ ([a-z])/i, (_m, l: string) => ` ${l.toUpperCase()}`);
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
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [sucursalSel, setSucursalSel] = useState<{ negocioId: string; sucursal: SucursalFila } | null>(null);
  const [abriendoId, setAbriendoId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Al abrir, esperamos a tener el historial de pagos en caché ANTES de montar la ficha, para
  // que el modal aparezca COMPLETO (info + historial) de una vez. Clave en móvil, donde no hay
  // hover que prefetchee con antelación (en PC el hover ya lo dejó en caché → resuelve al
  // instante). El resto de la info ya es instantánea por el placeholder de la fila. Mientras
  // carga, la tarjeta muestra un spinner; un guard evita doble apertura.
  const abrirNegocio = async (n: NegocioFila) => {
    if (abriendoId) return;
    setAbriendoId(n.id);
    try {
      // Detalle real + historial: con AMBOS en caché la ficha abre completa (valores reales,
      // no placeholders) y a su altura final, sin que el método de cobro real o el historial
      // muevan nada después. Ambas suelen venir ya prefetcheadas (hover/touch).
      await Promise.all([
        qc.ensureQueryData({
          queryKey: queryKeys.negocios.detalle(n.id),
          queryFn: () => obtenerDetalleNegocio(n.id),
          staleTime: 1000 * 60 * 2,
        }),
        qc.ensureQueryData({
          queryKey: [...queryKeys.negocios.pagos(n.id), PAGOS_INICIAL_FICHA + 1],
          queryFn: () => listarPagosNegocio(n.id, PAGOS_INICIAL_FICHA + 1),
          staleTime: 1000 * 60,
        }),
      ]);
    } catch {
      // Si algo falla, igual abrimos: la ficha mostrará su propio estado.
    }
    setSeleccionado(n);
    setAbriendoId(null);
  };
  const prefetchNegocio = usePrefetchNegocio();

  // Registra el contenedor scrolleable (vista móvil) para el auto-ocultado de la barra inferior.
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  const toggleExpandir = (id: string) =>
    setExpandidos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
    // "Sin ciudad" SOLO para superadmin: un gerente ve solo negocios con matriz en su
    // región (siempre con ciudad) y un vendedor su cartera; los negocios sin ciudad
    // (matriz huérfana) solo los ve el superadmin.
    ...(rol === 'superadmin' ? [{ valor: SIN, etiqueta: 'Sin ciudad' }] : []),
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

  const ficha = seleccionado ? (
    <FichaNegocio previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;
  const modalSucursal = sucursalSel ? (
    <FichaSucursal negocioId={sucursalSel.negocioId} sucursal={sucursalSel.sucursal} onCerrar={() => setSucursalSel(null)} />
  ) : null;
  const dialogoAlta = mostrarAlta ? (
    <DialogoRegistrarNegocio abierto onCerrar={() => setMostrarAlta(false)} rol={rol} />
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        {/* Buscador + filtro de ciudad (icono) + registrar (icono) */}
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">{buscador}</div>
          <MenuFiltro
            testid="negocios-filtro-ciudad"
            icono={<MapPin size={18} />}
            etiquetaBoton={etiquetaCiudad}
            opciones={opcionesCiudad}
            valor={ciudad}
            onCambiar={setCiudad}
            alineacion="derecha"
            soloIcono
          />
          <button
            type="button"
            data-testid="negocios-registrar"
            onClick={() => setMostrarAlta(true)}
            aria-label="Registrar negocio"
            title="Registrar negocio"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste transition active:opacity-90"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Chips estado (carrusel) — pills teñidos del color de cada estado al activarse. */}
        <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS_ESTADO.map((t) => {
            const activo = estadoPago === t.id;
            const color = t.id ? metaEstado(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`negocios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstadoPago(t.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition"
                style={
                  activo
                    ? {
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
                        color,
                      }
                    : undefined
                }
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
            <EstadoMensaje texto="Cargando negocios…" />
          ) : isError ? (
            <EstadoMensaje texto="No se pudieron cargar los negocios." tono="error" />
          ) : items.length === 0 ? (
            <EstadoMensaje texto={rol === 'vendedor' ? 'No tienes negocios en tu cartera todavía.' : 'Sin resultados. Ajusta la búsqueda o los filtros.'} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((n) => (
                <Fragment key={n.id}>
                  <CardNegocio
                    n={n}
                    abriendo={abriendoId === n.id}
                    expandido={expandidos.has(n.id)}
                    onAbrir={() => abrirNegocio(n)}
                    onToggle={() => toggleExpandir(n.id)}
                    onPrefetch={() => prefetchNegocio(n.id)}
                  />
                  {expandidos.has(n.id) && (
                    <SucursalesMovil negocioId={n.id} onAbrir={(suc) => setSucursalSel({ negocioId: n.id, sucursal: suc })} />
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
        {ficha}
        {modalSucursal}
        {dialogoAlta}
      </div>
    );
  }

  // ── Vista ESCRITORIO ────────────────────────────────────────────────────────
  const cols = mostrarVendedor
    ? 'minmax(220px,2.4fr) 1.3fr 1.1fr 1fr 0.9fr 92px 28px'
    : 'minmax(220px,2.4fr) 1.1fr 1fr 0.9fr 92px 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Buscador (izq) + acción primaria (der) */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-[220px] max-w-[360px] flex-1">{buscador}</div>
        <button
          type="button"
          data-testid="negocios-registrar"
          onClick={() => setMostrarAlta(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-marca px-3.5 py-2.5 text-[13px] font-semibold text-marca-contraste transition hover:opacity-90"
        >
          <Plus size={16} /> Registrar negocio
        </button>
      </div>

      {/* Subhead: chips de estado (izq) + total y ordenar (der) */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        {/* Chips de estado: pills sueltos, teñidos del color de cada estado al activarse. */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS_ESTADO.map((t) => {
            const activo = estadoPago === t.id;
            const color = t.id ? metaEstado(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`negocios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstadoPago(t.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
                style={
                  activo
                    ? {
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
                        color,
                      }
                    : undefined
                }
              >
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
                {t.label}
                <span
                  className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold"
                  style={
                    activo
                      ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color }
                      : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }
                  }
                >
                  {conteoDe(t.id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-texto-3" data-testid="negocios-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'negocio' : 'negocios'}
            {hayFiltro ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
          {mostrarVendedor && (
            <MenuFiltro
              testid="negocios-filtro-vendedor"
              icono={<User size={16} />}
              etiquetaBoton={etiquetaVendedor}
              opciones={opcionesVendedor}
              valor={vendedorId}
              onCambiar={setVendedorId}
              tam="chip"
            />
          )}
          <MenuFiltro
            testid="negocios-filtro-ciudad"
            icono={<MapPin size={16} />}
            etiquetaBoton={etiquetaCiudad}
            opciones={opcionesCiudad}
            valor={ciudad}
            onCambiar={setCiudad}
            tam="chip"
          />
          <MenuFiltro
            testid="negocios-orden"
            icono={<ArrowUpDown size={15} />}
            etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
            opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            valor={orden}
            onCambiar={(v) => setOrden(v as OrdenNegocios)}
            anchoMenu={200}
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
          {mostrarVendedor && <span>Vendedor</span>}
          <span>Estado de pago</span>
          <span>Próximo cobro</span>
          <span>Alta</span>
          <span>Sucursales</span>
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
              <Fragment key={n.id}>
                <FilaNegocio
                  n={n}
                  cols={cols}
                  mostrarVendedor={mostrarVendedor}
                  expandido={expandidos.has(n.id)}
                  onAbrir={() => abrirNegocio(n)}
                  onToggle={() => toggleExpandir(n.id)}
                  onPrefetch={() => prefetchNegocio(n.id)}
                />
                {expandidos.has(n.id) && (
                  <FilasSucursales
                    negocioId={n.id}
                    cols={cols}
                    mostrarVendedor={mostrarVendedor}
                    onAbrir={(suc) => setSucursalSel({ negocioId: n.id, sucursal: suc })}
                  />
                )}
              </Fragment>
            ))
          )}
        </div>
      </div>

      {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
      {ficha}
      {modalSucursal}
      {dialogoAlta}
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
  expandido,
  onAbrir,
  onToggle,
  onPrefetch,
}: {
  n: NegocioFila;
  cols: string;
  mostrarVendedor: boolean;
  expandido: boolean;
  onAbrir: () => void;
  onToggle: () => void;
  onPrefetch: () => void;
}) {
  const ciudad = ciudadVisible(n.ciudad);
  const tieneSecundarias = n.totalSucursales > 1;
  return (
    // div (no <button>) para poder anidar el botón de expandir sin HTML inválido.
    <div
      role="button"
      tabIndex={0}
      data-testid={`negocio-fila-${n.id}`}
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
        <AvatarNegocio nombre={n.nombre} logoUrl={n.logoUrl} tam={38} />
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
      {/* Sucursales: "No" o "Sí" con flecha de expandir (no abre el modal del negocio). */}
      <span>
        {tieneSecundarias ? (
          <button
            type="button"
            data-testid={`negocio-sucursales-${n.id}`}
            aria-expanded={expandido}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="inline-flex items-center gap-1 rounded-[8px] border border-borde px-2 py-1 text-[12px] font-semibold text-texto-2 transition hover:bg-superficie-2"
          >
            <ChevronRight size={13} className={`shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            Sí
          </button>
        ) : (
          <span className="text-[12px] text-texto-4">No</span>
        )}
      </span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

/** Filas de sucursales SECUNDARIAS desplegadas bajo la fila del negocio (escritorio). */
function FilasSucursales({
  negocioId,
  cols,
  mostrarVendedor,
  onAbrir,
}: {
  negocioId: string;
  cols: string;
  mostrarVendedor: boolean;
  onAbrir: (s: SucursalFila) => void;
}) {
  const { data, isLoading } = useSucursalesNegocio(negocioId, true);
  const secundarias = (data ?? []).filter((s) => !s.esPrincipal);

  if (isLoading) {
    return (
      <div className="border-b border-borde bg-superficie-2 px-3 py-2 pl-14 text-[12px] text-texto-3">
        Cargando sucursales…
      </div>
    );
  }
  if (secundarias.length === 0) {
    return (
      <div className="border-b border-borde bg-superficie-2 px-3 py-2 pl-14 text-[12px] text-texto-4">
        Sin sucursales adicionales.
      </div>
    );
  }
  return (
    <>
      {secundarias.map((s) => (
        <button
          key={s.id}
          type="button"
          data-testid={`sucursal-fila-${s.id}`}
          onClick={() => onAbrir(s)}
          className="grid w-full items-center gap-3.5 border-b border-borde bg-superficie-2 px-3 py-2.5 text-left transition hover:bg-marca-suave"
          style={{ gridTemplateColumns: cols }}
        >
          <span className="flex min-w-0 items-center gap-2 pl-8">
            <CornerDownRight size={14} className="shrink-0 text-texto-4" />
            <span className="flex min-w-0 flex-col">
              <span className="inline-flex items-center gap-1.5 truncate text-[13px] font-medium text-texto-2">
                {s.nombre}
                {!s.activa && (
                  <span className="txt-badge rounded-full bg-superficie px-1.5 py-0.5 text-[10px] font-semibold text-texto-4">Inactiva</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-texto-3">
                <MapPin size={11} className="shrink-0" />
                {[s.ciudad, s.regionNombre].filter(Boolean).join(' · ') || 'Sin ubicación'}
              </span>
            </span>
          </span>
          {mostrarVendedor && <span />}
          <span />
          <span />
          <span />
          <span />
          <span className="flex justify-end text-texto-4"><ChevronRight size={15} /></span>
        </button>
      ))}
    </>
  );
}

function CardNegocio({
  n,
  abriendo,
  expandido,
  onAbrir,
  onToggle,
  onPrefetch,
}: {
  n: NegocioFila;
  abriendo: boolean;
  expandido: boolean;
  onAbrir: () => void;
  onToggle: () => void;
  onPrefetch: () => void;
}) {
  const ciudad = ciudadVisible(n.ciudad);
  const secundarias = n.totalSucursales - 1;
  return (
    <div className="overflow-hidden rounded-[14px] border border-borde bg-superficie">
      {/* Cuerpo clickeable (abre el modal del negocio). div, no <button>, para poder
          anidar el botón de expandir sucursales sin HTML inválido. */}
      <div
        role="button"
        tabIndex={0}
        data-testid={`negocio-card-${n.id}`}
        onClick={onAbrir}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAbrir();
          }
        }}
        onTouchStart={onPrefetch}
        onMouseEnter={onPrefetch}
        className="flex items-center gap-3 p-3 text-left transition active:bg-marca-suave"
      >
        <AvatarNegocio nombre={n.nombre} logoUrl={n.logoUrl} tam={42} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14.5px] font-semibold text-texto">{n.nombre}</span>
          <span className="flex items-center gap-2 text-[12px] text-texto-3">
            <span className="truncate">{ciudad ?? 'Sin ciudad'}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} small />
          {abriendo ? (
            <Loader2 size={16} className="animate-spin text-marca" />
          ) : (
            <ChevronRight size={16} className="text-texto-4" />
          )}
        </span>
      </div>

      {/* Pie: control de sucursales secundarias (solo si tiene). */}
      {secundarias > 0 && (
        <button
          type="button"
          data-testid={`negocio-sucursales-${n.id}`}
          aria-expanded={expandido}
          onClick={onToggle}
          className="flex w-full items-center justify-between border-t border-borde px-3 py-2 text-left transition active:bg-marca-suave"
        >
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-texto-2">
            <Store size={13} className="shrink-0 text-texto-3" />
            {secundarias} {secundarias === 1 ? 'sucursal' : 'sucursales'}
          </span>
          <ChevronRight size={15} className={`shrink-0 text-texto-4 transition-transform ${expandido ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  );
}

/** Sucursales secundarias desplegadas bajo la card (móvil). */
function SucursalesMovil({ negocioId, onAbrir }: { negocioId: string; onAbrir: (s: SucursalFila) => void }) {
  const { data, isLoading } = useSucursalesNegocio(negocioId, true);
  const secundarias = (data ?? []).filter((s) => !s.esPrincipal);

  if (isLoading) {
    return <div className="pl-4 text-[12px] text-texto-3">Cargando sucursales…</div>;
  }
  if (secundarias.length === 0) {
    return <div className="pl-4 text-[12px] text-texto-4">Sin sucursales adicionales.</div>;
  }
  return (
    <div className="flex flex-col gap-2 pl-4">
      {secundarias.map((s) => (
        <button
          key={s.id}
          type="button"
          data-testid={`sucursal-card-${s.id}`}
          onClick={() => onAbrir(s)}
          className="flex items-center gap-2.5 rounded-[12px] border border-borde bg-superficie-2 p-2.5 text-left transition active:bg-marca-suave"
        >
          <CornerDownRight size={15} className="shrink-0 text-texto-4" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 truncate text-[13.5px] font-medium text-texto">
              {s.nombre}
              {!s.activa && (
                <span className="txt-badge rounded-full bg-superficie px-1.5 py-0.5 text-[10px] font-semibold text-texto-4">Inactiva</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] text-texto-3">
              <MapPin size={11} className="shrink-0" />
              {[s.ciudad, s.regionNombre].filter(Boolean).join(' · ') || 'Sin ubicación'}
            </span>
          </span>
          <ChevronRight size={15} className="shrink-0 text-texto-4" />
        </button>
      ))}
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
      <span data-testid="negocios-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="negocios-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="negocios-siguiente"
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
        <Store size={28} className="mx-auto mb-3 text-texto-4" />
        <p className={`text-sm ${tono === 'error' ? 'text-peligro' : 'text-texto-3'}`}>{texto}</p>
      </div>
    </div>
  );
}

export default SeccionNegocios;
