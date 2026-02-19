/**
 * ============================================================================
 * DASHBOARD SERVICE - Business Studio (ACTUALIZADO)
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/dashboard.service.ts
 * 
 * PROPÓSITO:
 * Obtener KPIs, métricas y datos para el Dashboard de Business Studio
 * 
 * ACTUALIZACIÓN: Agregadas métricas adicionales para nuevo diseño
 * - Clientes nuevos vs recurrentes
 * - Transacciones con estadísticas (promedio, máximo, mínimo)
 * - Contadores de ofertas y campañas activas
 * - Estadísticas de gráfica de ventas
 * - Feed de interacciones recientes
 * 
 * TABLAS UTILIZADAS:
 * - puntos_transacciones → Ventas, clientes, transacciones
 * - cupon_usos → Cupones canjeados
 * - negocio_sucursales → Rating, vistas, likes
 * - ofertas → Ofertas activas
 * - cupones → Cupones activos
 * - resenas → Reseñas recientes
 * - alertas_seguridad → Alertas del negocio
 * - articulos → Productos (para actividad)
 * 
 * CREADO: Fase 5.4 - Dashboard Business Studio
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

// =============================================================================
// TIPOS
// =============================================================================

type Periodo = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio';

interface RangoFechas {
    inicio: Date;
    fin: Date;
    inicioAnterior: Date;
    finAnterior: Date;
}

interface KPIBasico {
    valor: number;
    valorAnterior: number;
    porcentajeCambio: number;
    tendencia: 'subida' | 'bajada' | 'igual';
}

interface KPIsResponse {
    ventas: KPIBasico & { miniGrafica: number[] };
    clientes: KPIBasico & { nuevos: number; recurrentes: number };
    transacciones: KPIBasico & {
        ticketPromedio: number;
        ticketMaximo: number;
        ticketMinimo: number;
    };
    cuponesCanjeados: KPIBasico;
    ofertasActivas: number;
    followers: number;
    likes: KPIBasico;
    rating: {
        valor: number;
        totalResenas: number;
    };
    vistas: KPIBasico;
}

interface EstadisticasVentas {
    promedioDiario: number;
    diaPico: string;
    mejorVenta: number;
    crecimiento: number;
}
// =============================================================================
// TIPOS DE RESULTADOS DE QUERIES SQL
// =============================================================================

interface MiniGraficaRow {
    total: string | number;
}

interface VentaDiariaRow {
    fecha: string;
    total: string | number;
    transacciones: string | number;
    dia_semana: string;
}

interface CampanaRow {
    id: string;
    tipo: 'oferta' | 'cupon';
    titulo: string;
    descripcion?: string | null;
    valor: string | number;
    fecha_inicio: string;
    fecha_fin: string;
    usos_actuales: string | number;
    limite_usos: string | number | null;
    tipo_campana: 'oferta' | 'cupon';
    expirada: boolean;
    imagen?: string | null;
    total_vistas?: string | number;
    total_clicks?: string | number;
    total_shares?: string | number;
}

interface InteraccionVentaRow {
    id: string;
    monto: string | number;
    created_at: string;
    usuario_nombre: string;
    usuario_avatar: string | null;
}

interface InteraccionCuponRow {
    id: string;
    created_at: string;
    usuario_nombre: string;
    usuario_avatar: string | null;
    descripcion: string;
}

interface InteraccionLikeRow {
    id: string;
    created_at: string;
    usuario_nombre: string;
    usuario_avatar: string | null;
}

interface InteraccionSeguidorRow {
    id: string;
    created_at: string;
    usuario_nombre: string;
    usuario_avatar: string | null;
}

interface InteraccionCompartidoRow {
    id: string;
    total_shares: number;
    updated_at: string;
    created_at: string; // Alias de updated_at en la query
}

interface ResenaRow {
    id: string;
    rating: string | number;
    texto: string;
    created_at: string;
    autor_nombre: string;
    autor_apellidos: string;
    autor_avatar: string | null;
}

interface AlertaRow {
    id: string;
    tipo: string;
    severidad: string;
    titulo: string;
    descripcion: string;
    leida: boolean;
    created_at: string;
}

// =============================================================================
// HELPERS - Zona horaria
// =============================================================================

/**
 * Obtiene la zona horaria del negocio desde la sucursal principal
 */
