/**
 * AnimacionBasuraAudio.tsx
 * ==========================
 * Animación de "bote de basura" al cancelar una grabación de audio — mic
 * cayendo dentro de un bote que abre/cierra su tapa. Extraída de
 * `chatya/InputMensaje.tsx` (donde nació) para reusarla en cualquier otro
 * flujo de grabación de voz (ej. Asistente Coyo) sin duplicar el patrón.
 *
 * Ubicación: apps/web/src/components/ui/AnimacionBasuraAudio.tsx
 */

import { useEffect } from 'react';
import { Mic } from 'lucide-react';

// =============================================================================
// ESTILOS GLOBALES (inyección única en document.head)
// =============================================================================

const AUDIO_STYLES_ID = 'anunciaya-audio-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(AUDIO_STYLES_ID)) {
  const style = document.createElement('style');
  style.id = AUDIO_STYLES_ID;
  style.textContent = `
    @keyframes ab-fondo { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes ab-aparece { 0% { opacity: 0; transform: scale(0.4) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ab-tapa-abre { 0% { transform: rotate(0deg); } 100% { transform: rotate(-35deg); } }
    @keyframes ab-tapa-cierra { 0% { transform: rotate(-35deg); } 70% { transform: rotate(3deg); } 100% { transform: rotate(0deg); } }
    @keyframes ab-mic-cae { 0% { transform: translateX(-50%) translateY(0) rotate(-10deg); opacity: 1; } 60% { transform: translateX(-50%) translateY(30px) rotate(5deg); opacity: 1; } 80% { transform: translateX(-50%) translateY(26px) rotate(-2deg); opacity: 0.8; } 100% { transform: translateX(-50%) translateY(30px) rotate(0deg); opacity: 0; } }
    @keyframes ab-sacude { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-2px); } }
    @keyframes ab-sale { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.6) translateY(15px); } }
  `;
  document.head.appendChild(style);
}

export function AnimacionBasuraAudio({ onCompleta }: { onCompleta: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onCompleta, 1400);
    return () => clearTimeout(timer);
  }, [onCompleta]);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
      {/* Fondo sutil */}
      <div
        className="absolute inset-0 bg-black/10"
        style={{ animation: 'ab-fondo 1.4s ease-out forwards' }}
      />

      {/* Capa salida */}
      <div style={{ animation: 'ab-sale 0.35s ease-in forwards 1.05s' }}>
        {/* Capa aparición */}
        <div style={{ animation: 'ab-aparece 0.3s ease-out forwards' }}>
          {/* Capa sacudida */}
          <div style={{ animation: 'ab-sacude 0.15s ease-in-out forwards 0.78s' }}>
            <div className="relative" style={{ width: '52px', height: '64px' }}>

              {/* Mic cayendo */}
              <div
                className="absolute left-1/2 z-10"
                style={{
                  transform: 'translateX(-50%)',
                  top: '-20px',
                  animation: 'ab-mic-cae 0.45s cubic-bezier(0.55, 0, 1, 0.45) forwards 0.25s',
                  opacity: 0,
                }}
              >
                <Mic className="w-5 h-5 text-white" />
              </div>

              {/* Tapa (manija + línea) */}
              <div
                className="absolute top-0 left-0 w-full flex flex-col items-center z-20"
                style={{
                  transformOrigin: '4px bottom',
                  animation: 'ab-tapa-abre 0.25s ease-out forwards 0.05s, ab-tapa-cierra 0.15s ease-in forwards 0.72s',
                }}
              >
                <div className="w-4 h-1.5 bg-red-400 rounded-t" />
                <div className="w-12 h-2 bg-red-500 rounded-sm" />
              </div>

              {/* Cuerpo del bote */}
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-b-2xl overflow-hidden"
                style={{ top: '14px', width: '44px', height: '50px', background: 'linear-gradient(to bottom, #ef4444, #dc2626)' }}
              >
                <div className="flex gap-2 justify-center pt-4">
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AnimacionBasuraAudio;
