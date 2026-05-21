/**
 * ComposerSection.tsx (MarketPlace)
 * ===================================
 * Orquestador del composer inline en el feed de MarketPlace.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `<ComposerColapsado>` MP (pill).
 *   - Click en la pill → `<ComposerMarketplace>` expandido inline.
 *   - Query params al cargar:
 *       ?crear=1       → expande en modo creación
 *       ?editar=<id>   → expande en modo edición con ese artículo
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * Diferencias con el orquestador de Servicios:
 *   - Sin `modoServiciosDefault` (en MP no hay Ofrezco/Solicito).
 *   - `?crear` no requiere valor (basta su presencia).
 *
 * El composer NO es overlay global — vive en el feed. Triggers externos
 * (Mis Publicaciones, FAB Publicar, botón Editar) redirigen aquí con
 * query params.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerSection.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ComposerColapsado } from './ComposerColapsado';
import { ComposerMarketplace } from './ComposerMarketplace';

interface ComposerSectionProps {
    /** Callback opcional: notifica al padre cuando el composer cambia
     *  entre colapsado y expandido. Útil para que el widget vecino
     *  (Mis Publicaciones) ajuste su densidad (más cards cuando hay
     *  más altura disponible). */
    onExpandirChange?: (expandido: boolean) => void;
}

export function ComposerSection({ onExpandirChange }: ComposerSectionProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandido, setExpandido] = useState(false);

    // Notificar al padre cada vez que cambia el estado expandido/colapsado.
    useEffect(() => {
        onExpandirChange?.(expandido);
    }, [expandido, onExpandirChange]);

    const [modoEdicion, setModoEdicion] = useState<{
        articuloId: string;
    } | null>(null);
    /** Tick que cambia cada vez que el composer se colapsa o publica —
     *  obliga a la pill a re-leer el borrador de localStorage. */
    const [refreshKey, setRefreshKey] = useState(0);

    // ─── Leer query params al montar / cambiar URL ────────────────────
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const editar = sp.get('editar');
        const crear = sp.get('crear');

        if (editar) {
            setModoEdicion({ articuloId: editar });
            setExpandido(true);
            limpiarQueryParams(sp);
        } else if (crear !== null) {
            setExpandido(true);
            limpiarQueryParams(sp);
        }
    }, [location.search]);

    function limpiarQueryParams(sp: URLSearchParams) {
        sp.delete('editar');
        sp.delete('crear');
        const qs = sp.toString();
        navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, {
            replace: true,
        });
    }

    function expandirCrear() {
        setExpandido(true);
    }

    function colapsar() {
        setExpandido(false);
        setModoEdicion(null);
        setRefreshKey((k) => k + 1);
    }

    if (expandido) {
        return (
            <ComposerMarketplace
                modo={modoEdicion ? 'editar' : 'crear'}
                articuloId={modoEdicion?.articuloId ?? null}
                onColapsar={colapsar}
            />
        );
    }

    return (
        <ComposerColapsado onExpandir={expandirCrear} refreshKey={refreshKey} />
    );
}

export default ComposerSection;
