/**
 * ============================================================================
 * COMPONENTE: LayoutPublico (v2.0 - FIX SCROLL)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/layout/LayoutPublico.tsx
 * 
 * PROPÓSITO:
 * Layout wrapper para páginas públicas accesibles SIN autenticación.
 * Usado para links compartidos de negocios, productos, ofertas, etc.
 * 
 * CAMBIOS v2.0:
 * - ✅ Main con altura fija (calc(100vh - 67px)) para scroll independiente
 * - ✅ Scroll funciona incluso si useLockScroll bloquea el body
 * - ✅ Consistente con estrategia de MainLayout
 * 
 * DIFERENCIAS CON MainLayout:
 * - ❌ NO tiene sidebars (ColumnaIzquierda/ColumnaDerecha)
 * - ❌ NO tiene BottomNav
 * - ❌ NO requiere autenticación
 * - ✅ Header con logo + beneficios + botón registro
 * - ✅ Footer minimalista con logo, copyright y redes
 * 
 * ESTRUCTURA:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  [Logo]   🎁 ¡Únete gratis! · 🪙 Acumula puntos · 🏆 Canjea   [Registrarse] │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                              {children}                                     │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  [Logo]  "Tus compras..."   © 2026 AnunciaYA...   ¡Síguenos! [FB] [WA]     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * CREADO: Fase 5.3.1 - Sistema Universal de Compartir
 * ACTUALIZADO: Febrero 2026 - Fix scroll en rutas públicas
 */

import { useNavigate } from 'react-router-dom';
import { Gift, Coins, Award } from 'lucide-react';
import { FooterPublico } from '../public/FooterPublico';

// =============================================================================
// TIPOS
// =============================================================================

interface LayoutPublicoProps {
  /** Contenido de la página */
  children: React.ReactNode;
  
  /** Si es true, oculta el banner de registro (ej: si la página ya tiene CTA propio) */
  ocultarBanner?: boolean;
  
  /** Posición del banner: bottom (default), top, floating */
  posicionBanner?: 'top' | 'bottom' | 'floating';
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function LayoutPublico({ 
  children, 
}: LayoutPublicoProps) {
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const irALanding = () => navigate('/');
  const irARegistro = () => navigate('/registro');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    // @container: establece este layout como el container para los container queries
    // (@5xl:, @[96rem]:) que usan PaginaPerfilNegocio y sus componentes hijos.
    // Así los refinamientos responden al ancho del viewport real, no al max-w del main.
    <div className="@container h-screen bg-app-degradado flex flex-col">
      {/* ================================================================
          HEADER — gradient azul + shine line igual al Navbar autenticado
          ================================================================ */}
      <div className="sticky top-0 z-50">
        <header className="bg-header-app px-4 lg:px-4 2xl:px-8 py-2.5 lg:py-3 2xl:py-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={irALanding}
              className="flex items-center shrink-0 cursor-pointer transition-transform hover:scale-110"
            >
              <img
                src="/logo-anunciaya-azul.webp"
                alt="AnunciaYA"
                className="h-8 lg:h-9 2xl:h-11 w-auto object-contain"
              />
            </button>

            {/* Beneficios — iconos en tonos claros sobre azul, texto blanco. */}
            <div className="hidden lg:flex items-center gap-5">
              <div className="flex items-center gap-2 text-white">
                <Gift className="w-5 h-5 text-amber-300" />
                <span className="text-base font-bold">¡Únete gratis!</span>
              </div>
              <span className="text-white/60 text-xl font-bold">·</span>
              <div className="flex items-center gap-2 text-white">
                <Coins className="w-5 h-5 text-blue-200" />
                <span className="text-base font-semibold">Acumula puntos comprando</span>
              </div>
              <span className="text-white/60 text-xl font-bold">·</span>
              <div className="flex items-center gap-2 text-white">
                <Award className="w-5 h-5 text-green-300" />
                <span className="text-base font-bold">Canjea por recompensas</span>
              </div>
            </div>

            {/* Botón Registrarse — pill blanco prominente (estilo tab activo). */}
            <button
              onClick={irARegistro}
              className="bg-white hover:bg-blue-50 hover:scale-105 text-blue-700 px-5 py-2 rounded-full font-bold text-sm cursor-pointer transition-all shadow-md shrink-0"
            >
              Registrarse
            </button>
          </div>
        </header>

        {/* Línea brillante inferior — mismo efecto del Navbar. */}
        <div className="header-app-shine" />
      </div>

      {/* ================================================================
          CONTENIDO PRINCIPAL — flex-1 para que se ajuste automáticamente
          a la altura del header (que cambia por breakpoint con el nuevo
          padding del header tipo Navbar) sin necesidad de calc fijo.
          ================================================================ */}
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-8 py-4 lg:py-6 2xl:py-8">
          {children}
        </div>

      {/* Footer unificado con todas las páginas públicas — estilo del
          FooterLanding: bg-black + logo azul + redes + "Volver arriba".
          Vive DENTRO del main para que scrollee con el contenido. */}
      <FooterPublico />
      </main>
    </div>
  );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default LayoutPublico;