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

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Users, History, RefreshCcw, Inbox, Sparkles, ArrowUp, X } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useMainScrollStore } from '../../stores/useMainScrollStore';
import {
    usePreguntasComunidadLista,
    useMisPreguntasLista,
    useCrearPregunta,
    usePregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useCoyoEstadoVisual } from '../../hooks/useCoyoEstadoVisual';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { CoyoInput } from '../../components/home/AreaPreguntaCoyo';
import { CardPreguntaEditorial } from '../../components/home/CardPreguntaEditorial';
import { EscenaCoyo } from '../../components/home/escena-coyo/EscenaCoyo';
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
    conteos,
}: {
    segmento: Segmento;
    onChange: (s: Segmento) => void;
    className?: string;
    /** Número de publicaciones por segmento — se muestra como badge en cada botón. */
    conteos?: { comunidad: number; mias: number };
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
                const conteo = conteos ? conteos[id] : undefined;
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
                        {typeof conteo === 'number' && conteo > 0 && (
                            <span
                                data-testid={`home-segmento-badge-${id}`}
                                className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold ${activo ? 'bg-white/25 text-white' : 'bg-slate-300 text-slate-700'}`}
                            >
                                {conteo > 99 ? '99+' : conteo}
                            </span>
                        )}
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
    conteos,
}: {
    ciudad: string;
    segmento: Segmento;
    onSegmento: (s: Segmento) => void;
    conteos?: { comunidad: number; mias: number };
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="min-w-0 text-lg lg:text-xl tracking-tight leading-tight truncate">
                {segmento === 'mias' ? (
                    <>
                        <span className="font-medium text-slate-600">Mis </span>
                        <span className="font-bold text-slate-800">preguntas</span>
                    </>
                ) : (
                    <>
                        <span className="font-bold text-slate-800">{ciudad}</span>
                        <span className="font-medium text-slate-600"> pregunta</span>
                    </>
                )}
            </h2>
            <SegmentoFeed segmento={segmento} onChange={onSegmento} className="shrink-0" conteos={conteos} />
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
// INDICADOR DE REFRESCO — huellitas de Coyo caminando (pull móvil + auto PC)
// =============================================================================

// Fila de pisadas de Coyo (la misma pata azul del adorno del rail) que aparecen
// en secuencia (`.huella-paso`) dando el efecto de "caminando". Entra/sale con
// altura + opacidad (no se corta de golpe). Móvil: el carril sigue el jalón.
// PC: altura fija mientras refresca.
function IndicadorHuellitas({
    visible,
    altura,
    sinTransicion,
}: {
    /** Si debe mostrarse (controla altura/opacidad para la animación de salida). */
    visible: boolean;
    /** Altura del carril (px). Móvil: sigue el jalón. PC: fijo. */
    altura: number;
    /** Sin transición mientras el dedo jala (para que siga el dedo en vivo). */
    sinTransicion: boolean;
}) {
    return (
        <div
            className="flex items-center justify-center overflow-hidden"
            style={{
                height: visible ? altura : 0,
                transition: sinTransicion
                    ? 'none'
                    : 'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            aria-hidden="true"
        >
            <div
                className="flex items-center gap-1.5"
                style={{
                    opacity: visible ? 1 : 0,
                    transition: sinTransicion ? 'none' : 'opacity 200ms ease-out',
                }}
            >
                {[0, 1, 2, 3].map((i) => (
                    <svg
                        key={i}
                        viewBox="-14 -14 28 28"
                        className="w-8 h-8 huella-paso"
                        style={{ animationDelay: `${i * 0.14}s` }}
                        fill="#d97534"
                    >
                        <ellipse cx="0" cy="5.5" rx="5.6" ry="7" />
                        <circle cx="-5.6" cy="-3.2" r="2.3" />
                        <circle cx="-1.9" cy="-6.6" r="2.3" />
                        <circle cx="1.9" cy="-6.6" r="2.3" />
                        <circle cx="5.6" cy="-3.2" r="2.3" />
                    </svg>
                ))}
            </div>
        </div>
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

    // El feed es useInfiniteQuery → aplanamos sus páginas a un solo array.
    const preguntas = useMemo(
        () => feed.data?.pages.flatMap((p) => p.preguntas) ?? [],
        [feed.data],
    );

    // Vista "Mis preguntas": historial completo del usuario (su propio fetch
    // paginado, todos los estados). Habilitado siempre para que el badge del
    // toggle tenga el total real desde que carga el Home.
    const misPreguntasQuery = useMisPreguntasLista();
    const misPreguntasData = useMemo(
        () => misPreguntasQuery.data?.pages.flatMap((p) => p.preguntas) ?? [],
        [misPreguntasQuery.data],
    );

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
    // Refs para el auto-scroll móvil a la pregunta recién enviada.
    const barraStickyRef = useRef<HTMLDivElement>(null);
    const feedMovilRef = useRef<HTMLDivElement>(null);
    // Scrollea un elemento hasta JUSTO debajo de la barra sticky (mide su alto
    // real, así no lo tapa). Opera sobre el <main> scrolleable; cae a
    // scrollIntoView si no existe.
    const scrollAVer = (el: HTMLElement, comportamiento: ScrollBehavior = 'smooth') => {
        const scroller = mainScrollRef?.current;
        const offsetBarra = (barraStickyRef.current?.offsetHeight ?? 0) + 8;
        if (!scroller) {
            el.scrollIntoView({ behavior: comportamiento, block: 'start' });
            return;
        }
        const rectEl = el.getBoundingClientRect();
        const rectScroller = scroller.getBoundingClientRect();
        const top = scroller.scrollTop + (rectEl.top - rectScroller.top) - offsetBarra;
        scroller.scrollTo({ top: Math.max(0, top), behavior: comportamiento });
    };

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
    // Suprime el indicador de refresco mientras se publica una pregunta: la
    // mutación invalida el feed → dispara un refetch (isRefetching=true) que
    // NO es un "refresh" sino la consecuencia de publicar. Sin esto, al
    // publicar aparecería el spinner de refresco junto a la pregunta nueva.
    const [publicandoPregunta, setPublicandoPregunta] = useState(false);

    const estadoCoyoVisual = useCoyoEstadoVisual({
        usuarioId,
        textoInput: texto,
        crearPendiente: crear.isPending,
        preguntas,
    });

    const puedeEnviar = texto.trim().length > 0 && hayCiudad && !crear.isPending;

    const handleEnviar = () => {
        if (!puedeEnviar) return;
        setPublicandoPregunta(true);
        // Móvil: baja de INMEDIATO a la zona del feed (donde caerá la pregunta)
        // al presionar enviar, sin esperar la respuesta del backend. El ajuste
        // fino al card exacto lo hace el efecto de `preguntaRecienId`.
        if (esMovil && feedMovilRef.current) {
            scrollAVer(feedMovilRef.current);
        }
        crear.mutate(
            { texto: texto.trim(), ciudad: nombreCiudad, estado: estadoCiudad },
            {
                onSuccess: (data) => {
                    setTexto('');
                    // Móvil: el input está arriba y la pregunta cae en el feed
                    // de abajo → marcamos su id para auto-scrollear hacia ella.
                    if (esMovil) setPreguntaRecienId(data?.id ?? null);
                },
                onError: (err) =>
                    notificar.error(
                        err instanceof Error ? err.message : 'No se pudo publicar la pregunta',
                    ),
                onSettled: () => {
                    // El feed se invalida en onSuccess → refetchea después. Se
                    // mantiene la supresión un momento para cubrir ese refetch,
                    // así el indicador de refresco no aparece al publicar.
                    setTimeout(() => setPublicandoPregunta(false), 2000);
                },
            },
        );
    };

    // Preguntas a mostrar según el segmento. "Mis preguntas" = las del usuario
    // presentes en el feed (mismo criterio desktop/móvil).
    // Lista según el segmento: Comunidad = feed por ciudad (sin la pregunta
    // destacada para no duplicarla); Mis preguntas = historial propio completo.
    const preguntasMostradas = useMemo(() => {
        if (segmento === 'mias') return misPreguntasData;
        return preguntaIdDestacada
            ? preguntas.filter((p) => p.id !== preguntaIdDestacada)
            : preguntas;
    }, [segmento, misPreguntasData, preguntas, preguntaIdDestacada]);

    // Conteos del badge del toggle: ambos son el total REAL del backend.
    const totalComunidad = feed.data?.pages[0]?.total ?? 0;
    const totalMias = misPreguntasQuery.data?.pages[0]?.total ?? 0;
    const conteosSegmento = { comunidad: totalComunidad, mias: totalMias };

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

    // ── Scroll infinito ──────────────────────────────────────────────────
    // Sentinel al final del feed + IntersectionObserver: cuando entra al
    // viewport y hay más páginas, pide la siguiente. Auto-load en PC y móvil
    // (el Home es un feed tipo Facebook, no un grid). Solo en "Comunidad"
    // (Mis preguntas es un filtro cliente sobre lo ya cargado). El root es el
    // <main> scrolleable cuando existe; si no, el viewport.
    // Query del segmento activo: el scroll infinito, el refresh y el sentinel
    // operan sobre Comunidad o Mis preguntas según el toggle.
    const queryActivo = segmento === 'mias' ? misPreguntasQuery : feed;
    const sentinelaRef = useRef<HTMLDivElement | null>(null);
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = queryActivo;
    useEffect(() => {
        const el = sentinelaRef.current;
        if (!el || !hasNextPage) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            // rootMargin grande = carga ANTICIPADA: dispara ~1200px (≈1-2
            // pantallas) antes de llegar al final, para que las nuevas cards
            // ya estén listas cuando el usuario llega ahí (sin tirón).
            { root: mainScrollRef?.current ?? null, rootMargin: '1200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, mainScrollRef, segmento]);

    const sentinelFeed = (
        <>
            <div ref={sentinelaRef} aria-hidden="true" className="h-1" />
            {isFetchingNextPage && (
                <div className="flex justify-center py-4" data-testid="home-cargando-mas">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                </div>
            )}
        </>
    );

    // ── Input sticky (móvil) ─────────────────────────────────────────────
    // El input vive DENTRO de la escena hero. Al scrollear hacia abajo y salir
    // de vista, reaparece pegado arriba (barra sticky). Observamos el propio
    // input del hero (#coyo-input-movil): mientras se vea, sticky oculto.
    const [mostrarInputSticky, setMostrarInputSticky] = useState(false);
    useEffect(() => {
        if (!esMovil) {
            setMostrarInputSticky(false);
            return;
        }
        const el = document.getElementById('coyo-input-movil');
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setMostrarInputSticky(!entry.isIntersecting),
            { root: mainScrollRef?.current ?? null },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [esMovil, mainScrollRef]);

    // ── Auto-scroll a la pregunta recién enviada (móvil) ─────────────────
    // 1) Al enviar, centra el card nuevo (Coyo "pensando") en la vista.
    // 2) Un ResizeObserver re-scrollea cuando el card crece (llega la
    //    respuesta de Coyo) para que no quede cortado. Se desengancha solo.
    const [preguntaRecienId, setPreguntaRecienId] = useState<string | null>(null);
    useEffect(() => {
        if (!esMovil || !preguntaRecienId) return;
        let cancelado = false;
        let ro: ResizeObserver | null = null;
        const timers: number[] = [];
        let intentos = 0;

        const enganchar = () => {
            if (cancelado) return;
            const el = document.getElementById(`feed-${preguntaRecienId}`);
            if (!el) {
                // El card aún no está en el DOM (el feed refetchea): reintenta.
                if (intentos++ < 40) timers.push(window.setTimeout(enganchar, 60));
                return;
            }
            // Ajuste fino: lleva el card a justo debajo de la barra sticky
            // (alto medido), así "Coyo está pensando" queda visible completo.
            scrollAVer(el);
            ro = new ResizeObserver(() => {
                if (cancelado) return;
                // Al crecer con la respuesta, re-encuadra el card.
                scrollAVer(el);
            });
            ro.observe(el);
            // Tras un rato la respuesta ya llegó: dejamos de seguir el card.
            timers.push(window.setTimeout(() => {
                ro?.disconnect();
                setPreguntaRecienId(null);
            }, 30000));
        };
        enganchar();

        return () => {
            cancelado = true;
            timers.forEach((t) => window.clearTimeout(t));
            ro?.disconnect();
        };
    }, [esMovil, preguntaRecienId]);

    // ── Refresh tipo Facebook ────────────────────────────────────────────
    // Móvil: pull-to-refresh (gesto) → feed.refetch().
    // PC: NO forzamos refetch en cada entrada (sería un request por visita).
    // Dejamos que React Query refetchee al montar SOLO si los datos están
    // viejos (staleTime 2 min — proxy de "probablemente cambiaron") y al
    // volver a la pestaña (refetchOnWindowFocus, ya activo en el hook). El
    // spinner de PC se muestra cuando ese refetch ocurre (isRefetching).
    // Bandera del pull: se enciende al disparar el refresco por gesto y se
    // apaga cuando el refetch del feed termina (isRefetching true→false). Así
    // las huellitas "caminan" tras soltar SOLO cuando el refresco fue por pull
    // (no en el auto-refresh de entrada).
    const [refrescoPorPull, setRefrescoPorPull] = useState(false);
    const pull = usePullToRefresh({
        onRefresh: () => {
            setRefrescoPorPull(true);
            return queryActivo.refetch();
        },
        scrollRef: mainScrollRef,
        habilitado: esMovil,
    });

    const refetchingPrevRef = useRef(false);
    useEffect(() => {
        const ahora = queryActivo.isRefetching;
        if (refetchingPrevRef.current && !ahora) setRefrescoPorPull(false);
        refetchingPrevRef.current = ahora;
    }, [queryActivo.isRefetching]);

    // Indicador del jalón (móvil): huellitas que aparecen mientras el dedo jala
    // (siguen el jalón) y siguen "caminando" mientras el feed refresca por ese
    // pull. Imposible que se quede pegado: depende del dedo (gestoActivo) y del
    // estado real del refetch (isRefetching), ambos se apagan solos.
    const caminandoPull = refrescoPorPull && queryActivo.isRefetching;
    const indicadorPull = (
        <IndicadorHuellitas
            visible={(pull.gestoActivo && pull.distancia > 0) || caminandoPull}
            altura={caminandoPull ? 52 : pull.distancia}
            sinTransicion={pull.gestoActivo}
        />
    );

    // Indicador de refresco en PC: huellitas caminando mientras refetchea (al
    // entrar o al volver a la pestaña), sin contar carga de más páginas ni la
    // publicación de una pregunta.
    const indicadorRefrescoPc = (
        <div data-testid="home-refrescando">
            <IndicadorHuellitas
                visible={queryActivo.isRefetching && !isFetchingNextPage && !publicandoPregunta}
                altura={52}
                sinTransicion={false}
            />
        </div>
    );

    // ── MÓVIL ────────────────────────────────────────────────────────────
    if (esMovil) {
        return (
            <div className="w-full max-w-[520px] mx-auto px-4 pb-3">
                {indicadorPull}
                {/* HERO: escena "Casa de Coyo" completa CON input dentro (igual
                    que PC). `-mx-4 -mt-px` para que la escena llegue a la orilla
                    y pegue al header (sin franja del fondo de la página). El
                    input lleva id 'coyo-input-movil' (enfoque + observer sticky). */}
                <div className="relative overflow-hidden -mx-4 -mt-px">
                    <EscenaCoyo
                        compact
                        nombreUsuario={nombreUsuario}
                        estadoCoyo={estadoCoyoVisual}
                        hayCiudad={hayCiudad}
                        idInput="coyo-input-movil"
                        texto={texto}
                        onTextoChange={setTexto}
                        onEnviar={handleEnviar}
                        enviando={crear.isPending}
                        puedeEnviar={puedeEnviar}
                    />
                </div>

                {/* Barra sticky: el toggle siempre pegado; el input se DESLIZA
                    hacia abajo (grid 0fr→1fr + opacity) cuando el de la escena
                    sale de vista al scrollear — se ve como un mismo input que
                    baja, no como uno nuevo que aparece de golpe. */}
                <div ref={barraStickyRef} className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-2.5 backdrop-blur-sm">
                    <div
                        className="grid transition-all duration-200 ease-out"
                        style={{
                            gridTemplateRows: mostrarInputSticky ? '1fr' : '0fr',
                            opacity: mostrarInputSticky ? 1 : 0,
                        }}
                        aria-hidden={!mostrarInputSticky}
                    >
                        <div className="overflow-hidden pb-2">
                            <CoyoInput
                                id="coyo-input-movil-sticky"
                                compact
                                texto={texto}
                                onTextoChange={setTexto}
                                onEnviar={handleEnviar}
                                enviando={crear.isPending}
                                puedeEnviar={puedeEnviar}
                                placeholder={hayCiudad ? 'Escribe lo que buscas…' : 'Activa tu ubicación para preguntar'}
                            />
                        </div>
                    </div>
                    <SegmentoFeed segmento={segmento} onChange={setSegmento} className="w-full" conteos={conteosSegmento} />
                </div>

                {/* Contenido según segmento */}
                <div ref={feedMovilRef} className="pt-4 space-y-4 scroll-mt-28">
                    {bloqueDestacado}
                    <ContenidoFeed
                        hayCiudad={segmento === 'mias' || hayCiudad}
                        feed={queryActivo}
                        segmento={segmento}
                        preguntasMostradas={preguntasMostradas}
                        onEnfocar={enfocarInput}
                        onUsarEjemplo={usarEjemplo}
                    />
                    {sentinelFeed}
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
                <div className="w-full lg:w-[336px] 2xl:w-[412px] shrink-0 self-start lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
                    <EscenaCoyo
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

                {/* Feed */}
                <div className="w-full min-w-0 flex-1 lg:max-w-[760px]">
                    <div className="w-full space-y-3 lg:space-y-4">
                        {bloqueDestacado}
                        <FeedHeader ciudad={nombreCiudad} segmento={segmento} onSegmento={setSegmento} conteos={conteosSegmento} />
                        {indicadorRefrescoPc}
                        <ContenidoFeed
                            hayCiudad={segmento === 'mias' || hayCiudad}
                            feed={queryActivo}
                            segmento={segmento}
                            preguntasMostradas={preguntasMostradas}
                            onEnfocar={enfocarInput}
                            onUsarEjemplo={usarEjemplo}
                        />
                        {sentinelFeed}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaginaInicio;
