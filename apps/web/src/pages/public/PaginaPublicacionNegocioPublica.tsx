/**
 * PaginaPublicacionNegocioPublica.tsx
 * ======================================
 * Versión PÚBLICA del detalle de una publicación de negocio, accesible sin
 * iniciar sesión. Sirve para los enlaces compartidos en redes sociales.
 *
 * Ruta: `/p/negocio-post/:publicacionId`
 *
 * Layout unificado con el resto de páginas públicas de compartir (Producto,
 * Ofertas, MarketPlace, Dinámicas, Servicios): grid `[3fr_2fr]` en desktop,
 * imagen full-bleed en móvil, card del negocio con ChatYA + "Ver negocio" +
 * "Publicado hace X". A diferencia de la versión privada (que reusa
 * `DetallePublicacionNegocioContenido`), esta NO muestra la columna de
 * comentarios — para un visitante sin sesión es un panel vacío que solo
 * dice "Inicia sesión para comentar" y no aporta nada; el resto de páginas
 * públicas tampoco muestran Q&A/comentarios a usuarios anónimos.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 * Ubicación: apps/web/src/pages/public/PaginaPublicacionNegocioPublica.tsx
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, BadgeCheck, ChevronRight, Store } from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;

import { usePublicacionNegocio } from '../../hooks/queries/useNegocioPublicaciones';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useIniciarChatNegocio } from '../../hooks/useIniciarChatNegocio';
import { useAuthStore } from '../../stores/useAuthStore';
import { GaleriaPublicacionNegocio } from '../../components/negocios/publicaciones/GaleriaPublicacionNegocio';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { ModalImagenes } from '../../components/ui/ModalImagenes';
import { Spinner } from '../../components/ui/Spinner';
import { formatearPrecio, formatearTiempoRelativo, fuenteThumbnail } from '../../utils/marketplace';
import type { PublicacionNegocioDetalle } from '../../types/negocioPublicaciones';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaPublicacionNegocioPublica() {
    const { publicacionId } = useParams<{ publicacionId: string }>();
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const iniciarChatNegocio = useIniciarChatNegocio();
    // Sin GPS: evita un segundo fetch cuando el navegador resuelve la
    // ubicación (el query key cambiaría) — el badge de distancia tampoco
    // tiene mucho sentido para un visitante anónimo llegando por link.
    const { data: publicacion, isLoading, isError } = usePublicacionNegocio(publicacionId);

    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

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
        image: (() => {
            const foto = publicacion?.fotos?.[publicacion.fotoPortadaIndex] ?? publicacion?.fotos?.[0];
            return foto ? fuenteThumbnail(foto) : undefined;
        })(),
        url: urlActual,
        type: 'article',
    });

    // ─── Render ───────────────────────────────────────────────────────────────

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

    const handleVerNegocio = () => {
        navigate(`/p/negocio/${publicacion.sucursalId}`);
    };

    const handleChatYA = async () => {
        if (!usuario) {
            setModalAuthAbierto(true);
            return;
        }
        await iniciarChatNegocio({
            usuarioId: publicacion.autorUsuarioId,
            sucursalId: publicacion.sucursalId,
            negocioNombre: publicacion.sucursalNombre,
            avatarUrl: publicacion.sucursalAvatarUrl,
        });
        navigate(`/negocios/${publicacion.sucursalId}`);
    };

    return (
        <div
            data-testid="pagina-publicacion-negocio-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="pb-5 lg:pb-8 lg:pt-2">
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA ─── */}
                            <div className="min-w-0 space-y-5 lg:mt-8 lg:space-y-6">
                                {/* Imagen — full-bleed en móvil, card bordeada en desktop */}
                                <div className="relative overflow-hidden bg-white lg:rounded-xl lg:border-2 lg:border-slate-300 lg:shadow-md">
                                    <GaleriaPublicacionNegocio
                                        fotos={publicacion.fotos}
                                        fotoPortadaIndex={publicacion.fotoPortadaIndex}
                                        fullBleedMovil
                                    />
                                </div>

                                {/* Bloque info — SOLO móvil. En desktop va en col-derecha */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                    <BloqueInfoPublicacion publicacion={publicacion} />
                                </div>

                                {/* Card negocio — SOLO móvil */}
                                <div className="mx-3 lg:hidden">
                                    <CardNegocioPublicacion
                                        publicacion={publicacion}
                                        onVerNegocio={handleVerNegocio}
                                        onContactar={handleChatYA}
                                    />
                                </div>
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop ─── */}
                            <div className="hidden min-w-0 lg:-mt-12 lg:flex lg:flex-col">
                                <div className="sticky top-10 flex flex-col gap-2">
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfoPublicacion publicacion={publicacion} compacto />
                                    </div>

                                    <CardNegocioPublicacion
                                        publicacion={publicacion}
                                        onVerNegocio={handleVerNegocio}
                                        onContactar={handleChatYA}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CTA de marca — mismo patrón que el resto de páginas públicas. */}
                        <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 via-white to-slate-50 p-5 shadow-md lg:mx-0 lg:p-7">
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
                </div>

                <FooterPublico />
            </main>

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                contexto={{ tipo: 'publicacion', titulo: publicacion.sucursalNombre }}
                urlRetorno={`/p/negocio-post/${publicacionId}`}
            />
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoPublicacionProps {
    publicacion: PublicacionNegocioDetalle;
    compacto?: boolean;
}

