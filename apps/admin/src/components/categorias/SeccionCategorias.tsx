/**
 * SeccionCategorias.tsx
 * =====================
 * Módulo "Categorías" del Panel Admin (solo superadmin): gestiona el catálogo de
 * giros — categorías y subcategorías — y su DISPONIBILIDAD por ciudad, sin tocar
 * código. KPIs de cabecera + lista densa estilo tabla (Tokens_Panel.md, Regla 13).
 *
 * Categorías expandibles → subcategorías indentadas. Por fila: disponibilidad por
 * ciudad, editar, activar/desactivar. "Quitar" = desactivar (nunca borra).
 *
 * Ubicación: apps/admin/src/components/categorias/SeccionCategorias.tsx
 */

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Plus, ChevronRight, Pencil, MapPin, Globe2, Power, Tags, Search, X, Store } from 'lucide-react';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { Tooltip } from '../ui/Tooltip';
import {
  useCatalogo,
  useCrearCategoria,
  useEditarCategoria,
  useCambiarActivaCategoria,
  useAsignarCiudadesCategoria,
  useCrearSubcategoria,
  useEditarSubcategoria,
  useCambiarActivaSubcategoria,
  useAsignarCiudadesSubcategoria,
} from '../../hooks/queries/useCategoriasAdmin';
import type { CategoriaAdmin, SubcategoriaAdmin, CiudadRef } from '../../services/categoriasService';
import { DialogoCategoria, DialogoSubcategoria, DialogoDisponibilidad } from './DialogosCategorias';
import { SeccionCategoriasMarketplace } from './SeccionCategoriasMarketplace';
import { useCatalogoMarketplace } from '../../hooks/queries/useCategoriasMPAdmin';
import { TabsSegmento } from '../ui/TabsSegmento';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { useCiudadesLista } from '../../hooks/queries/useCiudadesAdmin';

type DlgCategoria = { modo: 'crear' | 'editar'; categoria: CategoriaAdmin | null } | null;
type DlgSubcategoria = { modo: 'crear' | 'editar'; categoria: CategoriaAdmin; subcategoria: SubcategoriaAdmin | null } | null;
type DlgDisponibilidad =
  | { nivel: 'categoria'; id: number; titulo: string; actuales: CiudadRef[] }
  | { nivel: 'subcategoria'; id: number; titulo: string; actuales: CiudadRef[]; permitidas: CiudadRef[] }
  | null;

// =============================================================================
// Tarjeta KPI de cabecera (cifra dominante + ícono de acento, estilo Tokens_Panel)
// =============================================================================

// KPI al patrón del Panel (Suscripciones/Publicidad): sin card ni ícono — etiqueta uppercase arriba +
// valor bold abajo, centrado. Móvil: carrusel (min-w). Escritorio: columnas iguales con divisores.
function Kpi({ valor, etiqueta, etiquetaCorta, testid }: { valor: number; etiqueta: string; etiquetaCorta?: string; testid?: string }) {
  return (
    <div data-testid={testid} className="flex min-w-[84px] shrink-0 snap-start flex-col items-center px-3.5 text-center leading-tight lg:px-4">
      <span className="txt-badge whitespace-nowrap font-semibold uppercase tracking-wide text-texto-4 lg:text-[11px]">
        <span className="lg:hidden">{etiquetaCorta ?? etiqueta}</span>
        <span className="hidden lg:inline">{etiqueta}</span>
      </span>
      <span className="mt-1 whitespace-nowrap text-[17px] font-bold tabular-nums text-texto lg:text-[22px]">{valor}</span>
    </div>
  );
}

/** Disponibilidad: "Todas" (texto neutro) o "N ciudades" (pill de acento). */
function Disponibilidad({ ciudades }: { ciudades: CiudadRef[] }) {
  if (ciudades.length === 0) {
    return <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-texto-3"><Globe2 size={14} /> Todas</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-suave px-2.5 py-1 text-[12px] font-semibold text-marca">
      <MapPin size={13} /> {ciudades.length} ciudad{ciudades.length === 1 ? '' : 'es'}
    </span>
  );
}

/** Botón-ícono de acción (envuelto por Tooltip desde el caller). */
function BotonIcono({ onClick, children, testid }: { onClick: () => void; children: React.ReactNode; testid?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-transparent text-texto-3 transition hover:border-borde hover:bg-marca-suave hover:text-marca"
    >
      {children}
    </button>
  );
}

