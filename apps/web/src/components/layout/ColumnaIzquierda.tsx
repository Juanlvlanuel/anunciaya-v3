/**
 * ColumnaIzquierda.tsx - VERSIÓN v7.0 SISTEMA DE TEMAS
 * ======================================================================
 * Columna lateral izquierda con temas dinámicos por ruta.
 * 
 * ARQUITECTURA DE TEMAS:
 * - TEMAS_COLUMNA: objeto de configuración con todos los tokens de color
 * - detectarTema(): mapea pathname → tema
 * - ContenidoPersonal recibe el tema y lo aplica a todos los elementos
 * 
 * PARA AGREGAR UN NUEVO TEMA:
 * 1. Crear entrada en TEMAS_COLUMNA (copiar 'default' como base)
 * 2. Agregar condición en detectarTema()
 * 3. Listo — todos los componentes se adaptan automáticamente
 *
 * Ubicación: apps/web/src/components/layout/ColumnaIzquierda.tsx
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Gift,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Store,
  ArrowRight,
  TrendingUp,
  Users,
  Receipt,
  Eye,
  Lock,
  Ticket,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerSucursalesNegocio } from '../../services/negociosService';
import { WidgetCardYA } from './WidgetCardYA';
import CarouselCupones from './CarouselCupones';
import { MenuBusinessStudio } from './MenuBusinessStudio';
import { ModalImagenes } from '../ui/ModalImagenes';
import { useDashboard } from '../../hooks/queries/useDashboard';

// =============================================================================
// SISTEMA DE TEMAS — Configuración centralizada por ruta/módulo
// =============================================================================
// Para agregar un nuevo tema:
// 1. Añadir entrada en TEMAS_COLUMNA con la key de la ruta
// 2. Usar `tema.xxx` en los componentes que necesiten adaptarse
// 3. El tema 'default' se usa cuando ninguna ruta coincide

export interface TemaColumna {
  /** Fondo del contenedor principal (CSS background) */
  background: string;
  /** Borde entre secciones */
  borderColor: string;
  /** Wrapper del widget CardYA */
  widgetWrapperBg: string;
  /** Texto primario (títulos, nombres) */
  textPrimary: string;
  /** Texto secundario (subtítulos, labels) */
  textSecondary: string;
  /** Texto muted (labels pequeños) */
  textMuted: string;
  /** Chevron/flechas */
  chevronColor: string;
  /** Hover de botones de lista */
  listHoverBg: string;
  /** Border-left hover de botones de lista */
  listHoverBorder: string;
  /** Ícono cupones - fondo */
  cuponesIconBg: string;
  /** Ícono cupones - color */
  cuponesIconColor: string;
  /** Texto accent cupones */
  cuponesAccent: string;
  /** Ícono vencer - fondo */
  vencerIconBg: string;
  /** Ícono vencer - color */
  vencerIconColor: string;
  /** Texto accent vencer */
  vencerAccent: string;
  /** CTA fondo */
  ctaBg: string;
  /** CTA borde superior */
  ctaBorder: string;
  /** CTA ícono store - fondo */
  ctaIconBg: string;
  /** CTA texto precio */
  ctaPriceColor: string;
  /** CTA texto "7 días" */
  ctaHighlight: string;
  /** CTA botón clase */
  ctaButtonClass: string;
  /** Widget CardYA dark mode */
  widgetDark: boolean;
}

