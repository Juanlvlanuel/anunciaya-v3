# Arquitectura — Sección Servicios

> **Estado:** En desarrollo activo (Sprint 4/8 completados a fecha 2026-05-17).
> **Visión estratégica:** `docs/VISION_ESTRATEGICA_AnunciaYA.md` §3.2.

## Visión general

**Servicios** es la sección pública de AnunciaYA para servicios e intangibles entre vecinos. Cubre dos modos:

| Modo | Tipo | Subtipo | Casos típicos |
|---|---|---|---|
| **`ofrezco`** | `servicio-persona` | `servicio-personal` | "Plomería 24h", "Diseño web para negocios", "Pastelería para eventos" |
| **`solicito`** | `solicito` | `servicio-puntual` | "Busco fotógrafo para boda", "Necesito plomero urgente" |
| **`solicito`** | `solicito` | `busco-empleo` | "Busco trabajo de mesero" (auto cuando `categoria='empleo'`) |
| **`solicito`** | `vacante-empresa` | `vacante-empresa` | Vacantes publicadas desde BS Sprint 8 (no desde Servicios) |

**Modo Personal estricto**: toda la sección está protegida por `ModoPersonalEstrictoGuard`. Un usuario en modo comercial (con negocio) no puede acceder a `/servicios`.

**Ciudad de beta**: Puerto Peñasco, Sonora. El feed filtra por `usuarios.ciudad === ciudad.nombre`.

---

## Base de datos

### Tablas principales

| Tabla | Filas (~beta) | Propósito |
|---|---|---|
| `servicios_publicaciones` | 100-500 | Publicaciones (ofrezco/solicito) |
| `servicios_preguntas` | 50-200 | Q&A público en el detalle |
| `servicios_resenas` | 20-100 | Reseñas tras un servicio entregado |
| `servicios_busquedas_log` | crece | Log de queries del buscador (para "populares") |

### `servicios_publicaciones`

```sql
id                   uuid PK
usuario_id           uuid FK→usuarios (CASCADE delete)
modo                 varchar(20)   -- 'ofrezco' | 'solicito'
tipo                 varchar(30)   -- 'servicio-persona' | 'vacante-empresa' | 'solicito'
subtipo              varchar(30)   -- 'servicio-personal' | 'busco-empleo' | 'servicio-puntual' | 'vacante-empresa'
titulo               varchar(80)
descripcion          text
fotos                jsonb default '[]'
foto_portada_index   smallint default 0
precio               jsonb         -- discriminated union (ver abajo)
modalidad            varchar(20)   -- 'presencial' | 'remoto' | 'hibrido'
ubicacion            geography(Point,4326)  -- exacta, NUNCA se devuelve al FE
ubicacion_aproximada geography(Point,4326)  -- con offset random de ~500m
ciudad               varchar(100)
zonas_aproximadas    varchar(150)[]
skills               text[] (max 8, solo servicio-persona)
requisitos           text[] (solo vacante-empresa)
horario              varchar(150) nullable
dias_semana          varchar(3)[]
presupuesto          jsonb nullable -- { min, max } solo tipo='solicito'
categoria            varchar(20) nullable -- solo modo='solicito'
urgente              boolean default false
confirmaciones       jsonb         -- snapshot legal del wizard
estado               varchar(20) default 'activa' -- 'activa' | 'pausada' | 'eliminada'
total_vistas         integer default 0
total_mensajes       integer default 0
total_guardados      integer default 0
expira_at            timestamptz   -- NOW() + 30 días al crear
created_at           timestamptz
updated_at           timestamptz
deleted_at           timestamptz nullable
```

**Constraints CHECK:**
- `modo` ∈ ('ofrezco', 'solicito')
- `tipo` ∈ ('servicio-persona', 'vacante-empresa', 'solicito')
- `subtipo` ∈ los 4 valores listados arriba
- `modalidad` ∈ ('presencial', 'remoto', 'hibrido')
- `estado` ∈ ('activa', 'pausada', 'eliminada')
- `precio->>'kind'` ∈ ('fijo', 'hora', 'rango', 'mensual', 'a-convenir')
- `skills` máximo 8
- `presupuesto` IS NULL OR `tipo='solicito'`
- `categoria` IS NULL OR `modo='solicito'`
- `categoria` ∈ 6 valores: hogar, cuidados, eventos, belleza-bienestar, empleo, otros

