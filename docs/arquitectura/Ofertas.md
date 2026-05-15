# 🏷️ Ofertas — Sección Pública

**Última actualización:** 14 Mayo 2026
**Versión:** 1.7
**Estado:** ✅ Operacional (Backend + Frontend Editorial completo)
**Ruta:** `/ofertas`

## 🆕 v1.7 — Overlay de buscador con sugerencias en vivo (14 May 2026)

Replicación sobria del patrón canónico del MarketPlace (ver `docs/arquitectura/MarketPlace.md` §P5):

- **Backend nuevo:** `GET /api/ofertas/buscar/sugerencias?q=&ciudad=` con ILIKE simple sobre título + descripción + nombre del negocio. Sin FTS (el dataset por ciudad es chico — decenas de ofertas, no miles), sin tabla de log, sin populares cacheados. Service en `apps/api/src/services/ofertas/buscador.ts`.
- **Frontend nuevo:** `OverlayBuscadorOfertas.tsx` con identidad ámbar — montado en `MainLayout.tsx` cuando `pathname.startsWith('/ofertas')`. Estado vacío: solo "Búsquedas recientes" (localStorage por sección, helper `busquedasRecientes.ts` generalizado). Mientras escribe (debounce 300ms): cards con título + descuento + negocio + ciudad.
- **HeaderOfertas refactorizado:** la lupa móvil ahora escribe a `useSearchStore.query` (antes era estado local `busquedaLocal`). El input dispara automáticamente: filtrado del feed (vía `useOfertasFeedCerca`) Y aparición del overlay con sugerencias.
- **Click en sugerencia:** `navigate('/ofertas?oferta=:id')`. `PaginaOfertas` lee el param, busca la oferta en feeds ya cargados (camino caliente) o hace fetch del detalle como fallback, y abre `ModalOfertaDetalle`. Al cerrar el modal el param se limpia.
- **Sin página de resultados dedicada** (a diferencia del MP que tiene `/marketplace/buscar?q=`). El feed in-page ya filtra por `useSearchStore.query`, por lo que el botón "Ver todos los resultados" simplemente cierra el overlay y deja al usuario en la lista filtrada inline.

Pendiente E.1 cerrado en `docs/reportes/MarketPlace/Pendientes.md`.

## v1.6 — Carrusel rotativo migrado a Embla (08 May 2026)

El par superior del feed editorial (cards "Hoy te recomendamos" y "Destacado") usaba un carrusel **hand-rolled** con Touch/Pointer Events, transform DOM directo, click guards y `requestAnimationFrame` batching. Tras 9 iteraciones siguió sintiéndose rígido en móvil — había que mover el dedo con fuerza para que el slide arrancara y el snap a medio camino lucía abrupto. Causa raíz: el "scroll-slop" interno del browser (~10–15 px de detección antes de ceder el gesto al JS) no es resoluble sin un engine que separe pointer input del rendering y mantenga velocity entre frames.

### Cambios

- **Dependencias agregadas** (`apps/web/package.json`):
  - `embla-carousel-react` — wrapper React oficial de Embla Carousel.
  - `embla-carousel-autoplay` — plugin oficial para los 7 s de rotación con pausa en hover/touch.
- **Hook `useCarruselRotativo` reescrito** (`apps/web/src/hooks/useCarruselRotativo.ts`) como wrapper sobre `useEmblaCarousel`. Mantiene la firma pública (`actual`, `index`, `total`, `siguiente`, `anterior`, `pausarHover`) y agrega `emblaRef` (para el viewport) y `emblaApi` (para satélites como los dots).
- **`CarruselRotativoSwipe` refactorizado** (`PaginaOfertas.tsx`) al patrón Embla nativo: viewport con `overflow-hidden` (`emblaRef`) → container `flex` → un slide por oferta con `min-w-0 shrink-0 grow-0 basis-full`. Renderiza **todos** los items con `key={ofertaId}` para que las imágenes ya cargadas no se redescarguen al cambiar de slide.
- **`IndicadoresRotacion` desacoplado**: recibe `emblaApi` directo y se suscribe al evento `select` con su propio `useState`. Su re-render queda contenido en los dots, no llega al árbol del carrusel.

### Decisiones técnicas no obvias

1. **Opciones y plugins de Embla memoizados con `useMemo`.** Pasar `{ loop, duration, ... }` o `[autoplayPlugin]` inline crea referencias nuevas en cada render → Embla detecta "options cambiaron" → reinicializa el carrusel → cancela la animación de snap a medio camino → la card "salta". Este fue el bug que causaba la sensación de "se queda pegada un momento y luego cambia de golpe" al soltar el dedo a media transición.
2. **`setIndex` se suscribe a `settle`, no a `select`.** `setIndex` re-renderiza al consumidor del hook, que aquí es la página entera con varios carruseles auto, mapas y feeds. Un re-render mid-animación bloquea el thread y el rAF interno de Embla pierde frames. `settle` dispara cuando la animación termina, así no interrumpe nada.
3. **Los dots usan `select` directamente vía `emblaApi`.** Esperar a `settle` para los dots los dejaba rezagados ~300 ms. La separación da lo mejor de los dos mundos: carrusel fluido + dots sincronizados al instante.
4. **`duration: 30` (≈300 ms)**, no 22 (≈220 ms del patrón anterior). A 220 ms el snap se siente "instantáneo" — el ojo no alcanza a ver la transición y luce abrupto.
5. **`dragThreshold: 4`** (default Embla = 10). Con 4 px el dedo arranca la transición casi al instante; con 10 px el toque se siente "rígido".
6. **Callbacks de click memoizados por slide** (`callbacks[i]` con `useMemo([items])` + `onClickRef`). Sin esto, cada render del padre crearía nuevas funciones inline y rompería el `React.memo` de `CardOfertaHero`.

### Comportamiento que sigue cubierto

- Loop infinito (`loop: true` cuando hay >1 oferta).
- Autoplay 7 s con pausa al hover en desktop y al touch en móvil (plugin oficial).
- Click en card abre modal de detalle, swipe NO lo abre (Embla cancela el click sintético cuando detecta drag).
- Click en flechas funciona — viven fuera del viewport de Embla.
- Sin flash al cambiar (slides montados con keys estables, imágenes en cache).
- Respeto a `prefers-reduced-motion`: detiene el autoplay; el swipe manual sigue activo.
- Scroll vertical de la página no es atrapado por el carrusel (Embla aplica `touch-action: pan-y` al viewport automáticamente).

### Archivos tocados

- `apps/web/package.json` y `pnpm-lock.yaml` — nuevas deps.
- `apps/web/src/hooks/useCarruselRotativo.ts` — reescrito.
- `apps/web/src/pages/private/ofertas/PaginaOfertas.tsx` — `CarruselRotativoSwipe` refactorizado al patrón Embla, `IndicadoresRotacion` desacoplado vía `emblaApi`.

---

## v1.5 — Header unificado + chips amber con border-2 (06 May 2026)

Cambios alineados al rediseño cross-secciones (MarketPlace, Ofertas, Negocios):

### Header

- Reorganizado a **una sola fila desktop** para igualar el alto de los headers
  de MarketPlace y Negocios. Layout: Logo "OfertasLocales" izquierda · spacer
  · CTA "Lo más visto" + chips situacionales (centro, scroll horizontal si
  no caben) · KPI dos líneas (a la derecha).
- **KPI dos líneas**: número grande arriba (`text-3xl 2xl:text-[40px]`) +
  label en color de marca (`text-amber-400/80 uppercase tracking-wider`) abajo.
- **Eliminada toda la lógica de compresión por scroll**:
  - State `comprimido` + useEffect de histéresis.
  - Imports `useScrollDirection`, `useMainScrollStore`.
  - Constantes `SCROLL_ENTRAR_COMPRIMIDO` / `SCROLL_SALIR_COMPRIMIDO`.
  - Todas las clases condicionales `comprimido ? X : Y` y transitions
    (`transition-[padding/opacity/all] duration-300`).
- Eliminado el subtítulo decorativo desktop *"Las ofertas en {ciudad} ·
  DESCUENTOS CERCA DE TI"*.

### Chips de filtros

- **Tamaño/efecto unificados con MarketPlace y Negocios**:
  - Tamaño: `rounded-full px-3.5 py-1.5 text-sm font-semibold`.
  - Iconos: `w-4 h-4 strokeWidth={2.5}`.
  - Border `border-2` (antes `border` 1px).
- **Variante temática amber** (color de marca de Ofertas):
  - Inactivo: `bg-white/5 text-slate-200 border-white/15`.
  - Hover: `border-amber-400/60` (tinte de marca).
  - Activo: `bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20`.
- **Chip "CardYA" eliminado** del array `CHIPS` + import `CreditCard`
  removido. Chips actuales: `Todas`, `Hoy`, `Esta semana`, `Cerca`, `Nuevas`.

### Móvil

- Header móvil con tamaño fijo (`pt-4 pb-2.5`, logo `w-9 h-9`, título
  `text-2xl`), sin transitions ni lógica de compresión.
- Subtítulo móvil decorativo siempre visible (sin animación de
  ocultar/mostrar).
- Fila de chips/CTAs separada como `lg:hidden` (en desktop ya están
  integrados al header).

### Archivos tocados

- `apps/web/src/components/ofertas/HeaderOfertas.tsx` — reorganizado a 1 fila,
  eliminada lógica comprimido, chips amber con border-2, CardYA removido,
  imports limpiados.

---


> **DATOS DEL SERVIDOR (React Query):**
> - Hook principal: `hooks/queries/useOfertasFeed.ts`
> - Search global: `useSearchStore` (compartido con Navbar/MobileHeader)
> - Filtros UI: `useFiltrosOfertasStore`

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe **la sección pública de Ofertas (`/ofertas`)** — el feed editorial que ven los clientes. Cubre:

- ✅ Backend (endpoints, BD, lógica de popularidad)
- ✅ Frontend (componentes, stores, hooks)
- ✅ Cada slot del feed editorial (cómo se llena, cuándo se actualiza)
- ✅ Filtros, búsqueda y comportamiento del chip
- ✅ Identidad visual (acento ámbar, animaciones)
- ✅ Decisiones de diseño y desviaciones documentadas

