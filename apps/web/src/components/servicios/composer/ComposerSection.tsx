/**
 * ComposerSection.tsx (Servicios)
 * =====================
 * Orquestador del composer de Servicios.
 *
 * Móvil: página COMPLETA (estilo Instagram/Facebook "Nueva publicación") —
 * sin overlay oscuro, sin esquinas redondeadas, cubre todo el viewport.
 * Escritorio: `ModalAdaptativo` de tamaño FIJO (no crece con el contenido).
 * Mismo patrón que `ComposerSection.tsx` de Negocios/MarketPlace.
 *
 * Decide qué renderizar:
 *   - Estado por defecto → `null` (nada — el FAB es la única entrada).
 *   - Query params al cargar:
 *       ?crear=ofrezco|solicito → abre el modal en creación con ese modo
 *       ?editar=<id>            → abre el modal en edición con esa publicación
 *     Tras procesarlos, limpia los query params del URL con replaceState.
 *
 * Back nativo: en escritorio lo maneja `Modal` (dentro de `ModalAdaptativo`).
 * En móvil lo maneja este componente directamente (`useBackNativo`), porque
 * la página completa ya no pasa por `ModalBottom`.
 *
 * Triggers externos (Mis Publicaciones, botón Editar) redirigen aquí con
 * query params.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerSection.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ComposerServicios } from './ComposerServicios';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useBackNativo } from '../../../hooks/useBackNativo';
import { usePortalTarget } from '../../../hooks/usePortalTarget';
import type { ModoServicio } from '../../../types/servicios';

interface ComposerSectionProps {
    /** Modo Ofrezco/Solicito por defecto según la tab activa del feed. */
    modoServiciosDefault: ModoServicio | null;
}

export function ComposerSection({ modoServiciosDefault }: ComposerSectionProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { esMobile } = useBreakpoint();
    const portalTarget = usePortalTarget();
    const esContenido = portalTarget !== document.body;
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

    // El composer intercepta el cierre (confirma si hay cambios sin guardar)
    // y registra aquí su propio handler — así el back nativo (móvil) y el
    // click-fuera/Escape del modal (escritorio) pasan por la MISMA
    // confirmación que el botón X interno, en vez de cerrar directo.
    // `intentarCerrarRef` devuelve `true` si de verdad cerró, `false` si se
    // quedó abierto (mostró el modal de confirmación).
    const intentarCerrarRef = useRef<() => boolean>(() => {
        colapsar();
        return true;
    });
    // `guardKey` fuerza que `useBackNativo` re-arme su entrada del history:
    // cuando el back nativo abre el modal de confirmación, esa entrada ya se
    // consumió — sin re-armar, el SIGUIENTE back saldría sin avisar.
    const [guardKey, setGuardKey] = useState(0);
    const onIntentarCerrar = useCallback(() => {
        const seCerro = intentarCerrarRef.current();
        if (!seCerro) setGuardKey((k) => k + 1);
    }, []);
    const registrarIntentarCerrar = useCallback((fn: () => boolean) => {
        intentarCerrarRef.current = fn;
    }, []);

    // Página completa móvil: back nativo propio (ya no pasa por ModalBottom).
    const abiertoMovil = expandido && esMobile;
    useBackNativo({
        abierto: abiertoMovil,
        onCerrar: onIntentarCerrar,
        discriminador: `_composerServiciosFull_${guardKey}`,
    });

    // Bloquear scroll del body mientras la página completa está abierta.
    useEffect(() => {
        if (!abiertoMovil || esContenido) return;
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [abiertoMovil, esContenido]);

    const composer = (
        <ComposerServicios
            modo={modoEdicion ? 'editar' : 'crear'}
            publicacionId={modoEdicion?.publicacionId ?? null}
            modoInicial={modoOverride ?? modoServiciosDefault}
            onColapsar={colapsar}
            registrarIntentarCerrar={registrarIntentarCerrar}
            onReforzarGuardia={() => setGuardKey((k) => k + 1)}
        />
    );

    if (esMobile) {
        if (!expandido) return null;
        return createPortal(
            <div
                data-testid="composer-servicios-fullscreen"
                className={`${esContenido ? 'absolute' : 'fixed'} inset-0 z-52 flex flex-col bg-white`}
            >
                {composer}
            </div>,
            portalTarget
        );
    }

    return (
        <ModalAdaptativo
            abierto={expandido}
            onCerrar={onIntentarCerrar}
            ancho="full"
            paddingContenido="none"
            sinScrollInterno
            mostrarHeader={false}
            className="h-[560px] lg:h-[600px] 2xl:h-[660px] lg:!max-w-[740px] 2xl:!max-w-[798px]"
        >
            {composer}
        </ModalAdaptativo>
    );
}

export default ComposerSection;
