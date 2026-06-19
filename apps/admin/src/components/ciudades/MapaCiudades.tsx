/**
 * MapaCiudades.tsx
 * ================
 * Mapa interactivo de México (MapLibre + tiles OpenFreeMap, sin API key) con los 4,563
 * puntos del dataset de ciudades (`/ciudades-mexico.json`). Cada punto se pinta según:
 *   - AZUL  = ya está en el catálogo (clic → seleccionar para agrupar en una región).
 *   - GRIS  = aún NO está en el catálogo (clic → seleccionar para darla de alta).
 *   - ÁMBAR = seleccionada (en cualquiera de los dos modos).
 * Las ciudades EN catálogo además se dibujan con un ÁREA aproximada (círculo delineado)
 * alrededor del punto, para que se vea "la zona" de la ciudad y no solo el punto.
 *
 * Cruce catálogo↔dataset: por clave exacta (slug nombre|estado) Y por CERCANÍA de
 * coordenadas (<3 km), para marcar bien las ciudades cuyo nombre oficial INEGI difiere del
 * nombre corto del catálogo (ej. "Heroica Guaymas" vs "Guaymas") SIN tocar los datos.
 *
 * Al hacer zoom aparecen las etiquetas de nombre. El estado de selección lo lleva el
 * padre (SeccionCiudades); aquí solo se dibuja y se reportan los clics.
 *
 * Ubicación: apps/admin/src/components/ciudades/MapaCiudades.tsx
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { claveCruceCiudad } from '../../utils/texto';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_SOURCE = 'ciudades';
const ID_CIRCULOS = 'ciudades-circulos';
const ID_ETIQUETAS = 'ciudades-etiquetas';
const ID_SOURCE_AREAS = 'ciudades-areas';
const ID_AREAS_FILL = 'ciudades-areas-fill';
const ID_AREAS_LINE = 'ciudades-areas-line';
const ID_LIMITES_ESTADOS = 'limites-estados';

/** Radio del área aproximada que se dibuja alrededor de cada ciudad EN catálogo (km). */
const RADIO_AREA_KM = 5;
/** Umbral para marcar "en catálogo" un punto INEGI por cercanía de coordenadas (km). */
const UMBRAL_CERCANIA_KM = 3;

interface CiudadRaw {
    clave: string;
    nombre: string;
    estado: string;
    municipio: string;
    lat: number;
    lng: number;
}

/** Ciudad del catálogo (BD) con coordenadas, para el cruce por cercanía. */
interface CatalogoCoord {
    id: string;
    lat: number;
    lng: number;
}

export interface FeatureCiudad {
    clave: string;
    nombre: string;
    estado: string;
    municipio: string;
    lat: number;
    lng: number;
    enCatalogo: boolean;
    catalogoId: string; // UUID en la tabla ciudades si enCatalogo; si no, ''
}

interface MapaCiudadesProps {
    /** claveCruce ("slug|estado") → { id (UUID catálogo) } de las ciudades YA en el catálogo. */
    catalogoPorClave: Map<string, { id: string }>;
    /** Ciudades del catálogo con coordenadas — para el cruce por cercanía (nombre oficial ≠ corto). */
    catalogoConCoords: CatalogoCoord[];
    /** Claves INEGI seleccionadas (para pintar la selección). */
    seleccionadas: Set<string>;
    /** Toggle al hacer clic en un punto. */
    onToggle: (f: FeatureCiudad) => void;
}

// ── Helpers geográficos ───────────────────────────────────────────────────────

/** Distancia aproximada en km (equirectangular — suficiente para distancias cortas). */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
    return R * Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Anillo de coordenadas [lng,lat] de un círculo de `radioKm` alrededor de (lat,lng). */
function anilloCirculo(lat: number, lng: number, radioKm: number, n = 64): [number, number][] {
    const radioLat = radioKm / 110.574;
    const radioLng = radioKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const coords: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
        const ang = (i / n) * 2 * Math.PI;
        coords.push([lng + radioLng * Math.cos(ang), lat + radioLat * Math.sin(ang)]);
    }
    return coords;
}

