/**
 * WidgetCardYA.tsx - Widget de CardYA para ColumnaIzquierda
 * ================================================================
 * Widget premium tipo tarjeta de crédito con dos modos:
 * - Light (default): estilo platinum claro, integrado con columna blanca
 * - Dark (en /cardya): fondo negro con amber, inmersivo
 * 
 * Props: dark?: boolean — activa el modo oscuro
 * 
 * Ubicación: apps/web/src/components/layout/WidgetCardYA.tsx
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useCardyaStore } from '../../stores/useCardyaStore';

// =============================================================================
// ESTILOS CSS CON ANIMACIONES
// =============================================================================

const widgetStyles = `
  /* Burbujas flotantes */
  @keyframes bubble-float {
    0% {
      transform: translateY(0) translateX(0) scale(1);
      opacity: 0.5;
    }
    30% { opacity: 0.7; }
    70% {
      transform: translateY(-80px) translateX(30px) scale(0.8);
      opacity: 0.5;
    }
    100% {
      transform: translateY(-120px) translateX(-20px) scale(0.5);
      opacity: 0;
    }
  }

  /* Burbujas — dark */
  .cardya-bubble-dark {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.6), rgba(251, 191, 36, 0.15));
    pointer-events: none;
    animation: bubble-float ease-in-out infinite;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
  }

  /* Burbujas — light (silver) */
  .cardya-bubble-light {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(148, 163, 184, 0.35), rgba(148, 163, 184, 0.08));
    pointer-events: none;
    animation: bubble-float ease-in-out infinite;
    box-shadow: 0 0 10px rgba(148, 163, 184, 0.2);
  }

  .cardya-bubble-dark:nth-child(1),
  .cardya-bubble-light:nth-child(1) { 
    width: 18px; height: 18px; bottom: 10%; left: 10%; 
    animation-delay: 0s; animation-duration: 9s;
  }
  .cardya-bubble-dark:nth-child(2),
  .cardya-bubble-light:nth-child(2) { 
    width: 15px; height: 15px; bottom: 5%; left: 30%; 
    animation-delay: 2s; animation-duration: 10s;
  }
  .cardya-bubble-dark:nth-child(3),
  .cardya-bubble-light:nth-child(3) { 
    width: 20px; height: 20px; bottom: 8%; right: 25%; 
    animation-delay: 4s; animation-duration: 11s;
  }
  .cardya-bubble-dark:nth-child(4),
  .cardya-bubble-light:nth-child(4) { 
    width: 16px; height: 16px; bottom: 15%; right: 8%; 
    animation-delay: 6s; animation-duration: 9.5s;
  }
  .cardya-bubble-dark:nth-child(5),
  .cardya-bubble-light:nth-child(5) { 
    width: 17px; height: 17px; bottom: 12%; left: 50%; 
    animation-delay: 8s; animation-duration: 10.5s;
  }

  /* Brillo del chip */
  @keyframes chip-shine {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  /* Vibración tipo ring */
  @keyframes card-ring {
    0% { transform: rotate(0deg); }
    2% { transform: rotate(-3deg); }
    4% { transform: rotate(3deg); }
    6% { transform: rotate(-3deg); }
    8% { transform: rotate(3deg); }
    10% { transform: rotate(-3deg); }
    12% { transform: rotate(3deg); }
    14% { transform: rotate(0deg); }
    100% { transform: rotate(0deg); }
  }

  /* Pulso botón (dark only) */
  @keyframes pulse-button {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 20px 5px rgba(251, 191, 36, 0.2); }
  }

  @keyframes button-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  /* Chip plateado — dark */
  .cardya-chip-dark {
    width: 34px; height: 26px;
    background: linear-gradient(135deg,
      #f0f0f0 0%, #d4d4d4 10%, #ffffff 20%, #c0c0c0 30%,
      #e8e8e8 40%, #b8b8b8 50%, #e8e8e8 60%, #c0c0c0 70%,
      #ffffff 80%, #d4d4d4 90%, #f0f0f0 100%
    );
    background-size: 200% 200%;
    animation: chip-shine 4s ease-in-out infinite;
    border-radius: 6px;
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      inset 0 -1px 0 rgba(0, 0, 0, 0.3);
    position: relative;
  }

  /* Chip plateado — light */
  .cardya-chip-light {
    width: 34px; height: 26px;
    background: linear-gradient(135deg,
      #e2e8f0 0%, #cbd5e1 10%, #f1f5f9 20%, #94a3b8 30%,
      #cbd5e1 40%, #64748b 50%, #cbd5e1 60%, #94a3b8 70%,
      #f1f5f9 80%, #cbd5e1 90%, #e2e8f0 100%
    );
    background-size: 200% 200%;
    animation: chip-shine 4s ease-in-out infinite;
    border-radius: 6px;
    box-shadow: 
      0 2px 8px rgba(100, 116, 139, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -1px 0 rgba(100, 116, 139, 0.3);
    position: relative;
  }

  .cardya-chip-dark::before,
  .cardya-chip-light::before {
    content: '';
    position: absolute;
    inset: 4px;
    background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(192, 192, 192, 0.5) 50%,
      rgba(255, 255, 255, 0.3) 100%
    );
    border-radius: 3px;
  }

  .cardya-chip-dark::after,
  .cardya-chip-light::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 70%; height: 70%;
    background: 
      repeating-linear-gradient(0deg,
        rgba(0, 0, 0, 0.1) 0px, transparent 1px, transparent 3px, rgba(0, 0, 0, 0.1) 4px
      ),
      repeating-linear-gradient(90deg,
        rgba(0, 0, 0, 0.1) 0px, transparent 1px, transparent 3px, rgba(0, 0, 0, 0.1) 4px
      );
  }
