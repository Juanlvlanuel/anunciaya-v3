/**
 * ============================================================================
 * MODAL OFERTAS - Todas las Ofertas del Negocio
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalOfertas.tsx
 *
 * PROPÓSITO:
 * Modal que muestra todas las ofertas de un negocio.
 * Se abre al hacer click en header de ofertas o FAB "Ver todas".
 *
 * CARACTERÍSTICAS:
 * - Slide up desde abajo (móvil) con ModalBottom
 * - Modal centrado (desktop) con Modal
 * - Cierre con click fuera, botón X, o ESC
 * - Scroll interno para muchas ofertas
 * - Grid RESPONSIVO: 1 columna (móvil), 2 columnas (desktop)
 * - Usa OfertaCard en tamaño compact
 *
 * ACTUALIZADO: Enero 2026 - Grid 1 columna en móvil para layout horizontal
 */

import { Tag, X } from 'lucide-react';
import { useState } from 'react';
import { ModalBottom } from '@/components/ui/ModalBottom';
import { Modal } from '@/components/ui/Modal';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import OfertaCard, { OfertaCardStyles } from './OfertaCard';
import ModalOfertaDetalle from './ModalOfertaDetalle';
import type { Oferta } from './OfertaCard';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalOfertasProps {
    isOpen: boolean;
    onClose: () => void;
    ofertas: Oferta[];
    whatsapp?: string;
    negocioNombre?: string;
    negocioUsuarioId?: string | null;
}

// =============================================================================
// HELPER
// =============================================================================

const getId = (oferta: Oferta): string => {
    return oferta.id || oferta.ofertaId || '';
};

// =============================================================================
// COMPONENTE: Contenido del Modal (reutilizable)
// =============================================================================

interface ContenidoOfertasProps {
    ofertas: Oferta[];
    onClickOferta: (oferta: Oferta) => void;
    esMobile: boolean;
}

const ContenidoOfertas = ({ ofertas, onClickOferta, esMobile }: ContenidoOfertasProps) => {
    if (ofertas.length === 0) {
        return (
            <div className="py-12 lg:py-8 2xl:py-12 text-center">
                <Tag className="mx-auto h-12 w-12 lg:h-8 lg:w-8 2xl:h-12 2xl:w-12 text-slate-400" />
                <p className="mt-4 lg:mt-3 2xl:mt-4 text-slate-600 text-base lg:text-sm 2xl:text-base font-medium">
                    No hay ofertas disponibles
                </p>
            </div>
        );
    }

    // Grid condicional por hook (respeta BreakpointOverride del preview):
    //   - Mobile / preview embebido: 1 columna (cards horizontales dentro del OfertaCard).
    //   - Desktop real: 2 columnas (cards verticales cómodas).
    return (
        <div className={esMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-3 2xl:gap-4'}>
            {ofertas.map((oferta) => (
                <OfertaCard
                    key={getId(oferta)}
                    oferta={oferta}
                    size="compact"
                    className="w-full cursor-pointer"
                    inModal={true}
                    onClick={() => onClickOferta(oferta)}
                />
            ))}
        </div>
    );
};

// =============================================================================
// COMPONENTE PRINCIPAL: ModalOfertas
// =============================================================================

export default function ModalOfertas({ isOpen, onClose, ofertas, whatsapp, negocioNombre, negocioUsuarioId }: ModalOfertasProps) {
    const { esMobile } = useBreakpoint();
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState<Oferta | null>(null);

    // Handler para abrir detalle de oferta
    const handleClickOferta = (oferta: Oferta) => {
        setOfertaSeleccionada(oferta);
    };

    // Handler para cerrar detalle de oferta
    const handleCloseDetalle = () => {
        setOfertaSeleccionada(null);
    };

    // Título compartido
    const titulo = `Todas las Ofertas (${ofertas.length})`;

    return (
        <>
            {/* Estilos de animación para cards */}
            <style>{OfertaCardStyles}</style>

            {/* MÓVIL: Bottom Sheet */}
            {/* MÓVIL: Bottom Sheet */}
            {esMobile ? (
                <ModalBottom
                    abierto={isOpen}
                    onCerrar={onClose}
                    titulo={titulo}
                    iconoTitulo={<Tag className="w-5 h-5 text-white" />}
                    mostrarHeader={false}
                    headerOscuro
                    sinScrollInterno={true}
                    alturaMaxima="lg"
                    className="h-[80vh]!"
                >
                    {/* Header con gradiente emerald */}
                    <div
                        className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                    >
                        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                <Tag className="w-4.5 h-4.5 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-lg">{titulo}</h3>
                        </div>
                    </div>
                    {/* Contenido con scroll */}
                    <div className="flex-1 overflow-y-auto min-h-0 p-3">
                        <ContenidoOfertas ofertas={ofertas} onClickOferta={handleClickOferta} esMobile={esMobile} />
                    </div>
                </ModalBottom>
            )
                : (
                    /* ESCRITORIO: Modal Centrado */
                    <Modal
                        abierto={isOpen}
                        onCerrar={onClose}
                        mostrarHeader={false}
                        ancho="md"
                        paddingContenido="none"
                        className="flex flex-col h-[75vh]! lg:h-[80vh]!"
                    >
                        {/* Header con gradiente emerald */}
                        <div
                            className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                        >
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2 2xl:gap-3">
                                    <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                        <Tag className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
                                    </div>
                                    <h3 className="text-white font-bold text-base 2xl:text-lg">{titulo}</h3>
                                </div>
                                <button onClick={onClose} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                        {/* Contenido con scroll */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-3 2xl:p-4">
                            <ContenidoOfertas ofertas={ofertas} onClickOferta={handleClickOferta} esMobile={esMobile} />
                        </div>
                    </Modal>
                )}

            {/* Modal de Detalle de Oferta */}
            {ofertaSeleccionada && (
                <ModalOfertaDetalle
                    oferta={ofertaSeleccionada}
                    onClose={handleCloseDetalle}
                    whatsapp={whatsapp}
                    negocioNombre={negocioNombre}
                    negocioUsuarioId={negocioUsuarioId}
                />
            )}
        </>
    );
}