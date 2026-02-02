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

  // -------- Cloudinary --------
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME es requerido'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY es requerida'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET es requerida'),

  // -------- Cloudflare R2 --------
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID es requerido'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY es requerida'),
  R2_ENDPOINT: z.string().url('R2_ENDPOINT debe ser una URL válida'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME es requerido'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL debe ser una URL válida'),
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