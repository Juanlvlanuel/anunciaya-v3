/**
 * PaginaArticuloMarketplacePublico.tsx
 * =====================================
 * Versión PÚBLICA del detalle de un artículo de MarketPlace, accesible sin
 * iniciar sesión. Sirve para los enlaces compartidos en redes sociales.
 *
 * Ruta: `/p/articulo-marketplace/:articuloId`
 *
 * Layout (09-may-2026): comparte estructura visual con la versión privada
 * (`PaginaArticuloMarketplace`) — layout 2-col 3fr/2fr en desktop con cards
 * bordeadas, Bloque info / Descripción / Características / Mapa / Card
 * vendedor / Compra segura. Lo que cambia es el chrome de auth:
 *  - HeaderPublico arriba (marca AnunciaYA + CTA "Registrarse") en lugar
 *    del header dark del módulo. FooterPublico al final.
 *  - SIN botón WhatsApp (privacidad — evita scrapers de teléfonos).
 *  - SIN botón guardar/heart (requiere login).
 *  - SIN sección Q&A (preguntar requiere login).
 *  - Botón único "Enviar mensaje al vendedor" → `ModalAuthRequerido`.
 *  - OG tags vía `useOpenGraph` para previews en WhatsApp/FB/Twitter.
 *  - CTA "Descubre más en AnunciaYA →" entre contenido y FooterPublico.
 *
 * Estados especiales:
 *  - `eliminada` → 404 amigable (el artículo no existe).
 *  - `vendida` → mensaje "Este artículo ya fue vendido", sin contacto.
 *  - `pausada` → mensaje "Esta publicación está pausada por el vendedor".
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§11 Sistema de Compartir)
 * Sprint:      docs/prompts Marketplace/Sprint-7-Polish.md
 *
 * Ubicación: apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    PackageX,
    PauseCircle,
    AlertCircle,
    MessageSquare,
    ShieldCheck,
    UserCheck,
    Flag,
    ShoppingCart,
    ArrowRight,
    Check,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
import { useAuthStore } from '../../stores/useAuthStore';
import { useArticuloMarketplace } from '../../hooks/queries/useMarketplace';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { GaleriaArticulo } from '../../components/marketplace/GaleriaArticulo';
import { CardVendedor } from '../../components/marketplace/CardVendedor';
import { MapaUbicacion } from '../../components/marketplace/MapaUbicacion';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { Spinner } from '../../components/ui/Spinner';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import {
    formatearPrecio,
    formatearTiempoRelativo,
    obtenerFotoPortada,
} from '../../utils/marketplace';
import type { CondicionArticulo } from '../../types/marketplace';

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
    nuevo: 'Nuevo',
    seminuevo: 'Seminuevo',
    usado: 'Usado',
    para_reparar: 'Para reparar',
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaArticuloMarketplacePublico() {
    const { articuloId } = useParams<{ articuloId: string }>();
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const { data: articulo, isLoading, isError } = useArticuloMarketplace(articuloId);

    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

    // ─── OG tags ──────────────────────────────────────────────────────────────
    const fotoPortadaUrl = articulo
        ? obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex) ?? undefined
        : undefined;
    const urlActual =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/articulo-marketplace/${articuloId}`
            : `/p/articulo-marketplace/${articuloId}`;

    useOpenGraph({
        title: articulo
            ? `${formatearPrecio(articulo.precio)} · ${articulo.titulo}`
            : 'MarketPlace de AnunciaYA',
        description: articulo
            ? articulo.descripcion.slice(0, 155)
            : 'Compra-venta local entre vecinos.',
        image: fotoPortadaUrl,
        url: urlActual,
        type: 'product',
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    // Si el artículo no existe o está soft-deleted → 404 amigable
    if (isError || !articulo) {
        return <Estado404Publico onVolver={() => navigate('/')} />;
    }

    // Si está eliminada (caso defensivo, el endpoint ya filtra deleted_at IS NULL)
    if (articulo.estado === 'eliminada') {
        return <Estado404Publico onVolver={() => navigate('/')} />;
    }

    const estadoNoActivo: 'vendida' | 'pausada' | null =
        articulo.estado === 'vendida' || articulo.estado === 'pausada'
            ? articulo.estado
            : null;
    const noActiva = estadoNoActivo !== null;
    const handleEnviarMensaje = () => {
        if (!usuario) {
            setModalAuthAbierto(true);
            return;
        }
        // Si está logueado, lo mandamos a la versión privada que tiene la
        // BarraContacto completa (con WhatsApp y Enviar mensaje).
        navigate(`/marketplace/articulo/${articuloId}`);
    };

    return (
        // El scroll vive dentro de `<main className="overflow-y-auto">` igual
        // que en MainLayout — necesario porque el CSS global aplica
        // `overflow:hidden` en `body` desde lg+ (index.css:79-83). Sin esto,
        // en desktop la página queda atrapada en 100vh sin poder scrollear.
        <div
            data-testid="pagina-articulo-marketplace-publico"
            className="bg-app-degradado flex h-screen flex-col"
        >
            <HeaderPublico />

            <main
                className={`flex-1 overflow-y-auto ${
                    !noActiva ? 'pb-20 lg:pb-0' : ''
                }`}
            >
                {/* Wrapper único `max-w-7xl` — mismo layout que la versión
                    privada pero sin header dark del módulo (HeaderPublico
                    arriba ya da el contexto de marca). */}
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="pb-5 lg:pb-8 lg:pt-2">
                    {/* DESKTOP: 2 columnas 3fr/2fr (mismas fr de la privada para
                        evitar overflow horizontal del grid sobre su contenedor
                        cuando se aplica gap). */}
                    <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                        {/* ─── COLUMNA IZQUIERDA (full width móvil) ─────── */}
                        <div className="space-y-5 lg:mt-8 lg:space-y-6">
                            {/* Galería */}
                            <div className="relative">
                                <GaleriaArticulo
                                    fotos={articulo.fotos}
                                    titulo={articulo.titulo}
                                    fotoPortadaIndex={articulo.fotoPortadaIndex}
                                />
                                {estadoNoActivo && <OverlayEstadoNoActiva estado={estadoNoActivo} />}
                            </div>

                            {/* Bloque info — SOLO móvil. En desktop va en col-derecha */}
                            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                                <BloqueInfo articulo={articulo} />
                            </div>

                            {/* Descripción */}
                            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                                <h2 className="mb-2 text-base font-bold text-slate-900">
                                    Descripción
                                </h2>
                                <p
                                    data-testid="descripcion"
                                    className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700"
                                >
                                    {articulo.descripcion}
                                </p>
                            </div>

                            {/* Características — SOLO móvil. En desktop va en panel sticky */}
                            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                                <h2 className="mb-3 text-base font-bold text-slate-900">
                                    Características
                                </h2>
                                <CaracteristicasTabla articulo={articulo} />
                            </div>

                            {/* Card vendedor — SOLO móvil. En desktop va en col-derecha */}
                            <div className="px-3 lg:hidden">
                                <CardVendedor vendedor={articulo.vendedor} />
                            </div>

                            {/* Mapa */}
                            <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                                <h2 className="mb-2 text-base font-bold text-slate-900">
                                    Ubicación aproximada
                                </h2>
                                <MapaUbicacion
                                    lat={articulo.ubicacionAproximada.lat}
                                    lng={articulo.ubicacionAproximada.lng}
                                    zonaAproximada={articulo.zonaAproximada}
                                />
                            </div>

                            {/* Mensaje de estado no-activo — solo móvil cuando aplica.
                                En desktop el mensaje vive en el panel sticky derecho. */}
                            {noActiva && estadoNoActivo && (
                                <div className="mx-3 lg:hidden">
                                    <MensajeEstadoNoActiva estado={estadoNoActivo} />
                                </div>
                            )}
                        </div>

                        {/* ─── COLUMNA DERECHA — solo desktop. El item del
                            grid se estira al alto del row (= galería del
                            lado izquierdo) gracias al stretch default. Con
                            `lg:justify-center` el contenido (panel sticky)
                            queda centrado verticalmente. El sticky funciona
                            porque el padre tiene espacio para que el panel
                            se "mueva" al hacer scroll del main. ─── */}
                        <div className="hidden lg:-mt-12 lg:flex lg:flex-col">
                            <div className="sticky top-10 flex flex-col gap-2">
                                {/* Card consolidada: info + CTA pública.
                                    Si el artículo está vendido/pausado se
                                    reemplaza el botón por mensaje de estado.
                                    Padding aumentado (`p-5`) para dar más
                                    aire alrededor del contenido. */}
                                <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                    <BloqueInfo articulo={articulo} compacto />

                                    <div className="mt-3 space-y-1.5 border-t-2 border-slate-200 pt-3">
                                        {!estadoNoActivo ? (
                                            <BotonContactoPublico onClick={handleEnviarMensaje} />
                                        ) : (
                                            <MensajeEstadoNoActiva estado={estadoNoActivo} />
                                        )}
                                    </div>
                                </div>

                                {/* Card vendedor — padding aumentado para
                                    coincidir con las demás cards del panel. */}
                                <CardVendedor vendedor={articulo.vendedor} className="p-4" />

                                {/* Características compactas — padding aumentado
                                    para mantener consistencia con la card de
                                    info y dar más aire al contenido. */}
                                <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                    <h2 className="mb-1.5 text-base font-bold text-slate-900">
                                        Características
                                    </h2>
                                    <CaracteristicasTabla articulo={articulo} compacto />
                                </div>

                                {/* Compra segura */}
                                {/* Compra segura — altura natural (compacta) */}
                                <CardCompraSegura />
                            </div>
                        </div>
                    </div>

                    {/* CTA personalizado de marca — gancho para no logueados.
                        Gradient sutil teal→blue + icono ShoppingCart con
                        gradient del módulo + headline con la ciudad del
                        artículo (cuando existe) + 3 trust chips + botón
                        accionable. Reemplaza el bloque genérico anterior. */}
                    <div className="mx-3 mt-12 overflow-hidden rounded-2xl border-2 border-teal-200 bg-linear-to-br from-teal-50 via-white to-blue-50 p-5 shadow-md lg:mx-0 lg:p-7">
                        {/* Layout: icono | contenido | botón en una sola fila
                            (desktop). En móvil apila vertical: icono → contenido
                            → botón. El botón vive como tercera columna al lado
                            del contenido — ya no debajo de los chips. */}
                        <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
                            {/* Icono prominente con gradient teal del módulo
                                — mismo lenguaje visual que el header dark
                                del detalle privado y la P3 perfil vendedor. */}
                            <div
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:h-20 lg:w-20"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                }}
                            >
                                <ShoppingCart
                                    className="h-8 w-8 text-white lg:h-10 lg:w-10"
                                    strokeWidth={2.5}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                                    {articulo.ciudad
                                        ? `Más artículos a la venta en ${articulo.ciudad}`
                                        : 'Compra y vende en MarketPlace'}
                                </h2>
                                <p className="mt-1.5 text-sm font-medium text-slate-600">
                                    <span className="font-bold text-slate-900">
                                        Únete gratis a AnunciaYA.
                                    </span>{' '}
                                    Publica tus artículos en MarketPlace o descubre lo que ofrecen vendedores cerca de ti.
                                </p>

                                {/* Trust chips — pills blancos con check teal */}
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                                    {['Hiperlocal', 'Sin comisiones', 'Sin spam'].map((etiqueta) => (
                                        <span
                                            key={etiqueta}
                                            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                        >
                                            <Check
                                                className="h-3 w-3 text-teal-600"
                                                strokeWidth={3}
                                            />
                                            {etiqueta}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Botón teal sólido (un solo color) — anclado
                                al lado derecho del contenido en desktop, al
                                final del stack en móvil. */}
                            <button
                                data-testid="cta-conocer-anunciaya"
                                onClick={() => navigate('/registro')}
                                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] lg:cursor-pointer lg:hover:bg-teal-700"
                            >
                                Únete gratis
                                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

                {/* FooterPublico vive dentro del main para que aparezca al
                    final del scroll interno (no como bloque fijo separado). */}
                <FooterPublico />
            </main>

            {/* Barra fija inferior — solo móvil cuando el artículo está activo.
                Fuera del main para que quede pegada al viewport y no scrollee
                con el contenido. z-20 para quedar sobre el contenido pero
                debajo del HeaderPublico sticky (que es z-50). */}
            {!noActiva && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 lg:hidden">
                    <BotonContactoPublico onClick={handleEnviarMensaje} />
                </div>
            )}

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                accion="chat"
                urlRetorno={`/marketplace/articulo/${articuloId}`}
            />
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoProps {
    articulo: NonNullable<ReturnType<typeof useArticuloMarketplace>['data']>;
    /** Si true, reduce paddings y tamaños de texto para caber en el panel
     *  sticky desktop sin requerir scroll. Default false (vista mobile). */
    compacto?: boolean;
}

