/**
 * PaginaArticuloMarketplacePublico.tsx
 * =====================================
 * Versión PÚBLICA del detalle de un artículo de MarketPlace, accesible sin
 * iniciar sesión. Sirve para los enlaces compartidos en redes sociales.
 *
 * Ruta: `/p/articulo-marketplace/:articuloId`
 *
 * Diferencias con la versión privada (`PaginaArticuloMarketplace`):
 *  - Sin layout privado (no envuelta en `MainLayout`).
 *  - Mete OG tags vía `useOpenGraph` para previews en WhatsApp/FB/Twitter.
 *  - NO muestra el botón WhatsApp directamente (privacidad — evita scrapers
 *    que recolecten teléfonos de vendedores). Solo "Enviar mensaje" que
 *    abre `ModalAuthRequerido` cuando el visitante no está logueado.
 *  - NO muestra "Ver perfil del vendedor" (ese flujo es solo para usuarios
 *    logueados que pueden interactuar después).
 *  - Footer con CTA "Descubre más en AnunciaYA →" → landing.
 *
 * Estados especiales:
 *  - `eliminada` → 404 amigable (el artículo no existe).
 *  - `vendida` → mensaje "Este artículo ya fue vendido", sin contacto.
 *  - `pausada` → mensaje "Esta publicación está pausada por el vendedor",
 *    sin contacto (pero sin sugerir que es definitivo).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§11 Sistema de Compartir)
 * Sprint:      docs/prompts Marketplace/Sprint-7-Polish.md
 *
 * Ubicación: apps/web/src/pages/public/PaginaArticuloMarketplacePublico.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    PackageX,
    PauseCircle,
    AlertCircle,
    MessageSquare,
    ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useArticuloMarketplace } from '../../hooks/queries/useMarketplace';
import { useOpenGraph } from '../../hooks/useOpenGraph';
import { GaleriaArticulo } from '../../components/marketplace/GaleriaArticulo';
import { CardVendedor } from '../../components/marketplace/CardVendedor';
import { MapaUbicacion } from '../../components/marketplace/MapaUbicacion';
import { ModalAuthRequerido } from '../../components/compartir/ModalAuthRequerido';
import { Spinner } from '../../components/ui/Spinner';
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
            <div className="flex min-h-screen items-center justify-center bg-white">
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
        <div
            data-testid="pagina-articulo-marketplace-publico"
            className="min-h-screen bg-white"
        >
            {/* Header simple — no es el del MainLayout privado */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                    <button
                        data-testid="btn-volver-publico"
                        onClick={() => navigate('/')}
                        aria-label="Volver al inicio"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-teal-600" strokeWidth={2.5} />
                        <span className="text-sm font-bold text-slate-900">
                            AnunciaYA · MarketPlace
                        </span>
                    </div>
                </div>
            </header>

            {/* Contenido — layout 2 cols 60/40 en lg+ */}
            <div className="mx-auto max-w-5xl px-4 py-6">
                <div className="lg:grid lg:grid-cols-[60%_40%] lg:gap-6">
                    {/* Columna izquierda */}
                    <div className="space-y-5">
                        <div className="relative">
                            <GaleriaArticulo
                                fotos={articulo.fotos}
                                titulo={articulo.titulo}
                                fotoPortadaIndex={articulo.fotoPortadaIndex}
                            />
                            {estadoNoActivo && <OverlayEstadoNoActiva estado={estadoNoActivo} />}
                        </div>

                        {/* Bloque info — solo móvil */}
                        <div className="lg:hidden">
                            <BloqueInfoPublico articulo={articulo} />
                        </div>

                        <div>
                            <h2 className="mb-2 text-base font-bold text-slate-900 lg:text-lg">
                                Descripción
                            </h2>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                {articulo.descripcion}
                            </p>
                        </div>

                        <div className="lg:hidden">
                            <CardVendedor vendedor={articulo.vendedor} />
                        </div>

                        <div>
                            <h2 className="mb-2 text-base font-bold text-slate-900 lg:text-lg">
                                Ubicación aproximada
                            </h2>
                            <MapaUbicacion
                                lat={articulo.ubicacionAproximada.lat}
                                lng={articulo.ubicacionAproximada.lng}
                                zonaAproximada={articulo.zonaAproximada}
                            />
                        </div>

                        {/* Mensaje según estado (en móvil, abajo del resumen) */}
                        {noActiva && (
                            <div className="lg:hidden">
                                {estadoNoActivo && <MensajeEstadoNoActiva estado={estadoNoActivo} />}
                            </div>
                        )}
                    </div>

                    {/* Columna derecha — solo desktop, sticky */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            <BloqueInfoPublico articulo={articulo} />
                            <CardVendedor vendedor={articulo.vendedor} />
                            {!estadoNoActivo ? (
                                <BotonContactoPublico onClick={handleEnviarMensaje} />
                            ) : (
                                <MensajeEstadoNoActiva estado={estadoNoActivo} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer con CTA */}
                <div className="mt-12 rounded-xl border-2 border-slate-200 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                        ¿Te gustó este artículo?
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        Descubre más en AnunciaYA — la app de comercio local de tu ciudad.
                    </p>
                    <button
                        data-testid="cta-conocer-anunciaya"
                        onClick={() => navigate('/')}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:scale-[1.02]"
                    >
                        Descubre más en AnunciaYA →
                    </button>
                </div>
            </div>

            {/* Barra de contacto fija inferior — solo móvil + activa */}
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

interface BloqueInfoPublicoProps {
    articulo: NonNullable<ReturnType<typeof useArticuloMarketplace>['data']>;
}

function BloqueInfoPublico({ articulo }: BloqueInfoPublicoProps) {
    return (
        <div className="space-y-2">
            <div className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-4xl">
                {formatearPrecio(articulo.precio)}
            </div>
            <h1 className="text-lg font-semibold leading-snug text-slate-900 lg:text-xl">
                {articulo.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
                <Chip>{ETIQUETA_CONDICION[articulo.condicion]}</Chip>
                {articulo.aceptaOfertas && <Chip>Acepta ofertas</Chip>}
            </div>
            <p className="text-xs text-slate-500">
                {formatearTiempoRelativo(articulo.createdAt)}
            </p>
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {children}
        </span>
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
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
            className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-sm"
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
        <div className="flex min-h-screen items-center justify-center bg-white px-6">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md"
                >
                    Conocer AnunciaYA
                </button>
            </div>
        </div>
    );
}

export default PaginaArticuloMarketplacePublico;
