# Home "Pregúntale a [ciudad]" / Coyo — AnunciaYA v3.0

> El Home es un feed conversacional. Cada vecino publica preguntas para su
> ciudad ("¿quién arregla una fuga urgente?") y **Coyo** — un asistente con
> IA — responde unos segundos después con resultados reales sacados del
> catálogo de la app (Negocios + MarketPlace + Servicios + Ofertas). La
> pregunta queda viva para que otros vecinos también la respondan.
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
      (1-3 palabras clave + flag)     │   'procesando' → sondea cada 2s a │
   c) buscarEnTodaLaApp({q, ciudad})  │   GET /api/preguntas-comunidad/   │
      → 4 buscadores en paralelo      │   :id/coyo                        │
   d) Cajita IA → redactarRespuesta   │ Al llegar a estado final ('listo',│
   e) UPDATE estado_coyo='listo' +    │   'sin_respuesta' o 'no_aplica')  │
      respuesta_coyo + resultados     │   → refetchInterval = false,      │
                                      │   sondeo se detiene SOLO.         │
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

**Modelo decidido:** publicación instantánea + sondeo ligero del cliente.
**Sin Socket.io** (no necesitamos push en tiempo real para esto; el polling
es trivial y se autoapaga al llegar a estado final).

---

## Tabla `preguntas_comunidad`

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
| **`respuesta_coyo`** | text | `NULL` | Texto cálido que redacta Coyo |
| **`resultados_coyo`** | jsonb | `NULL` | `{ negocios, ofertas, marketplace, servicios }` (shape del buscador unificado) |
| **`estado_coyo`** | varchar(20) NOT NULL | `'pendiente'` | 5 valores (ver abajo) |
| **`coyo_procesado_at`** | timestamptz | `NULL` | Cuándo terminó el orquestador |

**Estados de `estado_coyo`:**

| Valor | Significado |
|---|---|
| `pendiente` | Recién creada, Coyo aún no la toca |
| `procesando` | Coyo está trabajando |
| `listo` | Coyo respondió (hay `respuesta_coyo`; `resultados_coyo` puede tener grupos vacíos si no encontró nada pero sí redactó) |
| `sin_respuesta` | Coyo no pudo (IA caída + 0 resultados, o error inesperado). La pregunta vive para la comunidad |
| `no_aplica` | La pregunta NO era búsqueda local (matemáticas, charla random). Coyo redirige amable |

**Índices:**

- `idx_preguntas_comunidad_ciudad_fecha (ciudad, created_at DESC)` — feed por ciudad
- `idx_preguntas_comunidad_usuario (usuario_id)` — "mis preguntas"
- `idx_preguntas_comunidad_coyo_pendientes (estado_coyo, created_at DESC) WHERE estado_coyo IN ('pendiente','procesando')` — parcial, preparado para un cron futuro que rescate preguntas atascadas

---

## Backend del feed

| Pieza | Archivo |
|---|---|
| Service | `apps/api/src/services/preguntasComunidad.service.ts` (`crearPregunta`, `listarPreguntasPorCiudad`) |
| Controller | `apps/api/src/controllers/preguntasComunidad.controller.ts` (3 controllers) |
| Routes | `apps/api/src/routes/preguntasComunidad.routes.ts` — todas con `verificarToken` |
| Types | `apps/api/src/types/preguntasComunidad.types.ts` |

**Endpoints:**

```
POST  /api/preguntas-comunidad                               crearPreguntaController
GET   /api/preguntas-comunidad?ciudad=&limit=&offset=        listarPreguntasPorCiudadController
GET   /api/preguntas-comunidad/:id/coyo                      obtenerEstadoCoyoController  ← sondeo
```

- `crearPregunta` hace `INSERT` y luego **fire-and-forget** a `procesarPreguntaConCoyo(nueva.id)` con `.catch(log)`. La publicación NO espera ni falla por Coyo.
- `listarPreguntasPorCiudad` ya devuelve los 4 campos de Coyo, así que las preguntas viejas vienen con su respuesta lista (no requieren sondeo).
- `obtenerEstadoCoyo` devuelve solo los 4 campos de Coyo (`{ estadoCoyo, respuestaCoyo, resultadosCoyo, coyoProcesadoAt }`), usado por el polling.

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
- Modelo: `gemini-2.5-flash`.
- Cliente singleton **lazy** (se construye en el primer uso real, no al arrancar).

