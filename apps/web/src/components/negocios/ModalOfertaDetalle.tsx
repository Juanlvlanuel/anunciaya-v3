/**
 * ============================================================================
 * MODAL OFERTA DETALLE - Modal de Oferta con Acciones
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalOfertaDetalle.tsx
 *
 * PROPÓSITO:
 * Modal que muestra el detalle completo de una oferta con botones de acción
 * (Guardar, Compartir, ChatYA, WhatsApp)
 *
 * CARACTERÍSTICAS:
 * - Mantiene el diseño exacto de OfertaCard ampliado
 * - Descripción completa sin truncar
 * - Botones de contacto y acciones
 * - Actualización optimista con useGuardados
 * - Modal centrado en todas las resoluciones
 *
 * CREADO: Enero 2026
 */

import { X, MessageCircle, Heart, Truck, Flame, Clock } from 'lucide-react';
import { useGuardados } from '@/hooks/useGuardados';
import { api } from '@/services/api';
import { DropdownCompartir } from '../compartir';
import { Modal } from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatYAStore } from '@/stores/useChatYAStore';
import { useUiStore } from '@/stores/useUiStore';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface Oferta {
    id?: string;
    ofertaId?: string;
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
}

interface ModalOfertaDetalleProps {
    oferta: Oferta | null;
    whatsapp?: string | null;
    negocioNombre?: string;
    negocioUsuarioId?: string | null;
    onClose: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const getId = (oferta: Oferta): string => {
    return oferta.id || oferta.ofertaId || '';
};

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

/**
 * Obtener gradiente del panel según tipo de oferta
 * MISMO que OfertaCard
 */
const getPanelGradient = (tipo: Oferta['tipo']): string => {
    const gradientes: Record<Oferta['tipo'], string> = {
        porcentaje: 'linear-gradient(to top, #000000 0%, #1e293b 80%, #475569 100%)',
        monto_fijo: 'linear-gradient(to top, #0c4a6e 0%, #075985 70%, #0369a1 100%)',
        '2x1': 'linear-gradient(to top, #000000 0%, #1e293b 80%, #475569 100%)',
        '3x2': 'linear-gradient(to top, #042f2e 0%, #115e59 70%, #0f766e 100%)',
        envio_gratis: 'linear-gradient(to top, #0c4a6e 0%, #075985 70%, #0369a1 100%)',
        regalo: 'linear-gradient(to top, #2e1065 0%, #4c1d95 70%, #6d28d9 100%)',
        otro: 'linear-gradient(to top, #052e16 0%, #14532d 70%, #166534 100%)',
    };

    return gradientes[tipo] || gradientes.otro;
};

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
            texto: dias === 1 ? "Último día" : `Quedan ${dias} días`,
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

// Configuración de colores por tipo
interface ConfigTipo {
    badgeGradient: string;
    badgeBorder: string;
    barColor: string;
}

const CONFIG_TIPO: Record<Oferta['tipo'], ConfigTipo> = {
    porcentaje: {
        badgeGradient: 'from-red-500 via-red-600 to-rose-700',
        badgeBorder: 'border-red-400/30',
        barColor: 'from-red-500 to-rose-600',
    },
    monto_fijo: {
        badgeGradient: 'from-orange-600 via-amber-600 to-orange-700',
        badgeBorder: 'border-orange-400/60',
        barColor: 'from-orange-600 to-amber-600',
    },
    '2x1': {
        badgeGradient: 'from-cyan-500 via-teal-600 to-cyan-700',
        badgeBorder: 'border-cyan-300/60',
        barColor: 'from-cyan-500 to-teal-600',
    },
    '3x2': {
        badgeGradient: 'from-pink-500 via-rose-600 to-pink-700',
        badgeBorder: 'border-pink-300/60',
        barColor: 'from-pink-500 to-rose-600',
    },
    envio_gratis: {
        badgeGradient: 'from-blue-400 via-sky-500 to-blue-500',
        badgeBorder: 'border-blue-300/60',
        barColor: 'from-blue-400 to-sky-500',
    },
    regalo: {
        badgeGradient: 'from-purple-500 via-violet-600 to-purple-700',
        badgeBorder: 'border-purple-400/30',
        barColor: 'from-purple-500 to-violet-600',
    },
    otro: {
        badgeGradient: 'from-amber-500 via-orange-600 to-amber-700',
        badgeBorder: 'border-amber-400/30',
        barColor: 'from-amber-500 to-orange-600',
    },
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalOfertaDetalle({ oferta, whatsapp, negocioNombre, negocioUsuarioId, onClose }: ModalOfertaDetalleProps) {
    const { usuario } = useAuthStore();
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    // Hook de guardados
    const { guardado, toggleGuardado } = useGuardados({
        entityType: 'oferta',
        entityId: oferta ? getId(oferta) : '',
        initialGuardado: false, // TODO: Pasar desde el padre si viene del backend
    });

    if (!oferta) return null;

    const config = CONFIG_TIPO[oferta.tipo];
    const valorNumerico = getValorNumerico(oferta);
    const valorTexto = getValorTexto(oferta);
    const badgeTexto = getBadgeTexto(oferta.tipo, valorNumerico, valorTexto);
    const esCircular = oferta.tipo === '2x1' || oferta.tipo === '3x2';
    const iconoEnvio = oferta.tipo === 'envio_gratis' ? <Truck className="w-6 h-6 lg:w-7 lg:h-7 shrink-0 text-white" /> : undefined;

    // Panel gradient EXACTO de OfertaCard
    const panelGradient = getPanelGradient(oferta.tipo);

    // Badge de urgencia - SIEMPRE mostrar si hay fecha de fin
    const diasRestantes = calcularDiasRestantes(oferta.fechaFin);
    const badgeUrgencia = diasRestantes !== null 
        ? getBadgeUrgenciaConfig(diasRestantes) 
        : null;

    const handleGuardar = () => {
        if (!usuario) {
            notificar.error('Debes iniciar sesión para guardar ofertas');
            return;
        }
        toggleGuardado();
    };

    const handleShare = () => {
        // Registrar share (sin throttling - cada share cuenta)
        const ofertaId = getId(oferta);
        
        api.post('/metricas/share', {
            entityType: 'oferta',
            entityId: ofertaId
        }).catch(() => {
            // Silenciar errores - las métricas no deben afectar la UX
        });
    };

    const handleWhatsApp = () => {
        if (!whatsapp) return;
        const numeroLimpio = whatsapp.replace(/\D/g, '');
        const nombreNegocio = negocioNombre ? ` de ${negocioNombre}` : '';
        const mensaje = encodeURIComponent(`Hola! Me interesa esta oferta${nombreNegocio}: ${oferta.titulo}`);
        window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
    };

    const handleChatYA = () => {
        if (!usuario) {
            notificar.error('Debes iniciar sesión para usar ChatYA');
            return;
        }
        if (!negocioUsuarioId) {
            notificar.error('No se pudo identificar el negocio');
            return;
        }
        // Limpiar entrada huérfana de ModalBottom en el historial
        if (history.state?._modalBottom) {
            const estado = { ...history.state };
            delete estado._modalBottom;
            history.replaceState(estado, '');
        }

        abrirChatTemporal({
            id: `temp_${Date.now()}`,
            otroParticipante: {
                id: negocioUsuarioId,
                nombre: negocioNombre || 'Negocio',
                apellidos: '',
                avatarUrl: null,
                negocioNombre: negocioNombre,
            },
            datosCreacion: {
                participante2Id: negocioUsuarioId,
                participante2Modo: 'comercial',
                participante2SucursalId: oferta.sucursalId ?? '',
                contextoTipo: 'negocio',
            },
        });
        abrirChatYA();
        onClose();
    };

    return (
        <>
            {/* Estilos para animaciones - IGUALES a OfertaCard */}
            <style>{`
                /* animate-float - Badges flotantes */
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(5deg); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                
                /* ripple - Efecto en badges */
                @keyframes ripple {
                    0% { transform: scale(1); opacity: 0.4; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .ripple {
                    animation: ripple 1.2s ease-out infinite;
                }
                
                /* pulseScale - Badge de urgencia */
                @keyframes pulseScale {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
                .animate-pulseScale {
                    animation: pulseScale 2s ease-in-out infinite;
                }
            `}</style>

            <Modal
                abierto={!!oferta}
                onCerrar={onClose}
                mostrarHeader={false}
                paddingContenido="none"
                ancho="sm"
                zIndice="z-75"
                className="min-w-[330px] max-w-[80vw] lg:min-w-[306px] lg:max-w-[408px] 2xl:min-w-[357px] 2xl:max-w-[476px] overflow-visible!"
            >
                {/* Badge principal - FUERA del contenedor blanco */}
                <div className="absolute top-6 left-6 lg:top-7 lg:left-7 z-100 animate-float">
                    <div className="relative">
                        {/* Ripple effect */}
                        <div className="absolute inset-0 bg-white rounded-full ripple opacity-15 pointer-events-none" />
                        
                        {esCircular ? (
                            // Badge CIRCULAR (2x1, 3x2) - Reducido 85%
                            <div className={`w-14 h-14 lg:w-16 lg:h-16 2xl:w-[72px] 2xl:h-[72px] rounded-full bg-linear-to-br ${config.badgeGradient} border-3 ${config.badgeBorder} shadow-2xl flex items-center justify-center relative`}>
                                <span className="text-white font-black text-base lg:text-lg 2xl:text-xl drop-shadow-lg">
                                    {badgeTexto}
                                </span>
                            </div>
                        ) : (
                            // Badge RECTANGULAR (resto de tipos) - Reducido 85%
                            <div className={`px-2.5 py-1 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-lg lg:rounded-xl bg-linear-to-r ${config.badgeGradient} border-2 ${config.badgeBorder} shadow-2xl flex items-center gap-1.5`}>
                                {iconoEnvio}
                                <span className="text-white font-black text-base lg:text-lg 2xl:text-xl drop-shadow-lg">
                                    {badgeTexto}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div
                    className="relative bg-white rounded-2xl w-full max-h-[90vh] lg:max-h-[90vh] overflow-visible shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Contenedor con scroll solo vertical */}
                    <div className="overflow-y-auto overflow-x-hidden max-h-[90vh] lg:max-h-[90vh] rounded-2xl">
                        {/* Card de oferta ampliada */}
                        <div className="relative flex flex-col">

                            {/* Botones flotantes (Compartir, Guardar, Cerrar) - Más pequeños en móvil */}
                            <div className="absolute top-3 right-3 z-20 flex gap-2">
                            <Tooltip text="Compartir" position="bottom">
                                <DropdownCompartir
                                    url={`${window.location.origin}/p/oferta/${getId(oferta)}`}
                                    texto={`¡Mira esta oferta en AnunciaYA!\n\n${oferta.titulo}`}
                                    titulo={oferta.titulo}
                                    variante="glass"
                                    onShare={handleShare}
                                />
                            </Tooltip>
                            <Tooltip text={guardado ? 'Quitar de guardados' : 'Guardar'} position="bottom">
                                <button
                                    onClick={handleGuardar}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white cursor-pointer"
                                >
                                    <Heart className={`w-5 h-5 ${guardado ? 'text-red-500 fill-current' : 'text-slate-700'}`} />
                                </button>
                            </Tooltip>
                            <Tooltip text="Cerrar" position="bottom">
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-slate-700" />
                                </button>
                            </Tooltip>
                            </div>

                            {/* Imagen responsive a 3 niveles - Más alta en móvil */}
                            <div className="relative w-full h-52 lg:h-54 2xl:h-68 overflow-visible">
                            {oferta.imagen ? (
                                <img
                                    src={oferta.imagen}
                                    alt={oferta.titulo}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                    <MessageCircle className="h-16 w-16 text-slate-300" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                            
                            {/* Badge de urgencia con overlay - Alineado a la derecha */}
                            {badgeUrgencia && (
                                <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-end pr-3 lg:pr-4 z-10"
                                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
                                    <div className={`px-2.5 py-1 lg:px-3 lg:py-1 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border-2 ${badgeUrgencia.border} text-white font-bold text-xs lg:text-sm shadow-lg flex items-center gap-1.5 animate-pulseScale`}>
                                        {badgeUrgencia.icono === "flame" ? (
                                            <Flame className="h-3.5 w-3.5 lg:h-4 lg:w-4 shrink-0" />
                                        ) : (
                                            <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4 shrink-0" />
                                        )}
                                        <span>{badgeUrgencia.texto}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Panel de información */}
                        <div 
                            className="relative flex flex-col p-4 lg:p-3.5 2xl:p-4"
                            style={{ background: panelGradient }}
                        >
                            {/* Barra lateral de color */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 bg-linear-to-b ${config.barColor}`} />

                            {/* Título */}
                            <h2 className="text-white text-xl lg:text-xl 2xl:text-2xl font-black leading-tight mb-3 pl-2.5 pr-2.5">
                                {oferta.titulo}
                            </h2>

                            {/* Separador */}
                            <div className={`h-1 w-40 lg:w-40 2xl:w-44 bg-linear-to-r ${config.barColor} rounded-full mb-3 ml-2.5`} />

                            {/* Descripción COMPLETA (sin truncar) */}
                            {oferta.descripcion && (
                                <div className="mb-3 lg:mb-3.5 pl-2.5 pr-2.5">
                                    <p className="text-white/90 text-sm lg:text-sm 2xl:text-base leading-relaxed whitespace-pre-wrap wrap-break-word">
                                        {oferta.descripcion}
                                    </p>
                                </div>
                            )}

                            {/* Info + Contacto en 2 columnas */}
                            <div className="px-3 pb-2.5">
                                {/* Línea separadora */}
                                <div className="h-px bg-linear-to-r from-transparent via-white/30 to-transparent mb-2.5" />

                                <div className="flex items-center justify-between">
                                    {/* Izquierda: Fecha + Compra mínima */}
                                    <div className="flex flex-col gap-1">
                                        {oferta.fechaFin && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-white/70 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="text-white/70 text-sm font-medium">Válida hasta:</span>
                                                    <span className="text-white text-sm font-bold">
                                                        {new Date(oferta.fechaFin).toLocaleDateString('es-MX', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {oferta.compraMinima && parseFloat(oferta.compraMinima) > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-white/70 text-sm font-bold shrink-0">$</span>
                                                <span className="text-white/70 text-sm font-medium">Compra mínima:</span>
                                                <span className="text-white text-sm font-bold">
                                                    ${parseFloat(oferta.compraMinima).toFixed(2)} MXN
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Derecha: Iconos de contacto */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={handleChatYA}
                                            className="cursor-pointer hover:scale-110"
                                        >
                                            <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                                        </button>
                                        <button
                                            onClick={handleWhatsApp}
                                            className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:scale-110 p-[6px]"
                                        >
                                            <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default ModalOfertaDetalle;