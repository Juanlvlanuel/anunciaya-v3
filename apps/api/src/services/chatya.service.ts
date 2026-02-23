/**
 * chatya.service.ts
 * ==================
 * Servicio principal de ChatYA (Chat 1:1).
 * Contiene toda la lógica de negocio para conversaciones y mensajes.
 *
 * UBICACIÓN: apps/api/src/services/chatya.service.ts
 */

import { db } from '../db/index.js';
import {
    chatConversaciones,
    chatMensajes,
    chatBloqueados,
    usuarios,
    negocioSucursales,
    negocios,
    chatReacciones,
    chatMensajesFijados,
    chatContactos,
    ofertas,
} from '../db/schemas/schema.js';
import { eq, and, or, desc, sql, ne } from 'drizzle-orm';
import { emitirAUsuario } from '../socket.js';
import type {
    ModoChatYA,
    ContextoTipo,
    TipoMensaje,
    EstadoMensaje,
    CrearConversacionInput,
    EnviarMensajeInput,
    EditarMensajeInput,
    ReenviarMensajeInput,
    ConversacionResponse,
    MensajeResponse,
    RespuestaServicio,
    PaginacionInput,
    ListaPaginada,
    ContactoInput,
    ContactoResponse,
    BloqueoInput,
    BloqueoResponse,
    ReaccionResponse,
    MensajeFijadoResponse,
    BusquedaMensajesInput,
    BuscarPersonasResponse,
    BuscarNegociosResponse,
} from '../types/chatya.types.js';


// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/**
 * Determina si el usuario es participante1 o participante2 en la conversación.
 * Retorna 'p1', 'p2', o null si no es participante.
 */
function determinarPosicion(
    conv: { participante1Id: string; participante2Id: string },
    usuarioId: string
): 'p1' | 'p2' | null {
    if (conv.participante1Id === usuarioId) return 'p1';
    if (conv.participante2Id === usuarioId) return 'p2';
    return null;
}

/**
 * Verifica si existe un bloqueo entre dos usuarios (en cualquier dirección).
 */
async function existeBloqueo(usuarioA: string, usuarioB: string): Promise<boolean> {
    const [bloqueo] = await db
        .select({ id: chatBloqueados.id })
        .from(chatBloqueados)
        .where(
            or(
                and(eq(chatBloqueados.usuarioId, usuarioA), eq(chatBloqueados.bloqueadoId, usuarioB)),
                and(eq(chatBloqueados.usuarioId, usuarioB), eq(chatBloqueados.bloqueadoId, usuarioA))
            )
        )
        .limit(1);

    return !!bloqueo;
}

/**
 * Resuelve el nombre legible del contexto de origen de una conversación.
 * Solo hace query para tipos que tienen referencia ('negocio', 'oferta').
 * Para los demás retorna null (cero queries innecesarias).
 */
async function resolverContextoNombre(
    tipo: string | null,
    referenciaId: string | null
): Promise<string | null> {
    if (!referenciaId || !tipo) return null;

    try {
        switch (tipo) {
            case 'negocio': {
                const [neg] = await db
                    .select({ nombre: negocios.nombre })
                    .from(negocios)
                    .where(eq(negocios.id, referenciaId))
                    .limit(1);
                return neg?.nombre ?? null;
            }
            case 'oferta': {
                const [ofe] = await db
                    .select({ titulo: ofertas.titulo })
                    .from(ofertas)
                    .where(eq(ofertas.id, referenciaId))
                    .limit(1);
                return ofe?.titulo ?? null;
            }
            default:
                return null;
        }
    } catch {
        return null;
    }
}

/**
 * Obtiene datos básicos del otro participante para la lista de conversaciones.
 */
async function obtenerDatosParticipante(
    usuarioId: string,
    modo: ModoChatYA,
    sucursalId: string | null
) {
    // Datos básicos del usuario siempre
    const [usuario] = await db
        .select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            avatarUrl: usuarios.avatarUrl,
            negocioId: usuarios.negocioId,
        })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!usuario) return null;

    const datos: ConversacionResponse['otroParticipante'] = {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        avatarUrl: usuario.avatarUrl,
    };

    // Si el modo es comercial, agregar datos del negocio
    if (modo === 'comercial' && usuario.negocioId) {
        const [negocio] = await db
            .select({
                nombre: negocios.nombre,
            })
            .from(negocios)
            .where(eq(negocios.id, usuario.negocioId))
            .limit(1);

        if (negocio) {
            datos.negocioNombre = negocio.nombre;
        }

        // Datos de la sucursal si aplica
        if (sucursalId) {
            const [sucursal] = await db
                .select({
                    nombre: negocioSucursales.nombre,
                    fotoPerfil: negocioSucursales.fotoPerfil,
                })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.id, sucursalId))
                .limit(1);

            if (sucursal) {
                datos.sucursalNombre = sucursal.nombre;
                datos.negocioLogo = sucursal.fotoPerfil ?? undefined;
            }
        }
    }

    return datos;
}

/**
 * Actualiza el preview del último mensaje en la conversación.
 */
async function actualizarPreview(
    conversacionId: string,
    texto: string,
    tipo: TipoMensaje,
    incrementarNoLeidosDe: 'p1' | 'p2',
    emisorId: string
) {
    const textoPreview = tipo === 'texto'
        ? texto.substring(0, 100)
        : tipo === 'imagen' ? '📷 Imagen'
            : tipo === 'audio' ? '🎤 Audio'
                : tipo === 'documento' ? '📎 Documento'
                    : tipo === 'ubicacion' ? '📍 Ubicación'
                        : tipo === 'contacto' ? '👤 Contacto'
                            : tipo === 'sistema' ? texto.substring(0, 100)
                                : texto.substring(0, 100);

    const incremento = incrementarNoLeidosDe === 'p1'
        ? { noLeidosP1: sql`no_leidos_p1 + 1` }
        : { noLeidosP2: sql`no_leidos_p2 + 1` };

    await db
        .update(chatConversaciones)
        .set({
            ultimoMensajeTexto: textoPreview,
            ultimoMensajeFecha: new Date().toISOString(),
            ultimoMensajeTipo: tipo,
            ultimoMensajeEstado: 'enviado' as EstadoMensaje,
            ultimoMensajeEmisorId: emisorId,
            updatedAt: new Date().toISOString(),
            ...incremento,
        })
        .where(eq(chatConversaciones.id, conversacionId));
}

// =============================================================================
// 1. LISTAR CONVERSACIONES
// =============================================================================

export async function listarConversaciones(
    usuarioId: string,
    modo: ModoChatYA,
    paginacion: PaginacionInput,
    archivadas: boolean = false,
    sucursalId: string | null = null
): Promise<RespuestaServicio<ListaPaginada<ConversacionResponse>>> {
    try {
        // Construir condiciones para P1
        const condicionesP1 = [
            eq(chatConversaciones.participante1Id, usuarioId),
            eq(chatConversaciones.participante1Modo, modo),
            eq(chatConversaciones.eliminadaPorP1, false),
            eq(chatConversaciones.archivadaPorP1, archivadas),
            ne(chatConversaciones.contextoTipo, 'notas'),
        ];

        // Construir condiciones para P2
        const condicionesP2 = [
            eq(chatConversaciones.participante2Id, usuarioId),
            eq(chatConversaciones.participante2Modo, modo),
            eq(chatConversaciones.eliminadaPorP2, false),
            eq(chatConversaciones.archivadaPorP2, archivadas),
            ne(chatConversaciones.contextoTipo, 'notas'),
        ];

        // En modo comercial: filtrar por sucursal activa
        if (sucursalId) {
            condicionesP1.push(eq(chatConversaciones.participante1SucursalId, sucursalId));
            condicionesP2.push(eq(chatConversaciones.participante2SucursalId, sucursalId));
        }

        const whereClause = or(and(...condicionesP1), and(...condicionesP2));

        // Buscar conversaciones
        const conversaciones = await db
            .select()
            .from(chatConversaciones)
            .where(whereClause)
            .orderBy(desc(chatConversaciones.updatedAt))
            .limit(paginacion.limit)
            .offset(paginacion.offset);

        // Contar total (misma condición)
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(chatConversaciones)
            .where(whereClause);

        // Mapear conversaciones con datos del otro participante
        const items: ConversacionResponse[] = await Promise.all(
            conversaciones.map(async (conv) => {
                const pos = determinarPosicion(conv, usuarioId)!;
                const esP1 = pos === 'p1';

                const otroId = esP1 ? conv.participante2Id : conv.participante1Id;
                const otroModo = esP1 ? conv.participante2Modo : conv.participante1Modo;
                const otroSucursalId = esP1 ? conv.participante2SucursalId : conv.participante1SucursalId;

                const otroParticipante = await obtenerDatosParticipante(
                    otroId,
                    otroModo as ModoChatYA,
                    otroSucursalId
                );

                const contextoNombre = await resolverContextoNombre(
                    conv.contextoTipo,
                    conv.contextoReferenciaId
                );

                return {
                    id: conv.id,
                    participante1Id: conv.participante1Id,
                    participante1Modo: conv.participante1Modo as ModoChatYA,
                    participante1SucursalId: conv.participante1SucursalId,
                    participante2Id: conv.participante2Id,
                    participante2Modo: conv.participante2Modo as ModoChatYA,
                    participante2SucursalId: conv.participante2SucursalId,
                    contextoTipo: conv.contextoTipo as ContextoTipo,
                    contextoReferenciaId: conv.contextoReferenciaId,
                    contextoNombre,
                    ultimoMensajeTexto: conv.ultimoMensajeTexto,
                    ultimoMensajeFecha: conv.ultimoMensajeFecha,
                    ultimoMensajeTipo: conv.ultimoMensajeTipo as TipoMensaje | null,
                    ultimoMensajeEstado: (conv.ultimoMensajeEstado as EstadoMensaje) ?? null,
                    ultimoMensajeEmisorId: conv.ultimoMensajeEmisorId ?? null,
                    noLeidos: esP1 ? conv.noLeidosP1 : conv.noLeidosP2,
                    fijada: esP1 ? conv.fijadaPorP1 : conv.fijadaPorP2,
                    archivada: esP1 ? conv.archivadaPorP1 : conv.archivadaPorP2,
                    silenciada: esP1 ? conv.silenciadaPorP1 : conv.silenciadaPorP2,
                    createdAt: conv.createdAt ?? '',
                    updatedAt: conv.updatedAt ?? '',
                    otroParticipante: otroParticipante ?? undefined,
                };
            })
        );

        return {
            success: true,
            message: 'Conversaciones obtenidas',
            data: {
                items,
                total: countResult?.count || 0,
                limit: paginacion.limit,
                offset: paginacion.offset,
            },
        };
    } catch (error) {
        console.error('Error en listarConversaciones:', error);
        return { success: false, message: 'Error al listar conversaciones', code: 500 };
    }
}

