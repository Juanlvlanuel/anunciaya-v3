# Video en Publicaciones (Negocios, MarketPlace, Servicios)

> ✅ **Estado: Código implementado (1-ago-2026)** — backend + frontend de las 3 secciones (MarketPlace, Servicios, Publicaciones de Negocio) construidos siguiendo este plan, `tsc` limpio en `apps/api` y `apps/web`. **Pendiente:**
> 1. Juan corre `docs/migraciones/2026-08-01-video-en-fotos-jsonb.sql` en dev (y luego en prod).
> 2. QA E2E manual en navegador siguiendo la sección "Verificación end-to-end sugerida" de este doc — no se hizo verificación visual automatizada en esta sesión.

## Contexto

Hoy solo se pueden publicar fotos en el feed de publicaciones de negocio (`negocio_publicaciones`), MarketPlace (`articulos_marketplace`) y Servicios (`servicios_publicaciones`). Se quiere que los comerciantes/usuarios también puedan subir clips de video cortos (demo de producto, recorrido del local, servicio en acción) en esas mismas publicaciones. Queda **fuera de alcance** la galería de perfil del negocio (`negocio_galeria`, Business Studio → Perfil → Imágenes) — es una tabla y patrón distintos, no se toca en este trabajo.

Decisiones cerradas:
- Las 3 secciones se implementan juntas (comparten estructura casi idéntica: hook de subida, composer, galería de detalle, card de feed).
- Video y fotos conviven en el mismo arreglo `fotos` (columna jsonb) — no hay un campo separado.
- Límite por video: **50MB / 60 segundos**, validado en frontend antes de subir (igual que hoy se valida tamaño de foto client-side; backend no valida tamaño de archivo para nada — limitación conocida y aceptada, no se resuelve en este trabajo).
- Sin transcodificación (no hay ffmpeg en el repo): se acepta `video/mp4` y `video/webm` tal cual los graba el navegador; se descarta `video/quicktime` (.mov de iPhone) por riesgo de no reproducir en Chrome/Android.
- El poster/thumbnail del video se genera en el **frontend** capturando un frame a canvas (no hay backend de procesamiento de video).

## Shape del dato

```ts
interface ArchivoFoto {
  url: string;
  tipo: 'imagen' | 'video';
  /** Solo presente cuando tipo === 'video'. Poster generado en frontend. */
  posterUrl?: string;
}
```

- El array sigue llamándose `fotos` en DB/Zod/TS/props — no se renombra a `media`, para minimizar el blast radius.
- El poster va **embebido** como `posterUrl` dentro del mismo objeto de video (no como elemento separado del array): así no consume uno de los 12/40 slots del tope, y `fotoPortadaIndex` sigue apuntando a un solo índice sin ambigüedad.
- Tipo compartido nuevo: `apps/web/src/types/archivoFoto.ts` (frontend) y un `archivoFotoSchema` de Zod reusado en los 3 `.schema.ts` de backend.

## 1. Migración de datos SQL (Juan la corre manualmente, dev primero)

Archivo: `docs/migraciones/2026-08-01-video-en-fotos-jsonb.sql`. Transforma cada elemento string existente de `articulos_marketplace.fotos`, `servicios_publicaciones.fotos` y `negocio_publicaciones.fotos` en `{"url": <string>, "tipo": "imagen"}`, usando `jsonb_array_elements` + `CASE WHEN jsonb_typeof(elem) = 'string'` (idempotente, no toca elementos que ya sean objeto). Un `UPDATE` por tabla, dentro de una sola transacción.

## 2. Backend

**Rutas confirmadas:**
- `apps/api/src/services/marketplace.service.ts` — `generarUrlUploadImagenMarketplace`, whitelist MIME inline; `eliminarFotoMarketplaceSiHuerfana` L144-173 (query L157); diff de fotos removidas en `actualizarArticulo` L1150.
- `apps/api/src/services/servicios.service.ts` — `generarUrlUploadImagen` L1535-1548 (whitelist L1547); análogo de huérfanas y diff (confirmar línea exacta al editar, mismo patrón).
- `apps/api/src/services/negocioPublicaciones.service.ts` — `generarUrlUploadImagenNegocioPublicacion` L631-636 (whitelist L635, `TIPOS_PERMITIDOS`); este módulo NO hace diff en update, la limpieza de huérfanas ocurre solo vía endpoint dedicado `foto-huerfana` llamado por el composer.
- `apps/api/src/validations/marketplace.schema.ts`, `servicios.schema.ts`, `negocioPublicaciones.schema.ts` — `uploadImagenSchema` (enum de `contentType`) y `campoFotos` (array de fotos).

