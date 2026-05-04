# Cierre — Sprint 1 MarketPlace: Backend Base

> **Fecha inicio:** 03 Mayo 2026
> **Fecha cierre:** 03 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 1/8
> **Prompt origen:** `docs/prompts Marketplace/Sprint-1-Backend-Base.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md`
> **Estado actual:** 🟢 Sprint 1 cerrado — 7/7 bloques completos

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | Migración SQL + cambios a tablas existentes | ✅ Completado | 5/5 checks SQL en pgAdmin local + Supabase |
| 2 | Schema Drizzle + imageRegistry | ✅ Completado | `tsc --noEmit` exit=0 |
| 3 | Validaciones Zod | ✅ Completado | `tsc --noEmit` exit=0 |
| 4 | Service + helpers + test unitario | ✅ Completado | 4/4 tests vitest pasan |
| 5 | Controller `marketplace.controller.ts` | ✅ Completado | `tsc --noEmit` exit=0 |
| 6 | Routes + montaje en `routes/index.ts` | ✅ Completado | `tsc --noEmit` exit=0 |
| 7 | Pruebas manuales (curl) | ✅ Completado | 10/10 casos pasan |

---

## Contexto

Arrancamos la sección **MarketPlace** (compra-venta P2P de objetos físicos entre usuarios en modo Personal, transacción 100% offline). Este sprint cubre **solo backend base** — sin frontend, sin moderación de palabras prohibidas, sin búsqueda, sin perfil del vendedor, sin cron jobs y sin sistema de niveles (todo eso vive en sprints posteriores 2–8).

---

## Decisiones confirmadas (5 preguntas iniciales + 2 ajustes del usuario)

1. **Middleware de modo Personal:** reusar `requiereModoPersonal` ya existente en `apps/api/src/middleware/validarModo.ts`. NO crear wrapper nuevo.
2. **Tabla del chat:** `chat_conversaciones` (nombre real). El doc maestro abrevia como `chat_conv` por legibilidad.
3. **Foto huérfana al editar:** helper local `eliminarFotoMarketplaceSiHuerfana` (las fotos del MarketPlace no se comparten con otras tablas).
4. **PostGIS:** ya habilitada en Supabase. Se incluye `CREATE EXTENSION IF NOT EXISTS postgis;` como defensa idempotente.
5. **TTL `expira_at`:** 30 días desde `created_at`.
6. **Test unitario obligatorio** para `aleatorizarCoordenada`: 100 puntos dentro del círculo de 500m.
7. **Lock de `expira_at`** se setea SOLO al crear, NO al actualizar. Solo el endpoint futuro de "Reactivar" (Sprint 7) lo podrá modificar.

---

## Hallazgos previos del codebase (que ajustaron el alcance)

- `requiereModoPersonal` ya existe en [apps/api/src/middleware/validarModo.ts:37](apps/api/src/middleware/validarModo.ts:37).
- El check `chat_conv_contexto_tipo_check` ya incluía `'marketplace'` históricamente; solo se agregó `'vendedor_marketplace'`.
- `notificaciones_tipo_check` ya tenía `'nuevo_marketplace'` y `referencia_tipo='marketplace'`.
- Entrada legado en `imageRegistry.ts` apuntaba a tabla `marketplace.imagenes` (schema antiguo) — reemplazada por `articulos_marketplace.fotos`.

---

## Bloque 1 — Migración SQL + cambios a tablas existentes ✅

**Archivo creado:** [docs/migraciones/2026-05-03-marketplace-base.sql](docs/migraciones/2026-05-03-marketplace-base.sql)

Contenido aplicado:

- `CREATE EXTENSION IF NOT EXISTS postgis;` (idempotente).
- `CREATE TABLE articulos_marketplace` con todos los campos de §10 del doc maestro:
  - `id, usuario_id (FK CASCADE)`
  - `titulo (80), descripcion TEXT, precio NUMERIC(10,2)`
  - `condicion (CHECK 4 valores), acepta_ofertas`
  - `fotos JSONB, foto_portada_index`
  - `ubicacion GEOGRAPHY(POINT,4326)` (privada, NUNCA pública)
  - `ubicacion_aproximada GEOGRAPHY(POINT,4326)` (aleatorizada 500m, ESTA es pública)
  - `ciudad, zona_aproximada`
  - `estado (CHECK 4 valores: activa/pausada/vendida/eliminada)`
  - `total_vistas, total_mensajes, total_guardados`
  - `expira_at, created_at, updated_at, vendida_at, deleted_at`
