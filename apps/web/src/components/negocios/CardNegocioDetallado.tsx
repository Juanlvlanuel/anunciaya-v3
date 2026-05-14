/**
 * ============================================================================
 * COMPONENTE: CardNegocioDetallado — Glassmorphism Immersive
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/CardNegocioDetallado.tsx
 *
 * PROPÓSITO:
 * Card de negocio unificada con el mismo diseño glassmorphism de CardNegocio.
 * Usada en PaginaGuardados con showBookmark=true en lugar de showLike.
 *
 * USO:
 * - PaginaGuardados: showBookmark=true
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Store, ChevronRight } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useHorariosNegocio } from '../../hooks/useHorariosNegocio';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
import { ModalHorarios } from './ModalHorarios';
import { useNegocioPrefetch } from '../../hooks/queries/useNegocios';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';

// =============================================================================
// TIPOS
// =============================================================================

export interface CardNegocioDetalladoProps {
    negocio: {
        sucursalId: string;
        usuarioId?: string;
        nombre: string;
        imagenPerfil?: string;
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
    showBookmark?: boolean;
    onClickBookmark?: (e: React.MouseEvent) => void;
    bookmarkSelected?: boolean;
    className?: string;
}

// =============================================================================
// COLOR ACCENT POR CATEGORÍA
// =============================================================================

interface AccentColor { from: string; to: string; }

const ACCENT_MAP: Record<string, AccentColor> = {
    comida:      { from: '#f97316', to: '#ea580c' },
    salud:       { from: '#ef4444', to: '#dc2626' },
    belleza:     { from: '#ec4899', to: '#db2777' },
    servicios:   { from: '#3b82f6', to: '#2563eb' },
    comercios:   { from: '#22c55e', to: '#16a34a' },
    diversión:   { from: '#a855f7', to: '#7c3aed' },
    diversion:   { from: '#a855f7', to: '#7c3aed' },
    movilidad:   { from: '#14b8a6', to: '#0d9488' },
    finanzas:    { from: '#3b82f6', to: '#1d4ed8' },
    educación:   { from: '#8b5cf6', to: '#6d28d9' },
    educacion:   { from: '#8b5cf6', to: '#6d28d9' },
    mascotas:    { from: '#f59e0b', to: '#d97706' },
    turismo:     { from: '#eab308', to: '#ca8a04' },
};
const ACCENT_DEFAULT: AccentColor = { from: '#3b82f6', to: '#2563eb' };

function getAccentColor(categoria: string | undefined): AccentColor {
    if (!categoria) return ACCENT_DEFAULT;
    const key = categoria.toLowerCase().trim();
    if (ACCENT_MAP[key]) return ACCENT_MAP[key];
    for (const [mapKey, color] of Object.entries(ACCENT_MAP)) {
        if (key.includes(mapKey) || mapKey.includes(key)) return color;
    }
    return ACCENT_DEFAULT;
}

// =============================================================================
// KEYFRAMES
// =============================================================================

const CARD_STYLES = `
  @keyframes cndStatusPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes cardHeartBounce {
    0% { transform: scale(1); }
    30% { transform: scale(1.35); }
    50% { transform: scale(0.9); }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes cardHeartRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.3); opacity: 0; }
  }
`;

// =============================================================================
// HELPER: WhatsApp SVG
// =============================================================================

function WhatsAppIcon({ className }: { className: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardNegocioDetallado({
    negocio,
    onClick,
    showBookmark: _showBookmark = false,
    onClickBookmark,
    bookmarkSelected = false,
    className = '',
}: CardNegocioDetalladoProps) {

    const { prefetch: prefetchCompleto } = useNegocioPrefetch();
    const { abrirChatTemporal } = useChatYAStore();
    const { abrirChatYA } = useUiStore();

    const { horarios, loading: loadingHorarios, fetchHorarios, reset: resetHorarios } = useHorariosNegocio();
    const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);

    const [imagenActual, setImagenActual] = useState(0);
    const [imagenPrevia, setImagenPrevia] = useState<number | null>(null);
    const [crossfading, setCrossfading] = useState(false);

    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const [esVisible, setEsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const prefetchEjecutado = useRef(false);

    const accent = getAccentColor(negocio.categoria);

    const distanciaTexto = negocio.distanciaKm !== null && negocio.distanciaKm !== undefined
        ? Number(negocio.distanciaKm) < 1
            ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
            : `${Number(negocio.distanciaKm).toFixed(1)} km`
        : null;

    const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
    const tieneResenas = (negocio.totalCalificaciones ?? 0) > 0;

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setEsVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!esVisible) return;
        if (!negocio.galeria || negocio.galeria.length <= 1) return;
        const timer = setInterval(() => {
            irAImagen((imagenActual + 1) % negocio.galeria!.length);
        }, 3800);
        return () => clearInterval(timer);
    }, [esVisible, imagenActual, negocio.galeria]);

    const irAImagen = useCallback((siguiente: number) => {
        if (siguiente === imagenActual) return;
        setImagenPrevia(imagenActual);
        setCrossfading(true);
        setImagenActual(siguiente);
        setTimeout(() => { setCrossfading(false); setImagenPrevia(null); }, 500);
    }, [imagenActual]);

    const handleMouseEnter = () => {
        if (!prefetchEjecutado.current) {
            prefetchEjecutado.current = true;
            prefetchCompleto(negocio.sucursalId, '');
        }
    };

    const handleVerHorarios = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const data = await fetchHorarios(negocio.sucursalId);
        if (data) setModalHorariosAbierto(true);
    };

    const handleCerrarModalHorarios = () => {
        setModalHorariosAbierto(false);
        resetHorarios();
    };

    const handleChat = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!negocio.usuarioId) return;
        abrirChatTemporal({
            id: `temp_${Date.now()}`,
            otroParticipante: {
                id: negocio.usuarioId,
                nombre: negocio.nombre,
                apellidos: '',
                avatarUrl: negocio.imagenPerfil ?? null,
                negocioNombre: negocio.nombre,
                negocioLogo: negocio.imagenPerfil,
            },
            datosCreacion: {
                participante2Id: negocio.usuarioId,
                participante2Modo: 'comercial',
                participante2SucursalId: negocio.sucursalId,
                contextoTipo: 'negocio',
            },
        });
        abrirChatYA();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
        if (!negocio.galeria || negocio.galeria.length <= 1) return;
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > 40) {
            if (diff > 0) irAImagen((imagenActual + 1) % negocio.galeria.length);
            else irAImagen(imagenActual === 0 ? negocio.galeria.length - 1 : imagenActual - 1);
        }
    };

    return (
        <div
            ref={cardRef}
            onMouseEnter={handleMouseEnter}
            className={`relative w-full h-60 2xl:h-[220px] rounded-2xl cursor-default ${className}`}
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Wrapper imágenes — overflow-hidden aquí para respetar rounded */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden z-0">
                {/* Imagen previa (crossfade) */}
                {imagenPrevia !== null && negocio.galeria?.[imagenPrevia] && (
                    <img
                        src={negocio.galeria[imagenPrevia].url}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: crossfading ? 0 : 1, transition: 'opacity 0.5s ease', zIndex: 1 }}
                    />
                )}
                {/* Imagen actual */}
                {negocio.galeria && negocio.galeria.length > 0 ? (
                    <img
                        src={negocio.galeria[imagenActual]?.url}
                        alt={negocio.galeria[imagenActual]?.titulo || negocio.nombre}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: crossfading && imagenPrevia !== null ? 0.5 : 1, transition: 'opacity 0.5s ease', zIndex: 2 }}
                    />
                ) : negocio.imagenPerfil ? (
                    <img
                        src={negocio.imagenPerfil}
                        alt={negocio.nombre}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ zIndex: 2 }}
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-slate-200 flex items-center justify-center" style={{ zIndex: 2 }}>
                        <Store className="w-10 h-10 text-slate-600" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 z-3 pointer-events-none" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 32%, rgba(0,0,0,0.1) 55%, transparent 75%)',
                }} />

                {/* Accent glow bottom */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[3px] z-25 opacity-85"
                    style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
                />

                {/* Dot indicators */}
                {negocio.galeria && negocio.galeria.length > 1 && (
                    <div className="absolute top-2.5 left-0 right-0 z-15 flex justify-center gap-[5px]">
                        {negocio.galeria.slice(0, 5).map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => { e.stopPropagation(); irAImagen(index); }}
                                className={`h-[5px] rounded-full cursor-pointer transition-all duration-300 ease-out border-0 p-0 ${
                                    index === imagenActual
                                        ? 'w-[18px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                                        : 'w-[5px] bg-white/35'
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Status pill */}
                {negocio.estaAbierto !== null && negocio.estaAbierto !== undefined && (
                    <button
                        onClick={handleVerHorarios}
                        disabled={loadingHorarios}
                        className={`absolute top-2 left-2 z-15 backdrop-blur-[10px] rounded-full flex items-center cursor-pointer hover:opacity-90 transition-opacity gap-1.5 px-3 py-[5px] text-[13px] ${
                            negocio.estaAbierto ? 'bg-green-500/85' : 'bg-red-500/85'
                        }`}
                    >
                        <span className="relative w-1.5 h-1.5">
                            <span className="absolute inset-0 rounded-full bg-white z-2" />
                            <span
                                className="absolute -inset-[3px] rounded-full z-1"
                                style={{
                                    background: 'rgba(255,255,255,0.5)',
                                    animation: 'cndStatusPulse 2s ease-in-out infinite',
                                    animationPlayState: esVisible ? 'running' : 'paused',
                                }}
                            />
                        </span>
                        <span className="text-white font-bold leading-none">
                            {loadingHorarios ? '...' : negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
                        </span>
                    </button>
                )}

                {/* Heart / Select button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClickBookmark?.(e); }}
                    className={`absolute top-1.5 right-1.5 z-15 w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer overflow-visible ${
                        bookmarkSelected
                            ? 'bg-red-500 border-2 border-red-500'
                            : 'bg-black/25 backdrop-blur-[10px] border border-white/10'
                    }`}
                >
                    {bookmarkSelected ? (
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                fill="#ef4444"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Bottom content — fuera del wrapper para no recortarse */}
            <div className="absolute bottom-[3px] left-0 right-0 z-10 px-3 pb-1.5">
                {/* Logo + Nombre + Rating + Distancia */}
                <div className="flex items-center gap-2.5">
                    {negocio.imagenPerfil ? (
                        <img
                            src={negocio.imagenPerfil}
                            alt={negocio.nombre}
                            loading="lazy"
                            className="w-[42px] h-[42px] rounded-full object-cover shrink-0 border-2 border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                        />
                    ) : (
                        <div className="w-[42px] h-[42px] rounded-full shrink-0 border-2 border-white/80 bg-black/30 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                            <Store className="w-5 h-5 text-white/70" />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <h3
                            className="text-[19px] font-extrabold text-white leading-none truncate"
                            style={{ WebkitTextStroke: '1.8px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                        >
                            {negocio.nombre}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                                className="text-[13px] font-bold text-white"
                                style={{ WebkitTextStroke: '1.2px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                            >
                                {negocio.categoria || 'Negocio'}
                            </span>
                            {tieneResenas && (
                                <span className="flex items-center gap-0.5">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span
                                        className="text-[13px] font-extrabold text-white"
                                        style={{ WebkitTextStroke: '1.2px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                                    >
                                        {calificacion.toFixed(1)}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    {distanciaTexto && (
                        <div className="flex items-center gap-1 shrink-0 bg-black/40 backdrop-blur-sm rounded-[10px] px-2.5 py-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" fill="rgba(0,0,0,0.4)" stroke="none" />
                            </svg>
                            <span className="text-[13px] font-bold text-white">{distanciaTexto}</span>
                        </div>
                    )}
                </div>

                {/* Glass action bar */}
                <div className="flex items-center justify-between mt-1 bg-white/10 backdrop-blur-xl rounded-[14px] pl-3.5 pr-[5px] py-1.5 border border-white/12">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleChat(e); }}
                            className="cursor-pointer flex items-center gap-1.5 bg-transparent border-0 p-0 active:opacity-70 transition-opacity"
                        >
                            <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                        </button>
                        {negocio.whatsapp && (
                            <>
                                <div className="w-px h-6 bg-white/18" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp}`, '_blank'); }}
                                    className="cursor-pointer flex items-center bg-transparent border-0 p-0 active:opacity-70"
                                >
                                    <WhatsAppIcon className="w-8 h-8 text-green-500" />
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        className="flex items-center gap-1 rounded-[10px] px-3.5 py-[7px] text-[13px] font-bold text-white cursor-pointer border-0 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            boxShadow: '0 3px 14px rgba(15,23,42,0.50)',
                        }}
                    >
                        Ver Perfil
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {modalHorariosAbierto && horarios && (
                <ModalHorarios horarios={horarios} onClose={handleCerrarModalHorarios} />
            )}

            <style>{CARD_STYLES}</style>
        </div>
    );
}

export default CardNegocioDetallado;