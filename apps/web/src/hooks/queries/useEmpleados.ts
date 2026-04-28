/**
 * useEmpleados.ts
 * ================
 * Hooks de React Query para el módulo Empleados de Business Studio.
 *
 * PATRÓN:
 *   - useQuery         → KPIs, detalle
 *   - useInfiniteQuery → lista con paginación offset-based (scroll infinito)
 *   - useMutation      → crear, actualizar, toggleActivo, eliminar, horarios, revocar sesión
 *
 * Ubicación: apps/web/src/hooks/queries/useEmpleados.ts
 */

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import * as empleadosService from '../../services/empleadosService';
import type {
  EmpleadoResumen,
  EmpleadoDetalle,
  CrearEmpleadoInput,
  ActualizarEmpleadoInput,
  HorarioEmpleado,
  PermisosEmpleado,
} from '../../types/empleados';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

const LIMIT = 20;

// =============================================================================
// TIPOS DE FILTROS (sin paginación — la maneja useInfiniteQuery)
// =============================================================================

export interface FiltrosEmpleadosUI {
  busqueda?: string;
  activo?: boolean;
}

// =============================================================================
// KPIs
// =============================================================================

export function useEmpleadosKPIs() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.empleados.kpis(sucursalId),
    queryFn: () => empleadosService.obtenerKPIs().then((r) => r.data ?? null),
    enabled: habilitado,
  });
}

// =============================================================================
// LISTA (paginación offset-based, scroll infinito)
// =============================================================================

export function useEmpleadosLista(filtros: FiltrosEmpleadosUI) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.empleados.lista(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      empleadosService
        .obtenerEmpleados({
          busqueda: filtros.busqueda || undefined,
          activo: filtros.activo,
          limit: LIMIT,
          offset: pageParam as number,
        })
        .then((r) => r.data ?? { empleados: [], total: 0 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.empleados.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.empleados.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// DETALLE
// =============================================================================

export function useEmpleadoDetalle(empleadoId: string | null) {
  return useQuery({
    queryKey: queryKeys.empleados.detalle(empleadoId ?? ''),
    queryFn: () =>
      empleadosService.obtenerDetalle(empleadoId!).then((r) => r.data ?? null),
    enabled: !!empleadoId,
  });
}

// =============================================================================
// MUTACIÓN: Crear empleado
// =============================================================================

export function useCrearEmpleado() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (datos: CrearEmpleadoInput) => {
      // El interceptor de axios (api.ts) convierte respuestas 4xx/5xx con formato
      // { success: false } en promesas resueltas. Debemos verificar manualmente
      // el flag `success` y hacer throw para que React Query ejecute onError.
      const res = await empleadosService.crearEmpleado(datos);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al crear empleado');
      }
      return res.data;
    },

    onError: (_err) => {
      const mensaje = _err instanceof Error ? _err.message : 'Error al crear empleado';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      // Invalidar con prefix (sin filtros) para que matchee todas las variantes de filtros en cache.
      // queryKeys.empleados.lista(sucursalId) incluiría `undefined` al final y no hace match con keys que tienen filtros.
      qc.invalidateQueries({ queryKey: ['empleados', 'lista', sucursalId] });
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // Invalidar solo el tab Empleados del reporte para que el nuevo empleado aparezca.
      // No tocamos los otros tabs (ventas/clientes/promociones/reseñas) porque no
      // muestran info dependiente del estado del empleado.
      qc.invalidateQueries({ queryKey: ['reportes', 'empleados'] });
      // Dropdown de operadores en Transacciones BS (refleja nombre del empleado)
      qc.invalidateQueries({ queryKey: queryKeys.transacciones.operadores(sucursalId) });
      notificar.exito('Empleado creado');
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar empleado (optimista en lista)
// =============================================================================

export function useActualizarEmpleado() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: ActualizarEmpleadoInput }) => {
      const res = await empleadosService.actualizarEmpleado(id, datos);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al actualizar empleado');
      }
      return res.data;
    },

    onMutate: async ({ id, datos }) => {
      // Cancelar fetches en vuelo de lista y detalle
      await qc.cancelQueries({ queryKey: ['empleados', 'lista', sucursalId] });
      await qc.cancelQueries({ queryKey: queryKeys.empleados.detalle(id) });

      // Snapshots para rollback
      const snapshotLista = qc.getQueriesData<{
        pages: { empleados: EmpleadoResumen[] }[];
      }>({ queryKey: ['empleados', 'lista', sucursalId] });
      const snapshotDetalle = qc.getQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id)
      );

      // Helper: permisos mergeados (solo los que vienen en datos)
      const permisosActualizados = <T extends { permisos?: unknown }>(old: T): PermisosEmpleado => {
        const permisosPrevios = (old.permisos ?? {}) as PermisosEmpleado;
        return {
          ...permisosPrevios,
          ...(datos.puedeRegistrarVentas !== undefined ? { puedeRegistrarVentas: datos.puedeRegistrarVentas } : {}),
          ...(datos.puedeProcesarCanjes !== undefined ? { puedeProcesarCanjes: datos.puedeProcesarCanjes } : {}),
          ...(datos.puedeVerHistorial !== undefined ? { puedeVerHistorial: datos.puedeVerHistorial } : {}),
          ...(datos.puedeResponderChat !== undefined ? { puedeResponderChat: datos.puedeResponderChat } : {}),
          ...(datos.puedeResponderResenas !== undefined ? { puedeResponderResenas: datos.puedeResponderResenas } : {}),
        };
      };

      // Actualización optimista de la LISTA
      qc.setQueriesData<{
        pages: { empleados: EmpleadoResumen[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['empleados', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              empleados: page.empleados.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      ...datos,
                      permisos: permisosActualizados(e),
                    }
                  : e
              ),
            })),
          };
        }
      );

      // Actualización optimista del DETALLE (el modal se refresca al instante)
      qc.setQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            ...datos,
            permisos: permisosActualizados(old),
          };
        }
      );

      return { snapshotLista, snapshotDetalle };
    },

    onError: (_err, { id }, context) => {
      // Restaurar lista
      if (context?.snapshotLista) {
        context.snapshotLista.forEach(([key, value]) => {
          qc.setQueryData(key, value);
        });
      }
      // Restaurar detalle
      if (context?.snapshotDetalle !== undefined) {
        qc.setQueryData(queryKeys.empleados.detalle(id), context.snapshotDetalle);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar empleado';
      notificar.error(mensaje);
    },

    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // Invalidar detalle para sincronizar con el servidor (updatedAt, etc.)
      qc.invalidateQueries({ queryKey: queryKeys.empleados.detalle(id) });
      // Invalidar solo el tab Empleados del reporte (el cambio de nombre solo afecta ahí)
      qc.invalidateQueries({ queryKey: ['reportes', 'empleados'] });
      // Dropdown de operadores en Transacciones BS (nombre del empleado puede cambiar)
      qc.invalidateQueries({ queryKey: queryKeys.transacciones.operadores(sucursalId) });
    },
  });
}

