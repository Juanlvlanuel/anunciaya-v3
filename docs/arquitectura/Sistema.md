# 🏗️ AnunciaYA v3.0 - Arquitectura del Sistema

**Última actualización:** 17 Abril 2026  
**Versión:** 9.1 (+ Panel Admin como tercer ámbito operativo)

Este documento describe la arquitectura técnica base, decisiones de diseño fundamentales y requisitos transversales del sistema.

---

# 🏗️ PARTE 1: REQUISITOS ARQUITECTÓNICOS

> ⚠️ **IMPORTANTE:** Estos requisitos son TRANSVERSALES a todo el proyecto.

---

## 1.1 🌍 Geolocalización Global

| Aspecto | Descripción |
|---------|-------------|
| **Auto-detección** | Al entrar, la app detecta la ciudad automáticamente (GPS → IP/WiFi) |
| **Filtrado automático** | TODAS las secciones muestran contenido de la ciudad del usuario |
| **Cambio manual** | Si el usuario cambia ciudad → TODO se refresca instantáneamente |
| **Store central** | `useGpsStore` es la fuente única de verdad |
| **Backend** | PostGIS con `ST_DWithin` para búsquedas por radio |

**Secciones afectadas:** `/negocios`, `/marketplace`, `/ofertas`, `/servicios` (sección unificada que absorbe lo que iba a ser "Empleos" en visión v3)

---

## 1.2 🔄 Sistema de Modos de Cuenta

| Aspecto | Descripción |
|---------|-------------|
| **Modelo** | 1 correo = 1 cuenta = 2 modos posibles |
| **Modo Personal** | Siempre disponible (gratis) |
| **Modo Comercial** | Requiere pago ($449 MXN/mes) |
| **Alternancia** | Toggle en UI para cambiar de modo |

### Modelo de Datos

```typescript
interface Usuario {
  // Identificación
  id: string;
  correo: string;
  nombre: string;
  
  // Sistema de Modos
  tieneModoComercial: boolean;  // True si pagó suscripción
  modoActivo: 'personal' | 'comercial';
  
  // Datos Modo Personal
  puntosDisponibles: number;
  puntosAcumuladosLifetime: number;
  nivelCardya: 'bronce' | 'plata' | 'oro';
  
  // Datos Modo Comercial
  negocioId?: string;
  onboardingCompletado?: boolean;
  
  // Suscripción
  stripeCustomerId?: string;
  suscripcionActiva: boolean;
}
```

### Visibilidad por Modo

| Elemento | Personal | Comercial |
|----------|:--------:|:---------:|
| CardYA | ✅ | ❌ |
| Mis Cupones | ✅ | ❌ |
| MarketPlace (ver) | ✅ | ✅ |
| MarketPlace (publicar) | ✅ | ❌ |
| Favoritos | ✅ | ✅ |
| Business Studio | ❌ | ✅ |
| ScanYA | ❌ | ✅ |
| Mi Negocio | ❌ | ✅ |

> **Tercer ámbito — Panel Admin:** operaciones cross-negocio reservadas al equipo interno AnunciaYA **+ vendedores/embajadores externos** que venden membresías a comerciantes. No pertenece al modo Personal ni Comercial del usuario final. Tiene múltiples roles (admin, vendedor) con permisos estrictos: admin accede a todo (Mantenimiento, Reportes globales, gestión de negocios/usuarios), vendedor solo a prospectos y comisiones de su región asignada (tabla `embajadores`). Gestionado con auth separada (hoy `x-admin-secret` temporal; futuro: JWT con rol). Namespace de APIs `/api/admin/*`. Primera sección operativa: Mantenimiento → reconcile de archivos huérfanos en R2. Ver `docs/arquitectura/Panel_Admin.md`.

### Flujo de Activación Comercial

```
Usuario registrado (modo Personal por defecto)
         ↓
Click "Conocer planes" / "🔒 Comercial"
         ↓
Modal de planes → Pago Stripe ($449/mes)
         ↓
tieneModoComercial = true
         ↓
Redirige a Onboarding Wizard
         ↓
Crea negocio → negocioId asignado
         ↓
Toggle disponible para alternar modos
```

