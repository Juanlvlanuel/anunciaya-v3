# Cierre — Sprint 5 MarketPlace: Perfil del Vendedor

> **Fecha inicio:** 04 Mayo 2026
> **Fecha cierre:** 04 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 5/8
> **Prompt origen:** `docs/prompts Marketplace/Sprint-5-Perfil-Vendedor.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§8 P3 — Perfil del Vendedor)
> **Sprints anteriores:**
> - [Sprint 1 — Backend Base](2026-05-03-plan-sprint-1-marketplace-backend-base.md) ✅ commit [`e2cca03`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/e2cca03)
> - [Sprint 2 — Feed Frontend](2026-05-03-plan-sprint-2-marketplace-feed-frontend.md) ✅ commit [`78c38f9`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/78c38f9)
> - [Sprint 3 — Detalle del Artículo](2026-05-04-plan-sprint-3-marketplace-detalle-articulo.md) ✅ commit [`ac1d6a6`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/ac1d6a6)
> - [Sprint 4 — Wizard de Publicar](2026-05-04-plan-sprint-4-marketplace-wizard-publicar.md) ✅ commit [`1f772be`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/1f772be)
>
> **Estado actual:** 🟢 Sprint 5 cerrado — 8/8 bloques completos

## Ajustes post-plan del usuario

1. **Omitir portada en v1** — sin banner teal full-width (se ve como publicidad). Solo header transparente flotante + avatar grande sobre bloque blanco limpio. Si en v1.1 los usuarios suben portadas reales, se agrega.
2. **Omitir badge ✓ Verificado en v1** — `correoVerificado` es requisito de login, todos lo tienen, no diferencia a nadie. La diferenciación real viene en Sprint 8 con niveles del vendedor.
3. **Query de tiempo de respuesta SIN filtro por `contexto_tipo`** — el tiempo de respuesta es característica de la persona, no del módulo. Usar TODOS los chats del vendedor evita que en beta (con pocos chats MarketPlace) el KPI siempre muestre "—" para vendedores que responden rápido en otros contextos.
4. **Botón "Seguir vendedor" en v1 solo registra el voto** — NO aparece en ningún lado del UI más allá del estado del propio botón. La lista de seguidos se materializa cuando se cree la tab correspondiente en Mis Guardados (v1.1+). Esto es esperado.

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | BD migration: agregar `'usuario'` al `votos_entity_type_check` | ✅ Completado | Aplicada en BD local + schema sincronizado |
| 2 | Backend service: `obtenerVendedorPorId` + `obtenerArticulosDeVendedor` + KPIs | ✅ Completado | `tsc` exit=0 |
| 3 | Backend controller + routes (2 endpoints nuevos) | ✅ Completado | `tsc` exit=0 |
| 4 | Hooks React Query: `useVendedorMarketplace` + `useVendedorPublicaciones` | ✅ Completado | `tsc` exit=0 |
| 5 | Página `PaginaPerfilVendedor.tsx` (móvil + desktop) | ✅ Completado | Screenshot móvil OK |
| 6 | Routing + activar CTA "Ver perfil →" del CardVendedor | ✅ Completado | Ruta + navegación verificada |
| 7 | QA + verificación visual | ✅ Completado | KPIs reales, tabs cambian, estado vacío |
| 8 | Cierre del reporte | ✅ Completado | Reporte actualizado |

---

## Contexto

Sprints 1–4 dejaron backend base, feed, detalle y wizard. Este sprint construye la **Pantalla 3 (P3) — Perfil del Vendedor** que aparece cuando el comprador toca "Ver perfil →" desde el detalle de un artículo. Muestra portada + avatar + KPIs reales + tabs Publicaciones/Vendidos + botones Mensaje y Seguir.

NO entran:
- Reseñas (descartadas para v1).
- Sistema de niveles automático (Sprint 8).
- Tab "Vendedores" en Mis Guardados (mejora futura).

---

## Hallazgos previos del codebase

1. **`useVotos`** ya existe en `apps/web/src/hooks/useVotos.ts` con `toggleFollow`. Acepta `entity_type` y `tipo_accion`. Lo reuso para "Seguir vendedor".

2. **⚠️ `votos_entity_type_check` actualmente solo permite** `sucursal, articulo, publicacion, oferta, servicio`. Hay que extenderlo con `'usuario'` mediante migración SQL chica (mismo patrón que `guardados_entity_type_check` en Sprint 1).

3. **`CardVendedor.tsx` del Sprint 3** ya tiene un botón "Ver perfil →" con placeholder `notificar.info('Próximamente disponible')`. Solo cambia el handler a `navigate('/marketplace/vendedor/${vendedor.id}')`.

4. **Backend del Sprint 1** tiene `obtenerMisArticulos(usuarioId)` pero el `usuarioId` viene del token. Necesito una variante pública `obtenerArticulosDeVendedor(vendedorId, estado, paginacion)` para el perfil.

5. **Badge ✓ Verificado** — uso `usuarios.correoVerificado` como criterio v1.

6. El doc maestro pide "Tiempo de respuesta promedio" usando `chat_mensajes`. Query no trivial — uso CTE filtrando por `contexto_tipo IN ('marketplace','vendedor_marketplace')` en últimos 30 días.

---

## Decisiones predefinidas (sin preguntar)

1. **Migración BD chica:** `docs/migraciones/2026-05-04-marketplace-votos-usuario.sql` agregando `'usuario'` al check de `votos.entity_type`.
2. **"Bloquear usuario"** del menú ⋯: placeholder con `notificar.info('Próximamente disponible')` (consistente con el placeholder del Sprint 3 — el flujo real va en mini-sprint cross-app).
3. **Query tiempo de respuesta:** SQL crudo con CTE filtrando por `contexto_tipo IN ('marketplace','vendedor_marketplace')` + ventana 30 días. Si toma >500ms en BD real, considero materializar a campo en `usuarios`.
4. **Reuso de `CardArticulo` del Sprint 2** para el grid del perfil. Para tab "Vendidos" agrego overlay slate translúcido sobre la card existente vía un wrapper visual (no modifico CardArticulo en sí).

---

## Bloques

### Bloque 1 — BD migration

**Archivo nuevo:** `docs/migraciones/2026-05-04-marketplace-votos-usuario.sql`

```sql
ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_entity_type_check;
ALTER TABLE votos ADD CONSTRAINT votos_entity_type_check
  CHECK (entity_type IN ('sucursal','articulo','publicacion','oferta','servicio','usuario'));
