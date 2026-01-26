/**
 * BottomNav.tsx
 * ==============
 * Navegación inferior para la vista móvil - VERSIÓN FINAL
 *
 * Características:
 * - ✨ Fondo metálico (igual al MobileHeader)
 * - 🎯 Indicador activo: barra horizontal azul
 * - ⚡ Animaciones smooth en todos los elementos
 * - 👆 Active:scale feedback al tocar
 * - 🔵 ChatYA: círculo compacto (w-14), icono grande (w-7)
 * - 🎨 Iconos oscuros (gray-600, igual al header)
 * - 📝 Letras legibles (text-xs / 12px)
 * - 📏 Barra compacta con iconos bien separados
 *
 * Estructura:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Negocios │ Market │  💬 ChatYA  │ Ofertas │ Dinámicas │
 * │    🏪     │   🛒   │  (elevado)  │   🏷️   │    🎁     │
 * │  ══════                                                 │
 * │ ░▒▓ FONDO METÁLICO PLATEADO ▓▒░                       │
 * └─────────────────────────────────────────────────────────┘
 *
 * Ubicación: apps/web/src/components/layout/BottomNav.tsx
 */

import { NavLink } from 'react-router-dom';
import { Store, ShoppingCart, Tag, Gift, MessageCircle, BarChart3 } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';

// =============================================================================
// TIPOS
// =============================================================================

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

// =============================================================================
// DATOS
// =============================================================================

const NAV_ITEMS_LEFT_PERSONAL: NavItem[] = [
  { to: '/negocios', label: 'Negocios', icon: Store },
  { to: '/marketplace', label: 'Market', icon: ShoppingCart },
];

const NAV_ITEMS_LEFT_COMERCIAL: NavItem[] = [
  { to: '/negocios', label: 'Negocios', icon: Store },
  { to: '/business-studio', label: 'Business', icon: BarChart3 },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/dinamicas', label: 'Dinámicas', icon: Gift },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function BottomNav() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const chatYAAbierto = useUiStore((state) => state.chatYAAbierto);
  const toggleChatYA = useUiStore((state) => state.toggleChatYA);
  // Auth Store
  const usuario = useAuthStore((state) => state.usuario);
  const esComercial = usuario?.modoActivo === 'comercial';

  // ---------------------------------------------------------------------------
  // Datos de ejemplo
  // ---------------------------------------------------------------------------
  const mensajesCount = 2;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      {/* Fondo con gradiente metálico (igual al MobileHeader) */}
      <div className="absolute inset-0 bg-linear-to-r from-slate-100 via-slate-200 to-slate-100 border-t border-gray-300 shadow-lg"></div>

      {/* Contenido: barra más compacta */}
      <div className="relative px-2 pt-2 pb-4">
        <div className="flex justify-around items-center">
          {/* Items izquierda */}
          {(esComercial ? NAV_ITEMS_LEFT_COMERCIAL : NAV_ITEMS_LEFT_PERSONAL).map((item) => (
            <NavButton key={item.to} item={item} />
          ))}

          {/* Botón central: ChatYA (elevado por encima del fondo) */}
          <div className="relative -mt-9">
            <button
              onClick={toggleChatYA}
              className={`relative flex flex-col items-center transition-transform duration-200 ${chatYAAbierto ? 'scale-95' : 'active:scale-90'
                }`}
            >
              {/* Círculo elevado con shadow mejorado - más pequeño */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${chatYAAbierto
                  ? 'bg-blue-600 shadow-blue-500/50'
                  : 'bg-linear-to-br from-blue-500 to-blue-600 hover:shadow-xl hover:shadow-blue-500/40'
                  }`}
              >
                <MessageCircle
                  className={`w-7 h-7 text-white transition-transform duration-200 ${chatYAAbierto ? 'scale-110' : ''
                    }`}
                />
              </div>

              {/* Badge de mensajes con animación pulse */}
              {mensajesCount > 0 && (
                <span className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {mensajesCount > 9 ? '9+' : mensajesCount}
                </span>
              )}

              {/* Label con mejor tipografía */}
              <span
                className={`text-xs font-semibold mt-1.5 transition-colors duration-200 ${chatYAAbierto ? 'text-blue-600' : 'text-blue-500'
                  }`}
              >
                ChatYA
              </span>
            </button>
          </div>

          {/* Items derecha */}
          {NAV_ITEMS_RIGHT.map((item) => (
            <NavButton key={item.to} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// SUBCOMPONENTE: NavButton
// =============================================================================

interface NavButtonProps {
  item: NavItem;
}

function NavButton({ item }: NavButtonProps) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-90 ${isActive
          ? 'text-blue-500'
          : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Icono con tamaño mejorado */}
          <item.icon className="w-6 h-6" />

          {/* Label con texto más grande */}
          <span className="text-xs font-medium">{item.label}</span>

          {/* Indicador activo: barra horizontal azul debajo */}
          {isActive && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full"></div>
          )}
        </>
      )}
    </NavLink>
  );
}

export default BottomNav;