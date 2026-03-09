/**
 * Banner429.tsx
 * ==============
 * Componentes para notificar al usuario cuando el servidor responde 429.
 *
 * Exporta dos componentes:
 * - ModalRateLimit  → Modal centrado, aparece UNA sola vez al detectar el 429
 * - BannerRateLimit → Franja fija debajo del header, visible hasta que expire el tiempo
 *
 * ¿Cómo funciona?
 * - api.ts detecta el 429 y guarda en localStorage la hora de expiración (15 min)
 * - Ambos componentes leen esa clave y reaccionan en tiempo real
 * - Persisten aunque el usuario cierre sesión, recargue o apague el dispositivo
 * - Se limpian solos cuando el tiempo expira
 *
 * Ubicación: apps/web/src/components/ui/Banner429.tsx
 */

import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';

// Clave compartida en localStorage
export const RATE_LIMIT_KEY = 'ay_rate_limit_hasta';

// =============================================================================
// HOOK COMPARTIDO
// =============================================================================

function useRateLimit() {
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [activo, setActivo] = useState<boolean>(false);

  useEffect(() => {
    const actualizar = () => {
      const hasta = localStorage.getItem(RATE_LIMIT_KEY);
      if (!hasta) { setActivo(false); return; }

      const msRestantes = parseInt(hasta) - Date.now();
      if (msRestantes <= 0) {
        localStorage.removeItem(RATE_LIMIT_KEY);
        setActivo(false);
        setSegundosRestantes(0);
        return;
      }

      setSegundosRestantes(Math.ceil(msRestantes / 1000));
      setActivo(true);
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, []);

  return { activo, segundosRestantes };
}

// =============================================================================
// ILUSTRACIÓN ANIMADA
// =============================================================================

function IlustracionDescanso() {
  return (
    <div style={{ position: 'relative', width: '140px', height: '130px', margin: '0 auto' }}>
      <style>{`
        @keyframes ay-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.94); }
        }
        @keyframes ay-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes ay-z1 {
          0% { opacity: 0; transform: translate(0,0) scale(0.6); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(10px,-22px) scale(1.1); }
        }
        @keyframes ay-z2 {
          0% { opacity: 0; transform: translate(0,0) scale(0.6); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(14px,-28px) scale(1.2); }
        }
        @keyframes ay-z3 {
          0% { opacity: 0; transform: translate(0,0) scale(0.7); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(18px,-34px) scale(1.3); }
        }
        @keyframes ay-star {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes ay-scalein {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ay-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ay-slidedown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Sombra */}
      <div style={{
        position: 'absolute', bottom: '8px', left: '50%',
        transform: 'translateX(-50%)',
        width: '70px', height: '10px',
        background: 'rgba(99,102,241,0.12)',
        borderRadius: '50%', filter: 'blur(4px)',
      }} />

      {/* Cuerpo */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '50%',
        transform: 'translateX(-50%)',
        animation: 'ay-float 3s ease-in-out infinite',
      }}>
        <div style={{
          width: '72px', height: '80px',
          background: 'linear-gradient(145deg, #818cf8, #6366f1)',
          borderRadius: '36px 36px 30px 30px',
          position: 'relative',
          animation: 'ay-breathe 3s ease-in-out infinite',
          boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
        }}>
          {/* Ojos cerrados */}
          <div style={{
            position: 'absolute', top: '28px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: '12px',
          }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                width: '10px', height: '5px',
                borderBottom: '2.5px solid rgba(255,255,255,0.8)',
                borderRadius: '0 0 10px 10px',
              }} />
            ))}
          </div>
          {/* Boca */}
          <div style={{
            position: 'absolute', top: '44px', left: '50%',
            transform: 'translateX(-50%)',
            width: '16px', height: '7px',
            borderBottom: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '0 0 10px 10px',
          }} />
          {/* Brazos */}
          <div style={{
            position: 'absolute', top: '38px', left: '-14px',
            width: '16px', height: '10px',
            background: 'linear-gradient(145deg, #818cf8, #6366f1)',
            borderRadius: '8px', transform: 'rotate(-20deg)',
          }} />
          <div style={{
            position: 'absolute', top: '38px', right: '-14px',
            width: '16px', height: '10px',
            background: 'linear-gradient(145deg, #6366f1, #4f46e5)',
            borderRadius: '8px', transform: 'rotate(20deg)',
          }} />
        </div>
      </div>

      {/* Zzzs */}
      {[
        { top: '30px', right: '22px', size: '13px', anim: 'ay-z1', delay: '0s' },
        { top: '14px', right: '10px', size: '17px', anim: 'ay-z2', delay: '0.5s' },
        { top: '0px', right: '-4px', size: '22px', anim: 'ay-z3', delay: '1s' },
      ].map((z, i) => (
        <div key={i} style={{
          position: 'absolute', top: z.top, right: z.right,
          fontSize: z.size, fontWeight: '700',
          color: i === 0 ? '#a5b4fc' : i === 1 ? '#818cf8' : '#6366f1',
          animation: `${z.anim} 2.2s ease-in-out infinite ${z.delay}`,
        }}>z</div>
      ))}

      {/* Estrellas */}
      {[
        { top: '20px', left: '18px', size: '8px', delay: '0s' },
        { top: '50px', left: '8px', size: '6px', delay: '0.7s' },
        { top: '8px', left: '40px', size: '5px', delay: '1.2s' },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: s.top, left: s.left,
          width: s.size, height: s.size,
          background: '#c7d2fe', borderRadius: '50%',
          animation: `ay-star 2s ease-in-out infinite ${s.delay}`,
        }} />
      ))}
    </div>
  );
}

// =============================================================================
// MODAL (aparece una sola vez)
// =============================================================================

export function ModalRateLimit() {
  const { activo, segundosRestantes } = useRateLimit();
  const [visible, setVisible] = useState(false);

  // Mostrar modal solo la primera vez que se activa el rate limit
  useEffect(() => {
    if (activo) setVisible(true);
  }, [activo]);

  if (!visible || !activo) return null;

  const min = Math.floor(segundosRestantes / 60);
  const seg = segundosRestantes % 60;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '24px',
      animation: 'ay-fadein 0.2s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '28px',
        padding: '28px',
        maxWidth: '480px', width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        animation: 'ay-scalein 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
      }}>
        {/* Cerrar */}
        <button
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '30px', height: '30px', borderRadius: '50%',
            background: '#f1f5f9', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8',
          }}
        >
          <X size={14} />
        </button>

        {/* Izquierda: mono + contador */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <IlustracionDescanso />
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '14px', padding: '10px 0',
            width: '140px', textAlign: 'center',
          }}>
            <p style={{
              margin: '0 0 2px', fontSize: '12px', color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '1px',
              fontFamily: 'inherit',
            }}>
              Disponible en
            </p>
            <span style={{
              fontSize: '36px', fontWeight: '800', color: '#6366f1',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '2px',
              fontFamily: 'inherit', display: 'block',
              width: '140px', textAlign: 'center',
            }}>
              {String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Derecha: texto + botón */}
        <div style={{
          flex: 1, textAlign: 'left', paddingRight: '8px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: '12px',
        }}>
          <h2 style={{
            margin: 0, fontSize: '22px', fontWeight: '700',
            color: '#0f172a', lineHeight: 1.3, fontFamily: 'inherit',
          }}>
            La app necesita un momento de descanso
          </h2>
          <p style={{
            margin: 0, fontSize: '15px', color: '#94a3b8',
            lineHeight: 1.5, fontFamily: 'inherit',
          }}>
            Usaste muchas funciones en poco tiempo. Todo volverá a funcionar pronto 🙌
          </p>
          <button
            onClick={() => setVisible(false)}
            style={{
              width: '100%', padding: '14px',
              background: '#6366f1', border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '16px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BANNER (franja persistente debajo del header)
// =============================================================================

export function BannerRateLimit() {
  const { activo, segundosRestantes } = useRateLimit();

  if (!activo) return null;

  const min = Math.floor(segundosRestantes / 60);
  const seg = segundosRestantes % 60;
  const progreso = ((15 * 60 - segundosRestantes) / (15 * 60)) * 100;

  return (
    <div style={{ animation: 'ay-slidedown 0.25s ease', background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
      {/* Barra de progreso */}
      <div style={{ height: '2px', background: '#fde68a' }}>
        <div style={{
          height: '100%', width: `${progreso}%`,
          background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          transition: 'width 1s linear',
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px' }}>
        <span style={{ fontSize: '18px' }}>😴</span>
        <p style={{
          flex: 0, margin: 0, fontSize: '14px', fontWeight: '600',
          color: '#92400e', lineHeight: 1.3, fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}>
          La app está descansando. Vuelve en
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: '#fef3c7', border: '1px solid #fde68a',
          borderRadius: '8px', padding: '5px 12px', flexShrink: 0,
        }}>
          <Clock size={14} color="#d97706" />
          <span style={{
            fontSize: '16px', fontWeight: '700', color: '#d97706',
            fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit',
          }}>
            {String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BannerRateLimit;