/**
 * DrawerBusinessStudio.tsx
 * =========================
 * Drawer lateral con menú de navegación para Business Studio (móvil).
 *
 * Se abre desde la barra de info del negocio en MobileHeader.
 * Contiene todas las secciones disponibles en Business Studio.
 * 
 * ACTUALIZADO: Versión compacta sin info de negocio
 *
 * Ubicación: apps/web/src/components/layout/DrawerBusinessStudio.tsx
 */

import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import {
    X,
    LayoutDashboard,
    User,
    ShoppingBag,
    Tag,
    Users,
    Receipt,
    UserCog,
    FileBarChart,
    Building2,
    Coins,
    Briefcase,
    Bell,
    MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAlertasKPIs } from '../../hooks/queries/useAlertas';
import { useResenasKPIs } from '../../hooks/queries/useResenas';

// =============================================================================
// TIPOS
// =============================================================================

interface DrawerBusinessStudioProps {
    abierto: boolean;
    onCerrar: () => void;
}

// =============================================================================
// OPCIONES DEL MENÚ (ordenadas según frecuencia de uso y agrupación lógica)
// =============================================================================
//
// ORGANIZACIÓN:
// 1. Operación Diaria - Dashboard, Transacciones, Clientes, Opiniones, Alertas
// 2. Catálogo & Promociones - Catálogo, Ofertas, Cupones
// 3. Engagement & Recompensas - Puntos
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
    { id: 'ofertas', label: 'Promociones', icono: Tag, ruta: '/business-studio/ofertas' },

    // =========== ENGAGEMENT & RECOMPENSAS ===========
    { id: 'puntos', label: 'Puntos y Recompensas', icono: Coins, ruta: '/business-studio/puntos' },

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
    // Navegación entre módulos hermanos de BS: replace para que el back
    // nativo regrese a /inicio en lugar de saltar entre módulos.
    const navegarASeccion = useNavegarASeccion();

    // Detectar si es gerente
    const usuario = useAuthStore((s) => s.usuario);
    const esGerente = !!usuario?.sucursalAsignada;
    const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
    const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);

    // Badge de alertas no leídas
    const kpisAlertasQuery = useAlertasKPIs();
    const alertasNoLeidas = kpisAlertasQuery.data?.noLeidas ?? 0;

    // Badge de opiniones sin responder
    const kpisResenasQuery = useResenasKPIs();
    const opinionesPendientes = kpisResenasQuery.data?.pendientes ?? 0;

    // Filtrar opciones: ocultar "Sucursales" y "Puntos" para gerentes y dueños en sucursal secundaria
    const opcionesFiltradas = vistaComoGerente
        ? opcionesMenu.filter((opcion) => opcion.id !== 'sucursales' && opcion.id !== 'puntos')
        : opcionesMenu;

    // Handler de navegación
    const handleNavegar = (ruta: string) => {
        navegarASeccion(ruta);
        onCerrar();
    };

    // No renderizar si está cerrado
    if (!abierto) return null;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50"
                style={{ zIndex: 1001 }}
                data-bloquear-swipe
                onClick={onCerrar}
            />

            {/* Panel */}
            <div className="fixed top-0 left-0 bottom-0 w-[60%] bg-white shadow-2xl overflow-y-auto animate-slide-in-left" style={{ zIndex: 1002 }}>
                {/* Header del drawer */}
                <div className="bg-linear-to-r from-gray-900 to-blue-600 text-white px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/BusinessStudio.webp" alt="Business Studio" className="h-7 w-auto object-contain" />
                        </div>
                        <button
                            onClick={onCerrar}
                            className="p-1.5 hover:bg-white/20 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Opciones del menú */}
                <div className="py-2">
                    {opcionesFiltradas.map((opcion) => {
                        const Icono = opcion.icono;
                        const esActivo =
                            location.pathname === opcion.ruta ||
                            (opcion.id === 'dashboard' && location.pathname === '/business-studio');

                        return (
                            <button
                                key={opcion.id}
                                onClick={() => handleNavegar(opcion.ruta)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 ${esActivo
                                        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-500'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icono className={`w-5 h-5 ${esActivo ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className={`font-medium whitespace-nowrap flex items-center gap-2 ${esActivo ? 'text-blue-600' : ''}`}>
                                    {opcion.label}
                                    {opcion.id === 'alertas' && alertasNoLeidas > 0 && (
                                        <span className="text-[10px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-bold bg-red-500 text-white">
                                            {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
                                        </span>
                                    )}
                                    {opcion.id === 'opiniones' && opinionesPendientes > 0 && (
                                        <span className="text-[10px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-bold bg-red-500 text-white">
                                            {opinionesPendientes > 99 ? '99+' : opinionesPendientes}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>,
        document.body
    );
}

export default DrawerBusinessStudio;