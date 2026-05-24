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
 *
 * Fase 2 (cuando el backend devuelva respuesta de IA):
 *   - Agregar bloque "Coyo encontró esto para ti" dentro de cada CardPregunta
 *     (ver comentario in-situ).
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles, Users, Inbox, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import {
    usePreguntasComunidadLista,
    useCrearPregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { PreguntaComunidad } from '../../types/preguntasComunidad';

// =============================================================================
// CONSTANTES
// =============================================================================

const TEXTO_MAX = 500;
const MS_24H = 24 * 60 * 60 * 1000;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaInicio() {
    const nombreUsuario = useAuthStore((s) => s.usuario?.nombre) ?? 'vecino';
    const ciudad = useGpsStore((s) => s.ciudad);
    const nombreCiudad = ciudad?.nombre ?? '';
    const estadoCiudad = ciudad?.estado ?? '';

    const feed = usePreguntasComunidadLista();
    const crear = useCrearPregunta();

    const [texto, setTexto] = useState('');

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
            <div className="max-w-4xl 2xl:max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-8">
                <HeroBubble
                    nombreUsuario={nombreUsuario}
                    nombreCiudad={nombreCiudad}
                    texto={texto}
                    onTextoChange={setTexto}
                    onEnviar={handleEnviar}
                    enviando={crear.isPending}
                    puedeEnviar={puedeEnviar}
                    vecinosHoy={vecinosHoy}
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
        <section className="flex flex-col items-center lg:flex-row lg:items-start gap-3 lg:gap-4">
            {/* Coyo — imagen completa, tamaño grande, sin contenedor circular */}
            <img
                src="/Coyo.png"
                alt="Coyo, asistente de AnunciaYA"
                draggable={false}
                className="shrink-0 h-40 lg:h-56 w-auto object-contain select-none"
                style={{ filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.15))' }}
            />

            {/* Columna derecha: bocadillo + label+input + stat */}
            <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-4">
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
                        className="hidden lg:block absolute w-1.5 h-1.5 rounded-full bg-blue-200 ring-[2px] ring-white"
                        style={{ left: '-46px', top: '26px' }}
                    />

                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-none">
                        ¡Hola, <span className="text-blue-600">{nombreUsuario}</span>!
                    </h1>
                    <p className="text-lg lg:text-xl text-slate-700 font-semibold leading-snug">
                        ¿Qué andas buscando hoy?{' '}
                        <span className="text-slate-500 font-medium">
                            Pregúntame y te ayudo al instante.
                        </span>
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
            <h2 className="text-base lg:text-lg font-bold text-slate-800 px-1">
                Lo que pregunta la comunidad
            </h2>

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

            {/* ─── Fase 2 (pendiente backend) ────────────────────────────────
                Cuando el endpoint devuelva la respuesta automática de Coyo
                por pregunta (resumen + recomendaciones de negocios/servicios),
                renderizar un bloque inline tipo "Coyo encontró esto para ti"
                dentro de cada CardPregunta — debajo del texto y antes del
                contador de respuestas. Hoy se omite porque el backend solo
                guarda el texto plano y `vecinosRespondieron` es 0. */}
        </section>
    );
}

// =============================================================================
// CARD PREGUNTA
// =============================================================================

function CardPregunta({ pregunta }: { pregunta: PreguntaComunidad }) {
    const iniciales = obtenerIniciales(pregunta.autorNombre, pregunta.autorApellidos);

    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(pregunta.createdAt);
        } catch {
            return '';
        }
    })();

    // Backend aún no devuelve cantidad de respuestas — placeholder 0.
    const vecinosRespondieron = 0;

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
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm lg:text-base font-bold text-slate-800 truncate">
                            {pregunta.autorNombre}
                        </span>
                        {tiempo && (
                            <span className="text-xs lg:text-sm text-slate-400">
                                {tiempo}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm lg:text-base text-slate-700 leading-relaxed break-words">
                        {pregunta.texto}
                    </p>
                    <p className="mt-2 text-xs lg:text-sm text-slate-500">
                        {vecinosRespondieron === 0
                            ? 'Esperando respuestas de la comunidad'
                            : vecinosRespondieron === 1
                                ? '1 vecino respondió'
                                : `${vecinosRespondieron} vecinos respondieron`}
                    </p>
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
