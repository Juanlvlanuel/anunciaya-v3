/**
 * PaginaLanding.tsx
 * ==================
 * Landing page pública de AnunciaYA v3.0
 *
 * DISEÑO:
 * - Hero: fondo azul oscuro (izq) + collage imágenes (der en desktop, oculto en móvil)
 * - Strip de categorías (5 secciones)
 * - Sección unificada: Cuenta Personal (izq) + Cuenta Comercial (der)
 * - Footer negro minimalista
 *
 * PALETA: Azul marca (#0B358F) + Amber (acento) + Slate
 * TOKENS: R1-R12 aplicados. Breakpoints: base lg: 2xl:
 * BILINGÜE: ES/EN con react-i18next (namespace 'landing')
 * AUTH: Google OAuth completo + ModalLogin (global en RootLayout)
 *
 * Ubicación: apps/web/src/pages/public/PaginaLanding.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Tag, ShoppingCart, Store, ArrowRight,
    Users, ChevronDown,
    CheckCircle2, Globe,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const Mail = (p: IconoWrapperProps) => <Icon icon={ICONOS.email} {...p} />;

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import authService from '../../services/authService';
import Tooltip from '../../components/ui/Tooltip';
import { notificar } from '../../utils/notificaciones';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll';

// =============================================================================
// HOOK: Pausar animación cuando no está visible
// =============================================================================

function useVisibleEnViewport<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return { ref, visible };
}

// =============================================================================
// ICONO SVG DE GOOGLE (Multicolor oficial)
// =============================================================================

function IconoGoogle({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

// =============================================================================
// DATOS ESTÁTICOS
// =============================================================================

// Visión v3: 4 secciones públicas en orden B2C → P2P
// (Negocios → Ofertas → Marketplace → Servicios).
// Dinámicas y Empleos quedaron descartados — Servicios absorbe a Empleos.
const SECCIONES_CARRUSEL = [
    { key: 'negocios', icono: Store, color: 'bg-blue-600' },
    { key: 'ofertas', icono: Tag, color: 'bg-blue-600' },
    { key: 'marketplace', icono: ShoppingCart, color: 'bg-blue-600' },
    { key: 'servicios', icono: Wrench, color: 'bg-blue-600' },
] as const;

// =============================================================================
// COMPONENTE: NAVBAR — Responsivo
// =============================================================================

function ToggleIdioma() {
    const { i18n } = useTranslation();
    const idiomaActual = i18n.language?.split('-')[0] || 'es';
    const esEspanol = idiomaActual === 'es';

    return (
        <Tooltip text={esEspanol ? 'English' : 'Español'} position="bottom" autoHide={1500}>
            <button
                onClick={() => i18n.changeLanguage(esEspanol ? 'en' : 'es')}
                className="p-1.5 lg:p-1 2xl:p-2 lg:cursor-pointer hover:scale-110 active:scale-95"
            >
                <Globe className="w-7 h-7 lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-slate-600" />
            </button>
        </Tooltip>
    );
}

function NavbarLanding({
    iniciarLoginGoogle,
}: {
    iniciarLoginGoogle: () => void;
}) {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();
    const { abrirModalLogin } = useUiStore();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-3 lg:px-7 2xl:px-10 py-2 lg:py-1.5 2xl:py-2.5 flex items-center justify-between bg-white/60 backdrop-blur-md border-b-2 border-slate-300 lg:sticky lg:left-auto lg:right-auto">
            {/* Logo — más grande en móvil */}
            <img
                src="/logo-anunciaya-blanco.webp"
                alt="AnunciaYA"
                className="h-14 lg:h-11 2xl:h-14 w-auto shrink-0"
            />

            {/* Acciones */}
            <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2.5">
                {/* Google — siempre visible */}
                <Tooltip text={t('navbar.entrarConGoogle')} position="bottom" autoHide={1500}>
                    <button
                        onClick={iniciarLoginGoogle}
                        className="p-2 lg:p-1 2xl:p-2 lg:cursor-pointer hover:scale-110 active:scale-95"
                    >
                        <IconoGoogle className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8" />
                    </button>
                </Tooltip>

                {/* Entrar — solo desktop */}
                <button
                    onClick={abrirModalLogin}
                    className="hidden lg:flex items-center gap-1.5 lg:px-3 lg:py-1 2xl:px-4 2xl:py-1.5 bg-white border-2 border-slate-300 rounded-full lg:text-sm 2xl:text-base font-semibold text-slate-700 hover:bg-slate-200 lg:cursor-pointer"
                >
                    <Mail className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    <span>{t('navbar.entrar')}</span>
                </button>

                {/* Únete — solo desktop */}
                <button
                    onClick={() => navigate('/registro')}
                    className="hidden lg:flex items-center gap-1.5 lg:px-3 lg:py-1 2xl:px-5 2xl:py-1.5 rounded-full lg:text-sm 2xl:text-base font-bold text-white bg-slate-800 border-2 border-slate-700 lg:cursor-pointer hover:bg-slate-600 hover:border-slate-500"
                >
                    <Users className="lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    {t('navbar.unete')}
                </button>

                {/* Separador — solo desktop */}
                <div className="w-0.5 h-8 lg:h-8 2xl:h-12 hidden lg:block mx-1 2xl:mx-2 rounded-full bg-linear-to-b from-transparent via-slate-400 to-transparent" />

                {/* Idioma — siempre visible */}
                <ToggleIdioma />
            </div>
        </nav>
    );
}

