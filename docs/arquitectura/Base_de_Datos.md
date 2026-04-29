# 🗄️ AnunciaYA v3.0 - Arquitectura de Base de Datos

**Última actualización:** 30 Enero 2026  
**Versión:** 3.0 (Reescritura Verificada)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura conceptual** de la base de datos:
- ✅ Stack tecnológico y justificación
- ✅ Nombres verificados de las 65 tablas (extraídos de producción)
- ✅ Propósito y organización de cada tabla
- ✅ Decisiones arquitectónicas

**NO incluye:**
- ❌ Código SQL detallado (consultar migrations en código)
- ❌ Índices, constraints, triggers específicos (consultar BD producción)
- ❌ Definición exacta de columnas (consultar schema en Supabase)

**Para detalles técnicos exactos:**
- Ver: Base de datos en Supabase
- Ver: `/packages/backend/src/db/migrations/`
- Ver: Schema con pgAdmin4

---

## 🎯 Stack de Bases de Datos

### PostgreSQL (Principal)
- **Proveedor:** Supabase (Free Tier)
- **Versión:** 15.x
- **Extensiones:** PostGIS 3.3, pgcrypto, uuid-ossp
- **Propósito:** Datos estructurados con integridad referencial

### MongoDB (Mensajería)
- **Proveedor:** MongoDB Atlas (M0 Free)
- **Propósito:** ChatYA - conversaciones y mensajes flexibles

### Redis (Caché)
- **Proveedor:** Upstash (Free Tier)
- **Propósito:** Sesiones, rate limiting, caché de queries

---

## 📊 PostgreSQL - Tablas Verificadas (65)

> ✅ Nombres extraídos de producción (Supabase) - 30 Enero 2026

### 1. Sistema y Seguridad (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `configuracion_sistema` | Parámetros globales de la aplicación |
| `alertas_seguridad` | Log de eventos de seguridad |
| `bitacora_uso` | Auditoría de acciones importantes |

---

### 2. Usuarios y Autenticación (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `usuarios` | Cuentas de usuario (personal y comercial) |
| `usuario_codigos_respaldo` | Códigos 2FA de respaldo |
| `direcciones_usuario` | Direcciones de envío guardadas |

---

### 3. Negocios (13 tablas)

| Tabla | Propósito |
|-------|-----------|
| `negocios` | Marca madre del negocio |
| `negocio_sucursales` | Ubicaciones físicas con PostGIS |
| `negocio_horarios` | Horarios de operación |
| `negocio_metodos_pago` | Métodos de pago aceptados |
| `negocio_galeria` | Fotos del negocio |
| `negocio_modulos` | Funcionalidades habilitadas |
| `negocio_preferencias` | Configuraciones personalizadas |
| `negocio_citas_config` | Configuración sistema de citas |
| `negocio_citas_fechas_especificas` | Excepciones de horario |
| `categorias_negocio` | Categorías principales |
| `subcategorias_negocio` | Subcategorías por categoría |
| `regiones` | Regiones/ciudades disponibles |
| `resenas` | Reseñas de clientes |

---

### 4. Empleados (2 tablas)

| Tabla | Propósito |
|-------|-----------|
| `empleados` | Staff con acceso a ScanYA |
| `empleado_horarios` | Turnos asignados |

---

### 5. Catálogo y Artículos (5 tablas)

| Tabla | Propósito |
|-------|-----------|
| `articulos` | Productos/servicios del negocio |
| `articulo_sucursales` | Disponibilidad por sucursal |
| `articulo_inventario` | Control de stock |
| `articulo_variantes` | Variantes (talla, color, sabor) |
| `articulo_variante_opciones` | Opciones de cada variante |

---

### 6. Ofertas y Cupones (5 tablas)

| Tabla | Propósito |
|-------|-----------|
| `ofertas` | Ofertas creadas por negocios |
| `cupones` | Cupones de descuento |
| `cupon_usos` | Historial de cupones canjeados |
| `cupon_galeria` | Imágenes de cupones |
| `cupon_usuarios` | Asignación de cupones a usuarios |

---

### 7. Marketplace (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `marketplace` | Publicaciones compra-venta usuarios |
| `categorias_marketplace` | Categorías de productos |
| `asignacion_subcategorias` | Relación categorías-subcategorías |

