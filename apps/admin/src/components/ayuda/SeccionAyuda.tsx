/**
 * SeccionAyuda.tsx
 * ================
 * Módulo "Ayuda y Tutoriales" del Panel (solo superadmin). Panel de producción:
 * KPIs (cifra dominante) + barra de avance de grabación + filtros (app / audiencia
 * / sin video / búsqueda) + categorías en acordeón con mini-progreso, y gestión
 * (crear/editar/borrar) vía diálogos.
 *
 * Ubicación: apps/admin/src/components/ayuda/SeccionAyuda.tsx
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  VideoOff,
  AlertTriangle,
  GraduationCap,
  X,
} from 'lucide-react';
import {
  useAyudaLista,
  useBorrarCategoria,
  useBorrarArticulo,
} from '../../hooks/queries/useAyudaAdmin';
import {
  SECCIONES,
  SECCION_LABEL,
  seccionDeCategoria,
  type CategoriaAdmin,
  type ArticuloAdmin,
  type SeccionAyuda,
} from '../../services/ayudaService';
import { DialogoCategoria } from './DialogoCategoria';
import { DialogoArticulo } from './DialogoArticulo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import { MenuAcciones } from '../ciudades/MenuAcciones';

const BTN_NUEVO =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste hover:brightness-105';

// Botones-ícono circulares de color (patrón calcado de Territorios): acción por color.
const BTN_CIRC = 'grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:opacity-80';
const BTN_EDIT_CIRC = `${BTN_CIRC} bg-marca-suave text-marca`;
const BTN_DEL_CIRC = `${BTN_CIRC} bg-peligro-suave text-peligro`;

type FiltroSeccion = '' | SeccionAyuda;

/** Minúsculas y sin acentos, para búsqueda tolerante a tildes. */
function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Duración en mm:ss (o null si no hay). */
function fmtDuracion(seg: number | null): string | null {
  if (!seg || seg <= 0) return null;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MQ_LG = '(min-width: 1024px)';
const MQ_2XL = '(min-width: 1536px)';

/**
 * Nº de columnas del mosaico de categorías: 1 (móvil) · 3 (laptop) · 4 (escritorio).
 * Se reparte en columnas flex independientes (no CSS grid) para que expandir una
 * categoría solo desplace a las de su MISMA columna, sin afectar a las vecinas.
 */
function useNumColumnas(): number {
  const calc = () => {
    if (typeof window === 'undefined') return 4;
    if (window.matchMedia(MQ_2XL).matches) return 4;
    if (window.matchMedia(MQ_LG).matches) return 3;
    return 1;
  };
  const [n, setN] = useState<number>(calc);
  useEffect(() => {
    const mqs = [window.matchMedia(MQ_LG), window.matchMedia(MQ_2XL)];
    const alCambiar = () => setN(calc());
    mqs.forEach((mq) => mq.addEventListener('change', alCambiar));
    return () => mqs.forEach((mq) => mq.removeEventListener('change', alCambiar));
  }, []);
  return n;
}

export function SeccionAyuda() {
  const { data, isLoading } = useAyudaLista();
  const borrarCat = useBorrarCategoria();
  const borrarArt = useBorrarArticulo();
  const cats = useMemo(() => data ?? [], [data]);

  const [dlgCat, setDlgCat] = useState<{ categoria: CategoriaAdmin | null } | null>(null);
  const [dlgArt, setDlgArt] = useState<{ articulo: ArticuloAdmin | null; categoriaId?: string } | null>(null);
  const [confirmar, setConfirmar] = useState<{ tipo: 'categoria' | 'articulo'; id: string; nombre: string } | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState<FiltroSeccion>('');
  const [soloSinVideo, setSoloSinVideo] = useState(false);
  // Acordeón exclusivo: solo una categoría abierta a la vez (arranca comprimido).
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<ArticuloAdmin | null>(null);

  const alternarExpansion = (id: string) =>
    setExpandidaId((prev) => (prev === id ? null : id));

  // KPIs globales del módulo (no dependen de los filtros: son el panorama).
  const kpis = useMemo(() => {
    let total = 0;
    let conVideo = 0;
    let publicados = 0;
    for (const c of cats) {
      for (const a of c.articulos) {
        total++;
        if (a.videoUrl) conVideo++;
        if (a.publicado) publicados++;
      }
    }
    const sinVideo = total - conVideo;
    const pct = total ? Math.round((conVideo / total) * 100) : 0;
    return { total, conVideo, sinVideo, publicados, pct };
  }, [cats]);

  const q = normaliza(busqueda.trim());
  const hayFiltroArticulo = soloSinVideo || q.length > 0;

  const catsFiltradas = useMemo(() => {
    const res: { categoria: CategoriaAdmin; articulos: ArticuloAdmin[] }[] = [];
    for (const c of cats) {
      if (filtroSeccion && seccionDeCategoria(c.app, c.audiencia) !== filtroSeccion) continue;
      const articulos = c.articulos.filter((a) => {
        if (soloSinVideo && a.videoUrl) return false;
        if (q && !normaliza(a.pregunta).includes(q)) return false;
        return true;
      });
      if (hayFiltroArticulo && articulos.length === 0) continue;
      res.push({ categoria: c, articulos });
    }
    return res;
  }, [cats, filtroSeccion, soloSinVideo, q, hayFiltroArticulo]);

  // Reparto en columnas flex independientes (round-robin, conserva el orden de
  // lectura fila por fila). Cada columna fluye por su cuenta al expandir.
  const numColumnas = useNumColumnas();
  const columnas = useMemo(() => {
    const cols: { categoria: CategoriaAdmin; articulos: ArticuloAdmin[] }[][] = Array.from(
      { length: numColumnas },
      () => [],
    );
    catsFiltradas.forEach((item, i) => cols[i % numColumnas].push(item));
    return cols;
  }, [catsFiltradas, numColumnas]);

  const onConfirmarBorrado = () => {
    if (!confirmar) return;
    const onSuccess = () => setConfirmar(null);
    if (confirmar.tipo === 'categoria') borrarCat.mutate(confirmar.id, { onSuccess });
    else borrarArt.mutate(confirmar.id, { onSuccess });
  };

  return (
    <div className="h-full overflow-y-auto p-5" data-testid="seccion-ayuda">
      {/* ═══ Barra de controles — 1 sola fila (botón + KPIs + producción + buscador + filtros) ═══ */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          className={`${BTN_NUEVO} shrink-0`}
          onClick={() => setDlgCat({ categoria: null })}
          data-testid="ayuda-nueva-categoria"
        >
          <Plus className="h-4 w-4" /> Nueva categoría
        </button>

        {!isLoading && cats.length > 0 && (
          <>
            {/* KPIs compactos (número + etiqueta, divididos) */}
            <div className="flex shrink-0 items-stretch divide-x divide-borde rounded-[10px] border border-borde bg-superficie py-1">
              <KpiInline etiqueta="Tutoriales" valor={kpis.total} />
              <KpiInline etiqueta="Con video" valor={kpis.conVideo} color="var(--panel-ok)" />
              <KpiInline etiqueta="Sin video" valor={kpis.sinVideo} color="var(--panel-warn)" />
              <KpiInline etiqueta="Publicados" valor={kpis.publicados} color="var(--panel-brand)" />
            </div>

            {/* Producción de video (compacta) */}
            <div
              className="flex shrink-0 items-center gap-2 rounded-[10px] border border-borde bg-superficie px-3 py-2"
              title={`${kpis.conVideo} de ${kpis.total} grabados`}
            >
              <span className="text-[11.5px] text-texto-3">Grabados</span>
              <span className="block h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'var(--panel-border)' }}>
                <span className="block h-full rounded-full bg-ok" style={{ width: `${kpis.pct}%` }} />
              </span>
              <span className="text-[11.5px] font-semibold tabular-nums text-texto-2">{kpis.pct}%</span>
            </div>

            {/* Buscador */}
            <div className="relative w-full min-w-[160px] flex-1 lg:w-[220px] lg:flex-none 2xl:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-4" />
              <input
                data-testid="ayuda-buscar"
                className="w-full rounded-[10px] border border-campo-borde bg-campo py-2 pl-9 pr-3 text-[13px] text-texto outline-none placeholder:text-texto-4 focus:border-marca focus:bg-superficie"
                placeholder="Buscar tutorial…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Filtros */}
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {SECCIONES.map((s) => (
                <ChipFiltro
                  key={s.valor}
                  testid={`filtro-seccion-${s.valor}`}
                  activo={filtroSeccion === s.valor}
                  onClick={() => setFiltroSeccion((p) => (p === s.valor ? '' : s.valor))}
                >
                  {s.label}
                </ChipFiltro>
              ))}
              <ChipFiltro
                testid="filtro-sin-video"
                activo={soloSinVideo}
                onClick={() => setSoloSinVideo((v) => !v)}
              >
                <VideoOff className="h-3.5 w-3.5" /> Sin video
              </ChipFiltro>
            </div>
          </>
        )}
      </div>

      {/* ═══ Categorías — hasta 4 columnas, a todo el ancho ═══ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-texto-3">Cargando…</div>
      ) : cats.length === 0 ? (
        <div className="rounded-[12px] border border-borde bg-superficie p-8 text-center text-[13px] text-texto-3">
          Aún no hay categorías. Crea la primera con “Nueva categoría”.
        </div>
      ) : catsFiltradas.length === 0 ? (
        <div className="rounded-[12px] border border-borde bg-superficie p-8 text-center text-[13px] text-texto-3">
          Ningún tutorial coincide con los filtros.
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {columnas.map((col, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3">
              {col.map(({ categoria, articulos }) => (
                <TarjetaCategoria
                  key={categoria.id}
                  categoria={categoria}
                  articulos={articulos}
                  abierta={expandidaId === categoria.id || hayFiltroArticulo}
                  onAlternar={() => alternarExpansion(categoria.id)}
                  onEditar={() => setDlgCat({ categoria })}
                  onBorrar={() => setConfirmar({ tipo: 'categoria', id: categoria.id, nombre: categoria.nombre })}
                  onNuevoArticulo={() => setDlgArt({ articulo: null, categoriaId: categoria.id })}
                  onEditarArticulo={(art) => setDlgArt({ articulo: art })}
                  onBorrarArticulo={(art) => setConfirmar({ tipo: 'articulo', id: art.id, nombre: art.pregunta })}
                  onReproducirArticulo={(art) => setVideoLightbox(art)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {videoLightbox && (
        <LightboxVideo articulo={videoLightbox} onCerrar={() => setVideoLightbox(null)} />
      )}

      <DialogoCategoria abierto={!!dlgCat} onCerrar={() => setDlgCat(null)} categoria={dlgCat?.categoria} />
      <DialogoArticulo
        abierto={!!dlgArt}
        onCerrar={() => setDlgArt(null)}
        categorias={cats}
        articulo={dlgArt?.articulo}
        categoriaIdInicial={dlgArt?.categoriaId}
      />
      <DialogoConfirmar
        abierto={!!confirmar}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar?.tipo === 'categoria' ? 'Eliminar categoría' : 'Eliminar tutorial'}
        mensaje={
          confirmar
            ? `¿Eliminar "${confirmar.nombre}"?${confirmar.tipo === 'categoria' ? ' Se eliminarán también sus tutoriales.' : ''}`
            : ''
        }
        textoConfirmar="Eliminar"
        variante="danger"
        cargando={borrarCat.isPending || borrarArt.isPending}
        onConfirmar={onConfirmarBorrado}
      />
    </div>
  );
}

function KpiInline({ etiqueta, valor, color }: { etiqueta: string; valor: number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3">
      <span
        className="text-[16px] font-bold leading-none tabular-nums text-texto"
        style={color ? { color } : undefined}
      >
        {valor}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase leading-none tracking-wide text-texto-3">
        {etiqueta}
      </span>
    </div>
  );
}

function ChipFiltro({
  activo,
  onClick,
  testid,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  testid: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
        activo
          ? 'border-marca bg-marca-suave text-marca'
          : 'border-borde bg-superficie text-texto-2 hover:bg-superficie-2'
      }`}
    >
      {children}
    </button>
  );
}

function TarjetaCategoria({
  categoria,
  articulos,
  abierta,
  onAlternar,
  onEditar,
  onBorrar,
  onNuevoArticulo,
  onEditarArticulo,
  onBorrarArticulo,
  onReproducirArticulo,
}: {
  categoria: CategoriaAdmin;
  articulos: ArticuloAdmin[];
  abierta: boolean;
  onAlternar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
  onNuevoArticulo: () => void;
  onEditarArticulo: (a: ArticuloAdmin) => void;
  onBorrarArticulo: (a: ArticuloAdmin) => void;
  onReproducirArticulo: (a: ArticuloAdmin) => void;
}) {
  const total = categoria.articulos.length;

  return (
    <div className="rounded-[12px] border border-borde bg-superficie">
      <div className={`bg-superficie-2 px-3 py-2.5 ${abierta ? 'rounded-t-[12px]' : 'rounded-[12px]'}`}>
        {/* Fila 1: título (toggle) + menú kebab de acciones */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAlternar}
            data-testid={`categoria-toggle-${categoria.id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            {abierta ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-texto-4" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-texto-4" />
            )}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
              <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-texto">{categoria.nombre}</span>
            {!categoria.activo && <Badge>Inactiva</Badge>}
          </button>
          <MenuAcciones
            testid={`categoria-menu-${categoria.id}`}
            acciones={[
              { etiqueta: 'Nuevo tutorial', icono: <Plus className="h-4 w-4" />, onClick: onNuevoArticulo },
              { etiqueta: 'Editar categoría', icono: <Pencil className="h-4 w-4" />, onClick: onEditar },
              { etiqueta: 'Eliminar categoría', icono: <Trash2 className="h-4 w-4" />, onClick: onBorrar, peligro: true },
            ]}
          />
        </div>
      </div>

      {abierta && (
        <div className="border-t border-borde p-3">
          <Badge>{SECCION_LABEL[seccionDeCategoria(categoria.app, categoria.audiencia)]}</Badge>
          {total === 0 ? (
            <p className="mt-2 text-[12.5px] text-texto-4">
              Aún no hay tutoriales. Agrega el primero con el botón +.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {articulos.map((art) => (
                <FilaArticulo
                  key={art.id}
                  articulo={art}
                  onEditar={() => onEditarArticulo(art)}
                  onBorrar={() => onBorrarArticulo(art)}
                  onReproducir={() => onReproducirArticulo(art)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Miniatura 16:9 de la portada del tutorial. Si hay video, es un botón que
 *  abre el reproductor a pantalla completa. Si no, muestra un placeholder. */
function MiniaturaVideo({
  poster,
  tieneVideo,
  dur,
  onReproducir,
}: {
  poster: string | null;
  tieneVideo: boolean;
  dur: string | null;
  onReproducir?: () => void;
}) {
  const clase =
    'group relative aspect-video w-full overflow-hidden rounded-[10px] border border-borde bg-superficie-2';

  const contenido = tieneVideo ? (
    <>
      {poster && <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
      <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/10">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white shadow-sm transition group-hover:scale-110 group-hover:bg-black/70">
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" strokeWidth={0} />
        </span>
      </span>
      {dur && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {dur}
        </span>
      )}
    </>
  ) : (
    <span className="grid h-full w-full place-items-center text-texto-4">
      <VideoOff className="h-8 w-8" />
    </span>
  );

  if (tieneVideo && onReproducir) {
    return (
      <button type="button" onClick={onReproducir} className={`${clase} cursor-pointer`} aria-label="Reproducir video">
        {contenido}
      </button>
    );
  }
  return <div className={clase}>{contenido}</div>;
}

function FilaArticulo({
  articulo,
  onEditar,
  onBorrar,
  onReproducir,
}: {
  articulo: ArticuloAdmin;
  onEditar: () => void;
  onBorrar: () => void;
  onReproducir: () => void;
}) {
  const tieneVideo = !!articulo.videoUrl;
  const hayMetricas = articulo.vistas > 0 || articulo.utilSi > 0 || articulo.utilNo > 0;
  const dur = fmtDuracion(articulo.duracionSeg);

  return (
    <div data-testid={`articulo-${articulo.id}`}>
      <MiniaturaVideo poster={articulo.posterUrl} tieneVideo={tieneVideo} dur={dur} onReproducir={onReproducir} />
      <div className="mt-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-texto">{articulo.pregunta}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {articulo.publicado ? (
            <span className="rounded-full bg-ok-suave px-2 py-0.5 text-[11px] font-semibold text-ok">Publicado</span>
          ) : (
            <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-semibold text-texto-3">Borrador</span>
          )}
          {!tieneVideo && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--panel-warn-weak)', color: 'var(--panel-warn)' }}
            >
              <AlertTriangle className="h-3 w-3" /> Falta video
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-3.5 text-[14px] font-semibold text-texto-3">
            {hayMetricas && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-[18px] w-[18px]" /> {articulo.vistas}
                </span>
                <span className="inline-flex items-center gap-1 text-ok">
                  <ThumbsUp className="h-[18px] w-[18px]" /> {articulo.utilSi}
                </span>
                <span className="inline-flex items-center gap-1 text-peligro">
                  <ThumbsDown className="h-[18px] w-[18px]" /> {articulo.utilNo}
                </span>
              </>
            )}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip text="Editar tutorial">
              <button type="button" className={BTN_EDIT_CIRC} aria-label="Editar tutorial" data-testid={`articulo-editar-${articulo.id}`} onClick={onEditar}>
                <Pencil className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip text="Eliminar tutorial">
              <button type="button" className={BTN_DEL_CIRC} aria-label="Eliminar tutorial" data-testid={`articulo-borrar-${articulo.id}`} onClick={onBorrar}>
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reproductor a pantalla completa (lightbox). Se ajusta a video vertical u
 *  horizontal manteniendo su proporción; cierra con la X, el fondo o Escape. */
function LightboxVideo({ articulo, onCerrar }: { articulo: ArticuloAdmin; onCerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
      onClick={onCerrar}
      data-testid="ayuda-video-lightbox"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        data-testid="ayuda-video-cerrar"
      >
        <X className="h-5 w-5" />
      </button>
      <video
        src={articulo.videoUrl ?? undefined}
        controls
        autoPlay
        playsInline
        preload="auto"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] max-w-[92vw] rounded-[12px] bg-black shadow-2xl"
      />
      <p
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] truncate text-center text-[13px] font-medium text-white/85"
      >
        {articulo.pregunta}
      </p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-semibold text-texto-2">
      {children}
    </span>
  );
}
