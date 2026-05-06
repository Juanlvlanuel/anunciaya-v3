/**
 * FooterPublico.tsx
 * ==================
 * Footer compartido por las páginas públicas (sin sesión).
 * Se renderiza junto con `HeaderPublico` en:
 *  - PaginaArticuloPublico (catálogo de negocios)
 *  - PaginaOfertaPublico
 *  - PaginaArticuloMarketplacePublico
 *
 * Layout: 3 columnas en desktop (logo + slogan / copyright / redes),
 *         2 líneas en móvil.
 *
 * Ubicación: apps/web/src/components/public/FooterPublico.tsx
 */

export function FooterPublico() {
    return (
        <footer className="bg-slate-900 text-white">
            <div className="max-w-6xl lg:max-w-4xl 2xl:max-w-6xl mx-auto px-4 lg:px-4 2xl:px-6 py-4 lg:py-3 2xl:py-4">
                {/* Desktop: 3 columnas en una fila */}
                <div className="hidden md:flex items-center justify-between">
                    <div className="flex flex-col items-start gap-1 lg:gap-0.5 2xl:gap-1">
                        <img
                            src="/logo-anunciaya.webp"
                            alt="AnunciaYA"
                            className="h-8 lg:h-7 2xl:h-9"
                        />
                        <p className="text-slate-400 text-xs lg:text-[10px] 2xl:text-xs italic">
                            "Tus compras ahora valen más."
                        </p>
                    </div>

                    <p className="text-slate-500 text-xs lg:text-[10px] 2xl:text-xs">
                        © 2026 AnunciaYA. Todos los derechos reservados.
                    </p>

                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                        <span className="text-slate-400 text-xs lg:text-[10px] 2xl:text-xs mr-1">¡Síguenos!</span>
                        <a
                            href="https://facebook.com/anunciaya"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
                        >
                            <img src="/facebook.webp" alt="Facebook" className="w-full h-full object-cover" />
                        </a>
                        <a
                            href="https://wa.me/526621234567"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
                        >
                            <img src="/whatsapp.webp" alt="WhatsApp" className="w-full h-full object-cover" />
                        </a>
                    </div>
                </div>

                {/* Móvil: 2 líneas */}
                <div className="flex flex-col gap-3 md:hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-start gap-0.5">
                            <img src="/logo-anunciaya.webp" alt="AnunciaYA" className="h-8" />
                            <p className="text-slate-400 text-[10px] italic">
                                "Tus compras ahora valen más."
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">¡Síguenos!</span>
                            <a
                                href="https://facebook.com/anunciaya"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full overflow-hidden"
                            >
                                <img src="/facebook.webp" alt="Facebook" className="w-full h-full object-cover" />
                            </a>
                            <a
                                href="https://wa.me/526621234567"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full overflow-hidden"
                            >
                                <img src="/whatsapp.webp" alt="WhatsApp" className="w-full h-full object-cover" />
                            </a>
                        </div>
                    </div>

                    <p className="text-slate-500 text-xs text-center">
                        © 2026 AnunciaYA. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default FooterPublico;
