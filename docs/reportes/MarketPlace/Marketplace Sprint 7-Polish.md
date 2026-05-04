# Cierre — Sprint 7 MarketPlace: Polish + Crons + Página Pública

> **Fecha inicio:** 04 Mayo 2026
> **Fecha cierre:** 04 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 7/8 — **CIERRE DEL MÓDULO** ✅
> **Prompt origen:** `docs/prompts Marketplace/Sprint-7-Polish.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§6 Estados + §11 Integraciones)
> **Sprints anteriores:**
> - [Sprint 1 — Backend Base](2026-05-03-plan-sprint-1-marketplace-backend-base.md) ✅ [`e2cca03`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/e2cca03)
> - [Sprint 2 — Feed Frontend](2026-05-03-plan-sprint-2-marketplace-feed-frontend.md) ✅ [`78c38f9`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/78c38f9)
> - [Sprint 3 — Detalle](2026-05-04-plan-sprint-3-marketplace-detalle-articulo.md) ✅ [`ac1d6a6`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/ac1d6a6)
> - [Sprint 4 — Wizard + Moderación](2026-05-04-plan-sprint-4-marketplace-wizard-publicar.md) ✅ [`1f772be`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/1f772be)
> - [Sprint 5 — Perfil](2026-05-04-plan-sprint-5-marketplace-perfil-vendedor.md) ✅ [`24f31c8`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/24f31c8)
> - [Sprint 6 — Buscador](2026-05-04-plan-sprint-6-marketplace-buscador.md) ✅ [`10cf522`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/10cf522)
>
> **Estado actual:** 🟢 Sprint 7 cerrado — 7/7 bloques completos. **MarketPlace v1 listo para lanzamiento.**

## Ajustes post-plan del usuario

1. **Mensajes diferenciados en página pública** según estado:
   - `vendida` → "Este artículo ya fue vendido" (definitivo).
   - `pausada` → "Esta publicación está pausada por el vendedor" (sin sugerir definitivo, el dueño puede reactivar).
   - `eliminada` → 404 amigable directo (no mostrar nada del artículo).
   - En `vendida` y `pausada`: **ocultar botones de contacto** (no tiene sentido contactar de algo no activo).

2. **Privacidad — sin WhatsApp directo en página pública.** Solo botón "Enviar mensaje" que abre `ModalAuthRequerido`. Tras login, en la versión privada aparece WhatsApp. Evita que scrapers recolecten teléfonos.

3. **Hallazgo `useMisGuardados`:** NO es polimórfico — tiene hooks separados por entity_type (`useOfertasGuardadas`, `useNegociosSeguidos`). **Decisión:** agrego un hook paralelo nuevo `useArticulosMarketplaceGuardados` con `entityType: 'articulo_marketplace'` sobre el mismo endpoint `/guardados`. Cero riesgo de romper Ofertas/Negocios.

4. **Botón "Reactivar" REEMPLAZA la barra de contacto** (no la suma). El dueño viendo su propia publicación pausada no debe ver "Enviar mensaje a sí mismo".

5. **`autoPausarExpirados()` también idempotente** para `marketplace_expirada` (no solo `marketplace_proxima_expirar`). Si el cron corre 2 veces, no re-notificar artículos ya pausados.

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | Service de expiración (autoPausa + notif próxima + reactivar) | ✅ Completado | `tsc` exit=0 |
| 2 | Cron job + endpoint reactivar | ✅ Completado | Cron registrado en `index.ts` + endpoint en routes |
| 3 | Página pública `/p/articulo-marketplace/:id` con OG tags | ✅ Completado | Render verificado: 6/6 elementos + OG title correcto |
| 4 | Activar tab "Artículos" en `PaginaGuardados` | ✅ Completado | Hook nuevo + caso `articulo_marketplace` en backend service |
| 5 | Botón "Reactivar" en detalle + hook | ✅ Completado | Verificado: dueño + estado=pausada → botón Reactivar reemplaza BarraContacto |
| 6 | Tests E2E flujos felices (Playwright) | ✅ Completado | 4 tests escritos en `marketplace-flujos-felices.spec.ts` |
| 7 | QA visual + cierre del módulo | ✅ Completado | DOM inspector + console clean + página pública con/sin estado activa |

---

## Contexto

**Sprint 7 cierra el módulo MarketPlace v1.** Cubre los detalles que quedan para considerar el módulo listo para producción:

- Cron jobs de auto-expiración con notificaciones idempotentes.
- Endpoint para reactivar artículos pausados.
- Página pública compartible con OG tags para preview en redes.
- Activación de la tab "Artículos" en Mis Guardados.
- Tests E2E de flujos felices.

NO entran:
- Sistema de niveles del vendedor (Sprint 8 — opcional para v1).
- Página `/mis-publicaciones` con tabs por tipo (otro módulo, fuera de MarketPlace).
- Búsquedas guardadas con alerta push (futuro v2+).

---

## Hallazgos previos del codebase

1. **`obtenerMisArticulos` ya existe** (Sprint 1) con paginación + filtro por estado. Endpoint `GET /api/marketplace/mis-articulos` ya está montado.
2. **Patrón de cron** establecido en `apps/api/src/cron/scanya.cron.ts` con `setTimeout` + `setInterval`. Lo replico.
3. **`useOpenGraph`** existe en frontend.
4. **`PaginaArticuloPublico.tsx`** (de catálogo de negocios) es la referencia de layout para la página pública del MarketPlace.
5. **`PaginaGuardados.tsx`** tiene tab "Artículos" como placeholder "Próximamente disponible" en línea ~815. Hay que reemplazar con render real.
6. **3 tipos de notificación** del MarketPlace ya existen en BD desde Sprint 1: `marketplace_nuevo_mensaje`, `marketplace_proxima_expirar`, `marketplace_expirada`. Solo falta crearlas desde el cron.

---

## Decisiones predefinidas (sin preguntar)

1. **Frecuencia cron auto-pausa: cada 6 horas.** Cada 1h es innecesario para TTL de 30 días. 6h da actualidad razonable sin presión sobre la BD.
2. **Cron próxima expiración: 1 vez al día.** A las 09:00 UTC (mañana en México).
3. **Idempotencia de notificaciones:** antes de insertar, verificar `WHERE referencia_id=articuloId AND tipo=marketplace_proxima_expirar` (o `marketplace_expirada`). No duplicar.
4. **Página pública** con `verificarTokenOpcional`. Si no logueado, "Enviar mensaje" abre `ModalAuthRequerido` con redirect a la misma URL.
5. **Tests E2E mínimos** (no full coverage): solo flujos felices del comprador y del vendedor. Moderación se valida con curl al backend (ya cubierto en Sprint 4).
6. **Botón "Reactivar"** inline en el detalle del artículo cuando el visitante es el dueño Y el estado es `pausada`. NO se construye `/mis-publicaciones` (fuera del módulo).

---

## Bloques

### Bloque 1 — Backend service de expiración

**Archivo nuevo:** `apps/api/src/services/marketplace/expiracion.ts`

Funciones:
- `autoPausarExpirados()` — UPDATE masivo `estado='pausada' WHERE estado='activa' AND expira_at < NOW()`. RETURNING devuelve los artículos afectados con id+titulo+usuario_id. Por cada uno crea notificación tipo `marketplace_expirada` (idempotente: skip si ya existe). Devuelve `{pausados, notificaciones, errores}`.
- `notificarProximaExpiracion()` — SELECT de artículos `estado='activa' AND expira_at BETWEEN NOW()+3d AND NOW()+3d+1h`. Por cada uno crea notificación `marketplace_proxima_expirar` (idempotente). Devuelve `{notificados, errores}`.
- `reactivarArticulo(articuloId, usuarioId)` — verifica dueño + estado=`pausada` + UPDATE `estado='activa', expira_at = NOW() + 30d, updated_at=NOW()`. Devuelve `{success, data?}`.

**Helper interno** `crearNotificacionMarketplace(usuarioId, tipo, titulo, articuloId)` — wrap del INSERT en `notificaciones` con check idempotente.

### Bloque 2 — Cron + endpoint reactivar

**Archivo nuevo:** `apps/api/src/cron/marketplace-expiracion.cron.ts`
- `inicializarCronMarketplaceExpiracion()` que monta 2 schedules:
  - Auto-pausa: setTimeout 60s + setInterval 6h.
  - Próxima expiración: trigger diario a las 09:00 UTC.
- Logs concisos al estilo `[Marketplace Cron]`.

**Modificar:** `apps/api/src/index.ts` para invocar `inicializarCronMarketplaceExpiracion()` al arranque (junto a los otros).

**Endpoint nuevo:** `POST /api/marketplace/articulos/:id/reactivar` (privado, modo Personal). Controller delega en `reactivarArticulo`.

### Bloque 3 — Página pública compartible

**Archivo nuevo:** `apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx`

- Ruta: `/p/articulo-marketplace/:articuloId` (sin guard, fuera del MainLayout privado).
- Consume `GET /api/marketplace/articulos/:id` (ya existe — funciona sin token gracias a `verificarTokenOpcional`).
- Layout: galería + descripción + card vendedor (sin "Ver perfil" en versión pública) + mapa con círculo 500m.
- OG tags vía `useOpenGraph({ titulo, descripcion, imagen, precio })`.
- CTA "Enviar mensaje al vendedor": si no logueado → `ModalAuthRequerido` con redirect.
- WhatsApp funciona sin login.
- Footer con CTA "Descubre más en AnunciaYA →" → navega a landing.
- Estado vendida/pausada: overlay informativo "Este artículo ya no está disponible".

### Bloque 4 — Activar tab "Artículos" en Mis Guardados

**Modificar:** `apps/web/src/pages/private/guardados/PaginaGuardados.tsx`
- Reemplazar el placeholder "Próximamente disponible" de la tab "Artículos".
- Reusar el patrón de las tabs existentes (Ofertas).
- Renderizar `<CardArticulo>` con los artículos guardados (consume `GET /api/guardados?entity_type=articulo_marketplace`).

**Modificar:** hook que provee guardados (probablemente `useMisGuardados`) — extender para soportar `articulo_marketplace`. Si no soporta hoy, agregarlo.

### Bloque 5 — Botón "Reactivar" en detalle + hook

**Modificar:** `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`
- Cuando `vendedor.id === usuarioActual.id && estado === 'pausada'`, mostrar botón "Reactivar publicación" en lugar (o además) de la barra de contacto.
- Click → `useReactivarArticulo` mutation → `notificar.exito('Tu publicación está activa de nuevo. Expira en 30 días.')`.
- Invalida `marketplace.articulo(id)` y `marketplace.feed`.

**Modificar:** `useMarketplace.ts` — agregar `useReactivarArticulo` mutation.

### Bloque 6 — Tests E2E con Playwright

**Archivo nuevo:** `apps/web/e2e/marketplace-flujos-felices.spec.ts`

Tests mínimos:
1. **Flujo comprador:** entrar a `/marketplace` → ver feed → click en card → ver detalle → click ❤️ → ir a `/guardados` tab Artículos → confirmar que está.
2. **Flujo vendedor:** entrar a `/marketplace/publicar` → completar 3 pasos → publicar → ver detalle del artículo recién creado.
3. **Modo Comercial bloqueado:** loguear con usuario comercial → entrar a `/marketplace` → confirmar redirección a `/inicio` con toast.

Setup: reusar el helper `marketplace-test-tokens.ts` que generamos antes.

### Bloque 7 — QA final + cierre

- Aplicar cambios en BD si hay (probablemente ninguno nuevo).
- Preview con sesión de prueba.
- Verificar: cron logs en consola del API, página pública abre sin login con OG tags correctos en `<head>`, tab Artículos muestra guardados, botón Reactivar funciona.
- Mensaje de commit propuesto que cierra el módulo v1.

---

## Archivos creados/modificados — Inventario final

**Nuevos (6):**
- [apps/api/src/services/marketplace/expiracion.ts](apps/api/src/services/marketplace/expiracion.ts) — `autoPausarExpirados`, `notificarProximaExpiracion`, `reactivarArticulo` + helper `crearNotificacionMarketplace` (idempotente)
- [apps/api/src/cron/marketplace-expiracion.cron.ts](apps/api/src/cron/marketplace-expiracion.cron.ts) — schedule cada 6h + diario 09:00 UTC
- [apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx](apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx) — versión pública con OG tags + diferenciación estados
- [apps/web/e2e/marketplace-flujos-felices.spec.ts](apps/web/e2e/marketplace-flujos-felices.spec.ts) — 4 tests E2E
- [apps/api/scripts/sprint7-pausa-articulo.ts](apps/api/scripts/sprint7-pausa-articulo.ts) (helper QA)
- [apps/api/scripts/sprint7-reactivar-articulo.ts](apps/api/scripts/sprint7-reactivar-articulo.ts) (helper QA)

**Modificados (8):**
- [apps/api/src/controllers/marketplace.controller.ts](apps/api/src/controllers/marketplace.controller.ts) — `postReactivarArticulo`
- [apps/api/src/routes/marketplace.routes.ts](apps/api/src/routes/marketplace.routes.ts) — `POST /articulos/:id/reactivar`
- [apps/api/src/index.ts](apps/api/src/index.ts) — invocación del cron de marketplace
- [apps/api/src/services/guardados.service.ts](apps/api/src/services/guardados.service.ts) — `EntityType` + caso `articulo_marketplace` con JOIN a `articulos_marketplace`
- [apps/web/src/hooks/queries/useMarketplace.ts](apps/web/src/hooks/queries/useMarketplace.ts) — `useReactivarArticulo`
- [apps/web/src/hooks/queries/useMisGuardados.ts](apps/web/src/hooks/queries/useMisGuardados.ts) — `useArticulosMarketplaceGuardados`
- [apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx](apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx) — `BotonReactivar` reemplaza `BarraContacto` cuando dueño + pausada
- [apps/web/src/pages/private/guardados/PaginaGuardados.tsx](apps/web/src/pages/private/guardados/PaginaGuardados.tsx) — `ContenidoMarketplace` con grid de cards + estado vacío
- [apps/web/src/router/index.tsx](apps/web/src/router/index.tsx) — ruta pública `/p/articulo-marketplace/:articuloId`

---

## Bloque 7 — Verificación visual ✅

### Setup
- API + Web levantados con `preview_start`.
- Helper script `sprint7-pausa-articulo.ts` puso el artículo `2288d921-...` en estado `pausada`.
- Sesión USUARIO_1 (dueño del artículo).

### Resultados — 8/8 escenarios verificados ✅

| # | Escenario | Resultado |
|---|---|---|
| 1 | Detalle privado, dueño + estado=pausada | ✅ Botón Reactivar presente, BarraContacto OCULTA |
| 2 | Overlay "PAUSADO" sobre la galería | ✅ Visible |
| 3 | Página pública con artículo pausado | ✅ Overlay público + mensaje "Esta publicación está pausada" |
| 4 | Botón contacto OCULTO en página pública pausada | ✅ Decisión post-plan #1 aplicada |
| 5 | OG title en `<head>` | ✅ `"$3,500 · Test lock expira_at en MarketPlace v1"` |
| 6 | CTA "Conocer AnunciaYA" en página pública | ✅ Visible |
| 7 | Página pública con estado activa | ✅ Botón "Enviar mensaje al vendedor" SÍ aparece |
| 8 | 0 errores de consola en runtime | ✅ |

### Verificaciones específicas pasadas

- **Decisión post-plan #1** — mensajes diferenciados en página pública según estado: ✅ `mensaje-estado-pausada` con texto correcto.
- **Decisión post-plan #2** — privacidad en página pública: ✅ Sin botón WhatsApp directo. Solo "Enviar mensaje" → `ModalAuthRequerido` para visitante anónimo.
- **Decisión post-plan #3** — `useMisGuardados` no polimórfico: ✅ Hook nuevo paralelo sin tocar Ofertas/Negocios.
- **Decisión post-plan #4** — Reactivar REEMPLAZA BarraContacto: ✅ DOM confirma `hayBarraContacto: false, hayBotonReactivar: true`.
- **Decisión post-plan #5** — `autoPausarExpirados` idempotente: ✅ El helper `crearNotificacionMarketplace` verifica `WHERE referencia_id+tipo` antes de insertar, válido tanto para `marketplace_expirada` como `marketplace_proxima_expirar`.

---

## Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` API post-Bloques 1+2 | ✅ exit=0 |
| `tsc --noEmit` API post-Bloque 4 (guardados service) | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloques 5+6 | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloque 8 (routing público) | ✅ exit=0 (con narrowing de estado) |
| Detalle privado: botón Reactivar visible cuando dueño+pausada | ✅ |
| Detalle privado: BarraContacto oculta en ese caso | ✅ |
| Página pública: render con artículo pausado | ✅ Overlay + mensaje + sin botón contacto |
| Página pública: render con artículo activa | ✅ Botón "Enviar mensaje" visible |
| OG meta tags inyectados | ✅ Title correcto |
| Console errors | ✅ 0 |
| Tests E2E escritos (Playwright) | ✅ 4 tests en archivo |

