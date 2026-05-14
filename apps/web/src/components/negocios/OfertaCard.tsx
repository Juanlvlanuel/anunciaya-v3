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

import React, { useRef } from 'react';
import { Tag, Flame } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Truck = (p: IconoWrapperProps) => <Icon icon={ICONOS.envio} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const CreditCard = (p: IconoWrapperProps) => <Icon icon={ICONOS.pagos} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAutoFitText } from '@/hooks/useAutoFitText';
import { useViewTracker } from '@/hooks/useViewTracker';
import { registrarVistaOferta } from '@/services/ofertasService';

// =============================================================================
// TIPOS
// =============================================================================

export interface Oferta {
    id?: string;
    ofertaId?: string;
    /** UUID de la sucursal de la oferta. Se propaga al `ModalOfertaDetalle`
     *  y al chat iniciado desde la oferta (`participante2SucursalId`). */
    sucursalId?: string | null;
    titulo: string;
    descripcion?: string | null;
    imagen?: string | null;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'regalo' | 'otro';
    valor?: number | string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    compraMinima?: string | null;
    limiteUsos?: number | null;
    usosActuales?: number;
    activo?: boolean;
    totalVistas?: number;
    totalSucursales?: number;
    /** Para el header del modal de detalle */
    logoUrl?: string | null;
    sucursalNombre?: string | null;
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
    /** Microseñal: si la oferta es de un negocio que participa en CardYA */
    aceptaCardya?: boolean;
    /** Microseñal: si la oferta fue creada hace menos de 48 horas */
    esNueva?: boolean;
    /** Microseñal: si la oferta es popular esta semana (top por vistas) */
    esPopular?: boolean;
    /**
     * Orientación de la card.
     * - `'auto'` (default): horizontal en móvil, vertical en desktop.
     * - `'vertical'`: siempre vertical (imagen arriba, panel abajo). Útil
     *   en grids de 2+ columnas en móvil donde el horizontal queda raro.
     * - `'horizontal'`: siempre horizontal.
     */
    orientacion?: 'auto' | 'vertical' | 'horizontal';
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
    regalo: {
        badgeGradient: 'from-purple-500 via-violet-600 to-purple-700',
        badgeBorder: 'border-purple-400/30',
        badgePosition: 'corner',
        badgeShape: 'rectangular',
        barColor: 'from-purple-500 to-violet-600',
        hoverShadow: 'group-hover:shadow-purple-500/20',
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

        // Badge púrpura → Panel púrpura oscuro
        regalo: 'linear-gradient(to top, #2e1065 0%, #4c1d95 70%, #6d28d9 100%)',

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
    <div className={`absolute -right-2 -top-2 @5xl:-right-2 @5xl:-top-2 @[96rem]:-right-3 @[96rem]:-top-3 z-30 ${inModal ? 'animate-float-subtle' : 'animate-float'}`}>
        <div className="relative">
            {/* Ripple effect - SOLO si NO está en modal */}
            {!inModal && (
                <div className="absolute inset-0 bg-white rounded-full ripple opacity-15 pointer-events-none" />
            )}

            {/* Badge circular */}
            <div className={`relative flex h-11 w-11 @5xl:h-12 @5xl:w-12 @[96rem]:h-14 @[96rem]:w-14 items-center justify-center rounded-full bg-linear-to-br ${gradient} shadow-xl`}>
                {/* Borde de puntos interno */}
                <div className={`absolute inset-0 rounded-full border-2 border-dashed ${border}`} />

                <span className="relative z-10 text-sm @5xl:text-sm @[96rem]:text-base font-black text-white">
                    {texto}
                </span>
            </div>
        </div>
    </div>
);

// =============================================================================
// COMPONENTE: Microseñal (Nueva / Popular)
// =============================================================================
//
// Posición: esquina SUPERIOR IZQUIERDA de la imagen.
// Razón: la esquina superior derecha está ocupada por el badge principal de
// descuento (porcentaje, monto, 2x1, etc.) flotante. Colocar la microseñal
// en la esquina opuesta evita superposición y mantiene el lenguaje visual.
//
// Si coincide `esPopular` y `esNueva`, prevalece `esPopular`.

interface MicrosenalProps {
    variante: 'nueva' | 'popular';
}

const Microsenal = ({ variante }: MicrosenalProps) => {
    const config = variante === 'popular'
        ? {
            bg: 'bg-amber-500',
            ring: 'ring-amber-300/60',
            texto: 'Popular',
            Icono: TrendingUp,
        }
        : {
            bg: 'bg-emerald-500',
            ring: 'ring-emerald-300/60',
            texto: 'Nueva',
            Icono: Sparkles,
        };

    const { Icono } = config;

    return (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <div className={`flex items-center gap-1 ${config.bg} text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-md ring-2 ${config.ring}`}>
                <Icono className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                <span className="leading-none">{config.texto}</span>
            </div>
        </div>
    );
};

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
    <div className={`absolute -right-2 -top-2 @5xl:-right-1.5 @5xl:-top-1.5 @[96rem]:-right-2 @[96rem]:-top-2 z-30 ${inModal ? 'animate-float-subtle' : 'animate-float'}`}>
        <div className="relative">
            {/* Ripple effect - SOLO si NO está en modal */}
            {!inModal && (
                <div className="absolute inset-0 bg-white rounded-lg ripple opacity-15 pointer-events-none" />
            )}

