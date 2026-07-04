import { useEffect, useState } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
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
    if (voto) return; // ya votó este tutorial
    setVoto(v);
    localStorage.setItem(`ayuda_voto_${articulo.id}`, v);
    enviarFeedbackTutorial(articulo.id, v === 'si').catch(() => {});
    notificar.exito('¡Gracias por tu opinión!');
  };

  const yaVoto = voto !== null;

  return (
    <div data-testid="ayuda-vista-articulo">
      {onVolver && (
        <button
          onClick={onVolver}
          data-testid="ayuda-volver-lista"
          className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-600 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          {categoriaNombre}
        </button>
      )}

      {/* Header: título a la izquierda, compartir arriba a la derecha */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 hidden text-xs font-semibold text-slate-500 lg:block">{categoriaNombre}</p>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 2xl:text-xl">
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

      <ReproductorVideo
        src={articulo.videoUrl}
        poster={articulo.posterUrl}
        titulo={articulo.pregunta}
        duracionSeg={articulo.duracionSeg}
      />

      <ContenidoPasos texto={articulo.respuesta} />

      {/* Feedback */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-3.5 text-sm font-semibold text-slate-600">
        <span>{yaVoto ? '¡Gracias por tu opinión!' : '¿Te sirvió?'}</span>
        <button
          onClick={() => votar('si')}
          disabled={yaVoto}
          data-testid="ayuda-voto-si"
          aria-pressed={voto === 'si'}
          className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-sm font-semibold ${
            voto === 'si'
              ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
              : yaVoto
                ? 'border-slate-300 bg-white text-slate-400'
                : 'border-slate-300 bg-white text-slate-700 lg:cursor-pointer lg:hover:border-emerald-400'
          }`}
        >
          <ThumbsUp className="h-4 w-4" strokeWidth={2.2} />
          Sí
        </button>
        <button
          onClick={() => votar('no')}
          disabled={yaVoto}
          data-testid="ayuda-voto-no"
          aria-pressed={voto === 'no'}
          className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-sm font-semibold ${
            voto === 'no'
              ? 'border-red-400 bg-red-100 text-red-700'
              : yaVoto
                ? 'border-slate-300 bg-white text-slate-400'
                : 'border-slate-300 bg-white text-slate-700 lg:cursor-pointer lg:hover:border-red-300'
          }`}
        >
          <ThumbsDown className="h-4 w-4" strokeWidth={2.2} />
          No
        </button>
      </div>
    </div>
  );
}
