/**
 * EstadosVacios.tsx — Estados vacíos del Home.
 * =============================================
 *  - FeedVacio: cuando no hay preguntas en la ciudad. Coyo (Rive) sobre un
 *    halo azul + botón "Hacer la primera pregunta" + chips de ejemplos que
 *    precargan el input. (Réplica del HTML del handoff.)
 *  - MisPreguntasVacioMovil: variante para el segmento "Mis preguntas" en móvil.
 *
 * Los callbacks (onEnfocar / onUsarEjemplo) los pasa PaginaInicio: el texto
 * del input vive en React (estado del padre), así que precargar un ejemplo
 * debe pasar por setTexto del padre, no escribir el DOM directamente.
 *
 * Ubicación: apps/web/src/components/home/EstadosVacios.tsx
 */

import { Inbox, Sparkles } from 'lucide-react';

const EJEMPLOS = ['¿Algún plomero por el centro?', '¿Dónde reparan laptops?', '¿Tortillería a domicilio?'];

interface FeedVacioProps {
    /** Enfoca el input de Coyo (botón "Hacer la primera pregunta"). */
    onEnfocar: () => void;
    /** Precarga un ejemplo en el input y lo enfoca (chips). */
    onUsarEjemplo: (texto: string) => void;
}

export function FeedVacio({ onEnfocar, onUsarEjemplo }: FeedVacioProps) {
    return (
        <div className="flex items-start justify-center pt-4 px-2 lg:items-center lg:pt-0 lg:min-h-[calc(100vh-10rem)]">
            <div className="flex flex-col items-center text-center gap-2 max-w-md">
                <div className="relative shrink-0 w-32 h-32 lg:w-36 lg:h-36">
                    <span
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'radial-gradient(circle at 50% 40%, #e9f1ff, #f3f8fe 70%)' }}
                    />
                    <img
                        src="/cabeza-coyo.webp"
                        alt="Coyo"
                        className="absolute inset-0 w-full h-full object-contain p-3 transition-transform duration-300 ease-out lg:hover:-translate-y-2 lg:hover:rotate-6 lg:hover:scale-105"
                        style={{ filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.15))' }}
                    />
                </div>
                <div>
                    <h3 className="text-lg lg:text-xl font-bold text-slate-800">Aún no hay preguntas hoy</h3>
                    <p className="mt-1.5 text-sm lg:text-base text-slate-500 font-medium leading-relaxed">
                        Haz la primera pregunta del día y Coyo te responderá al instante con negocios, ofertas y
                        servicios de tu ciudad.
                    </p>
                    <button
                        type="button"
                        onClick={onEnfocar}
                        data-testid="feed-vacio-empezar"
                        className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-white text-[13px] font-bold bg-slate-600 hover:bg-slate-800 lg:cursor-pointer active:scale-[0.98]"
                        style={{ boxShadow: '0 3px 10px rgba(30,41,59,0.30)' }}
                    >
                        <Sparkles size={15} strokeWidth={2.5} /> Hacer la primera pregunta
                    </button>
                    <div className="mt-5 hidden lg:flex flex-wrap items-center justify-center gap-1.5">
                        {EJEMPLOS.map((ej) => (
                            <button
                                key={ej}
                                type="button"
                                onClick={() => onUsarEjemplo(ej)}
                                className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-semibold text-slate-500 bg-white border border-slate-300 rounded-full hover:border-slate-400 hover:text-slate-700 lg:cursor-pointer transition-colors"
                            >
                                {ej}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MisPreguntasVacioMovil() {
    return (
        <div className="flex flex-col items-center text-center px-4 py-12">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-blue-200 shadow-sm mb-3">
                <Inbox size={26} strokeWidth={1.75} className="text-blue-500" />
            </span>
            <h4 className="text-base font-bold text-slate-800">Todavía no preguntas nada</h4>
            <p className="mt-1 text-sm text-slate-500 font-medium max-w-[260px] leading-relaxed">
                Usa el campo de arriba para preguntarle a Coyo. Tus preguntas aparecerán aquí.
            </p>
        </div>
    );
}
