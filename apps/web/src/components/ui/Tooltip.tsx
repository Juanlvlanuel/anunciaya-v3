/**
 * Tooltip.tsx
 * ===========
 * Componente de tooltip personalizado con estilo negro y flechita.
 * Usa createPortal para renderizar fuera del DOM padre,
 * evitando recortes por overflow:hidden en contenedores.
 * 
 * UBICACIÓN: apps/web/src/components/ui/Tooltip.tsx
 */

import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TIPOS
// =============================================================================

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Tiempo en ms para ocultar automáticamente el tooltip */
  autoHide?: number;
  /** Clases CSS adicionales para el contenedor del tooltip (ej: '2xl:hidden') */
  className?: string;
  /** Activar con click/tap en lugar de hover */
  triggerOnClick?: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function Tooltip({ children, text, position = 'bottom', autoHide, className = '', triggerOnClick = false }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && autoHide) {
      autoHideRef.current = setTimeout(() => setVisible(false), autoHide);
      return () => { if (autoHideRef.current) clearTimeout(autoHideRef.current); };
    }
  }, [visible, autoHide]);

  const calcularPosicion = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    calcularPosicion();
    setVisible(true);
  };

  // En modo `triggerOnClick`, el click TOGGLE: si ya está visible, lo oculta.
  // Antes solo lo mostraba, así que clicks repetidos lo "atascaban" abierto.
  const handleClick = () => {
    if (visible) {
      setVisible(false);
      return;
    }
    calcularPosicion();
    setVisible(true);
  };

  // Modo hover (no triggerOnClick): al presionar el botón, ocultamos el
  // tooltip de inmediato. Sin esto, si el click abre un popup que tapa
  // el trigger, el `onMouseLeave` nunca dispara y el tooltip queda
  // colgado hasta que el `autoHide` lo apague (o nunca, si no está).
  const handleMouseDownHover = () => {
    setVisible(false);
  };

  const transformByPosition = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  const arrowStyles: Record<string, React.CSSProperties> = {
    top: {
      left: '50%',
      top: '100%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: '5px solid #0f172a',
    },
    bottom: {
      left: '50%',
      bottom: '100%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderBottom: '5px solid #0f172a',
    },
    left: {
      top: '50%',
      left: '100%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderLeft: '5px solid #0f172a',
    },
    right: {
      top: '50%',
      right: '100%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderRight: '5px solid #0f172a',
    },
  };

  const handleTouchStart = () => {
    calcularPosicion();
    setVisible(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={triggerOnClick ? undefined : handleMouseEnter}
      onMouseLeave={triggerOnClick ? undefined : () => setVisible(false)}
      onMouseDown={triggerOnClick ? undefined : handleMouseDownHover}
      onClick={triggerOnClick ? handleClick : undefined}
      onTouchStart={handleTouchStart}
    >
      {children}

      {visible && createPortal(
        <div
          className={`fixed pointer-events-none ${className}`}
          style={{
            top: coords.top,
            left: coords.left,
            transform: transformByPosition[position],
            zIndex: 99999,
          }}
        >
          <div
            className="relative bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            {text}
            <div className="absolute w-0 h-0" style={arrowStyles[position]} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}