---

### 8. Carrito y Pedidos (4 tablas)

| Tabla | Propósito |
|-------|-----------|
| `carrito` | Carritos de compra activos |
| `carrito_articulos` | Artículos en cada carrito |
| `pedidos` | Pedidos completados |
| `pedido_articulos` | Detalle de productos por pedido |

---

### 9. Sistema de Puntos CardYA (5 tablas)

| Tabla | Propósito |
|-------|-----------|
| `puntos_configuracion` | Config del sistema de puntos por negocio |
| `puntos_billetera` | Puntos acumulados usuario-negocio |
| `puntos_transacciones` | Registro de todas las transacciones |
| `recompensas` | Catálogo de recompensas canjeables |
| `transacciones_evidencia` | Evidencia de transacciones (fotos) |

---

### 10. Vouchers (1 tabla)

| Tabla | Propósito |
|-------|-----------|
| `vouchers_canje` | Vouchers canjeados por puntos |

---

### 11. ScanYA - Punto de Venta (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `scanya_turnos` | Sesiones de trabajo (abrir/cerrar caja) |
| `scanya_configuracion` | Configuración operacional por negocio |
| `scanya_recordatorios` | Ventas guardadas offline |

---

### 12. Interacciones (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `votos` | Likes/saves de usuarios en contenido |
| `guardados` | Items favoritos guardados |
| `metricas_entidad` | Métricas agregadas por entidad |
| `metricas_usuario` | Métricas agregadas por usuario |

**Nota:** Sistema separado `votos` (público) vs `guardados` (privado) siguiendo SRP.

---

### 13. Promociones (3 tablas)

| Tabla | Propósito |
|-------|-----------|
| `promociones_temporales` | Promociones con fecha límite |
| `promociones_pagadas` | Promociones de pago (destacados) |
| `promociones_usadas` | Historial de uso de promociones |

---

### 14. Servicios (1 tabla)

| Tabla | Propósito |
|-------|-----------|
| `bolsa_trabajo` | Publicaciones de la sección pública Servicios (modos Ofrezco/Solicito). Cubre servicios e intangibles, incluye empleos. |

> **Enums:** `chat_conv.contexto_tipo`, `notificaciones.referencia_tipo`,
> `votos.entity_type`, `guardados.entity_type` y `metricas_entidad.entity_type`
> aceptan `'servicio'`; `promociones_pagadas.tipo_entidad` acepta `'servicio'`;
> `notificaciones.tipo` acepta `'nuevo_servicio'`.

---

### 16. Citas (1 tabla)

| Tabla | Propósito |
|-------|-----------|
| `citas` | Citas agendadas entre usuarios y negocios |

---

### 17. Planes y Suscripciones (4 tablas)

| Tabla | Propósito |
|-------|-----------|
| `planes` | Planes de suscripción disponibles |
| `plan` | Suscripciones activas de usuarios |
| `plan_reglas` | Límites y reglas por plan |
| `planes_anuncios` | Planes para anuncios destacados |

---

### 18. Embajadores (2 tablas)

| Tabla | Propósito |
|-------|-----------|
| `embajadores` | Usuarios embajadores del sistema |
| `embajador_comisiones` | Comisiones generadas |

---

## 🌍 PostGIS - Geolocalización

**Extensión:** PostGIS 3.3

**Tablas con geometría:**
- `negocio_sucursales`: Campo `ubicacion` tipo `POINT(geography)`

**Funcionalidad principal:**
- Búsqueda de negocios cercanos por radio
- Cálculo de distancia usuario-negocio
- Ordenamiento por cercanía

**Funciones PostGIS usadas:**
- `ST_DWithin()` - Filtrar por radio
- `ST_Distance()` - Calcular distancia
- `ST_X()`, `ST_Y()` - Extraer coordenadas

---

## 📝 ChatYA (PostgreSQL)

ChatYA vive en PostgreSQL con Drizzle. Las conversaciones y mensajes viven en el mismo schema público que el resto del sistema. Detalle técnico: `docs/arquitectura/ChatYA.md`.

Tablas principales:

| Tabla | Propósito |
|-------|-----------|
| `chat_conv` | Conversaciones 1:1 con `participante1_id` / `participante2_id`, `contexto_tipo`, `emisor_sucursal_id` |
| `chat_mensajes` | Mensajes individuales con texto/imagen/audio/documento/ubicación, reacciones, palomitas |

