/**
 * MisPublicacionesServiciosSection.tsx
 * =====================================
 * Sección reutilizable que vive dentro de `PaginaMisPublicaciones.tsx` cuando
 * el toggle de tipo está en "Servicios". Renderiza:
 *   - Grid de `CardServicioMio` con la lista filtrada por tab activo
 *   - Estado vacío / error / loading con CTAs apropiadas
 *   - Modales de confirmación para eliminar y pausar
 *
 * Carga las 2 listas en paralelo (`activa` + `pausada`) para que los
 * conteos por tab estén disponibles en el padre (callback `onConteos`).
 *
 * Servicios NO tiene "vendida" — solo `activa | pausada`. Las acciones por
 * estado son: pausar/reactivar, editar (TODO Sprint 7.3), eliminar.
 *
 * Ubicación: apps/web/src/components/servicios/MisPublicacionesServiciosSection.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, PauseCircle, PlayCircle, Plus, Trash2 } from 'lucide-react';
import {
    useCambiarEstadoPublicacionServicio,
    useEliminarPublicacionServicio,
    useMisPublicacionesServicio,
    useReactivarPublicacionServicio,
} from '../../hooks/queries/useServicios';
import { notificar } from '../../utils/notificaciones';
import { Spinner } from '../ui/Spinner';
import type { PublicacionServicio } from '../../types/servicios';
import { CardServicioMio } from './CardServicioMio';

interface MisPublicacionesServiciosSectionProps {
    /** Tab seleccionado en la página padre. */
    tabActivo: 'activa' | 'pausada';
    /** Callback que recibe los conteos para que el padre actualice los badges
     *  de los tabs (lo llama cada vez que cambian las listas). */
    onConteos?: (conteos: { activa: number; pausada: number }) => void;
}