- 7 índices: `estado`, `ciudad`, `usuario`, `created DESC`, `expira_at`, `GIST(ubicacion_aproximada)`, `GIN to_tsvector('spanish', titulo || ' ' || descripcion)`.
- `ALTER TABLE chat_conversaciones ADD COLUMN articulo_marketplace_id UUID REFERENCES articulos_marketplace(id) ON DELETE SET NULL` + índice parcial.
- Recreación de los 3 checks: `chat_conv_contexto_tipo_check` (+ `'vendedor_marketplace'`), `guardados_entity_type_check` (+ `'articulo_marketplace'`), `notificaciones_tipo_check` (+ 3 tipos nuevos).
- 5 queries de verificación al final del archivo (comentadas).

**Verificación en BD (pgAdmin local + Supabase):**

| Check | Resultado |
|---|---|
| Tabla `articulos_marketplace` existe | `count=1` ✅ |
| Columna `articulo_marketplace_id` en chat | existe ✅ |
| `chat_conv_contexto_tipo_check` | incluye `'vendedor_marketplace'` ✅ |
| `guardados_entity_type_check` | incluye `'articulo_marketplace'` ✅ |
| `notificaciones_tipo_check` | incluye los 3 tipos nuevos del MarketPlace ✅ |

Migración corrida en ambas BDs con `Query returned successfully`. Los `NOTICE: ... already exists, skipping` confirmaron idempotencia (parte se había corrido en una pasada anterior).

---

## Bloque 2 — Schema Drizzle + imageRegistry ✅

**Archivo modificado:** [apps/api/src/db/schemas/schema.ts](apps/api/src/db/schemas/schema.ts)

Cambios:

- `chatConversaciones`:
  - Nueva columna `articuloMarketplaceId: uuid("articulo_marketplace_id").references((): AnyPgColumn => articulosMarketplace.id, { onDelete: 'set null' })` — FK perezosa (mismo patrón que `usuarios.referidoPor`) para evitar dependencia circular con la tabla nueva declarada al final.
  - Nuevo índice parcial `idx_chat_conv_articulo_marketplace`.
  - Check `contexto_tipo` ampliado con `'vendedor_marketplace'`.
- `guardados`: check `entity_type` ampliado con `'articulo_marketplace'`.
- `notificaciones`: check `tipo` ampliado con los 3 tipos nuevos.
- Tabla nueva `articulosMarketplace` al final del archivo.

**Decisión técnica:** `ubicacion` y `ubicacion_aproximada` se declararon como `text()` en Drizzle porque no existe tipo nativo `geography`. Los services las manipulan con SQL crudo (`ST_MakePoint`, `ST_Distance`, `ST_Y`, `ST_X`, operador `<->`). Los índices GIST y GIN viven solo en SQL — Drizzle no soporta declarar GIST sobre columnas custom geography ni GIN sobre `to_tsvector()`.

**Archivo modificado:** [apps/api/src/utils/imageRegistry.ts:113](apps/api/src/utils/imageRegistry.ts:113)

Entrada legacy `marketplace.imagenes` (schema antiguo) reemplazada por:
```ts
{ tabla: 'articulos_marketplace', columna: 'fotos', tipo: 'text-scan-urls', descripcion: 'Fotos del artículo de MarketPlace (JSONB array de URLs)' }
```

**Verificación:** `npx tsc --noEmit` en `apps/api` exit=0.

---

## Bloque 3 — Validaciones Zod ✅

**Archivo creado:** [apps/api/src/validations/marketplace.schema.ts](apps/api/src/validations/marketplace.schema.ts)

6 schemas exportados:

| Schema | Endpoint | Notas |
|---|---|---|
| `crearArticuloSchema` | POST `/articulos` | Refine: `fotoPortadaIndex < fotos.length` |
| `actualizarArticuloSchema` | PUT `/articulos/:id` | Todos opcionales. **NO** acepta `expira_at` ni `estado`. Refines de coherencia para portada y para enviar `lat+lng` juntos |
| `cambiarEstadoSchema` | PATCH `/articulos/:id/estado` | Enum `activa | pausada | vendida` (`eliminada` solo por DELETE) |
| `feedQuerySchema` | GET `/feed` | `z.coerce.number()` para `lat`/`lng` (vienen como string) |
| `misArticulosQuerySchema` | GET `/mis-articulos` | Paginación `limit`/`offset`, filtro opcional por `estado` |
| `uploadImagenSchema` | POST `/upload-imagen` | Tipos `image/jpeg | image/png | image/webp` |

Helper `formatearErroresZod` reusable.

**Lock de `expira_at` — capa 1 (Zod):** `actualizarArticuloSchema` no incluye el campo. Cualquier intento de mandarlo se rechaza implícitamente (no se transfiere al service).

---

## Bloque 4 — Service + helpers + test unitario ✅

**Archivo creado:** [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts)

11 funciones exportadas:

**Helpers:**
- `aleatorizarCoordenada(lat, lng): { lat, lng }` — distribución uniforme en disco usando `r = R · √random()`. Compensación por longitud según latitud (`cos(lat)`).
- `eliminarFotoMarketplaceSiHuerfana(url, excluirArticuloId?)` — verifica que ningún otro artículo del MarketPlace siga referenciando la URL antes de borrarla de R2. Best-effort (no re-lanza errores; el reconcile global atrapa lo que se escape).

**CRUD:**
- `crearArticulo(usuarioId, datos)` — INSERT con `expira_at = NOW() + INTERVAL '30 days'`, `ubicacion = ST_MakePoint(lng, lat)::geography`, `ubicacion_aproximada` calculada con `aleatorizarCoordenada`.
- `obtenerArticuloPorId(articuloId)` — SELECT con JOIN a `usuarios` (vendedor: nombre, apellidos, avatar, ciudad). Devuelve `vendida` y `pausada` para que los links compartidos funcionen con badge en el FE. NO devuelve `ubicacion` exacta.
- `obtenerFeed(ciudad, lat, lng)` — `{ recientes, cercanos }`. Recientes ordenado por `created_at DESC`. Cercanos usa operador KNN `<->` (aprovecha índice GIST). Devuelve `distanciaMetros` calculada con `ST_Distance`.
- `obtenerMisArticulos(usuarioId, { estado?, limit, offset })` — paginado con conteo total. Excluye eliminados.
- `actualizarArticulo(articuloId, usuarioId, datos)` — verifica dueño, bloquea edición si `estado='vendida'`, construye `SET` dinámico (jamás incluye `expira_at`), recalcula `ubicacion_aproximada` si se actualiza ubicación, calcula diff de fotos y dispara limpieza huérfanas fire-and-forget.
- `cambiarEstado(articuloId, usuarioId, nuevoEstado)` — usa matriz constante `TRANSICIONES_VALIDAS` (no `if/else`). Si pasa a `vendida`, setea `vendida_at = NOW()`.
- `eliminarArticulo(articuloId, usuarioId)` — soft delete (`estado='eliminada'`, `deleted_at=NOW()`). Las fotos quedan en R2 hasta el reconcile global.
- `registrarVista(articuloId)` — `UPDATE total_vistas + 1`. Sin auth requerida.

**R2:**
- `generarUrlUploadImagenMarketplace(nombreArchivo, contentType)` — presigned URL con prefijo `marketplace/`, válida 5 min, tipos `jpeg/png/webp`.

**Lock de `expira_at` — capa 2 (Service):** el `UPDATE` dinámico de `actualizarArticulo` jamás incluye `expira_at` en su `SET` clause, ni siquiera por error de tipeo. Doble defensa con Zod.

