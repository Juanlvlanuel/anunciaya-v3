/**
 * notificaciones.service.ts
 * ==========================
 * Servicio para el módulo de Notificaciones.
 * Gestiona creación, lectura y marcado de notificaciones.
 * Emite eventos Socket.io para notificaciones en tiempo real.
 *
 * UBICACIÓN: apps/api/src/services/notificaciones.service.ts
 */

import { db } from '../db/index.js';
import { notificaciones } from '../db/schemas/schema.js';
import { empleados, negocioSucursales, negocios } from '../db/schemas/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { emitirAUsuario } from '../socket.js';
import type {
    CrearNotificacionInput,
    NotificacionResponse,
    RespuestaServicio,
    ModoNotificacion,
} from '../types/notificaciones.types.js';

// =============================================================================
// CREAR NOTIFICACIÓN
// =============================================================================

/**
 * Crea una notificación en BD y la emite por Socket.io al usuario.
 * Esta función se llama desde otros services (puntos, cardya, ofertas, etc.)
 */
export async function crearNotificacion(
    input: CrearNotificacionInput
): Promise<RespuestaServicio<NotificacionResponse>> {
    try {
        const [nueva] = await db
            .insert(notificaciones)
            .values({
                usuarioId: input.usuarioId,
                modo: input.modo,
                tipo: input.tipo,
                titulo: input.titulo,
                mensaje: input.mensaje,
                negocioId: input.negocioId ?? null,
                sucursalId: input.sucursalId ?? null,
                referenciaId: input.referenciaId ?? null,
                referenciaTipo: input.referenciaTipo ?? null,
                icono: input.icono ?? null,
                actorImagenUrl: input.actorImagenUrl ?? null,
                actorNombre: input.actorNombre ?? null,
            })
            .returning();

        // Si hay sucursalId, resolver el nombre para enriquecer el payload
        // del socket. Reglas:
        //  - Sucursal principal + negocio con varias sucursales → 'Matriz'
        //  - Sucursal principal + única sucursal → null (no mostrar)
        //  - Otra sucursal → nombre real
        let sucursalNombre: string | null = null;
        if (nueva.sucursalId) {
            const [suc] = await db
                .select({
                    nombre: negocioSucursales.nombre,
                    esPrincipal: negocioSucursales.esPrincipal,
                    negocioId: negocioSucursales.negocioId,
                })
                .from(negocioSucursales)
                .where(eq(negocioSucursales.id, nueva.sucursalId))
                .limit(1);
            if (suc) {
                if (suc.esPrincipal) {
                    const [{ total }] = await db
                        .select({ total: sql<number>`count(*)::int` })
                        .from(negocioSucursales)
                        .where(eq(negocioSucursales.negocioId, suc.negocioId));
                    sucursalNombre = total > 1 ? 'Matriz' : null;
                } else {
                    sucursalNombre = suc.nombre ?? null;
                }
            }
        }

        const notificacionFormateada: NotificacionResponse = {
            id: nueva.id,
            modo: nueva.modo as NotificacionResponse['modo'],
            tipo: nueva.tipo as NotificacionResponse['tipo'],
            titulo: nueva.titulo,
            mensaje: nueva.mensaje,
            negocioId: nueva.negocioId,
            sucursalId: nueva.sucursalId ?? null,
            sucursalNombre,
            referenciaId: nueva.referenciaId,
            referenciaTipo: nueva.referenciaTipo as NotificacionResponse['referenciaTipo'],
            icono: nueva.icono,
            actorImagenUrl: nueva.actorImagenUrl ?? null,
            actorNombre: nueva.actorNombre ?? null,
            leida: nueva.leida,
            leidaAt: nueva.leidaAt,
            createdAt: nueva.createdAt ?? new Date().toISOString(),
        };

        // Emitir por Socket.io al usuario específico
        emitirAUsuario(input.usuarioId, 'notificacion:nueva', notificacionFormateada);

        return {
            success: true,
            message: 'Notificación creada',
            data: notificacionFormateada,
        };
    } catch (error) {
        console.error('Error en crearNotificacion:', error);
        return { success: false, message: 'Error al crear notificación', code: 500 };
    }
}

// =============================================================================
// ELIMINAR NOTIFICACIONES POR REFERENCIA + EMITIR SOCKET
// =============================================================================

/**
 * Borra notificaciones que matchean el filtro y emite `notificacion:eliminada`
 * a cada usuario afectado para que el frontend las quite del panel sin recargar.
 *
 * Uso típico: al cerrar el ciclo de una entidad (voucher entregado, cupón
 * revocado, etc.), las notificaciones pendientes pierden sentido y se limpian
 * en BD — este helper asegura que el panel también se actualice en vivo.
 *
 * @param filtro Condiciones para seleccionar las notificaciones a borrar.
 *               Ej: `{ tipo: 'voucher_pendiente', referenciaId: voucherId }`
 */
export async function eliminarNotificacionesPorReferencia(filtro: {
    tipo?: string;
    referenciaId: string;
    referenciaTipo?: string;
}): Promise<void> {
    try {
        const condiciones = [eq(notificaciones.referenciaId, filtro.referenciaId)];
        if (filtro.tipo) {
            condiciones.push(eq(notificaciones.tipo, filtro.tipo));
        }
        if (filtro.referenciaTipo) {
            condiciones.push(eq(notificaciones.referenciaTipo, filtro.referenciaTipo));
        }

        // Primero seleccionar las notificaciones que se van a borrar para saber
        // a qué usuarios avisarles por socket (y con qué IDs).
        const aEliminar = await db
            .select({
                id: notificaciones.id,
                usuarioId: notificaciones.usuarioId,
            })
            .from(notificaciones)
            .where(and(...condiciones));

        if (aEliminar.length === 0) return;

        // Borrar
        await db.delete(notificaciones).where(and(...condiciones));

        // Agrupar IDs por usuarioId — un usuario puede tener varias notifs del
        // mismo voucher (raro, pero posible en casos de fan-out con duplicados)
        const porUsuario = new Map<string, string[]>();
        for (const n of aEliminar) {
            const lista = porUsuario.get(n.usuarioId) ?? [];
            lista.push(n.id);
            porUsuario.set(n.usuarioId, lista);
        }

        // Emitir a cada usuario afectado
        for (const [usuarioId, ids] of porUsuario.entries()) {
            emitirAUsuario(usuarioId, 'notificacion:eliminada', { ids });
        }
    } catch (error) {
        console.error('Error en eliminarNotificacionesPorReferencia:', error);
    }
}

// =============================================================================
// OBTENER NOTIFICACIONES DEL USUARIO
// =============================================================================

/**
 * Obtiene notificaciones paginadas filtradas por modo.
 */
export async function obtenerNotificaciones(
    usuarioId: string,
    modo: ModoNotificacion,
    limit = 20,
    offset = 0,
    sucursalId?: string | null
): Promise<RespuestaServicio<{ notificaciones: NotificacionResponse[]; totalNoLeidas: number }>> {
    try {
        // Filtro por sucursal activa en modo comercial:
        // - Si hay sucursalId: incluir notificaciones de esa sucursal + las generales (sucursal_id IS NULL)
        // - Sin sucursalId: no filtrar (modo personal o dueño sin contexto de sucursal)
        // Las notificaciones con sucursal_id IS NULL representan eventos a nivel negocio
        // (ej: suscripción renovada) y se muestran en cualquier sucursal activa.
        const filtroSucursal = modo === 'comercial' && sucursalId
            ? sql`AND (${notificaciones.sucursalId} = ${sucursalId} OR ${notificaciones.sucursalId} IS NULL)`
            : sql``;

        // sucursalNombre se resuelve aquí para desambiguar en el panel del cliente:
        // - Si la sucursal es la principal Y el negocio tiene más de una → 'Matriz'
        // - Si la sucursal es la principal Y es la única → null (no mostrar, sería redundante)
        // - Si es otra sucursal → nombre real
        const resultados = await db
            .select({
                id: notificaciones.id,
                modo: notificaciones.modo,
                tipo: notificaciones.tipo,
                titulo: notificaciones.titulo,
                mensaje: notificaciones.mensaje,
                negocioId: notificaciones.negocioId,
                sucursalId: notificaciones.sucursalId,
                sucursalNombre: sql<string | null>`
                    CASE
                        WHEN ${negocioSucursales.esPrincipal} = true AND (
                            SELECT COUNT(*)::int FROM negocio_sucursales ns2
                            WHERE ns2.negocio_id = ${negocioSucursales.negocioId}
                        ) > 1 THEN 'Matriz'
                        WHEN ${negocioSucursales.esPrincipal} = true THEN NULL
                        ELSE ${negocioSucursales.nombre}
                    END
                `,
                referenciaId: notificaciones.referenciaId,
                referenciaTipo: notificaciones.referenciaTipo,
                icono: notificaciones.icono,
                actorImagenUrl: notificaciones.actorImagenUrl,
                actorNombre: notificaciones.actorNombre,
                leida: notificaciones.leida,
                leidaAt: notificaciones.leidaAt,
                createdAt: notificaciones.createdAt,
            })
            .from(notificaciones)
            .leftJoin(negocioSucursales, eq(notificaciones.sucursalId, negocioSucursales.id))
            .where(sql`${and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo)
            )} ${filtroSucursal}`)
            .orderBy(desc(notificaciones.createdAt))
            .limit(limit)
            .offset(offset);

        // Contar no leídas con el mismo filtro
        const [conteo] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(notificaciones)
            .where(sql`${and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo),
                eq(notificaciones.leida, false)
            )} ${filtroSucursal}`);

        const notificacionesFormateadas: NotificacionResponse[] = resultados.map((n) => ({
            id: n.id,
            modo: n.modo as NotificacionResponse['modo'],
            tipo: n.tipo as NotificacionResponse['tipo'],
            titulo: n.titulo,
            mensaje: n.mensaje,
            negocioId: n.negocioId,
            sucursalId: n.sucursalId ?? null,
            sucursalNombre: n.sucursalNombre ?? null,
            referenciaId: n.referenciaId,
            referenciaTipo: n.referenciaTipo as NotificacionResponse['referenciaTipo'],
            icono: n.icono,
            actorImagenUrl: n.actorImagenUrl ?? null,
            actorNombre: n.actorNombre ?? null,
            leida: n.leida,
            leidaAt: n.leidaAt,
            createdAt: n.createdAt ?? new Date().toISOString(),
        }));

        return {
            success: true,
            message: 'Notificaciones obtenidas',
            data: {
                notificaciones: notificacionesFormateadas,
                totalNoLeidas: conteo?.total ?? 0,
            },
        };
    } catch (error) {
        console.error('Error en obtenerNotificaciones:', error);
        return { success: false, message: 'Error al obtener notificaciones', code: 500 };
    }
}

