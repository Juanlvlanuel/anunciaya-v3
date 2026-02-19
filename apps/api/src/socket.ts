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
import { db } from './db/index.js';
import { usuarios } from './db/schemas/schema.js';
import { eq } from 'drizzle-orm';

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
        socket.data.usuarioId = usuarioId;
      }
    });

    // -----------------------------------------------------------------
    // ChatYA: Indicador "Escribiendo..."
    // -----------------------------------------------------------------
    socket.on('chatya:escribiendo', (data: { conversacionId: string; destinatarioId: string }) => {
      if (data.destinatarioId) {
        io!.to(`usuario:${data.destinatarioId}`).emit('chatya:escribiendo', {
          conversacionId: data.conversacionId,
        });
      }
    });

    socket.on('chatya:dejar-escribir', (data: { conversacionId: string; destinatarioId: string }) => {
      if (data.destinatarioId) {
        io!.to(`usuario:${data.destinatarioId}`).emit('chatya:dejar-escribir', {
          conversacionId: data.conversacionId,
        });
      }
    });

    // -----------------------------------------------------------------
    // ChatYA: Confirmar entrega (2 palomitas grises)
    // -----------------------------------------------------------------
    socket.on('chatya:entregado', (data: { conversacionId: string; emisorId: string; mensajeIds: string[] }) => {
      if (data.emisorId) {
        io!.to(`usuario:${data.emisorId}`).emit('chatya:entregado', {
          conversacionId: data.conversacionId,
          mensajeIds: data.mensajeIds,
        });
      }
    });

    // -----------------------------------------------------------------
    // ChatYA: Estado del usuario (conectado/ausente/desconectado)
    // -----------------------------------------------------------------
    socket.on('chatya:estado', (data: { usuarioId: string; estado: string }) => {
      socket.broadcast.emit('chatya:estado-usuario', {
        usuarioId: data.usuarioId,
        estado: data.estado,
      });
    });

    // -----------------------------------------------------------------
    // Disconnect: Actualizar última conexión + notificar estado
    // -----------------------------------------------------------------
    socket.on('disconnect', () => {
      const usuarioId = socket.data.usuarioId as string | undefined;
      if (usuarioId) {
        db.update(usuarios)
          .set({ ultimaConexion: new Date().toISOString() })
          .where(eq(usuarios.id, usuarioId))
          .then(() => {})
          .catch((err) => console.error('Error actualizando última conexión:', err));

        socket.broadcast.emit('chatya:estado-usuario', {
          usuarioId,
          estado: 'desconectado',
        });
      }
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