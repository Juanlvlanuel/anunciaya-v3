/**
 * CarouselCupones.tsx
 * ====================
 * Botón "Mis Cupones" + carousel de cupones activos en ColumnaIzquierda.
 * Muestra cupones con cronómetro animado de urgencia.
 * El carousel se oculta en /mis-cupones (el botón siempre visible).
 *
 * UBICACIÓN: apps/web/src/components/layout/CarouselCupones.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Ticket, Store, Calendar, Gift, Timer, ChevronRight } from 'lucide-react';
import { useMisCuponesLista } from '../../hooks/queries/useMisCupones';
import type { TemaColumna } from './ColumnaIzquierda';

// =============================================================================
// ESTILOS
// =============================================================================

const ESTILOS = `
  @keyframes ring-urgencia {
    0% { transform: rotate(0deg) scale(1); }
    10% { transform: rotate(15deg) scale(1.1); }
    20% { transform: rotate(-15deg) scale(1.1); }
    30% { transform: rotate(10deg) scale(1.05); }
    40% { transform: rotate(-10deg) scale(1.05); }
    50% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(0deg) scale(1); }
  }
  .ring-urgencia {
    animation: ring-urgencia 2s ease-in-out infinite;
    color: #ef4444;
  }
  .carousel-cupones::-webkit-scrollbar { display: none; }
  .carousel-cupones { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// HELPERS
// =============================================================================

function formatearTipoValor(tipo: string, valor: string | null): string {
    switch (tipo) {
        case 'porcentaje': return `${valor}% desc.`;
        case 'monto_fijo': return `$${valor} desc.`;
        case '2x1': return '2×1';
        case '3x2': return '3×2';
        case 'envio_gratis': return 'Envío Gratis';
        default: return valor || 'Promo';
    }
}

function calcularDiasRestantes(fechaFin: string): number {
    const ahora = new Date();
    const fin = new Date(fechaFin);
    return Math.max(0, Math.ceil((fin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)));
}

function textoTiempo(dias: number): string {
    if (dias === 0) return '¡Hoy!';
    if (dias === 1) return '1 día';
    return `${dias} días`;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CarouselCupones({ tema }: { tema: TemaColumna }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { data: cupones = [] } = useMisCuponesLista();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [, setIndiceActivo] = useState(0);

    const esMisCupones = location.pathname.startsWith('/mis-cupones');
    const cuponesActivos = cupones.filter(c => c.estado === 'activo');

    // Auto-scroll cada 5 segundos
    useEffect(() => {
        if (esMisCupones || cuponesActivos.length <= 1) return;
        const intervalo = setInterval(() => {
            setIndiceActivo(prev => {
                const siguiente = (prev + 1) % cuponesActivos.length;
                scrollRef.current?.scrollTo({ left: siguiente * (scrollRef.current?.offsetWidth || 0), behavior: 'smooth' });
                return siguiente;
            });
        }, 5000);
        return () => clearInterval(intervalo);
    }, [esMisCupones, cuponesActivos.length]);

    return (
        <>
            <style>{ESTILOS}</style>

            {/* Botón Mis Cupones — siempre visible */}
            <button
                data-testid="btn-mis-cupones"
                onClick={() => navigate('/mis-cupones')}
                className={`w-full flex items-center gap-3 px-4 py-3 lg:py-2.5 2xl:py-3 cursor-pointer
                         border-l-4 border-l-transparent ${tema.listHoverBg} ${tema.listHoverBorder}`}
            >
                <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <Ticket className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm lg:text-sm 2xl:text-base ${tema.textPrimary}`}>Mis Cupones</p>
                </div>
                {cuponesActivos.length > 0 && (
                    <span className="text-[10px] font-bold bg-red-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center">
                        {cuponesActivos.length}
                    </span>
                )}
                <ChevronRight className={`w-5 h-5 ${tema.chevronColor}`} />
            </button>

            {/* Carousel — solo si hay cupones y no estamos en /mis-cupones */}
            {!esMisCupones && cuponesActivos.length > 0 && (
                <div className="px-4 lg:px-3 2xl:px-4 pb-1 lg:pb-0.5 2xl:pb-1">
                    {/* Cards */}
                    <div
                        ref={scrollRef}
                        className="carousel-cupones flex overflow-x-hidden snap-x snap-mandatory"
                    >
                        {cuponesActivos.map((cupon) => {
                            const diasRestantes = cupon.fechaFin ? calcularDiasRestantes(cupon.fechaFin) : null;

                            return (
                                <div key={cupon.cuponId} className="w-full shrink-0 snap-center">
                                    <button
                                        data-testid={`carousel-cupon-${cupon.cuponId}`}
                                        onClick={() => navigate('/mis-cupones')}
                                        className="w-full bg-white rounded-xl overflow-hidden flex flex-col cursor-pointer shadow-md"
                                        style={{ border: '1px solid #e2e8f0' }}
                                    >
                                        {/* Imagen + negocio overlay */}
                                        <div className="w-full h-36 2xl:h-40 relative overflow-hidden">
                                            {cupon.imagen ? (
                                                <img src={cupon.imagen} alt={cupon.titulo} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
                                                    <Ticket className="w-8 h-8 text-emerald-400/40" />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />

                                            {/* Negocio overlay */}
                                            <div className="absolute bottom-2 left-2.5 right-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {cupon.negocioLogo ? (
                                                        <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-10 h-10 2xl:w-11 2xl:h-11 rounded-full object-cover shrink-0 border-2 border-white" style={{ boxShadow: '0 0 25px rgba(255,255,255,1), 0 0 10px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,0.7)' }} />
                                                    ) : (
                                                        <div className="w-10 h-10 2xl:w-11 2xl:h-11 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                                                            <Store className="w-4 h-4 2xl:w-5 2xl:h-5 text-white shrink-0" />
                                                        </div>
                                                    )}
                                                    <p className="text-base lg:text-sm 2xl:text-base font-extrabold text-white truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{cupon.negocioNombre}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Línea separadora */}
                                        <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(to right, #10b981, #000000)' }} />

                                        {/* Info + cronómetro */}
                                        <div className="relative p-2.5 2xl:p-3 text-left">
                                            <div className="flex flex-col gap-0.5 pr-14 2xl:pr-16">
                                                <h4 className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-800 truncate">{cupon.titulo}</h4>
                                                <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-bold text-emerald-700">
                                                    <Ticket className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                                    {formatearTipoValor(cupon.tipo, cupon.valor)}
                                                </span>
                                                {cupon.fechaFin && (
                                                    <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                                                        <Calendar className="w-3 h-3 shrink-0" />
                                                        Vence {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                                {cupon.motivo && (
                                                    <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                                                        <Gift className="w-3 h-3 shrink-0" />
                                                        {cupon.motivo}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Cronómetro — abajo derecha */}
                                            {diasRestantes !== null && (
                                                <div className="absolute bottom-2 right-2.5 2xl:bottom-2.5 2xl:right-3 flex flex-col items-center gap-0.5">
                                                    <Timer className="w-9 h-9 2xl:w-10 2xl:h-10 ring-urgencia" strokeWidth={2} />
                                                    <span className="text-[11px] 2xl:text-[12px] font-extrabold text-red-600 whitespace-nowrap">
                                                        {textoTiempo(diasRestantes)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}
        </>
    );
}
