/**
 * clientes.service.ts
 * ====================
 * Lógica de negocio para el módulo Clientes en Business Studio
 * 
 * Ubicación: apps/api/src/services/clientes.service.ts
 * 
 * FUNCIONES:
 * 1. obtenerKPIsClientes        - 4 KPIs para header de página
 * 2. obtenerClientes            - Lista con filtros y paginación
 * 3. obtenerDetalleCliente      - Detalle completo de un cliente
 * 4. obtenerHistorialCliente    - Transacciones de un cliente específico
 * 
 * CONSUMIDO POR:
 * - clientes.controller.ts
 */

import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    puntosBilletera,
    puntosTransacciones,
    puntosConfiguracion,
    usuarios,
    empleados,
    negocioSucursales,
    vouchersCanje,
    scanyaTurnos,
} from '../db/schemas/schema.js';
import type {
    RespuestaServicio,
    KPIsClientes,
    ClienteCompleto,
    ClienteDetalle,
    TransaccionPuntos,
} from '../types/puntos.types.js';

// =============================================================================
// HELPER: Obtener IDs de clientes que tienen transacciones en una sucursal
// =============================================================================

/**
 * Las billeteras (puntos_billetera) son por negocio, NO por sucursal.
 * Para filtrar clientes por sucursal, buscamos quiénes tienen
 * transacciones registradas en esa sucursal específica.
 */
async function obtenerClienteIdsPorSucursal(
    negocioId: string,
    sucursalId: string
): Promise<string[]> {
    const clientesSucursal = await db
        .selectDistinct({ usuarioId: puntosTransacciones.clienteId })
        .from(puntosTransacciones)
        .where(
            and(
                eq(puntosTransacciones.negocioId, negocioId),
                eq(puntosTransacciones.sucursalId, sucursalId)
            )
        );

    return clientesSucursal.map(c => c.usuarioId);
}

// =============================================================================
// 1. OBTENER KPIs CLIENTES
// =============================================================================

/**
 * Obtiene las 4 métricas principales para la página de Clientes BS:
 * - Total clientes (con billetera en este negocio)
 * - Distribución por nivel (bronce, plata, oro)
 * - Nuevos este mes (billeteras creadas este mes)
 * - Inactivos 30+ días (sin actividad en los últimos 30 días)
 * 
 * Filtra por sucursalId: solo clientes que tienen transacciones en esa sucursal
 */
export async function obtenerKPIsClientes(
    negocioId: string,
    sucursalId?: string
): Promise<RespuestaServicio<KPIsClientes>> {
    try {
        // Si hay filtro de sucursal, obtener IDs de clientes de esa sucursal
        let clienteIdsFiltro: string[] | null = null;

        if (sucursalId) {
            clienteIdsFiltro = await obtenerClienteIdsPorSucursal(negocioId, sucursalId);

            if (clienteIdsFiltro.length === 0) {
                return {
                    success: true,
                    message: 'KPIs de clientes obtenidos',
                    data: {
                        totalClientes: 0,
                        distribucionNivel: { bronce: 0, plata: 0, oro: 0 },
                        nuevosEsteMes: 0,
                        inactivos30Dias: 0,
                    },
                    code: 200,
                };
            }
        }

        // Condiciones base
        const condiciones = [eq(puntosBilletera.negocioId, negocioId)];
        if (clienteIdsFiltro) {
            condiciones.push(inArray(puntosBilletera.usuarioId, clienteIdsFiltro));
        }

        // Query 1: Total + distribución por nivel (DISTINCT por usuario para evitar duplicados)
        const [metricas] = await db
            .select({
                total: sql<number>`COUNT(DISTINCT ${puntosBilletera.usuarioId})`,
                bronce: sql<number>`COUNT(DISTINCT CASE WHEN nivel_actual = 'bronce' THEN ${puntosBilletera.usuarioId} END)`,
                plata: sql<number>`COUNT(DISTINCT CASE WHEN nivel_actual = 'plata' THEN ${puntosBilletera.usuarioId} END)`,
                oro: sql<number>`COUNT(DISTINCT CASE WHEN nivel_actual = 'oro' THEN ${puntosBilletera.usuarioId} END)`,
            })
            .from(puntosBilletera)
            .where(and(...condiciones));

        // Query 2: Nuevos este mes (billeteras creadas desde inicio del mes)
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const condicionesNuevos = [
            ...condiciones,
            sql`${puntosBilletera.createdAt} >= ${inicioMes.toISOString()}`,
        ];

        const [nuevos] = await db
            .select({ count: sql<number>`COUNT(DISTINCT ${puntosBilletera.usuarioId})` })
            .from(puntosBilletera)
            .where(and(...condicionesNuevos));

        // Query 3: Inactivos 30+ días
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);

        const condicionesInactivos = [
            ...condiciones,
            sql`${puntosBilletera.ultimaActividad} < ${hace30Dias.toISOString()}`,
        ];

        const [inactivos] = await db
            .select({ count: sql<number>`COUNT(DISTINCT ${puntosBilletera.usuarioId})` })
            .from(puntosBilletera)
            .where(and(...condicionesInactivos));

        return {
            success: true,
            message: 'KPIs de clientes obtenidos',
            data: {
                totalClientes: Number(metricas.total),
                distribucionNivel: {
                    bronce: Number(metricas.bronce),
                    plata: Number(metricas.plata),
                    oro: Number(metricas.oro),
                },
                nuevosEsteMes: Number(nuevos.count),
                inactivos30Dias: Number(inactivos.count),
            },
            code: 200,
        };
    } catch (error) {
        console.error('Error al obtener KPIs clientes:', error);
        return {
            success: false,
            message: 'Error al obtener métricas de clientes',
            code: 500,
        };
    }
}

