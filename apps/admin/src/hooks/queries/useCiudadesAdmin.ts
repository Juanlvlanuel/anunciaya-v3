/**
 * useCiudadesAdmin.ts
 * ===================
 * Hooks de React Query para el módulo "Ciudades" del Panel (catálogo + regiones).
 *   - useCiudadesLista(filtros) → catálogo de ciudades (con filtros). keepPreviousData.
 *   - useRegionesCatalogo()     → regiones con su # de ciudades.
 *
 * Solo superadmin (lo garantiza el gate del backend). Las mutaciones (crear/editar/
 * activar/agrupar) se agregan en la Fase 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useCiudadesAdmin.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as ciudadesService from '../../services/ciudadesService';
import type { CiudadAlta, DatosCiudadEditar, FiltrosCiudades } from '../../services/ciudadesService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Catálogo de ciudades con filtros. keepPreviousData evita el temblor al filtrar. */
export function useCiudadesLista(filtros: FiltrosCiudades) {
  return useQuery({
    queryKey: queryKeys.ciudades.lista(filtros),
    queryFn: () => ciudadesService.listarCiudades(filtros),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

/** Regiones con su # de ciudades (para el filtro y el tab de regiones). */
export function useRegionesCatalogo() {
  return useQuery({
    queryKey: queryKeys.ciudades.regiones(),
    queryFn: () => ciudadesService.listarRegiones(),
    staleTime: 1000 * 60,
  });
}

// =============================================================================
// MUTACIONES (Fase 2) — invalidan toda la familia ['ciudades'] (lista + regiones)
// =============================================================================

function useInvalidarCiudades() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.ciudades.all() });
}

/** Alta de una ciudad. */
export function useCrearCiudad() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: (datos: CiudadAlta) => ciudadesService.crearCiudad(datos),
    onSuccess: () => { invalidar(); toast.exito('Ciudad agregada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo agregar la ciudad')),
  });
}

/** Alta de varias ciudades de un jalón (mapa). */
export function useCrearCiudadesMultiple() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ ciudades, regionId }: { ciudades: CiudadAlta[]; regionId?: string | null }) =>
      ciudadesService.crearCiudadesMultiple(ciudades, regionId),
    onSuccess: (r) => {
      invalidar();
      toast.exito(r.omitidas.length ? `${r.creadas} agregada(s); ${r.omitidas.length} ya existía(n)` : `${r.creadas} ciudad(es) agregada(s)`);
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron agregar las ciudades')),
  });
}

/** Editar una ciudad. */
export function useEditarCiudad() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DatosCiudadEditar }) => ciudadesService.editarCiudad(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Ciudad actualizada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la ciudad')),
  });
}

/** Activar/desactivar una ciudad. */
export function useCambiarActivaCiudad() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) => ciudadesService.cambiarActivaCiudad(id, activa),
    onSuccess: (r) => { invalidar(); toast.exito(r.activa ? 'Ciudad activada' : 'Ciudad desactivada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cambiar el estado de la ciudad')),
  });
}

/** Asignar/quitar región de una ciudad. */
export function useAsignarRegionCiudad() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ id, regionId }: { id: string; regionId: string | null }) => ciudadesService.asignarRegionCiudad(id, regionId),
    onSuccess: (_r, vars) => { invalidar(); toast.exito(vars.regionId ? 'Región asignada' : 'Región retirada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo asignar la región')),
  });
}

/** Agrupar varias ciudades en una región (mapa). */
export function useAsignarRegionMultiple() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ ciudadIds, regionId }: { ciudadIds: string[]; regionId: string | null }) =>
      ciudadesService.asignarRegionMultiple(ciudadIds, regionId),
    onSuccess: (r) => {
      invalidar();
      toast.exito(r.bloqueadas.length ? `${r.asignadas} agrupada(s); ${r.bloqueadas.length} bloqueada(s)` : `${r.asignadas} ciudad(es) agrupada(s)`);
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron agrupar las ciudades')),
  });
}

/** Crear una región. */
export function useCrearRegion() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: (nombre: string) => ciudadesService.crearRegion(nombre),
    onSuccess: () => { invalidar(); toast.exito('Región creada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo crear la región')),
  });
}

/** Editar una región (renombrar/activar/desactivar). */
export function useEditarRegion() {
  const invalidar = useInvalidarCiudades();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: { nombre?: string; activa?: boolean } }) => ciudadesService.editarRegion(id, datos),
    onSuccess: () => { invalidar(); toast.exito('Región actualizada'); },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar la región')),
  });
}
