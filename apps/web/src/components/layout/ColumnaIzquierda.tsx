/**
 * ColumnaIzquierda.tsx - VERSIÓN v3.6 CTA FULL HD + BOTTOM
 * ======================================================================
 * Columna lateral izquierda con sistema de niveles CardYA.
 *
 * ✨ CAMBIOS v3.6 (19 Dic 2024) - CTA OPTIMIZADO FULL HD + BOTTOM:
 * - AUMENTADO: CTA mucho más grande para Full HD (2xl:)
 *   • Padding: p-3 → p-5
 *   • Icono Store: w-10 → w-14 (56px)
 *   • Título: text-base → text-xl (20px)
 *   • Subtítulo: text-xs → text-sm (14px)
 *   • Stats números: text-xl → text-3xl (30px)
 *   • Stats labels: text-xs → text-sm (14px)
 *   • Iconos stats: w-4 → w-6 (24px)
 *   • Botón padding: py-2.5 → py-3.5
 *   • Botón texto: text-sm → text-base (16px)
 *   • Gaps aumentados: gap-2 → gap-3.5
 * - POSICIONADO: CTA ahora en la parte inferior (flex-grow spacer)
 * - Columna usa flexbox vertical con justify-end
 * 
 * ✨ CAMBIOS v3.5 (19 Dic 2024) - CardYA CLICKEABLE:
 * - ACTUALIZADO: CardYA ahora es clickeable y navega a /cardya
 * - Widget CardYA con hover effects y cursor pointer
 * - Navegación directa a página completa CardYA
 * 
 * ✨ CAMBIOS v3.4 (19 Dic 2024) - CTA NEGOCIOS:
 * - AGREGADO: CTA "¿Tienes un negocio?" en perfil Personal (al final)
 * - CTA navega a /registro con { tipoCuenta: 'Comercial' }
 * - Diseño compacto adaptado a columna izquierda
 * - Columna Derecha ahora solo contiene publicidad pagada
 * 
 * ✨ CAMBIOS v3.3 (19 Dic 2024) - SEPARACIÓN PERSONAL:
 * SEPARACIÓN POR CONTEXTO aplicada a cuenta PERSONAL:
 * - ColumnaIzquierda (Personal): SOLO widgets visuales + accesos rápidos a beneficios
 * - Navbar Dropdown (Personal): SOLO navegación a páginas
 * 
 * Sección Personal ahora contiene:
 * - Widget CardYA (clickeable → /cardya) ← ACTUALIZADO v3.5
 * - Mis Cupones (acceso rápido)
 * - Cupones Por Vencer (acceso rápido)
 * - CTA para Negocios (invitación a crear perfil comercial)
 * 
 * Movido al Navbar Dropdown (Personal):
 * - CardYA (página completa) ← Se puede acceder desde widget o navbar
 * - Mis Cupones (página completa)
 * - Mis Publicaciones
 * - Mi Perfil
 * - Configuración
 * - Favoritos
 * - Cerrar Sesión
 *
 * ✨ CAMBIOS v3.2 - SEPARACIÓN COMERCIAL:
 * - ColumnaIzquierda (Comercial): SOLO herramientas de negocio + Resumen
 * - Navbar Dropdown (Comercial): SOLO opciones personales + Cerrar Sesión
 *
 * ✨ SISTEMA DE NIVELES:
 * 🥉 BRONCE: 0 - 4,999 puntos (1x multiplicador)
 * 🥈 PLATA:  5,000 - 14,999 puntos (1.25x multiplicador)
 * 🥇 ORO:    15,000+ puntos (1.5x multiplicador)
 *
 * El nivel se calcula automáticamente según puntos_acumulados_lifetime.
 * Cada nivel tiene diseño único y beneficios diferenciados.
 *
 * Ubicación: apps/web/src/components/layout/ColumnaIzquierda.tsx
 */

import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  DollarSign,
  Users,
  Gift,
  ChevronRight,
  Zap,
  Settings,
  RefreshCw,
  Store,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { WidgetCardYA } from './WidgetCardYA';
import { MenuBusinessStudio } from './MenuBusinessStudio';
import { BotonInstalarScanYA } from '../scanya';



// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaIzquierda() {
  const usuario = useAuthStore((state) => state.usuario);
  const location = useLocation();
  const esComercial = usuario?.modoActivo === 'comercial';
  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  // Si estamos en Business Studio → Mostrar menú BS
  if (esBusinessStudio) {
    return (
      <div className="h-full">
        <MenuBusinessStudio />
      </div>
    );
  }

  return (
    <div className="lg:space-y-2 2xl:space-y-6 space-y-4 h-full flex flex-col">
      {esComercial ? <ContenidoComercial /> : <ContenidoPersonal />}
    </div>
  );
}

// =============================================================================
// CONTENIDO PERSONAL
// =============================================================================

function ContenidoPersonal() {
  const navigate = useNavigate();

  // Datos de ejemplo (estos vendrían del store/API)
  const puntosDisponibles = 1250; // Puntos actuales para canjear
  const puntosLifetime = 12500; // Total acumulado histórico
  const cuponesActivos = 3;
  const cuponesPorVencer = 2;

  return (
    <>
      {/* Widget CardYA */}
      <WidgetCardYA
        puntosDisponibles={puntosDisponibles}
        puntosLifetime={puntosLifetime}
      />

      {/* MIS CUPONES - RESPONSIVO */}
      <div
        onClick={() => navigate('/cupones')}
        className="relative bg-linear-to-r from-emerald-500 to-emerald-600 rounded-xl lg:p-2.5 2xl:p-4 p-3 text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 overflow-hidden group shadow-lg"
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, white 2px, transparent 2px)`,
              backgroundSize: '16px 16px',
            }}
          ></div>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center lg:gap-2 2xl:gap-3 gap-2">
            <div className="lg:w-8 2xl:w-11 w-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Gift className="lg:w-4 2xl:w-6 w-5" />
            </div>
            <div>
              <p className="font-bold lg:text-xs 2xl:text-base text-sm">Mis Cupones</p>
              <p className="lg:text-[10px] 2xl:text-xs text-xs text-emerald-100">{cuponesActivos} disponibles</p>
            </div>
          </div>

          <ChevronRight className="lg:w-4 2xl:w-6 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* CUPONES POR VENCER - RESPONSIVO */}
      <div
        onClick={() => navigate('/cupones?filter=por-vencer')}
        className="relative bg-linear-to-r from-orange-500 to-orange-600 rounded-xl lg:p-2.5 2xl:p-4 p-3 text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 overflow-hidden group shadow-lg"
      >
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, white 2px, transparent 2px)`,
              backgroundSize: '16px 16px',
            }}
          ></div>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center lg:gap-2 2xl:gap-3 gap-2">
            <div className="lg:w-8 2xl:w-11 w-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Zap className="lg:w-4 2xl:w-6 w-5" />
            </div>
            <div>
              <p className="font-bold lg:text-xs 2xl:text-base text-sm">Cupones Por Vencer</p>
              <p className="lg:text-[10px] 2xl:text-xs text-xs text-orange-100">{cuponesPorVencer} próximos</p>
            </div>
          </div>

          <ChevronRight className="lg:w-4 2xl:w-6 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Spacer para empujar CTA hacia abajo */}
      <div className="grow lg:min-h-0 2xl:min-h-0 min-h-20"></div>

      {/* CTA PARA NEGOCIOS - RESPONSIVO - Solo visible en perfil Personal */}
      <div
        onClick={() => navigate('/registro', { state: { tipoCuenta: 'Comercial' } })}
        className="cursor-pointer hover:scale-[1.02] transition-transform duration-150 mt-auto"
      >
        <div className="rounded-xl overflow-hidden shadow-lg">
          {/* Sección superior - AZUL con gradiente */}
          <div className="bg-linear-to-r from-blue-500 to-blue-700 lg:p-2 2xl:p-4 p-3 text-white">
            <div className="flex items-center lg:gap-1.5 2xl:gap-3 gap-2.5">
              {/* Icono de tienda */}
              <div className="lg:w-8 2xl:w-12 w-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0">
                <Store className="lg:w-3.5 2xl:w-6 w-5" />
              </div>

              {/* Texto */}
              <div className="flex-1">
                <h3 className="font-bold lg:text-xs 2xl:text-lg text-base leading-tight">
                  ¿Tienes un negocio?
                </h3>
                <p className="text-white/90 lg:text-[9px] 2xl:text-sm text-xs lg:mt-0 2xl:mt-1 mt-0.5">
                  Crea tu perfil y llega a más clientes
                </p>
              </div>
            </div>
          </div>

          {/* Sección inferior - BLANCO */}
          <div className="bg-white lg:p-2 2xl:p-3 p-3">
            {/* Stats con iconos */}
            <div className="grid grid-cols-3 lg:gap-1 2xl:gap-2 gap-2 lg:mb-2 2xl:mb-3 mb-3">
              {/* Stat 1: Precio */}
              <div className="text-center">
                <div className="flex justify-center lg:mb-0 2xl:mb-1 mb-1">
                  <DollarSign className="lg:w-3 2xl:w-4 w-4 text-blue-500" />
                </div>
                <div className="lg:text-base 2xl:text-xl text-xl font-bold text-gray-900">
                  $449
                </div>
                <div className="lg:text-[8px] 2xl:text-xs text-xs text-gray-600 lg:mt-0 mt-0.5">
                  al mes
                </div>
              </div>

              {/* Stat 2: Trial gratuito */}
              <div className="text-center">
                <div className="flex justify-center lg:mb-0 2xl:mb-1 mb-1">
                  <Gift className="lg:w-3 2xl:w-4 w-4 text-green-500" />
                </div>
                <div className="lg:text-base 2xl:text-xl text-xl font-bold text-gray-900">
                  7 días
                </div>
                <div className="lg:text-[8px] 2xl:text-xs text-xs text-gray-600 lg:mt-0 mt-0.5">
                  gratis
                </div>
              </div>

              {/* Stat 3: Negocios registrados */}
              <div className="text-center">
                <div className="flex justify-center lg:mb-0 2xl:mb-1 mb-1">
                  <Users className="lg:w-3 2xl:w-4 w-4 text-purple-500" />
                </div>
                <div className="lg:text-base 2xl:text-xl text-xl font-bold text-gray-900">
                  2.5k+
                </div>
                <div className="lg:text-[8px] 2xl:text-xs text-xs text-gray-600 lg:mt-0 mt-0.5">
                  negocios
                </div>
              </div>
            </div>

            {/* Botón CTA */}
            <button className="w-full lg:py-1.5 2xl:py-2.5 py-2.5 bg-linear-to-r from-blue-500 to-blue-700 text-white rounded-xl font-bold lg:text-[10px] 2xl:text-sm text-sm hover:from-blue-600 hover:to-blue-800 transition-all duration-150 flex items-center justify-center gap-2 shadow-md">
              <span>Empezar ahora</span>
              <ArrowRight className="lg:w-3 2xl:w-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// CONTENIDO COMERCIAL
