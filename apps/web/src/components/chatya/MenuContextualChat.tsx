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
import { Pin, BellOff, Bell, Archive, ArchiveRestore, ShieldBan, Trash2, PinOff, UserPlus, UserMinus, Search } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import type { Conversacion } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuContextualChatProps {
    conversacion: Conversacion;
    onCerrar: () => void;
    /** Si se pasa, el menú se posiciona fixed en esas coordenadas (para uso desde lista) */
    posicion?: { x: number; y: number };
    /** Callback para abrir búsqueda dentro del chat (solo móvil) */
    onBuscar?: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function MenuContextualChat({ conversacion, onCerrar, posicion, onBuscar }: MenuContextualChatProps) {
    const toggleFijar = useChatYAStore((s) => s.toggleFijar);
    const toggleSilenciar = useChatYAStore((s) => s.toggleSilenciar);
    const toggleArchivar = useChatYAStore((s) => s.toggleArchivar);
    const eliminarConversacion = useChatYAStore((s) => s.eliminarConversacion);
    const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
    const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
    const bloqueados = useChatYAStore((s) => s.bloqueados);
    const volverALista = useChatYAStore((s) => s.volverALista);
    const contactos = useChatYAStore((s) => s.contactos);
    const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
    const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);

    const usuario = useAuthStore((s) => s.usuario);
    const miId = usuario?.id || '';
    const modoActivo = usuario?.modoActivo || 'personal';

    const otroId = conversacion.otroParticipante?.id;
    const esBloqueado = bloqueados.some((b) => b.bloqueadoId === otroId);

    // Derivar sucursalId del otro participante
    const otroSucursalId = conversacion.participante1Id === miId
        ? conversacion.participante2SucursalId
        : conversacion.participante1SucursalId;

    // Verificar si ya es contacto
    const contactoExistente = otroId
        ? contactos.find((c) =>
            c.contactoId === otroId &&
            c.tipo === modoActivo &&
            c.sucursalId === otroSucursalId
        )
        : undefined;

    const menuRef = useRef<HTMLDivElement>(null);

    // ---------------------------------------------------------------------------
    // Cerrar al hacer click fuera del menú
    // ---------------------------------------------------------------------------
    useEffect(() => {
        function handleCierreExterno(e: Event) {
            const target = e.target as HTMLElement;
            // Ignorar clicks en el botón que abre/cierra el menú
            if (target.closest?.('[data-menu-trigger="true"]')) return;
            if (menuRef.current && !menuRef.current.contains(target)) {
                onCerrar();
            }
        }

        // Delay generoso para ignorar eventos residuales del long press / touch
        const timer = setTimeout(() => {
            document.addEventListener('pointerdown', handleCierreExterno);
        }, 400);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('pointerdown', handleCierreExterno);
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

    const handleToggleContacto = async () => {
        onCerrar();
        if (!otroId) return;
        const otro = conversacion.otroParticipante;
        if (contactoExistente) {
            await eliminarContactoStore(contactoExistente.id);
        } else {
            await agregarContactoStore({
                contactoId: otroId,
                tipo: modoActivo as 'personal' | 'comercial',
                sucursalId: otroSucursalId || null,
            }, {
                nombre: otro?.nombre || '',
                apellidos: otro?.apellidos || '',
                avatarUrl: otro?.avatarUrl || otro?.negocioLogo || null,
                negocioNombre: otro?.negocioNombre,
                negocioLogo: otro?.negocioLogo,
                sucursalNombre: otro?.sucursalNombre,
            });
        }
    };

    // ---------------------------------------------------------------------------
    // Opciones del menú
    // ---------------------------------------------------------------------------
    const opciones = [
        // Buscar — solo visible en móvil (se pasa onBuscar desde VentanaChat)
        ...(onBuscar ? [{
            icono: Search,
            texto: 'Buscar',
            onClick: onBuscar,
            destructivo: false,
        }] : []),
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
            icono: contactoExistente ? UserMinus : UserPlus,
            texto: contactoExistente ? 'Quitar contacto' : 'Agregar contacto',
            onClick: handleToggleContacto,
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
            className={`${posicion ? 'fixed' : 'absolute right-2 top-full mt-1'} z-50 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 overflow-hidden`}
            style={posicion ? { left: posicion.x, top: posicion.y } : undefined}
        >
            {opciones.map((opcion) => (
                <button
                    key={opcion.texto}
                    onClick={opcion.onClick}
                    className={`
            w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium cursor-pointer
            ${opcion.destructivo
                            ? 'text-red-500 hover:bg-red-50 active:bg-red-100'
                            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }
          `}
                >
                    <opcion.icono className={`w-[18px] h-[18px] shrink-0 ${opcion.destructivo ? 'text-red-400' : 'text-gray-400'}`} />
                    {opcion.texto}
                </button>
            ))}
        </div>
    );
}

export default MenuContextualChat;