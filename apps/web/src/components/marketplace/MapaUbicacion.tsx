/**
 * MapaUbicacion.tsx
 * ==================
 * Mapa del detalle de Marketplace y Servicios. Tiene dos modos:
 *
 *  1. **Modo aproximado (default)** — círculo de 500m alrededor de la
 *     `ubicacion_aproximada`. Mapa NO interactivo (no se arrastra, no
 *     se hace zoom). Se usa para artículos del Marketplace y para
 *     publicaciones personales de Servicios (servicio-persona / solicito)
 *     porque son usuarios que merecen privacidad del domicilio.
 *
 *  2. **Modo exacto (`exacto={true}`)** — pin en la dirección real
 *     (sin offset). Mapa interactivo (drag + zoom). Botón "Cómo llegar"
 *     que abre Google Maps con direcciones. Se usa para vacantes de
 *     negocios verificados — Sprint 9.3, porque el negocio ya expone su
 *     dirección pública en la sección Negocios y los candidatos necesitan
 *     saber dónde quedan para decidir si aplicar.
 *
 * Privacidad (modo aproximado):
 *  - El backend devuelve `ubicacion_aproximada` (aleatorizada al guardar
 *    dentro de un círculo de 500m alrededor de la real). La ubicación
 *    exacta NUNCA llega al frontend para artículos/servicios personales.
 *  - El círculo de 500m que dibujamos aquí está centrado en `ubicacion_
 *    aproximada`, no en la real. Doble capa de privacidad.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 Ubicación)
 *
 * Ubicación: apps/web/src/components/marketplace/MapaUbicacion.tsx
 */

import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapaUbicacionProps {
    /** Latitud (aproximada si `exacto=false`, exacta si `exacto=true`) */
    lat: number;
    /** Longitud (aproximada si `exacto=false`, exacta si `exacto=true`) */
    lng: number;
    /** Texto a mostrar bajo el mapa, ej: "Centro · Manzanillo" */
    zonaAproximada?: string;
    /**
     * Sprint 9.3: cuando es `true`, el mapa renderiza un PIN exacto en
     * lugar de un círculo aproximado y habilita drag + zoom. El título
     * "Ubicación del negocio" y el botón "Cómo llegar" se renderizan
     * EXTERNAMENTE por el caller (Sprint 9.3 iter — el botón Cómo
     * llegar quedó como pill al lado del título de la sección). Solo
     * activarlo para entidades verificadas cuya dirección ya es pública
     * (negocios → vacantes).
     */
    exacto?: boolean;
    /**
     * Texto opcional que reemplaza el mensaje de privacidad por defecto
     * (modo aproximado solamente). MP usa el default — "Mostraremos un
     * círculo de 500m, no la dirección exacta. Acuerda el punto de
     * encuentro por chat" — porque hay intercambio físico de producto.
     * Servicios pasa un mensaje genérico ("Por privacidad mostramos
     * solo la zona aproximada. Coordina los detalles por chat") porque
     * la dinámica no siempre es punto de encuentro (puede ser que el
     * prestador vaya al cliente o al revés).
     */
    mensajePrivacidad?: string;
}

const RADIO_PRIVACIDAD_METROS = 500;
const ZOOM_INICIAL_APROXIMADO = 15;
const ZOOM_INICIAL_EXACTO = 17;

/**
 * Pin custom usando `divIcon` con HTML — evita problemas de paths de
 * iconos default de Leaflet con bundlers (Vite no resuelve las imágenes
 * de `leaflet/dist/images/`). Diseño: círculo sky-600 con sombra +
 * borde blanco para contraste sobre cualquier tile del mapa.
 */
const pinExacto = L.divIcon({
    className: '',
    html: `
        <div style="
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            background: #0284c7;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                transform: rotate(45deg);
            "></div>
        </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28], // punta del pin abajo
});

const MENSAJE_PRIVACIDAD_DEFAULT =
    'Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el punto de encuentro por chat.';

export function MapaUbicacion({
    lat,
    lng,
    zonaAproximada,
    exacto = false,
    mensajePrivacidad,
}: MapaUbicacionProps) {
    const zoom = exacto ? ZOOM_INICIAL_EXACTO : ZOOM_INICIAL_APROXIMADO;
    const textoPrivacidad = mensajePrivacidad ?? MENSAJE_PRIVACIDAD_DEFAULT;

    return (
        <div data-testid="mapa-ubicacion-marketplace" className="space-y-2">
            {/* `relative isolate z-0` crea un stacking context propio para
                que los elementos internos de Leaflet (que usan z-index 400+
                por default) NO escapen y tapen elementos globales como el
                BottomNav o la BarraContacto fija. */}
            <div className="relative z-0 max-w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-200 isolate">
                <MapContainer
                    center={[lat, lng]}
                    zoom={zoom}
                    scrollWheelZoom={exacto}
                    dragging={exacto}
                    touchZoom={exacto}
                    doubleClickZoom={exacto}
                    boxZoom={exacto}
                    keyboard={exacto}
                    zoomControl={exacto}
                    attributionControl={false}
                    className="h-48 w-full lg:h-56 2xl:h-64"
                    style={exacto ? undefined : { pointerEvents: 'none' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {exacto ? (
                        <Marker position={[lat, lng]} icon={pinExacto} />
                    ) : (
                        <Circle
                            center={[lat, lng]}
                            radius={RADIO_PRIVACIDAD_METROS}
                            pathOptions={{
                                color: '#0d9488',
                                weight: 2,
                                fillColor: '#14b8a6',
                                fillOpacity: 0.15,
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            {zonaAproximada && (
                <div className="text-sm font-medium text-slate-700">
                    {zonaAproximada}
                </div>
            )}

            {/* Solo en modo aproximado mostramos el texto de privacidad.
                En modo exacto el caller renderiza su propio título y
                botón "Cómo llegar" externamente. El texto es
                configurable vía `mensajePrivacidad` para que cada
                sección use el copy que mejor describa su dinámica.
                `whitespace-pre-line` permite forzar saltos de línea
                con `\n` desde el caller. */}
            {!exacto && (
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                    {textoPrivacidad}
                </p>
            )}
        </div>
    );
}

export default MapaUbicacion;
