/**
 * SeccionUsuarios.tsx
 * ====================
 * Sección Usuarios del Panel (VER, solo lectura) — mesa de ayuda + moderación de personas.
 * Calcada de SeccionNegocios.
 *   - Escritorio (lg:+): buscador + chips de estado con conteos · filtro de tipo y
 *     "Ordenar" (al nivel de los chips) + tabla + paginación.
 *   - Móvil: buscador, chips de estado (carrusel), filtro de tipo y tarjetas.
 *
 * La acota el backend (super + gerente ven todos; vendedor recibe 403 y no la ve en el menú).
 * No hay alta de usuarios (se registran solos). Las acciones (soporte + moderación) son Fase 2.
 *
 * Ubicación: apps/admin/src/components/usuarios/SeccionUsuarios.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Users, SlidersHorizontal, ArrowUpDown, MapPin } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useContadorPanel } from '../../stores/useContadorPanel';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useUsuariosLista, usePrefetchUsuario, useUsuariosPorCiudad } from '../../hooks/queries/useUsuariosAdmin';
import { CIUDAD_SIN } from '../../services/usuariosService';
import type { OrdenUsuarios, UsuarioFila, ConteosEstado, CiudadConteo } from '../../services/usuariosService';
import { metaEstadoUsuario, BadgeEstadoUsuario } from './estadoUsuario';
import { AvatarUsuario } from './avataresUsuario';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { FichaUsuario } from './FichaUsuario';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const POR_PAGINA = 20;

const TABS_ESTADO = [
  { id: '', label: 'Todos' },
  { id: 'activo', label: 'Activo' },
  { id: 'suspendido', label: 'Suspendido' },
  { id: 'inactivo', label: 'Inactivo' },
] as const;

const OPCIONES_TIPO: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'usuario', etiqueta: 'Usuario' },
  { valor: 'comerciante', etiqueta: 'Dueño' },
  { valor: 'gerente_sucursal', etiqueta: 'Gerente de sucursal' },
  { valor: 'vendedor', etiqueta: 'Vendedor' },
  { valor: 'gerente', etiqueta: 'Gerente regional' },
];

const OPCIONES_ORDEN: { valor: OrdenUsuarios; etiqueta: string }[] = [
  { valor: 'nombre_az', etiqueta: 'Nombre (A–Z)' },
  { valor: 'nombre_za', etiqueta: 'Nombre (Z–A)' },
  { valor: 'registro_recientes', etiqueta: 'Registro (recientes)' },
  { valor: 'registro_antiguos', etiqueta: 'Registro (antiguos)' },
  { valor: 'ultima_conexion', etiqueta: 'Última conexión' },
  { valor: 'estado', etiqueta: 'Estado' },
];

const CONTEOS_CERO: ConteosEstado = { total: 0, porEstado: [] };
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '').replace(/ ([a-z])/i, (_m, l: string) => ` ${l.toUpperCase()}`);
}

const ROL_EQUIPO_LABEL: Record<string, string> = { superadmin: 'SuperAdmin', gerente: 'Gerente regional', vendedor: 'Vendedor' };

/** Rol principal de la cuenta para la columna "Rol" (prioridad: equipo > vendedor > dueño > usuario). */
function rolPrincipal(n: UsuarioFila): string {
  if (n.rolEquipo) return ROL_EQUIPO_LABEL[n.rolEquipo] ?? n.rolEquipo;
  if (n.esGerenteSucursal) return 'Gerente de sucursal';
  if (n.esDueno) return 'Dueño';
  return 'Usuario';
}

