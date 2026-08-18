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
import { esOrigenPermitido } from './middleware/cors.js';
import {
    unirseASala,
    enviarMensajeSala,
    moderarParticipante,
    iniciarSorteo,
    cerrarSala,
} from './services/dinamicas/sala.service.js';
import { moderarSalaSchema } from './validations/dinamicas-sala.schema.js';
import type { IntentoSorteo, CartaCantada } from './services/dinamicas/sorteo.js';

let io: SocketServer | null = null;

/** Sorteos en modo manual esperando a que el organizador revele la
 *  siguiente bola — en memoria, efímero (mismo criterio que la presencia
 *  de la sala, vía `fetchSockets()`): solo vive mientras dura el proceso. */
const sorteosManualesPendientes = new Map<
  string,
  { intentos: IntentoSorteo[]; cursor: number; organizadorUsuarioId: string }
>();

/** Sorteos en modo automático que el organizador puede pausar/reanudar —
 *  `revelarSorteoEnVivo` revisa esta bandera entre cada bola y actualiza
 *  `progreso` (cuántas bolas van reveladas) según avanza. `intentos` +
 *  `progreso` también sirven para poner al día a quien se une a la sala
 *  DESPUÉS de que ya empezó el sorteo (ver `dinamica:sala:unirse`).
 *  También efímero, igual que el mapa de arriba. */
const sorteosAutomaticosPausables = new Map<
  string,
  { pausado: boolean; organizadorUsuarioId: string; intentos: IntentoSorteo[]; progreso: number }
>();

/** Mismo par de mapas de arriba, para `tabla_completa` — motor distinto
 *  (`ejecutarSorteoTablaCompleta`), cada "bola" es una CARTA cantada, no un
 *  boleto, así que la unidad que se pagina/revela es `CartaCantada`, no
 *  `IntentoSorteo`. Eventos y mapas van en paralelo a propósito (no se
 *  fusionan) — el resto del código ya diferencia por presencia en uno u
 *  otro mapa, igual que hace el resto del socket con otras variantes. */
const sorteosManualesPendientesTablaCompleta = new Map<
  string,
  { cartas: CartaCantada[]; cursor: number; organizadorUsuarioId: string }
>();

const sorteosAutomaticosPausablesTablaCompleta = new Map<
  string,
  { pausado: boolean; organizadorUsuarioId: string; cartas: CartaCantada[]; progreso: number }
>();

/**
 * Inicializa Socket.io sobre el servidor HTTP existente.
 * Se llama UNA vez desde index.ts al arrancar el servidor.
 */