**Funciones expuestas (2):**

```typescript
interpretarPregunta(texto: string): Promise<RespuestaIA<PreguntaInterpretada>>
  // → { esBusquedaLocal: boolean, terminos: string }
  // El prompt exige a Gemini 1-3 PALABRAS CLAVE esenciales (no sinónimos,
  // no frases largas). Devuelve JSON estricto.

redactarRespuestaCoyo(pregunta: string, resultados: unknown): Promise<RespuestaIA<string>>
  // → texto cálido (1-2 frases). El prompt tiene 2 casos:
  //   - Hay resultados → presenta SOLO lo que viene en el JSON, usa datos ricos
  //   - 0 resultados   → mensaje honesto invitando a la comunidad
```

**Tipo de retorno común — RespuestaIA<T>:**

```typescript
type RespuestaIA<T> =
  | { disponible: true; data: T }
  | { disponible: false; razon: 'sin_api_key' | 'error_gemini' | 'error_parseo' };
```

Las dos funciones NUNCA lanzan. Si Gemini falla (red, cuota, JSON inválido,
sin API key), devuelven `{ disponible: false, razon }`. El caller decide
cómo manejar la ausencia.

**Personalidad editable:** constante `PERSONALIDAD_COYO` al inicio del
archivo. Para ajustar tono, modismos o reglas → editar SOLO esa constante
(los prompts individuales no se tocan).

**`GEMINI_API_KEY` es OPCIONAL** en `apps/api/src/config/env.ts`:
`z.string().min(1).optional()`. Si falta, el server arranca igual y Coyo
queda "apagado" (las preguntas terminan en `sin_respuesta`) sin tumbar
nada más.

**Helpers internos:**

- `limpiarJsonDeGemini(raw)`: quita bloques markdown que Gemini a veces inyecta aunque le pidas "solo JSON".
- `esPreguntaInterpretada(v)`: type guard antes de castear el JSON parseado.

---

## Orquestador (`orquestador.ts`)

**Archivo:** `apps/api/src/services/coyo/orquestador.ts`
**Función pública principal:** `procesarPreguntaConCoyo(preguntaId)`

Coordina cajita IA + buscador unificado y guarda el resultado en la fila
de `preguntas_comunidad`. **A prueba de fallos en TODOS los niveles** — NUNCA
lanza al caller (que es un fire-and-forget del service de crear).

**Flujo y estados que puede dejar:**

| Paso | Si pasa esto… | Estado final |
|---|---|---|
| 1 | Pregunta no existe en BD | (return silencioso, no toca nada) |
| 2 | `interpretarPregunta` devuelve `disponible: false` | `sin_respuesta` |
| 3 | `esBusquedaLocal === false` (charla random) | `no_aplica` + texto fijo de redirección |
| 4-5 | Hay ≥1 resultado y `redactarRespuestaCoyo` OK | `listo` + texto + resultados |
| 4-5 | Hay ≥1 resultado pero redacción falló | `listo` + texto de respaldo `"Mira lo que encontré:"` + resultados |
| 4-5 | 0 resultados y redacción OK | `listo` + texto cálido + resultados vacíos (front no pinta cards, solo el mensaje) |
| 4-5 | 0 resultados + redacción falló | `sin_respuesta` (no hay nada que decir) |
| catch externo | Cualquier excepción inesperada | `sin_respuesta` (último recurso) |

**Helper público adicional:** `obtenerEstadoCoyo(preguntaId)` — usado por el
endpoint de sondeo.

**Texto fijo de `no_aplica`:** constante `TEXTO_REDIRECCION_NO_APLICA` al
inicio del archivo (editable).

---

## Frontend

