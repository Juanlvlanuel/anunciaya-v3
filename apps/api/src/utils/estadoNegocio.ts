/**
 * estadoNegocio.ts
 * ================
 * Helper central para clasificar el "estado de circulación" de un negocio,
 * derivado de los campos de estado de la tabla `negocios`.
 *
 * Regla (acordada en Tanda 1 / Tanda 2 · Grupo 1):
 *   - `activo = false`            → fuera de circulación (lo apagan: impago vía
 *                                   cron, cancelación vía webhook, suspensión
 *                                   manual del Panel).
 *   - El MOTIVO vive aparte:
 *       · CANCELADO (definitivo) = estado_membresia = 'cancelado'
 *                                  OR estado_admin = 'archivado'
 *       · SUSPENDIDO (temporal)  = fuera de circulación pero NO cancelado.
 *
 * NO se usa `es_borrador` para distinguir: es ambiguo (también lo tienen los
 * negocios a medio onboarding). Misma lección del backfill de la Tanda 1.
 *
 * Importante: la clasificación mira PRIMERO el motivo (estado_membresia /
 * estado_admin), así un negocio cancelado se reconoce como tal aunque un dato
 * viejo aún no haya alineado `activo`.
 *
 * Ubicación: apps/api/src/utils/estadoNegocio.ts
 */

export type EstadoCirculacion = 'en_circulacion' | 'suspendido' | 'cancelado';

/** Campos mínimos del negocio necesarios para clasificar su circulación. */
export interface CamposCirculacionNegocio {
    activo: boolean | null;
    estadoMembresia: string;
    estadoAdmin: string;
}

/** Clasifica el estado de circulación de un negocio. */
export function clasificarCirculacion(n: CamposCirculacionNegocio): EstadoCirculacion {
    // El motivo manda: cancelado/archivado = fuera definitivo.
    if (n.estadoMembresia === 'cancelado' || n.estadoAdmin === 'archivado') {
        return 'cancelado';
    }
    // Fuera de circulación sin ser cancelado = suspendido (temporal).
    if (n.activo === false) {
        return 'suspendido';
    }
    return 'en_circulacion';
}

/** True si el negocio NO está en circulación (suspendido o cancelado). */
export function estaFueraDeCirculacion(n: CamposCirculacionNegocio): boolean {
    return clasificarCirculacion(n) !== 'en_circulacion';
}

/** Mensaje genérico para ScanYA (no distingue motivo). */
export const MENSAJE_SCANYA_FUERA = 'Tu negocio está temporalmente fuera de servicio.';

/**
 * Mensaje de bloqueo de ScanYA. Un negocio en alta anticipada (promo_pendiente)
 * está `activo=false` a propósito: todavía no abre, así que no debe operar caja
 * — pero no está suspendido y decírselo así lo alarma sin motivo.
 */
export function mensajeScanyaBloqueado(promoPendiente?: boolean | null): string {
    return promoPendiente
        ? 'Tu negocio aún no ha sido activado. ScanYA estará disponible cuando abras al público.'
        : MENSAJE_SCANYA_FUERA;
}

/** Mensaje para el cliente en CardYA, según el motivo de salida. */
export function mensajeNegocioNoDisponible(estado: EstadoCirculacion): string {
    return estado === 'cancelado'
        ? 'Este negocio ya no está disponible.'
        : 'Este negocio está temporalmente no disponible.';
}

/** Toast al DUEÑO cuando intenta entrar al modo comercial y se le niega. */
export function mensajeBloqueoModoComercial(estado: EstadoCirculacion): string {
    return estado === 'cancelado'
        ? 'Tu negocio fue dado de baja. No puedes entrar al modo comercial.'
        : 'Tu negocio está suspendido. No puedes entrar al modo comercial.';
}

/** Texto de la notificación persistente al DUEÑO (centro de notificaciones del
 *  modo personal), según el motivo. Corto y sin prometer un botón de pago que
 *  todavía no existe. */
export function textoNotificacionFuera(estado: EstadoCirculacion): { titulo: string; mensaje: string } {
    return estado === 'cancelado'
        ? {
            titulo: 'Tu negocio fue dado de baja',
            mensaje: 'Tu suscripción se canceló y tu negocio salió de circulación.',
        }
        : {
            titulo: 'Tu negocio está suspendido',
            mensaje: 'No está visible. Regulariza tu membresía para reactivarlo.',
        };
}
