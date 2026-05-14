/**
 * ModalInactividad.tsx
 * ====================
 * Modal de inactividad — Diseño moderno-profesional con React + Iconify.
 *
 * Reemplaza la versión anterior (SweetAlert2 con HTML hardcoded) por un
 * componente React puro que usa el sistema centralizado de íconos.
 *
 * COMPORTAMIENTO:
 * - Si `tiempoRestante > 0`: muestra modal "Sesión por expirar" con counter circular
 * - Si `tiempoRestante === 0`: muestra modal "Sesión cerrada"
 * - allowOutsideClick: false (no se cierra al hacer click fuera)
 * - allowEscapeKey: false (no se cierra con Escape)
 * - Enter: ejecuta la acción primaria (Permanecer / Entendido)
 *
 * Ubicación: apps/web/src/components/auth/ModalInactividad.tsx
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ICONOS } from '../../config/iconos';

// Debe coincidir con el valor inicial en useAuthStore (tiempoRestante: 300)
const TIEMPO_INICIAL = 300;

export function ModalInactividad() {
  const mostrarModal = useAuthStore((state) => state.mostrarModalInactividad);
  const tiempoRestante = useAuthStore((state) => state.tiempoRestante);
  const continuarSesion = useAuthStore((state) => state.continuarSesion);
  const cerrarPorInactividad = useAuthStore((state) => state.cerrarPorInactividad);

  const sesionExpirada = tiempoRestante === 0;
  const urgente = tiempoRestante <= 30 && tiempoRestante > 0;

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!mostrarModal) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [mostrarModal]);

  // Manejar tecla Enter (acción primaria) y bloquear Escape
  useEffect(() => {
    if (!mostrarModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (sesionExpirada) cerrarPorInactividad();
        else continuarSesion();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mostrarModal, sesionExpirada, continuarSesion, cerrarPorInactividad]);

  if (!mostrarModal) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-inactividad-titulo"
    >
      {sesionExpirada ? (
        <ModalSesionCerrada onCerrar={cerrarPorInactividad} />
      ) : (
        <ModalSesionPorExpirar
          tiempoRestante={tiempoRestante}
          urgente={urgente}
          onContinuar={continuarSesion}
          onCerrar={cerrarPorInactividad}
        />
      )}
    </div>,
    document.body
  );
}

// ════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Sesión por expirar (counter activo)
// ════════════════════════════════════════════════════════════════════

interface SesionPorExpirarProps {
  tiempoRestante: number;
  urgente: boolean;
  onContinuar: () => void;
  onCerrar: () => void;
}

function ModalSesionPorExpirar({
  tiempoRestante,
  urgente,
  onContinuar,
  onCerrar,
}: SesionPorExpirarProps) {
  const colorAcento = urgente ? '#dc2626' : '#f97316';
  const gradientePrimario = urgente
    ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
    : 'linear-gradient(135deg, #fb923c, #ea580c)';
  const gradientePrimarioHover = urgente
    ? 'linear-gradient(135deg, #dc2626, #991b1b)'
    : 'linear-gradient(135deg, #f97316, #c2410c)';

  const radio = 52;
  const circumference = 2 * Math.PI * radio;
  const progreso = (tiempoRestante / TIEMPO_INICIAL) * 100;
  const offset = circumference * (1 - progreso / 100);

  return (
    <div
      className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-8"
      style={{ animation: 'modalInactividadFadeIn 0.2s ease-out' }}
    >
      {/* Ícono reloj con halo pulsante */}
      <div className="flex justify-center mb-4">
        <div className="relative w-11 h-11 flex items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: colorAcento,
              opacity: 0.25,
              animation: 'modalInactividadPulseRing 1.6s ease-in-out infinite',
            }}
          />
          <Icon
            icon={ICONOS.horario}
            className="w-10 h-10 relative"
            style={{ color: colorAcento }}
          />
        </div>
      </div>

      {/* Título centrado */}
      <h3
        id="modal-inactividad-titulo"
        className="text-center text-xl font-semibold text-slate-900 tracking-tight mb-2"
      >
        Tu sesión está por expirar
      </h3>
      <p className="text-center text-sm text-slate-500 leading-relaxed mb-6">
        Te desconectaremos por inactividad.
      </p>

      {/* Counter circular */}
      <div className="flex justify-center mb-6">
        <div className="relative inline-flex items-center justify-center">
          <svg
            className="transform -rotate-90"
            style={{ width: '8rem', height: '8rem' }}
          >
            <circle
              cx="64"
              cy="64"
              r={radio}
              stroke="#e2e8f0"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r={radio}
              stroke={colorAcento}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={`font-semibold tabular-nums leading-none ${
                urgente ? 'text-red-600' : 'text-slate-900'
              }`}
              style={{ fontSize: '2.5rem' }}
            >
              {tiempoRestante}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              segundos
            </div>
          </div>
        </div>
      </div>

      {/* Botones lado a lado — ambos con gradient sutil */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCerrar}
          data-testid="btn-modal-inactividad-cerrar"
          className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg, #334155, #1e293b)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg, #1e293b, #0f172a)')
          }
        >
          Cerrar sesión
        </button>
        <button
          onClick={onContinuar}
          data-testid="btn-modal-inactividad-permanecer"
          autoFocus
          className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all shadow-sm"
          style={{ background: gradientePrimario }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = gradientePrimarioHover)
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = gradientePrimario)
          }
        >
          Permanecer
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Sesión cerrada (ya expiró el counter)
// ════════════════════════════════════════════════════════════════════

function ModalSesionCerrada({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-8"
      style={{ animation: 'modalInactividadFadeIn 0.2s ease-out' }}
    >
      {/* Ícono candado en rojo */}
      <div className="flex justify-center mb-4">
        <div className="relative w-11 h-11 flex items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: '#dc2626',
              opacity: 0.18,
            }}
          />
          <Icon
            icon="ph:lock-key-fill"
            className="w-10 h-10 relative"
            style={{ color: '#dc2626' }}
          />
        </div>
      </div>

      {/* Título centrado */}
      <h3
        id="modal-inactividad-titulo"
        className="text-center text-xl font-semibold text-slate-900 tracking-tight mb-2"
      >
        Sesión cerrada
      </h3>
      <p className="text-center text-sm text-slate-500 leading-relaxed mb-6">
        Tu sesión fue cerrada por inactividad. Inicia sesión nuevamente para
        continuar.
      </p>

      {/* Botón único primario */}
      <button
        onClick={onCerrar}
        data-testid="btn-modal-sesion-cerrada-entendido"
        autoFocus
        className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg, #334155, #1e293b)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg, #1e293b, #0f172a)')
        }
      >
        Entendido
      </button>
    </div>
  );
}

// Inyectar keyframes (una vez)
if (
  typeof document !== 'undefined' &&
  !document.getElementById('modal-inactividad-styles')
) {
  const style = document.createElement('style');
  style.id = 'modal-inactividad-styles';
  style.textContent = `
    @keyframes modalInactividadFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes modalInactividadPulseRing {
      0% { transform: scale(1); opacity: 0.25; }
      100% { transform: scale(2.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export default ModalInactividad;