### ⚠️ Degradación Automática por Falta de Pago

**Cuando un comerciante deja de pagar:**

```
Suscripción vencida/rechazada
         ↓
Sistema degrada automáticamente a Modo Personal
         ↓
suscripcionActiva = false
tieneModoComercial = false (temporalmente)
modoActivo = 'personal' (forzado)
         ↓
BLOQUEO DE DATOS COMERCIALES:
├── Negocio despublicado (no visible en directorio)
├── Productos/servicios ocultos
├── Ofertas despublicadas
├── Cupones desactivados
├── Vacantes despublicadas (sección pública Servicios)
├── Empleados sin acceso a ScanYA
└── Business Studio bloqueado
         ↓
DATOS PRESERVADOS (no eliminados):
├── Información del negocio ✅
├── Catálogo de productos ✅
├── Base de clientes ✅
├── Historial de ventas ✅
├── Empleados registrados ✅
└── Configuraciones ✅
         ↓
Usuario sigue activo en Modo Personal
└── Puede seguir usando la app como usuario normal
```

**Cuando el comerciante paga de nuevo:**

```
Pago procesado exitosamente
         ↓
suscripcionActiva = true
tieneModoComercial = true
         ↓
REACTIVACIÓN AUTOMÁTICA:
├── Negocio republicado (visible en directorio)
├── Productos/servicios visibles
├── Ofertas reactivadas
├── Cupones activados
├── Vacantes republicadas (sección pública Servicios)
├── Empleados recuperan acceso
└── Business Studio desbloqueado
         ↓
Todo vuelve EXACTAMENTE como estaba
└── Sin pérdida de datos ni configuraciones
```

**Modelo de Datos Actualizado:**

```typescript
interface Usuario {
  // Suscripción
  suscripcionActiva: boolean;
  fechaVencimientoSuscripcion?: Date;
  estadoSuscripcion: 'activa' | 'vencida' | 'cancelada';
  
  // Modo degradado
  modoDegradado: boolean;  // True cuando se degrada por falta de pago
  fechaDegradacion?: Date;
}

interface Negocio {
  // Estado
  publicado: boolean;  // False cuando suscripción vencida
  motivoDespublicacion?: 'falta_pago' | 'usuario' | 'admin';
}
```

**Cron Job de Verificación:**

```typescript
// Ejecutar diariamente
async function verificarSuscripcionesVencidas() {
  const hoy = new Date();
  
  const vencidas = await db.usuarios.find({
    suscripcionActiva: true,
    fechaVencimientoSuscripcion: { $lt: hoy }
  });
  
  for (const usuario of vencidas) {
    await degradarCuenta(usuario.id);
  }
}

async function degradarCuenta(usuarioId: string) {
  // 1. Actualizar usuario
  await db.usuarios.updateOne({ id: usuarioId }, {
    suscripcionActiva: false,
    tieneModoComercial: false,
    modoActivo: 'personal',
    modoDegradado: true,
    fechaDegradacion: new Date()
  });
  
  // 2. Despublicar negocio
  await db.negocios.updateOne({ usuarioId }, {
    publicado: false,
    motivoDespublicacion: 'falta_pago'
  });
  
  // 3. Desactivar empleados
  await db.empleados.updateMany(
    { negocioId: usuario.negocioId },
    { activo: false }
  );
  
  // 4. Notificar usuario
  await enviarNotificacion(usuarioId, 'suscripcion_vencida');
}

async function reactivarCuenta(usuarioId: string) {
  // Proceso inverso - todo vuelve a la normalidad
  await db.usuarios.updateOne({ id: usuarioId }, {
    suscripcionActiva: true,
    tieneModoComercial: true,
    modoDegradado: false
  });
  
  await db.negocios.updateOne({ usuarioId }, {
    publicado: true,
    motivoDespublicacion: null
  });
  
  await db.empleados.updateMany(
    { negocioId: usuario.negocioId },
    { activo: true }
  );
}
```

