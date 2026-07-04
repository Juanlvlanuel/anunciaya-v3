/**
 * useAyudaAdmin.ts
 * ================
 * Hooks de React Query del módulo "Ayuda y Tutoriales" del Panel.
 *
 * Ubicación: apps/admin/src/hooks/queries/useAyudaAdmin.ts
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as ayudaService from '../../services/ayudaService';
import type { CategoriaInput, ArticuloInput } from '../../services/ayudaService';
import { toast } from '../../stores/useToastPanel';

/** Categorías + artículos con métricas (todo, incluidos borradores). */
export function useAyudaLista() {
  return useQuery({
    queryKey: queryKeys.ayuda.contenido(),
    queryFn: () => ayudaService.listarAyuda(),
  });
}

function useRefrescarAyuda() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.ayuda.all() });
}

// ── Categorías ───────────────────────────────────────────────────────────────

export function useCrearCategoria() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: (input: CategoriaInput) => ayudaService.crearCategoria(input),
    onSuccess: () => {
      refrescar();
      toast.exito('Categoría creada');
    },
    onError: () => toast.error('No se pudo crear la categoría'),
  });
}

export function useEditarCategoria() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoriaInput> }) =>
      ayudaService.editarCategoria(id, input),
    onSuccess: () => {
      refrescar();
      toast.exito('Categoría actualizada');
    },
    onError: () => toast.error('No se pudo actualizar la categoría'),
  });
}

export function useBorrarCategoria() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: (id: string) => ayudaService.borrarCategoria(id),
    onSuccess: () => {
      refrescar();
      toast.exito('Categoría eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la categoría'),
  });
}

// ── Artículos ────────────────────────────────────────────────────────────────

export function useCrearArticulo() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: (input: ArticuloInput) => ayudaService.crearArticulo(input),
    onSuccess: () => {
      refrescar();
      toast.exito('Tutorial creado');
    },
    onError: () => toast.error('No se pudo crear el tutorial'),
  });
}

export function useEditarArticulo() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ArticuloInput> }) =>
      ayudaService.editarArticulo(id, input),
    onSuccess: () => {
      refrescar();
      toast.exito('Tutorial actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el tutorial'),
  });
}

export function useBorrarArticulo() {
  const refrescar = useRefrescarAyuda();
  return useMutation({
    mutationFn: (id: string) => ayudaService.borrarArticulo(id),
    onSuccess: () => {
      refrescar();
      toast.exito('Tutorial eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el tutorial'),
  });
}
