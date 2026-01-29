/**
 * SplashScreenScanYA.tsx
 * =======================
 * Pantalla de splash con animación zoom in del logo.
 *
 * Animación:
 * - Segundo 0.0: Logo pequeño (scale 0.4) + opacidad 0
 * - Segundo 0.8: Logo crece (scale 1.0) + opacidad 100%
 * - Segundo 1.5: Logo permanece visible
 * - Segundo 2.0: Fade out completo
 * - Segundo 2.2: Callback onComplete
 *
 * Ubicación: apps/web/src/components/scanya/SplashScreenScanYA.tsx
 */

import { useEffect, useState } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

interface SplashScreenScanYAProps {
  /** Callback cuando termina la animación */
  onComplete: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function SplashScreenScanYA({ onComplete }: SplashScreenScanYAProps) {
  const [fase, setFase] = useState<'zoom-in' | 'visible' | 'fade-out'>('zoom-in');

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;
    let timer3: ReturnType<typeof setTimeout>;
    let cleanupVisibility: (() => void) | null = null;

    // Función que inicia los timers de animación
    const iniciarAnimacion = () => {
      // Timer 1: Cambiar a "visible" después del zoom in (800ms)
      timer1 = setTimeout(() => {
        setFase('visible');
      }, 800);

      // Timer 2: Cambiar a "fade-out" (1500ms después del inicio)
      timer2 = setTimeout(() => {
        setFase('fade-out');
      }, 1500);

      // Timer 3: Llamar a onComplete (2200ms después del inicio)
      timer3 = setTimeout(() => {
        onComplete();
      }, 2200);
    };

    // Si la página está visible, iniciar inmediatamente
    if (document.visibilityState === 'visible') {
      iniciarAnimacion();
    } else {
      // Si está en background (ej: apertura desde banner PWA),
      // esperar a que esté visible para iniciar los timers
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          iniciarAnimacion();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      cleanupVisibility = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Fallback: Si después de 5 segundos sigue en background, forzar onComplete
      // Esto evita que el splash se quede infinitamente si algo falla
      timer3 = setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        onComplete();
      }, 5000);
    }

    // Cleanup
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (cleanupVisibility) cleanupVisibility();
    };
  }, [onComplete]);

  // ---------------------------------------------------------------------------
  // Clases dinámicas según la fase
  // ---------------------------------------------------------------------------
  const getLogoClasses = () => {
    const base = 'transition-all ease-out';

    if (fase === 'zoom-in') {
      return `${base} duration-[800ms] scale-[0.4] opacity-0`;
    }

    if (fase === 'visible') {
      return `${base} duration-[800ms] scale-100 opacity-100`;
    }

    // fade-out
    return `${base} duration-[700ms] scale-100 opacity-0`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden">
      {/* Fondo Gradient Flow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #001d3d 50%, #000000 100%)'
        }}
      >
        {/* Esferas de gradiente flotantes */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent)',
            filter: 'blur(80px)',
            top: '-100px',
            left: '-100px',
            animation: 'float-orb-1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(30, 58, 138, 0.4), transparent)',
            filter: 'blur(80px)',
            bottom: '-50px',
            right: '-50px',
            animation: 'float-orb-2 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.3), transparent)',
            filter: 'blur(80px)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float-orb-3 20s ease-in-out infinite',
          }}
        />

        {/* Partículas flotantes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[7px] h-[7px] bg-[#3B82F6] rounded-full opacity-60"
              style={{
                left: `${10 + i * 12}%`,
                animation: `particle-rise 15s linear infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Logo - Solo el logo, sin texto */}
      <div className={getLogoClasses()}>
        <img
          src="/logo-scanya.webp"
          alt="ScanYA"
          className="w-80 lg:w-96 2xl:w-120 h-auto select-none relative z-10"
          draggable={false}
        />
      </div>

      {/* Keyframes de animación Gradient Flow */}
      <style>{`
        @keyframes float-orb-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-50px, 50px) scale(0.9);
          }
        }

        @keyframes float-orb-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 40px) scale(1.05);
          }
          66% {
            transform: translate(40px, -40px) scale(0.95);
          }
        }

        @keyframes float-orb-3 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        @keyframes particle-rise {
          0% {
            transform: translateY(600px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default SplashScreenScanYA;