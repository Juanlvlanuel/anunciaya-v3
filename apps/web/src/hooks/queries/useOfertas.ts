/**
 * useOfertas.ts
 * ==============
 * Hooks de React Query para el módulo Promociones de Business Studio.
 *
 * PATRÓN:
 *   - useQuery    → lista de ofertas por sucursal
 *   - useMutation → crear, actualizar, eliminar, duplicar (todos con update optimista)
 *
 * Ubicación: apps/web/src/hooks/queries/useOfertas.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as ofertasService from '../../services/ofertasService';
import type {
  Oferta,
  CrearOfertaInput,
  ActualizarOfertaInput,
  DuplicarOfertaInput,
} from '../../types/ofertas';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// LISTA DE OFERTAS
// =============================================================================

export function useOfertasLista() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.ofertas.porSucursal(sucursalId),
    queryFn: () =>
      ofertasService.obtenerOfertas().then((r) => r.data ?? []),
    enabled: habilitado,
    // keepPreviousData: filtros son locales (useState), pero suaviza el cambio de sucursal
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// INVALIDAR CACHÉ (para operaciones inline que no son mutaciones formales)
// =============================================================================
// Invalida todas las caches que muestran ofertas del negocio/sucursal:
// - ofertas.porSucursal: lista del módulo Promociones BS
// - dashboard.campanas: panel "Ofertas" del Dashboard BS (lista)
// - dashboard.kpis: badge "Ofertas Activas" del Dashboard BS (contador)
// - ['negocios', 'ofertas', sucursalId]: sección pública del detalle del negocio
// - ['reportes', 'promociones']: tab de promociones del módulo Reportes BS
// No invalida cupones.lista(usuarioId) porque es cache del cliente receptor
// (otra sesión) — solo se resolvería con WebSocket push.

export function useOfertasInvalidar() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.campanas(sucursalId) });
    qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] });
    qc.invalidateQueries({ queryKey: ['negocios', 'ofertas', sucursalId] });
    qc.invalidateQueries({ queryKey: ['reportes', 'promociones'] });
    qc.invalidateQueries({ queryKey: queryKeys.ofertasFeed.all() });
  };

  const actualizarLocal = (actualizador: (ofertas: Oferta[]) => Oferta[]) => {
    qc.setQueryData<Oferta[]>(
      queryKeys.ofertas.porSucursal(sucursalId),
      (old) => (old ? actualizador(old) : old)
    );
  };

  return { invalidar, actualizarLocal };
}

// =============================================================================
// MUTACIÓN: Crear oferta (optimista)
// =============================================================================

/**
 * Invalida todas las caches que muestran ofertas del negocio (usado por las
 * 4 mutaciones del módulo). Mismas keys que `useOfertasInvalidar`, extraído
 * como helper sin hook para poder llamarlo dentro de onSuccess/onError.
 */
function invalidarOfertasRelacionadas(
  qc: ReturnType<typeof useQueryClient>,
  sucursalId: string
) {
  qc.invalidateQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.campanas(sucursalId) });
  qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] });
  qc.invalidateQueries({ queryKey: ['negocios', 'ofertas', sucursalId] });
  qc.invalidateQueries({ queryKey: ['reportes', 'promociones'] });
  qc.invalidateQueries({ queryKey: queryKeys.ofertasFeed.all() });
}

