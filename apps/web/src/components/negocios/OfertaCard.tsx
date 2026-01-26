/**
 * ============================================================================
 * OFERTA CARD - Componente Reutilizable de Card de Oferta
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/OfertaCard.tsx
 *
 * PROPÓSITO:
 * Card estilo cupón con efecto tijera, badge animado y panel glass-dark.
 * Reutilizable en SeccionOfertas y ModalOfertas.
 *
 * CARACTERÍSTICAS:
 * - Badge circular (esquina) o rectangular (centrado) según tipo
 * - Tijera fija SVG con animación abrir/cerrar
 * - Panel inferior glass-dark
 * - Efecto brillo en imagen y badge
 * - Hover: elevación + zoom imagen
 *
 * CREADO: Enero 2026
 */

import React from 'react';
import { Tag, Truck, Clock, Flame } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAutoFitText } from '@/hooks/useAutoFitText';

// =============================================================================
// TIPOS
// =============================================================================

export interface Oferta {
    id?: string;
    ofertaId?: string;
    titulo: string;
    descripcion?: string | null;
    imagen?: string | null;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
    valor?: number | string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    compraMinima?: string | null;
    limiteUsos?: number | null;
    usosActuales?: number;
    activo?: boolean;
}

interface OfertaCardProps {
    oferta: Oferta;
    /** Tamaño de la card */
    size?: 'normal' | 'compact';
    /** Clase CSS adicional */
    className?: string;
    /** Si está dentro de un modal (para reducir animaciones) */
    inModal?: boolean;
    /** Handler para click en la card */
    onClick?: () => void;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES POR TIPO
// =============================================================================

interface ConfigTipo {
    // Badge
    badgeGradient: string;
    badgeBorder: string;
    badgePosition: 'corner' | 'center';
    badgeShape: 'circular' | 'rectangular';
    // Panel
    barColor: string;
    // Hover shadow
    hoverShadow: string;
}

const CONFIG_TIPO: Record<Oferta['tipo'], ConfigTipo> = {
    porcentaje: {
        badgeGradient: 'from-red-500 via-red-600 to-rose-700',
        badgeBorder: 'border-red-400/30',
        badgePosition: 'corner',
        badgeShape: 'rectangular',
        barColor: 'from-red-500 to-rose-600',
        hoverShadow: 'group-hover:shadow-red-500/20',
    },
    monto_fijo: {
        badgeGradient: 'from-orange-600 via-amber-600 to-orange-700',
        badgeBorder: 'border-orange-400/60',
        badgePosition: 'corner',
        badgeShape: 'rectangular',
        barColor: 'from-orange-600 to-amber-600',
        hoverShadow: 'group-hover:shadow-orange-500/20',
    },
    '2x1': {
        badgeGradient: 'from-cyan-500 via-teal-600 to-cyan-700',
        badgeBorder: 'border-cyan-300/60',
        badgePosition: 'corner',
        badgeShape: 'circular',
        barColor: 'from-cyan-500 to-teal-600',
        hoverShadow: 'group-hover:shadow-cyan-500/20',
    },
    '3x2': {
        badgeGradient: 'from-pink-500 via-rose-600 to-pink-700',
        badgeBorder: 'border-pink-300/60',
        badgePosition: 'corner',
        badgeShape: 'circular',
        barColor: 'from-pink-500 to-rose-600',
        hoverShadow: 'group-hover:shadow-pink-500/20',
    },
    envio_gratis: {
        badgeGradient: 'from-blue-400 via-sky-500 to-blue-500',
        badgeBorder: 'border-blue-300/60',
        badgePosition: 'corner',
        badgeShape: 'rectangular',
        barColor: 'from-blue-400 to-sky-500',
        hoverShadow: 'group-hover:shadow-blue-500/20',
    },
    otro: {
        badgeGradient: 'from-amber-500 via-orange-600 to-amber-700',
        badgeBorder: 'border-amber-400/30',
        badgePosition: 'corner',
        badgeShape: 'rectangular',
        barColor: 'from-amber-500 to-orange-600',
        hoverShadow: 'group-hover:shadow-amber-500/20',
    },
};

// =============================================================================
// HELPERS
// =============================================================================

const getValorNumerico = (oferta: Oferta): number | undefined => {
    if (typeof oferta.valor === 'number') return oferta.valor;
    if (typeof oferta.valor === 'string' && !isNaN(Number(oferta.valor))) {
        return Number(oferta.valor);
    }
    return undefined;
};

const getValorTexto = (oferta: Oferta): string | null => {
    if (typeof oferta.valor === 'string' && isNaN(Number(oferta.valor))) {
        return oferta.valor;
    }
    return null;
};

const getBadgeTexto = (tipo: Oferta['tipo'], valorNumerico?: number, valorTexto?: string | null): string => {
    switch (tipo) {
        case 'porcentaje':
            return `${valorNumerico || 0}% OFF`;
        case 'monto_fijo':
            return `$${valorNumerico || 0}`;
        case '2x1':
            return '2x1';
        case '3x2':
            return '3x2';
        case 'envio_gratis':
            return 'Envío Gratis';
        case 'otro':
            return valorTexto || 'OFERTA';
        default:
            return 'OFERTA';
    }
};

// =============================================================================
// HELPERS PARA BADGE DE URGENCIA
// =============================================================================

/**
 * Calcula días restantes hasta que venza la oferta
 */
const calcularDiasRestantes = (fechaFin?: string | null): number | null => {
    if (!fechaFin) return null;

    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const fecha = new Date(fechaFin);
        fecha.setHours(0, 0, 0, 0);

        const diffTime = fecha.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    } catch {
        return null;
    }
};