**Tiempo real:** Socket.io con rooms por usuario. La BD persiste en paralelo (no en el critical path).

**Archivos del chat:** Cloudflare R2 (prefixes `chat/imagenes/`, `chat/documentos/`, `chat/audio/`).

---

## 🔴 Redis - Caché y Sesiones

**Proveedor:** Upstash (Free Tier)

### Estructura de Keys

```
# Sesiones
session:{userId}:{deviceId} → TTL 30 días

# Rate Limiting  
ratelimit:api:{ip} → TTL 1 hora
ratelimit:login:{email} → TTL 15 minutos

# Caché de Queries
cache:negocios:{ciudad}:{categoria} → TTL 5 minutos
cache:ofertas:{sucursalId} → TTL 2 minutos

# Locks Distribuidos
lock:puntos:{userId}:{negocioId} → TTL 10 segundos
```

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Por qué PostgreSQL como principal?

**Razones:**
- ✅ Datos altamente estructurados (negocios, transacciones, usuarios)
- ✅ Relaciones complejas N:N (negocios-categorías, artículos-sucursales)
- ✅ ACID compliance (transacciones de puntos requieren consistencia)
- ✅ PostGIS para búsquedas geográficas precisas
- ✅ Integridad referencial con foreign keys
- ✅ Triggers para sincronización automática de métricas

**Ejemplos de uso:**
- Sistema de puntos CardYA (transacciones críticas)
- Relaciones negocio-sucursales-empleados-productos
- Búsquedas geográficas con PostGIS

---

### 2. ¿Por qué ChatYA está en PostgreSQL?

**Razones:**
- ✅ **Una sola BD** que mantener, respaldar y monitorear
- ✅ **Joins reales** con `usuarios`, `negocios`, `sucursales` (etiqueta "Matriz", contextos `oferta`/`marketplace`/`servicio`)
- ✅ Drizzle ORM ya en uso en el resto del proyecto
- ✅ La frecuencia de escritura del chat 1:1 está muy por debajo del límite de PostgreSQL en Supabase
- ✅ Multimedia vive en R2, no en la BD — la fila solo guarda la URL

---

### 3. ¿Por qué Redis para caché?

**Razones:**
- ✅ In-memory = ultra rápido (<1ms)
- ✅ TTL automático (expiración de caché)
- ✅ Atomic operations (rate limiting sin race conditions)
- ✅ Sesiones de usuario multi-dispositivo
- ✅ Locks distribuidos para operaciones concurrentes
- ✅ Bajo costo operacional (Upstash Free)

**Ejemplos de uso:**
- Caché de búsquedas de negocios cercanos
- Rate limiting de API (100 req/min por IP)
- Sesiones JWT con refresh tokens
- Locks para transacciones de puntos concurrentes

---

## 📚 Documentación Relacionada

**Para detalles técnicos:**
- Ver migrations en: `/packages/backend/src/db/migrations/`
- Ver schema Drizzle en: `/packages/backend/src/db/schema/`
- Ver base de datos en: Supabase Dashboard

**Documentos técnicos específicos:**
- `PostgreSQL_Usuarios.html` (schema tabla usuarios)
- `PostgreSQL_NegociosLocales.html` (schema negocios)
- `PostgreSQL_Articulos.html` (schema catálogo)
- `PostgreSQL_Cupones_Ofertas.html` (schema cupones)
- `PostgreSQL_Pedidos_Carrito.html` (schema pedidos)
- `PostgreSQL_Publicaciones.html` (schema marketplace)
- `PostgreSQL_Citas_Empleados.html` (schema citas)
- `PostgreSQL_Limites_Planes.html` (schema planes)

---

## ✅ Verificación de Tablas

**Método de verificación:**
```sql
-- Ejecutado en Supabase (30 Enero 2026)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Resultado: 65 tablas (sin contar spatial_ref_sys de PostGIS)
```

**Estado:** ✅ Todas las 65 tablas verificadas en producción

---

**Última actualización:** 30 Enero 2026  
**Autor:** Equipo AnunciaYA  
**Versión:** 3.0 (Reescritura Verificada)
