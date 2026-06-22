/**
 * probar-publicidad-precio.ts — HARNESS (DEV) · precio + tramos de Publicidad
 * ===========================================================================
 * Valida el cálculo de precio (calcularPrecioPublicidad, con los defaults de Configuración) y
 * la validación de los tramos de ciudades (validarTramosCiudades). Solo LECTURA / funciones puras.
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-precio.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-precio.ts
 */

import { config } from 'dotenv';
config();

import { calcularPrecioPublicidad } from '../src/services/publicidad-precio.service.js';
import { validarTramosCiudades, validarPeriodos } from '../src/services/admin/configuracion-acciones.service.js';
import { TRAMOS_CIUDADES_DEFAULT, PERIODOS_DEFAULT } from '../src/services/admin/configuracion.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main() {
  console.log('\n════════ Precio + tramos de Publicidad ════════');

  // Cálculo (defaults: anuncios 300 · patrocinadores 800 · fundadores 500 · combo -15% ·
  // tramos 1→×1, 2-3→×1.8, 4-6→×2.5, 7+→×3).
  const c1 = await calcularPrecioPublicidad(['anuncios'], 1);
  verificar('anuncios · 1 ciudad = 300', c1.total === 300, `${c1.total}`);

  const c2 = await calcularPrecioPublicidad(['patrocinadores'], 3);
  verificar('patrocinadores · 3 ciudades = 1440', c2.total === 1440, `${c2.total}`);

  const c3 = await calcularPrecioPublicidad(['fundadores'], 2);
  verificar('fundadores · 2 ciudades = 900', c3.total === 900, `${c3.total}`);

  const c4 = await calcularPrecioPublicidad(['anuncios', 'patrocinadores', 'fundadores'], 1);
  verificar('combo · 1 ciudad = 1360 (1600 −15%)', c4.total === 1360 && c4.esCombo, `${c4.total}`);

  const c5 = await calcularPrecioPublicidad(['anuncios', 'patrocinadores', 'fundadores'], 5);
  verificar('combo · 5 ciudades = 3400 (1600 ×2.5 −15%)', c5.total === 3400, `${c5.total}`);

  const c6 = await calcularPrecioPublicidad(['anuncios'], 10);
  verificar('anuncios · 10 ciudades = 900 (último tramo ×3)', c6.total === 900, `${c6.total}`);

  // Meses por adelantado (periodos default: 1→0% · 3→10% · 6→15% · 12→25%).
  const m1 = await calcularPrecioPublicidad(['anuncios', 'patrocinadores', 'fundadores'], 1, 3);
  verificar('combo · 1 ciudad · 3 meses = 3672 (1360×3 −10%)', m1.total === 3672 && m1.meses === 3 && m1.descuentoPeriodo === 10, `${m1.total}`);

  const m2 = await calcularPrecioPublicidad(['anuncios'], 1, 6);
  verificar('anuncios · 6 meses = 1530 (300×6 −15%)', m2.total === 1530, `${m2.total}`);

  const m3 = await calcularPrecioPublicidad(['anuncios'], 1, 12);
  verificar('anuncios · 12 meses = 2700 (300×12 −25%)', m3.total === 2700, `${m3.total}`);

  // Validación de tramos.
  verificar('tramos default válidos', validarTramosCiudades(JSON.stringify(TRAMOS_CIUDADES_DEFAULT)).ok);
  verificar('rechaza: primer tramo no empieza en 1',
    !validarTramosCiudades(JSON.stringify([{ min: 2, max: null, factor: 1 }])).ok);
  verificar('rechaza: hueco entre tramos',
    !validarTramosCiudades(JSON.stringify([{ min: 1, max: 1, factor: 1 }, { min: 3, max: null, factor: 2 }])).ok);
  verificar('rechaza: factor negativo',
    !validarTramosCiudades(JSON.stringify([{ min: 1, max: null, factor: -1 }])).ok);
  verificar('rechaza: último con tope',
    !validarTramosCiudades(JSON.stringify([{ min: 1, max: 5, factor: 1 }])).ok);

  // Validación de periodos.
  verificar('periodos default válidos', validarPeriodos(JSON.stringify(PERIODOS_DEFAULT)).ok);
  verificar('rechaza: sin opción de 1 mes', !validarPeriodos(JSON.stringify([{ meses: 3, descuento: 10 }])).ok);
  verificar('rechaza: descuento > 90', !validarPeriodos(JSON.stringify([{ meses: 1, descuento: 0 }, { meses: 3, descuento: 95 }])).ok);
  verificar('rechaza: meses repetidos', !validarPeriodos(JSON.stringify([{ meses: 1, descuento: 0 }, { meses: 1, descuento: 10 }])).ok);

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-precio:', err);
  process.exit(1);
});
