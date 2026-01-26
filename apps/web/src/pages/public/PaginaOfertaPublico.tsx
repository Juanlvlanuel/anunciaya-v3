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
    ChevronRight,
    ExternalLink,
    Store,
    ShoppingCart,
    Gift,
    Coins,
    Award,
} from 'lucide-react';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useAuthStore } from '../../stores/useAuthStore';
import api from '../../services/api';

// =============================================================================
// TIPOS
// =============================================================================

interface OfertaPublica {
    ofertaId: string;
    titulo: string;
    descripcion?: string | null;
    imagen?: string | null;
    tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
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
// COMPONENTE: Header Público
// =============================================================================

function HeaderPublico() {
    const navigate = useNavigate();

    return (
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 lg:px-4 2xl:px-6 py-2.5 lg:py-2 2xl:py-2.5 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl lg:max-w-4xl 2xl:max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo con hover */}
                <button 
                    onClick={() => navigate('/')}
                    className="cursor-pointer transition-transform hover:scale-105"
                >
                    <img 
                        src="/logo-anunciaya.webp" 
                        alt="AnunciaYA" 
                        className="h-9 lg:h-8 2xl:h-11"
                    />
                </button>

                {/* Beneficios centrados */}
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

                {/* Botón Registrarse */}
                <button
                    onClick={() => navigate('/registro')}
                    className="bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white px-5 lg:px-4 2xl:px-5 py-2 lg:py-1.5 2xl:py-2 rounded-lg font-semibold text-sm lg:text-xs 2xl:text-sm cursor-pointer transition-all shadow-md shadow-blue-500/20"
                >
                    Registrarse
                </button>
            </div>
        </header>
    );
}

// =============================================================================
// COMPONENTE: Footer Minimalista
// =============================================================================

