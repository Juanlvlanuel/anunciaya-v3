/**
 * ============================================================================
 * COMPONENTE: CardOferta (Business Studio ONLY)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/CardOferta.tsx
 * 
 * PROPÓSITO:
 * Card dinámica y colorida para gestión de ofertas en Business Studio
 * 
 * FEATURES:
 * - Diseño vibrante con bordes de color según estado
 * - Sombras pronunciadas y efectos hover
 * - Descuento destacado con iconos
 * - Badges coloridos con gradientes
 * - Layout horizontal compacto optimizado
 * - Responsive design
 * - Sin descripción para mayor compactación
 * 
 * ACTUALIZADO: Enero 2026 - Optimización de espaciado y borde discreto
 */

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    Edit,
    Trash2,
    Eye,
    Calendar,
    Share2,
    MousePointerClick,
    Percent,
    DollarSign,
    ShoppingBag,
    Truck,
    Tag,
    Copy,
    Gift,
    Sparkles,
    Flame,
} from 'lucide-react';
import { ModalImagenes } from '../../../../components/ui';
import type { Oferta, EstadoOferta } from '../../../../types/ofertas';

// =============================================================================
// COMPONENTE: TOOLTIP CON PORTAL
// =============================================================================

interface TooltipProps {
    children: ReactNode;
    texto: string;
}

