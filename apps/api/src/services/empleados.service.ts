/**
 * empleados.service.ts
 * =====================
 * Servicio principal del módulo de Empleados — Business Studio.
 * CRUD, horarios, estadísticas de turnos.
 *
 * Ubicación: apps/api/src/services/empleados.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { emitirAUsuario } from '../socket.js';
import { revocarSesionesEmpleado } from '../utils/tokenStoreScanYA.js';
import type {
	EmpleadoResumen,
	EmpleadoDetalle,
	KPIsEmpleados,
	EstadisticasTurnos,
	HorarioEmpleado,
	CrearEmpleadoInput,
	ActualizarEmpleadoInput,
	FiltrosEmpleados,
} from '../types/empleados.types.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verifica que un empleado pertenece a una sucursal del negocio
 */
async function verificarPropiedadEmpleado(negocioId: string, empleadoId: string): Promise<boolean> {
	const resultado = await db.execute(sql`
		SELECT e.id FROM empleados e
		INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
		WHERE e.id = ${empleadoId} AND ns.negocio_id = ${negocioId} AND e.eliminado_at IS NULL
	`);
	return ((resultado as { rows: unknown[] }).rows.length) > 0;
}

/**
 * Verifica que un empleado pertenece a una sucursal específica (no solo al negocio).
 * Usado para validar que un gerente solo opere sobre empleados de SU sucursal.
 */
export async function empleadoPerteneceASucursal(empleadoId: string, sucursalId: string): Promise<boolean> {
	const resultado = await db.execute(sql`
		SELECT id FROM empleados
		WHERE id = ${empleadoId} AND sucursal_id = ${sucursalId} AND eliminado_at IS NULL
	`);
	return ((resultado as { rows: unknown[] }).rows.length) > 0;
}

function mapearEmpleadoResumen(row: Record<string, unknown>): EmpleadoResumen {
	return {
		id: row.id as string,
		nombre: row.nombre as string,
		nick: (row.nick as string) ?? null,
		especialidad: (row.especialidad as string) ?? null,
		fotoUrl: (row.foto_url as string) ?? null,
		activo: row.activo as boolean,
		sucursalId: (row.sucursal_id as string) ?? null,
		sucursalNombre: (row.sucursal_nombre as string) ?? null,
		permisos: {
			puedeRegistrarVentas: row.puede_registrar_ventas as boolean,
			puedeProcesarCanjes: row.puede_procesar_canjes as boolean,
			puedeVerHistorial: row.puede_ver_historial as boolean,
			puedeResponderChat: (row.puede_responder_chat as boolean) ?? true,
			puedeResponderResenas: (row.puede_responder_resenas as boolean) ?? true,
		},
		createdAt: row.created_at as string,
	};
}

// ============================================================================
// KPIs
// ============================================================================

export async function obtenerKPIs(
	negocioId: string,
	sucursalId?: string
): Promise<KPIsEmpleados> {
	const filtroSucursal = sucursalId
		? sql`AND e.sucursal_id = ${sucursalId}`
		: sql``;

	const resultado = await db.execute(sql`
		SELECT
			COUNT(*)::int AS total,
			COUNT(*) FILTER (WHERE e.activo = true)::int AS activos,
			COUNT(*) FILTER (WHERE e.activo = false)::int AS inactivos,
			COALESCE(AVG(e.calificacion_promedio) FILTER (WHERE e.calificacion_promedio > 0), 0)::numeric(2,1) AS promedio_calificacion
		FROM empleados e
		INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
		WHERE ns.negocio_id = ${negocioId} AND e.eliminado_at IS NULL ${filtroSucursal}
	`);

	const row = (resultado as { rows: Record<string, unknown>[] }).rows[0];
	return {
		total: (row?.total as number) ?? 0,
		activos: (row?.activos as number) ?? 0,
		inactivos: (row?.inactivos as number) ?? 0,
		promedioCalificacion: parseFloat(String(row?.promedio_calificacion ?? '0')),
	};
}

// ============================================================================
// Listar empleados
// ============================================================================

