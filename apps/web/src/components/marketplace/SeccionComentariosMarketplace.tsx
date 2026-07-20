/**
 * SeccionComentariosMarketplace.tsx
 * ===================================
 * Sección de comentarios estilo Facebook para un artículo de MarketPlace:
 * lista con scroll propio + input inferior fijo. Compone
 * `ListaComentariosMarketplace` + `InputComentarioMarketplace` (separados
 * para poder colocarlos aparte en otros layouts — ver
 * `ModalComentariosMarketplace.tsx` en escritorio).
 *
 * Usada por:
 *  - `CardArticuloFeed.tsx` (modoModal, dentro de `ModalArticuloDetalle`).
 *  - `ModalComentariosMarketplace.tsx` (variante móvil).
 *
 * Ubicación: apps/web/src/components/marketplace/SeccionComentariosMarketplace.tsx
 */

import { ListaComentariosMarketplace } from './ListaComentariosMarketplace';
import { InputComentarioMarketplace } from './InputComentarioMarketplace';

interface SeccionComentariosMarketplaceProps {
    articuloId: string;
    /** id del vendedor del artículo — habilita la etiqueta "Vendedor" en sus comentarios. */
    vendedorId: string;
    comentarioDestacadoId?: string | null;
}

export function SeccionComentariosMarketplace({
    articuloId,
    vendedorId,
    comentarioDestacadoId,
}: SeccionComentariosMarketplaceProps) {
    return (
        <div className="flex h-full min-h-0 flex-col" data-testid="seccion-comentarios-marketplace">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ListaComentariosMarketplace
                    articuloId={articuloId}
                    vendedorId={vendedorId}
                    comentarioDestacadoId={comentarioDestacadoId}
                />
            </div>
            <InputComentarioMarketplace articuloId={articuloId} className="shrink-0 pt-3" />
        </div>
    );
}

export default SeccionComentariosMarketplace;
