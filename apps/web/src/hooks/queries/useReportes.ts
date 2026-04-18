/**
 * useReportes.ts
 * ===============
 * Hooks React Query para el módulo Reportes (Business Studio).
 * Todos los hooks reciben fechaInicio/fechaFin como rango universal.
 *
 * Ubicación: apps/web/src/hooks/queries/useReportes.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import * as reportesService from '../../services/reportesService';
import type {
  ReporteVentas,
  ReporteClientes,
  ReporteEmpleados,
  ReportePromociones,
  ReporteResenas,
  ClienteInactivo,
  TipoDetallePromocion,
  DetalleOferta,
  DetalleCupon,
  DetalleRecompensa,
} from '../../services/reportesService';

// ─── Guard estándar ────────────────────────────────────────────────────────

function useGuardComercial() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';
  return { sucursalId, habilitado };
}

// ─── Hooks por pestaña ─────────────────────────────────────────────────────

export function useReporteVentas(fechaInicio: string, fechaFin: string) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: queryKeys.reportes.tab(sucursalId, 'ventas', `${fechaInicio}_${fechaFin}`),
    queryFn: () =>
      reportesService.getReporte<ReporteVentas>('ventas', undefined, fechaInicio, fechaFin).then((r) => r.data ?? null),
    enabled: habilitado && !!fechaInicio,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReporteClientes(fechaInicio: string, fechaFin: string) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: queryKeys.reportes.tab(sucursalId, 'clientes', `${fechaInicio}_${fechaFin}`),
    queryFn: () =>
      reportesService.getReporte<ReporteClientes>('clientes', undefined, fechaInicio, fechaFin).then((r) => r.data ?? null),
    enabled: habilitado && !!fechaInicio,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReporteEmpleados(fechaInicio: string, fechaFin: string) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: queryKeys.reportes.tab(sucursalId, 'empleados', `${fechaInicio}_${fechaFin}`),
    queryFn: () =>
      reportesService.getReporte<ReporteEmpleados>('empleados', undefined, fechaInicio, fechaFin).then((r) => r.data ?? null),
    enabled: habilitado && !!fechaInicio,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportePromociones(fechaInicio: string, fechaFin: string) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: queryKeys.reportes.tab(sucursalId, 'promociones', `${fechaInicio}_${fechaFin}`),
    queryFn: () =>
      reportesService.getReporte<ReportePromociones>('promociones', undefined, fechaInicio, fechaFin).then((r) => r.data ?? null),
    enabled: habilitado && !!fechaInicio,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientesInactivos(tipo: 'riesgo' | 'inactivos', habilitar: boolean) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: ['reportes', 'clientes-inactivos', sucursalId, tipo],
    queryFn: () =>
      reportesService.getClientesInactivos(tipo).then((r) => (r.data ?? []) as ClienteInactivo[]),
    enabled: habilitado && habilitar,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDetallePromocion(tipo: TipoDetallePromocion, habilitar: boolean) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: ['reportes', 'detalle-promocion', sucursalId, tipo],
    queryFn: () =>
      reportesService.getDetallePromocion(tipo).then((r) => (r.data ?? []) as (DetalleOferta[] | DetalleCupon[] | DetalleRecompensa[])),
    enabled: habilitado && habilitar,
    staleTime: 2 * 60 * 1000,
  });
}

export function useReporteResenas(fechaInicio: string, fechaFin: string) {
  const { sucursalId, habilitado } = useGuardComercial();

  return useQuery({
    queryKey: queryKeys.reportes.tab(sucursalId, 'resenas', `${fechaInicio}_${fechaFin}`),
    queryFn: () =>
      reportesService.getReporte<ReporteResenas>('resenas', undefined, fechaInicio, fechaFin).then((r) => r.data ?? null),
    enabled: habilitado && !!fechaInicio,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}