**Índices:**
- Btree: `estado`, `ciudad`, `usuario_id`, `created_at DESC`, `expira_at`, `(modo, tipo)`
- GIST: `ubicacion_aproximada` (para `ST_DWithin` cercanos)
- GIN: FTS sobre `to_tsvector(titulo || descripcion)` para buscador
- Parcial: `idx_servicios_pub_solicito_categoria` (categoria, estado, created_at) WHERE modo='solicito'
- Parcial: `idx_servicios_pub_solicito_urgente` (urgente DESC, created_at DESC) WHERE modo='solicito' AND estado='activa'

### Discriminated union `precio` (JSONB)

```ts
type Precio =
  | { kind: 'fijo';       monto: number; moneda?: 'MXN' }     // pago único
  | { kind: 'hora';       monto: number; moneda?: 'MXN' }     // por hora
  | { kind: 'mensual';    monto: number; moneda?: 'MXN' }     // mensual (vacantes BS)
  | { kind: 'rango';      min: number; max: number; moneda?: 'MXN' }  // "$X–$Y"
  | { kind: 'a-convenir' }                                     // sin precio fijado
```

El wizard actual (v2, 3 pasos) **siempre normaliza** `budgetMin/budgetMax` strings → precio según modo:
- `modo='solicito'`: `precio = { kind: 'a-convenir' }` y `presupuesto = { min, max }` aparte.
- `modo='ofrezco'`: si min=max → `fijo`, si min<max → `rango`, si vacíos → `a-convenir`.

### `servicios_resenas`

```sql
id              uuid PK
publicacion_id  uuid FK→publicaciones (CASCADE)
autor_id        uuid FK→usuarios (CASCADE)
destinatario_id uuid FK→usuarios (CASCADE)
rating          smallint  CHECK rating BETWEEN 1 AND 5
texto           varchar(200) nullable
created_at      timestamptz
deleted_at      timestamptz
```

**Constraint UNIQUE**: `(publicacion_id, autor_id)` — una reseña por autor por publicación.
**Constraint CHECK**: `autor_id <> destinatario_id` — sin self-review.

### `servicios_preguntas`

```sql
id             uuid PK
publicacion_id uuid FK→publicaciones (CASCADE)
autor_id       uuid FK→usuarios (CASCADE)
pregunta       varchar(200)
respuesta      varchar(500) nullable
respondida_at  timestamptz nullable
editada_at     timestamptz nullable
created_at     timestamptz
```

**Visibilidad pública** (calculada en backend, ver `services/servicios/preguntas.ts`):
- Visitante anónimo: solo respondidas (`respondida_at IS NOT NULL`).
- Autor de la pregunta: sus pendientes + todas las respondidas.
- Dueño de la publicación: todas (pendientes y respondidas).

### Migraciones aplicadas

| Fecha | Archivo | Cambio |
|---|---|---|
| 2026-05-15 | `2026-05-15-servicios-base.sql` | 4 tablas core |
| 2026-05-15 | `2026-05-15-chat-servicios-fk.sql` | `chat_conversaciones.servicio_publicacion_id` |
| 2026-05-15 | `2026-05-15-seeds-servicios-dev.sql` | 5 publicaciones de prueba |
| 2026-05-16 | `2026-05-16-servicios-categoria-urgente.sql` | Cols `categoria` + `urgente` + 2 CHECK + 2 índices parciales |
| 2026-05-16 | `2026-05-16-seeds-clasificados-dev.sql` | 5 pedidos solicito + update del existente con categoría |
| 2026-05-16 | `2026-05-16-categorias-clasificados-v2.sql` | Migración a 6 cats (de 7 a 5 macro + Otros) con remapeo |

---

## Backend

### Estructura de archivos

