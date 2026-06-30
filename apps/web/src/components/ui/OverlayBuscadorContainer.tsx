/**
 * OverlayBuscadorContainer.tsx
 * =============================
 * Wrapper visual + comportamental compartido por los 4 OverlayBuscador de
 * sección (`Negocios`, `MarketPlace`, `Ofertas`, `Servicios`).
 *
 * Encapsula el "chrome" duplicado de los 4 archivos:
 *
 *   - Scrim full-screen `fixed inset-0 z-50` con gradient radial estándar
 *     (mismo que `Modal.tsx`).
 *   - Contenedor blanco centrado `max-w-3xl max-h-[480px]` con scroll interno
 *     y borde redondeado. Variantes de margen superior por breakpoint.
 *   - Bloqueo del scroll del body mientras está abierto (clave en móvil:
 *     en desktop el body ya viene con `overflow:hidden` desde `index.css`).
 *   - Cierre con `Escape`.
 *   - Cierre con click en el backdrop (stop-propagation en el contenido).
 *   - Back nativo del navegador / Android cierra el overlay (vía
 *     `useBackNativo`). Cada buscador pasa su propio `discriminador` para
 *     evitar colisión cuando hay otros overlays apilados.
 *
 * Patrón seguido: `Modal.tsx` / `ModalBottom.tsx` — mismos atributos ARIA
 * (`role="dialog"`, `aria-modal="true"`, `aria-label`).
 *
 * Por qué existe: los 4 buscadores compartían exactamente este chrome
 * (~30 líneas idénticas en cada archivo, incluyendo los `useEffect` de
 * scroll/Escape). Extraerlo aquí garantiza:
 *
 *  - Una sola fuente de verdad para el comportamiento de back / Escape /
 *    scroll lock — si cambia el patrón, cambia aquí.
 *  - Los 4 buscadores se reducen a su contenido específico (recientes,
 *    populares, sugerencias).
 *  - Back nativo móvil queda cubierto sin tener que recordarlo en cada
 *    archivo (era el bug que disparó la auditoría).
 *
 * Auditoría: `docs/auditoria/Navegacion_Modales_2026-05-19.md` (Fase 1).
 *
 * Ubicación: apps/web/src/components/ui/OverlayBuscadorContainer.tsx
 */

import { useEffect, type ReactNode } from 'react';
import { useBackNativo } from '../../hooks/useBackNativo';

// =============================================================================
// TIPOS
// =============================================================================

interface OverlayBuscadorContainerProps {
    /** ¿El overlay está visible? */
    abierto: boolean;
    /** Handler para cerrar el overlay (Escape, click backdrop, back nativo). */
    onCerrar: () => void;
    /**
     * Discriminador único para `useBackNativo`. Patrón: `_buscador<Seccion>`
     * (ej: `_buscadorNegocios`). Evita colisión cuando hay otros overlays
     * apilados — ver doc de `Modal.tsx` y `useBackNativo.ts`.
     */
    discriminador: string;
    /**
     * Label accesible del overlay. Patrón: "Buscador de [Sección]".
     */
    ariaLabel: string;
    /** `data-testid` del wrapper exterior. */
    testId: string;
    /** Contenido específico del buscador (recientes, populares, sugerencias). */
    children: ReactNode;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function OverlayBuscadorContainer({
    abierto,
    onCerrar,
    discriminador,
    ariaLabel,
    testId,
    children,
}: OverlayBuscadorContainerProps) {
    // ── Back nativo (móvil + desktop). ──────────────────────────────────────
    // Se monta solo cuando el overlay está abierto. Cuando el usuario presiona
    // el back físico de Android o la flecha de back del navegador, el hook
    // dispara `onCerrar` sin tocar la ruta actual.
    useBackNativo({
        abierto,
        onCerrar,
        discriminador,
    });

    // ── Bloquear scroll del body mientras el overlay está abierto. ──────────
    // (En desktop el body ya viene con `overflow:hidden` desde `index.css`,
    // pero en móvil sin esto la página detrás sigue haciendo scroll.)
    useEffect(() => {
        if (!abierto) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [abierto]);

    // ── Cerrar con tecla Escape. ────────────────────────────────────────────
    useEffect(() => {
        if (!abierto) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCerrar();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    return (
        <div
            data-testid={testId}
            // Desktop: `lg:z-[45]` deja el overlay POR DEBAJO del navbar
            // (wrapper `fixed z-50` en MainLayout) — así el scrim no tapa el
            // header y el input se ve enfocado — pero POR ENCIMA de los
            // toggles/FABs de página (z-40, ej. el toggle flotante Mapa/Lista
            // de Negocios), que antes quedaban visibles sobre el scrim al
            // teclear. Móvil conserva `z-50` (el input vive en el header
            // inmersivo, que sí debe quedar bajo el scrim).
            className="fixed inset-0 z-50 lg:z-[45]"
            onClick={onCerrar}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            {/* Scrim con gradiente radial — patrón estándar de modales (ver `Modal.tsx`). */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] animate-in fade-in duration-200" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative mx-auto mt-20 max-h-[480px] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl lg:mt-24"
            >
                {children}
            </div>
        </div>
    );
}

export default OverlayBuscadorContainer;
