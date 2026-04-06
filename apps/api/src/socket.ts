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
import { verificarAccessToken } from './utils/jwt.js';
import { verificarAccessTokenScanYA } from './utils/jwtScanYA.js';

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

  // ─── Middleware: validar JWT antes de permitir la conexión ───────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Token no proporcionado'));
    }

    // 1. Intentar como token AnunciaYA (descartar si es ScanYA)
    const resultadoAY = verificarAccessToken(token);
    if (resultadoAY.valido && resultadoAY.payload && !(resultadoAY.payload as any)._tipo) {
      socket.data.usuarioId = resultadoAY.payload.usuarioId;
      next();
      return;
    }

    // 2. Intentar como token ScanYA — usar negocioUsuarioId (ID del dueño)
    const resultadoSY = verificarAccessTokenScanYA(token);
    if (resultadoSY.valido && resultadoSY.payload?.negocioUsuarioId) {
      socket.data.usuarioId = resultadoSY.payload.negocioUsuarioId;
      next();
      return;
    }

    return next(new Error('Token inválido'));
  });

  io.on('connection', (socket) => {
    // El cliente envía su usuarioId para unirse a su room personal
    // Si no coincide con el del token, usar el del token (ScanYA envía empleadoId pero el room es del dueño)
    socket.on('unirse', (usuarioId: string) => {
      const idVerificado = socket.data.usuarioId;
      const idRoom = (usuarioId && usuarioId === idVerificado) ? usuarioId : idVerificado;
      if (idRoom) {
        socket.join(`usuario:${idRoom}`);

        // Notificar a todos que este usuario está conectado
        socket.broadcast.emit('chatya:estado-usuario', {
          usuarioId: idRoom,
          estado: 'conectado',
        });
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
    // ChatYA: Consultar estado de un usuario (¿está conectado?)
    // -----------------------------------------------------------------
    socket.on('chatya:consultar-estado', async (usuarioId: string) => {
      if (!usuarioId) return;
      const room = io!.sockets.adapter.rooms.get(`usuario:${usuarioId}`);
      const estaConectado = room && room.size > 0;

      if (estaConectado) {
        socket.emit('chatya:estado-usuario', {
          usuarioId,
          estado: 'conectado',
        });
      } else {
        // Obtener última conexión de la BD
        const [usuario] = await db
          .select({ ultimaConexion: usuarios.ultimaConexion })
          .from(usuarios)
          .where(eq(usuarios.id, usuarioId))
          .limit(1);

        socket.emit('chatya:estado-usuario', {
          usuarioId,
          estado: 'desconectado',
          ultimaConexion: usuario?.ultimaConexion || null,
        });
      }
    });

    // -----------------------------------------------------------------
    // ChatYA: Estado del usuario (conectado/ausente/desconectado)
    // -----------------------------------------------------------------
    socket.on('chatya:estado', (data: { usuarioId: string; estado: string }) => {
      socket.broadcast.emit('chatya:estado-usuario', {
        usuarioId: socket.data.usuarioId,
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
          .then(() => { })
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