```
apps/api/src/
├── db/schemas/schema.ts                    # Drizzle: tablas serviciosPublicaciones, serviciosResenas, serviciosPreguntas
├── services/
│   ├── servicios.service.ts                # CRUD core de publicaciones (~830 líneas)
│   └── servicios/
│       ├── perfilPrestador.ts              # Perfil + KPIs + listado de publicaciones + reseñas (Sprint 5)
│       ├── preguntas.ts                    # Q&A público
│       └── buscador.ts                     # Sugerencias en vivo + búsqueda full text
├── controllers/servicios.controller.ts     # Orquestadores HTTP
├── routes/servicios.routes.ts              # Rutas REST
├── validations/servicios.schema.ts         # Zod schemas (~500 líneas)
└── utils/aleatorizarUbicacion.ts           # Offset random ~500m para ubicacion_aproximada
```

### Endpoints REST

Base: `/api/servicios`

**Públicos (`verificarTokenOpcional`):**

```
GET    /feed?ciudad=&lat=&lng=&modo=                       # Feed inicial {recientes, cercanos}
GET    /feed/infinito?ciudad=&lat=&lng=&modo=&tipo=&...    # Paginado con filtros (orden + categoria + soloUrgente)
GET    /publicaciones/:id                                  # Detalle público con oferente embebido
POST   /publicaciones/:id/vista                            # Incrementa total_vistas (sin auth)
GET    /publicaciones/:id/preguntas                        # Q&A público (filtro de privacidad)
GET    /buscar/sugerencias?q=&ciudad=                      # Top 5 en vivo
GET    /usuarios/:usuarioId                                # Perfil base + KPIs (rating promedio, total reseñas)
GET    /usuarios/:usuarioId/publicaciones?estado=&limit=   # Publicaciones del prestador
GET    /usuarios/:usuarioId/resenas?limit=                 # Reseñas con autor embebido
```

**Privados (`verificarToken + requiereModoPersonal`):**

```
POST   /upload-imagen                  # Genera presigned URL R2 (prefijo `servicios/`)
DELETE /foto-huerfana                  # Body { url } — limpieza tras cancelar wizard (ref count antes de borrar)
GET    /mis-publicaciones?estado=      # Paginado de las propias
POST   /publicaciones                  # Crear (con validación Zod profunda)
PUT    /publicaciones/:id              # Editar (UPDATE dinámico)
PATCH  /publicaciones/:id/estado       # Toggle 'activa' ↔ 'pausada'
DELETE /publicaciones/:id              # Soft delete
POST   /publicaciones/:id/preguntas    # Autor pregunta
POST   /preguntas/:id/responder        # Dueño responde
PUT    /preguntas/:id/mia              # Autor edita su pregunta pendiente
DELETE /preguntas/:id/mia              # Autor retira su pregunta pendiente
DELETE /preguntas/:id                  # Dueño elimina cualquier pregunta de su publicación
```

### Patrones técnicos clave

**1. `aleatorizarCoordenada(lat, lng)`** — desplaza la coordenada exacta dentro de un disco uniforme de ~500m. Aplicado a `ubicacion_aproximada` al insertar. La `ubicacion` exacta NUNCA se devuelve al frontend; el feed/detalle solo expone `ubicacionAproximada` con `ST_X/ST_Y`.

**2. `pgArrayLiteral(arr)`** — helper interno que serializa `string[]` JS a literal PostgreSQL (`'{}'` vacío, `'{"a","b"}'` no vacío con escape). Sin este helper, Drizzle no serializa correctamente arrays vacíos al pasar `${[]}::text[]` y genera `()::text[]` sintácticamente inválido.

**3. `eliminarFotoServicioSiHuerfana(url, excluirPublicacionId?)`** — borra una URL de R2 SOLO si no aparece en `servicios_publicaciones.fotos` de ninguna fila viva. Patrón mark-and-sweep + reference count. Usado por:
- El controller `DELETE /foto-huerfana` (wizard al cancelar/borrar borrador).
- `actualizarPublicacion` cuando el usuario quita una foto al editar.