/** Construye el GeoJSON de puntos. `enCatalogo` por clave exacta O por cercanía de coords. */
function construirGeoJSON(
    dataset: CiudadRaw[],
    catalogoPorClave: Map<string, { id: string }>,
    catalogoConCoords: CatalogoCoord[],
) {
    // Pre-cómputo por CERCANÍA: para cada ciudad del catálogo, el punto INEGI más cercano
    // dentro del umbral queda marcado como "en catálogo" (cubre nombres oficiales distintos).
    const porCercania = new Map<string, { id: string }>();
    for (const c of catalogoConCoords) {
        let mejorClave = '';
        let mejorDist = Infinity;
        for (const d of dataset) {
            const dist = distanciaKm(c.lat, c.lng, d.lat, d.lng);
            if (dist < mejorDist) {
                mejorDist = dist;
                mejorClave = d.clave;
            }
        }
        if (mejorClave && mejorDist <= UMBRAL_CERCANIA_KM) porCercania.set(mejorClave, { id: c.id });
    }

    return {
        type: 'FeatureCollection' as const,
        features: dataset.map((d) => {
            const enCat = catalogoPorClave.get(claveCruceCiudad(d.nombre, d.estado)) ?? porCercania.get(d.clave);
            return {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
                properties: {
                    clave: d.clave,
                    nombre: d.nombre,
                    estado: d.estado,
                    municipio: d.municipio,
                    lat: d.lat,
                    lng: d.lng,
                    enCatalogo: !!enCat,
                    catalogoId: enCat?.id ?? '',
                },
            };
        }),
    };
}

/** Áreas (polígonos circulares) de las ciudades EN catálogo, derivadas del GeoJSON de puntos. */
function construirAreasGeoJSON(puntos: ReturnType<typeof construirGeoJSON>) {
    return {
        type: 'FeatureCollection' as const,
        features: puntos.features
            .filter((f) => f.properties.enCatalogo)
            .map((f) => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Polygon' as const,
                    coordinates: [anilloCirculo(f.properties.lat, f.properties.lng, RADIO_AREA_KM)],
                },
                properties: { clave: f.properties.clave, nombre: f.properties.nombre },
            })),
    };
}

function aFeatureCiudad(f: MapGeoJSONFeature): FeatureCiudad {
    const p = f.properties as Record<string, unknown>;
    return {
        clave: String(p.clave),
        nombre: String(p.nombre),
        estado: String(p.estado),
        municipio: String(p.municipio ?? ''),
        lat: Number(p.lat),
        lng: Number(p.lng),
        enCatalogo: p.enCatalogo === true || p.enCatalogo === 'true',
        catalogoId: String(p.catalogoId ?? ''),
    };
}

