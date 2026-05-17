/**
 * PaginaMisPublicaciones.tsx
 * ===========================
 * Panel del vendedor de MarketPlace — gestiona los artículos que ha
 * publicado: ver Activas / Pausadas / Vendidas, cambiar estado, marcar
 * vendido, eliminar, reactivar (extiende +30 días) y editar.
 *
 * Estructura visual: header dark sticky con identidad cyan (replica el
 * patrón estandarizado de CardYA/Cupones/Guardados/MarketPlace). Listado
 * de cards densas (`CardArticuloMio`) con KPIs reales del backend.
 *
 * Endpoints consumidos (todos detrás de `verificarToken +
 * requiereModoPersonal`):
 *   - GET    /api/marketplace/mis-articulos?estado=...
 *   - PATCH  /api/marketplace/articulos/:id/estado
 *   - POST   /api/marketplace/articulos/:id/reactivar
 *   - DELETE /api/marketplace/articulos/:id
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Pendiente cerrado: docs/reportes/MarketPlace/Pendientes.md §C.2
 *
 * Ubicación: apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Plus,
    FileEdit,
    ArrowRight,
    CheckCircle2,
    PauseCircle,
    ShoppingBag,
    ShoppingCart,
    AlertTriangle,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import type { ComponentType } from 'react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Package = (p: IconoWrapperProps) => <Icon icon={ICONOS.producto} {...p} />;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
const Briefcase = (p: IconoWrapperProps) => <Icon icon={ICONOS.empleos} {...p} />;

/** Tipo que admite tanto LucideIcon como wrappers locales Iconify. */
type IconLike =
    | LucideIcon
    | ComponentType<{ className?: string; strokeWidth?: number; fill?: string; width?: number | string; height?: number | string }>;
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';
import { Spinner } from '../../../components/ui/Spinner';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { CardArticuloMio } from '../../../components/marketplace/CardArticuloMio';
import { MisPublicacionesServiciosSection } from '../../../components/servicios/MisPublicacionesServiciosSection';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import {
    useMisArticulosMarketplace,
    useCambiarEstadoArticuloMarketplace,
    useEliminarArticuloMarketplace,
    useReactivarArticulo,
} from '../../../hooks/queries/useMarketplace';
import { notificar } from '../../../utils/notificaciones';
import type { ArticuloMarketplace } from '../../../types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

type TabPublicacion = 'activa' | 'pausada' | 'vendida';

/**
 * Tipo de publicación. El usuario podrá publicar tanto en MarketPlace
 * (artículos físicos) como en Servicios (servicios/empleos), por lo que
 * este panel admite los dos tipos con un selector top-level que cambia
 * todo el contexto (tabs, conteos, listados, ciclos de vida).
 *
 * Servicios todavía no tiene backend implementado — el tab muestra un
 * estado "Próximamente" hasta que llegue su sprint.
 */
type TipoPublicacion = 'marketplace' | 'servicios';

const TIPOS: { id: TipoPublicacion; label: string; Icono: IconLike }[] = [
    { id: 'marketplace', label: 'MarketPlace', Icono: ShoppingCart },
    { id: 'servicios', label: 'Servicios', Icono: Briefcase },
];

/**
 * Tabs aplicables por tipo de publicación.
 *
 * - MarketPlace: 3 estados — `activa`, `pausada`, `vendida`.
 * - Servicios:   2 estados — `activa`, `pausada`. Un servicio NO se "vende y
 *                desaparece" como un artículo físico; cuando el vendedor ya
 *                no lo ofrece, lo elimina directamente. Los tabs están
 *                pre-cableados en la UI aunque el backend de Servicios aún
 *                no exista — el body sigue mostrando "Próximamente" hasta
 *                que llegue su sprint.
 *
 * Decisión arquitectural acordada con el usuario (mayo 2026).
 */
const TABS_POR_TIPO: Record<
    TipoPublicacion,
    { id: TabPublicacion; label: string; Icono: typeof CheckCircle2 }[]
