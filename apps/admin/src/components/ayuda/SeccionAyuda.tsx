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

import { useMemo, useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import {
  useAyudaLista,
  useBorrarCategoria,
  useBorrarArticulo,
} from '../../hooks/queries/useAyudaAdmin';
import type { CategoriaAdmin, ArticuloAdmin } from '../../services/ayudaService';
import { DialogoCategoria } from './DialogoCategoria';
import { DialogoArticulo } from './DialogoArticulo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';

const APP_LABEL: Record<string, string> = { anunciaya: 'AnunciaYA', scanya: 'ScanYA' };
const AUD_LABEL: Record<string, string> = { cliente: 'Cliente', comerciante: 'Comerciante' };

const BTN_NUEVO =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste hover:brightness-105';

// Botones-ícono circulares de color (patrón calcado de Territorios): acción por color.
const BTN_CIRC = 'grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:opacity-80';
const BTN_NUEVO_CIRC = `${BTN_CIRC} bg-ok-suave text-ok`;
const BTN_EDIT_CIRC = `${BTN_CIRC} bg-marca-suave text-marca`;
const BTN_DEL_CIRC = `${BTN_CIRC} bg-peligro-suave text-peligro`;

type FiltroApp = '' | 'anunciaya' | 'scanya';
type FiltroAud = '' | 'cliente' | 'comerciante';

/** Minúsculas y sin acentos, para búsqueda tolerante a tildes. */
function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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
  const [filtroApp, setFiltroApp] = useState<FiltroApp>('');
  const [filtroAud, setFiltroAud] = useState<FiltroAud>('');
  const [soloSinVideo, setSoloSinVideo] = useState(false);
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  const alternarColapso = (id: string) =>
    setColapsadas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
      if (filtroApp && c.app !== filtroApp) continue;
      if (filtroAud && c.audiencia !== filtroAud) continue;
      const articulos = c.articulos.filter((a) => {
        if (soloSinVideo && a.videoUrl) return false;
        if (q && !normaliza(a.pregunta).includes(q)) return false;
        return true;
      });
      if (hayFiltroArticulo && articulos.length === 0) continue;
      res.push({ categoria: c, articulos });
    }
    return res;
  }, [cats, filtroApp, filtroAud, soloSinVideo, q, hayFiltroArticulo]);

  const onConfirmarBorrado = () => {
    if (!confirmar) return;
    const onSuccess = () => setConfirmar(null);
    if (confirmar.tipo === 'categoria') borrarCat.mutate(confirmar.id, { onSuccess });
    else borrarArt.mutate(confirmar.id, { onSuccess });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-5" data-testid="seccion-ayuda">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-texto">Ayuda y Tutoriales</h1>
          <p className="text-[13px] text-texto-3">Categorías y videos tutoriales del Centro de Ayuda.</p>
        </div>
        <button
          type="button"
          className={BTN_NUEVO}
          onClick={() => setDlgCat({ categoria: null })}
          data-testid="ayuda-nueva-categoria"
        >
          <Plus className="h-4 w-4" /> Nueva categoría
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-texto-3">Cargando…</div>
      ) : cats.length === 0 ? (
        <div className="rounded-[12px] border border-borde bg-superficie p-8 text-center text-[13px] text-texto-3">
          Aún no hay categorías. Crea la primera con “Nueva categoría”.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-4">
            <TarjetaKpi etiqueta="Tutoriales" valor={kpis.total} />
            <TarjetaKpi etiqueta="Con video" valor={kpis.conVideo} color="var(--panel-ok)" />
            <TarjetaKpi etiqueta="Sin video" valor={kpis.sinVideo} color="var(--panel-warn)" />
            <TarjetaKpi etiqueta="Publicados" valor={kpis.publicados} color="var(--panel-brand)" />
          </div>

          <div className="rounded-[12px] border border-borde bg-superficie px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[12.5px]">
              <span className="text-texto-2">Producción de video</span>
              <span className="text-texto-3">
                {kpis.conVideo} de {kpis.total} grabados · {kpis.pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-border)' }}>
              <div className="h-full rounded-full bg-ok" style={{ width: `${kpis.pct}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-4" />
              <input
                data-testid="ayuda-buscar"
                className="w-full rounded-[10px] border border-campo-borde bg-campo py-2 pl-9 pr-3 text-[13px] text-texto outline-none placeholder:text-texto-4 focus:border-marca focus:bg-superficie"
                placeholder="Buscar tutorial…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <ChipFiltro
              testid="filtro-app-anunciaya"
              activo={filtroApp === 'anunciaya'}
              onClick={() => setFiltroApp((p) => (p === 'anunciaya' ? '' : 'anunciaya'))}
            >
              AnunciaYA
            </ChipFiltro>
            <ChipFiltro
              testid="filtro-app-scanya"
              activo={filtroApp === 'scanya'}
              onClick={() => setFiltroApp((p) => (p === 'scanya' ? '' : 'scanya'))}
            >
              ScanYA
            </ChipFiltro>
            <ChipFiltro
              testid="filtro-aud-cliente"
              activo={filtroAud === 'cliente'}
              onClick={() => setFiltroAud((p) => (p === 'cliente' ? '' : 'cliente'))}
            >
              Cliente
            </ChipFiltro>
            <ChipFiltro
              testid="filtro-aud-comerciante"
              activo={filtroAud === 'comerciante'}
              onClick={() => setFiltroAud((p) => (p === 'comerciante' ? '' : 'comerciante'))}
            >
              Comerciante
            </ChipFiltro>
            <ChipFiltro
              testid="filtro-sin-video"
              activo={soloSinVideo}
              onClick={() => setSoloSinVideo((v) => !v)}
            >
              <VideoOff className="h-3.5 w-3.5" /> Sin video
            </ChipFiltro>
          </div>

          <div className="overflow-y-auto">
            {catsFiltradas.length === 0 ? (
              <div className="rounded-[12px] border border-borde bg-superficie p-8 text-center text-[13px] text-texto-3">
                Ningún tutorial coincide con los filtros.
              </div>
            ) : (
              <div className="columns-1 gap-3 lg:columns-2 2xl:columns-2">
                {catsFiltradas.map(({ categoria, articulos }) => (
                  <TarjetaCategoria
                    key={categoria.id}
                    categoria={categoria}
                    articulos={articulos}
                    abierta={!colapsadas.has(categoria.id) || hayFiltroArticulo}
                    onAlternar={() => alternarColapso(categoria.id)}
                    onEditar={() => setDlgCat({ categoria })}
                    onBorrar={() => setConfirmar({ tipo: 'categoria', id: categoria.id, nombre: categoria.nombre })}
                    onNuevoArticulo={() => setDlgArt({ articulo: null, categoriaId: categoria.id })}
                    onEditarArticulo={(art) => setDlgArt({ articulo: art })}
                    onBorrarArticulo={(art) => setConfirmar({ tipo: 'articulo', id: art.id, nombre: art.pregunta })}
                  />
                ))}
              </div>
            )}
          </div>
        </>
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

function TarjetaKpi({ etiqueta, valor, color }: { etiqueta: string; valor: number; color?: string }) {
  return (
    <div className="rounded-[12px] border border-borde bg-superficie px-3.5 py-3 shadow-tarjeta-panel">
      <p className="text-[12px] text-texto-3">{etiqueta}</p>
      <p className="mt-0.5 text-[24px] font-bold tabular-nums text-texto" style={color ? { color } : undefined}>
        {valor}
      </p>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
        activo
          ? 'border-marca bg-marca-suave text-marca'
          : 'border-borde bg-superficie text-texto-2 hover:bg-superficie-2'
      }`}
    >
      {children}
    </button>
  );
}

