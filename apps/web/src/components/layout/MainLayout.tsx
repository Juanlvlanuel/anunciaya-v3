/**
 * MainLayout.tsx
 * ===============
 * Layout principal para usuarios autenticados.
 *
 * ¿Qué hace?
 * - Estructura de 3 columnas en desktop (izquierda + centro + derecha)
 * - Header adaptativo (MobileHeader en móvil, Navbar en desktop)
 * - BottomNav solo en móvil
 * - Contiene modales/overlays globales
 * - IMPORTANTE: Solo el contenido tiene scroll, no el body
 *
 * Estructura Desktop:
 * ┌─────────────────────────────────────────────────────────┐
 * │                        Navbar (fijo)                    │
 * ├───────────┬─────────────────────────────┬───────────────┤
 * │ Columna   │                             │   Columna     │
 * │ Izquierda │         <Outlet />          │   Derecha     │
 * │  (scroll) │        (scroll)             │   (scroll)    │
 * │  (280px)  │        (flexible)           │   (320px)     │
 * └───────────┴─────────────────────────────┴───────────────┘
 *
 * Estructura Móvil:
 * ┌─────────────────────────────────────────────────────────┐
 * │                  MobileHeader (fijo)                    │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                         │
 * │                 <Outlet /> (scroll)                     │
 * │                                                         │
 * ├─────────────────────────────────────────────────────────┤
 * │                   BottomNav (fijo)                      │
 * └─────────────────────────────────────────────────────────┘
 *
 * Ubicación: apps/web/src/components/layout/MainLayout.tsx
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';

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
  const navigate = useNavigate();
  const location = useLocation();
  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((state) => state.usuario);

  const menuDrawerAbierto = useUiStore((state) => state.menuDrawerAbierto);
  const cerrarMenuDrawer = useUiStore((state) => state.cerrarMenuDrawer);
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);

  const modalUbicacionAbierto = useUiStore((state) => state.modalUbicacionAbierto);
  const cerrarModalUbicacion = useUiStore((state) => state.cerrarModalUbicacion);

  // Detectar modo preview (para iframe de Business Studio)
  const previewParam = new URLSearchParams(location.search).get('preview');
  const esModoPreview = previewParam === 'true' || previewParam === 'card';

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
  // Cerrar drawer/modales al cambiar a desktop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esDesktop) {
      cerrarMenuDrawer();
    }
  }, [esDesktop, cerrarMenuDrawer]);

  // Redirección a onboarding solo cuando intenta acceder a business-studio
  useEffect(() => {
    // Verificar si acabamos de finalizar onboarding
    const vieneDeOnboarding = sessionStorage.getItem('ay_onboarding_finalizado');

    // Si viene del onboarding, limpiar el flag y NO redirigir
    if (vieneDeOnboarding) {
      sessionStorage.removeItem('ay_onboarding_finalizado');
      return;
    }

    // Redirigir solo si NO completó onboarding
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
    <div className="min-h-screen bg-gray-50">
      {/* ===== MODO PREVIEW: Solo contenido sin navegación ===== */}
      {esModoPreview ? (
        <main className="min-h-screen">
          <Outlet />
        </main>
      ) : (
        <>
          {/* ===== HEADER ===== */}
          <div className="sticky top-0 z-50 lg:fixed lg:left-0 lg:right-0">
            {esDesktop ? <Navbar /> : <div className="mobile-header-landscape-hide"><MobileHeader /></div>}
          </div>

          {/* ===== CONTENIDO PRINCIPAL ===== */}
          {esDesktop ? (
            <>
              {/* Columna Izquierda - FIXED CON EFECTOS */}
              <aside
                className="fixed left-0 lg:w-56 2xl:w-72 w-64 bg-linear-to-br from-slate-50 via-white to-slate-50 lg:border-2 2xl:border-4 border-4 border-slate-200 shadow-2xl rounded-2xl overflow-y-auto z-10"
                style={{ top: '90px', height: 'calc(100vh - 106px)', left: '16px' }}
              >
                <div className="lg:p-3 2xl:p-4 p-4">
                  <ColumnaIzquierda />
                </div>
              </aside>

              {/* Columna Central */}
              <main
                className={`lg:ml-60 2xl:ml-80 lg:pt-[90px] transition-all duration-300 ${esBusinessStudio
                  ? previewNegocioAbierto
                    ? 'lg:mr-[420px] 2xl:mr-[500px]'
                    : 'lg:mr-4 2xl:mr-6'
                  : 'lg:mr-[272px] 2xl:mr-[352px]'
                  }`}
              >
                <Outlet />
              </main>

              {/* Panel Preview Negocio (solo en Business Studio cuando está abierto) */}
              {esBusinessStudio && previewNegocioAbierto && esDesktop && (
                <aside
                  className="fixed right-0 lg:w-[400px] 2xl:w-[480px] bg-white border-l-4 border-blue-500 shadow-2xl overflow-hidden z-20"
                  style={{ top: '90px', height: 'calc(100vh - 90px)', right: '0' }}
                >
                  <PanelPreviewNegocio />
                </aside>
              )}

              {/* Columna Derecha - FIXED (oculta en Business Studio) */}
              {!esBusinessStudio && (
                <aside
                  className="fixed right-0 lg:w-64 2xl:w-80 w-72 bg-linear-to-br from-slate-50 via-white to-slate-50 lg:border-2 2xl:border-4 border-4 border-slate-200 shadow-2xl rounded-2xl overflow-y-auto z-10"
                  style={{ top: '90px', height: 'calc(100vh - 106px)', right: '16px' }}
                >
                  <div className="lg:p-3 2xl:p-4 p-4">
                    <ColumnaDerecha />
                  </div>
                </aside>
              )}
            </>
          ) : (
            <main className="main-content-landscape-fullscreen overflow-y-auto pb-20" style={{ height: 'calc(100vh - 140px)', WebkitOverflowScrolling: 'touch' }}>
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