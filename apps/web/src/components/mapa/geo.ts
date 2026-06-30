/**
 * geo.ts — helpers geográficos para los mapas de apps/web (MapLibre).
 * =============================================================================
 * MapLibre no tiene un "círculo en metros" nativo que escale con el zoom (la
 * capa `circle` usa radio en píxeles). Para dibujar áreas que representen una
 * distancia real (ej. el radio de privacidad de 500 m en MarketPlace) se usa
 * un POLÍGONO circular como GeoJSON, igual que en el Panel (MapaCiudades).
 *
 * Ubicación: apps/web/src/components/mapa/geo.ts
 */

/**
 * GeoJSON de un círculo (polígono de `n` lados) de `radioMetros` alrededor de
 * (lng, lat). Pensado para alimentar un <Source type="geojson"> + <Layer fill/line>.
 * Usa el namespace global `GeoJSON` (de @types/geojson, cargado por maplibre-gl)
 * en vez de importar el módulo 'geojson', que no se resuelve desde apps/web.
 */
export function circuloGeoJSON(
    lng: number,
    lat: number,
    radioMetros: number,
    n = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
    const radioKm = radioMetros / 1000;
    const radioLat = radioKm / 110.574;
    const radioLng = radioKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const coords: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
        const ang = (i / n) * 2 * Math.PI;
        coords.push([lng + radioLng * Math.cos(ang), lat + radioLat * Math.sin(ang)]);
    }
    return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coords] },
    };
}
