/**
 * MenuContextualMensaje.tsx
 * ==========================
 * Menú contextual para acciones sobre un mensaje individual.
 *
 * ACTIVACIÓN:
 * - Móvil: Long press (~500ms) sobre la burbuja
 * - Desktop: Click derecho sobre la burbuja
 *
 * CONTENIDO:
 * - Fila de emojis rápidos (👍❤️😂😮😢 + más)
 * - Opciones según si el mensaje es mío o del otro:
 *   - Responder, Copiar, Reenviar, Fijar (ambos)
 *   - Editar, Eliminar (solo mensajes propios)
 *
 * COMPORTAMIENTO:
 * - Móvil: ModalBottom (bottom sheet) con drag to close
 * - Desktop: Popup flotante posicionado cerca del click
 * - Click fuera cierra el menú
 * - Al seleccionar opción se cierra automáticamente
 *
 * UBICACIÓN: apps/web/src/components/chatya/MenuContextualMensaje.tsx
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Reply,
  Copy,
  Pin,
  PinOff,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Mensaje } from '../../types/chatya';
import * as chatyaService from '../../services/chatyaService';
import { useChatYAStore } from '../../stores/useChatYAStore';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuContextualMensajeProps {
  mensaje: Mensaje;
  esMio: boolean;
  esMisNotas?: boolean;
  /** Posición en pantalla donde apareció el menú (desktop) */
  posicion: { x: number; y: number };
  /** Callback para cerrar el menú */
  onCerrar: () => void;
  /** Callback para activar modo edición en VentanaChat */
  onEditar: (mensaje: Mensaje) => void;
  /** Callback para activar modo respuesta en VentanaChat */
  onResponder: (mensaje: Mensaje) => void;
  /** ¿Estamos en móvil? */
  esMobile: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function MenuContextualMensaje({
  mensaje,
  esMio,
  esMisNotas = false,
  posicion,
  onCerrar,
  onEditar,
  onResponder,
  esMobile,
}: MenuContextualMensajeProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const mensajesFijados = useChatYAStore((s) => s.mensajesFijados);
  const estaFijado = mensajesFijados.some((f) => f.mensajeId === mensaje.id);

  // ---------------------------------------------------------------------------
  // Click fuera para cerrar (desktop)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esMobile) return;

    const handleClickFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCerrar();
      }
    };

    // Delay para evitar que el mismo click derecho cierre el menú
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickFuera);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickFuera);
    };
  }, [onCerrar, esMobile]);

  // ---------------------------------------------------------------------------
  // ESC para cerrar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCerrar]);

  // ---------------------------------------------------------------------------
  // Ajustar posición del popup para que no se salga de la pantalla (desktop)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esMobile || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();

    // Si se sale por la derecha
    if (rect.right > window.innerWidth - 8) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }

    // Si se sale por abajo
    if (rect.bottom > window.innerHeight - 8) {
      menu.style.top = `${posicion.y - rect.height}px`;
    }
  }, [posicion, esMobile]);

  // ---------------------------------------------------------------------------
  // Handlers de acciones
  // ---------------------------------------------------------------------------

  /** Copiar texto al portapapeles */
  const handleCopiar = useCallback(() => {
    onCerrar();
    if (mensaje.contenido) {
      navigator.clipboard.writeText(mensaje.contenido);
    }
  }, [mensaje.contenido, onCerrar]);

  /** Responder al mensaje */
  const handleResponder = useCallback(() => {
    onCerrar();
    onResponder(mensaje);
  }, [mensaje, onCerrar, onResponder]);

  /** Editar mensaje propio */
  const handleEditar = useCallback(() => {
    onCerrar();
    onEditar(mensaje);
  }, [mensaje, onCerrar, onEditar]);

  /** Fijar/desfijar mensaje */
  const handleFijar = useCallback(async () => {
    onCerrar();
    if (!conversacionActivaId) return;
    try {
      if (estaFijado) {
        await chatyaService.desfijarMensaje(conversacionActivaId, mensaje.id);
      } else {
        await chatyaService.fijarMensaje(conversacionActivaId, mensaje.id);
      }
    } catch {
      void 0; // Silencioso
    }
  }, [conversacionActivaId, mensaje.id, estaFijado, onCerrar]);

  /** Eliminar mensaje propio */
  const handleEliminar = useCallback(async () => {
    onCerrar();
    try {
      await chatyaService.eliminarMensaje(mensaje.id);
      // El store se actualiza vía Socket.io (chatya:mensaje-eliminado)
    } catch {
      void 0; // Silencioso
    }
  }, [mensaje.id, onCerrar]);

  // ---------------------------------------------------------------------------
  // Opciones disponibles según contexto
  // ---------------------------------------------------------------------------
  const opciones: Array<{
    icono: typeof Reply;
    label: string;
    onClick: () => void;
    color?: string;
  }> = [];

  // Responder (no en Mis Notas)
  if (!esMisNotas) {
    opciones.push({ icono: Reply, label: 'Responder', onClick: handleResponder });
  }

  // Copiar
  opciones.push({ icono: Copy, label: 'Copiar texto', onClick: handleCopiar });

  // Fijar (no en Mis Notas)
  if (!esMisNotas) {
    opciones.push({ icono: estaFijado ? PinOff : Pin, label: estaFijado ? 'Desfijar mensaje' : 'Fijar mensaje', onClick: handleFijar });
  }

  // Editar (solo mensajes propios de tipo texto)
  if (esMio && mensaje.tipo === 'texto' && !mensaje.eliminado) {
    opciones.push({ icono: Pencil, label: 'Editar', onClick: handleEditar });
  }

  // Eliminar (solo mensajes propios)
  if (esMio && !mensaje.eliminado) {
    opciones.push({ icono: Trash2, label: 'Eliminar', onClick: handleEliminar, color: 'text-red-500' });
  }

  // ---------------------------------------------------------------------------
  // Render: Móvil → Bottom sheet
  // ---------------------------------------------------------------------------
  if (esMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/30 z-80"
          onClick={onCerrar}
        />

        {/* Bottom sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-80 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] animate-slide-up">
          {/* Handle */}
          <div className="flex justify-center py-2.5">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Preview del mensaje */}
          <div className="px-4 pb-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 truncate">
              {mensaje.contenido?.slice(0, 60)}{mensaje.contenido && mensaje.contenido.length > 60 ? '...' : ''}
            </p>
          </div>

          {/* Opciones (sin emojis, van en el header del chat) */}
          <div className="py-1 pb-safe">
            {opciones.map((opcion) => (
              <button
                key={opcion.label}
                onClick={opcion.onClick}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
              >
                <opcion.icono className={`w-5 h-5 ${opcion.color || 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${opcion.color || 'text-gray-700'}`}>
                  {opcion.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Desktop → Popup flotante
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={menuRef}
      className="fixed z-80 bg-white rounded-xl shadow-[0_4px_24px_rgba(15,29,58,0.18)] border border-gray-200 overflow-hidden min-w-36"
      style={{ left: posicion.x, top: posicion.y }}
    >
      {/* Opciones */}
      <div className="py-1">
        {opciones.map((opcion) => (
          <button
            key={opcion.label}
            onClick={opcion.onClick}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
          >
            <opcion.icono className={`w-4 h-4 ${opcion.color || 'text-gray-500'}`} />
            <span className={`text-xs font-medium ${opcion.color || 'text-gray-700'}`}>
              {opcion.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MenuContextualMensaje;