**Cambios:**
1. **Whitelist MIME** en los 3 `generarUrlUploadImagen*`: agregar `'video/mp4'` y `'video/webm'` al array de tipos permitidos. `generarPresignedUrl` en `r2.service.ts` no requiere cambios (ya acepta `tiposPermitidos?: string[]` genérico).
2. **Zod `uploadImagenSchema`** (3 archivos): ampliar el enum de `contentType` a los 5 MIME (3 imagen + 2 video).
3. **Zod `campoFotos`** (3 archivos): pasa de `z.array(z.string().url()).max(N)` a `z.array(archivoFotoSchema).max(N)`, con:
   ```ts
   const archivoFotoSchema = z.object({
     url: z.string().url(),
     tipo: z.enum(['imagen', 'video']),
     posterUrl: z.string().url().optional(),
   });
   ```
4. **Fix de reference-counting** (3 queries de "huérfana"): `jsonb_array_elements_text(fotos)` asume strings planos y se rompe con objetos. Cambiar a `EXISTS (SELECT 1 FROM jsonb_array_elements(fotos) elem WHERE COALESCE(elem->>'url', elem#>>'{}') = ${url} OR elem->>'posterUrl' = ${url})` — la condición `OR posterUrl` es necesaria para que el poster de un video no se borre mientras el video siga existiendo. El `COALESCE(elem->>'url', elem#>>'{}')` es **tolerante a los dos formatos a la vez** (string plano pre-migración y objeto post-migración): `elem->>'url'` da `NULL` sobre un elemento que todavía es string escalar, y en ese caso cae a `elem#>>'{}'` (el string tal cual). Esto es necesario porque el deploy del backend (automático, cada push a main) y la migración SQL (manual, Juan la corre por ambiente) no están sincronizados — sin esta tolerancia, cualquier fila no migrada haría que la query reporte `total=0` aunque la foto siga en uso en otra fila, y `eliminarFotoXXXSiHuerfana` la borraría de R2 por error. Aplicar el mismo fix en marketplace, servicios y negocio-publicaciones.
5. **Fix de diff en `actualizarArticulo`** (marketplace L1150) y su análogo en servicios: comparar por `.url` en vez de comparar strings directamente (`actual.fotos.filter(f => !urlsNuevas.has(f.url))`).
6. **`IMAGE_REGISTRY` / reconcile de R2 — sin cambios.** Confirmado: el GC (`apps/api/src/utils/imageRegistry.ts` + `apps/api/src/services/admin/mantenimiento.service.ts`) extrae URLs con `regexp_matches(columna::text, patrón_dominio_r2, 'g')` sobre el texto crudo del jsonb, sin `JSON.parse` — encuentra las URLs igual estén en `["url"]` o en `[{"url":"...","tipo":"video","posterUrl":"..."}]`. No se agrega ninguna entrada nueva.

## 3. Frontend — subida

1. **Nuevo helper `apps/web/src/utils/procesarVideo.ts`**, espejo estructural de `optimizarImagen.ts` (Promise + cleanup de blob URLs): crea un `<video>` oculto, en `loadedmetadata` valida `duration ≤ 60s`, hace seek a un frame representativo, en `seeked` dibuja a canvas y exporta el poster con `toBlob(..., 'image/webp', 0.85)`. Exporta también las constantes `MAX_VIDEO_BYTES = 50*1024*1024` y `MAX_VIDEO_DURACION_SEG = 60`. El video NO se comprime/transcodifica — se sube tal cual.
2. **Los 3 hooks `useFotosUploaderMarketplace.ts` / `useFotosUploaderServicios.ts` / `useFotosUploaderNegocioPublicacion.ts`**: cambio idéntico en los tres.
   - Tipo de `fotos` pasa de `string[]` a `ArchivoFoto[]`.
   - `TIPOS_PERMITIDOS` amplía a incluir `video/mp4` y `video/webm`.
   - `subirUno()` se bifurca por `archivo.type`: imagen sigue el flujo actual (retorna `{url, tipo:'imagen'}`); video valida tamaño (50MB) antes de procesar, llama `procesarVideo()`, sube primero el poster (mismo flujo presigned+PUT que una foto) y luego el video original, retorna `{url, tipo:'video', posterUrl}`.
   - `eliminar(idx)`: si el elemento es video, dispara la mutación de "foto huérfana" **dos veces** (una para `url`, otra para `posterUrl`) — no se cambia el contrato del endpoint, que sigue recibiendo una sola URL por request.
   - `accept` del input de **Galería**: agrega `video/mp4,video/webm` a la lista existente — mezclar tipos ahí no da problema porque no usa `capture`.
   - **Cámara nativa — 2 inputs ocultos, no 1.** `capture="environment"` solo puede abrir la cámara del teléfono en UN modo (foto o video) según el `accept` del input — mezclar `image/*`+`video/*` en un solo input rompe el salto directo a la cámara en Android/Chrome (cae al selector genérico de archivos, indistinguible de "galería"; confirmado por Juan probando en dispositivo real). Por eso cada hook expone **dos** inputs cámara: `inputCamaraProps` (`accept` solo imagen) + `inputCamaraVideoProps` (`accept` solo video), cada uno con su propio ref y su propia función (`abrirCamara()` / `abrirCamaraVideo()`).
   - **Chip "Cámara" → popup "Tomar foto" / "Grabar video"** (decisión de Juan): el chip ya no dispara la cámara directo — abre un popup pequeño con las 2 opciones, cada una dispara el input correspondiente. Implementado igual en los 3 composers (`ComposerMarketplace.tsx`, `ComposerServicios.tsx`, `ComposerPublicacionNegocio.tsx`): estado `menuCamaraAbierto` + cierre por click-afuera (mismo patrón que el dropdown "⋯" de `CardArticuloMio.tsx`). Ojo con el posicionamiento: en MarketPlace/Servicios la fila de chips tiene `overflow-x-auto` (scroll horizontal) — el popup se ancla al contenedor exterior (`relative`, sin overflow) como hermano de esa fila, no como hijo del botón, o el propio scroll lo recorta verticalmente. En Negocios la fila no scrollea, así que el popup sí puede anidarse directo en el wrapper del botón.
3. **Tipo compartido `apps/web/src/types/archivoFoto.ts`** y actualización de los tipos `fotos: string[]` existentes en `types/marketplace.ts`, `types/negocioPublicaciones.ts`, `types/servicios.ts` y los drafts de los 3 hooks de composer.
4. `apps/web/src/utils/marketplace.ts` — `obtenerFotoPortada` cambia de devolver un `string` a devolver el objeto `ArchivoFoto` completo (el caller necesita `tipo` para decidir si mostrar ícono de play).

## 4. Frontend — render

1. **`ModalImagenes.tsx`**: **NO renombrar la prop.** `images` se comparte con ~38 call-sites en toda la app (avatar en `TabDatosPersonales.tsx`, ChatYA `VentanaChat.tsx`, Catálogo BS `ModalArticulo.tsx`, Ofertas, CardYA, drawers de perfil, etc.) que no tienen nada que ver con este trabajo — renombrar a `items: ArchivoFoto[]` obligaría a tocar los ~30 que no usan video solo para que compile. En vez de eso, ampliar el tipo a `images: (string | ArchivoFoto)[]` (unión, retrocompatible): un elemento `string` se sigue tratando como imagen igual que hoy; un elemento `ArchivoFoto` con `tipo === 'video'` renderiza `<video src={...} poster={posterUrl} controls playsInline>` con las mismas clases de tamaño; `ArchivoFoto` con `tipo === 'imagen'` (o un string suelto) renderiza `<img>` como hoy. El resto (swipe, teclado, contador, botón descargar/cerrar) es agnóstico al tipo de medio y no cambia de lógica, solo de dónde lee la URL. Solo hace falta actualizar los call-sites de las 3 secciones en alcance, que ya pasan `ArchivoFoto[]` en vez de `string[]`: `GaleriaArticulo.tsx`, `GaleriaServicio.tsx`, `GaleriaPublicacionNegocio.tsx`, `CardArticuloFeed.tsx`, `CardServicioFeed.tsx`, `CardPublicacionNegocioFeed.tsx` (x2), `ComposerMarketplace.tsx`, `ComposerServicios.tsx`, `ComposerPublicacionNegocio.tsx`. El resto de los ~30 call-sites no se toca — siguen pasando `string[]` sin cambios.
2. **Los 6 carruseles manuales duplicados** (sin Embla/Swiper, no se unifican en este trabajo — se replica el mismo patrón en cada uno):
   - `apps/web/src/components/marketplace/GaleriaArticulo.tsx`
   - `apps/web/src/components/servicios/GaleriaServicio.tsx`
   - `apps/web/src/components/negocios/publicaciones/GaleriaPublicacionNegocio.tsx`
   - `apps/web/src/components/marketplace/CardArticuloFeed.tsx`
   - `apps/web/src/components/servicios/CardServicioFeed.tsx`
   - `apps/web/src/components/negocios/publicaciones/CardPublicacionNegocioFeed.tsx`

   En cada `.map((foto, idx) => ...)`, cuando `foto.tipo === 'video'` se muestra `<img src={foto.posterUrl}>` con un ícono `Play` de `lucide-react` superpuesto (14-16px en miniaturas / 28-32px en el slide principal, sin círculo pastel de fondo — Regla 13 de `docs/estandares/TOKENS_GLOBALES.md`, solo el ícono blanco con `drop-shadow` para legibilidad). Click abre el mismo `ModalImagenes` (`items={fotosOrdenadas}`), que reproduce el `<video>` automáticamente por el `tipo`.
3. **Los 3 composers** (grid de previsualización + botón borrar): mismo tratamiento que los carruseles (poster + ícono play) en `ComposerMarketplace.tsx`, `ComposerServicios.tsx`, `ComposerPublicacionNegocio.tsx`. Mientras un video está subiendo, el preview puede usar el blob URL local directo en un `<video>` (el navegador ya muestra el primer frame sin esperar el poster procesado).
4. **Todos los consumidores de `obtenerFotoPortada`** (su retorno cambia de `string` a `ArchivoFoto` — ver 3.4 — así que TypeScript marca como error de compilación cualquiera que no se toque; no hay riesgo de que se escape uno silenciosamente, pero hay que decidir de una vez el tratamiento de cada uno en vez de ir descubriéndolos uno por uno con `tsc`):
   - **Sin carrusel, sin overlay de play** (thumbnails pequeños de listas administrativas/chat, solo resuelven `foto.tipo === 'video' ? foto.posterUrl : foto.url`): `CardArticuloGuardado.tsx`, `useIniciarChatMarketplace.ts`, `FilaPublicacionMobile.tsx` (Business Studio → Publicaciones), `TablaPublicaciones.tsx`.
   - **Cards de feed/perfil con thumbnail de portada** (mismo tratamiento poster+ícono play que los carruseles del punto 2, en miniatura): `CardArticuloMio.tsx`, `CardArticuloReel.tsx`, `CardServicioMio.tsx`, `CardServicioReel.tsx`, `CardServicio.tsx`, `OverlayBuscadorServicios.tsx`.
   - **Páginas de detalle público/privado** (portada grande, mismo tratamiento poster+play que `ModalImagenes`): `PaginaArticuloMarketplace.tsx`, `PaginaArticuloMarketplacePublico.tsx`, `PaginaPublicacionNegocioPublica.tsx`, `PaginaServicioPublico.tsx`, `CuerpoArticuloMarketplace.tsx`, `CuerpoPublicacionNegocio.tsx`.

## Orden de ejecución recomendado

1. Backend: Zod schemas + whitelist MIME + fix de las 3 queries de huérfanas (base de contrato). Gracias al `COALESCE` tolerante a ambos formatos, este paso ya no depende de que la migración SQL haya corrido antes en ese ambiente.
2. Migración SQL — Juan la corre en dev (y luego en prod, en su propio momento).
3. Backend: fix del diff en `actualizarArticulo`/análogo de servicios.
4. Frontend: tipo `ArchivoFoto` + helper `procesarVideo.ts` (funciones puras, sin dependencias de UI).
5. Frontend: los 3 hooks `useFotosUploader*`.
6. Frontend: `ModalImagenes.tsx` (prop `images` ampliada a unión) — antes de tocar los carruseles, porque los 9 call-sites en alcance dependen de la nueva rama de render; el resto de sus ~30 call-sites no se toca.
7. Frontend: los 6 carruseles + 3 composers + los consumidores de `obtenerFotoPortada` (thumbnails simples, cards de feed/perfil y páginas de detalle) — módulo por módulo (MarketPlace completo → Servicios → negocio-publicaciones), probando cada uno antes de pasar al siguiente.

## 5. UX del video en el feed — estilo Facebook (añadido 1-ago-2026, tras probar en dispositivo real)

Iteración posterior al plan original, pedida por Juan tras ver el video funcionando: el feed debía comportarse como el de Facebook — autoplay al pasar, pantalla completa con flecha de regreso, y el área del video más alta que la de una foto.

