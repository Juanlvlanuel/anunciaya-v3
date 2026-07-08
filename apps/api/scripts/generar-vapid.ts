/**
 * generar-vapid.ts
 * =================
 * Genera UNA sola vez el par de claves VAPID para Web Push y las imprime.
 *
 * Uso:
 *   pnpm --filter @anunciaya/api generar-vapid
 *
 * Las claves NO se guardan en el repo. Cópialas a las variables de entorno:
 *   - Backend (Render):  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 *   - Frontend (Vercel): VITE_VAPID_PUBLIC_KEY  (= VAPID_PUBLIC_KEY, misma clave)
 *
 * La clave PRIVADA es secreta (solo backend). La PÚBLICA se comparte con el
 * navegador para suscribirse. Ambos lados deben usar EL MISMO par: si cambian,
 * todas las suscripciones existentes dejan de recibir push (hay que re-suscribir).
 *
 * Ubicación: apps/api/scripts/generar-vapid.ts
 */

import webpush from 'web-push';

const claves = webpush.generateVAPIDKeys();

console.log('\n=== Claves VAPID generadas (guárdalas, NO se muestran de nuevo) ===\n');
console.log('Backend (Render):');
console.log(`  VAPID_PUBLIC_KEY=${claves.publicKey}`);
console.log(`  VAPID_PRIVATE_KEY=${claves.privateKey}`);
console.log('\nFrontend (Vercel):');
console.log(`  VITE_VAPID_PUBLIC_KEY=${claves.publicKey}`);
console.log('\n===================================================================\n');