async function obtenerZonaHorariaNegocio(negocioId: string, sucursalId?: string | null): Promise<string> {
    try {
        const sucursalIdParam = sucursalId ?? null;
        const resultado = await db.execute(sql`
            SELECT zona_horaria 
            FROM negocio_sucursales 
            WHERE negocio_id = ${negocioId}
            AND (
                (${sucursalIdParam}::uuid IS NOT NULL AND id = ${sucursalIdParam}::uuid)
                OR (${sucursalIdParam}::uuid IS NULL AND es_principal = true)
            )
            LIMIT 1
        `);

        const row = resultado.rows[0] as { zona_horaria: string } | undefined;
        return row?.zona_horaria ?? 'America/Mexico_City';
    } catch (error) {
        console.error('Error obteniendo zona horaria:', error);
        return 'America/Mexico_City';
    }
}

/**
 * Obtiene el offset en horas de una zona horaria respecto a UTC
 */
function obtenerOffsetZonaHoraria(zonaHoraria: string): number {
    const offsets: Record<string, number> = {
        'America/Mexico_City': -6,
        'America/Hermosillo': -7,
        'America/Tijuana': -8,
        'America/Cancun': -5,
        'America/Mazatlan': -7,
    };
    return offsets[zonaHoraria] ?? -6;
}

// =============================================================================
// HELPERS - Cálculo de rangos de fechas con zona horaria
// =============================================================================

/**
 * Calcula rangos de fechas ajustados a la zona horaria del negocio.
 * Los rangos se devuelven en UTC para las queries de PostgreSQL.
 */
function calcularRangoFechas(periodo: Periodo, zonaHoraria: string = 'America/Mexico_City'): RangoFechas {
    const offsetHoras = obtenerOffsetZonaHoraria(zonaHoraria);

    const ahoraUTC = new Date();
    const ahoraLocal = new Date(ahoraUTC.getTime() + (offsetHoras * 60 * 60 * 1000));

    const anio = ahoraLocal.getUTCFullYear();
    const mes = ahoraLocal.getUTCMonth();
    const dia = ahoraLocal.getUTCDate();

    const fin = new Date(Date.UTC(anio, mes, dia, 23 - offsetHoras, 59, 59, 999));

    let inicio: Date;
    let inicioAnterior: Date;
    let finAnterior: Date;

    switch (periodo) {
        case 'hoy':
            inicio = new Date(Date.UTC(anio, mes, dia, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 1, -offsetHoras, 0, 0, 0));
            break;

        case 'semana':
            inicio = new Date(Date.UTC(anio, mes, dia - 6, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 13, -offsetHoras, 0, 0, 0));
            break;

        case 'mes':
            inicio = new Date(Date.UTC(anio, mes, dia - 29, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 59, -offsetHoras, 0, 0, 0));
            break;

        case 'trimestre':
            inicio = new Date(Date.UTC(anio, mes, dia - 89, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 179, -offsetHoras, 0, 0, 0));
            break;

        case 'anio':
            inicio = new Date(Date.UTC(anio, mes, dia - 364, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 729, -offsetHoras, 0, 0, 0));
            break;

        default:
            inicio = new Date(Date.UTC(anio, mes, dia - 6, -offsetHoras, 0, 0, 0));
            finAnterior = new Date(inicio.getTime() - 1);
            inicioAnterior = new Date(Date.UTC(anio, mes, dia - 13, -offsetHoras, 0, 0, 0));
    }

    return { inicio, fin, inicioAnterior, finAnterior };
}

function calcularPorcentajeCambio(actual: number, anterior: number): number {
    if (anterior === 0) {
        return actual > 0 ? 100 : 0;
    }
    return Math.round(((actual - anterior) / anterior) * 100);
}

function determinarTendencia(actual: number, anterior: number): 'subida' | 'bajada' | 'igual' {
    if (actual > anterior) return 'subida';
    if (actual < anterior) return 'bajada';
    return 'igual';
}

function obtenerNombreDia(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getUTCDay()];
}

/**
 * Genera fechas completas ajustadas a zona horaria
 */
function generarFechasCompletas(
    inicio: Date,
    fin: Date,
    zonaHoraria: string = 'America/Mexico_City'
): Array<{ fecha: string; diaSemana: string }> {
    const offsetHoras = obtenerOffsetZonaHoraria(zonaHoraria);
    const fechas: Array<{ fecha: string; diaSemana: string }> = [];

    // Convertir inicio/fin a fecha local
    const inicioLocal = new Date(inicio.getTime() + (offsetHoras * 60 * 60 * 1000));
    const finLocal = new Date(fin.getTime() + (offsetHoras * 60 * 60 * 1000));

    const fechaActual = new Date(Date.UTC(
        inicioLocal.getUTCFullYear(),
        inicioLocal.getUTCMonth(),
        inicioLocal.getUTCDate()
    ));

    const fechaFin = new Date(Date.UTC(
        finLocal.getUTCFullYear(),
        finLocal.getUTCMonth(),
        finLocal.getUTCDate()
    ));

    while (fechaActual <= fechaFin) {
        const fechaStr = fechaActual.toISOString().split('T')[0];
        const diaSemana = obtenerNombreDia(fechaActual);
        fechas.push({ fecha: fechaStr, diaSemana });
        fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
    }

    return fechas;
}

// =============================================================================
// OBTENER KPIs DEL DASHBOARD (COMPLETO)
// =============================================================================

export async function obtenerKPIs(
    negocioId: string,
    periodo: Periodo = 'semana',
    sucursalId?: string
): Promise<{ success: boolean; data: KPIsResponse }> {
    try {
        const zonaHoraria = await obtenerZonaHorariaNegocio(negocioId, sucursalId);
        const { inicio, fin, inicioAnterior, finAnterior } = calcularRangoFechas(periodo, zonaHoraria);
        const ahora = new Date().toISOString();
        const sucursalIdParam = sucursalId ?? null;

        // Query para ventas, clientes y transacciones
        const ventasQuery = sql`
            SELECT 
                COALESCE(SUM(CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                    THEN monto_compra ELSE 0 
                END), 0)::numeric as ventas_actual,
                
                COALESCE(SUM(CASE 
                    WHEN created_at >= ${inicioAnterior.toISOString()} 
                     AND created_at <= ${finAnterior.toISOString()}
                     AND estado = 'confirmado'
                    THEN monto_compra ELSE 0 
                END), 0)::numeric as ventas_anterior,

                COUNT(CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                    THEN 1 
                END)::int as transacciones_actual,
                
                COUNT(CASE 
                    WHEN created_at >= ${inicioAnterior.toISOString()} 
                     AND created_at <= ${finAnterior.toISOString()}
                     AND estado = 'confirmado'
                    THEN 1 
                END)::int as transacciones_anterior,

                COALESCE(AVG(CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                    THEN monto_compra 
                END), 0)::numeric as ticket_promedio,
                
                COALESCE(MAX(CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                    THEN monto_compra 
                END), 0)::numeric as ticket_maximo,
                
                COALESCE(MIN(CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                     AND monto_compra > 0
                    THEN monto_compra 
                END), 0)::numeric as ticket_minimo,

                COUNT(DISTINCT CASE 
                    WHEN created_at >= ${inicio.toISOString()} 
                     AND created_at <= ${fin.toISOString()}
                     AND estado = 'confirmado'
                    THEN cliente_id 
                END)::int as clientes_actual,
                
                COUNT(DISTINCT CASE 
                    WHEN created_at >= ${inicioAnterior.toISOString()} 
                     AND created_at <= ${finAnterior.toISOString()}
                     AND estado = 'confirmado'
                    THEN cliente_id 
                END)::int as clientes_anterior
                
            FROM puntos_transacciones
            WHERE negocio_id = ${negocioId}
            AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid)
        `;

        // Query para clientes nuevos vs recurrentes
        const clientesDetalleQuery = sql`
            WITH clientes_periodo AS (
                SELECT DISTINCT cliente_id
                FROM puntos_transacciones
                WHERE negocio_id = ${negocioId}
                  AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid)
                  AND estado = 'confirmado'
                  AND created_at >= ${inicio.toISOString()}
                  AND created_at <= ${fin.toISOString()}
            ),
            clientes_anteriores AS (
                SELECT DISTINCT cliente_id
                FROM puntos_transacciones
                WHERE negocio_id = ${negocioId}
                  AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid)
                  AND estado = 'confirmado'
                  AND created_at < ${inicio.toISOString()}
            )
            SELECT 
                COUNT(CASE WHEN ca.cliente_id IS NULL THEN 1 END)::int as nuevos,
                COUNT(CASE WHEN ca.cliente_id IS NOT NULL THEN 1 END)::int as recurrentes
            FROM clientes_periodo cp
            LEFT JOIN clientes_anteriores ca ON cp.cliente_id = ca.cliente_id
        `;

        // Query para cupones canjeados
        const cuponesQuery = sql`
            SELECT 
                COUNT(CASE 
                    WHEN cu.usado_at >= ${inicio.toISOString()} 
                     AND cu.usado_at <= ${fin.toISOString()}
                     AND cu.estado = 'usado'
                    THEN 1 
                END)::int as cupones_actual,
                
                COUNT(CASE 
                    WHEN cu.usado_at >= ${inicioAnterior.toISOString()} 
                     AND cu.usado_at <= ${finAnterior.toISOString()}
                     AND cu.estado = 'usado'
                    THEN 1 
                END)::int as cupones_anterior
                
            FROM cupon_usos cu
            JOIN cupones c ON c.id = cu.cupon_id
            WHERE c.negocio_id = ${negocioId}
                AND (${sucursalIdParam}::uuid IS NULL OR cu.sucursal_id = ${sucursalIdParam}::uuid)
        `;

        // Query para ofertas y campañas activas (counts)
        const campanasCountQuery = sql`
            SELECT 
                (SELECT COUNT(*)::int FROM ofertas 
                 WHERE negocio_id = ${negocioId}
                   AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid)
                   AND activo = true 
                   AND fecha_inicio <= ${ahora} 
                   AND fecha_fin >= ${ahora}) as ofertas_activas,
                   
                (SELECT COUNT(*)::int FROM cupones 
                 WHERE negocio_id = ${negocioId}
                   AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid) 
                   AND activo = true 
                   AND estado = 'publicado'
                   AND fecha_inicio <= ${ahora} 
                   AND fecha_expiracion >= ${ahora}) as cupones_activos
        `;

        // Query para métricas de engagement
        const metricasQuery = sql`
            SELECT 
                COALESCE(s.calificacion_promedio, 0)::numeric as rating,
                COALESCE(s.total_calificaciones, 0)::int as total_resenas,
                COALESCE(s.total_visitas, 0)::int as vistas,
                COALESCE(s.total_likes, 0)::int as likes
            FROM negocio_sucursales s
            WHERE s.negocio_id = ${negocioId}
            AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
            AND (${sucursalIdParam}::uuid IS NOT NULL OR s.es_principal = true)
            LIMIT 1
        `;

        // Query para mini gráfica de ventas

        const miniGraficaQuery = sql`
            SELECT 
                DATE(pt.created_at AT TIME ZONE ${zonaHoraria}) as fecha,
                COALESCE(SUM(pt.monto_compra), 0)::numeric as total
            FROM puntos_transacciones pt
            WHERE pt.negocio_id = ${negocioId}
            AND (${sucursalIdParam}::uuid IS NULL OR pt.sucursal_id = ${sucursalIdParam}::uuid)
            AND pt.estado = 'confirmado'
            AND pt.created_at >= ${inicio.toISOString()}
            AND pt.created_at <= ${fin.toISOString()}
            GROUP BY 1
            ORDER BY fecha ASC
            LIMIT 7
        `;

        // Query para followers (de metricas_entidad)
        const followersQuery = sql`
            SELECT 
                COALESCE(SUM(m.total_follows), 0)::int as followers
            FROM metricas_entidad m
            JOIN negocio_sucursales s ON s.id = m.entity_id
            WHERE s.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
              AND m.entity_type = 'sucursal'
        `;

        // Ejecutar todas las queries en paralelo
        const [
            ventasResult,
            clientesDetalleResult,
            cuponesResult,
            campanasCountResult,
            metricasResult,
            miniGraficaResult,
            followersResult,
        ] = await Promise.all([
            db.execute(ventasQuery),
            db.execute(clientesDetalleQuery),
            db.execute(cuponesQuery),
            db.execute(campanasCountQuery),
            db.execute(metricasQuery),
            db.execute(miniGraficaQuery),
            db.execute(followersQuery),
        ]);

        // Extraer valores
        const v = ventasResult.rows[0] || {};
        const cd = clientesDetalleResult.rows[0] || { nuevos: 0, recurrentes: 0 };
        const cup = cuponesResult.rows[0] || { cupones_actual: 0, cupones_anterior: 0 };
        const camp = campanasCountResult.rows[0] || { ofertas_activas: 0, cupones_activos: 0 };
        const met = metricasResult.rows[0] || { rating: 0, total_resenas: 0, vistas: 0, likes: 0 };
        const fol = followersResult.rows[0] || { followers: 0 };

        // Procesar valores
        const ventasActual = Number(v.ventas_actual) || 0;
        const ventasAnterior = Number(v.ventas_anterior) || 0;
        const clientesActual = Number(v.clientes_actual) || 0;
        const clientesAnterior = Number(v.clientes_anterior) || 0;
        const transaccionesActual = Number(v.transacciones_actual) || 0;
        const transaccionesAnterior = Number(v.transacciones_anterior) || 0;
        const cuponesActual = Number(cup.cupones_actual) || 0;
        const cuponesAnterior = Number(cup.cupones_anterior) || 0;

        // Construir respuesta
        const response: KPIsResponse = {
            ventas: {
                valor: ventasActual,
                valorAnterior: ventasAnterior,
                porcentajeCambio: calcularPorcentajeCambio(ventasActual, ventasAnterior),
                tendencia: determinarTendencia(ventasActual, ventasAnterior),
                miniGrafica: (miniGraficaResult.rows as unknown as MiniGraficaRow[]).map((r) => Number(r.total) || 0),
            },
            clientes: {
                valor: clientesActual,
                valorAnterior: clientesAnterior,
                porcentajeCambio: calcularPorcentajeCambio(clientesActual, clientesAnterior),
                tendencia: determinarTendencia(clientesActual, clientesAnterior),
                nuevos: Number(cd.nuevos) || 0,
                recurrentes: Number(cd.recurrentes) || 0,
            },
            transacciones: {
                valor: transaccionesActual,
                valorAnterior: transaccionesAnterior,
                porcentajeCambio: calcularPorcentajeCambio(transaccionesActual, transaccionesAnterior),
                tendencia: determinarTendencia(transaccionesActual, transaccionesAnterior),
                ticketPromedio: Math.round(Number(v.ticket_promedio) || 0),
                ticketMaximo: Number(v.ticket_maximo) || 0,
                ticketMinimo: Number(v.ticket_minimo) || 0,
            },
            cuponesCanjeados: {
                valor: cuponesActual,
                valorAnterior: cuponesAnterior,
                porcentajeCambio: calcularPorcentajeCambio(cuponesActual, cuponesAnterior),
                tendencia: determinarTendencia(cuponesActual, cuponesAnterior),
            },
            ofertasActivas: Number(camp.ofertas_activas) || 0,
            followers: Number(fol.followers) || 0,
            likes: {
                valor: Number(met.likes) || 0,
                valorAnterior: 0,
                porcentajeCambio: 0,
                tendencia: 'igual',
            },
            rating: {
                valor: Number(met.rating) || 0,
                totalResenas: Number(met.total_resenas) || 0,
            },
            vistas: {
                valor: Number(met.vistas) || 0,
                valorAnterior: 0,
                porcentajeCambio: 0,
                tendencia: 'igual',
            },
        };

        return { success: true, data: response };
    } catch (error) {
        console.error('Error al obtener KPIs del dashboard:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER VENTAS DIARIAS CON ESTADÍSTICAS
// =============================================================================

export async function obtenerVentasDiarias(
    negocioId: string,
    periodo: Periodo = 'semana',
    sucursalId?: string
) {
    try {
        const zonaHoraria = await obtenerZonaHorariaNegocio(negocioId, sucursalId);
        const { inicio, fin } = calcularRangoFechas(periodo, zonaHoraria);

        const sucursalIdParam = sucursalId ?? null;

            const query = sql`
                SELECT 
                    DATE(pt.created_at AT TIME ZONE ${zonaHoraria}) as fecha,
                    CASE EXTRACT(DOW FROM DATE(pt.created_at AT TIME ZONE ${zonaHoraria}))
                    WHEN 0 THEN 'Dom'
                    WHEN 1 THEN 'Lun'
                    WHEN 2 THEN 'Mar'
                    WHEN 3 THEN 'Mié'
                    WHEN 4 THEN 'Jue'
                    WHEN 5 THEN 'Vie'
                    WHEN 6 THEN 'Sáb'
                END as dia_semana,
                COALESCE(SUM(pt.monto_compra), 0)::numeric as total,
                COUNT(*)::int as transacciones
            FROM puntos_transacciones pt
            JOIN negocio_sucursales s ON s.id = pt.sucursal_id
            WHERE pt.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR pt.sucursal_id = ${sucursalIdParam}::uuid)
              AND pt.estado = 'confirmado'
              AND pt.created_at >= ${inicio.toISOString()}
              AND pt.created_at <= ${fin.toISOString()}
            GROUP BY 1, 2
            ORDER BY fecha ASC
        `;

        const resultado = await db.execute(query);
        
        const data = (resultado.rows as unknown as VentaDiariaRow[]).map((row) => ({
            fecha: row.fecha,
            diaSemana: row.dia_semana,
            total: Number(row.total) || 0,
            transacciones: Number(row.transacciones) || 0,
        }));

        // Generar todas las fechas del período
        const todasLasFechas = generarFechasCompletas(inicio, fin, zonaHoraria);

        // Crear un mapa de los datos reales para búsqueda rápida
        const ventasPorFecha = new Map(
            data.map(d => [d.fecha, d])
        );

        // Completar con todas las fechas (incluyendo días sin ventas)
        const dataCompleta = todasLasFechas.map(({ fecha, diaSemana }) => {
            const ventaExistente = ventasPorFecha.get(fecha);
            return ventaExistente || {
                fecha,
                diaSemana,
                total: 0,
                transacciones: 0
            };
        });


        // Calcular estadísticas
        const totales = dataCompleta.map(d => d.total);
        const totalGeneral = totales.reduce((a, b) => a + b, 0);
        const promedioDiario = dataCompleta.length > 0 ? Math.round(totalGeneral / dataCompleta.length) : 0;
        const mejorVenta = Math.max(...totales, 0);
        const diaPicoData = dataCompleta.find(d => d.total === mejorVenta);
        const diaPico = diaPicoData?.diaSemana || '-';

        // Calcular crecimiento
        const mitad = Math.floor(dataCompleta.length / 2);
        const primeraMitad = totales.slice(0, mitad).reduce((a, b) => a + b, 0);
        const segundaMitad = totales.slice(mitad).reduce((a, b) => a + b, 0);
        const crecimiento = calcularPorcentajeCambio(segundaMitad, primeraMitad);

        const estadisticas: EstadisticasVentas = {
            promedioDiario,
            diaPico,
            mejorVenta,
            crecimiento,
        };

        return {
            success: true,
            data: { ventas: dataCompleta, estadisticas },
        };
    } catch (error) {
        console.error('Error al obtener ventas diarias:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER CAMPAÑAS ACTIVAS
// =============================================================================

export async function obtenerCampanasActivas(
    negocioId: string,
    limite: number = 5,
    sucursalId?: string) {
    try {
        const sucursalIdParam = sucursalId ?? null;
        const ofertasQuery = sql`
            SELECT 
                o.id, o.titulo, o.tipo, o.valor,
                o.fecha_inicio, o.fecha_fin,
                o.usos_actuales, o.limite_usos,
                o.imagen,
                COALESCE(m.total_views, 0) as total_vistas,
                COALESCE(m.total_clicks, 0) as total_clicks,
                COALESCE(m.total_shares, 0) as total_shares,
                'oferta' as tipo_campana,
                CASE WHEN o.fecha_fin < NOW() THEN true ELSE false END as expirada
            FROM ofertas o
            LEFT JOIN metricas_entidad m 
                ON m.entity_type = 'oferta' AND m.entity_id = o.id
            WHERE o.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR o.sucursal_id = ${sucursalIdParam}::uuid)
              AND o.activo = true
            ORDER BY 
                CASE WHEN o.fecha_fin >= NOW() THEN 0 ELSE 1 END,
                o.fecha_fin ASC
            LIMIT ${limite}
        `;

        const cuponesQuery = sql`
            SELECT 
                id, titulo, tipo, valor,
                fecha_inicio, fecha_expiracion as fecha_fin,
                usos_actuales, limite_usos_total as limite_usos,
                'cupon' as tipo_campana,
                CASE WHEN fecha_expiracion < NOW() THEN true ELSE false END as expirada
            FROM cupones
            WHERE negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR sucursal_id = ${sucursalIdParam}::uuid)
              AND activo = true
            ORDER BY 
                CASE WHEN fecha_expiracion >= NOW() THEN 0 ELSE 1 END,
                fecha_expiracion ASC
            LIMIT ${limite}
        `;

        const [ofertasResult, cuponesResult] = await Promise.all([
            db.execute(ofertasQuery),
            db.execute(cuponesQuery),
        ]);

        const mapCampana = (row: CampanaRow) => ({
            id: row.id,
            titulo: row.titulo,
            tipo: row.tipo,
            valor: Number(row.valor) || 0,
            fechaInicio: row.fecha_inicio,
            fechaFin: row.fecha_fin,
            usosActuales: Number(row.usos_actuales) || 0,
            limiteUsos: row.limite_usos ? Number(row.limite_usos) : null,
            tipoCampana: row.tipo_campana,
            expirada: row.expirada,
            // Métricas (solo ofertas las tienen, cupones = 0)
            totalVistas: Number(row.total_vistas) || 0,
            totalClicks: Number(row.total_clicks) || 0,
            totalShares: Number(row.total_shares) || 0,
            imagen: row.imagen || null,
        });

        const ofertas = (ofertasResult.rows as unknown as CampanaRow[]).map(mapCampana);
        const cupones = (cuponesResult.rows as unknown as CampanaRow[]).map(mapCampana);

        const campanas = [...ofertas, ...cupones].sort((a, b) => {
            if (a.expirada !== b.expirada) return a.expirada ? 1 : -1;
            return new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime();
        });

        return { success: true, data: campanas };
    } catch (error) {
        console.error('Error al obtener campañas activas:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER INTERACCIONES RECIENTES (antes "Actividad")
// =============================================================================

export async function obtenerInteracciones(
    negocioId: string,
    limite: number = 10,
    sucursalId?: string) {
    try {
        const sucursalIdParam = sucursalId ?? null;
        // 1. Ventas recientes
        const ventasQuery = sql`
            SELECT 
                'venta' as tipo,
                pt.id,
                pt.monto_compra as monto,
                u.nombre as usuario_nombre,
                u.avatar_url as usuario_avatar,
                pt.created_at
            FROM puntos_transacciones pt
            JOIN usuarios u ON u.id = pt.cliente_id
            WHERE pt.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR pt.sucursal_id = ${sucursalIdParam}::uuid)
              AND pt.estado = 'confirmado'
            ORDER BY pt.created_at DESC
            LIMIT 5
        `;

        // 2. Cupones canjeados recientes
        const cuponesQuery = sql`
            SELECT 
                'cupon_canjeado' as tipo,
                cu.id,
                c.titulo as descripcion,
                u.nombre as usuario_nombre,
                u.avatar_url as usuario_avatar,
                cu.usado_at as created_at
            FROM cupon_usos cu
            JOIN cupones c ON c.id = cu.cupon_id
            JOIN usuarios u ON u.id = cu.usuario_id
            WHERE c.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR c.sucursal_id = ${sucursalIdParam}::uuid)
              AND cu.estado = 'usado'
            ORDER BY cu.usado_at DESC
            LIMIT 5
        `;

        // 3. Likes recientes a la sucursal
        // Soporta votos de usuarios (votante_sucursal_id IS NULL) o negocios
        const likesQuery = sql`
            SELECT 
                'like' as tipo,
                v.id,
                COALESCE(
                    CASE 
                        WHEN v.votante_sucursal_id IS NULL THEN u.nombre
                        ELSE n.nombre
                    END,
                    'Usuario'
                ) as usuario_nombre,
                CASE 
                    WHEN v.votante_sucursal_id IS NULL THEN u.avatar_url
                    ELSE vs.foto_perfil
                END as usuario_avatar,
                v.created_at
            FROM votos v
            LEFT JOIN usuarios u ON u.id = v.user_id
            LEFT JOIN negocio_sucursales vs ON vs.id = v.votante_sucursal_id
            LEFT JOIN negocios n ON n.id = vs.negocio_id
            JOIN negocio_sucursales s ON s.id = v.entity_id
            WHERE s.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
              AND v.entity_type = 'sucursal'
              AND v.tipo_accion = 'like'
            ORDER BY v.created_at DESC
            LIMIT 5
        `;

        // 4. Nuevos seguidores
        // Soporta votos de usuarios (votante_sucursal_id IS NULL) o negocios
        const seguidoresQuery = sql`
            SELECT 
                'nuevo_seguidor' as tipo,
                v.id,
                COALESCE(
                    CASE 
                        WHEN v.votante_sucursal_id IS NULL THEN u.nombre
                        ELSE n.nombre
                    END,
                    'Usuario'
                ) as usuario_nombre,
                CASE 
                    WHEN v.votante_sucursal_id IS NULL THEN u.avatar_url
                    ELSE vs.foto_perfil
                END as usuario_avatar,
                v.created_at
            FROM votos v
            LEFT JOIN usuarios u ON u.id = v.user_id
            LEFT JOIN negocio_sucursales vs ON vs.id = v.votante_sucursal_id
            LEFT JOIN negocios n ON n.id = vs.negocio_id
            JOIN negocio_sucursales s ON s.id = v.entity_id
            WHERE s.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
              AND v.entity_type = 'sucursal'
              AND v.tipo_accion = 'follow'
            ORDER BY v.created_at DESC
            LIMIT 5
        `;

        // 5. Compartidos recientes (de metricas, sin nombre)
        // Solo mostramos si hubo incremento reciente
        const compartidosQuery = sql`
            SELECT 
                'compartido' as tipo,
                m.id,
                m.total_shares,
                m.updated_at as created_at
            FROM metricas_entidad m
            JOIN negocio_sucursales s ON s.id = m.entity_id
            WHERE s.negocio_id = ${negocioId}
              AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
              AND m.entity_type = 'sucursal'
              AND m.total_shares > 0
              AND m.updated_at >= NOW() - INTERVAL '7 days'
            ORDER BY m.updated_at DESC
            LIMIT 3
        `;

        const [ventasResult, cuponesResult, likesResult, seguidoresResult, compartidosResult] = await Promise.all([
            db.execute(ventasQuery),
            db.execute(cuponesQuery),
            db.execute(likesQuery),
            db.execute(seguidoresQuery),
            db.execute(compartidosQuery),
        ]);

        // Mapear resultados
        const interacciones = [
            ...(ventasResult.rows as unknown as InteraccionVentaRow[]).map((r) => ({
                tipo: 'venta',
                id: r.id,
                titulo: `${r.usuario_nombre}`,
                descripcion: `Compra por $${Number(r.monto).toLocaleString()}`,
                avatar: r.usuario_avatar,
                createdAt: r.created_at,
            })),
            ...(cuponesResult.rows as unknown as InteraccionCuponRow[]).map((r) => ({
                tipo: 'cupon_canjeado',
                id: r.id,
                titulo: `${r.usuario_nombre}`,
                descripcion: `Canjeó "${r.descripcion}"`,
                avatar: r.usuario_avatar,
                createdAt: r.created_at,
            })),
            ...(likesResult.rows as unknown as InteraccionLikeRow[]).map((r) => ({
                tipo: 'like',
                id: r.id,
                titulo: `${r.usuario_nombre}`,
                descripcion: 'Le gustó tu negocio',
                avatar: r.usuario_avatar,
                createdAt: r.created_at,
            })),
            ...(seguidoresResult.rows as unknown as InteraccionSeguidorRow[]).map((r) => ({
                tipo: 'nuevo_seguidor',
                id: r.id,
                titulo: `${r.usuario_nombre}`,
                descripcion: 'Comenzó a seguirte',
                avatar: r.usuario_avatar,
                createdAt: r.created_at,
            })),
            ...(compartidosResult.rows as unknown as InteraccionCompartidoRow[]).map((r) => ({
                tipo: 'compartido',
                id: r.id,
                titulo: 'Alguien',
                descripcion: 'Compartió tu negocio',
                avatar: null,
                createdAt: r.created_at,
            })),
        ];

        // Ordenar por fecha y limitar
        interacciones.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return { success: true, data: interacciones.slice(0, limite) };
    } catch (error) {
        console.error('Error al obtener interacciones:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER RESEÑAS RECIENTES
// =============================================================================

export async function obtenerResenasRecientes(
    negocioId: string,
    limite: number = 5,
    sucursalId?: string) {
    try {
        const sucursalIdParam = sucursalId ?? null;
        const query = sql`
            SELECT 
                r.id,
                r.rating,
                r.texto,
                r.created_at,
                u.nombre as autor_nombre,
                u.apellidos as autor_apellidos,
                u.avatar_url as autor_avatar
            FROM resenas r
            JOIN usuarios u ON u.id = r.autor_id
            JOIN negocio_sucursales s ON s.id = r.sucursal_id
            WHERE s.negocio_id = ${negocioId}
             AND (${sucursalIdParam}::uuid IS NULL OR s.id = ${sucursalIdParam}::uuid)
             AND r.destino_tipo = 'negocio'
            ORDER BY r.created_at DESC
            LIMIT ${limite}
        `;

        const resultado = await db.execute(query);

        const data = (resultado.rows as unknown as ResenaRow[]).map((row) => ({
            id: row.id,
            rating: Number(row.rating) || 0,
            texto: row.texto,
            createdAt: row.created_at,
            autor: {
                nombre: row.autor_nombre,
                apellidos: row.autor_apellidos,
                avatar: row.autor_avatar,
            },
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error al obtener reseñas recientes:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER ALERTAS RECIENTES
// =============================================================================

export async function obtenerAlertasRecientes(
    negocioId: string,
    limite: number = 5,
    sucursalId?: string
) {
    try {
        const sucursalIdParam = sucursalId ?? null;
        const query = sql`
            SELECT 
                id, tipo, severidad, titulo,
                descripcion, leida, created_at
            FROM alertas_seguridad
          WHERE negocio_id = ${negocioId}
            AND (
                sucursal_id IS NULL
                OR sucursal_id = ${sucursalIdParam}::uuid
            )
            ORDER BY created_at DESC
            LIMIT ${limite}
        `;

        const resultado = await db.execute(query);

        const data = (resultado.rows as unknown as AlertaRow[]).map((row) => ({
            id: row.id,
            tipo: row.tipo,
            severidad: row.severidad,
            titulo: row.titulo,
            descripcion: row.descripcion,
            leida: row.leida,
            createdAt: row.created_at,
        }));

        const noLeidas = data.filter((a) => !a.leida).length;

        return { success: true, data: { alertas: data, noLeidas } };
    } catch (error) {
        console.error('Error al obtener alertas recientes:', error);
        throw error;
    }
}

// =============================================================================
// MARCAR ALERTA COMO LEÍDA
// =============================================================================

export async function marcarAlertaLeida(alertaId: string, negocioId: string) {
    try {
        const query = sql`
            UPDATE alertas_seguridad
            SET leida = true, leida_at = NOW()
            WHERE id = ${alertaId}
              AND negocio_id = ${negocioId}
            RETURNING id
        `;

        const resultado = await db.execute(query);

        if (resultado.rows.length === 0) {
            throw new Error('Alerta no encontrada');
        }

        return { success: true, message: 'Alerta marcada como leída' };
    } catch (error) {
        console.error('Error al marcar alerta como leída:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    obtenerKPIs,
    obtenerVentasDiarias,
    obtenerCampanasActivas,
    obtenerInteracciones,
    obtenerResenasRecientes,
    obtenerAlertasRecientes,
    marcarAlertaLeida,
};