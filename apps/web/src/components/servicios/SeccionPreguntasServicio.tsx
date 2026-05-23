/**
 * SeccionPreguntasServicio.tsx
 * ==============================
 * Q&A público del detalle del servicio. Sprint 9.3 (iteración):
 * estilo visual replicado de `SeccionPreguntas.tsx` (MarketPlace) para
 * coherencia cross-sección — bubbles tipo chat con conector "L" para
 * las respuestas, header con conteo, input pill al final.
 *
 * Diferencias vs MP:
 *   - Colores: sky en lugar de teal (familia cromática de Servicios).
 *   - Sin agrupación por usuario (lista plana — el backend de Servicios
 *     devuelve `PreguntaServicio[]` simple, no `{pendientes, respondidas,
 *     grupos}` como MP).
 *   - Sin edición/retiro de pregunta propia (puede agregarse después
 *     usando los hooks `useEditarPreguntaPropiaServicio` y
 *     `useEliminarPreguntaPropiaServicio` que ya existen).
 *   - Sin BotonComentarista (apunta al perfil del usuario en MP — para
 *     Servicios la navegación al perfil del prestador queda como
 *     mejora futura).
 *
 * Ubicación: apps/web/src/components/servicios/SeccionPreguntasServicio.tsx
 */

import { useState } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import {
    useCrearPreguntaServicio,
    usePreguntasServicio,
    useResponderPreguntaServicio,
} from '../../hooks/queries/useServicios';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import {
    formatearTiempoRelativo,
    obtenerNombreCorto,
} from '../../utils/servicios';
import type {
    PreguntaServicio,
    PublicacionDetalle,
} from '../../types/servicios';

const PREGUNTA_MIN = 5;
const PREGUNTA_MAX = 200;
const RESPUESTA_MIN = 5;
const RESPUESTA_MAX = 500;

interface SeccionPreguntasServicioProps {
    publicacion: PublicacionDetalle;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionPreguntasServicio({
    publicacion,
}: SeccionPreguntasServicioProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const esDueno = usuarioActual?.id === publicacion.oferente.id;

    const { data: preguntas = [], isPending } = usePreguntasServicio(
        publicacion.id,
    );

    const puedeMostrarInput = !!usuarioActual && !esDueno;

    // Sprint 9.3: textos personalizados según tipo de publicación.
    // Genérico "esta publicación" suena impersonal — usar el término
    // específico (vacante / solicitud / servicio) y un mensaje empty
    // que oriente sobre QUÉ preguntar es mejor UX.
    const textos = textosSeccionPreguntas(publicacion.tipo);

    return (
        <div data-testid="seccion-preguntas-servicio" className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
                {textos.titulo}
                {preguntas.length > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-500">
                        ({preguntas.length})
                    </span>
                )}
            </h2>

            {isPending ? (
                <p className="text-sm font-medium text-slate-600">
                    Cargando preguntas...
                </p>
            ) : preguntas.length === 0 ? (
                <p className="text-sm font-medium text-slate-600">
                    {textos.vacio}
                </p>
            ) : (
                <div className="max-h-[500px] space-y-5 overflow-y-auto pr-1">
                    {preguntas.map((p) => (
                        <BubblePregunta
                            key={p.id}
                            pregunta={p}
                            publicacion={publicacion}
                            esDueno={esDueno}
                        />
                    ))}
                </div>
            )}

            {/* Input inline "Hacer una pregunta" — mismo patrón pill que MP.
                Solo visible para usuarios autenticados que no sean dueños. */}
            {puedeMostrarInput && (
                <FormHacerPregunta
                    publicacionId={publicacion.id}
                    placeholder={textos.placeholder}
                />
            )}
        </div>
    );
}

/**
 * Textos contextuales de la sección de preguntas según el tipo de
 * publicación. Mejora UX: el genérico "esta publicación" suena
 * impersonal — usar el término específico orienta al usuario sobre
 * qué tipo de pregunta tiene sentido aquí.
 */
function textosSeccionPreguntas(tipo: PublicacionDetalle['tipo']) {
    if (tipo === 'vacante-empresa') {
        return {
            titulo: 'Pregunta sobre esta Vacante',
            vacio: 'Sé el primero. Pregunta sobre horarios, prestaciones o requisitos del puesto.',
            placeholder: 'Pregunta sobre la vacante...',
        };
    }
    if (tipo === 'solicito') {
        return {
            titulo: 'Pregunta sobre esta Solicitud',
            vacio: 'Sé el primero en preguntar...',
            placeholder: 'Pregunta sobre la solicitud...',
        };
    }
    return {
        titulo: 'Pregunta sobre este Servicio',
        vacio: 'Sé el primero en preguntar...',
        placeholder: 'Pregunta sobre el servicio...',
    };
}

