/**
 * diagnostico-marketplace-seed.ts
 * =================================
 * Diagnóstico del estado actual de articulos_marketplace en BD.
 * Muestra todos los artículos (sin importar estado) para decidir
 * qué limpiar y qué seed crear.
 *
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/diagnostico-marketplace-seed.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' DIAGNÓSTICO — articulos_marketplace');
    console.log('═══════════════════════════════════════════\n');

    // 1. Todos los artículos (incluyendo eliminados lógicos)
    const todos = await db.execute(sql`
        SELECT
            id,
            titulo,
            ciudad,
            estado,
            condicion,
            precio,
            usuario_id,
            created_at,
            deleted_at,
            expira_at
        FROM articulos_marketplace
        ORDER BY created_at DESC
    `);

    if (todos.rows.length === 0) {
        console.log('⚠️  La tabla está VACÍA — no hay artículos en absoluto.\n');
    } else {
        console.log(`Total de registros (incluyendo eliminados): ${todos.rows.length}\n`);

        // Detalle de cada artículo
        for (const a of todos.rows) {
            const eliminado = a.deleted_at ? ' [DELETED_AT]' : '';
            console.log(`  • "${a.titulo}"`);
            console.log(`    ID: ${a.id}`);
            console.log(`    Ciudad: ${a.ciudad} | Estado: ${a.estado} | Condición: ${a.condicion}`);
            console.log(`    Precio: $${a.precio} | Usuario: ${a.usuario_id}`);
            console.log(`    Creado: ${a.created_at} | Expira: ${a.expira_at}${eliminado}`);
            console.log('');
        }

        // Resumen por ciudad
        const porCiudad = await db.execute(sql`
            SELECT ciudad, COUNT(*) as total
            FROM articulos_marketplace
            GROUP BY ciudad
            ORDER BY total DESC
        `);
        console.log('Resumen por ciudad:');
        for (const r of porCiudad.rows) {
            console.log(`  ${r.ciudad}: ${r.total} artículos`);
        }
        console.log('');

        // Resumen por estado
        const porEstado = await db.execute(sql`
            SELECT estado, COUNT(*) as total
            FROM articulos_marketplace
            GROUP BY estado
            ORDER BY total DESC
        `);
        console.log('Resumen por estado:');
        for (const r of porEstado.rows) {
            console.log(`  ${r.estado}: ${r.total} artículos`);
        }
    }

    // 2. Usuarios disponibles para el seed (los de prueba existentes)
    const usuarios = await db.execute(sql`
        SELECT id, nombre_completo, email, modo_activo
        FROM usuarios
        WHERE email LIKE '%test%' OR email LIKE '%prueba%' OR id IN (
            SELECT DISTINCT usuario_id FROM articulos_marketplace
        )
        LIMIT 10
    `);
    console.log(`\nUsuarios relevantes (test + dueños de artículos actuales): ${usuarios.rows.length}`);
    for (const u of usuarios.rows) {
        console.log(`  • ${u.nombre_completo} <${u.email}> [modo: ${u.modo_activo}] ID: ${u.id}`);
    }

    process.exit(0);
}

main().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
});
