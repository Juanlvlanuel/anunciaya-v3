/**
 * FABPublicar.tsx
 * =================
 * FAB Publicar con **speed-dial expandible**: al hacer tap, en lugar de
 * navegar directo al wizard, expande 2 chips encima preguntando qué tipo de
 * publicación se va a crear:
 *
 *   [🤚 Ofrezco un servicio]    ← sky
 *   [🔍 Solicito un servicio]   ← amber (consistente con CardSolicito)
 *
 * Esto elimina la ambigüedad de "¿qué pasa al darle al +?" cuando arriba ya
 * hay un toggle de filtro (Ofrecen/Solicitan).
 *
 * Auto-hide: el FAB baja a `bottom-4` cuando el BottomNav se oculta y vuelve
 * a `bottom-20` cuando reaparece (móvil). En desktop queda fijo alineado a
 * la izquierda de la ColumnaDerecha del MainLayout.
 *
 * Ubicación: apps/web/src/components/servicios/FABPublicar.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Hand, Plus, Search, X } from 'lucide-react';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

interface FABPublicarProps {
    /** Callback al elegir "Ofrezco un servicio". */
    onOfrezco: () => void;
    /** Callback al elegir "Solicito un servicio". */
    onSolicito: () => void;
}

export function FABPublicar({ onOfrezco, onSolicito }: FABPublicarProps) {
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });
    const [expandido, setExpandido] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Cierra al hacer click fuera o al presionar Escape.
    useEffect(() => {
        if (!expandido) return;
        const handleClickFuera = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setExpandido(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandido(false);
        };
        document.addEventListener('mousedown', handleClickFuera);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickFuera);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [expandido]);

    const elegirOfrezco = () => {
        setExpandido(false);
        onOfrezco();
    };
    const elegirSolicito = () => {
        setExpandido(false);
        onSolicito();
    };

    return (
        <div
            ref={ref}
            data-testid="fab-servicios"
            style={{
                transition:
                    'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
            }}
            className={`fixed right-4 z-30 flex flex-col items-end gap-2 lg:bottom-6 lg:right-[330px] 2xl:right-[394px] ${
                bottomNavVisible ? 'bottom-20' : 'bottom-4'
            }`}
        >
            {/* Speed-dial: chips emergentes — alineados a la derecha
                (items-end del wrapper outer). */}
            {expandido && (
                <div
                    data-testid="fab-speeddial"
                    className="flex flex-col items-end gap-2 animate-fab-speeddial-in"
                >
                    <button
                        data-testid="fab-opcion-ofrezco"
                        onClick={elegirOfrezco}
                        className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer hover:shadow-lg hover:shadow-sky-500/40 transition"
                    >
                        <Hand className="w-4 h-4" strokeWidth={2.25} />
                        Ofrezco un servicio
                    </button>
                    <button
                        data-testid="fab-opcion-solicito"
                        onClick={elegirSolicito}
                        className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full bg-linear-to-b from-amber-400 to-amber-600 text-white font-semibold text-sm shadow-md shadow-amber-500/30 lg:cursor-pointer hover:shadow-lg hover:shadow-amber-500/40 transition"
                    >
                        <Search className="w-4 h-4" strokeWidth={2.25} />
                        Solicito un servicio
                    </button>
                </div>
            )}

            {/* FAB principal — sub-wrapper con `items-center` para que el
                círculo y el label "Publicar" queden centrados horizontalmente
                entre sí (mismo patrón que MP/Ofertas). El wrapper outer sigue
                con `items-end` para que el conjunto FAB+chips quede pegado al
                borde derecho. */}
            <div className="flex flex-col items-center gap-1">
                <button
                    data-testid="fab-publicar-servicios"
                    onClick={() => setExpandido((v) => !v)}
                    aria-label={expandido ? 'Cerrar opciones' : 'Publicar'}
                    aria-expanded={expandido}
                    className="lg:cursor-pointer"
                >
                    <span
                        className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-white shadow-fab-sky ring-2 ring-sky-300/30 transition-transform ${
                            expandido ? 'rotate-45' : 'hover:scale-105'
                        }`}
                    >
                        {expandido ? (
                            <X className="h-6 w-6" strokeWidth={2.75} />
                        ) : (
                            <Plus
                                className="h-6 w-6"
                                strokeWidth={2.75}
                                style={{
                                    animation:
                                        'fab-publicar-srv-pulse 2.4s ease-in-out infinite',
                                }}
                            />
                        )}
                    </span>
                </button>
                <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-bold text-slate-700 shadow-md backdrop-blur-sm lg:bg-transparent lg:px-0 lg:py-0 lg:text-base lg:shadow-none lg:backdrop-blur-none">
                    {expandido ? 'Cerrar' : 'Publicar'}
                </span>
            </div>

            <style>{`
                @keyframes fab-publicar-srv-pulse {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(90deg) scale(1.15); }
                }
                @keyframes fab-speeddial-in {
                    from { opacity: 0; transform: translateY(8px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                .animate-fab-speeddial-in > * {
                    animation: fab-speeddial-in 180ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                }
                .animate-fab-speeddial-in > *:nth-child(2) {
                    animation-delay: 60ms;
                }
            `}</style>
        </div>
    );
}

export default FABPublicar;
