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
import { empleados, negocioSucursales } from '../db/schemas/schema.js';
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
            })
            .returning();

        const notificacionFormateada: NotificacionResponse = {
            id: nueva.id,
            modo: nueva.modo as NotificacionResponse['modo'],
            tipo: nueva.tipo as NotificacionResponse['tipo'],
            titulo: nueva.titulo,
            mensaje: nueva.mensaje,
            negocioId: nueva.negocioId,
            sucursalId: nueva.sucursalId ?? null,
            referenciaId: nueva.referenciaId,
            referenciaTipo: nueva.referenciaTipo as NotificacionResponse['referenciaTipo'],
            icono: nueva.icono,
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
// OBTENER NOTIFICACIONES DEL USUARIO
// =============================================================================

/**
 * Obtiene notificaciones paginadas filtradas por modo.
 */
export async function obtenerNotificaciones(
    usuarioId: string,
    modo: ModoNotificacion,
    limit = 20,
    offset = 0
): Promise<RespuestaServicio<{ notificaciones: NotificacionResponse[]; totalNoLeidas: number }>> {
    try {
        const resultados = await db
            .select()
            .from(notificaciones)
            .where(and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo)
            ))
            .orderBy(desc(notificaciones.createdAt))
            .limit(limit)
            .offset(offset);

        // Contar no leídas
        const [conteo] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(notificaciones)
            .where(and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo),
                eq(notificaciones.leida, false)
            ));

        const notificacionesFormateadas: NotificacionResponse[] = resultados.map((n) => ({
            id: n.id,
            modo: n.modo as NotificacionResponse['modo'],
            tipo: n.tipo as NotificacionResponse['tipo'],
            titulo: n.titulo,
            mensaje: n.mensaje,
            negocioId: n.negocioId,
            sucursalId: n.sucursalId ?? null,
            referenciaId: n.referenciaId,
            referenciaTipo: n.referenciaTipo as NotificacionResponse['referenciaTipo'],
            icono: n.icono,
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
// MARCAR TODAS COMO LEÍDAS
// =============================================================================

export async function marcarTodasComoLeidas(
    usuarioId: string,
    modo: ModoNotificacion
): Promise<RespuestaServicio> {
    try {
        await db
            .update(notificaciones)
            .set({
                leida: true,
                leidaAt: new Date().toISOString(),
            })
            .where(and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo),
                eq(notificaciones.leida, false)
            ));

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
    modo: ModoNotificacion
): Promise<RespuestaServicio<number>> {
    try {
        const [conteo] = await db
            .select({ total: sql<number>`count(*)::int` })
            .from(notificaciones)
            .where(and(
                eq(notificaciones.usuarioId, usuarioId),
                eq(notificaciones.modo, modo),
                eq(notificaciones.leida, false)
            ));

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
    input: Omit<CrearNotificacionInput, 'usuarioId'>
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

        // Crear notificación para cada empleado
        for (const emp of empleadosActivos) {
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
        // Buscar todas las sucursales del negocio
        const sucursales = await db
            .select({ id: negocioSucursales.id })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.negocioId, negocioId));

        // Buscar empleados activos de todas las sucursales
        for (const suc of sucursales) {
            const empleadosActivos = await db
                .select({ usuarioId: empleados.usuarioId })
                .from(empleados)
                .where(and(
                    eq(empleados.sucursalId, suc.id),
                    eq(empleados.activo, true)
                ));

            for (const emp of empleadosActivos) {
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