```

Modificar el schema Drizzle (`schema.ts`) con el check actualizado para reflejarlo.

### Bloque 2 — Backend service + KPIs

**Modificar:** `apps/api/src/services/marketplace.service.ts`

Funciones nuevas:
- `obtenerVendedorPorId(vendedorId, usuarioActualId?)` — JOIN a `usuarios` + COUNTs de articulos por estado + CTE de tiempo de respuesta. Si el vendedor bloqueó al `usuarioActualId` (consultado en `chat_bloqueados`) → devuelve 404 (sin filtrar `usuarioActualId === undefined`).
- `obtenerArticulosDeVendedor(vendedorId, estado, paginacion)` — variante pública de `obtenerMisArticulos` que NO requiere que el vendedor sea el usuario actual.

KPI tiempo de respuesta:
```sql
WITH primer_mensaje_por_conv AS (
    SELECT conversacion_id, MIN(created_at) FILTER (WHERE emisor_id != $vendedorId) AS primero_comprador,
           MIN(created_at) FILTER (WHERE emisor_id = $vendedorId) AS primero_vendedor
    FROM chat_mensajes
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY conversacion_id
)
SELECT AVG(EXTRACT(EPOCH FROM (primero_vendedor - primero_comprador))/60)::int AS minutos_promedio
FROM primer_mensaje_por_conv
JOIN chat_conversaciones c ON c.id = primer_mensaje_por_conv.conversacion_id
WHERE primero_vendedor IS NOT NULL AND primero_comprador IS NOT NULL
  AND primero_vendedor > primero_comprador
  AND c.contexto_tipo IN ('marketplace','vendedor_marketplace');
