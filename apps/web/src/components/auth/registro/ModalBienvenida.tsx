/**
 * ModalBienvenida.tsx
 * ====================
 * Modal informativo post-registro con 2 variantes (Personal y Comercial).
 * Estilo unificado con la landing page.
 *
 * Ubicación: apps/web/src/components/auth/registro/ModalBienvenida.tsx
 */

import { Check, Edit3, TrendingUp, ArrowRight, Home, Search, Tag, MapPin } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalBienvenidaProps {
    isOpen: boolean;
    tipo: 'personal' | 'comercial';
    nombre: string;
    onCompletarPerfil?: () => void;
    onIrAlInicio: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalBienvenida({
    isOpen,
    tipo,
    nombre,
    onCompletarPerfil,
    onIrAlInicio,
}: ModalBienvenidaProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 lg:px-6 2xl:px-8 pt-4 lg:pt-8 2xl:pt-10 pb-2 lg:pb-4 2xl:pb-6 text-center">
                    {/* Check verde */}
                    <div className="inline-flex items-center justify-center mb-2 lg:mb-4 2xl:mb-5">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 rounded-full border-4 border-emerald-600 flex items-center justify-center bg-emerald-100">
                            <Check className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 text-emerald-600 stroke-3" />
                        </div>
                    </div>

                    {/* Línea decorativa */}
                    <div className="flex items-center justify-center gap-1.5 mb-2 lg:mb-4 2xl:mb-5">
                        <div className="w-8 lg:w-10 h-1 bg-slate-800 rounded-full" />
                        <div className="w-2 lg:w-2.5 h-1 bg-slate-400 rounded-full" />
                    </div>

                    {/* Texto */}
                    <h3 className="text-lg lg:text-xl 2xl:text-2xl font-extrabold text-slate-900 mb-0.5">
                        ¡Perfecto, {nombre}!
                    </h3>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                        Cuenta creada exitosamente
                    </p>
                </div>

                {/* Contenido según tipo */}
                <div className="px-5 lg:px-6 2xl:px-8 pb-4 lg:pb-6 2xl:pb-8">
                    {tipo === 'personal' ? (
                        <ContenidoPersonal onIrAlInicio={onIrAlInicio} />
                    ) : (
                        <ContenidoComercial onIrAlInicio={onIrAlInicio} onCompletarPerfil={onCompletarPerfil} />
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// VARIANTE PERSONAL
// =============================================================================

function ContenidoPersonal({ onIrAlInicio }: { onIrAlInicio: () => void }) {
    const features = [
        { icon: Search, color: 'bg-slate-800', titulo: 'Busca negocios', descripcion: 'Encuentra lo que necesitas' },
        { icon: Tag, color: 'bg-slate-800', titulo: 'Ofertas locales', descripcion: 'Descubre promociones' },
        { icon: MapPin, color: 'bg-slate-800', titulo: 'Cerca de ti', descripcion: 'Negocios en tu zona' },
    ];

    return (
        <>
            <div className="text-center mb-4 lg:mb-4 2xl:mb-6">
                <h4 className="text-lg lg:text-lg 2xl:text-xl font-extrabold text-slate-900 mb-1">
                    ¡Bienvenido a AnunciaYA!
                </h4>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                    Descubre negocios y ofertas en tu zona
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:gap-3 2xl:gap-4 mb-5 lg:mb-6 2xl:mb-8">
                {features.map((feature, index) => {
                    const Icono = feature.icon;
                    return (
                        <div key={index} className="text-center">
                            <div className={`w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-2 lg:mb-1.5 2xl:mb-2`}>
                                <Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                            </div>
                            <h5 className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-900 mb-0.5">{feature.titulo}</h5>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">{feature.descripcion}</p>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onIrAlInicio}
                className="w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base text-white bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 lg:cursor-pointer flex items-center justify-center gap-2"
            >
                <Home className="w-4 h-4" />
                Ir al inicio
            </button>
        </>
    );
}

// =============================================================================
// VARIANTE COMERCIAL
// =============================================================================

function ContenidoComercial({ onIrAlInicio, onCompletarPerfil }: { onIrAlInicio: () => void; onCompletarPerfil?: () => void }) {
    return (
        <>
            <div className="text-center mb-4 lg:mb-4 2xl:mb-6">
                <h4 className="text-lg lg:text-lg 2xl:text-xl font-extrabold text-slate-900 mb-1">
                    Configuremos tu negocio
                </h4>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                    Solo lo básico para que tu negocio sea visible
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-3 2xl:gap-4 mb-5 lg:mb-6 2xl:mb-8">
                <div className="bg-slate-200 border-2 border-slate-300 rounded-lg p-4 lg:p-3 2xl:p-4 text-center">
                    <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 lg:mb-1.5 2xl:mb-2 shadow-md">
                        <Edit3 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-800" />
                    </div>
                    <h5 className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-900 mb-0.5">100% Editable</h5>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-snug">
                        Puedes cambiar todo después en <span className="whitespace-nowrap">Business Studio</span>
                    </p>
                </div>

                <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-4 lg:p-3 2xl:p-4 text-center">
                    <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 lg:mb-1.5 2xl:mb-2 shadow-md">
                        <TrendingUp className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-600" />
                    </div>
                    <h5 className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-900 mb-0.5">Agrega más después</h5>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-snug">
                        Completa tu perfil a tu ritmo
                    </p>
                </div>
            </div>

            <div className="space-y-2.5 lg:space-y-2 2xl:space-y-2.5">
                {onCompletarPerfil && (
                    <button
                        onClick={onCompletarPerfil}
                        className="w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base text-white bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 lg:cursor-pointer flex items-center justify-center gap-2"
                    >
                        Comenzar configuración
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={onIrAlInicio}
                    className="w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base text-slate-700 bg-slate-200 border-2 border-slate-300 hover:bg-slate-300 lg:cursor-pointer flex items-center justify-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    {onCompletarPerfil ? 'Saltar por ahora' : 'Ir al inicio'}
                </button>
            </div>
        </>
    );
}

export default ModalBienvenida;
