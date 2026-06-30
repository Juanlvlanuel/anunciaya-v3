/**
 * ComentarioItem.tsx
 * ==================
 * Render de un hilo de comentario (modelo nuevo: hilos de 1 nivel).
 *
 * Componente reutilizable — pensado para usarse igual en el detalle del
 * artículo (SeccionComentarios) y, más adelante, en el feed (CardArticuloFeed)
 * y al replicar a Servicios / Coyo.
 *
 *  - `ComentarioFila`: una fila (avatar clickeable → ModalImagenes, nombre
 *    clickeable → perfil + menú contextual vía BotonComentarista, etiqueta
 *    "Vendedor", texto/edición inline, acciones según permiso).
 *  - `ComentarioItem`: un comentario RAÍZ + sus respuestas anidadas + el
 *    input para responder.
 *
 * Permisos:
 *  - Editar: solo el autor (sin límite de tiempo).
 *  - Eliminar: el autor o el dueño del artículo (`vendedorId`).
 *  - Responder: cualquier usuario que pueda comentar (solo sobre raíces).
 *
 * Ubicación: apps/web/src/components/marketplace/ComentarioItem.tsx
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertCircle, Send, Loader2, CornerDownRight, Reply, Pencil, MoreVertical } from 'lucide-react';
import { BotonComentarista } from './BotonComentarista';
import { ModalImagenes } from '../ui/ModalImagenes';
import { useIniciarChatDirectoPersona } from '../../hooks/useIniciarChatDirectoPersona';
import { formatearTiempoRelativo, obtenerNombreCorto } from '../../utils/marketplace';
import type { Comentario } from '../../types/comentarios';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

/** Usuario actual mínimo necesario para los inputs/permisos. */
export interface UsuarioComentario {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
}

// =============================================================================
// AVATAR (clickeable → ModalImagenes; sin foto → perfil)
// =============================================================================

function AvatarComentario({
    autorId,
    nombre,
    apellidos,
    avatarUrl,
    tamano = 'md',
}: {
    autorId: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    tamano?: 'sm' | 'md';
}) {
    const navigate = useNavigate();
    const [modalAbierto, setModalAbierto] = useState(false);
    const dim = tamano === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
    const inicial =
        ((nombre ?? '?').charAt(0) + (apellidos ?? '').charAt(0)).toUpperCase() || '?';

    const onClick = useCallback(() => {
        if (avatarUrl) setModalAbierto(true);
        else navigate(`/marketplace/usuario/${autorId}`);
    }, [avatarUrl, navigate, autorId]);

    return (
        <>
            <button
                type="button"
                data-testid={`comentario-avatar-${autorId}`}
                onClick={onClick}
                aria-label={`Foto de ${nombre} ${apellidos}`.trim()}
                className={`${dim} shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 lg:cursor-pointer`}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span
                        className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                    >
                        {inicial}
                    </span>
                )}
            </button>

            {modalAbierto && avatarUrl && (
                <ModalImagenes
                    isOpen={modalAbierto}
                    onClose={() => setModalAbierto(false)}
                    images={[avatarUrl]}
                    initialIndex={0}
                />
            )}
        </>
    );
}

// =============================================================================
// FILA DE COMENTARIO (raíz o respuesta)
// =============================================================================

interface ComentarioFilaProps {
    comentario: Comentario;
    vendedorId: string;
    usuarioActual: UsuarioComentario | null;
    /** Texto de la etiqueta cuando el autor es el dueño (ej. "Vendedor", "Autor"). */
    etiquetaAutor: string;
    /** Edita el comentario. Devuelve true si se guardó. */
    onEditar: (id: string, texto: string) => Promise<boolean>;
    onEliminar: (id: string) => void;
    /** Si se provee, muestra el botón "Responder" (solo en raíces). */
    onResponder?: () => void;
    tamanoAvatar?: 'sm' | 'md';
}

