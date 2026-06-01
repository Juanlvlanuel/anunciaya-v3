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
| `no_aplica` | Coyo redirige amable. Cubre 3 sub-casos: (a) `tipo='no_local'` — la pregunta no era búsqueda local (matemáticas, charla); (b) `tipo='vaga'` — sí es local pero demasiado ambigua (ej. *"quien me ayuda con la casa?"*); en este sub-caso `respuesta_coyo` contiene un mensaje específico generado por Gemini con sugerencias para reformular; (c) `tipo='inapropiada'` — drogas, armas, sexo explícito, agresión. En este sub-caso ADEMÁS `estado_pregunta` pasa a `'oculta'` para que la pregunta NO aparezca en el feed de ningún vecino (evita que la comunidad responda con info real para contenido ilegal) |

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

### Campos que se buscan en cada modo (importante)

Aprendizaje doloroso: el `ILIKE` substring contra **texto libre largo**
(descripciones, requisitos) **se vuelve veneno en modo flexible** porque
una palabra suelta puede ser substring literal de otra. Caso real
reproducido el 2026-05-31:

> Pregunta: *"donde hay alguna agua purificadora"* → Gemini extrae
> `'agua purificadora'` (correcto). El FTS español está limpio: el
> tsvector de una Laptop HP cuya descripción dice "la batería aguanta 3
> horas" produce `'aguant'` (raíz del verbo aguantar), **no** `'agua'`.
> Pero `unaccent('aguanta') ILIKE '%agua%'` devuelve TRUE — y la Laptop
> se cuela como resultado de "agua purificadora". Coyo redacta
> correctamente "no encontré agua purificadora" pero la tarjeta de
> Marketplace muestra la Laptop. Mensaje contradictorio para el vecino.

**Por eso en modo flexible los buscadores limitan el ILIKE a campos
cortos y curados.** El FTS español (con stemming + diccionario) sigue
cubriendo todo el texto principal.

| Buscador | Modo normal (usuarios) | Modo flexible (Coyo) |
|---|---|---|
| Marketplace | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`) | FTS + ILIKE(`titulo`) |
| Servicios | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`) + EXISTS(`skills`, `requisitos`) | FTS + ILIKE(`titulo`) |
| Ofertas | FTS(`titulo+descripcion`) + ILIKE(`titulo`, `descripcion`, `negocio.nombre`) + EXISTS(`subcategorias`, `categorias`) | FTS + ILIKE(`titulo`, `negocio.nombre`) + EXISTS(`subcategorias`, `categorias`) |
| Negocios | ILIKE(`negocio.nombre`, `sucursal.nombre`, `direccion`, `ciudad`) + EXISTS(`subcategorias`, `categorias`) | igual (todos los campos son cortos y curados, **no aplica el bug**) |

**Regla guía:** el ILIKE substring solo es seguro contra columnas que el
comerciante o el catálogo escriben deliberadamente (nombres, títulos,
nombres de categorías). Los textos libres largos (descripción, skills,
requisitos) **se eliminan en modo flexible** porque ahí Gemini puede
mandar 1 palabra suelta sin contexto de la frase completa.

**Principio:** preferible que Coyo devuelva **0 resultados** y deje la
pregunta para la comunidad, a que devuelva resultados borderline
irrelevantes contradiciendo su propio texto.

### Trampa secundaria: el stemmer español no procesa plurales en inglés

Reproducida también el 2026-05-31: el stemmer Snowball Spanish que usa
Postgres NO quita la `s` final de palabras inglesas porque no las
reconoce como raíces españolas. Resultado:

```sql
SELECT websearch_to_tsquery('spanish', 'laptops')::text;
-- 'laptops'   (NO se estemiza a 'laptop')

SELECT to_tsvector('spanish', 'Laptop HP 15 Intel')::text;
-- '15':3 'hp':2 'intel':4 'laptop':1   (el documento tiene 'laptop')

-- → no matchean, aunque obviamente sean la misma palabra.
```

Para palabras en español el stemmer SÍ funciona (`tortillas` → `tortill`
matchea con `tortilla` → `tortill`). El problema es exclusivo de
préstamos del inglés (laptop, software, smartphone, hotdog, etc.).

