/**
 * alertas.service.ts
 * ===================
 * Servicio principal del módulo de Alertas — Business Studio.
 *
 * Modelo de estados (22 Abril 2026 — parte 2):
 *   • leída    → POR USUARIO  (alerta_lecturas.leida_at)
 *     Cada persona marca sus leídas independientemente.
 *   • resuelta → GLOBAL       (alertas_seguridad.resuelta / resuelta_at / resuelta_por_usuario_id)
 *     El problema fue atendido — todos los usuarios del negocio lo ven así.
 *   • ocultada → POR USUARIO  (alerta_lecturas.ocultada_at)
 *     "Eliminar" desde la UI oculta la alerta solo del feed del usuario;
 *     la alerta sigue existiendo para los demás. El borrado físico queda
 *     para jobs admin (ej. purga de resueltas > 90 días).
 *
 * Ubicación: apps/api/src/services/alertas.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
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
 * Obtener alertas paginadas con filtros dinámicos.
 * Excluye las ocultadas por el usuario actual. `leida` se calcula por usuario;
 * `resuelta` viene de la columna global en `alertas_seguridad`.
 */
export async function obtenerAlertasPaginadas(
	negocioId: string,
	sucursalId: string | undefined,
	usuarioId: string,
	filtros: FiltrosAlertas
): Promise<RespuestaAlertasPaginada> {
	const { tipo, categoria, severidad, leida, resuelta, busqueda, pagina, porPagina } = filtros;
	const offset = (pagina - 1) * porPagina;

	const filtroSucursal = sucursalId ? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)` : sql``;
	const filtroTipo = tipo ? sql`AND a.tipo = ${tipo}` : sql``;
	const filtroCat = categoria ? sql`AND a.categoria = ${categoria}` : sql``;
	const filtroSev = severidad ? sql`AND a.severidad = ${severidad}` : sql``;
	const filtroLeida = leida === true
		? sql`AND al.leida_at IS NOT NULL`
		: leida === false
			? sql`AND al.leida_at IS NULL`
			: sql``;
	const filtroResuelta = resuelta === true
		? sql`AND a.resuelta = true`
		: resuelta === false
			? sql`AND a.resuelta = false`
			: sql``;
	const filtroBusqueda = busqueda
		? sql`AND (a.titulo ILIKE ${'%' + busqueda + '%'} OR a.descripcion ILIKE ${'%' + busqueda + '%'})`
		: sql``;

	// Siempre excluir las ocultadas por este usuario
	const filtroOcultadas = sql`AND (al.ocultada_at IS NULL)`;

	const [totalResult, alertasResult] = await Promise.all([
		db.execute(sql`
			SELECT COUNT(*)::int AS total
			FROM alertas_seguridad a
			LEFT JOIN alerta_lecturas al ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
			WHERE a.negocio_id = ${negocioId}
				${filtroSucursal} ${filtroTipo} ${filtroCat} ${filtroSev}
				${filtroLeida} ${filtroResuelta} ${filtroBusqueda}
				${filtroOcultadas}
		`),
		db.execute(sql`
			SELECT
				a.id, a.negocio_id, a.sucursal_id, a.transaccion_id, a.empleado_id,
				a.tipo, a.categoria, a.severidad, a.titulo, a.descripcion,
				a.datos, a.acciones_sugeridas,
				al.leida_at AS leida_at_usuario,
				a.resuelta, a.resuelta_at,
				a.resuelta_por_usuario_id,
				u.nombre AS resuelta_por_nombre,
				u.apellidos AS resuelta_por_apellidos,
				a.created_at
			FROM alertas_seguridad a
			LEFT JOIN alerta_lecturas al ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
			LEFT JOIN usuarios u ON u.id = a.resuelta_por_usuario_id
			WHERE a.negocio_id = ${negocioId}
				${filtroSucursal} ${filtroTipo} ${filtroCat} ${filtroSev}
				${filtroLeida} ${filtroResuelta} ${filtroBusqueda}
				${filtroOcultadas}
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
 * Obtener detalle de una alerta (con estado "leída" del usuario actual y
 * "resuelta" global con nombre de quien la resolvió).
 */
export async function obtenerAlertaDetalle(
	alertaId: string,
	negocioId: string,
	usuarioId: string
): Promise<AlertaCompleta | null> {
	const resultado = await db.execute(sql`
		SELECT
			a.id, a.negocio_id, a.sucursal_id, a.transaccion_id, a.empleado_id,
			a.tipo, a.categoria, a.severidad, a.titulo, a.descripcion,
			a.datos, a.acciones_sugeridas,
			al.leida_at AS leida_at_usuario,
			a.resuelta, a.resuelta_at,
			a.resuelta_por_usuario_id,
			u.nombre AS resuelta_por_nombre,
			u.apellidos AS resuelta_por_apellidos,
			a.created_at
		FROM alertas_seguridad a
		LEFT JOIN alerta_lecturas al ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
		LEFT JOIN usuarios u ON u.id = a.resuelta_por_usuario_id
		WHERE a.id = ${alertaId} AND a.negocio_id = ${negocioId}
	`);

	const rows = (resultado as unknown as { rows: Record<string, unknown>[] }).rows;
	if (rows.length === 0) return null;

	return mapearAlerta(rows[0]);
}

