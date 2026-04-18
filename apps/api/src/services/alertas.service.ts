/**
 * alertas.service.ts
 * ===================
 * Servicio principal del módulo de Alertas — Business Studio.
 * CRUD de alertas, KPIs, configuración de umbrales.
 *
 * Ubicación: apps/api/src/services/alertas.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alertasSeguridad, alertasConfiguracion, negocios } from '../db/schemas/schema.js';
import type {
	TipoAlerta,
	CategoriaAlerta,
	SeveridadAlerta,
	AlertaCompleta,
	AlertaKPIs,
	ConfiguracionAlerta,
	FiltrosAlertas,
	CrearAlertaInput,
	RespuestaAlertasPaginada,
} from '../types/alertas.types.js';
import {
	TIPO_A_CATEGORIA,
	SEVERIDAD_DEFAULT,
	UMBRALES_DEFAULT,
	TODOS_LOS_TIPOS,
} from '../types/alertas.types.js';
import { crearNotificacion, notificarNegocioCompleto } from './notificaciones.service.js';
import { emitirAUsuario } from '../socket.js';

// ============================================================================
// CRUD de Alertas
// ============================================================================

/**
 * Obtener alertas paginadas con filtros dinámicos
 */
export async function obtenerAlertasPaginadas(
	negocioId: string,
	sucursalId: string | undefined,
	filtros: FiltrosAlertas
): Promise<RespuestaAlertasPaginada> {
	const { tipo, categoria, severidad, leida, resuelta, busqueda, pagina, porPagina } = filtros;
	const offset = (pagina - 1) * porPagina;

	// Construir filtros dinámicos con sql tagged template
	const filtroSucursal = sucursalId ? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)` : sql``;
	const filtroTipo = tipo ? sql`AND a.tipo = ${tipo}` : sql``;
	const filtroCat = categoria ? sql`AND a.categoria = ${categoria}` : sql``;
	const filtroSev = severidad ? sql`AND a.severidad = ${severidad}` : sql``;
	const filtroLeida = leida !== undefined ? sql`AND a.leida = ${leida}` : sql``;
	const filtroResuelta = resuelta !== undefined ? sql`AND a.resuelta = ${resuelta}` : sql``;
	const filtroBusqueda = busqueda
		? sql`AND (a.titulo ILIKE ${'%' + busqueda + '%'} OR a.descripcion ILIKE ${'%' + busqueda + '%'})`
		: sql``;

	// Query total + alertas en paralelo
	const [totalResult, alertasResult] = await Promise.all([
		db.execute(sql`
			SELECT COUNT(*)::int AS total
			FROM alertas_seguridad a
			WHERE a.negocio_id = ${negocioId}
				${filtroSucursal} ${filtroTipo} ${filtroCat} ${filtroSev}
				${filtroLeida} ${filtroResuelta} ${filtroBusqueda}
		`),
		db.execute(sql`
			SELECT
				a.id, a.negocio_id, a.sucursal_id, a.transaccion_id, a.empleado_id,
				a.tipo, a.categoria, a.severidad, a.titulo, a.descripcion,
				a.datos, a.acciones_sugeridas, a.leida, a.leida_at, a.resuelta, a.resuelta_at,
				a.created_at
			FROM alertas_seguridad a
			WHERE a.negocio_id = ${negocioId}
				${filtroSucursal} ${filtroTipo} ${filtroCat} ${filtroSev}
				${filtroLeida} ${filtroResuelta} ${filtroBusqueda}
			ORDER BY a.created_at DESC
			LIMIT ${porPagina} OFFSET ${offset}
		`),
	]);

	const total = (totalResult as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;
	const alertas = ((alertasResult as unknown as { rows: Record<string, unknown>[] }).rows).map(mapearAlerta);

	return {
		alertas,
		total,
		pagina,
		porPagina,
		totalPaginas: Math.ceil(total / porPagina),
	};
}

/**
 * Obtener detalle de una alerta
 */
export async function obtenerAlertaDetalle(
	alertaId: string,
	negocioId: string
): Promise<AlertaCompleta | null> {
	const resultado = await db.execute(sql`
		SELECT
			id, negocio_id, sucursal_id, transaccion_id, empleado_id,
			tipo, categoria, severidad, titulo, descripcion,
			datos, acciones_sugeridas, leida, leida_at, resuelta, resuelta_at,
			created_at
		FROM alertas_seguridad
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);

	const rows = (resultado as unknown as { rows: Record<string, unknown>[] }).rows;
	if (rows.length === 0) return null;

	return mapearAlerta(rows[0]);
}

