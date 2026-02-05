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
    ChevronLeft,
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
import { usePerfilNegocio } from '../../../hooks/usePerfilNegocio';
import { useVotos } from '../../../hooks/useVotos';
import { api } from '../../../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ModalHorarios, formatearHora, calcularEstadoNegocio } from '../../../components/negocios/ModalHorarios';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useNegociosCacheStore } from '../../../stores/useNegociosCacheStore';
import { SeccionCatalogo, SeccionOfertas, SeccionResenas, ModalEscribirResena } from '../../../components/negocios';
import { useLockScroll } from '../../../hooks/useLockScroll';
import { DropdownCompartir, ModalAuthRequerido } from '../../../components/compartir';
import { LayoutPublico } from '../../../components/layout';
import { ModalImagenes } from '../../../components/ui';

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
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
    valor?: number | string;
    fechaFin?: string;
}

interface MetodoPago {
    tipo: string;
}

// =============================================================================
// DATOS DE EJEMPLO
// =============================================================================



// TODO: Eliminar cuando haya reseñas reales en la DB
const RESENAS_EJEMPLO: Resena[] = [
    {
        id: '1',
        rating: 5,
        texto: 'Excelente servicio, muy recomendado. La comida llegó caliente y en tiempo récord. Definitivamente volveré a pedir.',
        createdAt: '2025-01-10T14:30:00Z',
        autor: {
            id: 'u1',
            nombre: 'María García',
            avatarUrl: null,
        },
    },
    {
        id: '2',
        rating: 4,
        texto: 'Muy buenos tacos, el sabor es auténtico. Solo tardaron un poco más de lo esperado.',
        createdAt: '2025-01-08T18:45:00Z',
        autor: {
            id: 'u2',
            nombre: 'Juan Pérez',
            avatarUrl: null,
        },
    },
    {
        id: '3',
        rating: 5,
        texto: 'Los mejores tacos de la zona, sin duda. La salsa verde es increíble.',
        createdAt: '2025-01-05T12:00:00Z',
        autor: {
            id: 'u3',
            nombre: 'Ana Rodríguez',
            avatarUrl: null,
        },
    },
    {
        id: '4',
        rating: 4,
        texto: 'Buen precio y buena calidad. Recomiendo los tacos de asada.',
        createdAt: '2024-12-28T20:15:00Z',
        autor: {
            id: 'u4',
            nombre: 'Carlos López',
            avatarUrl: null,
        },
    },
    {
        id: '5',
        rating: 5,
        texto: 'Increíble atención al cliente. Pedí una orden extra y me la dieron sin costo.',
        createdAt: '2024-12-20T16:30:00Z',
        autor: {
            id: 'u5',
            nombre: 'Laura Martínez',
            avatarUrl: null,
        },
    },
];

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
        direccion: string;
        latitud: number;
        longitud: number;
    };
    userLat: number | null;
    userLng: number | null;
    onClose: () => void;
}

function ModalMapa({ negocio, userLat, userLng, onClose }: ModalMapaProps) {

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
                {/* HEADER CON GRADIENTE SUAVE */}
                <div className="bg-linear-to-r from-blue-50 to-slate-100 border-b border-slate-200">
                    <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-3 2xl:px-6 2xl:py-4">
                        {/* Info del negocio */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                <MapPin className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-red-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base lg:text-lg 2xl:text-xl font-bold text-slate-800 truncate">
                                    {negocio.negocioNombre}
                                </h3>
                                <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 truncate">
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
                                className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 2xl:px-5 2xl:py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm lg:text-sm 2xl:text-base rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                                <Navigation className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                <span className="hidden sm:inline">Cómo llegar</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 flex items-center justify-center hover:bg-white/60 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-500" />
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

                    {/* Controles de zoom personalizados - HORIZONTAL */}
                    <div className="absolute bottom-6 right-3 z-1000 flex flex-row gap-1.5">
                        <button
                            onClick={() => {
                                if (mapRef.current) {
                                    if (userLat && userLng) {
                                        // Centrar entre negocio y usuario
                                        mapRef.current.fitBounds([
                                            [negocio.latitud, negocio.longitud],
                                            [userLat, userLng]
                                        ], { padding: [50, 50] });
                                    } else {
                                        // Centrar solo en negocio
                                        mapRef.current.setView([negocio.latitud, negocio.longitud], 16);
                                    }
                                }
                            }}
                            className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 bg-white hover:bg-slate-50 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Centrar mapa"
                        >
                            <Crosshair className="w-4 h-4 lg:w-4 lg:h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) + 1)}
                            className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 bg-white hover:bg-slate-50 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Acercar"
                        >
                            <Plus className="w-4 h-4 lg:w-4 lg:h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 14) - 1)}
                            className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 bg-white hover:bg-slate-50 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Alejar"
                        >
                            <Minus className="w-4 h-4 lg:w-4 lg:h-4 text-slate-600" />
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
                        />

                        {/* Marcador del negocio */}
                        <Marker
                            position={[negocio.latitud, negocio.longitud]}
                            icon={negocioIcon}
                        >
                            <Popup>
                                <div className="text-center">
                                    <strong className="text-base">{negocio.negocioNombre}</strong>
                                    <br />
                                    <span className="text-sm text-slate-600">{negocio.direccion}</span>
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
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaPerfilNegocio() {
    const { sucursalId } = useParams<{ sucursalId: string }>();
    const navigate = useNavigate();
    const { usuario } = useAuthStore();

    // ✅ Store de caché para ofertas y catálogo
    const {
        obtenerOfertasCache,
        obtenerCatalogoCache,
        guardarOfertasCache,
        guardarCatalogoCache
    } = useNegociosCacheStore();
    const location = useLocation();

    const [totalLikes, setTotalLikes] = useState<number | undefined>(undefined);
    const [totalVisitas, setTotalVisitas] = useState<number | undefined>(undefined);
    const vistaRegistrada = useRef(false);

    const esModoPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

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

    // Modal de reseña
    const [modalResenaAbierto, setModalResenaAbierto] = useState(false);

    // Distancia del usuario
    const [distanciaKm, setDistanciaKm] = useState<number | null>(null);

    // Modal del mapa expandido
    const [modalMapaAbierto, setModalMapaAbierto] = useState(false);

    // Estado del catálogo (fetch desde backend)
    const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);

    // Estado de las reseñas (fetch desde backend)
    const [resenas, setResenas] = useState<Resena[]>([]);

    // Estado de las ofertas (fetch desde backend)
    const [ofertas, setOfertas] = useState<Oferta[]>([]);

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

    const { negocio, loading, error } = usePerfilNegocio(sucursalId, {
        onSuccess: async (negocio) => {
            setTotalLikes(negocio.totalLikes);
            setTotalVisitas(negocio.metricas?.totalViews ?? 0);

            // Solo registrar vistas si el usuario está logueado
            if (estaLogueado && !vistaRegistrada.current && !yaVistoEnSesion(negocio.sucursalId)) {
                vistaRegistrada.current = true;
                try {
                    await api.post('/metricas/view', { entityType: 'sucursal', entityId: negocio.sucursalId });
                    marcarComoVisitado(negocio.sucursalId);
                    setTotalVisitas(prev => (prev ?? 0) + 1);
                } catch (error) {
                    console.error('❌ Error al registrar vista:', error);
                }
            }
        },
    });

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

    // ✅ Fetch del catálogo - PRIMERO busca en caché
    useEffect(() => {
        if (!negocio?.negocioId || !sucursalId) return;

        // Intentar leer del caché primero
        const catalogoCacheado = obtenerCatalogoCache(sucursalId);
        if (catalogoCacheado) {
            setCatalogo(catalogoCacheado);
            return;
        }

        // Si no hay caché, hacer fetch normal
        api.get(`/articulos/negocio/${negocio.negocioId}`)
            .then(res => {
                if (res.data.success) {
                    const data = res.data.data || [];
                    setCatalogo(data);
                    // Guardar en caché para futuras visitas
                    guardarCatalogoCache(sucursalId, data);
                }
            })
            .catch(() => setCatalogo([]));
    }, [negocio?.negocioId, sucursalId, obtenerCatalogoCache, guardarCatalogoCache]);


    // Fetch de las reseñas cuando se carga el negocio
    useEffect(() => {
        if (sucursalId) {
            api.get(`/resenas/sucursal/${sucursalId}`)
                .then(res => {
                    if (res.data.success) {
                        setResenas(res.data.data || []);
                    }
                })
                .catch(() => setResenas([]));
        }
    }, [sucursalId]);

    // ✅ Fetch de las ofertas - PRIMERO busca en caché
    useEffect(() => {
        if (!sucursalId) return;

        // Intentar leer del caché primero
        const ofertasCacheadas = obtenerOfertasCache(sucursalId);
        if (ofertasCacheadas) {
            setOfertas(ofertasCacheadas);
            return;
        }

        // Si no hay caché, hacer fetch normal
        const fechaLocal = new Date().toLocaleDateString('en-CA');
        api.get('/ofertas/feed', { params: { sucursalId, limite: 50, fechaLocal } })
            .then(res => {
                if (res.data.success && res.data.data) {
                    const ofertasMapeadas = res.data.data.map((o: {
                        ofertaId: string;
                        titulo: string;
                        descripcion?: string;
                        imagen?: string;
                        tipo: Oferta['tipo'];
                        valor?: string;
                        fechaFin?: string;
                    }) => ({
                        id: o.ofertaId,
                        titulo: o.titulo,
                        descripcion: o.descripcion,
                        imagen: o.imagen,
                        tipo: o.tipo,
                        valor: o.valor != null ? (isNaN(Number(o.valor)) ? o.valor : Number(o.valor)) : undefined,
                        fechaFin: o.fechaFin,
                    }));
                    setOfertas(ofertasMapeadas);
                    // Guardar en caché para futuras visitas
                    guardarOfertasCache(sucursalId, ofertasMapeadas);
                }
            })
            .catch(() => setOfertas([]));
    }, [sucursalId, obtenerOfertasCache, guardarOfertasCache]);

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
        // TODO: Implementar lógica de chat cuando esté lista
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

    // TODO: Eliminar RESENAS_EJEMPLO cuando haya datos reales
    const resenasData = resenas.length > 0 ? resenas : RESENAS_EJEMPLO;

    const promedioResenas = resenasData.length > 0
        ? resenasData.reduce((acc, r) => acc + (r.rating || 0), 0) / resenasData.length
        : 0;
    const tieneCalificacion = resenasData.length > 0;
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
                            <div className="h-px bg-slate-200" />

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
                />
            )}

            {/* ✅ NUEVO: Modal Universal de Imágenes */}
            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={cerrarModalImagenes}
            />

            {/* MODAL ESCRIBIR RESEÑA */}
            <ModalEscribirResena
                abierto={modalResenaAbierto}
                onCerrar={() => setModalResenaAbierto(false)}
                tieneCompraVerificada={false} // TODO: Conectar con backend
                onEnviar={(rating, texto) => {
                    console.log('Reseña enviada:', { rating, texto });
                    // TODO: Enviar al backend
                }}
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
                <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-5 py-2.5 px-3 bg-white/60 backdrop-blur-md lg:hidden">
                    <div className="flex items-center gap-1.5">
                        <Heart className="w-6 h-6 text-red-500 fill-current" />
                        <span className="text-base font-bold text-slate-700">{totalLikes ?? 0}</span>
                    </div>
                    <div className="h-5 w-px bg-slate-400/50" />
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-6 h-6 text-slate-500" />
                        <span className="text-base font-bold text-slate-700">{totalVisitas ?? 0}</span>
                    </div>
                    <div className="h-5 w-px bg-slate-400/50" />
                    <div className="flex items-center gap-1.5">
                        <Star className={`w-6 h-6 ${tieneCalificacion ? 'text-yellow-500 fill-current' : 'text-yellow-400'}`} />
                        <span className="text-base font-bold text-slate-700">
                            {resenasData.length > 0 ? `${promedioResenas.toFixed(1)} (${resenasData.length})` : '0'}
                        </span>
                    </div>
                    {distanciaKm !== null && (
                        <>
                            <div className="h-5 w-px bg-slate-400/50" />
                            <div className="flex items-center gap-1.5">
                                <Navigation className="w-6 h-6 text-blue-500" />
                                <span className="text-base font-bold text-blue-600">
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
                            <div className="pointer-events-auto absolute top-14 lg:top-4 left-5 2xl:left-7.5 group">
                                <button onClick={handleVolver} className="cursor-pointer p-2 2xl:p-2.5 rounded-lg border-2 bg-white/90 border-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-900 backdrop-blur-sm transition-all">
                                    <ArrowLeft className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Volver
                                </div>
                            </div>
                        )}

                        <div className="absolute top-14 lg:top-4 right-5 2xl:right-7.5 flex gap-2 pointer-events-auto">
                            {/* Botón Like */}
                            <div className="relative group">
                                <button onClick={handleLikeConAuth} className={`cursor-pointer p-2 2xl:p-2.5 rounded-lg border-2 backdrop-blur-sm transition-all ${liked ? 'bg-red-50 border-red-500 text-red-500' : 'bg-white/90 border-white text-slate-700 hover:bg-red-50 hover:border-red-500 hover:text-red-500'}`}>
                                    <Heart className={`w-4 h-4 2xl:w-5 2xl:h-5 ${liked ? 'fill-current' : ''}`} />
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Like
                                </div>
                            </div>
                            {/* Botón Seguir */}
                            <div className="relative group">
                                <button onClick={handleSaveConAuth} className={`cursor-pointer p-2 2xl:p-2.5 rounded-lg border-2 backdrop-blur-sm transition-all ${followed ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white/90 border-white text-slate-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600'}`}>
                                    <Bell className={`w-4 h-4 2xl:w-5 2xl:h-5 ${followed ? 'fill-current' : ''}`} />
                                </button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    {followed ? 'Dejar de seguir' : 'Seguir'}
                                </div>
                            </div>
                            {/* Botón Compartir */}
                            <div className="group">
                                <DropdownCompartir
                                    url={`${window.location.origin}/p/negocio/${sucursalId}`}
                                    texto={`¡Mira este negocio en AnunciaYA!\n\n${negocio?.negocioNombre}`}
                                    titulo={negocio?.negocioNombre || 'Negocio'}
                                    variante="hero"
                                />
                            </div>
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
                                    {negocio.sucursalNombre}
                                </p>
                            )}
                            {/* Badges envío más grandes */}
                            {(negocio.tieneEnvioDomicilio || negocio.tieneServicioDomicilio) && (
                                <div className="flex flex-wrap gap-3 mt-1">
                                    {negocio.tieneEnvioDomicilio && (
                                        <span className="flex items-center gap-2 text-base font-semibold text-emerald-600">
                                            <Truck className="w-5 h-5" />
                                            Envío
                                        </span>
                                    )}
                                    {negocio.tieneServicioDomicilio && (
                                        <span className="flex items-center gap-2 text-base font-semibold text-blue-600">
                                            <Home className="w-5 h-5" />
                                            A domicilio
                                        </span>
                                    )}
                                </div>
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
                                            <div className="relative group cursor-pointer shrink-0">
                                                <CreditCard className="lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-amber-500 animate-bounce" style={{ animationDuration: '2s' }} />
                                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                    Acepta CardYA
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sucursal */}
                                    {negocio.totalSucursales > 1 && (
                                        <p className="lg:text-base 2xl:text-lg font-semibold text-blue-600 mt-1">
                                            {negocio.sucursalNombre}
                                        </p>
                                    )}

                                    {/* Descripción */}
                                    {negocio.negocioDescripcion && (
                                        <p className="text-slate-600 lg:text-base 2xl:text-lg mt-1">{negocio.negocioDescripcion}</p>
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
                                            onClick={() => setModalResenaAbierto(true)}
                                            className="flex items-center lg:gap-1 2xl:gap-2 lg:px-2 2xl:px-4 cursor-pointer hover:opacity-80"
                                        >
                                            <Star className={`lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 animate-bounce ${tieneCalificacion ? 'text-yellow-500 fill-current' : 'text-yellow-400'}`} style={{ animationDuration: '3s' }} />
                                            <span className="lg:text-sm 2xl:text-lg font-semibold text-slate-700">
                                                {resenasData.length > 0 ? `${promedioResenas.toFixed(1)} (${resenasData.length})` : '0'}
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
                                                <div className="flex items-center gap-1 lg:gap-1 2xl:gap-2 lg:px-2 lg:py-1 2xl:px-4 2xl:py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                    <Truck className="lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 text-emerald-600" />
                                                    <span className="lg:text-[10px] 2xl:text-sm font-medium text-emerald-700">Envío a domicilio</span>
                                                </div>
                                            )}
                                            {negocio.tieneServicioDomicilio && (
                                                <div className="flex items-center gap-1 lg:gap-1 2xl:gap-2 lg:px-2 lg:py-1 2xl:px-4 2xl:py-2 bg-white border border-blue-200 rounded-lg">
                                                    <Home className="lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 text-blue-600" />
                                                    <span className="lg:text-[10px] 2xl:text-sm font-medium text-blue-700">Servicio a domicilio</span>
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
                        {/* MÓVIL: Contactos + Horario + Ubicación */}
                        <div className="flex flex-col items-center gap-5 lg:hidden">
                            {/* Contactos - Iconos en círculos con separadores */}
                            <div className="flex items-center justify-center gap-4 px-4">
                                {negocio.telefono && (
                                    <>
                                        <a
                                            href={`tel:${negocio.telefono.replace(/\s+/g, '')}`}
                                            className="w-10 h-10 bg-slate-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                                            title="Llamar"
                                        >
                                            <Phone className="w-5 h-5 text-white" />
                                        </a>
                                        <div className="h-8 w-0.5 bg-linear-to-b from-transparent via-slate-300 to-transparent" />
                                    </>
                                )}
                                {negocio.whatsapp && (
                                    <>
                                        <a
                                            href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:scale-105 transition-transform"
                                            title="WhatsApp"
                                        >
                                            <img src="/whatsapp.webp" alt="WhatsApp" className="w-10 h-10" />
                                        </a>
                                        <div className="h-8 w-0.5 bg-linear-to-b from-transparent via-slate-300 to-transparent" />
                                    </>
                                )}
                                <button
                                    onClick={handleChatYA}
                                    className="hover:scale-105 transition-transform cursor-pointer"
                                    title="ChatYA"
                                >
                                    <img src="/ChatYA.webp" alt="ChatYA" className="h-10 w-auto" />
                                </button>
                            </div>

                            {/* Línea separadora sutil */}
                            <div className="w-48 h-0.5 bg-linear-to-r from-transparent via-slate-400 to-transparent" />

                            {/* Horario */}
                            {negocio.horarios && negocio.horarios.length > 0 && (() => {
                                const infoHorario = calcularEstadoNegocio(negocio.horarios, negocio.zonaHoraria);
                                const { estado, proximaApertura, proximoCierre } = infoHorario;

                                const config = {
                                    abierto: {
                                        bg: 'bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
                                        icon: <Clock className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '8s' }} />,
                                        texto: 'Abierto',
                                        subtexto: `Cierra ${formatearHora(proximoCierre || '')}`,
                                    },
                                    cerrado: {
                                        bg: 'bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
                                        icon: <Clock className="w-4 h-4 text-white" />,
                                        texto: 'Cerrado',
                                        subtexto: `Abre ${formatearHora(proximaApertura || '')}`,
                                    },
                                    cerrado_hoy: {
                                        bg: 'bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700',
                                        icon: <Clock className="w-4 h-4 text-white" />,
                                        texto: 'Cerrado hoy',
                                        subtexto: proximaApertura ? `Abre ${formatearHora(proximaApertura)}` : '',
                                    },
                                    comida: {
                                        bg: 'bg-linear-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600',
                                        icon: <UtensilsCrossed className="w-4 h-4 text-white" />,
                                        texto: 'Horario de comida',
                                        subtexto: `Regresa ${formatearHora(proximaApertura || '')}`,
                                    }
                                };

                                const { bg, icon, texto, subtexto } = config[estado];

                                return (
                                    <button
                                        onClick={() => setModalHorariosAbierto(true)}
                                        className={`flex items-center gap-1.5 px-4 py-2 ${bg} rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer`}
                                    >
                                        {icon}
                                        <span className="text-white font-medium text-sm">{texto}</span>
                                        {subtexto && (
                                            <>
                                                <span className="text-white/70 text-sm">·</span>
                                                <span className="text-white/90 text-sm">{subtexto}</span>
                                            </>
                                        )}
                                        <ChevronDown className="w-5 h-5 text-white/80" />
                                    </button>
                                );
                            })()}

                            {/* Línea separadora sutil */}
                            <div className="w-48 h-0.5 bg-linear-to-r from-transparent via-slate-400 to-transparent" />

                            {/* Dirección con icono animado */}
                            <button
                                onClick={handleDirecciones}
                                className="flex items-center gap-1 text-left w-full px-5 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                <MapPin className="w-8 h-8 text-blue-500 shrink-0 animate-bounce" style={{ animationDuration: '2s' }} />
                                <p className="text-slate-700 text-sm font-semibold leading-relaxed line-clamp-2">
                                    {negocio.direccion}, {negocio.ciudad}
                                </p>
                            </button>
                        </div>

                        {/* DESKTOP: Solo ubicación (horario va en sidebar) */}
                        <div className="hidden lg:flex items-center gap-2 lg:ml-4 2xl:ml-0 lg:mb-4 2xl:mb-0">
                            <MapPin className="lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-slate-400 shrink-0" />
                            <p className="text-slate-700 lg:text-sm 2xl:text-lg">
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
                                />
                            </div>
                        )}

                        {/* ============ CATÁLOGO ============ */}
                        {catalogo.length > 0 && !seccionExpandida && (
                            <div className="px-5 lg:px-0">
                                <SeccionCatalogo
                                    catalogo={catalogo}
                                    whatsapp={negocio?.whatsapp}
                                />
                            </div>
                        )}
                        {/* ============ GALERÍA ============ */}
                        {!seccionExpandida && galeriaImagenes.length > 0 && (
                            <div className="px-5 lg:px-0">
                                <div className="flex items-center justify-between mb-4 lg:mb-3 2xl:mb-4 bg-linear-to-r from-slate-600 via-slate-500 to-slate-400 text-white px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-xl">
                                    <h2 className="flex items-center gap-2 text-lg lg:text-base 2xl:text-lg font-semibold">
                                        <ImageIcon className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Galería</span>
                                        <span className="text-sm font-normal text-slate-300">({galeriaImagenes.length})</span>
                                    </h2>
                                    {/* Flechas de navegación */}
                                    {hayMasImagenes && (
                                        <div className="flex items-center gap-2">
                                            {/* ← Anterior */}
                                            {paginaGaleria > 0 && (
                                                <button
                                                    onClick={anteriorPaginaGaleria}
                                                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                            )}

                                            {/* Siguiente → */}
                                            {paginaGaleria < totalPaginasGaleria - 1 && (
                                                <button
                                                    onClick={siguientePaginaGaleria}
                                                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 cursor-pointer"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                                    {imagenesActuales.map((imagen, index) => {
                                        const indiceReal = paginaGaleria * IMAGENES_POR_PAGINA + index;
                                        return (
                                            <div
                                                key={`${paginaGaleria}-${index}-${imagen.id}`}
                                                className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 cursor-pointer group"
                                                onClick={() => abrirGaleria(indiceReal)}
                                            >
                                                <img
                                                    src={imagen.url}
                                                    alt={imagen.titulo || 'Imagen'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Indicador de página */}
                                {hayMasImagenes && (
                                    <p className="text-center text-xs text-slate-400 mt-3">
                                        Página {paginaGaleria + 1} de {totalPaginasGaleria}
                                    </p>
                                )}
                            </div>
                        )}

                    </div>

                    {/* ============ SIDEBAR CONTACTO (SIN STICKY) ============ */}
                    <div className="px-5 lg:px-0">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-4 2xl:p-6">

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
                                                <span className="text-white font-semibold lg:text-xs 2xl:text-base">{texto}</span>
                                                {subtexto && (
                                                    <span className="text-white/90 lg:text-[10px] 2xl:text-sm">{subtexto}</span>
                                                )}
                                            </div>
                                            <ChevronDown className="lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/80 shrink-0" />
                                        </button>
                                    );
                                })()}
                            </div>

                            {/* UBICACIÓN - Solo desktop */}
                            <div className="hidden lg:block">
                                <h4 className="flex items-center gap-2 lg:text-xs 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider lg:mb-3 2xl:mb-3">
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
                                            />
                                            <Marker position={[negocio.latitud, negocio.longitud]}>
                                                <Popup>
                                                    <div className="text-center">
                                                        <strong>{negocio.negocioNombre}</strong>
                                                        <br />
                                                        <span className="text-sm text-slate-600">{negocio.direccion}</span>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    </div>
                                ) : (
                                    <div className="w-full h-80 2xl:h-72 bg-slate-100 rounded-xl flex items-center justify-center mb-5 2xl:mb-4">
                                        <MapPin className="w-12 h-12 text-slate-400" />
                                    </div>
                                )}

                                {/* BOTONES DE MAPA */}
                                <div className="flex gap-2 mb-5 2xl:mb-4">
                                    <button
                                        onClick={handleDirecciones}
                                        className="flex-1 flex items-center justify-center gap-2 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 bg-linear-to-r from-blue-500 to-blue-600 text-white font-semibold lg:text-sm 2xl:text-base rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all cursor-pointer"
                                    >
                                        <Navigation className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Cómo llegar</span>
                                    </button>
                                    <button
                                        onClick={() => setModalMapaAbierto(true)}
                                        className="shrink-0 flex items-center justify-center gap-2 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold lg:text-sm 2xl:text-base rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                                        title="Ver mapa completo"
                                    >
                                        <Maximize2 className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    </button>
                                </div>

                                {/* SEPARADOR */}
                                <div className="my-5 2xl:my-4 h-px bg-slate-200" />

                                {/* CONTACTO */}
                                <h4 className="flex items-center gap-2 lg:text-xs 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider lg:mb-3 2xl:mb-3">
                                    <Send className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    <span>Contacto</span>
                                </h4>

                                {/* TELÉFONO */}
                                {negocio.telefono && (
                                    <a
                                        href={`tel:${negocio.telefono.replace(/\s+/g, '')}`}
                                        className="flex items-center gap-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2 lg:mb-2 2xl:mb-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer group hover:scale-[1.02]"
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
                                        className="flex items-center gap-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2 lg:mb-3 2xl:mb-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer group hover:scale-[1.02]"
                                    >
                                        <Mail className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                        <span className="lg:text-sm 2xl:text-base font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                                            {negocio.correo}
                                        </span>
                                    </a>
                                )}

                                <div className="flex lg:gap-3 2xl:gap-4 items-center">
                                    {negocio.whatsapp && (
                                        <div className="relative group">
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
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                WhatsApp
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative group">
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
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            ChatYA
                                        </div>
                                    </div>
                                </div>

                                {/* SEPARADOR */}
                                <div className="my-5 2xl:my-4 h-px bg-slate-200" />
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
                                            <div className="relative group">
                                                <a href={negocio.sitioWeb} target="_blank" rel="noopener noreferrer" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full bg-slate-700 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                                                    <svg className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                </a>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Sitio Web
                                                </div>
                                            </div>
                                        )}
                                        {/* Facebook */}
                                        {negocio.redesSociales?.facebook && (
                                            <div className="relative group">
                                                <a href={negocio.redesSociales.facebook} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/facebook.webp" alt="Facebook" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Facebook
                                                </div>
                                            </div>
                                        )}
                                        {/* Instagram */}
                                        {negocio.redesSociales?.instagram && (
                                            <div className="relative group">
                                                <a href={negocio.redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/instagram.webp" alt="Instagram" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Instagram
                                                </div>
                                            </div>
                                        )}
                                        {/* X (Twitter) */}
                                        {negocio.redesSociales?.twitter && (
                                            <div className="relative group">
                                                <a href={negocio.redesSociales.twitter} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/twitter.webp" alt="X" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    X
                                                </div>
                                            </div>
                                        )}
                                        {/* TikTok */}
                                        {negocio.redesSociales?.tiktok && (
                                            <div className="relative group">
                                                <a href={negocio.redesSociales.tiktok} target="_blank" rel="noopener noreferrer" className="block hover:scale-110 transition-transform cursor-pointer">
                                                    <img src="/tiktok.webp" alt="TikTok" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 object-contain" />
                                                </a>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    TikTok
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* SEPARADOR */}
                            <div className="my-5 2xl:my-4 h-px bg-slate-200" />

                            {/* MÉTODOS DE PAGO */}
                            {negocio.metodosPago && negocio.metodosPago.length > 0 && (
                                <div>
                                    <h4 className="flex items-center gap-2 text-base lg:text-xs 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 lg:mb-3 2xl:mb-3">
                                        <CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        <span>Métodos de Pago</span>
                                    </h4>
                                    <div className="flex lg:flex-col gap-2">
                                        {agruparMetodosPago(negocio.metodosPago).map((tipo) => {
                                            let bgColor = 'bg-slate-100';
                                            let textColor = 'text-slate-600';
                                            if (tipo.toLowerCase().includes('efectivo')) { bgColor = 'bg-green-50'; textColor = 'text-green-700'; }
                                            else if (tipo.toLowerCase().includes('tarjeta')) { bgColor = 'bg-blue-50'; textColor = 'text-blue-700'; }
                                            else if (tipo.toLowerCase().includes('transfer')) { bgColor = 'bg-purple-50'; textColor = 'text-purple-700'; }

                                            return (
                                                <span key={tipo} className={`px-3 py-1.5 lg:px-2 lg:py-1 2xl:px-3 2xl:py-1.5 ${bgColor} ${textColor} rounded-lg text-sm lg:text-xs 2xl:text-sm font-medium`}>
                                                    {nombreMetodoPago(tipo)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============ RESEÑAS - ANCHO COMPLETO ============ */}
                {!seccionExpandida && (
                    <div className="px-5 lg:px-4 2xl:px-0 mt-6 lg:mt-4 2xl:mt-6 ">
                        <SeccionResenas
                            resenas={resenasData}
                            onEscribirResena={() => setModalResenaAbierto(true)}
                        />
                    </div>
                )}
            </div> {/* Cierre wrapper laptop */}

            {/* MODAL MAPA EXPANDIDO */}
            {modalMapaAbierto && negocio.latitud && negocio.longitud && (
                <ModalMapa
                    negocio={{
                        negocioNombre: negocio.negocioNombre,
                        direccion: negocio.direccion,
                        latitud: negocio.latitud,
                        longitud: negocio.longitud
                    }}
                    userLat={userLat}
                    userLng={userLng}
                    onClose={() => setModalMapaAbierto(false)}
                />
            )}

            {/* MODAL AUTH REQUERIDO */}
            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                accion={accionAuthRequerida}
                urlRetorno={`/negocios/${sucursalId}`}
            />
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