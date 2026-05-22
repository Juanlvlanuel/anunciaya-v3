/**
 * CardServicioMio.tsx
 * =====================
 * Card del dueño en "Mis Publicaciones" — Servicios. Réplica del patrón
 * de `CardArticuloMio` (MarketPlace) para mantener consistencia visual
 * entre las 2 vistas del panel de Mis Publicaciones.
 *
 * Layout vertical en todos los viewports:
 *   - Foto fullbleed arriba con aspect 4:3 y `rounded-t-xl`.
 *   - Contenido (título + precio · meta + tiempo + KPIs) debajo.
 *   - Menú "⋯" flotante esquina superior derecha de la foto.
 *   - Badge de expiración flotante en móvil esquina inf-derecha de la
 *     foto (en desktop vive en la fila de KPIs).
 *
 * Overlay grande de estado:
 *   - `pausada` → overlay semi-translúcido con `PauseCircle` + "PAUSADO".
 *   - Servicios NO tiene `vendida` (decisión UX 2026-05-15 — un servicio
 *     no se agota; si ya no se ofrece se elimina).
 *
 * Acciones por estado (dropdown estilo MP):
 *   - activa  → Editar · Pausar · (sep) · Eliminar
 *   - pausada → Editar · Reactivar · (sep) · Eliminar
 *
 * Tonos del dropdown (mismos colores que MP):
 *   - Editar (Pencil): slate-600 default
 *   - Pausar (PauseCircle): amber-600
 *   - Reactivar (PlayCircle): teal-600
 *   - Eliminar (Trash2): red-600 + hover bg-red-100
 *
 * Ubicación: apps/web/src/components/servicios/CardServicioMio.tsx
 */

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    Eye,
    ImageOff,
    MessageCircle,
    MoreVertical,
    PauseCircle,
    Pencil,
    PlayCircle,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    formatearTiempoRelativo,
    obtenerFotoPortada,
    parsearFechaPostgres,
} from '../../utils/servicios';
import type { PublicacionServicio } from '../../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Calcula los días restantes hasta que expire la publicación. Si ya pasó
 * la fecha, devuelve 0 (el cron lo pausará en la próxima corrida, pero el
 * usuario sigue viendo "expira hoy" hasta entonces).
 */
function diasRestantes(expiraAt: string): number {
    try {
        const fecha = parsearFechaPostgres(expiraAt);
        const diff = fecha.getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / MS_POR_DIA));
    } catch {
        return 0;
    }
}

// =============================================================================
// PROPS
// =============================================================================

interface CardServicioMioProps {
    publicacion: PublicacionServicio;
    onEditar: (p: PublicacionServicio) => void;
    onPausar: (p: PublicacionServicio) => void;
    onReactivar: (p: PublicacionServicio) => void;
    onEliminar: (p: PublicacionServicio) => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardServicioMio({
    publicacion,
    onEditar,
    onPausar,
    onReactivar,
    onEliminar,
}: CardServicioMioProps) {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al click afuera (mismo patrón que CardArticuloMio).
    // Ignora clicks en el botón "⋯" porque `mousedown` se dispara antes
    // que `click`: sin el guard, mousedown cerraría el menú y el click
    // siguiente lo reabriría. El `data-menu-toggle-servicio` identifica
    // los botones de ESTA card sin colisionar con otras.
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: globalThis.MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(`[data-menu-toggle-servicio="${publicacion.id}"]`)) return;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto, publicacion.id]);

    const estado = publicacion.estado as 'activa' | 'pausada';
    const foto = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    );
    const dias = diasRestantes(publicacion.expiraAt);
    const diasUrgente = dias <= 3;

    const esSolicito = publicacion.modo === 'solicito';
    const esVacante = publicacion.tipo === 'vacante-empresa';

    // Precio según tipo/modo:
    //   - Vacante (modo='solicito' + tipo='vacante-empresa') → el rango
    //     salarial vive en `publicacion.precio` (lo guarda BS Vacantes).
    //   - Ofrezco → precio del servicio en `publicacion.precio`.
    //   - Solicito de persona (clasificado) → `publicacion.presupuesto`
    //     si existe, sino "A convenir".
    const precioMostrar = (esVacante || !esSolicito)
        ? formatearPrecioServicio(publicacion.precio)
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A convenir';

    const handleClickCard = () => {
        navigate(`/servicios/${publicacion.id}`);
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
            data-testid={`card-servicio-mio-${publicacion.id}`}
            onClick={handleClickCard}
            className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-300 bg-white lg:hover:border-sky-400 lg:hover:shadow-md"
        >
            {/* ── Foto portada (aspect 4:3 fullbleed) ───────────────────────── */}
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-xl bg-slate-200">
                {foto ? (
                    <img
                        src={foto}
                        alt={publicacion.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                        <ImageOff className="h-8 w-8" strokeWidth={2} />
                    </div>
                )}

                {/* Overlay grande "PAUSADO" — mismo patrón que CardArticuloMio.
                    Servicios no tiene `vendida` (decisión UX), por eso solo
                    se renderiza el overlay de `pausada`. */}
                {estado === 'pausada' && (
                    <div
                        data-testid={`overlay-pausado-${publicacion.id}`}
                        className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px]"
                    >
                        <div className="flex flex-col items-center gap-0.5 text-white">
                            <PauseCircle
                                className="h-9 w-9 drop-shadow lg:h-12 lg:w-12"
                                strokeWidth={2}
                            />
                            <span className="text-lg font-extrabold uppercase tracking-wider drop-shadow-md lg:text-2xl">
                                Pausado
                            </span>
                        </div>
                    </div>
                )}

                {/* Menú "⋯" flotante sobre la foto */}
                <button
                    data-testid={`btn-menu-servicio-mio-${publicacion.id}`}
                    data-menu-toggle-servicio={publicacion.id}
                    onClick={handleMenuToggle}
                    aria-label="Acciones de la publicación"
                    aria-expanded={menuAbierto}
                    className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur-sm lg:h-10 lg:w-10"
                >
                    <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                </button>

                {/* Badge de expiración flotante — solo móvil (en desktop
                    vive en la fila de KPIs). Cambia a fondo amber cuando
                    es urgente (≤3 días). */}
                <div
                    data-testid={`badge-expira-servicio-${publicacion.id}`}
                    className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-md backdrop-blur lg:hidden ${
                        diasUrgente
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-900/70 text-white'
                    }`}
                    title={
                        dias === 0
                            ? 'Expira hoy'
                            : `Expira en ${dias} días`
                    }
                >
                    <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>{dias === 0 ? 'Hoy' : `${dias}d`}</span>
                </div>
            </div>

            {/* ── Contenido ──────────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 lg:gap-2 lg:p-3.5">
                {/* Fila 1: título — 1 línea truncate (mismo que MP). */}
                <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-base">
                    {publicacion.titulo}
                </h3>

                {/* Fila 2: precio destacado + modalidad.
                    Color del precio según modo: sky para `ofrezco`, amber
                    para `solicito` (mismo lenguaje que el composer + cards
                    del feed de Servicios). */}
                <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-base font-bold lg:text-lg">
                    <span
                        className={
                            esSolicito ? 'text-amber-700' : 'text-sky-700'
                        }
                    >
                        {precioMostrar}
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                        {modalidadEtiqueta(publicacion.modalidad)}
                    </span>
                </p>

                {/* Fila 3: solo tiempo publicado (estado vive en overlay). */}
                <span className="truncate text-sm font-medium text-slate-600">
                    Publicado {formatearTiempoRelativo(publicacion.createdAt)}
                </span>

                {/* Fila 4: KPIs como mini-chips estilo MP. En móvil son 2
                    (vistas/mensajes) — el chip de expiración vive como
                    badge flotante sobre la foto. En lg+ aparecen los 3.
                    `flex-wrap` por seguridad cuando los valores crecen. */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <KpiChip
                        icono={Eye}
                        valor={publicacion.totalVistas}
                        label={`${publicacion.totalVistas} vistas`}
                    />
                    <KpiChip
                        icono={MessageCircle}
                        valor={publicacion.totalMensajes}
                        label={`${publicacion.totalMensajes} mensajes`}
                    />
                    <KpiChip
                        icono={Clock}
                        valor={dias === 0 ? 'Hoy' : `${dias}d`}
                        label={
                            dias === 0
                                ? 'Expira hoy'
                                : `Expira en ${dias} días`
                        }
                        urgente={diasUrgente}
                        className="!hidden lg:!inline-flex"
                    />
                </div>
            </div>

            {/* ── Dropdown del menú "⋯" ───────────────────────────────────────
                Mismo posicionamiento y estilo que CardArticuloMio: rounded-xl,
                shadow-xl, animación slide+fade 150ms, items con iconos en
                colores específicos por acción.
            ────────────────────────────────────────────────────────────────── */}
            {menuAbierto && (
                <div
                    ref={menuRef}
                    className="absolute right-2 top-12 z-20 w-44 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 lg:right-3 lg:top-14 lg:w-56"
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                >
                    <BotonMenu
                        testId={`menu-editar-servicio-${publicacion.id}`}
                        icono={Pencil}
                        onClick={(e) => handleAccion(e, () => onEditar(publicacion))}
                    >
                        Editar
                    </BotonMenu>
                    {estado === 'activa' ? (
                        <BotonMenu
                            testId={`menu-pausar-servicio-${publicacion.id}`}
                            icono={PauseCircle}
                            iconColor="text-amber-600"
                            onClick={(e) => handleAccion(e, () => onPausar(publicacion))}
                        >
                            Pausar
                        </BotonMenu>
                    ) : (
                        <BotonMenu
                            testId={`menu-reactivar-servicio-${publicacion.id}`}
                            icono={PlayCircle}
                            iconColor="text-teal-600"
                            onClick={(e) => handleAccion(e, () => onReactivar(publicacion))}
                        >
                            Reactivar
                        </BotonMenu>
                    )}
                    <div className="my-1 border-t border-slate-300" />
                    <BotonMenu
                        testId={`menu-eliminar-servicio-${publicacion.id}`}
                        icono={Trash2}
                        iconColor="text-red-600"
                        textColor="text-red-600"
                        hoverClass="lg:hover:bg-red-100"
                        onClick={(e) => handleAccion(e, () => onEliminar(publicacion))}
                    >
                        Eliminar
                    </BotonMenu>
                </div>
            )}
        </article>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Etiqueta corta de modalidad — coincide con el formato usado en el feed. */
function modalidadEtiqueta(modalidad: PublicacionServicio['modalidad']): string {
    switch (modalidad) {
        case 'presencial':
            return 'Presencial';
        case 'remoto':
            return 'Remoto';
        case 'hibrido':
            return 'Híbrido';
        default:
            return '';
    }
}

// =============================================================================
// SUBCOMPONENTE — KpiChip (copia del de CardArticuloMio)
// =============================================================================

interface KpiChipProps {
    icono: LucideIcon;
    valor: number | string;
    label: string;
    urgente?: boolean;
    /** Clases extra para esconder/mostrar el chip por viewport. */
    className?: string;
}

function KpiChip({ icono: IconoChip, valor, label, urgente, className }: KpiChipProps) {
    const bgClasses = urgente ? 'bg-amber-100' : 'bg-slate-200';
    const textClasses = urgente ? 'text-amber-700' : 'text-slate-700';
    const iconClasses = urgente ? 'text-amber-600' : 'text-slate-600';
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full ${bgClasses} px-2 py-1 text-sm font-semibold ${textClasses} lg:px-2.5 ${className ?? ''}`}
            title={label}
        >
            <IconoChip
                className={`h-3.5 w-3.5 ${iconClasses} lg:h-4 lg:w-4`}
                strokeWidth={2.5}
            />
            {valor}
        </span>
    );
}

// =============================================================================
// SUBCOMPONENTE — BotonMenu (copia del de CardArticuloMio)
// =============================================================================

interface BotonMenuProps {
    testId: string;
    icono: LucideIcon;
    iconColor?: string;
    textColor?: string;
    /**
     * Clase de hover personalizable. Por defecto `lg:hover:bg-slate-200`.
     * Items destructivos pasan `lg:hover:bg-red-100` para distinguirlos.
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
            <Icon
                className={`h-4 w-4 shrink-0 lg:h-5 lg:w-5 ${iconColor}`}
                strokeWidth={2.5}
            />
            {children}
        </button>
    );
}

export default CardServicioMio;
