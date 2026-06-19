/**
 * probar-contract-ciudad.ts — HARNESS (DEV) · fase "contract" de la migración ciudad
 * =================================================================================
 * Verifica EN RUNTIME que TODAS las lecturas migradas (que antes leían el texto
 * `negocio_sucursales.ciudad` y ahora leen `ciudades.nombre` vía `ciudad_id`) ejecutan
 * sin error de SQL (alias/JOIN/ambigüedad/GROUP BY). tsc NO valida el SQL crudo, por eso
 * este harness ejecuta cada función real. SOLO SELECT — seguro de correr.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-contract-ciudad.ts
 * Ubicación: apps/api/scripts/probar-contract-ciudad.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { listarSucursalesCercanas, obtenerPerfilSucursal, obtenerSucursalesNegocio } from '../src/services/negocios.service.js';
import { obtenerFeedOfertas, obtenerOfertaDetalle, obtenerSucursalesDeOferta } from '../src/services/ofertas.service.js';
import { obtenerSugerenciasOfertas, buscarOfertas } from '../src/services/ofertas/buscador.js';
import { obtenerArticuloDetalle } from '../src/services/articulos.service.js';
import { obtenerSucursalesConGerente } from '../src/services/sucursales.service.js';
import { obtenerRecompensasDisponibles } from '../src/services/cardya.service.js';
import { obtenerSeguidos } from '../src/services/votos.service.js';
import { buscarNegocios } from '../src/services/chatya.service.js';
import { listarNegocios, listarCiudades, obtenerDetalleNegocio, listarSucursalesNegocio } from '../src/services/admin/negocios.service.js';

const GPS = { latitud: 31.31, longitud: -113.54 };
const CIUDAD = 'Puerto Peñasco';
let fallos = 0;

async function probar(nombre: string, fn: () => Promise<unknown>): Promise<void> {
    try {
        const r = await fn();
        const arr: unknown[] = Array.isArray(r) ? r : ((r as any)?.data ?? []);
        const n = Array.isArray(arr) ? arr.length : (r ? 1 : 0);
        console.log(`    ✓ ${nombre}  → ok (${n} fila/s)`);
    } catch (e) {
        fallos++;
        console.log(`    ✗ ${nombre}  → ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
}

async function uno(q: string): Promise<string | null> {
    const r = (await db.execute(sql.raw(q))).rows as Array<{ id: string }>;
    return r[0]?.id ?? null;
}

async function main(): Promise<void> {
    const negocioId = await uno(`SELECT n.id::text AS id FROM negocios n JOIN negocio_sucursales s ON s.negocio_id=n.id AND s.es_principal=true WHERE n.activo=true LIMIT 1`);
    const sucursalId = await uno(`SELECT s.id::text AS id FROM negocio_sucursales s WHERE s.es_principal=true AND s.ciudad_id IS NOT NULL LIMIT 1`);
    const ofertaId = await uno(`SELECT id::text AS id FROM ofertas LIMIT 1`);
    const articuloId = await uno(`SELECT id::text AS id FROM articulos LIMIT 1`);
    const usuarioId = await uno(`SELECT id::text AS id FROM usuarios LIMIT 1`);
    const superId = await uno(`SELECT id::text AS id FROM usuarios WHERE rol_equipo='superadmin' LIMIT 1`);
    const panel: any = { usuarioId: superId, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
    console.log(`IDs: negocio=${!!negocioId} sucursal=${!!sucursalId} oferta=${!!ofertaId} articulo=${!!articuloId} usuario=${!!usuarioId} super=${!!superId}`);

    console.log('\n[negocios.service]');
    await probar('listarSucursalesCercanas (simple)', () => listarSucursalesCercanas(null, { ...GPS, distanciaMaxKm: 800, limite: 5 } as any));
    await probar('listarSucursalesCercanas (Coyo: filtro ciudad)', () => listarSucursalesCercanas(null, { ...GPS, distanciaMaxKm: 800, busqueda: 'a', modoFlexible: true, ciudad: CIUDAD, limite: 5 } as any));
    if (sucursalId) await probar('obtenerPerfilSucursal', () => obtenerPerfilSucursal(sucursalId, null));
    if (negocioId) await probar('obtenerSucursalesNegocio', () => obtenerSucursalesNegocio(negocioId));

    console.log('\n[ofertas.service + buscador]');
    await probar('obtenerFeedOfertas', () => obtenerFeedOfertas(null, { ...GPS, limite: 10 } as any));
    await probar('obtenerSugerenciasOfertas', () => obtenerSugerenciasOfertas('a', CIUDAD));
    await probar('buscarOfertas', () => buscarOfertas({ ciudad: CIUDAD, q: 'a', limit: 10 } as any));
    if (ofertaId) await probar('obtenerOfertaDetalle', () => obtenerOfertaDetalle(ofertaId, null, GPS));
    if (ofertaId) await probar('obtenerSucursalesDeOferta', () => obtenerSucursalesDeOferta(ofertaId, GPS));

    console.log('\n[articulos / sucursales / cardya / votos / chatya]');
    if (articuloId) await probar('obtenerArticuloDetalle', () => obtenerArticuloDetalle(articuloId));
    if (negocioId) await probar('obtenerSucursalesConGerente', () => obtenerSucursalesConGerente(negocioId, {}));
    if (usuarioId) await probar('obtenerRecompensasDisponibles', () => obtenerRecompensasDisponibles(usuarioId, { ciudad: CIUDAD } as any));
    if (usuarioId) await probar('obtenerSeguidos (sucursal)', () => obtenerSeguidos(usuarioId, 'sucursal' as any, 1, 20, undefined, GPS.latitud, GPS.longitud));
    await probar('buscarNegocios (chatya)', () => buscarNegocios('a', CIUDAD, GPS.latitud, GPS.longitud));

    console.log('\n[admin/negocios.service]');
    await probar('listarNegocios (filtro ciudad)', () => listarNegocios(panel, { pagina: 1, porPagina: 10, ciudad: CIUDAD } as any));
    await probar('listarCiudades (dropdown)', () => listarCiudades(panel));
    if (negocioId) await probar('obtenerDetalleNegocio', () => obtenerDetalleNegocio(panel, negocioId));
    if (negocioId) await probar('listarSucursalesNegocio', () => listarSucursalesNegocio(panel, negocioId));

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE (todas las queries migradas ejecutan sin error)' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error('❌ Error general:', e);
    process.exit(1);
});
