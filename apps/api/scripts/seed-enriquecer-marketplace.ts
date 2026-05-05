/**
 * seed-enriquecer-marketplace.ts
 * ===============================
 *
 * Enriquece los 14 artículos existentes del seed E2E para que la revisión
 * visual del MarketPlace (Fase C del cierre v1.1) tenga datos realistas
 * en pantalla:
 *
 *  - Distribuye las 4 condiciones (nuevo / seminuevo / usado / para reparar)
 *  - Suma fotos Unsplash adicionales a cada artículo (3 a 5 por artículo)
 *  - Sube total_vistas y total_guardados en algunos para alimentar los
 *    indicadores de actividad del Sprint 9.1
 *  - Reasigna 2 artículos a Jazmín (3f9577c5-...) para que pueda probar
 *    "mi propio perfil" de vendedor
 *  - Inserta 5 preguntas (3 respondidas + 2 pendientes) en distintos
 *    artículos para alimentar la sección Q&A y el indicador en CardArticulo
 *  - Reactiva la Tabla de surf (de pausada → activa)
 *
 * Idempotente: se puede correr varias veces sin duplicar preguntas
 * (limpia preguntas previas no eliminadas antes de insertar las nuevas).
 *
 * Ejecución:
 *   cd apps/api && pnpm tsx scripts/seed-enriquecer-marketplace.ts
 *
 * Ubicación: apps/api/scripts/seed-enriquecer-marketplace.ts
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

// =============================================================================
// CONSTANTES
// =============================================================================

const VENDEDOR_1 = 'a0000000-0000-4000-a000-000000000001'; // Test Usuario 1
const VENDEDOR_2 = 'a0000000-0000-4000-a000-000000000002'; // Test Usuario 2
const JAZMIN     = '3f9577c5-c9f0-4f2a-96b7-e4ed1823cad1';  // Jazmin Cecilia (modo personal)

// Mapeo artículo → fotos Unsplash extra (cada URL a 800px de ancho).
// La primera foto que ya está en BD se conserva como portada (index 0).
const FOTOS_EXTRA: Record<string, string[]> = {
    'b1000000-0000-4000-b000-000000000001': [ // iPhone 13
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
        'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80',
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000002': [ // Bicicleta Trek
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000003': [ // Sofá café
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000004': [ // Laptop HP
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000005': [ // Mancuernas
        'https://images.unsplash.com/photo-1591291621060-89264bd9b29c?w=800&q=80',
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000006': [ // Guitarra Yamaha
        'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&q=80',
        'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000007': [ // Cámara Sony
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80',
        'https://images.unsplash.com/photo-1519183071298-a2962be96693?w=800&q=80',
        'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000008': [ // Mesa comedor
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80',
        'https://images.unsplash.com/photo-1574180045827-681f8a1a9622?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000009': [ // Ropa niña
        'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80',
        'https://images.unsplash.com/photo-1622445275576-721325763afe?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000010': [ // Licuadora Oster
        'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80',
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000011': [ // Tenis Nike
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',
        'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000012': [ // Ventilador Hunter
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000013': [ // Libros prepa
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
        'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=800&q=80',
    ],
    'b1000000-0000-4000-b000-000000000014': [ // Tabla de surf
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
        'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=80',
    ],
};

// Cambio de condición: distribuir las 4
const CONDICIONES_NUEVAS: Record<string, string> = {
    'b1000000-0000-4000-b000-000000000010': 'nuevo',         // Licuadora — la marcamos como nueva
    'b1000000-0000-4000-b000-000000000009': 'nuevo',         // Ropa de niña — nueva (lote)
    'b1000000-0000-4000-b000-000000000012': 'para_reparar',  // Ventilador — para reparar
    'b1000000-0000-4000-b000-000000000013': 'para_reparar',  // Libros — algunos rayados
};

// Reasignación a Jazmín (para que tenga sus propios artículos)
const REASIGNAR_A_JAZMIN: string[] = [
    'b1000000-0000-4000-b000-000000000006', // Guitarra Yamaha
    'b1000000-0000-4000-b000-000000000010', // Licuadora Oster
];

// Métricas de actividad para indicadores
const ACTIVIDAD: Record<string, { vistas: number; guardados: number }> = {
    'b1000000-0000-4000-b000-000000000001': { vistas: 35, guardados: 8 }, // iPhone — el más visto
    'b1000000-0000-4000-b000-000000000003': { vistas: 28, guardados: 6 }, // Sofá
    'b1000000-0000-4000-b000-000000000004': { vistas: 22, guardados: 5 }, // Laptop
    'b1000000-0000-4000-b000-000000000007': { vistas: 18, guardados: 3 }, // Cámara
    'b1000000-0000-4000-b000-000000000002': { vistas: 12, guardados: 2 }, // Bicicleta
};

// Preguntas a sembrar (3 respondidas + 2 pendientes en distintos artículos).
// La pregunta del iPhone que ya respondiste se mantiene como está.
interface PreguntaSeed {
    articuloId: string;
    compradorId: string;
    pregunta: string;
    respuesta?: string;
}

const PREGUNTAS: PreguntaSeed[] = [
    // RESPONDIDAS
    {
        articuloId: 'b1000000-0000-4000-b000-000000000003', // Sofá (vendedor2)
        compradorId: JAZMIN,
        pregunta: '¿Cuánto miden las medidas exactas? ¿Caben tres adultos cómodos?',
        respuesta: 'Mide 2.10m de ancho. Sí, caben tres adultos cómodos sin problema.',
    },
    {
        articuloId: 'b1000000-0000-4000-b000-000000000004', // Laptop (vendedor1)
        compradorId: JAZMIN,
        pregunta: '¿Trae cargador y maletín? ¿Funciona el touchpad?',
        respuesta: 'Sí, trae cargador original y maletín neopreno. Touchpad perfecto.',
    },
    // PENDIENTES
    {
        articuloId: 'b1000000-0000-4000-b000-000000000002', // Bicicleta (vendedor2)
        compradorId: JAZMIN,
        pregunta: '¿Las llantas están en buen estado? ¿Le has cambiado la cadena?',
    },
    {
        articuloId: 'b1000000-0000-4000-b000-000000000007', // Cámara (vendedor1)
        compradorId: JAZMIN,
        pregunta: '¿Cuántos disparos tiene el cuerpo? ¿El lente sin hongo?',
    },
];

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    const c = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'anunciaya',
    });
    await c.connect();

    console.log('▶ Enriqueciendo MarketPlace para revisión visual...\n');

    // ── 1. Distribuir las 4 condiciones ──────────────────────────────────────
    console.log('1. Ajustando condiciones...');
    for (const [id, cond] of Object.entries(CONDICIONES_NUEVAS)) {
        await c.query('UPDATE articulos_marketplace SET condicion=$1 WHERE id=$2', [cond, id]);
        console.log(`   ${id.slice(-3)}  →  condicion='${cond}'`);
    }

    // ── 2. Sumar fotos extra a cada artículo ─────────────────────────────────
    console.log('\n2. Sumando fotos Unsplash extra...');
    for (const [id, extras] of Object.entries(FOTOS_EXTRA)) {
        const r = await c.query('SELECT fotos FROM articulos_marketplace WHERE id=$1', [id]);
        const fotosActuales = (r.rows[0]?.fotos as string[]) ?? [];
        // Si ya hay 2 o más fotos, asumir que el script ya corrió y skip
        if (fotosActuales.length >= 2) {
            console.log(`   ${id.slice(-3)}  →  ya tiene ${fotosActuales.length} fotos, skip`);
            continue;
        }
        const nuevas = [...fotosActuales, ...extras];
        await c.query(
            'UPDATE articulos_marketplace SET fotos=$1::jsonb WHERE id=$2',
            [JSON.stringify(nuevas), id]
        );
        console.log(`   ${id.slice(-3)}  →  ${fotosActuales.length} → ${nuevas.length} fotos`);
    }

    // ── 3. Reasignar 2 artículos a Jazmín ────────────────────────────────────
    console.log('\n3. Reasignando artículos a Jazmín...');
    for (const id of REASIGNAR_A_JAZMIN) {
        await c.query('UPDATE articulos_marketplace SET usuario_id=$1 WHERE id=$2', [JAZMIN, id]);
        console.log(`   ${id.slice(-3)}  →  usuario_id = Jazmin`);
    }

    // ── 4. Métricas de actividad ─────────────────────────────────────────────
    console.log('\n4. Subiendo total_vistas y total_guardados...');
    for (const [id, m] of Object.entries(ACTIVIDAD)) {
        await c.query(
            'UPDATE articulos_marketplace SET total_vistas=$1, total_guardados=$2 WHERE id=$3',
            [m.vistas, m.guardados, id]
        );
        console.log(`   ${id.slice(-3)}  →  vistas=${m.vistas}, guardados=${m.guardados}`);
    }

    // ── 5. Reactivar tabla de surf ───────────────────────────────────────────
    console.log('\n5. Reactivando "Tabla de surf"...');
    await c.query(
        "UPDATE articulos_marketplace SET estado='activa' WHERE id='b1000000-0000-4000-b000-000000000014'"
    );
    console.log('   tabla de surf  →  estado=activa');

    // ── 6. Sembrar preguntas (limpia las que no sean del iPhone respondido) ──
    console.log('\n6. Sembrando preguntas...');
    // Limpiar preguntas previas excepto las respondidas en el iPhone (las del 10e)
    await c.query(`
        DELETE FROM marketplace_preguntas
        WHERE NOT (articulo_id='b1000000-0000-4000-b000-000000000001' AND respuesta IS NOT NULL)
    `);
    for (const p of PREGUNTAS) {
        const r = await c.query(
            `INSERT INTO marketplace_preguntas
                (articulo_id, comprador_id, pregunta, respuesta, respondida_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (articulo_id, comprador_id) DO UPDATE SET
                pregunta = EXCLUDED.pregunta,
                respuesta = EXCLUDED.respuesta,
                respondida_at = EXCLUDED.respondida_at,
                deleted_at = NULL
             RETURNING id`,
            [
                p.articuloId,
                p.compradorId,
                p.pregunta,
                p.respuesta ?? null,
                p.respuesta ? new Date() : null,
            ]
        );
        console.log(
            `   ${p.articuloId.slice(-3)}  →  ${p.respuesta ? 'RESPONDIDA' : 'PENDIENTE'}  (id ${r.rows[0].id.slice(0, 8)}...)`
        );
    }

    // ── 7. Resumen final ─────────────────────────────────────────────────────
    console.log('\n──────── Resumen ────────');
    const total = await c.query(
        "SELECT estado, COUNT(*)::int AS n FROM articulos_marketplace GROUP BY estado ORDER BY estado"
    );
    console.table(total.rows);

    const porUsuario = await c.query(`
        SELECT u.nombre || ' ' || u.apellidos AS vendedor, COUNT(*)::int AS articulos
        FROM articulos_marketplace a
        JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.estado='activa' GROUP BY u.id, u.nombre, u.apellidos ORDER BY articulos DESC
    `);
    console.table(porUsuario.rows);

    const condDistr = await c.query(
        "SELECT condicion, COUNT(*)::int AS n FROM articulos_marketplace WHERE estado='activa' GROUP BY condicion ORDER BY condicion"
    );
    console.table(condDistr.rows);

    const preguntas = await c.query(
        "SELECT (CASE WHEN respuesta IS NULL THEN 'pendiente' ELSE 'respondida' END) AS estado, COUNT(*)::int AS n FROM marketplace_preguntas WHERE deleted_at IS NULL GROUP BY 1"
    );
    console.table(preguntas.rows);

    await c.end();
    console.log('\n✅ Enriquecimiento completo.');
}

main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
