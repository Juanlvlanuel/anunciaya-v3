import { config } from 'dotenv';
import { z } from 'zod';

// Cargar variables del archivo .env
config();

// ====================================
// Esquema de validación con Zod
// ====================================
// Define qué variables se esperan y de qué tipo deben ser
// Si falta alguna o tiene formato incorrecto, la app NO inicia

const esquemaEnv = z.object({
  // -------- Ambiente --------
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('4000').transform(Number),

  // -------- PostgreSQL --------
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),

  // -------- MongoDB --------
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es requerida'),

  // -------- Redis --------
  REDIS_URL: z.string().min(1, 'REDIS_URL es requerida'),

  // -------- Frontend (CORS) --------
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),

  // -------- JWT --------
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener mínimo 32 caracteres'),
  JWT_ACCESS_EXPIRES: z.string().default('1h'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // -------- Email (Zoho SMTP) --------
  SMTP_HOST: z.string().min(1, 'SMTP_HOST es requerido'),
  SMTP_PORT: z.string().default('465').transform(Number),
  SMTP_USER: z.string().min(1, 'SMTP_USER es requerido'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS es requerido'),
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM es requerido'),

  // -------- Google OAuth --------
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID es requerido'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET es requerido'),

  // -------- Stripe --------
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY es requerida'),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'STRIPE_PUBLISHABLE_KEY es requerida'),
  STRIPE_PRICE_COMERCIAL: z.string().min(1, 'STRIPE_PRICE_COMERCIAL es requerida'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET es requerida'),
});

// ====================================
// Validar y exportar
// ====================================

// Intentar validar las variables de entorno
const resultadoValidacion = esquemaEnv.safeParse(process.env);

// Si hay errores, mostrarlos y detener la aplicación
if (!resultadoValidacion.success) {
  console.error('❌ Error en variables de entorno:');
  console.error(resultadoValidacion.error.format());
  process.exit(1);
}

// Exportar las variables validadas y tipadas
export const env = resultadoValidacion.data;

// ====================================
// Tipos exportados
// ====================================
export type Env = z.infer<typeof esquemaEnv>;