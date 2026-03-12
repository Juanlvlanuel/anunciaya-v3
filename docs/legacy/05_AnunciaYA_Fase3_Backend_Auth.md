# 🔐 AnunciaYA v3.0 - Fase 3: Backend Core y Autenticación

**Estado:** ✅ 100% Completado  
**Fecha de Finalización:** Diciembre 2024

---

## 1. Objetivo de la Fase

Implementar el backend completo con:
- Estructura de Express + TypeScript
- Sistema de autenticación robusto (17 endpoints)
- JWT con dual tokens (access + refresh)
- Google OAuth
- Autenticación de dos factores (2FA)
- Sistema de sesiones multi-dispositivo
- Middleware de autorización
- Envío de emails transaccionales

---

## 2. Estructura de Archivos

```
apps/api/src/
├── config/
│   └── env.ts                 # Validación de variables con Zod
├── controllers/
│   ├── auth.controller.ts     # Controladores de autenticación
│   └── pagos.controller.ts    # Controladores de Stripe
├── db/
│   ├── index.ts               # Conexión PostgreSQL (Drizzle)
│   ├── mongo.ts               # Conexión MongoDB (Mongoose)
│   ├── redis.ts               # Conexión Redis (ioredis)
│   ├── schemas/
│   │   └── schema.ts          # Tablas Drizzle
│   └── models/
│       ├── Chat.ts
│       ├── Mensaje.ts
│       ├── Contacto.ts
│       └── Interaccion.ts
├── middleware/
│   ├── auth.ts                # verificarToken, verificarPerfil
│   └── cors.ts                # Configuración CORS
├── routes/
│   ├── auth.routes.ts         # Rutas de autenticación
│   └── pagos.routes.ts        # Rutas de Stripe
├── services/
│   └── auth.service.ts        # Lógica de negocio auth
├── utils/
│   ├── email.ts               # Envío de emails
│   ├── jwt.ts                 # Generación/verificación tokens
│   └── tokenStore.ts          # Funciones Redis
├── validations/
│   └── auth.schema.ts         # Schemas Zod
└── index.ts                   # Entry point Express
```

---

## 3. Endpoints de Autenticación (17)

### 3.1 Registro y Verificación

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 1 | POST | `/api/auth/registro` | No | Registrar cuenta (guarda en Redis) |
| 2 | POST | `/api/auth/verificar-email` | No | Verificar código 6 dígitos |
| 3 | POST | `/api/auth/reenviar-codigo` | No | Reenviar código de verificación |

### 3.2 Login y Sesiones

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 4 | POST | `/api/auth/login` | No | Login tradicional |
| 5 | POST | `/api/auth/refresh` | No | Renovar access token |
| 6 | POST | `/api/auth/logout` | Sí | Cerrar sesión actual |
| 7 | POST | `/api/auth/logout-todos` | Sí | Cerrar todas las sesiones |
| 8 | GET | `/api/auth/yo` | Sí | Obtener usuario actual |
| 9 | GET | `/api/auth/sesiones` | Sí | Listar sesiones activas |

### 3.3 Recuperación de Contraseña

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 10 | POST | `/api/auth/olvide-contrasena` | No | Solicitar código reset |
| 11 | POST | `/api/auth/restablecer-contrasena` | No | Cambiar con código |
| 12 | PATCH | `/api/auth/cambiar-contrasena` | Sí | Cambiar estando logueado |

### 3.4 Google OAuth

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 13 | POST | `/api/auth/google` | No | Login/Registro con Google |

### 3.5 Two-Factor Authentication (2FA)

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 14 | POST | `/api/auth/2fa/generar` | Sí | Generar QR y secreto |
| 15 | POST | `/api/auth/2fa/activar` | Sí | Activar 2FA |
| 16 | POST | `/api/auth/2fa/verificar` | Token temp | Verificar código TOTP |
| 17 | DELETE | `/api/auth/2fa/desactivar` | Sí | Desactivar 2FA |

---

## 4. Sistema de Tokens JWT

### 4.1 Configuración

```typescript
// Access Token
{
  duracion: '15 minutos',
  almacenamiento: 'Memory (Zustand)',
  contenido: {
    usuarioId: string,
    correo: string,
    perfil: 'personal' | 'comercial',
    membresia: number
  }
}

// Refresh Token
{
  duracion: '7 días',
  almacenamiento: 'localStorage',
  contenido: {
    usuarioId: string,
    sessionId: string
  }
}
```

