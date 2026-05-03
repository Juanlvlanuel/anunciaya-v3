/**
 * alertas-motor.service.ts
 * =========================
 * Motor de detección automática de alertas.
 * Analiza transacciones, vouchers, ofertas, reseñas, puntos y recompensas
 * para generar alertas de seguridad, operativas, rendimiento y engagement.
 *
 * Ubicación: apps/api/src/services/alertas-motor.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { crearAlerta, existeAlertaReciente, estaAlertaActiva, obtenerUmbrales } from './alertas.service.js';

// ============================================================================
// HELPER: Obtener sucursales activas del negocio
// ============================================================================

/**
 * Retorna los IDs de las sucursales activas de un negocio.
 * Usado para iterar detecciones per-sucursal en los orquestadores diario/semanal.
 */
async function obtenerSucursalesActivas(negocioId: string): Promise<string[]> {
	const resultado = await db.execute(sql`
		SELECT id FROM negocio_sucursales
		WHERE negocio_id = ${negocioId} AND activa = true
	`);
	return (resultado as unknown as { rows: { id: string }[] }).rows.map(r => r.id);
}

// ============================================================================
// DETECCIÓN EN TIEMPO REAL (llamada desde ScanYA tras registrar transacción)
// ============================================================================

interface DatosTransaccion {
	id: string;
	negocioId: string;
	sucursalId: string;
	clienteId: string;
	empleadoId?: string;
	montoCompra: number;
}

/**
 * Orquestador: ejecuta todas las detecciones de seguridad para una transacción
 */
export async function detectarAlertasSeguridad(
	negocioId: string,
	transaccion: DatosTransaccion
): Promise<void> {
	await Promise.allSettled([
		detectarMontoInusual(negocioId, transaccion),
		detectarClienteFrecuente(negocioId, transaccion),
		detectarFueraHorario(negocioId, transaccion),
		detectarMontosRedondos(negocioId, transaccion),
		detectarEmpleadoDestacado(negocioId, transaccion),
	]);
}

// Helper: obtener nombre completo de usuario por ID
async function obtenerNombreUsuario(usuarioId: string): Promise<string> {
	const r = await db.execute(sql`SELECT nombre, apellidos FROM usuarios WHERE id = ${usuarioId}`);
	const row = (r as unknown as { rows: { nombre: string; apellidos: string | null }[] }).rows[0];
	if (!row) return 'Desconocido';
	return row.apellidos ? `${row.nombre} ${row.apellidos}` : row.nombre;
}

// Helper: obtener nombre completo de empleado por ID
async function obtenerNombreEmpleado(empleadoId: string): Promise<string> {
	const r = await db.execute(sql`
		SELECT u.nombre, u.apellidos FROM negocio_empleados ne
		JOIN usuarios u ON u.id = ne.usuario_id
		WHERE ne.id = ${empleadoId}
	`);
	const row = (r as unknown as { rows: { nombre: string; apellidos: string | null }[] }).rows[0];
	if (!row) return 'Desconocido';
	return row.apellidos ? `${row.nombre} ${row.apellidos}` : row.nombre;
}

/**
 * Detecta transacciones con monto > Nx el promedio del negocio
 */
async function detectarMontoInusual(negocioId: string, tx: DatosTransaccion): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'monto_inusual')) return;
	if (await existeAlertaReciente(negocioId, 'monto_inusual', tx.id)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'monto_inusual');
	const multiplicador = (umbrales as { multiplicador?: number }).multiplicador ?? 3;

	const resultado = await db.execute(sql`
		SELECT AVG(monto_compra)::numeric(10,2) AS promedio
		FROM puntos_transacciones
		WHERE negocio_id = ${negocioId}
			AND estado = 'confirmado'
			AND created_at > NOW() - INTERVAL '30 days'
	`);

	const promedio = parseFloat((resultado as unknown as { rows: { promedio: string }[] }).rows[0]?.promedio ?? '0');
	if (promedio <= 0) return;

	if (tx.montoCompra > promedio * multiplicador) {
		const clienteNombre = await obtenerNombreUsuario(tx.clienteId);
		const empleadoNombre = tx.empleadoId ? await obtenerNombreEmpleado(tx.empleadoId) : null;

		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			transaccionId: tx.id,
			empleadoId: tx.empleadoId,
			tipo: 'monto_inusual',
			titulo: `Monto inusual: $${tx.montoCompra.toFixed(2)}`,
			descripcion: `Transacción de $${tx.montoCompra.toFixed(2)} supera ${multiplicador}x el promedio ($${promedio.toFixed(2)})`,
			data: { contextoId: tx.id, monto: tx.montoCompra, promedio, multiplicador, cliente: clienteNombre, ...(empleadoNombre ? { empleado: empleadoNombre } : {}) },
			accionesSugeridas: ['Verificar la transacción con el cliente', 'Revisar el ticket de compra'],
		});
	}
}

