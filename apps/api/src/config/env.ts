import { config } from 'dotenv';
import { z } from 'zod';

// Cargar variables del archivo .env
config();

const isProduction = process.env.NODE_ENV === 'production';

// ====================================
// Esquema de validación con Zod
// ====================================
const esquemaEnv = z.object({
  // -------- Ambiente --------
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('4000').transform(Number),

  // -------- PostgreSQL --------
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  
  // Solo requerida en desarrollo (para referencia local vs producción)
  DATABASE_URL_PRODUCTION: isProduction 
    ? z.string().optional() 
    : z.string().min(1, 'DATABASE_URL_PRODUCTION es requerida'),
  
  DB_ENVIRONMENT: z.enum(['local', 'production']).default(isProduction ? 'production' : 'local'),

  // -------- Redis --------
  REDIS_URL: z.string().min(1, 'REDIS_URL es requerida'),

  // -------- Frontend (CORS) --------
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),

  // URL del Panel Admin (apps/admin). La usa el enlace de activación del correo del EQUIPO.
  // Opcional: mientras el Panel no esté desplegado, el correo de equipo cae a FRONTEND_URL
  // (ver email.ts). En dev arranca en el puerto local del Panel. Al desplegarlo en Vercel,
  // poner aquí su dominio propio (proyecto distinto al de la web).
  PANEL_URL: isProduction
    ? z.string().url('PANEL_URL debe ser una URL válida').optional()
    : z.string().url().default('http://localhost:3100'),

  // -------- JWT --------
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener mínimo 32 caracteres'),
  JWT_ACCESS_EXPIRES: z.string().default('1h'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // -------- Email (SMTP - DEPRECADO, ahora se usa AWS SES) --------
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('465').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // -------- AWS SES (sistema actual de emails) --------
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID es requerido'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY es requerido'),
  AWS_REGION: z.string().default('us-east-2'),
  AWS_SES_FROM_EMAIL: z.string().email('AWS_SES_FROM_EMAIL debe ser un email válido'),

  // -------- Google OAuth --------
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID es requerido'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET es requerido'),

  // -------- Stripe --------
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY es requerida'),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'STRIPE_PUBLISHABLE_KEY es requerida'),
  STRIPE_PRICE_COMERCIAL: z.string().min(1, 'STRIPE_PRICE_COMERCIAL es requerida'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET es requerida'),

  // -------- Cloudflare R2 --------
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID es requerido'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY es requerida'),
  R2_ENDPOINT: z.string().url('R2_ENDPOINT debe ser una URL válida'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME es requerido'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL debe ser una URL válida'),

  // -------- Assets de marca (logo en correos) --------
  // Dominio que sirve los assets de marca (logo) incrustados en los correos.
  // SEPARADA de R2_PUBLIC_URL a propósito: el endpoint pub-…r2.dev de
  // desarrollo sufre rate-limit (429) y los proxies de Gmail/Yahoo muestran el
  // logo roto. El logo se publica en el frontend (apps/web/public/brand/) y se
  // sirve desde el dominio propio de Vercel, que no tiene ese límite.
  // ⚠️ NO consolidar con R2_PUBLIC_URL: esa la usa el reconcile de
  // mantenimiento (imageRegistry.ts) para reconocer las URLs ya guardadas en
  // la BD; cambiarla trataría esos archivos como huérfanos. El default apunta
  // al dominio de Vercel que sirve los assets de marca, así que dev y cualquier
  // entorno nuevo sirven el logo sin configurar la variable.
  BRAND_ASSETS_URL: z
    .string()
    .url('BRAND_ASSETS_URL debe ser una URL válida')
    .default('https://anunciaya-v3-app.vercel.app'),

  // -------- Admin (protección temporal hasta que haya panel de admins) --------
  // Secreto compartido que el cliente (Postman, cURL, futuro panel admin) debe
  // enviar en el header `x-admin-secret` para acceder a endpoints de mantenimiento.
  // En producción DEBE ser un string largo y aleatorio. Cuando se cree el Panel
  // Admin con roles reales, este middleware se reemplaza por auth de admin.
  ADMIN_SECRET: z.string().min(16, 'ADMIN_SECRET debe tener mínimo 16 caracteres').optional(),

  // -------- Gemini (Coyo — asistente del Home) --------
  // API key del LLM que usa Coyo para interpretar lenguaje natural y enriquecer
  // resultados del buscador unificado. OPCIONAL: si falta, el server arranca
  // igual y los endpoints de Coyo que dependan del LLM deberán manejarlo
  // (fallback o respuesta de error). Las búsquedas estructuradas siguen
  // funcionando sin esta clave.
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY no puede estar vacía').optional(),

  // -------- Sentry (error tracking) --------
  // DSN del proyecto de Sentry para el backend. OPCIONAL: si falta, o si
  // NODE_ENV no es 'production', Sentry queda inerte (ver apps/api/src/sentry.ts).
  // Se declara aquí solo para documentarlo y validar su formato; sentry.ts lo lee
  // directo de process.env para no depender del orden de imports.
  SENTRY_DSN: z.string().url('SENTRY_DSN debe ser una URL válida').optional(),
});

// ====================================
// Validar y exportar
// ====================================
const resultadoValidacion = esquemaEnv.safeParse(process.env);

if (!resultadoValidacion.success) {
  console.error('❌ Error en variables de entorno:');
  console.error(resultadoValidacion.error.format());
  process.exit(1);
}

export const env = resultadoValidacion.data;

// ====================================
// Helper para obtener DATABASE_URL según ambiente
// ====================================
export const getDatabaseUrl = (): string => {
  // En producción siempre usa DATABASE_URL
  // En desarrollo usa DATABASE_URL_PRODUCTION si DB_ENVIRONMENT === 'production'
  if (isProduction) {
    return env.DATABASE_URL;
  }
  return env.DB_ENVIRONMENT === 'production' 
    ? (env.DATABASE_URL_PRODUCTION || env.DATABASE_URL)
    : env.DATABASE_URL;
};

export type Env = z.infer<typeof esquemaEnv>;