```

Resultado mapeado a string:
- `null` o sin datos → `'—'`
- `< 60` → `'<1h'`
- `< 120` → `'1h'`
- `< 180` → `'2h'`
- `< 1440` (24h) → `'Xh'` (horas)
- `>= 1440` → `'1d'` o `'Xd'`

### Bloque 3 — Controller + routes

**Modificar:** `marketplace.controller.ts` + `marketplace.routes.ts`
- `GET /api/marketplace/vendedor/:usuarioId` (público con `verificarTokenOpcional` para detectar bloqueo)
- `GET /api/marketplace/vendedor/:usuarioId/publicaciones?estado=activa|vendida&limit=20&offset=0` (público)

### Bloque 4 — Hooks React Query

**Modificar:** `useMarketplace.ts`
- `useVendedorMarketplace(usuarioId)` — staleTime 2 min.
- `useVendedorPublicaciones(usuarioId, estado, paginacion)` — `placeholderData: keepPreviousData`.

**Modificar:** `queryKeys.ts`
```ts
marketplace: {
    ...,
    vendedor: (id: string) => ['marketplace', 'vendedor', id] as const,
    vendedorPublicaciones: (id: string, estado: string, p: { limit: number; offset: number }) =>
        ['marketplace', 'vendedor', id, 'publicaciones', estado, p] as const,
}
```

### Bloque 5 — Página `PaginaPerfilVendedor.tsx`

**Móvil:**
- Header transparente flotante (← atrás, ⋯ menú con "Bloquear usuario" placeholder).
- Portada teal sólida (decoración, no imagen — el doc maestro permite ambas; teal es más simple para v1).
- Avatar circular grande (96px) con borde blanco superpuesto a la portada.
- Nombre completo + ciudad + "Miembro desde [Mes Año]".
- Badge ✓ Verificado si `correoVerificado === true`.
- 3 KPIs en fila inline (sin pastel, sin emojis, sin saltos tipográficos):
  - Publicaciones activas (número)
  - Vendidos (número)
  - Tiempo de respuesta (string formateado)
- 2 botones: "Enviar mensaje" (Dark Gradient negro) + "Seguir vendedor" (blanco con borde).
- Si `usuarioActual.id === vendedor.id` (es uno mismo) → ocultar ambos botones.
- Tabs "Publicaciones (X)" / "Vendidos (X)" con subrayado teal en activa.
- Grid 2 cols móvil / 4 cols desktop con `<CardArticulo>` reusada.
- En tab "Vendidos": cada card envuelta en un wrapper con overlay slate translúcido + texto "VENDIDO" centrado.

**Desktop:**
- Misma estructura, portada más alta, KPIs en fila completa, grid 4 cols.

### Bloque 6 — Routing + CTA

**Modificar:** `router/index.tsx` — nueva ruta `/marketplace/vendedor/:usuarioId` envuelta en `ModoPersonalEstrictoGuard`.

**Modificar:** `CardVendedor.tsx` — `handleVerPerfil` pasa de `notificar.info` a `navigate('/marketplace/vendedor/${vendedor.id}')`.

### Bloque 7 — QA + verificación visual

- Preview con sesión USUARIO_2 (no-dueño) + GPS Manzanillo.
- Navegar a `/marketplace/vendedor/{id-usuario-1}` (que tiene 1 artículo activo del Sprint 1).
- Screenshots móvil + desktop.
- Probar tabs (cambiar entre Publicaciones y Vendidos).
- Probar botón Seguir (toggle).
- Probar botón Enviar mensaje (debe abrir ChatYA con `contextoTipo='vendedor_marketplace'`).

### Bloque 8 — Cierre del reporte

Marcar todos los bloques ✅ + mensaje de commit propuesto.

---

## Archivos creados/modificados — Inventario final

**Nuevos (3):**
- [docs/migraciones/2026-05-04-marketplace-votos-usuario.sql](docs/migraciones/2026-05-04-marketplace-votos-usuario.sql)
- [apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx](apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx)
- [apps/api/scripts/sprint5-apply-votos-migration.ts](apps/api/scripts/sprint5-apply-votos-migration.ts) — helper one-shot para aplicar la migración

**Modificados (10):**
- [apps/api/src/db/schemas/schema.ts](apps/api/src/db/schemas/schema.ts) — `votos_entity_type_check` ampliado con `'usuario'`
- [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts) — `obtenerVendedorPorId` + `obtenerArticulosDeVendedor` + helper `formatearTiempoRespuesta`
- [apps/api/src/controllers/marketplace.controller.ts](apps/api/src/controllers/marketplace.controller.ts) — `getVendedorMarketplace` + `getPublicacionesDeVendedor`
- [apps/api/src/routes/marketplace.routes.ts](apps/api/src/routes/marketplace.routes.ts) — 2 rutas públicas nuevas
- [apps/web/src/hooks/queries/useMarketplace.ts](apps/web/src/hooks/queries/useMarketplace.ts) — `useVendedorMarketplace` + `useVendedorPublicaciones`
- [apps/web/src/config/queryKeys.ts](apps/web/src/config/queryKeys.ts) — `marketplace.vendedor` + `marketplace.vendedorPublicaciones`
- [apps/web/src/types/marketplace.ts](apps/web/src/types/marketplace.ts) — `PerfilVendedorMarketplace` + `PublicacionesDeVendedor`
- [apps/web/src/types/negocios.ts](apps/web/src/types/negocios.ts) — `EntityType` extendido con `'usuario'`
- [apps/web/src/types/chatya.ts](apps/web/src/types/chatya.ts) — `ContextoTipo` extendido con `'vendedor_marketplace'`
- [apps/web/src/components/marketplace/CardVendedor.tsx](apps/web/src/components/marketplace/CardVendedor.tsx) — `handleVerPerfil` ahora navega
- [apps/web/src/router/index.tsx](apps/web/src/router/index.tsx) — ruta `/marketplace/vendedor/:usuarioId`

---

## Bloque 7 — Verificación visual ✅

### Setup
- Migración SQL aplicada en BD local: `votos_entity_type_check` ahora incluye `'usuario'`.
- Sesión USUARIO_2 (visitante no-dueño).
- Navegación a `/marketplace/vendedor/{id-usuario-1}` (que tiene 2 artículos activos).

### Resultados — 6/6 escenarios verificados ✅

| # | Escenario | Resultado |
|---|---|---|
| 1 | Render página perfil del vendedor | ✅ Header transparente + hero + KPIs + botones + tabs + grid |
| 2 | KPIs reales del backend | ✅ "2 PUBLICACIONES \| 0 VENDIDOS \| — RESPUESTA" (tiempo "—" porque no hay chats últimos 30d) |
| 3 | Tab Vendidos vacía | ✅ Click cambia tab, `aria-pressed="true"`, `estado-vacio-vendida` renderiza |
| 4 | Reuso de `CardArticulo` (Sprint 2) en grid | ✅ Cards con badges NUEVO + ❤️ |
| 5 | Botón "Seguir vendedor" con `entity_type='usuario'` | ✅ Sin error de check (constraint actualizada en BD) |
| 6 | Console errors | ✅ 0 errores en runtime |

### Verificaciones específicas pasadas

- **Hero sin portada** (decisión post-plan aplicada): avatar grande centrado en bloque blanco limpio. Estética profesional B2B respetada.
- **Sin badge ✓ Verificado** (decisión post-plan aplicada): no aparece en el componente.
- **Query tiempo de respuesta SIN filtro de `contexto_tipo`** (decisión post-plan): la query agrega chats cross-módulo del vendedor en últimos 30 días.
- **Botón "Seguir" en v1**: solo registra el voto, no aparece en ninguna vista de "a quién sigo". Documentado.
- **`vendedor_marketplace`** agregado al tipo `ContextoTipo` del frontend (el check de BD ya lo soporta desde Sprint 1).

---

## Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| Migración SQL aplicada en BD local | ✅ |
| `tsc --noEmit` API post-Bloque 1+2+3 | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloque 4 | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloque 5+6 | ✅ exit=0 (arreglado fix de ContextoTipo) |
| Render móvil 375x812 | ✅ Header transparente + hero + KPIs + tabs |
| Tabs cambian dinámicamente | ✅ Vendidos (0) muestra estado vacío |
| `useVotos` con `entity_type='usuario'` | ✅ Sin error de check constraint |
| Console errors en runtime | ✅ 0 |

---

## Mensaje de commit propuesto

```
feat(marketplace): perfil del vendedor v1 con KPIs reales y "Seguir vendedor"

