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

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import {
    ChevronLeft,
    Heart,
    MoreVertical,
    Eye,
    AlertCircle,
    ShoppingCart,
    PackageX,
    PauseCircle,
    PlayCircle,
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
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
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

    // ─── Cerrar menú al hacer click fuera ──────────────────────────────────────
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto]);

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const handleVolver = () => navigate(-1);
    const handleBloquearVendedor = () => {
        setMenuAbierto(false);
        notificar.info('Próximamente disponible');
    };
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
            {/* ════════════════════════════════════════════════════════════════
                HEADER TRANSPARENTE FLOTANTE
            ════════════════════════════════════════════════════════════════ */}
            <div className="relative">
                <div className="absolute inset-x-0 top-0 z-30 bg-linear-to-b from-black/40 to-transparent">
                    <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                        <div className="flex items-center justify-between px-3 py-3">
                            <button
                                data-testid="btn-volver-articulo"
                                onClick={handleVolver}
                                aria-label="Volver"
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-colors hover:bg-white"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>

                            <div className="flex items-center gap-2">
                                <DropdownCompartir
                                    url={linkCompartido}
                                    texto={`Mira "${articulo.titulo}" en AnunciaYA MarketPlace`}
                                    titulo={articulo.titulo}
                                    variante="glass"
                                />

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
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-colors hover:bg-white disabled:opacity-50"
                                >
                                    <Heart
                                        className="h-4 w-4"
                                        strokeWidth={2.5}
                                        fill={guardado ? '#f43f5e' : 'none'}
                                        color={guardado ? '#f43f5e' : 'currentColor'}
                                    />
                                </button>

                                <div className="relative" ref={menuRef}>
                                    <button
                                        data-testid="btn-menu-articulo"
                                        onClick={() => setMenuAbierto((v) => !v)}
                                        aria-label="Más opciones"
                                        aria-haspopup="menu"
                                        aria-expanded={menuAbierto}
                                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-colors hover:bg-white"
                                    >
                                        <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                    {menuAbierto && (
                                        <div
                                            data-testid="menu-mas-opciones"
                                            role="menu"
                                            className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                                        >
                                            <button
                                                data-testid="opcion-bloquear-vendedor"
                                                onClick={handleBloquearVendedor}
                                                className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                            >
                                                Bloquear vendedor
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO
            ════════════════════════════════════════════════════════════════ */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 lg:pt-4 2xl:px-8">
                {/* ─── DESKTOP: 2 columnas 60/40 ─────────────────────────── */}
                <div className="lg:grid lg:grid-cols-[60%_40%] lg:gap-8">
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

                        {/* Bloque info — SOLO en móvil. En desktop va en col-derecha */}
                        <div className="px-3 lg:hidden">
                            <BloqueInfo articulo={articulo} />
                        </div>

                        {/* Descripción — card propia tipo Mercado Libre */}
                        <div className="mx-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:mx-0 lg:p-5">
                            <h2 className="mb-2 text-base font-bold text-slate-900 lg:text-lg">
                                Descripción
                            </h2>
                            <p
                                data-testid="descripcion"
                                className="whitespace-pre-line text-sm leading-relaxed text-slate-700"
                            >
                                {articulo.descripcion}
                            </p>
                        </div>

                        {/* Card vendedor — SOLO en móvil. En desktop va en col-derecha */}
                        <div className="px-3 lg:hidden">
                            <CardVendedor vendedor={articulo.vendedor} />
                        </div>

                        {/* Mapa — card propia */}
                        <div className="mx-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:mx-0 lg:p-5">
                            <h2 className="mb-2 text-base font-bold text-slate-900 lg:text-lg">
                                Ubicación aproximada
                            </h2>
                            <MapaUbicacion
                                lat={articulo.ubicacionAproximada.lat}
                                lng={articulo.ubicacionAproximada.lng}
                                zonaAproximada={articulo.zonaAproximada}
                            />
                        </div>

                        {/* Preguntas y Respuestas — card propia */}
                        <div className="mx-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:mx-0 lg:p-5">
                            <SeccionPreguntas
                                articuloId={articulo.id}
                                esDueno={esDueno}
                                usuarioAutenticado={!!usuarioActual}
                                onAbrirModalPregunta={() => setModalPreguntaAbierto(true)}
                            />
                        </div>
                    </div>

                    {/* ─── COLUMNA DERECHA — solo desktop, sticky ─────────── */}
                    <div className="hidden lg:block">
                        <div className="sticky top-4 space-y-4">
                            <BloqueInfo articulo={articulo} />
                            <CardVendedor vendedor={articulo.vendedor} />
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
                            ) : (
                                <BarraContacto articulo={articulo} variante="desktop" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                    <div className="border-t border-slate-200 bg-white p-3">
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
}

function BloqueInfo({ articulo }: BloqueInfoProps) {
    if (!articulo) return null;
    return (
        <div className="space-y-3 rounded-xl bg-white p-1 lg:rounded-none lg:p-0">
            <div
                data-testid="precio"
                className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-4xl"
            >
                {formatearPrecio(articulo.precio)}
            </div>
            <h1
                data-testid="titulo"
                className="text-lg font-semibold leading-snug text-slate-900 lg:text-xl"
            >
                {articulo.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
                <Chip>{ETIQUETA_CONDICION[articulo.condicion]}</Chip>
                {articulo.aceptaOfertas && <Chip>Acepta ofertas</Chip>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{formatearTiempoRelativo(articulo.createdAt)}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                    {articulo.totalVistas} {articulo.totalVistas === 1 ? 'vista' : 'vistas'}
                </span>
            </div>
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
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Icon className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">
                    {config.titulo}
                </h2>
                <p className="mb-5 text-sm text-slate-600">{config.cuerpo}</p>
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
