/**
 * SeccionPreguntas.tsx
 * =====================
 * Sección de preguntas y respuestas en el detalle del artículo.
 *
 * - Vista visitante: preguntas respondidas + botón "Hacer una pregunta"
 * - Vista dueño: pendientes (Responder / Por chat / Eliminar) + respondidas
 *
 * Sprint 9.2 — doc: docs/reportes/Sprint-9.2-Plan-Implementacion.md
 *
 * Ubicación: apps/web/src/components/marketplace/SeccionPreguntas.tsx
 */

import { useState } from 'react';
import {
    MessageCircle,
    Clock,
    CheckCircle2,
    Trash2,
    MessageSquare,
} from 'lucide-react';
import {
    usePreguntasArticulo,
    useResponderPregunta,
    useEliminarPregunta,
    useEliminarPreguntaMia,
    useDerivarPreguntaAChat,
} from '../../hooks/queries/useMarketplace';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type {
    MiPreguntaPendiente,
    PreguntaMarketplace,
    PreguntasParaVendedor,
    PreguntasVisitante,
} from '../../types/marketplace';

// =============================================================================
// PROPS
// =============================================================================

interface SeccionPreguntasProps {
    articuloId: string;
    esDueno: boolean;
    /** Para verificar si el visitante está autenticado antes de preguntar */
    usuarioAutenticado: boolean;
    onAbrirModalPregunta: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionPreguntas({
    articuloId,
    esDueno,
    usuarioAutenticado,
    onAbrirModalPregunta,
}: SeccionPreguntasProps) {
    const { data, isLoading } = usePreguntasArticulo(articuloId, esDueno);

    if (isLoading) return null;

    if (esDueno) {
        const vendedorData = data as PreguntasParaVendedor | undefined;
        const pendientes = vendedorData?.pendientes ?? [];
        const respondidas = vendedorData?.respondidas ?? [];
        const total = pendientes.length + respondidas.length;

        return (
            <VistaDueno
                articuloId={articuloId}
                pendientes={pendientes}
                respondidas={respondidas}
                total={total}
            />
        );
    }

    const visitanteData = data as PreguntasVisitante | undefined;
    const publicas = visitanteData?.respondidas ?? [];
    const miPreguntaPendiente = visitanteData?.miPreguntaPendiente ?? null;

    return (
        <VistaVisitante
            articuloId={articuloId}
            preguntas={publicas}
            miPreguntaPendiente={miPreguntaPendiente}
            usuarioAutenticado={usuarioAutenticado}
            onAbrirModalPregunta={onAbrirModalPregunta}
        />
    );
}

// =============================================================================
// VISTA VISITANTE
// =============================================================================

interface VistaVisitanteProps {
    articuloId: string;
    preguntas: PreguntaMarketplace[];
    miPreguntaPendiente: MiPreguntaPendiente | null;
    usuarioAutenticado: boolean;
    onAbrirModalPregunta: () => void;
}

function VistaVisitante({
    articuloId,
    preguntas,
    miPreguntaPendiente,
    usuarioAutenticado,
    onAbrirModalPregunta,
}: VistaVisitanteProps) {
    const eliminarMia = useEliminarPreguntaMia();

    const handleRetirarMia = (preguntaId: string) => {
        eliminarMia.mutate(
            { preguntaId, articuloId },
            {
                onSuccess: () => notificar.exito('Pregunta retirada'),
                onError: (e) => {
                    const status = (e as { response?: { status?: number } })?.response?.status;
                    if (status === 409) {
                        notificar.info('No puedes retirar una pregunta ya respondida');
                    } else {
                        notificar.error('No se pudo retirar la pregunta');
                    }
                },
            }
        );
    };

    return (
        <div data-testid="seccion-preguntas-visitante" className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 lg:text-lg">
                    Preguntas sobre este artículo
                    {preguntas.length > 0 && (
                        <span className="ml-1.5 text-slate-500 font-normal text-sm">
                            ({preguntas.length})
                        </span>
                    )}
                </h2>
                {/* Si el usuario ya tiene pregunta pendiente, ocultamos el CTA
                    de hacer pregunta (la regla de negocio limita 1 por usuario
                    por artículo y el backend rebotaría con 409). */}
                {!miPreguntaPendiente && (
                    <button
                        data-testid="btn-hacer-pregunta"
                        onClick={onAbrirModalPregunta}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                        Hacer una pregunta
                    </button>
                )}
            </div>

            {/* Bloque "Tu pregunta está pendiente" — solo si el visitante
                autenticado tiene una pregunta sin responder en este artículo. */}
            {miPreguntaPendiente && (
                <div
                    data-testid="mi-pregunta-pendiente"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                    <div className="flex items-start gap-2">
                        <Clock
                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                            strokeWidth={2}
                        />
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <strong className="text-sm font-semibold text-amber-900">
                                    Tu pregunta está pendiente
                                </strong>
                                <span className="text-xs text-amber-700">
                                    {formatearTiempoRelativo(miPreguntaPendiente.createdAt)}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-amber-900">
                                &quot;{miPreguntaPendiente.pregunta}&quot;
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                                El vendedor aún no responde. Será visible para todos cuando lo haga.
                            </p>
                            <button
                                data-testid="btn-retirar-mi-pregunta"
                                onClick={() => handleRetirarMia(miPreguntaPendiente.id)}
                                disabled={eliminarMia.isPending}
                                className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-md text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                            >
                                <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                                Retirar pregunta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {preguntas.length === 0 ? (
                !miPreguntaPendiente && (
                    <p className="text-sm text-slate-500">
                        Sé el primero en preguntar sobre este artículo.
                    </p>
                )
            ) : (
                <div className="divide-y divide-slate-100">
                    {preguntas.map((p) => (
                        <FilaPreguntaPublica
                            key={p.id}
                            pregunta={p}
                            onEliminarMia={handleRetirarMia}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// VISTA DUEÑO
// =============================================================================

interface VistaDuenoProps {
    articuloId: string;
    pendientes: PreguntaMarketplace[];
    respondidas: PreguntaMarketplace[];
    total: number;
}

function VistaDueno({ articuloId, pendientes, respondidas, total }: VistaDuenoProps) {
    const [preguntaRespondiendo, setPreguntaRespondiendo] =
        useState<PreguntaMarketplace | null>(null);
    const responderMutation = useResponderPregunta();
    const [textoRespuesta, setTextoRespuesta] = useState('');
    const [errorRespuesta, setErrorRespuesta] = useState<string | null>(null);

    const eliminarMutation = useEliminarPregunta();
    const derivarMutation = useDerivarPreguntaAChat();

    const handleResponder = async () => {
        if (!preguntaRespondiendo) return;
        setErrorRespuesta(null);
        try {
            await responderMutation.mutateAsync({
                preguntaId: preguntaRespondiendo.id,
                articuloId,
                respuesta: textoRespuesta.trim(),
            });
            notificar.exito('Respuesta publicada');
            setPreguntaRespondiendo(null);
            setTextoRespuesta('');
        } catch (e) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            const mensaje =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
                notificar.info('Esta pregunta ya fue respondida');
            } else if (status === 422) {
                setErrorRespuesta(mensaje ?? 'Tu respuesta contiene contenido no permitido');
            } else {
                notificar.error('No se pudo publicar la respuesta');
            }
        }
    };

    const handleEliminar = (preguntaId: string) => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        eliminarMutation.mutate(
            { preguntaId, articuloId },
            {
                onSuccess: () => notificar.exito('Pregunta eliminada'),
                onError: () => notificar.error('No se pudo eliminar la pregunta'),
            }
        );
    };

    const handleDerivarAChat = (pregunta: PreguntaMarketplace) => {
        derivarMutation.mutate(
            { preguntaId: pregunta.id, articuloId },
            {
                onSuccess: (resp) => {
                    const { compradorId, compradorNombre, compradorApellidos, compradorAvatarUrl, articuloId: artId } =
                        resp.data;
                    useChatYAStore.getState().abrirChatTemporal({
                        id: `temp_pregunta_${pregunta.id}_${Date.now()}`,
                        otroParticipante: {
                            id: compradorId,
                            nombre: compradorNombre,
                            apellidos: compradorApellidos,
                            avatarUrl: compradorAvatarUrl,
                        },
                        datosCreacion: {
                            participante2Id: compradorId,
                            participante2Modo: 'personal',
                            contextoTipo: 'marketplace',
                            contextoReferenciaId: artId,
                        },
                    });
                    useUiStore.getState().abrirChatYA();
                },
                onError: () => notificar.error('No se pudo abrir el chat'),
            }
        );
    };

    return (
        <div data-testid="seccion-preguntas-dueno" className="space-y-5">
            <h2 className="text-base font-bold text-slate-900 lg:text-lg">
                Preguntas sobre tu artículo
                {total > 0 && (
                    <span className="ml-1.5 text-slate-500 font-normal text-sm">
                        ({total})
                    </span>
                )}
            </h2>

            {/* Pendientes */}
            {pendientes.length > 0 && (
                <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                        <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Pendientes de responder ({pendientes.length})
                    </p>
                    <div className="divide-y divide-slate-100">
                        {pendientes.map((p) => (
                            <FilaPreguntaDueno
                                key={p.id}
                                pregunta={p}
                                variante="pendiente"
                                onResponder={() => {
                                    setPreguntaRespondiendo(p);
                                    setTextoRespuesta('');
                                    setErrorRespuesta(null);
                                }}
                                onDerivar={() => handleDerivarAChat(p)}
                                onEliminar={() => handleEliminar(p.id)}
                                cargandoDerivar={derivarMutation.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Respondidas */}
            {respondidas.length > 0 && (
                <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Respondidas ({respondidas.length})
                    </p>
                    <div className="divide-y divide-slate-100">
                        {respondidas.map((p) => (
                            <FilaPreguntaDueno
                                key={p.id}
                                pregunta={p}
                                variante="respondida"
                                onEliminar={() => handleEliminar(p.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {total === 0 && (
                <p className="text-sm text-slate-500">
                    Aún no hay preguntas sobre este artículo.
                </p>
            )}

            {/* Modal responder (inline) */}
            {preguntaRespondiendo && (
                <ModalAdaptativo
                    abierto
                    onCerrar={() => setPreguntaRespondiendo(null)}
                    titulo="Responder pregunta"
                    ancho="md"
                >
                    <div
                        data-testid="modal-responder-pregunta"
                        className="space-y-4"
                    >
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">Pregunta de {preguntaRespondiendo.compradorNombre}</p>
                            <p className="text-sm text-slate-800">
                                {preguntaRespondiendo.pregunta}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <textarea
                                    data-testid="textarea-respuesta"
                                    value={textoRespuesta}
                                    onChange={(e) => setTextoRespuesta(e.target.value)}
                                    placeholder="Escribe tu respuesta..."
                                    maxLength={500}
                                    rows={4}
                                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                {errorRespuesta ? (
                                    <p className="text-xs text-rose-600">{errorRespuesta}</p>
                                ) : (
                                    <span />
                                )}
                                <span className="text-xs text-slate-400">
                                    {textoRespuesta.length}/500
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setPreguntaRespondiendo(null)}
                                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                data-testid="btn-publicar-respuesta"
                                onClick={handleResponder}
                                disabled={
                                    textoRespuesta.trim().length < 5 ||
                                    responderMutation.isPending
                                }
                                className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                            >
                                {responderMutation.isPending ? 'Publicando…' : 'Publicar respuesta'}
                            </button>
                        </div>
                    </div>
                </ModalAdaptativo>
            )}
        </div>
    );
}

// =============================================================================
// FILA PREGUNTA PÚBLICA
// =============================================================================

interface FilaPreguntaPublicaProps {
    pregunta: PreguntaMarketplace;
    onEliminarMia: (id: string) => void;
}

function FilaPreguntaPublica({ pregunta, onEliminarMia }: FilaPreguntaPublicaProps) {
    return (
        <div
            data-testid={`pregunta-${pregunta.id}`}
            className="py-3"
        >
            <p className="text-sm font-semibold text-slate-900">{pregunta.pregunta}</p>
            {pregunta.respuesta && (
                <p className="mt-1 text-sm text-slate-600">{pregunta.respuesta}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span>{pregunta.compradorNombre}</span>
                <span aria-hidden>·</span>
                <span>{formatearTiempoRelativo(pregunta.createdAt)}</span>
                {!pregunta.respondidaAt && (
                    <>
                        <span aria-hidden>·</span>
                        <button
                            onClick={() => onEliminarMia(pregunta.id)}
                            className="cursor-pointer text-rose-500 transition-colors hover:text-rose-700"
                        >
                            Retirar pregunta
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// FILA PREGUNTA DUEÑO
// =============================================================================

interface FilaPreguntaDuenoProps {
    pregunta: PreguntaMarketplace;
    variante: 'pendiente' | 'respondida';
    onResponder?: () => void;
    onDerivar?: () => void;
    onEliminar: () => void;
    cargandoDerivar?: boolean;
}

function FilaPreguntaDueno({
    pregunta,
    variante,
    onResponder,
    onDerivar,
    onEliminar,
    cargandoDerivar,
}: FilaPreguntaDuenoProps) {
    return (
        <div
            data-testid={`pregunta-dueno-${pregunta.id}`}
            className="py-3"
        >
            <p className="text-sm font-semibold text-slate-900">{pregunta.pregunta}</p>

            {pregunta.respuesta && (
                <p className="mt-1 text-sm text-slate-600">{pregunta.respuesta}</p>
            )}

            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <span>{pregunta.compradorNombre}</span>
                <span aria-hidden>·</span>
                <span>{formatearTiempoRelativo(pregunta.createdAt)}</span>

                {variante === 'pendiente' && (
                    <>
                        <span aria-hidden>·</span>
                        <button
                            data-testid={`btn-responder-${pregunta.id}`}
                            onClick={onResponder}
                            className="cursor-pointer text-teal-600 transition-colors hover:text-teal-800"
                        >
                            Responder
                        </button>
                        <span aria-hidden>·</span>
                        <button
                            data-testid={`btn-derivar-${pregunta.id}`}
                            onClick={onDerivar}
                            disabled={cargandoDerivar}
                            title="Abre un chat privado con el comprador. La pregunta sigue visible públicamente."
                            aria-label="Responder por mensaje privado en ChatYA. La pregunta pública se conserva."
                            className="flex cursor-pointer items-center gap-0.5 text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
                        >
                            <MessageSquare className="h-3 w-3" strokeWidth={2} />
                            Mensaje privado
                        </button>
                    </>
                )}

                <span aria-hidden>·</span>
                <button
                    data-testid={`btn-eliminar-pregunta-${pregunta.id}`}
                    onClick={onEliminar}
                    className="flex cursor-pointer items-center gap-0.5 text-rose-500 transition-colors hover:text-rose-700"
                >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                    Eliminar
                </button>
            </div>
        </div>
    );
}