// =============================================================================
// CARRUSEL DEL HERO — móvil y desktop con estilos distintos
// =============================================================================
//
// Visión v3:
// • Móvil → single-item con fade + ken-burns y dots indicadores.
// • Desktop → dos slots verticales lado a lado (puertas corredizas):
//   cada N segundos el slot que toca cambia (alternando izq/der). La salida
//   se desliza al lado externo y la entrada llega desde el lado opuesto.
//
type SlideSeccion = {
    label: string;
    icono: LucideIcon;
    src?: string; // omitir → renderiza placeholder
};

const INTERVALO_SINGLE_MS = 5000;
const INTERVALO_PUERTA_MS = 3500;
const DURACION_ANIMACION_MS = 700;

function useSlidesHero(): readonly SlideSeccion[] {
    const { t } = useTranslation('landing');
    // Orden B2C → P2P para las 4 secciones públicas, seguido de productos diferenciadores.
    return [
        { label: t('secciones.negocios.titulo'), icono: MapPin, src: '/images/secciones/negocios-locales.webp' },
        { label: t('collage.ofertas'), icono: Tag, src: '/images/secciones/oferta.webp' },
        { label: t('secciones.marketplace.titulo'), icono: ShoppingCart, src: '/images/secciones/marketplace.webp' },
        { label: t('collage.servicios'), icono: Wrench, src: '/images/secciones/servicios.webp' },
        { label: t('collage.chatya'), icono: MessageCircle, src: '/images/secciones/chatya-mobile.webp' },
        { label: t('collage.scanya'), icono: Star, src: '/images/secciones/scanya.webp' },
    ];
}

// =============================================================================
// MÓVIL — single-item con fade + dots
// =============================================================================

