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

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Plus, Pencil, Power, Search, X, MapPin, Tag } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import {
  useCatalogoMarketplace,
  useMarketplacePorCiudad,
  useCrearCategoriaMP,
  useEditarCategoriaMP,
  useCambiarActivaCategoriaMP,
} from '../../hooks/queries/useCategoriasMPAdmin';
import { useCiudadesLista } from '../../hooks/queries/useCiudadesAdmin';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import type { CategoriaMarketplaceAdmin } from '../../services/categoriasMarketplaceService';

type Dlg = { modo: 'crear' | 'editar'; categoria: CategoriaMarketplaceAdmin | null } | null;

const ESTADOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'activas', label: 'Activas' },
  { id: 'inactivas', label: 'Inactivas' },
] as const;

// KPI compacto (patrón del Panel): etiqueta uppercase arriba + valor bold abajo, centrado.
function Kpi({ valor, etiqueta, testid }: { valor: number; etiqueta: string; testid?: string }) {
  return (
    <div data-testid={testid} className="flex min-w-[84px] shrink-0 snap-start flex-col items-center px-3.5 text-center leading-tight lg:px-4">
      <span className="txt-badge whitespace-nowrap font-semibold uppercase tracking-wide text-texto-4 lg:text-[11px]">{etiqueta}</span>
      <span className="mt-1 whitespace-nowrap text-[17px] font-bold tabular-nums text-texto lg:text-[22px]">{valor}</span>
    </div>
  );
}

export function SeccionCategoriasMarketplace({ crearRef }: { crearRef: MutableRefObject<(() => void) | null> }) {
  // Filtro por ciudad (analítica): '' = todas.
  const [ciudadSel, setCiudadSel] = useState('');
  const { data: catalogo = [], isLoading, isError, isFetching } = useCatalogoMarketplace(
    ciudadSel || undefined,
  );
  const { data: ciudades = [] } = useCiudadesLista({ activa: 'activas' });
  const { data: porCiudad } = useMarketplacePorCiudad();
  const opcionesCiudad = useMemo<OpcionMenu[]>(() => {
    const conteo = (id: string) => porCiudad?.find((p) => p.ciudadId === id)?.total ?? 0;
    return [
      { valor: '', etiqueta: 'Todas las ciudades', conteo: conteo('') },
      ...ciudades.map((c) => ({ valor: c.id, etiqueta: c.nombre, conteo: conteo(c.id) })),
    ];
  }, [ciudades, porCiudad]);
  const etiquetaCiudad =
    opcionesCiudad.find((o) => o.valor === ciudadSel)?.etiqueta ?? 'Todas las ciudades';
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'inactivas'>('todas');

  // Registra el contenedor scrolleable (vista móvil) para el auto-ocultado de la barra inferior.
  const esEscritorio = useEsEscritorio();
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);
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
  // El botón "+ Nueva categoría" vive en la barra de tabs (wrapper); aquí se registra su acción.
  useEffect(() => {
    crearRef.current = abrirCrear;
    return () => { crearRef.current = null; };
  }, [crearRef]);
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
      {/* Barra: buscador + filtros + KPIs (el botón "Nueva" vive en la barra de tabs) */}
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
              className="w-full rounded-full border border-campo-borde bg-campo py-2.5 pl-10 pr-8 text-[13.5px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar" onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-texto-4 transition hover:bg-marca-suave hover:text-marca">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Botón + solo en móvil (en escritorio vive en la barra de tabs). */}
          <button
            type="button"
            data-testid="categoria-mp-nueva-movil"
            onClick={() => crearRef.current?.()}
            aria-label="Nueva categoría"
            className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95 lg:hidden"
          >
            <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
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
            const color = e.id === 'activas' ? 'var(--panel-ok)' : e.id === 'inactivas' ? 'var(--panel-text-4)' : 'var(--panel-brand)';
            const n = e.id === 'activas' ? catalogo.filter((c) => c.activa).length
              : e.id === 'inactivas' ? catalogo.filter((c) => !c.activa).length
                : catalogo.length;
            return (
              <button
                key={e.id}
                type="button"
                data-testid={`categorias-mp-filtro-${e.id}`}
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

        {isFetching && !isLoading && <span className="hidden text-[12px] text-texto-4 lg:inline">actualizando…</span>}
        {!isLoading && !isError && (
          <div className="-mx-1 flex shrink-0 items-stretch overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:ml-auto lg:overflow-visible lg:px-0">
            <Kpi valor={kpisPub.total} etiqueta="Publicaciones" testid="kpi-mp-total" />
            <span className="w-px shrink-0 self-stretch bg-borde" />
            <Kpi valor={kpisPub.venta} etiqueta="En venta" testid="kpi-mp-venta" />
            <span className="w-px shrink-0 self-stretch bg-borde" />
            <Kpi valor={kpisPub.busca} etiqueta="Buscando" testid="kpi-mp-busca" />
          </div>
        )}
      </div>

      {/* Tabla — mismo patrón que Categorías·Negocios: card con borde+sombra,
          header de columnas fijo (escritorio) y cuerpo con scroll interno debajo. */}
      {isLoading ? (
        <div className="grid flex-1 place-items-center text-[13px] text-texto-3">Cargando…</div>
      ) : isError ? (
        <div className="grid flex-1 place-items-center text-[13px] text-texto-2">No se pudo cargar el catálogo.</div>
      ) : vista.length === 0 ? (
        <div className="grid flex-1 place-items-center text-[13px] text-texto-3">Sin categorías.</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-superficie lg:rounded-[14px] lg:border lg:border-borde lg:shadow-tarjeta-panel">
          {/* Encabezado de columnas (escritorio) */}
          <div className="hidden shrink-0 items-center gap-4 border-b border-borde bg-superficie-2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4 lg:flex">
            <span className="flex-1">Categoría</span>
            <span className="w-24 text-center">En venta</span>
            <span className="w-24 text-center">Buscando</span>
            <span className="w-24 text-center">Acciones</span>
          </div>

          {/* Cuerpo con scroll interno (debajo del header) */}
          <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
            {vista.map((c) => (
              <div
                key={c.id}
                data-testid={`categoria-mp-${c.id}`}
                className={`flex items-center gap-4 border-b border-borde px-4 py-3 transition ${!c.activa ? 'bg-[var(--panel-warn-weak)] hover:bg-[var(--panel-warn-weak)]' : 'hover:bg-marca-suave/40'}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Línea 1: nombre + estado (el nombre trunca si hace falta). */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="min-w-0 truncate text-[14.5px] font-semibold text-texto">{c.nombre}</span>
                    {!c.activa && <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-4">Inactiva</span>}
                  </div>
                  {/* Línea 2 (solo móvil): venta + busca. En escritorio van en sus columnas. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:hidden">
                    <span title="Publicaciones en venta" className="rounded-full bg-marca-suave px-2.5 py-1 text-[12px] font-semibold text-marca tabular-nums">{c.totalVendo} venta</span>
                    <span title="Publicaciones buscando (demanda)" className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-700 tabular-nums">{c.totalBusco} busca</span>
                  </div>
                </div>
                {/* Escritorio: columnas En venta / Buscando (oferta vs demanda por color). */}
                <span className="hidden w-24 justify-center lg:flex">
                  <span title="Publicaciones en venta" className="rounded-full bg-marca-suave px-2.5 py-1 text-[13px] font-semibold text-marca tabular-nums">{c.totalVendo}</span>
                </span>
                <span className="hidden w-24 justify-center lg:flex">
                  <span title="Publicaciones buscando (demanda)" className="rounded-full bg-amber-100 px-2.5 py-1 text-[13px] font-semibold text-amber-700 tabular-nums">{c.totalBusco}</span>
                </span>
                {/* Acciones */}
                <div className="flex w-auto shrink-0 items-center justify-end gap-1 lg:w-24 lg:justify-center">
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
                      <Power size={16} className={c.activa ? 'text-verde' : 'text-texto-4'} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar — modal adaptativo del Panel (centrado en desktop,
          bottom-sheet en móvil), igual que los diálogos de Negocios. */}
      <ModalAdaptativo
        abierto={!!dlg}
        onCerrar={() => setDlg(null)}
        ancho="sm"
        titulo={dlg?.modo === 'editar' ? 'Editar categoría' : 'Nueva categoría'}
        iconoTitulo={<Tag size={18} className="text-marca" />}
        discriminador="categoria-mp-editar"
      >
        <div className="p-5">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Nombre</label>
          <input
            autoFocus
            data-testid="categoria-mp-input-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 50))}
            onKeyDown={(e) => e.key === 'Enter' && guardar()}
            placeholder="Ej. Vehículos"
            maxLength={50}
            className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDlg(null)}
              disabled={guardando}
              className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="categoria-mp-guardar"
              onClick={guardar}
              disabled={guardando || nombre.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : dlg?.modo === 'editar' ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </ModalAdaptativo>
    </div>
  );
}

export default SeccionCategoriasMarketplace;
