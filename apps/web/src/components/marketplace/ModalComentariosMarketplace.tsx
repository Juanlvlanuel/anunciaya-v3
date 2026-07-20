/**
 * ModalComentariosMarketplace.tsx
 * =================================
 * Modal con TODOS los comentarios de un artículo de MarketPlace — estilo
 * Facebook. Se abre desde el ícono de comentarios del feed
 * (`CardArticuloFeed.tsx`), reemplazando la vista previa inline que tenía
 * antes la card (2 hilos + input siempre visibles).
 *
 * `ModalAdaptativo` decide el chrome: en móvil es un `ModalBottom` casi de
 * pantalla completa (`alturaMaxima="xl"` = 93vh), solo comentarios (el
 * artículo ya se ve detrás, en el feed). En escritorio, un `Modal` centrado
 * y más ancho con 3 zonas fijas verticalmente:
 *   1. Header FIJO — datos del vendedor (`HeaderArticuloMarketplace`) + X.
 *   2. Zona con scroll ÚNICO — cuerpo del artículo
 *      (`CuerpoArticuloMarketplace`: título/precio/chips/descripción/galería/
 *      vistas) + lista de comentarios (`ListaComentariosMarketplace`), todo
 *      scrollea junto.
 *   3. Input de comentario FIJO al fondo (`InputComentarioMarketplace`).
 *
 * Mismo patrón exacto que `ModalComentariosPublicacionNegocio.tsx` (Negocios).
 *
 * Ubicación: apps/web/src/components/marketplace/ModalComentariosMarketplace.tsx
 */

import { X, Loader2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useArticuloMarketplace, useRegistrarVistaArticulo } from '../../hooks/queries/useMarketplace';
import { HeaderArticuloMarketplace } from './HeaderArticuloMarketplace';
import { CuerpoArticuloMarketplace } from './CuerpoArticuloMarketplace';
import { ListaComentariosMarketplace } from './ListaComentariosMarketplace';
import { InputComentarioMarketplace } from './InputComentarioMarketplace';
import { SeccionComentariosMarketplace } from './SeccionComentariosMarketplace';

interface ModalComentariosMarketplaceProps {
    abierto: boolean;
    onCerrar: () => void;
    articuloId: string;
    /** Deep-link desde notificación: comentario a resaltar + hacer scroll. */
    comentarioDestacadoId?: string | null;
}

export function ModalComentariosMarketplace({
    abierto,
    onCerrar,
    articuloId,
    comentarioDestacadoId,
}: ModalComentariosMarketplaceProps) {
    const { esMobile } = useBreakpoint();
    // Se pide siempre (no solo en escritorio): además de alimentar el header
    // y cuerpo del layout de escritorio y de registrar la vista (abrir el
    // modal de comentarios desde el feed también cuenta, igual que en
    // Negocios), es de donde se deriva `vendedorId` — un deep-link desde
    // notificación solo trae `articuloId`, no hay ningún card cargado del
    // que sacarlo.
    const { data: articulo } = useArticuloMarketplace(articuloId);
    useRegistrarVistaArticulo(articulo);
    const vendedorId = articulo?.vendedor.id ?? '';

    if (esMobile) {
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
                <div className="relative flex h-full min-h-0 flex-col">
                    {/* Sin título "Comentarios" — solo una X discreta arriba
                        a la derecha (sin fondo ni círculo, mismo criterio
                        que un ícono utilitario neutro). */}
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="absolute right-2 top-1 z-10 rounded-full p-1.5 text-slate-400"
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-10">
                        <SeccionComentariosMarketplace
                            articuloId={articuloId}
                            vendedorId={vendedorId}
                            comentarioDestacadoId={comentarioDestacadoId}
                        />
                    </div>
                </div>
            </ModalAdaptativo>
        );
    }

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            mostrarHeader={false}
            ancho="lg"
            paddingContenido="none"
        >
            <div className="relative flex h-full min-h-0 flex-col">
                {/* 1. Header fijo — datos del vendedor + X, misma línea. */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4">
                    <div className="min-w-0 flex-1">
                        {articulo && <HeaderArticuloMarketplace articulo={articulo} />}
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="shrink-0 rounded-full p-1.5 text-slate-400 lg:cursor-pointer lg:hover:bg-slate-100 lg:hover:text-slate-600"
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>

                {/* 2. Scroll único — cuerpo del artículo + comentarios. */}
                <div className="scroll-discreto min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {articulo ? (
                        <CuerpoArticuloMarketplace articulo={articulo} />
                    ) : (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
                        </div>
                    )}
                    <div className="border-t-[1.5px] border-slate-200 pt-4">
                        <ListaComentariosMarketplace
                            articuloId={articuloId}
                            vendedorId={vendedorId}
                            comentarioDestacadoId={comentarioDestacadoId}
                        />
                    </div>
                </div>

                {/* 3. Input fijo al fondo. */}
                <div className="shrink-0 border-t border-slate-200 p-4">
                    <InputComentarioMarketplace articuloId={articuloId} />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

export default ModalComentariosMarketplace;
