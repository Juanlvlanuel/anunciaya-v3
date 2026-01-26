// Declaración de tipo para Google Identity Services
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: (callback?: (notification: any) => void) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    disableAutoSelect: () => void;
                };
            };
        };
    }
}
/**
 * PaginaLanding.tsx
 * ==================
 * Página principal pública de AnunciaYA.
 * Versión 8 - Badge sin icono, CTA actualizado
 * 
 * Ubicación: apps/web/src/pages/public/PaginaLanding.tsx
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    ShoppingCart,
    Gift,
    Ticket,
    MapPin,
    Users,
    Star,
    TrendingUp,
    ArrowRight,
    Sparkles,
    Calendar,
    MessageCircle,
    ChevronUp,
    Mail,
    LucideIcon,
    CreditCard,
    Clock,
    UserCircle,
    Building,
    Check,
    Megaphone,
} from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { SelectorIdioma } from '../../components/ui/SelectorIdioma';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// DATOS
// =============================================================================

interface SeccionData {
    id: string;
    tituloKey: string;
    subtituloKey: string;
    descripcionKey: string;
    icono: LucideIcon;
    iconBg: string;
    statsKey: string;
    highlightKey: string;
    imagen: string;
}

// 4 Secciones principales
const SECCIONES: SeccionData[] = [
    {
        id: 'negocios',
        tituloKey: 'secciones.negocios.titulo',
        subtituloKey: 'secciones.negocios.subtitulo',
        descripcionKey: 'secciones.negocios.descripcion',
        icono: Store,
        iconBg: 'bg-blue-500',
        statsKey: 'secciones.negocios.stats',
        highlightKey: 'secciones.negocios.highlight',
        imagen: '/images/secciones/negocios-locales.webp',
    },
    {
        id: 'marketplace',
        tituloKey: 'secciones.marketplace.titulo',
        subtituloKey: 'secciones.marketplace.subtitulo',
        descripcionKey: 'secciones.marketplace.descripcion',
        icono: ShoppingCart,
        iconBg: 'bg-emerald-500',
        statsKey: 'secciones.marketplace.stats',
        highlightKey: 'secciones.marketplace.highlight',
        imagen: '/images/secciones/marketplace.webp',
    },
    {
        id: 'ofertas',
        tituloKey: 'secciones.ofertas.titulo',
        subtituloKey: 'secciones.ofertas.subtitulo',
        descripcionKey: 'secciones.ofertas.descripcion',
        icono: Gift,
        iconBg: 'bg-orange-500',
        statsKey: 'secciones.ofertas.stats',
        highlightKey: 'secciones.ofertas.highlight',
        imagen: '/images/secciones/ofertas.webp',
    },
    {
        id: 'dinamicas',
        tituloKey: 'secciones.dinamicas.titulo',
        subtituloKey: 'secciones.dinamicas.subtitulo',
        descripcionKey: 'secciones.dinamicas.descripcion',
        icono: Ticket,
        iconBg: 'bg-purple-500',
        statsKey: 'secciones.dinamicas.stats',
        highlightKey: 'secciones.dinamicas.highlight',
        imagen: '/images/secciones/dinamicas.webp',
    },
];

// Slides del Onboarding Móvil - Actualizados
const ONBOARDING_SLIDES = [
    {
        id: 'puntos',
        tituloKey: 'onboarding.negocios.titulo',
        subtituloKey: 'onboarding.negocios.subtitulo',
        imagen: '/images/onboarding/puntos.webp',
    },
    {
        id: 'tarjeta',
        tituloKey: 'onboarding.marketplace.titulo',
        subtituloKey: 'onboarding.marketplace.subtitulo',
        imagen: '/images/onboarding/tarjeta.webp',
    },
    {
        id: 'sorteos',
        tituloKey: 'onboarding.chatya.titulo',
        subtituloKey: 'onboarding.chatya.subtitulo',
        imagen: '/images/onboarding/sorteos.webp',
    },
    {
        id: 'marketplace',
        tituloKey: 'onboarding.marketplaceVenta.titulo',
        subtituloKey: 'onboarding.marketplaceVenta.subtitulo',
        imagen: '/images/onboarding/marketplace.webp',
    },
    {
        id: 'comunidad',
        tituloKey: 'onboarding.gratis.titulo',
        subtituloKey: 'onboarding.gratis.subtitulo',
        imagen: '/images/onboarding/comunidad.webp',
    },
];

// Beneficios actualizados
const BENEFICIOS = [
    {
        icono: CreditCard,
        tituloKey: 'beneficios.items.chat.titulo',
        descripcionKey: 'beneficios.items.chat.descripcion',
        color: 'bg-blue-500',
    },
    {
        icono: MessageCircle,
        tituloKey: 'beneficios.items.descuentos.titulo',
        descripcionKey: 'beneficios.items.descuentos.descripcion',
        color: 'bg-emerald-500',
    },
    {
        icono: MapPin,
        tituloKey: 'beneficios.items.todoEnUno.titulo',
        descripcionKey: 'beneficios.items.todoEnUno.descripcion',
        color: 'bg-orange-500',
    },
];

// =============================================================================
// COMPONENTE: NAVBAR
// =============================================================================

function NavbarLanding({ iniciarLoginGoogle }: { iniciarLoginGoogle: () => void }) {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();
    const { abrirModalLogin } = useUiStore();
    const [mostrarScrollTop, setMostrarScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setMostrarScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            {/* ========== DESKTOP HEADER ========== */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-white/95 via-blue-50/95 to-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm hidden lg:block">
                <div className="hidden md:block">
                    <div className="w-full px-4 lg:px-8 2xl:px-16">
                        <div className="flex items-center justify-between h-16 2xl:h-20">
                            {/* Logo */}
                            <motion.div
                                className="flex items-center cursor-pointer"
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.15 }}
                                onClick={scrollToTop}
                            >
                                <img
                                    src="/logo-anunciaya.webp"
                                    alt="AnunciaYA - Tu Comunidad Local"
                                    className="h-10 2xl:h-14 w-auto object-contain"
                                />
                            </motion.div>

                            {/* Auth Buttons + Selector Idioma */}
                            <div className="flex items-center gap-2 2xl:gap-3">
                                {/* Selector de Idioma */}
                                <SelectorIdioma />

                                <div className="w-px h-6 2xl:h-8 bg-gray-300 mx-1" />

                                <motion.button
                                    onClick={iniciarLoginGoogle}
                                    className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-5 py-2 2xl:py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 font-medium text-sm 2xl:text-base transition-all duration-150 shadow-sm"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <svg className="w-4 h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>{t('navbar.google')}</span>
                                </motion.button>

                                <span className="text-gray-800 text-base 2xl:text-xl">{t('navbar.o')}</span>

                                <motion.button
                                    onClick={abrirModalLogin}
                                    className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-5 py-2 2xl:py-3 bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-xl font-medium text-sm 2xl:text-base transition-all duration-150 shadow-sm"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Mail className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                    <span>{t('navbar.iniciarSesion')}</span>
                                </motion.button>

                                <motion.button
                                    onClick={() => navigate('/registro')}
                                    className="flex items-center gap-2 2xl:gap-2.5 px-4 2xl:px-6 py-2 2xl:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm 2xl:text-base transition-all duration-150 shadow-md"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Users className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                    <span>{t('navbar.registrate')}</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Header - Sin hamburguesa (solo logo centrado) */}
                <div className="md:hidden px-5">
                    <div className="flex items-center justify-center h-20">
                        <motion.div
                            className="flex items-center cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.15 }}
                            onClick={scrollToTop}
                        >
                            <img
                                src="/logo-anunciaya.webp"
                                alt="AnunciaYA"
                                className="h-11 w-auto object-contain"
                            />
                        </motion.div>
                    </div>
                </div>
            </header>

            {/* ========== SELECTOR IDIOMA FLOTANTE - SOLO MÓVIL ========== */}
            <div className="fixed top-4 right-4 z-50 lg:hidden">
                <SelectorIdioma size="sm" />
            </div>

            {/* Scroll to Top */}
            <AnimatePresence>
                {mostrarScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onClick={scrollToTop}
                        className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-150 flex items-center justify-center"
                    >
                        <ChevronUp className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}

