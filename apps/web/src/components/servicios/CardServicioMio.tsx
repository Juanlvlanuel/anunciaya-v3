/**
 * CardServicioMio.tsx
 * =====================
 * Card del dueño en "Mis Publicaciones de Servicios". Densa con preview
 * + KPIs + menú "⋯" de acciones según estado.
 *
 * Acciones por estado:
 *   - activa  → Editar · Pausar · Eliminar
 *   - pausada → Editar · Reactivar · Eliminar
 *
 * Servicios NO tiene "vendida" — un servicio no se agota, si ya no se
 * ofrece, se elimina (decisión UX 2026-05-15).
 *
 * Patrón calcado de `CardArticuloMio` (MarketPlace) pero adaptado para
 * el shape de Servicios y sus 2 estados.
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
    labelCategoria,
    modalidadLabel,
    obtenerFotoPortada,
    parsearFechaPostgres,
} from '../../utils/servicios';
import type { PublicacionServicio } from '../../types/servicios';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const ETIQUETA_ESTADO: Record<'activa' | 'pausada', string> = {
    activa: 'Activa',
    pausada: 'Pausada',
};

const TONO_ESTADO: Record<'activa' | 'pausada', string> = {
    activa: 'bg-emerald-100 text-emerald-700',
    pausada: 'bg-amber-100 text-amber-800',
};

interface CardServicioMioProps {
    publicacion: PublicacionServicio;
    onEditar: (p: PublicacionServicio) => void;
    onPausar: (p: PublicacionServicio) => void;
    onReactivar: (p: PublicacionServicio) => void;
    onEliminar: (p: PublicacionServicio) => void;
}

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

    // Cerrar menú al hacer click fuera
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: globalThis.MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto]);

    const estado = publicacion.estado as 'activa' | 'pausada';
    const fotoPortada = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    );
    const tiempoCreado = formatearTiempoRelativo(publicacion.createdAt);

    // Días restantes hasta expiración
    const diasRestantes = (() => {
        try {
            const expira = parsearFechaPostgres(publicacion.expiraAt);
            return Math.max(
                0,
                Math.ceil((expira.getTime() - Date.now()) / MS_POR_DIA),
            );
        } catch {
            return null;
        }
    })();

    const esSolicito = publicacion.modo === 'solicito';
    const precioMostrar = esSolicito
        ? publicacion.presupuesto
            ? formatearPresupuesto(publicacion.presupuesto)
            : 'A convenir'
        : formatearPrecioServicio(publicacion.precio);

    function abrirDetalle() {
        navigate(`/servicios/${publicacion.id}`);
    }

    function toggleMenu(e: ReactMouseEvent) {
        e.stopPropagation();
        setMenuAbierto((v) => !v);
    }

    function ejecutar(accion: () => void) {
        return (e: ReactMouseEvent) => {
            e.stopPropagation();
            setMenuAbierto(false);
            accion();
        };
    }

    return (
        <div
            onClick={abrirDetalle}
            className="group relative flex h-full flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:cursor-pointer hover:shadow-md transition-shadow"
            data-testid={`card-servicio-mio-${publicacion.id}`}
        >
            {/* Foto portada o placeholder — altura fija con aspect-[4/3] +
                shrink-0 para que NUNCA se comprima si el contenido crece. */}
            <div className="relative aspect-[4/3] shrink-0 bg-slate-100 overflow-hidden">
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={publicacion.titulo}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center text-slate-400">
                        <ImageOff className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                )}

                {/* Estado pill — solo cuando es pausada (igual que MP).
                    Cuando es activa, no se muestra pill: ya estás en el panel
                    de Mis Publicaciones, asumir "activa" por defecto. */}
                {estado === 'pausada' && (
                    <div className="absolute top-2 left-2">
                        <span
                            className={
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ' +
                                TONO_ESTADO[estado]
                            }
                        >
                            {ETIQUETA_ESTADO[estado]}
                        </span>
                    </div>
                )}

                {/* Menú "⋯" */}
                <div
                    ref={menuRef}
                    className="absolute top-2 right-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        data-testid={`card-servicio-mio-menu-${publicacion.id}`}
                        onClick={toggleMenu}
                        aria-label="Acciones"
                        className="w-8 h-8 rounded-full bg-black/50 backdrop-blur text-white grid place-items-center hover:bg-black/70 lg:cursor-pointer"
                    >
                        <MoreVertical className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    {menuAbierto && (
                        <div className="absolute top-9 right-0 w-44 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-10">
                            <ItemMenu
                                icon={Pencil}
                                label="Editar"
                                onClick={ejecutar(() => onEditar(publicacion))}
                            />
                            {estado === 'activa' ? (
                                <ItemMenu
                                    icon={PauseCircle}
                                    label="Pausar"
                                    onClick={ejecutar(() =>
                                        onPausar(publicacion),
                                    )}
                                />
                            ) : (
                                <ItemMenu
                                    icon={PlayCircle}
                                    label="Reactivar"
                                    onClick={ejecutar(() =>
                                        onReactivar(publicacion),
                                    )}
                                />
                            )}
                            <div className="h-px bg-slate-200" />
                            <ItemMenu
                                icon={Trash2}
                                label="Eliminar"
                                tono="rojo"
                                onClick={ejecutar(() =>
                                    onEliminar(publicacion),
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Contenido — flex-1 para llenar el alto restante. KPIs al pie
                con mt-auto para que siempre queden alineados horizontalmente
                entre cards de la misma fila. */}
            <div className="flex flex-1 flex-col p-3 lg:p-4">
                {/* Título — reservamos altura fija de 2 líneas con min-h
                    para que el bloque de título mida igual cuando son 1 ó
                    2 líneas. Sin esto, las cards de título largo crecen y
                    rompen la cuadrícula. */}
                <h3 className="text-[14px] lg:text-[15px] font-bold text-slate-900 line-clamp-2 leading-tight min-h-[2.5em]">
                    {publicacion.titulo}
                </h3>

                {/* Línea de meta — precio + modalidad + (opcional) chip de
                    categoría/urgente. Si no hay categoría, el espacio queda
                    vacío en la misma fila sin sumar altura. */}
                <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span
                        className={
                            'text-[15px] font-extrabold tabular-nums ' +
                            (esSolicito ? 'text-amber-700' : 'text-sky-700')
                        }
                    >
                        {precioMostrar}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                        · {modalidadLabel(publicacion.modalidad)}
                    </span>
                    {esSolicito && publicacion.categoria && (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-slate-600">
                            ·{' '}
                            {publicacion.urgente
                                ? 'Urgente'
                                : labelCategoria(publicacion.categoria)}
                        </span>
                    )}
                </div>

                {/* KPIs en fila densa — empujados al pie con mt-auto */}
                <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-slate-600 font-semibold">
                    <KPI icon={Eye} valor={publicacion.totalVistas} />
                    <KPI icon={MessageCircle} valor={publicacion.totalMensajes} />
                    <KPI
                        icon={Clock}
                        valor={
                            diasRestantes !== null
                                ? `${diasRestantes}d`
                                : '—'
                        }
                        titulo="Días restantes para expirar"
                    />
                    <span className="ml-auto text-slate-500 font-medium">
                        {tiempoCreado}
                    </span>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Subcomponentes
// =============================================================================

interface ItemMenuProps {
    icon: LucideIcon;
    label: string;
    onClick: (e: ReactMouseEvent) => void;
    tono?: 'normal' | 'rojo';
}

function ItemMenu({ icon: Icon, label, onClick, tono = 'normal' }: ItemMenuProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-left lg:cursor-pointer hover:bg-slate-100 ' +
                (tono === 'rojo' ? 'text-red-700' : 'text-slate-700')
            }
        >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
            {label}
        </button>
    );
}

interface KPIProps {
    icon: LucideIcon;
    valor: number | string;
    titulo?: string;
}

function KPI({ icon: Icon, valor, titulo }: KPIProps) {
    return (
        <span
            className="inline-flex items-center gap-1 tabular-nums"
            title={titulo}
        >
            <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
            {valor}
        </span>
    );
}

export default CardServicioMio;
