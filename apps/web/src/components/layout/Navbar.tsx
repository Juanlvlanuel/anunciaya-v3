// apps/web/src/components/layout/Navbar.tsx
// Navbar principal para vistas de escritorio (laptop y desktop)
// Estilo: Glass sobre fondo Acero Claro + Botón activo gradiente rojo
// OPTIMIZADO: Propuesta 3 - Híbrido (laptop 1366x768 compacto, desktop 1920x1080 espacioso)
// v2.7: Dropdown - SEPARACIÓN COMPLETA POR CONTEXTO (Personal + Comercial)
//
// CAMBIOS v2.7 (19 Dic 2024):
// - Removido CardYA y Mis Cupones del dropdown personal (están en ColumnaIzquierda como accesos rápidos)
// - Dropdown personal solo contiene: Mis Publicaciones + opciones comunes
// - Dropdown comercial solo contiene: opciones comunes (Mi Perfil, Configuración, Guardados)
// - SEPARACIÓN COMPLETA: ColumnaIzq = Info/Accesos, Dropdown = Navegación/Config
//
// CAMBIOS v2.6:
// - Removida sección MI NEGOCIO del dropdown comercial
// - Herramientas de negocio (ScanYA, Business Studio) están en ColumnaIzquierda

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  Store,
  ShoppingCart,
  Tag,
  Gift,
  Briefcase,
  User,
  Settings,
  LogOut,
  Eye,
  X,
  BarChart3,
  Heart,
  FileText,
} from 'lucide-react';

// Stores
import { useAuthStore } from '../../stores/useAuthStore';
import Tooltip from '../ui/Tooltip';
import { useUiStore } from '../../stores/useUiStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { ToggleModoUsuario } from '../ui/ToggleModoUsuario';
import SelectorSucursalesInline from './SelectorSucursalesInline';

// =============================================================================
// CONFIGURACIÓN DE NAVEGACIÓN
// =============================================================================

const NAV_ITEMS_BASE = [
  { id: 'negocios', label: 'Negocios', path: '/negocios', icon: Store },
  { id: 'ofertas', label: 'Ofertas', path: '/ofertas', icon: Tag },
  { id: 'dinamicas', label: 'Dinámicas', path: '/dinamicas', icon: Gift },
  { id: 'empleos', label: 'Empleos', path: '/empleos', icon: Briefcase },
];
// =============================================================================
// MÓDULOS DEL BUSINESS STUDIO (en orden)
// =============================================================================

const MODULOS_BS = [
  { nombre: 'Dashboard', ruta: '/business-studio' },
  { nombre: 'Transacciones', ruta: '/business-studio/transacciones' },
  { nombre: 'Clientes', ruta: '/business-studio/clientes' },
  { nombre: 'Opiniones', ruta: '/business-studio/opiniones' },
  { nombre: 'Alertas', ruta: '/business-studio/alertas' },
  { nombre: 'Catálogo', ruta: '/business-studio/catalogo' },
  { nombre: 'Ofertas', ruta: '/business-studio/ofertas' },
  { nombre: 'Cupones', ruta: '/business-studio/cupones' },
  { nombre: 'Puntos', ruta: '/business-studio/puntos' },
  { nombre: 'Rifas', ruta: '/business-studio/rifas' },
  { nombre: 'Empleados', ruta: '/business-studio/empleados' },
  { nombre: 'Vacantes', ruta: '/business-studio/vacantes' },
  { nombre: 'Reportes', ruta: '/business-studio/reportes' },
  { nombre: 'Sucursales', ruta: '/business-studio/sucursales' },
  { nombre: 'Mi Perfil', ruta: '/business-studio/perfil' },
];


const NAV_ITEM_MARKET = { id: 'market', label: 'Market', path: '/marketplace', icon: ShoppingCart };


// =============================================================================
// SUBCOMPONENTE: DropdownItem (VERSIÓN PREMIUM)
// =============================================================================

interface DropdownItemProps {
  icon: React.ElementType;
  label: string;
  badge?: number;
  bgColor?: string;
  iconColor?: string;
  hoverGradient?: string;
  arrowColor?: string;
  onClick: () => void;
}

