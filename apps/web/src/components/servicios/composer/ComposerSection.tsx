/**
 * ComposerSection.tsx
 * =====================
 * Orquestador del composer de Servicios. Solo abre/cierra un MODAL
 * (`ModalAdaptativo`) con `<ComposerServicios>` — no hay barra colapsada
 * inline (se eliminó `ComposerColapsado`, jul 2026). El único trigger de
 * apertura es el FAB (`FabPublicar`), vía query param.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `null` (nada — el FAB es la única entrada).
 *   - Query params al cargar:
 *       ?crear=ofrezco|solicito → abre el modal en creación con ese modo
 *       ?editar=<id>            → abre el modal en edición con esa publicación
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * Back nativo: NO se maneja aquí (se quitó `useBackNativo`) — `Modal`/
 * `ModalBottom` (dentro de `ModalAdaptativo`) ya registran su propio
 * `popstate`/`pushState`. Tenerlo en ambos lados duplicaba la entrada en el
 * history stack (doble-back).
 *
 * Triggers externos (Mis Publicaciones, botón Editar) redirigen aquí con
 * query params.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerSection.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ComposerServicios } from './ComposerServicios';
import type { ModoServicio } from '../../../types/servicios';

interface ComposerSectionProps {
    /** Modo Ofrezco/Solicito por defecto según la tab activa del feed. */
    modoServiciosDefault: ModoServicio | null;
}

export function ComposerSection({ modoServiciosDefault }: ComposerSectionProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandido, setExpandido] = useState(false);

    const [modoEdicion, setModoEdicion] = useState<{
        publicacionId: string;
    } | null>(null);
    /** Modo Ofrezco/Solicito forzado por query param `?crear=...`. */
    const [modoOverride, setModoOverride] = useState<ModoServicio | null>(null);

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

    function colapsar() {
        setExpandido(false);
        setModoEdicion(null);
        setModoOverride(null);
    }

    return (
        <ModalAdaptativo abierto={expandido} onCerrar={colapsar} ancho="wide" paddingContenido="none" sinScrollInterno mostrarHeader={false}>
            <ComposerServicios
                modo={modoEdicion ? 'editar' : 'crear'}
                publicacionId={modoEdicion?.publicacionId ?? null}
                modoInicial={modoOverride ?? modoServiciosDefault}
                onColapsar={colapsar}
            />
        </ModalAdaptativo>
    );
}

export default ComposerSection;