function MiniProgreso({ conVideo, total }: { conVideo: number; total: number }) {
  const pct = total ? (conVideo / total) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5" title={`${conVideo} de ${total} con video`}>
      <span className="text-[11px] tabular-nums text-texto-3">
        {conVideo}/{total}
      </span>
      <span className="block h-1.5 w-10 overflow-hidden rounded-full" style={{ background: 'var(--panel-border)' }}>
        <span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
      </span>
    </div>
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
}) {
  const total = categoria.articulos.length;
  const conVideo = categoria.articulos.filter((a) => a.videoUrl).length;

  return (
    <div className="mb-3 break-inside-avoid overflow-hidden rounded-[12px] border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-3 bg-superficie-2 px-4 py-3">
        <button
          type="button"
          onClick={onAlternar}
          data-testid={`categoria-toggle-${categoria.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {abierta ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-texto-4" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-texto-4" />
          )}
          <span className="truncate text-[14px] font-semibold text-texto">{categoria.nombre}</span>
          {!categoria.activo && <Badge>Inactiva</Badge>}
          <Badge>{APP_LABEL[categoria.app] ?? categoria.app}</Badge>
          <Badge>{AUD_LABEL[categoria.audiencia] ?? categoria.audiencia}</Badge>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <MiniProgreso conVideo={conVideo} total={total} />
          <Tooltip text="Nuevo tutorial">
            <button type="button" className={BTN_NUEVO_CIRC} aria-label="Nuevo tutorial" data-testid={`categoria-nuevo-articulo-${categoria.id}`} onClick={onNuevoArticulo}>
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip text="Editar categoría">
            <button type="button" className={BTN_EDIT_CIRC} aria-label="Editar categoría" data-testid={`categoria-editar-${categoria.id}`} onClick={onEditar}>
              <Pencil className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip text="Eliminar categoría">
            <button type="button" className={BTN_DEL_CIRC} aria-label="Eliminar categoría" data-testid={`categoria-borrar-${categoria.id}`} onClick={onBorrar}>
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {abierta &&
        (total === 0 ? (
          <div className="border-t border-borde px-4 py-3 text-[12.5px] text-texto-4">
            Aún no hay tutoriales. Agrega el primero con el botón +.
          </div>
        ) : (
          <div className="divide-y divide-borde border-t border-borde">
            {articulos.map((art) => (
              <FilaArticulo
                key={art.id}
                articulo={art}
                onEditar={() => onEditarArticulo(art)}
                onBorrar={() => onBorrarArticulo(art)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

function FilaArticulo({
  articulo,
  onEditar,
  onBorrar,
}: {
  articulo: ArticuloAdmin;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const tieneVideo = !!articulo.videoUrl;
  const hayMetricas = articulo.vistas > 0 || articulo.utilSi > 0 || articulo.utilNo > 0;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5" data-testid={`articulo-${articulo.id}`}>
      <div className="flex min-w-0 items-start gap-2">
        {tieneVideo ? (
          <Play className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
        ) : (
          <VideoOff className="mt-0.5 h-4 w-4 shrink-0 text-texto-4" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-texto">{articulo.pregunta}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {hayMetricas && (
          <div className="flex items-center gap-2.5 text-[12.5px] font-medium">
            <span className="inline-flex items-center gap-1 text-marca">
              <Eye className="h-4 w-4" /> {articulo.vistas}
            </span>
            <span className="inline-flex items-center gap-1 text-ok">
              <ThumbsUp className="h-4 w-4" /> {articulo.utilSi}
            </span>
            <span className="inline-flex items-center gap-1 text-peligro">
              <ThumbsDown className="h-4 w-4" /> {articulo.utilNo}
            </span>
          </div>
        )}
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
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-semibold text-texto-2">
      {children}
    </span>
  );
}