**4. Filtro orden urgente para solicito** — en `obtenerFeedInfinito`, cuando `modo='solicito'`, el orden por defecto es `urgente DESC, created_at DESC` para que los pedidos urgentes salgan al top del widget Clasificados. Aprovecha el índice parcial `idx_servicios_pub_solicito_urgente`.

**5. Subqueries de KPIs del prestador** — `obtenerPerfilPrestador` ejecuta una sola query con 3 subqueries para `rating_promedio`, `total_resenas`, `total_publicaciones_activas`. Más simple que JOIN + GROUP BY y suficientemente rápido para 100-500 publicaciones por prestador en la beta.

---

## Frontend

### Estructura de archivos

```
apps/web/src/
├── types/servicios.ts                         # Tipos compartidos (PublicacionServicio, PerfilPrestador, etc.)
├── utils/
│   ├── servicios.ts                           # formatearPrecio, formatearPresupuesto, labelCategoria, tonoCategoria
│   └── optimizarImagen.ts                     # Helper compartido (canvas → WebP 1920px máx, calidad 0.85)
├── hooks/
│   ├── useWizardServicios.ts                  # Estado wizard 3 pasos + localStorage + validación
│   └── queries/useServicios.ts                # 12 hooks React Query: feed, detalle, mutations, Q&A, perfil
├── config/queryKeys.ts                        # Keys: servicios.feed, .feedInfinito, .publicacion, .prestador, etc.
├── components/servicios/
│   ├── ServiciosHeader.tsx                    # Header negro persistente (variantes 'feed' / 'pagina')
│   ├── CardServicio.tsx
│   ├── CardVacante.tsx
│   ├── CardHorizontal.tsx
│   ├── ChipsFiltros.tsx
│   ├── ClasificadosWidget.tsx                 # Widget de pedidos (modo='solicito') en el feed
│   ├── OfreceToggle.tsx
│   ├── OferenteCard.tsx
│   ├── GaleriaServicio.tsx                    # Scroll-snap + lightbox + dots
│   ├── BarraContactoServicio.tsx              # ChatYA + WhatsApp
│   ├── SeccionPreguntasServicio.tsx
│   ├── MapaPlaceholderServicio.tsx
│   ├── FABPublicar.tsx                        # FAB con 2 opciones Ofrezco/Solicito
│   ├── OverlayBuscadorServicios.tsx
│   └── wizard/
│       ├── WizardServiciosLayout.tsx          # Contenedor + nav inferior flotante mobile + banner nextHelp desktop
│       ├── WizardSeccionCard.tsx              # Card reusable para cada sección del paso
│       ├── ChipInputList.tsx                  # Input + chips removibles
│       ├── Paso1QueNecesitas.tsx              # Categoría + título + descripción + urgente
│       ├── Paso2Detalles.tsx                  # Fotos + modalidad + presupuesto + zonas
│       ├── Paso3Revisar.tsx                   # Preview en vivo + 3 confirmaciones legales
│       └── ModalExitoPublicacion.tsx          # Modal éxito tras publicar
└── pages/private/servicios/
    ├── PaginaServicios.tsx                    # Feed (recientes + cercanos + widget Clasificados)
    ├── PaginaServicio.tsx                     # Detalle (cards separados por sección)
    ├── PaginaPublicarServicio.tsx             # Orquestador del wizard
    └── PaginaPerfilPrestador.tsx              # Perfil con tabs Servicios/Reseñas
```

### Rutas

```
/servicios                          # Feed
/servicios/publicar?modo=ofrezco    # Wizard
/servicios/publicar?modo=solicito   # Wizard
/servicios/usuario/:usuarioId       # Perfil del prestador
/servicios/:id                      # Detalle (debe ir DESPUÉS de /publicar y /usuario)
```

Las rutas específicas (`publicar`, `usuario/:id`) declaradas **antes** de `/servicios/:id` en `router/index.tsx` para que React Router no capture el segmento como `:id`.

### Patrones técnicos clave

**1. `ServiciosHeader` con 2 variantes** — `'feed'` (toggle Ofrecen/Solicitan + chips de filtros + KPI N publicaciones) y `'pagina'` (slot derecho personalizable + breadcrumb opcional + subtítulo mobile). Persistente en TODAS las rutas de `/servicios`.