const TEMAS_COLUMNA: Record<string, TemaColumna> = {
  // ── Tema por defecto: Claro con gradiente gris → blanco ──
  default: {
    background: 'linear-gradient(to bottom, #ffffff 25%, #cbd5e1 55%, #94a3b8 100%)',
    borderColor: 'border-slate-200',
    widgetWrapperBg: '',
    textPrimary: 'text-black',
    textSecondary: 'text-slate-800',
    textMuted: 'text-slate-800',
    chevronColor: 'text-slate-600',
    listHoverBg: 'hover:bg-blue-50',
    listHoverBorder: 'hover:border-l-blue-500',
    cuponesIconBg: 'bg-blue-100',
    cuponesIconColor: 'text-blue-600',
    cuponesAccent: 'text-blue-600',
    vencerIconBg: 'bg-orange-100',
    vencerIconColor: 'text-orange-600',
    vencerAccent: 'text-orange-600',
    ctaBg: '',
    ctaBorder: 'border-slate-200',
    ctaIconBg: '',
    ctaPriceColor: 'text-black',
    ctaHighlight: 'text-blue-600',
    ctaButtonClass: '',
    widgetDark: false,
  },

  // ── Tema CardYA: Dark con acentos amber ──
  cardya: {
    background: 'linear-gradient(to bottom, #0B358F 30%, #000000 70%)',
    borderColor: 'border-white/5',
    widgetWrapperBg: 'bg-slate-200',
    textPrimary: 'text-white',
    textSecondary: 'text-white/50',
    textMuted: 'text-white/50',
    chevronColor: 'text-white',
    listHoverBg: 'hover:bg-white/5',
    listHoverBorder: 'hover:border-l-amber-500',
    cuponesIconBg: 'bg-amber-400/10',
    cuponesIconColor: 'text-amber-400',
    cuponesAccent: 'text-amber-400/70',
    vencerIconBg: 'bg-orange-400/10',
    vencerIconColor: 'text-orange-400',
    vencerAccent: 'text-orange-400/70',
    ctaBg: '',
    ctaBorder: 'border-white/5',
    ctaIconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    ctaPriceColor: 'text-white',
    ctaHighlight: 'text-amber-400',
    ctaButtonClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-black',
    widgetDark: true,
  },

  // ── Tema Mis Cupones: Dark con acentos emerald ──
  cupones: {
    background: 'linear-gradient(to bottom, #0B358F 30%, #000000 70%)',
    borderColor: 'border-white/5',
    widgetWrapperBg: 'bg-slate-200',
    textPrimary: 'text-white',
    textSecondary: 'text-white/50',
    textMuted: 'text-white/50',
    chevronColor: 'text-white',
    listHoverBg: 'hover:bg-white/5',
    listHoverBorder: 'hover:border-l-emerald-500',
    cuponesIconBg: 'bg-emerald-400/10',
    cuponesIconColor: 'text-emerald-400',
    cuponesAccent: 'text-emerald-400/70',
    vencerIconBg: 'bg-emerald-400/10',
    vencerIconColor: 'text-emerald-400',
    vencerAccent: 'text-emerald-400/70',
    ctaBg: '',
    ctaBorder: 'border-white/5',
    ctaIconBg: '',
    ctaPriceColor: 'text-white',
    ctaHighlight: 'text-emerald-400',
    ctaButtonClass: '',
    widgetDark: true,
  },

  // ── Tema Mis Guardados: Dark con acentos rose ──
  guardados: {
    background: 'linear-gradient(to bottom, #0B358F 30%, #000000 70%)',
    borderColor: 'border-white/5',
    widgetWrapperBg: 'bg-slate-200',
    textPrimary: 'text-white',
    textSecondary: 'text-white/50',
    textMuted: 'text-white/50',
    chevronColor: 'text-white',
    listHoverBg: 'hover:bg-white/5',
    listHoverBorder: 'hover:border-l-rose-500',
    cuponesIconBg: 'bg-rose-400/10',
    cuponesIconColor: 'text-rose-400',
    cuponesAccent: 'text-rose-400/70',
    vencerIconBg: 'bg-rose-400/10',
    vencerIconColor: 'text-rose-400',
    vencerAccent: 'text-rose-400/70',
    ctaBg: '',
    ctaBorder: 'border-white/5',
    ctaIconBg: '',
    ctaPriceColor: 'text-white',
    ctaHighlight: 'text-rose-400',
    ctaButtonClass: '',
    widgetDark: true,
  },

  // ── Tema Negocios: Dark con acentos blue ──
  negocios: {
    background: 'linear-gradient(to bottom, #0B358F 30%, #000000 70%)',
    borderColor: 'border-white/5',
    widgetWrapperBg: 'bg-slate-200',
    textPrimary: 'text-white',
    textSecondary: 'text-white/50',
    textMuted: 'text-white/50',
    chevronColor: 'text-white',
    listHoverBg: 'hover:bg-white/5',
    listHoverBorder: 'hover:border-l-blue-500',
    cuponesIconBg: 'bg-blue-400/10',
    cuponesIconColor: 'text-blue-400',
    cuponesAccent: 'text-blue-400/70',
    vencerIconBg: 'bg-blue-400/10',
    vencerIconColor: 'text-blue-400',
    vencerAccent: 'text-blue-400/70',
    ctaBg: '',
    ctaBorder: 'border-white/5',
    ctaIconBg: '',
    ctaPriceColor: 'text-white',
    ctaHighlight: 'text-blue-400',
    ctaButtonClass: '',
    widgetDark: true,
  },
};

/**
 * Detecta el tema de la columna según la ruta actual.
 * Agrega nuevas rutas aquí para activar temas específicos.
 */
function detectarTema(pathname: string): TemaColumna {
  if (pathname.startsWith('/cardya')) return TEMAS_COLUMNA.cardya;
  if (pathname.startsWith('/mis-cupones')) return TEMAS_COLUMNA.cupones;
  if (pathname.startsWith('/guardados')) return TEMAS_COLUMNA.guardados;
  if (pathname.startsWith('/negocios')) return TEMAS_COLUMNA.negocios;
  return TEMAS_COLUMNA.default;
}

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

  // ── Tema dinámico según ruta ──
  const tema = detectarTema(location.pathname);

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
  // Gerentes NUNCA ven onboarding — tratar como completado
  const onboardingCompletado = !!usuario?.sucursalAsignada || (usuario?.onboardingCompletado ?? false);
  const participaPuntos = usuario?.participaPuntos ?? true;
  const esGerente = !!usuario?.sucursalAsignada;
  const sucursalPrincipalId = useAuthStore((s) => s.sucursalPrincipalId);
  const sucursalParaPerfil = esGerente ? usuario?.sucursalActiva : (sucursalPrincipalId || usuario?.sucursalActiva);

  // Estado para modal de logo
  const [modalLogoAbierto, setModalLogoAbierto] = useState(false);

