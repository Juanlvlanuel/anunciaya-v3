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

import { useMemo, useState } from 'react';
import {
    Trash2,
    MessageSquare,
    AlertCircle,
    Send,
    Loader2,
} from 'lucide-react';
import {
    usePreguntasArticulo,
    useResponderPregunta,
    useEliminarPregunta,
    useEliminarPreguntaMia,
    useEditarPreguntaPropia,
    useDerivarPreguntaAChat,
    useCrearPregunta,
} from '../../hooks/queries/useMarketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { BotonComentarista } from './BotonComentarista';
import { notificar } from '../../utils/notificaciones';
import {
    formatearTiempoRelativo,
    obtenerNombreCorto,
    agruparPorComprador,
    type GrupoConversacion,
} from '../../utils/marketplace';
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
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SeccionPreguntas({
    articuloId,
    vendedor,
    esDueno,
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
}

function VistaVisitante({
    articuloId,
    vendedor,
    preguntas,
    tieneMiPreguntaPendiente,
}: VistaVisitanteProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const eliminarMia = useEliminarPreguntaMia();
    const editarMia = useEditarPreguntaPropia();
    const crearPregunta = useCrearPregunta();

    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [textoEditando, setTextoEditando] = useState('');
    const [errorEditando, setErrorEditando] = useState<string | null>(null);
    const [textoPregunta, setTextoPregunta] = useState('');
    const [errorPregunta, setErrorPregunta] = useState<string | null>(null);

    const esDueno = !!usuarioActual && usuarioActual.id === vendedor.id;
    const puedeMostrarInput = !!usuarioActual && !esDueno;

    // Agrupamos por comprador igual que la vista del dueño (patrón ML).
    const grupos = useMemo(() => agruparPorComprador(preguntas), [preguntas]);

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

    const handleEnviarPregunta = async (e: React.FormEvent) => {
        e.preventDefault();
        const texto = textoPregunta.trim();
        if (texto.length < PREGUNTA_MIN) {
            setErrorPregunta(`Escribe al menos ${PREGUNTA_MIN} caracteres`);
            return;
        }
        if (texto.length > PREGUNTA_MAX) {
            setErrorPregunta(`Máximo ${PREGUNTA_MAX} caracteres`);
            return;
        }
        setErrorPregunta(null);
        try {
            await crearPregunta.mutateAsync({ articuloId, pregunta: texto });
            setTextoPregunta('');
            notificar.exito('Tu pregunta fue enviada. El vendedor responderá pronto.');
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const mensaje =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
                notificar.info('Ya tienes una pregunta en esta publicación');
                setTextoPregunta('');
            } else if (status === 422) {
                setErrorPregunta(mensaje ?? 'Tu pregunta contiene contenido no permitido');
            } else if (status === 403) {
                notificar.info('No puedes preguntar sobre tu propio artículo');
                setTextoPregunta('');
            } else {
                setErrorPregunta(mensaje ?? 'No se pudo enviar la pregunta. Intenta de nuevo.');
            }
        }
    };

    return (
        <div data-testid="seccion-preguntas-visitante" className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
                Preguntas sobre este artículo
                {preguntas.length > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-500">
                        ({preguntas.length})
                    </span>
                )}
            </h2>

            {preguntas.length === 0 && !tieneMiPreguntaPendiente ? (
                <p className="text-sm font-medium text-slate-600">
                    Sé el primero en preguntar sobre este artículo.
                </p>
            ) : (
                <div className="max-h-[500px] space-y-5 overflow-y-auto pr-1">
                    {grupos.map((grupo) => (
                        <GrupoConversacionVisitante
                            key={grupo.compradorId}
                            grupo={grupo}
                            vendedor={vendedor}
                            usuarioActualId={usuarioActual?.id ?? null}
                            editandoId={editandoId}
                            textoEditando={textoEditando}
                            errorEditando={errorEditando}
                            guardandoEdicion={editarMia.isPending}
                            onIniciarEdicion={(p) => handleIniciarEdicion(p.id, p.pregunta)}
                            onCancelarEdicion={handleCancelarEdicion}
                            onChangeTextoEdicion={(t) => {
                                setTextoEditando(t);
                                if (errorEditando) setErrorEditando(null);
                            }}
                            onGuardarEdicion={(id) => handleGuardarEdicion(id)}
                            onRetirar={(id) => handleRetirarMia(id)}
                        />
                    ))}
                </div>
            )}

            {/* Input inline "Hacer una pregunta" — mismo patrón pill que el feed
                (CardArticuloFeed). Solo visible para usuarios autenticados que
                no sean dueños del artículo. */}
            {puedeMostrarInput && (
                <form onSubmit={handleEnviarPregunta} className="pt-2">
                    <div className="flex items-center gap-2.5">
                        {/* Avatar usuario actual */}
                        {usuarioActual?.avatarUrl ? (
                            <img
                                src={usuarioActual.avatarUrl}
                                alt=""
                                aria-hidden="true"
                                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
                            />
                        ) : (
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-slate-200"
                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                aria-hidden="true"
                            >
                                {((usuarioActual?.nombre ?? '?').charAt(0) +
                                    (usuarioActual?.apellidos ?? '').charAt(0)).toUpperCase()}
                            </div>
                        )}

                        {/* Input pill */}
                        <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                            <input
                                type="text"
                                data-testid="input-hacer-pregunta"
                                value={textoPregunta}
                                onChange={(e) => {
                                    setTextoPregunta(e.target.value);
                                    if (errorPregunta) setErrorPregunta(null);
                                }}
                                placeholder="Hacer una pregunta..."
                                maxLength={PREGUNTA_MAX}
                                disabled={crearPregunta.isPending}
                                className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid="btn-enviar-pregunta"
                                disabled={
                                    crearPregunta.isPending ||
                                    textoPregunta.trim().length < PREGUNTA_MIN
                                }
                                aria-label="Enviar pregunta"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                    textoPregunta.trim().length >= PREGUNTA_MIN && !crearPregunta.isPending
                                        ? 'bg-teal-600 text-white shadow-sm lg:hover:bg-teal-700'
                                        : 'bg-transparent text-slate-400'
                                }`}
                            >
                                {crearPregunta.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Estado: contador + error */}
                    <div className="mt-1 flex items-center justify-between px-3 text-sm">
                        {errorPregunta ? (
                            <span className="flex items-center gap-1 text-rose-600">
                                <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                {errorPregunta}
                            </span>
                        ) : (
                            <span className="text-slate-600">
                                {textoPregunta.length > 0
                                    ? `${textoPregunta.length}/${PREGUNTA_MAX}`
                                    : ''}
                            </span>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}

// =============================================================================
// VISTA DUEÑO — agrupación por comprador (estilo Mercado Libre)
// =============================================================================
// Los helpers `obtenerNombreCorto`, `agruparPorComprador` y el tipo
// `GrupoConversacion` viven en `utils/marketplace.ts` para reusarse en el
// feed (CardArticuloFeed) sin duplicar lógica.

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

    const grupos = useMemo(
        () => agruparPorComprador([...pendientes, ...respondidas]),
        [pendientes, respondidas]
    );

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

            {total === 0 ? (
                <p className="text-sm font-medium text-slate-600">
                    Aún no hay preguntas sobre este artículo.
                </p>
            ) : (
                <div className="max-h-[500px] space-y-5 overflow-y-auto pr-1">
                    {grupos.map((grupo) => (
                        <GrupoConversacionDueno
                            key={grupo.compradorId}
                            grupo={grupo}
                            vendedor={vendedor}
                            preguntaRespondiendoId={preguntaRespondiendo?.id ?? null}
                            textoRespuesta={textoRespuesta}
                            errorRespuesta={errorRespuesta}
                            enviandoRespuesta={responderMutation.isPending}
                            cargandoDerivar={derivarMutation.isPending}
                            onIniciarRespuesta={(p) => {
                                setPreguntaRespondiendo(p);
                                setTextoRespuesta('');
                                setErrorRespuesta(null);
                            }}
                            onCancelarRespuesta={() => {
                                setPreguntaRespondiendo(null);
                                setTextoRespuesta('');
                                setErrorRespuesta(null);
                            }}
                            onChangeTextoRespuesta={(t) => {
                                setTextoRespuesta(t);
                                if (errorRespuesta) setErrorRespuesta(null);
                            }}
                            onPublicarRespuesta={handleResponder}
                            onDerivar={handleDerivarAChat}
                            onEliminar={handleEliminar}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// GRUPO CONVERSACIÓN DUEÑO — header (avatar + nombre + badge) + mensajes
// =============================================================================

interface GrupoConversacionDuenoProps {
    grupo: GrupoConversacion;
    vendedor: VendedorArticulo;
    preguntaRespondiendoId: string | null;
    textoRespuesta: string;
    errorRespuesta: string | null;
    enviandoRespuesta: boolean;
    cargandoDerivar: boolean;
    onIniciarRespuesta: (pregunta: PreguntaMarketplace) => void;
    onCancelarRespuesta: () => void;
    onChangeTextoRespuesta: (texto: string) => void;
    onPublicarRespuesta: () => void;
    onDerivar: (pregunta: PreguntaMarketplace) => void;
    onEliminar: (preguntaId: string) => void;
}

function GrupoConversacionDueno({
    grupo,
    vendedor,
    preguntaRespondiendoId,
    textoRespuesta,
    errorRespuesta,
    enviandoRespuesta,
    cargandoDerivar,
    onIniciarRespuesta,
    onCancelarRespuesta,
    onChangeTextoRespuesta,
    onPublicarRespuesta,
    onDerivar,
    onEliminar,
}: GrupoConversacionDuenoProps) {
    return (
        <div
            data-testid={`grupo-conversacion-${grupo.compradorId}`}
            className="rounded-xl border border-slate-300 bg-slate-50 p-3 lg:p-4"
        >
            {/* Badge "Pendiente" — sólo aparece si el grupo tiene preguntas
                sin responder. Se ancla arriba a la derecha del grupo para
                no robarle protagonismo a las burbujas del hilo. */}
            {grupo.tienePendientes && (
                <div className="flex justify-end pb-2">
                    <span
                        data-testid={`grupo-badge-pendiente-${grupo.compradorId}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Pendiente
                    </span>
                </div>
            )}

            {/* Lista de mensajes del hilo. */}
            <div className="space-y-4">
                {grupo.preguntas.map((p) => (
                    <MensajeDueno
                        key={p.id}
                        pregunta={p}
                        vendedor={vendedor}
                        enRespuesta={preguntaRespondiendoId === p.id}
                        textoRespuesta={preguntaRespondiendoId === p.id ? textoRespuesta : ''}
                        errorRespuesta={preguntaRespondiendoId === p.id ? errorRespuesta : null}
                        enviandoRespuesta={enviandoRespuesta}
                        cargandoDerivar={cargandoDerivar}
                        onResponder={() => onIniciarRespuesta(p)}
                        onDerivar={() => onDerivar(p)}
                        onEliminar={() => onEliminar(p.id)}
                        onChangeTextoRespuesta={onChangeTextoRespuesta}
                        onPublicarRespuesta={onPublicarRespuesta}
                        onCancelarRespuesta={onCancelarRespuesta}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// MENSAJE DUEÑO — pregunta + respuesta opcional + acciones (sin avatar comprador)
// =============================================================================

interface MensajeDuenoProps {
    pregunta: PreguntaMarketplace;
    vendedor: VendedorArticulo;
    enRespuesta: boolean;
    textoRespuesta: string;
    errorRespuesta: string | null;
    enviandoRespuesta: boolean;
    cargandoDerivar: boolean;
    onResponder: () => void;
    onDerivar: () => void;
    onEliminar: () => void;
    onChangeTextoRespuesta: (texto: string) => void;
    onPublicarRespuesta: () => void;
    onCancelarRespuesta: () => void;
}

function MensajeDueno({
    pregunta,
    vendedor,
    enRespuesta,
    textoRespuesta,
    errorRespuesta,
    enviandoRespuesta,
    cargandoDerivar,
    onResponder,
    onDerivar,
    onEliminar,
    onChangeTextoRespuesta,
    onPublicarRespuesta,
    onCancelarRespuesta,
}: MensajeDuenoProps) {
    const respondida = !!pregunta.respuesta;
    const RESPUESTA_MIN = 5;
    const RESPUESTA_MAX = 500;
    return (
        <div data-testid={`mensaje-dueno-${pregunta.id}`} className="text-sm">
            {/* Bubble pregunta — incluye nombre + 1er apellido del comprador
                (patrón Mercado Libre: cada burbuja se lee independiente). */}
            <div className="rounded-2xl bg-slate-200 px-3 py-1.5">
                <p className="text-sm font-semibold text-slate-900">
                    <BotonComentarista
                        usuarioId={pregunta.compradorId}
                        nombre={pregunta.compradorNombre}
                        apellidos={pregunta.compradorApellidos}
                        avatarUrl={pregunta.compradorAvatarUrl}
                        displayName={obtenerNombreCorto(pregunta.compradorNombre, pregunta.compradorApellidos)}
                        editado={!!pregunta.editadaAt}
                    />
                </p>
                <p className="text-sm font-medium text-slate-700">
                    {pregunta.pregunta}
                </p>
            </div>

            {/* Respuesta del vendedor — conectada visualmente con una "L"
                (línea vertical + horizontal en la esquina inferior izquierda
                del slot lateral) tal como hace Mercado Libre. */}
            {respondida && (
                <div className="mt-1.5 flex">
                    <div aria-hidden className="flex w-6 shrink-0">
                        <div className="h-3 w-3 border-b border-l border-slate-500" />
                    </div>
                    <div className="flex-1 rounded-2xl bg-teal-100 px-3 py-1.5 text-sm text-slate-800">
                        <p className="text-sm font-semibold text-teal-700">
                            <BotonComentarista
                                usuarioId={vendedor.id}
                                nombre={vendedor.nombre}
                                apellidos={vendedor.apellidos}
                                avatarUrl={vendedor.avatarUrl}
                                displayName={obtenerNombreCorto(vendedor.nombre, vendedor.apellidos)}
                            />
                        </p>
                        <p>{pregunta.respuesta}</p>
                    </div>
                </div>
            )}

            {/* Respuesta inline (modo escritura) — mismo patrón L sin avatar. */}
            {enRespuesta && !respondida && (
                <div className="mt-1.5 flex">
                    <div aria-hidden className="flex w-6 shrink-0">
                        <div className="h-3 w-3 border-b border-l border-slate-500" />
                    </div>
                    <div className="flex-1 rounded-2xl bg-teal-50 px-3 py-2 ring-2 ring-teal-200 focus-within:ring-teal-500">
                        <p className="text-sm font-semibold text-teal-700">
                            {obtenerNombreCorto(vendedor.nombre, vendedor.apellidos)}
                        </p>
                        <textarea
                            data-testid="textarea-respuesta"
                            value={textoRespuesta}
                            onChange={(e) => onChangeTextoRespuesta(e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            maxLength={RESPUESTA_MAX}
                            rows={3}
                            autoFocus
                            disabled={enviandoRespuesta}
                            className="mt-0.5 w-full resize-none bg-transparent text-sm font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-teal-200 pt-1.5">
                            {errorRespuesta ? (
                                <p className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                                    <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                                    {errorRespuesta}
                                </p>
                            ) : (
                                <span className="text-xs font-medium text-slate-500">
                                    {textoRespuesta.length}/{RESPUESTA_MAX}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    data-testid={`btn-cancelar-respuesta-${pregunta.id}`}
                                    onClick={onCancelarRespuesta}
                                    disabled={enviandoRespuesta}
                                    className="rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-50 lg:cursor-pointer lg:hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-publicar-respuesta-${pregunta.id}`}
                                    onClick={onPublicarRespuesta}
                                    disabled={
                                        enviandoRespuesta ||
                                        textoRespuesta.trim().length < RESPUESTA_MIN
                                    }
                                    className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 lg:cursor-pointer lg:hover:bg-teal-700"
                                >
                                    {enviandoRespuesta ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                                            Respondiendo…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" strokeWidth={2.5} />
                                            Responder
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Acciones administrativas — ocultas mientras se responde */}
            {!enRespuesta && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                    <span className="font-medium text-slate-500">
                        {formatearTiempoRelativo(pregunta.createdAt)}
                    </span>

                    {!respondida && (
                        <>
                            <span aria-hidden className="text-slate-400">·</span>
                            <button
                                data-testid={`btn-responder-${pregunta.id}`}
                                onClick={onResponder}
                                className="text-teal-700 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                            >
                                Responder
                            </button>
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
            )}
        </div>
    );
}

// =============================================================================
// GRUPO CONVERSACIÓN VISITANTE — misma estética que la del dueño, pero con
// acciones de comprador (editar / retirar) sobre las preguntas propias.
// =============================================================================

interface GrupoConversacionVisitanteProps {
    grupo: GrupoConversacion;
    vendedor: VendedorArticulo;
    usuarioActualId: string | null;
    editandoId: string | null;
    textoEditando: string;
    errorEditando: string | null;
    guardandoEdicion: boolean;
    onIniciarEdicion: (pregunta: PreguntaMarketplace) => void;
    onCancelarEdicion: () => void;
    onChangeTextoEdicion: (texto: string) => void;
    onGuardarEdicion: (preguntaId: string) => void;
    onRetirar: (preguntaId: string) => void;
}

function GrupoConversacionVisitante({
    grupo,
    vendedor,
    usuarioActualId,
    editandoId,
    textoEditando,
    errorEditando,
    guardandoEdicion,
    onIniciarEdicion,
    onCancelarEdicion,
    onChangeTextoEdicion,
    onGuardarEdicion,
    onRetirar,
}: GrupoConversacionVisitanteProps) {
    return (
        <div
            data-testid={`grupo-conversacion-vis-${grupo.compradorId}`}
            className="rounded-xl border border-slate-300 bg-slate-50 p-3 lg:p-4"
        >
            {grupo.tienePendientes && (
                <div className="flex justify-end pb-2">
                    <span
                        data-testid={`grupo-badge-pendiente-vis-${grupo.compradorId}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Pendiente
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {grupo.preguntas.map((p) => {
                    const esMia = !!usuarioActualId && p.compradorId === usuarioActualId;
                    const respondida = !!p.respuesta;
                    const puedeGestionar = esMia && !respondida;
                    const enEdicion = editandoId === p.id;
                    return (
                        <MensajeVisitante
                            key={p.id}
                            pregunta={p}
                            vendedor={vendedor}
                            puedeGestionar={puedeGestionar}
                            enEdicion={enEdicion}
                            textoEditando={enEdicion ? textoEditando : ''}
                            errorEditando={enEdicion ? errorEditando : null}
                            guardandoEdicion={guardandoEdicion}
                            onIniciarEdicion={() => onIniciarEdicion(p)}
                            onCancelarEdicion={onCancelarEdicion}
                            onChangeTextoEdicion={onChangeTextoEdicion}
                            onGuardarEdicion={() => onGuardarEdicion(p.id)}
                            onRetirar={() => onRetirar(p.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// MENSAJE VISITANTE — pregunta + respuesta opcional + acciones (editar/retirar)
// =============================================================================

interface MensajeVisitanteProps {
    pregunta: PreguntaMarketplace;
    vendedor: VendedorArticulo;
    puedeGestionar: boolean;
    enEdicion: boolean;
    textoEditando: string;
    errorEditando: string | null;
    guardandoEdicion: boolean;
    onIniciarEdicion: () => void;
    onCancelarEdicion: () => void;
    onChangeTextoEdicion: (texto: string) => void;
    onGuardarEdicion: () => void;
    onRetirar: () => void;
}

function MensajeVisitante({
    pregunta,
    vendedor,
    puedeGestionar,
    enEdicion,
    textoEditando,
    errorEditando,
    guardandoEdicion,
    onIniciarEdicion,
    onCancelarEdicion,
    onChangeTextoEdicion,
    onGuardarEdicion,
    onRetirar,
}: MensajeVisitanteProps) {
    const respondida = !!pregunta.respuesta;
    return (
        <div data-testid={`mensaje-vis-${pregunta.id}`} className="text-sm">
            {/* Bubble pregunta — nombre + 1er apellido del comprador + texto/textarea */}
            <div className="rounded-2xl bg-slate-200 px-3 py-1.5">
                <p className="text-sm font-semibold text-slate-900">
                    <BotonComentarista
                        usuarioId={pregunta.compradorId}
                        nombre={pregunta.compradorNombre}
                        apellidos={pregunta.compradorApellidos}
                        avatarUrl={pregunta.compradorAvatarUrl}
                        displayName={obtenerNombreCorto(pregunta.compradorNombre, pregunta.compradorApellidos)}
                        editado={!!pregunta.editadaAt && !enEdicion}
                    />
                </p>
                {enEdicion ? (
                    <div className="mt-1">
                        <textarea
                            data-testid={`edit-input-${pregunta.id}`}
                            value={textoEditando}
                            onChange={(e) => onChangeTextoEdicion(e.target.value)}
                            maxLength={PREGUNTA_MAX}
                            rows={2}
                            disabled={guardandoEdicion}
                            autoFocus
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

            {/* Respuesta del vendedor con conector L */}
            {respondida && !enEdicion && (
                <div className="mt-1.5 flex">
                    <div aria-hidden className="flex w-6 shrink-0">
                        <div className="h-3 w-3 border-b border-l border-slate-500" />
                    </div>
                    <div className="flex-1 rounded-2xl bg-teal-100 px-3 py-1.5 text-sm text-slate-800">
                        <p className="text-sm font-semibold text-teal-700">
                            <BotonComentarista
                                usuarioId={vendedor.id}
                                nombre={vendedor.nombre}
                                apellidos={vendedor.apellidos}
                                avatarUrl={vendedor.avatarUrl}
                                displayName={obtenerNombreCorto(vendedor.nombre, vendedor.apellidos)}
                            />
                        </p>
                        <p>{pregunta.respuesta}</p>
                    </div>
                </div>
            )}

            {/* Acciones inline para mi propia pregunta pendiente */}
            {puedeGestionar && !enEdicion && (
                <div className="mt-1.5 flex items-center gap-3 text-sm font-semibold">
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

            {/* Acciones en modo edición */}
            {enEdicion && (
                <div className="mt-1.5 flex items-center gap-3 text-sm font-semibold">
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
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                    {formatearTiempoRelativo(pregunta.createdAt)}
                </p>
            )}
        </div>
    );
}

