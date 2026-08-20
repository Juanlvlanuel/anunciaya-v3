# Alta Rápida de Catálogo (Business Studio + MarketPlace)

> **Estado:** Fase 1 completa — Business Studio. Fase 2 completa — MarketPlace (Modo Personal, solo modo='vendo'), ver §7.
> **Rutas:** `/business-studio/catalogo/alta-rapida` (BS) · `/mis-publicaciones/alta-rapida` (MarketPlace).
> Racional de producto: sesión de planeación 2026-08-09 (BS) · 2026-08-18 (MarketPlace).

---

## 1. Qué es

Carga masiva de artículos al Catálogo de Business Studio. El problema que resuelve: dar de alta el catálogo era 1-por-1 (`ModalArticulo.tsx`, o la capacidad de Coyo `crear_producto_catalogo`) — lento para negocios con decenas o cientos de artículos.

Tres entradas convergen en **una sola pantalla de revisión** (tabla editable): el comerciante nunca se salta la revisión antes de publicar, mismo principio que el resto del asistente ("Coyo arma el borrador, el usuario da el click final" — ver `composerPrefillStore.ts`).

| Entrada | Cómo llena la tabla |
|---|---|
| **Foto(s)** de menú/anaquel/lista de precios | Gemini analiza 1–6 imágenes y devuelve la lista completa de artículos detectados |
| **Texto pegado** (WhatsApp, Facebook, nota) | Gemini estructura el texto libre en artículos individuales |
| **Captura manual** ("+ Agregar fila") | El comerciante llena la fila él mismo, sin IA de por medio |

Las tres terminan en la misma tabla: agregar/editar/quitar filas, checkbox por fila para incluir/excluir, y un botón **"Publicar N artículos"** que envía solo las filas incluidas y sin errores.

---

## 2. Decisión de modelo de datos (motor compartido, tablas separadas)

Evaluado para la Fase 2 (catálogo personal en MarketPlace/Servicios): **NO** se reutiliza la tabla `articulos` de Business Studio. Motivo: `articulos` está profundamente acoplada a la arquitectura negocio→sucursal (`articulo_sucursales`, duplicar a sucursales, registry de imágenes R2, middlewares `verificarNegocio`/`validarAccesoSucursal`) — forzar un `usuario_id` de modo Personal ahí contaminaría esa lógica.

Lo que **sí** se comparte entre BS y Personal cuando llegue la Fase 2: la pantalla de revisión en lote (tabla editable) y el servicio de extracción por IA (`sugerirListaArticulos`/`sugerirListaArticulosDesdeTexto`), parametrizados por destino. El modelo de datos de abajo será propio del catálogo personal.

---

## 3. Backend

### 3.1 Alta en lote (sin IA)

Tabla `articulos` sin cambios de schema — el lote inserta N filas con la misma forma que `crearArticulo`, dentro de una única transacción (todo o nada).

| Método | Endpoint | Middlewares | Body |
|---|---|---|---|
| POST | `/api/articulos/bulk` | `verificarToken`, `verificarNegocio`, `validarAccesoSucursal` | `CrearArticuloInput[]` (1 a 100) |

- Validación: `crearArticuloLoteSchema = z.array(crearArticuloSchema).min(1).max(100)` (`validations/articulos.schema.ts`) — mismo patrón de forma que `duplicarArticuloSchema` (array de operaciones en una sola llamada).
- Service: `crearArticulosLote(negocioId, sucursalId, lote)` (`services/articulos.service.ts`) — itera el lote dentro de `db.transaction`, insertando `articulos` + `articulo_sucursales` por fila (igual que `crearArticulo`, repetido N veces en la misma transacción).
- Controller: `postCrearArticulosLote`.

### 3.2 Sugerencia por IA (foto y texto)

Ambas viven en `services/coyo/coyoIA.service.ts` — la única "cajita" que habla con Gemini. Nuevo tipo de salida `ArticuloCatalogoSugerido` (`tipo`, `nombre`, `descripcion`, `categoria`, `precioBase` — todos nullable salvo `tipo`/`nombre`), distinto de `ArticuloSugerido` (MarketPlace, que tiene `condicion` en vez de `precioBase`/`categoria` libre).

| Función | Entrada | Uso de Gemini |
|---|---|---|
| `sugerirListaArticulos(imagenesUrls: string[])` | 1 a `MAX_IMAGENES_SUGERIR_LISTA` (6) URLs de R2 | Multimodal: 1 mensaje con el prompt + N `inlineData` parts (una por imagen) |
| `sugerirListaArticulosDesdeTexto(texto: string)` | Texto libre pegado | Solo texto, sin `inlineData` |

