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
import { useEffect } from 'react';
import { Modal } from '../ui/Modal';
import Tooltip from '../ui/Tooltip';
import api from '../../services/api';
import { useChatYAStore } from '@/stores/useChatYAStore';
import { useUiStore } from '@/stores/useUiStore';

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
    negocioUsuarioId?: string | null;
    sucursalId?: string | null;
    negocioNombre?: string | null;
    onClose: () => void;
    openedFromModal?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalDetalleItem({ item, whatsapp, negocioUsuarioId, sucursalId, negocioNombre, onClose, openedFromModal: _openedFromModal = false }: ModalDetalleItemProps) {
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);
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

    const handleChatYA = () => {
        if (!negocioUsuarioId) return;

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
                nombre: negocioNombre ?? '',
                apellidos: '',
                avatarUrl: null,
            },
            datosCreacion: {
                participante2Id: negocioUsuarioId,
                participante2Modo: 'comercial',
                participante2SucursalId: sucursalId ?? '',
                contextoTipo: 'negocio',
            },
        });
        abrirChatYA();
        onClose();
    };

    return (
        <Modal
            abierto={!!item}
            onCerrar={onClose}
            mostrarHeader={false}
            paddingContenido="none"
            ancho="sm"
            zIndice="z-75"
            className="min-w-[330px] max-w-[80vw] lg:max-w-xs 2xl:max-w-sm"
        >
            {/* Imagen Hero con overlay */}
            <div className="relative h-52 lg:h-44 2xl:h-56 bg-slate-200">
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
                    <div className="absolute top-3 right-3 flex gap-2">
                        <Tooltip text="Compartir" position="bottom">
                            <DropdownCompartir
                                url={`${window.location.origin}/p/articulo/${item.id}`}
                                texto={`¡Mira ${esServicio ? 'este servicio' : 'este producto'} en AnunciaYA!\n\n${item.nombre}`}
                                titulo={item.nombre}
                                variante="glass"
                            />
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
                    
                    {/* Badge disponibilidad arriba-izquierda */}
                    {item.disponible !== null && (
                        <div className="absolute top-3 left-3 lg:top-2 lg:left-2 2xl:top-3 2xl:left-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold shadow-lg ${
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
                            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white font-medium text-sm lg:text-[11px] 2xl:text-sm">
                                {item.categoria}
                            </span>
                        )}
                    </div>
                </div>

                {/* Franja divisora */}
                <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg, #1e293b, #334155, #1e293b)' }} />

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto">
                    {/* Precio + contacto */}
                    <div className={`mx-4 lg:mx-3 2xl:mx-4 mt-4 lg:mt-3 2xl:mt-4 p-3 flex items-center justify-between ${item.descripcion ? 'rounded-xl bg-slate-200/60' : ''}`}>
                        <div>
                            {item.precioDesde && (
                                <span className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-semibold block mb-0.5">Desde</span>
                            )}
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl lg:text-2xl 2xl:text-3xl font-black text-emerald-600">
                                    ${parseFloat(item.precioBase).toFixed(2)}
                                </span>
                                <span className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">MXN</span>
                            </div>
                        </div>
                        {/* Contacto — iconos */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleChatYA}
                                disabled={!negocioUsuarioId}
                                className={`cursor-pointer ${negocioUsuarioId ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                            </button>
                            {whatsapp && (
                                <button
                                    onClick={abrirWhatsApp}
                                    className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:scale-110 p-[6px]"
                                >
                                    <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Descripción */}
                    {item.descripcion && (
                        <div className="mx-4 lg:mx-3 2xl:mx-4 mt-3 lg:mt-2.5 2xl:mt-3 pb-4">
                            <h4 className="text-slate-800 text-base lg:text-sm 2xl:text-base font-bold mb-1.5">Descripción</h4>
                            <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium leading-relaxed">
                                {item.descripcion}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
    );
}

export default ModalDetalleItem;