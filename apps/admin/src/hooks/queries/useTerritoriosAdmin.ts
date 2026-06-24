/**
 * useTerritoriosAdmin.ts
 * ======================
 * Hooks de React Query para el módulo "Territorios" del Panel (mapa de zonas).
 *   - useZonas(filtros)          → zonas visibles para el rol. keepPreviousData.
 *   - useVendedoresAsignables()  → vendedores para el selector (super+gerente).
 *   - mutaciones: crear / editar / asignar / borrar zona (Fase 2).
 *
 * Los 3 roles ven; super+gerente actúan. El backend acota por rol.
 *
 * Ubicación: apps/admin/src/hooks/queries/useTerritoriosAdmin.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as territoriosService from '../../services/territoriosService';
import type { CrearZonaInput, EditarZonaInput, FiltrosZonas, TipoMarca } from '../../services/territoriosService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Zonas del territorio (con filtro de ciudad opcional). */
export function useZonas(filtros: FiltrosZonas = {}) {
  return useQuery({
    queryKey: queryKeys.territorios.zonas(filtros.ciudadId),
    queryFn: () => territoriosService.listarZonas(filtros),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

/** Ciudades del alcance (para elegir dónde dibujar). Solo super/gerente → `enabled`. */
export function useCiudadesDelAlcance(enabled = true) {
  return useQuery({
    queryKey: queryKeys.territorios.ciudades(),
    queryFn: () => territoriosService.listarCiudadesDelAlcance(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

/** Vendedores asignables a una zona (para el selector al crear/asignar). Solo super/gerente. */
export function useVendedoresAsignables(enabled = true) {
  return useQuery({
    queryKey: queryKeys.territorios.vendedores(),
    queryFn: () => territoriosService.listarVendedoresAsignables(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

/** Marcas de los vendedores para gerente/super (solo lectura), filtrables por ciudad. */
export function useMarcasEquipo(ciudadId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.territorios.marcasEquipo(ciudadId),
    queryFn: () => territoriosService.listarMarcasEquipo(ciudadId),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

// =============================================================================
// MUTACIONES — invalidan toda la familia ['territorios']
// =============================================================================

function useInvalidarTerritorios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.territorios.all() });
}

/** Crear una zona (polígono dibujado). */
export function useCrearZona() {
  const invalidar = useInvalidarTerritorios();
  return useMutation({
    mutationFn: (datos: CrearZonaInput) => territoriosService.crearZona(datos),
    onSuccess: () => { invalidar(); toast.exito('Zona creada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la zona')),
  });
}

/** Editar una zona (nombre/polígono/color). */
export function useEditarZona() {
  const invalidar = useInvalidarTerritorios();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: EditarZonaInput }) => territoriosService.editarZona(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Zona actualizada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la zona')),
  });
}

/** Asignar / quitar el vendedor de una zona. */
export function useAsignarZona() {
  const invalidar = useInvalidarTerritorios();
  return useMutation({
    mutationFn: ({ id, embajadorId }: { id: string; embajadorId: string | null }) => territoriosService.asignarZona(id, embajadorId),
    onSuccess: (_r, vars) => { invalidar(); toast.exito(vars.embajadorId ? 'Zona asignada' : 'Asignación retirada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo asignar la zona')),
  });
}

/** Borrar una zona. */
export function useBorrarZona() {
  const invalidar = useInvalidarTerritorios();
  return useMutation({
    mutationFn: (id: string) => territoriosService.borrarZona(id),
    onSuccess: () => { invalidar(); toast.exito('Zona eliminada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo eliminar la zona')),
  });
}

// =============================================================================
// MARCAS DEL VENDEDOR (G.2)
// =============================================================================

/** Mis marcas (solo el vendedor). */
export function useMisMarcas(enabled = true) {
  return useQuery({
    queryKey: queryKeys.territorios.marcas(),
    queryFn: () => territoriosService.listarMisMarcas(),
    enabled,
    staleTime: 1000 * 60,
  });
}

function useInvalidarMarcas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.territorios.marcas() });
}

/** Crear una marca (sin toast: tras crear se abre el editor de la marca). */
export function useCrearMarca() {
  const invalidar = useInvalidarMarcas();
  return useMutation({
    mutationFn: (datos: { lat: number; lng: number; tipo: TipoMarca; nota?: string }) => territoriosService.crearMarca(datos),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la marca')),
  });
}

/** Editar el estado/nota de una marca. */
export function useEditarMarca() {
  const invalidar = useInvalidarMarcas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: { tipo?: TipoMarca; nota?: string | null } }) => territoriosService.editarMarca(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Marca guardada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo guardar la marca')),
  });
}

/** Reubicar una marca (arrastrar el pin). Silencioso: sin toast en cada soltada. */
export function useMoverMarca() {
  const invalidar = useInvalidarMarcas();
  return useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat: number; lng: number }) => territoriosService.editarMarca(id, { lat, lng }),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo mover la marca')),
  });
}

/** Borrar una marca. */
export function useBorrarMarca() {
  const invalidar = useInvalidarMarcas();
  return useMutation({
    mutationFn: (id: string) => territoriosService.borrarMarca(id),
    onSuccess: () => { invalidar(); toast.exito('Marca eliminada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo eliminar la marca')),
  });
}
