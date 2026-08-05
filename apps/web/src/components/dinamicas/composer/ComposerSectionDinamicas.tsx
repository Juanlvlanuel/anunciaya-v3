/**
 * ComposerSectionDinamicas.tsx
 * ==============================
 * Orquestador del composer de Dinámicas — calcado 1:1 de
 * `components/marketplace/composer/ComposerSection.tsx`.
 *
 * Móvil: página COMPLETA (estilo Instagram/Facebook "Nueva publicación") —
 * sin overlay oscuro, sin esquinas redondeadas, cubre todo el viewport.
 * Escritorio: `ModalAdaptativo` de tamaño FIJO (no crece con el contenido).
 *
 * Query params:
 *   ?crearDinamica=1      → abre en creación.
 *   ?editarDinamica=<id>  → abre en edición con esa Dinámica.
 * Tras procesarlos, limpia los query params con replaceState.
 *
 * Back nativo: en escritorio lo maneja `Modal` (dentro de `ModalAdaptativo`).
 * En móvil lo maneja este componente directamente (`useBackNativo`).
 *
 * Fase 2: se monta directo en `PaginaMarketplace.tsx` condicionado a estos
 * query params — el switch/pill visual que lo revela sin URL manual es
 * Fase 5.
 *
 * Ubicación: apps/web/src/components/dinamicas/composer/ComposerSectionDinamicas.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { ComposerDinamicas } from './ComposerDinamicas';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useBackNativo } from '../../../hooks/useBackNativo';
import { usePortalTarget } from '../../../hooks/usePortalTarget';

export function ComposerSectionDinamicas() {
    const navigate = useNavigate();
    const location = useLocation();
    const { esMobile } = useBreakpoint();
    const portalTarget = usePortalTarget();
    const esContenido = portalTarget !== document.body;
    const [expandido, setExpandido] = useState(false);

    const [modoEdicion, setModoEdicion] = useState<{ dinamicaId: string } | null>(null);

    // ─── Leer query params al montar / cambiar URL ────────────────────
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const editar = sp.get('editarDinamica');
        const crear = sp.get('crearDinamica');

        if (editar) {
            setModoEdicion({ dinamicaId: editar });
            setExpandido(true);
            limpiarQueryParams(sp);
        } else if (crear !== null) {
            setExpandido(true);
            limpiarQueryParams(sp);
        }
    }, [location.search]);

    function limpiarQueryParams(sp: URLSearchParams) {
        sp.delete('editarDinamica');
        sp.delete('crearDinamica');
        const qs = sp.toString();
        navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    }

    function colapsar() {
        setExpandido(false);
        setModoEdicion(null);
    }

    // El composer intercepta el cierre (confirma si hay cambios sin guardar)
    // y registra aquí su propio handler — mismo patrón que ComposerSection de
    // MarketPlace.
    const intentarCerrarRef = useRef<() => boolean>(() => {
        colapsar();
        return true;
    });
    const [guardKey, setGuardKey] = useState(0);
    const onIntentarCerrar = useCallback(() => {
        const seCerro = intentarCerrarRef.current();
        if (!seCerro) setGuardKey((k) => k + 1);
    }, []);
    const registrarIntentarCerrar = useCallback((fn: () => boolean) => {
        intentarCerrarRef.current = fn;
    }, []);

    const abiertoMovil = expandido && esMobile;
    useBackNativo({
        abierto: abiertoMovil,
        onCerrar: onIntentarCerrar,
        discriminador: `_composerDinamicasFull_${guardKey}`,
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
        <ComposerDinamicas
            modo={modoEdicion ? 'editar' : 'crear'}
            dinamicaId={modoEdicion?.dinamicaId ?? null}
            onColapsar={colapsar}
            registrarIntentarCerrar={registrarIntentarCerrar}
            onReforzarGuardia={() => setGuardKey((k) => k + 1)}
        />
    );

    if (esMobile) {
        if (!expandido) return null;
        return createPortal(
            <div
                data-testid="composer-dinamicas-fullscreen"
                className={`${esContenido ? 'absolute' : 'fixed'} inset-0 z-52 flex flex-col bg-white`}
                style={esContenido ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
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
            className="h-[560px] lg:h-[600px] 2xl:h-[660px] lg:!max-w-[798px] 2xl:!max-w-[798px]"
            discriminador={`_composerDinamicasFull_${guardKey}`}
        >
            {composer}
        </ModalAdaptativo>
    );
}

export default ComposerSectionDinamicas;
