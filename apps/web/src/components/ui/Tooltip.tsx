/**
 * Tooltip.tsx
 * ===========
 * Componente de tooltip personalizado con estilo negro y flechita.
 * Usa createPortal para renderizar fuera del DOM padre,
 * evitando recortes por overflow:hidden en contenedores.
 * 
 * UBICACIÓN: apps/web/src/components/ui/Tooltip.tsx
 */

import { ReactNode, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// TIPOS
// =============================================================================

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function Tooltip({ children, text, position = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            transform: transformByPosition[position],
            zIndex: 99999,
          }}
        >
          <div
            className="relative bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap"
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