/**
 * probar-configuracion-validacion.ts — HARNESS (DEV) · Fase 2 ACTUAR del módulo "Configuración"
 * ============================================================================================
 * Verifica la LÓGICA DE VALIDACIÓN de la escritura (lo más sensible: que la escalera no quede con huecos
 * ni solapes y que los rangos numéricos se respeten). Es lógica PURA — no toca la BD, no escribe nada.
 *
 * La prueba end-to-end de persistencia (guardar desde la UI → fila en BD + auditoría + caché reseteada)
 * la corre Juan desde el Panel tras aplicar la migración de siembra de la escalera.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-configuracion-validacion.ts
 *
 * Ubicación: apps/api/scripts/probar-configuracion-validacion.ts
 */

import { validarNumero, validarEscalera } from '../src/services/admin/configuracion-acciones.service.js';
import { ESCALERA_DEFAULT } from '../src/services/admin/configuracion.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;

/** Espera que la validación ACEPTE el valor. */
function aceptar(etiqueta: string, r: { ok: boolean }): void {
    if (!r.ok) fallos++;
    console.log(`    ${ok(r.ok)} acepta: ${etiqueta}`);
}
/** Espera que la validación RECHACE el valor (y muestra el motivo). */
function rechazar(etiqueta: string, r: { ok: true; valor: string } | { ok: false; mensaje: string }): void {
    if (r.ok) fallos++;
    console.log(`    ${ok(!r.ok)} rechaza: ${etiqueta}${!r.ok ? `  → "${r.mensaje}"` : ''}`);
}

const esc = (tramos: unknown) => JSON.stringify(tramos);

async function main(): Promise<void> {
    console.log('\n[1] validarNumero — trial (min 0, max 90)');
    aceptar('14', validarNumero(0, 90, '14'));
    aceptar('0 (mínimo)', validarNumero(0, 90, '0'));
    aceptar('90 (máximo)', validarNumero(0, 90, '90'));
    rechazar('-1 (bajo el mínimo)', validarNumero(0, 90, '-1'));
    rechazar('91 (sobre el máximo)', validarNumero(0, 90, '91'));
    rechazar('14.5 (no entero)', validarNumero(0, 90, '14.5'));
    rechazar('"abc" (no numérico)', validarNumero(0, 90, 'abc'));
    rechazar('"" (vacío)', validarNumero(0, 90, ''));

    console.log('\n[2] validarEscalera — forma de los tramos');
    aceptar('escalera por defecto', validarEscalera(esc(ESCALERA_DEFAULT)));
    aceptar('un solo tramo 0+ → $40', validarEscalera(esc([{ min: 0, max: null, montoPorActivo: 40 }])));
    rechazar('JSON inválido', validarEscalera('{no es json]'));
    rechazar('array vacío', validarEscalera(esc([])));
    rechazar('primer tramo no empieza en 0', validarEscalera(esc([{ min: 1, max: null, montoPorActivo: 30 }])));
    rechazar('hueco entre tramos (0–9, 11+)', validarEscalera(esc([{ min: 0, max: 9, montoPorActivo: 0 }, { min: 11, max: null, montoPorActivo: 30 }])));
    rechazar('solape entre tramos (0–9, 5+)', validarEscalera(esc([{ min: 0, max: 9, montoPorActivo: 0 }, { min: 5, max: null, montoPorActivo: 30 }])));
    rechazar('último tramo CON tope', validarEscalera(esc([{ min: 0, max: 9, montoPorActivo: 0 }, { min: 10, max: 24, montoPorActivo: 30 }])));
    rechazar('tramo intermedio sin tope', validarEscalera(esc([{ min: 0, max: null, montoPorActivo: 0 }, { min: 1, max: null, montoPorActivo: 30 }])));
    rechazar('monto negativo', validarEscalera(esc([{ min: 0, max: null, montoPorActivo: -5 }])));
    rechazar('min no entero', validarEscalera(esc([{ min: 0.5, max: null, montoPorActivo: 30 }])));

    console.log('\n[3] Normalización — re-serializa limpio (sin campos extra)');
    const sucia = esc([{ min: 0, max: null, montoPorActivo: 40, basura: 'x' }]);
    const r = validarEscalera(sucia);
    const limpio = r.ok && r.valor === esc([{ min: 0, max: null, montoPorActivo: 40 }]);
    if (!limpio) fallos++;
    console.log(`    ${ok(limpio)} descarta campos extra al guardar${r.ok ? `  → ${r.valor}` : ''}`);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
