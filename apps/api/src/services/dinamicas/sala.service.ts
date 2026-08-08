/**
 * ============================================================================
 * SALA EN VIVO DE DINÁMICAS — Fase 4.1
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/dinamicas/sala.service.ts
 *
 * Capa de negocio de la sala (agendar, unirse, chat, moderación, sorteo).
 * NO orquesta Socket.io directamente — eso vive en `socket.ts`, que llama
 * estas funciones y decide qué emitir a qué room (mismo criterio que
 * `dinamicas.controller.ts` es la capa HTTP sobre `dinamicas.service.ts`;
 * aquí `socket.ts` es la capa de transporte en tiempo real).
 *
 * El estado de la sala NO es una columna aparte: reusa `dinamicas.estado`
 * (activa/pospuesta → en_sorteo → cerrada). Moderación en 2 capas:
 * silenciar/expulsar es efímero por evento (`dinamica_sala_moderacion`,
 * se borra con la Dinámica); bloquear es permanente y reusa
 * `chat_bloqueados` tal cual vía `bloquearUsuario()`/`desbloquearUsuario()`
 * de `chatya.service.ts`.
 */

import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    dinamicas,
    dinamicaBoletos,
    dinamicaGanadores,
    dinamicaSalaMensajes,
    dinamicaSalaModeracion,
    chatBloqueados,
    usuarios,
} from '../../db/schemas/schema.js';
import { puedeTransicionar, type EstadoDinamica } from './estados.js';
import { generarSemilla, ejecutarSorteo, calcularHashVerificacion, type BoletoParaSorteo } from './sorteo.js';
import { bloquearUsuario, desbloquearUsuario } from '../chatya.service.js';
import { crearNotificacion } from '../notificaciones.service.js';
import type { ModerarSalaInput } from '../../validations/dinamicas-sala.schema.js';

interface RespuestaError {
    success: false;
    message: string;
    code: number;
}

/** Trae la Dinámica validando que quien llama es el organizador — mismo
 *  criterio que `obtenerParaEdicion` de `dinamicas.service.ts` (privado ahí,
 *  se repite aquí para no acoplar los 2 archivos). */
async function obtenerComoOrganizador(usuarioId: string, dinamicaId: string) {
    const [fila] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
    if (!fila) {
        return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
    }
    if (fila.organizadorUsuarioId !== usuarioId) {
        return { success: false, message: 'No tienes permiso sobre esta Dinámica', code: 403 } satisfies RespuestaError;
    }
    return fila;
}

// =============================================================================
// AGENDAR / CONSULTAR
// =============================================================================

/** El organizador programa la sala — solo cambia `salaProgramadaPara`, el
 *  estado sigue en activa/pospuesta hasta que el organizador la inicie a
 *  mano. Exige K/N ya configurados (se capturan en el composer) — sin ellos
 *  no hay forma de correr el sorteo cuando llegue el momento. */
