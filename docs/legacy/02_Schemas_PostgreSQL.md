# 🐘 AnunciaYA v3.0 - Schemas PostgreSQL

**Última Actualización:** 25 Diciembre 2024  
**Versión del Documento:** 1.1 (Actualizado con schema real)

---

## 📋 Índice

1. [Resumen](#resumen)
2. [Usuarios y Autenticación](#1-usuarios-y-autenticación)
3. [Negocios](#2-negocios)
4. [Sistema de Citas](#3-sistema-de-citas)
5. [Empleados](#4-empleados)
6. [Marketplace y Artículos](#5-marketplace-y-artículos)
7. [Carrito y Pedidos](#6-carrito-y-pedidos)
8. [Sistema de Puntos (CardYA/ScanYA)](#7-sistema-de-puntos)
9. [Cupones y Ofertas](#8-cupones-y-ofertas)
10. [Dinámicas (Rifas)](#9-dinámicas)
11. [Bolsa de Trabajo](#10-bolsa-de-trabajo)
12. [Planes y Suscripciones](#11-planes-y-suscripciones)
13. [Embajadores](#12-embajadores)
14. [Métricas y Sistema](#13-métricas-y-sistema)
15. [PostGIS](#14-postgis)

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total de tablas | 60 |
| Grupos de tablas | 15 |
| Extensión | PostGIS 3.4 |
| ORM | Drizzle |
| Schema | public |

### Arquitectura Multi-Sucursal

AnunciaYA implementa un **sistema multi-sucursal** donde:

```
Usuario (1) ──────► Negocio (1) ──────► Sucursales (N)
                         │
                         ├── Horarios van a nivel SUCURSAL
                         ├── Empleados van a nivel SUCURSAL
                         ├── Métodos de pago van a nivel SUCURSAL
                         ├── Galería puede ir a nivel SUCURSAL
                         └── Transacciones registran la SUCURSAL
```

**Regla clave:** Un negocio siempre tiene al menos una sucursal principal (`es_principal = true`).

### Convenciones

| Elemento | Convención |
|----------|------------|
| Nombres de tablas | snake_case, plural |
| Nombres de columnas | snake_case |
| Primary keys | `id` tipo UUID |
| Foreign keys | `{tabla}_id` |
| Timestamps | `created_at`, `updated_at` |
| Soft delete | `estado` o `activo` |

---

## 1. Usuarios y Autenticación

### 1.1 usuarios

Tabla principal de usuarios (personal y comercial).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK, auto-generado |
| `nombre` | VARCHAR(100) | NO | - | Nombre del usuario |
| `apellidos` | VARCHAR(100) | NO | - | Apellidos |
| `correo` | VARCHAR(255) | NO | - | Email único |
| `alias` | VARCHAR(35) | SÍ | - | Nombre de usuario único |
| `contrasena_hash` | VARCHAR(255) | SÍ | - | Hash bcrypt (null si OAuth) |
| `telefono` | VARCHAR(20) | SÍ | - | Teléfono de contacto |
| `ciudad` | VARCHAR(100) | SÍ | - | Ciudad del usuario |
| `fecha_nacimiento` | DATE | SÍ | - | Fecha de nacimiento |
| `genero` | VARCHAR(20) | SÍ | 'no_especificado' | 'masculino', 'femenino', 'otro' |
| `avatar_url` | TEXT | SÍ | - | URL de foto de perfil |
| `avatar_public_id` | VARCHAR(100) | SÍ | - | ID en Cloudinary |
| `avatar_thumb_public_id` | VARCHAR(100) | SÍ | - | ID thumbnail Cloudinary |
| **Autenticación** |
| `autenticado_por_google` | BOOLEAN | NO | false | Login con Google |
| `autenticado_por_facebook` | BOOLEAN | NO | false | Login con Facebook |
| `doble_factor_secreto` | VARCHAR(64) | SÍ | - | Secreto TOTP |
| `doble_factor_habilitado` | BOOLEAN | NO | false | 2FA activado |
| `doble_factor_confirmado` | BOOLEAN | NO | false | 2FA confirmado |
| `correo_verificado` | BOOLEAN | NO | false | Email verificado |
| `correo_verificado_at` | TIMESTAMP | SÍ | - | Fecha verificación |
| `telefono_verificado` | BOOLEAN | NO | false | Teléfono verificado |
| `codigo_verificacion` | VARCHAR(10) | SÍ | - | Código temporal |
| **Modo Personal/Comercial** |
| `perfil` | VARCHAR(20) | NO | 'personal' | Tipo de perfil |
| `membresia` | SMALLINT | NO | 1 | Nivel: 1=Free, 2=Plus, 3=Pro |
| `tiene_modo_comercial` | BOOLEAN | NO | false | ¿Pagó suscripción? |
| `modo_activo` | VARCHAR(20) | NO | 'personal' | 'personal' o 'comercial' |
| `negocio_id` | UUID | SÍ | - | FK → negocios (negocio activo) |
| **Stripe** |
| `stripe_customer_id` | VARCHAR(100) | SÍ | - | ID cliente en Stripe |
| `stripe_subscription_id` | VARCHAR(100) | SÍ | - | ID suscripción Stripe |
| **Embajadores** |
| `es_embajador` | BOOLEAN | NO | false | ¿Es embajador? |
| `referido_por` | UUID | SÍ | - | FK → embajadores |
| **Estado y Seguridad** |
| `estado` | VARCHAR(15) | NO | 'activo' | 'activo', 'inactivo', 'suspendido' |
| `fecha_cambio_estado` | TIMESTAMP | SÍ | now() | Última modificación estado |
| `motivo_cambio_estado` | VARCHAR(500) | SÍ | - | Razón del cambio |
| `fecha_reactivacion` | TIMESTAMP | SÍ | - | Fecha programada reactivación |
| `intentos_fallidos` | SMALLINT | NO | 0 | Intentos login fallidos |
| `bloqueado_hasta` | TIMESTAMP | SÍ | - | Bloqueo temporal |
| **Métricas** |
| `calificacion_promedio` | NUMERIC(2,1) | NO | 0 | Rating promedio |
| `total_calificaciones` | INTEGER | NO | 0 | Total de ratings |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Índices:**
- `usuarios_correo_unique` UNIQUE en `correo`
- `usuarios_alias_unique` UNIQUE en `alias` (WHERE alias IS NOT NULL)
- `idx_usuarios_correo_verificado` en `correo_verificado`
- `idx_usuarios_estado` en `estado`
- `idx_usuarios_modo_comercial` en (`tiene_modo_comercial`, `modo_activo`)
- `idx_usuarios_negocio_id` en `negocio_id`
- `idx_usuarios_stripe_customer_id` en `stripe_customer_id`
- `idx_usuarios_es_embajador` en `es_embajador` (WHERE es_embajador = true)

**Checks:**
- `usuarios_estado_check`: estado IN ('activo', 'inactivo', 'suspendido')
- `usuarios_genero_check`: genero IN ('masculino', 'femenino', 'otro', 'no_especificado')
- `usuarios_membresia_check`: membresia IN (1, 2, 3)
- `usuarios_perfil_check`: perfil IN ('personal', 'comercial')
- `usuarios_modo_activo_check`: modo_activo IN ('personal', 'comercial')
- `usuarios_modo_comercial_logico_check`: Si modo_activo='comercial' entonces tiene_modo_comercial=true

---

### 1.2 usuario_codigos_respaldo

Códigos de recuperación para 2FA.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | NO | FK → usuarios |
| `codigo_hash` | TEXT | NO | Código hasheado |
| `usado` | BOOLEAN | NO | Default: false |
| `created_at` | TIMESTAMP | NO | Fecha de creación |

---

### 1.3 direcciones_usuario

Direcciones guardadas por el usuario.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | NO | FK → usuarios |
| `alias` | VARCHAR(50) | SÍ | Ej: "Casa", "Oficina" |
| `calle` | VARCHAR(255) | NO | Dirección |
| `numero_exterior` | VARCHAR(20) | NO | Número |
| `numero_interior` | VARCHAR(20) | SÍ | Depto/Suite |
| `colonia` | VARCHAR(100) | NO | Colonia |
| `ciudad` | VARCHAR(100) | NO | Ciudad |
| `estado` | VARCHAR(100) | NO | Estado |
| `codigo_postal` | VARCHAR(10) | NO | CP |
| `referencias` | TEXT | SÍ | Referencias adicionales |
| `es_principal` | BOOLEAN | NO | Default: false |
| `created_at` | TIMESTAMP | NO | Fecha de creación |

---

## 2. Negocios

### 2.1 negocios

Tabla principal de negocios. **Nota:** Los datos de ubicación/contacto van en `negocio_sucursales`.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `usuario_id` | UUID | NO | - | FK → usuarios (dueño) |
| `nombre` | VARCHAR(120) | NO | - | Nombre del negocio |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `sitio_web` | VARCHAR(200) | SÍ | - | Sitio web |
| `logo_url` | TEXT | SÍ | - | URL del logo |
| `portada_url` | TEXT | SÍ | - | URL de portada |
| `requiere_direccion` | BOOLEAN | NO | true | ¿Negocio físico? |
| **Estado** |
| `activo` | BOOLEAN | NO | true | Negocio activo |
| `es_borrador` | BOOLEAN | NO | false | En proceso de creación |
| `verificado` | BOOLEAN | NO | false | Verificado por admin |
| `promocionado` | BOOLEAN | NO | false | En promoción |
| `promocion_expira` | TIMESTAMP | SÍ | - | Fin de promoción |
| **Onboarding** |
| `onboarding_completado` | BOOLEAN | NO | false | Wizard completado |
| **Sistema de Puntos** |
| `participa_puntos` | BOOLEAN | NO | true | Participa en CardYA |
| **Embajadores y Regiones** |
| `embajador_id` | UUID | SÍ | - | FK → embajadores |
| `region_id` | UUID | SÍ | - | FK → regiones |
| `meses_gratis_restantes` | INTEGER | NO | 0 | Meses gratis por embajador |
| `fecha_primer_pago` | DATE | SÍ | - | Primer pago de suscripción |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Índices:**
- `idx_negocios_usuario_id` en `usuario_id`
- `idx_negocios_activo` en `activo`
- `idx_negocios_es_borrador` en `es_borrador`
- `idx_negocios_onboarding` en `onboarding_completado` (WHERE = false)
- `idx_negocios_embajador` en `embajador_id` (WHERE IS NOT NULL)
- `idx_negocios_region` en `region_id` (WHERE IS NOT NULL)
- `idx_negocios_meses_gratis` en `meses_gratis_restantes` (WHERE > 0)

---

### 2.2 negocio_sucursales ⭐ NUEVA

Sucursales del negocio. **Cada negocio tiene mínimo una sucursal principal.**

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `nombre` | VARCHAR(100) | NO | - | Nombre de sucursal |
| `es_principal` | BOOLEAN | NO | false | ¿Es la sucursal principal? |
| **Ubicación** |
| `direccion` | VARCHAR(250) | SÍ | - | Dirección completa |
| `ciudad` | VARCHAR(120) | NO | - | Ciudad |
| `ubicacion` | GEOGRAPHY(POINT) | SÍ | - | Coordenadas PostGIS |
| **Contacto** |
| `telefono` | VARCHAR(20) | SÍ | - | Teléfono |
| `whatsapp` | VARCHAR(20) | SÍ | - | WhatsApp |
| `correo` | VARCHAR(100) | SÍ | - | Email |
| **Configuración** |
| `tiene_envio_domicilio` | BOOLEAN | NO | false | ¿Hace envíos? |
| `activa` | BOOLEAN | NO | true | Sucursal activa |
| **Métricas** |
| `calificacion_promedio` | NUMERIC(2,1) | NO | 0 | Rating promedio |
| `total_calificaciones` | INTEGER | NO | 0 | Total ratings |
| `total_likes` | INTEGER | NO | 0 | Total likes |
| `total_visitas` | INTEGER | NO | 0 | Total visitas |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Índices:**
- `idx_sucursales_negocio_id` en `negocio_id`
- `idx_sucursales_activa` en `activa`
- `idx_sucursales_ubicacion` GiST en `ubicacion`
- `idx_sucursales_calificacion` en `calificacion_promedio`
- `negocio_sucursales_principal_unique` UNIQUE en (`negocio_id`, `es_principal`) WHERE es_principal = true

**Importante:** Solo puede haber UNA sucursal principal por negocio (constraint único parcial).

---

### 2.3 categorias_negocio

Catálogo de categorías principales.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK (INTEGER) |
| `nombre` | VARCHAR(50) | NO | - | Nombre de la categoría |
| `icono` | VARCHAR(50) | SÍ | - | Nombre del icono |
| `orden` | SMALLINT | NO | 0 | Orden de visualización |
| `activa` | BOOLEAN | NO | true | Categoría activa |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |

**Índice único:** `categorias_negocio_nombre_key` en `nombre`

---

### 2.4 subcategorias_negocio

Subcategorías dentro de cada categoría.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK (INTEGER) |
| `categoria_id` | INTEGER | NO | - | FK → categorias_negocio |
| `nombre` | VARCHAR(100) | NO | - | Nombre |
| `orden` | SMALLINT | NO | 0 | Orden |
| `activa` | BOOLEAN | NO | true | Activa |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

---

### 2.5 asignacion_subcategorias ⭐ NUEVA

Relación N:M entre negocios y subcategorías. Un negocio puede tener múltiples subcategorías.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `subcategoria_id` | INTEGER | NO | - | FK → subcategorias_negocio |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Constraint:** UNIQUE en (`negocio_id`, `subcategoria_id`)

---

### 2.6 negocio_galeria

Imágenes del negocio. Pueden ser globales o por sucursal.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `sucursal_id` | UUID | SÍ | - | FK → negocio_sucursales (opcional) |
| `url` | TEXT | NO | - | URL de la imagen |
| `thumb_url` | TEXT | SÍ | - | URL thumbnail |
| `public_id` | VARCHAR(255) | SÍ | - | ID en Cloudinary |
| `thumb_public_id` | VARCHAR(255) | SÍ | - | ID thumbnail Cloudinary |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |

---

### 2.7 negocio_horarios

Horarios de operación **por sucursal**.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `sucursal_id` | UUID | NO | - | FK → negocio_sucursales |
| `dia_semana` | SMALLINT | NO | - | 0=Domingo, 6=Sábado |
| `abierto` | BOOLEAN | NO | true | ¿Abre este día? |
| `hora_apertura` | TIME | SÍ | - | Hora de apertura |
| `hora_cierre` | TIME | SÍ | - | Hora de cierre |
| `tiene_horario_comida` | BOOLEAN | NO | false | ¿Tiene descanso? |
| `comida_inicio` | TIME | SÍ | - | Inicio del descanso |
| `comida_fin` | TIME | SÍ | - | Fin del descanso |

**Constraint:** 
- UNIQUE en (`sucursal_id`, `dia_semana`)
- CHECK: `dia_semana >= 0 AND dia_semana <= 6`

---

### 2.8 negocio_metodos_pago

Métodos de pago aceptados. Pueden ser globales (negocio) o por sucursal.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `sucursal_id` | UUID | SÍ | - | FK → negocio_sucursales (opcional) |
| `tipo` | VARCHAR(30) | NO | - | Tipo de método |
| `activo` | BOOLEAN | NO | true | Método activo |
| `instrucciones` | TEXT | SÍ | - | Instrucciones de pago |

**Tipos válidos:** 'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia'

**Constraints:**
- `negocio_metodos_pago_global_unique`: UNIQUE (`negocio_id`, `tipo`) WHERE `sucursal_id IS NULL`
- `negocio_metodos_pago_sucursal_unique`: UNIQUE (`sucursal_id`, `tipo`) WHERE `sucursal_id IS NOT NULL`

---

### 2.9 negocio_modulos

Módulos habilitados por negocio.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `negocio_id` | UUID | NO | - | PK, FK → negocios |
| `catalogo_activo` | BOOLEAN | NO | true | Módulo catálogo |
| `pedidos_online_activo` | BOOLEAN | NO | false | Módulo pedidos |
| `citas_activo` | BOOLEAN | NO | false | Módulo citas |
| `reservaciones_activo` | BOOLEAN | NO | false | Módulo reservaciones |
| `apartados_activo` | BOOLEAN | NO | false | Módulo apartados |
| `empleados_activo` | BOOLEAN | NO | false | Módulo empleados |

**Nota:** PK es `negocio_id` (relación 1:1 con negocios)

---

### 2.10 negocio_preferencias

Preferencias del negocio.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `negocio_id` | UUID | NO | - | PK, FK → negocios |
| `tema_color` | VARCHAR(20) | SÍ | - | Color del tema |
| `mostrar_precios` | BOOLEAN | NO | true | Mostrar precios |
| `permitir_resenas` | BOOLEAN | NO | true | Permitir reseñas |
| `notificaciones_email` | BOOLEAN | NO | true | Notificar por email |
| `notificaciones_push` | BOOLEAN | NO | true | Notificar por push |

---

### 2.11 resenas

Reseñas bidireccionales (cliente → negocio o negocio → cliente).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | auto | PK |
| `autor_id` | UUID | NO | - | FK → usuarios (quien escribe) |
| `autor_tipo` | VARCHAR(10) | NO | - | 'cliente' o 'negocio' |
| `destino_tipo` | VARCHAR(10) | NO | - | 'negocio' o 'usuario' |
| `destino_id` | UUID | NO | - | ID del destino |
| `sucursal_id` | UUID | SÍ | - | FK → negocio_sucursales |
| `rating` | SMALLINT | SÍ | - | 1-5 estrellas |
| `texto` | TEXT | SÍ | - | Texto de reseña |
| `interaccion_tipo` | VARCHAR(10) | NO | - | 'pedido' |
| `interaccion_id` | UUID | NO | - | ID del pedido |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

**Checks:**
- `resenas_autor_tipo_check`: autor_tipo IN ('cliente', 'negocio')
- `resenas_destino_tipo_check`: destino_tipo IN ('negocio', 'usuario')
- `resenas_direccion_check`: Si autor=cliente → destino=negocio; Si autor=negocio → destino=usuario
- `resenas_rating_check`: rating BETWEEN 1 AND 5
- `resenas_contenido_check`: rating IS NOT NULL OR texto IS NOT NULL

---

### 2.12 votos

Sistema de likes/votos polimórfico.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | auto | PK |
| `user_id` | UUID | NO | - | FK → usuarios |
| `entity_type` | VARCHAR(20) | NO | - | Tipo de entidad |
| `entity_id` | UUID | NO | - | ID de la entidad |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Tipos de entidad válidos:** 'negocio', 'usuario', 'articulo', 'publicacion', 'rifa', 'subasta'

**Constraint:** UNIQUE en (`user_id`, `entity_type`, `entity_id`)

---

## 3. Sistema de Citas

### 3.1 citas

Citas agendadas.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `servicio_id` | UUID | NO | - | FK → articulos |
| `cliente_id` | UUID | NO | - | FK → usuarios |
| `empleado_id` | UUID | SÍ | - | FK → empleados |
| **Fecha y Hora** |
| `fecha` | DATE | NO | - | Fecha de la cita |
| `hora_inicio` | TIME | NO | - | Hora de inicio |
| `hora_fin` | TIME | SÍ | - | Hora de fin |
| `duracion` | INTEGER | SÍ | - | Duración en minutos |
| `hora_fin_real` | TIMESTAMP | SÍ | - | Hora real de fin |
| `terminada_manualmente` | BOOLEAN | NO | false | Terminada por negocio |
| **Datos del Cliente** |
| `nombre_cliente` | VARCHAR(200) | NO | - | Nombre del cliente |
| `telefono_cliente` | VARCHAR(20) | NO | - | Teléfono |
| `correo_cliente` | VARCHAR(150) | SÍ | - | Email |
| `precio_servicio` | NUMERIC(10,2) | NO | - | Precio del servicio |
| **Notas** |
| `notas_cliente` | TEXT | SÍ | - | Notas del cliente |
| `notas_negocio` | TEXT | SÍ | - | Notas internas |
| **Estado** |
| `estado` | VARCHAR(20) | NO | 'pendiente' | Estado de la cita |
| `creada_por` | VARCHAR(20) | NO | 'cliente' | 'cliente', 'negocio' |
| `origen_reserva` | VARCHAR(20) | NO | 'app' | 'web', 'app', 'telefono', 'presencial' |
| `es_bloqueo_horario` | BOOLEAN | NO | false | Bloqueo de horario |
| **Confirmación** |
| `confirmada_por_negocio` | BOOLEAN | NO | false | Confirmada |
| `fecha_confirmacion` | TIMESTAMP | SÍ | - | Fecha de confirmación |
| `codigo_confirmacion` | VARCHAR(10) | SÍ | - | Código único |
| **Cancelación** |
| `cancelada_por` | VARCHAR(20) | SÍ | - | 'cliente', 'negocio', 'sistema' |
| `motivo_cancelacion` | TEXT | SÍ | - | Razón de cancelación |
| `fecha_cancelacion` | TIMESTAMP | SÍ | - | Fecha de cancelación |
| **Recordatorios** |
| `recordatorio_enviado` | BOOLEAN | NO | false | Recordatorio enviado |
| `recordatorio_enviado_fecha` | TIMESTAMP | SÍ | - | Fecha de envío |
| **Calificación** |
| `calificacion` | SMALLINT | SÍ | - | 1-5 estrellas |
| `resena` | TEXT | SÍ | - | Reseña del cliente |
| `fecha_calificacion` | TIMESTAMP | SÍ | - | Fecha de calificación |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Estados válidos:** 'pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio'

**Índices:**
- `idx_citas_negocio_id` en `negocio_id`
- `idx_citas_cliente_id` en `cliente_id`
- `idx_citas_empleado_id` en `empleado_id`
- `idx_citas_fecha` en `fecha`
- `idx_citas_estado` en `estado`

---

### 3.2 negocio_citas_config

Configuración del sistema de citas por negocio.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `negocio_id` | UUID | NO | - | PK, FK → negocios |
| `duracion_default_minutos` | INTEGER | NO | 30 | Duración por defecto |
| `dias_anticipacion_maxima` | INTEGER | NO | 7 | Días máximo de anticipación |
| `horas_minimas_cancelacion` | INTEGER | NO | 2 | Horas mínimas para cancelar |
| `confirmar_automaticamente` | BOOLEAN | NO | false | Auto-confirmar citas |

---

### 3.3 negocio_citas_fechas_especificas

Excepciones de horario (días festivos, cerrados, etc.).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `fecha` | DATE | NO | - | Fecha específica |
| `cerrado` | BOOLEAN | NO | - | ¿Cerrado ese día? |
| `hora_apertura` | TIME | SÍ | - | Horario especial |
| `hora_cierre` | TIME | SÍ | - | Horario especial |
| `motivo` | VARCHAR(255) | SÍ | - | Razón |

---

## 4. Empleados

### 4.1 empleados

Staff del negocio. **Los empleados pertenecen a una sucursal específica.**

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `usuario_id` | UUID | NO | - | FK → usuarios (vinculado) |
| `sucursal_id` | UUID | SÍ | - | FK → negocio_sucursales |
| `nombre` | VARCHAR(200) | NO | - | Nombre completo |
| `especialidad` | VARCHAR(100) | SÍ | - | Especialidad/cargo |
| `telefono` | VARCHAR(20) | SÍ | - | Teléfono |
| `correo` | VARCHAR(150) | SÍ | - | Email |
| `foto_url` | TEXT | SÍ | - | URL de foto |
| **Permisos ScanYA** |
| `puede_registrar_ventas` | BOOLEAN | NO | true | Puede registrar ventas |
| `puede_procesar_canjes` | BOOLEAN | NO | true | Puede procesar canjes |
| `puede_ver_historial` | BOOLEAN | NO | true | Puede ver historial |
| `pin_acceso` | VARCHAR(4) | SÍ | - | PIN de 4 dígitos |
| **Métricas** |
| `total_citas_atendidas` | INTEGER | NO | 0 | Citas atendidas |
| `calificacion_promedio` | NUMERIC(2,1) | NO | 0 | Rating promedio |
| `total_resenas` | INTEGER | NO | 0 | Total reseñas |
| **Estado** |
| `activo` | BOOLEAN | NO | true | Empleado activo |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| `notas_internas` | TEXT | SÍ | - | Notas privadas |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Índices:**
- `idx_empleados_usuario_id` en `usuario_id`
- `idx_empleados_sucursal_id` en `sucursal_id` (WHERE IS NOT NULL)
- `idx_empleados_activo` en `activo`
- `idx_empleados_pin_acceso` en `pin_acceso` (WHERE IS NOT NULL)

**Check:**
- `empleados_pin_acceso_check`: pin_acceso debe ser 4 dígitos (regex `^[0-9]{4}$`)

---

### 4.2 empleado_horarios

Horarios de trabajo por empleado.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `empleado_id` | UUID | NO | - | FK → empleados |
| `dia_semana` | SMALLINT | NO | - | 0=Domingo, 6=Sábado |
| `hora_entrada` | TIME | NO | - | Hora de entrada |
| `hora_salida` | TIME | NO | - | Hora de salida |

**Constraints:**
- UNIQUE en (`empleado_id`, `dia_semana`, `hora_entrada`)
- CHECK: `dia_semana >= 0 AND dia_semana <= 6`

---

## 5. Marketplace y Artículos

### 5.1 articulos

Productos/servicios del negocio.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `tipo` | VARCHAR(20) | NO | - | 'producto' o 'servicio' |
| `nombre` | VARCHAR(150) | NO | - | Nombre del artículo |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `categoria` | VARCHAR(100) | SÍ | 'General' | Categoría interna |
| `sku` | VARCHAR(50) | SÍ | - | Código SKU |
| **Precios** |
| `precio_base` | NUMERIC(10,2) | NO | - | Precio base |
| `precio_desde` | BOOLEAN | NO | false | ¿Mostrar "desde"? |
| **Imágenes** |
| `imagen_principal` | TEXT | SÍ | - | URL imagen principal |
| `imagenes_adicionales` | TEXT[] | SÍ | [] | Array de URLs |
| **Servicios** |
| `requiere_cita` | BOOLEAN | NO | false | ¿Requiere agendar? |
| `duracion_estimada` | INTEGER | SÍ | - | Minutos (servicios) |
| **Estado** |
| `disponible` | BOOLEAN | NO | true | Disponible para venta |
| `destacado` | BOOLEAN | NO | false | Mostrar destacado |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| **Métricas** |
| `total_ventas` | INTEGER | NO | 0 | Ventas totales |
| `total_reservas` | INTEGER | NO | 0 | Reservas totales |
| `total_vistas` | INTEGER | NO | 0 | Vistas totales |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Índices:**
- `idx_articulos_negocio_id` en `negocio_id`
- `idx_articulos_categoria` en `categoria`
- `idx_articulos_disponible` en `disponible`

**Checks:**
- `articulos_tipo_check`: tipo IN ('producto', 'servicio')
- `articulos_precio_check`: precio_base >= 0

---

### 5.2 articulo_inventario

Control de stock (relación 1:1 con artículos).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `articulo_id` | UUID | NO | - | FK → articulos (UNIQUE) |
| `stock` | INTEGER | NO | 0 | Cantidad disponible |
| `stock_minimo` | INTEGER | NO | 0 | Alerta de stock bajo |
| `permite_venta_sin_stock` | BOOLEAN | NO | false | Vender sin stock |
| `stock_bajo` | BOOLEAN | NO | false | Flag de alerta |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Check:** `stock >= 0`

---

### 5.3 articulo_variantes

Tipos de variantes (talla, color, etc.).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `articulo_id` | UUID | NO | - | FK → articulos |
| `nombre` | VARCHAR(50) | NO | - | 'Talla', 'Color', 'Sabor' |
| `requerido` | BOOLEAN | NO | false | ¿Obligatorio elegir? |
| `seleccion_multiple` | BOOLEAN | NO | false | Permitir varias opciones |
| `min_selecciones` | INTEGER | NO | 0 | Mínimo de selecciones |
| `max_selecciones` | INTEGER | SÍ | - | Máximo de selecciones |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

---

### 5.4 articulo_variante_opciones

Opciones de cada variante.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `variante_id` | UUID | NO | FK → articulo_variantes |
| `valor` | VARCHAR(50) | NO | 'Chico', 'Rojo', 'Vainilla' |
| `precio_extra` | DECIMAL(10,2) | SÍ | Costo adicional |

---

### 5.5 marketplace

Publicaciones de usuarios.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | NO | FK → usuarios |
| `titulo` | VARCHAR(200) | NO | Título |
| `descripcion` | TEXT | NO | Descripción |
| `precio` | DECIMAL(10,2) | NO | Precio |
| `categoria_id` | UUID | SÍ | FK → categorias_marketplace |
| `ubicacion` | GEOGRAPHY(POINT) | SÍ | Ubicación |
| `ciudad` | VARCHAR(100) | SÍ | Ciudad |
| `estado` | VARCHAR(20) | NO | 'activa', 'vendida', 'pausada' |
| `imagenes` | JSONB | SÍ | Array de URLs |
| `created_at` | TIMESTAMP | NO | Fecha |

---

### 5.6 categorias_marketplace

Categorías para marketplace.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `nombre` | VARCHAR(100) | NO | Nombre |
| `slug` | VARCHAR(120) | NO | URL amigable |
| `icono` | VARCHAR(50) | SÍ | Icono |
| `activa` | BOOLEAN | NO | Default: true |

---

## 6. Carrito y Pedidos

### 6.1 carrito

Carrito de compras. **Un usuario puede tener múltiples carritos** (uno por vendedor/sección).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `usuario_id` | UUID | NO | - | FK → usuarios |
| `tipo_seccion` | VARCHAR(20) | NO | 'marketplace' | Sección de origen |
| `tipo_vendedor` | VARCHAR(10) | NO | 'comercial' | 'comercial' o 'personal' |
| `vendedor_id` | UUID | NO | - | ID del vendedor |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |

**Secciones válidas:** 'marketplace', 'negocios_locales', 'promociones', 'rifas', 'subastas', 'turismo'

**Constraint:** UNIQUE en (`usuario_id`, `tipo_vendedor`, `vendedor_id`)

---

### 6.2 carrito_articulos

Artículos en el carrito.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `carrito_id` | UUID | NO | - | FK → carrito |
| `articulo_id` | UUID | NO | - | FK → articulos |
| `cantidad` | INTEGER | NO | 1 | Cantidad |
| `modificadores` | JSONB | SÍ | [] | Opciones seleccionadas |
| `notas` | TEXT | SÍ | - | Notas del artículo |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

**Constraint:** UNIQUE en (`carrito_id`, `articulo_id`, `modificadores`)

---

### 6.3 pedidos

Órdenes de compra. **Los pedidos se vinculan a una sucursal específica.**

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `numero_pedido` | VARCHAR(20) | NO | - | Número único |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `sucursal_id` | UUID | NO | - | FK → negocio_sucursales |
| `comprador_id` | UUID | NO | - | FK → usuarios |
| **Estado** |
| `estado` | VARCHAR(20) | NO | 'pendiente' | Estado del pedido |
| `motivo_cancelacion` | TEXT | SÍ | - | Razón de cancelación |
| `cancelado_por` | VARCHAR(20) | SÍ | - | Quien canceló |
| **Entrega** |
| `tipo_entrega` | VARCHAR(20) | NO | - | 'recoger_tienda', 'envio_domicilio' |
| `direccion_entrega` | JSONB | SÍ | - | Dirección completa |
| **Pago** |
| `metodo_pago` | VARCHAR(30) | NO | - | 'efectivo', 'tarjeta', 'transferencia' |
| `estado_pago` | VARCHAR(20) | NO | 'pendiente' | Estado del pago |
| `referencia_pago` | VARCHAR(100) | SÍ | - | Referencia de pago |
| **Montos** |
| `subtotal` | NUMERIC(10,2) | NO | - | Subtotal |
| `descuento` | NUMERIC(10,2) | NO | 0 | Descuento aplicado |
| `costo_envio` | NUMERIC(10,2) | NO | 0 | Costo de envío |
| `total` | NUMERIC(10,2) | NO | - | Total final |
| **Cupón** |
| `cupon_id` | UUID | SÍ | - | FK → cupones |
| `codigo_cupon_usado` | VARCHAR(50) | SÍ | - | Código del cupón |
| **Notas** |
| `notas_comprador` | TEXT | SÍ | - | Notas del cliente |
| `notas_vendedor` | TEXT | SÍ | - | Notas del vendedor |
| **Timestamps** |
| `created_at` | TIMESTAMP | NO | now() | Fecha de creación |
| `updated_at` | TIMESTAMP | NO | now() | Última actualización |
| `confirmado_at` | TIMESTAMP | SÍ | - | Fecha de confirmación |
| `entregado_at` | TIMESTAMP | SÍ | - | Fecha de entrega |

**Estados válidos:** 'pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'

**Índices:**
- `idx_pedidos_negocio` en (`negocio_id`, `estado`)
- `idx_pedidos_sucursal` en (`sucursal_id`, `estado`)
- `idx_pedidos_comprador_estado` en (`comprador_id`, `estado`)

---

### 6.4 pedido_articulos

Snapshot de artículos del pedido (datos guardados al momento de la compra).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | auto | PK |
| `pedido_id` | UUID | NO | - | FK → pedidos |
| `nombre` | VARCHAR(200) | NO | - | Nombre del artículo |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `imagen_url` | TEXT | SÍ | - | URL de imagen |
| `sku` | VARCHAR(50) | SÍ | - | Código SKU |
| `precio_unitario` | NUMERIC(10,2) | NO | - | Precio unitario |
| `cantidad` | INTEGER | NO | 1 | Cantidad |
| `subtotal` | NUMERIC(10,2) | NO | - | Subtotal del artículo |
| `modificadores` | JSONB | SÍ | [] | Opciones seleccionadas |
| `notas` | TEXT | SÍ | - | Notas |

---

## 7. Sistema de Puntos (CardYA / ScanYA)

### 7.1 puntos_configuracion

Configuración de puntos por negocio.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios (UNIQUE) |
| `puntos_por_peso` | NUMERIC(10,4) | NO | 1.0 | Puntos por cada peso |
| `minimo_compra` | NUMERIC(10,2) | NO | 0 | Compra mínima para ganar |
| `dias_expiracion_puntos` | INTEGER | NO | 90 | Días para expirar puntos |
| `dias_expiracion_voucher` | INTEGER | NO | 30 | Días para expirar voucher |
| **Validaciones** |
| `requiere_foto_evidencia` | BOOLEAN | NO | true | ¿Foto del ticket? |
| `requiere_numero_orden` | BOOLEAN | NO | false | ¿Número de orden? |
| **Horario** |
| `validar_horario` | BOOLEAN | NO | true | Validar horario |
| `horario_inicio` | TIME | NO | 09:00 | Hora inicio válida |
| `horario_fin` | TIME | NO | 22:00 | Hora fin válida |
| **Alertas** |
| `monto_alerta_alto` | NUMERIC(10,2) | NO | 2000 | Monto para alerta |
| `activo` | BOOLEAN | NO | true | Sistema activo |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Checks:**
- `puntos_por_peso > 0`
- `minimo_compra >= 0`
- `dias_expiracion_puntos > 0 AND dias_expiracion_voucher > 0`
- `horario_fin > horario_inicio`

---

### 7.2 puntos_billetera

Saldo de puntos por usuario **en cada negocio**.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `usuario_id` | UUID | NO | - | FK → usuarios |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `puntos_disponibles` | INTEGER | NO | 0 | Saldo actual |
| `puntos_acumulados_total` | INTEGER | NO | 0 | Total histórico ganados |
| `puntos_canjeados_total` | INTEGER | NO | 0 | Total canjeados |
| `puntos_expirados_total` | INTEGER | NO | 0 | Total expirados |
| `ultima_actividad` | TIMESTAMP | SÍ | - | Última transacción |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Constraint:** UNIQUE en (`usuario_id`, `negocio_id`)

**Checks:**
- `puntos_disponibles >= 0`
- `puntos_acumulados_total >= 0 AND puntos_canjeados_total >= 0 AND puntos_expirados_total >= 0`

---

### 7.3 puntos_transacciones

Historial de transacciones. **Las transacciones se vinculan a una sucursal.**

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `billetera_id` | UUID | NO | - | FK → puntos_billetera |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `sucursal_id` | UUID | NO | - | FK → negocio_sucursales |
| `cliente_id` | UUID | NO | - | FK → usuarios |
| `empleado_id` | UUID | SÍ | - | FK → empleados (quien registró) |
| **Datos de Compra** |
| `monto_compra` | NUMERIC(10,2) | NO | - | Monto de la compra |
| `puntos_otorgados` | INTEGER | NO | - | Puntos calculados |
| `numero_orden` | VARCHAR(50) | SÍ | - | Número de orden/ticket |
| **Tipo y Estado** |
| `tipo` | VARCHAR(20) | NO | 'presencial' | 'presencial' o 'domicilio' |
| `estado` | VARCHAR(20) | NO | 'pendiente' | Estado de la transacción |
| **Confirmación** |
| `confirmado_por_cliente` | BOOLEAN | NO | false | Cliente confirmó |
| `expira_confirmacion` | TIMESTAMP | SÍ | - | Límite para confirmar |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Estados válidos:** 'pendiente', 'confirmado', 'rechazado', 'cancelado'

**Índices:**
- `idx_puntos_transacciones_billetera` en (`billetera_id`, `created_at DESC`)
- `idx_puntos_transacciones_negocio` en (`negocio_id`, `created_at DESC`)
- `idx_puntos_transacciones_sucursal` en (`sucursal_id`, `created_at DESC`)
- `idx_puntos_transacciones_cliente` en (`cliente_id`, `created_at DESC`)
- `idx_puntos_transacciones_estado` en (`estado`, `expira_confirmacion`)

**Checks:**
- `monto_compra > 0`
- `puntos_otorgados >= 0`

---

### 7.4 transacciones_evidencia

Fotos de tickets como evidencia.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `transaccion_id` | UUID | NO | - | FK → puntos_transacciones |
| `url_imagen` | VARCHAR(500) | NO | - | URL de imagen |
| `tipo` | VARCHAR(20) | NO | 'ticket' | 'ticket', 'producto', 'otro' |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

---

### 7.5 recompensas

Premios canjeables por puntos.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `nombre` | VARCHAR(200) | NO | - | Nombre |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `puntos_requeridos` | INTEGER | NO | - | Costo en puntos |
| `imagen_url` | VARCHAR(500) | SÍ | - | Imagen |
| `stock` | INTEGER | NO | -1 | Stock (-1 = ilimitado) |
| `requiere_aprobacion` | BOOLEAN | NO | false | ¿Necesita aprobación? |
| `activa` | BOOLEAN | NO | true | Recompensa activa |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Checks:**
- `puntos_requeridos > 0`
- `stock >= -1` (-1 significa ilimitado)

---

### 7.6 vouchers_canje

Vouchers generados al canjear recompensas.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `billetera_id` | UUID | NO | - | FK → puntos_billetera |
| `recompensa_id` | UUID | NO | - | FK → recompensas |
| `usuario_id` | UUID | NO | - | FK → usuarios |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `sucursal_id` | UUID | NO | - | FK → negocio_sucursales |
| **Código** |
| `codigo` | VARCHAR(6) | NO | - | Código de 6 caracteres (UNIQUE) |
| `qr_data` | VARCHAR(500) | SÍ | - | Datos para QR |
| `puntos_usados` | INTEGER | NO | - | Puntos gastados |
| **Estado** |
| `estado` | VARCHAR(30) | NO | 'pendiente' | Estado del voucher |
| `expira_at` | TIMESTAMP | NO | - | Fecha de expiración |
| `usado_at` | TIMESTAMP | SÍ | - | Fecha de uso |
| `usado_por_empleado_id` | UUID | SÍ | - | FK → empleados |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Estados válidos:** 'pendiente', 'aprobacion_pendiente', 'usado', 'expirado', 'cancelado'

**Checks:**
- `codigo` debe ser exactamente 6 caracteres alfanuméricos mayúsculas (regex `^[A-Z0-9]{6}$`)
- `puntos_usados > 0`

---

### 7.7 alertas_seguridad

Alertas de actividad sospechosa.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `negocio_id` | UUID | NO | - | FK → negocios |
| `transaccion_id` | UUID | SÍ | - | FK → puntos_transacciones |
| `empleado_id` | UUID | SÍ | - | FK → empleados |
| `tipo` | VARCHAR(30) | NO | - | Tipo de alerta |
| `severidad` | VARCHAR(10) | NO | 'media' | 'baja', 'media', 'alta' |
| `titulo` | VARCHAR(200) | NO | - | Título de la alerta |
| `descripcion` | TEXT | NO | - | Detalle |
| `data` | JSONB | SÍ | - | Datos adicionales |
| `leida` | BOOLEAN | NO | false | ¿Fue leída? |
| `leida_at` | TIMESTAMP | SÍ | - | Fecha de lectura |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Tipos de alerta:** 'monto_inusual', 'cliente_frecuente', 'fuera_horario', 'montos_redondos', 'empleado_destacado', 'cliente_reporte'

---

## 8. Cupones y Ofertas

### 8.1 cupones

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `negocio_id` | UUID | NO | FK → negocios |
| `codigo` | VARCHAR(50) | NO | Código del cupón |
| `titulo` | VARCHAR(200) | NO | Título |
| `descripcion` | TEXT | SÍ | Descripción |
| `tipo_descuento` | VARCHAR(20) | NO | 'porcentaje', 'monto' |
| `valor_descuento` | DECIMAL(10,2) | NO | Valor |
| `minimo_compra` | DECIMAL(10,2) | SÍ | Compra mínima |
| `maximo_descuento` | DECIMAL(10,2) | SÍ | Tope de descuento |
| `fecha_inicio` | DATE | NO | Inicio vigencia |
| `fecha_fin` | DATE | NO | Fin vigencia |
| `limite_usos` | INTEGER | SÍ | Usos totales permitidos |
| `limite_por_usuario` | INTEGER | SÍ | Usos por usuario |
| `activo` | BOOLEAN | NO | Default: true |

---

### 8.2-8.5 (cupon_galeria, cupon_usuarios, cupon_usos, ofertas)

Tablas de soporte para cupones y ofertas con estructura similar.

---

## 9. Dinámicas

### 9.1 dinamicas

Rifas y sorteos.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `negocio_id` | UUID | NO | FK → negocios |
| `titulo` | VARCHAR(200) | NO | Título |
| `descripcion` | TEXT | SÍ | Descripción |
| `tipo` | VARCHAR(20) | NO | 'rifa', 'sorteo', 'concurso' |
| `fecha_inicio` | TIMESTAMP | NO | Inicio |
| `fecha_fin` | TIMESTAMP | NO | Fin |
| `fecha_sorteo` | TIMESTAMP | SÍ | Fecha del sorteo |
| `requisitos` | JSONB | SÍ | Requisitos para participar |
| `estado` | VARCHAR(20) | NO | 'activa', 'finalizada', 'cancelada' |
| `imagen_url` | VARCHAR(500) | SÍ | Imagen |

---

### 9.2 dinamica_participaciones

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `dinamica_id` | UUID | NO | - | FK → dinamicas |
| `usuario_id` | UUID | NO | - | FK → usuarios |
| `entradas` | INTEGER | NO | 1 | Número de entradas |
| `datos_extra` | JSONB | SÍ | - | Datos adicionales |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Constraint:** UNIQUE en (`dinamica_id`, `usuario_id`)
**Check:** `entradas > 0`

---

### 9.3 dinamica_premios

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `dinamica_id` | UUID | NO | - | FK → dinamicas |
| `proveedor_negocio_id` | UUID | SÍ | - | FK → negocios (patrocinador) |
| `nombre_premio` | VARCHAR(200) | NO | - | Nombre del premio |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `imagen_url` | TEXT | SÍ | - | Imagen del premio |
| `valor_estimado` | NUMERIC(10,2) | NO | - | Valor estimado |
| `cantidad_disponible` | INTEGER | NO | 1 | Unidades disponibles |
| `orden` | INTEGER | NO | 0 | Orden de visualización |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

---

## 10. Bolsa de Trabajo

### 10.1 bolsa_trabajo

Vacantes y servicios profesionales.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `tipo` | VARCHAR(20) | NO | - | 'vacante' o 'servicio' |
| `negocio_id` | UUID | SÍ | - | FK → negocios (si vacante) |
| `sucursal_id` | UUID | SÍ | - | FK → negocio_sucursales |
| `usuario_id` | UUID | SÍ | - | FK → usuarios (si servicio) |
| **Información** |
| `titulo` | VARCHAR(200) | NO | - | Título |
| `descripcion` | TEXT | NO | - | Descripción |
| `requisitos` | TEXT | SÍ | - | Requisitos |
| `categoria_servicio` | VARCHAR(100) | SÍ | - | Categoría |
| **Salario** |
| `salario_minimo` | NUMERIC(10,2) | SÍ | - | Salario mínimo |
| `salario_maximo` | NUMERIC(10,2) | SÍ | - | Salario máximo |
| **Modalidad** |
| `modalidad` | VARCHAR(20) | NO | - | 'presencial', 'remoto', 'hibrido' |
| `tipo_contrato` | VARCHAR(20) | SÍ | - | Tipo de contrato |
| `ubicacion` | VARCHAR(200) | NO | - | Ubicación |
| **Para servicios** |
| `experiencia_anios` | INTEGER | SÍ | - | Años de experiencia |
| `portafolio_url` | VARCHAR(500) | SÍ | - | URL del portafolio |
| **Contacto** |
| `contacto_email` | VARCHAR(100) | SÍ | - | Email de contacto |
| `contacto_telefono` | VARCHAR(20) | SÍ | - | Teléfono |
| **Estado** |
| `estado` | VARCHAR(20) | NO | 'activo' | Estado |
| `fecha_expiracion` | DATE | SÍ | - | Fecha de expiración |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

**Tipos de contrato:** 'tiempo_completo', 'medio_tiempo', 'temporal', 'freelance'

**Checks:**
- Si `tipo='vacante'` → `negocio_id IS NOT NULL AND usuario_id IS NULL`
- Si `tipo='servicio'` → `usuario_id IS NOT NULL AND negocio_id IS NULL`
- `salario_maximo >= salario_minimo` (si ambos existen)

---

## 11. Planes y Suscripciones

### 11.1 planes

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `perfil` | VARCHAR(20) | NO | - | 'personal' o 'comercial' |
| `membresia` | SMALLINT | NO | - | 1, 2 o 3 |
| `nombre` | VARCHAR(100) | NO | - | Nombre del plan |
| `descripcion` | TEXT | SÍ | - | Descripción |
| `precio_mensual` | NUMERIC(10,2) | NO | 0 | Precio mensual |
| `precio_anual` | NUMERIC(10,2) | SÍ | - | Precio anual |
| `moneda` | VARCHAR(3) | NO | 'MXN' | Moneda |
| `activo` | BOOLEAN | NO | true | Plan activo |
| `orden_display` | SMALLINT | NO | 0 | Orden de visualización |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

**Constraint:** UNIQUE en (`perfil`, `membresia`)

---

### 11.2 plan_reglas

Reglas y límites por plan.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | PK |
| `plan_id` | INTEGER | NO | - | FK → planes |
| `clave` | VARCHAR(50) | NO | - | Clave de la regla |
| `descripcion` | VARCHAR(200) | SÍ | - | Descripción |
| `tipo` | VARCHAR(20) | NO | - | 'configuracion' o 'limite' |
| `seccion` | VARCHAR(50) | NO | - | Sección que afecta |
| `valor` | INTEGER | NO | - | Valor del límite |
| `activo` | BOOLEAN | NO | true | Regla activa |
| `updated_by` | UUID | SÍ | - | FK → usuarios |
| `created_at` | TIMESTAMP | NO | now() | Fecha |
| `updated_at` | TIMESTAMP | NO | now() | Actualización |

**Constraint:** UNIQUE en (`plan_id`, `clave`)

---

## 12. Embajadores

### 12.1 regiones

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `nombre` | VARCHAR(100) | NO | - | Nombre de la región |
| `estado` | VARCHAR(100) | NO | - | Estado geográfico |
| `pais` | VARCHAR(100) | NO | 'México' | País |
| `activa` | BOOLEAN | NO | true | Región activa |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Constraint:** UNIQUE en (`nombre`, `estado`)

---

### 12.2 embajadores

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | random | PK |
| `usuario_id` | UUID | NO | - | FK → usuarios (UNIQUE) |
| `region_id` | UUID | NO | - | FK → regiones |
| `codigo_referido` | VARCHAR(50) | NO | - | Código único |
| `porcentaje_primer_pago` | NUMERIC(5,2) | NO | 30.00 | Comisión inicial |
| `porcentaje_recurrente` | NUMERIC(5,2) | NO | 15.00 | Comisión mensual |
| `negocios_registrados` | INTEGER | NO | 0 | Counter de negocios |
| `estado` | VARCHAR(20) | NO | 'activo' | Estado |
| `created_at` | TIMESTAMP | NO | now() | Fecha |

**Estados:** 'activo', 'inactivo', 'suspendido'

**Checks:**
- `porcentaje_primer_pago` BETWEEN 0 AND 100
- `porcentaje_recurrente` BETWEEN 0 AND 100
- `negocios_registrados >= 0`

---

### 12.3 embajador_comisiones

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `embajador_id` | UUID | NO | FK → embajadores |
| `negocio_id` | UUID | NO | FK → negocios |
| `tipo` | VARCHAR(20) | NO | 'inicial', 'recurrente' |
| `monto` | DECIMAL(10,2) | NO | Monto de comisión |
| `pagada` | BOOLEAN | NO | Default: false |
| `created_at` | TIMESTAMP | NO | Fecha |

---

## 13. Métricas y Sistema

### 13.1 metricas_usuario

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | NO | FK → usuarios |
| `total_compras` | INTEGER | NO | Default: 0 |
| `total_gastado` | DECIMAL(10,2) | NO | Default: 0 |
| `puntos_totales` | INTEGER | NO | Default: 0 |
| `ultimo_login` | TIMESTAMP | SÍ | Último acceso |

---

### 13.2 metricas_entidad

Métricas genéricas.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `entidad_tipo` | VARCHAR(50) | NO | 'negocio', 'articulo' |
| `entidad_id` | UUID | NO | ID de la entidad |
| `vistas` | INTEGER | NO | Default: 0 |
| `clicks` | INTEGER | NO | Default: 0 |
| `compartidos` | INTEGER | NO | Default: 0 |

---

### 13.3 bitacora_uso

Log de acciones.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | SÍ | FK → usuarios |
| `accion` | VARCHAR(100) | NO | Tipo de acción |
| `entidad_tipo` | VARCHAR(50) | SÍ | Tipo |
| `entidad_id` | UUID | SÍ | ID |
| `ip` | VARCHAR(45) | SÍ | IP del usuario |
| `user_agent` | TEXT | SÍ | Navegador |
| `created_at` | TIMESTAMP | NO | Fecha |

---

### 13.4 configuracion_sistema

Configuraciones globales.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `clave` | VARCHAR(100) | NO | Nombre de config |
| `valor` | TEXT | NO | Valor |
| `descripcion` | TEXT | SÍ | Descripción |
| `editable` | BOOLEAN | NO | Default: true |

---

## 14. PostGIS

### 14.1 spatial_ref_sys

Tabla del sistema PostGIS para referencias espaciales (generada automáticamente).

---

## Triggers Implementados

### Actualizar updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas con updated_at
CREATE TRIGGER trigger_usuarios_updated
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Calcular Puntos

```sql
CREATE OR REPLACE FUNCTION calcular_puntos_transaccion()
RETURNS TRIGGER AS $$
DECLARE
  config puntos_configuracion%ROWTYPE;
BEGIN
  SELECT * INTO config
  FROM puntos_configuracion
  WHERE negocio_id = NEW.negocio_id;
  
  NEW.puntos = FLOOR(NEW.monto_compra / config.ratio_pesos_punto);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
