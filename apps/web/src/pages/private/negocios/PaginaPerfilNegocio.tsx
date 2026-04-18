/**
 * ============================================================================
 * PÁGINA: PaginaPerfilNegocio (v9 - REFACTORIZADO CON ModalImagenes)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx
 * 
 * CAMBIOS EN ESTA VERSIÓN:
 * - ✅ Refactorizado para usar ModalImagenes universal
 * - ✅ Eliminado componente Lightbox (reemplazado por ModalImagenes)
 * - ✅ Eliminado componente LightboxSimple (reemplazado por ModalImagenes)
 * - ✅ Simplificado manejo de estados de imágenes
 * - ✅ Mantiene toda la funcionalidad existente
 * - ✅ Código más limpio y reutilizable
 * - ✅ -156 líneas de código eliminadas
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import {
    ArrowLeft,
    Heart,
    Star,
    MapPin,
    Clock,
    CreditCard,
    Navigation,
    AlertCircle,
    Bell,
    Eye,
    Mail,
    ChevronRight,
    ChevronDown,
    Image as ImageIcon,
    X,
    Send,
    UtensilsCrossed,
    Link2,
    Phone,
    Truck,
    Home,
    Maximize2,
    Plus,
    Minus,
    Crosshair,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../config/queryKeys';
import { useNegocioPerfil, useNegocioOfertas, useNegocioCatalogo, useNegocioResenas } from '../../../hooks/queries/useNegocios';
import type { NegocioCompleto } from '../../../types/negocios';
import { useVotos } from '../../../hooks/useVotos';
import { api } from '../../../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ModalHorarios, formatearHora, calcularEstadoNegocio } from '../../../components/negocios/ModalHorarios';
import { ModalBottom } from '../../../components/ui/ModalBottom';
import { Modal } from '../../../components/ui/Modal';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
// useNegociosCacheStore eliminado — React Query maneja caché
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useUiStore } from '../../../stores/useUiStore';
import { notificar } from '../../../utils/notificaciones';
import { SeccionCatalogo, SeccionOfertas, SeccionResenas, ModalOfertaDetalle } from '../../../components/negocios';
import { useLockScroll } from '../../../hooks/useLockScroll';
import { DropdownCompartir, ModalAuthRequerido } from '../../../components/compartir';
import { LayoutPublico } from '../../../components/layout';
import { ModalImagenes } from '../../../components/ui';
import Tooltip from '../../../components/ui/Tooltip';

// Fix de iconos de Leaflet (necesario en Vite/React)
// @ts-expect-error - Leaflet no exporta el tipo correcto para _getIconUrl
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// =============================================================================
// TIPOS LOCALES
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

interface Resena {
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };
}
interface Oferta {
    id: string;
    titulo: string;
    descripcion?: string;
    imagen?: string;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'regalo' | 'otro';
    valor?: number | string;
    fechaFin?: string;
}

interface MetodoPago {
    tipo: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const nombreMetodoPago = (tipo: string): string => {
    if (!tipo) return '';
    const nombres: Record<string, string> = {
        'efectivo': 'Efectivo',
        'tarjeta_debito': 'Tarjeta',
        'transferencia': 'Transferencia',
    };
    return nombres[tipo.toLowerCase()] || tipo;
};

const agruparMetodosPago = (metodos: MetodoPago[] | string[]): string[] => {
    const metodosAgrupados = new Set<string>();

    metodos.forEach((metodo) => {
        // Obtener el tipo del método
        const tipo = typeof metodo === 'string' ? metodo : metodo.tipo;

        // Guard: si tipo es undefined o null, saltar esta iteración
        if (!tipo) return;

        // Si es tarjeta de cualquier tipo, agregar como "Tarjeta"
        if (tipo.toLowerCase().includes('tarjeta')) {
            metodosAgrupados.add('Tarjeta');
        }
        else {
            metodosAgrupados.add(tipo);
        }
    });

    return Array.from(metodosAgrupados);
};


// =============================================================================
// MODAL MAPA EXPANDIDO
// =============================================================================

interface ModalMapaProps {
    negocio: {
        negocioNombre: string;
        sucursalNombre: string;
        totalSucursales: number;
        esPrincipal: boolean;
        logoUrl: string | null;
        whatsapp: string | null;
        direccion: string;
        latitud: number;
        longitud: number;
        estaAbierto: boolean | null;
        calificacion: number;
        totalCalificaciones: number;
        distanciaKm: number | null;
    };
    userLat: number | null;
    userLng: number | null;
    onClose: () => void;
    onChat?: () => void;
}

function ModalMapa({ negocio, userLat, userLng, onClose, onChat }: ModalMapaProps) {

    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Iconos personalizados para los marcadores
    const negocioIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const userIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Calcular el centro del mapa si hay ubicación de usuario
    const centerLat = userLat && userLng ? (negocio.latitud + userLat) / 2 : negocio.latitud;
    const centerLng = userLat && userLng ? (negocio.longitud + userLng) / 2 : negocio.longitud;

    return createPortal(
        <div
            className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] flex items-center justify-center p-3 lg:p-4 2xl:p-6 z-9999"
            onClick={onClose}
        >
            {/* Contenedor principal */}
            <div
                className="relative w-full max-w-3xl lg:max-w-3xl 2xl:max-w-5xl bg-white rounded-xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ height: '75vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER OSCURO */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                    <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-3 2xl:px-6 2xl:py-4">
                        {/* Info del negocio */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {negocio.logoUrl ? (
                                <img
                                    src={negocio.logoUrl}
                                    alt={negocio.negocioNombre}
                                    className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 rounded-full object-cover border-2 border-white/20"
                                />
                            ) : (
                                <div className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 bg-white/15 rounded-xl flex items-center justify-center border-2 border-white/20">
                                    <span className="text-lg font-bold text-white">{negocio.negocioNombre.charAt(0)}</span>
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                    {negocio.negocioNombre}
                                </h3>
                                <p className="text-sm lg:text-sm 2xl:text-base text-white/60 font-medium truncate">
                                    {negocio.direccion}
                                </p>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                                onClick={() => {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${negocio.latitud},${negocio.longitud}`;
                                    window.open(url, '_blank');
                                }}
                                className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 2xl:px-5 2xl:py-2.5 bg-white text-slate-800 font-bold text-sm lg:text-sm 2xl:text-base rounded-xl shadow-md cursor-pointer active:scale-95"
                            >
                                <Navigation className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                <span className="hidden sm:inline">Cómo llegar</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 cursor-pointer"
                            >
                                <X className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAPA con leyenda flotante */}
                <div className="flex-1 relative">
                    {/* Leyenda flotante */}
                    <div className="absolute top-3 left-3 z-1000 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold text-slate-700">Negocio</span>
                        </div>
                        {userLat && userLng && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-semibold text-slate-700">Tú</span>
                            </div>
                        )}
                    </div>

                    {/* Controles de zoom personalizados - HORIZONTAL en contenedor único */}
                    <div className="absolute bottom-6 right-3 z-1000 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
                        <button
                            onClick={() => {
                                if (mapRef.current) {
                                    if (userLat && userLng) {
                                        mapRef.current.fitBounds([
                                            [negocio.latitud, negocio.longitud],
                                            [userLat, userLng]
                                        ], { padding: [50, 50] });
                                    } else {
                                        mapRef.current.setView([negocio.latitud, negocio.longitud], 16);
                                    }
                                }
                            }}
                            className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer active:bg-slate-700"
                            title="Centrar mapa"
                        >
                            <Crosshair className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
                        </button>
                        <div className="w-px h-auto bg-slate-700 my-1.5" />
                        <button
                            onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) + 1)}
                            className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer active:bg-slate-700"
                            title="Acercar"
                        >
                            <Plus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
                        </button>
                        <div className="w-px h-auto bg-slate-700 my-1.5" />
                        <button
                            onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) - 1)}
                            className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer active:bg-slate-700"
                            title="Alejar"
                        >
                            <Minus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
                        </button>
                    </div>

                    <MapContainer
                        ref={mapRef}
                        center={[centerLat, centerLng]}
                        zoom={userLat && userLng ? 14 : 16}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        className="w-full h-full"
                    >
                        <TileLayer
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            keepBuffer={5}
                            updateWhenZooming={false}
                            updateWhenIdle={true}
                        />

                        {/* Marcador del negocio */}
                        <Marker
                            position={[negocio.latitud, negocio.longitud]}
                            icon={negocioIcon}
                        >
                            <Popup className="popup-negocio" autoPan={true} autoPanPadding={[70, 70]}>
                                <div>
                                    {/* Header oscuro con glow azul */}
                                    <div
                                        className="relative px-4 py-3 overflow-hidden"
                                        style={{ background: '#000000' }}
                                    >
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)' }}
                                        />
                                        <div className="relative z-10 flex items-center gap-3">
                                            {negocio.logoUrl ? (
                                                <img
                                                    src={negocio.logoUrl}
                                                    alt={negocio.negocioNombre}
                                                    className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white/20"
                                                />
                                            ) : (
                                                <div
                                                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
                                                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                                >
                                                    <span className="text-white font-bold text-base">{negocio.negocioNombre.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-[17px] font-bold text-white leading-tight truncate">
                                                    {negocio.negocioNombre}
                                                </h3>
                                                {negocio.totalSucursales > 1 && (
                                                    <p className="text-sm font-medium text-white/70 truncate mt-0.5">
                                                        {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-3 pb-3 text-[14px]">
                                            {negocio.estaAbierto !== null && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: negocio.estaAbierto ? '#22c55e' : '#ef4444' }} />
                                                    <span className={`font-bold ${negocio.estaAbierto ? 'text-green-600' : 'text-red-500'}`}>
                                                        {negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
                                                    </span>
                                                </div>
                                            )}
                                            {negocio.totalCalificaciones > 0 && (
                                                <>
                                                    <div className="w-px h-4 bg-slate-400" />
                                                    <div className="flex items-center gap-1.5">
                                                        <Star className="w-4.5 h-4.5 text-amber-400 fill-amber-400" />
                                                        <span className="font-bold text-slate-800">{negocio.calificacion.toFixed(1)}</span>
                                                        <span className="text-[13px] text-slate-600 font-medium">({negocio.totalCalificaciones})</span>
                                                    </div>
                                                </>
                                            )}
                                            {negocio.distanciaKm !== null && (
                                                <>
                                                    <div className="w-px h-4 bg-slate-400" />
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="font-bold">
                                                            {negocio.distanciaKm < 1 ? `${Math.round(negocio.distanciaKm * 1000)} m` : `${negocio.distanciaKm.toFixed(1)} km`}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Dirección */}
                                        <div className="flex items-center gap-2 pt-1 pb-1 border-t border-slate-300">
                                            <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                            <p className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-2 pt-0.5">
                                                {negocio.direccion}
                                            </p>
                                        </div>

                                        <div className="h-px bg-slate-300 my-3" />

                                        {/* Contacto */}
                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onChat?.(); }}
                                                className="cursor-pointer hover:scale-110"
                                            >
                                                <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                                            </button>
                                            {negocio.whatsapp && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp!.replace(/\D/g, '')}`, '_blank'); }}
                                                    className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:scale-110 p-1.5"
                                                >
                                                    <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Marcador del usuario si existe */}
                        {userLat && userLng && (
                            <Marker
                                position={[userLat, userLng]}
                                icon={userIcon}
                            >
                                <Popup>
                                    <div className="text-center">
                                        <strong className="text-base">Tu ubicación</strong>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>,
        document.body
    );
}

// =============================================================================
// PROPS OPCIONALES (para renderizar embebido sin router, ej: desde ChatYA)
// =============================================================================

interface PaginaPerfilNegocioProps {
    sucursalIdOverride?: string;
    modoPreviewOverride?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaPerfilNegocio({ sucursalIdOverride, modoPreviewOverride }: PaginaPerfilNegocioProps) {
    const { sucursalId: sucursalIdParam } = useParams<{ sucursalId: string }>();
    const sucursalId = sucursalIdOverride || sucursalIdParam;
    const navigate = useNavigate();
    const { usuario } = useAuthStore();
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    // ✅ Store de caché para ofertas y catálogo
    // React Query
    const qc = useQueryClient();
    const location = useLocation();

    const [totalLikes, setTotalLikes] = useState<number | undefined>(undefined);
    const [totalVisitas, setTotalVisitas] = useState<number | undefined>(undefined);
    const vistaRegistrada = useRef(false);

    const esModoPreview = modoPreviewOverride || new URLSearchParams(window.location.search).get('preview') === 'true';

    // Detección de login
    const estaLogueado = !!usuario;

    // Detectar si es ruta pública (/p/negocio/:id)
    const esRutaPublica = location.pathname.startsWith('/p/negocio');

    // Modal de auth requerido
    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
    const [accionAuthRequerida, setAccionAuthRequerida] = useState<'like' | 'save' | 'chat' | 'general'>('general');

    // Estados de expansión
    const [seccionExpandida] = useState<'catalogo' | null>(null);
    const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);

    // Paginación de galería
    const [paginaGaleria, setPaginaGaleria] = useState(0);
    const IMAGENES_POR_PAGINA = 4;

    // ✅ NUEVO: Estado unificado para ModalImagenes
    const [modalImagenes, setModalImagenes] = useState<{
        isOpen: boolean;
        images: string[];
        initialIndex: number;
    }>({
        isOpen: false,
        images: [],
        initialIndex: 0,
    });


    const [modalGaleriaAbierto, setModalGaleriaAbierto] = useState(false);
    const { esMobile: esMobileGaleria } = useBreakpoint();

    // Distancia del usuario
    const [distanciaKm, setDistanciaKm] = useState<number | null>(null);

    // Modal del mapa expandido
    const [modalMapaAbierto, setModalMapaAbierto] = useState(false);

    // React Query — perfil, catálogo, reseñas, ofertas (con caché automático)
    const perfilQuery = useNegocioPerfil(sucursalId);
    const negocio = (perfilQuery.data ?? null) as NegocioCompleto | null;
    const loading = perfilQuery.isPending;
    const error = perfilQuery.error ? 'Error al cargar negocio' : null;

    const catalogoQuery = useNegocioCatalogo(negocio?.negocioId);
    const catalogo = (catalogoQuery.data ?? []) as ItemCatalogo[];
    const resenasQuery = useNegocioResenas(sucursalId);
    const resenas = (resenasQuery.data ?? []) as Resena[];
    const ofertasQueryRaw = useNegocioOfertas(sucursalId);
    const ofertas: Oferta[] = ((ofertasQueryRaw.data ?? []) as Array<Record<string, unknown>>).map(o => ({
        id: (o.ofertaId ?? o.id) as string,
        titulo: o.titulo as string,
        descripcion: o.descripcion as string | undefined,
        imagen: o.imagen as string | undefined,
        tipo: o.tipo as Oferta['tipo'],
        valor: o.valor != null ? (isNaN(Number(o.valor)) ? o.valor : Number(o.valor)) as Oferta['valor'] : undefined,
        fechaFin: o.fechaFin as string | undefined,
    }));

    const [puedeResenar, setPuedeResenar] = useState(false);
    const [resenaDeepLinkId, setResenaDeepLinkId] = useState<string | null>(null);

    // Estado para oferta abierta desde deep link (notificación)
    const [ofertaDeepLink, setOfertaDeepLink] = useState<Oferta | null>(null);

    // Bloquear scroll cuando cualquier modal está abierto
    useLockScroll(
        modalHorariosAbierto ||
        modalMapaAbierto
    );
    // Función Haversine para calcular distancia
    const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const yaVistoEnSesion = (sucursalId: string) => {
        const visitados = sessionStorage.getItem('negocios_visitados');
        if (!visitados) return false;
        return JSON.parse(visitados).includes(sucursalId);
    };

    const marcarComoVisitado = (sucursalId: string) => {
        const visitados = sessionStorage.getItem('negocios_visitados');
        const lista = visitados ? JSON.parse(visitados) : [];
        if (!lista.includes(sucursalId)) {
            lista.push(sucursalId);
            sessionStorage.setItem('negocios_visitados', JSON.stringify(lista));
        }
    };

    // Registrar vista cuando carga el perfil
    useEffect(() => {
        if (!negocio) return;
        setTotalLikes(negocio.totalLikes);
        setTotalVisitas(negocio.metricas?.totalViews ?? 0);

        if (estaLogueado && !vistaRegistrada.current && !yaVistoEnSesion(negocio.sucursalId)) {
            vistaRegistrada.current = true;
            api.post('/metricas/view', { entityType: 'sucursal', entityId: negocio.sucursalId })
                .then(() => {
                    marcarComoVisitado(negocio.sucursalId);
                    setTotalVisitas(prev => (prev ?? 0) + 1);
                })
                .catch(() => {});
        }
    }, [negocio?.sucursalId, negocio?.totalLikes]);

    const { liked, followed, toggleLike, toggleFollow } = useVotos({
        entityType: 'sucursal',
        entityId: sucursalId || '',
        initialLiked: negocio?.liked ?? false,
        initialFollowed: negocio?.followed ?? false,
        onLikeChange: (liked) => {
            setTotalLikes(prev => prev !== undefined ? (liked ? prev + 1 : prev - 1) : prev);
        },
    });

    // -------------------------------------------------------------------------
    // Wrappers condicionales para acciones que requieren auth
    // -------------------------------------------------------------------------
    const handleLikeConAuth = () => {
        if (!estaLogueado) {
            setAccionAuthRequerida('like');
            setModalAuthAbierto(true);
            return;
        }
        toggleLike();
    };

    const handleSaveConAuth = () => {
        if (!estaLogueado) {
            setAccionAuthRequerida('save');
            setModalAuthAbierto(true);
            return;
        }
        toggleFollow();
    };

    // Calcular distancia cuando se carga el negocio
    // ✅ MEJORA: Usa coordenadas del GPS Store (consistente con la lista)
    const { latitud: userLat, longitud: userLng } = useGpsStore();

    useEffect(() => {
        if (negocio?.latitud && negocio?.longitud && userLat && userLng) {
            const distancia = calcularDistancia(
                userLat,
                userLng,
                negocio.latitud,
                negocio.longitud
            );
            setDistanciaKm(distancia);
        } else {
            setDistanciaKm(null);
        }
    }, [negocio?.latitud, negocio?.longitud, userLat, userLng]);

    // Catálogo, ofertas y reseñas manejados por React Query (arriba)


    // Reseñas manejadas por React Query (arriba)

    // Ofertas manejadas por React Query (arriba)

    // =========================================================================
    // DEEP LINK: Abrir modal de oferta desde notificación (?ofertaId=xxx)
    // =========================================================================
    const [ofertaIdPendiente, setOfertaIdPendiente] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('ofertaId') || '';
    });

    // Detectar nuevos deep links de oferta
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nuevoId = params.get('ofertaId');
        if (nuevoId) {
            setOfertaIdPendiente(nuevoId);
            params.delete('ofertaId');
            const nuevaUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', nuevaUrl);
        }
    }, [location.search]);

    useEffect(() => {
        if (!ofertaIdPendiente || ofertas.length === 0) return;
        const encontrada = ofertas.find((o) => o.id === ofertaIdPendiente);
        if (encontrada) {
            setOfertaDeepLink(encontrada);
        } else {
            notificar.info('Esta oferta ya no está disponible');
        }
        setOfertaIdPendiente('');
    }, [ofertaIdPendiente, ofertas]);

    // =========================================================================
    // DEEP LINK: Abrir modal de reseñas desde notificación (?resenaId=xxx)
    // =========================================================================
    const [resenaIdPendiente, setResenaIdPendiente] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('resenaId') || '';
    });

    // Detectar nuevos deep links de reseña
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nuevoId = params.get('resenaId');
        if (nuevoId) {
            setResenaIdPendiente(nuevoId);
            params.delete('resenaId');
            const nuevaUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', nuevaUrl);
        }
    }, [location.search]);

    useEffect(() => {
        if (!resenaIdPendiente || resenas.length === 0) return;
        const encontrada = resenas.find((r) => r.id === resenaIdPendiente);
        if (encontrada) {
            setResenaDeepLinkId(resenaIdPendiente);
        } else {
            notificar.info('Esta reseña ya no está disponible');
        }
        setResenaIdPendiente('');
    }, [resenaIdPendiente, resenas]);

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleVolver = () => navigate('/negocios');

    const handleWhatsApp = () => {
        if (negocio?.whatsapp) {
            // Limpiar el número: quitar espacios, + y cualquier carácter no numérico
            const numeroLimpio = negocio.whatsapp.replace(/\D/g, '');
            const mensaje = encodeURIComponent(`Hola! Vi tu negocio en AnunciaYA`);
            window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
        }
    };

    const handleDirecciones = () => {
        if (negocio?.latitud && negocio?.longitud) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${negocio.latitud},${negocio.longitud}`, '_blank');
        }
    };

    const handleChatYA = () => {
        if (!estaLogueado) {
            setAccionAuthRequerida('chat');
            setModalAuthAbierto(true);
            return;
        }
        if (!negocio) return;
        abrirChatTemporal({
            id: `temp_${Date.now()}`,
            otroParticipante: {
                id: negocio.usuarioId,
                nombre: negocio.negocioNombre,
                apellidos: '',
                avatarUrl: negocio.logoUrl,
                negocioNombre: negocio.negocioNombre,
                negocioLogo: negocio.logoUrl || undefined,
                sucursalNombre: negocio.sucursalNombre || undefined,
            },
            datosCreacion: {
                participante2Id: negocio.usuarioId,
                participante2Modo: 'comercial',
                participante2SucursalId: negocio.sucursalId,
                contextoTipo: 'negocio',
            },
        });
        abrirChatYA();
    };

    // ✅ NUEVO: Handlers simplificados para ModalImagenes
    const galeriaImagenes = negocio?.galeria || [];

    const abrirGaleria = (indice: number) => {
        setModalImagenes({
            isOpen: true,
            images: galeriaImagenes.map(img => img.url),
            initialIndex: indice,
        });
    };

    const abrirImagenUnica = (url: string) => {
        setModalImagenes({
            isOpen: true,
            images: [url],
            initialIndex: 0,
        });
    };

    const cerrarModalImagenes = () => {
        setModalImagenes({
            isOpen: false,
            images: [],
            initialIndex: 0,
        });
    };

    // Paginación de galería
    const siguientePaginaGaleria = () => {
        const totalPaginas = Math.ceil(galeriaImagenes.length / IMAGENES_POR_PAGINA);
        setPaginaGaleria(prev => prev < totalPaginas - 1 ? prev + 1 : prev);
    };

    const anteriorPaginaGaleria = () => {
        const totalPaginas = Math.ceil(galeriaImagenes.length / IMAGENES_POR_PAGINA);
        setPaginaGaleria(prev => (prev - 1 + totalPaginas) % totalPaginas);
    };

    const imagenesActuales = galeriaImagenes.slice(
        paginaGaleria * IMAGENES_POR_PAGINA,
        (paginaGaleria + 1) * IMAGENES_POR_PAGINA
    );
    const hayMasImagenes = galeriaImagenes.length > IMAGENES_POR_PAGINA;
    const totalPaginasGaleria = Math.ceil(galeriaImagenes.length / IMAGENES_POR_PAGINA);

    // =============================================================================
    // HELPERS
    // =============================================================================

    const resenasData = resenas;
    const promedioResenas = parseFloat(negocio?.calificacionPromedio || '0') || 0;
    const tieneCalificacion = (negocio?.totalCalificaciones ?? 0) > 0;
    const tieneOfertas = ofertas.length > 0;

    // =============================================================================
    // RENDER: Estados especiales
    // =============================================================================

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent overflow-x-hidden lg:overflow-x-visible">
                <div className="max-w-7xl mx-auto px-8 lg:px-12 2xl:px-16 py-6">
                    {/* Skeleton Hero */}
                    <div className="relative h-48 lg:h-56 bg-slate-200 animate-pulse rounded-b-3xl -mx-8 lg:-mx-12 2xl:-mx-16" />

                    {/* Skeleton Logo + Info */}
                    <div className="py-4">
                        <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                            {/* Logo skeleton */}
                            <div className="-mt-14 lg:-mt-16 w-28 h-28 lg:w-32 lg:h-32 rounded-xl bg-slate-200 animate-pulse border-4 border-white shadow-lg" />

                            <div className="flex-1">
                                {/* Nombre skeleton */}
                                <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg mb-3" />
                                {/* Categoría skeleton */}
                                <div className="h-5 w-48 bg-slate-200 animate-pulse rounded-lg" />
                            </div>

                            {/* Métricas skeleton */}
                            <div className="flex gap-4">
                                <div className="h-12 w-24 bg-slate-200 animate-pulse rounded-xl" />
                                <div className="h-12 w-28 bg-slate-200 animate-pulse rounded-xl" />
                                <div className="h-12 w-28 bg-slate-200 animate-pulse rounded-xl" />
                            </div>
                        </div>
                    </div>

                    {/* Skeleton Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_320px] lg:gap-4 2xl:gap-8 mt-6">
                        {/* Columna principal skeleton */}
                        <div className="space-y-6">
                            {/* Ubicación skeleton */}
                            <div className="h-6 w-80 bg-slate-200 animate-pulse rounded-lg" />
                            <div className="h-px bg-slate-300" />

                            {/* Sección skeleton */}
                            <div>
                                <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg mb-4" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 bg-slate-200 animate-pulse rounded-xl" />
                                    <div className="h-24 bg-slate-200 animate-pulse rounded-xl" />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar skeleton */}
                        <div className="space-y-4">
                            <div className="h-6 w-32 bg-slate-200 animate-pulse rounded-lg" />
                            <div className="h-80 bg-slate-200 animate-pulse rounded-xl" />
                            <div className="h-12 bg-slate-200 animate-pulse rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !negocio) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Negocio no encontrado</h2>
                    <p className="text-slate-600 mb-6">{error || 'El negocio que buscas no existe o fue eliminado'}</p>
                    <button onClick={handleVolver} className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
                        Volver a la lista
                    </button>
                </div>
            </div>
        );
    }

    // =============================================================================
    // RENDER: Perfil completo
    // =============================================================================

    // Contenido principal
    const contenidoPrincipal = (
        // ✅ overflow-x-hidden solo en móvil, visible en lg y 2xl
        <div className="min-h-screen bg-transparent overflow-x-hidden lg:overflow-x-visible">
            {/* Wrapper removido - LayoutPublico ya maneja el ancho */}

            {/* MODAL HORARIOS */}
            {modalHorariosAbierto && negocio.horarios && negocio.horarios.length > 0 && (
                <ModalHorarios
                    horarios={negocio.horarios}
                    onClose={() => setModalHorariosAbierto(false)}
                    centrado={esModoPreview}
                />
            )}

            {/* ✅ NUEVO: Modal Universal de Imágenes */}
            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={cerrarModalImagenes}
            />

            {/* ================================================================
                HERO
            ================================================================ */}
            <div className="relative h-60 lg:h-50 2xl:h-72 bg-slate-200 overflow-hidden rounded-b-3xl lg:rounded-b-none lg:rounded-br-[3rem] lg:-mx-3.5 2xl:-mx-7.5">
                {negocio.portadaUrl ? (
                    <img
                        src={negocio.portadaUrl}
                        alt={negocio.negocioNombre}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => abrirImagenUnica(negocio.portadaUrl!)}
                    />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-blue-500 to-purple-600" />
                )}
                <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-b-3xl lg:rounded-b-none lg:rounded-br-[3rem]" />

                {/* MÉTRICAS GLASSMORPHISM - Solo móvil */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-4 py-2.5 px-3 bg-white/60 backdrop-blur-md lg:hidden">
                    {negocio.horarios && negocio.horarios.length > 0 && (() => {
                        const info = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                        const abierto = info.estado === 'abierto';
                        return (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${abierto ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className={`text-sm font-bold ${abierto ? 'text-green-600' : 'text-red-500'}`}>
                                        {abierto ? 'Abierto' : 'Cerrado'}
                                    </span>
                                </div>
                                <div className="h-5 w-px bg-slate-400/50" />
                            </>
                        );
                    })()}
                    <div className="flex items-center gap-1.5">
                        <Heart className="w-5 h-5 text-red-500 fill-current" />
                        <span className="text-sm font-bold text-slate-700">{totalLikes ?? 0}</span>
                    </div>
                    <div className="h-5 w-px bg-slate-400/50" />
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">{totalVisitas ?? 0}</span>
                    </div>
                    <div className="h-5 w-px bg-slate-400/50" />
                    <div className="flex items-center gap-1.5">
                        <Star className={`w-5 h-5 ${tieneCalificacion ? 'text-yellow-500 fill-current' : 'text-yellow-400'}`} />
                        <span className="text-sm font-bold text-slate-700">
                            {tieneCalificacion ? `${promedioResenas.toFixed(1)}` : '0'}
                        </span>
                    </div>
                    {distanciaKm !== null && (
                        <>
                            <div className="h-5 w-px bg-slate-400/50" />
                            <div className="flex items-center gap-1.5">
                                <Navigation className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-bold text-blue-600">
                                    {distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)}m` : `${distanciaKm.toFixed(1)}km`}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="absolute inset-0 pointer-events-none">
                    <div className="px-12 lg:px-16 2xl:px-20 h-full relative">
                        {/* Botón Volver (oculto en modo preview) */}
                        {!esModoPreview && (
                            <div className="pointer-events-auto absolute top-14 lg:top-4 left-5 2xl:left-7.5">
                                <Tooltip text="Volver" position="bottom">
                                    <button onClick={handleVolver} className="cursor-pointer p-2.5 lg:p-2 2xl:p-2.5 rounded-full border-2 bg-white/90 border-white text-slate-700 backdrop-blur-sm shadow-lg">
                                        <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    </button>
                                </Tooltip>
                            </div>
                        )}

                        <div className="absolute top-14 lg:top-4 right-5 2xl:right-7.5 flex gap-2 pointer-events-auto">
                            {/* Botón Like */}
                            <Tooltip text={liked ? 'Quitar like' : 'Like'} position="bottom">
                                <button onClick={handleLikeConAuth} className={`cursor-pointer p-2.5 lg:p-2 2xl:p-2.5 rounded-full border-2 backdrop-blur-sm shadow-lg ${liked ? 'bg-red-50 border-red-500 text-red-500' : 'bg-white/90 border-white text-slate-700'}`}>
                                    <Heart className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${liked ? 'fill-current' : ''}`} />
                                </button>
                            </Tooltip>
                            {/* Botón Seguir */}
                            <Tooltip text={followed ? 'Dejar de seguir' : 'Seguir'} position="bottom">
                                <button onClick={handleSaveConAuth} className={`cursor-pointer p-2.5 lg:p-2 2xl:p-2.5 rounded-full border-2 backdrop-blur-sm shadow-lg ${followed ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white/90 border-white text-slate-700'}`}>
                                    <Bell className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${followed ? 'fill-current' : ''}`} />
                                </button>
                            </Tooltip>
                            {/* Botón Compartir */}
                            <Tooltip text="Compartir" position="bottom">
                                <DropdownCompartir
                                    url={`${window.location.origin}/p/negocio/${sucursalId}`}
                                    texto={`¡Mira este negocio en AnunciaYA!\n\n${negocio?.negocioNombre}`}
                                    titulo={negocio?.negocioNombre || 'Negocio'}
                                    variante="hero"
                                />
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logo + Nombre + Badge CardYA + Métricas */}
            <div className="py-4 lg:py-0 2xl:py-4 2xl:px-0">
                <div className="relative w-full">
                    {/* MÓVIL: Logo + Nombre en fila */}
                    <div className="flex items-start gap-4 lg:hidden">
                        {/* Logo (izquierda, más grande, con margen) */}
                        <div
                            className={`-mt-8 ml-5 shrink-0 w-29 h-29 rounded-xl overflow-hidden border-4 border-white bg-white shadow-lg ${negocio.logoUrl ? 'cursor-pointer' : ''}`}
                            onClick={() => negocio.logoUrl && abrirImagenUnica(negocio.logoUrl)}
                        >
                            {negocio.logoUrl ? (
                                <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white">{negocio.negocioNombre.charAt(0).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        {/* Nombre + Badges envío discretos */}
                        <div className="flex-1 min-w-0 -mt-2 overflow-hidden max-w-[220px]">
                            <p className="text-2xl font-bold text-slate-900 mb-1 wrap-break-word">
                                {negocio.negocioNombre}
                                {negocio.aceptaCardya && (
                                    <>
                                        {' '}
                                        <CreditCard className="w-7 h-7 text-amber-500 animate-bounce" style={{ animationDuration: '2s', display: 'inline', verticalAlign: 'middle' }} />
                                    </>
                                )}
                            </p>
                            {negocio.totalSucursales > 1 && (
                                <p className="text-sm font-bold text-blue-600 mb-1 truncate">
                                    {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
                                </p>
                            )}

                        </div>
                    </div>

                    {/* DESKTOP: Layout compacto */}
                    <div className="hidden lg:flex flex-row lg:gap-4 2xl:gap-6 items-start w-full">
                        {/* LOGO */}
                        <div
                            className={`lg:-mt-14 2xl:-mt-16 lg:ml-4 2xl:ml-0 shrink-0 lg:w-24 lg:h-24 2xl:w-32 2xl:h-32 rounded-xl overflow-hidden border-4 border-white bg-white shadow-lg ${negocio.logoUrl ? 'cursor-pointer' : ''}`} onClick={() => negocio.logoUrl && abrirImagenUnica(negocio.logoUrl)}
                        >
                            {negocio.logoUrl ? (
                                <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="lg:text-3xl 2xl:text-4xl font-bold text-white">{negocio.negocioNombre.charAt(0).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        {/* CONTENIDO PRINCIPAL */}
                        <div className="flex-1 min-w-0 w-full lg:mt-1 2xl:mt-0">
                            {/* FILA 1: Nombre + (Métricas + Badges) */}
                            <div className="flex items-start justify-between gap-4 w-full">
                                {/* IZQUIERDA: Nombre, Sucursal, Descripción */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h1 className="lg:text-2xl 2xl:text-4xl font-bold text-slate-900 truncate">{negocio.negocioNombre}</h1>
                                        {negocio.aceptaCardya && (
                                            <Tooltip text="Acepta CardYA" position="bottom">
                                                <div className="cursor-pointer shrink-0">
                                                    <CreditCard className="lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-amber-500 animate-bounce" style={{ animationDuration: '2s' }} />
                                                </div>
                                            </Tooltip>
                                        )}
                                    </div>

                                    {/* Sucursal */}
                                    {negocio.totalSucursales > 1 && (
                                        <p className="lg:text-base 2xl:text-lg font-semibold text-blue-600 mt-1">
                                            {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
                                        </p>
                                    )}

                                    {/* Descripción */}
                                    {negocio.negocioDescripcion && (
                                        <p className="text-slate-600 font-medium lg:text-base 2xl:text-lg mt-1">{negocio.negocioDescripcion}</p>
                                    )}
                                </div>

                                {/* DERECHA: Métricas + Badges en columna */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    {/* MÉTRICAS */}
                                    <div className="flex items-center bg-slate-50 rounded-xl lg:px-2 lg:py-1.5 2xl:px-4 2xl:py-2">
                                        <div className="flex items-center lg:gap-1 2xl:gap-2 lg:pr-2 2xl:pr-4">
                                            <Heart className="lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-red-500 fill-current animate-bounce" style={{ animationDuration: '2s' }} />
                                            <span className="lg:text-sm 2xl:text-lg font-semibold text-slate-700">{totalLikes ?? 0} likes</span>
                                        </div>
                                        <div className="lg:h-5 2xl:h-7 w-0.5 bg-slate-300 rounded-full" />
                                        <div className="flex items-center lg:gap-1 2xl:gap-2 lg:px-2 2xl:px-4">
                                            <Eye className="lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-slate-500 animate-bounce" style={{ animationDuration: '2.5s' }} />
                                            <span className="lg:text-sm 2xl:text-lg font-semibold text-slate-700">{totalVisitas ?? 0} visitas</span>
                                        </div>
                                        <div className="lg:h-5 2xl:h-7 w-0.5 bg-slate-300 rounded-full" />
                                        <button
                                            onClick={async () => {
                                                if (!sucursalId) return;
                                                try {
                                                    const res = await api.get(`/resenas/puede-resenar/${sucursalId}`);
                                                    setPuedeResenar(res.data.data?.puedeResenar || false);
                                                } catch {
                                                    setPuedeResenar(false);
                                                }
                                                // Abrir modal de reseñas (sin destacar ninguna)
                                                setResenaDeepLinkId('abrir');
                                            }} className="flex items-center lg:gap-1 2xl:gap-2 lg:px-2 2xl:px-4 cursor-pointer hover:opacity-80"
                                        >
                                            <Star className={`lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 animate-bounce ${tieneCalificacion ? 'text-yellow-500 fill-current' : 'text-yellow-400'}`} style={{ animationDuration: '3s' }} />
                                            <span className="lg:text-sm 2xl:text-lg font-semibold text-slate-700">
                                                {tieneCalificacion ? `${promedioResenas.toFixed(1)} (${negocio?.totalCalificaciones ?? 0})` : '0'}
                                            </span>
                                        </button>
                                        {distanciaKm !== null && (
                                            <>
                                                <div className="lg:h-5 2xl:h-7 w-0.5 bg-slate-300 rounded-full" />
                                                <div className="flex items-center lg:gap-1 2xl:gap-2 lg:pl-2 2xl:pl-4">
                                                    <Navigation className="lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-blue-500 animate-pulse" style={{ animationDuration: '2s' }} />
                                                    <span className="lg:text-sm 2xl:text-lg font-semibold text-blue-600">
                                                        {distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)} m` : `${distanciaKm.toFixed(1)} km`}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* BADGES - Uno debajo del otro */}
                                    {(negocio.tieneEnvioDomicilio || negocio.tieneServicioDomicilio) && (
                                        <div className="flex flex-col gap-1 lg:gap-1 2xl:gap-1.5 lg:items-start 2xl:items-end">
                                            {negocio.tieneEnvioDomicilio && (
                                                <div className="flex items-center gap-1.5 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-full" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
                                                    <Truck className="lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
                                                    <span className="lg:text-[11px] 2xl:text-sm font-semibold text-white">Envíos</span>
                                                </div>
                                            )}
                                            {negocio.tieneServicioDomicilio && (
                                                <div className="flex items-center gap-1.5 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-full" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
                                                    <Home className="lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
                                                    <span className="lg:text-[11px] 2xl:text-sm font-semibold text-white">Servicio a Domicilio</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================
                    UBICACIÓN + HORARIO (encima del grid para alinear secciones)
                ================================================================ */}
            {/* Wrapper para bajar todo junto en laptop */}
            <div className="lg:mt-12 2xl:mt-0">
                {!seccionExpandida && (
                    <div className="mt-4 lg:mt-2 2xl:mt-4">
                        {/* MÓVIL: Iconos contacto + Horario */}
                        <div className="flex flex-col items-center gap-4 lg:hidden">
                            {/* Fila de iconos: Phone + WhatsApp + ChatYA + Ubicación */}
                            <div className="flex items-center justify-center gap-3">
                                {negocio.telefono && (
                                    <a
                                        href={`tel:${negocio.telefono.replace(/\s+/g, '')}`}
                                        className="w-11 h-11 bg-slate-500 rounded-full flex items-center justify-center shadow-md cursor-pointer"
                                    >
                                        <Phone className="w-5 h-5 text-white" />
                                    </a>
                                )}
                                {negocio.whatsapp && (
                                    <a href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                        <img src="/whatsapp.webp" alt="WhatsApp" className="w-11 h-11" />
                                    </a>
                                )}
                                <button onClick={handleChatYA} className="cursor-pointer">
                                    <img src="/ChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                                </button>
                                <button
                                    onClick={() => setModalMapaAbierto(true)}
                                    className="w-11 h-11 rounded-full flex items-center justify-center shadow-md cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}
                                >
                                    <MapPin className="w-6 h-6 text-white animate-pulse" style={{ animationDuration: '2s' }} />
                                </button>
                            </div>

                            {/* Horario pill */}
                            <div className="flex justify-center">
                            {negocio.horarios && negocio.horarios.length > 0 && (() => {
                                const infoHorario = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                                const { estado, proximaApertura, proximoCierre } = infoHorario;
                                const config = {
                                    abierto: {
                                        bg: 'bg-linear-to-r from-green-500 to-emerald-600',
                                        icon: <Clock className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '8s' }} />,
                                        texto: 'Abierto',
                                        subtexto: `Cierra ${formatearHora(proximoCierre || '')}`,
                                    },
                                    cerrado: {
                                        bg: 'bg-linear-to-r from-rose-500 to-red-600',
                                        icon: <Clock className="w-4 h-4 text-white" />,
                                        texto: 'Cerrado',
                                        subtexto: `Abre ${formatearHora(proximaApertura || '')}`,
                                    },
                                    cerrado_hoy: {
                                        bg: 'bg-linear-to-r from-rose-500 to-red-600',
                                        icon: <Clock className="w-4 h-4 text-white" />,
                                        texto: 'Cerrado hoy',
                                        subtexto: '',
                                    },
                                    comida: {
                                        bg: 'bg-linear-to-r from-amber-400 to-orange-500',
                                        icon: <UtensilsCrossed className="w-4 h-4 text-white" />,
                                        texto: 'Horario de comida',
                                        subtexto: `Regresa ${formatearHora(proximaApertura || '')}`,
                                    }
                                };
                                const { bg, icon, texto, subtexto } = config[estado];
                                return (
                                    <button
                                        onClick={() => setModalHorariosAbierto(true)}
                                        className={`flex items-center gap-1.5 px-4 py-2 ${bg} rounded-full shadow-md cursor-pointer`}
                                    >
                                        {icon}
                                        <span className="text-white font-bold text-sm">{texto}</span>
                                        {subtexto && (
                                            <>
                                                <span className="text-white/70 text-sm font-semibold">·</span>
                                                <span className="text-white/90 text-sm font-semibold">{subtexto}</span>
                                            </>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-white/80" />
                                    </button>
                                );
                            })()}
                            </div>
                        </div>

                        {/* DESKTOP: Solo ubicación (horario va en sidebar) */}
                        <div className="hidden lg:flex items-center gap-2 lg:ml-4 2xl:ml-0 lg:mb-4 2xl:mb-0">
                            <MapPin className="lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-slate-400 shrink-0" />
                            <p className="text-slate-800 lg:text-sm 2xl:text-lg font-semibold">
                                {negocio.direccion}, {negocio.ciudad}
                            </p>
                        </div>
                    </div>
                )}

                {/* ================================================================
                    LAYOUT 2 COLUMNAS
                ================================================================ */}
                {/* Línea separadora antes de contenido - Solo móvil */}
                <div className="w-3/4 mx-auto h-0.5 bg-linear-to-r from-transparent via-slate-300 to-transparent my-5 lg:hidden" />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_320px] lg:gap-4 2xl:gap-8 lg:mt-0 2xl:mt-4">

                    {/* ============ COLUMNA PRINCIPAL ============ */}
                    <div className="space-y-6">

                        {/* ============ PROMOCIONES Y OFERTAS ============ */} 
                        {!seccionExpandida && tieneOfertas && (
                            <div className="px-5 lg:px-0">
                                <SeccionOfertas
                                    ofertas={ofertas}
                                    whatsapp={negocio?.whatsapp}
                                    negocioNombre={negocio?.negocioNombre}
                                    negocioUsuarioId={negocio?.usuarioId}
                                />
                            </div>
                        )}

                        {/* ============ CATÁLOGO ============ */}
                        {catalogo.length > 0 && !seccionExpandida && (
                            <div className="px-5 lg:px-0">
                                <SeccionCatalogo
                                    catalogo={catalogo}
                                    whatsapp={negocio?.whatsapp}
                                    negocioUsuarioId={negocio?.usuarioId}
                                    sucursalId={sucursalId}
                                    negocioNombre={negocio?.negocioNombre}
                                />
                            </div>
                        )}
                        {/* ============ GALERÍA ============ */}
                        {!seccionExpandida && galeriaImagenes.length > 0 && (
                            <div className="px-5 lg:px-0">
                                {/* Header — mismo estilo que Ofertas y Catálogo */}
                                <button
                                    onClick={() => setModalGaleriaAbierto(true)}
                                    className="w-full flex items-center justify-between mb-4 lg:mb-3 2xl:mb-4 bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 hover:from-slate-700 hover:via-slate-600 hover:to-slate-500 text-white px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-xl cursor-pointer"
                                >
                                    <h2 className="flex items-center gap-2 text-lg lg:text-base 2xl:text-lg font-semibold">
                                        <ImageIcon className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Galería</span>
                                        <span className="text-sm font-medium text-white/70">({galeriaImagenes.length})</span>
                                    </h2>
                                    {/* Móvil: "Ver todas" + flecha | Desktop: solo flecha */}
                                    <div className="lg:hidden flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                                        <span className="text-sm font-medium">Ver todas</span>
                                        <ChevronRight className="h-5 w-5 animate-bounceX" />
                                    </div>
                                    <div className="hidden lg:flex h-7 w-7 2xl:h-8 2xl:w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
                                        <ChevronRight className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                                    </div>
                                </button>

                                {/* Mobile: scroll horizontal (max 10) | Desktop: grid (max 4) */}
                                <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 lg:grid lg:grid-cols-3 2xl:grid-cols-4 lg:gap-3 lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {(() => {
                                        const limitDesktop = window.innerWidth >= 1536 ? 4 : 3;
                                        const limit = window.innerWidth < 1024 ? 10 : limitDesktop;
                                        return galeriaImagenes.slice(0, limit).map((imagen, index) => {
                                        const esUltimaDesktop = window.innerWidth >= 1024 && index === limit - 1 && galeriaImagenes.length > limit;
                                        return (
                                            <div
                                                key={`galeria-${index}-${imagen.id}`}
                                                className="shrink-0 w-[60%] h-40 lg:w-auto lg:h-40 2xl:h-[190px] relative rounded-xl overflow-hidden bg-slate-200 cursor-pointer group"
                                                onClick={() => esUltimaDesktop ? setModalGaleriaAbierto(true) : abrirGaleria(index)}
                                            >
                                                <img
                                                    src={imagen.url}
                                                    alt={imagen.titulo || 'Imagen'}
                                                    loading="lazy"
                                                    className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${esUltimaDesktop ? 'brightness-50' : ''}`}
                                                />
                                                {esUltimaDesktop && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-3xl font-bold text-white">+{galeriaImagenes.length - limit}</span>
                                                        <span className="text-sm font-semibold text-white/80">Ver todas</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                    })()}
                                    {/* Botón "Ver todas" al final — solo mobile scroll */}
                                    {window.innerWidth < 1024 && galeriaImagenes.length > 10 && (
                                        <div
                                            className="shrink-0 w-[60%] relative aspect-4/3 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95"
                                            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                                            onClick={() => setModalGaleriaAbierto(true)}
                                        >
                                            <span className="text-2xl font-bold text-white">+{galeriaImagenes.length - 10}</span>
                                            <span className="text-sm font-semibold text-white/70">Ver todas</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ============ SIDEBAR CONTACTO (SIN STICKY) ============ */}
                    <div className="px-5 lg:px-0 mt-6 lg:mt-0">
                        <div className="bg-white rounded-xl shadow-md border-2 border-slate-300 p-6 lg:p-4 2xl:p-6">

                            {/* HORARIO - Solo desktop */}
                            <div className="hidden lg:block mb-4">
                                {negocio.horarios && negocio.horarios.length > 0 && (() => {
                                    const infoHorario = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                                    const { estado, proximaApertura, proximoCierre } = infoHorario;

                                    const config = {
                                        abierto: {
                                            bg: 'bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
                                            icon: <Clock className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />,
                                            texto: 'Abierto',
                                            subtexto: `Cierra ${formatearHora(proximoCierre || '')}`,
                                        },
                                        cerrado: {
                                            bg: 'bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
                                            icon: <Clock className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />,
                                            texto: 'Cerrado',
                                            subtexto: `Abre ${formatearHora(proximaApertura || '')}`,
                                        },
                                        cerrado_hoy: {
                                            bg: 'bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
                                            icon: <Clock className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />,
                                            texto: 'Cerrado hoy',
                                            subtexto: proximaApertura ? `Abre ${formatearHora(proximaApertura)}` : '',
                                        },
                                        comida: {
                                            bg: 'bg-linear-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600',
                                            icon: <UtensilsCrossed className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />,
                                            texto: 'Horario de comida',
                                            subtexto: `Regresa ${formatearHora(proximaApertura || '')}`,
                                        }
                                    };

                                    const { bg, icon, texto, subtexto } = config[estado];

                                    return (
                                        <button
                                            onClick={() => setModalHorariosAbierto(true)}
                                            className={`w-full flex items-center lg:gap-2 2xl:gap-3 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 ${bg} lg:rounded-lg 2xl:rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer`}
                                        >
                                            {/* Círculo con icono */}
                                            <div className="lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                                {icon}
                                            </div>
                                            {/* Texto centrado */}
                                            <div className="flex-1 flex flex-col items-center">
                                                <span className="text-white font-bold lg:text-[11px] 2xl:text-base">{texto}</span>
                                                {subtexto && (
                                                    <span className="text-white/90 lg:text-[11px] 2xl:text-sm font-medium">{subtexto}</span>
                                                )}
                                            </div>
                                            <ChevronDown className="lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/80 shrink-0" />
                                        </button>
                                    );
                                })()}
                            </div>

                            {/* UBICACIÓN - Solo desktop */}
                            <div className="hidden lg:block">
                                <h4 className="flex items-center gap-2 lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider lg:mb-3 2xl:mb-3">
                                    <MapPin className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    <span>Ubicación</span>
                                </h4>

                                {/* MAPA LEAFLET */}
                                {negocio.latitud && negocio.longitud ? (
                                    <div className="w-full h-80 2xl:h-72 rounded-xl overflow-hidden mb-5 2xl:mb-4 relative z-0">
                                        <MapContainer
                                            center={[negocio.latitud, negocio.longitud]}
                                            zoom={16}
                                            scrollWheelZoom={false}
                                            className="w-full h-full"
                                        >
                                            <TileLayer
                                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                keepBuffer={5}
                                                updateWhenZooming={false}
                                                updateWhenIdle={true}
                                            />
                                            <Marker position={[negocio.latitud, negocio.longitud]}>
                                                <Popup className="popup-sidebar" autoPan={true} autoPanPadding={[40, 40]}>
                                                    <div>
                                                        {/* Header oscuro compacto */}
                                                        <div className="relative px-3 py-2 overflow-hidden" style={{ background: '#000000' }}>
                                                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)' }} />
                                                            <div className="relative z-10 flex items-center gap-2">
                                                                {negocio.logoUrl ? (
                                                                    <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-white/20" />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                                                        <span className="text-white font-bold text-sm">{negocio.negocioNombre.charAt(0)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <h3 className="text-sm font-bold text-white leading-tight truncate">{negocio.negocioNombre}</h3>
                                                                    {negocio.totalSucursales > 1 && (
                                                                        <p className="text-[11px] font-medium text-white/70 truncate mt-0.5">
                                                                            {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Body compacto */}
                                                        <div className="px-3 py-2.5">
                                                            <div className="flex items-center justify-center gap-2 pb-2 text-[12px]">
                                                                {negocio.horarios?.length > 0 && (() => {
                                                                    const info = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                                                                    const abierto = info.estado === 'abierto';
                                                                    return (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: abierto ? '#22c55e' : '#ef4444' }} />
                                                                            <span className={`font-bold ${abierto ? 'text-green-600' : 'text-red-500'}`}>{abierto ? 'Abierto' : 'Cerrado'}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {tieneCalificacion && (
                                                                    <>
                                                                        <div className="w-px h-3 bg-slate-400" />
                                                                        <div className="flex items-center gap-1">
                                                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                                            <span className="font-bold text-slate-800">{promedioResenas.toFixed(1)}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {distanciaKm !== null && (
                                                                    <>
                                                                        <div className="w-px h-3 bg-slate-400" />
                                                                        <div className="flex items-center gap-1 text-slate-600">
                                                                            <MapPin className="w-3 h-3" />
                                                                            <span className="font-bold">{distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)} m` : `${distanciaKm.toFixed(1)} km`}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <p className="text-[12px] font-semibold text-slate-600 leading-tight truncate border-t border-slate-300 pt-2">{negocio.direccion}</p>

                                                            <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-slate-300">
                                                                <button onClick={(e) => { e.stopPropagation(); handleChatYA(); }} className="cursor-pointer hover:scale-110">
                                                                    <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-8 w-auto" />
                                                                </button>
                                                                {negocio.whatsapp && (
                                                                    <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp!.replace(/\D/g, '')}`, '_blank'); }} className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:scale-110 p-1">
                                                                        <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    </div>
                                ) : (
                                    <div className="w-full h-80 2xl:h-72 bg-slate-200 rounded-xl flex items-center justify-center mb-5 2xl:mb-4">
                                        <MapPin className="w-12 h-12 text-slate-400" />
                                    </div>
                                )}

                                {/* BOTONES DE MAPA */}
                                <div className="flex gap-2 mb-5 2xl:mb-4">
                                    <button
                                        onClick={handleDirecciones}
                                        className="flex-1 flex items-center justify-center gap-2 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 text-white font-semibold lg:text-sm 2xl:text-base rounded-xl shadow-md cursor-pointer active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                                    >
                                        <Navigation className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Cómo llegar</span>
                                    </button>
                                    <button
                                        onClick={() => setModalMapaAbierto(true)}
                                        className="shrink-0 flex items-center justify-center gap-2 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 bg-slate-200 text-slate-700 font-semibold lg:text-sm 2xl:text-base rounded-xl border-2 border-slate-300 cursor-pointer"
                                        title="Ver mapa completo"
                                    >
                                        <Maximize2 className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    </button>
                                </div>

                                {/* SEPARADOR */}
                                <div className="my-5 2xl:my-4 h-px bg-slate-300" />

                                {/* CONTACTO */}
                                <h4 className="flex items-center gap-2 lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider lg:mb-3 2xl:mb-3">
                                    <Send className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    <span>Contacto</span>
                                </h4>

                                {/* TELÉFONO */}
                                {negocio.telefono && (
                                    <a
                                        href={`tel:${negocio.telefono.replace(/\s+/g, '')}`}
                                        className="flex items-center gap-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2 lg:mb-2 2xl:mb-2 bg-slate-200 border-2 border-slate-300 rounded-lg cursor-pointer group"
                                    >
                                        <Phone className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                        <span className="lg:text-sm 2xl:text-base font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                                            {negocio.telefono}
                                        </span>
                                    </a>
                                )}

                                {/* CORREO */}
                                {negocio.correo && (
                                    <a
                                        href={`mailto:${negocio.correo}`}
                                        className="flex items-center gap-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2 lg:mb-3 2xl:mb-3 bg-slate-200 border-2 border-slate-300 rounded-lg cursor-pointer group"
                                    >
                                        <Mail className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                        <span className="lg:text-sm 2xl:text-base font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                                            {negocio.correo}
                                        </span>
                                    </a>
                                )}

                                <div className="flex lg:gap-3 2xl:gap-4 items-center">
                                    {negocio.whatsapp && (
                                        <Tooltip text="WhatsApp" position="top">
                                            <button
                                                onClick={handleWhatsApp}
                                                className="hover:scale-110 transition-transform cursor-pointer"
                                            >
                                                <img
                                                    src="/whatsapp.webp"
                                                    alt="WhatsApp"
                                                    className="lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain"
                                                />
                                            </button>
                                        </Tooltip>
                                    )}
                                    <Tooltip text="ChatYA" position="top">
                                        <button
                                            onClick={handleChatYA}
                                            className="lg:h-8 2xl:h-10 hover:scale-110 transition-transform flex items-center cursor-pointer"
                                        >
                                            <img
                                                src="/ChatYA.webp"
                                                alt="ChatYA"
                                                className="lg:h-8 2xl:h-10 w-auto object-contain"
                                            />
                                        </button>
                                    </Tooltip>
                                </div>

                                {/* SEPARADOR */}
                                <div className="my-5 2xl:my-4 h-px bg-slate-300" />
                            </div>

                            {/* REDES SOCIALES - Sin correo */}
                            {(negocio.sitioWeb || negocio.redesSociales?.facebook || negocio.redesSociales?.instagram || negocio.redesSociales?.twitter || negocio.redesSociales?.tiktok) && (
                                <>
                                    <h4 className="flex items-center gap-2 text-base lg:text-xs 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 lg:mb-3 2xl:mb-3">
                                        <Link2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Visítanos en:</span>
                                    </h4>
                                    <div className="flex items-center gap-3 lg:gap-3 2xl:gap-4">
                                        {/* Sitio Web */}
                                        {negocio.sitioWeb && (
                                            <Tooltip text="Sitio Web" position="top">
                                                <a href={negocio.sitioWeb} target="_blank" rel="noopener noreferrer" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full bg-slate-700 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                                                    <svg className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                </a>
                                            </Tooltip>
                                        )}
                                        {/* Facebook */}
                                        {negocio.redesSociales?.facebook && (
                                            <Tooltip text="Facebook" position="top">
                                                <a href={negocio.redesSociales.facebook} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/facebook.webp" alt="Facebook" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                            </Tooltip>
                                        )}
                                        {/* Instagram */}
                                        {negocio.redesSociales?.instagram && (
                                            <Tooltip text="Instagram" position="top">
                                                <a href={negocio.redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/instagram.webp" alt="Instagram" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                            </Tooltip>
                                        )}
                                        {/* X (Twitter) */}
                                        {negocio.redesSociales?.twitter && (
                                            <Tooltip text="X" position="top">
                                                <a href={negocio.redesSociales.twitter} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/twitter.webp" alt="X" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                            </Tooltip>
                                        )}
                                        {/* TikTok */}
                                        {negocio.redesSociales?.tiktok && (
                                            <Tooltip text="TikTok" position="top">
                                                <a href={negocio.redesSociales.tiktok} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/tiktok.webp" alt="TikTok" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                            </Tooltip>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* SEPARADOR */}
                            <div className="my-5 2xl:my-4 h-px bg-slate-300" />

                            {/* MÉTODOS DE PAGO */}
                            {negocio.metodosPago && negocio.metodosPago.length > 0 && (
                                <div>
                                    <h4 className="flex items-center gap-2 text-base lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 lg:mb-3 2xl:mb-3">
                                        <CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Métodos de Pago</span>
                                    </h4>
                                    <div className="flex flex-wrap lg:flex-col gap-2">
                                        {agruparMetodosPago(negocio.metodosPago).map((tipo) => {
                                            let bgColor = 'bg-slate-200';
                                            let textColor = 'text-slate-700';
                                            if (tipo.toLowerCase().includes('efectivo')) { bgColor = 'bg-green-100'; textColor = 'text-green-700'; }
                                            else if (tipo.toLowerCase().includes('tarjeta')) { bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; }
                                            else if (tipo.toLowerCase().includes('transfer')) { bgColor = 'bg-purple-100'; textColor = 'text-purple-700'; }

                                            return (
                                                <span key={tipo} className={`px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 ${bgColor} ${textColor} rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold`}>
                                                    {nombreMetodoPago(tipo)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SERVICIOS A DOMICILIO — Solo móvil */}
                            {(negocio.tieneEnvioDomicilio || negocio.tieneServicioDomicilio) && (
                                <>
                                    <div className="my-5 2xl:my-4 h-px bg-slate-300 lg:hidden" />
                                    <div className="lg:hidden">
                                        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-600 uppercase tracking-wider mb-3">
                                            <Truck className="w-5 h-5" />
                                            <span>Servicios</span>
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {negocio.tieneEnvioDomicilio && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
                                                    <Truck className="w-4 h-4 text-white" />
                                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white">Envíos</span>
                                                </div>
                                            )}
                                            {negocio.tieneServicioDomicilio && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
                                                    <Home className="w-4 h-4 text-white" />
                                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white">A Domicilio</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============ RESEÑAS - ANCHO COMPLETO ============ */}
                {!seccionExpandida && (
                    <div className="px-5 lg:px-4 2xl:px-0 mt-6 lg:mt-4 2xl:mt-6 ">
                        <SeccionResenas
                            resenas={resenasData}
                            promedioRating={promedioResenas}
                            tieneCompraVerificada={puedeResenar}
                            onEscribirResena={async () => {
                                if (!sucursalId) return;
                                try {
                                    const res = await api.get(`/resenas/puede-resenar/${sucursalId}`);
                                    setPuedeResenar(res.data.data?.puedeResenar || false);
                                } catch {
                                    setPuedeResenar(false);
                                }
                            }}
                            onEnviarResena={async (rating, texto) => {
                                try {
                                    const res = await api.post('/resenas', {
                                        sucursalId,
                                        rating,
                                        texto: texto || undefined,
                                    });
                                    if (res.data.success) {
                                        qc.invalidateQueries({ queryKey: ['negocios', 'resenas', sucursalId] });
                                        // Actualizar rating promedio y total calificaciones en el header
                                        qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(sucursalId!) });
                                    }
                                } catch (error: unknown) {
                                    const axiosError = error as { response?: { data?: { message?: string } } };
                                    console.error('Error al enviar reseña:', axiosError.response?.data?.message);
                                }
                            }}
                            onEditarResena={async (resenaId, rating, texto) => {
                                try {
                                    const res = await api.put(`/resenas/${resenaId}`, {
                                        rating,
                                        texto: texto || undefined,
                                    });
                                    if (res.data.success) {
                                        qc.invalidateQueries({ queryKey: ['negocios', 'resenas', sucursalId] });
                                        // Actualizar rating promedio y total calificaciones en el header
                                        qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(sucursalId!) });
                                    }
                                } catch (error: unknown) {
                                    const axiosError = error as { response?: { data?: { message?: string } } };
                                    console.error('Error al editar reseña:', axiosError.response?.data?.message);
                                }
                            }}
                            resenaDestacadaId={resenaDeepLinkId}
                            onResenaDestacadaVista={() => setResenaDeepLinkId(null)}
                        />
                    </div>
                )}
            </div> {/* Cierre wrapper laptop */}

            {/* MODAL MAPA EXPANDIDO */}
            {modalMapaAbierto && negocio.latitud && negocio.longitud && (
                esMobileGaleria ? (
                    /* MOBILE: ModalBottom */
                    <ModalBottom
                        abierto={modalMapaAbierto}
                        onCerrar={() => setModalMapaAbierto(false)}
                        titulo="Ubicación"
                        iconoTitulo={<MapPin className="w-5 h-5 text-white" />}
                        mostrarHeader={false}
                        headerOscuro
                        sinScrollInterno={true}
                        alturaMaxima="xl"
                        className="h-[90vh]!"
                    >
                        {/* Header */}
                        <div
                            className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                        >
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {negocio.logoUrl ? (
                                        <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center">
                                            <span className="text-white font-bold">{negocio.negocioNombre.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{negocio.negocioNombre}</h3>
                                        <p className="text-white/60 text-sm font-medium truncate max-w-[200px]">{negocio.direccion}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${negocio.latitud},${negocio.longitud}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="px-3 py-2 bg-white text-slate-800 font-bold text-sm rounded-xl shadow-md cursor-pointer active:scale-95"
                                >
                                    <Navigation className="w-4 h-4 inline mr-1" />
                                    Ir
                                </button>
                            </div>
                        </div>
                        {/* Estilos popup dentro del ModalBottom */}
                        <style>{`
                            .popup-negocio .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 16px !important; overflow: hidden !important; border: 2px solid #94a3b8 !important; box-shadow: 0 4px 24px rgba(0,0,0,0.12) !important; }
                            .popup-negocio .leaflet-popup-content { margin: 0 !important; min-width: 240px !important; max-width: 270px !important; }
                            .popup-negocio .leaflet-popup-close-button { top: 8px !important; right: 8px !important; width: 30px !important; height: 30px !important; font-size: 20px !important; font-weight: 700 !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.15) !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; line-height: 0 !important; padding: 0 0 1px 0 !important; cursor: pointer !important; z-index: 9999 !important; position: absolute !important; }
                            .popup-negocio .leaflet-popup-close-button:hover { color: #fff !important; background: rgba(255,255,255,0.3) !important; }
                            .popup-negocio p { margin: 0 !important; }
                        `}</style>
                        {/* Mapa */}
                        <div className="flex-1 min-h-0 relative overflow-visible">
                            <MapContainer
                                center={[negocio.latitud, negocio.longitud]}
                                zoom={16}
                                scrollWheelZoom={true}
                                zoomControl={false}
                                className="w-full h-full"
                            >
                                <TileLayer
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[negocio.latitud, negocio.longitud]}>
                                    <Popup className="popup-negocio" autoPan={true} autoPanPadding={[70, 70]}>
                                        <div>
                                            <div className="relative px-4 py-3 overflow-hidden" style={{ background: '#000000' }}>
                                                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)' }} />
                                                <div className="relative z-10 flex items-center gap-3">
                                                    {negocio.logoUrl ? (
                                                        <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white/20" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                                            <span className="text-white font-bold text-base">{negocio.negocioNombre.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-[17px] font-bold text-white leading-tight truncate">{negocio.negocioNombre}</h3>
                                                        {negocio.totalSucursales > 1 && (
                                                            <p className="text-sm font-medium text-white/70 truncate mt-0.5">
                                                                {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-3 pb-3 text-[14px]">
                                                    {negocio.horarios?.length > 0 && (() => {
                                                        const info = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                                                        const abierto = info.estado === 'abierto';
                                                        return (
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full" style={{ background: abierto ? '#22c55e' : '#ef4444' }} />
                                                                <span className={`font-bold ${abierto ? 'text-green-600' : 'text-red-500'}`}>{abierto ? 'Abierto' : 'Cerrado'}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                    {negocio.totalCalificaciones > 0 && (
                                                        <>
                                                            <div className="w-px h-4 bg-slate-400" />
                                                            <div className="flex items-center gap-1.5">
                                                                <Star className="w-4.5 h-4.5 text-amber-400 fill-amber-400" />
                                                                <span className="font-bold text-slate-800">{promedioResenas.toFixed(1)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    {distanciaKm !== null && (
                                                        <>
                                                            <div className="w-px h-4 bg-slate-400" />
                                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                                <MapPin className="w-4 h-4" />
                                                                <span className="font-bold">{distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)} m` : `${distanciaKm.toFixed(1)} km`}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 pt-1 pb-1 border-t border-slate-300">
                                                    <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                                    <p className="text-[14px] font-bold text-slate-500 leading-snug line-clamp-2 pt-0.5">{negocio.direccion}</p>
                                                </div>
                                                <div className="h-px bg-slate-300 my-3" />
                                                <div className="flex items-center justify-center gap-4">
                                                    <button onClick={(e) => { e.stopPropagation(); handleChatYA(); }} className="cursor-pointer hover:scale-110">
                                                        <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                                                    </button>
                                                    {negocio.whatsapp && (
                                                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp!.replace(/\D/g, '')}`, '_blank'); }} className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:scale-110 p-1.5">
                                                            <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                                {userLat && userLng && (
                                    <Marker position={[userLat, userLng]}>
                                        <Popup><p className="font-semibold text-center">Tu ubicación</p></Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        </div>
                    </ModalBottom>
                ) : (
                    /* DESKTOP: Modal existente */
                    <ModalMapa
                        negocio={{
                            negocioNombre: negocio.negocioNombre,
                            sucursalNombre: negocio.sucursalNombre,
                            totalSucursales: negocio.totalSucursales,
                            esPrincipal: negocio.esPrincipal,
                            logoUrl: negocio.logoUrl,
                            whatsapp: negocio.whatsapp,
                            direccion: negocio.direccion,
                            latitud: negocio.latitud,
                            longitud: negocio.longitud,
                            estaAbierto: negocio.horarios?.length > 0 ? calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria).estado === 'abierto' : null,
                            calificacion: promedioResenas,
                            totalCalificaciones: negocio?.totalCalificaciones ?? 0,
                            distanciaKm,
                        }}
                        userLat={userLat}
                        userLng={userLng}
                        onClose={() => setModalMapaAbierto(false)}
                        onChat={handleChatYA}
                    />
                )
            )}

            {/* MODAL AUTH REQUERIDO */}
            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                accion={accionAuthRequerida}
                urlRetorno={`/negocios/${sucursalId}`}
            />

            {/* MODAL OFERTA - Abierta desde notificación (deep link) */}
            {ofertaDeepLink && (
                <ModalOfertaDetalle
                    oferta={ofertaDeepLink}
                    whatsapp={negocio?.whatsapp}
                    negocioNombre={negocio?.negocioNombre}
                    onClose={() => setOfertaDeepLink(null)}
                />
            )}

            {/* Modal Galería */}
            {modalGaleriaAbierto && galeriaImagenes.length > 0 && (
                esMobileGaleria ? (
                    <ModalBottom
                        abierto={modalGaleriaAbierto}
                        onCerrar={() => setModalGaleriaAbierto(false)}
                        titulo="Galería"
                        iconoTitulo={<ImageIcon className="w-5 h-5 text-white" />}
                        mostrarHeader={false}
                        headerOscuro
                        sinScrollInterno={true}
                        alturaMaxima="lg"
                        className="h-[80vh]!"
                    >
                        {/* Header con gradiente slate */}
                        <div
                            className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                        >
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                            <div className="relative flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-4.5 h-4.5 text-white" />
                                </div>
                                <h3 className="text-white font-bold text-lg">Galería ({galeriaImagenes.length})</h3>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 p-3">
                            <div className="grid grid-cols-2 gap-3">
                                {galeriaImagenes.map((imagen, index) => (
                                    <div
                                        key={`modal-galeria-${imagen.id}`}
                                        className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-200 cursor-pointer"
                                        onClick={() => abrirGaleria(index)}
                                    >
                                        <img src={imagen.url} alt={imagen.titulo || 'Imagen'} loading="lazy" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ModalBottom>
                ) : (
                    <Modal
                        abierto={modalGaleriaAbierto}
                        onCerrar={() => setModalGaleriaAbierto(false)}
                        mostrarHeader={false}
                        ancho="lg"
                        paddingContenido="none"
                        className="flex flex-col h-[80vh]!"
                    >
                        {/* Header con gradiente slate */}
                        <div
                            className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                        >
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2 2xl:gap-3">
                                    <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                        <ImageIcon className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
                                    </div>
                                    <h3 className="text-white font-bold text-base 2xl:text-lg">Galería ({galeriaImagenes.length})</h3>
                                </div>
                                <button onClick={() => setModalGaleriaAbierto(false)} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 p-3 2xl:p-4">
                            <div className="grid grid-cols-2 gap-3">
                                {galeriaImagenes.map((imagen, index) => (
                                    <div
                                        key={`modal-galeria-${imagen.id}`}
                                        className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-200 cursor-pointer"
                                        onClick={() => abrirGaleria(index)}
                                    >
                                        <img src={imagen.url} alt={imagen.titulo || 'Imagen'} loading="lazy" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Modal>
                )
            )}

            {/* Estilos CSS para popups del mapa */}
            <style>{`
                .popup-sidebar .leaflet-popup-content-wrapper {
                    padding: 0;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 2px solid #94a3b8;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                }
                .popup-sidebar .leaflet-popup-content {
                    margin: 0 !important;
                    width: 220px !important;
                    min-width: 220px !important;
                    max-width: 220px !important;
                }
                .popup-sidebar .leaflet-popup-close-button {
                    top: 6px !important;
                    right: 6px !important;
                    width: 24px !important;
                    height: 24px !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    color: rgba(255,255,255,0.7) !important;
                    background: rgba(255,255,255,0.15) !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    line-height: 0 !important;
                    padding: 0 !important;
                    cursor: pointer !important;
                    z-index: 9999 !important;
                    position: absolute !important;
                }
                .popup-sidebar .leaflet-popup-close-button:hover {
                    color: #fff !important;
                    background: rgba(255,255,255,0.3) !important;
                }
                .popup-sidebar p { margin: 0 !important; }
                .popup-negocio .leaflet-popup-content-wrapper {
                    padding: 0;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 2px solid #94a3b8;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
                }
                .popup-negocio .leaflet-popup-content {
                    margin: 0;
                    min-width: 240px;
                    max-width: 270px;
                }
                .popup-negocio .leaflet-popup-tip {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.06);
                }
                .popup-negocio p {
                    margin: 0 !important;
                }
                .popup-negocio .leaflet-popup-close-button {
                    top: 8px !important;
                    right: 8px !important;
                    width: 30px !important;
                    height: 30px !important;
                    font-size: 20px !important;
                    font-weight: 700 !important;
                    color: rgba(255,255,255,0.7) !important;
                    background: rgba(255,255,255,0.15) !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    line-height: 0 !important;
                    padding: 0 0 1px 0 !important;
                    text-indent: 0 !important;
                    text-align: center !important;
                    transition: all 0.15s !important;
                    cursor: pointer !important;
                    z-index: 9999 !important;
                    pointer-events: auto !important;
                    position: absolute !important;
                }
                .popup-negocio .leaflet-popup-close-button:hover {
                    color: #fff !important;
                    background: rgba(255,255,255,0.3) !important;
                }
            `}</style>
        </div>
    );

    // Si es ruta pública, envolver con LayoutPublico (que ya maneja márgenes)
    // Si NO es ruta pública, MainLayout ya maneja el layout
    return esRutaPublica ? (
        <LayoutPublico>
            {contenidoPrincipal}
        </LayoutPublico>
    ) : (
        <>
            {contenidoPrincipal}
        </>
    );
}

export default PaginaPerfilNegocio;