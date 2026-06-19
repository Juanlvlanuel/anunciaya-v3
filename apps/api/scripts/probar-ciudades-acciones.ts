/**
 * probar-ciudades-acciones.ts — HARNESS (DEV) · Fase 2 ACTUAR del módulo "Ciudades"
 * ================================================================================
 * Ejerce las acciones de escritura del módulo Ciudades contra la BD real, con datos de
 * PRUEBA identificables (slug `zztest-…`, regiones `ZZTest …`, embajador `ZZTESTEMB`) que
 * se LIMPIAN al inicio y al final — es autorreparable y seguro de re-correr en DEV.
 *
 * Cubre: crear ciudad (+ 409 duplicado) · alta múltiple (creadas/omitidas) · editar (re-slug
 * + 409) · activar/desactivar · asignar/quitar región · agrupar múltiple · crear/editar región
 * · y el GUARD "una región" (con un vendedor temporal que cubre dos ciudades).
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-ciudades-acciones.ts
 *
 * Ubicación: apps/api/scripts/probar-ciudades-acciones.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { usuarios, embajadores } from '../src/db/schemas/schema.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import {
    crearCiudad,
    crearCiudadesMultiple,
    editarCiudad,
    cambiarActivaCiudad,
    asignarRegionCiudad,
    asignarRegionMultiple,
    crearRegion,
    editarRegion,
} from '../src/services/admin/ciudades-acciones.service.js';
import { listarCiudadesCatalogo, listarRegionesConConteo } from '../src/services/admin/ciudades.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function limpiar(): Promise<void> {
    await db.execute(sql`DELETE FROM embajador_ciudades WHERE ciudad_id IN (SELECT id FROM ciudades WHERE slug LIKE 'zztest-%')`);
    await db.execute(sql`DELETE FROM embajador_ciudades WHERE embajador_id IN (SELECT id FROM embajadores WHERE codigo_referido = 'ZZTESTEMB')`);
    await db.execute(sql`DELETE FROM ciudades WHERE slug LIKE 'zztest-%'`);
    await db.execute(sql`DELETE FROM regiones WHERE nombre LIKE 'ZZTest %'`);
    await db.execute(sql`DELETE FROM embajadores WHERE codigo_referido = 'ZZTESTEMB'`);
    await db.execute(sql`DELETE FROM usuarios WHERE correo = 'zztest-emb@dev.local'`);
}

async function main(): Promise<void> {
    await limpiar();

    // Panel de superadmin (usa un superadmin real para que la auditoría enlace el actor).
    const filaSuper = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    const panel: UsuarioPanel = {
        usuarioId: filaSuper[0]?.id ?? null,
        rolEquipo: 'superadmin',
        regionId: null,
        viaSecret: false,
    };

    try {
        console.log('\n[1] crearCiudad — alta + slug + 409 duplicado');
        const c1 = await crearCiudad(panel, { nombre: 'ZZTest Ciudad Uno', estado: 'ZZTestlandia', lat: 25.1, lng: -110.2 });
        verificar('crea la ciudad', c1.ok, c1.ok ? `id=${c1.data.id}` : c1.mensaje);
        const dup = await crearCiudad(panel, { nombre: 'ZZTest Ciudad Uno', estado: 'ZZTestlandia', lat: 25.1, lng: -110.2 });
        verificar('rechaza duplicado (409)', !dup.ok && dup.status === 409, !dup.ok ? dup.mensaje : 'no rechazó');

        console.log('\n[2] crearCiudadesMultiple — creadas + omitidas (1 ya existe)');
        const multi = await crearCiudadesMultiple(panel, [
            { nombre: 'ZZTest Ciudad Dos', estado: 'ZZTestlandia', lat: 25.2, lng: -110.3 },
            { nombre: 'ZZTest Ciudad Tres', estado: 'ZZTestlandia', lat: 25.3, lng: -110.4 },
            { nombre: 'ZZTest Ciudad Uno', estado: 'ZZTestlandia', lat: 25.1, lng: -110.2 }, // ya existe
            { nombre: 'ZZTest Ciudad Dos', estado: 'ZZTestlandia', lat: 25.2, lng: -110.3 }, // duplicada en el lote
        ]);
        verificar('alta múltiple crea 2 y omite 2', multi.ok && multi.data.creadas === 2 && multi.data.omitidas.length === 2, multi.ok ? `creadas=${multi.data.creadas}, omitidas=${multi.data.omitidas.length}` : multi.mensaje);

        // IDs de las ciudades de prueba (por slug).
        const filas = (await db.execute(sql`SELECT id::text AS id, slug, nombre FROM ciudades WHERE slug LIKE 'zztest-%' ORDER BY slug`)).rows as Array<{ id: string; slug: string; nombre: string }>;
        const idUno = filas.find((f) => f.slug === 'zztest-ciudad-uno')!.id;
        const idDos = filas.find((f) => f.slug === 'zztest-ciudad-dos')!.id;
        verificar('quedan 3 ciudades de prueba', filas.length === 3, `total=${filas.length}`);

        console.log('\n[3] editarCiudad — renombrar (re-slug) + 409 contra otra');
        const ed = await editarCiudad(panel, idUno, { nombre: 'ZZTest Ciudad Uno Editada', importancia: 7 });
        verificar('edita y re-genera slug', ed.ok);
        const reslug = (await db.execute(sql`SELECT slug FROM ciudades WHERE id = ${idUno}`)).rows as Array<{ slug: string }>;
        verificar('el slug nuevo refleja el nombre', reslug[0]?.slug === 'zztest-ciudad-uno-editada', reslug[0]?.slug);
        const choca = await editarCiudad(panel, idUno, { nombre: 'ZZTest Ciudad Dos' }); // slug de idDos
        verificar('rechaza renombrar a un slug ya usado (409)', !choca.ok && choca.status === 409, !choca.ok ? choca.mensaje : 'no rechazó');

        console.log('\n[4] cambiarActivaCiudad — desactivar/activar');
        const des = await cambiarActivaCiudad(panel, idUno, false);
        const filaDes = await listarCiudadesCatalogo({ activa: 'inactivas' });
        verificar('desactiva la ciudad', des.ok && filaDes.some((c) => c.id === idUno));
        const act = await cambiarActivaCiudad(panel, idUno, true);
        verificar('la reactiva', act.ok);

        console.log('\n[5] crearRegion / editarRegion');
        const regA = await crearRegion(panel, 'ZZTest Región A');
        const regB = await crearRegion(panel, 'ZZTest Región B');
        verificar('crea 2 regiones', regA.ok && regB.ok);
        const dupReg = await crearRegion(panel, 'zztest región a'); // case-insensitive
        verificar('rechaza región duplicada (409, case-insensitive)', !dupReg.ok && dupReg.status === 409, !dupReg.ok ? dupReg.mensaje : 'no rechazó');
        const idRegA = regA.ok ? regA.data.id : '';
        const idRegB = regB.ok ? regB.data.id : '';
        const edReg = await editarRegion(panel, idRegA, { nombre: 'ZZTest Región A2', activa: true });
        verificar('renombra la región', edReg.ok);

        console.log('\n[6] asignarRegionCiudad / asignarRegionMultiple');
        const asg = await asignarRegionCiudad(panel, idUno, idRegA);
        verificar('asigna región a una ciudad', asg.ok);
        const asgMulti = await asignarRegionMultiple(panel, filas.map((f) => f.id), idRegA);
        verificar('agrupa varias ciudades en una región', asgMulti.ok && asgMulti.data.asignadas === 3 && asgMulti.data.bloqueadas.length === 0, asgMulti.ok ? `asignadas=${asgMulti.data.asignadas}` : asgMulti.mensaje);
        const conteoReg = (await listarRegionesConConteo()).find((r) => r.id === idRegA);
        verificar('la región A2 reporta 3 ciudades', conteoReg?.totalCiudades === 3, `total=${conteoReg?.totalCiudades}`);

        console.log('\n[7] GUARD "una región" — con un vendedor temporal que cubre 2 ciudades');
        // Vendedor temporal + cobertura de idUno e idDos (ambas en Región A2 → pasa el trigger).
        const [u] = await db.insert(usuarios).values({ nombre: 'ZZTest', apellidos: 'Embajador', correo: 'zztest-emb@dev.local' }).returning({ id: usuarios.id });
        const [emb] = await db.insert(embajadores).values({ usuarioId: u.id, codigoReferido: 'ZZTESTEMB' }).returning({ id: embajadores.id });
        await db.execute(sql`INSERT INTO embajador_ciudades (embajador_id, ciudad_id) VALUES (${emb.id}, ${idUno}), (${emb.id}, ${idDos})`);

        const mover = await asignarRegionCiudad(panel, idUno, idRegB); // dejaría al vendedor en A2 (idDos) y B (idUno)
        verificar('BLOQUEA mover una ciudad cubierta a otra región (409)', !mover.ok && mover.status === 409, !mover.ok ? mover.mensaje : 'NO bloqueó');
        const quitar = await asignarRegionCiudad(panel, idUno, null);
        verificar('BLOQUEA quitar la región a una ciudad cubierta (409)', !quitar.ok && quitar.status === 409, !quitar.ok ? quitar.mensaje : 'NO bloqueó');

        // Quitar la cobertura → ya se puede mover.
        await db.execute(sql`DELETE FROM embajador_ciudades WHERE embajador_id = ${emb.id}`);
        const moverOk = await asignarRegionCiudad(panel, idUno, idRegB);
        verificar('sin cobertura, ya permite mover de región', moverOk.ok, moverOk.ok ? 'ok' : moverOk.mensaje);
    } finally {
        await limpiar();
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
