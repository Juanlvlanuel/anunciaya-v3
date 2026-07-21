/**
 * useSeccionComentariosServicio.ts
 * ===================================
 * Orquesta datos + mutaciones de comentarios de una publicación de
 * Servicios: lista, restricción de modo Comercial y handlers de
 * editar/eliminar/responder. NO incluye el estado local del input (texto,
 * error) — eso vive en `InputComentarioServicio.tsx`, que se puede
 * renderizar en un lugar distinto de la lista (ej. sticky al fondo de un
 * modal mientras la lista scrollea junto con el resto del cuerpo).
 *
 * Mismo patrón que `useSeccionComentariosMarketplace.ts`. Usado por
 * `ListaComentariosServicio.tsx`.
 *
 * Ubicación: apps/web/src/components/servicios/useSeccionComentariosServicio.ts
 */

import { useCallback } from 'react';
import type { UsuarioComentario } from '../marketplace/ComentarioItem';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import {
    useComentariosServicio,
    useCrearComentarioServicio,
    useEditarComentarioServicio,
    useEliminarComentarioServicio,
} from '../../hooks/queries/useServicios';

interface UseSeccionComentariosServicioParams {
    publicacionId: string;
    /** id del dueño de la publicación — habilita la etiqueta "Autor" en sus comentarios. */
    duenoId: string;
}

function leerError(e: unknown): { status?: number; mensaje?: string } {
    const err = e as { response?: { status?: number; data?: { message?: string } } };
    return { status: err?.response?.status, mensaje: err?.response?.data?.message };
}

export function useSeccionComentariosServicio({
    publicacionId,
    duenoId,
}: UseSeccionComentariosServicioParams) {
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';
    const enModoComercial = modoActivo === 'comercial';
    const puedeComentar = !!usuario && !enModoComercial;

    const { data: comentarios = [], isLoading } = useComentariosServicio(publicacionId);
    const crearComentario = useCrearComentarioServicio();
    const editarComentario = useEditarComentarioServicio();
    const eliminarComentario = useEliminarComentarioServicio();

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    const handleResponder = useCallback(
        async (parentId: string, texto: string): Promise<boolean> => {
            try {
                await crearComentario.mutateAsync({ publicacionId, texto, parentId });
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo publicar la respuesta');
                return false;
            }
        },
        [crearComentario, publicacionId]
    );

    const handleEditar = useCallback(
        async (id: string, texto: string): Promise<boolean> => {
            try {
                await editarComentario.mutateAsync({ comentarioId: id, publicacionId, texto });
                notificar.exito('Comentario actualizado');
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo guardar');
                return false;
            }
        },
        [editarComentario, publicacionId]
    );

    const handleEliminar = useCallback(
        async (id: string) => {
            const confirmado = await notificar.confirmar('¿Eliminar este comentario?', 'Esta acción no se puede deshacer.');
            if (!confirmado) return;
            eliminarComentario.mutate(
                { comentarioId: id, publicacionId },
                {
                    onSuccess: () => notificar.exito('Comentario eliminado'),
                    onError: () => notificar.error('No se pudo eliminar el comentario'),
                }
            );
        },
        [eliminarComentario, publicacionId]
    );

    return {
        usuario,
        enModoComercial,
        puedeComentar,
        comentarios,
        isLoading,
        usuarioActual,
        duenoId,
        crearComentario,
        handleResponder,
        handleEditar,
        handleEliminar,
    };
}