// =============================================================================
// 2. OBTENER CONVERSACIÓN
// =============================================================================

export async function obtenerConversacion(
    conversacionId: string,
    usuarioId: string
): Promise<RespuestaServicio<ConversacionResponse>> {
    try {
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso a esta conversación', code: 403 };
        }

        const esP1 = pos === 'p1';
        const otroId = esP1 ? conv.participante2Id : conv.participante1Id;
        const otroModo = esP1 ? conv.participante2Modo : conv.participante1Modo;
        const otroSucursalId = esP1 ? conv.participante2SucursalId : conv.participante1SucursalId;

        const otroParticipante = await obtenerDatosParticipante(
            otroId,
            otroModo as ModoChatYA,
            otroSucursalId
        );

        const contextoNombre = await resolverContextoNombre(
            conv.contextoTipo,
            conv.contextoReferenciaId
        );

        return {
            success: true,
            message: 'Conversación obtenida',
            data: {
                id: conv.id,
                participante1Id: conv.participante1Id,
                participante1Modo: conv.participante1Modo as ModoChatYA,
                participante1SucursalId: conv.participante1SucursalId,
                participante2Id: conv.participante2Id,
                participante2Modo: conv.participante2Modo as ModoChatYA,
                participante2SucursalId: conv.participante2SucursalId,
                contextoTipo: conv.contextoTipo as ContextoTipo,
                contextoReferenciaId: conv.contextoReferenciaId,
                contextoNombre,
                ultimoMensajeTexto: conv.ultimoMensajeTexto,
                ultimoMensajeFecha: conv.ultimoMensajeFecha,
                ultimoMensajeTipo: conv.ultimoMensajeTipo as TipoMensaje | null,
                ultimoMensajeEstado: (conv.ultimoMensajeEstado as EstadoMensaje) ?? null,
                ultimoMensajeEmisorId: conv.ultimoMensajeEmisorId ?? null,
                noLeidos: esP1 ? conv.noLeidosP1 : conv.noLeidosP2,
                fijada: esP1 ? conv.fijadaPorP1 : conv.fijadaPorP2,
                archivada: esP1 ? conv.archivadaPorP1 : conv.archivadaPorP2,
                silenciada: esP1 ? conv.silenciadaPorP1 : conv.silenciadaPorP2,
                createdAt: conv.createdAt ?? '',
                updatedAt: conv.updatedAt ?? '',
                otroParticipante: otroParticipante ?? undefined,
            },
        };
    } catch (error) {
        console.error('Error en obtenerConversacion:', error);
        return { success: false, message: 'Error al obtener conversación', code: 500 };
    }
}

// =============================================================================
// 3. CREAR O OBTENER CONVERSACIÓN
// =============================================================================

export async function crearObtenerConversacion(
    input: CrearConversacionInput,
    usuarioId: string
): Promise<RespuestaServicio<ConversacionResponse>> {
    try {
        // Verificar bloqueo
        const bloqueado = await existeBloqueo(usuarioId, input.participante2Id);
        if (bloqueado) {
            return { success: false, message: 'No puedes iniciar conversación con este usuario', code: 403 };
        }

        // Buscar conversación existente (en cualquier dirección)
        // Incluye sucursalId para diferenciar chats con distintas sucursales del mismo negocio
        const [existente] = await db
            .select()
            .from(chatConversaciones)
            .where(
                or(
                    and(
                        eq(chatConversaciones.participante1Id, usuarioId),
                        eq(chatConversaciones.participante2Id, input.participante2Id),
                        eq(chatConversaciones.participante1Modo, input.participante1Modo),
                        eq(chatConversaciones.participante2Modo, input.participante2Modo),
                        input.participante1SucursalId
                            ? eq(chatConversaciones.participante1SucursalId, input.participante1SucursalId)
                            : sql`${chatConversaciones.participante1SucursalId} IS NULL`,
                        input.participante2SucursalId
                            ? eq(chatConversaciones.participante2SucursalId, input.participante2SucursalId)
                            : sql`${chatConversaciones.participante2SucursalId} IS NULL`
                    ),
                    and(
                        eq(chatConversaciones.participante1Id, input.participante2Id),
                        eq(chatConversaciones.participante2Id, usuarioId),
                        eq(chatConversaciones.participante1Modo, input.participante2Modo),
                        eq(chatConversaciones.participante2Modo, input.participante1Modo),
                        input.participante2SucursalId
                            ? eq(chatConversaciones.participante1SucursalId, input.participante2SucursalId)
                            : sql`${chatConversaciones.participante1SucursalId} IS NULL`,
                        input.participante1SucursalId
                            ? eq(chatConversaciones.participante2SucursalId, input.participante1SucursalId)
                            : sql`${chatConversaciones.participante2SucursalId} IS NULL`
                    )
                )
            )
            .limit(1);

        if (existente) {
            // Si el usuario la había eliminado, "restaurarla"
            const pos = determinarPosicion(existente, usuarioId)!;

            if (pos === 'p1' && existente.eliminadaPorP1) {
                await db
                    .update(chatConversaciones)
                    .set({ eliminadaPorP1: false })
                    .where(eq(chatConversaciones.id, existente.id));
            } else if (pos === 'p2' && existente.eliminadaPorP2) {
                await db
                    .update(chatConversaciones)
                    .set({ eliminadaPorP2: false })
                    .where(eq(chatConversaciones.id, existente.id));
            }

            return obtenerConversacion(existente.id, usuarioId);
        }

        // Crear nueva conversación
        const [nueva] = await db
            .insert(chatConversaciones)
            .values({
                participante1Id: usuarioId,
                participante1Modo: input.participante1Modo,
                participante1SucursalId: input.participante1SucursalId ?? null,
                participante2Id: input.participante2Id,
                participante2Modo: input.participante2Modo,
                participante2SucursalId: input.participante2SucursalId ?? null,
                contextoTipo: input.contextoTipo ?? 'directo',
                contextoReferenciaId: input.contextoReferenciaId ?? null,
            })
            .returning();

        return obtenerConversacion(nueva.id, usuarioId);
    } catch (error) {
        console.error('Error en crearObtenerConversacion:', error);
        return { success: false, message: 'Error al crear conversación', code: 500 };
    }
}

// =============================================================================
// 3b. OBTENER O CREAR "MIS NOTAS"
// =============================================================================

/**
 * Obtiene o crea la conversación "Mis Notas" del usuario.
 * Es una conversación donde p1 = p2 = usuarioId, con contextoTipo = 'notas'.
 * Se auto-crea la primera vez que se llama.
 */
export async function obtenerOCrearMisNotas(
    usuarioId: string
): Promise<RespuestaServicio<ConversacionResponse>> {
    try {
        // Buscar si ya existe
        const [existente] = await db
            .select()
            .from(chatConversaciones)
            .where(
                and(
                    eq(chatConversaciones.participante1Id, usuarioId),
                    eq(chatConversaciones.participante2Id, usuarioId),
                    eq(chatConversaciones.contextoTipo, 'notas')
                )
            )
            .limit(1);

        if (existente) {
            // Si estaba eliminada, restaurar
            if (existente.eliminadaPorP1) {
                await db
                    .update(chatConversaciones)
                    .set({ eliminadaPorP1: false })
                    .where(eq(chatConversaciones.id, existente.id));
            }

            return {
                success: true,
                message: 'Mis Notas obtenida',
                data: mapearMisNotas(existente),
            };
        }

        // Crear nueva
        const [nueva] = await db
            .insert(chatConversaciones)
            .values({
                participante1Id: usuarioId,
                participante1Modo: 'personal',
                participante1SucursalId: null,
                participante2Id: usuarioId,
                participante2Modo: 'personal',
                participante2SucursalId: null,
                contextoTipo: 'notas',
                contextoReferenciaId: null,
            })
            .returning();

        return {
            success: true,
            message: 'Mis Notas creada',
            data: mapearMisNotas(nueva),
        };
    } catch (error) {
        console.error('Error en obtenerOCrearMisNotas:', error);
        return { success: false, message: 'Error al obtener Mis Notas', code: 500 };
    }
}

