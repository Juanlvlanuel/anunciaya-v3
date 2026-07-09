/**
 * pushService.ts
 * ==============
 * Lógica de bajo nivel de Web Push en el frontend: detectar soporte, pedir
 * permiso, suscribirse/desuscribirse al `pushManager` del Service Worker y
 * sincronizar la suscripción con el backend (/api/push/*).
 *
 * El SW principal (sw-anunciaya.js) SOLO se registra en producción (ver
 * main.tsx). En desarrollo no hay SW, así que `push` no está disponible en
 * localhost — el toggle se mostrará deshabilitado con un aviso.
 *
 * La clave pública VAPID llega por env: VITE_VAPID_PUBLIC_KEY (misma que la
 * VAPID_PUBLIC_KEY del backend). Sin ella, activar push falla con aviso.
 *
 * UBICACIÓN: apps/web/src/services/pushService.ts
 */

import { api, type RespuestaAPI } from './api';

const VAPID_PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

/** ¿El navegador soporta Service Worker + Push + Notification? */
export function pushSoportado(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/** Estado actual del permiso de notificaciones del navegador. */
export function permisoActual(): NotificationPermission {
    return pushSoportado() ? Notification.permission : 'denied';
}

/**
 * Convierte la clave VAPID (base64url) al Uint8Array que exige
 * `pushManager.subscribe({ applicationServerKey })`.
 */
function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    // Construir sobre un ArrayBuffer concreto (no ArrayBufferLike) para que el
    // tipo sea asignable a `applicationServerKey: BufferSource`.
    const salida = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) salida[i] = raw.charCodeAt(i);
    return salida;
}

/**
 * Obtiene el registration del SW listo. En dev (sin SW) `serviceWorker.ready`
 * nunca resuelve, así que competimos contra un timeout para no colgar la UI.
 */
async function obtenerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!pushSoportado()) return null;
    try {
        return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
    } catch {
        return null;
    }
}

/** ¿Hay una suscripción push activa en este dispositivo? */
export async function estaSuscrito(): Promise<boolean> {
    if (!pushSoportado()) return false;
    try {
        // getRegistration() (NO serviceWorker.ready): devuelve el registration
        // sin esperar a que el SW esté "activo/controlando". Al abrir la app
        // desde una notificación, `ready` puede tardar más que el timeout y hacía
        // creer que NO había suscripción → el banner reaparecía pese a estar
        // suscrito. getSubscription() funciona en cualquier estado del SW.
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return false;
        const sub = await reg.pushManager.getSubscription();
        return sub !== null;
    } catch {
        return false;
    }
}

export interface ResultadoPush {
    ok: boolean;
    /** Motivo cuando ok=false, para el aviso al usuario. */
    motivo?: 'no-soportado' | 'sin-clave' | 'permiso-denegado' | 'sin-sw' | 'error';
}

/**
 * Activa las notificaciones push en este dispositivo:
 *   1. Pide permiso del navegador (si no lo tiene).
 *   2. Se suscribe al pushManager con la clave VAPID.
 *   3. Manda la suscripción al backend.
 */
export async function activarPush(): Promise<ResultadoPush> {
    if (!pushSoportado()) return { ok: false, motivo: 'no-soportado' };
    if (!VAPID_PUBLIC_KEY) return { ok: false, motivo: 'sin-clave' };

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return { ok: false, motivo: 'permiso-denegado' };

    const reg = await obtenerRegistration();
    if (!reg) return { ok: false, motivo: 'sin-sw' };

    try {
        // Reusar la suscripción si ya existe; si no, crearla.
        const sub =
            (await reg.pushManager.getSubscription()) ??
            (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64UrlAUint8Array(VAPID_PUBLIC_KEY),
            }));

        await api.post<RespuestaAPI>('/push/suscribir', sub.toJSON());
        return { ok: true };
    } catch (error) {
        console.error('[push] Error al activar:', error);
        return { ok: false, motivo: 'error' };
    }
}

/**
 * Desactiva las notificaciones en este dispositivo: cancela la suscripción en
 * el navegador y la borra del backend.
 */
export async function desactivarPush(): Promise<ResultadoPush> {
    const reg = await obtenerRegistration();
    if (!reg) return { ok: false, motivo: 'sin-sw' };

    try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe();
            await api.post<RespuestaAPI>('/push/desuscribir', { endpoint });
        }
        return { ok: true };
    } catch (error) {
        console.error('[push] Error al desactivar:', error);
        return { ok: false, motivo: 'error' };
    }
}
