/**
 * probar-gracia-dinamica.ts — HARNESS (DEV) · E4: el periodo de gracia es DINÁMICO
 * ================================================================================
 * Verifica que editar `periodo_gracia_cobro_dias` desde el Panel (la función real `actualizarConfig`)
 * hace que el SIGUIENTE vencimiento fije `fecha_limite_gracia` con el NUEVO plazo. Usa la ruta de pagos
 * MANUALES (`expirarManualesVencidos`), que lee la MISMA config de gracia que el webhook de tarjeta — sin
 * Stripe.
 *
 * Cambia la gracia a 7 y luego a 3 días, expira un negocio manual vencido, verifica el plazo, y RESTAURA
 * la config original. AISLADO: crea negocio + dueño de prueba y los borra. Aborta en prod.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-gracia-dinamica.ts
 *
 * Ubicación: apps/api/scripts/probar-gracia-dinamica.ts
 */

import { config } from 'dotenv';
config();

import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { configuracionSistema, usuarios, negocios } from '../src/db/schemas/schema.js';
import { expirarManualesVencidos } from '../src/services/suscripciones/vencimientos-manuales.js';
import { actualizarConfig } from '../src/services/admin/configuracion-acciones.service.js';
import { obtenerConfigNumero, resetearCacheConfig } from '../src/services/configuracion.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string): void {
    if (!cond) fallos++;
    console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main(): Promise<void> {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

    console.log('\n════════ E4 · periodo de gracia DINÁMICO ════════');
    const graciaOriginal = await obtenerConfigNumero('periodo_gracia_cobro_dias', 14);
    const [prev] = await db.select({ valor: configuracionSistema.valor }).from(configuracionSistema)
        .where(eq(configuracionSistema.clave, 'periodo_gracia_cobro_dias')).limit(1);
    const graciaOriginalCruda: string | null = prev?.valor ?? null;
    console.log(`Gracia original = ${graciaOriginal}d ${graciaOriginalCruda ? '(sembrada en config)' : '(default del catálogo)'}`);

    const [sa] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rolEquipo, 'superadmin')).limit(1);
    const panel = { usuarioId: sa?.id ?? null, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true } as unknown as UsuarioPanel;

    // Setup aislado: 1 negocio MANUAL vencido (fecha_vencimiento = ayer), al_corriente.
    const sufijo = Date.now();
    const ayer = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [uDummy] = await db.insert(usuarios).values({ nombre: 'Com', apellidos: 'E4', correo: `e4.com.${sufijo}@dev.local`, perfil: 'comercial', estado: 'activo' }).returning({ id: usuarios.id });
    const [neg] = await db.insert(negocios).values({
        usuarioId: uDummy.id, nombre: 'E4 Negocio Manual', metodoCobro: 'manual',
        estadoAdmin: 'activo', estadoMembresia: 'al_corriente', activo: true, fechaVencimiento: ayer,
    }).returning({ id: negocios.id });

    const leer = async () => {
        const [n] = await db.select({ estado: negocios.estadoMembresia, limite: negocios.fechaLimiteGracia })
            .from(negocios).where(eq(negocios.id, neg.id)).limit(1);
        return n;
    };
    const resetVencido = async () => {
        await db.update(negocios)
            .set({ estadoMembresia: 'al_corriente', fechaInicioGracia: null, fechaLimiteGracia: null, fechaVencimiento: ayer })
            .where(eq(negocios.id, neg.id));
    };
    const restaurar = async () => {
        if (graciaOriginalCruda !== null) await actualizarConfig(panel, 'periodo_gracia_cobro_dias', graciaOriginalCruda);
        else { await db.delete(configuracionSistema).where(eq(configuracionSistema.clave, 'periodo_gracia_cobro_dias')); resetearCacheConfig(); }
    };

    try {
        // [1] gracia = 7 días → el vencido entra a en_gracia con límite ≈ ahora + 7d.
        await actualizarConfig(panel, 'periodo_gracia_cobro_dias', '7');
        verificar('config gracia = 7d', (await obtenerConfigNumero('periodo_gracia_cobro_dias', 14)) === 7);
        const t1 = Date.now();
        const r1 = await expirarManualesVencidos();
        const n1 = await leer();
        const dias1 = n1?.limite ? (new Date(n1.limite).getTime() - t1) / 86_400_000 : NaN;
        console.log(`\n[1] Gracia = 7d · expirarManualesVencidos (${r1.enGracia} a gracia)`);
        verificar('negocio → en_gracia', n1?.estado === 'en_gracia', n1?.estado);
        verificar('fecha_limite_gracia ≈ ahora + 7d', Math.abs(dias1 - 7) < 0.02, `${dias1.toFixed(3)}d`);

        // [2] CAMBIO DINÁMICO: gracia = 3 días → el siguiente vencimiento usa +3d.
        await resetVencido();
        await actualizarConfig(panel, 'periodo_gracia_cobro_dias', '3');
        verificar('config gracia = 3d', (await obtenerConfigNumero('periodo_gracia_cobro_dias', 14)) === 3);
        const t2 = Date.now();
        await expirarManualesVencidos();
        const n2 = await leer();
        const dias2 = n2?.limite ? (new Date(n2.limite).getTime() - t2) / 86_400_000 : NaN;
        console.log('\n[2] Cambio dinámico a 3d · siguiente vencimiento');
        verificar('negocio → en_gracia', n2?.estado === 'en_gracia', n2?.estado);
        verificar('fecha_limite_gracia ≈ ahora + 3d (el cambio se respetó al instante)', Math.abs(dias2 - 3) < 0.02, `${dias2.toFixed(3)}d`);
    } finally {
        await restaurar();
        console.log(`\n🔁 Gracia restaurada (${await obtenerConfigNumero('periodo_gracia_cobro_dias', 14)}d).`);
        await db.delete(negocios).where(eq(negocios.id, neg.id));
        await db.delete(usuarios).where(eq(usuarios.id, uDummy.id));
        console.log('🧹 Limpieza hecha (negocio + dueño de prueba borrados).');
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE — el periodo de gracia se respeta dinámicamente (E4)' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Error en probar-gracia-dinamica:', e); process.exit(1); });
