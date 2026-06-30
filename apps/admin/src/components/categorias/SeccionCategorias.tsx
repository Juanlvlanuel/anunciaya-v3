/**
 * SeccionCategorias.tsx
 * =====================
 * Módulo "Categorías" del Panel Admin (solo superadmin): gestiona el catálogo de
 * giros — categorías y subcategorías — y su DISPONIBILIDAD por ciudad, sin tocar
 * código. Lista DENSA estilo tabla (Tokens_Panel.md, Regla 13: nada de tarjetas
 * infladas) — filas con border-b, metadatos discretos, jerarquía por peso.
 *
 * Categorías expandibles → subcategorías indentadas. Por fila: disponibilidad por
 * ciudad, editar, activar/desactivar. "Quitar" = desactivar (no borra).
 *
 * Ubicación: apps/admin/src/components/categorias/SeccionCategorias.tsx
 */

import { useMemo, useState } from 'react';
import { Plus, ChevronRight, Pencil, MapPin, Globe2, Power, Tags, Search, X } from 'lucide-react';
import { EstadoSeccion } from '../ui/EstadoSeccion';
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

/** Disponibilidad como metadato discreto inline (no pill grande). */
function Disponibilidad({ ciudades }: { ciudades: CiudadRef[] }) {
  if (ciudades.length === 0) {
    return <span className="inline-flex items-center gap-1 text-texto-4"><Globe2 size={12} /> Todas</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 font-medium text-marca">
      <MapPin size={12} /> {ciudades.length} ciudad{ciudades.length === 1 ? '' : 'es'}
    </span>
  );
}

