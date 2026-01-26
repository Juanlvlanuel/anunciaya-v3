# 🔐 AnunciaYA v3.0 - Sistema de Autenticación

**Última Actualización:** Diciembre 2025  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Visión General](#1-visión-general)
2. [Flujo de Registro](#2-flujo-de-registro)
3. [Flujo de Login](#3-flujo-de-login)
4. [Sistema JWT + Refresh Tokens](#4-sistema-jwt--refresh-tokens)
5. [Gestión de Sesiones Multi-dispositivo](#5-gestión-de-sesiones-multi-dispositivo)
6. [Google OAuth](#6-google-oauth)
7. [Autenticación de Dos Factores (2FA)](#7-autenticación-de-dos-factores-2fa)
8. [Recuperación de Contraseña](#8-recuperación-de-contraseña)
9. [Sistema de Modos](#9-sistema-de-modos)
10. [Endpoints de Autenticación](#10-endpoints-de-autenticación)

---

## 1. Visión General

### Características del Sistema

| Feature | Implementación |
|---------|---------------|
| Registro | Email + contraseña o Google OAuth |
| Verificación | Código 6 dígitos por email |
| Login | Email/contraseña con soporte 2FA |
| Tokens | Access (1h) + Refresh (7d) |
| Sesiones | Multi-dispositivo en Redis |
| 2FA | TOTP con códigos de respaldo |
| OAuth | Google One Tap |
| Recuperación | Código por email |

### Stack de Seguridad

- **Contraseñas**: bcrypt (12 rondas)
- **Tokens**: JWT con secretos separados
- **2FA**: TOTP (RFC 6238) vía `otplib`
- **Códigos**: `crypto.randomInt()` (6 dígitos)
- **Sesiones**: Redis con TTL automático

---

## 2. Flujo de Registro

### 2.1 Registro Normal (Email + Contraseña)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│    Redis    │
│ Formulario  │     │  /registro  │     │  (15 min)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Email    │
                    │   código    │
                    └─────────────┘
```

**Paso 1: Enviar datos de registro**

```
POST /api/auth/registro
```

Request:
```json
{
  "nombre": "Juan",
  "apellidos": "Pérez García",
  "correo": "juan@ejemplo.com",
  "contrasena": "MiPassword123",
  "telefono": "+525512345678",
  "perfil": "personal",
  "aceptaTerminos": true
}
```

Response (201):
```json
{
  "success": true,
  "message": "Código de verificación enviado a tu correo",
  "data": {
    "correo": "juan@ejemplo.com"
  }
}
```

**Qué pasa internamente:**
1. Valida datos con Zod
2. Verifica que el correo no exista en PostgreSQL
3. Hashea contraseña con bcrypt (12 rondas)
4. Genera código de 6 dígitos
5. Guarda TODO en **Redis** (temporal, 15 min)
6. Envía email con código

**Paso 2: Verificar email**

```
POST /api/auth/verificar-email
```

Request:
```json
{
  "correo": "juan@ejemplo.com",
  "codigo": "847293"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Correo verificado correctamente",
  "data": {
    "usuario": {
      "id": "uuid-xxx",
      "nombre": "Juan",
      "apellidos": "Pérez García",
      "correo": "juan@ejemplo.com",
      "perfil": "personal",
      "membresia": 1,
      "correoVerificado": true,
      "modoActivo": "personal",
      "tieneModoComercial": false,
      "negocioId": null,
      "onboardingCompletado": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Qué pasa internamente:**
1. Busca registro pendiente en Redis
2. Compara código (máx 5 intentos)
3. Si es correcto: crea usuario en **PostgreSQL**
4. Elimina registro de Redis
5. Genera tokens JWT
6. Guarda sesión en Redis
7. Retorna usuario + tokens

### 2.2 Registro Comercial

Para perfil comercial, se requiere nombre del negocio:

```json
{
  "nombre": "Juan",
  "apellidos": "Pérez",
  "correo": "juan@negocio.com",
  "contrasena": "MiPassword123",
  "perfil": "comercial",
  "nombreNegocio": "Mi Tienda",
  "aceptaTerminos": true
}
```

### 2.3 Reenviar Código

```
POST /api/auth/reenviar-verificacion
```

Request:
```json
{
  "correo": "juan@ejemplo.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Nuevo código enviado"
}
```

---

## 3. Flujo de Login

### 3.1 Login Normal (sin 2FA)

```
POST /api/auth/login
```

Request:
```json
{
  "correo": "juan@ejemplo.com",
  "contrasena": "MiPassword123"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "usuario": {
      "id": "uuid-xxx",
      "nombre": "Juan",
      "correo": "juan@ejemplo.com",
      "perfil": "personal",
      "membresia": 1,
      "modoActivo": "personal",
      "correoVerificado": true,
      "tieneModoComercial": false,
      "negocioId": null,
      "onboardingCompletado": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 3.2 Login con 2FA Activado

**Paso 1**: Intento de login normal

Response (cuando 2FA está activo):
```json
{
  "success": true,
  "message": "Se requiere código de verificación",
  "data": {
    "requiere2FA": true,
    "tokenTemporal": "uuid-temporal-xxx"
  }
}
```

**Paso 2**: Enviar código 2FA

```
POST /api/auth/2fa/verificar
```

Request:
```json
{
  "tokenTemporal": "uuid-temporal-xxx",
  "codigo": "123456"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Verificación exitosa",
  "data": {
    "usuario": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## 4. Sistema JWT + Refresh Tokens

### 4.1 Estructura de Tokens

**Payload del Token:**

```typescript
interface PayloadToken {
  usuarioId: string;    // UUID del usuario
  correo: string;       // Email
  perfil: string;       // 'personal' | 'comercial'
  membresia: number;    // 1, 2, 3
  modoActivo: string;   // 'personal' | 'comercial'
}
```

**Configuración:**

| Token | Secreto | Expiración | Uso |
|-------|---------|------------|-----|
| Access | `JWT_SECRET` | 1 hora | Autorización de peticiones |
| Refresh | `JWT_REFRESH_SECRET` | 7 días | Renovar access token |

### 4.2 Renovar Access Token

```
POST /api/auth/refresh
```

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response (200):
```json
{
  "success": true,
  "message": "Token renovado",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Proceso interno:**
1. Verifica firma del refresh token
2. Busca sesión en Redis
3. Si existe y es válido:
   - Genera nuevos tokens
   - Actualiza sesión en Redis
   - Retorna nuevos tokens

### 4.3 Uso del Access Token

Todas las rutas protegidas requieren el header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 5. Gestión de Sesiones Multi-dispositivo

### Estructura en Redis

```
session:{usuarioId}:{sessionId} → JSON con datos
user_sessions:{usuarioId} → SET de sessionIds
```

**Datos de sesión:**

```typescript
interface DatosSesion {
  sessionId: string;
  usuarioId: string;
  refreshToken: string;
  ip: string | null;
  dispositivo: string | null;  // "Chrome", "Móvil", etc.
  creadoEn: string;            // ISO timestamp
}
```

### Ver Sesiones Activas

```
GET /api/auth/sesiones
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "success": true,
  "message": "Sesiones activas",
  "data": {
    "sesiones": [
      {
        "sessionId": "uuid-1",
        "ip": "192.168.1.100",
        "dispositivo": "Chrome",
        "creadoEn": "2025-12-01T10:30:00.000Z"
      },
      {
        "sessionId": "uuid-2",
        "ip": "192.168.1.50",
        "dispositivo": "Móvil",
        "creadoEn": "2025-12-02T15:45:00.000Z"
      }
    ]
  }
}
```

### Cerrar Sesión Individual

```
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Cerrar Todas las Sesiones

```
POST /api/auth/logout-todos
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "success": true,
  "message": "Todas las sesiones cerradas",
  "data": {
    "sesionesEliminadas": 3
  }
}
```

---

## 6. Google OAuth

### 6.1 Login con Google

```
POST /api/auth/google
```

Request:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (usuario existente):
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso con Google",
  "data": {
    "usuario": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

Response (usuario nuevo):
```json
{
  "success": false,
  "message": "No existe una cuenta con este correo",
  "code": 404
}
```

### 6.2 Registro con Google

```
POST /api/auth/registro
```

Request:
```json
{
  "nombre": "Juan",
  "apellidos": "Pérez",
  "correo": "juan@gmail.com",
  "googleIdToken": "eyJhbGciOiJSUzI1NiIs...",
  "avatar": "https://lh3.googleusercontent.com/...",
  "perfil": "personal",
  "aceptaTerminos": true
}
```

**Nota:** Con Google OAuth:
- NO se requiere contraseña
- Email ya está verificado
- Se crea usuario directamente en PostgreSQL

---

## 7. Autenticación de Dos Factores (2FA)

### 7.1 Generar Secreto 2FA

```
POST /api/auth/2fa/generar
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "success": true,
  "message": "Escanea el código QR con tu app de autenticación",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "secreto": "JBSWY3DPEHPK3PXP"
  }
}
```

### 7.2 Activar 2FA

```
POST /api/auth/2fa/activar
Authorization: Bearer {accessToken}
```

Request:
```json
{
  "codigo": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA activado correctamente",
  "data": {
    "codigosRespaldo": [
      "ABCD1234",
      "EFGH5678",
      "IJKL9012",
      "MNOP3456",
      "QRST7890",
      "UVWX1234",
      "YZAB5678",
      "CDEF9012"
    ]
  }
}
```

**⚠️ IMPORTANTE:** Los códigos de respaldo solo se muestran UNA VEZ.

### 7.3 Desactivar 2FA

```
DELETE /api/auth/2fa/desactivar
Authorization: Bearer {accessToken}
```

Request:
```json
{
  "codigo": "123456"
}
```

---

## 8. Recuperación de Contraseña

### 8.1 Solicitar Código

```
POST /api/auth/olvide-contrasena
```

Request:
```json
{
  "correo": "juan@ejemplo.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Código de recuperación enviado",
  "data": {
    "correoRegistrado": true,
    "esOAuth": false
  }
}
```

### 8.2 Restablecer Contraseña

```
POST /api/auth/restablecer-contrasena
```

Request:
```json
{
  "correo": "juan@ejemplo.com",
  "codigo": "847293",
  "nuevaContrasena": "MiNuevaPassword456"
}
```

### 8.3 Cambiar Contraseña (Logueado)

```
PATCH /api/auth/cambiar-contrasena
Authorization: Bearer {accessToken}
```

Request:
```json
{
  "contrasenaActual": "MiPasswordActual123",
  "nuevaContrasena": "MiNuevaPassword456"
}
```

---

## 9. Sistema de Modos

AnunciaYA soporta dos modos de cuenta:

| Modo | Descripción | Acceso |
|------|-------------|--------|
| `personal` | Funciones de consumidor | Todos |
| `comercial` | Gestión de negocio | Solo con suscripción |

### 9.1 Cambiar Modo

```
PATCH /api/auth/modo
Authorization: Bearer {accessToken}
```

Request:
```json
{
  "modo": "comercial"
}
```

Response:
```json
{
  "success": true,
  "message": "Cambiado a modo comercial exitosamente",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Nota:** Se generan nuevos tokens con el modo actualizado.

### 9.2 Obtener Info de Modo

```
GET /api/auth/modo-info
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "success": true,
  "data": {
    "tieneModoComercial": true,
    "modoActivo": "personal",
    "negocioId": "uuid-negocio",
    "puedeAlternar": true
  }
}
```

---

## 10. Endpoints de Autenticación

### Resumen Completo

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/registro` | ❌ | Crear cuenta nueva |
| `POST` | `/api/auth/verificar-email` | ❌ | Confirmar código |
| `POST` | `/api/auth/reenviar-verificacion` | ❌ | Reenviar código |
| `POST` | `/api/auth/login` | ❌ | Iniciar sesión |
| `POST` | `/api/auth/refresh` | ❌ | Renovar access token |
| `POST` | `/api/auth/olvide-contrasena` | ❌ | Solicitar código |
| `POST` | `/api/auth/restablecer-contrasena` | ❌ | Nueva contraseña |
| `POST` | `/api/auth/google` | ❌ | Login con Google |
| `POST` | `/api/auth/2fa/verificar` | ❌ | Verificar código 2FA |
| `POST` | `/api/auth/logout` | ✅ | Cerrar sesión |
| `GET` | `/api/auth/yo` | ✅ | Datos del usuario actual |
| `POST` | `/api/auth/logout-todos` | ✅ | Cerrar todas las sesiones |
| `GET` | `/api/auth/sesiones` | ✅ | Ver sesiones activas |
| `PATCH` | `/api/auth/cambiar-contrasena` | ✅ | Cambiar contraseña |
| `POST` | `/api/auth/2fa/generar` | ✅ | Generar QR de 2FA |
| `POST` | `/api/auth/2fa/activar` | ✅ | Activar 2FA |
| `DELETE` | `/api/auth/2fa/desactivar` | ✅ | Desactivar 2FA |
| `PATCH` | `/api/auth/modo` | ✅ | Cambiar modo |
| `GET` | `/api/auth/modo-info` | ✅ | Info de modo actual |

### Códigos de Error Comunes

| Código | Significado |
|--------|-------------|
| 400 | Datos inválidos (validación Zod) |
| 401 | No autenticado / Token inválido |
| 403 | Sin permisos (perfil/modo incorrecto) |
| 404 | Usuario no encontrado |
| 409 | Correo ya registrado |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno del servidor |