// =============================================================================
// MARCAR COMO LEÍDA
// =============================================================================

export async function marcarComoLeida(
    notificacionId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        const resultado = await db
            .update(notificaciones)
            .set({
                leida: true,
                leidaAt: new Date().toISOString(),
            })
            .where(and(
                eq(notificaciones.id, notificacionId),
                eq(notificaciones.usuarioId, usuarioId)
            ))
            .returning({ id: notificaciones.id });

        if (resultado.length === 0) {
            return { success: false, message: 'Notificación no encontrada', code: 404 };
        }

        return { success: true, message: 'Notificación marcada como leída' };
    } catch (error) {
        console.error('Error en marcarComoLeida:', error);
        return { success: false, message: 'Error al marcar notificación', code: 500 };
    }
}

// =============================================================================
// ELIMINAR NOTIFICACIÓN INDIVIDUAL
// =============================================================================

export async function eliminarNotificacion(
    notificacionId: string,
    usuarioId: string
): Promise<RespuestaServicio> {
    try {
        const resultado = await db
            .delete(notificaciones)
            .where(and(
                eq(notificaciones.id, notificacionId),
                eq(notificaciones.usuarioId, usuarioId)
            ))
            .returning({ id: notificaciones.id });

        if (resultado.length === 0) {
            return { success: false, message: 'Notificación no encontrada', code: 404 };
        }

        return { success: true, message: 'Notificación eliminada' };
    } catch (error) {
        console.error('Error en eliminarNotificacion:', error);
        return { success: false, message: 'Error al eliminar notificación', code: 500 };
    }
}

// =============================================================================
// MARCAR TODAS COMO LEÍDAS
// =============================================================================

export async function marcarTodasComoLeidas(
    usuarioId: string,
    modo: ModoNotificacion,
    sucursalId?: string
): Promise<RespuestaServicio> {
    try {
        // En modo comercial, respeta el contexto de sucursal activa — el usuario
        // solo debe marcar como leídas las notificaciones visibles en ese contexto
        // (las de la sucursal activa + las de negocio con sucursal_id IS NULL).
        // Sin este filtro, desde Matriz se marcaban también las de Sucursal Norte.
        const condiciones = [
            eq(notificaciones.usuarioId, usuarioId),
            eq(notificaciones.modo, modo),
            eq(notificaciones.leida, false),
        ];

        if (sucursalId && modo === 'comercial') {
            condiciones.push(
                sql`(${notificaciones.sucursalId} = ${sucursalId} OR ${notificaciones.sucursalId} IS NULL)`
            );
        }

        await db
            .update(notificaciones)
            .set({
                leida: true,
                leidaAt: new Date().toISOString(),
            })
            .where(and(...condiciones));

        return { success: true, message: 'Todas las notificaciones marcadas como leídas' };
    } catch (error) {
        console.error('Error en marcarTodasComoLeidas:', error);
        return { success: false, message: 'Error al marcar notificaciones', code: 500 };
    }
}

// =============================================================================
// CONTAR NO LEÍDAS (para badge)
// =============================================================================

