/**
 * PaginaInicio.tsx — Home (visión v3)
 * ====================================
 * Feed conversacional "Pregúntale a [Ciudad]" — diseño "Coyo te habla
 * (bubble)": Coyo a la izquierda + globo de diálogo con el saludo y la
 * invitación, debajo el input para preguntar y el feed de la comunidad.
 *
 * Datos en vivo del backend (hooks de React Query):
 *   - usePreguntasComunidadLista() → feed de la ciudad activa del useGpsStore
 *   - useCrearPregunta()           → publicar + invalidar feed
 *   - useEstadoCoyo(id, estado)    → sondea cada 2s mientras Coyo procesa
 *
 * Cada CardPregunta tiene un bloque "Coyo encontró esto para ti" que se
 * enciende según el estadoCoyo de la pregunta:
 *   - pendiente/procesando → "Coyo está pensando…" con spinner
 *   - listo                → respuestaCoyo + tarjetas agrupadas por tipo
 *   - no_aplica            → solo el texto de redirección amable
 *   - sin_respuesta        → mensaje normal "Esperando respuestas de la comunidad"
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchStore } from '../../stores/useSearchStore';
import {
    Send,
    Loader2,
    Sparkles,
    Users,
    Inbox,
    RefreshCcw,
    Star,
    BadgeCheck,
    Clock,
    CheckCircle2,
    ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import {
    usePreguntasComunidadLista,
    useCrearPregunta,
    useEstadoCoyo,
} from '../../hooks/queries/usePreguntasComunidad';
import { useCoyoEstadoVisual } from '../../hooks/useCoyoEstadoVisual';
import { CoyoAnimado, type EstadoCoyoVisual } from '../../components/CoyoAnimado';
import { BotonInteresComunidad } from '../../components/home/BotonInteresComunidad';
import { RespuestasComunidad } from '../../components/home/RespuestasComunidad';
import { MenuAutorPregunta } from '../../components/home/MenuAutorPregunta';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type {
    PreguntaComunidad,
    EstadoCoyo,
    ResultadosCoyo,
    GrupoCoyo,
    ItemCoyo,
    TipoItemCoyo,
} from '../../types/preguntasComunidad';

// =============================================================================
// CONSTANTES
// =============================================================================

const TEXTO_MAX = 500;
const MS_24H = 24 * 60 * 60 * 1000;

// =============================================================================
// HELPERS DE NAVEGACIÓN (Sprint 2.A)
// =============================================================================

/**
 * Construye la ruta del DETALLE de un item recomendado por Coyo. Se usa al
 * hacer click en una tarjeta del bloque "Coyo encontró esto para ti".
 *
 * Convención por tipo:
 *   - negocio     → /negocios/:sucursalId            (item.id = sucursalId)
 *   - oferta      → /ofertas?oferta=:ofertaId         (deep link a la oferta;
 *                   la sección Ofertas detecta el query y abre el detalle
 *                   automáticamente)
 *   - marketplace → /marketplace/articulo/:articuloId
 *   - servicio    → /servicios/:publicacionId
 */
function rutaDetalleItemCoyo(item: ItemCoyo): string {
    switch (item.tipo) {
        case 'negocio':
            return `/negocios/${item.id}`;
        case 'oferta':
            return `/ofertas?oferta=${item.id}`;
        case 'marketplace':
            return `/marketplace/articulo/${item.id}`;
        case 'servicio':
            return `/servicios/${item.id}`;
    }
}

/**
 * Ruta de la SECCIÓN completa para "Ver los N resultados" cuando Coyo trae
 * más items de los 3 que muestra inline. La sección lee el `useSearchStore`
 * para aplicar el query de la pregunta como filtro inicial.
 */
function rutaSeccionCoyo(tipo: TipoItemCoyo): string {
    switch (tipo) {
        case 'negocio':
            return '/negocios';
        case 'oferta':
            return '/ofertas';
        case 'marketplace':
            return '/marketplace';
        case 'servicio':
            return '/servicios';
    }
}

