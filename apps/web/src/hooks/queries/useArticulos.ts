/**
 * useArticulos.ts
 * ================
 * Hooks de React Query para el módulo Catálogo de Business Studio.
 *
 * PATRÓN:
 *   - useQuery    → lista de artículos por sucursal
 *   - useMutation → crear, actualizar, eliminar, duplicar (todos con update optimista)
 *
 * Ubicación: apps/web/src/hooks/queries/useArticulos.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as articulosService from '../../services/articulosService';
import type {
  Articulo,
  CrearArticuloInput,
  ActualizarArticuloInput,
  DuplicarArticuloInput,
} from '../../types/articulos';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// LISTA DE ARTÍCULOS
// =============================================================================

export function useArticulosLista() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.articulos.porSucursal(sucursalId),
    queryFn: () =>
      articulosService.obtenerArticulos().then((r) => r.data ?? []),
    enabled: habilitado,
    // keepPreviousData: filtros son locales (useState), pero suaviza el cambio de sucursal
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// MUTACIÓN: Crear artículo (optimista)
// =============================================================================

export function useCrearArticulo() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (datos: CrearArticuloInput) => articulosService.crearArticulo(datos),

    onMutate: async (datos) => {
      await qc.cancelQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId)
      );

      const articuloTemporal: Articulo = {
        id: `temp-${Date.now()}`,
        negocioId: '',
        tipo: datos.tipo,
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        categoria: datos.categoria || 'General',
        precioBase: datos.precioBase.toString(),
        precioDesde: datos.precioDesde ?? false,
        imagenPrincipal: datos.imagenPrincipal || null,
        disponible: datos.disponible ?? true,
        destacado: datos.destacado ?? false,
        orden: 0,
        totalVentas: 0,
        totalVistas: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      qc.setQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId),
        (old) => (old ? [articuloTemporal, ...old] : [articuloTemporal])
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.articulos.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al crear artículo';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });
      notificar.exito('Artículo creado correctamente');
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar artículo (optimista)
// =============================================================================

export function useActualizarArticulo() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarArticuloInput }) =>
      articulosService.actualizarArticulo(id, datos),

    onMutate: async ({ id, datos }) => {
      await qc.cancelQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId)
      );

      qc.setQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId),
        (old) =>
          old?.map((art) =>
            art.id === id
              ? {
                  ...art,
                  ...datos,
                  precioBase: datos.precioBase
                    ? datos.precioBase.toString()
                    : art.precioBase,
                  updatedAt: new Date().toISOString(),
                }
              : art
          ) ?? []
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.articulos.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar artículo';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar artículo (optimista)
// =============================================================================

export function useEliminarArticulo() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => articulosService.eliminarArticulo(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId)
      );

      qc.setQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId),
        (old) => old?.filter((art) => art.id !== id) ?? []
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.articulos.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al eliminar artículo';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });
      notificar.exito('Artículo eliminado correctamente');
    },
  });
}

// =============================================================================
// MUTACIÓN: Duplicar artículo a otras sucursales (optimista parcial)
// =============================================================================

export function useDuplicarArticulo() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DuplicarArticuloInput }) =>
      articulosService.duplicarArticulo(id, datos),

    onMutate: async ({ id, datos }) => {
      const duplicaEnSucursalActual = datos.sucursalesIds.includes(sucursalId);
      if (!duplicaEnSucursalActual) return { snapshot: undefined, tempId: undefined };

      await qc.cancelQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Articulo[]>(
        queryKeys.articulos.porSucursal(sucursalId)
      );

      const articuloOriginal = snapshot?.find((art) => art.id === id);
      const tempId = `temp-${Date.now()}`;

      if (articuloOriginal) {
        qc.setQueryData<Articulo[]>(
          queryKeys.articulos.porSucursal(sucursalId),
          (old) =>
            old
              ? [
                  {
                    ...articuloOriginal,
                    id: tempId,
                    totalVentas: 0,
                    totalVistas: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...old,
                ]
              : old
        );
      }

      return { snapshot, tempId };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.articulos.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al duplicar artículo';
      notificar.error(mensaje);
    },

    onSuccess: (respuesta, { datos }) => {
      // Invalidar caché de TODAS las sucursales destino
      datos.sucursalesIds.forEach((sid) => {
        qc.invalidateQueries({ queryKey: queryKeys.articulos.porSucursal(sid) });
      });
      // También invalidar la sucursal actual por si acaso
      qc.invalidateQueries({ queryKey: queryKeys.articulos.porSucursal(sucursalId) });
      notificar.exito('Artículo duplicado');
    },
  });
}
