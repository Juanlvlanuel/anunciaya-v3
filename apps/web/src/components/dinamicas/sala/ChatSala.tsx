/**
 * ChatSala.tsx
 * =============
 * Chat en vivo de la sala — broadcast N:N sin destinatario (a diferencia de
 * `VentanaChat.tsx`, que es 1:1/negocio). Cada fila calca el patrón de
 * `ComentarioItem.tsx` (comentarios de MarketPlace): avatar clickeable →
 * `ModalImagenes`, nombre visible, y un menú ⋮ con "Contactar" que abre
 * ChatYA directo con esa persona (no aplica a tus propios mensajes).
 * Sin editar/eliminar/responder — acá es solo texto plano en vivo, sin hilos.
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/ChatSala.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Lock, MoreVertical } from 'lucide-react';
import { ModalImagenes } from '../../ui/ModalImagenes';
import { usePortalTarget } from '../../../hooks/usePortalTarget';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import { formatearTiempoRelativo } from '../../../utils/marketplace';
import type { MensajeSalaDinamica } from '../../../types/dinamicas';

interface ChatSalaProps {
    mensajes: MensajeSalaDinamica[];
    miUsuarioId: string | undefined;
    puedeEscribir: boolean;
    motivoBloqueo?: string | null;
    onEnviar: (contenido: string) => void;
}

// =============================================================================
// AVATAR (clickeable → ModalImagenes) — mismo patrón que AvatarComentario.
// =============================================================================

function AvatarMensajeSala({ nombre, apellidos, avatarUrl }: { nombre?: string; apellidos?: string; avatarUrl?: string | null }) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const inicial = ((nombre ?? '?').charAt(0) + (apellidos ?? '').charAt(0)).toUpperCase() || '?';

    return (
        <>
            <button
                type="button"
                onClick={() => avatarUrl && setModalAbierto(true)}
                aria-label={`Foto de ${nombre ?? ''} ${apellidos ?? ''}`.trim()}
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 lg:cursor-pointer"
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span
                        className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                        {inicial}
                    </span>
                )}
            </button>

            {modalAbierto && avatarUrl && (
                <ModalImagenes isOpen={modalAbierto} onClose={() => setModalAbierto(false)} images={[avatarUrl]} initialIndex={0} />
            )}
        </>
    );
}

// =============================================================================
// FILA DE MENSAJE
// =============================================================================

function FilaMensajeSala({ mensaje, esMio }: { mensaje: MensajeSalaDinamica; esMio: boolean }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [posMenu, setPosMenu] = useState<{ top: number; left: number } | null>(null);
    const btnMenuRef = useRef<HTMLButtonElement>(null);
    const panelMenuRef = useRef<HTMLDivElement>(null);
    const portalTarget = usePortalTarget();
    const iniciarChat = useIniciarChatDirectoPersona();

    useEffect(() => {
        if (!menuAbierto) return;
        const onFuera = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!btnMenuRef.current?.contains(t) && !panelMenuRef.current?.contains(t)) setMenuAbierto(false);
        };
        document.addEventListener('mousedown', onFuera);
        return () => document.removeEventListener('mousedown', onFuera);
    }, [menuAbierto]);

    function alternarMenu() {
        if (!menuAbierto && btnMenuRef.current) {
            const rect = btnMenuRef.current.getBoundingClientRect();
            setPosMenu({ top: rect.bottom + 4, left: Math.max(8, rect.right - 190) });
        }
        setMenuAbierto((v) => !v);
    }

    function contactar() {
        setMenuAbierto(false);
        iniciarChat({
            usuarioId: mensaje.usuarioId,
            nombre: mensaje.nombre ?? '',
            apellidos: mensaje.apellidos ?? '',
            avatarUrl: mensaje.avatarUrl ?? null,
        });
    }

    return (
        <div className="flex gap-2.5">
            <AvatarMensajeSala nombre={mensaje.nombre} apellidos={mensaje.apellidos} avatarUrl={mensaje.avatarUrl} />

            <div className="min-w-0 flex-1">
                <div className={`relative rounded-2xl bg-slate-200 px-3 py-1.5 ${!esMio ? 'pr-10' : ''}`}>
                    {!esMio && (
                        <div className="absolute right-1 top-1">
                            <button
                                ref={btnMenuRef}
                                type="button"
                                aria-label="Más opciones"
                                onClick={alternarMenu}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 active:bg-slate-300 lg:cursor-pointer lg:hover:bg-slate-300"
                            >
                                <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} />
                            </button>
                            {menuAbierto && posMenu && createPortal(
                                <div
                                    ref={panelMenuRef}
                                    style={{ position: 'fixed', top: posMenu.top, left: posMenu.left, zIndex: 60 }}
                                    className="min-w-[190px] overflow-hidden rounded-xl border border-slate-300 bg-white py-1.5 shadow-lg"
                                >
                                    <button
                                        type="button"
                                        onClick={contactar}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[15px] font-semibold text-slate-700 active:bg-slate-100 lg:cursor-pointer lg:hover:bg-slate-100"
                                    >
                                        <img src="/IconoRojoChatYA.webp" alt="" aria-hidden="true" className="h-7 w-auto shrink-0 object-contain" />
                                        Contactar
                                    </button>
                                </div>,
                                portalTarget,
                            )}
                        </div>
                    )}

                    <p className="text-xs font-bold text-slate-900">
                        {mensaje.nombre} {mensaje.apellidos}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm font-medium text-slate-700">{mensaje.contenido}</p>
                </div>
                <span className="mt-0.5 block px-1 text-[11px] font-medium text-slate-400">
                    {formatearTiempoRelativo(mensaje.createdAt)}
                </span>
            </div>
        </div>
    );
}

// =============================================================================
// CHAT
// =============================================================================

export function ChatSala({ mensajes, miUsuarioId, puedeEscribir, motivoBloqueo, onEnviar }: ChatSalaProps) {
    const [texto, setTexto] = useState('');
    const finRef = useRef<HTMLDivElement>(null);
    // La carga inicial del historial (0 → N mensajes, llega async por
    // socket un instante después del mount) NO debe hacer scroll — en
    // móvil el chat no tiene su propio contenedor con scroll fijo (eso solo
    // pasa en `lg:`), así que `scrollIntoView` termina arrastrando la
    // PÁGINA completa hacia abajo al entrar a la sala. Se compara contra el
    // largo ANTERIOR (no solo "primer render"): si venía de 0, es carga de
    // historial, no un mensaje nuevo en vivo.
    const largoAnteriorRef = useRef(0);

    useEffect(() => {
        const anterior = largoAnteriorRef.current;
        largoAnteriorRef.current = mensajes.length;
        if (anterior === 0) return;
        finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [mensajes.length]);

    function enviar() {
        const contenido = texto.trim();
        if (!contenido) return;
        onEnviar(contenido);
        setTexto('');
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-slate-300 bg-white">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {mensajes.length === 0 && (
                    <p className="py-6 text-center text-sm font-medium text-slate-400">Nadie ha escrito todavía — sé el primero.</p>
                )}
                {mensajes.map((m) =>
                    m.tipo === 'sistema' ? (
                        <div key={m.id} className="text-center text-xs font-semibold text-slate-400">
                            {m.contenido}
                        </div>
                    ) : (
                        <FilaMensajeSala key={m.id} mensaje={m} esMio={m.usuarioId === miUsuarioId} />
                    ),
                )}
                <div ref={finRef} />
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 p-2.5">
                {puedeEscribir ? (
                    <>
                        <input
                            data-testid="sala-chat-input"
                            type="text"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') enviar();
                            }}
                            maxLength={500}
                            placeholder="Escribe un mensaje…"
                            className="min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-amber-500 focus:bg-white"
                        />
                        <button
                            type="button"
                            data-testid="sala-chat-enviar"
                            onClick={enviar}
                            disabled={!texto.trim()}
                            aria-label="Enviar mensaje"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-40 lg:cursor-pointer lg:hover:bg-amber-600"
                        >
                            <Send className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                    </>
                ) : (
                    <div className="flex w-full items-center justify-center gap-1.5 py-1.5 text-sm font-semibold text-slate-400">
                        <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {motivoBloqueo ?? 'Inicia sesión para escribir en la sala'}
                    </div>
                )}
            </div>
        </div>
    );
}