/**
 * KPIs agregados de alertas.
 * `noLeidas` y el total excluyen ocultadas por el usuario.
 * `resueltasEsteMes` es global — el conteo del negocio, no del usuario.
 */
export async function obtenerAlertasKPIs(
	negocioId: string,
	sucursalId: string | undefined,
	usuarioId: string
): Promise<AlertaKPIs> {
	const filtroSucursal = sucursalId
		? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)`
		: sql``;

	const [totalesResult, resueltasResult] = await Promise.all([
		db.execute(sql`
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE al.leida_at IS NULL)::int AS no_leidas,
				COUNT(*) FILTER (WHERE a.severidad = 'alta' AND al.leida_at IS NULL)::int AS alta,
				COUNT(*) FILTER (WHERE a.severidad = 'media' AND al.leida_at IS NULL)::int AS media,
				COUNT(*) FILTER (WHERE a.severidad = 'baja' AND al.leida_at IS NULL)::int AS baja,
				COUNT(*) FILTER (WHERE a.categoria = 'seguridad')::int AS cat_seguridad,
				COUNT(*) FILTER (WHERE a.categoria = 'operativa')::int AS cat_operativa,
				COUNT(*) FILTER (WHERE a.categoria = 'rendimiento')::int AS cat_rendimiento,
				COUNT(*) FILTER (WHERE a.categoria = 'engagement')::int AS cat_engagement
			FROM alertas_seguridad a
			LEFT JOIN alerta_lecturas al ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
			WHERE a.negocio_id = ${negocioId} ${filtroSucursal}
				AND al.ocultada_at IS NULL
		`),
		db.execute(sql`
			SELECT COUNT(*)::int AS resueltas
			FROM alertas_seguridad a
			WHERE a.negocio_id = ${negocioId}
				AND a.resuelta = true
				AND a.resuelta_at >= date_trunc('month', NOW())
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
 * Marcar alerta como leída (para el usuario actual).
 */
export async function marcarAlertaLeida(
	alertaId: string,
	negocioId: string,
	usuarioId: string
): Promise<boolean> {
	const existe = await db.execute(sql`
		SELECT 1 FROM alertas_seguridad WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);
	if ((existe as unknown as { rows: unknown[] }).rows.length === 0) return false;

	await db.execute(sql`
		INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at)
		VALUES (${alertaId}, ${usuarioId}, NOW())
		ON CONFLICT (alerta_id, usuario_id)
		DO UPDATE SET leida_at = COALESCE(alerta_lecturas.leida_at, EXCLUDED.leida_at)
	`);
	return true;
}

/**
 * Marcar alerta como resuelta (GLOBAL — todos la ven resuelta y quién la resolvió).
 * Además queda marcada como leída para el usuario que la resolvió.
 *
 * Broadcast por socket a todos los usuarios conectados al room del dueño (incluye
 * dueño + gerentes en modo comercial) para que actualicen su caché en tiempo real.
 */
export async function marcarAlertaResuelta(
	alertaId: string,
	negocioId: string,
	usuarioId: string
): Promise<boolean> {
	const resultado = await db.execute(sql`
		UPDATE alertas_seguridad
		SET resuelta = true,
		    resuelta_at = NOW(),
		    resuelta_por_usuario_id = ${usuarioId}
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);
	const rowCount = (resultado as { rowCount: number }).rowCount ?? 0;
	if (rowCount === 0) return false;

	// Para el usuario que la resolvió, también se marca leída.
	await db.execute(sql`
		INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at)
		VALUES (${alertaId}, ${usuarioId}, NOW())
		ON CONFLICT (alerta_id, usuario_id)
		DO UPDATE SET leida_at = COALESCE(alerta_lecturas.leida_at, EXCLUDED.leida_at)
	`);

	// Broadcast en tiempo real: todos los clientes del negocio invalidan su caché.
	// Los gerentes en modo comercial están unidos al room del dueño (ver
	// apps/web/src/services/socketService.ts línea 163), así que emitir al dueño
	// alcanza también a los gerentes sin emisiones adicionales.
	broadcastAlertaActualizada(negocioId, alertaId).catch((err) =>
		console.error('Error emitiendo alerta:actualizada por socket:', err),
	);

	return true;
}

