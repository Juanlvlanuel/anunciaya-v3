/**
 * usePushAppShell.ts
 * ==================
 * Navegación de Web Push a nivel de app-shell. Se monta UNA vez en MainLayout.
 * Abre la conversación exacta al tocar la notificación push:
 *   - Si la app estaba cerrada, el SW la abre en `/inicio?chat=<id>`; aquí
 *     leemos ese query param al montar y abrimos ChatYA en esa conversación.
 *   - Si la app estaba abierta, el SW manda `postMessage({type:'PUSH_CLICK'})`;
 *     lo escuchamos y abrimos la conversación sin recargar.
 *
 * El aviso para activar notificaciones vive aparte, en <BannerActivarPush />.
 *
 * UBICACIÓN: apps/web/src/hooks/usePushAppShell.ts
 */

import { useEffect } from 'react';
import { useChatYAStore } from '../stores/useChatYAStore';
import { useUiStore } from '../stores/useUiStore';

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
    // ── Al montar: ¿la app se abrió desde una notificación (?chat=)? ──
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

    // ── App abierta: escuchar el clic de notificación reenviado por el SW ──
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
}

export default usePushAppShell;
