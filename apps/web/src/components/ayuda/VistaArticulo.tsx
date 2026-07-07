import { useEffect, useState } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown, Play } from 'lucide-react';
import type { AyudaArticulo } from '@/types/ayuda';
import { notificar } from '@/utils/notificaciones';
import { DropdownCompartir } from '@/components/compartir';
import { registrarVistaTutorial, enviarFeedbackTutorial } from '@/services/ayudaService';
import { ReproductorVideo } from './ReproductorVideo';
import { ContenidoPasos } from './ContenidoPasos';

interface VistaArticuloProps {
  articulo: AyudaArticulo;
  categoriaNombre: string;
  /** Solo móvil: vuelve a la lista de la categoría. */
  onVolver?: () => void;
}

export function VistaArticulo({ articulo, categoriaNombre, onVolver }: VistaArticuloProps) {
  const [voto, setVoto] = useState<'si' | 'no' | null>(null);
  // Orientación del video. Se prefiere el dato guardado en la BD (detectado al
  // subir el video en el Panel) → abre directo en el layout correcto, sin flash.
  // Si no existe (tutoriales anteriores), se asume vertical y el propio video
  // corrige al cargar su metadata (`onOrientacion` en ReproductorVideo).
  const [videoVertical, setVideoVertical] = useState(articulo.videoVertical ?? true);

  useEffect(() => {
    setVideoVertical(articulo.videoVertical ?? true);
  }, [articulo.id, articulo.videoVertical]);

  // Registrar una vista, una sola vez por sesión y artículo.
  useEffect(() => {
    const key = `ayuda_visto_${articulo.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      registrarVistaTutorial(articulo.id).catch(() => {});
    }
  }, [articulo.id]);

  // Recuperar el voto previo (anti-doble-voto por artículo).
  useEffect(() => {
    const v = localStorage.getItem(`ayuda_voto_${articulo.id}`);
    setVoto(v === 'si' || v === 'no' ? v : null);
  }, [articulo.id]);

  const urlPublica = `${window.location.origin}/p/tutorial/${articulo.slug}`;

  const votar = (v: 'si' | 'no') => {
    if (voto === v) return; // ya está en ese voto
    const previo = voto; // 'si' | 'no' | null
    setVoto(v);
    localStorage.setItem(`ayuda_voto_${articulo.id}`, v);
    // votoPrevio: true si era 'si', false si era 'no', null si no había ninguno.
    enviarFeedbackTutorial(articulo.id, v === 'si', previo === null ? null : previo === 'si').catch(() => {});
    notificar.exito('¡Gracias por tu opinión!');
  };

  const yaVoto = voto !== null;

  return (
    <div data-testid="ayuda-vista-articulo">
      {onVolver && (
        <button
          onClick={onVolver}
          data-testid="ayuda-volver-lista"
          className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sky-50 py-1 pl-1 pr-3 text-sm font-bold text-sky-700 lg:hidden"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500 text-white">
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {categoriaNombre}
        </button>
      )}

      {/* Header: título a la izquierda, compartir arriba a la derecha */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Etiqueta "video tutorial" — solo móvil (identidad sky) */}
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-600 lg:hidden">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-white">
              <Play className="ml-px h-2 w-2" fill="currentColor" strokeWidth={0} />
            </span>
            Tutorial en video
          </p>
          {/* Etiqueta desktop: categoría + tipo (en PC no hay chip volver) */}
          <p className="mb-1.5 hidden items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-600 lg:flex">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-white">
              <Play className="ml-px h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
            </span>
            {categoriaNombre} · Tutorial
          </p>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 lg:text-2xl 2xl:text-3xl">
            {articulo.pregunta}
          </h2>
        </div>
        {articulo.compartiblePublico && (
          <div className="shrink-0">
            <DropdownCompartir
              url={urlPublica}
              texto={`Mira este tutorial de AnunciaYA: ${articulo.pregunta}`}
              titulo={articulo.pregunta}
              variante="card"
            />
          </div>
        )}
      </div>

      {/* Video + pasos. Si el video es vertical, en desktop van en 2 columnas
          (video estrecho a la izquierda, pasos a la derecha) para no dejar el
          video larguísimo con los pasos hasta el fondo. Horizontal → apilado. */}
      <div className={videoVertical ? 'lg:flex lg:items-start lg:gap-6 2xl:gap-8' : ''}>
        <div className={videoVertical ? 'lg:w-[240px] lg:shrink-0 2xl:w-[300px]' : ''}>
          <ReproductorVideo
            src={articulo.videoUrl}
            titulo={articulo.pregunta}
            duracionSeg={articulo.duracionSeg}
            onOrientacion={setVideoVertical}
          />
        </div>
        <div className={videoVertical ? 'mt-4 min-w-0 lg:mt-0 lg:flex-1' : 'mt-4'}>
          {/* Card contenedor de los pasos + "¿Te sirvió?" (solo móvil; en
              desktop ya están dentro del card de la sección). */}
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <ContenidoPasos texto={articulo.respuesta} />

            {/* Feedback */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-3.5 text-sm font-semibold text-slate-600">
              <span>{yaVoto ? '¡Gracias por tu opinión!' : '¿Te sirvió?'}</span>
              <button
                onClick={() => votar('si')}
                data-testid="ayuda-voto-si"
                aria-pressed={voto === 'si'}
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-sm font-semibold lg:cursor-pointer ${
                  voto === 'si'
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                    : 'border-slate-300 bg-white text-slate-700 lg:hover:border-emerald-400'
                }`}
              >
                <ThumbsUp className="h-4 w-4" strokeWidth={2.2} />
                Sí
              </button>
              <button
                onClick={() => votar('no')}
                data-testid="ayuda-voto-no"
                aria-pressed={voto === 'no'}
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-sm font-semibold lg:cursor-pointer ${
                  voto === 'no'
                    ? 'border-red-400 bg-red-100 text-red-700'
                    : 'border-slate-300 bg-white text-slate-700 lg:hover:border-red-300'
                }`}
              >
                <ThumbsDown className="h-4 w-4" strokeWidth={2.2} />
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
