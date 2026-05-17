/**
 * ModalSugerenciaSeccion.tsx
 * ============================
 * Modal que aparece cuando el backend detecta que el contenido del anuncio
 * encaja mejor en otra sección (típicamente MarketPlace por "vendo X").
 *
 * 2 acciones:
 *   - "Sí, llévame a MarketPlace" → navega al wizard de MP
 *   - "Continuar publicando aquí" → reenvía con `confirmadoPorUsuario=true`
 *
 * Sprint 7.7. Patrón calcado de `ModalSugerenciaModeracion` (MarketPlace).
 *
 * Ubicación: apps/web/src/components/servicios/wizard/ModalSugerenciaSeccion.tsx
 */

import { AlertTriangle, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';

interface ModalSugerenciaSeccionProps {
    open: boolean;
    /** Sección sugerida por el backend (por ahora solo 'marketplace'). */
    seccion: 'marketplace';
    onContinuarAqui: () => void;
    onIrAOtraSeccion: () => void;
    onClose: () => void;
}

const COPY_SECCION: Record<
    'marketplace',
    {
        titulo: string;
        descripcion: string;
        ctaIr: string;
        ctaQuedarse: string;
    }
> = {
    marketplace: {
        titulo: '¿Estás vendiendo un objeto?',
        descripcion:
            'En Servicios la gente contrata personas para que hagan algo (plomería, fotografía, tutorías). Si lo tuyo es vender un artículo, te conviene publicarlo en MarketPlace — ahí lo van a encontrar quienes buscan comprar.',
        ctaIr: 'Llévame a MarketPlace',
        ctaQuedarse: 'Continuar en Servicios',
    },
};

export function ModalSugerenciaSeccion({
    open,
    seccion,
    onContinuarAqui,
    onIrAOtraSeccion,
    onClose,
}: ModalSugerenciaSeccionProps) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const copy = COPY_SECCION[seccion];

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-10000 flex items-center justify-center px-4"
            style={{
                background: 'rgba(15,23,42,0.42)',
                backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border-[1.5px] border-slate-200 max-w-md w-full shadow-md"
                style={{
                    boxShadow: '0 28px 56px -20px rgba(15,23,42,0.32)',
                }}
            >
                {/* Header con icono */}
                <div className="px-6 pt-6 pb-2 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 grid place-items-center mb-4">
                        <AlertTriangle
                            className="w-8 h-8 text-amber-600"
                            strokeWidth={2}
                        />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                        {copy.titulo}
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-600 font-medium leading-relaxed">
                        {copy.descripcion}
                    </p>
                </div>

                {/* Acciones */}
                <div className="px-5 pb-5 pt-4 flex flex-col gap-2.5">
                    <button
                        type="button"
                        data-testid="modal-sugerencia-ir"
                        onClick={onIrAOtraSeccion}
                        className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-b from-cyan-500 to-cyan-700 text-white font-bold text-[14px] lg:cursor-pointer active:scale-[0.98] shadow-md"
                    >
                        <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
                        {copy.ctaIr}
                    </button>
                    <button
                        type="button"
                        data-testid="modal-sugerencia-quedarse"
                        onClick={onContinuarAqui}
                        className="py-3 rounded-xl text-slate-700 font-semibold text-[14px] hover:bg-slate-100 lg:cursor-pointer"
                    >
                        {copy.ctaQuedarse}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalSugerenciaSeccion;
