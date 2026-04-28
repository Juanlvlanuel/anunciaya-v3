/**
 * scanya-cierre-auto.service.ts
 * ==============================
 * Cierra automáticamente turnos de ScanYA que rebasaron el límite operativo.
 *
 * Algoritmo del límite (opción "inteligente", sin config por sucursal):
 *  - Si la sucursal tiene horario operativo ese día y NO es 24/7:
 *      límite = duración del horario + 2h gracia
 *  - Si la sucursal está marcada como cerrada ese día (abierto = false)
 *    o no tiene horario configurado:
 *      límite = 24h
 *  - Si es 24/7 (apertura == cierre):
 *      límite = 24h
 *  - Cap absoluto: 30h (turno colgado en serio)
 *
 * Cierre:
 *  - hora_fin = NOW()
 *  - cerrado_por = NULL (distingue de cierre manual)
 *  - notas_cierre = mensaje explicativo con el límite que rebasó
 *
 * Aviso al operador:
 *  - NO se envía notificación AY (los empleados no tienen cuenta propia en
 *    AnunciaYA — `empleados.usuario_id` apunta al dueño que los creó, no
 *    a una cuenta personal del empleado).
 *  - En su lugar, el aviso se muestra al volver a abrir ScanYA: el endpoint
 *    de login detecta si el último turno cerrado fue auto-cerrado
 *    recientemente y el frontend renderiza un toast informativo.
 *  - Detección frontend: ver `loginDueno`/`loginEmpleado` en
 *    `scanya.service.ts` (campo `avisoTurnoAutoCerrado` en la respuesta).
 *
 * Llamado desde el cron `scanya.cron.ts` cada 30 minutos.
 *
 * UBICACIÓN: apps/api/src/services/scanya-cierre-auto.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

const HORAS_LIMITE_DEFAULT = 24;
const HORAS_GRACIA = 2;
const HORAS_CAP_ABSOLUTO = 30;
const HORAS_MIN_PARA_REVISAR = 3; // no procesar turnos muy jóvenes

interface TurnoCandidato {
	turno_id: string;
	negocio_id: string;
	sucursal_id: string;
	zona_horaria: string;
	hora_inicio: string;
	horas_abierto: number;
	abierto_dia: boolean | null;
	hora_apertura: string | null; // 'HH:MM:SS'
	hora_cierre: string | null;
}

/**
 * Convierte 'HH:MM:SS' a minutos desde medianoche.
 */
function timeAMinutos(hms: string | null): number | null {
	if (!hms) return null;
	const [h, m] = hms.split(':').map((n) => parseInt(n, 10));
	if (Number.isNaN(h) || Number.isNaN(m)) return null;
	return h * 60 + m;
}

/**
 * Calcula el límite en horas para un turno según las reglas descritas arriba.
 */
function calcularLimiteHoras(t: TurnoCandidato): number {
	// Sucursal cerrada ese día → 24h
	if (t.abierto_dia === false) return HORAS_LIMITE_DEFAULT;

	const apertura = timeAMinutos(t.hora_apertura);
	const cierre = timeAMinutos(t.hora_cierre);

	// Sin horario configurado → 24h
	if (apertura === null || cierre === null) return HORAS_LIMITE_DEFAULT;

	// 24/7 (apertura == cierre) → 24h
	if (apertura === cierre) return HORAS_LIMITE_DEFAULT;

	// Duración del horario operativo (manejando cruce de medianoche)
	const minutosDelHorario = cierre > apertura
		? cierre - apertura
		: 24 * 60 - apertura + cierre;

	const horasDelHorario = minutosDelHorario / 60;
	const limite = horasDelHorario + HORAS_GRACIA;

	// Cap absoluto
	return Math.min(limite, HORAS_CAP_ABSOLUTO);
}

/**
 * Trae todos los turnos abiertos con la información necesaria para decidir
 * si se cierran. Filtra los que llevan menos de HORAS_MIN_PARA_REVISAR
 * para no tocar turnos recién abiertos.
 */
async function obtenerTurnosAbiertosCandidatos(): Promise<TurnoCandidato[]> {
	const resultado = await db.execute(sql`
		SELECT
			t.id AS turno_id,
			t.negocio_id,
			t.sucursal_id,
			ns.zona_horaria,
			t.hora_inicio::text AS hora_inicio,
			(EXTRACT(EPOCH FROM (NOW() - t.hora_inicio)) / 3600.0)::float AS horas_abierto,
			nh.abierto AS abierto_dia,
			nh.hora_apertura::text AS hora_apertura,
			nh.hora_cierre::text AS hora_cierre
		FROM scanya_turnos t
		INNER JOIN negocio_sucursales ns ON ns.id = t.sucursal_id
		LEFT JOIN negocio_horarios nh
			ON nh.sucursal_id = t.sucursal_id
			AND nh.dia_semana = EXTRACT(DOW FROM t.hora_inicio AT TIME ZONE ns.zona_horaria)::int
		WHERE t.hora_fin IS NULL
			AND EXTRACT(EPOCH FROM (NOW() - t.hora_inicio)) / 3600.0 >= ${HORAS_MIN_PARA_REVISAR}
		ORDER BY t.hora_inicio ASC
	`);

	return resultado.rows as unknown as TurnoCandidato[];
}

