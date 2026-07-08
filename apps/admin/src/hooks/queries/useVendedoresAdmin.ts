/**
 * useVendedoresAdmin.ts
 * =====================
 * Hooks de React Query para la sección "Vendedores y comisiones" del Panel — pieza A: la CARTERA
 * (Fase 1 · VER, solo lectura). Patrón calcado de useEquipoAdmin: useQuery + keepPreviousData para
 * no parpadear al filtrar/paginar; ficha con placeholder + prefetch en hover.
 *
 * Ubicación: apps/admin/src/hooks/queries/useVendedoresAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as vendedoresService from '../../services/vendedoresService';
import type { ParametrosVendedores, ParametrosCartera, VendedorDetalle, RegistrarPagoInput, DatosCobroInput, MovimientoEfectivoInput } from '../../services/vendedoresService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Tabla paginada de la red de ventas (con filtros). */
export function useVendedoresLista(filtros: ParametrosVendedores) {
  return useQuery({
    queryKey: queryKeys.vendedores.lista(filtros),
    queryFn: () => vendedoresService.listarVendedores(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de vendedores del alcance (badge del menú). `enabled` lo gatea por rol. */
export function useConteoVendedores(enabled = true) {
  return useQuery({
    queryKey: queryKeys.vendedores.conteo(),
    queryFn: () => vendedoresService.contarVendedores(),
    staleTime: 1000 * 60,
    enabled,
  });
}

/**
 * Ficha de un vendedor. Acepta un `placeholder` (lo que ya trae la fila de la lista) para que la
 * ficha se vea AL INSTANTE y rellene el resto cuando llega la respuesta.
 */
export function useVendedor(id: string | null, placeholder?: VendedorDetalle) {
  return useQuery({
    queryKey: queryKeys.vendedores.detalle(id ?? ''),
    queryFn: () => vendedoresService.obtenerVendedor(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/** Prefetch de la ficha de un vendedor (al pasar el mouse o tocar la fila). */
export function usePrefetchVendedor() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.vendedores.detalle(id),
        queryFn: () => vendedoresService.obtenerVendedor(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/** Cartera de un vendedor (sus negocios atribuidos, con estado de membresía). */
export function useCartera(id: string | null, filtros: ParametrosCartera) {
  return useQuery({
    queryKey: queryKeys.vendedores.cartera(id ?? '', filtros),
    queryFn: () => vendedoresService.listarCartera(id as string, filtros),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

/** Estado de cuenta de comisiones de un vendedor (devengado / pagado / pendiente). */
export function useComisionesVendedor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendedores.comisiones(id ?? ''),
    queryFn: () => vendedoresService.listarComisiones(id as string),
    enabled: !!id,
  });
}

// =============================================================================
// LIQUIDACIÓN (pieza E)
// =============================================================================

/** Bitácora de pagos hechos al vendedor. */
export function usePagosVendedor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendedores.pagos(id ?? ''),
    queryFn: () => vendedoresService.listarPagos(id as string),
    enabled: !!id,
  });
}

/** Datos de cobro del vendedor (super + el propio vendedor). */
export function useDatosCobro(id: string | null, habilitado = true) {
  return useQuery({
    queryKey: queryKeys.vendedores.datosCobro(id ?? ''),
    queryFn: () => vendedoresService.obtenerDatosCobro(id as string),
    enabled: !!id && habilitado,
  });
}

/** Registrar un pago (solo super): refresca pagos + comisiones (quedan pagadas) + efectivo (neteo) + lista. */
export function useRegistrarPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: RegistrarPagoInput }) => vendedoresService.registrarPago(id, datos),
    onSuccess: (d, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.pagos(id) });
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.comisiones(id) });
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.efectivo(id) });
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.all() });
      const comp = d?.compensado ?? 0;
      toast.exito(comp > 0 ? `Abono registrado · se descontaron $${comp.toLocaleString('es-MX')} de efectivo` : 'Abono registrado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo registrar el pago')),
  });
}

/** Guardar/editar los datos de cobro del vendedor. */
export function useGuardarDatosCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DatosCobroInput }) => vendedoresService.guardarDatosCobro(id, datos),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.datosCobro(id) });
      toast.exito('Datos de cobro guardados');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron guardar los datos de cobro')),
  });
}

// =============================================================================
// EFECTIVO POR ENTREGAR (pieza D)
// =============================================================================

/** Corte de efectivo del vendedor (super + gerente + el propio vendedor). */
export function useEfectivoVendedor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendedores.efectivo(id ?? ''),
    queryFn: () => vendedoresService.obtenerEfectivo(id as string),
    enabled: !!id,
  });
}

/** Registrar un cobro/entrega de efectivo (super + gerente): refresca el corte + la lista. */
export function useRegistrarMovimientoEfectivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: MovimientoEfectivoInput }) => vendedoresService.registrarMovimientoEfectivo(id, datos),
    onSuccess: (_d, { id, datos }) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.efectivo(id) });
      qc.invalidateQueries({ queryKey: queryKeys.vendedores.all() });
      toast.exito(datos.tipo === 'cobro' ? 'Cobro registrado' : 'Entrega registrada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo registrar el movimiento')),
  });
}
