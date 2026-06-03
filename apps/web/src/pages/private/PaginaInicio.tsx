/**
 * PaginaInicio.tsx — Home (visión v3) · Rediseño "2 columnas"
 * ============================================================
 * Feed conversacional "Pregunta a [ciudad]".
 *   - DESKTOP (≥ lg): rail izquierdo con Coyo (mascota + burbujas + input) +
 *     feed a la derecha. El feed tiene un toggle "Comunidad · Mis preguntas"
 *     en su encabezado que filtra entre todas las preguntas y las del usuario.
 *   - MÓVIL (< lg): Coyo arriba, input + el mismo toggle en una barra sticky,
 *     feed debajo.
 *
 * El filtro "Mis preguntas" muestra las preguntas del usuario que están en el
 * feed (mismo criterio en ambas vistas). Las cerradas/ocultas no aparecen
 * (no están en el feed). El centro usa todo el ancho entre las columnas
 * laterales globales (sin max-w-7xl).
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Users, History, RefreshCcw, Inbox, Sparkles, ArrowUp, X } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useMainScrollStore } from '../../stores/useMainScrollStore';
import {
    usePreguntasComunidadLista,
    useCrearPregunta,
    usePregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useCoyoEstadoVisual } from '../../hooks/useCoyoEstadoVisual';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { AreaPreguntaCoyo, CoyoInput } from '../../components/home/AreaPreguntaCoyo';
import { CardPreguntaEditorial } from '../../components/home/CardPreguntaEditorial';
import { AdornoRailCoyo, AdornoCoyoMovil } from '../../components/home/AdornoRailCoyo';
import { FeedVacio } from '../../components/home/EstadosVacios';
import { notificar } from '../../utils/notificaciones';
import type { PreguntaComunidad } from '../../types/preguntasComunidad';

type Segmento = 'comunidad' | 'mias';

/** Hook: viewport móvil (< lg = 1024px). */
function useEsMovil(): boolean {
    const [movil, setMovil] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const on = () => setMovil(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return movil;
}

// =============================================================================
// TOGGLE Comunidad · Mis preguntas (reutilizable desktop + móvil)
// =============================================================================

function SegmentoFeed({
    segmento,
    onChange,
    className = '',
}: {
    segmento: Segmento;
    onChange: (s: Segmento) => void;
    className?: string;
}) {
    return (
        <div className={`flex gap-1 p-1 rounded-full bg-slate-200 border-2 border-slate-300 ${className}`}>
            {(
                [
                    ['comunidad', 'Comunidad', Users],
                    ['mias', 'Mis preguntas', History],
                ] as const
            ).map(([id, label, Icon]) => {
                const activo = segmento === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        data-testid={`home-segmento-${id}`}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full text-sm font-bold lg:cursor-pointer ${activo ? 'text-white shadow-sm' : 'text-slate-600'}`}
                        style={activo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                        <Icon size={15} strokeWidth={2.25} />
                        <span className="truncate">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// FEED (encabezado + lista + estados)
// =============================================================================

function FeedHeader({
    ciudad,
    segmento,
    onSegmento,
}: {
    ciudad: string;
    segmento: Segmento;
    onSegmento: (s: Segmento) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="min-w-0 text-lg lg:text-xl tracking-tight leading-tight truncate">
                <span className="font-medium text-slate-600">Pregunta a </span>
                <span className="font-bold text-slate-800">{ciudad}</span>
            </h2>
            <SegmentoFeed segmento={segmento} onChange={onSegmento} className="shrink-0" />
        </div>
    );
}

function FeedCards({ preguntas }: { preguntas: PreguntaComunidad[] }) {
    return (
        <ul className="space-y-3 lg:space-y-4" data-testid="home-feed">
            {preguntas.map((p) => (
                <CardPreguntaEditorial key={p.id} pregunta={p} />
            ))}
        </ul>
    );
}

function EstadoSinCiudad() {
    return (
        <div className="bg-white rounded-xl p-5 lg:p-6 text-center shadow-sm">
            <p className="text-sm lg:text-base font-medium text-slate-600">
                Activa tu ubicación para ver las preguntas de tu ciudad.
            </p>
        </div>
    );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="bg-white rounded-xl p-5 lg:p-6 text-center shadow-sm">
            <p className="text-sm lg:text-base font-medium text-slate-600">
                No pudimos cargar las preguntas. Revisa tu conexión.
            </p>
            <button
                type="button"
                onClick={onReintentar}
                className="mt-3 inline-flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm font-bold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
            >
                <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reintentar
            </button>
        </div>
    );
}

function EsqueletoCarga() {
    return (
        <ul className="space-y-3 lg:space-y-4" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <li key={i} className="bg-white rounded-xl p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 animate-pulse">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-slate-200" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 w-1/3 bg-slate-200 rounded" />
                            <div className="h-3 w-3/4 bg-slate-200 rounded" />
                        </div>
                    </div>
                    <div className="mt-3 h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
                </li>
            ))}
        </ul>
    );
}

/** Vacío del filtro "Mis preguntas". */
function MisPreguntasVacio() {
    return (
        <div className="flex flex-col items-center text-center py-12 lg:py-16">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-blue-200 shadow-sm mb-3">
                <Inbox size={26} strokeWidth={1.75} className="text-blue-600" />
            </span>
            <h4 className="text-base lg:text-lg font-bold text-slate-800">Todavía no preguntas nada</h4>
            <p className="mt-1 text-sm text-slate-600 font-medium max-w-xs leading-relaxed">
                Pregúntale a Coyo y tus preguntas aparecerán aquí para que sigas las respuestas.
            </p>
        </div>
    );
}

/** Decide qué pintar en la zona del feed según carga/segmento/datos. */
function ContenidoFeed({
    hayCiudad,
    feed,
    segmento,
    preguntasMostradas,
    onEnfocar,
    onUsarEjemplo,
}: {
    hayCiudad: boolean;
    feed: ReturnType<typeof usePreguntasComunidadLista>;
    segmento: Segmento;
    preguntasMostradas: PreguntaComunidad[];
    onEnfocar: () => void;
    onUsarEjemplo: (texto: string) => void;
}) {
    if (!hayCiudad) return <EstadoSinCiudad />;
    if (feed.isPending) return <EsqueletoCarga />;
    if (feed.isError) return <EstadoError onReintentar={() => feed.refetch()} />;
    if (preguntasMostradas.length === 0) {
        return segmento === 'mias' ? (
            <MisPreguntasVacio />
        ) : (
            <FeedVacio onEnfocar={onEnfocar} onUsarEjemplo={onUsarEjemplo} />
        );
    }
    return <FeedCards preguntas={preguntasMostradas} />;
}

// =============================================================================
// BLOQUE "Apareciste en esta pregunta" (deep-link de notificaciones)
// =============================================================================

// Cuando el Home se abre desde una notificación (`/inicio?preguntaId=<id>`),
// la pregunta referida se muestra DESTACADA arriba del feed, reusando la card
// real (con su Coyo, respuestas e interés). Es robusto ante paginación/ciudad:
// la pregunta se pide aparte (usePregunta) y no depende de estar en el feed.
function BloquePreguntaDestacada({
    cargando,
    error,
    pregunta,
    onCerrar,
}: {
    cargando: boolean;
    error: boolean;
    pregunta: PreguntaComunidad | null;
    onCerrar: () => void;
}) {
    return (
        <section
            aria-label="Pregunta donde apareciste"
            data-testid="home-pregunta-destacada"
            className="rounded-2xl border-2 border-indigo-300 bg-indigo-100 p-2.5 lg:p-3"
        >
            <div className="flex items-center justify-between gap-2 px-1 mb-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700">
                    <Sparkles size={16} strokeWidth={2.5} className="text-indigo-500" />
                    Apareciste en esta pregunta
                </span>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                    data-testid="home-destacada-cerrar"
                    className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-indigo-600 hover:bg-indigo-200 lg:cursor-pointer"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
            </div>

            {cargando ? (
                <div className="bg-white rounded-xl p-4 shadow-md animate-pulse">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3 w-1/3 bg-slate-200 rounded" />
                            <div className="h-3 w-3/4 bg-slate-200 rounded" />
                        </div>
                    </div>
                    <div className="mt-3 h-4 w-5/6 bg-slate-200 rounded" />
                </div>
            ) : error || !pregunta ? (
                <div className="bg-white rounded-xl p-4 shadow-md">
                    <p className="text-sm font-medium text-slate-600">
                        Esta pregunta ya no está disponible — pudo cerrarse o eliminarse.
                    </p>
                </div>
            ) : (
                <ul>
                    <CardPreguntaEditorial pregunta={pregunta} />
                </ul>
            )}
        </section>
    );
}

// =============================================================================
// BOTÓN "IR ARRIBA" (móvil) — FAB flotante para volver al inicio del feed
// =============================================================================

// Aparece al bajar (>300px) y hace smooth-scroll del contenedor <main> al top.
// Mismo patrón que el FAB de PaginaNegocios: `right-4 z-30`, sube a `5rem`
// cuando el BottomNav está visible para no quedar tapado. Solo móvil.
function BotonIrArriba() {
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);
    const { scrollY } = useScrollDirection({ scrollRef: mainScrollRef ?? undefined });
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });
    const mostrar = scrollY > 300;

    const irArriba = () => {
        const el = mainScrollRef?.current;
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return createPortal(
        <button
            type="button"
            onClick={irArriba}
            aria-label="Ir arriba"
            data-testid="home-ir-arriba"
            style={{
                bottom: bottomNavVisible ? '5rem' : '1rem',
                transition: 'bottom 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease-out',
            }}
            className={`lg:hidden fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-white shadow-lg active:scale-95 ${
                mostrar ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
            <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
        </button>,
        document.body,
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaInicio() {
    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const nombreUsuario = useAuthStore((s) => s.usuario?.nombre) ?? 'vecino';
    const ciudad = useGpsStore((s) => s.ciudad);
    const nombreCiudad = ciudad?.nombre ?? '';
    const estadoCiudad = ciudad?.estado ?? '';
    const hayCiudad = nombreCiudad.length > 0;

    const feed = usePreguntasComunidadLista();
    const crear = useCrearPregunta();

    // Deep-link de notificaciones: /inicio?preguntaId=<id> destaca esa pregunta
    // arriba del feed. Se pide aparte (no depende del feed ni de la paginación).
    //
    // El id se captura en estado LOCAL y la URL se limpia de inmediato, así el
    // card es EFÍMERO: vive solo en esta visita al Home. Si sales a otra sección
    // y regresas (por logo o "atrás"), o recargas, ya no reaparece — la URL
    // quedó en `/inicio` sin query. El effect observa `searchParams` para
    // capturar también una notificación nueva abierta sin salir del Home.
    const [searchParams, setSearchParams] = useSearchParams();
    const [preguntaIdDestacada, setPreguntaIdDestacada] = useState('');
    const preguntaDestacada = usePregunta(preguntaIdDestacada);
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);

    useEffect(() => {
        const id = searchParams.get('preguntaId');
        if (!id) return;
        setPreguntaIdDestacada(id);
        const next = new URLSearchParams(searchParams);
        next.delete('preguntaId');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const cerrarDestacada = () => setPreguntaIdDestacada('');

    // Al capturar un preguntaId (desde una notificación) sube el feed al tope
    // para que el bloque destacado quede a la vista.
    useEffect(() => {
        if (!preguntaIdDestacada) return;
        const el = mainScrollRef?.current;
        if (el) el.scrollTo({ top: 0 });
        else window.scrollTo({ top: 0 });
    }, [preguntaIdDestacada, mainScrollRef]);

    const [texto, setTexto] = useState('');
    const [segmento, setSegmento] = useState<Segmento>('comunidad');

    const estadoCoyoVisual = useCoyoEstadoVisual({
        usuarioId,
        textoInput: texto,
        crearPendiente: crear.isPending,
        preguntas: feed.data,
    });

    const puedeEnviar = texto.trim().length > 0 && hayCiudad && !crear.isPending;

    const handleEnviar = () => {
        if (!puedeEnviar) return;
        crear.mutate(
            { texto: texto.trim(), ciudad: nombreCiudad, estado: estadoCiudad },
            {
                onSuccess: () => setTexto(''),
                onError: (err) =>
                    notificar.error(
                        err instanceof Error ? err.message : 'No se pudo publicar la pregunta',
                    ),
            },
        );
    };

    // Preguntas a mostrar según el segmento. "Mis preguntas" = las del usuario
    // presentes en el feed (mismo criterio desktop/móvil).
    const preguntas = useMemo(() => feed.data ?? [], [feed.data]);
    const misEnFeed = useMemo(
        () => preguntas.filter((p) => !!usuarioId && p.autorId === usuarioId),
        [preguntas, usuarioId],
    );
    // Evita duplicar la pregunta destacada si también está en el feed. Al
    // cerrar el destacado (preguntaIdDestacada vacío) reaparece en su lugar.
    const preguntasMostradas = useMemo(() => {
        const base = segmento === 'mias' ? misEnFeed : preguntas;
        return preguntaIdDestacada
            ? base.filter((p) => p.id !== preguntaIdDestacada)
            : base;
    }, [segmento, misEnFeed, preguntas, preguntaIdDestacada]);

    const esMovil = useEsMovil();

    // Bloque destacado de la pregunta del deep-link (se monta arriba del feed en
    // ambos layouts). Solo cuando hay preguntaId en la URL.
    const bloqueDestacado = preguntaIdDestacada ? (
        <BloquePreguntaDestacada
            cargando={preguntaDestacada.isPending}
            error={preguntaDestacada.isError}
            pregunta={preguntaDestacada.data ?? null}
            onCerrar={cerrarDestacada}
        />
    ) : null;

    // Enfoca el input de Coyo (botón "Hacer la primera pregunta" del vacío).
    const enfocarInput = () => {
        const el = document.getElementById(
            esMovil ? 'coyo-input-movil' : 'coyo-input',
        ) as HTMLInputElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
    };
    // Precarga un ejemplo en el input (estado React) y lo enfoca (chips del vacío).
    const usarEjemplo = (t: string) => {
        setTexto(t);
        setTimeout(enfocarInput, 0);
    };

    // ── MÓVIL ────────────────────────────────────────────────────────────
    if (esMovil) {
        return (
            <div className="w-full max-w-[520px] mx-auto px-4 py-3">
                {/* Coyo protagonista (scrollea) — sin input (va sticky abajo).
                    Adorno (huellitas + cueva + sparkles) detrás de la mascota.
                    `-mx-4` rompe el padding del contenedor para que la cueva
                    llegue a la orilla; el contenido recupera el padding con
                    `px-4`. */}
                <div className="relative overflow-hidden -mx-4 pt-1 pb-4">
                    <AdornoCoyoMovil className="absolute inset-0 pointer-events-none" />
                    <div className="relative z-10 px-4">
                        <AreaPreguntaCoyo
                            nombreUsuario={nombreUsuario}
                            estadoCoyo={estadoCoyoVisual}
                            conInput={false}
                        />
                    </div>
                </div>

                {/* Barra sticky: label + input compacto + segmento */}
                <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-2.5 backdrop-blur-sm space-y-2">
                    <p className="flex items-center gap-2 pl-1 text-sm font-bold text-slate-600">
                        <Sparkles size={16} strokeWidth={2.5} className="text-amber-500" /> Pregúntale a Coyo
                    </p>
                    <CoyoInput
                        id="coyo-input-movil"
                        compact
                        texto={texto}
                        onTextoChange={setTexto}
                        onEnviar={handleEnviar}
                        enviando={crear.isPending}
                        puedeEnviar={puedeEnviar}
                        placeholder={hayCiudad ? 'Escribe lo que buscas…' : 'Activa tu ubicación para preguntar'}
                    />
                    <SegmentoFeed segmento={segmento} onChange={setSegmento} className="w-full" />
                </div>

                {/* Contenido según segmento */}
                <div className="pt-4 space-y-4">
                    {bloqueDestacado}
                    <ContenidoFeed
                        hayCiudad={hayCiudad}
                        feed={feed}
                        segmento={segmento}
                        preguntasMostradas={preguntasMostradas}
                        onEnfocar={enfocarInput}
                        onUsarEjemplo={usarEjemplo}
                    />
                </div>

                <BotonIrArriba />
            </div>
        );
    }

    // ── DESKTOP ──────────────────────────────────────────────────────────
    return (
        <div className="w-full px-4 lg:px-5 2xl:px-6 py-4 lg:py-6">
            <div className="flex flex-col lg:flex-row lg:justify-center gap-5 2xl:gap-7 items-start">
                {/* Rail izquierdo: Coyo (mascota + burbujas + input) alineado
                    arriba + adorno decorativo (huellitas + pin) anclado a la
                    base para llenar el espacio inferior. */}
                <div className="w-full lg:w-[336px] 2xl:w-[412px] shrink-0 self-start lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:flex lg:flex-col lg:justify-start lg:pt-4 relative overflow-hidden">
                    <AdornoRailCoyo className="hidden lg:block absolute inset-0 pointer-events-none" />
                    <div className="relative z-10">
                        <AreaPreguntaCoyo
                            nombreUsuario={nombreUsuario}
                            estadoCoyo={estadoCoyoVisual}
                            hayCiudad={hayCiudad}
                            texto={texto}
                            onTextoChange={setTexto}
                            onEnviar={handleEnviar}
                            enviando={crear.isPending}
                            puedeEnviar={puedeEnviar}
                        />
                    </div>
                </div>

                {/* Feed */}
                <div className="w-full min-w-0 flex-1 lg:max-w-[760px]">
                    <div className="w-full space-y-3 lg:space-y-4">
                        {bloqueDestacado}
                        <FeedHeader ciudad={nombreCiudad} segmento={segmento} onSegmento={setSegmento} />
                        <ContenidoFeed
                            hayCiudad={hayCiudad}
                            feed={feed}
                            segmento={segmento}
                            preguntasMostradas={preguntasMostradas}
                            onEnfocar={enfocarInput}
                            onUsarEjemplo={usarEjemplo}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaginaInicio;