interface BadgeUrgenciaConfig {
    texto: string;
    gradient: string;
    border: string;
    icono: "flame" | "clock";
}

const getBadgeUrgenciaConfig = (dias: number): BadgeUrgenciaConfig => {
    if (dias === 0) {
        return {
            texto: "¡Vence Hoy!",
            gradient: "from-red-600 to-orange-600",
            border: "border-red-400/60",
            icono: "flame"
        };
    } else if (dias <= 3) {
        return {
            texto: dias === 1 ? "Últimos 2 día" : `Quedan ${dias} días`,
            gradient: "from-red-600 to-orange-600",
            border: "border-red-400/60",
            icono: "flame"
        };
    } else if (dias <= 7) {
        return {
            texto: `Vence en ${dias} días`,
            gradient: "from-amber-500 to-orange-500",
            border: "border-amber-400/60",
            icono: "clock"
        };
    } else {
        return {
            texto: `${dias} días`,
            gradient: "from-emerald-500 to-teal-600",
            border: "border-emerald-400/60",
            icono: "clock"
        };
    }
};

/**
 * Genera gradiente de 3 tonos para el panel según tipo de oferta
 */
const getPanelGradient = (tipo: Oferta['tipo']): string => {
    // Cada tipo tiene un gradiente de 3 tonos que contrasta con su badge
    const gradientes: Record<Oferta['tipo'], string> = {
        // Badge rojo → Panel NEGRO (gradiente original)
        porcentaje: 'linear-gradient(to top, #000000 0%, #1e293b 80%, #475569 100%)',
        
        // Badge naranja oscuro → Panel azul marino oscuro
        monto_fijo: 'linear-gradient(to top, #0c4a6e 0%, #075985 70%, #0369a1 100%)',
        
        // Badge cyan-teal → Panel NEGRO (gradiente original - SIN CAMBIOS)
        '2x1': 'linear-gradient(to top, #000000 0%, #1e293b 80%, #475569 100%)',
        
        // Badge rosa → Panel azul-verde oscuro (teal)
        '3x2': 'linear-gradient(to top, #042f2e 0%, #115e59 70%, #0f766e 100%)',
        
        // Badge azul claro → Panel azul marino oscuro
        envio_gratis: 'linear-gradient(to top, #0c4a6e 0%, #075985 70%, #0369a1 100%)',
        
        // Badge naranja → Panel verde oscuro
        otro: 'linear-gradient(to top, #052e16 0%, #14532d 70%, #166534 100%)',
    };
    
    return gradientes[tipo] || gradientes.otro;
};

/**
 * Componente de separador visual según tipo de oferta
 */
const SeparadorTipo = ({ tipo: _tipo, barColor }: { tipo: Oferta['tipo']; barColor: string }) => {
    // Todos usan el mismo estilo: líneas desvanecidas + 3 puntos de color
    return (
        <div className="flex items-center gap-2 py-0.5">
            <div className="h-px flex-1 bg-white/20" />
            <div className="flex gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full bg-linear-to-r ${barColor}`} />
                <div className={`h-1.5 w-1.5 rounded-full bg-linear-to-r ${barColor}`} />
                <div className={`h-1.5 w-1.5 rounded-full bg-linear-to-r ${barColor}`} />
            </div>
            <div className="h-px flex-1 bg-white/20" />
        </div>
    );
};

// =============================================================================
// COMPONENTE: Badge Circular (con borde de puntos) - Solo para 2x1 y 3x2
// =============================================================================

