# Migración Leaflet → MapLibre GL JS

**Fecha:** 7 Abril 2026 (planeado) · **Decisión de ejecutar:** 18 Junio 2026 · **Completada:** 30 Junio 2026
**Estado:** ✅ **COMPLETA.** Todo el proyecto usa **MapLibre + tiles OpenFreeMap** (sin API key). El **Panel** (`apps/admin`, módulo Ciudades) ya nacía en MapLibre (`maplibre-gl` directo, 4,563 ciudades). **`apps/web`** quedó migrado de `react-leaflet` a **`react-map-gl`** (8 mapas) y se eliminaron `leaflet`, `react-leaflet`, `@types/leaflet`. `tsc` + `vite build` verdes; sin residuos de Leaflet en el repo.
**Prioridad:** Media-Alta (mejora UX significativa + unifica el stack de mapas) — cumplida.

> **Enfoque ejecutado (= acordado el 18 jun 2026):**
> - **Tiles:** **OpenFreeMap** (vector, gratis, **sin API key**), estilo `liberty` (`https://tiles.openfreemap.org/styles/liberty`) — el mismo del Panel. Punto único de cambio: `ESTILO_MAPA` en `apps/web/src/components/mapa/Mapa.tsx`.
> - **`apps/web`:** **`react-map-gl@8` (subpath `react-map-gl/maplibre`)** + `maplibre-gl@5`. La conversión desde `react-leaflet` fue casi 1-a-1 (`MapContainer`→`<Mapa>`, `TileLayer`→estilo del wrapper, `Marker`/`Popup`/`Circle`→equivalentes). El Panel sigue con `maplibre-gl` directo (su caso es una capa de miles de puntos).
> - **Wrapper reutilizable** `<Mapa>` (`apps/web/src/components/mapa/Mapa.tsx`) que encapsula estilo/tiles y reexporta `Marker`/`Popup`/`Source`/`Layer`/`NavigationControl`/`useMap` + tipos. Helpers: `geo.ts` (`circuloGeoJSON` para el radio de privacidad de MarketPlace) y `MarcadorPopup.tsx` (marcador con pin + popup "click para abrir", usado por los mapas de perfiles de negocio).
> - **Dependencias:** se quitaron `leaflet`, `react-leaflet`, `@types/leaflet`; se agregaron `maplibre-gl`, `react-map-gl` y `@types/geojson` (dev). El CSS de `maplibre-gl` lo importa el wrapper; se borró el `<link>` a `leaflet.css` de `index.html` y las reglas `.leaflet-*` de `index.css`.

## Equivalencias aplicadas (Leaflet → react-map-gl)

| Leaflet | react-map-gl |
|---|---|
| `<MapContainer center={[lat,lng]} zoom>` | `<Mapa initialViewState={{ longitude, latitude, zoom }}>` |
| `<TileLayer url=...>` | (estilo OpenFreeMap dentro del wrapper) |
| `<Marker position icon={L.Icon/divIcon}>` | `<Marker longitude latitude anchor="bottom">{pin JSX}</Marker>` |
| `<Marker draggable eventHandlers={{dragend}}>` | `<Marker draggable onDragEnd={e => e.lngLat}>` |
| `<Marker><Popup>…</Popup></Marker>` | estado + `<Popup longitude latitude>` (o `<MarcadorPopup>`) |
| `<Circle radius={metros}>` | `<Source geojson={circuloGeoJSON(...)}>` + `<Layer fill/line>` |
| `useMap()` + `map.on('click')` | prop `onClick` del `<Mapa>` |
| `map.setView` / `flyTo([lat,lng])` | `map.jumpTo/flyTo({ center: [lng,lat] })` (vía `MapRef`) |
| `map.invalidateSize()` | innecesario (auto-resize por ResizeObserver) |
| `.leaflet-popup-*` (CSS) | `.maplibregl-popup-*` (CSS) |

---

## Problema

Leaflet usa **raster tiles** (imágenes PNG). Cada vez que el usuario mueve el mapa, descarga nuevas imágenes del servidor → se ve un renderizado progresivo (parpadeo/carga visible de cuadros).

## Solución

