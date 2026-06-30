/**
 * probar-categorias-acciones.ts — HARNESS (DEV) · módulo "Categorías" del Panel
 * =============================================================================
 * Ejerce las acciones de escritura del módulo Categorías + el filtro por ciudad del
 * endpoint público, contra la BD real, con datos de PRUEBA identificables
 * (nombres 'ZZTest …') que se LIMPIAN al inicio y al final. Re-corre seguro en DEV.
 *
 * REQUISITO: la migración docs/migraciones/2026-06-29-catalogo-categorias-por-ciudad.sql
 * debe estar corrida (tablas categoria_ciudades / subcategoria_ciudades).
 *
 * Cubre: crear categoría (+409 dup) · crear subcategoría (+409 dup) · asignar ciudades
 * a categoría · regla "subcategoría ⊆ ciudades de su categoría" (409) · activar/desactivar
 * · filtro público obtenerTodasCategorias(ciudadId) (global vs acotada).
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-categorias-acciones.ts
 *
 * Ubicación: apps/api/scripts/probar-categorias-acciones.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import {
    crearCategoria,
    crearSubcategoria,
    asignarCiudadesCategoria,
    asignarCiudadesSubcategoria,
    cambiarActivaCategoria,
} from '../src/services/admin/categorias-acciones.service.js';
import { listarCatalogoAdmin } from '../src/services/admin/categorias.service.js';
import { obtenerTodasCategorias } from '../src/services/categorias.service.js';
import { autohabilitarCatalogoPorCiudad } from '../src/services/negocioManagement.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function limpiar(): Promise<void> {
    // El negocio de prueba primero (CASCADE limpia su sucursal + asignaciones).
    await db.execute(sql`DELETE FROM negocios WHERE nombre = 'ZZTest Negocio'`);
    // CASCADE limpia subcategorías y las relaciones por ciudad.
    await db.execute(sql`DELETE FROM categorias_negocio WHERE nombre LIKE 'ZZTest%'`);
}

async function main(): Promise<void> {
    await limpiar();

    const filaSuper = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
    const panel: UsuarioPanel = { usuarioId: filaSuper[0]?.id ?? null, rolEquipo: 'superadmin', regionId: null, viaSecret: false };

    // Dos ciudades reales para probar la disponibilidad.
    const ciudadesReales = (await db.execute(sql`SELECT id::text AS id, nombre FROM ciudades ORDER BY created_at LIMIT 2`)).rows as Array<{ id: string; nombre: string }>;
    if (ciudadesReales.length < 2) {
        console.error('Se necesitan al menos 2 ciudades en la BD para este harness.');
        process.exit(1);
    }
    const [ciudadA, ciudadB] = ciudadesReales;

    try {
        console.log('\n[1] crearCategoria — alta + 409 duplicado');
        const c1 = await crearCategoria(panel, { nombre: 'ZZTest Categoria' });
        verificar('crea la categoría', c1.ok, c1.ok ? `id=${c1.data.id}` : c1.mensaje);
        const dup = await crearCategoria(panel, { nombre: 'ZZTest Categoria' });
        verificar('rechaza duplicado (409)', !dup.ok && dup.status === 409, !dup.ok ? dup.mensaje : 'no rechazó');
        const catId = c1.ok ? c1.data.id : 0;

        console.log('\n[2] crearSubcategoria — alta + 409 duplicado en la misma categoría');
        const s1 = await crearSubcategoria(panel, { categoriaId: catId, nombre: 'ZZTest Sub' });
        verificar('crea la subcategoría', s1.ok, s1.ok ? `id=${s1.data.id}` : s1.mensaje);
        const sdup = await crearSubcategoria(panel, { categoriaId: catId, nombre: 'ZZTest Sub' });
        verificar('rechaza subcategoría duplicada (409)', !sdup.ok && sdup.status === 409);
        const subId = s1.ok ? s1.data.id : 0;

        console.log('\n[3] filtro público — categoría GLOBAL aparece en cualquier ciudad');
        const globalA = await obtenerTodasCategorias(ciudadA.id);
        verificar('global visible en ciudad A', globalA.some((c) => c.id === catId), `ciudad=${ciudadA.nombre}`);

        console.log('\n[4] asignarCiudadesCategoria — acotar a ciudad B');
        const asig = await asignarCiudadesCategoria(panel, catId, [ciudadB.id]);
        verificar('asigna 1 ciudad', asig.ok && asig.data.total === 1);
        const soloB_enA = await obtenerTodasCategorias(ciudadA.id);
        const soloB_enB = await obtenerTodasCategorias(ciudadB.id);
        verificar('acotada NO aparece en ciudad A', !soloB_enA.some((c) => c.id === catId), `ciudad=${ciudadA.nombre}`);
        verificar('acotada SÍ aparece en ciudad B', soloB_enB.some((c) => c.id === catId), `ciudad=${ciudadB.nombre}`);

        console.log('\n[5] regla subconjunto — subcategoría no puede vivir fuera de su categoría');
        const fuera = await asignarCiudadesSubcategoria(panel, subId, [ciudadA.id]); // A no está en la categoría
        verificar('rechaza ciudad fuera de la categoría (409)', !fuera.ok && fuera.status === 409, !fuera.ok ? fuera.mensaje : 'no rechazó');
        const dentro = await asignarCiudadesSubcategoria(panel, subId, [ciudadB.id]);
        verificar('acepta ciudad dentro de la categoría', dentro.ok);

        console.log('\n[6] auto-habilitar por demanda — negocio en ciudad A se clasifica en cat/sub acotada a B');
        // Escenario: categoría y subcategoría acotadas a B (pasos 4-5). Un negocio en
        // ciudad A se clasifica en la subcategoría → su ciudad debe habilitarse en ambas.
        const negId = (await db.execute(sql`
            INSERT INTO negocios (usuario_id, nombre) VALUES (${panel.usuarioId}, 'ZZTest Negocio') RETURNING id::text AS id
        `)).rows[0] as { id: string };
        await db.execute(sql`
            INSERT INTO negocio_sucursales (negocio_id, nombre, ciudad_id, es_principal)
            VALUES (${negId.id}, 'ZZTest Sucursal', ${ciudadA.id}, true)
        `);
        await db.execute(sql`INSERT INTO asignacion_subcategorias (negocio_id, subcategoria_id) VALUES (${negId.id}, ${subId})`);
        await autohabilitarCatalogoPorCiudad(negId.id);
        const catEnA = (await db.execute(sql`SELECT 1 FROM categoria_ciudades WHERE categoria_id = ${catId} AND ciudad_id = ${ciudadA.id}`)).rows.length > 0;
        const subEnA = (await db.execute(sql`SELECT 1 FROM subcategoria_ciudades WHERE subcategoria_id = ${subId} AND ciudad_id = ${ciudadA.id}`)).rows.length > 0;
        verificar('habilitó la CATEGORÍA en ciudad A', catEnA, `ciudad=${ciudadA.nombre}`);
        verificar('habilitó la SUBCATEGORÍA en ciudad A', subEnA, `ciudad=${ciudadA.nombre}`);
        const ahoraEnA = await obtenerTodasCategorias(ciudadA.id);
        verificar('la categoría YA aparece en público en ciudad A', ahoraEnA.some((c) => c.id === catId));

        console.log('\n[7] activar/desactivar categoría');
        const off = await cambiarActivaCategoria(panel, catId, false);
        verificar('desactiva', off.ok && !off.data.activa);
        const desactivadaEnB = await obtenerTodasCategorias(ciudadB.id);
        verificar('desactivada NO aparece en público', !desactivadaEnB.some((c) => c.id === catId));

        console.log('\n[8] listarCatalogoAdmin — la ve el Panel (activa e inactiva)');
        const catalogo = await listarCatalogoAdmin();
        const enPanel = catalogo.find((c) => c.id === catId);
        verificar('aparece en el catálogo admin', !!enPanel, enPanel ? `subcats=${enPanel.subcategorias.length}, ciudades=${enPanel.ciudades.length}` : 'no');
    } finally {
        await limpiar();
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
