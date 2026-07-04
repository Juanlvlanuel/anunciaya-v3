import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface ReproductorVideoProps {
  src: string | null;
  poster: string | null;
  titulo: string;
  duracionSeg?: number | null;
}

/** iOS expone `webkitEnterFullscreen` solo en el elemento <video>. */
interface VideoConFullscreen extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

function formatearDuracion(seg?: number | null): string | null {
  if (!seg || seg <= 0) return null;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ReproductorVideo({ src, poster, titulo, duracionSeg }: ReproductorVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dur = formatearDuracion(duracionSeg);

  // Móvil: al girar el teléfono a horizontal, el video entra a pantalla
  // completa; al volver a vertical, sale.
  useEffect(() => {
    if (!src) return;
    const esTactil = window.matchMedia('(pointer: coarse)').matches;
    if (!esTactil) return;

    const mq = window.matchMedia('(orientation: landscape)');
    const alRotar = (e: MediaQueryListEvent) => {
      const video = videoRef.current as VideoConFullscreen | null;
      if (!video) return;
      if (e.matches) {
        if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      } else if (document.fullscreenElement === video) {
        document.exitFullscreen().catch(() => {});
      }
    };
    mq.addEventListener('change', alRotar);
    return () => mq.removeEventListener('change', alRotar);
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
