/**
 * ============================================================================
 * PÁGINA: PaginaArticuloPublico
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/public/PaginaArticuloPublico.tsx
 * 
 * PROPÓSITO:
 * Vista pública de un producto o servicio individual para enlaces compartidos.
 * Layout 2 columnas en desktop, vertical en móvil.
 * 
 * CREADO: Fase 5.3.1 - Sistema Universal de Compartir
 * ACTUALIZADO: Enero 2026 - Layout 2 columnas + header/footer mejorados
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, type MouseEvent } from 'react';
import {
    Loader2,
    CheckCircle,
    XCircle,
    ShoppingBag,
    Store,
    ArrowRight,
    Check,
    ChevronRight,
    BadgeCheck,
} from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
import api from '../../services/api';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { useAbrirWhatsApp } from '../../hooks/useAbrirWhatsApp';
import { useIniciarChatNegocio } from '../../hooks/useIniciarChatNegocio';
import { useAuthStore } from '../../stores/useAuthStore';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { ModalImagenes } from '../../components/ui/ModalImagenes';

// =============================================================================
// TIPOS
// =============================================================================

interface ArticuloPublico {
    id: string;
    tipo: string;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;
    precioBase: string;
    precioDesde?: boolean | null;
    imagenPrincipal?: string | null;
    requiereCita?: boolean | null;
    duracionEstimada?: number | null;
    disponible?: boolean | null;
    destacado?: boolean | null;
    createdAt: string;
    negocio: {
        id: string;
        usuarioId?: string | null;
        sucursalId: string;
        sucursalFotoPerfil?: string | null;
        nombre: string;
        logoUrl?: string | null;
        ciudad?: string | null;
        whatsapp?: string | null;
        whatsappAlterno?: string | null;
    };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaArticuloPublico() {
    const { articuloId } = useParams<{ articuloId: string }>();
    const navigate = useNavigate();
    const { usuario } = useAuthStore();
    const { abrir: abrirWhatsApp, menu: menuWhatsApp } = useAbrirWhatsApp();
    const iniciarChatNegocio = useIniciarChatNegocio();

    // Estados
    const [articulo, setArticulo] = useState<ArticuloPublico | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
    const [imagenAbierta, setImagenAbierta] = useState(false);

    // Detección de login
    const estaLogueado = !!usuario;

    // -------------------------------------------------------------------------
    // Cargar datos del artículo
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!articuloId) {
            setError('ID de artículo no válido');
            setLoading(false);
            return;
        }

        const cargarArticulo = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/articulos/detalle/${articuloId}`);
                
                if (response.data.success) {
                    setArticulo(response.data.data);
                } else {
                    setError(response.data.message || 'Artículo no encontrado');
                }
            } catch (err: unknown) {
                const error = err as { response?: { status?: number; data?: { message?: string } } };
                if (error.response?.status === 404) {
                    setError('Este artículo no existe o ha sido eliminado');
                } else {
                    setError('No se pudo cargar el artículo. Por favor intenta de nuevo.');
                }
            } finally {
                setLoading(false);
            }
        };

        cargarArticulo();
    }, [articuloId]);

    // -------------------------------------------------------------------------
    // Open Graph Meta Tags
    // -------------------------------------------------------------------------
    useOpenGraph({
        title: articulo ? `${articulo.nombre} | ${articulo.negocio.nombre} | AnunciaYA` : 'AnunciaYA',
        description: articulo?.descripcion || 
            `${articulo?.tipo === 'servicio' ? 'Servicio' : 'Producto'} disponible en ${articulo?.negocio.nombre || 'AnunciaYA'}`,
        image: articulo?.imagenPrincipal || articulo?.negocio.logoUrl || undefined,
        url: `${window.location.origin}/p/articulo/${articuloId}`,
        type: 'product',
    });

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const handleWhatsApp = (e: MouseEvent<HTMLElement>) => {
        if (!articulo?.negocio.whatsapp) return;
        const mensaje = `Hola! Me interesa "${articulo.nombre}" que vi en AnunciaYA`;
        abrirWhatsApp(e, articulo.negocio.whatsapp, articulo.negocio.whatsappAlterno, mensaje);
    };

    const handleVerNegocio = () => {
        if (articulo?.negocio.sucursalId) {
            navigate(`/p/negocio/${articulo.negocio.sucursalId}`);
        }
    };

    const handleChatYA = async () => {
        if (!articulo) return;
        if (!estaLogueado) {
            setModalAuthAbierto(true);
            return;
        }
        if (!articulo.negocio.usuarioId) return;
        const avatarSucursal = articulo.negocio.sucursalFotoPerfil ?? articulo.negocio.logoUrl ?? null;
        await iniciarChatNegocio({
            usuarioId: articulo.negocio.usuarioId,
            sucursalId: articulo.negocio.sucursalId,
            negocioNombre: articulo.negocio.nombre,
            avatarUrl: avatarSucursal,
            contexto: {
                tipo: 'articulo_negocio',
                referenciaId: articulo.id,
                cardData: {
                    subtipo: 'articulo_negocio',
                    titulo: articulo.nombre,
                    imagen: articulo.imagenPrincipal ?? null,
                    precio: articulo.precioBase,
                    tipoArticulo: articulo.tipo === 'servicio' ? 'servicio' : 'producto',
                },
                borradorInicial: `Hola! Me interesa "${articulo.nombre}" que vi en AnunciaYA`,
            },
        });
        navigate(`/negocios/${articulo.negocio.sucursalId}`);
    };

    const handleRegistrarse = () => {
        if (articulo?.negocio.sucursalId) {
            sessionStorage.setItem('ay_ruta_pendiente', `/negocios/${articulo.negocio.sucursalId}`);
        }
        navigate('/registro');
    };

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const esServicio = articulo?.tipo === 'servicio';

    // -------------------------------------------------------------------------
    // Render: Loading
    // -------------------------------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-app-degradado flex flex-col">
                <HeaderPublico />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-600">Cargando...</p>
                    </div>
                </main>
                <FooterPublico />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Render: Error
    // -------------------------------------------------------------------------
    if (error || !articulo) {
        return (
            <div className="min-h-screen bg-app-degradado flex flex-col">
                <HeaderPublico />
                <main className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-10 h-10 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-3">
                            {esServicio ? 'Servicio' : 'Producto'} no disponible
                        </h1>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            {error || 'Este artículo ya no está disponible.'}
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
    // Render: Artículo cargado — layout unificado con MarketPlace/Oferta:
    // grid `[3fr_2fr]`, cards bordeadas, panel sticky desktop, CTA "Únete a
    // AnunciaYA" estilo gradient con identidad blue del módulo Negocios.
    // -------------------------------------------------------------------------
    return (
        <div
            data-testid="pagina-articulo-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main className="flex flex-1 flex-col overflow-y-auto">
                <div className="flex flex-1 items-center lg:mx-auto lg:w-full lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="w-full pb-12 lg:py-8">
                        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                            {/* ─── COLUMNA IZQUIERDA ─── */}
                            <div className="min-w-0 space-y-5 lg:space-y-6">
                                {/* Imagen card con badges encima — full-bleed en móvil
                                    (sin margen ni bordes redondeados), card bordeada
                                    desde `lg:`. */}
                                <div className="relative overflow-hidden bg-white lg:rounded-xl lg:border-2 lg:border-slate-300 lg:shadow-md">
                                    <div className="group relative aspect-[4/3] lg:aspect-[3/2]">
                                        {articulo.imagenPrincipal ? (
                                            <img
                                                src={articulo.imagenPrincipal}
                                                alt={articulo.nombre}
                                                onClick={() => setImagenAbierta(true)}
                                                className="h-full w-full cursor-pointer object-cover transition-transform duration-300 lg:group-hover:scale-[1.02]"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                                {esServicio ? (
                                                    <Wrench className="h-16 w-16 text-slate-300" />
                                                ) : (
                                                    <ShoppingBag className="h-16 w-16 text-slate-300" />
                                                )}
                                            </div>
                                        )}

                                        {/* Badge tipo + categoría — píldora con gradiente,
                                            color temático (blue Producto / purple Servicio). */}
                                        <div className="absolute left-4 top-4">
                                            <div className={`flex items-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-1.5 text-sm font-bold text-white shadow-lg ${esServicio ? 'from-purple-500 to-purple-700 border-purple-400/50' : 'from-blue-500 to-blue-700 border-blue-400/50'}`}>
                                                {esServicio ? (
                                                    <Wrench className="h-4 w-4" />
                                                ) : (
                                                    <ShoppingBag className="h-4 w-4" />
                                                )}
                                                <span>{esServicio ? 'Servicio' : 'Producto'}</span>
                                                {articulo.categoria && (
                                                    <>
                                                        <span className="opacity-60">·</span>
                                                        <span>{articulo.categoria}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Badge disponibilidad — píldora con gradiente */}
                                        {articulo.disponible !== null && (
                                            <div className="absolute right-4 top-4">
                                                <div className={`flex items-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-1.5 text-sm font-bold text-white shadow-lg ${articulo.disponible ? 'from-emerald-500 to-green-600 border-emerald-400/50' : 'from-red-500 to-rose-600 border-red-400/50'}`}>
                                                    {articulo.disponible ? (
                                                        <>
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span>Disponible</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="h-4 w-4" />
                                                            <span>No disponible</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bloque info — SOLO móvil */}
                                <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                    <BloqueInfoArticulo articulo={articulo} esServicio={esServicio} />
                                </div>

                                {/* Descripción — SOLO móvil */}
                                {articulo.descripcion && (
                                    <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                        <h2 className="mb-2 text-base font-bold text-slate-900">
                                            Descripción
                                        </h2>
                                        <p className="break-words text-sm font-medium leading-relaxed text-slate-700">
                                            {articulo.descripcion}
                                        </p>
                                    </div>
                                )}

                                {/* Card del negocio — SOLO móvil. Contacto (ChatYA +
                                    WhatsApp) y "Ver negocio" viven inline en la card. */}
                                <div className="mx-3 lg:hidden">
                                    <CardNegocioArticulo
                                        negocio={articulo.negocio}
                                        articuloCreatedAt={articulo.createdAt}
                                        onVerNegocio={handleVerNegocio}
                                        onContactar={handleChatYA}
                                        onWhatsapp={articulo.negocio.whatsapp ? handleWhatsApp : undefined}
                                    />
                                </div>
                            </div>

                            {/* ─── COLUMNA DERECHA — solo desktop. Sin sticky:
                                mismo criterio que la vista privada (evita 2
                                scrolls sensación de "pegado"), fluye con el
                                resto de la página en un solo scroll. ─── */}
                            <div className="hidden min-w-0 lg:flex lg:flex-col">
                                <div className="flex min-w-0 flex-col gap-3">
                                    {/* Card info — sin acciones, ahora viven en la
                                        card del negocio (inline, unificado con
                                        MarketPlace/Dinámicas). */}
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                        <BloqueInfoArticulo articulo={articulo} esServicio={esServicio} compacto />
                                    </div>

                                    {/* Card del negocio — ChatYA + WhatsApp + "Ver negocio" inline */}
                                    <CardNegocioArticulo
                                        negocio={articulo.negocio}
                                        articuloCreatedAt={articulo.createdAt}
                                        onVerNegocio={handleVerNegocio}
                                        onContactar={handleChatYA}
                                        onWhatsapp={articulo.negocio.whatsapp ? handleWhatsApp : undefined}
                                    />

                                    {/* Descripción — flex-1 para ocupar el espacio
                                        sobrante. min-w-0 + overflow-hidden + scroll
                                        interno por si la descripción es muy larga. */}
                                    {articulo.descripcion && (
                                        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                            <h2 className="mb-1.5 shrink-0 text-base font-bold text-slate-900">
                                                Descripción
                                            </h2>
                                            <p className="flex-1 overflow-y-auto break-words text-sm font-medium leading-relaxed text-slate-700">
                                                {articulo.descripcion}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CTA "Únete a AnunciaYA" — gancho azul para no logueados.
                            Mismo patrón visual que MarketPlace/Oferta pero con
                            identidad blue del módulo Negocios/Catálogo. */}
                        {!estaLogueado && (
                            <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-md lg:mx-0 lg:p-7">
                                <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                                    <div
                                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        }}
                                    >
                                        <Store
                                            className="h-8 w-8 text-white lg:h-10 lg:w-10"
                                            strokeWidth={2.5}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                            {articulo.negocio.ciudad
                                                ? `Más negocios y servicios en ${articulo.negocio.ciudad}`
                                                : 'Descubre los negocios cerca de ti'}
                                        </h2>
                                        <p className="mt-1.5 text-sm font-medium text-slate-600">
                                            <span className="font-bold text-slate-900">
                                                Únete gratis a AnunciaYA.
                                            </span>{' '}
                                            Encuentra productos y servicios de comerciantes verificados cerca de ti, acumula puntos y canjéalos por recompensas.
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                                            {['Hiperlocal', 'Verificados', 'Sin spam'].map((etiqueta) => (
                                                <span
                                                    key={etiqueta}
                                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                                >
                                                    <Check
                                                        className="h-3 w-3 text-blue-600"
                                                        strokeWidth={3}
                                                    />
                                                    {etiqueta}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        data-testid="cta-registrarse-articulo"
                                        onClick={handleRegistrarse}
                                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-blue-700"
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
            {menuWhatsApp}

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                contexto={{ tipo: 'producto', titulo: articulo.nombre }}
                urlRetorno={`/p/articulo/${articuloId}`}
            />

            {articulo.imagenPrincipal && (
                <ModalImagenes
                    images={[articulo.imagenPrincipal]}
                    initialIndex={0}
                    isOpen={imagenAbierta}
                    onClose={() => setImagenAbierta(false)}
                />
            )}
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoArticuloProps {
    articulo: ArticuloPublico;
    esServicio: boolean;
    compacto?: boolean;
}

/**
 * Bloque info del artículo — eyebrow (Producto/Servicio · Ciudad) + nombre +
 * precio + chip duración (si aplica). Patrón análogo a `BloqueInfo` del
 * MarketPlace público, con identidad blue del módulo Negocios.
 */
function BloqueInfoArticulo({ articulo, esServicio, compacto = false }: BloqueInfoArticuloProps) {
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow Tipo · Ciudad */}
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className={esServicio ? 'text-purple-700' : 'text-blue-700'}>
                    {esServicio ? 'Servicio' : 'Producto'}
                </span>
                {articulo.negocio.ciudad && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                strokeWidth={2.5}
                            />
                            {articulo.negocio.ciudad}
                        </span>
                    </>
                )}
            </p>

            {/* Nombre */}
            <h1
                data-testid="titulo-articulo"
                className={
                    compacto
                        ? 'text-sm font-bold leading-tight text-slate-900 2xl:text-base'
                        : 'text-xl font-bold leading-tight text-slate-900 lg:text-2xl 2xl:text-3xl'
                }
            >
                {articulo.nombre}
            </h1>

            {/* Precio — color temático (blue Producto / purple Servicio) */}
            <div
                data-testid="precio"
                className={`${
                    compacto
                        ? 'text-2xl font-extrabold leading-none tracking-tight 2xl:text-3xl'
                        : 'text-4xl font-extrabold leading-none tracking-tight lg:text-5xl'
                } ${esServicio ? 'text-purple-700' : 'text-blue-700'}`}
            >
                {articulo.precioDesde && (
                    <span className={compacto ? 'text-sm font-normal text-slate-500' : 'text-base font-normal text-slate-500 lg:text-lg'}>
                        Desde{' '}
                    </span>
                )}
                ${parseFloat(articulo.precioBase).toFixed(2)}
            </div>

            {/* Chip duración (solo servicios con duración estimada) */}
            {esServicio && articulo.duracionEstimada && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-semibold text-slate-700">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.5} />
                    Duración: {articulo.duracionEstimada} min
                </div>
            )}
        </div>
    );
}

interface CardNegocioArticuloProps {
    negocio: ArticuloPublico['negocio'];
    /** Fecha de creación del artículo — alimenta "Publicado hace X", mismo
     *  criterio unificado en `CardVendedor` (MP), `CardOrganizadorPublico`
     *  (Dinámicas) y `CardOferentePublico` (Servicios). */
    articuloCreatedAt: string;
    /** Navega al perfil público del negocio. */
    onVerNegocio: () => void;
    /** Ícono de ChatYA — mismo patrón que `CardVendedor` (MP) y
     *  `CardOrganizadorPublico` (Dinámicas). */
    onContactar?: () => void;
    /** Ícono de WhatsApp — solo si el negocio tiene número registrado. */
    onWhatsapp?: (e: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Card del negocio que ofrece el artículo — logo + nombre + ciudad, con
 * contacto (ChatYA + WhatsApp) y "Ver negocio" inline. Patrón unificado con
 * `CardVendedor` (MarketPlace) y `CardOrganizadorPublico` (Dinámicas).
 */
function CardNegocioArticulo({ negocio, articuloCreatedAt, onVerNegocio, onContactar, onWhatsapp }: CardNegocioArticuloProps) {
    const [avatarAbierto, setAvatarAbierto] = useState(false);
    const actividadLabel = `Publicado ${formatearTiempoRelativo(articuloCreatedAt)}`;

    return (
        <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
                <div
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:h-16 lg:w-16 ${negocio.logoUrl ? 'cursor-pointer' : ''}`}
                    onClick={negocio.logoUrl ? () => setAvatarAbierto(true) : undefined}
                >
                    {negocio.logoUrl ? (
                        <img
                            src={negocio.logoUrl}
                            alt={negocio.nombre}
                            className="h-full w-full scale-110 object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                            <span className="text-xl font-bold text-white">
                                {negocio.nombre.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1 text-sm font-bold text-slate-900 lg:text-base">
                        <span className="truncate">{negocio.nombre}</span>
                        <BadgeCheck
                            className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                            strokeWidth={2.5}
                            aria-label="Negocio verificado"
                        />
                    </h3>
                </div>
            </div>

            {/* Fila 1: íconos de contacto (ChatYA + WhatsApp), alineados a
                la derecha — mismo patrón que `CardVendedor` (MP) y
                `CardOferentePublico` (Servicios). */}
            {(onContactar || onWhatsapp) && (
                <div className="mt-2 flex items-center justify-end gap-3">
                    {onContactar && (
                        <button
                            type="button"
                            onClick={onContactar}
                            aria-label="Contactar por ChatYA"
                            className="flex shrink-0 items-center justify-center lg:cursor-pointer lg:hover:opacity-80"
                        >
                            <img src="/ChatYA.webp" alt="" className="h-8 w-auto object-contain" />
                        </button>
                    )}
                    {onWhatsapp && (
                        <button
                            type="button"
                            onClick={onWhatsapp}
                            aria-label="Contactar por WhatsApp"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-md lg:cursor-pointer lg:hover:scale-105"
                        >
                            <WhatsAppIconArticulo className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Fila 2: "Publicado hace X" (izquierda) + "Ver negocio"
                (derecha) — mismo patrón que `CardVendedor` (MP). */}
            <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    {actividadLabel}
                </div>
                <button
                    type="button"
                    data-testid="btn-ver-negocio"
                    onClick={onVerNegocio}
                    aria-label={`Ver negocio de ${negocio.nombre}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-blue-700 lg:cursor-pointer lg:hover:text-blue-900 lg:hover:underline"
                >
                    Ver negocio
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {avatarAbierto && negocio.logoUrl && (
                <ModalImagenes
                    images={[negocio.logoUrl]}
                    initialIndex={0}
                    isOpen={avatarAbierto}
                    onClose={() => setAvatarAbierto(false)}
                />
            )}
        </div>
    );
}

function WhatsAppIconArticulo({ className }: { className?: string }) {
    return (
        <svg className={`${className ?? 'h-5 w-5'} text-white`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaArticuloPublico;