# 🗄️ AnunciaYA v3.0 - Fase 2: Base de Datos

**Estado:** ✅ 100% Completado  
**Fecha de Finalización:** Diciembre 2024

---

## 1. Objetivo de la Fase

Diseñar e implementar la estructura completa de bases de datos:
- PostgreSQL con PostGIS para datos relacionales y geolocalización
- MongoDB para chat en tiempo real
- Redis para cache y sesiones
- ORM/ODM configurados (Drizzle + Mongoose)

---

## 2. Arquitectura de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                  ARQUITECTURA DE DATOS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │  MongoDB    │  │   Redis     │         │
│  │  + PostGIS  │  │   Atlas     │  │   Local     │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ 58 Tablas   │  │ 4 Colecciones│ │ Key-Value   │         │
│  │ Relaciones  │  │ ChatYA      │  │ Sesiones    │         │
│  │ Geolocation │  │ Mensajes    │  │ Tokens temp │         │
│  │ PostGIS     │  │ Real-time   │  │ Cache       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│        │                │                │                  │
│        └────────────────┴────────────────┘                  │
│                         │                                   │
│                    Drizzle ORM                              │
│                    Mongoose                                 │
│                    ioredis                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. PostgreSQL - Total de Tablas: 58

Todas las tablas se encuentran en el schema `public` de PostgreSQL.

---

## 4. Catálogo de Tablas

### 4.1 Usuarios y Autenticación (3 tablas)

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Cuentas de usuario (personal y comercial), datos de perfil, autenticación |
| `usuario_codigos_respaldo` | Códigos de respaldo para autenticación 2FA |
| `direcciones_usuario` | Direcciones de envío/facturación guardadas por el usuario |

### 4.2 Negocios (10 tablas)

| Tabla | Descripción |
|-------|-------------|
| `negocios` | Perfil del negocio, ubicación geográfica, datos de contacto |
| `categorias_negocio` | Catálogo de categorías principales para negocios |
| `subcategorias_negocio` | Subcategorías dentro de cada categoría principal |
| `negocio_galeria` | Fotos e imágenes del negocio |
| `negocio_horarios` | Horarios de operación del negocio |
| `negocio_metodos_pago` | Métodos de pago aceptados por el negocio |
| `negocio_modulos` | Módulos/funcionalidades habilitadas para cada negocio |
| `negocio_preferencias` | Configuraciones y preferencias personalizadas del negocio |
| `resenas` | Reseñas y calificaciones de clientes hacia negocios |
| `votos` | Sistema de votos/likes para contenido |

### 4.3 Sistema de Citas (3 tablas)

| Tabla | Descripción |
|-------|-------------|
| `citas` | Citas agendadas entre usuarios y negocios |
| `negocio_citas_config` | Configuración del sistema de citas por negocio |
| `negocio_citas_fechas_especificas` | Fechas especiales (días festivos, excepciones de horario) |

### 4.4 Empleados (2 tablas)

| Tabla | Descripción |
|-------|-------------|
| `empleados` | Staff registrado del negocio con acceso a ScanYA |
| `empleado_horarios` | Horarios de trabajo asignados a cada empleado |

### 4.5 Marketplace (6 tablas)

| Tabla | Descripción |
|-------|-------------|
| `marketplace` | Publicaciones de compra-venta de usuarios personales |
| `categorias_marketplace` | Categorías para productos del marketplace |
| `articulos` | Productos/servicios del catálogo de negocios |
| `articulo_inventario` | Control de stock e inventario por artículo |
| `articulo_variantes` | Variantes de producto (talla, color, sabor, etc.) |
| `articulo_variante_opciones` | Opciones disponibles para cada tipo de variante |

### 4.6 Carrito y Pedidos (4 tablas)

| Tabla | Descripción |
|-------|-------------|
| `carrito` | Carrito de compras del usuario |
| `carrito_articulos` | Artículos agregados al carrito |
| `pedidos` | Órdenes de compra realizadas |
| `pedido_articulos` | Artículos incluidos en cada pedido |

### 4.7 Sistema de Puntos - CardYA/ScanYA (7 tablas)

| Tabla | Descripción |
|-------|-------------|
| `puntos_configuracion` | Configuración de puntos por negocio (ratio, expiración, horarios) |
| `puntos_billetera` | Saldo de puntos de cada usuario en cada negocio |
| `puntos_transacciones` | Historial de compras que generaron puntos |
| `transacciones_evidencia` | Fotos de tickets/comprobantes de compra |
| `recompensas` | Catálogo de premios canjeables por negocio |
| `vouchers_canje` | Vouchers generados al canjear puntos por recompensas |
| `alertas_seguridad` | Alertas de actividad sospechosa o irregular |

