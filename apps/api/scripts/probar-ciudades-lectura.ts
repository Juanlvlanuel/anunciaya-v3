/**
 * probar-ciudades-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Ciudades"
 * ============================================================================
 * Verifica la lectura del módulo Ciudades contra la BD real. SOLO SELECT — no crea,
 * no modifica, no borra. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de lectura (Ciudades_Pendientes.md, Fase 1 VER):
 *   - lista completa de ciudades con su región resuelta + estado activa/inactiva.
 *   - filtros: por región, "sin región", por búsqueda, por activa.
 *   - lista de regiones con su # de ciudades.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-ciudades-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-ciudades-lectura.ts
 */

import { config } from 'dotenv';
config();

import {
    listarCiudadesCatalogo,
    listarRegionesConConteo,
    REGION_SIN,
} from '../src/services/admin/ciudades.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main(): Promise<void> {
    console.log('\n[1] listarCiudadesCatalogo — sin filtros (catálogo completo)');
    const todas = await listarCiudadesCatalogo();
    verificar('devuelve ciudades', todas.length > 0, `total=${todas.length}`);
    verificar('cada fila trae nombre, estado y slug', todas.every((c) => !!c.nombre && !!c.estado && !!c.slug));
    verificar('lat/lng son number o null (no string)', todas.every((c) => (c.lat === null || typeof c.lat === 'number') && (c.lng === null || typeof c.lng === 'number')));
    verificar('alias es array o null', todas.every((c) => c.alias === null || Array.isArray(c.alias)));
    // Orden por defecto: estado (A–Z) agrupado y, dentro de cada estado, nombre (A–Z).
    const ordenEstados: string[] = [];
    let estadosAgrupados = true;
    let nombresDentroOrdenados = true;
    for (let i = 0; i < todas.length; i++) {
        const c = todas[i];
        if (i === 0 || todas[i - 1].estado !== c.estado) {
            if (ordenEstados.includes(c.estado)) estadosAgrupados = false; // el estado reaparece -> no agrupado
            else ordenEstados.push(c.estado);
        } else if (todas[i - 1].nombre.localeCompare(c.nombre, 'es') > 0) {
            nombresDentroOrdenados = false;
        }
    }
    const estadosEnOrden = ordenEstados.every((e, i) => i === 0 || ordenEstados[i - 1].localeCompare(e, 'es') <= 0);
    verificar('estados agrupados (no intercalados)', estadosAgrupados, `estados=${ordenEstados.length}`);
    verificar('estados en orden alfabético (A–Z)', estadosEnOrden);
    verificar('dentro de cada estado, nombres en orden alfabético (A–Z)', nombresDentroOrdenados);

    const conRegion = todas.filter((c) => c.regionId !== null);
    verificar('las ciudades con region traen regionNombre', conRegion.every((c) => !!c.regionNombre), `con región=${conRegion.length}`);

    console.log('\n[2] listarRegionesConConteo — regiones + # ciudades');
    const regiones = await listarRegionesConConteo();
    verificar('devuelve regiones', regiones.length > 0, `total=${regiones.length}`);
    verificar('cada region trae nombre y totalCiudades numérico', regiones.every((r) => !!r.nombre && typeof r.totalCiudades === 'number'));
    const sumaConteos = regiones.reduce((s, r) => s + r.totalCiudades, 0);
    verificar('la suma de # ciudades por región = ciudades con región', sumaConteos === conRegion.length, `suma=${sumaConteos}, conRegión=${conRegion.length}`);
    console.log(`    (regiones: ${regiones.map((r) => `${r.nombre}${r.activa ? '' : '·inactiva'}→${r.totalCiudades}`).join('  ')})`);

    console.log('\n[3] Filtro por región');
    const primeraConCiudades = regiones.find((r) => r.totalCiudades > 0);
    if (!primeraConCiudades) {
        verificar('hay al menos una región con ciudades para probar el filtro', false);
    } else {
        const deRegion = await listarCiudadesCatalogo({ regionId: primeraConCiudades.id });
        verificar(`filtra solo ciudades de "${primeraConCiudades.nombre}"`, deRegion.length === primeraConCiudades.totalCiudades && deRegion.every((c) => c.regionId === primeraConCiudades.id), `esperado=${primeraConCiudades.totalCiudades}, obtuvo=${deRegion.length}`);
    }

    console.log('\n[4] Filtro "sin región"');
    const sinRegion = await listarCiudadesCatalogo({ regionId: REGION_SIN });
    verificar('todas las devueltas tienen regionId null', sinRegion.every((c) => c.regionId === null), `total=${sinRegion.length}`);
    verificar('sin región + con región = total', sinRegion.length + conRegion.length === todas.length);

    console.log('\n[5] Filtro por búsqueda');
    const muestra = todas[0];
    const termino = muestra.nombre.slice(0, 3);
    const buscadas = await listarCiudadesCatalogo({ busqueda: termino });
    verificar(`búsqueda "${termino}" devuelve resultados que la contienen`, buscadas.length > 0 && buscadas.some((c) => c.id === muestra.id), `coincidencias=${buscadas.length}`);

    console.log('\n[6] Filtro por activa');
    const activas = await listarCiudadesCatalogo({ activa: 'activas' });
    const inactivas = await listarCiudadesCatalogo({ activa: 'inactivas' });
    verificar('activas todas activa=true', activas.every((c) => c.activa === true), `activas=${activas.length}`);
    verificar('inactivas todas activa=false', inactivas.every((c) => c.activa === false), `inactivas=${inactivas.length}`);
    verificar('activas + inactivas = total', activas.length + inactivas.length === todas.length);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