Mientras el ILIKE de descripción estaba activo en modo flexible, este
bug quedaba enmascarado (el ILIKE "rescataba" hits por substring). Al
limpiar el ILIKE para resolver el bug "agua → Laptop", esta trampa
quedó al desnudo.

**Mitigación actual:** el prompt de `interpretarPregunta` (en
`coyoIA.service.ts`) le pide explícitamente a Gemini que devuelva el
**SINGULAR** para palabras inglesas. Esto cubre el 95% de los casos.

**Si más adelante hace falta robustez extra** (Gemini ignorando la
regla en algún caso), las opciones son:
1. Singularización en backend (quitar `s` del último token si tiene
   >4 letras). Riesgo: falsos rebotes con "más", "país", "atrás".
2. Buscar también la versión sin `s` como OR (`'laptops OR laptop'`).
   Aumenta el alcance pero es seguro.
3. Indexar también con configuración `simple` (sin stemming) además
   de la `spanish`. Cambio de schema.

No están implementadas — el prompt es suficiente por ahora.

---

## Filtro de consistencia texto ↔ tarjetas

Aprendizaje del 2026-05-31 (segunda iteración del bug "no encontré"):
incluso con el FTS limpio y el prompt singular para anglo, podía darse
el caso de que **el buscador trajera un item legítimo (FTS matchea
correctamente) pero Gemini decidiera semánticamente que ese item NO le
sirve al vecino**. Resultado: Coyo redactaba "no encontré X" pero el
backend pasaba el item al frontend → tarjeta visible contradiciendo el
texto.

Caso real reproducido:

> Pregunta: *"algún plomero?"* → FTS encuentra un servicio con título
> "Se busca Plomero" (matchea por `plomero`). Pero ese servicio tiene
> `modo='ofrezco'` por error de captura (alguien quería preguntar pero
> creó una publicación). Gemini lee título "Se busca Plomero" + modo
> "Ofrezco" como contradictorios, decide que NO es alguien ofreciendo,
> redacta: *"Híjole, por ahora no encontré plomeros ofreciendo sus
> servicios aquí en tu ciudad. Pero si quieres, deja tu pregunta para
> que los vecinos te echen una mano."* Sin embargo, la tarjeta del
> servicio aparecía igual abajo. Mensaje contradictorio para el vecino.

**Solución (orquestador.ts):** después de `redactarRespuestaCoyo`, una
heurística detecta si Gemini siguió el **CASO B del prompt** (texto
negativo + invitación a la comunidad). Si la heurística da `true` y el
buscador SÍ trajo items, el orquestador **limpia los items antes de
guardar** en `resultados_coyo`. Las tarjetas no aparecen y el mensaje
queda consistente.

```typescript
// orquestador.ts (extracto simplificado)
if (huboResultados && geminiRedactoComoSinResultados(textoFinal)) {
  console.warn('Coyo: CASO B con items — limpiando para consistencia');
  resultadosParaGuardar = { negocios: {items:[]...}, /* ... 4 vacíos */ };
}
```

**Por qué la heurística es DOBLE (negativa + invitación a la
comunidad):**

Solo con la frase negativa había falsos positivos. Una respuesta como
*"no encontré laptops nuevas pero encontré estas usadas"* es CASO A con
matización, no CASO B — y filtrarla habría escondido tarjetas
legítimas. Por la regla 4 de `PERSONALIDAD_COYO` + el prompt explícito,
**el CASO B SIEMPRE incluye la invitación a la comunidad**. Con esa
señal doble, los falsos positivos se cierran.

**Trade-off explícito:** si Gemini redacta con una variación no
cubierta por los regex, el caso pasa sin filtrar y aparece la
inconsistencia. Preferible quedarse corto (tarjetas visibles en duda)
que pasarse (ocultar tarjetas legítimas). Cuando se observe un caso
nuevo, se agrega el patrón al helper.

**Patrones cubiertos actualmente:**

- Negativa: `no encontré`, `no encontro`, `no hay`, `por ahora no`,
  `ahorita no`, `todavía no`, `sin resultados`, `no apareció/aparecen`.
- Invitación a la comunidad (cualquiera de estas basta):
  `deja(r) tu pregunta` / `deja(r) aquí tu pregunta` (imperativo e
  infinitivo), `comunidad`, `algún vecino`, `vecino(s) te ...`,
  `echa(r) (una) mano`, `alguien te puede/pueda`.

