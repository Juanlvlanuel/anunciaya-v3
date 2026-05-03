# Análisis: Estado actual del feed público de Ofertas

**Fecha:** 2026-04-30  
**Tipo:** Solo lectura — sin modificaciones.  
**Archivos leídos:** `ofertas.service.ts`, `ofertas.controller.ts`, `ofertas.routes.ts`, `ofertas.types.ts`, `ofertas.schema.ts`, `schema.ts`, `types/ofertas.ts`, `ofertasService.ts`, `useOfertasFeed.ts`

---

## 1. Modelo de datos actual de `ofertas`

Definición completa (`apps/api/src/db/schemas/schema.ts`, línea 654):

| Columna | Tipo BD | Default | Constraint |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK, NOT NULL |
| `negocio_id` | uuid | — | NOT NULL, FK → `negocios.id` (cascade) |
| `sucursal_id` | uuid | — | **NULLABLE**, FK → `negocio_sucursales.id` (cascade) |
| `articulo_id` | uuid | — | NULLABLE, FK → `articulos.id` (cascade) |
| `titulo` | varchar(150) | — | NOT NULL |
| `descripcion` | text | — | NULLABLE |
| `imagen` | varchar(500) | — | NULLABLE |
| `tipo` | varchar(20) | — | NOT NULL, check: `['porcentaje','monto_fijo','2x1','3x2','envio_gratis','otro']` |
| `valor` | varchar(100) | — | NULLABLE |
| `compra_minima` | numeric(10,2) | `0` | — |
| `fecha_inicio` | timestamptz | — | NOT NULL |
| `fecha_fin` | timestamptz | — | NOT NULL |
| `limite_usos` | integer | — | NULLABLE (NULL = ilimitado) |
| `usos_actuales` | integer | `0` | — |
| `activo` | boolean | `true` | — |
| `visibilidad` | varchar(15) | `'publico'` | check: `NULL OR ['publico','privado']` |
| `limite_usos_por_usuario` | integer | — | NULLABLE |
| `created_at` | timestamptz | `NOW()` | — |
| `updated_at` | timestamptz | `NOW()` | — |

**Sobre `sucursal_id`:** es **NULLABLE** a nivel de definición Drizzle (`.references(() => negocioSucursales.id, { onDelete: 'cascade' })`), aunque en la práctica el servicio siempre lo exige al crear.

**Sobre `visibilidad`:** default `'publico'`, acepta NULL (según el check constraint del schema). En la práctica el servicio lo trata como `'publico'` o `'privado'`.

**Índices existentes en `ofertas`:**
- `idx_ofertas_activo` — btree(activo)
- `idx_ofertas_fecha_fin` — btree(fecha_fin)
- `idx_ofertas_fecha_inicio` — btree(fecha_inicio)
- `idx_ofertas_negocio_id` — btree(negocio_id)
- `idx_ofertas_sucursal_id` — btree(sucursal_id)

**Tablas relacionadas:**

| Tabla | Propósito |
|---|---|
| `oferta_usos` | Registros de canje con método, monto, empleado, sucursal |
| `oferta_usuarios` | Asignación de cupones privados a usuarios + código personal único |
| `oferta_vistas` | Eventos individuales de vista (para popularidad por ventana de 7 días) — **migración pendiente** |
| `ofertas_destacadas` | Override administrable para "Oferta del día" — **migración pendiente** |
| `metricas_entidad` | Acumulado histórico total_views / total_shares / total_clicks |

---

## 2. Endpoint `GET /api/ofertas/feed` — estado actual

**Ruta:** `router.get('/feed', verificarToken, getFeedOfertas)` — requiere login.

**Query principal** (traducción del SQL generado por Drizzle raw en `obtenerFeedOfertas`, `apps/api/src/services/ofertas.service.ts`, líneas 160–334):

