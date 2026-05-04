# Sprint 9.1 — Plan de Implementación: Vida y Actividad Visible

**Fecha:** 2026-05-04
**Estado:** ✅ Implementado

---

## Resumen ejecutivo

3 features que agregan señales de actividad real al MarketPlace sin convertirlo en red social.
Sin tablas nuevas — se resuelve con Redis + SQL existente.

---

## Decisiones técnicas resueltas

| Decisión | Resolución |
|---|---|
| Tracking "viendo ahora" | **Sorted Set Redis.** `ZADD articulo:viendo:{id} {timestamp_ms} {userId}`. Al consultar: `ZREMRANGEBYSCORE` limpia >2min + `ZCARD` cuenta. O(1), sin bloqueos, sin fugas de miembros viejos. |
| Vistas 24h | `INCR articulo:vistas24h:{id}` en Redis al llamar `registrarVista`. Si el valor retornado es 1 (key recién creada), aplica `EXPIRE 86400`. Si ya existe, el TTL no se toca. |
| Guardados 24h | `COUNT(*) FROM guardados WHERE entity_type='articulo_marketplace' AND created_at > NOW()-'24h'`. Campo `guardados.created_at` existe. |
| Mensajes 24h | `COUNT(*) FROM chat_mensajes m JOIN chat_conversaciones c ON c.id=m.conversacion_id WHERE c.articulo_marketplace_id=$id AND m.created_at > NOW()-'24h'`. Campo `chat_conversaciones.articulo_marketplace_id` existe. |
| `ultima_conexion` vendedor | `usuarios.ultima_conexion` existe. Se agrega al JOIN de `obtenerArticuloPorId`. |
| `tiempoRespuestaMinutos` | Lógica extraída a helper privado `calcularTiempoRespuesta(vendedorId)`. Reutilizado en `obtenerArticuloPorId` y `obtenerVendedorPorId`. |
| Deduplicación entre secciones | Backend recibe `excluirIds[]` en el endpoint trending. Cercanos se deduplica en el frontend contra `idsRecientes + idsTrending`. |
| Score trending | SQL trae top 30 candidatos ordenados por `guardados_24h + mensajes_24h`. JS enriquece con `vistas24h` de Redis y calcula `score = vistas24h*1 + guardados*3 + mensajes*5`. Ordenado y recortado a top 10 en JS. |
| Umbral sección trending | < 3 artículos con score > 0 → devolver array vacío (sección no se muestra). |
| Umbral sección cercanos | < 4 artículos tras deduplicar → sección no se muestra. |
| Heartbeat delay | Primer ping a los 5s (evita contar rebotes rápidos). Luego cada 60s. |

---

## Ajustes al plan original (feedback de revisión)

| Punto | Plan original | Implementado |
|---|---|---|
| `INCR + EXPIRE` | `SETNX` combinado con `INCR` (incorrecto) | `INCR` siempre + `EXPIRE NX` implícito: si valor === 1, `EXPIRE 86400` |
| Tracking "viendo ahora" | `KEYS articulo:viendo:{id}:*` (bloqueante) | Sorted Set: `ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` (O(1)) |
| Score SQL | `ORDER BY vistas24h_redis * 1.0 + ...` (Redis no es accesible desde SQL) | SQL solo con `guardados_24h + mensajes_24h`; score completo calculado en JS |
| Umbral trending | < 4 artículos | Bajado a < 3 para beta (ciudad pequeña) |
| Heartbeat delay | Sin delay | Primer ping a 5s para no contar rebotes |

---

## Bloques de implementación

### Bloque 1 — Backend Feature 3: datos del vendedor en detalle ✅

**Archivo:** `apps/api/src/services/marketplace.service.ts`

**Cambios realizados:**
- Nueva función privada `calcularTiempoRespuesta(vendedorId)` con la CTE de chat — extraída de `obtenerVendedorPorId`.
- `obtenerArticuloPorId`: agrega `u.ultima_conexion AS vendedor_ultima_conexion` al JOIN. Llama `calcularTiempoRespuesta` con `Promise.all`.
- Devuelve en `vendedor`: `ultimaConexion: string | null` y `tiempoRespuestaMinutos: number | null`.
- `obtenerVendedorPorId`: simplificado — usa el helper en lugar de la query inline.
- Interfaz `ArticuloConVendedorRow` extendida.

