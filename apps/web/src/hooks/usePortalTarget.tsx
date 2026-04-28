/**
 * usePortalTarget.tsx
 * ====================
 * Contexto para que los modales usen un contenedor específico como destino del portal,
 * en lugar de `document.body`.
 *
 * ¿Para qué sirve?
 * - El patrón estándar de modales usa `createPortal(jsx, document.body)` + `position: fixed`
 *   para cubrir todo el viewport. Eso es correcto para modales "normales".
 * - Cuando el mismo modal se renderiza dentro de un preview contenido (ej: PanelPreviewNegocio,
 *   PanelInfoContacto de ChatYA), el `fixed inset-0` escapa del contenedor y ocupa toda la
 *   pantalla del PC — rompe la metáfora del preview.
 * - Con este contexto, el wrapper del preview provee su propio elemento como target. Los modales
 *   descendientes portean al target y usan `position: absolute` relativo al preview.
 * - Si no hay provider, el target es `document.body` y los modales funcionan como siempre (fixed).
 *
 * Uso en preview:
 *   const [target, setTarget] = useState<HTMLElement | null>(null);
 *   return (
 *     <div ref={setTarget} className="relative overflow-hidden">
 *       <PortalTargetProvider target={target}>
 *         <ComponenteQueAbreModales />
 *       </PortalTargetProvider>
 *     </div>
 *   );
 *
 * Uso en modal:
 *   const target = usePortalTarget();
 *   const esContenido = target !== document.body;
 *   return createPortal(
 *     <div className={`${esContenido ? 'absolute' : 'fixed'} inset-0 ...`}>...</div>,
 *     target
 *   );
 *
 * Ver: docs/estandares/LECCIONES_TECNICAS.md → "Modales contenidos al preview".
 *
 * Ubicación: apps/web/src/hooks/usePortalTarget.tsx
 */

import { createContext, useContext, type ReactNode } from 'react';

const PortalTargetContext = createContext<HTMLElement | null>(null);

interface PortalTargetProviderProps {
  /** Elemento HTML donde se portearán los modales descendientes. Si es null, usan document.body. */
  target: HTMLElement | null;
  children: ReactNode;
}

export function PortalTargetProvider({ target, children }: PortalTargetProviderProps) {
  return <PortalTargetContext.Provider value={target}>{children}</PortalTargetContext.Provider>;
}

/**
 * Devuelve el elemento DOM donde deben portearse los modales descendientes.
 * - Si hay un `PortalTargetProvider` ancestro con target válido, devuelve ese elemento.
 * - Si no, devuelve `document.body` (comportamiento default).
 *
 * Uso en un modal:
 *   const target = usePortalTarget();
 *   const esContenido = target !== document.body;
 *   // esContenido=true → usar `absolute inset-0`, no bloquear scroll del body global
 *   // esContenido=false → usar `fixed inset-0`, bloquear scroll del body (comportamiento normal)
 */
export function usePortalTarget(): HTMLElement {
  const target = useContext(PortalTargetContext);
  return target ?? document.body;
}
