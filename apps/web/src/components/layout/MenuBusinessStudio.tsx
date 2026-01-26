/**
 * MenuBusinessStudio.tsx
 * =======================
 * Menú de navegación de Business Studio para la columna izquierda (desktop).
 *
 * Se muestra cuando el usuario está en cualquier ruta de /business-studio/*
 * Contiene todas las secciones disponibles en Business Studio.
 * 
 * NAVEGACIÓN POR TECLADO:
 * - ↑/↓: Mover entre opciones
 * - Enter: Navegar a la opción seleccionada
 * - Home: Ir a la primera opción
 * - End: Ir a la última opción
 *
 * ORGANIZACIÓN DEL MENÚ:
 * 1. Operación Diaria - Dashboard, Transacciones, Clientes, Opiniones, Alertas
 * 2. Catálogo & Promociones - Catálogo, Ofertas, Cupones
 * 3. Engagement & Recompensas - Puntos, Rifas
 * 4. Recursos Humanos - Empleados, Vacantes
 * 5. Análisis & Configuración - Reportes, Sucursales, Mi Perfil
 *
 * Ubicación: apps/web/src/components/layout/MenuBusinessStudio.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
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

  // Estado para navegación por teclado
  const [indiceFocused, setIndiceFocused] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const botonesRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Encontrar índice activo basado en la ruta actual
  const indiceActivo = opcionesMenu.findIndex(
    (opcion) =>
      location.pathname === opcion.ruta ||
      (opcion.id === 'dashboard' && location.pathname === '/business-studio')
  );

  // Manejar navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo procesar si el menú tiene foco
      if (!menuRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIndiceFocused((prev) => {
            // Si no hay foco previo, empezar desde el activo
            const actual = prev === -1 ? indiceActivo : prev;
            const nuevo = actual < opcionesMenu.length - 1 ? actual + 1 : 0;
            botonesRef.current[nuevo]?.focus();
            return nuevo;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setIndiceFocused((prev) => {
            // Si no hay foco previo, empezar desde el activo
            const actual = prev === -1 ? indiceActivo : prev;
            const nuevo = actual > 0 ? actual - 1 : opcionesMenu.length - 1;
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
          setIndiceFocused(opcionesMenu.length - 1);
          botonesRef.current[opcionesMenu.length - 1]?.focus();
          break;

        case 'Enter':
          if (indiceFocused >= 0) {
            e.preventDefault();
            navigate(opcionesMenu[indiceFocused].ruta);
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
    <div className="h-full flex flex-col" ref={menuRef}>
      {/* Header compacto - Solo título, mantiene animación */}
      <div className="bg-linear-to-r from-blue-500 via-blue-600 to-blue-500 rounded-xl lg:p-2 2xl:p-2.5 p-2.5 text-white mb-3 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          {/* Icono con animación */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg lg:p-1.5 2xl:p-2 p-2 shadow-inner">
            <BarChart3 className="lg:w-5 2xl:w-6 w-5 animate-pulse" strokeWidth={2.5} />
          </div>
          
          {/* Solo título */}
          <span className="font-bold lg:text-base 2xl:text-lg text-lg tracking-wide">
            Business Studio
          </span>
        </div>
      </div>

      {/* Opciones del menú con scroll */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 py-2" role="menu">
        <div className="space-y-1">
          {opcionesMenu.map((opcion, index) => {
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
                className={`w-full flex items-center gap-2 lg:px-2 2xl:px-3 px-2.5 lg:py-1.5 2xl:py-2.5 py-2 rounded-lg outline-none transition-all ${
                  esActivo
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    : esFocused
                    ? 'bg-gray-100 text-gray-900 ring-2 ring-blue-400'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icono className={`lg:w-4 2xl:w-5 w-4 shrink-0 ${
                  esActivo ? 'text-blue-500' : esFocused ? 'text-blue-400' : 'text-gray-400'
                }`} />
                <span className={`lg:text-sm 2xl:text-base text-sm font-medium flex-1 text-left ${
                  esActivo ? 'text-blue-700' : ''
                }`}>
                  {opcion.label}
                </span>
                <ChevronRight className={`lg:w-4 2xl:w-5 w-4 ${
                  esActivo ? 'text-blue-500' : esFocused ? 'text-blue-400' : 'text-gray-400'
                }`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MenuBusinessStudio;