1. **`apps/web/src/hooks/useEnViewport.ts`** (nuevo, compartido): wrapper de `IntersectionObserver` — `[ref, enViewport] = useEnViewport<T>({ threshold })`. `threshold` default 0.6.
2. **`apps/web/src/components/ui/ControlesVideo.tsx`** (nuevo, compartido, 1-ago-2026): barra de controles PROPIA estilo Facebook, acento azul (`blue-500`, tono de Negocios, no el teal de MarketPlace) — play/pausa, línea de tiempo (click para buscar, con margen `mx-1` para no ir borde a borde), botón de comentarios (`MessageCircle`, opcional vía `onToggleComentarios`/`comentariosAbiertos` — se resalta en azul cuando el sidebar del caller está abierto), ajustes (velocidad 0.5x–2x), volumen con slider vertical al hover **con bolita arrastrable** (mousedown+mousemove en window para que el drag siga funcionando aunque el cursor se salga de la pastilla chica; click en el ícono silencia/activa), expandir. Reemplaza los controles nativos del navegador (que no se pueden personalizar así, ni con esa barra de volumen vertical) **solo en escritorio** (`useBreakpoint().esEscritorio`) — en móvil se sigue usando el atributo `controls` nativo, porque un slider vertical arrastrable no es una interacción táctil estándar. Recibe `videoRef` + `contenedorRef` (elemento sobre el que detecta movimiento de mouse para mostrar/ocultar la barra tras ~2.5s de inactividad; si el video está en pausa, se queda visible) + `onExpandir` + opcionalmente `onToggleComentarios`/`comentariosAbiertos`. **Bug corregido (1-ago-2026):** la pastilla de volumen se abría por `onMouseEnter`/cerraba por `onMouseLeave` del wrapper del ícono, pero había un hueco real de 28px (`bottom-7`) entre el ícono y la pastilla — al subir el mouse en línea recta el cursor pasaba sobre el video (fuera del wrapper) a mitad de camino, disparando `mouseleave` y escondiéndola antes de llegar. Fix: la pastilla ahora toca el ícono sin hueco real (`bottom-full`), el espacio visual es `padding` interno (sigue siendo parte del área "hovereable"). La línea de tiempo (buscar) sigue siendo solo click, sin drag.
3. **`apps/web/src/components/ui/ModalVideoFeed.tsx`** (nuevo, compartido): fullscreen vía portal (mismo `usePortalTarget`/`useBackNativo` que `ModalImagenes`), en cualquier breakpoint (móvil y escritorio). En escritorio usa `ControlesVideo` en vez de los controles nativos, y al abrirse pide automáticamente la pantalla completa NATIVA del navegador (Fullscreen API) — mismo efecto que Facebook (banner "Esc para salir de pantalla completa" incluido). **Importante:** el fullscreen se pide sobre el DIV WRAPPER que contiene TODO — `<video>` + `ControlesVideo` + botón de cerrar + sidebar de comentarios —, no sobre el `<video>` solo — si no, todo lo que quede AFUERA de ese wrapper (como hermano) desaparece al entrar a fullscreen nativo (el navegador solo renderiza el elemento fullscreenado y sus hijos, no sus hermanos). **Bug real encontrado y corregido 1-ago-2026:** originalmente el header con el botón de regreso vivía FUERA del wrapper (como hermano, en un `<div>` aparte arriba) — al entrar a fullscreen nativo en escritorio, ese header desaparecía, y el navegador metía su propio control genérico de "salir de pantalla completa" (una "X" que no se puede estilizar ni quitar) porque detectaba que la página no ofrecía ningún control visible de cierre dentro de lo fullscreenado. Fix: el botón de cerrar se movió DENTRO del wrapper (`absolute left-2 top-2`, ya no un header en flujo normal arriba) — es una X gris (no la flecha `ChevronLeft` que se usaba antes; Juan pidió el cambio junto con la corrección), así siempre queda visible sea que el navegador esté en fullscreen nativo o no. Si sale de la pantalla completa (Esc, o el botón "expandir" de la propia barra), el modal se cierra junto con ella. En móvil no se pide fullscreen nativo ni se usa `ControlesVideo` (se queda con `controls` nativo simple): tomaría el reproductor del sistema operativo y taparía nuestra UI. **Click directo sobre el video (solo escritorio, cursor `pointer`):** 1 click = play/pausa, 2 clicks rápidos = minimizar (cerrar) — distinguidos con un timeout de 250ms (`clickVideoTimeoutRef`) en vez de `onClick`+`onDoubleClick` directos, porque un doble click real de todos modos dispara 2 eventos "click" antes del "dblclick" nativo. **Comentarios — sidebar estilo Facebook (agregado 1-ago-2026):** `children` opcional — cada caller compone HEADER (autor) + comentarios como `children`, mismos componentes que ya usaba el modal de comentarios de escritorio del módulo (`ModalComentariosMarketplace.tsx` / `ModalComentariosPublicacionNegocio.tsx` / `ModalComentariosServicio.tsx`): `HeaderArticuloMarketplace`+`SeccionComentariosMarketplace`, `HeaderPublicacionNegocio`+`SeccionComentariosPublicacionNegocio`, o en Servicios `HeaderPublicacionServicio`+`ListaComentariosServicio`+`InputComentarioServicio`. El header pide el DETALLE completo (`useArticuloMarketplace`/`usePublicacionNegocio`/`usePublicacionServicio`, mismo hook que ya usaba cada `ModalComentarios*`) — con `enabled` implícito vía `id ?? undefined` pasado condicionalmente a `videoFullscreenAbierto`, así NO se pide mientras el visor está cerrado (evita 1 fetch de detalle por card del feed, solo se dispara al abrir el video). El bloque header va `shrink-0` y el bloque de comentarios `flex-1 min-h-0` dentro del `flex-col` del sidebar. Solo en escritorio, arranca CERRADO, se abre/cierra con el ícono de comentarios de `ControlesVideo` (`comentariosAbiertos` state local). El sidebar (`w-[360px] bg-white`) vive DENTRO del wrapper fullscreenado, por la misma razón que el botón de cerrar. En móvil no se ofrece — comentar ahí sigue siendo desde el modal de comentarios normal del módulo.
4. **Autoplay muted en los 3 `Card*Feed.tsx`** (`CardArticuloFeed`, `CardServicioFeed`, `CardPublicacionNegocioFeed`): el slide de video ACTUAL (`esCurr`) se reemplaza por un `<video autoPlay muted loop playsInline>` real solo cuando `galeriaEnViewport` es true (si no, se muestra el poster+ícono play estático de siempre — sin esto el navegador seguiría reproduciendo audio/CPU fuera de vista). En escritorio monta `ControlesVideo` encima (mismo patrón que `ModalVideoFeed`, `contenedorRef` = la misma `galeriaRef` de `useEnViewport`, `onExpandir` abre `ModalVideoFeed`, sin `onToggleComentarios` — el toggle de sidebar solo aplica dentro de `ModalVideoFeed`); en móvil usa `controls` nativo. Antes tenía un botón propio de silenciar/activar sonido (`Volume2`/`VolumeX`) en la esquina inferior derecha — quitado 1-ago-2026 al agregar `ControlesVideo`, que ya trae su propio control de volumen en esa misma esquina.
5. **Click en un slide de video** → NO navega al detalle ni abre `ModalImagenes` (eso sigue siendo el comportamiento para fotos) — abre `ModalVideoFeed` con la misma "Sección comentarios" del módulo como `children` (sidebar, ver punto 3). El cursor en escritorio sobre el slide es `lg:cursor-pointer` tanto para foto como para video en los 3 `Card*Feed.tsx` (antes Negocios tenía `lg:cursor-zoom-in` en fotos, corregido 1-ago-2026 para que los 3 módulos se comporten igual).
6. **Contenedor de la galería más alto solo cuando el slide activo es video**: `aspect-[4/3] lg:aspect-[2/1]` (foto, sin cambios) vs `aspect-[4/5] lg:aspect-[3/4]` (video) — cambia dinámicamente con `indiceFoto` si el post mezcla fotos y video.

## Verificación end-to-end sugerida

Con el dev server abierto en el navegador (Business Studio / público):
1. Composer de MarketPlace: subir 1 foto + 1 video `.mp4` corto → el preview muestra poster+play mientras sube; al terminar, aparece en el grid.
2. Subir un video de más de 60s → debe rechazarse con `notificar.error` sin llegar a pedir presigned URL al backend.
3. Publicar y abrir el detalle (`GaleriaArticulo`) → el slide de video muestra poster+play; click abre `ModalImagenes` y reproduce el `<video>` con controles nativos.
4. Editar la publicación y quitar la foto de video → en Network deben verse 2 requests a `foto-huerfana` (video + poster).
5. Repetir 1, 3 y 4 en Servicios y en Publicaciones de Negocio.
6. Revisar que `TablaPublicaciones.tsx` (Business Studio) muestra el poster como thumbnail cuando la portada es video.
