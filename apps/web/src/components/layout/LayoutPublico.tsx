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
    <div className="@container min-h-screen bg-slate-50 flex flex-col">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 lg:px-6 py-2.5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo con hover */}
          <button 
            onClick={irALanding}
            className="cursor-pointer transition-transform hover:scale-105"
          >
            <img 
              src="/logo-anunciaya.webp" 
              alt="AnunciaYA" 
              className="h-9 lg:h-11"
            />
          </button>

          {/* Beneficios centrados */}
          <div className="hidden lg:flex items-center gap-5">
            <div className="flex items-center gap-2 text-amber-600">
              <Gift className="w-5 h-5" />
              <span className="text-base font-bold">¡Únete gratis!</span>
            </div>
            <span className="text-slate-300 text-xl font-light">·</span>
            <div className="flex items-center gap-2 text-blue-600">
              <Coins className="w-5 h-5" />
              <span className="text-base font-semibold">Acumula puntos comprando</span>
            </div>
            <span className="text-slate-300 text-xl font-light">·</span>
            <div className="flex items-center gap-2 text-green-600">
              <Award className="w-5 h-5" />
              <span className="text-base font-bold">Canjea por recompensas</span>
            </div>
          </div>

          {/* Botón Registrarse */}
          <button
            onClick={irARegistro}
            className="bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-all shadow-md shadow-blue-500/20"
          >
            Registrarse
          </button>
        </div>
      </header>

      {/* ================================================================
          CONTENIDO PRINCIPAL - CON ALTURA FIJA PARA SCROLL INDEPENDIENTE
          ================================================================ */}
      <main 
        className="overflow-y-auto"
        style={{
          height: 'calc(100vh - 67px)', // Header (67px) + Footer se ajusta automático
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-8 py-4 lg:py-6 2xl:py-8">
          {children}
        </div>
      </main>

      {/* ================================================================
          FOOTER MINIMALISTA
          ================================================================ */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4">
          {/* Desktop: 3 columnas en una fila */}
          <div className="hidden md:flex items-center justify-between">
            {/* Logo y slogan */}
            <div className="flex flex-col items-start gap-1">
              <img 
                src="/logo-anunciaya.webp" 
                alt="AnunciaYA" 
                className="h-8 lg:h-9"
              />
              <p className="text-slate-400 text-xs italic">
                "Tus compras ahora valen más."
              </p>
            </div>
            
            {/* Copyright */}
            <p className="text-slate-500 text-xs">
              © 2026 AnunciaYA. Todos los derechos reservados.
            </p>
            
            {/* Redes sociales */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs mr-1">¡Síguenos!</span>
              <a 
                href="https://facebook.com/anunciaya" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
              >
                <img 
                  src="/facebook.webp" 
                  alt="Facebook" 
                  className="w-full h-full object-cover"
                />
              </a>
              <a 
                href="https://wa.me/526621234567" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
              >
                <img 
                  src="/whatsapp.webp" 
                  alt="WhatsApp" 
                  className="w-full h-full object-cover"
                />
              </a>
            </div>
          </div>

          {/* Móvil: 2 líneas */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Línea 1: Logo izquierda + Redes derecha */}
            <div className="flex items-center justify-between">
              {/* Logo y slogan */}
              <div className="flex flex-col items-start gap-0.5">
                <img 
                  src="/logo-anunciaya.webp" 
                  alt="AnunciaYA" 
                  className="h-8"
                />
                <p className="text-slate-400 text-[10px] italic">
                  "Tus compras ahora valen más."
                </p>
              </div>
              
              {/* Redes sociales */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">¡Síguenos!</span>
                <a 
                  href="https://facebook.com/anunciaya" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full overflow-hidden"
                >
                  <img 
                    src="/facebook.webp" 
                    alt="Facebook" 
                    className="w-full h-full object-cover"
                  />
                </a>
                <a 
                  href="https://wa.me/526621234567" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full overflow-hidden"
                >
                  <img 
                    src="/whatsapp.webp" 
                    alt="WhatsApp" 
                    className="w-full h-full object-cover"
                  />
                </a>
              </div>
            </div>

            {/* Línea 2: Copyright centrado */}
            <p className="text-slate-500 text-xs text-center">
              © 2026 AnunciaYA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default LayoutPublico;