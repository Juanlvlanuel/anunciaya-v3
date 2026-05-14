/**
 * MainLayout.tsx - VERSIÓN v2.1 COLUMNAS PEGADAS A BORDES
 * ===============
 * Layout principal para usuarios autenticados.
 * 
 * CAMBIOS v2.1:
 * - Columnas pegadas a los bordes (sin margin/padding exterior)
 * - Sin rounded en columnas (esquinas rectas)
 * - Márgenes centrales ajustados al ancho exacto de columnas
 *
 * Estructura Desktop:
 * ┌─────────────────────────────────────────────────────────┐
 * │                   Header (gradiente azul)               │
 * ├───────────┬─────────────────────────────┬───────────────┤
 * │ Columna   │                             │   Columna     │
 * │ Izquierda │         <Outlet />          │   Derecha     │
 * │ (pegada)  │        (contenido)          │   (pegada)    │
 * └───────────┴─────────────────────────────┴───────────────┘
 *
 * Ubicación: apps/web/src/components/layout/MainLayout.tsx
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';
import { useMainScrollStore } from '../../stores/useMainScrollStore';

// Componentes de layout
import { MobileHeader } from './MobileHeader';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { MenuDrawer } from './MenuDrawer';
import { ModalUbicacion } from './ModalUbicacion';
import { ChatOverlay } from './ChatOverlay';
import { ColumnaIzquierda } from './ColumnaIzquierda';
import { ColumnaDerecha } from './ColumnaDerecha';
import { PanelNotificaciones } from './PanelNotificaciones';
import { PanelPreviewNegocio } from './PanelPreviewNegocio';
import { OverlayBuscadorMarketplace } from '../marketplace/OverlayBuscadorMarketplace';
import { detectarSeccion } from '../../stores/useSearchStore';
import { BannerRateLimit } from '../ui/Banner429';
import { useSwipeNavegacionBS } from '../../hooks/useSwipeNavegacionBS';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Breakpoint para considerar desktop (Tailwind lg) */
const DESKTOP_BREAKPOINT = 1024;

/** Espacio entre header y columnas */
const COLUMNS_TOP = '83px'; // Header + 16px de espacio

// =============================================================================
// COMPONENTE
// =============================================================================