### UI del Toggle

**Ambos modos disponibles:**
```
┌─────────────────────────────────┐
│  ┌─────────────┬─────────────┐  │
│  │ 👤 Personal │ 🏪 Comercial│  │
│  │     ✓       │             │  │
│  └─────────────┴─────────────┘  │
└─────────────────────────────────┘
```

**Solo Personal (no ha pagado):**
```
┌─────────────────────────────────┐
│  ┌─────────────┬─────────────┐  │
│  │ 👤 Personal │ 🔒 Comercial│  │
│  │     ✓       │ Desbloquear │  │
│  └─────────────┴─────────────┘  │
└─────────────────────────────────┘
```

---

## 1.3 🏪 Negocios Solo Físicos

> **Decisión:** 6 Enero 2026

| Aspecto | Descripción |
|---------|-------------|
| **Regla** | Todos los negocios requieren ubicación física |
| **Eliminado** | Tipo "Online" y columna `requiere_direccion` |
| **Agregado** | `tiene_servicio_domicilio` y `tiene_envio_domicilio` en `negocio_sucursales` |

### Justificación

| Sin local físico | Con local físico |
|------------------|------------------|
| Publica GRATIS en Servicios (modo Ofrezco) | Publica en Negocios (PAGO) |
| Publica GRATIS en MarketPlace | Usa Business Studio |
| No necesita CardYA | CardYA requiere escaneo presencial |

### Nuevos Campos

| Campo | Tabla | Descripción |
|-------|-------|-------------|
| `tiene_envio_domicilio` | `negocio_sucursales` | Envías productos al cliente |
| `tiene_servicio_domicilio` | `negocio_sucursales` | Tú vas al domicilio del cliente |

**Documentación:** `Eliminación_de_Negocios_Online.md`

---

## 1.4 📝 Decisiones Arquitectónicas Implementadas

> **Fecha:** 06 Enero 2026  
> **Fase:** 5.1.1 Onboarding Frontend  
> **Estado:** ✅ Implementado y en producción

Estas decisiones arquitectónicas fueron tomadas durante la implementación del Onboarding y definen aspectos fundamentales del sistema.

---

### 1. Negocios Solo Físicos

**Decisión:** Todos los negocios requieren ubicación física obligatoria.

**Implementación:**
- 8 pasos de onboarding con mapa obligatorio (paso 3)
- Eliminado tipo de negocio "Online"
- Eliminada columna `requiere_direccion` (redundante)
- Agregados campos: `tiene_servicio_domicilio` y `tiene_envio_domicilio`

**Razón:** Simplificar la experiencia de usuario y enfocarse en negocios locales físicos que son el target principal del sistema de lealtad.

---

### 2. Optimización de Imágenes Client-Side

**Decisión:** Comprimir y optimizar imágenes en el navegador antes de subir a Cloudflare R2.

**Configuración:**
```typescript
Logo:      maxWidth: 500px,  quality: 0.85, format: webp  → R2
Portada:   maxWidth: 1600px, quality: 0.85, format: webp  → R2
Galería:   maxWidth: 1200px, quality: 0.85, format: webp  → R2
Artículos: maxWidth: 1920px, quality: 0.85, format: webp  → R2
Ofertas:   maxWidth: 1920px, quality: 0.85, format: webp  → R2
```

**Beneficios:**
- Reduce costos de almacenamiento
- Acelera tiempo de carga en frontend
- Mejora experiencia de usuario en conexiones lentas

---

### 3. Upload Diferido (Optimista) y Presigned URLs

**Decisión:** Mostrar preview local inmediato sin esperar upload. Patrón único basado en R2 + presigned URLs.

**`useR2Upload`** (Catálogo, Ofertas, Mi Perfil):
- Preview instantáneo con `URL.createObjectURL()`
- Solicita presigned URL al backend (`POST /api/{módulo}/upload-imagen`)
- PUT directo al bucket R2 con la presigned URL
- URL pública de R2 reemplaza blob local al completar
- Helper de eliminación (`eliminarImagenSiHuerfana` en `negocioManagement.service.ts`) verifica reference-count contra todas las tablas relevantes antes de borrar de R2.

