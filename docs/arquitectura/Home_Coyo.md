# Home "Pregúntale a [ciudad]" / Coyo — AnunciaYA v3.0

> El Home es un feed conversacional. Cada vecino publica preguntas para su
> ciudad ("¿quién arregla una fuga urgente?") y **Coyo** — un asistente con
> IA — responde unos segundos después con resultados reales sacados del
> catálogo de la app (Negocios + MarketPlace + Servicios + Ofertas). La
> pregunta queda viva para que otros vecinos también la respondan, marquen
> "yo también quiero saber", y el autor pueda gestionarla (cerrar, marcar
> resuelta, editar antes de que reciba respuestas, o borrar).
>
> Visión completa: `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4.

---

## Flujo de una pregunta (de punta a punta)

```
1. Vecino escribe en el Home y pulsa Publicar.
                │
                ▼
2. POST /api/preguntas-comunidad
   → INSERT en preguntas_comunidad con estado_coyo='pendiente'
   → Responde 201 al frontend al instante (la pregunta YA aparece en el feed).
   → Dispara fire-and-forget: procesarPreguntaConCoyo(id).catch(log)
                │
                ▼                     ┌─ FRONTEND ────────────────────────┐
3. Orquestador (en segundo plano):    │ Cada card monta useEstadoCoyo(id, │
   a) UPDATE estado_coyo='procesando' │   estadoInicial)                  │
   b) Cajita IA → interpretarPregunta │ Si estadoInicial es 'pendiente' o │
      (clasifica + extrae tokens)     │   'procesando' → sondea cada 2s a │
   c) buscarEnTodaLaApp({q, ciudad})  │   GET /api/preguntas-comunidad/   │
      → 4 buscadores en paralelo      │   :id/coyo                        │
   d) Cajita IA → redactarRespuesta   │ Al llegar a estado final ('listo',│
   e) Filtros de consistencia         │   'sin_respuesta' o 'no_aplica')  │
   f) UPDATE estado_coyo='listo' +    │   → refetchInterval = false,      │
      respuesta_coyo + resultados     │   sondeo se detiene SOLO.         │
                                      └───────────────────────────────────┘
                │
                ▼
4. Card de la pregunta muestra el bloque de Coyo según estadoCoyo:
   - pendiente/procesando → "Coyo está pensando…" con loader
   - listo (con resultados) → "Coyo encontró esto para ti" + texto + cards
   - listo (sin resultados) → "Coyo dice" + texto cálido invitando a comunidad
   - no_aplica → texto de redirección amable (sin cards)
   - sin_respuesta → "Esperando respuestas de la comunidad" (Coyo no pudo)
