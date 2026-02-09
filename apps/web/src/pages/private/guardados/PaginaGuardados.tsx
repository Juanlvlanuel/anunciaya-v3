/**
 * PaginaGuardados.tsx
 * ====================
 * Página que muestra los elementos guardados del usuario.
 *
 * ¿Qué hace este archivo?
 * - Tab "Negocios": Muestra negocios seguidos (usa endpoint /api/seguidos)
 * - Tab "Ofertas": Muestra ofertas guardadas (usa endpoint /api/guardados con JOIN)
 * - Click en oferta abre ModalOfertaDetalle
 * - Responsive: mobile (1 col), laptop (2 cols), desktop (3 cols)
 * - Estados: Loading, Vacío, Con Datos
 * - NUEVO: Filtros, ordenamiento, selección múltiple
 *
 * Ubicación: apps/web/src/pages/private/guardados/PaginaGuardados.tsx
 */

import { useState, useEffect } from 'react';
import { useGpsStore } from '@/stores/useGpsStore';
import {
    Bookmark,
    Store,
    Tag,
    ChevronRight,
    Trash2,
    X,
    Check,
    Briefcase,
    FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OfertaCard, ModalOfertaDetalle } from '@/components/negocios';
import { CardNegocioDetallado } from '@/components/negocios/CardNegocioDetallado';
import api from '@/services/api';
import notificar from '@/utils/notificaciones';
import type { Oferta } from '@/types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

type TabGuardado = 'ofertas' | 'negocios' | 'empleos' | 'articulos';

type Ordenamiento = 'recientes' | 'antiguos' | 'alfabetico-az' | 'alfabetico-za';

interface GuardadoOferta {
    id: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    oferta: Oferta;
    // ✅ NUEVO: Datos del negocio asociado
    negocio?: {
        nombre: string;
        whatsapp?: string | null;
        sucursalId: string;
    };
}

