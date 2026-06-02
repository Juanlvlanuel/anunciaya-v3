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
import { Users, History, RefreshCcw, Inbox } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import {
    usePreguntasComunidadLista,
    useCrearPregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useCoyoEstadoVisual } from '../../hooks/useCoyoEstadoVisual';
import { AreaPreguntaCoyo, CoyoInput } from '../../components/home/AreaPreguntaCoyo';
import { CardPreguntaEditorial } from '../../components/home/CardPreguntaEditorial';
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
        <div className={`flex gap-1 p-1 rounded-full bg-slate-200/70 border border-slate-300 ${className}`}>
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
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold lg:cursor-pointer transition-colors ${activo ? 'text-white shadow-sm' : 'text-slate-600'}`}
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
                <span className="font-medium text-slate-500">Pregunta a </span>
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
            <p className="text-sm lg:text-base text-slate-600">
                Activa tu ubicación para ver las preguntas de tu ciudad.
            </p>
        </div>
    );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="bg-white rounded-xl p-5 lg:p-6 text-center shadow-sm">
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
                <Inbox size={26} strokeWidth={1.75} className="text-blue-500" />
            </span>
            <h4 className="text-base lg:text-lg font-bold text-slate-800">Todavía no preguntas nada</h4>
            <p className="mt-1 text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
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
    const preguntasMostradas = segmento === 'mias' ? misEnFeed : preguntas;

    const esMovil = useEsMovil();

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
                {/* Coyo protagonista (scrollea) — sin input (va sticky abajo) */}
                <div className="pt-1 pb-4">
                    <AreaPreguntaCoyo
                        nombreUsuario={nombreUsuario}
                        estadoCoyo={estadoCoyoVisual}
                        conInput={false}
                    />
                </div>

                {/* Barra sticky: input compacto + segmento */}
                <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-2.5 backdrop-blur-sm space-y-2.5">
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
                <div className="pt-4">
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
        );
    }

    // ── DESKTOP ──────────────────────────────────────────────────────────
    return (
        <div className="w-full px-4 lg:px-5 2xl:px-6 py-4 lg:py-6">
            <div className="flex flex-col lg:flex-row gap-5 2xl:gap-7 items-start">
                {/* Rail izquierdo: solo Coyo (mascota + burbujas + input + stat),
                    centrado verticalmente en el alto disponible. */}
                <div className="w-full lg:w-[336px] 2xl:w-[412px] shrink-0 self-start lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:flex lg:flex-col lg:justify-center">
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

                {/* Feed */}
                <div className="w-full min-w-0 flex-1">
                    <div className="w-full max-w-[760px] space-y-3 lg:space-y-4">
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
