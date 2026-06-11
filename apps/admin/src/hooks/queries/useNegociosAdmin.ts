/**
 * useNegociosAdmin.ts
 * ====================
 * Hooks de React Query para la sección Negocios del Panel (Entrega 1 — lectura).
 * Patrón calcado de apps/web (useQuery + keepPreviousData para no parpadear al
 * filtrar/paginar). Solo lecturas; las mutaciones llegan en la Entrega 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useNegociosAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as negociosService from '../../services/negociosService';
import type { ParametrosLista, NegocioDetalle } from '../../services/negociosService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/**
 * Avisa el resultado de una acción que toca Stripe (§4.3): éxito normal si Stripe se
 * completó, o ADVERTENCIA visible si el cambio en BD se aplicó pero Stripe NO se cortó/
 * pausó (para que el admin lo corrija a mano). Nunca se entierra en un log.
 */
function avisarResultado(res: { advertenciaStripe: string | null }, mensajeExito: string) {
  if (res.advertenciaStripe) {
    toast.advertencia(`${mensajeExito}. ${res.advertenciaStripe} Revísalo a mano en Stripe.`);
  } else {
    toast.exito(mensajeExito);
  }
}

/** Tabla paginada de negocios (con filtros). */
export function useNegociosLista(filtros: ParametrosLista) {
  return useQuery({
    queryKey: queryKeys.negocios.lista(filtros),
    queryFn: () => negociosService.listarNegocios(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de negocios del alcance (contador del menú). Se refresca al cambiar de región
 *  (useFiltroRegion invalida `negocios.all()`) y al alta/baja de un negocio. */
export function useConteoNegocios() {
  return useQuery({
    queryKey: queryKeys.negocios.conteo(),
    queryFn: () => negociosService.contarNegocios(),
    staleTime: 1000 * 60,
  });
}

/**
 * Ficha administrativa de un negocio. Acepta un `placeholder` (datos parciales
 * que ya trae la fila de la lista) para que el modal se vea AL INSTANTE y rellene
 * el resto cuando llega la respuesta — sin pantalla de "Cargando…".
 */
export function useNegocioDetalle(id: string | null, placeholder?: NegocioDetalle) {
  return useQuery({
    queryKey: queryKeys.negocios.detalle(id ?? ''),
    queryFn: () => negociosService.obtenerDetalleNegocio(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/**
 * Devuelve una función para PREFETCHEAR la ficha de un negocio (al pasar el mouse
 * o tocar la fila), de modo que al abrir el modal los datos ya estén en caché.
 */
export function usePrefetchNegocio() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.negocios.detalle(id),
        queryFn: () => negociosService.obtenerDetalleNegocio(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/**
 * Vendedores para el filtro "por vendedor". Solo superadmin/gerente lo usan; el
 * vendedor ve únicamente su cartera, así que se deshabilita para ese rol.
 */
export function useVendedoresFiltro(habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.vendedores(),
    queryFn: () => negociosService.listarVendedoresFiltro(),
    enabled: habilitado,
    staleTime: 1000 * 60 * 10, // cambia poco
  });
}

/** Ciudades para el filtro "por ciudad" (dentro del alcance del rol). */
export function useCiudadesFiltro() {
  return useQuery({
    queryKey: queryKeys.negocios.ciudades(),
    queryFn: () => negociosService.listarCiudades(),
    staleTime: 1000 * 60 * 10, // cambia poco
  });
}

/** Catálogo de ciudades (por región) para el SELECTOR del alta manual. */
export function useCatalogoCiudades(habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.catalogoCiudades(),
    queryFn: () => negociosService.catalogoCiudades(),
    enabled: habilitado,
    staleTime: 1000 * 60 * 10, // catálogo, cambia poco
  });
}

/** Historial de pagos de membresía de un negocio (ficha del método manual). */
export function usePagosNegocio(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.pagos(id),
    queryFn: () => negociosService.listarPagosNegocio(id),
    enabled: habilitado,
    staleTime: 1000 * 60,
  });
}

/** Sucursales de un negocio (al expandir la fila). `habilitado` = solo se pide al abrir. */
export function useSucursalesNegocio(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.sucursales(id),
    queryFn: () => negociosService.listarSucursalesNegocio(id),
    enabled: habilitado,
    staleTime: 1000 * 60 * 5,
  });
}

/** Detalle de una sucursal (modal). `placeholder` muestra el modal al instante. */
export function useSucursalDetalle(
  id: string | null,
  sucursalId: string | null,
  placeholder?: negociosService.SucursalDetalle,
) {
  return useQuery({
    queryKey: queryKeys.negocios.sucursal(id ?? '', sucursalId ?? ''),
    queryFn: () => negociosService.obtenerDetalleSucursal(id as string, sucursalId as string),
    enabled: !!id && !!sucursalId,
    placeholderData: placeholder,
  });
}

// =============================================================================
// MUTACIONES (Entrega 2 · Parada 1) — refrescan tabla + ficha e informan por toast
// =============================================================================

/** Invalida la lista (todas las variantes) y la ficha del negocio afectado. */
function useRefrescarNegocio() {
  const qc = useQueryClient();
  return (id: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.negocios.all() });
    qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(id) });
  };
}

