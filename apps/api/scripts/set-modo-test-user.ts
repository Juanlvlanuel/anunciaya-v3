import { config } from 'dotenv'; config();
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const modo = process.argv[2] === 'comercial' ? 'comercial' : 'personal';

async function main() {
    const r = await db.execute(sql`
        UPDATE usuarios
        SET modo_activo = ${modo},
            tiene_modo_comercial = ${modo === 'comercial'}
        WHERE id = 'a0000000-0000-4000-a000-000000000001'
        RETURNING id, modo_activo, tiene_modo_comercial
    `);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
