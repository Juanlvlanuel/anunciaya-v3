/**
 * admin/mantenimiento-acciones.service.ts
 * ========================================
 * Acciones (escritura/ejecución) del módulo "Mantenimiento" (Panel Admin). Cada
 * acción audita en `admin_auditoria`. Complementa `salud.service.ts` (lectura).
 *
 *  - ejecutarLimpiezaR2Segura → borra huérfanos del bucket del ambiente actual
 *    contra su propia BD. Tras separar los buckets dev/prod (jul 2026) es seguro
 *    en cualquier ambiente; el guard cross-ambiente quedó obsoleto.
 *  - ejecutarCronManual       → fuerza la corrida de un cron sin esperar su horario.
 *  - purgarCacheConfig        → limpia el caché en memoria de configuracion.service.
 *  - vaciarLogsBE             → vacía el buffer de logs en memoria.
 *
 * Ubicación: apps/api/src/services/admin/mantenimiento-acciones.service.ts
 */

import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { resetearCacheConfig } from '../configuracion.service.js';
import { vaciarLogs } from '../../utils/logBuffer.js';
import {
    ejecutarLimpiezaR2,
    type OpcionesReconcile,
    type ResultadoEjecucion,
} from './mantenimiento.service.js';
import { obtenerEstadoCrons, CATALOGO_CRONS, type EstadoCron } from '../../utils/cronRegistry.js';
import { ejecutarCron as correrScanya } from '../../cron/scanya.cron.js';
import { ejecutarAutoPausa as correrMarketplace } from '../../cron/marketplace-expiracion.cron.js';
import { ejecutarAutoPausa as correrServicios } from '../../cron/servicios-expiracion.cron.js';
import { ejecutarSuspension as correrGracia } from '../../cron/suscripciones-gracia.cron.js';
import { ejecutarExpiracionManuales as correrVencimientos } from '../../cron/suscripciones-vencimientos-manuales.cron.js';
import { limpiarConversacionesInactivas as correrChatya } from '../../cron/chatya.cron.js';
import { ejecutarCronDiario as correrAlertas } from '../../cron/alertas.cron.js';

// =============================================================================
// RECOLECTOR R2 — ejecutar limpieza
// =============================================================================

/**
 * Tras la separación de buckets (dev=`anunciaya-tickets` / prod=`anunciaya-prod`),
 * cada ambiente limpia SU bucket contra SU propia BD, así que el borrado es seguro
 * en cualquier ambiente. Se conserva esta función (la UI la usa para saber si
 * habilitar el botón) pero ya no bloquea: el guard cross-ambiente quedó obsoleto
 * porque el bucket dejó de ser compartido.
 */
export function puedeEjecutarLimpiezaR2(): boolean {
    return true;
}

/**
 * (Legacy) Se lanzaba cuando el bucket era compartido dev/prod y el borrado se
 * intentaba sin acceso cross-ambiente. Tras separar los buckets ya no se lanza;
 * se conserva por compatibilidad con el controller (que aún la importa/captura).
 */
export class LimpiezaBloqueadaError extends Error {
    constructor() {
        super('La limpieza de R2 no está disponible en este momento.');
        this.name = 'LimpiezaBloqueadaError';
    }
}

export async function ejecutarLimpiezaR2Segura(
    panel: UsuarioPanel,
    opciones: Omit<OpcionesReconcile, 'dryRun'>,
): Promise<ResultadoEjecucion> {
    if (!puedeEjecutarLimpiezaR2()) {
        throw new LimpiezaBloqueadaError();
    }

    const resultado = await ejecutarLimpiezaR2({ ...opciones, dryRun: false });

    await registrarAuditoria(panel, {
        accion: 'mantenimiento_r2_limpiar',
        entidadTipo: 'mantenimiento',
        entidadId: null,
        datosNuevos: {
            eliminadas: resultado.eliminadas,
            fallidas: resultado.fallidas,
            huerfanasDetectadas: resultado.huerfanasDetectadas,
            carpetas: opciones.soloCarpetas ?? null,
        },
    });

    return resultado;
}

// =============================================================================
// TAREAS PROGRAMADAS — ejecutar ahora
// =============================================================================

/** Mapa id de cron → su función de corrida (la misma que dispara el cron programado). */
const EJECUTORES: Record<string, () => Promise<void>> = {
    chatya: correrChatya,
    alertas: correrAlertas,
    scanya: correrScanya,
    'marketplace-expiracion': correrMarketplace,
    'servicios-expiracion': correrServicios,
    'suscripciones-gracia': correrGracia,
    'vencimientos-manuales': correrVencimientos,
};

export class CronDesconocidoError extends Error {
    constructor(id: string) {
        super(`Tarea programada desconocida: ${id}`);
        this.name = 'CronDesconocidoError';
    }
}

/**
 * Fuerza la corrida de un cron sin esperar su horario. Ejecuta la MISMA función
 * que el cron programado (registra su telemetría igual). Devuelve el estado
 * actualizado de ese cron.
 */
export async function ejecutarCronManual(panel: UsuarioPanel, id: string): Promise<EstadoCron> {
    const ejecutor = EJECUTORES[id];
    if (!ejecutor) throw new CronDesconocidoError(id);

    await ejecutor(); // ejecuta + registra en cronRegistry (atrapa sus propios errores)

    const estado = obtenerEstadoCrons().find((c) => c.id === id);
    const nombre = CATALOGO_CRONS.find((c) => c.id === id)?.nombre ?? id;

    await registrarAuditoria(panel, {
        accion: 'mantenimiento_cron_ejecutar',
        entidadTipo: 'cron',
        entidadId: null,
        datosNuevos: { id, nombre, ok: estado?.ok ?? null, resultado: estado?.resultado ?? null },
    });

    // `estado` siempre existe: el id ya se validó contra EJECUTORES (== ids del catálogo).
    return estado!;
}

// =============================================================================
// CACHÉ DE CONFIGURACIÓN — purgar
// =============================================================================

export async function purgarCacheConfig(panel: UsuarioPanel): Promise<void> {
    resetearCacheConfig();
    await registrarAuditoria(panel, {
        accion: 'mantenimiento_cache_purgar',
        entidadTipo: 'mantenimiento',
        entidadId: null,
    });
}

// =============================================================================
// LOGS — vaciar buffer
// =============================================================================

export async function vaciarLogsBE(panel: UsuarioPanel): Promise<void> {
    vaciarLogs();
    await registrarAuditoria(panel, {
        accion: 'mantenimiento_logs_vaciar',
        entidadTipo: 'mantenimiento',
        entidadId: null,
    });
}