/**
 * Bloque info portado desde `PaginaArticuloMarketplace` (privada). Mismo
 * estilo Mercado Libre: eyebrow MarketPlace · Ciudad / título / precio
 * gigante / chips de condición + acepta ofertas / tiempo + vistas.
 */
function BloqueInfo({ articulo, compacto = false }: BloqueInfoProps) {
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow MarketPlace · Ciudad */}
            <p
                className={`flex flex-wrap items-center gap-1.5 font-bold uppercase tracking-wide ${
                    compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'
                }`}
            >
                <span className="text-teal-700">MarketPlace</span>
                {articulo.ciudad && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                strokeWidth={2.5}
                            />
                            {articulo.ciudad}
                        </span>
                    </>
                )}
            </p>

            {/* Título */}
            <h1
                data-testid="titulo"
                className={
                    compacto
                        ? 'text-sm font-bold leading-tight text-slate-900 2xl:text-base'
                        : 'text-xl font-bold leading-tight text-slate-900 lg:text-2xl 2xl:text-3xl'
                }
            >
                {articulo.titulo}
            </h1>

            {/* Precio gigante */}
            <div
                data-testid="precio"
                className={
                    compacto
                        ? 'text-2xl font-extrabold leading-none tracking-tight text-slate-900 2xl:text-3xl'
                        : 'text-4xl font-extrabold leading-none tracking-tight text-slate-900 lg:text-5xl'
                }
            >
                {formatearPrecio(articulo.precio)}
                {articulo.unidadVenta && (
                    <span
                        className={
                            compacto
                                ? 'ml-1.5 text-lg font-semibold text-slate-600 2xl:text-xl'
                                : 'ml-2 text-2xl font-semibold text-slate-600 lg:text-3xl'
                        }
                    >
                        {articulo.unidadVenta}
                    </span>
                )}
            </div>

            {/* Chips: condición (semántico) + acepta ofertas. Ambos son
                opcionales desde 2026-05-13. */}
            <div className="flex flex-wrap items-center gap-1.5">
                <ChipCondicion condicion={articulo.condicion} />
                {articulo.aceptaOfertas && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                        Acepta ofertas
                    </span>
                )}
            </div>

            {/* Tiempo + vistas (sutil) */}
            <div className={`flex items-center gap-2 font-medium text-slate-600 ${compacto ? 'text-sm lg:text-xs 2xl:text-sm' : 'text-sm'}`}>
                <span>{formatearTiempoRelativo(articulo.createdAt)}</span>
                <span aria-hidden className="text-slate-400">·</span>
                <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                    {articulo.totalVistas} {articulo.totalVistas === 1 ? 'vista' : 'vistas'}
                </span>
            </div>
        </div>
    );
}