**Decisiones técnicas notables:**
- PostGIS usa `(lng, lat)` en `ST_MakePoint` — el orden importa.
- En SELECT, `ST_Y(ubicacion_aproximada::geometry)` es lat y `ST_X(...)` es lng.
- `<->` es el operador KNN GiST (k-nearest-neighbor) — usado en `cercanos` para aprovechar el índice GIST.
- Las transiciones de estado son matriz constante `TRANSICIONES_VALIDAS: Record<string, Set<string>>`.
- Limpieza de fotos huérfanas es fire-and-forget (no bloquea la respuesta del UPDATE).

**Archivo creado:** [apps/api/src/__tests__/marketplace-aleatorizar.test.ts](apps/api/src/__tests__/marketplace-aleatorizar.test.ts)

4 tests, 4/4 pasan:

1. **100 puntos dentro del círculo de 500m** (haversine vs radio + tolerancia 1m por punto flotante) — propiedad crítica de privacidad.
2. **Variabilidad** — no devuelve siempre la misma coordenada.
3. **Sanity check de dispersión** — al menos uno de 100 cae >100m del centro.
4. **Funciona en distintas latitudes** — ecuador (0°), México (19°), polos (60°, -45°).

```
Test Files  1 passed (1)
     Tests  4 passed (4)
  Duration  3.44s
```

---

## Bloque 5 — Controller `marketplace.controller.ts` ✅

**Archivo creado:** [apps/api/src/controllers/marketplace.controller.ts](apps/api/src/controllers/marketplace.controller.ts)

Sigue el patrón de `articulos.controller.ts`:
- Validación de UUID con regex (constante `UUID_REGEX` reusada en todos los handlers).
- Parseo Zod → si falla devuelve 400 con `formatearErroresZod`.
- Llama al service y devuelve `{ success, data }`.
- Captura genérica con log + 500.
- Helper interno `obtenerUsuarioId(req): string | null` para extraer `req.usuario.usuarioId`.

9 funciones exportadas:
- **Públicas:** `getFeed`, `getArticulo`, `postRegistrarVista`
- **Privadas:** `postCrearArticulo`, `putActualizarArticulo`, `patchCambiarEstado`, `deleteArticulo`, `getMisArticulos`, `postUploadImagen`

**Patrón de mapeo de errores del service:** cuando el service devuelve `{ success: false, code: 4xx }`, el controller pasa ese código a `res.status()`. Si no hay `code` explícito (error inesperado del catch), responde 500.

---

## Bloque 6 — Routes + montaje en `routes/index.ts` ✅

**Archivo creado:** [apps/api/src/routes/marketplace.routes.ts](apps/api/src/routes/marketplace.routes.ts)

```
PÚBLICAS (verificarTokenOpcional)
GET    /api/marketplace/feed
GET    /api/marketplace/articulos/:id
POST   /api/marketplace/articulos/:id/vista

PRIVADAS (verificarToken + requiereModoPersonal)
POST   /api/marketplace/upload-imagen      ← antes de las paramétricas
GET    /api/marketplace/mis-articulos      ← antes de las paramétricas
POST   /api/marketplace/articulos
PUT    /api/marketplace/articulos/:id
PATCH  /api/marketplace/articulos/:id/estado
DELETE /api/marketplace/articulos/:id
```

**Archivo modificado:** [apps/api/src/routes/index.ts](apps/api/src/routes/index.ts)
- Import: `import marketplaceRoutes from './marketplace.routes';`
- Montaje: `router.use('/marketplace', marketplaceRoutes);` (reemplazó el comentario placeholder de la línea 131).

NO entran en este sprint: `/buscar/*`, `/vendedor/:id`, `/marcar-vendida`, `/confirmar-compra` (Sprints 5, 6, 8).

---

## Bloque 7 — Pruebas manuales (curl) ✅

**Setup:** se creó el script auxiliar [apps/api/scripts/marketplace-test-tokens.ts](apps/api/scripts/marketplace-test-tokens.ts) que crea 2 usuarios de prueba (UUIDs fijos `a0...001` y `a0...002`) e imprime 3 JWT (`TOKEN_PERSONAL`, `TOKEN_COMERCIAL`, `TOKEN_PERSONAL_OTRO`) listos para `export` en bash.

**Resultados — 10/10 ✅**

