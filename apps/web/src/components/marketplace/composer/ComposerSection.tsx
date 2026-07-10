/**
 * ComposerSection.tsx (MarketPlace)
 * ===================================
 * Orquestador del composer inline en el feed de MarketPlace.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `<ComposerColapsado>` MP (pill).
 *   - Click en la pill → `<ComposerMarketplace>` expandido inline.
 *   - Query params al cargar:
 *       ?crear=vendo|busco → expande en creación, preseleccionando el toggle
 *                            Vendo/Busco según el tab activo del feed.
 *       ?crear=1 / ?crear  → expande en creación sin forzar modo.
 *       ?editar=<id>       → expande en modo edición con ese artículo
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * Diferencias con el orquestador de Servicios:
 *   - MP usa Vendo/Busco (Servicios usa Ofrezco/Solicito), ambos vía `?crear`.
 *
 * El composer NO es overlay global — vive en el feed. Triggers externos
 * (Mis Publicaciones, FAB Publicar, botón Editar) redirigen aquí con
 * query params.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerSection.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBackNativo } from '../../../hooks/useBackNativo';
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

    /** Intención (Vendo/Busco) a preseleccionar al abrir en creación desde el
     *  FAB según el tab activo del feed. null = usa el modo del borrador. */
    const [intencionInicial, setIntencionInicial] = useState<'vendo' | 'busco' | null>(null);

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
            setIntencionInicial(crear === 'busco' ? 'busco' : crear === 'vendo' ? 'vendo' : null);
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
        // Abrir por la pill → sin forzar modo (usa el del borrador).
        setIntencionInicial(null);
        setExpandido(true);
    }

    function colapsar() {
        setExpandido(false);
        setModoEdicion(null);
        setRefreshKey((k) => k + 1);
    }

    // El composer expandido reemplaza el feed sin cambiar la URL (el ?crear/
    // ?editar se limpia con replace). Sin esto el back nativo no lo cerraba:
    // salía de /marketplace y perdía el borrador. Con useBackNativo el back
    // cierra el composer (colapsar conserva el borrador) y revela el feed.
    useBackNativo({ abierto: expandido, onCerrar: colapsar, discriminador: '_composerMarketplace' });

    if (expandido) {
        return (
            <ComposerMarketplace
                modo={modoEdicion ? 'editar' : 'crear'}
                articuloId={modoEdicion?.articuloId ?? null}
                intencionInicial={intencionInicial}
                onColapsar={colapsar}
            />
        );
    }

    return (
        <ComposerColapsado onExpandir={expandirCrear} refreshKey={refreshKey} />
    );
}

export default ComposerSection;