function SeccionCategoriasNegocios({ crearRef }: { crearRef: MutableRefObject<(() => void) | null> }) {
  // Filtro por ciudad (analítica de negocios por plaza): '' = todas.
  const [ciudadSel, setCiudadSel] = useState('');
  const { data, isLoading, isError, isFetching } = useCatalogo(ciudadSel || undefined);
  const catalogo = data?.categorias ?? [];
  const totalNegocios = data?.totalNegocios ?? 0;
  const { data: ciudades = [] } = useCiudadesLista({ activa: 'activas' });
  const opcionesCiudad = useMemo<OpcionMenu[]>(() => {
    // '' → total de categorías; plaza con categorías restringidas → su total; plaza sin restricciones → catGlobal.
    const conteo = (id: string) => data?.porCiudad?.find((p) => p.ciudadId === id)?.total ?? data?.catGlobal ?? 0;
    return [
      { valor: '', etiqueta: 'Todas las ciudades', conteo: conteo('') },
      ...ciudades.map((c) => ({ valor: c.id, etiqueta: c.nombre, conteo: conteo(c.id) })),
    ];
  }, [ciudades, data]);
  const etiquetaCiudad =
    opcionesCiudad.find((o) => o.valor === ciudadSel)?.etiqueta ?? 'Todas las ciudades';
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [dlgCategoria, setDlgCategoria] = useState<DlgCategoria>(null);
  const [dlgSub, setDlgSub] = useState<DlgSubcategoria>(null);
  const [dlgDisp, setDlgDisp] = useState<DlgDisponibilidad>(null);

  const crearCat = useCrearCategoria();
  const editarCat = useEditarCategoria();
  const activaCat = useCambiarActivaCategoria();
  const ciudadesCat = useAsignarCiudadesCategoria();
  const crearSub = useCrearSubcategoria();
  const editarSub = useEditarSubcategoria();
  const activaSub = useCambiarActivaSubcategoria();
  const ciudadesSub = useAsignarCiudadesSubcategoria();

  // El botón "+ Nueva categoría" vive en la barra de tabs (wrapper); aquí se registra su acción.
  useEffect(() => {
    crearRef.current = () => setDlgCategoria({ modo: 'crear', categoria: null });
    return () => { crearRef.current = null; };
  }, [crearRef]);

  // KPIs. "Negocios clasificados" viene del backend (DISTINCT por ciudad); aquí solo
  // se derivan los conteos del catálogo (globales: el catálogo no cambia por ciudad).
  const kpis = useMemo(() => {
    let subs = 0;
    for (const c of catalogo) subs += c.subcategorias.length;
    return { categorias: catalogo.length, subs };
  }, [catalogo]);

  // Vista filtrada (búsqueda + estado). Con búsqueda, abre las categorías con match en sus subs.
  const vista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const pasaEstado = (activa: boolean) =>
      filtroEstado === 'todas' ? true : filtroEstado === 'activas' ? activa : !activa;
    return catalogo
      .filter((c) => pasaEstado(c.activa))
      .map((cat) => {
        const catMatch = !q || cat.nombre.toLowerCase().includes(q);
        const subsMatch = q ? cat.subcategorias.filter((s) => s.nombre.toLowerCase().includes(q)) : cat.subcategorias;
        const subs = q && !catMatch ? subsMatch : cat.subcategorias;
        const abierta = q ? subsMatch.length > 0 && !catMatch : expandidas.has(cat.id);
        return { cat, subs, abierta, visible: catMatch || subsMatch.length > 0 };
      })
      .filter((x) => x.visible);
  }, [catalogo, busqueda, filtroEstado, expandidas]);

  const hayFiltros = busqueda.trim() !== '' || filtroEstado !== 'todas';
  const limpiarFiltros = () => { setBusqueda(''); setFiltroEstado('todas'); };

  const ESTADOS: { id: 'todas' | 'activas' | 'inactivas'; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'activas', label: 'Activas' },
    { id: 'inactivas', label: 'Inactivas' },
  ];

  const toggleExpandir = (id: number) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const guardarCategoria = (datos: { nombre: string }) => {
    if (!dlgCategoria) return;
    const m = dlgCategoria.modo === 'crear'
      ? crearCat.mutateAsync(datos)
      : editarCat.mutateAsync({ id: dlgCategoria.categoria!.id, datos });
    m.then(() => setDlgCategoria(null)).catch(() => {});
  };
  const guardarSub = (datos: { nombre: string }) => {
    if (!dlgSub) return;
    const m = dlgSub.modo === 'crear'
      ? crearSub.mutateAsync({ categoriaId: dlgSub.categoria.id, ...datos })
      : editarSub.mutateAsync({ id: dlgSub.subcategoria!.id, datos });
    m.then(() => setDlgSub(null)).catch(() => {});
  };
  const guardarDisp = (ciudadIds: string[]) => {
    if (!dlgDisp) return;
    const m = dlgDisp.nivel === 'categoria'
      ? ciudadesCat.mutateAsync({ id: dlgDisp.id, ciudadIds })
      : ciudadesSub.mutateAsync({ id: dlgDisp.id, ciudadIds });
    m.then(() => setDlgDisp(null)).catch(() => {});
  };

  const cargandoCategoria = crearCat.isPending || editarCat.isPending;
  const cargandoSub = crearSub.isPending || editarSub.isPending;
  const cargandoDisp = ciudadesCat.isPending || ciudadesSub.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Barra de utilidad: buscador + filtros + KPIs (el botón "Nueva" vive en la barra de tabs) */}
      <div className="mb-3 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 lg:contents">
          <div className="relative min-w-0 flex-1 lg:w-[340px] lg:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
            <input
              data-testid="categorias-buscar"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar categoría o subcategoría…"
              className="w-full rounded-full border border-campo-borde bg-campo py-2 pl-10 pr-8 text-[13.5px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar" onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-texto-4 transition hover:bg-marca-suave hover:text-marca">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Fila 2 (móvil): ciudad (primero) + chips de estado, deslizables como
            carrusel. En desktop, inline. */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
          {/* Ciudad — primero (izquierda). */}
          <div className="shrink-0">
            <MenuFiltro
              testid="categorias-neg-ciudad"
              icono={<MapPin size={14} />}
              etiquetaBoton={etiquetaCiudad}
              opciones={opcionesCiudad}
              valor={ciudadSel}
              onCambiar={setCiudadSel}
              alineacion="izquierda"
              tam="chip"
            />
          </div>
          {ESTADOS.map((e) => {
            const act = filtroEstado === e.id;
            const color = e.id === 'activas' ? 'var(--panel-ok)' : e.id === 'inactivas' ? 'var(--panel-text-4)' : 'var(--panel-brand)';
            const n = e.id === 'activas' ? catalogo.filter((c) => c.activa).length
              : e.id === 'inactivas' ? catalogo.filter((c) => !c.activa).length
                : catalogo.length;
            return (
              <button
                key={e.id}
                type="button"
                data-testid={`categorias-filtro-${e.id}`}
                onClick={() => setFiltroEstado(e.id)}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
                style={act ? { background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 34%, transparent)`, color } : undefined}
              >
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
                {e.label}
                <span
                  className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums"
                  style={act ? { background: `color-mix(in srgb, ${color} 22%, transparent)`, color } : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {hayFiltros && (
          <span className="hidden text-[12.5px] font-medium text-texto-3 lg:inline" data-testid="categorias-total">
            {vista.length} de {kpis.categorias}
          </span>
        )}
        {isFetching && !isLoading && <span className="hidden text-[12px] text-texto-4 lg:inline">actualizando…</span>}

        {!isLoading && !isError && (
          <div className="-mx-1 flex shrink-0 items-stretch overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:ml-auto lg:overflow-visible lg:px-0">
            <Kpi valor={kpis.categorias} etiqueta="Categorías" testid="kpi-categorias" />
            <span className="w-px shrink-0 self-stretch bg-borde" />
            <Kpi valor={kpis.subs} etiqueta="Subcategorías" testid="kpi-subcategorias" />
            <span className="w-px shrink-0 self-stretch bg-borde" />
            <Kpi valor={totalNegocios} etiqueta="Negocios clasificados" etiquetaCorta="Negocios" testid="kpi-negocios" />
          </div>
        )}
      </div>

      {isLoading ? (
        <EstadoSeccion variante="cargando" icono={Tags} titulo="Cargando catálogo…" />
      ) : isError ? (
        <EstadoSeccion variante="error" icono={Tags} titulo="No se pudo cargar el catálogo." descripcion="Revisa tu conexión e inténtalo de nuevo." />
      ) : catalogo.length === 0 ? (
        <EstadoSeccion icono={Tags} titulo="Aún no hay categorías" accion={{ etiqueta: 'Nueva categoría', onClick: () => setDlgCategoria({ modo: 'crear', categoria: null }) }} />
      ) : vista.length === 0 ? (
        <EstadoSeccion icono={Search} titulo="Sin resultados" descripcion="Ninguna categoría coincide con tu búsqueda o filtros." accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
          {/* Encabezado de columnas (escritorio). El primer span vacío (w-8) compensa
              la columna del botón de expandir/bullet, para que cada rótulo caiga
              exactamente sobre su columna de datos (igual estructura que las filas). */}
          <div className="hidden shrink-0 items-center gap-4 border-b border-borde bg-superficie-2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4 lg:flex">
            <span className="w-8 shrink-0" aria-hidden="true" />
            <span className="flex-1">Categoría</span>
            <span className="w-44">Disponibilidad</span>
            <span className="w-20 text-center">Negocios</span>
            <span className="w-32 text-center">Acciones</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {vista.map(({ cat, subs, abierta }) => (
              <div key={cat.id}>
                {/* Fila categoría */}
                <div className={`flex items-center gap-4 border-b border-borde px-4 py-3 transition ${!cat.activa ? 'bg-[var(--panel-warn-weak)] hover:bg-[var(--panel-warn-weak)]' : 'hover:bg-marca-suave/40'}`}>
                  <button
                    type="button"
                    onClick={() => toggleExpandir(cat.id)}
                    data-testid={`categoria-expandir-${cat.id}`}
                    aria-label={abierta ? 'Contraer' : 'Expandir'}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie-2 text-texto-3 transition hover:bg-marca-suave hover:text-marca"
                  >
                    <ChevronRight size={16} className={`transition-transform ${abierta ? 'rotate-90' : ''}`} />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Línea 1: nombre + nº de subcategorías SIEMPRE juntos (el nombre trunca si hace falta). */}
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="min-w-0 truncate text-[14.5px] font-semibold text-texto">{cat.nombre}</span>
                      <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11.5px] font-semibold text-texto-3">{cat.subcategorias.length} subcat.</span>
                      {!cat.activa && <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-4">Inactiva</span>}
                    </div>
                    {/* Línea 2 (solo móvil): disponibilidad + negocios. En desktop van en sus columnas. */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:hidden">
                      <Disponibilidad ciudades={cat.ciudades} />
                      {cat.totalNegocios > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-texto-3"><Store size={12} /> {cat.totalNegocios}</span>}
                    </div>
                  </div>
                  <span className="hidden w-44 lg:inline-flex"><Disponibilidad ciudades={cat.ciudades} /></span>
                  <span className="hidden w-20 text-center text-[14px] font-semibold tabular-nums text-texto-2 lg:block">{cat.totalNegocios || '—'}</span>
                  <div className="flex w-auto shrink-0 items-center justify-end gap-1 lg:w-32 lg:justify-center">
                    <Tooltip text="Disponibilidad por ciudad">
                      <BotonIcono testid={`categoria-ciudades-${cat.id}`} onClick={() => setDlgDisp({ nivel: 'categoria', id: cat.id, titulo: `Disponibilidad · ${cat.nombre}`, actuales: cat.ciudades })}><MapPin size={16} /></BotonIcono>
                    </Tooltip>
                    <Tooltip text="Editar">
                      <BotonIcono testid={`categoria-editar-${cat.id}`} onClick={() => setDlgCategoria({ modo: 'editar', categoria: cat })}><Pencil size={16} /></BotonIcono>
                    </Tooltip>
                    <Tooltip text={cat.activa ? 'Desactivar' : 'Activar'}>
                      <BotonIcono testid={`categoria-activa-${cat.id}`} onClick={() => activaCat.mutate({ id: cat.id, activa: !cat.activa })}><Power size={16} className={cat.activa ? 'text-verde' : 'text-texto-4'} /></BotonIcono>
                    </Tooltip>
                  </div>
                </div>

                {/* Subcategorías */}
                {abierta && (
                  <div className="border-b border-borde bg-lienzo/40">
                    {subs.length === 0 && (
                      <p className="px-4 py-2.5 pl-14 text-[12.5px] text-texto-4">Sin subcategorías todavía.</p>
                    )}
                    {subs.map((sub) => (
                      <div key={sub.id} className={`flex items-center gap-4 px-4 py-2 pl-14 transition ${!sub.activa ? 'bg-[var(--panel-warn-weak)] hover:bg-[var(--panel-warn-weak)]' : 'hover:bg-marca-suave/40'}`}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-borde-fuerte" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          {/* Línea 1: nombre (trunca si hace falta) + estado. */}
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="min-w-0 truncate text-[13.5px] font-medium text-texto-2">{sub.nombre}</span>
                            {!sub.activa && <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-4">Inactiva</span>}
                          </div>
                          {/* Línea 2 (solo móvil): disponibilidad + negocios. */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:hidden">
                            <Disponibilidad ciudades={sub.ciudades} />
                            {sub.totalNegocios > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-texto-3"><Store size={12} /> {sub.totalNegocios}</span>}
                          </div>
                        </div>
                        <span className="hidden w-44 lg:inline-flex"><Disponibilidad ciudades={sub.ciudades} /></span>
                        <span className="hidden w-20 text-center text-[13.5px] font-semibold tabular-nums text-texto-3 lg:block">{sub.totalNegocios || '—'}</span>
                        <div className="flex w-auto shrink-0 items-center justify-end gap-1 lg:w-32 lg:justify-center">
                          <Tooltip text="Disponibilidad por ciudad">
                            <BotonIcono testid={`subcategoria-ciudades-${sub.id}`} onClick={() => setDlgDisp({ nivel: 'subcategoria', id: sub.id, titulo: `Disponibilidad · ${sub.nombre}`, actuales: sub.ciudades, permitidas: cat.ciudades })}><MapPin size={15} /></BotonIcono>
                          </Tooltip>
                          <Tooltip text="Editar">
                            <BotonIcono testid={`subcategoria-editar-${sub.id}`} onClick={() => setDlgSub({ modo: 'editar', categoria: cat, subcategoria: sub })}><Pencil size={15} /></BotonIcono>
                          </Tooltip>
                          <Tooltip text={sub.activa ? 'Desactivar' : 'Activar'}>
                            <BotonIcono testid={`subcategoria-activa-${sub.id}`} onClick={() => activaSub.mutate({ id: sub.id, activa: !sub.activa })}><Power size={15} className={sub.activa ? 'text-verde' : 'text-texto-4'} /></BotonIcono>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid={`subcategoria-nueva-${cat.id}`}
                      onClick={() => setDlgSub({ modo: 'crear', categoria: cat, subcategoria: null })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 pl-14 text-[12.5px] font-semibold text-marca transition hover:underline"
                    >
                      <Plus size={14} /> Agregar subcategoría
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diálogos */}
      <DialogoCategoria
        abierto={!!dlgCategoria}
        modo={dlgCategoria?.modo ?? 'crear'}
        categoria={dlgCategoria?.categoria}
        cargando={cargandoCategoria}
        onCerrar={() => setDlgCategoria(null)}
        onGuardar={guardarCategoria}
      />
      <DialogoSubcategoria
        abierto={!!dlgSub}
        modo={dlgSub?.modo ?? 'crear'}
        categoriaNombre={dlgSub?.categoria.nombre ?? ''}
        subcategoria={dlgSub?.subcategoria}
        cargando={cargandoSub}
        onCerrar={() => setDlgSub(null)}
        onGuardar={guardarSub}
      />
      <DialogoDisponibilidad
        abierto={!!dlgDisp}
        titulo={dlgDisp?.titulo ?? ''}
        ciudadesActuales={dlgDisp?.actuales ?? []}
        ciudadesPermitidas={dlgDisp?.nivel === 'subcategoria' ? dlgDisp.permitidas : undefined}
        cargando={cargandoDisp}
        onCerrar={() => setDlgDisp(null)}
        onGuardar={guardarDisp}
      />
    </div>
  );
}

// =============================================================================
// Wrapper con toggle Negocios / MarketPlace (UI unificada; cada ámbito su tabla)
// =============================================================================

export function SeccionCategorias() {
  const [ambito, setAmbito] = useState<'negocio' | 'marketplace'>('negocio');
  const crearRef = useRef<(() => void) | null>(null);
  // Total de CATEGORÍAS (no subcategorías) de cada ámbito para el badge del toggle. Globales
  // (sin ciudad); React Query deduplica con la lista que ya carga cada sección hija.
  const { data: catNegocios } = useCatalogo();
  const { data: catMarket } = useCatalogoMarketplace();
  const totalNegocios = catNegocios?.categorias.length ?? 0;
  const totalMarket = catMarket?.length ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 px-4 pt-4 lg:px-5">
        <TabsSegmento<'negocio' | 'marketplace'>
          tabs={[
            { id: 'negocio', label: 'Negocios', icono: <Store size={14} />, badge: totalNegocios },
            { id: 'marketplace', label: 'MarketPlace', icono: <Tags size={14} />, badge: totalMarket },
          ]}
          valor={ambito}
          onCambiar={setAmbito}
          testidPrefijo="categorias-ambito"
        />
        <button
          type="button"
          data-testid="categoria-nueva"
          onClick={() => crearRef.current?.()}
          className="group ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95"
        >
          <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
          <span className="hidden lg:inline">Nueva categoría</span>
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {ambito === 'negocio' ? <SeccionCategoriasNegocios crearRef={crearRef} /> : <SeccionCategoriasMarketplace crearRef={crearRef} />}
      </div>
    </div>
  );
}

export default SeccionCategorias;
