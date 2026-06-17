/**
 * probar-configuracion-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo "Configuración"
 * =====================================================================================
 * Verifica la lectura del módulo Configuración contra la BD real. SOLO SELECT — no crea, no modifica,
 * no borra. Seguro de correr en cualquier ambiente.
 *
 * Cubre los criterios de aceptación de lectura (Configuracion_Pendientes.md):
 *   A2 — la pantalla lista los valores editables (escalera + trial + gracia) con su meta y valor actual,
 *        usando el valor de BD si existe o el default del catálogo si la clave aún no está sembrada.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-configuracion-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-configuracion-lectura.ts
 */

import { config } from 'dotenv';
config();

import { listarConfiguracion, CONFIG_EDITABLE } from '../src/services/admin/configuracion.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main(): Promise<void> {
    console.log('\n[1] listarConfiguracion — estructura y valores');
    const filas = await listarConfiguracion();

    verificar('devuelve todas las claves del catálogo', filas.length === CONFIG_EDITABLE.length, `filas=${filas.length}, catálogo=${CONFIG_EDITABLE.length}`);
    verificar('cada fila trae etiqueta, tipo y categoría', filas.every((f) => !!f.etiqueta && !!f.tipo && !!f.categoria));
    verificar('las claves coinciden con el catálogo', filas.map((f) => f.clave).sort().join(',') === CONFIG_EDITABLE.map((c) => c.clave).sort().join(','));

    console.log('\n[2] Valores numéricos (trial / gracia)');
    for (const clave of ['trial_duracion_dias', 'periodo_gracia_cobro_dias']) {
        const f = filas.find((x) => x.clave === clave);
        if (!f) { verificar(`existe ${clave}`, false); continue; }
        const n = Number(f.valor);
        const dentro = Number.isFinite(n) && (f.min === null || n >= f.min) && (f.max === null || n <= f.max);
        verificar(`${clave}: tipo numero, valor válido y en rango`, f.tipo === 'numero' && dentro, `valor=${f.valor} (${f.min ?? '-'}–${f.max ?? '-'}), sembrado=${f.sembrado}`);
    }

    console.log('\n[3] Escalera de comisiones (json)');
    const esc = filas.find((x) => x.clave === 'comision_escalera');
    if (!esc) {
        verificar('existe comision_escalera', false);
    } else {
        verificar('tipo = json', esc.tipo === 'json');
        let tramos: Array<{ min: number; max: number | null; montoPorActivo: number }> = [];
        let parsea = true;
        try { tramos = JSON.parse(esc.valor); } catch { parsea = false; }
        verificar('el valor parsea a un array de tramos', parsea && Array.isArray(tramos) && tramos.length > 0, `tramos=${tramos.length}`);
        const formaOk = tramos.every((t) => typeof t.min === 'number' && (t.max === null || typeof t.max === 'number') && typeof t.montoPorActivo === 'number');
        verificar('cada tramo tiene min/max/montoPorActivo', formaOk);
        const ordenado = tramos.every((t, i) => i === 0 || t.min > tramos[i - 1].min);
        verificar('tramos en orden ascendente por min', ordenado);
        verificar('último tramo sin tope (max=null)', tramos.length > 0 && tramos[tramos.length - 1].max === null);
        console.log(`    (escalera: ${tramos.map((t) => `${t.min}${t.max === null ? '+' : '-' + t.max}→$${t.montoPorActivo}`).join('  ')})`);
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
