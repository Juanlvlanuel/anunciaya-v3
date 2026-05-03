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
import {
  Bell, Menu, Search, Eye, X, ChevronRight, ChevronLeft,
  LayoutDashboard, Receipt, Users, MessageSquare, ShoppingBag, Tag,
  UserCheck, Briefcase, BarChart3, MapPin,
  User, CircleDollarSign, Building2, Save,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

  @keyframes guardar-tornado {
    0%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    45%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(180deg); }
    55%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(220deg); }
    100% { transform: scale(1) translate(0, 0) rotate(360deg); }
  }
  .anim-guardar-tornado {
    animation: guardar-tornado 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    z-index: 9999;
  }
`;

// =============================================================================
// ICONO Y GRADIENTE POR MÓDULO DE BUSINESS STUDIO
// =============================================================================

function obtenerIconoModulo(pathname: string): LucideIcon {
  if (pathname.includes('/transacciones')) return Receipt;
  if (pathname.includes('/clientes')) return Users;
  if (pathname.includes('/opiniones')) return MessageSquare;
  if (pathname.includes('/alertas')) return Bell;
  if (pathname.includes('/catalogo')) return ShoppingBag;
  if (pathname.includes('/ofertas')) return Tag;
  if (pathname.includes('/puntos')) return CircleDollarSign;
  if (pathname.includes('/empleados')) return UserCheck;
  if (pathname.includes('/vacantes')) return Briefcase;
  if (pathname.includes('/reportes')) return BarChart3;
  if (pathname.includes('/sucursales')) return MapPin;
  if (pathname.includes('/perfil')) return User;
  return LayoutDashboard;
}

const GRADIENTE_BS = 'linear-gradient(135deg, #0f172a, #1e293b, #334155)';

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
  { nombre: 'Promociones', ruta: '/business-studio/ofertas' },
  { nombre: 'Puntos y Recompensas', ruta: '/business-studio/puntos' },
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
  const { query, buscadorAbierto, setQuery, cerrarBuscador } = useSearchStore();
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

  // Guardar Perfil (comunicación con PaginaPerfil)
  const guardarBsFn = useUiStore((state) => state.guardarBsFn);
  const guardandoBs = useUiStore((state) => state.guardandoBs);
  const bsPuedeGuardar = useUiStore((state) => state.bsPuedeGuardar);

  // Location
  const location = useLocation();
  const navigate = useNavigate();
  const esBusinessStudio = location.pathname.startsWith('/business-studio');
  const seccionActiva = detectarSeccion(location.pathname);

  // Estado del drawer BS
  const [drawerBsAbierto, setDrawerBsAbierto] = useState(false);

  // Animación del botón guardar
  const [animandoGuardar, setAnimandoGuardar] = useState(false);
  const btnGuardarRef = useRef<HTMLButtonElement>(null);

  // Estado del dropdown de sucursales
  const [dropdownSucAbierto, setDropdownSucAbierto] = useState(false);

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

  const tieneMuchasSucursales = totalSucursales > 1;

  // Obtener sección actual del breadcrumb
  const obtenerSeccionActual = () => {
    if (location.pathname === '/business-studio') return 'Dashboard';
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/transacciones')) return 'Transacciones';
    if (location.pathname.includes('/clientes')) return 'Clientes';
    if (location.pathname.includes('/opiniones')) return 'Opiniones';
    if (location.pathname.includes('/alertas')) return 'Alertas';
    if (location.pathname.includes('/catalogo')) return 'Catálogo';
    if (location.pathname.includes('/ofertas')) return 'Promociones';
    if (location.pathname.includes('/puntos')) return 'Puntos y Rec.';
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
                  id="busqueda-movil"
                  name="busquedaMovil"
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

                {/* Botón Notificaciones (movido desde MenuDrawer en visión v3).
                    `blur()` evita el hover sticky en mobile cuando se cierra el panel. */}
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    togglePanel();
                  }}
                  data-notificaciones-boton="true"
                  className="relative p-2 text-white/90 active:bg-white/20 rounded-full transition-colors"
                  title="Notificaciones"
                >
                  <Bell className="w-6 h-6" />
                  {cantidadNoLeidas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[13px] rounded-full flex items-center justify-center font-bold ring-2 ring-blue-700 px-1 leading-none">
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
          <div
            className="relative flex items-center justify-between px-4 transition-all duration-300"
            style={{
              background: GRADIENTE_BS,
              paddingTop: 6,
              paddingBottom: 6,
              overflow: 'visible',
            }}
          >
            {/* IZQUIERDA: Botón flotante para abrir Drawer BS */}
            <button
              onClick={() => setDrawerBsAbierto(true)}
              className="p-2 text-white/90 hover:bg-white/20 hover:text-white rounded-full transition-colors shrink-0"
              title="Menú Business Studio"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* CENTRO: Flechas de navegación + Icono + Nombre del módulo */}
            <div className="flex-1 flex items-center justify-center gap-2 mx-2">
              {/* Flecha izquierda - Módulo anterior */}
              <button
                onClick={navegarModuloAnterior}
                disabled={!hayModuloAnterior}
                className={`transition-all duration-200 rounded-lg active:scale-95 p-1 ${hayModuloAnterior
                  ? 'text-white hover:bg-white/10'
                  : 'text-white/25 cursor-not-allowed'
                  }`}
                title={hayModuloAnterior ? 'Módulo anterior' : 'No hay módulo anterior'}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>

              {/* Icono + Nombre del módulo */}
              <div className="flex items-center gap-2">
                {(() => {
                  const IconoModulo = obtenerIconoModulo(location.pathname);
                  return (
                    <IconoModulo
                      className="text-white w-6 h-6"
                      strokeWidth={2}
                    />
                  );
                })()}
                <span className="font-bold text-white text-lg whitespace-nowrap truncate">
                  {obtenerSeccionActual()}
                </span>
              </div>

              {/* Flecha derecha - Módulo siguiente */}
              <button
                onClick={navegarModuloSiguiente}
                disabled={!hayModuloSiguiente}
                className={`transition-all duration-200 rounded-lg active:scale-95 p-1 ${hayModuloSiguiente
                  ? 'text-white hover:bg-white/10'
                  : 'text-white/25 cursor-not-allowed'
                  }`}
                title={hayModuloSiguiente ? 'Módulo siguiente' : 'No hay módulo siguiente'}
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* DERECHA: Botón Guardar (en Perfil) / Sucursal (si >1) / Spacer */}
            {guardarBsFn ? (
              /* Botón circular de guardar — sobresale por debajo del header con position absolute */
              <div className="shrink-0" style={{ width: 38 }}>
                <button
                  ref={btnGuardarRef}
                  onClick={() => {
                    if (animandoGuardar || guardandoBs) return;
                    const btn = btnGuardarRef.current;
                    if (btn) {
                      const rect = btn.getBoundingClientRect();
                      const dx = (window.innerWidth / 2) - (rect.left + rect.width / 2);
                      const dy = (window.innerHeight / 2) - (rect.top + rect.height / 2);
                      btn.style.setProperty('--dx', `${dx}px`);
                      btn.style.setProperty('--dy', `${dy}px`);
                    }
                    setAnimandoGuardar(true);
                    setTimeout(() => {
                      setAnimandoGuardar(false);
                      useUiStore.getState().guardarBsFn?.();
                    }, 850);
                  }}
                  disabled={guardandoBs || !bsPuedeGuardar}
                  className={`absolute right-4 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-10 ${animandoGuardar ? 'anim-guardar-tornado' : 'active:scale-95'}`}
                  style={{
                    width: 60,
                    height: 60,
                    background: guardandoBs ? '#64748b' : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    border: '3px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 6px 22px rgba(0,0,0,0.4)',
                    bottom: -20,
                  }}
                  title={guardandoBs ? 'Guardando...' : !bsPuedeGuardar ? 'Completa los campos requeridos' : 'Guardar Cambios'}
                >
                  {guardandoBs ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="text-white w-6 h-6" />
                  )}
                </button>
              </div>
            ) : tieneMuchasSucursales ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setDropdownSucAbierto(prev => !prev)}
                  className="flex items-center justify-center rounded-xl active:scale-95 transition-all duration-200"
                  style={{
                    width: 38,
                    height: 38,
                    background: dropdownSucAbierto ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                  }}
                  title="Cambiar sucursal"
                >
                  <Building2 className="text-white w-5 h-5" />
                </button>

                {/* Dropdown de sucursales */}
                {dropdownSucAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownSucAbierto(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 min-w-[180px] overflow-hidden">
                      {sucursalesMobile.map((suc) => (
                        <button
                          key={suc.id}
                          onClick={() => {
                            setSucursalActiva(suc.id);
                            setEsSucursalPrincipal(suc.esPrincipal);
                            setDropdownSucAbierto(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-base font-semibold flex items-center gap-2 transition-colors ${suc.id === usuario?.sucursalActiva
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${suc.esPrincipal ? 'bg-blue-500' : 'bg-slate-300'}`} />
                          <span className="truncate">{suc.nombre}</span>
                          {suc.id === usuario?.sucursalActiva && (
                            <span className="ml-auto text-blue-500 font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div
                className="shrink-0 transition-all duration-200"
                style={{ width: 38 }}
              />
            )}
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