```

**Modelo:** publicación instantánea + sondeo ligero del cliente. **Sin
Socket.io** — el polling es trivial y se autoapaga al llegar a estado
final.

---

## Tablas

### `preguntas_comunidad`

`apps/api/src/db/schemas/schema.ts:2565` (cerca del final del archivo).

| Columna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | — |
| `usuario_id` | uuid NOT NULL | — | FK a `usuarios(id)` ON DELETE CASCADE |
| `texto` | varchar(500) NOT NULL | — | Pregunta del vecino |
| `ciudad` | varchar(120) NOT NULL | — | Nombre de ciudad (texto plano, sin FK a `regiones`) |
| `estado` | varchar(100) NOT NULL | — | Estado geográfico ("Sonora") — NO confundir con `estado_pregunta` |
| `estado_pregunta` | varchar(20) NOT NULL | `'activa'` | `'activa' \| 'cerrada' \| 'oculta'` |
| `created_at` / `updated_at` | timestamptz | `now()` | — |
| **`resuelta_at`** | timestamptz | `NULL` | Si el autor la marcó como resuelta. La pregunta sigue `'activa'`, solo muestra un badge "Resuelta" en la UI |
| **`respuesta_coyo`** | text | `NULL` | Texto cálido que redacta Coyo |
| **`resultados_coyo`** | jsonb | `NULL` | `{ negocios, ofertas, marketplace, servicios }` (shape del buscador unificado) |
| **`estado_coyo`** | varchar(20) NOT NULL | `'pendiente'` | 5 valores (ver abajo) |
| **`coyo_procesado_at`** | timestamptz | `NULL` | Cuándo terminó el orquestador |

### `respuestas_preguntas_comunidad`

Respuestas que los vecinos dejan en las preguntas del Home (hilo plano —
sin threads).

| Columna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | — |
| `pregunta_id` | uuid NOT NULL | — | FK a `preguntas_comunidad(id)` ON DELETE CASCADE |
| `usuario_id` | uuid NOT NULL | — | FK a `usuarios(id)` ON DELETE CASCADE (autor de la respuesta) |
| `texto` | text NOT NULL | — | CHECK: `length(texto) BETWEEN 1 AND 1000` |
| `estado` | varchar(20) NOT NULL | `'activa'` | `'activa' \| 'borrada'` — soft-delete (el autor de la respuesta puede borrarla) |
| `created_at` / `updated_at` | timestamptz | `now()` | — |

Índices:
- `idx_respuestas_pregunta_creacion (pregunta_id, created_at) WHERE estado='activa'` — listado cronológico ascendente.
- `idx_respuestas_usuario (usuario_id)` — "mis respuestas" futuro.

### `preguntas_interesados`

Marca de "yo también quiero saber" — un vecino expresa interés en una
pregunta que NO es suya. Idempotente por PK compuesta.

| Columna | Tipo | Default | Notas |
|---|---|---|---|
| `pregunta_id` | uuid NOT NULL | — | FK a `preguntas_comunidad(id)` ON DELETE CASCADE |
| `usuario_id` | uuid NOT NULL | — | FK a `usuarios(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | `now()` | — |
| **PK** | (`pregunta_id`, `usuario_id`) | — | Compuesta — un usuario puede marcar UNA vez por pregunta (idempotente con `ON CONFLICT DO NOTHING`) |

**Estados de `estado_coyo`:**

| Valor | Significado |
|---|---|
| `pendiente` | Recién creada, Coyo aún no la toca |
| `procesando` | Coyo está trabajando |
| `listo` | Coyo respondió (hay `respuesta_coyo`; `resultados_coyo` puede tener grupos vacíos si no encontró nada pero sí redactó) |
| `sin_respuesta` | Coyo no pudo (IA caída tras todos los reintentos + 0 resultados, o error inesperado). La pregunta vive para la comunidad |
| `no_aplica` | Coyo redirige amable. Cubre 3 sub-casos: (a) `tipo='no_local'` — la pregunta no era búsqueda local (matemáticas, charla); (b) `tipo='vaga'` — sí es local pero demasiado ambigua (ej. *"quien me ayuda con la casa?"*); en este sub-caso `respuesta_coyo` contiene un mensaje específico generado por Gemini con sugerencias para reformular; (c) `tipo='inapropiada'` — drogas, armas, sexo explícito, agresión. En este sub-caso ADEMÁS `estado_pregunta` pasa a `'oculta'` para que la pregunta NO aparezca en el feed de ningún vecino |

**Índices:**

- `idx_preguntas_comunidad_ciudad_fecha (ciudad, created_at DESC)` — feed por ciudad
- `idx_preguntas_comunidad_usuario (usuario_id)` — "mis preguntas"
- `idx_preguntas_comunidad_coyo_pendientes (estado_coyo, created_at DESC) WHERE estado_coyo IN ('pendiente','procesando')` — parcial, preparado para un cron futuro que rescate preguntas atascadas

---

## Backend del feed

| Pieza | Archivo |
|---|---|
| Service principal | `apps/api/src/services/preguntasComunidad.service.ts` (`crearPregunta`, `listarPreguntasPorCiudad`, `listarMisPreguntas`, control del autor) |
| Service respuestas | `apps/api/src/services/respuestasPreguntasComunidad.service.ts` |
| Service interés | `apps/api/src/services/interesPreguntasComunidad.service.ts` |
| Service notificaciones de Coyo | `apps/api/src/services/coyo/notificacionesCoyo.service.ts` |
| Controller | `apps/api/src/controllers/preguntasComunidad.controller.ts` |
| Routes | `apps/api/src/routes/preguntasComunidad.routes.ts` — todas con `verificarToken` |
| Types | `apps/api/src/types/preguntasComunidad.types.ts` |

**Endpoints:**

```
POST    /api/preguntas-comunidad                               crearPreguntaController
GET     /api/preguntas-comunidad?ciudad=&limit=&offset=        listarPreguntasPorCiudadController
GET     /api/preguntas-comunidad/mis-preguntas                 listarMisPreguntasController  ← histórico del autor
GET     /api/preguntas-comunidad/:id/coyo                      obtenerEstadoCoyoController   ← sondeo

POST    /api/preguntas-comunidad/:preguntaId/respuestas        crearRespuestaController
GET     /api/preguntas-comunidad/:preguntaId/respuestas        listarRespuestasController
DELETE  /api/preguntas-comunidad/respuestas/:respuestaId       borrarMiRespuestaController

POST    /api/preguntas-comunidad/:preguntaId/interes           marcarInteresController
DELETE  /api/preguntas-comunidad/:preguntaId/interes           quitarInteresController

POST    /api/preguntas-comunidad/:preguntaId/cerrar            cerrarMiPreguntaController
POST    /api/preguntas-comunidad/:preguntaId/resolver          marcarResueltaController
DELETE  /api/preguntas-comunidad/:preguntaId                   borrarMiPreguntaController
PATCH   /api/preguntas-comunidad/:preguntaId                   editarMiPreguntaController
```

Orden de declaración importante en `routes.ts`: las rutas estáticas
(`/mis-preguntas`, `/respuestas/:respuestaId`) van **antes** que las
dinámicas (`/:preguntaId/...`) — Express toma la primera que matchea.

- `crearPregunta` hace `INSERT` y luego **fire-and-forget** a `procesarPreguntaConCoyo(nueva.id)` con `.catch(log)`. La publicación NO espera ni falla por Coyo.
- `listarPreguntasPorCiudad`:
  - Filtra por `estadoPregunta = 'activa'` (las `'oculta'` no aparecen — útil para preguntas inapropiadas que Coyo cierra automáticamente).
  - Devuelve los 4 campos de Coyo + 3 conteos (`totalRespuestas`, `totalInteresados`, `yoTambienInteresado`) + `resueltaAt`, todos calculados con subqueries inline. Los índices de `respuestas_preguntas_comunidad` y la PK compuesta de `preguntas_interesados` mantienen cada subquery en O(log n).
  - **Antes** del SELECT ejecuta `cerrarPreguntasVencidasDeCiudad(ciudad)` — el "cron pasivo" de expiración 14d (ver §Expiración pasiva).
- `listarMisPreguntas` NO filtra por estado — devuelve `'activa'`, `'cerrada'` y `'oculta'` para que el autor gestione su histórico (la vista `/inicio/mis-preguntas`).
- `obtenerEstadoCoyo` devuelve solo los 4 campos de Coyo (`{ estadoCoyo, respuestaCoyo, resultadosCoyo, coyoProcesadoAt }`), usado por el polling.

### Respuestas, interés y control del autor

| Endpoint | Reglas |
|---|---|
| `crearRespuesta` | Texto 1–1000 chars. La pregunta debe estar `'activa'` (cerrada/oculta no aceptan). **Dispara notificación `pregunta_comunidad_respondida` al autor de la pregunta** (fire-and-forget, bloqueada si el responder es el propio autor). |
| `listarRespuestas` | Solo `estado='activa'`, orden cronológico ascendente (la más vieja primero — flujo natural de conversación). |
| `borrarMiRespuesta` | Soft-delete (estado='borrada'). **Solo el autor de la respuesta** puede borrarla — el autor de la PREGUNTA no cura el tablón (decisión de producto: confiar en la comunidad). Idempotente. |
| `marcarInteres` / `quitarInteres` | Idempotentes: `INSERT ... ON CONFLICT DO NOTHING` / `DELETE`. Devuelven el conteo `totalInteresados` actualizado. Bloqueado en el frontend para el AUTOR de la pregunta (no tiene sentido auto-marcarse). |
| `cerrarMiPregunta` | El autor cambia `estado_pregunta='cerrada'`. La pregunta sale del feed pero las respuestas se conservan. |
| `marcarResuelta` | El autor pone `resuelta_at=NOW()`. La pregunta sigue `'activa'` y puede recibir más respuestas, pero la UI muestra un badge "Resuelta". |
| `borrarMiPregunta` | Soft-delete: `estado_pregunta='oculta'`. La pregunta y sus respuestas se conservan en BD pero desaparecen del feed. |
| `editarMiPregunta` | **Solo si `totalRespuestas === 0`** — backend valida y devuelve 409 si ya hay respuestas activas. Al editar resetea los campos de Coyo (`estado_coyo='pendiente'`, demás a null) y re-dispara `procesarPreguntaConCoyo` fire-and-forget. |

### Service centralizado `negocioManagement` (no aplica aquí)

Las preguntas del Home tienen sus propios services dedicados — NO usan
`negocioManagement.service.ts` (que es para CRUD de negocios). El patrón
"controllers → services" se mantiene: ningún controller arma SQL ni toca
otra tabla directamente.

---

## Buscador unificado de Coyo

**Archivo:** `apps/api/src/services/coyo/buscadorUnificado.ts`
**Función:** `buscarEnTodaLaApp({ q, ciudad, lat?, lng?, usuarioId? })`

Llama a los **4 buscadores existentes en paralelo** con `Promise.allSettled`:

| Área | Función llamada | Datos ricos expuestos por ítem |
|---|---|---|
| Negocios | `listarSucursalesCercanas` (de `negocios.service.ts`) | `rating`, `totalResenas`, `verificado`, `estaAbierto` |
| Ofertas | `buscarOfertas` | `negocioRating`, `diasParaVencer` |
| MarketPlace | `buscarArticulos` | `condicion`, `aceptaOfertas` |
| Servicios | `buscarServicios` | (ninguno — su rating requiere AVG al vuelo, pendiente) |

**Características:**

- Máximo 3 ítems por área (`LIMIT_POR_AREA = 3`).
- **Tolerante a fallos:** si una sección lanza, su grupo queda `{ items: [], total: 0, error: 'busqueda_fallida' }` y las otras 3 siguen.
- Resultados normalizados a `ItemUnificado { id, tipo, titulo, subtitulo, imagen, + 8 ricos opcionales }`.
- **No** devuelve URLs — el frontend resuelve la ruta del detalle a partir de `tipo + id`.
- Pasa `modoFlexible: true` a las 4 llamadas (ver siguiente sección).
- Pasa `ciudad` también a Negocios (filtro estricto) para garantizar que Coyo nunca mezcle ciudades.

### Subtítulo de tarjetas de Negocio — sucursales por ciudad

Cuando un negocio tiene **más de una sucursal en la misma ciudad** del vecino,
el subtítulo de la tarjeta agrega el nombre de la sucursal para que el vecino
pueda distinguirlas. Cuando solo hay una en su ciudad, el subtítulo es solo
la ciudad (aunque el negocio tenga sucursales en otras ciudades).

| Sucursales en la ciudad | Subtítulo |
|---|---|
| 1 | `Puerto Peñasco` |
| >1, esta es la matriz | `Matriz · Puerto Peñasco` |
| >1, no es matriz | `Sucursal Centro · Puerto Peñasco` (con el nombre real de la sucursal) |

El helper `construirSubtituloNegocio()` decide en `buscadorUnificado.ts`. Usa
el campo `totalSucursalesEnCiudad` del SQL de `listarSucursalesCercanas`
(distinto al `totalSucursales` global — ver §Limitaciones para por qué).

---

## Modo flexible (OR solo para Coyo)

Por defecto los 4 buscadores usan `plainto_tsquery` (AND implícito) + un solo
`ILIKE` de la frase completa. Eso hace que una query como `"plomería fontanero"`
exija que ambas palabras estén en el mismo registro → devuelve 0 cuando solo
hay "Plomería residencial". Es correcto para usuarios que escriben prefijos
cortos en los overlays de búsqueda, pero rompe a Coyo que envía 1-3 palabras
clave extraídas por Gemini.

**Solución:** parámetro `modoFlexible?: boolean` (default `false`) en los 4
buscadores. Cuando es `true`:

- FTS usa `websearch_to_tsquery` con tokens unidos por `OR` (cualquier palabra matchea).
- Cada ILIKE se vuelve un OR por palabra (`%t1% OR %t2% OR %t3%`).

**Solo Coyo lo activa.** Los usuarios normales (sin flag) siguen con el
comportamiento histórico AND. Helper compartido:
`apps/api/src/services/_helpers/busquedaFlexible.ts` (`tokenizarQuery`,
`unirOr`).

### Campos que se buscan en cada modo

El `ILIKE` substring contra **texto libre largo** (descripciones, requisitos)
es seguro en modo normal porque el usuario escribe deliberadamente la frase
completa, pero se vuelve veneno en modo flexible: una palabra suelta extraída
por Gemini puede aparecer como substring literal dentro de otra palabra
distinta y traer resultados irrelevantes. Por eso, en modo flexible los
buscadores limitan el ILIKE a **campos cortos y curados** (nombres, títulos,
nombres de categoría). El FTS español (con stemming + diccionario) sigue
cubriendo el texto principal correctamente.

| Buscador | Modo normal (usuarios) | Modo flexible (Coyo) |
|---|---|---|
| Marketplace | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`) | FTS + ILIKE(`titulo`) |
| Servicios | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`) + EXISTS(`skills`, `requisitos`) | FTS + ILIKE(`titulo`) |
| Ofertas | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`, `negocio.nombre`) + EXISTS(`subcategorias`, `categorias`) | FTS + ILIKE(`titulo`, `negocio.nombre`) + EXISTS(`subcategorias`, `categorias`) |
| Negocios | ILIKE(`negocio.nombre`, `sucursal.nombre`, `direccion`, `ciudad`) + EXISTS(`subcategorias`, `categorias`) | igual (todos los campos son cortos y curados) |

**Regla guía:** el ILIKE substring solo es seguro contra columnas que el
comerciante o el catálogo escriben deliberadamente. Los textos libres largos
se eliminan en modo flexible.

**Principio:** preferible que Coyo devuelva **0 resultados** y deje la
pregunta para la comunidad, a que devuelva resultados borderline irrelevantes
contradiciendo su propio texto.

### Plurales en inglés y el stemmer español

El stemmer Snowball Spanish que usa Postgres NO quita la `s` final de
palabras inglesas porque no las reconoce como raíces españolas:

```sql
SELECT websearch_to_tsquery('spanish', 'laptops')::text;  -- 'laptops' (sin estemizar)
SELECT to_tsvector('spanish', 'Laptop HP 15 Intel')::text;
-- '15':3 'hp':2 'intel':4 'laptop':1   (el documento tiene 'laptop')
-- → 'laptops' y 'laptop' no matchean, aunque sean la misma palabra.
```

Para palabras en español el stemmer SÍ funciona (`tortillas → tortill`
matchea con `tortilla → tortill`). El problema es exclusivo de préstamos del
inglés (laptop, software, smartphone, hotdog, etc.).

**Mitigación:** el prompt de `interpretarPregunta` le pide explícitamente a
Gemini que devuelva el **SINGULAR** para palabras inglesas. Esto cubre
prácticamente todos los casos en producción.

**Documento maestro del patrón FTS:** `docs/estandares/PATRON_BUSCADOR_FTS.md`
— incluye la receta del wrapper `public.immutable_unaccent` (portable a
Supabase) y las 7 trampas conocidas.

---

## Cajita de IA (`coyoIA.service.ts`)

**Archivo:** `apps/api/src/services/coyo/coyoIA.service.ts`

**Es el ÚNICO archivo del backend que importa `@google/genai`.** Si en el
futuro se migra a otra LLM (Claude, GPT, etc.), solo se toca este archivo.

- Librería: `@google/genai ^2.6.0` (la oficial vigente — la antigua
  `@google/generative-ai` está descontinuada).
- Modelo principal: `gemini-2.5-flash`.
- Modelo fallback: `gemini-2.0-flash`.
- Cliente singleton **lazy** (se construye en el primer uso real, no al arrancar).

### Funciones expuestas

```typescript
interpretarPregunta(texto: string): Promise<RespuestaIA<PreguntaInterpretada>>
  // → { tipo: TipoPregunta, terminos: string, mensajeReformular: string }