**Historial de iteraciones de los patrones** (cada vez que apareció
un CASO B que pasó sin filtrar, se amplió):

- v1 (2026-05-31 mañana): patrones base — `deja tu pregunta`,
  `comunidad`, `vecinos te`, `a la comunidad`.
- v2 (2026-05-31 tarde): se observó que Gemini también escribe
  *"puedes dejar tu pregunta y seguro algún vecino te echa la mano"*
  (infinitivo + singular + "echar mano"). Caso real: pregunta
  *"quien arregla aires acondicionados?"* dejó colada una tarjeta
  de bicicleta en Marketplace. Se ampliaron los patrones para
  capturar infinitivo (`dejar`), singular (`algún vecino`,
  `vecino te`) y la expresión `echar (una) mano`.

---

## Filtro CASO A v2 — items no mencionados por Gemini

Aprendizaje del 2026-05-31 (tarde): incluso con el filtro CASO B y el
prompt ampliado, había un **tercer tipo de bug** detectable solo cuando
Gemini extrae palabras genéricas que matchean por categoría pero el
buscador trae items de varios dominios mezclados.

Caso real reproducido:

> Pregunta: *"quien me ayuda con la casa?"* → Gemini extrajo
> `'servicios hogar'`. El buscador devolvió: Plomería Express +
> **Contadora Fernanda** + Plomería residencial 24h. ¿Por qué la
> Contadora? Su categoría es "Contadores / Servicios" — la palabra
> "servicios" matcheó literalmente. Gemini redactó cálido mencionando
> SOLO las plomerías (descartó la Contadora semánticamente porque
> "no ayuda con la casa"), pero la tarjeta de Contadora aparecía
> igual abajo del texto. Inconsistencia visual.

**Diferencia con CASO B:** CASO B es "Gemini dice no encontré nada + invita
a la comunidad". CASO A v2 es "Gemini SÍ encontró algo, menciona items
específicos, pero omite otros que el buscador trajo". El filtro CASO B
no detecta esto (el texto no es negativo).

**Solución:** después de Gemini redactar y descartando CASO B, otra
heurística `tituloMencionadoEnTexto(titulo, texto)` decide si cada
item fue mencionado por Gemini. Items NO mencionados se limpian.

```typescript
// orquestador.ts (simplificado)
} else if (huboResultados) {
  // Filtro CASO A v2: solo conservar items mencionados por Gemini
  const filtrarItems = items =>
    items.filter(i => tituloMencionadoEnTexto(i.titulo, textoFinal));
  resultadosParaGuardar = {
    negocios: { items: filtrarItems(items.negocios), ... },
    /* ... 4 áreas ... */
  };
}
```

**Heurística:**

1. Extraer del título las **palabras con > 3 letras** que no sean
   stopwords (`el`, `la`, `de`, `con`, etc.) ni números puros.
2. Si **al menos una** de esas palabras aparece literalmente
   (substring, accent-insensitive) en el texto de Gemini, considerar
   el item "mencionado". Sin esa palabra, se filtra.

**Por qué "al menos una" y no "todas":** Gemini puede mencionar un
negocio por una parte de su nombre (ej. dice *"el Brujo"* en vez de
*"Pollos El Brujo"*). Con al menos un token significativo coincidente
basta para considerarlo mencionado.

**Defensa adicional (D):** el prompt de `interpretarPregunta` ahora
también pide explícitamente NO extraer palabras demasiado genéricas
(`servicios`, `hogar`, `ayuda`, `algo`, `bueno`, `cosa`, etc.). Si la
pregunta es muy vaga, clasificar como `esBusquedaLocal=false`. Esto
ataca la **causa raíz** (mejor query), no solo el síntoma (filtro).

**Trade-off conocido del filtro CASO A v2:**

Si Gemini parafrasea sin usar ninguna palabra del título (ej.
*"te recomiendo la inmobiliaria"* sin mencionar *"Casas del Sol"*), el
item legítimo se filtra. Preferible quedarse corto (filtrar de más) a
pasarse (mostrar items irrelevantes). Cuando aparezca un caso así,
ampliar la heurística (ej. usar sinónimos por categoría).