// =============================================================================
// 2. OBTENER LISTA DE CLIENTES CON FILTROS
// =============================================================================

interface FiltrosClientes {
    sucursalId?: string;
    busqueda?: string;
    nivel?: 'bronce' | 'plata' | 'oro';
    limit: number;
    offset: number;
}

/**
 * Lista todos los clientes del negocio con filtros opcionales:
 * - Búsqueda por nombre o teléfono (ILIKE)
 * - Filtro por nivel CardYA (bronce, plata, oro)
 * - Paginación con limit/offset
 * - Filtro por sucursal (clientes con transacciones en esa sucursal)
 * 
 * Retorna: nombre, teléfono, avatar, puntos, nivel, última actividad, visitas
 */
export async function obtenerClientes(
    negocioId: string,
    filtros: FiltrosClientes
): Promise<RespuestaServicio<ClienteCompleto[]>> {
    try {
        const condiciones = [eq(puntosBilletera.negocioId, negocioId)];

        // Filtro por nivel
        if (filtros.nivel) {
            condiciones.push(eq(puntosBilletera.nivelActual, filtros.nivel));
        }

        // Filtro por sucursal
        if (filtros.sucursalId) {
            const clienteIds = await obtenerClienteIdsPorSucursal(negocioId, filtros.sucursalId);

            if (clienteIds.length === 0) {
                return { success: true, message: 'Clientes obtenidos', data: [], code: 200 };
            }
            condiciones.push(inArray(puntosBilletera.usuarioId, clienteIds));
        }

        // Filtro búsqueda (nombre o teléfono) - agregar a condiciones ANTES de la query
        if (filtros.busqueda) {
            const busquedaLike = `%${filtros.busqueda}%`;
            condiciones.push(
                sql`(CONCAT(${usuarios.nombre}, ' ', COALESCE(${usuarios.apellidos}, '')) ILIKE ${busquedaLike}
        OR ${usuarios.telefono} ILIKE ${busquedaLike})`
            );
        }

        // Query base - GROUP BY para evitar duplicados si hay múltiples billeteras
        const query = db
            .select({
                id: puntosBilletera.usuarioId,
                nombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', COALESCE(${usuarios.apellidos}, ''))`,
                telefono: usuarios.telefono,
                avatarUrl: usuarios.avatarUrl,
                puntosDisponibles: sql<number>`SUM(${puntosBilletera.puntosDisponibles})`,
                puntosAcumuladosTotal: sql<number>`SUM(${puntosBilletera.puntosAcumuladosTotal})`,
                nivelActual: sql<string>`CASE MAX(CASE ${puntosBilletera.nivelActual} WHEN 'oro' THEN 3 WHEN 'plata' THEN 2 ELSE 1 END)
                    WHEN 3 THEN 'oro' WHEN 2 THEN 'plata' ELSE 'bronce' END`,
                ultimaActividad: sql<string>`MAX(${puntosBilletera.ultimaActividad})`,
            })
            .from(puntosBilletera)
            .innerJoin(usuarios, eq(puntosBilletera.usuarioId, usuarios.id))
            .where(and(...condiciones))
            .groupBy(puntosBilletera.usuarioId, usuarios.nombre, usuarios.apellidos, usuarios.telefono, usuarios.avatarUrl)
            .$dynamic();

        // Ordenar y paginar
        const clientes = await query
            .orderBy(sql`SUM(${puntosBilletera.puntosDisponibles}) DESC`)
            .limit(filtros.limit)
            .offset(filtros.offset);

        // Contar visitas (transacciones) por cliente
        const clienteIds = clientes.map(c => c.id);

        if (clienteIds.length === 0) {
            return { success: true, message: 'Clientes obtenidos', data: [], code: 200 };
        }

        // Condiciones para contar visitas (respetar filtro de sucursal)
        const condicionesVisitas = [
            eq(puntosTransacciones.negocioId, negocioId),
            inArray(puntosTransacciones.clienteId, clienteIds),
        ];
        if (filtros.sucursalId) {
            condicionesVisitas.push(eq(puntosTransacciones.sucursalId, filtros.sucursalId));
        }

        const visitas = await db
            .select({
                clienteId: puntosTransacciones.clienteId,
                totalVisitas: sql<number>`COUNT(*)`,
            })
            .from(puntosTransacciones)
            .where(and(...condicionesVisitas))
            .groupBy(puntosTransacciones.clienteId);

        const visitasMap = new Map(visitas.map(v => [v.clienteId, Number(v.totalVisitas)]));

        // Combinar clientes con visitas
        const clientesConVisitas: ClienteCompleto[] = clientes.map(c => ({
            id: c.id,
            nombre: c.nombre?.trim() || '',
            telefono: c.telefono,
            avatarUrl: c.avatarUrl,
            puntosDisponibles: Number(c.puntosDisponibles),
            puntosAcumuladosTotal: Number(c.puntosAcumuladosTotal),
            nivelActual: c.nivelActual || 'bronce',
            ultimaActividad: c.ultimaActividad,
            totalVisitas: visitasMap.get(c.id) || 0,
        }));

        return {
            success: true,
            message: 'Clientes obtenidos',
            data: clientesConVisitas,
            code: 200,
        };
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return {
            success: false,
            message: 'Error al obtener clientes',
            code: 500,
        };
    }
}