**Flujo R2:**
```
1. Usuario selecciona imagen → Preview INMEDIATO (blob local)
2. Hook optimiza imagen → canvas → WebP
3. POST /api/articulos/upload-imagen → { uploadUrl, publicUrl }
4. PUT uploadUrl (blob) → R2
5. publicUrl reemplaza blob local
```

**Razón:** UX optimista - interfaz "snappy" sin esperas. R2 tiene egress ilimitado y menor costo a largo plazo.

---

### 4. Validación Flexible de Productos

**Decisión:** Permitir guardar borradores con requisitos mínimos relajados.

**Reglas implementadas:**
- **Guardar borrador:** Mínimo 1 producto
- **Publicar negocio:** Mínimo 3 productos completos

**Razón:** 
- Permitir trabajo incremental
- No forzar completitud prematura
- Validación estricta solo al publicar

---

# ⚠️ NOTAS IMPORTANTES

---

## Flujo de Registro

**Flujo Actual:**
```
Registro → Usuario elige tipo (Personal o Comercial)
│
├── Personal → Acceso gratuito → Modo Personal activo
│
└── Comercial → Pago ($449 MXN/mes) → Onboarding → Business Studio
```

---

## Modelo de Cuenta Dual

Un usuario puede tener **ambos modos** con el mismo correo:

| Modo | Acceso | Costo |
|------|--------|-------|
| Personal | Siempre disponible | Gratis |
| Comercial | Requiere suscripción | $449 MXN/mes |

---

## Flujo Comercial Completo
```
Usuario selecciona "Comercial" en registro
         ↓
Se muestra modal de planes/pago
         ↓
Usuario paga suscripción (Stripe)
         ↓
Se crea cuenta con tieneModoComercial: true
         ↓
Se crea negocio en estado borrador
         ↓
Redirige a /business/onboarding
         ↓
Usuario completa 8 pasos del wizard
         ↓
Al finalizar: onboardingCompletado: true, esBorrador: false
         ↓
Acceso completo a Business Studio
```

---

## CTA "¿Tienes un negocio?"

Para usuarios que ya tienen cuenta Personal y quieren agregar Comercial:
```
Usuario hace clic en CTA
         ↓
Se muestra modal de planes
         ↓
Usuario paga suscripción
         ↓
Se actualiza: tieneModoComercial: true
         ↓
Se crea negocio en estado borrador
         ↓
Redirige a /business/onboarding
         ↓
Completa wizard → Acceso a Business Studio
```

---

## Alternancia de Modos

Usuarios con ambos modos pueden alternar:
```
[👤 Personal] ←→ [🏪 Comercial]
```

- Toggle disponible en Navbar/Sidebar
- Cambia contenido y opciones del menú

---

## Cancelación de Suscripción
```
Usuario cancela suscripción comercial
         ↓
Stripe webhook notifica
         ↓
Backend actualiza:
├── tieneModoComercial: false
├── modoActivo: 'personal' (forzado)
└── negocio: se oculta del directorio (no se borra)
         ↓
Usuario solo puede usar modo Personal
         ↓
Si reactiva suscripción → negocio vuelve a aparecer
```

---

# 🔔 PARTE 2: SISTEMA DE NOTIFICACIONES EN TIEMPO REAL

> **Estado:** ✅ IMPLEMENTADO (12 Febrero 2026)

---

## 2.1 Socket.io - Infraestructura Base

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   HTTP      │    │  Socket.io  │    │   Rooms     │    │
│  │   Server    │───▶│   Server    │───▶│  usuario:X  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  Socket.io  │───▶│   Zustand   │───▶│    UI       │    │
│  │   Client    │    │   Store     │    │  (Badge)    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Backend: `apps/api/src/socket.ts`

**Funciones exportadas:**
- `inicializarSocket(httpServer)` - Se llama UNA vez al arrancar
- `emitirEvento(evento, datos)` - Broadcast a TODOS los clientes
- `emitirAUsuario(usuarioId, evento, datos)` - Emite a room específico