/**
 * KPIs aggregados de alertas
 */
export async function obtenerAlertasKPIs(
	negocioId: string,
	sucursalId?: string
): Promise<AlertaKPIs> {
	const filtroSucursal = sucursalId
		? sql`AND (sucursal_id = ${sucursalId} OR sucursal_id IS NULL)`
		: sql``;

	const [totalesResult, resueltasResult] = await Promise.all([
		db.execute(sql`
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE leida = false)::int AS no_leidas,
				COUNT(*) FILTER (WHERE severidad = 'alta')::int AS alta,
				COUNT(*) FILTER (WHERE severidad = 'media')::int AS media,
				COUNT(*) FILTER (WHERE severidad = 'baja')::int AS baja,
				COUNT(*) FILTER (WHERE categoria = 'seguridad')::int AS cat_seguridad,
				COUNT(*) FILTER (WHERE categoria = 'operativa')::int AS cat_operativa,
				COUNT(*) FILTER (WHERE categoria = 'rendimiento')::int AS cat_rendimiento,
				COUNT(*) FILTER (WHERE categoria = 'engagement')::int AS cat_engagement
			FROM alertas_seguridad
			WHERE negocio_id = ${negocioId} ${filtroSucursal}
		`),
		db.execute(sql`
			SELECT COUNT(*)::int AS resueltas
			FROM alertas_seguridad
			WHERE negocio_id = ${negocioId}
				AND resuelta = true
				AND resuelta_at >= date_trunc('month', NOW())
				${filtroSucursal}
		`),
	]);

	const totales = (totalesResult as unknown as { rows: Record<string, number>[] }).rows[0];
	const resueltas = (resueltasResult as unknown as { rows: { resueltas: number }[] }).rows[0];

	return {
		total: totales?.total ?? 0,
		noLeidas: totales?.no_leidas ?? 0,
		porSeveridad: {
			alta: totales?.alta ?? 0,
			media: totales?.media ?? 0,
			baja: totales?.baja ?? 0,
		},
		porCategoria: {
			seguridad: totales?.cat_seguridad ?? 0,
			operativa: totales?.cat_operativa ?? 0,
			rendimiento: totales?.cat_rendimiento ?? 0,
			engagement: totales?.cat_engagement ?? 0,
		},
		resueltasEsteMes: resueltas?.resueltas ?? 0,
	};
}

/**
 * Marcar alerta como leída
 */
