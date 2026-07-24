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

import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatServicio } from '../../hooks/useIniciarChatServicio';
import type { PublicacionDetalle } from '../../types/servicios';

interface BarraContactoServicioProps {
    publicacion: PublicacionDetalle;
    variante: 'mobile' | 'desktop';
}

/**
 * Logo de WhatsApp (icono de marca) — SVG inline reutilizado del
 * `CardNegocio`. Color verde solid (`text-green-500`) que se hereda
 * por `fill="currentColor"`. Sprint 9.3 (iteración): cambiamos de
 * un botón verde con texto "WhatsApp" a solo el icono brand para
 * que conviva con el logo de ChatYA inline (sin botón de fondo).
 */
const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg
        className={`${className ?? 'h-9 w-9'} text-green-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

export function BarraContactoServicio({
    publicacion,
    variante,
}: BarraContactoServicioProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    // Sprint 9.3: la lógica de "iniciar chat con oferente" se extrajo
    // al hook `useIniciarChatServicio` para reutilizarla desde el
    // botón ChatYA del card de Servicios en MisGuardados.
    const iniciarChatServicio = useIniciarChatServicio();

    const { oferente, titulo, tipo } = publicacion;
    const esDueno = usuarioActual?.id === oferente.id;
    const tieneTelefono =
        !!oferente.telefono && oferente.telefono.trim().length > 0;
    // Mismo criterio que el resto del detalle: en vacante-empresa se
    // contacta al negocio, no a la persona dueña de la cuenta.
    const nombreContacto = tipo === 'vacante-empresa'
        ? oferente.negocioNombre ?? `${oferente.nombre} ${oferente.apellidos}`.trim()
        : oferente.nombre;

    if (esDueno) return null;

    // ─── Handlers ─────────────────────────────────────────────────────────

    const handleWhatsApp = () => {
        if (!oferente.telefono) return;
        const numero = oferente.telefono.replace(/[^\d]/g, '');
        const mensaje = `Hola, vi tu publicación de "${titulo}" en AnunciaYA. Me interesa.`;
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEnviarMensaje = async () => {
        await iniciarChatServicio(publicacion);
    };

    // Sprint 9.3 (iteración): ambos botones son INLINE (sin background
    // de botón). Solo los logos clickeables con hover scale, igual
    // patrón que el botón ChatYA del card de Negocios en MisGuardados.
    //   - ChatYA va a la IZQUIERDA (primero, principal).
    //   - WhatsApp va a la DERECHA (segundo, fallback).
    //   - Sin texto "WhatsApp", solo el ícono de marca.
    const claseContenedor =
        variante === 'mobile'
            ? 'flex items-center justify-between gap-3 px-4 py-2.5'
            : 'flex items-center gap-3';

    return (
        <div
            data-testid={`barra-contacto-servicio-${variante}`}
            className={claseContenedor}
        >
            {/* Móvil: etiqueta de contexto — mismo patrón que
                `BarraContacto.tsx` de MarketPlace. */}
            {variante === 'mobile' && (
                <span className="min-w-0 truncate text-sm font-medium text-white/70">
                    Contactar a{' '}
                    <span className="font-semibold text-white">{nombreContacto}</span>
                </span>
            )}

            <div className="flex shrink-0 items-center gap-3">
            {/* ChatYA — botón primario, inline. */}
            <button
                data-testid="btn-chatya-servicio"
                onClick={handleEnviarMensaje}
                aria-label="Contactar por ChatYA"
                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
            >
                <img
                    src="/ChatYA.webp"
                    alt="ChatYA"
                    className="h-9 w-auto shrink-0 object-contain"
                />
            </button>

            {/* WhatsApp — solo ícono de marca, sin texto. Tamaño un
                poco menor que el logo de ChatYA (h-7 vs h-9) para no
                competir visualmente — ChatYA es el canal primario. */}
            {tieneTelefono && (
                <button
                    data-testid="btn-whatsapp-servicio"
                    onClick={handleWhatsApp}
                    aria-label="Contactar por WhatsApp"
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                >
                    <WhatsAppIcon className="h-7 w-7" />
                </button>
            )}
            </div>
        </div>
    );
}

export default BarraContactoServicio;
