/**
 * MapaUbicacion.tsx
 * ==================
 * Mapa decorativo con círculo de 500m alrededor de la ubicación aproximada del
 * artículo. NO es interactivo — el usuario no puede arrastrar, zoom ni clickear
 * en el mapa. Es solo una representación visual de la zona.
 *
 * Privacidad:
 *  - El backend devuelve `ubicacion_aproximada` (aleatorizada al guardar
 *    dentro de un círculo de 500m alrededor de la real). La ubicación exacta
 *    NUNCA llega al frontend. Ver `aleatorizarCoordenada` en
 *    apps/api/src/services/marketplace.service.ts.
 *  - El círculo de 500m que dibujamos aquí está centrado en `ubicacion_
 *    aproximada`, no en la real. Esto agrega una segunda capa de privacidad
 *    sobre el offset que ya hace el backend al guardar.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 Ubicación)
 * Sprint:      docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
 *
 * Ubicación: apps/web/src/components/marketplace/MapaUbicacion.tsx
 */

import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapaUbicacionProps {
    /** Latitud aproximada (NUNCA la real) */
    lat: number;
    /** Longitud aproximada (NUNCA la real) */
    lng: number;
    /** Texto a mostrar bajo el mapa, ej: "Centro · Manzanillo" */
    zonaAproximada?: string;
}

const RADIO_PRIVACIDAD_METROS = 500;
const ZOOM_INICIAL = 15;

export function MapaUbicacion({ lat, lng, zonaAproximada }: MapaUbicacionProps) {
    return (
        <div data-testid="mapa-ubicacion-marketplace" className="space-y-2">
            {/* `relative isolate z-0` crea un stacking context propio para
                que los elementos internos de Leaflet (que usan z-index 400+
                por default) NO escapen y tapen elementos globales como el
                BottomNav o la BarraContacto fija. */}
            <div className="relative z-0 overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-200 isolate">
                <MapContainer
                    center={[lat, lng]}
                    zoom={ZOOM_INICIAL}
                    scrollWheelZoom={false}
                    dragging={false}
                    touchZoom={false}
                    doubleClickZoom={false}
                    boxZoom={false}
                    keyboard={false}
                    zoomControl={false}
                    attributionControl={false}
                    className="h-48 w-full lg:h-56 2xl:h-64"
                    style={{ pointerEvents: 'none' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
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
                </MapContainer>
            </div>

            {zonaAproximada && (
                <div className="text-sm font-medium text-slate-700">
                    {zonaAproximada}
                </div>
            )}

            <p className="text-sm font-medium leading-relaxed text-slate-600">
                Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el
                punto de encuentro por chat.
            </p>
        </div>
    );
}

export default MapaUbicacion;
