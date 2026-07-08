/**
 * usePushAppShell.ts
 * ==================
 * Integración de Web Push a nivel de app-shell. Se monta UNA vez en MainLayout.
 * Dos responsabilidades:
 *
 *  1. NAVEGACIÓN AL TOCAR LA NOTIFICACIÓN — abre la conversación exacta:
 *     - Si la app estaba cerrada, el SW la abre en `/inicio?chat=<id>`; aquí
 *       leemos ese query param al montar y abrimos ChatYA en esa conversación.
 *     - Si la app estaba abierta, el SW manda `postMessage({type:'PUSH_CLICK'})`;
 *       lo escuchamos y abrimos la conversación sin recargar.
 *
 *  2. AVISO SUAVE TRAS LOGIN — una sola vez por dispositivo, si el push está
 *     soportado, el permiso sigue sin decidirse y no hay suscripción activa,
 *     sugiere activar las notificaciones en Mi Perfil → Seguridad.
 *
 * UBICACIÓN: apps/web/src/hooks/usePushAppShell.ts
 */

import { useEffect } from 'react';
import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { estaSuscrito, permisoActual, pushSoportado } from '../services/pushService';
import { notificar } from '../utils/notificaciones';

const FLAG_AVISO = 'ay_push_aviso_visto';

/** Abre ChatYA en la conversación indicada (desde una notificación push). */
function abrirConversacionDesdePush(conversacionId: string): void {
    if (!conversacionId) return;
    useChatYAStore.getState().abrirConversacion(conversacionId);
    useUiStore.getState().abrirChatYA();
}

/** Extrae el id de conversación de una URL tipo `/inicio?chat=<id>`. */
function chatIdDeUrl(url: string): string | null {
    try {
        return new URL(url, window.location.origin).searchParams.get('chat');
    } catch {
        return null;
    }
}

export function usePushAppShell(): void {
    const usuario = useAuthStore((s) => s.usuario);

    // ── 1a. Al montar: ¿la app se abrió desde una notificación (?chat=)? ──
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chatId = params.get('chat');
        if (!chatId) return;
        abrirConversacionDesdePush(chatId);
        // Limpiar el query para que no reabra al navegar/recargar.
        params.delete('chat');
        const nuevaUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', nuevaUrl);
    }, []);

    // ── 1b. App abierta: escuchar el clic de notificación reenviado por el SW ──
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handler = (event: MessageEvent) => {
            const data = event.data;
            if (data?.type === 'PUSH_CLICK' && typeof data.url === 'string') {
                const cid = chatIdDeUrl(data.url);
                if (cid) abrirConversacionDesdePush(cid);
            }
        };
        navigator.serviceWorker.addEventListener('message', handler);
        return () => navigator.serviceWorker.removeEventListener('message', handler);
    }, []);

    // ── 2. Aviso suave tras login (una sola vez por dispositivo) ──
    useEffect(() => {
        if (!usuario) return;
        if (!pushSoportado()) return;
        // Solo si el usuario aún no decidió (ni activó ni bloqueó) y no lo vimos antes.
        if (permisoActual() !== 'default') return;
        if (localStorage.getItem(FLAG_AVISO) === '1') return;

        let cancelado = false;
        // Pequeño delay para no competir con la carga inicial de la pantalla.
        const t = setTimeout(async () => {
            if (cancelado) return;
            if (await estaSuscrito()) return;
            localStorage.setItem(FLAG_AVISO, '1');
            notificar.info('Activa las notificaciones en Mi Perfil → Seguridad para enterarte de tus mensajes de ChatYA.');
        }, 4000);

        return () => { cancelado = true; clearTimeout(t); };
    }, [usuario]);
}

export default usePushAppShell;
