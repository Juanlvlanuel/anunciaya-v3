# 🛡️ AnunciaYA v3.0 - Middlewares

**Última Actualización:** Diciembre 2025  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Visión General](#1-visión-general)
2. [Middleware de Autenticación](#2-middleware-de-autenticación)
3. [Middleware de Autorización](#3-middleware-de-autorización)
4. [Middleware de Modo de Cuenta](#4-middleware-de-modo-de-cuenta)
5. [Middleware de Negocio](#5-middleware-de-negocio)
6. [Middleware de Seguridad](#6-middleware-de-seguridad)
7. [Middleware de Rate Limiting](#7-middleware-de-rate-limiting)
8. [Middleware de Errores](#8-middleware-de-errores)
9. [Orden de Ejecución](#9-orden-de-ejecución)

---

## 1. Visión General

### Ubicación de Archivos

```
apps/api/src/middleware/
├── auth.ts              # Verificación JWT, perfil, membresía
├── cors.ts              # Configuración CORS
├── errorHandler.ts      # Manejo global de errores + 404
├── helmet.ts            # Headers de seguridad
├── index.ts             # Re-exportación centralizada
├── negocio.middleware.ts # Verificar propiedad de negocio
├── rateLimiter.ts       # Límites de peticiones
└── validarModo.ts       # Validar modo Personal/Comercial
```

### Re-exportación Central

**Archivo: `middleware/index.ts`**

```typescript
export { configurarCors } from './cors';
export { configurarHelmet } from './helmet';
export { limitadorGeneral, limitadorLogin } from './rateLimiter';
export { manejadorErrores, rutaNoEncontrada } from './errorHandler';
```

---

## 2. Middleware de Autenticación

### 2.1 Verificar Token JWT

**Archivo:** `middleware/auth.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { verificarAccessToken, type TokenDecodificado } from '../utils/jwt';

// Extender Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: TokenDecodificado;
    }
  }
}

export function verificarToken(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // Obtener header Authorization
  const authHeader = req.headers.authorization;

  // Verificar formato "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
    });
    return;
  }

  // Extraer y verificar token
  const token = authHeader.substring(7);
  const resultado = verificarAccessToken(token);

  if (!resultado.valido || !resultado.payload) {
    res.status(401).json({
      success: false,
      message: resultado.error || 'Token inválido',
    });
    return;
  }

  // Agregar usuario al request
  req.usuario = resultado.payload;
  next();
}
```

### Uso

```typescript
import { verificarToken } from '../middleware/auth';

// Ruta protegida
router.get('/yo', verificarToken, yoController);

// Aplicar a todas las rutas de un router
router.use(verificarToken);
```

### Datos Disponibles en `req.usuario`

```typescript
interface TokenDecodificado {
  usuarioId: string;   // UUID del usuario
  correo: string;      // Email
  perfil: string;      // 'personal' | 'comercial'
  membresia: number;   // 1, 2, 3
  modoActivo: string;  // 'personal' | 'comercial'
  iat: number;         // Timestamp de creación
  exp: number;         // Timestamp de expiración
}
```

---

## 3. Middleware de Autorización

### 3.1 Verificar Perfil

**Archivo:** `middleware/auth.ts`

```typescript
export function verificarPerfil(perfilRequerido: 'personal' | 'comercial') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    if (req.usuario.perfil !== perfilRequerido) {
      res.status(403).json({
        success: false,
        message: `Esta acción requiere perfil ${perfilRequerido}`,
      });
      return;
    }

    next();
  };
}
```

### Uso

```typescript
// Solo usuarios con perfil comercial
router.post(
  '/crear-negocio',
  verificarToken,
  verificarPerfil('comercial'),
  crearNegocioController
);
```

### 3.2 Verificar Membresía

```typescript
export function verificarMembresia(nivelMinimo: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    if (req.usuario.membresia < nivelMinimo) {
      res.status(403).json({
        success: false,
        message: `Esta acción requiere membresía nivel ${nivelMinimo} o superior`,
      });
      return;
    }

    next();
  };
}
```

### Uso

```typescript
// Solo membresía premium (nivel 2+)
router.get(
  '/estadisticas-avanzadas',
  verificarToken,
  verificarMembresia(2),
  estadisticasController
);
```

---

## 4. Middleware de Modo de Cuenta

**Archivo:** `middleware/validarModo.ts`

### 4.1 Requiere Modo Personal

```typescript
export function requiereModoPersonal(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  const modoActual = req.usuario.modoActivo || 'personal';

  if (modoActual !== 'personal') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere estar en modo Personal',
      codigo: 'REQUIERE_MODO_PERSONAL',
      data: {
        modoActual,
        modoRequerido: 'personal',
        sugerencia: 'Cambia a modo Personal para realizar esta acción',
      },
    });
    return;
  }

  next();
}
```

### 4.2 Requiere Modo Comercial

```typescript
export function requiereModoComercial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  const modoActual = req.usuario.modoActivo || 'personal';

  if (modoActual !== 'comercial') {
    res.status(403).json({
      success: false,
      message: 'Esta acción requiere estar en modo Comercial',
      codigo: 'REQUIERE_MODO_COMERCIAL',
      data: {
        modoActual,
        modoRequerido: 'comercial',
        sugerencia: 'Cambia a modo Comercial para acceder a esta función',
      },
    });
    return;
  }

  next();
}
```

### 4.3 Requiere Acceso Comercial

Verifica que el usuario **TENGA** acceso al modo comercial (no que esté en él):

```typescript
export function requiereAccesoComercial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.usuario) {
    res.status(401).json({
      success: false,
      message: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
    });
    return;
  }

  if (req.usuario.perfil !== 'comercial') {
    res.status(403).json({
      success: false,
      message: 'Necesitas una cuenta comercial para acceder a esta función',
      codigo: 'REQUIERE_CUENTA_COMERCIAL',
      data: {
        perfilActual: req.usuario.perfil,
        sugerencia: 'Activa una suscripción comercial para continuar',
      },
    });
    return;
  }

  next();
}
```

### Uso

```typescript
import { 
  requiereModoPersonal, 
  requiereModoComercial,
  requiereAccesoComercial 
} from '../middleware/validarModo';

// Solo en modo personal (ej: canjear puntos)
router.post('/canjear-puntos', verificarToken, requiereModoPersonal, canjearController);

// Solo en modo comercial (ej: gestionar negocio)
router.get('/mi-negocio', verificarToken, requiereModoComercial, miNegocioController);

// Requiere tener cuenta comercial (puede estar en cualquier modo)
router.get('/dashboard', verificarToken, requiereAccesoComercial, dashboardController);
```

### 4.4 Helper: Obtener Modo Actual

```typescript
export function obtenerModoActual(req: Request): 'personal' | 'comercial' {
  return (req.usuario?.modoActivo as 'personal' | 'comercial') || 'personal';
}
```

---

## 5. Middleware de Negocio

**Archivo:** `middleware/negocio.middleware.ts`

### 5.1 Verificar Propietario

Verifica que el usuario sea dueño del negocio en la URL:

```typescript
export const verificarPropietarioNegocio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { negocioId } = req.params;
    const usuarioId = req.usuario?.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'ID de negocio no proporcionado',
      });
    }

    // Buscar negocio en PostgreSQL
    const [negocio] = await db
      .select({ usuarioId: negocios.usuarioId })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    if (!negocio) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado',
      });
    }

    // Verificar propiedad
    if (negocio.usuarioId !== usuarioId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar este negocio',
      });
    }

    next();
  } catch (error) {
    console.error('Error al verificar propietario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
    });
  }
};
```

### 5.2 Verificar Negocio Existe

Para rutas públicas que no requieren verificar propiedad:

```typescript
export const verificarNegocioExiste = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { negocioId } = req.params;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: 'ID de negocio no proporcionado',
      });
    }

    const [negocio] = await db
      .select({ id: negocios.id })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    if (!negocio) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar negocio',
    });
  }
};
```

### Uso

```typescript
// Ruta que modifica negocio (solo propietario)
router.put(
  '/:negocioId/horarios',
  verificarToken,
  verificarPropietarioNegocio,
  actualizarHorarios
);

// Ruta pública que solo lee (cualquier usuario autenticado)
router.get(
  '/:negocioId',
  verificarToken,
  verificarNegocioExiste,
  obtenerNegocio
);
```

---

## 6. Middleware de Seguridad

### 6.1 CORS

**Archivo:** `middleware/cors.ts`

```typescript
import cors from 'cors';

const origenesPermitidos = [
  'http://localhost:3000',
  'http://192.168.1.232:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

export const configurarCors = cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (origenesPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### 6.2 Helmet

**Archivo:** `middleware/helmet.ts`

```typescript
import helmet from 'helmet';

export const configurarHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});
```

**Headers que agrega Helmet:**

| Header | Propósito |
|--------|-----------|
| `X-Content-Type-Options` | Previene MIME sniffing |
| `X-Frame-Options` | Previene clickjacking |
| `X-XSS-Protection` | Protección XSS básica |
| `Content-Security-Policy` | Control de recursos |
| `Strict-Transport-Security` | Fuerza HTTPS |

---

## 7. Middleware de Rate Limiting

**Archivo:** `middleware/rateLimiter.ts`

### 7.1 Limitador General

```typescript
import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 1000 : 100,  // 1000 en dev, 100 en prod
  message: {
    success: false,
    message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 7.2 Limitador de Login

```typescript
export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDev ? 20 : 5,      // 20 en dev, 5 en prod
  message: {
    success: false,
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Configuración por Ambiente

| Limitador | Desarrollo | Producción |
|-----------|------------|------------|
| General | 1000 req/15min | 100 req/15min |
| Login | 20 req/15min | 5 req/15min |

### Uso

```typescript
// Aplicar limitador general a toda la API
app.use(limitadorGeneral);

// Limitador específico para login
router.post('/login', limitadorLogin, loginController);
```

---

## 8. Middleware de Errores

**Archivo:** `middleware/errorHandler.ts`

### 8.1 Manejador Global de Errores

```typescript
interface ErrorConEstado extends Error {
  statusCode?: number;
}

export const manejadorErrores = (
  error: ErrorConEstado,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const mensaje = error.message || 'Error interno del servidor';

  console.error('❌ Error:', {
    mensaje,
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    mensaje,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
```

### 8.2 Ruta No Encontrada (404)

```typescript
export const rutaNoEncontrada = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
};
```

### Uso en app.ts

```typescript
// Al final de todas las rutas
app.use(rutaNoEncontrada);
app.use(manejadorErrores);
```

---

## 9. Orden de Ejecución

### En `app.ts`

```typescript
const app = express();

// 1️⃣ Seguridad (primero siempre)
app.use(configurarHelmet);
app.use(configurarCors);
app.use(limitadorGeneral);

// 2️⃣ Parser JSON (excepto webhook Stripe)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/pagos/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// 3️⃣ Rutas de la API
app.use('/api', routes);

// 4️⃣ Manejo de errores (al final)
app.use(rutaNoEncontrada);
app.use(manejadorErrores);
```

### En Rutas Específicas

```typescript
// Orden típico en una ruta protegida
router.post(
  '/:negocioId/productos',
  verificarToken,              // 1. ¿Está autenticado?
  verificarPerfil('comercial'), // 2. ¿Tiene perfil correcto?
  requiereModoComercial,       // 3. ¿Está en modo correcto?
  verificarPropietarioNegocio, // 4. ¿Es dueño del negocio?
  crearProductoController      // 5. Ejecutar lógica
);
```

### Diagrama de Flujo

```
Request
   │
   ▼
┌──────────────┐
│   Helmet     │ → Headers de seguridad
└──────────────┘
   │
   ▼
┌──────────────┐
│    CORS      │ → Validar origen
└──────────────┘
   │
   ▼
┌──────────────┐
│ Rate Limit   │ → Verificar límites
└──────────────┘
   │
   ▼
┌──────────────┐
│  JSON Parser │ → Parsear body
└──────────────┘
   │
   ▼
┌──────────────┐
│verificarToken│ → JWT válido?
└──────────────┘
   │
   ▼
┌──────────────┐
│verificarPerfil│ → Perfil correcto?
└──────────────┘
   │
   ▼
┌──────────────┐
│ verificarModo │ → Modo correcto?
└──────────────┘
   │
   ▼
┌──────────────┐
│ Controller   │ → Ejecutar lógica
└──────────────┘
   │
   ▼
Response
```

---

## 📌 Resumen de Middlewares

| Middleware | Archivo | Propósito | Nivel |
|------------|---------|-----------|-------|
| `configurarHelmet` | `helmet.ts` | Headers seguridad | Global |
| `configurarCors` | `cors.ts` | Control de orígenes | Global |
| `limitadorGeneral` | `rateLimiter.ts` | 100 req/15min | Global |
| `limitadorLogin` | `rateLimiter.ts` | 5 req/15min | Ruta |
| `verificarToken` | `auth.ts` | Validar JWT | Ruta |
| `verificarPerfil` | `auth.ts` | Validar perfil | Ruta |
| `verificarMembresia` | `auth.ts` | Validar nivel | Ruta |
| `requiereModoPersonal` | `validarModo.ts` | Modo = personal | Ruta |
| `requiereModoComercial` | `validarModo.ts` | Modo = comercial | Ruta |
| `requiereAccesoComercial` | `validarModo.ts` | Perfil = comercial | Ruta |
| `verificarPropietarioNegocio` | `negocio.middleware.ts` | Dueño del negocio | Ruta |
| `verificarNegocioExiste` | `negocio.middleware.ts` | Negocio existe | Ruta |
| `rutaNoEncontrada` | `errorHandler.ts` | Respuesta 404 | Global |
| `manejadorErrores` | `errorHandler.ts` | Captura errores | Global |
