/**
 * MobileHeader.tsx - VERSIÓN v3.0 REDISEÑADA
 * ============================================
 * Header para la vista móvil con estilo Desktop replicado.
 *
 * ✨ CARACTERÍSTICAS v3.0:
 * - 🎨 Gradiente azul animado (igual al desktop)
 * - ✨ Línea brillante inferior (shine effect)
 * - 🔍 Buscador inline expandible por sección
 * - 📱 Ultra limpio: solo 4 iconos
 * - 🎯 Altura compacta: 52px + 4px shine = 56px total
 *
 * Estructura:
 * ┌─────────────────────────────────────────────┐
 * │ 🏢 AnunciaYA          🔍  🔔²  ☰          │  ← 52px
 * └─────────────────────────────────────────────┘
 *   ▂▂▂▂▂▂▂▂▂▂▂▂▂ Shine ▂▂▂▂▂▂▂▂▂▂▂▂▂▂ ← 4px
 *
 * Ubicación: apps/web/src/components/layout/MobileHeader.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { Bell, Menu, Search, Eye, X, Store, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { useSearchStore, detectarSeccion, placeholderSeccion } from '../../stores/useSearchStore';
import { DrawerBusinessStudio } from './DrawerBusinessStudio';
import { obtenerSucursalesNegocio } from '../../services/negociosService';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `
  .mobile-header-gradient {
    background: linear-gradient(90deg, #1e3a8a, #2563eb);
  }
  
  @keyframes mobileShineMove {
    0% { transform: translateX(-100%); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateX(300%); opacity: 0; }
  }
  
  .mobile-shine-line {
    position: relative;
    height: 4px;
    background: linear-gradient(90deg, #1e3a8a, #3b82f6, #60a5fa, #3b82f6, #1e3a8a);
    overflow: hidden;
  }
  
  .mobile-shine-line::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
    animation: mobileShineMove 2.5s ease-in-out infinite;
    will-change: transform;
  }
`;

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

// =============================================================================
// COMPONENTE
// =============================================================================

export function MobileHeader() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const abrirMenuDrawer = useUiStore((state) => state.abrirMenuDrawer);

  // Search Store — buscador inline
  const { query, buscadorAbierto, setQuery, abrirBuscador, cerrarBuscador } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // GPS Store
  const ciudad = useGpsStore((state) => state.ciudad);
  const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);
  const setCiudad = useGpsStore((state) => state.setCiudad);

  // Notificaciones Store
  const cantidadNoLeidas = useNotificacionesStore((state) => state.totalNoLeidas);
  const togglePanel = useNotificacionesStore((state) => state.togglePanel);

  // Auth Store
  const usuario = useAuthStore((state) => state.usuario);

  // UI Store - Preview
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);
  const togglePreviewNegocio = useUiStore((state) => state.togglePreviewNegocio);

  // Location
  const location = useLocation();
  const navigate = useNavigate();
  const esBusinessStudio = location.pathname.startsWith('/business-studio');
  const seccionActiva = detectarSeccion(location.pathname);

  // Handler: abrir buscador inline y enfocar
  const handleAbrirBuscador = () => {
    abrirBuscador();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Estado del drawer BS
  const [drawerBsAbierto, setDrawerBsAbierto] = useState(false);

  // Sucursales (para cambio de sucursal en móvil)
  const { setSucursalActiva, setEsSucursalPrincipal, setTotalSucursales } = useAuthStore();
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const [sucursalesMobile, setSucursalesMobile] = useState<{ id: string; nombre: string; esPrincipal: boolean }[]>([]);

  useEffect(() => {
    if (!usuario?.negocioId || usuario?.modoActivo !== 'comercial') {
      setSucursalesMobile([]);
      return;
    }
    obtenerSucursalesNegocio(usuario.negocioId).then((resp) => {
      if (resp.success && resp.data) {
        const ordenadas = [...resp.data].sort((a: { esPrincipal: boolean; nombre: string }, b: { esPrincipal: boolean; nombre: string }) => {
          if (a.esPrincipal) return -1;
          if (b.esPrincipal) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
        setSucursalesMobile(ordenadas);

        // ✅ Alimentar el store global con el total de sucursales
        setTotalSucursales(ordenadas.length);
      }
    }).catch(() => setSucursalesMobile([]));
  }, [usuario?.negocioId, usuario?.modoActivo]);

  const indiceSucursalActual = sucursalesMobile.findIndex(s => s.id === usuario?.sucursalActiva);
  const sucursalActual = sucursalesMobile[indiceSucursalActual];
  const tieneMuchasSucursales = totalSucursales > 1;

  const irSucursalAnterior = () => {
    if (indiceSucursalActual > 0) {
      const suc = sucursalesMobile[indiceSucursalActual - 1];
      setSucursalActiva(suc.id);
      setEsSucursalPrincipal(suc.esPrincipal);
    }
  };

  const irSucursalSiguiente = () => {
    if (indiceSucursalActual < sucursalesMobile.length - 1) {
      const suc = sucursalesMobile[indiceSucursalActual + 1];
      setSucursalActiva(suc.id);
      setEsSucursalPrincipal(suc.esPrincipal);
    }
  };

  // Obtener sección actual del breadcrumb
  const obtenerSeccionActual = () => {
    if (location.pathname === '/business-studio') return 'Dashboard';
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
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

  // ---------------------------------------------------------------------------
  // Navegación entre módulos
  // ---------------------------------------------------------------------------

  const esGerente = !!usuario?.sucursalAsignada;
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
  const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);

  // Filtrar módulos para vista gerente
  const modulosFiltrados = vistaComoGerente
    ? MODULOS_BS.filter(m => m.ruta !== '/business-studio/sucursales' && m.ruta !== '/business-studio/puntos')
    : MODULOS_BS;


  const obtenerIndiceModuloActual = () => {
    const indiceExacto = modulosFiltrados.findIndex(modulo => location.pathname === modulo.ruta);
    if (indiceExacto !== -1) return indiceExacto;

    return modulosFiltrados.findIndex(modulo =>
      modulo.ruta !== '/business-studio' && location.pathname.startsWith(modulo.ruta)
    );
  };

  const navegarModuloAnterior = () => {
    const indiceActual = obtenerIndiceModuloActual();
    if (indiceActual > 0) {
      navigate(modulosFiltrados[indiceActual - 1].ruta);
    }
  };

  const navegarModuloSiguiente = () => {
    const indiceActual = obtenerIndiceModuloActual();
    if (indiceActual >= 0 && indiceActual < modulosFiltrados.length - 1) {
      navigate(modulosFiltrados[indiceActual + 1].ruta);
    }
  };

  const indiceModuloActual = obtenerIndiceModuloActual();
  const hayModuloAnterior = indiceModuloActual > 0;
  const hayModuloSiguiente = indiceModuloActual >= 0 && indiceModuloActual < modulosFiltrados.length - 1;



  // ---------------------------------------------------------------------------
  // Effect: Auto-detectar ubicación al cargar (solo si no hay ciudad)
  // ---------------------------------------------------------------------------
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
              ciudadCercana.estado,
              ciudadCercana.coordenadas
            );
          } else {
            console.warn('⚠️ [MOBILE] No se encontró ciudad cercana');
          }
        }
      } catch (error) {
        console.error('❌ [MOBILE] Error en auto-detección:', error);
      }
    };

    autoDetectar();
  }, []); // Solo al montar el componente

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Inyectar estilos de animación */}
      <style>{animationStyles}</style>

      <div className="sticky top-0 z-40">
        {/* Header principal con gradiente azul */}
        <header className="mobile-header-gradient px-4 py-4 flex items-center justify-between shadow-sm">

          {/* ===== MODO BUSCADOR: Input se expande con animación ===== */}
          {buscadorAbierto && !esBusinessStudio ? (
            <div className="flex items-center gap-0.5 w-full">
              <Search className="w-7 h-7 text-white/60 shrink-0" />
              <div
                className="flex-1 overflow-hidden transition-[width] duration-300 ease-out ml-1"
                style={{ width: '100%' }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => {
                    if (!query.trim()) {
                      cerrarBuscador();
                    }
                  }}
                  placeholder={placeholderSeccion(seccionActiva)}
                  className="w-full bg-white/15 text-white text-base placeholder-white/40 outline-none rounded-full px-4 py-1.5"
                />
              </div>
              <button
                onClick={cerrarBuscador}
                className="p-0.5 rounded-full text-white/80 hover:bg-white/20 cursor-pointer shrink-0"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <>
              {/* ===== MODO NORMAL: Logo + Iconos ===== */}
              {/* === Lado Izquierdo: Logo === */}
              <div className="flex items-center">
                <Link to="/inicio" className="flex items-center shrink-0">
                  <img
                    src="/logo-anunciaya-azul.webp"
                    alt="AnunciaYA"
                    className="h-11 w-auto object-contain"
                  />
                </Link>
              </div>

              {/* === Lado Derecho: Acciones === */}
              <div className="flex items-center gap-1">
                {/* Botón Buscar */}
                {!esBusinessStudio && (
                  <button
                    onClick={handleAbrirBuscador}
                    className="p-2 rounded-full text-white/90 hover:bg-white/20 hover:text-white transition-all"
                    title="Buscar"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                )}

                {/* Botón Preview (solo en Business Studio) */}
                {esBusinessStudio && (
                  <button
                    onClick={togglePreviewNegocio}
                    className={`p-2 rounded-full transition-colors ${previewNegocioAbierto
                      ? 'text-red-300 hover:bg-red-500/20'
                      : 'text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    title={previewNegocioAbierto ? 'Cerrar Preview' : 'Ver mi Negocio'}
                  >
                    {previewNegocioAbierto ? (
                      <X className="w-6 h-6" />
                    ) : (
                      <Eye className="w-6 h-6" />
                    )}
                  </button>
                )}

                {/* Botón Notificaciones */}
                <button
                  onClick={togglePanel}
                  className="relative p-2 text-white/90 hover:bg-white/20 hover:text-white rounded-full transition-colors"
                  title="Notificaciones"
                >
                  <Bell className="w-6 h-6" />
                  {cantidadNoLeidas > 0 && (
                    <span className="absolute top-0 right-0 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold pulse-badge px-1">
                      {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                    </span>
                  )}
                </button>

                {/* Botón Menú */}
                <button
                  onClick={abrirMenuDrawer}
                  className="p-2 text-white/90 hover:bg-white/20 hover:text-white rounded-full transition-colors"
                  title="Menú"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </header>

        {/* Línea brillante inferior */}
        <div className="mobile-shine-line" />

        {/* Barra de info del negocio (solo en Business Studio) */}
        {esBusinessStudio && (
          <div className="bg-white border-b border-slate-300 px-4 py-2 flex items-center justify-between shadow-sm">
            {/* Botón menú + Logo */}
            <div className="flex items-center gap-2">
              {/* Botón para abrir drawer BS */}
              <button
                onClick={() => setDrawerBsAbierto(true)}
                className="p-2 -ml-1 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                {usuario?.logoNegocio ? (
                  <img
                    src={usuario.logoNegocio}
                    alt={usuario?.nombreNegocio || 'Negocio'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-4 h-4 text-white" />
                )}
              </div>
              {tieneMuchasSucursales && sucursalActual && (
                <div className="flex items-center gap-0.5">
                  <span className="text-base font-semibold text-blue-600 truncate max-w-[100px]">
                    {sucursalActual.nombre}
                  </span>
                  <button
                    onClick={irSucursalAnterior}
                    disabled={indiceSucursalActual === 0}
                    className={`p-0.5 rounded ${indiceSucursalActual === 0 ? 'text-slate-400' : 'text-blue-500 active:scale-95'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-base font-medium text-slate-600">
                    {indiceSucursalActual + 1}/{sucursalesMobile.length}
                  </span>
                  <button
                    onClick={irSucursalSiguiente}
                    disabled={indiceSucursalActual === sucursalesMobile.length - 1}
                    className={`p-0.5 rounded ${indiceSucursalActual === sucursalesMobile.length - 1 ? 'text-slate-400' : 'text-blue-500 active:scale-95'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Navegación entre módulos */}
            <div className="flex items-center gap-1">
              {/* Flecha izquierda - Módulo anterior */}
              <button
                onClick={navegarModuloAnterior}
                disabled={!hayModuloAnterior}
                className={`p-1 rounded transition-colors ${hayModuloAnterior
                  ? 'text-blue-600 hover:bg-blue-100 active:scale-95'
                  : 'text-slate-400 cursor-not-allowed'
                  }`}
                title={hayModuloAnterior ? 'Módulo anterior' : 'No hay módulo anterior'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Nombre del módulo actual */}
              <span className="text-base font-bold text-blue-600 min-w-20 text-center">
                {obtenerSeccionActual()}
              </span>

              {/* Flecha derecha - Módulo siguiente */}
              <button
                onClick={navegarModuloSiguiente}
                disabled={!hayModuloSiguiente}
                className={`p-1 rounded transition-colors ${hayModuloSiguiente
                  ? 'text-blue-600 hover:bg-blue-100 active:scale-95'
                  : 'text-slate-400 cursor-not-allowed'
                  }`}
                title={hayModuloSiguiente ? 'Módulo siguiente' : 'No hay módulo siguiente'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de Business Studio */}
      <DrawerBusinessStudio
        abierto={drawerBsAbierto}
        onCerrar={() => setDrawerBsAbierto(false)}
      />
    </>
  );
}

export default MobileHeader;