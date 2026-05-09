/**
 * ============================================================================
 * PÁGINA: PaginaOfertaPublico
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/public/PaginaOfertaPublico.tsx
 * 
 * PROPÓSITO:
 * Vista pública de ofertas compartidas.
 * Layout 2 columnas en desktop, vertical en móvil.
 * 
 * CREADO: Fase 5.3.1 - Sistema Universal de Compartir
 * ACTUALIZADO: Enero 2026 - Layout 2 columnas + footer minimalista
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Loader2,
    Tag,
    MapPin,
    Clock,
    Flame,
    Truck,
    ExternalLink,
    Store,
    ShoppingCart,
    ArrowRight,
    Check,
} from 'lucide-react';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useAuthStore } from '../../stores/useAuthStore';
import api from '../../services/api';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';

// =============================================================================
// TIPOS
// =============================================================================

interface OfertaPublica {
    ofertaId: string;
    titulo: string;
    descripcion?: string | null;
    imagen?: string | null;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'regalo' | 'otro';
    valor?: number | string | null;
    compraMinima?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    limiteUsos?: number | null;
    usosActuales?: number;
    activo?: boolean;
    // Negocio
    negocioId: string;
    negocioNombre: string;
    logoUrl?: string | null;
    ciudad?: string | null;
    whatsapp?: string | null;
    // Sucursal
    sucursalId: string;
    sucursalNombre?: string | null;
    direccion?: string | null;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES POR TIPO
// =============================================================================

interface ConfigTipo {
    badgeGradient: string;
    badgeBorder: string;
}

const CONFIG_TIPO: Record<string, ConfigTipo> = {
    porcentaje: {
        badgeGradient: 'from-red-500 via-red-600 to-rose-700',
        badgeBorder: 'border-red-400/30',
    },
    monto_fijo: {
        badgeGradient: 'from-orange-600 via-amber-600 to-orange-700',
        badgeBorder: 'border-orange-400/60',
    },
    '2x1': {
        badgeGradient: 'from-cyan-500 via-teal-600 to-cyan-700',
        badgeBorder: 'border-cyan-300/60',
    },
    '3x2': {
        badgeGradient: 'from-pink-500 via-rose-600 to-pink-700',
        badgeBorder: 'border-pink-300/60',
    },
    envio_gratis: {
        badgeGradient: 'from-blue-400 via-sky-500 to-blue-500',
        badgeBorder: 'border-blue-300/60',
    },
    otro: {
        badgeGradient: 'from-amber-500 via-orange-600 to-amber-700',
        badgeBorder: 'border-amber-400/30',
    },
};

// =============================================================================
// HELPERS
// =============================================================================

const getValorNumerico = (valor: number | string | null | undefined): number | undefined => {
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string' && !isNaN(Number(valor))) {
        return Number(valor);
    }
    return undefined;
};

const getBadgeTexto = (tipo: string, valor?: number | string | null): string => {
    const valorNum = getValorNumerico(valor);
    switch (tipo) {
        case 'porcentaje':
            return `${valorNum || 0}% OFF`;
        case 'monto_fijo':
            return `-$${valorNum || 0}`;
        case '2x1':
            return '2x1';
        case '3x2':
            return '3x2';
        case 'envio_gratis':
            return 'Envío Gratis';
        case 'otro':
            return typeof valor === 'string' && isNaN(Number(valor)) ? valor : 'OFERTA';
        default:
            return 'OFERTA';
    }
};

const calcularDiasRestantes = (fechaFin?: string | null): number | null => {
    if (!fechaFin) return null;

    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const fecha = new Date(fechaFin);
        fecha.setHours(0, 0, 0, 0);

        const diffTime = fecha.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    } catch {
        return null;
    }
};

const getBadgeUrgencia = (diasRestantes: number | null) => {
    if (diasRestantes === null) return null;

    if (diasRestantes === 0) {
        return {
            texto: '¡Último día!',
            gradient: 'from-red-600 to-rose-700',
            border: 'border-red-400/50',
            icono: 'flame',
        };
    }
    if (diasRestantes <= 3) {
        return {
            texto: `¡${diasRestantes} día${diasRestantes > 1 ? 's' : ''}!`,
            gradient: 'from-orange-500 to-amber-600',
            border: 'border-orange-400/50',
            icono: 'flame',
        };
    }
    if (diasRestantes <= 7) {
        return {
            texto: `${diasRestantes} días`,
            gradient: 'from-amber-500 to-yellow-600',
            border: 'border-amber-400/50',
            icono: 'clock',
        };
    }
    return {
        texto: `${diasRestantes} días`,
        gradient: 'from-emerald-500 to-green-600',
        border: 'border-emerald-400/50',
        icono: 'clock',
    };
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaOfertaPublico() {
    const { ofertaId: id } = useParams<{ ofertaId: string }>();
    const navigate = useNavigate();
    const { usuario } = useAuthStore();

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------
    const [oferta, setOferta] = useState<OfertaPublica | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Usuario logueado o visitante
    const estaLogueado = !!usuario;

    // -------------------------------------------------------------------------
    // Cargar oferta
    // -------------------------------------------------------------------------
    useEffect(() => {
        const cargarOferta = async () => {
            if (!id) {
                setError('ID de oferta no válido');
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/ofertas/detalle/${id}`);
                
                if (response.data.success) {
                    setOferta(response.data.data);
                } else {
                    setError(response.data.message || 'Oferta no encontrada');
                }
            } catch (err: unknown) {
                const error = err as { response?: { status?: number; data?: { message?: string } } };
                if (error.response?.status === 404) {
                    setError('Esta oferta no existe o ha sido eliminada');
                } else {
                    setError('No se pudo cargar la oferta. Por favor intenta de nuevo.');
                }
            } finally {
                setLoading(false);
            }
        };

        cargarOferta();
    }, [id]);

    // -------------------------------------------------------------------------
    // Open Graph Meta Tags
    // -------------------------------------------------------------------------
    useOpenGraph({
        title: oferta ? `${oferta.titulo} | ${oferta.negocioNombre} | AnunciaYA` : 'Oferta | AnunciaYA',
        description: oferta?.descripcion || `Oferta especial en ${oferta?.negocioNombre || 'AnunciaYA'}`,
        image: oferta?.imagen || oferta?.logoUrl || undefined,
        url: window.location.href,
        type: 'website',
    });

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const handleWhatsApp = () => {
        if (oferta?.whatsapp) {
            const numeroLimpio = oferta.whatsapp.replace(/\D/g, '');
            const mensaje = encodeURIComponent(
                `Hola! Me interesa la oferta "${oferta.titulo}" que vi en AnunciaYA`
            );
            window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
        }
    };

    const handleVerNegocio = () => {
        if (oferta?.sucursalId) {
            navigate(`/p/negocio/${oferta.sucursalId}`);
        }
    };

    const handleRegistrarse = () => {
        if (oferta?.sucursalId) {
            sessionStorage.setItem('ay_ruta_pendiente', `/negocios/${oferta.sucursalId}`);
        }
        navigate('/registro');
    };

    // -------------------------------------------------------------------------
    // Datos derivados
    // -------------------------------------------------------------------------
    const config = oferta ? (CONFIG_TIPO[oferta.tipo] || CONFIG_TIPO.otro) : CONFIG_TIPO.otro;
    const diasRestantes = oferta ? calcularDiasRestantes(oferta.fechaFin) : null;
    const badgeUrgencia = getBadgeUrgencia(diasRestantes);
    const badgeTexto = oferta ? getBadgeTexto(oferta.tipo, oferta.valor) : '';

    // -------------------------------------------------------------------------
    // Render: Loading
    // -------------------------------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-app-degradado flex flex-col">
                <HeaderPublico />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-600">Cargando oferta...</p>
                    </div>
                </main>
                <FooterPublico />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Render: Error
    // -------------------------------------------------------------------------
    if (error || !oferta) {
        return (
            <div className="min-h-screen bg-app-degradado flex flex-col">
                <HeaderPublico />
                <main className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <Tag className="w-10 h-10 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-3">
                            Oferta no disponible
                        </h1>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            {error || 'Esta oferta ya no está disponible o ha expirado.'}
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            <Store className="w-5 h-5" />
                            <span>Explorar negocios</span>
                        </button>
                    </div>
                </main>
                <FooterPublico />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Render: Oferta cargada — layout unificado con `PaginaArticuloMarketplacePublico`:
    // grid `[3fr_2fr]` desktop, cards bordeadas, main scrolleable con footer
    // dentro, CTA "Únete a AnunciaYA" estilo gradient pero con identidad amber.
    // -------------------------------------------------------------------------
    return (
        <div
            data-testid="pagina-oferta-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main className="flex flex-1 flex-col overflow-y-auto">
                {/* `items-center` centra el contenido verticalmente en el
                    espacio entre el header y el footer cuando el contenido
                    no llena toda la altura disponible. */}
                <div className="flex flex-1 items-center lg:mx-auto lg:w-full lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="w-full pb-12 lg:py-8">
                        {/* Layout 2-col 3fr/2fr en desktop, 1 col móvil */}
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA ─── */}
                            <div className="min-w-0 space-y-5 lg:space-y-6">
                                {/* Imagen card con badges encima */}
                                <div className="relative mx-3 overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md lg:mx-0">
                                    <div className="relative aspect-[4/3] lg:aspect-[3/2]">
                                        {oferta.imagen ? (
                                            <img
                                                src={oferta.imagen}
                                                alt={oferta.titulo}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                                <Tag className="h-16 w-16 text-slate-300" />
                                            </div>
                                        )}

                                        {/* Badge de descuento */}
                                        <div className="absolute right-4 top-4">
                                            <div className={`rounded-xl border bg-linear-to-r px-4 py-2 text-lg font-black text-white shadow-lg ${config.badgeGradient} ${config.badgeBorder}`}>
                                                {oferta.tipo === 'envio_gratis' && (
                                                    <Truck className="-mt-0.5 mr-1.5 inline-block h-5 w-5" />
                                                )}
                                                {badgeTexto}
                                            </div>
                                        </div>

                                        {/* Badge de urgencia */}
                                        {badgeUrgencia && (
                                            <div className="absolute bottom-4 left-4">
                                                <div className={`flex items-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-1.5 text-sm font-bold text-white shadow-lg ${badgeUrgencia.gradient} ${badgeUrgencia.border}`}>
                                                    {badgeUrgencia.icono === 'flame' ? (
                                                        <Flame className="h-4 w-4" />
                                                    ) : (
                                                        <Clock className="h-4 w-4" />
                                                    )}
                                                    <span>{badgeUrgencia.texto}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bloque info — SOLO móvil (en desktop va al panel sticky) */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                                    <BloqueInfoOferta oferta={oferta} />
                                </div>

                                {/* Descripción — SOLO móvil. En desktop va al
                                    panel sticky derecho para que la columna
                                    izquierda quede limpia con solo la imagen. */}
                                {oferta.descripcion && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                                        <h2 className="mb-2 text-base font-bold text-slate-900">
                                            Descripción
                                        </h2>
                                        <p className="text-sm font-medium leading-relaxed text-slate-700 break-words">
                                            {oferta.descripcion}
                                        </p>
                                    </div>
                                )}

                                {/* Card del negocio — SOLO móvil */}
                                <div className="mx-3 lg:hidden">
                                    <CardNegocioOferta oferta={oferta} />
                                </div>

                                {/* Botones de acción — SOLO móvil */}
                                <div className="mx-3 flex flex-col gap-3 sm:flex-row lg:hidden">
                                    {oferta.whatsapp && (
                                        <BotonWhatsappOferta onClick={handleWhatsApp} />
                                    )}
                                    <BotonVerNegocioOferta onClick={handleVerNegocio} />
                                </div>
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop. flex-col en
                                el item del grid + flex-1 + justify-center en el
                                wrapper interno hacen que las 3 cards ocupen
                                exactamente el alto de la imagen y queden
                                centradas verticalmente. ─── */}
                            <div className="hidden min-w-0 lg:flex lg:flex-col">
                                <div className="flex min-w-0 flex-1 flex-col gap-3">
                                    {/* Card consolidada: info + acciones.
                                        Padding `p-4` unificado con las demás
                                        cards del panel (mismo patrón en MP). */}
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfoOferta oferta={oferta} compacto />

                                        {/* `flex flex-col` para que el `flex-1`
                                            de los botones funcione y queden
                                            full width apilados verticalmente. */}
                                        <div className="mt-3 flex flex-col gap-1.5 border-t-2 border-slate-200 pt-3">
                                            {oferta.whatsapp && (
                                                <BotonWhatsappOferta onClick={handleWhatsApp} />
                                            )}
                                            <BotonVerNegocioOferta onClick={handleVerNegocio} />
                                        </div>
                                    </div>

                                    {/* Card del negocio — altura natural. */}
                                    <CardNegocioOferta oferta={oferta} />

                                    {/* Descripción — flex-1 toma el espacio
                                        sobrante para que la suma de las 3
                                        cards iguale el alto de la imagen.
                                        - `min-w-0`: permite compresión cuando
                                          el contenido tiene palabras largas.
                                        - `overflow-hidden` en el card +
                                          `overflow-y-auto` en el `<p>`: si la
                                          descripción excede el alto disponible,
                                          scrollea internamente en lugar de
                                          desbordar el card. */}
                                    {oferta.descripcion && (
                                        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md">
                                            <h2 className="mb-1.5 shrink-0 text-base font-bold text-slate-900">
                                                Descripción
                                            </h2>
                                            <p className="flex-1 overflow-y-auto break-words text-sm font-medium leading-relaxed text-slate-700">
                                                {oferta.descripcion}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CTA "Únete a AnunciaYA" — gancho amber para no logueados.
                            Mismo patrón visual que el CTA del MarketPlace público,
                            con identidad de color del módulo Ofertas. */}
                        {!estaLogueado && (
                            <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5 shadow-md lg:mx-0 lg:p-7">
                                <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                                    <div
                                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, #fbbf24, #d97706)',
                                        }}
                                    >
                                        <Tag
                                            className="h-8 w-8 text-white lg:h-10 lg:w-10"
                                            strokeWidth={2.5}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                            {oferta.ciudad
                                                ? `Más ofertas y descuentos en ${oferta.ciudad}`
                                                : 'Descubre ofertas y descuentos cerca de ti'}
                                        </h2>
                                        <p className="mt-1.5 text-sm font-medium text-slate-600">
                                            Regístrate gratis a AnunciaYA — guarda tus ofertas favoritas, acumula puntos y canjéalos por recompensas.
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                                            {['Hiperlocal', '100% gratis', 'Acumula puntos'].map((etiqueta) => (
                                                <span
                                                    key={etiqueta}
                                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                                >
                                                    <Check
                                                        className="h-3 w-3 text-amber-600"
                                                        strokeWidth={3}
                                                    />
                                                    {etiqueta}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        data-testid="cta-registrarse-oferta"
                                        onClick={handleRegistrarse}
                                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-amber-700"
                                    >
                                        Únete gratis
                                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <FooterPublico />
            </main>
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoOfertaProps {
    oferta: OfertaPublica;
    compacto?: boolean;
}

/**
 * Bloque info de la oferta — eyebrow Ofertas + ciudad / título / chip de
 * compra mínima si aplica. Patrón análogo a `BloqueInfo` del MarketPlace
 * público pero con identidad amber del módulo Ofertas.
 */
function BloqueInfoOferta({ oferta, compacto = false }: BloqueInfoOfertaProps) {
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow Ofertas · Ciudad */}
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className="text-amber-700">Ofertas</span>
                {oferta.ciudad && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                strokeWidth={2.5}
                            />
                            {oferta.ciudad}
                        </span>
                    </>
                )}
            </p>

            {/* Título */}
            <h1
                data-testid="titulo-oferta"
                className={
                    compacto
                        ? 'text-sm font-bold leading-tight text-slate-900 2xl:text-base'
                        : 'text-xl font-bold leading-tight text-slate-900 lg:text-2xl 2xl:text-3xl'
                }
            >
                {oferta.titulo}
            </h1>

            {/* Compra mínima */}
            {oferta.compraMinima && Number(oferta.compraMinima) > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                    Compra mínima: ${Number(oferta.compraMinima).toFixed(2)}
                </div>
            )}
        </div>
    );
}