export function useCrearOferta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (datos: CrearOfertaInput) => ofertasService.crearOferta(datos),

    onMutate: async (datos) => {
      await qc.cancelQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId)
      );

      const ofertaTemporal: Oferta = {
        id: `temp-${Date.now()}`,
        negocioId: '',
        sucursalId: '',
        articuloId: datos.articuloId || null,
        titulo: datos.titulo,
        descripcion: datos.descripcion || null,
        tipo: datos.tipo,
        valor: datos.valor?.toString() || null,
        compraMinima: (datos.compraMinima || 0).toString(),
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        limiteUsos: datos.limiteUsos || null,
        limiteUsosPorUsuario: datos.limiteUsosPorUsuario || null,
        usosActuales: 0,
        activo: datos.activo ?? true,
        visibilidad: datos.visibilidad || 'publico',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalVistas: 0,
        totalShares: 0,
        totalClicks: 0,
        imagen: datos.imagen || null,
        estado: 'activa',
      };

      qc.setQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId),
        (old) => (old ? [ofertaTemporal, ...old] : [ofertaTemporal])
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.ofertas.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al crear oferta';
      notificar.error(mensaje);
    },

    onSuccess: (respuesta, datos) => {
      invalidarOfertasRelacionadas(qc, sucursalId);
      notificar.exito(datos.visibilidad === 'privado' ? 'Cupón enviado exitosamente' : 'Oferta creada correctamente');
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar oferta (optimista)
// =============================================================================

export function useActualizarOferta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarOfertaInput }) =>
      ofertasService.actualizarOferta(id, datos),

    onMutate: async ({ id, datos }) => {
      await qc.cancelQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId)
      );

      qc.setQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId),
        (old) =>
          old?.map((of) =>
            of.id === id
              ? {
                  ...of,
                  ...datos,
                  valor: datos.valor !== undefined
                    ? (datos.valor?.toString() || null)
                    : of.valor,
                  compraMinima: datos.compraMinima !== undefined
                    ? datos.compraMinima.toString()
                    : of.compraMinima,
                  updatedAt: new Date().toISOString(),
                }
              : of
          ) ?? []
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.ofertas.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al actualizar oferta';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      invalidarOfertasRelacionadas(qc, sucursalId);
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar oferta (optimista)
// =============================================================================

export function useEliminarOferta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ofertasService.eliminarOferta(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId)
      );

      // Guardar visibilidad antes de eliminar (para mensaje en onSuccess)
      const esCupon = snapshot?.find((of) => of.id === id)?.visibilidad === 'privado';

      qc.setQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId),
        (old) => old?.filter((of) => of.id !== id) ?? []
      );

      return { snapshot, esCupon };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.ofertas.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al eliminar oferta';
      notificar.error(mensaje);
    },

    onSuccess: (_data, _id, context) => {
      invalidarOfertasRelacionadas(qc, sucursalId);
      notificar.exito(context?.esCupon ? 'Cupón eliminado correctamente' : 'Oferta eliminada correctamente');
    },
  });
}

// =============================================================================
// MUTACIÓN: Duplicar oferta a otras sucursales (optimista parcial)
// =============================================================================

export function useDuplicarOferta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DuplicarOfertaInput }) =>
      ofertasService.duplicarOferta(id, datos),

    onMutate: async ({ id, datos }) => {
      const duplicaEnSucursalActual = datos.sucursalesIds.includes(sucursalId);
      if (!duplicaEnSucursalActual) return { snapshot: undefined };

      await qc.cancelQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });

      const snapshot = qc.getQueryData<Oferta[]>(
        queryKeys.ofertas.porSucursal(sucursalId)
      );

      const ofertaOriginal = snapshot?.find((of) => of.id === id);

      if (ofertaOriginal) {
        qc.setQueryData<Oferta[]>(
          queryKeys.ofertas.porSucursal(sucursalId),
          (old) =>
            old
              ? [
                  {
                    ...ofertaOriginal,
                    id: `temp-${Date.now()}`,
                    usosActuales: 0,
                    totalVistas: 0,
                    totalShares: 0,
                    totalClicks: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...old,
                ]
              : old
        );
      }

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.ofertas.porSucursal(sucursalId), context.snapshot);
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al duplicar oferta';
      notificar.error(mensaje);
    },

    onSuccess: (_respuesta, { datos }) => {
      // Invalidar ofertas.porSucursal para cada sucursal destino
      datos.sucursalesIds.forEach((sid) => {
        qc.invalidateQueries({ queryKey: queryKeys.ofertas.porSucursal(sid) });
      });
      // Invalidar el resto de caches (propias de la sucursal actual)
      invalidarOfertasRelacionadas(qc, sucursalId);
      notificar.exito('Oferta duplicada');
    },
  });
}

// =============================================================================
// QUERY: Clientes asignados a una oferta/cupón (para modal edición)
// =============================================================================

export function useClientesAsignados(ofertaId: string | null) {
  return useQuery({
    queryKey: queryKeys.ofertas.clientesAsignados(ofertaId ?? ''),
    queryFn: () =>
      ofertasService.obtenerClientesAsignados(ofertaId!).then((r) => r.data ?? []),
    enabled: !!ofertaId,
  });
}
