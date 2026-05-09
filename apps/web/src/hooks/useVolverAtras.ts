/**
 * useVolverAtras.ts
 * ==================
 * Hook centralizado para botones "← regresar" en headers de páginas.
 *
 * Patrón: usa el historial real del browser cuando hay navegación interna
 * (idéntico a la flecha nativa del celular Android / gesto swipe iOS), y
 * cae a un `fallback` explícito solo cuando el usuario llegó a la página
 * por entrada directa (URL compartida, recarga, link OG, primera carga
 * de la SPA).
 *
 * El truco es `location.key`:
 *  - `'default'` → primera location de la sesión, no hay historial interno.
 *  - cualquier otro valor → ya hubo una navegación interna previa, podemos
 *    usar `navigate(-1)` con seguridad.
 *
 * Beneficios sobre `navigate(-1)` solo:
 *  - Si entras al detalle de un artículo por URL directa (compartido), el
 *    `← regresar` no te saca fuera del sitio — cae al fallback.
 *
 * Beneficios sobre `navigate(rutaFallback)` siempre:
 *  - Respeta el historial real del usuario. Si vienes de
 *    `chat → notif → /marketplace`, el ← te regresa al chat (no al
 *    inicio).
 *  - Comportamiento idéntico al back nativo del celular y al gesto swipe
 *    iOS, sin código extra.
 *
 * Uso:
 * ```tsx
 * import { useVolverAtras } from '../../hooks/useVolverAtras';
 *
 * function MiPagina() {
 *   const handleVolver = useVolverAtras('/marketplace');
 *   return <button onClick={handleVolver}>←</button>;
 * }
 * ```
 *
 * Documentado en `docs/estandares/LECCIONES_TECNICAS.md` —
 * "Patrón navegar atrás con fallback explícito".
 *
 * UBICACIÓN: apps/web/src/hooks/useVolverAtras.ts
 */

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Devuelve un handler `onClick` para el botón ← del header de una página.
 *
 * @param fallback Ruta a la que se navega si el usuario entró por URL
 *   directa (sin historial interno). Ejemplos: `'/inicio'`, `'/marketplace'`,
 *   `'/negocios'`. Debe ser una ruta válida del router.
 * @returns Función a usar en `onClick` del botón.
 */
export function useVolverAtras(fallback: string): () => void {
    const navigate = useNavigate();
    const location = useLocation();

    return useCallback(() => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate(fallback);
        }
    }, [navigate, location.key, fallback]);
}

export default useVolverAtras;
