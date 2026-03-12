# 📚 AnunciaYA v3.0 - Endpoints de Referencia

**Última Actualización:** Diciembre 2025  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Convenciones](#1-convenciones)
2. [Health Check](#2-health-check)
3. [Autenticación](#3-autenticación)
4. [Pagos (Stripe)](#4-pagos-stripe)
5. [Categorías](#5-categorías)
6. [Onboarding](#6-onboarding)
7. [Negocios](#7-negocios)
8. [Cloudinary](#8-cloudinary)
9. [Resumen](#9-resumen)

---

## 1. Convenciones

### Base URL

| Ambiente | URL |
|----------|-----|
| Desarrollo | `http://localhost:4000/api` |
| Producción | `https://api.anunciaya.com/api` |

### Autenticación

Rutas protegidas requieren header:
```
Authorization: Bearer {accessToken}
```

### Formato de Respuestas

**Éxito:**
```json
{
  "success": true,
  "message": "Descripción del resultado",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": ["Error 1", "Error 2"]
}
```

### Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | Éxito |
| 201 | Recurso creado |
| 400 | Datos inválidos |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 429 | Rate limit |
| 500 | Error servidor |

---

## 2. Health Check

### GET /api/health

**Auth:** ❌

```json
// Response 200
{
  "success": true,
  "message": "🚀 AnunciaYA API v3.0.0 funcionando",
  "timestamp": "2025-12-25T10:30:00.000Z"
}
```

---

## 3. Autenticación

### 3.1 POST /api/auth/registro

**Auth:** ❌

```json
// Request
{
  "nombre": "Juan",
  "apellidos": "Pérez García",
  "correo": "juan@ejemplo.com",
  "contrasena": "MiPassword123",
  "perfil": "personal",
  "aceptaTerminos": true
}

// Response 201
{
  "success": true,
  "message": "Código de verificación enviado",
  "data": { "correo": "juan@ejemplo.com" }
}
```

### 3.2 POST /api/auth/verificar-email

**Auth:** ❌

```json
// Request
{ "correo": "juan@ejemplo.com", "codigo": "847293" }

// Response 200
{
  "success": true,
  "data": {
    "usuario": { "id": "uuid", "nombre": "Juan", ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 3.3 POST /api/auth/reenviar-verificacion

**Auth:** ❌

```json
// Request
{ "correo": "juan@ejemplo.com" }

// Response 200
{ "success": true, "message": "Nuevo código enviado" }
```

### 3.4 POST /api/auth/login

**Auth:** ❌

```json
// Request
{ "correo": "juan@ejemplo.com", "contrasena": "MiPassword123" }

// Response 200 (sin 2FA)
{
  "success": true,
  "data": {
    "usuario": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}

// Response 200 (con 2FA)
{
  "success": true,
  "data": { "requiere2FA": true, "tokenTemporal": "uuid-xxx" }
}
```

### 3.5 POST /api/auth/refresh

**Auth:** ❌

```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{
  "success": true,
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```

### 3.6 POST /api/auth/logout

**Auth:** ✅

```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{ "success": true, "message": "Sesión cerrada" }
```

### 3.7 GET /api/auth/yo

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Juan",
    "correo": "juan@ejemplo.com",
    "perfil": "personal",
    "modoActivo": "personal",
    "tieneModoComercial": false
  }
}
```

### 3.8 POST /api/auth/logout-todos

**Auth:** ✅

```json
// Response 200
{ "success": true, "data": { "sesionesEliminadas": 3 } }
```

### 3.9 GET /api/auth/sesiones

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": {
    "sesiones": [
      { "sessionId": "uuid", "ip": "192.168.1.1", "dispositivo": "Chrome" }
    ]
  }
}
```

### 3.10 POST /api/auth/olvide-contrasena

**Auth:** ❌

```json
// Request
{ "correo": "juan@ejemplo.com" }

// Response 200
{ "success": true, "data": { "correoRegistrado": true, "esOAuth": false } }
```

### 3.11 POST /api/auth/restablecer-contrasena

**Auth:** ❌

```json
// Request
{
  "correo": "juan@ejemplo.com",
  "codigo": "847293",
  "nuevaContrasena": "NuevaPassword456"
}

// Response 200
{ "success": true, "message": "Contraseña restablecida" }
```

### 3.12 PATCH /api/auth/cambiar-contrasena

**Auth:** ✅

```json
// Request
{ "contrasenaActual": "Password123", "nuevaContrasena": "NuevaPass456" }

// Response 200
{ "success": true, "message": "Contraseña cambiada" }
```

### 3.13 POST /api/auth/google

**Auth:** ❌

```json
// Request
{ "idToken": "eyJhbGciOiJSUzI1NiIs..." }

// Response 200
{
  "success": true,
  "data": { "usuario": {...}, "accessToken": "...", "refreshToken": "..." }
}
```

### 3.14 POST /api/auth/2fa/generar

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": { "qrCode": "data:image/png;base64,...", "secreto": "JBSWY3DP..." }
}
```

### 3.15 POST /api/auth/2fa/activar

**Auth:** ✅

```json
// Request
{ "codigo": "123456" }

// Response 200
{
  "success": true,
  "data": { "codigosRespaldo": ["ABCD1234", "EFGH5678", ...] }
}
```

### 3.16 POST /api/auth/2fa/verificar

**Auth:** ❌

```json
// Request
{ "tokenTemporal": "uuid-xxx", "codigo": "123456" }

// Response 200
{
  "success": true,
  "data": { "usuario": {...}, "accessToken": "...", "refreshToken": "..." }
}
```

### 3.17 DELETE /api/auth/2fa/desactivar

**Auth:** ✅

```json
// Request
{ "codigo": "123456" }

// Response 200
{ "success": true, "message": "2FA desactivado" }
```

### 3.18 PATCH /api/auth/modo

**Auth:** ✅

```json
// Request
{ "modo": "comercial" }

// Response 200
{
  "success": true,
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

### 3.19 GET /api/auth/modo-info

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": {
    "tieneModoComercial": true,
    "modoActivo": "personal",
    "negocioId": "uuid",
    "puedeAlternar": true
  }
}
```

---

## 4. Pagos (Stripe)

### 4.1 POST /api/pagos/crear-checkout

**Auth:** ❌

```json
// Request
{
  "correo": "comerciante@ejemplo.com",
  "nombreNegocio": "Mi Tienda",
  "datosRegistro": { "nombre": "Juan", "apellidos": "Pérez" }
}

// Response 200
{
  "success": true,
  "data": { "sessionId": "cs_test_xxx", "url": "https://checkout.stripe.com/..." }
}
```

### 4.2 POST /api/pagos/webhook

**Auth:** ❌ (usa firma Stripe)

### 4.3 GET /api/pagos/verificar-session?session_id=cs_xxx

**Auth:** ❌

```json
// Response 200
{
  "success": true,
  "data": { "usuario": {...}, "accessToken": "...", "refreshToken": "..." }
}
```

---

## 5. Categorías

### 5.1 GET /api/categorias

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": [
    { "id": 1, "nombre": "Restaurantes", "slug": "restaurantes", "icono": "utensils" }
  ]
}
```

### 5.2 GET /api/categorias/:id/subcategorias

**Auth:** ✅

```json
// Response 200
{
  "success": true,
  "data": [
    { "id": 1, "nombre": "Comida Mexicana", "categoriaId": 1 }
  ]
}
```

---

## 6. Onboarding

### 6.1 GET /api/onboarding/mi-negocio

**Auth:** ✅

### 6.2 POST /api/onboarding/:negocioId/paso1

**Auth:** ✅

```json
// Request
{ "nombre": "Mi Restaurante", "subcategoriasIds": [1, 5, 12] }
```

### 6.3 PUT /api/onboarding/:negocioId/sucursal

**Auth:** ✅

```json
// Request
{
  "ciudad": "CDMX",
  "direccion": "Av. Insurgentes 1234",
  "latitud": 19.391,
  "longitud": -99.173
}
```

### 6.4 POST /api/onboarding/:negocioId/contacto

**Auth:** ✅

```json
// Request
{ "telefono": "+5255...", "whatsapp": "+5255...", "correo": "x@y.com" }
```

### 6.5 POST /api/onboarding/:negocioId/horarios

**Auth:** ✅

```json
// Request
{
  "sucursalId": "uuid",
  "horarios": [
    { "diaSemana": 1, "abierto": true, "horaApertura": "09:00", "horaCierre": "18:00" }
  ]
}
```

### 6.6-6.8 POST /api/onboarding/:negocioId/logo|portada|galeria

**Auth:** ✅

### 6.9 POST /api/onboarding/:negocioId/metodos-pago

**Auth:** ✅

```json
// Request
{ "metodosPago": ["efectivo_en_local", "transferencia"] }
```

### 6.10 POST /api/onboarding/:negocioId/puntos

**Auth:** ✅

```json
// Request
{ "participaPuntos": true }
```

### 6.11 POST /api/onboarding/:negocioId/articulos

**Auth:** ✅

```json
// Request
{
  "articulos": [
    { "tipo": "producto", "nombre": "Hamburguesa", "precioBase": 89 }
  ]
}
```

### 6.12 POST /api/onboarding/:negocioId/finalizar

**Auth:** ✅

### 6.13 GET /api/onboarding/:negocioId/progreso

**Auth:** ✅

---

## 7. Negocios

### 7.1 GET /api/negocios/:id

**Auth:** ✅

### 7.2 GET /api/negocios/:id/galeria

**Auth:** ✅

### 7.3 DELETE /api/negocios/:id/logo

**Auth:** ✅

### 7.4 DELETE /api/negocios/:id/portada

**Auth:** ✅

### 7.5 DELETE /api/negocios/:negocioId/galeria/:imageId

**Auth:** ✅

---

## 8. Cloudinary

### 8.1 POST /api/cloudinary/delete

**Auth:** ❌ (temporal)

```json
// Request
{ "url": "https://res.cloudinary.com/.../foto.jpg" }
// o
{ "publicId": "anunciaya/logos/foto" }
```

### 8.2 POST /api/cloudinary/delete-multiple

**Auth:** ❌ (temporal)

```json
// Request
{ "urls": ["url1", "url2"] }
```

---

## 9. Resumen

### Total: 44 Endpoints

| Módulo | Endpoints | Auth Requerida |
|--------|-----------|----------------|
| Health | 1 | ❌ |
| Auth | 19 | Mixto |
| Pagos | 3 | ❌ |
| Categorías | 2 | ✅ |
| Onboarding | 13 | ✅ |
| Negocios | 5 | ✅ |
| Cloudinary | 2 | ❌ |

### Endpoints Públicos (sin auth)

- POST /api/auth/registro
- POST /api/auth/verificar-email
- POST /api/auth/reenviar-verificacion
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/olvide-contrasena
- POST /api/auth/restablecer-contrasena
- POST /api/auth/google
- POST /api/auth/2fa/verificar
- POST /api/pagos/crear-checkout
- POST /api/pagos/webhook
- GET /api/pagos/verificar-session
- POST /api/cloudinary/delete
- POST /api/cloudinary/delete-multiple

### Endpoints Protegidos (requieren JWT)

Todos los demás (30 endpoints)
