/**
 * SeccionCiudades.tsx
 * ===================
 * Módulo Ciudades del Panel. Solo superadmin (el backend lo acota). Tres pestañas:
 *   - Mapa:     mapa interactivo de México; clic en grises = alta de nuevas, clic en
 *               azules = seleccionar para agrupar en región (multi-selección).
 *   - Ciudades: buscador + filtro de región + chips de actividad + tabla / cards, con
 *               acciones por fila (activar/desactivar, asignar región).
 *   - Regiones: lista de regiones con su # de ciudades; crear región + editar por fila.
 *
 * Calcada de SeccionUsuarios. Tokens del Panel (Tokens_Panel.md).
 *
 * Ubicación: apps/admin/src/components/ciudades/SeccionCiudades.tsx
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, MapPin, Map as MapIcon, Layers, Plus, Pencil, Power, PowerOff } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import {
  useCiudadesLista,
  useRegionesCatalogo,
  useCrearCiudadesMultiple,
  useAsignarRegionMultiple,
  useCrearRegion,
  useEditarRegion,
  useCambiarActivaCiudad,
  useAsignarRegionCiudad,
} from '../../hooks/queries/useCiudadesAdmin';
import { REGION_SIN, type CiudadCatalogo, type FiltroActiva, type RegionConConteo } from '../../services/ciudadesService';
import { claveCruceCiudad } from '../../utils/texto';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { MenuAcciones } from './MenuAcciones';
import type { FeatureCiudad } from './MapaCiudades';
import { DialogoMapaAccion } from './DialogoMapaAccion';
import { DialogoRegion } from './DialogoRegion';
import { DialogoAsignarRegion } from './DialogoAsignarRegion';

// Lazy: maplibre-gl (~800 KB) solo se carga al abrir la pestaña Mapa, no en el resto del Panel.
const MapaCiudades = lazy(() => import('./MapaCiudades').then((m) => ({ default: m.MapaCiudades })));

type TabPrincipal = 'mapa' | 'ciudades' | 'regiones';

const TABS_ACTIVA: { id: FiltroActiva; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'activas', label: 'Activas' },
  { id: 'inactivas', label: 'Inactivas' },
];

const VERDE = '#16a34a';

export function SeccionCiudades() {
  const esEscritorio = useEsEscritorio();

  const [tab, setTab] = useState<TabPrincipal>('mapa');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [activa, setActiva] = useState<FiltroActiva>('todas');
  const [region, setRegion] = useState(''); // '' = todas · REGION_SIN = sin región · uuid

  // Selección del mapa: clave INEGI → feature.
  const [seleccion, setSeleccion] = useState<Map<string, FeatureCiudad>>(new Map());
  const [dialogo, setDialogo] = useState<'alta' | 'agrupar' | null>(null);
  // Diálogos de acciones por fila.
  const [dialogoRegion, setDialogoRegion] = useState<{ modo: 'crear' | 'editar'; region: RegionConConteo | null } | null>(null);
  const [ciudadRegion, setCiudadRegion] = useState<CiudadCatalogo | null>(null);

  // Registra el contenedor scrolleable (vista móvil) para el auto-ocultado de la barra inferior.
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio || tab === 'mapa' ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl, tab]);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const filtros = useMemo(
    () => ({ busqueda: busquedaDeb || undefined, regionId: region || undefined, activa }),
    [busquedaDeb, region, activa],
  );

  const { data: ciudades, isLoading, isError, isFetching } = useCiudadesLista(filtros);
  const { data: regiones } = useRegionesCatalogo();
  // Catálogo completo (sin filtros) para el cruce del mapa: qué ciudades ya están.
  const { data: todasCatalogo } = useCiudadesLista({});

  const crearMultiple = useCrearCiudadesMultiple();
  const agrupar = useAsignarRegionMultiple();
  const crearRegion = useCrearRegion();
  const editarRegion = useEditarRegion();
  const cambiarActiva = useCambiarActivaCiudad();
  const asignarRegionUna = useAsignarRegionCiudad();

  const items = ciudades ?? [];
  const total = items.length;
  const hayFiltrosActivos = !!(busqueda.trim() || region) || activa !== 'todas';

  const limpiarFiltros = () => {
    setBusqueda('');
    setRegion('');
    setActiva('todas');
  };

  // Cruce ciudad↔catálogo para el mapa (claveCruce → { id }).
  const catalogoPorClave = useMemo(() => {
    const m = new Map<string, { id: string }>();
    for (const c of todasCatalogo ?? []) m.set(claveCruceCiudad(c.nombre, c.estado), { id: c.id });
    return m;
  }, [todasCatalogo]);

  const seleccionClaves = useMemo(() => new Set(seleccion.keys()), [seleccion]);
  const seleccionados = useMemo(() => [...seleccion.values()], [seleccion]);
  const nuevasSel = seleccionados.filter((f) => !f.enCatalogo);
  const existentesSel = seleccionados.filter((f) => f.enCatalogo);

  const onToggle = (f: FeatureCiudad) =>
    setSeleccion((prev) => {
      const m = new Map(prev);
      if (m.has(f.clave)) m.delete(f.clave);
      else m.set(f.clave, f);
      return m;
    });

  const quitarDeSeleccion = (claves: string[]) =>
    setSeleccion((prev) => {
      const m = new Map(prev);
      for (const c of claves) m.delete(c);
      return m;
    });

  const confirmarAccion = async (regionId: string | null) => {
    try {
      if (dialogo === 'alta') {
        await crearMultiple.mutateAsync({
          ciudades: nuevasSel.map((f) => ({ nombre: f.nombre, estado: f.estado, lat: f.lat, lng: f.lng })),
          regionId,
        });
        quitarDeSeleccion(nuevasSel.map((f) => f.clave));
      } else if (dialogo === 'agrupar') {
        await agrupar.mutateAsync({ ciudadIds: existentesSel.map((f) => f.catalogoId), regionId });
        quitarDeSeleccion(existentesSel.map((f) => f.clave));
      }
      setDialogo(null);
    } catch {
      /* el toast de error lo muestra el hook; dejamos el diálogo abierto para reintentar */
    }
  };

  const guardarRegion = async (datos: { nombre: string; activa?: boolean }) => {
    try {
      if (dialogoRegion?.modo === 'editar' && dialogoRegion.region) {
        await editarRegion.mutateAsync({ id: dialogoRegion.region.id, datos });
      } else {
        await crearRegion.mutateAsync(datos.nombre);
      }
      setDialogoRegion(null);
    } catch {
      /* toast del hook */
    }
  };

  const guardarRegionCiudad = async (regionId: string | null) => {
    if (!ciudadRegion) return;
    try {
      await asignarRegionUna.mutateAsync({ id: ciudadRegion.id, regionId });
      setCiudadRegion(null);
    } catch {
      /* toast del hook (incluye el 409 del guard "una región") */
    }
  };

  // Opciones del filtro de región (tab Ciudades).
  const opcionesRegion: OpcionMenu[] = useMemo(() => {
    const lista = regiones ?? [];
    return [
      { valor: '', etiqueta: 'Todas las regiones' },
      { valor: REGION_SIN, etiqueta: 'Sin región' },
      ...lista.map((r) => ({ valor: r.id, etiqueta: `${r.nombre} · ${r.totalCiudades}`, adorno: <MapIcon size={16} className="text-texto-3" /> })),
    ];
  }, [regiones]);

  const etiquetaRegion = useMemo(() => {
    if (!region) return 'Todas las regiones';
    if (region === REGION_SIN) return 'Sin región';
    return (regiones ?? []).find((r) => r.id === region)?.nombre ?? 'Región';
  }, [region, regiones]);

  // ── Controles compartidos ───────────────────────────────────────────────────
  const pestanas = (
    <div className="inline-flex shrink-0 rounded-full border border-borde bg-superficie-2 p-0.5">
      {([['mapa', 'Mapa', MapIcon], ['ciudades', 'Ciudades', MapPin], ['regiones', 'Regiones', Layers]] as const).map(([id, label, Icono]) => (
        <button
          key={id}
          type="button"
          data-testid={`ciudades-tab-${id}`}
          onClick={() => setTab(id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
            tab === id ? 'bg-marca text-marca-contraste' : 'text-texto-2 hover:text-texto'
          }`}
        >
          <Icono size={14} />
          {label}
        </button>
      ))}
    </div>
  );

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="ciudades-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por ciudad o estado…"
        className="w-full rounded-full border border-borde bg-superficie-2 py-2.5 pl-10 pr-9 text-[13.5px] font-medium text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
      />
      {busqueda && (
        <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca">
          <X size={15} />
        </button>
      )}
    </div>
  );

  const chipsActividad = (
    <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
      {TABS_ACTIVA.map((t) => {
        const act = activa === t.id;
        return (
          <button
            key={t.id}
            type="button"
            data-testid={`ciudades-filtro-activa-${t.id}`}
            onClick={() => setActiva(t.id)}
            className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
              act ? 'border-marca/40 bg-marca-suave text-marca' : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const filtroRegion = (
    <MenuFiltro testid="ciudades-filtro-region" icono={<MapIcon size={16} />} etiquetaBoton={etiquetaRegion} opciones={opcionesRegion} valor={region} onCambiar={setRegion} anchoMenu={220} tam="chip" />
  );

  // ── Tab Ciudades (lista) ─────────────────────────────────────────────────────
  const cols = 'minmax(180px,2fr) 1.2fr 1.4fr 0.9fr 36px';
  const onActivarCiudad = (c: CiudadCatalogo) => cambiarActiva.mutate({ id: c.id, activa: !c.activa });
  const contenidoCiudades = isLoading ? (
    <EstadoSeccion variante="cargando" icono={MapPin} titulo="Cargando ciudades…" />
  ) : isError ? (
    <EstadoSeccion variante="error" icono={MapPin} titulo="No se pudieron cargar las ciudades." descripcion="Revisa tu conexión e inténtalo de nuevo." />
  ) : items.length === 0 ? (
    hayFiltrosActivos ? (
      <EstadoSeccion icono={MapPin} titulo="Sin resultados" descripcion="Ninguna ciudad coincide con tu búsqueda o filtros." accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }} />
    ) : (
      <EstadoSeccion icono={MapPin} titulo="Aún no hay ciudades" />
    )
  ) : esEscritorio ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
      <div className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4" style={{ gridTemplateColumns: cols }}>
        <span>Ciudad</span>
        <span>Estado</span>
        <span>Región</span>
        <span>Actividad</span>
        <span />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.map((c) => <FilaCiudad key={c.id} c={c} cols={cols} onActivar={onActivarCiudad} onAsignarRegion={setCiudadRegion} />)}
      </div>
    </div>
  ) : (
    <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-2.5">{items.map((c) => <CardCiudad key={c.id} c={c} onActivar={onActivarCiudad} onAsignarRegion={setCiudadRegion} />)}</div>
    </div>
  );

  // ── Tab Regiones ─────────────────────────────────────────────────────────────
  const listaRegiones = regiones ?? [];
  const colsReg = '2fr 1fr 0.9fr 36px';
  const abrirEditarRegion = (r: RegionConConteo) => setDialogoRegion({ modo: 'editar', region: r });
  const contenidoRegiones =
    regiones === undefined ? (
      <EstadoSeccion variante="cargando" icono={Layers} titulo="Cargando regiones…" />
    ) : listaRegiones.length === 0 ? (
      <EstadoSeccion icono={Layers} titulo="Aún no hay regiones" descripcion="Crea una región para empezar a agrupar ciudades." accion={{ etiqueta: 'Crear región', onClick: () => setDialogoRegion({ modo: 'crear', region: null }) }} />
    ) : esEscritorio ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
        <div className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4" style={{ gridTemplateColumns: colsReg }}>
          <span>Región</span>
          <span>Ciudades</span>
          <span>Actividad</span>
          <span />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{listaRegiones.map((r) => <FilaRegion key={r.id} r={r} cols={colsReg} onEditar={abrirEditarRegion} />)}</div>
      </div>
    ) : (
      <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2.5">{listaRegiones.map((r) => <CardRegion key={r.id} r={r} onEditar={abrirEditarRegion} />)}</div>
      </div>
    );

  // ── Tab Mapa ─────────────────────────────────────────────────────────────────
  const accionando = crearMultiple.isPending || agrupar.isPending;
  const contenidoMapa = (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<div className="grid h-full place-items-center rounded-[12px] border border-borde text-[13px] text-texto-3">Cargando mapa…</div>}>
        <MapaCiudades catalogoPorClave={catalogoPorClave} seleccionadas={seleccionClaves} onToggle={onToggle} />
      </Suspense>
      {seleccion.size > 0 && (
        <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-[12px] border border-borde-fuerte bg-superficie/97 px-3 py-2.5 shadow-pop-panel lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2">
          <span className="text-[13px] text-texto-2" data-testid="ciudades-mapa-conteo">
            <b className="font-semibold text-texto">{seleccion.size}</b> seleccionada{seleccion.size === 1 ? '' : 's'}
            {nuevasSel.length > 0 && <span className="text-texto-3"> · {nuevasSel.length} nueva{nuevasSel.length === 1 ? '' : 's'}</span>}
            {existentesSel.length > 0 && <span className="text-texto-3"> · {existentesSel.length} en catálogo</span>}
          </span>
          {nuevasSel.length > 0 && (
            <button type="button" data-testid="ciudades-mapa-agregar" onClick={() => setDialogo('alta')} className="inline-flex items-center gap-1.5 rounded-full bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition hover:opacity-90">
              <MapPin size={14} /> Agregar {nuevasSel.length} nueva{nuevasSel.length === 1 ? '' : 's'}
            </button>
          )}
          {existentesSel.length > 0 && (
            <button type="button" data-testid="ciudades-mapa-agrupar" onClick={() => setDialogo('agrupar')} className="inline-flex items-center gap-1.5 rounded-full border border-marca/40 bg-marca-suave px-3 py-1.5 text-[12.5px] font-semibold text-marca transition hover:bg-marca hover:text-marca-contraste">
              <Layers size={14} /> Agrupar {existentesSel.length}
            </button>
          )}
          <button type="button" data-testid="ciudades-mapa-limpiar" onClick={() => setSeleccion(new Map())} className="inline-flex items-center gap-1 rounded-full border border-borde px-2.5 py-1.5 text-[12.5px] font-medium text-texto-3 transition hover:bg-marca-suave">
            <X size={13} /> Limpiar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Cabecera: pestañas + contadores/acciones */}
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        {pestanas}
        {tab === 'ciudades' && (
          <span className="text-[13px] text-texto-3" data-testid="ciudades-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'ciudad' : 'ciudades'}
            {hayFiltrosActivos ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
        )}
        {tab === 'regiones' && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-texto-3" data-testid="regiones-total">
              <b className="font-semibold text-texto">{listaRegiones.length}</b> {listaRegiones.length === 1 ? 'región' : 'regiones'}
            </span>
            <button type="button" data-testid="crear-region" onClick={() => setDialogoRegion({ modo: 'crear', region: null })} className="inline-flex items-center gap-1.5 rounded-full bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition hover:opacity-90">
              <Plus size={14} /> Crear región
            </button>
          </div>
        )}
        {tab === 'mapa' && <span className="hidden text-[12.5px] text-texto-4 lg:inline">Clic en un punto para seleccionar · zoom para ver nombres</span>}
      </div>

      {tab === 'mapa' ? (
        contenidoMapa
      ) : tab === 'ciudades' ? (
        <>
          <div className="mb-2.5 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-[380px]">{buscador}</div>
            <div className="flex items-center justify-between gap-2 lg:ml-auto">
              {chipsActividad}
              {filtroRegion}
            </div>
          </div>
          {contenidoCiudades}
        </>
      ) : (
        contenidoRegiones
      )}

      <DialogoMapaAccion
        abierto={dialogo !== null}
        modo={dialogo ?? 'alta'}
        cantidad={dialogo === 'alta' ? nuevasSel.length : existentesSel.length}
        regiones={listaRegiones}
        cargando={accionando}
        onCerrar={() => setDialogo(null)}
        onConfirmar={confirmarAccion}
      />

      <DialogoRegion
        abierto={dialogoRegion !== null}
        modo={dialogoRegion?.modo ?? 'crear'}
        region={dialogoRegion?.region ?? null}
        cargando={crearRegion.isPending || editarRegion.isPending}
        onCerrar={() => setDialogoRegion(null)}
        onGuardar={guardarRegion}
      />

      <DialogoAsignarRegion
        abierto={ciudadRegion !== null}
        ciudad={ciudadRegion}
        regiones={listaRegiones}
        cargando={asignarRegionUna.isPending}
        onCerrar={() => setCiudadRegion(null)}
        onGuardar={guardarRegionCiudad}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function BadgeActiva({ activa }: { activa: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: activa ? VERDE : 'var(--panel-text-4)' }}>
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: activa ? VERDE : 'var(--panel-text-4)' }} />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function ChipRegion({ nombre }: { nombre: string | null }) {
  if (!nombre) return <span className="text-[13px] text-texto-4">Sin región</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-texto-2">
      <MapIcon size={13} className="shrink-0 text-texto-4" />
      {nombre}
    </span>
  );
}

function accionesCiudad(c: CiudadCatalogo, onActivar: (c: CiudadCatalogo) => void, onAsignarRegion: (c: CiudadCatalogo) => void) {
  return [
    { etiqueta: c.activa ? 'Desactivar' : 'Activar', icono: c.activa ? <PowerOff size={15} /> : <Power size={15} />, onClick: () => onActivar(c) },
    { etiqueta: c.regionId ? 'Cambiar región' : 'Asignar región', icono: <MapIcon size={15} />, onClick: () => onAsignarRegion(c) },
  ];
}

function FilaCiudad({ c, cols, onActivar, onAsignarRegion }: { c: CiudadCatalogo; cols: string; onActivar: (c: CiudadCatalogo) => void; onAsignarRegion: (c: CiudadCatalogo) => void }) {
  return (
    <div data-testid={`ciudad-fila-${c.id}`} className="grid w-full items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave" style={{ gridTemplateColumns: cols }}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie-2 text-texto-3"><MapPin size={15} /></span>
        <span className="truncate text-[14px] font-semibold text-texto">{c.nombre}</span>
      </span>
      <span className="min-w-0 truncate text-[13px] text-texto-2">{c.estado}</span>
      <span className="min-w-0 truncate"><ChipRegion nombre={c.regionNombre} /></span>
      <span><BadgeActiva activa={c.activa} /></span>
      <span className="flex justify-end"><MenuAcciones testid={`ciudad-acciones-${c.id}`} acciones={accionesCiudad(c, onActivar, onAsignarRegion)} /></span>
    </div>
  );
}

function CardCiudad({ c, onActivar, onAsignarRegion }: { c: CiudadCatalogo; onActivar: (c: CiudadCatalogo) => void; onAsignarRegion: (c: CiudadCatalogo) => void }) {
  return (
    <div data-testid={`ciudad-card-${c.id}`} className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-borde bg-superficie-2 text-texto-3"><MapPin size={18} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{c.nombre}</span>
        <span className="truncate text-[12.5px] text-texto-3">{c.estado} · {c.regionNombre ?? 'Sin región'}</span>
      </span>
      <BadgeActiva activa={c.activa} />
      <MenuAcciones testid={`ciudad-acciones-${c.id}`} acciones={accionesCiudad(c, onActivar, onAsignarRegion)} />
    </div>
  );
}

function FilaRegion({ r, cols, onEditar }: { r: RegionConConteo; cols: string; onEditar: (r: RegionConConteo) => void }) {
  return (
    <div data-testid={`region-fila-${r.id}`} className="grid w-full items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave" style={{ gridTemplateColumns: cols }}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie-2 text-texto-3"><Layers size={15} /></span>
        <span className="truncate text-[14px] font-semibold text-texto">{r.nombre}</span>
      </span>
      <span className="text-[13px] text-texto-2">{r.totalCiudades} {r.totalCiudades === 1 ? 'ciudad' : 'ciudades'}</span>
      <span><BadgeActiva activa={r.activa} /></span>
      <span className="flex justify-end"><MenuAcciones testid={`region-acciones-${r.id}`} acciones={[{ etiqueta: 'Editar', icono: <Pencil size={15} />, onClick: () => onEditar(r) }]} /></span>
    </div>
  );
}

function CardRegion({ r, onEditar }: { r: RegionConConteo; onEditar: (r: RegionConConteo) => void }) {
  return (
    <div data-testid={`region-card-${r.id}`} className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-borde bg-superficie-2 text-texto-3"><Layers size={18} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{r.nombre}</span>
        <span className="truncate text-[12.5px] text-texto-3">{r.totalCiudades} {r.totalCiudades === 1 ? 'ciudad' : 'ciudades'}</span>
      </span>
      <BadgeActiva activa={r.activa} />
      <MenuAcciones testid={`region-acciones-${r.id}`} acciones={[{ etiqueta: 'Editar', icono: <Pencil size={15} />, onClick: () => onEditar(r) }]} />
    </div>
  );
}

export default SeccionCiudades;
