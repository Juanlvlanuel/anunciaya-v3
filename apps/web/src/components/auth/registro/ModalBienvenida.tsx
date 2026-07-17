/**
 * ModalBienvenida.tsx
 * ====================
 * Modal informativo post-registro con 2 variantes (Personal y Comercial).
 * Estilo unificado con la landing page.
 *
 * Ubicación: apps/web/src/components/auth/registro/ModalBienvenida.tsx
 */

import { Check, Edit3, ArrowRight, Home, Search, Tag } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

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

    const titulo = tipo === 'personal'
        ? `¡Bienvenido a AnunciaYA, ${nombre}!`
        : `¡Perfecto, ${nombre}!`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop oscuro con blur — hace que el modal flote */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 lg:px-6 2xl:px-8 pt-7 lg:pt-8 2xl:pt-10 pb-4 lg:pb-5 2xl:pb-6 text-center">
                    {/* Check verde con halo */}
                    <div className="inline-flex items-center justify-center mb-4 lg:mb-5">
                        <div className="w-16 h-16 lg:w-[72px] lg:h-[72px] 2xl:w-20 2xl:h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 rounded-full bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/30">
                                <Check className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white stroke-3" />
                            </div>
                        </div>
                    </div>

                    {/* Título + confirmación */}
                    <h3 className="text-xl lg:text-xl 2xl:text-2xl font-extrabold text-slate-900 mb-1.5">
                        {titulo}
                    </h3>
                    <p className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-emerald-600">
                        <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                        Tu cuenta se creó correctamente
                    </p>
                </div>

                {/* Separador */}
                <div className="mx-5 lg:mx-6 2xl:mx-8 h-px bg-slate-200" />

                {/* Contenido según tipo */}
                <div className="px-5 lg:px-6 2xl:px-8 pt-5 lg:pt-5 2xl:pt-6 pb-6 lg:pb-6 2xl:pb-8">
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
        { icon: Search, color: 'bg-blue-600', titulo: 'Busca negocios', descripcion: 'Encuentra lo que necesitas' },
        { icon: Tag, color: 'bg-amber-500', titulo: 'Ofertas locales', descripcion: 'Descubre promociones' },
        { icon: MapPin, color: 'bg-emerald-600', titulo: 'Cerca de ti', descripcion: 'Negocios en tu zona' },
    ];

    return (
        <>
            <p className="text-center text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 mb-4 lg:mb-4 2xl:mb-5">
                Con AnunciaYA puedes:
            </p>

            <div className="grid grid-cols-3 gap-3 lg:gap-3 2xl:gap-4 mb-5 lg:mb-6 2xl:mb-8">
                {features.map((feature, index) => {
                    const Icono = feature.icon;
                    return (
                        <div key={index} className="text-center">
                            <div className={`w-12 h-12 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-2 2xl:mb-2.5 shadow-sm`}>
                                <Icono className="w-5 h-5 2xl:w-5 2xl:h-5 text-white" />
                            </div>
                            <h5 className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-900 mb-0.5">{feature.titulo}</h5>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-snug">{feature.descripcion}</p>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onIrAlInicio}
                className="w-full h-11 lg:h-11 2xl:h-12 rounded-xl font-semibold text-base lg:text-sm 2xl:text-base text-white bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 lg:cursor-pointer flex items-center justify-center gap-2"
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
                <div className="text-center">
                    <div className="w-12 h-12 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-2 2xl:mb-2.5 shadow-sm">
                        <Edit3 className="w-5 h-5 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <h5 className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-900 mb-0.5">100% editable</h5>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-snug">
                        Cambia todo después en <span className="whitespace-nowrap">Business Studio</span>
                    </p>
                </div>

                <div className="text-center">
                    <div className="w-12 h-12 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-2 2xl:mb-2.5 shadow-sm">
                        <TrendingUp className="w-5 h-5 2xl:w-5 2xl:h-5 text-white" />
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
                        className="w-full h-11 lg:h-11 2xl:h-12 rounded-xl font-semibold text-base lg:text-sm 2xl:text-base text-white bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 lg:cursor-pointer flex items-center justify-center gap-2"
                    >
                        Comenzar configuración
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={onIrAlInicio}
                    className="w-full h-11 lg:h-11 2xl:h-12 rounded-xl font-semibold text-base lg:text-sm 2xl:text-base text-slate-700 bg-slate-200 border-2 border-slate-300 hover:bg-slate-300 lg:cursor-pointer flex items-center justify-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    {onCompletarPerfil ? 'Saltar por ahora' : 'Ir al inicio'}
                </button>
            </div>
        </>
    );
}

export default ModalBienvenida;
