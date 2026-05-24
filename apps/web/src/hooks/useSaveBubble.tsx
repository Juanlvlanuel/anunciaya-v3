/**
 * useSaveBubble.tsx
 * ==================
 * Hook reutilizable para el bubble flotante "¡Guardado!" / "Quitado"
 * que aparece al hacer toggle de guardar en un card. Encapsula el
 * patrón visual que vive desde Sprint 6 en `CardNegocio` (líneas
 * 567-592) — bubble con createPortal a document.body, posicionado
 * con coordenadas fixed sobre el botón clickeado, animado con
 * `cardFloatUp` (definida en `index.css` global).
 *
 * Centraliza la lógica para:
 *   - CardNegocio (feed Negocios)
 *   - CardArticulo (feed MP compacta, perfil vendedor, buscador)
 *   - CardArticuloFeed (feed MP estilo Facebook)
 *   - Cualquier card futuro con toggle de guardar
 *
 * Uso:
 * ```tsx
 * const { triggerSaveBubble, saveBubble } = useSaveBubble();
 *
 * const handleClick = (e: React.MouseEvent) => {
 *   const guardadoNuevo = !guardado;
 *   triggerSaveBubble(e, guardadoNuevo ? 'save' : 'unsave');
 *   toggleGuardado();
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleClick}>...</button>
 *     {saveBubble}
 *   </>
 * );
 * ```
 *
 * Ubicación: apps/web/src/hooks/useSaveBubble.tsx
 */

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { ICONOS } from '../config/iconos';

type EstadoBubble = 'save' | 'unsave';

interface PosicionBubble {
    top: number;
    left: number;
}

export interface UseSaveBubbleResult {
    /**
     * Dispara el bubble flotante. Mide la posición del botón
     * clickeado y muestra el bubble arriba-izquierda de él.
     * Auto-oculta a los 1500ms.
     */
    triggerSaveBubble: (e: React.MouseEvent, estado: EstadoBubble) => void;
    /**
     * El bubble JSX renderizado vía `createPortal` a `document.body`.
     * Devolver dentro del componente para que se monte mientras el
     * card existe — al desmontarse el card el bubble desaparece.
     */
    saveBubble: ReactNode;
}

/**
 * Hook que devuelve un trigger y el bubble JSX listo para renderizar.
 * El bubble se posiciona absoluto a la posición del botón clickeado
 * en el momento del click y flota hacia arriba con `cardFloatUp`.
 */
export function useSaveBubble(): UseSaveBubbleResult {
    const [estado, setEstado] = useState<EstadoBubble | null>(null);
    const [posicion, setPosicion] = useState<PosicionBubble>({ top: 0, left: 0 });

    const triggerSaveBubble = (e: React.MouseEvent, nuevoEstado: EstadoBubble) => {
        // Medir el rect del botón clickeado para anclar el bubble.
        // Usamos `currentTarget` (no `target`) para que apunte siempre
        // al elemento que tiene el onClick aunque el click haya caído
        // sobre un hijo (icon, span, etc.).
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPosicion({
            // Levantar el bubble ~8px sobre el botón (margen visual)
            top: rect.top - 8,
            // Alineado al centro horizontal del botón con un pequeño
            // offset hacia la izquierda para que el texto "¡Guardado!"
            // no quede pegado al borde derecho del viewport en
            // botones cercanos al límite.
            left: rect.left - 60,
        });
        setEstado(nuevoEstado);
        // Auto-ocultar después de 1500ms (matchea la duración de la
        // animación `cardFloatUp`). Si el usuario hace click muy
        // rápido en sucesión, el último click sobreescribe el estado
        // y el bubble se reinicia limpiamente.
        window.setTimeout(() => setEstado(null), 1500);
    };

    const saveBubble: ReactNode = estado
        ? createPortal(
              <div
                  className={`fixed flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg ${
                      estado === 'save'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                  style={{
                      top: posicion.top,
                      left: posicion.left,
                      zIndex: 99999,
                      pointerEvents: 'none',
                      animation: 'cardFloatUp 1.5s ease-out forwards',
                  }}
              >
                  <Icon icon={ICONOS.guardar} className="w-5 h-5" />
                  <span className="text-sm font-medium">
                      {estado === 'save' ? '¡Guardado!' : 'Quitado'}
                  </span>
              </div>,
              document.body,
          )
        : null;

    return { triggerSaveBubble, saveBubble };
}

export default useSaveBubble;
