/**
 * DialogoArticulo.tsx
 * ===================
 * Crear / editar un tutorial (artículo) del Centro de Ayuda, con subida de
 * video y poster a R2 (presigned URL).
 *
 * Ubicación: apps/admin/src/components/ayuda/DialogoArticulo.tsx
 */

import { useEffect, useState } from 'react';
import { Loader2, Check, Upload } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useCrearArticulo, useEditarArticulo } from '../../hooks/queries/useAyudaAdmin';
import { subirVideoAyuda, subirPosterAyuda } from '../../services/ayudaService';
import type { ArticuloAdmin, CategoriaAdmin } from '../../services/ayudaService';
import { toast } from '../../stores/useToastPanel';

const CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_PRI =
  'rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SEC =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto hover:bg-marca-suave';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Lee la duración (segundos) de un archivo de video localmente, sin subirlo. */
function leerDuracionVideo(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const d = video.duration;
      resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    video.src = URL.createObjectURL(file);
  });
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  categorias: CategoriaAdmin[];
  articulo?: ArticuloAdmin | null;
  categoriaIdInicial?: string;
}

export function DialogoArticulo({ abierto, onCerrar, categorias, articulo, categoriaIdInicial }: Props) {
  const crear = useCrearArticulo();
  const editar = useEditarArticulo();
  const esEdicion = !!articulo;

  const [categoriaId, setCategoriaId] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [duracion, setDuracion] = useState('');
  const [orden, setOrden] = useState('0');
  const [publicado, setPublicado] = useState(false);
  const [compartible, setCompartible] = useState(true);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [subiendoPoster, setSubiendoPoster] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setCategoriaId(articulo?.categoriaId ?? categoriaIdInicial ?? categorias[0]?.id ?? '');
    setSlug(articulo?.slug ?? '');
    setSlugTocado(!!articulo);
    setPregunta(articulo?.pregunta ?? '');
    setRespuesta(articulo?.respuesta ?? '');
    setVideoUrl(articulo?.videoUrl ?? null);
    setPosterUrl(articulo?.posterUrl ?? null);
    setDuracion(articulo?.duracionSeg != null ? String(articulo.duracionSeg) : '');
    setOrden(String(articulo?.orden ?? 0));
    setPublicado(articulo?.publicado ?? false);
    setCompartible(articulo?.compartiblePublico ?? true);
  }, [abierto, articulo, categoriaIdInicial, categorias]);

  // Autogenera el slug desde la pregunta mientras no se haya editado a mano.
  useEffect(() => {
    if (!slugTocado) setSlug(slugify(pregunta));
  }, [pregunta, slugTocado]);

  const cargando = crear.isPending || editar.isPending;
  const valido = !!categoriaId && slug.trim().length >= 3 && pregunta.trim().length >= 3;

  const onVideo = async (file?: File) => {
    if (!file) return;
    // La duración se detecta del archivo localmente (no depende de la subida).
    void leerDuracionVideo(file).then((seg) => {
      if (seg != null) setDuracion(String(seg));
    });
    setSubiendoVideo(true);
    try {
      setVideoUrl(await subirVideoAyuda(file));
      toast.exito('Video subido');
    } catch {
      toast.error('No se pudo subir el video');
    } finally {
      setSubiendoVideo(false);
    }
  };

  const onPoster = async (file?: File) => {
    if (!file) return;
    setSubiendoPoster(true);
    try {
      setPosterUrl(await subirPosterAyuda(file));
      toast.exito('Poster subido');
    } catch {
      toast.error('No se pudo subir el poster');
    } finally {
      setSubiendoPoster(false);
    }
  };

  const guardar = () => {
    if (!valido) return;
    const input = {
      categoriaId,
      slug: slug.trim(),
      pregunta: pregunta.trim(),
      respuesta: respuesta.trim() || null,
      videoUrl,
      posterUrl,
      duracionSeg: duracion.trim() ? Number(duracion) : null,
      orden: Number(orden) || 0,
      publicado,
      compartiblePublico: compartible,
    };
    if (esEdicion) editar.mutate({ id: articulo!.id, input }, { onSuccess: onCerrar });
    else crear.mutate(input, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esEdicion ? 'Editar tutorial' : 'Nuevo tutorial'}
      ancho="2xl"
      alturaMaxima="xl"
      discriminador="dialogo-articulo-ayuda"
    >
      <div className="space-y-4 p-5" data-testid="dialogo-articulo-ayuda">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className={LABEL}>Categoría</label>
            <select className={CAMPO} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.app === 'scanya' ? 'ScanYA' : c.audiencia})
                </option>
              ))}
            </select>
          </div>
          <div className="lg:w-24">
            <label className={LABEL}>Orden</label>
            <input className={CAMPO} type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Pregunta / título</label>
          <input
            className={CAMPO}
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Ej. Junta puntos con CardYA y canjea recompensas"
          />
        </div>

        <div>
          <label className={LABEL}>Slug (URL pública)</label>
          <input
            className={CAMPO}
            value={slug}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value);
            }}
            placeholder="junta-puntos-cardya"
          />
        </div>

        <div>
          <label className={LABEL}>Pasos (Markdown: 1. 2. 3. y **negrita**)</label>
          <textarea
            className={`${CAMPO} min-h-[110px] resize-y`}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder={'1. Abre CardYA desde el menú.\n2. Elige el negocio.\n3. Toca **Canjear**.'}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SubidaArchivo
            etiqueta="Video (MP4/WebM)"
            accept="video/*"
            url={videoUrl}
            subiendo={subiendoVideo}
            onArchivo={onVideo}
            onQuitar={() => setVideoUrl(null)}
          />
          <SubidaArchivo
            etiqueta="Poster (imagen)"
            accept="image/*"
            url={posterUrl}
            subiendo={subiendoPoster}
            onArchivo={onPoster}
            onQuitar={() => setPosterUrl(null)}
          />
        </div>

        <div className="lg:w-40">
          <label className={LABEL}>Duración (se detecta al subir el video)</label>
          <input className={CAMPO} type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="134" />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[13px] font-medium text-texto">
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
            Publicado
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-texto">
            <input type="checkbox" checked={compartible} onChange={(e) => setCompartible(e.target.checked)} />
            Compartible públicamente
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={BTN_SEC} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className={BTN_PRI} onClick={guardar} disabled={!valido || cargando || subiendoVideo || subiendoPoster}>
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

function SubidaArchivo({
  etiqueta,
  accept,
  url,
  subiendo,
  onArchivo,
  onQuitar,
}: {
  etiqueta: string;
  accept: string;
  url: string | null;
  subiendo: boolean;
  onArchivo: (file?: File) => void;
  onQuitar: () => void;
}) {
  return (
    <div>
      <label className={LABEL}>{etiqueta}</label>
      {url ? (
        <div className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3 py-2.5 text-[13px] text-texto">
          <span className="inline-flex items-center gap-1.5 text-ok">
            <Check className="h-4 w-4" /> Cargado
          </span>
          <button type="button" className="text-[12px] font-semibold text-peligro hover:underline" onClick={onQuitar}>
            Quitar
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto-3 hover:border-marca">
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {subiendo ? 'Subiendo…' : 'Seleccionar archivo'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={subiendo}
            onChange={(e) => onArchivo(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}