export function SeccionUsuarios() {
  const esEscritorio = useEsEscritorio();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [ciudad, setCiudad] = useState(''); // ciudad_id del catálogo, o CIUDAD_SIN ('sin-ciudad')
  const [orden, setOrden] = useState<OrdenUsuarios>('nombre_az');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<UsuarioFila | null>(null);
  const prefetchUsuario = usePrefetchUsuario();

  // Registra el contenedor scrolleable (vista móvil) para el auto-ocultado de la barra inferior.
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
  }, [busquedaDeb, estado, tipo, ciudad, orden]);

  const filtros = useMemo(
    () => ({
      busqueda: busquedaDeb || undefined,
      estado: estado || undefined,
      tipo: tipo || undefined,
      ciudadId: ciudad || undefined,
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [busquedaDeb, estado, tipo, ciudad, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useUsuariosLista(filtros);
  const { data: porCiudad } = useUsuariosPorCiudad();

  // Publica el total YA FILTRADO para el badge del menú; al salir, se limpia para que el badge
  // vuelva al conteo general.
  const setContadorUsuarios = useContadorPanel((s) => s.setUsuarios);
  useEffect(() => {
    if (data) setContadorUsuarios(data.total);
  }, [data, setContadorUsuarios]);
  useEffect(() => () => setContadorUsuarios(null), [setContadorUsuarios]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(busquedaDeb || estado || tipo || ciudad);

  // ── Estado de filtros (para EstadoSeccion) ───────────────────────────────────
  // hayFiltrosActivos: true si el usuario escribió en la búsqueda o movió algún filtro
  // LOCAL (estado, tipo u orden) fuera de su default. La lente de región global NO cuenta:
  // es navegación del header, no un filtro de esta lista.
  const hayFiltrosActivos = !!(busqueda.trim() || estado || tipo || ciudad) || orden !== 'nombre_az';

  // limpiarFiltros: regresa los filtros LOCALES a su default (búsqueda vacía, estado "Todos",
  // tipo "Todos", ciudad "Todas", orden "Nombre A–Z"). No toca la lente de región.
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstado('');
    setTipo('');
    setCiudad('');
    setOrden('nombre_az');
  };

  const conteoDe = (id: string): number =>
    id === '' ? conteos.total : (conteos.porEstado.find((c) => c.estado === id)?.total ?? 0);

  // El dropdown de roles se acopla a la visibilidad: un gerente no ve gerentes (ni superadmin),
  // así que el filtro "Gerente" no le aplica y se le oculta. El superadmin ve todas las opciones.
  const rolPanel = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const opcionesTipo = useMemo(
    () => (rolPanel === 'gerente' ? OPCIONES_TIPO.filter((o) => o.valor !== 'gerente') : OPCIONES_TIPO),
    [rolPanel],
  );

  const etiquetaTipo = OPCIONES_TIPO.find((o) => o.valor === tipo)?.etiqueta ?? 'Todos';
  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Nombre (A–Z)';

  // Opciones del filtro de ciudad, pobladas desde el desglose por-ciudad (con su conteo).
  // "Sin ciudad" primero (suele ser el grupo grande), luego las ciudades por total desc.
  const opcionesCiudad: OpcionMenu[] = useMemo(() => {
    const grupos = porCiudad ?? [];
    const sinCiudad = grupos.find((g) => g.ciudadId === null);
    const conCiudad = grupos.filter((g) => g.ciudadId !== null);
    return [
      { valor: '', etiqueta: 'Todas las ciudades' },
      ...(sinCiudad ? [{ valor: CIUDAD_SIN, etiqueta: `Sin ciudad · ${sinCiudad.total}` }] : []),
      ...conCiudad.map((g) => ({
        valor: g.ciudadId as string,
        etiqueta: `${g.ciudad} · ${g.total}`,
        adorno: <MapPin size={16} className="text-texto-3" />,
      })),
    ];
  }, [porCiudad]);

  const etiquetaCiudad = useMemo(() => {
    if (!ciudad) return 'Todas las ciudades';
    if (ciudad === CIUDAD_SIN) return 'Sin ciudad';
    return (porCiudad ?? []).find((g) => g.ciudadId === ciudad)?.ciudad ?? 'Ciudad';
  }, [ciudad, porCiudad]);

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="usuarios-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, correo o teléfono…"
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

  const filtroTipo = (
    <MenuFiltro
      testid="usuarios-filtro-tipo"
      icono={<SlidersHorizontal size={16} />}
      etiquetaBoton={etiquetaTipo}
      opciones={opcionesTipo}
      valor={tipo}
      onCambiar={setTipo}
      tam="chip"
    />
  );

  const filtroCiudad = (
    <MenuFiltro
      testid="usuarios-filtro-ciudad"
      icono={<MapPin size={16} />}
      etiquetaBoton={etiquetaCiudad}
      opciones={opcionesCiudad}
      valor={ciudad}
      onCambiar={setCiudad}
      tam="chip"
    />
  );

  const ficha = seleccionado ? (
    <FichaUsuario previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">{buscador}</div>
          <MenuFiltro
            testid="usuarios-filtro-ciudad"
            icono={<MapPin size={18} />}
            etiquetaBoton={etiquetaCiudad}
            opciones={opcionesCiudad}
            valor={ciudad}
            onCambiar={setCiudad}
            soloIcono
            alineacion="derecha"
          />
          <MenuFiltro
            testid="usuarios-filtro-tipo"
            icono={<SlidersHorizontal size={18} />}
            etiquetaBoton={etiquetaTipo}
            opciones={opcionesTipo}
            valor={tipo}
            onCambiar={setTipo}
            soloIcono
            alineacion="derecha"
          />
        </div>

        <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS_ESTADO.map((t) => {
            const activo = estado === t.id;
            const color = t.id ? metaEstadoUsuario(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`usuarios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstado(t.id)}
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

        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={Users} titulo="Cargando usuarios…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={Users}
              titulo="No se pudieron cargar los usuarios."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={Users}
                titulo="Sin resultados"
                descripcion="Ningún usuario coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={Users} titulo="Aún no hay usuarios" />
            )
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((n) => (
                <CardUsuario key={n.id} n={n} onAbrir={() => setSeleccionado(n)} onPrefetch={() => prefetchUsuario(n.id)} />
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
  const cols = 'minmax(220px,2.4fr) 1.3fr 1fr 1.1fr 0.95fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Buscador */}
      <div className="mb-3 max-w-[380px] shrink-0">{buscador}</div>

      {/* Subhead: chips de estado (izq) + total y ordenar (der) */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS_ESTADO.map((t) => {
            const activo = estado === t.id;
            const color = t.id ? metaEstadoUsuario(t.id).color : 'var(--panel-brand)';
            return (
              <button
                key={t.id || 'todos'}
                type="button"
                data-testid={`usuarios-filtro-estado-${t.id || 'todos'}`}
                onClick={() => setEstado(t.id)}
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
          <span className="text-[13px] text-texto-3" data-testid="usuarios-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'usuario' : 'usuarios'}
            {hayFiltro ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
          {filtroCiudad}
          {filtroTipo}
          <MenuFiltro
            testid="usuarios-orden"
            icono={<ArrowUpDown size={15} />}
            etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
            opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            valor={orden}
            onCambiar={(v) => setOrden(v as OrdenUsuarios)}
            anchoMenu={210}
            tam="chip"
          />
        </div>
      </div>

      {/* Métrica: usuarios por ciudad (clic en un chip filtra la lista) */}
      <ResumenCiudades grupos={porCiudad} ciudadActiva={ciudad} onSelect={setCiudad} />

      {/* Tabla */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Última conexión</span>
          <span>Registro</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={Users} titulo="Cargando usuarios…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={Users}
              titulo="No se pudieron cargar los usuarios."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={Users}
                titulo="Sin resultados"
                descripcion="Ningún usuario coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={Users} titulo="Aún no hay usuarios" />
            )
          ) : (
            items.map((n) => (
              <FilaUsuario key={n.id} n={n} cols={cols} onAbrir={() => setSeleccionado(n)} onPrefetch={() => prefetchUsuario(n.id)} />
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

/**
 * Métrica "usuarios por ciudad" (solo escritorio): tira densa de chips con el conteo
 * de cada ciudad. Clic en un chip filtra la lista por esa ciudad (o lo limpia si ya
 * estaba activo). Los grupos vienen ya ordenados del backend (total desc, "Sin ciudad"
 * al final). Sobrio por tokens del Panel: sin círculos pastel, total en peso semibold.
 */
function ResumenCiudades({
  grupos,
  ciudadActiva,
  onSelect,
}: {
  grupos: CiudadConteo[] | undefined;
  ciudadActiva: string;
  onSelect: (valor: string) => void;
}) {
  if (!grupos || grupos.length === 0) return null;

  return (
    <div className="mb-2 flex shrink-0 items-center gap-2.5">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Por ciudad</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
        {grupos.map((g) => {
          const valor = g.ciudadId ?? CIUDAD_SIN;
          const activo = ciudadActiva === valor;
          return (
            <button
              key={valor}
              type="button"
              data-testid={`usuarios-ciudad-chip-${valor}`}
              onClick={() => onSelect(activo ? '' : valor)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition ${
                activo
                  ? 'border-marca/40 bg-marca-suave text-marca'
                  : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
              }`}
            >
              {g.ciudadId && <MapPin size={12} className="shrink-0 opacity-70" />}
              <span className="max-w-[150px] truncate">{g.ciudad}</span>
              <span className="font-semibold">{g.total}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilaUsuario({
  n,
  cols,
  onAbrir,
  onPrefetch,
}: {
  n: UsuarioFila;
  cols: string;
  onAbrir: () => void;
  onPrefetch: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`usuario-fila-${n.id}`}
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
        <AvatarUsuario nombre={n.nombre || n.correo} avatarUrl={n.avatarUrl} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{n.nombre || '(Sin nombre)'}</span>
          <span className="truncate text-[13px] text-texto-3">{n.correo}</span>
        </span>
      </span>
      <span className="min-w-0 truncate">
        <span className={`text-[13px] font-medium ${n.rolEquipo ? 'text-marca' : 'text-texto-2'}`}>{rolPrincipal(n)}</span>
      </span>
      <span><BadgeEstadoUsuario estado={n.estado} small /></span>
      <span className={`text-[13px] ${n.ultimaConexion ? 'text-texto-2' : 'text-texto-4'}`}>{fechaCorta(n.ultimaConexion)}</span>
      <span className="text-[13px] text-texto-2">{fechaCorta(n.createdAt)}</span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardUsuario({ n, onAbrir, onPrefetch }: { n: UsuarioFila; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`usuario-card-${n.id}`}
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
      <AvatarUsuario nombre={n.nombre || n.correo} avatarUrl={n.avatarUrl} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{n.nombre || '(Sin nombre)'}</span>
        <span className="truncate text-[12.5px] text-texto-3">{n.correo}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeEstadoUsuario estado={n.estado} small />
        <ChevronRight size={16} className="text-texto-4" />
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
      <span data-testid="usuarios-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="usuarios-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="usuarios-siguiente"
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

export default SeccionUsuarios;
