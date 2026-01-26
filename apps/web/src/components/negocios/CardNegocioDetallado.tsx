/**
 * ============================================================================
 * COMPONENTE: CardNegocioDetallado
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/negocios/CardNegocioDetallado.tsx
 * 
 * PROPÓSITO:
 * Card reutilizable de negocio con diseño detallado
 * Unificado para usar en PaginaNegocios y PaginaGuardados
 * 
 * CARACTERÍSTICAS:
 * - Carrusel de imágenes con autoplay (3 segundos)
 * - Flechas de navegación y puntos indicadores
 * - Estado abierto/cerrado con modal de horarios
 * - Botones de contacto (ChatYA, WhatsApp)
 * - Rating y calificaciones
 * - Distancia
 * - Like button (configurable con showLike)
 * - Bookmark (configurable con showBookmark)
 * - Botón Ver Perfil
 * 
 * USO:
 * - PaginaNegocios: showLike=true, showBookmark=false
 * - PaginaGuardados: showLike=false, showBookmark=true
 */

import { useState, useEffect, useRef } from 'react';
import {
    Store,
    Star,
    Bookmark,
    Check,
    Smile,
    Frown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useHorariosNegocio } from '../../hooks/useHorariosNegocio';
import { useVotos } from '../../hooks/useVotos';
import { ModalHorarios } from './ModalHorarios';

// =============================================================================
// TIPOS
// =============================================================================

export interface CardNegocioDetalladoProps {
    negocio: {
        sucursalId: string;
        nombre: string;
        imagen_perfil?: string;
        galeria?: Array<{ url: string; titulo?: string }>;
        categoria?: string;
        estaAbierto?: boolean | null;
        distanciaKm?: number | null;
        calificacionPromedio?: string;
        totalCalificaciones?: number;
        whatsapp?: string;
        liked?: boolean;
    };
    onClick: () => void;
    /** Mostrar botón de Like (corazón) - default: true */
    showLike?: boolean;
    /** Mostrar botón de Bookmark (guardado) - default: false */
    showBookmark?: boolean;
    onClickBookmark?: (e: React.MouseEvent) => void;
    bookmarkSelected?: boolean;
    className?: string;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardNegocioDetallado({
    negocio,
    onClick,
    showLike = true,
    showBookmark = false,
    onClickBookmark,
    bookmarkSelected = false,
    className = '',
}: CardNegocioDetalladoProps) {
    const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
    const { horarios, loading: loadingHorarios, fetchHorarios, reset: resetHorarios } = useHorariosNegocio();

    // Estado del carrusel
    const [imagenActual, setImagenActual] = useState(0);
    const likeButtonRef = useRef<HTMLButtonElement>(null);
    const [likePosition, setLikePosition] = useState({ top: 0, left: 0 });

    // Autoplay del carrusel (3 segundos)
    useEffect(() => {
        if (!negocio.galeria || negocio.galeria.length <= 1) return;

        const intervalo = setInterval(() => {
            setImagenActual((prev) => (prev === negocio.galeria!.length - 1 ? 0 : prev + 1));
        }, 3000);

        return () => clearInterval(intervalo);
    }, [negocio.galeria]);

    const handleVerHorarios = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const data = await fetchHorarios(negocio.sucursalId);
        if (data) {
            setModalHorariosAbierto(true);
        }
    };

    const handleCerrarModalHorarios = () => {
        setModalHorariosAbierto(false);
        resetHorarios();
    };

