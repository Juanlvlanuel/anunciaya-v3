/**
 * useCategoriasAdmin.ts
 * =====================
 * Hooks de React Query para el módulo "Categorías" del Panel (catálogo de negocios
 * + disponibilidad por ciudad). Solo superadmin (lo garantiza el gate del backend).
 *
 *   useCatalogo()            → catálogo completo (categorías → subcategorías + ciudades).
 *   + mutaciones de categoría y subcategoría (todas invalidan ['categorias']).
 *
 * Ubicación: apps/admin/src/hooks/queries/useCategoriasAdmin.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as categoriasService from '../../services/categoriasService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Catálogo completo (categorías + subcategorías + ciudades) + total de negocios
 *  clasificados. @param ciudadId filtra los conteos de negocios por ciudad. */
export function useCatalogo(ciudadId?: string) {
  return useQuery({
    queryKey: queryKeys.categorias.catalogo(ciudadId),
    queryFn: () => categoriasService.listarCatalogo(ciudadId),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// MUTACIONES — invalidan toda la familia ['categorias']
// =============================================================================

function useInvalidarCategorias() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.categorias.all() });
}

// ── Categoría ────────────────────────────────────────────────────────────────
export function useCrearCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: (datos: { nombre: string; ciudadIds?: string[] }) => categoriasService.crearCategoria(datos),
    onSuccess: () => { invalidar(); toast.exito('Categoría creada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la categoría')),
  });
}

export function useEditarCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: { nombre?: string } }) => categoriasService.editarCategoria(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Categoría actualizada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la categoría')),
  });
}

export function useCambiarActivaCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) => categoriasService.cambiarActivaCategoria(id, activa),
    onSuccess: (r) => { invalidar(); toast.exito(r.activa ? 'Categoría activada' : 'Categoría desactivada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cambiar el estado')),
  });
}

export function useAsignarCiudadesCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, ciudadIds }: { id: number; ciudadIds: string[] }) => categoriasService.asignarCiudadesCategoria(id, ciudadIds),
    onSuccess: (r) => { invalidar(); toast.exito(r.total ? 'Disponibilidad actualizada' : 'Disponible en todas las ciudades'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la disponibilidad')),
  });
}

export function useReordenarCategorias() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: (ids: number[]) => categoriasService.reordenarCategorias(ids),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reordenar')),
  });
}

// ── Subcategoría ─────────────────────────────────────────────────────────────
export function useCrearSubcategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: (datos: { categoriaId: number; nombre: string; ciudadIds?: string[] }) => categoriasService.crearSubcategoria(datos),
    onSuccess: () => { invalidar(); toast.exito('Subcategoría creada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la subcategoría')),
  });
}

export function useEditarSubcategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: { nombre?: string } }) => categoriasService.editarSubcategoria(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Subcategoría actualizada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la subcategoría')),
  });
}

export function useCambiarActivaSubcategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) => categoriasService.cambiarActivaSubcategoria(id, activa),
    onSuccess: (r) => { invalidar(); toast.exito(r.activa ? 'Subcategoría activada' : 'Subcategoría desactivada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cambiar el estado')),
  });
}

export function useAsignarCiudadesSubcategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, ciudadIds }: { id: number; ciudadIds: string[] }) => categoriasService.asignarCiudadesSubcategoria(id, ciudadIds),
    onSuccess: (r) => { invalidar(); toast.exito(r.total ? 'Disponibilidad actualizada' : 'Disponible en todas las ciudades de su categoría'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la disponibilidad')),
  });
}

export function useReordenarSubcategorias() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ categoriaId, ids }: { categoriaId: number; ids: number[] }) => categoriasService.reordenarSubcategorias(categoriaId, ids),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reordenar')),
  });
}