function FooterPublico() {
    return (
        <footer className="bg-slate-900 text-white">
            <div className="max-w-6xl lg:max-w-4xl 2xl:max-w-6xl mx-auto px-4 lg:px-4 2xl:px-6 py-4 lg:py-3 2xl:py-4">
                {/* Desktop: 3 columnas en una fila */}
                <div className="hidden md:flex items-center justify-between">
                    {/* Logo y slogan */}
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
                    
                    {/* Copyright */}
                    <p className="text-slate-500 text-xs lg:text-[10px] 2xl:text-xs">
                        © 2026 AnunciaYA. Todos los derechos reservados.
                    </p>
                    
                    {/* Redes sociales */}
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                        <span className="text-slate-400 text-xs lg:text-[10px] 2xl:text-xs mr-1">¡Síguenos!</span>
                        <a 
                            href="https://facebook.com/anunciaya" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
                        >
                            <img 
                                src="/facebook.webp" 
                                alt="Facebook" 
                                className="w-full h-full object-cover"
                            />
                        </a>
                        <a 
                            href="https://wa.me/526621234567" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full overflow-hidden hover:scale-110 transition-transform"
                        >
                            <img 
                                src="/whatsapp.webp" 
                                alt="WhatsApp" 
                                className="w-full h-full object-cover"
                            />
                        </a>
                    </div>
                </div>

                {/* Móvil: 2 líneas */}
                <div className="flex flex-col gap-3 md:hidden">
                    {/* Línea 1: Logo izquierda + Redes derecha */}
                    <div className="flex items-center justify-between">
                        {/* Logo y slogan */}
                        <div className="flex flex-col items-start gap-0.5">
                            <img 
                                src="/logo-anunciaya.webp" 
                                alt="AnunciaYA" 
                                className="h-8"
                            />
                            <p className="text-slate-400 text-[10px] italic">
                                "Tus compras ahora valen más."
                            </p>
                        </div>
                        
                        {/* Redes sociales */}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">¡Síguenos!</span>
                            <a 
                                href="https://facebook.com/anunciaya" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full overflow-hidden"
                            >
                                <img 
                                    src="/facebook.webp" 
                                    alt="Facebook" 
                                    className="w-full h-full object-cover"
                                />
                            </a>
                            <a 
                                href="https://wa.me/526621234567" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full overflow-hidden"
                            >
                                <img 
                                    src="/whatsapp.webp" 
                                    alt="WhatsApp" 
                                    className="w-full h-full object-cover"
                                />
                            </a>
                        </div>
                    </div>

                    {/* Línea 2: Copyright centrado */}
                    <p className="text-slate-500 text-xs text-center">
                        © 2026 AnunciaYA. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}

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
            <div className="min-h-screen bg-slate-50 flex flex-col">
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
            <div className="min-h-screen bg-slate-50 flex flex-col">
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
    // Render: Oferta cargada
    // -------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <HeaderPublico />
            
            <main className="flex-1 flex items-center">
                <div className="max-w-6xl lg:max-w-4xl 2xl:max-w-6xl mx-auto px-4 lg:px-4 2xl:px-6 py-6 lg:py-4 2xl:py-8 w-full">
                    
                    {/* ========================================================
                        LAYOUT 2 COLUMNAS (Desktop) / 1 COLUMNA (Móvil)
                        ======================================================== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4 2xl:gap-8 lg:items-start">
                        
                        {/* COLUMNA IZQUIERDA: Imagen */}
                        <div className="relative">
                            <div className="relative rounded-2xl lg:rounded-xl 2xl:rounded-2xl overflow-hidden shadow-xl min-h-[300px] lg:min-h-[250px] 2xl:min-h-[400px] lg:max-h-[450px] 2xl:max-h-[800px]">
                                {/* Imagen */}
                                {oferta.imagen ? (
                                    <img
                                        src={oferta.imagen}
                                        alt={oferta.titulo}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                        <Tag className="w-16 h-16 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 text-slate-300" />
                                    </div>
                                )}

                                {/* Badge de descuento */}
                                <div className="absolute top-4 lg:top-3 2xl:top-4 right-4 lg:right-3 2xl:right-4">
                                    <div className={`px-4 lg:px-3 2xl:px-5 py-2 lg:py-1.5 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-linear-to-r ${config.badgeGradient} border ${config.badgeBorder} text-white font-black text-lg lg:text-base 2xl:text-xl shadow-lg`}>
                                        {oferta.tipo === 'envio_gratis' && (
                                            <Truck className="inline-block w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 mr-1.5 -mt-0.5" />
                                        )}
                                        {badgeTexto}
                                    </div>
                                </div>

                                {/* Badge de urgencia */}
                                {badgeUrgencia && (
                                    <div className="absolute bottom-4 lg:bottom-3 2xl:bottom-4 left-4 lg:left-3 2xl:left-4">
                                        <div className={`px-3 lg:px-2 2xl:px-4 py-1.5 lg:py-1 2xl:py-2 rounded-full bg-linear-to-r ${badgeUrgencia.gradient} border ${badgeUrgencia.border} text-white font-bold text-sm lg:text-xs 2xl:text-sm shadow-lg flex items-center gap-1.5 lg:gap-1 2xl:gap-2`}>
                                            {badgeUrgencia.icono === 'flame' ? (
                                                <Flame className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                            ) : (
                                                <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                            )}
                                            <span>{badgeUrgencia.texto}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: Info */}
                        <div className="flex flex-col">
                            
                            {/* Título y descripción */}
                            <div>
                                <h1 className="text-2xl lg:text-xl 2xl:text-3xl font-bold text-slate-900 leading-tight">
                                    {oferta.titulo}
                                </h1>

                                {oferta.descripcion && (
                                    <p className="mt-3 lg:mt-2 2xl:mt-4 text-base lg:text-sm 2xl:text-lg text-slate-600 leading-relaxed">
                                        {oferta.descripcion}
                                    </p>
                                )}

                                {/* Compra mínima */}
                                {oferta.compraMinima && Number(oferta.compraMinima) > 0 && (
                                    <div className="mt-4 lg:mt-3 2xl:mt-4 inline-flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                        <ShoppingCart className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-amber-600" />
                                        <span className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Compra mínima:</span>
                                        <span className="font-bold text-amber-700 text-sm lg:text-xs 2xl:text-sm">
                                            ${Number(oferta.compraMinima).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Separador */}
                            <div className="my-5 lg:my-3 2xl:my-6 border-t border-slate-200" />

                            {/* Info del negocio */}
                            <div className="p-4 lg:p-3 2xl:p-5 bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-sm lg:text-xs 2xl:text-sm text-slate-500 mb-3 lg:mb-2 2xl:mb-3">Ofrecido por:</p>
                                
                                <div className="flex items-center gap-4 lg:gap-3 2xl:gap-4">
                                    {/* Logo */}
                                    <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-16 2xl:h-16 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                        {oferta.logoUrl ? (
                                            <img
                                                src={oferta.logoUrl}
                                                alt={oferta.negocioNombre}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                                <span className="text-xl lg:text-base 2xl:text-2xl font-bold text-white">
                                                    {oferta.negocioNombre.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 text-lg lg:text-sm 2xl:text-lg truncate">
                                            {oferta.negocioNombre}
                                        </h3>
                                        {oferta.ciudad && (
                                            <p className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm text-slate-500 mt-1">
                                                <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />
                                                <span className="truncate">{oferta.ciudad}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="mt-5 lg:mt-3 2xl:mt-5 flex flex-col sm:flex-row gap-3 lg:gap-2 2xl:gap-3">
                                {oferta.whatsapp && (
                                    <button
                                        onClick={handleWhatsApp}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 lg:px-4 2xl:px-6 py-3 lg:py-2.5 2xl:py-4 bg-green-500 hover:bg-green-600 text-white font-semibold text-base lg:text-sm 2xl:text-base rounded-xl lg:rounded-lg 2xl:rounded-xl transition-colors cursor-pointer shadow-lg shadow-green-500/25"
                                    >
                                        <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        <span>Preguntar por WhatsApp</span>
                                    </button>
                                )}

                                <button
                                    onClick={handleVerNegocio}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 lg:px-4 2xl:px-6 py-3 lg:py-2.5 2xl:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-base lg:text-sm 2xl:text-base rounded-xl lg:rounded-lg 2xl:rounded-xl transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                    <span>Ver negocio</span>
                                </button>
                            </div>

                            {/* CTA Registro (solo visitantes) */}
                            {!estaLogueado && (
                                <div className="mt-5 lg:mt-3 2xl:mt-6 p-4 lg:p-3 2xl:p-5 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl lg:rounded-lg 2xl:rounded-xl border border-amber-100">
                                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-2 2xl:gap-4">
                                        <div className="w-12 h-12 lg:w-9 lg:h-9 2xl:w-12 2xl:h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                            <Tag className="w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 text-amber-500" />
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <h3 className="font-semibold text-slate-900 text-base lg:text-sm 2xl:text-base">
                                                ¿Te interesa esta oferta?
                                            </h3>
                                            <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 mt-0.5">
                                                Regístrate para guardar y acumular puntos
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRegistrarse}
                                            className="px-5 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base lg:text-sm 2xl:text-base rounded-xl lg:rounded-lg 2xl:rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                                        >
                                            <span>Crear cuenta</span>
                                            <ChevronRight className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <FooterPublico />
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaOfertaPublico;