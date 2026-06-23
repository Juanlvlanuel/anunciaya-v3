/**
 * probar-escalera-dinamica.ts — HARNESS (DEV) · E5: la escalera de comisiones es DINÁMICA
 * =======================================================================================
 * Verifica que editar `comision_escalera` desde el Panel (la MISMA función real `actualizarConfig`)
 * hace que el SIGUIENTE cobro devengue con el NUEVO escalón: la lógica lee la escalera de config en cada
 * cobro (`escaleraActual()`), sin servir un valor viejo.
 *
 * Cambia la escalera a valores de prueba INCONFUNDIBLES ($777, luego $111), devenga, verifica el monto, y
 * RESTAURA la escalera original. AISLADO: crea vendedor + negocio de prueba y los borra. Aborta en prod.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-escalera-dinamica.ts
 *
 * Ubicación: apps/api/scripts/probar-escalera-dinamica.ts
 */

import { config } from 'dotenv';
config();

import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { configuracionSistema, usuarios, embajadores, negocios, embajadorComisiones } from '../src/db/schemas/schema.js';
import { devengarComisionRecurrenteAlCobro, escaleraActual, montoPorActivo } from '../src/services/admin/comisiones-devengo.service.js';
import { actualizarConfig } from '../src/services/admin/configuracion-acciones.service.js';
import { obtenerConfigNumero, resetearCacheConfig } from '../src/services/configuracion.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string): void {
    if (!cond) fallos++;
    console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}
function isoEnMeses(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString();
}

async function main(): Promise<void> {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

    console.log('\n════════ E5 · escalera de comisiones DINÁMICA ════════');
    const precio = await obtenerConfigNumero('precio_membresia_mxn', 849);

    // Valor CRUDO original de la escalera (para restaurar EXACTO). null si no estaba sembrada (usa default).
    const [prev] = await db.select({ valor: configuracionSistema.valor }).from(configuracionSistema)
        .where(eq(configuracionSistema.clave, 'comision_escalera')).limit(1);
    const escaleraOriginalCruda: string | null = prev?.valor ?? null;
    console.log(`Escalera original ${escaleraOriginalCruda ? 'sembrada en config' : '(default del catálogo)'} · precio mensual=$${precio}`);

    const [sa] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rolEquipo, 'superadmin')).limit(1);
    const panel = { usuarioId: sa?.id ?? null, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true } as unknown as UsuarioPanel;

    // Setup aislado: vendedor + embajador + 1 negocio activo (cae en el tramo único de la escalera de prueba).
    const sufijo = Date.now();
    const [uVend] = await db.insert(usuarios).values({ nombre: 'Vend', apellidos: 'E5', correo: `e5.vend.${sufijo}@dev.local`, perfil: 'personal', estado: 'activo' }).returning({ id: usuarios.id });
    const [emb] = await db.insert(embajadores).values({ usuarioId: uVend.id, codigoReferido: `E5T${sufijo}`, estado: 'activo' }).returning({ id: embajadores.id });
    const [uDummy] = await db.insert(usuarios).values({ nombre: 'Com', apellidos: 'E5', correo: `e5.com.${sufijo}@dev.local`, perfil: 'comercial', estado: 'activo' }).returning({ id: usuarios.id });
    const [neg] = await db.insert(negocios).values({ usuarioId: uDummy.id, nombre: 'E5 Negocio', embajadorId: emb.id, estadoAdmin: 'activo', estadoMembresia: 'al_corriente' }).returning({ id: negocios.id });

    const recurrentes = async () => db.select({ monto: embajadorComisiones.montoComision })
        .from(embajadorComisiones).where(and(eq(embajadorComisiones.negocioId, neg.id), eq(embajadorComisiones.tipo, 'recurrente')));

    const restaurar = async () => {
        if (escaleraOriginalCruda !== null) {
            await actualizarConfig(panel, 'comision_escalera', escaleraOriginalCruda);
        } else {
            await db.delete(configuracionSistema).where(eq(configuracionSistema.clave, 'comision_escalera'));
            resetearCacheConfig();
        }
    };

    try {
        // [1] Editar la escalera → $777/activo (tramo único). 1er cobro de 1 mes → 1 × $777.
        const A = JSON.stringify([{ min: 0, max: null, montoPorActivo: 777 }]);
        const rA = await actualizarConfig(panel, 'comision_escalera', A);
        verificar('actualizarConfig(escalera A=$777) ok', rA.ok === true, JSON.stringify(rA));
        verificar('escaleraActual() refleja $777/activo', montoPorActivo(1, await escaleraActual()) === 777);
        await devengarComisionRecurrenteAlCobro(neg.id, isoEnMeses(1), precio); // paga 1 mes
        let fil = await recurrentes();
        console.log('\n[1] Tras editar la escalera a $777/activo · 1er cobro (1 mes)');
        verificar('1 comisión recurrente', fil.length === 1, `filas=${fil.length}`);
        verificar('monto = 1 × $777 (usó la escalera RECIÉN editada)', Number(fil[0]?.monto) === 777, `$${fil[0]?.monto}`);

        // [2] CAMBIO DINÁMICO: editar a $111/activo. Otra cobertura → 1 × $111 (el cambio se respeta al instante).
        const B = JSON.stringify([{ min: 0, max: null, montoPorActivo: 111 }]);
        await actualizarConfig(panel, 'comision_escalera', B);
        verificar('escaleraActual() ahora refleja $111/activo', montoPorActivo(1, await escaleraActual()) === 111);
        await devengarComisionRecurrenteAlCobro(neg.id, isoEnMeses(2), precio); // cobertura posterior
        fil = await recurrentes();
        console.log('\n[2] Cambio dinámico a $111/activo · siguiente cobro');
        verificar('ahora 2 comisiones', fil.length === 2, `filas=${fil.length}`);
        verificar('la nueva = 1 × $111 (el cambio se respetó al instante, sin caché viejo)', fil.some((f) => Number(f.monto) === 111));
    } finally {
        await restaurar();
        const restaurada = await escaleraActual();
        console.log(`\n🔁 Escalera restaurada (escalón a 1 activo = $${montoPorActivo(1, restaurada)}/activo).`);
        await db.delete(embajadorComisiones).where(eq(embajadorComisiones.embajadorId, emb.id));
        await db.delete(negocios).where(eq(negocios.id, neg.id));
        await db.delete(embajadores).where(eq(embajadores.id, emb.id));
        await db.delete(usuarios).where(eq(usuarios.id, uVend.id));
        await db.delete(usuarios).where(eq(usuarios.id, uDummy.id));
        console.log('🧹 Limpieza hecha (vendedor + negocio + comisiones de prueba borrados).');
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE — la escalera se respeta dinámicamente (E5)' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Error en probar-escalera-dinamica:', e); process.exit(1); });
