/**
 * HeaderPublico.tsx
 * ==================
 * Header compartido por todas las páginas públicas (sin sesión):
 *  - PaginaArticuloPublico (catálogo de negocios)
 *  - PaginaOfertaPublico
 *  - PaginaArticuloMarketplacePublico
 *
 * Incluye logo clickeable a `/`, beneficios en desktop y CTA "Registrarse".
 *
 * Ubicación: apps/web/src/components/public/HeaderPublico.tsx
 */

import { useNavigate } from 'react-router-dom';
import { Gift, Coins, Award } from 'lucide-react';

export function HeaderPublico() {
    const navigate = useNavigate();

    return (
        <div className="sticky top-0 z-50">
            <header className="bg-header-app px-4 lg:px-4 2xl:px-8 py-2.5 lg:py-3 2xl:py-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                    <button
                        data-testid="header-publico-logo"
                        onClick={() => navigate('/')}
                        className="flex items-center shrink-0 cursor-pointer transition-transform hover:scale-110"
                    >
                        <img
                            src="/logo-anunciaya-azul.webp"
                            alt="AnunciaYA"
                            className="h-8 lg:h-9 2xl:h-11 w-auto object-contain"
                        />
                    </button>

                    {/* Beneficios — iconos en tonos claros sobre azul, texto blanco. */}
                    <div className="hidden lg:flex items-center gap-5 lg:gap-3 2xl:gap-5">
                        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-white">
                            <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-300" />
                            <span className="text-base lg:text-sm 2xl:text-base font-bold">¡Únete gratis!</span>
                        </div>
                        <span className="text-white/60 text-xl lg:text-base 2xl:text-xl font-bold">·</span>
                        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-white">
                            <Coins className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-200" />
                            <span className="text-base lg:text-sm 2xl:text-base font-semibold">Acumula puntos comprando</span>
                        </div>
                        <span className="text-white/60 text-xl lg:text-base 2xl:text-xl font-bold">·</span>
                        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-white">
                            <Award className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-green-300" />
                            <span className="text-base lg:text-sm 2xl:text-base font-bold">Canjea por recompensas</span>
                        </div>
                    </div>

                    {/* Botón Registrarse — estilo "tab activo" del Navbar:
                        pill blanco prominente sobre el gradient azul. */}
                    <button
                        data-testid="header-publico-registrarse"
                        onClick={() => navigate('/registro')}
                        className="bg-white hover:bg-blue-50 hover:scale-105 text-blue-700 px-5 lg:px-4 2xl:px-5 py-2 lg:py-1.5 2xl:py-2 rounded-full font-bold text-sm lg:text-xs 2xl:text-sm cursor-pointer transition-all shadow-md shrink-0"
                    >
                        Registrarse
                    </button>
                </div>
            </header>

            {/* Línea brillante inferior — mismo efecto del Navbar. */}
            <div className="header-app-shine" />
        </div>
    );
}

export default HeaderPublico;
