/**
 * PaginaPublicacionNegocio.tsx
 * ===============================
 * Detalle de una publicación de negocio como página completa. Se llega aquí
 * desde "Ver más" en el feed (`CardPublicacionNegocioFeed.tsx`, cuando hay
 * más de 2 comentarios) o por deep-link/compartir — a diferencia de
 * MarketPlace, aquí NO hay modal intermedio, siempre es página completa.
 * El cuerpo vive en `DetallePublicacionNegocioContenido.tsx` (compartido con
 * la versión pública).
 *
 * Header dark sticky con acento azul (identidad de Negocios), patrón
 * calcado de `PaginaArticuloMarketplace.tsx` (MarketPlace usa teal).
 *
 * Ruta privada: `/negocios/publicacion/:publicacionId`
 * Ubicación: apps/web/src/pages/private/negocios/PaginaPublicacionNegocio.tsx
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Store } from 'lucide-react';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { usePublicacionNegocio } from '../../../hooks/queries/useNegocioPublicaciones';
import { DetallePublicacionNegocioContenido } from '../../../components/negocios/publicaciones/DetallePublicacionNegocioContenido';
import { DropdownCompartir } from '../../../components/compartir/DropdownCompartir';
import { Spinner } from '../../../components/ui/Spinner';

export function PaginaPublicacionNegocio() {
    const { publicacionId } = useParams<{ publicacionId: string }>();
    const navigate = useNavigate();
    const cuerpoRef = useScrollAppShell();
    const handleVolver = useVolverAtras('/negocios');

    const { data: publicacion, isLoading, isError } = usePublicacionNegocio(publicacionId);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !publicacion) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-6">
                <div
                    data-testid="estado-404-publicacion-negocio"
                    className="flex max-w-md flex-col items-center text-center"
                >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                        <AlertCircle className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-slate-900">
                        Publicación no encontrada
                    </h2>
                    <p className="mb-5 text-sm font-medium text-slate-600">
                        Esta publicación no existe o fue eliminada por el negocio.
                    </p>
                    <button
                        onClick={() => navigate('/negocios')}
                        className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
                    >
                        Volver a Negocios
                    </button>
                </div>
            </div>
        );
    }

    const linkCompartido =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/negocio-post/${publicacion.id}`
            : `/p/negocio-post/${publicacion.id}`;

    return (
        <div
            data-testid="pagina-publicacion-negocio"
            className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full lg:pb-12"
        >
            {/* Header dark sticky — acento azul (marca Negocios). */}
            <div className="shrink-0 z-30 lg:sticky lg:top-0 lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                <div className="relative overflow-hidden rounded-none lg:rounded-b-3xl" style={{ background: '#000000' }}>
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(59,130,246,0.12) 0%, transparent 55%)' }}
                    />
                    <div
                        className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                        style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
                    />
                    <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <button
                                data-testid="btn-volver-publicacion-negocio"
                                onClick={handleVolver}
                                aria-label="Volver"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: 'linear-gradient(135deg, #60a5fa, #2563eb)' }}
                            >
                                <Store className="h-[18px] w-[18px] text-black" strokeWidth={2.5} />
                            </div>
                            <span className="ml-1.5 shrink-0 text-2xl font-extrabold tracking-tight text-white">
                                Detalle
                            </span>
                            <span aria-hidden className="ml-2 h-7 w-[1.5px] shrink-0 rounded-full bg-white/50" />
                            <span className="ml-1 min-w-0 truncate text-sm font-semibold text-white/85 lg:text-base">
                                {publicacion.sucursalNombre}
                            </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <DropdownCompartir
                                url={linkCompartido}
                                texto={`Mira la publicación de ${publicacion.sucursalNombre} en AnunciaYA`}
                                titulo={publicacion.sucursalNombre}
                                variante="dark"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido — `pt-3` separa la card del header dark (antes quedaban
                pegados). `pb-[150px]` en móvil despeja el input de comentario
                del FAB de ChatYA + BottomNav flotantes (mismo valor que usa
                `PaginaArticuloMarketplace.tsx` de MP para el mismo problema). */}
            <div
                ref={cuerpoRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-3 pb-[150px] lg:flex-none lg:overflow-visible lg:py-8 lg:mx-auto lg:max-w-[940px] 2xl:max-w-[1068px] lg:px-4"
            >
                {/* `DetallePublicacionNegocioContenido` pone su propia card
                    en móvil (unificada) y en escritorio (2 columnas
                    independientes — izquierda fija + comentarios que
                    fluyen) — la página ya no envuelve nada con su propia
                    card. */}
                <div className="mx-3 lg:mx-0">
                    <DetallePublicacionNegocioContenido publicacionId={publicacion.id} />
                </div>
            </div>
        </div>
    );
}

export default PaginaPublicacionNegocio;