// =============================================================================

function ContenidoComercial() {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const onboardingCompletado = usuario?.onboardingCompletado ?? false;

  const ventasHoy = 5;
  const clientesHoy = 12;
  const puntosOtorgados = 340;

  return (
    <>
      {/* Header Mi Negocio - RESPONSIVO */}
      <div className="bg-linear-to-r from-orange-50 to-orange-100/50 rounded-xl lg:p-2.5 2xl:p-3 p-3 border border-orange-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="lg:w-8 2xl:w-10 w-9 bg-linear-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
            <Store className="lg:w-4 2xl:w-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 lg:text-sm 2xl:text-lg text-base">Mi Negocio</span>
        </div>
      </div>

      {/* ScanYA - Botón inteligente con instalación PWA */}
      <BotonInstalarScanYA />

      {/* Business Studio / Configurar Negocio - DINÁMICO */}
      <button
        onClick={() => navigate(onboardingCompletado ? '/business-studio' : '/business/onboarding')}
        className="w-full relative group overflow-hidden"
      >
        <div className={`flex items-center justify-start gap-2 lg:p-2.5 2xl:p-3 p-3 bg-linear-to-br ${onboardingCompletado
            ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            : 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
          } text-white rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]`}>
          <div className="lg:w-8 2xl:w-10 w-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            {onboardingCompletado ? (
              <BarChart3 className="lg:w-4 2xl:w-6 w-5" />
            ) : (
              <Settings className="lg:w-4 2xl:w-6 w-5" />
            )}
          </div>
          <span className="font-bold lg:text-sm 2xl:text-lg text-base flex-1 text-left">
            {onboardingCompletado ? 'Business Studio' : 'Configura tu Negocio'}
          </span>
          <ChevronRight className="lg:w-4 2xl:w-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-white/40 to-transparent"></div>
      </button>

      {/* Resumen de hoy - OPCIÓN A - RESPONSIVO */}
      {/* 
        MÉTRICAS EXPLICADAS:
        - Transacciones: Número de escaneos ScanYA realizados hoy (cada vez que se otorgan puntos)
        - Clientes: Clientes únicos que recibieron puntos hoy (personas diferentes, no transacciones)
        - Puntos otorgados: Total de puntos CardYA que el negocio dio hoy
      */}
      <div className="bg-linear-to-br from-orange-50 to-orange-100/50 rounded-xl lg:p-2.5 2xl:p-3 p-3 border border-orange-200 shadow-md">
        <div className="flex items-center gap-2 lg:mb-2 2xl:mb-3 mb-3 lg:pb-1.5 2xl:pb-2 pb-2 border-b border-orange-200">
          <div className="lg:w-5 2xl:w-7 w-6 bg-linear-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
            <BarChart3 className="lg:w-3 2xl:w-4 w-3.5 text-white" />
          </div>
          <span className="lg:text-xs 2xl:text-sm text-sm font-bold text-orange-900">Resumen de Hoy</span>
        </div>
        <div className="lg:space-y-1.5 2xl:space-y-2 space-y-2">
          <ResumenItemPremium
            icon={RefreshCw}
            label="Transacciones"
            value={ventasHoy.toString()}
            gradient="from-green-400 to-green-600"
          />
          <ResumenItemPremium
            icon={Users}
            label="Clientes"
            value={clientesHoy.toString()}
            gradient="from-blue-400 to-blue-600"
          />
          <ResumenItemPremium
            icon={Gift}
            label="Puntos otorgados"
            value={puntosOtorgados.toString()}
            gradient="from-orange-400 to-orange-600"
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