| # | Caso | HTTP | Verdict |
|---|---|---|---|
| 1 | Crear artículo (modo Personal) | `201` | ✅ — `id` capturado, `ubicacionAproximada` distinta a la original |
| 2 | Crear desde modo Comercial | `403` | ✅ — `codigo: REQUIERE_MODO_PERSONAL` |
| 3 | Detalle público sin token | `200` | ✅ — incluye `vendedor`, **no** filtra `ubicacion` exacta |
| 4 | Feed `{recientes, cercanos}` | `200` | ✅ — devuelve estructura correcta |
| 5 | Pausar (dueño) | `200` | ✅ — `estado: pausada` |
| 6 | NO-dueño cambia estado | `403` | ✅ — `"No tienes permiso para cambiar el estado de este artículo"` |
| 7 | Marcar vendida | `200` | ✅ — `vendidaAt: "2026-05-03 22:27:57..."` (no null) |
| 8 | DELETE soft + GET releer | `200` + `404` | ✅ — soft delete funciona |
| 9 | Upload imagen R2 | `200` | ✅ — `publicUrl: ".../marketplace/1777847279243-f0de3cff.jpg"` |
| 10 | Lock de `expira_at` | `200` | ✅ — `expiraAt` NO cambió, `precio` SÍ cambió a `3500.00` |

**Verificaciones específicas que pasaron:**

- **Privacidad de ubicación (Caso 1+3):** Original `19.0522, -104.3158` → aproximada `19.0556, -104.3132` (~430m de offset, dentro del círculo de 500m). El detalle público NUNCA devuelve `ubicacion` real.
- **TTL de 30 días (Caso 1):** `createdAt: 2026-05-03 22:27:55` → `expiraAt: 2026-06-02 22:27:55` (exactamente +30 días).
- **Lock `expira_at` (Caso 10):** `expiraAt` antes y después del PUT son idénticos al microsegundo (`2026-06-02 22:27:59.603894+00`). El intento de `"expiraAt": "2099-01-01..."` se descartó silenciosamente por Zod, mientras que `precio` sí cambió. **Doble defensa funciona.**
- **Prefijo R2 (Caso 9):** `publicUrl` empieza con `.../marketplace/...` — la separación de carpetas en R2 está correcta.

**Datos de prueba que quedaron en la BD:**
- 2 usuarios test (`a0...001`, `a0...002`) — útiles para sprints siguientes, NO se borran.
- 2 artículos en `articulos_marketplace`:
  - `b2359ac7-9775-4981-bd81-ebac8d6b2c80` (soft-deleted, `estado='eliminada'`)
  - `2288d921-34dc-4737-8112-6bcde34ec346` (vivo, precio $3500)
- 1 entrada conceptual en R2 (`marketplace/1777847279243-f0de3cff.jpg`) — solo se generó la presigned URL, no se subió contenido. El objeto no existe.

SQL de limpieza opcional al cierre:
```sql
DELETE FROM articulos_marketplace
WHERE id IN ('b2359ac7-9775-4981-bd81-ebac8d6b2c80', '2288d921-34dc-4737-8112-6bcde34ec346');
```

**Nota técnica menor:** el display en consola Windows muestra `pi��n` y `Centro �` por encoding cp1252 vs UTF-8. En la BD se guardó correctamente `piñón` y `Centro ·` — solo problema visual del shell, no afecta nada.

---

## Archivos creados/modificados — Inventario final

**Nuevos (7):**
- [docs/migraciones/2026-05-03-marketplace-base.sql](docs/migraciones/2026-05-03-marketplace-base.sql)
- [apps/api/src/validations/marketplace.schema.ts](apps/api/src/validations/marketplace.schema.ts)
- [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts)
- [apps/api/src/controllers/marketplace.controller.ts](apps/api/src/controllers/marketplace.controller.ts)
- [apps/api/src/routes/marketplace.routes.ts](apps/api/src/routes/marketplace.routes.ts)
- [apps/api/src/__tests__/marketplace-aleatorizar.test.ts](apps/api/src/__tests__/marketplace-aleatorizar.test.ts)
- [apps/api/scripts/marketplace-test-tokens.ts](apps/api/scripts/marketplace-test-tokens.ts) — script auxiliar para generar JWT de prueba