function BotonIcono({ onClick, title, children, testid }: { onClick: () => void; title: string; children: React.ReactNode; testid?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      data-testid={testid}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-texto-4 transition hover:bg-marca-suave hover:text-marca"
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

  const totalCategorias = catalogo.length;
  const totalSubcategorias = useMemo(() => catalogo.reduce((a, c) => a + c.subcategorias.length, 0), [catalogo]);

  // Vista filtrada: aplica búsqueda (por nombre de categoría o de subcategoría) y
  // filtro de estado. Cuando hay búsqueda, abre las categorías con coincidencia en
  // sus subcategorías para que se vean los resultados.
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
      {/* Barra de utilidad: buscador + filtros + acción */}
      <div className="mb-3 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
        {/* Buscador + (en móvil) el botón "Nueva" a su lado. lg:contents disuelve
            este wrapper en escritorio para que el buscador alinee en la fila. */}
        <div className="flex items-center gap-2 lg:contents">
          <div className="relative min-w-0 flex-1 lg:w-[340px] lg:flex-none">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
            <input
              data-testid="categorias-buscar"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar categoría o subcategoría…"
              className="w-full rounded-full border border-campo-borde bg-campo py-1.5 pl-9 pr-8 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar" onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-texto-4 transition hover:bg-marca-suave hover:text-marca">
                <X size={13} />
              </button>
            )}
          </div>
          {/* Botón "Nueva" — solo móvil, al lado del buscador (compacto) */}
          <button
            type="button"
            data-testid="categoria-nueva-movil"
            onClick={() => setDlgCategoria({ modo: 'crear', categoria: null })}
            aria-label="Nueva categoría"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste shadow-sm transition active:scale-95 lg:hidden"
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
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  act ? 'border-marca/40 bg-marca-suave text-marca' : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
                }`}
              >
                {e.label}
              </button>
            );
          })}
        </div>

        <span className="hidden text-[12px] text-texto-4 lg:inline" data-testid="categorias-total">
          {hayFiltros ? `${vista.length} de ${totalCategorias}` : `${totalCategorias} categorías · ${totalSubcategorias} subcat.`}
          {isFetching && !isLoading ? ' · actualizando…' : ''}
        </span>

        <button
          type="button"
          data-testid="categoria-nueva"
          onClick={() => setDlgCategoria({ modo: 'crear', categoria: null })}
          className="group hidden shrink-0 items-center gap-1.5 rounded-full bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95 lg:ml-auto lg:inline-flex"
        >
          <Plus size={14} className="transition-transform duration-300 group-hover:rotate-90" /> Nueva categoría
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
          {/* Encabezado de columnas (escritorio) */}
          <div className="hidden shrink-0 items-center gap-3 border-b border-borde bg-superficie px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4 lg:flex">
            <span className="flex-1">Categoría</span>
            <span className="w-32">Disponibilidad</span>
            <span className="w-16 text-right">Negocios</span>
            <span className="w-[104px]" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {vista.map(({ cat, subs, abierta }) => {
              return (
                <div key={cat.id}>
                  {/* Fila categoría */}
                  <div className={`group flex items-center gap-2.5 border-b border-borde px-3 py-2 transition hover:bg-marca-suave/40 ${!cat.activa ? 'opacity-60' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleExpandir(cat.id)}
                      data-testid={`categoria-expandir-${cat.id}`}
                      title={abierta ? 'Contraer' : 'Expandir'}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-texto-4 transition hover:bg-marca-suave hover:text-marca"
                    >
                      <ChevronRight size={15} className={`transition-transform ${abierta ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-texto">{cat.nombre}</span>
                      <span className="shrink-0 text-[11px] text-texto-4">{cat.subcategorias.length} subcat.</span>
                      {!cat.activa && <span className="shrink-0 rounded-full border border-borde px-1.5 py-0.5 text-[10px] font-semibold text-texto-4">Inactiva</span>}
                    </div>
                    {/* Disponibilidad (alineada en escritorio, inline en móvil) */}
                    <span className="hidden w-32 text-[12px] lg:inline-flex"><Disponibilidad ciudades={cat.ciudades} /></span>
                    <span className="hidden w-16 text-right text-[12px] text-texto-3 lg:inline">{cat.totalNegocios || '—'}</span>
                    <div className="flex w-auto shrink-0 items-center gap-0.5 lg:w-[104px] lg:justify-end">
                      <BotonIcono testid={`categoria-ciudades-${cat.id}`} title="Disponibilidad por ciudad" onClick={() => setDlgDisp({ nivel: 'categoria', id: cat.id, titulo: `Disponibilidad · ${cat.nombre}`, actuales: cat.ciudades })}>
                        <MapPin size={14} />
                      </BotonIcono>
                      <BotonIcono testid={`categoria-editar-${cat.id}`} title="Editar" onClick={() => setDlgCategoria({ modo: 'editar', categoria: cat })}>
                        <Pencil size={14} />
                      </BotonIcono>
                      <BotonIcono testid={`categoria-activa-${cat.id}`} title={cat.activa ? 'Desactivar' : 'Activar'} onClick={() => activaCat.mutate({ id: cat.id, activa: !cat.activa })}>
                        <Power size={14} className={cat.activa ? 'text-verde' : 'text-texto-4'} />
                      </BotonIcono>
                    </div>
                  </div>

                  {/* Subcategorías */}
                  {abierta && (
                    <div className="border-b border-borde bg-lienzo/40">
                      {subs.length === 0 && (
                        <p className="px-3 py-2 pl-11 text-[12px] text-texto-4">Sin subcategorías todavía.</p>
                      )}
                      {subs.map((sub) => (
                        <div key={sub.id} className={`flex items-center gap-2.5 px-3 py-1.5 pl-11 transition hover:bg-marca-suave/40 ${!sub.activa ? 'opacity-60' : ''}`}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-borde-fuerte" />
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate text-[12.5px] text-texto-2">{sub.nombre}</span>
                            {!sub.activa && <span className="shrink-0 rounded-full border border-borde px-1.5 py-0.5 text-[10px] font-semibold text-texto-4">Inactiva</span>}
                          </div>
                          <span className="hidden w-32 text-[11.5px] lg:inline-flex"><Disponibilidad ciudades={sub.ciudades} /></span>
                          <span className="hidden w-16 text-right text-[11.5px] text-texto-3 lg:inline">{sub.totalNegocios || '—'}</span>
                          <div className="flex w-auto shrink-0 items-center gap-0.5 lg:w-[104px] lg:justify-end">
                            <BotonIcono testid={`subcategoria-ciudades-${sub.id}`} title="Disponibilidad por ciudad" onClick={() => setDlgDisp({ nivel: 'subcategoria', id: sub.id, titulo: `Disponibilidad · ${sub.nombre}`, actuales: sub.ciudades, permitidas: cat.ciudades })}>
                              <MapPin size={13} />
                            </BotonIcono>
                            <BotonIcono testid={`subcategoria-editar-${sub.id}`} title="Editar" onClick={() => setDlgSub({ modo: 'editar', categoria: cat, subcategoria: sub })}>
                              <Pencil size={13} />
                            </BotonIcono>
                            <BotonIcono testid={`subcategoria-activa-${sub.id}`} title={sub.activa ? 'Desactivar' : 'Activar'} onClick={() => activaSub.mutate({ id: sub.id, activa: !sub.activa })}>
                              <Power size={13} className={sub.activa ? 'text-verde' : 'text-texto-4'} />
                            </BotonIcono>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        data-testid={`subcategoria-nueva-${cat.id}`}
                        onClick={() => setDlgSub({ modo: 'crear', categoria: cat, subcategoria: null })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 pl-11 text-[12px] font-semibold text-marca transition hover:underline"
                      >
                        <Plus size={13} /> Agregar subcategoría
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
