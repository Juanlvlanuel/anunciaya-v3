# 🏢 Business Studio - Panel de Control Comercial

**Última actualización:** 28 Abril 2026
**Versión:** 2.3 (Visión v3: Rifas removido del alcance, BS pasa a 13 módulos — 12/13)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura conceptual** del sistema Business Studio:
- ✅ Arquitectura general y flujos
- ✅ Los 13 módulos del sistema (Rifas removido en visión v3 — ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §5.1)
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
5. [Los 13 Módulos](#los-13-módulos)
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
- 13 módulos especializados de gestión
- Sistema multi-sucursal integrado
- Interfaz responsive (móvil, laptop 1366x768, desktop 1920x1080+)
- Panel de preview en tiempo real
- Integración con ScanYA para datos en vivo

**Progreso actual:** 12 de 13 módulos completados (92%). Migración React Query: 12/12 BS completo.

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

### 4. Recursos Humanos
- Gestión de empleados (Nick+PIN para ScanYA)
- Publicación de vacantes (alimenta la sección pública Servicios)

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
│ (14 opciones) │                                         │
│               │                                         │
│               │                                         │
├───────────────┴─────────────────────────────────────────┤
│ PanelPreviewNegocio (tabs: Card | Perfil)              │
│ Preview en tiempo real con iframe                       │
└─────────────────────────────────────────────────────────┘
```

**Componentes principales:**
- `MenuBusinessStudio.tsx` - Navegación lateral con 13 opciones (pendiente de limpieza UI: aún muestra ítem Rifas removido en visión v3)
- `SelectorSucursalesInline.tsx` - Cambiar entre sucursales (dueños)
- `PanelPreviewNegocio.tsx` - Preview en vivo del negocio

---

## 📦 Los 13 Módulos

> ✅ **VERIFICADO:** Contra `MenuBusinessStudio.tsx` y `router/index.tsx` (6 Abril 2026). Verificación posterior pendiente tras la limpieza UI (Fase B): el código aún muestra el ítem Rifas removido en visión v3.

### Organización del Menú

Los 13 módulos están organizados en 5 secciones lógicas:

#### 1. Operación Diaria (5 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 1 | Dashboard | `/business-studio` | LayoutDashboard | ✅ 100% |
| 2 | Transacciones | `/business-studio/transacciones` | Receipt | ✅ 100% |
| 3 | Clientes | `/business-studio/clientes` | Users | ✅ 100% |
| 4 | Opiniones | `/business-studio/opiniones` | MessageSquare | ✅ 100% |
| 5 | Alertas | `/business-studio/alertas` | Bell | ✅ 100% |

#### 2. Catálogo & Promociones (2 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 6 | Catálogo | `/business-studio/catalogo` | ShoppingBag | ✅ 100% |
| 7 | Promociones | `/business-studio/ofertas` | Tag | ✅ 100% (Ofertas + Cupones unificados) |

#### 3. Engagement & Recompensas (1 módulo)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 8 | Puntos y Recompensas | `/business-studio/puntos` | Coins | ✅ 100% |

> **Rifas removido del alcance v1** (visión estratégica abril 2026). El ítem aún aparece en el menú UI — pendiente de limpieza en Fase B. Ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §5.1.

#### 4. Recursos Humanos (2 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 9 | Empleados | `/business-studio/empleados` | UserCog | ✅ 100% |
| 10 | Vacantes | `/business-studio/vacantes` | Briefcase | ⏳ Pendiente — alimenta sección pública Servicios |

#### 5. Análisis & Configuración (3 módulos)

| # | Módulo | Ruta | Icono | Estado |
|---|--------|------|-------|--------|
| 11 | Reportes | `/business-studio/reportes` | FileBarChart | ✅ Completo |
| 12 | Sucursales | `/business-studio/sucursales` | Building2 | ✅ Completo |
| 13 | Mi Perfil | `/business-studio/perfil` | User | ✅ 100% |

---

## ✅ Módulos Completados (12/13)

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

**Estado (React Query + Zustand UI):**
- `hooks/queries/useDashboard.ts` — 5 useQuery (KPIs, ventas, campañas, interacciones, alertas) + 2 useMutation (marcar alerta leída/todas)
- `useDashboardStore.ts` simplificado — solo `periodo` (UI)
- Query keys: `queryKeys.dashboard.*`

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

**Estado (React Query + hook local de formulario):**
- `hooks/queries/usePerfil.ts` — useQuery para datos del perfil, sucursales, categorías, subcategorías (carga inicial con caché)
- `perfil/hooks/usePerfil.ts` — hook de formulario que consume los queries de React Query e inicializa estados locales por tab. Guardado con API directa (no mutación formal)
- Sin store Zustand — todo el estado es local al hook de formulario
- Query keys: `queryKeys.perfil.sucursal(sucursalId)`, `queryKeys.perfil.sucursales(negocioId)`, `queryKeys.perfil.categorias()`, `queryKeys.perfil.subcategorias(categoriaId)`

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
- `ModalArticulo.tsx` - Crear/editar
- `ModalDuplicar.tsx` - Duplicar a sucursales

**Estado (React Query + useState local):**
- `hooks/queries/useArticulos.ts` — useQuery (lista), 4 useMutation (crear, actualizar, eliminar, duplicar) con updates optimistas
- Store Zustand eliminado — no hay estado UI compartido; filtros/orden son useState locales en la página
- Query keys: `queryKeys.articulos.porSucursal(sucursalId)`

---

### 4. Promociones ✅ (antes "Ofertas")

**Ruta:** `/business-studio/ofertas`
**Completado:** 22 Marzo 2026 (Ofertas + Cupones unificados)

**Concepto:** Módulo unificado que maneja ofertas públicas y cupones privados.
- Toggle Oferta (📢) / Cupón (🎟️) en el modal
- Cupones: código único por usuario, validación ScanYA
- Ver documento completo: `docs/arquitectura/Promociones.md`

**Funcionalidad Ofertas (públicas):**
- Lista con filtros (estado, visibilidad, tipo, búsqueda)
- Modal crear/editar con imagen R2
- 6 tipos: 2x1, 3x2, Desc. %, Monto $, Envío gratis, Otro
- Duplicar a otras sucursales (solo dueños)

**Funcionalidad Cupones (privados):**
- Modal con 3 tabs: Detalles | Ajustes | Enviar a
- Selector de clientes con filtros (nivel CardYA, actividad)
- Código único auto-generado por cliente (VIP-XXXXX)
- Reenviar cupón a clientes asignados
- Revocar cupón (desactiva la oferta)
- Notificaciones automáticas al asignar

**Endpoints principales:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/ofertas` | Crear oferta/cupón |
| GET | `/api/ofertas` | Listar por sucursal |
| PUT | `/api/ofertas/:id` | Actualizar |
| DELETE | `/api/ofertas/:id` | Eliminar |
| POST | `/api/ofertas/:id/duplicar` | Duplicar a sucursales |
| POST | `/api/ofertas/:id/asignar` | Asignar cupón a clientes |
| POST | `/api/ofertas/:id/reenviar` | Reenviar notificación cupón |
| POST | `/api/ofertas/:id/revocar` | Revocar cupón |

**Componentes:**
- `PaginaOfertas.tsx` - Lista con filtros y acciones
- `ModalOferta.tsx` - Contenedor con tabs
- `TabOferta.tsx` - Formulario principal
- `TabExclusiva.tsx` - Ajustes cupón + preview
- `TabClientes.tsx` - Selector clientes con dropdowns
- `ModalDuplicarOferta.tsx` - Duplicar a sucursales

**Estado (React Query + useState local):**
- `hooks/queries/useOfertas.ts` — useQuery (lista), 4 useMutation (crear, actualizar, eliminar, duplicar) con updates optimistas + helper `useOfertasInvalidar` para revocar/reactivar
- Store Zustand eliminado — filtros/orden son useState locales en la página
- Query keys: `queryKeys.ofertas.porSucursal(sucursalId)`

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
  - Tipo: "Básica" (canjear con puntos) o "Por compras frecuentes" (N+1)
  - N+1: número de compras requeridas + toggle "requiere puntos"
  - Verificación automática en ScanYA al registrar venta
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

**Estado (React Query + Zustand UI):**
- `hooks/queries/usePuntos.ts` — 3 useQuery (configuración global, recompensas global, estadísticas por sucursal+periodo) + 4 useMutation (config, crear/actualizar/eliminar recompensa) con updates optimistas
- `usePuntosStore.ts` simplificado — solo `periodo` (UI)
- `usePuntosConfiguracion()` también es consumido por Clientes, Transacciones, Ofertas y ChatYA para leer `nivelesActivos`
- Query keys: `queryKeys.puntos.configuracion()`, `queryKeys.puntos.recompensas()`, `queryKeys.puntos.estadisticas(sucursalId, periodo)`

**Sistema de Expiración:**
- Expiración en tiempo real (sin cron jobs)
- Puntos expiran al final del día local del negocio
- Vouchers vencidos devuelven puntos automáticamente
- Zona horaria del negocio respetada

---

## ✅ Módulos Completados (continuación)

### Alertas ✅ (Sprint 9 — 3 Abr 2026)

**Completado.** Documento detallado: `docs/arquitectura/Alertas.md`

- 16 tipos de alertas en 4 categorías (Seguridad, Operativa, Rendimiento, Engagement)
- Motor de detección automática: 5 en tiempo real (ScanYA) + 7 cron diario + 4 cron semanal
- Configuración de umbrales por negocio
- Notificaciones push para severidad alta
- Página completa: KPIs, filtros, tabla/cards, modales detalle y configuración
- Testing: 167 API tests + 12 E2E tests

---

### Opiniones ✅

**Ruta:** `/business-studio/opiniones`
**Completado:** 07 Marzo 2026

**Funcionalidad:**
- Lista de reseñas de clientes (todas de una vez, filtrado local)
- KPIs: promedio estrellas, total reseñas, pendientes de respuesta
- Filtros: pendientes, por estrellas, búsqueda por nombre
- Responder reseñas con update optimista (respuesta temporal → reemplazo con dato real)
- Distribución visual por estrellas (click para filtrar)

**Endpoints:**

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| GET | `/api/resenas` | Listar reseñas de la sucursal |
| GET | `/api/resenas/kpis` | KPIs (promedio, total, pendientes) |
| POST | `/api/resenas/:id/responder` | Responder una reseña |

**Componentes:**
- `PaginaOpiniones.tsx` - Lista con filtros y distribución por estrellas
- `ModalResponder.tsx` - Modal para escribir respuesta

**Estado (React Query — store eliminado):**
- `hooks/queries/useResenas.ts` — 2 useQuery (lista, KPIs) + 1 useMutation (responder con optimistic update en lista + KPIs)
- Store Zustand eliminado completamente — filtros son useState locales
- Query keys: `queryKeys.resenas.lista(sucursalId)`, `queryKeys.resenas.kpis(sucursalId)`

---

### Empleados ✅ (Sprint 10 — 5 Abr 2026)

**Completado.** Documento detallado: `docs/arquitectura/Empleados.md`

- CRUD completo con permisos dueño/gerente
- 5 permisos granulares verificados en BD en tiempo real
- Horarios semanales + estadísticas de turnos ScanYA
- Revocación remota de sesiones (Redis + cierre turno)
- Testing: 188 API tests + 9 E2E tests

**Estado (React Query — store eliminado):**
- `hooks/queries/useEmpleados.ts` — KPIs, lista (infinite), detalle, 6 mutations con optimistic updates
- Store Zustand eliminado — filtros son useState locales en la página
- Query keys: `queryKeys.empleados.*`

---

### Reportes ✅

**Sprint 11 — 12 Abril 2026**

5 tabs con KPIs coloridos (CarouselKPI), tablas y cards visuales. Filtro universal de fechas (DatePicker + rangos rápidos). Exportación XLSX. Incluye al dueño en la tabla de empleados, fix de reseñas sin-responder con self-join, funnels de ofertas/cupones/recompensas con cards de "más popular".

**Documento dedicado:** `docs/arquitectura/Reportes.md`

---

### Sucursales ✅

**Ruta:** `/business-studio/sucursales`
**Completado:** 16 Abril 2026 (Sprint 12)

**Funcionalidad:**
- KPIs (Total, Activas, Inactivas)
- CRUD completo con filtros + vista dual móvil/desktop
- Clonación automática desde Matriz: horarios, métodos de pago, catálogo completo (artículos independientes), imágenes R2 (foto perfil, portada, galería)
- Modal crear con vista de progreso animado (5 pasos sincronizados con el request)
- Gestión de gerentes: dueño crea cuenta directamente (sin auto-registro), revoca, reenvía credenciales
- Contraseña provisional + `requiereCambioContrasena` para primer login
- Blindajes anti-fraude: dueño no puede auto-asignarse, correo único, 1 gerente por sucursal, gerente no puede cambiar correo/sucursalAsignada ni crear negocio propio
- Hard delete con limpieza exhaustiva de R2 (sucursal, galería, artículos huérfanos, ofertas, empleados, dinámicas + premios, bolsa trabajo, tickets ScanYA, evidencia transacciones) en paralelo
- CASCADE de PostgreSQL en tablas relacionadas
- ChatYA NO se elimina (pertenece a conversaciones de usuarios)

**Documento dedicado:** `docs/arquitectura/Sucursales.md`

---

### Módulos Pendientes y Removidos

- **Vacantes** ⏳ — herramienta del comerciante para publicar ofertas de servicio/empleo en la sección pública **Servicios**. Pendiente de implementar; ya no está bloqueado por una sección que iba a llamarse "Empleos" (Servicios la absorbió en visión v3).
- **Rifas** ❌ — Removido del alcance v1. Antes figuraba como bloqueado por Dinámicas; al descartarse Dinámicas (riesgo legal SEGOB), Rifas también queda fuera. El ítem todavía aparece en el código del menú — pendiente de limpieza en Fase B. Ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §5.1.

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

> ✅ **VERIFICADO:** Contra estructura real del proyecto (6 Abril 2026)

### Backend

```
apps/api/src/
├── controllers/
│   ├── dashboard.controller.ts       ✅ KPIs, ventas, campañas, alertas
│   ├── negocios.controller.ts        ✅ Perfil, sucursales, imágenes
│   ├── articulos.controller.ts       ✅ CRUD catálogo + duplicar
│   ├── ofertas.controller.ts         ✅ CRUD ofertas/cupones + asignar
│   ├── puntos.controller.ts          ✅ Config, recompensas, estadísticas
│   ├── transacciones.controller.ts   ✅ Historial, KPIs, revocar
│   ├── clientes.controller.ts        ✅ Lista, KPIs, detalle, historial
│   ├── resenas.controller.ts         ✅ Lista, KPIs, responder
│   ├── alertas.controller.ts         ✅ Lista, KPIs, config, CRUD
│   └── empleados.controller.ts       ✅ CRUD, permisos, horarios, sesiones
│
├── services/
│   ├── negocioManagement.service.ts  ✅ 20 funciones CRUD compartidas
│   ├── dashboard.service.ts          ✅ KPIs y métricas
│   ├── articulos.service.ts          ✅ CRUD catálogo
│   ├── ofertas.service.ts            ✅ CRUD ofertas + cupones
│   ├── puntos.service.ts             ✅ Config + recompensas
│   ├── alertas.service.ts            ✅ Motor detección + CRUD
│   └── empleados.service.ts          ✅ CRUD + permisos + sesiones
│
├── middleware/
│   ├── auth.ts                       ✅ verificarToken
│   ├── negocio.middleware.ts         ✅ verificarNegocio
│   └── sucursal.middleware.ts        ✅ validarAccesoSucursal
│
└── validations/                      ✅ Schemas Zod por módulo
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
│   ├── catalogo/                     ✅ Catálogo de productos/servicios
│   ├── ofertas/                      ✅ Promociones (ofertas + cupones)
│   ├── puntos/                       ✅ Sistema de puntos y recompensas
│   ├── transacciones/                ✅ Historial ventas + canjes
│   ├── clientes/                     ✅ Base de clientes
│   ├── opiniones/                    ✅ Reseñas y respuestas
│   ├── alertas/                      ✅ Alertas de seguridad
│   └── empleados/                    ✅ Gestión de empleados
│
├── components/layout/
│   ├── MenuBusinessStudio.tsx        ✅ Menú (13 opciones tras limpieza Fase B; hoy aún muestra Rifas)
│   ├── DrawerBusinessStudio.tsx      ✅ Drawer móvil
│   ├── PanelPreviewNegocio.tsx       ✅ Preview en vivo
│   └── SelectorSucursalesInline.tsx  ✅ Cambiar sucursal
│
├── router/
│   ├── index.tsx                     ✅ Rutas BS (13 tras limpieza Fase B; hoy aún incluye `/rifas`)
│   └── guards/ModoGuard.tsx          ✅ Guard de modo
│
├── services/
│   ├── dashboardService.ts           ✅ API calls dashboard
│   ├── negociosService.ts            ✅ API calls perfil
│   ├── articulosService.ts           ✅ API calls catálogo
│   ├── ofertasService.ts             ✅ API calls ofertas
│   ├── clientesService.ts            ✅ API calls clientes
│   ├── transaccionesService.ts       ✅ API calls transacciones + canjes
│   ├── resenasService.ts             ✅ API calls opiniones
│   ├── alertasService.ts             ✅ API calls alertas
│   └── empleadosService.ts           ✅ API calls empleados
│
├── hooks/queries/                    ✅ React Query hooks (datos del servidor)
│   ├── useDashboard.ts               ✅ KPIs, ventas, campañas, interacciones
│   ├── useTransacciones.ts           ✅ KPIs, historial (infinite), revocar
│   ├── useClientes.ts                ✅ KPIs, lista (infinite), detalle, historial
│   ├── useResenas.ts                 ✅ Lista, KPIs, responder (optimistic)
│   ├── useAlertas.ts                 ✅ Lista (infinite), KPIs, config, 6 mutations
│   ├── useArticulos.ts               ✅ Lista, 4 mutations (crear, actualizar, eliminar, duplicar)
│   ├── useOfertas.ts                 ✅ Lista, 4 mutations + helper invalidar
│   ├── usePuntos.ts                  ✅ Config global, recompensas, estadísticas, 4 mutations
│   ├── useEmpleados.ts               ✅ KPIs, lista (infinite), detalle, 6 mutations
│   └── usePerfil.ts                  ✅ Perfil sucursal, sucursales, categorías, subcategorías
│
└── stores/
    ├── useAuthStore.ts               ✅ Auth + modo + sucursal
    ├── useDashboardStore.ts          ✅ Solo UI: periodo
    ├── useTransaccionesStore.ts      ✅ Solo UI: tab, periodo, filtros, búsqueda
    ├── useClientesStore.ts           ✅ Solo UI: búsqueda, nivelFiltro
    ├── useAlertasStore.ts            ✅ Solo UI: filtros, alerta seleccionada
    ├── usePuntosStore.ts             ✅ Solo UI: periodo
    (useEmpleadosStore.ts eliminado — filtros locales en useState)
    (useArticulosStore.ts eliminado — sin estado UI compartido)
    (useOfertasStore.ts eliminado — sin estado UI compartido)
    (useResenasStore.ts eliminado — sin estado UI compartido)
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

### 3. ¿Por qué 13 módulos separados?

**Alternativa A (descartada):** Módulo único gigante
```
/business-studio
  - Todo en un solo archivo de 5,000+ líneas
```

**Alternativa B (elegida):** 13 módulos separados
```
/business-studio/
  - dashboard
  - perfil
  - catalogo
  - ofertas
  - ... (10 más)
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

**Última verificación documental:** 28 Abril 2026

**Módulos completados:** 12/13 ✅
- Dashboard (02/01/2026)
- Mi Perfil (06/01/2026)
- Catálogo (07/01/2026)
- Promociones — antes Ofertas (16/01/2026, potenciado 22/03/2026 con Cupones)
- Puntos (05/02/2026, N+1 agregado 22/03/2026)
- Transacciones (07/03/2026)
- Clientes (07/03/2026)
- Opiniones (07/03/2026)
- Alertas (03/04/2026)
- Empleados (05/04/2026)
- Reportes (12/04/2026)
- Sucursales (16/04/2026)

**Módulos pendientes:** 1/13
- Vacantes — alimenta sección pública Servicios

**Removidos del alcance v1:** Rifas (visión estratégica abril 2026, ver `VISION_ESTRATEGICA_AnunciaYA.md` §5.1)

**Progreso:** 12/13 módulos = 92%

**Migración React Query:** 12/12 módulos BS hechos completados (Abril 2026)
- Todos los datos del servidor en `hooks/queries/`
- Stores Zustand simplificados a solo estado UI
- 4 stores eliminados (Artículos, Ofertas, Reseñas, Empleados)
- Componentes auxiliares migrados (modales duplicar, selector clientes, KPIs sidebar, categorías)
- Vacantes nacerá con React Query desde el inicio

---

**Última actualización:** 28 Abril 2026
**Autor:** Equipo AnunciaYA
**Versión:** 2.3 (alineación con visión estratégica v3)