| Pieza | Archivo |
|---|---|
| Página | `apps/web/src/pages/private/PaginaInicio.tsx` |
| Hooks RQ | `apps/web/src/hooks/queries/usePreguntasComunidad.ts` |
| Service | `apps/web/src/services/preguntasComunidadService.ts` |
| Types | `apps/web/src/types/preguntasComunidad.ts` |
| Query keys | `apps/web/src/config/queryKeys.ts` (sección `preguntasComunidad`) |

**Hero "Coyo te habla":** Coyo grande (`<img src="/Coyo.png">`, `h-40 lg:h-56`)
+ bocadillo con cola SVG (solo desktop) + saludo personalizado con
`useAuthStore(s => s.usuario?.nombre) ?? 'vecino'` + label "Pregúntale a
Coyo" + input + botón + stat "X vecinos preguntando hoy" (calculado del
feed: autores únicos en últimas 24h).

**Hooks de React Query (3):**

```typescript
usePreguntasComunidadLista()              // feed de la ciudad activa del useGpsStore
useCrearPregunta()                        // publica + invalida feed
useEstadoCoyo(preguntaId, estadoInicial)  // sondeo cada 2s mientras pendiente/procesando
```

**Sondeo en `useEstadoCoyo`:**

- `enabled: false` si `estadoInicial` ya es final → preguntas viejas del feed **no generan ningún request**.
- `refetchInterval`: función que devuelve `2000` mientras `data?.estadoCoyo` sea pendiente/procesando, `false` cuando llega a estado final → **se detiene solo**.
- `refetchOnWindowFocus: false` (el intervalo ya está activo, sería redundante).

**Render por estado (en `CardPregunta`):**

| `estadoCoyo` | Bloque renderizado |
|---|---|
| `pendiente` o `procesando` | `BloqueCoyoPensando` — panel azul claro + Sparkles + "Coyo está pensando" + Loader2 animado |
| `listo` con grupos | `BloqueCoyoListo` — encabezado "Coyo encontró esto para ti" + texto + tarjetas agrupadas (Negocios → Ofertas → MarketPlace → Servicios), max 3 por grupo |
| `listo` sin grupos | `BloqueCoyoListo` — encabezado **"Coyo dice"** (condicional) + solo el texto |
| `no_aplica` | `BloqueCoyoNoAplica` — solo el texto de redirección |
| `sin_respuesta` | (sin bloque de Coyo) + leyenda "Esperando respuestas de la comunidad" |

**Tarjetas (`TarjetaItemCoyo`):** imagen + título + subtítulo + chips de
datos ricos (rating con estrella, "Verificado", "Abierto", condición,
"Negociable", "Vence en N días"). Solo se renderiza el chip si el dato
viene no-nulo desde el backend.

---

## Decisiones clave (y por qué)

1. **Regla de oro: Coyo NO inventa.** La `PERSONALIDAD_COYO` lo prohíbe explícitamente. El frontend solo pinta lo que vino del backend; el backend solo devuelve datos reales de la BD. Si Gemini "alucina" un negocio, la regla del prompt es no incluirlo.

2. **IA opcional para no tumbar la app.** `GEMINI_API_KEY` es opcional. Si falta o falla, la cajita devuelve `{ disponible: false }`, el orquestador cierra la pregunta como `sin_respuesta` y la app sigue funcionando normal. Coyo es una FUNCIÓN, no infraestructura crítica.

3. **Publicar al instante + sondeo, sin socket.** El POST responde en cuanto guarda la fila; el orquestador procesa en segundo plano; el frontend hace polling cada 2s solo mientras la pregunta esté procesándose. Simple, autoapagable y suficiente para este volumen.

4. **Ciudad como texto plano, no FK a `regiones`.** El `useGpsStore` ya maneja la ciudad como string desde un catálogo local del frontend. Conectar a la tabla `regiones` (que existe pero está dormida) se hará cuando exista el Panel Admin con UI para gestionar ciudades.

5. **Modo flexible solo para Coyo.** Los usuarios normales que escriben en los overlays mantienen el comportamiento AND (más preciso para prefijos cortos). Solo Coyo activa el OR por palabra (más útil para términos compactos de IA).

6. **Cajita IA encapsulada.** Toda la dependencia de Gemini vive en un solo archivo. Migrar a otra LLM = tocar un archivo.