function CarruselMovilSingleItem({ activo }: { activo: boolean }) {
    const slides = useSlidesHero();
    const [indice, setIndice] = useState(0);

    useEffect(() => {
        if (!activo) return;
        const id = window.setInterval(
            () => setIndice((prev) => (prev + 1) % slides.length),
            INTERVALO_SINGLE_MS
        );
        return () => window.clearInterval(id);
    }, [activo, slides.length]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-900">
            {slides.map((slide, i) => {
                const Icono = slide.icono;
                const visible = i === indice;
                return (
                    <div
                        key={slide.label}
                        className={`absolute inset-0 transition-opacity duration-700 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden={!visible}
                    >
                        {slide.src ? (
                            <img
                                src={slide.src}
                                alt={slide.label}
                                className={`w-full h-full object-cover ${visible ? 'landing-kenburns' : ''}`}
                                loading="eager"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-slate-700 to-slate-900">
                                <Icono className="w-20 h-20 text-white/15" strokeWidth={1.5} />
                            </div>
                        )}
                        {/* Label — esquina arriba-derecha */}
                        <div className="absolute top-3 right-3 z-10">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-black/55 backdrop-blur-md rounded-full text-sm font-bold text-white whitespace-nowrap shadow-lg ring-1 ring-white/15">
                                <Icono className="w-3.5 h-3.5" />
                                {slide.label}
                            </span>
                        </div>
                    </div>
                );
            })}

            {/* Indicadores (dots) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {slides.map((slide, i) => (
                    <button
                        key={slide.label}
                        type="button"
                        onClick={() => setIndice(i)}
                        aria-label={`Ir a ${slide.label}`}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            i === indice ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// DESKTOP — doble slot vertical con puertas corredizas
// =============================================================================

function CarruselDoblePuertas({ activo }: { activo: boolean }) {
    const slides = useSlidesHero();

    // Estado por slot: slide actual + slide anterior (durante animación de salida)
    type EstadoSlot = { actual: number; anterior: number | null };
    const [slotIzq, setSlotIzq] = useState<EstadoSlot>({ actual: 0, anterior: null });
    const [slotDer, setSlotDer] = useState<EstadoSlot>({ actual: 1, anterior: null });
    const proximoEsIzq = useRef(true);

    useEffect(() => {
        if (!activo) return;

        const id = window.setInterval(() => {
            // Buscar siguiente índice que no esté visible en ningún slot
            const visiblesActuales = [
                proximoEsIzq.current ? slotIzq.actual : slotIzq.actual,
                proximoEsIzq.current ? slotDer.actual : slotDer.actual,
            ];

            if (proximoEsIzq.current) {
                setSlotIzq((prev) => {
                    let siguiente = (prev.actual + 1) % slides.length;
                    while (siguiente === slotDer.actual) {
                        siguiente = (siguiente + 1) % slides.length;
                    }
                    return { actual: siguiente, anterior: prev.actual };
                });
            } else {
                setSlotDer((prev) => {
                    let siguiente = (prev.actual + 1) % slides.length;
                    while (siguiente === slotIzq.actual) {
                        siguiente = (siguiente + 1) % slides.length;
                    }
                    return { actual: siguiente, anterior: prev.actual };
                });
            }

            proximoEsIzq.current = !proximoEsIzq.current;
            void visiblesActuales;
        }, INTERVALO_PUERTA_MS);

        return () => window.clearInterval(id);
    }, [activo, slides.length, slotIzq.actual, slotDer.actual]);

    // Limpiar buffer de "anterior" cuando termine la animación
    useEffect(() => {
        if (slotIzq.anterior === null) return;
        const t = window.setTimeout(
            () => setSlotIzq((prev) => ({ ...prev, anterior: null })),
            DURACION_ANIMACION_MS
        );
        return () => window.clearTimeout(t);
    }, [slotIzq.anterior]);

    useEffect(() => {
        if (slotDer.anterior === null) return;
        const t = window.setTimeout(
            () => setSlotDer((prev) => ({ ...prev, anterior: null })),
            DURACION_ANIMACION_MS
        );
        return () => window.clearTimeout(t);
    }, [slotDer.anterior]);

    return (
        <div className="relative w-full h-full grid grid-cols-2 overflow-hidden rounded-xl shadow-xl ring-1 ring-white/10 bg-slate-900">
            <SlotCarrusel lado="izq" slide={slides[slotIzq.actual]} slideAnterior={slotIzq.anterior !== null ? slides[slotIzq.anterior] : null} />
            <SlotCarrusel lado="der" slide={slides[slotDer.actual]} slideAnterior={slotDer.anterior !== null ? slides[slotDer.anterior] : null} />
        </div>
    );
}

function SlotCarrusel({ lado, slide, slideAnterior }: { lado: 'izq' | 'der'; slide: SlideSeccion; slideAnterior: SlideSeccion | null }) {
    return (
        <div className="relative overflow-hidden bg-slate-900">
            {slideAnterior && (
                <ContenidoSlide
                    key={`exit-${slideAnterior.label}`}
                    slide={slideAnterior}
                    className={`absolute inset-0 anim-slide-exit-${lado}`}
                />
            )}
            <ContenidoSlide
                key={`enter-${slide.label}`}
                slide={slide}
                className={`absolute inset-0 anim-slide-enter-${lado}`}
            />
        </div>
    );
}

function ContenidoSlide({ slide, className }: { slide: SlideSeccion; className: string }) {
    const Icono = slide.icono;
    return (
        <div className={className}>
            {slide.src ? (
                <img
                    src={slide.src}
                    alt={slide.label}
                    className="w-full h-full object-cover"
                    loading="eager"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-800 via-slate-700 to-slate-900">
                    <Icono className="w-16 h-16 lg:w-20 lg:h-20 2xl:w-24 2xl:h-24 text-white/15" strokeWidth={1.5} />
                </div>
            )}
            {/* Label — esquina arriba-derecha */}
            <div className="absolute top-2 right-2 lg:top-2 lg:right-2 2xl:top-3 2xl:right-3 z-10">
                <span className="flex items-center gap-1.5 px-2.5 py-1 lg:px-2.5 lg:py-0.5 2xl:px-4 2xl:py-1.5 bg-black/55 backdrop-blur-md rounded-full text-xs lg:text-[11px] 2xl:text-base font-bold text-white whitespace-nowrap shadow-lg ring-1 ring-white/15">
                    <Icono className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                    {slide.label}
                </span>
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE: HERO — Responsivo
// =============================================================================

function HeroSection({ abrirModalLogin }: { abrirModalLogin: () => void }) {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();
    const { ref: refCarrusel, visible: carruselVisible } = useVisibleEnViewport();

    return (
        <section className="relative flex flex-col flex-1 min-h-0 overflow-hidden lg:flex-none lg:flex-row lg:h-[calc(88vh)] 2xl:h-[calc(88vh)] lg:items-center">
            {/* Fondo oscuro — móvil: completo, desktop: solo izquierda */}
            <div
                className="absolute top-0 left-0 bottom-0 w-full lg:w-[50%] 2xl:w-[45%]"
                style={{ background: 'linear-gradient(to bottom, #0B358F 40%, #000000 80%)' }}
            />

            {/* Carrusel móvil — single-item con autoplay (visión v3, edge-to-edge).
                z-0 explícito para que el título del hero (z-20) quede por encima. */}
            <div ref={refCarrusel} className="absolute top-18 left-0 right-0 h-60 overflow-hidden lg:hidden z-0">
                {/* Desvanecido inferior para fundir con el fondo azul */}
                <div className="absolute bottom-0 left-0 right-0 h-20 z-30 pointer-events-none" style={{ background: 'linear-gradient(to top, #0B358F, transparent)' }} />
                <CarruselMovilSingleItem activo={carruselVisible} />
            </div>

            {/* Línea lateral — acento */}
            <div className="hidden lg:block absolute z-20 lg:left-5 2xl:left-12 lg:top-8 lg:bottom-8 w-1.5 2xl:w-2 rounded-full bg-linear-to-b from-slate-400 via-slate-500 to-transparent" />

            {/* ═══ LAYOUT ═══ */}
            <div className="relative z-20 w-full lg:h-full flex flex-col lg:grid lg:grid-cols-[1fr_1.2fr] 2xl:grid-cols-[1fr_1.2fr] items-center px-5 lg:px-8 2xl:px-16 mt-auto lg:mt-0 pb-12 lg:pb-0 gap-6 lg:gap-6 2xl:gap-16">

                {/* ═══ IZQUIERDA: Texto ═══ */}
                <div className="flex flex-col justify-center pl-3 lg:pl-5 2xl:pl-8 max-w-[750px]">
                    {/* Título — laptop grande */}
                    <h1 className="leading-[1.1] tracking-tight mb-4 lg:mb-4 2xl:mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                        <span className="text-4xl lg:text-6xl 2xl:text-7xl">
                            <span className="font-medium text-white/80">{t('hero.tus')}</span>{' '}
                            <span className="font-extrabold bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent">{t('hero.compras')}</span>{' '}
                            <span className="font-medium text-white/80">{t('hero.ahora')}</span>
                        </span>
                        <br />
                        <span className="text-5xl lg:text-7xl 2xl:text-8xl">
                            <span className="font-extrabold bg-linear-to-r from-white to-slate-300 bg-clip-text text-transparent">{t('hero.valen')}</span>{' '}
                            <span className="font-extrabold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent">{t('hero.mas')}</span>
                        </span>
                    </h1>

                    {/* Subtítulo */}
                    <p className="text-lg lg:text-xl 2xl:text-2xl leading-relaxed mb-5 lg:mb-5 2xl:mb-8">
                        <span className="font-medium text-white/70">{t('hero.acumulaPuntos')} </span>
                        <span className="font-bold text-white">{t('hero.comerciosFavoritos')}</span>
                        <br />
                        <span className="font-medium text-white/70">{t('hero.yCanjealos')} </span>
                        <span className="font-bold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent">{t('hero.canjealos')}</span>
                        <span className="font-medium text-white/70"> {t('hero.por')} </span>
                        <span className="font-bold text-white">{t('hero.recompensas')}</span>
                    </p>

                    {/* CTA + KPIs */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 2xl:gap-8">
                        {/* Móvil: 3 botones juntos en fila */}
                        <div className="flex items-center gap-2.5 lg:hidden">
                            <button
                                onClick={() => navigate('/registro')}
                                className="flex items-center justify-center gap-2 px-7 py-2 rounded-full text-base font-bold text-white bg-slate-800 border-2 border-slate-700"
                            >
                                {t('navbar.unete')} {t('cta.personal.precio')}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={abrirModalLogin}
                                className="flex items-center gap-2 px-6 py-2 rounded-full text-base font-bold text-white bg-white/15 border-2 border-white/30"
                            >
                                <Mail className="w-5 h-5" />
                                {t('navbar.entrar')}
                            </button>
                        </div>

                        {/* Desktop: "Comenzar Ahora" */}
                        <button
                            onClick={() => navigate('/registro')}
                            className="hidden lg:inline-flex items-center gap-1.5 lg:px-6 lg:py-2 2xl:px-6 2xl:py-2.5 rounded-full lg:text-base 2xl:text-lg font-bold text-white bg-slate-800 border-2 border-slate-700 lg:cursor-pointer hover:bg-slate-600 hover:border-slate-500"
                        >
                            {t('hero.botonPrimario')}
                            <ArrowRight className="lg:w-5 lg:h-5 2xl:w-5 2xl:h-5" />
                        </button>

                        {/* Separador — solo desktop */}
                        <div className="w-0.5 h-10 2xl:h-12 rounded-full bg-linear-to-b from-transparent via-white/25 to-transparent hidden lg:block" />

                        {/* KPIs — solo desktop */}
                        <div className="hidden lg:flex items-center gap-6 2xl:gap-8">
                            {[
                                { valor: '50+', label: t('hero.stats.negocios') },
                                { valor: '4', label: t('hero.stats.secciones') },
                                { valor: '100%', label: t('hero.stats.gratis') },
                            ].map(({ valor, label }) => (
                                <div key={valor} className="text-center">
                                    <span className="text-xl lg:text-2xl 2xl:text-3xl font-bold text-white block">{valor}</span>
                                    <span className="text-sm lg:text-sm 2xl:text-sm font-semibold text-white/50">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CardYA */}
                    <div className="flex items-center gap-4 lg:gap-4 2xl:gap-6 mt-6 lg:mt-4 2xl:mt-10 pt-5 lg:pt-4 2xl:pt-8 border-t-2 border-white/25">
                        <img src="/CardYA.webp" alt="CardYA" className="h-28 lg:h-36 2xl:h-40 w-auto drop-shadow-2xl landing-float" />
                        <div className="flex flex-col">
                            <span className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold text-white leading-tight">
                                {t('hero.unaTarjeta')}
                            </span>
                            <span className="text-xl lg:text-2xl 2xl:text-3xl font-bold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent leading-tight">
                                {t('hero.multiplesRecompensas')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══ DERECHA: Carrusel de secciones — solo desktop, doble slot puertas corredizas ═══ */}
                <div className="hidden lg:block relative h-full">
                    <div className="lg:h-[600px] 2xl:h-[755px] lg:max-w-[600px] 2xl:max-w-none lg:ml-auto lg:mt-8 2xl:mt-12">
                        <CarruselDoblePuertas activo={true} />
                    </div>
                </div>
            </div>

            {/* Scroll indicator — móvil: solo visual */}
            <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 landing-scroll-indicator">
                <div className="flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/15">
                    <span className="text-sm font-medium text-white/50">{t('hero.scrollIndicador')}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                </div>
            </div>

            {/* Scroll indicator — desktop: clickeable */}
            <button
                onClick={() => document.getElementById('seccion-planes')?.scrollIntoView({ behavior: 'smooth' })}
                className="hidden lg:flex absolute bottom-3 lg:left-[40%] lg:-translate-x-1/2 2xl:left-175 2xl:translate-x-0 landing-scroll-indicator items-center gap-1 lg:px-4 lg:py-1 2xl:px-3.5 2xl:py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/15 hover:bg-white/30 lg:cursor-pointer z-30"
            >
                <span className="text-sm 2xl:text-sm font-medium text-white/50">{t('hero.scrollIndicador')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>
        </section>
    );
}

// =============================================================================
// COMPONENTE: STRIP DE CATEGORÍAS — Responsivo
// =============================================================================

function CategoriaItem({ icono: Icono, label }: { icono: LucideIcon; label: string }) {
    return (
        <div className="flex items-center gap-1.5 lg:gap-2 2xl:gap-2.5 shrink-0">
            <div className="w-7 h-7 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full flex items-center justify-center bg-linear-to-b from-slate-600 to-slate-800">
                <Icono className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-4.5 2xl:h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-800">{label}</span>
        </div>
    );
}

function StripCategorias() {
    const { t } = useTranslation('landing');
    const { ref: refStrip, visible: stripVisible } = useVisibleEnViewport();

    const items = SECCIONES_CARRUSEL.map(({ key, icono }) => ({
        icono,
        label: t(`categorias.${key}`),
    }));

    return (
        <div ref={refStrip} className="py-3 lg:py-3 2xl:py-4 bg-white/60 backdrop-blur-sm border-b-2 border-slate-300 overflow-x-hidden">
            {/* Desktop: centrado estático */}
            <div className="hidden lg:flex justify-center gap-5 2xl:gap-8 px-7 2xl:px-8">
                {items.map((item, i) => (
                    <CategoriaItem key={i} icono={item.icono} label={item.label} />
                ))}
            </div>

            {/* Móvil: marquee automático */}
            <div className="lg:hidden flex gap-4 px-3 landing-marquee" style={{ width: 'max-content', animationDuration: '15s', animationPlayState: stripVisible ? 'running' : 'paused' }}>
                {[...items, ...items].map((item, i) => (
                    <CategoriaItem key={i} icono={item.icono} label={item.label} />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE: SECCIÓN UNIFICADA — Usuarios + Comerciantes — Responsivo
// =============================================================================

function SeccionPlanes() {
    const { t } = useTranslation('landing');
    const navigate = useNavigate();
    const { ref: refReveal, esVisible } = useRevealOnScroll();

    return (
        <section
            id="seccion-planes"
            ref={refReveal}
            className={`flex flex-col lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-130px)] 2xl:min-h-[calc(100vh-160px)] landing-reveal ${esVisible ? 'visible' : ''}`}
        >
            {/* ═══ IZQUIERDA: Para Usuarios ═══ */}
            <div className="lg:grid lg:grid-cols-[0.8fr_1.3fr] 2xl:grid-cols-[0.8fr_1.4fr]"
                style={{ background: 'linear-gradient(to bottom, #eff6ff, #e0eaf5)' }}
            >
                {/* Imágenes — solo desktop */}
                <div className="hidden lg:flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-hidden group">
                        <img src="/images/secciones/negocios_desktop.webp" alt="Negocios Desktop" className="w-full h-full object-cover group-hover:scale-110 duration-500" loading="lazy" />
                    </div>
                    <div className="flex-1 overflow-hidden group">
                        <img src="/images/secciones/negocios_mobile.webp" alt="Negocios Mobile" className="w-full h-full object-cover group-hover:scale-110 duration-500" loading="lazy" />
                    </div>
                </div>

                {/* Info */}
                <div className="p-6 lg:p-6 2xl:p-10 flex flex-col justify-center">
                    <div className="mb-4 lg:mb-4 2xl:mb-6">
                        <h2 className="text-2xl lg:text-2xl 2xl:text-4xl font-extrabold text-slate-900 tracking-tight">
                            {t('cta.personal.titulo')}
                        </h2>
                        <div className="mt-1">
                            <span className="text-2xl lg:text-2xl 2xl:text-4xl font-extrabold text-emerald-600">{t('cta.personal.precio')}</span>
                        </div>
                    </div>

                    <ul className="space-y-2.5 lg:space-y-2.5 2xl:space-y-4 mb-5 lg:mb-5 2xl:mb-8">
                        {Object.values(t('cta.personal.features', { returnObjects: true }) as Record<string, string>).map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-base lg:text-base 2xl:text-xl font-medium text-slate-700">{feat}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => navigate('/registro')}
                        className="w-full lg:w-auto lg:self-start inline-flex items-center justify-center gap-2 px-6 py-2.5 lg:px-6 lg:py-2.5 2xl:px-10 2xl:py-3.5 rounded-full text-base lg:text-base 2xl:text-xl font-bold text-white bg-slate-800 border-2 border-slate-700 lg:cursor-pointer hover:bg-slate-600 hover:border-slate-500"
                    >
                        {t('cta.personal.boton')}
                        <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                    </button>
                </div>
            </div>

            {/* ═══ DERECHA: Para Comerciantes ═══ */}
            <div className="lg:grid lg:grid-cols-[1.3fr_0.7fr] 2xl:grid-cols-[1.4fr_0.8fr]"
                style={{ background: 'linear-gradient(to bottom, #0B358F 30%, #000000 80%)' }}
            >
                {/* Info comercial */}
                <div className="p-6 lg:p-6 2xl:p-10 flex flex-col justify-center">
                    <div className="mb-4 lg:mb-4 2xl:mb-6">
                        <h2 className="text-2xl lg:text-2xl 2xl:text-4xl font-extrabold text-white tracking-tight">
                            {t('cta.comercial.titulo')}
                        </h2>
                        <div className="mt-1 flex items-center gap-2 lg:gap-2 2xl:gap-3">
                            <span className="text-2xl lg:text-2xl 2xl:text-4xl font-extrabold bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent">{t('cta.comercial.precio')}</span>
                            <span className="px-2.5 py-0.5 lg:px-2.5 lg:py-0.5 2xl:px-3 2xl:py-1 bg-amber-500 text-white text-sm lg:text-sm 2xl:text-base font-bold rounded-full">{t('cta.comercial.badge')}</span>
                        </div>
                    </div>

                    <ul className="space-y-2.5 lg:space-y-2.5 2xl:space-y-4 mb-5 lg:mb-5 2xl:mb-8">
                        {Object.values(t('cta.comercial.features', { returnObjects: true }) as Record<string, string>).map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-amber-400 shrink-0 mt-0.5" />
                                <span className={`text-base lg:text-base 2xl:text-xl font-medium ${i === 6 ? 'text-amber-300 font-semibold' : 'text-white/80'}`}>
                                    {feat}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 mb-3 lg:mb-3 2xl:mb-4">
                        <button
                            onClick={() => navigate('/registro?plan=comercial')}
                            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 lg:px-6 lg:py-2.5 2xl:px-10 2xl:py-3.5 rounded-full text-base lg:text-base 2xl:text-xl font-bold text-slate-900 bg-amber-400 border-2 border-amber-500 lg:cursor-pointer hover:bg-amber-300"
                        >
                            {t('cta.comercial.boton')}
                            <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                        </button>
                        <span className="text-xl lg:text-xl 2xl:text-3xl font-bold text-white">
                            $449<span className="text-sm lg:text-sm 2xl:text-base font-medium text-white/50">{t('comerciantes.precio')}</span>
                        </span>
                    </div>

                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-white/50">
                        {t('cta.trial.cancela')}
                    </p>
                </div>

                {/* Imagen ScanYA — solo desktop */}
                <div className="hidden lg:block relative overflow-hidden group">
                    <img src="/images/secciones/scanya.webp" alt="ScanYA" className="w-full h-full object-cover group-hover:scale-110 duration-500" loading="lazy" />
                    <div className="absolute bottom-2 lg:bottom-2 2xl:bottom-4 left-1/2 -translate-x-1/2">
                        <span className="flex items-center gap-1.5 px-3 lg:px-3 2xl:px-5 py-0.5 lg:py-0.5 2xl:py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-sm lg:text-[11px] 2xl:text-base font-bold text-white whitespace-nowrap">
                            <Star className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5" />
                            {t('collage.scanya')}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// COMPONENTE: FOOTER — Responsivo
// =============================================================================

function FooterLanding() {
    const { t } = useTranslation('landing');

    return (
        <footer className="hidden lg:block px-4 lg:px-7 2xl:px-8 lg:py-5 2xl:py-5 bg-black relative">
            {/* Volver arriba */}
            <button
                onClick={() => {
                    // Desktop: scroll del contenedor fijo. Móvil: scroll del window.
                    document.querySelector('.fixed.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 lg:px-4 lg:py-1 2xl:px-3.5 2xl:py-1 bg-slate-800 rounded-full border-2 border-slate-700 hover:bg-slate-600 lg:cursor-pointer shadow-md"
            >
                <ChevronDown className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 text-white/70 rotate-180" />
                <span className="text-sm lg:text-sm 2xl:text-sm font-semibold text-white/70">{t('general.volverArriba')}</span>
            </button>

            <div className="flex items-center justify-between">
                <img src="/logo-anunciaya-azul.webp" alt="AnunciaYA" className="h-8 lg:h-8 2xl:h-10" />

                <p className="text-sm lg:text-sm 2xl:text-sm font-medium text-white/80 text-center">
                    © {new Date().getFullYear()} {t('footer.derechos')}
                </p>

                <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4">
                    <a href="https://wa.me/526381234567" target="_blank" rel="noopener noreferrer" className="hover:scale-110 lg:cursor-pointer">
                        <img src="/whatsapp.webp" alt="WhatsApp" className="w-6 h-6 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8" />
                    </a>
                    <a href="https://facebook.com/anunciaya" target="_blank" rel="noopener noreferrer" className="hover:scale-110 lg:cursor-pointer">
                        <img src="/facebook.webp" alt="Facebook" className="w-6 h-6 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8" />
                    </a>
                </div>
            </div>
        </footer>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL — con auth completo
// =============================================================================

export default function PaginaLanding() {
    const navigate = useNavigate();
    const { loginExitoso, setDatosGooglePendiente } = useAuthStore();
    const usuarioAutenticado = useAuthStore((s) => s.usuario);
    const accessTokenAutenticado = useAuthStore((s) => s.accessToken);
    const hidratado = useAuthStore((s) => s.hidratado);
    const { cerrarModalLogin, abrirModal2FA, abrirModalLogin } = useUiStore();

    // Altura visible real del viewport (descuenta barra del navegador en móvil)
    useEffect(() => {
        document.documentElement.style.setProperty('--altura-visible', `${window.innerHeight}px`);
        return () => { document.documentElement.style.removeProperty('--altura-visible'); };
    }, []);

    // Redirigir a /inicio si ya hay sesión activa.
    //
    // Cubre dos escenarios:
    //  1. Login en otra pestaña → storage event sincroniza tokens en esta
    //     pestaña → este effect detecta `usuario && accessToken` y redirige.
    //  2. Refresh en pestaña con tokens en localStorage → hidratarAuth
    //     reconstruye el state → este effect redirige a /inicio.
    //
    // Sin esto, una pestaña secundaria que recibe la sincronización de
    // sesión queda mostrando la landing pública aunque internamente sí
    // está autenticada.
    useEffect(() => {
        if (hidratado && usuarioAutenticado && accessTokenAutenticado) {
            navigate('/inicio', { replace: true });
        }
    }, [hidratado, usuarioAutenticado, accessTokenAutenticado, navigate]);

    // =========================================================================
    // GOOGLE OAUTH — Flujo completo (3 casos)
    // =========================================================================

    const handleGoogleSuccess = async (credential: string) => {
        try {
            const respuesta = await authService.loginConGoogle(credential);

            if (respuesta.success && respuesta.data) {
                const datos = respuesta.data;

                document.getElementById('google-signin-container')?.remove();
                document.getElementById('google-signin-overlay')?.remove();

                if ('usuarioNuevo' in datos && datos.usuarioNuevo === true) {
                    setDatosGooglePendiente({
                        googleIdToken: credential,
                        correo: datos.datosGoogle.email,
                        nombre: datos.datosGoogle.nombre,
                        apellidos: datos.datosGoogle.apellidos || '',
                        avatar: datos.datosGoogle.avatar || null,
                    });
                    navigate('/registro');
                    return;
                }

                if ('requiere2FA' in datos && datos.requiere2FA === true) {
                    abrirModal2FA(datos.tokenTemporal!, datos.usuario?.correo || '');
                    return;
                }

                if ('usuario' in datos && datos.accessToken) {
                    loginExitoso(datos.usuario, datos.accessToken, datos.refreshToken);
                    cerrarModalLogin();
                    notificar.exito(`¡Qué bueno verte, ${datos.usuario.nombre}!`);
                    navigate('/inicio');
                    return;
                }

                notificar.error('Respuesta inesperada del servidor');
            } else {
                notificar.error(respuesta.message || 'Error al iniciar sesión');
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { mensaje?: string } } };
            console.error('Error en Google OAuth:', error);
            notificar.error(err.response?.data?.mensaje || 'Error al iniciar sesión con Google');
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
            callback: (response: Record<string, unknown>) => {
                if (response.credential) {
                    handleGoogleSuccess(response.credential as string);
                }
            },
            use_fedcm_for_prompt: true,
        });

        const esProduccion = window.location.protocol === 'https:';

        if (esProduccion) {
            window.google.accounts.id.prompt();
        } else {
            const container = document.createElement('div');
            container.id = 'google-signin-container';
            Object.assign(container.style, {
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', zIndex: '9999',
                background: 'white', padding: '20px',
                borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            });
            document.body.appendChild(container);

            const overlay = document.createElement('div');
            overlay.id = 'google-signin-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0',
                background: 'rgba(0,0,0,0.5)', zIndex: '9998',
            });
            overlay.onclick = () => {
                document.getElementById('google-signin-container')?.remove();
                document.getElementById('google-signin-overlay')?.remove();
            };
            document.body.appendChild(overlay);

            window.google.accounts.id.renderButton(container, {
                theme: 'outline', size: 'large',
                text: 'signin_with', shape: 'rectangular', width: 280,
            });
        }
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div
            className="min-h-screen"
            style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
        >
            <NavbarLanding iniciarLoginGoogle={iniciarLoginGoogle} />

            {/* Contenedor scrolleable — móvil: desde top-0, desktop: desde top-10/12 */}
            <main className="fixed top-0 lg:top-10 2xl:top-12 left-0 right-0 bottom-0 overflow-y-auto">
                {/* Primera pantalla: hero + strip = exactamente la altura visible */}
                <div className="flex flex-col h-(--altura-visible) lg:h-auto">
                    <HeroSection abrirModalLogin={abrirModalLogin} />
                    <StripCategorias />
                </div>
                <SeccionPlanes />
                <FooterLanding />
            </main>
        </div>
    );
}