// =============================================================================
// SUBCOMPONENTE — BubblePregunta (cada pregunta + respuesta opcional)
// =============================================================================

interface BubblePreguntaProps {
    pregunta: PreguntaServicio;
    publicacion: PublicacionDetalle;
    esDueno: boolean;
}

function BubblePregunta({ pregunta, publicacion, esDueno }: BubblePreguntaProps) {
    const tiempo = formatearTiempoRelativo(pregunta.createdAt);
    const nombreCortoAutor = obtenerNombreCorto(
        pregunta.autor.nombre,
        pregunta.autor.apellidos,
    );
    const nombreCortoOferente = obtenerNombreCorto(
        publicacion.oferente.nombre,
        publicacion.oferente.apellidos,
    );
    const respondida = !!pregunta.respuesta;

    return (
        <div className="flex items-start gap-2.5 text-sm">
            {/* Avatar del autor de la pregunta */}
            <AvatarUsuario
                avatarUrl={pregunta.autor.avatarUrl}
                nombre={pregunta.autor.nombre}
                apellidos={pregunta.autor.apellidos}
            />

            {/* Columna derecha: bubble pregunta + (opcional) bubble respuesta */}
            <div className="min-w-0 flex-1">
                {/* Bubble pregunta — slate-200 (mismo que MP) */}
                <div className="rounded-2xl bg-slate-200 px-3 py-1.5">
                    <p className="text-sm font-semibold text-slate-900">
                        <span>{nombreCortoAutor}</span>
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                            · {tiempo}
                        </span>
                        {pregunta.pendiente && esDueno && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Pendiente
                            </span>
                        )}
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                        {pregunta.pregunta}
                    </p>
                </div>

                {/* Respuesta del oferente con conector "L" — bubble sky-100
                    (Servicios usa la familia sky vs teal de MP). */}
                {respondida && (
                    <div className="mt-1.5 flex">
                        <div aria-hidden className="flex w-6 shrink-0">
                            <div className="h-3 w-3 border-b border-l border-slate-500" />
                        </div>
                        <div className="flex-1 rounded-2xl bg-sky-100 px-3 py-1.5 text-sm text-slate-800">
                            <p className="text-sm font-semibold text-sky-700">
                                {nombreCortoOferente}
                            </p>
                            <p>{pregunta.respuesta}</p>
                        </div>
                    </div>
                )}

                {/* Form de respuesta inline (solo dueño + pregunta pendiente) */}
                {esDueno && !respondida && (
                    <FormResponderPregunta
                        preguntaId={pregunta.id}
                        publicacionId={publicacion.id}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE — FormHacerPregunta (input pill al final, estilo MP)
// =============================================================================

function FormHacerPregunta({
    publicacionId,
    placeholder = 'Hacer una pregunta...',
}: {
    publicacionId: string;
    /** Placeholder contextual según tipo (vacante / solicitud / servicio). */
    placeholder?: string;
}) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const crearMut = useCrearPreguntaServicio();
    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        const limpio = texto.trim();
        if (limpio.length < PREGUNTA_MIN) {
            setError(`Escribe al menos ${PREGUNTA_MIN} caracteres`);
            return;
        }
        if (limpio.length > PREGUNTA_MAX) {
            setError(`Máximo ${PREGUNTA_MAX} caracteres`);
            return;
        }
        setError(null);
        try {
            await crearMut.mutateAsync({
                publicacionId,
                pregunta: limpio,
            });
            setTexto('');
            notificar.exito('Tu pregunta fue enviada.');
        } catch {
            notificar.error('No pudimos enviar la pregunta.');
        }
    };

    return (
        <form onSubmit={handleEnviar} className="pt-2">
            <div className="flex items-center gap-2.5">
                {/* Avatar usuario actual */}
                <AvatarUsuario
                    avatarUrl={usuarioActual?.avatarUrl ?? null}
                    nombre={usuarioActual?.nombre ?? ''}
                    apellidos={usuarioActual?.apellidos ?? ''}
                />

                {/* Pill input + botón send */}
                <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3 py-1.5 focus-within:border-sky-500">
                    <input
                        type="text"
                        data-testid="input-hacer-pregunta-servicio"
                        value={texto}
                        onChange={(e) => {
                            setTexto(e.target.value);
                            if (error) setError(null);
                        }}
                        maxLength={PREGUNTA_MAX}
                        placeholder={placeholder}
                        className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        data-testid="btn-enviar-pregunta-servicio"
                        disabled={
                            texto.trim().length < PREGUNTA_MIN
                                || crearMut.isPending
                        }
                        aria-label="Enviar pregunta"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed lg:cursor-pointer"
                    >
                        <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
            {error && (
                <p className="mt-1.5 ml-11 flex items-center gap-1 text-xs font-semibold text-rose-600">
                    <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                    {error}
                </p>
            )}
        </form>
    );
}

// =============================================================================
// SUBCOMPONENTE — FormResponderPregunta (form inline para dueño)
// =============================================================================

function FormResponderPregunta({
    preguntaId,
    publicacionId,
}: {
    preguntaId: string;
    publicacionId: string;
}) {
    const responderMut = useResponderPreguntaServicio();
    const [activo, setActivo] = useState(false);
    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleEnviar = async () => {
        const limpio = texto.trim();
        if (limpio.length < RESPUESTA_MIN) {
            setError(`Mínimo ${RESPUESTA_MIN} caracteres`);
            return;
        }
        if (limpio.length > RESPUESTA_MAX) {
            setError(`Máximo ${RESPUESTA_MAX} caracteres`);
            return;
        }
        setError(null);
        try {
            await responderMut.mutateAsync({
                preguntaId,
                publicacionId,
                respuesta: limpio,
            });
            setActivo(false);
            setTexto('');
            notificar.exito('Respuesta enviada.');
        } catch {
            notificar.error('No pudimos enviar la respuesta.');
        }
    };

    if (!activo) {
        return (
            <div className="mt-1.5 flex">
                <div aria-hidden className="flex w-6 shrink-0">
                    <div className="h-3 w-3 border-b border-l border-slate-500" />
                </div>
                <button
                    type="button"
                    data-testid={`btn-iniciar-respuesta-${preguntaId}`}
                    onClick={() => setActivo(true)}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 lg:cursor-pointer"
                >
                    + Responder
                </button>
            </div>
        );
    }

    return (
        <div className="mt-1.5 flex">
            <div aria-hidden className="flex w-6 shrink-0">
                <div className="h-3 w-3 border-b border-l border-slate-500" />
            </div>
            <div className="flex-1">
                <textarea
                    data-testid={`textarea-respuesta-${preguntaId}`}
                    value={texto}
                    onChange={(e) => {
                        setTexto(e.target.value);
                        if (error) setError(null);
                    }}
                    maxLength={RESPUESTA_MAX}
                    rows={2}
                    autoFocus
                    disabled={responderMut.isPending}
                    placeholder="Escribe tu respuesta..."
                    className="w-full resize-none rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                />
                {error && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
                        <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                        {error}
                    </p>
                )}
                <div className="mt-1.5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setActivo(false);
                            setTexto('');
                            setError(null);
                        }}
                        disabled={responderMut.isPending}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 lg:cursor-pointer lg:hover:bg-slate-200 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        data-testid={`btn-enviar-respuesta-${preguntaId}`}
                        onClick={handleEnviar}
                        disabled={
                            texto.trim().length < RESPUESTA_MIN
                                || responderMut.isPending
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 px-3 py-1 text-xs font-bold text-white shadow-md shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed lg:cursor-pointer"
                    >
                        <Send className="h-3 w-3" strokeWidth={2.5} />
                        {responderMut.isPending ? 'Enviando...' : 'Responder'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE — AvatarUsuario (reutilizable)
// =============================================================================

interface AvatarUsuarioProps {
    avatarUrl: string | null;
    nombre: string;
    apellidos: string;
}

function AvatarUsuario({ avatarUrl, nombre, apellidos }: AvatarUsuarioProps) {
    const inicial = (nombre?.trim().charAt(0) ?? '').toUpperCase()
        + (apellidos?.trim().charAt(0) ?? '').toUpperCase();
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt=""
                aria-hidden
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
            />
        );
    }
    return (
        <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-slate-200"
            style={{
                background:
                    'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
            }}
            aria-hidden
        >
            {inicial || '··'}
        </div>
    );
}

export default SeccionPreguntasServicio;