/**
 * Helper: Mapea la conversación de "Mis Notas" al response.
 * No tiene "otro participante" porque es consigo mismo.
 */
function mapearMisNotas(
    conv: typeof chatConversaciones.$inferSelect,
): ConversacionResponse {
    return {
        id: conv.id,
        participante1Id: conv.participante1Id,
        participante1Modo: conv.participante1Modo as ModoChatYA,
        participante1SucursalId: conv.participante1SucursalId,
        participante2Id: conv.participante2Id,
        participante2Modo: conv.participante2Modo as ModoChatYA,
        participante2SucursalId: conv.participante2SucursalId,
        contextoTipo: conv.contextoTipo as ContextoTipo,
        contextoReferenciaId: conv.contextoReferenciaId,
        contextoNombre: null,
        ultimoMensajeTexto: conv.ultimoMensajeTexto,
        ultimoMensajeFecha: conv.ultimoMensajeFecha,
        ultimoMensajeTipo: conv.ultimoMensajeTipo as TipoMensaje | null,
        ultimoMensajeEstado: (conv.ultimoMensajeEstado as EstadoMensaje) ?? null,
        ultimoMensajeEmisorId: conv.ultimoMensajeEmisorId ?? null,
        noLeidos: 0,
        fijada: conv.fijadaPorP1,
        archivada: conv.archivadaPorP1,
        silenciada: conv.silenciadaPorP1,
        createdAt: conv.createdAt ?? '',
        updatedAt: conv.updatedAt ?? '',
        otroParticipante: undefined,
    };
}


// =============================================================================
// 4-6. TOGGLES: FIJAR, ARCHIVAR, SILENCIAR
// =============================================================================

async function toggleCampoConversacion(
    conversacionId: string,
    usuarioId: string,
    campo: 'fijar' | 'archivar' | 'silenciar'
): Promise<RespuestaServicio<{ valor: boolean }>> {
    try {
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        const esP1 = pos === 'p1';

        // Determinar campo y valor actual
        let valorActual: boolean;
        let campoDb: string;

        switch (campo) {
            case 'fijar':
                valorActual = esP1 ? conv.fijadaPorP1 : conv.fijadaPorP2;
                campoDb = esP1 ? 'fijadaPorP1' : 'fijadaPorP2';
                break;
            case 'archivar':
                valorActual = esP1 ? conv.archivadaPorP1 : conv.archivadaPorP2;
                campoDb = esP1 ? 'archivadaPorP1' : 'archivadaPorP2';
                break;
            case 'silenciar':
                valorActual = esP1 ? conv.silenciadaPorP1 : conv.silenciadaPorP2;
                campoDb = esP1 ? 'silenciadaPorP1' : 'silenciadaPorP2';
                break;
        }

        const nuevoValor = !valorActual;

        await db
            .update(chatConversaciones)
            .set({ [campoDb]: nuevoValor })
            .where(eq(chatConversaciones.id, conversacionId));

        const accion = campo === 'fijar' ? (nuevoValor ? 'fijada' : 'desfijada')
            : campo === 'archivar' ? (nuevoValor ? 'archivada' : 'desarchivada')
                : (nuevoValor ? 'silenciada' : 'desilenciada');

        return {
            success: true,
            message: `Conversación ${accion}`,
            data: { valor: nuevoValor },
        };
    } catch (error) {
        console.error(`Error en toggle ${campo}:`, error);
        return { success: false, message: `Error al ${campo} conversación`, code: 500 };
    }
}

export async function toggleFijarConversacion(conversacionId: string, usuarioId: string) {
    return toggleCampoConversacion(conversacionId, usuarioId, 'fijar');
}

export async function toggleArchivarConversacion(conversacionId: string, usuarioId: string) {
    return toggleCampoConversacion(conversacionId, usuarioId, 'archivar');
}

export async function toggleSilenciarConversacion(conversacionId: string, usuarioId: string) {
    return toggleCampoConversacion(conversacionId, usuarioId, 'silenciar');
}

// =============================================================================
// 7. ELIMINAR CONVERSACIÓN (SOFT DELETE)
// =============================================================================

export async function eliminarConversacion(
    conversacionId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        const esP1 = pos === 'p1';
        const ahora = new Date().toISOString();

        // Marcar como eliminada por este participante + guardar timestamp de visibilidad
        if (esP1) {
            await db
                .update(chatConversaciones)
                .set({
                    eliminadaPorP1: true,
                    mensajesVisiblesDesdeP1: ahora,
                })
                .where(eq(chatConversaciones.id, conversacionId));
        } else {
            await db
                .update(chatConversaciones)
                .set({
                    eliminadaPorP2: true,
                    mensajesVisiblesDesdeP2: ahora,
                })
                .where(eq(chatConversaciones.id, conversacionId));
        }

        // Limpiar mensajes huérfanos (invisibles para ambos participantes)
        // Si ambos tienen timestamp de visibilidad, borrar mensajes anteriores al más antiguo
        const convParaLimpieza = esP1
            ? { miVisibleDesde: ahora, otroVisibleDesde: conv.mensajesVisiblesDesdeP2 }
            : { miVisibleDesde: ahora, otroVisibleDesde: conv.mensajesVisiblesDesdeP1 };

        if (convParaLimpieza.otroVisibleDesde) {
            // Ambos tienen timestamp → borrar mensajes que ninguno puede ver
            const corte = convParaLimpieza.miVisibleDesde < convParaLimpieza.otroVisibleDesde
                ? convParaLimpieza.miVisibleDesde
                : convParaLimpieza.otroVisibleDesde;

            await db
                .delete(chatMensajes)
                .where(
                    and(
                        eq(chatMensajes.conversacionId, conversacionId),
                        sql`${chatMensajes.createdAt} < ${corte}`
                    )
                );
        }

        // Verificar si AMBOS la eliminaron → hard delete
        const [convActualizada] = await db
            .select({
                eliminadaPorP1: chatConversaciones.eliminadaPorP1,
                eliminadaPorP2: chatConversaciones.eliminadaPorP2,
            })
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (convActualizada?.eliminadaPorP1 && convActualizada?.eliminadaPorP2) {
            // TODO Sprint 6: Limpiar archivos R2 asociados antes del hard delete
            // Los mensajes se eliminan por CASCADE
            await db
                .delete(chatConversaciones)
                .where(eq(chatConversaciones.id, conversacionId));

            return { success: true, message: 'Conversación eliminada permanentemente' };
        }

        return { success: true, message: 'Conversación eliminada' };
    } catch (error) {
        console.error('Error en eliminarConversacion:', error);
        return { success: false, message: 'Error al eliminar conversación', code: 500 };
    }
}

// =============================================================================
// 8. LISTAR MENSAJES (PAGINADOS)
// =============================================================================

