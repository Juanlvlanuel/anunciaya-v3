/**
 * crear-price-membresia.ts
 * ========================
 * Crea un Price NUEVO en Stripe para la membresía comercial (los Prices son inmutables → cambiar el precio
 * = crear uno nuevo). Lo crea sobre el MISMO producto que el Price actual y muestra el nuevo Price ID para
 * ponerlo en STRIPE_PRICE_COMERCIAL. Crear un Price NO cobra a nadie; es solo configuración del catálogo.
 *
 * El monto sale de PRECIO_NUEVO_MXN (debe coincidir con PRECIO_MEMBRESIA del código = 849).
 * El modo (TEST/LIVE) lo determina la STRIPE_SECRET_KEY de tu .env.
 *
 * Uso (desde la raíz del repo):
 *   pnpm --filter @anunciaya/api exec tsx scripts/crear-price-membresia.ts            → dry-run (muestra el plan, NO crea)
 *   pnpm --filter @anunciaya/api exec tsx scripts/crear-price-membresia.ts --aplicar  → crea el Price nuevo
 *   ... --aplicar --archivar-viejo   → además desactiva (active=false) el Price anterior para que no se use en altas nuevas
 */

import { stripe } from '../src/config/stripe.js';
import { env } from '../src/config/env.js';

const PRECIO_NUEVO_MXN = 849; // debe coincidir con PRECIO_MEMBRESIA (apps/admin/.../membresia.ts)
const APLICAR = process.argv.includes('--aplicar');
const ARCHIVAR_VIEJO = process.argv.includes('--archivar-viejo');

async function main() {
    // 1. Leer el Price actual: de ahí salen el PRODUCTO (para reusarlo) y el MODO (test/live).
    const actual = await stripe.prices.retrieve(env.STRIPE_PRICE_COMERCIAL);
    const modo = actual.livemode ? '🔴 LIVE' : '🟢 TEST';
    const productId = typeof actual.product === 'string' ? actual.product : actual.product.id;
    const montoActual = (actual.unit_amount ?? 0) / 100;

    console.log(`Modo Stripe: ${modo}`);
    console.log(`Price actual: ${actual.id} → $${montoActual} ${actual.currency.toUpperCase()}/${actual.recurring?.interval ?? '—'} (producto ${productId})`);
    console.log(`Price NUEVO a crear: $${PRECIO_NUEVO_MXN} MXN/mes sobre el mismo producto.`);

    if (montoActual === PRECIO_NUEVO_MXN) {
        console.log(`\n⚠️  El Price actual YA es de $${PRECIO_NUEVO_MXN}. ¿Seguro que quieres crear otro? Revisa antes de --aplicar.`);
    }

    if (!APLICAR) {
        console.log('\n(dry-run) Nada se creó. Corre con --aplicar para crear el Price nuevo.');
        process.exit(0);
    }

    // 2. Buscar un Price activo de $849 mensual MXN sobre el producto (idempotente: si ya existe, lo reuso).
    const lista = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    let nuevo = lista.data.find(
        (p) => p.unit_amount === PRECIO_NUEVO_MXN * 100 && p.currency === 'mxn' && p.recurring?.interval === 'month' && p.id !== actual.id,
    );
    if (nuevo) {
        console.log(`\nYa existía un Price de $${PRECIO_NUEVO_MXN}: ${nuevo.id} → lo reuso (no creo duplicado).`);
    } else {
        nuevo = await stripe.prices.create({
            product: productId,
            unit_amount: PRECIO_NUEVO_MXN * 100, // centavos
            currency: 'mxn',
            recurring: { interval: 'month' },
            nickname: `Membresía comercial $${PRECIO_NUEVO_MXN}/mes`,
        });
        console.log(`\n✅ Price nuevo creado: ${nuevo.id}  ($${PRECIO_NUEVO_MXN} MXN/mes, ${modo})`);
    }

    // 3. Hacerlo el PRECIO POR DEFECTO del producto. Esto destrona al viejo y permite archivarlo.
    await stripe.products.update(productId, { default_price: nuevo.id });
    console.log(`🏷️  Producto ${productId}: default_price → ${nuevo.id}`);

    // 4. Archivar el viejo (ya no es default). Idempotente: si ya está inactivo, no pasa nada.
    if (ARCHIVAR_VIEJO && actual.id !== nuevo.id) {
        await stripe.prices.update(actual.id, { active: false });
        console.log(`🗄️  Price viejo ${actual.id} archivado (active=false).`);
    }

    console.log(`\n👉 Pon este Price ID en STRIPE_PRICE_COMERCIAL y reinicia el API:`);
    console.log(`   • Render (backend prod): env var  STRIPE_PRICE_COMERCIAL = ${nuevo.id}`);
    console.log(`   • .env local (dev):      STRIPE_PRICE_COMERCIAL=${nuevo.id}`);
    process.exit(0);
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
