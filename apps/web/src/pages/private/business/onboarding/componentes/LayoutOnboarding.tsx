/**
 * LayoutOnboarding.tsx - TODO CENTRADO Y AJUSTADO
 * =================================================
 * Layout con TODOS los cards ajustados al contenido
 * 
 * CARACTERÍSTICAS:
 * - Logo card ajustado al contenido
 * - Pasos card ajustado al contenido  
 * - Pausar button ajustado al contenido
 * - Content card ajustado al contenido
 * - TODO centrado horizontalmente en la pantalla
 * - LAPTOP (lg): Reducido al 65% con scale(0.65)
 */

import { ReactNode, useState, useRef, useEffect } from 'react';
import { Clock, Home, MapPin, Phone, Image as ImageIcon, CreditCard, Star, ShoppingCart, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { IndicadorPasos } from './IndicadorPasos';
import { BotonesNavegacion } from './BotonesNavegacion';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/useAuthStore';

// =============================================================================
// TIPOS
// =============================================================================

interface LayoutOnboardingProps {
  /** Contenido del paso actual */
  children: ReactNode;
  /** Título del paso */
  tituloPaso: string;
  /** Descripción del paso */
  descripcionPaso: string;
  /** Ícono del paso (componente Lucide) */
  iconoPaso: ReactNode;
  /** Función al hacer clic en "Pausar" */
  onPausar: () => void;
}

// =============================================================================
// TABS ONBOARDING (estilo Mi Perfil)
// =============================================================================

const TABS_ONBOARDING = [
  { numero: 1, label: 'Categorías', icono: <Home className="w-4 h-4" /> },
  { numero: 2, label: 'Ubicación', icono: <MapPin className="w-4 h-4" /> },
  { numero: 3, label: 'Contacto', icono: <Phone className="w-4 h-4" /> },
  { numero: 4, label: 'Horarios', icono: <Clock className="w-4 h-4" /> },
  { numero: 5, label: 'Imágenes', icono: <ImageIcon className="w-4 h-4" /> },
  { numero: 6, label: 'Pagos', icono: <CreditCard className="w-4 h-4" /> },
  { numero: 7, label: 'Puntos', icono: <Star className="w-4 h-4" /> },
  { numero: 8, label: 'Productos', icono: <ShoppingCart className="w-4 h-4" /> },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export function LayoutOnboarding({
  children,
  tituloPaso,
  descripcionPaso,
  iconoPaso,
  onPausar,
}: LayoutOnboardingProps) {
  const { pasoActual, pasosCompletados, irAPaso } = useOnboardingStore();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const handleCerrarSesion = () => {
    navigate('/');
    logout();
  };

  // Auto-scroll al tab activo cuando cambia el paso
  useEffect(() => {
    if (tabBarRef.current) {
      const activeBtn = tabBarRef.current.querySelector('[data-active="true"]') as HTMLElement;
      activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pasoActual]);

  // Guardar paso actual antes de cambiar (sin validar)
  const guardarPasoActual = async () => {
    const guardarFn = (window as unknown as Record<string, ((validar: boolean) => Promise<void>) | undefined>)[`guardarPaso${pasoActual}`];
    if (typeof guardarFn === 'function') {
      await guardarFn(false);
    }
  };

  // Determinar si un tab es clickeable
  const esTabClickeable = (numeroPaso: number) => {
    if (numeroPaso === pasoActual || guardando) return false;
    const esRetroceso = numeroPaso < pasoActual;
    const esCompletado = pasosCompletados[numeroPaso - 1];
    const esSiguienteInmediato = numeroPaso === pasoActual + 1;
    const pasoAnteriorCompletado = numeroPaso > 1 && pasosCompletados[numeroPaso - 2];
    return esRetroceso || esCompletado || (esSiguienteInmediato && pasoAnteriorCompletado) || numeroPaso === 1;
  };

  // Click en un tab
  const handleClickTab = async (numeroPaso: number) => {
    if (numeroPaso === pasoActual || guardando || !esTabClickeable(numeroPaso)) return;
    setGuardando(true);
    try {
      await guardarPasoActual();
      await irAPaso(numeroPaso);
    } catch (error) {
      console.error('Error al cambiar de paso:', error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Fondo móvil — vertical */}
      <div className="lg:hidden fixed inset-0 -z-10" style={{ background: 'linear-gradient(to bottom, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }} />
      {/* Fondo desktop — horizontal */}
      <div className="hidden lg:block fixed inset-0 -z-10" style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }} />

      {/* ===================================================================== */}
      {/* LAYOUT MÓVIL — TabBar estilo Mi Perfil */}
      {/* ===================================================================== */}
      <style>{`
        .onboarding-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .onboarding-tabs-scroll::-webkit-scrollbar { display: none; }
        @keyframes onboardingShine {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(300%); opacity: 0; }
        }
        .onboarding-shine-line {
          position: relative;
          height: 4px;
          background: linear-gradient(90deg, #1e3a8a, #3b82f6, #60a5fa, #3b82f6, #1e3a8a);
          overflow: hidden;
        }
        .onboarding-shine-line::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: onboardingShine 2.5s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Header Onboarding — simplificado */}
        <header className="shrink-0 z-50 px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
          <Link to="/inicio" className="shrink-0">
            <img src="/logo-anunciaya-azul.webp" alt="AnunciaYA" className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={onPausar} className="p-2 rounded-full text-white/80 hover:bg-white/20 transition-colors cursor-pointer" title="Pausar progreso">
              <Clock className="w-5 h-5" />
            </button>
            <button onClick={handleCerrarSesion} className="p-2 rounded-full text-white/80 hover:bg-white/20 transition-colors cursor-pointer" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="onboarding-shine-line" />

        {/* TabBar scrolleable */}
        <div className="px-4 pb-3 pt-6">
          <div ref={tabBarRef} className="overflow-x-auto onboarding-tabs-scroll">
            <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md w-fit">
              {TABS_ONBOARDING.map((tab) => {
                const esActivo = pasoActual === tab.numero;
                const clickeable = esTabClickeable(tab.numero);
                return (
                  <button
                    key={tab.numero}
                    type="button"
                    data-active={esActivo}
                    onClick={() => handleClickTab(tab.numero)}
                    disabled={esActivo || (!clickeable && !esActivo)}
                    className={`
                      flex items-center gap-1 px-3 h-10
                      rounded-lg text-sm font-semibold
                      whitespace-nowrap shrink-0 transition-all
                      ${esActivo
                        ? 'text-white shadow-md'
                        : clickeable
                          ? 'text-slate-700 hover:bg-slate-300 cursor-pointer'
                          : 'text-slate-400 cursor-not-allowed'
                      }
                    `}
                    style={esActivo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {tab.icono}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto px-4 pb-24">
          {children}
        </main>

        {/* Footer Fijo */}
        <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-300 p-4 pb-safe shadow-lg">
          <BotonesNavegacion />
        </footer>
      </div>

      {/* ===================================================================== */}
      {/* LAYOUT LAPTOP + DESKTOP */}
      {/* ===================================================================== */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:overflow-hidden">

        {/* Header Onboarding — simplificado */}
        <header className="shrink-0 z-50 px-4 lg:px-6 2xl:px-8 flex items-center justify-between h-16 2xl:h-[72px]"
          style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
          <Link to="/inicio" className="shrink-0">
            <img src="/logo-anunciaya-azul.webp" alt="AnunciaYA" className="h-9 2xl:h-11 w-auto object-contain hover:scale-110 transition-transform" />
          </Link>
          <span className="text-white/90 text-base 2xl:text-lg font-semibold">
            Configuración del negocio
          </span>
          <div className="flex items-center gap-2 2xl:gap-3">
            <button onClick={onPausar} className="flex items-center gap-2 px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-lg bg-white/15 border-2 border-white/30 text-white hover:bg-white/25 transition-all cursor-pointer text-sm 2xl:text-base font-semibold shadow-sm">
              <Clock className="w-4 h-4 2xl:w-5 2xl:h-5" />
              <span>Pausar</span>
            </button>
            <button onClick={handleCerrarSesion} className="flex items-center gap-2 px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-lg bg-white/15 border-2 border-white/30 text-white hover:bg-white/25 transition-all cursor-pointer text-sm 2xl:text-base font-semibold shadow-sm">
              <LogOut className="w-4 h-4 2xl:w-5 2xl:h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>
        <div className="onboarding-shine-line" />

        {/* Contenido — scroll de página, sin card wrapper */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl lg:max-w-4xl 2xl:max-w-5xl mx-auto lg:px-4 lg:pt-8 lg:pb-6 2xl:px-6 2xl:pt-10 2xl:pb-8">
            <div className="grid grid-cols-[220px_1fr] 2xl:grid-cols-[260px_1fr] gap-6 2xl:gap-8">

              {/* ================================================================= */}
              {/* COLUMNA IZQUIERDA — Pasos (sticky) */}
              {/* ================================================================= */}
              <aside className="sticky top-4 self-start space-y-4 2xl:space-y-5">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 px-6 py-4 2xl:px-8 2xl:py-5">
                  <IndicadorPasos />
                </div>
                <BotonesNavegacion />
              </aside>

              {/* ================================================================= */}
              {/* COLUMNA DERECHA — Contenido directo */}
              {/* ================================================================= */}
              <main className="space-y-4 lg:space-y-3 2xl:space-y-4">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutOnboarding;