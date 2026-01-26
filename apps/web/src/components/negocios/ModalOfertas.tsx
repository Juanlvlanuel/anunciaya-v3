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

import { Tag } from 'lucide-react';
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
}

const ContenidoOfertas = ({ ofertas, onClickOferta }: ContenidoOfertasProps) => {
    if (ofertas.length === 0) {
        return (
            <div className="py-12 lg:py-8 2xl:py-12 text-center">
                <Tag className="mx-auto h-12 w-12 lg:h-8 lg:w-8 2xl:h-12 2xl:w-12 text-slate-300" />
                <p className="mt-4 lg:mt-3 2xl:mt-4 text-slate-500 text-base lg:text-sm 2xl:text-base">
                    No hay ofertas disponibles
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-3 2xl:gap-4">
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

export default function ModalOfertas({ isOpen, onClose, ofertas, whatsapp, negocioNombre }: ModalOfertasProps) {
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
    const iconoTitulo = <Tag className="h-5 w-5 lg:h-4 lg:w-4 2xl:h-5 2xl:w-5 fill-white" />;

    return (
        <>
            {/* Estilos de animación para cards */}
            <style>{OfertaCardStyles}</style>

            {/* MÓVIL: Bottom Sheet */}
            {esMobile ? (
                <ModalBottom
                    abierto={isOpen}
                    onCerrar={onClose}
                    titulo={titulo}
                    iconoTitulo={iconoTitulo}
                >
                    <ContenidoOfertas ofertas={ofertas} onClickOferta={handleClickOferta} />
                </ModalBottom>
            ) : (
                /* ESCRITORIO: Modal Centrado */
                <Modal
                    abierto={isOpen}
                    onCerrar={onClose}
                    titulo={titulo}
                    iconoTitulo={iconoTitulo}
                    ancho="md"
                    className="lg:scale-[0.75] lg:max-h-[70vh] 2xl:scale-[0.95] 2xl:max-h-[75vh]"
                >
                    <ContenidoOfertas ofertas={ofertas} onClickOferta={handleClickOferta} />
                </Modal>
            )}

            {/* Modal de Detalle de Oferta */}
            {ofertaSeleccionada && (
                <ModalOfertaDetalle
                    oferta={ofertaSeleccionada}
                    onClose={handleCloseDetalle}
                    whatsapp={whatsapp}
                    negocioNombre={negocioNombre}
                    openedFromModal={true}
                />
            )}
        </>
    );
}