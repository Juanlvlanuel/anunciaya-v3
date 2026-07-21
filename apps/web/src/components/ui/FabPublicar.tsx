/**
 * FabPublicar.tsx
 * ================
 * Botón flotante "+ Publicar" reusable. Unifica el JSX que antes vivía
 * duplicado 1:1 en `PaginaMarketplace.tsx` (teal) y `PaginaServicios.tsx`
 * (sky) — ahora también usado en `PaginaNegocios.tsx` (blue).
 *
 * ESCRITORIO: anclado arriba bajo el header (`topPublicar`, medido por la
 * página vía ResizeObserver). MÓVIL: abajo a la derecha (sube a bottom-20
 * con el BottomNav visible, baja a bottom-4 al ocultarse).
 *
 * `claseColor` recibe las clases Tailwind COMPLETAS del círculo (gradiente +
 * sombra + ring) como string literal en cada call site — NO se arman con
 * interpolación (`from-${color}`) porque Tailwind v4 escanea el texto fuente
 * en build y una clase ensamblada en runtime no la detecta.
 *
 * Ubicación: apps/web/src/components/ui/FabPublicar.tsx
 */

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface FabPublicarProps {
    onClick: () => void;
    ariaLabel: string;
    testId?: string;
    label?: string;
    /** Clases Tailwind completas del círculo: gradiente + sombra + ring.
     *  Ej: "bg-linear-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/30 ring-2 ring-teal-300/30" */
    claseColor: string;
    /** Posición vertical en escritorio (px bajo el header). Ignorada en móvil. */
    topPublicar?: number;
    esEscritorio: boolean;
    bottomNavVisible: boolean;
    /** Mantiene el chip blanco del label también en escritorio (default:
     *  false — texto plano en desktop). MP, Negocios y Servicios lo activan
     *  para igualar el mismo look que móvil. */
    labelConCardEscritorio?: boolean;
    /** Ícono dentro del círculo (default: `Plus` con animación pulse — el
     *  comportamiento original "+ Publicar"). Pásalo para reusar el mismo
     *  FAB con otro propósito (ej. toggle Mapa/Feed de Negocios). */
    icon?: ReactNode;
}

export function FabPublicar({
    onClick,
    ariaLabel,
    testId = 'fab-publicar',
    label = 'Publicar',
    claseColor,
    topPublicar = 96,
    esEscritorio,
    bottomNavVisible,
    labelConCardEscritorio = false,
    icon,
}: FabPublicarProps) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            aria-label={ariaLabel}
            style={{
                ...(esEscritorio ? { top: `${topPublicar}px` } : {}),
                transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1), bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
            }}
            className={`fixed right-4 z-30 flex cursor-pointer flex-col items-center gap-1 lg:right-[330px] 2xl:right-[394px] ${
                esEscritorio ? '' : bottomNavVisible ? 'bottom-20' : 'bottom-4'
            }`}
        >
            <span className={`flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-105 ${claseColor}`}>
                {icon ?? (
                    <Plus
                        className="h-6 w-6"
                        strokeWidth={2.75}
                        style={{ animation: 'fab-publicar-pulse 2.4s ease-in-out infinite' }}
                    />
                )}
            </span>
            {/* Label "Publicar" — visible en móvil y desktop.
                Móvil: chip blanco translúcido con sombra para legibilidad
                sobre fotos del feed (fondos impredecibles).
                Desktop: texto plano sobre el fondo claro, salvo que
                `labelConCardEscritorio` pida mantener el chip (MP/Negocios/
                Servicios lo activan). */}
            <span
                className={`rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-bold text-slate-700 shadow-md backdrop-blur-sm ${
                    labelConCardEscritorio ? '' : 'lg:bg-transparent lg:px-0 lg:py-0 lg:text-base lg:shadow-none lg:backdrop-blur-none'
                }`}
            >
                {label}
            </span>
            <style>{`
                @keyframes fab-publicar-pulse {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(90deg) scale(1.15); }
                }
            `}</style>
        </button>
    );
}

export default FabPublicar;
