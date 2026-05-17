/**
 * seed-servicios-dev.ts
 * ======================
 * Script TEMPORAL para insertar 5 publicaciones de ejemplo en
 * `servicios_publicaciones`. Sirve para validar visualmente el Feed
 * (Sprint 2) y el Detalle (Sprint 3) antes de que el Wizard (Sprint 4)
 * esté listo.
 *
 * Uso:
 *   cd apps/api && pnpm tsx scripts/seed-servicios-dev.ts
 *
 * Para limpiar después:
 *   cd apps/api && pnpm tsx scripts/seed-servicios-dev.ts --limpiar
 *
 * Conexión: usa el DATABASE_URL del `.env` (apunta a localhost por defecto
 * en desarrollo). No tocar Supabase desde aquí.
 *
 * Ubicación: apps/api/scripts/seed-servicios-dev.ts
 */

import 'dotenv/config';
import pg from 'pg';

const CORREO_USUARIO = 'vj.juan.24@gmail.com';

const TITULOS_SEED = [
    'Plomería residencial 24h',
    'Diseño web para negocios locales',
    'Pastelería para eventos y XV',
    'Mesero(a) turno noche',
    'Busco fotógrafo para boda',
] as const;

async function main() {
    const limpiar = process.argv.includes('--limpiar');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL no está definida en .env');
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString: databaseUrl });

    try {
        const ambiente = process.env.DB_ENVIRONMENT ?? 'local';
        console.log(`\n🔌 Conectando a BD [${ambiente.toUpperCase()}]...`);

        // 1. Buscar usuario_id
        const userRes = await pool.query<{ id: string; nombre: string; correo: string }>(
            'SELECT id, nombre, correo FROM usuarios WHERE correo = $1 LIMIT 1',
            [CORREO_USUARIO],
        );
        if (userRes.rows.length === 0) {
            console.error(`❌ No se encontró usuario con correo ${CORREO_USUARIO}`);
            console.error('   Verifica que el usuario existe en la BD o ajusta CORREO_USUARIO.');
            process.exit(1);
        }
        const { id: usuarioId, nombre } = userRes.rows[0];
        console.log(`✓ Usuario: ${nombre} (${usuarioId})\n`);

        if (limpiar) {
            const del = await pool.query(
                `DELETE FROM servicios_publicaciones WHERE titulo = ANY($1::text[])`,
                [TITULOS_SEED as readonly string[]],
            );
            console.log(`🧹 Eliminadas ${del.rowCount} publicaciones seed.\n`);
            return;
        }

        // 2. Verificar que la tabla existe
        const tablaRes = await pool.query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'servicios_publicaciones'
            ) AS exists`,
        );
        if (!tablaRes.rows[0].exists) {
            console.error('❌ Tabla `servicios_publicaciones` no existe en esta BD.');
            console.error('   Corre las migraciones primero:');
            console.error('     - docs/migraciones/2026-05-15-servicios-base.sql');
            console.error('     - docs/migraciones/2026-05-15-chat-servicios-fk.sql');
            process.exit(1);
        }

        // 3. Verificar si ya hay seeds previos
        const existentesRes = await pool.query<{ titulo: string }>(
            `SELECT titulo FROM servicios_publicaciones WHERE titulo = ANY($1::text[])`,
            [TITULOS_SEED as readonly string[]],
        );
        if (existentesRes.rows.length > 0) {
            console.log(
                `⚠️  Ya hay ${existentesRes.rows.length} seeds en la BD. Saltando inserción.`,
            );
            console.log('   Para reinsertar, primero ejecuta:');
            console.log('     pnpm tsx scripts/seed-servicios-dev.ts --limpiar\n');
            return;
        }

        // 4. Insertar las 5 publicaciones
        // Coordenadas: centro de Puerto Peñasco con pequeñas variaciones.
        const confirmaciones = {
            legal: true,
            verdadera: true,
            coordinacion: true,
            version: 'v1-2026-05-15',
            aceptadasAt: new Date().toISOString(),
        };
        const confirmacionesJson = JSON.stringify(confirmaciones);

        const publicaciones: Array<{
            label: string;
            params: unknown[];
        }> = [
            {
                label: 'Plomería residencial 24h (servicio-persona)',
                params: [
                    usuarioId,
                    'ofrezco',
                    'servicio-persona',
                    'servicio-personal',
                    'Plomería residencial 24h',
                    'Servicios de plomería para casa habitación y locales comerciales. Reparación de fugas, instalación de tuberías, destapado de drenajes. Emergencias 24/7. 10 años de experiencia, atención inmediata y trabajo garantizado.',
                    JSON.stringify([]),
                    0,
                    JSON.stringify({ kind: 'hora', monto: 350, moneda: 'MXN' }),
                    'presencial',
                    -113.544, 31.315, // ubicacion exacta
                    -113.5455, 31.316, // ubicacion aproximada
                    'Puerto Peñasco',
                    ['Centro', 'Las Conchas'],
                    ['Plomería', 'Reparación de tuberías', 'Instalación', 'Emergencia 24h', 'Destapado de drenajes'],
                    [],
                    null,
                    [],
                    null,
                    confirmacionesJson,
                ],
            },
            {
                label: 'Diseño web (servicio-persona, remoto)',
                params: [
                    usuarioId,
                    'ofrezco',
                    'servicio-persona',
                    'servicio-personal',
                    'Diseño web para negocios locales',
                    'Diseño y desarrollo de páginas web profesionales para negocios de Peñasco. Sitios responsivos, optimizados para móvil, con integración a redes sociales y WhatsApp. Entrega en 7-10 días. Incluye dominio y hosting del primer año.',
                    JSON.stringify([]),
                    0,
                    JSON.stringify({ kind: 'fijo', monto: 4500, moneda: 'MXN' }),
                    'remoto',
                    -113.54, 31.312,
                    -113.538, 31.311,
                    'Puerto Peñasco',
                    ['Toda la ciudad'],
                    ['React', 'Diseño UX', 'Tailwind', 'Mobile-first', 'SEO local'],
                    [],
                    null,
                    [],
                    null,
                    confirmacionesJson,
                ],
            },
            {
                label: 'Pastelería para eventos (servicio-persona, rango)',
                params: [
                    usuarioId,
                    'ofrezco',
                    'servicio-persona',
                    'servicio-personal',
                    'Pastelería para eventos y XV',
                    'Pasteles personalizados para bodas, XV años, bautizos y eventos especiales. Cupcakes, postres y mesas de dulces. Más de 5 años decorando los momentos más importantes de tu familia. Entregas a domicilio sin costo en toda la ciudad.',
                    JSON.stringify([]),
                    0,
                    JSON.stringify({ kind: 'rango', min: 800, max: 3000, moneda: 'MXN' }),
                    'presencial',
                    -113.547, 31.317,
                    -113.546, 31.318,
                    'Puerto Peñasco',
                    ['Centro', 'Cholla'],
                    ['Postres XV', 'Pasteles de boda', 'Catering', 'Mesas de dulces', 'Cupcakes'],
                    [],
                    null,
                    [],
                    null,
                    confirmacionesJson,
                ],
            },
            {
                label: 'Mesero(a) turno noche (vacante-empresa)',
                params: [
                    usuarioId,
                    'solicito',
                    'vacante-empresa',
                    'vacante-empresa',
                    'Mesero(a) turno noche',
                    'Restaurante Aurora en el centro de Peñasco busca personal de meseros para el turno nocturno. Sueldo base + propinas (promedio total $8,500-$11,000/mes). Ambiente joven, buena onda y crecimiento real. Aplican ambos sexos.',
                    JSON.stringify([]),
                    0,
                    JSON.stringify({ kind: 'mensual', monto: 8500, moneda: 'MXN' }),
                    'presencial',
                    -113.543, 31.314,
                    -113.544, 31.313,
                    'Puerto Peñasco',
                    ['Centro'],
                    [],
                    [
                        'Experiencia mínima 1 año en restaurantes',
                        'Disponibilidad nocturna (8pm-2am)',
                        'Buena presentación',
                        'Trabajo en equipo',
                        'Mayor de edad',
                    ],
                    '8:00 PM a 2:00 AM',
                    ['mie', 'jue', 'vie', 'sab', 'dom'],
                    null,
                    confirmacionesJson,
                ],
            },
            {
                label: 'Busco fotógrafo para boda (solicito)',
                params: [
                    usuarioId,
                    'solicito',
                    'solicito',
                    'servicio-puntual',
                    'Busco fotógrafo para boda',
                    'Necesito fotógrafo profesional para boda el sábado 20 de junio en la playa de Las Conchas. Cobertura completa (ceremonia, recepción, fotos de pareja). Aprox 6 horas de cobertura + álbum digital editado. Si tienes portafolio, mejor.',
                    JSON.stringify([]),
                    0,
                    JSON.stringify({ kind: 'a-convenir' }),
                    'presencial',
                    -113.55, 31.31,
                    -113.551, 31.3105,
                    'Puerto Peñasco',
                    ['Las Conchas'],
                    [],
                    [],
                    null,
                    [],
                    JSON.stringify({ min: 3500, max: 5000 }),
                    confirmacionesJson,
                ],
            },
        ];

        const sqlInsert = `
            INSERT INTO servicios_publicaciones (
                usuario_id, modo, tipo, subtipo,
                titulo, descripcion, fotos, foto_portada_index,
                precio, modalidad,
                ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
                skills, requisitos, horario, dias_semana, presupuesto,
                confirmaciones, estado, expira_at
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7::jsonb, $8,
                $9::jsonb, $10,
                ST_SetSRID(ST_MakePoint($11, $12), 4326)::geography,
                ST_SetSRID(ST_MakePoint($13, $14), 4326)::geography,
                $15,
                $16::varchar[],
                $17::text[],
                $18::text[],
                $19,
                $20::varchar[],
                $21::jsonb,
                $22::jsonb,
                'activa',
                NOW() + INTERVAL '30 days'
            )
            RETURNING id
        `;

        for (const pub of publicaciones) {
            const res = await pool.query<{ id: string }>(sqlInsert, pub.params);
            console.log(`✓ ${pub.label} → ${res.rows[0].id}`);
        }

        console.log(`\n🎉 ${publicaciones.length} publicaciones insertadas correctamente.`);
        console.log('   Refresca /servicios en tu app para verlas.');
    } catch (error) {
        console.error('\n❌ Error ejecutando seed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