export async function activarSala(organizadorUsuarioId: string, dinamicaId: string, salaProgramadaPara: string) {
    try {
        const actual = await obtenerComoOrganizador(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        if (actual.estado !== 'activa' && actual.estado !== 'pospuesta') {
            return { success: false, message: 'Solo puedes programar la sala de una Dinámica activa o pospuesta', code: 409 } satisfies RespuestaError;
        }
        if (!actual.numeroIntentosSorteo) {
            return {
                success: false,
                message: 'Configura primero cuántos intentos tendrá el sorteo (edita la Dinámica)',
                code: 409,
            } satisfies RespuestaError;
        }

        const [fila] = await db
            .update(dinamicas)
            .set({ salaProgramadaPara, updatedAt: new Date().toISOString() })
            .where(eq(dinamicas.id, dinamicaId))
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en activarSala:', error);
        return { success: false, message: 'Error al programar la sala', code: 500 } satisfies RespuestaError;
    }
}

/** Snapshot completo de la sala — usado tanto por el endpoint HTTP (carga
 *  inicial / SSR de la ficha pública) como por el socket al unirse.
 *  `usuarioActualId` (opcional) resuelve si el visitante es el organizador y
 *  su estado de moderación (silenciado/expulsado) para esta Dinámica. */
export async function obtenerEstadoSala(dinamicaId: string, usuarioActualId?: string) {
    try {
        const [dinamica] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
        if (!dinamica) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }

        const [mensajes, moderacionPropia, ganadores] = await Promise.all([
            db
                .select({
                    id: dinamicaSalaMensajes.id,
                    usuarioId: dinamicaSalaMensajes.usuarioId,
                    tipo: dinamicaSalaMensajes.tipo,
                    contenido: dinamicaSalaMensajes.contenido,
                    createdAt: dinamicaSalaMensajes.createdAt,
                    nombre: usuarios.nombre,
                    apellidos: usuarios.apellidos,
                    avatarUrl: usuarios.avatarUrl,
                })
                .from(dinamicaSalaMensajes)
                .innerJoin(usuarios, eq(usuarios.id, dinamicaSalaMensajes.usuarioId))
                .where(and(eq(dinamicaSalaMensajes.dinamicaId, dinamicaId), eq(dinamicaSalaMensajes.eliminado, false)))
                .orderBy(desc(dinamicaSalaMensajes.createdAt))
                .limit(50),
            usuarioActualId
                ? db
                    .select({ tipo: dinamicaSalaModeracion.tipo })
                    .from(dinamicaSalaModeracion)
                    .where(and(eq(dinamicaSalaModeracion.dinamicaId, dinamicaId), eq(dinamicaSalaModeracion.usuarioId, usuarioActualId)))
                : Promise.resolve([] as { tipo: string }[]),
            dinamica.estado === 'cerrada'
                ? db
                    .select({
                        lugar: dinamicaGanadores.lugar,
                        numeroIntento: dinamicaGanadores.numeroIntento,
                        numeroBoleto: dinamicaBoletos.numeroBoleto,
                        usuarioId: dinamicaBoletos.usuarioId,
                        nombreManual: dinamicaBoletos.nombreManual,
                        usuarioNombre: usuarios.nombre,
                        usuarioApellidos: usuarios.apellidos,
                    })
                    .from(dinamicaGanadores)
                    .innerJoin(dinamicaBoletos, eq(dinamicaBoletos.id, dinamicaGanadores.boletoId))
                    .leftJoin(usuarios, eq(usuarios.id, dinamicaBoletos.usuarioId))
                    .where(eq(dinamicaGanadores.dinamicaId, dinamicaId))
                    .orderBy(dinamicaGanadores.lugar)
                : Promise.resolve(
                    [] as {
                        lugar: number | null;
                        numeroIntento: number | null;
                        numeroBoleto: number;
                        usuarioId: string | null;
                        nombreManual: string | null;
                        usuarioNombre: string | null;
                        usuarioApellidos: string | null;
                    }[],
                ),
        ]);

        return {
            success: true as const,
            data: {
                estado: dinamica.estado as EstadoDinamica,
                salaProgramadaPara: dinamica.salaProgramadaPara,
                numeroLugaresGanadores: dinamica.numeroLugaresGanadores,
                numeroIntentosSorteo: dinamica.numeroIntentosSorteo,
                esOrganizador: usuarioActualId === dinamica.organizadorUsuarioId,
                miModeracion: {
                    silenciado: moderacionPropia.some((m) => m.tipo === 'silenciado'),
                    expulsado: moderacionPropia.some((m) => m.tipo === 'expulsado'),
                },
                mensajes: mensajes.reverse(),
                ganadores: dinamica.estado === 'cerrada'
                    ? {
                        lista: ganadores,
                        hashVerificacion: dinamica.hashVerificacion,
                        semillaAleatoria: dinamica.semillaAleatoria,
                    }
                    : null,
            },
        };
    } catch (error) {
        console.error('Error en obtenerEstadoSala:', error);
        return { success: false, message: 'Error al obtener el estado de la sala', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// UNIRSE / CHAT
// =============================================================================

/** Valida que un usuario (con cuenta) pueda unirse a la sala — anónimos
 *  (`usuarioId` null) siempre pueden, en modo lectura, no hay nada que
 *  validar contra ellos. Rechaza si fue expulsado de ESTA Dinámica. */
export async function unirseASala(dinamicaId: string, usuarioId: string | null) {
    const [dinamica] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
    if (!dinamica) {
        return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
    }

    if (usuarioId) {
        const [expulsado] = await db
            .select({ id: dinamicaSalaModeracion.id })
            .from(dinamicaSalaModeracion)
            .where(
                and(
                    eq(dinamicaSalaModeracion.dinamicaId, dinamicaId),
                    eq(dinamicaSalaModeracion.usuarioId, usuarioId),
                    eq(dinamicaSalaModeracion.tipo, 'expulsado'),
                ),
            )
            .limit(1);
        if (expulsado) {
            return { success: false, message: 'Fuiste expulsado de esta sala por el organizador', code: 403 } satisfies RespuestaError;
        }
    }

    const estadoSala = await obtenerEstadoSala(dinamicaId, usuarioId ?? undefined);
    if (!estadoSala.success) return estadoSala;
    return { success: true as const, data: estadoSala.data };
}

/** ¿Hay un bloqueo permanente entre el organizador y este usuario, en
 *  cualquier dirección? Mismo criterio bidireccional que `existeBloqueo` de
 *  `chatya.service.ts` (persona↔persona), replicado aquí para no acoplar
 *  ambos archivos por un helper privado. */
async function existeBloqueoConOrganizador(organizadorId: string, usuarioId: string): Promise<boolean> {
    const [fila] = await db
        .select({ id: chatBloqueados.id })
        .from(chatBloqueados)
        .where(
            or(
                and(eq(chatBloqueados.usuarioId, organizadorId), eq(chatBloqueados.bloqueadoId, usuarioId)),
                and(eq(chatBloqueados.usuarioId, usuarioId), eq(chatBloqueados.bloqueadoId, organizadorId)),
            ),
        )
        .limit(1);
    return !!fila;
}

/** Envía un mensaje al chat de la sala — nunca confiar en el cliente:
 *  revalida expulsión/silencio/bloqueo y el estado de la Dinámica del lado
 *  del servidor antes de insertar. */
export async function enviarMensajeSala(dinamicaId: string, usuarioId: string, contenido: string) {
    try {
        const [dinamica] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
        if (!dinamica) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }
        if (!['activa', 'pospuesta', 'en_sorteo'].includes(dinamica.estado)) {
            return { success: false, message: 'El chat de esta sala ya no está disponible', code: 409 } satisfies RespuestaError;
        }

        const moderacion = await db
            .select({ tipo: dinamicaSalaModeracion.tipo })
            .from(dinamicaSalaModeracion)
            .where(and(eq(dinamicaSalaModeracion.dinamicaId, dinamicaId), eq(dinamicaSalaModeracion.usuarioId, usuarioId)));
        if (moderacion.some((m) => m.tipo === 'expulsado')) {
            return { success: false, message: 'Fuiste expulsado de esta sala', code: 403 } satisfies RespuestaError;
        }
        if (moderacion.some((m) => m.tipo === 'silenciado')) {
            return { success: false, message: 'El organizador te silenció en esta sala', code: 403 } satisfies RespuestaError;
        }

        if (usuarioId !== dinamica.organizadorUsuarioId) {
            const bloqueado = await existeBloqueoConOrganizador(dinamica.organizadorUsuarioId, usuarioId);
            if (bloqueado) {
                return { success: false, message: 'No puedes escribir en esta sala', code: 403 } satisfies RespuestaError;
            }
        }

        const [fila] = await db
            .insert(dinamicaSalaMensajes)
            .values({ dinamicaId, usuarioId, tipo: 'texto', contenido })
            .returning();

        const [autor] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos, avatarUrl: usuarios.avatarUrl })
            .from(usuarios)
            .where(eq(usuarios.id, usuarioId))
            .limit(1);

        return { success: true as const, data: { ...fila, ...autor } };
    } catch (error) {
        console.error('Error en enviarMensajeSala:', error);
        return { success: false, message: 'Error al enviar el mensaje', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// MODERACIÓN (organizador)
// =============================================================================

const MENSAJES_SISTEMA: Record<ModerarSalaInput['accion'], (nombre: string) => string> = {
    silenciar: (nombre) => `${nombre} fue silenciado por el organizador`,
    'quitar-silencio': (nombre) => `${nombre} puede volver a escribir en la sala`,
    expulsar: (nombre) => `${nombre} fue expulsado de la sala`,
    'quitar-expulsion': (nombre) => `${nombre} puede volver a unirse a la sala`,
    bloquear: (nombre) => `${nombre} fue bloqueado por el organizador`,
    desbloquear: (nombre) => `${nombre} fue desbloqueado por el organizador`,
};

/** Único punto de entrada para las acciones de moderación del organizador.
 *  Silenciar/expulsar son efímeros (tabla propia, por evento); bloquear es
 *  permanente y delega en `bloquearUsuario`/`desbloquearUsuario` tal cual
 *  (aplica a todas las Dinámicas futuras del organizador y a ChatYA
 *  directo — mismo significado de "bloquear" en el resto de la app). */
export async function moderarParticipante(
    organizadorUsuarioId: string,
    dinamicaId: string,
    input: ModerarSalaInput,
) {
    try {
        const actual = await obtenerComoOrganizador(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        if (input.usuarioId === organizadorUsuarioId) {
            return { success: false, message: 'No puedes moderarte a ti mismo', code: 400 } satisfies RespuestaError;
        }

        const [participante] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos })
            .from(usuarios)
            .where(eq(usuarios.id, input.usuarioId))
            .limit(1);
        if (!participante) {
            return { success: false, message: 'Usuario no encontrado', code: 404 } satisfies RespuestaError;
        }
        const nombreCompleto = `${participante.nombre} ${participante.apellidos ?? ''}`.trim();

        if (input.accion === 'silenciar' || input.accion === 'expulsar') {
            const tipo = input.accion === 'silenciar' ? 'silenciado' : 'expulsado';
            const [existente] = await db
                .select({ id: dinamicaSalaModeracion.id })
                .from(dinamicaSalaModeracion)
                .where(
                    and(
                        eq(dinamicaSalaModeracion.dinamicaId, dinamicaId),
                        eq(dinamicaSalaModeracion.usuarioId, input.usuarioId),
                        eq(dinamicaSalaModeracion.tipo, tipo),
                    ),
                )
                .limit(1);
            if (!existente) {
                await db.insert(dinamicaSalaModeracion).values({
                    dinamicaId,
                    usuarioId: input.usuarioId,
                    tipo,
                    aplicadoPor: organizadorUsuarioId,
                    motivo: input.motivo ?? null,
                });
            }
        } else if (input.accion === 'quitar-silencio' || input.accion === 'quitar-expulsion') {
            const tipo = input.accion === 'quitar-silencio' ? 'silenciado' : 'expulsado';
            await db
                .delete(dinamicaSalaModeracion)
                .where(
                    and(
                        eq(dinamicaSalaModeracion.dinamicaId, dinamicaId),
                        eq(dinamicaSalaModeracion.usuarioId, input.usuarioId),
                        eq(dinamicaSalaModeracion.tipo, tipo),
                    ),
                );
        } else if (input.accion === 'bloquear') {
            const resultado = await bloquearUsuario(organizadorUsuarioId, {
                tipo: 'usuario',
                bloqueadoId: input.usuarioId,
                motivo: input.motivo,
            });
            // Ya bloqueado (409) no es un error real de moderación — se
            // ignora para que la acción sea idempotente desde el panel.
            if (!resultado.success && resultado.code !== 409) {
                return { success: false, message: resultado.message, code: resultado.code ?? 500 } satisfies RespuestaError;
            }
        } else if (input.accion === 'desbloquear') {
            await desbloquearUsuario(input.usuarioId, organizadorUsuarioId);
        }

        const mensajeSistema = MENSAJES_SISTEMA[input.accion](nombreCompleto);
        const [filaSistema] = await db
            .insert(dinamicaSalaMensajes)
            .values({ dinamicaId, usuarioId: organizadorUsuarioId, tipo: 'sistema', contenido: mensajeSistema })
            .returning();

        return { success: true as const, data: { accion: input.accion, usuarioId: input.usuarioId, mensajeSistema: filaSistema } };
    } catch (error) {
        console.error('Error en moderarParticipante:', error);
        return { success: false, message: 'Error al aplicar la moderación', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// SORTEO
// =============================================================================

async function cambiarEstadoSala(dinamicaId: string, actual: EstadoDinamica, nuevo: EstadoDinamica, extra?: Record<string, unknown>) {
    if (!puedeTransicionar(actual, nuevo)) {
        return { success: false, message: `No se puede pasar la sala de "${actual}" a "${nuevo}"`, code: 409 } satisfies RespuestaError;
    }
    const [fila] = await db
        .update(dinamicas)
        .set({ estado: nuevo, updatedAt: new Date().toISOString(), ...extra })
        .where(eq(dinamicas.id, dinamicaId))
        .returning();
    return { success: true as const, data: fila };
}

/**
 * El organizador inicia el sorteo — SOLO cuando ya llegó la hora programada
 * (transición manual, no cron: el organizador conduce el evento en vivo).
 * Calcula el resultado COMPLETO de una vez (fairness: la secuencia debe
 * quedar fija antes de revelar nada) y lo persiste — la revelación gradual
 * al frontend, con pausas entre cada intento, es responsabilidad del caller
 * (`socket.ts`), que después de emitir el último intento llama a
 * `cerrarSala()`.
 */
export async function iniciarSorteo(organizadorUsuarioId: string, dinamicaId: string) {
    try {
        const actual = await obtenerComoOrganizador(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        if (!actual.salaProgramadaPara) {
            return { success: false, message: 'Primero programa la sala con una fecha', code: 409 } satisfies RespuestaError;
        }
        if (new Date(actual.salaProgramadaPara).getTime() > Date.now()) {
            return { success: false, message: 'Todavía no llega la hora programada de la sala', code: 409 } satisfies RespuestaError;
        }
        if (!actual.numeroIntentosSorteo) {
            return { success: false, message: 'El sorteo no tiene configurado el número de intentos', code: 409 } satisfies RespuestaError;
        }

        const boletosPagados = await db
            .select({ id: dinamicaBoletos.id, numeroBoleto: dinamicaBoletos.numeroBoleto })
            .from(dinamicaBoletos)
            .where(and(eq(dinamicaBoletos.dinamicaId, dinamicaId), eq(dinamicaBoletos.estado, 'pagado')));

        const pool: BoletoParaSorteo[] = boletosPagados;
        if (pool.length < actual.numeroIntentosSorteo) {
            return {
                success: false,
                message: `No hay boletos pagados suficientes: se necesitan ${actual.numeroIntentosSorteo} y hay ${pool.length}`,
                code: 409,
            } satisfies RespuestaError;
        }

        const transicion = await cambiarEstadoSala(dinamicaId, actual.estado as EstadoDinamica, 'en_sorteo');
        if (!transicion.success) return transicion;

        const semilla = generarSemilla();
        const resultado = ejecutarSorteo(pool, semilla, actual.numeroIntentosSorteo, actual.numeroLugaresGanadores);
        const hashVerificacion = calcularHashVerificacion(dinamicaId, semilla, resultado.intentos);

        await db.update(dinamicas).set({
            semillaAleatoria: semilla,
            timestampSorteo: new Date().toISOString(),
            hashVerificacion,
        }).where(eq(dinamicas.id, dinamicaId));

        await db.insert(dinamicaGanadores).values(
            resultado.ganadores.map((g) => ({
                dinamicaId,
                boletoId: g.boleto.id,
                lugar: g.lugar as number,
                numeroIntento: g.numeroIntento,
            })),
        );

        return { success: true as const, data: { dinamica: transicion.data, resultado, hashVerificacion } };
    } catch (error) {
        console.error('Error en iniciarSorteo:', error);
        return { success: false, message: 'Error al iniciar el sorteo', code: 500 } satisfies RespuestaError;
    }
}

/** Cierra la sala DESPUÉS de que el caller terminó de revelar todos los
 *  intentos — transiciona en_sorteo → cerrada y avisa a cada participante
 *  con cuenta AY si ganó o no. Los ganadores ya quedaron persistidos por
 *  `iniciarSorteo()`; aquí solo se leen para redactar las notificaciones. */
export async function cerrarSala(dinamicaId: string) {
    try {
        const [dinamica] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
        if (!dinamica) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }

        const transicion = await cambiarEstadoSala(dinamicaId, dinamica.estado as EstadoDinamica, 'cerrada');
        if (!transicion.success) return transicion;

        const [ganadores, participantes] = await Promise.all([
            db
                .select({ lugar: dinamicaGanadores.lugar, usuarioId: dinamicaBoletos.usuarioId, numeroBoleto: dinamicaBoletos.numeroBoleto })
                .from(dinamicaGanadores)
                .innerJoin(dinamicaBoletos, eq(dinamicaBoletos.id, dinamicaGanadores.boletoId))
                .where(eq(dinamicaGanadores.dinamicaId, dinamicaId)),
            db
                .select({ usuarioId: dinamicaBoletos.usuarioId })
                .from(dinamicaBoletos)
                .where(and(eq(dinamicaBoletos.dinamicaId, dinamicaId), eq(dinamicaBoletos.estado, 'pagado'), sql`${dinamicaBoletos.usuarioId} IS NOT NULL`)),
        ]);

        const ganadoresPorUsuario = new Map(ganadores.filter((g) => g.usuarioId).map((g) => [g.usuarioId as string, g]));
        const usuarioIds = [...new Set(participantes.map((p) => p.usuarioId as string))];

        await Promise.all(
            usuarioIds.map((usuarioId) => {
                const ganador = ganadoresPorUsuario.get(usuarioId);
                const mensaje = ganador
                    ? `¡Ganaste el lugar #${ganador.lugar} de "${dinamica.titulo}" con el boleto #${ganador.numeroBoleto}!`
                    : `El sorteo de "${dinamica.titulo}" ya se realizó — esta vez no resultaste ganador.`;
                return crearNotificacion({
                    usuarioId,
                    modo: 'personal',
                    tipo: 'dinamica_resultado',
                    titulo: ganador ? '¡Ganaste!' : 'Resultado del sorteo',
                    mensaje,
                    referenciaId: dinamicaId,
                    referenciaTipo: 'dinamica',
                }).catch(() => undefined);
            }),
        );

        return { success: true as const, data: transicion.data };
    } catch (error) {
        console.error('Error en cerrarSala:', error);
        return { success: false, message: 'Error al cerrar la sala', code: 500 } satisfies RespuestaError;
    }
}
