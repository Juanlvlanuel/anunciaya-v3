/**
 * ColumnaIzquierda.tsx - VERSIÓN v3.7 MEJORAS VISUALES
 * ======================================================================
 * Columna lateral izquierda con sistema de niveles CardYA.
 *
 * ✨ CAMBIOS v3.7 (28 Ene 2025) - MEJORAS VISUALES:
 * - SIMPLIFICADO: Tips del día a máximo 3 líneas
 * - AUMENTADO: Texto "Resumen de Hoy" más grande
 * - INVERTIDO: Gradientes ScanYA/Business Studio
 * - REDISEÑADO: Ventas con fondo blanco, borde verde e icono
 * - ACTUALIZADO: Tip del día con borde grueso y gradiente naranja
 * - AGREGADO: Flechas en botones Producto/Oferta
 *
 * Ubicación: apps/web/src/components/layout/ColumnaIzquierda.tsx
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Gift,
  BarChart3,
  ChevronRight,
  Zap,
  Settings,
  Store,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { WidgetCardYA } from './WidgetCardYA';
import { MenuBusinessStudio } from './MenuBusinessStudio';
import { BotonInstalarScanYA } from '../scanya';
import { useDashboardStore } from '../../stores/useDashboardStore';


// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaIzquierda() {
  const usuario = useAuthStore((state) => state.usuario);
  const location = useLocation();
  const navigate = useNavigate();
  const esComercial = usuario?.modoActivo === 'comercial';
  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  // Variables para header y botones (modo comercial)
  const logoNegocio = usuario?.logoNegocio;
  const nombreNegocio = usuario?.nombreNegocio || 'Mi Negocio';
  const onboardingCompletado = usuario?.onboardingCompletado ?? false;

  // Si estamos en Business Studio → Mostrar menú BS
  if (esBusinessStudio) {
    return (
      <div className="h-full">
        <MenuBusinessStudio />
      </div>
    );
  }

  return esComercial ? (
    <div className="absolute inset-0 bg-linear-to-b from-slate-200 via-slate-50 to-slate-200 overflow-y-auto">
      {/* Header: Logo + Nombre */}
      <div className="px-2 lg:px-2 2xl:px-3 pt-4 lg:pt-3 2xl:pt-4">
        <div className="flex items-center gap-3 lg:mb-4 2xl:mb-5 mb-4 bg-linear-to-r from-white via-slate-50 to-white rounded-xl lg:p-2.5 2xl:p-3 p-3 shadow-lg border border-slate-100">
          {logoNegocio ? (
            <div className="lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 w-11 h-11 rounded-full overflow-hidden shadow-lg shrink-0 ring-2 ring-black-600/40">
              <img src={logoNegocio} alt={nombreNegocio} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 w-11 h-11 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <Store className="lg:w-5 2xl:w-6 w-5 text-white" />
            </div>
          )}
          <span className="text-gray-800 font-bold lg:text-base 2xl:text-xl text-lg flex-1 min-w-0 leading-tight line-clamp-2">
            {nombreNegocio}
          </span>
        </div>
      </div>

      {/* Botones con padding para hacerlos más angostos */}
      <div className="px-2 lg:px-2 2xl:px-3 lg:space-y-2 2xl:space-y-3 space-y-3 overflow-visible">
        <BotonInstalarScanYA />
        
        <button
          onClick={() => navigate(onboardingCompletado ? '/business-studio' : '/business/onboarding')}
          className="w-full relative group overflow-visible"
        >
          {onboardingCompletado ? (
            <div className="flex items-center justify-center gap-2 lg:p-2.5 2xl:p-3 p-3 bg-linear-to-br from-gray-900 to-blue-600 hover:from-black hover:to-blue-800 text-white rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.03]">
              <img src="/BusinessStudio.webp" alt="Business Studio" className="lg:h-5 2xl:h-7 h-6 w-auto object-contain" />
              <ChevronRight className="lg:w-4 2xl:w-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          ) : (
            <div className="flex items-center justify-start gap-2 lg:p-2.5 2xl:p-3 p-3 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.03]">
              <div className="lg:w-8 2xl:w-10 w-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Settings className="lg:w-4 2xl:w-6 w-5" />
              </div>
              <span className="font-bold lg:text-sm 2xl:text-lg text-base flex-1 text-left">Configura tu Negocio</span>
              <ChevronRight className="lg:w-4 2xl:w-5 w-5 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </button>
      </div>

      {/* Resto del contenido */}
      <div className="px-2 py-4 lg:px-2 lg:py-3 2xl:px-3 2xl:py-4">
        <ContenidoComercial />
      </div>
    </div>
  ) : (
    <div className="lg:space-y-2 2xl:space-y-6 space-y-4 h-full flex flex-col">
      <ContenidoPersonal />
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
        className="relative bg-linear-to-r from-emerald-500 to-emerald-600 rounded-xl lg:p-2.5 2xl:p-4 p-3 text-white cursor-pointer hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden group shadow-lg"
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
        className="relative bg-linear-to-r from-orange-500 to-orange-600 rounded-xl lg:p-2.5 2xl:p-4 p-3 text-white cursor-pointer hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden group shadow-lg"
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
              <p className="font-bold lg:text-xs 2xl:text-base text-sm">Por Vencer</p>
              <p className="lg:text-[10px] 2xl:text-xs text-xs text-orange-100">{cuponesPorVencer} cupones</p>
            </div>
          </div>

          <ChevronRight className="lg:w-4 2xl:w-6 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* CTA PARA NEGOCIOS - DISEÑO ORIGINAL */}
      <div
        onClick={() => navigate('/registro', { state: { tipoCuenta: 'Comercial' } })}
        className="cursor-pointer hover:scale-[1.03] transition-transform duration-150 mt-auto"
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

const TIPS_DIARIOS = [
  'Agrega fotos de calidad a tus productos para aumentar ventas.',
  'Responde las reseñas de tus clientes para mejorar tu reputación.',
  'Crea ofertas por tiempo limitado para generar urgencia.',
  'Comparte tu perfil en redes sociales para aumentar visibilidad.',
  'Usa cupones de descuento para atraer nuevos clientes.',
  'Publica contenido regularmente para mantener el interés.',
  'Revisa tus métricas semanalmente para identificar mejoras.',
];

function ContenidoComercial() {
  const navigate = useNavigate();
  const { kpis, cargarKPIs } = useDashboardStore();

  React.useEffect(() => {
    if (!kpis) {
      cargarKPIs();
    }
  }, [kpis, cargarKPIs]);

  const tipDelDia = TIPS_DIARIOS[new Date().getDay()];
  const ventasTotales = kpis?.ventas?.valor ?? 0;
  const clientes = kpis?.clientes?.valor ?? 0;
  const transacciones = kpis?.transacciones?.valor ?? 0;

  return (
    <div className="flex flex-col justify-between h-full">
      {/* ===== SECCIÓN MEDIA ===== */}
      <div className="flex-1 flex flex-col justify-center lg:py-4 2xl:py-9 py-5 lg:space-y-3 2xl:space-y-4 space-y-4">

        {/* Header: Resumen de Hoy */}
        <div className="flex flex-col items-center gap-2 lg:mb-1 2xl:mb-3 mb-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="lg:w-4 2xl:w-6 w-4  text-gray-800" />
            <p className="lg:text-base 2xl:text-xl text-md   text-gray-800 font-semibold">Resumen de Hoy</p>
          </div>
 
        </div>

        {/* Ventas - FONDO GRADIENTE VERDE CLARO + ICONO */}
        <div className="bg-linear-to-br from-white to-emerald-200 rounded-xl lg:p-3 2xl:p-4 p-3 shadow-md flex items-center justify-between gap-3">
          {/* Icono grande */}
          <div className="lg:w-12 2xl:w-14 w-12 lg:h-12 2xl:h-14 h-12 bg-linear-to-br from-emerald-400 to-emerald-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <TrendingUp className="lg:w-6 2xl:w-7 w-6 text-white" strokeWidth={2.5} />
          </div>

          {/* Texto */}
          <div className="flex-1 text-center">
            <p className="lg:text-2xl 2xl:text-4xl text-3xl font-bold text-emerald-700">${ventasTotales.toLocaleString()}</p>
            <p className="lg:text-xs 2xl:text-lg text-xs text-emerald-700 font-semibold">Ventas</p>
          </div>
        </div>

        {/* Clientes y Transacciones - SIN CARDS, CON DIVISOR */}
        <div className="flex items-stretch gap-3 mb-16">
          {/* Clientes */}
          <div className="flex-1 text-center lg:py-2 2xl:py-2.5 py-2">
            <p className="lg:text-xl 2xl:text-3xl text-2xl font-bold text-red-600">{clientes}</p>
            <p className="lg:text-xs 2xl:text-sm text-xs  text-gray-800 font-semibold">Clientes</p>
          </div>

          {/* Línea divisoria gradiente */}
          <div className="w-0.5 bg-linear-to-b from-transparent via-slate-500 to-transparent"></div>

          {/* Transacciones */}
          <div className="flex-1 text-center lg:py-2 2xl:py-2.5 py-2">
            <p className="lg:text-xl 2xl:text-3xl text-2xl font-bold text-blue-600">{transacciones}</p>
            <p className="lg:text-xs 2xl:text-sm text-xs text-gray-800 font-semibold">Transacciones</p>
          </div>
        </div>

        {/* Tip del día - BORDE MÁS VISIBLE */}
        <div className="bg-linear-to-r from-orange-500 to-orange-600 border-[3px] border-orange-600 rounded-xl lg:p-4 2xl:p-5 -mb-2 p-4 shadow-xl relative overflow-hidden">
          {/* Efecto shimmer */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>

          <div className="relative flex flex-col items-center text-center">
            {/* Fila 1: Icono + Título */}
            <div className="flex items-center gap-2 mb-1">
              <div className="lg:w-9 2xl:w-10 w-9 lg:h-9 2xl:h-10 h-9 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="lg:w-5 2xl:w-6 w-5 text-white" />
              </div>
              <p className="lg:text-base 2xl:text-lg text-base font-bold text-white">💡 Tip del día</p>
            </div>

            {/* Fila 2: Mensaje con comillas */}
            <p className="lg:text-sm 2xl:text-base text-sm leading-relaxed text-white font-medium">
              "{tipDelDia}"
            </p>
          </div>
        </div>
      </div>

      {/* ===== SECCIÓN INFERIOR ===== */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/business-studio/catalogo')}
          className="bg-linear-to-br from-gray-900 to-blue-600 hover:from-black hover:to-blue-800 text-white rounded-xl lg:py-2.5 2xl:py-3 py-3 lg:text-[10px] 2xl:text-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all group"
        >
          <Gift className="lg:w-3.5 2xl:w-4 w-4" />
          Producto
          <ChevronRight className="lg:w-3.5 2xl:w-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={() => navigate('/business-studio/ofertas')}
          className="bg-linear-to-br from-gray-900 to-blue-600 hover:from-black hover:to-blue-800 text-white rounded-xl lg:py-2.5 2xl:py-3 py-3 lg:text-[10px] 2xl:text-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all group"
        >
          <DollarSign className="lg:w-3.5 2xl:w-4 w-4" />
          Oferta
          <ChevronRight className="lg:w-3.5 2xl:w-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export default ColumnaIzquierda;