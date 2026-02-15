/**
 * MenuBusinessStudio.tsx - VERSIÓN v2.0 REDISEÑO MINIMALISTA
 * =======================
 * Menú de navegación de Business Studio para la columna izquierda (desktop).
 *
 * CAMBIOS v2.0:
 * - Franjas de lado a lado (sin cards flotantes)
 * - Hover con línea lateral azul (border-l-2)
 * - Menos curvas
 * - Animaciones sutiles en iconos
 * - Fondo limpio
 *
 * Ubicación: apps/web/src/components/layout/MenuBusinessStudio.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  ShoppingBag,
  Tag,
  Users,
  Receipt,
  Ticket,
  UserCog,
  FileBarChart,
  Gift,
  Building2,
  Coins,
  Briefcase,
  Bell,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `
  /* Float más pronunciado para iconos - MÁS MOVIMIENTO */
  @keyframes floatIconBS {
    0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
    25% { transform: translateY(-3px) scale(1.08) rotate(-2deg); }
    50% { transform: translateY(-2px) scale(1.05) rotate(0deg); }
    75% { transform: translateY(-3px) scale(1.08) rotate(2deg); }
  }
  
  .float-icon-bs {
    animation: floatIconBS 3s ease-in-out infinite;
  }
  
  /* Bounce para flecha activa - MOVIMIENTO SUAVE */
  @keyframes arrowBounce {
    0%, 100% { transform: translateX(0); opacity: 1; }
    50% { transform: translateX(3px); opacity: 0.85; }
  }
  
  .arrow-bounce {
    animation: arrowBounce 3s ease-in-out infinite;
  }
  
  /* Transición punto a flecha */
  .dot-to-arrow {
    transition: all 0.2s ease-out;
  }
`;

// =============================================================================
// OPCIONES DEL MENÚ (REORDENADAS POR LÓGICA DE USO)
// =============================================================================

const opcionesMenu = [
  // =========== OPERACIÓN DIARIA ===========
  { id: 'dashboard', label: 'Dashboard', icono: LayoutDashboard, ruta: '/business-studio' },
  { id: 'transacciones', label: 'Transacciones', icono: Receipt, ruta: '/business-studio/transacciones' },
  { id: 'clientes', label: 'Clientes', icono: Users, ruta: '/business-studio/clientes' },
  { id: 'opiniones', label: 'Opiniones', icono: MessageSquare, ruta: '/business-studio/opiniones' },
  { id: 'alertas', label: 'Alertas', icono: Bell, ruta: '/business-studio/alertas' },

  // =========== CATÁLOGO & PROMOCIONES ===========
  { id: 'catalogo', label: 'Catálogo', icono: ShoppingBag, ruta: '/business-studio/catalogo' },
  { id: 'ofertas', label: 'Ofertas', icono: Tag, ruta: '/business-studio/ofertas' },
  { id: 'cupones', label: 'Cupones', icono: Ticket, ruta: '/business-studio/cupones' },

  // =========== ENGAGEMENT & RECOMPENSAS ===========
  { id: 'puntos', label: 'Puntos', icono: Coins, ruta: '/business-studio/puntos' },
  { id: 'rifas', label: 'Rifas', icono: Gift, ruta: '/business-studio/rifas' },

  // =========== RECURSOS HUMANOS ===========
  { id: 'empleados', label: 'Empleados', icono: UserCog, ruta: '/business-studio/empleados' },
  { id: 'vacantes', label: 'Vacantes', icono: Briefcase, ruta: '/business-studio/vacantes' },

  // =========== ANÁLISIS & CONFIGURACIÓN ===========
  { id: 'reportes', label: 'Reportes', icono: FileBarChart, ruta: '/business-studio/reportes' },
  { id: 'sucursales', label: 'Sucursales', icono: Building2, ruta: '/business-studio/sucursales' },
  { id: 'perfil', label: 'Mi Perfil', icono: User, ruta: '/business-studio/perfil' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function MenuBusinessStudio() {
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar si es gerente
  const usuario = useAuthStore((s) => s.usuario);
  const esGerente = !!usuario?.sucursalAsignada;
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
  const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);

  // Filtrar opciones: ocultar "Sucursales" y "Puntos" para gerentes y dueños en sucursal secundaria
  const opcionesFiltradas = vistaComoGerente
    ? opcionesMenu.filter((opcion) => opcion.id !== 'sucursales' && opcion.id !== 'puntos')
    : opcionesMenu;

  // Estado para navegación por teclado
  const [indiceFocused, setIndiceFocused] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const botonesRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Inyectar estilos de animación
  useEffect(() => {
    const styleId = 'menu-bs-animations';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = animationStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Encontrar índice activo basado en la ruta actual
  const indiceActivo = opcionesFiltradas.findIndex(
    (opcion) =>
      location.pathname === opcion.ruta ||
      (opcion.id === 'dashboard' && location.pathname === '/business-studio')
  );

  // Manejar navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!menuRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIndiceFocused((prev) => {
            const actual = prev === -1 ? indiceActivo : prev;
            const nuevo = actual < opcionesFiltradas.length - 1 ? actual + 1 : 0;
            botonesRef.current[nuevo]?.focus();
            return nuevo;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setIndiceFocused((prev) => {
            const actual = prev === -1 ? indiceActivo : prev;
            const nuevo = actual > 0 ? actual - 1 : opcionesFiltradas.length - 1;
            botonesRef.current[nuevo]?.focus();
            return nuevo;
          });
          break;

        case 'Home':
          e.preventDefault();
          setIndiceFocused(0);
          botonesRef.current[0]?.focus();
          break;

        case 'End':
          e.preventDefault();
          setIndiceFocused(opcionesFiltradas.length - 1);
          botonesRef.current[opcionesFiltradas.length - 1]?.focus();
          break;

        case 'Enter':
          if (indiceFocused >= 0) {
            e.preventDefault();
            navigate(opcionesFiltradas[indiceFocused].ruta);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [indiceFocused, navigate, indiceActivo]);

  // Resetear foco cuando cambia la ruta
  useEffect(() => {
    setIndiceFocused(-1);
  }, [location.pathname]);

  return (
    <div className="h-full flex flex-col bg-white z-0" ref={menuRef}>
      {/* Opciones del menú - Franjas */}
      <nav className="flex-1 overflow-y-auto py-2 lg:py-1.5 2xl:py-2" role="menu">
        {opcionesFiltradas.map((opcion, index) => {
          const Icono = opcion.icono;
          const esActivo = index === indiceActivo;
          const esFocused = index === indiceFocused;

          return (
            <button
              key={opcion.id}
              ref={(el) => { botonesRef.current[index] = el; }}
              onClick={() => navigate(opcion.ruta)}
              onFocus={() => setIndiceFocused(index)}
              onMouseEnter={() => setIndiceFocused(index)}
              role="menuitem"
              tabIndex={esActivo || esFocused ? 0 : -1}
              className={`
                w-full flex items-center gap-3 lg:gap-2.5 2xl:gap-3
                px-4 py-3 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3
                border-l-2 transition-all duration-150
                outline-none cursor-pointer
                ${esActivo
                  ? 'bg-blue-500 text-white border-blue-300'
                  : esFocused
                    ? 'bg-slate-200 border-blue-500'
                    : 'text-slate-600 border-transparent hover:bg-slate-200 hover:border-blue-500'
                }
              `}
            >
              <Icono
                className={`
                  w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0
                  ${esActivo ? 'text-white' : esFocused ? 'text-blue-500' : 'text-slate-400'}
                  ${!esActivo ? 'float-icon-bs' : ''}
                `}
                style={{ animationDelay: `${index * 0.15}s` }}
              />
              <span className={`
                text-sm lg:text-[13px] 2xl:text-base font-medium flex-1 text-left
                ${esActivo ? 'text-white' : esFocused ? 'text-blue-600' : ''}
              `}>
                {opcion.label}
              </span>
              {/* Indicador dinámico: Punto → Flecha */}
              <div className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 flex items-center justify-center">
                {esActivo ? (
                  <ChevronRight
                    className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white arrow-bounce"
                  />
                ) : esFocused ? (
                  <ChevronRight
                    className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500 dot-to-arrow"
                  />
                ) : (
                  <span className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-slate-300 dot-to-arrow" />
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MenuBusinessStudio;