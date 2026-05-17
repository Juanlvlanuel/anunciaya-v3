/**
 * PaginaGuardados.tsx
 * ====================
 * Página que muestra los elementos guardados del usuario.
 *
 * ¿Qué hace este archivo?
 * - Tab "Negocios": Muestra negocios seguidos (usa endpoint /api/seguidos)
 * - Tab "Ofertas": Muestra ofertas guardadas (usa endpoint /api/guardados con JOIN)
 * - Click en oferta abre ModalOfertaDetalle
 * - Responsive: mobile (1 col), laptop (2 cols), desktop (3 cols)
 * - Estados: Loading, Vacío, Con Datos
 * - NUEVO: Filtros, ordenamiento, selección múltiple
 *
 * Ubicación: apps/web/src/pages/private/guardados/PaginaGuardados.tsx
 */

import { useState, useEffect } from 'react';
// GPS manejado internamente por useNegociosSeguidos
import { useUiStore } from '@/stores/useUiStore';
import {
    Store,
    Tag,
    ChevronRight,
    ChevronLeft,
    Trash2,
    X,
    Check,
    ShoppingCart,
    type LucideIcon,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import type { ComponentType } from 'react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const Briefcase = (p: IconoWrapperProps) => <Icon icon={ICONOS.empleos} {...p} />;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;

/** Tipo que admite tanto LucideIcon como wrappers locales Iconify. */
type IconLike =
    | LucideIcon
    | ComponentType<{ className?: string; strokeWidth?: number; fill?: string; width?: number | string; height?: number | string }>;
import { IconoMenuMorph } from '@/components/ui/IconoMenuMorph';
import { useNotificacionesStore } from '@/stores/useNotificacionesStore';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useNavegarASeccion } from '../../../hooks/useNavegarASeccion';
import { OfertaCard, ModalOfertaDetalle } from '@/components/negocios';
import { CardNegocioCompacto } from '@/components/negocios/CardNegocioCompacto';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import api from '@/services/api';
import {
    useOfertasGuardadas,
    useNegociosSeguidos,
    useArticulosMarketplaceGuardados,
} from '@/hooks/queries/useMisGuardados';
import { aplicarCambioGuardadoEnCache } from '@/hooks/useGuardados';
import notificar from '@/utils/notificaciones';
import { CardArticulo } from '@/components/marketplace/CardArticulo';
import type { Oferta } from '@/types/ofertas';
import type { ArticuloFeed } from '@/types/marketplace';

// =============================================================================
// TIPOS
// =============================================================================

type TabGuardado = 'negocios' | 'ofertas' | 'marketplace' | 'servicios';

type Ordenamiento = 'recientes' | 'antiguos' | 'alfabetico-az' | 'alfabetico-za';

interface GuardadoOferta {
    id: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    oferta: Oferta;
    // ✅ NUEVO: Datos del negocio asociado
    negocio?: {
        nombre: string;
        whatsapp?: string | null;
        sucursalId: string;
        usuarioId?: string | null;
    };
}

