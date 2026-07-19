/**
 * PaginaPublicacionNegocioPublica.tsx
 * ======================================
 * Versión PÚBLICA del detalle de una publicación de negocio, accesible sin
 * iniciar sesión. Sirve para los enlaces compartidos en redes sociales.
 *
 * Ruta: `/p/negocio-post/:publicacionId`
 *
 * Reusa `DetallePublicacionNegocioContenido.tsx` (mismo cuerpo que la
 * versión privada y el modal del feed) — el componente ya degrada solo
 * (comentarios muestran "Inicia sesión para comentar" sin sesión). Lo que
 * cambia es el chrome: `HeaderPublico`/`FooterPublico` en vez del header
 * dark del módulo, + OG tags vía `useOpenGraph`.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 * Ubicación: apps/web/src/pages/public/PaginaPublicacionNegocioPublica.tsx
 */

import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Store } from 'lucide-react';
import { usePublicacionNegocio } from '../../hooks/queries/useNegocioPublicaciones';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { DetallePublicacionNegocioContenido } from '../../components/negocios/publicaciones/DetallePublicacionNegocioContenido';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { Spinner } from '../../components/ui/Spinner';

export function PaginaPublicacionNegocioPublica() {
    const { publicacionId } = useParams<{ publicacionId: string }>();
    const navigate = useNavigate();
    const { data: publicacion, isLoading, isError } = usePublicacionNegocio(publicacionId);

    const urlActual =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/negocio-post/${publicacionId}`
            : `/p/negocio-post/${publicacionId}`;

    useOpenGraph({
        title: publicacion
            ? `${publicacion.sucursalNombre} · AnunciaYA`
            : 'Negocios de AnunciaYA',
        description: publicacion
            ? publicacion.texto.slice(0, 155)
            : 'Descubre negocios locales cerca de ti.',
        image: publicacion?.fotos?.[publicacion.fotoPortadaIndex] ?? publicacion?.fotos?.[0],
        url: urlActual,
        type: 'article',
    });

    if (isLoading) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !publicacion) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center px-6">
                <div className="flex max-w-md flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-slate-900">
                        Publicación no encontrada
                    </h2>
                    <p className="mb-5 text-sm text-slate-600">
                        Esta publicación no existe o ya fue eliminada.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md lg:cursor-pointer"
                    >
                        Conocer AnunciaYA
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            data-testid="pagina-publicacion-negocio-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto pb-8">
                <div className="lg:mx-auto lg:max-w-[720px] lg:px-6 2xl:px-8">
                    <div className="mx-3 mt-4 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:mt-8 lg:p-5">
                        <DetallePublicacionNegocioContenido publicacionId={publicacion.id} />
                    </div>

                    {/* CTA de marca — mismo patrón que la pública de MarketPlace. */}
                    <div className="mx-3 mt-6 overflow-hidden rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 via-white to-slate-50 p-5 shadow-md lg:mx-0 lg:p-7">
                        <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                            <div
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                style={{ background: 'linear-gradient(135deg, #60a5fa, #2563eb)' }}
                            >
                                <Store className="h-8 w-8 text-white lg:h-10 lg:w-10" strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                    Descubre negocios locales en AnunciaYA
                                </h2>
                                <p className="mt-1.5 text-sm font-medium text-slate-600">
                                    <span className="font-bold text-slate-900">Únete gratis.</span>{' '}
                                    Encuentra negocios cerca de ti, sus ofertas y publicaciones.
                                </p>
                            </div>
                            <button
                                data-testid="cta-conocer-anunciaya-negocios"
                                onClick={() => navigate('/registro')}
                                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-blue-700"
                            >
                                Únete gratis
                                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>

                <FooterPublico />
            </main>
        </div>
    );
}

export default PaginaPublicacionNegocioPublica;
