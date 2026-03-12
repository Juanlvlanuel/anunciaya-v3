# 🗄️ AnunciaYA v3.0 - Arquitectura de Datos

**Última Actualización:** 25 Diciembre 2024  
**Versión del Documento:** 1.1 (Actualizado con schema real)

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura Híbrida](#arquitectura-híbrida)
3. [PostgreSQL - Resumen](#postgresql---resumen)
4. [MongoDB - Resumen](#mongodb---resumen)
5. [Redis - Resumen](#redis---resumen)
6. [Relaciones entre Bases de Datos](#relaciones-entre-bases-de-datos)
7. [Diagrama de Entidades](#diagrama-de-entidades)

---

## Visión General

AnunciaYA utiliza una **arquitectura híbrida** de bases de datos, donde cada tecnología se usa para lo que mejor hace:

```
┌─────────────────────────────────────────────────────────────────┐
│                  ARQUITECTURA DE DATOS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │    MongoDB      │  │     Redis       │ │
│  │   + PostGIS     │  │    Atlas        │  │    Upstash      │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ 60 Tablas       │  │ 3 Colecciones   │  │ Key-Value       │ │
│  │ Datos struct.   │  │ ChatYA          │  │ Sesiones        │ │
│  │ Relaciones      │  │ Mensajes        │  │ Tokens temp     │ │
│  │ Geolocalización │  │ Real-time       │  │ Cache           │ │
│  │ Multi-sucursal  │  │ Flexible        │  │ Rate limiting   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│         │                    │                    │             │
│         │                    │                    │             │
│         └────────────────────┴────────────────────┘             │
│                              │                                  │
│                    ┌─────────┴─────────┐                        │
│                    │     Backend       │                        │
│                    │  Drizzle ORM      │                        │
│                    │  Mongoose         │                        │
│                    │  ioredis          │                        │
│                    └───────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura Híbrida

### ¿Por qué tres bases de datos?

| Base de Datos | Tipo de Datos | Razón |
|---------------|---------------|-------|
| **PostgreSQL** | Usuarios, negocios, transacciones | Relaciones complejas, integridad ACID, geolocalización |
| **MongoDB** | Chat, mensajes | Flexibilidad, escalabilidad, real-time |
| **Redis** | Sesiones, tokens, cache | Velocidad extrema, TTL automático |

### Casos de Uso Específicos

| Operación | Base de Datos | Razón |
|-----------|---------------|-------|
| Login usuario | PostgreSQL | Datos críticos, integridad |
| Buscar negocios cercanos | PostgreSQL + PostGIS | Índices espaciales |
| Enviar mensaje | MongoDB | Escrituras rápidas, flexible |
| Verificar sesión | Redis | Ultra rápido, TTL |
| Guardar código OTP | Redis | Expira automáticamente |
| Registrar venta | PostgreSQL | Transacción ACID |

---

## PostgreSQL - Resumen

### Estadísticas

| Métrica | Valor |
|---------|-------|
| Total de tablas | 60 |
| Extensión | PostGIS 3.4 |
| ORM | Drizzle |
| Hosting | Railway |

### Arquitectura Multi-Sucursal

AnunciaYA implementa un sistema donde cada negocio puede tener múltiples sucursales:

```
Usuario (1) ──► Negocio (1) ──► Sucursales (N)
                    │
                    ├── Horarios → por sucursal
                    ├── Empleados → por sucursal
                    ├── Métodos de pago → por sucursal o global
                    ├── Galería → por sucursal o global
                    └── Transacciones → registran sucursal
```

### Agrupación de Tablas (15 grupos)

| Grupo | Tablas | Descripción |
|-------|--------|-------------|
| Usuarios y Auth | 3 | Cuentas, códigos 2FA, direcciones |
| Negocios | 12 | Perfil, sucursales, categorías, galería, horarios, métodos pago |
| Sistema de Citas | 3 | Citas, configuración, fechas especiales |
| Empleados | 2 | Staff, horarios de trabajo |
| Marketplace | 6 | Publicaciones, categorías, artículos, inventario |
| Carrito y Pedidos | 4 | Carrito, pedidos, artículos |
| Sistema de Puntos | 7 | CardYA, ScanYA, billetera, transacciones |
| Cupones y Ofertas | 5 | Cupones, ofertas, galería, usos |
| Dinámicas | 3 | Rifas, participaciones, premios |
| Bolsa de Trabajo | 1 | Vacantes y servicios |
| Planes y Suscripciones | 6 | Planes, reglas, promociones |
| Embajadores | 3 | Regiones, embajadores, comisiones |
| Métricas y Sistema | 4 | Estadísticas, bitácora, configuración |
| PostGIS | 1 | Referencias espaciales |

### Tablas Principales

```
usuarios ────────────┬──────────────────────────────────────────────┐
                     │                                              │
                     ▼                                              │
              negocios ◄──────────────────────────────────┐        │
                     │                                     │        │
        ┌────────────┼────────────┬───────────┐           │        │
        ▼            ▼            ▼           ▼           │        │
   articulos    cupones     ofertas    dinamicas          │        │
        │            │            │           │           │        │
        ▼            ▼            ▼           ▼           │        │
puntos_transacciones │      cupon_usos   participaciones  │        │
        │            │                                    │        │
        ▼            ▼                                    │        │
 puntos_billetera ◄──┴────────────────────────────────────┘        │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
```

---

## MongoDB - Resumen

### Estadísticas

| Métrica | Valor |
|---------|-------|
| Total de colecciones | 3 |
| ODM | Mongoose |
| Hosting | MongoDB Atlas (M0 Free) |

### Colecciones

| Colección | Propósito | Documentos típicos |
|-----------|-----------|-------------------|
| `chats` | Conversaciones | Participantes, último mensaje, estados |
| `mensajes` | Contenido de mensajes | Texto, archivos, reacciones |
| `contactos` | Lista de contactos | Relaciones entre usuarios |

### Relación con PostgreSQL

```
┌─────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL                                   │
├─────────────────────────────────────────────────────────────────┤
│  usuarios                    negocios                           │
│  ─────────                   ─────────                          │
│  id (UUID) ◄────────────────────────────────────────┐           │
│  nombre                      id (UUID) ◄────────────┼──┐        │
│  apellido                    usuario_id             │  │        │
│  avatar                      nombre                 │  │        │
│  ...                         logo                   │  │        │
│                              ...                    │  │        │
└──────────────────────────────────┬──────────────────┼──┼────────┘
                                   │                  │  │
                    ┌──────────────┴──────────────────┘  │
                    │                                    │
                    ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB - ChatYA                            │
├─────────────────────────────────────────────────────────────────┤
│  chats                                                          │
│  ─────                                                          │
│  _id (ObjectId)                                                 │
│  participantes: [String] ──────────► usuarios.id                │
│  negocioId: String ────────────────► negocios.id                │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  mensajes                                                       │
│  ────────                                                       │
│  _id (ObjectId)                                                 │
│  chat (ObjectId) ──────────────────► chats._id (interno Mongo)  │
│  emisor: String ───────────────────► usuarios.id                │
│  negocioId: String ────────────────► negocios.id                │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  contactos                                                      │
│  ─────────                                                      │
│  _id (ObjectId)                                                 │
│  usuarioId: String ────────────────► usuarios.id                │
│  contactoId: String ───────────────► usuarios.id                │
│  negocioId: String ────────────────► negocios.id                │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Nota importante:** Los IDs de PostgreSQL (UUIDs) se almacenan como **String** en MongoDB, no como ObjectId.

---

## Redis - Resumen

### Estadísticas

| Métrica | Valor |
|---------|-------|
| Tipo | Key-Value |
| Cliente | ioredis |
| Hosting | Upstash (serverless) |

### Estructuras de Datos

| Key Pattern | Valor | TTL | Uso |
|-------------|-------|-----|-----|
| `session:{userId}:{sessionId}` | JSON (token, IP, UA) | 7 días | Sesiones activas |
| `verificacion:{email}` | JSON (código, intentos) | 15 min | Verificar email |
| `recuperacion:{email}` | JSON (código, intentos) | 15 min | Recuperar contraseña |
| `2fa_temp:{token}` | userId | 5 min | Token temporal 2FA |

### Ejemplo de Estructura

```
Key: session:a1b2c3d4-e5f6-7890-abcd-ef1234567890:sess_xyz123
Value: {
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "dispositivo": "iPhone",
  "createdAt": "2024-12-26T10:30:00Z"
}
TTL: 604800 (7 días en segundos)
```

---

## Relaciones entre Bases de Datos

### Flujo de Datos Típico

```
Usuario hace login
        │
        ▼
┌───────────────────┐
│    PostgreSQL     │  ← Verificar credenciales
│    (usuarios)     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│      Redis        │  ← Crear sesión
│   (session:*)     │
└───────────────────┘
        │
        ▼
Usuario entra al chat
        │
        ▼
┌───────────────────┐
│     MongoDB       │  ← Cargar conversaciones
│     (chats)       │
└───────────────────┘
        │
        ▼
Usuario envía mensaje
        │
        ▼
┌───────────────────┐
│     MongoDB       │  ← Guardar mensaje
│    (mensajes)     │
└───────────────────┘
```

### Consistencia de Datos

| Escenario | Estrategia |
|-----------|------------|
| Usuario eliminado | Marcar como inactivo en PostgreSQL, mensajes permanecen en MongoDB |
| Negocio eliminado | Soft delete, chats mantienen historial |
| Sesión expirada | Redis elimina automáticamente (TTL) |

---

## Diagrama de Entidades

### Entidades Principales y sus Relaciones

```
                            ┌─────────────┐
                            │   USUARIO   │
                            │  (personal) │
                            └──────┬──────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
       │   NEGOCIO   │      │   CARRITO   │      │ MARKETPLACE │
       │ (comercial) │      │             │      │(publicación)│
       └──────┬──────┘      └──────┬──────┘      └─────────────┘
              │                    │
    ┌─────────┼─────────┐         │
    │         │         │         │
    ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ARTÍCULO│ │ CUPÓN │ │OFERTA │ │PEDIDO │
└───┬───┘ └───┬───┘ └───────┘ └───────┘
    │         │
    ▼         ▼
┌─────────────────────────────────────┐
│        PUNTOS (CardYA/ScanYA)       │
├─────────────────────────────────────┤
│ • puntos_configuracion              │
│ • puntos_billetera                  │
│ • puntos_transacciones              │
│ • recompensas                       │
│ • vouchers_canje                    │
└─────────────────────────────────────┘
```

### Entidades de Soporte

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  EMPLEADO   │     │  DINÁMICA   │     │   BOLSA     │
│   (staff)   │     │   (rifa)    │     │  TRABAJO    │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    PLAN     │     │  EMBAJADOR  │     │  MÉTRICAS   │
│(suscripción)│     │ (comisiones)│     │ (analytics) │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Conexiones Configuradas

### PostgreSQL (Drizzle)

```typescript
// apps/api/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### MongoDB (Mongoose)

```typescript
// apps/api/src/db/mongo.ts
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI!);
```

### Redis (ioredis)

```typescript
// apps/api/src/db/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!);
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
