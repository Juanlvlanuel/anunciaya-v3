# Reportes — Arquitectura

> **Ultima actualizacion:** 12 Abril 2026
> **Estado:** ✅ Completo (5 tabs funcionales)
> **Sprint:** 11

---

## Resumen

Modulo de reportes analiticos para Business Studio. 5 pestanas con KPIs, tablas y cards visuales que cubren ventas, clientes, empleados, promociones y resenas. Filtro universal de fechas (rangos rapidos + DatePicker custom). Exportacion XLSX por tab.

---

## Arquitectura

### Backend

| Archivo | Descripcion |
|---------|-------------|
| `services/reportes.service.ts` | 5 funciones principales (una por tab) + lista clientes inactivos |
| `controllers/reportes.controller.ts` | 3 controllers: getReporte, exportarXLSX, clientesInactivos |
| `routes/reportes.routes.ts` | `GET /`, `GET /exportar`, `GET /clientes-inactivos` |

### Frontend

| Archivo | Descripcion |
|---------|-------------|
| `reportes/PaginaReportes.tsx` | Pagina principal: header + KPIs (Row 1), tabs (Row 2), filter (Row 3), body (Row 4) |
| `reportes/componentes/ReporteUI.tsx` | Helpers compartidos: PanelTitulo, TablaHeader, KpiCard, formatearMonto, formatearSemana |
| `reportes/componentes/TabVentas.tsx` | Tab Ventas (4 KPIs + 3 tablas) |
| `reportes/componentes/TabClientes.tsx` | Tab Clientes (4 KPIs + 3 tablas + modal inactivos) |
| `reportes/componentes/TabEmpleados.tsx` | Tab Empleados (4 KPIs + tabla desempeno con sorting) |
| `reportes/componentes/TabPromociones.tsx` | Tab Promociones (2 KPIs + 3 funnels + 3 cards populares) |
| `reportes/componentes/TabResenas.tsx` | Tab Resenas (3 KPIs + 3 tablas) |
| `reportes/componentes/ModalClientesInactivos.tsx` | Modal detalle clientes en riesgo/inactivos |
| `hooks/queries/useReportes.ts` | 6 hooks React Query (1 por tab + clientesInactivos) |
| `services/reportesService.ts` | Llamadas API + interfaces TypeScript |
| `stores/useReportesStore.ts` | Zustand: tab activo, rango, fechas |

---

## 5 Tabs

### Tab Ventas

**KPIs:** Total vendido, Venta promedio, Transacciones, Canceladas
**Tablas (3 en fila):** Ventas por dia de la semana, Metodos de pago, Horarios pico
**Notas:** Venta promedio se calcula sobre confirmadas (no total). Sabado/domingo siempre aparecen aunque tengan 0.

### Tab Clientes

**KPIs:** Clientes, Compra promedio, Clientes en riesgo (clickeable → modal), Clientes inactivos (clickeable → modal)
**Tablas (3 en fila):** Top 10 por gasto (con avatar), Top 10 por frecuencia (con avatar), Clientes nuevos por semana
**Notas:** Clientes en riesgo (15-30 dias sin compra) e inactivos (30+ dias) son datos globales, no filtrados por fecha. Los avatares usan `usuarios.avatar_url` con fallback `bg-indigo-100` circular con inicial.

### Tab Empleados

**KPIs:** Empleados, Ventas totales, Mejor vendedor (primeras 2 palabras del nombre), Alertas generadas
**Tabla:** Desempeno por empleado con columnas clickeables para ordenar (nombre, ventas, total vendido, venta promedio, alertas). Avatar por empleado.
**Incluye al dueno:** Fila con badge "Dueno", ventas directas (empleadoId IS NULL). No clickeable.
**Incluye inactivos:** Empleados eliminados/desactivados con ventas en el periodo aparecen con badge "Inactivo" y opacity-60. No clickeables.
**Gap conocido (A):** `puntos_transacciones` no guarda `registrado_por_usuario_id`. Las ventas del dueno y del gerente son indistinguibles (ambas tienen `empleadoId = NULL`). Requiere migration para resolver.

### Tab Promociones

**KPIs:** Descuento total, Por vencer (7d) — dato global
**Fila 1 (3 tablas):** Ofertas publicas (activas/vistas/clicks/shares/expiradas), Cupones privados (emitidos/canjeados/expirados/activos), Recompensas (generados/canjeados/expirados/pendientes)
**Fila 2 (3 cards):** Oferta mas popular (por clicks), Mejor cupon (por canjes), Mejor recompensa (por canjes). Cada card tiene imagen, badge tipo, pill de metrica, icono Flame, titulo y descripcion.
**Notas:** Las ofertas publicas no se "canjean" — se miden por engagement (vistas/clicks/shares). Cupones si tienen canje trackeable via `oferta_usuarios.estado`. Recompensas via `vouchers_canje`. Sucursal no se filtra (ofertas/cupones/recompensas son a nivel negocio). Puntos historicos y velocidad de canje fueron eliminados por no aportar valor.

### Tab Resenas

**KPIs:** Total resenas, Sin responder, Tasa respuesta
**Tablas (3 en fila):** Distribucion de estrellas (5★ a 1★), Tendencia de rating por semana (con formatearSemana), Respuestas por persona (avatar + badge Dueno + respondidas + tiempo promedio)
**Fix critico aplicado:** Los queries de sin-responder/tasa/tiempo usaban `respondidoPorEmpleadoId IS NULL` en la resena ORIGINAL del cliente (campo que nunca se actualiza). Se reescribieron con `NOT EXISTS` + self-join sobre filas de respuesta (`autor_tipo='negocio'`). Ahora cuenta correctamente respuestas del dueno, gerente y empleados.

---

## Layout Responsivo

### PC (lg+)

```
Row 1: [Header icon+titulo ← → KPIs flex-1 derecha (lg:justify-end)]
Row 2: [Tabs selector derecha (lg:justify-end) + lg:mt-7 2xl:mt-14]
Row 3: [Filter: DatePicker + rangos rapidos + Exportar]
Row 4: [Body: tablas del tab activo]
```

### Movil

```
Row 1: KPIs (mt-5, header oculto)
Row 2: Tabs
Row 3: Filter
Row 4: Body
```

KPIs usan `CarouselKPI` (scroll horizontal con fades en movil, flex en PC). Patron identico al Dashboard.

### Prop `solo: 'kpis' | 'body'`

Cada Tab se renderiza 2 veces desde PaginaReportes:
- `<TabXxx solo="kpis" />` dentro del Row 1 (header)
- `<TabXxx solo="body" />` en el Row 4

React Query deduplica automaticamente (misma queryKey). Loading: `solo='kpis'` retorna null, `solo='body'` muestra Spinner. Con `placeholderData: keepPreviousData`, al cambiar filtros los KPIs y body mantienen datos anteriores sin flash.

---

## KpiCard

Componente reutilizable en `ReporteUI.tsx`. Tamanos identicos al Dashboard BS:
- `h-13 2xl:h-16`, `min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]`
- 6 colores: emerald, blue, violet, amber, red, slate
- Gradientes + bordes + sombras por color
- Props: `icono`, `label`, `valor`, `color`, `onClick?`, `disabled?`, `testId`, `extra?`

---

## Filtro Universal de Fechas

- Zustand store (`useReportesStore`): `tabActivo`, `rangoActivo`, `fechaInicio`, `fechaFin`
- Rangos rapidos: 7 dias, 30 dias, 3 meses, 1 ano, Todo
- DatePicker custom con `centradoEnMovil`
- Todas las queries reciben `fechaInicio` y `fechaFin` como parametros
- `placeholderData: keepPreviousData` en todos los hooks para evitar temblor visual al filtrar

---

## Aislamiento por sucursal

Cada reporte aplica filtros por sucursal según el rol del usuario que consulta. El helper `obtenerSucursalId(req)` del controller resuelve la sucursal efectiva con esta prioridad:

1. `req.query.sucursalId` — si el dueño seleccionó una sucursal específica en el navbar
2. `req.usuario.sucursalAsignada` — fallback para gerentes, que quedan forzados a su sucursal

El middleware `validarAccesoSucursal` bloquea cualquier intento de un gerente de pedir datos de una sucursal distinta a la suya.

### Filtros aplicados por reporte

