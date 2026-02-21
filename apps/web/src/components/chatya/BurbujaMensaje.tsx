/**
 * BurbujaMensaje.tsx
 * ===================
 * Burbuja individual de un mensaje en el chat.
 *
 * - Propias: gradiente azul vibrante (lado derecho)
 * - Del otro: fondo blanco con borde (lado izquierdo)
 * - Hora + palomitas de estado (enviado/entregado/leído)
 * - Indicador "editado" sutil
 * - Mensajes eliminados: texto gris itálico
 * - Tag de negocio si el emisor es un negocio
 *
 * UBICACIÓN: apps/web/src/components/chatya/BurbujaMensaje.tsx
 */

import { useRef, useCallback, useState } from 'react';
import { Check, CheckCheck, Store, SmilePlus, AlertCircle, ChevronDown } from 'lucide-react';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Tiempo en ms para considerar long press en móvil */
const LONG_PRESS_MS = 500;

/** Emojis rápidos para reaccionar */
const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢'];

// =============================================================================
// TIPOS
// =============================================================================

interface BurbujaMensajeProps {
  mensaje: Mensaje;
  esMio: boolean;
  esMisNotas?: boolean;
  /** true cuando este mensaje coincide con la búsqueda activa (highlight amarillo) */
  resaltado?: boolean;
  /** Callback cuando se activa el menú contextual (long press / click derecho) */
  onMenuContextual?: (mensaje: Mensaje, posicion: { x: number; y: number }) => void;
  /** Callback para reaccionar con emoji (desde hover en desktop) */
  onReaccionar?: (mensajeId: string, emoji: string) => void;
  /** ID del mensaje que tiene el menú contextual abierto (para emojis flotantes en móvil) */
  menuActivoId?: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Formatea hora del mensaje (ej: "10:30 AM") */
function formatearHora(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function BurbujaMensaje({ mensaje, esMio, esMisNotas = false, resaltado = false, onMenuContextual, onReaccionar, menuActivoId }: BurbujaMensajeProps) {
  const hora = formatearHora(mensaje.createdAt);
  const esNegocio = !esMisNotas && !!mensaje.emisorSucursalId;
  const esFallido = mensaje.estado === 'fallido';

  /** Picker de emojis abierto (hover en desktop) */
  const [emojiPickerAbierto, setEmojiPickerAbierto] = useState(false);
  const emojiCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Long press (móvil) y click derecho (desktop)
  // ---------------------------------------------------------------------------
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onMenuContextual) return;
    touchMovedRef.current = false;
    timerRef.current = setTimeout(() => {
      // Vibración háptica si está disponible
      if (navigator.vibrate) navigator.vibrate(30);
      const touch = e.touches[0];
      onMenuContextual(mensaje, { x: touch.clientX, y: touch.clientY });
    }, LONG_PRESS_MS);
  }, [mensaje, onMenuContextual]);

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onMenuContextual) return;
    e.preventDefault();
    onMenuContextual(mensaje, { x: e.clientX, y: e.clientY });
  }, [mensaje, onMenuContextual]);

  // Mensaje eliminado
  if (mensaje.eliminado) {
    return (
      <div
        id={`msg-${mensaje.id}`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`max-w-[84%] px-3 py-2 rounded-xl ${esMio ? 'self-end' : 'self-start'} ${resaltado ? 'ring-2 ring-amber-400 bg-amber-50/60' : ''}`}
      >
        <p className="text-sm lg:text-xs text-gray-400 italic">Se eliminó este mensaje</p>
      </div>
    );
  }

  return (
    <div
      className={`group flex ${esMio ? 'justify-end' : 'justify-start'}`}
      onMouseLeave={() => {
        if (emojiPickerAbierto) {
          emojiCloseTimerRef.current = setTimeout(() => setEmojiPickerAbierto(false), 400);
        }
      }}
      onMouseEnter={() => {
        if (emojiCloseTimerRef.current) {
          clearTimeout(emojiCloseTimerRef.current);
          emojiCloseTimerRef.current = null;
        }
      }}
    >
    <div className={`relative max-w-[84%] select-none`}>
      {/* Botón emoji hover (solo desktop, no eliminados, no Mis Notas) */}
      {!mensaje.eliminado && !esMisNotas && onReaccionar && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-10 ${emojiPickerAbierto ? 'flex' : 'hidden lg:group-hover:flex'} ${esMio ? '-left-9' : '-right-9'}`}>
          <button
            onClick={() => setEmojiPickerAbierto((v) => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <SmilePlus className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}

      {/* Picker de emojis rápidos (desktop) */}
      {emojiPickerAbierto && onReaccionar && (
        <div className={`absolute z-20 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-gray-200 flex items-center gap-0 px-1 py-0.5 ${esMio ? 'right-0 -top-10' : 'left-0 -top-10'}`}>
            {EMOJIS_RAPIDOS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReaccionar(mensaje.id, emoji);
                  setEmojiPickerAbierto(false);
                }}
                className="w-8 h-8 text-lg flex items-center justify-center hover:scale-125 active:scale-140 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
      )}

      <div
        id={`msg-${mensaje.id}`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          px-2.5 py-1.5 rounded-[14px] relative
          ${esMio
            ? 'bg-linear-to-br from-[#2563eb] to-[#3b82f6] text-white rounded-br-[5px] shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
            : 'bg-white text-gray-800 rounded-bl-[5px] shadow-[0_1px_4px_rgba(15,29,58,0.08)] border border-gray-100'
          }
          ${resaltado ? 'ring-2 ring-amber-400' : ''}
          ${menuActivoId === mensaje.id ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}
          ${esFallido ? 'opacity-60' : ''}
        `}
      >
      {/* Flechita menú contextual (hover desktop) */}
      {!mensaje.eliminado && !esMisNotas && onMenuContextual && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onMenuContextual(mensaje, { x: esMio ? rect.right - 144 : rect.left, y: rect.bottom + 4 });
          }}
          className={`absolute top-0.5 right-0.5 z-10 flex w-6 h-5 items-center justify-center rounded cursor-pointer opacity-0 lg:group-hover:opacity-100 ${
            esMio ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Tag de negocio (solo mensajes del otro que es negocio) */}
      {!esMio && esNegocio && (
        <div className="flex items-center gap-1 mb-0.5">
          <Store className="w-3.5 lg:w-3 h-3.5 lg:h-3 text-amber-500" />
          <span className="text-xs lg:text-[10px] font-bold text-amber-500">Negocio</span>
        </div>
      )}

      {/* Quote del mensaje respondido */}
      {mensaje.respuestaA && !mensaje.eliminado && (
        <div
          className={`
            mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] cursor-pointer
            ${esMio
              ? 'bg-white/15 border-l-white/50'
              : 'bg-gray-100 border-l-blue-400'
            }
          `}
          onClick={() => {
            const el = document.getElementById(`msg-${mensaje.respuestaA!.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          <p className={`text-xs lg:text-[10px] font-bold ${esMio ? 'text-white/80' : 'text-blue-500'}`}>
            {mensaje.respuestaA.emisorId === mensaje.emisorId ? 'Tú' : 'Mensaje'}
          </p>
          <p className={`text-[13px] lg:text-[11px] truncate ${esMio ? 'text-white/60' : 'text-gray-500'}`}>
            {mensaje.respuestaA.contenido}
          </p>
        </div>
      )}

      {/* Contenido + hora inline (estilo WhatsApp) */}
      <p className="text-[15px] lg:text-[13px] leading-relaxed wrap-break-word whitespace-pre-wrap">
        {mensaje.contenido}
        {/* Hora inline: spacer + metadata */}
        <span className={`inline-flex items-center gap-0.5 align-bottom ml-1.5 text-[10px] lg:text-[9px] ${esMio ? 'text-white/50' : 'text-gray-400'}`}>
          {mensaje.editado && <span className="italic">editado</span>}
          <span>{hora}</span>
          {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
        </span>
      </p>
    </div>

      {/* Indicador de mensaje fallido */}
      {esFallido && esMio && (
        <div className="flex items-center justify-end gap-1 mt-0.5 mr-1">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-[11px] text-red-400">No se pudo entregar este mensaje</span>
        </div>
      )}

      {/* Burbuja de emojis flotante (móvil, cuando este mensaje tiene menú activo) */}
      {menuActivoId === mensaje.id && !mensaje.eliminado && !esMisNotas && onReaccionar && (
        <div className={`absolute z-20 ${esMio ? 'right-0' : 'left-0'} -bottom-14`}>
          <div className="bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-gray-200 flex items-center gap-1 px-2.5 py-1.5">
            {EMOJIS_RAPIDOS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReaccionar(mensaje.id, emoji)}
                className="w-11 h-11 text-2xl flex items-center justify-center rounded-full active:scale-125 active:bg-gray-100 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: Palomitas de estado
// =============================================================================

function Palomitas({ estado }: { estado: 'enviado' | 'entregado' | 'leido' | 'fallido' }) {
  switch (estado) {
    case 'leido':
      return <CheckCheck className="w-4 h-4 text-sky-300" />;
    case 'entregado':
      return <CheckCheck className="w-4 h-4 text-white/55" />;
    case 'fallido':
      return <AlertCircle className="w-3.5 h-3.5 text-red-300" />;
    case 'enviado':
    default:
      return <Check className="w-3.5 h-3.5 text-white/55" />;
  }
}

export default BurbujaMensaje;