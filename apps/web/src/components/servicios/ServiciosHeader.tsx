/**
 * ServiciosHeader.tsx
 * =====================
 * Header sticky dark COMPARTIDO por toda la sección Servicios. Estructura
 * izquierda fija (back + icono sky + "Servicios") y contenido derecho que
 * varía según la ruta vía el prop `variante`:
 *
 *   variante='feed'   (default, usado en /servicios)
 *     - Desktop: chips de filtros dark + KPI "N PUBLICACIONES"
 *     - Mobile: notif + menú · subtítulo "En {ciudad} · N publicaciones" +
 *               chips internos con modo (Ofrecen/Solicitan) + filtros
 *
 *   variante='pagina' (usado en /servicios/:id, /servicios/publicar, etc.)
 *     - Desktop: `slotDerecho` (típicamente pill con el tipo de página) o vacío
 *     - Mobile: notif + menú · subtítulo `subtituloMobile` (texto contextual)
 *
 * Beneficio UX: el header es persistente en toda la sección — el usuario
 * siempre ve "Servicios" arriba y puede volver con la flecha sin perder
 * contexto. Solo cambia el contenido derecho según donde esté.
 *
 * Ubicación: apps/web/src/components/servicios/ServiciosHeader.tsx
 */

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Wrench, X } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { useSearchStore } from '../../stores/useSearchStore';
import { useUiStore } from '../../stores/useUiStore';
import { IconoMenuMorph } from '../ui/IconoMenuMorph';
import { ChipsFiltros, type FiltroChip } from './ChipsFiltros';
import type { ModoServicio } from '../../types/servicios';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;

interface ServiciosHeaderProps {
    onBack?: () => void;
    /** Variante del header. Default = 'feed'. */
    variante?: 'feed' | 'pagina';

    // ─── Props para variante='feed' (todos opcionales con default seguros) ────
    /** Ciudad actual (para subtítulo móvil del feed). */
    ciudad?: string | null;
    /** Total de publicaciones visibles (KPI desktop + subtítulo móvil). */
    totalPublicaciones?: number | null;
    /** Chip de filtro activo (Todos / Presencial / Remoto / Servicio / Empleo). */
    filtroActivo?: FiltroChip;
    onFiltroChange?: (f: FiltroChip) => void;
    /** Modo (Ofrecen/Solicitan). `null` = "Todos" activo. */
    modo?: ModoServicio | null;
    onModoChange?: (m: ModoServicio | null) => void;

    // ─── Props para variante='pagina' ────────────────────────────────────────
    /** Contenido del lado derecho del header en desktop (reemplaza chips+KPI).
     *  Típicamente un pill con el tipo de página, breadcrumb, o lo que cuadre. */
    slotDerecho?: React.ReactNode;
    /** Breadcrumb desktop que se renderiza después de "Servicios" con un
     *  separador chevron-right. Ej: "Publicar anuncio · Detalles". Oculto en
     *  mobile (el subtituloMobile cumple ese rol). */
    breadcrumb?: React.ReactNode;
    /** Texto contextual mobile bajo el header (reemplaza el subtítulo del feed).
     *  Ej: "Servicio personal · Juan Manuel". Si es null, no se renderiza el
     *  subtítulo decorativo en mobile. */
    subtituloMobile?: React.ReactNode;
}

