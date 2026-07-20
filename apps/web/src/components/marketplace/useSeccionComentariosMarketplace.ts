/**
 * useSeccionComentariosMarketplace.ts
 * ======================================
 * Orquesta datos + mutaciones de comentarios de un artículo de MarketPlace:
 * lista, restricción de modo Comercial y handlers de
 * editar/eliminar/responder. NO incluye el estado local del input (texto,
 * error) — eso vive en `InputComentarioMarketplace.tsx`, que se puede
 * renderizar en un lugar distinto de la lista (ej. sticky al fondo de un
 * modal mientras la lista scrollea junto con el resto del cuerpo).
 *
 * Usado por `ListaComentariosMarketplace.tsx`.
 *
 * Ubicación: apps/web/src/components/marketplace/useSeccionComentariosMarketplace.ts
 */

import { useCallback } from 'react';
import type { UsuarioComentario } from './ComentarioItem';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import {
    useComentariosArticulo,
    useCrearComentario,
    useEditarComentario,
    useEliminarComentario,
} from '../../hooks/queries/useMarketplace';

interface UseSeccionComentariosMarketplaceParams {
    articuloId: string;
    /** id del vendedor del artículo — habilita la etiqueta "Vendedor" en sus comentarios. */
    vendedorId: string;
}

function leerError(e: unknown): { status?: number; mensaje?: string } {
    const err = e as { response?: { status?: number; data?: { message?: string } } };
    return { status: err?.response?.status, mensaje: err?.response?.data?.message };
}

export function useSeccionComentariosMarketplace({
    articuloId,
    vendedorId,
}: UseSeccionComentariosMarketplaceParams) {
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';
    // Modo Comercial: bloqueado para comentar (regla del marketplace, igual
    // que la vista previa inline que reemplazó esta sección).
    const enModoComercial = modoActivo === 'comercial';
    const puedeComentar = !!usuario && !enModoComercial;

    const { data: comentarios = [], isLoading } = useComentariosArticulo(articuloId);
    const crearComentario = useCrearComentario();
    const editarComentario = useEditarComentario();
    const eliminarComentario = useEliminarComentario();

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
                await crearComentario.mutateAsync({ articuloId, texto, parentId });
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo publicar la respuesta');
                return false;
            }
        },
        [crearComentario, articuloId]
    );

    const handleEditar = useCallback(
        async (id: string, texto: string): Promise<boolean> => {
            try {
                await editarComentario.mutateAsync({ comentarioId: id, articuloId, texto });
                notificar.exito('Comentario actualizado');
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo guardar');
                return false;
            }
        },
        [editarComentario, articuloId]
    );

    const handleEliminar = useCallback(
        async (id: string) => {
            const confirmado = await notificar.confirmar('¿Eliminar este comentario?', 'Esta acción no se puede deshacer.');
            if (!confirmado) return;
            eliminarComentario.mutate(
                { comentarioId: id, articuloId },
                {
                    onSuccess: () => notificar.exito('Comentario eliminado'),
                    onError: () => notificar.error('No se pudo eliminar el comentario'),
                }
            );
        },
        [eliminarComentario, articuloId]
    );

    return {
        usuario,
        enModoComercial,
        puedeComentar,
        comentarios,
        isLoading,
        usuarioActual,
        vendedorId,
        crearComentario,
        handleResponder,
        handleEditar,
        handleEliminar,
    };
}
