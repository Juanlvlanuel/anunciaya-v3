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
import type { ZonaTerritorio, MarcaTerritorio, TipoMarca, NegocioMapa } from '../../services/territoriosService';
import { toast } from '../../stores/useToastPanel';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_ZONA = 'mi-zona';
const ID_ZONA_LINE = 'mi-zona-line';
const ID_MASCARA = 'mascara';
const ID_MASCARA_FILL = 'mascara-fill';
const ID_MARCAS = 'marcas';
const ID_MARCAS_SOMBRA = 'marcas-sombra';
const ID_MARCAS_C = 'marcas-circle';
const ID_NEGOCIOS = 'negocios';
const ID_NEGOCIOS_C = 'negocios-circle';

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

/** Una "píldora" de color para los popups (texto fg sobre fondo bg). */
export function badgeHtml(label: string, fg: string, bg: string): string {
    return `<span style="display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;line-height:1.5;padding:1px 8px;border-radius:999px;background:${bg};color:${fg};white-space:nowrap;">${escaparHtml(label)}</span>`;
}

/** Encabezado del popup: punto de color (con halo) + título en negrita. `redondo` = pin de marca; si no, negocio. */
export function tituloPopup(color: string, texto: string, redondo: boolean): string {
    return `<div style="display:flex;align-items:center;gap:8px;">`
        + `<span style="width:9px;height:9px;border-radius:${redondo ? '9999px' : '3px'};background:${color};box-shadow:0 0 0 3px ${color}1f;flex-shrink:0;"></span>`
        + `<span style="font-weight:650;font-size:13px;color:#0f172a;line-height:1.2;">${escaparHtml(texto)}</span></div>`;
}

/** Fecha corta legible (es-MX) o '' si no hay. */
export function fechaCorta(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}

/** Color de la píldora del estado de membresía de un negocio. */
const ESTADO_BADGE: Record<string, { fg: string; bg: string; label: string }> = {
    al_corriente: { fg: '#15803d', bg: '#dcfce7', label: 'Al corriente' },
    en_gracia: { fg: '#b45309', bg: '#fef3c7', label: 'En gracia' },
    suspendido: { fg: '#b91c1c', bg: '#fee2e2', label: 'Suspendido' },
    cancelado: { fg: '#475569', bg: '#e2e8f0', label: 'Cancelado' },
};

/** HTML del popup de hover de una marca: estado como TÍTULO (punto + estado en negrita) + nota + fecha. */
function contenidoPopup(m: MarcaTerritorio): string {
    const nota = m.nota?.trim();
    const cuerpo = nota
        ? `<div style="font-size:11.5px;line-height:1.45;color:#475569;white-space:pre-wrap;word-break:break-word;">${escaparHtml(nota)}</div>`
        : `<div style="font-size:11px;color:#94a3b8;font-style:italic;">Sin nota</div>`;
    const fecha = fechaCorta(m.createdAt);
    const filaFecha = fecha ? `<div style="font-size:10.5px;color:#94a3b8;">Marcado el ${fecha}</div>` : '';
    return `<div style="display:flex;flex-direction:column;gap:6px;min-width:135px;max-width:230px;">`
        + tituloPopup(COLOR_TIPO[m.tipo], ETIQUETA_TIPO[m.tipo], true)
        + cuerpo + filaFecha + `</div>`;
}

/** Color del pin de negocio según atribución (compartido con el mapa admin). */
export const COLOR_NEGOCIO = {
    sinVendedor: '#7c3aed', // violeta = oportunidad (sin vendedor)
    conVendedor: '#0891b2', // teal = ya captado (con vendedor)
};
/** GeoJSON de los negocios (datos del pin en properties; embajadorId '' = sin vendedor). */
export function negociosGeoJSON(negocios: NegocioMapa[]) {
    return {
        type: 'FeatureCollection' as const,
        features: negocios.map((n) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
            properties: { id: n.id, nombre: n.nombre, estado: n.estado, embajadorId: n.embajadorId ?? '', vendedorNombre: n.vendedorNombre ?? '' },
        })),
    };
}

/** HTML del popup de hover de un negocio: nombre + píldoras (estado + atribución) + vendedor. */
export function contenidoPopupNegocio(props: { nombre?: string; estado?: string; embajadorId?: string; vendedorNombre?: string }): string {
    const conVendedor = !!props.embajadorId;
    const punto = conVendedor ? COLOR_NEGOCIO.conVendedor : COLOR_NEGOCIO.sinVendedor;
    const est = ESTADO_BADGE[props.estado ?? ''] ?? { fg: '#475569', bg: '#e2e8f0', label: props.estado || '—' };
    const atrib = conVendedor ? badgeHtml('Asignado', '#0e7490', '#cffafe') : badgeHtml('Oportunidad', '#6d28d9', '#ede9fe');
    const vendedorLinea = conVendedor
        ? `<div style="font-size:11px;color:#64748b;line-height:1.3;">Vendedor: <span style="color:#334155;font-weight:600;">${escaparHtml(props.vendedorNombre || '—')}</span></div>`
        : '';
    return `<div style="display:flex;flex-direction:column;gap:7px;min-width:160px;max-width:240px;">`
        + tituloPopup(punto, props.nombre || 'Negocio', false)
        + `<div style="display:flex;flex-wrap:wrap;gap:5px;">${badgeHtml(est.label, est.fg, est.bg)}${atrib}</div>`
        + vendedorLinea
        + `</div>`;
}

interface MapaMarcasProps {
    zonas: ZonaTerritorio[];
    marcas: MarcaTerritorio[];
    negocios?: NegocioMapa[];
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

export function MapaMarcas({ zonas, marcas, negocios = [], modoAgregar = false, onAgregarMarca, onClicMarca, onMoverMarca }: MapaMarcasProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const marcasRef = useRef<MarcaTerritorio[]>(marcas);
    const zonasRef = useRef<ZonaTerritorio[]>(zonas);
    const negociosRef = useRef<NegocioMapa[]>(negocios);
    const modoAgregarRef = useRef(modoAgregar);
    const onAgregarRef = useRef(onAgregarMarca);
    const onClicRef = useRef(onClicMarca);
    const onMoverRef = useRef(onMoverMarca);
    const dragRef = useRef<{ id: string | null; movido: boolean }>({ id: null, movido: false });
    const suprimirClickRef = useRef(false);
    const ajustadoRef = useRef(false);
    const popupNegRef = useRef<maplibregl.Popup | null>(null);
    const [cargando, setCargando] = useState(true);
    const [listo, setListo] = useState(false);

    useEffect(() => { marcasRef.current = marcas; }, [marcas]);
    useEffect(() => { zonasRef.current = zonas; }, [zonas]);
    useEffect(() => { negociosRef.current = negocios; }, [negocios]);
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
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '240px', className: 'popup-territorio' });
        let popupHoverId: string | null = null;
        const ocultarPopup = () => { if (popupHoverId) { popup.remove(); popupHoverId = null; } };
        // Popup de hover de los negocios (capa de solo lectura).
        const popupNeg = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '250px', className: 'popup-territorio' });
        popupNegRef.current = popupNeg;

        mapa.on('load', () => {
            // Máscara que oscurece el exterior (se enciende al aterrizar). Va primero: debajo de la zona y los pines.
            mapa.addSource(ID_MASCARA, { type: 'geojson', data: mascaraGeoJSON(zonas) });
            mapa.addLayer({ id: ID_MASCARA_FILL, type: 'fill', source: ID_MASCARA, paint: { 'fill-color': '#0f172a', 'fill-opacity': 0 } });
            // Zona del vendedor.
            mapa.addSource(ID_ZONA, { type: 'geojson', data: zonasGeoJSON(zonas) });
            mapa.addLayer({ id: ID_ZONA, type: 'fill', source: ID_ZONA, paint: { 'fill-color': ['coalesce', ['get', 'color'], '#2563eb'], 'fill-opacity': 0.06 } });
            mapa.addLayer({ id: ID_ZONA_LINE, type: 'line', source: ID_ZONA, paint: { 'line-color': ['coalesce', ['get', 'color'], '#2563eb'], 'line-width': 2.5, 'line-opacity': 0.9 } });
            // Negocios reales (contexto, solo lectura), debajo de las marcas del vendedor.
            mapa.addSource(ID_NEGOCIOS, { type: 'geojson', data: negociosGeoJSON(negociosRef.current) });
            mapa.addLayer({
                id: ID_NEGOCIOS_C,
                type: 'circle',
                source: ID_NEGOCIOS,
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#ffffff',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': ['case', ['==', ['get', 'embajadorId'], ''], COLOR_NEGOCIO.sinVendedor, COLOR_NEGOCIO.conVendedor],
                },
            });
            mapa.on('mouseenter', ID_NEGOCIOS_C, (e) => {
                if (modoAgregarRef.current || dragRef.current.id) return;
                const f = e.features?.[0];
                if (!f) return;
                mapa.getCanvas().style.cursor = 'pointer';
                const coords = (f.geometry as { coordinates: [number, number] }).coordinates;
                popupNeg.setLngLat(coords).setHTML(contenidoPopupNegocio(f.properties as Record<string, string>)).addTo(mapa);
            });
            mapa.on('mouseleave', ID_NEGOCIOS_C, () => { mapa.getCanvas().style.cursor = ''; popupNeg.remove(); });
            // Marcas (pines de color por estado), encima de los negocios. Sombra de elevación + disco con borde.
            mapa.addSource(ID_MARCAS, { type: 'geojson', data: marcasGeoJSON(marcas) });
            mapa.addLayer({
                id: ID_MARCAS_SOMBRA, type: 'circle', source: ID_MARCAS,
                paint: { 'circle-radius': 9, 'circle-color': '#0f172a', 'circle-opacity': 0.18, 'circle-blur': 0.6, 'circle-translate': [0, 1.5] },
            });
            mapa.addLayer({
                id: ID_MARCAS_C,
                type: 'circle',
                source: ID_MARCAS,
                paint: {
                    'circle-radius': 7.5,
                    'circle-color': ['match', ['get', 'tipo'], 'visitado', COLOR_TIPO.visitado, 'interesado', COLOR_TIPO.interesado, 'cerrado', COLOR_TIPO.cerrado, 'sin_interes', COLOR_TIPO.sin_interes, COLOR_TIPO.visitado],
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2.5,
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

        return () => { popup.remove(); popupNeg.remove(); mapa.remove(); mapaRef.current = null; };
    }, []);

    // Re-pintar zona/marcas/negocios cuando cambian.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_ZONA) as GeoJSONSource | undefined)?.setData(zonasGeoJSON(zonas));
        (mapa.getSource(ID_MASCARA) as GeoJSONSource | undefined)?.setData(mascaraGeoJSON(zonas));
        (mapa.getSource(ID_MARCAS) as GeoJSONSource | undefined)?.setData(marcasGeoJSON(marcas));
        (mapa.getSource(ID_NEGOCIOS) as GeoJSONSource | undefined)?.setData(negociosGeoJSON(negocios));
    }, [zonas, marcas, negocios, listo]);

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
