/**
 * generar-ciudades-mx.mjs
 * =======================
 * Genera el dataset empaquetado de ciudades de México para el mapa del módulo Ciudades.
 *
 * Fuente: catálogo de localidades de INEGI (Marco Geoestadístico), vía el repo público
 *   eduardoarandah/coordenadas-estados-municipios-localidades-de-mexico-json (data.csv).
 *   Datos de INEGI = información pública del gobierno de México, de libre uso (atribución a INEGI).
 *
 * Qué hace: lee el CSV crudo (304k localidades), se queda con las URBANAS (AMBITO='U' = ciudades y
 * pueblos, descarta rancherías/ejidos rurales), normaliza a { clave, nombre, estado, municipio, lat,
 * lng } y escribe un JSON ordenado por estado y nombre en apps/admin/public/ciudades-mexico.json.
 *
 * REGENERAR:
 *   1) curl -sL <url del data.csv> -o apps/admin/scripts/_raw_localidades.csv
 *   2) node apps/admin/scripts/generar-ciudades-mx.mjs
 *   3) borrar el CSV crudo (no se commitea)
 *
 * Ubicación: apps/admin/scripts/generar-ciudades-mx.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const ENTRADA = join(aqui, '_raw_localidades.csv');
const SALIDA = join(aqui, '..', 'public', 'ciudades-mexico.json');

/** Parser CSV mínimo que respeta comillas dobles ("" = comilla escapada). */
function parsearLinea(linea) {
    const campos = [];
    let actual = '';
    let enComillas = false;
    for (let i = 0; i < linea.length; i++) {
        const ch = linea[i];
        if (ch === '"') {
            if (enComillas && linea[i + 1] === '"') {
                actual += '"';
                i++;
            } else {
                enComillas = !enComillas;
            }
        } else if (ch === ',' && !enComillas) {
            campos.push(actual);
            actual = '';
        } else {
            actual += ch;
        }
    }
    campos.push(actual);
    return campos;
}

const redondear = (n) => Math.round(n * 1e5) / 1e5; // ~1 m de precisión, archivo más liviano

const texto = readFileSync(ENTRADA, 'utf8');
const lineas = texto.split(/\r?\n/);
// Columnas: CVE_ENT,NOM_ENT,NOM_ABR,CVE_MUN,NOM_MUN,CVE_LOC,NOM_LOC,AMBITO,LAT_DEC,LON_DEC,ALTITUD,CVE_CARTA
const IDX = { ent: 0, nomEnt: 1, mun: 3, nomMun: 4, loc: 5, nomLoc: 6, ambito: 7, lat: 8, lng: 9 };

const ciudades = [];
for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;
    const c = parsearLinea(linea);
    if (c[IDX.ambito] !== 'U') continue; // solo urbanas

    const lat = Number(c[IDX.lat]);
    const lng = Number(c[IDX.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    ciudades.push({
        clave: `${c[IDX.ent]}${c[IDX.mun]}${c[IDX.loc]}`, // id estable INEGI (estado+municipio+localidad)
        nombre: c[IDX.nomLoc].trim(),
        estado: c[IDX.nomEnt].trim(),
        municipio: c[IDX.nomMun].trim(),
        lat: redondear(lat),
        lng: redondear(lng),
    });
}

ciudades.sort((a, b) => a.estado.localeCompare(b.estado, 'es') || a.nombre.localeCompare(b.nombre, 'es'));

writeFileSync(SALIDA, JSON.stringify(ciudades));

const kb = Math.round(Buffer.byteLength(JSON.stringify(ciudades)) / 1024);
console.log(`✅ ${ciudades.length} ciudades urbanas escritas en ${SALIDA} (${kb} KB)`);
const porEstado = ciudades.reduce((m, c) => ((m[c.estado] = (m[c.estado] || 0) + 1), m), {});
console.log(`   Estados: ${Object.keys(porEstado).length}. Ejemplos:`, Object.entries(porEstado).slice(0, 3).map(([e, n]) => `${e}=${n}`).join(', '));
