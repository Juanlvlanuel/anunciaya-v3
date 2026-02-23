/**
 * MenuContextualChat.tsx
 * =======================
 * Menú dropdown del botón ⋮ en el header de VentanaChat.
 * Opciones: Fijar, Silenciar, Archivar, Bloquear, Eliminar.
 *
 * - Se cierra al hacer click fuera o al seleccionar una opción
 * - Eliminar y Bloquear piden confirmación con SweetAlert2
 * - Las opciones se adaptan al estado actual (fijar/desfijar, etc.)
 *
 * UBICACIÓN: apps/web/src/components/chatya/MenuContextualChat.tsx
 */

import { useEffect, useRef } from 'react';
import { Pin, BellOff, Bell, Archive, ArchiveRestore, ShieldBan, Trash2, PinOff } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import type { Conversacion } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuContextualChatProps {
    conversacion: Conversacion;
    onCerrar: () => void;
    /** Si se pasa, el menú se posiciona fixed en esas coordenadas (para uso desde lista) */
    posicion?: { x: number; y: number };
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function MenuContextualChat({ conversacion, onCerrar, posicion }: MenuContextualChatProps) {
    const toggleFijar = useChatYAStore((s) => s.toggleFijar);
    const toggleSilenciar = useChatYAStore((s) => s.toggleSilenciar);
    const toggleArchivar = useChatYAStore((s) => s.toggleArchivar);
    const eliminarConversacion = useChatYAStore((s) => s.eliminarConversacion);
    const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
    const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
    const bloqueados = useChatYAStore((s) => s.bloqueados);
    const volverALista = useChatYAStore((s) => s.volverALista);

    const otroId = conversacion.otroParticipante?.id;
    const esBloqueado = bloqueados.some((b) => b.bloqueadoId === otroId);

    const menuRef = useRef<HTMLDivElement>(null);

    // ---------------------------------------------------------------------------
    // Cerrar al hacer click fuera del menú
    // ---------------------------------------------------------------------------
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onCerrar();
            }
        }

        // Delay para que el click que abrió el menú no lo cierre inmediatamente
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClick);
        }, 150);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClick);
        };
    }, [onCerrar]);

    // ---------------------------------------------------------------------------
    // Handlers: primero cerrar menú, luego ejecutar acción
    // ---------------------------------------------------------------------------
    const handleFijar = async () => {
        onCerrar();
        await toggleFijar(conversacion.id);
    };

    const handleSilenciar = async () => {
        onCerrar();
        await toggleSilenciar(conversacion.id);
    };

    const handleArchivar = async () => {
        onCerrar();
        await toggleArchivar(conversacion.id);
    };

    const handleBloquear = async () => {
        onCerrar();
        if (!otroId) return;
        if (esBloqueado) {
            await desbloquearUsuario(otroId);
        } else {
            await bloquearUsuario({ bloqueadoId: otroId });
        }
    };

    const handleEliminar = async () => {
        onCerrar();
        await eliminarConversacion(conversacion.id);
        volverALista();
    };

    // ---------------------------------------------------------------------------
    // Opciones del menú
    // ---------------------------------------------------------------------------
    const opciones = [
        {
            icono: conversacion.fijada ? PinOff : Pin,
            texto: conversacion.fijada ? 'Desfijar' : 'Fijar',
            onClick: handleFijar,
            destructivo: false,
        },
        {
            icono: conversacion.silenciada ? Bell : BellOff,
            texto: conversacion.silenciada ? 'Desilenciar' : 'Silenciar',
            onClick: handleSilenciar,
            destructivo: false,
        },
        {
            icono: conversacion.archivada ? ArchiveRestore : Archive,
            texto: conversacion.archivada ? 'Desarchivar' : 'Archivar',
            onClick: handleArchivar,
            destructivo: false,
        },
        {
            icono: ShieldBan,
            texto: esBloqueado ? 'Desbloquear' : 'Bloquear',
            onClick: handleBloquear,
            destructivo: !esBloqueado,
        },
        {
            icono: Trash2,
            texto: 'Eliminar chat',
            onClick: handleEliminar,
            destructivo: true,
        },
    ];

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div
            ref={menuRef}
            className={`${posicion ? 'fixed' : 'absolute right-2 top-full mt-1'} z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 overflow-hidden`}
            style={posicion ? { left: posicion.x, top: posicion.y } : undefined}
        >
            {opciones.map((opcion) => (
                <button
                    key={opcion.texto}
                    onClick={opcion.onClick}
                    className={`
            w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] font-medium cursor-pointer
            ${opcion.destructivo
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }
          `}
                >
                    <opcion.icono className={`w-4 h-4 shrink-0 ${opcion.destructivo ? 'text-red-400' : 'text-gray-400'}`} />
                    {opcion.texto}
                </button>
            ))}
        </div>
    );
}

export default MenuContextualChat;