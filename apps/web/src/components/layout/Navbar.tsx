// apps/web/src/components/layout/Navbar.tsx
// Navbar principal para vistas de escritorio (laptop y desktop)
// REDISEÑO v3.0: Estilo Slate con Header Azul Gradiente + Línea Brillante
// - Gradiente azul animado en header
// - Línea brillante inferior (shine effect)
// - Columnas pegadas a bordes (sin padding exterior)
// - Animaciones pasivas sutiles
//
// MANTIENE TODA LA FUNCIONALIDAD v2.7:
// - Modo dinámico (Normal vs Business Studio)
// - Dropdown sucursales en BS
// - Navegación entre módulos BS
// - Dropdown usuario con toggle de modo

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
  Heart,
  FileText,
} from 'lucide-react';

// Stores
import { useAuthStore } from '../../stores/useAuthStore';
import Tooltip from '../ui/Tooltip';
import { useUiStore } from '../../stores/useUiStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { useNegociosCacheStore } from '../../stores/useNegociosCacheStore';
import { ToggleModoUsuario } from '../ui/ToggleModoUsuario';
import SelectorSucursalesInline from './SelectorSucursalesInline';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `
  /* Gradiente del header - estático simple */
  .header-gradient-animated {
    background: linear-gradient(90deg, #1e3a8a, #2563eb);
  }
  
  /* Línea brillante que recorre horizontalmente */
  @keyframes shineLineMove {
    0% { transform: translateX(-100%); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateX(300%); opacity: 0; }
  }
  
  .header-shine-line {
    position: relative;
    height: 5px;
    background: linear-gradient(90deg, #1e3a8a, #3b82f6, #60a5fa, #3b82f6, #1e3a8a);
    overflow: hidden;
  }
  
  .header-shine-line::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
    animation: shineLineMove 2.5s ease-in-out infinite;
    will-change: transform;
  }
  
  /* Pulso suave para badges */
  @keyframes pulseBadge {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  .pulse-badge {
    animation: pulseBadge 2s ease-in-out infinite;
  }
  
  /* Animación lupa flotante - pulso suave */
  @keyframes searchPulse {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.15); opacity: 1; }
  }
  
  .search-icon-pulse {
    animation: searchPulse 2s ease-in-out infinite;
  }

  /* Fade + slide para texto del buscador */
  @keyframes fadeSlideIn {
    0% { 
      opacity: 0; 
      transform: translateX(-10px);
    }
    100% { 
      opacity: 1; 
      transform: translateX(0);
    }
  }
`;

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
  const [buscadorExpandido, setBuscadorExpandido] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLDivElement>(null);
  const inputBuscadorRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Inyectar estilos de animación
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const styleId = 'navbar-animations';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = animationStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Cerrar dropdown al hacer click en cualquier parte fuera
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dropdownAbierto) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownAbierto]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Cerrar buscador al hacer click fuera
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!buscadorExpandido) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)) {
        // Solo colapsar si no hay texto escrito
        if (!searchQuery.trim()) {
          setBuscadorExpandido(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [buscadorExpandido, searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STORES
  // ─────────────────────────────────────────────────────────────────────────────

  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);

  const abrirModalUbicacion = useUiStore((state) => state.abrirModalUbicacion);
  const toggleChatYA = useUiStore((state) => state.toggleChatYA);
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);
  const togglePreviewNegocio = useUiStore((state) => state.togglePreviewNegocio);

  // ─────────────────────────────────────────────────────────────────────────────
  // NAVEGACIÓN ENTRE MÓDULOS DEL BUSINESS STUDIO
  // ─────────────────────────────────────────────────────────────────────────────

  const obtenerIndiceModuloActual = () => {
    const indiceExacto = MODULOS_BS.findIndex(modulo => location.pathname === modulo.ruta);
    if (indiceExacto !== -1) return indiceExacto;

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
    if (ciudad) {
      return;
    }

    const autoDetectar = async () => {
      try {
        const coordenadas = await obtenerUbicacion();

        if (coordenadas) {
          const { buscarCiudadCercana } = await import('../../data/ciudadesPopulares');

          const ciudadCercana = buscarCiudadCercana(
            coordenadas.latitud,
            coordenadas.longitud
          );

          if (ciudadCercana) {
            setCiudad(
              ciudadCercana.nombre,
              ciudadCercana.estado
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
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATOS DERIVADOS
  // ─────────────────────────────────────────────────────────────────────────────

  const ubicacionTexto = ciudad?.nombreCompleto || 'Seleccionar ubicación';
  const esComercial = usuario?.modoActivo === 'comercial';

  const avatarUrl = esComercial
    ? usuario?.fotoPerfilNegocio || null
    : usuario?.avatar || null;

  const usuarioInicial = esComercial
    ? usuario?.nombreNegocio?.charAt(0).toUpperCase() || 'N'
    : usuario?.nombre?.charAt(0).toUpperCase() || '?';

  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  const NAV_ITEMS = esComercial
    ? NAV_ITEMS_BASE
    : [NAV_ITEMS_BASE[0], NAV_ITEM_MARKET, ...NAV_ITEMS_BASE.slice(1)];

  const mensajesCount = 2;
  const { prefetchListaNegocios } = useNegociosCacheStore();


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

  // Handler para expandir buscador
  const expandirBuscador = () => {
    setBuscadorExpandido(true);
    setInputVisible(true);
    setTimeout(() => inputBuscadorRef.current?.focus(), 100);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Header con gradiente azul animado */}
      <header className="header-gradient-animated shadow-lg">
        <div
          className="
            px-4 lg:px-4 2xl:px-8 
            py-2.5 lg:py-3 2xl:py-4
            h-[60px] lg:h-16 2xl:h-[72px]
          "
        >
          <div className="flex items-center justify-between h-full gap-3">

            {/* ===== LOGO ===== */}
            <Link to="/inicio" className="flex items-center shrink-0 relative group">
              <img
                src="/logo-anunciaya-azul.webp"
                alt="AnunciaYA"
                className="h-8 lg:h-9 2xl:h-11 w-auto object-contain hover:scale-110 transition-transform"
              />

              {/* Tooltip personalizado */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-40">
                Ir a Inicio
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900"></div>
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
                    text-blue-100 
                    hover:text-white hover:bg-white/10 
                    rounded-lg 
                    transition-colors
                    shrink-0
                  "
                >
                  <MapPin className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-300" />
                  <span className="text-xs lg:text-xs 2xl:text-sm font-medium max-w-[100px] lg:max-w-[100px] 2xl:max-w-[180px] truncate">
                    {ubicacionTexto}
                  </span>
                  <ChevronDown className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-300" />
                </button>

                {/* ===== BUSCADOR EXPANDIBLE - Lupa flotante ===== */}
                <div
                  ref={buscadorRef}
                  className="relative flex items-center"
                  onMouseLeave={() => {
                    if (document.activeElement !== inputBuscadorRef.current && !searchQuery.trim()) {
                      setBuscadorExpandido(false);
                    }
                  }}
                >
                  {/* Lupa siempre visible - toggle con click */}
                  <Search
                    className={`
                      w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 
                      text-blue-100 
                      cursor-pointer
                      transition-all
                      z-10
                      hover:text-white hover:scale-110
                      ${!buscadorExpandido ? 'search-icon-pulse' : 'text-white'}
                    `}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Evita que el input pierda foco
                      if (buscadorExpandido) {
                        // Cerrar
                        if (!searchQuery.trim()) {
                          setBuscadorExpandido(false);
                          inputBuscadorRef.current?.blur();
                        }
                      } else {
                        // Abrir
                        setBuscadorExpandido(true);
                        setInputVisible(true);
                        setTimeout(() => inputBuscadorRef.current?.focus(), 100);
                      }
                    }}
                  />

                  {/* Contenedor con ancho fijo para evitar re-ajustes */}
                  <div className="relative ml-2 w-64 lg:w-56 2xl:w-80">

                    {/* Texto - siempre presente, solo cambia opacidad */}
                    <span
                      className={`
                          absolute left-0 top-1/2 -translate-y-1/2
                          text-sm lg:text-xs 2xl:text-sm text-blue-100 
                          cursor-pointer select-none
                          hover:text-white
                          transition-opacity duration-300 ease-out
                          ${!buscadorExpandido && !inputVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                        `}
                      onMouseEnter={() => {
                        setBuscadorExpandido(true);
                        setInputVisible(true);
                      }}
                      onClick={expandirBuscador}
                    >
                      Busca en todo AnunciaYA
                    </span>

                    {/* Input - expansión de izquierda a derecha */}
                    <form
                      onSubmit={handleBusqueda}
                      className={`
                          overflow-hidden transition-[width] duration-300 ease-out
                          ${buscadorExpandido ? 'w-full' : 'w-0'}
                        `}
                      onTransitionEnd={() => {
                        if (!buscadorExpandido) {
                          setInputVisible(false);
                        }
                      }}
                    >
                      <input
                        ref={inputBuscadorRef}
                        id="input-busqueda-navbar"
                        name="input-busqueda-navbar"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() => {
                          if (!searchQuery.trim()) {
                            setBuscadorExpandido(false);
                          }
                        }}
                        placeholder="Buscar negocios, ofertas..."
                        className="
                            w-64 lg:w-56 2xl:w-80
                            px-4 lg:px-3 2xl:px-5 
                            py-1.5 lg:py-1.5 2xl:py-2
                            bg-white
                            rounded-full
                            text-xs lg:text-xs 2xl:text-sm
                            text-gray-800
                            placeholder:text-gray-400
                            focus:outline-none
                            shadow-lg
                          "
                      />
                    </form>
                  </div>
                </div>

                {/* ===== NAVEGACIÓN ===== */}
                <nav className="flex items-center shrink-0">
                  {NAV_ITEMS.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <div key={item.id} className="flex items-center">
                        {index > 0 && (
                          <div className="w-px h-4 lg:h-5 2xl:h-6 bg-white/20 mx-0.5 lg:mx-0.5 2xl:mx-1.5" />
                        )}

                        <Link
                          to={item.path}
                          onMouseEnter={item.id === 'negocios' ? prefetchListaNegocios : undefined}
                          className={`
                            flex items-center gap-1 lg:gap-1.5 2xl:gap-2
                            px-2 lg:px-3 2xl:px-4
                            py-1.5 lg:py-1.5 2xl:py-2.5
                            rounded-lg lg:rounded-lg 2xl:rounded-xl
                            text-xs lg:text-xs 2xl:text-sm
                            font-medium
                            transition-all
                            ${active
                              ? 'bg-white text-blue-700 shadow-md'
                              : 'text-blue-100 hover:bg-white/15 hover:text-white'
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
                <div className="flex items-center gap-2 lg:gap-2 2xl:gap-4 ml-4 lg:ml-4 2xl:ml-8">
                  <div className="w-px h-8 lg:h-6 2xl:h-10 bg-white/30" />

                  <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-3">
                    <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-10 2xl:h-10 bg-linear-to-br from-orange-400 to-orange-500 rounded-lg lg:rounded-lg 2xl:rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                      {usuario?.logoNegocio ? (
                        <img
                          src={usuario.logoNegocio}
                          alt={usuario?.nombreNegocio || 'Negocio'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <SelectorSucursalesInline />
                    </div>
                  </div>
                </div>

                {/* Breadcrumb centrado con navegación */}
                <div className="flex items-center gap-2 lg:gap-2 2xl:gap-4 flex-1 justify-center">
                  <img
                    src="/BusinessStudio.webp"
                    alt="Business Studio"
                    className="h-5 lg:h-5 2xl:h-7 w-auto object-contain"
                  />

                  {/* Flecha izquierda - Módulo anterior */}
                  {hayModuloAnterior ? (
                    <Tooltip text="Módulo anterior" position="bottom">
                      <button
                        onClick={navegarModuloAnterior}
                        className="p-1 rounded transition-colors text-blue-200 hover:text-white hover:bg-white/15 active:scale-95 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      disabled
                      className="p-1 rounded transition-colors text-white/30 cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" />
                    </button>
                  )}

                  {/* Nombre del módulo actual */}
                  <span className="text-sm lg:text-sm 2xl:text-lg font-bold text-white min-w-20 lg:min-w-20 2xl:min-w-[100px] text-center">
                    {obtenerNombreModuloActual()}
                  </span>

                  {/* Flecha derecha - Módulo siguiente */}
                  {hayModuloSiguiente ? (
                    <Tooltip text="Módulo siguiente" position="bottom">
                      <button
                        onClick={navegarModuloSiguiente}
                        className="p-1 rounded transition-colors text-blue-200 hover:text-white hover:bg-white/15 active:scale-95 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      disabled
                      className="p-1 rounded transition-colors text-white/30 cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" />
                    </button>
                  )}
                </div>

                {/* Botón Ver mi Negocio */}
                <button
                  onClick={togglePreviewNegocio}
                  className={`
                    flex items-center gap-1.5 lg:gap-1 2xl:gap-2
                    px-3 lg:px-2.5 2xl:px-5
                    py-1.5 lg:py-1.5 2xl:py-2.5
                    rounded-lg lg:rounded-lg 2xl:rounded-xl
                    text-xs lg:text-[11px] 2xl:text-sm
                    font-semibold
                    shadow-md
                    transition-all
                    cursor-pointer
                    mr-4
                    ${previewNegocioAbierto
                      ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                      : 'bg-linear-to-r from-green-500 via-emerald-600 to-teal-700 text-white hover:from-green-600 hover:via-emerald-700 hover:to-teal-800 hover:scale-105'
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
            <div className="flex items-center gap-4 lg:gap-4 2xl:gap-8 shrink-0 lg:mr-4 2xl:mr-0">

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
                  cursor-pointer
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
                      ring-2 ring-blue-600
                      pulse-badge
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
                    text-blue-200 
                    hover:text-white
                    transition-transform
                    hover:scale-120
                    cursor-pointer
                  "
                title="Notificaciones"
              >
                <Bell className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-7 2xl:h-7" />
                {cantidadNoLeidas > 0 && (
                  <span
                    className="
                        absolute -top-1 lg:-top-1 2xl:-top-1.5 -right-1 lg:-right-1 2xl:-right-1.5
                        min-w-4 lg:min-w-4 2xl:min-w-5
                        h-4 lg:h-4 2xl:h-5
                        bg-red-500 
                        text-white 
                        text-[9px] lg:text-[9px] 2xl:text-xs
                        rounded-full 
                        flex items-center justify-center 
                        font-bold
                        pulse-badge
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
                    w-8 h-8 lg:w-9 lg:h-9 2xl:w-12 2xl:h-12
                    bg-white/20 hover:bg-white/30
                    border-2 border-white/40
                    rounded-full 
                    flex items-center justify-center 
                    text-white 
                    text-xs lg:text-sm 2xl:text-base
                    font-semibold 
                    shadow-sm
                    transition-transform
                    hover:scale-110
                    overflow-hidden
                    cursor-pointer
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

                {/* Dropdown Menu */}
                {dropdownAbierto && (
                  <div className="absolute right-0 top-full mt-2 lg:w-56 2xl:w-72 w-72 bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden z-40">

                    {/* ===== HEADER CON GRADIENTE ===== */}
                    <div className="bg-linear-to-r from-slate-100 via-slate-200 to-slate-100 border-b border-gray-300 lg:p-2 2xl:p-4 p-4">
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
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

                        {/* Toggle de modo */}
                        <div className="lg:mb-1 2xl:mb-2 mb-2">
                          <ToggleModoUsuario onModoChanged={() => setDropdownAbierto(false)} />
                        </div>

                        {/* Nombre */}
                        <p className="font-bold text-gray-900 lg:text-xs 2xl:text-base text-base mb-0.5 px-2 truncate w-full">
                          {esComercial && usuario?.nombreNegocio
                            ? usuario.nombreNegocio
                            : `${usuario?.nombre} ${usuario?.apellidos}`}
                        </p>

                        {/* Correo */}
                        <p className="lg:text-[10px] 2xl:text-sm text-sm text-gray-600 px-2 truncate w-full">
                          {esComercial && usuario?.correoNegocio
                            ? usuario.correoNegocio
                            : usuario?.correo}
                        </p>
                      </div>
                    </div>

                    {/* ===== OPCIONES DE NAVEGACIÓN ===== */}
                    <div className="lg:py-1 2xl:py-2 py-2">

                      {/* Opciones específicas Personal */}
                      {!esComercial && (
                        <>
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

                          <div className="lg:my-1.5 lg:mx-3 2xl:my-2 2xl:mx-4 my-2 mx-4 h-px bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>
                        </>
                      )}

                      {/* Opciones comunes */}
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
        </div>
      </header>

      {/* Línea brillante inferior */}
      <div className="header-shine-line" />
    </div>
  );
};

export default Navbar;