            {/* Badge rectangular */}
            <div className={`relative flex items-center gap-1 @5xl:gap-1.5 @[96rem]:gap-1.5 bg-linear-to-r ${gradient} px-2 py-1.5 @5xl:px-3 @5xl:py-1.5 @[96rem]:px-3.5 @[96rem]:py-2 rounded-lg shadow-xl border-2 ${border}`}>
                {icono && <span className="relative z-10">{icono}</span>}
                <span className="relative z-10 text-sm @5xl:text-sm @[96rem]:text-base font-black text-white whitespace-nowrap">
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

export default function OfertaCard({
    oferta,
    size = 'normal',
    className = '',
    inModal = false,
    onClick,
    aceptaCardya = false,
    esNueva = false,
    esPopular = false,
    orientacion = 'auto',
}: OfertaCardProps) {
    // Si coinciden, prevalece "Popular" (tiene mayor valor informativo).
    const microsenalVariante: 'popular' | 'nueva' | null =
        esPopular ? 'popular' : esNueva ? 'nueva' : null;
    const { esMobile } = useBreakpoint();
    // Layout efectivo: horizontal solo si la prop lo pide explícitamente,
    // o si es 'auto' Y estamos en móvil. 'vertical' fuerza el layout
    // estilo desktop (imagen arriba, panel abajo) incluso en móvil.
    const usarLayoutHorizontal =
        orientacion === 'horizontal' ||
        (orientacion === 'auto' && esMobile);

    // Tracking de vista (impression): cuando ≥50% de la card es visible
    // por ≥1s, registramos vista. Funciona tanto para las ofertas que se
    // ven al entrar al perfil del negocio como para las del modal "ver
    // todas" (solo si el usuario hace scroll y las trae al viewport).
    const refCard = useRef<HTMLDivElement>(null);
    const ofertaIdParaVista = oferta.ofertaId || oferta.id;
    useViewTracker(refCard, {
        onVisto: () => {
            if (!ofertaIdParaVista) return;
            registrarVistaOferta(ofertaIdParaVista).catch(() => { /* silent */ });
        },
    });

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

    // En layout vertical mobile (carrusel de SeccionOfertas o grid de
    // ModalOfertas), las cards son angostas (~180px) y necesitan un
    // título más compacto. Mismo trato que `inModal` para dar el mismo
    // tamaño visual entre sección y modal en móvil.
    const usarTituloCompacto = !usarLayoutHorizontal && (inModal || esMobile);
    // Hook para ajustar automáticamente el tamaño del título
    // El layout horizontal (mobile sin orientacion='vertical') usa
    // títulos más grandes que el vertical (donde la imagen ocupa la
    // mitad superior y deja menos espacio al panel).
    const { fontSize, containerRef } = useAutoFitText({
        text: oferta.titulo,
        minFontSize: usarLayoutHorizontal ? 14 : (usarTituloCompacto ? 11 : 12),
        maxFontSize: usarLayoutHorizontal ? 24 : (usarTituloCompacto ? 20 : 26),
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
    // El panel padding (py/px) se redujo para dar más espacio al título
    // ahora que la descripción no se renderiza en la card.
    const sizes = {
        normal: {
            card: 'w-full h-[340px] @5xl:h-[320px] @[96rem]:h-[360px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-2 px-2 @5xl:py-2 @5xl:px-2 @[96rem]:py-2.5 @[96rem]:px-2.5',
            titulo: 'text-2xl @5xl:text-xl @[96rem]:text-3xl',
            descripcion: 'text-sm',
            gradiente: 'w-2 @5xl:w-1.5 @[96rem]:w-2',
        },
        compact: {
            card: 'w-full h-[280px] @5xl:h-[250px] @[96rem]:h-[290px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-2 px-2 @5xl:py-1.5 @5xl:px-1.5 @[96rem]:py-2 @[96rem]:px-2',
            titulo: 'text-base @5xl:text-sm @[96rem]:text-base',
            descripcion: 'text-sm',
            gradiente: 'w-1.5 @5xl:w-1 @[96rem]:w-1.5',
        },
        zoom: {
            card: 'w-[380px] h-[480px]',
            imagen: 'h-[60%]',
            panel: 'h-[40%] py-3 px-3',
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
            panel: 'w-[55%] py-1.5 px-2',
            titulo: 'text-xl',
            descripcion: 'text-sm',
            gradiente: 'w-1.5',
        },
        compact: {
            card: 'w-full h-[160px]',
            imagen: 'w-[45%]',
            panel: 'w-[55%] py-2 px-2',
            titulo: 'text-base',
            descripcion: 'text-sm',
            gradiente: 'w-1',
        },
        zoom: {
            card: 'w-full h-[180px]',
            imagen: 'w-[45%]',
            panel: 'w-[55%] py-3 px-3',
            titulo: 'text-base',
            descripcion: 'text-sm',
            gradiente: 'w-1.5',
        },
    };

    const s = usarLayoutHorizontal ? sizesMobile[size] : sizes[size];

    // Renderizar badge según configuración
    const renderBadge = () => {
        // Icono para envío gratis
        const iconoEnvio = oferta.tipo === 'envio_gratis' ? (
            <Truck className="w-3 h-3 @5xl:w-3 @5xl:h-3 @[96rem]:w-4 @[96rem]:h-4 text-white" />
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

    // LAYOUT HORIZONTAL: imagen izquierda, panel derecha
    if (usarLayoutHorizontal) {
        return (
            <div ref={refCard} className={`@container ${s.card} group cursor-pointer ${className}`} onClick={onClick}>
                <div className={`relative h-full flex flex-row overflow-visible rounded-xl shadow-md transition-all duration-300  ${config.hoverShadow}`}>

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

                        {/* Microseñal Nueva / Popular — esquina sup. izquierda */}
                        {microsenalVariante && <Microsenal variante={microsenalVariante} />}

                        {/* Pill de vistas — esquina inf. IZQUIERDA. Mismo
                            patrón que el modal: views-left, urgencia-right. */}
                        {typeof oferta.totalVistas === 'number' && (
                            <span
                                className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs lg:text-sm font-bold tabular-nums leading-none shadow-md"
                                title={`${oferta.totalVistas} ${oferta.totalVistas === 1 ? 'vista' : 'vistas'}`}
                            >
                                <Eye
                                    className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0"
                                    strokeWidth={2.5}
                                    fill="currentColor"
                                    fillOpacity={0.25}
                                />
                                {oferta.totalVistas}
                            </span>
                        )}

                        {/* Badge de Urgencia - Esquina inferior DERECHA.
                            Mismas proporciones que el modal de detalle. */}
                        {badgeUrgencia && (
                            <div className="absolute bottom-2 right-2 z-10">
                                <div className={`px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border ${badgeUrgencia.border} text-white font-bold text-xs lg:text-sm shadow-lg flex items-center gap-1 animate-pulseScale`}>
                                    {badgeUrgencia.icono === "flame" ? (
                                        <Flame className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                                    ) : (
                                        <Clock className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
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

                        {/* Icono CardYA — esquina sup. derecha del panel */}
                        {aceptaCardya && (
                            <div className="absolute top-1.5 right-2 z-10" title="Acepta CardYA">
                                <CreditCard className="w-3.5 h-3.5 text-white/70" strokeWidth={2.5} />
                            </div>
                        )}

                        {/* Contenido: solo Título (descripción se ve en el modal de detalle) */}
                        <div className="w-full pl-2 pr-2 space-y-1">
                            {/* Título - Auto-fit dinámico, ocupa toda la altura disponible */}
                            <div
                                ref={containerRef}
                                className="w-full h-[70px] flex items-center justify-center overflow-hidden"
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
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LAYOUT DESKTOP: Vertical (ORIGINAL - sin cambios)
    return (
        <div ref={refCard} className={`${s.card} group cursor-pointer ${className}`} onClick={onClick}>
            <div className={`relative h-full flex flex-col overflow-visible rounded-xl shadow-md transition-all duration-300  ${config.hoverShadow}`}>

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
                            <Tag className="h-10 w-10 @5xl:h-8 @5xl:w-8 @[96rem]:h-10 @[96rem]:w-10 text-slate-300" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                    {/* Microseñal Nueva / Popular — esquina sup. izquierda */}
                    {microsenalVariante && <Microsenal variante={microsenalVariante} />}

                    {/* Badge de Urgencia con Overlay — alineado a la DERECHA
                        (mismo patrón que el modal de detalle). */}
                    {badgeUrgencia && (
                        <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-end pr-3 lg:pr-4 z-10"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
                            <div className={`px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border ${badgeUrgencia.border} text-white font-bold text-xs lg:text-sm shadow-lg flex items-center gap-1 animate-pulseScale`}>
                                {badgeUrgencia.icono === "flame" ? (
                                    <Flame className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                                ) : (
                                    <Clock className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                                )}
                                <span>{badgeUrgencia.texto}</span>
                            </div>
                        </div>
                    )}

                    {/* Pill de vistas — esquina inf. IZQUIERDA (z-20 para que
                        se vea sobre el overlay de urgencia). */}
                    {typeof oferta.totalVistas === 'number' && (
                        <span
                            className="absolute bottom-2 left-2 z-20 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs lg:text-sm font-bold tabular-nums leading-none shadow-md"
                            title={`${oferta.totalVistas} ${oferta.totalVistas === 1 ? 'vista' : 'vistas'}`}
                        >
                            <Eye
                                className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0"
                                strokeWidth={2.5}
                                fill="currentColor"
                                fillOpacity={0.25}
                            />
                            {oferta.totalVistas}
                        </span>
                    )}
                </div>

                {/* Panel info - Gradiente 3 tonos */}
                <div className={`rounded-b-xl ${s.panel} relative flex flex-col justify-center items-start overflow-hidden`}
                    style={{ background: panelGradient }}>
                    {/* Barra lateral de color */}
                    <div className={`absolute left-0 top-0 bottom-0 ${s.gradiente} bg-linear-to-b ${config.barColor} rounded-bl-xl`} />

                    {/* Icono CardYA — esquina sup. derecha del panel */}
                    {aceptaCardya && (
                        <div className="absolute top-2 right-2.5 z-10" title="Acepta CardYA">
                            <CreditCard className="w-4 h-4 text-white/70" strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Contenido: solo Título (descripción se ve en el modal de detalle) */}
                    <div className="w-full pl-2 pr-2 space-y-1">
                        {/* Título - Auto-fit dinámico, ocupa toda la altura disponible */}
                        <div
                            ref={containerRef}
                            className={`w-full flex items-center justify-center overflow-hidden ${usarTituloCompacto ? 'h-16 @5xl:h-14 @[96rem]:h-[64px]' : 'h-20 @5xl:h-[68px] @[96rem]:h-[88px]'}`}
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
                    </div>
                </div>
            </div>
        </div>
    );
}