/** Eyebrow "Negocios · Ciudad" / texto de la publicación / precio (si aplica)
 *  / vistas. Mismo patrón que `BloqueInfo` de las demás páginas públicas. */
function BloqueInfoPublicacion({ publicacion, compacto = false }: BloqueInfoPublicacionProps) {
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className="text-blue-700">Negocios</span>
                {publicacion.ciudadNombre && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.5} />
                            {publicacion.ciudadNombre}
                        </span>
                    </>
                )}
            </p>

            <p
                data-testid="texto-publicacion"
                className={
                    compacto
                        ? 'text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-wrap 2xl:text-base'
                        : 'text-[15px] font-medium leading-relaxed text-slate-800 whitespace-pre-wrap'
                }
            >
                {publicacion.texto}
            </p>

            {publicacion.precio && (
                <div
                    className={
                        compacto
                            ? 'text-2xl font-extrabold leading-none tracking-tight text-blue-700 2xl:text-3xl'
                            : 'text-4xl font-extrabold leading-none tracking-tight text-blue-700 lg:text-5xl'
                    }
                >
                    {formatearPrecio(publicacion.precio)}
                </div>
            )}

            <div className={`flex items-center gap-1.5 font-semibold text-slate-600 ${compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'}`}>
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                {publicacion.totalVistas} {publicacion.totalVistas === 1 ? 'vista' : 'vistas'}
            </div>
        </div>
    );
}

interface CardNegocioPublicacionProps {
    publicacion: PublicacionNegocioDetalle;
    onVerNegocio: () => void;
    onContactar: () => void;
}

/** Card del negocio autor — avatar + nombre + ChatYA + "Publicado hace X" +
 *  "Ver negocio". Mismo patrón unificado que `CardNegocioArticulo`
 *  (Producto) y `CardNegocioOferta` (Ofertas). Sin WhatsApp — el feed de
 *  publicaciones no trae ese dato (solo la ficha del negocio lo tiene). */
function CardNegocioPublicacion({ publicacion, onVerNegocio, onContactar }: CardNegocioPublicacionProps) {
    const [avatarAbierto, setAvatarAbierto] = useState(false);
    const actividadLabel = `Publicado ${formatearTiempoRelativo(publicacion.createdAt)}`;

    return (
        <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
                <div
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 lg:h-16 lg:w-16 ${publicacion.sucursalAvatarUrl ? 'cursor-pointer' : ''}`}
                    onClick={publicacion.sucursalAvatarUrl ? () => setAvatarAbierto(true) : undefined}
                >
                    {publicacion.sucursalAvatarUrl ? (
                        <img
                            src={publicacion.sucursalAvatarUrl}
                            alt={publicacion.sucursalNombre}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                            <Store className="h-6 w-6 text-white" strokeWidth={2} />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1 text-sm font-bold text-slate-900 lg:text-base">
                        <span className="truncate">{publicacion.sucursalNombre}</span>
                        <BadgeCheck
                            className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                            strokeWidth={2.5}
                            aria-label="Negocio verificado"
                        />
                    </h3>
                </div>
            </div>

            {/* Fila 1: ícono ChatYA, alineado a la derecha */}
            <div className="mt-2 flex items-center justify-end">
                <button
                    type="button"
                    onClick={onContactar}
                    aria-label="Contactar por ChatYA"
                    className="flex shrink-0 items-center justify-center lg:cursor-pointer lg:hover:opacity-80"
                >
                    <img src="/ChatYA.webp" alt="" className="h-8 w-auto object-contain" />
                </button>
            </div>

            {/* Fila 2: "Publicado hace X" (izquierda) + "Ver negocio" (derecha) */}
            <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    {actividadLabel}
                </div>
                <button
                    type="button"
                    data-testid="btn-ver-negocio"
                    onClick={onVerNegocio}
                    aria-label={`Ver negocio de ${publicacion.sucursalNombre}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-blue-700 lg:cursor-pointer lg:hover:text-blue-900 lg:hover:underline"
                >
                    Ver negocio
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {avatarAbierto && publicacion.sucursalAvatarUrl && (
                <ModalImagenes
                    images={[publicacion.sucursalAvatarUrl]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
        </div>
    );
}

export default PaginaPublicacionNegocioPublica;
