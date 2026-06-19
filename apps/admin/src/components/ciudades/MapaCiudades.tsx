/**
 * MapaCiudades.tsx
 * ================
 * Mapa interactivo de México (MapLibre + tiles OpenFreeMap, sin API key) con los 4,563
 * puntos del dataset de ciudades (`/ciudades-mexico.json`). Cada punto se pinta según:
 *   - AZUL  = ya está en el catálogo (clic → seleccionar para agrupar en una región).
 *   - GRIS  = aún NO está en el catálogo (clic → seleccionar para darla de alta).
 *   - ÁMBAR = seleccionada (en cualquiera de los dos modos).
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

interface CiudadRaw {
    clave: string;
    nombre: string;
    estado: string;
    municipio: string;
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
    /** Claves INEGI seleccionadas (para pintar la selección). */
    seleccionadas: Set<string>;
    /** Toggle al hacer clic en un punto. */
    onToggle: (f: FeatureCiudad) => void;
}

/** Construye el GeoJSON desde el dataset crudo + el catálogo (para enCatalogo/catalogoId). */
function construirGeoJSON(dataset: CiudadRaw[], catalogoPorClave: Map<string, { id: string }>) {
    return {
        type: 'FeatureCollection' as const,
        features: dataset.map((d) => {
            const enCat = catalogoPorClave.get(claveCruceCiudad(d.nombre, d.estado));
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

export function MapaCiudades({ catalogoPorClave, seleccionadas, onToggle }: MapaCiudadesProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const datasetRef = useRef<CiudadRaw[]>([]);
    const catalogoRef = useRef(catalogoPorClave);
    const onToggleRef = useRef(onToggle);
    const prevSelRef = useRef<Set<string>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mantener refs frescas sin re-crear el mapa.
    useEffect(() => { catalogoRef.current = catalogoPorClave; }, [catalogoPorClave]);
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

                mapa.addSource(ID_SOURCE, {
                    type: 'geojson',
                    data: construirGeoJSON(dataset, catalogoRef.current),
                    promoteId: 'clave',
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

    // ── Recalcular enCatalogo cuando cambia el catálogo (tras un alta) ────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !datasetRef.current.length) return;
        const source = mapa.getSource(ID_SOURCE) as GeoJSONSource | undefined;
        if (source) source.setData(construirGeoJSON(datasetRef.current, catalogoPorClave));
    }, [catalogoPorClave]);

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