### 4.2 Flujo de Renovación

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE RENOVACIÓN                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Request con access token expirado                       │
│     ↓                                                       │
│  2. Interceptor detecta 401                                 │
│     ↓                                                       │
│  3. POST /api/auth/refresh con refreshToken                 │
│     ↓                                                       │
│  4. Backend verifica refresh en Redis                       │
│     ↓                                                       │
│  5. Genera nuevo par de tokens                              │
│     ↓                                                       │
│  6. Retorna { accessToken, refreshToken }                   │
│     ↓                                                       │
│  7. Frontend guarda nuevos tokens                           │
│     ↓                                                       │
│  8. Reintenta request original                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Implementación (utils/jwt.ts)

```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface PayloadToken {
  usuarioId: string;
  correo: string;
  perfil: string;
  membresia: number;
}

export function generarTokens(payload: PayloadToken) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN, // 15m
  });

  const refreshToken = jwt.sign(
    { usuarioId: payload.usuarioId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } // 7d
  );

  return { accessToken, refreshToken };
}

export function verificarAccessToken(token: string): PayloadToken | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as PayloadToken;
  } catch {
    return null;
  }
}

export function verificarRefreshToken(token: string): { usuarioId: string } | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as { usuarioId: string };
  } catch {
    return null;
  }
}
```

---

## 5. Middleware de Autenticación

### 5.1 verificarToken

```typescript
// middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { verificarAccessToken } from '../utils/jwt.js';
import { verificarSesion } from '../utils/tokenStore.js';

export async function verificarToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Obtener token del header
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      exito: false,
      mensaje: 'Token no proporcionado',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verificar JWT
  const payload = verificarAccessToken(token);
  
  if (!payload) {
    res.status(401).json({
      exito: false,
      mensaje: 'Token inválido o expirado',
    });
    return;
  }

  // Agregar usuario al request
  req.usuario = payload;
  next();
}
```

### 5.2 verificarPerfil

```typescript
export function verificarPerfil(...perfilesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        exito: false,
        mensaje: 'No autenticado',
      });
      return;
    }

    if (!perfilesPermitidos.includes(req.usuario.perfil)) {
      res.status(403).json({
        exito: false,
        mensaje: 'No tienes permiso para acceder a este recurso',
      });
      return;
    }

    next();
  };
}
```

### 5.3 verificarMembresia

```typescript
export function verificarMembresia(membresiaMinima: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        exito: false,
        mensaje: 'No autenticado',
      });
      return;
    }

    if (req.usuario.membresia < membresiaMinima) {
      res.status(403).json({
        exito: false,
        mensaje: 'Tu plan no incluye esta función',
      });
      return;
    }

    next();
  };
}
```

---

## 6. Flujos de Autenticación

