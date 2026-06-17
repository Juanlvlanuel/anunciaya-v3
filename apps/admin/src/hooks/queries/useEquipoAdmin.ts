/**
 * useEquipoAdmin.ts
 * ==================
 * Hooks de React Query para la sección "Equipo y accesos" del Panel (lecturas + mutaciones).
 * Patrón calcado de useUsuariosAdmin: useQuery + keepPreviousData para no parpadear al
 * filtrar/paginar. Las mutaciones (alta de vendedor/gerente, editar datos, reasignar región,
 * revocar/reactivar acceso) ya están implementadas.
 *
 * Ubicación: apps/admin/src/hooks/queries/useEquipoAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as equipoService from '../../services/equipoService';
import type { ParametrosLista, MiembroEquipo, DatosAltaVendedor, DatosAltaGerente, DatosEditar } from '../../services/equipoService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Tabla paginada del equipo (con filtros). */
export function useEquipoLista(filtros: ParametrosLista) {
  return useQuery({
    queryKey: queryKeys.equipo.lista(filtros),
    queryFn: () => equipoService.listarEquipo(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de cuentas de equipo del alcance (badge del menú). Carga al abrir el Panel. */
export function useConteoEquipo() {
  return useQuery({
    queryKey: queryKeys.equipo.conteo(),
    queryFn: () => equipoService.contarEquipo(),
    staleTime: 1000 * 60,
  });
}

/**
 * Ficha de un miembro del equipo. Acepta un `placeholder` (lo que ya trae la fila de la lista)
 * para que la ficha se vea AL INSTANTE y rellene el resto cuando llega la respuesta.
 */
export function useMiembroEquipo(id: string | null, placeholder?: MiembroEquipo) {
  return useQuery({
    queryKey: queryKeys.equipo.detalle(id ?? ''),
    queryFn: () => equipoService.obtenerMiembro(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/**
 * Devuelve una función para PREFETCHEAR la ficha de un miembro (al pasar el mouse o tocar la
 * fila), de modo que al abrirla los datos ya estén en caché.
 */
export function usePrefetchMiembro() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.equipo.detalle(id),
        queryFn: () => equipoService.obtenerMiembro(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/** Catálogo de ciudades para el selector del wizard (acotado por región en el backend). */
export function useCiudadesEquipo(regionId: string | undefined, habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.equipo.ciudades(regionId),
    queryFn: () => equipoService.listarCiudades(regionId),
    enabled: habilitado,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================================================
// MUTACIONES (Fase 2) — refrescan la lista + la ficha e informan por toast
// =============================================================================

/** Invalida la lista (todas las variantes) y, si se da, la ficha del miembro afectado. */
function useRefrescarEquipo() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.equipo.all() });
    if (id) qc.invalidateQueries({ queryKey: queryKeys.equipo.detalle(id) });
  };
}

/** Alta de vendedor (crear o promover). */
export function useAltaVendedor() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: (datos: DatosAltaVendedor) => equipoService.altaVendedor(datos),
    onSuccess: (res) => {
      refrescar();
      const base = res?.promovido ? 'Cuenta promovida a vendedor' : 'Vendedor dado de alta';
      toast.exito(res && !res.promovido && !res.correoEnviado ? `${base} (el correo no se pudo enviar)` : base);
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo dar de alta al vendedor')),
  });
}

/** Revocar el acceso de un vendedor. */
export function useRevocarAcceso() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: (id: string) => equipoService.revocarAcceso(id),
    onSuccess: (_d, id) => {
      refrescar(id);
      toast.exito('Acceso revocado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo revocar el acceso')),
  });
}

/** Reactivar a un vendedor o gerente revocado. */
export function useReactivarAcceso() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: (id: string) => equipoService.reactivarAcceso(id),
    onSuccess: (_d, id) => {
      refrescar(id);
      toast.exito('Acceso reactivado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar el acceso')),
  });
}

/** Alta de gerente (crear o promover). */
export function useAltaGerente() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: (datos: DatosAltaGerente) => equipoService.altaGerente(datos),
    onSuccess: (res) => {
      refrescar();
      toast.exito(res?.promovido ? 'Cuenta promovida a gerente' : 'Gerente dado de alta');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo dar de alta al gerente')),
  });
}

/** Corregir datos de la cuenta de un miembro. */
export function useEditarDatos() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: DatosEditar }) => equipoService.editarDatos(id, datos),
    onSuccess: (res, { id }) => {
      refrescar(id);
      if (res.correoEnviado) toast.exito('Datos actualizados · código reenviado al nuevo correo');
      else toast.exito('Datos actualizados');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron actualizar los datos')),
  });
}

/** Reasignar la región de un gerente. */
export function useReasignarRegion() {
  const refrescar = useRefrescarEquipo();
  return useMutation({
    mutationFn: ({ id, regionId }: { id: string; regionId: string }) => equipoService.reasignarRegion(id, regionId),
    onSuccess: (_d, { id }) => {
      refrescar(id);
      toast.exito('Región reasignada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reasignar la región')),
  });
}