---

### Bloque 2 — Frontend Feature 3: mini-bio en CardVendedor ✅

**Cambios realizados:**
- `apps/web/src/types/marketplace.ts` — `VendedorArticulo` extendida con `ultimaConexion?: string | null` y `tiempoRespuestaMinutos?: number | null`.
- `apps/web/src/utils/marketplace.ts` — nueva función `formatearUltimaConexion`:
  - `< 5 min` → `"Activa ahora"`
  - `< 60 min` → `"Activa hace X minutos"`
  - `< 24h` → `"Activa hace X horas"`
  - `< 7 días` → `"Activa hace X días"`
  - `>= 7 días o null` → `null` (no se muestra)
- `apps/web/src/components/marketplace/CardVendedor.tsx`:
  - Línea 1: `conexionLabel` (si no es null)
  - Línea 2: `"Suele responder rápido"` (si `tiempoRespuestaMinutos < 60`)
  - Estilo: `text-xs text-slate-400`, sin iconos de "online", sin punto verde.

---

### Bloque 3 — Backend Feature 1: heartbeat + actividad en feed ✅

**Archivos:** `marketplace.service.ts`, `marketplace.routes.ts`, `marketplace.controller.ts`

**Cambios realizados:**
- Helpers privados Redis:
  - `contarViendo(id)`: `ZREMRANGEBYSCORE` + `ZCARD` — limpia entradas >2min antes de contar.
  - `obtenerVistas24h(id)`: `GET articulo:vistas24h:{id}`.
- `registrarHeartbeat(articuloId, userId)` (exportada): `ZADD articulo:viendo:{id} {timestamp_ms} {userId}`.
- `registrarVista`: hace `INCR` en Redis en paralelo con el UPDATE SQL; aplica `EXPIRE 86400` solo si valor === 1.
- `obtenerFeed`: enriquece cada artículo con `viendo` + `vistas24h` de Redis usando `Promise.all` anidado.
- `ArticuloFeedRow` extendida con `viendo: number` y `vistas24h: number`.
- Endpoint `POST /articulos/:id/heartbeat` (verificarToken) — responde `{ ok: true }` siempre.

---

### Bloque 4 — Frontend Feature 1: línea de actividad + heartbeat ✅

**Cambios realizados:**
- `apps/web/src/types/marketplace.ts` — `ArticuloFeed` extendida con `viendo?: number` y `vistas24h?: number`.
- `apps/web/src/components/marketplace/CardArticulo.tsx`:
  - Línea de actividad condicional (UNA sola, orden de prioridad):
    1. `viendo >= 3` → icono `Users` + `"{viendo} personas viendo ahora"`
    2. `totalGuardados >= 5` → icono `Heart` + `"{totalGuardados} personas lo guardaron"`
    3. `vistas24h >= 20` → icono `Eye` + `"Visto {vistas24h} veces hoy"`
  - `data-testid="actividad-{id}"` en el contenedor.
- `apps/web/src/hooks/queries/useMarketplace.ts` — nueva función `heartbeatArticulo(id)` fire-and-forget.
- `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`:
  - `useEffect` con `setTimeout` de 5s para el primer ping y `setInterval` de 60s.
  - Solo se activa si `usuarioActual` existe (autenticado).
  - Limpia `clearTimeout` + `clearInterval` en el cleanup.

---

### Bloque 5 — Backend Feature 2: endpoint trending ✅

**Cambios realizados:**
- `apps/api/src/services/marketplace.service.ts` — nueva función `obtenerTrending(ciudad, excluirIds[])`:
  - SQL: top 30 candidatos con `guardados_24h` y `mensajes_24h` (LEFT JOIN a `guardados` y `chat_mensajes`).
  - JS: enriquece con `vistas24h` de Redis en `Promise.all`.
  - Score: `vistas24h * 1 + guardados_24h * 3 + mensajes_24h * 5`.
  - Filtra `score > 0`, ordena DESC, top 10. Si < 3 → devuelve `[]`.
  - `excluirIds` usa `sql.join` con parámetros Drizzle (no interpolación directa).
