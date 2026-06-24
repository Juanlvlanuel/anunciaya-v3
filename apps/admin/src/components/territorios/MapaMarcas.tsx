/**
 * MapaMarcas.tsx
 * ==============
 * Mapa de la vista del VENDEDOR ("Mi territorio", Territorios · G.2). Resalta su zona asignada:
 * el resto del mapa se OSCURECE con una capa-máscara semi-oscura (se sigue viendo, pero apagado) y
 * el paneo se limita a su zona; la zona queda con el mapa al 100%. Encima van sus MARCAS (pines de
 * color por estado). En modo "agregar", un clic crea una marca; si no, un clic sobre un pin lo
 * selecciona. Crear o mover marcas FUERA de la zona está bloqueado. Intro: vuela desde México
 * completo hasta la zona y ahí enciende la máscara.
 *
 * Ubicación: apps/admin/src/components/territorios/MapaMarcas.tsx
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ZonaTerritorio, MarcaTerritorio, TipoMarca } from '../../services/territoriosService';
import { toast } from '../../stores/useToastPanel';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_ZONA = 'mi-zona';
const ID_ZONA_LINE = 'mi-zona-line';
const ID_MASCARA = 'mascara';
const ID_MASCARA_FILL = 'mascara-fill';
const ID_MARCAS = 'marcas';
const ID_MARCAS_C = 'marcas-circle';

/** Color y etiqueta por estado (compartidos con la sección). */
export const COLOR_TIPO: Record<TipoMarca, string> = {
    visitado: '#2563eb',
    interesado: '#f59e0b',
    cerrado: '#16a34a',
    sin_interes: '#9ca3af',
};
export const ETIQUETA_TIPO: Record<TipoMarca, string> = {
    visitado: 'Visitado',
    interesado: 'Interesado',
    cerrado: 'Cerrado',
    sin_interes: 'Sin interés',
};

/** Escapa texto para insertarlo de forma segura en el HTML del popup. */
function escaparHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** HTML del popup de hover de una marca: estado (con su color) + nota. */
function contenidoPopup(m: MarcaTerritorio): string {
    const color = COLOR_TIPO[m.tipo];
    const etiqueta = ETIQUETA_TIPO[m.tipo];
    const nota = m.nota?.trim();
    const cuerpo = nota
        ? `<div style="font-size:12px;line-height:1.35;color:#475569;white-space:pre-wrap;word-break:break-word;">${escaparHtml(nota)}</div>`
        : `<div style="font-size:12px;color:#94a3b8;font-style:italic;">Sin nota</div>`;
    return `<div style="display:flex;flex-direction:column;gap:4px;min-width:110px;max-width:220px;">`
        + `<div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:#0f172a;">`
        + `<span style="width:10px;height:10px;border-radius:9999px;background:${color};display:inline-block;"></span>${etiqueta}</div>`
        + cuerpo + `</div>`;
}

interface MapaMarcasProps {
    zonas: ZonaTerritorio[];
    marcas: MarcaTerritorio[];
    modoAgregar?: boolean;
    onAgregarMarca?: (lat: number, lng: number) => void;
    onClicMarca?: (id: string) => void;
    onMoverMarca?: (id: string, lat: number, lng: number) => void;
}

function zonasGeoJSON(zonas: ZonaTerritorio[]) {
    return {
        type: 'FeatureCollection' as const,
        features: zonas
            .filter((z) => z.poligono?.type === 'Polygon')
            .map((z) => ({ type: 'Feature' as const, geometry: z.poligono, properties: { color: z.color || '#2563eb' } })),
    };
}

/**
 * Polígono "mundo con huecos": el contorno exterior es todo el mundo y cada zona del vendedor es un
 * hueco. Una capa fill OSCURA sobre esto oscurece todo MENOS las zonas (la zona queda con el mapa al
 * 100%). MapLibre la mantiene alineada al mapa sola; no hay que recalcular en move/zoom.
 */
function mascaraGeoJSON(zonas: ZonaTerritorio[]) {
    const mundo: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
    const huecos = zonas.filter((z) => z.poligono?.type === 'Polygon').map((z) => z.poligono.coordinates[0]);
    return {
        type: 'FeatureCollection' as const,
        features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [mundo, ...huecos] }, properties: {} }],
    };
}

/** ¿El punto [lng,lat] cae dentro del anillo? (ray casting). */
function puntoEnAnillo(lng: number, lat: number, anillo: number[][]): boolean {
    let dentro = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const xi = anillo[i][0], yi = anillo[i][1];
        const xj = anillo[j][0], yj = anillo[j][1];
        const cruza = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (cruza) dentro = !dentro;
    }
    return dentro;
}

/** ¿El punto cae dentro de alguna de las zonas del vendedor? */
function dentroDeZona(lng: number, lat: number, zonas: ZonaTerritorio[]): boolean {
    for (const z of zonas) {
        if (z.poligono?.type !== 'Polygon') continue;
        if (puntoEnAnillo(lng, lat, z.poligono.coordinates[0])) return true;
    }
    return false;
}