    const handleChat = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implementar navegación a ChatYA
    };

    const { liked, toggleLike } = useVotos({
        entityType: 'sucursal',
        entityId: negocio.sucursalId,
        initialLiked: negocio.liked,
    });

    const [likeAnimation, setLikeAnimation] = useState<'like' | 'unlike' | null>(null);

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Calcular posición del botón para animación
        if (likeButtonRef.current) {
            const rect = likeButtonRef.current.getBoundingClientRect();
            setLikePosition({
                top: rect.top - 50,
                left: rect.left - 30,
            });
        }

        // Mostrar animación
        setLikeAnimation(liked ? 'unlike' : 'like');
        toggleLike();

        // Quitar animación después de 2s
        setTimeout(() => {
            setLikeAnimation(null);
        }, 2000);
    };

    const handleImagenAnterior = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!negocio.galeria) return;
        setImagenActual((prev) => (prev === 0 ? negocio.galeria!.length - 1 : prev - 1));
    };

    const handleImagenSiguiente = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!negocio.galeria) return;
        setImagenActual((prev) => (prev === negocio.galeria!.length - 1 ? 0 : prev + 1));
    };

    const distanciaTexto = negocio.distanciaKm !== null && negocio.distanciaKm !== undefined
        ? Number(negocio.distanciaKm) < 1
            ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
            : `${Number(negocio.distanciaKm).toFixed(1)} km`
        : null;

    const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
    const tieneResenas = (negocio.totalCalificaciones ?? 0) > 0;

    return (
        <div
            onClick={onClick}
            className={`
        w-full max-w-[270px] h-[360px] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative
        transition-all duration-200 cursor-pointer hover:shadow-xl
        ${className}
      `}
        >
            {/* Línea de acento superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500 to-blue-600 z-10"></div>

            {/* Carrusel de imágenes */}
            <div className="relative h-[172px] shrink-0 mt-1 overflow-hidden">
                {/* Bookmark (solo si showBookmark=true) */}
                {showBookmark && onClickBookmark && (
                    <div className="absolute top-1 right-2 z-20">
                        <button
                            onClick={onClickBookmark}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${bookmarkSelected
                                    ? 'bg-amber-500 border-2 border-amber-500'
                                    : 'bg-white/90 backdrop-blur border-2 border-white hover:bg-amber-50'
                                }`}
                        >
                            {bookmarkSelected ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                        </button>
                    </div>
                )}

                {/* Imágenes del carrusel */}
                {negocio.galeria && negocio.galeria.length > 0 ? (
                    <>
                        <img
                            src={negocio.galeria[imagenActual]?.url}
                            alt={negocio.galeria[imagenActual]?.titulo || negocio.nombre}
                            className="w-full h-full object-cover"
                        />

                        {/* Flechas de navegación (solo si hay más de 1 imagen) */}
                        {negocio.galeria.length > 1 && (
                            <>
                                {/* Flecha izquierda */}
                                <button
                                    onClick={handleImagenAnterior}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110 z-10"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                                </button>

                                {/* Flecha derecha */}
                                <button
                                    onClick={handleImagenSiguiente}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110 z-10"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-700" />
                                </button>

                                {/* Indicadores de puntos (máximo 5) */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                    {negocio.galeria.slice(0, 5).map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImagenActual(index);
                                            }}
                                            className={`w-2 h-2 rounded-full cursor-pointer transition-all ${index === imagenActual
                                                    ? 'bg-white w-4'
                                                    : 'bg-white/50 hover:bg-white/75'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : negocio.imagen_perfil ? (
                    <img
                        src={negocio.imagen_perfil}
                        alt={negocio.nombre}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Store className="w-10 h-10 text-slate-300" />
                    </div>
                )}

                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent pointer-events-none"></div>

                {/* Badge estado abierto/cerrado */}
                {negocio.estaAbierto !== null && negocio.estaAbierto !== undefined && (
                    <button
                        onClick={handleVerHorarios}
                        disabled={loadingHorarios}
                        className={`absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-sm cursor-pointer hover:opacity-90 transition-opacity z-10 ${negocio.estaAbierto ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full bg-white ${loadingHorarios ? 'animate-pulse' : ''}`}></span>
                        <span className="text-xs font-semibold text-white">
                            {loadingHorarios ? 'Cargando...' : negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
                        </span>
                    </button>
                )}

                {/* Like button (solo si showLike=true) */}
                {showLike && (
                    <div className="absolute top-1 right-1">
                        <button
                            ref={likeButtonRef}
                            onClick={handleLikeClick}
                            className="w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                        >
                            <svg className="w-9 h-9" viewBox="0 0 24 24">
                                <path
                                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                    fill={liked ? "#ef4444" : "white"}
                                    stroke={liked ? "white" : "#ef4444"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Animación flotante de like - FIXED fuera del card */}
                {likeAnimation && (
                    <div
                        className={`fixed flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap z-9999 shadow-lg animate-[floatUp_1.5s_ease-out_forwards] ${likeAnimation === 'like' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                        style={{
                            top: likePosition.top,
                            left: likePosition.left,
                        }}
                    >
                        {likeAnimation === 'like' ? (
                            <>
                                <Smile className="w-5 h-5" />
                                <span className="text-sm font-medium">¡Gracias!</span>
                            </>
                        ) : (
                            <>
                                <Frown className="w-5 h-5" />
                                <span className="text-sm font-medium">¡Oh no!</span>
                            </>
                        )}
                    </div>
                )}

                {/* Distancia */}
                {distanciaTexto && (
                    <span className="absolute bottom-2 right-2 bg-white/95 text-xs font-semibold text-slate-700 px-2 py-1 rounded-full shadow-sm z-10">
                        {distanciaTexto}
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="px-2.5 py-2 flex-1 flex flex-col">
                {/* Nombre + Rating */}
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 flex-1">
                        {negocio.nombre}
                    </h3>
                    {tieneResenas && (
                        <div className="flex items-center gap-0.5 shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold text-slate-700">{calificacion.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400">({negocio.totalCalificaciones ?? 0})</span>
                        </div>
                    )}
                </div>

                {/* Categoría */}
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                    {negocio.categoria || 'Negocios'}
                </p>

                {/* Espaciador */}
                <div className="flex-1"></div>

                {/* Contenedor de contacto + botón */}
                <div className="flex flex-col gap-2 mt-1">
                    {/* Sección de contacto */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-300"></div>
                            <span className="text-xs text-slate-400 font-medium">Contactar</span>
                            <div className="flex-1 h-px bg-slate-300"></div>
                        </div>

                        {/* Botones de contacto */}
                        {/* Botones de contacto */}
                        <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-xl px-2 py-1">
                            {/* ChatYA */}
                            <button
                                onClick={handleChat}
                                className="cursor-pointer hover:scale-105 transition-transform"
                            >
                                <img src="/ChatYA.webp" alt="ChatYA" className="h-6 w-auto" />
                            </button>

                            <div className="w-px h-6 bg-slate-300"></div>

                            {/* WhatsApp */}
                            {negocio.whatsapp && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://wa.me/${negocio.whatsapp}`, '_blank');
                                    }}
                                    className="flex items-center gap-0.5 cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span className="text-[14px] font-medium text-green-600">WhatsApp</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Botón Ver Perfil */}
                    <button
                        onClick={onClick}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
                    >
                        <span className="text-sm font-semibold">Ver Perfil</span>
                        <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Modal de horarios */}
            {modalHorariosAbierto && horarios && (
                <ModalHorarios
                    horarios={horarios}
                    onClose={handleCerrarModalHorarios}
                />
            )}

            {/* Animación float */}
            <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px);
          }
        }
      `}</style>
        </div>
    );
}

export default CardNegocioDetallado;