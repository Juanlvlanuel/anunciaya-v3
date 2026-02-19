/**
 * InputMensaje.tsx
 * =================
 * Campo de entrada para escribir y enviar mensajes.
 * Envía con Enter o botón. Emite eventos de escribiendo/dejar-escribir.
 *
 * Sprint 4: solo texto.
 * Sprints futuros: botón adjuntar (imagen, audio, documento), emojis.
 *
 * UBICACIÓN: apps/web/src/components/chatya/InputMensaje.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { emitirEvento } from '../../services/socketService';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Delay para dejar de emitir "escribiendo" después de dejar de teclear */
const ESCRIBIENDO_DELAY_MS = 2000;

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputMensaje() {
  const enviarMensaje = useChatYAStore((s) => s.enviarMensaje);
  const enviandoMensaje = useChatYAStore((s) => s.enviandoMensaje);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);

  const [texto, setTexto] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const escribiendoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estaEscribiendoRef = useRef(false);

  // Focus automático al montar y cuando cambia la conversación
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversacionActivaId]);

  // ---------------------------------------------------------------------------
  // Emitir eventos de escribiendo/dejar-escribir
  // ---------------------------------------------------------------------------
  const manejarEscribiendo = useCallback(() => {
    if (!conversacionActivaId) return;

    // Emitir "escribiendo" solo si no lo habíamos emitido
    if (!estaEscribiendoRef.current) {
      estaEscribiendoRef.current = true;
      emitirEvento('chatya:escribiendo', { conversacionId: conversacionActivaId });
    }

    // Resetear el timer
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }

    // Después de X ms sin teclear, emitir "dejar-escribir"
    escribiendoTimerRef.current = setTimeout(() => {
      if (conversacionActivaId) {
        emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId });
      }
      estaEscribiendoRef.current = false;
    }, ESCRIBIENDO_DELAY_MS);
  }, [conversacionActivaId]);

  // Cleanup del timer al desmontar
  useEffect(() => {
    return () => {
      if (escribiendoTimerRef.current) {
        clearTimeout(escribiendoTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Enviar mensaje
  // ---------------------------------------------------------------------------
  const handleEnviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviandoMensaje) return;

    // Limpiar input inmediatamente (optimista)
    setTexto('');

    // Dejar de emitir "escribiendo"
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }
    if (conversacionActivaId && estaEscribiendoRef.current) {
      emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId });
      estaEscribiendoRef.current = false;
    }

    // Enviar
    await enviarMensaje({ contenido, tipo: 'texto' });

    // Re-focus
    inputRef.current?.focus();
  }, [texto, enviandoMensaje, enviarMensaje, conversacionActivaId]);

  // ---------------------------------------------------------------------------
  // Enter para enviar (Shift+Enter para nueva línea futuro)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const puedeEnviar = texto.trim().length > 0 && !enviandoMensaje;

  return (
    <div className="px-3 py-2.5 border-t border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2">
        {/* Input de texto */}
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (e.target.value.trim()) manejarEscribiendo();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          maxLength={5000}
          className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-full text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
        />

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          className={`
            w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0
            ${puedeEnviar
              ? 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default InputMensaje;