interface NegocioSeguido {
    id: string;
    nombre: string;
    categoria: string;
    imagen_perfil?: string;
    sucursalId: string;
    votanteSucursalId?: string | null; // Para saber cómo eliminar el follow
    // Propiedades opcionales para CardNegocioDetallado
    galeria?: Array<{ url: string; titulo?: string }>;
    estaAbierto?: boolean | null;
    distanciaKm?: number | null;
    calificacionPromedio?: string;
    totalCalificaciones?: number;
    whatsapp?: string;
    liked?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaGuardados() {
    const navigate = useNavigate();
    const { latitud, longitud } = useGpsStore();

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [tabActivo, setTabActivo] = useState<TabGuardado>('ofertas');
    const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>('recientes');
    const [modoSeleccion, setModoSeleccion] = useState(false);
    const [idsSeleccionados, setIdsSeleccionados] = useState<Set<string>>(new Set());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // State Ofertas
    const [ofertas, setOfertas] = useState<GuardadoOferta[]>([]);
    const [loadingOfertas, setLoadingOfertas] = useState(false);
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState<GuardadoOferta | null>(null);

    // State Negocios
    const [negocios, setNegocios] = useState<NegocioSeguido[]>([]);
    const [loadingNegocios, setLoadingNegocios] = useState(false);

    // Filtros (para implementación futura)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filtros, setFiltros] = useState({
        activas: true,
        proximasVencer: false,
        descuentoMayor20: false,
    });

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------
    
    // Cargar todos los datos al inicio (paralelo)
    useEffect(() => {
        Promise.all([
            fetchOfertasGuardadas(),
            fetchNegociosSeguidos(),
        ]);
    }, []);

    // Reset modo selección al cambiar tab
    useEffect(() => {
        setModoSeleccion(false);
        setIdsSeleccionados(new Set());
    }, [tabActivo]);

    // ---------------------------------------------------------------------------
    // Fetch Functions
    // ---------------------------------------------------------------------------

    /**
     * Obtiene ofertas guardadas con datos completos (JOIN en backend)
     */
    async function fetchOfertasGuardadas() {
        try {
            setLoadingOfertas(true);
            const response = await api.get('/guardados', {
                params: {
                    entityType: 'oferta',
                    pagina: 1,
                    limite: 50,
                },
            });

            if (response.data.success) {
                setOfertas(response.data.data.guardados || []);
            }
        } catch (error) {
            console.error('Error al obtener ofertas guardadas:', error);
        } finally {
            setLoadingOfertas(false);
        }
    }

    /**
     * Obtiene negocios seguidos (endpoint de votos)
     * IMPORTANTE: Enviamos incluirTodosModos=true para obtener TODOS los seguidos
     * (tanto personales como comerciales) en "Mis Guardados"
     */
    async function fetchNegociosSeguidos() {
        try {
            setLoadingNegocios(true);
            
            // Construir params
            const params: any = {
                entityType: 'sucursal',
                pagina: 1,
                limite: 50,
                incluirTodosModos: 'true', // Parámetro especial para ignorar votanteSucursalId
            };
            
            // Agregar coordenadas GPS si están disponibles
            if (latitud && longitud) {
                params.latitud = latitud;
                params.longitud = longitud;
            }
            
            const response = await api.get('/seguidos', { params });

            if (response.data.success) {
                setNegocios(response.data.data.seguidos || []);
            }
        } catch (error) {
            console.error('Error al obtener negocios seguidos:', error);
        } finally {
            setLoadingNegocios(false);
        }
    }

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleCambiarTab = (tab: TabGuardado) => {
        setTabActivo(tab);
    };

    const handleClickOferta = (guardado: GuardadoOferta) => {
        // Siempre abre el modal cuando se hace click en la card (no en el bookmark)
        // Guardamos el guardado completo para tener acceso a negocio.whatsapp
        setOfertaSeleccionada(guardado);
    };

    const handleClickNegocioCard = (negocio: NegocioSeguido) => {
        // Siempre navega al negocio cuando se hace click en la card (no en el bookmark)
        navigate(`/negocios/${negocio.sucursalId}`);
    };

    const handleClickBookmark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Si no está en modo selección, activarlo
        if (!modoSeleccion) {
            setModoSeleccion(true);
        }
        
        // Toggle selección del item
        toggleSeleccion(id);
    };

    const handleCloseModal = () => {
        setOfertaSeleccionada(null);
        // NO recargar ofertas - solo cerramos el modal
        // fetchOfertasGuardadas(); // ❌ Esto causa el parpadeo
    };

    const toggleModoSeleccion = () => {
        setModoSeleccion(!modoSeleccion);
        setIdsSeleccionados(new Set());
    };

    const toggleSeleccion = (id: string) => {
        const nuevosIds = new Set(idsSeleccionados);
        if (nuevosIds.has(id)) {
            nuevosIds.delete(id);
        } else {
            nuevosIds.add(id);
        }
        setIdsSeleccionados(nuevosIds);
    };

    const seleccionarTodos = () => {
        if (tabActivo === 'ofertas') {
            setIdsSeleccionados(new Set(ofertas.map((o) => o.id)));
        } else if (tabActivo === 'negocios') {
            setIdsSeleccionados(new Set(negocios.map((n) => n.id)));
        }
    };

    const limpiarSeleccion = () => {
        setIdsSeleccionados(new Set());
    };

    const eliminarSeleccionados = async () => {
        if (idsSeleccionados.size === 0) return;

        // Guardar estado original antes del try (para rollback si falla)
        const idsAEliminar = Array.from(idsSeleccionados);
        const ofertasOriginales = [...ofertas];
        const negociosOriginales = [...negocios];

        try {
            // Eliminación optimista - actualizar UI inmediatamente
            if (tabActivo === 'ofertas') {
                setOfertas(ofertas.filter((o) => !idsSeleccionados.has(o.id)));
            } else if (tabActivo === 'negocios') {
                setNegocios(negocios.filter((n) => !idsSeleccionados.has(n.id)));
            }

            setIdsSeleccionados(new Set());
            setModoSeleccion(false);

            // Llamada real al backend - eliminar cada guardado
            // Ruta: DELETE /api/guardados/:entityType/:entityId
            const promesas = idsAEliminar.map((guardadoId) => {
                if (tabActivo === 'ofertas') {
                    // Buscar la oferta para obtener su entityId
                    const guardado = ofertasOriginales.find(o => o.id === guardadoId);
                    if (guardado) {
                        return api.delete(`guardados/oferta/${guardado.entityId}`);
                    }
                } else if (tabActivo === 'negocios') {
                    // Para negocios seguidos: usar endpoint de votos
                    // El interceptor agregará automáticamente votanteSucursalId si estamos en modo comercial
                    const negocio = negociosOriginales.find(n => n.id === guardadoId);
                    if (negocio) {
                        return api.delete(`votos/sucursal/${negocio.sucursalId}/follow`);
                    }
                }
                return Promise.resolve(); // Si no se encuentra, resolver vacío
            });

            await Promise.all(promesas);

            notificar.exito('Eliminados correctamente');
        } catch (error) {
            console.error('Error al eliminar guardados:', error);
            
            // Rollback - restaurar estado anterior si falla
            if (tabActivo === 'ofertas') {
                setOfertas(ofertasOriginales);
            } else if (tabActivo === 'negocios') {
                setNegocios(negociosOriginales);
            }

            notificar.error('Error al eliminar');
        }
    };

    // ---------------------------------------------------------------------------
    // Computed Values
    // ---------------------------------------------------------------------------
    const totalGuardados = tabActivo === 'ofertas' ? ofertas.length : negocios.length;
    const loading = tabActivo === 'ofertas' ? loadingOfertas : loadingNegocios;

    // Ordenar items según selección
    const ofertasOrdenadas = [...ofertas].sort((a, b) => {
        switch (ordenamiento) {
            case 'recientes':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'antiguos':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'alfabetico-az':
                return (a.oferta?.titulo || '').localeCompare(b.oferta?.titulo || '');
            case 'alfabetico-za':
                return (b.oferta?.titulo || '').localeCompare(a.oferta?.titulo || '');
            default:
                return 0;
        }
    });

    const negociosOrdenados = [...negocios].sort((a, b) => {
        switch (ordenamiento) {
            case 'alfabetico-az':
                return a.nombre.localeCompare(b.nombre);
            case 'alfabetico-za':
                return b.nombre.localeCompare(a.nombre);
            default:
                return 0;
        }
    });

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
            {/* Header Sticky - Nivel superior */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-40 border-b border-slate-200 shadow-sm will-change-transform" style={{ transform: 'translateZ(0)' }}>
                <div className="max-w-7xl mx-auto px-4 lg:px-2.5 2xl:px-6">
                    {/* Título y botones de ordenamiento */}
                    <div className="pt-4 pb-4 lg:pt-2.5 lg:pb-2.5 2xl:pt-4 2xl:pb-4">
                        <div className="flex items-center justify-between">
                        <h1 className="text-xl lg:text-base 2xl:text-3xl font-bold text-gray-900 flex items-center gap-3 lg:gap-2 2xl:gap-3">
                            <Bookmark className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-8 2xl:h-8 text-amber-500" />
                            Mis Guardados
                        </h1>
                        
                        {/* Botones de ordenamiento */}
                        {!loading && totalGuardados > 0 && (
                            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                                <button
                                    onClick={() => setOrdenamiento('recientes')}
                                    className={`px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl text-sm lg:text-xs 2xl:text-sm font-semibold transition-all ${
                                        ordenamiento === 'recientes'
                                            ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Recientes
                                </button>
                                <button
                                    onClick={() => setOrdenamiento('antiguos')}
                                    className={`px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl text-sm lg:text-xs 2xl:text-sm font-semibold transition-all ${
                                        ordenamiento === 'antiguos'
                                            ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Antiguos
                                </button>
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Tabs - Pills en móvil, horizontales en desktop */}
                    <div>
                    {/* Mobile: Pills con scroll */}
                    <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-hide px-0.5">
                        <TabPill
                            activo={tabActivo === 'ofertas'}
                            onClick={() => handleCambiarTab('ofertas')}
                            icon={<Tag className="w-4 h-4" />}
                            badge={ofertas.length}
                        >
                            Ofertas
                        </TabPill>
                        <TabPill
                            activo={tabActivo === 'negocios'}
                            onClick={() => handleCambiarTab('negocios')}
                            icon={<Store className="w-4 h-4" />}
                            badge={negocios.length}
                        >
                            Negocios
                        </TabPill>
                        <TabPill
                            activo={tabActivo === 'empleos'}
                            onClick={() => handleCambiarTab('empleos')}
                            icon={<Briefcase className="w-4 h-4" />}
                            badge={0}
                        >
                            Empleos
                        </TabPill>
                        <TabPill
                            activo={tabActivo === 'articulos'}
                            onClick={() => handleCambiarTab('articulos')}
                            icon={<FileText className="w-4 h-4" />}
                            badge={0}
                        >
                            Artículos
                        </TabPill>
                    </div>

                    {/* Desktop: Tabs horizontales */}
                    <div className="hidden lg:flex border-b border-gray-200">
                        <TabButton
                            activo={tabActivo === 'ofertas'}
                            onClick={() => handleCambiarTab('ofertas')}
                            icon={<Tag className="w-5 h-5" />}
                            badge={ofertas.length}
                        >
                            Ofertas
                        </TabButton>
                        <TabButton
                            activo={tabActivo === 'negocios'}
                            onClick={() => handleCambiarTab('negocios')}
                            icon={<Store className="w-5 h-5" />}
                            badge={negocios.length}
                        >
                            Negocios
                        </TabButton>
                        <TabButton
                            activo={tabActivo === 'empleos'}
                            onClick={() => handleCambiarTab('empleos')}
                            icon={<Briefcase className="w-5 h-5" />}
                            badge={0}
                        >
                            Empleos
                        </TabButton>
                        <TabButton
                            activo={tabActivo === 'articulos'}
                            onClick={() => handleCambiarTab('articulos')}
                            icon={<FileText className="w-5 h-5" />}
                            badge={0}
                        >
                            Artículos
                        </TabButton>
                    </div>
                </div>
                </div>
            </div>
            {/* Fin Header Sticky */}

            {/* Contenedor del contenido con max-width */}
            <div className="max-w-7xl mx-auto px-4 lg:px-2.5 2xl:px-6 pt-4 pb-0 lg:py-4 2xl:py-6">
                    {/* Contenido según tab activo */}
                    {tabActivo === 'ofertas' && (
                        <div className="animate-fade-in">
                            <ContenidoOfertas
                                ofertas={ofertasOrdenadas}
                                loading={loadingOfertas}
                                onClickOferta={handleClickOferta}
                                onClickBookmark={handleClickBookmark}
                                modoSeleccion={modoSeleccion}
                                idsSeleccionados={idsSeleccionados}
                            />
                        </div>
                    )}

                    {tabActivo === 'negocios' && (
                        <div className="animate-fade-in">
                            <ContenidoNegocios
                                negocios={negociosOrdenados}
                                loading={loadingNegocios}
                                onClickNegocio={handleClickNegocioCard}
                                onClickBookmark={handleClickBookmark}
                                modoSeleccion={modoSeleccion}
                                idsSeleccionados={idsSeleccionados}
                            />
                        </div>
                    )}

                    {(tabActivo === 'empleos' || tabActivo === 'articulos') && (
                        <div className="animate-fade-in">
                            <EstadoProximamente tipo={tabActivo} />
                        </div>
                    )}

                    {/* Barra flotante de selección */}
                    {modoSeleccion && idsSeleccionados.size > 0 && (
                <div className="fixed bottom-20 lg:bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-linear-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm">{idsSeleccionados.size}</span>
                    </div>
                    <div className="h-5 w-px bg-gray-700"></div>
                    <button
                        onClick={seleccionarTodos}
                        className="text-sm font-medium hover:text-amber-400 transition-colors"
                    >
                        Todos
                    </button>
                    <button
                        onClick={limpiarSeleccion}
                        className="text-sm font-medium hover:text-amber-400 transition-colors"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={eliminarSeleccionados}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-all shadow-lg shadow-red-500/30 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                    <button
                        onClick={toggleModoSeleccion}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            </div>
            {/* Fin contenedor max-w-7xl */}

            {/* Modal de detalle de oferta */}
            {ofertaSeleccionada && (
                <ModalOfertaDetalle 
                    oferta={ofertaSeleccionada.oferta || ofertaSeleccionada} 
                    onClose={handleCloseModal}
                    whatsapp={ofertaSeleccionada.negocio?.whatsapp || undefined}
                    negocioNombre={ofertaSeleccionada.negocio?.nombre || undefined}
                />
            )}

            {/* Estilos para animación fade-in */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: TabButton (Desktop)
// =============================================================================

interface TabButtonProps {
    activo: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    badge?: number;
    children: React.ReactNode;
}

function TabButton({ activo, onClick, icon, badge, children }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 lg:gap-2 2xl:gap-2.5 px-4 lg:px-5 2xl:px-6 py-3 lg:py-3.5 2xl:py-4 text-sm lg:text-sm 2xl:text-base font-semibold transition-all ${
                activo
                    ? 'text-amber-600 border-b-3 border-amber-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
        >
            {icon}
            {children}
            {badge !== undefined && badge > 0 && (
                <span
                    className={`ml-1.5 lg:ml-2 px-1.5 lg:px-2 py-0.5 text-[10px] lg:text-xs font-bold rounded-full ${
                        activo ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                    }`}
                >
                    {badge}
                </span>
            )}
        </button>
    );
}

// =============================================================================
// SUBCOMPONENTE: TabPill (Mobile)
// =============================================================================

function TabPill({ activo, onClick, icon, badge, children }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold whitespace-nowrap text-xs transition-all shrink-0 ${
                activo
                    ? 'bg-linear-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
            {icon}
            {children}
            {badge !== undefined && badge > 0 && (
                <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        activo ? 'bg-white/30 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                >
                    {badge}
                </span>
            )}
        </button>
    );
}

// =============================================================================
// SUBCOMPONENTE: ContenidoOfertas
// =============================================================================

interface ContenidoOfertasProps {
    ofertas: GuardadoOferta[];
    loading: boolean;
    onClickOferta: (guardado: GuardadoOferta) => void;
    onClickBookmark: (id: string, e: React.MouseEvent) => void;
    modoSeleccion: boolean;
    idsSeleccionados: Set<string>;
}

function ContenidoOfertas({
    ofertas,
    loading,
    onClickOferta,
    onClickBookmark,
    modoSeleccion,
    idsSeleccionados,
}: ContenidoOfertasProps) {
    const navigate = useNavigate();

    // Empty state (solo si no está cargando O si terminó de cargar y está vacío)
    if (!loading && ofertas.length === 0) {
        return (
            <div className="text-center py-12 lg:py-16">
                <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-linear-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center ring-8 ring-amber-50">
                    <Tag className="w-12 h-12 lg:w-16 lg:h-16 text-amber-500" />
                </div>

                <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                    No tienes ofertas guardadas
                </h3>
                <p className="text-sm lg:text-base text-gray-600 mb-6 max-w-md mx-auto">
                    Explora ofertas increíbles de negocios locales y guarda tus favoritas para no
                    perderlas
                </p>

                <button
                    onClick={() => navigate('/ofertas')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
                >
                    Ver Ofertas
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // Con datos - Grid responsive con patrón 3 niveles
    // Muestra lo que hay aunque esté cargando (actualización optimista)
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-4 2xl:gap-6">
            {ofertas.map((guardado) => (
                <div
                    key={guardado.id}
                    className="relative max-w-[340px] lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full"
                >
                    {/* Icono de bookmark clickeable */}
                    <div className="absolute top-2 left-2 z-10">
                        <button
                            onClick={(e) => onClickBookmark(guardado.id, e)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                modoSeleccion && idsSeleccionados.has(guardado.id)
                                    ? 'bg-amber-500 border-2 border-amber-500'
                                    : 'bg-white/90 backdrop-blur border-2 border-white hover:bg-amber-50'
                            }`}
                        >
                            {modoSeleccion && idsSeleccionados.has(guardado.id) ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                        </button>
                    </div>

                    {/* Card de oferta */}
                    <div 
                        onClick={() => onClickOferta(guardado)}
                        className="cursor-pointer"
                    >
                        <OfertaCard oferta={guardado.oferta} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: ContenidoNegocios
// =============================================================================

interface ContenidoNegociosProps {
    negocios: NegocioSeguido[];
    loading: boolean;
    onClickNegocio: (negocio: NegocioSeguido) => void;
    onClickBookmark: (id: string, e: React.MouseEvent) => void;
    modoSeleccion: boolean;
    idsSeleccionados: Set<string>;
}

function ContenidoNegocios({
    negocios,
    loading,
    onClickNegocio,
    onClickBookmark,
    modoSeleccion,
    idsSeleccionados,
}: ContenidoNegociosProps) {
    const navigate = useNavigate();

    // Empty state (solo si no está cargando O si terminó de cargar y está vacío)
    if (!loading && negocios.length === 0) {
        return (
            <div className="text-center py-12 lg:py-16">
                <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-linear-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center ring-8 ring-blue-50">
                    <Store className="w-12 h-12 lg:w-16 lg:h-16 text-blue-500" />
                </div>

                <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                    No sigues ningún negocio
                </h3>
                <p className="text-sm lg:text-base text-gray-600 mb-6 max-w-md mx-auto">
                    Descubre negocios locales increíbles y síguelos para estar al tanto de sus
                    novedades
                </p>

                <button
                    onClick={() => navigate('/negocios')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                >
                    Explorar Negocios
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // Con datos - Grid responsive
    // Muestra lo que hay aunque esté cargando (actualización optimista)
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-3 2xl:gap-4">
            {negocios.map((negocio) => (
                <CardNegocioDetallado
                    key={negocio.id}
                    negocio={negocio}
                    onClick={() => onClickNegocio(negocio)}
                    showLike={false}
                    showBookmark={true}
                    onClickBookmark={(e) => onClickBookmark(negocio.id, e)}
                    bookmarkSelected={modoSeleccion && idsSeleccionados.has(negocio.id)}
                />
            ))}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: EstadoProximamente
// =============================================================================

interface EstadoProximamenteProps {
    tipo: 'empleos' | 'articulos';
}

function EstadoProximamente({ tipo }: EstadoProximamenteProps) {
    const config = {
        empleos: {
            icon: <Briefcase className="w-12 h-12 lg:w-16 lg:h-16 text-purple-500" />,
            titulo: 'Empleos guardados',
            descripcion: 'Pronto podrás guardar tus ofertas de empleo favoritas',
            color: 'purple',
        },
        articulos: {
            icon: <FileText className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500" />,
            titulo: 'Artículos guardados',
            descripcion: 'Pronto podrás guardar artículos interesantes para leer después',
            color: 'emerald',
        },
    };

    const { icon, titulo, descripcion, color } = config[tipo];

    return (
        <div className="text-center py-12 lg:py-16">
            <div
                className={`w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-linear-to-br from-${color}-100 to-${color}-50 rounded-full flex items-center justify-center ring-8 ring-${color}-50`}
            >
                {icon}
            </div>

            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">{titulo}</h3>
            <p className="text-sm lg:text-base text-gray-600 mb-6 max-w-md mx-auto">
                {descripcion}
            </p>

            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium">
                Próximamente disponible
            </div>
        </div>
    );
}

export default PaginaGuardados;