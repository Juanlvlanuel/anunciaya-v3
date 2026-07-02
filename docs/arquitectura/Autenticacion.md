# 🔐 AnunciaYA v3.0 - Sistema de Autenticación

**Última actualización:** 19 Junio 2026  
**Versión:** 5.5 (Ciudad OBLIGATORIA en el registro → `ciudad_id`)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura conceptual** del sistema de autenticación:
- ✅ Flujos de autenticación (registro, login, refresh, OAuth, 2FA)
- ✅ Tipos de tokens y su propósito
- ✅ Endpoints EXACTOS verificados contra código real
- ✅ Middlewares de autorización
- ✅ Almacenamiento REAL (Redis vs PostgreSQL)
- ✅ Campos verificados contra esquema SQL real
- ✅ Decisiones arquitectónicas y justificación

**NO incluye:**
- ❌ Código fuente completo (consultar archivos en repositorio)
- ❌ Implementación detallada de funciones

**Para implementación exacta:**
- Ver: `/apps/api/src/routes/auth.routes.ts` (endpoints completos)
- Ver: `/apps/api/src/controllers/auth.controller.ts` (lógica de negocio)
- Ver: `/apps/api/src/services/auth.service.ts` (operaciones BD)
- Ver: `/apps/api/src/utils/jwt.ts` y `/apps/api/src/utils/jwtScanYA.ts` (tokens)
- Ver: `/apps/api/src/utils/tokenStore.ts` (almacenamiento Redis - 829 líneas)