**Rooms personales:**
```typescript
socket.on('unirse', (usuarioId: string) => {
  if (usuarioId) {
    socket.join(`usuario:${usuarioId}`);
  }
});
```

### Frontend: `apps/web/src/services/socketService.ts`

**Funciones exportadas:**
- `conectarSocket()` - Se llama desde useAuthStore al login
- `escucharEvento<T>(evento, callback)` - Registra listener
- `desconectarSocket()` - Limpia al cerrar sesión

**Auto-unión al room:**
Al conectar, lee `ay_usuario` de localStorage y emite `'unirse'` con el id.

---

## 2.2 Sistema de Notificaciones

### Tabla: `notificaciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único |
| `usuario_id` | UUID FK | Destinatario |
| `modo` | VARCHAR(15) | 'personal' o 'comercial' |
| `tipo` | VARCHAR(30) | Tipo de notificación (14 tipos) |
| `titulo` | VARCHAR(200) | Título corto |
| `mensaje` | VARCHAR(500) | Descripción |
| `negocio_id` | UUID FK NULL | Negocio relacionado |
| `sucursal_id` | UUID FK NULL | Sucursal relacionada |
| `referencia_id` | VARCHAR(100) | ID del recurso |
| `referencia_tipo` | VARCHAR(30) | Tipo del recurso |
| `icono` | VARCHAR(20) | Emoji |
| `leida` | BOOLEAN | Default false |
| `leida_at` | TIMESTAMP NULL | Cuándo se leyó |
| `created_at` | TIMESTAMP | Auto |

### Tipos de Notificación (14)

| Tipo | Modo | Descripción |
|------|------|-------------|
| `puntos_ganados` | personal | Cliente recibió puntos |
| `voucher_generado` | personal | Cliente canjeó recompensa |
| `voucher_cobrado` | personal | Voucher usado en tienda |
| `voucher_pendiente` | comercial | Dueño recibe voucher para entregar |
| `nueva_oferta` | personal | Nueva oferta del negocio |
| `nueva_recompensa` | personal | Nueva recompensa disponible |
| `nuevo_cupon` | personal | Cupón disponible |
| `nuevo_cliente` | comercial | Nuevo cliente registrado |
| `stock_bajo` | comercial | Recompensa con <5 stock |
| `nueva_resena` | comercial | Cliente dejó reseña |
| `sistema` | ambos | Notificación del sistema |
| `nuevo_marketplace` | personal | Nuevo item en marketplace |
| `nueva_dinamica` | personal | Nueva rifa/dinámica |
| `nuevo_empleo` | personal | Nueva vacante |

### Flujo de Notificación

```
1. Evento ocurre (venta, canje, reseña, etc.)
         ↓
2. Service llama crearNotificacion() (sin await, con .catch())
         ↓
3. crearNotificacion():
   - INSERT en tabla notificaciones
   - Llama emitirAUsuario(usuarioId, 'notificacion:nueva', data)
         ↓
4. Socket.io emite solo al room `usuario:{id}`
         ↓
5. Frontend escucha 'notificacion:nueva'
         ↓
6. Store actualiza notificaciones + badge
         ↓
7. UI muestra badge "9+" si hay más de 9
```

### API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notificaciones` | Lista paginada (filtrada por modo) |
| POST | `/api/notificaciones/:id/leer` | Marcar como leída |
| POST | `/api/notificaciones/leer-todas` | Marcar todas como leídas |
| GET | `/api/notificaciones/no-leidas` | Contar no leídas |

### Deep Linking desde Notificaciones

| referenciaTipo | Destino |
|----------------|---------|
| `transaccion` | `/cardya?tab=historial&id={referenciaId}` |
| `voucher` | `/cardya?tab=vouchers&id={referenciaId}` |
| `oferta` | `/negocios/{sucursalId}?ofertaId={referenciaId}` |
| `recompensa` | `/cardya?tab=recompensas&id={referenciaId}` (con glow) |
| `resena` | `/business-studio/opiniones` |
| `stock_bajo` | `/business-studio/puntos` |