/**
 * Detecta mismo cliente con > N compras en 1 hora
 */
async function detectarClienteFrecuente(negocioId: string, tx: DatosTransaccion): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'cliente_frecuente')) return;
	if (await existeAlertaReciente(negocioId, 'cliente_frecuente', tx.clienteId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'cliente_frecuente');
	const maxCompras = (umbrales as { maxComprasHora?: number }).maxComprasHora ?? 3;

	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total
		FROM puntos_transacciones
		WHERE negocio_id = ${negocioId}
			AND cliente_id = ${tx.clienteId}
			AND created_at > NOW() - INTERVAL '1 hour'
	`);

	const total = (resultado as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;

	if (total > maxCompras) {
		const clienteNombre = await obtenerNombreUsuario(tx.clienteId);

		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			transaccionId: tx.id,
			tipo: 'cliente_frecuente',
			titulo: `Cliente con ${total} compras en 1 hora`,
			descripcion: `${clienteNombre} ha realizado ${total} compras en la última hora (umbral: ${maxCompras})`,
			data: { contextoId: tx.clienteId, comprasEnHora: total, cliente: clienteNombre },
			accionesSugeridas: ['Verificar identidad del cliente', 'Revisar si las compras son legítimas'],
		});
	}
}

/**
 * Detecta transacciones fuera del horario configurado del negocio
 */
async function detectarFueraHorario(negocioId: string, tx: DatosTransaccion): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'fuera_horario')) return;
	if (await existeAlertaReciente(negocioId, 'fuera_horario', tx.sucursalId)) return;

	const resultado = await db.execute(sql`
		SELECT hora_apertura, hora_cierre, abierto
		FROM negocio_horarios
		WHERE sucursal_id = ${tx.sucursalId}
			AND dia_semana = EXTRACT(DOW FROM NOW())::int
		LIMIT 1
	`);

	const horario = (resultado as unknown as { rows: { hora_apertura: string; hora_cierre: string; abierto: boolean }[] }).rows[0];
	const empleadoNombre = tx.empleadoId ? await obtenerNombreEmpleado(tx.empleadoId) : null;
	const clienteNombre = await obtenerNombreUsuario(tx.clienteId);

	if (!horario || !horario.abierto) {
		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			transaccionId: tx.id,
			empleadoId: tx.empleadoId,
			tipo: 'fuera_horario',
			titulo: 'Transacción en día cerrado',
			descripcion: `Se registró una transacción en un día marcado como cerrado${empleadoNombre ? ` por ${empleadoNombre}` : ''}`,
			data: { contextoId: tx.sucursalId, cliente: clienteNombre, ...(empleadoNombre ? { empleado: empleadoNombre } : {}) },
			accionesSugeridas: ['Verificar quién realizó la transacción', 'Actualizar horarios si es necesario'],
		});
		return;
	}

	const resultado2 = await db.execute(sql`
		SELECT CASE
			WHEN LOCALTIME < ${horario.hora_apertura}::time
				OR LOCALTIME > ${horario.hora_cierre}::time
			THEN true ELSE false
		END AS fuera_horario
	`);

	const fueraHorario = (resultado2 as unknown as { rows: { fuera_horario: boolean }[] }).rows[0]?.fuera_horario;
	if (fueraHorario) {
		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			transaccionId: tx.id,
			empleadoId: tx.empleadoId,
			tipo: 'fuera_horario',
			titulo: 'Transacción fuera de horario',
			descripcion: `Transacción registrada fuera del horario (${horario.hora_apertura} - ${horario.hora_cierre})${empleadoNombre ? ` por ${empleadoNombre}` : ''}`,
			data: { contextoId: tx.sucursalId, horaApertura: horario.hora_apertura, horaCierre: horario.hora_cierre, cliente: clienteNombre, ...(empleadoNombre ? { empleado: empleadoNombre } : {}) },
			accionesSugeridas: ['Verificar con el empleado', 'Revisar si el horario necesita actualizarse'],
		});
	}
}

/**
 * Detecta patrón de montos redondos consecutivos
 */
async function detectarMontosRedondos(negocioId: string, tx: DatosTransaccion): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'montos_redondos')) return;
	if (await existeAlertaReciente(negocioId, 'montos_redondos', tx.sucursalId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'montos_redondos');
	const minConsecutivos = (umbrales as { minimoConsecutivos?: number }).minimoConsecutivos ?? 3;

	const limite = minConsecutivos + 1;
	const resultado = await db.execute(sql`
		SELECT monto_compra
		FROM puntos_transacciones
		WHERE negocio_id = ${negocioId}
			AND sucursal_id = ${tx.sucursalId}
		ORDER BY created_at DESC
		LIMIT ${limite}
	`);

	const montos = (resultado as unknown as { rows: { monto_compra: string }[] }).rows
		.map(r => parseFloat(r.monto_compra));

	const redondos = montos.filter(m => m % 100 === 0).length;

	if (redondos > minConsecutivos) {
		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			tipo: 'montos_redondos',
			titulo: `${redondos} transacciones con montos redondos`,
			descripcion: `Se detectaron ${redondos} transacciones consecutivas con montos redondos exactos`,
			data: { contextoId: tx.sucursalId, montos, cantidadRedondos: redondos },
			accionesSugeridas: ['Revisar los tickets de las transacciones', 'Verificar con los empleados involucrados'],
		});
	}
}

/**
 * Detecta empleado con múltiples alertas en el último mes
 */
async function detectarEmpleadoDestacado(negocioId: string, tx: DatosTransaccion): Promise<void> {
	if (!tx.empleadoId) return;
	if (!await estaAlertaActiva(negocioId, 'empleado_destacado')) return;
	if (await existeAlertaReciente(negocioId, 'empleado_destacado', tx.empleadoId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'empleado_destacado');
	const maxAlertas = (umbrales as { alertasMaxMes?: number }).alertasMaxMes ?? 3;

	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total
		FROM alertas_seguridad
		WHERE negocio_id = ${negocioId}
			AND empleado_id = ${tx.empleadoId}
			AND categoria = 'seguridad'
			AND created_at > NOW() - INTERVAL '30 days'
	`);

	const total = (resultado as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;

	if (total >= maxAlertas) {
		const empleadoNombre = await obtenerNombreEmpleado(tx.empleadoId!);

		await crearAlerta({
			negocioId,
			sucursalId: tx.sucursalId,
			empleadoId: tx.empleadoId,
			tipo: 'empleado_destacado',
			titulo: `Empleado con ${total} alertas este mes`,
			descripcion: `${empleadoNombre} acumula ${total} alertas de seguridad en los últimos 30 días`,
			severidad: 'alta',
			data: { contextoId: tx.empleadoId, alertasEnMes: total, empleado: empleadoNombre },
			accionesSugeridas: ['Revisar las alertas asociadas al empleado', 'Hablar con el empleado sobre los patrones detectados'],
		});
	}
}

// ============================================================================
// DETECCIÓN POR CRON DIARIO (operativas + engagement)
// ============================================================================

/**
 * Ejecutar detecciones diarias para un negocio
 */
export async function ejecutarDeteccionDiaria(negocioId: string): Promise<void> {
	// Globales: una sola ejecución por negocio
	const globales = Promise.allSettled([
		detectarVouchersEstancados(negocioId),
		detectarAcumulacionVouchers(negocioId),
		detectarPuntosPorExpirar(negocioId),
		detectarRecompensaPopular(negocioId),
	]);

	// Per-sucursal: una ejecución por cada sucursal activa
	const sucursales = await obtenerSucursalesActivas(negocioId);
	const perSucursal = Promise.allSettled(
		sucursales.flatMap((sucursalId) => [
			detectarOfertasPorExpirar(negocioId, sucursalId),
			detectarCuponesPorExpirar(negocioId, sucursalId),
			detectarCuponesSinCanjear(negocioId, sucursalId),
		])
	);

	await Promise.all([globales, perSucursal]);
}

async function detectarVouchersEstancados(negocioId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'voucher_estancado')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'voucher_estancado');
	const diasMaximo = (umbrales as { diasMaximo?: number }).diasMaximo ?? 7;

	const resultado = await db.execute(sql`
		SELECT v.id, v.codigo, r.nombre AS recompensa_nombre, v.created_at,
			CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) AS cliente_nombre
		FROM vouchers_canje v
		JOIN recompensas r ON r.id = v.recompensa_id
		JOIN usuarios u ON u.id = v.usuario_id
		WHERE v.negocio_id = ${negocioId}
			AND v.estado = 'pendiente'
			AND v.created_at < NOW() - (${diasMaximo} || ' days')::interval
		LIMIT 10
	`);

	const vouchers = (resultado as unknown as { rows: Record<string, unknown>[] }).rows;

	for (const v of vouchers) {
		const contextoId = v.id as string;
		if (await existeAlertaReciente(negocioId, 'voucher_estancado', contextoId)) continue;

		await crearAlerta({
			negocioId,
			tipo: 'voucher_estancado',
			titulo: `Voucher pendiente hace más de ${diasMaximo} días`,
			descripcion: `El voucher ${v.codigo} (${v.recompensa_nombre}) de ${v.cliente_nombre} lleva más de ${diasMaximo} días sin entregarse`,
			data: { contextoId, voucherId: contextoId, codigo: v.codigo },
			accionesSugeridas: ['Contactar al cliente', 'Entregar la recompensa pendiente'],
		});
	}
}