function ComentarioFila({
    comentario,
    vendedorId,
    usuarioActual,
    etiquetaAutor,
    onEditar,
    onEliminar,
    onResponder,
    tamanoAvatar = 'md',
}: ComentarioFilaProps) {
    const [editando, setEditando] = useState(false);
    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const iniciarChat = useIniciarChatDirectoPersona();

    const esAutor = !!usuarioActual && usuarioActual.id === comentario.autorId;
    const puedeEliminar =
        !!usuarioActual && (esAutor || usuarioActual.id === vendedorId);
    // Contactar por ChatYA al autor de un comentario ajeno.
    const puedeContactar = !!usuarioActual && !esAutor;
    // Acciones que en móvil se agrupan en el menú ⋮ (Responder queda fuera).
    const tieneAccionesMenu = puedeContactar || esAutor || puedeEliminar;

    const contactar = () =>
        void iniciarChat({
            usuarioId: comentario.autorId,
            nombre: comentario.autorNombre,
            apellidos: comentario.autorApellidos,
            avatarUrl: comentario.autorAvatarUrl,
        });

    // Cerrar el menú ⋮ al hacer click fuera.
    useEffect(() => {
        if (!menuAbierto) return;
        const onFuera = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', onFuera);
        return () => document.removeEventListener('mousedown', onFuera);
    }, [menuAbierto]);

    const iniciarEdicion = () => {
        setTexto(comentario.texto);
        setError(null);
        setEditando(true);
    };
    const cancelarEdicion = () => {
        setEditando(false);
        setTexto('');
        setError(null);
    };
    const guardar = async () => {
        const limpio = texto.trim();
        if (limpio.length < TEXTO_MIN) {
            setError(`Escribe al menos ${TEXTO_MIN} caracteres`);
            return;
        }
        setGuardando(true);
        const ok = await onEditar(comentario.id, limpio);
        setGuardando(false);
        if (ok) cancelarEdicion();
        else setError('No se pudo guardar');
    };

    return (
        <div data-testid={`comentario-${comentario.id}`} className="flex gap-2.5">
            <AvatarComentario
                autorId={comentario.autorId}
                nombre={comentario.autorNombre}
                apellidos={comentario.autorApellidos}
                avatarUrl={comentario.autorAvatarUrl}
                tamano={tamanoAvatar}
            />

            <div className="min-w-0 flex-1">
                {/* Burbuja: nombre + etiqueta + texto/edición */}
                <div
                    className={`relative rounded-2xl bg-slate-200 px-3 py-1.5 ${
                        tieneAccionesMenu && !editando ? 'pr-10' : ''
                    }`}
                >
                    {/* Menú ⋮ — SOLO móvil. Agrupa Contactar/Editar/Eliminar
                        (Responder queda visible fuera, en la fila de acciones). */}
                    {tieneAccionesMenu && !editando && (
                        <div ref={menuRef} className="absolute right-1 top-1">
                            <button
                                type="button"
                                data-testid={`comentario-menu-${comentario.id}`}
                                aria-label="Más opciones"
                                onClick={() => setMenuAbierto((v) => !v)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 active:bg-slate-300 lg:cursor-pointer lg:hover:bg-slate-300"
                            >
                                <MoreVertical className="h-5 w-5" strokeWidth={2} />
                            </button>
                            {menuAbierto && (
                                <div className="absolute right-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                    {puedeContactar && (
                                        <button
                                            type="button"
                                            data-testid={`comentario-menu-contactar-${comentario.id}`}
                                            onClick={() => {
                                                setMenuAbierto(false);
                                                contactar();
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 active:bg-slate-100 lg:cursor-pointer lg:hover:bg-slate-100"
                                        >
                                            <img
                                                src="/IconoRojoChatYA.webp"
                                                alt=""
                                                aria-hidden="true"
                                                className="h-6 w-auto shrink-0 object-contain"
                                            />
                                            Contactar
                                        </button>
                                    )}
                                    {esAutor && (
                                        <button
                                            type="button"
                                            data-testid={`comentario-menu-editar-${comentario.id}`}
                                            onClick={() => {
                                                setMenuAbierto(false);
                                                iniciarEdicion();
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 active:bg-slate-100 lg:cursor-pointer lg:hover:bg-slate-100"
                                        >
                                            <Pencil className="h-4 w-4" strokeWidth={2.5} />
                                            Editar
                                        </button>
                                    )}
                                    {puedeEliminar && (
                                        <button
                                            type="button"
                                            data-testid={`comentario-menu-eliminar-${comentario.id}`}
                                            onClick={() => {
                                                setMenuAbierto(false);
                                                onEliminar(comentario.id);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 active:bg-slate-100 lg:cursor-pointer lg:hover:bg-slate-100"
                                        >
                                            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-900">
                        <BotonComentarista
                            usuarioId={comentario.autorId}
                            nombre={comentario.autorNombre}
                            apellidos={comentario.autorApellidos}
                            avatarUrl={comentario.autorAvatarUrl}
                            displayName={obtenerNombreCorto(
                                comentario.autorNombre,
                                comentario.autorApellidos
                            )}
                            editado={!!comentario.editadoAt && !editando}
                        />
                        {comentario.esVendedor && (
                            <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-700">
                                {etiquetaAutor}
                            </span>
                        )}
                    </p>

                    {editando ? (
                        <div className="mt-1">
                            <textarea
                                data-testid={`comentario-edit-${comentario.id}`}
                                value={texto}
                                onChange={(e) => {
                                    setTexto(e.target.value);
                                    if (error) setError(null);
                                }}
                                maxLength={TEXTO_MAX}
                                rows={2}
                                autoFocus
                                disabled={guardando}
                                className="w-full resize-none rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-base font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                            />
                            {error && (
                                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
                                    <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                                    {error}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap break-words text-sm font-medium text-slate-700">
                            {comentario.texto}
                        </p>
                    )}
                </div>

                {/* Acciones */}
                {editando ? (
                    <div className="mt-1.5 flex items-center gap-3 text-sm font-semibold">
                        <button
                            type="button"
                            data-testid={`comentario-guardar-${comentario.id}`}
                            onClick={guardar}
                            disabled={guardando || texto.trim().length < TEXTO_MIN}
                            className="text-teal-700 disabled:opacity-50 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                        >
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                        <span aria-hidden className="text-slate-400">·</span>
                        <button
                            type="button"
                            data-testid={`comentario-cancelar-${comentario.id}`}
                            onClick={cancelarEdicion}
                            className="text-slate-600 lg:cursor-pointer lg:hover:text-slate-800 lg:hover:underline"
                        >
                            Cancelar
                        </button>
                        <span className="ml-auto text-xs font-medium text-slate-500">
                            {texto.length}/{TEXTO_MAX}
                        </span>
                    </div>
                ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm font-semibold">
                        <span className="font-medium text-slate-500">
                            {formatearTiempoRelativo(comentario.createdAt)}
                        </span>
                        {onResponder && !!usuarioActual && (
                            <button
                                type="button"
                                data-testid={`comentario-responder-${comentario.id}`}
                                onClick={onResponder}
                                className="ml-auto flex items-center gap-1 text-teal-700 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                            >
                                <Reply className="h-3 w-3" strokeWidth={2.5} />
                                Responder
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// INPUT DE RESPUESTA (inline bajo un hilo)
// =============================================================================

function InputRespuesta({
    usuarioActual,
    enviando,
    onEnviar,
    onCancelar,
}: {
    usuarioActual: UsuarioComentario | null;
    enviando: boolean;
    onEnviar: (texto: string) => Promise<boolean>;
    onCancelar: () => void;
}) {
    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        const limpio = texto.trim();
        if (limpio.length < TEXTO_MIN) {
            setError(`Escribe al menos ${TEXTO_MIN} caracteres`);
            return;
        }
        const ok = await onEnviar(limpio);
        if (ok) {
            setTexto('');
            setError(null);
        }
    };

    return (
        <form onSubmit={enviar} className="mt-2 flex gap-2.5">
            <AvatarComentario
                autorId={usuarioActual?.id ?? ''}
                nombre={usuarioActual?.nombre ?? '?'}
                apellidos={usuarioActual?.apellidos ?? ''}
                avatarUrl={usuarioActual?.avatarUrl ?? null}
                tamano="sm"
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                    <input
                        type="text"
                        data-testid="comentario-input-respuesta"
                        value={texto}
                        onChange={(e) => {
                            setTexto(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="Escribe una respuesta…"
                        maxLength={TEXTO_MAX}
                        autoFocus
                        disabled={enviando}
                        className="flex-1 bg-transparent py-1 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        data-testid="comentario-enviar-respuesta"
                        disabled={enviando || texto.trim().length < TEXTO_MIN}
                        aria-label="Enviar respuesta"
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                            texto.trim().length >= TEXTO_MIN && !enviando
                                ? 'bg-teal-600 text-white shadow-sm lg:hover:bg-teal-700'
                                : 'bg-transparent text-slate-400'
                        }`}
                    >
                        {enviando ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        ) : (
                            <Send className="h-4 w-4" strokeWidth={2.5} />
                        )}
                    </button>
                </div>
                <div className="mt-1 flex items-center justify-between px-3 text-sm">
                    {error ? (
                        <span className="flex items-center gap-1 text-rose-600">
                            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {error}
                        </span>
                    ) : (
                        <span className="text-slate-500">
                            {texto.length > 0 ? `${texto.length}/${TEXTO_MAX}` : ''}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="font-semibold text-slate-500 lg:cursor-pointer lg:hover:text-slate-700"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </form>
    );
}

// =============================================================================
// HILO: comentario raíz + respuestas + input de responder
// =============================================================================

export interface ComentarioItemProps {
    comentario: Comentario;
    vendedorId: string;
    usuarioActual: UsuarioComentario | null;
    /** Texto de la etiqueta del dueño. Default "Vendedor" (MP); "Autor" en Servicios. */
    etiquetaAutor?: string;
    /** Si el usuario puede escribir (autenticado y en modo personal). */
    puedeComentar: boolean;
    enviandoRespuesta: boolean;
    onEditar: (id: string, texto: string) => Promise<boolean>;
    onEliminar: (id: string) => void;
    /** Crea una respuesta colgada de este hilo. Devuelve true si se publicó. */
    onResponder: (parentId: string, texto: string) => Promise<boolean>;
}

export function ComentarioItem({
    comentario,
    vendedorId,
    usuarioActual,
    etiquetaAutor = 'Vendedor',
    puedeComentar,
    enviandoRespuesta,
    onEditar,
    onEliminar,
    onResponder,
}: ComentarioItemProps) {
    const [respondiendo, setRespondiendo] = useState(false);

    return (
        <div
            data-testid={`hilo-comentario-${comentario.id}`}
            className="rounded-xl border border-slate-300 bg-slate-50 p-3 lg:p-4"
        >
            <ComentarioFila
                comentario={comentario}
                vendedorId={vendedorId}
                usuarioActual={usuarioActual}
                etiquetaAutor={etiquetaAutor}
                onEditar={onEditar}
                onEliminar={onEliminar}
                onResponder={puedeComentar ? () => setRespondiendo((v) => !v) : undefined}
            />

            {/* Respuestas anidadas (1 nivel) — indentadas con un conector. */}
            {(comentario.respuestas.length > 0 || respondiendo) && (
                <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 lg:pl-4">
                    {comentario.respuestas.map((r) => (
                        <ComentarioFila
                            key={r.id}
                            comentario={r}
                            vendedorId={vendedorId}
                            usuarioActual={usuarioActual}
                            etiquetaAutor={etiquetaAutor}
                            onEditar={onEditar}
                            onEliminar={onEliminar}
                            tamanoAvatar="sm"
                        />
                    ))}

                    {respondiendo && (
                        <div className="flex items-start gap-2">
                            <CornerDownRight
                                className="mt-2 h-4 w-4 shrink-0 text-slate-400"
                                strokeWidth={2}
                                aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                                <InputRespuesta
                                    usuarioActual={usuarioActual}
                                    enviando={enviandoRespuesta}
                                    onEnviar={async (texto) => {
                                        const ok = await onResponder(comentario.id, texto);
                                        if (ok) setRespondiendo(false);
                                        return ok;
                                    }}
                                    onCancelar={() => setRespondiendo(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ComentarioItem;