export function MisPublicacionesServiciosSection({
    tabActivo,
    onConteos,
}: MisPublicacionesServiciosSectionProps) {
    const navigate = useNavigate();

    // Cargar las 2 listas en paralelo para tener conteos.
    const queryActiva = useMisPublicacionesServicio('activa', {
        limit: 50,
        offset: 0,
    });
    const queryPausada = useMisPublicacionesServicio('pausada', {
        limit: 50,
        offset: 0,
    });

    // Reportar conteos al padre.
    useEffect(() => {
        if (!onConteos) return;
        const activa = queryActiva.data?.paginacion.total ?? 0;
        const pausada = queryPausada.data?.paginacion.total ?? 0;
        onConteos({ activa, pausada });
    }, [
        queryActiva.data?.paginacion.total,
        queryPausada.data?.paginacion.total,
        onConteos,
    ]);

    const cambiarEstadoMutation = useCambiarEstadoPublicacionServicio();
    const reactivarMutation = useReactivarPublicacionServicio();
    const eliminarMutation = useEliminarPublicacionServicio();

    const queryActual = tabActivo === 'activa' ? queryActiva : queryPausada;
    const publicaciones = queryActual.data?.data ?? [];
    const isPending = queryActual.isPending;
    const isError = queryActual.isError;
    const refetch = queryActual.refetch;

    // ─── Handlers ─────────────────────────────────────────────────────
    function handleEditar(p: PublicacionServicio) {
        // El composer vive inline en /servicios. Redirigimos al feed
        // con ?editar=<id>; ComposerSection lo detecta y expande el
        // composer con los datos hidratados.
        navigate(`/servicios?editar=${p.id}`);
    }

    async function handlePausar(p: PublicacionServicio) {
        const seguro = await notificar.confirmar(
            '¿Pausar esta publicación?',
            'Dejará de mostrarse en el feed. Puedes reactivarla cuando quieras.',
        );
        if (!seguro) return;
        try {
            const res = await cambiarEstadoMutation.mutateAsync({
                publicacionId: p.id,
                estado: 'pausada',
            });
            if (res.success) {
                notificar.exito('Publicación pausada.');
            } else {
                notificar.error(res.message ?? 'No pudimos pausarla.');
            }
        } catch {
            notificar.error('Error de red al pausar.');
        }
    }

    async function handleReactivar(p: PublicacionServicio) {
        try {
            const res = await reactivarMutation.mutateAsync(p.id);
            if (res.success) {
                notificar.exito(
                    '¡Publicación reactivada! Vuelve a estar visible 30 días.',
                );
            } else {
                notificar.error(res.message ?? 'No pudimos reactivarla.');
            }
        } catch {
            notificar.error('Error de red al reactivar.');
        }
    }

    async function handleEliminar(p: PublicacionServicio) {
        const seguro = await notificar.confirmar(
            '¿Eliminar definitivamente?',
            'Esta acción no se puede deshacer. La publicación dejará de existir para siempre.',
        );
        if (!seguro) return;
        try {
            const res = await eliminarMutation.mutateAsync(p.id);
            if (res.success) {
                notificar.exito('Publicación eliminada.');
            } else {
                notificar.error(res.message ?? 'No pudimos eliminarla.');
            }
        } catch {
            notificar.error('Error de red al eliminar.');
        }
    }

    function irAPublicar() {
        // Composer inline vive en /servicios — redirigimos con
        // ?crear=ofrezco para que se expanda al cargar.
        navigate('/servicios?crear=ofrezco');
    }

    // ─── Render ───────────────────────────────────────────────────────
    if (isPending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                    No pudimos cargar tus publicaciones
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-600">
                    Revisa tu conexión y vuelve a intentarlo.
                </p>
                <button
                    type="button"
                    data-testid="btn-reintentar-servicios"
                    onClick={() => refetch()}
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white lg:hover:bg-slate-800"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (publicaciones.length === 0) {
        return (
            <EstadoVacioServicios tab={tabActivo} onPublicar={irAPublicar} />
        );
    }

    return (
        <div
            data-testid="grid-mis-servicios"
            className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 2xl:gap-6"
        >
            {publicaciones.map((p) => (
                <div
                    key={p.id}
                    className="lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full h-full"
                >
                    <CardServicioMio
                        publicacion={p}
                        onEditar={handleEditar}
                        onPausar={handlePausar}
                        onReactivar={handleReactivar}
                        onEliminar={handleEliminar}
                    />
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// EstadoVacioServicios — copy adaptado por tab
// =============================================================================

interface EstadoVacioServiciosProps {
    tab: 'activa' | 'pausada';
    onPublicar: () => void;
}

function EstadoVacioServicios({ tab, onPublicar }: EstadoVacioServiciosProps) {
    // Copy adaptado por tab. Mismo patrón visual que el `EstadoVacio` de
    // MarketPlace (PaginaMisPublicaciones) — círculo grande pastel + ring,
    // título extrabold, mensaje conciso, CTA `rounded-xl` sólido. Paleta
    // sky en lugar de cyan para mantener la identidad de Servicios.
    const config = {
        activa: {
            icono: PlayCircle,
            titulo: 'Sin publicaciones activas',
            mensaje: 'Publica una para empezar a ofrecer.',
            cta: 'Publicar servicio',
        },
        pausada: {
            icono: PauseCircle,
            titulo: 'Sin publicaciones pausadas',
            mensaje: 'Aquí verás las que pauses o expiren.',
            cta: null,
        },
    }[tab];

    const Icono = config.icono;
    return (
        <div className="flex flex-col items-center justify-center py-20">
            {/* Círculo pastel con ring — patrón estándar idéntico a MP /
                Cupones / CardYA. Tamaño 24 (96px) + icono 12/16 (48/64). */}
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-sky-100 to-sky-50 flex items-center justify-center ring-8 ring-sky-50 mb-6">
                <Icono className="w-12 h-12 lg:w-16 lg:h-16 text-sky-400" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                {config.titulo}
            </h3>
            <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">
                {config.mensaje}
            </p>
            {config.cta && (
                <button
                    type="button"
                    data-testid="empty-servicios-publicar"
                    onClick={onPublicar}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors lg:cursor-pointer"
                >
                    <Plus className="w-5 h-5" />
                    {config.cta}
                </button>
            )}
        </div>
    );
}

export default MisPublicacionesServiciosSection;