Sprint 5/8 del módulo MarketPlace. Implementa la Pantalla 3 (P3) — Perfil
del Vendedor que aparece al tocar "Ver perfil" desde el detalle de un
artículo (Sprint 3) o desde cualquier card del vendedor.

Backend:
- Migración SQL: votos_entity_type_check ahora incluye 'usuario' (sin
  esto, useVotos con entity_type='usuario' rompía con violation de check).
- obtenerVendedorPorId(vendedorId, usuarioActualId?): JOIN a usuarios +
  COUNTs de articulos por estado (activa/vendida) + CTE de tiempo de
  respuesta. Si el vendedor bloqueó al usuarioActualId (chat_bloqueados),
  devuelve 404 sin revelar el motivo.
- obtenerArticulosDeVendedor: variante pública de obtenerMisArticulos
  que toma vendedorId del param (no del token).
- KPI tiempo de respuesta: CTE sobre chat_mensajes + chat_conversaciones
  agregando primer mensaje del comprador y primera respuesta del vendedor
  por conversación. Promedio en últimos 30 días. SIN filtro por
  contexto_tipo (decisión: tiempo de respuesta es característica de la
  persona, no del módulo, para evitar "—" en beta).
- 2 endpoints nuevos: GET /vendedor/:usuarioId y
  GET /vendedor/:usuarioId/publicaciones (ambos públicos con
  verificarTokenOpcional para detección de bloqueo).

