# Sprint 4 — MarketPlace: Wizard de Publicar / Editar

## Contexto

El comprador ya puede ver el feed (Sprint 2) y el detalle (Sprint 3). Ahora construimos la pantalla del **vendedor**: el wizard de 3 pasos para publicar un artículo nuevo o editar uno existente.

Este sprint también implementa la **Capa 1 de Moderación Autónoma** (filtro de palabras prohibidas, detección de servicios, detección de búsquedas).

## Antes de empezar

1. Lee la **Pantalla 4 (P4)** completa del documento:
   - `docs/arquitectura/MarketPlace.md` — sección §8 P4 — Wizard de Publicar / Editar
2. Lee también **completa** la sección de moderación:
   - §7 Moderación Autónoma (especialmente §1.2 palabras prohibidas, §1.3 servicios, §1.4 búsquedas, §1.5 precio)
3. Revisa estos archivos como referencia:
   - `apps/web/src/hooks/useR2Upload.ts` — patrón de upload directo a R2 con presigned URL
   - `apps/web/src/components/onboarding/` (si existe) — patrón de wizard con pasos
   - `apps/web/src/components/ui/Input.tsx` — componente base de inputs
   - `apps/api/src/services/r2.service.ts` — service de R2

## Alcance del Sprint

### Backend

1. **Endpoint** `POST /api/marketplace/upload-imagen` — devuelve presigned URL para subir foto a R2 con prefijo `marketplace/`. Reusa patrón de `r2.service.ts` existente.

2. **Endpoints de creación y edición:**
   - `POST /api/marketplace/articulos` (crear)
   - `PUT /api/marketplace/articulos/:id` (editar — solo dueño)

3. **Filtros de moderación** en `apps/api/src/services/marketplace/filtros.ts`:
   - Constante `PALABRAS_PROHIBIDAS` con las categorías del documento (rifas, subastas, esquemas, adultos, ilegal)
   - Función `detectarPalabraProhibida(texto)` — case-insensitive, ignora acentos, match por palabra completa con `\b`
   - Función `detectarServicio(texto)` — regex flexible para patrones de servicios
   - Función `detectarBusqueda(texto)` — regex flexible para patrones de búsqueda
   - Función `validarTextoPublicacion(titulo, descripcion)` — corre los 3 filtros y devuelve resultado estructurado:
     ```typescript
     { 
       valido: boolean; 
       categoria?: 'rifa' | 'subasta' | 'esquema' | 'adultos' | 'ilegal' | 'servicio' | 'busqueda';
       severidad: 'rechazo' | 'sugerencia';
       mensaje: string;
       palabraDetectada?: string;
     }
     ```
   - Las palabras prohibidas (rifas, subastas, esquemas, adultos, ilegal) son **rechazo duro** — el endpoint devuelve 422.
   - Servicios y búsquedas son **sugerencia** — se devuelve un warning pero el endpoint acepta el POST si el frontend envía `confirmadoPorUsuario: true`.

4. **Validación de precio** (Capa 1.5):
   - Bloqueo duro: precio = 0 o > $999,999
   - Sugerencia: precio < $10 (warning)

### Frontend

5. **Hook** `useCrearArticulo()` y `useActualizarArticulo()` con React Query mutations en `useMarketplace.ts`.

6. **Componente Wizard** `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx`:
   - Detecta modo crear vs editar según presencia de `articuloId` en params
   - Header: ← atrás, "Paso X de 3" centrado
   - Barra de progreso con 3 segmentos
   - Auto-save a `sessionStorage` por si recarga la página

7. **Paso 1 — Fotos y Título:**
   - Grid de 8 slots (drag & drop o tap para agregar)
   - La primera foto se marca "Portada" automáticamente
   - Cada foto con botón X
   - Reordenamiento con drag & drop (si es complejo, dejarlo para v1.1)
   - Input título (mínimo 10, máximo 80 chars, contador visible)
   - Botón "Continuar" deshabilitado hasta cumplir mínimos

8. **Paso 2 — Precio y Detalles:**
   - Input precio grande con "$" y "MXN"
   - 4 chips de condición (Nuevo / Seminuevo / Usado / Para reparar) — selección única
   - Toggle "Acepta ofertas" (default true)
   - Textarea descripción (mínimo 50, máximo 1000 chars, contador)
   - Botones: Anterior / Continuar

9. **Paso 3 — Ubicación y Confirmación:**
   - Mapa Leaflet con círculo de 500m alrededor de ubicación inicial (GPS o ciudad activa)
   - Texto: "Mostraremos un círculo de 500m, no tu dirección exacta."
   - Botón "Cambiar ubicación"
   - Mini-resumen de la publicación (foto + título + precio + condición)
   - Checklist de 3 confirmaciones (todas requeridas):
     - "No vendo artículos prohibidos por las reglas"
     - "Las fotos son del artículo real, sin retoque"
     - "Acepto que mi publicación se mostrará 30 días"
   - **En modo edición: el checklist NO se muestra**
   - Botón "Publicar ahora" / "Guardar cambios" — deshabilitado hasta cumplir todo

10. **Manejo de respuestas de moderación:**
    - Si backend devuelve 422 con categoría `'rifa'/'subasta'/etc` → mostrar el mensaje exacto que viene del backend, NO permite avanzar.
    - Si backend devuelve 200 con warning de servicio o búsqueda → mostrar modal sugerencia con botones "Llevar a Servicios" / "Continuar publicando" (texto exacto según documento).

11. **Vista previa en vivo (solo desktop):**
    - Layout 2 columnas en `lg:`+
    - Izquierda 60%: formulario del paso actual
    - Derecha 40%: card del artículo en vivo, actualizada conforme escribe
    - En móvil: NO hay vista previa
    - Texto debajo: "Tip: Las publicaciones con buenas fotos y precio competitivo se venden en promedio 3 días más rápido."

12. **Routing:**
    - `/marketplace/publicar` (modo crear)
    - `/marketplace/publicar/:articuloId` (modo editar)
    - Ambas con guard de modo Personal
    - Activar el botón "+ Publicar artículo" del feed (Sprint 2) para que navegue aquí

## Lo que NO entra en este sprint

- Mis publicaciones (página `/mis-publicaciones`) — fuera del módulo MarketPlace, otro documento
- Borradores — descartado para v1
- Detección de fotos prohibidas con IA — fuera de alcance v1

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4: `lg:` y `2xl:` con `2xl:` siempre.
- Idioma: español.
- `data-testid` en TODO interactivo.
- Notificaciones con `notificar.*`.
- Validación Zod tanto en frontend (UX) como backend (defensa real).
- Las imágenes se suben a R2 al agregarlas (no en el submit final).

## Resultado esperado

1. Botón "+ Publicar artículo" del feed abre el wizard.
2. Los 3 pasos funcionan con validaciones claras.
3. Si el usuario escribe "rifa" en el título → el wizard rechaza con mensaje claro.
4. Si escribe "doy clases de inglés" → muestra sugerencia para ir a Servicios, pero permite continuar.
5. Las fotos se suben a R2 directamente y aparecen en el grid.
6. Al publicar, redirige al detalle del artículo recién creado.
7. En modo edición, los datos están precargados y se pueden modificar.
8. Vista previa en vivo funciona en desktop.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Filtros de moderación (`filtros.ts`) + tests unitarios
3. Endpoints crear/actualizar/upload con validaciones
4. Estructura del wizard (3 pasos, header, progreso, navegación)
5. Paso 1 (fotos + título) con upload R2
6. Paso 2 (precio, condición, descripción, toggles)
7. Paso 3 (mapa, resumen, checklist)
8. Manejo de respuestas de moderación + modales sugerencia
9. Vista previa en vivo desktop
10. Modo edición + auto-save sessionStorage
11. QA completo

**Empieza con el plan.**