Migrar a **MapLibre GL JS** — fork open-source de Mapbox GL. Usa **vector tiles** renderizados con WebGL en la GPU del usuario. Al mover el mapa, re-renderiza vectores que ya tiene en memoria → scroll fluido sin parpadeo.

## Comparación

| | Leaflet (actual) | MapLibre GL (propuesto) |
|---|---|---|
| Tiles | Raster (imágenes PNG) | Vector (datos WebGL) |
| Al mover mapa | Descarga nuevas imágenes | Re-renderiza con GPU |
| Bundle | ~42KB | ~200KB |
| Fluido al mover | No | Sí |
| Zoom | Pixelado entre niveles | Suave infinito |
| React wrapper | react-leaflet | react-map-gl |
| Costo | Gratis | Gratis (con tiles MapTiler/Stadia) |
| Estilos | Fijos (dependen del proveedor de tiles) | Personalizables con JSON |

## Archivos a modificar

### Infraestructura nueva (`apps/web/src/components/mapa/`)
- `Mapa.tsx` — wrapper `<Mapa>` con tiles OpenFreeMap (`ESTILO_MAPA`) + reexports de react-map-gl. **Punto único** para cambiar proveedor de tiles.
- `geo.ts` — `circuloGeoJSON(lng, lat, radioMetros)` para áreas en metros (radio de privacidad).
- `MarcadorPopup.tsx` — `<MarcadorPopup>` (pin + popup click-para-abrir) y `<PinMapa>` (pin "gota" SVG por color).

### Mapas migrados (8)
- `pages/private/negocios/PaginaNegocios.tsx` — mapa principal: markers + popup por selección + flyTo con offset + pin animado + controles de zoom custom (el más complejo).
- `pages/private/negocios/PaginaPerfilNegocio.tsx` — **3 mapas** (modal desktop, sidebar, modal móvil) con popups ricos.
- `pages/private/business/onboarding/pasos/PasoUbicacion.tsx` — marker arrastrable + click-para-mover + "Mi Ubicación" + fullscreen.
- `pages/private/business-studio/perfil/components/TabUbicacion.tsx` — ídem (el mapa sigue al marcador).
- `pages/private/business-studio/sucursales/ModalCrearSucursal.tsx` — marker arrastrable + fullscreen.
- `components/marketplace/MapaUbicacion.tsx` — círculo de radio aproximado (`<Source>`+`<Layer>`) o pin exacto.
- `components/chatya/ModalUbicacionChat.tsx` — elegir/compartir ubicación (marker arrastrable + reverse geocode).
- `components/chatya/BurbujaMensaje.tsx` — mini-mapa estático de ubicación compartida.

> `components/servicios/MapaPlaceholderServicio.tsx` **no usa mapa** (es un SVG decorativo) — quedó fuera.

## Dependencias (estado final)

| | Paquete |
|---|---|
| Eliminadas | `leaflet`, `react-leaflet`, `@types/leaflet` |
| Agregadas | `maplibre-gl@5`, `react-map-gl@8`, `@types/geojson` (dev) |

> `@types/geojson` se agregó explícito porque venía transitivo de `@types/leaflet`; al quitar Leaflet, el namespace global `GeoJSON` (usado por `geo.ts`) dejó de resolverse.

## Plan de implementación — ✅ ejecutado

1. ✅ Instalar `maplibre-gl` + `react-map-gl`.
2. ✅ Crear wrapper `<Mapa>` + helpers (`geo.ts`, `MarcadorPopup.tsx`).
3. ✅ Migrar los 8 mapas (ver tabla de equivalencias arriba).
4. ✅ Eliminar dependencias de Leaflet + residuos (`index.html`, `index.css`).
5. ✅ Verificar `tsc -b` + `vite build` (verdes) y ESLint (0 errores).
6. ⏳ **Pendiente de QA manual** en móvil/desktop y en prod (Vercel) — la migración compila y bundlea; falta validación visual a mano (drag de markers, popups, flyTo, fullscreen).

## Referencias
- [MapLibre GL JS](https://maplibre.org/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [MapLibre vs Leaflet](https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/)
- [Stadia Maps (tiles gratuitos)](https://stadiamaps.com/)
- [MapTiler (tiles gratuitos)](https://www.maptiler.com/)
