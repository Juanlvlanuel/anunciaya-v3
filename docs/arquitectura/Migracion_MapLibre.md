# Migración Leaflet → MapLibre GL JS

**Fecha:** 7 Abril 2026
**Estado:** Pendiente — planificado para sesión futura
**Prioridad:** Media-Alta (mejora UX significativa)

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

### Sección Negocios
- `apps/web/src/pages/private/negocios/PaginaNegocios.tsx` — mapa principal con markers, popups, sincronización card↔marker
- `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` — mapa pequeño de ubicación del negocio

### Mi Perfil (Business Studio)
- `apps/web/src/pages/private/business-studio/perfil/components/TabUbicacion.tsx` — mapa con marker arrastrable para editar ubicación

### Componentes compartidos
- `apps/web/src/components/negocios/ModalHorarios.tsx` — verificar si usa mapa
- `apps/web/src/components/layout/ModalUbicacion.tsx` — modal fullscreen con mapa (si existe)

## Dependencias

### Eliminar
- `react-leaflet`
- `leaflet`
- `@types/leaflet`

### Instalar
- `maplibre-gl` — motor de mapas
- `react-map-gl` — wrapper React (soporta MapLibre como backend)

### Tiles gratuitos (elegir uno)
- **MapTiler** — gratis hasta 100K loads/mes, estilos bonitos
- **Stadia Maps** — gratis hasta 200K tiles/mes, sin tarjeta de crédito
- **Protomaps** — tiles servidos desde un solo archivo PMTiles, self-hosted

## Plan de implementación

1. Instalar dependencias (`maplibre-gl`, `react-map-gl`)
2. Crear componente wrapper `<Mapa>` reutilizable que encapsule la configuración de MapLibre
3. Migrar `PaginaNegocios.tsx`:
   - Reemplazar `MapContainer` → `Map` de react-map-gl
   - Reemplazar `TileLayer` → estilo vectorial
   - Reemplazar `Marker` → `Marker` de react-map-gl
   - Reemplazar `Popup` → `Popup` de react-map-gl
   - Adaptar sincronización card↔marker (viewport controlado)
   - Adaptar iconos de markers (usar imágenes como sprites)
4. Migrar `TabUbicacion.tsx`:
   - Marker arrastrable (drag events)
   - Click en mapa para mover marker
   - Botón "Mi Ubicación"
5. Migrar `PaginaPerfilNegocio.tsx`:
   - Mapa estático de ubicación
6. Eliminar dependencias de Leaflet
7. Verificar en móvil y desktop
8. Verificar en producción (Vercel)

## Referencias
- [MapLibre GL JS](https://maplibre.org/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [MapLibre vs Leaflet](https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/)
- [Stadia Maps (tiles gratuitos)](https://stadiamaps.com/)
- [MapTiler (tiles gratuitos)](https://www.maptiler.com/)
