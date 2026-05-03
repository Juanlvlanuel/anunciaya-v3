# Sprint A — Cierre: Deduplicación de Ofertas + Fixes de Visibilidad

**Fecha:** 2026-04-30  
**Archivos modificados:** `ofertas.service.ts`, `ofertas.types.ts`

---

## 1. Resumen ejecutivo

- **Fase 1:** Se agregó `AND o.visibilidad = 'publico'` en `obtenerOfertaDetalle` y en el fallback de `obtenerOfertaDestacadaDelDia`, cerrando la fuga donde cupones privados podían ser vistos por cualquier usuario autenticado.
- **Fase 2:** `obtenerFeedOfertas` refactorizado con CTE + `ROW_NUMBER()` / `COUNT() OVER()` para deduplicar ofertas duplicadas entre sucursales y exponer `total_sucursales`.
- **Fase 3:** El fallback de `obtenerOfertaDestacadaDelDia` también deduplicado con CTE, eligiendo siempre la sucursal matriz como Hero editorial.
- **Fase 4:** Campo `total_sucursales: number` agregado a `OfertaFeedRow` en el tipo backend.
- **Fase 5 (TypeScript):** `tsc --noEmit` → exit 0, sin errores.
- **Fase 5 (curl/EXPLAIN):** No ejecutable — el servidor de desarrollo no está corriendo. Ver sección "Tests corridos".

---

## 2. Fixes de visibilidad aplicados

### `obtenerOfertaDetalle` — fix aplicado

Archivo: `apps/api/src/services/ofertas.service.ts`

**Antes:**
```sql
WHERE o.id = ${ofertaId}
  AND n.activo = true
  AND s.activa = true
```

**Después:**
```sql
WHERE o.id = ${ofertaId}
  AND o.visibilidad = 'publico'
  AND n.activo = true
  AND s.activa = true
```

El controller `getOfertaDetalle` ya manejaba el 404 correctamente — cuando `resultado.rows.length === 0`, devuelve `{ success: false, error: 'Oferta no encontrada' }` y el controller responde con `res.status(404).json(resultado)`. Ningún cambio adicional necesario.

### `obtenerOfertaDestacadaDelDia` — fallback fix aplicado

**Antes:** el fallback query no filtraba por visibilidad y podía devolver un cupón privado como Hero.

**Después:** el fallback tiene `AND o.visibilidad = 'publico'` dentro del CTE `grupos`. Ver sección 3 para la query completa.

### `obtenerFeedOfertas` — filtro existente conservado

El filtro `AND o.visibilidad = 'publico'` que ya existía se conservó intacto dentro del CTE `feed_base`, en la misma posición relativa dentro del `WHERE`.

---

## 3. Refactor con CTE — descripción

### Estructura general

La función `obtenerFeedOfertas` pasó de una query plana (`SELECT ... FROM ofertas o ...`) a un patrón CTE + outer query:

```sql
WITH feed_base AS (
  SELECT
    -- todos los campos del SELECT anterior --
    ,
    ROW_NUMBER() OVER (
      PARTITION BY o.negocio_id, o.titulo, o.descripcion, o.tipo,
                   o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
      ORDER BY [tiebreakers]
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY o.negocio_id, o.titulo, o.descripcion, o.tipo,
                   o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
    ) AS total_sucursales
  FROM ofertas o
  INNER JOIN negocios n ...
  INNER JOIN negocio_sucursales s ...
  LEFT JOIN metricas_entidad me ...
  WHERE [todos los filtros: activo, visibilidad, fechas, geofiltro, etc.]
)
SELECT * FROM feed_base
WHERE rn = 1          -- solo cuando deduplicar=true (sin sucursalId)
ORDER BY [criterio del usuario]
LIMIT $limite OFFSET $offset
```

### Problema del ORDER BY del window — solución usada

En PostgreSQL, los aliases del `SELECT` del mismo nivel no son accesibles dentro de `OVER (... ORDER BY ...)`. Usar `distancia_km ASC` en el `ROW_NUMBER` causaría error porque `distancia_km` es un alias del mismo `SELECT`.

**Solución:** se introduce `distanciaTiebreakerFragment` que recalcula la expresión `ST_Distance(...)` completa dentro del window:

```typescript
const distanciaTiebreakerFragment = latitud && longitud
  ? sql`COALESCE(
      ST_Distance(
        s.ubicacion::geography,
        ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
      ) / 1000,
      999999
    ) ASC,`
  : sql``;
```

El `COALESCE(..., 999999)` maneja sucursales sin coordenadas enviándolas al final (equivalente semántico a `NULLS LAST`, pero compatible con window functions).

### Tiebreakers exactos del ROW_NUMBER

