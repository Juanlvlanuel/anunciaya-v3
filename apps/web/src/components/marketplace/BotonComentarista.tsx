/**
 * BotonComentarista.tsx
 * ======================
 * Botón con el nombre de un usuario que comentó/preguntó en el feed.
 *
 *  - Click (todas las plataformas) → navega al perfil del usuario
 *    (`/marketplace/vendedor/:id`). El perfil maneja el caso "0 artículos"
 *    con un empty state, así que funciona aunque el usuario no haya
 *    publicado nada todavía.
 *  - Hover (solo desktop) → muestra un popup flotante con avatar +
 *    nombre completo + botón "Enviar mensaje" (abre ChatYA con el usuario
 *    como participante) + link "Ver perfil". En móvil NO se renderiza
 *    el popup — el tap directo va al perfil que ya tiene los CTAs.
 *
 * Patrón inspirado en LinkedIn / Slack: hover sobre nombre → mini-card.
 *
 * Ubicación: apps/web/src/components/marketplace/BotonComentarista.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, User } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';

interface BotonComentaristaProps {
    usuarioId: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    /**
     * Texto mostrado en el botón. Default = `nombre`. Útil cuando quieres
     * mostrar solo el primer nombre en el botón pero el popup debe mostrar
     * el nombre completo (ej. respuesta del vendedor: "Juan respondió" pero
     * el popup muestra "Juan Manuel Valenzuela Jabalera").
     */
    displayName?: string;
    /** Marca "(editada)" opcional al lado del nombre. */
    editado?: boolean;
}

export function BotonComentarista({
    usuarioId,
    nombre,
    apellidos,
    avatarUrl,
    displayName,
    editado = false,
}: BotonComentaristaProps) {
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    const botonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupAbierto, setPopupAbierto] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const irAPerfil = useCallback(() => {
        navigate(`/marketplace/vendedor/${usuarioId}`);
    }, [navigate, usuarioId]);

    const enviarMensaje = useCallback(() => {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }
        if (usuarioActual.id === usuarioId) {
            notificar.info('No puedes enviarte un mensaje a ti mismo');
            return;
        }
        abrirChatTemporal({
            id: `temp_comentarista_${usuarioId}_${Date.now()}`,
            otroParticipante: {
                id: usuarioId,
                nombre,
                apellidos,
                avatarUrl,
            },
            datosCreacion: {
                participante2Id: usuarioId,
                participante2Modo: 'personal',
                contextoTipo: 'vendedor_marketplace',
            },
        });
        abrirChatYA();
        setPopupAbierto(false);
    }, [usuarioActual, usuarioId, nombre, apellidos, avatarUrl, abrirChatTemporal, abrirChatYA]);

    /**
     * Abre el popup en la posición del cursor (estilo context menu nativo).
     * Solo se muestra en desktop (`hidden lg:block` en el render).
     * En móvil el `contextmenu` se previene pero no se abre el popup.
     */
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const POPUP_WIDTH = 240;
        const POPUP_HEIGHT_APROX = 130;
        // Anclar al cursor con clamp para no salirse de la pantalla.
        const top = Math.min(e.clientY, window.innerHeight - POPUP_HEIGHT_APROX - 8);
        const left = Math.min(e.clientX, window.innerWidth - POPUP_WIDTH - 8);
        setPopupPos({ top: Math.max(8, top), left: Math.max(8, left) });
        setPopupAbierto(true);
    }, []);

    // Cerrar al click fuera del popup o tecla Escape.
    useEffect(() => {
        if (!popupAbierto) return;
        const onClickFuera = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setPopupAbierto(false);
            }
        };
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPopupAbierto(false);
        };
        document.addEventListener('mousedown', onClickFuera);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onClickFuera);
            document.removeEventListener('keydown', onEscape);
        };
    }, [popupAbierto]);

    const inicial = (nombre.charAt(0) + (apellidos.charAt(0) ?? '')).toUpperCase() || '?';
    const nombreCompleto = `${nombre} ${apellidos}`.trim();

    return (
        <>
            <button
                ref={botonRef}
                type="button"
                data-testid={`comentarista-${usuarioId}`}
                onClick={irAPerfil}
                onContextMenu={handleContextMenu}
                className="text-left lg:cursor-pointer lg:hover:underline"
                title="Click para ver perfil · Click derecho para más opciones"
            >
                {displayName ?? nombre}
                {editado && (
                    <span className="ml-1.5 text-xs font-normal italic text-slate-500">
                        (editada)
                    </span>
                )}
            </button>

            {popupAbierto && createPortal(
                <div
                    ref={popupRef}
                    className="fixed z-[10010] hidden lg:block"
                    style={{ top: popupPos.top, left: popupPos.left, width: 240 }}
                >
                    <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-lg">
                        {/* Cabecera con avatar + nombre */}
                        <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-3">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                >
                                    {inicial}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-bold text-slate-900 leading-tight">
                                    {nombreCompleto}
                                </p>
                            </div>
                        </div>
                        {/* Acciones */}
                        <div className="border-t border-slate-200 p-1.5">
                            <button
                                type="button"
                                onClick={enviarMensaje}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-teal-700 lg:cursor-pointer lg:hover:bg-teal-100"
                            >
                                <MessageSquare className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                Enviar mensaje
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPopupAbierto(false); irAPerfil(); }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 lg:cursor-pointer lg:hover:bg-slate-200"
                            >
                                <User className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                Ver perfil
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default BotonComentarista;
