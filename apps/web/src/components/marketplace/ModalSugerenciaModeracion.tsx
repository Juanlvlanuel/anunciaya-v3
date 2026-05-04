/**
 * ModalSugerenciaModeracion.tsx
 * ==============================
 * Modal de sugerencia suave del wizard de Publicar. Aparece cuando el backend
 * detecta que el texto del usuario podría ser un servicio o una búsqueda
 * disfrazada, pero NO bloquea (severidad 'sugerencia').
 *
 * El usuario puede:
 *  - "Editar mi publicación" → cierra el modal y vuelve al paso anterior.
 *  - "Continuar de todos modos" → reenvía la mutation con
 *    `confirmadoPorUsuario: true` para que el backend acepte sin bloquear.
 *
 * NOTA: el botón "Llevar a Servicios" (que aparecía en la spec) se omite
 * en v1 porque la sección /servicios todavía es placeholder. Se agregará
 * cuando esa sección exista.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§7 Moderación 1.3, 1.4)
 * Sprint:      docs/prompts Marketplace/Sprint-4-Wizard-Publicar.md
 *
 * Ubicación: apps/web/src/components/marketplace/ModalSugerenciaModeracion.tsx
 */

import { AlertTriangle } from 'lucide-react';

interface ModalSugerenciaModeracionProps {
    abierto: boolean;
    /** Categoría detectada por el backend */
    categoria: 'servicio' | 'busqueda';
    /** Mensaje literal devuelto por el backend */
    mensaje: string;
    onEditar: () => void;
    onContinuar: () => void;
    /** Loading mientras se reenvía la mutation con confirmadoPorUsuario=true */
    cargandoContinuar?: boolean;
}

const TITULOS: Record<'servicio' | 'busqueda', string> = {
    servicio: '¿Esto es un servicio?',
    busqueda: '¿Estás buscando algo?',
};

export function ModalSugerenciaModeracion({
    abierto,
    categoria,
    mensaje,
    onEditar,
    onContinuar,
    cargandoContinuar = false,
}: ModalSugerenciaModeracionProps) {
    if (!abierto) return null;

    return (
        <div
            data-testid="modal-sugerencia-moderacion"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle
                            className="h-7 w-7 text-amber-600"
                            strokeWidth={2}
                        />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {TITULOS[categoria]}
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600">
                        {mensaje}
                    </p>
                </div>
                <div className="flex gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <button
                        data-testid="btn-editar-publicacion"
                        onClick={onEditar}
                        disabled={cargandoContinuar}
                        className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                        Editar mi publicación
                    </button>
                    <button
                        data-testid="btn-continuar-publicando"
                        onClick={onContinuar}
                        disabled={cargandoContinuar}
                        className="flex-1 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                    >
                        {cargandoContinuar ? 'Publicando…' : 'Continuar de todos modos'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalSugerenciaModeracion;
