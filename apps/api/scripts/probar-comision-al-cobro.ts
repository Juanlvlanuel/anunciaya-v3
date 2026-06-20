/**
 * probar-comision-al-cobro.ts — HARNESS (DEV) · Pieza 3 del Sprint de Stripe
 * =========================================================================
 * Verifica el ANTI-DOBLE-PAGO de la comisión recurrente "al cobro" (D16/D16.1) con datos reales.
 *
 * Crea un escenario AISLADO (vendedor + embajador + N negocios activos de prueba, suficientes para
 * caer en el primer tramo de la escalera con monto > 0) y comprueba:
 *   [1] PRIMER cobro ANUAL CON alta (paga 10× el mensual) devenga UNA comisión = 9 × escalón (no 10× ni
 *       12×): el 1er mes lo cubre la comisión de ALTA y no se paga dos veces; marcador a la cobertura (+12m).
 *   [2] Re-cobrar la MISMA cobertura NO devenga doble (idempotencia por el marcador).
 *   [3] Una renovación posterior (cobertura +13m, NO es primer cobro) devenga 1× COMPLETO (no descuenta).
 *   [4] El negocio prepagado SIGUE contando como activo para el escalón.
 *   [5] Un negocio SIN vendedor no devenga nada.
 *   [6] PRIMER cobro ANUAL SIN alta devenga los 10 meses completos (el descuento aplica solo si hubo alta).
 *
 * ⚠️ ESCRIBE en usuarios/embajadores/negocios/embajador_comisiones (todo de prueba) y LIMPIA al final.
 *    Aborta en producción. Requiere la migración 2026-06-19-comision-al-cobro.sql aplicada.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-comision-al-cobro.ts
 *
 * Ubicación: apps/api/scripts/probar-comision-al-cobro.ts
 */

