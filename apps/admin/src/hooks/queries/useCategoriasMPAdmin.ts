/**
 * useCategoriasMPAdmin.ts
 * =======================
 * Hooks de React Query para las categorías de MarketPlace en el Panel (catálogo
 * simple de 1 nivel). Solo superadmin (lo garantiza el gate del backend).
 *
 * Ubicación: apps/admin/src/hooks/queries/useCategoriasMPAdmin.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as categoriasService from '../../services/categoriasMarketplaceService';
import { toast } from '../../stores/useToastPanel';

function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

export function useCatalogoMarketplace(ciudadId?: string) {
  return useQuery({
    queryKey: queryKeys.categoriasMarketplace.catalogo(ciudadId),
    queryFn: () => categoriasService.listarCatalogo(ciudadId),
    staleTime: 1000 * 60,
  });
}

/** Publicaciones por ciudad (badge del dropdown). Independiente del filtro de ciudad. */
export function useMarketplacePorCiudad() {
  return useQuery({
    queryKey: queryKeys.categoriasMarketplace.porCiudad(),
    queryFn: () => categoriasService.contarPorCiudad(),
    staleTime: 1000 * 60,
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.categoriasMarketplace.all() });
}

export function useCrearCategoriaMP() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (datos: { nombre: string }) => categoriasService.crearCategoria(datos),
    onSuccess: () => {
      invalidar();
      toast.exito('Categoría creada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la categoría')),
  });
}

export function useEditarCategoriaMP() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: { nombre?: string } }) =>
      categoriasService.editarCategoria(id, datos),
    onSuccess: () => {
      invalidar();
      toast.exito('Categoría actualizada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la categoría')),
  });
}

export function useCambiarActivaCategoriaMP() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
      categoriasService.cambiarActivaCategoria(id, activa),
    onSuccess: (r) => {
      invalidar();
      toast.exito(r.activa ? 'Categoría activada' : 'Categoría desactivada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cambiar el estado')),
  });
}

export function useReordenarCategoriasMP() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (ids: number[]) => categoriasService.reordenarCategorias(ids),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reordenar')),
  });
}
