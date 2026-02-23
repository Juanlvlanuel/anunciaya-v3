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
  useEffect(() => {
    setMainScrollRef(esDesktop ? mainRef : mobileMainRef);
  }, [esDesktop, setMainScrollRef]);

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
    <div
      className="min-h-screen"
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
          {/* ===== HEADER ===== */}
          <div className="sticky top-0 z-50 lg:fixed lg:left-0 lg:right-0">
            {esDesktop ? <Navbar /> : !esCardYA && <div className="mobile-header-landscape-hide"><MobileHeader /></div>}
          </div>

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
                  className="fixed right-0 lg:w-[400px] 2xl:w-[480px] bg-white border-l-4 border-blue-500 shadow-2xl overflow-hidden z-30"
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
          ) : (
            <main
              ref={mobileMainRef}
              className="main-content-landscape-fullscreen overflow-y-auto pb-20"
              style={{ height: esCardYA ? 'calc(100vh - 0px)' : 'calc(100vh - 80px)', WebkitOverflowScrolling: 'touch' }}
            >
              <Outlet />
            </main>
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
        </>
      )}
    </div>
  );
}

export default MainLayout;