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

import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import type { ArticuloMarketplaceDetalle } from '../../types/marketplace';

interface BarraContactoProps {
    articulo: ArticuloMarketplaceDetalle;
    variante: 'mobile' | 'desktop';
}

/**
 * Logo de WhatsApp (icono de marca) — SVG inline reutilizado del
 * `CardNegocio`. Color verde solid (`text-green-500`) que se hereda
 * por `fill="currentColor"`. Sprint 9.3 (iteración): cambiamos de
 * un botón verde con texto "WhatsApp" a solo el icono brand para
 * que conviva con el logo de ChatYA inline (sin botón de fondo).
 * Misma implementación que en `BarraContactoServicio`.
 */
const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg
        className={`${className ?? 'h-7 w-7'} text-green-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

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

    // Sprint 9.3 (iteración): ambos botones son INLINE (sin background
    // de botón). Solo los logos clickeables con hover scale, igual
    // patrón que `BarraContactoServicio` y el botón ChatYA del card de
    // Negocios en MisGuardados — coherencia cross-módulos.
    //   - ChatYA va a la IZQUIERDA (primero, principal).
    //   - WhatsApp va a la DERECHA (segundo, fallback), tamaño un poco
    //     menor (h-7 vs h-9 del ChatYA) para no competir visualmente.
    //   - Sin texto "WhatsApp", solo el ícono de marca.
    const claseContenedor =
        variante === 'mobile'
            ? 'flex items-center gap-3 px-3 py-2'
            : 'flex items-center gap-3';

    return (
        <div data-testid={`barra-contacto-${variante}`} className={claseContenedor}>
            {/* ChatYA — botón primario, inline. */}
            <button
                data-testid="btn-chatya"
                onClick={handleEnviarMensaje}
                aria-label="Contactar por ChatYA"
                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
            >
                <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto shrink-0 object-contain" />
            </button>

            {/* WhatsApp — solo ícono de marca, sin texto. */}
            {tieneTelefono && (
                <button
                    data-testid="btn-whatsapp"
                    onClick={handleWhatsApp}
                    aria-label="Contactar por WhatsApp"
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                >
                    <WhatsAppIcon className="h-7 w-7" />
                </button>
            )}
        </div>
    );
}

export default BarraContacto;