interface MenuItemLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  iconBg?: string;
  iconColor?: string;
}

function MenuItemLink({ to, icon: Icon, label, iconBg = 'bg-gray-100', iconColor = 'text-gray-600' }: MenuItemLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 lg:p-2 2xl:p-3 p-2.5 rounded-xl transition-all duration-150 group border-b-2 border-gray-200 ${isActive
          ? 'bg-blue-100 border-l-4 border-blue-500 border-b-blue-400'
          : 'hover:bg-gray-100 hover:translate-x-1 hover:border-b-gray-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`lg:w-7 2xl:w-10 w-8 ${isActive ? 'bg-white' : iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-150 shadow-sm shrink-0`}
          >
            <Icon className={`lg:w-3.5 2xl:w-5 w-4 ${iconColor}`} />
          </div>
          <span className="font-semibold text-gray-900 lg:text-xs 2xl:text-sm text-sm">{label}</span>
          <div className={`ml-auto lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 w-7 h-7 rounded-full ${isActive ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-blue-500'} flex items-center justify-center transition-all duration-150 group-hover:translate-x-1`}>
            <ChevronRight className={`lg:w-4 2xl:w-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-white'} transition-colors duration-150`} />
          </div>
        </>
      )}
    </NavLink>
  );
}

// =============================================================================
// SUBCOMPONENTE: ResumenItemPremium (usado solo en comercial)
// =============================================================================

interface ResumenItemPremiumProps {
  icon: React.ElementType;
  label: string;
  value: string;
  gradient: string;
}

function ResumenItemPremium({ icon: Icon, label, value, gradient }: ResumenItemPremiumProps) {
  return (
    <div className="flex items-center justify-between lg:p-1.5 2xl:p-2 p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2">
        <div className={`lg:w-6 2xl:w-8 w-7 bg-linear-to-br ${gradient} rounded-lg flex items-center justify-center shadow-sm`}>
          <Icon className="lg:w-3 2xl:w-4 w-3.5 text-white" />
        </div>
        <span className="lg:text-[10px] 2xl:text-sm text-xs font-medium text-gray-700">{label}</span>
      </div>
      <span className="lg:text-xs 2xl:text-base text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

export default ColumnaIzquierda;