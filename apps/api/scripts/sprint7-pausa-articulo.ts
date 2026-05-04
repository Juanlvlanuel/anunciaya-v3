/**
 * sprint7-pausa-articulo.ts — helper para verificación del botón Reactivar.
 */
import { config } from 'dotenv'; config();
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    const r = await db.execute(sql`
        UPDATE articulos_marketplace
        SET estado = 'pausada', updated_at = NOW()
        WHERE id = '2288d921-34dc-4737-8112-6bcde34ec346'
        RETURNING id, estado, expira_at
    `);
    console.log('Pausado:', JSON.stringify(r.rows));
    process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
