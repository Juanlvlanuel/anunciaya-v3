/**
 * ModalComentariosMarketplace.tsx
 * =================================
 * Modal con TODOS los comentarios de un artículo de MarketPlace — estilo
 * Facebook. Se abre desde el ícono de comentarios del feed
 * (`CardArticuloFeed.tsx`), reemplazando la vista previa inline que tenía
 * antes la card (2 hilos + input siempre visibles).
 *
 * `ModalAdaptativo` decide el chrome: en móvil es un `ModalBottom` casi de
 * pantalla completa (`alturaMaxima="xl"` = 93vh); en escritorio, un `Modal`
 * centrado. Mismo patrón exacto que `ModalComentariosPublicacionNegocio.tsx`.
 *
 * Ubicación: apps/web/src/components/marketplace/ModalComentariosMarketplace.tsx
 */

import { X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SeccionComentariosMarketplace } from './SeccionComentariosMarketplace';

interface ModalComentariosMarketplaceProps {
    abierto: boolean;
    onCerrar: () => void;
    articuloId: string;
    vendedorId: string;
}

export function ModalComentariosMarketplace({
    abierto,
    onCerrar,
    articuloId,
    vendedorId,
}: ModalComentariosMarketplaceProps) {
    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            mostrarHeader={false}
            ancho="md"
            alturaMaxima="xl"
            sinScrollInterno
            paddingContenido="none"
        >
            <div className="relative flex h-full min-h-0 flex-col px-4 pb-4 pt-10">
                {/* Sin título "Comentarios" — solo una X discreta arriba a
                    la derecha (sin fondo ni círculo, mismo criterio que un
                    ícono utilitario neutro). */}
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                    className="absolute right-2 top-1 z-10 rounded-full p-1.5 text-slate-400 lg:cursor-pointer lg:hover:bg-slate-100 lg:hover:text-slate-600"
                >
                    <X className="h-5 w-5" strokeWidth={2} />
                </button>
                <SeccionComentariosMarketplace
                    articuloId={articuloId}
                    vendedorId={vendedorId}
                />
            </div>
        </ModalAdaptativo>
    );
}

export default ModalComentariosMarketplace;