**Guardia: solo aplica si Gemini SÍ redactó.**

Caso reproducido 2026-05-31 (tarde): Gemini se cayó con 503 → el
orquestador usó `TEXTO_RESPALDO_CON_RESULTADOS` (*"Mira lo que
encontré:"*) → el filtro CASO A v2 corrió contra ese texto genérico
que NO menciona ningún ítem → filtró los 5 items legítimos del
buscador → el vecino vio el texto seco sin tarjetas. Bug.

**Mitigación:** el orquestador SOLO aplica el filtro CASO A v2
cuando `redaccion.disponible === true`. Si Gemini falló, mantenemos
los items intactos — preferible mostrar las tarjetas con el texto de
respaldo a no mostrar nada.

---

## Tono y vocabulario de Coyo

Aprendizaje del 2026-05-31: Coyo originalmente decía "el pueblo" y "el
catálogo del pueblo" en sus respuestas. **Eso solo funciona para
ciudades chicas como Puerto Peñasco.** AnunciaYA está diseñado para
escalar a otras ciudades (la `ciudad` viene del `useGpsStore`); decirle
"pueblo" a alguien en Hermosillo o Tijuana suena raro.

**Regla actual en `PERSONALIDAD_COYO` y en los dos prompts:** Coyo NO
usa las palabras "pueblo" ni "catálogo". Habla de "tu ciudad" o "la
ciudad". El JSON con los resultados se introduce como *"Resultados
reales encontrados en tu ciudad"*, y la regla 5 (no-búsqueda-local)
redirige con *"si buscas algo aquí en tu ciudad, dime"*.

Esta regla está escrita explícitamente en el prompt (no es solo un
ejemplo) porque a Gemini se le pega "pueblo" si los ejemplos lo
mencionan — mejor prohibirlo de frente.

---

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
  // → { tipo: 'busqueda_local' | 'vaga' | 'no_local', terminos: string, mensajeReformular: string }
  //
  // Gemini clasifica la pregunta en uno de 3 tipos:
  //   - busqueda_local: dominio claro o inferible con UNA interpretación
  //     obvia → devuelve `terminos` (1-3 palabras clave) para buscar.
  //   - vaga: SÍ busca algo local PERO la pregunta es demasiado ambigua
  //     (múltiples interpretaciones razonables sin pista). Gemini devuelve
  //     en `mensajeReformular` un texto cálido y específico para ESA
  //     pregunta sugiriendo opciones concretas que ayuden a reformular.
  //   - no_local: matemáticas, opiniones, charla random, etc.
  //
  // El prompt incluye ejemplos de cada tipo y reglas explícitas (no usar
  // palabras genéricas, inferir cuando hay UNA interpretación, etc.).

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
| 3a | `tipo === 'no_local'` (matemáticas, charla random) | `no_aplica` + `TEXTO_REDIRECCION_NO_APLICA` (texto fijo) |
| 3b | `tipo === 'vaga'` (local pero ambigua) | `no_aplica` + `mensajeReformular` (texto específico generado por Gemini con sugerencias para reformular) |
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
| Componente Coyo animado | `apps/web/src/components/CoyoAnimado.tsx` |
| Hook estado visual de Coyo | `apps/web/src/hooks/useCoyoEstadoVisual.ts` |
| Hooks RQ | `apps/web/src/hooks/queries/usePreguntasComunidad.ts` |
| Service | `apps/web/src/services/preguntasComunidadService.ts` |
| Types | `apps/web/src/types/preguntasComunidad.ts` |
| Query keys | `apps/web/src/config/queryKeys.ts` (sección `preguntasComunidad`) |
| Asset Rive | `apps/web/public/coyo.riv` |

**Hero "Coyo te habla":** Coyo animado (`<CoyoAnimado>` con runtime de Rive)
+ bocadillo con cola SVG (solo desktop) + saludo personalizado con
`useAuthStore(s => s.usuario?.nombre) ?? 'vecino'` + label "Pregúntale a
Coyo" + input + botón + stat "X vecinos preguntando hoy" (calculado del
feed: autores únicos en últimas 24h). Coyo se monta visualmente sobre el
bocadillo con `z-10` + margen negativo derecho para que la mano del saludo
no quede cortada por el borde de la burbuja.

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

