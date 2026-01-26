/**
 * ============================================================================
 * COMPONENTE: ModalDetalleItem
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/negocios/ModalDetalleItem.tsx
 * 
 * Modal para mostrar detalle completo de un producto o servicio
 */

import {
    X,
    ImageIcon,
    Wrench,
} from 'lucide-react';
import { DropdownCompartir } from '../compartir';
import { useEffect, useState } from 'react';
import { useLockScroll } from '../../hooks/useLockScroll';
import api from '../../services/api';

// =============================================================================
// TIPOS
// =============================================================================

interface ItemCatalogo {
    id: string;
    tipo: string;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;
    precioBase: string;
    precioDesde?: boolean | null;
    imagenPrincipal?: string | null;
    requiereCita?: boolean | null;
    duracionEstimada?: number | null;
    disponible?: boolean | null;
    destacado?: boolean | null;
}

interface ModalDetalleItemProps {
    item: ItemCatalogo | null;
    whatsapp?: string | null;
    onClose: () => void;
    openedFromModal?: boolean; // Si se abrió desde otro modal (ModalCatalogo)
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalDetalleItem({ item, whatsapp, onClose, openedFromModal = false }: ModalDetalleItemProps) {
    // Estado para animación de cierre
    const [cerrando, setCerrando] = useState(false);
    
    // Solo bloquear scroll si NO se abrió desde otro modal
    // Si openedFromModal=true, el modal padre ya maneja el scroll
    useLockScroll(!!item && !openedFromModal);

    // Función para cerrar con animación
    const handleCerrar = () => {
        if (cerrando) return;
        setCerrando(true);
        setTimeout(() => {
            setCerrando(false);
            onClose();
        }, 200);
    };

    // Registrar vista del artículo (con filtro de cooldown)
    useEffect(() => {
        if (!item) return;
        
        const registrarVista = async () => {
            try {
                // 1. Verificar localStorage - ¿Ya vimos este artículo recientemente?
                const vistasGuardadas = localStorage.getItem('articulosVistos');
                const articulosVistos = vistasGuardadas ? JSON.parse(vistasGuardadas) : {};
                
                const ahora = Date.now();
                const ultimaVista = articulosVistos[item.id];
                
                // 2. Cooldown: 24 horas (86400000 ms)
                // Si la última vista fue hace menos de 24h, NO contar
                const COOLDOWN_24H = 24 * 60 * 60 * 1000;
                
                if (ultimaVista && (ahora - ultimaVista) < COOLDOWN_24H) {
                    // Ya se vio recientemente, no registrar
                    return;
                }
                
                // 3. Registrar vista en backend
                await api.post(`/articulos/${item.id}/vista`);
                
                // 4. Guardar timestamp en localStorage
                articulosVistos[item.id] = ahora;
                localStorage.setItem('articulosVistos', JSON.stringify(articulosVistos));
                
            } catch (error) {
                // Silencioso - no afecta UX si falla
                console.error('Error al registrar vista:', error);
            }
        };

        registrarVista();
    }, [item?.id]);

    if (!item) return null;

    const esServicio = item.tipo === 'servicio';

    const abrirWhatsApp = () => {
        if (!whatsapp) return;
        // Limpiar el número: quitar espacios, + y cualquier carácter no numérico
        const numeroLimpio = whatsapp.replace(/\D/g, '');
        const mensaje = encodeURIComponent(`Hola, me interesa: ${item.nombre}`);
        window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
    };

    const abrirChatYA = () => {
        // TODO: Implementar apertura de ChatYA
    };

    return (
        <div
            className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 ${
                cerrando ? 'animate-out fade-out' : 'animate-in fade-in'
            } duration-200`}
            onClick={handleCerrar}
        >
            <div
                className={`relative bg-white rounded-2xl w-full min-w-[280px] max-w-[80vw] lg:max-w-xs 2xl:max-w-sm max-h-[90vh] lg:max-h-[90vh] 2xl:max-h-[85vh] overflow-hidden shadow-2xl ${
                    cerrando ? 'animate-out fade-out zoom-out-95' : 'animate-in fade-in zoom-in-95'
                } duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Imagen Hero con overlay */}
                <div className="relative h-52 lg:h-44 2xl:h-56 bg-slate-100">
                    {item.imagenPrincipal ? (
                        <img
                            src={item.imagenPrincipal}
                            alt={item.nombre}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {esServicio ? (
                                <Wrench className="w-16 h-16 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 text-slate-300" />
                            ) : (
                                <ImageIcon className="w-16 h-16 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 text-slate-300" />
                            )}
                        </div>
                    )}
                    
                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Botones flotantes arriba-derecha */}
                    <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex gap-1.5 lg:gap-2">
                        <DropdownCompartir
                            url={`${window.location.origin}/p/articulo/${item.id}`}
                            texto={`¡Mira ${esServicio ? 'este servicio' : 'este producto'} en AnunciaYA!\n\n${item.nombre}`}
                            titulo={item.nombre}
                            variante="glass"
                        />
                        <button
                            onClick={handleCerrar}
                            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white hover:border-red-500 transition-all duration-200 group cursor-pointer"
                        >
                            <X className="w-4 h-4 lg:w-5 lg:h-5 text-slate-700 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                    
                    {/* Badge disponibilidad arriba-izquierda */}
                    {item.disponible !== null && (
                        <div className="absolute top-3 left-3 lg:top-2 lg:left-2 2xl:top-3 2xl:left-3">
                            <span className={`inline-flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-3 py-1 lg:px-2 lg:py-0.5 2xl:px-3 2xl:py-1 rounded-full text-xs lg:text-[10px] 2xl:text-xs font-semibold shadow-lg ${
                                item.disponible
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-red-500 text-white'
                            }`}>
                                <span className={`w-1.5 h-1.5 lg:w-1 lg:h-1 2xl:w-1.5 2xl:h-1.5 rounded-full ${item.disponible ? 'bg-white animate-pulse' : 'bg-white/70'}`} />
                                {item.disponible ? 'Disponible' : 'No disponible'}
                            </span>
                        </div>
                    )}
                    