export function useSuspenderNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      negociosService.suspenderNegocio(id, motivo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía pausada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo pausar la membresía')),
  });
}

export function useReactivarNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      negociosService.reactivarNegocio(id, motivo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía reactivada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar la membresía')),
  });
}

export function useReasignarVendedor() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, embajadorId, motivo }: { id: string; embajadorId: string | null; motivo?: string }) =>
      negociosService.reasignarVendedor(id, embajadorId, motivo),
    onSuccess: (_d, { id, embajadorId }) => {
      refrescar(id);
      toast.exito(embajadorId ? 'Vendedor reasignado' : 'Vendedor quitado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reasignar el vendedor')),
  });
}

/** Marcar pagado (SOLO superadmin). Con suscripción empuja el próximo cobro a `hasta`. */
export function useMarcarPagado() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: (vars: { id: string } & negociosService.DatosMarcarPagado) =>
      negociosService.marcarPagado(vars.id, { hasta: vars.hasta, concepto: vars.concepto, monto: vars.monto, meses: vars.meses }),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía marcada como pagada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo marcar como pagada')),
  });
}

/** Cancelar (SOLO superadmin · motivo obligatorio). Corta Stripe + degrada al dueño. */
export function useCancelarNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      negociosService.cancelarNegocio(id, motivo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Negocio cancelado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cancelar el negocio')),
  });
}

/**
 * Cambiar el correo del dueño (rescate de alta manual). Distingue el resultado del reenvío:
 * éxito si el código salió al nuevo correo; ADVERTENCIA si el correo cambió pero el código no
 * se pudo enviar (el admin debe reintentar — el dueño sigue sin recibirlo).
 */
export function useCambiarCorreoDueno() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, correoNuevo }: { id: string; correoNuevo: string }) =>
      negociosService.cambiarCorreoDueno(id, correoNuevo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      if (res.correoEnviado) {
        toast.exito('Correo actualizado y código enviado al nuevo correo.');
      } else {
        toast.advertencia('Correo actualizado, pero el código no se pudo enviar. Reinténtalo.');
      }
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cambiar el correo')),
  });
}

/** Editar una fila del historial de pagos (concepto/monto/meses). Invalida historial + ficha +
 *  lista (corregir los meses puede trasladar la vigencia del negocio). */
export function useEditarPago() {
  const qc = useQueryClient();
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ negocioId, pagoId, datos }: { negocioId: string; pagoId: string; datos: negociosService.DatosEditarPago }) =>
      negociosService.editarPagoMembresia(negocioId, pagoId, datos),
    onSuccess: (_d, { negocioId }) => {
      refrescar(negocioId);
      qc.invalidateQueries({ queryKey: queryKeys.negocios.pagos(negocioId) });
      toast.exito('Pago actualizado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo actualizar el pago')),
  });
}

/** Alta MANUAL de un negocio en efectivo/transferencia (sin Stripe). Refresca la lista. */
export function useAltaManualNegocio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: negociosService.DatosAltaManual) => negociosService.altaManualNegocio(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.negocios.all() });
      toast.exito('Negocio registrado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo registrar el negocio')),
  });
}