**2. Wizard v2 (3 pasos)**:
- Estado: `useWizardServicios` con `localStorage` (claves `aya:servicios:wizard:draft-v2` y `aya:servicios:wizard:step-v2`).
- 3 pasos lineales para ambos modos. Subtipo inferido por categoría (`empleo` → `busco-empleo`, resto → `servicio-puntual`).
- `nextHelp`: mensaje contextual de qué falta (banner amarillo desktop / texto en nav inferior mobile).
- Modal de éxito con 2 acciones: "Ver mi anuncio" (redirect al detalle) y "Publicar otro" (reset wizard).
- Cancelación = limpieza R2: el ref `urlsSubidasEnSesion: Set<string>` rastrea las fotos subidas y dispara `DELETE /foto-huerfana` para cada una al cancelar/borrar borrador.

**3. Optimización de fotos cliente-side** — `optimizarImagen()` aplica resize a 1920px máx y conversión a **WebP calidad 0.85** (reduce 70-90% el peso). El wizard sube directo a R2 con `image/webp` independiente del formato original.

**4. Galería con scroll-snap nativo** — `GaleriaServicio.tsx` usa CSS puro `snap-x snap-mandatory overflow-x-auto` + listener `scroll` pasivo que recalcula el índice activo. Click abre `ModalImagenes` fullscreen (mismo de MP). Mismo patrón que `GaleriaArticulo` de MarketPlace.

**5. Widget Clasificados** — embebido en el feed para `tipo='solicito'`. Tag strip de filtros con 8 chips (todos, urgente, 6 categorías sin 'otros'). KPI dinámico según filtro activo (`6 pedidos hoy` cuando 'todos', `2 en Eventos` cuando filtro). Urgentes pinned al top con eyebrow rojo. Footer con CTAs "Publicar pedido" + "Ver los N".

**6. Cards por sección** — tanto el detalle como el wizard usan el mismo patrón visual: cada bloque vive en su propio `WizardSeccionCard` / `SeccionCard` (`bg-white rounded-2xl border-[1.5px] border-slate-300 + shadow suave`) sobre fondo transparente que hereda el gradiente azul del `MainLayout`.

### Categorías de Clasificados

Las 6 categorías (lowercase, kebab-case en BD; con tildes en UI vía `labelCategoria`):

| BD | Label UI | Cubre |
|---|---|---|
| `hogar` | Hogar | Plomería, electricidad, A/C, jardín, limpieza, mudanzas, albañilería |
| `cuidados` | Cuidados | Niñeras, tutorías, ancianos, paseadores, cuidadores de mascotas |
| `eventos` | Eventos | Bodas, XV, catering, fotografía, mariachi, decoración |
| `belleza-bienestar` | Belleza y bienestar | Estilismo, masajes, manicura, spa a domicilio, entrenamiento |
| `empleo` | Empleo | "Busco trabajo" / "Busco empleado para mi negocio" (auto subtipo `busco-empleo`) |
| `otros` | Otros | Fallback — no aparece como filtro UI, sí como opción en wizard |

"Urgente" es boolean independiente (`urgente: true`), NO una categoría. Se combina con cualquier categoría.

---

## Flujos clave

### A. Publicar un servicio (modo=ofrezco)

```
FAB del feed
  → click "Ofrezco un servicio"
  → /servicios/publicar?modo=ofrezco
  → useWizardServicios siembra modo='ofrezco', tipo='servicio-persona', subtipo='servicio-personal'
  → Paso 1: usuario no escoge categoría (oculta para ofrezco), llena título + descripción
  → Paso 2: sube fotos optimizadas a R2, escoge modalidad, llena presupuesto (rango), agrega zonas
  → Paso 3: revisa preview, marca las 3 confirmaciones legales
  → click "Publicar"
  → POST /api/servicios/publicaciones
    - construirPayload() arma el shape exacto
    - precio = rango si min<max, fijo si min=max, a-convenir si vacíos
    - presupuesto = undefined
  → backend valida con crearPublicacionSchema (Zod)
  → INSERT con SQL crudo (geography + jsonb)
  → invalidación de queryKey servicios.all
  → modal éxito → "Ver mi anuncio" navega a /servicios/{idCreado}
```

