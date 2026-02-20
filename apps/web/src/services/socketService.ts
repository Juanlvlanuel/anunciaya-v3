/**
 * socketService.ts
 * =================
 * Cliente Socket.io para comunicación en tiempo real.
 * Base compartida para todos los módulos (CardYA, ChatYA, etc.)
 *
 * UBICACIÓN: apps/web/src/services/socketService.ts
 *
 * PROBLEMA RESUELTO:
 *   React StrictMode en desarrollo ejecuta effects 2 veces, lo que causa
 *   que conectarSocket() se llame 2 veces. Si destruimos el socket en la
 *   segunda llamada, Socket.io-client invalida internamente el transporte
 *   compartido y la nueva conexión queda muerta (no emite ni recibe).
 *
 * SOLUCIÓN:
 *   - Si ya existe un socket (conectado O en proceso de conexión), NO lo
 *     destruimos. Solo nos aseguramos de que tenga los listeners correctos.
 *   - Solo destruimos si el socket está explícitamente desconectado Y no
 *     está intentando reconectar (disconnected && !active).
 */

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

/**
 * Callbacks registrados por los módulos (ChatYA, notificaciones, CardYA, etc.)
 * Se aplican al socket cada vez que se crea uno nuevo.
 */
const listenersPendientes: { evento: string; callback: (...args: unknown[]) => void }[] = [];

/**
 * Conecta al servidor de Socket.io.
 *
 * - Si ya hay un socket conectado o conectándose: no hace nada (safe para StrictMode)
 * - Si no hay socket: crea uno nuevo y aplica todos los listeners pendientes
 */
export function conectarSocket(): void {
  // Si ya existe un socket que está conectado o intentando conectar, dejarlo
  // Esto es clave para StrictMode: la 2da llamada no destruye el socket de la 1ra
  if (socket && (socket.connected || socket.active)) {
    return;
  }

  // Si existe pero está completamente muerto, limpiarlo
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Crear socket nuevo
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // ─── Aplicar listeners pendientes directamente en el socket ───────────
  for (const { evento, callback } of listenersPendientes) {
    socket.on(evento, callback);
  }

  // ─── 'connect': unirse al room del backend ────────────────────────────
  socket.on('connect', () => {
    const usuario = JSON.parse(localStorage.getItem('ay_usuario') || 'null');
    if (usuario?.id) {
      socket?.emit('unirse', usuario.id);
    }
  });

  socket.on('disconnect', () => { });
}

/**
 * Escucha un evento del servidor.
 *
 * Si el socket ya existe: registra el listener directamente.
 * Si no existe: lo guarda en listenersPendientes para cuando se cree.
 */
export function escucharEvento<T = unknown>(
  evento: string,
  callback: (datos: T) => void
): () => void {
  const cb = callback as (...args: unknown[]) => void;

  // Guardar en pendientes (para re-aplicar si se recrea el socket)
  const yaExiste = listenersPendientes.some((l) => l.evento === evento && l.callback === cb);
  if (!yaExiste) {
    listenersPendientes.push({ evento, callback: cb });
  }

  // Si el socket ya existe, registrar directamente
  if (socket) {
    socket.on(evento, cb);
  }

  return () => {
    socket?.off(evento, cb);
    const idx = listenersPendientes.findIndex((l) => l.evento === evento && l.callback === cb);
    if (idx !== -1) listenersPendientes.splice(idx, 1);
  };
}

/**
 * Emite un evento al servidor.
 * Si el socket no está conectado, el evento se pierde silenciosamente.
 */
export function emitirEvento<T = unknown>(
  evento: string,
  datos: T
): void {
  if (socket?.connected) {
    socket.emit(evento, datos);
  }
}

/**
 * Desconecta del servidor de Socket.io.
 * Se llama al cerrar sesión (logout).
 */
export function desconectarSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** DEBUG TEMPORAL */
export function debugSocket() {
  return { connected: socket?.connected, id: socket?.id, active: socket?.active };
}