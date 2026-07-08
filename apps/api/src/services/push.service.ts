/**
 * push.service.ts
 * ================
 * Servicio de Web Push (notificaciones a la PWA cuando está en segundo plano).
 *
 * Flujo:
 *   1. El frontend pide permiso y se suscribe (pushManager.subscribe) → manda
 *      la suscripción aquí con `guardarSuscripcion`.
 *   2. Cuando llega un mensaje de ChatYA y el receptor NO está conectado por
 *      socket, chatya.service llama `enviarPushAUsuario` → el navegador del
 *      usuario muestra la notificación desde el Service Worker (sw-anunciaya.js),
 *      aunque la app esté cerrada.
 *
 * VAPID: si faltan las claves (env.VAPID_*), el servicio queda INERTE — las
 * funciones de envío hacen no-op y el server arranca igual (mismo patrón que
 * Sentry/Gemini). Así producción no truena si aún no se configuran las claves.
 *
 * Autolimpieza: si el push service responde 404/410 (suscripción expirada o
 * revocada por el usuario), se borra la fila de `push_suscripciones`.
 *
 * UBICACIÓN: apps/api/src/services/push.service.ts
 */

import webpush, { type PushSubscription as WebPushSubscription, WebPushError } from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pushSuscripciones } from '../db/schemas/schema.js';
import { env } from '../config/env.js';

// =============================================================================
// CONFIGURACIÓN VAPID
// =============================================================================

/** true si hay claves VAPID configuradas y el envío de push está operativo. */
export const pushHabilitado: boolean = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushHabilitado) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    console.log('🔔 Web Push habilitado (VAPID configurado)');
} else {
    console.warn('🔕 Web Push inerte: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
}

// =============================================================================
// TIPOS
// =============================================================================

/** Datos de la suscripción que envía el navegador (pushManager.subscribe). */
export interface SuscripcionInput {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * Payload que viaja al Service Worker. Se serializa como JSON; el SW lo parsea
 * en su handler `push` para pintar la notificación y el badge.
 */
export interface PushPayload {
    /** Título de la notificación (ej. nombre de quien escribe). */
    titulo: string;
    /** Cuerpo (preview del mensaje). */
    cuerpo: string;
    /** URL a abrir al tocar la notificación (ej. `/inicio?chat=<convId>`). */
    url?: string;
    /** Agrupa/reemplaza notificaciones de la misma conversación. */
    tag?: string;
    /** Total de no leídos → el SW lo pinta en el badge del ícono (setAppBadge). */
    badge?: number;
}

// =============================================================================
// GUARDAR / ELIMINAR SUSCRIPCIÓN
// =============================================================================

/**
 * Registra (o actualiza) la suscripción push de un dispositivo. El `endpoint`
 * es único: si ya existía (mismo navegador re-suscribiéndose), se reasigna al
 * usuario actual y se refrescan las claves + última actividad.
 */
export async function guardarSuscripcion(
    usuarioId: string,
    sub: SuscripcionInput,
    userAgent?: string | null,
): Promise<void> {
    const ahora = new Date().toISOString();
    await db
        .insert(pushSuscripciones)
        .values({
            usuarioId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            userAgent: userAgent?.slice(0, 300) ?? null,
            ultimaActividad: ahora,
        })
        .onConflictDoUpdate({
            target: pushSuscripciones.endpoint,
            set: {
                usuarioId,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
                userAgent: userAgent?.slice(0, 300) ?? null,
                ultimaActividad: ahora,
            },
        });
}

/** Elimina una suscripción por su endpoint (al desactivar notificaciones). */
export async function eliminarSuscripcion(endpoint: string): Promise<void> {
    await db.delete(pushSuscripciones).where(eq(pushSuscripciones.endpoint, endpoint));
}

// =============================================================================
// ENVIAR PUSH
// =============================================================================

/**
 * Envía un push a TODOS los dispositivos suscritos de un usuario.
 * - No-op si el push está inerte (sin VAPID).
 * - Autolimpia suscripciones muertas (404/410).
 * Nunca lanza: los errores se registran pero no rompen el flujo que la invoca
 * (el envío de push es "best effort", secundario al mensaje en sí).
 */
export async function enviarPushAUsuario(usuarioId: string, payload: PushPayload): Promise<void> {
    if (!pushHabilitado) return;

    const suscripciones = await db
        .select()
        .from(pushSuscripciones)
        .where(eq(pushSuscripciones.usuarioId, usuarioId));

    if (suscripciones.length === 0) return;

    const cuerpo = JSON.stringify(payload);

    await Promise.allSettled(
        suscripciones.map(async (s) => {
            const suscripcion: WebPushSubscription = {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
            };
            try {
                await webpush.sendNotification(suscripcion, cuerpo);
            } catch (error) {
                // 404 (Not Found) / 410 (Gone): la suscripción ya no existe en el
                // push service → borrarla para no reintentarla eternamente.
                if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
                    await eliminarSuscripcion(s.endpoint).catch(() => { /* silencioso */ });
                    return;
                }
                console.error('[push] Error enviando notificación:', error);
            }
        }),
    );
}
