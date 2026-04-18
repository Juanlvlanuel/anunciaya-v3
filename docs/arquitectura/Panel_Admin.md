# 🛡️ Panel Admin — Arquitectura

**Última actualización:** 17 Abril 2026
**Estado:** 🚧 Infraestructura backend lista (UI pendiente)
**Progreso:** Backend 10% · Frontend 0%

---

## ¿Qué es el Panel Admin?

Interfaz de administración del sistema AnunciaYA — **no confundir con Business Studio**.

| | Panel Admin | Business Studio |
|-|-------------|------------------|
| **Quién lo usa** | Equipo interno de AnunciaYA: admins (dueños de la plataforma) + vendedores/embajadores (agentes de venta) | Comerciantes/dueños de negocios en la app |
| **Ámbito** | Toda la plataforma (cross-negocio) | Un solo negocio |
| **Ejemplos de uso** | Aprobar/suspender negocios, gestión de usuarios, registro de ventas de membresías, métricas globales, herramientas de mantenimiento, comisiones | Gestionar catálogo, clientes, empleados de MI negocio |

El Panel Admin permite operaciones que **no pueden hacerse desde la UI pública** ni desde BS: limpieza de archivos huérfanos, aprobación manual de negocios, suspensión de cuentas, reportes globales, gestión de vendedores/comisiones, etc.

---

## Roles del Panel Admin

El Panel Admin no es monolítico — tiene múltiples roles con permisos distintos. Cuando se construya la auth admin real, el middleware `verificarAdminJWT` debe leer el rol del token y los endpoints se protegerán individualmente.

### 👑 Admin (equipo interno AnunciaYA)
Acceso total al Panel Admin. Operaciones sobre la plataforma completa:
- Todas las sub-secciones (Mantenimiento, Negocios, Usuarios, Reportes, Suscripciones, Auditoría)
- Gestión de otros admins y de vendedores/embajadores
- Operaciones destructivas (reconcile R2, suspensión de negocios, etc.)

### 🤝 Vendedor / Embajador (agentes de venta externos)
Acceso parcial, limitado a su trabajo de venta de membresías comerciales:
- **Ver prospectos** (negocios interesados sin plan pagado aún)
- **Registrar onboarding** asistido para comerciantes que convenció a suscribirse
- **Ver sus propias ventas** — negocios registrados bajo su `codigoReferido`
- **Ver sus comisiones** — histórico de pagos y pendientes según `porcentajePrimerPago` y `porcentajeRecurrente` de la tabla `embajadores`
- **Ver su región asignada** — cada embajador tiene `regionId` y solo ve negocios de esa región
- ❌ NO acceso a Mantenimiento, Auditoría, ni gestión de otros vendedores
- ❌ NO puede suspender negocios, modificar configuración global, ni acceder a datos de negocios fuera de su región

### 📐 Cómo aplicar permisos por rol

Patrón esperado al construir auth admin real:

```typescript
// routes/admin/index.ts
router.use(verificarAdminJWT); // valida JWT y extrae { userId, rol: 'admin'|'vendedor' }

// Sub-rutas con permisos estrictos
router.use('/mantenimiento', requireRol('admin'), mantenimientoRoutes);   // solo admin
router.use('/auditoria',     requireRol('admin'), auditoriaRoutes);       // solo admin
router.use('/ventas',        requireRol('admin', 'vendedor'), ventasRoutes); // ambos
router.use('/mis-comisiones', requireRol('vendedor'), misComisionesRoutes); // solo vendedor
```

Si el rol es `vendedor`, los services deben filtrar por `regionId` y por `codigoReferido` del vendedor autenticado (equivalente al patrón multi-sucursal donde el gerente solo ve su sucursal).

---

## Estado actual

**Infraestructura backend construida (17 Abril 2026):**
- ✅ Convención de carpetas `admin/*` en `controllers/`, `services/`, `routes/`
- ✅ Middleware temporal `requireAdminSecret` (header `x-admin-secret`)
- ✅ Primer endpoint operativo: **Mantenimiento → Reconcile R2**
- ✅ Tabla de auditoría `r2_reconcile_log` en BD (ambas ambientes)

**Pendiente:**
- ❌ Autenticación admin real (hoy: secreto compartido en env; futuro: cuentas admin con JWT)
- ❌ UI frontend (`apps/web/src/pages/admin/`)
- ❌ Secciones adicionales (Gestión de Negocios, Usuarios, Reportes Globales, Suscripciones, Auditoría)

---

## Convención de carpetas

Los archivos del Panel Admin viven en sub-carpetas `admin/` dentro de las 3 capas principales:

```
apps/api/src/
├── controllers/
│   └── admin/
│       └── mantenimiento.controller.ts    ← sección Mantenimiento
│       ── (a futuro)
│       ├── negocios.controller.ts
│       ├── usuarios.controller.ts
│       ├── reportes-globales.controller.ts
│       ├── suscripciones.controller.ts
│       └── auditoria.controller.ts
│
├── services/
│   └── admin/
│       └── mantenimiento.service.ts
│
├── routes/
│   └── admin/
│       ├── index.ts                        ← agregador (aplica requireAdminSecret)
│       └── mantenimiento.routes.ts
│
├── middleware/
│   └── adminSecret.middleware.ts           ← transversal (no está en admin/)
│
└── utils/
    ├── imageRegistry.ts                    ← transversal (también lo usan otros)
    └── ...
```

### Regla del patrón

- **Sub-carpeta `admin/`** cuando hay 2+ archivos o cuando el dominio es puramente admin
- **Archivos transversales** (middleware, utils usados por otros contextos) → carpeta raíz
- Ver detalle y reglas completas en `Mantenimiento_R2.md`

---

## URLs del Panel Admin

```
/api/admin/mantenimiento/r2-reconcile               (GET)  → Reporte de huérfanos R2
/api/admin/mantenimiento/r2-reconcile/ejecutar      (POST) → Ejecutar cleanup
/api/admin/mantenimiento/r2-reconcile/log           (GET)  → Histórico de ejecuciones

(Futuras)
/api/admin/negocios                                 (GET)  → Listar todos los negocios
/api/admin/negocios/:id/suspender                   (POST) → Suspender negocio
/api/admin/usuarios                                 (GET)  → Gestión global de usuarios
/api/admin/reportes-globales/overview               (GET)  → KPIs globales
/api/admin/suscripciones                            (GET)  → Estado de pagos Stripe
/api/admin/auditoria                                (GET)  → Log de acciones admin
```

Todas bajo `/api/admin/*` que pasa por el gate `requireAdminSecret`.

---

## Sub-secciones

### 🧹 Mantenimiento

Herramientas técnicas de mantenimiento del sistema. La primera es un **recolector de basura (garbage collector) de archivos huérfanos en R2** — detecta y elimina imágenes/audios/documentos que ya no están referenciados por ninguna fila de la BD. A futuro pueden vivir aquí otros recolectores y herramientas: GC de registros huérfanos en BD, reindex de cachés, limpieza de tablas auxiliares, resincronización de contadores, migraciones de datos one-off, etc.

**Doc detallada:** [`Mantenimiento_R2.md`](./Mantenimiento_R2.md)

### 🏢 Gestión de Negocios (futuro)

Aprobar/rechazar solicitudes de registro, suspender negocios por violación de términos, transferir propiedad, forzar cambios de plan, etc.

### 👥 Gestión de Usuarios (futuro)

Banear usuarios abusivos, restaurar cuentas eliminadas, forzar reset de contraseña, gestionar roles internos de la plataforma (ej. embajadores, admins).

### 📊 Reportes Globales (futuro)

KPIs agregados de toda la plataforma: transacciones totales, GMV, crecimiento de negocios/usuarios, top negocios, alertas por zona geográfica.

### 💳 Suscripciones (futuro)

Estado de pagos Stripe, retry de cobros fallidos, reembolsos, cambios manuales de plan, overrides de precios.

### 📜 Auditoría (futuro) — solo admin
Log de acciones admin con búsqueda (quién hizo qué, cuándo). Incluye `r2_reconcile_log` + futuras tablas de auditoría por sección.

### 🤝 Vendedores / Comisiones (futuro) — admin + vendedor

Dos vistas diferentes sobre los mismos datos (tabla `embajadores`):

**Vista admin** — gestión de la red de vendedores:
- Alta/baja de embajadores, asignación de región
- Configurar `porcentajePrimerPago` y `porcentajeRecurrente` por embajador (default 30% / 15%)
- Ver ranking global de vendedores, pipeline de prospectos, conversión
- Aprobar pagos de comisiones pendientes

**Vista vendedor** — sus propias ventas:
- Prospectos en su región
- Flujo asistido de onboarding (generar código de referido, seguimiento del pago Stripe)
- Histórico de sus negocios registrados (`negociosRegistrados`)
- Sus comisiones pendientes y pagadas

URLs esperadas:
```
/api/admin/vendedores                       (GET)  → solo admin — lista todos
/api/admin/vendedores/:id                   (PATCH) → solo admin — modificar porcentajes
/api/admin/ventas/mis-prospectos            (GET)  → vendedor — prospectos de su región
/api/admin/ventas/registrar-onboarding      (POST) → vendedor — inicia flujo con código referido
/api/admin/ventas/mis-comisiones            (GET)  → vendedor — histórico propio
/api/admin/ventas/comisiones                (GET)  → admin — todas las comisiones
```

---