**Modificados (3):**
- [apps/api/src/db/schemas/schema.ts](apps/api/src/db/schemas/schema.ts) — nueva tabla `articulosMarketplace` + 1 columna en `chatConversaciones` + 3 checks ampliados
- [apps/api/src/utils/imageRegistry.ts](apps/api/src/utils/imageRegistry.ts) — entrada legado reemplazada
- [apps/api/src/routes/index.ts](apps/api/src/routes/index.ts) — montaje de `/api/marketplace`

---

## Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| Migración SQL aplicada en pgAdmin local | ✅ Idempotente, sin errores |
| Migración SQL aplicada en Supabase | ✅ Idempotente, sin errores |
| 5 checks de constraints en BD (ambas BDs) | ✅ 5/5 |
| `npx tsc --noEmit` en `apps/api` (post-Bloque 2) | ✅ exit=0 |
| `npx tsc --noEmit` en `apps/api` (post-Bloque 4) | ✅ exit=0 |
| `npx tsc --noEmit` en `apps/api` (post-Bloque 6) | ✅ exit=0 |
| `npx vitest run marketplace-aleatorizar` | ✅ 4/4 tests passed |
| 10 casos de prueba E2E con API en local + Supabase | ✅ 10/10 |

---

## Mensaje de commit propuesto

```
feat(marketplace): backend base v1 — tabla, service, controller, routes y test de privacidad

Sprint 1/8 del módulo MarketPlace (compra-venta P2P de objetos físicos entre
usuarios en modo Personal, transacción 100% offline).

Cambios:
- Migración SQL: nueva tabla articulos_marketplace con PostGIS (ubicacion +
  ubicacion_aproximada), 7 índices (incluye GIST para cercanos y GIN FTS).
- chat_conversaciones: nueva columna articulo_marketplace_id + check
  contexto_tipo ampliado con 'vendedor_marketplace'.
- guardados: check entity_type ampliado con 'articulo_marketplace'.
- notificaciones: 3 nuevos tipos (marketplace_nuevo_mensaje,
  marketplace_proxima_expirar, marketplace_expirada).
- Service: 8 funciones CRUD + 2 helpers (aleatorizarCoordenada con
  distribución uniforme en disco r=R·√rand, eliminarFotoMarketplaceSiHuerfana).
- Validaciones Zod: 6 schemas (crear, actualizar, cambiarEstado, feedQuery,
  misArticulosQuery, uploadImagen).
- Controller + Routes: 9 endpoints (3 públicos con verificarTokenOpcional, 6
  privados con verificarToken + requiereModoPersonal).
- imageRegistry actualizado: articulos_marketplace.fotos reemplaza la entrada
  legado del schema antiguo.
- Test unitario para aleatorizarCoordenada: 100 puntos verificados dentro del
  círculo de 500m + variabilidad + funcionamiento en distintas latitudes.

Doble defensa para expira_at (no se modifica al actualizar): Zod no acepta el
campo + service nunca lo escribe en el SET dinámico. Verificado en E2E.

Verificación: tsc limpio, 4/4 tests vitest, 10/10 casos curl con API en local
+ Supabase.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-1-Backend-Base.md
Reporte: docs/reportes/2026-05-03-plan-sprint-1-marketplace-backend-base.md
```

---

## Lo que sigue (Sprints 2–8)

| Sprint | Alcance |
|---|---|
| 2 | Feed (FE) — `PaginaMarketplace.tsx`, `CardArticulo.tsx`, hook `useMarketplaceFeed` |
| 3 | Detalle del artículo (FE) — `PaginaArticuloMarketplace.tsx`, integración con ChatYA |
| 4 | Wizard de Publicar (FE) + filtros de moderación (palabras prohibidas) |
| 5 | Perfil del vendedor — endpoint + página |
| 6 | Buscador potenciado — sugerencias, populares, resultados con filtros |
| 7 | Cron jobs (auto-pausa por TTL) + sistema de compartir + tab "Artículos" en Mis Guardados |
| 8 | Sistema de niveles del vendedor (Nivel 0–4 con cron diario) |