- `apps/api/src/controllers/marketplace.controller.ts` — `getTrendingFeed`: parsea `excluirIds[]` del query, valida UUIDs.
- `apps/api/src/routes/marketplace.routes.ts` — `GET /feed/trending` declarado ANTES de `/articulos/:id`.

---

### Bloque 6 — Frontend Feature 2: sección "Lo más visto hoy" ✅

**Cambios realizados:**
- `apps/web/src/config/queryKeys.ts` — clave `trending(ciudad, excluirIds)`.
- `apps/web/src/hooks/queries/useMarketplace.ts` — hook `useTrendingMarketplace({ ciudad, excluirIds })`:
  - `staleTime: 5 min`.
  - `enabled: !!ciudad`.
  - `placeholderData: keepPreviousData`.
- `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`:
  - `idsRecientes` calculado con `useMemo`.
  - `useTrendingMarketplace` con `excluirIds = idsRecientes`.
  - `cercanosDeduplicados` = cercanos filtrados sin IDs de recientes + trending.
  - `SeccionTrending` (nuevo componente) entre `SeccionRecientes` y `SeccionCercanos` — mismo patrón de carrusel drag-to-scroll, sombra fade oscura.
  - `SeccionCercanos` ahora recibe `cercanosDeduplicados` y no se muestra si < 4 artículos.
  - `SeccionTrending` no se muestra si `trending.length < 3`.

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `apps/api/src/services/marketplace.service.ts` | `calcularTiempoRespuesta`, `registrarHeartbeat`, `contarViendo`, `obtenerVistas24h`, extend `obtenerArticuloPorId`, extend `registrarVista`, extend `obtenerFeed`, nueva `obtenerTrending` |
| `apps/api/src/routes/marketplace.routes.ts` | `POST /articulos/:id/heartbeat`, `GET /feed/trending` |
| `apps/api/src/controllers/marketplace.controller.ts` | `postHeartbeat`, `getTrendingFeed` |
| `apps/web/src/types/marketplace.ts` | Extend `VendedorArticulo`, extend `ArticuloFeed` |
| `apps/web/src/utils/marketplace.ts` | Nueva `formatearUltimaConexion` |
| `apps/web/src/components/marketplace/CardVendedor.tsx` | Mini-bio condicional (conexión + responde rápido) |
| `apps/web/src/components/marketplace/CardArticulo.tsx` | Línea de actividad condicional con prioridad |
| `apps/web/src/config/queryKeys.ts` | Clave `trending` |
| `apps/web/src/hooks/queries/useMarketplace.ts` | `useTrendingMarketplace`, `heartbeatArticulo` |
| `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx` | `SeccionTrending`, deduplicación en cascada, `cercanosDeduplicados` |
| `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx` | Heartbeat interval (5s delay + 60s interval) |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación aplicada |
|---|---|
| Score trending sin actividad en BD test | El seed no genera conversaciones → sección no aparece (umbral < 3). Crear datos de prueba manualmente para probar. |
| `ultima_conexion` null para usuarios test | `formatearUltimaConexion(null)` devuelve null → línea no se muestra. Controlado. |
| Heartbeat en usuarios no autenticados | El endpoint es privado (`verificarToken`). El `useEffect` valida `!!usuarioActual` antes de activarse. Visitantes anónimos no envían heartbeat. |
| `ZREMRANGEBYSCORE` en cada consulta del feed | Por cada artículo en el feed se lanza una limpieza + ZCARD. Con 20 artículos = 40 comandos Redis en paralelo. Aceptable en beta. |
| Cercanos vacíos tras deduplicar | Si `cercanosDeduplicados.length < 4`, la sección no se muestra. El usuario ve solo recientes + trending. |

---

## Orden de implementación ejecutado

```
B1 (Backend F3) → B2 (Frontend F3) → B3 (Backend F1) → B4 (Frontend F1) → B5 (Backend F2) → B6 (Frontend F2)
```
