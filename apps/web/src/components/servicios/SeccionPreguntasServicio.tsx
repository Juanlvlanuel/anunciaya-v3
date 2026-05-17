/**
 * SeccionPreguntasServicio.tsx
 * ==============================
 * Q&A público del detalle del servicio. Versión simplificada inicial — más
 * adelante se puede migrar al patrón completo de MarketPlace (agrupación por
 * comprador, conector "L", privacidad de pendientes con badges).
 *
 * Por ahora:
 *  - Lista plana de preguntas con autor + texto + respuesta inline.
 *  - Form inline al final para crear pregunta nueva (solo si el caller NO es
 *    el dueño y está logueado).
 *  - Cada pregunta pendiente del dueño tiene textarea inline para responder.
 *  - El backend ya filtra privacidad: visitante anónimo ve solo respondidas,
 *    autor ve sus pendientes, dueño ve todas.
 *
 * Ubicación: apps/web/src/components/servicios/SeccionPreguntasServicio.tsx
 */

import { useState } from 'react';
import { Send } from 'lucide-react';
import {
    useCrearPreguntaServicio,
    usePreguntasServicio,
    useResponderPreguntaServicio,
} from '../../hooks/queries/useServicios';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo, obtenerNombreCorto } from '../../utils/servicios';
import type { PreguntaServicio, PublicacionDetalle } from '../../types/servicios';

interface SeccionPreguntasServicioProps {
    publicacion: PublicacionDetalle;
}

export function SeccionPreguntasServicio({
    publicacion,
}: SeccionPreguntasServicioProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const esDueno = usuarioActual?.id === publicacion.oferente.id;

    const { data: preguntas = [], isPending } = usePreguntasServicio(
        publicacion.id,
    );
    const crearMut = useCrearPreguntaServicio();

    const [textoNueva, setTextoNueva] = useState('');

    const handleCrearPregunta = async () => {
        const limpio = textoNueva.trim();
        if (limpio.length < 10) {
            notificar.advertencia(
                'La pregunta debe tener al menos 10 caracteres',
            );
            return;
        }
        try {
            await crearMut.mutateAsync({
                publicacionId: publicacion.id,
                pregunta: limpio,
            });
            setTextoNueva('');
            notificar.exito('Pregunta enviada');
        } catch {
            notificar.error('No pudimos enviar la pregunta');
        }
    };

    return (
        <section
            data-testid="seccion-preguntas-servicio"
            className="mt-5"
        >
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Preguntas y respuestas
            </div>

            {/* Form inline para preguntar (solo no-dueño, logueado) */}
            {!esDueno && usuarioActual && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                    <textarea
                        data-testid="textarea-nueva-pregunta-servicio"
                        value={textoNueva}
                        onChange={(e) => setTextoNueva(e.target.value)}
                        maxLength={200}
                        rows={2}
                        placeholder="¿Qué quieres preguntar sobre este servicio?"
                        className="w-full resize-none rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-500">
                            {textoNueva.length}/200
                        </span>
                        <button
                            data-testid="btn-enviar-pregunta-servicio"
                            type="button"
                            onClick={handleCrearPregunta}
                            disabled={
                                textoNueva.trim().length < 10 ||
                                crearMut.isPending
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed lg:cursor-pointer"
                        >
                            <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {crearMut.isPending ? 'Enviando...' : 'Preguntar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de preguntas */}
            {isPending ? (
                <p className="text-sm text-slate-500 py-4">Cargando preguntas...</p>
            ) : preguntas.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                    Aún no hay preguntas. {!esDueno && usuarioActual && '¡Haz la primera!'}
                </p>
            ) : (
                <div className="space-y-4">
                    {preguntas.map((p) => (
                        <PreguntaItem
                            key={p.id}
                            pregunta={p}
                            publicacionId={publicacion.id}
                            esDueno={esDueno}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// =============================================================================
// SUBCOMPONENTE — PreguntaItem
// =============================================================================

interface PreguntaItemProps {
    pregunta: PreguntaServicio;
    publicacionId: string;
    esDueno: boolean;
}

function PreguntaItem({ pregunta, publicacionId, esDueno }: PreguntaItemProps) {
    const responderMut = useResponderPreguntaServicio();
    const [respuestaTexto, setRespuestaTexto] = useState('');
    const [respondiendo, setRespondiendo] = useState(false);

    const nombreCorto = obtenerNombreCorto(
        pregunta.autor.nombre,
        pregunta.autor.apellidos,
    );
    const tiempo = formatearTiempoRelativo(pregunta.createdAt);

    const handleResponder = async () => {
        const limpio = respuestaTexto.trim();
        if (limpio.length < 5) {
            notificar.advertencia(
                'La respuesta debe tener al menos 5 caracteres',
            );
            return;
        }
        try {
            await responderMut.mutateAsync({
                preguntaId: pregunta.id,
                publicacionId,
                respuesta: limpio,
            });
            setRespuestaTexto('');
            setRespondiendo(false);
            notificar.exito('Respuesta enviada');
        } catch {
            notificar.error('No pudimos enviar la respuesta');
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-slate-200 grid place-items-center text-[10px] font-bold text-slate-600 overflow-hidden">
                    {pregunta.autor.avatarUrl ? (
                        <img
                            src={pregunta.autor.avatarUrl}
                            alt={nombreCorto}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        nombreCorto.charAt(0)
                    )}
                </div>
                <span className="text-[12px] font-bold text-slate-900">
                    {nombreCorto}
                </span>
                <span className="text-[11px] text-slate-500">· {tiempo}</span>
                {pregunta.pendiente && (
                    <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                        Pendiente
                    </span>
                )}
            </div>
            <div className="text-[13px] text-slate-800 font-medium leading-snug">
                {pregunta.pregunta}
            </div>

            {pregunta.respuesta && (
                <div className="mt-2 pl-3 border-l-2 border-sky-200 text-[13px] text-slate-700 leading-snug">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block mb-0.5">
                        Respuesta
                    </span>
                    {pregunta.respuesta}
                </div>
            )}

            {/* Form inline de respuesta (solo dueño, pregunta pendiente) */}
            {esDueno && !pregunta.respuesta && (
                <div className="mt-2">
                    {!respondiendo ? (
                        <button
                            type="button"
                            data-testid={`btn-responder-${pregunta.id}`}
                            onClick={() => setRespondiendo(true)}
                            className="text-[12px] font-bold text-sky-700 hover:text-sky-900 lg:cursor-pointer"
                        >
                            + Responder
                        </button>
                    ) : (
                        <div className="rounded-lg bg-slate-50 p-2">
                            <textarea
                                data-testid={`textarea-respuesta-${pregunta.id}`}
                                value={respuestaTexto}
                                onChange={(e) => setRespuestaTexto(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Escribe tu respuesta..."
                                className="w-full resize-none rounded-md border-2 border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500"
                            />
                            <div className="mt-1.5 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRespondiendo(false);
                                        setRespuestaTexto('');
                                    }}
                                    className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 lg:cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-enviar-respuesta-${pregunta.id}`}
                                    onClick={handleResponder}
                                    disabled={
                                        respuestaTexto.trim().length < 5 ||
                                        responderMut.isPending
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 px-3 py-1 text-xs font-bold text-white shadow-md shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed lg:cursor-pointer"
                                >
                                    <Send className="h-3 w-3" strokeWidth={2.5} />
                                    {responderMut.isPending
                                        ? 'Enviando...'
                                        : 'Responder'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SeccionPreguntasServicio;