function Tooltip({ children, texto }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [posicion, setPosicion] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const [isDesktop, setIsDesktop] = useState(false);

    // Detectar si es desktop
    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
        };
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const mostrar = () => {
        if (!isDesktop) return; // No mostrar tooltip en mobile
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosicion({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
            setVisible(true);
        }
    };

    const ocultar = () => setVisible(false);

    return (
        <div
            ref={triggerRef}
            onMouseEnter={mostrar}
            onMouseLeave={ocultar}
            className="relative"
        >
            {children}
            {visible && isDesktop && createPortal(
                <div
                    className="fixed z-9999 pointer-events-none"
                    style={{
                        top: posicion.top,
                        left: posicion.left,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                        {texto}
                    </div>
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 mx-auto" />
                </div>,
                document.body
            )}
        </div>
    );
}

// =============================================================================
// TIPOS
// =============================================================================

interface CardOfertaProps {
    oferta: Oferta;
    estado: EstadoOferta;
    onEditar: (oferta: Oferta) => void;
    onEliminar: (id: string, titulo: string) => void;
    onToggleActivo: (id: string, activo: boolean) => void;
    onDuplicar?: (oferta: Oferta) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Retorna configuración de badge según estado
 */
function getBadgeEstado(estado: EstadoOferta): {
    label: string;
    emoji: string;
    clases: string;
    borderColor: string;
    shadowColor: string;
} {
    switch (estado) {
        case 'activa':
            return {
                label: 'Activa',
                emoji: '',
                clases: 'bg-linear-to-r from-green-500 to-emerald-600 text-white',
                borderColor: 'border-emerald-100',
                shadowColor: 'rgba(52, 211, 153, 0.08)',
            };
        case 'proxima':
            return {
                label: 'Próxima',
                emoji: '',
                clases: 'bg-linear-to-r from-amber-400 to-orange-500 text-white',
                borderColor: 'border-amber-100',
                shadowColor: 'rgba(251, 191, 36, 0.08)',
            };
        case 'vencida':
            return {
                label: 'Vencida',
                emoji: '',
                clases: 'bg-linear-to-r from-slate-400 to-slate-500 text-white',
                borderColor: 'border-slate-200',
                shadowColor: 'rgba(148, 163, 184, 0.08)',
            };
        case 'agotada':
            return {
                label: 'Agotada',
                emoji: '',
                clases: 'bg-linear-to-r from-rose-400 to-red-500 text-white',
                borderColor: 'border-rose-100',
                shadowColor: 'rgba(251, 113, 133, 0.08)',
            };
        case 'inactiva':
            return {
                label: 'Inactiva',
                emoji: '',
                clases: 'bg-linear-to-r from-slate-300 to-slate-400 text-white',
                borderColor: 'border-slate-100',
                shadowColor: 'rgba(203, 213, 225, 0.05)',
            };
    }
}

/**
 * Retorna configuración visual según tipo de oferta
 */
function getConfigTipo(tipo: string): {
    emoji: string;
    gradiente: string;
    color: string;
    colorTexto: string;
    Icono: typeof Tag;
} {
    switch (tipo) {
        case 'porcentaje':
            return {
                emoji: '',
                gradiente: 'from-rose-400 to-pink-500',
                color: 'bg-linear-to-br from-rose-400 to-pink-500 text-white',
                colorTexto: 'text-rose-500',
                Icono: Percent
            };
        case 'monto_fijo':
            return {
                emoji: '',
                gradiente: 'from-emerald-400 to-green-500',
                color: 'bg-linear-to-br from-emerald-400 to-green-500 text-white',
                colorTexto: 'text-emerald-500',
                Icono: DollarSign
            };
        case '2x1':
        case '3x2':
            return {
                emoji: '',
                gradiente: 'from-amber-400 to-orange-500',
                color: 'bg-linear-to-br from-amber-400 to-orange-500 text-white',
                colorTexto: 'text-amber-500',
                Icono: ShoppingBag
            };
        case 'envio_gratis':
            return {
                emoji: '',
                gradiente: 'from-sky-400 to-blue-500',
                color: 'bg-linear-to-br from-sky-400 to-blue-500 text-white',
                colorTexto: 'text-sky-500',
                Icono: Truck
            };
        case 'regalo':
            return {
                emoji: '',
                gradiente: 'from-purple-400 to-violet-500',
                color: 'bg-linear-to-br from-purple-400 to-violet-500 text-white',
                colorTexto: 'text-purple-500',
                Icono: Gift
            };
        default:
            return {
                emoji: '',
                gradiente: 'from-slate-400 to-slate-500',
                color: 'bg-linear-to-br from-slate-400 to-slate-500 text-white',
                colorTexto: 'text-slate-500',
                Icono: Tag
            };
    }
}

/**
 * Formatea el valor de la oferta para display
 */
function formatearValor(tipo: string, valor: string | null): string {
    if (!valor) {
        switch (tipo) {
            case '2x1': return '2x1';
            case '3x2': return '3x2';
            case 'envio_gratis': return 'ENVÍO GRATIS';
            case 'regalo': return 'REGALO';
            default: return tipo.toUpperCase();
        }
    }

    switch (tipo) {
        case 'porcentaje':
            return `${valor}% DESCUENTO`;
        case 'monto_fijo':
            return `$${valor}`;
        default:
            return valor.toUpperCase();
    }
}

/**
 * Formatea fecha a DD MMM (evita desfase de zona horaria)
 */
function formatearFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    try {
        // Extraer solo la parte de la fecha (antes de T si existe)
        const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
        
        // Separar YYYY-MM-DD
        const partes = fechaStr.split('-');
        if (partes.length !== 3) {
            console.warn('Formato de fecha incorrecto:', fecha);
            return fecha;
        }
        
        const dia = parseInt(partes[2], 10);
        const mes = parseInt(partes[1], 10);
        
        // Validar que sean números válidos
        if (isNaN(dia) || isNaN(mes)) {
            console.warn('Día o mes no válido:', fecha);
            return fecha;
        }
        
        // Validar rango de mes
        if (mes < 1 || mes > 12) {
            console.warn('Mes fuera de rango:', fecha);
            return fecha;
        }
        
        return `${dia} ${meses[mes - 1]}`;
    } catch (error) {
        console.error('Error formateando fecha:', error, fecha);
        return fecha; // Devolver fecha original si hay error
    }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function CardOferta({
    oferta,
    estado,
    onEditar,
    onEliminar,
    onToggleActivo,
    onDuplicar,
}: CardOfertaProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [modalImagenes, setModalImagenes] = useState({
        isOpen: false,
        images: [] as string[],
        initialIndex: 0,
    });

    const badgeEstado = getBadgeEstado(estado);
    const configTipo = getConfigTipo(oferta.tipo);
    const valorFormateado = formatearValor(oferta.tipo, oferta.valor);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleImagenClick = () => {
        if (oferta.imagen) {
            setModalImagenes({
                isOpen: true,
                images: [oferta.imagen],
                initialIndex: 0,
            });
        }
    };

    const cerrarModalImagenes = () => {
        setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });
    };

    const handleDuplicar = () => {
        onDuplicar?.(oferta);
    };

    // Determinar si mostrar ícono de trending (métricas altas)
    const esTrending = (oferta.totalVistas || 0) > 50 || (oferta.totalClicks || 0) > 20;

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <>
            <div 
                ref={cardRef}
                className={`
                    bg-white rounded-xl shadow-lg border-2 overflow-hidden
                    transition-all duration-300
                    hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
                    ${badgeEstado.borderColor}
                `}
                style={{
                    boxShadow: `
                        0 4px 6px rgba(0,0,0,0.1),
                        0 8px 20px rgba(0,0,0,0.15),
                        0 0 0 2px ${badgeEstado.shadowColor}
                    `
                }}
            >
                {/* ========== HEADER ========== */}
                <div className="flex items-center justify-between px-3 lg:px-2.5 2xl:px-3 py-2 lg:py-1.5 2xl:py-2 bg-linear-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    {/* Badge Estado - SOLO VISUAL */}
                    <div className={`flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-3 lg:px-2.5 2xl:px-3 py-1.5 lg:py-1 2xl:py-1.5 text-xs lg:text-[10px] 2xl:text-xs font-bold rounded-full shadow-md ${badgeEstado.clases}`}>
                        <Sparkles className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                        {badgeEstado.label}
                    </div>

                    {/* Valor de Oferta */}
                    <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
                        {oferta.tipo !== 'porcentaje' && (
                            <configTipo.Icono className={`w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 ${configTipo.colorTexto}`} />
                        )}
                        <span className={`text-lg lg:text-sm 2xl:text-lg font-black ${configTipo.colorTexto}`}>
                            {valorFormateado}
                        </span>
                    </div>
                </div>

                {/* ========== CONTENIDO ========== */}
                <div className="flex gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3">
                    
                    {/* Imagen */}
                    <div 
                        className="w-20 h-20 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 shrink-0 rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={handleImagenClick}
                    >
                        {oferta.imagen ? (
                            <img src={oferta.imagen} alt={oferta.titulo} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full bg-linear-to-br ${configTipo.gradiente} relative overflow-hidden flex items-center justify-center`}>
                                <configTipo.Icono className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 text-white/30" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Título */}
                        <h3 className="font-bold text-base lg:text-sm 2xl:text-base text-slate-900 truncate mb-0.5 lg:mb-0 2xl:mb-0.5">
                            {oferta.titulo}
                        </h3>

                        {/* Fechas */}
                        <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 text-slate-600 mb-1.5 lg:mb-1 2xl:mb-1.5">
                            <Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                            <span className="text-sm lg:text-xs 2xl:text-sm font-medium">
                                {formatearFecha(oferta.fechaInicio)} - {formatearFecha(oferta.fechaFin)}
                            </span>
                        </div>

                        {/* Métricas con Iconos */}
                        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 text-slate-400">
                            <Tooltip texto="Vistas">
                                <span className="flex items-center gap-1 cursor-default">
                                    <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    <span className="text-base lg:text-sm 2xl:text-base font-semibold">{oferta.totalVistas || 0}</span>
                                </span>
                            </Tooltip>
                            
                            <Tooltip texto="Veces compartida">
                                <span className="flex items-center gap-1 cursor-default">
                                    <Share2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    <span className="text-base lg:text-sm 2xl:text-base font-semibold">{oferta.totalShares || 0}</span>
                                </span>
                            </Tooltip>

                            <Tooltip texto="Clicks en 'Ver oferta'">
                                <span className="flex items-center gap-1 cursor-default">
                                    <MousePointerClick className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    <span className="text-base lg:text-sm 2xl:text-base font-semibold">{oferta.totalClicks || 0}</span>
                                </span>
                            </Tooltip>

                            {esTrending && (
                                <Tooltip texto="¡Oferta popular!">
                                    <Flame className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-orange-500" />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                {/* ========== ACCIONES ========== */}
                <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 px-3 lg:px-2 2xl:px-3 pb-3 lg:pb-2 2xl:pb-3">
                    {/* Toggle Visibilidad (ojo) */}
                    <Tooltip texto={oferta.activo ? "Ocultar oferta" : "Mostrar oferta"}>
                        <button
                            onClick={() => onToggleActivo(oferta.id, !oferta.activo)}
                            className={`p-2 lg:p-1.5 2xl:p-2 rounded-lg transition-all shadow-md hover:shadow-lg ${
                                oferta.activo
                                    ? 'text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                    : 'text-white bg-linear-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600'
                            }`}
                        >
                            <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                        </button>
                    </Tooltip>

                    <button
                        onClick={() => onEditar(oferta)}
                        className="flex-1 flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 px-3 lg:px-2.5 2xl:px-3 py-2 lg:py-1.5 2xl:py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-white bg-linear-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                    >
                        <Edit className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                        Editar
                    </button>

                    <Tooltip texto="Borrar">
                        <button
                            onClick={() => onEliminar(oferta.id, oferta.titulo)}
                            className="p-2 lg:p-1.5 2xl:p-2 text-white bg-linear-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                        >
                            <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                        </button>
                    </Tooltip>

                    {onDuplicar && (
                    <Tooltip texto="Duplicar">
                        <button
                            onClick={handleDuplicar}
                            className="p-2 lg:p-1.5 2xl:p-2 text-white bg-linear-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                        >
                            <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                        </button>
                    </Tooltip>
                    )}
                </div>
            </div>

            {/* Modal Imágenes */}
            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={cerrarModalImagenes}
            />
        </>
    );
}

export default CardOferta;