**NO incluye:**
- ❌ CRUD de ofertas desde Business Studio → ver `docs/arquitectura/Promociones.md`
- ❌ Asignación de cupones privados → ver `docs/arquitectura/Promociones.md`
- ❌ ScanYA / validación de códigos → ver `docs/arquitectura/Promociones.md` §10

**Para implementación exacta:**
- Backend: `apps/api/src/services/ofertas.service.ts`, `controllers/ofertas.controller.ts`, `routes/ofertas.routes.ts`
- Frontend service: `apps/web/src/services/ofertasService.ts`
- Frontend hook (queries): `apps/web/src/hooks/queries/useOfertasFeed.ts`
- Frontend hook (rotación par superior): `apps/web/src/hooks/useCarruselRotativo.ts`
- Frontend store: `apps/web/src/stores/useFiltrosOfertasStore.ts`
- Página: `apps/web/src/pages/private/ofertas/PaginaOfertas.tsx`
- Componentes: `apps/web/src/components/ofertas/` (8 archivos)

---

## 📋 Índice

1. [Concepto y filosofía](#1-concepto-y-filosofía)
2. [Backend — Infraestructura](#2-backend--infraestructura)
3. [Backend — Endpoints](#3-backend--endpoints)
4. [Backend — Lógica de negocio](#4-backend--lógica-de-negocio)
5. [Frontend — Tipos, stores, hooks, services](#5-frontend--tipos-stores-hooks-services)
6. [Frontend — Componentes](#6-frontend--componentes)
7. [Estructura del feed y SLOTS](#7-estructura-del-feed-y-slots)
8. [Filtros, chips y búsqueda](#8-filtros-chips-y-búsqueda)
9. [Identidad visual y animaciones](#9-identidad-visual-y-animaciones)
10. [Comportamiento responsive](#10-comportamiento-responsive)
11. [Migraciones SQL aplicadas](#11-migraciones-sql-aplicadas)
12. [Pendientes futuros](#12-pendientes-futuros)
13. [Referencias cruzadas](#13-referencias-cruzadas)

---

## 1. Concepto y filosofía

La sección pública de Ofertas es un **feed editorial estilo "revista digital"** con identidad visual fuerte. No es un grid uniforme de cards — es un feed con bloques heterogéneos que cumplen funciones distintas.

### Principios

1. **Contraste alto blanco/negro** sobre el gradient azul nativo del `MainLayout`. La página NO aplica fondo propio; hereda el gradient.
2. **Acento ámbar** (`#f59e0b` / `amber-500`) como identidad de la sección — connota "promo / rebajas / descuento" universalmente. Equivalente al azul de Negocios y rose de CardYA/Guardados.
3. **2 cards privilegiadas** ("Hoy te recomendamos" + "Destacado") con tratamiento visual extra (variante `destacado`). Resto del feed es discreto.
4. **Filtro fuerte** — cuando el usuario activa un chip ≠ `todas`, los bloques editoriales se ocultan y solo queda la lista filtrada. El chip se siente como un cambio de modo, no un detalle perdido.
5. **Movimiento sutil** — carruseles autoplay y ticker dan dinamismo sin ser ruidosos. Respetan `prefers-reduced-motion`.
6. **Login obligatorio** — toda la sección requiere `verificarToken`. La vista pública compartible (`/ofertas/publico/:codigo`) es el único endpoint sin auth.

---

## 2. Backend — Infraestructura

### 2.1 Tablas en Postgres (Supabase)

| Tabla | Propósito | Dónde se llena |
|-------|-----------|----------------|
| `ofertas` | Tabla maestra existente (módulo Promociones) | BS — comerciante crea ofertas |
| `oferta_vistas` | Eventos de **VISTA (impression)** — card apareció en viewport del usuario | Backend — al llamar `POST /api/ofertas/:id/vista` |
| `oferta_clicks` | Eventos de **CLICK (engagement)** — usuario abrió el modal de detalle | Backend — al llamar `POST /api/ofertas/:id/click` |
| `oferta_shares` | Eventos de **SHARE** — usuario compartió la oferta (WhatsApp, FB, X, link, Web Share) | Backend — al llamar `POST /api/ofertas/:id/share` |
| `ofertas_destacadas` | Override admin para "Oferta del día" | Manual vía SQL (no hay UI admin todavía) |
| `metricas_entidad` | Contadores acumulados (`total_views`, `total_clicks`) | Backend — incremento condicional al insertar evento nuevo |

### Regla de insider — anti-inflación cross-rol

A partir del **1 May 2026**, cualquier vista, click o share donde el usuario está vinculado al negocio dueño de la oferta (`usuarios.negocio_id = ofertas.negocio_id`) se **descarta silenciosamente** — el endpoint devuelve 200 pero la métrica no se incrementa.

**Por qué:** sin esto, el dueño/empleado del negocio que abre el feed o revisa sus propias ofertas para validarlas estaría inflando sus propios contadores. Eso ensucia los reportes que el comerciante consulta en BS para tomar decisiones (ej. "qué oferta tiene mejor engagement").

**Cobertura:** la regla aplica a las 3 métricas (`vista`, `click`, `share`) vía un helper compartido `esInsiderDelNegocio(ofertaId, usuarioId)` en el service. Cubre dueños Y empleados (cualquier usuario con `negocio_id` apuntando al negocio).

**Por qué `usuarios.negocio_id`:** es la fuente única de verdad de "este usuario está dentro del negocio", sin importar si es dueño, gerente o empleado. La regla NO depende de `modoActivo` (personal/comercial) — un comerciante en modo personal sigue siendo insider del negocio que tiene asociado.

### Modelo de analytics: Vista vs Click

A partir del **1 May 2026** la sección Ofertas adopta el modelo estándar de la industria (Facebook ads, Google Display) que separa **impression** y **engagement**:

| Métrica | Disparador | Tabla | Frontend |
|---------|-----------|-------|----------|
| **Vista (impression)** | Card aparece en viewport ≥50% por ≥1s | `oferta_vistas` | Hook `useViewTracker` aplicado a `CardOfertaHero`, `CardOfertaCarrusel`, `CardOfertaLista`, `OfertaCard` |
| **Click (engagement)** | Usuario abre el modal de detalle | `oferta_clicks` | `useEffect` en `ModalOfertaDetalle` cuando `oferta` se setea |
| **Share** | Usuario comparte la oferta (cualquier canal) | `oferta_shares` | `handleShare` en `ModalOfertaDetalle` al hacer click en alguna opción del dropdown |

Ambas métricas tienen anti-inflación independiente: 1 vista por usuario por día calendario (Sonora) y 1 click por usuario por día. Una oferta puede tener muchas vistas y pocos clicks (alto alcance, bajo engagement) o pocas vistas y muchos clicks (audiencia muy interesada). Análisis útil para reportes futuros del comerciante.

**Nota importante:** `oferta_vistas` y `metricas_entidad` son **complementarias**, no redundantes:
- `metricas_entidad.total_views` = contador acumulado HISTÓRICO (todo el tiempo).
- `oferta_vistas` = eventos granulares con `created_at` para poder calcular ventanas de tiempo (ej. "vistas últimos 7 días").

### 2.2 Schema `oferta_vistas`

```sql
CREATE TABLE IF NOT EXISTS oferta_vistas (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_oferta_vistas_oferta_fecha ON oferta_vistas (oferta_id, created_at DESC);
CREATE INDEX idx_oferta_vistas_usuario_fecha ON oferta_vistas (usuario_id, created_at DESC);

-- Anti-inflación (migración 2026-05-01): 1 vista por usuario por día
-- calendario en zona horaria de Sonora (`America/Hermosillo`).
CREATE UNIQUE INDEX uniq_oferta_vistas_por_dia ON oferta_vistas (
  oferta_id,
  usuario_id,
  ((created_at AT TIME ZONE 'America/Hermosillo')::date)
);
```

- **Política anti-inflación**: el índice único `uniq_oferta_vistas_por_dia` garantiza que un usuario solo cuente UNA vista por oferta por día calendario en zona horaria de Sonora. Aperturas repetidas del mismo modal en el mismo día son rechazadas por el constraint y el service usa `ON CONFLICT DO NOTHING` para no fallar.
- El acumulado en `metricas_entidad.total_views` SOLO se incrementa cuando el INSERT en `oferta_vistas` realmente agrega una fila (`RETURNING id`). Si el unique constraint rechaza el insert, `total_views` permanece igual. Así ambos contadores son consistentes.
- "Día" usa zona horaria de Sonora explícita (no UTC) — coincide con el día local del usuario en Puerto Peñasco. Para el funcionamiento correcto del índice, la expresión `AT TIME ZONE 'literal'` es IMMUTABLE.

### 2.3 Schema `ofertas_destacadas`

```sql
CREATE TABLE IF NOT EXISTS ofertas_destacadas (
  id BIGSERIAL PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  fijada_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fijada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vigente_hasta TIMESTAMPTZ NOT NULL,
  motivo VARCHAR(200),
  activa BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_ofertas_destacadas_vigencia
  ON ofertas_destacadas (activa, vigente_desde, vigente_hasta);
```

- `vigente_desde` / `vigente_hasta` permiten **agendar** destacadas con ventana horaria (ej. "esta oferta es la del lunes 8 AM al domingo 23:59").
- `activa` permite "despublicar" sin perder histórico.
- Solo UNA destacada activa+vigente al mismo tiempo (controlado por la query del endpoint, no por constraint, para flexibilidad).
- `fijada_por` es `ON DELETE RESTRICT` (no SET NULL como sugería el plan original — sería contradictorio con NOT NULL). Preserva trazabilidad histórica.

### 2.4 Resiliencia de tablas nuevas

Tanto `oferta_vistas` como `ofertas_destacadas` tienen lógica de resiliencia en backend: si las tablas no existen aún (caso pre-migración), los endpoints **degradan graciosamente** sin lanzar 500. Detalles en §4.

---

## 3. Backend — Endpoints

### 3.1 Tabla resumen

| Método | Ruta | Auth | Propósito |
|--------|------|------|-----------|
| GET | `/api/ofertas/feed` | ✅ `verificarToken` | Feed geolocalizado con filtros |
| GET | `/api/ofertas/destacada-del-dia` | ✅ `verificarToken` | Hero "Oferta del día" |
| GET | `/api/ofertas/detalle/:ofertaId` | ✅ `verificarToken` | Detalle para modal |
| GET | `/api/ofertas/:ofertaId/sucursales` | ✅ `verificarToken` | Lista de sucursales donde aplica la misma oferta operativa (mismo grupo de partición). Acepta `latitud`/`longitud` para ordenar por distancia |
| POST | `/api/ofertas/:id/vista` | ✅ `verificarToken` | Registra **VISTA (impression)** — 1/usuario/día |
| POST | `/api/ofertas/:id/click` | ✅ `verificarToken` | Registra **CLICK (engagement)** — 1/usuario/día |
| POST | `/api/ofertas/:id/share` | ✅ `verificarToken` | Registra **SHARE** — 1/usuario/día |
| GET | `/api/ofertas/publico/:codigo` | ❌ sin auth | Vista pública compartible |

### 3.2 `GET /api/ofertas/feed`

**Query params** (todos opcionales):

| Param | Tipo | Default | Comportamiento |
|-------|------|---------|----------------|
| `latitud`, `longitud` | number | — | Si presentes, filtra por `ST_DWithin(distanciaMaxKm)` y calcula `distancia_km` por oferta |
| `distanciaMaxKm` | number | `50` | Radio en km (cap 500) |
| `categoriaId` | number | — | Filtra por categoría del negocio |
| `tipo` | enum | — | porcentaje, monto_fijo, 2x1, 3x2, envio_gratis, otro |
| `busqueda` | string | — | ILIKE en título / descripción / nombre del negocio |
| `limite` | number | `100` | cap 200 |
| `offset` | number | `0` | paginación |
| `fechaLocal` | string | hoy local | YYYY-MM-DD — filtra ofertas activas según medianoche del usuario, no UTC |
| `orden` | enum | `distancia` si hay GPS, sino `created_at DESC` | `distancia` \| `recientes` \| `populares` \| `vencen_pronto` |
| `soloCardya` | boolean | false | Solo negocios con `participa_puntos = true` |
| `creadasUltimasHoras` | number (1-720) | — | Filtra `o.created_at >= NOW() - INTERVAL` |
| `sucursalId` | UUID | — | **Reservado para perfil de negocio.** El feed público (`/ofertas`) NO debe enviar este param — ver §5.X "Regla del interceptor Axios". Cuando viene presente, el feed filtra por esa sucursal específica y desactiva la deduplicación cross-sucursal. |

**Respuesta**: array de `OfertaFeedRow`.

**Lógica de `orden=populares`**:
1. Si la tabla `oferta_vistas` existe: ORDER BY `COUNT(oferta_vistas WHERE created_at >= NOW() - INTERVAL '7 days')` DESC, tiebreaker `o.created_at DESC`.
2. Si no existe: degrada a `o.created_at DESC` (resiliente).
3. Detección via `to_regclass('public.oferta_vistas')` antes del query principal.

**Campo computado `es_popular`**: post-procesado en JS después del query. Cuando `orden === 'populares'` AND la tabla `oferta_vistas` existe, las primeras `TOP_POPULARES = 3` filas tienen `es_popular = true`. En cualquier otro caso, `false`.

### 3.3 `GET /api/ofertas/destacada-del-dia`

Devuelve **una sola oferta** (o `null`).

**Query params opcionales:**
- `latitud`, `longitud` — **SÍ filtran** la oferta por radio cuando vienen presentes (50km default, mismo que el feed). Sin GPS, no se filtra.

**Cambio (1 May 2026):** antes la destacada del día era contenido editorial **global** que ignoraba la ciudad. Se cambió a respetar el GPS porque mostrar "1400 km" rompía la promesa hiperlocal del producto. Si no hay nada destacado dentro del radio, el slot simplemente no se renderiza (frontend chequea `data: null`).

**Lógica:**
1. **Override admin** (prioridad): busca en `ofertas_destacadas` un registro con `activa = true AND vigente_desde <= NOW() AND vigente_hasta >= NOW()` — la más reciente por `fijada_at`. Si existe, usa ese `oferta_id`.
2. **Fallback automático** (si no hay override): la oferta activa con **más vistas reales en últimos 7 días** (`oferta_vistas`). Tiebreaker: `o.created_at DESC`.
3. **Fallback secundario** (si `oferta_vistas` no existe): la oferta activa más recientemente creada.
4. Si no hay ninguna oferta activa: devuelve `data: null` (200, NO error).

**Resiliencia**: si la tabla `ofertas_destacadas` no existe (migración pendiente), el `try/catch` ignora `42P01` y cae al fallback automático.

**Reutiliza** `obtenerOfertaDetalle(ofertaId, userId, gpsUsuario?)` para el formato de respuesta — cero duplicación de SELECT con joins gigantes. El parámetro `gpsUsuario` se propaga para que el SELECT incluya `ST_Distance(...)`.

### 3.4 `GET /api/ofertas/detalle/:ofertaId`

Detalle individual con joins de negocio + sucursal + métricas + estado de like/save del usuario. Incluye `negocio_usuario_id` (para iniciar ChatYA) y `created_at` (para microseñal "Nueva" en frontend). `es_popular` siempre `false` (solo aplica al feed con `orden=populares`).

### 3.5 `POST /api/ofertas/:id/vista`

**Política anti-inflación**: máximo 1 vista por usuario por día calendario (Sonora). El orden de operaciones cambió respecto a versiones anteriores — primero se intenta insertar el evento, y SOLO si la BD acepta el insert (no choca con el índice único) se incrementa el contador acumulado. Esto garantiza consistencia: ambos contadores reflejan vistas únicas, no taps repetidos.

**Regla de insider** (anti-inflación cross-rol): si el usuario está vinculado al negocio dueño (`usuarios.negocio_id = ofertas.negocio_id`), el endpoint devuelve 200 pero descarta la métrica. Aplica también a `/click` y `/share`. Ver "Regla de insider" en §2.

```sql
-- 1. Intentar insertar evento — si choca con uniq_oferta_vistas_por_dia,
--    NO inserta y RETURNING devuelve 0 filas.
INSERT INTO oferta_vistas (oferta_id, usuario_id) VALUES (:id, :usuarioId)
ON CONFLICT DO NOTHING
RETURNING id;

-- 2. SOLO si el insert agregó una fila nueva, incrementar metricas:
INSERT INTO metricas_entidad (entity_type, entity_id, total_views) VALUES ('oferta', :id, 1)
ON CONFLICT (entity_type, entity_id) DO UPDATE SET total_views = total_views + 1;
```

**Comportamientos:**

| Caso | Resultado |
|------|-----------|
| 1ª apertura del modal del día | +1 fila en `oferta_vistas`, +1 en `metricas_entidad.total_views` |
| 2ª-Nª apertura el MISMO día (mismo user) | Sin cambios. Endpoint devuelve 200 silenciosamente. |
| Día siguiente, mismo user | Cuenta como vista nueva |
| Otro user el mismo día | Cuenta como vista nueva (la deduplicación es per-usuario, no global) |

**Resiliencia legacy**: si la tabla `oferta_vistas` no existe (entorno pre-migración), se degrada a "siempre incrementar" — modo previo, sin deduplicación. Este modo se desactiva al aplicar la migración `2026-05-01-oferta-vistas-deduplicar-por-dia.sql`.

### 3.6 Campos clave en `OfertaFeedRow`

```ts
{
  oferta_id: string;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;             // R2 URL
  tipo: TipoOferta;
  valor: string | null;
  compra_minima: string;
  fecha_inicio: string;
  fecha_fin: string;
  limite_usos: number | null;
  usos_actuales: number;
  activo: boolean;
  created_at: string;                // Para microseñal "Nueva"

  negocio_id: string;
  negocio_usuario_id: string;        // Para ChatYA desde feed
  negocio_nombre: string;
  logo_url: string | null;
  acepta_cardya: boolean;
  verificado: boolean;

  sucursal_id: string;
  sucursal_nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  whatsapp: string | null;

  latitud: number;
  longitud: number;
  distancia_km: number | null;       // Solo si query trae lat/lng

  categorias: Array<{...}> | null;
  total_vistas: number;
  total_shares: number;
  liked: boolean;
  saved: boolean;

  es_popular: boolean;               // Top 3 cuando orden=populares
}
```

El middleware global `transformResponseMiddleware` convierte automáticamente snake_case → camelCase en la respuesta HTTP.

---

## 4. Backend — Lógica de negocio

### 4.0 Capas de filtrado del feed (en orden de aplicación)

El query del feed aplica **6 capas** de filtrado dentro del CTE `feed_base`. Si una oferta NO cumple cualquiera de estas, **no aparece** en ningún chip ni bloque editorial. Documentar esto evita que se reporten como bugs visuales casos que son comportamiento intencional.

| # | Capa | SQL | Efecto |
|---|------|-----|--------|
| 1 | **Estado de la oferta** | `o.activo = true AND o.visibilidad = 'publico'` | Excluye desactivadas por el comerciante y privadas (cupones exclusivos asignados a clientes específicos) |
| 2 | **Vigencia temporal** | `DATE(fechaLocal) BETWEEN DATE(o.fecha_inicio) AND DATE(o.fecha_fin)` | Excluye vencidas y futuras. Usa `fechaLocal` (medianoche local del usuario) para evitar off-by-one entre zonas horarias |
| 3 | **Cupo restante** | `o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos` | Excluye agotadas |
| 4 | **Integridad del negocio** | `n.activo AND n.es_borrador = false AND n.onboarding_completado = true` | Excluye negocios incompletos, en borrador, o desactivados |
| 5 | **Sucursal activa** | `s.activa = true` | Excluye sucursales archivadas |
| 6 | **Geolocalización** (si hay GPS) | `ST_DWithin(s.ubicacion, gps, distanciaMaxKm * 1000)` | Excluye fuera del radio (default 50km) |

Después del CTE, el outer query aplica **deduplicación cross-sucursal** (`WHERE rn = 1`) — ver §4.4.

### 4.1 Cálculo de popularidad

Tres niveles de gracia:

| Caso | Comportamiento |
|------|----------------|
| Tabla `oferta_vistas` existe + tiene eventos | Ordena por `COUNT(*) últimos 7 días`. Top 3 marcadas con `es_popular=true`. |
| Tabla existe pero sin eventos | Todas las ofertas tienen 0 vistas → orden cae a tiebreaker `created_at DESC`. `es_popular=false`. |
| Tabla NO existe (pre-migración) | Detectado vía `to_regclass`. Orden cae a `created_at DESC`. `es_popular=false`. |

### 4.2 Filtro por ciudad

El backend SIEMPRE aplica `ST_DWithin(50km)` cuando recibe `latitud` + `longitud`. El frontend lee `useGpsStore.{latitud, longitud}`, que se actualiza:
- Por GPS real del navegador (`obtenerUbicacion()`).
- Por selección manual del usuario en el `ModalUbicacion` (Navbar/MobileHeader): llama `setCiudad(nombre, estado, coordenadas)` que **también actualiza lat/lng del store**.

Comportamiento esperado (verificado con curls):
- Guadalajara: 0 ofertas (ningún negocio dentro de 50km).
- Puerto Peñasco: 16 ofertas, 19 negocios.
- Caborca: 0 ofertas (12 negocios pero ninguno con oferta activa).

### 4.3 Validación de filtros (Zod)

Esquema `filtrosFeedSchema` valida cada query param. Errores devuelven `400` con mensajes en español. `creadasUltimasHoras` capeado a 720 (30 días) para evitar abuso. `limite` default 100, cap 200.

### 4.4 Deduplicación cross-sucursal (CTE `WHERE rn = 1`)

El CTE `feed_base` agrupa ofertas con `ROW_NUMBER() OVER (PARTITION BY ...)` y el outer query filtra `rn = 1`. Esto colapsa **una misma "oferta operativa"** que el comerciante replicó a varias sucursales en una sola card.

**Partición** (campos que definen "misma oferta"):
```
o.negocio_id, o.titulo, o.descripcion, o.tipo,
o.valor, o.imagen, o.fecha_inicio, o.fecha_fin
```

**Tiebreaker** (qué sucursal queda como representante del grupo):
1. Más cercana al GPS del usuario (si hay GPS).
2. Sucursal matriz (`s.es_principal DESC`).
3. Más recientemente actualizada (`o.updated_at DESC`).

**Campo `total_sucursales`** (`COUNT(*) OVER` con la misma partición): se devuelve al frontend para mostrar "+N sucursales más" cuando >1.

**Excepción**: si el query trae `sucursalId` (perfil de negocio), `deduplicar = false` — el outer query no aplica `WHERE rn = 1`, mostrando todas las ofertas de esa sucursal específica.

### 4.5 Lista de sucursales por oferta (`GET /:id/sucursales`)

Endpoint específico para el modal de detalle cuando la oferta aplica a múltiples sucursales (`totalSucursales > 1`). El frontend lo llama solo en ese caso para no hacer requests innecesarios.

**Cómo funciona el query**:
1. Toma los **8 campos de partición** de la oferta solicitada (`negocio_id, titulo, descripcion, tipo, valor, imagen, fecha_inicio, fecha_fin`).
2. Busca todas las ofertas con la **misma partición** que pasen los mismos filtros del feed (activa, vigente, sucursal activa, negocio completo). Usa `COALESCE` para igualar correctamente cuando algún campo de partición es `NULL` (descripción, valor o imagen).
3. Devuelve por cada sucursal: `nombre, dirección, ciudad, teléfono, whatsapp, lat, lng, esPrincipal, distanciaKm`.
4. Ordena por distancia ASC si hay GPS; sino por matriz primero.

**UI consumer**: el modal renderiza la lista bajo "Disponible en N sucursales" con cada sucursal mostrando nombre + distancia ámbar + dirección + botones individuales WhatsApp (verde) / teléfono (gris). Clicks en los botones abren el canal específico de **esa sucursal**, no de la matriz.

### 4.6 Cálculo de "Vence en N días" (frontend)

Patrón obligatorio para evitar el off-by-one por horas parciales del día:

```ts
const fin = new Date(fechaFin);
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
fin.setHours(0, 0, 0, 0);
const diff = Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
```

Convertir el número a texto:
- `0` → `"Vence hoy"`
- `1` → `"Vence mañana"`
- `>=2` → `"Vence en N días"`

**Bug corregido (1 May 2026)**: la versión anterior usaba `Date.now()` con horas parciales + `Math.ceil`, dando off-by-one (ej: hoy 17:00 → mañana 23:59 daba 2 días en vez de 1). Aplica en `CardOfertaHero`, `CardOfertaCarrusel`, `CardOfertaLista`, `OfertaCard` y `ModalOfertaDetalle` — todos comparten esta lógica.

---

## 5. Frontend — Tipos, stores, hooks, services

### 5.1 `apps/web/src/types/ofertas.ts`

Espejo de `OfertaFeedRow` en camelCase:

```ts
export interface OfertaFeed {
  ofertaId: string;
  titulo, descripcion, imagen, tipo, valor, compraMinima: …;
  fechaInicio, fechaFin: string;
  limiteUsos: number | null;
  usosActuales, activo: …;
  createdAt: string;

  negocioId, negocioUsuarioId, negocioNombre: string;
  logoUrl: string | null;
  aceptaCardya, verificado: boolean;

  sucursalId, sucursalNombre, direccion, ciudad: string;
  telefono, whatsapp: string | null;

  latitud, longitud: number;
  distanciaKm: number | null;

  categorias: Array<{...}> | null;
  totalVistas, totalShares: number;
  liked, saved: boolean;
  esPopular: boolean;
}

export type OrdenFeedOfertas = 'distancia' | 'recientes' | 'populares' | 'vencen_pronto';

export interface FiltrosFeedOfertas {
  latitud?, longitud?, distanciaMaxKm?: number;
  categoriaId?: number;
  tipo?: TipoOferta;
  busqueda?: string;
  limite?, offset?: number;
  fechaLocal?: string;
  orden?: OrdenFeedOfertas;
  soloCardya?: boolean;
  creadasUltimasHoras?: number;
}
```

### 5.2 `apps/web/src/services/ofertasService.ts`

Funciones del feed público:

| Función | Endpoint | Devuelve |
|---------|----------|----------|
| `obtenerFeedOfertas(filtros?)` | `GET /api/ofertas/feed?…` | `OfertaFeed[]` |
| `obtenerOfertaDestacadaDelDia()` | `GET /api/ofertas/destacada-del-dia` | `OfertaFeed \| null` |
| `obtenerDetalleOferta(ofertaId)` | `GET /api/ofertas/detalle/:id` | `OfertaFeed` |
| `registrarVistaOferta(ofertaId)` | `POST /api/ofertas/:id/vista` | `{ success }` |

### 5.3 `apps/web/src/config/queryKeys.ts`

```ts
queryKeys.ofertasFeed = {
  all: () => ['ofertasFeed'] as const,
  bloque: (nombre, filtros?) => ['ofertasFeed', nombre, filtros] as const,
}
```

Separado del grupo `ofertas` (que es para CRUD desde Business Studio).

### 5.4 `apps/web/src/stores/useFiltrosOfertasStore.ts`

**Solo estado UI**, sin datos del servidor.

```ts
type ChipSituacional = 'todas' | 'hoy' | 'esta_semana' | 'cerca' | 'cardya' | 'nuevas' | 'mas_vistas';

useFiltrosOfertasStore = {
  chipActivo: ChipSituacional;          // chip activo (default 'todas')
  busqueda: string;                     // Mantenido pero NO se usa hoy
  vistaExpandida: boolean;              // Catálogo grid 2-col (default false)
  setChipActivo, setBusqueda, toggleVistaExpandida, resetear;
}
```

**Reglas del store:**
- `setChipActivo(chip)` cuando `chip ≠ 'todas'` resetea `vistaExpandida = false` automáticamente. Filtro fuerte ⇒ catálogo limpio.
- `toggleVistaExpandida()` siempre fuerza `chipActivo = 'todas'` y alterna `vistaExpandida`. Solo aplica con chip "Todas".
- **Cleanup al unmount** de `PaginaOfertas`: llama `resetear()` para volver al estado inicial cuando el usuario sale.

### 5.4.1 Comportamiento del chip "Todas"

El chip "Todas" es **especial**: a diferencia de los demás, no es un filtro normal — actúa como **toggle del modo catálogo**.

| Acción | chipActivo | vistaExpandida | Layout que se renderiza |
|--------|------------|----------------|-------------------------|
| Default (sin tocar nada) | `'todas'` | `false` | Editorial: Hero + Destacado + Vencen + Recientes + Ticker + Lista 3-col + Populares |
| Click en "Todas" estando ya en `'todas'` | `'todas'` | `true` | Catálogo: Solo grid 2-col con TODAS las ofertas |
| Click en "Todas" estando otro chip | `'todas'` | `false` | Vuelve a editorial |
| Click en otro chip (Hoy, Esta semana, etc.) | `chipNuevo` | `false` | Lista filtrada como grid 2-col (sin collages) |

El chip "Todas" se ve activo (fondo blanco) **solo cuando `vistaExpandida = true`**, no cuando `chipActivo = 'todas'`. Es la única señal visual del modo catálogo.

### 5.5 `apps/web/src/stores/useSearchStore.ts` (compartido)

El buscador del **Navbar/MobileHeader global** escribe en `useSearchStore.query`. La página de Ofertas lo **lee directamente** desde `useOfertasFeedCerca` y lo pasa al backend como `busqueda`. NO hay buscador local en `/ofertas`.

Cleanup al unmount: `useSearchStore.cerrarBuscador()` para limpiar el query y no contaminar otras secciones.

### 5.6 `apps/web/src/hooks/queries/useOfertasFeed.ts`

5 hooks React Query, todos respetan filtro por ciudad (`latitud, longitud` del `useGpsStore`):

| Hook | Endpoint | Params | staleTime | Comportamiento |
|------|----------|--------|-----------|----------------|
| `useOfertasFeedCerca` | `/feed` | chip activo + búsqueda + GPS | RQ default (5 min) | `placeholderData: keepPreviousData` para evitar temblor al cambiar chip |
| `useOfertaDestacadaDelDia` | `/destacada-del-dia` | GPS opcional | **30 min** | **SÍ filtra por ciudad** (cambio del 1 May 2026, antes era global). Si no hay destacada en el radio, `data: null` y el slot no se muestra. |
| `useOfertasFeedVencenPronto` | `/feed?orden=vencen_pronto&limite=10` | GPS | 5 min | Independiente del chip activo |
| `useOfertasFeedRecientes` | `/feed?orden=recientes&limite=10` | GPS | 5 min | Independiente del chip activo |
| `useOfertasFeedPopulares` | `/feed?orden=populares&limite=10` | GPS | 5 min | Independiente del chip activo. Las primeras 3 vienen con `esPopular=true` |

**Helper privado `useBloqueCarrusel(nombre, orden, limite)`** centraliza el patrón de los 3 carruseles editoriales para evitar duplicación.

**Patrón importante**: lat/lng SIEMPRE en el objeto `filtros` (aunque sean `null`/`undefined`) para que el queryKey reaccione al cambio de ciudad. Sin esto, RQ no invalida cuando el usuario cambia ciudad. Mismo patrón que `useNegociosLista`.

### 5.7 Mapeo chip → params del backend

```ts
chipAParams(chip) → params:
- 'todas'        → {}
- 'hoy'          → { creadasUltimasHoras: 24 }     // ofertas creadas últimas 24h
- 'esta_semana'  → { creadasUltimasHoras: 168 }    // ofertas creadas últimos 7 días
- 'cerca'        → { orden: 'distancia' }
- 'cardya'       → { soloCardya: true }
- 'nuevas'       → { orden: 'recientes' }          // SOLO orden, no filtra antigüedad
- 'mas_vistas'   → { orden: 'populares' }          // SOLO orden, no filtra antigüedad
```

**Notas sobre semántica de "Hoy" y "Esta semana"**: filtran por **fecha de PUBLICACIÓN** (creación), NO por vencimiento. Una oferta vigente creada hace 1 mes NO aparece en "Hoy" aunque siga activa hoy. Esto es por diseño: los chips representan novedad ("publicadas hoy", "publicadas esta semana"). La vigencia futura está cubierta por el carrusel "Vencen pronto".

### 5.8 Regla del interceptor Axios — feed público

`apps/web/src/services/api.ts` agrega automáticamente `?sucursalId=<sucursalActiva>` a todas las peticiones cuando el usuario está en modo comercial. **Esto es correcto para Business Studio, pero rompe el feed público**: si llega `sucursalId`, el backend filtra `WHERE s.id = sucursalId` y solo muestra ofertas de la sucursal del comerciante (no las de toda la ciudad).

Por eso, las siguientes rutas están en `RUTAS_SIN_SUCURSAL`:

```ts
'/ofertas/feed',              // Feed público — filtra por ciudad, NO por sucursal
'/ofertas/destacada-del-dia', // Hero — contenido editorial global
'/ofertas/detalle/',          // Detalle de oferta para el modal
```

El interceptor sigue respetando `if (!config.params.sucursalId)`: si un caller (ej. perfil de negocio futuro) pasa `sucursalId` explícito en `filtros`, el interceptor no lo toca y el backend lo aplica. La regla protege solo el caso del feed público estándar.

**Bug histórico (1 May 2026)**: antes de incluir estas rutas en la lista, un comerciante con sucursal "Matriz" activa veía el feed `/ofertas` filtrado solo a las ofertas de su Matriz. Las nuevas ofertas creadas en otras sucursales (o de otros negocios) no aparecían — daba la sensación de que se "borraban" al crear nuevas. Documentado en `docs/reportes/sprint-A-verificacion-runtime.md`.

---

## 6. Frontend — Componentes

8 componentes en `apps/web/src/components/ofertas/`:

| Componente | Propósito | Variantes |
|-----------|-----------|-----------|
| `HeaderOfertas.tsx` | Hero negro de identidad con compresión sticky al scroll. Incluye logo + título + KPI + CTA "Lo más visto" + chips. El chip "Todas" actúa como toggle de `vistaExpandida` (no como filtro). | — |
| `TituloDeBloque.tsx` | Título: icono cuadrado negro + título arriba + underline ámbar animado + subtítulo Title Case ámbar a la derecha. Acepta `anchoUnderline?: 'corto' \| 'normal'` para títulos cortos (ej. "Esta semana"). | `normal` \| `destacado` |
| `CardOfertaHero.tsx` | Card grande con foto a sangre + panel blanco con info. Usada en "Hoy te recomendamos" y "Destacado". Variante destacado: cinta ámbar superior, pill grande con animación, logo circular, divisor vertical, flama gradient en imagen, pill "Vence X" con flama urgente, CTA "Ver oferta →", **pill de vistas oscuro ("live count") en esquina inf-derecha de la imagen**. Aspect 4/3 móvil, **21/9 desktop** (compactada en lg). | `normal` \| `destacado` |
| `CardOfertaCarrusel.tsx` | Card chica `w-[200px] lg:w-[220px] 2xl:w-[240px]`: cinta ámbar superior, pill descuento sobre foto, **logo circular flotante** entre foto y panel, eyebrow ámbar bold. Footer en una línea: distancia con `MapPin` ámbar a la izquierda + **pill ámbar de vistas con `Eye` filled a la derecha**. Acepta microseñal flotante "NUEVA" / "POPULAR" (ámbar). | — |
| `CardOfertaLista.tsx` | Fila densa horizontal: foto cuadrada + nombre + título. **Badge descuento en esquina sup-derecha** + **pill ámbar de vistas en esquina inf-derecha** (ambos absolutos sobre la fila). | — |
| `BloqueCarruselAuto.tsx` | Wrapper de carrusel autoplay (CSS animation **40s**, pausa al hover/touch, loop sin corte vía duplicación). Respeta `prefers-reduced-motion`. Acepta `anchoUnderline` que propaga a `TituloDeBloque`. | — |
| `CarruselRotativoSwipe` (en `PaginaOfertas.tsx`) | Wrapper del par superior (Hoy te recomendamos / Destacado). Construido sobre **Embla Carousel** (`useEmblaCarousel` + plugin Autoplay). Estructura nativa: viewport (`overflow-hidden` + `emblaRef`) → container `flex` → un slide por oferta con `basis-full` (1 a la vez). **Swipe horizontal** táctil en móvil + drag con mouse en desktop (engine de Embla con velocity y pointer separation, fluido como Instagram/TikTok). **Flechas Chevron** en desktop con hover sutil (opacity-0 → group-hover/swipe:opacity-100), viven fuera del viewport para que su click no se confunda con drag. Ver §v1.6 al inicio del doc para detalles técnicos. | — |
| `TickerOfertas.tsx` | Banner premium **sin contenedor**: solo logos circulares con ring ámbar + nombre del negocio, flotando sobre el gradient azul del MainLayout. Deduplicado por negocio. **Velocidad 38s**. Fuente: feed principal completo (no mix de carruseles). Padding mínimo de 10 items para que el loop no se vea repetido. | — |

### 6.1 Detalles de `CardOfertaHero` variante `destacado`

Solo aplicada al par superior ("Hoy te recomendamos" + "Destacado"). Diferencias vs variante `normal`:

- **Cinta ámbar superior**: `border-t-[3px] border-t-amber-500`.
- **Pill descuento grande con animación**: `text-base lg:text-lg font-extrabold` con `ring-2 ring-amber-400/40` que pulsa lento, **sheen diagonal one-shot al cargar**.
- **Header del negocio**: logo circular `w-11 h-11 lg:w-12 lg:h-12` con `ring-2 ring-amber-400/40`, nombre en `text-lg lg:text-xl font-bold text-[#1a1a1a]`, divisor vertical degradado ámbar, distancia `text-sm lg:text-[15px] uppercase font-bold text-amber-600`.
- **Título oferta**: `text-lg lg:text-xl 2xl:text-2xl font-extrabold`.
- **Descripción** (si existe): `text-sm font-medium line-clamp-2`.
- **Flama gradient rojo→amarillo** en esquina sup. derecha de la imagen, `w-10 h-10 lg:w-14 lg:h-14`, animada con flicker.
- **Pill "Vence X"** prominente cuando `dias <= 2`: gradient `from-amber-500 to-orange-600`, texto blanco bold uppercase, **flama blanca con contorno rojo INDEPENDIENTE del pill** (absolute positioned, sobresale por la izquierda y verticalmente, w-10/12, animada).
- **CTA "VER OFERTA →"**: `text-sm lg:text-base font-bold uppercase text-amber-600`, flecha `w-6 h-6 lg:w-7 lg:h-7` que se desliza al hover de la card.
- **Hover**: shadow ámbar, imagen scale [1.03].

### 6.2 Componentes SVG inline

Dentro de `CardOfertaHero.tsx`:
- `<FlameRedYellow />` — SVG con `<linearGradient>` rojo→naranja→amarillo. ID único por instancia (`useId()`).
- `<FlameWhiteRed />` — SVG con fill blanco + stroke rojo. Para usarse SOBRE fondos de color (pill ámbar/naranja).

Lucide `Flame` no soporta gradients nativos, por eso los SVG inline.

---

## 7. Estructura del feed y SLOTS

### 7.1 Layout vertical

```
┌──────────────────────────────────────────────────────┐
│  HEADER STICKY (sticky top-0 z-30, lg:max-w-7xl)     │
│  ─ Hero negro con compresión scroll                  │
│  ─ "Lo más visto" CTA + Chips (en una sola fila)     │
└──────────────────────────────────────────────────────┘

┌─────────────────────────┬────────────────────────────┐
│  1. Hoy te recomendamos │  2. Destacado              │  ← SOLO chip='todas'
│  (Hero variante destac.)│  (Hero variante destac.)   │
└─────────────────────────┴────────────────────────────┘

┌─────────────────────────┬────────────────────────────┐
│  3. Últimas horas       │  4. Recién publicadas      │  ← SOLO chip='todas'
│  (Carrusel autoplay)    │  (Carrusel autoplay)       │
└─────────────────────────┴────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  5. Ticker (a sangre, 30s/vuelta)                    │  ← SOLO chip='todas'
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  6. En tu ciudad / Más ofertas activas               │  ← SIEMPRE visible
│     (Lista densa, hasta 15 ofertas en card única)    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  7. Populares · Esta semana                          │  ← SOLO chip='todas'
│     (Carrusel autoplay, cierre)                      │
└──────────────────────────────────────────────────────┘
```

En **móvil**, los pares se apilan stack (1 columna) en lugar de 2 columnas.

### 7.2 SLOTS detallados

#### SLOT 1 — Hero "Hoy te recomendamos" (carrusel rotativo)

| Propiedad | Valor |
|-----------|-------|
| Componente | `CardOfertaHero variante="destacado"` envuelto en wrapper rotativo |
| Hook de datos | `useOfertaDestacadaDelDia` (override admin) + `useOfertasFeedPopulares` (top 10) |
| Hook de rotación | `useCarruselRotativo(items, 7000)` — cambia cada 7 segundos |
| Cantidad | Hasta **5 ofertas** rotando |
| ¿Rota? | **SÍ** — fade-in 450ms al cambiar (key remount), pausa al hover sobre la sección |
| Cómo se llena | 1) Si hay override admin → va PRIMERO (pinned). 2) Se completa con top populares hasta 5, sin duplicar. |
| ¿Filtra por ciudad? | El override admin NO filtra (contenido editorial global), pero SÍ recibe lat/lng para mostrar distancia. Las populares SÍ filtran por ciudad. |
| ¿Depende del chip? | Solo visible cuando `feedEditorialVisible` (chip='todas' AND `!vistaExpandida`) |
| Indicadores | Dots `IndicadoresRotacion` debajo (solo si `total > 1`): pill ámbar activo + dots gris |
| Navegación manual | **Swipe horizontal** en móvil (umbral 60px) o **flechas Chevron** en desktop (visibles al hover) |
| Tamaño fijo | El área de descripción reserva siempre `min-h-[2.75rem] lg:min-h-[3rem]` (alto de 2 líneas) aunque la oferta no tenga descripción — así todas las cards rotativas miden lo mismo y no hay saltos visuales al cambiar |
| Microseñales | Cinta ámbar, pill descuento animado, flama imagen, flama Vence X, CTA Ver oferta, pill vistas oscuro |

#### SLOT 2 — Destacado "También interesante" (carrusel rotativo)

| Propiedad | Valor |
|-----------|-------|
| Componente | `CardOfertaHero variante="destacado"` envuelto en wrapper rotativo |
| Hook de datos | `useOfertasFeedRecientes` (top 10) + fallback `useOfertasFeedPopulares` |
| Hook de rotación | `useCarruselRotativo(items, 7000)` — cambia cada 7 segundos |
| Cantidad | Hasta **5 ofertas** rotando |
| ¿Rota? | **SÍ** — fade-in 450ms al cambiar, pausa al hover |
| Cómo se llena | Top recientes EXCLUYENDO los IDs ya pintados en SLOT 1. Si recientes < 3, completar con populares restantes (también excluyendo SLOT 1). |
| Condición extra | Solo se muestra si `ofertas.length >= 5` (sino se oculta para no romper layout) |
| ¿Filtra por ciudad? | SÍ — usa hooks que sí filtran |
| ¿Depende del chip? | Solo visible cuando `feedEditorialVisible` |
| Indicadores | Dots `IndicadoresRotacion` debajo (solo si `total > 1`) |
| Navegación manual | Mismo patrón que SLOT 1 (swipe móvil + flechas desktop) |
| Tamaño fijo | Mismo `min-h` de 2 líneas en descripción para igualar altura entre rotaciones |
| Microseñales | Mismas que SLOT 1 |

#### SLOT 3 — Carrusel "Últimas horas" (Vencen pronto)

| Propiedad | Valor |
|-----------|-------|
| Componente | `BloqueCarruselAuto` con `iconoLucide={Flame}` |
| Hook | `useOfertasFeedVencenPronto` |
| Endpoint | `GET /api/ofertas/feed?orden=vencen_pronto&limite=10` |
| Cantidad | Hasta **10 ofertas** en carrusel infinito |
| ¿Rota? | **SÍ** — autoplay 25 seg/vuelta. Loop sin corte (cards duplicadas en el track). |
| ¿Pausa? | Sí, al hover (desktop) o touch (móvil) |
| ¿Cada cuánto se actualiza? | RQ `staleTime: 5 min` |
| Cómo se llena | Backend ordena por `o.fecha_fin ASC` |
| ¿Filtra por ciudad? | SÍ |
| ¿Depende del chip? | Solo visible cuando `chip = 'todas'` |
| Microseñales | Pill flotante "VENCE EN X H" en cards con `fecha_fin <= 48h` |

#### SLOT 4 — Carrusel "Recién publicadas"

| Propiedad | Valor |
|-----------|-------|
| Componente | `BloqueCarruselAuto` con `iconoLucide={Sparkles}` |
| Hook | `useOfertasFeedRecientes` |
| Endpoint | `GET /api/ofertas/feed?orden=recientes&limite=10` |
| Cantidad | Hasta 10 ofertas |
| ¿Rota? | SÍ — autoplay 25 seg/vuelta |
| ¿Cada cuánto se actualiza? | `staleTime: 5 min` |
| Cómo se llena | Backend ordena por `o.created_at DESC` |
| ¿Filtra por ciudad? | SÍ |
| ¿Depende del chip? | Solo visible cuando `chip = 'todas'` |
| Microseñales | Pill flotante "NUEVA" en cards con `createdAt <= 48h` |

#### SLOT 5 — Ticker (Banner de logos)

| Propiedad | Valor |
|-----------|-------|
| Componente | `TickerOfertas` |
| Fuente | `ofertas` (resultado de `useOfertasFeedCerca`) — TODOS los negocios con al menos 1 oferta activa en la ciudad |
| Cálculo | Deduplicación por `negocioId` dentro del componente |
| Cantidad | Sin tope (limitado por el `LIMIT 100` del feed) |
| ¿Rota? | **SÍ** — marquesina horizontal, **38 seg/vuelta** (más calmado que los carruseles) |
| ¿Pausa? | Al hover/touch |
| Estilo | **Sin contenedor** — logos flotando sobre el gradient azul del MainLayout. Cada item: logo circular `w-10 h-10 lg:w-11 lg:h-11` con `ring-amber-400/40` + nombre del negocio bold |
| Padding mínimo | 10 items en el track — si hay menos, repite la lista para que el loop no se vea repetido |
| ¿Filtra por ciudad? | SÍ (la fuente sí) |
| ¿Depende del chip? | Solo visible cuando `feedEditorialVisible` (chip 'todas' AND no expandida) |

#### SLOT 6 — Lista densa "Más ofertas activas" / Catálogo

| Propiedad | Valor |
|-----------|-------|
| Componente | 2 layouts según estado |
| Hook | `useOfertasFeedCerca` |
| Endpoint | `GET /api/ofertas/feed` con params del chip activo + GPS + búsqueda |
| Cantidad | Hasta **8 visibles** en compacto (`ofertas.slice(0, 8)`); TODAS en grid expandido |
| ¿Rota? | **NO** — lista estática |
| Cómo se llena | Filtro completo del chip + GPS + búsqueda del Navbar global |
| ¿Filtra por ciudad? | SÍ — fundamental |
| **SIEMPRE visible** | Sí — único slot que sigue ahí incluso con filtro activo |

**Layouts del SLOT 6:**

1. **Compacto** (cuando `chipActivo === 'todas' AND !vistaExpandida`):
   - 3 columnas en desktop: collage de fotos izq + lista única de 8 filas + collage de fotos der.
   - Cada fila usa `<CardOfertaLista />` separadas por `border-t-[1.5px] border-[#f0eee9]`.
   - Los collages son decorativos (fotos rotadas con opacidad) y solo se ven con la lista editorial completa.
   - Título: "En tu ciudad / Más ofertas activas".

2. **Grid limpio** (cuando hay chip activo ≠ 'todas' OR `vistaExpandida === true`):
   - Grid 1 col móvil / 2 cols lg+, sin collages laterales.
   - Cada card en su propio contenedor con borde y sombra.
   - Muestra TODAS las ofertas (no slice).
   - Títulos:
     - Chip activo (Hoy, Esta semana, etc.): "Filtro · X / Resultados: X".
     - Vista expandida: "Catálogo completo / Todas las ofertas (N)".

   **Por qué dos layouts**: con un chip activo (típicamente 1-3 resultados) o catálogo completo (>20 ofertas), los collages laterales decorativos se ven vacíos o desproporcionados. El grid limpio es semánticamente correcto: filtrar = ver catálogo, no la portada editorial.

**Estados**: Sin GPS+chip='cerca' → prompt activar GPS. Cargando → spinner. Error → reintentar. Vacío → CTA "Ver todas" que resetea filtros.

#### SLOT 7 — Carrusel "Populares · Esta semana" (Cierre)

| Propiedad | Valor |
|-----------|-------|
| Componente | `BloqueCarruselAuto` con `iconoLucide={TrendingUp}` |
| Hook | `useOfertasFeedPopulares` |
| Endpoint | `GET /api/ofertas/feed?orden=populares&limite=10` |
| Cantidad | Hasta 10 ofertas |
| ¿Rota? | SÍ — autoplay 25s |
| ¿Cada cuánto se actualiza? | `staleTime: 5 min` |
| Cómo se llena | Backend ordena por COUNT vistas últimos 7 días (con tiebreaker `created_at DESC`). Top 3 vienen marcadas con `esPopular=true`. |
| ¿Filtra por ciudad? | SÍ |
| ¿Depende del chip? | Solo visible cuando `chip = 'todas'` |
| Microseñales | Pill flotante "POPULAR" en las primeras 3 cards (las que el backend marcó con `esPopular=true`) |

### 7.3 Sumario de comportamiento al filtrar

```
chip = 'todas' AND !vistaExpandida  →  Editorial completa (Hero + Destacado + Vencen + Recientes + Ticker + Lista 3-col + Populares)
chip = 'todas' AND vistaExpandida   →  Solo Catálogo grid 2-col con TODAS las ofertas
chip ≠ 'todas'                       →  Solo Catálogo grid 2-col filtrado
```

El usuario tiene un cambio fuerte e inmediato cuando filtra o entra a modo catálogo. La lista densa muestra título "Resultados: X" / "Todas las ofertas (N)" para clarificar.

---

## 8. Filtros, chips y búsqueda

### 8.1 Chips situacionales

7 chips siempre visibles dentro del header negro (estilo Negocios variante inline). Estado activo: `bg-white text-slate-900`. Inactivo: `bg-white/10 text-white/70 border-white/15`.

| Chip | Icono Lucide | Comportamiento |
|------|--------------|----------------|
| Todas | — | **Toggle de `vistaExpandida`** (no es filtro) — alterna entre vista editorial y catálogo grid |
| Hoy | Calendar | `creadasUltimasHoras: 24` (creadas últimas 24h) |
| Esta semana | CalendarDays | `creadasUltimasHoras: 168` (creadas últimos 7 días) |
| Cerca | Locate | `orden: 'distancia'` (requiere GPS) |
| CardYA | CreditCard | `soloCardya: true` — etiqueta UI "Aceptan CardYA" |
| Nuevas | Sparkles | `orden: 'recientes'` (sin filtro temporal) |

**Notas:**
- `mas_vistas` es chip válido del store pero **NO tiene chip visible**. Se activa SOLO desde el CTA primario "⚡ Lo más visto" del header (evita duplicación). Cuando activo, la lista filtrada muestra "Resultados: Más vistas" y para volver al feed completo el usuario toca cualquier otro chip.
- "Aceptan CardYA" (label UI). El valor interno del store sigue siendo `'cardya'`.

### 8.2 CTAs del header

| CTA | Acción | Estado |
|-----|--------|--------|
| ⚡ Lo más visto | `setChipActivo('mas_vistas')` | Funcional |

(Botón "Categorías" eliminado — era placeholder sin handler.)

### 8.3 Búsqueda

NO hay buscador local en `/ofertas`. El **buscador del Navbar global** (escribe en `useSearchStore.query`) es la fuente única.

- Placeholder dinámico: cuando estás en `/ofertas`, el Navbar muestra "Buscar ofertas..." (controlado por `placeholderSeccion(seccion)` en `useSearchStore.ts`).
- `useOfertasFeedCerca` lee `useSearchStore.query` y lo pasa al backend como `busqueda`.
- Cleanup al salir de `/ofertas`: `useSearchStore.cerrarBuscador()` limpia el query global para no contaminar otras secciones.

---

## 9. Identidad visual y animaciones

### 9.1 Paleta de la sección Ofertas

| Token | Color | Uso |
|-------|-------|-----|
| Marca principal | `#1a1a1a` (negro) | Header, pills primarios, texto principal |
| Acento de identidad | `amber-500` `#f59e0b` / `amber-600` `#d97706` | Logo gradient, "Locales", líneas decorativas, eyebrows, CTAs, ring del pill descuento |
| Borde sutil | `#e8e6e0` (beige claro) | Bordes de cards (`border-2`) |
| Divisor lista | `#f0eee9` | Divisores entre filas (`border-t-[1.5px]`) |
| Texto principal | `#1a1a1a` | Títulos y datos importantes |
| Texto secundario | `#6b6b6b` | Cuerpo, footer info |
| Texto metadata | `#888` | Eyebrows neutros, distancias |
| Texto placeholder | `#b8b4a8` | Inputs, iconos vacíos |
| Urgencia | gradient `from-amber-500 to-orange-600` | Pill "Vence X" cuando ≤2 días |
| Flama imagen | gradient lineal rojo→naranja→amarillo (`#dc2626 → #f97316 → #fde047`) | SVG en esquina sup. derecha del Hero/Destacado |

### 9.2 Tokens aplicados (TOKENS_GLOBALES)

| Regla | Aplicación |
|-------|-----------|
| `border-2` (2px) en interactivos | Cards, inputs, chips, botones — verificado |
| `border-t-[1.5px]` en divisores | Líneas entre filas de lista densa |
| `shadow-md` en cards de panel | Todas las cards y la card contenedora de lista densa |
| `shadow-lg` solo en flotantes | Pill descuento del Hero |
| Pesos mínimos `font-medium` | Eyebrows usan `font-semibold/bold`. Datos en `font-bold/extrabold` |
| Tamaños texto datos | Cumple `text-sm` mín móvil/desktop, `text-[11px]` en lg cuando aplica |
| **Excepción documentada** | Chips inline usan `border` (1px) para coincidir visualmente con los chips de Negocios — patrón existente del proyecto |

### 9.3 Header sticky con compresión

Componente `HeaderOfertas`:

- **Estado normal** (scroll < 40px): hero grande con eyebrow ciudad, título "Las ofertas en {ciudad}", subtítulo decorativo "DESCUENTOS CERCA DE TI", KPI grande, CTA "Lo más visto", chips.
- **Estado comprimido** (scroll > 100px): logo compacto + título "Ofertas Locales" + KPI "16 OFERTAS HOY" + CTA + chips. Subtítulo y líneas decorativas se ocultan.
- **Histéresis 100/40**: entrar a comprimido al pasar 100px, salir al bajar de 40px. Evita parpadeo en scrolls oscilantes.
- **Lectura del scroll**: `useScrollDirection({ scrollRef: mainScrollRef })` — necesario porque en móvil el scroll vive dentro del `<main>`, no en `window`.
- **Patrón visual**: idéntico al header de Negocios/CardYA/Guardados (panel `#000000` con glow radial + grid pattern + `lg:rounded-b-3xl`).

### 9.4 Animaciones (todas respetan `prefers-reduced-motion`)

| Animación | Componente | Detalle |
|-----------|-----------|---------|
| Carrusel autoplay | `BloqueCarruselAuto` | CSS `translateX(0 → -50%)` en **40s** linear infinite. Cards duplicadas en track para loop sin corte. Pausa al hover/touch. |
| Ticker marquesina | `TickerOfertas` | Mismo patrón pero **38s** y `gap: 36px`. Padding mínimo de 10 items. |
| Underline título | `TituloDeBloque` | One-shot expand 0→**180px** (normal) / 0→**240px** (destacado) / 0→**110px** (variante `corto`) en 600-700ms al renderizar. Re-anima con `key={slug}` al cambiar de bloque. |
| Icono cuadrado del título | `TituloDeBloque` | Pulse-once scale 1→1.08→1 en 700ms al cargar. |
| Pill descuento sheen | `CardOfertaHero` destacado | Luz blanca diagonal cruza el pill UNA vez al cargar (delay 600ms, dur 1500ms). |
| Pill descuento ring | `CardOfertaHero` destacado | Ring ámbar pulsa lento (**3500ms** infinite) — 2px → 4px de grosor. |
| Flama imagen (gradient rojo-amarillo) | `CardOfertaHero` destacado | `hero-flame` flicker infinito (**1500ms**, scale + rotate). Drop shadow rojo. |
| Flama del pill "Vence X" (blanca contorno rojo) | `CardOfertaHero` destacado, urgente | Mismo `hero-flame` flicker. INDEPENDIENTE del pill (absolute, sobresale). |
| CTA "VER OFERTA →" | `CardOfertaHero` destacado | Flecha hace `translateX(4px)` al hover de la card (250ms ease-out). |
| Hover card destacado | `CardOfertaHero` destacado | `hover:shadow-amber-500/15`, imagen scale 1.03. |
| Hover card carrusel | `CardOfertaCarrusel` | `hover:shadow-lg hover:shadow-amber-500/10`, imagen scale 1.04. |
| Rotación par superior | `useCarruselRotativo` + `oferta-rotativa-fade` | Cambia oferta cada 7000ms. Al cambiar, la nueva card hace fade-in (`opacity 0 + translateY(6px) → opacity 1 + translateY(0)` en 450ms). Pausa al hover. Respeta `prefers-reduced-motion`. |
| Indicadores tipo dots | `IndicadoresRotacion` | Pill ámbar `w-5 h-1.5` para el dot activo, `w-1.5 h-1.5` para los demás (gris `#d6d2c8`). Transición 300ms entre estados. |
| Swipe drag-en-vivo | `CarruselRotativoSwipe` + `useCarruselRotativo` | Embla Carousel maneja el drag con su engine interno: el container `flex` sigue al dedo a 1:1 durante el touch/mouse drag, y al soltar anima al slide más cercano en **300 ms** (`duration: 30` en unidades Embla). `dragThreshold: 4` para que el dedo arranque la transición casi al instante. La animación corre con `requestAnimationFrame` sobre el transform del container, no con CSS transitions. |
| Flechas desktop | `CarruselRotativoSwipe` | `ChevronLeft` y `ChevronRight` absolute al `top-[30%]` (centrado vertical sobre la imagen, no sobre el card completo). Solo visibles en `lg+`. Aparecen al hover del wrapper (`opacity-0 group-hover/swipe:opacity-100`). Rounded `bg-white/80 hover:bg-white shadow-md`. |

---

## 9.5 Modal de detalle (`ModalOfertaDetalle`)

El modal de detalle de oferta tiene varios bloques de información, en orden vertical:

1. **Imagen a sangre** con badges flotantes:
   - Pill descuento (esquina sup-izq, color por tipo).
   - Pill vistas "live count" oscuro (esquina inf-izq).
   - Badge urgencia (esquina inf-der, gradient + icono Flame/Clock).
   - Botones acciones (esquina sup-der: share, like, close).
2. **Header del negocio** (nuevo, 1 May 2026):
   - Logo circular con ring blanco translúcido.
   - Nombre del negocio en font-bold.
   - **Sucursal**: aplica reglas:
     - Negocio de 1 sola sucursal (sucursalNombre = negocioNombre, totalSucursales ≤ 1) → no se muestra (evita duplicar).
     - Multi-sucursal y esta es la matriz → muestra "Matriz".
     - Multi-sucursal y sucursal con nombre propio → muestra el nombre real.
   - **Click en el header**: cierra el modal y navega a `/negocios/:sucursalId` (perfil in-app autenticado). Para shared links, el flow es distinto (ver §3.5 / DropdownCompartir usa `/p/oferta/:id` público).
3. **Título** de la oferta (h2 grande).
4. **Descripción** completa.
5. **Lista de sucursales** (si `totalSucursales > 1`): bloque "Disponible en N sucursales" con cada sucursal mostrando nombre + distancia + dirección + botones WhatsApp/teléfono individuales por sucursal. Datos vienen de `GET /:id/sucursales`.
6. **Info adicional** (vence, compra mínima) + acciones de contacto (ChatYA, WhatsApp principal del negocio).

## 9.6 Métricas visibles en cards

Cada card del feed muestra el contador de vistas (`oferta.totalVistas`) para dar contexto al filtro **"Lo más visto"** y al ordenamiento `populares`. Sin esta señal, el usuario no entendería por qué unas ofertas aparecen antes que otras.

| Card | Ubicación del pill | Estilo |
|------|-------------------|--------|
| `CardOfertaHero` destacado | Esquina **inf-derecha** de la imagen | "Live count" oscuro: `bg-black/60 backdrop-blur-sm`, texto blanco, `Eye` filled blanco. No compite con el descuento (sup-izq) ni la flama (sup-der). |
| `CardOfertaCarrusel` | Footer del panel, **derecha en la misma línea** que la distancia | Pill ámbar: `bg-amber-50 text-amber-700 ring-1 ring-amber-200`, `Eye` con `fill="currentColor" fillOpacity={0.18}` |
| `CardOfertaLista` | Esquina **inf-derecha** de la fila (absolute) | Pill ámbar idéntico al carrusel. El badge de descuento se mueve a la **esquina sup-derecha** para no chocar |

El pill se muestra **siempre**, incluso con `totalVistas = 0` — no es decoración condicional, es una métrica permanente. El `title` del span lo verbaliza para accesibilidad: `"5 vistas"` / `"1 vista"`.

## 10. Comportamiento responsive

3 escalas: **móvil base**, **`lg:`** (laptop ≥1024px), **`2xl:`** (desktop ≥1536px).

| Elemento | Móvil | lg | 2xl |
|---------|-------|----|----|
| Header negro | A sangre, sin rounded | `lg:rounded-b-3xl`, `lg:max-w-7xl lg:mx-auto lg:px-6` | `2xl:px-8` |
| Pares 2 columnas (Hero+Destacado, Vencen+Recientes) | Stack 1 columna | 2 columnas `gap-x-5` | `2xl:gap-x-6` |
| Cards de carrusel | `w-[200px]` | `w-[220px]` | `w-[240px]` |
| Lista densa fila | foto 56×56 | foto 64×64 | foto 72×72 |
| Hero "Oferta del día" aspect | `aspect-[4/3]` | `aspect-[21/9]` | `aspect-[21/9]` |
| Logo Hero destacado | `w-11 h-11` | `lg:w-12 lg:h-12` | igual |
| Padding panel Hero destacado | `p-4` | `lg:p-3 lg:px-4` | igual |
| Logo en Ticker | `w-10 h-10` | `lg:w-11 lg:h-11` | igual |
| Logo flotante en Carrusel | `w-9 h-9` | igual | igual |
| Padding lateral del feed | `px-4` | `lg:px-6` | `2xl:px-8` (igualado al header — evita que el contenido sobresalga) |
| Chips del header | `flex-start` con scroll-x | `lg:justify-center` | igual |
| Buscador del Navbar | colapsable con botón lupa | inline siempre visible | igual |

---

## 11. Migraciones SQL aplicadas

Ambas ya aplicadas en Supabase prod.

| Archivo | Tabla / Cambio | Estado |
|---------|----------------|--------|
| `docs/migraciones/2026-04-29-crear-ofertas-destacadas.sql` | Crea `ofertas_destacadas` | ✅ aplicada |
| `docs/migraciones/2026-04-29-crear-oferta-vistas.sql` | Crea `oferta_vistas` | ✅ aplicada |
| `docs/migraciones/2026-05-01-oferta-vistas-deduplicar-por-dia.sql` | Anti-inflación: limpia duplicados existentes, agrega `uniq_oferta_vistas_por_dia` (1 vista/user/día calendario Sonora), recalcula `metricas_entidad.total_views` consistentes con la nueva semántica | ✅ aplicada en local (1 May 2026) |
| `docs/migraciones/2026-05-01-oferta-clicks.sql` | Crea tabla `oferta_clicks` gemela con índice único por día. Soporta el split impression/engagement adoptado el 1 May 2026 | ✅ aplicada en local + prod (1 May 2026) |
| `docs/migraciones/2026-05-01-oferta-shares.sql` | Crea tabla `oferta_shares` gemela con índice único por día. Alinea shares al modelo de vistas/clicks (anti-inflación 1/usuario/día) | ✅ aplicada en local + prod (1 May 2026) |

---

## 12. Pendientes futuros

### Backend
- **UI admin para fijar la oferta del día** (Panel Admin). Hoy solo `INSERT` directo en SQL.
- **`calificacionPromedio` y `totalReseñas`** en `OfertaFeedRow` — necesario para mostrar estrellas en cards. Ya existen en `negocio_sucursales` (joinear).
- **Endpoint para listar/CRUD `ofertas_destacadas`** — lectura ya existe, falta gestión.
- **Cron diario opcional** que rote la "oferta del día" automáticamente cada 24h entre el TOP-N popular.
- **Endpoint dedicado `/api/negocios-con-ofertas-activas`** — alternativa más eficiente para el ticker (devuelve solo `[id, nombre, logoUrl]`). Hoy reusa el feed con LIMIT 100, suficiente para beta de 50 negocios pero conviene optimizar antes de escalar.

### Frontend
- **Velocidad adaptativa del ticker** — con muchos negocios el track se hace muy ancho y los logos pasan vertiginosamente. Ajustar `Math.max(38, negocios * 1.5)` segundos cuando crezca a 30+ negocios.
- **Botón "Categorías"** del header (placeholder eliminado en última iteración — recuperar cuando exista flujo de categorías).
- **Paginación real** del feed con `offset` cuando una ciudad rebase 100 ofertas activas (hoy se cubren con `LIMIT 100` default).
- **Pre-fetch del modal de detalle** al hover sobre cualquier card (patrón ya existente en `useNegocioPrefetch`).
- **Animación "rotación dentro del slot"** para "Hoy te recomendamos" / "Destacado" si se quiere ciclar entre múltiples destacadas en lugar de una fija.
- **Patrón de inyección de styles HMR-safe** — el patrón actual con `if (document.getElementById(STYLES_ID)) return` no actualiza en HMR. Ya corregido en `TituloDeBloque`; replicar en `BloqueCarruselAuto`, `TickerOfertas`, `CardOfertaHero`.

### Decisiones descartadas (documentar para no reabrir)
- **Pausar carruseles fuera del viewport con IntersectionObserver** — se intentó (1 May 2026), descartado por complejidad vs beneficio. Las animaciones `translateX` son GPU-accelerated y cuestan ~0% CPU. Si en beta surgen problemas reales de batería en móviles viejos, retomar con scroll listener directo + `getBoundingClientRect`.
- **Forzar misma altura entre par "Hoy te recomendamos" y "Destacado"** (con `flex-1 + mt-auto`) — descartado: cuando una card no tiene descripción y la otra sí, el aire vacío forzado se ve peor que la diferencia natural de altura.

---

## 13. Referencias cruzadas

| Documento | Cuándo consultarlo |
|-----------|-------------------|
| `docs/arquitectura/Promociones.md` | Para entender el CRUD de ofertas desde Business Studio (qué crea el comerciante que luego se ve en este feed) |
| `docs/arquitectura/Negocios.md` | Para entender el filtro por ciudad y cómo Ofertas reusa el patrón |
| `docs/arquitectura/CardYA.md` | Para entender el flag `participa_puntos` que activa el chip "CardYA" |
| `docs/estandares/PATRON_REACT_QUERY.md` | Patrón obligatorio para datos del servidor — Ofertas lo aplica completo |
| `docs/estandares/TOKENS_GLOBALES.md` | Reglas de `border-2`, `shadow-md`, pesos mínimos, etc. |
| `docs/estandares/TOKENS_COMPONENTES.md` | Patrón de chips, cards, inputs, headers |
| `docs/estandares/Guia_Responsive_Laptop_AnunciaYA.md` | Tablas exactas del patrón base / `lg:` / `2xl:` |
| `docs/reportes/ofertas-publicas-prompt-1-cierre.md` | Backend Prompt 1 (auth, params, tabla destacadas, endpoint destacada-del-dia) |
| `docs/reportes/ofertas-publicas-prompt-1.5-cierre.md` | Backend Prompt 1.5 (tabla `oferta_vistas` para popularidad por ventana) |
| `docs/reportes/ofertas-publicas-prompt-2-cierre.md` | Frontend base — tipos, store, hook, OfertaCard extendido |
| `docs/reportes/ofertas-publicas-prompt-3-cierre.md` | Frontend feed editorial — Hero, carruseles, ticker, banner, fixes |
| `docs/reportes/ofertas-publicas-prompt-4-cierre.md` | Rediseño completo a estética editorial blanca |
| `docs/reportes/ofertas-publicas-prompt-5-cierre.md` | Ajustes Marketplace — header negro con compresión, acento amber |
| `docs/reportes/fix-navbar-coordenadas-cierre.md` | Fix Navbar auto-detección desktop |

---

## Decisiones clave (resumen)

1. **Login obligatorio en toda la sección.** La vista pública compartible es `/ofertas/publico/:codigo` (sin auth), no el feed.
2. **Filtro por ciudad reactivo.** Cambiar ciudad en el header global actualiza TODOS los bloques que dependen de `useGpsStore`. Hero "Oferta del día" es la única excepción intencional (contenido editorial global).
3. **Chip ≠ "Todas" oculta el feed editorial.** Decisión UX: el chip prominente debe sentirse fuerte. Solo queda la lista filtrada.
4. **Buscador único** del Navbar global. No hay buscador local en `/ofertas` (se conecta vía `useSearchStore`).
5. **Acento ámbar** = identidad visual. Negocios=azul, CardYA/Guardados=rose, Ofertas=ámbar.
6. **2 cards privilegiadas** ("Hoy te recomendamos" + "Destacado") con variante visual rica (cinta ámbar, animaciones, logo, flamas, CTA grande). El resto del feed es discreto.
7. **Carruseles independientes del chip** — son secciones editoriales con identidad propia (orden fijo). Solo "En tu ciudad" reacciona al filtro.
8. **Resiliencia ante migraciones pendientes.** Endpoints degradan graciosamente si las tablas nuevas no existen, sin lanzar 500.
9. **Animaciones one-shot vs infinitas.** Underline y pill sheen son one-shot al cargar (no distraen). Carruseles, ticker, ring y flamas son infinitas pero respetan `prefers-reduced-motion`.
10. **Ancho consistente.** Header sticky y contenido del feed comparten `lg:max-w-7xl lg:px-6 2xl:px-8`. El ticker se extiende a sangre con `-mx-4 lg:-mx-6 2xl:-mx-8` que coincide exactamente con el padding del wrapper.