export function MainLayout() {
  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [esDesktop, setEsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : false
  );
  const [tieneScroll, setTieneScroll] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const mobileMainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const esBusinessStudio = location.pathname.startsWith('/business-studio');
  const esPerfilNegocio = location.pathname.startsWith('/negocios/');
  const esCardYA = location.pathname.startsWith('/cardya');
  const esMisCupones = location.pathname.startsWith('/mis-cupones');
  const esGuardados = location.pathname.startsWith('/guardados');
  const esNegocios = location.pathname === '/negocios';
  const esMarketplace = location.pathname.startsWith('/marketplace');
  const esOfertas = location.pathname.startsWith('/ofertas');
  const esMisPublicaciones = location.pathname.startsWith('/mis-publicaciones');

  // Swipe horizontal entre módulos BS (solo móvil)
  useSwipeNavegacionBS(mobileMainRef);

  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((state) => state.usuario);

  const menuDrawerAbierto = useUiStore((state) => state.menuDrawerAbierto);
  const cerrarMenuDrawer = useUiStore((state) => state.cerrarMenuDrawer);
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);

  const modalUbicacionAbierto = useUiStore((state) => state.modalUbicacionAbierto);
  const cerrarModalUbicacion = useUiStore((state) => state.cerrarModalUbicacion);

  // Scroll store — registrar ref del main para hooks de scroll
  const setMainScrollRef = useMainScrollStore((s) => s.setMainScrollRef);

  // Detectar modo preview (para iframe de Business Studio)
  const previewParam = new URLSearchParams(location.search).get('preview');
  const esModoPreview = previewParam === 'true' || previewParam === 'card';

  // ---------------------------------------------------------------------------
  // Registrar ref de scroll en el store global
  // (para que useScrollDirection, useHideOnScroll, etc. funcionen)
  // ---------------------------------------------------------------------------
  const esPaginaConHeaderPropio = esCardYA || esMisCupones || esGuardados || esNegocios || esPerfilNegocio || esMarketplace || esOfertas || esMisPublicaciones;
  useEffect(() => {
    if (esDesktop) {
      setMainScrollRef(mainRef);
    } else if (esPaginaConHeaderPropio) {
      // Páginas con scroll en body: limpiar ref para que hooks usen window
      setMainScrollRef(null as unknown as React.RefObject<HTMLElement | null>);
    } else {
      setMainScrollRef(mobileMainRef);
    }
  }, [esDesktop, esPaginaConHeaderPropio, setMainScrollRef]);

  // ---------------------------------------------------------------------------
  // Reasegurar fondo negro absoluto (html, body, theme-color) en rutas
  // AnunciaYA. El init script de index.html ya lo setea, pero algún
  // re-render dinámico puede haberlo cambiado. Solo aplica en rutas que
  // montan MainLayout — ScanYA tiene su propio layout y no se afecta.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    document.documentElement.style.background = '#000000';
    document.body.style.background = '#000000';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#000000');

    // Defensa: si el HTML cacheado en el celular no incluye el meta
    // color-scheme (porque el navegador sirve una versión vieja en cache),
    // lo creamos/actualizamos en runtime y aplicamos color-scheme: dark
    // directo al <html> para que Chrome Android use scrim oscuro.
    let metaCs = document.querySelector('meta[name="color-scheme"]');
    if (!metaCs) {
      metaCs = document.createElement('meta');
      metaCs.setAttribute('name', 'color-scheme');
      document.head.appendChild(metaCs);
    }
    metaCs.setAttribute('content', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);


  // ---------------------------------------------------------------------------
  // Detectar cambio de tamaño de pantalla
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      setEsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // Recargar notificaciones al entrar/salir de Business Studio
  // (el filtro por sucursal cambia: fuera de BS usa Matriz, dentro usa sucursal activa)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!usuario || usuario.modoActivo !== 'comercial') return;
    (async () => {
      try {
        const { cargarNotificaciones } = (await import('../../stores/useNotificacionesStore')).default.getState();
        cargarNotificaciones('comercial');
      } catch (err) {
        console.error('[MainLayout] Error recargando notificaciones al cambiar de sección:', err);
      }
    })();
  }, [esBusinessStudio, usuario?.modoActivo]);

  // ---------------------------------------------------------------------------
  // Teclado virtual móvil: blur al cerrar + forzar mostrar BottomNav
  // Con resizes-visual: layout viewport no cambia, visual viewport sí
  // CSS :has(input:focus) oculta el BottomNav. Este efecto solo detecta el
  // cierre del teclado (flecha Android) para hacer blur y forzar mostrar.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esDesktop) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const esInputTeclado = (el: Element): boolean => {
      const tag = el.tagName;
      if (tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const tipo = (el as HTMLInputElement).type;
        const sinTeclado = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'range', 'color'];
        return !sinTeclado.includes(tipo);
      }
      return false;
    };

    let tecladoEstaAbierto = false;

    const handleViewportResize = () => {
      const abierto = (window.innerHeight - vv.height) > 150;

      if (tecladoEstaAbierto && !abierto) {
        // Teclado se cerró → blur + forzar mostrar BottomNav
        const activo = document.activeElement;
        if (activo instanceof HTMLElement && esInputTeclado(activo)) {
          activo.blur();
        }
        const forzar = (window as unknown as Record<string, unknown>).__bottomNavForzarMostrar;
        if (typeof forzar === 'function') forzar();
      }

      tecladoEstaAbierto = abierto;
    };

    vv.addEventListener('resize', handleViewportResize);
    window.addEventListener('resize', handleViewportResize);

    return () => {
      vv.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('resize', handleViewportResize);
    };
  }, [esDesktop]);

  // ---------------------------------------------------------------------------
  // Detectar si el contenido tiene scroll
  // ---------------------------------------------------------------------------
  const verificarScroll = useCallback(() => {
    if (mainRef.current) {
      const { scrollHeight, clientHeight } = mainRef.current;
      setTieneScroll(scrollHeight > clientHeight);
    }
  }, []);

  useEffect(() => {
    verificarScroll();

    // Observer para detectar cambios en el contenido
    const observer = new ResizeObserver(verificarScroll);
    if (mainRef.current) {
      observer.observe(mainRef.current);
    }

    window.addEventListener('resize', verificarScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', verificarScroll);
    };
  }, [verificarScroll, location.pathname]);

  // ---------------------------------------------------------------------------
  // Cerrar drawer/modales al cambiar a desktop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esDesktop) {
      cerrarMenuDrawer();
    }
  }, [esDesktop, cerrarMenuDrawer]);

  // Redirección a onboarding solo cuando intenta acceder a business-studio
  useEffect(() => {
    const vieneDeOnboarding = sessionStorage.getItem('ay_onboarding_finalizado');

    if (vieneDeOnboarding) {
      sessionStorage.removeItem('ay_onboarding_finalizado');
      return;
    }

    if (
      location.pathname === '/business-studio' &&
      usuario?.modoActivo === 'comercial' &&
      usuario?.negocioId &&
      usuario?.onboardingCompletado === false
    ) {
      navigate('/business/onboarding', { replace: true });
    }
  }, [location, usuario, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    // @container: establece este layout como el container para los container queries
    // (@5xl:, @[96rem]:) usados por PaginaPerfilNegocio, CardNegocio y otros componentes.
    // El ancho efectivo del container = viewport completo del navegador.
    <div
      className="@container min-h-screen"
      style={{
        background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)',
      }}
    >
      {/* ===== MODO PREVIEW: Solo contenido sin navegación ===== */}
      {esModoPreview ? (
        <main className="min-h-screen">
          <Outlet />
        </main>
      ) : (
        <>
          {/* ===== HEADER (Desktop) ===== */}
          {esDesktop && (
            <div className="fixed left-0 right-0 top-0 z-50">
              <Navbar />
              <BannerRateLimit />
            </div>
          )}

          {/* ===== CONTENIDO PRINCIPAL ===== */}
          {esDesktop ? (
            <>
              {/* Columna Izquierda - PEGADA AL BORDE (fondo controlado por ColumnaIzquierda) */}
              <aside
                className="fixed lg:w-56 2xl:w-72 shadow-lg overflow-hidden z-30"
                style={{
                  top: COLUMNS_TOP,
                  left: '0',
                  height: `calc(100vh - ${COLUMNS_TOP})`,
                }}
              >
                <ColumnaIzquierda />
              </aside>

              {/* Columna Central - Scroll en borde derecho de ventana */}
              <main
                ref={mainRef}
                className={`fixed left-0 right-0 overflow-y-auto transition-all z-20 lg:pl-56 ${esPerfilNegocio ? '2xl:pl-80' : '2xl:pl-[287px]'
                  } ${esBusinessStudio
                    ? previewNegocioAbierto
                      ? 'lg:pr-[400px] 2xl:pr-[480px]'
                      : 'pr-0'
                    : esPerfilNegocio
                      ? tieneScroll
                        ? 'lg:pr-[270px] 2xl:pr-[350px]'
                        : 'lg:pr-64 2xl:pr-[328px]'
                      : tieneScroll
                        ? 'lg:pr-[270px] 2xl:pr-80'
                        : 'lg:pr-64 2xl:pr-80'
                  }`}
                style={{
                  top: COLUMNS_TOP,
                  height: `calc(100vh - ${COLUMNS_TOP})`,
                }}
              >
                <Outlet />
              </main>

              {/* Panel Preview Negocio (solo en Business Studio cuando está abierto) */}
              {esBusinessStudio && previewNegocioAbierto && esDesktop && (
                <aside
                  className="fixed right-0 lg:w-[400px] 2xl:w-[480px] bg-white border-l-4 border-black shadow-2xl overflow-hidden z-30"
                  style={{
                    top: COLUMNS_TOP,
                    height: `calc(100vh - ${COLUMNS_TOP})`,
                  }}
                >
                  <PanelPreviewNegocio />
                </aside>
              )}

              {/* Columna Derecha - Posición dinámica según scroll */}
              {!esBusinessStudio && (
                <aside
                  className="fixed lg:w-64 2xl:w-80 bg-white shadow-lg overflow-y-auto z-30 transition-all"
                  style={{
                    top: COLUMNS_TOP,
                    right: tieneScroll ? '14px' : '0',
                    height: `calc(100vh - ${COLUMNS_TOP})`,
                  }}
                >
                  <ColumnaDerecha />
                </aside>
              )}
            </>
          ) : esPaginaConHeaderPropio ? (
            /* Páginas con header propio: scroll en body para que el navegador oculte su barra */
            <main className="min-h-screen pb-20">
              <Outlet />
            </main>
          ) : (
            <div className="fixed inset-0 flex flex-col z-0">
              {/* MobileHeader — altura variable (con/sin BS sub-bar) */}
              <div className="shrink-0 z-50 mobile-header-landscape-hide">
                <MobileHeader />
                <BannerRateLimit />
              </div>
              {/* Main — ocupa el espacio restante exacto */}
              <main
                ref={mobileMainRef}
                className="main-content-landscape-fullscreen flex-1 min-h-0 overflow-y-auto pb-20"
                style={{ overscrollBehavior: 'contain' }}
              >
                <Outlet />
              </main>
            </div>
          )}

          {/* ===== BOTTOM NAV (Solo móvil) ===== */}
          {!esDesktop && <div className="bottom-nav-landscape-hide"><BottomNav /></div>}

          {/* ===== PREVIEW NEGOCIO MÓVIL (Modal Fullscreen) ===== */}
          {!esDesktop && previewNegocioAbierto && (
            <PanelPreviewNegocio esMobile />
          )}

          {/* ===== MODALES Y OVERLAYS GLOBALES ===== */}
          {menuDrawerAbierto && (
            <MenuDrawer onClose={cerrarMenuDrawer} />
          )}

          {modalUbicacionAbierto && (
            <ModalUbicacion onClose={cerrarModalUbicacion} />
          )}

          <ChatOverlay />
          <PanelNotificaciones />

          {/* ===== OVERLAY BUSCADOR MARKETPLACE (global en `/marketplace/*`) =====
              Antes vivía dentro de `PaginaMarketplace.tsx` y `PaginaResultadosMarketplace.tsx`,
              entonces el buscador del Navbar (siempre visible en desktop) no
              funcionaba al hacer focus desde sub-rutas como `/marketplace/articulo/:id`
              o `/marketplace/usuario/:id` — el overlay no estaba montado.
              Montarlo aquí lo hace funcionar en cualquier sub-ruta de MP. El
              propio overlay se auto-oculta cuando `buscadorAbierto=false` Y
              `query=''`, así que no estorba al estar inactivo. */}
          {detectarSeccion(location.pathname) === 'marketplace' && (
            <OverlayBuscadorMarketplace />
          )}
        </>
      )}
    </div>
  );
}

export default MainLayout;