```sql
SELECT
  o.id                                      AS oferta_id,
  o.titulo, o.descripcion, o.imagen,
  o.tipo, o.valor, o.compra_minima,
  o.fecha_inicio, o.fecha_fin,
  o.limite_usos, o.usos_actuales,
  o.activo, o.created_at,

  n.id                                      AS negocio_id,
  n.usuario_id                              AS negocio_usuario_id,
  n.nombre                                  AS negocio_nombre,
  n.logo_url,
  n.participa_puntos                        AS acepta_cardya,
  n.verificado,

  s.id                                      AS sucursal_id,
  s.nombre                                  AS sucursal_nombre,
  s.direccion, s.ciudad, s.telefono, s.whatsapp,

  ST_Y(s.ubicacion::geometry)               AS latitud,
  ST_X(s.ubicacion::geometry)               AS longitud,

  -- Distancia (solo si lat/lng presentes; NULL si no):
  ST_Distance(s.ubicacion::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
  ) / 1000                                  AS distancia_km,

  -- Categorías del negocio (subquery JSON):
  ( SELECT json_agg(...) FROM asignacion_subcategorias ... ) AS categorias,

  COALESCE(me.total_views, 0)               AS total_vistas,
  COALESCE(me.total_shares, 0)              AS total_shares,

  -- [solo cuando orden=populares Y tabla oferta_vistas existe]:
  COALESCE(( SELECT COUNT(*)::int FROM oferta_vistas ov
             WHERE ov.oferta_id = o.id
               AND ov.created_at >= NOW() - INTERVAL '7 days' ), 0)
                                            AS vistas_ultimos_7_dias,

  EXISTS(SELECT 1 FROM votos v WHERE v.entity_type='oferta'
         AND v.entity_id=o.id AND v.user_id=$userId
         AND v.tipo_accion='like')          AS liked,
  EXISTS(SELECT 1 FROM votos v WHERE v.entity_type='oferta'
         AND v.entity_id=o.id AND v.user_id=$userId
         AND v.tipo_accion='save')          AS saved

FROM ofertas o
INNER JOIN negocios n          ON n.id = o.negocio_id
INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
LEFT  JOIN metricas_entidad me ON me.entity_type='oferta' AND me.entity_id=o.id

WHERE o.activo = true
  AND o.visibilidad = 'publico'         -- ← filtro de visibilidad
  AND n.activo = true
  AND s.activa = true
  AND n.es_borrador = false
  AND n.onboarding_completado = true
  AND DATE($fechaLocal) >= DATE(o.fecha_inicio)
  AND DATE($fechaLocal) <= DATE(o.fecha_fin)
  AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
  [AND s.id = $sucursalId]               -- solo si se pasa sucursalId
  [AND ST_DWithin(s.ubicacion::geography,
       ST_SetSRID(ST_MakePoint($lng,$lat),4326)::geography,
       $distanciaMaxKm * 1000)]           -- solo si lat/lng y sin sucursalId
  [AND EXISTS(SELECT 1 FROM asignacion_subcategorias ... sc.categoria_id=$cat)]
  [AND o.tipo = $tipo]
  [AND n.participa_puntos = true]        -- soloCardya
  [AND o.created_at >= NOW() - ($N::int * INTERVAL '1 hour')]  -- creadasUltimasHoras
  [AND (o.titulo ILIKE $bus OR o.descripcion ILIKE $bus OR n.nombre ILIKE $bus)]

ORDER BY [ver tabla abajo]
LIMIT $limite
OFFSET $offset
```

**Cláusulas ORDER BY según `orden`:**

| Valor `orden` | SQL generado |
|---|---|
| `'distancia'` | `distancia_km ASC NULLS LAST` |
| `'recientes'` | `o.created_at DESC` |
| `'populares'` + tabla oferta_vistas existe | `vistas_ultimos_7_dias DESC, o.created_at DESC` |
| `'populares'` + tabla NO existe | `o.created_at DESC` (fallback silencioso) |
| `'vencen_pronto'` | `o.fecha_fin ASC` |
| sin param (default) | `distancia_km ASC` si hay GPS, sino `o.created_at DESC` |

**¿Aplica `visibilidad = 'publico'`?**  
**SÍ.** Línea 263 de `ofertas.service.ts`:
```typescript
AND o.visibilidad = 'publico'
```

**¿Hace deduplicación?**  
**NO.** El feed no tiene ninguna cláusula `DISTINCT ON` ni agrupamiento. Si una oferta fue duplicada a N sucursales, aparecen N filas independientes en el feed (mismo título/tipo/valor/imagen, distinto `sucursal_id`).

**¿Devuelve `total_sucursales`?**  
**NO.** El campo no existe en el SELECT.

**Post-procesado en JS** (líneas 341–346): luego de ejecutar la query, el código marca con `es_popular: true` las primeras 3 filas cuando `orden === 'populares'` Y `usaPopularidadReal === true`.

---

## 3. Endpoint `GET /api/ofertas/destacada-del-dia` — estado actual

**Ruta:** `router.get('/destacada-del-dia', verificarToken, getOfertaDestacadaDelDia)`

**Lógica** (`obtenerOfertaDestacadaDelDia`, líneas 2299–2385):

1. **Override administrable** — busca en `ofertas_destacadas` donde `activa=true AND vigente_desde<=NOW() AND vigente_hasta>=NOW()`. Si la tabla no existe (migración pendiente), captura el error silenciosamente y continúa.

2. **Fallback automático** — si no hay override, ejecuta:

```sql
SELECT o.id
FROM ofertas o
INNER JOIN negocios n ON n.id = o.negocio_id
INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
WHERE o.activo = true
  AND n.activo = true
  AND s.activa = true
  AND n.es_borrador = false
  AND n.onboarding_completado = true
  AND CURRENT_DATE >= DATE(o.fecha_inicio)
  AND CURRENT_DATE <= DATE(o.fecha_fin)
  AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
ORDER BY [vistas_7_dias DESC,] o.created_at DESC
LIMIT 1
```

3. Si hay `ofertaId`, reutiliza `obtenerOfertaDetalle(ofertaId, userId)`.

4. Si no hay ninguna oferta disponible, devuelve `{ success: true, data: null }`.

**¿Aplica `visibilidad = 'publico'`?**  
**NO** — ninguno de los dos caminos (override ni fallback) filtra por visibilidad. El fallback podría seleccionar un cupón privado (`visibilidad = 'privado'`) como "Oferta del día".

**¿Maneja duplicados?**  
No aplica — devuelve exactamente una oferta (la del override o la del top-1 del fallback).

---

## 4. Endpoint `GET /api/ofertas/detalle/:ofertaId` — estado actual

**Ruta:** `router.get('/detalle/:ofertaId', verificarToken, getOfertaDetalle)`

**Query** (`obtenerOfertaDetalle`, líneas 376–478):

```sql
SELECT
  o.id AS oferta_id, o.titulo, o.descripcion, o.imagen,
  o.tipo, o.valor, o.compra_minima,
  o.fecha_inicio, o.fecha_fin, o.limite_usos, o.usos_actuales,
  o.activo, o.created_at,

  n.id AS negocio_id, n.usuario_id AS negocio_usuario_id,
  n.nombre AS negocio_nombre, n.descripcion AS negocio_descripcion,
  n.logo_url, n.participa_puntos AS acepta_cardya,
  n.verificado, n.sitio_web,

  s.id AS sucursal_id, s.nombre AS sucursal_nombre,
  s.direccion, s.ciudad, s.telefono, s.whatsapp, s.correo,

  ST_Y(s.ubicacion::geometry) AS latitud,
  ST_X(s.ubicacion::geometry) AS longitud,

  COALESCE(me.total_views, 0)  AS total_vistas,
  COALESCE(me.total_shares, 0) AS total_shares,
  COALESCE(me.total_clicks, 0) AS total_clicks,
  false                        AS es_popular,

  EXISTS(SELECT 1 FROM votos v WHERE ... 'like') AS liked,
  EXISTS(SELECT 1 FROM votos v WHERE ... 'save') AS saved

FROM ofertas o
INNER JOIN negocios n          ON n.id = o.negocio_id
INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
LEFT  JOIN metricas_entidad me ON ...

WHERE o.id = $ofertaId
  AND n.activo = true
  AND s.activa = true
LIMIT 1
```

**Campos adicionales respecto al feed:** `negocio_descripcion`, `sitio_web`, `correo` (de la sucursal), `total_clicks`. **Sin filtro de visibilidad** — cualquier usuario autenticado puede ver el detalle de un cupón privado si conoce su UUID.

---

## 5. Tipo `OfertaFeedRow` actual (backend)

Definido en `apps/api/src/types/ofertas.types.ts` líneas 183–249:

