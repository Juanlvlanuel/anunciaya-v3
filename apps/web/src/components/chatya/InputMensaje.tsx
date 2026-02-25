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
import { createPortal } from 'react-dom';
import { Send, X, Pencil, Reply, Smile } from 'lucide-react';
import { SelectorEmojis } from './SelectorEmojis';
import { TextoConEmojis } from './TextoConEmojis';
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
  /** Si el contacto está bloqueado, deshabilitar el input */
  bloqueado?: boolean;
  /** Nombre del contacto (para mostrar en barra de respuesta/edición) */
  nombreContacto?: string;
  /** ID del usuario actual (para determinar "Tú" vs nombre del contacto) */
  miId?: string;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputMensaje({
  mensajeEditando = null,
  onCancelarEdicion,
  mensajeRespondiendo = null,
  onCancelarRespuesta,
  bloqueado = false,
  nombreContacto = '',
  miId = '',
}: InputMensajeProps) {
  const enviarMensaje = useChatYAStore((s) => s.enviarMensaje);
  const enviandoMensaje = useChatYAStore((s) => s.enviandoMensaje);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const chatTemporal = useChatYAStore((s) => s.chatTemporal);
  const crearConversacion = useChatYAStore((s) => s.crearConversacion);
  const transicionarAConversacionReal = useChatYAStore((s) => s.transicionarAConversacionReal);
  const borradores = useChatYAStore((s) => s.borradores);
  const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
  const limpiarBorrador = useChatYAStore((s) => s.limpiarBorrador);

  const [texto, setTexto] = useState('');
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [pickerSaliendo, setPickerSaliendo] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const smileBtnRef = useRef<HTMLButtonElement>(null);
  const escribiendoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estaEscribiendoRef = useRef(false);

  // Focus automático al montar (solo en escritorio, en móvil evita abrir el teclado)
  const { esMobile } = useBreakpoint();

  // Effect: al cambiar de conversación → guardar borrador actual y cargar el de la nueva
  const conversacionAnteriorRef = useRef<string | null>(null);
  useEffect(() => {
    const anterior = conversacionAnteriorRef.current;

    // Guardar borrador de la conversación anterior
    if (anterior && anterior !== conversacionActivaId) {
      if (texto.trim()) {
        guardarBorrador(anterior, texto);
      } else {
        limpiarBorrador(anterior);
      }
    }

    // Cargar borrador de la nueva conversación (solo si no hay modo edición)
    if (conversacionActivaId && !mensajeEditando) {
      setTexto(borradores[conversacionActivaId] || '');
    }

    conversacionAnteriorRef.current = conversacionActivaId;
  }, [conversacionActivaId]);

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

  /** Cierra el picker de emojis con animación funnel */
  const cerrarPicker = useCallback(() => {
    if (!pickerAbierto || pickerSaliendo) return;
    setPickerSaliendo(true);
    setTimeout(() => {
      setPickerAbierto(false);
      setPickerSaliendo(false);
    }, 200);
  }, [pickerAbierto, pickerSaliendo]);
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

    // Limpiar input y borrador inmediatamente (optimista)
    setTexto('');
    if (conversacionActivaId) limpiarBorrador(conversacionActivaId);

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

    // ── CHAT TEMPORAL: crear conversación real primero, luego enviar ──
    if (chatTemporal && conversacionActivaId?.startsWith('temp_')) {
      const conv = await crearConversacion(chatTemporal.datosCreacion);
      if (!conv) {
        setTexto(contenido); // Restaurar el texto si falla
        return;
      }
      // Transicionar al ID real SIN resetear mensajes (preserva mensaje optimista)
      transicionarAConversacionReal(conv.id);
      await enviarMensaje({ contenido, tipo: 'texto' });
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
      if (pickerAbierto) cerrarPicker();
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
  const puedeEnviar = texto.trim().length > 0 && !enviandoMensaje && !bloqueado;

  return (
    <div className="shrink-0 px-0.5 lg:px-3 pb-3 pt-1 bg-[#050d1a]/80 lg:bg-transparent">
      {/* ── Barra de edición ── */}
      {mensajeEditando && (
        <div className="flex items-center gap-2.5 mb-2 mr-4 ml-4 px-6 py-1.5 bg-white/70 backdrop-blur-sm border border-amber-300 rounded-full shadow-sm">
          {/* Borde lateral decorativo */}
          <div className="w-[3.5px] self-stretch rounded-full bg-linear-to-b from-amber-500 to-amber-400 shrink-0" />
          {/* Ícono en caja */}
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-400 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(245,158,11,0.25)]">
            <Pencil className="w-[15px] h-[15px] text-white" />
          </div>
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-600 leading-tight">Editando</p>
            <p className="text-sm text-slate-500 truncate mt-px">
              <TextoConEmojis texto={mensajeEditando.contenido || ''} tamañoEmoji={20} />
            </p>
          </div>
          {/* Botón cerrar */}
          <button
            onClick={() => { setTexto(''); onCancelarEdicion?.(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      )}

      {/* ── Barra de respuesta ── */}
      {mensajeRespondiendo && !mensajeEditando && (
        <div className="flex items-center gap-2.5 mb-2 mr-4 ml-4 px-6 py-1.5 bg-white/70 backdrop-blur-sm border border-blue-300 rounded-full shadow-sm">
          {/* Borde lateral decorativo */}
          <div className="w-[3.5px] self-stretch rounded-full bg-linear-to-b from-blue-500 to-blue-400 shrink-0" />
          {/* Ícono en caja */}
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-400 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.25)]">
            <Reply className="w-4 h-4 text-white" />
          </div>
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-600 leading-tight">
              {mensajeRespondiendo.emisorId === miId ? 'Tú' : nombreContacto || 'Mensaje'}
            </p>
            <p className="text-sm text-slate-500 truncate mt-px">
              <TextoConEmojis texto={mensajeRespondiendo.contenido || ''} tamañoEmoji={20} />
            </p>
          </div>
          {/* Botón cerrar */}
          <button
            onClick={() => onCancelarRespuesta?.()}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </div>
      )}

      {/* ── Input + botón enviar ── */}
      <div className="flex items-center gap-2 lg:gap-2.5 px-0 lg:px-4 py-1 pb-0">

        {/* Pill: emoji + input */}
        <div className="flex-1 flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/15 lg:bg-gray-200 lg:border-gray-300 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] focus-within:shadow-[0_4px_22px_rgba(0,0,0,0.45)] transition-shadow duration-150">

          {/* Botón emoji (solo desktop) */}
          <button
            ref={smileBtnRef}
            onClick={() => {
              if (pickerAbierto) {
                cerrarPicker();
              } else {
                const rect = smileBtnRef.current?.getBoundingClientRect();
                if (rect) {
                  setPickerPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }
                setPickerAbierto(true);
              }
            }}
            disabled={bloqueado}
            className={`shrink-0 hidden lg:flex items-center justify-center cursor-pointer transition-transform duration-75 hover:scale-110 active:scale-95 text-gray-600 hover:text-gray-900 ${bloqueado ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Input de texto */}
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => {
              if (bloqueado) return;
              setTexto(e.target.value);
              if (e.target.value.trim()) manejarEscribiendo();
            }}
            onKeyDown={handleKeyDown}
            disabled={bloqueado}
            placeholder={bloqueado ? 'No puedes enviar mensajes a este contacto' : mensajeEditando ? 'Editar mensaje...' : mensajeRespondiendo ? 'Escribir respuesta...' : 'Escribe un mensaje...'}
            maxLength={5000}
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            enterKeyHint="send"
            style={{ fontFamily: 'Inter, "Noto Color Emoji", sans-serif' }}
            className="flex-1 px-2 bg-transparent border-none outline-none text-[17px] lg:text-[15px] font-medium text-white/90 lg:text-gray-800 placeholder:text-white/40 lg:placeholder:text-gray-500 disabled:text-white/30 lg:disabled:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>

        {/* Portal: Picker completo de emojis */}
        {(pickerAbierto || pickerSaliendo) && pickerPos && createPortal(
          <div
            className="fixed z-9999"
            style={{
              left: pickerPos.x,
              top: pickerPos.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className={`picker-portal-centrado ${pickerSaliendo ? 'emoji-popup-out' : 'emoji-popup-in'}`}
              style={{ transformOrigin: 'center bottom' }}
            >
              <SelectorEmojis
                onSeleccionar={(emoji) => {
                  setTexto((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                onCerrar={cerrarPicker}
                posicion="arriba-izq"
                ancho={470}
                alto={430}
                cerrarAlSeleccionar={false}
              />
            </div>
          </div>,
          document.body
        )}

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          className={`
            w-11 h-11 rounded-full flex items-center justify-center shrink-0
            ${puedeEnviar
              ? mensajeEditando
                ? 'bg-linear-to-br from-amber-500 to-amber-400 text-white shadow-[0_3px_10px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-white/10 text-white/30 lg:bg-gray-300 lg:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}

export default InputMensaje;