---

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [JWT - JSON Web Tokens](#jwt---json-web-tokens)
3. [Endpoints de Autenticación](#endpoints-de-autenticación)
4. [Almacenamiento: Redis vs PostgreSQL](#almacenamiento-redis-vs-postgresql)
5. [Flujos de Autenticación](#flujos-de-autenticación)
6. [Verificación de Email](#verificación-de-email)
7. [Google OAuth](#google-oauth)
8. [Autenticación de Dos Factores (2FA)](#autenticación-de-dos-factores-2fa)
9. [Refresh Tokens](#refresh-tokens)
10. [Recuperación de Contraseña](#recuperación-de-contraseña)
11. [Cambio de Modo (Personal ↔ Comercial)](#cambio-de-modo-personal--comercial)
12. [Middlewares de Autorización](#middlewares-de-autorización)
13. [Seguridad](#seguridad)
14. [Ubicación de Archivos](#ubicación-de-archivos)
15. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)

---

## 🏗️ Arquitectura General

### Stack Tecnológico

**Backend:**
- `jsonwebtoken` - Generación y validación de tokens
- `bcrypt` - Hashing de contraseñas (12 salt rounds)
- `nodemailer` - Envío de emails de verificación y recuperación

**Frontend:**
- `zustand` + `persist` - Store de autenticación
- `axios` interceptors - Inyección automática de tokens
- localStorage - Persistencia de tokens

**Base de Datos:**
- **PostgreSQL** (Supabase) - Tabla `usuarios` y `usuario_codigos_respaldo` (2FA)
- **Redis** (Upstash) - Sesiones, códigos temporales, rate limiting

---

## 🎫 JWT - JSON Web Tokens

### Tipos de Tokens

**1. Access Token AnunciaYA (`ay_*`)**
- **Duración:** 15 minutos
- **Uso:** Autenticación en cada request
- **Storage:** localStorage + memoria
- **Generación:** Ver `/apps/api/src/utils/jwt.ts`

**2. Refresh Token AnunciaYA (`ay_*`)**
- **Duración:** 7 días
- **Uso:** Renovar access token
- **Storage:** localStorage + Redis (keys `session:{userId}:{sessionId}`)
- **Generación:** Ver `/apps/api/src/utils/jwt.ts`

**3. Access Token ScanYA (`sy_*`)**
- **Duración:** 12 horas
- **Uso:** Autenticación en ScanYA PWA
- **Storage:** localStorage separado
- **Generación:** Ver `/apps/api/src/utils/jwtScanYA.ts`

**4. Refresh Token ScanYA (`sy_*`)**
- **Duración:** 30 días
- **Uso:** Renovar access token ScanYA
- **Storage:** localStorage separado + Redis
- **Generación:** Ver `/apps/api/src/utils/jwtScanYA.ts`

**Razón de prefijos:** Sesiones 100% independientes entre AnunciaYA y ScanYA.

---

## 🔗 Endpoints de Autenticación

> ✅ **VERIFICADO:** Extraídos de `/apps/api/src/routes/auth.routes.ts` (30 Enero 2026; ampliado el **29 Junio 2026** con la gestión de cuenta desde Mi Perfil — datos personales, avatar, establecer contraseña, vincular Google, cambiar correo y baja de cuenta. Detalle en [`Mi_Perfil.md`](Mi_Perfil.md))

### Endpoints Públicos (Sin Autenticación)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/auth/registro` | Crear cuenta nueva |
| POST | `/api/auth/verificar-email` | Confirmar código de verificación email |
| POST | `/api/auth/reenviar-verificacion` | Reenviar código de verificación |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Renovar access token |
| POST | `/api/auth/olvide-contrasena` | Solicitar código de recuperación |
| POST | `/api/auth/restablecer-contrasena` | Establecer nueva contraseña con código |
| POST | `/api/auth/google` | Login con Google OAuth |
| POST | `/api/auth/2fa/verificar` | Verificar código 2FA durante login |

---

### Endpoints Protegidos (Requieren JWT)

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/auth/yo` | Obtener datos del usuario actual (incluye `tieneContrasena`, `autenticadoPorGoogle`) |
| POST | `/api/auth/logout` | Cerrar sesión actual |
| POST | `/api/auth/logout-todos` | Cerrar todas las sesiones (todos los dispositivos) |
| GET | `/api/auth/sesiones` | Ver sesiones activas |
| PATCH | `/api/auth/perfil` | Actualizar datos personales (nombre, apellidos, teléfono, fecha, género, ciudad, avatar) |
| POST | `/api/auth/avatar/url-subida` | Presigned URL para subir el avatar a R2 (carpeta `avatares`) |
| PATCH | `/api/auth/cambiar-contrasena` | Cambiar contraseña (cuenta que YA tiene una) |
| POST | `/api/auth/establecer-contrasena` | Crear la PRIMERA contraseña (cuentas sin contraseña, ej. Google) |
| POST | `/api/auth/google/vincular` | Vincular Google a la cuenta (valida que el correo coincida) |
| POST | `/api/auth/cambiar-correo/solicitar` | Enviar código de verificación al NUEVO correo (Redis 15 min/5 intentos) |
| POST | `/api/auth/cambiar-correo/confirmar` | Aplicar el nuevo correo con el código recibido |
| POST | `/api/auth/eliminar-cuenta` | Dar de baja la cuenta (soft-delete: `estado='inactivo'` + cierra sesiones; bloquea si hay negocio en circulación) |
| POST | `/api/auth/2fa/generar` | Generar secreto + QR para 2FA |
| POST | `/api/auth/2fa/activar` | Confirmar y activar 2FA |
| DELETE | `/api/auth/2fa/desactivar` | Desactivar 2FA |
| PATCH | `/api/auth/modo` | Cambiar modo (personal ↔ comercial) |
| GET | `/api/auth/modo-info` | Obtener información del modo actual |
| PATCH | `/api/auth/ubicacion` | Guardar la ciudad del usuario (selector/GPS → `ciudad_id`) |

---

### 🏙️ Ciudad del usuario vía catálogo (`ciudad_id`)

> Migración **ciudad (texto) → catálogo `ciudades` (FK `ciudad_id`)** completada el **19 Junio 2026**
> (patrón expand-migrate-contract). La columna texto `usuarios.ciudad` quedó DROPeada en DEV
> (DROP en PROD pendiente como último paso operativo).

- **Lectura (`GET /api/auth/yo`, login, etc.):** `usuarioAPublico` (`auth.service.ts`) ya no lee la
  columna texto; resuelve el **nombre** de la ciudad desde el catálogo por la FK `usuario.ciudad_id`
  (1 lookup por sesión, indexado por PK) y lo expone en el campo de salida `ciudad`. Si `ciudad_id`
  es NULL, `ciudad` sale `null`. El alias de salida `ciudad` se conservó: el frontend no cambió.
- **Escritura (`PATCH /api/auth/ubicacion`):** `actualizarUbicacionUsuario` recibe el **texto** del
  selector/GPS, lo resuelve a `ciudad_id` por slug con `resolverCiudadId()` (`utils/ciudades.ts`,
  el mismo helper que usan las sucursales) y persiste **solo `ciudad_id`**. Si el texto no casa con
  ninguna ciudad del catálogo, `ciudad_id` queda NULL.
- **Ciudad OBLIGATORIA en el registro (jul 2026):** `registroSchema` exige `ciudad` (texto) en
  AMBOS perfiles; se resuelve a `ciudad_id` en `registrarUsuario` y si no casa con el catálogo el
  registro se **rechaza** (400) — así nadie nace sin ciudad. Se propaga por los 4 flujos: personal
  (correo → `registro_pendiente` → `verificarEmail`; Google → insert directo) y comercial (correo/
  Google → `temp:registro` → webhook Stripe → `crearNegocioConDueno`, que setea `ciudad_id` en el
  **usuario dueño Y la sucursal principal**). En comercial la ciudad del registro es la del **negocio**
  ("Ciudad donde opera tu negocio"); el onboarding (Paso 2) la muestra pre-llenada y editable. UI:
  campo obligatorio en `FormularioRegistro` que reutiliza `ModalUbicacion` (mismo selector del onboarding).
- La ciudad del usuario alimenta el expediente del Panel Usuarios y se usa como ciudad del
  oferente/vendedor/prestador en Servicios/MarketPlace.

---

## 💾 Almacenamiento: Redis vs PostgreSQL

> ✅ **VERIFICADO:** Contra `/apps/api/src/utils/tokenStore.ts` (829 líneas) y esquema SQL

### PostgreSQL (Supabase) - Datos Permanentes

**Tabla: `usuarios`**
- Datos del usuario (nombre, email, teléfono)
- `contrasena_hash` (varchar(255), nullable - NULL si Google OAuth)
- `correo_verificado` (boolean)
- `autenticado_por_google` (boolean)
- `doble_factor_secreto` (varchar(64), nullable) - Secreto TOTP 2FA
- `doble_factor_habilitado` (boolean) - 2FA activado
- `doble_factor_confirmado` (boolean) - Usuario confirmó 2FA

**Tabla: `usuario_codigos_respaldo`**
- Códigos de respaldo 2FA (10 por usuario)
- `codigo_hash` (hasheado con bcrypt)
- `usado` (boolean)

---

### Redis (Upstash) - Datos Temporales

**Archivo:** `/apps/api/src/utils/tokenStore.ts` (829 líneas)

**1. Sesiones (Refresh Tokens):**
```
session:{usuarioId}:{sessionId}  → TTL 7 días
user_sessions:{usuarioId}        → SET de sessionIds
```

**2. Códigos de Recuperación:**
```
recovery:{email}  → TTL 15 minutos, máx 5 intentos
```

**3. Registros Pendientes:**
```
registro_pendiente:{email}  → TTL 15 minutos, máx 5 intentos
```

**4. Rate Limiting:**
```
rate:login:{ip}
rate:refresh:{userId}
rate:reset:{email}
```

---

### ¿Por Qué Esta Separación?

**Redis para datos temporales:**
- ✅ TTL automático (auto-eliminación)
- ✅ Ultra rápido (<1ms in-memory)
- ✅ Perfecto para sesiones y códigos
- ✅ No requiere limpieza manual

**PostgreSQL para datos permanentes:**
- ✅ Datos del usuario
- ✅ Configuración 2FA
- ✅ Relaciones con otras tablas
- ✅ Auditoría y reportes

---

## 🔄 Flujos de Autenticación

### 1. Registro de Usuario

```
Usuario → Formulario registro
    ↓
POST /api/auth/registro
    Body: { nombre, apellidos, correo, contrasena, telefono }
    ↓
Backend:
  1. Valida datos con Zod
  2. Verifica email único
  3. Hash password con bcrypt (12 salts)
  4. Genera código 6 dígitos
  5. Guarda en REDIS → registro_pendiente:{email}
  6. Envía email con código
    ↓
Response: { success: true, message: "Código enviado" }
    ↓
Usuario → Ingresa código
    ↓
POST /api/auth/verificar-email
    Body: { correo, codigo }
    ↓
Backend:
  1. Busca en Redis → registro_pendiente:{email}
  2. Verifica código (máx 5 intentos)
  3. Mueve datos: Redis → PostgreSQL (usuarios)
  4. Elimina de Redis
  5. Genera access + refresh tokens
  6. Guarda sesión en Redis → session:{userId}:{sessionId}
    ↓
Response: { accessToken, refreshToken, usuario }
    ↓
Frontend:
  1. Guarda tokens en localStorage
  2. Actualiza useAuthStore
  3. Redirige a /inicio
```

**Archivos:** `auth.controller.ts`, `auth.service.ts`, `tokenStore.ts`

---

### 2. Login de Usuario

```
Usuario → Formulario login
    ↓
POST /api/auth/login
    Body: { correo, contrasena }
    ↓
Backend:
  1. Busca usuario en PostgreSQL
     ├─ NO existe → 404 + errorCode: 'CORREO_NO_REGISTRADO'
     └─ SÍ existe → continúa
  2. Verifica contraseña con bcrypt
     └─ Falla → 401 "Correo o contraseña incorrectos" (mensaje genérico)
  3. Verifica si doble_factor_habilitado = true
    ↓
¿Tiene 2FA?
  NO → Genera tokens + Response
  SÍ → Genera token temporal
    ↓
Si 2FA activo:
  Response: { requiere2FA: true, tokenTemporal }
  ↓
  POST /api/auth/2fa/verificar
    Body: { codigo, tokenTemporal }
    ↓
  Backend verifica código TOTP
    ↓
Genera access + refresh tokens
    ↓
Guarda sesión en Redis → session:{userId}:{sessionId}
    ↓
Response: { accessToken, refreshToken, usuario }
```

**Rate Limiting:** 5 intentos por 15 minutos

#### Diferenciación de errores (UX)

A partir de **v5.2** el backend distingue dos casos de fallo de login mediante
el campo `errorCode` en el body de la respuesta:

| Caso | HTTP | `message` | `errorCode` |
|---|---|---|---|
| Correo no existe en BD | 404 | `"No encontramos una cuenta con este correo"` | `CORREO_NO_REGISTRADO` |
| Contraseña incorrecta | 401 | `"Correo o contraseña incorrectos"` | (ninguno) |

**Frontend (`VistaLogin.tsx`)**:
- Si `errorCode === 'CORREO_NO_REGISTRADO'` → muestra bloque azul dentro del
  modal con `UserPlus` + correo + botón **"Crear cuenta con este correo →"**.
  Click navega a `/registro` con `state: { correo }`.
- Si no hay `errorCode` (contraseña errónea) → toast rojo `"Credenciales
  incorrectas"`. El usuario puede usar **"¿Olvidaste tu contraseña?"**.

**Frontend (`PaginaRegistro.tsx`)**:
- Lee `useLocation().state.correo` y lo pasa al `FormularioRegistro` como prop
  `correoInicial`.
- `FormularioRegistro` aplica `correoInicial` al `useState` inicial del campo
  `correo` y lo marca como válido (border verde) al montar.

**Trade-off de seguridad:** este flujo permite enumeración de correos
registrados — un atacante puede saber si un correo existe probándolo en login.
Aceptado porque el endpoint `/registro` ya permitía la misma enumeración (al
intentar registrar un correo existente devuelve `"Este correo ya está
registrado"`). Ganamos UX clara sin pérdida real de seguridad.

#### Anti-autofill del navegador en el formulario de registro

El `FormularioRegistro` define `autoComplete` explícito en cada input para
evitar que el navegador rellene credenciales antiguas guardadas (Chrome
sincroniza credenciales entre dispositivos):

| Campo | `autoComplete` |
|---|---|
| Nombre del negocio | `organization` |
| Nombre(s) | `given-name` |
| Apellidos | `family-name` |
| Correo | `email` |
| Teléfono | `tel-national` |
| Contraseña / Confirmar | `new-password` ← clave para evitar autofill |

`new-password` es el estándar W3C para registros: le dice al navegador *"este
es un campo de creación, no rellenes con la contraseña guardada"*.

---

### 3. Refresh Token Flow

```
Access token expira (15 min)
    ↓
Request a API → 401 Unauthorized
    ↓
Axios interceptor detecta 401
    ↓
POST /api/auth/refresh
    ↓
Backend:
  1. Verifica firma JWT del refresh token
  2. Busca en Redis → session:{userId}:{sessionId}
  3. Valida sesión activa (TTL no expirado)
  4. Elimina sesión antigua
  5. Genera nuevo access + refresh token
  6. Guarda nueva sesión (rotación)
    ↓
Response: { accessToken, refreshToken (nuevo) }
    ↓
Frontend:
  1. Guarda nuevos tokens
  2. Reintenta request original
```

**Implementación:** `/apps/web/src/services/api.ts`

---

### 4. Logout

```
Usuario → Click logout
    ↓
POST /api/auth/logout
    ↓
Backend:
  1. Elimina sesión de Redis
  2. Remueve del SET user_sessions
    ↓
Response: { success: true }
    ↓
Frontend:
  1. Limpia localStorage
  2. Limpia store
  3. Redirige a landing
```

**Logout masivo:** `POST /api/auth/logout-todos` → Elimina TODAS las sesiones

---

## 📧 Verificación de Email

### Almacenamiento en Redis

**Archivo:** `/apps/api/src/utils/tokenStore.ts`

**Clave:**
```
registro_pendiente:{email}
```

**Datos almacenados:**
```typescript
{
  nombre, apellidos, correo,
  contrasenaHash,  // Ya hasheada con bcrypt
  telefono, perfil, membresia,
  nombreNegocio,   // Solo si comercial
  codigo,          // 6 dígitos
  intentos,        // Contador intentos fallidos
  creadoEn         // ISO timestamp
}
```

**TTL:** 15 minutos | **Máx intentos:** 5

**Seguridad:**
- Contraseña hasheada ANTES de guardar en Redis
- Después de 5 intentos → Registro eliminado
- TTL automático 15 minutos

**Funciones:** `guardarRegistroPendiente()`, `verificarCodigoRegistro()`, etc.

---

## 🔑 Google OAuth

### Campo en Tabla `usuarios`

**NO existe tabla separada `oauth_accounts`**

**Campos en usuarios:**
- `autenticado_por_google` (boolean) - true si la cuenta puede entrar con Google
- `correo_verificado` (boolean) - automáticamente true con Google
- `contrasena_hash` (varchar(255), nullable) - NULL si la cuenta **solo** usa Google; **deja de ser NULL** si crea una contraseña desde Seguridad (`/auth/establecer-contrasena`). El campo de salida `tieneContrasena` del `UsuarioPublico` = `!!contrasena_hash`.

---

### Flujo OAuth 2.0

```
Usuario → "Continuar con Google"
    ↓
POST /api/auth/google
    Body: { googleToken }
    ↓
Backend:
  1. Verifica token con Google
  2. Obtiene datos (email, nombre, foto)
  3. Busca usuario por email
    ↓
¿Usuario existe?
  NO → Crea con:
       - contrasena_hash = NULL
       - autenticado_por_google = true
       - correo_verificado = true
  SÍ → Actualiza autenticado_por_google = true
    ↓
Genera tokens + Guarda sesión en Redis
    ↓
Response: { accessToken, refreshToken, usuario }
```

**Implementación:** `/apps/api/src/services/auth.service.ts` (función `loginConGoogle`)

### Vincular / quitar Google desde Mi Perfil → Seguridad

El vínculo Google se resuelve **por correo** (no se guarda un `google_id`): `loginConGoogle` busca al usuario por el email del token y, si existe, **auto-marca** `autenticado_por_google=true` en el primer acceso.

- **Vincular** (cuenta de solo-contraseña que agrega Google): `POST /auth/google/vincular` (`vincularGoogle`) — intercambia el `code`, verifica el token y **exige que el correo de Google coincida** con el de la cuenta. Idempotente.
- **Crear contraseña** (cuenta Google que también quiere entrar con correo): `POST /auth/establecer-contrasena` (`establecerContrasena`) — establece la primera `contrasena_hash` (no pide la "actual"); conserva Google.
- **Quitar Google → PENDIENTE.** Sería cosmético sin endurecer el login: como se auto-vincula por correo, bajar el flag no impediría volver a entrar. Para "quitar" real haría falta que el login RECHACE si la cuenta existe pero `autenticado_por_google=false` (quitando el auto-vínculo), más un endpoint que exija `tieneContrasena`.

---

## 🔐 Autenticación de Dos Factores (2FA)

### Endpoints 2FA

| Endpoint | Propósito |
|----------|-----------|
| `POST /api/auth/2fa/generar` | Genera secreto TOTP + QR |
| `POST /api/auth/2fa/activar` | Confirma código y activa 2FA |
| `POST /api/auth/2fa/verificar` | Verifica código durante login |
| `DELETE /api/auth/2fa/desactivar` | Desactiva 2FA |

---

### Almacenamiento

**Tabla PostgreSQL: `usuarios`**
- `doble_factor_secreto` (varchar(64), nullable) - Secreto TOTP
- `doble_factor_habilitado` (boolean) - 2FA activado
- `doble_factor_confirmado` (boolean) - Usuario confirmó 2FA

**Diferencia habilitado vs confirmado:**
- `doble_factor_habilitado`: Usuario generó el secreto
- `doble_factor_confirmado`: Usuario escaneó QR y verificó código

**Tabla PostgreSQL: `usuario_codigos_respaldo`**
- 10 códigos por usuario
- Hasheados con bcrypt
- Campo `usado` (boolean)

---

### Flujo de Activación 2FA

```
Usuario logueado → Configuración
    ↓
POST /api/auth/2fa/generar
    ↓
Backend:
  1. Genera secreto TOTP
  2. Genera códigos de respaldo (10)
  3. Crea QR code
    ↓
Response: { secreto, qrCode, codigosRespaldo }
    ↓
Usuario escanea QR (Google Authenticator)
    ↓
Ingresa código de prueba
    ↓
POST /api/auth/2fa/activar
    Body: { codigo }
    ↓
Backend:
  1. Verifica código TOTP
  2. Guarda en PostgreSQL:
     - usuarios.doble_factor_secreto
     - usuarios.doble_factor_habilitado = true
     - usuarios.doble_factor_confirmado = true
  3. Hashea y guarda códigos respaldo
    ↓
Response: { success: true, codigosRespaldo }
```

---

## 🔄 Refresh Tokens

### Almacenamiento en Redis

**Archivo:** `/apps/api/src/utils/tokenStore.ts`

Los refresh tokens se almacenan en Redis, **NO en PostgreSQL**.

**Clave individual:**
```
session:{usuarioId}:{sessionId}
```

**Datos:**
```typescript
{
  sessionId,     // UUID único
  usuarioId,
  refreshToken,  // El token JWT
  ip,            // IP del cliente
  dispositivo,   // Parseado del User-Agent
  creadoEn       // ISO timestamp
}
```

**TTL:** 7 días

---

### SET de sesiones

**Clave:**
```
user_sessions:{usuarioId}
```

**Valor:** Array de sessionIds
```
["session-uuid-1", "session-uuid-2", ...]
```

**TTL:** 7 días (se renueva con cada sesión)

---

### Soporte Multi-Dispositivo

- ✅ Cada login = nueva sesión con sessionId único
- ✅ Usuario puede tener múltiples sesiones simultáneas
- ✅ Logout individual = elimina solo una sesión
- ✅ Logout masivo = elimina todas las sesiones

**Ejemplo:**
```
Celular → session:user123:abc-def
Laptop  → session:user123:xyz-123

user_sessions:user123 = ["abc-def", "xyz-123"]

Logout celular → Solo elimina abc-def
Laptop sigue activo
```

---

### Rotación de Refresh Tokens

**Estrategia:**
1. Usuario hace refresh
2. Backend elimina sesión antigua
3. Genera nuevo refresh token
4. Guarda nueva sesión
5. Retorna nuevo token

**Beneficio:** Token robado deja de funcionar inmediatamente.

---

### Funciones Disponibles

Ver `/apps/api/src/utils/tokenStore.ts`:
- `guardarSesion()`
- `verificarSesion()`
- `eliminarSesion()`
- `eliminarSesionPorToken()`
- `eliminarTodasLasSesiones()`
- `obtenerSesionesActivas()`

---

## 🔓 Recuperación de Contraseña

### Almacenamiento en Redis

**Archivo:** `/apps/api/src/utils/tokenStore.ts`

Los códigos se almacenan temporalmente en Redis, **NO en PostgreSQL**.

**Clave:**
```
recovery:{email}
```

**Datos:**
```typescript
{
  codigo,      // 6 dígitos
  intentos,    // Contador intentos fallidos
  creadoEn     // ISO timestamp
}
```

**TTL:** 15 minutos | **Máx intentos:** 5

---

### Seguridad

- **Máximo 5 intentos fallidos**
- **Al superar 5** → Código eliminado automáticamente
- **Usuario debe solicitar nuevo código**
- **TTL automático 15 minutos**

---

### Flujo Completo

```
Usuario → "Olvidé mi contraseña"
    ↓
POST /api/auth/olvide-contrasena
    Body: { correo }
    ↓
Backend:
  1. Verifica usuario existe en PostgreSQL
  2. Genera código 6 dígitos
  3. Guarda en Redis (TTL 15 min)
  4. Envía email
    ↓
Usuario ingresa código + nueva contraseña
    ↓
POST /api/auth/restablecer-contrasena
    Body: { correo, codigo, nuevaContrasena }
    ↓
Backend:
  1. Busca en Redis
  2. Verifica código (máx 5 intentos)
  3. Hash nueva contraseña
  4. Actualiza PostgreSQL
  5. Elimina código de Redis
    ↓
Response: { success: true }
```

**Funciones:** `guardarCodigoRecuperacion()`, `verificarCodigoRecuperacion()`, etc.

---

## 🔄 Cambio de Modo (Personal ↔ Comercial)

### Endpoints

| Endpoint | Propósito |
|----------|-----------|
| `PATCH /api/auth/modo` | Cambiar modo activo |
| `GET /api/auth/modo-info` | Obtener info modo actual |

### Flujo

```
Usuario → Toggle modo
    ↓
PATCH /api/auth/modo
    Body: { modoDeseado: 'personal' | 'comercial' }
    ↓
Backend:
  1. Verifica tiene_modo_comercial = true
  2. Actualiza modo_activo
  3. Genera NUEVO access token
    ↓
Response: { success: true, accessToken (nuevo), usuario }
    ↓
Frontend:
  1. Guarda nuevo access token
  2. Actualiza store
  3. Redirige a /inicio o /business
```

**Nota:** Refresh token NO cambia, solo access token.

### 🔒 Candado: negocio fuera de circulación

Un negocio **fuera de circulación** (`activo=false`: suspensión manual, impago o cancelación)
**no puede entrar al modo comercial** — bloqueo PAREJO, sin distinguir motivo. Dos capas backend,
ambas reusan `estaFueraDeCirculacion()` del helper central `utils/estadoNegocio.ts`:

- **`cambiarModo`** (`auth.service.ts`): antes de actualizar `modo_activo`, si el destino es
  `comercial` y el negocio está fuera, devuelve `{ success:false, message, code:403 }`. Ese
  `message` lo muestra el frontend como **toast** (`ToggleModoUsuario` / `ModoGuard` ya hacen
  `notificar.error(error.message)`). El cancelado además ya queda bloqueado por
  `tieneModoComercial=false`; el candado cierra el **suspendido**, que lo mantiene en `true`.
- **`verificarNegocio`** (`negocio.middleware.ts`): bloquea con `403`
  (`code: 'NEGOCIO_FUERA_CIRCULACION'`) **todas** las rutas de Business Studio de golpe (dueño y
  gerente), cerrando una sesión que ya estuviera abierta. ScanYA tiene su propio candado.

> El **pago de reactivación** vivirá a nivel app desde el **modo personal** (feature aparte),
> así un negocio fuera puede pagar sin entrar al comercial. Aparte, se envía una
> **notificación persistente** al dueño (ver `Notificaciones.md` → "Negocio fuera de circulación").

---

## 🛡️ Middlewares de Autorización

> ✅ **VERIFICADO:** `/apps/api/src/middleware/` (30 Enero 2026)

### Middlewares Implementados

**1. `verificarToken()`**
- Archivo: `/apps/api/src/middleware/auth.ts`
- Propósito: Valida JWT, inyecta `req.usuario`
- Uso: Rutas protegidas

**2. `verificarTokenOpcional()`**
- Archivo: `/apps/api/src/middleware/authOpcional.middleware.ts`
- Propósito: Rutas públicas con funcionalidad extra si hay auth
- Uso: Feed de ofertas, perfiles públicos

**3. `verificarNegocio()`**
- Archivo: `/apps/api/src/middleware/negocio.middleware.ts`
- Propósito: Valida que usuario tenga negocio **y que esté en circulación**
- Inyecta: `req.negocioId`
- Candado: si el negocio está fuera de circulación (`estaFueraDeCirculacion`), responde `403`
  (`code: 'NEGOCIO_FUERA_CIRCULACION'`) — cierra todo Business Studio (dueño y gerente).

**4. `validarAccesoSucursal()`**
- Archivo: `/apps/api/src/middleware/sucursal.middleware.ts`
- Propósito: Gerentes solo acceden a su sucursal asignada
- Validación: Dueños → todas, Gerentes → solo asignada

**5. `verificarTokenScanYA()`**
- Archivo: `/apps/api/src/middleware/scanyaAuth.middleware.ts`
- Propósito: Auth específica ScanYA (tokens `sy_*`)
- Uso: Rutas `/api/scanya/*`

**6. `validarModo()`**
- Archivo: `/apps/api/src/middleware/validarModo.ts`
- Propósito: Valida modo activo (personal/comercial)

**7. `rateLimiter`**
- Archivo: `/apps/api/src/middleware/rateLimiter.ts`
- Propósito: Rate limiting con Redis
- Uso: Login, refresh, password reset

---

### Cadena de Middlewares

**Ejemplo:**
```typescript
router.post(
  '/articulos',
  verificarToken,           // 1. Usuario autenticado
  verificarNegocio,         // 2. Tiene negocio
  validarAccesoSucursal,    // 3. Acceso a sucursal
  crearArticuloController   // 4. Lógica
);
```

---

## 🔒 Seguridad

### Hashing de Contraseñas

**Algoritmo:** bcrypt con 12 salt rounds  
**Tiempo:** ~250-350ms

**Por qué bcrypt:**
- ✅ Diseñado para passwords
- ✅ Salt automático
- ✅ Resistente a GPU attacks
- ✅ Ajustable

---

### Validaciones de Contraseña

**Requisitos:**
- Longitud: 8+ caracteres
- Al menos 1 letra
- Al menos 1 número

**Validación:** Zod schema en `/apps/api/src/validations/auth.schema.ts`

---

### Rate Limiting (Redis)

**Implementación:** `/apps/api/src/middleware/rateLimiter.ts`

**Límites:**
- **Login:** 5 intentos / 15 min por IP
- **Refresh:** 10 intentos / 15 min
- **Password reset:** 3 intentos / hora
- **Verificación email:** 3 intentos / 15 min

**Storage:** Redis (Upstash)

---

### CORS

**Configuración:** `/apps/api/src/middleware/cors.ts`

**Origen:** Frontend URL (`.env`)  
**Credenciales:** Habilitado  
**Métodos:** GET, POST, PUT, DELETE, PATCH

---

### Helmet.js

**Configuración:** `/apps/api/src/middleware/helmet.ts`

**Headers:**
- Content Security Policy
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Referrer-Policy
- Permissions-Policy

---

## 📂 Ubicación de Archivos

> ✅ **VERIFICADO:** 06 Mayo 2026

### Backend

```
apps/api/src/
├── controllers/auth.controller.ts       ✅ 20 funciones
├── services/auth.service.ts             ✅ Lógica de negocio
├── middleware/
│   ├── auth.ts                          ✅ JWT principal
│   ├── authOpcional.middleware.ts       ✅ Auth opcional
│   ├── scanyaAuth.middleware.ts         ✅ Auth ScanYA
│   ├── negocio.middleware.ts            ✅ Validación negocio
│   ├── sucursal.middleware.ts           ✅ Validación sucursal
│   ├── validarModo.ts                   ✅ Validación modo
│   └── rateLimiter.ts                   ✅ Rate limiting
├── routes/auth.routes.ts                ✅ 20 endpoints
├── utils/
│   ├── jwt.ts                           ✅ Tokens AnunciaYA
│   ├── jwtScanYA.ts                     ✅ Tokens ScanYA
│   ├── email.ts                         ✅ Envío emails
│   └── tokenStore.ts                    ✅ Redis (829 líneas)
└── validations/auth.schema.ts           ✅ Schemas Zod
```

---

### Frontend

```
apps/web/src/
├── components/auth/
│   ├── ModalLogin.tsx                   ✅ Modal principal
│   ├── ModalInactividad.tsx             ✅ Inactividad
│   ├── vistas/
│   │   ├── VistaLogin.tsx               ✅ Login + CTA "Crear cuenta con este correo"
│   │   ├── Vista2FA.tsx                 ✅ 2FA
│   │   └── VistaRecuperar.tsx           ✅ Recuperar password
│   └── registro/
│       ├── FormularioRegistro.tsx       ✅ Formulario (autoComplete + correoInicial)
│       ├── ModalBienvenida.tsx          ✅ Post-registro
│       └── ModalVerificacionEmail.tsx   ✅ Verificar email
├── components/public/
│   ├── HeaderPublico.tsx                ✅ Header compartido (artículo, oferta, marketplace)
│   └── FooterPublico.tsx                ✅ Footer compartido
├── pages/
│   ├── public/
│   │   ├── PaginaRegistro.tsx           ✅ Registro (lee location.state.correo)
│   │   ├── PaginaLanding.tsx            ✅ Landing
│   │   ├── PaginaArticuloPublico.tsx    ✅ Artículo público (catálogo negocios)
│   │   ├── PaginaOfertaPublico.tsx      ✅ Oferta pública
│   │   └── PaginaArticuloMarketplacePublico.tsx ✅ Artículo público marketplace
│   └── private/PaginaInicio.tsx         ✅ Dashboard
├── stores/useAuthStore.ts               ✅ Zustand store
├── services/
│   ├── authService.ts                   ✅ API calls
│   └── api.ts                           ✅ Axios + interceptor (RespuestaAPI.errorCode)
└── utils/tokenUtils.ts                  ✅ Utilidades tokens
```

#### Header / Footer públicos compartidos (v5.2)

A partir de **v5.2** el header y footer de las páginas públicas (sin sesión)
viven en `apps/web/src/components/public/` y se reutilizan en las **3 páginas
públicas** que tiene la app:

1. `PaginaArticuloPublico` — link compartido de un artículo del catálogo de un
   negocio (`/p/articulo/:articuloId`).
2. `PaginaOfertaPublico` — link compartido de una oferta (`/p/oferta/:ofertaId`).
3. `PaginaArticuloMarketplacePublico` — link compartido de un artículo del
   MarketPlace (`/p/articulo-marketplace/:articuloId`).

`HeaderPublico` incluye logo AnunciaYA (clic → `/`), beneficios en desktop
(*¡Únete gratis!*, *Acumula puntos comprando*, *Canjea por recompensas*) y CTA
"Registrarse" que lleva a `/registro`. `FooterPublico` incluye logo + slogan +
copyright + redes sociales (3 columnas en desktop, 2 líneas en móvil).

Antes de v5.2 el código del header/footer estaba **duplicado** entre
`PaginaArticuloPublico` y `PaginaOfertaPublico`, y `PaginaArticuloMarketplacePublico`
tenía un header genérico distinto. La extracción unifica los 3 destinos.

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Por qué JWT en lugar de sesiones?

**JWT (elegido):**
- ✅ Stateless
- ✅ Escala horizontalmente
- ✅ Funciona en móvil/PWA
- ✅ Menos queries a BD

**Trade-off:** Access token no se invalida inmediatamente.  
**Mitigación:** Refresh tokens en Redis para revocación.

---

### 2. ¿Por qué refresh tokens en Redis?

**Con refresh tokens en Redis:**
- ✅ Revocación inmediata
- ✅ Auditoría completa
- ✅ Multi-dispositivo
- ✅ TTL automático
- ✅ Rotación de tokens

**Sin ellos:**
- ❌ Logout no cierra sesión realmente
- ❌ Tokens robados siguen funcionando

---

### 3. ¿Por qué 15 minutos para access token?

**15 minutos (elegido):**
- ✅ Balance seguridad/UX
- ✅ Renovación transparente
- ✅ Ventana corta para ataques
- ✅ Cambios de permisos se aplican rápido

**5 min:** Muy corto (muchas renovaciones)  
**24h:** Inseguro (token robado = peligro prolongado)

---

### 4. ¿Por qué tokens separados AnunciaYA vs ScanYA?

**Problema:**
- Empleado usa ScanYA 8 horas
- Dueño usa AnunciaYA en paralelo
- Logout en uno NO debe afectar al otro

**Solución:**
- `ay_*` → 15 min
- `sy_*` → 12 horas

**Beneficios:**
- ✅ Sesiones 100% aisladas
- ✅ Diferentes duraciones
- ✅ Diferentes permisos

---

### 5. ¿Por qué bcrypt y no otro algoritmo?

**bcrypt elegido:**
- ✅ Diseñado para passwords
- ✅ Salt automático
- ✅ Resistente a GPU attacks
- ✅ Batalla-tested

**Alternativas descartadas:**
- **MD5/SHA-256:** Demasiado rápidos
- **Argon2:** Menos soporte Node.js
- **PBKDF2:** Más complejo

**Configuración:** 12 rounds = ~250-350ms (balance perfecto)

---

### 6. ¿Por qué verificación de email obligatoria?

**Razones:**
- ✅ Previene emails falsos
- ✅ Canal de comunicación válido
- ✅ Reduce spam/bots
- ✅ Permite recuperación de contraseña

**Storage:** Redis (`registro_pendiente:{email}`)

---

### 7. ¿Por qué 2FA opcional?

**Razones:**
- ✅ UX: No todos necesitan máxima seguridad
- ✅ Flexibilidad según perfil de riesgo
- ✅ 2FA obligatorio reduce registros
- ✅ Tipo de app: Marketplace local, no banca

**Recomendado para:** Dueños de negocio, usuarios con saldo alto

---

### 8. ¿Por qué Redis para códigos temporales?

**Redis elegido:**
- ✅ TTL automático (auto-eliminación)
- ✅ Ultra rápido (<1ms)
- ✅ Atomic operations
- ✅ No requiere limpieza manual

**PostgreSQL descartado:**
- ❌ Más lento (disco vs memoria)
- ❌ Requiere cronjobs para limpieza

**Casos de uso:** Códigos verificación/recuperación, registros pendientes, sesiones, rate limiting

---

## 📚 Referencias

### Código Fuente Verificado

- **Endpoints:** `/apps/api/src/routes/auth.routes.ts` (21 endpoints)
- **Storage Redis:** `/apps/api/src/utils/tokenStore.ts` (829 líneas)
- **Lógica:** `/apps/api/src/services/auth.service.ts`
- **Tokens:** `/apps/api/src/utils/jwt.ts` y `jwtScanYA.ts`
- **Esquema SQL:** Tabla `usuarios` (verificado contra pgAdmin)

### Documentación Técnica

- `05_AnunciaYA_Fase3_Backend_Auth.md`
- `06_AnunciaYA_Fase4_Frontend.md`
- `AnunciaYA_Auth_Implementacion.md`

---

## ✅ Verificación

**Última verificación:** 30 Enero 2026

**Archivos verificados:** 30/30 ✅

**Endpoints verificados:** 21/21 ✅

**Storage verificado:**
- Redis keys (tokenStore.ts - 829 líneas) ✅
- PostgreSQL tables (esquema SQL real) ✅

**Campos verificados:**
- doble_factor_secreto ✅
- doble_factor_habilitado ✅
- doble_factor_confirmado ✅

**Métodos de verificación:**
1. Estructura de carpetas (`estructura-nueva.txt`)
2. `auth.routes.ts` (línea por línea)
3. `auth_service.ts` (verificación storage)
4. `tokenStore.ts` (829 líneas)
5. Esquema SQL PostgreSQL (pgAdmin)

---

**Última actualización:** 30 Enero 2026  
**Autor:** Equipo AnunciaYA  
**Versión:** 5.1 (Completamente Verificada - Campos 2FA Corregidos)