| Campo | Tipo | Origen |
|---|---|---|
| `oferta_id` | string | columna directa `o.id` |
| `titulo` | string | columna directa |
| `descripcion` | string \| null | columna directa |
| `imagen` | string \| null | columna directa |
| `tipo` | TipoOferta | columna directa |
| `valor` | string \| null | columna directa |
| `compra_minima` | string | columna directa (NUMERIC → string) |
| `fecha_inicio` | string | columna directa |
| `fecha_fin` | string | columna directa |
| `limite_usos` | number \| null | columna directa |
| `usos_actuales` | number | columna directa |
| `activo` | boolean | columna directa |
| `created_at` | string | columna directa |
| `negocio_id` | string | JOIN negocios |
| `negocio_usuario_id` | string | JOIN negocios.usuario_id |
| `negocio_nombre` | string | JOIN negocios |
| `logo_url` | string \| null | JOIN negocios |
| `acepta_cardya` | boolean | JOIN negocios.participa_puntos |
| `verificado` | boolean | JOIN negocios |
| `sucursal_id` | string | JOIN negocio_sucursales |
| `sucursal_nombre` | string | JOIN negocio_sucursales |
| `direccion` | string | JOIN negocio_sucursales |
| `ciudad` | string | JOIN negocio_sucursales |
| `telefono` | string \| null | JOIN negocio_sucursales |
| `whatsapp` | string \| null | JOIN negocio_sucursales |
| `latitud` | number | calculado: ST_Y(ubicacion) |
| `longitud` | number | calculado: ST_X(ubicacion) |
| `distancia_km` | number \| null | calculado: ST_Distance / 1000 |
| `categorias` | Array \| null | calculado: subquery json_agg |
| `total_vistas` | number | calculado: COALESCE metricas_entidad |
| `total_shares` | number | calculado: COALESCE metricas_entidad |
| `liked` | boolean | calculado: EXISTS subquery votos |
| `saved` | boolean | calculado: EXISTS subquery votos |
| `es_popular` | boolean | calculado: post-procesado JS (top 3 cuando orden=populares) |

---

## 6. Estado del filtro de visibilidad

### `obtenerFeedOfertas`

**SÍ aplica** el filtro. Línea exacta en `apps/api/src/services/ofertas.service.ts:263`:
```typescript
AND o.visibilidad = 'publico'
```

### `obtenerOfertaDestacadaDelDia` (fallback)

**NO aplica** filtro de visibilidad. El fallback query (líneas 2347–2362) no contiene ninguna cláusula `AND o.visibilidad = 'publico'`. Podría seleccionar un cupón privado como Hero editorial.

### `obtenerOfertaDetalle`

**NO aplica** filtro de visibilidad. El endpoint de detalle no verifica si la oferta es pública o privada (solo verifica negocio activo y sucursal activa).

---

## 7. Análisis de duplicación de ofertas

No fue posible ejecutar la consulta SELECT directamente en la BD desde este entorno (no hay herramienta de conexión configurada).

**Lo que el código evidencia:**

La función `duplicarOfertaASucursales` crea filas independientes en la tabla `ofertas` con los mismos valores de `titulo`, `tipo`, `valor`, `imagen`, `fecha_inicio`, `fecha_fin` pero con diferente `sucursal_id`. El `negocio_id` es el mismo.

El feed (`obtenerFeedOfertas`) no tiene ningún mecanismo de agrupación ni de deduplicación: cada oferta es una fila, y si el negocio X duplicó su oferta a 5 sucursales, el feed devuelve 5 filas independientes para el mismo negocio con la misma oferta (los 5 con datos de sucursal distintos).

**Consulta recomendada para confirmar en Supabase:**
```sql
SELECT
  o.negocio_id,
  o.titulo,
  o.tipo,
  o.valor,
  o.imagen,
  o.fecha_inicio,
  o.fecha_fin,
  COUNT(*) AS num_copias,
  array_agg(o.sucursal_id) AS sucursales,
  array_agg(o.id) AS ids_oferta
FROM ofertas o
WHERE o.activo = true
  AND o.visibilidad = 'publico'
GROUP BY 1, 2, 3, 4, 5, 6, 7
HAVING COUNT(*) > 1
ORDER BY num_copias DESC
LIMIT 20;
```

---

## 8. Análisis del frontend

### `useOfertasFeedCerca` (`apps/web/src/hooks/queries/useOfertasFeed.ts:79`)