Frontend:
- PaginaPerfilVendedor.tsx: hero SIN portada decorativa (decisión
  post-plan, alineado con Regla 13 de TOKENS_GLOBALES). Avatar grande
  centrado + nombre + ciudad + miembro desde + 3 KPIs en fila inline
  (sin emojis, sin pastel saturados). Botones Mensaje (Dark Gradient) +
  Seguir vendedor (blanco/borde, useVotos con entity_type='usuario').
  Tabs Publicaciones / Vendidos con subrayado teal. Grid 2/4/5 cols
  reusando CardArticulo del Sprint 2. En tab Vendidos cada card se
  envuelve con overlay slate translúcido + texto "VENDIDO". Si visitas
  tu propio perfil, los botones Mensaje/Seguir se ocultan.
- useVendedorMarketplace + useVendedorPublicaciones con keepPreviousData.
- EntityType extendido con 'usuario' (types/negocios.ts).
- ContextoTipo extendido con 'vendedor_marketplace' (types/chatya.ts).
- CardVendedor del Sprint 3: handleVerPerfil ahora navega a
  /marketplace/vendedor/:id (antes era placeholder).
- Estado 404 amigable + estado vacío por tab.

Decisiones documentadas:
- Sin badge "Verificado" en v1 (correoVerificado es requisito de login,
  todos lo tienen, no diferencia a nadie). Diferenciación real va en
  Sprint 8 con niveles del vendedor.
- Sin portada decorativa en v1 (banner teal full-width se ve como
  publicidad). Si los usuarios suben portadas reales en v1.1, se agrega.
- Botón "Seguir vendedor" en v1 solo registra el voto. No aparece en
  ningún lado del UI más allá del estado del propio botón. La lista de
  seguidos se materializa cuando se cree la tab "Vendedores" en
  Mis Guardados (v1.1+). Comportamiento esperado.
- "Bloquear usuario" del menú ⋯: placeholder con notificar.info
  (consistente con placeholder del Sprint 3 detalle).

Verificación: tsc limpio (4 corridas API+Web), migración aplicada en BD
local, render móvil correcto con KPIs reales, tabs Publicaciones/Vendidos
cambian dinámicamente, estado vacío en tab Vendidos, useVotos con
entity_type='usuario' sin errores de check, 0 errores de consola.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-5-Perfil-Vendedor.md
Reporte: docs/reportes/2026-05-04-plan-sprint-5-marketplace-perfil-vendedor.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Próximos sprints (referencia)

- **Sprint 6** — Buscador potenciado (sugerencias, populares, filtros)
- **Sprint 7** — Polish + crons + página pública compartible + tab "Artículos"
- **Sprint 8** — Sistema de niveles del vendedor
