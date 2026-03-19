/**
 * BrandingColumn.tsx
 * ===================
 * Columna izquierda del registro en desktop.
 * Arriba: Logo + texto de bienvenida (fijo).
 * Abajo: Info de cuenta (izq) + imágenes (der) — cambia con el toggle.
 *
 * Ubicación: apps/web/src/components/auth/registro/BrandingColumn.tsx
 */

import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// =============================================================================
// DATOS POR TIPO DE CUENTA
// =============================================================================

const DATOS_CUENTA = {
    personal: {
        imagenes: [
            '/images/secciones/negocios_desktop.webp',
            '/images/secciones/negocios_mobile.webp',
        ],
        colorCheck: 'text-emerald-600',
        featuresKey: 'cta.personal.features',
        tituloKey: 'cta.personal.titulo',
        precioKey: 'cta.personal.precio',
        colorPrecio: 'text-emerald-600',
    },
    comercial: {
        imagenes: [
            '/images/secciones/scanya.webp',
        ],
        colorCheck: 'text-amber-400',
        featuresKey: 'cta.comercial.features',
        tituloKey: 'cta.comercial.titulo',
        precioKey: 'cta.comercial.precio',
        colorPrecio: 'bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent',
    },
} as const;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface BrandingColumnProps {
    tipoCuenta?: 'personal' | 'comercial';
}

export function BrandingColumn({ tipoCuenta = 'personal' }: BrandingColumnProps) {
    const { t } = useTranslation('landing');
    const datos = DATOS_CUENTA[tipoCuenta];
    const esComercial = tipoCuenta === 'comercial';

    return (
        <div className="hidden lg:flex flex-col h-screen overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, #0B358F 40%, #000000 80%)' }}
        >
            {/* ═══ PARTE SUPERIOR: Logo + Texto de bienvenida (fijo) ═══ */}
            <div className="flex flex-col items-center justify-center px-6 lg:px-8 2xl:px-12 pt-8 lg:pt-20 2xl:pt-24 pb-4 lg:pb-3 2xl:pb-6">
                {/* Logo */}
                <Link to="/" className="mb-4 lg:mb-3 2xl:mb-6">
                    <img
                        src="/logo-anunciaya-blanco.webp"
                        alt="AnunciaYA"
                        className="h-16 lg:h-20 2xl:h-24 object-contain"
                    />
                </Link>

                {/* Texto */}
                <p className="text-lg lg:text-xl 2xl:text-2xl font-medium text-white/70 text-center">
                    Únete y Gana{' '}
                    <span className="font-extrabold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent">
                        Recompensas
                    </span>
                    {' '}por comprar
                </p>
                <p className="text-xl lg:text-2xl 2xl:text-3xl font-bold text-white text-center">
                    en Negocios de tu Comunidad.
                </p>
            </div>

            {/* ═══ PARTE INFERIOR: Imágenes (izq) + Info (der) — dinámico ═══ */}
            <div className="grid grid-cols-[1fr_1.2fr] 2xl:grid-cols-[1fr_1.3fr] min-h-0 h-[55%] 2xl:h-[60%] mt-auto">
                {/* Imágenes */}
                <div className="flex flex-col h-full">
                    {datos.imagenes.map((src, i) => (
                        <div key={i} className="flex-1 overflow-hidden group">
                            <img
                                src={src}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-110 duration-500"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>

                {/* Info de cuenta */}
                <div className="flex flex-col justify-start pt-6 lg:pt-4 2xl:pt-8 px-6 lg:px-5 2xl:px-8">
                    {/* Título */}
                    <h2 className="text-3xl lg:text-2xl 2xl:text-4xl font-extrabold text-white tracking-tight">
                        {t(datos.tituloKey)}
                    </h2>

                    {/* Precio */}
                    <div className="mt-1">
                        {esComercial ? (
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl lg:text-2xl 2xl:text-4xl font-extrabold ${datos.colorPrecio}`}>
                                    {t(datos.precioKey)}
                                </span>
                                <span className="px-3 py-0.5 bg-amber-500 text-white text-sm lg:text-sm 2xl:text-base font-bold rounded-full">
                                    {t('cta.comercial.badge')}
                                </span>
                            </div>
                        ) : (
                            <div>
                                <span className={`text-3xl lg:text-2xl 2xl:text-4xl font-extrabold ${datos.colorPrecio}`}>
                                    {t(datos.precioKey)}
                                </span>
                                <span className="text-lg lg:text-base 2xl:text-xl font-medium text-white/60 ml-2">
                                    {t('cta.personal.siempre')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Features */}
                    <ul className="mt-5 lg:mt-4 2xl:mt-6 space-y-2.5 lg:space-y-2 2xl:space-y-3">
                        {Object.values(t(datos.featuresKey, { returnObjects: true }) as Record<string, string>).map((feat, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <CheckCircle2 className={`w-5 h-5 2xl:w-6 2xl:h-6 ${datos.colorCheck} shrink-0 mt-0.5`} />
                                <span className={`text-base lg:text-sm 2xl:text-base font-medium ${esComercial && i === 6 ? 'text-amber-300 font-semibold' : 'text-white/80'}`}>
                                    {feat}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* Extra info */}
                    {esComercial ? (
                        <div className="mt-4 lg:mt-3 2xl:mt-5 pt-4 lg:pt-3 2xl:pt-5 border-t border-white/15">
                            <span className="text-3xl lg:text-2xl 2xl:text-4xl font-bold text-white">
                                $449<span className="text-lg lg:text-base 2xl:text-xl font-medium text-white/50">/mes</span>
                            </span>
                            <p className="text-base lg:text-sm 2xl:text-base font-medium text-white/50 mt-1">
                                {t('cta.trial.cancela')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 lg:gap-3 2xl:gap-5 mt-4 lg:mt-3 2xl:mt-5 pt-4 lg:pt-3 2xl:pt-5 border-t border-white/15">
                            <img src="/CardYA.webp" alt="CardYA" className="h-20 lg:h-18 2xl:h-28 w-auto drop-shadow-xl" />
                            <div className="flex flex-col">
                                <span className="text-lg lg:text-base 2xl:text-xl font-extrabold text-white leading-tight">
                                    Una tarjeta
                                </span>
                                <span className="text-base lg:text-sm 2xl:text-lg font-bold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent leading-tight">
                                    Múltiples recompensas
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BrandingColumn;