function DropdownItem({
  icon: Icon,
  label,
  badge,
  bgColor = 'bg-gray-100',
  iconColor = 'text-gray-600',
  hoverGradient = 'hover:from-gray-50',
  arrowColor = 'text-gray-400 group-hover:text-blue-500',
  onClick,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 lg:px-2 lg:py-1.5 2xl:px-4 2xl:py-2.5 px-4 py-2.5 hover:bg-linear-to-r ${hoverGradient} hover:to-transparent group transition-all duration-150 hover:translate-x-1`}
    >
      {/* Icono con background circular */}
      <div
        className={`lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-150 shadow-sm shrink-0`}
      >
        <Icon className={`lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 w-4 h-4 ${iconColor}`} />
      </div>

      {/* Label */}
      <span className="font-semibold text-gray-900 lg:text-[10px] 2xl:text-sm text-sm flex-1 text-left">{label}</span>

      {/* Badge o Chevron */}
      {badge !== undefined && badge > 0 ? (
        <span className="bg-blue-500 text-white lg:text-[9px] 2xl:text-xs text-xs lg:px-1 lg:py-0.5 2xl:px-2 2xl:py-0.5 px-2 py-0.5 rounded-full font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : (
        <svg
          className={`lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 w-4 h-4 ${arrowColor} group-hover:translate-x-1 transition-all duration-150`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  );
}

// =============================================================================
// COMPONENTE NAVBAR
// =============================================================================

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADO LOCAL Y REFS
  // ─────────────────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Cerrar dropdown al hacer click en cualquier parte fuera
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dropdownAbierto) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Si el click fue fuera del dropdown, cerrarlo
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAbierto(false);
      }
    };

    // Agregar listener global al documento
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup: remover listener cuando se cierre o desmonte
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownAbierto]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STORES
  // ─────────────────────────────────────────────────────────────────────────────

  // Auth Store
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);

  // UI Store
  const abrirModalUbicacion = useUiStore((state) => state.abrirModalUbicacion);
  const toggleChatYA = useUiStore((state) => state.toggleChatYA);

  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);
  const togglePreviewNegocio = useUiStore((state) => state.togglePreviewNegocio);
  // ─────────────────────────────────────────────────────────────────────────────
  // NAVEGACIÓN ENTRE MÓDULOS DEL BUSINESS STUDIO
  // ─────────────────────────────────────────────────────────────────────────────

  const obtenerIndiceModuloActual = () => {
    // Buscar coincidencia exacta primero
    const indiceExacto = MODULOS_BS.findIndex(modulo => location.pathname === modulo.ruta);
    if (indiceExacto !== -1) return indiceExacto;
    
    // Si no hay coincidencia exacta, buscar el que empiece con la ruta (excepto Dashboard)
    return MODULOS_BS.findIndex(modulo => 
      modulo.ruta !== '/business-studio' && location.pathname.startsWith(modulo.ruta)
    );
  };

  const obtenerNombreModuloActual = () => {
    if (location.pathname === '/business-studio') return 'Dashboard';
    if (location.pathname.includes('/transacciones')) return 'Transacciones';
    if (location.pathname.includes('/clientes')) return 'Clientes';
    if (location.pathname.includes('/opiniones')) return 'Opiniones';
    if (location.pathname.includes('/alertas')) return 'Alertas';
    if (location.pathname.includes('/catalogo')) return 'Catálogo';
    if (location.pathname.includes('/ofertas')) return 'Ofertas';
    if (location.pathname.includes('/cupones')) return 'Cupones';
    if (location.pathname.includes('/puntos')) return 'Puntos';
    if (location.pathname.includes('/rifas')) return 'Rifas';
    if (location.pathname.includes('/empleados')) return 'Empleados';
    if (location.pathname.includes('/vacantes')) return 'Vacantes';
    if (location.pathname.includes('/reportes')) return 'Reportes';
    if (location.pathname.includes('/sucursales')) return 'Sucursales';
    if (location.pathname.includes('/perfil')) return 'Mi Perfil';
    return 'Dashboard';
  };

  const navegarModuloAnterior = () => {
    const indiceActual = obtenerIndiceModuloActual();
    if (indiceActual > 0) {
      navigate(MODULOS_BS[indiceActual - 1].ruta);
    }
  };

  const navegarModuloSiguiente = () => {
    const indiceActual = obtenerIndiceModuloActual();
    if (indiceActual >= 0 && indiceActual < MODULOS_BS.length - 1) {
      navigate(MODULOS_BS[indiceActual + 1].ruta);
    }
  };

  const indiceModuloActual = obtenerIndiceModuloActual();
  const hayModuloAnterior = indiceModuloActual > 0;
  const hayModuloSiguiente = indiceModuloActual >= 0 && indiceModuloActual < MODULOS_BS.length - 1;


  // GPS Store
  const ciudad = useGpsStore((state) => state.ciudad);
  const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);
  const setCiudad = useGpsStore((state) => state.setCiudad);

  // Notificaciones Store
  const cantidadNoLeidas = useNotificacionesStore((state) => state.cantidadNoLeidas);
  const togglePanel = useNotificacionesStore((state) => state.togglePanel);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Auto-detectar ubicación al cargar (solo si no hay ciudad)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Solo detectar si NO hay ciudad guardada
    if (ciudad) {
      return;
    }

    const autoDetectar = async () => {
      try {
        const coordenadas = await obtenerUbicacion();

        if (coordenadas) {
          // Importar dinámicamente la función de búsqueda
          const { buscarCiudadCercana } = await import('../../data/ciudadesPopulares');

          const ciudadCercana = buscarCiudadCercana(
            coordenadas.latitud,
            coordenadas.longitud
          );

          if (ciudadCercana) {
            setCiudad(
              ciudadCercana.nombre,
              ciudadCercana.estado
              // NO pasar coordenadas - mantener las del GPS real
            );
          } else {
            console.warn('⚠️ [NAVBAR] No se encontró ciudad cercana');
          }
        }
      } catch (error) {
        console.error('❌ [NAVBAR] Error en auto-detección:', error);
      }
    };

    autoDetectar();
  }, []); // Solo al montar el componente

  // ─────────────────────────────────────────────────────────────────────────────
  // DATOS DERIVADOS
  // ─────────────────────────────────────────────────────────────────────────────

  const ubicacionTexto = ciudad?.nombreCompleto || 'Seleccionar ubicación';
  const esComercial = usuario?.modoActivo === 'comercial';

  // Avatar e inicial dinámicos según modo
  const avatarUrl = esComercial
    ? usuario?.fotoPerfilNegocio || null
    : usuario?.avatar || null;

  const usuarioInicial = esComercial
    ? usuario?.nombreNegocio?.charAt(0).toUpperCase() || 'N'
    : usuario?.nombre?.charAt(0).toUpperCase() || '?';

  const esBusinessStudio = location.pathname.startsWith('/business-studio');
  // NAV_ITEMS dinámicos según modo
  const NAV_ITEMS = esComercial
    ? NAV_ITEMS_BASE
    : [NAV_ITEMS_BASE[0], NAV_ITEM_MARKET, ...NAV_ITEMS_BASE.slice(1)];

  // TODO: Conectar con sistema de mensajes real
  const mensajesCount = 2;

  // TODO: Estos datos deben venir del store o API
  const cuponesActivos = 3;

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleCerrarSesion = () => {
    setDropdownAbierto(false);
    navigate('/');
    logout();
  };

  const handleBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implementar búsqueda global
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    // Contenedor con fondo gradiente Acero Claro
    <div className="bg-linear-to-br from-slate-50 via-slate-200 to-slate-300 p-2 lg:p-2.5 2xl:p-3 relative z-100">
      {/* Header Glass */}
      <header
        className="
          bg-white/85 backdrop-blur-xl
          border border-white/50 
          rounded-xl lg:rounded-2xl
          shadow-sm
          px-4 lg:px-4 2xl:px-8 
          py-2 lg:py-2.5 2xl:py-3
          h-[52px] lg:h-[52px] 2xl:h-14
          relative z-100
        "
      >
        <div className="flex items-center justify-between h-full gap-3">

          {/* ===== LOGO ===== */}
          <Link to="/inicio" className="flex items-center shrink-0 relative group">
            <img
              src="/logo-anunciaya-blanco.webp"
              alt="AnunciaYA"
              className="h-10 lg:h-10 2xl:h-12 w-auto object-contain hover:scale-110 transition-transform"
            />

            {/* Tooltip personalizado - ABAJO */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Ir a Inicio
              {/* Flecha apuntando hacia arriba */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-800"></div>
            </div>
          </Link>

          {/* ===== UBICACIÓN + BUSCADOR + NAVEGACIÓN (ocultos en Business Studio) ===== */}
          {!esBusinessStudio ? (
            <>
              {/* ===== UBICACIÓN ===== */}
              <button
                onClick={abrirModalUbicacion}
                className="
                  flex items-center gap-1 lg:gap-1 2xl:gap-2 
                  px-2 lg:px-2.5 2xl:px-3 
                  py-1 lg:py-1.5 2xl:py-2 
                  text-gray-600 
                  hover:text-blue-600 hover:bg-white/50 
                  rounded-lg 
                  transition-colors
                  shrink-0
                "
              >
                <MapPin className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-500" />
                <span className="text-xs lg:text-xs 2xl:text-sm font-medium max-w-[100px] lg:max-w-[100px] 2xl:max-w-[180px] truncate">
                  {ubicacionTexto}
                </span>
                <ChevronDown className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-gray-400" />
              </button>

              {/* ===== BUSCADOR ===== */}
              <form onSubmit={handleBusqueda} className="relative shrink-0">
                <Search
                  className="absolute left-2.5 lg:left-2.5 2xl:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-gray-400"
                />
                <input
                  id="input-busqueda-navbar"
                  name="input-busqueda-navbar"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="
                  w-72 lg:w-[260px] 2xl:w-[450px]
                  pl-8 lg:pl-9 2xl:pl-11 
                  pr-3 lg:pr-3 2xl:pr-4 
                  py-1.5 lg:py-1.5 2xl:py-2.5
                  bg-white/90 
                  border border-white/50 
                  rounded-full 
                  text-xs lg:text-xs 2xl:text-sm
                  shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-slate-400
                  placeholder:text-gray-400
                "
                />
              </form>

              {/* ===== NAVEGACIÓN ===== */}
              <nav className="flex items-center shrink-0">
                {NAV_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <div key={item.id} className="flex items-center">
                      {index > 0 && (
                        <div className="w-px h-4 lg:h-5 2xl:h-6 bg-slate-300/50 mx-0.5 lg:mx-0.5 2xl:mx-1.5" />
                      )}

                      <Link
                        to={item.path}
                        className={`
                flex items-center gap-1 lg:gap-1.5 2xl:gap-2
                px-2 lg:px-3 2xl:px-4
                py-1.5 lg:py-1.5 2xl:py-2.5
                rounded-lg lg:rounded-lg 2xl:rounded-xl
                text-xs lg:text-xs 2xl:text-sm
                font-medium
                transition-all
                ${active
                            ? 'bg-linear-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/30'
                            : 'text-gray-600 hover:bg-slate-200 hover:text-gray-900'
                          }
              `}
                      >
                        <Icon className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                        {item.label}
                      </Link>
                    </div>
                  );
                })}
              </nav>
            </>
          ) : (
            /* ===== HEADER BUSINESS STUDIO (Nombre negocio + Breadcrumb) ===== */
            <>
              {/* Separador + Nombre del negocio */}
              <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4 ml-4 lg:ml-6 2xl:ml-8">
                <div className="w-px h-8 lg:h-8 2xl:h-10 bg-gray-300" />

                <div className="flex items-center gap-2 lg:gap-2 2xl:gap-3">
                  <div className="w-8 h-8 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 bg-linear-to-br from-orange-400 to-orange-500 rounded-lg lg:rounded-xl 2xl:rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                    {usuario?.logoNegocio ? (
                      <img
                        src={usuario.logoNegocio}
                        alt={usuario?.nombreNegocio || 'Negocio'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <SelectorSucursalesInline />
                  </div>
                </div>
              </div>

              {/* Breadcrumb centrado con navegación */}
              <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4 flex-1 justify-center">
                <BarChart3 className="w-4 h-4 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-blue-500" />
                <span className="text-sm lg:text-lg 2xl:text-xl font-semibold text-gray-800">Business Studio</span>
                
                {/* Flecha izquierda - Módulo anterior */}
                {hayModuloAnterior ? (
                  <Tooltip text="Módulo anterior" position="bottom">
                    <button
                      onClick={navegarModuloAnterior}
                      className="p-1 rounded transition-colors text-blue-600 hover:bg-blue-50 active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    disabled
                    className="p-1 rounded transition-colors text-gray-300 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                  </button>
                )}

                {/* Nombre del módulo actual */}
                <span className="text-sm lg:text-lg 2xl:text-xl font-bold text-blue-600 min-w-[100px] text-center">
                  {obtenerNombreModuloActual()}
                </span>

                {/* Flecha derecha - Módulo siguiente */}
                {hayModuloSiguiente ? (
                  <Tooltip text="Módulo siguiente" position="bottom">
                    <button
                      onClick={navegarModuloSiguiente}
                      className="p-1 rounded transition-colors text-blue-600 hover:bg-blue-50 active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    disabled
                    className="p-1 rounded transition-colors text-gray-300 cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                  </button>
                )}
              </div>

              {/* Botón Ver mi Negocio */}
              <button
                onClick={togglePreviewNegocio}
                className={`
                  flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2
                  px-3 lg:px-3 2xl:px-5
                  py-1.5 lg:py-1.5 2xl:py-2.5
                  rounded-lg lg:rounded-lg 2xl:rounded-xl
                  text-xs lg:text-xs 2xl:text-sm
                  font-semibold
                  shadow-md
                  transition-all
                  ${previewNegocioAbierto
                    ? 'bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    : 'bg-linear-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                  }
                `}
              >
                {previewNegocioAbierto ? (
                  <>
                    <X className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    <span>Cerrar Preview</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    <span>Ver mi Negocio</span>
                  </>
                )}
              </button>
            </>
          )}
          {/* ===== ACCIONES ===== */}
          <div className="flex items-center gap-2 lg:gap-2 2xl:gap-3 shrink-0">

            {/* ChatYA */}
            <button
              data-chatya-button="true"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleChatYA();
              }}
              className="
                relative 
                flex items-center justify-center
                transition-transform
                hover:scale-110
              "
            >
              <img
                src="/ChatYA.webp"
                alt="ChatYA"
                className="w-auto h-8 lg:h-7 2xl:h-9 object-contain"
              />
              {mensajesCount > 0 && (
                <span
                  className="
                    absolute -top-2 lg:-top-2 2xl:-top-2.5 -right-2 lg:-right-2 2xl:-right-2.5
                    min-w-4 lg:min-w-4 2xl:min-w-5
                    h-4 lg:h-4 2xl:h-5
                    bg-red-500 
                    text-white 
                    text-[9px] lg:text-[9px] 2xl:text-xs
                    rounded-full 
                    flex items-center justify-center 
                    font-bold
                    ring-2 ring-white
                  "
                >
                  {mensajesCount}
                </span>
              )}
            </button>

            {/* Notificaciones */}
            <button
              onClick={togglePanel}
              className="
                relative 
                p-1.5 lg:p-1.5 2xl:p-2.5
                text-gray-500 
                hover:text-gray-800 hover:bg-white/50 
                rounded-full 
                transition-colors
              "
              title="Notificaciones"
            >
              <Bell className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" />
              {cantidadNoLeidas > 0 && (
                <span
                  className="
                    absolute -top-0.5 lg:-top-0.5 2xl:top-0 -right-0.5 lg:-right-0.5 2xl:right-0
                    min-w-4 lg:min-w-4 2xl:min-w-5
                    h-4 lg:h-4 2xl:h-5
                    bg-red-500 
                    text-white 
                    text-[9px] lg:text-[9px] 2xl:text-xs
                    rounded-full 
                    flex items-center justify-center 
                    font-bold
                  "
                >
                  {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                </span>
              )}
            </button>

            {/* Avatar con Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownAbierto(!dropdownAbierto)}
                className="
                  w-8 h-8 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10
                  bg-blue-500 hover:bg-blue-700
                  rounded-full 
                  flex items-center justify-center 
                  text-white 
                  text-xs lg:text-xs 2xl:text-base
                  font-semibold 
                  shadow-sm
                  transition-colors
                  overflow-hidden
                "
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={esComercial ? (usuario?.nombreNegocio || 'Negocio') : (usuario?.nombre || 'Usuario')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  usuarioInicial
                )}
              </button>


              {/* Dropdown Menu v2.7 - SEPARACIÓN COMPLETA POR CONTEXTO */}
              {/* Comercial: Solo opciones comunes (Negocio en ColumnaIzquierda) */}
              {/* Personal: Mis Publicaciones + opciones comunes (CardYA/Cupones en ColumnaIzquierda) */}
              {dropdownAbierto && (
                <div className="absolute right-0 top-full mt-2 lg:w-56 2xl:w-72 w-72 bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden z-99999">

                  {/* ===== HEADER CON GRADIENTE METÁLICO ===== */}
                  <div className="bg-linear-to-r from-slate-100 via-slate-200 to-slate-100 border-b border-gray-300 lg:p-2 2xl:p-4 p-4">
                    {/* Info del usuario - DISEÑO VERTICAL CENTRADO */}
                    <div className="flex flex-col items-center text-center">
                      {/* Nivel 1: Avatar */}
                      <div className="relative lg:mb-1.5 2xl:mb-3 mb-3">
                        <div
                          className={`lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 w-16 h-16 rounded-full flex items-center justify-center text-white lg:text-lg 2xl:text-2xl text-2xl font-bold shadow-lg ring-4 ${esComercial
                            ? 'bg-linear-to-br from-orange-400 to-orange-600 ring-orange-100'
                            : 'bg-linear-to-br from-blue-400 to-blue-600 ring-blue-100'
                            } overflow-hidden`}
                        >
                          {esComercial ? (
                            usuario?.fotoPerfilNegocio ? (
                              <img
                                src={usuario.fotoPerfilNegocio}
                                alt={usuario?.nombreNegocio || 'Negocio'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              usuario?.nombreNegocio?.charAt(0).toUpperCase() || 'N'
                            )
                          ) : (
                            avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={usuario?.nombre || 'Usuario'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              usuarioInicial
                            )
                          )}
                        </div>
                        {/* Indicador online */}
                        <div className="absolute bottom-0 right-0 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 w-5 h-5 bg-green-500 rounded-full border-4 border-slate-200 shadow-md"></div>
                      </div>

                      {/* Nivel 2: Toggle de modo */}
                      <div className="lg:mb-1 2xl:mb-2 mb-2">
                        <ToggleModoUsuario onModoChanged={() => setDropdownAbierto(false)} />
                      </div>

                      {/* Nivel 3: Nombre */}
                      <p className="font-bold text-gray-900 lg:text-xs 2xl:text-base text-base mb-0.5 px-2 truncate w-full">
                        {esComercial && usuario?.nombreNegocio
                          ? usuario.nombreNegocio
                          : `${usuario?.nombre} ${usuario?.apellidos}`}
                      </p>

                      {/* Nivel 4: Correo */}
                      <p className="lg:text-[10px] 2xl:text-sm text-sm text-gray-600 px-2 truncate w-full">
                        {esComercial && usuario?.correoNegocio
                          ? usuario.correoNegocio
                          : usuario?.correo}
                      </p>
                    </div>
                  </div>

                  {/* ===== OPCIONES DE NAVEGACIÓN - v2.7 SEPARACIÓN COMPLETA ===== */}
                  <div className="lg:py-1 2xl:py-2 py-2">

                    {/* === OPCIONES ESPECÍFICAS PERSONAL === */}
                    {!esComercial && (
                      <>
                        {/* Mis Publicaciones */}
                        <DropdownItem
                          icon={FileText}
                          label="Mis Publicaciones"
                          bgColor="bg-purple-100"
                          iconColor="text-purple-600"
                          hoverGradient="hover:from-purple-50"
                          onClick={() => {
                            navigate('/mis-publicaciones');
                            setDropdownAbierto(false);
                          }}
                        />

                        {/* Divisor antes de opciones comunes */}
                        <div className="lg:my-1.5 lg:mx-3 2xl:my-2 2xl:mx-4 my-2 mx-4 h-px bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                      </>
                    )}

                    {/* === OPCIONES COMUNES (TODOS) === */}

                    {/* Mi Perfil */}
                    <DropdownItem
                      icon={User}
                      label="Mi Perfil"
                      bgColor="bg-blue-100"
                      iconColor="text-blue-600"
                      hoverGradient="hover:from-blue-50"
                      onClick={() => {
                        navigate('/perfil');
                        setDropdownAbierto(false);
                      }}
                    />

                    {/* Configuración */}
                    <DropdownItem
                      icon={Settings}
                      label="Configuración"
                      bgColor="bg-gray-100"
                      iconColor="text-gray-600"
                      hoverGradient="hover:from-gray-50"
                      onClick={() => {
                        navigate('/configuracion');
                        setDropdownAbierto(false);
                      }}
                    />

                    {/* Guardados */}
                    <DropdownItem
                      icon={Heart}
                      label="Mis Guardados"
                      bgColor="bg-pink-100"
                      iconColor="text-pink-600"
                      hoverGradient="hover:from-pink-50"
                      onClick={() => {
                        navigate('/guardados');
                        setDropdownAbierto(false);
                      }}
                    />
                  </div>

                  {/* ===== FOOTER: CERRAR SESIÓN ===== */}
                  <div className="lg:p-1.5 2xl:p-3 p-3 border-t border-gray-200 bg-linear-to-b from-transparent to-gray-50">
                    <button
                      onClick={handleCerrarSesion}
                      className="w-full flex items-center justify-center gap-2 lg:py-1.5 2xl:py-3 py-3 bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg transition-all duration-150 font-bold lg:text-[10px] 2xl:text-sm text-sm active:scale-95"
                    >
                      <LogOut className="lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Navbar;