/**
 * ModalExitoPublicacion.tsx
 * ===========================
 * Modal overlay que aparece tras publicar con éxito el anuncio. Tiene:
 *   - Backdrop con scrim semitransparente
 *   - Card centrado con icono verde animado (pop)
 *   - Título "¡Tu anuncio está publicado!" + texto
 *   - 2 acciones: "Ver mi anuncio" (redirige al detalle) · "Publicar otro" (resetea wizard)
 *
 * Ubicación: apps/web/src/components/servicios/wizard/ModalExitoPublicacion.tsx
 */

import { ArrowRight, Check, Plus } from 'lucide-react';
import { useEffect } from 'react';

interface ModalExitoPublicacionProps {
    open: boolean;
    onVerAnuncio: () => void;
    onPublicarOtro: () => void;
}

export function ModalExitoPublicacion({
    open,
    onVerAnuncio,
    onPublicarOtro,
}: ModalExitoPublicacionProps) {
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exito-titulo"
            className="fixed inset-0 z-10000 flex items-center justify-center px-4"
            style={{
                background: 'rgba(15,23,42,0.42)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
            }}
            onClick={onVerAnuncio}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border-[1.5px] border-slate-200 max-w-[440px] w-full text-center shadow-md"
                style={{
                    padding: '36px 32px 28px',
                    animation: 'cem-in 350ms cubic-bezier(.16,.84,.32,1)',
                    boxShadow: '0 28px 56px -20px rgba(15,23,42,0.32)',
                }}
            >
                {/* Icono verde animado */}
                <div
                    className="relative w-[76px] h-[76px] mx-auto grid place-items-center"
                    style={{
                        animation:
                            'cem-in 550ms cubic-bezier(.16,.84,.32,1) both',
                    }}
                >
                    <div
                        className="w-[76px] h-[76px] rounded-full grid place-items-center text-white"
                        style={{
                            background:
                                'radial-gradient(circle at 32% 30%, #d1fae5, #34d399 60%, #10b981)',
                            boxShadow:
                                '0 14px 28px -10px rgba(16,185,129,0.55)',
                        }}
                    >
                        <Check className="w-10 h-10" strokeWidth={2.8} />
                    </div>
                </div>

                <h2
                    id="exito-titulo"
                    className="text-[22px] font-bold text-slate-900 tracking-tight mt-5 mb-2.5"
                >
                    ¡Tu anuncio está publicado!
                </h2>
                <p className="text-base text-slate-600 leading-[1.55] max-w-[340px] mx-auto font-normal">
                    Ya es visible en el feed de Clasificados. Los vecinos
                    podrán contactarte directamente.
                </p>

                <div className="flex flex-col gap-2.5 mt-7">
                    {/* Primario — gradiente sky con sombra, llama a la acción. */}
                    <button
                        type="button"
                        data-testid="exito-ver-anuncio"
                        onClick={onVerAnuncio}
                        className="group inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold text-[15px] text-white bg-linear-to-b from-sky-500 to-sky-700 lg:cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg"
                        style={{
                            boxShadow:
                                '0 10px 24px -8px rgba(2,132,199,0.55), 0 2px 4px rgba(2,132,199,0.18)',
                        }}
                    >
                        Ver mi anuncio
                        <ArrowRight
                            className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                            strokeWidth={2.5}
                        />
                    </button>
                    {/* Secundario — link discreto con icono +. */}
                    <button
                        type="button"
                        data-testid="exito-publicar-otro"
                        onClick={onPublicarOtro}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-full font-semibold text-[14px] text-slate-700 bg-transparent hover:bg-slate-100 lg:cursor-pointer active:scale-[0.98] transition-colors"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Publicar otro
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalExitoPublicacion;
