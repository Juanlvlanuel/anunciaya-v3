/**
 * seed-negocios-estados-dev.ts
 * ============================
 * Siembra 3 negocios de prueba en la cartera de JUAN01, uno por cada estado de
 * membresía, para VER cómo se comporta la ficha (modal) del Panel sin esperar al
 * ciclo real de Stripe:
 *   · "Prueba · En gracia"   → en_gracia (venció hace 3d, reintento en 2d, gracia 11d)
 *   · "Prueba · Suspendido"  → suspendido por impago (activo=false, sin próximo cobro)
 *   · "Prueba · Cancelado"   → cancelado/archivado
 *
 * Cada negocio nace con su dueño comercial coherente (pasa el CHECK
 * usuarios_modo_comercial_logico_check) y embajador_id = JUAN01.
 *
 * Idempotente: reusa al dueño por correo y recrea su negocio. Aborta en producción.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/seed-negocios-estados-dev.ts
 * Revertir:  DELETE FROM usuarios WHERE correo IN
 *            ('prueba.gracia@dev.local','prueba.suspendido@dev.local','prueba.cancelado@dev.local');
 *            (el ON DELETE CASCADE borra sus negocios)
 *
 * Ubicación: apps/api/scripts/seed-negocios-estados-dev.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const ESTADOS = [
    {
        correo: 'prueba.gracia@dev.local',
        apellidos: 'En Gracia',
        negocio: 'Prueba · En gracia',
        campos: sql`
            created_at = now() - interval '47 days',
            estado_membresia = 'en_gracia', activo = true, estado_admin = 'activo',
            onboarding_completado = true, es_borrador = false, metodo_cobro = 'tarjeta',
            fecha_vencimiento   = now() - interval '3 days',
            fecha_proximo_cobro = now() + interval '2 days',
            fecha_inicio_gracia = now() - interval '3 days',
            fecha_limite_gracia = now() + interval '11 days',
            fecha_primer_pago   = (now() - interval '33 days')::date`,
    },
    {
        correo: 'prueba.suspendido@dev.local',
        apellidos: 'Suspendido',
        negocio: 'Prueba · Suspendido',
        campos: sql`
            created_at = now() - interval '64 days',
            estado_membresia = 'suspendido', activo = false, estado_admin = 'activo',
            onboarding_completado = true, es_borrador = false, metodo_cobro = 'tarjeta',
            fecha_vencimiento   = now() - interval '20 days',
            fecha_proximo_cobro = NULL,
            fecha_inicio_gracia = now() - interval '20 days',
            fecha_limite_gracia = now() - interval '6 days',
            fecha_primer_pago   = (now() - interval '50 days')::date`,
    },
    {
        correo: 'prueba.cancelado@dev.local',
        apellidos: 'Cancelado',
        negocio: 'Prueba · Cancelado',
        campos: sql`
            created_at = now() - interval '84 days',
            estado_membresia = 'cancelado', activo = false, estado_admin = 'archivado',
            onboarding_completado = true, es_borrador = false, metodo_cobro = 'tarjeta',
            fecha_vencimiento   = now() - interval '40 days',
            fecha_proximo_cobro = NULL,
            fecha_primer_pago   = (now() - interval '70 days')::date`,
    },
];

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Solo DEV.');
        process.exit(1);
    }

    const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`))
        .rows as Array<{ id: string }>;
    if (!emb[0]) {
        console.error('✗ No existe el embajador JUAN01. Corre seed-vendedor-prueba.ts primero.');
        process.exit(1);
    }
    const juanId = emb[0].id;

    const resumen: Array<{ negocio: string; estado: string }> = [];

    for (const e of ESTADOS) {
        // 1) Dueño comercial coherente (UPSERT por correo).
        const u = (await db.execute(sql`
            INSERT INTO usuarios
                (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                 estado, modo_activo, tiene_modo_comercial)
            VALUES
                ('Prueba', ${e.apellidos}, ${e.correo}, 'comercial', 1, true, now(),
                 'activo', 'comercial', true)
            ON CONFLICT (correo) DO UPDATE SET
                perfil = 'comercial', modo_activo = 'comercial', tiene_modo_comercial = true, updated_at = now()
            RETURNING id::text
        `)).rows as Array<{ id: string }>;
        const usuarioId = u[0].id;

        // 2) Recrear su negocio (limpia el previo para re-ejecución idempotente).
        await db.execute(sql`DELETE FROM negocios WHERE usuario_id = ${usuarioId}`);
        const n = (await db.execute(sql`
            INSERT INTO negocios (usuario_id, nombre, embajador_id)
            VALUES (${usuarioId}, ${e.negocio}, ${juanId})
            RETURNING id::text
        `)).rows as Array<{ id: string }>;
        const negocioId = n[0].id;

        // 3) Aplicar los campos del estado + enlazar negocio al dueño.
        await db.execute(sql`UPDATE negocios SET ${e.campos}, updated_at = now() WHERE id = ${negocioId}`);
        await db.execute(sql`UPDATE usuarios SET negocio_id = ${negocioId} WHERE id = ${usuarioId}`);

        resumen.push({ negocio: e.negocio, estado: e.apellidos });
    }

    console.log('\n───────── RESUMEN seed-negocios-estados-dev ─────────');
    console.log(`Ambiente BD: ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Atribuidos a: JUAN01 (${juanId})`);
    console.table(resumen);
    console.log('Abre "Mi cartera" del vendedor y revisa la ficha de cada uno.');
    console.log('─────────────────────────────────────────────────────\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-negocios-estados-dev:', err);
    process.exit(1);
});
