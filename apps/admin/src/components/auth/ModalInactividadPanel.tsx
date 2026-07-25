/**
 * ModalInactividadPanel.tsx
 * ==========================
 * Modal de inactividad del Panel Admin — réplica de `ModalInactividad` de
 * apps/web (mismo comportamiento: aviso a los 55 min con cuenta regresiva de
 * 5 min, sin cerrar con click fuera / Escape), traducida a los tokens del
 * Panel. Reusa `ModalAdaptativo` como base (siempre centrado, sin header
 * propio, sin botón de cerrar) en vez de reinventar el overlay.
 *
 * Ubicación: apps/admin/src/components/auth/ModalInactividadPanel.tsx
 */

import { useEffect } from 'react';
import { Clock, Lock } from 'lucide-react';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

// Debe coincidir con el valor inicial en useAuthPanelStore (tiempoRestante: 300)
const TIEMPO_INICIAL = 300;

export function ModalInactividadPanel() {
  const mostrarModal = useAuthPanelStore((s) => s.mostrarModalInactividad);
  const tiempoRestante = useAuthPanelStore((s) => s.tiempoRestante);
  const continuarSesion = useAuthPanelStore((s) => s.continuarSesion);
  const cerrarPorInactividad = useAuthPanelStore((s) => s.cerrarPorInactividad);

  const sesionExpirada = tiempoRestante === 0;
  const urgente = tiempoRestante <= 30 && tiempoRestante > 0;

  // Enter ejecuta la acción primaria; Escape queda bloqueado (no cierra el modal).
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

  return (
    <ModalAdaptativo
      abierto={mostrarModal}
      onCerrar={() => { /* no-op: este modal no se cierra sin elegir una acción */ }}
      mostrarHeader={false}
      cerrarAlClickFuera={false}
      cerrarConEscape={false}
      centrado
      ancho="sm"
      zIndice="z-[9999]"
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
    </ModalAdaptativo>
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

function ModalSesionPorExpirar({ tiempoRestante, urgente, onContinuar, onCerrar }: SesionPorExpirarProps) {
  const colorAcento = urgente ? 'var(--panel-danger)' : 'var(--panel-warn)';

  const radio = 52;
  const circumference = 2 * Math.PI * radio;
  const progreso = (tiempoRestante / TIEMPO_INICIAL) * 100;
  const offset = circumference * (1 - progreso / 100);

  return (
    <div className="p-8">
      {/* Ícono reloj con halo pulsante */}
      <div className="mb-4 flex justify-center">
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: colorAcento, opacity: 0.25, animation: 'modalInactividadPanelPulseRing 1.6s ease-in-out infinite' }}
          />
          <Clock className="relative h-9 w-9" style={{ color: colorAcento }} />
        </div>
      </div>

      <h3 className="mb-2 text-center text-xl font-bold tracking-tight text-texto">
        Tu sesión está por expirar
      </h3>
      <p className="mb-6 text-center text-sm leading-relaxed text-texto-3">
        Te desconectaremos del Panel por inactividad.
      </p>

      {/* Counter circular */}
      <div className="mb-6 flex justify-center">
        <div className="relative inline-flex items-center justify-center">
          <svg className="-rotate-90 transform" style={{ width: '8rem', height: '8rem' }}>
            <circle cx="64" cy="64" r={radio} stroke="var(--panel-border)" strokeWidth="8" fill="none" />
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
              className="font-semibold tabular-nums leading-none"
              style={{ fontSize: '2.5rem', color: urgente ? 'var(--panel-danger)' : 'var(--panel-text)' }}
            >
              {tiempoRestante}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-texto-4">
              segundos
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCerrar}
          data-testid="btn-modal-inactividad-panel-cerrar"
          className="flex-1 cursor-pointer rounded-[10px] border border-borde bg-superficie-2 px-4 py-3 text-sm font-semibold text-texto transition hover:bg-marca-suave"
        >
          Cerrar sesión
        </button>
        <button
          type="button"
          onClick={onContinuar}
          data-testid="btn-modal-inactividad-panel-permanecer"
          autoFocus
          className="flex-1 cursor-pointer rounded-[10px] px-4 py-3 text-sm font-semibold text-marca-contraste shadow-sm transition hover:opacity-90"
          style={{ background: colorAcento }}
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
    <div className="p-8">
      <div className="mb-4 flex justify-center">
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-peligro-suave" />
          <Lock className="relative h-9 w-9 text-peligro" />
        </div>
      </div>

      <h3 className="mb-2 text-center text-xl font-bold tracking-tight text-texto">
        Sesión cerrada
      </h3>
      <p className="mb-6 text-center text-sm leading-relaxed text-texto-3">
        Tu sesión del Panel se cerró por inactividad. Inicia sesión de nuevo para continuar.
      </p>

      <button
        type="button"
        onClick={onCerrar}
        data-testid="btn-modal-sesion-cerrada-panel-entendido"
        autoFocus
        className="w-full cursor-pointer rounded-[10px] bg-marca px-4 py-3 text-sm font-semibold text-marca-contraste shadow-sm transition hover:opacity-90"
      >
        Entendido
      </button>
    </div>
  );
}

// Inyectar keyframe del halo pulsante (una sola vez)
if (typeof document !== 'undefined' && !document.getElementById('modal-inactividad-panel-styles')) {
  const style = document.createElement('style');
  style.id = 'modal-inactividad-panel-styles';
  style.textContent = `
    @keyframes modalInactividadPanelPulseRing {
      0% { transform: scale(1); opacity: 0.25; }
      100% { transform: scale(2.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export default ModalInactividadPanel;
