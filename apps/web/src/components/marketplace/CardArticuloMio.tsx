/**
 * CardArticuloMio.tsx
 * ====================
 * Card del vendedor en "Mis Publicaciones". Distinta de `CardArticuloFeed`
 * (que es la card del comprador con Q&A inline): aquí prima la gestión —
 * foto + título + precio + estado-pill + KPIs reales + menú "⋯" con las
 * acciones disponibles según estado.
 *
 * Layout responsive:
 *   - Móvil (< lg): foto fullbleed arriba con aspect 4:3, contenido debajo.
 *     Patrón estilo Facebook Marketplace — la foto es protagonista.
 *   - Laptop+ (lg:): foto cuadrada a la izquierda, contenido a la derecha.
 *     Layout horizontal para densidad en grids de 2-3 columnas.
 *
 * Click en card → detalle público P2 (`/marketplace/articulo/:id`).
 * Menú "⋯" (flotante sobre la foto en móvil, esquina top-right en desktop)
 * abre el dropdown de acciones contextuales por estado.
 *
 * Acciones por estado:
 *   - activa  → Editar · Pausar · Marcar vendido · (sep) · Eliminar
 *   - pausada → Editar · Reactivar · Marcar vendido · (sep) · Eliminar
 *   - vendida → Reabrir publicación · (sep) · Eliminar
 *     (cubre errores de marcado y ventas que se caen — la transacción es
 *     100% offline, así que reabrir no afecta sistemas externos)
 *
 * El detalle de "+30 días" del ciclo de vida se comunica en el toast de
 * éxito tras la acción, no en el label del item (más limpio visualmente).
 *
 * Ubicación: apps/web/src/components/marketplace/CardArticuloMio.tsx
 */

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MoreVertical,
    Pencil,
    PauseCircle,
    PlayCircle,
    CheckCircle,
    Trash2,
    ImageOff,
    PackageX,
    type LucideIcon,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
import {
    formatearPrecio,
    formatearTiempoRelativo,
    obtenerFotoPortada,
    parsearFechaPostgres,
} from '../../utils/marketplace';
import type {
    ArticuloMarketplace,
    CondicionArticulo,
    EstadoArticulo,
} from '../../types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
    nuevo: 'Nuevo',
    seminuevo: 'Seminuevo',
    usado: 'Usado',
    para_reparar: 'Para reparar',
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Calcula los días restantes hasta que expire el artículo. Si ya pasó la
 * fecha, devuelve 0 (el cron lo pausará en la próxima corrida, pero el
 * usuario sigue viendo "expira hoy" hasta entonces).
 */
function diasRestantes(expiraAt: string): number {
    const fecha = parsearFechaPostgres(expiraAt);
    const diff = fecha.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / MS_POR_DIA));
}

// =============================================================================
// PROPS
// =============================================================================

