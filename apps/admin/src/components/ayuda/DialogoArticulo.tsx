/**
 * DialogoArticulo.tsx
 * ===================
 * Crear / editar un tutorial (artículo) del Centro de Ayuda, con subida de
 * video y poster a R2 (presigned URL).
 *
 * Ubicación: apps/admin/src/components/ayuda/DialogoArticulo.tsx
 */

import { useEffect, useState } from 'react';
import { Loader2, Check, Video, Image as ImageIcon, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { useCrearArticulo, useEditarArticulo } from '../../hooks/queries/useAyudaAdmin';
import {
  subirVideoAyuda,
  subirPosterAyuda,
  borrarArchivoAyuda,
  optimizarImagen,
  seccionDeCategoria,
  SECCION_LABEL,
} from '../../services/ayudaService';
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

/** Lee la metadata (duración + orientación) de un archivo de video localmente,
 *  sin subirlo. `vertical` = alto > ancho. */
function leerMetadataVideo(
  file: File,
): Promise<{ duracion: number | null; vertical: boolean | null }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const d = video.duration;
      const duracion = Number.isFinite(d) && d > 0 ? Math.round(d) : null;
      const vertical =
        video.videoWidth && video.videoHeight ? video.videoHeight > video.videoWidth : null;
      resolve({ duracion, vertical });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ duracion: null, vertical: null });
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
  const [videoVertical, setVideoVertical] = useState<boolean | null>(null);
  const [orden, setOrden] = useState('0');
  const [publicado, setPublicado] = useState(false);
  const [compartible, setCompartible] = useState(true);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [subiendoPoster, setSubiendoPoster] = useState(false);
  // URLs de R2 subidas en ESTA sesión del modal (para limpiar huérfanos al
  // cancelar, o los reemplazos intermedios al guardar).
  const [subidas, setSubidas] = useState<Set<string>>(new Set());

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
    setVideoVertical(articulo?.videoVertical ?? null);
    setOrden(String(articulo?.orden ?? 0));
    setPublicado(articulo?.publicado ?? false);
    setCompartible(articulo?.compartiblePublico ?? true);
    setSubidas(new Set());
  }, [abierto, articulo, categoriaIdInicial, categorias]);

  // Autogenera el slug desde la pregunta mientras no se haya editado a mano.
  useEffect(() => {
    if (!slugTocado) setSlug(slugify(pregunta));
  }, [pregunta, slugTocado]);

  const cargando = crear.isPending || editar.isPending;
  const valido = !!categoriaId && slug.trim().length >= 3 && pregunta.trim().length >= 3;

  const onVideo = async (file?: File) => {
    if (!file) return;
    // Aviso si el video pesa de más: la app no lo transcodifica, conviene
    // exportarlo a 720p H.264 antes de subir.
    const MB = 1024 * 1024;
    if (file.size > 40 * MB) {
      toast.advertencia(
        `El video pesa ${Math.round(file.size / MB)} MB. Para que cargue rápido, expórtalo a 720p H.264 (ideal por debajo de 25 MB).`,
      );
    }
    // Duración y orientación se detectan del archivo localmente (no dependen de la subida).
    void leerMetadataVideo(file).then(({ duracion, vertical }) => {
      if (duracion != null) setDuracion(String(duracion));
      if (vertical != null) setVideoVertical(vertical);
    });
    setSubiendoVideo(true);
    try {
      const url = await subirVideoAyuda(file);
      setVideoUrl(url);
      setSubidas((prev) => new Set(prev).add(url));
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
      const optimizado = await optimizarImagen(file);
      const url = await subirPosterAyuda(optimizado);
      setPosterUrl(url);
      setSubidas((prev) => new Set(prev).add(url));
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
      videoVertical,
      orden: Number(orden) || 0,
      publicado,
      compartiblePublico: compartible,
    };
    const finales = new Set([videoUrl, posterUrl].filter((u): u is string => !!u));
    const onSuccess = () => {
      // Limpiar de R2 lo que se subió en esta sesión y no quedó guardado
      // (p. ej. un video que subiste y luego reemplazaste antes de guardar).
      subidas.forEach((u) => {
        if (!finales.has(u)) borrarArchivoAyuda(u).catch(() => {});
      });
      onCerrar();
    };
    if (esEdicion) editar.mutate({ id: articulo!.id, input }, { onSuccess });
    else crear.mutate(input, { onSuccess });
  };

  // Cerrar cancelando: borra de R2 lo que se subió en esta sesión y no se guardó.
  const cerrarConLimpieza = () => {
    subidas.forEach((u) => borrarArchivoAyuda(u).catch(() => {}));
    onCerrar();
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={cerrarConLimpieza}
      titulo={esEdicion ? 'Editar tutorial' : 'Nuevo tutorial'}
      ancho="2xl"
      alturaMaxima="xl"
      discriminador="dialogo-articulo-ayuda"
    >
      <div className="p-5" data-testid="dialogo-articulo-ayuda">
        {/* Categoría + Orden (a lo ancho) */}
        <div className="mb-4 grid grid-cols-[1fr_auto] gap-3">
          <div className="min-w-0">
            <label className={LABEL}>Categoría</label>
            <SelectorBuscable
              value={categoriaId}
              onChange={setCategoriaId}
              opciones={categorias.map((c) => ({
                id: c.id,
                etiqueta: `${c.nombre} · ${SECCION_LABEL[seccionDeCategoria(c.app, c.audiencia)]}`,
              }))}
              placeholder="Selecciona una categoría…"
              buscarPlaceholder="Buscar categoría…"
              testid="articulo-categoria"
            />
          </div>
          <div className="w-20">
            <label className={LABEL}>Orden</label>
            <input className={CAMPO} type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
        </div>

        {/* Dos columnas: contenido | archivos y estado */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-2">
          {/* ── Izquierda: pregunta, slug, pasos ── */}
          <div className="flex flex-col gap-4">
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

            <div className="flex flex-1 flex-col">
              <label className={LABEL}>
                Pasos <span className="font-normal text-texto-4">· Markdown: 1. 2. 3. y **negrita**</span>
              </label>
              <textarea
                className={`${CAMPO} min-h-[180px] flex-1 resize-y`}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder={'1. Abre CardYA desde el menú.\n2. Elige el negocio.\n3. Toca **Canjear**.'}
              />
            </div>
          </div>

          {/* ── Derecha: video, poster, duración, estado ── */}
          <div className="flex flex-col gap-4">
            <SubidaArchivo
              etiqueta="Video"
              hint="MP4 o WebM"
              accept="video/*"
              tipo="video"
              url={videoUrl}
              subiendo={subiendoVideo}
              onArchivo={onVideo}
              onQuitar={() => setVideoUrl(null)}
            />
            <SubidaArchivo
              etiqueta="Poster"
              hint="Imagen 16:9"
              accept="image/*"
              tipo="imagen"
              url={posterUrl}
              subiendo={subiendoPoster}
              onArchivo={onPoster}
              onQuitar={() => setPosterUrl(null)}
            />

            <div className="w-40">
              <label className={LABEL}>
                Duración <span className="font-normal text-texto-4">· seg (auto)</span>
              </label>
              <input className={CAMPO} type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="134" />
            </div>

            <ToggleCampo
              titulo="Publicado"
              descripcion="Visible para los usuarios en la app"
              activo={publicado}
              onChange={setPublicado}
              testid="articulo-publicado"
            />
            <ToggleCampo
              titulo="Compartible"
              descripcion="Con enlace público (/p/tutorial/…)"
              activo={compartible}
              onChange={setCompartible}
              testid="articulo-compartible"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-5 flex justify-end gap-2 border-t border-borde pt-4">
          <button type="button" className={BTN_SEC} onClick={cerrarConLimpieza}>
            Cancelar
          </button>
          <button
            type="button"
            className={BTN_PRI}
            onClick={guardar}
            disabled={!valido || cargando || subiendoVideo || subiendoPoster}
          >
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

function ToggleCampo({
  titulo,
  descripcion,
  activo,
  onChange,
  testid,
}: {
  titulo: string;
  descripcion?: string;
  activo: boolean;
  onChange: (v: boolean) => void;
  testid?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      data-testid={testid}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5 text-left transition hover:border-borde-fuerte"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-texto">{titulo}</span>
        {descripcion && <span className="block text-[11px] text-texto-4">{descripcion}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          activo ? 'bg-marca' : 'bg-[var(--panel-border)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            activo ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function SubidaArchivo({
  etiqueta,
  hint,
  accept,
  tipo,
  url,
  subiendo,
  onArchivo,
  onQuitar,
}: {
  etiqueta: string;
  hint?: string;
  accept: string;
  tipo: 'video' | 'imagen';
  url: string | null;
  subiendo: boolean;
  onArchivo: (file?: File) => void;
  onQuitar: () => void;
}) {
  const Icono = tipo === 'imagen' ? ImageIcon : Video;
  return (
    <div>
      <label className={LABEL}>{etiqueta}</label>
      {url ? (
        <div className="flex h-24 items-center gap-3 overflow-hidden rounded-[10px] border border-borde bg-superficie-2 pr-3">
          {tipo === 'imagen' ? (
            <img src={url} alt="" className="h-full w-28 shrink-0 object-cover" />
          ) : (
            <span className="ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ok-suave text-ok">
              <Check className="h-6 w-6" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-texto">
            {tipo === 'imagen' ? 'Imagen cargada' : 'Video cargado'}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <label className="cursor-pointer rounded-[8px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto transition hover:bg-marca-suave">
              {subiendo ? '…' : 'Cambiar'}
              <input
                type="file"
                accept={accept}
                className="hidden"
                disabled={subiendo}
                onChange={(e) => onArchivo(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={onQuitar}
              aria-label="Quitar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-peligro-suave text-peligro transition hover:opacity-80"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-campo-borde bg-campo text-texto-3 transition hover:border-marca hover:bg-superficie">
          {subiendo ? <Loader2 className="h-5 w-5 animate-spin text-marca" /> : <Icono className="h-5 w-5" />}
          <span className="text-[13px] font-medium">{subiendo ? 'Subiendo…' : 'Seleccionar archivo'}</span>
          {hint && <span className="text-[11px] text-texto-4">{hint}</span>}
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