// =============================================================================
// 3. OBTENER DETALLE DE UN CLIENTE
// =============================================================================

/**
 * Detalle completo de un cliente específico para el modal:
 * - Datos personales (nombre, teléfono, correo, avatar)
 * - Puntos (disponibles, acumulados, canjeados)
 * - Nivel CardYA actual
 * - Estadísticas (visitas, total gastado, promedio compra)
 * - Vouchers (generados, usados)
 * - Fecha de primera compra (cliente desde)
 */
export async function obtenerDetalleCliente(
    negocioId: string,
    clienteId: string
): Promise<RespuestaServicio<ClienteDetalle>> {
    try {
        // Billetera del cliente en este negocio
        const [billetera] = await db
            .select({
                puntosDisponibles: puntosBilletera.puntosDisponibles,
                puntosAcumuladosTotal: puntosBilletera.puntosAcumuladosTotal,
                puntosCanjeadosTotal: puntosBilletera.puntosCanjeadosTotal,
                nivelActual: puntosBilletera.nivelActual,
                ultimaActividad: puntosBilletera.ultimaActividad,
                createdAt: puntosBilletera.createdAt,
            })
            .from(puntosBilletera)
            .where(
                and(
                    eq(puntosBilletera.negocioId, negocioId),
                    eq(puntosBilletera.usuarioId, clienteId)
                )
            );

        if (!billetera) {
            return {
                success: false,
                message: 'Cliente no encontrado en este negocio',
                code: 404,
            };
        }

        // Info del usuario
        const [usuario] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                telefono: usuarios.telefono,
                correo: usuarios.correo,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(eq(usuarios.id, clienteId));

        if (!usuario) {
            return {
                success: false,
                message: 'Usuario no encontrado',
                code: 404,
            };
        }

        // Estadísticas de transacciones
        const [stats] = await db
            .select({
                totalVisitas: sql<number>`COUNT(*)`,
                totalGastado: sql<number>`COALESCE(SUM(monto_compra), 0)`,
                promedioCompra: sql<number>`COALESCE(AVG(monto_compra), 0)`,
            })
            .from(puntosTransacciones)
            .where(
                and(
                    eq(puntosTransacciones.negocioId, negocioId),
                    eq(puntosTransacciones.clienteId, clienteId),
                    sql`estado = 'confirmado'`
                )
            );

        // Vouchers estadísticas
        const [vouchersStats] = await db
            .select({
                totalVouchers: sql<number>`COUNT(*)`,
                vouchersUsados: sql<number>`COUNT(*) FILTER (WHERE estado = 'usado')`,
            })
            .from(vouchersCanje)
            .where(
                and(
                    eq(vouchersCanje.negocioId, negocioId),
                    eq(vouchersCanje.usuarioId, clienteId)
                )
            );

        // Configuración de niveles del negocio
        const [configNiveles] = await db
            .select({
                bronceMax: puntosConfiguracion.nivelBronceMax,
                plataMin: puntosConfiguracion.nivelPlataMin,
                plataMax: puntosConfiguracion.nivelPlataMax,
                oroMin: puntosConfiguracion.nivelOroMin,
            })
            .from(puntosConfiguracion)
            .where(eq(puntosConfiguracion.negocioId, negocioId));

        return {
            success: true,
            message: 'Detalle obtenido',
            data: {
                id: usuario.id,
                nombre: `${usuario.nombre} ${usuario.apellidos || ''}`.trim(),
                telefono: usuario.telefono,
                correo: usuario.correo,
                avatarUrl: usuario.avatarUrl,
                puntosDisponibles: billetera.puntosDisponibles,
                puntosAcumuladosTotal: billetera.puntosAcumuladosTotal,
                puntosCanjeadosTotal: billetera.puntosCanjeadosTotal || 0,
                nivelActual: billetera.nivelActual || 'bronce',
                clienteDesde: billetera.createdAt,
                ultimaActividad: billetera.ultimaActividad,
                totalVisitas: Number(stats.totalVisitas),
                totalGastado: Number(stats.totalGastado),
                promedioCompra: Number(Number(stats.promedioCompra).toFixed(2)),
                totalVouchers: Number(vouchersStats.totalVouchers),
                vouchersUsados: Number(vouchersStats.vouchersUsados),
                // Configuración de niveles para calcular progreso
                configNiveles: configNiveles ? {
                    bronceMax: Number(configNiveles.bronceMax),
                    plataMin: Number(configNiveles.plataMin),
                    plataMax: Number(configNiveles.plataMax),
                    oroMin: Number(configNiveles.oroMin),
                } : null,
            },
            code: 200,
        };
    } catch (error) {
        console.error('Error al obtener detalle cliente:', error);
        return {
            success: false,
            message: 'Error al obtener detalle',
            code: 500,
        };
    }
}