export async function listarMensajes(
    conversacionId: string,
    usuarioId: string,
    paginacion: PaginacionInput
): Promise<RespuestaServicio<ListaPaginada<MensajeResponse>>> {
    try {
        // Verificar acceso
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        // Determinar desde cuándo este usuario puede ver mensajes
        const visibleDesde = pos === 'p1'
            ? conv.mensajesVisiblesDesdeP1
            : conv.mensajesVisiblesDesdeP2;

        // Construir condiciones base
        const condiciones = [
            eq(chatMensajes.conversacionId, conversacionId),
            eq(chatMensajes.eliminado, false),
        ];

        // Si el usuario eliminó el chat anteriormente, solo mostrar mensajes posteriores
        if (visibleDesde) {
            condiciones.push(
                sql`${chatMensajes.createdAt} >= ${visibleDesde}`
            );
        }

        // Obtener mensajes no eliminados, ordenados por más reciente
        const mensajes = await db
            .select()
            .from(chatMensajes)
            .where(and(...condiciones))
            .orderBy(desc(chatMensajes.createdAt))
            .limit(paginacion.limit)
            .offset(paginacion.offset);

        // Contar total (con el mismo filtro de visibilidad)
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(chatMensajes)
            .where(and(...condiciones));

        const items: MensajeResponse[] = mensajes.map((msg) => ({
            id: msg.id,
            conversacionId: msg.conversacionId,
            emisorId: msg.emisorId,
            emisorModo: msg.emisorModo as ModoChatYA | null,
            emisorSucursalId: msg.emisorSucursalId,
            empleadoId: msg.empleadoId,
            tipo: msg.tipo as TipoMensaje,
            contenido: msg.contenido,
            estado: msg.estado as 'enviado' | 'entregado' | 'leido',
            editado: msg.editado,
            editadoAt: msg.editadoAt,
            eliminado: msg.eliminado,
            eliminadoAt: msg.eliminadoAt,
            respuestaAId: msg.respuestaAId,
            reenviadoDeId: msg.reenviadoDeId,
            createdAt: msg.createdAt ?? '',
            entregadoAt: msg.entregadoAt,
            leidoAt: msg.leidoAt,
        }));

        // ── Poblar respuestaA para mensajes que son respuestas ──
        const idsRespuesta = items
            .filter((m) => m.respuestaAId)
            .map((m) => m.respuestaAId!);

        if (idsRespuesta.length > 0) {
            const mensajesOriginales = await db
                .select({
                    id: chatMensajes.id,
                    contenido: chatMensajes.contenido,
                    tipo: chatMensajes.tipo,
                    emisorId: chatMensajes.emisorId,
                })
                .from(chatMensajes)
                .where(sql`${chatMensajes.id} IN ${idsRespuesta}`);

            const mapaOriginales = new Map(
                mensajesOriginales.map((m) => [m.id, m])
            );

            for (const item of items) {
                if (item.respuestaAId && mapaOriginales.has(item.respuestaAId)) {
                    const orig = mapaOriginales.get(item.respuestaAId)!;
                    item.respuestaA = {
                        id: orig.id,
                        contenido: orig.contenido,
                        tipo: orig.tipo as TipoMensaje,
                        emisorId: orig.emisorId,
                    };
                }
            }
        }

        // ── Poblar reacciones agrupadas por emoji ──
        const idsMsg = items.map((m) => m.id);

        if (idsMsg.length > 0) {
            const reaccionesRaw = await db
                .select({
                    mensajeId: chatReacciones.mensajeId,
                    emoji: chatReacciones.emoji,
                    usuarioId: chatReacciones.usuarioId,
                })
                .from(chatReacciones)
                .where(sql`${chatReacciones.mensajeId} IN ${idsMsg}`);

            // Agrupar: { mensajeId -> { emoji -> [usuarioIds] } }
            const mapaReacciones = new Map<string, Map<string, string[]>>();
            for (const r of reaccionesRaw) {
                if (!mapaReacciones.has(r.mensajeId)) {
                    mapaReacciones.set(r.mensajeId, new Map());
                }
                const emojiMap = mapaReacciones.get(r.mensajeId)!;
                if (!emojiMap.has(r.emoji)) {
                    emojiMap.set(r.emoji, []);
                }
                emojiMap.get(r.emoji)!.push(r.usuarioId);
            }

            for (const item of items) {
                const emojiMap = mapaReacciones.get(item.id);
                if (emojiMap) {
                    item.reacciones = Array.from(emojiMap.entries()).map(([emoji, usuarios]) => ({
                        emoji,
                        cantidad: usuarios.length,
                        usuarios,
                    }));
                }
            }
        }

        return {
            success: true,
            message: 'Mensajes obtenidos',
            data: {
                items,
                total: countResult?.count || 0,
                limit: paginacion.limit,
                offset: paginacion.offset,
            },
        };
    } catch (error) {
        console.error('Error en listarMensajes:', error);
        return { success: false, message: 'Error al listar mensajes', code: 500 };
    }
}

// =============================================================================
// 9. ENVIAR MENSAJE
// =============================================================================

export async function enviarMensaje(
    input: EnviarMensajeInput
): Promise<RespuestaServicio<MensajeResponse>> {
    try {
        // Verificar que la conversación existe y el usuario es participante
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, input.conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, input.emisorId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso a esta conversación', code: 403 };
        }

        // Verificar bloqueo
        const otroId = pos === 'p1' ? conv.participante2Id : conv.participante1Id;
        const bloqueado = await existeBloqueo(input.emisorId, otroId);
        if (bloqueado) {
            return { success: false, message: 'No puedes enviar mensajes en esta conversación', code: 403 };
        }

        // Insertar mensaje
        const [mensaje] = await db
            .insert(chatMensajes)
            .values({
                conversacionId: input.conversacionId,
                emisorId: input.emisorId,
                emisorModo: input.emisorModo,
                emisorSucursalId: input.emisorSucursalId ?? null,
                empleadoId: input.empleadoId ?? null,
                tipo: input.tipo,
                contenido: input.contenido,
                estado: 'enviado',
                respuestaAId: input.respuestaAId ?? null,
            })
            .returning();

        // Actualizar preview de la conversación
        // En "Mis Notas" (p1 = p2) NO incrementar no leídos
        const esMisNotas = conv.contextoTipo === 'notas';
        if (esMisNotas) {
            // Solo actualizar preview sin incrementar contador
            await db
                .update(chatConversaciones)
                .set({
                    ultimoMensajeTexto: input.tipo === 'texto'
                        ? input.contenido.substring(0, 100)
                        : `[${input.tipo}]`,
                    ultimoMensajeFecha: new Date().toISOString(),
                    ultimoMensajeTipo: input.tipo,
                    ultimoMensajeEstado: 'enviado',
                    ultimoMensajeEmisorId: input.emisorId,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(chatConversaciones.id, input.conversacionId));
        } else {
            const incrementarDe = pos === 'p1' ? 'p2' : 'p1';
            await actualizarPreview(
                input.conversacionId,
                input.contenido,
                input.tipo,
                incrementarDe as 'p1' | 'p2',
                input.emisorId
            );
        }

        // Si el otro participante había eliminado la conversación, restaurarla
        if (pos === 'p1' && conv.eliminadaPorP2) {
            await db
                .update(chatConversaciones)
                .set({ eliminadaPorP2: false })
                .where(eq(chatConversaciones.id, input.conversacionId));
        } else if (pos === 'p2' && conv.eliminadaPorP1) {
            await db
                .update(chatConversaciones)
                .set({ eliminadaPorP1: false })
                .where(eq(chatConversaciones.id, input.conversacionId));
        }

        const mensajeResponse: MensajeResponse = {
            id: mensaje.id,
            conversacionId: mensaje.conversacionId,
            emisorId: mensaje.emisorId,
            emisorModo: mensaje.emisorModo as ModoChatYA | null,
            emisorSucursalId: mensaje.emisorSucursalId,
            empleadoId: mensaje.empleadoId,
            tipo: mensaje.tipo as TipoMensaje,
            contenido: mensaje.contenido,
            estado: mensaje.estado as 'enviado' | 'entregado' | 'leido',
            editado: mensaje.editado,
            editadoAt: mensaje.editadoAt,
            eliminado: mensaje.eliminado,
            eliminadoAt: mensaje.eliminadoAt,
            respuestaAId: mensaje.respuestaAId,
            reenviadoDeId: mensaje.reenviadoDeId,
            createdAt: mensaje.createdAt ?? '',
            entregadoAt: mensaje.entregadoAt,
            leidoAt: mensaje.leidoAt,
        };

        // ── Poblar respuestaA si es una respuesta ──
        if (mensaje.respuestaAId) {
            const [msgOriginal] = await db
                .select({
                    id: chatMensajes.id,
                    contenido: chatMensajes.contenido,
                    tipo: chatMensajes.tipo,
                    emisorId: chatMensajes.emisorId,
                })
                .from(chatMensajes)
                .where(eq(chatMensajes.id, mensaje.respuestaAId))
                .limit(1);

            if (msgOriginal) {
                mensajeResponse.respuestaA = {
                    id: msgOriginal.id,
                    contenido: msgOriginal.contenido,
                    tipo: msgOriginal.tipo as TipoMensaje,
                    emisorId: msgOriginal.emisorId,
                };
            }
        }

        // Emitir por Socket.io
        if (esMisNotas) {
            // Mis Notas: emitir solo una vez al emisor (evitar duplicados)
            emitirAUsuario(input.emisorId, 'chatya:mensaje-nuevo', {
                conversacionId: input.conversacionId,
                mensaje: mensajeResponse,
            });
        } else {
            // Chat normal: emitir al otro + al emisor (multi-dispositivo)
            emitirAUsuario(otroId, 'chatya:mensaje-nuevo', {
                conversacionId: input.conversacionId,
                mensaje: mensajeResponse,
            });
            emitirAUsuario(input.emisorId, 'chatya:mensaje-nuevo', {
                conversacionId: input.conversacionId,
                mensaje: mensajeResponse,
            });
        }

        return {
            success: true,
            message: 'Mensaje enviado',
            data: mensajeResponse,
        };
    } catch (error) {
        console.error('Error en enviarMensaje:', error);
        return { success: false, message: 'Error al enviar mensaje', code: 500 };
    }
}

// =============================================================================
// 10. EDITAR MENSAJE
// =============================================================================

