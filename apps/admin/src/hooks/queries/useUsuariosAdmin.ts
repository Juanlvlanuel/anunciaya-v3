/**
 * useUsuariosAdmin.ts
 * ====================
 * Hooks de React Query para la sección Usuarios del Panel (Fase 1 — lectura).
 * Patrón calcado de useNegociosAdmin: useQuery + keepPreviousData para no
 * parpadear al filtrar/paginar. Solo lecturas; las mutaciones (soporte +
 * moderación) llegan en la Fase 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useUsuariosAdmin.ts
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as usuariosService from '../../services/usuariosService';
import type { ParametrosLista, UsuarioExpediente } from '../../services/usuariosService';

/** Tabla paginada de usuarios (con filtros). */
export function useUsuariosLista(filtros: ParametrosLista) {
  return useQuery({
    queryKey: queryKeys.usuarios.lista(filtros),
    queryFn: () => usuariosService.listarUsuarios(filtros),
    placeholderData: keepPreviousData,
  });
}

/**
 * Expediente 360 de un usuario. Acepta un `placeholder` (datos parciales que ya
 * trae la fila de la lista) para que la ficha se vea AL INSTANTE y rellene el
 * resto cuando llega la respuesta — sin pantalla de "Cargando…".
 */
export function useUsuarioExpediente(id: string | null, placeholder?: UsuarioExpediente) {
  return useQuery({
    queryKey: queryKeys.usuarios.detalle(id ?? ''),
    queryFn: () => usuariosService.obtenerExpediente(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/**
 * Devuelve una función para PREFETCHEAR el expediente de un usuario (al pasar el
 * mouse o tocar la fila), de modo que al abrir la ficha los datos ya estén en caché.
 */
export function usePrefetchUsuario() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.usuarios.detalle(id),
        queryFn: () => usuariosService.obtenerExpediente(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}