interface CardArticuloMioProps {
    articulo: ArticuloMarketplace;
    onEditar: (articulo: ArticuloMarketplace) => void;
    onPausar: (articulo: ArticuloMarketplace) => void;
    onReactivar: (articulo: ArticuloMarketplace) => void;
    onMarcarVendido: (articulo: ArticuloMarketplace) => void;
    onEliminar: (articulo: ArticuloMarketplace) => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardArticuloMio({
    articulo,
    onEditar,
    onPausar,
    onReactivar,
    onMarcarVendido,
    onEliminar,
}: CardArticuloMioProps) {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al click afuera (mismo patrón que dropdowns de BS).
    // Ignora clicks en el botón "⋯" porque `mousedown` se dispara antes que
    // `click`: sin el guard, mousedown cerraría el menú y el click siguiente
    // (handleMenuToggle con `!v`) lo reabriría → el usuario percibe "no se
    // cierra". El `data-menu-toggle-articulo` identifica los 2 botones
    // (móvil + desktop) de esta card específica sin colisionar con otras.
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(`[data-menu-toggle-articulo="${articulo.id}"]`)) return;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto, articulo.id]);

    const foto = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    // Vendidas no muestran días restantes — el ciclo terminó.
    const dias = articulo.estado === 'vendida' ? null : diasRestantes(articulo.expiraAt);
    const diasUrgente = dias !== null && dias <= 3;

    const handleClickCard = () => {
        // Ruta del frontend en singular (`articulo`), distinta de la API que
        // sí es plural (`/api/marketplace/articulos/:id`).
        navigate(`/marketplace/articulo/${articulo.id}`);
    };

    const handleMenuToggle = (e: ReactMouseEvent) => {
        e.stopPropagation();
        setMenuAbierto((v) => !v);
    };

    const handleAccion = (e: ReactMouseEvent, accion: () => void) => {
        e.stopPropagation();
        setMenuAbierto(false);
        accion();
    };

    return (
        <article
            data-testid={`card-articulo-mio-${articulo.id}`}
            onClick={handleClickCard}
            className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-300 bg-white lg:hover:border-cyan-400 lg:hover:shadow-md"
        >
            {/* ── Foto portada ─────────────────────────────────────────────────
                Layout vertical unificado (móvil + desktop): foto fullbleed
                arriba con aspect 4:3 y `rounded-t-xl`. El menú "⋯" flota sobre
                la foto en ambos viewports — patrón consistente.
            ────────────────────────────────────────────────────────────────── */}
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-xl bg-slate-200">
                {foto ? (
                    <img
                        src={foto}
                        alt={articulo.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                        <ImageOff className="h-8 w-8" strokeWidth={2} />
                    </div>
                )}

                {/* Overlay de estado para `vendida` y `pausada` — semi-translúcido
                    para dejar ver la foto pero comunicar visualmente que el
                    artículo no está activo. El icono + texto centrado dan
                    contexto inmediato sin leer el pill. Patrón heredado del
                    `OverlayVendido` del perfil público del vendedor. */}
                {articulo.estado === 'vendida' && (
                    <div
                        data-testid={`overlay-vendido-${articulo.id}`}
                        className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px]"
                    >
                        <div className="flex flex-col items-center gap-0.5 text-white">
                            <PackageX className="h-9 w-9 drop-shadow lg:h-12 lg:w-12" strokeWidth={2} />
                            <span className="text-lg font-extrabold uppercase tracking-wider drop-shadow-md lg:text-2xl">
                                Vendido
                            </span>
                        </div>
                    </div>
                )}
                {articulo.estado === 'pausada' && (
                    <div
                        data-testid={`overlay-pausado-${articulo.id}`}
                        className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px]"
                    >
                        <div className="flex flex-col items-center gap-0.5 text-white">
                            <PauseCircle className="h-9 w-9 drop-shadow lg:h-12 lg:w-12" strokeWidth={2} />
                            <span className="text-lg font-extrabold uppercase tracking-wider drop-shadow-md lg:text-2xl">
                                Pausado
                            </span>
                        </div>
                    </div>
                )}

                {/* Menú "⋯" flotante sobre la foto — móvil + desktop. */}
                <button
                    data-testid={`btn-menu-articulo-mio-${articulo.id}`}
                    data-menu-toggle-articulo={articulo.id}
                    onClick={handleMenuToggle}
                    aria-label="Acciones de la publicación"
                    aria-expanded={menuAbierto}
                    className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur-sm lg:h-10 lg:w-10"
                >
                    <MoreVertical className="h-5 w-5 lg:h-5 lg:w-5" strokeWidth={2.5} />
                </button>

                {/* Badge de expiración flotante — solo móvil. En desktop el
                    chip vive en el row de KPIs (hay espacio sobrado). En móvil
                    lo movemos a la foto para liberar el row de KPIs y que los
                    3 chips restantes (vistas/mensajes/guardados) puedan ser
                    más grandes sin desbordar. Cuando es urgente (≤3 días)
                    cambia a fondo ámbar para llamar la atención. */}
                {dias !== null && (
                    <div
                        data-testid={`badge-expira-${articulo.id}`}
                        className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-md backdrop-blur lg:hidden ${
                            diasUrgente ? 'bg-amber-500 text-white' : 'bg-slate-900/70 text-white'
                        }`}
                        title={dias === 0 ? 'Expira hoy' : `Expira en ${dias} días`}
                    >
                        <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        <span>{dias === 0 ? 'Hoy' : `${dias}d`}</span>
                    </div>
                )}
            </div>

            {/* ── Contenido ──────────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 lg:gap-2 lg:p-3.5">
                {/* Fila 1: título — el menú "⋯" vive sobre la foto, no aquí. */}
                <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-base">
                    {articulo.titulo}
                </h3>

                {/* Fila 2: precio destacado con color de marca + unidad + condición.
                    `flex-wrap` para que la unidad/condición bajen a otra línea
                    si el precio es largo, en vez de truncarse. */}
                <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-base font-bold text-cyan-700 lg:text-lg">
                    <span>{formatearPrecio(articulo.precio)}</span>
                    {articulo.unidadVenta && (
                        <span className="text-sm font-medium text-cyan-700">
                            {articulo.unidadVenta}
                        </span>
                    )}
                    {articulo.condicion && (
                        <span className="text-sm font-medium text-slate-600">
                            {ETIQUETA_CONDICION[articulo.condicion]}
                        </span>
                    )}
                </p>

                {/* Fila 3: solo tiempo publicado. El estado vive como overlay
                    sobre la foto. */}
                <span className="truncate text-sm font-medium text-slate-600">
                    Publicado {formatearTiempoRelativo(articulo.createdAt)}
                </span>

                {/* Fila 4: KPIs como mini-chips. En móvil son solo 3
                    (vistas/mensajes/guardados) — el chip de expiración vive
                    como badge flotante sobre la foto para liberar espacio.
                    En lg+ aparecen los 4. `flex-wrap` por seguridad cuando
                    los valores son grandes (5+ dígitos en cada KPI). */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <KpiChip
                        icono={Eye}
                        valor={articulo.totalVistas}
                        label={`${articulo.totalVistas} vistas`}
                    />
                    <KpiChip
                        icono={MessageCircle}
                        valor={articulo.totalMensajes}
                        label={`${articulo.totalMensajes} mensajes`}
                    />
                    <KpiChip
                        icono={Bookmark}
                        valor={articulo.totalGuardados}
                        label={`${articulo.totalGuardados} guardados`}
                        acento="amber"
                    />
                    {dias !== null && (
                        <KpiChip
                            icono={Clock}
                            valor={dias === 0 ? 'Hoy' : `${dias}d`}
                            label={dias === 0 ? 'Expira hoy' : `Expira en ${dias} días`}
                            urgente={diasUrgente}
                            className="!hidden lg:!inline-flex"
                        />
                    )}
                </div>
            </div>

            {/* ── Dropdown del menú "⋯" ───────────────────────────────────────
                Posición móvil: bajo el botón flotante sobre la foto (top-12 right-2).
                Posición desktop: bajo el botón del header del contenido.
                Anatomía: `rounded-xl`, `shadow-xl`, animación slide+fade de
                entrada (150ms). Tokens — Regla 2 (`border-slate-300`+, hover
                `bg-slate-200`+), Regla 7 (`shadow-xl` para flotantes), Regla
                10 (animate-in + `lg:hover:`).
            ────────────────────────────────────────────────────────────────── */}
            {menuAbierto && (
                <div
                    ref={menuRef}
                    className="absolute right-2 top-12 z-20 w-44 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 lg:right-3 lg:top-14 lg:w-56"
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                >
                    {articulo.estado === 'activa' && (
                        <>
                            <BotonMenu
                                testId={`menu-editar-${articulo.id}`}
                                icono={Pencil}
                                onClick={(e) => handleAccion(e, () => onEditar(articulo))}
                            >
                                Editar
                            </BotonMenu>
                            <BotonMenu
                                testId={`menu-pausar-${articulo.id}`}
                                icono={PauseCircle}
                                iconColor="text-amber-600"
                                onClick={(e) => handleAccion(e, () => onPausar(articulo))}
                            >
                                Pausar
                            </BotonMenu>
                            <BotonMenu
                                testId={`menu-vendido-${articulo.id}`}
                                icono={CheckCircle}
                                iconColor="text-emerald-600"
                                onClick={(e) => handleAccion(e, () => onMarcarVendido(articulo))}
                            >
                                Marcar vendido
                            </BotonMenu>
                            <div className="my-1 border-t border-slate-300" />
                        </>
                    )}
                    {articulo.estado === 'pausada' && (
                        <>
                            <BotonMenu
                                testId={`menu-editar-${articulo.id}`}
                                icono={Pencil}
                                onClick={(e) => handleAccion(e, () => onEditar(articulo))}
                            >
                                Editar
                            </BotonMenu>
                            <BotonMenu
                                testId={`menu-reactivar-${articulo.id}`}
                                icono={PlayCircle}
                                iconColor="text-teal-600"
                                onClick={(e) => handleAccion(e, () => onReactivar(articulo))}
                            >
                                Reactivar
                            </BotonMenu>
                            <BotonMenu
                                testId={`menu-vendido-${articulo.id}`}
                                icono={CheckCircle}
                                iconColor="text-emerald-600"
                                onClick={(e) => handleAccion(e, () => onMarcarVendido(articulo))}
                            >
                                Marcar vendido
                            </BotonMenu>
                            <div className="my-1 border-t border-slate-300" />
                        </>
                    )}
                    {articulo.estado === 'vendida' && (
                        <>
                            <BotonMenu
                                testId={`menu-reabrir-${articulo.id}`}
                                icono={PlayCircle}
                                iconColor="text-teal-600"
                                onClick={(e) => handleAccion(e, () => onReactivar(articulo))}
                            >
                                Re-Activar
                            </BotonMenu>
                            <div className="my-1 border-t border-slate-300" />
                        </>
                    )}
                    <BotonMenu
                        testId={`menu-eliminar-${articulo.id}`}
                        icono={Trash2}
                        iconColor="text-red-600"
                        textColor="text-red-600"
                        hoverClass="lg:hover:bg-red-100"
                        onClick={(e) => handleAccion(e, () => onEliminar(articulo))}
                    >
                        Eliminar
                    </BotonMenu>
                </div>
            )}
        </article>
    );
}

// =============================================================================
// SUBCOMPONENTE — KpiChip
// =============================================================================

interface KpiChipProps {
    // Aceptamos LucideIcon o cualquier componente con className (wrappers Iconify)
    icono: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }>;
    valor: number | string;
    label: string;
    urgente?: boolean;
    acento?: 'amber';
    /** Clases extra para esconder/mostrar el chip por viewport. */
    className?: string;
}

function KpiChip({ icono: IconoChip, valor, label, urgente, acento, className }: KpiChipProps) {
    const bgClasses = acento === 'amber' || urgente ? 'bg-amber-100' : 'bg-slate-200';
    const textClasses = acento === 'amber' || urgente ? 'text-amber-700' : 'text-slate-700';
    const iconClasses = acento === 'amber' ? 'text-amber-500' : urgente ? 'text-amber-600' : 'text-slate-600';
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full ${bgClasses} px-2 py-1 text-sm font-semibold ${textClasses} lg:px-2.5 ${className ?? ''}`}
            title={label}
        >
            <IconoChip className={`h-3.5 w-3.5 ${iconClasses} lg:h-4 lg:w-4`} strokeWidth={2.5} fill={acento === 'amber' ? 'currentColor' : 'none'} />
            {valor}
        </span>
    );
}

// =============================================================================
// SUBCOMPONENTE — BotonMenu
// =============================================================================

interface BotonMenuProps {
    testId: string;
    icono: LucideIcon;
    iconColor?: string;
    textColor?: string;
    /**
     * Clase de hover personalizable. Por defecto `lg:hover:bg-slate-200`
     * (cumple Regla 2 — mínimo `bg-slate-200`). Items destructivos pasan
     * `lg:hover:bg-red-100` para distinguirlos visualmente.
     */
    hoverClass?: string;
    onClick: (e: ReactMouseEvent) => void;
    children: React.ReactNode;
}

function BotonMenu({
    testId,
    icono: Icon,
    iconColor = 'text-slate-600',
    textColor = 'text-slate-700',
    hoverClass = 'lg:hover:bg-slate-200',
    onClick,
    children,
}: BotonMenuProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="menuitem"
            className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-semibold lg:gap-3 lg:px-3.5 lg:py-2.5 ${textColor} ${hoverClass}`}
        >
            <Icon className={`h-4 w-4 shrink-0 lg:h-5 lg:w-5 ${iconColor}`} strokeWidth={2.5} />
            {children}
        </button>
    );
}

export default CardArticuloMio;
