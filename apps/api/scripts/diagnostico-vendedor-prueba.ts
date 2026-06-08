/**
 * diagnostico-vendedor-prueba.ts
 * ==============================
 * SOLO LECTURA. Inspecciona el estado actual de la DB para enlazar al usuario
 * `vendedor.prueba@dev.local` como VENDEDOR de prueba del Panel. No escribe nada.
 *
 * Muestra: ambiente de BD, el usuario objetivo (rol_equipo/region/estado),
 * si ya tiene fila en `embajadores`, las regiones, las ciudades con región y la
 * cobertura actual en `embajador_ciudades`.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/diagnostico-vendedor-prueba.ts
 *
 * Ubicación: apps/api/scripts/diagnostico-vendedor-prueba.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const USUARIO_ID = 'febba5d9-ce4a-4355-afa1-b5021c49c721';

async function existeTabla(nombre: string): Promise<boolean> {
    const r = (await db.execute(sql`SELECT to_regclass(${'public.' + nombre}) AS reg`)).rows as Array<{ reg: string | null }>;
    return !!r[0]?.reg;
}

async function main() {
    console.log('\n══════════ DIAGNÓSTICO vendedor de prueba (SOLO LECTURA) ══════════');
    console.log(`Ambiente BD: ${process.env.DB_ENVIRONMENT || 'local (DATABASE_URL)'}`);

    // 1) Usuario objetivo
    const usuario = (await db.execute(sql`
        SELECT id::text, nombre, apellidos, correo, estado, perfil, modo_activo,
               tiene_modo_comercial, rol_equipo, region_id::text, correo_verificado
        FROM usuarios WHERE id = ${USUARIO_ID}
    `)).rows;
    console.log('\n── 1) Usuario objetivo ──────────────────────────────────────────');
    console.table(usuario);

    // 2) ¿Ya es embajador?
    const emb = (await db.execute(sql`
        SELECT id::text, codigo_referido, estado, negocios_registrados, created_at
        FROM embajadores WHERE usuario_id = ${USUARIO_ID}
    `)).rows;
    console.log('── 2) ¿Ya tiene fila en `embajadores`? ──────────────────────────');
    console.table(emb.length ? emb : [{ info: 'NO existe embajador para este usuario' }]);

    // 3) Regiones
    const regiones = (await db.execute(sql`SELECT id::text, nombre, activa FROM regiones ORDER BY nombre`)).rows;
    console.log('── 3) Regiones ──────────────────────────────────────────────────');
    console.table(regiones);

    // 4) Ciudades (resumen + las que tienen región asignada)
    if (await existeTabla('ciudades')) {
        const resumen = (await db.execute(sql`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE region_id IS NOT NULL)::int AS con_region,
                   count(*) FILTER (WHERE region_id IS NULL)::int AS sin_region
            FROM ciudades
        `)).rows;
        console.log('── 4) Ciudades — resumen ────────────────────────────────────────');
        console.table(resumen);

        const conRegion = (await db.execute(sql`
            SELECT c.id::text, c.slug, c.nombre, c.estado, r.nombre AS region, c.activa
            FROM ciudades c JOIN regiones r ON r.id = c.region_id
            ORDER BY r.nombre, c.slug
        `)).rows;
        console.log('   Ciudades CON región asignada:');
        console.table(conRegion);
    } else {
        console.log('── 4) Ciudades ── ⚠️ la tabla `ciudades` NO existe en esta BD');
    }

    // 5) Cobertura actual embajador_ciudades (todos los vendedores)
    if (await existeTabla('embajador_ciudades')) {
        const cobertura = (await db.execute(sql`
            SELECT u.correo, e.codigo_referido, e.estado AS estado_embajador,
                   c.slug AS ciudad, r.nombre AS region
            FROM embajador_ciudades ec
            JOIN embajadores e ON e.id = ec.embajador_id
            JOIN usuarios u ON u.id = e.usuario_id
            JOIN ciudades c ON c.id = ec.ciudad_id
            LEFT JOIN regiones r ON r.id = c.region_id
            ORDER BY u.correo, c.slug
        `)).rows;
        console.log('── 5) Cobertura actual en `embajador_ciudades` ──────────────────');
        console.table(cobertura.length ? cobertura : [{ info: 'sin cobertura registrada' }]);
    } else {
        console.log('── 5) ⚠️ la tabla `embajador_ciudades` NO existe en esta BD');
    }

    // 6) Negocios atribuidos a ESTE vendedor (cartera real)
    const cartera = (await db.execute(sql`
        SELECT n.id::text, n.nombre, n.es_borrador, n.onboarding_completado,
               n.estado_membresia, n.activo, n.estado_admin
        FROM negocios n
        JOIN embajadores e ON e.id = n.embajador_id
        WHERE e.usuario_id = ${USUARIO_ID}
        ORDER BY n.nombre
    `)).rows;
    console.log('── 6) Cartera REAL del vendedor (negocios.embajador_id → JUAN01) ─');
    console.table(cartera.length ? cartera : [{ info: 'SIN negocios atribuidos (cartera real = 0)' }]);

    // 7) Panorama de negocios + los que pagaron pero NO terminaron onboarding
    const resumenNeg = (await db.execute(sql`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE onboarding_completado = false)::int AS sin_onboarding,
               count(*) FILTER (WHERE es_borrador = true)::int AS borradores,
               count(*) FILTER (WHERE activo = true)::int AS activos,
               count(*) FILTER (WHERE estado_membresia = 'al_corriente')::int AS al_corriente
        FROM negocios
    `)).rows;
    console.log('── 7) Panorama de negocios (toda la DB) ─────────────────────────');
    console.table(resumenNeg);

    const pagoSinOnboarding = (await db.execute(sql`
        SELECT n.id::text, n.nombre, n.es_borrador, n.onboarding_completado,
               n.estado_membresia, n.activo, (u.stripe_subscription_id IS NOT NULL) AS tiene_suscripcion
        FROM negocios n
        JOIN usuarios u ON u.id = n.usuario_id
        WHERE n.onboarding_completado = false
        ORDER BY n.nombre
        LIMIT 20
    `)).rows;
    console.log('   Negocios con onboarding_completado = false (pagó-sin-terminar candidatos):');
    console.table(pagoSinOnboarding.length ? pagoSinOnboarding : [{ info: 'ninguno' }]);

    console.log('\n══════════════════════════════════════════════════════════════════\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en diagnostico-vendedor-prueba:', err);
    process.exit(1);
});
