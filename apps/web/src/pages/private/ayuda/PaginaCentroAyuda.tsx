import { useMemo, useState } from 'react';
import { Search, HelpCircle, ChevronRight, ChevronLeft, Play, BookOpen } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCentroAyuda } from '@/hooks/queries/useAyuda';
import { TabsAudiencia, type TabAudiencia } from '@/components/ayuda/TabsAudiencia';
import { VistaArticulo } from '@/components/ayuda/VistaArticulo';
import type { AppAyuda, AudienciaAyuda, AyudaArticulo, AyudaCategoria } from '@/types/ayuda';

const TABS: { key: TabAudiencia; label: string; app: AppAyuda; audiencia: AudienciaAyuda }[] = [
  { key: 'app', label: 'Para usar la app', app: 'anunciaya', audiencia: 'cliente' },
  { key: 'negocio', label: 'Para mi negocio', app: 'anunciaya', audiencia: 'comerciante' },
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
  const [tab, setTab] = useState<TabAudiencia>(
    soloAudiencia ?? (modoActivo === 'comercial' ? 'negocio' : 'app'),
  );
  const [categoriaSelId, setCategoriaSelId] = useState<string | null>(null);
  const [articuloSelId, setArticuloSelId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

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

  return (
    <div
      data-testid="pagina-centro-ayuda"
      className={embebido ? 'p-4' : 'p-4 lg:mx-auto lg:max-w-6xl lg:p-6 2xl:p-8'}
    >
      {/* Encabezado — se oculta al embeber (el drawer provee su propio título) */}
      {!embebido && (
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <HelpCircle className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 2xl:text-3xl">
              Ayuda y Tutoriales
            </h1>
            <p className="text-sm font-medium text-slate-600 2xl:text-base">
              Aprende a sacarle todo el provecho a AnunciaYA.
            </p>
          </div>
        </div>
      )}

      {/* Pestañas de audiencia + buscador */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!soloAudiencia && <TabsAudiencia activa={tab} onChange={cambiarTab} opciones={TABS} />}
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
            className="w-full rounded-full border-2 border-slate-300 bg-white py-2.5 pl-11 pr-4 text-base font-medium text-slate-800 placeholder:text-slate-500 lg:text-sm 2xl:text-base"
          />
        </div>
      </div>

      {isLoading ? (
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
          <div className="hidden gap-5 lg:grid lg:grid-cols-[210px_1fr]">
            <aside className="self-start rounded-xl border border-slate-300 bg-white p-1.5 shadow-sm">
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
      )}
    </div>
  );
}

export default PaginaCentroAyuda;

// =============================================================================
// Subcomponentes
// =============================================================================

function IconoCategoria({ icono, className }: { icono: string | null; className?: string }) {
  if (icono) return <Icon icon={icono} className={className} />;
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
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold lg:cursor-pointer ${
        activa ? 'bg-blue-100 text-blue-700' : 'text-slate-700 lg:hover:bg-slate-100'
      }`}
    >
      <IconoCategoria
        icono={categoria.icono}
        className={`h-4 w-4 shrink-0 ${activa ? 'text-blue-600' : 'text-slate-400'}`}
      />
      <span className="flex-1 truncate">{categoria.nombre}</span>
      <span className={`text-[11px] font-bold ${activa ? 'text-blue-600' : 'text-slate-400'}`}>
        {categoria.articulos.length}
      </span>
    </button>
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
  if (articulos.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-semibold text-slate-500">
        No hay tutoriales aquí todavía.
      </p>
    );
  }
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</h2>
      <div className="space-y-2">
        {articulos.map((a) => (
          <button
            key={a.id}
            onClick={() => onAbrir(a)}
            data-testid={`ayuda-ficha-${a.id}`}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-300 bg-white p-3 text-left lg:cursor-pointer lg:hover:border-blue-400"
          >
            <Play className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.2} />
            <span className="flex-1 text-sm font-semibold text-slate-800">{a.pregunta}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.4} />
          </button>
        ))}
      </div>
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
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
