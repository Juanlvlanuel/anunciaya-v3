/**
 * usePuntos.ts
 * =============
 * Hooks de React Query para el módulo Puntos de Business Studio.
 *
 * PATRÓN:
 *   - useQuery    → configuración (global), recompensas (global), estadísticas (por sucursal+periodo)
 *   - useMutation → actualizar config, CRUD recompensas (todos con update optimista)
 *
 * NOTA: Configuración y Recompensas son GLOBALES por negocio.
 *       Solo Estadísticas se filtran por sucursal (vía interceptor Axios).
 *
 * Ubicación: apps/web/src/hooks/queries/usePuntos.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as puntosService from '../../services/puntosService';
import type {
  ConfigPuntosCompleta,
  ActualizarConfigPuntosInput,
  Recompensa,
  CrearRecompensaInput,
  ActualizarRecompensaInput,
  PeriodoEstadisticas,
} from '../../types/puntos';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// CONFIGURACIÓN (global por negocio)
// =============================================================================

export function usePuntosConfiguracion() {
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.puntos.configuracion(),
    queryFn: () =>
      puntosService.getConfiguracion().then((r) => r.data ?? null),
    enabled: habilitado,
  });
}

// =============================================================================
// RECOMPENSAS (global por negocio)
// =============================================================================

export function usePuntosRecompensas() {
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.puntos.recompensas(),
    queryFn: () =>
      puntosService.getRecompensas().then((r) => r.data ?? []),
    enabled: habilitado,
  });
}

// =============================================================================
// ESTADÍSTICAS (filtradas por sucursal + periodo)
// =============================================================================

export function usePuntosEstadisticas(periodo: PeriodoEstadisticas) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.puntos.estadisticas(sucursalId, periodo),
    queryFn: () =>
      puntosService.getEstadisticas(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// MUTACIÓN: Actualizar configuración (optimista)
// =============================================================================

export function useActualizarConfigPuntos() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (datos: ActualizarConfigPuntosInput) =>
      puntosService.updateConfiguracion(datos),

    onMutate: async (datos) => {
      await qc.cancelQueries({ queryKey: queryKeys.puntos.configuracion() });

      const snapshot = qc.getQueryData<ConfigPuntosCompleta | null>(
        queryKeys.puntos.configuracion()
      );

      if (snapshot) {
        const optimista: ConfigPuntosCompleta = {
          ...snapshot,
          puntosPorPeso: datos.puntosPorPeso ?? snapshot.puntosPorPeso,
          diasExpiracionPuntos: datos.diasExpiracionPuntos !== undefined
            ? datos.diasExpiracionPuntos
            : snapshot.diasExpiracionPuntos,
          diasExpiracionVoucher: datos.diasExpiracionVoucher ?? snapshot.diasExpiracionVoucher,
          nivelesActivos: datos.nivelesActivos ?? snapshot.nivelesActivos,
          nivelBronce: {
            ...snapshot.nivelBronce,
            ...(datos.nivelBronceMin !== undefined && { min: datos.nivelBronceMin }),
            ...(datos.nivelBronceMax !== undefined && { max: datos.nivelBronceMax }),
            ...(datos.nivelBronceMultiplicador !== undefined && { multiplicador: datos.nivelBronceMultiplicador }),
          },
          nivelPlata: {
            ...snapshot.nivelPlata,
            ...(datos.nivelPlataMin !== undefined && { min: datos.nivelPlataMin }),
            ...(datos.nivelPlataMax !== undefined && { max: datos.nivelPlataMax }),
            ...(datos.nivelPlataMultiplicador !== undefined && { multiplicador: datos.nivelPlataMultiplicador }),
          },
          nivelOro: {
            ...snapshot.nivelOro,
            ...(datos.nivelOroMin !== undefined && { min: datos.nivelOroMin }),
            ...(datos.nivelOroMultiplicador !== undefined && { multiplicador: datos.nivelOroMultiplicador }),
          },
        };

        qc.setQueryData(queryKeys.puntos.configuracion(), optimista);
      }

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.puntos.configuracion(), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al guardar configuración';
      notificar.error(mensaje);
    },

    onSuccess: (respuesta) => {
      // Usar respuesta del backend como source of truth
      if (respuesta.data) {
        qc.setQueryData(queryKeys.puntos.configuracion(), respuesta.data);
      }
      // Cambiar rangos de niveles (bronce/plata/oro) hace que el backend
      // recalcule el nivelActual de los clientes existentes. Invalidamos las
      // caches de clientes para que los detalles, la lista, los KPIs
      // (distribucionNivel) y el selector de cupones muestren el nivel
      // actualizado de inmediato.
      qc.invalidateQueries({ queryKey: ['clientes', 'detalle'] });
      qc.invalidateQueries({ queryKey: ['clientes', 'lista', sucursalId] });
      qc.invalidateQueries({ queryKey: queryKeys.clientes.kpis(sucursalId) });
      qc.invalidateQueries({ queryKey: queryKeys.clientes.selector(sucursalId) });
      // Tab de clientes del módulo Reportes (distribución por nivel)
      qc.invalidateQueries({ queryKey: ['reportes', 'clientes'] });
    },
  });
}

// =============================================================================
// MUTACIÓN: Crear recompensa (optimista)
// =============================================================================

export function useCrearRecompensa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (datos: CrearRecompensaInput) =>
      puntosService.createRecompensa(datos),

    onMutate: async (datos) => {
      await qc.cancelQueries({ queryKey: queryKeys.puntos.recompensas() });

      const snapshot = qc.getQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas()
      );

      const recompensaTemporal: Recompensa = {
        id: `temp_${Date.now()}`,
        negocioId: '',
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        imagenUrl: datos.imagenUrl ?? null,
        puntosRequeridos: datos.puntosRequeridos,
        stock: datos.stock ?? null,
        requiereAprobacion: datos.requiereAprobacion ?? false,
        activa: true,
        orden: snapshot?.length ?? 0,
        tipo: datos.tipo ?? 'basica',
        numeroComprasRequeridas: datos.numeroComprasRequeridas ?? null,
        requierePuntos: datos.requierePuntos ?? true,
        canjesRealizados: 0,
        clientesActivos: 0,
        desbloqueos: 0,
        createdAt: null,
        updatedAt: null,
      };

      qc.setQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas(),
        (old) => (old ? [...old, recompensaTemporal] : [recompensaTemporal])
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.puntos.recompensas(), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al crear recompensa';
      notificar.error(mensaje);
    },

    onSuccess: (respuesta) => {
      if (respuesta.data) {
        // Reemplazar temporal con dato real del backend
        qc.setQueryData<Recompensa[]>(
          queryKeys.puntos.recompensas(),
          (old) => old?.map((r) => r.id.startsWith('temp_') ? respuesta.data! : r) ?? []
        );
      }
      // CardYA (modo personal) usa una query key distinta para las mismas
      // recompensas del negocio. Invalidamos para que si el dueño cambia a
      // modo personal para probar su propia recompensa, la vea al instante.
      qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
      notificar.exito('Recompensa creada');
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar recompensa (optimista)
// =============================================================================

export function useActualizarRecompensa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarRecompensaInput }) =>
      puntosService.updateRecompensa(id, datos),

    onMutate: async ({ id, datos }) => {
      await qc.cancelQueries({ queryKey: queryKeys.puntos.recompensas() });

      const snapshot = qc.getQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas()
      );

      qc.setQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas(),
        (old) =>
          old?.map((r) => {
            if (r.id !== id) return r;
            return {
              ...r,
              ...(datos.nombre !== undefined && { nombre: datos.nombre }),
              ...(datos.descripcion !== undefined && { descripcion: datos.descripcion }),
              ...(datos.imagenUrl !== undefined && { imagenUrl: datos.imagenUrl }),
              ...(datos.eliminarImagen && { imagenUrl: null }),
              ...(datos.puntosRequeridos !== undefined && { puntosRequeridos: datos.puntosRequeridos }),
              ...(datos.stock !== undefined && { stock: datos.stock }),
              ...(datos.requiereAprobacion !== undefined && { requiereAprobacion: datos.requiereAprobacion }),
              ...(datos.activa !== undefined && { activa: datos.activa }),
            };
          }) ?? []
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.puntos.recompensas(), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar recompensa';
      notificar.error(mensaje);
    },

    onSuccess: (respuesta, { id }) => {
      // Reemplazar con dato real del backend
      if (respuesta.data) {
        qc.setQueryData<Recompensa[]>(
          queryKeys.puntos.recompensas(),
          (old) => old?.map((r) => r.id === id ? respuesta.data! : r) ?? []
        );
      }
      // Sincronizar cache de CardYA (modo personal)
      qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar recompensa (optimista)
// =============================================================================

export function useEliminarRecompensa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => puntosService.deleteRecompensa(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.puntos.recompensas() });

      const snapshot = qc.getQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas()
      );

      qc.setQueryData<Recompensa[]>(
        queryKeys.puntos.recompensas(),
        (old) => old?.filter((r) => r.id !== id) ?? []
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.puntos.recompensas(), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al eliminar recompensa';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      // Sincronizar cache de CardYA (modo personal)
      qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
      notificar.exito('Recompensa eliminada');
    },
  });
}
