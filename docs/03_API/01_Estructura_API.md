# 🔧 AnunciaYA v3.0 - Estructura de la API

**Última Actualización:** Diciembre 2025  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Estructura de Carpetas](#1-estructura-de-carpetas)
2. [Entry Point y Servidor](#2-entry-point-y-servidor)
3. [Configuración de Express](#3-configuración-de-express)
4. [Sistema de Rutas](#4-sistema-de-rutas)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Scripts Disponibles](#6-scripts-disponibles)

---

## 1. Estructura de Carpetas

```
apps/api/src/
├── config/                    # Configuración de servicios externos
│   ├── cloudinary.ts          # Configuración de Cloudinary (imágenes)
│   ├── env.ts                 # Validación de variables de entorno (Zod)
│   └── stripe.ts              # Configuración de Stripe (pagos)
│
├── controllers/               # Controladores (reciben HTTP, validan, responden)
│   ├── auth.controller.ts     # Autenticación (registro, login, 2FA, etc.)
│   ├── categorias.controller.ts
│   ├── cloudinary.controller.ts
│   ├── negocios.controller.ts
│   ├── onboarding.controller.ts
│   └── pago.controller.ts
│
├── db/                        # Capa de datos
│   ├── models/                # Modelos MongoDB (Mongoose)
│   │   ├── Chat.ts
│   │   ├── Contacto.ts
│   │   ├── Interaccion.ts
│   │   ├── Mensaje.ts
│   │   └── PhoneOtp.ts
│   ├── schemas/               # Esquemas PostgreSQL (Drizzle ORM)
│   │   ├── schema.ts          # Definición de tablas (~60 tablas)
│   │   └── relations.ts       # Relaciones entre tablas
│   ├── index.ts               # Conexión PostgreSQL (Drizzle)
│   ├── mongo.ts               # Conexión MongoDB
│   └── redis.ts               # Conexión Redis
│
├── middleware/                # Middlewares de Express
│   ├── auth.ts                # Verificación JWT
│   ├── cors.ts                # Configuración CORS
│   ├── errorHandler.ts        # Manejo global de errores
│   ├── helmet.ts              # Headers de seguridad
│   ├── index.ts               # Re-exportación de middlewares
│   ├── negocio.middleware.ts  # Verificar propiedad de negocio
│   ├── rateLimiter.ts         # Límites de peticiones
│   └── validarModo.ts         # Validar modo Personal/Comercial
│
├── routes/                    # Definición de rutas HTTP
│   ├── auth.routes.ts         # /api/auth/*
│   ├── categorias.routes.ts   # /api/categorias/*
│   ├── cloudinary.routes.ts   # /api/cloudinary/*
│   ├── index.ts               # Router principal
│   ├── negocios.routes.ts     # /api/negocios/*
│   ├── onboarding.routes.ts   # /api/onboarding/*
│   └── pago.routes.ts         # /api/pagos/*
│
├── services/                  # Lógica de negocio
│   ├── auth.service.ts        # Lógica de autenticación
│   ├── categorias.service.ts
│   ├── cloudinary.service.ts
│   ├── negocios.service.ts
│   ├── onboarding.service.ts
│   └── pago.service.ts
│
├── utils/                     # Utilidades
│   ├── email.ts               # Envío de emails (Zoho SMTP)
│   ├── jwt.ts                 # Generación/verificación JWT
│   └── tokenStore.ts          # Gestión de sesiones en Redis
│
├── validations/               # Esquemas de validación (Zod)
│   ├── auth.schema.ts         # Validaciones de auth
│   └── onboarding.schema.ts   # Validaciones de onboarding
│
├── app.ts                     # Configuración de Express
└── index.ts                   # Entry point (inicia servidor)
```

---

## 2. Entry Point y Servidor

### Archivo: `src/index.ts`

```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectMongo } from './db/mongo';

const PORT = process.env.API_PORT || 4000;
const HOST = process.env.API_HOST || '0.0.0.0';

const iniciarServidor = async () => {
  try {
    // Conectar a MongoDB
    await connectMongo();

    // Iniciar servidor
    app.listen(Number(PORT), HOST, () => {
      console.log('🚀 AnunciaYA API v3.0.0');
      console.log(`📡 Servidor: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();
```

**Flujo de inicio:**
1. Carga variables de entorno (`.env`)
2. Conecta a MongoDB
3. Inicia servidor Express en todas las interfaces (`0.0.0.0`)

---

## 3. Configuración de Express

### Archivo: `src/app.ts`

```typescript
import express, { type Express } from 'express';
import {
  configurarCors,
  configurarHelmet,
  limitadorGeneral,
  manejadorErrores,
  rutaNoEncontrada,
} from './middleware';
import routes from './routes';

const app: Express = express();

// 1. Middleware de seguridad
app.use(configurarHelmet);  // Headers de seguridad
app.use(configurarCors);    // CORS
app.use(limitadorGeneral);  // Rate limiting

// 2. Parser JSON (excepto webhook de Stripe)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/pagos/webhook') {
    next(); // Stripe necesita raw body
  } else {
    express.json()(req, res, next);
  }
});

// 3. Rutas
app.use('/api', routes);

// 4. 404 y errores
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

export default app;
```

### Orden de Middlewares

| Orden | Middleware | Propósito |
|-------|------------|-----------|
| 1 | `configurarHelmet` | Headers de seguridad (CSP, XSS, etc.) |
| 2 | `configurarCors` | Control de orígenes permitidos |
| 3 | `limitadorGeneral` | 100 req/15min (prod), 1000 (dev) |
| 4 | `express.json()` | Parser de body JSON |
| 5 | `routes` | Rutas de la API |
| 6 | `rutaNoEncontrada` | Respuesta 404 |
| 7 | `manejadorErrores` | Captura errores globales |

---

## 4. Sistema de Rutas

### Router Principal: `src/routes/index.ts`

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import pagoRoutes from './pago.routes';
import categoriasRoutes from './categorias.routes';
import onboardingRoutes from './onboarding.routes';
import cloudinaryRoutes from './cloudinary.routes';
import negociosRoutes from './negocios.routes';

const router: Router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: '🚀 AnunciaYA API v3.0.0 funcionando',
    timestamp: new Date().toISOString(),
  });
});

// Montar rutas
router.use('/auth', authRoutes);
router.use('/pagos', pagoRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/cloudinary', cloudinaryRoutes);
router.use('/negocios', negociosRoutes);

export default router;
```

### Mapa de Rutas

| Prefijo | Archivo | Descripción |
|---------|---------|-------------|
| `/api/health` | `index.ts` | Health check del servidor |
| `/api/auth` | `auth.routes.ts` | Autenticación completa |
| `/api/pagos` | `pago.routes.ts` | Stripe checkout y webhooks |
| `/api/categorias` | `categorias.routes.ts` | Catálogo de categorías |
| `/api/onboarding` | `onboarding.routes.ts` | Configuración de negocios |
| `/api/cloudinary` | `cloudinary.routes.ts` | Gestión de imágenes |
| `/api/negocios` | `negocios.routes.ts` | Info de negocios |

---

## 5. Variables de Entorno

### Archivo: `src/config/env.ts`

Todas las variables se validan con **Zod** al iniciar. Si falta alguna, la app NO inicia.

```typescript
const esquemaEnv = z.object({
  // Ambiente
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('4000').transform(Number),

  // Bases de datos
  DATABASE_URL: z.string().min(1),      // PostgreSQL
  MONGODB_URI: z.string().min(1),       // MongoDB
  REDIS_URL: z.string().min(1),         // Redis

  // Frontend
  FRONTEND_URL: z.string().url(),       // Para CORS

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('1h'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // Email (Zoho SMTP)
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().default('465').transform(Number),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_COMERCIAL: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});
```

### Archivo `.env` de ejemplo

```env
# Ambiente
NODE_ENV=development
API_PORT=4000
API_HOST=0.0.0.0

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/anunciaya

# MongoDB
MONGODB_URI=mongodb://localhost:27017/anunciaya

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:3000

# JWT (mínimo 32 caracteres)
JWT_SECRET=tu_secreto_super_seguro_de_32_chars_minimo
JWT_REFRESH_SECRET=otro_secreto_super_seguro_de_32_chars
JWT_ACCESS_EXPIRES=1h
JWT_REFRESH_EXPIRES=7d

# Email (Zoho)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=noreply@tudominio.com
SMTP_PASS=tu_password
EMAIL_FROM=AnunciaYA <noreply@tudominio.com>

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_COMERCIAL=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 6. Scripts Disponibles

### En `apps/api/package.json`

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Desarrollo con hot reload |
| `build` | `tsc` | Compilar TypeScript |
| `start` | `node dist/index.js` | Producción |
| `db:generate` | `drizzle-kit generate` | Generar migraciones |
| `db:push` | `drizzle-kit push` | Aplicar esquema a BD |
| `db:studio` | `drizzle-kit studio` | UI para explorar BD |

### Comandos de desarrollo

```bash
# Iniciar en desarrollo
pnpm dev

# Generar migración después de cambiar schema.ts
pnpm db:generate

# Aplicar cambios a PostgreSQL
pnpm db:push

# Abrir Drizzle Studio (UI de BD)
pnpm db:studio
```

---

## 📌 Notas Importantes

1. **Monorepo con pnpm workspaces** - La API está en `apps/api/`
2. **TypeScript estricto** - Configuración en `tsconfig.json`
3. **Drizzle ORM** - Para PostgreSQL (type-safe)
4. **Mongoose** - Para MongoDB (chat, mensajes)
5. **Redis** - Para sesiones, tokens temporales, rate limiting