> = {
    marketplace: [
        { id: 'activa', label: 'Activas', Icono: CheckCircle2 },
        { id: 'pausada', label: 'Pausadas', Icono: PauseCircle },
        { id: 'vendida', label: 'Vendidas', Icono: ShoppingBag },
    ],
    servicios: [
        { id: 'activa', label: 'Activas', Icono: CheckCircle2 },
        { id: 'pausada', label: 'Pausadas', Icono: PauseCircle },
    ],
};

/**
 * El wizard de publicar guarda el borrador "nuevo" en localStorage bajo
 * `wizard_marketplace_${usuarioId}_nuevo`. Las keys con `articuloId` son
 * borradores de edición de artículos ya publicados — NO se consideran
 * borradores aquí (solo nos interesa el de creación nueva, que es único
 * por usuario).
 */
const STORAGE_PREFIX_WIZARD = 'wizard_marketplace_';

// =============================================================================
// COMPONENTE
// =============================================================================

export function PaginaMisPublicaciones() {
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/inicio');
    const usuarioId = useAuthStore((s) => s.usuario?.id ?? null);
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

    // BottomNav auto-hide tracker — el FAB Publicar baja a `bottom-4` cuando
    // el BottomNav se oculta y vuelve a `bottom-20` cuando reaparece. Mismo
    // patrón que el FAB del feed de MarketPlace.
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });

    // ─── Estado UI ───────────────────────────────────────────────────────────
    const [tipoActivo, setTipoActivo] = useState<TipoPublicacion>('marketplace');
    const [tabActivo, setTabActivo] = useState<TabPublicacion>('activa');
    const [borradorExiste, setBorradorExiste] = useState(false);

    // Si el tab actual no aplica al tipo nuevo (ej. estabas en "vendida" y
    // cambiaste a "servicios" que solo tiene activa/pausada), resetear a
    // "activa". Evita estado inconsistente cuando el toggle de tipo cambia.
    useEffect(() => {
        const idsValidos = TABS_POR_TIPO[tipoActivo].map((t) => t.id);
        if (!idsValidos.includes(tabActivo)) {
            setTabActivo('activa');
        }
    }, [tipoActivo, tabActivo]);
    const [articuloAMarcarVendido, setArticuloAMarcarVendido] =
        useState<ArticuloMarketplace | null>(null);
    const [articuloAEliminar, setArticuloAEliminar] =
        useState<ArticuloMarketplace | null>(null);

    // Conteos de Servicios (los reporta la sección via callback `onConteos`).
    // Necesarios para los badges de los tabs cuando `tipoActivo === 'servicios'`.
    const [conteosServicios, setConteosServicios] = useState<{
        activa: number;
        pausada: number;
    }>({ activa: 0, pausada: 0 });

    // ─── Datos del servidor (React Query) ────────────────────────────────────
    // Cargamos las 3 listas en paralelo para que los badges de los tabs
    // muestren el conteo aunque el tab no esté activo. React Query cachea
    // cada query independientemente (`staleTime: 60s`), así que cambiar de
    // tab es instantáneo después del primer fetch.
    const queryActiva = useMisArticulosMarketplace('activa', { limit: 50, offset: 0 });
    const queryPausada = useMisArticulosMarketplace('pausada', { limit: 50, offset: 0 });
    const queryVendida = useMisArticulosMarketplace('vendida', { limit: 50, offset: 0 });

    const cambiarEstadoMutation = useCambiarEstadoArticuloMarketplace();
    const reactivarMutation = useReactivarArticulo();
    const eliminarMutation = useEliminarArticuloMarketplace();

    // Conteos por tab (siempre disponibles, independientes del tab activo).
    const conteoPorTab: Record<TabPublicacion, number> = {
        activa: queryActiva.data?.paginacion.total ?? 0,
        pausada: queryPausada.data?.paginacion.total ?? 0,
        vendida: queryVendida.data?.paginacion.total ?? 0,
    };

    // Query del tab actual — derivada de las 3 anteriores.
    const queryActual =
        tabActivo === 'activa'
            ? queryActiva
            : tabActivo === 'pausada'
              ? queryPausada
              : queryVendida;

    const articulos = queryActual.data?.data ?? [];
    const total = queryActual.data?.paginacion.total ?? 0;
    const isPending = queryActual.isPending;
    const isError = queryActual.isError;
    const refetch = queryActual.refetch;

    // ─── Detectar borrador "nuevo" en localStorage al montar ──────────────────
    // El wizard guarda automáticamente cada cambio. Si el usuario empezó a
    // publicar y se salió sin terminar, mostramos un banner discreto para que
    // pueda volver a su borrador.
    useEffect(() => {
        if (!usuarioId) {
            setBorradorExiste(false);
            return;
        }
        const key = `${STORAGE_PREFIX_WIZARD}${usuarioId}_nuevo`;
        const valor = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (!valor) {
            setBorradorExiste(false);
            return;
        }
        try {
            const parsed = JSON.parse(valor) as {
                titulo?: string;
                fotos?: string[];
            };
            const tieneContenido =
                (parsed.titulo?.trim().length ?? 0) > 0 ||
                (parsed.fotos?.length ?? 0) > 0;
            setBorradorExiste(tieneContenido);
        } catch {
            setBorradorExiste(false);
        }
    }, [usuarioId]);

    // ─── Handlers de navegación / CTAs ───────────────────────────────────────
    const irAPublicar = () => navigate('/marketplace/publicar');
    const continuarBorrador = () => navigate('/marketplace/publicar');

    // ─── Handlers de acciones por artículo ───────────────────────────────────
    const handleEditar = (articulo: ArticuloMarketplace) => {
        navigate(`/marketplace/publicar/${articulo.id}`);
    };

    const handlePausar = async (articulo: ArticuloMarketplace) => {
        try {
            await cambiarEstadoMutation.mutateAsync({
                articuloId: articulo.id,
                estado: 'pausada',
            });
            notificar.exito('Publicación pausada. Ya no aparece en el feed.');
        } catch {
            notificar.error('No pudimos pausar la publicación. Intenta de nuevo.');
        }
    };

    const handleReactivar = async (articulo: ArticuloMarketplace) => {
        try {
            const resp = await reactivarMutation.mutateAsync({ articuloId: articulo.id });
            // El backend devuelve mensaje distinto si viene de `vendida` o
            // `pausada` — usamos ese mensaje como fallback, sino uno genérico.
            notificar.exito(
                resp.message ?? 'Publicación activa de nuevo. Expira en 30 días.'
            );
        } catch {
            notificar.error('No pudimos reactivar la publicación. Intenta de nuevo.');
        }
    };

    const handleAbrirMarcarVendido = (articulo: ArticuloMarketplace) => {
        setArticuloAMarcarVendido(articulo);
    };

    const handleAbrirEliminar = (articulo: ArticuloMarketplace) => {
        setArticuloAEliminar(articulo);
    };

    const handleConfirmarVendido = async () => {
        if (!articuloAMarcarVendido) return;
        try {
            await cambiarEstadoMutation.mutateAsync({
                articuloId: articuloAMarcarVendido.id,
                estado: 'vendida',
            });
            notificar.exito('Marcado como vendido. ¡Felicidades por tu venta!');
            setArticuloAMarcarVendido(null);
        } catch {
            notificar.error('No pudimos marcar como vendido. Intenta de nuevo.');
        }
    };

    const handleConfirmarEliminar = async () => {
        if (!articuloAEliminar) return;
        try {
            await eliminarMutation.mutateAsync({ articuloId: articuloAEliminar.id });
            notificar.exito('Publicación eliminada.');
            setArticuloAEliminar(null);
        } catch {
            notificar.error('No pudimos eliminar la publicación. Intenta de nuevo.');
        }
    };

    return (
        <div className="min-h-full bg-transparent">
            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — Identidad cyan
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-20">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil cyan */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(6,182,212,0.07) 0%, transparent 50%)',
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

                        <div className="relative z-10">
                            {/* ═══ MOBILE HEADER (< lg) ═══ */}
                            <div className="lg:hidden">
                                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            data-testid="btn-volver-mis-publicaciones"
                                            onClick={handleVolver}
                                            aria-label="Volver"
                                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #22d3ee, #0891b2)',
                                            }}
                                        >
                                            <Package
                                                className="h-4.5 w-4.5 text-white"
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                        <span className="ml-1.5 truncate text-2xl font-extrabold tracking-tight text-white">
                                            Mis <span className="text-cyan-400">Publicaciones</span>
                                        </span>
                                    </div>
                                    <div className="-mr-1 flex shrink-0 items-center gap-0">
                                        <button
                                            data-testid="btn-notificaciones-mis-publicaciones"
                                            onClick={(e) => {
                                                e.currentTarget.blur();
                                                togglePanelNotificaciones();
                                            }}
                                            aria-label="Notificaciones"
                                            className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <Bell
                                                className="h-6 w-6 animate-bell-ring"
                                                strokeWidth={2.5}
                                            />
                                            {cantidadNoLeidas > 0 && (
                                                <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-black">
                                                    {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            data-testid="btn-menu-mis-publicaciones"
                                            onClick={abrirMenuDrawer}
                                            aria-label="Abrir menú"
                                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <IconoMenuMorph />
                                        </button>
                                    </div>
                                </div>
                                {/* Subtítulo móvil decorativo (rayas cyan a los lados,
                                    igual que en CardYA/Cupones/Guardados). El toggle de
                                    MarketPlace/Servicios vive en la fila inferior de los
                                    tabs (fijo a la izquierda + tabs scrollables a la
                                    derecha), no aquí. */}
                                <div className="flex items-center justify-center gap-2.5 pb-2">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, transparent, rgba(6,182,212,0.7))',
                                        }}
                                    />
                                    <span className="text-base font-light tracking-wide text-white/70">
                                        Gestiona tus{' '}
                                        <span className="font-bold text-white">Publicaciones</span>
                                    </span>
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, rgba(6,182,212,0.7), transparent)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* ═══ DESKTOP HEADER (>= lg) ═══
                                Bloque izquierda en 2 filas:
                                  1) Volver + logo + título "Mis Publicaciones"
                                  2) Toggles MP/Servicios + divider + tabs de estado
                                     (centrados respecto al bloque izquierda con `self-center`)
                                Bloque centro: subtítulo decorativo "Gestiona tus
                                Publicaciones" + PANEL DEL VENDEDOR (sin cambios).
                                La fila inferior bajo este header pasa a ser solo móvil. */}
                            <div className="hidden lg:block">
                                <div className="flex items-end justify-between gap-6 px-6 py-4 2xl:px-8 2xl:py-5">
                                    {/* Izquierda: título arriba, toggles+tabs centrados abajo */}
                                    <div className="flex shrink-0 flex-col items-start gap-3">
                                        {/* Fila 1: flecha + logo + título */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                data-testid="btn-volver-mis-publicaciones-desktop"
                                                onClick={handleVolver}
                                                aria-label="Volver al inicio"
                                                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                            >
                                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                            </button>
                                            <div
                                                className="flex h-11 w-11 items-center justify-center rounded-lg 2xl:h-12 2xl:w-12"
                                                style={{
                                                    background:
                                                        'linear-gradient(135deg, #22d3ee, #0891b2)',
                                                }}
                                            >
                                                <Package
                                                    className="h-6 w-6 text-white 2xl:h-6.5 2xl:w-6.5"
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                            <div className="flex items-baseline">
                                                <span className="text-2xl font-extrabold tracking-tight text-white 2xl:text-3xl">
                                                    Mis{' '}
                                                </span>
                                                <span className="text-2xl font-extrabold tracking-tight text-cyan-400 2xl:text-3xl">
                                                    Publicaciones
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fila 2: toggles MP/Servicios — solos en la
                                            izquierda. Los tabs de estado viven en el
                                            bloque centro (a la derecha bajo el subtítulo). */}
                                        <div
                                            data-testid="selector-tipo-publicacion-desktop"
                                            className="inline-flex shrink-0 items-center gap-1.5 self-center"
                                        >
                                            {TIPOS.map((tipo) => {
                                                const Icono = tipo.Icono;
                                                const activo = tipoActivo === tipo.id;
                                                const claseActivo =
                                                    tipo.id === 'marketplace'
                                                        ? 'border-teal-400 bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/30'
                                                        : 'border-sky-500 bg-linear-to-br from-sky-600 to-sky-700 text-white shadow-md shadow-sky-700/30';
                                                return (
                                                    <button
                                                        key={tipo.id}
                                                        data-testid={`selector-${tipo.id}-desktop`}
                                                        onClick={() => setTipoActivo(tipo.id)}
                                                        aria-pressed={activo}
                                                        className={[
                                                            'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all',
                                                            activo
                                                                ? claseActivo
                                                                : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10 hover:text-white',
                                                        ].join(' ')}
                                                    >
                                                        <Icono className="h-4 w-4" strokeWidth={2.5} />
                                                        <span>{tipo.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Centro: subtítulo + PANEL DEL VENDEDOR + tabs de
                                        estado (alineados a la derecha en su propia fila). */}
                                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                        <div className="text-center">
                                            <h1 className="truncate text-3xl font-light leading-tight text-white/70 2xl:text-[34px]">
                                                Gestiona tus{' '}
                                                <span className="font-bold text-white">Publicaciones</span>
                                            </h1>
                                            <div className="mt-1.5 flex items-center justify-center gap-3">
                                                <div
                                                    className="h-0.5 w-20 rounded-full 2xl:w-24"
                                                    style={{
                                                        background:
                                                            'linear-gradient(90deg, transparent, rgba(6,182,212,0.7))',
                                                    }}
                                                />
                                                <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-[3px] text-cyan-400/70 2xl:text-base">
                                                    panel del vendedor
                                                </span>
                                                <div
                                                    className="h-0.5 w-20 rounded-full 2xl:w-24"
                                                    style={{
                                                        background:
                                                            'linear-gradient(90deg, rgba(6,182,212,0.7), transparent)',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tabs de estado — alineados a la derecha bajo
                                            el subtítulo. `self-end` los empuja al borde
                                            derecho del bloque centro. */}
                                        <div
                                            data-testid="tabs-mis-publicaciones-desktop"
                                            className="flex shrink-0 items-center gap-1.5 self-end"
                                        >
                                            {TABS_POR_TIPO[tipoActivo].map((tab) => {
                                                const Icono = tab.Icono;
                                                const activo = tabActivo === tab.id;
                                                const conteo =
                                                    tipoActivo === 'marketplace'
                                                        ? conteoPorTab[tab.id]
                                                        : tab.id === 'activa'
                                                          ? conteosServicios.activa
                                                          : tab.id === 'pausada'
                                                            ? conteosServicios.pausada
                                                            : 0;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        data-testid={`tab-${tab.id}-desktop`}
                                                        onClick={() => setTabActivo(tab.id)}
                                                        className={[
                                                            'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-all',
                                                            activo
                                                                ? 'border-cyan-400 bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                                                : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/60 hover:bg-white/10 hover:text-white',
                                                        ].join(' ')}
                                                    >
                                                        <Icono className="h-4 w-4" strokeWidth={2.5} />
                                                        <span>{tab.label}</span>
                                                        {conteo > 0 && (
                                                            <span
                                                                className={[
                                                                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                                                                    activo
                                                                        ? 'bg-white text-cyan-600'
                                                                        : 'bg-white/20 text-white',
                                                                ].join(' ')}
                                                            >
                                                                {conteo}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* ── Fila inferior del header — SOLO MÓVIL ──
                                Layout en 1 sola fila — toggle MP/Servicios FIJO a la
                                izquierda (icon-only) + divider sutil + tabs Activas/
                                Pausadas/Vendidas SCROLLABLES a la derecha.
                                En desktop esta fila está oculta porque los toggles+tabs
                                viven dentro del bloque izquierda del header (debajo del
                                título "Mis Publicaciones"). */}
                            <div className="flex items-center gap-2 px-3 pb-3 lg:hidden">
                                {/* TOGGLE MP/Servicios — icon-only en móvil, mismo
                                    `border-2 rounded-full` que los tabs para igualar
                                    altura. Activo usa gradient teal/sky con border
                                    matching; inactivo replica el estilo de los tabs. */}
                                <div
                                    data-testid="selector-tipo-publicacion-mobile"
                                    className="inline-flex shrink-0 items-center gap-1.5"
                                >
                                    {TIPOS.map((tipo) => {
                                        const Icono = tipo.Icono;
                                        const activo = tipoActivo === tipo.id;
                                        const claseActivo =
                                            tipo.id === 'marketplace'
                                                ? 'border-teal-400 bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/30'
                                                : 'border-sky-500 bg-linear-to-br from-sky-600 to-sky-700 text-white shadow-md shadow-sky-700/30';
                                        return (
                                            <button
                                                key={tipo.id}
                                                data-testid={`selector-${tipo.id}-mobile`}
                                                onClick={() => setTipoActivo(tipo.id)}
                                                aria-label={tipo.label}
                                                aria-pressed={activo}
                                                className={[
                                                    'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all',
                                                    activo
                                                        ? claseActivo
                                                        : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10 hover:text-white',
                                                ].join(' ')}
                                            >
                                                <Icono className="h-4 w-4" strokeWidth={2.5} />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Divider vertical sutil entre toggles y tabs */}
                                <div className="h-7 w-px shrink-0 bg-white/20" />

                                {/* Tabs de estado por tipo — scrollables horizontalmente
                                    si no caben. En modo "servicios" están pre-cableados
                                    visualmente pero no funcionales (body muestra
                                    "Próximamente"); los badges de conteo solo aplican
                                    a marketplace. */}
                                <div
                                    data-testid="tabs-mis-publicaciones"
                                    className="-mr-3 flex flex-1 items-center gap-2 overflow-x-auto pr-3 [&::-webkit-scrollbar]:hidden"
                                >
                                    {TABS_POR_TIPO[tipoActivo].map((tab) => {
                                        const Icono = tab.Icono;
                                        const activo = tabActivo === tab.id;
                                        const conteo =
                                            tipoActivo === 'marketplace'
                                                ? conteoPorTab[tab.id]
                                                : tab.id === 'activa'
                                                  ? conteosServicios.activa
                                                  : tab.id === 'pausada'
                                                    ? conteosServicios.pausada
                                                    : 0;
                                        return (
                                            <button
                                                key={tab.id}
                                                data-testid={`tab-${tab.id}`}
                                                onClick={() => setTabActivo(tab.id)}
                                                className={[
                                                    'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-all',
                                                    activo
                                                        ? 'border-cyan-400 bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                                        : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/60 hover:bg-white/10 hover:text-white',
                                                ].join(' ')}
                                            >
                                                <Icono className="h-4 w-4" strokeWidth={2.5} />
                                                <span>{tab.label}</span>
                                                {conteo > 0 && (
                                                    <span
                                                        className={[
                                                            'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                                                            activo
                                                                ? 'bg-white text-cyan-600'
                                                                : 'bg-white/20 text-white',
                                                        ].join(' ')}
                                                    >
                                                        {conteo}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                BODY
            ════════════════════════════════════════════════════════════════ */}
            <div className="p-4 lg:mx-auto lg:max-w-7xl lg:p-6 2xl:p-8">
                {tipoActivo === 'servicios' ? (
                    /* Sección real de Mis Publicaciones de Servicios.
                       Sprint 7.2 — wireup con backend completo + acciones. */
                    <MisPublicacionesServiciosSection
                        tabActivo={
                            tabActivo === 'vendida' ? 'activa' : tabActivo
                        }
                        onConteos={setConteosServicios}
                    />
                ) : (
                    <>
                {/* Banner: borrador sin publicar (solo si existe contenido) */}
                {borradorExiste && (
                    <button
                        data-testid="banner-borrador"
                        onClick={continuarBorrador}
                        className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-cyan-300 bg-cyan-100 p-3 text-left lg:p-4 lg:hover:border-cyan-400 lg:hover:bg-cyan-200"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white">
                            <FileEdit className="h-5 w-5" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 lg:text-base">
                                Tienes un borrador sin publicar
                            </p>
                            <p className="text-sm font-medium text-slate-600 lg:text-xs 2xl:text-sm">
                                Retoma donde lo dejaste para terminar de publicar tu artículo.
                            </p>
                        </div>
                        <ArrowRight
                            className="h-5 w-5 shrink-0 text-cyan-700"
                            strokeWidth={2.5}
                        />
                    </button>
                )}

                {/* Contenido principal */}
                {isPending ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
                        <h3 className="text-lg font-bold text-slate-900">
                            No pudimos cargar tus publicaciones
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                            Revisa tu conexión y vuelve a intentarlo.
                        </p>
                        <button
                            data-testid="btn-reintentar"
                            onClick={() => refetch()}
                            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white lg:hover:bg-slate-800"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : articulos.length === 0 ? (
                    <EstadoVacio tab={tabActivo} onPublicar={irAPublicar} />
                ) : (
                    // Grid unificado con las cards de Mis Guardados (tabs
                    // Ofertas y Marketplace): 2 / lg:3 / 2xl:4 con
                    // `max-w-[270px]` por card. Cada `CardArticuloMio` mantiene
                    // su layout vertical interno (foto + KPIs + menú "⋯").
                    <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 2xl:gap-6">
                        {articulos.map((articulo) => (
                            <div
                                key={articulo.id}
                                className="lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full"
                            >
                                <CardArticuloMio
                                    articulo={articulo}
                                    onEditar={handleEditar}
                                    onPausar={handlePausar}
                                    onReactivar={handleReactivar}
                                    onMarcarVendido={handleAbrirMarcarVendido}
                                    onEliminar={handleAbrirEliminar}
                                />
                            </div>
                        ))}
                    </div>
                )}
                    </>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FAB "+ Publicar" — visible en ambos modos (MarketPlace y
                Servicios). El destino del onClick cambia según `tipoActivo`:
                  - marketplace → /marketplace/publicar
                  - servicios   → /servicios/publicar?modo=ofrezco
                La paleta también cambia: cyan para MP, sky para Servicios.
            ════════════════════════════════════════════════════════════════ */}
            <button
                data-testid="fab-publicar"
                onClick={
                    tipoActivo === 'marketplace'
                        ? irAPublicar
                        : () => navigate('/servicios/publicar?modo=ofrezco')
                }
                aria-label={
                    tipoActivo === 'marketplace'
                        ? 'Publicar artículo'
                        : 'Publicar servicio'
                }
                style={{
                    transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                }}
                className={`fixed right-4 z-30 flex cursor-pointer flex-col items-center gap-1 lg:bottom-6 lg:right-[330px] 2xl:right-[394px] ${
                    bottomNavVisible ? 'bottom-20' : 'bottom-4'
                }`}
            >
                <span
                    className={
                        'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-2 transition-transform hover:scale-105 ' +
                        (tipoActivo === 'marketplace'
                            ? 'bg-linear-to-br from-cyan-500 to-cyan-700 shadow-cyan-500/30 ring-cyan-300/30'
                            : 'bg-linear-to-br from-sky-500 to-sky-700 shadow-sky-500/30 ring-sky-300/30')
                    }
                >
                    <Plus
                        className="h-6 w-6"
                        strokeWidth={2.75}
                        style={{ animation: 'fab-publicar-mp-pulse 2.4s ease-in-out infinite' }}
                    />
                </span>
                {/* Label "Publicar" — visible en móvil y desktop.
                    Móvil: chip blanco translúcido con sombra para legibilidad
                    sobre fondos variables. Desktop: texto plano sobre el
                    gradient azul del MainLayout. */}
                <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-bold text-slate-700 shadow-md backdrop-blur-sm lg:bg-transparent lg:px-0 lg:py-0 lg:text-base lg:shadow-none lg:backdrop-blur-none">
                    Publicar
                </span>
                <style>{`
                    @keyframes fab-publicar-mp-pulse {
                        0%, 100% { transform: rotate(0deg) scale(1); }
                        50% { transform: rotate(90deg) scale(1.15); }
                    }
                `}</style>
            </button>

            {/* ── Modal: confirmar marcar vendido ── */}
            <ModalAdaptativo
                abierto={!!articuloAMarcarVendido}
                onCerrar={() => setArticuloAMarcarVendido(null)}
                titulo="Marcar como vendido"
                ancho="sm"
            >
                <div className="space-y-4 p-4 lg:p-5">
                    <p className="text-base font-medium text-slate-700 lg:text-sm 2xl:text-base">
                        ¿Confirmas que vendiste{' '}
                        <span className="font-bold text-slate-900">
                            "{articuloAMarcarVendido?.titulo}"
                        </span>
                        ?
                    </p>
                    <p className="text-sm font-medium text-slate-600 lg:text-xs 2xl:text-sm">
                        Desaparecerá del feed público y de los guardados de otros usuarios.
                        Permanecerá en tu historial.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            data-testid="btn-cancelar-vendido"
                            onClick={() => setArticuloAMarcarVendido(null)}
                            className="cursor-pointer rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 lg:hover:bg-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="btn-confirmar-vendido"
                            onClick={handleConfirmarVendido}
                            disabled={cambiarEstadoMutation.isPending}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md lg:hover:bg-emerald-700 disabled:opacity-60"
                        >
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                            {cambiarEstadoMutation.isPending ? 'Guardando…' : 'Sí, lo vendí'}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* ── Modal: confirmar eliminación ── */}
            <ModalAdaptativo
                abierto={!!articuloAEliminar}
                onCerrar={() => setArticuloAEliminar(null)}
                titulo="Eliminar publicación"
                ancho="sm"
            >
                <div className="space-y-4 p-4 lg:p-5">
                    <p className="text-base font-medium text-slate-700 lg:text-sm 2xl:text-base">
                        ¿Eliminar{' '}
                        <span className="font-bold text-slate-900">
                            "{articuloAEliminar?.titulo}"
                        </span>
                        ?
                    </p>
                    <p className="text-sm font-medium text-slate-600 lg:text-xs 2xl:text-sm">
                        Esta acción no se puede deshacer. La publicación desaparecerá de
                        todos los listados.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            data-testid="btn-cancelar-eliminar"
                            onClick={() => setArticuloAEliminar(null)}
                            className="cursor-pointer rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 lg:hover:bg-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="btn-confirmar-eliminar"
                            onClick={handleConfirmarEliminar}
                            disabled={eliminarMutation.isPending}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md lg:hover:bg-red-700 disabled:opacity-60"
                        >
                            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                            {eliminarMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE — Estado vacío por tab
// =============================================================================

interface EstadoVacioProps {
    tab: TabPublicacion;
    onPublicar: () => void;
}

const COPY_VACIO: Record<
    TabPublicacion,
    { titulo: string; mensaje: string; mostrarCta: boolean }
> = {
    activa: {
        titulo: 'Sin publicaciones activas',
        mensaje: 'Publica una para empezar a vender.',
        mostrarCta: true,
    },
    pausada: {
        titulo: 'Sin publicaciones pausadas',
        mensaje: 'Aquí verás las que pauses o expiren.',
        mostrarCta: false,
    },
    vendida: {
        titulo: 'Sin ventas registradas',
        mensaje: 'Tu historial de ventas aparecerá aquí.',
        mostrarCta: false,
    },
};

function EstadoVacio({ tab, onPublicar }: EstadoVacioProps) {
    const copy = COPY_VACIO[tab];
    return (
        <div className="flex flex-col items-center justify-center py-20">
            {/* Círculo pastel con ring — patrón estándar idéntico a Cupones/CardYA */}
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-cyan-100 to-cyan-50 flex items-center justify-center ring-8 ring-cyan-50 mb-6">
                <Package className="w-12 h-12 lg:w-16 lg:h-16 text-cyan-400" />
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                {copy.titulo}
            </h3>
            <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">
                {copy.mensaje}
            </p>
            {copy.mostrarCta && (
                <button
                    data-testid="btn-publicar-vacio"
                    onClick={onPublicar}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors lg:cursor-pointer"
                >
                    <Plus className="w-5 h-5" />
                    Publicar artículo
                </button>
            )}
        </div>
    );
}

export default PaginaMisPublicaciones;
