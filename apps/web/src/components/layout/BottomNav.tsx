/**
 * BottomNav.tsx - VERSIÓN v3.4 PEGADO AL BOTTOM
 * ===============================================
 * Navegación inferior compacta con iconos pegados al borde inferior.
 *
 * ✨ CARACTERÍSTICAS v3.4:
 * - 🖤 Gradiente negro elegante
 * - 📏 Compacto: Iconos 20px
 * - 🚫 Sin línea indicadora
 * - 📍 Iconos PEGADOS al bottom (pb-0)
 * - 📱 Respeta safe-area en iOS
 * - 💬 ChatYA ajustado para no cortarse
 * - ✨ Preparado para auto-hide
 *
 * NUEVO v3.4:
 * - Padding inferior eliminado (solo safe-area)
 * - ChatYA elevación reducida (-mt-7 en vez de -mt-9)
 * - Iconos lo más abajo posible
 * - Compatible con controles de navegación negros
 *
 * Ubicación: apps/web/src/components/layout/BottomNav.tsx
 */

import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Store, ShoppingCart, Tag, BarChart3 } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useFiltrosNegociosStore } from '../../stores/useFiltrosNegociosStore';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `

  /* Glow effect para ChatYA */
  @keyframes chatGlow {
    0%, 100% { box-shadow: 0 8px 30px rgba(59, 130, 246, 0.5); }
    50% { box-shadow: 0 12px 40px rgba(59, 130, 246, 0.7); }
  }

  .chat-glow {
    animation: chatGlow 2s ease-in-out infinite;
  }

  /* Pulso para badge */
  @keyframes pulseBadge {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }

  .pulse-badge {
    animation: pulseBadge 2s ease-in-out infinite;
  }
`;

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

// Orden por prioridad B2C → P2P (visión v3): Negocios → Ofertas → Marketplace → Servicios.
// En modo comercial Marketplace se reemplaza por Business Studio en la izquierda.
const NAV_ITEMS_LEFT_PERSONAL: NavItem[] = [
  { to: '/negocios', label: 'Negocios', icon: Store },
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
];

const NAV_ITEMS_LEFT_COMERCIAL: NavItem[] = [
  { to: '/negocios', label: 'Negocios', icon: Store },
  { to: '/business-studio', label: 'Business', icon: BarChart3 },
];

const NAV_ITEMS_RIGHT_PERSONAL: NavItem[] = [
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
  { to: '/servicios', label: 'Servicios', icon: Wrench },
];

const NAV_ITEMS_RIGHT_COMERCIAL: NavItem[] = [
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/servicios', label: 'Servicios', icon: Wrench },
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

  // Desactivar auto-hide solo en vista mapa de Negocios
  const location = useLocation();
  const vistaActiva = useFiltrosNegociosStore((s) => s.vistaActiva);
  const esMapaNegocios = location.pathname === '/negocios' && vistaActiva === 'mapa';

  // Auto-hide al hacer scroll down (solo móvil, desactivado en mapa de Negocios)
  const { hideStyle, forzarMostrar } = useHideOnScroll({ direction: 'down', disabled: esMapaNegocios });

  // Exponer forzarMostrar globalmente para que MainLayout lo use al cerrar teclado
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__bottomNavForzarMostrar = forzarMostrar;
    return () => { delete (window as unknown as Record<string, unknown>).__bottomNavForzarMostrar; };
  }, [forzarMostrar]);

  // ChatYA Store - badge real
  const mensajesCount = useChatYAStore((s) => s.totalNoLeidos);

  // No mostrar BottomNav cuando ChatYA está abierto
  if (chatYAAbierto) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Inyectar estilos de animación */}
      <style>{animationStyles}</style>

      {/* Strip negro fijo cubriendo SOLO env(safe-area-inset-bottom).
          Necesario porque cuando el BottomNav se oculta al hacer scroll
          (infinite feed de MP), la safe-area queda expuesta y la barra
          nativa de Android samplea el gradiente azul-gris del MainLayout.
          Este strip garantiza que la barra siempre vea negro sólido. */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-black pointer-events-none"
        style={{ height: 'env(safe-area-inset-bottom)', zIndex: 35 }}
        aria-hidden="true"
      />

      <nav className="fixed bottom-0 left-0 right-0 z-40 bottomnav-ocultar-teclado" style={hideStyle}>


        {/* Fondo con gradiente negro y padding para safe-area */}
        <div
          className="bg-black shadow-lg"
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
          }}
        >
          {/* Contenido: iconos pegados al bottom - padding inferior mínimo */}
          <div className="relative px-1 pt-0 -mb-1">
            <div className="flex justify-around items-center">
              {/* Items izquierda */}
              {/* Todos los destinos del BottomNav son secciones top-level.
                  Aplicamos `replace` cuando NO venimos de `/inicio` para que
                  el back siempre regrese al inicio en lugar de ir saltando
                  entre secciones hermanas. Ver `useNavegarASeccion`. */}
              {(esComercial ? NAV_ITEMS_LEFT_COMERCIAL : NAV_ITEMS_LEFT_PERSONAL).map((item) => (
                <NavButton key={item.to} item={item} replace={location.pathname !== '/inicio'} />
              ))}

              {/* Botón central: ChatYA (menos elevado para no cortarse) */}
              <div className="relative -mt-8">
                <button
                  onClick={toggleChatYA}
                  className={`relative flex flex-col items-center transition-all duration-300 ${chatYAAbierto ? 'scale-95' : 'active:scale-90'
                    }`}
                >
                  {/* Contenedor sin fondo para logo ChatYA */}
                  <div
                    className={`w-15 h-15 flex items-center justify-center transition-all duration-300 ${chatYAAbierto
                        ? 'scale-105'
                        : 'hover:scale-110'
                      }`}
                  >
                    <img
                      src="/IconoRojoChatYA.webp"
                      alt="ChatYA"
                      className={`w-auto h-15 object-contain transition-transform duration-300 ${chatYAAbierto ? 'scale-110 rotate-12' : ''
                        }`}
                    />
                  </div>

                  {/* Badge de mensajes con animación pulse ajustado */}
                  {mensajesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg pulse-badge px-1 ring-2 ring-white">
                      {mensajesCount > 9 ? '9+' : mensajesCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Items derecha — mismo patrón replace que items izquierda. */}
              {(esComercial ? NAV_ITEMS_RIGHT_COMERCIAL : NAV_ITEMS_RIGHT_PERSONAL).map((item) => (
                <NavButton key={item.to} item={item} replace={location.pathname !== '/inicio'} />
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

// =============================================================================
// SUBCOMPONENTE: NavButton
// =============================================================================

interface NavButtonProps {
  item: NavItem;
  /** Si `true`, NavLink usa `history.replace` en lugar de `push` — evita
   *  acumular historial entre secciones top-level (todas hermanas en
   *  jerarquía conceptual). Calculado por el padre según `pathname`. */
  replace?: boolean;
}

function NavButton({ item, replace = false }: NavButtonProps) {
  return (
    <NavLink
      to={item.to}
      replace={replace}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-0 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-90 ${isActive
          ? 'text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Icono más compacto: 20px (antes 24px) */}
          <item.icon
            className={`w-6 h-6 transition-all duration-200 ${isActive ? 'scale-110' : ''
              }`}
            strokeWidth={isActive ? 2.5 : 2}
          />

          {/* Label con texto más legible */}
          <span className={`text-xs font-semibold ${isActive ? 'font-bold' : 'font-medium'}`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default BottomNav; 