export async function obtenerEmpleados(
	negocioId: string,
	sucursalId: string | undefined,
	filtros: FiltrosEmpleados
): Promise<{ empleados: EmpleadoResumen[]; total: number }> {
	const { busqueda, activo, limit, offset } = filtros;

	const filtroSucursal = sucursalId
		? sql`AND e.sucursal_id = ${sucursalId}`
		: sql``;
	const filtroActivo = activo !== undefined
		? sql`AND e.activo = ${activo}`
		: sql``;
	const filtroBusqueda = busqueda
		? sql`AND (e.nombre ILIKE ${'%' + busqueda + '%'} OR e.nick ILIKE ${'%' + busqueda + '%'})`
		: sql``;

	const [totalResult, empleadosResult] = await Promise.all([
		db.execute(sql`
			SELECT COUNT(*)::int AS total
			FROM empleados e
			INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
			WHERE ns.negocio_id = ${negocioId} AND e.eliminado_at IS NULL
				${filtroSucursal} ${filtroActivo} ${filtroBusqueda}
		`),
		db.execute(sql`
			SELECT
				e.id, e.nombre, e.nick, e.especialidad, e.foto_url,
				e.activo, e.sucursal_id, ns.nombre AS sucursal_nombre,
				e.puede_registrar_ventas, e.puede_procesar_canjes, e.puede_ver_historial,
				e.puede_responder_chat, e.puede_responder_resenas,
				e.created_at
			FROM empleados e
			INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
			WHERE ns.negocio_id = ${negocioId} AND e.eliminado_at IS NULL
				${filtroSucursal} ${filtroActivo} ${filtroBusqueda}
			ORDER BY e.orden ASC, e.nombre ASC
			LIMIT ${limit} OFFSET ${offset}
		`),
	]);

	const total = (totalResult as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;
	const empleados = ((empleadosResult as { rows: Record<string, unknown>[] }).rows).map(mapearEmpleadoResumen);

	return { empleados, total };
}

// ============================================================================
// Detalle
// ============================================================================

export async function obtenerDetalle(
	negocioId: string,
	empleadoId: string
): Promise<EmpleadoDetalle | null> {
	// Datos del empleado
	const resultado = await db.execute(sql`
		SELECT
			e.*, ns.nombre AS sucursal_nombre
		FROM empleados e
		INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
		WHERE e.id = ${empleadoId} AND ns.negocio_id = ${negocioId} AND e.eliminado_at IS NULL
	`);

	const row = (resultado as { rows: Record<string, unknown>[] }).rows[0];
	if (!row) return null;

	// Horarios y estadísticas en paralelo
	const [horariosResult, statsResult] = await Promise.all([
		db.execute(sql`
			SELECT dia_semana, hora_entrada::text, hora_salida::text
			FROM empleado_horarios
			WHERE empleado_id = ${empleadoId}
			ORDER BY dia_semana, hora_entrada
		`),
		obtenerEstadisticasTurnos(empleadoId),
	]);

	const horarios = (horariosResult as unknown as { rows: { dia_semana: number; hora_entrada: string; hora_salida: string }[] }).rows
		.map(h => ({
			diaSemana: h.dia_semana,
			horaEntrada: h.hora_entrada,
			horaSalida: h.hora_salida,
		}));

	const resumen = mapearEmpleadoResumen(row);

	return {
		...resumen,
		telefono: (row.telefono as string) ?? null,
		correo: (row.correo as string) ?? null,
		notasInternas: (row.notas_internas as string) ?? null,
		pinAcceso: (row.pin_acceso as string) ?? null,
		totalCitasAtendidas: (row.total_citas_atendidas as number) ?? 0,
		calificacionPromedio: parseFloat(String(row.calificacion_promedio ?? '0')),
		totalResenas: (row.total_resenas as number) ?? 0,
		orden: (row.orden as number) ?? 0,
		horarios,
		estadisticas: statsResult,
		updatedAt: row.updated_at as string,
	};
}

// ============================================================================
// Estadísticas de turnos
// ============================================================================

async function obtenerEstadisticasTurnos(empleadoId: string): Promise<EstadisticasTurnos> {
	const resultado = await db.execute(sql`
		SELECT
			COUNT(*)::int AS total_turnos,
			COALESCE(SUM(transacciones), 0)::int AS transacciones_registradas,
			COALESCE(SUM(puntos_otorgados), 0)::int AS puntos_otorgados,
			MAX(hora_inicio) AS ultimo_turno
		FROM scanya_turnos
		WHERE empleado_id = ${empleadoId}
	`);

	const row = (resultado as { rows: Record<string, unknown>[] }).rows[0];
	return {
		totalTurnos: (row?.total_turnos as number) ?? 0,
		transaccionesRegistradas: (row?.transacciones_registradas as number) ?? 0,
		puntosOtorgados: (row?.puntos_otorgados as number) ?? 0,
		ultimoTurno: (row?.ultimo_turno as string) ?? null,
	};
}

// ============================================================================
// Verificar disponibilidad de nick
// ============================================================================

/**
 * Verifica si un nick está disponible.
 * Si NO lo está, devuelve hasta 3 sugerencias libres con sufijo numérico (juan2, juan3, ...).
 *
 * El nick es globalmente único (unique index `idx_empleados_nick_unique` sobre la columna
 * `nick`). Esta función no filtra por negocio — un nick ocupado en otro negocio también
 * se considera no disponible.
 */
export async function verificarDisponibilidadNick(
	nick: string,
	excluirEmpleadoId?: string
): Promise<{ disponible: boolean; sugerencias: string[] }> {
	const nickNormalizado = nick.trim().toLowerCase();

	if (!nickNormalizado) {
		return { disponible: false, sugerencias: [] };
	}

	// Check principal
	const existe = await db.execute(sql`
		SELECT id FROM empleados
		WHERE nick = ${nickNormalizado}
		  ${excluirEmpleadoId ? sql`AND id != ${excluirEmpleadoId}` : sql``}
		LIMIT 1
	`);

	if ((existe as { rows: unknown[] }).rows.length === 0) {
		return { disponible: true, sugerencias: [] };
	}

	// Buscar hasta 3 sugerencias libres con sufijo numérico
	// Prueba `nick2`, `nick3`, ... hasta acumular 3 disponibles (máximo 20 intentos)
	const sugerencias: string[] = [];
	for (let i = 2; i <= 21 && sugerencias.length < 3; i++) {
		const candidato = `${nickNormalizado}${i}`;
		const ocupado = await db.execute(sql`
			SELECT id FROM empleados WHERE nick = ${candidato} LIMIT 1
		`);
		if ((ocupado as { rows: unknown[] }).rows.length === 0) {
			sugerencias.push(candidato);
		}
	}

	return { disponible: false, sugerencias };
}

// ============================================================================
// Crear empleado
// ============================================================================

export async function crearEmpleado(
	negocioId: string,
	usuarioId: string,
	datos: CrearEmpleadoInput
): Promise<EmpleadoResumen> {
	// Verificar que la sucursal pertenece al negocio
	const sucursalResult = await db.execute(sql`
		SELECT id FROM negocio_sucursales
		WHERE id = ${datos.sucursalId} AND negocio_id = ${negocioId}
	`);
	if ((sucursalResult as { rows: unknown[] }).rows.length === 0) {
		throw new Error('SUCURSAL_NO_PERTENECE');
	}

	// Verificar nick único
	const nickResult = await db.execute(sql`
		SELECT id FROM empleados WHERE nick = ${datos.nick}
	`);
	if ((nickResult as { rows: unknown[] }).rows.length > 0) {
		throw new Error('NICK_DUPLICADO');
	}

	// Insertar
	const resultado = await db.execute(sql`
		INSERT INTO empleados (
			usuario_id, nombre, nick, pin_acceso, sucursal_id,
			especialidad, telefono, correo, foto_url, notas_internas,
			puede_registrar_ventas, puede_procesar_canjes, puede_ver_historial,
			puede_responder_chat, puede_responder_resenas
		) VALUES (
			${usuarioId}, ${datos.nombre}, ${datos.nick}, ${datos.pinAcceso}, ${datos.sucursalId},
			${datos.especialidad ?? null}, ${datos.telefono ?? null}, ${datos.correo ?? null},
			${datos.fotoUrl ?? null}, ${datos.notasInternas ?? null},
			${datos.puedeRegistrarVentas ?? true}, ${datos.puedeProcesarCanjes ?? true},
			${datos.puedeVerHistorial ?? true}, ${datos.puedeResponderChat ?? true},
			${datos.puedeResponderResenas ?? true}
		)
		RETURNING
			id, nombre, nick, especialidad, foto_url, activo, sucursal_id,
			puede_registrar_ventas, puede_procesar_canjes, puede_ver_historial,
			puede_responder_chat, puede_responder_resenas, created_at
	`);

	const row = (resultado as { rows: Record<string, unknown>[] }).rows[0];

	// Obtener nombre de sucursal
	const sucNombre = await db.execute(sql`SELECT nombre FROM negocio_sucursales WHERE id = ${datos.sucursalId}`);
	row.sucursal_nombre = (sucNombre as unknown as { rows: { nombre: string }[] }).rows[0]?.nombre ?? null;

	return mapearEmpleadoResumen(row);
}

// ============================================================================
// Actualizar empleado
// ============================================================================

export async function actualizarEmpleado(
	negocioId: string,
	empleadoId: string,
	datos: ActualizarEmpleadoInput
): Promise<boolean> {
	if (!await verificarPropiedadEmpleado(negocioId, empleadoId)) {
		throw new Error('EMPLEADO_NO_ENCONTRADO');
	}

	// Si cambia nick, verificar unicidad (excluyendo el propio)
	if (datos.nick) {
		const nickResult = await db.execute(sql`
			SELECT id FROM empleados WHERE nick = ${datos.nick} AND id != ${empleadoId}
		`);
		if ((nickResult as { rows: unknown[] }).rows.length > 0) {
			throw new Error('NICK_DUPLICADO');
		}
	}

	// Si cambia sucursal, verificar que pertenece al negocio
	if (datos.sucursalId) {
		const sucResult = await db.execute(sql`
			SELECT id FROM negocio_sucursales WHERE id = ${datos.sucursalId} AND negocio_id = ${negocioId}
		`);
		if ((sucResult as { rows: unknown[] }).rows.length === 0) {
			throw new Error('SUCURSAL_NO_PERTENECE');
		}
	}

	// Construir SET dinámico
	const sets: ReturnType<typeof sql>[] = [];
	if (datos.nombre !== undefined) sets.push(sql`nombre = ${datos.nombre}`);
	if (datos.nick !== undefined) sets.push(sql`nick = ${datos.nick}`);
	if (datos.pinAcceso !== undefined) sets.push(sql`pin_acceso = ${datos.pinAcceso}`);
	if (datos.sucursalId !== undefined) sets.push(sql`sucursal_id = ${datos.sucursalId}`);
	if (datos.especialidad !== undefined) sets.push(sql`especialidad = ${datos.especialidad}`);
	if (datos.telefono !== undefined) sets.push(sql`telefono = ${datos.telefono}`);
	if (datos.correo !== undefined) sets.push(sql`correo = ${datos.correo}`);
	if (datos.fotoUrl !== undefined) sets.push(sql`foto_url = ${datos.fotoUrl}`);
	if (datos.notasInternas !== undefined) sets.push(sql`notas_internas = ${datos.notasInternas}`);
	if (datos.puedeRegistrarVentas !== undefined) sets.push(sql`puede_registrar_ventas = ${datos.puedeRegistrarVentas}`);
	if (datos.puedeProcesarCanjes !== undefined) sets.push(sql`puede_procesar_canjes = ${datos.puedeProcesarCanjes}`);
	if (datos.puedeVerHistorial !== undefined) sets.push(sql`puede_ver_historial = ${datos.puedeVerHistorial}`);
	if (datos.puedeResponderChat !== undefined) sets.push(sql`puede_responder_chat = ${datos.puedeResponderChat}`);
	if (datos.puedeResponderResenas !== undefined) sets.push(sql`puede_responder_resenas = ${datos.puedeResponderResenas}`);

	if (sets.length === 0) return true;

	sets.push(sql`updated_at = NOW()`);

	const setClause = sql.join(sets, sql`, `);
	const resultado = await db.execute(sql`
		UPDATE empleados SET ${setClause} WHERE id = ${empleadoId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

// ============================================================================
// Toggle activo
// ============================================================================

export async function toggleActivo(
	negocioId: string,
	empleadoId: string,
	activo: boolean
): Promise<boolean> {
	if (!await verificarPropiedadEmpleado(negocioId, empleadoId)) {
		throw new Error('EMPLEADO_NO_ENCONTRADO');
	}

	const resultado = await db.execute(sql`
		UPDATE empleados SET activo = ${activo}, updated_at = NOW()
		WHERE id = ${empleadoId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

// ============================================================================
// Eliminar empleado
// ============================================================================

export async function eliminarEmpleado(
	negocioId: string,
	empleadoId: string
): Promise<boolean> {
	if (!await verificarPropiedadEmpleado(negocioId, empleadoId)) {
		throw new Error('EMPLEADO_NO_ENCONTRADO');
	}

	// Soft delete — marca como eliminado pero conserva registros para historial
	const resultado = await db.execute(sql`
		UPDATE empleados SET eliminado_at = NOW(), activo = false, updated_at = NOW() WHERE id = ${empleadoId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

// ============================================================================
// Horarios
// ============================================================================

export async function actualizarHorarios(
	negocioId: string,
	empleadoId: string,
	horarios: HorarioEmpleado[]
): Promise<void> {
	if (!await verificarPropiedadEmpleado(negocioId, empleadoId)) {
		throw new Error('EMPLEADO_NO_ENCONTRADO');
	}

	// Borrar horarios existentes
	await db.execute(sql`DELETE FROM empleado_horarios WHERE empleado_id = ${empleadoId}`);

	// Insertar nuevos
	for (const h of horarios) {
		await db.execute(sql`
			INSERT INTO empleado_horarios (empleado_id, dia_semana, hora_entrada, hora_salida)
			VALUES (${empleadoId}, ${h.diaSemana}, ${h.horaEntrada}::time, ${h.horaSalida}::time)
		`);
	}
}

// ============================================================================
// Revocar sesión ScanYA
// ============================================================================

export async function revocarSesionEmpleado(
	negocioId: string,
	empleadoId: string,
	revocadoPor: string
): Promise<void> {
	if (!await verificarPropiedadEmpleado(negocioId, empleadoId)) {
		throw new Error('EMPLEADO_NO_ENCONTRADO');
	}

	// 1. Cerrar turno activo si existe
	await db.execute(sql`
		UPDATE scanya_turnos
		SET hora_fin = NOW(), cerrado_por = ${revocadoPor}, notas_cierre = 'Sesión revocada por administrador'
		WHERE empleado_id = ${empleadoId} AND hora_fin IS NULL
	`);

	// 2. Revocar tokens en Redis — bloquea al empleado en futuros requests
	try {
		await revocarSesionesEmpleado(empleadoId);
	} catch (err) {
		console.error('❌ Error al revocar tokens en Redis:', err);
		throw new Error('REDIS_REVOCATION_FAILED');
	}

	// 3. Notificar en tiempo real al empleado para que ScanYA cierre sesión.
	// El empleado no tiene cuenta de AnunciaYA propia — entra a ScanYA con nick+PIN.
	// ScanYA se conecta al socket usando el usuarioId del DUEÑO (negocioUsuarioId en el token).
	// Todos los empleados y el dueño están en el mismo room. Por eso el payload incluye
	// empleadoId — el frontend de ScanYA filtra y solo actúa si coincide con el suyo.
	const [empleado] = (await db.execute(sql`
		SELECT usuario_id FROM empleados WHERE id = ${empleadoId}
	`)).rows as { usuario_id: string }[];

	if (empleado?.usuario_id) {
		emitirAUsuario(empleado.usuario_id, 'scanya:sesion-revocada', {
			empleadoId,
			motivo: 'Sesión revocada por administrador',
			timestamp: new Date().toISOString(),
		});
	}
}
