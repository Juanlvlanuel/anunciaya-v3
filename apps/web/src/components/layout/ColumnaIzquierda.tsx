/**
 * ColumnaIzquierda.tsx - VERSIÓN v6.0 REDISEÑO COMPLETO
 * ======================================================================
 * Columna lateral izquierda con diseño premium:
 * - Header negocio con icono de ojo y mejor contraste
 * - ScanYA/BS con descripciones y hover temáticos
 * - Resumen de Hoy con icono colorido en cuadro azul
 * - Ventas con indicador de tendencia (↑)
 * - Clientes/Transacciones con mini iconos y hover
 * - Sección "Acciones rápidas" en lugar de espacio vacío
 * - Tip del día con icono Sparkles y diseño horizontal
 * - Botones con iconos descriptivos (Package, Tag)
 *
 * Ubicación: apps/web/src/components/layout/ColumnaIzquierda.tsx
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Gift,
  BarChart3,
  ChevronRight,
  Store,
  ArrowRight,
  TrendingUp,
  Users,
  Receipt,
  Eye,
  Package,
  Tag,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { WidgetCardYA } from './WidgetCardYA';
import { MenuBusinessStudio } from './MenuBusinessStudio';
import { ModalImagenes } from '../ui/ModalImagenes';
import { obtenerKPIs } from '../../services/dashboardService';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `
  /* Glow pulsante para tip del día */
  @keyframes tipGlow {
    0%, 100% { 
      border-color: rgba(251, 146, 60, 0.5); 
      box-shadow: 0 0 8px rgba(251, 146, 60, 0.2); 
    }
    50% { 
      border-color: rgba(251, 146, 60, 0.9); 
      box-shadow: 0 0 20px rgba(251, 146, 60, 0.4); 
    }
  }
  
  .tip-glow {
    animation: tipGlow 3s ease-in-out infinite;
  }
  
  /* Bounce suave para icono del tip */
  @keyframes tipBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  .tip-bounce {
    animation: tipBounce 2s ease-in-out infinite;
  }
  
  /* Float suave para iconos */
  @keyframes floatIcon {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  
  .float-icon {
    animation: floatIcon 3s ease-in-out infinite;
  }
  
  /* Línea con glow */
  @keyframes lineGlow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }
  
  .line-glow {
    animation: lineGlow 2s ease-in-out infinite;
  }
  
  /* Efecto Shine para botones */
  .btn-shine {
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease-out;
  }
  
  .btn-shine:hover {
    transform: scale(1.05);
  }
  
  .btn-shine::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.5) 50%,
      transparent 100%
    );
    transform: translateX(-100%) skewX(-25deg);
    z-index: 10;
    pointer-events: none;
    transition: transform 0.4s ease-out;
  }
  
  .btn-shine:hover::before {
    transform: translateX(300%) skewX(-25deg);
  }
