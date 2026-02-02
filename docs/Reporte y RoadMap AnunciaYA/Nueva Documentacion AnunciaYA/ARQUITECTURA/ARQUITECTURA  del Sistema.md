# 🏗️ AnunciaYA v3.0 - Arquitectura del Sistema

**Última actualización:** 30 enero 2026  
**Versión:** 8.0

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

**Secciones afectadas:** `/negocios`, `/marketplace`, `/ofertas`, `/dinamicas`, `/empleos`

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
├── Empleos despublicados
├── Rifas pausadas
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
├── Empleos republicados
├── Rifas reactivadas
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
| Publica GRATIS en Empleos | Publica en Negocios (PAGO) |
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

**Decisión:** Comprimir y optimizar imágenes en el navegador antes de subir a Cloudinary.

**Configuración:**
```typescript
Logo:      maxWidth: 500px,  quality: 0.85, format: webp
Portada:   maxWidth: 1600px, quality: 0.85, format: webp
Galería:   maxWidth: 1200px, quality: 0.85, format: webp
Productos: maxWidth: 800px,  quality: 0.85, format: webp
```

**Beneficios:**
- Reduce costos de almacenamiento Cloudinary
- Acelera tiempo de carga en frontend
- Mejora experiencia de usuario en conexiones lentas

---

### 3. Upload Diferido (Optimista)

**Decisión:** Mostrar preview local inmediato sin esperar upload.

**Implementación:**
- Preview instantáneo con `URL.createObjectURL()`
- Upload a Cloudinary solo al confirmar paso/formulario
- Evita imágenes huérfanas en servidor

**Flujo:**
```
1. Usuario selecciona imagen → Preview INMEDIATO
2. Usuario confirma formulario → Upload inicia
3. Success → URL de Cloudinary reemplaza blob local
4. Error → Retry automático o fallback
```

**Razón:** UX optimista - interfaz "snappy" sin esperas.

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

# ☁️ PARTE 4: INFRAESTRUCTURA Y SERVICIOS CLOUD

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
             ├─► Supabase (PostgreSQL + PostGIS)
             │   └─► 65 tablas, 500 MB, puerto 6543
             │
             ├─► MongoDB Atlas (Chat - M0 Free)
             │   └─► 512 MB, 500 conexiones
             │
             ├─► Upstash (Redis - Free)
             │   └─► 10K commands/día
             │
             ├─► AWS SES (Emails - Sandbox)
             │   └─► 200 emails/día
             │
             ├─► Cloudinary (Imágenes - Free)
             │   └─► 25 GB storage/mes
             │
             ├─► Cloudflare R2 (Tickets - Free)
             │   └─► 10 GB, egress ilimitado
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
| **PostgreSQL** | Supabase | Free | 500 MB, 2 CPU shared | 50K queries/día | $0 |
| **MongoDB** | Atlas | M0 | 512 MB shared | Sin backups auto | $0 |
| **Redis** | Upstash | Free | 10K commands/día | 256 MB | $0 |
| **Emails** | AWS SES | Sandbox | 200 emails/día | Sandbox mode | $0 |
| **Imágenes** | Cloudinary | Free | 25 GB/mes | 25 créditos/mes | $0 |
| **Tickets** | R2 | Free | 10 GB storage | Egress ilimitado | $0 |
| **Pagos** | Stripe | Test | N/A | Test mode | $0 |

**Total Infraestructura: $0/mes**

---

### 🔄 Proceso de Migración