/**
 * Chip de condición con color semántico:
 *  - Nuevo → emerald, Seminuevo → blue, Usado → slate, Para reparar → amber.
 */
function ChipCondicion({ condicion }: { condicion: CondicionArticulo | null }) {
    // Condición opcional desde 2026-05-13: si no aplica, no mostramos chip.
    if (!condicion) return null;
    const config = {
        nuevo: { label: 'Nuevo', clases: 'bg-emerald-100 text-emerald-700' },
        seminuevo: { label: 'Seminuevo', clases: 'bg-blue-100 text-blue-700' },
        usado: { label: 'Usado', clases: 'bg-slate-200 text-slate-700' },
        para_reparar: { label: 'Para reparar', clases: 'bg-amber-100 text-amber-700' },
    }[condicion];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${config.clases}`}
        >
            {config.label}
        </span>
    );
}

/**
 * Tabla de características key-value densa (estilo Mercado Libre).
 * `compacto` reduce padding vertical para caber en el panel sticky desktop.
 */
function CaracteristicasTabla({
    articulo,
    compacto = false,
}: {
    articulo: NonNullable<ReturnType<typeof useArticuloMarketplace>['data']>;
    compacto?: boolean;
}) {
    const filas: Array<{ label: string; valor: React.ReactNode }> = [
        // Campos opcionales (2026-05-13): solo se listan si tienen valor.
        // La unidad de venta NO se lista aquí porque ya aparece junto al
        // precio en el header ("$15 c/u") — duplicarla en la tabla es ruido.
        ...(articulo.condicion
            ? [{ label: 'Condición', valor: ETIQUETA_CONDICION[articulo.condicion] }]
            : []),
        ...(articulo.aceptaOfertas !== null && articulo.aceptaOfertas !== undefined
            ? [{ label: 'Acepta ofertas', valor: articulo.aceptaOfertas ? 'Sí' : 'No' }]
            : []),
        ...(articulo.ciudad
            ? [{ label: 'Ciudad', valor: articulo.ciudad }]
            : []),
        ...(articulo.zonaAproximada
            ? [{ label: 'Zona', valor: articulo.zonaAproximada }]
            : []),
        {
            label: 'Publicado',
            valor: formatearTiempoRelativo(articulo.createdAt),
        },
    ];
    const filaPadding = compacto ? 'py-1' : 'py-2';
    // Tamaño uniforme `text-sm` — alineado a la jerarquía global del detalle.
    const filaTexto = 'text-sm';
    return (
        <dl className="divide-y divide-slate-200">
            {filas.map((fila) => (
                <div
                    key={fila.label}
                    className={`flex items-baseline justify-between gap-3 ${filaPadding} ${filaTexto}`}
                >
                    <dt className="font-semibold text-slate-600">{fila.label}</dt>
                    <dd className="text-right font-medium text-slate-900">{fila.valor}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Card de tips de seguridad estilo Mercado Libre "Compra Protegida".
 * Refuerza confianza con lineamientos básicos. Genérico — el contenido es
 * el mismo para todos los artículos.
 */
function CardCompraSegura({ className = '' }: { className?: string }) {
    const tips: Array<{ icono: React.ComponentType<{ className?: string; strokeWidth?: number }>; texto: string }> = [
        { icono: MapPin, texto: 'Acuerda el punto de encuentro en un lugar público' },
        { icono: UserCheck, texto: 'Verifica el producto antes de pagar' },
        { icono: ShieldCheck, texto: 'Lleva acompañante o avísale a alguien' },
        { icono: Flag, texto: 'Reporta cualquier comportamiento sospechoso' },
    ];
    return (
        <div className={`rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-md ${className}`}>
            <div className="mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" strokeWidth={2.5} />
                <h2 className="text-base font-bold text-emerald-900">
                    Compra segura
                </h2>
            </div>
            <ul className="space-y-1.5">
                {tips.map(({ icono: Icono, texto }) => (
                    <li
                        key={texto}
                        className="flex items-start gap-1.5 text-sm font-medium leading-snug text-emerald-900"
                    >
                        <Icono
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
                            strokeWidth={2.5}
                        />
                        <span>{texto}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface BotonContactoProps {
    onClick: () => void;
}

function BotonContactoPublico({ onClick }: BotonContactoProps) {
    return (
        <button
            data-testid="btn-enviar-mensaje-publico"
            onClick={onClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:cursor-pointer"
        >
            <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
            Enviar mensaje al vendedor
        </button>
    );
}

interface OverlayEstadoNoActivaProps {
    estado: 'vendida' | 'pausada';
}

function OverlayEstadoNoActiva({ estado }: OverlayEstadoNoActivaProps) {
    const config =
        estado === 'vendida'
            ? { Icon: PackageX, label: 'VENDIDO', bg: 'bg-rose-600/85' }
            : { Icon: PauseCircle, label: 'PAUSADO', bg: 'bg-slate-700/85' };
    const Icon = config.Icon;

    return (
        <div
            data-testid={`overlay-publico-${estado}`}
            className={`pointer-events-none absolute inset-0 flex items-center justify-center ${config.bg} lg:rounded-xl`}
        >
            <div className="flex flex-col items-center gap-2 text-white">
                <Icon className="h-12 w-12" strokeWidth={1.5} />
                <span className="text-2xl font-extrabold tracking-wider">
                    {config.label}
                </span>
            </div>
        </div>
    );
}

interface MensajeEstadoProps {
    estado: 'vendida' | 'pausada';
}

function MensajeEstadoNoActiva({ estado }: MensajeEstadoProps) {
    const titulo =
        estado === 'vendida'
            ? 'Este artículo ya fue vendido'
            : 'Esta publicación está pausada por el vendedor';
    const cuerpo =
        estado === 'vendida'
            ? 'El artículo ya no está disponible. Explora otros artículos similares en AnunciaYA.'
            : 'El vendedor pausó esta publicación temporalmente. Vuelve más tarde o explora otros artículos.';

    return (
        <div
            data-testid={`mensaje-estado-${estado}`}
            className="rounded-xl border-2 border-slate-300 bg-white p-4 text-sm shadow-md"
        >
            <strong className="block font-semibold text-slate-900">{titulo}</strong>
            <p className="mt-0.5 text-slate-600">{cuerpo}</p>
        </div>
    );
}

interface Estado404Props {
    onVolver: () => void;
}

function Estado404Publico({ onVolver }: Estado404Props) {
    return (
        <div className="bg-app-degradado flex min-h-screen items-center justify-center px-6">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">
                    Artículo no encontrado
                </h2>
                <p className="mb-5 text-sm text-slate-600">
                    Esta publicación no existe o ya fue eliminada.
                </p>
                <button
                    onClick={onVolver}
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md lg:cursor-pointer"
                >
                    Conocer AnunciaYA
                </button>
            </div>
        </div>
    );
}

export default PaginaArticuloMarketplacePublico;
