/**
 * Mapa.tsx — wrapper único de mapas para apps/web (react-map-gl + MapLibre GL).
 * =============================================================================
 * Encapsula los tiles **OpenFreeMap** (estilo "liberty", vector, gratis, SIN
 * API key) — los mismos que usa el Panel de Admins (apps/admin). El stack de
 * mapas del proyecto quedó unificado en MapLibre; ver
 * `docs/arquitectura/Migracion_MapLibre.md`.
 *
 * Cambiar el proveedor/estilo de tiles en TODA la app web = editar 1 línea
 * aquí (`ESTILO_MAPA`). Si algún día se self-hostea en prod, también es 1 línea.
 *
 * Reexporta las piezas de `react-map-gl/maplibre` (Marker, Popup, Source,
 * Layer, controles, hooks y tipos) para que los ~8 mapas de la app importen
 * todo desde un solo lugar y no repitan la configuración del estilo.
 *
 * Ubicación: apps/web/src/components/mapa/Mapa.tsx
 */

import { forwardRef, useCallback, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import Map, { type MapRef, type MapProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Estilo de tiles OpenFreeMap (vector, gratis, sin API key). Mismo valor que
 * `apps/admin` (MapaCiudades). Único punto de cambio del proveedor de tiles.
 */
export const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Sensibilidad del zoom con la rueda del mouse: cuánto zoom avanza/retrocede por
 * cada vuelta del scroll. Número MAYOR = más zoom por "notch". Default MapLibre
 * = 1/450; lo subimos para un paso más marcado.
 * ▸ Si se quiere AÚN más rápido, baja el divisor (ej. 1/120); más lento, súbelo.
 */
const TASA_ZOOM_RUEDA = 1 / 200;

/**
 * Wrapper del <Map> de react-map-gl con el estilo OpenFreeMap por defecto.
 * Acepta todas las props nativas de react-map-gl (initialViewState, longitude,
 * latitude, zoom, interactive, onClick, etc.) y reenvía el `ref` (MapRef) para
 * acceso imperativo al mapa (flyTo, project, getMap…). Pasar `mapStyle` lo
 * sobreescribe si alguna vista necesitara otro estilo.
 */
export const Mapa: ForwardRefExoticComponent<MapProps & RefAttributes<MapRef>> = forwardRef(
    function Mapa({ mapStyle, onLoad, ...props }, ref) {
        // Calibrar el zoom con rueda (igual que el Leaflet anterior) y reenviar
        // el onLoad que pase el caller, si lo hubiera.
        const handleLoad = useCallback<NonNullable<MapProps['onLoad']>>(
            (e) => {
                e.target.scrollZoom.setWheelZoomRate(TASA_ZOOM_RUEDA);
                onLoad?.(e);
            },
            [onLoad],
        );
        return <Map ref={ref} mapStyle={mapStyle ?? ESTILO_MAPA} onLoad={handleLoad} {...props} />;
    },
);

export default Mapa;

// ── Reexports de react-map-gl/maplibre ───────────────────────────────────────
export {
    Marker,
    Popup,
    Source,
    Layer,
    NavigationControl,
    GeolocateControl,
    AttributionControl,
    useMap,
} from 'react-map-gl/maplibre';

export type {
    MapRef,
    MapProps,
    MarkerProps,
    PopupProps,
    MarkerEvent,
    MarkerDragEvent,
    MapMouseEvent,
    MapLayerMouseEvent,
    ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