Ninguna analiza N imágenes a la vez en ningún otro punto del código — hasta esta feature, `coyoIA.service.ts` solo mandaba una imagen por llamada (`sugerirDatosArticulo`, `interpretarPregunta`). Ambas funciones nuevas:
- Piden a Gemini un JSON `{"articulos": [...]}` (array, no objeto único) — parseo manual + `limpiarJsonDeGemini` + type guards (`esArticuloCatalogoSugeridoCrudo`, `esListaArticulosCatalogoCruda`), mismo patrón sin `responseSchema` nativo que el resto del archivo.
- Nunca inventan: si un precio o dato no es legible/visible, el campo vuelve `null` — la fila queda marcada con error en la tabla hasta que el comerciante la complete a mano.
- Reintento/fallback (`llamarGeminiConReintento`, modelos `gemini-2.5-flash` → `gemini-2.5-flash-lite`) heredado sin cambios.

**`sugerirListaArticulos` — prompt de doble caso (`PROMPT_SUGERIR_LISTA_ARTICULOS`).** El prompt le pide a Gemini distinguir entre:
- **Caso A — menú/anaquel/lista con varios artículos**: extracción literal, nunca inventa `nombre`/`descripcion`/`precioBase` — si no está escrito, `null`.
- **Caso B — una sola foto de un platillo/producto sin contexto de menú**: se trata como el único artículo y, a diferencia del Caso A, Gemini **sí redacta** `nombre` (título de venta) y `descripcion` (2-4 frases), tomando prestadas las reglas anti-"descripción de foto" de `PROMPT_SUGERIR_ARTICULO` (MarketPlace) — nunca "se ve"/"aparece en la imagen", nunca inventa ingredientes/marca no visibles. `precioBase` sigue `null` (una foto de un platillo no trae precio).
- **Caso C — ninguno de los anteriores** (objeto sin contexto de negocio, imagen ilegible): responde array vacío. Validado en producción con una foto de celulares sin ninguna etiqueta/precio visible — Gemini devolvió vacío correctamente en vez de inventar nombres/precios.

Este dual-caso vive **solo** en `sugerirListaArticulos` (foto) — `sugerirListaArticulosDesdeTexto` no lo necesita porque el texto pegado siempre es una lista, nunca "una sola foto sin contexto".

Wrappers en `services/articulos.service.ts` (mismo contrato que `sugerirArticuloConIA` de MarketPlace — **siempre** `code:200`, incluso con `success:false`, para que el frontend haga fallback silencioso):

| Método | Endpoint | Body | Wrapper |
|---|---|---|---|
| POST | `/api/articulos/sugerir-lote-ia` | `{ imagenesUrls: string[] }` (1–6) | `sugerirArticulosLoteConIA` |
| POST | `/api/articulos/sugerir-lote-texto-ia` | `{ texto: string }` (5–5000 chars) | `sugerirArticulosLoteTextoConIA` |

Middlewares: `verificarToken`, `verificarNegocio` (sin `validarAccesoSucursal` — no tocan datos de sucursal).

---

## 4. Frontend

**Ruta nueva:** `/business-studio/catalogo/alta-rapida` (página completa, no modal — el volumen de contenido de una tabla de hasta 100 filas no cabe cómodo en un modal). Acceso desde `PaginaCatalogo.tsx` con un botón ⚡ junto a "Nuevo Producto/Servicio" (móvil y desktop).

**Archivo:** `pages/private/business-studio/catalogo/PaginaAltaRapidaCatalogo.tsx`.

### 4.1 Tabla editable

Estado 100% local (`useState<FilaBorrador[]>`, sin React Query ni Zustand — es un borrador transitorio que se sube completo al publicar, no hay nada que cachear del servidor hasta ese momento). Edición **inline por celda** (cada celda es un `<input>`/toggle siempre editable, sin paso intermedio de "click para activar edición") — columnas: incluir (checkbox personalizado) + Tipo (toggle producto/servicio), Nombre + Descripción (input secundario debajo del nombre, opcional), Categoría (con `<datalist>` de categorías existentes del negocio), Precio, Acciones (visible/ocultar + eliminar, mismo patrón de íconos que `PaginaCatalogo.tsx`).

