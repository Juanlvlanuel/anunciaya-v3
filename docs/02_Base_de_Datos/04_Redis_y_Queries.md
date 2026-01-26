# 🔴 AnunciaYA v3.0 - Redis y Queries Comunes

**Última Actualización:** 25 Diciembre 2024  
**Versión del Documento:** 1.1 (Actualizado con sistema multi-sucursal)

---

## 📋 Índice

1. [Redis - Estructura](#redis---estructura)
2. [Queries PostgreSQL Comunes](#queries-postgresql-comunes)
3. [Queries MongoDB Comunes](#queries-mongodb-comunes)
4. [Comandos Drizzle ORM](#comandos-drizzle-orm)

---

## Redis - Estructura

### Resumen

| Métrica | Valor |
|---------|-------|
| Tipo | Key-Value Store |
| Cliente | ioredis |
| Hosting | Upstash (serverless) |
| Uso principal | Sesiones, tokens temporales, cache |

### Conexión

```typescript
// apps/api/src/db/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

export const redis = new Redis(REDIS_URL);

// Verificar conexión
redis.on('connect', () => console.log('✅ Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis error:', err));
```

---

### Estructuras de Datos

#### 1. Sesiones de Usuario

```
Key:    session:{userId}:{sessionId}
Value:  JSON
TTL:    7 días (604800 segundos)
```

**Estructura del valor:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
  "dispositivo": "iPhone",
  "navegador": "Safari",
  "createdAt": "2024-12-26T10:30:00.000Z",
  "lastActivity": "2024-12-26T15:45:00.000Z"
}
```

**Operaciones:**
```typescript
// Crear sesión
await redis.setex(
  `session:${userId}:${sessionId}`,
  604800,  // 7 días
  JSON.stringify(sessionData)
);

// Obtener sesión
const session = await redis.get(`session:${userId}:${sessionId}`);

// Eliminar sesión (logout)
await redis.del(`session:${userId}:${sessionId}`);

// Obtener todas las sesiones de un usuario
const keys = await redis.keys(`session:${userId}:*`);

// Eliminar todas las sesiones (logout de todos los dispositivos)
const keys = await redis.keys(`session:${userId}:*`);
if (keys.length > 0) {
  await redis.del(...keys);
}
```

---

#### 2. Códigos de Verificación de Email

```
Key:    verificacion:{email}
Value:  JSON
TTL:    15 minutos (900 segundos)
```

**Estructura del valor:**
```json
{
  "codigo": "123456",
  "intentos": 0,
  "maxIntentos": 5,
  "datosUsuario": {
    "nombre": "Juan",
    "apellidos": "Pérez",
    "correo": "juan@email.com",
    "contrasenaHash": "$2b$10$...",
    "tipoRegistro": "personal"
  },
  "createdAt": "2024-12-26T10:30:00.000Z"
}
```

**Operaciones:**
```typescript
// Guardar código de verificación
await redis.setex(
  `verificacion:${email}`,
  900,  // 15 minutos
  JSON.stringify({
    codigo: generarCodigo6Digitos(),
    intentos: 0,
    maxIntentos: 5,
    datosUsuario,
    createdAt: new Date().toISOString()
  })
);

// Verificar código
const data = await redis.get(`verificacion:${email}`);
if (!data) throw new Error('Código expirado');

const { codigo, intentos, maxIntentos, datosUsuario } = JSON.parse(data);

if (intentos >= maxIntentos) {
  await redis.del(`verificacion:${email}`);
  throw new Error('Demasiados intentos');
}

if (codigoIngresado !== codigo) {
  // Incrementar intentos
  await redis.setex(
    `verificacion:${email}`,
    await redis.ttl(`verificacion:${email}`),
    JSON.stringify({ ...JSON.parse(data), intentos: intentos + 1 })
  );
  throw new Error('Código incorrecto');
}

// Código correcto - eliminar y crear usuario
await redis.del(`verificacion:${email}`);
// ... crear usuario con datosUsuario
```

---

#### 3. Códigos de Recuperación de Contraseña

```
Key:    recuperacion:{email}
Value:  JSON
TTL:    15 minutos (900 segundos)
```

**Estructura del valor:**
```json
{
  "codigo": "789012",
  "intentos": 0,
  "maxIntentos": 5,
  "createdAt": "2024-12-26T10:30:00.000Z"
}
```

**Operaciones:**
```typescript
// Solicitar recuperación
await redis.setex(
  `recuperacion:${email}`,
  900,
  JSON.stringify({
    codigo: generarCodigo6Digitos(),
    intentos: 0,
    maxIntentos: 5,
    createdAt: new Date().toISOString()
  })
);

// Verificar código de recuperación
const data = await redis.get(`recuperacion:${email}`);
// Similar a verificación...
```

---

#### 4. Token Temporal 2FA

```
Key:    2fa_temp:{tokenTemporal}
Value:  userId (string)
TTL:    5 minutos (300 segundos)
```

**Uso:**
Cuando un usuario con 2FA habilitado hace login, no recibe el access token inmediatamente. En su lugar, recibe un token temporal que debe usar junto con el código TOTP.

```typescript
// Después de verificar contraseña, si tiene 2FA
const tokenTemporal = generarTokenAleatorio();
await redis.setex(
  `2fa_temp:${tokenTemporal}`,
  300,  // 5 minutos
  userId
);

return { require2FA: true, tempToken: tokenTemporal };

// Al verificar código TOTP
const userId = await redis.get(`2fa_temp:${tempToken}`);
if (!userId) throw new Error('Token expirado');

// Verificar código TOTP...
await redis.del(`2fa_temp:${tempToken}`);
// Generar tokens de acceso normales
```

---

#### 5. Rate Limiting (Opcional)

```
Key:    ratelimit:{ip}:{endpoint}
Value:  contador (número)
TTL:    1 minuto (60 segundos)
```

```typescript
// Verificar rate limit
const key = `ratelimit:${ip}:${endpoint}`;
const count = await redis.incr(key);

if (count === 1) {
  await redis.expire(key, 60);  // Primera petición, establecer TTL
}

if (count > MAX_REQUESTS_PER_MINUTE) {
  throw new Error('Demasiadas peticiones');
}
```

---

### Resumen de Keys

| Pattern | TTL | Propósito |
|---------|-----|-----------|
| `session:{userId}:{sessionId}` | 7 días | Sesiones activas |
| `verificacion:{email}` | 15 min | Verificar email nuevo |
| `recuperacion:{email}` | 15 min | Recuperar contraseña |
| `2fa_temp:{token}` | 5 min | Token temporal 2FA |
| `ratelimit:{ip}:{endpoint}` | 1 min | Rate limiting |

---

## Queries PostgreSQL Comunes

### Usuarios

```typescript
// Buscar usuario por email
const usuario = await db.select()
  .from(usuarios)
  .where(eq(usuarios.correo, email))
  .limit(1);

// Buscar usuario por ID
const usuario = await db.select()
  .from(usuarios)
  .where(eq(usuarios.id, userId))
  .limit(1);

// Actualizar usuario
await db.update(usuarios)
  .set({ 
    nombre: 'Nuevo Nombre',
    updatedAt: new Date()
  })
  .where(eq(usuarios.id, userId));
```

### Negocios

```typescript
// Buscar negocio por usuario
const negocio = await db.select()
  .from(negocios)
  .where(eq(negocios.usuarioId, userId))
  .limit(1);

// Buscar negocio por slug
const negocio = await db.select()
  .from(negocios)
  .where(eq(negocios.slug, slug))
  .limit(1);

// Negocios activos con datos de usuario
const negociosActivos = await db.select({
  id: negocios.id,
  nombre: negocios.nombre,
  logoUrl: negocios.logoUrl,
  dueno: usuarios.nombre
})
.from(negocios)
.innerJoin(usuarios, eq(negocios.usuarioId, usuarios.id))
.where(eq(negocios.estado, 'activo'));
```

### Búsqueda Geográfica (PostGIS)

```typescript
// Sucursales en radio de X metros (la ubicación ahora está en sucursales)
const sucursalesCercanas = await db.execute(sql`
  SELECT 
    s.id as sucursal_id,
    s.nombre as sucursal_nombre,
    n.id as negocio_id,
    n.nombre as negocio_nombre,
    n.logo_url,
    s.direccion,
    s.telefono,
    ST_Distance(
      s.ubicacion,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) as distancia_metros
  FROM negocio_sucursales s
  INNER JOIN negocios n ON s.negocio_id = n.id
  WHERE 
    n.activo = true
    AND s.activa = true
    AND ST_DWithin(
      s.ubicacion,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radioMetros}
    )
  ORDER BY distancia_metros ASC
  LIMIT ${limite}
`);

// Negocio con su sucursal principal
const negocioConSucursal = await db.select({
  negocio: negocios,
  sucursalPrincipal: negocioSucursales
})
.from(negocios)
.innerJoin(negocioSucursales, eq(negocios.id, negocioSucursales.negocioId))
.where(
  and(
    eq(negocios.id, negocioId),
    eq(negocioSucursales.esPrincipal, true)
  )
);
```

### Artículos

```typescript
// Artículos de un negocio
const articulos = await db.select()
  .from(articulos)
  .where(
    and(
      eq(articulos.negocioId, negocioId),
      eq(articulos.activo, true)
    )
  )
  .orderBy(articulos.orden);

// Artículo con inventario
const articuloConStock = await db.select({
  id: articulos.id,
  nombre: articulos.nombre,
  precio: articulos.precio,
  stock: articuloInventario.stockActual
})
.from(articulos)
.leftJoin(articuloInventario, eq(articulos.id, articuloInventario.articuloId))
.where(eq(articulos.id, articuloId));
```

### Sistema de Puntos

```typescript
// Saldo de puntos de usuario en un negocio
const billetera = await db.select()
  .from(puntosBilletera)
  .where(
    and(
      eq(puntosBilletera.usuarioId, userId),
      eq(puntosBilletera.negocioId, negocioId)
    )
  )
  .limit(1);

// Historial de transacciones con datos de sucursal
const transacciones = await db.select({
  id: puntosTransacciones.id,
  montoCompra: puntosTransacciones.montoCompra,
  puntosOtorgados: puntosTransacciones.puntosOtorgados,
  estado: puntosTransacciones.estado,
  createdAt: puntosTransacciones.createdAt,
  sucursal: negocioSucursales.nombre
})
.from(puntosTransacciones)
.innerJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
.where(eq(puntosTransacciones.billeteraId, billeteraId))
.orderBy(desc(puntosTransacciones.createdAt))
.limit(20);

// Registrar ganancia de puntos (con sucursal)
await db.transaction(async (tx) => {
  // Crear transacción
  await tx.insert(puntosTransacciones).values({
    billeteraId,
    negocioId,
    sucursalId,        // ⬅️ Ahora obligatorio
    clienteId: userId,
    empleadoId,        // Opcional: quien registró
    montoCompra: monto,
    puntosOtorgados: puntosGanados,
    tipo: 'presencial',
    estado: 'pendiente',
    expiraConfirmacion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  });
  
  // Actualizar saldo (campos actualizados)
  await tx.update(puntosBilletera)
    .set({ 
      puntosDisponibles: sql`puntos_disponibles + ${puntosGanados}`,
      puntosAcumuladosTotal: sql`puntos_acumulados_total + ${puntosGanados}`,
      ultimaActividad: new Date()
    })
    .where(eq(puntosBilletera.id, billeteraId));
});

// Transacciones por sucursal (para reportes)
const transaccionesSucursal = await db.select({
  fecha: sql`DATE(created_at)`,
  total: sql`SUM(monto_compra)`,
  puntos: sql`SUM(puntos_otorgados)`,
  cantidad: sql`COUNT(*)`
})
.from(puntosTransacciones)
.where(
  and(
    eq(puntosTransacciones.sucursalId, sucursalId),
    eq(puntosTransacciones.estado, 'confirmado')
  )
)
.groupBy(sql`DATE(created_at)`)
.orderBy(desc(sql`DATE(created_at)`));
```

### Categorías

```typescript
// Categorías con subcategorías
const categoriasConSub = await db.select({
  id: categoriasNegocio.id,
  nombre: categoriasNegocio.nombre,
  slug: categoriasNegocio.slug,
  icono: categoriasNegocio.icono
})
.from(categoriasNegocio)
.where(eq(categoriasNegocio.activa, true))
.orderBy(categoriasNegocio.orden);

// Subcategorías de una categoría
const subcategorias = await db.select()
  .from(subcategoriasNegocio)
  .where(
    and(
      eq(subcategoriasNegocio.categoriaId, categoriaId),
      eq(subcategoriasNegocio.activa, true)
    )
  )
  .orderBy(subcategoriasNegocio.orden);
```

---

## Queries MongoDB Comunes

### Chats

```typescript
// Obtener chats de un usuario
const chats = await Chat.find({
  participantes: userId,
  deletedFor: { $ne: userId }
})
.sort({ ultimoMensajeAt: -1 })
.limit(20)
.lean();

// Chats con un negocio específico
const chatNegocio = await Chat.findOne({
  participantes: userId,
  negocioId: negocioId
});

// Crear chat nuevo
const nuevoChat = await Chat.create({
  tipo: 'privado',
  contextoChat: tipoChat,
  participantes: [userId1, userId2],
  usuarioA: userId1,
  usuarioB: userId2,
  negocioId: negocioId || null
});
```

### Mensajes

```typescript
// Mensajes de un chat (paginados)
const mensajes = await Mensaje.find({
  chat: chatId,
  deletedFor: { $ne: userId }
})
.sort({ createdAt: -1 })
.skip(page * 20)
.limit(20)
.lean();

// Enviar mensaje
const mensaje = await Mensaje.create({
  chat: chatId,
  emisor: userId,
  texto: contenido,
  archivos: archivosAdjuntos
});

// Actualizar último mensaje en chat
await Chat.findByIdAndUpdate(chatId, {
  ultimoMensaje: contenido.substring(0, 100),
  ultimoMensajeAt: new Date(),
  $inc: { [`unreadCount.${receptorId}`]: 1 }
});

// Marcar como leído
await Mensaje.updateMany(
  {
    chat: chatId,
    emisor: { $ne: userId },
    leidoPor: { $ne: userId }
  },
  { $addToSet: { leidoPor: userId } }
);

// Resetear contador
await Chat.findByIdAndUpdate(chatId, {
  $set: { [`unreadCount.${userId}`]: 0 }
});
```

### Contactos

```typescript
// Obtener contactos
const contactos = await Contacto.find({
  usuarioId,
  bloqueado: false
})
.sort({ favorito: -1, ultimaInteraccion: -1 });

// Agregar contacto
await Contacto.create({
  usuarioId,
  tipo: 'personal',
  contactoId: contactoUserId,
  apodo: ''
});

// Bloquear contacto
await Contacto.findOneAndUpdate(
  { usuarioId, contactoId },
  { bloqueado: true }
);
```

---

## Comandos Drizzle ORM

### Desarrollo

```bash
# Generar migración desde cambios en schema
pnpm drizzle-kit generate

# Ver cambios sin aplicar
pnpm drizzle-kit check

# Aplicar migraciones
pnpm drizzle-kit migrate

# Push directo a BD (desarrollo)
pnpm drizzle-kit push

# Abrir Drizzle Studio (GUI)
pnpm drizzle-kit studio
```

### Introspección

```bash
# Generar schema desde BD existente
pnpm drizzle-kit introspect

# Generar tipos TypeScript
pnpm drizzle-kit generate
```

### Configuración

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schemas/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Transformación automática de nombres
  casing: 'snake_case',
});
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
