/**
 * seed-marketplace-test.ts
 * =========================
 * Sprint 0 de revisión visual — limpia artículos basura e inserta
 * 14 artículos realistas en Puerto Peñasco para la revisión visual.
 *
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/seed-marketplace-test.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

// IDs de usuarios de prueba (definidos en helpers.ts)
const USUARIO_1 = 'a0000000-0000-4000-a000-000000000001'; // usuario logueado (yo)
const USUARIO_2 = 'a0000000-0000-4000-a000-000000000002'; // otro vendedor

// Coordenadas base Puerto Peñasco (~31.31, ~-113.55)
// Cada artículo tiene su propia variación para simular diferentes zonas
const ARTICULOS = [
    // ─── Recién publicados (aparecen en carrusel "Lo más fresco") ───
    {
        id: 'b1000000-0000-4000-b000-000000000001',
        usuario: USUARIO_1,
        titulo: 'iPhone 13 Pro 128GB como nuevo',
        descripcion: 'iPhone 13 Pro en perfecto estado. Sin rayones, batería al 91%. Viene con caja original, cargador y dos fundas. Cambié de celular y este quedó sin uso. No acepto trueques.',
        precio: '14500.00',
        condicion: 'seminuevo',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800&q=80'],
        zona: 'Centro · Puerto Peñasco',
        lat: 31.3062, lng: -113.5355,
        lat_aprox: 31.3072, lng_aprox: -113.5340,
        hace: '2 minutos',
        offset_secs: 120,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000002',
        usuario: USUARIO_2,
        titulo: 'Bicicleta de montaña Trek aluminio rodada 26',
        descripcion: 'Bici Trek en muy buen estado. Cambios Shimano 21 velocidades funcionando perfecto. Frenos de disco mecánicos. La uso para andar en el malecón pero ya no tengo tiempo. Incluye candado y bomba de aire.',
        precio: '4200.00',
        condicion: 'usado',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
        zona: 'Fraccionamiento Las Conchas · Puerto Peñasco',
        lat: 31.2987, lng: -113.4876,
        lat_aprox: 31.2975, lng_aprox: -113.4890,
        hace: '45 minutos',
        offset_secs: 2700,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000003',
        usuario: USUARIO_2,
        titulo: 'Sofá de 3 plazas color café, muy cómodo',
        descripcion: 'Sofá de 3 plazas en tela café chocolate. En buen estado general, tiene uso normal pero sin rasgaduras. Medidas: 2.10m de largo x 90cm profundo. Por cambio de decoración. Solo venta, no hago entregas.',
        precio: '3800.00',
        condicion: 'usado',
        acepta_ofertas: false,
        fotos: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'],
        zona: 'Colonia Urbana · Puerto Peñasco',
        lat: 31.3120, lng: -113.5480,
        lat_aprox: 31.3135, lng_aprox: -113.5460,
        hace: '3 horas',
        offset_secs: 10800,
    },

    // ─── De hace 1-2 días ───
    {
        id: 'b1000000-0000-4000-b000-000000000004',
        usuario: USUARIO_1,
        titulo: 'Laptop HP 15" Intel Core i5 8GB RAM',
        descripcion: 'Laptop HP 15-ef funcionando al 100%. Windows 11 licenciado, Office instalado. Batería aguanta 3 horas. Tiene algunos raspones en la tapa pero la pantalla está perfecta. Buena para trabajo y estudio.',
        precio: '8500.00',
        condicion: 'usado',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80'],
        zona: 'Plaza del Mar · Puerto Peñasco',
        lat: 31.3048, lng: -113.5321,
        lat_aprox: 31.3058, lng_aprox: -113.5308,
        hace: '1 día',
        offset_secs: 86400,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000005',
        usuario: USUARIO_2,
        titulo: 'Set de mancuernas ajustables 40kg total',
        descripcion: 'Set completo de mancuernas ajustables de hierro fundido. Incluye barra y collares de seguridad. Total 40kg distribuidos en discos de 2.5kg y 5kg. Perfectas para entrenamiento en casa. Sin óxido.',
        precio: '1800.00',
        condicion: 'usado',
        acepta_ofertas: false,
        fotos: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'],
        zona: 'Colonia Hermosa · Puerto Peñasco',
        lat: 31.3090, lng: -113.5390,
        lat_aprox: 31.3080, lng_aprox: -113.5405,
        hace: '1 día',
        offset_secs: 90000,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000006',
        usuario: USUARIO_2,
        titulo: 'Guitarra acústica Yamaha F310 con funda',
        descripcion: 'Guitarra acústica Yamaha F310 en muy buen estado. Tiene una pequeña raspadura en el cuerpo pero no afecta el sonido. Viene con funda acolchonada, cejilla y juego de cuerdas extra. Ideal para principiantes.',
        precio: '2200.00',
        condicion: 'seminuevo',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80'],
        zona: 'Fraccionamiento Paraíso · Puerto Peñasco',
        lat: 31.3005, lng: -113.5290,
        lat_aprox: 31.2995, lng_aprox: -113.5275,
        hace: '2 días',
        offset_secs: 172800,
    },

    // ─── De hace 5-8 días ───
    {
        id: 'b1000000-0000-4000-b000-000000000007',
        usuario: USUARIO_1,
        titulo: 'Cámara Sony Alpha A6000 con lente 16-50mm',
        descripcion: 'Cámara mirrorless Sony A6000 en excelente estado. Solo 8,200 disparos. Incluye lente kit 16-50mm, cargador original, 2 baterías y tarjeta SD 64GB. Perfecta para fotografía de viajes y retratos. Poco uso.',
        precio: '9800.00',
        condicion: 'seminuevo',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&q=80'],
        zona: 'Centro · Puerto Peñasco',
        lat: 31.3068, lng: -113.5360,
        lat_aprox: 31.3055, lng_aprox: -113.5375,
        hace: '5 días',
        offset_secs: 432000,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000008',
        usuario: USUARIO_2,
        titulo: 'Mesa de comedor madera 6 personas con sillas',
        descripcion: 'Mesa de comedor de madera maciza color nogal. Incluye 6 sillas tapizadas en tela beige. En buen estado, alguna silla tiene el tapiz desgastado pero la estructura está perfecta. Solo recogida en domicilio.',
        precio: '5500.00',
        condicion: 'usado',
        acepta_ofertas: false,
        fotos: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80'],
        zona: 'Las Dunas · Puerto Peñasco',
        lat: 31.3220, lng: -113.5500,
        lat_aprox: 31.3235, lng_aprox: -113.5485,
        hace: '6 días',
        offset_secs: 518400,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000009',
        usuario: USUARIO_2,
        titulo: 'Ropa de niña talla 4-6 años, lote 15 piezas',
        descripcion: 'Lote de 15 prendas para niña: 5 vestidos, 4 pants, 3 playeras y 3 conjuntos. Tallas mixtas 4-6 años. Todas en buen estado, algunas sin estrenar. Marcas variadas. Solo vendo el lote completo.',
        precio: '650.00',
        condicion: 'usado',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'],
        zona: 'Colonia Urbana · Puerto Peñasco',
        lat: 31.3115, lng: -113.5475,
        lat_aprox: 31.3100, lng_aprox: -113.5488,
        hace: '7 días',
        offset_secs: 604800,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000010',
        usuario: USUARIO_2,
        titulo: 'Licuadora Oster 10 velocidades 1200W',
        descripcion: 'Licuadora Oster en perfecto estado, prácticamente nueva. La usé solo 3 veces. Jarra de vidrio 1.5 litros, motor 1200W, 10 velocidades. Función pulso y auto limpieza. Incluye caja y manual.',
        precio: '780.00',
        condicion: 'seminuevo',
        acepta_ofertas: false,
        fotos: ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80'],
        zona: 'Fraccionamiento Las Conchas · Puerto Peñasco',
        lat: 31.2992, lng: -113.4880,
        lat_aprox: 31.3005, lng_aprox: -113.4865,
        hace: '8 días',
        offset_secs: 691200,
    },

    // ─── De hace 12-18 días ───
    {
        id: 'b1000000-0000-4000-b000-000000000011',
        usuario: USUARIO_2,
        titulo: 'Tenis Nike Air Max 270 talla 27 originales',
        descripcion: 'Tenis Nike Air Max 270 originales. Talla 27 (42 EU). Color blanco con suela negra. Poco uso, los compré en enero y los usé 4 veces. Sin caja pero en perfecto estado. No réplicas, comprobable.',
        precio: '1900.00',
        condicion: 'seminuevo',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
        zona: 'Playa Bonita · Puerto Peñasco',
        lat: 31.2850, lng: -113.5060,
        lat_aprox: 31.2840, lng_aprox: -113.5075,
        hace: '12 días',
        offset_secs: 1036800,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000012',
        usuario: USUARIO_1,
        titulo: 'Ventilador de techo Hunter 52" con control',
        descripcion: 'Ventilador de techo Hunter 52 pulgadas color blanco. Con control remoto funcionando. Motor silencioso 3 velocidades y luz LED integrada. Lo quito porque instalé aire acondicionado. Funciona al 100%.',
        precio: '1400.00',
        condicion: 'usado',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1558089687-f282ffcbc0e6?w=800&q=80'],
        zona: 'Centro · Puerto Peñasco',
        lat: 31.3055, lng: -113.5345,
        lat_aprox: 31.3068, lng_aprox: -113.5332,
        hace: '15 días',
        offset_secs: 1296000,
    },
    {
        id: 'b1000000-0000-4000-b000-000000000013',
        usuario: USUARIO_2,
        titulo: 'Libros de preparatoria Matemáticas y Física',
        descripcion: 'Lote de 5 libros de preparatoria: Cálculo de Stewart edición 8, Física Serway tomo 1 y 2, Matemáticas discretas Rosen, y Álgebra lineal Grossman. En buen estado con algunas notas a lápiz. Útiles para CBTis, CECYTE y UAM.',
        precio: '400.00',
        condicion: 'usado',
        acepta_ofertas: true,
        fotos: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'],
        zona: 'Colonia Hermosa · Puerto Peñasco',
        lat: 31.3085, lng: -113.5395,
        lat_aprox: 31.3073, lng_aprox: -113.5408,
        hace: '18 días',
        offset_secs: 1555200,
    },

    // ─── 1 artículo PAUSADO (para probar estado visual) ───
    {
        id: 'b1000000-0000-4000-b000-000000000014',
        usuario: USUARIO_1,
        titulo: 'Tabla de surf 7 pies Bic Sport principiante',
        descripcion: 'Tabla de surf Bic Sport 7 pies, ideal para principiantes. Con leash y funda. La compré para aprender pero no pude con las olas del Cholla. Solo usada 5 veces. Excelente condición.',
        precio: '6500.00',
        condicion: 'seminuevo',
        acepta_ofertas: false,
        fotos: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'],
        zona: 'Playa Bonita · Puerto Peñasco',
        lat: 31.2855, lng: -113.5055,
        lat_aprox: 31.2845, lng_aprox: -113.5040,
        hace: '20 días',
        offset_secs: 1728000,
        estado: 'pausada',
    },
] as const;

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log(' SEED — MarketPlace Puerto Peñasco (revisión visual)');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Verificar que existen los usuarios de prueba
    const check = await db.execute(sql`
        SELECT id, nombre, modo_activo, ciudad
        FROM usuarios
        WHERE id IN (${sql.raw(`'${USUARIO_1}'`)}, ${sql.raw(`'${USUARIO_2}'`)})
    `);
    console.log(`Usuarios encontrados: ${check.rows.length}/2`);
    if (check.rows.length < 2) {
        console.error('❌ Faltan usuarios de prueba. Ejecuta primero: pnpm exec tsx scripts/marketplace-test-tokens.ts');
        process.exit(1);
    }
    for (const u of check.rows) {
        console.log(`   • ${u.nombre} (${u.id}) — ciudad: ${u.ciudad}, modo: ${u.modo_activo}`);
    }

    // 2. Asegurar que ambos usuarios tienen ciudad y modo correctos
    await db.execute(sql`
        UPDATE usuarios
        SET ciudad = 'Puerto Peñasco', modo_activo = 'personal'
        WHERE id IN (${sql.raw(`'${USUARIO_1}'`)}, ${sql.raw(`'${USUARIO_2}'`)})
    `);
    console.log('   ✅ Ciudad → Puerto Peñasco, modo → personal\n');

    // 3. Eliminar definitivamente todos los artículos existentes
    const eliminados = await db.execute(sql`
        DELETE FROM articulos_marketplace
        RETURNING id, titulo
    `);
    console.log(`🗑️  Artículos eliminados (DELETE definitivo): ${eliminados.rows.length}`);
    for (const r of eliminados.rows) {
        console.log(`   • "${r.titulo}" (${r.id})`);
    }
    console.log('');

    // 4. Insertar artículos de seed
    console.log('🌱 Insertando artículos seed para Puerto Peñasco...\n');
    let insertados = 0;

    for (const a of ARTICULOS) {
        const estado = ('estado' in a && a.estado) ? a.estado : 'activa';
        const ahora = new Date();
        const createdAt = new Date(ahora.getTime() - a.offset_secs * 1000);
        const expiraAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        await db.execute(sql`
            INSERT INTO articulos_marketplace (
                id, usuario_id, titulo, descripcion, precio, condicion,
                acepta_ofertas, fotos, foto_portada_index,
                ubicacion, ubicacion_aproximada,
                ciudad, zona_aproximada,
                estado, expira_at, created_at, updated_at
            ) VALUES (
                ${a.id}::uuid,
                ${a.usuario}::uuid,
                ${a.titulo},
                ${a.descripcion},
                ${a.precio}::numeric,
                ${a.condicion},
                ${a.acepta_ofertas},
                ${JSON.stringify(a.fotos)}::jsonb,
                0,
                ST_SetSRID(ST_MakePoint(${a.lng}, ${a.lat}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${a.lng_aprox}, ${a.lat_aprox}), 4326)::geography,
                'Puerto Peñasco',
                ${a.zona},
                ${estado},
                ${expiraAt.toISOString()}::timestamptz,
                ${createdAt.toISOString()}::timestamptz,
                ${createdAt.toISOString()}::timestamptz
            )
        `);

        const icono = estado === 'pausada' ? '⏸' : '✅';
        console.log(`${icono} "${a.titulo}" ($${a.precio}) — ${a.condicion} — ${estado} — hace ${a.hace}`);
        insertados++;
    }

    console.log(`\n✅ Seed completado: ${insertados} artículos insertados en Puerto Peñasco`);

    // 5. Resumen final
    const resumen = await db.execute(sql`
        SELECT estado, COUNT(*) as total
        FROM articulos_marketplace
        GROUP BY estado
        ORDER BY total DESC
    `);
    console.log('\nResumen en BD:');
    for (const r of resumen.rows) {
        console.log(`  ${r.estado}: ${r.total} artículos`);
    }

    const distribucion = await db.execute(sql`
        SELECT
            u.nombre,
            COUNT(a.id) as total
        FROM articulos_marketplace a
        JOIN usuarios u ON u.id = a.usuario_id
        GROUP BY u.nombre
    `);
    console.log('\nPor vendedor:');
    for (const r of distribucion.rows) {
        console.log(`  ${r.nombre}: ${r.total} artículos`);
    }

    console.log('\n🎉 Listo. Recarga /marketplace y pásame el screenshot.\n');
    process.exit(0);
}

main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
