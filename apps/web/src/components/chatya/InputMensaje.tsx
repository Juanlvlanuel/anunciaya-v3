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
import { Send, X, Pencil, Reply } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { emitirEvento } from '../../services/socketService';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import * as chatyaService from '../../services/chatyaService';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Delay para dejar de emitir "escribiendo" después de dejar de teclear */
const ESCRIBIENDO_DELAY_MS = 2000;

// =============================================================================
// TIPOS
// =============================================================================

interface InputMensajeProps {
  /** Mensaje que se está editando (null si no hay edición activa) */
  mensajeEditando?: Mensaje | null;
  /** Callback para cancelar la edición */
  onCancelarEdicion?: () => void;
  /** Mensaje al que se está respondiendo (null si no hay respuesta activa) */
  mensajeRespondiendo?: Mensaje | null;
  /** Callback para cancelar la respuesta */
  onCancelarRespuesta?: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputMensaje({
  mensajeEditando = null,
  onCancelarEdicion,
  mensajeRespondiendo = null,
  onCancelarRespuesta,
}: InputMensajeProps) {
  const enviarMensaje = useChatYAStore((s) => s.enviarMensaje);
  const enviandoMensaje = useChatYAStore((s) => s.enviandoMensaje);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);

  const [texto, setTexto] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const escribiendoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estaEscribiendoRef = useRef(false);

  // Focus automático al montar (solo en escritorio, en móvil evita abrir el teclado)
  const { esMobile } = useBreakpoint();

  useEffect(() => {
    if (!esMobile) {
      inputRef.current?.focus();
    }
  }, [conversacionActivaId, esMobile]);

  // ---------------------------------------------------------------------------
  // Effect: Pre-llenar texto cuando se activa modo edición
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeEditando) {
      setTexto(mensajeEditando.contenido || '');
      inputRef.current?.focus();
    }
  }, [mensajeEditando]);

  // ---------------------------------------------------------------------------
  // Effect: Focus al activar modo respuesta
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeRespondiendo) {
      inputRef.current?.focus();
    }
  }, [mensajeRespondiendo]);

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

    // ── MODO EDICIÓN: actualizar mensaje existente ──
    if (mensajeEditando) {
      try {
        await chatyaService.editarMensaje(mensajeEditando.id, { contenido });
      } catch {
        void 0; // Silencioso
      }
      onCancelarEdicion?.();
      inputRef.current?.focus();
      return;
    }

    // ── MODO RESPUESTA: enviar con referencia al mensaje original ──
    if (mensajeRespondiendo) {
      await enviarMensaje({ contenido, tipo: 'texto', respuestaAId: mensajeRespondiendo.id });
      onCancelarRespuesta?.();
      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO NORMAL ──
    await enviarMensaje({ contenido, tipo: 'texto' });
    inputRef.current?.focus();
  }, [texto, enviandoMensaje, enviarMensaje, conversacionActivaId, mensajeEditando, onCancelarEdicion, mensajeRespondiendo, onCancelarRespuesta]);

  // ---------------------------------------------------------------------------
  // Enter para enviar (Shift+Enter para nueva línea futuro)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
    if (e.key === 'Escape') {
      if (mensajeEditando) {
        setTexto('');
        onCancelarEdicion?.();
      }
      if (mensajeRespondiendo) {
        onCancelarRespuesta?.();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const puedeEnviar = texto.trim().length > 0 && !enviandoMensaje;

  return (
    <div className="border-t border-gray-300 bg-white shrink-0">
      {/* ── Barra de edición ── */}
      {mensajeEditando && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <Pencil className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-amber-600">Editando mensaje</p>
            <p className="text-xs text-gray-500 truncate">{mensajeEditando.contenido}</p>
          </div>
          <button
            onClick={() => { setTexto(''); onCancelarEdicion?.(); }}
            className="p-1 hover:bg-amber-100 rounded-full cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      )}

      {/* ── Barra de respuesta ── */}
      {mensajeRespondiendo && !mensajeEditando && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200">
          <Reply className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-600">Respondiendo</p>
            <p className="text-xs text-gray-500 truncate">{mensajeRespondiendo.contenido}</p>
          </div>
          <button
            onClick={() => onCancelarRespuesta?.()}
            className="p-1 hover:bg-blue-100 rounded-full cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      )}

      {/* ── Input + botón enviar ── */}
      <div className="flex items-center gap-2.5 px-4 py-3">
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
          placeholder={mensajeEditando ? 'Editar mensaje...' : mensajeRespondiendo ? 'Escribir respuesta...' : 'Escribe un mensaje...'}
          maxLength={5000}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-full text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
        />

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center shrink-0
            ${puedeEnviar
              ? mensajeEditando
                ? 'bg-linear-to-br from-amber-500 to-amber-400 text-white shadow-[0_3px_10px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}

export default InputMensaje;