### B. Publicar un pedido (modo=solicito)

```
FAB → "Solicito un servicio" o widget Clasificados → "Publicar pedido"
  → /servicios/publicar?modo=solicito
  → useWizardServicios siembra modo='solicito', tipo='solicito', subtipo=null (se decide en paso 1)
  → Paso 1: usuario escoge categoría → subtipo se infiere (empleo → busco-empleo, resto → servicio-puntual). Toggle urgente opcional.
  → Paso 2: fotos opcionales, modalidad, presupuesto rango, zonas
  → Paso 3: preview con badge "Solicito" + tres confirmaciones
  → POST → precio={kind:'a-convenir'}, presupuesto={min,max}, categoria, urgente
  → INSERT
  → modal éxito → redirect a detalle
```

### C. Ver detalle de una publicación

```
Click en una card del feed
  → /servicios/:id
  → ServiciosHeader variante='pagina' con pill del tipo
  → usePublicacionServicio(id) → GET /publicaciones/:id (incluye oferente embebido)
  → useRegistrarVistaServicio() POST /publicaciones/:id/vista (dedupe en sessionStorage)
  → Render condicional por tipo:
    - servicio-persona → GaleriaServicio 4:3 + skills + sin requisitos
    - vacante-empresa → portada 16:9 con logo + sección Requisitos
    - solicito → sin galería destacada + bloque presupuesto amber
  → Cards separados: cabecera, descripción, especialidades, modalidad+ubicación, Q&A
  → BarraContactoServicio fija inferior móvil + inline desktop
  → Click "Ver perfil" del OferenteCard → /servicios/usuario/{oferenteId}
```

### D. Ver perfil de un prestador

```
/servicios/usuario/:usuarioId
  → ServiciosHeader variante='pagina' con pill "Perfil"
  → 3 hooks paralelos:
    - usePerfilPrestador(id) → GET /usuarios/:id (KPIs)
    - usePublicacionesDelPrestador(id) → GET /usuarios/:id/publicaciones
    - useResenasDelPrestador(id) → GET /usuarios/:id/resenas
  → Bloque identidad: avatar + nombre + ciudad + "Miembro desde" + rating chip + KPIs
  → Tabs: Servicios activos [N] | Reseñas [N]
  → Tab Servicios: grid 2/3 cols con CardServicio/CardVacante
  → Tab Reseñas: card de promedio + lista densa con autor+rating+texto+publicación origen
```

---

## Decisiones de producto importantes

1. **Sin BS Vacantes en Servicios** — las vacantes corporativas vienen del módulo BS (Sprint 8 pendiente). El wizard de Servicios NO permite publicar `tipo='vacante-empresa'`; eso requiere modo comercial. El feed sí muestra las vacantes (`CardVacante` con banda sky y verificado).

2. **Wizard único para los 2 modos** — el FAB elige modo, el wizard se adapta. Se eligió contra la opción "wizards separados" para reducir mantenimiento y compartir validaciones.

3. **Solo 2 estados del ciclo de vida**: `activa` ↔ `pausada`. NO existe `vendida` (un servicio no se agota; si ya no se ofrece, se elimina). El soft delete usa `estado='eliminada'` + `deleted_at`.

4. **`expira_at = NOW() + 30 días`** al crear. Cron de Sprint 7 auto-pausa cuando vence sin interacción y notifica al dueño con CTA "Reactivar".

5. **Las categorías son solo para `modo='solicito'`**. Las publicaciones `ofrezco` NO tienen categoría — su discoverability viene del título/descripción y del buscador. Decisión tomada para simplificar el feed (categorías solo aplican a "lo que se busca").

6. **`bg-transparent` heredando el gradiente azul** del MainLayout en todas las páginas de Servicios. Cada bloque significativo vive en su propio card blanco (`SeccionCard` / `WizardSeccionCard`). Patrón consistente con BS y Negocios.

---

## Pendientes (Sprint 9+ y polish)

