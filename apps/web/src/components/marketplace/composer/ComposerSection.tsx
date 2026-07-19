/**
 * ComposerSection.tsx (MarketPlace)
 * ===================================
 * Orquestador del composer de MarketPlace. Solo abre/cierra un MODAL
 * (`ModalAdaptativo`) con `<ComposerMarketplace>` — no hay barra colapsada
 * inline (se eliminó `ComposerColapsado`, jul 2026). El único trigger de
 * apertura es el FAB (`FabPublicar`), vía query param.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `null` (nada — el FAB es la única entrada).
 *   - Query params al cargar:
 *       ?crear=vendo|busco → abre el modal en creación, preseleccionando el
 *                            toggle Vendo/Busco según el tab activo del feed.
 *       ?crear=1 / ?crear  → abre en creación sin forzar modo.
 *       ?editar=<id>       → abre en modo edición con ese artículo
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * Diferencias con el orquestador de Servicios:
 *   - MP usa Vendo/Busco (Servicios usa Ofrezco/Solicito), ambos vía `?crear`.
 *
 * Back nativo: NO se maneja aquí (se quitó `useBackNativo`) — `Modal`/
 * `ModalBottom` (dentro de `ModalAdaptativo`) ya registran su propio
 * `popstate`/`pushState`. Tenerlo en ambos lados duplicaba la entrada en el
 * history stack (doble-back).
 *
 * Triggers externos (Mis Publicaciones, botón Editar) redirigen aquí con
 * query params.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerSection.tsx
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ComposerMarketplace } from './ComposerMarketplace';

export function ComposerSection() {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandido, setExpandido] = useState(false);

    const [modoEdicion, setModoEdicion] = useState<{
        articuloId: string;
    } | null>(null);

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

    function colapsar() {
        setExpandido(false);
        setModoEdicion(null);
    }

    return (
        <ModalAdaptativo abierto={expandido} onCerrar={colapsar} ancho="wide" paddingContenido="none" sinScrollInterno mostrarHeader={false}>
            <ComposerMarketplace
                modo={modoEdicion ? 'editar' : 'crear'}
                articuloId={modoEdicion?.articuloId ?? null}
                intencionInicial={intencionInicial}
                onColapsar={colapsar}
            />
        </ModalAdaptativo>
    );
}

export default ComposerSection;