### 4.8 Cupones y Ofertas (5 tablas)

| Tabla | Descripción |
|-------|-------------|
| `cupones` | Cupones de descuento creados por negocios |
| `cupon_galeria` | Imágenes promocionales de cupones |
| `cupon_usuarios` | Cupones guardados/reclamados por usuarios |
| `cupon_usos` | Historial de cupones canjeados |
| `ofertas` | Ofertas y promociones especiales de negocios |

### 4.9 Dinámicas - Sorteos y Rifas (3 tablas)

| Tabla | Descripción |
|-------|-------------|
| `dinamicas` | Sorteos, rifas y concursos organizados |
| `dinamica_participaciones` | Participaciones de usuarios en dinámicas |
| `dinamica_premios` | Premios disponibles en cada dinámica |

### 4.10 Bolsa de Trabajo (1 tabla)

| Tabla | Descripción |
|-------|-------------|
| `bolsa_trabajo` | Vacantes publicadas por negocios y servicios ofrecidos por usuarios |

### 4.11 Planes y Suscripciones (6 tablas)

| Tabla | Descripción |
|-------|-------------|
| `planes` | Catálogo de planes disponibles (Comercial $449, PRO $99) |
| `plan_reglas` | Reglas y límites específicos por plan |
| `planes_anuncios` | Planes para promocionar/destacar contenido |
| `promociones_pagadas` | Contenido promocionado activo |
| `promociones_temporales` | Códigos promocionales con vigencia limitada |
| `promociones_usadas` | Historial de códigos promocionales utilizados |

### 4.12 Embajadores (3 tablas)

| Tabla | Descripción |
|-------|-------------|
| `regiones` | Zonas geográficas para asignación de embajadores |
| `embajadores` | Representantes comerciales que reclutan negocios |
| `embajador_comisiones` | Comisiones ganadas por embajadores (30% inicial, 15% recurrente) |

### 4.13 Métricas y Sistema (4 tablas)

| Tabla | Descripción |
|-------|-------------|
| `metricas_usuario` | Estadísticas de actividad del usuario |
| `metricas_entidad` | Métricas de negocios, publicaciones y otros elementos |
| `bitacora_uso` | Log de acciones importantes del sistema |
| `configuracion_sistema` | Configuraciones globales editables de la plataforma |

### 4.14 PostGIS - Sistema (1 tabla)

| Tabla | Descripción |
|-------|-------------|
| `spatial_ref_sys` | Tabla del sistema PostGIS para referencias espaciales (geolocalización) |

---

## 5. Campos con PostGIS

### 5.1 Tipo Geography

```sql
-- En tabla negocios
ubicacion GEOGRAPHY(POINT, 4326)

-- Ejemplo de inserción
INSERT INTO negocios (nombre, ubicacion) VALUES (
  'Tacos El Güero',
  ST_SetSRID(ST_MakePoint(-113.5465, 31.3122), 4326)::geography
);
```

### 5.2 Consultas Geográficas

```sql
-- Negocios en radio de 5km
SELECT * FROM negocios
WHERE ST_DWithin(
  ubicacion,
  ST_SetSRID(ST_MakePoint(-113.5465, 31.3122), 4326)::geography,
  5000  -- metros
)
ORDER BY ST_Distance(
  ubicacion,
  ST_SetSRID(ST_MakePoint(-113.5465, 31.3122), 4326)::geography
);
```

### 5.3 Índice GiST

```sql
CREATE INDEX idx_negocios_ubicacion ON negocios USING GIST (ubicacion);
```

---

## 6. MongoDB - ChatYA

### 6.1 Colecciones (4)

| Colección | Propósito |
|-----------|-----------|
| `chats` | Conversaciones entre usuarios |
| `mensajes` | Mensajes individuales |
| `contactos` | Lista de contactos por usuario |
| `interacciones` | Métricas de engagement |

### 6.2 Modelo: Chat