redactarRespuestaCoyo(pregunta: string, resultados: unknown): Promise<RespuestaIA<string>>
  // → texto cálido (1-2 frases) presentando los resultados.

RespuestaIA<T> =
  | { disponible: true; data: T }
  | { disponible: false; razon: 'sin_api_key' | 'error_gemini' | 'error_parseo' };
```

Las dos funciones NUNCA lanzan. Si Gemini falla tras todos los reintentos
y el fallback, devuelven `{ disponible: false, razon }`. El caller decide
cómo manejar la ausencia.

**`GEMINI_API_KEY` es OPCIONAL** en `apps/api/src/config/env.ts`:
`z.string().min(1).optional()`. Si falta, el server arranca igual y Coyo
queda "apagado" (las preguntas terminan en `sin_respuesta`) sin tumbar
nada más.

### Tipos de pregunta — clasificación tripartita + inapropiada

`interpretarPregunta` clasifica cada pregunta en uno de 4 tipos. Esta
clasificación decide el flujo del orquestador.

| `tipo` | Cuándo | Output | Comportamiento del orquestador |
|---|---|---|---|
| **`busqueda_local`** | Dominio claro o inferible con UNA interpretación obvia. | `terminos` (1-3 palabras clave) | Llama al buscador unificado y redacta la respuesta cálida con `redactarRespuestaCoyo` |
| **`vaga`** | SÍ busca algo local PERO con múltiples interpretaciones razonables sin pista para elegir (ej. *"tienen algo bueno?"*, *"quien me ayuda con la casa?"*). | `mensajeReformular` con sugerencias específicas | Estado `no_aplica` + el `mensajeReformular` se guarda como `respuesta_coyo` |
| **`no_local`** | Matemáticas, escribir textos, política, charla random, opinión general. | (campos vacíos) | Estado `no_aplica` + `TEXTO_REDIRECCION_NO_APLICA` (texto fijo) |
| **`inapropiada`** | Drogas ilegales, armas/violencia, contenido sexual explícito, actividades ilegales, insultos directos. | (campos vacíos) | Estado `no_aplica` + texto fijo **+ `estado_pregunta = 'oculta'`** (la pregunta desaparece del feed para que ningún otro vecino la vea ni pueda responder) |

### Personalidad de Coyo

La constante `PERSONALIDAD_COYO` al inicio del archivo concentra la voz y
las reglas que Coyo debe seguir. Para ajustar tono, modismos o reglas, se
edita SOLO esta constante — los prompts individuales no se tocan.

Pilares de la personalidad:

1. **Coyote vecino buena onda** — mascota y asistente de AnunciaYA, conoce
   la zona y ayuda con gusto.
2. **Tono cálido + mexicano natural** — modismos *"te recomiendo"*, *"está
   cerquita"*, *"ya"*. Nunca forzados ni exagerados.
3. **Breve** — 1-2 frases máximo.
4. **Vocabulario multiciudad** — Coyo NO usa las palabras "pueblo" ni
   "catálogo" en sus respuestas. Habla de *"tu ciudad"* o *"la ciudad"*.
   AnunciaYA escala a otras ciudades; decirle "pueblo" a alguien en
   Hermosillo o Tijuana sonaría raro. La regla está escrita explícitamente
   en el prompt porque a Gemini se le pega "pueblo" si los ejemplos lo
   mencionan.
5. **Empatía emocional** — si la pregunta transmite cansancio, dolor,
   urgencia o frustración (aunque sea sutil), Coyo lo reconoce ANTES de
   presentar opciones. Ej: *"no tengo ganas de cocinar"* → *"¡Te entiendo,
   hoy a descansar!"* en lugar de *"¡Qué rico!"*. Cuando la pregunta es
   neutra, responde directo sin forzar empatía.
6. **Reglas sagradas:**
   - Coyo solo habla de resultados REALES (nunca inventa negocios, precios,
     ratings, horarios).
   - Sí menciona los datos ricos cuando aportan valor (rating, totalResenas,
     verificado, estaAbierto, condición, aceptaOfertas, negocioRating,
     diasParaVencer).
   - No promete ni garantiza nada más allá del dato real.
   - Si no hay resultados, lo dice cálido y honesto, e invita a la comunidad
     a responder.
   - Si la pregunta no es búsqueda local, redirige amable.
   - Si te escriben con groserías, no se engancha.

### Catálogo dinámico de categorías

El prompt de `interpretarPregunta` recibe en cada llamada el **catálogo real
de categorías y subcategorías** de la app. Eso permite a Gemini:

1. **Usar la CATEGORÍA principal como token** cuando el vecino busca un
   dominio amplio (ej. *"no tengo ganas de cocinar"* → `Comida`). Como el
   buscador hace ILIKE contra categorías, eso trae **todos los negocios de
   esa categoría** (Mariscos + Restaurantes + Panaderías), no solo los que
   coinciden con una palabra específica.
2. **Usar la subcategoría exacta** cuando el vecino busca algo más
   específico (ej. *"donde venden mariscos?"* → `Mariscos`).
3. **Combinar categoría + palabra** cuando aporta precisión (ej.
   `"Comida restaurantes"`).

Implementación: `apps/api/src/services/coyo/categoriasCatalogo.service.ts`.

- `obtenerCatalogoCategorias()` consulta BD con un GROUP BY de categorías y
  subcategorías, y cachea en memoria con TTL de 1 hora.
- Si BD falla, devuelve el último cache válido (graceful degradation) o
  cadena vacía si nunca se cargó — en ese caso el prompt funciona sin la
  sección del catálogo (Gemini cae a sus reglas internas).
- `formatearCatalogoParaPrompt(catalogo)` devuelve el texto listo para
  inyectar al final del prompt.
- `resetearCacheCatalogo()` se exporta solo para tests.

Cuando se agrega una categoría nueva al catálogo (vía Panel Admin u otro),
Coyo la aprende en máximo 1 hora.

### Sinónimos para términos genéricos

El prompt enseña a Gemini que cuando la pregunta usa un término genérico de
categoría donde los productos suelen publicarse con marcas o nombres
distintos, debe incluir **1-2 sinónimos comunes** además del original.
Ejemplos:

- *"venden smartphones?"* → `"smartphone celular"` (matchea iPhone, Samsung,
  Galaxy, etc.).
- *"autos en venta"* → `"auto coche carro"` (los 3 son comunes en MX).

Cuando el término ya es específico (ej. `tacos`, `pizza`, `panadería`,
`laptop`), Gemini lo deja tal cual sin agregar sinónimos. El prompt usa el
juicio del LLM con ejemplos en ambos sentidos.

Límite: 4 tokens máximo por `terminos`.

### Inferencia para preguntas indirectas

Gemini está instruido para INFERIR el dominio cuando hay UNA SOLA
interpretación obvia, aunque el sustantivo principal no esté explícito.
Esto incluye:

**Preguntas con sentimiento implícito:**

- *"no tengo ganas de cocinar"* → `restaurantes`
- *"el coche no arranca"* → `mecánico`
- *"se me cayó algo en el ojo"* → `médico`
- *"tengo hambre"* → `Comida` o `restaurantes`

**Preguntas de opinión que esconden búsqueda (patrón coloquial mexicano):**

- *"¿está chido pedir tacos a domicilio?"* → `tacos domicilio`
- *"¿vale la pena ir al mecánico aquí?"* → `mecánico`
- *"¿me conviene comprar una laptop usada?"* → `laptop`

El prompt distingue estos casos de preguntas genuinamente abstractas
(política, clima, opiniones sobre temas sin sustantivo buscable) que sí
caen en `no_local`.

### Resiliencia: reintento + fallback de modelo

Toda llamada a Gemini pasa por el wrapper `llamarGeminiConReintento()`
que provee resiliencia automática transparente:

1. **Reintento dentro del modelo principal** — hasta 3 intentos con backoff
   0s → 1s → 3s. La mayoría de los 503 transitorios se resuelven en pocos
   segundos.
2. **Fallback automático a modelo alterno** — si los 3 intentos del
   principal fallan con errores transitorios, intenta con
   `gemini-2.0-flash` (más estable). Otros 3 intentos antes de rendirse.

Total: hasta **6 intentos** antes de devolver `null`.

Errores permanentes (4xx excepto 408/429) NO se reintentan: el wrapper
devuelve `null` inmediatamente. Errores 5xx, 429 (rate limit), 408 (timeout)
y errores sin status (red, DNS) se consideran transitorios.

Logs silenciosos en el path feliz. Solo se loguea cuando hubo recuperación
(*"Coyo IA — recuperado con gemini-2.0-flash en intento N"*) o cuando se
agotaron todos los intentos.

Constantes en `coyoIA.service.ts`:
- `MODELO_GEMINI_PRINCIPAL = 'gemini-2.5-flash'`
- `MODELO_GEMINI_FALLBACK = 'gemini-2.0-flash'`
- `DELAYS_REINTENTO_MS = [0, 1000, 3000]`

Helper `esErrorTransitorio()` decide qué clasificación tiene cada error.

### Helpers internos

- `limpiarJsonDeGemini(raw)`: quita bloques markdown que Gemini a veces
  inyecta aunque le pidas "solo JSON".
- `esPreguntaInterpretada(v)`: type guard antes de castear el JSON parseado.
  Valida los 4 valores de `tipo` permitidos.

---

## Orquestador (`orquestador.ts`)

**Archivo:** `apps/api/src/services/coyo/orquestador.ts`
**Función pública principal:** `procesarPreguntaConCoyo(preguntaId)`

Coordina cajita IA + buscador unificado y guarda el resultado en la fila
de `preguntas_comunidad`. **A prueba de fallos en TODOS los niveles** —
NUNCA lanza al caller (que es un fire-and-forget del service de crear).

### Flujo y estados finales

| Paso | Si pasa esto… | Estado final |
|---|---|---|
| 1 | Pregunta no existe en BD | (return silencioso, no toca nada) |
| 2 | `interpretarPregunta` devuelve `disponible: false` (Gemini caído tras todos los reintentos) | `sin_respuesta` |
| 3a | `tipo === 'no_local'` | `no_aplica` + `TEXTO_REDIRECCION_NO_APLICA` (texto fijo) |
| 3b | `tipo === 'vaga'` | `no_aplica` + `mensajeReformular` (texto específico de Gemini) |
| 3c | `tipo === 'inapropiada'` | `no_aplica` + texto fijo + `estado_pregunta = 'oculta'` |
| 4-5 | `busqueda_local` con ≥1 resultado y `redactarRespuestaCoyo` OK | `listo` + texto + resultados filtrados |
| 4-5 | ≥1 resultado pero redacción falló | `listo` + `TEXTO_RESPALDO_CON_RESULTADOS` (*"Mira lo que encontré:"*) + resultados completos (sin filtrar — ver guardia abajo) |
| 4-5 | 0 resultados y redacción OK | `listo` + texto cálido + resultados vacíos (front no pinta cards, solo el mensaje) |
| 4-5 | 0 resultados + redacción falló | `sin_respuesta` (no hay nada que decir) |
| catch externo | Cualquier excepción inesperada | `sin_respuesta` (último recurso) |

### Filtros de consistencia texto ↔ tarjetas

Después de redactar la respuesta y antes de guardar en BD, el orquestador
aplica dos filtros en cascada que garantizan que las tarjetas reflejen lo
que Coyo dijo. Ambos solo se aplican cuando `huboResultados === true`.

#### Filtro CASO B — Gemini dijo "no encontré + comunidad"

**Cuándo dispara:** Gemini siguió el CASO B del prompt — redactó un mensaje
negativo + invitación a la comunidad ("dejar tu pregunta para que la
comunidad te eche la mano"). Eso pasa cuando Gemini decide semánticamente
que los items que trajo el buscador NO son relevantes para el vecino
(ej. un servicio mal categorizado matchea por título pero el modo del
servicio contradice lo que el vecino busca).

**Qué hace:** limpia los 4 grupos de items antes de guardar. El usuario ve
el texto + cero tarjetas. Mensaje consistente.

**Detección — heurística doble** (ambas señales requeridas):

- **Señal negativa**: `no encontré`, `no hay`, `por ahora no`, `ahorita no`,
  `todavía no`, `sin resultados`, `no apareció/aparecen`.
- **Señal de invitación a la comunidad** (cualquiera basta): `deja(r) tu
  pregunta` / `deja(r) aquí tu pregunta` (imperativo e infinitivo),
  `comunidad`, `algún vecino`, `vecino(s) te ...`, `echa(r) (una) mano`,
  `alguien te puede/pueda`.

La heurística es DOBLE para evitar falsos positivos. Una respuesta como
*"no encontré laptops nuevas pero encontré estas usadas"* es CASO A con
matización, no CASO B — y filtrarla habría escondido tarjetas legítimas.
Por la regla 4 de `PERSONALIDAD_COYO` + el prompt explícito, el CASO B
SIEMPRE incluye la invitación a la comunidad.

**Helper:** `geminiRedactoComoSinResultados(texto: string): boolean` —
exportado para tests unitarios en
`apps/api/src/__tests__/coyo-filtro-caso-b.test.ts`.

#### Filtro CASO A v2 — items no mencionados por Gemini

**Cuándo dispara:** Gemini redactó CASO A (sí encontró cosas legítimas) pero
el buscador trajo OTROS items adicionales que Gemini NO mencionó en el
texto (porque los descartó semánticamente). Sin este filtro, esas tarjetas
adicionales aparecerían contradiciendo el texto.

Caso típico: pregunta amplia como *"quien me ayuda con la casa?"* — Gemini
extrae `"servicios hogar"`, el buscador trae varios items que matchean por
categoría general "Servicios", pero Gemini al redactar menciona solo los
relevantes y descarta los demás. El filtro limpia los descartados.

**Qué hace:** para cada item devuelto, verifica si **al menos un token
significativo del título** aparece literalmente (substring, accent-
insensitive) en el texto de Gemini. Si NO aparece, el item se filtra.

**Tokens significativos del título:** palabras con MÁS de 3 letras, que no
sean stopwords (`el`, `la`, `de`, `con`, etc.) ni números puros.

**Por qué "al menos uno" y no "todos":** Gemini puede mencionar un negocio
por una parte de su nombre (ej. dice *"el Brujo"* en vez de *"Pollos El
Brujo"*). Con un token significativo coincidente basta para considerar el
item "mencionado".

**Guardia: solo aplica cuando Gemini SÍ redactó.** Si la redacción falló y
se usó `TEXTO_RESPALDO_CON_RESULTADOS` (*"Mira lo que encontré:"*), ese
texto genérico no menciona ningún ítem por nombre. Si el filtro corriera
contra él, limpiaría TODO. La guardia (`redaccion.disponible === true`)
mantiene los items intactos cuando Gemini falló — preferible mostrar las
tarjetas con texto de respaldo a no mostrar nada.

**Defensa adicional en el prompt:** `interpretarPregunta` instruye
explícitamente a Gemini a NO extraer palabras demasiado genéricas
(`servicios`, `hogar`, `ayuda`, `algo`, `bueno`, `cosa`, etc.). Si la
pregunta es muy vaga, debe clasificar como `vaga` en lugar de extraer un
término genérico. Esto ataca la causa raíz, no solo el síntoma.

**Helper:** `tituloMencionadoEnTexto(titulo: string, texto: string): boolean`
— exportado para tests unitarios en
`apps/api/src/__tests__/coyo-filtro-caso-a.test.ts`.

**Trade-off conocido:** si Gemini parafrasea sin usar ninguna palabra del
título (raro), el item legítimo se filtra. Preferible quedarse corto
(filtrar de más) que pasarse (mostrar items irrelevantes). Cuando aparezca
un caso así, se amplía la heurística.

### Helpers públicos

- `obtenerEstadoCoyo(preguntaId)` — usado por el endpoint de sondeo.

### Constantes editables

- `TEXTO_REDIRECCION_NO_APLICA`: texto fijo para `tipo='no_local'` y
  `tipo='inapropiada'`.
- `TEXTO_RESPALDO_CON_RESULTADOS`: texto cuando Gemini falla pero hay items
  del buscador.

---

## Notificaciones del Home

El Home dispara dos tipos de notificaciones al sistema de notificaciones
de la app (mismo `crearNotificacion()` que el resto):

### 1. `pregunta_comunidad_respondida` — autor recibe respuesta

Cuando un vecino crea una respuesta a una pregunta, **fire-and-forget**:

- Destinatario: el `usuarioId` del autor de la pregunta.
- Modo: `'personal'`.
- `referenciaTipo='pregunta_comunidad'`, `referenciaId=preguntaId`.
- Mensaje: primeros 100 caracteres de la respuesta + `…`.
- `actorNombre` + `actorImagenUrl`: datos del vecino que respondió.
- Auto-notificación bloqueada: si el responder es el propio autor de la
  pregunta, NO se envía nada.

Si el `crearNotificacion` falla (red, BD), solo se loguea — no rompe la
creación de la respuesta.

### 2. `coyo_recomendacion` — un item suyo aparece en los resultados de Coyo

Cuando el orquestador llega a `'listo'` con al menos un item en
`resultadosParaGuardar` (después de filtros CASO B / A v2), dispara
**fire-and-forget** una notificación por cada item a su dueño. Lógica
de destinatarios:

| Tipo de item | Destinatario | Modo |
|---|---|---|
| Negocio | Gerente de la sucursal específica · **fallback al dueño** si no hay gerente | `'comercial'` (con `negocioId` + `sucursalId`) |
| Oferta | Idem (la oferta se resuelve a su `sucursalId` y de ahí al gerente/dueño) | `'comercial'` |
| Marketplace | Usuario personal que publicó el artículo | `'personal'` |
| Servicio · `vacante-empresa` | Gerente de la sucursal · fallback dueño | `'comercial'` |
| Servicio · `servicio-persona` / `solicito` | Usuario personal que publicó | `'personal'` |

Reglas en todos los casos:
- **Auto-notificación bloqueada:** si el destinatario es el mismo
  `usuarioId` que el autor de la pregunta, NO se notifica.
- `referenciaTipo='pregunta_comunidad'`, `referenciaId=preguntaId`.
- `actorNombre` + `actorImagenUrl`: datos del autor de la pregunta.
- Cada función interna en `notificacionesCoyo.service.ts` tiene su
  try/catch — el helper general **nunca lanza** y usa
  `Promise.allSettled` para paralelizar.

Helper común: `resolverDestinatarioSucursal(sucursalId)` centraliza la
lógica gerente-con-fallback-dueño.

### CHECK constraints

Los dos tipos están en `notificaciones_tipo_check` y `pregunta_comunidad`
está en `notificaciones_referencia_tipo_check`. Migración:
`docs/migraciones/2026-06-01-notificaciones-coyo-comunidad.sql`.

### Frontend: íconos y navegación

`PanelNotificaciones.tsx` mapea los dos tipos a familias visuales nuevas:

| Tipo | Familia | Tile (gradient) | Glifo |
|---|---|---|---|
| `pregunta_comunidad_respondida` | `comunidad` | azul (#2563eb → #1d4ed8) | `IcoChat` (chat-circle-dots) |
| `coyo_recomendacion` | `coyo` | violeta→índigo (#a855f7 → #6366f1) | `IcoSparkle` (sparkle-fill) |

Click en cualquiera de las dos navega a `/inicio?preguntaId=<id>`. Hoy
el Home no hace scroll-to-pregunta, pero el query param queda listo
para activarse en el futuro sin romper el flujo actual.

---

## Expiración pasiva (14 días)

Las preguntas que pasan **14 días sin nuevas respuestas activas** se
autocierran (`estado_pregunta='cerrada'`) y salen del feed público. El
autor sigue viéndolas en `Mis preguntas` con badge "Cerrada". Las
respuestas existentes se conservan.

**Diseño "cron pasivo"** (sin cron de Render):

- Función privada `cerrarPreguntasVencidasDeCiudad(ciudad)` en
  `preguntasComunidad.service.ts`. Ejecuta un UPDATE scoped a la ciudad
  al inicio de `listarPreguntasPorCiudad`, **antes** del SELECT.
- `await` intencional para garantizar que el SELECT posterior no
  devuelva una pregunta que debería estar cerrada (consistencia
  inmediata, no diferida).
- Try/catch interno: si el UPDATE falla, el feed se sigue mostrando
  normal — la función no relanza.
- Solo afecta preguntas de la ciudad consultada (mínimo I/O). Usa los
  índices existentes.

**Fórmula de "última actividad":**

```sql
COALESCE(
  (SELECT MAX(created_at) FROM respuestas_preguntas_comunidad
   WHERE pregunta_id = preguntas_comunidad.id AND estado='activa'),
  preguntas_comunidad.created_at
)
```

Si la diferencia con `NOW()` supera 14 días, la pregunta se cierra.

**Reglas de producto incorporadas:**

- Solo NUEVAS respuestas activas resetean el timer. Likes ("yo también
  quiero saber") y `resuelta_at` NO afectan la expiración. La regla
  queda simple: *"14 días sin que nadie aporte algo nuevo, se autocierra"*.
- Una pregunta marcada como resuelta hace 20 días sin más respuestas
  también expira — `resuelta_at` no es excepción.

Costo: una UPDATE por GET del feed. Para Puerto Peñasco (beta, <500
preguntas activas) es despreciable. Si crece el volumen, se evalúa
mover a un cron real.

Constante editable: `DIAS_EXPIRACION = 14` (al inicio del service).

---

## Frontend

| Pieza | Archivo |
|---|---|
| Página Home | `apps/web/src/pages/private/PaginaInicio.tsx` |
| Página "Mis preguntas" | `apps/web/src/pages/private/PaginaMisPreguntas.tsx` (ruta `/inicio/mis-preguntas`) |
| Componente Coyo animado | `apps/web/src/components/CoyoAnimado.tsx` |
| Hook estado visual de Coyo | `apps/web/src/hooks/useCoyoEstadoVisual.ts` |
| Hooks RQ | `apps/web/src/hooks/queries/usePreguntasComunidad.ts` |
| Service | `apps/web/src/services/preguntasComunidadService.ts` |
| Types | `apps/web/src/types/preguntasComunidad.ts` |
| Query keys | `apps/web/src/config/queryKeys.ts` (sección `preguntasComunidad`) |
| Componentes Home | `apps/web/src/components/home/` (`BotonInteresComunidad.tsx`, `RespuestasComunidad.tsx`, `MenuAutorPregunta.tsx`, `ModalEditarPregunta.tsx`) |
| Asset Rive | `apps/web/public/coyo.riv` |

**Hero "Coyo te habla":** Coyo animado (`<CoyoAnimado>` con runtime de Rive)
+ bocadillo con cola SVG (solo desktop) + saludo personalizado con
`useAuthStore(s => s.usuario?.nombre) ?? 'vecino'` + label "Pregúntale a
Coyo" + input + botón + stat "X vecinos preguntando hoy" (calculado del
feed: autores únicos en últimas 24h). Coyo se monta visualmente sobre el
bocadillo con `z-10` + margen negativo derecho para que la mano del saludo
no quede cortada por el borde de la burbuja.

**Hooks de React Query:**

```typescript
// Feed de la ciudad activa del useGpsStore
usePreguntasComunidadLista()
useCrearPregunta()
useEstadoCoyo(preguntaId, estadoInicial)  // sondeo 2s mientras pendiente/procesando