// =============================================================================
// MUTACIÓN: Toggle activo (optimista)
// =============================================================================

export function useToggleEmpleadoActivo() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const res = await empleadosService.toggleActivo(id, activo);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al cambiar estado del empleado');
      }
      return res.data;
    },

    onMutate: async ({ id, activo }) => {
      // Cancelamos los fetches en vuelo tanto de la lista como del detalle
      // para que no pisen nuestra actualización optimista.
      await qc.cancelQueries({ queryKey: ['empleados', 'lista', sucursalId] });
      await qc.cancelQueries({ queryKey: queryKeys.empleados.detalle(id) });

      // Snapshot de la lista (para rollback en onError)
      const snapshotLista = qc.getQueriesData<{
        pages: { empleados: EmpleadoResumen[] }[];
      }>({ queryKey: ['empleados', 'lista', sucursalId] });

      // Snapshot del detalle (para rollback en onError)
      const snapshotDetalle = qc.getQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id)
      );

      // Actualización optimista de la LISTA
      qc.setQueriesData<{
        pages: { empleados: EmpleadoResumen[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['empleados', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              empleados: page.empleados.map((e) =>
                e.id === id ? { ...e, activo } : e
              ),
            })),
          };
        }
      );

      // Actualización optimista del DETALLE (para que el modal muestre el nuevo estado al instante)
      qc.setQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id),
        (old) => (old ? { ...old, activo } : old)
      );

      return { snapshotLista, snapshotDetalle };
    },

    onError: (_err, { id }, context) => {
      // Restaurar lista
      if (context?.snapshotLista) {
        context.snapshotLista.forEach(([key, value]) => {
          qc.setQueryData(key, value);
        });
      }
      // Restaurar detalle
      if (context?.snapshotDetalle !== undefined) {
        qc.setQueryData(queryKeys.empleados.detalle(id), context.snapshotDetalle);
      }
    },

    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // Invalidar la lista con filtros: re-fetch para que el empleado aparezca/desaparezca
      // según el filtro activo (Activos/Inactivos/Todos). La actualización optimista solo
      // cambia el campo `activo`, pero no mueve al empleado entre listas filtradas.
      qc.invalidateQueries({ queryKey: ['empleados', 'lista', sucursalId] });
      // Invalidar el detalle para que el modal se sincronice con el servidor
      // (trae por ej. updatedAt actualizado, además del activo)
      qc.invalidateQueries({ queryKey: queryKeys.empleados.detalle(id) });
      // Invalidar solo el tab Empleados del reporte (el badge "Inactivo" solo aparece ahí)
      qc.invalidateQueries({ queryKey: ['reportes', 'empleados'] });
      // Dropdown de operadores en Transacciones BS (puede filtrar por estado activo)
      qc.invalidateQueries({ queryKey: queryKeys.transacciones.operadores(sucursalId) });
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar empleado (optimista)
// =============================================================================

