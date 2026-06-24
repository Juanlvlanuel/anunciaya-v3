/**
 * MapaTerritorios.tsx
 * ===================
 * Mapa (MapLibre + tiles OpenFreeMap) que pinta las ZONAS como polígonos y, en modo DIBUJO,
 * deja trazar/editar una zona con DOS herramientas y PEGADO A CALLES (snapping):
 *
 *   ✏️ Agregar punto (clic) — pone un vértice y lo pega a la calle más cercana.
 *   ✋ Mover punto         — arrastra un vértice; el mapa NO se mueve mientras arrastras
 *                           (dragPan off), y al soltar el vértice se vuelve a pegar a la calle.
 *
 * El snapping usa las calles que ya traen las tiles (source-layer `transportation`): proyecta
 * el punto sobre la calle más cercana dentro de un umbral en píxeles. Sin dataset externo.
 * En Fase 1 (VER) solo se muestran las zonas existentes.
 *
 * Ubicación: apps/admin/src/components/territorios/MapaTerritorios.tsx
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource, type PointLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Undo2, Check, X, Pencil, Move, Trash2, Hand } from 'lucide-react';
import type { ZonaTerritorio, PoligonoGeoJSON, MarcaEquipo, NegocioMapa } from '../../services/territoriosService';
import { COLOR_TIPO, ETIQUETA_TIPO, COLOR_NEGOCIO, tituloPopup, fechaCorta, negociosGeoJSON, contenidoPopupNegocio } from './MapaMarcas';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_SOURCE = 'zonas';
const ID_FILL = 'zonas-fill';
const ID_LINE = 'zonas-line';
const ID_LABEL = 'zonas-label';
const ID_DIBUJO = 'dibujo';
const ID_DIBUJO_FILL = 'dibujo-fill';
const ID_DIBUJO_LINE = 'dibujo-line';
const ID_DIBUJO_PTS = 'dibujo-pts';
const ID_DIBUJO_PTS_C = 'dibujo-pts-circle';
const ID_MARCAS_EQ = 'marcas-eq';
const ID_MARCAS_EQ_SOMBRA = 'marcas-eq-sombra';
const ID_MARCAS_EQ_C = 'marcas-eq-circle';
const ID_NEGOCIOS = 'negocios';
const ID_NEGOCIOS_C = 'negocios-circle';
const COLOR_DEFECTO = '#2563eb';
const COLOR_DIBUJO = '#0ea5e9';
const SNAP_PX = 18; // radio de búsqueda de calle para el pegado (px)

type Herramienta = 'crear' | 'mover' | 'borrar' | 'mano';

interface MapaTerritoriosProps {
    zonas: ZonaTerritorio[];
    marcas?: MarcaEquipo[];
    negocios?: NegocioMapa[];
    centro?: [number, number] | null;
    modoDibujo?: boolean;
    introAnimado?: boolean; // intro de cine (México → vuelo a sus zonas), p.ej. para el gerente
    onPoligonoCompleto?: (poligono: PoligonoGeoJSON) => void;
    onCancelarDibujo?: () => void;
}

function marcasEqGeoJSON(marcas: MarcaEquipo[]) {
    return {
        type: 'FeatureCollection' as const,
        features: marcas.map((m) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
            properties: { id: m.id, tipo: m.tipo },
        })),
    };
}

/** Escapa texto para insertarlo de forma segura en el HTML del popup. */
function escaparHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** HTML del popup de hover de una marca del vendedor: estado + nota + quién la puso. */
function contenidoPopupEq(m: MarcaEquipo): string {
    const nota = m.nota?.trim();
    const vendedor = m.vendedorNombre?.trim();
    const negocio = m.negocioNombre?.trim();
    const filaNota = nota
        ? `<div style="font-size:11.5px;line-height:1.45;color:#475569;white-space:pre-wrap;word-break:break-word;">${escaparHtml(nota)}</div>`
        : `<div style="font-size:11px;color:#94a3b8;font-style:italic;">Sin nota</div>`;
    const filaNegocio = negocio
        ? `<div style="font-size:11px;color:#64748b;">Negocio: <span style="color:#334155;font-weight:600;">${escaparHtml(negocio)}</span></div>`
        : '';
    const filaVend = vendedor
        ? `<div style="font-size:11px;color:#64748b;">Vendedor: <span style="color:#334155;font-weight:600;">${escaparHtml(vendedor)}</span></div>`
        : '';
    const fecha = fechaCorta(m.createdAt);
    const filaFecha = fecha ? `<div style="font-size:10.5px;color:#94a3b8;">Marcado el ${fecha}</div>` : '';
    return `<div style="display:flex;flex-direction:column;gap:6px;min-width:135px;max-width:230px;">`
        + tituloPopup(COLOR_TIPO[m.tipo], ETIQUETA_TIPO[m.tipo], true)
        + filaNota + filaNegocio + filaVend + filaFecha + `</div>`;
}

