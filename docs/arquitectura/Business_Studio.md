# 🏢 Business Studio - Panel de Control Comercial

**Última actualización:** 12 Febrero 2026  
**Versión:** 1.1 (Completamente Verificado)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura conceptual** del sistema Business Studio:
- ✅ Arquitectura general y flujos
- ✅ Los 15 módulos del sistema
- ✅ Endpoints principales verificados contra código real
- ✅ Sistema de sucursales y roles
- ✅ Servicio centralizado compartido
- ✅ Decisiones arquitectónicas y justificación

**NO incluye:**
- ❌ Código fuente completo (consultar archivos en repositorio)
- ❌ Implementación detallada de funciones
- ❌ Validaciones línea por línea

**Para implementación exacta:**
- Ver: `/apps/api/src/routes/*.routes.ts` (endpoints completos)
- Ver: `/apps/api/src/controllers/*.controller.ts` (lógica de negocio)
- Ver: `/apps/api/src/services/*.service.ts` (operaciones BD)
- Ver: `/apps/web/src/pages/private/business-studio/` (componentes frontend)

---

## 📋 Índice

1. [¿Qué es Business Studio?](#qué-es-business-studio)
2. [¿Para qué sirve?](#para-qué-sirve)
3. [¿Quién lo usa?](#quién-lo-usa)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Los 15 Módulos](#los-15-módulos)
6. [Sistema de Sucursales](#sistema-de-sucursales)
7. [Servicio Centralizado](#servicio-centralizado)
8. [Panel de Preview](#panel-de-preview)
9. [Ubicación de Archivos](#ubicación-de-archivos)
10. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
11. [Referencias](#referencias)

---

## 🎯 ¿Qué es Business Studio?

Business Studio es el **centro de administración completo** para negocios registrados en AnunciaYA. Es una interfaz web dedicada que permite a dueños y gerentes gestionar todos los aspectos de su negocio desde un solo lugar.

**Características principales:**
- 15 módulos especializados de gestión
- Sistema multi-sucursal integrado
- Interfaz responsive (móvil, laptop 1366x768, desktop 1920x1080+)
- Panel de preview en tiempo real
- Integración con ScanYA para datos en vivo

**Progreso actual:** 5 de 15 módulos completados (33%)

---

## 💡 ¿Para qué sirve?

Business Studio centraliza todas las operaciones comerciales en 5 áreas principales:

### 1. Operación Diaria
- Dashboard con KPIs en tiempo real
- Historial de transacciones
- Gestión de clientes
- Opiniones y reseñas
- Alertas de seguridad

### 2. Catálogo & Promociones
- Catálogo de productos/servicios
- Ofertas permanentes
- Cupones temporales

### 3. Engagement & Recompensas
- Sistema de puntos CardYA
- Rifas y dinámicas

### 4. Recursos Humanos
- Gestión de empleados (Nick+PIN para ScanYA)
- Publicación de vacantes

### 5. Análisis & Configuración
- Reportes por periodo
- Gestión de sucursales múltiples
- Perfil del negocio

---

## 👥 ¿Quién lo usa?

### Roles y Accesos

| Rol | Acceso | Permisos |
|-----|--------|----------|
| **Dueño** | Todas las sucursales | Control total de todos los módulos |
| **Gerente** | Sucursal asignada | Gestión de su sucursal específica |

**Nota:** Empleados NO tienen acceso a Business Studio (solo usan ScanYA)

**Validación de acceso:**
- Middleware: `ModoGuard requiereModo="comercial"`
- Todas las rutas protegidas: `/business-studio/*`
- Redirección automática a `/business/onboarding` si incompleto

---

## 🏗️ Arquitectura del Sistema

### Flujo de Acceso

```
Usuario en modo Personal
  ↓
Hace clic en toggle → Cambia a modo Comercial
  ↓
Auto-redirigido a /business-studio
  ↓
Si onboarding_completado = false → /business/onboarding
  ↓
Si onboarding_completado = true → Business Studio Dashboard
```

### Protección de Rutas

**Ubicación:** `apps/web/src/router/index.tsx`

```typescript
{
  path: '/business-studio/*',
  element: (
    <ModoGuard requiereModo="comercial">
      <PaginaModulo />
    </ModoGuard>
  )
}
```

**Validación en cada ruta:**
1. `RutaPrivada` - Usuario autenticado
2. `ModoGuard` - Modo comercial activo
3. `MainLayout` - Layout con menú Business Studio

### Layout Principal

```
┌─────────────────────────────────────────────────────────┐
│ Navbar (con SelectorSucursalesInline)                   │
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│ MenuBusiness  │   Contenido del Módulo                  │
│ Studio        │                                         │
│ (15 opciones) │                                         │
│               │                                         │
│               │                                         │
├───────────────┴─────────────────────────────────────────┤
│ PanelPreviewNegocio (tabs: Card | Perfil)              │
│ Preview en tiempo real con iframe                       │
└─────────────────────────────────────────────────────────┘
```

**Componentes principales:**
- `MenuBusinessStudio.tsx` - Navegación lateral con 15 opciones
- `SelectorSucursalesInline.tsx` - Cambiar entre sucursales (dueños)
- `PanelPreviewNegocio.tsx` - Preview en vivo del negocio

---

## 📦 Los 15 Módulos

> ✅ **VERIFICADO:** Contra `MenuBusinessStudio.tsx` y `router/index.tsx` (30 Enero 2026)

### Organización del Menú

Los 15 módulos están organizados en 5 secciones lógicas:

#### 1. Operación Diaria (5 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 1 | Dashboard | `/business-studio` | LayoutDashboard | ✅ 100% |
| 2 | Transacciones | `/business-studio/transacciones` | Receipt | ⏳ Pendiente |
| 3 | Clientes | `/business-studio/clientes` | Users | ⏳ Pendiente |
| 4 | Opiniones | `/business-studio/opiniones` | MessageSquare | ⏳ Pendiente |
| 5 | Alertas | `/business-studio/alertas` | Bell | ⏳ Pendiente |

#### 2. Catálogo & Promociones (3 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 6 | Catálogo | `/business-studio/catalogo` | ShoppingBag | ✅ 100% |
| 7 | Ofertas | `/business-studio/ofertas` | Tag | ✅ 100% |
| 8 | Cupones | `/business-studio/cupones` | Ticket | ⏳ Pendiente |

#### 3. Engagement & Recompensas (2 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 9 | Puntos | `/business-studio/puntos` | Coins | ✅ 100% |
| 10 | Rifas | `/business-studio/rifas` | Gift | ⏳ Pendiente |

#### 4. Recursos Humanos (2 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 11 | Empleados | `/business-studio/empleados` | UserCog | ⏳ Pendiente |
| 12 | Vacantes | `/business-studio/vacantes` | Briefcase | ⏳ Pendiente |

#### 5. Análisis & Configuración (3 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 13 | Reportes | `/business-studio/reportes` | FileBarChart | ⏳ Pendiente |
| 14 | Sucursales | `/business-studio/sucursales` | Building2 | ⏳ Pendiente |
| 15 | Mi Perfil | `/business-studio/perfil` | User | ✅ 100% |

---

## ✅ Módulos Completados (5/15)

### 1. Dashboard ✅

**Ruta:** `/business-studio`  
**Completado:** 02 Enero 2026

**Funcionalidad:**
- KPIs principales con comparación de periodos
- Gráfica de ventas últimos 7 días
- Panel de campañas activas (ofertas + cupones)
- Feed de interacciones recientes
- Reseñas recientes
- Alertas de seguridad

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/business/dashboard/kpis` | KPIs principales |
| GET | `/api/business/dashboard/ventas` | Ventas para gráfica |
| GET | `/api/business/dashboard/campanas` | Ofertas + cupones activos |
| GET | `/api/business/dashboard/interacciones` | Feed de actividad |
| GET | `/api/business/dashboard/resenas` | Reseñas recientes |
| GET | `/api/business/dashboard/alertas` | Alertas de seguridad |
| PUT | `/api/business/dashboard/alertas/:id` | Marcar alerta leída |

**Componentes:**
- `PaginaDashboard.tsx` - Página principal
- `HeaderDashboard.tsx` - Header con filtros
- `KPIPrincipal.tsx` - KPIs grandes
- `KPISecundario.tsx` - KPIs compactos
- `GraficaVentas.tsx` - Gráfica de líneas
- `PanelCampanas.tsx` - Ofertas + cupones
- `PanelInteracciones.tsx` - Feed de actividad
- `PanelOpiniones.tsx` - Reseñas
- `PanelAlertas.tsx` - Alertas de seguridad

---

### 2. Mi Perfil ✅

**Ruta:** `/business-studio/perfil`  
**Completado:** 06 Enero 2026

**Funcionalidad:**
- 6 tabs de edición
- Mapa Leaflet interactivo (ubicación)
- Upload de imágenes optimista (Cloudinary)
- Panel CardYA integrado
- Horarios con soporte 24/7, cerrado, break/comida

**Tabs:**

| # | Tab | Contenido | Permisos |
|---|-----|-----------|----------|
| 1 | Información | Nombre, descripción, categorías, Panel CardYA | Solo dueños |
| 2 | Contacto | Teléfono, WhatsApp, email, web, redes sociales | Dueños editan todo, gerentes sin sitioWeb |
| 3 | Ubicación | Dirección, ciudad, mapa GPS | Todos |
| 4 | Horarios | 7 días, break/comida, 24/7 | Todos |
| 5 | Imágenes | Logo, foto perfil, portada, galería | Dueños editan todo, gerentes sin logo |
| 6 | Operación | Métodos pago, envío, servicio domicilio | Todos |

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| PUT | `/api/negocios/:id/informacion` | Actualizar nombre, descripción, categorías, CardYA |
| PUT | `/api/negocios/:id/contacto` | Actualizar contacto y redes sociales |
| PUT | `/api/negocios/:id/ubicacion` | Actualizar dirección y GPS |
| PUT | `/api/negocios/:id/horarios` | Actualizar horarios 7 días |
| PUT | `/api/negocios/:id/imagenes` | Actualizar imágenes |
| PUT | `/api/negocios/:id/operacion` | Actualizar métodos pago y envío |

**Componentes:**
- `PaginaPerfil.tsx` - Página con tabs
- `TabInformacion.tsx` - Datos generales + Panel CardYA
- `TabContacto.tsx` - Contacto y redes
- `TabUbicacion.tsx` - Mapa Leaflet
- `TabHorarios.tsx` - Horarios 7 días
- `TabImagenes.tsx` - Upload imágenes
- `TabOperacion.tsx` - Métodos pago + servicios

---

### 3. Catálogo ✅

**Ruta:** `/business-studio/catalogo`  
**Completado:** 07 Enero 2026 (Fase 5.4.1)

**Funcionalidad:**
- Lista de productos/servicios
- Modal crear/editar artículo
- Upload de imágenes a **Cloudflare R2** (presigned URL, frontend sube directo)
- Filtros por tipo (producto/servicio) y categoría
- Sistema de asignación a sucursales (N:N)
- Duplicar artículo a otras sucursales (solo dueños)

> **Almacenamiento de imágenes:** Migrado de Cloudinary → R2 (Marzo 2026).
> Las imágenes existentes en Cloudinary siguen siendo válidas. Nuevas imágenes van a `articulos/` en R2.
> Hook: `useR2Upload` — optimiza a WebP antes de subir.
> La eliminación es inteligente: detecta automáticamente R2 vs Cloudinary según la URL.

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/articulos/upload-imagen` | Generar presigned URL para subir imagen a R2 |
| POST | `/api/articulos` | Crear artículo |
| GET | `/api/articulos` | Listar artículos de la sucursal |
| GET | `/api/articulos/:id` | Obtener artículo específico |
| PUT | `/api/articulos/:id` | Actualizar artículo |
| DELETE | `/api/articulos/:id` | Eliminar artículo |
| POST | `/api/articulos/:id/duplicar` | Duplicar a otras sucursales |

**Componentes:**
- `PaginaCatalogo.tsx` - Lista con filtros
- `CardArticulo.tsx` - Tarjeta de producto
- `ModalArticulo.tsx` - Crear/editar
- `ModalDuplicar.tsx` - Duplicar a sucursales

---

### 4. Ofertas ✅

**Ruta:** `/business-studio/ofertas`  
**Completado:** 16 Enero 2026 (Fase 5.4.2)

**Funcionalidad:**
- Lista de ofertas con filtros
- Modal crear/editar oferta
- 6 tipos: 2x1, 3x2, Descuento %, Descuento $, Envío gratis, Otro
- Configuración días y horarios de vigencia
- Duplicar oferta a otras sucursales (solo dueños)
- Vista previa pública `/p/oferta/:id`

> **Almacenamiento de imágenes:** Pendiente de migrar Cloudinary → R2 (mismo patrón que Catálogo).

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/ofertas` | Crear oferta |
| GET | `/api/ofertas` | Listar ofertas de la sucursal |
| GET | `/api/ofertas/:id` | Obtener oferta específica |
| PUT | `/api/ofertas/:id` | Actualizar oferta |
| DELETE | `/api/ofertas/:id` | Eliminar oferta |
| POST | `/api/ofertas/:id/duplicar` | Duplicar a otras sucursales |

**Componentes:**
- `PaginaOfertas.tsx` - Lista con filtros
- `CardOferta.tsx` - Tarjeta de oferta
- `ModalOferta.tsx` - Crear/editar
- `ModalDuplicarOferta.tsx` - Duplicar a sucursales

---

### 5. Puntos ✅

**Ruta:** `/business-studio/puntos`  
**Completado:** 5 Febrero 2026 (Fase 5.6)

**Funcionalidad:**
- Configurar valor del punto ("Por cada $X gana Y puntos")
- Configurar expiración de puntos (días o nunca expiran)
- Configurar expiración de vouchers
- Sistema de niveles activable:
  - 3 niveles: Bronce, Plata, Oro
  - Rangos de puntos configurables
  - Multiplicadores configurables (1.0x, 1.2x, 1.5x)
- CRUD completo de recompensas:
  - Imagen, nombre, descripción
  - Puntos requeridos
  - Stock (limitado o ilimitado)
  - Activo/inactivo

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/puntos/configuracion` | Obtener config actual |
| PUT | `/api/puntos/configuracion` | Actualizar config |
| GET | `/api/puntos/recompensas` | Listar recompensas |
| POST | `/api/puntos/recompensas` | Crear recompensa |
| PUT | `/api/puntos/recompensas/:id` | Actualizar recompensa |
| DELETE | `/api/puntos/recompensas/:id` | Eliminar recompensa |

**Componentes:**
- `PaginaPuntos.tsx` - Página principal con 3 secciones
- `SistemaNiveles.tsx` - Sistema de niveles CardYA
- `CardRecompensa.tsx` - Tarjeta de recompensa
- `ModalRecompensa.tsx` - Crear/editar recompensa

**Sistema de Expiración:**
- Expiración en tiempo real (sin cron jobs)
- Puntos expiran al final del día local del negocio
- Vouchers vencidos devuelven puntos automáticamente
- Zona horaria del negocio respetada

---

## ⏳ Módulos Pendientes (10/15)

### 6. Transacciones ⏳

**Dependencias:** ScanYA (Fase 5.5)  
**Tiempo estimado:** ~1 día  
**Prioridad:** ALTA

**Funcionalidad esperada:**
- Historial completo de ventas registradas en ScanYA
- Filtros: fecha, sucursal, empleado, método de pago
- Exportar CSV/Excel
- Detalle de cada transacción

---

### 7. Clientes ⏳

**Dependencias:** ScanYA (Fase 5.5)  
**Tiempo estimado:** ~2 días  
**Prioridad:** ALTA

**Funcionalidad esperada:**
- Lista de clientes que han comprado
- Detalle por cliente: visitas, puntos, nivel CardYA, última compra
- Historial de transacciones por cliente
- Exportar base de clientes

---

### 8. Opiniones ⏳

**Dependencias:** Transacciones + Clientes  
**Tiempo estimado:** ~3 días  
**Prioridad:** MEDIA

**Funcionalidad esperada:**
- Ver reseñas con calificación ⭐ 1-5
- Responder desde Business Studio
- Dashboard de métricas (promedio, total, tasa de respuesta)
- Templates de respuesta pre-escritos

---

### 9. Alertas ⏳

**Dependencias:** Ninguna  
**Tiempo estimado:** ~1-2 días  
**Prioridad:** MEDIA

**Funcionalidad esperada:**
- Panel completo de alertas de seguridad
- Tipos: monto alto, actividad inusual, intentos fallidos
- Filtros por severidad, tipo, fecha
- Marcar como leída/archivada

---

### 10-15. Otros Módulos Pendientes

Los módulos restantes están documentados en el RoadMap con sus dependencias y tiempos estimados:
- **Cupones** - Fase 5.11
- **Puntos** - Fase 5.9
- **Rifas** - Fase 6.2
- **Empleados** - Fase 6.4
- **Vacantes** - Fase 6.3
- **Reportes** - Fase 6.6
- **Sucursales** - Fase 6.5

---

## 🏢 Sistema de Sucursales

### Concepto Clave

**Usuario ve "negocio"** pero internamente **opera sobre SUCURSALES**.

```
Negocio: "Tacos Don Pepe"
  ├─ Sucursal 1: Centro (principal)
  ├─ Sucursal 2: Zona Norte
  └─ Sucursal 3: Zona Sur
```

### Arquitectura

#### Frontend - Interceptor Axios

**Ubicación:** `apps/web/src/services/api.ts`

```typescript
axios.interceptors.request.use((config) => {
  const usuario = useAuthStore.getState().usuario;
  
  if (usuario?.modoActivo === 'comercial' && usuario?.sucursalActiva) {
    config.params = {
      ...config.params,
      sucursalId: usuario.sucursalActiva
    };
  }
  
  return config;
});
```

**Resultado:** Todas las peticiones en modo comercial incluyen `?sucursalId=XXX` automáticamente.

---

#### Backend - Middlewares

**Ubicación:** `apps/api/src/middleware/`

**1. verificarNegocio** (`negocio.middleware.ts`)
- Valida que usuario tenga negocio asociado
- Inyecta `req.negocioId` en la request
- Funciona para dueños Y gerentes

**2. validarAccesoSucursal** (`sucursal.middleware.ts`)
- Valida acceso a la sucursal solicitada
- Dueños: acceso a todas sus sucursales
- Gerentes: solo su sucursal asignada
- Retorna 403 si gerente intenta acceder a otra sucursal

---

#### Backend - Filtrado SQL

**Patrón usado en todos los services:**

```sql
SELECT ...
FROM tabla t
WHERE t.negocio_id = $negocioId
  AND (
    $sucursalId::uuid IS NULL 
    OR t.sucursal_id = $sucursalId::uuid
  )
```

**Lógica:**
- Si `sucursalId = null` → retorna TODAS las sucursales (vista global)
- Si `sucursalId = uuid` → retorna solo ESA sucursal

---

### Flujo Completo

```
Frontend - Usuario cambia sucursal
  ↓
useAuthStore actualiza sucursalActiva
  ↓
Interceptor Axios agrega ?sucursalId=XXX
  ↓
GET /api/business/dashboard/kpis?sucursalId=XXX
  ↓
Backend - verificarToken
  ↓
Backend - verificarNegocio (inyecta negocioId)
  ↓
Backend - validarAccesoSucursal (valida permisos)
  ↓
Service filtra datos por sucursal
  ↓
Response: Datos específicos de esa sucursal
```

---

## 🔧 Servicio Centralizado

### negocioManagement.service.ts

**Ubicación:** `apps/api/src/services/negocioManagement.service.ts`  
**Líneas de código:** 941 líneas  
**Propósito:** Evitar duplicación de lógica entre Onboarding y Business Studio

**Funciones exportadas (20):**

#### Información General (3)
1. `actualizarInfoGeneral` - Nombre del negocio + subcategorías
2. `actualizarDescripcionNegocio` - Descripción del negocio
3. `actualizarRedesSocialesSucursal` - Facebook, Instagram, TikTok, Twitter

#### Ubicación (1)
4. `actualizarSucursal` - Dirección, ciudad, GPS (PostGIS), zona horaria

#### Contacto (2)
5. `actualizarContactoSucursal` - Teléfono, WhatsApp, email de sucursal
6. `actualizarContactoNegocio` - Sitio web del negocio

#### Horarios (1)
7. `actualizarHorariosSucursal` - Horarios 7 días (JSONB)

#### Imágenes (6)
8. `actualizarLogoNegocio` - Logo del negocio
9. `actualizarPortadaSucursal` - Portada de sucursal
10. `agregarImagenesGaleria` - Agregar fotos a galería
11. `eliminarLogoNegocio` - Eliminar logo
12. `eliminarFotoPerfilSucursal` - Eliminar foto perfil sucursal
13. `eliminarPortadaSucursal` - Eliminar portada
14. `eliminarImagenGaleria` - Eliminar foto de galería

#### Operación (5)
15. `actualizarMetodosPagoNegocio` - Métodos de pago aceptados
16. `actualizarParticipacionPuntos` - Participación en CardYA
17. `actualizarNombreSucursal` - Nombre específico de sucursal
18. `actualizarFotoPerfilSucursal` - Foto perfil de sucursal
19. `actualizarEnvioDomicilio` - Toggle envío a domicilio
20. `actualizarServicioDomicilio` - Toggle servicio a domicilio

---

### ¿Por qué un servicio centralizado?

**Problema:** Onboarding y Business Studio necesitan las MISMAS operaciones CRUD.

**Solución elegida:**
```typescript
// Onboarding - Paso 1
import { actualizarInfoGeneral } from '@/services/negocioManagement';
await actualizarInfoGeneral(negocioId, datos);

// Business Studio - Mi Perfil Tab 1
import { actualizarInfoGeneral } from '@/services/negocioManagement';
await actualizarInfoGeneral(negocioId, datos);

// ✅ MISMA FUNCIÓN, CERO DUPLICACIÓN
```

**Beneficios:**
- ✅ Single source of truth
- ✅ Un bug se arregla en un solo lugar
- ✅ Más fácil de mantener
- ✅ Más fácil de testear

---

## 👁️ Panel de Preview

### Componente: PanelPreviewNegocio

**Ubicación:** `apps/web/src/components/layout/PanelPreviewNegocio.tsx`  
**Propósito:** Preview en tiempo real del negocio público

**Características:**
- 2 tabs: Card | Perfil
- Preview con iframe
- Actualización en vivo
- Versión móvil y desktop

**Tabs:**

| Tab | URL Preview | Qué muestra |
|-----|-------------|-------------|
| Card | `/negocios?preview=card&sucursalId=XXX` | Tarjeta del negocio (cómo se ve en lista) |
| Perfil | `/negocios/XXX?preview=true` | Perfil completo del negocio |

**Estado del Preview:**
- Badge "En vivo" con indicador verde
- Se actualiza automáticamente cuando cambias:
  - Datos del negocio
  - Imágenes
  - Catálogo
  - Ofertas

---

## 📂 Ubicación de Archivos

> ✅ **VERIFICADO:** Contra estructura real del proyecto (30 Enero 2026)

### Backend

```
apps/api/src/
├── controllers/
│   ├── dashboard.controller.ts       ✅ 7 funciones
│   ├── negocios.controller.ts        ✅ 19 endpoints
│   ├── articulos.controller.ts       ✅ 9 endpoints
│   └── ofertas.controller.ts         ✅ 10 endpoints
│
├── services/
│   ├── dashboard.service.ts          ✅ KPIs y métricas
│   ├── negocioManagement.service.ts  ✅ 20 funciones CRUD
│   ├── negocios.service.ts           ✅ Búsquedas y queries
│   ├── articulos.service.ts          ✅ CRUD catálogo
│   └── ofertas.service.ts            ✅ CRUD ofertas
│
├── routes/
│   ├── dashboard.routes.ts           ✅ 7 rutas
│   ├── negocios.routes.ts            ✅ 19 rutas
│   ├── articulos.routes.ts           ✅ 9 rutas
│   └── ofertas.routes.ts             ✅ 10 rutas
│
├── middleware/
│   ├── auth.ts                       ✅ verificarToken
│   ├── authOpcional.middleware.ts    ✅ verificarTokenOpcional
│   ├── negocio.middleware.ts         ✅ verificarNegocio
│   ├── sucursal.middleware.ts        ✅ validarAccesoSucursal
│   └── validarModo.ts                ✅ Validación de modo
│
└── validations/
    ├── articulos.schema.ts           ✅ Schemas Zod catálogo
    └── ofertas.schema.ts             ✅ Schemas Zod ofertas
```

---

### Frontend

```
apps/web/src/
├── pages/private/business-studio/
│   ├── dashboard/
│   │   ├── componentes/              ✅ 11 componentes
│   │   └── PaginaDashboard.tsx       ✅ Página principal
│   │
│   ├── perfil/
│   │   ├── components/               ✅ 8 tabs
│   │   ├── hooks/usePerfil.ts        ✅ Hook compartido
│   │   └── PaginaPerfil.tsx          ✅ Página con tabs
│   │
│   ├── catalogo/
│   │   ├── CardArticulo.tsx          ✅ Tarjeta producto
│   │   ├── ModalArticulo.tsx         ✅ Crear/editar
│   │   ├── ModalDuplicar.tsx         ✅ Duplicar a sucursales
│   │   └── PaginaCatalogo.tsx        ✅ Lista con filtros
│   │
│   └── ofertas/
│       ├── CardOferta.tsx            ✅ Tarjeta oferta
│       ├── ModalOferta.tsx           ✅ Crear/editar
│       ├── ModalDuplicarOferta.tsx   ✅ Duplicar a sucursales
│       └── PaginaOfertas.tsx         ✅ Lista con filtros
│
├── components/layout/
│   ├── MenuBusinessStudio.tsx        ✅ Menú 15 opciones
│   ├── DrawerBusinessStudio.tsx      ✅ Drawer móvil
│   ├── PanelPreviewNegocio.tsx       ✅ Preview en vivo
│   └── SelectorSucursalesInline.tsx  ✅ Cambiar sucursal
│
├── router/
│   ├── index.tsx                     ✅ 15 rutas BS
│   └── guards/ModoGuard.tsx          ✅ Guard de modo
│
├── services/
│   ├── dashboardService.ts           ✅ API calls dashboard
│   ├── negociosService.ts            ✅ API calls perfil
│   ├── articulosService.ts           ✅ API calls catálogo
│   └── ofertasService.ts             ✅ API calls ofertas
│
└── stores/
    ├── useAuthStore.ts               ✅ Auth + modo + sucursal
    └── useDashboardStore.ts          ✅ Estado dashboard
```

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Por qué eliminar tipo "Online"?

**Decisión:** 06 Enero 2026 - Todos los negocios son físicos.

**Antes:**
```
Negocio puede ser:
- Físico (requiere dirección)
- Online (sin dirección)
- Híbrido (ambos)
```

**Ahora:**
```
TODOS los negocios requieren ubicación física
+ tiene_servicio_domicilio (boolean)
+ tiene_envio_domicilio (boolean)
```

**Razones:**
- ✅ Simplifica arquitectura (no validaciones condicionales)
- ✅ CardYA requiere ubicación física para otorgar puntos
- ✅ Sistema de cercanía requiere coordenadas PostGIS
- ✅ Clientes quieren saber DÓNDE está el negocio
- ✅ Servicios como plomería/electricidad van AL cliente (servicio_domicilio)

**Cambios en base de datos:**
- Eliminada: `requiere_direccion` (boolean)
- Agregado: `tiene_servicio_domicilio` (boolean)
- Agregado: `tiene_envio_domicilio` (boolean)

---

### 2. ¿Por qué servicio centralizado?

**Problema:** Onboarding y Business Studio necesitan CRUD de negocio.

**Alternativa A (descartada):** Duplicar lógica
```typescript
// onboarding/api.ts
export async function actualizarDatos() { ... }

// business-studio/api.ts  
export async function actualizarDatos() { ... }

// ❌ Duplicación, bugs diferentes, mantenimiento doble
```

**Alternativa B (elegida):** Servicio centralizado
```typescript
// services/negocioManagement.service.ts
export async function actualizarInfoGeneral() { ... }

// Usado por:
// - Onboarding (8 pasos)
// - Business Studio (Mi Perfil)
// - Cualquier módulo futuro

// ✅ Single source of truth
```

**Beneficios:**
- ✅ Un bug se arregla en un solo lugar
- ✅ Cambios se propagan automáticamente
- ✅ Más fácil de testear
- ✅ Menos código que mantener

---

### 3. ¿Por qué 15 módulos separados?

**Alternativa A (descartada):** Módulo único gigante
```
/business-studio
  - Todo en un solo archivo de 5,000+ líneas
```

**Alternativa B (elegida):** 15 módulos separados
```
/business-studio/
  - dashboard
  - perfil
  - catalogo
  - ofertas
  - ... (11 más)
```

**Razones:**
- ✅ Code splitting (carga solo lo necesario)
- ✅ Desarrollo paralelo (varios devs trabajando)
- ✅ Testing aislado por módulo
- ✅ Mantenibilidad a largo plazo
- ✅ Escalabilidad (agregar nuevos módulos fácilmente)

---

### 4. ¿Por qué PanelPreviewNegocio?

**Decisión:** Panel sticky en bottom con tabs.

**Problema:**
- Usuario edita su negocio en Business Studio
- Necesita ver cómo se ve públicamente
- Cambiar de pestaña constantemente es tedioso

**Solución:**
```
┌────────────────────────────────────┐
│ Business Studio - Editando Perfil  │
├────────────────────────────────────┤
│ [Formularios de edición]           │
│                                    │
├────────────────────────────────────┤
│ Preview en vivo │ Card │ Perfil │  │ ← Panel sticky
│ [iframe con preview]               │
└────────────────────────────────────┘
```

**Beneficios:**
- ✅ Feedback visual inmediato de cambios
- ✅ No necesita cambiar de pestaña
- ✅ Ve exactamente cómo verán los clientes
- ✅ 2 vistas: Card (lista) y Perfil (completo)

---

### 5. ¿Por qué sistema multi-sucursal?

**Decisión:** Usuario ve "negocio" pero opera sobre SUCURSALES.

**Razón:**
- ✅ Un negocio puede tener múltiples ubicaciones físicas
- ✅ Cada sucursal tiene datos independientes:
  - Horarios diferentes
  - Teléfono diferente
  - Empleados diferentes
  - Productos disponibles diferentes
- ✅ Sistema de puntos es GLOBAL (compartido entre sucursales)
- ✅ Dueños pueden ver todas, gerentes solo la suya

**Arquitectura:**
- Frontend: Interceptor Axios agrega `?sucursalId=XXX` automático
- Backend: Middleware valida permisos por sucursal
- SQL: Filtros con patrón `sucursalId IS NULL OR columna = sucursalId`

---

### 6. ¿Por qué sistema de duplicación?

**Problema:** Negocio con 10 sucursales necesita el mismo producto en todas.

**Solución:** Duplicar artículos/ofertas a otras sucursales.

**Restricción:** SOLO dueños (usuarios SIN `sucursal_asignada`)

**Razón:**
- ✅ Ahorra tiempo (crear una vez, duplicar a 10 sucursales)
- ✅ Mantiene control del dueño (gerentes no pueden duplicar)
- ✅ Cada copia es independiente (se puede editar después)

**Endpoints:**
- `POST /api/articulos/:id/duplicar`
- `POST /api/ofertas/:id/duplicar`

---

## 📚 Referencias

### Documentación Relacionada

**En el proyecto:**
- `AnunciaYA_-_RoadMap_29-01-2026.md` - Estado completo del proyecto
- `SISTEMA_SUCURSALES_IMPLEMENTACION.md` - Sistema de sucursales
- `Sistema_de_Filtros_por_Sucursal.md` - Filtrado por sucursal
- `Toggle_UI___Datos_Dinámicos_del_Negocio.md` - Toggle de modo
- `Sistema_Separacion_Por_Modo_AnunciaYA.md` - Arquitectura de modos

### Módulos Relacionados

- **Onboarding:** Comparte servicios CRUD con Business Studio
- **ScanYA:** Provee datos de transacciones y clientes
- **CardYA:** Sistema de puntos configurado desde Business Studio

---

## ✅ Verificación

**Última verificación:** 12 Febrero 2026

**Archivos backend verificados:** 8/8 ✅
- `dashboard.routes.ts` (101 líneas)
- `dashboard.controller.ts` (255 líneas)
- `negocios.routes.ts` (427 líneas)
- `articulos.routes.ts` (165 líneas)
- `ofertas.routes.ts` (175 líneas)
- `negocioManagement.service.ts` (941 líneas - 20 funciones)
- `puntos.routes.ts` (~150 líneas)
- `puntos.service.ts` (~400 líneas)

**Archivos frontend verificados:** 4/4 ✅
- `router/index.tsx` (15 rutas Business Studio)
- `MenuBusinessStudio.tsx` (15 opciones organizadas)
- `PanelPreviewNegocio.tsx` (2 tabs preview)
- `PaginaPuntos.tsx` (página completa con 3 secciones)

**Endpoints totales documentados:**
- Dashboard: 7 endpoints
- Negocios (Perfil): 6 endpoints principales
- Artículos (Catálogo): 6 endpoints principales
- Ofertas: 6 endpoints principales
- Puntos: 6 endpoints principales
- **TOTAL:** 31 endpoints principales ✅

**Módulos verificados:** 5/5 completados ✅
- Dashboard (02/01/2026)
- Mi Perfil (06/01/2026)
- Catálogo (07/01/2026)
- Ofertas (16/01/2026)
- Puntos (05/02/2026)

**Progreso:** 5/15 módulos = 33.33% (redondeado 33%)

**Métodos de verificación:**
1. Comparación con RoadMap oficial
2. Revisión de código fuente backend (routes, controllers, services)
3. Revisión de código fuente frontend (componentes, router)
4. Verificación de estructura de carpetas
5. Confirmación de funciones del servicio centralizado

---

**Última actualización:** 12 Febrero 2026  
**Autor:** Equipo AnunciaYA  
**Versión:** 1.1 (100% Verificado contra código real)
