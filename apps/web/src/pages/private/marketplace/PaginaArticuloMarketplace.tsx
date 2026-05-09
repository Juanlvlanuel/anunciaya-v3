/**
 * PaginaArticuloMarketplace.tsx
 * ==============================
 * Detalle del artículo de MarketPlace. Lo ve el comprador al hacer click en
 * una card del feed (o al recibir un link compartido — la página pública del
 * Sprint 7 reutilizará esta misma vista pero sin layout de la app).
 *
 * Estructura (móvil):
 *  - Galería con swipe (header transparente flotante encima).
 *  - Bloque info: precio, título, chips, tiempo + vistas.
 *  - Descripción.
 *  - Card del vendedor.
 *  - Mapa con círculo 500m + texto de privacidad.
 *  - Padding inferior + barra fija con WhatsApp + Enviar mensaje.
 *
 * Estructura (desktop, lg+):
 *  - 2 columnas 60/40. Izquierda: galería + descripción + mapa. Derecha
 *    sticky: precio, título, chips, vendedor, barra de contacto inline.
 *
 * Comportamiento:
 *  - Header transparente con back, compartir, ❤️ guardar, ⋯ menú.
 *  - Al montar: dispara `registrarVistaArticulo(id)` solo si el visitante NO
 *    es el dueño (filtro frontend) y solo una vez por sesión (sessionStorage).
 *  - Estado 404 amigable con botón "Volver al MarketPlace".
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2)
 * Sprint:      docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import {
    ChevronLeft,
    Heart,
    Eye,
    AlertCircle,
    ShoppingCart,
    PackageX,
    PauseCircle,
    PlayCircle,
    MessageCircle,
    ShieldCheck,
    MapPin,
    UserCheck,
    Flag,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    useArticuloMarketplace,
    registrarVistaArticulo,
    heartbeatArticulo,
    useReactivarArticulo,
} from '../../../hooks/queries/useMarketplace';
import { useGuardados } from '../../../hooks/useGuardados';
import {
    formatearPrecio,
    formatearTiempoRelativo,
} from '../../../utils/marketplace';
import { GaleriaArticulo } from '../../../components/marketplace/GaleriaArticulo';
import { CardVendedor } from '../../../components/marketplace/CardVendedor';
import { MapaUbicacion } from '../../../components/marketplace/MapaUbicacion';
import { BarraContacto } from '../../../components/marketplace/BarraContacto';
import { SeccionPreguntas } from '../../../components/marketplace/SeccionPreguntas';
import { ModalHacerPregunta } from '../../../components/marketplace/ModalHacerPregunta';
import { DropdownCompartir } from '../../../components/compartir/DropdownCompartir';
import Tooltip from '../../../components/ui/Tooltip';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import type { CondicionArticulo } from '../../../types/marketplace';

// =============================================================================
// HELPERS
// =============================================================================

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
    nuevo: 'Nuevo',
    seminuevo: 'Seminuevo',
    usado: 'Usado',
    para_reparar: 'Para reparar',
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaArticuloMarketplace() {
    const { articuloId } = useParams<{ articuloId: string }>();
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);

    const { data: articulo, isLoading, isError, error } = useArticuloMarketplace(articuloId);
    const [modalPreguntaAbierto, setModalPreguntaAbierto] = useState(false);

    // Sincroniza la BarraContacto fija con el BottomNav: cuando el usuario
    // hace scroll y el BottomNav se oculta, los botones bajan para no quedar
    // flotando sobre un espacio vacío.
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });

    const esDueno = !!usuarioActual && !!articulo && usuarioActual.id === articulo.vendedor.id;

    // ─── Botón guardar ─────────────────────────────────────────────────────────
    const { guardado, loading: cargandoGuardar, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articuloId ?? '',
    });

    // ─── Reactivar (Sprint 7) ─────────────────────────────────────────────────
    const reactivarMutation = useReactivarArticulo();

    // ─── Registrar vista (filtra dueño + dedup por sessionStorage) ─────────────
    useEffect(() => {
        if (!articulo || !articuloId) return;
        if (usuarioActual?.id === articulo.vendedor.id) return;
        registrarVistaArticulo(articuloId);
    }, [articulo, articuloId, usuarioActual?.id]);

    // ─── Heartbeat "viendo ahora" — solo usuarios autenticados ─────────────────
    // Primer ping a los 5s (evita contar rebotes). Luego cada 60s.
    useEffect(() => {
        if (!articuloId || !usuarioActual) return;
        const primerPing = setTimeout(() => {
            heartbeatArticulo(articuloId);
        }, 5000);
        const intervalo = setInterval(() => {
            heartbeatArticulo(articuloId);
        }, 60_000);
        return () => {
            clearTimeout(primerPing);
            clearInterval(intervalo);
        };
    }, [articuloId, usuarioActual]);

    // ─── Handlers ──────────────────────────────────────────────────────────────
    // Botón ← centralizado en el hook `useVolverAtras` — respeta historial
    // interno (idéntico a flecha nativa) con fallback a `/marketplace`
    // cuando se entra por URL directa.
    const handleVolver = useVolverAtras('/marketplace');
    const handleReactivar = async () => {
        if (!articuloId) return;
        try {
            const resp = await reactivarMutation.mutateAsync({ articuloId });
            notificar.exito(
                resp.message ?? 'Tu publicación está activa de nuevo. Expira en 30 días.'
            );
        } catch {
            notificar.error('No pudimos reactivar la publicación. Intenta de nuevo.');
        }
    };

    // ─── Estados ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (isError || !articulo) {
        const noEncontrado = status === 404 || !articulo;
        return (
            <Estado404OError
                tipo={noEncontrado ? '404' : 'error'}
                onVolver={() => navigate('/marketplace')}
            />
        );
    }

    // ─── Render normal ─────────────────────────────────────────────────────────

    const linkCompartido =
        typeof window !== 'undefined'
            ? `${window.location.origin}/p/articulo-marketplace/${articulo.id}`
            : `/p/articulo-marketplace/${articulo.id}`;

    const overlayEstado = articulo.estado !== 'activa' ? articulo.estado : null;

    return (
        <div
            data-testid="pagina-articulo-marketplace"
            className="min-h-full bg-transparent pb-[150px] lg:pb-12"
        >
            {/* Wrapper único `max-w-7xl` — todo lo que esté adentro (header
                sticky + contenido) respeta exactamente el mismo ancho. Esto
                garantiza que el contenido NO se salga del ancho horizontal
                del header negro. */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">

            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — Identidad teal del MarketPlace.
                Mismo patrón que PaginaMarketplace y P3 PaginaPerfilVendedor:
                fondo negro + glow teal + grid pattern. El icono gradient
                teal antes del título refuerza la marca.
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-30">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.07) 0%, transparent 50%)',
                            }}
                        />
                        {/* Grid pattern sutil */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        {/* Contenido del header */}
                        <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5">
                            {/* Bloque izquierdo: ← + icono teal + Detalle | título */}
                            <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                    data-testid="btn-volver-articulo"
                                    onClick={handleVolver}
                                    aria-label="Volver"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                                >
                                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                    }}
                                >
                                    <ShoppingCart
                                        className="h-[18px] w-[18px] text-black"
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <span className="ml-1.5 shrink-0 text-2xl font-extrabold tracking-tight text-white">
                                    De<span className="text-teal-400">talle</span>
                                </span>

                                {/* Separador vertical */}
                                <span
                                    aria-hidden
                                    className="ml-2 h-7 w-[1.5px] shrink-0 rounded-full bg-white/50"
                                />

                                {/* Título del artículo (truncado) */}
                                <span className="ml-1 min-w-0 truncate text-sm font-semibold text-white/85 lg:text-base">
                                    {articulo.titulo}
                                </span>
                            </div>

                            {/* Bloque derecho: compartir + heart.
                                Tooltips condicionados con `hidden lg:block`
                                — el wrapper del Tooltip siempre envuelve al
                                botón, pero el texto flotante solo aparece
                                en desktop (donde sí hay hover real). En
                                móvil el botón se comporta sin tooltip,
                                consistente con el patrón usado en P3
                                Perfil del Vendedor. */}
                            <div className="flex shrink-0 items-center gap-1">
                                <Tooltip
                                    text="Compartir publicación"
                                    position="bottom"
                                    className="hidden lg:block"
                                >
                                    <DropdownCompartir
                                        url={linkCompartido}
                                        texto={`Mira "${articulo.titulo}" en AnunciaYA MarketPlace`}
                                        titulo={articulo.titulo}
                                        variante="dark"
                                    />
                                </Tooltip>

                                <Tooltip
                                    text={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                                    position="bottom"
                                    className="hidden lg:block"
                                >
                                    <button
                                        data-testid="btn-guardar-articulo"
                                        onClick={toggleGuardado}
                                        disabled={cargandoGuardar}
                                        aria-label={
                                            guardado
                                                ? 'Quitar de guardados'
                                                : 'Guardar artículo'
                                        }
                                        aria-pressed={guardado}
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-50 lg:cursor-pointer lg:hover:bg-white/10 ${
                                            guardado ? 'text-rose-400' : 'text-white/50 lg:hover:text-white'
                                        }`}
                                    >
                                        <Heart
                                            className="h-5 w-5"
                                            strokeWidth={2.5}
                                            fill={guardado ? '#fb7185' : 'none'}
                                        />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO — comparte el wrapper max-w-7xl con el header.
                En móvil: sin padding-top — la galería queda pegada al header
                (visualmente continua, sin franja del fondo azul de la app).
                En desktop: padding arriba y abajo (lg:py-8).
            ════════════════════════════════════════════════════════════════ */}
                <div className="pb-5 lg:py-8">
                    {/* ─── DESKTOP: 2 columnas 60/40 con fracciones (fr).
                        Se usa `3fr_2fr` (no `60%_40%`) porque CSS Grid suma el
                        gap DESPUÉS de calcular los porcentajes, causando
                        overflow horizontal del grid sobre su contenedor. Las
                        fr se distribuyen sobre el espacio restante tras el
                        gap, evitando el desbordamiento.
                    ─────────────────────────────────────────────────────── */}
                    <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
                    {/* ─── COLUMNA IZQUIERDA (full width en móvil) ───────── */}
                    <div className="space-y-5 lg:space-y-6">
                        {/* Galería */}
                        <div className="relative">
                            <GaleriaArticulo
                                fotos={articulo.fotos}
                                titulo={articulo.titulo}
                                fotoPortadaIndex={articulo.fotoPortadaIndex}
                            />
                            {overlayEstado && <OverlayEstado estado={overlayEstado} />}
                        </div>

                        {/* Bloque info — SOLO en móvil. En desktop va en col-derecha.
                            Card propia con la misma estética que Descripción y
                            Características (border slate-300 + shadow-md). */}
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:hidden">
                            <BloqueInfo articulo={articulo} />
                        </div>

                        {/* Descripción — card propia tipo Mercado Libre */}
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

                        {/* Características — solo móvil. En desktop va en
                            el panel sticky derecho (estilo Mercado Libre,
                            datos clave junto al precio). */}
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md lg:hidden">
                            <h2 className="mb-3 text-base font-bold text-slate-900">
                                Características
                            </h2>
                            <CaracteristicasTabla articulo={articulo} />
                        </div>

                        {/* Card vendedor — SOLO en móvil. En desktop va en col-derecha */}
                        <div className="px-3 lg:hidden">
                            <CardVendedor vendedor={articulo.vendedor} />
                        </div>

                        {/* Mapa — card propia */}
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

                        {/* Preguntas y Respuestas — card propia */}
                        <div className="mx-3 rounded-xl border-2 border-slate-300 bg-white p-3 shadow-md lg:mx-0 lg:p-4">
                            <SeccionPreguntas
                                articuloId={articulo.id}
                                vendedor={articulo.vendedor}
                                esDueno={esDueno}
                                usuarioAutenticado={!!usuarioActual}
                                onAbrirModalPregunta={() => setModalPreguntaAbierto(true)}
                            />
                        </div>
                    </div>

                    {/* ─── COLUMNA DERECHA — solo desktop, sticky.
                        max-h calculado para que TODOS los cards quepan en el
                        viewport sin scroll de página. Si excede (pantallas
                        cortas), el panel scrollea INTERNAMENTE con scrollbar
                        oculto — el usuario sigue viendo todo el contenido y
                        la columna izquierda hace su scroll independiente. */}
                    <div className="hidden lg:block">
                        <div
                            className="sticky top-24 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ maxHeight: 'calc(100vh - 7rem)' }}
                        >
                            {/* Card consolidada: info + CTAs (estilo MercadoLibre).
                                Padding `p-4` unificado en todas las cards del
                                panel sticky (mismo patrón en la pública). */}
                            <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                <BloqueInfo articulo={articulo} compacto />

                                <div className="mt-3 space-y-1.5 border-t-2 border-slate-200 pt-3">
                                    {/*
                                      Si el visitante es el dueño Y el artículo está
                                      pausado, mostramos botón Reactivar EN LUGAR de
                                      la BarraContacto (no tiene sentido contactarse
                                      a uno mismo).
                                    */}
                                    {usuarioActual?.id === articulo.vendedor.id &&
                                    articulo.estado === 'pausada' ? (
                                        <BotonReactivar
                                            onClick={handleReactivar}
                                            cargando={reactivarMutation.isPending}
                                        />
                                    ) : usuarioActual?.id === articulo.vendedor.id ? (
                                        <p className="text-sm font-medium text-slate-600">
                                            Esta es tu publicación.
                                        </p>
                                    ) : (
                                        // CTAs principales: WhatsApp + ChatYA.
                                        // El botón "Hacer una pregunta" vive en la
                                        // sección Q&A (columna izquierda) — evita
                                        // duplicación y libera espacio vertical
                                        // en el panel sticky.
                                        <BarraContacto articulo={articulo} variante="desktop" />
                                    )}
                                </div>
                            </div>

                            {/* Card vendedor — padding unificado con el resto. */}
                            <CardVendedor vendedor={articulo.vendedor} className="p-4" />

                            {/* Características — solo desktop, debajo del
                                card vendedor. Padding `p-4` consistente. */}
                            <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-md">
                                <h2 className="mb-1.5 text-base font-bold text-slate-900">
                                    Características
                                </h2>
                                <CaracteristicasTabla articulo={articulo} compacto />
                            </div>

                            {/* Compra segura — tips de seguridad estilo MP. */}
                            <CardCompraSegura />
                        </div>
                    </div>
                </div>
                </div>
            </div>{/* /wrapper único max-w-7xl */}

            {/* Modal hacer pregunta */}
            <ModalHacerPregunta
                abierto={modalPreguntaAbierto}
                articuloId={articulo.id}
                onCerrar={() => setModalPreguntaAbierto(false)}
            />

            {/* ════════════════════════════════════════════════════════════════
                BARRA FIJA INFERIOR — solo móvil
                - z-50 para quedar sobre el BottomNav (z-40).
                - bottom dinámico: 68px cuando BottomNav está visible (sobre él),
                  0 cuando se oculta al hacer scroll (pegada al borde).
                - Fondo gradient suave de slate (no blanco duro) para integrarse
                  con el fondo de la app y no contrastar con la página detalle.
            ════════════════════════════════════════════════════════════════ */}
            <div
                className="fixed inset-x-0 z-50 transition-[bottom] duration-300 ease-out lg:hidden"
                style={{ bottom: bottomNavVisible ? '68px' : '0px' }}
            >
                {usuarioActual?.id === articulo.vendedor.id &&
                articulo.estado === 'pausada' ? (
                    <div className="border-t-2 border-slate-300 bg-white p-3">
                        <BotonReactivar
                            onClick={handleReactivar}
                            cargando={reactivarMutation.isPending}
                        />
                    </div>
                ) : (
                    <BarraContacto articulo={articulo} variante="mobile" />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// BOTÓN REACTIVAR (Sprint 7)
// =============================================================================

interface BotonReactivarProps {
    onClick: () => void;
    cargando: boolean;
}

function BotonReactivar({ onClick, cargando }: BotonReactivarProps) {
    return (
        <button
            data-testid="btn-reactivar-articulo"
            onClick={onClick}
            disabled={cargando}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-teal-600 to-teal-800 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
            <PlayCircle className="h-4 w-4" strokeWidth={2.5} />
            {cargando ? 'Reactivando…' : 'Reactivar publicación'}
        </button>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface BloqueInfoProps {
    articulo: ReturnType<typeof useArticuloMarketplace>['data'] & object;
    /** Si true, reduce paddings y tamaños de texto para caber en el panel
     *  sticky desktop sin requerir scroll. Default false (vista mobile). */
    compacto?: boolean;
}

function BloqueInfo({ articulo, compacto = false }: BloqueInfoProps) {
    if (!articulo) return null;
    return (
        <div className={compacto ? 'space-y-1.5' : 'space-y-3 lg:space-y-4'}>
            {/* Eyebrow MarketPlace · Ciudad — con realce de marca:
                "MarketPlace" en teal brand + icono ubicación + ciudad
                en slate fuerte. Da contexto de origen y geografía con
                la jerarquía visual que merece (estilo ML breadcrumb). */}
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

            {/* Precio gigante (Mercado Libre style) */}
            <div
                data-testid="precio"
                className={
                    compacto
                        ? 'text-2xl font-extrabold leading-none tracking-tight text-slate-900 2xl:text-3xl'
                        : 'text-4xl font-extrabold leading-none tracking-tight text-slate-900 lg:text-5xl'
                }
            >
                {formatearPrecio(articulo.precio)}
            </div>

            {/* Chips: condición (semántico) + acepta ofertas */}
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
 * Card de tips de seguridad estilo Mercado Libre "Compra Protegida".
 * Refuerza confianza con lineamientos básicos para una transacción segura.
 * Genérico — el contenido es el mismo para todos los artículos.
 */
function CardCompraSegura() {
    const tips: Array<{ icono: React.ComponentType<{ className?: string; strokeWidth?: number }>; texto: string }> = [
        { icono: MapPin, texto: 'Acuerda el punto de encuentro en un lugar público' },
        { icono: UserCheck, texto: 'Verifica el producto antes de pagar' },
        { icono: ShieldCheck, texto: 'Lleva acompañante o avísale a alguien' },
        { icono: Flag, texto: 'Reporta cualquier comportamiento sospechoso' },
    ];
    return (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-md">
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

/**
 * Tabla de características estilo Mercado Libre.
 * Lista key-value densa con las propiedades del artículo.
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
        {
            label: 'Condición',
            valor: ETIQUETA_CONDICION[articulo.condicion],
        },
        {
            label: 'Acepta ofertas',
            valor: articulo.aceptaOfertas ? 'Sí' : 'No',
        },
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
    // Tamaño uniforme `text-sm` en todos los breakpoints — alineado a la
    // jerarquía global del detalle (cuerpo y filas comparten tamaño base
    // para que la columna izquierda y el panel sticky derecho se sientan
    // del mismo módulo, no de dos componentes con escalas distintas).
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
 * Chip de condición con color semántico:
 *  - Nuevo → emerald (positivo)
 *  - Seminuevo → blue (informativo)
 *  - Usado → slate (neutral)
 *  - Para reparar → amber (advertencia)
 */
function ChipCondicion({ condicion }: { condicion: CondicionArticulo }) {
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

interface OverlayEstadoProps {
    estado: 'pausada' | 'vendida' | 'eliminada';
}

function OverlayEstado({ estado }: OverlayEstadoProps) {
    const config = {
        vendida: {
            label: 'VENDIDO',
            bg: 'bg-rose-600/85',
            icon: PackageX,
        },
        pausada: {
            label: 'PAUSADO',
            bg: 'bg-slate-700/85',
            icon: PauseCircle,
        },
        eliminada: {
            label: 'ELIMINADO',
            bg: 'bg-slate-900/85',
            icon: PackageX,
        },
    }[estado];

    const Icon = config.icon;

    return (
        <div
            data-testid={`overlay-estado-${estado}`}
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

interface Estado404OErrorProps {
    tipo: '404' | 'error';
    onVolver: () => void;
}

function Estado404OError({ tipo, onVolver }: Estado404OErrorProps) {
    const config =
        tipo === '404'
            ? {
                  Icon: ShoppingCart,
                  titulo: 'Artículo no encontrado',
                  cuerpo:
                      'La publicación que buscas no existe o fue eliminada por el vendedor.',
              }
            : {
                  Icon: AlertCircle,
                  titulo: 'No pudimos cargar el artículo',
                  cuerpo: 'Revisa tu conexión e intenta de nuevo.',
              };

    const Icon = config.Icon;

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
            <div
                data-testid={`estado-${tipo}`}
                className="flex max-w-md flex-col items-center text-center"
            >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <Icon className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">
                    {config.titulo}
                </h2>
                <p className="mb-5 text-sm font-medium text-slate-600">{config.cuerpo}</p>
                <button
                    data-testid="btn-volver-marketplace"
                    onClick={onVolver}
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
                >
                    Volver al MarketPlace
                </button>
            </div>
        </div>
    );
}

export default PaginaArticuloMarketplace;