export async function contarNoLeidas(
    usuarioId: string,
    modo: ModoNotificacion,
    sucursalId?: string | null
): Promise<RespuestaServicio<number>> {
    try {
        const filtroSucursal = modo === 'comercial' && sucursalId
            ? sql`AND (${notificaciones.sucursalId} = ${sucursalId} OR ${notificaciones.sucursalId} IS NULL)`
            : sql``;

        const [conteo] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(notificaciones)
            .where(sql`${and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo),
                eq(notificaciones.leida, false)
            )} ${filtroSucursal}`);

        return {
            success: true,
            message: 'Conteo obtenido',
            data: conteo?.total ?? 0,
        };
    } catch (error) {
        console.error('Error en contarNoLeidas:', error);
        return { success: false, message: 'Error al contar notificaciones', code: 500 };
    }
}

// =============================================================================
// HELPER: Obtener sucursal principal de un negocio
// =============================================================================

/**
 * Busca la sucursal principal (es_principal = true) de un negocio.
 * Útil cuando solo se tiene el negocioId y se necesita el sucursalId.
 */
export async function obtenerSucursalPrincipal(negocioId: string): Promise<string | null> {
    try {
        const [sucursal] = await db
            .select({ id: negocioSucursales.id })
            .from(negocioSucursales)
            .where(and(
                eq(negocioSucursales.negocioId, negocioId),
                eq(negocioSucursales.esPrincipal, true)
            ))
            .limit(1);

        return sucursal?.id ?? null;
    } catch (error) {
        console.error('Error en obtenerSucursalPrincipal:', error);
        return null;
    }
}

// =============================================================================
// NOTIFICAR A EMPLEADOS DE UNA SUCURSAL
// =============================================================================

/**
 * Crea una notificación para cada empleado activo de una sucursal específica.
 * NO incluye al dueño (el dueño se notifica aparte con crearNotificacion).
 *
 * Uso: nueva_resena → notificar empleados de la sucursal donde se dejó.
 *
 * @param sucursalId - UUID de la sucursal
 * @param input - Datos de la notificación (sin usuarioId, se asigna por empleado)
 */
export async function notificarSucursal(
    sucursalId: string,
    input: Omit<CrearNotificacionInput, 'usuarioId'>,
    excluirUsuarioId?: string
): Promise<void> {
    try {
        // Buscar empleados activos de la sucursal
        const empleadosActivos = await db
            .select({ usuarioId: empleados.usuarioId })
            .from(empleados)
            .where(and(
                eq(empleados.sucursalId, sucursalId),
                eq(empleados.activo, true)
            ));

        // Crear notificación para cada empleado (excluyendo al dueño si se indica)
        for (const emp of empleadosActivos) {
            if (excluirUsuarioId && emp.usuarioId === excluirUsuarioId) continue;
            crearNotificacion({
                ...input,
                usuarioId: emp.usuarioId,
                sucursalId,
            }).catch((err) => console.error('Error notificación empleado sucursal:', err));
        }
    } catch (error) {
        console.error('Error en notificarSucursal:', error);
    }
}

// =============================================================================
// NOTIFICAR A TODAS LAS SUCURSALES DE UN NEGOCIO
// =============================================================================

/**
 * Crea una notificación para cada empleado activo de TODAS las sucursales
 * de un negocio. NO incluye al dueño (se notifica aparte).
 *
 * Uso: voucher_pendiente → notificar a todos los empleados del negocio
 *      para que cualquiera pueda entregar la recompensa.
 *
 * @param negocioId - UUID del negocio
 * @param input - Datos de la notificación (sin usuarioId, se asigna por empleado)
 */
export async function notificarNegocioCompleto(
    negocioId: string,
    input: Omit<CrearNotificacionInput, 'usuarioId'>
): Promise<void> {
    try {
        // Obtener el dueño para excluirlo (ya se notifica aparte)
        const [negocio] = await db
            .select({ usuarioId: negocios.usuarioId })
            .from(negocios)
            .where(eq(negocios.id, negocioId))
            .limit(1);

        const duenoId = negocio?.usuarioId;

        // Buscar todas las sucursales del negocio
        const sucursales = await db
            .select({ id: negocioSucursales.id })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.negocioId, negocioId));

        // Buscar empleados activos de todas las sucursales (excluyendo al dueño)
        for (const suc of sucursales) {
            const empleadosActivos = await db
                .select({ usuarioId: empleados.usuarioId })
                .from(empleados)
                .where(and(
                    eq(empleados.sucursalId, suc.id),
                    eq(empleados.activo, true)
                ));

            for (const emp of empleadosActivos) {
                if (emp.usuarioId === duenoId) continue;
                crearNotificacion({
                    ...input,
                    usuarioId: emp.usuarioId,
                    sucursalId: suc.id,
                }).catch((err) => console.error('Error notificación empleado negocio:', err));
            }
        }
    } catch (error) {
        console.error('Error en notificarNegocioCompleto:', error);
    }
}