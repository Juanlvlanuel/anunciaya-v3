/**
 * ComposerSection.tsx
 * =====================
 * Orquestador del composer inline en el feed de Servicios.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `<ComposerColapsado>` (pill).
 *   - Click en la pill → `<ComposerServicios>` expandido inline.
 *   - Query params al cargar:
 *       ?crear=ofrezco|solicito → expande en modo creación con ese modo
 *       ?editar=<id>            → expande en modo edición con esa publicación
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * El composer NO es overlay global — vive en el feed. Triggers externos
 * (Mis Publicaciones, FAB) redirigen aquí con query params.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerSection.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBackNativo } from '../../../hooks/useBackNativo';
import { ComposerColapsado } from './ComposerColapsado';
import { ComposerServicios } from './ComposerServicios';
import type { ModoServicio } from '../../../types/servicios';

interface ComposerSectionProps {
    /** Modo Ofrezco/Solicito por defecto según la tab activa del feed. */
    modoServiciosDefault: ModoServicio | null;
    /** Callback opcional: notifica al padre cuando el composer cambia
     *  entre colapsado y expandido. Útil para que el widget vecino
     *  (Mis Publicaciones) ajuste su densidad (más cards cuando hay
     *  más altura disponible). */
    onExpandirChange?: (expandido: boolean) => void;
}

export function ComposerSection({
    modoServiciosDefault,
    onExpandirChange,
}: ComposerSectionProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandido, setExpandido] = useState(false);

    // Notificar al padre cada vez que cambia el estado expandido/colapsado.
    useEffect(() => {
        onExpandirChange?.(expandido);
    }, [expandido, onExpandirChange]);
    const [modoEdicion, setModoEdicion] = useState<{
        publicacionId: string;
    } | null>(null);
    /** Modo Ofrezco/Solicito forzado por query param `?crear=...`. */
    const [modoOverride, setModoOverride] = useState<ModoServicio | null>(null);
    /** Tick que cambia cada vez que el composer se colapsa o publica —
     *  obliga a la pill a re-leer el borrador de localStorage. */
    const [refreshKey, setRefreshKey] = useState(0);

    // ─── Leer query params al montar / cambiar URL ────────────────────
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const editar = sp.get('editar');
        const crear = sp.get('crear');

        if (editar) {
            setModoEdicion({ publicacionId: editar });
            setExpandido(true);
            limpiarQueryParams(sp);
        } else if (crear === 'ofrezco' || crear === 'solicito') {
            setModoOverride(crear);
            setExpandido(true);
            limpiarQueryParams(sp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setModoOverride(null);
        setRefreshKey((k) => k + 1);
    }

    // El composer expandido reemplaza el feed sin cambiar la URL (el ?crear/
    // ?editar se limpia con replace). Sin esto el back nativo no lo cerraba:
    // salía de /servicios y perdía el borrador. Con useBackNativo el back
    // cierra el composer (colapsar conserva el borrador) y revela el feed.
    useBackNativo({ abierto: expandido, onCerrar: colapsar, discriminador: '_composerServicios' });

    if (expandido) {
        return (
            <ComposerServicios
                modo={modoEdicion ? 'editar' : 'crear'}
                publicacionId={modoEdicion?.publicacionId ?? null}
                modoInicial={modoOverride ?? modoServiciosDefault}
                onColapsar={colapsar}
            />
        );
    }

    return (
        <ComposerColapsado
            modoServiciosDefault={modoServiciosDefault}
            onExpandir={expandirCrear}
            refreshKey={refreshKey}
        />
    );
}

export default ComposerSection;