function marcasGeoJSON(marcas: MarcaTerritorio[], override?: { id: string; lng: number; lat: number }) {
    return {
        type: 'FeatureCollection' as const,
        features: marcas.map((m) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: override && override.id === m.id ? [override.lng, override.lat] : [m.lng, m.lat] },
            properties: { id: m.id, tipo: m.tipo },
        })),
    };
}

function boundsDeZonas(zonas: ZonaTerritorio[]): [[number, number], [number, number]] | null {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    let hay = false;
    for (const z of zonas) {
        if (z.poligono?.type !== 'Polygon') continue;
        for (const anillo of z.poligono.coordinates) {
            for (const [lng, lat] of anillo) {
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

export function MapaMarcas({ zonas, marcas, modoAgregar = false, onAgregarMarca, onClicMarca, onMoverMarca }: MapaMarcasProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const marcasRef = useRef<MarcaTerritorio[]>(marcas);
    const zonasRef = useRef<ZonaTerritorio[]>(zonas);
    const modoAgregarRef = useRef(modoAgregar);
    const onAgregarRef = useRef(onAgregarMarca);
    const onClicRef = useRef(onClicMarca);
    const onMoverRef = useRef(onMoverMarca);
    const dragRef = useRef<{ id: string | null; movido: boolean }>({ id: null, movido: false });
    const suprimirClickRef = useRef(false);
    const ajustadoRef = useRef(false);
    const [cargando, setCargando] = useState(true);
    const [listo, setListo] = useState(false);

    useEffect(() => { marcasRef.current = marcas; }, [marcas]);
    useEffect(() => { zonasRef.current = zonas; }, [zonas]);
    useEffect(() => { onAgregarRef.current = onAgregarMarca; }, [onAgregarMarca]);
    useEffect(() => { onClicRef.current = onClicMarca; }, [onClicMarca]);
    useEffect(() => { onMoverRef.current = onMoverMarca; }, [onMoverMarca]);

    /** Marca más cercana al punto de pantalla (proyección propia), o null. */
    function marcaEn(mapa: MapaLibre, point: { x: number; y: number }): string | null {
        const R = 14;
        let mejor: string | null = null;
        let mejorDist = R;
        for (const m of marcasRef.current) {
            const p = mapa.project([m.lng, m.lat]);
            const d = Math.hypot(p.x - point.x, p.y - point.y);
            if (d < mejorDist) { mejorDist = d; mejor = m.id; }
        }
        return mejor;
    }

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

        // Popup de hover (estado + nota); se reutiliza una sola instancia.
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '240px' });
        let popupHoverId: string | null = null;
        const ocultarPopup = () => { if (popupHoverId) { popup.remove(); popupHoverId = null; } };

        mapa.on('load', () => {
            // Máscara que oscurece el exterior (se enciende al aterrizar). Va primero: debajo de la zona y los pines.
            mapa.addSource(ID_MASCARA, { type: 'geojson', data: mascaraGeoJSON(zonas) });
            mapa.addLayer({ id: ID_MASCARA_FILL, type: 'fill', source: ID_MASCARA, paint: { 'fill-color': '#0f172a', 'fill-opacity': 0 } });
            // Zona del vendedor.
            mapa.addSource(ID_ZONA, { type: 'geojson', data: zonasGeoJSON(zonas) });
            mapa.addLayer({ id: ID_ZONA, type: 'fill', source: ID_ZONA, paint: { 'fill-color': ['coalesce', ['get', 'color'], '#2563eb'], 'fill-opacity': 0.06 } });
            mapa.addLayer({ id: ID_ZONA_LINE, type: 'line', source: ID_ZONA, paint: { 'line-color': ['coalesce', ['get', 'color'], '#2563eb'], 'line-width': 2.5, 'line-opacity': 0.9 } });
            // Marcas (pines de color por estado).
            mapa.addSource(ID_MARCAS, { type: 'geojson', data: marcasGeoJSON(marcas) });
            mapa.addLayer({
                id: ID_MARCAS_C,
                type: 'circle',
                source: ID_MARCAS,
                paint: {
                    'circle-radius': 7,
                    'circle-color': ['match', ['get', 'tipo'], 'visitado', COLOR_TIPO.visitado, 'interesado', COLOR_TIPO.interesado, 'cerrado', COLOR_TIPO.cerrado, 'sin_interes', COLOR_TIPO.sin_interes, COLOR_TIPO.visitado],
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2,
                },
            });

            setListo(true);
            setCargando(false);
        });

        // Arrastrar un pin para reubicarlo (solo fuera del modo "agregar").
        mapa.on('mousedown', (e) => {
            if (modoAgregarRef.current) return;
            const id = marcaEn(mapa, e.point);
            if (!id) return;
            dragRef.current = { id, movido: false };
            mapa.dragPan.disable();
            ocultarPopup();
            e.preventDefault();
        });

        mapa.on('mousemove', (e) => {
            const drag = dragRef.current;
            if (drag.id) {
                drag.movido = true;
                mapa.getCanvas().style.cursor = 'grabbing';
                ocultarPopup();
                (mapa.getSource(ID_MARCAS) as GeoJSONSource | undefined)?.setData(
                    marcasGeoJSON(marcasRef.current, { id: drag.id, lng: e.lngLat.lng, lat: e.lngLat.lat }),
                );
                return;
            }
            if (modoAgregarRef.current) { ocultarPopup(); return; } // el crosshair lo pone el effect de modo
            const id = marcaEn(mapa, e.point);
            mapa.getCanvas().style.cursor = id ? 'pointer' : '';
            if (id && id !== popupHoverId) {
                const m = marcasRef.current.find((x) => x.id === id);
                if (m) { popup.setLngLat([m.lng, m.lat]).setHTML(contenidoPopup(m)).addTo(mapa); popupHoverId = id; }
            } else if (!id) {
                ocultarPopup();
            }
        });

        mapa.on('mouseout', ocultarPopup);

        mapa.on('mouseup', (e) => {
            const drag = dragRef.current;
            if (!drag.id) return;
            const { id, movido } = drag;
            dragRef.current = { id: null, movido: false };
            if (!modoAgregarRef.current) mapa.dragPan.enable();
            if (!movido) return;
            suprimirClickRef.current = true; // que el click posterior no abra el editor
            if (dentroDeZona(e.lngLat.lng, e.lngLat.lat, zonasRef.current)) {
                onMoverRef.current?.(id, e.lngLat.lat, e.lngLat.lng);
            } else {
                // Fuera de la zona: el pin vuelve a su lugar (no se permite soltarlo afuera).
                (mapa.getSource(ID_MARCAS) as GeoJSONSource | undefined)?.setData(marcasGeoJSON(marcasRef.current));
                toast.advertencia('Solo puedes mover el pin dentro de tu zona.');
            }
        });

        mapa.on('click', (e) => {
            if (suprimirClickRef.current) { suprimirClickRef.current = false; return; }
            if (modoAgregarRef.current) {
                if (dentroDeZona(e.lngLat.lng, e.lngLat.lat, zonasRef.current)) {
                    onAgregarRef.current?.(e.lngLat.lat, e.lngLat.lng);
                } else {
                    toast.advertencia('Solo puedes poner marcas dentro de tu zona.');
                }
            } else {
                const id = marcaEn(mapa, e.point);
                if (id) onClicRef.current?.(id);
            }
        });

        mapa.on('error', (ev) => { console.error('[MapaMarcas] error de MapLibre:', ev.error); });

        return () => { popup.remove(); mapa.remove(); mapaRef.current = null; };
    }, []);

    // Re-pintar zona/marcas y re-recortar cuando cambian.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_ZONA) as GeoJSONSource | undefined)?.setData(zonasGeoJSON(zonas));
        (mapa.getSource(ID_MASCARA) as GeoJSONSource | undefined)?.setData(mascaraGeoJSON(zonas));
        (mapa.getSource(ID_MARCAS) as GeoJSONSource | undefined)?.setData(marcasGeoJSON(marcas));
    }, [zonas, marcas, listo]);

    // Intro: mostrar México completo y volar con zoom hasta la zona; al llegar, recortar y acotar el paneo.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo || ajustadoRef.current) return;
        const b = boundsDeZonas(zonas);
        if (!b) return;
        ajustadoRef.current = true;
        const mLng = (b[1][0] - b[0][0]) * 0.15 + 0.005;
        const mLat = (b[1][1] - b[0][1]) * 0.15 + 0.005;
        // Pausa breve para apreciar el mapa completo, luego el vuelo con zoom hasta la zona.
        const timer = setTimeout(() => {
            mapa.fitBounds(b, { padding: 24, maxZoom: 16, duration: 2600, essential: true });
            mapa.once('moveend', () => {
                if (mapa.getLayer(ID_MASCARA_FILL)) mapa.setPaintProperty(ID_MASCARA_FILL, 'fill-opacity', 0.5);
                mapa.setMaxBounds([[b[0][0] - mLng, b[0][1] - mLat], [b[1][0] + mLng, b[1][1] + mLat]] as LngLatBoundsLike);
            });
        }, 900);
        return () => clearTimeout(timer);
    }, [zonas, listo]);

    // Cursor + comportamiento según el modo.
    useEffect(() => {
        modoAgregarRef.current = modoAgregar;
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        mapa.getCanvas().style.cursor = modoAgregar ? 'crosshair' : '';
        if (modoAgregar) mapa.dragPan.disable();
        else mapa.dragPan.enable();
    }, [modoAgregar, listo]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
            <div ref={contenedorRef} className="h-full w-full" data-testid="marcas-mapa" />
            {cargando && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/70 text-[13px] text-texto-3">Cargando mapa…</div>
            )}
            {listo && zonas.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-borde bg-superficie/95 px-3 py-1.5 text-[12px] text-texto-3 shadow-pop-panel">
                    Aún no tienes una zona asignada. Tu gerente te asignará una.
                </div>
            )}
        </div>
    );
}

export default MapaMarcas;
