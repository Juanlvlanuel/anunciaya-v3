/**
 * ============================================================================
 * COMPONENTE: CardArticulo (Business Studio ONLY)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/CardArticulo.tsx
 * 
 * PROPÓSITO:
 * Card con el MISMO estilo visual que CardOferta
 * Layout horizontal compacto para gestión eficiente
 * 
 * ACTUALIZADO: Enero 2026 - Mismo estilo que Ofertas
 */

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    ShoppingCart,
    Copy,
    Package,
    Wrench,
} from 'lucide-react';
import type { Articulo } from '../../../../types/articulos';

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

    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const mostrar = () => {
        if (!isDesktop) return;
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

interface CardArticuloProps {
    articulo: Articulo;
    onEditar: (articulo: Articulo) => void;
    onEliminar: (id: string) => void;
    onToggle: (id: string, campo: 'disponible' | 'destacado', valor: boolean) => void;
    onDuplicar?: (articulo: Articulo) => void;
    onImagenClick?: (url: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getBorderColor(disponible: boolean): string {
    return disponible ? 'border-emerald-100' : 'border-slate-100';
}

function getShadowColor(disponible: boolean): string {
    return disponible 
        ? 'rgba(52, 211, 153, 0.08)' 
        : 'rgba(203, 213, 225, 0.05)';
}

function getConfigTipo(tipo: string): {
    color: string;
    colorTexto: string;
    Icono: typeof Package;
} {
    return tipo === 'producto'
        ? {
            color: 'bg-linear-to-r from-blue-500 to-blue-600 text-white',
            colorTexto: 'text-blue-500',
            Icono: Package
        }
        : {
            color: 'bg-linear-to-r from-purple-500 to-purple-600 text-white',
            colorTexto: 'text-purple-500',
            Icono: Wrench
        };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function CardArticulo({
    articulo,
    onEditar,
    onEliminar,
    onToggle,
    onDuplicar,
    onImagenClick,
}: CardArticuloProps) {
    const borderColor = getBorderColor(articulo.disponible);
    const shadowColor = getShadowColor(articulo.disponible);
    const configTipo = getConfigTipo(articulo.tipo);
    
    const precioFormateado = articulo.precioDesde 
        ? `Desde $${Number(articulo.precioBase).toFixed(0)}` 
        : `$${Number(articulo.precioBase).toFixed(0)}`;

    const handleImagenClick = () => {
        if (articulo.imagenPrincipal && onImagenClick) {
            onImagenClick(articulo.imagenPrincipal);
        }
    };

    return (
        <div 
            className={`
                bg-white rounded-xl shadow-lg border-2 overflow-hidden
                transition-all duration-300
                hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
                ${borderColor}
            `}
            style={{
                boxShadow: `
                    0 4px 6px rgba(0,0,0,0.1),
                    0 8px 20px rgba(0,0,0,0.15),
                    0 0 0 2px ${shadowColor}
                `
            }}
        >
            {/* ========== HEADER ========== */}
            <div className="flex items-center justify-between px-3 py-2 bg-linear-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                {/* Badge Tipo */}
                <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-md ${configTipo.color}`}
                >
                    <configTipo.Icono className="w-3.5 h-3.5" />
                    {articulo.tipo === 'producto' ? 'Producto' : 'Servicio'}
                </span>

                {/* Categoría */}
                <div className="flex items-center gap-1.5">
                    <span className={`text-lg font-black text-slate-700`}>
                        {articulo.categoria || 'General'}
                    </span>
                </div>
            </div>

            {/* ========== CONTENIDO ========== */}
            <div className="flex gap-3 p-3">
                
                {/* Imagen */}
                <div 
                    className="w-20 h-20 shrink-0 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={handleImagenClick}
                >
                    {articulo.imagenPrincipal ? (
                        <img src={articulo.imagenPrincipal} alt={articulo.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-linear-to-br from-slate-200 to-slate-300 relative overflow-hidden flex items-center justify-center">
                            <configTipo.Icono className="w-12 h-12 text-slate-400" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Nombre */}
                    <h3 className="font-bold text-base text-slate-900 truncate mb-0.5">
                        {articulo.nombre}
                    </h3>

                    {/* Precio */}
                    <div className="flex items-center gap-1.5 text-emerald-600 mb-1.5">
                        <span className="text-lg font-black">
                            {precioFormateado}
                        </span>
                    </div>

                    {/* Métricas con Iconos */}
                    <div className="flex items-center gap-2.5 text-slate-400">
                        <Tooltip texto="Vistas">
                            <span className="flex items-center gap-1 cursor-default">
                                <Eye className="w-4 h-4" />
                                <span className="text-base font-semibold">{articulo.totalVistas || 0}</span>
                            </span>
                        </Tooltip>

                        <Tooltip texto="Ventas realizadas">
                            <span className="flex items-center gap-1 cursor-default">
                                <ShoppingCart className="w-4 h-4" />
                                <span className="text-base font-semibold">{articulo.totalVentas || 0}</span>
                            </span>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* ========== ACCIONES ========== */}
            <div className="flex gap-2 px-3 pb-3">
                {/* Destacar */}
                <Tooltip texto={articulo.destacado ? 'Quitar destacado' : 'Destacar artículo'}>
                    <button
                        onClick={() => onToggle(articulo.id, 'destacado', !articulo.destacado)}
                        className={`p-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                            articulo.destacado
                                ? 'text-white bg-linear-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                                : 'text-white bg-linear-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600'
                        }`}
                    >
                        <Star className={`w-4 h-4 ${articulo.destacado ? 'fill-current' : ''}`} />
                    </button>
                </Tooltip>

                {/* Visible/Oculto */}
                <Tooltip texto={articulo.disponible ? 'Ocultar artículo' : 'Mostrar artículo'}>
                    <button
                        onClick={() => onToggle(articulo.id, 'disponible', !articulo.disponible)}
                        className={`p-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                            articulo.disponible
                                ? 'text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                : 'text-white bg-linear-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600'
                        }`}
                    >
                        {articulo.disponible ? (
                            <Eye className="w-4 h-4" />
                        ) : (
                            <EyeOff className="w-4 h-4" />
                        )}
                    </button>
                </Tooltip>

                {/* Editar */}
                <button
                    onClick={() => onEditar(articulo)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                >
                    <Edit className="w-4 h-4" />
                    Editar
                </button>

                {/* Eliminar */}
                <Tooltip texto="Borrar">
                    <button
                        onClick={() => onEliminar(articulo.id)}
                        className="p-2 text-white bg-linear-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </Tooltip>

                {/* Duplicar */}
                {onDuplicar && (
                    <Tooltip texto="Duplicar">
                        <button
                            onClick={() => onDuplicar(articulo)}
                            className="p-2 text-white bg-linear-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}

export default CardArticulo;