// Resetear sucursal activa a la principal al entrar o salir de Business Studio
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const setEsSucursalPrincipal = useAuthStore((s) => s.setEsSucursalPrincipal);

  useEffect(() => {
    // Gerentes mantienen su sucursal asignada — no resetear a la principal
    if (esGerente) return;
    if (sucursalPrincipalId && usuario?.sucursalActiva !== sucursalPrincipalId) {
      setSucursalActiva(sucursalPrincipalId);
      setEsSucursalPrincipal(true);
    }
  }, [esBusinessStudio, esGerente]);

  // Si estamos en Business Studio → Mostrar menú BS
  if (esBusinessStudio) {
    return (
      <div className="h-full">
        <MenuBusinessStudio />
      </div>
    );
  }

  return esComercial ? (
    <div className="absolute inset-0 bg-white overflow-y-auto overflow-x-hidden flex flex-col">
      {/* ===== NEGOCIO ACTIVO - Header mejorado ===== */}
      <div className="bg-linear-to-r from-slate-200 to-slate-100">
        <button
          onClick={() => onboardingCompletado ? navigate(`/negocios/${sucursalParaPerfil}`) : navigate('/business/onboarding')}
          className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-4 lg:py-2.5 2xl:py-4 cursor-pointer text-left hover:translate-x-1 transition-transform duration-200"
        >
          {/* Logo */}
          {logoNegocio ? (
            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-slate-200 shrink-0">
              <img src={logoNegocio} alt={nombreNegocio} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-linear-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-slate-200 shrink-0">
              <Store className="w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 text-white" />
            </div>
          )}

          {/* Nombre y subtítulo */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-black text-sm lg:text-xs 2xl:text-base truncate">{nombreNegocio}</p>
            <span className="text-xs lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 -mt-0.5 block">
              {onboardingCompletado ? 'Ver Perfil' : 'Pendiente de configurar'}
            </span>
          </div>

          <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500 shrink-0" />
        </button>
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
      <nav>
        {/* Business Studio */}
        <button
          onClick={() => navigate(onboardingCompletado ? '/business-studio' : '/business/onboarding')}
          className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 cursor-pointer text-left hover:translate-x-1 transition-transform duration-200"
        >
          <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 float-icon shrink-0">
            <img src="/IconoBS.webp" alt="Business Studio" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <span className="font-bold text-black text-sm lg:text-xs 2xl:text-base block">
              {onboardingCompletado ? 'Business Studio' : 'Configura tu Negocio'}
            </span>
            <span className="text-xs lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 -mt-0.5 block">
              {onboardingCompletado ? 'Gestionar Negocio' : 'Completar registro'}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500 shrink-0" />
        </button>

        {/* ScanYA - Deshabilitado si CardYA no está activo */}
        {participaPuntos ? (
          <button
            onClick={() => navigate('/scanya')}
            className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 cursor-pointer text-left hover:translate-x-1 transition-transform duration-200"
          >
            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 float-icon shrink-0" style={{ animationDelay: '0.5s' }}>
              <img src="/IconoScanYA.webp" alt="ScanYA" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <span className="font-bold text-black text-sm lg:text-xs 2xl:text-base block">ScanYA</span>
              <span className="text-xs lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 -mt-0.5 block">Registrar Ventas</span>
            </div>
            <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500 shrink-0" />
          </button>
        ) : (
          <div
            className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
                     bg-slate-50 border-l-4 border-l-slate-300 opacity-60 cursor-not-allowed"
          >
            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 relative shrink-0">
              <img src="/IconoScanYA.webp" alt="ScanYA" className="w-full h-full object-contain grayscale" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 lg:w-3.5 lg:h-3.5 bg-slate-400 rounded-full flex items-center justify-center">
                <Lock className="w-2.5 h-2.5 lg:w-2 lg:h-2 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0 leading-tight text-left">
              <span className="font-bold text-slate-500 text-sm lg:text-xs 2xl:text-base block">ScanYA</span>
              <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400 -mt-0.5 block">Activa CardYA primero</span>
            </div>
            <Lock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-500" />
          </div>
        )}
      </nav>

      {/* ===== RESUMEN DE HOY ===== */}
      <div className="flex-1 flex flex-col">
        <ContenidoComercial participaPuntos={participaPuntos} />
      </div>
    </div>
  ) : (
    <div
      className="absolute inset-0 overflow-y-auto flex flex-col transition-all duration-300"
      style={{ background: tema.background }}
    >
      <ContenidoPersonal tema={tema} />
    </div>
  );
}

// =============================================================================
// CONTENIDO PERSONAL
// =============================================================================

