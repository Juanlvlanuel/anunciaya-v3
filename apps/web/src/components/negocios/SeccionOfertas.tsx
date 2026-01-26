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

import { useState, useMemo } from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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

export default function SeccionOfertas({ ofertas, whatsapp, negocioNombre, className = '' }: SeccionOfertasProps) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState<Oferta | null>(null);
    const { esMobile, esDesktop } = useBreakpoint();

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

    const handleClickOferta = (oferta: Oferta) => {
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
                    className="mb-3 flex w-full items-center justify-between rounded-xl bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 px-3 py-2 text-white transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] cursor-pointer"
                >
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Tag className="h-5 w-5" />
                        <span>Ofertas</span>
                        <span className="text-sm font-normal text-slate-300">({ofertasOrdenadas.length})</span>
                    </h2>
                    {/* Móvil: "Ver todas" + flecha animada | Desktop: solo flecha */}
                    {esMobile ? (
                        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium">Ver todas</span>
                            <ChevronRight className="h-5 w-5 animate-bounceX" />
                        </div>
                    ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    )}
                </button>

                {/* Grid de ofertas con FAB */}
                <div className="relative">
                    {/* 
                        Grid RESPONSIVO:
                        - Móvil: 1 columna (cards horizontales)
                        - Desktop: 3 columnas (cards verticales)
                    */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-5 2xl:gap-6 pr-0 lg:pr-8">
                        {ofertasVisibles.map((oferta) => (
                            <div key={getId(oferta)}>
                                {/* 
                                    inModal NO se pasa → por defecto es false
                                    Resultado: Animaciones COMPLETAS
                                    - Float: translateY(-15px) + rotate(5deg)
                                    - Ripple: Ondas expandiéndose
                                */}
                                <div onClick={() => handleClickOferta(oferta)} className="cursor-pointer">
                                    <OfertaCard oferta={oferta} size="normal" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* FAB circular para ver más - Solo laptop y desktop */}
                    {tienemasOfertas && (
                        <button
                            onClick={() => setModalAbierto(true)}
                            className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 2xl:h-10 2xl:w-10 items-center justify-center gap-0.5 rounded-full bg-blue-600 text-white shadow-xl transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer animate-pulseScale z-10"
                        >
                            <span className="text-[10px] 2xl:text-xs font-bold">+{ofertasRestantes}</span>
                            <ChevronRight className="h-3 w-3 2xl:h-3.5 2xl:w-3.5 animate-bounceX" />
                        </button>
                    )}
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
            />

            {/* Modal de detalle de oferta */}
            <ModalOfertaDetalle
                oferta={ofertaSeleccionada}
                whatsapp={whatsapp}
                negocioNombre={negocioNombre}
                onClose={() => setOfertaSeleccionada(null)}
            />
        </>
    );
}