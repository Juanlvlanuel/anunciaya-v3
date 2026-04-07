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
    mutationFn: (datos: CrearEmpleadoInput) => empleadosService.crearEmpleado(datos),

    onError: (_err) => {
      const mensaje = _err instanceof Error ? _err.message : 'Error al crear empleado';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.lista(sucursalId) });
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
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
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarEmpleadoInput }) =>
      empleadosService.actualizarEmpleado(id, datos),

    onMutate: async ({ id, datos }) => {
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
              empleados: page.empleados.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      ...datos,
                      permisos: {
                        ...e.permisos,
                        ...(datos.puedeRegistrarVentas !== undefined ? { puedeRegistrarVentas: datos.puedeRegistrarVentas } : {}),
                        ...(datos.puedeProcesarCanjes !== undefined ? { puedeProcesarCanjes: datos.puedeProcesarCanjes } : {}),
                        ...(datos.puedeVerHistorial !== undefined ? { puedeVerHistorial: datos.puedeVerHistorial } : {}),
                        ...(datos.puedeResponderChat !== undefined ? { puedeResponderChat: datos.puedeResponderChat } : {}),
                        ...(datos.puedeResponderResenas !== undefined ? { puedeResponderResenas: datos.puedeResponderResenas } : {}),
                      },
                    }
                  : e
              ),
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
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar empleado';
      notificar.error(mensaje);
    },

    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // Invalidar detalle si estaba cargado
      qc.invalidateQueries({ queryKey: queryKeys.empleados.detalle(id) });
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
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      empleadosService.toggleActivo(id, activo),

    onMutate: async ({ id, activo }) => {
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
              empleados: page.empleados.map((e) =>
                e.id === id ? { ...e, activo } : e
              ),
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
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
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
    mutationFn: (id: string) => empleadosService.eliminarEmpleado(id),

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

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
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
    mutationFn: ({ id, horarios }: { id: string; horarios: HorarioEmpleado[] }) =>
      empleadosService.actualizarHorarios(id, horarios),

    onError: (_err) => {
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar horarios';
      notificar.error(mensaje);
    },

    onSuccess: (_data, { id }) => {
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
    mutationFn: (id: string) => empleadosService.revocarSesion(id),

    onError: (_err) => {
      const mensaje = _err instanceof Error ? _err.message : 'Error al revocar sesión';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      notificar.exito('Sesión revocada');
    },
  });
}
