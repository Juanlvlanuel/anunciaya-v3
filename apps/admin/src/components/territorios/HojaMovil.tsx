/**
 * HojaMovil.tsx
 * =============
 * Bottom-sheet con "peek" sobre el mapa (solo móvil), compartido por las dos vistas de Territorios
 * (gestión super/gerente y "Mi territorio" del vendedor). El header (resumen/chips) siempre asoma;
 * el cuerpo (children) se revela al expandir. Se alterna tocando la pestaña o arrastrándola (drag con
 * umbral). La pestaña SOBRESALE por encima del sheet (mismo lenguaje que el tirador del panel
 * horizontal): chevron arriba = subir, abajo = bajar.
 *
 * Ubicación: apps/admin/src/components/territorios/HojaMovil.tsx
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';

export function HojaMovil({
    expandida,
    onExpandidaChange,
    resumen,
    children,
    altura = '78%',
    fabIzquierda,
    fabDerecha,
}: {
    expandida: boolean;
    onExpandidaChange: (v: boolean) => void;
    resumen: ReactNode;
    children: ReactNode;
    /** Alto del sheet expandido (CSS height). Default '78%'. */
    altura?: string;
    /** FABs anclados al borde superior del sheet: suben/bajan junto con él (estilo Google Maps). */
    fabIzquierda?: ReactNode;
    fabDerecha?: ReactNode;
}) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [maxOffset, setMaxOffset] = useState(0);
    const [headerPx, setHeaderPx] = useState(0);
    const [drag, setDrag] = useState<number | null>(null);
    const inicioRef = useRef(0);
    const baseRef = useRef(0);
    const movidoRef = useRef(false);

    // El peek deja asomando solo la altura del header (grip + resumen); el resto se desplaza fuera.
    useLayoutEffect(() => {
        const medir = () => {
            const sh = sheetRef.current?.offsetHeight ?? 0;
            const hh = headerRef.current?.offsetHeight ?? 0;
            setHeaderPx(hh);
            setMaxOffset(Math.max(0, sh - hh));
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    });

    // En reposo colapsado usamos calc(100% - headerPx): el 100% es la altura REAL del sheet en cada
    // frame, así asoma EXACTAMENTE el header (grip + resumen) aunque el contenedor cambie de alto
    // mientras el header/nav del shell animan su colapso. Durante el arrastre sí va en px.
    const transform =
        drag != null
            ? `translateY(${drag}px)`
            : expandida
                ? 'translateY(0)'
                : `translateY(calc(100% - ${headerPx}px))`;

    const iniciar = (y: number) => {
        inicioRef.current = y;
        baseRef.current = expandida ? 0 : maxOffset;
        movidoRef.current = false;
        setDrag(baseRef.current);
    };

    // Pointer Events (NO mouse + touch por separado): en móvil un toque dispara el evento touch Y
    // un evento de mouse sintético; con dos handlers el "tap" alternaba la hoja DOS veces y se
    // quedaba igual ("no sube ni baja"). Los pointer events unifican ambos en uno solo.
    useEffect(() => {
        if (drag == null) return;
        const mover = (e: PointerEvent) => {
            const delta = e.clientY - inicioRef.current;
            if (Math.abs(delta) > 6) movidoRef.current = true;
            setDrag(Math.min(Math.max(baseRef.current + delta, 0), maxOffset));
        };
        const soltar = () => {
            if (drag == null) return;
            const fueTap = !movidoRef.current;
            // Tap (sin arrastre real): alterna. Arrastre: queda según dónde se soltó. (Fuera del updater
            // de setDrag: llamar ahí al setState del padre dispara "update while rendering".)
            if (fueTap) onExpandidaChange(baseRef.current !== 0);
            else onExpandidaChange(drag < maxOffset / 2);
            setDrag(null);
            // Tras un TAP el sheet se mueve y el "click" sintético del toque caería sobre el elemento que
            // quedó bajo el dedo (abría un dropdown). Cancelamos ese primer click.
            if (fueTap) {
                const cancelar = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
                document.addEventListener('click', cancelar, { capture: true, once: true });
                window.setTimeout(() => document.removeEventListener('click', cancelar, true), 500);
            }
        };
        document.addEventListener('pointermove', mover);
        document.addEventListener('pointerup', soltar);
        document.addEventListener('pointercancel', soltar);
        return () => {
            document.removeEventListener('pointermove', mover);
            document.removeEventListener('pointerup', soltar);
            document.removeEventListener('pointercancel', soltar);
        };
    }, [drag, maxOffset, onExpandidaChange]);

    return (
        <div
            ref={sheetRef}
            data-testid="hoja-territorios"
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[22px] border border-borde bg-superficie shadow-tarjeta-panel ${drag == null ? 'transition-transform duration-300' : ''}`}
            style={{ height: altura, transform }}
        >
            {/* Pestaña que SOBRESALE por encima del sheet: chevron arriba = subir, abajo = bajar. */}
            <button
                type="button"
                data-testid="hoja-grip"
                onPointerDown={(e) => iniciar(e.clientY)}
                aria-label={expandida ? 'Bajar panel' : 'Subir panel'}
                className="absolute left-1/2 top-0 grid h-7 w-16 -translate-x-1/2 -translate-y-full touch-none place-items-center rounded-t-[12px] border border-b-0 border-borde bg-superficie text-texto-3 shadow-[0_-3px_8px_-3px_rgba(15,23,42,0.18)]"
            >
                <ChevronUp size={18} className="transition-transform duration-300" style={{ transform: expandida ? 'rotate(180deg)' : undefined }} />
            </button>
            {/* FABs anclados al borde superior del sheet: como están DENTRO del sheet, suben/bajan
                junto con él automáticamente (estilo Google Maps). */}
            {fabIzquierda && <div className="absolute left-4 top-0 z-30 translate-y-[calc(-100%-14px)]">{fabIzquierda}</div>}
            {fabDerecha && <div className="absolute right-4 top-0 z-30 translate-y-[calc(-100%-14px)]">{fabDerecha}</div>}
            {/* Header del peek: NO arrastra (eso lo hace la pestaña), así tocar un chip filtra sin
                subir/bajar la hoja y el carrusel scrollea en horizontal. */}
            <div ref={headerRef} className="shrink-0 px-3 pt-3 pb-2.5">{resumen}</div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">{children}</div>
        </div>
    );
}

export default HojaMovil;