function ContenidoPersonal({ tema }: { tema: TemaColumna }) {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const tieneModoComercial = usuario?.tieneModoComercial ?? false;

  return (
    <>
      {/* Widget CardYA */}
      <div className={`p-4 lg:p-3 2xl:p-4  `}>
        <WidgetCardYA dark={tema.widgetDark} />
      </div>

      {/* Mis Cupones + Carousel unificado */}
      <CarouselCupones tema={tema} />

      {/* Espacio flexible */}
      <div className="flex-1" />

      {/* CTA PARA NEGOCIOS - Solo mostrar si NO tiene modo comercial */}
      {!tieneModoComercial && (
        <div className={`${tema.ctaBg}`}>
          <div className="w-full px-4 py-5 lg:py-4 2xl:py-5 text-left">
            {/* Header del CTA */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
                <Store className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
              </div>
              <div>
                <p className={`font-bold text-base lg:text-sm 2xl:text-base ${tema.textPrimary}`}>¿Tienes un negocio?</p>
                <p className={`text-sm lg:text-xs 2xl:text-sm ${tema.textSecondary}`}>Crea tu perfil y llega a más clientes</p>
              </div>
            </div>

            {/* Stats del CTA */}
            <div className={`flex items-center justify-between text-sm lg:text-xs 2xl:text-sm mb-3 px-1 ${tema.textSecondary}`}>
              <span className="flex flex-col items-center">
                <strong className={`text-base lg:text-sm 2xl:text-base ${tema.ctaPriceColor}`}>$449</strong>
                <span className={`text-xs ${tema.textMuted}`}>/mes</span>
              </span>
              <span className="flex flex-col items-center">
                <strong className="text-base lg:text-sm 2xl:text-base text-blue-600">7 días</strong>
                <span className={`text-xs ${tema.textMuted}`}>gratis</span>
              </span>
              <span className="flex flex-col items-center">
                <strong className={`text-base lg:text-sm 2xl:text-base ${tema.ctaPriceColor}`}>2.5k+</strong>
                <span className={`text-xs ${tema.textMuted}`}>negocios</span>
              </span>
            </div>

            {/* Botón del CTA */}
            <button
              onClick={() => navigate('/crear-negocio')}
              className="w-full flex items-center justify-center gap-2 py-3 lg:py-2.5 2xl:py-3 2xl:rounded-xl lg:rounded-lg text-base lg:text-sm 2xl:text-base font-semibold active:scale-[0.98] shadow-lg cursor-pointer btn-shine text-white"
              style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}
            >
              <span>Empezar ahora</span>
              <ArrowRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
            </button>
          </div>
        </div>
      )}
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

function ContenidoComercial({ participaPuntos }: { participaPuntos: boolean }) {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const sucursalActiva = usuario?.sucursalActiva;
  const { setSucursalActiva, setEsSucursalPrincipal, setSucursalPrincipalId, setTotalSucursales } = useAuthStore();
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const esGerente = !!usuario?.sucursalAsignada;

  // Sucursales para selector
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string; esPrincipal: boolean }[]>([]);

  useEffect(() => {
    if (!usuario?.negocioId || usuario?.modoActivo !== 'comercial') return;
    obtenerSucursalesNegocio(usuario.negocioId).then((resp) => {
      if (resp.success && resp.data) {
        type Sucursal = { id: string; nombre: string; esPrincipal: boolean };
        const ordenadas = [...resp.data].sort((a: Sucursal, b: Sucursal) => {
          if (a.esPrincipal) return -1;
          if (b.esPrincipal) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
        setSucursales(ordenadas);
        // ✅ Alimentar el store global con el total de sucursales
        setTotalSucursales(ordenadas.length);
        const principal = ordenadas.find((s: Sucursal) => s.esPrincipal);
        if (principal) setSucursalPrincipalId(principal.id);
      }
    }).catch(() => { });
  }, [usuario?.negocioId, usuario?.modoActivo]);

  const indiceSuc = sucursales.findIndex(s => s.id === sucursalActiva);
  const sucActual = sucursales[indiceSuc];
  const tieneMuchasSuc = totalSucursales > 1 && !esGerente;

  const irSucAnterior = () => {
    if (indiceSuc > 0) {
      const suc = sucursales[indiceSuc - 1];
      setSucursalActiva(suc.id);
      setEsSucursalPrincipal(suc.esPrincipal);
    }
  };

  const irSucSiguiente = () => {
    if (indiceSuc < sucursales.length - 1) {
      const suc = sucursales[indiceSuc + 1];
      setSucursalActiva(suc.id);
      setEsSucursalPrincipal(suc.esPrincipal);
    }
  };

  // KPIs del día — React Query (comparte caché con Dashboard si periodo='hoy')
  const { kpis: kpisHoy } = useDashboard('hoy');

  const tipDelDia = TIPS_DIARIOS[new Date().getDay()];
  const ventasTotales = kpisHoy?.ventas?.valor ?? 0;
  const clientes = kpisHoy?.clientes?.valor ?? 0;
  const transacciones = kpisHoy?.transacciones?.valor ?? 0;

  return (
    <>
      {/* Espacio flexible - empuja resumen y tip hacia abajo */}
      <div className="flex-1" />

      {/* ===== RESUMEN DE HOY (card) ===== */}
      {participaPuntos ? (
        <>
          {/* Card */}
          <div className="mx-3 lg:mx-2 2xl:mx-3 mb-2 lg:mb-1.5 2xl:mb-2 rounded-xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
          {/* Header */}
          <div className="px-3 lg:px-2.5 2xl:px-3 py-2 lg:py-1.5 2xl:py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            <BarChart3 className="w-4 h-4 text-white shrink-0" />
            <p className="font-bold text-white text-sm lg:text-xs 2xl:text-base flex-1 whitespace-nowrap">
              Resumen del Día
            </p>
            {tieneMuchasSuc && sucActual && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={irSucAnterior}
                  disabled={indiceSuc === 0}
                  className={`p-0.5 rounded-full ${indiceSuc === 0 ? 'text-white/30' : 'text-white/80 hover:bg-white/10 active:scale-95 cursor-pointer'}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm lg:text-[11px] 2xl:text-sm text-white/70 font-bold">
                  {indiceSuc + 1}/{sucursales.length}
                </span>
                <button
                  onClick={irSucSiguiente}
                  disabled={indiceSuc === sucursales.length - 1}
                  className={`p-0.5 rounded-full ${indiceSuc === sucursales.length - 1 ? 'text-white/30' : 'text-white/80 hover:bg-white/10 active:scale-95 cursor-pointer'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
          {/* Nombre de sucursal (solo con 2+) */}
          {tieneMuchasSuc && sucActual && (
            <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3 px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5 border-b-[1.5px] border-slate-300">
              <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-700" />
              </div>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black truncate">
                {sucActual.esPrincipal ? 'Matriz' : sucActual.nombre}
              </p>
            </div>
          )}

          {/* Métricas */}
          <div className="divide-y-[1.5px] divide-slate-300">
            {/* Ventas */}
            <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3 px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5">
              <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 bg-emerald-200 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-emerald-700" />
              </div>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black flex-1">Ventas</p>
              <p className="text-base lg:text-sm 2xl:text-base font-black text-emerald-600 mr-1">${ventasTotales.toLocaleString()}</p>
              <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 shrink-0" />
            </div>

            {/* Clientes */}
            <button
              onClick={() => navigate('/business-studio/clientes')}
              className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5 cursor-pointer text-left hover:translate-x-1 transition-transform duration-200"
            >
              <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-700" />
              </div>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black flex-1">Clientes</p>
              <p className="text-base lg:text-sm 2xl:text-base font-black text-emerald-600 mr-1">{clientes}</p>
              <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-500 shrink-0" />
            </button>

            {/* Transacciones */}
            <button
              onClick={() => navigate('/business-studio/transacciones')}
              className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5 cursor-pointer text-left hover:translate-x-1 transition-transform duration-200"
            >
              <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 bg-indigo-200 rounded-lg flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-indigo-700" />
              </div>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-black flex-1">Transacciones</p>
              <p className="text-base lg:text-sm 2xl:text-base font-black text-emerald-600 mr-1">{transacciones}</p>
              <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-500 shrink-0" />
            </button>
          </div>
          </div>
        </>
      ) : null}

      {/* ===== TIP DEL DÍA ===== */}
      <div className="mx-3 lg:mx-2 2xl:mx-3 mb-3 lg:mb-2 2xl:mb-3">
        <div className="rounded-xl p-3 lg:p-2.5 2xl:p-3" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          {/* Label arriba */}
          <div className="flex items-center gap-2 mb-2 lg:mb-1.5 2xl:mb-2">
            <span className="text-base lg:text-sm 2xl:text-base">💡</span>
            <span className="text-sm lg:text-xs 2xl:text-base font-bold text-amber-400">
              Tip del Día
            </span>
          </div>
          {/* Tip text */}
          <p className="text-sm lg:text-xs 2xl:text-sm leading-relaxed font-medium text-white/85 line-clamp-3 lg:line-clamp-2 2xl:line-clamp-3 italic">
            {tipDelDia}
          </p>
        </div>
      </div>
    </>
  );
}

export default ColumnaIzquierda;