// =============================================================================
// 4. OBTENER HISTORIAL DE TRANSACCIONES DE UN CLIENTE
// =============================================================================

/**
 * Historial de transacciones de un cliente específico.
 * Usado en el modal de detalle del cliente.
 * Incluye: monto, puntos, multiplicador, método de pago, sucursal, operador, fecha.
 */
export async function obtenerHistorialCliente(
    negocioId: string,
    clienteId: string,
    limit: number = 20,
    offset: number = 0
): Promise<RespuestaServicio<TransaccionPuntos[]>> {
    try {
        const transacciones = await db
            .select({
                id: puntosTransacciones.id,
                clienteId: puntosTransacciones.clienteId,
                clienteNombre: sql<string>`CONCAT(${usuarios.nombre}, ' ', COALESCE(${usuarios.apellidos}, ''))`,
                clienteTelefono: usuarios.telefono,
                clienteAvatarUrl: usuarios.avatarUrl,
                montoCompra: puntosTransacciones.montoCompra,
                puntosOtorgados: puntosTransacciones.puntosOtorgados,
                multiplicadorAplicado: puntosTransacciones.multiplicadorAplicado,
                estado: puntosTransacciones.estado,
                concepto: puntosTransacciones.concepto,
                createdAt: puntosTransacciones.createdAt,
                sucursalId: puntosTransacciones.sucursalId,
                sucursalNombre: negocioSucursales.nombre,
                empleadoId: puntosTransacciones.empleadoId,
                empleadoNombre: sql<string>`COALESCE(
          ${empleados.nombre},
          CONCAT(${sql.raw('u2.nombre')}, ' ', ${sql.raw('u2.apellidos')})
        )`,
                empleadoTipo: sql<string>`CASE 
          WHEN ${empleados.id} IS NOT NULL THEN 'empleado'
          WHEN ${sql.raw('u2.id')} IS NOT NULL THEN 'usuario'
          ELSE NULL
        END`,
                // Campos de desglose de pago
                montoEfectivo: puntosTransacciones.montoEfectivo,
                montoTarjeta: puntosTransacciones.montoTarjeta,
                montoTransferencia: puntosTransacciones.montoTransferencia,
                fotoTicketUrl: puntosTransacciones.fotoTicketUrl,
                nota: puntosTransacciones.nota,
                numeroOrden: puntosTransacciones.numeroOrden,
                motivoRevocacion: puntosTransacciones.motivoRevocacion,
            })
            .from(puntosTransacciones)
            .innerJoin(usuarios, eq(puntosTransacciones.clienteId, usuarios.id))
            .leftJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
            .leftJoin(empleados, eq(puntosTransacciones.empleadoId, empleados.id))
            // JOIN a través del turno para obtener el dueño/gerente que registró la venta
            .leftJoin(scanyaTurnos, eq(puntosTransacciones.turnoId, scanyaTurnos.id))
            .leftJoin(
                sql`usuarios u2`,
                sql`${scanyaTurnos.usuarioId} = u2.id`
            )
            .where(
                and(
                    eq(puntosTransacciones.negocioId, negocioId),
                    eq(puntosTransacciones.clienteId, clienteId)
                )
            )
            .orderBy(desc(puntosTransacciones.createdAt))
            .limit(limit)
            .offset(offset);

        // Transformar a formato consistente
        const transaccionesFormateadas: TransaccionPuntos[] = transacciones.map(t => ({
            id: t.id,
            clienteId: t.clienteId,
            clienteNombre: t.clienteNombre?.trim() || '',
            clienteTelefono: t.clienteTelefono,
            clienteAvatarUrl: t.clienteAvatarUrl,
            montoCompra: Number(t.montoCompra),
            puntosOtorgados: t.puntosOtorgados,
            multiplicadorAplicado: Number(t.multiplicadorAplicado),
            estado: t.estado,
            concepto: t.concepto || null,
            createdAt: t.createdAt,
            sucursalId: t.sucursalId,
            sucursalNombre: t.sucursalNombre,
            empleadoId: t.empleadoId,
            empleadoNombre: t.empleadoNombre,
            empleadoTipo: t.empleadoTipo as 'empleado' | 'usuario' | null,
            montoEfectivo: Number(t.montoEfectivo || 0),
            montoTarjeta: Number(t.montoTarjeta || 0),
            montoTransferencia: Number(t.montoTransferencia || 0),
            fotoTicketUrl: t.fotoTicketUrl || null,
            nota: t.nota || null,
            numeroOrden: t.numeroOrden || null,
            motivoRevocacion: t.motivoRevocacion || null,
        }));

        return {
            success: true,
            message: 'Historial obtenido',
            data: transaccionesFormateadas,
            code: 200,
        };
    } catch (error) {
        console.error('Error al obtener historial cliente:', error);
        return {
            success: false,
            message: 'Error al obtener historial',
            code: 500,
        };
    }
}