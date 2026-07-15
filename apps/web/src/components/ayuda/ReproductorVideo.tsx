import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface ReproductorVideoProps {
  src: string | null;
  /** Póster opcional. En la galería NO se pasa (para que el video con autoplay
   *  no muestre la portada cargando); en la landing pública sí, por si el
   *  navegador bloquea el autoplay al abrirse sin gesto del usuario. */
  poster?: string | null;
  titulo: string;
  duracionSeg?: number | null;
  /** Reporta si el video es vertical (alto > ancho) al cargar su metadata. */
  onOrientacion?: (esVertical: boolean) => void;
}

/** iOS expone `webkitEnterFullscreen` solo en el elemento <video>. */
interface VideoConFullscreen extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

/** `screen.orientation.lock/unlock` no están en el lib estándar de TS todavía. */
interface OrientacionBloqueable extends ScreenOrientation {
  lock?: (orientacion: string) => Promise<void>;
}

function formatearDuracion(seg?: number | null): string | null {
  if (!seg || seg <= 0) return null;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ReproductorVideo({ src, poster, titulo, duracionSeg, onOrientacion }: ReproductorVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dur = formatearDuracion(duracionSeg);

  // Al cargar metadata, reporta la orientación real para que el contenedor
  // decida el layout (vertical → video + pasos en 2 columnas; horizontal → apilado).
  const alCargarMetadata = () => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) onOrientacion?.(v.videoHeight > v.videoWidth);
  };

  // Móvil: al acostar el teléfono, el video entra a pantalla completa.
  //
  // Antes también forzábamos la SALIDA cuando la media query volvía a "vertical".
  // El problema: al entrar a pantalla completa el navegador (Android) rota el
  // contenido a horizontal por su cuenta, y durante ese giro la media query
  // parpadea reportando "vertical" un instante → se disparaba `exitFullscreen`
  // y el video "se regresaba" a su tamaño chico. Por eso ya NO salimos según la
  // orientación: al entrar a pantalla completa bloqueamos la orientación en
  // horizontal (como YouTube) y se sale con el control nativo del reproductor.
  useEffect(() => {
    if (!src) return;
    const esTactil = window.matchMedia('(pointer: coarse)').matches;
    if (!esTactil) return;

    const orientacion = window.screen?.orientation as OrientacionBloqueable | undefined;

    // Al entrar a pantalla completa, fija horizontal; al salir, libera.
    const alCambiarFullscreen = () => {
      if (document.fullscreenElement) orientacion?.lock?.('landscape').catch(() => {});
      else orientacion?.unlock?.();
    };
    document.addEventListener('fullscreenchange', alCambiarFullscreen);

    // Al acostar el teléfono, entra a pantalla completa (si aún no lo está).
    const mq = window.matchMedia('(orientation: landscape)');
    const alRotar = (e: MediaQueryListEvent) => {
      if (!e.matches || document.fullscreenElement) return;
      const video = videoRef.current as VideoConFullscreen | null;
      if (!video) return;
      if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    };
    mq.addEventListener('change', alRotar);

    return () => {
      document.removeEventListener('fullscreenchange', alCambiarFullscreen);
      mq.removeEventListener('change', alRotar);
    };
  }, [src]);

  // Autoplay SOLO en la instancia visible. La página monta el detalle en dos
  // contenedores (desktop y móvil) y oculta uno con CSS; con el atributo autoPlay,
  // el video oculto también sonaría (audio duplicado). `offsetParent === null`
  // ⇒ el contenedor está en display:none, así que ahí NO se reproduce.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (v.offsetParent === null) return;
    v.play().catch(() => {});
  }, [src]);

  if (!src) {
    return (
      <div
        data-testid="ayuda-video-vacio"
        className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-800 text-slate-300"
      >
        <Play className="h-8 w-8" strokeWidth={2} />
        <span className="text-sm font-semibold">Video próximamente</span>
      </div>
    );
  }

  // El reproductor se adapta a la proporción REAL del video: los horizontales
  // (16:9) llenan el ancho como siempre; los verticales (9:16) se muestran
  // altos y centrados, sin franjas negras a los lados.
  return (
    <div className="flex justify-center">
      <div className="relative inline-block max-w-full overflow-hidden rounded-xl bg-black shadow-md">
        <video
          ref={videoRef}
          data-testid="ayuda-video"
          className="block max-h-[70vh] max-w-full"
          controls
          preload="metadata"
          playsInline
          poster={poster ?? undefined}
          aria-label={titulo}
          onLoadedMetadata={alCargarMetadata}
        >
          <source src={src} />
        </video>
        {dur && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
            {dur}
          </span>
        )}
      </div>
    </div>
  );
}