/** Nombre humano de cada sección para el link "Ver más". */
function nombreSeccionCoyo(tipo: TipoItemCoyo): string {
    switch (tipo) {
        case 'negocio':
            return 'Negocios';
        case 'oferta':
            return 'Ofertas';
        case 'marketplace':
            return 'MarketPlace';
        case 'servicio':
            return 'Servicios';
    }
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

    const feed = usePreguntasComunidadLista();
    const crear = useCrearPregunta();

    const [texto, setTexto] = useState('');

    // Estado visual de Coyo (idle | saludo | atento | pensando | respondiendo).
    // Se calcula a partir del estado de la app: saludo al cargar, atento
    // cuando el usuario escribe, pensando cuando hay pregunta del usuario
    // procesando, respondiendo cuando recién llegó respuesta de Coyo.
    const estadoCoyoVisual = useCoyoEstadoVisual({
        usuarioId,
        textoInput: texto,
        crearPendiente: crear.isPending,
        preguntas: feed.data,
    });

    // "X vecinos preguntando hoy" — autores únicos con preguntas en las
    // últimas 24h. Calculado del feed actual (no hay endpoint dedicado aún).
    // Cuando el backend exponga un contador real, sustituir.
    const vecinosHoy = useMemo(() => {
        const preguntas = feed.data ?? [];
        const ahora = Date.now();
        const autores = new Set<string>();
        for (const p of preguntas) {
            try {
                if (ahora - new Date(p.createdAt).getTime() < MS_24H) {
                    autores.add(p.autorId);
                }
            } catch {
                // fecha inválida → ignorar
            }
        }
        return autores.size;
    }, [feed.data]);

    const puedeEnviar =
        texto.trim().length > 0 && nombreCiudad.length > 0 && !crear.isPending;

    const handleEnviar = () => {
        if (!puedeEnviar) return;
        crear.mutate(
            { texto: texto.trim(), ciudad: nombreCiudad, estado: estadoCiudad },
            {
                onSuccess: () => {
                    setTexto('');
                },
                onError: (err) => {
                    const mensaje =
                        err instanceof Error
                            ? err.message
                            : 'No se pudo publicar la pregunta';
                    notificar.error(mensaje);
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-8">
                <HeroBubble
                    nombreUsuario={nombreUsuario}
                    nombreCiudad={nombreCiudad}
                    texto={texto}
                    onTextoChange={setTexto}
                    onEnviar={handleEnviar}
                    enviando={crear.isPending}
                    puedeEnviar={puedeEnviar}
                    vecinosHoy={vecinosHoy}
                    estadoCoyo={estadoCoyoVisual}
                />

                <SeccionFeed feed={feed} nombreCiudad={nombreCiudad} />
            </div>
        </div>
    );
}

export default PaginaInicio;

// =============================================================================
// HERO BUBBLE — Coyo grande + bocadillo con cola + input + stat
//
// Apariencia calcada de `Hero Home/propuestas/hero-1-bubble.html`.
// Desktop: layout horizontal (Coyo a la izquierda, columna a la derecha) con
// cola del bocadillo apuntando a Coyo y dos burbujitas decorativas.
// Mobile: layout vertical (Coyo arriba, columna debajo); cola y burbujitas se
// ocultan porque no apuntarían a nada al estar Coyo encima.
// =============================================================================

interface HeroBubbleProps {
    nombreUsuario: string;
    nombreCiudad: string;
    texto: string;
    onTextoChange: (v: string) => void;
    onEnviar: () => void;
    enviando: boolean;
    puedeEnviar: boolean;
    vecinosHoy: number;
    estadoCoyo: EstadoCoyoVisual;
}

function HeroBubble({
    nombreUsuario,
    nombreCiudad,
    texto,
    onTextoChange,
    onEnviar,
    enviando,
    puedeEnviar,
    vecinosHoy,
    estadoCoyo,
}: HeroBubbleProps) {
    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onEnviar();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onEnviar();
        }
    };

    return (
        <section className="flex flex-col items-center lg:flex-row lg:items-start lg:justify-star gap-3 ml-14">
            {/* Coyo — animación Rive con state machine. Reacciona al estado
                de la app: saludo al cargar, atento al escribir, pensando
                mientras Gemini procesa, respondiendo cuando llega la respuesta.
                Si `coyo.riv` no carga, Rive deja un canvas vacío (la UI no se
                rompe; el flujo del Home sigue funcionando sin la mascota). */}
            <CoyoAnimado
                estado={estadoCoyo}
                alt="Coyo, asistente de AnunciaYA"
                className="shrink-0 h-56 lg:h-80 w-72 lg:w-120 select-none overflow-visible relative z-10 lg:-mr-12 lg:-ml-16"
                style={{ filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.15))' }}
            />

            {/* Columna derecha: bocadillo + label+input + stat */}
            <div className="w-full lg:w-140 min-w-0 flex flex-col gap-4 ">
                {/* Bocadillo */}
                <div
                    className="relative bg-white border-[3px] border-blue-200 rounded-3xl px-5 py-4 lg:px-6 lg:py-5 space-y-2"
                    style={{
                        boxShadow:
                            '0 10px 28px rgba(37, 99, 235, 0.10), 0 2px 4px rgba(15, 23, 42, 0.06)',
                    }}
                >
                    {/* Cola apuntando a la boca de Coyo (solo desktop) */}
                    <svg
                        aria-hidden="true"
                        className="hidden lg:block absolute pointer-events-none"
                        style={{ left: '-23px', top: '42px', width: '26px', height: '32px' }}
                        viewBox="0 0 26 32"
                        fill="none"
                    >
                        <polygon points="26,0 0,16 26,32" fill="#bfdbfe" />
                        <polygon points="26,4 7,16 26,28" fill="white" />
                    </svg>

                    {/* Burbujitas decorativas (solo desktop) */}
                    <span
                        aria-hidden="true"
                        className="hidden lg:block absolute w-2.5 h-2.5 rounded-full bg-blue-200 ring-[3px] ring-white"
                        style={{ left: '-34px', top: '36px' }}
                    />
                    <span
                        aria-hidden="true"
                        className="hidden lg:block absolute w-1.5 h-1.5 rounded-full bg-blue-200 ring-2 ring-white"
                        style={{ left: '-46px', top: '26px' }}
                    />

                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-none">
                        ¡Hola, <span className="text-blue-600">{nombreUsuario}</span>!
                    </h1>
                    <p className="text-lg lg:text-xl text-slate-700 font-semibold leading-snug">
                        ¿Qué andas buscando hoy?
                    </p>
                    <p className="text-lg lg:text-xl text-slate-500 font-medium leading-snug">
                        Pregúntame y te ayudo al instante.
                    </p>
                </div>

                {/* Label + input agrupados */}
                <div className="space-y-2">
                    <p className="ml-1 flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Sparkles
                            className="w-4 h-4 text-amber-500"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Pregúntale a Coyo
                    </p>

                    <form onSubmit={onSubmit} className="flex items-center gap-2.5">
                        <div
                            className="flex-1 min-w-0 flex items-center h-12 bg-slate-100 rounded-xl px-4 border-2 border-slate-300"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}
                        >
                            <input
                                type="text"
                                value={texto}
                                onChange={(e) =>
                                    onTextoChange(e.target.value.slice(0, TEXTO_MAX))
                                }
                                onKeyDown={onKeyDown}
                                placeholder={
                                    nombreCiudad
                                        ? `¿Algún plomero por la colonia centro?`
                                        : 'Activa tu ubicación para preguntar'
                                }
                                disabled={!nombreCiudad || enviando}
                                maxLength={TEXTO_MAX}
                                aria-label="Tu pregunta"
                                data-testid="home-pregunta-input"
                                className="flex-1 bg-transparent outline-none text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!puedeEnviar}
                            aria-label="Publicar pregunta"
                            data-testid="home-pregunta-enviar"
                            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl text-base font-bold text-white lg:cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            style={{
                                background: 'linear-gradient(135deg, #1e293b, #334155)',
                                boxShadow: '0 3px 10px rgba(30, 41, 59, 0.35)',
                            }}
                        >
                            {enviando ? (
                                <Loader2
                                    className="w-4 h-4 shrink-0 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                            )}
                            <span>Preguntar</span>
                        </button>
                    </form>
                </div>

                {/* Stat — "X vecinos preguntando hoy" */}
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 shrink-0">
                        <Users
                            className="w-3.5 h-3.5 text-blue-700"
                            strokeWidth={2.25}
                            aria-hidden="true"
                        />
                    </span>
                    {vecinosHoy === 0 ? (
                        <span>Sé el primero en preguntar hoy</span>
                    ) : vecinosHoy === 1 ? (
                        <span>
                            <span className="text-slate-900 font-bold">1 vecino</span>{' '}
                            preguntando hoy
                        </span>
                    ) : (
                        <span>
                            <span className="text-slate-900 font-bold">
                                {vecinosHoy} vecinos
                            </span>{' '}
                            preguntando hoy
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// SECCIÓN FEED — "Lo que pregunta la comunidad"
// =============================================================================

interface SeccionFeedProps {
    feed: ReturnType<typeof usePreguntasComunidadLista>;
    nombreCiudad: string;
}

function SeccionFeed({ feed, nombreCiudad }: SeccionFeedProps) {
    const preguntas = feed.data ?? [];

    return (
        <section className="max-w-3xl mx-auto w-full space-y-3 lg:space-y-4" data-testid="home-feed">
            <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-base lg:text-lg font-bold text-slate-800">
                    Lo que pregunta la comunidad
                </h2>
                <Link
                    to="/inicio/mis-preguntas"
                    data-testid="home-link-mis-preguntas"
                    className="text-xs lg:text-sm font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer transition-colors"
                >
                    Mis preguntas →
                </Link>
            </div>

            {!nombreCiudad ? (
                <EstadoSinCiudad />
            ) : feed.isError ? (
                <EstadoError onReintentar={() => feed.refetch()} />
            ) : feed.isPending ? (
                <EsqueletoCarga />
            ) : preguntas.length === 0 ? (
                <EstadoVacio nombreCiudad={nombreCiudad} />
            ) : (
                <ul className="space-y-2.5 lg:space-y-3">
                    {preguntas.map((p) => (
                        <CardPregunta key={p.id} pregunta={p} />
                    ))}
                </ul>
            )}
        </section>
    );
}

// =============================================================================
// CARD PREGUNTA
// =============================================================================

function CardPregunta({ pregunta }: { pregunta: PreguntaComunidad }) {
    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const iniciales = obtenerIniciales(pregunta.autorNombre, pregunta.autorApellidos);

    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(pregunta.createdAt);
        } catch {
            return '';
        }
    })();

    // Sondea el estado de Coyo. Si ya viene final del feed, el hook NO
    // hace requests (enabled: false). Si está pendiente/procesando, sondea
    // cada 2s y se detiene solo al llegar a estado final.
    const sondeo = useEstadoCoyo(pregunta.id, pregunta.estadoCoyo);

    // El hook PUEDE no tener data aún (primer fetch en vuelo). Mientras
    // tanto usamos lo que vino del feed como estado actual.
    const estadoCoyo: EstadoCoyo = sondeo.data?.estadoCoyo ?? pregunta.estadoCoyo;
    const respuestaCoyo = sondeo.data?.respuestaCoyo ?? pregunta.respuestaCoyo;
    const resultadosCoyo = sondeo.data?.resultadosCoyo ?? pregunta.resultadosCoyo;

    // Reglas de visibilidad del botón "Yo también" y de la caja de respuesta:
    //   - Solo si la pregunta sigue 'activa' (cerradas/ocultas no aceptan).
    //   - El botón "Yo también" se oculta para el AUTOR (no tiene sentido
    //     auto-marcarse interés en su propia pregunta).
    const preguntaActiva = pregunta.estadoPregunta === 'activa';
    const esAutor = !!usuarioId && usuarioId === pregunta.autorId;
    const mostrarInteres = preguntaActiva && !esAutor;

    return (
        <li
            className="bg-white border border-slate-200 rounded-2xl p-3.5 lg:p-4 shadow-sm"
            data-testid={`pregunta-${pregunta.id}`}
        >
            <div className="flex items-start gap-3">
                <Avatar
                    url={pregunta.autorAvatarUrl}
                    alt={pregunta.autorNombre}
                    fallback={iniciales}
                    sizeClass="w-9 h-9 lg:w-10 lg:h-10"
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm lg:text-base font-bold text-slate-800 truncate">
                                {pregunta.autorNombre}
                            </span>
                            {tiempo && (
                                <span className="text-xs lg:text-sm text-slate-400">
                                    {tiempo}
                                </span>
                            )}
                            {pregunta.resueltaAt && (
                                <span
                                    className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                                    data-testid={`pregunta-resuelta-${pregunta.id}`}
                                >
                                    <CheckCircle2
                                        className="w-3 h-3"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Resuelta
                                </span>
                            )}
                        </div>
                        {/* Menú del autor (3 puntitos) — solo si el caller es
                            el autor de la pregunta. El propio menú maneja
                            las reglas de visibilidad de cada acción. */}
                        {esAutor && <MenuAutorPregunta pregunta={pregunta} />}
                    </div>
                    <p className="mt-1 text-sm lg:text-base text-slate-700 leading-relaxed wrap-break-word">
                        {pregunta.texto}
                    </p>

                    {/* Bloque Coyo: pensando / listo / no_aplica.
                        Para 'sin_respuesta' no se muestra (es lo normal —
                        la comunidad responde abajo). */}
                    {(estadoCoyo === 'pendiente' || estadoCoyo === 'procesando') && (
                        <div className="mt-3">
                            <BloqueCoyoPensando />
                        </div>
                    )}
                    {estadoCoyo === 'listo' && (
                        <div className="mt-3">
                            <BloqueCoyoListo
                                respuesta={respuestaCoyo}
                                resultados={resultadosCoyo}
                                textoPregunta={pregunta.texto}
                            />
                        </div>
                    )}
                    {estadoCoyo === 'no_aplica' && respuestaCoyo && (
                        <div className="mt-3">
                            <BloqueCoyoNoAplica texto={respuestaCoyo} />
                        </div>
                    )}

                    {/* Barra de acciones de la comunidad: "yo también quiero
                        saber" + toggle de respuestas. Solo visible si la
                        pregunta sigue 'activa'. */}
                    {preguntaActiva && (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {mostrarInteres && (
                                <BotonInteresComunidad
                                    preguntaId={pregunta.id}
                                    yoTambienInteresado={pregunta.yoTambienInteresado}
                                    totalInteresados={pregunta.totalInteresados}
                                />
                            )}
                        </div>
                    )}

                    {/* Hilo de respuestas (colapsable, carga al abrir).
                        `esAutor` se usa para esconder la invitación a
                        responder y la caja de respuesta — el autor no se
                        autorresponde, solo lee lo que la comunidad le dice. */}
                    <RespuestasComunidad
                        preguntaId={pregunta.id}
                        totalRespuestas={pregunta.totalRespuestas}
                        puedeResponder={preguntaActiva}
                        esAutor={esAutor}
                    />
                </div>
            </div>
        </li>
    );
}

// =============================================================================
// ESTADOS DEL FEED
// =============================================================================

function EstadoSinCiudad() {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 text-center">
            <p className="text-sm lg:text-base text-slate-600">
                Activa tu ubicación para ver las preguntas de tu ciudad.
            </p>
        </div>
    );
}

function EstadoVacio({ nombreCiudad }: { nombreCiudad: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 text-center">
            <div className="inline-flex w-12 h-12 lg:w-14 lg:h-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200 mb-3">
                <Inbox
                    className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400"
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            </div>
            <p className="text-sm lg:text-base font-bold text-slate-800">
                Sé el primero en preguntar en {nombreCiudad}
            </p>
            <p className="mt-1 text-xs lg:text-sm text-slate-500">
                Cuando alguien pregunte algo aquí, lo verás de inmediato.
            </p>
        </div>
    );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 text-center">
            <p className="text-sm lg:text-base text-slate-600">
                No pudimos cargar las preguntas. Revisa tu conexión.
            </p>
            <button
                type="button"
                onClick={onReintentar}
                className="mt-3 inline-flex items-center gap-1.5 text-xs lg:text-sm font-bold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
            >
                <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reintentar
            </button>
        </div>
    );
}

function EsqueletoCarga() {
    return (
        <ul className="space-y-2.5 lg:space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <li
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 lg:p-4"
                >
                    <div className="flex items-start gap-3 animate-pulse">
                        <div className="shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-slate-200" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
                            <div className="h-3 w-full bg-slate-200 rounded" />
                            <div className="h-3 w-3/4 bg-slate-200 rounded" />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// =============================================================================
// AVATAR — pequeño helper con fallback robusto (sin mutar DOM)
// =============================================================================

interface AvatarProps {
    url: string | null;
    alt: string;
    fallback: string;
    sizeClass: string;
}

function Avatar({ url, alt, fallback, sizeClass }: AvatarProps) {
    const [errorImagen, setErrorImagen] = useState(false);
    const mostrarImagen = !!url && !errorImagen;

    return (
        <div
            className={`shrink-0 ${sizeClass} rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-sm lg:text-base font-bold text-slate-500`}
        >
            {mostrarImagen ? (
                <img
                    src={url}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setErrorImagen(true)}
                />
            ) : (
                <span aria-hidden="true">{fallback}</span>
            )}
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre || '').trim().charAt(0).toUpperCase();
    const b = (apellidos || '').trim().charAt(0).toUpperCase();
    return (a + b) || '?';
}

// =============================================================================
// BLOQUES DE COYO — pensando / listo / no_aplica
// =============================================================================
//
// Diseño: panel azulado claro debajo del texto de la pregunta. Encabezado
// pequeño con icono Sparkles ámbar (consistente con el label "Pregúntale
// a Coyo" del hero). Texto cálido + tarjetas agrupadas por tipo. Las
// tarjetas usan SOLO los datos ricos que vinieron (rating, verificado,
// estaAbierto, condicion, días para vencer) — sin inventar.

function BloqueCoyoPensando() {
    // Sin contenedor — Coyo mini + texto van inline en el flujo de la card.
    // Quitamos el panel azul claro porque la animación de "pensando" del
    // Rive es suficiente para indicar que algo está pasando, y mantener el
    // panel hacía que la card se viera "pesada" mientras solo se procesa.
    //
    // `aria-live="polite"` se preserva en el contenedor para que lectores
    // de pantalla anuncien el cambio de estado.
    return (
        <div
            aria-live="polite"
            className="flex items-center gap-2 text-slate-600"
        >
            <CoyoAnimado
                estado="pensando"
                align="center"
                alt="Coyo está pensando"
                className="shrink-0 w-10 h-10 lg:w-12 lg:h-12"
            />
            <span className="text-sm lg:text-base font-bold">
                Coyo está pensando…
            </span>
        </div>
    );
}

function BloqueCoyoNoAplica({ texto }: { texto: string }) {
    return (
        <section className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 lg:p-4">
            <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden="true" />
                <p className="text-sm lg:text-base text-slate-700 leading-relaxed">
                    {texto}
                </p>
            </div>
        </section>
    );
}

interface BloqueCoyoListoProps {
    respuesta: string | null;
    resultados: ResultadosCoyo | null;
    /** Texto literal de la pregunta del vecino. Se usa como query inicial
     *  cuando el usuario hace click en "Ver más resultados" para llevarlo
     *  a la sección con el filtro aplicado. */
    textoPregunta: string;
}

function BloqueCoyoListo({ respuesta, resultados, textoPregunta }: BloqueCoyoListoProps) {
    // Solo grupos con items, en orden fijo (negocios primero por relevancia
    // del comercio local).
    const grupos = useMemo(() => {
        if (!resultados) return [];
        const orden: Array<{
            clave: TipoItemCoyo;
            titulo: string;
            grupo: GrupoCoyo;
        }> = [
            { clave: 'negocio', titulo: 'Negocios', grupo: resultados.negocios },
            { clave: 'oferta', titulo: 'Ofertas', grupo: resultados.ofertas },
            { clave: 'marketplace', titulo: 'MarketPlace', grupo: resultados.marketplace },
            { clave: 'servicio', titulo: 'Servicios', grupo: resultados.servicios },
        ];
        return orden.filter((g) => g.grupo.items.length > 0);
    }, [resultados]);

    // Encabezado condicional: "encontró esto" miente cuando no hay tarjetas.
    // Si Coyo respondió pero los 4 grupos están vacíos (busqué y no había
    // nada del pueblo), usamos un encabezado neutro.
    const encabezado = grupos.length > 0 ? 'Coyo encontró esto para ti' : 'Coyo dice';

    return (
        <section className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 lg:p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-sm lg:text-base font-bold text-slate-700">
                    {encabezado}
                </span>
            </div>

            {respuesta && (
                <p className="text-sm lg:text-base text-slate-700 leading-relaxed">
                    {respuesta}
                </p>
            )}

            {grupos.length > 0 && (
                <div className="space-y-3">
                    {grupos.map(({ clave, titulo, grupo }) => {
                        const items = grupo.items.slice(0, 3);
                        const hayMas = grupo.total > items.length;
                        return (
                            <div key={clave} className="space-y-1.5">
                                <h4 className="text-[11px] lg:text-xs font-bold text-slate-500 uppercase tracking-wide px-0.5">
                                    {titulo}
                                    {hayMas && (
                                        <span className="ml-1 text-slate-400 normal-case font-medium">
                                            ({grupo.total})
                                        </span>
                                    )}
                                </h4>
                                <ul className="space-y-1.5">
                                    {items.map((item) => (
                                        <TarjetaItemCoyo
                                            key={`${item.tipo}-${item.id}`}
                                            item={item}
                                        />
                                    ))}
                                </ul>
                                {hayMas && (
                                    <BotonVerMasResultados
                                        tipo={clave}
                                        totalRestantes={grupo.total - items.length}
                                        textoPregunta={textoPregunta}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

// =============================================================================
// "VER MÁS RESULTADOS" — link a la sección con el query de la pregunta
// =============================================================================

interface BotonVerMasResultadosProps {
    tipo: TipoItemCoyo;
    totalRestantes: number;
    textoPregunta: string;
}

function BotonVerMasResultados({
    tipo,
    totalRestantes,
    textoPregunta,
}: BotonVerMasResultadosProps) {
    const navigate = useNavigate();
    const setQuery = useSearchStore((s) => s.setQuery);
    const abrirBuscador = useSearchStore((s) => s.abrirBuscador);

    const handleClick = () => {
        // Setea el query en el store global ANTES de navegar — la sección
        // destino lee el query del store y filtra automáticamente. Se abre
        // el buscador para que el usuario VEA el query activo y pueda
        // modificarlo o cerrarlo si quiere.
        setQuery(textoPregunta);
        abrirBuscador();
        navigate(rutaSeccionCoyo(tipo));
    };

    const etiqueta =
        totalRestantes === 1
            ? `Ver 1 más en ${nombreSeccionCoyo(tipo)}`
            : `Ver ${totalRestantes} más en ${nombreSeccionCoyo(tipo)}`;

    return (
        <button
            type="button"
            onClick={handleClick}
            data-testid={`coyo-ver-mas-${tipo}`}
            className="inline-flex items-center gap-1.5 mt-0.5 px-1 py-1 rounded-md text-xs lg:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 lg:cursor-pointer transition-colors"
        >
            <span>{etiqueta}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        </button>
    );
}

// =============================================================================
// TARJETA DE ITEM COYO — fila densa con datos ricos
// =============================================================================

function TarjetaItemCoyo({ item }: { item: ItemCoyo }) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(rutaDetalleItemCoyo(item));
    };

    return (
        <li>
            <button
                type="button"
                onClick={handleClick}
                data-testid={`coyo-tarjeta-${item.tipo}-${item.id}`}
                aria-label={`Ver ${item.titulo}`}
                className="w-full flex items-start gap-2.5 lg:gap-3 bg-white border border-slate-200 rounded-lg p-2 lg:p-2.5 text-left lg:cursor-pointer transition-colors lg:hover:border-blue-300 lg:hover:bg-blue-50/30 active:scale-[0.995]"
            >
                <ImagenItem url={item.imagen} alt={item.titulo} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm lg:text-base font-bold text-slate-800 truncate">
                        {item.titulo}
                    </p>
                    {item.subtitulo && (
                        <p className="text-xs lg:text-sm text-slate-500 truncate">
                            {item.subtitulo}
                        </p>
                    )}
                    <ChipsDatosRicos item={item} />
                </div>
            </button>
        </li>
    );
}

function ImagenItem({ url, alt }: { url: string | null; alt: string }) {
    const [error, setError] = useState(false);
    const mostrar = !!url && !error;
    return (
        <div className="shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {mostrar ? (
                <img
                    src={url}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setError(true)}
                />
            ) : (
                <span className="text-slate-300 text-xs" aria-hidden="true">
                    —
                </span>
            )}
        </div>
    );
}

/**
 * Chips horizontales con los datos ricos disponibles del item.
 * Solo muestra los que NO son null (los que no aplican al tipo del item
 * vienen null desde el backend — no se renderizan).
 */
function ChipsDatosRicos({ item }: { item: ItemCoyo }) {
    const chips: Array<{ clave: string; nodo: React.ReactNode }> = [];

    // Rating + total de reseñas (negocio)
    if (item.rating !== null) {
        chips.push({
            clave: 'rating',
            nodo: (
                <>
                    <Star className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2.5} aria-hidden="true" fill="currentColor" />
                    <span>
                        {item.rating.toFixed(1)}
                        {item.totalResenas !== null && item.totalResenas > 0 && (
                            <span className="text-slate-400"> ({item.totalResenas})</span>
                        )}
                    </span>
                </>
            ),
        });
    }
    // Verificado (negocio)
    if (item.verificado === true) {
        chips.push({
            clave: 'verificado',
            nodo: (
                <>
                    <BadgeCheck className="w-3 h-3 text-blue-600 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    <span>Verificado</span>
                </>
            ),
        });
    }
    // Abierto / cerrado (negocio)
    if (item.estaAbierto !== null) {
        chips.push({
            clave: 'abierto',
            nodo: (
                <>
                    <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    <span>{item.estaAbierto ? 'Abierto' : 'Cerrado'}</span>
                </>
            ),
        });
    }
    // Rating del negocio (oferta)
    if (item.negocioRating !== null) {
        chips.push({
            clave: 'negocioRating',
            nodo: (
                <>
                    <Star className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2.5} aria-hidden="true" fill="currentColor" />
                    <span>{item.negocioRating.toFixed(1)}</span>
                </>
            ),
        });
    }
    // Días para vencer (oferta)
    if (item.diasParaVencer !== null) {
        const d = item.diasParaVencer;
        const texto = d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`;
        chips.push({ clave: 'vence', nodo: <span>{texto}</span> });
    }
    // Condición (marketplace)
    if (item.condicion) {
        chips.push({
            clave: 'condicion',
            nodo: <span className="capitalize">{item.condicion.replace('_', ' ')}</span>,
        });
    }
    // Acepta ofertas (marketplace)
    if (item.aceptaOfertas === true) {
        chips.push({ clave: 'negociable', nodo: <span>Negociable</span> });
    }

    if (chips.length === 0) return null;

    return (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] lg:text-xs text-slate-600 font-medium">
            {chips.map((c, i) => (
                <span key={c.clave} className="inline-flex items-center gap-0.5">
                    {c.nodo}
                    {i < chips.length - 1 && (
                        <span className="ml-1.5 text-slate-300" aria-hidden="true">
                            ·
                        </span>
                    )}
                </span>
            ))}
        </div>
    );
}
