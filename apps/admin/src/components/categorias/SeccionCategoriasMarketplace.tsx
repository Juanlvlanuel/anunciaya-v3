/**
 * SeccionCategoriasMarketplace.tsx
 * ================================
 * Vista MarketPlace del módulo "Categorías" del Panel (bajo el toggle
 * Negocios/MarketPlace). Catálogo SIMPLE de 1 nivel: crear, editar nombre y
 * activar/desactivar. "Quitar" = desactivar (nunca borra — integridad con los
 * artículos ya categorizados).
 *
 * Ubicación: apps/admin/src/components/categorias/SeccionCategoriasMarketplace.tsx
 */

import { useMemo, useState } from 'react';
import { Plus, Pencil, Power, Search, X, MapPin, Layers, Tag } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import {
  useCatalogoMarketplace,
  useCrearCategoriaMP,
  useEditarCategoriaMP,
  useCambiarActivaCategoriaMP,
} from '../../hooks/queries/useCategoriasMPAdmin';
import { useCiudadesLista } from '../../hooks/queries/useCiudadesAdmin';
import type { CategoriaMarketplaceAdmin } from '../../services/categoriasMarketplaceService';

type Dlg = { modo: 'crear' | 'editar'; categoria: CategoriaMarketplaceAdmin | null } | null;

const ESTADOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'activas', label: 'Activas' },
  { id: 'inactivas', label: 'Inactivas' },
] as const;