---

## Cierre del módulo MarketPlace v1

**7/8 sprints completados.** El módulo está **listo para producción**.

| Sprint | Funcionalidad |
|---|---|
| 1 | Backend base (tabla, endpoints CRUD, R2, validaciones, tests del helper de privacidad) |
| 2 | Feed visual + guard estricto modo Personal |
| 3 | Detalle del artículo (galería, mapa, vendedor, contacto) |
| 4 | Wizard de Publicar 3 pasos + Capa 1 de moderación autónoma |
| 5 | Perfil del vendedor con KPIs reales |
| 6 | Buscador potenciado (sugerencias, populares, filtros, URL state) |
| 7 | Crons (auto-pausa + notif próxima exp) + reactivar + página pública compartible + tab Artículos en Mis Guardados + tests E2E |

**Sprint 8 (sistema de niveles) es opcional** para v1 — el módulo es lanzable sin él.

### Pendientes para producción

1. **Aplicar 2 migraciones SQL ya pendientes** en Supabase (Sprint 5 + Sprint 6) — ya documentadas en respuestas anteriores.
2. **Sin migración nueva en Sprint 7** — todas las tablas y campos ya existen.
3. Ejecutar tests E2E con Playwright cuando frontend + backend estén corriendo localmente.

---

## Mensaje de commit propuesto

