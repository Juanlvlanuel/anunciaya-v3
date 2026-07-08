/**
 * sentry.ts (web)
 * ===============
 * Inicialización de Sentry (error tracking) para el frontend web + ScanYA.
 *
 * ScanYA NO es una app aparte: es el MISMO build servido en s.anunciaya.mx, así
 * que esta init cubre web y ScanYA. Se etiqueta la `superficie` para poder
 * distinguir los errores de cada uno en el panel de Sentry.
 *
 * Solo se activa en producción y con `VITE_SENTRY_DSN` presente. En desarrollo
 * queda completamente inerte (nunca se llama a `init`).
 *
 * El `release` lo inyecta el plugin de Vercel en el build (ver vite.config.ts).
 *
 * Ubicación: apps/web/src/config/sentry.ts
 */
import * as Sentry from '@sentry/react';
import { esHostScanYA } from './scanya';

// ============================================================================
// Scrubbing de datos sensibles (PII / secretos) antes de enviar a Sentry
// ============================================================================
const CLAVES_SENSIBLES = [
  'password',
  'contrasena',
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

function redactarSecretos(valor: unknown, profundidad = 0): unknown {
  if (valor === null || typeof valor !== 'object' || profundidad > 6) return valor;
  if (Array.isArray(valor)) return valor.map((item) => redactarSecretos(item, profundidad + 1));

  const salida: Record<string, unknown> = {};
  for (const [clave, item] of Object.entries(valor as Record<string, unknown>)) {
    salida[clave] = esClaveSensible(clave) ? '[Filtrado]' : redactarSecretos(item, profundidad + 1);
  }
  return salida;
}

export function inicializarSentryWeb(): void {
  const dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN;

  // Solo en producción (build) y con DSN configurado. En dev no hace nada.
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    environment: 'production',
    // Solo error tracking (sin performance/APM): dentro del plan gratis.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(evento) {
      const peticion = evento.request;
      if (peticion) {
        if (peticion.headers) {
          peticion.headers = redactarSecretos(peticion.headers) as Record<string, string>;
        }
        if (peticion.data !== undefined) {
          peticion.data = redactarSecretos(peticion.data);
        }
      }
      return evento;
    },
  });

  // Distingue en el panel los errores de ScanYA (s.anunciaya.mx) de los de la web.
  Sentry.setTag('superficie', esHostScanYA() ? 'scanya' : 'anunciaya');
}