                    {/* Título y categoría sobre la imagen */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-3 2xl:p-4">
                        <h2 className="text-white text-xl lg:text-base 2xl:text-xl font-bold drop-shadow-lg leading-tight line-clamp-2">
                            {item.nombre}
                        </h2>
                        {item.categoria && (
                            <span className="inline-block mt-1.5 lg:mt-1 2xl:mt-1.5 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm text-white/90 text-xs lg:text-[10px] 2xl:text-xs">
                                {item.categoria}
                            </span>
                        )}
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-3 2xl:space-y-4 overflow-y-auto max-h-[calc(90vh-13rem)] lg:max-h-[calc(90vh-11rem)] 2xl:max-h-[calc(85vh-14rem)]">
                    {/* Descripción */}
                    {item.descripcion && (
                        <p className="text-slate-600 text-sm lg:text-xs 2xl:text-sm leading-relaxed lg:leading-normal 2xl:leading-relaxed">
                            {item.descripcion}
                        </p>
                    )}

                    {/* Precio destacado */}
                    <div className="flex items-baseline gap-1">
                        {item.precioDesde && (
                            <span className="text-slate-400 text-sm lg:text-xs 2xl:text-sm">Desde</span>
                        )}
                        <span className="text-3xl lg:text-2xl 2xl:text-3xl font-black text-emerald-600">
                            ${parseFloat(item.precioBase).toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-sm lg:text-xs 2xl:text-sm">MXN</span>
                    </div>

                    {/* Botones de contacto con glow */}
                    <div className="flex gap-3 lg:gap-2 2xl:gap-3 pt-2 lg:pt-1 2xl:pt-2">
                        <button
                            onClick={abrirChatYA}
                            className="flex-1 flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 py-3 lg:py-2 2xl:py-3 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 cursor-pointer"
                        >
                            <img src="/ChatYA.webp" alt="ChatYA" className="h-6 lg:h-5 2xl:h-6 w-auto" />
                            <span className="text-sm lg:text-xs 2xl:text-sm">ChatYA</span>
                        </button>

                        {whatsapp && (
                            <button
                                onClick={abrirWhatsApp}
                                className="flex-1 flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 py-3 lg:py-2 2xl:py-3 rounded-xl bg-linear-to-r from-green-500 to-green-600 text-white font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 cursor-pointer"
                            >
                                <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span className="text-sm lg:text-xs 2xl:text-sm">WhatsApp</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalDetalleItem;