# Video en Publicaciones (Negocios, MarketPlace, Servicios)

> 📋 **Estado: Plan — por implementar.** Este documento es el diseño acordado con Juan (1-ago-2026), pendiente de ejecución. Actualizar a ✅ y mover el detalle vivo a este mismo doc conforme se construya.

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
4. **Fix de reference-counting** (3 queries de "huérfana"): `jsonb_array_elements_text(fotos)` asume strings planos y se rompe con objetos. Cambiar a `EXISTS (SELECT 1 FROM jsonb_array_elements(fotos) elem WHERE elem->>'url' = ${url} OR elem->>'posterUrl' = ${url})` — la condición `OR posterUrl` es necesaria para que el poster de un video no se borre mientras el video siga existiendo. Aplicar el mismo fix en marketplace, servicios y negocio-publicaciones.
5. **Fix de diff en `actualizarArticulo`** (marketplace L1150) y su análogo en servicios: comparar por `.url` en vez de comparar strings directamente (`actual.fotos.filter(f => !urlsNuevas.has(f.url))`).
6. **`IMAGE_REGISTRY` / reconcile de R2 — sin cambios.** Confirmado: el GC (`apps/api/src/utils/imageRegistry.ts` + `apps/api/src/services/admin/mantenimiento.service.ts`) extrae URLs con `regexp_matches(columna::text, patrón_dominio_r2, 'g')` sobre el texto crudo del jsonb, sin `JSON.parse` — encuentra las URLs igual estén en `["url"]` o en `[{"url":"...","tipo":"video","posterUrl":"..."}]`. No se agrega ninguna entrada nueva.

## 3. Frontend — subida

1. **Nuevo helper `apps/web/src/utils/procesarVideo.ts`**, espejo estructural de `optimizarImagen.ts` (Promise + cleanup de blob URLs): crea un `<video>` oculto, en `loadedmetadata` valida `duration ≤ 60s`, hace seek a un frame representativo, en `seeked` dibuja a canvas y exporta el poster con `toBlob(..., 'image/webp', 0.85)`. Exporta también las constantes `MAX_VIDEO_BYTES = 50*1024*1024` y `MAX_VIDEO_DURACION_SEG = 60`. El video NO se comprime/transcodifica — se sube tal cual.
2. **Los 3 hooks `useFotosUploaderMarketplace.ts` / `useFotosUploaderServicios.ts` / `useFotosUploaderNegocioPublicacion.ts`**: cambio idéntico en los tres.
   - Tipo de `fotos` pasa de `string[]` a `ArchivoFoto[]`.
   - `TIPOS_PERMITIDOS` amplía a incluir `video/mp4` y `video/webm`.
   - `subirUno()` se bifurca por `archivo.type`: imagen sigue el flujo actual (retorna `{url, tipo:'imagen'}`); video valida tamaño (50MB) antes de procesar, llama `procesarVideo()`, sube primero el poster (mismo flujo presigned+PUT que una foto) y luego el video original, retorna `{url, tipo:'video', posterUrl}`.
   - `eliminar(idx)`: si el elemento es video, dispara la mutación de "foto huérfana" **dos veces** (una para `url`, otra para `posterUrl`) — no se cambia el contrato del endpoint, que sigue recibiendo una sola URL por request.
   - `accept` de los inputs de galería/cámara: agrega `video/mp4,video/webm` a la lista existente.
3. **Tipo compartido `apps/web/src/types/archivoFoto.ts`** y actualización de los tipos `fotos: string[]` existentes en `types/marketplace.ts`, `types/negocioPublicaciones.ts`, `types/servicios.ts` y los drafts de los 3 hooks de composer.
4. `apps/web/src/utils/marketplace.ts` — `obtenerFotoPortada` cambia de devolver un `string` a devolver el objeto `ArchivoFoto` completo (el caller necesita `tipo` para decidir si mostrar ícono de play).

## 4. Frontend — render

1. **`ModalImagenes.tsx`**: prop `images: string[]` → `items: ArchivoFoto[]`. Donde hoy renderiza `<img src={images[indiceActual]}>`, agrega rama condicional: si `items[indiceActual].tipo === 'video'`, renderiza `<video src={...} poster={posterUrl} controls playsInline>` con las mismas clases de tamaño; si es imagen, `<img>` como hoy. El resto (swipe, teclado, contador, botón descargar/cerrar) es agnóstico al tipo de medio y no cambia de lógica, solo de dónde lee la URL. Hay que actualizar todos los call-sites que le pasan `images={...}` (confirmados: `GaleriaArticulo.tsx`, `GaleriaServicio.tsx`, `GaleriaPublicacionNegocio.tsx`, `CardArticuloFeed.tsx`, `CardServicioFeed.tsx`, `CardPublicacionNegocioFeed.tsx` (x2), `ComposerMarketplace.tsx`, `ComposerServicios.tsx`, `ComposerPublicacionNegocio.tsx`).
2. **Los 6 carruseles manuales duplicados** (sin Embla/Swiper, no se unifican en este trabajo — se replica el mismo patrón en cada uno):
   - `apps/web/src/components/marketplace/GaleriaArticulo.tsx`
   - `apps/web/src/components/servicios/GaleriaServicio.tsx`
   - `apps/web/src/components/negocios/publicaciones/GaleriaPublicacionNegocio.tsx`
   - `apps/web/src/components/marketplace/CardArticuloFeed.tsx`
   - `apps/web/src/components/servicios/CardServicioFeed.tsx`
   - `apps/web/src/components/negocios/publicaciones/CardPublicacionNegocioFeed.tsx`

   En cada `.map((foto, idx) => ...)`, cuando `foto.tipo === 'video'` se muestra `<img src={foto.posterUrl}>` con un ícono `Play` de `lucide-react` superpuesto (14-16px en miniaturas / 28-32px en el slide principal, sin círculo pastel de fondo — Regla 13 de `docs/estandares/TOKENS_GLOBALES.md`, solo el ícono blanco con `drop-shadow` para legibilidad). Click abre el mismo `ModalImagenes` (`items={fotosOrdenadas}`), que reproduce el `<video>` automáticamente por el `tipo`.
3. **Los 3 composers** (grid de previsualización + botón borrar): mismo tratamiento que los carruseles (poster + ícono play) en `ComposerMarketplace.tsx`, `ComposerServicios.tsx`, `ComposerPublicacionNegocio.tsx`. Mientras un video está subiendo, el preview puede usar el blob URL local directo en un `<video>` (el navegador ya muestra el primer frame sin esperar el poster procesado).
4. **Los 4 sitios de thumbnail simple** (sin carrusel, sin overlay de play — son thumbnails pequeños de listas administrativas): `CardArticuloGuardado.tsx`, `useIniciarChatMarketplace.ts`, `FilaPublicacionMobile.tsx` (Business Studio → Publicaciones), `TablaPublicaciones.tsx`. Cambian de usar la URL directa a resolver `foto.tipo === 'video' ? foto.posterUrl : foto.url`.

## Orden de ejecución recomendado

1. Backend: Zod schemas + whitelist MIME + fix de las 3 queries de huérfanas (base de contrato).
2. Migración SQL — Juan la corre en dev.
3. Backend: fix del diff en `actualizarArticulo`/análogo de servicios.
4. Frontend: tipo `ArchivoFoto` + helper `procesarVideo.ts` (funciones puras, sin dependencias de UI).
5. Frontend: los 3 hooks `useFotosUploader*`.
6. Frontend: `ModalImagenes.tsx` (prop `items`) — antes de tocar los carruseles, porque todos dependen de su nueva firma.
7. Frontend: los 6 carruseles + 3 composers + 4 thumbnails simples — módulo por módulo (MarketPlace completo → Servicios → negocio-publicaciones), probando cada uno antes de pasar al siguiente.

## Verificación end-to-end sugerida

Con el dev server abierto en el navegador (Business Studio / público):
1. Composer de MarketPlace: subir 1 foto + 1 video `.mp4` corto → el preview muestra poster+play mientras sube; al terminar, aparece en el grid.
2. Subir un video de más de 60s → debe rechazarse con `notificar.error` sin llegar a pedir presigned URL al backend.
3. Publicar y abrir el detalle (`GaleriaArticulo`) → el slide de video muestra poster+play; click abre `ModalImagenes` y reproduce el `<video>` con controles nativos.
4. Editar la publicación y quitar la foto de video → en Network deben verse 2 requests a `foto-huerfana` (video + poster).
5. Repetir 1, 3 y 4 en Servicios y en Publicaciones de Negocio.
6. Revisar que `TablaPublicaciones.tsx` (Business Studio) muestra el poster como thumbnail cuando la portada es video.