```sql
ORDER BY
  COALESCE(ST_Distance(...) / 1000, 999999) ASC,  -- 1. más cercana (GPS)
  s.es_principal DESC,                              -- 2. matriz primero (sin GPS)
  o.updated_at DESC                                 -- 3. más recientemente editada
```

### Caso sin GPS

Cuando no se pasan `latitud`/`longitud`, `distanciaTiebreakerFragment` es `sql\`\`` (vacío). El `ORDER BY` del window queda:

```sql
ORDER BY s.es_principal DESC, o.updated_at DESC
```

La sucursal matriz gana como representante. El campo `distancia_km` en el SELECT del CTE es `NULL AS distancia_km`.

### Caso con `sucursalId` — dedup desactivado

```typescript
const deduplicar = !sucursalId;
```

En el outer query:
```sql
-- Con dedup (feed normal):
SELECT * FROM feed_base WHERE rn = 1 ORDER BY ... LIMIT ... OFFSET ...

-- Sin dedup (perfil de negocio, sucursalId presente):
SELECT * FROM feed_base ORDER BY ... LIMIT ... OFFSET ...
```

La cláusula `WHERE rn = 1` solo se inyecta cuando `deduplicar = true`.

### ORDER BY del outer query

Los aliases del CTE son accesibles en el outer query sin prefijo de tabla. Se actualizaron las referencias de `o.created_at` → `created_at` y `o.fecha_fin` → `fecha_fin`:

| `orden` | ORDER BY del outer query |
|---|---|
| `'distancia'` | `distancia_km ASC NULLS LAST` |
| `'recientes'` | `created_at DESC` |
| `'populares'` (con tabla) | `vistas_ultimos_7_dias DESC, created_at DESC` |
| `'populares'` (sin tabla) | `created_at DESC` |
| `'vencen_pronto'` | `fecha_fin ASC` |
| default, GPS | `distancia_km ASC` |
| default, sin GPS | `created_at DESC` |

### `obtenerOfertaDestacadaDelDia` — fallback también deduplicado

El fallback pasó de una query plana con subquery de popularidad a un CTE con `ROW_NUMBER()`:

```sql
WITH grupos AS (
  SELECT
    o.id,
    o.created_at,
    [COALESCE vistas_7_dias si tabla existe],
    ROW_NUMBER() OVER (
      PARTITION BY o.negocio_id, o.titulo, o.descripcion, o.tipo,
                   o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
      ORDER BY
        s.es_principal DESC,   -- sin GPS: matriz siempre
        o.updated_at DESC
    ) AS rn
  FROM ofertas o ...
  WHERE o.activo = true
    AND o.visibilidad = 'publico'   -- fix de visibilidad aplicado aquí
    ...
)
SELECT id FROM grupos
WHERE rn = 1
ORDER BY [vistas_7_dias DESC,] created_at DESC
LIMIT 1
```

El Hero del feed es siempre la sucursal matriz de la oferta más popular.

---

## 4. Archivos modificados

| Archivo | Cambios |
|---|---|
| `apps/api/src/types/ofertas.types.ts` | Nuevo campo `total_sucursales: number` en `OfertaFeedRow` (antes de `es_popular`) |
| `apps/api/src/services/ofertas.service.ts` | (1) `obtenerFeedOfertas`: refactor completo con CTE + deduplicación; (2) `obtenerOfertaDetalle`: `AND o.visibilidad = 'publico'` en WHERE; (3) `obtenerOfertaDestacadaDelDia` fallback: CTE con dedup + visibilidad |

**Sin cambios:** `ofertas.controller.ts`, `ofertas.routes.ts`, `ofertas.schema.ts`, todo el frontend.

---

## 5. Tests corridos

| Test | Resultado |
|---|---|
| TypeScript `tsc --noEmit` | ✅ Exit 0, sin errores |
| Curl visibilidad — privado devuelve 404 | ⏳ Pendiente (servidor no activo) |
| Curl dedup — cantidad antes vs después | ⏳ Pendiente |
| Curl con `sucursalId` — no deduplica | ⏳ Pendiente |
| Curl `orden=recientes` | ⏳ Pendiente |
| Curl `orden=vencen_pronto` | ⏳ Pendiente |
| Curl `orden=populares` | ⏳ Pendiente |
| Curl `/destacada-del-dia` | ⏳ Pendiente |
| EXPLAIN ANALYZE | ⏳ Pendiente |

Los tests curl y EXPLAIN ANALYZE requieren el servidor corriendo y acceso a la BD. Ejecutar con `pnpm dev` en `apps/api` y correr los comandos de la Fase 5 del prompt de sprint.

---

## 6. Performance

EXPLAIN ANALYZE no fue ejecutable sin servidor activo. Notas teóricas:

**El CTE agrega overhead de window functions.** Para el tamaño de datos actual (beta con ~50 negocios piloto), el impacto es despreciable. A escala de producción, el planner evaluará si hace un sequential scan o usa los índices existentes.

**Índices disponibles que ayudan:**
- `idx_ofertas_activo` — btree(activo) — filtra el WHERE base.
- `idx_ofertas_negocio_id` — btree(negocio_id) — ayuda al PARTITION BY.
- `idx_ofertas_sucursal_id` — btree(sucursal_id) — ayuda al JOIN con negocio_sucursales.
- `idx_sucursales_activa` — btree(activa) — ayuda al filtro `s.activa = true`.

**Índice candidato si hay problema real de performance:**
`CREATE INDEX idx_ofertas_feed_base ON ofertas (activo, visibilidad, negocio_id, fecha_inicio, fecha_fin)` — cubriría el WHERE + los campos del PARTITION BY con un solo índice. Solo crear si EXPLAIN ANALYZE muestra Seq Scan costoso sobre `ofertas`.

---

## 7. Desviaciones del plan

- **`COALESCE(..., 999999)` en vez de `NULLS LAST` en el window:** El plan original mencionaba `COALESCE(distancia_km, 999999)`. Se implementó correctamente pero recalculando la expresión ST_Distance completa (no el alias), porque PostgreSQL no permite referenciar aliases del mismo nivel SELECT dentro de window functions. El comportamiento es idéntico.

- **`o.created_at` → `created_at` en orderByFragment:** No mencionado explícitamente en el plan, pero necesario porque el outer query opera sobre `SELECT * FROM feed_base` (sin prefijo de tabla). Se actualizaron todas las referencias.

- **`es_principal` expuesto en el CTE pero no en `OfertaFeedRow`:** El campo `s.es_principal` aparece en el SELECT del CTE (necesario para el tiebreaker del window), y por lo tanto llega al frontend via `SELECT * FROM feed_base`. El middleware lo transformará a `esPrincipal` en la respuesta JSON. No es un problema — el frontend puede ignorarlo. Se decidió NO agregar el campo a `OfertaFeedRow` para evitar ruido en el tipo; si se necesita en el futuro, es trivial agregarlo.

---

## 8. Pendientes futuros (no bloqueantes)

- **Sprint B — UI:** actualizar `OfertaCard` para mostrar nombre de sucursal representante y chip "+N sucursales más" cuando `totalSucursales > 1`.
- **Tipo `OfertaFeed` frontend:** agregar `totalSucursales: number` a la interfaz del frontend (`apps/web/src/types/ofertas.ts`) — actualmente el campo llega en la respuesta pero el tipo no lo declara.
- **Tipo `'regalo'` fantasma:** `TipoOferta` en el frontend incluye `'regalo'` que no existe en el check constraint de la BD. Fix aparte de bajo riesgo.
- **Índice de performance:** crear `idx_ofertas_feed_base` solo si EXPLAIN ANALYZE con datos reales lo justifica.
- **`tablaOfertaVistasExiste()` sin caché:** una vez que la migración se aplique en Supabase, este helper siempre retorna `true`. Considerar flag en memoria de módulo para eliminar el overhead de `to_regclass` en cada request.
- **Tests curl de Fase 5:** ejecutar cuando el servidor esté activo para completar el checklist de aceptación.

---

## 9. Checklist de aceptación

- [x] `obtenerOfertaDestacadaDelDia` (fallback) filtra por `visibilidad = 'publico'`.
- [x] `obtenerOfertaDetalle` filtra por `visibilidad = 'publico'`.
- [x] Controller de detalle devuelve 404 cuando la oferta no existe (o es privada) — ya funcionaba, verificado en código.
- [x] `obtenerFeedOfertas` refactorizado con CTE + `ROW_NUMBER()`.
- [x] Tiebreaker correcto: distancia ASC, `es_principal` DESC, `updated_at` DESC.
- [x] Campo `total_sucursales` agregado a `OfertaFeedRow`.
- [x] Caso `sucursalId` preserva comportamiento (sin dedup — `deduplicar = !sucursalId`).
- [x] Todos los órdenes (`distancia`, `recientes`, `populares`, `vencen_pronto`) ajustados al outer query sin prefijo de tabla.
- [x] `destacada-del-dia` también deduplica usando matriz como tiebreaker.
- [x] `obtenerOfertaDetalle` NO modificado fuera del filtro de visibilidad.
- [x] Endpoints de Business Studio NO modificados.
- [x] TypeScript compila sin errores (`tsc --noEmit` → exit 0).
- [ ] Tests curl pasan en los casos listados — **pendiente** (servidor no activo).
- [ ] EXPLAIN ANALYZE ejecutado y reportado — **pendiente**.