interface BadgeCircularProps {
    texto: string;
    gradient: string;
    border: string;
    inModal?: boolean;
}

const BadgeCircular = ({ texto, gradient, border, inModal = false }: BadgeCircularProps) => (
    <div className={`absolute -right-2 -top-2 lg:-right-2 lg:-top-2 2xl:-right-3 2xl:-top-3 z-30 ${inModal ? 'animate-float-subtle' : 'animate-float'}`}>
        <div className="relative">
            {/* Ripple effect - SOLO si NO está en modal */}
            {!inModal && (
                <div className="absolute inset-0 bg-white rounded-full ripple opacity-15 pointer-events-none" />
            )}

            {/* Badge circular */}
            <div className={`relative flex h-11 w-11 lg:h-12 lg:w-12 2xl:h-14 2xl:w-14 items-center justify-center rounded-full bg-linear-to-br ${gradient} shadow-xl`}>
                {/* Borde de puntos interno */}
                <div className={`absolute inset-0 rounded-full border-2 border-dashed ${border}`} />

                <span className="relative z-10 text-sm lg:text-sm 2xl:text-base font-black text-white">
                    {texto}
                </span>
            </div>
        </div>
    </div>
);

// =============================================================================
// COMPONENTE: Badge Rectangular (esquina)
// =============================================================================

interface BadgeRectangularProps {
    texto: string;
    gradient: string;
    border: string;
    icono?: React.ReactNode;
    inModal?: boolean;
}

const BadgeRectangular = ({ texto, gradient, border, icono, inModal = false }: BadgeRectangularProps) => (
    <div className={`absolute -right-2 -top-2 lg:-right-1.5 lg:-top-1.5 2xl:-right-2 2xl:-top-2 z-30 ${inModal ? 'animate-float-subtle' : 'animate-float'}`}>
        <div className="relative">
            {/* Ripple effect - SOLO si NO está en modal */}
            {!inModal && (
                <div className="absolute inset-0 bg-white rounded-lg ripple opacity-15 pointer-events-none" />
            )}

            {/* Badge rectangular */}
            <div className={`relative flex items-center gap-1 lg:gap-1.5 2xl:gap-1.5 bg-linear-to-r ${gradient} px-2 py-1.5 lg:px-3 lg:py-1.5 2xl:px-3.5 2xl:py-2 rounded-lg shadow-xl border ${border}`}>
                {icono && <span className="relative z-10">{icono}</span>}
                <span className="relative z-10 text-sm lg:text-sm 2xl:text-base font-black text-white whitespace-nowrap">
                    {texto}
                </span>
            </div>
        </div>
    </div>
);

// =============================================================================
// ESTILOS CSS (se inyectan una vez)
// =============================================================================

export const OfertaCardStyles = `
    /* 1. animate-float - Badges flotantes */
@keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(5deg); }
}
.animate-float {
    animation: float 4s ease-in-out infinite;
}

/* 2. animate-float-subtle - Badges en modal */
@keyframes floatSubtle {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-8px) rotate(2deg); }
}
.animate-float-subtle {
    animation: floatSubtle 3s ease-in-out infinite;
}

/* 3. ripple - Efecto en badges */
@keyframes ripple {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(2); opacity: 0; }
}
.ripple {
    animation: ripple 1.2s ease-out infinite;
}

/* 4. animate-pulseScale - Badge de urgencia (FALTA AGREGAR) */
@keyframes pulseScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}
.animate-pulseScale {
    animation: pulseScale 2s ease-in-out infinite;
}
`;

// =============================================================================
// COMPONENTE PRINCIPAL: OfertaCard
// =============================================================================

