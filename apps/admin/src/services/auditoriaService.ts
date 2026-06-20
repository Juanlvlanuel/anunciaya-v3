/**
 * auditoriaService.ts
 * ===================
 * Llamadas a la API del Panel para la sección Auditoría = la BITÁCORA DE ACCIONES del
 * equipo (quién hizo qué y cuándo). Solo lectura. Reusa el axios del Panel (`api`), que
 * ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/auditoria          → bitácora paginada (filtros)
 *   GET /admin/auditoria/actores  → actores presentes (para el filtro "por persona")
 *   GET /admin/auditoria/:id      → detalle de un registro (snapshots + motivo)
 *
 * Ubicación: apps/admin/src/services/auditoriaService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS (camelCase — el backend ya transforma snake → camel)
// =============================================================================

export type OrdenAuditoria = 'fecha_recientes' | 'fecha_antiguos';

export interface AuditoriaFila {
  id: string;
  fecha: string | null;
  actorId: string | null;
  actorNombre: string | null;
  actorRol: string | null;
  accion: string;
  entidadTipo: string;
  entidadId: string | null;
  /** Nombre del negocio cuando entidad_tipo='negocio'; null para otros tipos. */
  entidadNombre: string | null;
  motivo: string | null;
}

export interface ListaAuditoria {
  items: AuditoriaFila[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface AuditoriaDetalle {
  id: string;
  fecha: string | null;
  actorId: string | null;
  actorNombre: string | null;
  actorCorreo: string | null;
  actorRol: string | null;
  accion: string;
  entidadTipo: string;
  entidadId: string | null;
  entidadNombre: string | null;
  /** Snapshot antes de la acción (estructura libre — depende de la acción). */
  datosPrevios: Record<string, unknown> | null;
  /** Snapshot después de la acción. */
  datosNuevos: Record<string, unknown> | null;
  motivo: string | null;
}

export interface ActorAuditoria {
  id: string;
  nombre: string | null;
  rol: string | null;
}

export interface ParametrosAuditoria {
  actorId?: string;
  accion?: string;
  entidadTipo?: string;
  entidadId?: string;
  desde?: string;
  hasta?: string;
  orden?: OrdenAuditoria;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarAuditoria(params: ParametrosAuditoria): Promise<ListaAuditoria> {
  const { data } = await api.get<RespuestaAPI<ListaAuditoria>>('/admin/auditoria', { params });
  return data.data ?? { items: [], total: 0, pagina: params.pagina, porPagina: params.porPagina };
}

export async function obtenerDetalleAuditoria(id: string): Promise<AuditoriaDetalle | null> {
  const { data } = await api.get<RespuestaAPI<AuditoriaDetalle>>(`/admin/auditoria/${id}`);
  return data.data ?? null;
}

export async function listarActores(): Promise<ActorAuditoria[]> {
  const { data } = await api.get<RespuestaAPI<ActorAuditoria[]>>('/admin/auditoria/actores');
  return data.data ?? [];
}