**Params que manda al backend:**
- `latitud`, `longitud` (del `useGpsStore`) — siempre incluidos aunque sean null (para que el queryKey reaccione al cambio de ciudad)
- `fechaLocal` — siempre (generado localmente con `new Date().toLocaleDateString('en-CA')`)
- Según chip activo: `creadasUltimasHoras` (hoy/esta_semana), `orden: 'distancia'` (cerca), `soloCardya: true` (cardya), `orden: 'recientes'` (nuevas), `orden: 'populares'` (mas_vistas)
- `busqueda` (del `useSearchStore` global del Navbar)

**NO envía:** `sucursalId`, `categoriaId`, `tipo`, `distanciaMaxKm`, `limite`, `offset` (usa defaults del backend: distanciaMaxKm=50, limite=20, offset=0).

**Estructura esperada:** `OfertaFeed[]` — mediante `r.data ?? []`.

### `useOfertaDestacadaDelDia` (`useOfertasFeed.ts:120`)

- No envía ningún parámetro (ni lat/lng, por decisión editorial).
- staleTime: 30 minutos.
- Estructura esperada: `OfertaFeed | null`.

### `useBloqueCarrusel` / carruseles editoriales (`useOfertasFeed.ts:144`)

Usado por `useOfertasFeedVencenPronto`, `useOfertasFeedRecientes`, `useOfertasFeedPopulares`.

- Envía: `orden` (fijo por carrusel), `limite: 10`, `latitud`, `longitud`.
- staleTime: 5 minutos.
- Sin `placeholderData: keepPreviousData` (params fijos, no variable).

### Discrepancias frontend ↔ backend

| Elemento | Frontend | Backend |
|---|---|---|
| Tipo `'regalo'` | **Presente** en `TipoOferta` frontend (`apps/web/src/types/ofertas.ts:27`) | **No existe** en el check constraint de la BD ni en el schema Drizzle ni en la validación Zod |
| `sucursalId` en filtros | Ausente en la interfaz `FiltrosFeedOfertas` frontend | Presente en `filtrosFeedSchema` backend — acepta el parámetro |
| `total_clicks` | No existe en `OfertaFeed` frontend | Existe en `obtenerOfertaDetalle` (no en el feed) |
| `EstadoOferta` frontend | Incluye `'agotada'` e `'inactiva'` | Backend tipo tiene solo `'proxima'`, `'activa'`, `'vencida'` (el estado calculado en BS sí usa los 5 valores) |

---

## 9. Hallazgos destacados

- **Filtro de visibilidad ausente en `destacada-del-dia` fallback.** El endpoint hero del feed podría devolver un cupón privado como oferta editorial. Es el bug más urgente: una línea de fix (`AND o.visibilidad = 'publico'`).

- **Tipo `'regalo'` fantasma en el frontend.** `TipoOferta` en `apps/web/src/types/ofertas.ts:27` incluye `'regalo'` pero la BD solo acepta `['porcentaje','monto_fijo','2x1','3x2','envio_gratis','otro']`. Si el frontend intenta crear/mostrar una oferta tipo 'regalo', el check constraint de PG la rechazará.

- **Duplicados de sucursal sin deduplicación.** El feed actual entrega N filas para la misma oferta duplicada a N sucursales. No hay `DISTINCT ON`, `GROUP BY`, ni `total_sucursales`.

- **`tablaOfertaVistasExiste()` sin caché.** Se llama una vez por request al feed y a `destacada-del-dia`. Executa `SELECT to_regclass(...)` cada vez. Con tráfico alto podría acumularse; el comentario en el código (línea 73) lo reconoce como trade-off aceptado.

- **Detalle sin filtro de visibilidad.** `GET /detalle/:ofertaId` no verifica si la oferta es pública o privada. Cualquier usuario autenticado que conozca el UUID de un cupón privado puede obtener su detalle completo.

- **`es_popular` siempre false en el detalle.** Está hardcodeado como `false as es_popular` en `obtenerOfertaDetalle` (línea 423), lo cual es correcto para el modal de detalle — solo aplica al orden del feed.

