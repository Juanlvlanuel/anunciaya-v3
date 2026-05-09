/**
 * SeccionPreguntas.tsx
 * =====================
 * Sección de Q&A en el detalle del artículo (P2).
 *
 * Patrón visual unificado con el feed (CardArticuloFeed v1.3):
 *  - Cada pregunta se renderiza con avatar del comprador a la izquierda
 *    + bubble bg-slate-200 con el nombre clickeable (BotonComentarista
 *    → P3 perfil) + texto.
 *  - Si está respondida: avatar del vendedor + bubble bg-teal-100 con
 *    su respuesta debajo, indentado.
 *  - Si está pendiente: leyenda "Pendiente de respuesta" inline.
 *  - Si la pregunta es del usuario actual y aún pendiente: botones
 *    inline Editar / Retirar (sin bloque amarillo separado).
 *
 * Vistas:
 *  - VistaVisitante: usuarios externos (incluyendo el autor de la
 *    pregunta). Muestran TODAS las preguntas (respondidas + pendientes).
 *  - VistaDueno: el vendedor con acciones administrativas (Responder,
 *    Mensaje privado, Eliminar) sobre cada pregunta.
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
    AlertCircle,
} from 'lucide-react';
import {
    usePreguntasArticulo,
    useResponderPregunta,
    useEliminarPregunta,
    useEliminarPreguntaMia,
    useEditarPreguntaPropia,
    useDerivarPreguntaAChat,
} from '../../hooks/queries/useMarketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { BotonComentarista } from './BotonComentarista';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type {
    PreguntaMarketplace,
    PreguntasParaVendedor,
    PreguntasVisitante,
    VendedorArticulo,
} from '../../types/marketplace';

const PREGUNTA_MIN = 5;
const PREGUNTA_MAX = 200;

// =============================================================================
// PROPS
// =============================================================================

interface SeccionPreguntasProps {
    articuloId: string;
    /** Datos del vendedor — necesarios para renderizar avatar + nombre
     *  clickeable en las respuestas. Vienen de `articulo.vendedor`. */
    vendedor: VendedorArticulo;
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
    vendedor,
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
                vendedor={vendedor}
                pendientes={pendientes}
                respondidas={respondidas}
                total={total}
            />
        );
    }

    const visitanteData = data as PreguntasVisitante | undefined;
    const preguntas = visitanteData?.preguntas ?? [];
    const miPreguntaPendiente = visitanteData?.miPreguntaPendiente ?? null;

    return (
        <VistaVisitante
            articuloId={articuloId}
            vendedor={vendedor}
            preguntas={preguntas}
            tieneMiPreguntaPendiente={!!miPreguntaPendiente}
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
    vendedor: VendedorArticulo;
    preguntas: PreguntaMarketplace[];
    tieneMiPreguntaPendiente: boolean;
    usuarioAutenticado: boolean;
    onAbrirModalPregunta: () => void;
}

const MAX_PREGUNTAS_VISIBLES = 2;

