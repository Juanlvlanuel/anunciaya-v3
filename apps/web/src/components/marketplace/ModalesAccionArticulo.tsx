/**
 * ModalesAccionArticulo.tsx
 * ==========================
 * Modales de confirmación del vendedor sobre un artículo de MarketPlace —
 * Pausar, Marcar como vendido, Eliminar — con el mismo patrón visual que
 * `components/dinamicas/ModalesAccionDinamica.tsx`: header con gradiente
 * color-coded + icono en círculo, card de resumen del artículo, aviso
 * contextual, footer de 2 botones. Subcomponentes compartidos en
 * `components/ui/ModalAccionGradiente.tsx`.
 *
 * Reemplazan los 2 `ModalAdaptativo` genéricos que vivían inline en
 * `PaginaMisPublicaciones.tsx` (unificación agosto 2026). Pausar no tenía
 * confirmación (se ejecutaba directo desde el menú "⋯") — se agregó para
 * quedar en paridad con Servicios/Dinámicas.
 *
 * Ubicación: apps/web/src/components/marketplace/ModalesAccionArticulo.tsx
 */

import { CheckCircle2, Package, PauseCircle, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import {
    GRADIENTES_ACCION,
    HeaderAccionGradiente,
    ResumenAccionModal,
    AvisoContextualModal,
    BotonesAccionModal,
} from '../ui/ModalAccionGradiente';

/** Shape mínimo que necesita este modal — `ArticuloMarketplace` lo satisface. */
interface ArticuloParaModal {
    id: string;
    titulo: string;
}

// =============================================================================
// MODAL 1 — PAUSAR
// =============================================================================

interface ModalPausarArticuloProps {
    abierto: boolean;
    articulo: ArticuloParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalPausarArticulo({
    abierto,
    articulo,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalPausarArticuloProps) {
    if (!articulo) return null;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={PauseCircle}
                    titulo="Pausar publicación"
                    subtitulo="Deja de aparecer temporalmente"
                    gradiente={GRADIENTES_ACCION.amber}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenAccionModal icono={Package} texto={articulo.titulo} />

                    <AvisoContextualModal tono="amber">
                        Dejará de mostrarse en el feed. Puedes reactivarla cuando quieras.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={onConfirmar}
                        pendiente={pendiente}
                        textoConfirmar="Sí, pausar"
                        textoPendiente="Pausando…"
                        colorBase="#f59e0b"
                        colorOscuro="#d97706"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// MODAL 2 — MARCAR COMO VENDIDO
// =============================================================================

interface ModalMarcarVendidoArticuloProps {
    abierto: boolean;
    articulo: ArticuloParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalMarcarVendidoArticulo({
    abierto,
    articulo,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalMarcarVendidoArticuloProps) {
    if (!articulo) return null;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={CheckCircle2}
                    titulo="Marcar como vendido"
                    subtitulo="Confirma la venta"
                    gradiente={GRADIENTES_ACCION.verde}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenAccionModal icono={Package} texto={articulo.titulo} />

                    <AvisoContextualModal tono="verde">
                        Desaparecerá del feed público y de los guardados de otros usuarios. Permanecerá en tu
                        historial.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={onConfirmar}
                        pendiente={pendiente}
                        textoConfirmar="Sí, lo vendí"
                        textoPendiente="Guardando…"
                        colorBase="#059669"
                        colorOscuro="#047857"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// MODAL 3 — ELIMINAR
// =============================================================================

interface ModalEliminarArticuloProps {
    abierto: boolean;
    articulo: ArticuloParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalEliminarArticulo({
    abierto,
    articulo,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalEliminarArticuloProps) {
    if (!articulo) return null;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={Trash2}
                    titulo="Eliminar publicación"
                    subtitulo="Esta acción no se puede deshacer"
                    gradiente={GRADIENTES_ACCION.rojo}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenAccionModal icono={Package} texto={articulo.titulo} />

                    <AvisoContextualModal tono="rojo">
                        Esta acción no se puede deshacer. La publicación desaparecerá de todos los listados.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={onConfirmar}
                        pendiente={pendiente}
                        textoConfirmar="Sí, eliminar"
                        textoPendiente="Eliminando…"
                        colorBase="#dc2626"
                        colorOscuro="#b91c1c"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}