### 6.1 Registro Normal

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE REGISTRO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario envía datos de registro                         │
│     { nombre, apellidos, correo, contrasena, perfil }       │
│     ↓                                                       │
│  2. Validar con Zod                                         │
│     ↓                                                       │
│  3. Verificar que correo no exista en PostgreSQL            │
│     ↓                                                       │
│  4. Hashear contraseña (bcrypt, SALT_ROUNDS=12)             │
│     ↓                                                       │
│  5. Generar código 6 dígitos                                │
│     ↓                                                       │
│  6. Guardar en Redis (TTL 15 min):                          │
│     Key: registro_pendiente:{correo}                        │
│     Value: { codigo, intentos, datosUsuario }               │
│     ↓                                                       │
│  7. Enviar email con código                                 │
│     ↓                                                       │
│  8. Responder: "Revisa tu correo"                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Verificación de Email

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE VERIFICACIÓN                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario envía { correo, codigo }                        │
│     ↓                                                       │
│  2. Buscar en Redis registro_pendiente:{correo}             │
│     ↓                                                       │
│  3. Comparar código                                         │
│     ↓                                                       │
│  4. Si correcto:                                            │
│     - Crear usuario en PostgreSQL                           │
│     - correoVerificado = true                               │
│     - Eliminar de Redis                                     │
│     - Responder éxito                                       │
│     ↓                                                       │
│  5. Si incorrecto:                                          │
│     - Incrementar intentos                                  │
│     - Si intentos >= 3: eliminar y rechazar                 │
│     - Si no: responder "código incorrecto"                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Login Normal

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUJO DE LOGIN                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario envía { correo, contrasena }                    │
│     ↓                                                       │
│  2. Buscar usuario en PostgreSQL                            │
│     ↓                                                       │
│  3. Verificar contraseña (bcrypt.compare)                   │
│     ↓                                                       │
│  4. Verificar que correo esté verificado                    │
│     ↓                                                       │
│  5. ¿Tiene 2FA activo?                                      │
│     ├─ SÍ → Generar tokenTemporal (UUID)                    │
│     │       Guardar en Redis (TTL 5 min)                    │
│     │       Responder: { requiere2FA: true, tokenTemporal } │
│     │                                                       │
│     └─ NO → Generar tokens JWT                              │
│             Guardar sesión en Redis                         │
│             Responder: { usuario, accessToken, refreshToken }│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Google OAuth

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO GOOGLE OAUTH                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend:                                                  │
│  1. Usuario hace clic en "Continuar con Google"             │
│  2. @react-oauth/google muestra popup                       │
│  3. Usuario selecciona cuenta Google                        │
│  4. Google devuelve idToken al frontend                     │
│  5. Frontend envía POST /api/auth/google { idToken }        │
│                                                             │
│  Backend:                                                   │
│  1. Recibe idToken                                          │
│  2. Verifica con Google (OAuth2Client.verifyIdToken)        │
│  3. Extrae: email, nombre, foto                             │
│     ↓                                                       │
│  4. ¿Usuario existe con ese email?                          │
│     ├─ SÍ existe:                                           │
│     │   ├─ ¿Tiene 2FA? → tokenTemporal                      │
│     │   └─ ¿No tiene 2FA? → JWT directo                     │
│     │                                                       │
│     └─ NO existe:                                           │
│         - Crear usuario auto-verificado                     │
│         - autenticadoPorGoogle = true                       │
│         - contrasenaHash = null                             │
│         - Generar JWT                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Two-Factor Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                      CONFIGURAR 2FA                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. POST /api/auth/2fa/generar                              │
│     - Genera secreto TOTP (authenticator.generateSecret)    │
│     - Guarda secreto en BD (no confirmado)                  │
│     - Genera QR code (base64)                               │
│     - Responde: { qrCode, secreto }                         │
│                                                             │
│  2. Usuario escanea QR en Google Authenticator              │
│                                                             │
│  3. POST /api/auth/2fa/activar { codigo }                   │
│     - Verifica código TOTP                                  │
│     - Genera 10 códigos de respaldo (8 chars)               │
│     - Hashea códigos con bcrypt                             │
│     - Guarda en usuario_codigos_respaldo                    │
│     - Marca dobleFactorConfirmado = true                    │
│     - Responde: { codigosRespaldo: [...] }                  │
│       (ÚNICA VEZ que se muestran)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LOGIN CON 2FA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Login normal detecta 2FA activo                         │
│     - Genera tokenTemporal (UUID)                           │
│     - Guarda en Redis (TTL 5 min)                           │
│     - Responde: { requiere2FA: true, tokenTemporal }        │
│                                                             │
│  2. Frontend muestra input para código TOTP                 │
│                                                             │
│  3. POST /api/auth/2fa/verificar { codigo, tokenTemporal }  │
│     - Verifica tokenTemporal en Redis                       │
│     - Verifica código TOTP                                  │
│     - Si TOTP falla, intenta con códigos de respaldo        │
│     - Si código respaldo: marca como usado                  │
│     - Elimina tokenTemporal de Redis                        │
│     - Genera JWT completo                                   │
│     - Responde: { usuario, accessToken, refreshToken }      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Sesiones Multi-Dispositivo

### 7.1 Estructura en Redis

```
Key: session:{userId}:{sessionId}
Value: JSON {
  refreshToken: string,
  ip: string | null,
  userAgent: string | null,
  createdAt: ISO string,
  lastUsed: ISO string
}
TTL: 7 días
```

### 7.2 Funciones de Token Store

