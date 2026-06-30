/**
 * MarcadorPopup.tsx — marcador con pin + popup "click para abrir" (MapLibre).
 * =============================================================================
 * En Leaflet, `<Marker><Popup>…</Popup></Marker>` ataba el popup al marcador y
 * lo abría/cerraba solo al hacer clic. En react-map-gl el <Popup> es un
 * componente independiente cuyo estado de apertura lo maneja el caller. Este
 * wrapper reproduce el comportamiento de Leaflet: un <Marker> que al hacer clic
 * alterna un <Popup> con contenido arbitrario (children).
 *
 * El estilo del popup se controla con `popupClassName` (apunta a las clases
 * `.maplibregl-popup-*` vía un <style> en el caller).
 *
 * Ubicación: apps/web/src/components/mapa/MarcadorPopup.tsx
 */

import { useState, type ReactNode } from 'react';
import { Marker, Popup, type MarkerEvent } from './Mapa';

export type ColorPin = 'rojo' | 'azul' | 'verde';

const COLORES_PIN: Record<ColorPin, string> = {
    rojo: '#ef4444',
    azul: '#3b82f6',
    verde: '#22c55e',
};

/** Pin clásico tipo "gota" (SVG, 27×41) con la punta abajo. */
export function PinMapa({ color = 'rojo' }: { color?: ColorPin }) {
    return (
        <svg
            width="27"
            height="41"
            viewBox="0 0 27 41"
            style={{ display: 'block', cursor: 'pointer', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
        >
            <path
                d="M13.5 0C6.04 0 0 6.04 0 13.5 0 23.6 13.5 41 13.5 41S27 23.6 27 13.5C27 6.04 20.96 0 13.5 0z"
                fill={COLORES_PIN[color]}
                stroke="#fff"
                strokeWidth="1.5"
            />
            <circle cx="13.5" cy="13.5" r="4.5" fill="#fff" />
        </svg>
    );
}

interface MarcadorPopupProps {
    lng: number;
    lat: number;
    /** Color del pin por defecto (ignorado si se pasa `pin`). */
    color?: ColorPin;
    /** Clase del popup para apuntar a `.maplibregl-popup-*` desde el caller. */
    popupClassName?: string;
    /** Ancho máximo del popup (default 270px). */
    maxWidth?: string;
    /** Pin custom (reemplaza el SVG por defecto). */
    pin?: ReactNode;
    /** Contenido del popup. Si no hay, el marcador no abre nada. */
    children?: ReactNode;
}

export function MarcadorPopup({
    lng,
    lat,
    color = 'rojo',
    popupClassName,
    maxWidth = '270px',
    pin,
    children,
}: MarcadorPopupProps) {
    const [abierto, setAbierto] = useState(false);

    return (
        <>
            <Marker
                longitude={lng}
                latitude={lat}
                anchor="bottom"
                onClick={(e: MarkerEvent<MouseEvent>) => {
                    e.originalEvent.stopPropagation();
                    setAbierto((v) => !v);
                }}
            >
                <div style={{ cursor: 'pointer' }}>{pin ?? <PinMapa color={color} />}</div>
            </Marker>
            {abierto && children && (
                <Popup
                    longitude={lng}
                    latitude={lat}
                    anchor="bottom"
                    offset={42}
                    className={popupClassName}
                    maxWidth={maxWidth}
                    onClose={() => setAbierto(false)}
                >
                    {children}
                </Popup>
            )}
        </>
    );
}

export default MarcadorPopup;
