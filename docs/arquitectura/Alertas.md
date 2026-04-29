# Alertas — Arquitectura

> **Última actualización:** 22 Abril 2026
> **Estado:** ✅ Completo

---

## Resumen

Sistema de alertas inteligentes para Business Studio. Detecta automáticamente patrones de seguridad, operativos, rendimiento y engagement, y notifica al comerciante para que tome acción.

**Modelo de estados híbrido:**

| Estado | Naturaleza | Modelo |
|--------|------------|--------|
| **Leída** | "Yo la vi" — preferencia de cada persona | Por usuario |
| **Resuelta** | "El problema ya fue atendido" — estado del problema del negocio | **Global** |
| **Ocultada** | "No quiero verla más en mi feed" — preferencia de vista | Por usuario |

Ver sección [Modelo de estados](#modelo-de-estados).

---

## Tipos de Alertas (16)

### Seguridad (5) — Detección en tiempo real (ScanYA)

| Tipo | Severidad | Detección | Umbral Default |
|------|-----------|-----------|----------------|
| `monto_inusual` | Alta | Cada venta | Monto > 3x promedio 30 días |
| `cliente_frecuente` | Alta | Cada venta | >3 compras/hora mismo cliente |
| `fuera_horario` | Media | Cada venta | Fuera del horario configurado |
| `montos_redondos` | Media | Cada venta | 3+ ventas consecutivas módulo 100 |
| `empleado_destacado` | Alta | Cada venta | 3+ alertas/mes mismo empleado |

> `montos_redondos` desactivado por defecto (muchos falsos positivos).

### Operativa (4) — Cron diario 4:00 AM

| Tipo | Severidad | Umbral Default |
|------|-----------|----------------|
| `voucher_estancado` | Media | Voucher pendiente >7 días |
| `acumulacion_vouchers` | Media | >10 vouchers pendientes |
| `oferta_por_expirar` | Baja | Oferta vence en 2 días |
| `cupones_por_expirar` | Baja | Cupones activos vencen en 2 días |

### Rendimiento (4) — Cron semanal lunes 5:00 AM

| Tipo | Severidad | Umbral Default |
|------|-----------|----------------|
| `caida_ventas` | Alta | Ventas semana cae >20% vs promedio 4 semanas |
| `cliente_vip_inactivo` | Media | Cliente Oro/Plata sin comprar 30+ días |
| `racha_resenas_negativas` | Alta | 2+ reseñas ≤2 estrellas en 7 días |
| `pico_actividad` | Baja | Ventas hoy >2x promedio diario |

### Engagement (3) — Cron diario 4:00 AM

| Tipo | Severidad | Umbral Default |
|------|-----------|----------------|
| `cupones_sin_canjear` | Baja | <10% tasa uso en oferta activa |
| `puntos_por_expirar` | Media | Clientes con puntos próximos a expirar |
| `recompensa_popular` | Baja | Stock ≤5 con canjes recientes |

---

## Arquitectura Backend

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `types/alertas.types.ts` | 16 tipos, categorías, severidades, umbrales, interfaces |
| `validations/alertas.schema.ts` | Zod schemas para filtros, configuración, params |
| `services/alertas.service.ts` | CRUD, KPIs, configuración, crear alerta, anti-duplicado, broadcast real-time |
| `services/alertas-motor.service.ts` | Motor de detección: 16 funciones + helpers nombres |
| `controllers/alertas.controller.ts` | 11 controllers (patrón RequestConNegocio) |
| `routes/alertas.routes.ts` | 11 endpoints bajo `/api/business/alertas` |
| `cron/alertas.cron.ts` | Cron diario 4AM + semanal lunes 5AM |

### Endpoints

```
BASE: /api/business/alertas
MIDDLEWARE: verificarToken → verificarNegocio → validarAccesoSucursal

GET    /                     → Alertas paginadas con filtros (excluye ocultadas por el usuario)
GET    /kpis                 → KPIs: `total`/`noLeidas` por usuario; `resueltasEsteMes` global
GET    /no-leidas            → Conteo para badge (por usuario, excluye ocultadas)
GET    /configuracion        → 16 tipos con defaults
GET    /:id                  → Detalle con `resueltaPor` si aplica
PUT    /marcar-todas-leidas  → Marcar todas como leídas (solo para el usuario actual)
PUT    /configuracion/:tipo  → Actualizar config (UPSERT)
PUT    /:id/leida            → Marcar leída (solo para el usuario actual)
PUT    /:id/resuelta         → Marcar resuelta GLOBAL (todos verán `resueltaPor` = este usuario)
DELETE /resueltas            → Ocultar del feed del usuario las alertas globalmente resueltas
DELETE /:id                  → Ocultar alerta del feed del usuario (la alerta sigue existiendo para otros)
```

### Tablas

**`alertas_seguridad`**
- Columnas: `categoria`, `sucursal_id` (FK), `acciones_sugeridas` (JSONB)
- `resuelta` BOOLEAN + `resuelta_at` TIMESTAMPTZ + `resuelta_por_usuario_id` UUID → estado **global** del problema (quién lo resolvió y cuándo)
- Columnas `leida`, `leida_at` **obsoletas** (la lectura vive en `alerta_lecturas` por-usuario); se mantienen para backwards-compat
- CHECK: 16 tipos, 4 categorías
- Índices: `categoria`, `created_at DESC`, `resuelta_por_usuario_id` (parcial)

**`alerta_lecturas`**
- `alerta_id` + `usuario_id` (PK compuesta, FK con ON DELETE CASCADE a ambas)
- `leida_at` TIMESTAMPTZ NULL → cada usuario marca su lectura independientemente
- `ocultada_at` TIMESTAMPTZ NULL → cada usuario oculta la alerta de su feed (acción "Eliminar" en UI)
- Índices parciales: `WHERE leida_at IS NOT NULL` y `WHERE ocultada_at IS NOT NULL`

**`alertas_configuracion`**
- `negocio_id` + `tipo_alerta` (UNIQUE)
- `activo` BOOLEAN, `umbrales` JSONB
- UPSERT para configuración por negocio

### Motor de Detección

**Tiempo real (ScanYA hook):**
- `scanya.service.ts` llama `detectarAlertasSeguridad()` fire-and-forget tras cada transacción
- Import dinámico para no bloquear respuesta de ScanYA
- `Promise.allSettled` ejecuta las 5 detecciones en paralelo

**Cron:**
- `inicializarCronAlertas()` registrado en `index.ts`
- Itera todos los negocios activos
- Try/catch individual por negocio (un error no afecta otros)

**Anti-duplicado:**
- `existeAlertaReciente(negocioId, tipo, contextoId?)` — verifica JSONB `datos->>'contextoId'`
- Ventana: 24 horas
- `fuera_horario` y `montos_redondos` usan `sucursalId` como contexto (1 por sucursal/día)

**Nombres completos:**
- `obtenerNombreUsuario()` y `obtenerNombreEmpleado()` traen `nombre + apellidos`
- Se guardan en `datos` JSONB para mostrar en el modal

**Notificaciones push:**
- Solo para severidad `alta`
- `crearNotificacion()` + `notificarNegocioCompleto()` + Socket.io `alerta:nueva`

**Sync real-time (Socket.io):**
- `marcarAlertaResuelta` llama `broadcastAlertaActualizada(negocioId, alertaId)` tras el UPDATE global
- Esa función busca el `usuario_id` del dueño del negocio y emite `emitirAUsuario(duenoId, 'alerta:actualizada', { alertaId, negocioId })`
- Los gerentes en modo comercial están unidos al room del dueño (`socketService.ts` línea 163), así que una sola emisión alcanza a dueño + todos los gerentes conectados
- Frontend: hook `useAlertasRealtimeSync()` montado en `MenuBusinessStudio.tsx` escucha el evento e invalida `queryKeys.alertas.all()` + `['dashboard', 'alertas']`
- Resultado: al resolver una alerta desde cualquier sesión, todos los demás clientes ven el cambio al instante, con el nombre de quien resolvió, sin refresh

### Bugs corregidos durante desarrollo

- `LIMIT ${expr}` en Drizzle SQL no evalúa expresiones — pre-calcular en JS
- `(${a} - ${b})` en SQL template — pre-calcular la resta en JS
- `transaccionId` debe ser UUID real (FK constraint), no string ficticio
- Columna `datos` en BD, no `data` — todas las queries raw usan `a.datos`
- Filtro sucursal: `AND (sucursal_id = X OR sucursal_id IS NULL)` para incluir alertas globales
- **Acciones masivas cross-sucursal (22 Abril):** `marcarTodasLeidas` y `eliminarAlertasResueltas` solo filtraban por `negocio_id` → afectaban todas las sucursales. Fix: agregar `sucursalId` al service + WHERE.
- **Estado compartido entre usuarios (22 Abril):** `leida`/`resuelta` globales provocaban que la acción de un gerente afectara al dueño. Fix: modelo híbrido (leída/ocultada por usuario + resuelta global) — ver sección [Modelo de estados](#modelo-de-estados-22-abril-2026).
- **Invalidación de caché solo de sucursal activa (22 Abril):** `useMarcarAlertaResuelta` invalidaba solo `['alertas', 'lista', sucursalId]` pero `resuelta` es global → la otra sucursal no se actualizaba. Fix: invalidar con `queryKeys.alertas.all()` y usar `['alertas', 'lista']` (sin sucursalId) en el optimistic update.
- **Usuarios en sesiones distintas no se sincronizan (22 Abril):** la caché vive en el navegador del cliente; otra sesión no se enteraba del cambio hasta refresh. Fix: Socket.io broadcast (ver arriba).

---

## Arquitectura Frontend

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `types/alertas.ts` | Tipos espejo + CATALOGO_ALERTAS (16 metadatos UI) |
| `services/alertasService.ts` | 11 funciones API (get, put, del) |
| `hooks/queries/useAlertas.ts` | React Query: lista (infinite), KPIs, config, mutations con optimistic updates + `useAlertasRealtimeSync` (listener de socket) |
| `stores/useAlertasStore.ts` | Zustand: solo estado UI (filtros activos, alerta seleccionada) |
| `pages/.../alertas/PaginaAlertas.tsx` | Página principal (KPIs, filtros, tabla, cards) |
| `pages/.../alertas/ModalDetalleAlerta.tsx` | Modal detalle con datos, acciones, enlace contextual |
| `pages/.../alertas/ModalConfiguracion.tsx` | Modal configuración con tabs y umbrales |
| `pages/.../alertas/index.ts` | Re-exports |

### Página Principal

- **Header** con icono animado (bounce) + KPIs en CarouselKPI
- **Texto informativo**: "Las alertas de seguridad se detectan en cada venta..."
- **Filtros**: Dropdowns (Categoría, Severidad) + chips (No leídas, Resueltas) + buscador
- **Acciones masivas**: "Marcar todas como leídas" (por usuario) + "Ocultar resueltas" (oculta de tu feed las globalmente resueltas)
- **Desktop**: Tabla con header dark gradient, 6 columnas (Alerta, Severidad, Categoría, Fecha, Estado, Eliminar)
- **Móvil**: Cards con `h-28`, icono 56px, badge severidad + categoría
- **Paginación**: Scroll infinito móvil (IntersectionObserver) + "Cargar más" desktop

### Modal Detalle

- Header con gradiente por severidad (rojo/ámbar/azul)
- Título con corte automático en `:`, `"`, y `hace`
- Descripción en box con icono
- Datos del evento en chips (inline o KPI-style según tipo)
- Listas de clientes/reseñas cuando aplica
- Botón "Ver transacciones/clientes/promociones" → navega al módulo
- Acciones sugeridas en box ámbar
- Botón "Marcar como resuelta" (slate oscuro) + "Eliminar" (rojo, ahora oculta del feed del usuario sin borrar)
- Marca leída automáticamente al abrir (sin botón)
- Cuando `alerta.resuelta === true` muestra badge verde *"✓ Resuelta por {Nombre} · {Fecha}"* debajo de la fecha

### Modal Configuración

- Header dark gradient + tabs por categoría (Seguridad, Operativa, Rendimiento, Engagement)
- Toggle activo/desactivo por tipo (patrón TabOperacion)
- Inputs de umbrales con estado local + save on blur
- Labels legibles en español (LABELS_UMBRALES)
- Altura fija: 78vh desktop, 90vh móvil

### Badge Menú

- `MenuBusinessStudio.tsx` muestra badge rojo con conteo no leídas (por usuario)
- Lee de `useAlertasKPIs()` (React Query, staleTime 30s); se actualiza vía invalidación de mutaciones locales + Socket.io real-time (`useAlertasRealtimeSync`)
- Círculo `min-w-5 h-5` completamente redondo

### Dashboard

- `PanelAlertas.tsx` — Panel con header oscuro, iconos gradiente, click → navega a Alertas
- `BannerAlertasUrgentes.tsx` — Banner móvil compacto con header oscuro, máx 2 alertas

### Caché — React Query

- **Lista:** `useAlertasLista(filtros)` → `useInfiniteQuery`, paginación por páginas. `placeholderData: keepPreviousData` evita parpadeo al cambiar filtros.
- **KPIs:** `useAlertasKPIs()` → `staleTime: 30s`. Invalidado tras mutations locales + evento socket.
- **Configuración:** `useAlertasConfiguracion()` → invalidación automática no requerida (optimistic update).
- **Mutaciones con optimistic update:**
  - `marcarAlertaLeida` / `marcarTodasLeidas` → optimistic por-sucursal (estado por usuario); invalida caché de la sucursal activa.
  - `marcarAlertaResuelta` → optimistic en **todas las sucursales** (matchea `['alertas', 'lista']` sin sucursalId); invalida `queryKeys.alertas.all()` tras éxito (el resuelta es global, afecta a todas).
  - `ocultarAlerta` / `ocultarAlertasResueltas` → optimistic por usuario; oculta de su feed sin afectar a otros.
  - Todas hacen rollback en `onError` con snapshot de la caché.
- **Real-time:** `useAlertasRealtimeSync()` escucha `alerta:actualizada` del socket e invalida `queryKeys.alertas.all()` + dashboard. Montado una sola vez en `MenuBusinessStudio.tsx` para cubrir todos los usuarios conectados al room del dueño del negocio.
- Datos no se borran al salir de la página (gcTime global 10min).

---

## Testing

### API Tests (167 total, alertas: ~60)

- `alertas.test.ts` — CRUD, KPIs, configuración, filtros, paginación, edge cases
- `alertas-validaciones.test.ts` — Zod schemas: filtros, config, params

### E2E Tests (12)

- `alertas.spec.ts` — Página, KPIs, filtros, dropdown, búsqueda, tabla, modales detalle y configuración

### Pruebas Manuales Realizadas

- Motor real: 16/16 tipos generados con datos reales en BD
- ScanYA: `monto_inusual`, `fuera_horario`, `montos_redondos` verificados
- Notificaciones push: alertas alta generan notificación
- Anti-duplicado: `fuera_horario` 1 por sucursal/día verificado
- Configuración: activar/desactivar `montos_redondos` verificado
- Eliminar individual y masivo verificado

---

## Tipos TypeScript Clave

```typescript
type TipoAlerta = 'monto_inusual' | 'cliente_frecuente' | ... (16 tipos)
type CategoriaAlerta = 'seguridad' | 'operativa' | 'rendimiento' | 'engagement'
type SeveridadAlerta = 'baja' | 'media' | 'alta'

interface AlertaCompleta {
  id, negocioId, sucursalId, transaccionId, empleadoId,
  tipo, categoria, severidad, titulo, descripcion,
  data (JSONB), accionesSugeridas (JSONB),
  leida, leidaAt,                        // por usuario
  resuelta, resueltaAt,                  // global
  resueltaPor: { id, nombre } | null,    // global, quién la resolvió
  createdAt
}

interface ConfiguracionAlerta {
  tipoAlerta, activo, umbrales
}
```

---

## Modelo de estados

El modelo es híbrido según la naturaleza de cada acción: las alertas son problemas del negocio, así que la resolución es global; pero "leí esta alerta" o "no la quiero ver" son preferencias de cada usuario.

### Semántica por acción

| Acción | Naturaleza conceptual | Modelo | Columna |
|--------|----------------------|--------|---------|
| **Leer** | "Yo la vi" — preferencia de cada persona | Por usuario | `alerta_lecturas.leida_at` |
| **Resolver** | "El problema ya fue atendido" — estado del problema, compartido | Global | `alertas_seguridad.resuelta` + `resuelta_at` + `resuelta_por_usuario_id` |
| **Ocultar** | "No quiero verla más en mi feed" — preferencia de vista | Por usuario | `alerta_lecturas.ocultada_at` |
| **Borrar físicamente** | Purga admin (ej. resueltas > 90 días) | Global, solo cron/admin | `DELETE FROM alertas_seguridad` |

### Tablas

```sql
-- alerta_lecturas: estado por usuario
CREATE TABLE alerta_lecturas (
  alerta_id     UUID NOT NULL REFERENCES alertas_seguridad(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leida_at      TIMESTAMPTZ,
  ocultada_at   TIMESTAMPTZ,
  PRIMARY KEY (alerta_id, usuario_id)
);

-- alertas_seguridad: agregadas las columnas globales de resolución
ALTER TABLE alertas_seguridad
  ADD COLUMN resuelta_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
-- `resuelta` y `resuelta_at` ya existían; ahora son la fuente de verdad global
```

### Patrón de lectura

Query base — LEFT JOIN con `alerta_lecturas` para estado por-usuario + columnas globales:

```sql
SELECT a.*,
  al.leida_at AS leida_at_usuario,
  a.resuelta, a.resuelta_at,
  u.nombre AS resuelta_por_nombre,
  u.apellidos AS resuelta_por_apellidos
FROM alertas_seguridad a
LEFT JOIN alerta_lecturas al
  ON al.alerta_id = a.id AND al.usuario_id = ${usuarioId}
LEFT JOIN usuarios u ON u.id = a.resuelta_por_usuario_id
WHERE a.negocio_id = ${negocioId}
  AND al.ocultada_at IS NULL  -- excluir las que el usuario ocultó
```

### Patrón de escritura

**Marcar leída** (upsert por usuario):

```sql
INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at)
VALUES (${alertaId}, ${usuarioId}, NOW())
ON CONFLICT (alerta_id, usuario_id)
DO UPDATE SET leida_at = COALESCE(alerta_lecturas.leida_at, EXCLUDED.leida_at);
```

**Marcar resuelta** (UPDATE global + upsert de lectura del que resolvió):

```sql
UPDATE alertas_seguridad
SET resuelta = true,
    resuelta_at = NOW(),
    resuelta_por_usuario_id = ${usuarioId}
WHERE id = ${alertaId} AND negocio_id = ${negocioId};

-- Además marcar leída para quien resolvió
INSERT INTO alerta_lecturas (alerta_id, usuario_id, leida_at)
VALUES (${alertaId}, ${usuarioId}, NOW())
ON CONFLICT (alerta_id, usuario_id)
DO UPDATE SET leida_at = COALESCE(alerta_lecturas.leida_at, EXCLUDED.leida_at);
```

**Ocultar** (upsert por usuario; no borra nada físicamente):

```sql
INSERT INTO alerta_lecturas (alerta_id, usuario_id, ocultada_at)
VALUES (${alertaId}, ${usuarioId}, NOW())
ON CONFLICT (alerta_id, usuario_id)
DO UPDATE SET ocultada_at = COALESCE(alerta_lecturas.ocultada_at, EXCLUDED.ocultada_at);
```

### Firmas de funciones del service

| Función | Firma | Notas |
|---------|-------|-------|
| `obtenerAlertasPaginadas` | `(negocioId, sucursalId, usuarioId, filtros)` | Excluye las ocultadas por el usuario |
| `obtenerAlertaDetalle` | `(alertaId, negocioId, usuarioId)` | Retorna `resueltaPor: { id, nombre }` cuando aplica |
| `obtenerAlertasKPIs` | `(negocioId, sucursalId, usuarioId)` | `total` / `noLeidas` excluyen ocultadas; `resueltasEsteMes` es global |
| `contarNoLeidas` | `(negocioId, sucursalId, usuarioId)` | Excluye ocultadas |
| `marcarAlertaLeida` | `(alertaId, negocioId, usuarioId)` | Upsert `leida_at` por usuario |
| `marcarAlertaResuelta` | `(alertaId, negocioId, usuarioId)` | UPDATE global + upsert `leida_at` del que resolvió |
| `marcarTodasLeidas` | `(negocioId, sucursalId, usuarioId, categoria?, severidad?)` | Bulk upsert `leida_at`; respeta ocultadas |
| `ocultarAlerta` | `(alertaId, negocioId, usuarioId)` | Reemplaza el antiguo `eliminarAlerta` desde la UI |
| `ocultarAlertasResueltas` | `(negocioId, sucursalId, usuarioId)` | Bulk upsert `ocultada_at` para las resueltas |
| `eliminarAlertaFisicamente` | `(alertaId, negocioId)` | Borrado global. Solo jobs admin / cron |

`eliminarAlerta` y `eliminarAlertasResueltas` se exportan como **alias de compatibilidad** que delegan a `ocultarAlerta` y `ocultarAlertasResueltas` respectivamente — el controller no requiere cambios de nombres.

### Impacto en UI

- **"Eliminar" desde el modal** → oculta la alerta del feed del usuario (no la borra físicamente). Toast: "Alerta oculta de tu feed".
- **"Ocultar resueltas"** → bulk hide de todas las globalmente resueltas en el scope de sucursal activa. Toast: "N alertas ocultas de tu feed".
- **Modal de detalle** → cuando `alerta.resuelta === true`, muestra badge verde *"✓ Resuelta por {Nombre} · {Fecha}"* debajo de la fecha de creación.
- **Badge de no leídas** / KPIs / lista → por usuario, excluyendo ocultadas.
- **Alerta global resuelta por gerente** → el dueño la verá como `resuelta = true` con el nombre del gerente como resolver, aunque el dueño no la haya visto aún.

### Migraciones

1. `docs/migraciones/2026-04-22-alerta-lecturas-por-usuario.sql` — crea `alerta_lecturas` con `leida_at` + `resuelta_at` (primer intento, todo por usuario). Backfill del estado antiguo al dueño.
2. `docs/migraciones/2026-04-22b-alertas-resuelta-global-ocultamiento-por-usuario.sql` — corrige el modelo:
   - Elimina `resuelta_at` de `alerta_lecturas`
   - Agrega `ocultada_at` a `alerta_lecturas`
   - Agrega `resuelta_por_usuario_id` a `alertas_seguridad`
   - Mantiene `resuelta` y `resuelta_at` de `alertas_seguridad` como fuente de verdad global

Las columnas viejas `alertas_seguridad.leida` y `.leida_at` quedan obsoletas (reemplazadas por `alerta_lecturas.leida_at`); se dejan por backwards-compat, se retirarán en migración futura.

### Tests

`__tests__/helpers.ts` — `crearAlertaPrueba` inserta también en `alerta_lecturas` para el dueño del negocio de prueba cuando se pasa `leida: true`. Si se pasa `resuelta: true`, se guarda directo en `alertas_seguridad` (global) con `resuelta_por_usuario_id = USUARIO_1_ID`.

---

## Modificaciones a Archivos Existentes

| Archivo | Cambio |
|---------|--------|
| `db/schemas/schema.ts` | Columnas en alertasSeguridad + tabla alertasConfiguracion |
| `db/schemas/relations.ts` | Relaciones alertasConfiguracion + sucursal en alertas |
| `routes/index.ts` | Registrar alertasRoutes |
| `index.ts` | Registrar inicializarCronAlertas() |
| `services/scanya.service.ts` | Hook fire-and-forget detectarAlertasSeguridad |
| `types/notificaciones.types.ts` | Tipo 'alerta_seguridad' + referencia 'alerta' |
| `components/layout/MenuBusinessStudio.tsx` | Badge no leídas via `useAlertasKPIs()` (React Query) |
| `components/layout/Navbar.tsx` | Iconos circulares uniformes, ChatYA nuevo icono |
| `components/layout/PanelNotificaciones.tsx` | Altura 85vh, botón "Ver notificaciones anteriores" |
| `router/index.tsx` | Import real PaginaAlertas |
| `stores/useDashboardStore.ts` | Caché inteligente (sin skeleton en recargas) |
| `pages/.../dashboard/PaginaDashboard.tsx` | No limpiar store al desmontar |
| `pages/.../dashboard/componentes/PanelAlertas.tsx` | Rediseño con iconos gradiente |
| `pages/.../dashboard/componentes/BannerAlertasUrgentes.tsx` | Rediseño moderno |
| `__tests__/helpers.ts` | Helpers comerciales + negocio prueba |
| `__tests__/chatya.test.ts` | Limpiar contactos en beforeAll |
