/**
 * Tooltip.tsx (Panel Admin)
 * =========================
 * Tooltip con portal a `document.body` — nunca recortado por `overflow:hidden`
 * ni `transform` de un padre. Calcado del Tooltip de AnunciaYA (apps/web) pero
 * en el lenguaje visual del Panel:
 *   - Fondo INVERTIDO (`bg-texto` / `text-superficie`) → se adapta solo a claro/
 *     oscuro (negro+blanco en claro, blanco+oscuro en oscuro). Máximo contraste.
 *   - Solo se renderiza en ESCRITORIO (>= 1024px). En móvil es no-op: envuelve
 *     `children` sin handlers ni portal (en táctil no hay hover y los tooltips por
 *     touch quedan "colgados" tapando controles).
 *
 * Ubicación: apps/admin/src/components/ui/Tooltip.tsx
 */

import { type ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';

interface TooltipProps {
  children: ReactNode;
  text: string;
  /** Posición relativa al trigger. Default 'top' (útil para botones al pie de un modal). */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Ms para auto-cerrar (útil cuando `onMouseLeave` no dispara, ej. tras abrir un popup). */
  autoHide?: number;
  /** Clases para el WRAPPER del trigger (ej. `shrink-0` para que no se encoja en un flex). */
  className?: string;
  /** Abrir/cerrar con click en vez de hover. */
  triggerOnClick?: boolean;
}

const TRANSFORM_POR_POSICION: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

// Flecha con el color del tema (= bg-texto). Cada posición pinta el borde que apunta al trigger.
const FLECHA_POR_POSICION: Record<NonNullable<TooltipProps['position']>, React.CSSProperties> = {
  top: { left: '50%', top: '100%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--panel-text)' },
  bottom: { left: '50%', bottom: '100%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid var(--panel-text)' },
  left: { top: '50%', left: '100%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '5px solid var(--panel-text)' },
  right: { top: '50%', right: '100%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid var(--panel-text)' },
};

export function Tooltip({ children, text, position = 'top', autoHide, className, triggerOnClick = false }: TooltipProps) {
  const esEscritorio = useEsEscritorio();
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && autoHide) {
      autoHideRef.current = setTimeout(() => setVisible(false), autoHide);
      return () => { if (autoHideRef.current) clearTimeout(autoHideRef.current); };
    }
  }, [visible, autoHide]);

  const calcularPosicion = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    switch (position) {
      case 'top': setCoords({ top: r.top - 8, left: r.left + r.width / 2 }); break;
      case 'bottom': setCoords({ top: r.bottom + 8, left: r.left + r.width / 2 }); break;
      case 'left': setCoords({ top: r.top + r.height / 2, left: r.left - 8 }); break;
      case 'right': setCoords({ top: r.top + r.height / 2, left: r.right + 8 }); break;
    }
  }, [position]);

  const mostrar = () => { calcularPosicion(); setVisible(true); };
  // En triggerOnClick el click TOGGLEA (evita que clicks repetidos lo dejen "atascado").
  const alClick = () => { if (visible) { setVisible(false); return; } mostrar(); };
  // Hover: al presionar, ocultar de inmediato (si el click abre un popup que tapa el
  // trigger, `onMouseLeave` no dispara y el tooltip quedaría colgado).
  const alPresionar = () => setVisible(false);

  // En móvil: no-op (sin handlers ni portal). Tooltips solo en >= 1024px.
  if (!esEscritorio) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={triggerOnClick ? undefined : mostrar}
      onMouseLeave={triggerOnClick ? undefined : () => setVisible(false)}
      onMouseDown={triggerOnClick ? undefined : alPresionar}
      onClick={triggerOnClick ? alClick : undefined}
    >
      {children}

      {visible && createPortal(
        <div
          className="pointer-events-none fixed"
          style={{ top: coords.top, left: coords.left, transform: TRANSFORM_POR_POSICION[position], zIndex: 99999 }}
        >
          <div className="relative whitespace-nowrap rounded-[8px] bg-texto px-2.5 py-1.5 text-[12px] font-medium text-superficie shadow-pop-panel">
            {text}
            <span className="absolute h-0 w-0" style={FLECHA_POR_POSICION[position]} />
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}

export default Tooltip;
