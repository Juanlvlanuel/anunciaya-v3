/**
 * EstadosVacios.tsx — Estados vacíos del Home.
 * =============================================
 *  - FeedVacio: cuando no hay preguntas en la ciudad. Cabeza de Coyo sobre un
 *    halo azul + botón "Hacer la primera pregunta" + chips de ejemplos que
 *    precargan el input. (Réplica del HTML del handoff.)
 *
 * Los callbacks (onEnfocar / onUsarEjemplo) los pasa PaginaInicio: el texto
 * del input vive en React (estado del padre), así que precargar un ejemplo
 * debe pasar por setTexto del padre, no escribir el DOM directamente.
 *
 * Ubicación: apps/web/src/components/home/EstadosVacios.tsx
 */

import { Sparkles } from 'lucide-react';

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
                <div className="relative shrink-0 w-32 h-32 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36">
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
                    <h3 className="text-lg lg:text-base 2xl:text-xl font-bold text-slate-800">Aún no hay preguntas hoy</h3>
                    <p className="mt-1.5 text-sm lg:text-xs 2xl:text-base text-slate-600 font-medium leading-relaxed">
                        Haz la primera pregunta del día y Coyo te responderá al instante con negocios, ofertas y
                        servicios de tu ciudad.
                    </p>
                    <button
                        type="button"
                        onClick={onEnfocar}
                        data-testid="feed-vacio-empezar"
                        className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-white text-sm font-bold bg-slate-600 hover:bg-slate-800 lg:cursor-pointer active:scale-[0.98]"
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
                                className="inline-flex items-center justify-center h-9 px-4 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-300 rounded-full hover:border-slate-400 hover:text-slate-700 lg:cursor-pointer"
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
