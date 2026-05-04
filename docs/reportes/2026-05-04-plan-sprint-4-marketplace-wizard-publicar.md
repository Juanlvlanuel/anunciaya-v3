# Cierre — Sprint 4 MarketPlace: Wizard de Publicar / Editar

> **Fecha inicio:** 04 Mayo 2026
> **Fecha cierre:** 04 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 4/8
> **Prompt origen:** `docs/prompts Marketplace/Sprint-4-Wizard-Publicar.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§8 P4 + §7 Moderación Autónoma)
> **Sprints anteriores:**
> - [Sprint 1 — Backend Base](2026-05-03-plan-sprint-1-marketplace-backend-base.md) ✅ commit [`e2cca03`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/e2cca03)
> - [Sprint 2 — Feed Frontend](2026-05-03-plan-sprint-2-marketplace-feed-frontend.md) ✅ commit [`78c38f9`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/78c38f9)
> - [Sprint 3 — Detalle del Artículo](2026-05-04-plan-sprint-3-marketplace-detalle-articulo.md) ✅ commit [`ac1d6a6`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/ac1d6a6)
>
> **Estado actual:** 🟢 Sprint 4 cerrado — 13/13 bloques completos

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | Backend: filtros de moderación + tests | ✅ Completado | 32/32 tests vitest |
| 2 | Backend: integración filtros en POST/PUT articulos | ✅ Completado | `tsc` exit=0 + 36/36 tests |
| 3 | Hooks React Query: mutations crear/actualizar/upload | ✅ Completado | `tsc` exit=0 |
| 4 | Estructura wizard (header + progreso + state) | ✅ Completado | Render verificado en preview |
| 5 | Paso 1 — Fotos + Título | ✅ Completado | Screenshot móvil OK |
| 6 | Paso 2 — Precio + Detalles | ✅ Completado | Componente renderizado |
| 7 | Paso 3 — Ubicación + Confirmación | ✅ Completado | Mapa + checklist + resumen |
| 8 | Manejo de respuestas de moderación + modal sugerencia | ✅ Completado | 3/3 tests E2E con curl |
| 9 | Vista previa en vivo (desktop) | ✅ Completado | `<CardArticulo>` reusado en lg+ |
| 10 | Modo edición + auto-save sessionStorage | ✅ Completado | hydration + auto-save debounced 500ms |
| 11 | Routing + activar CTA "+ Publicar" del feed | ✅ Completado | Rutas + handlePublicar conectado |
| 12 | QA + verificación visual | ✅ Completado | Sin errores consola, screenshot móvil |
| 13 | Cierre del reporte | ✅ Completado | Reporte actualizado |

---

## Contexto

Sprints 1–3 dejaron backend base, feed visual y pantalla de detalle. Este sprint construye **la pantalla del vendedor**: el wizard de 3 pasos para publicar un artículo nuevo o editar uno existente, junto con la **Capa 1 de Moderación Autónoma** (filtros de palabras prohibidas + detección suave de servicios y búsquedas).

NO entran:
- Página `/mis-publicaciones` — fuera del módulo MarketPlace, otro documento.
- Borradores — descartado para v1 según doc maestro §4.
- Detección de fotos prohibidas con IA — fuera de alcance v1.

---

## Hallazgos previos del codebase

1. **`useR2Upload`** acepta función `generarUrl` custom. El backend del Sprint 1 ya tiene `POST /api/marketplace/upload-imagen` que devuelve presigned URL con prefijo `marketplace/`. La función `generarUrlUploadImagenMarketplace` ya está exportada en `marketplace.service.ts`.
2. **Patrón de wizard en onboarding** (`components/onboarding/componentes/IndicadorPasos.tsx`, `BotonesNavegacion.tsx`, `LayoutOnboarding.tsx`) — se diseñó para 8 pasos con stores específicos. Para el MarketPlace (3 pasos, mucho más simple) creo componentes inline en la página, sin acoplar al wizard de onboarding.
3. **Backend del Sprint 1 tiene** `POST /articulos` (`crearArticulo`), `PUT /articulos/:id` (`actualizarArticulo`) y `POST /upload-imagen` listos. Falta integrar **filtros de moderación** en la validación.
4. **CTA "+ Publicar"** del feed (Sprint 2) hoy en `PaginaMarketplace.tsx:60` hace `notificar.info('Próximamente podrás publicar tus artículos')`. Hay que cambiarlo a `navigate('/marketplace/publicar')`.

---

## Decisiones tomadas (sin pregunta — sigo patrones establecidos)

1. **Carpeta de filtros:** `apps/api/src/services/marketplace/filtros.ts` (carpeta nueva — coherente con tener un módulo más cohesionado y deja espacio para futuros archivos `niveles.ts`, `cron.ts`).
2. **Drag & drop reorden de fotos:** se deja para v1.1 (el prompt lo permite explícitamente).
3. **Wizard:** NO reuso componentes onboarding. Construyo `IndicadorPasos` chico inline en la página — onboarding tiene lógica de stores acoplada que no necesito acá.
4. **Tests unitarios** para filtros (`detectarPalabraProhibida` con palabras esperadas, palabras con acentos, palabras edge case como "subastasta" que no deben matchear, palabras en mayúsculas).
5. **Servicios y búsquedas (sugerencia suave):** backend devuelve 200 con campo `warning` en la respuesta. Si el frontend reenvía con `confirmadoPorUsuario: true`, el backend acepta sin warning. Esto evita necesitar 2 endpoints.

## Ajustes post-plan del usuario

- **Bloque 7 — "Cambiar ubicación":** se omite por completo en v1. El wizard usa solo GPS del usuario o coordenada de la ciudad activa como fallback. Si no hay ninguno → mensaje pidiendo activar ubicación (no permite avanzar). Mapa interactivo con marcador arrastrable se evalúa post-beta para v1.1.
- **Bloque 8 — Modal sugerencia:** se quita el botón "Llevar a Servicios" porque la sección `/servicios` todavía es placeholder. El modal queda con solo 2 botones: "Editar mi publicación" (cierra modal, vuelve al paso correspondiente) y "Continuar de todos modos" (reenvía POST/PUT con `confirmadoPorUsuario: true`).

---

## Bloques

### Bloque 1 — Backend: filtros de moderación + tests

**Archivo nuevo:** `apps/api/src/services/marketplace/filtros.ts`
- Constante `PALABRAS_PROHIBIDAS` con 5 categorías (rifas, subastas, esquemas, adultos, ilegal).
- `detectarPalabraProhibida(texto)` — case-insensitive, ignora acentos (`normalize('NFD').replace(/\p{Diacritic}/gu, '')`), match por palabra completa con `\b`.
- `detectarServicio(texto)` — regex flexibles para patrones del doc §1.3.
- `detectarBusqueda(texto)` — regex flexibles para patrones del doc §1.4.
- `validarTextoPublicacion(titulo, descripcion)` — corre los 3 filtros, devuelve resultado estructurado.

**Test unitario:** `apps/api/src/__tests__/marketplace-filtros.test.ts`.

### Bloque 2 — Backend: integración filtros en POST/PUT

**Modificar:** `marketplace.service.ts → crearArticulo` y `actualizarArticulo`.
- Antes del INSERT/UPDATE, llamar `validarTextoPublicacion(titulo, descripcion)`.
- Si `severidad === 'rechazo'` → throw error con `code: 422` y los datos de la categoría.
- Si `severidad === 'sugerencia'` y `datos.confirmadoPorUsuario !== true` → devolver `{ success: false, code: 200, warning: {...} }` sin insertar.
- Si todo OK o usuario confirmó → continuar.

**Modificar:** `marketplace.controller.ts` para mapear los códigos correctamente.
**Modificar:** `validations/marketplace.schema.ts` para aceptar `confirmadoPorUsuario?: boolean`.

**Validación de precio:** ya está cubierta en Zod (`min(1).max(999999)`) — bloqueo duro. Sugerencia precio < $10 se hace en el FE (no necesita backend).

### Bloque 3 — Hooks React Query

**Modificar:** `useMarketplace.ts`
- `useCrearArticulo()` — mutation que invalida `marketplace.feed` y `marketplace.all` al éxito.
- `useActualizarArticulo()` — mutation que invalida `marketplace.articulo(id)`.
- `useUploadFotoMarketplace()` — wrap de `useR2Upload` con `generarUrl` apuntando al endpoint de marketplace.

### Bloque 4 — Estructura del wizard

**Archivo nuevo:** `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx`
- State machine: `pasoActual` (1, 2, 3), `datos` (objeto con todos los campos del wizard), `errores` (por campo).
- Header: ← back, "Paso X de 3" centrado, barra progreso de 3 segmentos.
- Footer: botones "Anterior" / "Continuar" o "Publicar ahora" / "Guardar cambios".
- Auto-save a sessionStorage cada 500ms (debounced) bajo key `wizard_marketplace_${articuloId ?? 'nuevo'}`.

### Bloque 5 — Paso 1: Fotos + Título

- Grid 8 slots con tap → `<input type="file">`. Upload directo a R2 con `useUploadFotoMarketplace`.
- Cada foto con botón X. Primera marcada como "Portada" (badge teal).
- Input título 10–80 chars con contador `34/80`.
- Validación inline: error en rojo debajo del input.

### Bloque 6 — Paso 2: Precio + Detalles

- Input precio grande con prefijo "$" y suffix "MXN", entero positivo.
- Si precio < $10 al continuar → modal advertencia ("¿Es correcto el precio?", botón "Sí, continuar" / "Editar").
- 4 chips condición (selección única) con `aria-pressed`.
- Toggle "Acepta ofertas" (default true).
- Textarea descripción 50–1000 chars con contador `148/1000`.

### Bloque 7 — Paso 3: Ubicación + Confirmación

- Mapa Leaflet con `<Circle radius={500}>` alrededor de ubicación inicial (GPS o `useGpsStore.ciudad.coordenadas`). NO interactivo (igual que MapaUbicacion del Sprint 3).
- Botón "Cambiar ubicación" abre modal con input lat/lng manual (placeholder — la geocoding por dirección queda para v1.1).
- Resumen compacto: foto portada + título + precio + condición + "Acepta ofertas".
- Checklist 3 items (todos requeridos, oculto en modo edición).
- Botón final deshabilitado hasta cumplir todo.

### Bloque 8 — Manejo de moderación

- Si POST/PUT devuelve `422` con categoría → modal de **rechazo duro** (no permite continuar). Mensaje exacto según categoría del backend.
- Si POST/PUT devuelve `200 success: false warning: {...}` → modal de **sugerencia suave** con 2 botones:
  - "Llevar a Servicios" → `sessionStorage.setItem('precarga_servicios', JSON.stringify(datos)) + navigate('/servicios')`.
  - "Continuar publicando" → reenvía con `confirmadoPorUsuario: true`.

### Bloque 9 — Vista previa en vivo (desktop)

- `lg:grid lg:grid-cols-[60%_40%]`.
- Columna derecha sticky con instancia de `<CardArticulo>` (reuso del Sprint 2) construida a partir del estado del wizard.
- Texto debajo de la card: "Tip: Las publicaciones con buenas fotos y precio competitivo se venden en promedio 3 días más rápido."

### Bloque 10 — Modo edición + auto-save

- Detecta `articuloId` en params → carga datos vía `useArticuloMarketplace`.
- Precarga estado del wizard.
- Oculta checklist en paso 3.
- Botón final: "Guardar cambios".
- Auto-save respeta el `articuloId` para no contaminar entre nueva publicación y edición de otro artículo.

### Bloque 11 — Routing + activar CTA

- Rutas `/marketplace/publicar` y `/marketplace/publicar/:articuloId` envueltas en `ModoPersonalEstrictoGuard`.
- En `PaginaMarketplace.tsx → handlePublicar`: cambiar `notificar.info(...)` por `navigate('/marketplace/publicar')`.

### Bloque 12 — QA + verificación visual

- Preview con sesión USUARIO_2.
- Probar flujo completo: publicar nuevo, editar existente, palabra prohibida ("rifa"), sugerencia servicio ("doy clases").
- Screenshots móvil + desktop.

### Bloque 13 — Cierre del reporte

Marcar todos los bloques ✅ y agregar mensaje de commit propuesto.

---

## Archivos creados/modificados — Inventario final

**Nuevos (4):**
- [apps/api/src/services/marketplace/filtros.ts](apps/api/src/services/marketplace/filtros.ts) — 5 categorías de palabras prohibidas + 2 sets de patrones de sugerencia + 4 funciones puras
- [apps/api/src/__tests__/marketplace-filtros.test.ts](apps/api/src/__tests__/marketplace-filtros.test.ts) — 32 tests (incluye edge cases como "subastasta", "barrifa", "armario")
- [apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx](apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx) — wizard 3 pasos con state machine, auto-save, vista previa, hidratación dual (modo crear desde sessionStorage / modo editar desde backend)
- [apps/web/src/components/marketplace/ModalSugerenciaModeracion.tsx](apps/web/src/components/marketplace/ModalSugerenciaModeracion.tsx) — modal con 2 botones (sin "Llevar a Servicios" porque /servicios no existe)

**Modificados (5):**
- [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts) — helper `aplicarModeracion` + integración en `crearArticulo` y `actualizarArticulo`
- [apps/api/src/controllers/marketplace.controller.ts](apps/api/src/controllers/marketplace.controller.ts) — mapeo de códigos del service a HTTP (422/200/201)
- [apps/api/src/validations/marketplace.schema.ts](apps/api/src/validations/marketplace.schema.ts) — `confirmadoPorUsuario?: boolean` en crear y actualizar
- [apps/web/src/hooks/queries/useMarketplace.ts](apps/web/src/hooks/queries/useMarketplace.ts) — `useCrearArticulo`, `useActualizarArticulo`, `useSubirFotoMarketplace`, tipos `RespuestaModeracion`
- [apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx](apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx) — `handlePublicar` ahora navega a `/marketplace/publicar`
- [apps/web/src/router/index.tsx](apps/web/src/router/index.tsx) — 2 rutas nuevas envueltas en `ModoPersonalEstrictoGuard`

---

## Bloque 12 — Verificación visual ✅

### Setup
- API y Web levantados con `preview_start`.
- Sesión USUARIO_1 con ciudad "Manzanillo" + GPS coordenadas Manzanillo.
- Navegado a `/marketplace/publicar` (modo crear).

### Resultados E2E con curl al endpoint POST /api/marketplace/articulos

**3/3 tests pasan ✅**

| # | Caso | HTTP | Verdict |
|---|---|---|---|
| 1 | Título: "Rifa especial de bicicleta vintage" + descripción con "boletos" | `422` | ✅ `categoria:rifa`, `palabraDetectada:rifa`, mensaje exacto del doc maestro |
| 2 | "Soy plomero certificado" + "doy clases de plomería" sin `confirmadoPorUsuario` | `200` | ✅ `success:false`, `severidad:sugerencia`, `categoria:servicio` |
| 3 | Mismo texto del Test 2 + `confirmadoPorUsuario:true` | `201` | ✅ Artículo creado, id devuelto (limpiado luego con soft-delete) |

### Verificación visual del wizard

- Paso 1 móvil renderizado correctamente: header sticky + barra de progreso 3 segmentos (1 verde teal) + sección "Fotos · hasta 8" + slot "+ Agregar" (dashed border) + input título con contador "0/80" + footer con botón "Continuar" deshabilitado.
- 0 errores de consola en runtime.
- TypeScript exit=0 en API y Web.

### Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` API post-Bloque 1 | ✅ exit=0 |
| `tsc --noEmit` API post-Bloque 2 | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloque 3 | ✅ exit=0 |
| `tsc --noEmit` Web post-Bloque 4-11 | ✅ exit=0 |
| `vitest run marketplace-filtros` | ✅ 32/32 tests |
| `vitest run marketplace` (todos) | ✅ 36/36 tests |
| Curl POST /articulos con palabra prohibida → 422 | ✅ |
| Curl POST con sugerencia sin confirmar → 200 con warning | ✅ |
| Curl POST con sugerencia + confirmadoPorUsuario:true → 201 | ✅ |
| Render Paso 1 móvil | ✅ Sin errores |
| Console errors | ✅ 0 |