```typescript
// utils/tokenStore.ts

// Guardar sesión
export async function guardarSesion(
  usuarioId: string,
  refreshToken: string,
  ip: string | null,
  userAgent: string | null
): Promise<void> {
  const sessionId = crypto.randomUUID();
  const key = `session:${usuarioId}:${sessionId}`;
  
  await redis.set(key, JSON.stringify({
    refreshToken,
    ip,
    userAgent,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  }), 'EX', 7 * 24 * 60 * 60); // 7 días
}

// Obtener sesiones activas
export async function obtenerSesionesActivas(
  usuarioId: string
): Promise<Array<{ ip, userAgent, createdAt, esActual }>> {
  const pattern = `session:${usuarioId}:*`;
  const keys = await redis.keys(pattern);
  
  const sesiones = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      sesiones.push(JSON.parse(data));
    }
  }
  
  return sesiones;
}

// Cerrar todas las sesiones
export async function eliminarTodasLasSesiones(
  usuarioId: string
): Promise<void> {
  const pattern = `session:${usuarioId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 8. Envío de Emails

### 8.1 Configuración (utils/email.ts)

```typescript
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function enviarCodigoVerificacion(
  correo: string,
  nombre: string,
  codigo: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: correo,
      subject: '🔐 Código de verificación - AnunciaYA',
      html: `
        <h1>¡Hola ${nombre}!</h1>
        <p>Tu código de verificación es:</p>
        <h2 style="font-size: 32px; letter-spacing: 5px;">${codigo}</h2>
        <p>Este código expira en 15 minutos.</p>
        <p>Si no solicitaste esto, ignora este correo.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
}
```

### 8.2 Tipos de Email

| Tipo | Trigger | TTL |
|------|---------|-----|
| Verificación de registro | POST /auth/registro | 15 min |
| Reenvío de código | POST /auth/reenviar-codigo | 15 min |
| Recuperación de contraseña | POST /auth/olvide-contrasena | 15 min |

---

## 9. Validaciones con Zod

### 9.1 Schema de Registro

```typescript
// validations/auth.schema.ts
import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo'),
  apellidos: z.string()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos son muy largos'),
  correo: z.string()
    .email('Correo electrónico inválido')
    .toLowerCase(),
  contrasena: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  perfil: z.enum(['personal', 'comercial']).default('personal'),
  telefono: z.string().optional(),
  googleIdToken: z.string().optional(),
  avatar: z.string().url().optional(),
});

export type RegistroInput = z.infer<typeof registroSchema>;
```

### 9.2 Schema de Login

```typescript
export const loginSchema = z.object({
  correo: z.string().email().toLowerCase(),
  contrasena: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### 9.3 Helper para formatear errores

```typescript
export function formatearErroresZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    if (err.path.length > 0) {
      errores[err.path[0].toString()] = err.message;
    }
  });
  
  return errores;
}
```

---

## 10. Configuración de Variables (config/env.ts)

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

---

## 11. Rutas (routes/auth.routes.ts)

```typescript
import { Router } from 'express';
import { verificarToken } from '../middleware/auth.js';
import {
  registro,
  verificarEmailController,
  reenviarVerificacion,
  login,
  refresh,
  logout,
  logoutTodos,
  yo,
  sesiones,
  olvideContrasena,
  restablecerContrasena,
  cambiarContrasena,
  googleAuth,
  generar2faController,
  activar2faController,
  verificar2faController,
  desactivar2faController,
} from '../controllers/auth.controller.js';

const router = Router();

// Públicos
router.post('/registro', registro);
router.post('/verificar-email', verificarEmailController);
router.post('/reenviar-codigo', reenviarVerificacion);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/google', googleAuth);

// Recuperación de contraseña
router.post('/olvide-contrasena', olvideContrasena);
router.post('/restablecer-contrasena', restablecerContrasena);

// 2FA (token temporal)
router.post('/2fa/verificar', verificar2faController);

// Protegidos (requieren JWT)
router.use(verificarToken);

router.post('/logout', logout);
router.post('/logout-todos', logoutTodos);
router.get('/yo', yo);
router.get('/sesiones', sesiones);
router.patch('/cambiar-contrasena', cambiarContrasena);

// 2FA (requieren JWT)
router.post('/2fa/generar', generar2faController);
router.post('/2fa/activar', activar2faController);
router.delete('/2fa/desactivar', desactivar2faController);

export default router;
```

---

## 12. Entry Point (index.ts)

```typescript
import express from 'express';
import { configurarCors } from './middleware/cors.js';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import pagosRoutes from './routes/pagos.routes.js';
import { env } from './config/env.js';

const app = express();

// Middleware globales
app.use(helmet());
app.use(configurarCors);
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/pagos', pagosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ exito: true, mensaje: '🚀 AnunciaYA API v3.0' });
});

// Iniciar servidor
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
});
```

---

## 13. Verificación de Fase Completada

### Checklist ✅

- [x] Express + TypeScript configurado
- [x] Estructura de carpetas organizada
- [x] 17 endpoints de autenticación activos
- [x] JWT dual tokens funcionando
- [x] Sesiones multi-dispositivo en Redis
- [x] Google OAuth implementado
- [x] 2FA con TOTP implementado
- [x] Códigos de respaldo hasheados
- [x] Middleware verificarToken
- [x] Middleware verificarPerfil
- [x] Middleware verificarMembresia
- [x] Validaciones Zod completas
- [x] Envío de emails (Zoho SMTP)
- [x] Rate limiting configurado
- [x] CORS configurado
- [x] Variables de entorno validadas

---

*Fase 3 completada: Diciembre 2024*