interface CardNegocioOfertaProps {
    oferta: OfertaPublica;
    /** Clases adicionales — útil para hacer la card flex-1 cuando vive
     *  dentro del panel derecho que distribuye altura entre 3 cards. */
    className?: string;
}

/**
 * Card del negocio que ofrece la oferta — logo + nombre + ciudad + CTA
 * "Ver negocio". Patrón análogo a `CardVendedor` del MarketPlace.
 */
function CardNegocioOferta({ oferta, className = '' }: CardNegocioOfertaProps) {
    return (
        <div className={`rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md ${className}`}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Ofrecido por
            </p>
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:h-14 lg:w-14">
                    {oferta.logoUrl ? (
                        <img
                            src={oferta.logoUrl}
                            alt={oferta.negocioNombre}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-amber-500 to-orange-600">
                            <span className="text-xl font-bold text-white">
                                {oferta.negocioNombre.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900 lg:text-base">
                        {oferta.negocioNombre}
                    </h3>
                    {oferta.ciudad && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-slate-600">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.5} />
                            {oferta.ciudad}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

interface BotonAccionProps {
    onClick: () => void;
}

function BotonWhatsappOferta({ onClick }: BotonAccionProps) {
    return (
        <button
            onClick={onClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-[#22C55E] to-[#15803D] px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:cursor-pointer"
        >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Preguntar por WhatsApp</span>
        </button>
    );
}

function BotonVerNegocioOferta({ onClick }: BotonAccionProps) {
    return (
        <button
            onClick={onClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:cursor-pointer"
        >
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
            <span>Ver negocio</span>
        </button>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaOfertaPublico;