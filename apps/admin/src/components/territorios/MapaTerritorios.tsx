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
import { createPortal } from 'react-dom';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource, type PointLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Undo2, Check, X, Pencil, Move, Trash2, Hand } from 'lucide-react';
import type { ZonaTerritorio, PoligonoGeoJSON, MarcaEquipo, NegocioMapa } from '../../services/territoriosService';
import { COLOR_TIPO, ETIQUETA_TIPO, COLOR_NEGOCIO, ESTADO_BADGE, tituloPopup, fechaCorta, negociosGeoJSON, contenidoPopupNegocio, iconoNegocio, iconoPinMarca, centrarPinBajoEditor, elementoPin, elementoPinNegocio, aplicarResalte, OFFSET_PIN } from './MapaMarcas';
import { Tooltip } from '../ui/Tooltip';
import { useScrollPanel } from '../../stores/useScrollPanel';

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
const ID_MARCAS_EQ_C = 'marcas-eq-pin';
const ID_NEGOCIOS = 'negocios';
const ID_NEGOCIOS_C = 'negocios-circle';
const COLOR_DEFECTO = '#2563eb';
const COLOR_DIBUJO = '#0ea5e9';
const SNAP_PX = 18; // radio de búsqueda de calle para el pegado (px)

type Herramienta = 'crear' | 'mover' | 'borrar' | 'mano';

/** Datos del pin abierto en la tarjeta de detalle (solo lectura). */
type DetallePin =
    | { tipo: 'marca'; estado: MarcaEquipo['tipo']; nota: string | null; vendedor: string | null; fecha: string | null }
    | { tipo: 'negocio'; nombre: string; estado: string; asignado: boolean; vendedor: string | null };

interface MapaTerritoriosProps {
    zonas: ZonaTerritorio[];
    marcas?: MarcaEquipo[];
    negocios?: NegocioMapa[];
    centro?: [number, number] | null;
    modoDibujo?: boolean;
    poligonoEditando?: PoligonoGeoJSON | null; // si se edita una zona: su contorno se precarga en el editor
    poligonoPreview?: PoligonoGeoJSON | null;  // polígono ya terminado pero aún sin guardar (preview en el form)
    enfocarPoligono?: PoligonoGeoJSON | null;  // al cambiar enfocarNonce, vuela (zoom cine) hacia este polígono
    enfocarNonce?: number;
    introAnimado?: boolean; // intro de cine (México → vuelo a sus zonas), p.ej. para el gerente
    onPoligonoCompleto?: (poligono: PoligonoGeoJSON) => void;
    mapaFijo?: boolean; // el mapa va `fixed` al viewport (móvil vertical) → la tarjeta de detalle se porta a body
}

/** Bounding box de un solo polígono (reusa calcularBounds). */
function boundsDePoligono(poly: PoligonoGeoJSON): [[number, number], [number, number]] | null {
    return calcularBounds([{ poligono: poly } as ZonaTerritorio]);
}

function marcasEqGeoJSON(marcas: MarcaEquipo[]) {
    return {
        type: 'FeatureCollection' as const,
        features: marcas
            .filter((m) => Number.isFinite(m.lng) && Number.isFinite(m.lat))
            .map((m) => ({
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
    const filaNota = nota
        ? `<div style="font-size:14px;line-height:1.5;color:#475569;white-space:pre-wrap;word-break:break-word;">${escaparHtml(nota)}</div>`
        : `<div style="font-size:13.5px;color:#94a3b8;font-style:italic;">Sin nota</div>`;
    const filaVend = vendedor
        ? `<div style="font-size:13px;color:#64748b;">Vendedor: <span style="color:#334155;font-weight:600;">${escaparHtml(vendedor)}</span></div>`
        : '';
    const fecha = fechaCorta(m.createdAt);
    const filaFecha = fecha ? `<div style="font-size:13px;color:#94a3b8;">Marcado el ${fecha}</div>` : '';
    return `<div style="display:flex;flex-direction:column;gap:9px;min-width:210px;max-width:300px;">`
        + tituloPopup(COLOR_TIPO[m.tipo], ETIQUETA_TIPO[m.tipo], true, true)
        + filaNota + filaVend + filaFecha + `</div>`;
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

export function MapaTerritorios({ zonas, marcas = [], negocios = [], centro, modoDibujo = false, poligonoEditando = null, poligonoPreview = null, enfocarPoligono = null, enfocarNonce = 0, introAnimado = false, onPoligonoCompleto, mapaFijo = false }: MapaTerritoriosProps) {
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
    const marcadorResalteRef = useRef<maplibregl.Marker | null>(null); // pin HTML resaltado de la marca abierta
    const introAnimadoRef = useRef(introAnimado);
    const introHechoRef = useRef(false);
    const poligonoEditandoRef = useRef(poligonoEditando);
    const enfocarPoligonoRef = useRef(enfocarPoligono);
    const centroRef = useRef(centro);
    const pendienteEncuadrarRef = useRef(true);  // reencuadrar al cargar / cambiar de ciudad, NO al guardar
    const yaEncuadroRef = useRef(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [listo, setListo] = useState(false);
    const headerVisible = useScrollPanel((s) => s.headerVisible); // mapa fijo: baja el zoom cuando el header asoma
    const [numVertices, setNumVertices] = useState(0);
    const [herramienta, setHerramienta] = useState<Herramienta>('crear');
    // Detalle de una marca/negocio en SOLO LECTURA (tarjeta sobre el mapa, al hacer clic en un pin).
    // El gerente solo VE, no edita. null = cerrado.
    const [detalle, setDetalle] = useState<DetallePin | null>(null);
    const cerrarDetalle = () => { setDetalle(null); marcadorResalteRef.current?.remove(); marcadorResalteRef.current = null; };

    useEffect(() => { zonasRef.current = zonas; }, [zonas]);
    useEffect(() => { marcasRef.current = marcas; }, [marcas]);
    useEffect(() => { negociosRef.current = negocios; }, [negocios]);
    useEffect(() => { introAnimadoRef.current = introAnimado; }, [introAnimado]);
    useEffect(() => { poligonoEditandoRef.current = poligonoEditando; }, [poligonoEditando]);
    useEffect(() => { enfocarPoligonoRef.current = enfocarPoligono; }, [enfocarPoligono]);
    // Cambió la ciudad (centro) → marcar para reencuadrar cuando lleguen sus zonas.
    useEffect(() => { centroRef.current = centro; pendienteEncuadrarRef.current = true; }, [centro]);
    useEffect(() => { onCompletoRef.current = onPoligonoCompleto; }, [onPoligonoCompleto]);

    /** Oculta el popup de marca (si hay alguno abierto). */
    function ocultarPopupEq() {
        if (popupEqIdRef.current) { popupEqRef.current?.remove(); popupEqIdRef.current = null; }
    }

    /** Marca del equipo más cercana al punto de pantalla (proyección propia), o null. */
    function marcaEnEq(mapa: MapaLibre, point: { x: number; y: number }): string | null {
        // Las marcas son PINES anclados en la punta (icon-anchor bottom): el cuerpo va de la punta hacia
        // ARRIBA (~34px de alto, ~26 de ancho). Hit-test sobre ese rectángulo (no un radio en la punta).
        let mejor: string | null = null;
        let mejorScore = Infinity;
        for (const m of marcasRef.current) {
            const p = mapa.project([m.lng, m.lat]); // punta del pin
            const dx = point.x - p.x;
            const dy = point.y - p.y; // negativo = sobre el cuerpo del pin
            if (dx >= -13 && dx <= 13 && dy >= -34 && dy <= 3) {
                const score = Math.abs(dy + 21); // más cerca de la cabeza (21px sobre la punta)
                if (score < mejorScore) { mejorScore = score; mejor = m.id; }
            }
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
        const contenedor = contenedorRef.current;
        if (!contenedor || mapaRef.current) return;

        const mapa = new maplibregl.Map({
            container: contenedor,
            style: ESTILO_TILES,
            center: CENTRO_MX,
            zoom: 4.3,
            attributionControl: { compact: true },
        });
        mapaRef.current = mapa;
        // Zoom con la rueda MÁS rápido (menos giros para acercar/alejar). Default es 1/450.
        mapa.scrollZoom.setWheelZoomRate(1 / 200);
        mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        // Botón "Centrar": encuadra todas las zonas de la ciudad (o el centro si no hay). Va en el mismo
        // grupo top-right que el zoom → se apila justo debajo (abajo-derecha la ocupa el FAB en móvil).
        const ctrlCentrar: maplibregl.IControl = {
            onAdd() {
                const div = document.createElement('div');
                div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.title = 'Centrar zonas';
                btn.setAttribute('aria-label', 'Centrar zonas');
                btn.style.display = 'grid';
                btn.style.placeItems = 'center';
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>';
                btn.onclick = () => {
                    const b = calcularBounds(zonasRef.current);
                    if (b) mapa.fitBounds(b, { padding: 60, maxZoom: 15, duration: 900, essential: true });
                    else if (centroRef.current) mapa.flyTo({ center: centroRef.current, zoom: 12, duration: 900, essential: true });
                };
                div.appendChild(btn);
                return div;
            },
            onRemove() {},
        };
        mapa.addControl(ctrlCentrar, 'top-right');

        // El estilo base de OpenFreeMap referencia íconos de POI (swimming_pool, atm, office…) que su
        // sprite no siempre trae: MapLibre avisa "Image X could not be loaded" en cada zoom. Damos un
        // pixel transparente para los íconos faltantes → sin warning y sin dibujar nada de más.
        mapa.on('styleimagemissing', (e) => {
            if (!mapa.hasImage(e.id)) mapa.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });

        // Popup de hover de las marcas de vendedores (solo lectura). Pin → offset por dirección.
        popupEqRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: OFFSET_PIN, maxWidth: '310px', className: 'popup-territorio' });
        // Popup de hover de los negocios reales (pin → offset por dirección, como el del vendedor).
        const popupNeg = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: OFFSET_PIN, maxWidth: '310px', className: 'popup-territorio' });
        popupNegRef.current = popupNeg;

        mapa.on('load', () => {
            // Atribución colapsada por defecto (solo el ⓘ): MapLibre la abre la 1ª vez con esta clase.
            mapa.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
            mapa.addSource(ID_SOURCE, { type: 'geojson', data: construirGeoJSON(zonasRef.current) });
            mapa.addLayer({ id: ID_FILL, type: 'fill', source: ID_SOURCE, paint: { 'fill-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'fill-opacity': 0.22 } });
            mapa.addLayer({ id: ID_LINE, type: 'line', source: ID_SOURCE, layout: { 'line-join': 'round' }, paint: { 'line-color': ['coalesce', ['get', 'color'], COLOR_DEFECTO], 'line-width': 2, 'line-opacity': 0.85 } });
            mapa.addLayer({ id: ID_LABEL, type: 'symbol', source: ID_SOURCE, layout: { 'text-field': ['get', 'nombre'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-anchor': 'center' }, paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 } });

            // Marcas de los vendedores (solo lectura): PIN gota con punto blanco (color del estado),
            // igual que las marcas del vendedor. Sprite por tipo (la gota ya trae su sombra).
            mapa.addSource(ID_MARCAS_EQ, { type: 'geojson', data: marcasEqGeoJSON(marcasRef.current) });
            for (const [t, col] of Object.entries(COLOR_TIPO)) {
                const id = `marca-${t}`;
                if (!mapa.hasImage(id)) { const i = iconoPinMarca(col); mapa.addImage(id, i.data, { pixelRatio: i.ratio }); }
            }
            mapa.addLayer({
                id: ID_MARCAS_EQ_C, type: 'symbol', source: ID_MARCAS_EQ,
                layout: {
                    'icon-image': ['match', ['get', 'tipo'],
                        'visitado', 'marca-visitado', 'interesado', 'marca-interesado',
                        'cerrado', 'marca-cerrado', 'sin_interes', 'marca-sin_interes', 'marca-visitado'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-size': 1,
                },
            });

            // Negocios reales (solo lectura), debajo de las capas de dibujo. PIN gota con tienda blanca
            // (violeta = sin vendedor, teal = con vendedor), igual que el mapa del vendedor.
            mapa.addSource(ID_NEGOCIOS, { type: 'geojson', data: negociosGeoJSON(negociosRef.current) });
            if (!mapa.hasImage('negocio-sin')) { const i = iconoNegocio(COLOR_NEGOCIO.sinVendedor); mapa.addImage('negocio-sin', i.data, { pixelRatio: i.ratio }); }
            if (!mapa.hasImage('negocio-con')) { const i = iconoNegocio(COLOR_NEGOCIO.conVendedor); mapa.addImage('negocio-con', i.data, { pixelRatio: i.ratio }); }
            mapa.addLayer({
                id: ID_NEGOCIOS_C, type: 'symbol', source: ID_NEGOCIOS,
                layout: {
                    'icon-image': ['case', ['==', ['get', 'embajadorId'], ''], 'negocio-sin', 'negocio-con'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-size': 1,
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
            // El encuadre inicial lo hace el effect de zonas (pendienteEncuadrar arranca en true).
        });

        // Clic según la herramienta activa.
        mapa.on('click', (e) => {
            if (!modoDibujoRef.current) {
                // Modo VER: clic sobre un pin abre el detalle SOLO LECTURA (tarjeta sobre el mapa). Cierra
                // cualquier popup de hover (PC). Clic en vacío cierra el detalle.
                const idMarca = marcaEnEq(mapa, e.point);
                if (idMarca) {
                    const m = marcasRef.current.find((x) => x.id === idMarca);
                    if (m) {
                        setDetalle({ tipo: 'marca', estado: m.tipo, nota: m.nota ?? null, vendedor: m.vendedorNombre ?? null, fecha: m.createdAt });
                        // Pin HTML resaltado (crece + glow) ENCIMA del symbol pin, igual que el vendedor.
                        // pointer-events none → no bloquea el clic al mapa (el symbol pin sigue debajo).
                        const elPin = elementoPin(m.tipo);
                        elPin.style.pointerEvents = 'none';
                        aplicarResalte(elPin, true);
                        marcadorResalteRef.current?.remove();
                        marcadorResalteRef.current = new maplibregl.Marker({ element: elPin, anchor: 'bottom' }).setLngLat([m.lng, m.lat]).addTo(mapa);
                        centrarPinBajoEditor(mapa, [m.lng, m.lat], 200); // tarjeta de marca ~200px de alto
                    }
                    ocultarPopupEq(); popupNegRef.current?.remove();
                    return;
                }
                const neg = mapa.queryRenderedFeatures(e.point, { layers: [ID_NEGOCIOS_C] })[0];
                if (neg) {
                    const p = neg.properties as Record<string, string>;
                    const coords = (neg.geometry as { coordinates: [number, number] }).coordinates;
                    const asignado = !!p.embajadorId;
                    setDetalle({ tipo: 'negocio', nombre: p.nombre || 'Negocio', estado: p.estado || '', asignado, vendedor: p.vendedorNombre || null });
                    // Pin de negocio resaltado (crece + glow) ENCIMA del symbol pin, igual que las marcas.
                    const elPin = elementoPinNegocio(asignado ? COLOR_NEGOCIO.conVendedor : COLOR_NEGOCIO.sinVendedor);
                    elPin.style.pointerEvents = 'none';
                    aplicarResalte(elPin, true);
                    marcadorResalteRef.current?.remove();
                    marcadorResalteRef.current = new maplibregl.Marker({ element: elPin, anchor: 'bottom' }).setLngLat(coords).addTo(mapa);
                    centrarPinBajoEditor(mapa, coords, 145); // tarjeta de negocio ~145px de alto
                    ocultarPopupEq(); popupNegRef.current?.remove();
                    return;
                }
                setDetalle(null);
                marcadorResalteRef.current?.remove(); marcadorResalteRef.current = null;
                return;
            }
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
                // Sobre cualquier pin (marca o negocio) → manita pointer. Sin esto, el mousemove borraba
                // el pointer que el mouseenter de negocios ya había puesto.
                const sobreNeg = !id && mapa.queryRenderedFeatures(e.point, { layers: [ID_NEGOCIOS_C] }).length > 0;
                mapa.getCanvas().style.cursor = (id || sobreNeg) ? 'pointer' : '';
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

        // TÁCTIL (móvil): MapLibre NO emite mousedown/move/up con el dedo, así que el arrastre de vértices
        // (herramienta Mover) necesita los eventos touch. Replican exactamente la misma lógica.
        mapa.on('touchstart', (e) => {
            if (!modoDibujoRef.current || herramientaRef.current !== 'mover') return;
            const idx = indiceVerticeEn(mapa, e.point);
            if (idx < 0) return;
            dragRef.current = idx;
            mapa.dragPan.disable();
            e.preventDefault();
        });
        mapa.on('touchmove', (e) => {
            if (dragRef.current === null) return;
            const idx = dragRef.current;
            verticesRef.current = verticesRef.current.map((v, i) => (i === idx ? [e.lngLat.lng, e.lngLat.lat] : v));
            pintarDibujo(mapa);
            e.preventDefault();
        });
        mapa.on('touchend', () => {
            if (dragRef.current === null) return;
            const idx = dragRef.current;
            const v = verticesRef.current[idx];
            if (v) {
                const snapped = snapACalle(mapa, v[0], v[1]);
                verticesRef.current = verticesRef.current.map((vv, i) => (i === idx ? snapped : vv));
                pintarDibujo(mapa);
            }
            dragRef.current = null;
            if (herramientaRef.current === 'mano') mapa.dragPan.enable();
            else mapa.dragPan.disable();
        });

        mapa.on('mouseout', ocultarPopupEq);
        mapa.on('error', (ev) => { console.error('[MapaTerritorios] error de MapLibre:', ev.error); });

        // El contenedor cambia de alto cuando el header/nav del shell colapsan (modo mapa móvil) o al
        // rotar; MapLibre solo escucha el resize de la VENTANA, así que sin esto el canvas queda con el
        // tamaño viejo. DEBOUNCE: durante una transición animada NO redimensionamos en cada frame —cada
        // mapa.resize() limpia el canvas un instante (destello beige)—; el canvas conserva su último
        // render (el CSS lo estira al 100% para cubrir el hueco) y se actualiza UNA vez al asentarse.
        let tResize = 0;
        const ro = new ResizeObserver(() => {
            window.clearTimeout(tResize);
            tResize = window.setTimeout(() => mapa.resize(), 160);
        });
        ro.observe(contenedor);

        return () => { window.clearTimeout(tResize); ro.disconnect(); popupEqRef.current?.remove(); popupNegRef.current?.remove(); marcadorResalteRef.current?.remove(); mapa.remove(); mapaRef.current = null; };
    }, []);

    // ── Re-pintar zonas cuando cambian (encuadra SOLO al cargar / cambiar de ciudad) ─────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_SOURCE) as GeoJSONSource | undefined)?.setData(construirGeoJSON(zonas));
        if (modoDibujoRef.current) return;
        const bounds = calcularBounds(zonas);

        // Intro de cine (gerente, una sola vez): se ve México y vuela con zoom hasta sus zonas (su región).
        if (introAnimado && !introHechoRef.current && bounds) {
            introHechoRef.current = true;
            pendienteEncuadrarRef.current = false;
            yaEncuadroRef.current = true;
            const t = setTimeout(() => mapa.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 2600, essential: true }), 900);
            return () => clearTimeout(t);
        }

        // Reencuadrar solo si está pendiente (carga inicial o cambio de ciudad) — NO al guardar/editar.
        if (pendienteEncuadrarRef.current) {
            const dur = yaEncuadroRef.current ? 400 : 0;
            pendienteEncuadrarRef.current = false;
            yaEncuadroRef.current = true;
            if (bounds) mapa.fitBounds(bounds, { padding: 60, duration: dur, maxZoom: 14 });
            else if (centroRef.current) mapa.flyTo({ center: centroRef.current, zoom: 12, duration: dur });
        }
    }, [zonas, listo, introAnimado]);

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
            const editar = poligonoEditandoRef.current;
            if (editar && editar.coordinates?.[0]?.length) {
                // Editar una zona: precargar su contorno (sin el punto de cierre duplicado) y arrancar en "Mover".
                const anillo = editar.coordinates[0].slice();
                if (anillo.length > 1) {
                    const a = anillo[0], b = anillo[anillo.length - 1];
                    if (a[0] === b[0] && a[1] === b[1]) anillo.pop();
                }
                verticesRef.current = anillo.map((c) => [c[0], c[1]] as [number, number]);
                setNumVertices(verticesRef.current.length);
                pintarDibujo(mapa);
                setHerramienta('mover');
                herramientaRef.current = 'mover';
                mapa.dragPan.disable();
                mapa.getCanvas().style.cursor = '';
            } else {
                setHerramienta('crear');
                herramientaRef.current = 'crear';
                mapa.dragPan.disable(); // las herramientas mandan; el pan solo en la "Mano"
                mapa.getCanvas().style.cursor = 'crosshair';
            }
        } else {
            mapa.dragPan.enable();
            mapa.getCanvas().style.cursor = '';
            limpiarDibujo();
        }
    }, [modoDibujo, listo]);

    // ── Preview del polígono terminado pero sin guardar (mientras está abierto el form) ──────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo || modoDibujo) return; // en modo dibujo manda el editor
        const src = mapa.getSource(ID_DIBUJO) as GeoJSONSource | undefined;
        const srcPts = mapa.getSource(ID_DIBUJO_PTS) as GeoJSONSource | undefined;
        if (poligonoPreview) {
            src?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: poligonoPreview, properties: {} }] });
            srcPts?.setData({ type: 'FeatureCollection', features: [] });
        } else {
            src?.setData({ type: 'FeatureCollection', features: [] });
            srcPts?.setData({ type: 'FeatureCollection', features: [] });
        }
    }, [poligonoPreview, modoDibujo, listo]);

    // ── Volar (zoom cine) a una zona cuando se hace clic en ella en la lista ─────────────────────
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo || !enfocarNonce || !enfocarPoligonoRef.current) return;
        const b = boundsDePoligono(enfocarPoligonoRef.current);
        if (b) mapa.fitBounds(b, { padding: 60, maxZoom: 15, duration: 1400, essential: true });
    }, [enfocarNonce, listo]);

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

    // Baja los controles de zoom/centrar (arriba-derecha) cuando algo arriba podría taparlos: en modo
    // dibujo, la barra de herramientas; en mapa FIJO con el header del shell asomado (hoja expandida),
    // el header. Se anima junto con esas transiciones.
    useEffect(() => {
        const grupo = mapaRef.current?.getContainer().querySelector('.maplibregl-ctrl-top-right') as HTMLElement | null;
        if (!grupo) return;
        grupo.style.transition = 'margin-top 0.3s ease-out';
        const off = modoDibujo ? 66 : (mapaFijo && headerVisible ? 64 : 0);
        grupo.style.marginTop = off ? `${off}px` : '';
    }, [modoDibujo, mapaFijo, headerVisible, listo]);

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
        <Tooltip text={texto} position="bottom">
            <button
                type="button"
                data-testid={`dibujo-herr-${h}`}
                onClick={() => setHerramienta(h)}
                aria-label={texto}
                className={`grid h-[52px] w-[52px] place-items-center rounded-full border shadow-tarjeta-panel transition ${herramienta === h ? 'border-marca bg-marca text-white' : 'border-borde bg-superficie text-texto-2 hover:bg-superficie-2'}`}
            >
                <Icono size={22} />
            </button>
        </Tooltip>
    );

    // Tarjeta de detalle SOLO LECTURA de un pin. Si el mapa es FIJO (móvil vertical) se PORTA a body para
    // escapar del stacking del wrapper `fixed` (si no, quedaría debajo de la barra de ciudad).
    const tarjetaDetalle = detalle && !modoDibujo ? (
        <div className={`${mapaFijo ? 'fixed z-[60]' : 'absolute z-30'} left-1/2 top-3 w-[min(380px,calc(100%-1.5rem))] -translate-x-1/2 rounded-[14px] border border-borde bg-superficie p-3.5 shadow-tarjeta-panel`} data-testid="detalle-pin">
            <button type="button" onClick={cerrarDetalle} aria-label="Cerrar" className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-texto-3 transition hover:bg-superficie-2">
                <X size={18} />
            </button>
            {detalle.tipo === 'marca' ? (
                <>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ backgroundColor: `${COLOR_TIPO[detalle.estado]}1f`, color: COLOR_TIPO[detalle.estado] }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_TIPO[detalle.estado] }} />
                        {ETIQUETA_TIPO[detalle.estado]}
                    </span>
                    <div className="mt-3 rounded-[10px] bg-superficie-2 px-3 py-2.5">
                        {detalle.nota
                            ? <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-texto-2">{detalle.nota}</p>
                            : <p className="text-[13px] italic text-texto-3">Sin nota</p>}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 border-t border-borde pt-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-texto-3">Vendedor</span>
                            <span className="truncate font-medium text-texto">{detalle.vendedor ?? '—'}</span>
                        </div>
                        {detalle.fecha && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-texto-3">Marcado</span>
                                <span className="text-texto-2">{fechaCorta(detalle.fecha)}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 pr-7">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: detalle.asignado ? COLOR_NEGOCIO.conVendedor : COLOR_NEGOCIO.sinVendedor }} />
                        <h3 className="truncate text-[15px] font-semibold text-texto">{detalle.nombre}</h3>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {(() => { const e = ESTADO_BADGE[detalle.estado] ?? { fg: '#475569', bg: '#e2e8f0', label: detalle.estado || '—' };
                            return <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: e.bg, color: e.fg }}>{e.label}</span>; })()}
                        {detalle.asignado
                            ? <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: '#cffafe', color: '#0e7490' }}>Asignado</span>
                            : <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>Oportunidad</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-borde pt-2.5 text-[13px]">
                        <span className="text-texto-3">Vendedor</span>
                        <span className="truncate font-medium text-texto">{detalle.vendedor ?? '—'}</span>
                    </div>
                </>
            )}
        </div>
    ) : null;

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde">
            {/* Fondo = color del mapa (liberty es beige claro): si el canvas WebGL se limpia un
                instante al redimensionarse (subir/bajar la hoja, rotar), NO destella en blanco. */}
            <div ref={contenedorRef} className="h-full w-full bg-[#f8f4f0]" data-testid="territorios-mapa" />

            {cargando && !error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/70 text-[13px] text-texto-3">Cargando mapa…</div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-superficie/90 px-6 text-center text-[13px] text-peligro">{error}</div>
            )}
            {listo && !error && !modoDibujo && !poligonoPreview && zonas.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-borde bg-superficie/95 px-3 py-1.5 text-[12px] text-texto-3 shadow-pop-panel">
                    Aún no hay zonas dibujadas en este mapa.
                </div>
            )}

            {/* Detalle SOLO LECTURA de un pin: inline (escritorio/horizontal) o portado a body (mapa fijo). */}
            {!mapaFijo && tarjetaDetalle}
            {mapaFijo && tarjetaDetalle && createPortal(tarjetaDetalle, document.body)}

            {/* Herramientas de dibujo: botones FLOTANTES individuales (sin contenedor/píldora), arriba
                a la izquierda (zona visible del mapa en los tres layouts). */}
            {modoDibujo && (
                <div className="absolute inset-x-0 top-3 z-20 mx-auto flex w-fit max-w-[95%] flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        {botonHerr('crear', Pencil, 'Agregar')}
                        {botonHerr('mover', Move, 'Mover')}
                        {botonHerr('borrar', Trash2, 'Quitar')}
                        {botonHerr('mano', Hand, 'Mapa')}
                        <Tooltip text="Deshacer punto" position="bottom">
                            <button type="button" data-testid="dibujo-deshacer" onClick={deshacer} disabled={numVertices === 0} aria-label="Deshacer punto" className="grid h-[52px] w-[52px] place-items-center rounded-full border border-borde bg-superficie text-texto-2 shadow-tarjeta-panel transition hover:bg-superficie-2 disabled:opacity-40">
                                <Undo2 size={21} />
                            </button>
                        </Tooltip>
                        <Tooltip text="Terminar zona" position="bottom">
                            <button type="button" data-testid="dibujo-terminar" onClick={terminar} disabled={numVertices < 3} aria-label="Terminar zona" className="grid h-[52px] w-[52px] place-items-center rounded-full bg-ok text-white shadow-tarjeta-panel transition hover:opacity-90 disabled:opacity-40">
                                <Check size={23} />
                            </button>
                        </Tooltip>
                    </div>
                    <span className="rounded-full border border-borde bg-superficie/95 px-2.5 py-1 text-[11.5px] text-texto-3 shadow-pop-panel">
                        {herramienta === 'crear'
                            ? (numVertices < 3 ? `Clic en las esquinas (${numVertices}/3)` : `${numVertices} puntos`)
                            : herramienta === 'mover' ? 'Arrastra un punto'
                            : herramienta === 'borrar' ? 'Clic en un punto para quitarlo'
                            : 'Arrastra para mover el mapa'}
                    </span>
                </div>
            )}
        </div>
    );
}

export default MapaTerritorios;