// =============================================================================
// COMPONENTE: HERO SECTION - Nuevo concepto de recompensas
// =============================================================================

function HeroSection({ iniciarLoginGoogle }: { iniciarLoginGoogle: () => void }) {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();
    const { abrirModalLogin } = useUiStore();
    const [seccionActiva, setSeccionActiva] = useState(0);

    // Usar el máximo de slides entre móvil y desktop
    const maxSlides = Math.max(SECCIONES.length, ONBOARDING_SLIDES.length);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeccionActiva((prev) => (prev + 1) % maxSlides);
        }, 5000);
        return () => clearInterval(interval);
    }, [maxSlides]);

    // Acceder con módulo para evitar índices fuera de rango
    const seccionActual = SECCIONES[seccionActiva % SECCIONES.length];
    const IconoActivo = seccionActual.icono;

    return (
        <section className="relative pt-24 lg:pt-20 2xl:pt-28 pb-12 lg:pb-8 2xl:pb-24 px-4 md:px-6 lg:px-8 2xl:px-12 min-h-screen lg:min-h-[calc(100vh-64px)] 2xl:min-h-[90vh] flex items-start md:items-center">
            {/* Background - Azulado grisáceo */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50/50 to-gray-100 overflow-hidden" />

            {/* Floating Particles - Solo desktop */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-400/20 rounded-full"
                        style={{
                            left: `${20 + i * 15}%`,
                            top: `${30 + (i % 2) * 40}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 3 + i * 0.5,
                            repeat: Infinity,
                            delay: i * 0.3,
                        }}
                    />
                ))}
            </div>

            {/* Badge Desktop - Con gradiente y iconos animados */}
            <div className="absolute top-[95px] 2xl:top-28 left-0 right-0 hidden md:flex justify-center z-10 px-5">
                <motion.div
                    className="inline-flex items-center gap-2 2xl:gap-3 px-5 2xl:px-8 py-2.5 2xl:py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-full shadow-lg shadow-purple-500/25"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <CreditCard className="w-4 h-4 2xl:w-6 2xl:h-6 text-white" />
                    </motion.div>
                    <span className="text-white font-semibold text-xs 2xl:text-lg">
                        {t('hero.badgeParte1')}
                    </span>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Sparkles className="w-4 h-4 2xl:w-6 2xl:h-6 text-yellow-300" />
                    </motion.div>
                </motion.div>
            </div>

            <div className="relative w-full max-w-[1600px] mx-auto z-10 mt-0 lg:mt-10 2xl:mt-16">

                {/* ========== MOBILE LAYOUT - Onboarding Estilo App ========== */}
                <div className="lg:hidden fixed inset-0 flex flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white pt-6 overflow-hidden">

                    {/* Burbujas animadas - detrás del contenido */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <div className="absolute w-5 h-5 rounded-full bg-blue-400/20 top-[8%] right-[15%]" style={{ animation: 'float1 5s ease-in-out infinite' }} />
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-blue-400/20 top-[20%] left-[10%]" style={{ animation: 'float2 6s ease-in-out infinite' }} />
                        <div className="absolute w-4 h-4 rounded-full bg-blue-400/20 top-[35%] right-[8%]" style={{ animation: 'float3 4s ease-in-out infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400/20 top-[50%] left-[15%]" style={{ animation: 'float4 5s ease-in-out infinite' }} />
                        <div className="absolute w-4 h-4 rounded-full bg-blue-400/20 top-[65%] right-[20%]" style={{ animation: 'float5 4s ease-in-out infinite' }} />
                        <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-400/20 top-[75%] left-[8%]" style={{ animation: 'float6 5s ease-in-out infinite' }} />
                        <div className="absolute w-5 h-5 rounded-full bg-blue-400/20 top-[15%] right-[30%]" style={{ animation: 'float7 6s ease-in-out infinite' }} />
                        <div className="absolute w-2 h-2 rounded-full bg-blue-400/20 top-[45%] left-[25%]" style={{ animation: 'float8 4s ease-in-out infinite' }} />
                    </div>
                    {/* Logo centrado */}
                    <div className="flex justify-center pt-2 pb-1">
                        <motion.div
                            className="flex items-center"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <img
                                src="/logo-anunciaya.webp"
                                alt="AnunciaYA"
                                className="h-14 w-auto"
                            />
                        </motion.div>
                    </div>

                    {/* Badge Móvil - Con gradiente y iconos animados */}
                    <motion.div
                        className="flex justify-center mt-8 mb-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-full shadow-lg shadow-purple-500/25">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <CreditCard className="w-4 h-4 text-white" />
                            </motion.div>
                            <span className="text-white font-semibold text-sm">
                                {t('hero.badgeParte1')}
                            </span>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Sparkles className="w-4 h-4 text-yellow-300" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Área de slides */}
                    <div className="flex-1 flex flex-col justify-center px-5 relative z-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={seccionActiva}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center"
                            >
                                {/* Imagen del slide - MÁS GRANDE */}
                                <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-xl mb-5">
                                    <img
                                        src={ONBOARDING_SLIDES[seccionActiva % ONBOARDING_SLIDES.length].imagen}
                                        alt={t(ONBOARDING_SLIDES[seccionActiva % ONBOARDING_SLIDES.length].tituloKey)}
                                        className="w-full h-64 sm:h-72 object-cover"
                                    />
                                </div>

                                {/* Título */}
                                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
                                    {t(ONBOARDING_SLIDES[seccionActiva % ONBOARDING_SLIDES.length].tituloKey)}
                                </h1>

                                {/* Subtítulo */}
                                <p className="text-base text-gray-500 text-center max-w-xs mb-4">
                                    {t(ONBOARDING_SLIDES[seccionActiva % ONBOARDING_SLIDES.length].subtituloKey)}
                                </p>

                                {/* Mini badges - Actualizados */}
                                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 shadow-sm">
                                        <Gift className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-semibold text-purple-700">{t('hero.beneficio1')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm">
                                        <Megaphone className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-700">{t('hero.beneficio2')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 shadow-sm">
                                        <Ticket className="w-4 h-4 text-orange-600" />
                                        <span className="text-sm font-semibold text-orange-700">{t('hero.beneficio3')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dots de navegación */}
                        <div className="flex justify-center gap-2 mt-6">
                            {ONBOARDING_SLIDES.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSeccionActiva(index)}
                                    className={`h-2 rounded-full transition-all duration-200 ${index === seccionActiva
                                        ? 'w-6 bg-gradient-to-r from-blue-600 to-blue-700'
                                        : 'w-2 bg-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Botones fijos abajo */}
                    <div className="px-5 pb-8 pt-4 space-y-2.5 bg-gradient-to-t from-white via-white to-transparent">
                        {/* Fila 1: Google + Iniciar Sesión */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={iniciarLoginGoogle}
                                className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium shadow-sm"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {t('navbar.google')}
                            </button>

                            <button
                                onClick={abrirModalLogin}
                                className="flex items-center justify-center gap-2 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-sm font-medium text-blue-700"
                            >
                                <Mail className="w-5 h-5" />
                                {t('navbar.iniciarSesion')}
                            </button>
                        </div>

                        {/* Fila 2: Registrarse */}
                        <button
                            onClick={() => navigate('/registro')}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
                        >
                            <Users className="w-5 h-5" />
                            {t('navbar.registrate')}
                        </button>
                    </div>
                </div>

                {/* ========== DESKTOP LAYOUT ========== */}
                <div className="hidden lg:grid lg:grid-cols-[1fr_auto] gap-6 2xl:gap-16 items-center justify-center max-w-[1100px] 2xl:max-w-[1600px] mx-auto">
                    {/* Left Content */}
                    <div className="space-y-4 2xl:space-y-7 text-center lg:text-left">
                        {/* Título - Nuevo concepto */}
                        <motion.h1
                            className="text-4xl sm:text-5xl lg:text-5xl 2xl:text-8xl font-bold leading-tight 2xl:leading-none"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="text-slate-900">{t('hero.titulo1')}</span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                                {t('hero.titulo2')}
                            </span>
                            <br />
                            <span className="text-slate-900">{t('hero.titulo3')}</span>
                            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"> {t('hero.titulo4')}</span>
                        </motion.h1>

                        {/* Subtítulo - Nuevo concepto */}
                        <motion.p
                            className="text-lg lg:text-2xl 2xl:text-3xl text-gray-600"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <span className="font-bold text-slate-800">{t('hero.subtitulo1')}</span>
                            <br />
                            {t('hero.subtitulo2')} <span className="font-bold text-blue-600">{t('hero.subtitulo3')}</span>
                            <br />
                            {t('hero.subtitulo4')} <span className="font-bold text-slate-800">{t('hero.subtitulo5')}</span> {t('hero.subtitulo6')} <span className="font-bold text-purple-600">{t('hero.subtitulo7')}</span>
                        </motion.p>

                        {/* CTA Button - Solo primario */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <button
                                onClick={() => navigate('/registro')}
                                className="inline-flex items-center justify-center gap-2 2xl:gap-2.5 px-6 2xl:px-10 py-3 2xl:py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold text-base 2xl:text-xl shadow-lg hover:shadow-xl transition-all duration-150"
                            >
                                <Sparkles className="w-5 h-5 2xl:w-6 2xl:h-6" />
                                <span>{t('hero.botonPrimario')}</span>
                                <ArrowRight className="w-5 h-5 2xl:w-6 2xl:h-6" />
                            </button>
                        </motion.div>

                        {/* Beneficios destacados - Actualizados */}
                        <motion.div
                            className="flex flex-wrap items-center justify-center lg:justify-start gap-2 2xl:gap-5 pt-2 2xl:pt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <div className="flex items-center gap-1.5 2xl:gap-3 bg-purple-50 px-3 2xl:px-5 py-2 2xl:py-3 rounded-xl border border-purple-200">
                                <Gift className="w-5 h-5 2xl:w-7 2xl:h-7 text-purple-600" />
                                <span className="text-sm 2xl:text-xl font-semibold text-purple-700">{t('hero.beneficio1')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 2xl:gap-3 bg-emerald-50 px-3 2xl:px-5 py-2 2xl:py-3 rounded-xl border border-emerald-200">
                                <Megaphone className="w-5 h-5 2xl:w-7 2xl:h-7 text-emerald-600" />
                                <span className="text-sm 2xl:text-xl font-semibold text-emerald-700">{t('hero.beneficio2')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 2xl:gap-3 bg-orange-50 px-3 2xl:px-5 py-2 2xl:py-3 rounded-xl border border-orange-200">
                                <Ticket className="w-5 h-5 2xl:w-7 2xl:h-7 text-orange-600" />
                                <span className="text-sm 2xl:text-xl font-semibold text-orange-700">{t('hero.beneficio3')}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Content - Carrusel Desktop */}
                    <div className="relative mt-4 lg:mt-0 w-[520px] 2xl:w-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={seccionActiva}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="relative"
                            >
                                <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="relative h-[320px] 2xl:h-[520px]">
                                        <img
                                            src={seccionActual.imagen}
                                            alt={t(seccionActual.tituloKey)}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />

                                        {/* Icono flotante superior derecha */}
                                        <motion.div
                                            className="absolute top-3 2xl:top-4 right-3 2xl:right-4 w-9 h-9 2xl:w-14 2xl:h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl 2xl:rounded-2xl flex items-center justify-center shadow-lg z-20"
                                            animate={{
                                                y: [0, -15, 0, -8, 0, -3, 0],
                                                scale: [1, 1.1, 1, 1.05, 1, 1.02, 1]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                repeatDelay: 1,
                                                ease: "easeOut"
                                            }}
                                        >
                                            <Gift className="w-4 h-4 2xl:w-7 2xl:h-7 text-white" />
                                        </motion.div>

                                        {/* Iconos flotantes inferiores */}
                                        <motion.div
                                            className="absolute bottom-3 2xl:bottom-4 left-3 2xl:left-4 w-9 h-9 2xl:w-14 2xl:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg 2xl:rounded-xl flex items-center justify-center shadow-lg z-30"
                                            animate={{
                                                y: [0, -12, 0, -6, 0, -2, 0],
                                                scale: [1, 1.15, 1, 1.08, 1, 1.03, 1]
                                            }}
                                            transition={{
                                                duration: 1.8,
                                                repeat: Infinity,
                                                repeatDelay: 1.5,
                                                ease: "easeOut"
                                            }}
                                        >
                                            <TrendingUp className="w-4 h-4 2xl:w-7 2xl:h-7 text-white" />
                                        </motion.div>

                                        <motion.div
                                            className="absolute bottom-3 2xl:bottom-4 right-3 2xl:right-4 w-9 h-9 2xl:w-14 2xl:h-14 bg-gradient-to-r from-violet-500 to-pink-500 rounded-lg 2xl:rounded-xl flex items-center justify-center shadow-lg z-30"
                                            animate={{
                                                y: [0, -10, 0, -5, 0, -2, 0],
                                                scale: [1, 1.12, 1, 1.06, 1, 1.02, 1]
                                            }}
                                            transition={{
                                                duration: 2.2,
                                                repeat: Infinity,
                                                repeatDelay: 0.8,
                                                ease: "easeOut"
                                            }}
                                        >
                                            <Star className="w-4 h-4 2xl:w-7 2xl:h-7 text-white" />
                                        </motion.div>

                                        {/* Header con título */}
                                        <div className="absolute top-3 2xl:top-4 left-3 2xl:left-4 right-14 2xl:right-20 z-10">
                                            <div className="flex items-center gap-2 2xl:gap-3">
                                                <div className={`w-9 h-9 2xl:w-14 2xl:h-14 ${seccionActual.iconBg} rounded-xl 2xl:rounded-2xl flex items-center justify-center shadow-lg`}>
                                                    <IconoActivo className="w-4 h-4 2xl:w-7 2xl:h-7 text-white" />
                                                </div>
                                                <h4
                                                    className="font-bold text-lg 2xl:text-3xl text-slate-900"
                                                    style={{
                                                        textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white'
                                                    }}
                                                >
                                                    {t(seccionActual.tituloKey)}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 2xl:p-4 z-10">
                                            {/* Badge Chat Integrado - Arriba izquierda */}
                                            <div className="absolute -top-10 2xl:-top-14 left-3 2xl:left-4">
                                                <div className="inline-flex items-center px-3 2xl:px-5 py-1.5 2xl:py-2.5 bg-gradient-to-r from-blue-600 to-blue-900 rounded-full shadow-md">
                                                    <MessageCircle className="w-3 h-3 2xl:w-5 2xl:h-5 text-white mr-1.5 2xl:mr-2" />
                                                    <span className="text-xs 2xl:text-base font-bold text-white">
                                                        {t('secciones.chatIntegrado')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Badge highlight - Arriba derecha */}
                                            <div className="absolute -top-10 2xl:-top-14 right-3 2xl:right-4">
                                                <div className="inline-flex items-center px-3 2xl:px-5 py-1.5 2xl:py-2.5 bg-gradient-to-r from-emerald-50/95 to-green-50/95 backdrop-blur-sm border-2 border-emerald-200 rounded-full shadow-md">
                                                    <div className="w-2 h-2 2xl:w-3.5 2xl:h-3.5 bg-emerald-500 rounded-full animate-pulse mr-1.5 2xl:mr-3" />
                                                    <span className="text-xs 2xl:text-base font-bold text-emerald-700">
                                                        {t(seccionActual.highlightKey)}
                                                    </span>
                                                    <Sparkles className="w-3 h-3 2xl:w-5 2xl:h-5 text-emerald-500 ml-1.5 2xl:ml-2.5" />
                                                </div>
                                            </div>

                                            <div className="bg-white/30 backdrop-blur-sm rounded-xl 2xl:rounded-2xl p-3 2xl:p-5 shadow-sm text-center">
                                                <h3
                                                    className="text-base 2xl:text-2xl font-bold leading-relaxed mb-1 2xl:mb-3 text-slate-900"
                                                    style={{
                                                        textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white'
                                                    }}
                                                >
                                                    {t(seccionActual.subtituloKey)}
                                                </h3>

                                                <p
                                                    className="font-semibold text-sm 2xl:text-xl leading-snug text-black"
                                                    style={{ textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white' }}
                                                    dangerouslySetInnerHTML={{ __html: t(seccionActual.descripcionKey) }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Dots Desktop */}
                        <div className="flex justify-center mt-4 2xl:mt-10 gap-2 2xl:gap-4">
                            {SECCIONES.map((_, index) => (
                                <motion.button
                                    key={index}
                                    onClick={() => setSeccionActiva(index)}
                                    className={`rounded-full transition-all duration-300 ${index === seccionActiva % SECCIONES.length
                                        ? 'w-8 2xl:w-12 h-2.5 2xl:h-3.5 bg-gradient-to-r from-blue-500 to-purple-500'
                                        : 'w-2.5 2xl:w-3.5 h-2.5 2xl:h-3.5 bg-gray-300 hover:bg-gray-400'
                                        }`}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator - Solo desktop - Posición fija en viewport */}
            <div className="hidden lg:block absolute bottom-2 2xl:bottom-8 left-0 right-0 z-30">
                <motion.div
                    className="flex justify-center"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="flex flex-col items-center gap-1 2xl:gap-2">
                        <span className="text-xs 2xl:text-base font-medium text-gray-600 bg-white/70 px-2 2xl:px-3 py-0.5 2xl:py-1 rounded-full backdrop-blur-sm">{t('hero.scrollIndicador')}</span>
                        <div className="w-6 h-9 2xl:w-8 2xl:h-12 border-2 border-blue-500 rounded-full flex justify-center pt-1.5 2xl:pt-2 bg-white/80 backdrop-blur-sm shadow-lg">
                            <motion.div
                                className="w-1.5 h-2 2xl:w-2 2xl:h-3 bg-blue-500 rounded-full"
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// =============================================================================
// COMPONENTE: BENEFICIOS (Solo Desktop) - Actualizados
// =============================================================================

function BeneficiosSection() {
    const { t } = useTranslation('landing');
    return (
        <section id="beneficios" className="hidden md:block py-8 2xl:py-12 px-6 lg:px-8 2xl:px-12 bg-gradient-to-br from-slate-100 via-blue-50/50 to-gray-100">
            <div className="w-full max-w-[1600px] mx-auto">
                {/* Título sin subtítulo */}
                <div className="text-center mb-6 2xl:mb-10">
                    <h2 className="text-3xl 2xl:text-5xl font-bold text-gray-900">
                        {t('beneficios.titulo1')} <span className="text-blue-600">Anuncia</span><span className="text-red-500">YA</span>{t('beneficios.titulo3')}
                    </h2>
                </div>

                {/* Grid - 3 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-8">
                    {BENEFICIOS.map((beneficio, index) => {
                        const Icono = beneficio.icono;
                        return (
                            <motion.div
                                key={index}
                                className="bg-white rounded-2xl p-5 2xl:p-8 text-center hover:shadow-lg transition-shadow duration-150"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className={`w-12 h-12 2xl:w-16 2xl:h-16 ${beneficio.color} rounded-2xl flex items-center justify-center mx-auto mb-4 2xl:mb-6`}>
                                    <Icono className="w-6 h-6 2xl:w-8 2xl:h-8 text-white" />
                                </div>
                                <h3 className="text-xl 2xl:text-2xl font-bold text-gray-900 mb-2 2xl:mb-3">{t(beneficio.tituloKey)}</h3>
                                <p className="text-base 2xl:text-xl text-gray-600">{t(beneficio.descripcionKey)}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// COMPONENTE: CTA FINAL - Cards de Planes ACTUALIZADOS CON ANIMACIONES
// =============================================================================

function CtaFinal() {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();

    // Features para Cuenta Personal
    const PERSONAL_FEATURES = [
        'cta.personal.features.f1',
        'cta.personal.features.f2',
        'cta.personal.features.f3',
        'cta.personal.features.f4',
        'cta.personal.features.f5',
        'cta.personal.features.f6',
    ];

    // Features para Cuenta Comercial
    const COMERCIAL_FEATURES = [
        'cta.comercial.features.f1',
        'cta.comercial.features.f2',
        'cta.comercial.features.f3',
        'cta.comercial.features.f4',
        'cta.comercial.features.f5',
        'cta.comercial.features.f6',
        'cta.comercial.features.f7',
    ];

    return (
        <section className="py-8 2xl:py-16 px-5 md:px-6 lg:px-8 2xl:px-12 bg-gradient-to-br from-slate-100 via-blue-50/50 to-gray-100 relative overflow-hidden">
            {/* Decoración animada de fondo */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-sky-200/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
            <motion.div 
                className="absolute top-20 right-20 w-4 h-4 bg-purple-400/30 rounded-full"
                animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div 
                className="absolute bottom-40 left-20 w-3 h-3 bg-blue-400/30 rounded-full"
                animate={{ y: [0, 15, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />

            <div className="relative z-10 max-w-5xl mx-auto">

                {/* Título con icono animado */}
                <div className="text-center mb-8 2xl:mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        <h2 className="text-3xl 2xl:text-5xl font-bold text-gray-900 mb-2 2xl:mb-4">
                            {t('cta.titulo')}
                        </h2>
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ArrowRight className="w-6 h-6 2xl:w-8 2xl:h-8 text-blue-600 rotate-90" />
                        </motion.div>
                    </motion.div>
                    {t('cta.subtitulo') && (
                        <p className="text-gray-600 text-base 2xl:text-lg max-w-lg mx-auto mt-2 2xl:mt-4">
                            {t('cta.subtitulo')}
                        </p>
                    )}
                </div>

                {/* Cards con animaciones */}
                <div className="grid md:grid-cols-2 gap-4 2xl:gap-8 mb-8 2xl:mb-12 max-w-4xl mx-auto">

                    {/* Card Personal */}
                    <motion.div 
                        className="bg-white rounded-2xl p-5 2xl:p-6 shadow-lg border-2 border-emerald-200 hover:border-emerald-400 transition-colors flex flex-col relative overflow-hidden group"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.25)" }}
                    >
                        {/* Efecto de brillo en hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4 2xl:mb-5 pb-3 2xl:pb-4 border-b border-gray-100 relative z-10">
                            <motion.div 
                                className="w-10 h-10 2xl:w-12 2xl:h-12 bg-emerald-100 rounded-xl flex items-center justify-center"
                                whileHover={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 0.5 }}
                            >
                                <UserCircle className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-600" />
                            </motion.div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg 2xl:text-xl">{t('cta.personal.titulo')}</h3>
                                <span className="text-emerald-600 font-bold text-xl 2xl:text-2xl">{t('cta.personal.precio')}</span>
                            </div>
                        </div>

                        {/* Features con animación escalonada */}
                        <ul className="space-y-2 2xl:space-y-3 text-gray-600 mb-4 2xl:mb-6 flex-1 relative z-10 text-sm 2xl:text-base">
                            {PERSONAL_FEATURES.map((featureKey, index) => (
                                <motion.li 
                                    key={index} 
                                    className="flex items-center gap-2 2xl:gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.2 }}
                                        className="flex-shrink-0"
                                    >
                                        <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-500" />
                                    </motion.div>
                                    <span>{t(featureKey)}</span>
                                </motion.li>
                            ))}
                        </ul>

                        {/* Button */}
                        <motion.button
                            onClick={() => navigate('/registro')}
                            className="w-full py-3 2xl:py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-base 2xl:text-lg transition-colors relative z-10 overflow-hidden group/btn"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {t('cta.personal.boton')}
                                <motion.div
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </motion.div>
                            </span>
                        </motion.button>
                    </motion.div>

                    {/* Card Comercial */}
                    <motion.div 
                        className="bg-white rounded-2xl p-5 2xl:p-6 shadow-lg border-2 border-amber-200 hover:border-amber-400 transition-colors relative flex flex-col overflow-hidden group"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(245, 158, 11, 0.25)" }}
                    >
                        {/* Efecto de brillo en hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        
                        {/* Badge POPULAR animado */}
                        <motion.div 
                            className="absolute -top-0 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-b-lg shadow-lg"
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {t('cta.comercial.badge')}
                            </span>
                        </motion.div>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4 2xl:mb-5 pb-3 2xl:pb-4 border-b border-gray-100 relative z-10 mt-2">
                            <motion.div 
                                className="w-10 h-10 2xl:w-12 2xl:h-12 bg-amber-100 rounded-xl flex items-center justify-center"
                                whileHover={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 0.5 }}
                            >
                                <Building className="w-5 h-5 2xl:w-6 2xl:h-6 text-amber-600" />
                            </motion.div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg 2xl:text-xl">{t('cta.comercial.titulo')}</h3>
                                <span className="text-amber-600 font-bold text-xl 2xl:text-2xl">{t('cta.comercial.precio')}</span>
                            </div>
                        </div>

                        {/* Features con animación escalonada */}
                        <ul className="space-y-2 2xl:space-y-3 text-gray-600 mb-4 2xl:mb-6 flex-1 relative z-10 text-sm 2xl:text-base">
                            {COMERCIAL_FEATURES.map((featureKey, index) => (
                                <motion.li 
                                    key={index} 
                                    className="flex items-center gap-2 2xl:gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 + 0.2 }}
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.2 }}
                                        className="flex-shrink-0"
                                    >
                                        <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-amber-500" />
                                    </motion.div>
                                    <span className={index === 6 ? 'font-medium text-amber-700' : ''}>
                                        {t(featureKey)}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>

                        {/* Button */}
                        <motion.button
                            onClick={() => navigate('/registro?plan=comercial')}
                            className="w-full py-3 2xl:py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold text-base 2xl:text-lg transition-all relative z-10"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                {t('cta.comercial.boton')}
                                <motion.div
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </motion.div>
                            </span>
                        </motion.button>
                    </motion.div>
                </div>

                {/* Detalles del trial con animación */}
                <motion.div 
                    className="text-center space-y-2 2xl:space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex flex-wrap justify-center gap-x-4 2xl:gap-x-8 gap-y-2 text-gray-700 text-sm 2xl:text-lg">
                        <motion.span 
                            className="flex items-center gap-2 bg-white/80 px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-full shadow-sm"
                            whileHover={{ scale: 1.05 }}
                        >
                            <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                            {t('cta.trial.dias')}
                        </motion.span>
                        <motion.span 
                            className="flex items-center gap-2 bg-white/80 px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-full shadow-sm"
                            whileHover={{ scale: 1.05 }}
                        >
                            <CreditCard className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                            {t('cta.trial.cancela')}
                        </motion.span>
                    </div>
                    <p className="text-gray-500 text-xs 2xl:text-base max-w-lg mx-auto">
                        {t('cta.trial.nota')}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}

// =============================================================================
// COMPONENTE: FOOTER
// =============================================================================

function FooterLanding() {
    const { t } = useTranslation('landing');
    return (
        <footer className="bg-gray-950 text-white py-8 px-5 md:px-6 lg:px-12">
            <div className="w-full max-w-[1200px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
                    {/* Logo y descripción */}
                    <div className="text-center md:text-left">
                        <img
                            src="/logo-anunciaya.webp"
                            alt="AnunciaYA"
                            className="h-12 mx-auto md:mx-0 mb-3"
                        />
                        <p className="text-gray-400 text-sm max-w-xs mx-auto md:mx-0">
                            {t('footer.slogan')}
                        </p>
                    </div>

                    {/* Contáctanos + Redes */}
                    <div className="text-center md:text-right">
                        <p className="text-white font-semibold mb-3">{t('footer.contactanos')}</p>
                        <div className="flex gap-3 justify-center md:justify-end">
                            {/* Facebook */}
                            <a
                                href="https://facebook.com/anunciaya"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                            {/* WhatsApp */}
                            <a
                                href="https://wa.me/526381234567"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-11 h-11 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-5 border-t border-slate-800 text-center text-gray-500 text-xs">
                    © {new Date().getFullYear()} {t('footer.derechos')}
                </div>
            </div>
        </footer>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaLanding() {
    const navigate = useNavigate();
    const { loginExitoso, setDatosGooglePendiente } = useAuthStore();
    const { cerrarModalLogin, abrirModal2FA } = useUiStore();

    // =========================================================================
    // GOOGLE OAUTH
    // =========================================================================

    const handleGoogleSuccess = async (credential: string) => {
        try {
            const respuesta = await authService.loginConGoogle(credential);

            if (respuesta.success&& respuesta.data) {
                const datos = respuesta.data;

                // Limpiar popups de Google primero
                document.getElementById('google-signin-container')?.remove();
                document.getElementById('google-signin-overlay')?.remove();

                // CASO 1: Usuario nuevo → Guardar en store y redirigir
                if ('usuarioNuevo' in datos && datos.usuarioNuevo === true) {
                    // Guardar datos en el store (incluye el token de Google)
                    setDatosGooglePendiente({
                        googleIdToken: credential,
                        correo: datos.datosGoogle.email,
                        nombre: datos.datosGoogle.nombre,
                        apellidos: datos.datosGoogle.apellidos || '',
                        avatar: datos.datosGoogle.avatar || null,
                    });

                    // Redirigir sin query params
                    navigate('/registro');
                    return;
                }

                // CASO 2: Requiere 2FA → Abrir modal en vista 2FA
                if ('requiere2FA' in datos && datos.requiere2FA === true) {
                    abrirModal2FA(datos.tokenTemporal!, datos.usuario?.correo || '');
                    return;
                }

                // CASO 3: Login exitoso (sin 2FA)
                if ('usuario' in datos && datos.accessToken) {
                    loginExitoso(datos.usuario, datos.accessToken, datos.refreshToken);
                    cerrarModalLogin();
                    notificar.exito(`¡Qué bueno verte, ${datos.usuario.nombre}!`);
                    navigate('/inicio');
                    return;
                }

                // Si llegamos aquí, respuesta inesperada
                notificar.error('Respuesta inesperada del servidor');

            } else {
                notificar.error(respuesta.message || 'Error al iniciar sesión');
            }
        } catch (error: any) {
            console.error('Error en Google OAuth:', error);
            notificar.error(error.response?.data?.mensaje || 'Error al iniciar sesión con Google');
        }
    };

    const iniciarLoginGoogle = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!window.google?.accounts?.id) {
            notificar.error('Error al cargar Google. Recarga la página.');
            return;
        }

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => {
                if (response.credential) {
                    handleGoogleSuccess(response.credential);
                }
            },
            use_fedcm_for_prompt: true,
        });

        // En producción (HTTPS) usar mini-popup, en localhost usar botón renderizado
        const esProduccion = window.location.protocol === 'https:';

        if (esProduccion) {
            // Mini-popup de FedCM (solo funciona con HTTPS)
            window.google.accounts.id.prompt();
        } else {
            // Botón renderizado para localhost
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.zIndex = '9999';
            container.style.background = 'white';
            container.style.padding = '20px';
            container.style.borderRadius = '12px';
            container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            container.id = 'google-signin-container';
            document.body.appendChild(container);

            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.5)';
            overlay.style.zIndex = '9998';
            overlay.id = 'google-signin-overlay';
            overlay.onclick = () => {
                document.getElementById('google-signin-container')?.remove();
                document.getElementById('google-signin-overlay')?.remove();
            };
            document.body.appendChild(overlay);

            window.google.accounts.id.renderButton(container, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 280,
            });
        }
    };

    return (
        <main className="min-h-screen bg-white">
            <NavbarLanding iniciarLoginGoogle={iniciarLoginGoogle} />
            <HeroSection iniciarLoginGoogle={iniciarLoginGoogle} />
            {/* Secciones solo visibles en desktop - SIN BusinessStudioSection */}
            <div className="hidden lg:block">
                <BeneficiosSection />
                <CtaFinal />
                <FooterLanding />
            </div>
        </main>
    );
}