function construirGeoJSON(zonas: ZonaTerritorio[]) {
    return {
        type: 'FeatureCollection' as const,
        features: zonas
            .filter((z) => z.poligono?.type === 'Polygon')
            .map((z) => ({
                type: 'Feature' as const,
                geometry: z.poligono,
                properties: { id: z.id, nombre: z.nombre, color: z.color || COLOR_DEFECTO },
            })),
    };
}

function calcularBounds(zonas: ZonaTerritorio[]): [[number, number], [number, number]] | null {
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

export function MapaTerritorios({ zonas, marcas = [], negocios = [], centro, modoDibujo = false, introAnimado = false, onPoligonoCompleto, onCancelarDibujo }: MapaTerritoriosProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const zonasRef = useRef<ZonaTerritorio[]>(zonas);
    const marcasRef = useRef<MarcaEquipo[]>(marcas);
    const negociosRef = useRef<NegocioMapa[]>(negocios);
    const verticesRef = useRef<[number, number][]>([]);
    const modoDibujoRef = useRef(modoDibujo);
    const herramientaRef = useRef<Herramienta>('crear');
    const dragRef = useRef<number | null>(null);
    const onCompletoRef = useRef(onPoligonoCompleto);
    const popupEqRef = useRef<maplibregl.Popup | null>(null);
    const popupEqIdRef = useRef<string | null>(null);
    const popupNegRef = useRef<maplibregl.Popup | null>(null);
    const introAnimadoRef = useRef(introAnimado);
    const introHechoRef = useRef(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listo, setListo] = useState(false);
    const [numVertices, setNumVertices] = useState(0);
    const [herramienta, setHerramienta] = useState<Herramienta>('crear');

    useEffect(() => { zonasRef.current = zonas; }, [zonas]);
    useEffect(() => { marcasRef.current = marcas; }, [marcas]);
    useEffect(() => { negociosRef.current = negocios; }, [negocios]);
    useEffect(() => { introAnimadoRef.current = introAnimado; }, [introAnimado]);
    useEffect(() => { onCompletoRef.current = onPoligonoCompleto; }, [onPoligonoCompleto]);

    /** Oculta el popup de marca (si hay alguno abierto). */
    function ocultarPopupEq() {
        if (popupEqIdRef.current) { popupEqRef.current?.remove(); popupEqIdRef.current = null; }
    }

    /** Marca del equipo más cercana al punto de pantalla (proyección propia), o null. */
    function marcaEnEq(mapa: MapaLibre, point: { x: number; y: number }): string | null {
        const R = 12;
        let mejor: string | null = null;
        let mejorDist = R;
        for (const m of marcasRef.current) {
            const p = mapa.project([m.lng, m.lat]);
            const d = Math.hypot(p.x - point.x, p.y - point.y);
            if (d < mejorDist) { mejorDist = d; mejor = m.id; }
        }
        return mejor;
    }

    /** Pega un punto a la calle más cercana (source-layer `transportation`) dentro del umbral. */
    function snapACalle(mapa: MapaLibre, lng: number, lat: number): [number, number] {
        let p: { x: number; y: number };
        try { p = mapa.project([lng, lat]); } catch { return [lng, lat]; }
        const caja: [PointLike, PointLike] = [[p.x - SNAP_PX, p.y - SNAP_PX], [p.x + SNAP_PX, p.y + SNAP_PX]];
        let feats;
        try { feats = mapa.queryRenderedFeatures(caja); } catch { return [lng, lat]; }
        let mejor: [number, number] | null = null;
        let mejorDist = Infinity;
        for (const f of feats) {
            if (f.sourceLayer !== 'transportation') continue;
            const g = f.geometry as { type: string; coordinates: number[][] | number[][][] };
            const lineas: number[][][] =
                g.type === 'LineString' ? [g.coordinates as number[][]] : g.type === 'MultiLineString' ? (g.coordinates as number[][][]) : [];
            for (const linea of lineas) {
                for (let i = 0; i + 1 < linea.length; i++) {
                    const pa = mapa.project(linea[i] as [number, number]);
                    const pb = mapa.project(linea[i + 1] as [number, number]);
                    const dx = pb.x - pa.x, dy = pb.y - pa.y;
                    const len2 = dx * dx + dy * dy;
                    let t = len2 ? ((p.x - pa.x) * dx + (p.y - pa.y) * dy) / len2 : 0;
                    t = Math.max(0, Math.min(1, t));
                    const sx = pa.x + t * dx, sy = pa.y + t * dy;
                    const dist = Math.hypot(sx - p.x, sy - p.y);
                    if (dist < mejorDist) {
                        mejorDist = dist;
                        const ll = mapa.unproject([sx, sy]);
                        mejor = [ll.lng, ll.lat];
                    }
                }
            }
        }
        return mejor && mejorDist <= SNAP_PX ? mejor : [lng, lat];
    }

    /** Índice del LADO (i → i+1) del polígono más cercano al punto de pantalla, o -1 si ninguno cerca. */
    function indiceAristaCercana(mapa: MapaLibre, px: { x: number; y: number }, v: [number, number][]): number {
        if (v.length < 3) return -1; // sin polígono aún → no hay aristas que partir
        const UMBRAL = 8; // px
        let mejor = -1;
        let mejorDist = UMBRAL;
        for (let i = 0; i < v.length; i++) {
            const a = mapa.project(v[i]);
            const b = mapa.project(v[(i + 1) % v.length]);
            const dx = b.x - a.x, dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            let t = len2 ? ((px.x - a.x) * dx + (px.y - a.y) * dy) / len2 : 0;
            t = Math.max(0, Math.min(1, t));
            const sx = a.x + t * dx, sy = a.y + t * dy;
            const dist = Math.hypot(sx - px.x, sy - px.y);
            if (dist < mejorDist) { mejorDist = dist; mejor = i; }
        }
        return mejor;
    }

    /** Índice del vértice del dibujo más cercano al punto de pantalla (≤ tolerancia px), o -1.
     *  Se calcula proyectando los vértices a pantalla — NO depende del hit-test de capas de MapLibre. */
    function indiceVerticeEn(mapa: MapaLibre, point: { x: number; y: number }): number {
        const R = 12;
        const v = verticesRef.current;
        let mejor = -1;
        let mejorDist = R;
        for (let i = 0; i < v.length; i++) {
            const p = mapa.project(v[i]);
            const d = Math.hypot(p.x - point.x, p.y - point.y);
            if (d < mejorDist) { mejorDist = d; mejor = i; }
        }
        return mejor;
    }

    /** Re-pinta el trazo en construcción (relleno + línea + vértices con su índice). */
    function pintarDibujo(mapa: MapaLibre) {
        const v = verticesRef.current;
        const src = mapa.getSource(ID_DIBUJO) as GeoJSONSource | undefined;
        const srcPts = mapa.getSource(ID_DIBUJO_PTS) as GeoJSONSource | undefined;
        if (src) {
            const features = [
                ...(v.length >= 3 ? [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[...v, v[0]]] }, properties: {} }] : []),
                ...(v.length >= 2 ? [{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: v }, properties: {} }] : []),
            ];
            src.setData({ type: 'FeatureCollection' as const, features });
        }
        if (srcPts) {
            srcPts.setData({
                type: 'FeatureCollection' as const,
                features: v.map((c, i) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: c }, properties: { idx: i } })),
            });
        }
    }

    function limpiarDibujo() {
        verticesRef.current = [];
        setNumVertices(0);
        const mapa = mapaRef.current;
        if (mapa) pintarDibujo(mapa);
    }

    // ── Crear el mapa una sola vez ───────────────────────────────────────────────
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

        // Popup de hover de las marcas de vendedores (solo lectura).
        popupEqRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '250px', className: 'popup-territorio' });
        // Popup de hover de los negocios reales.
        const popupNeg = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '250px', className: 'popup-territorio' });
        popupNegRef.current = popupNeg;

        mapa.on('load', () => {
            mapa.addSource(ID_SOURCE, { type: 'geojson', data: construirGeoJSON(zonasRef.current) });
            mapa.addLayer({ id: ID_FILL, type: 'fill', source: ID_SOURCE, paint: { 'fill-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'fill-opacity': 0.22 } });
            mapa.addLayer({ id: ID_LINE, type: 'line', source: ID_SOURCE, layout: { 'line-join': 'round' }, paint: { 'line-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'line-width': 2, 'line-opacity': 0.85 } });
            mapa.addLayer({ id: ID_LABEL, type: 'symbol', source: ID_SOURCE, layout: { 'text-field': ['get', 'nombre'], 'text-size': 12, 'text-anchor': 'center' }, paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 } });

            // Marcas de los vendedores (solo lectura), debajo de las capas de dibujo. Sombra + disco con borde.
            mapa.addSource(ID_MARCAS_EQ, { type: 'geojson', data: marcasEqGeoJSON(marcasRef.current) });
            mapa.addLayer({
                id: ID_MARCAS_EQ_SOMBRA, type: 'circle', source: ID_MARCAS_EQ,
                paint: { 'circle-radius': 8.5, 'circle-color': '#0f172a', 'circle-opacity': 0.18, 'circle-blur': 0.6, 'circle-translate': [0, 1.5] },
            });
            mapa.addLayer({
                id: ID_MARCAS_EQ_C, type: 'circle', source: ID_MARCAS_EQ,
                paint: {
                    'circle-radius': 7,
                    'circle-color': ['match', ['get', 'tipo'], 'visitado', COLOR_TIPO.visitado, 'interesado', COLOR_TIPO.interesado, 'cerrado', COLOR_TIPO.cerrado, 'sin_interes', COLOR_TIPO.sin_interes, COLOR_TIPO.visitado],
                    'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5,
                },
            });

            // Negocios reales (solo lectura), debajo de las capas de dibujo.
            mapa.addSource(ID_NEGOCIOS, { type: 'geojson', data: negociosGeoJSON(negociosRef.current) });
            mapa.addLayer({
                id: ID_NEGOCIOS_C, type: 'circle', source: ID_NEGOCIOS,
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#ffffff',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': ['case', ['==', ['get', 'embajadorId'], ''], COLOR_NEGOCIO.sinVendedor, COLOR_NEGOCIO.conVendedor],
                },
            });
            mapa.on('mouseenter', ID_NEGOCIOS_C, (e) => {
                if (modoDibujoRef.current) return;
                const f = e.features?.[0];
                if (!f) return;
                mapa.getCanvas().style.cursor = 'pointer';
                const coords = (f.geometry as { coordinates: [number, number] }).coordinates;
                popupNeg.setLngLat(coords).setHTML(contenidoPopupNegocio(f.properties as Record<string, string>)).addTo(mapa);
            });
            mapa.on('mouseleave', ID_NEGOCIOS_C, () => { mapa.getCanvas().style.cursor = ''; popupNeg.remove(); });

            mapa.addSource(ID_DIBUJO, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            mapa.addLayer({ id: ID_DIBUJO_FILL, type: 'fill', source: ID_DIBUJO, paint: { 'fill-color': COLOR_DIBUJO, 'fill-opacity': 0.18 } });
            mapa.addLayer({ id: ID_DIBUJO_LINE, type: 'line', source: ID_DIBUJO, layout: { 'line-join': 'round' }, paint: { 'line-color': COLOR_DIBUJO, 'line-width': 2.5, 'line-dasharray': [2, 1] } });
            mapa.addSource(ID_DIBUJO_PTS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            mapa.addLayer({ id: ID_DIBUJO_PTS_C, type: 'circle', source: ID_DIBUJO_PTS, paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': COLOR_DIBUJO, 'circle-stroke-width': 2.5 } });

            setListo(true);
            setCargando(false);
            // Sin intro: encuadra al instante. Con intro de cine: se queda en México y el effect de zonas vuela.
            if (!introAnimadoRef.current) {
                const bounds = calcularBounds(zonasRef.current);
                if (bounds) mapa.fitBounds(bounds, { padding: 60, duration: 0, maxZoom: 14 });
            }
        });

        // Clic según la herramienta activa.
        mapa.on('click', (e) => {
            if (!modoDibujoRef.current) return;
            const h = herramientaRef.current;
            if (h === 'crear') {
                // ✏️ Agregar: si el clic cae sobre una ARISTA del polígono, INSERTA ahí (refinar borde); si no, al final.
                const v = verticesRef.current;
                const nuevo = snapACalle(mapa, e.lngLat.lng, e.lngLat.lat);
                const lado = indiceAristaCercana(mapa, e.point, v);
                verticesRef.current = lado >= 0 ? [...v.slice(0, lado + 1), nuevo, ...v.slice(lado + 1)] : [...v, nuevo];
                pintarDibujo(mapa);
                setNumVertices(verticesRef.current.length);
            } else if (h === 'borrar') {
                // 🗑️ Quitar: clic (cerca de) un vértice lo elimina.
                const idx = indiceVerticeEn(mapa, e.point);
                if (idx < 0) return;
                verticesRef.current = verticesRef.current.filter((_, i) => i !== idx);
                pintarDibujo(mapa);
                setNumVertices(verticesRef.current.length);
            }
        });

        // ✋ Mover punto: agarrar un vértice (herramienta "mover") → arrastrar sin mover el mapa.
        mapa.on('mousedown', (e) => {
            if (!modoDibujoRef.current || herramientaRef.current !== 'mover') return;
            const idx = indiceVerticeEn(mapa, e.point);
            if (idx < 0) return;
            dragRef.current = idx;
            mapa.dragPan.disable();
            mapa.getCanvas().style.cursor = 'grabbing';
            e.preventDefault();
        });
        mapa.on('mousemove', (e) => {
            // Arrastrando un vértice (herramienta Mover).
            if (dragRef.current !== null) {
                const idx = dragRef.current;
                verticesRef.current = verticesRef.current.map((v, i) => (i === idx ? [e.lngLat.lng, e.lngLat.lat] : v));
                pintarDibujo(mapa);
                return;
            }
            // Modo VER (sin dibujo): hover sobre marcas de vendedores → popup de lectura.
            if (!modoDibujoRef.current) {
                const id = marcaEnEq(mapa, e.point);
                mapa.getCanvas().style.cursor = id ? 'pointer' : '';
                if (id && id !== popupEqIdRef.current) {
                    const m = marcasRef.current.find((x) => x.id === id);
                    if (m && popupEqRef.current) { popupEqRef.current.setLngLat([m.lng, m.lat]).setHTML(contenidoPopupEq(m)).addTo(mapa); popupEqIdRef.current = id; }
                } else if (!id) {
                    ocultarPopupEq();
                }
                return;
            }
            // Cursor de hover según herramienta (cálculo propio, no hit-test de capas).
            const h = herramientaRef.current;
            if (h === 'mover' || h === 'borrar') {
                const sobre = indiceVerticeEn(mapa, e.point) >= 0;
                mapa.getCanvas().style.cursor = sobre ? (h === 'mover' ? 'grab' : 'pointer') : '';
            }
        });
        mapa.on('mouseup', () => {
            if (dragRef.current === null) return;
            const idx = dragRef.current;
            const v = verticesRef.current[idx];
            if (v) {
                const snapped = snapACalle(mapa, v[0], v[1]);
                verticesRef.current = verticesRef.current.map((vv, i) => (i === idx ? snapped : vv));
                pintarDibujo(mapa);
            }
            dragRef.current = null;
            // Re-asegurar el pan según la herramienta: tras mover un punto NO debe quedar paneable
            // a menos que estés en la herramienta "Mapa".
            if (herramientaRef.current === 'mano') mapa.dragPan.enable();
            else mapa.dragPan.disable();
            mapa.getCanvas().style.cursor = '';
        });

        mapa.on('mouseout', ocultarPopupEq);
        mapa.on('error', (ev) => { console.error('[MapaTerritorios] error de MapLibre:', ev.error); });

        return () => { popupEqRef.current?.remove(); popupNegRef.current?.remove(); mapa.remove(); mapaRef.current = null; };
    }, []);

    // ── Re-pintar zonas cuando cambian ───────────────────────────────────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_SOURCE) as GeoJSONSource | undefined)?.setData(construirGeoJSON(zonas));
        if (modoDibujoRef.current) return;
        const bounds = calcularBounds(zonas);

        // Intro de cine (gerente, una sola vez): se ve México y vuela con zoom hasta sus zonas (su región).
        if (introAnimado && !introHechoRef.current && bounds) {
            introHechoRef.current = true;
            const t = setTimeout(() => mapa.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 2600, essential: true }), 900);
            return () => clearTimeout(t);
        }

        if (bounds) mapa.fitBounds(bounds, { padding: 60, duration: 300, maxZoom: 14 });
        else if (centro) mapa.flyTo({ center: centro, zoom: 12, duration: 400 });
    }, [zonas, listo, centro, introAnimado]);

    // ── Re-pintar marcas de vendedores y negocios cuando cambian ─────────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_MARCAS_EQ) as GeoJSONSource | undefined)?.setData(marcasEqGeoJSON(marcas));
        (mapa.getSource(ID_NEGOCIOS) as GeoJSONSource | undefined)?.setData(negociosGeoJSON(negocios));
    }, [marcas, negocios, listo]);

    // ── Entrar/salir del modo dibujo ─────────────────────────────────────────────
    useEffect(() => {
        modoDibujoRef.current = modoDibujo;
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        if (modoDibujo) {
            ocultarPopupEq(); // sin popups de marca mientras se dibuja
            setHerramienta('crear');
            herramientaRef.current = 'crear';
            mapa.dragPan.disable(); // las herramientas mandan; el pan solo en la "Mano"
            mapa.getCanvas().style.cursor = 'crosshair';
        } else {
            mapa.dragPan.enable();
            mapa.getCanvas().style.cursor = '';
            limpiarDibujo();
        }
    }, [modoDibujo, listo]);

    // ── Cambiar de herramienta ───────────────────────────────────────────────────
    useEffect(() => {
        herramientaRef.current = herramienta;
        const mapa = mapaRef.current;
        if (!mapa || !modoDibujo) return;
        if (herramienta === 'mano') {
            mapa.dragPan.enable(); // solo la Mano mueve el mapa al arrastrar
            mapa.getCanvas().style.cursor = 'grab';
        } else {
            mapa.dragPan.disable(); // Agregar/Mover/Quitar: arrastrar NO mueve el mapa
            mapa.getCanvas().style.cursor = herramienta === 'crear' ? 'crosshair' : '';
        }
    }, [herramienta, modoDibujo]);

    const deshacer = () => {
        verticesRef.current = verticesRef.current.slice(0, -1);
        setNumVertices(verticesRef.current.length);
        const mapa = mapaRef.current;
        if (mapa) pintarDibujo(mapa);
    };

    const terminar = () => {
        const v = verticesRef.current;
        if (v.length < 3) return;
        onCompletoRef.current?.({ type: 'Polygon', coordinates: [[...v, v[0]]] });
        limpiarDibujo();
    };

    const botonHerr = (h: Herramienta, Icono: typeof Pencil, texto: string) => (
        <button
            type="button"
            data-testid={`dibujo-herr-${h}`}
            onClick={() => setHerramienta(h)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition ${herramienta === h ? 'bg-marca text-white' : 'text-texto-2 hover:bg-superficie-2'}`}
        >
            <Icono size={13} /> {texto}
        </button>
    );

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde">
            <div ref={contenedorRef} className="h-full w-full" data-testid="territorios-mapa" />

            {cargando && !error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/70 text-[13px] text-texto-3">Cargando mapa…</div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/90 px-6 text-center text-[13px] text-peligro">{error}</div>
            )}
            {listo && !error && !modoDibujo && zonas.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-borde bg-superficie/95 px-3 py-1.5 text-[12px] text-texto-3 shadow-pop-panel">
                    Aún no hay zonas dibujadas en este mapa.
                </div>
            )}

            {/* Barra de dibujo: herramientas + acciones */}
            {modoDibujo && (
                <div className="absolute inset-x-0 top-3 mx-auto flex w-fit max-w-[95%] flex-wrap items-center justify-center gap-2 rounded-full border border-borde bg-superficie/95 px-2 py-1.5 shadow-pop-panel">
                    <div className="flex items-center gap-0.5 rounded-full bg-superficie-2 p-0.5">
                        {botonHerr('crear', Pencil, 'Agregar')}
                        {botonHerr('mover', Move, 'Mover')}
                        {botonHerr('borrar', Trash2, 'Quitar')}
                        {botonHerr('mano', Hand, 'Mapa')}
                    </div>
                    <span className="px-1 text-[12px] text-texto-3">
                        {herramienta === 'crear'
                            ? (numVertices < 3 ? `Clic en las esquinas (${numVertices}/3)` : `${numVertices} puntos`)
                            : herramienta === 'mover' ? 'Arrastra un punto'
                            : herramienta === 'borrar' ? 'Clic en un punto para quitarlo'
                            : 'Arrastra para mover el mapa'}
                    </span>
                    <button type="button" data-testid="dibujo-deshacer" onClick={deshacer} disabled={numVertices === 0} title="Deshacer punto" className="grid h-7 w-7 place-items-center rounded-full text-texto-2 transition hover:bg-superficie-2 disabled:opacity-40">
                        <Undo2 size={15} />
                    </button>
                    <button type="button" data-testid="dibujo-terminar" onClick={terminar} disabled={numVertices < 3} title="Terminar zona" className="flex items-center gap-1 rounded-full bg-ok px-2.5 py-1 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40">
                        <Check size={14} /> Terminar
                    </button>
                    <button type="button" data-testid="dibujo-cancelar" onClick={() => { limpiarDibujo(); onCancelarDibujo?.(); }} title="Cancelar" className="grid h-7 w-7 place-items-center rounded-full text-texto-2 transition hover:bg-superficie-2">
                        <X size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default MapaTerritorios;