import { config } from 'dotenv';
config();

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { usuarios, embajadores, negocios, embajadorComisiones } from '../src/db/schemas/schema.js';
import { devengarComisionRecurrenteAlCobro, escaleraActual, montoPorActivo } from '../src/services/admin/comisiones-devengo.service.js';
import { obtenerConfigNumero } from '../src/services/configuracion.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string): void {
    if (!cond) fallos++;
    console.log(`    ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}
/** ISO de hoy + n meses. */
function isoEnMeses(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString();
}
/** ¿dos fechas ISO caen el mismo día (tolerancia de 36 h para desfases de zona)? */
function mismaFecha(a: string | null, b: string): boolean {
    if (!a) return false;
    return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 36 * 3600 * 1000;
}

async function main(): Promise<void> {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: production.');
        process.exit(1);
    }

    const sufijo = Date.now();
    const escalera = await escaleraActual();
    const precio = await obtenerConfigNumero('precio_membresia_mxn', 849);

    // Cuántos negocios activos para caer en el PRIMER tramo con monto > 0 (garantiza comisión > 0).
    const tramoPos = escalera.find((t) => t.montoPorActivo > 0);
    if (!tramoPos) {
        console.error('✗ La escalera vigente no tiene ningún tramo > $0; no se puede probar el monto.');
        process.exit(1);
    }
    // Al menos 1 negocio (el "objetivo"); más si el primer tramo > $0 arranca en >1 activo.
    const numActivos = Math.max(1, tramoPos.min);
    const unitario = montoPorActivo(numActivos, escalera);
    if (unitario <= 0) {
        console.error(`✗ Con la escalera vigente, ${numActivos} activo(s) dan $0/activo; no se puede probar el monto.`);
        process.exit(1);
    }

    console.log('\n════════ Pieza 3 · comisión recurrente AL COBRO ════════');
    console.log(`Precio mensual=$${precio} · activos de prueba=${numActivos} · escalón=$${unitario}/activo`);

    // ── Setup aislado: vendedor + embajador + comerciante dummy + N negocios activos ──
    const [uVend] = await db.insert(usuarios).values({
        nombre: 'Vendedor', apellidos: 'P3Test', correo: `p3.vend.${sufijo}@dev.local`, perfil: 'personal', estado: 'activo',
    }).returning({ id: usuarios.id });
    const [emb] = await db.insert(embajadores).values({
        usuarioId: uVend.id, codigoReferido: `P3T${sufijo}`, estado: 'activo',
    }).returning({ id: embajadores.id });
    const [uDummy] = await db.insert(usuarios).values({
        nombre: 'Comerciante', apellidos: 'P3Test', correo: `p3.com.${sufijo}@dev.local`, perfil: 'comercial', estado: 'activo',
    }).returning({ id: usuarios.id });

    const negocioIds: string[] = [];
    for (let i = 0; i < numActivos; i++) {
        const [n] = await db.insert(negocios).values({
            usuarioId: uDummy.id, nombre: `P3 Negocio ${i}`, embajadorId: emb.id,
            estadoAdmin: 'activo', estadoMembresia: 'al_corriente',
        }).returning({ id: negocios.id });
        negocioIds.push(n.id);
    }
    const objetivo = negocioIds[0]; // el negocio que "prepaga el año"

    const limpiar = async () => {
        await db.delete(embajadorComisiones).where(eq(embajadorComisiones.embajadorId, emb.id));
        await db.delete(negocios).where(inArray(negocios.id, negocioIds));
        await db.delete(embajadores).where(eq(embajadores.id, emb.id));
        await db.delete(usuarios).where(inArray(usuarios.id, [uVend.id, uDummy.id]));
    };

    const recurrentesDelNegocio = async (negId: string) =>
        db.select({ id: embajadorComisiones.id, monto: embajadorComisiones.montoComision, detalle: embajadorComisiones.detalle })
            .from(embajadorComisiones)
            .where(and(eq(embajadorComisiones.negocioId, negId), eq(embajadorComisiones.tipo, 'recurrente')));
    const marcadorDe = async (negId: string): Promise<string | null> => {
        const [n] = await db.select({ m: negocios.comisionDevengadaHasta }).from(negocios).where(eq(negocios.id, negId)).limit(1);
        return n?.m ?? null;
    };

    try {
        // ── [1] PRIMER cobro ANUAL CON alta: paga 10× pero el 1er mes lo cubre la comisión de ALTA
        //        (pago único = 1er mes de membresía) → devenga 9 × escalón, no 10. Anti-doble-pago. ──
        await db.insert(embajadorComisiones).values({
            embajadorId: emb.id, negocioId: objetivo, tipo: 'alta', montoComision: '400',
            estado: 'pendiente', periodo: null, detalle: { tipo: 'alta', monto: 400 },
        });
        const cobertura12 = isoEnMeses(12);
        await devengarComisionRecurrenteAlCobro(objetivo, cobertura12, precio * 10);
        let fObj = await recurrentesDelNegocio(objetivo);
        const det0 = (fObj[0]?.detalle ?? {}) as { meses?: number };
        console.log(`\n[1] PRIMER cobro ANUAL con alta (paga $${precio * 10} = 10 meses; el 1º lo cubre la alta)`);
        verificar('se devengó UNA comisión recurrente', fObj.length === 1, `filas=${fObj.length}`);
        verificar(`monto = 9 × $${unitario} = $${9 * unitario} (descuenta el 1er mes de la alta)`, Number(fObj[0]?.monto) === 9 * unitario, `$${fObj[0]?.monto}`);
        verificar('detalle.meses = 9', det0.meses === 9, `meses=${det0.meses}`);
        verificar('marcador del negocio = cobertura (+12m)', mismaFecha(await marcadorDe(objetivo), cobertura12));

        // ── [2] IDEMPOTENCIA: re-cobrar la misma cobertura no devenga doble ──
        await devengarComisionRecurrenteAlCobro(objetivo, cobertura12, precio * 10);
        fObj = await recurrentesDelNegocio(objetivo);
        console.log('\n[2] Idempotencia (re-cobro de la MISMA cobertura)');
        verificar('sigue habiendo UNA sola comisión del negocio', fObj.length === 1, `filas=${fObj.length}`);

        // ── [3] RENOVACIÓN al mes 13 (NO es el primer cobro): devenga 1× COMPLETO, sin descontar
        //        (el descuento de la alta es solo del primer cobro del negocio). ──
        const cobertura13 = isoEnMeses(13);
        await devengarComisionRecurrenteAlCobro(objetivo, cobertura13, precio);
        fObj = await recurrentesDelNegocio(objetivo);
        console.log('\n[3] Renovación posterior (cobra 1 mes, cobertura +13m)');
        verificar('ahora hay DOS comisiones del negocio', fObj.length === 2, `filas=${fObj.length}`);
        verificar(`la nueva = 1 × $${unitario} (renovación NO descuenta)`, fObj.some((f) => Number(f.monto) === unitario));
        verificar('marcador avanzó a +13m', mismaFecha(await marcadorDe(objetivo), cobertura13));

        // ── [4] El negocio prepagado SIGUE contando como activo para el escalón ──
        const activosAhora = await db
            .select({ n: negocios.id })
            .from(negocios)
            .where(and(eq(negocios.embajadorId, emb.id), eq(negocios.estadoAdmin, 'activo'), inArray(negocios.estadoMembresia, ['al_corriente', 'en_gracia'])));
        console.log('\n[4] El negocio prepagado sigue activo para el escalón');
        verificar(`el vendedor mantiene ${numActivos} negocios activos`, activosAhora.length === numActivos, `activos=${activosAhora.length}`);

        // ── [5] SIN VENDEDOR: un negocio sin embajador no devenga ──
        const [nSinVend] = await db.insert(negocios).values({
            usuarioId: uDummy.id, nombre: 'P3 SinVendedor', embajadorId: null, estadoAdmin: 'activo', estadoMembresia: 'al_corriente',
        }).returning({ id: negocios.id });
        negocioIds.push(nSinVend.id);
        await devengarComisionRecurrenteAlCobro(nSinVend.id, isoEnMeses(12), precio * 10);
        const sinVend = await recurrentesDelNegocio(nSinVend.id);
        console.log('\n[5] Negocio SIN vendedor');
        verificar('no se devengó ninguna comisión', sinVend.length === 0, `filas=${sinVend.length}`);

        // ── [6] PRIMER cobro ANUAL SIN alta: un negocio con vendedor pero SIN comisión de alta devenga
        //        los 10 meses COMPLETOS (el descuento del 1er mes aplica solo si hubo alta). El negocio
        //        suma 1 al escalón del vendedor, así que el unitario esperado se calcula con numActivos+1. ──
        const unitario6 = montoPorActivo(numActivos + 1, escalera);
        const [nSinAlta] = await db.insert(negocios).values({
            usuarioId: uDummy.id, nombre: 'P3 SinAlta', embajadorId: emb.id, estadoAdmin: 'activo', estadoMembresia: 'al_corriente',
        }).returning({ id: negocios.id });
        negocioIds.push(nSinAlta.id);
        await devengarComisionRecurrenteAlCobro(nSinAlta.id, isoEnMeses(12), precio * 10);
        const fSinAlta = await recurrentesDelNegocio(nSinAlta.id);
        const detSinAlta = (fSinAlta[0]?.detalle ?? {}) as { meses?: number };
        console.log('\n[6] PRIMER cobro ANUAL SIN alta (no descuenta el 1er mes)');
        verificar('se devengó UNA comisión recurrente', fSinAlta.length === 1, `filas=${fSinAlta.length}`);
        verificar('detalle.meses = 10 (sin alta → no descuenta)', detSinAlta.meses === 10, `meses=${detSinAlta.meses}`);
        verificar(`monto = 10 × $${unitario6} (escalón con el activo extra)`, Number(fSinAlta[0]?.monto) === 10 * unitario6, `$${fSinAlta[0]?.monto}`);
    } finally {
        await limpiar();
        console.log('\n🧹 Limpieza hecha (vendedor + negocios + comisiones de prueba borrados).');
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE — anti-doble-pago del prepago OK' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error('Error en probar-comision-al-cobro:', e);
    process.exit(1);
});
