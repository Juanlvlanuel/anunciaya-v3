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
import { Pin, VolumeX, Volume2, Archive, ArchiveRestore, ShieldBan, Trash2, PinOff } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import Swal from 'sweetalert2';
import type { Conversacion } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuContextualChatProps {
    conversacion: Conversacion;
    onCerrar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function MenuContextualChat({ conversacion, onCerrar }: MenuContextualChatProps) {
    const toggleFijar = useChatYAStore((s) => s.toggleFijar);
    const toggleSilenciar = useChatYAStore((s) => s.toggleSilenciar);
    const toggleArchivar = useChatYAStore((s) => s.toggleArchivar);
    const eliminarConversacion = useChatYAStore((s) => s.eliminarConversacion);
    const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
    const volverALista = useChatYAStore((s) => s.volverALista);

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
        if (!conversacion.archivada) {
            volverALista();
        }
    };

    const handleBloquear = async () => {
        onCerrar();
        const otroNombre = conversacion.otroParticipante?.negocioNombre
            || `${conversacion.otroParticipante?.nombre || ''} ${conversacion.otroParticipante?.apellidos || ''}`.trim()
            || 'este usuario';

        const resultado = await Swal.fire({
            title: '¿Bloquear?',
            text: `No recibirás mensajes de ${otroNombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, bloquear',
            cancelButtonText: 'Cancelar',
        });

        if (resultado.isConfirmed) {
            const otroId = conversacion.otroParticipante?.id;
            if (otroId) {
                await bloquearUsuario({ bloqueadoId: otroId });
                volverALista();
            }
        }
    };

    const handleEliminar = async () => {
        onCerrar();
        const resultado = await Swal.fire({
            title: '¿Eliminar chat?',
            text: 'Se eliminará de tu lista. El otro participante aún podrá ver la conversación.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (resultado.isConfirmed) {
            await eliminarConversacion(conversacion.id);
            volverALista();
        }
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
            icono: conversacion.silenciada ? Volume2 : VolumeX,
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
            texto: 'Bloquear',
            onClick: handleBloquear,
            destructivo: true,
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
            className="absolute right-2 top-full mt-1 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 overflow-hidden"
        >
            {opciones.map((opcion) => (
                <button
                    key={opcion.texto}
                    onClick={opcion.onClick}
                    className={`
            w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium cursor-pointer
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