**Validación diferida al intento de publicar.** Las filas nunca nacen en rojo ni muestran error mientras el comerciante escribe. `validarFila` corre en vivo (`erroresPorFila`), pero el estado visual de error (`bg-red-50` + mensaje) solo se revela para las filas incluidas en `filasConErrorRevelado` — un `Set<clientId>` que se llena únicamente dentro de `handlePublicar` cuando la verificación encuentra datos incompletos (con un `notificar.error` resumiendo cuántas fallaron). Una fila nueva jamás hereda el estado de error de un intento previo porque no está en el set hasta el siguiente intento que la evalúe.

Validación cliente espejo de `crearArticuloSchema` (`validarFila`): nombre 2–150 chars, categoría ≤100, precio >0 y ≤999,999.99. Filas con error se resaltan (`bg-red-50`) y quedan excluidas del conteo "listos para publicar" — nunca bloquean el resto del lote.

Filas venidas de IA (foto o texto) llevan un punto morado junto al nombre ("Sugerido por IA — revisa antes de publicar") hasta que el comerciante las toca.

Límite de tabla: `MAX_FILAS = 100` (espejo del límite del backend).

Simplificación deliberada: la tabla usa `overflow-x-auto` con ancho mínimo (`min-w-[760px]`) en vez de un layout de cards apiladas para móvil — es un data-grid, no una lista de tarjetas, y ese patrón no existía antes en el proyecto.

### 4.2 Entrada por foto

Botón "Subir foto(s)" → input de archivo múltiple (`accept="image/*" multiple`, tope `MAX_IMAGENES_FOTO = 6`) → cada archivo se optimiza a WebP (`optimizarImagen`, mismo helper que `useR2Upload`) y se sube a R2 vía el endpoint existente `POST /articulos/upload-imagen` (subida standalone en paralelo con `Promise.all`, no usa `useR2Upload` porque ese hook maneja una sola imagen a la vez) → las URLs públicas se mandan a `useSugerirArticulosLoteIA` (`hooks/queries/useArticulos.ts`) → los resultados se agregan a la tabla vía `filaDesdeSugerencia`.

### 4.3 Entrada por texto

Botón "Pegar texto" abre un panel inline con `<textarea>` (tope `TEXTO_MAX_CHARS = 5000`, espejo del backend) → botón "Analizar texto" llama `useSugerirArticulosLoteTextoIA` → mismo `filaDesdeSugerencia` para agregar filas.

### 4.4 Hooks (React Query)

`hooks/queries/useArticulos.ts`:
- `useCrearArticulosLote()` — mutación del lote final. **Sin** update optimista (a diferencia de `useCrearArticulo`) — el volumen (hasta 100 filas) no se presta a un snapshot temporal razonable; invalida `queryKeys.articulos.porSucursal` + catálogo público al terminar, igual que `useDuplicarArticulo`.
- `useSugerirArticulosLoteIA()` / `useSugerirArticulosLoteTextoIA()` — usan el cliente axios crudo (`api`), no el wrapper `post<T>` de `articulosService.ts`, porque el backend responde `{success, code, data|razon}` directo sin el envelope estándar `RespuestaAPI`. Mismo patrón que `useSugerirArticuloIA` de MarketPlace (`useMarketplace.ts`).

---

## 5. Archivos tocados (índice)

- Backend: `db/schemas/schema.ts` (sin cambios), `validations/articulos.schema.ts`, `services/articulos.service.ts`, `services/coyo/coyoIA.service.ts`, `controllers/articulos.controller.ts`, `routes/articulos.routes.ts`
- Frontend: `types/articulos.ts`, `services/articulosService.ts`, `hooks/queries/useArticulos.ts`, `pages/private/business-studio/catalogo/PaginaAltaRapidaCatalogo.tsx` (nuevo), `pages/private/business-studio/catalogo/PaginaCatalogo.tsx` (botón de entrada), `router/index.tsx` (ruta nueva)

## 6. Pendiente (Fase 1 — Business Studio)

- QA E2E manual en prod (foto real de menú, texto pegado real, lote de 50+ filas).

---

## 7. Fase 2 — MarketPlace (Modo Personal, 2026-08-18)

**Ruta:** `/mis-publicaciones/alta-rapida`. **Archivo:** `pages/private/marketplace/PaginaAltaRapidaMarketplace.tsx`.

Reusa el modelo de datos existente de `articulos_marketplace` (NO tabla propia — a diferencia de lo que se había anticipado en la Fase 1, no hizo falta: el lote inserta N filas modo='vendo' con la misma forma que `crearArticulo`, dentro de una única transacción). Solo modo='vendo' — la carga masiva de "busco" no aplica.

