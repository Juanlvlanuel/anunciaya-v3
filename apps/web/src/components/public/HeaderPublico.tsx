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
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 lg:px-4 2xl:px-6 py-2.5 lg:py-2 2xl:py-2.5 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl lg:max-w-4xl 2xl:max-w-6xl mx-auto flex items-center justify-between">
                <button
                    data-testid="header-publico-logo"
                    onClick={() => navigate('/')}
                    className="cursor-pointer transition-transform hover:scale-105"
                >
                    <img
                        src="/logo-anunciaya.webp"
                        alt="AnunciaYA"
                        className="h-9 lg:h-8 2xl:h-11"
                    />
                </button>

                <div className="hidden lg:flex items-center gap-5 lg:gap-3 2xl:gap-5">
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-amber-600">
                        <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        <span className="text-base lg:text-sm 2xl:text-base font-bold">¡Únete gratis!</span>
                    </div>
                    <span className="text-slate-300 text-xl lg:text-base 2xl:text-xl font-light">·</span>
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-blue-600">
                        <Coins className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        <span className="text-base lg:text-sm 2xl:text-base font-semibold">Acumula puntos comprando</span>
                    </div>
                    <span className="text-slate-300 text-xl lg:text-base 2xl:text-xl font-light">·</span>
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 text-green-600">
                        <Award className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        <span className="text-base lg:text-sm 2xl:text-base font-bold">Canjea por recompensas</span>
                    </div>
                </div>

                <button
                    data-testid="header-publico-registrarse"
                    onClick={() => navigate('/registro')}
                    className="bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white px-5 lg:px-4 2xl:px-5 py-2 lg:py-1.5 2xl:py-2 rounded-lg font-semibold text-sm lg:text-xs 2xl:text-sm cursor-pointer transition-all shadow-md shadow-blue-500/20"
                >
                    Registrarse
                </button>
            </div>
        </header>
    );
}

export default HeaderPublico;
