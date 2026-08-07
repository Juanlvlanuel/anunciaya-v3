/**
 * ModalesAccionServicio.tsx
 * ===========================
 * Modales de confirmación del vendedor sobre una publicación de Servicios —
 * Pausar, Eliminar — con el mismo patrón visual que
 * `components/dinamicas/ModalesAccionDinamica.tsx`: header con gradiente
 * color-coded + icono en círculo, card de resumen de la publicación, aviso
 * contextual, footer de 2 botones. Subcomponentes compartidos en
 * `components/ui/ModalAccionGradiente.tsx`.
 *
 * Reemplazan los `notificar.confirmar()` genéricos que usaba
 * `MisPublicacionesServiciosSection.tsx` (unificación agosto 2026).
 *
 * Ubicación: apps/web/src/components/servicios/ModalesAccionServicio.tsx
 */

import { Briefcase, PauseCircle, Trash2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import {
    GRADIENTES_ACCION,
    HeaderAccionGradiente,
    ResumenAccionModal,
    AvisoContextualModal,
    BotonesAccionModal,
} from '../ui/ModalAccionGradiente';

/** Shape mínimo que necesita este modal — `PublicacionServicio` lo satisface. */
interface PublicacionParaModal {
    id: string;
    titulo: string;
}

// =============================================================================
// MODAL 1 — PAUSAR
// =============================================================================

interface ModalPausarServicioProps {
    abierto: boolean;
    publicacion: PublicacionParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalPausarServicio({
    abierto,
    publicacion,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalPausarServicioProps) {
    if (!publicacion) return null;

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
                    <ResumenAccionModal icono={Briefcase} texto={publicacion.titulo} />

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
// MODAL 2 — ELIMINAR
// =============================================================================

interface ModalEliminarServicioProps {
    abierto: boolean;
    publicacion: PublicacionParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalEliminarServicio({
    abierto,
    publicacion,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalEliminarServicioProps) {
    if (!publicacion) return null;

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
                    <ResumenAccionModal icono={Briefcase} texto={publicacion.titulo} />

                    <AvisoContextualModal tono="rojo">
                        Esta acción no se puede deshacer. La publicación dejará de existir para siempre.
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
