/**
 * MapaMarcas.tsx
 * ==============
 * Mapa de la vista del VENDEDOR ("Mi territorio", Territorios · G.2). Resalta su zona asignada:
 * el resto del mapa se OSCURECE con una capa-máscara semi-oscura (se sigue viendo, pero apagado) y
 * el paneo se limita a su zona; la zona queda con el mapa al 100%. Encima van sus MARCAS como PINES
 * (maplibregl.Marker arrastrables: en táctil se mueven con click sostenido). En modo "agregar", un
 * clic crea una marca; si no, un clic sobre un pin lo selecciona. Crear/mover fuera de la zona está
 * bloqueado. Intro: vuela desde México completo hasta la zona y ahí enciende la máscara. Un control
 * "Centrar mi zona" (bajo el zoom) reencuadra la zona en pantalla.
 *
 * Ubicación: apps/admin/src/components/territorios/MapaMarcas.tsx
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapaLibre, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ZonaTerritorio, MarcaTerritorio, TipoMarca, NegocioMapa } from '../../services/territoriosService';
import { toast } from '../../stores/useToastPanel';
import { useScrollPanel } from '../../stores/useScrollPanel';

const ESTILO_TILES = 'https://tiles.openfreemap.org/styles/liberty';
const CENTRO_MX: [number, number] = [-102.5, 23.6];
const ID_ZONA = 'mi-zona';
const ID_ZONA_LINE = 'mi-zona-line';
const ID_MASCARA = 'mascara';
const ID_MASCARA_FILL = 'mascara-fill';
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

/** Una "píldora" de color para los popups (texto fg sobre fondo bg). `grande` = popup de negocio. */
export function badgeHtml(label: string, fg: string, bg: string, grande = false): string {
    const fs = grande ? '12px' : '10.5px';
    const pad = grande ? '2px 10px' : '1px 8px';
    return `<span style="display:inline-flex;align-items:center;font-size:${fs};font-weight:600;line-height:1.5;padding:${pad};border-radius:999px;background:${bg};color:${fg};white-space:nowrap;">${escaparHtml(label)}</span>`;
}

/** Encabezado del popup: punto de color (con halo) + título en negrita. `redondo` = pin de marca; si no,
 *  negocio. `grande` = popup de negocio (texto y punto más grandes). */
export function tituloPopup(color: string, texto: string, redondo: boolean, grande = false): string {
    const punto = grande ? '11px' : '9px';
    const fs = grande ? '15px' : '13px';
    return `<div style="display:flex;align-items:center;gap:8px;">`
        + `<span style="width:${punto};height:${punto};border-radius:${redondo ? '9999px' : '3px'};background:${color};box-shadow:0 0 0 3px ${color}1f;flex-shrink:0;"></span>`
        + `<span style="font-weight:650;font-size:${fs};color:#0f172a;line-height:1.2;">${escaparHtml(texto)}</span></div>`;
}

/** Fecha corta legible (es-MX) o '' si no hay. */
export function fechaCorta(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}

/** Color de la píldora del estado de membresía de un negocio. */
export const ESTADO_BADGE: Record<string, { fg: string; bg: string; label: string }> = {
    al_corriente: { fg: '#15803d', bg: '#dcfce7', label: 'Al corriente' },
    en_gracia: { fg: '#b45309', bg: '#fef3c7', label: 'En gracia' },
    suspendido: { fg: '#b91c1c', bg: '#fee2e2', label: 'Suspendido' },
    cancelado: { fg: '#475569', bg: '#e2e8f0', label: 'Cancelado' },
};

/** Offset por dirección de los popups: el pin se ancla en su PUNTA (icon-anchor bottom). Arriba sube
 *  sobre el pin (-34 = alto); a los lados sube hasta la CABEZA (-21) para que el popup apunte centrado
 *  al pin y no a la punta (si no, los popups laterales salen desfasados hacia abajo). Mismo pin en
 *  marcas y negocios → mismo offset. */
export const OFFSET_PIN: maplibregl.Offset = {
    top: [0, 12], 'top-left': [0, 12], 'top-right': [0, 12],
    bottom: [0, -34], 'bottom-left': [0, -34], 'bottom-right': [0, -34],
    left: [14, -21], right: [-14, -21], center: [0, -21],
};

/** HTML del popup de hover de una marca: estado como TÍTULO + nota + fecha. */
function contenidoPopup(m: MarcaTerritorio): string {
    const nota = m.nota?.trim();
    const cuerpo = nota
        ? `<div style="font-size:14px;line-height:1.5;color:#475569;white-space:pre-wrap;word-break:break-word;">${escaparHtml(nota)}</div>`
        : `<div style="font-size:13.5px;color:#94a3b8;font-style:italic;">Sin nota</div>`;
    const fecha = fechaCorta(m.createdAt);
    const filaFecha = fecha ? `<div style="font-size:13px;color:#94a3b8;">Marcado el ${fecha}</div>` : '';
    return `<div style="display:flex;flex-direction:column;gap:9px;min-width:210px;max-width:300px;">`
        + tituloPopup(COLOR_TIPO[m.tipo], ETIQUETA_TIPO[m.tipo], true, true)
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
        // Descarta negocios sin ubicación (lng/lat null): un Point con coordenada null hace que
        // MapLibre lance "Expected value to be of type number, but found null" en el worker.
        features: negocios
            .filter((n) => Number.isFinite(n.lng) && Number.isFinite(n.lat))
            .map((n) => ({
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
    const atrib = conVendedor ? badgeHtml('Asignado', '#0e7490', '#cffafe', true) : badgeHtml('Oportunidad', '#6d28d9', '#ede9fe', true);
    const vendedorLinea = conVendedor
        ? `<div style="font-size:13px;color:#64748b;line-height:1.3;">Vendedor: <span style="color:#334155;font-weight:600;">${escaparHtml(props.vendedorNombre || '—')}</span></div>`
        : '';
    return `<div style="display:flex;flex-direction:column;gap:9px;min-width:210px;max-width:300px;">`
        + tituloPopup(punto, props.nombre || 'Negocio', false, true)
        + `<div style="display:flex;flex-wrap:wrap;gap:6px;">${badgeHtml(est.label, est.fg, est.bg, true)}${atrib}</div>`
        + vendedorLinea
        + `</div>`;
}

/** SVG de un pin (gota) del color dado, con borde blanco y punto central. Sombra de elevación. */
function svgPin(color: string): string {
    return `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 2px rgba(15,23,42,0.32));">`
        + `<path d="M13 0C5.82 0 0 5.82 0 13c0 9.4 13 21 13 21s13-11.6 13-21C26 5.82 20.18 0 13 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
        + `<circle cx="13" cy="13" r="4.5" fill="#ffffff"/></svg>`;
}
/** Elemento HTML de un pin: el wrapper es el element del Marker (MapLibre lo posiciona con su propio
 *  transform → NO tocarlo); el INNER es el que escalamos al resaltar. anchor 'bottom' = la punta marca. */
export function elementoPin(tipo: TipoMarca): HTMLDivElement {
    const el = document.createElement('div');
    el.dataset.tipo = tipo;
    el.style.cursor = 'pointer';
    const inner = document.createElement('div');
    inner.style.transformOrigin = 'bottom center';
    inner.style.transition = 'transform 0.15s ease';
    inner.innerHTML = svgPin(COLOR_TIPO[tipo]);
    el.appendChild(inner);
    return el;
}
/** SVG de un pin de NEGOCIO (gota + tienda blanca), mismo perfil que el sprite del mapa. */
function svgPinNegocio(color: string): string {
    const cx = 13, cy = 12.5;
    return `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 2px rgba(15,23,42,0.32));">`
        + `<path d="M13 0C5.82 0 0 5.82 0 13c0 9.4 13 21 13 21s13-11.6 13-21C26 5.82 20.18 0 13 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
        + `<path d="M${cx - 5} ${cy} L${cx - 5.5} ${cy - 3.4} L${cx + 5.5} ${cy - 3.4} L${cx + 5} ${cy} M${cx - 4} ${cy} L${cx - 4} ${cy + 4.6} L${cx + 4} ${cy + 4.6} L${cx + 4} ${cy}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`
        + `</svg>`;
}
/** Elemento HTML de un pin de negocio (para resaltarlo igual que las marcas). */
export function elementoPinNegocio(color: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cursor = 'pointer';
    const inner = document.createElement('div');
    inner.style.transformOrigin = 'bottom center';
    inner.style.transition = 'transform 0.15s ease';
    inner.innerHTML = svgPinNegocio(color);
    el.appendChild(inner);
    return el;
}
/** Recolorea el pin si cambió su estado (sin recrear el elemento). */
function actualizarColorPin(el: HTMLElement, tipo: TipoMarca): void {
    if (el.dataset.tipo === tipo) return;
    el.dataset.tipo = tipo;
    el.querySelector('path')?.setAttribute('fill', COLOR_TIPO[tipo]);
}
/** Ícono de un negocio para el sprite del mapa: un PIN (gota, mismo perfil que las marcas) del color
 *  de atribución, con el ícono de tienda blanco DENTRO en vez del punto. Renderizado a 2x (retina). */
export function iconoNegocio(color: string): { data: ImageData; ratio: number } {
    const escala = 2, w = 26, h = 34, cw = w * escala, ch = h * escala;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    if (!ctx) return { data: new ImageData(cw, ch), ratio: escala };
    ctx.scale(escala, escala);
    // Gota (mismo perfil que el pin de las marcas).
    const gota = new Path2D('M13 0C5.82 0 0 5.82 0 13c0 9.4 13 21 13 21s13-11.6 13-21C26 5.82 20.18 0 13 0z');
    ctx.shadowColor = 'rgba(15,23,42,0.32)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 2;
    ctx.fillStyle = color; ctx.fill(gota);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(gota);
    // Tienda blanca dentro (centrada en la "cabeza" de la gota).
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5;
    const cx = 13, cy = 12.5;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 5.5, cy - 3.4); ctx.lineTo(cx + 5.5, cy - 3.4); ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx - 4, cy + 4.6); ctx.lineTo(cx + 4, cy + 4.6); ctx.lineTo(cx + 4, cy);
    ctx.stroke();
    return { data: ctx.getImageData(0, 0, cw, ch), ratio: escala };
}

