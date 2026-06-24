/**
 * MapaTerritorios.tsx
 * ===================
 * Mapa interactivo (MapLibre + tiles OpenFreeMap, sin API key) que pinta las ZONAS del
 * territorio como polígonos. Calca la técnica de `MapaCiudades` pero, en vez de los puntos
 * del catálogo INEGI, dibuja las particiones (`territorio_zonas.poligono`, GeoJSON Polygon)
 * con su color, borde y etiqueta de nombre.
 *
 * Fase 1 (VER): solo MUESTRA las zonas (centra el mapa en ellas con fitBounds). El dibujo /
 * edición de polígonos llega en Fase 2.
 *
 * Ubicación: apps/admin/src/components/territorios/MapaTerritorios.tsx
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ZonaTerritorio } from '../../services/territoriosService';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_SOURCE = 'zonas';
const ID_FILL = 'zonas-fill';
const ID_LINE = 'zonas-line';
const ID_LABEL = 'zonas-label';
const COLOR_DEFECTO = '#2563eb';

interface MapaTerritoriosProps {
    zonas: ZonaTerritorio[];
}

/** FeatureCollection de polígonos a partir de las zonas (cada zona = un Feature). */
function construirGeoJSON(zonas: ZonaTerritorio[]) {
    return {
        type: 'FeatureCollection' as const,
        features: zonas
            .filter((z) => z.poligono?.type === 'Polygon')
            .map((z) => ({
                type: 'Feature' as const,
                geometry: z.poligono,
                properties: {
                    id: z.id,
                    nombre: z.nombre,
                    vendedor: z.vendedorNombre ?? 'Sin asignar',
                    color: z.color || COLOR_DEFECTO,
                },
            })),
    };
}

/** Bounding box [[minLng,minLat],[maxLng,maxLat]] de todas las zonas; null si no hay. */
function calcularBounds(zonas: ZonaTerritorio[]): [[number, number], [number, number]] | null {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    let hay = false;
    for (const z of zonas) {
        if (z.poligono?.type !== 'Polygon') continue;
        for (const anillo of z.poligono.coordinates) {
            for (const punto of anillo) {
                const [lng, lat] = punto;
                hay = true;
                if (lng < minLng) minLng = lng;
                if (lat < minLat) minLat = lat;
                if (lng > maxLng) maxLng = lng;
                if (lat > maxLat) maxLat = lat;
            }
        }
    }
    return hay ? [[minLng, minLat], [maxLng, maxLat]] : null;
}

export function MapaTerritorios({ zonas }: MapaTerritoriosProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const zonasRef = useRef<ZonaTerritorio[]>(zonas);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listo, setListo] = useState(false);

    useEffect(() => { zonasRef.current = zonas; }, [zonas]);

    // Crear el mapa una sola vez.
    useEffect(() => {
        if (!contenedorRef.current || mapaRef.current) return;

        const mapa = new maplibregl.Map({
            container: contenedorRef.current,
            style: ESTILO_TILES,
            center: CENTRO_MX,
            zoom: 4.3,
            attributionControl: { compact: true },
        });
        mapaRef.current = mapa;
        mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        mapa.on('load', () => {
            mapa.addSource(ID_SOURCE, { type: 'geojson', data: construirGeoJSON(zonasRef.current) });
            mapa.addLayer({
                id: ID_FILL,
                type: 'fill',
                source: ID_SOURCE,
                paint: { 'fill-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'fill-opacity': 0.22 },
            });
            mapa.addLayer({
                id: ID_LINE,
                type: 'line',
                source: ID_SOURCE,
                layout: { 'line-join': 'round' },
                paint: { 'line-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'line-width': 2, 'line-opacity': 0.85 },
            });
            mapa.addLayer({
                id: ID_LABEL,
                type: 'symbol',
                source: ID_SOURCE,
                layout: { 'text-field': ['get', 'nombre'], 'text-size': 12, 'text-anchor': 'center' },
                paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
            });

            setListo(true);
            setCargando(false);
            const bounds = calcularBounds(zonasRef.current);
            if (bounds) mapa.fitBounds(bounds, { padding: 60, duration: 0, maxZoom: 14 });
        });

        mapa.on('error', (e) => { console.error('[MapaTerritorios] error de MapLibre:', e.error); });

        return () => { mapa.remove(); mapaRef.current = null; };
    }, []);

    // Re-pintar + re-encuadrar cuando cambian las zonas.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        const source = mapa.getSource(ID_SOURCE) as GeoJSONSource | undefined;
        if (!source) return;
        source.setData(construirGeoJSON(zonas));
        const bounds = calcularBounds(zonas);
        if (bounds) mapa.fitBounds(bounds, { padding: 60, duration: 300, maxZoom: 14 });
    }, [zonas, listo]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde">
            <div ref={contenedorRef} className="h-full w-full" data-testid="territorios-mapa" />
            {cargando && !error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/70 text-[13px] text-texto-3">Cargando mapa…</div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/90 px-6 text-center text-[13px] text-peligro">{error}</div>
            )}
            {listo && !error && zonas.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-borde bg-superficie/95 px-3 py-1.5 text-[12px] text-texto-3 shadow-pop-panel">
                    Aún no hay zonas dibujadas en este mapa.
                </div>
            )}
        </div>
    );
}

export default MapaTerritorios;