**Reporte Ventas** — todas las queries usan `condicionesBaseTransacciones`, que incluye `eq(puntosTransacciones.sucursalId, sucursalId)` cuando está presente.

**Reporte Clientes** — filtra por sucursal usando la última transacción del cliente en esa sucursal. Como `puntos_billetera` almacena actividad a nivel negocio (no sucursal), los KPIs "Clientes en riesgo" y "Perdidos" se calculan con un subquery sobre `puntos_transacciones`:

```sql
SELECT COUNT(*)::int as cantidad FROM (
  SELECT cliente_id, MAX(created_at) as ultima
  FROM puntos_transacciones
  WHERE negocio_id = X AND estado = 'confirmado' AND sucursal_id = Y
  GROUP BY cliente_id
) WHERE ultima < hace15 AND ultima >= hace30
```

Cuando no hay `sucursalId` (dueño consultando todo el negocio), usa directamente el cache de `puntos_billetera.ultima_actividad` (más rápido).

El helper `obtenerClientesInactivos` (utilizado por el modal KPI → detalle) recibe `sucursalId` como parámetro y aplica la misma lógica.

**Reporte Empleados** — acepta parámetro `incluirDueno: boolean` (default `true`). El controller pasa `!esGerente` para que los gerentes solo vean empleados reales de su sucursal, sin el pseudo-empleado del dueño. Aplica tanto al endpoint JSON como al export XLSX.

Firma:
```typescript
obtenerReporteEmpleados(
  negocioId: string,
  sucursalId?: string,
  periodo: PeriodoEstadisticas,
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
  incluirDueno: boolean = true
)
```

**Reporte Promociones** — filtra según el tipo de dato:

- **Ofertas y métricas de engagement**: `(sucursal_id = X OR sucursal_id IS NULL)`. Incluye ofertas globales del negocio (si existieran) además de las de la sucursal específica
- **Canjes de cupones** (`oferta_usos.sucursal_id`): filtra por donde ocurrió el canje, no por donde se emitió la oferta. Esto es relevante porque los cupones pueden canjearse en cualquier sucursal del negocio (ver `docs/arquitectura/Promociones.md` → "Alcance de canje por sucursal")
- **Canjes de recompensas** (`vouchers_canje.sucursal_id`): idem, filtra por sucursal donde se generó el voucher

**Reporte Reseñas** — aplica `eq(resenas.sucursalId, sucursalId)` cuando está presente. Las queries raw (sin responder, tiempo de respuesta, respuestas por persona) reutilizan la misma condición.

---

## Exportacion XLSX

Endpoint `GET /business/reportes/exportar?tab=X&fechaInicio=Y&fechaFin=Z`. Genera archivo Excel con ExcelJS. Una funcion generadora por tab (`generarExcelVentas`, `generarExcelClientes`, etc.) con headers estilizados y formatos numericos.

---

## Invalidacion de Cache

El modulo Reportes es read-only — no tiene mutaciones propias. Se invalida desde otros modulos:

| Tab | Invalidado por |
|-----|----------------|
| ventas | `useRevocarTransaccion` |
| clientes | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| empleados | `useRevocarTransaccion`, `useEmpleados.*` (4 mutaciones) |
| promociones | `useOfertas.*` (helper `invalidarOfertasRelacionadas`) + revocar/reactivar cupon |
| resenas | `useResponderResena` |

Granularidad: cada mutacion invalida solo `['reportes', 'tab-especifico']`, no `['reportes']` completo.

---

## Archivos de Codigo

### Backend
- `apps/api/src/services/reportes.service.ts`
- `apps/api/src/controllers/reportes.controller.ts`
- `apps/api/src/routes/reportes.routes.ts`
- `apps/api/src/__tests__/reportes.test.ts`

### Frontend
- `apps/web/src/pages/private/business-studio/reportes/PaginaReportes.tsx`
- `apps/web/src/pages/private/business-studio/reportes/componentes/*.tsx` (7 archivos)
- `apps/web/src/hooks/queries/useReportes.ts`
- `apps/web/src/services/reportesService.ts`
- `apps/web/src/stores/useReportesStore.ts`
- `apps/web/src/config/queryKeys.ts` (seccion `reportes`)
