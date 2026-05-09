/**
 * FooterPublico.tsx
 * ==================
 * Footer compartido por las páginas públicas (sin sesión).
 * Estilo unificado con `FooterLanding` (PaginaLanding.tsx) — mismo lenguaje
 * visual del footer del Home autenticado: bg-black + logo azul + copyright
 * centrado + redes sociales + botón flotante "Volver arriba".
 *
 * El botón "Volver arriba" hace scroll del `<main>` ancestro (las páginas
 * públicas tienen scroll interno en `<main className="overflow-y-auto">`,
 * no en window).
 *
 * Ubicación: apps/web/src/components/public/FooterPublico.tsx
 */

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FooterPublico() {
    // El botón "Volver arriba" solo aparece cuando el `<main>` ancestro
    // (que es donde vive el scroll de las páginas públicas) ha scrolleado
    // más de 100px. Si la página no tiene scroll suficiente, scrollTop es 0
    // y el botón queda invisible — no estorba en páginas cortas.
    const [mostrarVolverArriba, setMostrarVolverArriba] = useState(false);

    useEffect(() => {
        const main = document.querySelector('main.overflow-y-auto') as HTMLElement | null;
        if (!main) return;

        const handleScroll = () => {
            setMostrarVolverArriba(main.scrollTop > 100);
        };

        main.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // chequeo inicial
        return () => main.removeEventListener('scroll', handleScroll);
    }, []);

    const handleVolverArriba = () => {
        document.querySelector('main.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="relative bg-black px-4 py-5 lg:px-7 lg:py-5 2xl:px-8 2xl:py-5">
            {/* Botón "Volver arriba" flotante — solo visible cuando hay
                scroll bajado. Fade suave con `opacity` + `pointer-events-none`
                para que no estorbe cuando está oculto. */}
            <button
                onClick={handleVolverArriba}
                aria-hidden={!mostrarVolverArriba}
                tabIndex={mostrarVolverArriba ? 0 : -1}
                className={`absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-slate-700 bg-slate-800 px-3 py-1 shadow-md transition-opacity duration-300 hover:bg-slate-600 lg:cursor-pointer lg:px-4 lg:py-1 2xl:px-3.5 2xl:py-1 ${
                    mostrarVolverArriba
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            >
                <ChevronDown className="h-3.5 w-3.5 rotate-180 text-white/70 lg:h-3.5 lg:w-3.5" />
                <span className="text-sm font-semibold text-white/70 lg:text-sm 2xl:text-sm">
                    Volver arriba
                </span>
            </button>

            {/* Desktop: una fila — logo · copyright · redes */}
            <div className="hidden items-center justify-between md:flex">
                <img
                    src="/logo-anunciaya-azul.webp"
                    alt="AnunciaYA"
                    className="h-8 lg:h-8 2xl:h-10"
                />

                <p className="text-center text-sm font-medium text-white/80 lg:text-sm 2xl:text-sm">
                    © {new Date().getFullYear()} AnunciaYA. Todos los derechos reservados.
                </p>

                <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4">
                    <a
                        href="https://wa.me/526381234567"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-transform hover:scale-110 lg:cursor-pointer"
                    >
                        <img
                            src="/whatsapp.webp"
                            alt="WhatsApp"
                            className="h-6 w-6 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8"
                        />
                    </a>
                    <a
                        href="https://facebook.com/anunciaya"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-transform hover:scale-110 lg:cursor-pointer"
                    >
                        <img
                            src="/facebook.webp"
                            alt="Facebook"
                            className="h-6 w-6 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8"
                        />
                    </a>
                </div>
            </div>

            {/* Móvil: 2 líneas — logo + redes / copyright */}
            <div className="flex flex-col gap-3 md:hidden">
                <div className="flex items-center justify-between">
                    <img
                        src="/logo-anunciaya-azul.webp"
                        alt="AnunciaYA"
                        className="h-8"
                    />
                    <div className="flex items-center gap-2">
                        <a
                            href="https://wa.me/526381234567"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-transform hover:scale-110"
                        >
                            <img src="/whatsapp.webp" alt="WhatsApp" className="h-7 w-7" />
                        </a>
                        <a
                            href="https://facebook.com/anunciaya"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-transform hover:scale-110"
                        >
                            <img src="/facebook.webp" alt="Facebook" className="h-7 w-7" />
                        </a>
                    </div>
                </div>

                <p className="text-center text-xs font-medium text-white/80">
                    © {new Date().getFullYear()} AnunciaYA. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    );
}

export default FooterPublico;
