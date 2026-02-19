/**
 * socketService.ts
 * =================
 * Cliente Socket.io para comunicación en tiempo real.
 * Base compartida para todos los módulos (CardYA, ChatYA, etc.)
 *
 * UBICACIÓN: apps/web/src/services/socketService.ts
 */

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

// Listeners registrados antes de que el socket se conecte
const listenersPendientes: { evento: string; callback: (...args: unknown[]) => void }[] = [];

/**
 * Conecta al servidor de Socket.io (si no está conectado ya).
 */
export function conectarSocket(): void {
  if (socket?.connected) return;

  // Si ya existe un socket (desconectado), limpiarlo
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {

    const usuario = JSON.parse(localStorage.getItem('ay_usuario') || 'null');
    if (usuario?.id) {
      socket?.emit('unirse', usuario.id);
    }

    // Limpiar listeners previos y re-registrar
    for (const { evento, callback } of listenersPendientes) {
      socket?.off(evento, callback); // quitar si existía
      socket?.on(evento, callback);  // registrar limpio
    }
  });

  socket.on('disconnect', () => {
  });
}

/**
 * Escucha un evento del servidor.
 * Si el socket aún no existe, guarda el listener para registrarlo al conectar.
 */
export function escucharEvento<T = unknown>(
  evento: string,
  callback: (datos: T) => void
): () => void {
  const cb = callback as (...args: unknown[]) => void;

  // Guardar para re-registro en reconexiones
  const yaExiste = listenersPendientes.some((l) => l.evento === evento && l.callback === cb);
  if (!yaExiste) {
    listenersPendientes.push({ evento, callback: cb });
  }

  // Si el socket ya existe y está conectado, registrar ahora
  if (socket?.connected) {
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
 */
export function desconectarSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}