`;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface WidgetCardYAProps {
  dark?: boolean;
}

export function WidgetCardYA({ dark = false }: WidgetCardYAProps) {
  const navigate = useNavigate();

  const negociosActivos = useCardyaStore((s) => s.billeteras.length);
  const billeteras = useCardyaStore((s) => s.billeteras);
  const cargarTodo = useCardyaStore((s) => s.cargarTodo);

  // Cargar billeteras si aún no están cargadas
  useEffect(() => {
    if (billeteras.length === 0) {
      cargarTodo();
    }
  }, []);

  // Formatear "miembro desde" usando createdAt del localStorage
  const miembroDesde = (() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    try {
      const raw = localStorage.getItem('ay_usuario');
      if (raw) {
        const usuario = JSON.parse(raw);
        if (usuario.createdAt) {
          const fecha = new Date(usuario.createdAt);
          return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
        }
      }
    } catch { /* fallback */ }
    const ahora = new Date();
    return `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;
  })();

  useEffect(() => {
    const styleId = 'cardya-widget-animations';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = widgetStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  const handleVerBilleteras = () => {
    navigate('/cardya');
  };

  const bubbleClass = dark ? 'cardya-bubble-dark' : 'cardya-bubble-light';

  return (
    <div className="w-full text-transparent">
      {/* ── Tarjeta Principal ── */}
      <div
        className="relative overflow-hidden 2xl:rounded-2xl lg:rounded-lg p-3"
        style={{
          background: dark
            ? '#000000'
            : 'linear-gradient(150deg, #8797AD, #262C38)',
          aspectRatio: '1.586/1',

          boxShadow: dark
            ? 'none'
            : '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 2px rgba(0, 0, 0, 0.10)',
          animation: 'card-ring 10s ease-in-out infinite',
        }}
      >
        {/* Glow amber sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark
              ? 'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.07) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at 85% 20%, rgba(148,163,184,0.15) 0%, transparent 50%)',
          }}
        />
        {/* Grid pattern sutil — ambos modos */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.08,
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px),
                   repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 30px)`,
          }}
        />

        {/* Burbujas */}
        <div className={bubbleClass} />
        <div className={bubbleClass} />
        <div className={bubbleClass} />
        <div className={bubbleClass} />
        <div className={bubbleClass} />

        {/* Contenido */}
        <div className="relative z-10 h-full flex flex-col">

          {/* Header: Logo */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Wallet className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline">
              <span className="text-lg font-extrabold tracking-tight text-white">
                Card
              </span>
              <span className="text-xl font-extrabold tracking-tight text-amber-400">
                YA
              </span>
            </div>
          </div>

          {/* Chip */}
          <div className="2xl:mb-auto lg:mb-3  2xl:mt-2 lg:-mt-1 ">
            <div className={dark ? 'cardya-chip-dark' : 'cardya-chip-light'} />
          </div>

          {/* Footer: Info */}
          <div className="flex items-end justify-between text-xs">
            <div>
              <div className={`2xl:text-[10px] lg:text-[9px] uppercase tracking-wide mb-0 font-semibold ${dark ? 'text-slate-300' : 'text-slate-300'}`}>
                Miembro desde
              </div>
              <div className={`2xl:text-[14px] lg:text-[13px] font-bold ${dark ? 'text-amber-400' : 'text-slate-100'}`}>
                {miembroDesde}
              </div>
            </div>
            <div className="text-right">
              <div className={`2xl:text-[10px] lg:text-[9px] uppercase tracking-wide mb-0 font-semibold ${dark ? 'text-slate-300' : 'text-slate-300'}`}>
                Negocios
              </div>
              <div className={`2xl:text-[14px] lg:text-[13px] font-bold ${dark ? 'text-amber-400' : 'text-slate-100'}`}>
                {negociosActivos} activos
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Botón Principal ── */}
      <button
        onClick={handleVerBilleteras}
        className={`w-full mt-4 font-bold py-2.5 px-4 2xl:rounded-xl lg:rounded-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer hover:scale-[1.02] ${dark
          ? 'bg-black border border-white/10 hover:border-amber-500/40'
          : 'bg-linear-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-800'
          }`}
        style={undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={dark ? 'text-amber-400' : 'text-white'}>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <span className={`text-sm ${dark ? 'text-amber-400' : 'text-white'}`}>Ver mis billeteras</span>
      </button>

    </div>
  );
}

export default WidgetCardYA;