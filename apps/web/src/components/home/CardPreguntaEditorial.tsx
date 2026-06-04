/**
 * CardPreguntaEditorial.tsx — Card del feed (estilo "Editorial") del Home.
 * =========================================================================
 * Cabecera del autor (avatar + nombre + tiempo + chip Resuelta + menú ⋮) +
 * pregunta grande + bloque de respuesta de Coyo + acciones de comunidad.
 *
 * Reutiliza los componentes existentes SIN reescribirlos:
 *   - BotonInteresComunidad, RespuestasComunidad, MenuAutorPregunta, CoyoAnimado.
 *
 * Conserva la funcionalidad del Home anterior dentro del nuevo look:
 *   - Sondeo de Coyo (useEstadoCoyo) que se autoapaga al llegar a estado final.
 *   - Subtipos de `no_aplica` (vaga → ámbar "Coyo sugiere" / no_local → slate
 *     "Coyo aclara") vía detectarSubtipoNoAplica.
 *   - `sin_respuesta` con botón Reintentar (solo autor).
 *   - Tarjetas de resultado clicables al detalle + data-testid de E2E.
 *
 * El carrusel de resultados es ÚNICO (mezcla negocios/ofertas/marketplace/
 * servicios en un solo scroll horizontal con badge de tipo) — decisión de
 * diseño del rediseño 2 columnas.
 *
 * Ubicación: apps/web/src/components/home/CardPreguntaEditorial.tsx
 */

import { useState, memo, type FormEvent } from 'react';
import {
    Sparkles,
    CheckCircle2,
    XCircle,
    Trash2,
    AlertTriangle,
    RefreshCcw,
    Loader2,
} from 'lucide-react';
import {
    useEstadoCoyo,
    useReintentarMiPregunta,
    useEditarMiPregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useAuthStore } from '../../stores/useAuthStore';
import { CoyoAnimado } from '../CoyoAnimado';
import { BotonInteresComunidad } from './BotonInteresComunidad';
import { RespuestasComunidad } from './RespuestasComunidad';
import { MenuAutorPregunta } from './MenuAutorPregunta';
import { CardItemCoyo } from './CardItemCoyo';
import { ModalImagenes } from '../ui/ModalImagenes';
import { detectarSubtipoNoAplica, obtenerIniciales, itemsPlanosCoyo } from './navegacionCoyo';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { PreguntaComunidad, EstadoCoyo } from '../../types/preguntasComunidad';

// =============================================================================
// AVATAR — gradiente azul de marca (TOKENS_GLOBALES R2)
// =============================================================================

function Avatar({ url, alt, fallback }: { url: string | null; alt: string; fallback: string }) {
    const [visorAbierto, setVisorAbierto] = useState(false);
    if (url) {
        return (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setVisorAbierto(true);
                    }}
                    aria-label={`Ver foto de ${alt}`}
                    className="shrink-0 rounded-full lg:cursor-pointer active:scale-[0.97]"
                >
                    <img src={url} alt={alt} className="w-10 h-10 rounded-full object-cover" />
                </button>
                <ModalImagenes images={[url]} isOpen={visorAbierto} onClose={() => setVisorAbierto(false)} />
            </>
        );
    }
    return (
        <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
        >
            <span aria-hidden="true">{fallback}</span>
        </div>
    );
}

// =============================================================================
// BLOQUE DE RESPUESTA DE COYO (según estadoCoyo)
// =============================================================================

function BloqueSinRespuesta({ preguntaId, esAutor }: { preguntaId: string; esAutor: boolean }) {
    const reintentar = useReintentarMiPregunta();

    const handleReintentar = () => {
        if (reintentar.isPending) return;
        reintentar.mutate(preguntaId, {
            onSuccess: () => notificar.exito('Reintentando — Coyo está procesando de nuevo'),
            onError: (err) =>
                notificar.error(err instanceof Error ? err.message : 'No se pudo reintentar'),
        });
    };

    return (
        <div className="mt-3 pt-3 border-t border-slate-300">
            <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-sm font-bold text-slate-700">Coyo no pudo procesar tu pregunta</span>
            </div>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed">
                {esAutor
                    ? 'Hubo un problema temporal con el asistente. Puedes intentar de nuevo.'
                    : 'Coyo no pudo responder ahorita, pero los vecinos sí pueden ayudar.'}
            </p>
            {esAutor && (
                <button
                    type="button"
                    onClick={handleReintentar}
                    disabled={reintentar.isPending}
                    data-testid={`coyo-reintentar-${preguntaId}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-700 text-white text-sm lg:text-xs 2xl:text-sm font-bold hover:bg-slate-800 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {reintentar.isPending ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            Reintentando…
                        </>
                    ) : (
                        <>
                            <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            Reintentar
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

function BloqueNoAplica({ texto }: { texto: string }) {
    const subtipo = detectarSubtipoNoAplica(texto);
    const tono =
        subtipo === 'vaga'
            ? { fondo: 'bg-amber-100 border-amber-300', icono: 'text-amber-600', titulo: 'Coyo sugiere' }
            : { fondo: 'bg-slate-200 border-slate-300', icono: 'text-slate-600', titulo: 'Coyo aclara' };

    return (
        <div className={`mt-3 rounded-xl border p-3 lg:p-3.5 ${tono.fondo}`}>
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className={`w-4 h-4 shrink-0 ${tono.icono}`} strokeWidth={2.5} aria-hidden="true" />
                <span className="text-sm font-bold text-slate-700">{tono.titulo}</span>
            </div>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed wrap-break-word">{texto}</p>
        </div>
    );
}

function RespuestaCoyo({ pregunta }: { pregunta: PreguntaComunidad }) {
    // Sondea el estado de Coyo; si ya viene final del feed, el hook no hace
    // requests. Mientras no haya data del sondeo, usamos lo del feed.
    const sondeo = useEstadoCoyo(pregunta.id, pregunta.estadoCoyo);
    const estadoCoyo: EstadoCoyo = sondeo.data?.estadoCoyo ?? pregunta.estadoCoyo;
    const respuestaCoyo = sondeo.data?.respuestaCoyo ?? pregunta.respuestaCoyo;
    const resultadosCoyo = sondeo.data?.resultadosCoyo ?? pregunta.resultadosCoyo;

    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const esAutor = !!usuarioId && usuarioId === pregunta.autorId;

    if (estadoCoyo === 'pendiente' || estadoCoyo === 'procesando') {
        return (
            <div className="mt-3 flex items-center gap-2.5 text-slate-600" aria-live="polite">
                <CoyoAnimado
                    estado="pensando"
                    align="center"
                    alt="Coyo está pensando"
                    className="shrink-0 w-16 h-16 lg:w-20 lg:h-20"
                />
                <span className="text-base lg:text-lg font-extrabold">
                    <span style={{ color: '#d97534' }}>Coyo</span>
                    <span className="text-slate-600"> está pensando</span>
                </span>
                <span className="coyo-dots inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#d97534' }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: '#d97534' }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: '#d97534' }} />
                </span>
            </div>
        );
    }

    if (estadoCoyo === 'no_aplica' && respuestaCoyo) {
        return <BloqueNoAplica texto={respuestaCoyo} />;
    }

    if (estadoCoyo === 'sin_respuesta') {
        return <BloqueSinRespuesta preguntaId={pregunta.id} esAutor={esAutor} />;
    }

    // listo
    const items = itemsPlanosCoyo(resultadosCoyo);
    const encabezado = items.length > 0 ? 'Coyo encontró esto' : 'Coyo dice';

    return (
        <div className="mt-3 pt-3 border-t border-slate-300">
            <div className="flex items-center gap-2 mb-1.5">
                <img
                    src="/cabeza-coyo.webp"
                    alt=""
                    aria-hidden="true"
                    className="w-11 h-11 lg:w-12 lg:h-12 shrink-0 object-contain"
                />
                <span className="text-base lg:text-lg font-extrabold">
                    <span style={{ color: '#d97534' }}>Coyo</span>
                    <span className="text-slate-700">{encabezado.replace('Coyo', '')}</span>
                </span>
            </div>
            {respuestaCoyo && (
                <p className="text-sm lg:text-base font-medium text-slate-600 leading-relaxed mb-2.5">{respuestaCoyo}</p>
            )}
            {items.length > 0 && (
                <div className="-mx-1 px-1 flex gap-2.5 overflow-x-auto pb-1.5 mp-scroll">
                    {items.map((it) => (
                        <CardItemCoyo key={`${it.tipo}-${it.id}`} item={it} />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// EDITOR INLINE DE LA PREGUNTA (reemplaza el modal de editar)
// =============================================================================

const TEXTO_MAX_PREGUNTA = 500;

function EditorPregunta({
    preguntaId,
    textoInicial,
    onCerrar,
}: {
    preguntaId: string;
    textoInicial: string;
    onCerrar: () => void;
}) {
    const [texto, setTexto] = useState(textoInicial);
    const editar = useEditarMiPregunta();

    const textoTrimmed = texto.trim();
    const huboCambios = textoTrimmed !== textoInicial.trim();
    const puedeGuardar = textoTrimmed.length > 0 && huboCambios && !editar.isPending;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!puedeGuardar) return;
        editar.mutate(
            { preguntaId, textoNuevo: textoTrimmed },
            {
                onSuccess: () => {
                    notificar.exito('Pregunta actualizada — Coyo está re-procesando');
                    onCerrar();
                },
                onError: (err) =>
                    notificar.error(err instanceof Error ? err.message : 'No se pudo editar la pregunta'),
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
            <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, TEXTO_MAX_PREGUNTA))}
                rows={3}
                maxLength={TEXTO_MAX_PREGUNTA}
                disabled={editar.isPending}
                autoFocus
                aria-label="Editar tu pregunta"
                data-testid={`editar-pregunta-input-${preguntaId}`}
                className="w-full resize-none bg-white rounded-xl px-4 py-3 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 border-2 border-slate-300 focus:border-slate-500 outline-none disabled:opacity-50"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
            />
            <div className="flex items-center justify-between text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600">
                <span>{huboCambios ? 'Hay cambios sin guardar' : 'Aún no hay cambios'}</span>
                <span>
                    {textoTrimmed.length}/{TEXTO_MAX_PREGUNTA}
                </span>
            </div>
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCerrar}
                    disabled={editar.isPending}
                    data-testid={`editar-pregunta-cancelar-${preguntaId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 lg:cursor-pointer disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={!puedeGuardar}
                    data-testid={`editar-pregunta-guardar-${preguntaId}`}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-md lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                >
                    {editar.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Guardando…
                        </>
                    ) : (
                        'Guardar cambios'
                    )}
                </button>
            </div>
        </form>
    );
}

// =============================================================================
// CARD PREGUNTA EDITORIAL
// =============================================================================

interface CardPreguntaEditorialProps {
    pregunta: PreguntaComunidad;
}

function CardPreguntaEditorialBase({ pregunta }: CardPreguntaEditorialProps) {
    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const esAutor = !!usuarioId && usuarioId === pregunta.autorId;
    const preguntaActiva = pregunta.estadoPregunta === 'activa';
    const mostrarInteres = preguntaActiva && !esAutor;
    const resuelta = pregunta.resueltaAt !== null;
    const [editando, setEditando] = useState(false);

    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(pregunta.createdAt);
        } catch {
            return '';
        }
    })();

    const iniciales = obtenerIniciales(pregunta.autorNombre, pregunta.autorApellidos);

    return (
        <li
            id={`feed-${pregunta.id}`}
            data-testid={`pregunta-${pregunta.id}`}
            className={`scroll-mt-24 rounded-xl p-4 lg:p-5 ${
                pregunta.estadoPregunta === 'oculta'
                    ? 'bg-red-50/70 ring-1 ring-red-200 shadow-sm'
                    : 'bg-white shadow-md'
            }`}
        >
            {/* Header del autor */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar url={pregunta.autorAvatarUrl} alt={pregunta.autorNombre} fallback={iniciales} />
                    <div className="min-w-0">
                        <p className="text-base font-bold text-slate-800 truncate leading-tight">{pregunta.autorNombre}</p>
                        {tiempo && <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium">{tiempo}</p>}
                    </div>
                    {/* Badges de estado — solo aparecen en "Mis preguntas"
                        (el feed por ciudad solo trae activas). */}
                    {pregunta.estadoPregunta === 'cerrada' && (
                        <span
                            className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 shrink-0"
                            data-testid={`pregunta-cerrada-${pregunta.id}`}
                        >
                            <XCircle className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Cerrada
                        </span>
                    )}
                    {pregunta.estadoPregunta === 'oculta' && (
                        <span
                            className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5 shrink-0"
                            data-testid={`pregunta-eliminada-${pregunta.id}`}
                        >
                            <Trash2 className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Eliminada
                        </span>
                    )}
                    {resuelta && (
                        <span
                            className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5 shrink-0"
                            data-testid={`pregunta-resuelta-${pregunta.id}`}
                        >
                            <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Resuelta
                        </span>
                    )}
                </div>
                {esAutor && <MenuAutorPregunta pregunta={pregunta} onEditar={() => setEditando(true)} />}
            </div>

            {/* Pregunta (editable inline) */}
            {editando ? (
                <EditorPregunta
                    preguntaId={pregunta.id}
                    textoInicial={pregunta.texto}
                    onCerrar={() => setEditando(false)}
                />
            ) : (
                <p className="mt-3 text-lg lg:text-xl font-semibold text-slate-800 leading-snug text-balance wrap-break-word">
                    {pregunta.texto}
                </p>
            )}

            {/* Respuesta de Coyo (oculta mientras se edita — al guardar se re-procesa) */}
            {!editando && <RespuestaCoyo pregunta={pregunta} />}

            {/* Acciones: trigger de respuestas (izq) + "Yo también" (der), misma fila */}
            <RespuestasComunidad
                preguntaId={pregunta.id}
                totalRespuestas={pregunta.totalRespuestas}
                puedeResponder={preguntaActiva}
                esAutor={esAutor}
                accionDerecha={
                    mostrarInteres ? (
                        <BotonInteresComunidad
                            preguntaId={pregunta.id}
                            yoTambienInteresado={pregunta.yoTambienInteresado}
                            totalInteresados={pregunta.totalInteresados}
                        />
                    ) : null
                }
            />
        </li>
    );
}

// Memoizado: el feed vive en PaginaInicio junto al input controlado de Coyo.
// Sin memo, cada tecla re-renderiza TODAS las cards (con sus sondeos). Como
// `pregunta` es estable entre renders del input, memo evita ese trabajo.
export const CardPreguntaEditorial = memo(CardPreguntaEditorialBase);
export default CardPreguntaEditorial;
