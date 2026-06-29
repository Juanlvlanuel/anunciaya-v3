/**
 * seed-pago-manual-pendiente-dev.ts
 * =================================
 * Siembra UNA solicitud de pago manual "Por verificar" real para probar el pendiente
 * "Pagos por verificar" del Panel (campana + Resumen + módulo Suscripciones · pestaña "Por verificar").
 *
 * Crea un dueño comercial coherente + su negocio EN GRACIA (atribuido a JUAN01) e inserta una fila en
 * `pagos_manuales_solicitudes` con estado='pendiente'. Como comprobante reusa una imagen que ya exista
 * en la BD (un logo de negocio) para que el modal de aprobación muestre algo real; si no hay ninguna,
 * cae a un placeholder.
 *
 * Al APROBAR la solicitud desde el Panel, `marcarPagado` activa la membresía del negocio en gracia y
 * genera el recibo → el pendiente desaparece (cola viva). Al RECHAZARLA, también sale de la cola.
 *
 * Idempotente: reusa al dueño por correo, recrea su negocio y limpia sus solicitudes previas. Aborta en producción.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/seed-pago-manual-pendiente-dev.ts
 * Revertir:  DELETE FROM usuarios WHERE correo = 'prueba.pagomanual@dev.local';  (CASCADE borra negocio + solicitud)
 *
 * Ubicación: apps/api/scripts/seed-pago-manual-pendiente-dev.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const CORREO = 'prueba.pagomanual@dev.local';
const NEGOCIO = 'Prueba · Pago manual';
const PLACEHOLDER_COMPROBANTE = 'https://pub-e2d7b5cee341434dbe2884e04b368108.r2.dev/comprobantes/demo.jpg';

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

    // 1) Dueño comercial coherente (UPSERT por correo).
    const u = (await db.execute(sql`
        INSERT INTO usuarios
            (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
             estado, modo_activo, tiene_modo_comercial)
        VALUES
            ('Prueba', 'Pago Manual', ${CORREO}, 'comercial', 1, true, now(),
             'activo', 'comercial', true)
        ON CONFLICT (correo) DO UPDATE SET
            perfil = 'comercial', modo_activo = 'comercial', tiene_modo_comercial = true, updated_at = now()
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const usuarioId = u[0].id;

    // 2) Recrear su negocio EN GRACIA (para que aprobar la solicitud lo reactive). Atribuido a JUAN01.
    await db.execute(sql`DELETE FROM negocios WHERE usuario_id = ${usuarioId}`);
    const n = (await db.execute(sql`
        INSERT INTO negocios (usuario_id, nombre, embajador_id)
        VALUES (${usuarioId}, ${NEGOCIO}, ${juanId})
        RETURNING id::text
    `)).rows as Array<{ id: string }>;
    const negocioId = n[0].id;
    await db.execute(sql`
        UPDATE negocios SET
            created_at = now() - interval '47 days',
            estado_membresia = 'en_gracia', activo = true, estado_admin = 'activo',
            onboarding_completado = true, es_borrador = false, metodo_cobro = 'manual',
            fecha_vencimiento   = now() - interval '3 days',
            fecha_proximo_cobro = now() + interval '2 days',
            fecha_inicio_gracia = now() - interval '3 days',
            fecha_limite_gracia = now() + interval '11 days',
            fecha_primer_pago   = (now() - interval '33 days')::date,
            updated_at = now()
        WHERE id = ${negocioId}
    `);
    await db.execute(sql`UPDATE usuarios SET negocio_id = ${negocioId} WHERE id = ${usuarioId}`);

    // 3) Comprobante: reusa un logo real de la BD (para que el modal muestre una imagen); si no, placeholder.
    const img = (await db.execute(sql`
        SELECT logo_url AS url FROM negocios WHERE logo_url IS NOT NULL AND logo_url <> '' LIMIT 1
    `)).rows as Array<{ url: string }>;
    const comprobanteUrl = img[0]?.url ?? PLACEHOLDER_COMPROBANTE;

    // 4) Limpia solicitudes previas de este negocio (idempotencia) e inserta una PENDIENTE.
    await db.execute(sql`DELETE FROM pagos_manuales_solicitudes WHERE negocio_id = ${negocioId}`);
    await db.execute(sql`
        INSERT INTO pagos_manuales_solicitudes
            (negocio_id, usuario_id, monto, meses_declarados, referencia, nota, comprobante_url, estado)
        VALUES
            (${negocioId}, ${usuarioId}, 849, 1, 'TEST-TRANSFER-001',
             'Solicitud de prueba (seed dev)', ${comprobanteUrl}, 'pendiente')
    `);

    console.log('\n───────── RESUMEN seed-pago-manual-pendiente-dev ─────────');
    console.log(`Ambiente BD: ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Negocio:     ${NEGOCIO} (${negocioId}) — en gracia, atribuido a JUAN01`);
    console.log(`Solicitud:   $849 · 1 mes · estado 'pendiente'`);
    console.log(`Comprobante: ${comprobanteUrl === PLACEHOLDER_COMPROBANTE ? 'placeholder (no había logos en la BD)' : 'logo reusado de la BD'}`);
    console.log('→ Recarga el Panel: aparece el pendiente "Pagos por verificar" (campana + Resumen).');
    console.log('  El clic abre Suscripciones · pestaña "Por verificar". Aprueba o rechaza para vaciar la cola.');
    console.log('──────────────────────────────────────────────────────────\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-pago-manual-pendiente-dev:', err);
    process.exit(1);
});
