/**
 * useUsuariosAdmin.ts
 * ====================
 * Hooks de React Query para la sección Usuarios del Panel (Fase 1 — lectura).
 * Patrón calcado de useNegociosAdmin: useQuery + keepPreviousData para no
 * parpadear al filtrar/paginar. Solo lecturas; las mutaciones (soporte +
 * moderación) llegan en la Fase 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useUsuariosAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as usuariosService from '../../services/usuariosService';
import type { ParametrosLista, UsuarioExpediente } from '../../services/usuariosService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Tabla paginada de usuarios (con filtros). */
export function useUsuariosLista(filtros: ParametrosLista) {
  return useQuery({
    queryKey: queryKeys.usuarios.lista(filtros),
    queryFn: () => usuariosService.listarUsuarios(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de usuarios del alcance (badge del menú). Carga al abrir el Panel. */
export function useConteoUsuarios() {
  return useQuery({
    queryKey: queryKeys.usuarios.conteo(),
    queryFn: () => usuariosService.contarUsuarios(),
    staleTime: 1000 * 60,
  });
}

/** Desglose de usuarios por ciudad (métrica + opciones del filtro de ciudad). */
export function useUsuariosPorCiudad() {
  return useQuery({
    queryKey: queryKeys.usuarios.porCiudad(),
    queryFn: () => usuariosService.usuariosPorCiudad(),
    staleTime: 1000 * 60 * 5, // cambia poco
  });
}

/**
 * Expediente 360 de un usuario. Acepta un `placeholder` (datos parciales que ya
 * trae la fila de la lista) para que la ficha se vea AL INSTANTE y rellene el
 * resto cuando llega la respuesta — sin pantalla de "Cargando…".
 */
export function useUsuarioExpediente(id: string | null, placeholder?: UsuarioExpediente) {
  return useQuery({
    queryKey: queryKeys.usuarios.detalle(id ?? ''),
    queryFn: () => usuariosService.obtenerExpediente(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/**
 * Devuelve una función para PREFETCHEAR el expediente de un usuario (al pasar el
 * mouse o tocar la fila), de modo que al abrir la ficha los datos ya estén en caché.
 */
export function usePrefetchUsuario() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.usuarios.detalle(id),
        queryFn: () => usuariosService.obtenerExpediente(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

// =============================================================================
// MUTACIONES (Fase 2) — refrescan lista + expediente e informan por toast
// =============================================================================

/** Invalida la lista (todas las variantes) y el expediente del usuario afectado. */
function useRefrescarUsuario() {
  const qc = useQueryClient();
  return (id: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    qc.invalidateQueries({ queryKey: queryKeys.usuarios.detalle(id) });
  };
}

/** Soporte: desbloquear intentos fallidos. */
export function useDesbloquearIntentos() {
  const refrescar = useRefrescarUsuario();
  return useMutation({
    mutationFn: (id: string) => usuariosService.desbloquearIntentos(id),
    onSuccess: (_d, id) => {
      refrescar(id);
      toast.exito('Cuenta desbloqueada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo desbloquear la cuenta')),
  });
}

/** Soporte: generar código de acceso (crear/restablecer contraseña). El código se muestra en un modal
 *  para dictarlo, así que NO hay toast de éxito (el modal es el feedback). */
export function useGenerarCodigoAcceso() {
  const refrescar = useRefrescarUsuario();
  return useMutation({
    mutationFn: (id: string) => usuariosService.generarCodigoAcceso(id),
    onSuccess: (_res, id) => {
      refrescar(id);
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo generar el código de acceso')),
  });
}

/** Soporte: corregir el correo de la cuenta (reenvía el código al correo nuevo). */
export function useCambiarCorreoUsuario() {
  const refrescar = useRefrescarUsuario();
  return useMutation({
    mutationFn: ({ id, correoNuevo }: { id: string; correoNuevo: string }) =>
      usuariosService.cambiarCorreoUsuario(id, correoNuevo),
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

/** Moderación (solo super): suspender. */
export function useSuspenderUsuario() {
  const refrescar = useRefrescarUsuario();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => usuariosService.suspenderUsuario(id, motivo),
    onSuccess: (_d, { id }) => {
      refrescar(id);
      toast.exito('Cuenta suspendida');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo suspender la cuenta')),
  });
}

/** Moderación (solo super): reactivar. */
export function useReactivarUsuario() {
  const refrescar = useRefrescarUsuario();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => usuariosService.reactivarUsuario(id, motivo),
    onSuccess: (_d, { id }) => {
      refrescar(id);
      toast.exito('Cuenta reactivada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar la cuenta')),
  });
}
