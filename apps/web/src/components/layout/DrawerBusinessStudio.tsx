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
import { useLocation } from 'react-router-dom';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useBackNativo } from '../../hooks/useBackNativo';
import {
    X,
    ChartNoAxesCombined,
    LayoutDashboard,
    HelpCircle,
    User,
    ShoppingBag,
    Tag,
    Users,
    Receipt,
    UserCog,
    FileBarChart,
    Building2,
    Coins,
    MessageSquare,
} from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Briefcase = (p: IconoWrapperProps) => <Icon icon={ICONOS.empleos} {...p} />;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
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
    // Navegación entre módulos hermanos de BS: replace para que el back
    // nativo regrese a /inicio en lugar de saltar entre módulos.
    const navegarASeccion = useNavegarASeccion();

    // Back nativo del celular / flecha del navegador → cierra el drawer (es un
    // overlay móvil deslizante). Sin esto el back no lo cerraba y sacaba al
    // usuario de Business Studio. El componente se monta SIEMPRE con la prop
    // `abierto`, así que el hook reacciona a ella (empuja al abrir, limpia al
    // cerrar). Discriminador propio para no chocar con otros overlays.
    useBackNativo({ abierto, onCerrar, discriminador: '_drawerBS' });

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

    // Sin CardYA el módulo solo sirve para tarjetas de sellos → "Recompensas".
    const participaPuntos = usuario?.participaPuntos ?? false;

    // Filtrar opciones: ocultar "Sucursales" y "Puntos" para gerentes y dueños en sucursal secundaria
    const opcionesFiltradas = (vistaComoGerente
        ? opcionesMenu.filter((opcion) => opcion.id !== 'sucursales' && opcion.id !== 'puntos')
        : opcionesMenu
    ).map((opcion) =>
        opcion.id === 'puntos' && !participaPuntos ? { ...opcion, label: 'Tarjeta de Sellos' } : opcion
    );

    // Handler de navegación. Cerramos el drawer PRIMERO y navegamos un instante
    // después: con useBackNativo el drawer empuja una entrada al history que se
    // limpia con un history.back() diferido al cerrar; si navegáramos en el
    // mismo gesto, el `replace` de navegarASeccion pisaría esa entrada y dejaría
    // el módulo hermano en el historial (back a la hermana en vez de a /inicio).
    // Mismo patrón que MenuDrawer.handleNavegar.
    const handleNavegar = (ruta: string) => {
        onCerrar();
        window.setTimeout(() => navegarASeccion(ruta), 130);
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

            {/* Panel — mismo tono que la lista de ChatYA (azul royal → negro) */}
            <div
                className="fixed top-0 left-0 bottom-0 w-[68%] max-w-[300px] shadow-2xl overflow-y-auto animate-slide-in-left"
                style={{ zIndex: 1002, background: 'linear-gradient(to bottom, #0B358F, #000000)' }}
            >
                {/* Header del drawer — ícono + Business Studio */}
                <div className="relative px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', boxShadow: '0 6px 16px rgba(37,99,235,0.4)' }}
                            >
                                <ChartNoAxesCombined className="w-5 h-5 text-white" strokeWidth={2.2} />
                            </div>
                            <span className="text-xl font-extrabold text-white tracking-tight">
                                Business<span className="text-blue-400">Studio</span>
                            </span>
                        </div>
                        <button
                            onClick={onCerrar}
                            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Opciones del menú */}
                <div className="relative py-2">
                    {opcionesFiltradas.map((opcion) => {
                        const Icono = opcion.icono;
                        const esActivo =
                            location.pathname === opcion.ruta ||
                            (opcion.id === 'dashboard' && location.pathname === '/business-studio');

                        return (
                            <button
                                key={opcion.id}
                                onClick={() => handleNavegar(opcion.ruta)}
                                style={esActivo ? { background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' } : undefined}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 border-r-4 ${esActivo
                                        ? 'text-white border-blue-300'
                                        : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icono className={`w-5 h-5 ${esActivo ? 'text-white' : 'text-slate-400'}`} />
                                <span className={`font-medium whitespace-nowrap flex items-center gap-2 ${esActivo ? 'text-white' : ''}`}>
                                    {opcion.label}
                                    {opcion.id === 'alertas' && alertasNoLeidas > 0 && (
                                        <span className={`text-[10px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-bold ${esActivo ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
                                            {alertasNoLeidas > 99 ? '99+' : alertasNoLeidas}
                                        </span>
                                    )}
                                    {opcion.id === 'opiniones' && opinionesPendientes > 0 && (
                                        <span className={`text-[10px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-bold ${esActivo ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
                                            {opinionesPendientes > 99 ? '99+' : opinionesPendientes}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}

                    {/* Ayuda y Tutoriales — sección top-level (hermana de /inicio):
                        handleNavegar → navegarASeccion aplica replace para que el back
                        regrese a /inicio, consistente con Guardados/Mi Perfil del menú. */}
                    <button
                        onClick={() => handleNavegar('/ayuda')}
                        style={location.pathname === '/ayuda' ? { background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' } : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 border-r-4 ${location.pathname === '/ayuda'
                                ? 'text-white border-blue-300'
                                : 'text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <HelpCircle className={`w-5 h-5 ${location.pathname === '/ayuda' ? 'text-white' : 'text-slate-400'}`} />
                        <span className={`font-medium whitespace-nowrap ${location.pathname === '/ayuda' ? 'text-white' : ''}`}>
                            Ayuda
                        </span>
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
}

export default DrawerBusinessStudio;