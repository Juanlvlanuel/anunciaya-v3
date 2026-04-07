# Alertas — Arquitectura

> **Última actualización:** 6 Abril 2026
> **Estado:** ✅ Completo
> **Sprint:** 9

---

## Resumen

Sistema de alertas inteligentes para Business Studio. Detecta automáticamente patrones de seguridad, operativos, rendimiento y engagement, y notifica al comerciante para que tome acción.

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
| `services/alertas.service.ts` | CRUD, KPIs, configuración, crear alerta, anti-duplicado |
| `services/alertas-motor.service.ts` | Motor de detección: 16 funciones + helpers nombres |
| `controllers/alertas.controller.ts` | 11 controllers (patrón RequestConNegocio) |
| `routes/alertas.routes.ts` | 11 endpoints bajo `/api/business/alertas` |
| `cron/alertas.cron.ts` | Cron diario 4AM + semanal lunes 5AM |

### Endpoints

```
BASE: /api/business/alertas
MIDDLEWARE: verificarToken → verificarNegocio → validarAccesoSucursal

GET    /                     → Alertas paginadas con filtros
GET    /kpis                 → KPIs aggregados
GET    /no-leidas            → Conteo para badge
GET    /configuracion        → 16 tipos con defaults
GET    /:id                  → Detalle de alerta
PUT    /marcar-todas-leidas  → Marcar todas como leídas
PUT    /configuracion/:tipo  → Actualizar config (UPSERT)
PUT    /:id/leida            → Marcar leída
PUT    /:id/resuelta         → Marcar resuelta
DELETE /resueltas            → Eliminar todas las resueltas
DELETE /:id                  → Eliminar alerta individual
```

### Tablas

**`alertas_seguridad`** (ampliada)
- Columnas agregadas: `categoria`, `sucursal_id` (FK), `acciones_sugeridas` (JSONB), `resuelta`, `resuelta_at`
- CHECK: 16 tipos, 4 categorías
- Índices: `categoria`, `created_at DESC`

**`alertas_configuracion`** (nueva)
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

### Bugs corregidos durante desarrollo

- `LIMIT ${expr}` en Drizzle SQL no evalúa expresiones — pre-calcular en JS
- `(${a} - ${b})` en SQL template — pre-calcular la resta en JS
- `transaccionId` debe ser UUID real (FK constraint), no string ficticio
- Columna `datos` en BD, no `data` — todas las queries raw usan `a.datos`
- Filtro sucursal: `AND (sucursal_id = X OR sucursal_id IS NULL)` para incluir alertas globales

---

## Arquitectura Frontend

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `types/alertas.ts` | Tipos espejo + CATALOGO_ALERTAS (16 metadatos UI) |
| `services/alertasService.ts` | 11 funciones API (get, put, del) |
| `hooks/queries/useAlertas.ts` | React Query: lista (infinite), KPIs, config, 6 mutations con optimistic updates |
| `stores/useAlertasStore.ts` | Zustand: solo estado UI (filtros activos, alerta seleccionada) |
| `pages/.../alertas/PaginaAlertas.tsx` | Página principal (KPIs, filtros, tabla, cards) |
| `pages/.../alertas/ModalDetalleAlerta.tsx` | Modal detalle con datos, acciones, enlace contextual |
| `pages/.../alertas/ModalConfiguracion.tsx` | Modal configuración con tabs y umbrales |
| `pages/.../alertas/index.ts` | Re-exports |

### Página Principal

- **Header** con icono animado (bounce) + KPIs en CarouselKPI
- **Texto informativo**: "Las alertas de seguridad se detectan en cada venta..."
- **Filtros**: Dropdowns (Categoría, Severidad) + chips (No leídas, Resueltas) + buscador
- **Acciones masivas**: "Marcar todas como leídas" + "Eliminar resueltas"
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
- Botón "Marcar como resuelta" (slate oscuro) + "Eliminar" (rojo)
- Marca leída automáticamente al abrir (sin botón)

### Modal Configuración

- Header dark gradient + tabs por categoría (Seguridad, Operativa, Rendimiento, Engagement)
- Toggle activo/desactivo por tipo (patrón TabOperacion)
- Inputs de umbrales con estado local + save on blur
- Labels legibles en español (LABELS_UMBRALES)
- Altura fija: 78vh desktop, 90vh móvil

### Badge Menú

- `MenuBusinessStudio.tsx` muestra badge rojo con conteo no leídas
- Lee de `useAlertasKPIs()` (React Query, staleTime 30s) — se actualiza automáticamente vía invalidación de mutaciones
- Círculo `min-w-5 h-5` completamente redondo

### Dashboard

- `PanelAlertas.tsx` — Panel con header oscuro, iconos gradiente, click → navega a Alertas
- `BannerAlertasUrgentes.tsx` — Banner móvil compacto con header oscuro, máx 2 alertas

### Caché — React Query

- **Lista:** `useAlertasLista(filtros)` → `useInfiniteQuery`, paginación por páginas. `placeholderData: keepPreviousData` evita parpadeo al cambiar filtros.
- **KPIs:** `useAlertasKPIs()` → `staleTime: 30s`. Invalidado tras marcar leída/resuelta y eliminar.
- **Configuración:** `useAlertasConfiguracion()` → invalidación automática no requerida (optimistic update).
- **Mutaciones con optimistic update:** marcar leída, marcar resuelta, eliminar individual aplican cambios al caché local antes de confirmar con el servidor; hacen rollback en `onError`.
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
  leida, leidaAt, resuelta, resueltaAt, createdAt
}

interface ConfiguracionAlerta {
  tipoAlerta, activo, umbrales
}
```

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