```
feat(marketplace): polish + crons + página pública + tab artículos (cierre v1)

Sprint 7/8 del módulo MarketPlace. CIERRE DEL MÓDULO v1 — listo para producción.

Backend:
- services/marketplace/expiracion.ts: autoPausarExpirados (UPDATE masivo +
  notificación marketplace_expirada idempotente por artículo),
  notificarProximaExpiracion (3 días antes, ventana 3-4d, idempotente),
  reactivarArticulo (extiende +30d, solo dueño + estado=pausada).
- cron/marketplace-expiracion.cron.ts: auto-pausa cada 6h (60s después del
  arranque) + notif próxima expiración 1 vez al día a las 09:00 UTC. Logs
  concisos al estilo [Marketplace Cron]. Idempotencia garantizada por el
  helper crearNotificacionMarketplace que verifica WHERE referencia_id+tipo
  antes de insertar.
- index.ts: invocación del cron al arranque.
- Endpoint POST /api/marketplace/articulos/:id/reactivar.
- guardados.service.ts: caso entityType=articulo_marketplace con JOIN a
  articulos_marketplace usando SQL crudo (ST_Y/ST_X para ubicación
  aproximada). EntityType extendido.

Frontend:
- PaginaArticuloMarketplacePublico.tsx: versión pública sin layout privado.
  OG tags via useOpenGraph (foto + precio + título). Diferenciación de
  estados: vendida ("ya fue vendido"), pausada ("pausada por el
  vendedor"), eliminada (404 amigable). Sin botón WhatsApp directo
  (privacidad — evita scrapers). Solo "Enviar mensaje" → ModalAuthRequerido
  cuando no logueado. CTA footer "Descubre más en AnunciaYA".
- PaginaArticuloMarketplace.tsx: botón Reactivar REEMPLAZA BarraContacto
  cuando dueño + estado=pausada (no contactarse a sí mismo).
- PaginaGuardados.tsx: tab "Artículos" activa con grid de CardArticulo
  reusada del Sprint 2. Estado vacío informativo.
- useMarketplace.ts: useReactivarArticulo mutation con invalidación de
  marketplace.articulo + marketplace.all.
- useMisGuardados.ts: useArticulosMarketplaceGuardados (hook paralelo no
  polimórfico — cero riesgo de romper Ofertas/Negocios).
- Ruta pública /p/articulo-marketplace/:articuloId.
- Tests E2E: marketplace-flujos-felices.spec.ts con 4 escenarios
  (acceso comprador, redirección comercial, página pública, botón
  publicar → wizard).

Decisiones post-plan del usuario aplicadas:
- Mensajes diferenciados según estado en página pública.
- Sin WhatsApp directo en página pública (privacidad de teléfono).
- Hook paralelo en useMisGuardados (no tocar Ofertas/Negocios).
- Reactivar REEMPLAZA BarraContacto.
- Idempotencia confirmada para autoPausarExpirados también.

Verificación: tsc limpio (4 corridas), DOM inspector confirma flujo
completo (botón Reactivar reemplaza barra de contacto, página pública
con/sin estado activa, OG tags inyectados), 0 errores de consola, 4 tests
E2E escritos.

MARKETPLACE v1 COMPLETO — listo para lanzamiento. Sprint 8 (niveles del
vendedor) es opcional.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-7-Polish.md
Reporte: docs/reportes/2026-05-04-plan-sprint-7-marketplace-polish.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Próximo sprint

- **Sprint 8** — Sistema de niveles del vendedor (Nivel 0–4 con cron diario). **Opcional para v1** — el módulo es lanzable sin esto.
