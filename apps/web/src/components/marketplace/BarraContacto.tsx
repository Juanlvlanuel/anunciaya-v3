/**
 * BarraContacto.tsx
 * ==================
 * Botones de contacto del comprador con el vendedor en el detalle del
 * artículo:
 *  - WhatsApp (verde de marca #25D366) — solo si vendedor tiene teléfono.
 *  - Enviar mensaje (Dark Gradient de Marca) — abre ChatYA con contexto
 *    'marketplace' y referencia al artículo.
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

import { MessageCircle, MessageSquare } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
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
        abrirChatTemporal({
            id: idTemp,
            otroParticipante: {
                id: vendedor.id,
                nombre: vendedor.nombre,
                apellidos: vendedor.apellidos,
                avatarUrl: vendedor.avatarUrl,
            },
            datosCreacion: {
                participante2Id: vendedor.id,
                participante2Modo: 'personal',
                contextoTipo: 'marketplace',
                contextoReferenciaId: id,
            },
        });
    };

    // ─── Variantes ────────────────────────────────────────────────────────────

    const claseContenedor =
        variante === 'mobile'
            ? 'flex gap-2 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]'
            : 'flex flex-col gap-2';

    return (
        <div data-testid={`barra-contacto-${variante}`} className={claseContenedor}>
            {tieneTelefono && (
                <button
                    data-testid="btn-whatsapp"
                    onClick={handleWhatsApp}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#1fb858]"
                >
                    <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                    WhatsApp
                </button>
            )}
            <button
                data-testid="btn-enviar-mensaje"
                onClick={handleEnviarMensaje}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
            >
                <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                Enviar mensaje
            </button>
        </div>
    );
}

export default BarraContacto;
