/**
 * socket.ts
 * =========
 * Servidor de Socket.io para comunicación en tiempo real.
 * Base compartida para todos los módulos (CardYA, ChatYA, etc.)
 *
 * UBICACIÓN: apps/api/src/socket.ts
 *
 * USO desde cualquier service:
 *   import { emitirEvento } from '../socket.js';
 *   emitirEvento('recompensa:stock-actualizado', { recompensaId, stock });
 */

import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketServer | null = null;

/**
 * Inicializa Socket.io sobre el servidor HTTP existente.
 * Se llama UNA vez desde index.ts al arrancar el servidor.
 */
export function inicializarSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {

    // El cliente envía su usuarioId para unirse a su room personal
    socket.on('unirse', (usuarioId: string) => {
      if (usuarioId) {
        socket.join(`usuario:${usuarioId}`);
      }
    });

    socket.on('disconnect', () => {
    });
  });
  console.log('⚡ Socket.io inicializado');
  return io;
}

/**
 * Emite un evento a TODOS los clientes conectados.
 * Uso: emitirEvento('recompensa:stock-actualizado', { recompensaId, stock });
 */
export function emitirEvento(evento: string, datos: unknown): void {
  if (!io) {
    console.warn('⚠️ Socket.io no inicializado, evento ignorado:', evento);
    return;
  }
  io.emit(evento, datos);
}

/**
 * Emite un evento a UN usuario específico (por su room).
 * Uso: emitirAUsuario('uuid-del-usuario', 'notificacion:nueva', datos);
 */
export function emitirAUsuario(usuarioId: string, evento: string, datos: unknown): void {
  if (!io) {
    console.warn('⚠️ Socket.io no inicializado, evento ignorado:', evento);
    return;
  }
  io.to(`usuario:${usuarioId}`).emit(evento, datos);
}

/**
 * Retorna la instancia de Socket.io (para uso avanzado como rooms en ChatYA).
 */
export function obtenerIO(): SocketServer | null {
  return io;
}