export function SeccionCategoriasMarketplace() {
  // Filtro por ciudad (analítica): '' = todas.
  const [ciudadSel, setCiudadSel] = useState('');
  const { data: catalogo = [], isLoading, isError, isFetching } = useCatalogoMarketplace(
    ciudadSel || undefined,
  );
  const { data: ciudades = [] } = useCiudadesLista({ activa: 'activas' });
  const opcionesCiudad = useMemo<OpcionMenu[]>(
    () => [
      { valor: '', etiqueta: 'Todas las ciudades' },
      ...ciudades.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
    ],
    [ciudades],
  );
  const etiquetaCiudad =
    opcionesCiudad.find((o) => o.valor === ciudadSel)?.etiqueta ?? 'Todas las ciudades';
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [dlg, setDlg] = useState<Dlg>(null);
  const [nombre, setNombre] = useState('');

  const crear = useCrearCategoriaMP();
  const editar = useEditarCategoriaMP();
  const activa = useCambiarActivaCategoriaMP();
  const guardando = crear.isPending || editar.isPending;

  // KPIs de publicaciones (en la ciudad seleccionada, o todas). Se derivan del
  // catálogo, que ya viene filtrado por ciudad desde el backend.
  const kpisPub = useMemo(() => {
    let venta = 0;
    let busca = 0;
    for (const c of catalogo) {
      venta += c.totalVendo;
      busca += c.totalBusco;
    }
    return { venta, busca, total: venta + busca };
  }, [catalogo]);

  const vista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const pasaEstado = (a: boolean) =>
      filtroEstado === 'todas' ? true : filtroEstado === 'activas' ? a : !a;
    return catalogo.filter(
      (c) => pasaEstado(c.activa) && (!q || c.nombre.toLowerCase().includes(q)),
    );
  }, [catalogo, busqueda, filtroEstado]);

  const abrirCrear = () => {
    setNombre('');
    setDlg({ modo: 'crear', categoria: null });
  };
  const abrirEditar = (c: CategoriaMarketplaceAdmin) => {
    setNombre(c.nombre);
    setDlg({ modo: 'editar', categoria: c });
  };
  const guardar = () => {
    const n = nombre.trim();
    if (n.length < 2) return;
    const p =
      dlg?.modo === 'editar' && dlg.categoria
        ? editar.mutateAsync({ id: dlg.categoria.id, datos: { nombre: n } })
        : crear.mutateAsync({ nombre: n });
    p.then(() => setDlg(null)).catch(() => {});
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* KPIs */}
      {!isLoading && !isError && (
        <div className="mb-4 -mx-4 flex shrink-0 snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {(
            [
              { icono: Layers, valor: kpisPub.total, etiqueta: 'Publicaciones' },
              { icono: Tag, valor: kpisPub.venta, etiqueta: 'En venta' },
              { icono: Search, valor: kpisPub.busca, etiqueta: 'Buscando' },
            ] as const
          ).map(({ icono: Icono, valor, etiqueta }) => (
            <div
              key={etiqueta}
              className="flex w-[44vw] max-w-[180px] shrink-0 snap-start items-center gap-2.5 rounded-[12px] border border-borde bg-superficie px-3 py-2.5 shadow-tarjeta-panel lg:w-auto lg:max-w-none lg:gap-3.5 lg:rounded-[14px] lg:px-4 lg:py-3.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca lg:h-11 lg:w-11">
                <Icono className="h-[18px] w-[18px] lg:h-5 lg:w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-[19px] font-bold leading-none tabular-nums text-texto lg:text-[26px]">{valor}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-texto-3 lg:text-[12.5px]">{etiqueta}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra: buscador + filtros + nueva */}
      <div className="mb-3 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
        {/* Fila 1 (móvil): buscador + botón "+" al lado. En desktop, lg:contents
            desarma el wrapper (buscador se une a la fila, el "+" móvil se oculta). */}
        <div className="flex items-center gap-2 lg:contents">
          <div className="relative min-w-0 flex-1 lg:w-[340px] lg:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
            <input
              data-testid="categorias-mp-buscar"
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar categoría…"
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
            onClick={abrirCrear}
            aria-label="Nueva categoría"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste shadow-sm transition active:scale-95 lg:hidden"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Fila 2 (móvil): ciudad (primero) + chips de estado, deslizables como
            carrusel. En desktop, inline. */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
          {/* Ciudad — primero (izquierda). */}
          <div className="shrink-0">
            <MenuFiltro
              testid="categorias-mp-ciudad"
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
            return (
              <button
                key={e.id}
                type="button"
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

        {isFetching && !isLoading && <span className="hidden text-[12px] text-texto-4 lg:inline">actualizando…</span>}
        <button
          type="button"
          data-testid="categoria-mp-nueva"
          onClick={abrirCrear}
          className="ml-auto hidden items-center gap-1.5 rounded-full bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste shadow-sm transition hover:brightness-110 lg:inline-flex"
        >
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-texto-3">Cargando…</p>
        ) : isError ? (
          <p className="py-8 text-center text-[13px] text-texto-2">No se pudo cargar el catálogo.</p>
        ) : vista.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-texto-3">Sin categorías.</p>
        ) : (
          <ul className="divide-y divide-borde overflow-hidden rounded-[12px] border border-borde bg-superficie">
            {vista.map((c) => (
              <li
                key={c.id}
                data-testid={`categoria-mp-${c.id}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 ${c.activa ? '' : 'opacity-60'}`}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-texto">{c.nombre}</span>
                {!c.activa && (
                  <span className="rounded-full bg-borde/60 px-2 py-0.5 text-[11px] font-semibold text-texto-3">Inactiva</span>
                )}
                {/* Conteo de publicaciones activas: oferta (Vendo) vs demanda (Busco). */}
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    title="Publicaciones en venta"
                    className="rounded-full bg-marca-suave px-2.5 py-1 text-[13px] font-semibold text-marca tabular-nums"
                  >
                    {c.totalVendo} venta
                  </span>
                  <span
                    title="Publicaciones buscando (demanda)"
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-[13px] font-semibold text-amber-700 tabular-nums"
                  >
                    {c.totalBusco} busca
                  </span>
                </span>
                <Tooltip text="Editar">
                  <button
                    type="button"
                    data-testid={`categoria-mp-editar-${c.id}`}
                    onClick={() => abrirEditar(c)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-transparent text-texto-3 transition hover:border-borde hover:bg-marca-suave hover:text-marca"
                  >
                    <Pencil size={16} />
                  </button>
                </Tooltip>
                <Tooltip text={c.activa ? 'Desactivar' : 'Activar'}>
                  <button
                    type="button"
                    data-testid={`categoria-mp-activa-${c.id}`}
                    onClick={() => activa.mutate({ id: c.id, activa: !c.activa })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-transparent text-texto-3 transition hover:border-borde hover:bg-marca-suave hover:text-marca"
                  >
                    <Power size={16} />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal crear/editar */}
      {dlg && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setDlg(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[16px] font-bold text-texto">
              {dlg.modo === 'editar' ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
            <input
              autoFocus
              data-testid="categoria-mp-input-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 50))}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              placeholder="Nombre de la categoría"
              className="w-full rounded-lg border border-campo-borde bg-campo px-3 py-2 text-[14px] text-texto outline-none focus:border-marca focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDlg(null)}
                className="rounded-full border border-borde bg-superficie px-4 py-2 text-[13px] font-semibold text-texto-2 hover:bg-marca-suave"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="categoria-mp-guardar"
                onClick={guardar}
                disabled={guardando || nombre.trim().length < 2}
                className="rounded-full bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeccionCategoriasMarketplace;
