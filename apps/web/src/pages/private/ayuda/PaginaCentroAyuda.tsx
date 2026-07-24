import { useMemo, useState } from 'react';
import { Search, HelpCircle, ChevronRight, ChevronLeft, Play, BookOpen, X } from 'lucide-react';

// Los íconos de categoría los define el Panel Admin y viajan como string desde
// la BD, así que ese caso puntual (IconoCategoria) sigue resolviéndose por API.
import { Icon as IconIconify } from '@iconify/react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUiStore } from '@/stores/useUiStore';
import { useNotificacionesStore } from '@/stores/useNotificacionesStore';
import { useCentroAyuda } from '@/hooks/queries/useAyuda';
import { TabsAudiencia, type TabAudiencia } from '@/components/ayuda/TabsAudiencia';
import { VistaArticulo } from '@/components/ayuda/VistaArticulo';
import { IconoMenuMorph } from '@/components/ui/IconoMenuMorph';
import { useVolverAtras } from '@/hooks/useVolverAtras';
import { useBackNativo } from '@/hooks/useBackNativo';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useScrollAppShell } from '@/hooks/useScrollAppShell';
import type { AppAyuda, AudienciaAyuda, AyudaArticulo, AyudaCategoria } from '@/types/ayuda';

// Ícono de notificaciones migrado a Iconify (mismo patrón que Mis Cupones).
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;

const TABS: { key: TabAudiencia; label: string; app: AppAyuda; audiencia: AudienciaAyuda }[] = [
  { key: 'app', label: 'AnunciaYA', app: 'anunciaya', audiencia: 'cliente' },
  { key: 'negocio', label: 'Business Studio', app: 'anunciaya', audiencia: 'comerciante' },
  { key: 'scanya', label: 'ScanYA', app: 'scanya', audiencia: 'comerciante' },
];

interface PaginaCentroAyudaProps {
  /** Fuerza una audiencia y oculta las pestañas (para embeber en ScanYA). */
  soloAudiencia?: TabAudiencia;
  /** Sin padding/ancho de página ni encabezado, para montarlo dentro de un drawer. */
  embebido?: boolean;
}

export function PaginaCentroAyuda({ soloAudiencia, embebido = false }: PaginaCentroAyudaProps = {}) {
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  // Un usuario con cuenta SOLO personal no ve las audiencias comerciales
  // ("Para mi negocio", "ScanYA"); solo "Para usar la app". Con cuenta comercial
  // ve las tres (esté en modo personal o comercial).
  const tieneModoComercial = useAuthStore((s) => !!s.usuario?.tieneModoComercial);
  const tabsVisibles = tieneModoComercial ? TABS : TABS.filter((t) => t.key === 'app');
  // Flecha ← del encabezado (solo en la página /ayuda, no embebida). Usa el
  // historial real; si se entró por URL directa, cae al fallback /inicio.
  const volver = useVolverAtras('/inicio');
  // App-shell propio solo en la página /ayuda (no cuando va embebida en un drawer de ScanYA).
  const cuerpoRef = useScrollAppShell(!embebido);
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);
  const [tab, setTab] = useState<TabAudiencia>(
    soloAudiencia ?? (modoActivo === 'comercial' ? 'negocio' : 'app'),
  );
  const [categoriaSelId, setCategoriaSelId] = useState<string | null>(null);
  const [articuloSelId, setArticuloSelId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // ── Back nativo por niveles (solo móvil · Receta 8) ─────────────────────
  // En móvil la sección es una pila de sub-vistas SIN cambiar la URL:
  //   categorías → lista de la categoría → artículo (video).
  // Cada nivel engancha una entrada al history para que el back del celular
  // (y la flecha ← del header, que hace navigate(-1)) cierre UNA capa a la
  // vez: video → lista de la categoría → categorías → salir a /inicio.
  // El artículo hereda la marca `_ayudaCategoria` (pushState conserva el
  // prevState), así que el back consume artículo → categoría en orden.
  // Inerte en desktop (2 columnas, sin capas que tapen) y embebido (ScanYA
  // ya maneja su propio back en el drawer).
  const { esMobile } = useBreakpoint();
  const backPorNiveles = esMobile && !embebido;
  useBackNativo({
    abierto: backPorNiveles && categoriaSelId !== null,
    onCerrar: () => setCategoriaSelId(null),
    discriminador: '_ayudaCategoria',
  });
  useBackNativo({
    abierto: backPorNiveles && articuloSelId !== null,
    onCerrar: () => setArticuloSelId(null),
    discriminador: '_ayudaArticulo',
  });

  const tabActual = TABS.find((t) => t.key === tab) ?? TABS[0];
  const { data: categorias = [], isLoading } = useCentroAyuda(tabActual.app, tabActual.audiencia);

  // Categoría seleccionada (por defecto, la primera).
  const categoriaSel = useMemo(() => {
    if (categoriaSelId) return categorias.find((c) => c.id === categoriaSelId) ?? categorias[0] ?? null;
    return categorias[0] ?? null;
  }, [categorias, categoriaSelId]);

  const q = busqueda.trim().toLowerCase();

  // Artículos a mostrar: resultados de búsqueda (todas las categorías) o los
  // de la categoría seleccionada.
  const articulosVisibles: AyudaArticulo[] = useMemo(() => {
    if (q) {
      return categorias.flatMap((c) => c.articulos).filter((a) => a.pregunta.toLowerCase().includes(q));
    }
    return categoriaSel?.articulos ?? [];
  }, [q, categorias, categoriaSel]);

  const articuloSel = useMemo(
    () =>
      articuloSelId
        ? categorias.flatMap((c) => c.articulos).find((a) => a.id === articuloSelId) ?? null
        : null,
    [articuloSelId, categorias],
  );

  const nombreCategoriaDe = (art: AyudaArticulo) =>
    categorias.find((c) => c.id === art.categoriaId)?.nombre ?? '';

  const cambiarTab = (t: TabAudiencia) => {
    setTab(t);
    setCategoriaSelId(null);
    setArticuloSelId(null);
    setBusqueda('');
  };

  const seleccionarCategoria = (id: string) => {
    setCategoriaSelId(id);
    setArticuloSelId(null);
    setBusqueda('');
  };

  // Buscador (reutilizado en la página completa y en el modo embebido).
  const buscador = (
    <div className="relative lg:w-[28rem] 2xl:w-[32rem]">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        strokeWidth={2.4}
      />
      <input
        data-testid="ayuda-buscador"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setArticuloSelId(null);
        }}
        placeholder="¿Con qué te ayudamos?"
        className="w-full rounded-full border-2 border-slate-300 bg-white py-2.5 pl-11 pr-11 text-base font-medium text-slate-800 placeholder:text-slate-500 outline-none focus:border-sky-400 lg:text-sm 2xl:text-base"
      />
      {busqueda && (
        <button
          type="button"
          data-testid="ayuda-buscador-limpiar"
          onClick={() => {
            setBusqueda('');
            setArticuloSelId(null);
          }}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 text-slate-500 lg:cursor-pointer lg:hover:bg-slate-300 lg:hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );

  // Contenido principal (loading / vacío / grid desktop + lista móvil) — común a ambos modos.
  const contenido = isLoading ? (
    <div
      data-testid="ayuda-cargando"
      className="rounded-xl border border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500"
    >
      Cargando…
    </div>
  ) : categorias.length === 0 ? (
    <div
      data-testid="ayuda-vacio"
      className="rounded-xl border border-slate-300 bg-white p-8 text-center"
    >
      <p className="text-sm font-semibold text-slate-600">
        Pronto encontrarás aquí tutoriales para esta sección.
      </p>
    </div>
  ) : (
    <>
      {/* ===== Escritorio: 2 columnas ===== */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[240px_1fr] 2xl:grid-cols-[280px_1fr] 2xl:gap-6">
        <aside className="self-start space-y-0.5 rounded-xl border border-slate-300 bg-white p-2 shadow-sm">
          {categorias.map((c) => (
            <BotonCategoria
              key={c.id}
              categoria={c}
              activa={!busqueda && categoriaSel?.id === c.id}
              onClick={() => seleccionarCategoria(c.id)}
            />
          ))}
        </aside>
        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
          {articuloSel ? (
            <VistaArticulo articulo={articuloSel} categoriaNombre={nombreCategoriaDe(articuloSel)} />
          ) : (
            <ListaFichas
              titulo={busqueda ? `Resultados para "${busqueda}"` : categoriaSel?.nombre ?? ''}
              articulos={articulosVisibles}
              onAbrir={(a) => setArticuloSelId(a.id)}
            />
          )}
        </section>
      </div>

      {/* ===== Móvil: lista → detalle ===== */}
      <div className="lg:hidden">
        {articuloSel ? (
          <VistaArticulo
            articulo={articuloSel}
            categoriaNombre={nombreCategoriaDe(articuloSel)}
            onVolver={() => setArticuloSelId(null)}
          />
        ) : busqueda ? (
          <ListaFichas
            titulo={`Resultados para "${busqueda}"`}
            articulos={articulosVisibles}
            onAbrir={(a) => setArticuloSelId(a.id)}
          />
        ) : categoriaSelId ? (
          <div>
            <button
              onClick={() => setCategoriaSelId(null)}
              className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              Categorías
            </button>
            <ListaFichas
              titulo={categoriaSel?.nombre ?? ''}
              articulos={articulosVisibles}
              onAbrir={(a) => setArticuloSelId(a.id)}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {categorias.map((c) => (
              <TarjetaCategoriaMovil key={c.id} categoria={c} onClick={() => seleccionarCategoria(c.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  // ── Modo embebido (drawer de ScanYA): sin header de identidad ──
  if (embebido) {
    return (
      <div data-testid="pagina-centro-ayuda" className="p-4">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {!soloAudiencia && tabsVisibles.length > 1 && <TabsAudiencia activa={tab} onChange={cambiarTab} opciones={tabsVisibles} />}
          {buscador}
        </div>
        {contenido}
      </div>
    );
  }

  // ── Página completa: header con identidad (acento sky) ──
  const totalTutoriales = categorias.reduce((n, c) => n + c.articulos.length, 0);
  return (
    <div data-testid="pagina-centro-ayuda" className="flex flex-col h-full lg:block lg:h-auto lg:min-h-full">
      {/* ── Header con identidad (acento sky) — en móvil bloque fijo (shrink-0) FUERA del scroll
           (app-shell propio, como BS); en desktop sticky arriba. ── */}
      <div className="shrink-0 z-20 lg:sticky lg:top-0">
        <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
          <div className="relative overflow-hidden rounded-none lg:rounded-b-3xl" style={{ background: '#000000' }}>
            {/* Glow sky */}
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(14,165,233,0.10) 0%, transparent 55%)' }} />
            {/* Grid pattern sutil */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: 0.08,
                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
              }}
            />
            {/* Línea de acento superior (sky) */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
              style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9 40%, #38bdf8 60%, transparent)' }}
            />
            {/* Línea de acento inferior (sky) */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
              style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9 40%, #38bdf8 60%, transparent)' }}
            />

            <div className="relative z-10">
              {/* ══ MOBILE (< lg) ══ */}
              <div className="lg:hidden">
                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="btn-volver-ayuda"
                      onClick={volver}
                      aria-label="Volver"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
                      <HelpCircle className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
                    </div>
                    <span className="truncate text-2xl font-extrabold tracking-tight text-white">
                      Ayuda y <span className="text-sky-400">Tutoriales</span>
                    </span>
                  </div>
                  <div className="-mr-1 flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                      aria-label="Notificaciones"
                      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <Bell className="h-6 w-6 animate-bell-ring" strokeWidth={2.5} />
                      {cantidadNoLeidas > 0 && (
                        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-black">
                          {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={abrirMenuDrawer}
                      aria-label="Menú"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <IconoMenuMorph />
                    </button>
                  </div>
                </div>
                {/* Subtítulo móvil */}
                <div className="flex items-center justify-center gap-2.5 pb-3">
                  <div className="h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.7))' }} />
                  <span className="text-base font-light tracking-wide text-white/70">
                    Todo lo que <span className="font-bold text-white">necesitas saber</span>
                  </span>
                  <div className="h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.7), transparent)' }} />
                </div>
              </div>

              {/* ══ LAPTOP HEADER (lg únicamente — PC conserva el diseño
                  original abajo) — fila única compacta, mismo tamaño que
                  las páginas de sección: back+logo+título a la izquierda,
                  chips de audiencia a la derecha. Sin subtítulo ni contador. ══ */}
              <div className="hidden lg:flex 2xl:hidden items-center justify-between gap-4 px-4 py-2.5">
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="btn-volver-ayuda-laptop"
                    onClick={volver}
                    aria-label="Volver"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer hover:bg-white/10 hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
                    <HelpCircle className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
                  </div>
                  <span className="ml-1.5 text-xl font-extrabold tracking-tight text-white">
                    Ayuda y <span className="text-sky-400">Tutoriales</span>
                  </span>
                </div>

                {!soloAudiencia && tabsVisibles.length > 1 && (
                  <div className="flex shrink-0 items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {tabsVisibles.map((t) => {
                      const on = tab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          data-testid={`ayuda-tab-laptop-${t.key}`}
                          onClick={() => cambiarTab(t.key)}
                          aria-pressed={on}
                          className={`shrink-0 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-all lg:cursor-pointer ${
                            on
                              ? 'border-sky-400 bg-sky-500 text-white shadow-md shadow-sky-500/20'
                              : 'border-white/15 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ══ PC HEADER (>= 2xl) — layout original sin tocar ══ */}
              <div className="hidden 2xl:block">
                <div className="flex items-center justify-between gap-6 px-6 py-4 2xl:px-8 2xl:py-5">
                  {/* Izquierda: flecha + logo + título */}
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      data-testid="btn-volver-ayuda-desktop"
                      onClick={volver}
                      aria-label="Volver"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg 2xl:h-12 2xl:w-12" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
                      <HelpCircle className="h-6 w-6 text-white 2xl:h-[26px] 2xl:w-[26px]" strokeWidth={2.4} />
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-white 2xl:text-3xl">
                      Ayuda y <span className="text-sky-400">Tutoriales</span>
                    </span>
                  </div>

                  {/* Centro: subtítulo + label */}
                  <div className="min-w-0 flex-1 text-center">
                    <p className="truncate text-3xl font-light leading-tight text-white/70 2xl:text-[34px]">
                      Todo lo que <span className="font-bold text-white">necesitas saber</span>
                    </p>
                    <div className="mt-1.5 flex items-center justify-center gap-3">
                      <div className="h-0.5 w-20 rounded-full 2xl:w-24" style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.7))' }} />
                      <span className="text-sm font-semibold uppercase tracking-[3px] text-sky-400/70 2xl:text-base">Centro de ayuda</span>
                      <div className="h-0.5 w-20 rounded-full 2xl:w-24" style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.7), transparent)' }} />
                    </div>
                  </div>

                  {/* Derecha: contador de tutoriales de la audiencia activa */}
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="text-2xl font-extrabold leading-none text-sky-400 2xl:text-3xl">{totalTutoriales}</span>
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/40 2xl:text-sm">Tutoriales</span>
                  </div>
                </div>
              </div>

              {/* ── Tabs de audiencia (chips sobre negro) — solo si hay más de una ──
                  En laptop se ocultan: quedan fusionados en el header delgado
                  de arriba. Móvil y PC sin cambios. ── */}
              {!soloAudiencia && tabsVisibles.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3 lg:hidden 2xl:flex lg:px-6 lg:pb-3 2xl:px-8 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  <span className="shrink-0 text-sm font-semibold text-white/50">Cómo usar:</span>
                  {tabsVisibles.map((t) => {
                    const on = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        data-testid={`ayuda-tab-${t.key}`}
                        onClick={() => cambiarTab(t.key)}
                        aria-pressed={on}
                        className={`shrink-0 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-all lg:cursor-pointer ${
                          on
                            ? 'border-sky-400 bg-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'border-white/15 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo — en móvil contenedor con scroll propio (flex-1 + overflow); en desktop
           bloque normal (scroll en la columna central del layout). ── */}
      <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-24 lg:flex-none lg:overflow-visible lg:mx-auto lg:max-w-7xl lg:p-6 2xl:p-8">
        <div className="mb-5">{buscador}</div>
        {contenido}
      </div>
    </div>
  );
}

export default PaginaCentroAyuda;

// =============================================================================
// Subcomponentes
// =============================================================================

function IconoCategoria({ icono, className }: { icono: string | null; className?: string }) {
  // `icono` es un nombre de Iconify (ej. "ph:storefront") que el Panel Admin
  // guarda en BD por categoría. Al ser dinámico no puede resolverse a un
  // componente de lucide en build, así que este SÍ va por la API de Iconify.
  if (icono) return <IconIconify icon={icono} className={className} />;
  return <BookOpen className={className} strokeWidth={2.2} />;
}

function BotonCategoria({
  categoria,
  activa,
  onClick,
}: {
  categoria: AyudaCategoria;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`ayuda-categoria-${categoria.id}`}
      className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2.5 pl-3 pr-2 text-left text-sm font-semibold transition-colors lg:cursor-pointer 2xl:gap-3 2xl:py-3 2xl:text-[15px] ${
        activa ? 'bg-sky-50 text-sky-700' : 'text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900'
      }`}
    >
      {/* Indicador lateral del activo */}
      <span
        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sky-500 transition-opacity ${
          activa ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <IconoCategoria
        icono={categoria.icono}
        className={`h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5 ${activa ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-500'}`}
      />
      <span className="flex-1 truncate">{categoria.nombre}</span>
      <span
        className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
          activa ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {categoria.articulos.length}
      </span>
    </button>
  );
}

function fmtDuracion(seg: number | null): string | null {
  if (!seg || seg <= 0) return null;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Miniatura del tutorial. Siempre 16:9 (horizontal) para que todas las fichas
 * se vean parejas, sin importar cómo se grabó el video. El póster se recorta
 * con object-cover.
 */
function MiniaturaTutorial({ posterUrl, dur }: { posterUrl: string | null; dur: string | null }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-800">
      {posterUrl && (
        <img src={posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition group-hover:bg-sky-500 2xl:h-14 2xl:w-14">
          <Play className="ml-0.5 h-5 w-5 text-white 2xl:h-7 2xl:w-7" fill="currentColor" strokeWidth={0} />
        </span>
      </span>
      {dur && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
          {dur}
        </span>
      )}
    </div>
  );
}

function ListaFichas({
  titulo,
  articulos,
  onAbrir,
}: {
  titulo: string;
  articulos: AyudaArticulo[];
  onAbrir: (a: AyudaArticulo) => void;
}) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900 2xl:text-xl">
        <span className="h-5 w-1.5 shrink-0 rounded-full bg-sky-500 2xl:h-6" />
        {titulo}
      </h2>
      {articulos.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-8 text-center 2xl:min-h-[280px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-400 ring-8 ring-sky-50/60">
            <Search className="h-7 w-7" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700">Sin resultados</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm font-medium text-slate-500">
              No encontramos tutoriales que coincidan con tu búsqueda.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {articulos.map((a) => {
            const dur = fmtDuracion(a.duracionSeg);
            return (
              <button
                key={a.id}
                onClick={() => onAbrir(a)}
                data-testid={`ayuda-ficha-${a.id}`}
                className="group flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-2.5 text-left shadow-sm lg:cursor-pointer lg:hover:border-sky-400 lg:hover:shadow"
              >
                <MiniaturaTutorial posterUrl={a.posterUrl} dur={dur} />
                <span className="line-clamp-2 px-0.5 pb-0.5 text-base font-semibold leading-snug text-slate-800 2xl:text-lg">
                  {a.pregunta}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TarjetaCategoriaMovil({
  categoria,
  onClick,
}: {
  categoria: AyudaCategoria;
  onClick: () => void;
}) {
  const n = categoria.articulos.length;
  return (
    <button
      onClick={onClick}
      data-testid={`ayuda-categoria-mov-${categoria.id}`}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 text-left shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
        <IconoCategoria icono={categoria.icono} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{categoria.nombre}</p>
        <p className="text-xs font-medium text-slate-500">
          {n} video{n === 1 ? '' : 's'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2.4} />
    </button>
  );
}
