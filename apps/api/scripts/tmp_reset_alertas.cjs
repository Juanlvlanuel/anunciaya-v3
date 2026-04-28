/* Reset de alertas local: marcar todas como no leídas y no resueltas */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
	const url = process.env.DATABASE_URL;
	console.log('Conectando a:', url.replace(/:[^:@]+@/, ':***@'));
	const client = new Client({ connectionString: url });
	await client.connect();

	try {
		// Estado antes
		const antes = await client.query(`
			SELECT
				n.id AS negocio_id,
				n.nombre AS negocio,
				COUNT(a.*) AS total,
				COUNT(*) FILTER (WHERE a.leida = false) AS no_leidas,
				COUNT(*) FILTER (WHERE a.leida = true) AS leidas,
				COUNT(*) FILTER (WHERE a.resuelta = true) AS resueltas
			FROM negocios n
			LEFT JOIN alertas_seguridad a ON a.negocio_id = n.id
			GROUP BY n.id, n.nombre
			HAVING COUNT(a.*) > 0
			ORDER BY total DESC;
		`);
		console.log('\n=== ESTADO ANTES ===');
		console.table(antes.rows);

		// Reset
		const res = await client.query(`
			UPDATE alertas_seguridad
			SET leida = false, leida_at = NULL, resuelta = false, resuelta_at = NULL
			RETURNING id;
		`);
		console.log(`\n✓ ${res.rowCount} alertas reseteadas (leida=false, resuelta=false)`);

		// Estado después
		const despues = await client.query(`
			SELECT
				n.id AS negocio_id,
				n.nombre AS negocio,
				COUNT(a.*) AS total,
				COUNT(*) FILTER (WHERE a.leida = false) AS no_leidas,
				COUNT(*) FILTER (WHERE a.leida = true) AS leidas,
				COUNT(*) FILTER (WHERE a.resuelta = true) AS resueltas
			FROM negocios n
			LEFT JOIN alertas_seguridad a ON a.negocio_id = n.id
			GROUP BY n.id, n.nombre
			HAVING COUNT(a.*) > 0
			ORDER BY total DESC;
		`);
		console.log('\n=== ESTADO DESPUÉS ===');
		console.table(despues.rows);

		// Distribución por sucursal para poder probar el fix
		const porSucursal = await client.query(`
			SELECT
				COALESCE(s.nombre, '(global / sucursal_id NULL)') AS sucursal,
				a.sucursal_id,
				COUNT(*) AS alertas
			FROM alertas_seguridad a
			LEFT JOIN negocio_sucursales s ON s.id = a.sucursal_id
			GROUP BY s.nombre, a.sucursal_id
			ORDER BY alertas DESC;
		`);
		console.log('\n=== ALERTAS POR SUCURSAL ===');
		console.table(porSucursal.rows);
	} finally {
		await client.end();
	}
})().catch((err) => {
	console.error('ERROR:', err.message);
	process.exit(1);
});