async function detectarAcumulacionVouchers(negocioId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'acumulacion_vouchers')) return;
	if (await existeAlertaReciente(negocioId, 'acumulacion_vouchers')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'acumulacion_vouchers');
	const maxPendientes = (umbrales as { maximoPendientes?: number }).maximoPendientes ?? 10;

	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total
		FROM vouchers_canje
		WHERE negocio_id = ${negocioId} AND estado = 'pendiente'
	`);

	const total = (resultado as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;

	if (total >= maxPendientes) {
		await crearAlerta({
			negocioId,
			tipo: 'acumulacion_vouchers',
			titulo: `${total} vouchers pendientes de entrega`,
			descripcion: `Se han acumulado ${total} vouchers pendientes (umbral: ${maxPendientes})`,
			data: { totalPendientes: total },
			accionesSugeridas: ['Revisar los vouchers pendientes', 'Organizar entregas pendientes con el equipo'],
		});
	}
}

async function detectarOfertasPorExpirar(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'oferta_por_expirar')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'oferta_por_expirar');
	const diasAnticipacion = (umbrales as { diasAnticipacion?: number }).diasAnticipacion ?? 2;

	const resultado = await db.execute(sql`
		SELECT id, titulo, fecha_fin
		FROM ofertas
		WHERE negocio_id = ${negocioId}
			AND sucursal_id = ${sucursalId}::uuid
			AND activo = true
			AND fecha_fin BETWEEN NOW() AND NOW() + (${diasAnticipacion} || ' days')::interval
	`);

	const ofertas = (resultado as unknown as { rows: Record<string, unknown>[] }).rows;

	for (const oferta of ofertas) {
		const contextoId = oferta.id as string;
		if (await existeAlertaReciente(negocioId, 'oferta_por_expirar', contextoId, sucursalId)) continue;

		await crearAlerta({
			negocioId,
			sucursalId,
			tipo: 'oferta_por_expirar',
			titulo: `Oferta "${oferta.titulo}" por expirar`,
			descripcion: `La oferta "${oferta.titulo}" vence pronto. Considera renovarla o crear una nueva.`,
			data: { contextoId, ofertaId: contextoId, fechaFin: oferta.fecha_fin },
			accionesSugeridas: ['Renovar la oferta', 'Crear una oferta nueva', 'Dejar que expire'],
		});
	}
}

async function detectarCuponesPorExpirar(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'cupones_por_expirar')) return;
	if (await existeAlertaReciente(negocioId, 'cupones_por_expirar', undefined, sucursalId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'cupones_por_expirar');
	const diasAnticipacion = (umbrales as { diasAnticipacion?: number }).diasAnticipacion ?? 2;

	// Per-sucursal: se agrupa por la oferta origen (que pertenece a una sucursal).
	// El canje puede ser cross-sucursal, pero la alerta llega a la sucursal emisora.
	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total, o.titulo
		FROM oferta_usuarios ou
		JOIN ofertas o ON o.id = ou.oferta_id
		WHERE o.negocio_id = ${negocioId}
			AND o.sucursal_id = ${sucursalId}::uuid
			AND ou.estado = 'activo'
			AND o.fecha_fin BETWEEN NOW() AND NOW() + (${diasAnticipacion} || ' days')::interval
		GROUP BY o.titulo
		HAVING COUNT(*) > 0
		LIMIT 5
	`);

	const grupos = (resultado as unknown as { rows: { total: number; titulo: string }[] }).rows;
	if (grupos.length === 0) return;

	const totalCupones = grupos.reduce((sum, g) => sum + g.total, 0);
	const nombresOfertas = grupos.map(g => g.titulo).join(', ');

	await crearAlerta({
		negocioId,
		sucursalId,
		tipo: 'cupones_por_expirar',
		titulo: `${totalCupones} cupones por expirar`,
		descripcion: `Hay ${totalCupones} cupones activos que expiran en ${diasAnticipacion} días en: ${nombresOfertas}`,
		data: { totalCupones, ofertas: grupos },
		accionesSugeridas: ['Notificar a los clientes para que usen sus cupones', 'Extender la vigencia de la oferta'],
	});
}

