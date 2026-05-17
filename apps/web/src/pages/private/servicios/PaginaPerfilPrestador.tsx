/**
 * PaginaPerfilPrestador.tsx
 * ===========================
 * Perfil público de un prestador de Servicios (cualquier usuario con
 * publicaciones). Ruta: `/servicios/usuario/:usuarioId`.
 *
 * Accesible desde el botón "Ver perfil" del OferenteCard en la pantalla
 * de detalle de una publicación.
 *
 * Estructura:
 *   - ServiciosHeader (negro, persistente) con onBack + pill paso/contexto
 *   - Bloque identidad: avatar + nombre + ciudad + miembro desde + KPIs
 *   - Tabs: Servicios activos · Reseñas
 *   - Contenido del tab activo (grid de cards o lista de reseñas)
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaPerfilPrestador.tsx
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, MessageCircle, Star } from 'lucide-react';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import {
    usePerfilPrestador,
    usePublicacionesDelPrestador,
    useResenasDelPrestador,
} from '../../../hooks/queries/useServicios';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import { CardServicio } from '../../../components/servicios/CardServicio';
import { CardVacante } from '../../../components/servicios/CardVacante';
import { Spinner } from '../../../components/ui/Spinner';
import {
    formatearTiempoRelativo,
    obtenerNombreCorto,
    parsearFechaPostgres,
} from '../../../utils/servicios';
import type {
    PerfilPrestador,
    PublicacionServicio,
    ResenaServicio,
} from '../../../types/servicios';

type TabActivo = 'servicios' | 'resenas';

export function PaginaPerfilPrestador() {
    const { usuarioId } = useParams<{ usuarioId: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/servicios');

    const {
        data: perfil,
        isPending: cargandoPerfil,
        isError: errorPerfil,
    } = usePerfilPrestador(usuarioId);

    const {
        data: publicaciones = [],
        isPending: cargandoPubs,
    } = usePublicacionesDelPrestador(usuarioId);

    const {
        data: resenas = [],
        isPending: cargandoResenas,
    } = useResenasDelPrestador(usuarioId);

    const [tab, setTab] = useState<TabActivo>('servicios');

    if (cargandoPerfil) {
        return (
            <>
                <ServiciosHeader variante="pagina" onBack={handleVolver} />
                <div className="min-h-full bg-transparent flex items-center justify-center py-20">
                    <Spinner tamanio="lg" />
                </div>
            </>
        );
    }

    if (errorPerfil || !perfil) {
        return (
            <>
                <ServiciosHeader variante="pagina" onBack={handleVolver} />
                <div className="min-h-full bg-transparent">
                    <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mb-4">
                                <AlertCircle
                                    className="w-7 h-7 text-amber-600"
                                    strokeWidth={1.75}
                                />
                            </div>
                            <h2 className="text-[18px] font-extrabold text-slate-900">
                                No encontramos a este usuario
                            </h2>
                            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                                Pudo haber eliminado su cuenta o cambiado su
                                privacidad. Vuelve al feed para ver otros
                                prestadores.
                            </p>
                            <button
                                onClick={() => navigate('/servicios')}
                                className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer"
                            >
                                Volver al feed
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`.trim();
    const nombreCorto = obtenerNombreCorto(perfil.nombre, perfil.apellidos);

    return (
        <>
            <ServiciosHeader
                variante="pagina"
                onBack={handleVolver}
                slotDerecho={
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1.5 text-[12px] font-bold text-sky-300 ring-1 ring-sky-400/30">
                        Perfil
                    </span>
                }
                subtituloMobile={nombreCorto}
            />

            <div className="min-h-full bg-transparent pb-32">
                <div className="lg:mx-auto lg:max-w-5xl lg:px-6 2xl:px-8">
                    {/* Bloque identidad */}
                    <div className="px-4 lg:px-0 pt-5 lg:pt-8">
                        <BloqueIdentidad
                            perfil={perfil}
                            nombreCompleto={nombreCompleto}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 lg:mt-8 px-4 lg:px-0">
                        <div className="border-b-2 border-slate-300 flex gap-2">
                            <BotonTab
                                activa={tab === 'servicios'}
                                onClick={() => setTab('servicios')}
                                etiqueta="Servicios activos"
                                contador={perfil.totalPublicacionesActivas}
                                testid="tab-servicios"
                            />
                            <BotonTab
                                activa={tab === 'resenas'}
                                onClick={() => setTab('resenas')}
                                etiqueta="Reseñas"
                                contador={perfil.totalResenas}
                                testid="tab-resenas"
                            />
                        </div>
                    </div>

                    {/* Contenido del tab */}
                    <div className="px-4 lg:px-0 mt-5 lg:mt-6">
                        {tab === 'servicios' ? (
                            <SeccionPublicaciones
                                cargando={cargandoPubs}
                                publicaciones={publicaciones}
                                nombre={nombreCorto}
                                onClick={(id) => navigate(`/servicios/${id}`)}
                            />
                        ) : (
                            <SeccionResenas
                                cargando={cargandoResenas}
                                resenas={resenas}
                                nombre={nombreCorto}
                                ratingPromedio={perfil.ratingPromedio}
                                totalResenas={perfil.totalResenas}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// =============================================================================
// BloqueIdentidad — avatar + nombre + badges + KPIs
// =============================================================================

function BloqueIdentidad({
    perfil,
    nombreCompleto,
}: {
    perfil: PerfilPrestador;
    nombreCompleto: string;
}) {
    const iniciales = (perfil.nombre[0] ?? '') + (perfil.apellidos[0] ?? '');

    const miembroDesdeTexto = formatearMiembroDesde(perfil.miembroDesde);

    return (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-5 lg:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
                {/* Avatar */}
                <div className="shrink-0">
                    {perfil.avatarUrl ? (
                        <img
                            src={perfil.avatarUrl}
                            alt={nombreCompleto}
                            className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover shadow-md border-2 border-white"
                        />
                    ) : (
                        <div
                            className="w-20 h-20 lg:w-24 lg:h-24 rounded-full grid place-items-center text-white font-extrabold text-2xl lg:text-3xl shadow-md"
                            style={{
                                background:
                                    'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                            }}
                        >
                            {iniciales.toUpperCase() || '?'}
                        </div>
                    )}
                </div>

                {/* Datos */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            {nombreCompleto || 'Usuario'}
                        </h1>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                        {perfil.ciudad && (
                            <>
                                <span>{perfil.ciudad}</span>
                                <span className="text-slate-400">·</span>
                            </>
                        )}
                        <span>Miembro desde {miembroDesdeTexto}</span>
                    </div>

                    {/* Inline rating chip si tiene reseñas */}
                    {perfil.ratingPromedio !== null && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border-2 border-amber-200">
                            <Star
                                className="w-4 h-4 text-amber-500 fill-amber-400"
                                strokeWidth={1.5}
                            />
                            <span className="text-base lg:text-[14px] 2xl:text-base font-bold text-amber-900 tabular-nums">
                                {perfil.ratingPromedio.toFixed(1)}
                            </span>
                            <span className="text-sm lg:text-[12px] 2xl:text-sm font-semibold text-amber-800">
                                · {perfil.totalResenas}{' '}
                                {perfil.totalResenas === 1
                                    ? 'reseña'
                                    : 'reseñas'}
                            </span>
                        </div>
                    )}
                </div>

                {/* KPIs (desktop) */}
                <div className="hidden lg:flex flex-col gap-1.5 shrink-0 min-w-[140px]">
                    <KPIBloque
                        valor={String(perfil.totalPublicacionesActivas)}
                        label={
                            perfil.totalPublicacionesActivas === 1
                                ? 'Servicio activo'
                                : 'Servicios activos'
                        }
                    />
                    {perfil.tiempoRespuestaMinutos !== null && (
                        <KPIBloque
                            valor={`~${perfil.tiempoRespuestaMinutos}m`}
                            label="Tiempo de respuesta"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function KPIBloque({ valor, label }: { valor: string; label: string }) {
    return (
        <div className="flex items-baseline gap-2 justify-end">
            <span className="text-xl font-bold text-slate-800 tabular-nums leading-none">
                {valor}
            </span>
            <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
}

// =============================================================================
// BotonTab — tab redondeado dentro del border-b
// =============================================================================

function BotonTab({
    activa,
    onClick,
    etiqueta,
    contador,
    testid,
}: {
    activa: boolean;
    onClick: () => void;
    etiqueta: string;
    contador: number;
    testid: string;
}) {
    return (
        <button
            type="button"
            data-testid={`perfil-${testid}`}
            onClick={onClick}
            className={
                'relative px-1 lg:px-2 py-3 text-base lg:text-[14px] 2xl:text-base font-bold lg:cursor-pointer transition-colors ' +
                (activa
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900')
            }
        >
            <span className="flex items-center gap-2">
                {etiqueta}
                <span
                    className={
                        'tabular-nums text-sm lg:text-[12px] 2xl:text-sm font-bold px-2 py-0.5 rounded-full ' +
                        (activa
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-700')
                    }
                >
                    {contador}
                </span>
            </span>
            {activa && (
                <span className="absolute left-0 right-0 -bottom-[2px] h-[3px] bg-sky-600 rounded-full" />
            )}
        </button>
    );
}

// =============================================================================
// SeccionPublicaciones — grid de cards de servicio
// =============================================================================

function SeccionPublicaciones({
    cargando,
    publicaciones,
    nombre,
    onClick,
}: {
    cargando: boolean;
    publicaciones: PublicacionServicio[];
    nombre: string;
    onClick: (id: string) => void;
}) {
    if (cargando) {
        return (
            <div className="py-12 flex justify-center">
                <Spinner tamanio="md" />
            </div>
        );
    }
    if (publicaciones.length === 0) {
        return (
            <EstadoVacio
                titulo="Sin servicios activos"
                mensaje={`${nombre} no tiene publicaciones activas en este momento.`}
            />
        );
    }
    return (
        <div
            data-testid="perfil-grid-publicaciones"
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"
        >
            {publicaciones.map((p) => (
                <CardSegunTipoPerfil
                    key={p.id}
                    publicacion={p}
                    onClick={() => onClick(p.id)}
                />
            ))}
        </div>
    );
}

function CardSegunTipoPerfil({
    publicacion,
    onClick,
}: {
    publicacion: PublicacionServicio;
    onClick: () => void;
}) {
    if (publicacion.tipo === 'vacante-empresa') {
        return <CardVacante publicacion={publicacion} onClick={onClick} />;
    }
    // Solicito y servicio-persona usan CardServicio
    return <CardServicio publicacion={publicacion} onClick={onClick} />;
}

// =============================================================================
// SeccionResenas — promedio destacado + lista de reseñas
// =============================================================================

function calcularDistribucion(resenas: ResenaServicio[]): Record<1 | 2 | 3 | 4 | 5, number> {
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
    };
    for (const r of resenas) {
        const k = Math.min(5, Math.max(1, Math.round(r.rating))) as
            | 1
            | 2
            | 3
            | 4
            | 5;
        dist[k]++;
    }
    return dist;
}

function SeccionResenas({
    cargando,
    resenas,
    nombre,
    ratingPromedio,
    totalResenas,
}: {
    cargando: boolean;
    resenas: ResenaServicio[];
    nombre: string;
    ratingPromedio: number | null;
    totalResenas: number;
}) {
    const distribucion = calcularDistribucion(resenas);
    const maxDist = Math.max(1, ...Object.values(distribucion));
    if (cargando) {
        return (
            <div className="py-12 flex justify-center">
                <Spinner tamanio="md" />
            </div>
        );
    }
    if (resenas.length === 0) {
        return (
            <EstadoVacio
                titulo="Aún sin reseñas"
                mensaje={`Sé el primero en contratar a ${nombre} y déjale una reseña al terminar.`}
            />
        );
    }
    return (
        <div className="space-y-5">
            {/* Promedio destacado + distribución 5★-1★ */}
            {ratingPromedio !== null && (
                <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-5 lg:p-6">
                    <div className="flex items-start gap-4 lg:gap-6">
                        <div className="text-center shrink-0">
                            <div className="text-4xl lg:text-5xl font-extrabold text-slate-900 tabular-nums leading-none">
                                {ratingPromedio.toFixed(1)}
                            </div>
                            <FilaEstrellas
                                rating={ratingPromedio}
                                tamano="md"
                                extra="justify-center mt-1.5"
                            />
                            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                                {totalResenas}{' '}
                                {totalResenas === 1 ? 'reseña' : 'reseñas'}
                            </p>
                        </div>
                        {/* Distribución de barras 5★→1★ — Sprint 7.9 */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                            {([5, 4, 3, 2, 1] as const).map((nivel) => {
                                const cant = distribucion[nivel];
                                const pct = (cant / maxDist) * 100;
                                return (
                                    <div
                                        key={nivel}
                                        className="flex items-center gap-2 text-[12px] font-semibold text-slate-700"
                                        data-testid={`distribucion-${nivel}`}
                                    >
                                        <span className="w-3 tabular-nums">
                                            {nivel}
                                        </span>
                                        <Star
                                            className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0"
                                            strokeWidth={1.5}
                                        />
                                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-[width] duration-500"
                                                style={{
                                                    width: `${pct}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-6 text-right text-slate-500 tabular-nums">
                                            {cant}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <p className="text-[12px] lg:text-[13px] text-slate-600 font-medium leading-snug mt-4 pt-3 border-t border-slate-200">
                        Basado en {totalResenas}{' '}
                        {totalResenas === 1
                            ? 'trabajo completado'
                            : 'trabajos completados'}{' '}
                        con vecinos de tu zona.
                    </p>
                </div>
            )}

            {/* Lista de reseñas */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden divide-y-2 divide-slate-200">
                {resenas.map((r) => (
                    <ItemResena key={r.id} resena={r} />
                ))}
            </div>
        </div>
    );
}

function ItemResena({ resena }: { resena: ResenaServicio }) {
    const nombre = obtenerNombreCorto(resena.autor.nombre, resena.autor.apellidos);
    const iniciales =
        (resena.autor.nombre[0] ?? '') + (resena.autor.apellidos[0] ?? '');
    const tiempo = formatearTiempoRelativo(resena.createdAt);

    return (
        <article
            data-testid={`resena-${resena.id}`}
            className="p-4 lg:p-5"
        >
            <div className="flex items-center gap-3 mb-2">
                {/* Avatar autor */}
                {resena.autor.avatarUrl ? (
                    <img
                        src={resena.autor.avatarUrl}
                        alt={nombre}
                        className="w-9 h-9 rounded-full object-cover shadow-sm border border-white"
                    />
                ) : (
                    <div
                        className="w-9 h-9 rounded-full grid place-items-center text-white font-bold text-sm shadow-sm"
                        style={{
                            background:
                                'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                        }}
                    >
                        {iniciales.toUpperCase() || '?'}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-sm lg:text-[13px] 2xl:text-sm">
                        <span className="font-bold text-slate-900">{nombre}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 font-medium">
                            {tiempo}
                        </span>
                    </div>
                    <FilaEstrellas rating={resena.rating} tamano="sm" />
                </div>
            </div>
            {resena.texto && (
                <p className="text-sm lg:text-[14px] 2xl:text-sm text-slate-700 font-medium leading-relaxed">
                    {resena.texto}
                </p>
            )}
            {resena.publicacionTitulo && (
                <div className="mt-2 text-sm lg:text-[12px] 2xl:text-sm text-slate-500 font-medium italic">
                    Sobre: {resena.publicacionTitulo}
                </div>
            )}
        </article>
    );
}

// =============================================================================
// FilaEstrellas + EstadoVacio
// =============================================================================

function FilaEstrellas({
    rating,
    tamano = 'sm',
    extra = '',
}: {
    rating: number;
    tamano?: 'sm' | 'md';
    extra?: string;
}) {
    const tam = tamano === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    return (
        <div className={`inline-flex items-center gap-0.5 ${extra}`} aria-label={`${rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((s) => {
                const lleno = s <= Math.round(rating);
                return (
                    <Star
                        key={s}
                        className={
                            tam +
                            ' ' +
                            (lleno
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300')
                        }
                        strokeWidth={1.5}
                    />
                );
            })}
        </div>
    );
}

function EstadoVacio({
    titulo,
    mensaje,
}: {
    titulo: string;
    mensaje: string;
}) {
    return (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 lg:py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-sky-50 grid place-items-center">
                <MessageCircle
                    className="w-7 h-7 text-sky-500"
                    strokeWidth={1.75}
                />
            </div>
            <h3 className="mt-4 text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                {titulo}
            </h3>
            <p className="mt-2 text-sm lg:text-[14px] 2xl:text-base text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
                {mensaje}
            </p>
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

const MESES_ES = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
];

function formatearMiembroDesde(iso: string): string {
    try {
        const d = parsearFechaPostgres(iso);
        return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return '—';
    }
}

export default PaginaPerfilPrestador;