Ver `docs/reportes/Servicios/2026-05-17-progreso-y-pendientes.md` para el detalle.

Resumen ejecutivo:
- **Sprint 7 (cerrado 2026-05-17)**: Mis Publicaciones (pausar/reactivar/eliminar propio), cron de expiración 30 días, edición desde wizard, reseñas, moderación pasiva.
- **Sprint 8 (cerrado 2026-05-17)**: BS Vacantes — módulo en Business Studio. 3 campos nuevos en BD (`sucursal_id`, `tipo_empleo`, `beneficios`) + estado `'cerrada'`. KPIs + tabs + tabla + detalle inline + slideover de creación/edición. Filtrado por sucursal activa (cada sucursal sus propias vacantes). 25 tests Vitest. **Sin tabla `postulaciones`** — los interesados contactan vía ChatYA; en BS se mide "Conversaciones iniciadas" (= total_mensajes). Evolución a postulaciones formales queda para Sprint 9+ si la beta valida demanda.
- **Sprint 9+ (post-launch)**: cron mensual que pueble `usuarios.servicio_tiempo_respuesta_minutos` calculando desde `chat_mensajes` + filtrado de ChatYA por contexto de vacante específica (botón "Ver mis conversaciones" del detalle BS hoy es placeholder).
- **Decisión 2026-05-17 — Identidad verificada descartada del MVP**: No hay forma sostenible de validar identidad real en la beta (manual no escala más allá de los 50 negocios piloto; terceros como Truora/MetaMap cuestan $1-5 USD por validación, no rentable sin ingresos todavía). La columna `usuarios.identidad_verificada` se descartó de la migración antes de subir a `main` — el repo nunca la incluyó. El perfil del prestador muestra rating, total de publicaciones activas, miembro desde, y tiempo de respuesta (cuando exista). Reevaluar como beneficio premium del plan $449/mes para Sprint 9+.

---

## Lecciones técnicas relevantes

| Lección | Detalle | Aplicado en |
|---|---|---|
| `unaccent` no se puede usar en GIN index | Es STABLE no IMMUTABLE. Solución: omitir del CREATE INDEX, aplicar solo en SELECT. | Buscador `services/servicios/buscador.ts` |
| Arrays vacíos en Drizzle sql template | `${[]}::text[]` genera `()::text[]` inválido. Solución: helper `pgArrayLiteral()`. | `crearPublicacion`, `actualizarPublicacion` |
| `column reference "id" is ambiguous` en JOIN | Cuando el SELECT hace JOIN, los nombres sin alias colisionan. Solución: prefijo `sp.` en todas las columnas. | `COLUMNAS_PUBLICACION` |
| `useEmblaCarousel` necesita memoizar options | Pasarlos inline causa reInit en cada render. | (No usamos Embla en Servicios; lo evitamos con scroll-snap nativo) |
| Mismatch ciudad "Puerto Peñasco, Sonora" vs "Puerto Peñasco" | El GPS store devuelve la forma corta. Los seeds deben usar `'Puerto Peñasco'` sin estado. | Seeds dev + comentario en `seed-clasificados-dev.sql` |

---

## Documentos relacionados

- `docs/VISION_ESTRATEGICA_AnunciaYA.md` §3.2 — Visión estratégica de Servicios.
- `docs/estandares/TOKENS_GLOBALES.md` — 13 reglas de diseño (texto, tonos, bordes, etc.).
- `docs/estandares/PATRON_REACT_QUERY.md` — Patrón estándar de queries en el frontend.
- `docs/estandares/PATRON_BUSCADOR_SECCION.md` — Overlay del buscador.
- `docs/estandares/Sistema_Navegacion_Back.md` — `useVolverAtras` usado en todas las páginas.
- `docs/arquitectura/Mantenimiento_R2.md` — Reconcile + reference count para fotos huérfanas.
- `docs/arquitectura/ChatYA.md` — Cards de contexto `subtipo='servicio_publicacion'`.

---

**Última actualización:** 2026-05-17 · Sprints 1-6 + subsprints (Clasificados, Wizard v2) completados.
