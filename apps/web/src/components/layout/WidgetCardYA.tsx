/**
 * WidgetCardYA.tsx
 * =================
 * Widget de CardYA con sistema de niveles para la columna izquierda.
 *
 * SISTEMA DE NIVELES:
 * 🥉 BRONCE: 0 - 4,999 puntos (1x multiplicador)
 * 🥈 PLATA:  5,000 - 14,999 puntos (1.25x multiplicador)
 * 🥇 ORO:    15,000+ puntos (1.5x multiplicador)
 *
 * Ubicación: apps/web/src/components/layout/WidgetCardYA.tsx
 */

import { useNavigate } from 'react-router-dom';
import { CreditCard, Star, Award } from 'lucide-react';

// =============================================================================
// TIPOS Y CONFIGURACIÓN DE NIVELES
// =============================================================================

type NivelCardYA = 'bronce' | 'plata' | 'oro';

interface ConfigNivel {
  nombre: string;
  minPuntos: number;
  maxPuntos: number | null;
  multiplicador: number;
  gradiente: {
    from: string;
    via: string;
    to: string;
  };
  accentColor: string;
  iconColor: string;
  badgeGradient: string;
  emoji: string;
}

const NIVELES_CONFIG: Record<NivelCardYA, ConfigNivel> = {
  bronce: {
    nombre: 'Bronce',
    minPuntos: 0,
    maxPuntos: 4999,
    multiplicador: 1.0,
    gradiente: {
      from: 'from-amber-700',
      via: 'via-amber-800',
      to: 'to-amber-900',
    },
    accentColor: 'text-amber-400',
    iconColor: 'text-amber-900',
    badgeGradient: 'from-amber-500 to-amber-700',
    emoji: '🥉',
  },
  plata: {
    nombre: 'Plata',
    minPuntos: 5000,
    maxPuntos: 14999,
    multiplicador: 1.25,
    gradiente: {
      from: 'from-gray-300',
      via: 'via-gray-400',
      to: 'to-gray-500',
    },
    accentColor: 'text-gray-100',
    iconColor: 'text-gray-700',
    badgeGradient: 'from-gray-300 to-gray-500',
    emoji: '🥈',
  },
  oro: {
    nombre: 'Oro',
    minPuntos: 15000,
    maxPuntos: null,
    multiplicador: 1.5,
    gradiente: {
      from: 'from-yellow-400',
      via: 'via-yellow-500',
      to: 'to-yellow-600',
    },
    accentColor: 'text-yellow-100',
    iconColor: 'text-yellow-900',
    badgeGradient: 'from-yellow-400 to-yellow-600',
    emoji: '🥇',
  },
};

// =============================================================================
// FUNCIONES DE CÁLCULO
// =============================================================================

function calcularNivel(puntosLifetime: number): NivelCardYA {
  if (puntosLifetime >= 15000) return 'oro';
  if (puntosLifetime >= 5000) return 'plata';
  return 'bronce';
}