// Respuestas + interés
useRespuestas(preguntaId, { enabled })    // lista paginada (carga al abrir el hilo)
useCrearRespuesta()
useBorrarMiRespuesta()
useMarcarInteres()                        // OPTIMISTIC UPDATE
useQuitarInteres()                        // OPTIMISTIC UPDATE

// Control del autor
useCerrarMiPregunta()
useMarcarResuelta()
useBorrarMiPregunta()
useEditarMiPregunta()                     // invalida también el sondeo de Coyo

// Histórico del autor
useMisPreguntas()
```

**Optimistic update en marcar/quitar interés:** los dos hooks parchean
TODAS las queries del feed que contengan la pregunta (cualquier
ciudad/paginación + `misPreguntas`) antes de la respuesta del server.
Snapshot guardado en `onMutate` para rollback en `onError`. Invalidación
final en `onSettled` para sincronizar con el conteo real. Esta es la
única acción del Home con optimistic — crear pregunta/respuesta usan
patrón normal (sin optimistic).

**Sondeo en `useEstadoCoyo`:**

- `enabled: false` si `estadoInicial` ya es final → preguntas viejas del feed **no generan ningún request**.
- `refetchInterval`: función que devuelve `2000` mientras `data?.estadoCoyo` sea pendiente/procesando, `false` cuando llega a estado final → **se detiene solo**.
- `refetchOnWindowFocus: false` (el intervalo ya está activo, sería redundante).
- Cuando la pregunta llega a estado final, el hook invalida la query del feed para que las consumers que dependen de `feed.data` (ej. `useCoyoEstadoVisual` para apagar el "pensando" del Coyo animado) vean el cambio inmediato.

**Render por estado de Coyo (en `CardPregunta`):**

| `estadoCoyo` | Bloque renderizado |
|---|---|
| `pendiente` o `procesando` | `BloqueCoyoPensando` — panel azul claro + Sparkles + "Coyo está pensando" + Loader2 animado |
| `listo` con grupos | `BloqueCoyoListo` — encabezado "Coyo encontró esto para ti" + texto + tarjetas agrupadas (Negocios → Ofertas → MarketPlace → Servicios), max 3 por grupo |
| `listo` sin grupos | `BloqueCoyoListo` — encabezado **"Coyo dice"** (condicional) + solo el texto |
| `no_aplica` | `BloqueCoyoNoAplica` — solo el texto de redirección o el `mensajeReformular` específico |
| `sin_respuesta` | (sin bloque de Coyo) — la pregunta queda abierta para que la comunidad responda |

**Tarjetas (`TarjetaItemCoyo`):** imagen + título + subtítulo + chips de
datos ricos (rating con estrella, "Verificado", "Abierto", condición,
"Negociable", "Vence en N días"). Solo se renderiza el chip si el dato
viene no-nulo desde el backend.

### Componentes nuevos del Home

| Componente | Responsabilidad |
|---|---|
| `BotonInteresComunidad` | Toggle "Yo también quiero saber". Estado base (slate) → estado activo (azul) con contador. Loader durante la mutación. Se oculta para el autor de la pregunta y para preguntas no-activas. |
| `RespuestasComunidad` | Bloque colapsable: botón "Ver N respuestas" → lista cronológica + caja para responder. Si N=0 y la pregunta es activa, muestra CTA "Sé el primero en responder". Cada respuesta del usuario actual tiene botón "Borrar" (soft-delete). Textarea con Enter→enviar, Shift+Enter→nueva línea. |
| `MenuAutorPregunta` | Dropdown (3 puntitos) visible solo al autor. 4 acciones con reglas de visibilidad: Editar (solo si 0 respuestas), Marcar resuelta (si no lo está), Cerrar (si activa), Eliminar (siempre, excepto si ya oculta). Cada acción destructiva pide confirmación con `ModalAdaptativo`. |
| `ModalEditarPregunta` | Form con textarea (max 500) que solo guarda si hay cambios reales. Al éxito el backend re-dispara Coyo con el texto nuevo (resetea `estado_coyo='pendiente'`). |

### Vista "Mis preguntas" (`/inicio/mis-preguntas`)

Histórico del autor — TODAS sus preguntas (activa, cerrada, oculta).
Cada card muestra:

- Badge de estado: Activa (azul) / Cerrada (ámbar) / Eliminada (slate).
- Badge "Resuelta" (verde) si `resueltaAt` está poblado.
- Stats inline (X respuestas · Y personas interesadas).
- `MenuAutorPregunta` con las mismas reglas que en el Home.
- `RespuestasComunidad` accesible incluso para preguntas cerradas
  (el autor puede leer lo que recibió). En `'oculta'` el bloque se
  omite. La caja de responder solo aparece si la pregunta sigue
  `'activa'`.

Acceso desde el Home: link discreto "Mis preguntas →" al lado del
título "Lo que pregunta la comunidad".

---

## Animación de Coyo (Rive)

Coyo es una mascota animada con state machine que **reacciona al estado de
la app** (saludo al cargar, atento al escribir, pensando mientras Gemini
procesa, respondiendo al llegar la respuesta). El archivo binario vive en
`apps/web/public/coyo.riv` y se carga con `@rive-app/react-canvas` (runtime
open source, MIT, sin dependencia con servidores de Rive en producción).

**Archivos clave:**

| Archivo | Responsabilidad |
|---|---|
| `apps/web/public/coyo.riv` | Asset binario exportado desde el editor Rive (despiece + state machine + 5 timelines) |
| `apps/web/src/components/CoyoAnimado.tsx` | Componente React que monta el canvas Rive y mapea `estado` → inputs de la state machine |
| `apps/web/src/hooks/useCoyoEstadoVisual.ts` | Calcula el `EstadoCoyoVisual` actual a partir del estado de la app (texto del input, mutación pendiente, feed) |
| `apps/web/src/pages/private/PaginaInicio.tsx` | Consume el hook y pasa el estado al `<CoyoAnimado>` |

**State machine del `.riv` — 2 layers:**

- **Layer 1 (base, siempre activa):** reproduce `idle` en loop. Da la
  sensación de "estar vivo" — Coyo respira (cuerpo escala Y 100→103%),
  parpadea (alterna ojos abiertos/cerrados con Hold), mueve la cola, y
  cabeza/ojos/bocas siguen al cuerpo cuando respira.
- **Layer 2 (reacciones):** estado default `neutro` (vacío). Transiciona a
  `saludo`/`atento`/`pensando`/`respondiendo` según los inputs y vuelve
  solo a `neutro` cuando el input se apaga (o cuando termina el one-shot
  del saludo).

**Inputs de la state machine (exactos):**

| Nombre | Tipo | Disparo desde código |
|---|---|---|
| `saludo` | Trigger | `inputSaludo.fire()` — al montar el Home |
| `atento` | Boolean | `inputAtento.value = true/false` — mientras el textarea tiene contenido |
| `pensando` | Boolean | `inputPensando.value = true/false` — mientras hay pregunta del usuario en `pendiente`/`procesando` |
| `respondiendo` | Boolean | `inputRespondiendo.value = true/false` — durante ~6s después de que una pregunta del usuario pasa a `listo` |

**Mapeo estado de la app → `EstadoCoyoVisual` (en `useCoyoEstadoVisual`):**

```
Prioridad (mayor a menor):
  saludo > respondiendo > pensando > atento > idle