export function useEliminarEmpleado() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await empleadosService.eliminarEmpleado(id);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al eliminar empleado');
      }
      return res.data;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['empleados', 'lista', sucursalId] });

      const snapshot = qc.getQueriesData<{
        pages: { empleados: EmpleadoResumen[] }[];
      }>({ queryKey: ['empleados', 'lista', sucursalId] });

      qc.setQueriesData<{
        pages: { empleados: EmpleadoResumen[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['empleados', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              empleados: page.empleados.filter((e) => e.id !== id),
            })),
          };
        }
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([key, value]) => {
          qc.setQueryData(key, value);
        });
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al eliminar empleado';
      notificar.error(mensaje);
    },

    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // Removemos el detalle de la cache (el empleado ya no existe operativamente)
      // para evitar que el modal muestre datos stale si se vuelve a abrir.
      qc.removeQueries({ queryKey: queryKeys.empleados.detalle(id) });
      // Invalidar solo el tab Empleados del reporte (el badge "Inactivo" solo aparece ahí)
      qc.invalidateQueries({ queryKey: ['reportes', 'empleados'] });
      // Dropdown de operadores en Transacciones BS (el empleado eliminado desaparece)
      qc.invalidateQueries({ queryKey: queryKeys.transacciones.operadores(sucursalId) });
      notificar.exito('Empleado eliminado');
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar horarios
// =============================================================================

export function useActualizarHorarios() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, horarios }: { id: string; horarios: HorarioEmpleado[] }) => {
      const res = await empleadosService.actualizarHorarios(id, horarios);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al actualizar horarios');
      }
      return res.data;
    },

    onMutate: async ({ id, horarios }) => {
      // Cancelar fetch en vuelo del detalle para que no pise nuestra actualización optimista
      await qc.cancelQueries({ queryKey: queryKeys.empleados.detalle(id) });

      // Snapshot del detalle para rollback
      const snapshotDetalle = qc.getQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id)
      );

      // Actualización optimista del detalle (el modal muestra los nuevos horarios al instante)
      qc.setQueryData<EmpleadoDetalle | null>(
        queryKeys.empleados.detalle(id),
        (old) => (old ? { ...old, horarios } : old)
      );

      return { snapshotDetalle };
    },

    onError: (_err, { id }, context) => {
      // Restaurar detalle si la mutación falla
      if (context?.snapshotDetalle !== undefined) {
        qc.setQueryData(queryKeys.empleados.detalle(id), context.snapshotDetalle);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar horarios';
      notificar.error(mensaje);
    },

    onSuccess: (_data, { id }) => {
      // Invalidar para sincronizar con el servidor (updatedAt, etc.)
      qc.invalidateQueries({ queryKey: queryKeys.empleados.detalle(id) });
      notificar.exito('Horarios actualizados');
    },
  });
}

// =============================================================================
// MUTACIÓN: Revocar sesión
// =============================================================================

export function useRevocarSesion() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await empleadosService.revocarSesion(id);
      if (!res.success) {
        throw new Error((res as unknown as { error?: string }).error ?? res.message ?? 'Error al revocar sesión');
      }
      return res.data;
    },

    onError: (_err) => {
      const mensaje = _err instanceof Error ? _err.message : 'Error al revocar sesión';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      notificar.exito('Sesión revocada');
    },
  });
}
