/**
 * useCardYA.ts
 * =============
 * Hooks de React Query para la sección CardYA (Sistema de Lealtad).
 *
 * PATRÓN:
 *   - useQuery    → billeteras, recompensas, vouchers, historial
 *   - useMutation → canjear recompensa (optimista), cancelar voucher (optimista)
 *
 * NOTA: CardYA solo funciona en MODO PERSONAL.
 *
 * Ubicación: apps/web/src/hooks/queries/useCardYA.ts
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { escucharEvento } from '../../services/socketService';
import * as cardyaService from '../../services/cardyaService';
import type {
  BilleteraNegocio,
  RecompensaDisponible,
  CanjearRecompensaInput,
  Voucher,
  FiltrosVouchers,
  FiltrosHistorialCompras,
  FiltrosHistorialCanjes,
} from '../../types/cardya';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// BILLETERAS (puntos por negocio)
// =============================================================================

export function useCardYABilleteras() {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!usuarioId && modoActivo === 'personal';

  return useQuery({
    queryKey: queryKeys.cardya.billeteras(usuarioId),
    queryFn: () => cardyaService.getMisPuntos().then((r) => r.data ?? []),
    enabled: habilitado,
  });
}

// =============================================================================
// RECOMPENSAS DISPONIBLES (con ciudad del GPS)
// =============================================================================

export function useCardYARecompensas(negocioId?: string) {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const ciudad = useGpsStore((s) => s.ciudad?.nombre);
  const habilitado = !!usuarioId && modoActivo === 'personal';

  const filtros = { negocioId, ciudad: negocioId ? undefined : ciudad };

  return useQuery({
    queryKey: ['cardya', 'recompensas', filtros] as const,
    queryFn: () => cardyaService.getRecompensas(filtros).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// VOUCHERS
// =============================================================================

export function useCardYAVouchers(filtros?: FiltrosVouchers) {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!usuarioId && modoActivo === 'personal';

  return useQuery({
    queryKey: ['cardya', 'vouchers', filtros] as const,
    queryFn: () => cardyaService.getMisVouchers(filtros).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// HISTORIAL COMPRAS
// =============================================================================

export function useCardYAHistorialCompras(filtros?: FiltrosHistorialCompras) {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!usuarioId && modoActivo === 'personal';

  return useQuery({
    queryKey: ['cardya', 'historialCompras', filtros] as const,
    queryFn: () => cardyaService.getHistorialCompras(filtros).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// HISTORIAL CANJES
// =============================================================================

export function useCardYAHistorialCanjes(filtros?: FiltrosHistorialCanjes) {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!usuarioId && modoActivo === 'personal';

  return useQuery({
    queryKey: ['cardya', 'historialCanjes', filtros] as const,
    queryFn: () => cardyaService.getHistorialCanjes(filtros).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// MUTACIÓN: Canjear recompensa (optimista)
// =============================================================================

export function useCanjearRecompensa() {
  const qc = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');

  return useMutation({
    mutationFn: (datos: CanjearRecompensaInput) =>
      cardyaService.canjearRecompensa(datos),

    onMutate: async (datos) => {
      // Cancelar queries activas
      await qc.cancelQueries({ queryKey: queryKeys.cardya.billeteras(usuarioId) });
      await qc.cancelQueries({ queryKey: ['cardya', 'recompensas'] });

      // Snapshots
      const snapshotBilleteras = qc.getQueryData<BilleteraNegocio[]>(
        queryKeys.cardya.billeteras(usuarioId)
      );
      const snapshotRecompensas = qc.getQueriesData<RecompensaDisponible[]>({
        queryKey: ['cardya', 'recompensas'],
      });

      // Encontrar recompensa
      let recompensa: RecompensaDisponible | undefined;
      snapshotRecompensas.forEach(([, data]) => {
        const found = data?.find((r) => r.id === datos.recompensaId);
        if (found) recompensa = found;
      });

      if (recompensa) {
        const esGratis = recompensa.tipo === 'compras_frecuentes' && recompensa.requierePuntos === false;
        const puntosADescontar = esGratis ? 0 : recompensa.puntosRequeridos;

        // Optimista: descontar puntos
        if (puntosADescontar > 0) {
          qc.setQueryData<BilleteraNegocio[]>(
            queryKeys.cardya.billeteras(usuarioId),
            (old) => old?.map((b) =>
              b.negocioId === recompensa!.negocioId
                ? { ...b, puntosDisponibles: b.puntosDisponibles - puntosADescontar }
                : b
            ) ?? []
          );
        }
      }

      return { snapshotBilleteras, snapshotRecompensas };
    },

    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.snapshotBilleteras !== undefined) {
        qc.setQueryData(queryKeys.cardya.billeteras(usuarioId), context.snapshotBilleteras);
      }
      if (context?.snapshotRecompensas) {
        context.snapshotRecompensas.forEach(([key, value]) => {
          qc.setQueryData(key, value);
        });
      }
      const mensaje = _err instanceof Error ? _err.message : 'Error al canjear recompensa';
      notificar.error(mensaje);
    },

    onSuccess: () => {
      // Invalidar todo lo relacionado
      qc.invalidateQueries({ queryKey: queryKeys.cardya.billeteras(usuarioId) });
      qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
      qc.invalidateQueries({ queryKey: ['cardya', 'vouchers'] });
      notificar.exito('¡Recompensa canjeada exitosamente!');
    },
  });
}

// =============================================================================
// MUTACIÓN: Cancelar voucher (optimista)
// =============================================================================

export function useCancelarVoucher() {
  const qc = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');

  return useMutation({
    mutationFn: (id: string) => cardyaService.cancelarVoucher(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['cardya', 'vouchers'] });

      const snapshotVouchers = qc.getQueriesData<Voucher[]>({
        queryKey: ['cardya', 'vouchers'],
      });

      // Encontrar voucher para saber los puntos
      let voucherCancelado: Voucher | undefined;
      snapshotVouchers.forEach(([, data]) => {
        const found = data?.find((v) => v.id === id);
        if (found) voucherCancelado = found;
      });

      // Optimista: marcar como cancelado
      qc.setQueriesData<Voucher[]>(
        { queryKey: ['cardya', 'vouchers'] },
        (old) => old?.map((v) => v.id === id ? { ...v, estado: 'cancelado' as const } : v) ?? []
      );

      // Optimista: regresar puntos
      if (voucherCancelado && voucherCancelado.puntosUsados > 0) {
        qc.setQueryData<BilleteraNegocio[]>(
          queryKeys.cardya.billeteras(usuarioId),
          (old) => old?.map((b) =>
            b.negocioId === voucherCancelado!.negocioId
              ? { ...b, puntosDisponibles: b.puntosDisponibles + voucherCancelado!.puntosUsados }
              : b
          ) ?? []
        );
      }

      return { snapshotVouchers, voucherCancelado };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshotVouchers) {
        context.snapshotVouchers.forEach(([key, value]) => {
          qc.setQueryData(key, value);
        });
      }
      notificar.error('Error al cancelar voucher');
    },

    onSuccess: (_data, _id, context) => {
      const puntos = context?.voucherCancelado?.puntosUsados ?? 0;
      notificar.exito(puntos > 0
        ? `Voucher cancelado. Se devolvieron ${puntos.toLocaleString()} puntos`
        : 'Voucher cancelado'
      );
      qc.invalidateQueries({ queryKey: queryKeys.cardya.billeteras(usuarioId) });
      qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
      qc.invalidateQueries({ queryKey: ['cardya', 'vouchers'] });
    },
  });
}

// =============================================================================
// LISTENER SOCKET — actualización de stock en tiempo real
// =============================================================================

export function useCardYASocket() {
  const qc = useQueryClient();

  useEffect(() => {
    const detener = escucharEvento<{ recompensaId: string; nuevoStock: number }>(
      'recompensa:stock-actualizado',
      () => {
        qc.invalidateQueries({ queryKey: ['cardya', 'recompensas'] });
      }
    );
    return detener;
  }, [qc]);
}
