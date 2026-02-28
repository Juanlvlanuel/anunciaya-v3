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
  Forward,
  Pin,
  PinOff,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Mensaje } from '../../types/chatya';
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
  /** Callback para abrir modal de reenvío en VentanaChat */
  onReenviar: (mensaje: Mensaje) => void;
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
  onReenviar,
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
      if ((e.target as HTMLElement).closest('[data-menu-trigger="true"]')) return;
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

  /** Copiar texto al portapapeles (selección parcial o mensaje completo) */
  const handleCopiar = useCallback(() => {
    const seleccion = window.getSelection()?.toString().trim();
    const textoCopiar = seleccion || mensaje.contenido;
    if (textoCopiar) {
      // Copiar ANTES de cerrar (mantiene la cadena de user gesture)
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(textoCopiar).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = textoCopiar;
          ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        });
      }
    }
    onCerrar();

    // Tooltip "Copiado" — delay para que el menú se desmonte
    if (textoCopiar) {
      setTimeout(() => {
        const tooltip = document.createElement('div');
        tooltip.textContent = '✓ Copiado';

        const msgEl = document.getElementById(`msg-${mensaje.id}`);
        const rect = msgEl?.getBoundingClientRect();

        // Desktop: al lado de la burbuja / Móvil o fallback: centrado
        const esDesktop = window.innerWidth >= 1024;
        const posCSS = esDesktop && rect
          ? `${esMio ? `right:${window.innerWidth - rect.left + 8}px` : `left:${rect.right + 8}px`};top:${rect.top + rect.height / 2 - 16}px;`
          : rect
            ? `left:50%;top:${rect.top + rect.height / 2 - 16}px;`
            : `left:50%;top:40%;`;

        const transformBase = !esDesktop || !rect ? 'translateX(-50%) ' : '';

        tooltip.style.cssText = `
          position:fixed;${posCSS}
          background:rgba(15,23,42,0.88);color:#fff;
          padding:6px 14px;border-radius:10px;
          font-size:13px;font-weight:600;letter-spacing:0.01em;
          z-index:9999;pointer-events:none;opacity:0;
          transform:${transformBase}scale(0.85) translateY(2px);
          transition:opacity 0.15s ease-out,transform 0.15s ease-out;
          backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.25);
        `;
        document.body.appendChild(tooltip);
        requestAnimationFrame(() => {
          tooltip.style.opacity = '1';
          tooltip.style.transform = `${transformBase}scale(1) translateY(0)`;
        });
        setTimeout(() => {
          tooltip.style.opacity = '0';
          tooltip.style.transform = `${transformBase}scale(0.85) translateY(2px)`;
          setTimeout(() => tooltip.remove(), 150);
        }, 1200);
      }, 50);
    }
  }, [mensaje.id, mensaje.contenido, onCerrar, esMio]);

  /** Responder al mensaje */
  const handleResponder = useCallback(() => {
    onCerrar();
    onResponder(mensaje);
  }, [mensaje, onCerrar, onResponder]);

  /** Reenviar mensaje a otro contacto */
  const handleReenviar = useCallback(() => {
    onCerrar();
    onReenviar(mensaje);
  }, [mensaje, onCerrar, onReenviar]);

  /** Editar mensaje propio */
  const handleEditar = useCallback(() => {
    onCerrar();
    onEditar(mensaje);
  }, [mensaje, onCerrar, onEditar]);

  /** Fijar/desfijar mensaje */
  const handleFijar = useCallback(async () => {
    onCerrar();
    if (!conversacionActivaId) return;
    const store = useChatYAStore.getState();
    if (estaFijado) {
      await store.desfijarMensaje(conversacionActivaId, mensaje.id);
    } else {
      await store.fijarMensaje(conversacionActivaId, mensaje.id);
    }
  }, [conversacionActivaId, mensaje.id, estaFijado, onCerrar]);

  /** Eliminar mensaje propio */
  const handleEliminar = useCallback(async () => {
    onCerrar();
    await useChatYAStore.getState().eliminarMensaje(mensaje.id);

    // Tooltip "Mensaje eliminado" — justo arriba del input
    setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.textContent = '🗑 Mensaje eliminado';
      tooltip.style.cssText = `
        position:fixed;left:50%;bottom:72px;
        transform:translateX(-50%) scale(0.85) translateY(4px);
        background:rgba(15,23,42,0.88);color:#fff;
        padding:7px 16px;border-radius:10px;
        font-size:13px;font-weight:600;letter-spacing:0.01em;
        z-index:9999;pointer-events:none;opacity:0;
        transition:opacity 0.15s ease-out,transform 0.15s ease-out;
        backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.25);
      `;
      document.body.appendChild(tooltip);
      requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateX(-50%) scale(1) translateY(0)';
      });
      setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateX(-50%) scale(0.85) translateY(4px)';
        setTimeout(() => tooltip.remove(), 150);
      }, 1800);
    }, 50);
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

  // Reenviar (no en Mis Notas, no si está eliminado)
  if (!esMisNotas && !mensaje.eliminado) {
    opciones.push({ icono: Forward, label: 'Reenviar', onClick: handleReenviar });
  }

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
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
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
      className="fixed z-80 bg-white rounded-xl shadow-[0_4px_24px_rgba(15,29,58,0.18)] border border-gray-200 overflow-hidden w-48"
      style={{ left: posicion.x, top: posicion.y }}
    >
      {/* Opciones */}
      <div className="py-1.5">
        {opciones.map((opcion) => (
          <button
            key={opcion.label}
            onClick={opcion.onClick}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
          >
            <opcion.icono className={`w-[18px] h-[18px] shrink-0 ${opcion.color || 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${opcion.color || 'text-gray-700'}`}>
              {opcion.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MenuContextualMensaje;