```

- `saludo`: bandera interna `mostrandoSaludo` true al montar el componente, se apaga con `setTimeout` tras `SALUDO_DURACION_MS = 2500ms`.
- `respondiendo`: se detecta la transición de pregunta del usuario `procesando → listo` con un `Set` de IDs ya vistos. Se activa durante `RESPONDIENDO_DURACION_MS = 6000ms`.
- `pensando`: `crear.isPending` o hay alguna `pregunta.autorId === usuarioId && (estadoCoyo === 'pendiente' || 'procesando')`.
- `atento`: `texto.trim().length > 0`.
- `idle`: ninguno de los anteriores.

**Mitigaciones técnicas dentro del componente:**

1. **Exclusividad de inputs:** antes de activar un boolean, se ponen todos los demás en `false`. Garantiza que nunca haya 2 estados activos al mismo tiempo.
2. **Espera al salir de `respondiendo`:** si el estado anterior era `respondiendo` y se cambia a otro, se aplica el cambio con `setTimeout(250ms)` para que el ciclo de bocas termine en su frame base (`boca-cerrada` visible) y no se "congele" en un frame intermedio.
3. **Layout fijo:** `Fit.Contain` + `Alignment.BottomRight` para que la mano alzada del saludo no se recorte por arriba.
4. **StrictMode-safe:** el efecto que dispara `saludo` no usa flag en `useRef` (en dev el efecto corre 2 veces; un flag bloquearía la segunda ejecución y `setMostrandoSaludo(false)` nunca se llamaría). En su lugar, `mostrandoSaludo` se inicializa en `true` y el `setTimeout` se cierra correctamente con el cleanup.

**Cómo regenerar el `.riv`:**

1. Abrir el archivo fuente en el editor de Rive (`Coyo` en la cuenta del workspace).
2. Editar/agregar/ajustar animaciones, keyframes o inputs.
3. **El export `.riv` requiere plan Cadet** (~$17 USD/mes mensual o $9/mes anual). El plan Free permite editar pero no exportar.
4. Menú ☰ → Export → For runtime → "Export your Rive file".
5. Reemplazar `apps/web/public/coyo.riv` con el archivo nuevo.
6. Si renombras inputs o la state machine, actualizar las constantes `STATE_MACHINE_NAME` e `INPUT_*` en `CoyoAnimado.tsx`.

---

## Tests

### Tests unitarios — filtros de Coyo

Coyo tiene tests unitarios que cubren los dos helpers críticos del
orquestador (los filtros de consistencia texto ↔ tarjetas). Estos NO
tocan Gemini ni BD — prueban funciones puras de detección de patrones.

| Archivo | Cubre |
|---|---|
| `apps/api/src/__tests__/coyo-filtro-caso-b.test.ts` | `geminiRedactoComoSinResultados` — 32 casos: positivos del CASO B, negativos del CASO A (no debe disparar), casos límite (solo una señal), variaciones de capitalización. |
| `apps/api/src/__tests__/coyo-filtro-caso-a.test.ts` | `tituloMencionadoEnTexto` — 22 casos: items mencionados por Gemini, items omitidos (deben filtrarse), casos límite (título vacío, tokens stopwords, números). |

Total: 54 tests, ejecutan en milisegundos. Cualquier cambio que rompa
los patrones del filtro se detecta en CI antes de mergear.

```bash
pnpm --filter api exec vitest run src/__tests__/coyo-filtro-caso-a.test.ts src/__tests__/coyo-filtro-caso-b.test.ts
```

### Áreas sin tests dedicados (decisión de scope)

Las siguientes funciones del Sprint 1 dependen de BD y/o del sistema de
notificaciones — los tests unitarios puros tendrían poco valor frente al
costo de mantener los mocks. Cobertura pendiente vía E2E con Playwright
cuando el módulo gane volumen real de uso:

- `notificacionesCoyo.service.ts` — resolverDestinatarioSucursal
  (gerente con fallback al dueño) + las 4 funciones internas por tipo
  de item. La lógica es serial-de-BD; un test E2E del flujo "publicar
  pregunta → Coyo recomienda → comerciante recibe notificación" es más
  efectivo que mockear users + sucursales + items.
- `cerrarPreguntasVencidasDeCiudad` — el UPDATE depende de timestamps
  reales en BD. Se podría probar con `pg_simulate_time()` pero agrega
  complejidad sin haber visto un caso real de bug en esta fórmula.
- Hooks de React Query con optimistic update (`useMarcarInteres`,
  `useQuitarInteres`) — el test natural es E2E (click → verificar UI
  cambia inmediato → mock falla → verificar rollback).

Cuando aparezca un bug en cualquiera de estas áreas, agregar un test
de regresión apuntando específicamente a ese caso.

---

## Decisiones clave (y por qué)

1. **Regla de oro: Coyo NO inventa.** La `PERSONALIDAD_COYO` lo prohíbe
   explícitamente. El frontend solo pinta lo que vino del backend; el
   backend solo devuelve datos reales de la BD. Si Gemini "alucina" un
   negocio, la regla del prompt es no incluirlo. Esa regla se extiende a
   las tarjetas — si Coyo en el texto dice "no encontré X", las tarjetas
   no deben contradecirlo (de ahí los filtros CASO B y CASO A v2).

2. **IA opcional para no tumbar la app.** `GEMINI_API_KEY` es opcional. Si
   falta o falla tras todos los reintentos y el fallback, la cajita
   devuelve `{ disponible: false }`, el orquestador cierra la pregunta
   como `sin_respuesta` y la app sigue funcionando normal. Coyo es una
   FUNCIÓN, no infraestructura crítica.

3. **Publicar al instante + sondeo, sin socket.** El POST responde en
   cuanto guarda la fila; el orquestador procesa en segundo plano; el
   frontend hace polling cada 2s solo mientras la pregunta esté
   procesándose. Simple, autoapagable y suficiente para este volumen.

4. **Ciudad como texto plano, no FK a `regiones`.** El `useGpsStore` ya
   maneja la ciudad como string desde un catálogo local del frontend.
   Conectar a la tabla `regiones` (que existe pero está dormida) se hará
   cuando exista el Panel Admin con UI para gestionar ciudades.

5. **Modo flexible solo para Coyo.** Los usuarios normales que escriben en
   los overlays mantienen el comportamiento AND (más preciso para prefijos
   cortos). Solo Coyo activa el OR por palabra (más útil para términos
   compactos de IA).

6. **Cajita IA encapsulada.** Toda la dependencia de Gemini vive en un
   solo archivo. Migrar a otra LLM = tocar un archivo.

7. **Resiliencia automática y silenciosa.** El wrapper de Gemini reintenta
   con backoff y cae a modelo fallback de forma transparente para el
   resto del código. Solo se loguea cuando hay recuperación (path feliz
   silencioso). Eso evita ruido en logs cuando todo funciona.

8. **Vocabulario multiciudad.** Coyo NO usa "pueblo" ni "catálogo" en sus
   respuestas. Habla de "tu ciudad" / "la ciudad". AnunciaYA escala a
   otras ciudades; el vocabulario debe ser ciudad-agnóstico.

9. **Empatía emocional explícita en el prompt.** Reconocer el sentimiento
   del vecino antes de presentar opciones no es trivial — requiere
   instrucción explícita en el prompt con ejemplos en ambas direcciones
   (cuándo aplicar empatía, cuándo no forzarla).

10. **Catálogo de categorías dinámico.** En lugar de hardcodear las
    categorías en el prompt, se cargan de BD con cache de 1h. Eso permite
    que Coyo aprenda automáticamente cuando se agrega una categoría
    nueva al catálogo. Más mantenible que un prompt fijo.

11. **Tipo `inapropiada` con ocultamiento del feed.** Preguntas sobre
    contenido ilegal/ofensivo no solo redirigen a Coyo — la pregunta
    misma se marca como `estado_pregunta='oculta'` para que ningún otro
    vecino la vea ni pueda responder. Sin esto, AnunciaYA terminaría
    facilitando contenido inapropiado a través del feed comunitario.

12. **Coyo animado con Rive (no Lottie).** Lottie no soporta state
    machines — necesitaríamos pre-renderizar cada estado como animación
    independiente y cambiar entre ellas con código, lo que dificulta
    combinar Layer 1 (idle de fondo, siempre activa) con Layer 2
    (reacciones contextuales). Rive resuelve esto nativamente. El runtime
    es open source (MIT), gratis para siempre, y solo el export del
    `.riv` requiere plan Cadet ocasional cuando se regenera la animación.

13. **Estado visual derivado, no almacenado.** `useCoyoEstadoVisual`
    recalcula el `EstadoCoyoVisual` en cada render a partir del estado
    real de la app (texto del input, mutación, feed). No hay un estado
    paralelo "qué animación está activa" — eso lo decide el hook como
    función pura. Esto evita desincronización entre la animación y la
    realidad de la app.

14. **Exclusividad de inputs en una sola layer.** Los 3 booleans
    (`atento`, `pensando`, `respondiendo`) viven en la misma Layer 2 de
    la state machine, y el componente garantiza que solo uno está en
    `true` a la vez. Activar 2 al mismo tiempo manualmente provoca un
    bug visible (boca que desaparece cuando se interrumpe el loop de
    `respondiendo` a media transición). El código de producción nunca
    dispara esa combinación; el bug solo aparece jugando manualmente con
    los inputs en el editor de Rive.

---

## Limitaciones y pendientes conocidos

- **Las tarjetas de resultados de Coyo aún NO son clicables.** No llevan
  al perfil del negocio, al detalle del artículo, etc. — pendiente de
  diseñar (ruta + comportamiento de "abrir en modal" vs "navegar fuera
  del Home"). El backend ya devuelve `tipo + id` listos para construir
  el enlace.
- **Negocios se filtra por nombre de ciudad, no por proximidad GPS.** La
  pregunta no captura `lat/lng`. Garantiza cero ciudades ajenas (objetivo
  innegociable) pero pierde precisión geográfica dentro de la ciudad.
  Mejora futura aditiva: agregar `latitud`/`longitud` a
  `preguntas_comunidad` y pasarlos al buscador.
- **`totalSucursalesEnCiudad` vs `totalSucursales`.** El primero (cuenta
  sucursales del mismo negocio en la ciudad del vecino) es el correcto
  para decidir el subtítulo de las tarjetas de Coyo. El segundo (cuenta
  todas las sucursales activas en cualquier ciudad) se mantiene para
  compatibilidad con otros buscadores de la app (51+ archivos lo consumen).
- **Servicios no expone `rating` ni "abierto ahorita".** El rating
  requiere `AVG(rating)` + `COUNT(*)` al vuelo sobre `servicios_resenas`
  (caro). El horario es un string libre (`varchar 150`) sin estructura,
  parsear es frágil. Pendiente: precomputar el rating en una columna de
  la publicación (trigger/cron) y/o estructurar el horario.
- **Preguntas que quedan en `'procesando'` si el server se reinicia a
  media.** El índice parcial `idx_preguntas_comunidad_coyo_pendientes`
  está preparado para un cron futuro que las recoja y reintente. No
  implementado todavía.
- **Tabla `regiones` no conectada.** Existe como catálogo pero ninguna
  parte del flujo la usa. Se conectará con el Panel Admin.
- **Sin endpoint dedicado de "vecinos preguntando hoy".** El contador se
  calcula en el frontend del feed cargado (autores únicos con `createdAt`
  en las últimas 24h). Si crece el volumen, conviene exponerlo desde
  backend.
- **Auto-daño / crisis emocional.** Una pregunta tipo *"quiero morirme"*
  hoy cae en `no_local` con texto fijo de redirección — insuficiente.
  Idealmente Coyo debería detectar crisis emocional y mostrar respuesta
  empática + línea de ayuda (México: 800-290-0024 Línea de la Vida, 24/7).
  Tarea sensible que requiere texto validado idealmente con un experto en
  salud mental antes de implementar.
- **Sinónimos limitados al juicio del LLM.** El prompt enseña a Gemini a
  agregar 1-2 sinónimos para términos genéricos, pero depende de su
  criterio. Para un sistema más predecible se podría agregar un
  diccionario de sinónimos en backend (smartphone↔iPhone↔celular,
  laptop↔computadora portátil, etc.) que expanda los tokens antes de
  pasar al buscador. Hoy no es bloqueante.

---

## Migraciones SQL

Todas en `docs/migraciones/`:

| Archivo | Cubre | Local | Supabase prod |
|---|---|---|---|
| `2026-05-24-preguntas-comunidad.sql` | Tabla `preguntas_comunidad` + índices | ✅ | ✅ |
| `2026-05-24-servicios-buscador-fts.sql` | FTS para buscador de servicios | ✅ | ✅ |
| `2026-05-24-ofertas-buscador-fts.sql` | FTS para buscador de ofertas | ✅ | ✅ |
| `2026-05-24-coyo-respuesta-en-pregunta.sql` | 4 columnas de Coyo + CHECK + índice parcial | ✅ | ✅ |
| `2026-06-01-respuestas-interes-resuelta.sql` | Tablas `respuestas_preguntas_comunidad` + `preguntas_interesados` + columna `resuelta_at` | ✅ | ✅ |
| `2026-06-01-notificaciones-coyo-comunidad.sql` | Extiende CHECKs de `notificaciones` con `pregunta_comunidad_respondida`, `coyo_recomendacion`, `pregunta_comunidad` | ✅ | ✅ |

Todas las migraciones son idempotentes (`CREATE ... IF NOT EXISTS`,
`DROP CONSTRAINT IF EXISTS`) y compatibles con la receta del wrapper
`immutable_unaccent` que ya estaba en producción.

---

## Archivos involucrados

| Capa | Archivo |
|---|---|
| **BD** | `apps/api/src/db/schemas/schema.ts` (`preguntasComunidad`, `respuestasPreguntasComunidad`, `preguntasInteresados`) |
| **Backend — feed** | `services/preguntasComunidad.service.ts`, `services/respuestasPreguntasComunidad.service.ts`, `services/interesPreguntasComunidad.service.ts`, `controllers/preguntasComunidad.controller.ts`, `routes/preguntasComunidad.routes.ts`, `types/preguntasComunidad.types.ts` |
| **Backend — Coyo** | `services/coyo/coyoIA.service.ts`, `services/coyo/orquestador.ts`, `services/coyo/buscadorUnificado.ts`, `services/coyo/categoriasCatalogo.service.ts`, `services/coyo/notificacionesCoyo.service.ts`, `controllers/coyo.controller.ts`, `routes/coyo.routes.ts`, `validations/coyo.schema.ts` |
| **Backend — buscadores** | `services/marketplace/buscador.ts`, `services/servicios/buscador.ts`, `services/ofertas/buscador.ts`, `services/negocios.service.ts` (`listarSucursalesCercanas`) |
| **Backend — helpers compartidos** | `services/_helpers/busquedaFlexible.ts` |
| **Backend — notificaciones** | `services/notificaciones.service.ts`, `types/notificaciones.types.ts` |
| **Backend — config** | `config/env.ts` (`GEMINI_API_KEY`) |
| **Backend — tests** | `__tests__/coyo-filtro-caso-a.test.ts`, `__tests__/coyo-filtro-caso-b.test.ts` |
| **Frontend — feed Home** | `pages/private/PaginaInicio.tsx`, `pages/private/PaginaMisPreguntas.tsx`, `hooks/queries/usePreguntasComunidad.ts`, `services/preguntasComunidadService.ts`, `types/preguntasComunidad.ts`, `config/queryKeys.ts` |
| **Frontend — componentes Home** | `components/home/BotonInteresComunidad.tsx`, `components/home/RespuestasComunidad.tsx`, `components/home/MenuAutorPregunta.tsx`, `components/home/ModalEditarPregunta.tsx` |
| **Frontend — Coyo animado** | `components/CoyoAnimado.tsx` (componente Rive + state machine), `hooks/useCoyoEstadoVisual.ts` (calcula estado visual a partir del estado de la app) |
| **Frontend — notificaciones** | `components/layout/PanelNotificaciones.tsx` (mapeo de íconos + navegación), `types/notificaciones.ts` |
| **Dependencia** | `@rive-app/react-canvas` (runtime open source, MIT), `@google/genai ^2.6.0` |
| **Asset Rive** | `apps/web/public/coyo.riv` (export desde editor de Rive — incluye despiece SVG + 5 timelines + state machine de 2 layers) |
| **Docs hermanos** | `docs/estandares/PATRON_BUSCADOR_FTS.md` (receta FTS portable), `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4 (visión) |