---

## Limitaciones y pendientes conocidos

- **Las tarjetas de resultados de Coyo aún NO son clicables.** No llevan al perfil del negocio, al detalle del artículo, etc. — pendiente de diseñar (ruta + comportamiento de "abrir en modal" vs "navegar fuera del Home"). El backend ya devuelve `tipo + id` listos para construir el enlace.
- **Negocios se filtra por nombre de ciudad, no por proximidad GPS.** La pregunta no captura `lat/lng`. Garantiza cero ciudades ajenas (objetivo innegociable) pero pierde precisión geográfica dentro de la ciudad. **Mejora futura aditiva:** agregar `latitud`/`longitud` a `preguntas_comunidad` y pasarlos al buscador.
- **Servicios no expone `rating` ni "abierto ahorita".** El rating requiere `AVG(rating)` + `COUNT(*)` al vuelo sobre `servicios_resenas` (caro). El horario es un string libre (`varchar 150`) sin estructura, parsear es frágil. Pendiente: precomputar el rating en una columna de la publicación (trigger/cron) y/o estructurar el horario.
- **Preguntas que quedan en `'procesando'` si el server se reinicia a media.** El índice parcial `idx_preguntas_comunidad_coyo_pendientes` está preparado para un cron futuro que las recoja y reintente. No implementado todavía.
- **Tabla `regiones` no conectada.** Existe como catálogo pero ninguna parte del flujo la usa. Se conectará con el Panel Admin.
- **Sin endpoint dedicado de "vecinos preguntando hoy".** El contador se calcula en el frontend del feed cargado (autores únicos con `createdAt` en las últimas 24h). Si crece el volumen, conviene exponerlo desde backend.

---

## Migraciones SQL

Todas en `docs/migraciones/`:

| Archivo | Aplicada en local | Aplicada en producción (Supabase) |
|---|---|---|
| `2026-05-24-preguntas-comunidad.sql` | ✅ | ✅ |
| `2026-05-24-servicios-buscador-fts.sql` | ✅ | ✅ |
| `2026-05-24-ofertas-buscador-fts.sql` | ✅ | ✅ |
| `2026-05-24-coyo-respuesta-en-pregunta.sql` | ✅ | ✅ |

Las 4 migraciones están aplicadas en local y producción. La última agregó
las 4 columnas de Coyo a `preguntas_comunidad` + CHECK + índice parcial.
Es idempotente y compatible con la receta del wrapper `immutable_unaccent`
que ya estaba en producción.

---

## Archivos involucrados

| Capa | Archivo |
|---|---|
| **BD** | `apps/api/src/db/schemas/schema.ts` (`preguntasComunidad`, líneas ~2565) |
| **Backend — feed** | `services/preguntasComunidad.service.ts`, `controllers/preguntasComunidad.controller.ts`, `routes/preguntasComunidad.routes.ts`, `types/preguntasComunidad.types.ts` |
| **Backend — Coyo** | `services/coyo/coyoIA.service.ts`, `services/coyo/orquestador.ts`, `services/coyo/buscadorUnificado.ts`, `controllers/coyo.controller.ts`, `routes/coyo.routes.ts`, `validations/coyo.schema.ts` |
| **Backend — buscadores** | `services/marketplace/buscador.ts`, `services/servicios/buscador.ts`, `services/ofertas/buscador.ts`, `services/negocios.service.ts` (`listarSucursalesCercanas`) |
| **Backend — helpers compartidos** | `services/_helpers/busquedaFlexible.ts` |
| **Backend — config** | `config/env.ts` (`GEMINI_API_KEY`) |
| **Frontend** | `pages/private/PaginaInicio.tsx`, `hooks/queries/usePreguntasComunidad.ts`, `services/preguntasComunidadService.ts`, `types/preguntasComunidad.ts`, `config/queryKeys.ts` |
| **Asset** | `apps/web/public/Coyo.png` |
| **Docs hermanos** | `docs/estandares/PATRON_BUSCADOR_FTS.md` (receta FTS portable), `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4 (visión) |