export function ServiciosHeader({
    onBack,
    variante = 'feed',
    ciudad = null,
    totalPublicaciones = null,
    filtroActivo,
    onFiltroChange,
    modo,
    onModoChange,
    slotDerecho,
    breadcrumb,
    subtituloMobile,
}: ServiciosHeaderProps) {
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);

    // ─── Buscador móvil ─────────────────────────────────────────────────────
    const queryGlobal = useSearchStore((s) => s.query);
    const setQueryGlobal = useSearchStore((s) => s.setQuery);
    const abrirBuscador = useSearchStore((s) => s.abrirBuscador);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);

    const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
    const inputBusquedaMovilRef = useRef<HTMLInputElement>(null);

    const handleAbrirBuscadorMovil = () => {
        setBuscadorMovilAbierto(true);
        abrirBuscador();
        setTimeout(() => inputBusquedaMovilRef.current?.focus(), 100);
    };
    const handleCerrarBuscadorMovil = () => {
        cerrarBuscador();
        setBuscadorMovilAbierto(false);
    };

    const esFeed = variante === 'feed';
    // Para feed: si el padre pasó filtros, los usamos. Por defecto = 'todos'/null.
    const filtroSeguro: FiltroChip = filtroActivo ?? 'todos';
    const modoSeguro: ModoServicio | null = modo ?? null;

    return (
        <div className="sticky top-0 z-20">
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                <div
                    className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                    style={{ background: '#000000' }}
                >
                    {/* Glow sky arriba-derecha */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(ellipse at 85% 20%, rgba(2,132,199,0.10) 0%, transparent 50%)',
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
                        {/* ═══ MOBILE HEADER (<lg) ═══ */}
                        <div className="lg:hidden">
                            {!buscadorMovilAbierto ? (
                                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                    <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                                        <button
                                            data-testid="btn-volver-servicios"
                                            onClick={onBack}
                                            aria-label="Volver"
                                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #38bdf8, #0369a1)',
                                            }}
                                        >
                                            <Wrench
                                                className="h-[18px] w-[18px] text-white"
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                        <span className="truncate text-2xl font-extrabold tracking-tight text-white ml-1.5">
                                            Servi<span className="text-sky-400">cios</span>
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            data-testid="btn-buscar-servicios"
                                            onClick={handleAbrirBuscadorMovil}
                                            aria-label="Buscar en Servicios"
                                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <Search className="h-6 w-6 animate-pulse" strokeWidth={2.5} />
                                        </button>
                                        <button
                                            data-testid="btn-notificaciones-servicios"
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
                                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                                    {cantidadNoLeidas > 9
                                                        ? '9+'
                                                        : cantidadNoLeidas}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            data-testid="btn-menu-servicios"
                                            onClick={abrirMenuDrawer}
                                            aria-label="Abrir menú"
                                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                        >
                                            <IconoMenuMorph />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Buscador activo: input expandido + X */
                                <div className="flex items-center gap-2.5 px-3 pt-4 pb-2.5">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40" />
                                        <input
                                            ref={inputBusquedaMovilRef}
                                            data-testid="input-buscar-servicios"
                                            type="text"
                                            value={queryGlobal}
                                            onChange={(e) => setQueryGlobal(e.target.value)}
                                            placeholder="Buscar servicios..."
                                            autoComplete="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                            className="w-full rounded-full bg-white/15 py-2 pl-10 pr-10 text-lg text-white placeholder-white/40 outline-none"
                                        />
                                        {queryGlobal.trim() && (
                                            <button
                                                onClick={() => {
                                                    setQueryGlobal('');
                                                    inputBusquedaMovilRef.current?.focus();
                                                }}
                                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/25 transition-colors hover:bg-white/40"
                                                aria-label="Limpiar búsqueda"
                                            >
                                                <X className="h-4 w-4 text-white" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleCerrarBuscadorMovil}
                                        aria-label="Cerrar buscador"
                                        className="shrink-0 cursor-pointer rounded-full p-0.5 text-white/80 hover:bg-white/20"
                                    >
                                        <X className="h-7 w-7" />
                                    </button>
                                </div>
                            )}

                            {/* Subtítulo decorativo — contenido contextual */}
                            {(esFeed || subtituloMobile) && (
                                <div className="pb-2 overflow-hidden">
                                    <div className="flex items-center justify-center gap-2.5">
                                        <div
                                            className="h-0.5 w-14 rounded-full"
                                            style={{
                                                background:
                                                    'linear-gradient(90deg, transparent, rgba(2,132,199,0.7))',
                                            }}
                                        />
                                        <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
                                            {esFeed ? (
                                                ciudad ? (
                                                    <>
                                                        En{' '}
                                                        <span className="font-bold text-white">
                                                            {ciudad}
                                                        </span>
                                                        {totalPublicaciones !== null && (
                                                            <>
                                                                {' '}· {totalPublicaciones}{' '}
                                                                {totalPublicaciones === 1
                                                                    ? 'publicación'
                                                                    : 'publicaciones'}
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="font-bold uppercase tracking-widest text-white/60 text-[11px]">
                                                        Servicios e intangibles
                                                    </span>
                                                )
                                            ) : (
                                                subtituloMobile
                                            )}
                                        </span>
                                        <div
                                            className="h-0.5 w-14 rounded-full"
                                            style={{
                                                background:
                                                    'linear-gradient(90deg, rgba(2,132,199,0.7), transparent)',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Chips de filtros — solo variante='feed' en mobile */}
                            {esFeed && filtroActivo && onFiltroChange && (
                                <div className="pl-3 pb-3">
                                    <ChipsFiltros
                                        activo={filtroSeguro}
                                        onChange={onFiltroChange}
                                        variant="dark"
                                        modo={modoSeguro}
                                        onModoChange={onModoChange}
                                    />
                                </div>
                            )}
                        </div>

                        {/* ═══ DESKTOP HEADER (≥lg, una sola fila) ═══ */}
                        <div className="hidden lg:block">
                            <div className="flex items-center justify-between gap-4 px-6 py-4 2xl:px-8 2xl:py-5">
                                {/* Izquierda: back + logo + título (fijo) */}
                                <div className="flex shrink-0 items-center gap-3">
                                    <button
                                        data-testid="btn-volver-servicios-desktop"
                                        onClick={onBack}
                                        aria-label="Volver al inicio"
                                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                    >
                                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                    <div
                                        className="flex h-11 w-11 items-center justify-center rounded-lg 2xl:h-12 2xl:w-12"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, #38bdf8, #0369a1)',
                                        }}
                                    >
                                        <Wrench
                                            className="h-6 w-6 text-white 2xl:h-[26px] 2xl:w-[26px]"
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                    <div className="flex items-baseline">
                                        <span className="text-2xl font-extrabold tracking-tight text-white 2xl:text-3xl">
                                            Servi
                                        </span>
                                        <span className="text-2xl font-extrabold tracking-tight text-sky-400 2xl:text-3xl">
                                            cios
                                        </span>
                                    </div>
                                    {/* Breadcrumb desktop — solo variante='pagina'. */}
                                    {!esFeed && breadcrumb && (
                                        <div className="hidden lg:flex items-center gap-2.5 min-w-0 ml-3">
                                            <ChevronRight
                                                className="h-5 w-5 shrink-0 text-white/40"
                                                strokeWidth={2.5}
                                            />
                                            <span
                                                data-testid="header-breadcrumb"
                                                className="truncate text-lg 2xl:text-xl font-bold text-white/85"
                                            >
                                                {breadcrumb}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1" />

                                {/* Derecha: contenido variable según variante */}
                                <div className="flex shrink-0 items-center gap-4">
                                    {esFeed ? (
                                        <>
                                            {filtroActivo && onFiltroChange && (
                                                <div className="min-w-0">
                                                    <ChipsFiltros
                                                        activo={filtroSeguro}
                                                        onChange={onFiltroChange}
                                                        variant="dark"
                                                    />
                                                </div>
                                            )}
                                            {totalPublicaciones !== null && (
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span
                                                        data-testid="kpi-total-publicaciones"
                                                        className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
                                                    >
                                                        {totalPublicaciones}
                                                    </span>
                                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-sky-400/80 uppercase tracking-wider mt-1">
                                                        {totalPublicaciones === 1
                                                            ? 'Publicación'
                                                            : 'Publicaciones'}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        slotDerecho
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ServiciosHeader;
