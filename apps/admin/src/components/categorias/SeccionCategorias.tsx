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

import { useMemo, useState } from 'react';
import { Plus, ChevronRight, Pencil, MapPin, Globe2, Power, Tags, Search, X, FolderTree, Store } from 'lucide-react';
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

type DlgCategoria = { modo: 'crear' | 'editar'; categoria: CategoriaAdmin | null } | null;
type DlgSubcategoria = { modo: 'crear' | 'editar'; categoria: CategoriaAdmin; subcategoria: SubcategoriaAdmin | null } | null;
type DlgDisponibilidad =
  | { nivel: 'categoria'; id: number; titulo: string; actuales: CiudadRef[] }
  | { nivel: 'subcategoria'; id: number; titulo: string; actuales: CiudadRef[]; permitidas: CiudadRef[] }
  | null;

// =============================================================================
// Tarjeta KPI de cabecera (cifra dominante + ícono de acento, estilo Tokens_Panel)
// =============================================================================

function Kpi({ icono: Icono, valor, etiqueta, testid }: { icono: typeof Tags; valor: number; etiqueta: string; testid?: string }) {
  // Móvil: tarjeta compacta para carrusel horizontal. Escritorio: tamaño completo.
  return (
    <div
      data-testid={testid}
      className="flex w-[44vw] max-w-[180px] shrink-0 snap-start items-center gap-2.5 rounded-[12px] border border-borde bg-superficie px-3 py-2.5 shadow-tarjeta-panel lg:w-auto lg:max-w-none lg:gap-3.5 lg:rounded-[14px] lg:px-4 lg:py-3.5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca lg:h-11 lg:w-11 lg:rounded-[11px]">
        <Icono className="h-[18px] w-[18px] lg:h-5 lg:w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[19px] font-bold leading-none tabular-nums text-texto lg:text-[26px]">{valor}</div>
        <div className="mt-0.5 truncate text-[11px] font-medium text-texto-3 lg:mt-1 lg:text-[12.5px]">{etiqueta}</div>
      </div>
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

export function SeccionCategorias() {
  const { data: catalogo = [], isLoading, isError, isFetching } = useCatalogo();
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

  // KPIs
  const kpis = useMemo(() => {
    let subs = 0, negocios = 0;
    for (const c of catalogo) {
      subs += c.subcategorias.length;
      negocios += c.totalNegocios;
    }
    return { categorias: catalogo.length, subs, negocios };
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
      {/* KPIs de cabecera */}
      {!isLoading && !isError && (
        <div className="mb-4 -mx-4 flex shrink-0 snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <Kpi icono={Tags} valor={kpis.categorias} etiqueta="Categorías" testid="kpi-categorias" />
          <Kpi icono={FolderTree} valor={kpis.subs} etiqueta="Subcategorías" testid="kpi-subcategorias" />
          <Kpi icono={Store} valor={kpis.negocios} etiqueta="Negocios clasificados" testid="kpi-negocios" />
        </div>
      )}

      {/* Barra de utilidad: buscador + filtros + acción */}
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
          <button
            type="button"
            data-testid="categoria-nueva-movil"
            onClick={() => setDlgCategoria({ modo: 'crear', categoria: null })}
            aria-label="Nueva categoría"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste shadow-sm transition active:scale-95 lg:hidden"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {ESTADOS.map((e) => {
            const act = filtroEstado === e.id;
            return (
              <button
                key={e.id}
                type="button"
                data-testid={`categorias-filtro-${e.id}`}
                onClick={() => setFiltroEstado(e.id)}
                className={`inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  act ? 'border-marca/40 bg-marca-suave text-marca' : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
                }`}
              >
                {e.label}
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

        <button
          type="button"
          data-testid="categoria-nueva"
          onClick={() => setDlgCategoria({ modo: 'crear', categoria: null })}
          className="group hidden shrink-0 items-center gap-1.5 rounded-full bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95 lg:ml-auto lg:inline-flex"
        >
          <Plus size={15} className="transition-transform duration-300 group-hover:rotate-90" /> Nueva categoría
        </button>
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
          {/* Encabezado de columnas (escritorio) */}
          <div className="hidden shrink-0 items-center gap-4 border-b border-borde bg-superficie-2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4 lg:flex">
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
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="truncate text-[14.5px] font-semibold text-texto">{cat.nombre}</span>
                    <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11.5px] font-semibold text-texto-3">{cat.subcategorias.length} subcat.</span>
                    {!cat.activa && <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-4">Inactiva</span>}
                    {/* Móvil: disponibilidad + negocios inline */}
                    <span className="lg:hidden"><Disponibilidad ciudades={cat.ciudades} /></span>
                    {cat.totalNegocios > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-texto-3 lg:hidden"><Store size={12} /> {cat.totalNegocios}</span>}
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
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="truncate text-[13.5px] font-medium text-texto-2">{sub.nombre}</span>
                          {!sub.activa && <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-4">Inactiva</span>}
                          <span className="lg:hidden"><Disponibilidad ciudades={sub.ciudades} /></span>
                          {sub.totalNegocios > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-texto-3 lg:hidden"><Store size={12} /> {sub.totalNegocios}</span>}
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

export default SeccionCategorias;