export function MapaCiudades({ catalogoPorClave, catalogoConCoords, seleccionadas, onToggle }: MapaCiudadesProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const datasetRef = useRef<CiudadRaw[]>([]);
    const catalogoRef = useRef(catalogoPorClave);
    const catalogoCoordsRef = useRef(catalogoConCoords);
    const onToggleRef = useRef(onToggle);
    const prevSelRef = useRef<Set<string>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mantener refs frescas sin re-crear el mapa.
    useEffect(() => { catalogoRef.current = catalogoPorClave; }, [catalogoPorClave]);
    useEffect(() => { catalogoCoordsRef.current = catalogoConCoords; }, [catalogoConCoords]);
    useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);

    // ── Crear el mapa + cargar el dataset (una sola vez) ─────────────────────────
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

        let cancelado = false;

        mapa.on('load', async () => {
            try {
                const resp = await fetch('/ciudades-mexico.json');
                if (!resp.ok) throw new Error('No se pudo cargar el dataset de ciudades.');
                const dataset = (await resp.json()) as CiudadRaw[];
                if (cancelado) return;
                datasetRef.current = dataset;

                const geojson = construirGeoJSON(dataset, catalogoRef.current, catalogoCoordsRef.current);

                mapa.addSource(ID_SOURCE, { type: 'geojson', data: geojson, promoteId: 'clave' });
                mapa.addSource(ID_SOURCE_AREAS, { type: 'geojson', data: construirAreasGeoJSON(geojson) });

                // Límites ESTATALES resaltados. El estilo base (boundary del schema OpenMapTiles)
                // los pinta muy tenues y punteados; esta capa los hace visibles. En México los
                // estados son admin_level 4; excluimos las fronteras marítimas.
                mapa.addLayer({
                    id: ID_LIMITES_ESTADOS,
                    type: 'line',
                    source: 'openmaptiles',
                    'source-layer': 'boundary',
                    filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#64748b',
                        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 7, 1.5, 11, 2.6],
                        'line-opacity': 0.85,
                    },
                });

                // Áreas de ciudad (quedan debajo de los puntos y etiquetas, encima de los límites).
                mapa.addLayer({
                    id: ID_AREAS_FILL,
                    type: 'fill',
                    source: ID_SOURCE_AREAS,
                    paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.1 },
                });
                mapa.addLayer({
                    id: ID_AREAS_LINE,
                    type: 'line',
                    source: ID_SOURCE_AREAS,
                    paint: { 'line-color': '#2563eb', 'line-width': 1.5, 'line-opacity': 0.55 },
                });

                mapa.addLayer({
                    id: ID_CIRCULOS,
                    type: 'circle',
                    source: ID_SOURCE,
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 7, 4, 11, 7, 14, 10],
                        'circle-color': [
                            'case',
                            ['boolean', ['feature-state', 'seleccionado'], false], '#f59e0b',
                            ['get', 'enCatalogo'], '#2563eb',
                            '#9ca3af',
                        ],
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'seleccionado'], false], 2, 0.6],
                        'circle-opacity': 0.9,
                    },
                });

                mapa.addLayer({
                    id: ID_ETIQUETAS,
                    type: 'symbol',
                    source: ID_SOURCE,
                    minzoom: 8,
                    layout: {
                        'text-field': ['get', 'nombre'],
                        'text-size': 11,
                        'text-offset': [0, 1.1],
                        'text-anchor': 'top',
                        'text-allow-overlap': false,
                    },
                    paint: {
                        'text-color': '#374151',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1.2,
                    },
                });

                mapa.on('click', ID_CIRCULOS, (e) => {
                    const f = e.features?.[0];
                    if (f) onToggleRef.current(aFeatureCiudad(f));
                });
                mapa.on('mouseenter', ID_CIRCULOS, () => { mapa.getCanvas().style.cursor = 'pointer'; });
                mapa.on('mouseleave', ID_CIRCULOS, () => { mapa.getCanvas().style.cursor = ''; });

                if (!cancelado) setCargando(false);
            } catch (err) {
                if (!cancelado) {
                    setError(err instanceof Error ? err.message : 'Error al cargar el mapa.');
                    setCargando(false);
                }
            }
        });

        mapa.on('error', (e) => {
            // Errores de tiles (sin internet, proveedor caído) no deben dejar el mapa "cargando" para siempre.
            console.error('[MapaCiudades] error de MapLibre:', e.error);
        });

        return () => {
            cancelado = true;
            mapa.remove();
            mapaRef.current = null;
        };
    }, []);

    // ── Recalcular enCatalogo + áreas cuando cambia el catálogo (tras un alta) ─────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !datasetRef.current.length) return;
        const source = mapa.getSource(ID_SOURCE) as GeoJSONSource | undefined;
        const sourceAreas = mapa.getSource(ID_SOURCE_AREAS) as GeoJSONSource | undefined;
        if (!source) return;
        const geojson = construirGeoJSON(datasetRef.current, catalogoPorClave, catalogoConCoords);
        source.setData(geojson);
        if (sourceAreas) sourceAreas.setData(construirAreasGeoJSON(geojson));
    }, [catalogoPorClave, catalogoConCoords]);

    // ── Reflejar la selección con feature-state ──────────────────────────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !mapa.getSource(ID_SOURCE)) return;
        // Apagar las que salieron de la selección.
        for (const clave of prevSelRef.current) {
            if (!seleccionadas.has(clave)) mapa.setFeatureState({ source: ID_SOURCE, id: clave }, { seleccionado: false });
        }
        // Encender las nuevas.
        for (const clave of seleccionadas) {
            mapa.setFeatureState({ source: ID_SOURCE, id: clave }, { seleccionado: true });
        }
        prevSelRef.current = new Set(seleccionadas);
    }, [seleccionadas, cargando]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde">
            <div ref={contenedorRef} className="h-full w-full" data-testid="ciudades-mapa" />
            {cargando && !error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/70 text-[13px] text-texto-3">
                    Cargando mapa…
                </div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/90 px-6 text-center text-[13px] text-peligro">
                    {error}
                </div>
            )}
            {/* Leyenda */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 rounded-[10px] border border-borde bg-superficie/95 px-3 py-2 text-[11.5px] text-texto-2 shadow-pop-panel">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> En el catálogo</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#9ca3af]" /> Por agregar</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Seleccionada</span>
            </div>
        </div>
    );
}

export default MapaCiudades;
