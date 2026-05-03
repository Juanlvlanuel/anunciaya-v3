/**
 * marketplace-test-tokens.ts
 * ===========================
 * Script de un solo uso para el Sprint 1 de MarketPlace.
 *
 * Crea (si no existen) 2 usuarios de prueba e imprime 3 JWT listos para
 * pegar en los curls del Bloque 7 del sprint.
 *
 * EJECUTAR:
 *   cd apps/api
 *   pnpm exec tsx scripts/marketplace-test-tokens.ts
 *
 * Salida: 3 export bash con los tokens TOKEN_PERSONAL, TOKEN_COMERCIAL y
 * TOKEN_PERSONAL_OTRO. Pégalos tal cual en tu terminal.
 *
 * UBICACIÓN: apps/api/scripts/marketplace-test-tokens.ts
 */

import { config } from 'dotenv';
config();

import {
    crearUsuariosPrueba,
    TOKEN_USUARIO_1,
    TOKEN_USUARIO_2,
    TOKEN_COMERCIAL_1,
    USUARIO_1_ID,
    USUARIO_2_ID,
} from '../src/__tests__/helpers.js';

async function main() {
    console.log('🔧 Creando usuarios de prueba en la BD (si no existen)...');
    await crearUsuariosPrueba();
    console.log(`   ✅ USUARIO_1 (${USUARIO_1_ID})`);
    console.log(`   ✅ USUARIO_2 (${USUARIO_2_ID})`);
    console.log('');

    const tokenPersonal = TOKEN_USUARIO_1();        // USUARIO_1, modo personal — DUEÑO
    const tokenComercial = TOKEN_COMERCIAL_1();      // USUARIO_1, modo comercial — para 403 por modo
    const tokenPersonalOtro = TOKEN_USUARIO_2();    // USUARIO_2, modo personal — para 403 por no-dueño

    console.log('═════════════════════════════════════════════════════════════');
    console.log(' TOKENS LISTOS — copia y pega los 3 exports en tu terminal');
    console.log('═════════════════════════════════════════════════════════════');
    console.log('');
    console.log('export API="http://localhost:4000/api"');
    console.log(`export TOKEN_PERSONAL="${tokenPersonal}"`);
    console.log(`export TOKEN_COMERCIAL="${tokenComercial}"`);
    console.log(`export TOKEN_PERSONAL_OTRO="${tokenPersonalOtro}"`);
    console.log('');
    console.log('Notas:');
    console.log(' - TOKEN_PERSONAL      → usuario dueño, modo personal');
    console.log(' - TOKEN_COMERCIAL     → mismo usuario en modo comercial (probar 403)');
    console.log(' - TOKEN_PERSONAL_OTRO → otro usuario, modo personal (probar 403 no-dueño)');
    console.log(' - Tokens válidos por 1 hora.');
    console.log('');

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
