# Sprint 6 — MarketPlace: Buscador Potenciado

## Contexto

Hasta ahora el buscador del feed (Sprint 2) es solo un placeholder visual. En este sprint construimos el **Buscador Potenciado** completo: sugerencias en vivo, búsquedas recientes, búsquedas populares por ciudad, y vista de resultados con filtros y orden.

Como el módulo NO tiene categorías, el buscador es la **herramienta principal** del comprador. Por eso le dedicamos un sprint completo.

## Antes de empezar

1. Lee la **Pantalla 5 (P5)** completa del documento:
   - `docs/arquitectura/MarketPlace.md` — sección §8 P5 — Buscador Potenciado
2. Revisa estos archivos como referencia:
   - `apps/web/src/components/layout/MobileHeader.tsx` — patrón de overlay sobre el header
   - Cualquier overlay existente con foco automático en input
   - Tablas con índices GIN de full-text search en otros módulos (si existen)

## Alcance del Sprint

### Backend

1. **Tabla nueva** `marketplace_busquedas_log`:
   ```sql
   CREATE TABLE marketplace_busquedas_log (
     id BIGSERIAL PRIMARY KEY,
     ciudad VARCHAR(100) NOT NULL,
     termino VARCHAR(100) NOT NULL,
     usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   CREATE INDEX idx_busquedas_ciudad_fecha ON marketplace_busquedas_log(ciudad, created_at DESC);
   ```

2. **Asegurar índice GIN** para full-text search en `articulos_marketplace`:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_marketplace_titulo_fts ON articulos_marketplace 
     USING GIN(to_tsvector('spanish', titulo || ' ' || descripcion));
   ```

3. **Endpoints de búsqueda:**

   - `GET /api/marketplace/buscar/sugerencias?q=...&ciudad=...`
     - Top 5 sugerencias mientras el usuario escribe
     - Match en `titulo` de `articulos_marketplace` activos en la ciudad usando full-text search en español
     - Devuelve solo strings (los términos sugeridos)

   - `GET /api/marketplace/buscar/populares?ciudad=...`
     - Top 6 términos más buscados en la ciudad en últimos 7 días
     - Agregación de `marketplace_busquedas_log`
     - Cachear resultado en Redis con TTL 1h

   - `GET /api/marketplace/buscar?q=...&ciudad=...&lat=...&lng=...&precioMin=...&precioMax=...&condicion=...&distanciaMaxKm=...&aceptaOfertas=...&ordenar=...&page=...`
     - Búsqueda completa con filtros y orden
     - Inserta una entrada en `marketplace_busquedas_log` (fire and forget)
     - Ordenamientos válidos: `recientes` (default), `cercanos`, `precio_asc`, `precio_desc`
     - Filtra solo artículos con `estado='activa'`
     - Paginado de 20 en 20

4. **Cron diario** (opcional para sprint, puede ir en Sprint 7):
   - Calcula top 10 términos de los últimos 7 días por ciudad
   - Cachea en Redis con clave `marketplace:populares:{ciudad}` y TTL 24h

### Frontend

5. **Hooks React Query** en `useMarketplace.ts`:
   - `useBuscadorSugerencias(query, ciudad)` con debounce 300ms
   - `useBuscadorPopulares(ciudad)`
   - `useBuscadorResultados({ q, filtros, ordenar, ciudad, lat, lng, page })`

6. **Componente** `OverlayBuscador.tsx` en `apps/web/src/components/marketplace/OverlayBuscador.tsx`:

   **Estado vacío (al abrir):**
   - Input grande arriba con foco automático
   - Sección "Búsquedas recientes" con chips eliminables (X) — guardadas en localStorage (`marketplace_busquedas_recientes`, máx 10)
   - Botón "Borrar todo" al lado del título
   - Sección "Más buscado en [ciudad]" con chips populares (no eliminables)

   **Mientras escribe (debounce 300ms):**
   - Sugerencias en vivo abajo del input
   - Cada sugerencia es un botón con texto + icono ↗
   - Tap en sugerencia → llena input + ejecuta búsqueda

   **Al presionar Enter o tap en sugerencia:**
   - Guarda el término en `localStorage` (búsquedas recientes)
   - Navega a `/marketplace/buscar?q=...` (vista de resultados)

7. **Vista de resultados** `PaginaResultadosMarketplace.tsx` en `apps/web/src/pages/private/marketplace/PaginaResultadosMarketplace.tsx`:

   - Header dark sticky modificado: ← atrás, "‘[query]' · X resultados", botón filtros (móvil) o sidebar (desktop)
   - Dropdown ordenar a la derecha del header
   - Chips de filtros activos arriba del grid (removibles con X)
   - Botón "Limpiar filtros"
   - Grid de resultados con cards estilo B (reusa `CardArticulo`)
   - Scroll infinito con paginación

8. **Filtros** (bottom sheet en móvil, sidebar en desktop):
   - **Distancia:** chips única (1km, 3km, 5km, 10km, 25km, 50km)
   - **Precio:** slider doble (con presets <$500, $500-1k, $1k-5k, $5k+)
   - **Condición:** chips múltiples (Nuevo, Seminuevo, Usado, Para reparar)
   - **Acepta ofertas:** toggle

9. **Ordenar** (dropdown):
   - Más recientes (default)
   - Más cercanos (requiere GPS)
   - Precio menor
   - Precio mayor

10. **Estado vacío de resultados:**
    - "No encontramos artículos para ‘[query]'. Probá quitar algunos filtros."
    - Botón "Limpiar filtros"

11. **Routing:**
    - `/marketplace/buscar` con query params (`?q=...&filtros=...`)
    - URL compartible y bookmarkeable

12. **Activar** el buscador real en el header del feed (Sprint 2 dejó solo placeholder).

## Lo que NO entra en este sprint

- Búsquedas guardadas con alerta push (idea futura, no en v1)
- Filtro "Solo de esta semana" (idea futura)

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4 con `lg:` y `2xl:`.
- Idioma: español.
- `data-testid` obligatorio.
- Búsquedas recientes en localStorage (no en BD por privacidad).
- El input del buscador debe respetar `text-base` mínimo para evitar auto-zoom de iOS al hacer focus.
- Debounce de 300ms para sugerencias (no spamear el backend).
- URL state para resultados (compartible/bookmarkeable).

## Resultado esperado

1. Tap en buscador del header del feed abre el overlay con foco automático.
2. Búsquedas recientes y populares se muestran al abrir.
3. Mientras escribe, aparecen sugerencias en vivo.
4. Al ejecutar búsqueda, navega a `/marketplace/buscar?q=...` con resultados.
5. Filtros y orden funcionan correctamente y se reflejan en la URL.
6. La búsqueda se registra en `marketplace_busquedas_log`.
7. Las populares se calculan correctamente y se cachean.
8. Estado vacío informa claramente cuando no hay resultados.
9. Todo es responsive en las 3 resoluciones.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Migración SQL (tabla log + índice GIN) + endpoints de búsqueda
3. Hooks React Query con debounce
4. OverlayBuscador (estado vacío + sugerencias en vivo)
5. PaginaResultados (grid + filtros chip + ordenar)
6. Bottom sheet de filtros (móvil) + sidebar (desktop)
7. URL state + búsquedas recientes en localStorage
8. Cron de populares + caché Redis
9. QA completo

**Empieza con el plan.**
