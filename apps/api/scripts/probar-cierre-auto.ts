#!/usr/bin/env tsx
/**
 * Prueba end-to-end del cierre auto de turnos ScanYA.
 *
 * 1. Mueve la hora_inicio del turno de Carlos López 12h atrás.
 * 2. Ejecuta `ejecutarCierreAutoTurnos` (lógica del cron).
 * 3. Verifica que el turno fue cerrado con la marca correcta.
 * 4. Llama `obtenerAvisoTurnoAutoCerrado` simulando el login del empleado.
 * 5. Imprime el resultado.
 *
 * NO toca el otro turno abierto (el del dueño).
 */

import pg from 'pg';
import { config } from 'dotenv';
import {
	ejecutarCierreAutoTurnos,
	obtenerAvisoTurnoAutoCerrado,
} from '../src/services/scanya-cierre-auto.service.js';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Turno del dueño (Juan Manuel) — para validar modal con login dueño/gerente
const TURNO_ID = '7078bab5-ba1d-41e2-8ece-8d50e153ec3b';
const USUARIO_ID = 'b8bed800-703d-48eb-bc4c-f77450a05735';

async function main() {
	console.log('\n=== 1. Estado del turno ANTES ===');
	const antes = await pool.query(
		`SELECT id, hora_inicio::text, hora_fin::text, cerrado_por, notas_cierre,
		        ROUND((EXTRACT(EPOCH FROM (NOW() - hora_inicio))/3600)::numeric, 2) AS horas_abierto
		 FROM scanya_turnos WHERE id = $1`,
		[TURNO_ID]
	);
	console.table(antes.rows);

	console.log('\n=== 2. UPDATE: mover hora_inicio 12h atrás ===');
	await pool.query(
		`UPDATE scanya_turnos SET hora_inicio = NOW() - INTERVAL '12 hours' WHERE id = $1`,
		[TURNO_ID]
	);
	const tras = await pool.query(
		`SELECT id, hora_inicio::text,
		        ROUND((EXTRACT(EPOCH FROM (NOW() - hora_inicio))/3600)::numeric, 2) AS horas_abierto
		 FROM scanya_turnos WHERE id = $1`,
		[TURNO_ID]
	);
	console.table(tras.rows);

	console.log('\n=== 3. Ejecutar ejecutarCierreAutoTurnos() ===');
	const r = await ejecutarCierreAutoTurnos();
	console.log('Resultado:', r);

	console.log('\n=== 4. Estado del turno DESPUÉS ===');
	const despues = await pool.query(
		`SELECT id, hora_inicio::text, hora_fin::text, cerrado_por, notas_cierre
		 FROM scanya_turnos WHERE id = $1`,
		[TURNO_ID]
	);
	console.table(despues.rows);

	console.log('\n=== 5. Simular login dueño: obtenerAvisoTurnoAutoCerrado ===');
	const aviso = await obtenerAvisoTurnoAutoCerrado({
		tipo: 'usuario',
		usuarioId: USUARIO_ID,
	});
	console.log('Aviso:', aviso);

	await pool.end();
	console.log('\n✅ Prueba terminada.');
}

main().catch((e) => { console.error(e); pool.end(); process.exit(1); });