async function detectarCuponesSinCanjear(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'cupones_sin_canjear')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'cupones_sin_canjear');
	const porcentajeMinimo = (umbrales as { porcentajeMinimo?: number }).porcentajeMinimo ?? 10;

	const resultado = await db.execute(sql`
		SELECT o.id, o.titulo,
			COUNT(*)::int AS total_asignados,
			COUNT(*) FILTER (WHERE ou.estado = 'usado')::int AS total_usados
		FROM oferta_usuarios ou
		JOIN ofertas o ON o.id = ou.oferta_id
		WHERE o.negocio_id = ${negocioId}
			AND o.sucursal_id = ${sucursalId}::uuid
			AND o.activo = true
			AND o.fecha_fin > NOW()
		GROUP BY o.id, o.titulo
		HAVING COUNT(*) >= 5
	`);

	const ofertas = (resultado as unknown as { rows: { id: string; titulo: string; total_asignados: number; total_usados: number }[] }).rows;

	for (const oferta of ofertas) {
		const tasaUso = oferta.total_asignados > 0
			? (oferta.total_usados / oferta.total_asignados) * 100
			: 0;

		if (tasaUso < porcentajeMinimo) {
			if (await existeAlertaReciente(negocioId, 'cupones_sin_canjear', oferta.id, sucursalId)) continue;

			await crearAlerta({
				negocioId,
				sucursalId,
				tipo: 'cupones_sin_canjear',
				titulo: `Baja conversión en "${oferta.titulo}"`,
				descripcion: `Solo ${tasaUso.toFixed(0)}% de cupones usados (${oferta.total_usados}/${oferta.total_asignados})`,
				data: { contextoId: oferta.id, tasaUso, totalAsignados: oferta.total_asignados, totalUsados: oferta.total_usados },
				accionesSugeridas: ['Enviar recordatorio a los clientes', 'Mejorar la oferta para hacerla más atractiva'],
			});
		}
	}
}

async function detectarPuntosPorExpirar(negocioId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'puntos_por_expirar')) return;
	if (await existeAlertaReciente(negocioId, 'puntos_por_expirar')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'puntos_por_expirar');
	const diasAnticipacion = (umbrales as { diasAnticipacion?: number }).diasAnticipacion ?? 7;

	// Verificar si el negocio tiene expiración de puntos configurada
	const configResult = await db.execute(sql`
		SELECT dias_expiracion_puntos FROM puntos_configuracion
		WHERE negocio_id = ${negocioId} AND activo = true
		LIMIT 1
	`);

	const config = (configResult as unknown as { rows: { dias_expiracion_puntos: number }[] }).rows[0];
	if (!config || config.dias_expiracion_puntos <= 0) return;

	const diasUmbral = config.dias_expiracion_puntos - diasAnticipacion;
	const resultado = await db.execute(sql`
		SELECT u.nombre, u.apellidos, pb.puntos_disponibles
		FROM puntos_billetera pb
		JOIN usuarios u ON u.id = pb.usuario_id
		WHERE pb.negocio_id = ${negocioId}
			AND pb.puntos_disponibles > 0
			AND pb.ultima_actividad < NOW() - (${diasUmbral} || ' days')::interval
		LIMIT 5
	`);

	const clientes = (resultado as unknown as { rows: { nombre: string; apellidos: string | null; puntos_disponibles: number }[] }).rows;
	const afectados = clientes.length;

	if (afectados > 0) {
		const nombresClientes = clientes.map(c => `${c.nombre}${c.apellidos ? ' ' + c.apellidos : ''} (${c.puntos_disponibles} pts)`);

		await crearAlerta({
			negocioId,
			tipo: 'puntos_por_expirar',
			titulo: `${afectados} ${afectados === 1 ? 'cliente' : 'clientes'} con puntos por expirar`,
			descripcion: `${afectados} ${afectados === 1 ? 'cliente tiene' : 'clientes tienen'} puntos que expirarán en los próximos ${diasAnticipacion} días`,
			data: { clientesAfectados: afectados, diasExpiracion: config.dias_expiracion_puntos, clientes: nombresClientes },
			accionesSugeridas: ['Enviar recordatorio a los clientes afectados', 'Crear una promoción especial de canje'],
		});
	}
}

async function detectarRecompensaPopular(negocioId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'recompensa_popular')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'recompensa_popular');
	const stockMinimo = (umbrales as { stockMinimo?: number }).stockMinimo ?? 5;

	const resultado = await db.execute(sql`
		SELECT r.id, r.nombre, r.stock,
			COUNT(rp.id) FILTER (WHERE rp.canjeada = true AND rp.canjeada_at > NOW() - INTERVAL '7 days')::int AS canjes_semana
		FROM recompensas r
		LEFT JOIN recompensa_progreso rp ON rp.recompensa_id = r.id
		WHERE r.negocio_id = ${negocioId}
			AND r.activa = true
			AND r.stock IS NOT NULL
			AND r.stock <= ${stockMinimo}
			AND r.stock > 0
		GROUP BY r.id, r.nombre, r.stock
		HAVING COUNT(rp.id) FILTER (WHERE rp.canjeada = true AND rp.canjeada_at > NOW() - INTERVAL '7 days') > 0
	`);

	const recompensas = (resultado as unknown as { rows: { id: string; nombre: string; stock: number; canjes_semana: number }[] }).rows;

	for (const r of recompensas) {
		if (await existeAlertaReciente(negocioId, 'recompensa_popular', r.id)) continue;

		await crearAlerta({
			negocioId,
			tipo: 'recompensa_popular',
			titulo: `"${r.nombre}" con stock bajo (${r.stock})`,
			descripcion: `La recompensa "${r.nombre}" tiene solo ${r.stock} unidades y se canjearon ${r.canjes_semana} esta semana`,
			data: { contextoId: r.id, stock: r.stock, canjesSemana: r.canjes_semana },
			accionesSugeridas: ['Reponer stock de la recompensa', 'Ajustar los puntos requeridos'],
		});
	}
}

// ============================================================================
// DETECCIÓN POR CRON SEMANAL (rendimiento)
// ============================================================================

/**
 * Ejecutar detecciones semanales para un negocio
 */
export async function ejecutarDeteccionSemanal(negocioId: string): Promise<void> {
	// Globales: una sola ejecución por negocio
	const globales = Promise.allSettled([
		detectarClienteVipInactivo(negocioId),
	]);

	// Per-sucursal: una ejecución por cada sucursal activa
	const sucursales = await obtenerSucursalesActivas(negocioId);
	const perSucursal = Promise.allSettled(
		sucursales.flatMap((sucursalId) => [
			detectarCaidaVentas(negocioId, sucursalId),
			detectarRachaResenasNegativas(negocioId, sucursalId),
			detectarPicoActividad(negocioId, sucursalId),
		])
	);

	await Promise.all([globales, perSucursal]);
}

async function detectarCaidaVentas(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'caida_ventas')) return;
	if (await existeAlertaReciente(negocioId, 'caida_ventas', undefined, sucursalId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'caida_ventas');
	const porcentajeCaida = (umbrales as { porcentajeCaida?: number }).porcentajeCaida ?? 20;

	const resultado = await db.execute(sql`
		SELECT
			COALESCE(SUM(monto_compra) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0)::numeric(10,2) AS ventas_semana,
			COALESCE(SUM(monto_compra) FILTER (WHERE created_at BETWEEN NOW() - INTERVAL '35 days' AND NOW() - INTERVAL '7 days'), 0)::numeric(10,2) AS ventas_4_semanas
		FROM puntos_transacciones
		WHERE negocio_id = ${negocioId}
			AND sucursal_id = ${sucursalId}::uuid
			AND estado = 'confirmado'
	`);

	const row = (resultado as unknown as { rows: { ventas_semana: string; ventas_4_semanas: string }[] }).rows[0];
	const ventasSemana = parseFloat(row?.ventas_semana ?? '0');
	const ventas4Semanas = parseFloat(row?.ventas_4_semanas ?? '0');
	const promedioSemanal = ventas4Semanas / 4;

	if (promedioSemanal <= 0) return;

	const cambio = ((ventasSemana - promedioSemanal) / promedioSemanal) * 100;

	if (cambio < -porcentajeCaida) {
		await crearAlerta({
			negocioId,
			sucursalId,
			tipo: 'caida_ventas',
			titulo: `Caída de ventas: ${Math.abs(cambio).toFixed(0)}%`,
			descripcion: `Las ventas de esta semana ($${ventasSemana.toFixed(2)}) cayeron ${Math.abs(cambio).toFixed(0)}% vs el promedio semanal ($${promedioSemanal.toFixed(2)})`,
			data: { ventasSemana, promedioSemanal, porcentajeCambio: cambio },
			accionesSugeridas: ['Crear una promoción para impulsar ventas', 'Revisar si hay factores externos'],
		});
	}
}

async function detectarClienteVipInactivo(negocioId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'cliente_vip_inactivo')) return;
	if (await existeAlertaReciente(negocioId, 'cliente_vip_inactivo')) return;

	const umbrales = await obtenerUmbrales(negocioId, 'cliente_vip_inactivo');
	const diasInactividad = (umbrales as { diasInactividad?: number }).diasInactividad ?? 30;

	const resultado = await db.execute(sql`
		SELECT pb.nivel_actual, u.nombre, u.apellidos, pb.puntos_disponibles
		FROM puntos_billetera pb
		JOIN usuarios u ON u.id = pb.usuario_id
		WHERE pb.negocio_id = ${negocioId}
			AND pb.nivel_actual IN ('oro', 'plata')
			AND pb.ultima_actividad < NOW() - (${diasInactividad} || ' days')::interval
		LIMIT 5
	`);

	const clientes = (resultado as unknown as { rows: { nivel_actual: string; nombre: string; apellidos: string | null; puntos_disponibles: number }[] }).rows;
	const total = clientes.length;

	if (total > 0) {
		const nombresClientes = clientes.map(c => `${c.nombre}${c.apellidos ? ' ' + c.apellidos : ''} (${c.nivel_actual})`);

		await crearAlerta({
			negocioId,
			tipo: 'cliente_vip_inactivo',
			titulo: `${total} ${total === 1 ? 'cliente' : 'clientes'} VIP ${total === 1 ? 'inactivo' : 'inactivos'}`,
			descripcion: `${total} ${total === 1 ? 'cliente' : 'clientes'} de nivel Oro/Plata no ${total === 1 ? 'ha' : 'han'} comprado en ${diasInactividad}+ días`,
			data: { clientesInactivos: total, diasInactividad, clientes: nombresClientes },
			accionesSugeridas: ['Enviar oferta exclusiva a clientes VIP', 'Contactar directamente a los clientes'],
		});
	}
}