function VistaVisitante({
    articuloId,
    vendedor,
    preguntas,
    tieneMiPreguntaPendiente,
    usuarioAutenticado,
    onAbrirModalPregunta,
}: VistaVisitanteProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const eliminarMia = useEliminarPreguntaMia();
    const editarMia = useEditarPreguntaPropia();

    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [textoEditando, setTextoEditando] = useState('');
    const [errorEditando, setErrorEditando] = useState<string | null>(null);
    const [expandidas, setExpandidas] = useState(false);

    // Mostrar las primeras 2 preguntas; el resto detrás de "Ver más".
    const preguntasVisibles = expandidas
        ? preguntas
        : preguntas.slice(0, MAX_PREGUNTAS_VISIBLES);
    const preguntasOcultas = preguntas.length - preguntasVisibles.length;

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

    const handleIniciarEdicion = (id: string, texto: string) => {
        setEditandoId(id);
        setTextoEditando(texto);
        setErrorEditando(null);
    };

    const handleCancelarEdicion = () => {
        setEditandoId(null);
        setTextoEditando('');
        setErrorEditando(null);
    };

    const handleGuardarEdicion = async (id: string) => {
        const texto = textoEditando.trim();
        if (texto.length < PREGUNTA_MIN) {
            setErrorEditando(`Mínimo ${PREGUNTA_MIN} caracteres`);
            return;
        }
        try {
            await editarMia.mutateAsync({ preguntaId: id, articuloId, pregunta: texto });
            handleCancelarEdicion();
            notificar.exito('Pregunta actualizada');
        } catch (e) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
                notificar.info('No puedes editar una pregunta ya respondida');
                handleCancelarEdicion();
            } else if (status === 422) {
                setErrorEditando(msg ?? 'Tu pregunta contiene contenido no permitido');
            } else {
                setErrorEditando(msg ?? 'No se pudo guardar');
            }
        }
    };

    return (
        <div data-testid="seccion-preguntas-visitante" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                    Preguntas sobre este artículo
                    {preguntas.length > 0 && (
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                            ({preguntas.length})
                        </span>
                    )}
                </h2>
                {/* Botón "Hacer una pregunta" — el backend permite múltiples
                    preguntas por usuario por artículo (constraint único
                    eliminado 07-may-2026), por lo que no hay límite. */}
                <button
                    data-testid="btn-hacer-pregunta"
                    onClick={onAbrirModalPregunta}
                    title="Hacer una pregunta sobre este artículo"
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-3 py-2 text-xs font-bold text-white shadow-md lg:hover:brightness-110 lg:text-sm"
                >
                    <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                    Hacer una pregunta
                </button>
            </div>

            {preguntas.length === 0 && !tieneMiPreguntaPendiente ? (
                <p className="text-sm font-medium text-slate-600">
                    Sé el primero en preguntar sobre este artículo.
                </p>
            ) : (
                <>
                    <div className="space-y-4">
                        {preguntasVisibles.map((p) => {
                            const esMia = !!usuarioActual && p.compradorId === usuarioActual.id;
                            const respondida = !!p.respuesta;
                            const puedeGestionar = esMia && !respondida;
                            const enEdicion = editandoId === p.id;
                            return (
                                <FilaPregunta
                                    key={p.id}
                                    pregunta={p}
                                    vendedor={vendedor}
                                    puedeGestionar={puedeGestionar}
                                    enEdicion={enEdicion}
                                    textoEditando={textoEditando}
                                    errorEditando={errorEditando}
                                    guardandoEdicion={editarMia.isPending}
                                    onChangeTextoEdicion={(t) => {
                                        setTextoEditando(t);
                                        if (errorEditando) setErrorEditando(null);
                                    }}
                                    onIniciarEdicion={() => handleIniciarEdicion(p.id, p.pregunta)}
                                    onCancelarEdicion={handleCancelarEdicion}
                                    onGuardarEdicion={() => handleGuardarEdicion(p.id)}
                                    onRetirar={() => handleRetirarMia(p.id)}
                                />
                            );
                        })}
                    </div>

                    {/* "Ver N preguntas más" / "Ver menos" — patrón del feed. */}
                    {preguntasOcultas > 0 && (
                        <button
                            type="button"
                            data-testid="btn-ver-mas-preguntas"
                            onClick={() => setExpandidas(true)}
                            className="text-sm font-semibold text-teal-700 lg:cursor-pointer lg:hover:underline"
                        >
                            Ver {preguntasOcultas}{' '}
                            {preguntasOcultas === 1 ? 'pregunta más' : 'preguntas más'}
                        </button>
                    )}
                    {expandidas && preguntas.length > MAX_PREGUNTAS_VISIBLES && (
                        <button
                            type="button"
                            data-testid="btn-ver-menos-preguntas"
                            onClick={() => setExpandidas(false)}
                            className="text-sm font-semibold text-slate-600 lg:cursor-pointer lg:hover:underline"
                        >
                            Ver menos
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

// =============================================================================
// VISTA DUEÑO
// =============================================================================

interface VistaDuenoProps {
    articuloId: string;
    vendedor: VendedorArticulo;
    pendientes: PreguntaMarketplace[];
    respondidas: PreguntaMarketplace[];
    total: number;
}

function VistaDueno({ articuloId, vendedor, pendientes, respondidas, total }: VistaDuenoProps) {
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
            <h2 className="text-base font-bold text-slate-900">
                Preguntas sobre tu artículo
                {total > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-500">
                        ({total})
                    </span>
                )}
            </h2>

            {/* Pendientes */}
            {pendientes.length > 0 && (
                <div className="space-y-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                        <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Pendientes de responder ({pendientes.length})
                    </p>
                    <div className="space-y-4">
                        {pendientes.map((p) => (
                            <FilaPreguntaDueno
                                key={p.id}
                                pregunta={p}
                                vendedor={vendedor}
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
                <div className="space-y-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Respondidas ({respondidas.length})
                    </p>
                    <div className="space-y-4">
                        {respondidas.map((p) => (
                            <FilaPreguntaDueno
                                key={p.id}
                                pregunta={p}
                                vendedor={vendedor}
                                onEliminar={() => handleEliminar(p.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {total === 0 && (
                <p className="text-sm font-medium text-slate-600">
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
                    <div data-testid="modal-responder-pregunta" className="space-y-4">
                        <div className="rounded-lg border-2 border-slate-300 bg-slate-100 px-3 py-2">
                            <p className="text-xs font-semibold text-slate-600">
                                Pregunta de {preguntaRespondiendo.compradorNombre} {preguntaRespondiendo.compradorApellidos}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                                {preguntaRespondiendo.pregunta}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <textarea
                                data-testid="textarea-respuesta"
                                value={textoRespuesta}
                                onChange={(e) => setTextoRespuesta(e.target.value)}
                                placeholder="Escribe tu respuesta..."
                                maxLength={500}
                                rows={4}
                                className="w-full resize-none rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-500 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                            />
                            <div className="flex items-center justify-between">
                                {errorRespuesta ? (
                                    <p className="text-xs font-semibold text-rose-600">{errorRespuesta}</p>
                                ) : (
                                    <span />
                                )}
                                <span className="text-xs font-medium text-slate-500">
                                    {textoRespuesta.length}/500
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setPreguntaRespondiendo(null)}
                                className="cursor-pointer rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 lg:hover:bg-slate-200"
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
                                className="cursor-pointer rounded-lg bg-linear-to-br from-teal-600 to-teal-800 px-4 py-2 text-sm font-bold text-white shadow-md disabled:opacity-50 lg:hover:brightness-110"
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
// FILA PREGUNTA — patrón visual del feed (avatar + bubble + BotonComentarista)
// =============================================================================

interface FilaPreguntaProps {
    pregunta: PreguntaMarketplace;
    vendedor: VendedorArticulo;
    /** Si el visitante puede gestionar (editar/retirar) esta pregunta. */
    puedeGestionar?: boolean;
    /** Si está en modo edición inline. */
    enEdicion?: boolean;
    textoEditando?: string;
    errorEditando?: string | null;
    guardandoEdicion?: boolean;
    onChangeTextoEdicion?: (texto: string) => void;
    onIniciarEdicion?: () => void;
    onCancelarEdicion?: () => void;
    onGuardarEdicion?: () => void;
    onRetirar?: () => void;
}

function FilaPregunta({
    pregunta,
    vendedor,
    puedeGestionar = false,
    enEdicion = false,
    textoEditando = '',
    errorEditando = null,
    guardandoEdicion = false,
    onChangeTextoEdicion,
    onIniciarEdicion,
    onCancelarEdicion,
    onGuardarEdicion,
    onRetirar,
}: FilaPreguntaProps) {
    const respondida = !!pregunta.respuesta;
    return (
        <div data-testid={`pregunta-${pregunta.id}`} className="text-sm">
            {/* Bloque pregunta */}
            <div className="flex gap-2">
                <AvatarComprador pregunta={pregunta} />
                <div className="flex-1 rounded-2xl bg-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">
                        <BotonComentarista
                            usuarioId={pregunta.compradorId}
                            nombre={pregunta.compradorNombre}
                            apellidos={pregunta.compradorApellidos}
                            avatarUrl={pregunta.compradorAvatarUrl}
                            editado={!!pregunta.editadaAt && !enEdicion}
                        />
                    </p>
                    {enEdicion ? (
                        <div className="mt-1">
                            <textarea
                                data-testid={`edit-input-${pregunta.id}`}
                                value={textoEditando}
                                onChange={(e) => onChangeTextoEdicion?.(e.target.value)}
                                maxLength={PREGUNTA_MAX}
                                rows={2}
                                disabled={guardandoEdicion}
                                className="w-full resize-none rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-base font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                            />
                            {errorEditando && (
                                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
                                    <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                                    {errorEditando}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-slate-700">{pregunta.pregunta}</p>
                    )}
                </div>
            </div>

            {/* Respuesta del vendedor */}
            {respondida && !enEdicion && (
                <div className="mt-1.5 ml-9 flex gap-2">
                    <AvatarVendedor vendedor={vendedor} />
                    <div className="flex-1 rounded-2xl bg-teal-100 px-3 py-2 text-sm text-slate-800">
                        <p className="text-sm font-semibold text-teal-700">
                            <BotonComentarista
                                usuarioId={vendedor.id}
                                nombre={vendedor.nombre}
                                apellidos={vendedor.apellidos}
                                avatarUrl={vendedor.avatarUrl}
                                displayName={vendedor.nombre.split(' ')[0]}
                            />
                        </p>
                        <p>{pregunta.respuesta}</p>
                    </div>
                </div>
            )}

            {/* Pendiente — leyenda inline */}
            {!respondida && !enEdicion && (
                <p className="mt-1 ml-9 text-sm font-medium italic text-slate-600">
                    Pendiente de respuesta
                </p>
            )}

            {/* Acciones inline para mi propia pregunta pendiente */}
            {puedeGestionar && !enEdicion && (
                <div className="mt-1 ml-9 flex items-center gap-3 text-sm font-semibold">
                    <button
                        type="button"
                        data-testid={`btn-editar-pregunta-${pregunta.id}`}
                        onClick={onIniciarEdicion}
                        className="text-slate-700 lg:cursor-pointer lg:hover:text-teal-700 lg:hover:underline"
                    >
                        Editar
                    </button>
                    <span aria-hidden className="text-slate-400">·</span>
                    <button
                        type="button"
                        data-testid={`btn-retirar-pregunta-${pregunta.id}`}
                        onClick={onRetirar}
                        className="flex items-center gap-1 text-rose-600 lg:cursor-pointer lg:hover:text-rose-700 lg:hover:underline"
                    >
                        <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                        Retirar
                    </button>
                </div>
            )}

            {/* Acciones inline durante edición */}
            {enEdicion && (
                <div className="mt-1 ml-9 flex items-center gap-3 text-sm font-semibold">
                    <button
                        type="button"
                        data-testid={`btn-guardar-edicion-${pregunta.id}`}
                        onClick={onGuardarEdicion}
                        disabled={guardandoEdicion || textoEditando.trim().length < PREGUNTA_MIN}
                        className="text-teal-700 disabled:opacity-50 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                    >
                        {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                    </button>
                    <span aria-hidden className="text-slate-400">·</span>
                    <button
                        type="button"
                        data-testid={`btn-cancelar-edicion-${pregunta.id}`}
                        onClick={onCancelarEdicion}
                        className="text-slate-600 lg:cursor-pointer lg:hover:text-slate-800 lg:hover:underline"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* Tiempo */}
            {!enEdicion && (
                <p className="mt-1 ml-9 text-xs font-medium text-slate-500">
                    {formatearTiempoRelativo(pregunta.createdAt)}
                </p>
            )}
        </div>
    );
}

// =============================================================================
// FILA PREGUNTA DUEÑO — mismo patrón visual + acciones administrativas
// =============================================================================

interface FilaPreguntaDuenoProps {
    pregunta: PreguntaMarketplace;
    vendedor: VendedorArticulo;
    onResponder?: () => void;
    onDerivar?: () => void;
    onEliminar: () => void;
    cargandoDerivar?: boolean;
}

function FilaPreguntaDueno({
    pregunta,
    vendedor,
    onResponder,
    onDerivar,
    onEliminar,
    cargandoDerivar,
}: FilaPreguntaDuenoProps) {
    const respondida = !!pregunta.respuesta;
    return (
        <div data-testid={`pregunta-dueno-${pregunta.id}`} className="text-sm">
            {/* Bloque pregunta */}
            <div className="flex gap-2">
                <AvatarComprador pregunta={pregunta} />
                <div className="flex-1 rounded-2xl bg-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">
                        <BotonComentarista
                            usuarioId={pregunta.compradorId}
                            nombre={pregunta.compradorNombre}
                            apellidos={pregunta.compradorApellidos}
                            avatarUrl={pregunta.compradorAvatarUrl}
                            editado={!!pregunta.editadaAt}
                        />
                    </p>
                    <p className="text-sm font-medium text-slate-700">{pregunta.pregunta}</p>
                </div>
            </div>

            {/* Respuesta del vendedor (si aplica) */}
            {respondida && (
                <div className="mt-1.5 ml-9 flex gap-2">
                    <AvatarVendedor vendedor={vendedor} />
                    <div className="flex-1 rounded-2xl bg-teal-100 px-3 py-2 text-sm text-slate-800">
                        <p className="text-sm font-semibold text-teal-700">
                            <BotonComentarista
                                usuarioId={vendedor.id}
                                nombre={vendedor.nombre}
                                apellidos={vendedor.apellidos}
                                avatarUrl={vendedor.avatarUrl}
                                displayName={vendedor.nombre.split(' ')[0]}
                            />
                        </p>
                        <p>{pregunta.respuesta}</p>
                    </div>
                </div>
            )}

            {/* Acciones administrativas */}
            <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="font-medium text-slate-500">
                    {formatearTiempoRelativo(pregunta.createdAt)}
                </span>

                {!respondida && onResponder && (
                    <>
                        <span aria-hidden className="text-slate-400">·</span>
                        <button
                            data-testid={`btn-responder-${pregunta.id}`}
                            onClick={onResponder}
                            className="text-teal-700 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                        >
                            Responder
                        </button>
                        {onDerivar && (
                            <>
                                <span aria-hidden className="text-slate-400">·</span>
                                <button
                                    data-testid={`btn-derivar-${pregunta.id}`}
                                    onClick={onDerivar}
                                    disabled={cargandoDerivar}
                                    title="Abre un chat privado con el comprador. La pregunta sigue visible públicamente."
                                    className="flex items-center gap-1 text-slate-700 disabled:opacity-50 lg:cursor-pointer lg:hover:text-slate-900 lg:hover:underline"
                                >
                                    <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
                                    Mensaje privado
                                </button>
                            </>
                        )}
                    </>
                )}

                <span aria-hidden className="text-slate-400">·</span>
                <button
                    data-testid={`btn-eliminar-pregunta-${pregunta.id}`}
                    onClick={onEliminar}
                    className="flex items-center gap-1 text-rose-600 lg:cursor-pointer lg:hover:text-rose-700 lg:hover:underline"
                >
                    <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                    Eliminar
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// AVATARES — helpers visuales para uniformidad con el feed
// =============================================================================

function AvatarComprador({ pregunta }: { pregunta: PreguntaMarketplace }) {
    if (pregunta.compradorAvatarUrl) {
        return (
            <img
                src={pregunta.compradorAvatarUrl}
                alt={pregunta.compradorNombre}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
        );
    }
    const inicial = (pregunta.compradorNombre ?? '?').charAt(0).toUpperCase();
    return (
        <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
            style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            }}
        >
            {inicial}
        </div>
    );
}

function AvatarVendedor({ vendedor }: { vendedor: VendedorArticulo }) {
    if (vendedor.avatarUrl) {
        return (
            <img
                src={vendedor.avatarUrl}
                alt={vendedor.nombre}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
        );
    }
    const iniciales = (vendedor.nombre.charAt(0) + vendedor.apellidos.charAt(0)).toUpperCase();
    return (
        <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
            style={{
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
            }}
        >
            {iniciales}
        </div>
    );
}