/** Ícono de un PIN de marca para el sprite del mapa: la misma gota que las marcas del vendedor (color
 *  del estado) con un punto blanco en la cabeza. Para mapas de solo lectura (gerente). 2x retina. */
export function iconoPinMarca(color: string): { data: ImageData; ratio: number } {
    const escala = 2, w = 26, h = 34, cw = w * escala, ch = h * escala;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    if (!ctx) return { data: new ImageData(cw, ch), ratio: escala };
    ctx.scale(escala, escala);
    const gota = new Path2D('M13 0C5.82 0 0 5.82 0 13c0 9.4 13 21 13 21s13-11.6 13-21C26 5.82 20.18 0 13 0z');
    ctx.shadowColor = 'rgba(15,23,42,0.32)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 2;
    ctx.fillStyle = color; ctx.fill(gota);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(gota);
    // Punto blanco (cabeza), igual que svgPin (cx=13, cy=13, r=4.5).
    ctx.beginPath(); ctx.arc(13, 13, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    return { data: ctx.getImageData(0, 0, cw, ch), ratio: escala };
}

/** Resalta (agranda) el pin seleccionado para diferenciarlo del resto. */
export function aplicarResalte(el: HTMLElement, seleccionado: boolean): void {
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    inner.style.transform = seleccionado ? 'scale(1.45)' : 'scale(1)';
    // Glow alrededor del pin (resalta su CONTORNO) cuando está seleccionado.
    inner.style.filter = seleccionado ? 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 7px rgba(37,99,235,0.95))' : '';
}