export function inicializarSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      // Reutiliza la misma validación de orígenes que el CORS de Express
      // (localhost, IPs de la LAN y ngrok) para que ChatYA y las notificaciones
      // en tiempo real funcionen también desde otras computadoras de la red.
      origin: (origin, callback) => {
        if (esOrigenPermitido(origin)) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Middleware: validar JWT antes de permitir la conexión ───────────
  // Sin token → conexión de INVITADO (usuarioId null), no se rechaza. La
  // sala en vivo de Dinámicas (Fase 4.1) admite visitantes sin cuenta AY en
  // modo lectura desde el link público — los listeners que sí requieren
  // usuario (unirse a room personal, mandar mensaje de sala, etc.) validan
  // `socket.data.usuarioId` ellos mismos y no hacen nada si es null.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.data.usuarioId = null;
      socket.data.esInvitado = true;
      return next();
    }

    // 1. Intentar como token AnunciaYA (descartar si es ScanYA)
    const resultadoAY = verificarAccessToken(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (resultadoAY.valido && resultadoAY.payload && !(resultadoAY.payload as any)._tipo) {
      const payload = resultadoAY.payload;
      // Gerente en modo comercial → room del dueño (opera "como el negocio").
      // Mismo swap que hace `verificarTokenChatYA` para los endpoints HTTP.
      const esGerenteComercial =
        payload.modoActivo === 'comercial' &&
        payload.sucursalAsignada &&
        payload.negocioUsuarioId &&
        payload.negocioUsuarioId !== payload.usuarioId;
      socket.data.usuarioId = esGerenteComercial ? payload.negocioUsuarioId : payload.usuarioId;
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
    socket.on('chatya:escribiendo', (data: { conversacionId: string; destinatarioId: string; emisorSucursalId?: string | null }) => {
      if (data.destinatarioId) {
        io!.to(`usuario:${data.destinatarioId}`).emit('chatya:escribiendo', {
          conversacionId: data.conversacionId,
          emisorSucursalId: data.emisorSucursalId ?? null,
        });
      }
    });

    socket.on('chatya:dejar-escribir', (data: { conversacionId: string; destinatarioId: string; emisorSucursalId?: string | null }) => {
      if (data.destinatarioId) {
        io!.to(`usuario:${data.destinatarioId}`).emit('chatya:dejar-escribir', {
          conversacionId: data.conversacionId,
          emisorSucursalId: data.emisorSucursalId ?? null,
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
    // MarketPlace: Mi Catálogo — sync en vivo del estado de apartado
    // (2026-08-17). Admite invitados sin token (mismo criterio que la sala
    // de Dinámicas): el catálogo público de un live de Facebook puede tener
    // varios visitantes viéndolo a la vez, y sin esto cada uno se queda con
    // el overlay "Apartado" desactualizado hasta que recarga.
    // -----------------------------------------------------------------
    socket.on('marketplace:catalogo:unirse', (data: { vendedorUsuarioId: string }) => {
      if (!data?.vendedorUsuarioId) return;
      socket.join(`catalogo:${data.vendedorUsuarioId}`);
    });

    socket.on('marketplace:catalogo:salir', (data: { vendedorUsuarioId: string }) => {
      if (!data?.vendedorUsuarioId) return;
      socket.leave(`catalogo:${data.vendedorUsuarioId}`);
    });

    // -----------------------------------------------------------------
    // Dinámicas: Sala en vivo (Fase 4.1)
    // -----------------------------------------------------------------
    const roomSala = roomSalaDinamica;

    socket.on('dinamica:sala:unirse', async (data: { dinamicaId: string }) => {
      if (!data?.dinamicaId) return;
      const usuarioId = socket.data.usuarioId as string | null;
      const resultado = await unirseASala(data.dinamicaId, usuarioId);
      if (!resultado.success) {
        socket.emit('dinamica:sala:error', { message: resultado.message, code: resultado.code });
        return;
      }
      const room = roomSala(data.dinamicaId);
      socket.join(room);

      // Si el sorteo YA está en curso, quien se une ahora se perdió los
      // eventos `dinamica:sala:intento` de las bolas anteriores (esos solo
      // se emiten una vez, en vivo) — se manda lo ya revelado (tomado del
      // progreso guardado en memoria) DENTRO del mismo `estado-inicial`,
      // no como evento aparte: 2 emits separados le daban tiempo al cliente
      // de pintar "esperando la primera bola" antes de que llegara el
      // segundo, un parpadeo visible. Igual con `modoSorteo`: el evento
      // `estado-cambio` que normalmente lo manda solo se emite UNA vez, al
      // iniciar — quien se une después (recarga de página a mitad del
      // sorteo) nunca lo recibe, y sin saber que es 'manual' el botón
      // "Siguiente bola" no tenía por qué mostrarse nunca.
      let intentosEnCurso: { numeroIntento: number; numeroBoleto: number; esGanador: boolean; lugar: number | null }[] = [];
      let cartasEnCurso: { numeroIntento: number; cartaIndice: number; ganadores: { numeroBoleto: number; lugar: number }[] }[] = [];
      let modoSorteoActual: 'automatico' | 'manual' | undefined;
      if (resultado.data.estado === 'en_sorteo') {
        const pendienteManual = sorteosManualesPendientes.get(data.dinamicaId);
        const pendienteAutomatico = sorteosAutomaticosPausables.get(data.dinamicaId);
        const pendienteManualTC = sorteosManualesPendientesTablaCompleta.get(data.dinamicaId);
        const pendienteAutomaticoTC = sorteosAutomaticosPausablesTablaCompleta.get(data.dinamicaId);
        modoSorteoActual =
          pendienteManual || pendienteManualTC
            ? 'manual'
            : pendienteAutomatico || pendienteAutomaticoTC
              ? 'automatico'
              : undefined;
        const yaRevelados = pendienteManual
          ? pendienteManual.intentos.slice(0, pendienteManual.cursor)
          : pendienteAutomatico
            ? pendienteAutomatico.intentos.slice(0, pendienteAutomatico.progreso)
            : [];
        intentosEnCurso = yaRevelados.map((i) => ({
          numeroIntento: i.numeroIntento,
          numeroBoleto: i.boleto.numeroBoleto,
          esGanador: i.esGanador,
          lugar: i.lugar,
        }));
        const yaCantadas = pendienteManualTC
          ? pendienteManualTC.cartas.slice(0, pendienteManualTC.cursor)
          : pendienteAutomaticoTC
            ? pendienteAutomaticoTC.cartas.slice(0, pendienteAutomaticoTC.progreso)
            : [];
        cartasEnCurso = yaCantadas.map((c) => ({
          numeroIntento: c.numeroIntento,
          cartaIndice: c.cartaIndice,
          ganadores: c.ganadores.map((g) => ({ numeroBoleto: g.boleto.numeroBoleto, lugar: g.lugar })),
        }));
      }
      socket.emit('dinamica:sala:estado-inicial', { ...resultado.data, intentosEnCurso, cartasEnCurso, modoSorteoActual });

      emitirPresenciaSala(room).catch((error) => console.error('Error emitiendo presencia de sala:', error));
    });

    socket.on('dinamica:sala:salir', (data: { dinamicaId: string }) => {
      if (!data?.dinamicaId) return;
      const room = roomSala(data.dinamicaId);
      socket.leave(room);
      emitirPresenciaSala(room).catch((error) => console.error('Error emitiendo presencia de sala:', error));
    });

    socket.on('dinamica:sala:mensaje', async (data: { dinamicaId: string; contenido: string }) => {
      const usuarioId = socket.data.usuarioId as string | null;
      if (!usuarioId || !data?.dinamicaId || !data?.contenido?.trim()) {
        socket.emit('dinamica:sala:error', { message: 'No puedes escribir en esta sala' });
        return;
      }
      const resultado = await enviarMensajeSala(data.dinamicaId, usuarioId, data.contenido.trim());
      if (!resultado.success) {
        socket.emit('dinamica:sala:error', { message: resultado.message, code: resultado.code });
        return;
      }
      io!.to(roomSala(data.dinamicaId)).emit('dinamica:sala:mensaje', resultado.data);
    });

    socket.on('dinamica:sala:moderar', async (data: { dinamicaId: string; usuarioId: string; accion: string; motivo?: string }) => {
      const organizadorUsuarioId = socket.data.usuarioId as string | null;
      if (!organizadorUsuarioId || !data?.dinamicaId) return;

      const validacion = moderarSalaSchema.safeParse({ usuarioId: data.usuarioId, accion: data.accion, motivo: data.motivo });
      if (!validacion.success) {
        socket.emit('dinamica:sala:error', { message: 'Acción de moderación inválida' });
        return;
      }

      const resultado = await moderarParticipante(organizadorUsuarioId, data.dinamicaId, validacion.data);
      if (!resultado.success) {
        socket.emit('dinamica:sala:error', { message: resultado.message, code: resultado.code });
        return;
      }

      const room = roomSala(data.dinamicaId);
      io!.to(room).emit('dinamica:sala:sistema', { contenido: resultado.data.mensajeSistema.contenido, createdAt: resultado.data.mensajeSistema.createdAt });

      // Al usuario afectado, si sigue conectado a esta sala: estado
      // personalizado + expulsión forzada (sale del room, no puede seguir
      // leyendo eventos en vivo aunque la sala sea pública).
      const socketsAfectados = await io!.in(room).fetchSockets();
      const esExpulsion = validacion.data.accion === 'expulsar';
      for (const s of socketsAfectados) {
        if (s.data.usuarioId !== data.usuarioId) continue;
        s.emit('dinamica:sala:moderacion-actualizada', { accion: validacion.data.accion });
        if (esExpulsion) {
          s.emit('dinamica:sala:expulsado');
          s.leave(room);
        }
      }
      if (esExpulsion) {
        emitirPresenciaSala(room).catch((error) => console.error('Error emitiendo presencia de sala:', error));
      }
    });

    socket.on('dinamica:sala:iniciar-sorteo', async (data: { dinamicaId: string; modo?: 'automatico' | 'manual' }) => {
      const organizadorUsuarioId = socket.data.usuarioId as string | null;
      if (!organizadorUsuarioId || !data?.dinamicaId) return;
      const modo: 'automatico' | 'manual' = data.modo === 'manual' ? 'manual' : 'automatico';

      const resultado = await iniciarSorteo(organizadorUsuarioId, data.dinamicaId);
      if (!resultado.success) {
        socket.emit('dinamica:sala:error', { message: resultado.message, code: resultado.code });
        return;
      }

      const room = roomSala(data.dinamicaId);
      io!.to(room).emit('dinamica:sala:estado-cambio', { estado: 'en_sorteo', modoSorteo: modo });

      // tabla_completa devuelve `cartas` en vez de `intentos` — motor
      // distinto (`ejecutarSorteoTablaCompleta`), mapas/eventos aparte.
      if ('cartas' in resultado.data.resultado) {
        const { cartas } = resultado.data.resultado;
        if (modo === 'manual') {
          sorteosManualesPendientesTablaCompleta.set(data.dinamicaId, { cartas, cursor: 0, organizadorUsuarioId });
          return;
        }
        sorteosAutomaticosPausablesTablaCompleta.set(data.dinamicaId, {
          pausado: false,
          organizadorUsuarioId,
          cartas,
          progreso: 0,
        });
        revelarSorteoTablaCompletaEnVivo(data.dinamicaId, cartas).catch((error) => {
          console.error('Error revelando el sorteo de tabla completa en vivo:', error);
        });
        return;
      }

      if (modo === 'manual') {
        sorteosManualesPendientes.set(data.dinamicaId, {
          intentos: resultado.data.resultado.intentos,
          cursor: 0,
          organizadorUsuarioId,
        });
        return;
      }

      sorteosAutomaticosPausables.set(data.dinamicaId, {
        pausado: false,
        organizadorUsuarioId,
        intentos: resultado.data.resultado.intentos,
        progreso: 0,
      });
      revelarSorteoEnVivo(data.dinamicaId, resultado.data.resultado.intentos).catch((error) => {
        console.error('Error revelando el sorteo en vivo:', error);
      });
    });

    // El organizador pausa/reanuda la cascada automática entre 2 bolas —
    // no cancela nada, solo detiene el avance; `revelarSorteoEnVivo` revisa
    // esta bandera antes de emitir cada siguiente intento.
    socket.on('dinamica:sala:pausar-sorteo', (data: { dinamicaId: string }) => {
      const usuarioId = socket.data.usuarioId as string | null;
      if (!usuarioId || !data?.dinamicaId) return;
      const estado = sorteosAutomaticosPausables.get(data.dinamicaId);
      const estadoTC = sorteosAutomaticosPausablesTablaCompleta.get(data.dinamicaId);
      if (estado && estado.organizadorUsuarioId === usuarioId) estado.pausado = true;
      else if (estadoTC && estadoTC.organizadorUsuarioId === usuarioId) estadoTC.pausado = true;
      else return;
      io!.to(roomSala(data.dinamicaId)).emit('dinamica:sala:pausa-cambio', { pausado: true });
    });

    socket.on('dinamica:sala:reanudar-sorteo', (data: { dinamicaId: string }) => {
      const usuarioId = socket.data.usuarioId as string | null;
      if (!usuarioId || !data?.dinamicaId) return;
      const estado = sorteosAutomaticosPausables.get(data.dinamicaId);
      const estadoTC = sorteosAutomaticosPausablesTablaCompleta.get(data.dinamicaId);
      if (estado && estado.organizadorUsuarioId === usuarioId) estado.pausado = false;
      else if (estadoTC && estadoTC.organizadorUsuarioId === usuarioId) estadoTC.pausado = false;
      else return;
      io!.to(roomSala(data.dinamicaId)).emit('dinamica:sala:pausa-cambio', { pausado: false });
    });

    // Modo manual — el organizador revela una bola a la vez presionando un
    // botón (en vez de la cascada automática cada `MS_ENTRE_INTENTOS`). El
    // resultado YA está calculado y persistido por `iniciarSorteo()` (mismo
    // principio de fairness); esto solo pausa la revelación hasta que el
    // organizador la pide.
    socket.on('dinamica:sala:revelar-siguiente-bola', async (data: { dinamicaId: string }) => {
      const usuarioId = socket.data.usuarioId as string | null;
      if (!usuarioId || !data?.dinamicaId) return;

      const pendiente = sorteosManualesPendientes.get(data.dinamicaId);
      if (pendiente && pendiente.organizadorUsuarioId === usuarioId) {
        const room = roomSala(data.dinamicaId);
        const intento = pendiente.intentos[pendiente.cursor];
        pendiente.cursor++;
        io!.to(room).emit('dinamica:sala:intento', {
          numeroIntento: intento.numeroIntento,
          numeroBoleto: intento.boleto.numeroBoleto,
          esGanador: intento.esGanador,
          lugar: intento.lugar,
        });

        if (pendiente.cursor >= pendiente.intentos.length) {
          sorteosManualesPendientes.delete(data.dinamicaId);
          await cerrarSalaYAnunciar(data.dinamicaId, pendiente.intentos);
        }
        return;
      }

      const pendienteTC = sorteosManualesPendientesTablaCompleta.get(data.dinamicaId);
      if (pendienteTC && pendienteTC.organizadorUsuarioId === usuarioId) {
        const room = roomSala(data.dinamicaId);
        const carta = pendienteTC.cartas[pendienteTC.cursor];
        pendienteTC.cursor++;
        io!.to(room).emit('dinamica:sala:carta-cantada', {
          numeroIntento: carta.numeroIntento,
          cartaIndice: carta.cartaIndice,
          ganadores: carta.ganadores.map((g) => ({ numeroBoleto: g.boleto.numeroBoleto, lugar: g.lugar })),
        });

        if (pendienteTC.cursor >= pendienteTC.cartas.length) {
          sorteosManualesPendientesTablaCompleta.delete(data.dinamicaId);
          await cerrarSalaYAnunciarTablaCompleta(data.dinamicaId, pendienteTC.cartas);
        }
        return;
      }

      socket.emit('dinamica:sala:error', { message: 'No hay un sorteo manual pendiente para esta sala', code: 409 });
    });

    // -----------------------------------------------------------------
    // Disconnecting: avisar presencia a las salas en las que estaba —
    // tiene que ser ANTES de 'disconnect' (ahí `socket.rooms` ya viene
    // vacío, Socket.io ya lo sacó de todos sus rooms).
    // -----------------------------------------------------------------
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('sala-dinamica:')) continue;
        emitirPresenciaSala(room, socket.id).catch((error) => console.error('Error emitiendo presencia de sala:', error));
      }
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

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Recalcula quién está conectado AHORA MISMO al room de una sala (dedupe
 * por usuarioId — una persona puede tener 2 pestañas abiertas; los
 * invitados anónimos, sin usuarioId, no cuentan) y le avisa a todo el room.
 * `excluirSocketId` se usa desde `disconnecting`: el socket que se está
 * yendo TODAVÍA aparece en `fetchSockets()` en ese momento (el `leave`
 * real ocurre después), así que hay que excluirlo a mano para no
 * reportarlo como conectado un instante de más.
 */
async function emitirPresenciaSala(room: string, excluirSocketId?: string): Promise<void> {
  if (!io) return;
  const sockets = await io.in(room).fetchSockets();
  const idsConectados = new Set<string>();
  for (const s of sockets) {
    if (excluirSocketId && s.id === excluirSocketId) continue;
    const uid = s.data.usuarioId as string | null;
    if (uid) idsConectados.add(uid);
  }
  io.to(room).emit('dinamica:sala:presencia', { usuarioIds: [...idsConectados] });
}

const MS_ENTRE_INTENTOS = 2000;

/**
 * Revela la cascada de intentos del sorteo al ritmo de `MS_ENTRE_INTENTOS`
 * entre cada uno — el resultado completo YA quedó calculado y persistido
 * por `iniciarSorteo()` (fairness: la secuencia debe fijarse antes de
 * revelar nada), esto solo pausa la revelación para sostener el suspenso
 * de la animación (Fase 4.1: transición simple; Fase 4.2 le pondrá la
 * animación cinematográfica de tómbola). Al terminar, cierra la sala.
 */
async function revelarSorteoEnVivo(dinamicaId: string, intentos: IntentoSorteo[]): Promise<void> {
  const room = `sala-dinamica:${dinamicaId}`;
  for (const intento of intentos) {
    if (!io) return;

    // Pausa — revisada ANTES de cada bola (la actual ya se mostró, esto
    // solo detiene el avance a la siguiente) mientras el organizador la
    // tenga pausada.
    while (sorteosAutomaticosPausables.get(dinamicaId)?.pausado) {
      await esperar(200);
      if (!io) return;
    }

    io.to(room).emit('dinamica:sala:intento', {
      numeroIntento: intento.numeroIntento,
      numeroBoleto: intento.boleto.numeroBoleto,
      esGanador: intento.esGanador,
      lugar: intento.lugar,
    });
    const estadoPausa = sorteosAutomaticosPausables.get(dinamicaId);
    if (estadoPausa) estadoPausa.progreso++;
    await esperar(MS_ENTRE_INTENTOS);
  }

  sorteosAutomaticosPausables.delete(dinamicaId);
  await cerrarSalaYAnunciar(dinamicaId, intentos);
}

/** Cierra la sala y anuncia el resultado final — compartido entre el modo
 *  automático (al terminar la cascada temporizada) y el manual (al revelar
 *  la última bola con el botón). */
async function cerrarSalaYAnunciar(dinamicaId: string, intentos: IntentoSorteo[]): Promise<void> {
  const room = `sala-dinamica:${dinamicaId}`;
  const cierre = await cerrarSala(dinamicaId);
  if (!io || !cierre.success) return;

  io.to(room).emit('dinamica:sala:estado-cambio', { estado: 'cerrada' });
  io.to(room).emit('dinamica:sala:sorteo-cerrado', {
    hashVerificacion: cierre.data.hashVerificacion,
    semillaAleatoria: cierre.data.semillaAleatoria,
    ganadores: intentos
      .filter((i) => i.esGanador)
      .map((i) => ({ lugar: i.lugar, numeroBoleto: i.boleto.numeroBoleto, numeroIntento: i.numeroIntento })),
  });
}

/** Equivalente a `revelarSorteoEnVivo` para `tabla_completa` — mismo ritmo
 *  (`MS_ENTRE_INTENTOS`) y misma lógica de pausa, iterando `cartas` en vez
 *  de `intentos`. */
async function revelarSorteoTablaCompletaEnVivo(dinamicaId: string, cartas: CartaCantada[]): Promise<void> {
  const room = `sala-dinamica:${dinamicaId}`;
  for (const carta of cartas) {
    if (!io) return;

    while (sorteosAutomaticosPausablesTablaCompleta.get(dinamicaId)?.pausado) {
      await esperar(200);
      if (!io) return;
    }

    io.to(room).emit('dinamica:sala:carta-cantada', {
      numeroIntento: carta.numeroIntento,
      cartaIndice: carta.cartaIndice,
      ganadores: carta.ganadores.map((g) => ({ numeroBoleto: g.boleto.numeroBoleto, lugar: g.lugar })),
    });
    const estadoPausa = sorteosAutomaticosPausablesTablaCompleta.get(dinamicaId);
    if (estadoPausa) estadoPausa.progreso++;
    await esperar(MS_ENTRE_INTENTOS);
  }

  sorteosAutomaticosPausablesTablaCompleta.delete(dinamicaId);
  await cerrarSalaYAnunciarTablaCompleta(dinamicaId, cartas);
}

/** Equivalente a `cerrarSalaYAnunciar` para `tabla_completa` — el resultado
 *  final son los ganadores de cada carta cantada, no de cada intento. */
async function cerrarSalaYAnunciarTablaCompleta(dinamicaId: string, cartas: CartaCantada[]): Promise<void> {
  const room = `sala-dinamica:${dinamicaId}`;
  const cierre = await cerrarSala(dinamicaId);
  if (!io || !cierre.success) return;

  io.to(room).emit('dinamica:sala:estado-cambio', { estado: 'cerrada' });
  io.to(room).emit('dinamica:sala:sorteo-cerrado', {
    hashVerificacion: cierre.data.hashVerificacion,
    semillaAleatoria: cierre.data.semillaAleatoria,
    ganadores: cartas.flatMap((c) =>
      c.ganadores.map((g) => ({ lugar: g.lugar, numeroBoleto: g.boleto.numeroBoleto, numeroIntento: c.numeroIntento })),
    ),
  });
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
 * Avisa a todos los que están viendo el catálogo de un vendedor (público o
 * privado, logueados o invitados) que el estado de apartado de un artículo
 * cambió — para que actualicen el overlay sin recargar. Ver `marketplace.service.ts`
 * (`apartarArticulo`, `marcarApartadoVendido`, `rechazarApartado`,
 * `liberarApartadosExpirados`).
 */
export function emitirCatalogoEstado(
  vendedorUsuarioId: string,
  datos: { articuloId: string; apartado: boolean; apartadoHasta: string | null; estado?: string }
): void {
  if (!io) return;
  io.to(`catalogo:${vendedorUsuarioId}`).emit('marketplace:catalogo:estado', datos);
}

/**
 * ¿El usuario tiene al menos un socket conectado ahora mismo?
 * Se apoya en el room `usuario:<id>` al que cada socket se une al autenticarse.
 * Usado por ChatYA para decidir si mandar un push (solo si NO está conectado:
 * si está, ya ve el mensaje en vivo y el push sería redundante).
 */
export function estaUsuarioConectado(usuarioId: string): boolean {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`usuario:${usuarioId}`);
  return Boolean(room && room.size > 0);
}

/**
 * Retorna la instancia de Socket.io (para uso avanzado como rooms en ChatYA).
 */
export function obtenerIO(): SocketServer | null {
  return io;
}

/**
 * Nombre de la room de Socket.io de la sala en vivo de una Dinámica —
 * exportado para que controllers HTTP (ej. `postActivarSala`, que no vive
 * dentro de `inicializarSocket`) puedan emitir a la misma room sin
 * duplicar el formato del string. La `const roomSala` de más arriba
 * (dentro del closure de conexión) reusa esta misma función.
 */
export function roomSalaDinamica(dinamicaId: string): string {
  return `sala-dinamica:${dinamicaId}`;
}