export async function editarMensaje(
    input: EditarMensajeInput
): Promise<RespuestaServicio<MensajeResponse>> {
    try {
        // Verificar que el mensaje existe y es del emisor
        const [msg] = await db
            .select()
            .from(chatMensajes)
            .where(eq(chatMensajes.id, input.mensajeId))
            .limit(1);

        if (!msg) {
            return { success: false, message: 'Mensaje no encontrado', code: 404 };
        }

        if (msg.emisorId !== input.emisorId) {
            return { success: false, message: 'Solo puedes editar tus propios mensajes', code: 403 };
        }

        if (msg.tipo !== 'texto') {
            return { success: false, message: 'Solo se pueden editar mensajes de texto', code: 400 };
        }

        if (msg.eliminado) {
            return { success: false, message: 'No se puede editar un mensaje eliminado', code: 400 };
        }

        // Actualizar
        const [actualizado] = await db
            .update(chatMensajes)
            .set({
                contenido: input.contenido,
                editado: true,
                editadoAt: new Date().toISOString(),
            })
            .where(eq(chatMensajes.id, input.mensajeId))
            .returning();

        const mensajeResponse: MensajeResponse = {
            id: actualizado.id,
            conversacionId: actualizado.conversacionId,
            emisorId: actualizado.emisorId,
            emisorModo: actualizado.emisorModo as ModoChatYA | null,
            emisorSucursalId: actualizado.emisorSucursalId,
            empleadoId: actualizado.empleadoId,
            tipo: actualizado.tipo as TipoMensaje,
            contenido: actualizado.contenido,
            estado: actualizado.estado as 'enviado' | 'entregado' | 'leido',
            editado: actualizado.editado,
            editadoAt: actualizado.editadoAt,
            eliminado: actualizado.eliminado,
            eliminadoAt: actualizado.eliminadoAt,
            respuestaAId: actualizado.respuestaAId,
            reenviadoDeId: actualizado.reenviadoDeId,
            createdAt: actualizado.createdAt ?? '',
            entregadoAt: actualizado.entregadoAt,
            leidoAt: actualizado.leidoAt,
        };

        // ── Poblar respuestaA si existe ──
        if (actualizado.respuestaAId) {
            const [msgOriginal] = await db
                .select({
                    id: chatMensajes.id,
                    contenido: chatMensajes.contenido,
                    tipo: chatMensajes.tipo,
                    emisorId: chatMensajes.emisorId,
                })
                .from(chatMensajes)
                .where(eq(chatMensajes.id, actualizado.respuestaAId))
                .limit(1);

            if (msgOriginal) {
                mensajeResponse.respuestaA = {
                    id: msgOriginal.id,
                    contenido: msgOriginal.contenido,
                    tipo: msgOriginal.tipo as TipoMensaje,
                    emisorId: msgOriginal.emisorId,
                };
            }
        }

        // Obtener el otro participante para emitir Socket.io
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, actualizado.conversacionId))
            .limit(1);

        if (conv) {
            const otroId = conv.participante1Id === input.emisorId
                ? conv.participante2Id
                : conv.participante1Id;

            emitirAUsuario(otroId, 'chatya:mensaje-editado', {
                conversacionId: actualizado.conversacionId,
                mensaje: mensajeResponse,
            });

            // Sincronizar otros dispositivos del emisor
            emitirAUsuario(input.emisorId, 'chatya:mensaje-editado', {
                conversacionId: actualizado.conversacionId,
                mensaje: mensajeResponse,
            });
        }

        return {
            success: true,
            message: 'Mensaje editado',
            data: mensajeResponse,
        };
    } catch (error) {
        console.error('Error en editarMensaje:', error);
        return { success: false, message: 'Error al editar mensaje', code: 500 };
    }
}

// =============================================================================
// 11. ELIMINAR MENSAJE (SOFT DELETE)
// =============================================================================

export async function eliminarMensaje(
    mensajeId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        const [msg] = await db
            .select()
            .from(chatMensajes)
            .where(eq(chatMensajes.id, mensajeId))
            .limit(1);

        if (!msg) {
            return { success: false, message: 'Mensaje no encontrado', code: 404 };
        }

        if (msg.emisorId !== usuarioId) {
            return { success: false, message: 'Solo puedes eliminar tus propios mensajes', code: 403 };
        }

        if (msg.eliminado) {
            return { success: false, message: 'El mensaje ya fue eliminado', code: 400 };
        }

        // Soft delete
        await db
            .update(chatMensajes)
            .set({
                eliminado: true,
                eliminadoAt: new Date().toISOString(),
                contenido: 'Se eliminó este mensaje', // Reemplazar contenido
            })
            .where(eq(chatMensajes.id, mensajeId));

        // Emitir por Socket.io
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, msg.conversacionId))
            .limit(1);

        if (conv) {
            const otroId = conv.participante1Id === usuarioId
                ? conv.participante2Id
                : conv.participante1Id;

            const payload = {
                conversacionId: msg.conversacionId,
                mensajeId,
            };

            emitirAUsuario(otroId, 'chatya:mensaje-eliminado', payload);
            emitirAUsuario(usuarioId, 'chatya:mensaje-eliminado', payload);
        }

        return { success: true, message: 'Mensaje eliminado' };
    } catch (error) {
        console.error('Error en eliminarMensaje:', error);
        return { success: false, message: 'Error al eliminar mensaje', code: 500 };
    }
}

// =============================================================================
// 12. REENVIAR MENSAJE (CREA CONVERSACIÓN SI NO EXISTE)
// =============================================================================

export async function reenviarMensaje(
    input: ReenviarMensajeInput
): Promise<RespuestaServicio<MensajeResponse>> {
    try {
        // Obtener mensaje original
        const [msgOriginal] = await db
            .select()
            .from(chatMensajes)
            .where(eq(chatMensajes.id, input.mensajeOriginalId))
            .limit(1);

        if (!msgOriginal) {
            return { success: false, message: 'Mensaje original no encontrado', code: 404 };
        }

        if (msgOriginal.eliminado) {
            return { success: false, message: 'No se puede reenviar un mensaje eliminado', code: 400 };
        }

        // Crear/obtener conversación con el destinatario
        const convResult = await crearObtenerConversacion({
            participante2Id: input.destinatarioId,
            participante1Modo: input.emisorModo,
            participante2Modo: input.destinatarioModo,
            participante1SucursalId: input.emisorSucursalId,
            participante2SucursalId: input.destinatarioSucursalId,
        }, input.emisorId);

        if (!convResult.success || !convResult.data) {
            return { success: false, message: convResult.message, code: convResult.code };
        }

        // Enviar mensaje reenviado en la conversación destino
        const resultado = await enviarMensaje({
            conversacionId: convResult.data.id,
            emisorId: input.emisorId,
            emisorModo: input.emisorModo,
            emisorSucursalId: input.emisorSucursalId,
            tipo: msgOriginal.tipo as TipoMensaje,
            contenido: msgOriginal.contenido,
            respuestaAId: null,
        });

        // Marcar como reenviado (actualizar el reenviado_de_id)
        if (resultado.success && resultado.data) {
            await db
                .update(chatMensajes)
                .set({ reenviadoDeId: input.mensajeOriginalId })
                .where(eq(chatMensajes.id, resultado.data.id));

            resultado.data.reenviadoDeId = input.mensajeOriginalId;
        }

        return resultado;
    } catch (error) {
        console.error('Error en reenviarMensaje:', error);
        return { success: false, message: 'Error al reenviar mensaje', code: 500 };
    }
}

// =============================================================================
// 13. MARCAR MENSAJES COMO LEÍDOS
// =============================================================================

export async function marcarMensajesLeidos(
    conversacionId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        const esP1 = pos === 'p1';
        const otroId = esP1 ? conv.participante2Id : conv.participante1Id;

        // Marcar todos los mensajes del OTRO como leídos
        const ahora = new Date().toISOString();
        await db
            .update(chatMensajes)
            .set({
                estado: 'leido',
                leidoAt: ahora,
            })
            .where(
                and(
                    eq(chatMensajes.conversacionId, conversacionId),
                    eq(chatMensajes.emisorId, otroId),
                    ne(chatMensajes.estado, 'leido'),
                    eq(chatMensajes.eliminado, false)
                )
            );

        // Resetear contador de no leídos y actualizar estado del último mensaje si es del otro
        if (esP1) {
            await db
                .update(chatConversaciones)
                .set({ noLeidosP1: 0 })
                .where(eq(chatConversaciones.id, conversacionId));
        } else {
            await db
                .update(chatConversaciones)
                .set({ noLeidosP2: 0 })
                .where(eq(chatConversaciones.id, conversacionId));
        }

        // Si el último mensaje es del otro, actualizar su estado a 'leido' en la conversación
        await db
            .update(chatConversaciones)
            .set({ ultimoMensajeEstado: 'leido' })
            .where(
                and(
                    eq(chatConversaciones.id, conversacionId),
                    eq(chatConversaciones.ultimoMensajeEmisorId, otroId)
                )
            );

        // Emitir palomitas azules al OTRO usuario (todos sus dispositivos)
        emitirAUsuario(otroId, 'chatya:leido', {
            conversacionId,
            leidoPor: usuarioId,
            leidoAt: ahora,
        });

        // También sincronizar al usuario que leyó (sus otros dispositivos)
        emitirAUsuario(usuarioId, 'chatya:leido', {
            conversacionId,
            leidoPor: usuarioId,
            leidoAt: ahora,
        });

        return { success: true, message: 'Mensajes marcados como leídos' };
    } catch (error) {
        console.error('Error en marcarMensajesLeidos:', error);
        return { success: false, message: 'Error al marcar como leídos', code: 500 };
    }
}


// =============================================================================
// 14. LISTAR CONTACTOS
// =============================================================================

