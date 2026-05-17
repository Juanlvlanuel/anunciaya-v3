/**
 * BarraContactoServicio.tsx
 * ===========================
 * Barra fija de contacto del detalle del servicio:
 *  - WhatsApp (verde de marca) — solo si oferente tiene teléfono.
 *  - ChatYA (Dark Gradient de Marca) — abre ChatYA con `contextoTipo: 'servicio'`
 *    + `servicioPublicacionId`. El backend (chatya.service) inserta
 *    automáticamente la card de contexto del servicio al primer envío.
 *
 * Patrón clonado de `BarraContacto.tsx` del MarketPlace. Si el visitante es
 * el dueño de la publicación, NO renderiza nada (no se contacta a sí mismo).
 *
 * Ubicación: apps/web/src/components/servicios/BarraContactoServicio.tsx
 */

import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import {
    formatearPrecioServicio,
    modalidadLabel,
    obtenerFotoPortada,
} from '../../utils/servicios';
import type { PublicacionDetalle } from '../../types/servicios';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MessageCircle = (p: IconoWrapperProps) => (
    <Icon icon={ICONOS.chat} {...p} />
);

interface BarraContactoServicioProps {
    publicacion: PublicacionDetalle;
    variante: 'mobile' | 'desktop';
}

export function BarraContactoServicio({
    publicacion,
    variante,
}: BarraContactoServicioProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const setContextoPendiente = useChatYAStore((s) => s.setContextoPendiente);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    const { oferente, titulo, id, precio, modalidad } = publicacion;
    const esDueno = usuarioActual?.id === oferente.id;
    const tieneTelefono =
        !!oferente.telefono && oferente.telefono.trim().length > 0;

    if (esDueno) return null;

    // ─── Handlers ─────────────────────────────────────────────────────────

    const handleWhatsApp = () => {
        if (!oferente.telefono) return;
        const numero = oferente.telefono.replace(/[^\d]/g, '');
        const mensaje = `Hola, vi tu publicación de "${titulo}" en AnunciaYA. Me interesa.`;
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEnviarMensaje = () => {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }
        const idTemp = `temp_servicio_${id}_${Date.now()}`;

        // Foto de portada para el preview.
        const fotoUrl = obtenerFotoPortada(
            publicacion.fotos,
            publicacion.fotoPortadaIndex,
        );

        // Datos para crear la conversación + insertar card en backend.
        const datosCreacion = {
            participante2Id: oferente.id,
            participante2Modo: 'personal' as const,
            contextoTipo: 'servicio' as const,
            contextoReferenciaId: id,
            servicioPublicacionId: id,
        };

        // Preview de la card encima del input (no se persiste hasta enviar).
        const cardData = {
            subtipo: 'servicio_publicacion' as const,
            titulo,
            imagen: fotoUrl,
            precio: formatearPrecioServicio(precio),
            modalidad: modalidadLabel(modalidad),
        };

        abrirChatTemporal({
            id: idTemp,
            otroParticipante: {
                id: oferente.id,
                nombre: oferente.nombre,
                apellidos: oferente.apellidos,
                avatarUrl: oferente.avatarUrl,
            },
            datosCreacion,
            borradorInicial: `Hola, me interesa tu publicación de "${titulo}". `,
        });
        setContextoPendiente({ datosCreacion, cardData });
        abrirChatYA();
    };

    const claseContenedor =
        variante === 'mobile' ? 'flex gap-2 px-3 py-2' : 'flex gap-2';

    return (
        <div
            data-testid={`barra-contacto-servicio-${variante}`}
            className={claseContenedor}
        >
            {tieneTelefono && (
                <button
                    data-testid="btn-whatsapp-servicio"
                    onClick={handleWhatsApp}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-[#22C55E] to-[#15803D] px-4 py-1.5 text-base font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
                >
                    <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                    WhatsApp
                </button>
            )}
            <button
                data-testid="btn-chatya-servicio"
                onClick={handleEnviarMensaje}
                aria-label="Contactar por ChatYA"
                className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-1.5 text-white shadow-md transition-transform hover:scale-[1.01]"
            >
                <img
                    src="/ChatYA.webp"
                    alt="ChatYA"
                    className="h-9 w-auto shrink-0 object-contain"
                />
            </button>
        </div>
    );
}

export default BarraContactoServicio;