interface NegocioSeguido {
    id: string;
    nombre: string;
    categoria: string;
    imagenPerfil?: string;
    sucursalId: string;
    usuarioId?: string;
    votanteSucursalId?: string | null; // Para saber cómo eliminar el follow
    // Propiedades opcionales para CardNegocioDetallado
    galeria?: Array<{ url: string; titulo?: string }>;
    estaAbierto?: boolean | null;
    distanciaKm?: number | null;
    calificacionPromedio?: string;
    totalCalificaciones?: number;
    whatsapp?: string;
    liked?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaGuardados() {
    const navigate = useNavigate();
    // Botón ← respeta historial (flecha nativa móvil) con fallback a /inicio.
    const handleVolver = useVolverAtras('/inicio');
    const qc = useQueryClient();
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [tabActivo, setTabActivo] = useState<TabGuardado>('negocios');
    const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>('recientes');
    const [modoSeleccion, setModoSeleccion] = useState(false);
    const [idsSeleccionados, setIdsSeleccionados] = useState<Set<string>>(new Set());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // React Query — datos del servidor
    const ofertasQuery = useOfertasGuardadas();
    const negociosQuery = useNegociosSeguidos();
    const articulosMarketplaceQuery = useArticulosMarketplaceGuardados();
    const ofertas = (ofertasQuery.data ?? []) as GuardadoOferta[];
    const negocios = (negociosQuery.data ?? []) as NegocioSeguido[];
    const articulosMarketplace = (articulosMarketplaceQuery.data ?? []) as Array<{
        id: string;
        entityType: string;
        entityId: string;
        createdAt: string;
        articulo: ArticuloFeed;
    }>;
    const loadingOfertas = ofertasQuery.isPending;
    const loadingNegocios = negociosQuery.isPending;
    const loadingArticulosMarketplace = articulosMarketplaceQuery.isPending;
    const [ofertaSeleccionada, setOfertaSeleccionada] = useState<GuardadoOferta | null>(null);

    // Filtros (para implementación futura)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filtros, setFiltros] = useState({
        activas: true,
        proximasVencer: false,
        descuentoMayor20: false,
    });

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------
    
    // Carga manejada por React Query

    // Reset modo selección al cambiar tab
    useEffect(() => {
        setModoSeleccion(false);
        setIdsSeleccionados(new Set());
    }, [tabActivo]);

    // ---------------------------------------------------------------------------
    // Fetch Functions
    // ---------------------------------------------------------------------------

    // Fetch functions eliminadas — React Query maneja la carga

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleCambiarTab = (tab: TabGuardado) => {
        setTabActivo(tab);
    };

    const handleClickOferta = (guardado: GuardadoOferta) => {
        // Siempre abre el modal cuando se hace click en la card (no en el bookmark)
        // Guardamos el guardado completo para tener acceso a negocio.whatsapp
        setOfertaSeleccionada(guardado);
    };

    const handleClickNegocioCard = (negocio: NegocioSeguido) => {
        // Siempre navega al negocio cuando se hace click en la card (no en el bookmark)
        navigate(`/negocios/${negocio.sucursalId}`);
    };

    const handleClickBookmark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Si no está en modo selección, activarlo
        if (!modoSeleccion) {
            setModoSeleccion(true);
        }
        
        // Toggle selección del item
        toggleSeleccion(id);
    };

    const handleCloseModal = () => {
        setOfertaSeleccionada(null);
        // NO recargar ofertas - solo cerramos el modal
        // fetchOfertasGuardadas(); // ❌ Esto causa el parpadeo
    };

    const toggleModoSeleccion = () => {
        setModoSeleccion(!modoSeleccion);
        setIdsSeleccionados(new Set());
    };

    const toggleSeleccion = (id: string) => {
        const nuevosIds = new Set(idsSeleccionados);
        if (nuevosIds.has(id)) {
            nuevosIds.delete(id);
        } else {
            nuevosIds.add(id);
        }
        setIdsSeleccionados(nuevosIds);
    };

    const seleccionarTodos = () => {
        if (tabActivo === 'ofertas') {
            setIdsSeleccionados(new Set(ofertas.map((o) => o.id)));
        } else if (tabActivo === 'negocios') {
            setIdsSeleccionados(new Set(negocios.map((n) => n.id)));
        } else if (tabActivo === 'marketplace') {
            setIdsSeleccionados(new Set(articulosMarketplace.map((a) => a.id)));
        }
    };

    const limpiarSeleccion = () => {
        setIdsSeleccionados(new Set());
    };

    const eliminarSeleccionados = async () => {
        if (idsSeleccionados.size === 0) return;

        // Guardar estado original antes del try (para rollback si falla)
        const idsAEliminar = Array.from(idsSeleccionados);
        const ofertasOriginales = [...ofertas];
        const negociosOriginales = [...negocios];
        const articulosOriginales = [...articulosMarketplace];

        try {
            // Eliminación: se refresca después del delete

            setIdsSeleccionados(new Set());
            setModoSeleccion(false);

            // Llamada real al backend - eliminar cada guardado
            // Ruta: DELETE /api/guardados/:entityType/:entityId
            const promesas = idsAEliminar.map((guardadoId) => {
                if (tabActivo === 'ofertas') {
                    // Buscar la oferta para obtener su entityId
                    const guardado = ofertasOriginales.find(o => o.id === guardadoId);
                    if (guardado) {
                        return api.delete(`guardados/oferta/${guardado.entityId}`);
                    }
                } else if (tabActivo === 'negocios') {
                    // Usar el votanteSucursalId original del negocio seguido
                    // para eliminar exactamente el voto con el que fue creado
                    const negocio = negociosOriginales.find(n => n.id === guardadoId);
                    if (negocio) {
                        const params: Record<string, string> = {};
                        if (negocio.votanteSucursalId) {
                            // Seguido en modo comercial: pasar UUID explícito (el interceptor no lo sobreescribirá)
                            params.votanteSucursalId = negocio.votanteSucursalId;
                        } else {
                            // Seguido en modo personal: __skipVotante evita que el interceptor agregue sucursalId
                            params.__skipVotante = 'true';
                        }
                        return api.delete(`votos/sucursal/${negocio.sucursalId}/follow`, { params });
                    }
                } else if (tabActivo === 'marketplace') {
                    // Mismo endpoint genérico `/guardados/:entityType/:entityId`
                    // que ofertas, cambiando el entityType.
                    const item = articulosOriginales.find(a => a.id === guardadoId);
                    if (item) {
                        return api.delete(`guardados/articulo_marketplace/${item.entityId}`);
                    }
                }
                return Promise.resolve(); // Si no se encuentra, resolver vacío
            });

            await Promise.all(promesas);

            notificar.exito('Eliminados correctamente');
            qc.invalidateQueries({ queryKey: ['guardados'] });
            // Sincronizar estado followed/likes en vistas de negocios
            if (tabActivo === 'negocios') {
                qc.invalidateQueries({ queryKey: ['negocios', 'lista'] });
                negociosOriginales
                    .filter(n => idsAEliminar.includes(n.id))
                    .forEach(n => {
                        qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(n.sucursalId) });
                    });
            }
            // Sincronizar cache del MarketPlace (feed infinito + perfil del
            // vendedor + detalle) cuando se eliminan artículos guardados.
            // Sin esto, el corazón seguiría rojo al volver al feed o al
            // perfil del vendedor porque el cache aún tiene `guardado: true`.
            if (tabActivo === 'marketplace') {
                articulosOriginales
                    .filter(a => idsAEliminar.includes(a.id))
                    .forEach(a => {
                        aplicarCambioGuardadoEnCache(qc, a.entityId, false, -1);
                    });
            }
        } catch (error) {
            console.error('Error al eliminar guardados:', error);
            
            // Rollback - refetch para restaurar estado
            qc.invalidateQueries({ queryKey: ['guardados'] });

            notificar.error('Error al eliminar');
        }
    };

    // ---------------------------------------------------------------------------
    // Computed Values
    // ---------------------------------------------------------------------------
    const totalGuardados =
        tabActivo === 'ofertas' ? ofertas.length :
        tabActivo === 'negocios' ? negocios.length :
        tabActivo === 'marketplace' ? articulosMarketplace.length : 0;
    const loading =
        tabActivo === 'ofertas' ? loadingOfertas :
        tabActivo === 'negocios' ? loadingNegocios :
        tabActivo === 'marketplace' ? loadingArticulosMarketplace : false;

    // Ordenar items según selección
    const ofertasOrdenadas = [...ofertas].sort((a, b) => {
        switch (ordenamiento) {
            case 'recientes':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'antiguos':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'alfabetico-az':
                return (a.oferta?.titulo || '').localeCompare(b.oferta?.titulo || '');
            case 'alfabetico-za':
                return (b.oferta?.titulo || '').localeCompare(a.oferta?.titulo || '');
            default:
                return 0;
        }
    });

    const negociosOrdenados = [...negocios].sort((a, b) => {
        switch (ordenamiento) {
            case 'alfabetico-az':
                return a.nombre.localeCompare(b.nombre);
            case 'alfabetico-za':
                return b.nombre.localeCompare(a.nombre);
            default:
                return 0;
        }
    });

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    // Orden B2C → P2P (visión v3): Negocios → Ofertas → Marketplace → Servicios
    const TABS_GUARDADOS: { id: TabGuardado; label: string; Icono: IconLike }[] = [
        { id: 'negocios', label: 'Negocios', Icono: Store },
        { id: 'ofertas', label: 'Ofertas', Icono: Tag },
        { id: 'marketplace', label: 'Marketplace', Icono: ShoppingCart },
        { id: 'servicios', label: 'Servicios', Icono: Briefcase },
    ];

    const badgePorTab = (id: TabGuardado) => {
        if (id === 'ofertas') return ofertas.length;
        if (id === 'negocios') return negocios.length;
        if (id === 'marketplace') return articulosMarketplace.length;
        return 0;
    };

    return (
        <div className="min-h-full bg-transparent">

            {/* ── Header sticky — estilo CardYA/MisCupones ── */}
            <div className="sticky top-0 z-20">
                <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil rose */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(244,63,94,0.07) 0%, transparent 50%)' }}
                        />
                        {/* Grid pattern */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        <div className="relative z-10">

                            {/* ══ MOBILE HEADER ══ */}
                            <div className="lg:hidden">
                                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            data-testid="btn-volver-guardados"
                                            onClick={handleVolver}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                                        >
                                            <Bookmark className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-2xl font-extrabold text-white tracking-tight">
                                            Mis <span className="text-rose-400">Guardados</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0 -mr-1 shrink-0">
                                        <button
                                            data-testid="btn-notificaciones-guardados"
                                            onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                                            aria-label="Notificaciones"
                                            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                                            {cantidadNoLeidas > 0 && (
                                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                                    {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            data-testid="btn-menu-guardados"
                                            onClick={abrirMenuDrawer}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <IconoMenuMorph />
                                        </button>
                                    </div>
                                </div>
                                {/* Subtítulo móvil */}
                                <div className="flex items-center justify-center gap-2.5 pb-2">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.7))' }}
                                    />
                                    <span className="text-base font-light text-white/70 tracking-wide">
                                        Tus <span className="font-bold text-white">favoritos</span> en un solo lugar
                                    </span>
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.7), transparent)' }}
                                    />
                                </div>
                            </div>

                            {/* ══ DESKTOP HEADER ══ */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-6 px-6 2xl:px-8 py-4 2xl:py-5">
                                    {/* Bloque izquierdo: flecha + logo + título (agrupados) */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        {/* Flecha ← regresar al inicio (solo desktop) */}
                                        <button
                                            data-testid="btn-volver-guardados-desktop"
                                            onClick={handleVolver}
                                            aria-label="Volver al inicio"
                                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        {/* Logo */}
                                        <div
                                            className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                                        >
                                            <Bookmark className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">
                                                Mis{' '}
                                            </span>
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-rose-400 tracking-tight">
                                                Guardados
                                            </span>
                                        </div>
                                    </div>

                                    {/* Centro: Subtítulo */}
                                    <div className="flex-1 text-center min-w-0">
                                        <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                                            Tus{' '}
                                            <span className="font-bold text-white">favoritos</span>
                                            {' '}en un solo lugar
                                        </h1>
                                        <div className="flex items-center justify-center gap-3 mt-1.5">
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.7))' }}
                                            />
                                            <span className="text-sm 2xl:text-base font-semibold text-rose-400/70 uppercase tracking-[3px]">
                                                colección personal
                                            </span>
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.7), transparent)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* KPIs eliminados — la info de conteo ya vive en los
                                        badges de cada tab justo abajo ("Negocios 1",
                                        "Ofertas 3", "Marketplace 2"). Duplicarla aquí era
                                        ruido y al agregar MarketPlace (palabra larga) el
                                        subtítulo central se truncaba. */}
                                </div>
                            </div>

                            {/* ── TABS estilo CHIPS (alineado a CardYA/Cupones/Ofertas/MP/Negocios) ── */}
                            <div className="flex items-center px-3 pb-3 lg:px-0 lg:pb-0">
                                <div className="flex items-center gap-2 lg:flex-none overflow-x-auto flex-1 -mx-3 px-3 lg:mx-0 lg:px-6 lg:py-3 2xl:px-8 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                                    {TABS_GUARDADOS.map(({ id, label, Icono }) => {
                                        const badge = badgePorTab(id);
                                        const activo = tabActivo === id;
                                        return (
                                            <button
                                                key={id}
                                                data-testid={`tab-guardados-${id}`}
                                                onClick={() => handleCambiarTab(id)}
                                                className={[
                                                    'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap',
                                                    activo
                                                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                                                        : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-rose-400/60',
                                                ].join(' ')}
                                            >
                                                <Icono className="w-4 h-4" strokeWidth={2.5} />
                                                <span>{label}</span>
                                                {badge > 0 && (
                                                    <span className={[
                                                        'text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
                                                        activo ? 'bg-white text-rose-600' : 'bg-rose-500 text-white',
                                                    ].join(' ')}>
                                                        {badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Ordenamiento desktop */}
                                {!loading && totalGuardados > 0 && (
                                    <div className="hidden lg:flex items-center gap-1.5 ml-auto pr-6 2xl:pr-8">
                                        <button
                                            onClick={() => setOrdenamiento('recientes')}
                                            className={`px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer ${
                                                ordenamiento === 'recientes'
                                                    ? 'bg-rose-500 text-white'
                                                    : 'text-white/50 hover:text-white/80'
                                            }`}
                                        >
                                            Recientes
                                        </button>
                                        <button
                                            onClick={() => setOrdenamiento('antiguos')}
                                            className={`px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer ${
                                                ordenamiento === 'antiguos'
                                                    ? 'bg-rose-500 text-white'
                                                    : 'text-white/50 hover:text-white/80'
                                            }`}
                                        >
                                            Antiguos
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenedor del contenido. `overflow-x-hidden` contiene las
                animaciones del badge de OfertaCard (animate-float con rotate
                5° + ripple scale 2x) que sobresalen del card y, en móvil con
                cards al borde, generaban scroll horizontal del viewport. */}
            <div className="p-4 lg:p-6 2xl:p-8 lg:max-w-7xl lg:mx-auto overflow-x-hidden">
                    {/* Contenido según tab activo */}
                    {tabActivo === 'ofertas' && (
                        <div className="animate-fade-in">
                            <ContenidoOfertas
                                ofertas={ofertasOrdenadas}
                                loading={loadingOfertas}
                                onClickOferta={handleClickOferta}
                                onClickBookmark={handleClickBookmark}
                                modoSeleccion={modoSeleccion}
                                idsSeleccionados={idsSeleccionados}
                            />
                        </div>
                    )}

                    {tabActivo === 'negocios' && (
                        <div className="animate-fade-in">
                            <ContenidoNegocios
                                negocios={negociosOrdenados}
                                loading={loadingNegocios}
                                onClickNegocio={handleClickNegocioCard}
                                onClickBookmark={handleClickBookmark}
                                modoSeleccion={modoSeleccion}
                                idsSeleccionados={idsSeleccionados}
                            />
                        </div>
                    )}

                    {tabActivo === 'marketplace' && (
                        <div className="animate-fade-in">
                            <ContenidoMarketplace
                                items={articulosMarketplace}
                                loading={loadingArticulosMarketplace}
                                onClickBookmark={handleClickBookmark}
                                modoSeleccion={modoSeleccion}
                                idsSeleccionados={idsSeleccionados}
                            />
                        </div>
                    )}

                    {tabActivo === 'servicios' && (
                        <div className="animate-fade-in">
                            <EstadoProximamente tipo={tabActivo} />
                        </div>
                    )}

                    {/* Barra flotante de selección */}
                    {modoSeleccion && idsSeleccionados.size > 0 && (
                <div className="fixed bottom-20 lg:bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-linear-to-r from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm">{idsSeleccionados.size}</span>
                    </div>
                    <div className="h-5 w-px bg-gray-700"></div>
                    <button
                        onClick={seleccionarTodos}
                        className="text-sm font-medium hover:text-rose-400 transition-colors lg:cursor-pointer"
                    >
                        Todos
                    </button>
                    <button
                        onClick={limpiarSeleccion}
                        className="text-sm font-medium hover:text-rose-400 transition-colors lg:cursor-pointer"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={eliminarSeleccionados}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-all shadow-lg shadow-red-500/30 text-sm lg:cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                    <button
                        onClick={toggleModoSeleccion}
                        className="text-gray-400 hover:text-white transition-colors lg:cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            </div>
            {/* Fin contenedor max-w-7xl */}

            {/* Modal de detalle de oferta */}
            {ofertaSeleccionada && (
                <ModalOfertaDetalle 
                    oferta={ofertaSeleccionada.oferta || ofertaSeleccionada} 
                    onClose={handleCloseModal}
                    whatsapp={ofertaSeleccionada.negocio?.whatsapp || undefined}
                    negocioNombre={ofertaSeleccionada.negocio?.nombre || undefined}
                    negocioUsuarioId={ofertaSeleccionada.negocio?.usuarioId || undefined}
                />
            )}

            {/* Estilos para animación fade-in */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: BookmarkGlass
// =============================================================================
//
// Botón flotante de selección/bookmark usado en las cards de Ofertas y
// Marketplace dentro de Mis Guardados. Replica el lenguaje glass del card
// de Negocios (CardNegocioDetallado): fondo `bg-black/25 backdrop-blur` con
// borde blanco semi y, en seleccionado, círculo rojo sólido con check
// blanco. Mantiene el mismo SVG del corazón rojo con borde blanco para que
// los 3 tabs (Negocios, Ofertas, Marketplace) compartan estética.

interface BookmarkGlassProps {
    seleccionado: boolean;
    onClick: (e: React.MouseEvent) => void;
}

function BookmarkGlass({ seleccionado, onClick }: BookmarkGlassProps) {
    return (
        <div className="absolute top-2 left-2 z-10">
            <button
                onClick={onClick}
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer overflow-visible transition-transform duration-200 lg:hover:scale-110 ${
                    seleccionado
                        ? 'bg-red-500 border-2 border-red-500'
                        : 'bg-white border-2 border-amber-500 backdrop-blur-[10px]'
                }`}
            >
                {seleccionado ? (
                    <svg
                        className="w-5 h-5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <Icon
                        icon={ICONOS.guardar}
                        className="w-5 h-5"
                        style={{ color: '#f59e0b' }}
                    />
                )}
            </button>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: ContenidoOfertas
// =============================================================================

interface ContenidoOfertasProps {
    ofertas: GuardadoOferta[];
    loading: boolean;
    onClickOferta: (guardado: GuardadoOferta) => void;
    onClickBookmark: (id: string, e: React.MouseEvent) => void;
    modoSeleccion: boolean;
    idsSeleccionados: Set<string>;
}

function ContenidoOfertas({
    ofertas,
    loading,
    onClickOferta,
    onClickBookmark,
    modoSeleccion,
    idsSeleccionados,
}: ContenidoOfertasProps) {
    const navigate = useNavigate();
    // CTA del empty state lleva a /ofertas (sección top-level): replace si
    // NO venimos de /inicio para no acumular historial.
    const navegarASeccion = useNavegarASeccion();
    // Mismo patrón que SeccionOfertas (perfil del negocio): vertical en
    // móvil para que la card se vea estilo cupón (imagen arriba, panel
    // oscuro abajo) en lugar del layout horizontal.
    const { esMobile } = useBreakpoint();

    // Empty state (solo si no está cargando O si terminó de cargar y está vacío)
    if (!loading && ofertas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                {/* Patrón estándar idéntico a Cupones/CardYA */}
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-rose-100 to-rose-50 flex items-center justify-center ring-8 ring-rose-50 mb-6">
                    <Tag className="w-12 h-12 lg:w-16 lg:h-16 text-rose-400" />
                </div>

                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Sin ofertas guardadas
                </h3>
                <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">
                    Guarda tus ofertas favoritas para encontrarlas aquí.
                </p>

                <button
                    onClick={() => navegarASeccion('/ofertas')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors lg:cursor-pointer"
                >
                    Ver Ofertas
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // Con datos - Grid responsive.
    // Móvil: 2 columnas porque la card es vertical (angosta + alta) — una
    // sola columna ancha haría que las cards quedaran desproporcionadas.
    // Muestra lo que hay aunque esté cargando (actualización optimista).
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 2xl:gap-6">
            {ofertas.map((guardado) => (
                <div
                    key={guardado.id}
                    className="relative lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full"
                >
                    {/* Bookmark con estilo glass (unificado con Negocios). */}
                    <BookmarkGlass
                        seleccionado={modoSeleccion && idsSeleccionados.has(guardado.id)}
                        onClick={(e) => onClickBookmark(guardado.id, e)}
                    />

                    {/* Card de oferta — vertical en móvil (igual que perfil
                        del negocio: imagen arriba, panel oscuro abajo). */}
                    <div
                        onClick={() => onClickOferta(guardado)}
                        className="cursor-pointer"
                    >
                        <OfertaCard
                            oferta={guardado.oferta}
                            size={esMobile ? 'compact' : 'normal'}
                            orientacion={esMobile ? 'vertical' : 'auto'}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: ContenidoNegocios
// =============================================================================

interface ContenidoNegociosProps {
    negocios: NegocioSeguido[];
    loading: boolean;
    onClickNegocio: (negocio: NegocioSeguido) => void;
    onClickBookmark: (id: string, e: React.MouseEvent) => void;
    modoSeleccion: boolean;
    idsSeleccionados: Set<string>;
}

function ContenidoNegocios({
    negocios,
    loading,
    onClickNegocio,
    onClickBookmark,
    modoSeleccion,
    idsSeleccionados,
}: ContenidoNegociosProps) {
    const navigate = useNavigate();
    // CTA del empty state lleva a /negocios (sección top-level): replace
    // si NO venimos de /inicio para no acumular historial.
    const navegarASeccion = useNavegarASeccion();

    // Empty state (solo si no está cargando O si terminó de cargar y está vacío)
    if (!loading && negocios.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                {/* Patrón estándar idéntico a Cupones/CardYA */}
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-rose-100 to-rose-50 flex items-center justify-center ring-8 ring-rose-50 mb-6">
                    <Store className="w-12 h-12 lg:w-16 lg:h-16 text-rose-400" />
                </div>

                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Sin negocios seguidos
                </h3>
                <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">
                    Sigue un negocio para verlo aquí.
                </p>

                <button
                    onClick={() => navegarASeccion('/negocios')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors lg:cursor-pointer"
                >
                    Explorar Negocios
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // Con datos - Grid responsive unificado con tabs Ofertas y Marketplace.
    // Patrón: 2 / lg:3 / 2xl:4 con `max-w-[270px]` por card. Usa
    // `CardNegocioCompacto` (vertical, foto arriba + info abajo) en lugar de
    // `CardNegocioDetallado` (horizontal) para uniformidad cross-tab.
    return (
        <div
            data-testid="grid-negocios-guardados"
            className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 2xl:gap-6"
        >
            {negocios.map((negocio) => (
                <div
                    key={negocio.id}
                    className="relative lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full"
                >
                    <BookmarkGlass
                        seleccionado={modoSeleccion && idsSeleccionados.has(negocio.id)}
                        onClick={(e) => onClickBookmark(negocio.id, e)}
                    />
                    <CardNegocioCompacto
                        negocio={negocio}
                        onClick={() => onClickNegocio(negocio)}
                    />
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: EstadoProximamente
// =============================================================================

interface EstadoProximamenteProps {
    tipo: 'servicios' | 'marketplace';
}

function EstadoProximamente({ tipo }: EstadoProximamenteProps) {
    const config = {
        servicios: {
            icon: <Briefcase className="w-12 h-12 lg:w-16 lg:h-16 text-rose-500" />,
            titulo: 'Servicios guardados',
            descripcion: 'Pronto podrás guardar tus servicios favoritos de la sección Servicios',
        },
        marketplace: {
            icon: <ShoppingCart className="w-12 h-12 lg:w-16 lg:h-16 text-rose-500" />,
            titulo: 'Marketplace guardados',
            descripcion: 'Pronto podrás guardar publicaciones del Marketplace para verlas después',
        },
    };

    const { icon, titulo, descripcion } = config[tipo];

    return (
        <div className="text-center py-12 lg:py-16">
            <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-linear-to-br from-rose-100 to-rose-50 rounded-full flex items-center justify-center ring-8 ring-rose-50">
                {icon}
            </div>

            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">{titulo}</h3>
            <p className="text-base lg:text-lg font-medium text-gray-600 mb-6 max-w-md mx-auto">
                {descripcion}
            </p>

            <div className="inline-flex items-center gap-2 px-6 py-3 bg-rose-100 text-rose-700 rounded-xl font-semibold">
                Próximamente disponible
            </div>
        </div>
    );
}

// =============================================================================
// CONTENIDO MARKETPLACE (Sprint 7)
// =============================================================================

interface ItemMarketplaceGuardado {
    id: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    articulo: ArticuloFeed;
}

interface ContenidoMarketplaceProps {
    items: ItemMarketplaceGuardado[];
    loading: boolean;
    onClickBookmark: (id: string, e: React.MouseEvent) => void;
    modoSeleccion: boolean;
    idsSeleccionados: Set<string>;
}

function ContenidoMarketplace({
    items,
    loading,
    onClickBookmark,
    modoSeleccion,
    idsSeleccionados,
}: ContenidoMarketplaceProps) {
    if (loading) {
        return (
            <div className="flex min-h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                {/* Patrón estándar idéntico a Cupones/CardYA */}
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-rose-100 to-rose-50 flex items-center justify-center ring-8 ring-rose-50 mb-6">
                    <ShoppingCart className="w-12 h-12 lg:w-16 lg:h-16 text-rose-400" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Sin artículos guardados
                </h3>
                <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">
                    Toca el ❤️ en un artículo para guardarlo aquí.
                </p>
            </div>
        );
    }

    // Grid alineado al de ContenidoOfertas: mismas columnas + gaps + wrapper
    // con `max-w` y `mx-auto` para que las cards de Marketplace coincidan
    // en ancho con las de Ofertas y se vean uniformes al cambiar de tab.
    return (
        <div
            data-testid="grid-articulos-marketplace-guardados"
            className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 2xl:gap-6"
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    className="relative lg:max-w-[270px] 2xl:max-w-[270px] mx-auto w-full"
                >
                    {/* Bookmark con estilo glass (unificado con Negocios).
                        Reemplaza el corazón interno de CardArticulo
                        (ocultarBotonGuardar). */}
                    <BookmarkGlass
                        seleccionado={modoSeleccion && idsSeleccionados.has(item.id)}
                        onClick={(e) => onClickBookmark(item.id, e)}
                    />

                    {/* `altoFijo` iguala la altura con la de OfertaCard que
                        renderiza el tab Ofertas: compact vertical en mobile
                        (`h-[280px]`) y normal vertical en lg/2xl (`h-[340px]`).
                        `variant='compacta'` omite la señal de actividad
                        ("X personas lo guardaron") — en Mis Guardados el
                        panel se queda con precio + título + tiempo. */}
                    <CardArticulo
                        articulo={{ ...item.articulo, distanciaMetros: null } as ArticuloFeed}
                        variant="compacta"
                        altoFijo="h-[280px] lg:h-[340px] 2xl:h-[340px]"
                        ocultarBotonGuardar
                    />
                </div>
            ))}
        </div>
    );
}

export default PaginaGuardados;