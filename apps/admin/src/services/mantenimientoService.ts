/**
 * mantenimientoService.ts
 * =======================
 * Llamadas a la API del módulo "Mantenimiento" (Panel Admin) = el centro de
 * operación técnica del SuperAdmin. Solo lectura. Reusa el axios del Panel (`api`),
 * que adjunta el token y renueva ante 401.
 *
 * Endpoints (todos GET, solo superadmin):
 *   /admin/mantenimiento/salud           → semáforos BD/Redis/R2/Stripe
 *   /admin/mantenimiento/logs            → ventana de logs recientes (en memoria)
 *   /admin/mantenimiento/crons           → estado de las tareas programadas
 *   /admin/mantenimiento/r2-reconcile    → reporte del recolector de basura R2 (escaneo)
 *   /admin/mantenimiento/r2-reconcile/log→ histórico de ejecuciones del recolector
 *
 * Ubicación: apps/admin/src/services/mantenimientoService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// SALUD DEL SISTEMA
// =============================================================================

export type IdServicioSalud = 'bd' | 'redis' | 'r2' | 'stripe';
export type EstadoServicioSalud = 'operativo' | 'lento' | 'caido';

export interface SaludServicio {
  id: IdServicioSalud;
  nombre: string;
  estado: EstadoServicioSalud;
  latenciaMs: number | null;
  detalle?: string;
}

export interface SaludSistema {
  generadoEn: string;
  servicios: SaludServicio[];
}

export async function obtenerSalud(): Promise<SaludSistema> {
  const { data } = await api.get<RespuestaAPI<SaludSistema>>('/admin/mantenimiento/salud');
  return data.data ?? { generadoEn: '', servicios: [] };
}

// =============================================================================
// LOGS RECIENTES
// =============================================================================

export type NivelLog = 'info' | 'warn' | 'error';

export interface EntradaLog {
  ts: string;
  nivel: NivelLog;
  mensaje: string;
}

export async function obtenerLogs(nivel?: NivelLog): Promise<EntradaLog[]> {
  const { data } = await api.get<RespuestaAPI<{ logs: EntradaLog[]; total: number }>>(
    '/admin/mantenimiento/logs',
    { params: nivel ? { nivel } : undefined },
  );
  return data.data?.logs ?? [];
}

// =============================================================================
// TAREAS PROGRAMADAS (CRONS)
// =============================================================================

export interface EstadoCron {
  id: string;
  nombre: string;
  descripcion: string;
  cadencia: string;
  cadenciaMs?: number;
  ultimaEjecucion: string | null;
  duracionMs: number | null;
  ok: boolean | null;
  resultado: string | null;
  proximaEstimada: string | null;
}

export async function obtenerCrons(): Promise<EstadoCron[]> {
  const { data } = await api.get<RespuestaAPI<{ crons: EstadoCron[] }>>(
    '/admin/mantenimiento/crons',
  );
  return data.data?.crons ?? [];
}

// =============================================================================
// RECOLECTOR DE BASURA R2 (reporte + histórico) — solo lectura
// =============================================================================

export interface ReporteReconcile {
  resumen: {
    urlsEnBD: number;
    objetosEnR2: number;
    huerfanas: number;
    rotas: number;
    ignoradasPorGracia: number;
  };
  porCarpeta: Record<string, { enR2: number; enBD: number; huerfanas: number }>;
  huerfanas: Array<{ url: string; key: string; carpeta: string; size: number; lastModified: string }>;
  rotas: Array<{ url: string; ubicacion: string }>;
  ignoradasPorGracia: Array<{ url: string; key: string; edadMinutos: number }>;
  /** Si el borrado está habilitado (solo con acceso cross-ambiente / local). false en prod. */
  puedeEjecutar?: boolean;
}

const RECONCILE_VACIO: ReporteReconcile = {
  resumen: { urlsEnBD: 0, objetosEnR2: 0, huerfanas: 0, rotas: 0, ignoradasPorGracia: 0 },
  porCarpeta: {},
  huerfanas: [],
  rotas: [],
  ignoradasPorGracia: [],
  puedeEjecutar: false,
};

/**
 * Dispara el escaneo (dry-run) del recolector. Puede tardar varios segundos: usa
 * un timeout amplio porque recorre todo R2 y cruza contra la BD.
 */
export async function obtenerReconcile(): Promise<ReporteReconcile> {
  const { data } = await api.get<RespuestaAPI<ReporteReconcile>>(
    '/admin/mantenimiento/r2-reconcile',
    { timeout: 60_000 },
  );
  return data.data ?? RECONCILE_VACIO;
}

export interface EjecucionReconcile {
  id: string;
  ejecutadoAt: string;
  ejecutadoPor: string;
  dryRun: boolean;
  carpetas: string[] | null;
  huerfanasDetectadas: number;
  eliminadas: number;
  fallidas: number;
  ignoradasPorGracia: number;
  detalle: Array<{ url: string; ok: boolean; error?: string }> | null;
}

export async function obtenerReconcileLog(): Promise<EjecucionReconcile[]> {
  const { data } = await api.get<RespuestaAPI<{ ejecuciones: EjecucionReconcile[]; total: number }>>(
    '/admin/mantenimiento/r2-reconcile/log',
  );
  return data.data?.ejecuciones ?? [];
}

// =============================================================================
// ACCIONES (escritura/ejecución) — cada una audita en el backend
// =============================================================================

export interface ResultadoLimpieza {
  dryRun: boolean;
  huerfanasDetectadas: number;
  eliminadas: number;
  fallidas: number;
  ignoradasPorGracia: number;
}

/** Ejecuta la limpieza real de huérfanos R2. El backend la bloquea (409) si no es seguro (prod). */
export async function ejecutarLimpiezaR2(): Promise<ResultadoLimpieza> {
  const { data } = await api.post<RespuestaAPI<ResultadoLimpieza>>(
    '/admin/mantenimiento/r2-reconcile/ejecutar',
    { confirmacion: 'SI_BORRAR_HUERFANAS' },
    { timeout: 60_000 },
  );
  return data.data!;
}

/** Fuerza la corrida de un cron sin esperar su horario. Devuelve su estado actualizado. */
export async function ejecutarCronManual(id: string): Promise<EstadoCron> {
  const { data } = await api.post<RespuestaAPI<{ cron: EstadoCron }>>(
    `/admin/mantenimiento/crons/${id}/ejecutar`,
    {},
    { timeout: 60_000 },
  );
  return data.data!.cron;
}

export interface PreviewCron {
  candidatos: number;
  descripcion: string;
}

/** Preview de qué haría un cron si se ejecutara ahora (conteo + descripción). No actúa. */
export async function obtenerPreviewCron(id: string): Promise<PreviewCron> {
  const { data } = await api.get<RespuestaAPI<PreviewCron>>(`/admin/mantenimiento/crons/${id}/preview`);
  return data.data ?? { candidatos: 0, descripcion: '' };
}

/** Purga el caché en memoria de configuración del sistema. */
export async function purgarCache(): Promise<void> {
  await api.post('/admin/mantenimiento/cache/purgar');
}

/** Vacía el buffer de logs en memoria. */
export async function vaciarLogs(): Promise<void> {
  await api.post('/admin/mantenimiento/logs/vaciar');
}
