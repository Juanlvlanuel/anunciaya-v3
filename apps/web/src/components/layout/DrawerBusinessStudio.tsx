/**
 * DrawerBusinessStudio.tsx
 * =========================
 * Drawer lateral con menú de navegación para Business Studio (móvil).
 *
 * Se abre desde la barra de info del negocio en MobileHeader.
 * Contiene todas las secciones disponibles en Business Studio.
 * 
 * ACTUALIZADO: Incluye selector de sucursales en móvil
 *
 * Ubicación: apps/web/src/components/layout/DrawerBusinessStudio.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    X,
    Store,
    BarChart3,
    LayoutDashboard,
    User,
    ShoppingBag,
    Tag,
    Users,
    Receipt,
    Ticket,
    UserCog,
    FileBarChart,
    Gift,
    Building2,
    Coins,
    Briefcase,
    Bell,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerSucursalesNegocio } from '../../services/negociosService';

// =============================================================================
// TIPOS
// =============================================================================

interface DrawerBusinessStudioProps {
    abierto: boolean;
    onCerrar: () => void;
}

interface Sucursal {
    id: string;
    nombre: string;
    esPrincipal: boolean;
    activa: boolean;
}

// =============================================================================
// OPCIONES DEL MENÚ (ordenadas según frecuencia de uso y agrupación lógica)
// =============================================================================
//
// ORGANIZACIÓN:
// 1. Operación Diaria - Dashboard, Transacciones, Clientes, Opiniones, Alertas
// 2. Catálogo & Promociones - Catálogo, Ofertas, Cupones
// 3. Engagement & Recompensas - Puntos, Rifas
// 4. Recursos Humanos - Empleados, Vacantes
// 5. Análisis & Configuración - Reportes, Sucursales, Mi Perfil

const opcionesMenu = [
    // =========== OPERACIÓN DIARIA ===========
    { id: 'dashboard', label: 'Dashboard', icono: LayoutDashboard, ruta: '/business-studio' },
    { id: 'transacciones', label: 'Transacciones', icono: Receipt, ruta: '/business-studio/transacciones' },
    { id: 'clientes', label: 'Clientes', icono: Users, ruta: '/business-studio/clientes' },
    { id: 'opiniones', label: 'Opiniones', icono: MessageSquare, ruta: '/business-studio/opiniones' },
    { id: 'alertas', label: 'Alertas', icono: Bell, ruta: '/business-studio/alertas' },
    
    // =========== CATÁLOGO & PROMOCIONES ===========
    { id: 'catalogo', label: 'Catálogo', icono: ShoppingBag, ruta: '/business-studio/catalogo' },
    { id: 'ofertas', label: 'Ofertas', icono: Tag, ruta: '/business-studio/ofertas' },
    { id: 'cupones', label: 'Cupones', icono: Ticket, ruta: '/business-studio/cupones' },
    
    // =========== ENGAGEMENT & RECOMPENSAS ===========
    { id: 'puntos', label: 'Puntos', icono: Coins, ruta: '/business-studio/puntos' },
    { id: 'rifas', label: 'Rifas', icono: Gift, ruta: '/business-studio/rifas' },
    
    // =========== RECURSOS HUMANOS ===========
    { id: 'empleados', label: 'Empleados', icono: UserCog, ruta: '/business-studio/empleados' },
    { id: 'vacantes', label: 'Vacantes', icono: Briefcase, ruta: '/business-studio/vacantes' },
    
    // =========== ANÁLISIS & CONFIGURACIÓN ===========
    { id: 'reportes', label: 'Reportes', icono: FileBarChart, ruta: '/business-studio/reportes' },
    { id: 'sucursales', label: 'Sucursales', icono: Building2, ruta: '/business-studio/sucursales' },
    { id: 'perfil', label: 'Mi Perfil', icono: User, ruta: '/business-studio/perfil' },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export function DrawerBusinessStudio({ abierto, onCerrar }: DrawerBusinessStudioProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { usuario, setSucursalActiva } = useAuthStore();
    
    // Estado del selector de sucursales
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [cargandoSucursales, setCargandoSucursales] = useState(true);

    // Determinar tipo de usuario
    const esDueño = usuario?.negocioId && !usuario?.sucursalAsignada;
    const esGerente = usuario?.negocioId && usuario?.sucursalAsignada;

    // Cargar sucursales
    useEffect(() => {
        async function cargarSucursales() {
            // Validar que hay usuario logueado Y en modo comercial
            if (!usuario?.negocioId || usuario?.modoActivo !== 'comercial') {
                setSucursales([]);
                setCargandoSucursales(false);
                return;
            }

            try {
                setCargandoSucursales(true);
                const respuesta = await obtenerSucursalesNegocio(usuario.negocioId);

                if (respuesta.success && respuesta.data) {
                    // Ordenar: Principal primero, luego por nombre
                    const ordenadas = [...respuesta.data].sort((a, b) => {
                        if (a.esPrincipal) return -1;
                        if (b.esPrincipal) return 1;
                        return a.nombre.localeCompare(b.nombre);
                    });
                    setSucursales(ordenadas);
                }
            } catch (error) {
                console.error('[DRAWER] Error cargando sucursales:', error);
                setSucursales([]);
            } finally {
                setCargandoSucursales(false);
            }
        }

        if (abierto) {
            cargarSucursales();
        }
    }, [usuario?.negocioId, usuario?.modoActivo, abierto]);

    // Obtener índice de sucursal actual
    const indiceActual = sucursales.findIndex(s => s.id === usuario?.sucursalActiva);
    const sucursalActual = sucursales[indiceActual];

    // Handlers: Navegar entre sucursales
    const irAnterior = () => {
        if (indiceActual > 0) {
            setSucursalActiva(sucursales[indiceActual - 1].id);
        }
    };

    const irSiguiente = () => {
        if (indiceActual < sucursales.length - 1) {
            setSucursalActiva(sucursales[indiceActual + 1].id);
        }
    };

    // Handler de navegación
    const handleNavegar = (ruta: string) => {
        navigate(ruta);
        onCerrar();
    };

    // No renderizar si está cerrado
    if (!abierto) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-60"
                onClick={onCerrar}
            />

            {/* Panel */}
            <div className="fixed top-0 left-0 bottom-0 w-[75%] max-w-[280px] bg-white z-61 shadow-2xl overflow-y-auto">
                {/* Header del drawer */}
                <div className="bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6" />
                            <span className="font-bold text-lg">Business Studio</span>
                        </div>
                        <button
                            onClick={onCerrar}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Info del negocio con selector de sucursales integrado */}
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                        {/* Logo del negocio */}
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {usuario?.logoNegocio ? (
                                <img
                                    src={usuario.logoNegocio}
                                    alt={usuario?.nombreNegocio || 'Negocio'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Store className="w-5 h-5 text-blue-500" />
                            )}
                        </div>

                        {/* Flecha Izquierda (solo dueño con múltiples sucursales) */}
                        {!cargandoSucursales && esDueño && sucursales.length > 1 && (
                            <button
                                onClick={irAnterior}
                                disabled={indiceActual === 0}
                                className={`p-1 rounded transition-all shrink-0 ${
                                    indiceActual === 0
                                        ? 'text-white/30 cursor-not-allowed'
                                        : 'text-white hover:bg-white/20 active:scale-95'
                                }`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {/* Info de sucursal (dinámico) */}
                        <div className="flex-1 min-w-0">
                            {cargandoSucursales ? (
                                <div className="h-3 w-20 bg-white/20 rounded animate-pulse" />
                            ) : (
                                <>
                                    <p className="font-semibold text-sm truncate">
                                        {sucursalActual?.nombre || usuario?.nombreNegocio || 'Mi Negocio'}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        {/* Badge Principal */}
                                        {sucursalActual?.esPrincipal && (
                                            <span className="text-xs text-emerald-300 font-medium">
                                                Principal
                                            </span>
                                        )}
                                        
                                        {/* Contador (solo si hay múltiples) */}
                                        {esDueño && sucursales.length > 1 && (
                                            <>
                                                {sucursalActual?.esPrincipal && (
                                                    <span className="text-white/50">•</span>
                                                )}
                                                <span className="text-xs text-white/70">
                                                    {indiceActual + 1}/{sucursales.length}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Flecha Derecha (solo dueño con múltiples sucursales) */}
                        {!cargandoSucursales && esDueño && sucursales.length > 1 && (
                            <button
                                onClick={irSiguiente}
                                disabled={indiceActual === sucursales.length - 1}
                                className={`p-1 rounded transition-all shrink-0 ${
                                    indiceActual === sucursales.length - 1
                                        ? 'text-white/30 cursor-not-allowed'
                                        : 'text-white hover:bg-white/20 active:scale-95'
                                }`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Opciones del menú */}
                <div className="py-2">
                    {opcionesMenu.map((opcion) => {
                        const Icono = opcion.icono;
                        const esActivo =
                            location.pathname === opcion.ruta ||
                            (opcion.id === 'dashboard' && location.pathname === '/business-studio');

                        return (
                            <button
                                key={opcion.id}
                                onClick={() => handleNavegar(opcion.ruta)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                    esActivo
                                        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-500'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icono className={`w-5 h-5 ${esActivo ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className={`font-medium ${esActivo ? 'text-blue-600' : ''}`}>
                                    {opcion.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

export default DrawerBusinessStudio;