async function detectarRachaResenasNegativas(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'racha_resenas_negativas')) return;
	if (await existeAlertaReciente(negocioId, 'racha_resenas_negativas', undefined, sucursalId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'racha_resenas_negativas');
	const minimoResenas = (umbrales as { minimoResenas?: number }).minimoResenas ?? 2;
	const maximoEstrellas = (umbrales as { maximoEstrellas?: number }).maximoEstrellas ?? 2;

	const resultado = await db.execute(sql`
		SELECT r.rating, r.texto, CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) AS autor
		FROM resenas r
		JOIN usuarios u ON u.id = r.autor_id
		WHERE r.destino_id = ${negocioId}
			AND r.destino_tipo = 'negocio'
			AND r.sucursal_id = ${sucursalId}::uuid
			AND r.rating IS NOT NULL
			AND r.rating <= ${maximoEstrellas}
			AND r.created_at > NOW() - INTERVAL '7 days'
		ORDER BY r.created_at DESC
		LIMIT 5
	`);

	const resenas = (resultado as unknown as { rows: { rating: number; texto: string; autor: string }[] }).rows;
	const total = resenas.length;

	if (total >= minimoResenas) {
		const detalle = resenas.map(r => `${r.autor}: ★${r.rating} — "${r.texto ?? 'Sin comentario'}"`);

		await crearAlerta({
			negocioId,
			sucursalId,
			tipo: 'racha_resenas_negativas',
			titulo: `${total} ${total === 1 ? 'reseña negativa' : 'reseñas negativas'} esta semana`,
			descripcion: `Se ${total === 1 ? 'recibió' : 'recibieron'} ${total} ${total === 1 ? 'reseña' : 'reseñas'} de ${maximoEstrellas} estrellas o menos en los últimos 7 días`,
			severidad: 'alta',
			data: { resenasNegativas: total, maximoEstrellas, resenas: detalle },
			accionesSugeridas: ['Leer y responder las reseñas', 'Identificar áreas de mejora', 'Implementar cambios basados en feedback'],
		});
	}
}

async function detectarPicoActividad(negocioId: string, sucursalId: string): Promise<void> {
	if (!await estaAlertaActiva(negocioId, 'pico_actividad')) return;
	if (await existeAlertaReciente(negocioId, 'pico_actividad', undefined, sucursalId)) return;

	const umbrales = await obtenerUmbrales(negocioId, 'pico_actividad');
	const multiplicador = (umbrales as { multiplicador?: number }).multiplicador ?? 2;

	const resultado = await db.execute(sql`
		SELECT
			COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS hoy,
			(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::numeric / 30)::numeric(10,1) AS promedio_diario
		FROM puntos_transacciones
		WHERE negocio_id = ${negocioId}
			AND sucursal_id = ${sucursalId}::uuid
			AND estado = 'confirmado'
	`);

	const row = (resultado as unknown as { rows: { hoy: number; promedio_diario: string }[] }).rows[0];
	const hoy = row?.hoy ?? 0;
	const promedioDiario = parseFloat(row?.promedio_diario ?? '0');

	if (promedioDiario > 0 && hoy > promedioDiario * multiplicador) {
		await crearAlerta({
			negocioId,
			sucursalId,
			tipo: 'pico_actividad',
			titulo: `Pico de actividad: ${hoy} transacciones hoy`,
			descripcion: `Hoy se registraron ${hoy} transacciones, ${multiplicador}x más que el promedio diario (${promedioDiario})`,
			data: { transaccionesHoy: hoy, promedioDiario, multiplicador },
			accionesSugeridas: ['Aprovechar el pico para promociones', 'Asegurar que hay suficiente personal'],
		});
	}
}

// ============================================================================
// Obtener todos los negocios activos (para cron)
// ============================================================================

export async function obtenerNegociosActivos(): Promise<string[]> {
	const resultado = await db.execute(sql`
		SELECT id FROM negocios WHERE activo = true
	`);

	return (resultado as unknown as { rows: { id: string }[] }).rows.map(r => r.id);
}
