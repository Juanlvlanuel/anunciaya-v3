/**
 * BarraContacto.tsx
 * ==================
 * Botones de contacto del comprador con el vendedor en el detalle del
 * artículo:
 *  - WhatsApp (verde de marca #25D366) — solo si vendedor tiene teléfono.
 *  - ChatYA (Dark Gradient de Marca, ícono oficial) — abre ChatYA con
 *    contexto 'marketplace' y referencia al artículo.
 *
 * Layout:
 *  - Móvil: usar `<BarraContacto variante="mobile" />` dentro de un wrapper
 *    `fixed bottom-0` desde la página (este componente solo renderiza los
 *    botones, no el wrapper, para no acoplarse al z-index de BottomNav).
 *  - Desktop: usar `<BarraContacto variante="desktop" />` inline en columna
 *    derecha.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2)
 * Sprint:      docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
 *
 * Ubicación: apps/web/src/components/marketplace/BarraContacto.tsx
 */

import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useChatYAStore } from '../../stores/useChatYAStore';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import type { ArticuloMarketplaceDetalle } from '../../types/marketplace';

interface BarraContactoProps {
    articulo: ArticuloMarketplaceDetalle;
    variante: 'mobile' | 'desktop';
}

export function BarraContacto({ articulo, variante }: BarraContactoProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const setContextoPendiente = useChatYAStore((s) => s.setContextoPendiente);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    const { vendedor, titulo, id } = articulo;
    const esDueno = usuarioActual?.id === vendedor.id;
    const tieneTelefono = !!vendedor.telefono && vendedor.telefono.trim().length > 0;

    // Si el visitante es el dueño, no muestra los botones de contacto (no se
    // contacta a sí mismo). El wrapper de la página puede decidir mostrar
    // otros CTAs (ej: editar) cuando se sume Sprint 4.
    if (esDueno) return null;

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleWhatsApp = () => {
        if (!vendedor.telefono) return;
        const numero = vendedor.telefono.replace(/[^\d]/g, '');
        const mensaje = `Hola, vi tu publicación de "${titulo}" en AnunciaYA`;
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEnviarMensaje = () => {
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }
        const idTemp = `temp_marketplace_${id}_${Date.now()}`;

        // Foto principal del artículo para el preview.
        const fotos = articulo.fotos ?? [];
        const idxPortada = Math.max(
            0,
            Math.min(articulo.fotoPortadaIndex ?? 0, fotos.length - 1),
        );
        const fotoUrl = fotos[idxPortada] ?? fotos[0] ?? null;

        // Datos para insertar la card al enviar el primer mensaje.
        const datosCreacion = {
            participante2Id: vendedor.id,
            participante2Modo: 'personal' as const,
            contextoTipo: 'marketplace' as const,
            contextoReferenciaId: id,
            // FK al artículo: el backend hace JOIN para snapshot y emite
            // el mensaje sistema vía Socket.io a ambos participantes al
            // materializar la conv.
            articuloMarketplaceId: id,
        };

        // Datos para el preview encima del input.
        const cardData = {
            subtipo: 'articulo_marketplace' as const,
            titulo,
            imagen: fotoUrl,
            precio: articulo.precio,
            condicion: articulo.condicion ?? undefined,
        };

        abrirChatTemporal({
            id: idTemp,
            otroParticipante: {
                id: vendedor.id,
                nombre: vendedor.nombre,
                apellidos: vendedor.apellidos,
                avatarUrl: vendedor.avatarUrl,
            },
            datosCreacion,
            borradorInicial: `Hola, me interesa tu publicación de "${titulo}". `,
        });
        // Preview del recurso encima del input. La card NO se persiste
        // hasta que el usuario envíe; al hacerlo, la materialización con
        // `articuloMarketplaceId` la insertará en BD.
        setContextoPendiente({ datosCreacion, cardData });
        abrirChatYA();
    };

    // ─── Variantes ────────────────────────────────────────────────────────────

    // Variante mobile: sin fondo propio para que herede el color del feed
    // (azul gradient de la app). Se mantiene padding lateral y vertical para
    // que los botones no toquen el borde del viewport.
    const claseContenedor =
        variante === 'mobile' ? 'flex gap-2 px-3 py-2' : 'flex gap-2';

    return (
        <div data-testid={`barra-contacto-${variante}`} className={claseContenedor}>
            {tieneTelefono && (
                <button
                    data-testid="btn-whatsapp"
                    onClick={handleWhatsApp}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-[#22C55E] to-[#15803D] px-4 py-1.5 text-base font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
                >
                    <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                    WhatsApp
                </button>
            )}
            <button
                data-testid="btn-chatya"
                onClick={handleEnviarMensaje}
                aria-label="Contactar por ChatYA"
                className="flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-1.5 text-white shadow-md transition-transform hover:scale-[1.01]"
            >
                <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto shrink-0 object-contain" />
            </button>
        </div>
    );
}

export default BarraContacto;