**Entry point unificado:** el botón "Publicar" (header Laptop, header PC, FAB móvil de `PaginaMisPublicaciones.tsx`) abre un menú de 2 opciones SOLO cuando `tipoActivo==='marketplace'` — "Publicar 1 artículo" (composer de siempre) o "Subir varios" (esta página). En Servicios/Dinámicas sigue siendo un click directo, sin menú. Ver `MenuPublicarMarketplace` (subcomponente al final de `PaginaMisPublicaciones.tsx`).

### 7.1 Diferencias clave vs Fase 1 (Business Studio)

| | BS (menú/anaquel) | MarketPlace (objetos sueltos) |
|---|---|---|
| Semántica de fotos | 1-6 fotos = UN listado compartido (menú) | Fotos SUELTAS y mezcladas — Gemini las **agrupa por objeto físico** (mismo artículo en varios ángulos = 1 fila) |
| Precio por IA (foto) | Sí, si está impreso en el menú | **Nunca** — una foto de un artículo personal casi nunca trae el precio visible |
| Precio por IA (texto) | Sí | Sí (el vendedor normalmente ya lo escribió al pegar el texto) |
| Categoría | Texto libre + datalist | Selector real (FK a `categorias_marketplace`) |
| Checklist legal / ubicación | No aplica (BS no tiene) | **Una vez para todo el lote**, no por fila (`crearArticulosLoteMarketplaceSchema`) |
| Layout de fila | Grid tipo hoja de cálculo (desktop) + cards (móvil) | Una sola card responsive en todos los breakpoints — las fotos por fila (altura variable) no calzan bien en un grid rígido |

### 7.2 Agrupación de fotos por IA (`sugerirLoteArticulosMarketplace`)

`services/coyo/coyoIA.service.ts` — analiza hasta `MAX_IMAGENES_ALTA_RAPIDA_MARKETPLACE` (24) fotos sueltas en una sola llamada multimodal y devuelve grupos `{ indicesFotos, titulo, descripcion, condicion, categoriaId }`. Cuando Gemini duda si 2 fotos son el mismo objeto, el prompt le pide **separar, nunca fusionar** (mismo principio "nunca inventa" que el resto de Coyo) — es preferible una fila de más (el comerciante la une a mano) que fusionar 2 artículos distintos.

**Corrección de agrupación en la tabla, sin pantalla aparte:** cada fila muestra sus fotos en miniatura; quitar una foto de una fila la manda a un carrusel de "fotos sueltas sin asignar" en la parte superior, donde un `<select>` por foto permite reasignarla a otra fila existente o crear una fila nueva. No hay drag-and-drop — se usa el mismo patrón de selects/clicks del resto de la app.

### 7.3 Entrada por texto (`sugerirLoteArticulosMarketplaceDesdeTexto`)

Mismo principio que `sugerirListaArticulosDesdeTexto` (BS) pero con los campos de MarketPlace (`titulo`/`categoriaId`/`condicion`/`precio`) — sin `indicesFotos` (no hay fotos de por medio). El texto pegado casi siempre SÍ trae el precio (a diferencia de una foto), así que aquí la IA lo extrae cuando está escrito.

### 7.4 Backend — endpoints nuevos

| Método | Endpoint | Middlewares | Body |
|---|---|---|---|
| POST | `/api/marketplace/articulos/bulk` | `verificarToken`, `requiereModoPersonal` | `crearArticulosLoteMarketplaceSchema` (confirmaciones + ubicación una vez, `articulos[]` 1-100) |
| POST | `/api/marketplace/sugerir-lote-ia` | `verificarToken`, `requiereModoPersonal` | `{ imagenesUrls: string[] }` (1-30) |
| POST | `/api/marketplace/sugerir-lote-texto-ia` | `verificarToken`, `requiereModoPersonal` | `{ texto: string }` (5-5000 chars) |

`crearArticulosMarketplaceLote` (`services/marketplace.service.ts`): valida moderación (Capa 1, `validarTextoPublicacion`) de TODAS las filas antes de tocar la BD — si cualquiera dispara rechazo o sugerencia, no inserta nada y devuelve `erroresPorFila: [{indice, mensaje}]` (HTTP 422) para que el frontend resalte esas filas específicas. Sin "continuar de todos modos" por fila (a diferencia del composer individual) — se corrige el texto o se quita la fila. Inserción real en `db.transaction` (todo o nada), mismo patrón que `crearArticulosLote` de BS.

### 7.5 Pendiente

- QA E2E manual en prod (fotos reales de varios objetos mezclados, verificar agrupación; texto pegado real; lote de 20+ filas).