/**
 * Emite el evento `alerta:actualizada` al room del dueño del negocio para que
 * los clientes conectados (dueño + gerentes en modo comercial) refresquen su
 * caché de alertas.
 */
async function broadcastAlertaActualizada(
	negocioId: string,
	alertaId: string,
): Promise<void> {
	const negocio = await db.execute(sql`
		SELECT usuario_id FROM negocios WHERE id = ${negocioId}
	`);
	const duenoId = (negocio as unknown as { rows: { usuario_id: string }[] }).rows[0]?.usuario_id;
	if (!duenoId) return;
	emitirAUsuario(duenoId, 'alerta:actualizada', { alertaId, negocioId });
}

/**
 * Marcar todas las alertas como leídas para el usuario actual (bulk upsert).
 * Respeta filtros por sucursal/categoría/severidad. Excluye las ya ocultadas
 * por el usuario.
 */
export async function marcarTodasLeidas(
	negocioId: string,
	sucursalId: string | undefined,
	usuarioId: string,
	categoria?: CategoriaAlerta,
	severidad?: SeveridadAlerta
): Promise<number> {
	const filtroSucursal = sucursalId
		? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)`
		: sql``;
	const filtroCat = categoria ? sql`AND a.categoria = ${categoria}` : sql``;
	const filtroSev = severidad ? sql`AND a.severidad = ${severidad}` : sql``;

	const resultado = await db.execute(sql`
		INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at)
		SELECT a.id, ${usuarioId}, NOW()
		FROM alertas_seguridad a
		LEFT JOIN alerta_lecturas al
			ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
		WHERE a.negocio_id = ${negocioId}
			AND al.leida_at IS NULL
			AND al.ocultada_at IS NULL
			${filtroSucursal} ${filtroCat} ${filtroSev}
		ON CONFLICT (alerta_id, usuario_id)
		DO UPDATE SET leida_at = EXCLUDED.leida_at
		WHERE alerta_lecturas.leida_at IS NULL
	`);

	return (resultado as { rowCount: number }).rowCount ?? 0;
}

/**
 * Contar alertas no leídas para el usuario actual (badge). Excluye ocultadas.
 */
export async function contarNoLeidas(
	negocioId: string,
	sucursalId: string | undefined,
	usuarioId: string
): Promise<number> {
	const filtroSucursal = sucursalId
		? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)`
		: sql``;

	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int AS total
		FROM alertas_seguridad a
		LEFT JOIN alerta_lecturas al ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
		WHERE a.negocio_id = ${negocioId}
			AND al.leida_at IS NULL
			AND al.ocultada_at IS NULL
			${filtroSucursal}
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
			datos, acciones_sugeridas,
			NULL::timestamptz AS leida_at_usuario,
			resuelta, resuelta_at, resuelta_por_usuario_id,
			NULL::varchar AS resuelta_por_nombre,
			NULL::varchar AS resuelta_por_apellidos,
			created_at
	`);

	const alerta = mapearAlerta((resultado as unknown as { rows: Record<string, unknown>[] }).rows[0]);

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
	contexto?: string,
	sucursalId?: string
): Promise<boolean> {
	const filtroContexto = contexto
		? sql`AND (datos->>'contextoId')::text = ${contexto}`
		: sql``;
	const filtroSucursal = sucursalId
		? sql`AND sucursal_id = ${sucursalId}::uuid`
		: sql``;

	const resultado = await db.execute(sql`
		SELECT 1 FROM alertas_seguridad
		WHERE negocio_id = ${negocioId}
			AND tipo = ${tipo}
			AND created_at > NOW() - INTERVAL '24 hours'
			${filtroContexto}
			${filtroSucursal}
		LIMIT 1
	`);

	return ((resultado as unknown as { rows: unknown[] }).rows.length) > 0;
}

// ============================================================================
// Configuración de Alertas
// ============================================================================

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

	const DESACTIVADOS_POR_DEFECTO: TipoAlerta[] = ['montos_redondos'];

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

export async function estaAlertaActiva(
	negocioId: string,
	tipo: TipoAlerta
): Promise<boolean> {
	const resultado = await db.execute(sql`
		SELECT activo FROM alertas_configuracion
		WHERE negocio_id = ${negocioId} AND tipo_alerta = ${tipo}
	`);

	const rows = (resultado as unknown as { rows: { activo: boolean }[] }).rows;
	const DESACTIVADOS_POR_DEFECTO: TipoAlerta[] = ['montos_redondos'];
	if (rows.length === 0) return !DESACTIVADOS_POR_DEFECTO.includes(tipo);
	return rows[0].activo;
}

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
// Ocultar Alertas (antes "eliminar" desde la UI — ahora oculta por usuario)
// ============================================================================

/**
 * Ocultar una alerta del feed del usuario actual.
 * La alerta sigue existiendo para otros usuarios; el borrado físico queda
 * reservado para jobs admin.
 */
export async function ocultarAlerta(
	alertaId: string,
	negocioId: string,
	usuarioId: string
): Promise<boolean> {
	const existe = await db.execute(sql`
		SELECT 1 FROM alertas_seguridad WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);
	if ((existe as unknown as { rows: unknown[] }).rows.length === 0) return false;

	await db.execute(sql`
		INSERT INTO alerta_lecturas (alerta_id, usuario_id, ocultada_at)
		VALUES (${alertaId}, ${usuarioId}, NOW())
		ON CONFLICT (alerta_id, usuario_id)
		DO UPDATE SET ocultada_at = COALESCE(alerta_lecturas.ocultada_at, EXCLUDED.ocultada_at)
	`);
	return true;
}