## Seguridad

### Hoy — Middleware temporal `requireAdminSecret`

**Ubicación:** `apps/api/src/middleware/adminSecret.middleware.ts`

Valida el header `x-admin-secret` contra `env.ADMIN_SECRET`:

- Si `ADMIN_SECRET` no está configurado en el entorno → responde `503`
- Si el header no se envía o no matchea → `401`
- Si matchea → `next()`

Se aplica de forma global a todo `/api/admin/*` desde `routes/admin/index.ts`:

```typescript
router.use(requireAdminSecret);
router.use('/mantenimiento', mantenimientoRoutes);
```

### Futuro — Auth admin real

Cuando exista Panel Admin UI:

1. Agregar tabla `admin_usuarios` (o extender `usuarios` con flag `es_admin`)
2. Crear flujo de login admin con JWT separado
3. Reemplazar `requireAdminSecret` por un middleware `verificarAdminJWT` en `routes/admin/index.ts`
4. Los controllers y services NO cambian — solo cambia el middleware de la ruta agregadora

Los endpoints y la lógica siguen siendo los mismos. El cambio es quirúrgico.

---

## Agregar una sub-sección nueva

Cuando aparezca una sección nueva (ej. "Gestión de Negocios"):

1. `apps/api/src/services/admin/negocios.service.ts` — lógica de negocio
2. `apps/api/src/controllers/admin/negocios.controller.ts` — endpoints
3. `apps/api/src/routes/admin/negocios.routes.ts` — rutas de la sección
4. Registrar en `apps/api/src/routes/admin/index.ts`:
   ```typescript
   import negociosRoutes from './negocios.routes.js';
   router.use('/negocios', negociosRoutes);
   ```

El middleware `requireAdminSecret` ya cubre automáticamente la nueva sección — no hay que agregarlo en cada sub-router.

Si la sección requiere auditoría, replicar el patrón del reconcile: tabla `*_log` en `docs/migraciones/` + helper `registrarEnLog` dentro del service.

---

## Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `apps/api/src/middleware/adminSecret.middleware.ts` | Gate temporal del Panel Admin |
| `apps/api/src/routes/admin/index.ts` | Agregador — aplica middleware global y registra sub-rutas |
| `apps/api/src/routes/admin/mantenimiento.routes.ts` | Rutas de Mantenimiento |
| `apps/api/src/controllers/admin/mantenimiento.controller.ts` | Controllers de Mantenimiento |
| `apps/api/src/services/admin/mantenimiento.service.ts` | Lógica del reconcile R2 |
| `apps/api/src/db/reconcileConnections.ts` | Conexiones multi-BD para reconcile |
| `apps/api/src/utils/imageRegistry.ts` | Fuente única de verdad de columnas con URLs de imágenes |
| `docs/arquitectura/Mantenimiento_R2.md` | Doc técnica del reconcile |
| `docs/migraciones/2026-04-17-r2-reconcile-log.sql` | Tabla de auditoría |

---

## Env vars requeridas

```bash
# .env (backend)
ADMIN_SECRET=<string aleatorio de 16+ caracteres>
```

Sin esa variable, todo `/api/admin/*` responde `503` y no se expone ningún endpoint. Es una red de seguridad: por defecto el Panel Admin está **apagado**.

---

## Decisiones de diseño registradas

### ¿Por qué sub-carpeta `admin/` en cada capa?
Alternativas consideradas: (a) carpeta única `admin/` con todo adentro (rompe convención del proyecto), (b) prefijo plano `admin.*.ts` (se vuelve ilegible con volumen). La opción elegida mantiene la convención del proyecto (archivos por tipo) agrupando por sub-dominio cuando crece el volumen. Ver conversación del 17 Abril 2026.

### ¿Por qué `requireAdminSecret` y no auth admin real ya?
El Panel Admin no tiene usuarios aún. Construir auth JWT separado sin UI que la use sería prematuro. El secreto compartido permite usar la herramienta hoy (Postman/cURL/scripts) y se reemplaza trivialmente cuando haya UI. Los controllers/services/rutas no cambian.

### ¿Por qué el log no registra los GET?
Un GET `/r2-reconcile` es consulta de lectura — puedes llamarlo 50 veces para monitorear sin contaminar el histórico. Solo las ejecuciones POST crean fila. Esto mantiene el log limpio y reflejando solo acciones.

### ¿Por qué multi-BD en el reconcile?
Cuando el bucket R2 es compartido entre dev y prod (mismo `R2_BUCKET_NAME`), un cleanup desde un solo ambiente puede borrar archivos del otro. El reconcile consulta ambas BDs disponibles y solo marca huérfano lo que NADA en NINGÚN ambiente referencia. Ver `Mantenimiento_R2.md` sección "Multi-BD cross-ambiente".