export async function marcarAlertaLeida(
	alertaId: string,
	negocioId: string
): Promise<boolean> {
	const resultado = await db.execute(sql`
		UPDATE alertas_seguridad
		SET leida = true, leida_at = NOW()
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

/**
 * Marcar alerta como resuelta
 */
export async function marcarAlertaResuelta(
	alertaId: string,
	negocioId: string
): Promise<boolean> {
	const resultado = await db.execute(sql`
		UPDATE alertas_seguridad
		SET resuelta = true, resuelta_at = NOW(), leida = true, leida_at = COALESCE(leida_at, NOW())
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

/**
 * Marcar todas las alertas como leídas (con filtros opcionales)
 */
export async function marcarTodasLeidas(
	negocioId: string,
	categoria?: CategoriaAlerta,
	severidad?: SeveridadAlerta
): Promise<number> {
	const filtroCat = categoria ? sql`AND categoria = ${categoria}` : sql``;
	const filtroSev = severidad ? sql`AND severidad = ${severidad}` : sql``;

	const resultado = await db.execute(sql`
		UPDATE alertas_seguridad
		SET leida = true, leida_at = NOW()
		WHERE negocio_id = ${negocioId} AND leida = false
			${filtroCat} ${filtroSev}
	`);

	return (resultado as { rowCount: number }).rowCount ?? 0;
}

/**
 * Contar alertas no leídas (para badge)
 */
export async function contarNoLeidas(
	negocioId: string,
	sucursalId?: string
): Promise<number> {
	const filtroSucursal = sucursalId
		? sql`AND (sucursal_id = ${sucursalId} OR sucursal_id IS NULL)`
		: sql``;

	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total
		FROM alertas_seguridad
		WHERE negocio_id = ${negocioId} AND leida = false ${filtroSucursal}
	`);

	return (resultado as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;
}

// ============================================================================
// Crear Alerta (usado por el motor de detección)
// ============================================================================

/**
 * Crear una nueva alerta y notificar si es de severidad alta
 */
export async function crearAlerta(input: CrearAlertaInput): Promise<AlertaCompleta> {
	const categoria = TIPO_A_CATEGORIA[input.tipo];
	const severidad = input.severidad ?? SEVERIDAD_DEFAULT[input.tipo];

	const resultado = await db.execute(sql`
		INSERT INTO alertas_seguridad (
			negocio_id, sucursal_id, transaccion_id, empleado_id,
			tipo, categoria, severidad, titulo, descripcion,
			datos, acciones_sugeridas
		) VALUES (
			${input.negocioId},
			${input.sucursalId ?? null},
			${input.transaccionId ?? null},
			${input.empleadoId ?? null},
			${input.tipo},
			${categoria},
			${severidad},
			${input.titulo},
			${input.descripcion},
			${input.data ? JSON.stringify(input.data) : null}::jsonb,
			${input.accionesSugeridas ? JSON.stringify(input.accionesSugeridas) : null}::jsonb
		)
		RETURNING
			id, negocio_id, sucursal_id, transaccion_id, empleado_id,
			tipo, categoria, severidad, titulo, descripcion,
			datos, acciones_sugeridas, leida, leida_at, resuelta, resuelta_at,
			created_at
	`);

	const alerta = mapearAlerta((resultado as unknown as { rows: Record<string, unknown>[] }).rows[0]);

	// Notificar si severidad alta
	if (severidad === 'alta') {
		notificarAlertaAlta(alerta).catch(console.error);
	}

	return alerta;
}

/**
 * Verificar si ya existe una alerta similar en las últimas 24h (anti-duplicado)
 */
export async function existeAlertaReciente(
	negocioId: string,
	tipo: TipoAlerta,
	contexto?: string
): Promise<boolean> {
	const filtroContexto = contexto
		? sql`AND (datos->>'contextoId')::text = ${contexto}`
		: sql``;

	const resultado = await db.execute(sql`
		SELECT 1 FROM alertas_seguridad
		WHERE negocio_id = ${negocioId}
			AND tipo = ${tipo}
			AND created_at > NOW() - INTERVAL '24 hours'
			${filtroContexto}
		LIMIT 1
	`);

	return ((resultado as unknown as { rows: unknown[] }).rows.length) > 0;
}

// ============================================================================
// Configuración de Alertas
// ============================================================================

/**
 * Obtener configuración de alertas del negocio (con defaults para tipos sin config)
 */
export async function obtenerConfiguracion(
	negocioId: string
): Promise<ConfiguracionAlerta[]> {
	const resultado = await db.execute(sql`
		SELECT tipo_alerta, activo, umbrales
		FROM alertas_configuracion
		WHERE negocio_id = ${negocioId}
	`);

	const configGuardada = (resultado as unknown as { rows: { tipo_alerta: string; activo: boolean; umbrales: Record<string, unknown> }[] }).rows;
	const configMap = new Map(configGuardada.map(c => [c.tipo_alerta, c]));

	// Tipos desactivados por defecto (generan muchos falsos positivos)
	const DESACTIVADOS_POR_DEFECTO: TipoAlerta[] = ['montos_redondos'];

	// Generar lista completa con defaults para tipos sin configuración
	return TODOS_LOS_TIPOS.map(tipo => {
		const guardada = configMap.get(tipo);
		const activoPorDefecto = !DESACTIVADOS_POR_DEFECTO.includes(tipo);
		return {
			tipoAlerta: tipo,
			activo: guardada?.activo ?? activoPorDefecto,
			umbrales: (guardada?.umbrales ?? UMBRALES_DEFAULT[tipo]) as ConfiguracionAlerta['umbrales'],
		};
	});
}

/**
 * Actualizar configuración de un tipo de alerta (UPSERT)
 */
export async function actualizarConfiguracion(
	negocioId: string,
	tipoAlerta: TipoAlerta,
	activo: boolean,
	umbrales: Record<string, number>
): Promise<void> {
	await db.execute(sql`
		INSERT INTO alertas_configuracion (negocio_id, tipo_alerta, activo, umbrales, updated_at)
		VALUES (${negocioId}, ${tipoAlerta}, ${activo}, ${JSON.stringify(umbrales)}::jsonb, NOW())
		ON CONFLICT (negocio_id, tipo_alerta)
		DO UPDATE SET activo = ${activo}, umbrales = ${JSON.stringify(umbrales)}::jsonb, updated_at = NOW()
	`);
}

/**
 * Verificar si un tipo de alerta está activo para un negocio
 */
export async function estaAlertaActiva(
	negocioId: string,
	tipo: TipoAlerta
): Promise<boolean> {
	const resultado = await db.execute(sql`
		SELECT activo FROM alertas_configuracion
		WHERE negocio_id = ${negocioId} AND tipo_alerta = ${tipo}
	`);

	const rows = (resultado as unknown as { rows: { activo: boolean }[] }).rows;
	// Si no hay configuración guardada, usar default (algunos tipos vienen desactivados)
	const DESACTIVADOS_POR_DEFECTO: TipoAlerta[] = ['montos_redondos'];
	if (rows.length === 0) return !DESACTIVADOS_POR_DEFECTO.includes(tipo);
	return rows[0].activo;
}

/**
 * Obtener umbrales configurados para un tipo (o defaults)
 */
export async function obtenerUmbrales(
	negocioId: string,
	tipo: TipoAlerta
): Promise<Record<string, unknown>> {
	const resultado = await db.execute(sql`
		SELECT umbrales FROM alertas_configuracion
		WHERE negocio_id = ${negocioId} AND tipo_alerta = ${tipo}
	`);

	const rows = (resultado as unknown as { rows: { umbrales: Record<string, unknown> }[] }).rows;
	return rows.length > 0 ? rows[0].umbrales : (UMBRALES_DEFAULT[tipo] as Record<string, unknown>);
}

// ============================================================================
// Eliminar Alertas
// ============================================================================

/**
 * Eliminar una alerta individual
 */
export async function eliminarAlerta(
	alertaId: string,
	negocioId: string
): Promise<boolean> {
	const resultado = await db.execute(sql`
		DELETE FROM alertas_seguridad
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

/**
 * Eliminar alertas resueltas del negocio
 */
export async function eliminarAlertasResueltas(
	negocioId: string
): Promise<number> {
	const resultado = await db.execute(sql`
		DELETE FROM alertas_seguridad
		WHERE negocio_id = ${negocioId} AND resuelta = true
	`);

	return (resultado as { rowCount: number }).rowCount ?? 0;
}

// ============================================================================
// Helpers internos
// ============================================================================

function mapearAlerta(row: Record<string, unknown>): AlertaCompleta {
	return {
		id: row.id as string,
		negocioId: row.negocio_id as string,
		sucursalId: (row.sucursal_id as string) ?? null,
		transaccionId: (row.transaccion_id as string) ?? null,
		empleadoId: (row.empleado_id as string) ?? null,
		tipo: row.tipo as TipoAlerta,
		categoria: row.categoria as CategoriaAlerta,
		severidad: row.severidad as SeveridadAlerta,
		titulo: row.titulo as string,
		descripcion: row.descripcion as string,
		data: (row.datos as Record<string, unknown>) ?? null,
		accionesSugeridas: (row.acciones_sugeridas as string[]) ?? null,
		leida: row.leida as boolean,
		leidaAt: (row.leida_at as string) ?? null,
		resuelta: row.resuelta as boolean,
		resueltaAt: (row.resuelta_at as string) ?? null,
		createdAt: row.created_at as string,
	};
}

/**
 * Notificar al dueño y empleados cuando hay alerta de severidad alta
 */
async function notificarAlertaAlta(alerta: AlertaCompleta): Promise<void> {
	// Buscar dueño del negocio
	const negocioResult = await db.execute(sql`
		SELECT usuario_id FROM negocios WHERE id = ${alerta.negocioId}
	`);

	const duenoId = (negocioResult as unknown as { rows: { usuario_id: string }[] }).rows[0]?.usuario_id;
	if (!duenoId) return;

	// Crear notificación en el sistema (atada a la sucursal de la alerta para que el filtro
	// del panel la muestre solo cuando el dueño tenga esa sucursal activa)
	await crearNotificacion({
		usuarioId: duenoId,
		modo: 'comercial',
		tipo: 'alerta_seguridad',
		titulo: alerta.titulo,
		mensaje: alerta.descripcion,
		negocioId: alerta.negocioId,
		sucursalId: alerta.sucursalId ?? undefined,
		referenciaId: alerta.id,
		referenciaTipo: 'alerta',
	});

	// Notificar a todos los empleados del negocio
	await notificarNegocioCompleto(alerta.negocioId, {
		modo: 'comercial',
		tipo: 'alerta_seguridad',
		titulo: alerta.titulo,
		mensaje: alerta.descripcion,
		negocioId: alerta.negocioId,
		sucursalId: alerta.sucursalId ?? undefined,
		referenciaId: alerta.id,
		referenciaTipo: 'alerta',
	});

	// Emitir evento Socket.io dedicado
	emitirAUsuario(duenoId, 'alerta:nueva', {
		id: alerta.id,
		tipo: alerta.tipo,
		severidad: alerta.severidad,
		titulo: alerta.titulo,
	});
}