/**
 * Cierra el turno marcándolo como cierre automático.
 *
 * Distinción del cierre manual:
 *  - cerrado_por = NULL  (manual siempre tiene UUID del usuario que cerró)
 *  - notas_cierre con prefijo "Cerrado automáticamente —"
 */
async function cerrarTurnoAuto(t: TurnoCandidato, limiteHoras: number): Promise<void> {
	const horasRedondeado = Math.round(limiteHoras * 10) / 10;
	const notas = `Cerrado automáticamente — turno excedió ${horasRedondeado}h sin cierre manual.`;

	await db.execute(sql`
		UPDATE scanya_turnos
		SET hora_fin = NOW(),
		    notas_cierre = ${notas}
		WHERE id = ${t.turno_id}
		  AND hora_fin IS NULL
	`);
}

/**
 * Punto de entrada del cron: revisa todos los turnos abiertos, decide
 * cuáles se pasaron del límite y los cierra. Devuelve métricas para log.
 */
export async function ejecutarCierreAutoTurnos(): Promise<{
	revisados: number;
	cerrados: number;
	errores: number;
}> {
	const candidatos = await obtenerTurnosAbiertosCandidatos();
	let cerrados = 0;
	let errores = 0;

	for (const t of candidatos) {
		const limite = calcularLimiteHoras(t);
		if (t.horas_abierto < limite) continue;

		try {
			await cerrarTurnoAuto(t, limite);
			cerrados++;
		} catch (error) {
			errores++;
			console.error(`[ScanYA cierre-auto] Error cerrando turno ${t.turno_id}:`, error);
		}
	}

	return { revisados: candidatos.length, cerrados, errores };
}

// =============================================================================
// AVISO AL LOGIN DE SCANYA
// =============================================================================

export interface AvisoTurnoAutoCerrado {
	turnoId: string;
	horaFin: string;
	notas: string;
	sucursalNombre: string;
	sucursalEsPrincipal: boolean;
}

/**
 * Devuelve el aviso a mostrar al operador en su próximo login a ScanYA si su
 * último turno fue auto-cerrado en las últimas 24h, no ha abierto otro turno
 * después, Y el aviso aún no ha sido visto. Devuelve null si no hay nada
 * pendiente que avisar.
 *
 * Efecto secundario: si encuentra un aviso pendiente, marca el turno con
 * `aviso_visto_at = NOW()` para que los próximos logins ya no lo entreguen.
 * Esto evita que el modal aparezca repetidamente cada vez que el operador
 * inicia sesión dentro de las 24h posteriores al cierre.
 *
 * Llamado desde `loginDueno` y `loginEmpleado` en `scanya.service.ts`.
 */
export async function obtenerAvisoTurnoAutoCerrado(
	operador: { tipo: 'empleado'; empleadoId: string } | { tipo: 'usuario'; usuarioId: string }
): Promise<AvisoTurnoAutoCerrado | null> {
	const filtroOperador = operador.tipo === 'empleado'
		? sql`t.empleado_id = ${operador.empleadoId}`
		: sql`t.usuario_id = ${operador.usuarioId}`;

	const filtroPosterior = operador.tipo === 'empleado'
		? sql`t2.empleado_id = ${operador.empleadoId}`
		: sql`t2.usuario_id = ${operador.usuarioId}`;

	const resultado = await db.execute(sql`
		SELECT
			t.id AS turno_id,
			t.hora_fin::text AS hora_fin,
			t.notas_cierre AS notas,
			ns.nombre AS sucursal_nombre,
			ns.es_principal AS sucursal_es_principal
		FROM scanya_turnos t
		INNER JOIN negocio_sucursales ns ON ns.id = t.sucursal_id
		WHERE ${filtroOperador}
			AND t.hora_fin IS NOT NULL
			AND t.cerrado_por IS NULL
			AND t.aviso_visto_at IS NULL
			AND t.notas_cierre LIKE 'Cerrado automáticamente%'
			AND t.hora_fin >= NOW() - INTERVAL '24 hours'
			AND NOT EXISTS (
				SELECT 1 FROM scanya_turnos t2
				WHERE ${filtroPosterior}
					AND t2.hora_inicio > t.hora_fin
			)
		ORDER BY t.hora_fin DESC
		LIMIT 1
	`);

	const row = resultado.rows[0] as {
		turno_id: string;
		hora_fin: string;
		notas: string;
		sucursal_nombre: string;
		sucursal_es_principal: boolean;
	} | undefined;

	if (!row) return null;

	// Marcar el aviso como visto para que no vuelva a aparecer en los
	// próximos logins. Si la entrega al frontend falla, el operador no lo
	// volverá a ver — es un trade-off aceptable porque el cierre y sus notas
	// quedan registrados en BD para auditoría.
	await db.execute(sql`
		UPDATE scanya_turnos
		SET aviso_visto_at = NOW()
		WHERE id = ${row.turno_id}
		  AND aviso_visto_at IS NULL
	`);

	return {
		turnoId: row.turno_id,
		horaFin: row.hora_fin,
		notas: row.notas,
		sucursalNombre: row.sucursal_nombre,
		sucursalEsPrincipal: row.sucursal_es_principal,
	};
}