export default function OfertaCard({ oferta, size = 'normal', className = '', inModal = false, onClick }: OfertaCardProps) {
    const { esMobile } = useBreakpoint();
    
    // Obtener configuración según tipo
    const config = CONFIG_TIPO[oferta.tipo];

    // Normalizar datos
    const valorNumerico = getValorNumerico(oferta);
    const valorTexto = getValorTexto(oferta);
    const badgeTexto = getBadgeTexto(oferta.tipo, valorNumerico, valorTexto);
    // Calcular días restantes y configuración de urgencia
    const diasRestantes = calcularDiasRestantes(oferta.fechaFin);
    const badgeUrgencia = diasRestantes !== null ? getBadgeUrgenciaConfig(diasRestantes) : null;
    const panelGradient = getPanelGradient(oferta.tipo);

    // Hook para ajustar automáticamente el tamaño del título
    // En modal usamos valores más conservadores para desktop, más generosos para móvil
    const { fontSize, containerRef } = useAutoFitText({
        text: oferta.titulo,
        minFontSize: esMobile ? 14 : (inModal ? 11 : 12),
        maxFontSize: esMobile ? 24 : (inModal ? 20 : 26),
        maxLines: 2,
        fontWeight: 900,
    });

    // Inyectar estilos CSS una sola vez
    React.useEffect(() => {
        if (!document.getElementById('oferta-card-styles')) {
            const style = document.createElement('style');
            style.id = 'oferta-card-styles';
            style.textContent = OfertaCardStyles;
            document.head.appendChild(style);
        }
    }, []);

    // Tamaños según size prop
    const sizes = {
        normal: {
            card: 'w-full h-[340px] lg:h-[320px] 2xl:h-[360px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-3 px-3 lg:py-3 lg:px-3 2xl:py-4 2xl:px-4',
            titulo: 'text-2xl lg:text-xl 2xl:text-3xl',
            descripcion: 'text-sm lg:text-xs 2xl:text-sm',
            gradiente: 'w-2 lg:w-1.5 2xl:w-2',
        },
        compact: {
            card: 'w-full h-[280px] lg:h-[250px] 2xl:h-[290px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-3 px-2.5 lg:py-2.5 lg:px-2 2xl:py-3 2xl:px-2.5',
            titulo: 'text-base lg:text-sm 2xl:text-base',
            descripcion: 'text-xs lg:text-[10px] 2xl:text-xs',
            gradiente: 'w-1.5 lg:w-1 2xl:w-1.5',
        },
        zoom: {
            card: 'w-[380px] h-[480px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-5 px-4',
            titulo: 'text-2xl',
            descripcion: 'text-base',
            gradiente: 'w-2',
        },
    };

    // MÓVIL: Tamaños para layout horizontal
    const sizesMobile = {
        normal: {
            card: 'w-full h-[160px]',
            imagen: 'w-[45%]',
            panel: 'w-[55%] py-2 px-3',
            titulo: 'text-xl',
            descripcion: 'text-xs',
            gradiente: 'w-1.5',
        },
        compact: {
            card: 'w-full h-[160px]',
            imagen: 'w-[45%]',
            panel: 'w-[55%] py-2.5 px-2.5',
            titulo: 'text-base',
            descripcion: 'text-xs',
            gradiente: 'w-1',
        },
        zoom: {
            card: 'w-full h-[180px]',
            imagen: 'w-[45%]',
            panel: 'w-[55%] py-4 px-4',
            titulo: 'text-base',
            descripcion: 'text-sm',
            gradiente: 'w-1.5',
        },
    };

    const s = esMobile ? sizesMobile[size] : sizes[size];

    // Renderizar badge según configuración
    const renderBadge = () => {
        // Icono para envío gratis
        const iconoEnvio = oferta.tipo === 'envio_gratis' ? (
            <Truck className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-white" />
        ) : undefined;

        // Solo 2x1 y 3x2 usan badge circular
        if (config.badgeShape === 'circular') {
            return (
                <BadgeCircular
                    texto={badgeTexto}
                    gradient={config.badgeGradient}
                    border={config.badgeBorder}
                    inModal={inModal}
                />
            );
        }

        // El resto usa badge rectangular
        return (
            <BadgeRectangular
                texto={badgeTexto}
                gradient={config.badgeGradient}
                border={config.badgeBorder}
                icono={iconoEnvio}
                inModal={inModal}
            />
        );
    };

    // LAYOUT MÓVIL: Horizontal
    if (esMobile) {
        return (
            <div className={`${s.card} group cursor-pointer ${className}`} onClick={onClick}>
                <div className={`relative h-full flex flex-row overflow-visible rounded-xl shadow-2xl transition-all duration-300 group-hover:-translate-y-2 ${config.hoverShadow}`}>

                    {/* Badge */}
                    {renderBadge()}

                    {/* Imagen IZQUIERDA (40%) */}
                    <div className={`relative ${s.imagen} overflow-hidden rounded-l-xl shrink-0`}>
                        {oferta.imagen ? (
                            <img
                                src={oferta.imagen}
                                alt={oferta.titulo}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                <Tag className="h-10 w-10 text-slate-300" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-r from-black/50 to-transparent" />

                        {/* Badge de Urgencia - Esquina inferior izquierda */}
                        {badgeUrgencia && (
                            <div className="absolute bottom-2 left-2 z-10">
                                <div className={`px-2 py-1 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border ${badgeUrgencia.border} text-white font-bold text-[10px] shadow-lg flex items-center gap-1 animate-pulseScale`}>
                                    {badgeUrgencia.icono === "flame" ? (
                                        <Flame className="h-2.5 w-2.5 shrink-0" />
                                    ) : (
                                        <Clock className="h-2.5 w-2.5 shrink-0" />
                                    )}
                                    <span>{badgeUrgencia.texto}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel info DERECHA (60%) */}
                    <div className={`rounded-r-xl ${s.panel} relative flex flex-col justify-center items-start overflow-hidden`}
                        style={{ background: panelGradient }}>
                        {/* Barra lateral de color */}
                        <div className={`absolute left-0 top-0 bottom-0 ${s.gradiente} bg-linear-to-b ${config.barColor} rounded-bl-xl`} />

                        {/* Contenido: Título + Separador Dinámico + Descripción */}
                        <div className="w-full pl-3 pr-3 space-y-1">
                            {/* Título - Auto-fit dinámico */}
                            <div 
                                ref={containerRef}
                                className="w-full h-[50px] flex items-center justify-center overflow-hidden"
                            >
                                <h4 
                                    className="font-black text-white leading-tight text-center w-full tracking-tight drop-shadow-lg"
                                    style={{ 
                                        fontSize: `${fontSize}px`,
                                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                        lineHeight: 1.1,
                                        textWrap: 'balance',
                                    }}
                                >
                                    {oferta.titulo}
                                </h4>
                            </div>

                            {/* Separador dinámico según tipo de oferta */}
                            <SeparadorTipo tipo={oferta.tipo} barColor={config.barColor} />

                            {/* Descripción - MÁXIMO 2 LÍNEAS */}
                            {oferta.descripcion && (
                                <p className={`${s.descripcion} text-white/80 text-left line-clamp-2 leading-relaxed font-medium`}>
                                    {oferta.descripcion}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LAYOUT DESKTOP: Vertical (ORIGINAL - sin cambios)
    return (
        <div className={`${s.card} group cursor-pointer ${className}`} onClick={onClick}>
            <div className={`relative h-full flex flex-col overflow-visible rounded-xl shadow-2xl transition-all duration-300 group-hover:-translate-y-2 ${config.hoverShadow}`}>

                {/* Badge */}
                {renderBadge()}

                {/* Imagen con brillo */}
                <div className={`relative ${s.imagen} w-full overflow-hidden rounded-t-xl`}>
                    {oferta.imagen ? (
                        <img
                            src={oferta.imagen}
                            alt={oferta.titulo}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200">
                            <Tag className="h-10 w-10 lg:h-8 lg:w-8 2xl:h-10 2xl:w-10 text-slate-300" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                    {/* Badge de Urgencia con Overlay */}
                    {badgeUrgencia && (
                        <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-center z-10"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
                            <div className={`px-3 py-1.5 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border ${badgeUrgencia.border} text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-pulseScale`}>
                                {badgeUrgencia.icono === "flame" ? (
                                    <Flame className="h-3 w-3 shrink-0" />
                                ) : (
                                    <Clock className="h-3 w-3 shrink-0" />
                                )}
                                <span>{badgeUrgencia.texto}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel info - Gradiente 3 tonos */}
                <div className={`rounded-b-xl ${s.panel} relative flex flex-col justify-center items-start overflow-hidden`}
                    style={{ background: panelGradient }}>
                    {/* Barra lateral de color */}
                    <div className={`absolute left-0 top-0 bottom-0 ${s.gradiente} bg-linear-to-b ${config.barColor} rounded-bl-xl`} />


                    {/* Contenido: Título + Separador Dinámico + Descripción */}
                    <div className="w-full pl-3 pr-3 space-y-1">
                        {/* Título - Auto-fit dinámico */}
                        <div 
                            ref={containerRef}
                            className={`w-full flex items-center justify-center overflow-hidden ${inModal ? 'h-12 lg:h-11 2xl:h-[52px]' : 'h-16 lg:h-[54px] 2xl:h-[72px]'}`}
                        >
                            <h4 
                                className="font-black text-white leading-tight text-center w-full tracking-tight drop-shadow-lg"
                                style={{ 
                                    fontSize: `${fontSize}px`,
                                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                    lineHeight: 1.1,
                                    textWrap: 'balance',
                                }}
                            >
                                {oferta.titulo}
                            </h4>
                        </div>

                        {/* Separador dinámico según tipo de oferta */}
                        <SeparadorTipo tipo={oferta.tipo} barColor={config.barColor} />

                        {/* Descripción - MÁXIMO 2 LÍNEAS */}
                        {oferta.descripcion && (
                            <p className={`${s.descripcion} text-white/80 text-left line-clamp-2 leading-relaxed font-medium`}>
                                {oferta.descripcion}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}