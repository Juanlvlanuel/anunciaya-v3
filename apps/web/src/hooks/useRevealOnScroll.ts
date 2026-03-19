import { useEffect, useRef, useState } from 'react';

interface OpcionesReveal {
    umbral?: number;
    soloUnaVez?: boolean;
}

/**
 * Hook para animaciones reveal-on-scroll usando IntersectionObserver.
 * Retorna ref + clase CSS para aplicar al elemento.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
    opciones: OpcionesReveal = {}
) {
    const { umbral = 0.15, soloUnaVez = true } = opciones;
    const ref = useRef<T>(null);
    const [esVisible, setEsVisible] = useState(false);

    useEffect(() => {
        const elemento = ref.current;
        if (!elemento) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setEsVisible(true);
                    if (soloUnaVez) observer.unobserve(elemento);
                } else if (!soloUnaVez) {
                    setEsVisible(false);
                }
            },
            { threshold: umbral }
        );

        observer.observe(elemento);
        return () => observer.disconnect();
    }, [umbral, soloUnaVez]);

    return { ref, esVisible };
}

/**
 * Hook para contadores animados (count-up).
 * El número sube de 0 al valor final cuando es visible.
 */
export function useContadorAnimado(valorFinal: number, duracion = 2000) {
    const [valor, setValor] = useState(0);
    const { ref, esVisible } = useRevealOnScroll<HTMLDivElement>({ umbral: 0.3 });
    const yaAnimo = useRef(false);

    useEffect(() => {
        if (!esVisible || yaAnimo.current) return;
        yaAnimo.current = true;

        const inicio = performance.now();

        const animar = (ahora: number) => {
            const progreso = Math.min((ahora - inicio) / duracion, 1);
            const eased = 1 - Math.pow(1 - progreso, 3);
            setValor(Math.round(eased * valorFinal));

            if (progreso < 1) {
                requestAnimationFrame(animar);
            }
        };

        requestAnimationFrame(animar);
    }, [esVisible, valorFinal, duracion]);

    return { ref, valor };
}