/**
 * Ocultar del feed del usuario todas las alertas globalmente resueltas
 * (dentro del scope de sucursal). Bulk upsert.
 */
export async function ocultarAlertasResueltas(
	negocioId: string,
	sucursalId: string | undefined,
	usuarioId: string
): Promise<number> {
	const filtroSucursal = sucursalId
		? sql`AND (a.sucursal_id = ${sucursalId} OR a.sucursal_id IS NULL)`
		: sql``;

	const resultado = await db.execute(sql`
		INSERT INTO alerta_lecturas (alerta_id, usuario_id, ocultada_at)
		SELECT a.id, ${usuarioId}, NOW()
		FROM alertas_seguridad a
		LEFT JOIN alerta_lecturas al
			ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
		WHERE a.negocio_id = ${negocioId}
			AND a.resuelta = true
			AND al.ocultada_at IS NULL
			${filtroSucursal}
		ON CONFLICT (alerta_id, usuario_id)
		DO UPDATE SET ocultada_at = EXCLUDED.ocultada_at
		WHERE alerta_lecturas.ocultada_at IS NULL
	`);

	return (resultado as { rowCount: number }).rowCount ?? 0;
}

/**
 * Borrado FÍSICO de una alerta (admin / cron). Elimina la fila para todos.
 * Ya no se expone en la UI comercial — si un comerciante quiere sacarla de
 * su vista, debe usar `ocultarAlerta`.
 */
export async function eliminarAlertaFisicamente(
	alertaId: string,
	negocioId: string
): Promise<boolean> {
	const resultado = await db.execute(sql`
		DELETE FROM alertas_seguridad
		WHERE id = ${alertaId} AND negocio_id = ${negocioId}
	`);

	return ((resultado as { rowCount: number }).rowCount ?? 0) > 0;
}

// ============================================================================
// Helpers internos
// ============================================================================

function mapearAlerta(row: Record<string, unknown>): AlertaCompleta {
	const leidaAt = (row.leida_at_usuario as string | null) ?? null;
	const resuelta = (row.resuelta as boolean) ?? false;
	const resueltaAt = (row.resuelta_at as string) ?? null;
	const resueltaPorId = (row.resuelta_por_usuario_id as string) ?? null;
	const resueltaPorNombre = (row.resuelta_por_nombre as string) ?? null;
	const resueltaPorApellidos = (row.resuelta_por_apellidos as string) ?? null;
	const resueltaPor = resueltaPorId
		? {
			id: resueltaPorId,
			nombre: [resueltaPorNombre, resueltaPorApellidos].filter(Boolean).join(' ').trim() || 'Desconocido',
		}
		: null;

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
		leida: leidaAt !== null,
		leidaAt,
		resuelta,
		resueltaAt,
		resueltaPor,
		createdAt: row.created_at as string,
	};
}

/**
 * Notificar al dueño y empleados cuando hay alerta de severidad alta
 */
async function notificarAlertaAlta(alerta: AlertaCompleta): Promise<void> {
	const negocioResult = await db.execute(sql`
		SELECT usuario_id FROM negocios WHERE id = ${alerta.negocioId}
	`);

	const duenoId = (negocioResult as unknown as { rows: { usuario_id: string }[] }).rows[0]?.usuario_id;
	if (!duenoId) return;

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

	emitirAUsuario(duenoId, 'alerta:nueva', {
		id: alerta.id,
		tipo: alerta.tipo,
		severidad: alerta.severidad,
		titulo: alerta.titulo,
	});
}

// ============================================================================
// Alias de compatibilidad (nombres viejos usados por el controller)
// ============================================================================

/** @deprecated Usar `ocultarAlerta`. Mantener por compatibilidad del controller. */
export const eliminarAlerta = ocultarAlerta;
/** @deprecated Usar `ocultarAlertasResueltas`. Mantener por compatibilidad del controller. */
export const eliminarAlertasResueltas = ocultarAlertasResueltas;
