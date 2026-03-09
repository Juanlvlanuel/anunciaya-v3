/**
 * Banner429.tsx
 * ==============
 * Banner global que se muestra cuando el usuario recibe un error 429
 * (demasiadas peticiones al servidor).
 *
 * ¿Cómo funciona?
 * - api.ts detecta un 429 y guarda en localStorage la hora en que expira el bloqueo
 * - Este componente lee esa hora y muestra un contador regresivo
 * - Persiste aunque el usuario cierre sesión, recargue o apague el dispositivo
 * - Se elimina automáticamente cuando el tiempo expira
 *
 * Ubicación: apps/web/src/components/ui/Banner429.tsx
 */

import { useEffect, useState } from 'react';
import { WifiOff, Clock } from 'lucide-react';

// Clave en localStorage donde se guarda el timestamp de expiración del bloqueo
export const RATE_LIMIT_KEY = 'ay_rate_limit_hasta';

// ─────────────────────────────────────────────────────────────────────────────

export function Banner429() {
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Función que lee localStorage y actualiza el estado
    const actualizar = () => {
      const hasta = localStorage.getItem(RATE_LIMIT_KEY);

      if (!hasta) {
        setVisible(false);
        return;
      }

      const msRestantes = parseInt(hasta) - Date.now();

      if (msRestantes <= 0) {
        // Tiempo expirado: limpiar y ocultar
        localStorage.removeItem(RATE_LIMIT_KEY);
        setVisible(false);
        setSegundosRestantes(0);
        return;
      }

      setSegundosRestantes(Math.ceil(msRestantes / 1000));
      setVisible(true);
    };

    // Ejecutar inmediatamente al montar
    actualizar();

    // Actualizar cada segundo
    const interval = setInterval(actualizar, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || segundosRestantes <= 0) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  // Progreso: cuánto del bloqueo de 15 min ya pasó (para la barra)
  const totalSegundos = 15 * 60;
  const progresoPorcentaje = ((totalSegundos - segundosRestantes) / totalSegundos) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-9999">
      {/* Barra de progreso */}
      <div className="h-[3px] bg-white/5 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-red-500 to-orange-500 rounded-r-sm transition-all duration-1000"
          style={{ width: `${progresoPorcentaje}%` }}
        />
      </div>

      {/* Contenido del banner */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 4px 20px rgba(239,68,68,0.12)',
        }}
      >
        {/* Ícono */}
        <div className="w-9 h-9 rounded-[10px] bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
          <WifiOff size={17} className="text-red-400" />
        </div>

        {/* Mensaje */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-100 leading-tight">
            Demasiadas solicitudes
          </p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
            El servicio se restablecerá automáticamente en
          </p>
        </div>

        {/* Contador regresivo */}
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-[10px] px-3 py-1.5 shrink-0">
          <Clock size={13} className="text-red-400" />
          <span
            className="text-[15px] font-bold text-red-400 tabular-nums tracking-wide"
          >
            {String(minutos).padStart(2, '0')}:{String(segundos).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Banner429;