```typescript
// apps/api/src/db/models/Chat.ts
const chatSchema = new Schema({
  participantes: [{
    usuarioId: { type: String, required: true },
    nombre: String,
    avatar: String,
    tipo: { type: String, enum: ['personal', 'comercial'] }
  }],
  tipo: {
    type: String,
    enum: ['directo', 'negocio', 'soporte'],
    default: 'directo'
  },
  negocioId: String,
  ultimoMensaje: {
    contenido: String,
    enviadoPor: String,
    fecha: Date
  },
  noLeidos: {
    type: Map,
    of: Number,
    default: {}
  },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### 6.3 Modelo: Mensaje

```typescript
// apps/api/src/db/models/Mensaje.ts
const mensajeSchema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  enviadoPor: { type: String, required: true },
  contenido: { type: String, required: true },
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'archivo', 'ubicacion', 'producto'],
    default: 'texto'
  },
  metadata: {
    archivoUrl: String,
    productoId: String,
    ubicacion: { lat: Number, lng: Number }
  },
  leido: { type: Boolean, default: false },
  leidoPor: [String],
  eliminado: { type: Boolean, default: false }
}, {
  timestamps: true
});
```

### 6.4 Modelo: Contacto

```typescript
// apps/api/src/db/models/Contacto.ts
const contactoSchema = new Schema({
  usuarioId: { type: String, required: true },
  contactos: [{
    usuarioId: String,
    nombre: String,
    avatar: String,
    tipo: String,
    agregadoEn: { type: Date, default: Date.now },
    bloqueado: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});
```

---

## 7. Redis - Estructura

### 7.1 Sesiones de Usuario

```
Key: session:{userId}:{sessionId}
Value: {
  "refreshToken": "...",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-12-18T..."
}
TTL: 7 días
```

### 7.2 Códigos de Verificación

```
Key: verificacion:{email}
Value: {
  "codigo": "123456",
  "intentos": 0,
  "datosUsuario": {...}
}
TTL: 15 minutos
```

### 7.3 Códigos de Recuperación

```
Key: recuperacion:{email}
Value: {
  "codigo": "123456",
  "intentos": 0
}
TTL: 15 minutos
```

### 7.4 Token Temporal 2FA

```
Key: 2fa_temp:{tokenTemporal}
Value: {userId}
TTL: 5 minutos
```

---

## 8. Drizzle ORM - Configuración

### 8.1 drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schemas/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 8.2 Conexión (db/index.ts)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
```

### 8.3 Ejemplo de Schema Drizzle

```typescript
// apps/api/src/db/schemas/schema.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellidos: varchar('apellidos', { length: 100 }).notNull(),
  correo: varchar('correo', { length: 255 }).notNull().unique(),
  contrasenaHash: text('contrasena_hash'),
  telefono: varchar('telefono', { length: 20 }),
  perfil: varchar('perfil', { length: 20 }).default('personal'),
  membresia: integer('membresia').default(1),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  correoVerificado: boolean('correo_verificado').default(false),
  autenticadoPorGoogle: boolean('autenticado_por_google').default(false),
  dobleFactorHabilitado: boolean('doble_factor_habilitado').default(false),
  dobleFactorSecreto: text('doble_factor_secreto'),
  estado: varchar('estado', { length: 20 }).default('activo'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 9. Triggers Implementados

### 9.1 Actualizar updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER trigger_usuarios_updated
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 9.2 Calcular Puntos Automáticamente

```sql
CREATE OR REPLACE FUNCTION calcular_puntos_transaccion()
RETURNS TRIGGER AS $$
DECLARE
  config puntos_configuracion%ROWTYPE;
  puntos_ganados INTEGER;
BEGIN
  SELECT * INTO config
  FROM puntos_configuracion
  WHERE negocio_id = NEW.negocio_id;
  
  puntos_ganados := FLOOR(NEW.monto / config.ratio_pesos_punto);
  NEW.puntos_calculados := puntos_ganados;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Comandos Drizzle

```bash
# Generar migración desde schema
pnpm drizzle-kit generate

# Aplicar migraciones
pnpm drizzle-kit migrate

# Introspect (sincronizar schema desde BD)
pnpm drizzle-kit introspect

# Studio (GUI visual)
pnpm drizzle-kit studio
```

---

## 11. Verificación de Fase Completada

### Checklist ✅

- [x] PostgreSQL 16 + PostGIS 3.4 instalado
- [x] 58 tablas creadas
- [x] Relaciones definidas
- [x] Índices GiST para geolocalización
- [x] MongoDB Atlas configurado
- [x] 4 colecciones de ChatYA definidas
- [x] Redis configurado
- [x] Drizzle ORM conectado
- [x] Mongoose conectado
- [x] ioredis conectado
- [x] Triggers implementados

---

*Fase 2 completada: Diciembre 2024*