- **`sucursalId` como filtro del feed no expuesto en el hook.** El backend acepta `?sucursalId=` en el feed (para perfiles de negocio) y la interfaz `FiltrosFeedOfertas` del backend lo tiene, pero el hook `useOfertasFeedCerca` nunca lo pasa. Para el caso de uso "ver ofertas de esta sucursal" desde el perfil de negocio, habría que crear un hook separado.

- **Fallback doble en `destacada-del-dia`.** Si `oferta_vistas` tampoco existe (migración pendiente), el fallback del fallback ordena solo por `o.created_at DESC`. Funcionalmente correcto pero puede devolver cualquier oferta reciente, no necesariamente la más popular.

---

## 10. Recomendaciones para el siguiente sprint

### ¿Qué cambios son estrictamente necesarios para implementar deduplicación?

1. **Decidir el campo de agrupación.** La deduplicación debe basarse en "misma oferta conceptual". Los campos candidatos son: `(o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin)` — 7 campos. Alternativamente, usar un `oferta_origen_id` (UUID de la oferta original) que se propague al duplicar. Esta segunda opción es más robusta pero requiere migración de columna.

2. **Estrategia con `DISTINCT ON`:** viable en PostgreSQL pero con restricciones. La query base quedaría:
   ```sql
   SELECT DISTINCT ON (o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin)
     ... (campos actuales) ...
     COUNT(*) OVER (PARTITION BY o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin)
       AS total_sucursales
   FROM ofertas o ...
   ORDER BY o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin,
            distancia_km ASC NULLS LAST  ← para elegir la sucursal más cercana
   ```
   El problema: `ORDER BY` en `DISTINCT ON` debe empezar con los campos del `DISTINCT ON`, lo que choca con los otros ordenamientos (`recientes`, `vencen_pronto`, `populares`). Habría que hacer la deduplicación como subquery o CTE.

3. **Agregar campo `total_sucursales`** al tipo `OfertaFeedRow` y `OfertaFeed`.

4. **Agregar el filtro faltante en `destacada-del-dia`** (fix de una línea, bajo riesgo).

### ¿Riesgos o complicaciones a conocer antes del fix?

- `DISTINCT ON` con `distancia_km` como criterio de selección requiere que la distancia esté calculada antes del `DISTINCT ON`, lo que no es posible directamente en la misma cláusula `SELECT`. Solución típica: CTE intermedio que calcula distancia, luego `DISTINCT ON` en el outer query.

- Si el usuario NO tiene GPS, el criterio de "cuál sucursal elegir" para representar la oferta deduplicada no está definido. Se necesita un tiebreaker: ¿la más reciente? ¿la principal?

- El campo `sucursal_id` en la fila del feed (después de deduplicar) representaría solo UNA sucursal. El frontend necesita decidir cómo mostrar "disponible en 3 sucursales" y qué acción tomar al hacer clic.

### ¿La estrategia de `DISTINCT ON` por 8 campos es viable?

Técnicamente sí, con la salvedad del punto anterior: el ordenamiento del `DISTINCT ON` debe coincidir con el del `ORDER BY` final, lo que rompe los demás ordenamientos (`recientes`, `vencen_pronto`, `populares`). La solución más limpia es un CTE:

```sql
WITH feed_base AS (
  SELECT ..., ROW_NUMBER() OVER (
    PARTITION BY o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
    ORDER BY distancia_km ASC NULLS LAST
  ) AS rn,
  COUNT(*) OVER (
    PARTITION BY o.negocio_id, o.titulo, o.tipo, o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
  ) AS total_sucursales
  FROM ofertas o ...
)
SELECT * FROM feed_base WHERE rn = 1
ORDER BY [orden elegido]
```

### ¿Hay índices que ayuden o convendría agregar?

Los índices existentes **no cubren** la deduplicación multi-campo:
- `idx_ofertas_negocio_id` ayuda parcialmente (filtro del PARTITION BY).
- No existe índice sobre `(negocio_id, titulo, tipo, valor, imagen, fecha_inicio, fecha_fin)`.

Si se implementa la estrategia de CTE con `ROW_NUMBER()`, el planner probablemente usará `idx_ofertas_activo` + `idx_ofertas_negocio_id` + el filtro de fecha. Un índice compuesto sobre `(activo, visibilidad, negocio_id)` podría mejorar el rendimiento del WHERE base. Convendría medir con `EXPLAIN ANALYZE` antes de agregar índices.
