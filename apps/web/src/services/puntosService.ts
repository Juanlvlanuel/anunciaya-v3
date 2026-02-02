/**
 * ============================================================================
 * PUNTOS SERVICE - Llamadas API
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/puntosService.ts
 *
 * PROPÓSITO:
 * Funcionalidades del módulo Puntos en Business Studio:
 *   - Configuración del sistema de puntos (global por negocio)
 *   - CRUD de recompensas (globales por negocio)
 *   - Estadísticas KPIs (filtradas por sucursal automáticamente)
 *
 * ⚡ sucursalId NO se pasa manualmente.
 *    El interceptor Axios lo agrega automáticamente en modo comercial.
 *    Backend ignora el filtro en Configuración y Recompensas (son globales).
 *    Solo Estadísticas responde al filtro de sucursal.
 */

import { get, post, put, del } from './api';
import type {
  ConfigPuntosCompleta,
  ActualizarConfigPuntosInput,
  Recompensa,
  CrearRecompensaInput,
  ActualizarRecompensaInput,
  EstadisticasPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';

// =============================================================================
// CONFIGURACIÓN DE PUNTOS (Global por negocio)
// =============================================================================

/**
 * Obtiene la configuración de puntos del negocio.
 * GET /api/puntos/configuracion
 *
 * Si no existe configuración en BD, el backend retorna valores por defecto.
 */
export async function getConfiguracion() {
  return get<ConfigPuntosCompleta>('/puntos/configuracion');
}

/**
 * Actualiza la configuración de puntos del negocio.
 * PUT /api/puntos/configuracion
 *
 * Solo dueños pueden editar. Gerentes reciben 403.
 *
 * @param datos - Campos a actualizar (todos opcionales, estructura flat)
 */
export async function updateConfiguracion(datos: ActualizarConfigPuntosInput) {
  return put<ConfigPuntosCompleta>('/puntos/configuracion', datos);
}

// =============================================================================
// RECOMPENSAS (Globales por negocio)
// =============================================================================

/**
 * Obtiene todas las recompensas del negocio.
 * GET /api/puntos/recompensas?soloActivas=true
 *
 * @param soloActivas - Si es true, solo retorna recompensas activas
 */
export async function getRecompensas(soloActivas?: boolean) {
  const params = soloActivas ? '?soloActivas=true' : '';
  return get<Recompensa[]>(`/puntos/recompensas${params}`);
}

/**
 * Obtiene una recompensa específica por ID.
 * GET /api/puntos/recompensas/:id
 *
 * @param id - UUID de la recompensa
 */
export async function getRecompensaPorId(id: string) {
  return get<Recompensa>(`/puntos/recompensas/${id}`);
}

/**
 * Crea una nueva recompensa.
 * POST /api/puntos/recompensas
 *
 * Solo dueños pueden crear. Gerentes reciben 403.
 *
 * FLUJO DE IMAGEN:
 *   1. Frontend sube imagen a Cloudinary primero
 *   2. Frontend envía la URL resultante en datos.imagenUrl
 *   3. Backend solo guarda la URL en BD
 *
 * @param datos - Datos de la nueva recompensa
 */
export async function createRecompensa(datos: CrearRecompensaInput) {
  return post<Recompensa>('/puntos/recompensas', datos);
}

/**
 * Actualiza una recompensa existente.
 * PUT /api/puntos/recompensas/:id
 *
 * Solo dueños pueden editar. Gerentes reciben 403.
 *
 * MANEJO DE IMAGEN:
 *   - datos.imagenUrl con nuevo valor → backend elimina imagen anterior automáticamente
 *   - datos.eliminarImagen = true → backend elimina imagen y pone null
 *
 * @param id - UUID de la recompensa
 * @param datos - Campos a actualizar
 */
export async function updateRecompensa(id: string, datos: ActualizarRecompensaInput) {
  return put<Recompensa>(`/puntos/recompensas/${id}`, datos);
}

/**
 * Elimina una recompensa (soft delete + cleanup Cloudinary).
 * DELETE /api/puntos/recompensas/:id
 *
 * Solo dueños pueden eliminar. Gerentes reciben 403.
 * El backend marca como inactiva y elimina la imagen de Cloudinary.
 *
 * @param id - UUID de la recompensa
 */
export async function deleteRecompensa(id: string) {
  return del(`/puntos/recompensas/${id}`);
}

// =============================================================================
// ESTADÍSTICAS (Filtradas por sucursal automáticamente)
// =============================================================================

/**
 * Obtiene los 4 KPIs del sistema de puntos.
 * GET /api/puntos/estadisticas?periodo=semana
 *
 * Filtro de sucursal aplicado automáticamente por el interceptor.
 * El backend también retorna `periodo` en el root de la respuesta,
 * pero es redundante: el store ya conoce qué periodo solicitó.
 *
 * @param periodo - Período temporal para filtrar (por defecto 'todo')
 */
export async function getEstadisticas(periodo?: PeriodoEstadisticas) {
  const params = periodo ? `?periodo=${periodo}` : '';
  return get<EstadisticasPuntos>(`/puntos/estadisticas${params}`);
}