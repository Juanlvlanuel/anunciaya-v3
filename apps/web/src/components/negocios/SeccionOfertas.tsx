/**
 * ============================================================================
 * SECCIÓN OFERTAS - Perfil de Negocio (Vista Pública)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/SeccionOfertas.tsx
 *
 * PROPÓSITO:
 * Mostrar ofertas en formato cupón con efecto tijera.
 * Click en header o FAB abre modal con todas las ofertas.
 *
 * CARACTERÍSTICAS:
 * - Grid RESPONSIVO: 1 columna (móvil), 3 columnas (desktop)
 * - Usa componente OfertaCard reutilizable
 * - FAB circular para ver más ofertas
 * - Animaciones completas en grid, reducidas en modal
 *
 * ACTUALIZADO: Enero 2026 - Grid 1 columna en móvil para layout horizontal
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDragScroll } from '@/hooks/useDragScroll';
import { api } from '@/services/api';
import OfertaCard, { OfertaCardStyles } from './OfertaCard';
import ModalOfertas from './ModalOfertas';
import ModalOfertaDetalle from './ModalOfertaDetalle';
import type { Oferta } from './OfertaCard';

// Re-exportar tipo para uso externo
export type { Oferta };

// =============================================================================
// TIPOS
// =============================================================================

interface SeccionOfertasProps {
    ofertas: Oferta[];
    whatsapp?: string | null;
    negocioNombre?: string;
    negocioUsuarioId?: string | null;
    className?: string;
}

// =============================================================================
// HELPER
// =============================================================================

const getId = (oferta: Oferta): string => {
    return oferta.id || oferta.ofertaId || '';
};

// =============================================================================
// COMPONENTE PRINCIPAL: SeccionOfertas
// =============================================================================

export default function SeccionOfertas({ ofertas, whatsapp, negocioNombre, negocioUsuarioId, className = '' }: SeccionOfertasProps) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState<Oferta | null>(null);
    const { esMobile, esDesktop } = useBreakpoint();

    // Drag-to-scroll en el carrusel mobile — affordance desktop al embeberse en preview/ChatYA
    const refScroll = useRef<HTMLDivElement>(null);
    useDragScroll(refScroll);

    // Ofertas visibles según breakpoint: móvil=3, laptop=2, desktop=3
    const ofertasVisiblesCount = esMobile ? 3 : (esDesktop ? 3 : 2);

    // ===========================================================================
    // ORDENAR OFERTAS POR FECHA DE VENCIMIENTO
    // ===========================================================================

    // Ordenar ofertas: las más próximas a vencer primero
    const ofertasOrdenadas = useMemo(() => {
        if (!ofertas || ofertas.length === 0) return [];

        return [...ofertas].sort((a, b) => {
            // Validar que ambas ofertas tengan fechaFin
            if (!a.fechaFin || !b.fechaFin) return 0;

            const fechaA = new Date(a.fechaFin).getTime();
            const fechaB = new Date(b.fechaFin).getTime();
            return fechaA - fechaB; // Las más cercanas primero
        });
    }, [ofertas]);

    // No mostrar sección si no hay ofertas
    if (!ofertasOrdenadas || ofertasOrdenadas.length === 0) {
        return null;
    }

    // Móvil: 3 ofertas, Laptop: 2 ofertas, Desktop: 3 ofertas
    const ofertasVisibles = ofertasOrdenadas.slice(0, ofertasVisiblesCount);
    const ofertasRestantes = ofertasOrdenadas.length - ofertasVisiblesCount;
    const tienemasOfertas = ofertasRestantes > 0;

    // ✅ Registrar vistas SOLO de ofertas visibles en el grid
    useEffect(() => {
        if (ofertasVisibles.length === 0) return;

        // Registrar vista para cada oferta visible (solo 1 vez por sesión)
        ofertasVisibles.forEach((oferta) => {
            const ofertaId = getId(oferta);
            const claveVista = `vista_oferta_${ofertaId}`;
            const claveEnProgreso = `vista_oferta_${ofertaId}_registrando`;
            
            // Si ya se registró O está en proceso, skip
            if (sessionStorage.getItem(claveVista) || sessionStorage.getItem(claveEnProgreso)) {
                return;
            }

            // Marcar como "en progreso" para evitar duplicados en Strict Mode
            sessionStorage.setItem(claveEnProgreso, 'true');
            
            api.post('/metricas/view', {
                entityType: 'oferta',
                entityId: ofertaId
            })
            .then(() => {
                // Marcar como completado y remover flag "en progreso"
                sessionStorage.setItem(claveVista, new Date().toISOString());
                sessionStorage.removeItem(claveEnProgreso);
            })
            .catch(() => {
                // Remover flag "en progreso" para permitir reintento
                sessionStorage.removeItem(claveEnProgreso);
            });
        });
    }, [ofertasVisibles]);

    const handleClickOferta = (oferta: Oferta) => {
        const ofertaId = getId(oferta);
        const claveClick = `click_oferta_${ofertaId}`;
        
        console.log('🖱️ Click en oferta:', oferta.titulo);
        console.log('🔑 Clave click:', claveClick);
        console.log('📦 Ya registrado?:', sessionStorage.getItem(claveClick));
        
        // Registrar click (solo 1 vez por oferta por sesión)
        if (!sessionStorage.getItem(claveClick)) {
            console.log('📤 Registrando click...');
            
            api.post('/metricas/click', {
                entityType: 'oferta',
                entityId: ofertaId
            })
            .then((response) => {
                console.log('✅ Click registrado exitosamente');
                console.log('📊 Respuesta:', response.data);
                sessionStorage.setItem(claveClick, new Date().toISOString());
            })
            .catch((error) => {
                console.error('❌ Error registrando click:', error);
                console.error('❌ Response:', error.response);
            });
        } else {
            console.log('⏭️ Click ya registrado en esta sesión');
        }

        // Abrir modal de detalle
        setOfertaSeleccionada(oferta);
    };

    return (
        <>
            {/* Estilos de animación (se inyectan una vez) */}
            <style>{OfertaCardStyles}</style>

            {/* Estilos adicionales para esta sección */}
            <style>{`
                @keyframes pulseScale {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
                
                @keyframes bounceX {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(3px); }
                }
                
                .animate-bounceX {
                    animation: bounceX 1s ease-in-out infinite;
                }
                
                .animate-pulseScale {
                    animation: pulseScale 2s ease-in-out infinite;
                }
            `}</style>

            <div className={className}>
                {/* Header clickeable */} 
                <button
                    onClick={() => setModalAbierto(true)}
                    className="mb-3 flex w-full items-center justify-between rounded-xl bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 hover:from-slate-700 hover:via-slate-600 hover:to-slate-500 px-3 py-2 text-white transition-all  hover:shadow-lg active:scale-[0.99] cursor-pointer"
                >
                    <h2 className="flex items-center gap-2 text-lg @5xl:text-base @[96rem]:text-lg font-semibold">
                        <Tag className="h-5 w-5" />
                        <span>Ofertas</span>
                        <span className="text-sm font-medium text-white/70">({ofertasOrdenadas.length})</span>
                    </h2>
                    {/* Móvil: "Ver todas" + flecha animada | Desktop: solo flecha */}
                    {esMobile ? (
                        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium">Ver todas</span>
                            <ChevronRight className="h-5 w-5 animate-bounceX" />
                        </div>
                    ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
                            <ChevronRight className="w-5 h-5 @5xl:w-4 @5xl:h-4 @[96rem]:w-5 @[96rem]:h-5 text-white animate-bounceX" />
                        </div>
                    )}
                </button>

                {/* Grid de ofertas con FAB */}
                <div className="relative">
                    {/*
                        Grid RESPONSIVO:
                        - Móvil: scroll horizontal con cards verticales (~180px de ancho)
                        - Desktop: 2-3 columnas (cards verticales)
                    */}
                    {/* Fade borde derecho: indicador de scroll horizontal en mobile/preview.
                        Oscuro + z-50 para cubrir el badge "HAPPY HOUR" que se proyecta fuera del card.
                        Altura acotada con top-4 bottom-4 (coincide con pt-4 pb-4 del scroll). */}
                    <div className="pointer-events-none absolute top-4 bottom-4 right-0 w-12 bg-gradient-to-l from-black/90 via-black/50 to-transparent @5xl:hidden z-50" />
                    {/* Mobile: scroll horizontal con cards verticales angostas | Desktop: grid
                        [&_*]:cursor-grab fuerza cursor en descendientes (cards tienen cursor-pointer propio). */}
                    <div
                        ref={refScroll}
                        className="flex gap-3 overflow-x-auto pt-4 pb-4 cursor-grab active:cursor-grabbing select-none [&_*]:cursor-grab @5xl:[&_*]:cursor-pointer @5xl:pt-0 @5xl:pb-0 @5xl:grid @5xl:grid-cols-2 @[96rem]:grid-cols-3 @5xl:gap-5 @[96rem]:gap-6 @5xl:overflow-visible @5xl:cursor-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {(esMobile ? ofertasOrdenadas.slice(0, 10) : ofertasVisibles).map((oferta, index) => {
                            const esUltimoDesktop = !esMobile && index === ofertasVisibles.length - 1 && tienemasOfertas;
                            return (
                                <div key={getId(oferta)} className="shrink-0 w-[180px] @5xl:w-auto relative">
                                    <div onClick={() => esUltimoDesktop ? setModalAbierto(true) : handleClickOferta(oferta)} className="cursor-pointer">
                                        <OfertaCard
                                            oferta={oferta}
                                            size={esMobile ? 'compact' : 'normal'}
                                            orientacion={esMobile ? 'vertical' : 'auto'}
                                        />
                                    </div>
                                    {/* Overlay "Ver todas" en el último item desktop */}
                                    {esUltimoDesktop && (
                                        <div
                                            className="absolute inset-0 z-30 rounded-xl bg-black/60 flex flex-col items-center justify-center gap-1 cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); setModalAbierto(true); }}
                                        >
                                            <span className="text-3xl font-bold text-white">+{ofertasRestantes}</span>
                                            <span className="text-sm font-semibold text-white/80">Ver todas</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {/* Botón "Ver todas" al final del scroll en mobile */}
                        {esMobile && ofertasOrdenadas.length > 10 && (
                            <div className="shrink-0 w-[180px] flex items-center justify-center">
                                <button
                                    onClick={() => setModalAbierto(true)}
                                    className="w-full h-[280px] rounded-xl border-2 border-slate-300 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                                >
                                    <span className="text-2xl font-bold text-white">+{ofertasOrdenadas.length - 10}</span>
                                    <span className="text-sm font-semibold text-white/70">Ver todas</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 
                Modal con todas las ofertas
                ModalOfertas debe pasar inModal={true} a cada OfertaCard
            */}
            <ModalOfertas
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                ofertas={ofertasOrdenadas}
                whatsapp={whatsapp ?? undefined}
                negocioNombre={negocioNombre}
                negocioUsuarioId={negocioUsuarioId}
            />

            {/* Modal de detalle de oferta */}
            <ModalOfertaDetalle
                oferta={ofertaSeleccionada}
                whatsapp={whatsapp}
                negocioNombre={negocioNombre}
                negocioUsuarioId={negocioUsuarioId}
                onClose={() => setOfertaSeleccionada(null)}
            />
        </>
    );
}