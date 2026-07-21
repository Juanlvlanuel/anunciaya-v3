/**
 * IndicadorRefrescoFeed.tsx
 * ===========================
 * Indicador de "refresco tipo Facebook/Instagram" reusable: ícono temático
 * de la sección sobre un fondo blanco, rodeado por un anillo giratorio —
 * ícono y anillo, ambos animados. Overlay `position: absolute`: NUNCA
 * reserva espacio en el flujo, así que aparecer/girar no mueve nada del
 * layout de abajo (a diferencia de un indicador tipo "acordeón" de altura).
 *
 * Dos modos de uso, combinables:
 *  - Jalón (móvil, `usePullToRefresh`): `progreso` sigue el dedo (0..1) y el
 *    anillo "se llena" girando ese ángulo; al soltar y disparar el refresh
 *    real, `refrescando=true` lo pone a girar en loop hasta que termina.
 *  - Auto (sin gesto, ej. PC): solo importa `refrescando` — aparece y gira
 *    cuando React Query refetchea el feed en segundo plano.
 *
 * Usado en: Home (huella de Coyo), Negocios (Store) y MarketPlace (ShoppingCart).
 * Ubicación: apps/web/src/components/ui/IndicadorRefrescoFeed.tsx
 */

import type { ReactNode } from 'react';

interface IndicadorRefrescoFeedProps {
    /** 0..1 — qué tan cerca del umbral va el jalón (sin gesto: 0 o 1 según `refrescando`). */
    progreso: number;
    /** true mientras el refetch real está en curso: anillo y ícono animan en loop. */
    refrescando: boolean;
    /** Sin transición mientras el dedo jala (para que siga el dedo en vivo). */
    sinTransicion?: boolean;
    /** Ícono temático ya con su tamaño/color (ej. `<Store className="h-9 w-9 text-blue-600" />`). */
    icon: ReactNode;
    /** Clases Tailwind COMPLETAS del anillo: color base + color del trazo activo.
     *  Ej: "border-blue-200 border-t-blue-600" */
    claseAnillo: string;
    testId?: string;
    /** Posición FIJA en px de viewport (medida por JS con
     *  `getBoundingClientRect`) — úsala cuando el indicador debe ubicarse en
     *  el ancho/alto real de LA PÁGINA y no en su contenedor directo (ej.
     *  Negocios escritorio: el feed vive en una columna más angosta que la
     *  página completa, junto a la columna de cards). IMPORTANTE: `top` debe
     *  incluir el alto del header/navbar fijo — con `position: fixed`, un
     *  `top` chico (ej. solo +8px) cae DETRÁS del navbar (z-50 > este z-40),
     *  invisible aunque el estado esté correcto. Si se omite, se centra
     *  `absolute` (`left: 50%`, `top-2`) dentro de su contenedor posicionado
     *  más cercano — el default, correcto cuando ese contenedor YA arranca
     *  debajo del navbar (Home, MarketPlace). */
    posicionFija?: { left: number; top: number };
    /** true = renderiza en flujo normal (sin position absolute/fixed), para
     *  usarlo como spinner de CARGA INICIAL (`isLoading`, sin caché — ej.
     *  F5) dentro de un contenedor ya centrado (`flex items-center
     *  justify-center`), en vez de overlay sobre contenido existente. */
    inline?: boolean;
}

export function IndicadorRefrescoFeed({
    progreso,
    refrescando,
    sinTransicion = false,
    icon,
    claseAnillo,
    testId,
    posicionFija,
    inline = false,
}: IndicadorRefrescoFeedProps) {
    const nucleo = (
        <div className="relative flex h-16 w-16 items-center justify-center">
            {/* Fondo blanco DENTRO del anillo (inset por su grosor) para que
                el ícono se lea nítido sobre cualquier fondo de la sección. */}
            <div className="absolute inset-[3px] rounded-full bg-white shadow-sm" />
            {/* Anillo: gira en loop mientras refresca de verdad; mientras solo
                jalas, su ángulo sigue el progreso del jalón (efecto "llenado"). */}
            <div
                className={`absolute inset-0 rounded-full border-[3px] ${claseAnillo} ${refrescando ? 'animate-spin' : ''}`}
                style={{ transform: refrescando ? undefined : `rotate(${progreso * 360}deg)` }}
            />
            <span className={`relative flex items-center justify-center ${refrescando ? 'indicador-refresco-icono' : ''}`}>
                {icon}
            </span>
        </div>
    );

    if (inline) {
        return <div data-testid={testId}>{nucleo}</div>;
    }

    const visible = progreso > 0 || refrescando;
    const escala = refrescando ? 1 : 0.55 + progreso * 0.45;
    const fijo = posicionFija !== undefined;
    return (
        <div
            data-testid={testId}
            className={`pointer-events-none z-40 ${fijo ? 'fixed' : 'absolute left-1/2 top-2'}`}
            style={{
                left: fijo ? `${posicionFija.left}px` : undefined,
                top: fijo ? `${posicionFija.top}px` : undefined,
                opacity: visible ? 1 : 0,
                transform: `translateX(-50%) scale(${visible ? escala : 0.55})`,
                transition: sinTransicion ? 'none' : 'opacity 220ms ease-out, transform 220ms ease-out',
            }}
            aria-hidden="true"
        >
            {nucleo}
        </div>
    );
}

export default IndicadorRefrescoFeed;
