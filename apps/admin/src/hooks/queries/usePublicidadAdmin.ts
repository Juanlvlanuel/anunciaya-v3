/**
 * usePublicidadAdmin.ts
 * =====================
 * Hooks de React Query para la sección Publicidad del Panel (módulo 7) — lectura.
 * keepPreviousData para no parpadear al filtrar/paginar. Sin mutaciones aún (las
 * acciones —alta manual, cortesía, pausar/cancelar— llegan en Fase 2).
 *
 * Ubicación: apps/admin/src/hooks/queries/usePublicidadAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as publicidadService from '../../services/publicidadService';
import type { ParametrosPublicidad, PublicidadDetalle, AltaManualInput, EdicionAnuncioInput, Carrusel } from '../../services/publicidadService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Tabla paginada (con filtros). */
export function usePublicidad(filtros: ParametrosPublicidad) {
  return useQuery({
    queryKey: queryKeys.publicidad.lista(filtros),
    queryFn: () => publicidadService.listarPublicidad(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total del alcance (contador del menú). */
export function useConteoPublicidad() {
  return useQuery({
    queryKey: queryKeys.publicidad.conteo(),
    queryFn: () => publicidadService.contarPublicidad(),
  });
}

/** KPIs de la cabecera (activos · ingresos · clics · por vencer). Refresco suave. */
export function useKpisPublicidad() {
  return useQuery({
    queryKey: queryKeys.publicidad.kpis(),
    queryFn: () => publicidadService.obtenerKpisPublicidad(),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });
}

/**
 * Ficha de una compra. Acepta un `placeholder` (los datos que ya trae la fila) para que el
 * modal se vea AL INSTANTE y rellene el resto (piezas, ciudades, pago) al llegar la respuesta.
 */
export function useDetallePublicidad(id: string | null, placeholder?: PublicidadDetalle) {
  return useQuery({
    queryKey: queryKeys.publicidad.detalle(id ?? ''),
    queryFn: () => publicidadService.obtenerDetallePublicidad(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/** Prefetch de la ficha (hover/touch) → modal instantáneo. */
export function usePrefetchPublicidad() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.publicidad.detalle(id),
        queryFn: () => publicidadService.obtenerDetallePublicidad(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

// =============================================================================
// MUTACIONES (Fase 2) — refrescan la lista + la ficha y avisan con toast
// =============================================================================

/** Pausa un anuncio (activa → pausada). super + gerente (su región, lo blinda el backend). */
export function usePausarPublicidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publicidadService.pausarPublicidad(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
      toast.exito('Anuncio pausado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo pausar el anuncio')),
  });
}

/** Reactiva un anuncio pausado (si no venció). super + gerente. */
export function useReactivarPublicidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publicidadService.reactivarPublicidad(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
      toast.exito('Anuncio reactivado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar el anuncio')),
  });
}

/** Edita un anuncio (ciudades · carruseles · imágenes). No toca el cobro. super + gerente. */
export function useEditarPublicidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EdicionAnuncioInput }) => publicidadService.editarPublicidad(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
      toast.exito('Anuncio actualizado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo editar el anuncio')),
  });
}

/** Cancela un anuncio (irreversible). Solo super (lo blinda la ruta). */
export function useCancelarPublicidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string | null }) => publicidadService.cancelarPublicidad(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
      toast.exito('Anuncio cancelado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cancelar el anuncio')),
  });
}

// =============================================================================
// ALTA MANUAL (Fase 2)
// =============================================================================

/** Opciones del formulario (precios base + reglas). Cambian poco → staleTime largo. */
export function useOpcionesPublicidad() {
  return useQuery({
    queryKey: ['publicidad', 'opciones'],
    queryFn: () => publicidadService.obtenerOpcionesPublicidad(),
    staleTime: 1000 * 60 * 10,
  });
}

/** Catálogo de ciudades para el selector. */
export function useCiudadesPublicidad() {
  return useQuery({
    queryKey: ['publicidad', 'ciudades-catalogo'],
    queryFn: () => publicidadService.listarCiudadesPublicidad(),
    staleTime: 1000 * 60 * 30,
  });
}

/** Desglose del precio según carruseles + #ciudades + meses (en vivo en el formulario). */
export function usePrecioPublicidad(carruseles: Carrusel[], ciudades: number, meses = 1) {
  return useQuery({
    queryKey: ['publicidad', 'precio', carruseles.slice().sort().join(','), ciudades, meses],
    queryFn: () => publicidadService.obtenerPrecioPublicidad(carruseles, ciudades, meses),
    enabled: carruseles.length > 0 && ciudades > 0,
    placeholderData: keepPreviousData,
  });
}

/** Alta manual de un anuncio. Refresca la lista al terminar. */
export function useCrearAnuncioManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AltaManualInput) => publicidadService.crearAnuncioManual(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
      toast.exito('Anuncio registrado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo registrar el anuncio')),
  });
}