`;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaIzquierda() {
  const usuario = useAuthStore((state) => state.usuario);
  const location = useLocation();
  const navigate = useNavigate();
  const esComercial = usuario?.modoActivo === 'comercial';
  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  // Inyectar estilos de animación
  useEffect(() => {
    const styleId = 'columna-izq-animations';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = animationStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Variables para header y botones (modo comercial)
  const logoNegocio = usuario?.logoNegocio;
  const nombreNegocio = usuario?.nombreNegocio || 'Mi Negocio';
  const onboardingCompletado = usuario?.onboardingCompletado ?? false;

  // Estado para modal de logo
  const [modalLogoAbierto, setModalLogoAbierto] = useState(false);

  // Si estamos en Business Studio → Mostrar menú BS
  if (esBusinessStudio) {
    return (
      <div className="h-full">
        <MenuBusinessStudio />
      </div>
    );
  }

  return esComercial ? (
    <div className="absolute inset-0 bg-white overflow-y-auto flex flex-col">
      {/* ===== NEGOCIO ACTIVO - Header mejorado ===== */}
      <div className="border-b-2 border-slate-200 bg-linear-to-r from-slate-200 to-slate-50">
        <div className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-4 lg:py-2.5 2xl:py-4">
          {/* Logo - Clickeable para ver imagen grande */}
          {logoNegocio ? (
            <button
              onClick={() => setModalLogoAbierto(true)}
              className="w-12 h-12 lg:w-9 lg:h-9 2xl:w-13 2xl:h-13 rounded-xl overflow-hidden shadow-lg ring-2 ring-slate-200 shrink-0 cursor-pointer hover:ring-blue-400 transition-all"
            >
              <img src={logoNegocio} alt={nombreNegocio} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-12 h-12 lg:w-9 lg:h-9 2xl:w-13 2xl:h-13 bg-linear-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-slate-200 shrink-0">
              <Store className="w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 text-white" />
            </div>
          )}

          {/* Nombre y link */}
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold text-black text-sm lg:text-xs 2xl:text-base truncate">{nombreNegocio}</p>
            <button
              onClick={() => navigate(`/negocios/${usuario?.sucursalActiva}`)}
              className="text-xs lg:text-[10px] 2xl:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Ver mi negocio <Eye className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 inline-block ml-0.5" />
            </button>
          </div>

          {/* Flecha - Clickeable para ir al negocio */}
          <button
            onClick={() => navigate(`/negocios/${usuario?.sucursalActiva}`)}
            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500" />
          </button>
        </div>
      </div>

      {/* Modal para ver logo grande */}
      {logoNegocio && (
        <ModalImagenes
          images={[logoNegocio]}
          isOpen={modalLogoAbierto}
          onClose={() => setModalLogoAbierto(false)}
        />
      )}

      {/* ===== NAVEGACIÓN - Business Studio y ScanYA ===== */}
      <nav className="border-b-2 border-slate-200">
        {/* Business Studio */}
        <button
          onClick={() => navigate(onboardingCompletado ? '/business-studio' : '/business/onboarding')}
          className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
                   hover:bg-blue-50 transition-all duration-150 cursor-pointer
                   border-l-4 border-l-transparent hover:border-l-blue-500"
        >
          <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 float-icon">
            <img src="/IconoBS.webp" alt="Business Studio" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 leading-tight text-left">
            <span className="font-bold text-black text-sm lg:text-xs 2xl:text-base block">
              {onboardingCompletado ? 'Business Studio' : 'Configura tu Negocio'}
            </span>
            <span className="text-xs lg:text-[10px] 2xl:text-xs text-slate-600 -mt-0.5 block">
              {onboardingCompletado ? 'Gestionar negocio' : 'Completar registro'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" />
        </button>

        {/* ScanYA */}
        <button
          onClick={() => navigate('/scanya')}
          className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
                   hover:bg-blue-50 transition-all duration-150 cursor-pointer
                   border-l-4 border-l-transparent hover:border-l-blue-500"
        >
          <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 float-icon" style={{ animationDelay: '0.5s' }}>
            <img src="/IconoScanYA.webp" alt="ScanYA" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 leading-tight text-left">
            <span className="font-bold text-black text-sm lg:text-xs 2xl:text-base block">ScanYA</span>
            <span className="text-xs lg:text-[10px] 2xl:text-xs text-slate-600 -mt-0.5 block">Registrar ventas</span>
          </div>
          <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" />
        </button>
      </nav>

      {/* ===== RESUMEN DE HOY ===== */}
      <div className="flex-1 flex flex-col">
        <ContenidoComercial />
      </div>
    </div>
  ) : (
    <div className="absolute inset-0 bg-white overflow-y-auto flex flex-col">
      <ContenidoPersonal />
    </div>
  );
}

// =============================================================================
// CONTENIDO PERSONAL
// =============================================================================

function ContenidoPersonal() {
  const navigate = useNavigate();

  const puntosDisponibles = 1250;
  const puntosLifetime = 12500;
  const cuponesActivos = 3;
  const cuponesPorVencer = 2;

  return (
    <>
      {/* Widget CardYA */}
      <div className="p-4 lg:p-3 2xl:p-4 border-b-2 border-slate-200 bg-slate-50/50">
        <WidgetCardYA
          puntosDisponibles={puntosDisponibles}
          puntosLifetime={puntosLifetime}
        />
      </div>

      {/* MIS CUPONES - Franja mejorada */}
      <button
        onClick={() => navigate('/cupones')}
        className="w-full flex items-center gap-3 px-4 py-4 lg:py-3 2xl:py-4 cursor-pointer
                 border-b-2 border-b-slate-100 hover:bg-emerald-50 transition-all
                 border-l-4 border-l-transparent hover:border-l-emerald-500"
      >
        <div className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-black text-sm lg:text-sm 2xl:text-base">Mis Cupones</p>
          <p className="text-xs lg:text-xs 2xl:text-sm text-emerald-600 font-medium">{cuponesActivos} disponibles</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      {/* CUPONES POR VENCER - Franja mejorada */}
      <button
        onClick={() => navigate('/cupones?filter=por-vencer')}
        className="w-full flex items-center gap-3 px-4 py-4 lg:py-3 2xl:py-4 cursor-pointer
                 border-b-2 border-b-slate-100 hover:bg-orange-50 transition-all
                 border-l-4 border-l-transparent hover:border-l-orange-500"
      >
        <div className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-orange-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-black text-sm lg:text-sm 2xl:text-base">Por Vencer</p>
          <p className="text-xs lg:text-xs 2xl:text-sm text-orange-600 font-medium">{cuponesPorVencer} cupones</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      {/* Espacio flexible */}
      <div className="flex-1" />

      {/* CTA PARA NEGOCIOS - Más alto y visible */}
      <div className="border-t-2 border-slate-200 bg-linear-to-b from-slate-100 to-white">
        <div className="w-full px-4 py-5 lg:py-4 2xl:py-5 text-left">
          {/* Header del CTA */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-black text-base lg:text-sm 2xl:text-base">¿Tienes un negocio?</p>
              <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Crea tu perfil y llega a más clientes</p>
            </div>
          </div>

          {/* Stats del CTA */}
          <div className="flex items-center justify-between text-sm lg:text-xs 2xl:text-sm text-slate-600 mb-3 px-1">
            <span className="flex flex-col items-center">
              <strong className="text-black text-base lg:text-sm 2xl:text-base">$449</strong>
              <span className="text-xs text-slate-400">/mes</span>
            </span>
            <span className="flex flex-col items-center">
              <strong className="text-emerald-600 text-base lg:text-sm 2xl:text-base">7 días</strong>
              <span className="text-xs text-slate-400">gratis</span>
            </span>
            <span className="flex flex-col items-center">
              <strong className="text-black text-base lg:text-sm 2xl:text-base">2.5k+</strong>
              <span className="text-xs text-slate-400">negocios</span>
            </span>
          </div>

          {/* Botón del CTA - ÚNICO ELEMENTO CLICKEABLE */}
          <button
            onClick={() => navigate('/registro', { state: { tipoCuenta: 'Comercial' } })}
            className="w-full flex items-center justify-center gap-2 py-3 lg:py-2.5 2xl:py-3 bg-blue-500 text-white rounded-xl text-base lg:text-sm 2xl:text-base font-semibold active:scale-[0.98] transition-all shadow-lg cursor-pointer btn-shine"
          >
            <span>Empezar ahora</span>
            <ArrowRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          </button>
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
  const usuario = useAuthStore((state) => state.usuario);
  const sucursalActiva = usuario?.sucursalActiva;

  // Estado local para KPIs del día (independiente del Dashboard)
  const [kpisHoy, setKpisHoy] = useState<{
    ventas: number;
    clientes: number;
    transacciones: number;
  }>({ ventas: 0, clientes: 0, transacciones: 0 });

  React.useEffect(() => {
    if (!sucursalActiva) return;

    const cargarKPIsHoy = async () => {
      try {
        const response = await obtenerKPIs('hoy');
        if (response.success && response.data) {
          setKpisHoy({
            ventas: response.data.ventas?.valor ?? 0,
            clientes: response.data.clientes?.valor ?? 0,
            transacciones: response.data.transacciones?.valor ?? 0,
          });
        }
      } catch (error) {
        console.error('Error cargando KPIs del día:', error);
      }
    };

    cargarKPIsHoy();
  }, [sucursalActiva]);

  const tipDelDia = TIPS_DIARIOS[new Date().getDay()];
  const ventasTotales = kpisHoy.ventas;
  const clientes = kpisHoy.clientes;
  const transacciones = kpisHoy.transacciones;

  return (
    <>
      {/* ===== RESUMEN DE HOY - Header con icono colorido ===== */}
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 bg-linear-to-r from-blue-100 to-slate-50 border-b-2 border-slate-200">
        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-left">
          <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
          </div>
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-black uppercase tracking-wide font-bold">
            Resumen de Hoy
          </p>
        </div>
      </div>

      {/* ===== VENTAS con indicador ===== */}
      <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-2.5 2xl:py-4 border-b-2 border-slate-200 bg-linear-to-r from-emerald-50/50 to-white">
        <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
          <div className="w-11 h-11 lg:w-8 lg:h-8 2xl:w-11 2xl:h-11 bg-linear-to-br from-emerald-400 to-green-600 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 lg:gap-1.5 2xl:gap-2">
              <p className="text-2xl lg:text-lg 2xl:text-2xl font-black text-emerald-600">
                ${ventasTotales.toLocaleString()}
              </p>
              {ventasTotales > 0 && (
                <span className="text-xs lg:text-[10px] 2xl:text-xs font-semibold text-emerald-500 bg-emerald-100 px-1.5 lg:px-1 2xl:px-1.5 py-0.5 rounded">
                  ↑
                </span>
              )}
            </div>
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 font-semibold">Ventas del día</p>
          </div>
        </div>
      </div>

      {/* ===== CLIENTES Y TRANSACCIONES con iconos ===== */}
      <div className="grid grid-cols-2 border-b-2 border-slate-200">
        <button
          onClick={() => navigate('/business-studio/clientes')}
          className="px-3 lg:px-2 2xl:px-3 py-4 lg:py-2.5 2xl:py-4 text-center border-r-2 border-slate-200 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 mb-1 lg:mb-0.5 2xl:mb-1">
            <Users className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5 text-blue-500" />
            <p className="text-2xl lg:text-lg 2xl:text-2xl font-black text-blue-600">{clientes}</p>
          </div>
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 font-semibold">Clientes</p>
        </button>
        <button
          onClick={() => navigate('/business-studio/transacciones')}
          className="px-3 lg:px-2 2xl:px-3 py-4 lg:py-2.5 2xl:py-4 text-center hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 mb-1 lg:mb-0.5 2xl:mb-1">
            <Receipt className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5 text-blue-500" />
            <p className="text-2xl lg:text-lg 2xl:text-2xl font-black text-blue-600">{transacciones}</p>
          </div>
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 font-semibold">Transacciones</p>
        </button>
      </div>

      {/* Espacio flexible - empuja acciones y tip hacia abajo */}
      <div className="flex-1" />

      {/* Divisor sutil */}
      <div className="mx-4 border-t border-slate-200" />

      {/* ===== ACCIONES RÁPIDAS ===== */}
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3">
        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 mb-2.5 lg:mb-1.5 2xl:mb-2.5">
          <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-400" />
          <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-700 font-semibold uppercase tracking-wide">Acciones rápidas</p>
        </div>
        <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
          <button
            onClick={() => navigate('/business-studio/catalogo')}
            className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-2.5 lg:p-1.5 2xl:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 bg-amber-200 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black">Agregar producto</p>
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-600">Catálogo</p>
            </div>
            <ChevronRight className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-400" />
          </button>
          <button
            onClick={() => navigate('/business-studio/ofertas')}
            className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-2.5 lg:p-1.5 2xl:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 bg-rose-200 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-rose-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black">Crear oferta</p>
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-600">Promociones</p>
            </div>
            <ChevronRight className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ===== TIP DEL DÍA ===== */}
      <div className="px-3 lg:px-2 2xl:px-3 py-2.5 lg:py-1.5 2xl:py-2.5">
        <div className="bg-linear-to-r from-orange-600 to-amber-500 rounded-lg lg:rounded-md 2xl:rounded-lg p-3 lg:p-2 2xl:p-3 tip-glow shadow-xl">
          <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3 text-white">
            <span className="text-3xl lg:text-xl 2xl:text-3xl tip-bounce shrink-0">💡</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm lg:text-[11px] 2xl:text-base mb-1.5 lg:mb-1 2xl:mb-1.5 uppercase tracking-wide">
                Tip del día
              </p>
              <p className="text-xs lg:text-[10px] 2xl:text-sm leading-snug font-normal opacity-90 line-clamp-3 lg:line-clamp-2 2xl:line-clamp-3">
                {tipDelDia}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ColumnaIzquierda;