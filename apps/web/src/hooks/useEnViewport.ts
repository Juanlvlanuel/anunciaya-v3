/**
 * useEnViewport.ts
 * =================
 * Detecta si un elemento está suficientemente visible en el viewport, vía
 * `IntersectionObserver`. Usado para autoplay de video estilo Facebook/
 * Instagram: el video del feed reproduce (muted) mientras su card está
 * visible y se pausa al salir de vista.
 *
 * Ubicación: apps/web/src/hooks/useEnViewport.ts
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

interface OpcionesEnViewport {
    /** Fracción visible mínima para considerarse "en viewport". Default 0.6. */
    threshold?: number;
}

export function useEnViewport<T extends HTMLElement>(
    opciones?: OpcionesEnViewport
): [RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);
    const [enViewport, setEnViewport] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setEnViewport(entry.isIntersecting),
            { threshold: opciones?.threshold ?? 0.6 }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return [ref, enViewport];
}

export default useEnViewport;
