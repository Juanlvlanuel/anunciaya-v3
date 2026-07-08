/**
 * sentry.ts
 * =========
 * Inicialización de Sentry (error tracking) para el backend.
 *
 * Se importa como PRIMERA línea de `index.ts` (antes que Express y las rutas)
 * para que `Sentry.init()` corra lo más temprano posible. La inicialización es
 * un EFECTO al importar este módulo.
 *
 * Solo se activa en producción y con `SENTRY_DSN` presente. En desarrollo queda
 * completamente inerte: nunca se llama a `init`, así que Sentry no captura ni
 * envía nada.
 *
 * Ubicación: apps/api/src/sentry.ts
 */

// Carga el .env por su cuenta: este módulo se evalúa ANTES del `dotenv.config()`
// de index.ts (los imports se ejecutan antes que el cuerpo del módulo). En Render
// las variables ya vienen del entorno y dotenv no las pisa.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const esProduccion = process.env.NODE_ENV === 'production';
const dsn = process.env.SENTRY_DSN;

// ============================================================================
// Scrubbing de datos sensibles (PII / secretos) antes de enviar a Sentry
// ============================================================================
// Nunca queremos que salgan tokens JWT, contraseñas, headers de auth ni datos
// de tarjeta. Redactamos por NOMBRE de clave (a cualquier profundidad).
const CLAVES_SENSIBLES = [
  'password',
  'contrasena', // "contraseña" sin tilde tras normalizar
  'pass',
  'pwd',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'card',
  'tarjeta',
  'cvv',
  'cvc',
  'apikey',
];

function esClaveSensible(clave: string): boolean {
  const normalizada = clave.toLowerCase().replace(/[_\-\s]/g, '');
  return CLAVES_SENSIBLES.some((sensible) => normalizada.includes(sensible));
}

/** Devuelve una copia del valor con las claves sensibles reemplazadas por "[Filtrado]". */
function redactarSecretos(valor: unknown, profundidad = 0): unknown {
  if (valor === null || typeof valor !== 'object' || profundidad > 6) return valor;
  if (Array.isArray(valor)) return valor.map((item) => redactarSecretos(item, profundidad + 1));

  const salida: Record<string, unknown> = {};
  for (const [clave, item] of Object.entries(valor as Record<string, unknown>)) {
    salida[clave] = esClaveSensible(clave) ? '[Filtrado]' : redactarSecretos(item, profundidad + 1);
  }
  return salida;
}

if (esProduccion && dsn) {
  Sentry.init({
    dsn,
    environment: 'production',
    // Render expone el commit del deploy; sirve de `release` para agrupar por versión.
    release: process.env.RENDER_GIT_COMMIT || undefined,
    // Solo error tracking (sin performance/APM): mantiene el consumo dentro del plan gratis.
    tracesSampleRate: 0,
    // No enviar IP, cookies ni PII por defecto.
    sendDefaultPii: false,
    beforeSend(evento) {
      const peticion = evento.request;
      if (peticion) {
        if (peticion.headers) {
          peticion.headers = redactarSecretos(peticion.headers) as Record<string, string>;
        }
        if (peticion.cookies) {
          peticion.cookies = { filtrado: '[Filtrado]' };
        }
        if (peticion.data !== undefined) {
          peticion.data = redactarSecretos(peticion.data);
        }
      }
      return evento;
    },
  });
  console.log('🛡️  Sentry inicializado (backend · producción)');
}
