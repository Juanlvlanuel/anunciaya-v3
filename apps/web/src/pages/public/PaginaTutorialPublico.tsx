import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, HelpCircle } from 'lucide-react';
import api from '../../services/api';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useAuthStore } from '../../stores/useAuthStore';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { ReproductorVideo } from '../../components/ayuda/ReproductorVideo';
import { ContenidoPasos } from '../../components/ayuda/ContenidoPasos';

interface TutorialPublico {
  id: string;
  slug: string;
  pregunta: string;
  respuesta: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  duracionSeg: number | null;
  categoriaNombre: string;
}

export function PaginaTutorialPublico() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const estaLogueado = !!usuario;

  const [tutorial, setTutorial] = useState<TutorialPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!slug) {
        setError('Enlace no válido');
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/ayuda/publico/${slug}`);
        if (response.data.success) {
          setTutorial(response.data.data);
        } else {
          setError(response.data.message || 'Tutorial no encontrado');
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        setError(
          e.response?.status === 404
            ? 'Este tutorial no existe o no está disponible.'
            : 'No se pudo cargar el tutorial. Intenta de nuevo.',
        );
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [slug]);

  useOpenGraph({
    title: tutorial ? `${tutorial.pregunta} | AnunciaYA` : 'Tutorial | AnunciaYA',
    description: tutorial
      ? `Aprende: ${tutorial.pregunta}`
      : 'Aprende a sacarle todo el provecho a AnunciaYA.',
    image: tutorial?.posterUrl || undefined,
    url: window.location.href,
    type: 'website',
  });

  if (loading) {
    return (
      <div className="bg-app-degradado flex h-screen flex-col">
        <HeaderPublico />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
              <p className="font-medium text-slate-600">Cargando tutorial…</p>
            </div>
          </div>
          <FooterPublico />
        </main>
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="bg-app-degradado flex h-screen flex-col">
        <HeaderPublico />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
                <HelpCircle className="h-10 w-10 text-slate-400" />
              </div>
              <h1 className="mb-3 text-2xl font-bold text-slate-900">Tutorial no disponible</h1>
              <p className="mb-6 font-medium leading-relaxed text-slate-600">
                {error || 'Este tutorial ya no está disponible.'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white lg:cursor-pointer lg:hover:bg-blue-700"
              >
                Ir a AnunciaYA
              </button>
            </div>
          </div>
          <FooterPublico />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-app-degradado flex h-screen flex-col">
      <HeaderPublico />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {tutorial.categoriaNombre} · Tutorial
            </p>
            <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-slate-900 2xl:text-3xl">
              {tutorial.pregunta}
            </h1>

            <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-3 shadow-md lg:p-5">
              <ReproductorVideo
                src={tutorial.videoUrl}
                poster={tutorial.posterUrl}
                titulo={tutorial.pregunta}
                duracionSeg={tutorial.duracionSeg}
              />
              <ContenidoPasos texto={tutorial.respuesta} />
            </div>

            {!estaLogueado && (
              <div className="mt-8 rounded-2xl border-2 border-slate-300 bg-white p-6 text-center shadow-md">
                <h2 className="text-lg font-extrabold text-slate-900">Descubre AnunciaYA</h2>
                <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-600">
                  Encuentra negocios, ofertas y servicios cerca de ti, junta puntos y canjéalos.
                </p>
                <button
                  onClick={() => navigate('/registro')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md lg:cursor-pointer lg:hover:bg-blue-700"
                >
                  Únete gratis
                </button>
              </div>
            )}
          </div>
        </div>
        <FooterPublico />
      </main>
    </div>
  );
}

export default PaginaTutorialPublico;