## Animación de Coyo (Rive)

Coyo dejó de ser un PNG fijo: ahora es una mascota animada con state
machine que **reacciona al estado de la app** (saludo al cargar, atento al
escribir, pensando mientras Gemini procesa, respondiendo al llegar la
respuesta). El archivo binario vive en `apps/web/public/coyo.riv` y se
carga con `@rive-app/react-canvas` (runtime open source, MIT, sin
dependencia con servidores de Rive en producción).

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

**Cómo verificar los inputs disponibles desde código (debug):**

```typescript
const sm = rive.stateMachineInputs('State Machine 1');
console.log(sm.map((i) => ({ nombre: i.name, tipo: i.type })));
// Tipos: 58 = Trigger, 59 = Boolean, 56 = Number
```

---

## Decisiones clave (y por qué)

1. **Regla de oro: Coyo NO inventa.** La `PERSONALIDAD_COYO` lo prohíbe explícitamente. El frontend solo pinta lo que vino del backend; el backend solo devuelve datos reales de la BD. Si Gemini "alucina" un negocio, la regla del prompt es no incluirlo.

2. **IA opcional para no tumbar la app.** `GEMINI_API_KEY` es opcional. Si falta o falla, la cajita devuelve `{ disponible: false }`, el orquestador cierra la pregunta como `sin_respuesta` y la app sigue funcionando normal. Coyo es una FUNCIÓN, no infraestructura crítica.

3. **Publicar al instante + sondeo, sin socket.** El POST responde en cuanto guarda la fila; el orquestador procesa en segundo plano; el frontend hace polling cada 2s solo mientras la pregunta esté procesándose. Simple, autoapagable y suficiente para este volumen.

4. **Ciudad como texto plano, no FK a `regiones`.** El `useGpsStore` ya maneja la ciudad como string desde un catálogo local del frontend. Conectar a la tabla `regiones` (que existe pero está dormida) se hará cuando exista el Panel Admin con UI para gestionar ciudades.

5. **Modo flexible solo para Coyo.** Los usuarios normales que escriben en los overlays mantienen el comportamiento AND (más preciso para prefijos cortos). Solo Coyo activa el OR por palabra (más útil para términos compactos de IA).

6. **Cajita IA encapsulada.** Toda la dependencia de Gemini vive en un solo archivo. Migrar a otra LLM = tocar un archivo.

7. **Coyo animado con Rive (no Lottie).** Lottie no soporta state machines — necesitaríamos pre-renderizar cada estado como animación independiente y cambiar entre ellas con código, lo que dificulta combinar Layer 1 (idle de fondo, siempre activa) con Layer 2 (reacciones contextuales). Rive resuelve esto nativamente. El runtime es open source (MIT), gratis para siempre, y solo el export del `.riv` requiere plan Cadet ocasional cuando se regenera la animación.

8. **Estado visual derivado, no almacenado.** `useCoyoEstadoVisual` recalcula el `EstadoCoyoVisual` en cada render a partir del estado real de la app (texto del input, mutación, feed). No hay un estado paralelo "qué animación está activa" — eso lo decide el hook como función pura. Esto evita desincronización entre la animación y la realidad de la app.

9. **Exclusividad de inputs en una sola layer.** Los 3 booleans (`atento`, `pensando`, `respondiendo`) viven en la misma Layer 2 de la state machine, y el componente garantiza que solo uno está en `true` a la vez. Activar 2 al mismo tiempo manualmente provoca un bug visible (boca que desaparece cuando se interrumpe el loop de `respondiendo` a media transición). El código de producción nunca dispara esa combinación; el bug solo aparece jugando manualmente con los inputs en el editor de Rive.

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
| **Frontend — Coyo animado** | `components/CoyoAnimado.tsx` (componente Rive + state machine), `hooks/useCoyoEstadoVisual.ts` (calcula estado visual a partir del estado de la app) |
| **Dependencia** | `@rive-app/react-canvas` (runtime open source, MIT) |
| **Asset Rive** | `apps/web/public/coyo.riv` (export desde editor de Rive — incluye despiece SVG + 5 timelines + state machine de 2 layers) |
| **Docs hermanos** | `docs/estandares/PATRON_BUSCADOR_FTS.md` (receta FTS portable), `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4 (visión) |