### Frontend Components

- `useNotificacionesStore.ts` - Zustand store con filtrado por modo
- `notificacionesService.ts` - API service
- `PanelNotificaciones.tsx` - Panel con lista + badge
- Integración en `Navbar.tsx` y `MobileHeader.tsx`

---

## 2.3 Separación por Modo

Las notificaciones se filtran automáticamente según el modo activo del usuario:

- **Modo Personal:** Ve `puntos_ganados`, `voucher_generado`, etc.
- **Modo Comercial:** Ve `voucher_pendiente`, `nueva_resena`, `stock_bajo`, etc.

Al cambiar de modo, el store recarga las notificaciones del nuevo modo.

---

## 2.4 Notas Técnicas Importantes

**Empleados ScanYA NO reciben notificaciones por Socket.io:**
- Los empleados no tienen cuenta en tabla `usuarios`
- Acceden por Nick+PIN, no tienen sesión AnunciaYA
- Se usa polling cada 30 segundos para actualizar contadores

**Prevención de duplicados:**
- Flag `listenerRegistrado` en store
- `socket.off()` antes de `socket.on()` al reconectar

---

# ☁️ PARTE 3: INFRAESTRUCTURA Y SERVICIOS CLOUD

---

### 🎯 Objetivo Alcanzado

**Antes (16 Enero):**
- Backend: Railway ($5/mes mínimo)
- BD: PostgreSQL Local (sin backups automáticos)
- Emails: Zoho SMTP (bloqueado desde IPs cloud)
- **Costo:** $5-10/mes

**Después (29 Enero):**
- Backend: Render (Free tier)
- BD: Supabase (Free tier) 
- Emails: AWS SES (Sandbox)
- **Costo:** $0/mes ✅

**Ahorro:** ~$10-15/mes

---

### 🏗️ Arquitectura Completa
```
Usuario Final
    ↓
    ├─► Vercel (Frontend - Edge Network)
    │   └─► https://anunciaya-v3-app.vercel.app
    │
    └─► Render (Backend API - Free Tier)
        └─► https://anunciaya-api.onrender.com
             │
             ├─► Socket.io (Tiempo Real)
             │   └─► Notificaciones push, rooms por usuario
             │
             ├─► Supabase (PostgreSQL + PostGIS) ← incluye ChatYA
             │   └─► ~71 tablas en schema público (incluye chat_conv y chat_mensajes)
             │
             ├─► Upstash (Redis - Free)
             │   └─► 10K commands/día
             │
             ├─► AWS SES (Emails - Sandbox)
             │   └─► 200 emails/día
             │
             ├─► Cloudflare R2 (Multimedia - Free) ← único storage activo
             │   └─► Logo, portada, galería, tickets ScanYA, artículos, ofertas · 10 GB, egress ilimitado
             │
             └─► Stripe (Pagos - Test Mode)
                 └─► Suscripciones comerciales
```

---

### 📊 Servicios en Detalle

| Servicio | Proveedor | Tier | Specs | Límites | Costo |
|----------|-----------|------|-------|---------|-------|
| **Backend** | Render | Free | 512 MB RAM, 0.1 CPU | Cold starts 15 min | $0 |
| **Frontend** | Vercel | Free | Edge Network global | Bandwidth ilimitado | $0 |
| **PostgreSQL (todo, incluye chat)** | Supabase | Free | 500 MB, 2 CPU shared | 50K queries/día | $0 |
| **Redis** | Upstash | Free | 10K commands/día | 256 MB | $0 |
| **Emails** | AWS SES | Sandbox | 200 emails/día | Sandbox mode | $0 |
| **Multimedia (todo)** | Cloudflare R2 | Free | 10 GB storage | Egress ilimitado | $0 |
| **Pagos** | Stripe | Test | N/A | Test mode | $0 |

**Total Infraestructura: $0/mes**

---

### 🔄 Proceso de Migración