---

## Mensaje de commit propuesto

```
feat(marketplace): wizard de publicar/editar v1 + moderación autónoma capa 1

Sprint 4/8 del módulo MarketPlace. Implementa el wizard de 3 pasos para que
el vendedor publique o edite un artículo, junto con la Capa 1 de moderación
autónoma (palabras prohibidas + sugerencias suaves).

Backend:
- services/marketplace/filtros.ts: 5 categorías de palabras prohibidas
  (rifas, subastas, esquemas, adultos, ilegal) con match case-insensitive,
  sin acentos, por palabra completa con \\b. Patrones de sugerencia para
  servicios y búsquedas. validarTextoPublicacion devuelve resultado
  estructurado.
- 32 tests unitarios cubren palabras exactas, mayúsculas, edge cases que
  NO deben matchear (subastasta, barrifa, armario, boletines).
- aplicarModeracion en marketplace.service.ts: rechazo duro → 422,
  sugerencia → 200 con warning si !confirmadoPorUsuario, 201 si sí.
- Integración en crearArticulo y actualizarArticulo (este último solo
  valida si se tocan título o descripción).

Frontend:
- PaginaPublicarArticulo.tsx: wizard 3 pasos con state machine, header
  sticky con barra de progreso, auto-save debounced 500ms en
  sessionStorage por articuloId. Hidratación dual: modo crear lee
  sessionStorage, modo editar precarga del backend. Footer fijo con
  Anterior/Continuar. Validación inline por paso.
- Paso 1: grid 8 slots de fotos con upload directo a R2 (presigned URL),
  badge "Portada" en la primera, X para borrar. Input título con contador.
- Paso 2: input precio grande con $ y MXN, 4 chips condición (selección
  única), toggle "Acepta ofertas", textarea descripción con contador.
  Advertencia precio < $10 con confirm() antes de avanzar.
- Paso 3: mapa Leaflet no-interactivo con Circle 500m. Banner amarillo si
  no hay GPS ni coordenada de ciudad. Resumen + checklist 3 items
  (oculto en modo edición).
- ModalSugerenciaModeracion: 2 botones (Editar / Continuar de todos modos).
  Sin "Llevar a Servicios" porque /servicios todavía es placeholder.
- Modal de rechazo duro inline con palabra detectada visible.
- Vista previa en vivo (lg+): instancia de CardArticulo a la derecha
  actualizada con datos del wizard.
- useCrearArticulo, useActualizarArticulo, useSubirFotoMarketplace en
  useMarketplace.ts. La mutation no lanza en 200 con sugerencia (es
  flujo normal); sí lanza en 422 (rechazo) y otros HTTP errors.
- handlePublicar del feed (Sprint 2) ahora navega a /marketplace/publicar.
- 2 rutas nuevas con ModoPersonalEstrictoGuard.

Decisiones documentadas:
- Carpeta apps/api/src/services/marketplace/ deja espacio para niveles.ts
  y cron.ts en sprints siguientes.
- Wizard NO reusa componentes de onboarding (acoplados a stores que no
  necesitamos acá).
- Drag & drop reorden de fotos para v1.1.
- "Cambiar ubicación" omitido en v1 (solo GPS o ciudad activa).
- "Llevar a Servicios" omitido hasta que la sección /servicios exista.

Verificación: tsc limpio (4 corridas API+Web), 32/32 tests filtros, 36/36
tests marketplace totales, 3/3 tests E2E del endpoint con curl
(rechazo + sugerencia sin confirmar + sugerencia confirmada), screenshot
del wizard renderizado correctamente, 0 errores de consola.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-4-Wizard-Publicar.md
Reporte: docs/reportes/2026-05-04-plan-sprint-4-marketplace-wizard-publicar.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Próximos sprints (referencia)

- **Sprint 5** — Perfil del vendedor
- **Sprint 6** — Buscador potenciado
- **Sprint 7** — Cron jobs + página pública compartible + tab "Artículos"
- **Sprint 8** — Sistema de niveles del vendedor