function calcularProgresoNivel(puntosLifetime: number): {
  nivelActual: NivelCardYA;
  configActual: ConfigNivel;
  siguienteNivel: NivelCardYA | null;
  puntosParaSiguiente: number;
  progresoPorcentaje: number;
} {
  const nivelActual = calcularNivel(puntosLifetime);
  const configActual = NIVELES_CONFIG[nivelActual];

  let siguienteNivel: NivelCardYA | null = null;
  let puntosParaSiguiente = 0;
  let progresoPorcentaje = 0;

  if (nivelActual === 'bronce') {
    siguienteNivel = 'plata';
    puntosParaSiguiente = 5000;
    progresoPorcentaje = (puntosLifetime / 5000) * 100;
  } else if (nivelActual === 'plata') {
    siguienteNivel = 'oro';
    puntosParaSiguiente = 15000;
    const puntosEnNivel = puntosLifetime - 5000;
    progresoPorcentaje = (puntosEnNivel / 10000) * 100;
  } else {
    siguienteNivel = null;
    puntosParaSiguiente = 0;
    progresoPorcentaje = 100;
  }

  return {
    nivelActual,
    configActual,
    siguienteNivel,
    puntosParaSiguiente,
    progresoPorcentaje: Math.min(progresoPorcentaje, 100),
  };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface WidgetCardYAProps {
  puntosDisponibles?: number;
  puntosLifetime?: number;
}

export function WidgetCardYA({
  puntosDisponibles = 1250,
  puntosLifetime = 12500,
}: WidgetCardYAProps) {
  const navigate = useNavigate();

  const { configActual, siguienteNivel, puntosParaSiguiente, progresoPorcentaje } =
    calcularProgresoNivel(puntosLifetime);

  return (
    <div
      onClick={() => navigate('/cardya')}
      className={`bg-linear-to-br ${configActual.gradiente.from} ${configActual.gradiente.via} ${configActual.gradiente.to} rounded-xl lg:p-2.5 2xl:p-4 p-3 text-white shadow-2xl relative overflow-hidden cursor-pointer hover:shadow-3xl hover:scale-[1.02] transition-all duration-200 group`}
    >
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        ></div>
      </div>

      {/* Header con icono y badge */}
      <div className="relative flex items-center justify-between lg:mb-2 2xl:mb-3 mb-2.5">
        <div className="flex items-center lg:gap-2 2xl:gap-3 gap-2.5">
          <div className="lg:w-7 2xl:w-10 w-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
            <CreditCard className="lg:w-3.5 2xl:w-5 w-4.5" />
          </div>
          <span className="font-bold lg:text-sm 2xl:text-xl text-base">CardYA</span>
        </div>

        {/* Badge de nivel */}
        <div
          className={`px-2 lg:px-2 2xl:px-3 lg:py-0.5 2xl:py-1 py-1 bg-linear-to-r ${configActual.badgeGradient} rounded-full text-white lg:text-[10px] 2xl:text-sm text-xs font-bold shadow-lg flex items-center lg:gap-1 2xl:gap-1.5 gap-1.5`}
        >
          <span>{configActual.emoji}</span>
          <span>{configActual.nombre}</span>
        </div>
      </div>

      {/* Puntos disponibles */}
      <div className="relative lg:mb-2 2xl:mb-3 mb-2.5">
        <div className={`${configActual.accentColor} lg:text-4xl 2xl:text-6xl text-5xl font-extrabold tracking-tighter`}>
          {puntosDisponibles.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 lg:mt-0.5 2xl:mt-1 mt-1">
          <span className="text-white/80 lg:text-[10px] 2xl:text-sm text-xs font-medium">
            puntos disponibles
          </span>
        </div>
      </div>

      {/* Multiplicador info */}
      <div className="relative flex items-center justify-between lg:py-1.5 2xl:py-2 py-2 lg:px-2 2xl:px-3 px-2.5 bg-white/10 backdrop-blur-sm rounded-lg lg:mb-2 2xl:mb-3 mb-2.5">
        <div className="flex items-center lg:gap-1.5 2xl:gap-2 gap-2">
          <Star className="lg:w-3.5 2xl:w-5 w-4 text-yellow-300" />
          <span className="lg:text-[10px] 2xl:text-sm text-xs font-semibold">
            Ganas {configActual.multiplicador}x puntos
          </span>
        </div>
        <span className="text-white/80 lg:text-[9px] 2xl:text-xs text-[10px]">
          {puntosLifetime.toLocaleString()} pts lifetime
        </span>
      </div>

      {/* Progreso al siguiente nivel */}
      {siguienteNivel && (
        <div className="relative">
          <div className="flex items-center justify-between lg:mb-1 2xl:mb-1.5 mb-1">
            <span className="lg:text-[9px] 2xl:text-xs text-[10px] text-white/90">
              Siguiente: {NIVELES_CONFIG[siguienteNivel].emoji} {NIVELES_CONFIG[siguienteNivel].nombre}
            </span>
            <span className="lg:text-[9px] 2xl:text-xs text-[10px] text-white/90">
              {puntosParaSiguiente.toLocaleString()} pts
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full lg:h-1.5 2xl:h-2 h-1.5 overflow-hidden backdrop-blur-sm">
            <div
              className={`bg-linear-to-r ${NIVELES_CONFIG[siguienteNivel].badgeGradient} lg:h-1.5 2xl:h-2 h-1.5 rounded-full transition-all duration-300`}
              style={{ width: `${progresoPorcentaje}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Nivel máximo alcanzado */}
      {!siguienteNivel && (
        <div className="relative flex items-center justify-center lg:py-1.5 2xl:py-2 py-2 bg-linear-to-r from-yellow-400/20 to-yellow-600/20 backdrop-blur-sm rounded-lg">
          <Award className="lg:w-4 2xl:w-5 w-4.5 mr-2" />
          <span className="lg:text-[10px] 2xl:text-sm text-xs font-bold">
            ¡Nivel Máximo Alcanzado!
          </span>
        </div>
      )}
    </div>
  );
}

export default WidgetCardYA;