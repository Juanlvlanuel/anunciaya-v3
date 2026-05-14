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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pin, BellOff, Archive, ArchiveRestore, ShieldBan, Trash2, PinOff, UserPlus, UserMinus, Search } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useChatYASession } from '../../hooks/useChatYASession';
import type { Conversacion } from '../../types/chatya';
import {
    conversacionBloqueada,
    esConversacionConNegocio,
} from '../../utils/bloqueos';

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
    const desbloquearSucursal = useChatYAStore((s) => s.desbloquearSucursal);
    const bloqueados = useChatYAStore((s) => s.bloqueados);
    const volverALista = useChatYAStore((s) => s.volverALista);
    const contactos = useChatYAStore((s) => s.contactos);
    const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
    const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);

    const { miId, modo: modoActivo } = useChatYASession();

    const otroId = conversacion.otroParticipante?.id;
    // Discriminado: persona ↔ persona vs persona ↔ sucursal. El bloqueo aplica
    // a ambos casos pero contra entradas distintas en BD.
    const esChatConNegocio = esConversacionConNegocio(conversacion, miId);
    const esBloqueado = conversacionBloqueada(conversacion, miId, bloqueados);

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
    const [posAjustada, setPosAjustada] = useState(posicion);

    // ---------------------------------------------------------------------------
    // Autoposicionar: medir altura real y ajustar si no cabe abajo
    // ---------------------------------------------------------------------------
    useLayoutEffect(() => {
        if (!posicion || !menuRef.current) { setPosAjustada(posicion); return; }
        const rect = menuRef.current.getBoundingClientRect();
        const alturaReal = rect.height;
        const cabeAbajo = window.innerHeight - posicion.y >= alturaReal;
        setPosAjustada({
            x: posicion.x,
            y: cabeAbajo ? posicion.y : posicion.y - alturaReal,
        });
    }, [posicion]);

    // ---------------------------------------------------------------------------
    // Cerrar al hacer click fuera del menú
    // ---------------------------------------------------------------------------
    useEffect(() => {
        function handleCierreExterno(e: Event) {
            const target = e.target as HTMLElement;
            // Ignorar click derecho (abrirá nuevo menú contextual)
            if (e instanceof PointerEvent && e.button === 2) return;
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
        if (esChatConNegocio) {
            // Bloqueo / desbloqueo de sucursal
            if (!otroSucursalId) return;
            if (esBloqueado) {
                await desbloquearSucursal(otroSucursalId);
            } else {
                await bloquearUsuario({ tipo: 'sucursal', sucursalId: otroSucursalId });
            }
        } else {
            // Bloqueo / desbloqueo persona ↔ persona
            if (!otroId) return;
            if (esBloqueado) {
                await desbloquearUsuario(otroId);
            } else {
                await bloquearUsuario({ tipo: 'usuario', bloqueadoId: otroId });
            }
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
            colorIcono: 'text-blue-400 lg:text-blue-500',
        }] : []),
        {
            icono: conversacion.fijada ? PinOff : Pin,
            texto: conversacion.fijada ? 'Desfijar' : 'Fijar',
            onClick: handleFijar,
            destructivo: false,
            colorIcono: 'text-amber-400 lg:text-amber-500',
        },
        {
            icono: conversacion.silenciada ? Bell : BellOff,
            texto: conversacion.silenciada ? 'Desilenciar' : 'Silenciar',
            onClick: handleSilenciar,
            destructivo: false,
            colorIcono: 'text-purple-400 lg:text-purple-500',
        },
        {
            icono: conversacion.archivada ? ArchiveRestore : Archive,
            texto: conversacion.archivada ? 'Desarchivar' : 'Archivar',
            onClick: handleArchivar,
            destructivo: false,
            colorIcono: 'text-cyan-400 lg:text-cyan-500',
        },
        {
            icono: contactoExistente ? UserMinus : UserPlus,
            texto: contactoExistente ? 'Quitar contacto' : 'Agregar contacto',
            onClick: handleToggleContacto,
            destructivo: false,
            colorIcono: 'text-emerald-400 lg:text-emerald-500',
        },
        // Bloquear — disponible en ambos tipos de chat (persona o negocio).
        // Si es chat con negocio bloquea/desbloquea la sucursal específica;
        // si es persona ↔ persona, bloquea/desbloquea a la persona.
        {
            icono: ShieldBan,
            texto: esBloqueado
                ? (esChatConNegocio ? 'Desbloquear negocio' : 'Desbloquear')
                : (esChatConNegocio ? 'Bloquear negocio' : 'Bloquear'),
            onClick: handleBloquear,
            destructivo: !esBloqueado,
            colorIcono: esBloqueado ? 'text-emerald-400 lg:text-emerald-500' : 'text-red-400 lg:text-red-500',
        },
        {
            icono: Trash2,
            texto: 'Eliminar chat',
            onClick: handleEliminar,
            destructivo: true,
            colorIcono: 'text-red-400 lg:text-red-500',
        },
    ];

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div
            ref={menuRef}
            className={`${posicion ? 'fixed' : 'absolute right-2 top-full mt-1'} z-50 w-48 rounded-2xl lg:rounded-xl shadow-2xl lg:shadow-xl py-1.5 overflow-hidden`}
            style={{
                background: window.innerWidth >= 1024 ? '#ffffff' : '#0d1b2e',
                border: window.innerWidth >= 1024 ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.06)',
                ...(posAjustada ? { left: posAjustada.x, top: posAjustada.y } : {}),
            }}
        >
            {opciones.map((opcion) => (
                <button
                    key={opcion.texto}
                    onClick={opcion.onClick}
                    className={`
            w-full flex items-center gap-3 lg:gap-2.5 px-4 lg:px-3.5 py-3 lg:py-2.5 text-left text-[15px] lg:text-sm font-medium cursor-pointer
            ${opcion.destructivo
                            ? 'text-red-400 lg:text-red-600 hover:bg-white/5 lg:hover:bg-red-100 active:bg-white/10 lg:active:bg-red-200'
                            : 'text-white/80 lg:text-slate-700 hover:bg-white/5 lg:hover:bg-slate-200 active:bg-white/10 lg:active:bg-slate-300'
                        }
          `}
                >
                    <opcion.icono className={`w-5 h-5 lg:w-[18px] lg:h-[18px] shrink-0 ${opcion.colorIcono}`} />
                    {opcion.texto}
                </button>
            ))}
        </div>
    );
}

export default MenuContextualChat;