export async function listarContactos(
    usuarioId: string,
    tipo: 'personal' | 'comercial'
): Promise<RespuestaServicio<ContactoResponse[]>> {
    try {
        const contactos = await db
            .select({
                id: chatContactos.id,
                contactoId: chatContactos.contactoId,
                tipo: chatContactos.tipo,
                negocioId: chatContactos.negocioId,
                alias: chatContactos.alias,
                createdAt: chatContactos.createdAt,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(chatContactos)
            .innerJoin(usuarios, eq(chatContactos.contactoId, usuarios.id))
            .where(
                and(
                    eq(chatContactos.usuarioId, usuarioId),
                    eq(chatContactos.tipo, tipo)
                )
            )
            .orderBy(usuarios.nombre);

        // Para contactos comerciales, traer datos del negocio
        const items: ContactoResponse[] = await Promise.all(
            contactos.map(async (c) => {
                const resp: ContactoResponse = {
                    id: c.id,
                    contactoId: c.contactoId,
                    tipo: c.tipo as 'personal' | 'comercial',
                    negocioId: c.negocioId,
                    alias: c.alias,
                    createdAt: c.createdAt ?? '',
                    nombre: c.nombre,
                    apellidos: c.apellidos,
                    avatarUrl: c.avatarUrl,
                };

                if (c.tipo === 'comercial' && c.negocioId) {
                    const [negocio] = await db
                        .select({ nombre: negocios.nombre })
                        .from(negocios)
                        .where(eq(negocios.id, c.negocioId))
                        .limit(1);

                    if (negocio) {
                        resp.negocioNombre = negocio.nombre;
                    }
                }

                return resp;
            })
        );

        return { success: true, message: 'Contactos obtenidos', data: items };
    } catch (error) {
        console.error('Error en listarContactos:', error);
        return { success: false, message: 'Error al listar contactos', code: 500 };
    }
}

// =============================================================================
// 15. AGREGAR CONTACTO
// =============================================================================

export async function agregarContacto(
    usuarioId: string,
    input: ContactoInput
): Promise<RespuestaServicio<{ id: string }>> {
    try {
        if (input.contactoId === usuarioId) {
            return { success: false, message: 'No puedes agregarte a ti mismo', code: 400 };
        }

        // Verificar que el usuario existe
        const [existe] = await db
            .select({ id: usuarios.id })
            .from(usuarios)
            .where(eq(usuarios.id, input.contactoId))
            .limit(1);

        if (!existe) {
            return { success: false, message: 'Usuario no encontrado', code: 404 };
        }

        // Verificar duplicado
        const [existente] = await db
            .select({ id: chatContactos.id })
            .from(chatContactos)
            .where(
                and(
                    eq(chatContactos.usuarioId, usuarioId),
                    eq(chatContactos.contactoId, input.contactoId),
                    eq(chatContactos.tipo, input.tipo)
                )
            )
            .limit(1);

        if (existente) {
            return { success: false, message: 'El contacto ya existe', code: 409 };
        }

        const [nuevo] = await db
            .insert(chatContactos)
            .values({
                usuarioId,
                contactoId: input.contactoId,
                tipo: input.tipo,
                negocioId: input.negocioId ?? null,
                alias: input.alias ?? null,
            })
            .returning({ id: chatContactos.id });

        return { success: true, message: 'Contacto agregado', data: { id: nuevo.id } };
    } catch (error) {
        console.error('Error en agregarContacto:', error);
        return { success: false, message: 'Error al agregar contacto', code: 500 };
    }
}

// =============================================================================
// 16. ELIMINAR CONTACTO
// =============================================================================

export async function eliminarContacto(
    contactoId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        await db
            .delete(chatContactos)
            .where(
                and(
                    eq(chatContactos.id, contactoId),
                    eq(chatContactos.usuarioId, usuarioId)
                )
            );

        return { success: true, message: 'Contacto eliminado' };
    } catch (error) {
        console.error('Error en eliminarContacto:', error);
        return { success: false, message: 'Error al eliminar contacto', code: 500 };
    }
}

// =============================================================================
// 17. LISTAR BLOQUEADOS
// =============================================================================

export async function listarBloqueados(
    usuarioId: string
): Promise<RespuestaServicio<BloqueoResponse[]>> {
    try {
        const bloqueados = await db
            .select({
                id: chatBloqueados.id,
                bloqueadoId: chatBloqueados.bloqueadoId,
                motivo: chatBloqueados.motivo,
                createdAt: chatBloqueados.createdAt,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(chatBloqueados)
            .innerJoin(usuarios, eq(chatBloqueados.bloqueadoId, usuarios.id))
            .where(eq(chatBloqueados.usuarioId, usuarioId))
            .orderBy(desc(chatBloqueados.createdAt));

        const items: BloqueoResponse[] = bloqueados.map((b) => ({
            id: b.id,
            bloqueadoId: b.bloqueadoId,
            motivo: b.motivo,
            createdAt: b.createdAt ?? '',
            nombre: b.nombre,
            apellidos: b.apellidos,
            avatarUrl: b.avatarUrl,
        }));

        return { success: true, message: 'Bloqueados obtenidos', data: items };
    } catch (error) {
        console.error('Error en listarBloqueados:', error);
        return { success: false, message: 'Error al listar bloqueados', code: 500 };
    }
}

// =============================================================================
// 18. BLOQUEAR USUARIO
// =============================================================================

export async function bloquearUsuario(
    usuarioId: string,
    input: BloqueoInput
): Promise<RespuestaServicio<{ id: string }>> {
    try {
        if (input.bloqueadoId === usuarioId) {
            return { success: false, message: 'No puedes bloquearte a ti mismo', code: 400 };
        }

        // Verificar duplicado
        const [existente] = await db
            .select({ id: chatBloqueados.id })
            .from(chatBloqueados)
            .where(
                and(
                    eq(chatBloqueados.usuarioId, usuarioId),
                    eq(chatBloqueados.bloqueadoId, input.bloqueadoId)
                )
            )
            .limit(1);

        if (existente) {
            return { success: false, message: 'El usuario ya está bloqueado', code: 409 };
        }

        const [nuevo] = await db
            .insert(chatBloqueados)
            .values({
                usuarioId,
                bloqueadoId: input.bloqueadoId,
                motivo: input.motivo ?? null,
            })
            .returning({ id: chatBloqueados.id });

        return { success: true, message: 'Usuario bloqueado', data: { id: nuevo.id } };
    } catch (error) {
        console.error('Error en bloquearUsuario:', error);
        return { success: false, message: 'Error al bloquear usuario', code: 500 };
    }
}

// =============================================================================
// 19. DESBLOQUEAR USUARIO
// =============================================================================

export async function desbloquearUsuario(
    bloqueadoId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        await db
            .delete(chatBloqueados)
            .where(
                and(
                    eq(chatBloqueados.usuarioId, usuarioId),
                    eq(chatBloqueados.bloqueadoId, bloqueadoId)
                )
            );

        return { success: true, message: 'Usuario desbloqueado' };
    } catch (error) {
        console.error('Error en desbloquearUsuario:', error);
        return { success: false, message: 'Error al desbloquear', code: 500 };
    }
}

// =============================================================================
// 20. TOGGLE REACCIÓN (agregar si no existe, quitar si existe)
// =============================================================================

export async function toggleReaccion(
    mensajeId: string,
    usuarioId: string,
    emoji: string
): Promise<RespuestaServicio<{ accion: 'agregada' | 'eliminada' }>> {
    try {
        // Verificar que el mensaje existe
        const [msg] = await db
            .select({ id: chatMensajes.id, conversacionId: chatMensajes.conversacionId, contenido: chatMensajes.contenido })
            .from(chatMensajes)
            .where(and(eq(chatMensajes.id, mensajeId), eq(chatMensajes.eliminado, false)))
            .limit(1);

        if (!msg) {
            return { success: false, message: 'Mensaje no encontrado', code: 404 };
        }

        // Verificar acceso a la conversación
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, msg.conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        // Verificar si ya existe la reacción
        const [existente] = await db
            .select({ id: chatReacciones.id })
            .from(chatReacciones)
            .where(
                and(
                    eq(chatReacciones.mensajeId, mensajeId),
                    eq(chatReacciones.usuarioId, usuarioId),
                    eq(chatReacciones.emoji, emoji)
                )
            )
            .limit(1);

        let accion: 'agregada' | 'eliminada';

        if (existente) {
            // Quitar reacción
            await db.delete(chatReacciones).where(eq(chatReacciones.id, existente.id));
            accion = 'eliminada';
        } else {
            // Agregar reacción
            await db.insert(chatReacciones).values({
                mensajeId,
                usuarioId,
                emoji,
            });
            accion = 'agregada';
        }

        // Persistir preview de reacción en la conversación (solo al agregar)
        if (accion === 'agregada') {
            const preview = msg.contenido?.slice(0, 30) || '';
            const truncado = msg.contenido && msg.contenido.length > 30 ? '...' : '';

            await db
                .update(chatConversaciones)
                .set({
                    ultimoMensajeTexto: `Reaccionó con ${emoji} a "${preview}${truncado}"`,
                    ultimoMensajeFecha: new Date().toISOString(),
                    ultimoMensajeEmisorId: usuarioId,
                })
                .where(eq(chatConversaciones.id, msg.conversacionId));
        }

        // Emitir por Socket.io a ambos participantes
        const otroId = conv.participante1Id === usuarioId
            ? conv.participante2Id
            : conv.participante1Id;

        const payload = {
            conversacionId: msg.conversacionId,
            mensajeId,
            emoji,
            usuarioId,
            accion,
        };

        emitirAUsuario(otroId, 'chatya:reaccion', payload);
        emitirAUsuario(usuarioId, 'chatya:reaccion', payload);

        return { success: true, message: `Reacción ${accion}`, data: { accion } };
    } catch (error) {
        console.error('Error en toggleReaccion:', error);
        return { success: false, message: 'Error al reaccionar', code: 500 };
    }
}

// =============================================================================
// 21. OBTENER REACCIONES DE UN MENSAJE
// =============================================================================

export async function obtenerReacciones(
    mensajeId: string,
    _usuarioId: string
): Promise<RespuestaServicio<ReaccionResponse[]>> {
    try {
        const reacciones = await db
            .select({
                emoji: chatReacciones.emoji,
                usuarioId: chatReacciones.usuarioId,
                nombre: usuarios.nombre,
            })
            .from(chatReacciones)
            .innerJoin(usuarios, eq(chatReacciones.usuarioId, usuarios.id))
            .where(eq(chatReacciones.mensajeId, mensajeId));

        // Agrupar por emoji
        const agrupadas = new Map<string, { id: string; nombre: string }[]>();
        for (const r of reacciones) {
            if (!agrupadas.has(r.emoji)) {
                agrupadas.set(r.emoji, []);
            }
            agrupadas.get(r.emoji)!.push({ id: r.usuarioId, nombre: r.nombre });
        }

        const items: ReaccionResponse[] = [];
        for (const [emoji, usrs] of agrupadas) {
            items.push({
                emoji,
                cantidad: usrs.length,
                usuarios: usrs,
            });
        }

        return { success: true, message: 'Reacciones obtenidas', data: items };
    } catch (error) {
        console.error('Error en obtenerReacciones:', error);
        return { success: false, message: 'Error al obtener reacciones', code: 500 };
    }
}

// =============================================================================
// 22. FIJAR MENSAJE EN CONVERSACIÓN
// =============================================================================

export async function fijarMensaje(
    conversacionId: string,
    mensajeId: string,
    usuarioId: string
): Promise<RespuestaServicio<{ id: string }>> {
    try {
        // Verificar acceso
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        // Verificar que el mensaje pertenece a esta conversación
        const [msg] = await db
            .select({ id: chatMensajes.id })
            .from(chatMensajes)
            .where(
                and(
                    eq(chatMensajes.id, mensajeId),
                    eq(chatMensajes.conversacionId, conversacionId),
                    eq(chatMensajes.eliminado, false)
                )
            )
            .limit(1);

        if (!msg) {
            return { success: false, message: 'Mensaje no encontrado en esta conversación', code: 404 };
        }

        // Verificar si ya está fijado
        const [existente] = await db
            .select({ id: chatMensajesFijados.id })
            .from(chatMensajesFijados)
            .where(
                and(
                    eq(chatMensajesFijados.conversacionId, conversacionId),
                    eq(chatMensajesFijados.mensajeId, mensajeId)
                )
            )
            .limit(1);

        if (existente) {
            return { success: false, message: 'El mensaje ya está fijado', code: 409 };
        }

        const [nuevo] = await db
            .insert(chatMensajesFijados)
            .values({
                conversacionId,
                mensajeId,
                fijadoPor: usuarioId,
            })
            .returning({ id: chatMensajesFijados.id });

        // Notificar al otro participante
        const otroId = conv.participante1Id === usuarioId
            ? conv.participante2Id
            : conv.participante1Id;

        const payload = { conversacionId, mensajeId, fijadoPor: usuarioId };
        emitirAUsuario(otroId, 'chatya:mensaje-fijado', payload);
        emitirAUsuario(usuarioId, 'chatya:mensaje-fijado', payload);

        return { success: true, message: 'Mensaje fijado', data: { id: nuevo.id } };
    } catch (error) {
        console.error('Error en fijarMensaje:', error);
        return { success: false, message: 'Error al fijar mensaje', code: 500 };
    }
}

// =============================================================================
// 23. DESFIJAR MENSAJE
// =============================================================================

export async function desfijarMensaje(
    conversacionId: string,
    mensajeId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        // Verificar acceso
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        await db
            .delete(chatMensajesFijados)
            .where(
                and(
                    eq(chatMensajesFijados.conversacionId, conversacionId),
                    eq(chatMensajesFijados.mensajeId, mensajeId)
                )
            );

        // Notificar
        const otroId = conv.participante1Id === usuarioId
            ? conv.participante2Id
            : conv.participante1Id;

        const payload = { conversacionId, mensajeId };
        emitirAUsuario(otroId, 'chatya:mensaje-desfijado', payload);
        emitirAUsuario(usuarioId, 'chatya:mensaje-desfijado', payload);

        return { success: true, message: 'Mensaje desfijado' };
    } catch (error) {
        console.error('Error en desfijarMensaje:', error);
        return { success: false, message: 'Error al desfijar mensaje', code: 500 };
    }
}

// =============================================================================
// 24. LISTAR MENSAJES FIJADOS DE UNA CONVERSACIÓN
// =============================================================================

export async function listarMensajesFijados(
    conversacionId: string,
    usuarioId: string
): Promise<RespuestaServicio<MensajeFijadoResponse[]>> {
    try {
        // Verificar acceso
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        const fijados = await db
            .select({
                id: chatMensajesFijados.id,
                mensajeId: chatMensajesFijados.mensajeId,
                fijadoPor: chatMensajesFijados.fijadoPor,
                createdAt: chatMensajesFijados.createdAt,
                msgContenido: chatMensajes.contenido,
                msgTipo: chatMensajes.tipo,
                msgEmisorId: chatMensajes.emisorId,
                msgCreatedAt: chatMensajes.createdAt,
            })
            .from(chatMensajesFijados)
            .innerJoin(chatMensajes, eq(chatMensajesFijados.mensajeId, chatMensajes.id))
            .where(eq(chatMensajesFijados.conversacionId, conversacionId))
            .orderBy(desc(chatMensajesFijados.createdAt));

        const items: MensajeFijadoResponse[] = fijados.map((f) => ({
            id: f.id,
            mensajeId: f.mensajeId,
            fijadoPor: f.fijadoPor,
            createdAt: f.createdAt ?? '',
            mensaje: {
                id: f.mensajeId,
                contenido: f.msgContenido,
                tipo: f.msgTipo as TipoMensaje,
                emisorId: f.msgEmisorId,
                createdAt: f.msgCreatedAt ?? '',
            },
        }));

        return { success: true, message: 'Mensajes fijados obtenidos', data: items };
    } catch (error) {
        console.error('Error en listarMensajesFijados:', error);
        return { success: false, message: 'Error al listar fijados', code: 500 };
    }
}

// =============================================================================
// 25. BUSCAR MENSAJES DENTRO DE UNA CONVERSACIÓN (FULL-TEXT SEARCH)
// =============================================================================

export async function buscarMensajes(
    input: BusquedaMensajesInput,
    usuarioId: string
): Promise<RespuestaServicio<ListaPaginada<MensajeResponse>>> {
    try {
        // Verificar acceso
        const [conv] = await db
            .select()
            .from(chatConversaciones)
            .where(eq(chatConversaciones.id, input.conversacionId))
            .limit(1);

        if (!conv) {
            return { success: false, message: 'Conversación no encontrada', code: 404 };
        }

        const pos = determinarPosicion(conv, usuarioId);
        if (!pos) {
            return { success: false, message: 'No tienes acceso', code: 403 };
        }

        // Búsqueda por coincidencia parcial (ILIKE) — más intuitiva para chat
        const patron = `%${input.texto.trim()}%`;

        // Determinar desde cuándo este usuario puede ver mensajes
        const visibleDesde = pos === 'p1'
            ? conv.mensajesVisiblesDesdeP1
            : conv.mensajesVisiblesDesdeP2;

        const condiciones = [
            eq(chatMensajes.conversacionId, input.conversacionId),
            eq(chatMensajes.tipo, 'texto'),
            eq(chatMensajes.eliminado, false),
            sql`${chatMensajes.contenido} ILIKE ${patron}`,
        ];

        // Si el usuario eliminó el chat anteriormente, solo buscar en mensajes posteriores
        if (visibleDesde) {
            condiciones.push(
                sql`${chatMensajes.createdAt} >= ${visibleDesde}`
            );
        }

        const filtrosBusqueda = and(...condiciones);

        const mensajes = await db
            .select()
            .from(chatMensajes)
            .where(filtrosBusqueda)
            .orderBy(desc(chatMensajes.createdAt))
            .limit(input.limit)
            .offset(input.offset);

        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(chatMensajes)
            .where(filtrosBusqueda);

        const items: MensajeResponse[] = mensajes.map((msg) => ({
            id: msg.id,
            conversacionId: msg.conversacionId,
            emisorId: msg.emisorId,
            emisorModo: msg.emisorModo as ModoChatYA | null,
            emisorSucursalId: msg.emisorSucursalId,
            empleadoId: msg.empleadoId,
            tipo: msg.tipo as TipoMensaje,
            contenido: msg.contenido,
            estado: msg.estado as 'enviado' | 'entregado' | 'leido',
            editado: msg.editado,
            editadoAt: msg.editadoAt,
            eliminado: msg.eliminado,
            eliminadoAt: msg.eliminadoAt,
            respuestaAId: msg.respuestaAId,
            reenviadoDeId: msg.reenviadoDeId,
            createdAt: msg.createdAt ?? '',
            entregadoAt: msg.entregadoAt,
            leidoAt: msg.leidoAt,
        }));

        return {
            success: true,
            message: `${countResult?.count || 0} resultados encontrados`,
            data: {
                items,
                total: countResult?.count || 0,
                limit: input.limit,
                offset: input.offset,
            },
        };
    } catch (error) {
        console.error('Error en buscarMensajes:', error);
        return { success: false, message: 'Error al buscar mensajes', code: 500 };
    }
}

// =============================================================================
// 26. CONTAR TOTAL NO LEÍDOS (para badge en Navbar)
// =============================================================================

export async function contarTotalNoLeidos(
    usuarioId: string,
    modo: ModoChatYA,
    sucursalId: string | null = null
): Promise<RespuestaServicio<{ total: number }>> {
    try {
        // Condiciones para P1
        const condicionesP1 = [
            eq(chatConversaciones.participante1Id, usuarioId),
            eq(chatConversaciones.participante1Modo, modo),
            eq(chatConversaciones.eliminadaPorP1, false),
        ];

        // Condiciones para P2
        const condicionesP2 = [
            eq(chatConversaciones.participante2Id, usuarioId),
            eq(chatConversaciones.participante2Modo, modo),
            eq(chatConversaciones.eliminadaPorP2, false),
        ];

        // En modo comercial: filtrar por sucursal activa
        if (sucursalId) {
            condicionesP1.push(eq(chatConversaciones.participante1SucursalId, sucursalId));
            condicionesP2.push(eq(chatConversaciones.participante2SucursalId, sucursalId));
        }

        const [resultP1] = await db
            .select({ total: sql<number>`COALESCE(SUM(no_leidos_p1), 0)::int` })
            .from(chatConversaciones)
            .where(and(...condicionesP1));

        const [resultP2] = await db
            .select({ total: sql<number>`COALESCE(SUM(no_leidos_p2), 0)::int` })
            .from(chatConversaciones)
            .where(and(...condicionesP2));

        const total = (resultP1?.total || 0) + (resultP2?.total || 0);

        return { success: true, message: 'Total no leídos', data: { total } };
    } catch (error) {
        console.error('Error en contarTotalNoLeidos:', error);
        return { success: false, message: 'Error al contar no leídos', code: 500 };
    }
}

// =============================================================================
// 27. BUSCAR PERSONAS (para iniciar chat nuevo)
// =============================================================================

/**
 * Busca usuarios por nombre, apellidos o alias.
 * Excluye: al usuario que busca, bloqueados bidireccionales, inactivos/suspendidos.
 * Ordena: alfabéticamente por nombre.
 */
export async function buscarPersonas(
    texto: string,
    usuarioId: string,
    limit: number = 10
): Promise<RespuestaServicio<BuscarPersonasResponse[]>> {
    try {
        const termino = `%${texto.trim()}%`;

        const resultado = await db.execute(sql`
            SELECT
                u.id,
                u.nombre,
                u.apellidos,
                u.alias,
                u.avatar_url
            FROM usuarios u
            WHERE u.estado = 'activo'
              AND u.id != ${usuarioId}
              AND (
                  u.nombre ILIKE ${termino}
                  OR u.apellidos ILIKE ${termino}
                  OR u.alias ILIKE ${termino}
              )
              -- Excluir bloqueados (en cualquier dirección)
              AND NOT EXISTS (
                  SELECT 1 FROM chat_bloqueados cb
                  WHERE (cb.usuario_id = ${usuarioId} AND cb.bloqueado_id = u.id)
                     OR (cb.usuario_id = u.id AND cb.bloqueado_id = ${usuarioId})
              )
            ORDER BY u.nombre ASC, u.apellidos ASC
            LIMIT ${limit}
        `);

        const items = (resultado.rows as unknown as Array<{
            id: string;
            nombre: string;
            apellidos: string;
            alias: string | null;
            avatar_url: string | null;
        }>).map((row) => ({
            id: row.id,
            nombre: row.nombre,
            apellidos: row.apellidos,
            alias: row.alias,
            avatarUrl: row.avatar_url,
        }));

        return { success: true, message: `${items.length} personas encontradas`, data: items };
    } catch (error) {
        console.error('Error en buscarPersonas:', error);
        return { success: false, message: 'Error al buscar personas', code: 500 };
    }
}

// =============================================================================
// 28. BUSCAR NEGOCIOS/SUCURSALES (para iniciar chat nuevo)
// =============================================================================

/**
 * Busca negocios por nombre, descripción, categoría o subcategoría.
 * Filtra por ciudad. Calcula distancia con PostGIS si hay coordenadas.
 * Ordena por distancia (cerca → lejos) si hay GPS, sino alfabético.
 *
 * Si el negocio solo tiene 1 sucursal, sucursalNombre = null.
 * Si tiene múltiples, muestra el nombre de cada sucursal.
 */
export async function buscarNegocios(
    texto: string,
    ciudad: string,
    latitud: number | null,
    longitud: number | null,
    limit: number = 10
): Promise<RespuestaServicio<BuscarNegociosResponse[]>> {
    try {
        const termino = `%${texto.trim()}%`;

        const resultado = await db.execute(sql`
            SELECT
                n.id AS negocio_id,
                n.nombre AS negocio_nombre,
                n.usuario_id,
                s.id AS sucursal_id,
                s.nombre AS sucursal_nombre,
                s.foto_perfil,
                COALESCE(s.calificacion_promedio, 0)::float AS calificacion_promedio,

                -- Contar sucursales del negocio para saber si mostrar nombre
                (
                    SELECT COUNT(*)::int
                    FROM negocio_sucursales sub
                    WHERE sub.negocio_id = n.id AND sub.activa = true
                ) AS total_sucursales,

                -- Categoría principal (primera asignada)
                (
                    SELECT c.nombre
                    FROM asignacion_subcategorias asig
                    JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
                    JOIN categorias_negocio c ON c.id = sc.categoria_id
                    WHERE asig.negocio_id = n.id
                    LIMIT 1
                ) AS categoria,

                -- Distancia en km (null si no hay GPS)
                ${latitud && longitud
                ? sql`
                    ST_Distance(
                        s.ubicacion::geography,
                        ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
                    ) / 1000 AS distancia_km
                `
                : sql`NULL AS distancia_km`
            }

            FROM negocios n
            JOIN negocio_sucursales s ON s.negocio_id = n.id

            -- Join para buscar también por categoría/subcategoría
            LEFT JOIN asignacion_subcategorias asig ON asig.negocio_id = n.id
            LEFT JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
            LEFT JOIN categorias_negocio c ON c.id = sc.categoria_id

            WHERE n.activo = true
              AND n.onboarding_completado = true
              AND s.activa = true
              AND s.ubicacion IS NOT NULL
              AND s.ciudad ILIKE ${ciudad}
              AND (
                  n.nombre ILIKE ${termino}
                  OR n.descripcion ILIKE ${termino}
                  OR c.nombre ILIKE ${termino}
                  OR sc.nombre ILIKE ${termino}
              )

            -- Evitar duplicados por múltiples categorías/subcategorías
            GROUP BY n.id, n.nombre, n.usuario_id, s.id, s.nombre, s.foto_perfil, s.calificacion_promedio, s.ubicacion

            ORDER BY
                ${latitud && longitud
                ? sql`distancia_km ASC NULLS LAST`
                : sql`n.nombre ASC`
            }

            LIMIT ${limit}
        `);

        const items = (resultado.rows as unknown as Array<{
            negocio_id: string;
            negocio_nombre: string;
            usuario_id: string;
            sucursal_id: string;
            sucursal_nombre: string;
            foto_perfil: string | null;
            calificacion_promedio: number;
            total_sucursales: number;
            categoria: string | null;
            distancia_km: number | null;
        }>).map((row) => ({
            negocioNombre: row.negocio_nombre,
            sucursalNombre: row.total_sucursales > 1 ? row.sucursal_nombre : null,
            fotoPerfil: row.foto_perfil,
            calificacionPromedio: Number(row.calificacion_promedio) || 0,
            categoria: row.categoria,
            distanciaKm: row.distancia_km ? Math.round(row.distancia_km * 10) / 10 : null,
            usuarioId: row.usuario_id,
            sucursalId: row.sucursal_id,
            negocioId: row.negocio_id,
        }));

        return { success: true, message: `${items.length} negocios encontrados`, data: items };
    } catch (error) {
        console.error('Error en buscarNegocios:', error);
        return { success: false, message: 'Error al buscar negocios', code: 500 };
    }
}