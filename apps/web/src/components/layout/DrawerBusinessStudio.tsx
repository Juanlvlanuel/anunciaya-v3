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

import { useLocation, useNavigate } from 'react-router-dom';
import {
    X,
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
    MessageSquare,
} from 'lucide-react';

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
            <div className="fixed top-0 left-0 bottom-0 w-[60%] bg-white z-61 shadow-2xl overflow-y-auto">
                {/* Header del drawer */}
                <div className="bg-linear-to-r from-gray-900 to-blue-600 text-white px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src="/BusinessStudio.webp" alt="Business Studio" className="h-7 w-auto object-contain" />
                        </div>
                        <button
                            onClick={onCerrar}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
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