interface MapaMarcasProps {
    zonas: ZonaTerritorio[];
    marcas: MarcaTerritorio[];
    negocios?: NegocioMapa[];
    modoAgregar?: boolean;
    onAgregarMarca?: (lat: number, lng: number) => void;
    onClicMarca?: (id: string) => void;
    onMoverMarca?: (id: string, lat: number, lng: number) => void;
    /** Id de la marca con el editor abierto: se resalta (agranda). */
    marcaSeleccionadaId?: string | null;
    mapaFijo?: boolean; // el mapa va `fixed` al viewport (móvil vertical) → baja el zoom cuando el header asoma
    enfocarMarca?: [number, number] | null; // [lng,lat] a centrar (botón "ver en el mapa", sin abrir editor)
    enfocarNonce?: number;                   // al cambiar, vuela (centra) a `enfocarMarca`
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

/** Easing cinematográfico (ease-in-out cubic): arranca y termina suave, acelera en medio. */
const EASING_CINE = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Coloca el pin en la franja inferior (debajo del editor/tarjeta centrada) SOLO desplazando el mapa:
 *  mantiene el zoom actual. `altoForm` = alto aprox del modal (el editor del vendedor ~290; la tarjeta
 *  de solo lectura del gerente es más corta → se pasa menor para que el pin no quede muy separado). */
export function centrarPinBajoEditor(mapa: MapaLibre, coords: [number, number], altoForm = 330): void {
    const topForm = 12;     // el modal va en top-3 (~12px desde el tope del mapa)
    const esEscritorio = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    const separacion = esEscritorio ? 30 : 42; // aire entre el modal y el pin (justo debajo)
    // La punta del pin queda a (topForm + altoForm + separacion) desde el tope; el offset de easeTo es
    // relativo al centro del contenedor (offset>0 = más abajo). SIN zoom → easeTo solo hace pan.
    const alto = mapa.getContainer().offsetHeight || 0;
    const offsetY = (topForm + altoForm + separacion) - alto / 2;
    mapa.easeTo({ center: coords, offset: [0, offsetY], duration: 700, easing: EASING_CINE, essential: true });
}

export function MapaMarcas({ zonas, marcas, negocios = [], modoAgregar = false, onAgregarMarca, onClicMarca, onMoverMarca, marcaSeleccionadaId = null, mapaFijo = false, enfocarMarca = null, enfocarNonce = 0 }: MapaMarcasProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const mapaRef = useRef<MapaLibre | null>(null);
    const marcasRef = useRef<MarcaTerritorio[]>(marcas);
    const zonasRef = useRef<ZonaTerritorio[]>(zonas);
    const negociosRef = useRef<NegocioMapa[]>(negocios);
    const modoAgregarRef = useRef(modoAgregar);
    const onAgregarRef = useRef(onAgregarMarca);
    const onClicRef = useRef(onClicMarca);
    const onMoverRef = useRef(onMoverMarca);
    const ajustadoRef = useRef(false);
    const popupNegRef = useRef<maplibregl.Popup | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const marcaSeleccionadaRef = useRef<string | null>(marcaSeleccionadaId);
    const [cargando, setCargando] = useState(true);
    const [listo, setListo] = useState(false);
    const headerVisible = useScrollPanel((s) => s.headerVisible); // mapa fijo: baja el zoom cuando el header asoma
    const enfocarMarcaRef = useRef(enfocarMarca);
    useEffect(() => { enfocarMarcaRef.current = enfocarMarca; }, [enfocarMarca]);

    useEffect(() => { marcasRef.current = marcas; }, [marcas]);
    // Resalta el pin con el editor abierto (y quita el resalte de los demás).
    useEffect(() => {
        marcaSeleccionadaRef.current = marcaSeleccionadaId;
        for (const [id, mk] of markersRef.current) aplicarResalte(mk.getElement(), id === marcaSeleccionadaId);
    }, [marcaSeleccionadaId]);
    useEffect(() => { zonasRef.current = zonas; }, [zonas]);
    useEffect(() => { negociosRef.current = negocios; }, [negocios]);
    useEffect(() => { onAgregarRef.current = onAgregarMarca; }, [onAgregarMarca]);
    useEffect(() => { onClicRef.current = onClicMarca; }, [onClicMarca]);
    useEffect(() => { onMoverRef.current = onMoverMarca; }, [onMoverMarca]);

    /** Crea/actualiza/elimina los pines (maplibregl.Marker) según las marcas actuales. */
    function sincronizarMarcas() {
        const mapa = mapaRef.current;
        const popup = popupRef.current;
        if (!mapa) return;
        const markers = markersRef.current;
        const ids = new Set(marcasRef.current.map((m) => m.id));
        // Quita los pines de marcas que ya no están.
        for (const [id, mk] of markers) {
            if (!ids.has(id)) { mk.remove(); markers.delete(id); }
        }
        for (const m of marcasRef.current) {
            const existente = markers.get(m.id);
            if (existente) {
                existente.setLngLat([m.lng, m.lat]);
                actualizarColorPin(existente.getElement(), m.tipo);
                aplicarResalte(existente.getElement(), m.id === marcaSeleccionadaRef.current);
                continue;
            }
            const el = elementoPin(m.tipo);
            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true });
            marker.setLngLat([m.lng, m.lat]).addTo(mapa);
            const idMarca = m.id;
            let recienArrastrado = false;
            marker.on('dragstart', () => popup?.remove());
            marker.on('dragend', () => {
                const ll = marker.getLngLat();
                recienArrastrado = true;
                window.setTimeout(() => { recienArrastrado = false; }, 250);
                if (dentroDeZona(ll.lng, ll.lat, zonasRef.current)) {
                    onMoverRef.current?.(idMarca, ll.lat, ll.lng);
                    // Si este pin tiene el editor abierto, re-centra el mapa a su nueva ubicación.
                    if (marcaSeleccionadaRef.current === idMarca) centrarPinBajoEditor(mapa, [ll.lng, ll.lat]);
                } else {
                    const orig = marcasRef.current.find((x) => x.id === idMarca);
                    if (orig) marker.setLngLat([orig.lng, orig.lat]); // fuera de la zona: el pin vuelve
                    toast.advertencia('Solo puedes mover el pin dentro de tu zona.');
                }
            });
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (recienArrastrado || modoAgregarRef.current) return;
                onClicRef.current?.(idMarca);
                const cur = marcasRef.current.find((x) => x.id === idMarca);
                if (cur) centrarPinBajoEditor(mapa, [cur.lng, cur.lat]);
            });
            el.addEventListener('mouseenter', () => {
                if (modoAgregarRef.current || !popup) return;
                if (!window.matchMedia('(hover: hover)').matches) return; // solo PC: en táctil no hay hover
                const cur = marcasRef.current.find((x) => x.id === idMarca);
                if (cur) popup.setLngLat([cur.lng, cur.lat]).setHTML(contenidoPopup(cur)).addTo(mapa);
            });
            el.addEventListener('mouseleave', () => popup?.remove());
            markers.set(idMarca, marker);
            aplicarResalte(el, idMarca === marcaSeleccionadaRef.current);
        }
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
        // Zoom con la rueda MÁS rápido (menos giros para acercar/alejar). Default es 1/450.
        mapa.scrollZoom.setWheelZoomRate(1 / 200);
        mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        // Botón "Centrar mi zona": encuadra la zona del vendedor en pantalla. Va en el mismo grupo
        // top-right que el zoom → se apila justo debajo (abajo-derecha la ocupan los FABs).
        const ctrlCentrar: maplibregl.IControl = {
            onAdd() {
                const div = document.createElement('div');
                div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.title = 'Centrar mi zona';
                btn.setAttribute('aria-label', 'Centrar mi zona');
                btn.style.display = 'grid';
                btn.style.placeItems = 'center';
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>';
                btn.onclick = () => {
                    const b = boundsDeZonas(zonasRef.current);
                    if (b) mapa.fitBounds(b, { padding: 40, maxZoom: 16, duration: 900, easing: EASING_CINE, essential: true });
                };
                div.appendChild(btn);
                return div;
            },
            onRemove() {},
        };
        mapa.addControl(ctrlCentrar, 'top-right');

        // El contenedor cambia de alto al colapsar header/nav (modo mapa) o al rotar; MapLibre solo
        // escucha el resize de la ventana, así que sin esto el canvas queda con el tamaño viejo. DEBOUNCE:
        // durante una transición NO redimensionamos en cada frame (cada resize limpia el canvas → destello
        // beige); el canvas conserva su render (el CSS lo estira al 100%) y se actualiza al asentarse.
        let tResize = 0;
        const ro = new ResizeObserver(() => {
            window.clearTimeout(tResize);
            tResize = window.setTimeout(() => mapa.resize(), 160);
        });
        ro.observe(contenedorRef.current);

        // El estilo base de OpenFreeMap pide íconos de POI que su sprite no siempre trae: damos un
        // pixel transparente para los faltantes → sin "Image X could not be loaded" en cada zoom.
        mapa.on('styleimagemissing', (e) => {
            if (!mapa.hasImage(e.id)) mapa.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });

        // Popup de hover de las marcas (estado + nota) y de los negocios (solo lectura). Mismo tamaño
        // y mismo offset por dirección (OFFSET_PIN) en ambos → se ven unificados.
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: OFFSET_PIN, maxWidth: '310px', className: 'popup-territorio' });
        popupRef.current = popup;
        const popupNeg = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: OFFSET_PIN, maxWidth: '310px', className: 'popup-territorio' });
        popupNegRef.current = popupNeg;

        mapa.on('load', () => {
            // Atribución colapsada por defecto (solo el ⓘ): MapLibre la abre la 1ª vez con esta clase.
            mapa.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
            // Máscara que oscurece el exterior (se enciende al aterrizar). Va primero: debajo de todo.
            mapa.addSource(ID_MASCARA, { type: 'geojson', data: mascaraGeoJSON(zonas) });
            mapa.addLayer({ id: ID_MASCARA_FILL, type: 'fill', source: ID_MASCARA, paint: { 'fill-color': '#0f172a', 'fill-opacity': 0 } });
            // Zona del vendedor.
            mapa.addSource(ID_ZONA, { type: 'geojson', data: zonasGeoJSON(zonas) });
            mapa.addLayer({ id: ID_ZONA, type: 'fill', source: ID_ZONA, paint: { 'fill-color': ['coalesce', ['get', 'color'], '#2563eb'], 'fill-opacity': 0.06 } });
            mapa.addLayer({ id: ID_ZONA_LINE, type: 'line', source: ID_ZONA, paint: { 'line-color': ['coalesce', ['get', 'color'], '#2563eb'], 'line-width': 2.5, 'line-opacity': 0.9 } });
            // Negocios reales (contexto, solo lectura), debajo de los pines del vendedor.
            mapa.addSource(ID_NEGOCIOS, { type: 'geojson', data: negociosGeoJSON(negociosRef.current) });
            if (!mapa.hasImage('negocio-sin')) { const i = iconoNegocio(COLOR_NEGOCIO.sinVendedor); mapa.addImage('negocio-sin', i.data, { pixelRatio: i.ratio }); }
            if (!mapa.hasImage('negocio-con')) { const i = iconoNegocio(COLOR_NEGOCIO.conVendedor); mapa.addImage('negocio-con', i.data, { pixelRatio: i.ratio }); }
            mapa.addLayer({
                id: ID_NEGOCIOS_C,
                type: 'symbol',
                source: ID_NEGOCIOS,
                layout: {
                    'icon-image': ['case', ['==', ['get', 'embajadorId'], ''], 'negocio-sin', 'negocio-con'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-size': 1,
                },
            });
            mapa.on('mouseenter', ID_NEGOCIOS_C, (e) => {
                if (modoAgregarRef.current) return;
                const f = e.features?.[0];
                if (!f) return;
                mapa.getCanvas().style.cursor = 'pointer';
                const coords = (f.geometry as { coordinates: [number, number] }).coordinates;
                popupNeg.setLngLat(coords).setHTML(contenidoPopupNegocio(f.properties as Record<string, string>)).addTo(mapa);
            });
            mapa.on('mouseleave', ID_NEGOCIOS_C, () => { mapa.getCanvas().style.cursor = ''; popupNeg.remove(); });
            // CLICK/TAP en un negocio: muestra su popup (en táctil no hay hover). Si ya había uno abierto,
            // popupNeg es una instancia única → se MUEVE al nuevo negocio, cerrando el anterior.
            mapa.on('click', ID_NEGOCIOS_C, (e) => {
                if (modoAgregarRef.current) return; // en modo agregar el clic crea una marca
                const f = e.features?.[0];
                if (!f) return;
                const coords = (f.geometry as { coordinates: [number, number] }).coordinates;
                popupNeg.setLngLat(coords).setHTML(contenidoPopupNegocio(f.properties as Record<string, string>)).addTo(mapa);
            });

            // Marcas del vendedor: PINES (Markers HTML arrastrables).
            sincronizarMarcas();

            setListo(true);
            setCargando(false);
        });

        // En modo "agregar", un clic en el mapa (dentro de la zona) crea una marca.
        mapa.on('click', (e) => {
            if (!modoAgregarRef.current) return;
            if (dentroDeZona(e.lngLat.lng, e.lngLat.lat, zonasRef.current)) {
                onAgregarRef.current?.(e.lngLat.lat, e.lngLat.lng);
                centrarPinBajoEditor(mapa, [e.lngLat.lng, e.lngLat.lat]); // deja el pin nuevo bajo el editor
            } else {
                toast.advertencia('Solo puedes poner marcas dentro de tu zona.');
            }
        });

        mapa.on('error', (ev) => { console.error('[MapaMarcas] error de MapLibre:', ev.error); });

        return () => {
            window.clearTimeout(tResize);
            ro.disconnect();
            markersRef.current.forEach((mk) => mk.remove());
            markersRef.current.clear();
            popup.remove();
            popupNeg.remove();
            mapa.remove();
            mapaRef.current = null;
        };
    }, []);

    // Re-pintar zona/negocios + sincronizar los pines cuando cambian.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo) return;
        (mapa.getSource(ID_ZONA) as GeoJSONSource | undefined)?.setData(zonasGeoJSON(zonas));
        (mapa.getSource(ID_MASCARA) as GeoJSONSource | undefined)?.setData(mascaraGeoJSON(zonas));
        (mapa.getSource(ID_NEGOCIOS) as GeoJSONSource | undefined)?.setData(negociosGeoJSON(negocios));
        sincronizarMarcas();
    }, [zonas, marcas, negocios, listo]);

    // Intro: mostrar México completo y volar con zoom hasta la zona; al llegar, recortar y acotar el paneo.
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa || !listo || ajustadoRef.current) return;
        const b = boundsDeZonas(zonas);
        if (!b) return;
        ajustadoRef.current = true;
        const timer = setTimeout(() => {
            mapa.fitBounds(b, { padding: 24, maxZoom: 16, duration: 2600, easing: EASING_CINE, essential: true });
            mapa.once('moveend', () => {
                // Enciende el overlay oscuro sobre lo que NO es su zona. NO acotamos el paneo: el vendedor
                // puede alejar y moverse a cualquier parte del mapa; la máscara sigue resaltando su zona.
                if (mapa.getLayer(ID_MASCARA_FILL)) mapa.setPaintProperty(ID_MASCARA_FILL, 'fill-opacity', 0.5);
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
    }, [modoAgregar, listo]);

    // Mapa FIJO con el header del shell asomado (hoja expandida): baja el zoom/centrar (arriba-derecha)
    // para que no queden detrás del header. Se anima junto con la transición del header.
    useEffect(() => {
        const grupo = mapaRef.current?.getContainer().querySelector('.maplibregl-ctrl-top-right') as HTMLElement | null;
        if (!grupo) return;
        grupo.style.transition = 'margin-top 0.3s ease-out';
        grupo.style.marginTop = (mapaFijo && headerVisible) ? '64px' : '';
    }, [mapaFijo, headerVisible, listo]);

    // "Ver en el mapa" (desde la lista): centra Y ACERCA la marca (sin abrir el editor). El resalte lo
    // aplica el effect de marcaSeleccionadaId (= foco.id). No aleja si ya estás más cerca de zoom 16.
    useEffect(() => {
        if (enfocarNonce === 0) return;
        const mapa = mapaRef.current;
        const c = enfocarMarcaRef.current;
        if (!mapa || !listo || !c) return;
        mapa.easeTo({ center: c, zoom: Math.max(mapa.getZoom(), 16), duration: 800, easing: EASING_CINE, essential: true });
    }, [enfocarNonce, listo]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
            <div ref={contenedorRef} className="h-full w-full bg-[#f8f4f0]" data-testid="marcas-mapa" />
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
