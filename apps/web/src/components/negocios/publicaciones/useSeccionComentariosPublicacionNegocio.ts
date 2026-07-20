/**
 * useSeccionComentariosPublicacionNegocio.ts
 * =============================================
 * Orquesta datos + mutaciones de comentarios de una publicación de negocio:
 * lista, moderación (dueño/gerente del negocio) y handlers de
 * editar/eliminar/responder. NO incluye el estado local del input (texto,
 * error) — eso vive en `InputComentarioPublicacionNegocio.tsx`, que se
 * puede renderizar en un lugar distinto de la lista (ej. sticky al fondo
 * de un modal mientras la lista scrollea junto con el resto del cuerpo).
 *
 * Usado por `ListaComentariosPublicacionNegocio.tsx`.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/useSeccionComentariosPublicacionNegocio.ts
 */

import { useCallback } from 'react';
import type { UsuarioComentario } from '../../marketplace/ComentarioItem';
import { useAuthStore } from '../../../stores/useAuthStore';
import { notificar } from '../../../utils/notificaciones';
import {
    useComentariosPublicacionNegocio,
    useCrearComentarioNegocio,
    useEditarComentarioNegocio,
    useEliminarComentarioNegocio,
} from '../../../hooks/queries/useNegocioPublicaciones';

interface UseSeccionComentariosPublicacionNegocioParams {
    publicacionId: string;
    /** negocioId de la publicación — habilita moderación si el usuario es dueño/gerente. */
    negocioId?: string;
    /** Fallback de moderación cuando el usuario no es dueño del negocio. */
    autorUsuarioId?: string;
}

function leerError(e: unknown): { status?: number; mensaje?: string } {
    const err = e as { response?: { status?: number; data?: { message?: string } } };
    return { status: err?.response?.status, mensaje: err?.response?.data?.message };
}

export function useSeccionComentariosPublicacionNegocio({
    publicacionId,
    negocioId,
    autorUsuarioId,
}: UseSeccionComentariosPublicacionNegocioParams) {
    const usuario = useAuthStore((s) => s.usuario);
    const { data: comentarios = [], isLoading } = useComentariosPublicacionNegocio(publicacionId);
    const crearComentario = useCrearComentarioNegocio();
    const editarComentario = useEditarComentarioNegocio();
    const eliminarComentario = useEliminarComentarioNegocio();

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    // Cualquier usuario logueado puede comentar/moderar (sin restricción de
    // modo, a diferencia de MarketPlace). Si es dueño/gerente del negocio de
    // esta publicación, "se hace pasar" por el vendedor para que el botón
    // eliminar aparezca también sobre comentarios ajenos (ComentarioItem solo
    // compara un único id — el backend igual valida pertenencia al negocio).
    const esPropioNegocio = !!usuario?.negocioId && usuario.negocioId === negocioId;
    const vendedorIdParaUI = esPropioNegocio ? (usuario?.id ?? '') : (autorUsuarioId ?? '');

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
        comentarios,
        isLoading,
        usuarioActual,
        vendedorIdParaUI,
        crearComentario,
        handleResponder,
        handleEditar,
        handleEliminar,
    };
}
