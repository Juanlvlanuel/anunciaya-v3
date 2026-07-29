/**
 * BotonComentarista.tsx
 * ======================
 * Nombre clickeable de quien comentó. Por default un clic navega al perfil
 * del usuario (`/marketplace/usuario/:id`) — el perfil maneja el caso "0
 * artículos" con una vista mínima, así que funciona aunque la persona no haya
 * publicado nada.
 *
 * Identidad de negocio (`esNegocio`): si el comentario se hizo en Modo
 * Comercial (Negocios, Servicios, Coyo — NO MarketPlace, que es personal-only
 * y bloquea el modo comercial por completo), el nombre/avatar muestran el
 * negocio en vez de la persona. El click va al perfil del NEGOCIO
 * (`/negocios/{sucursalId}`), no al perfil personal.
 *
 * El perfil personal (`/marketplace/usuario/:id`) está detrás de
 * `ModoPersonalEstrictoGuard` y NO es accesible en Modo Comercial. Si la
 * identidad mostrada es de persona y quien mira está en Modo Comercial, el
 * nombre se pinta como texto plano (sin click) en vez de disparar el toast
 * de "sección no disponible".
 *
 * Antes tenía un menú de clic derecho (Enviar mensaje / Ver perfil); se retiró
 * porque era redundante y poco descubrible: ahora "Contactar" (ChatYA) vive en
 * el menú ⋮ de cada comentario (ComentarioItem) y "Ver perfil" es justo este
 * clic. En móvil el clic derecho ni existía.
 *
 * Ubicación: apps/web/src/components/marketplace/BotonComentarista.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useAuthStore } from '../../stores/useAuthStore';

interface BotonComentaristaProps {
    usuarioId: string;
    nombre: string;
    /** Se conservan en la firma por compatibilidad con los callers. */
    apellidos: string;
    avatarUrl: string | null;
    /**
     * Texto mostrado en el botón. Default = `nombre`. Útil para mostrar solo el
     * nombre corto aunque internamente se tenga el completo.
     */
    displayName?: string;
    /** Marca "(editada)" opcional al lado del nombre. */
    editado?: boolean;
    /** true si `nombre`/`avatarUrl` muestran la identidad del NEGOCIO. */
    esNegocio?: boolean;
    /** Sucursal principal del negocio — requerido cuando `esNegocio` es true. */
    sucursalId?: string | null;
}

export function BotonComentarista({
    usuarioId,
    nombre,
    displayName,
    editado = false,
    esNegocio = false,
    sucursalId = null,
}: BotonComentaristaProps) {
    const navigate = useNavigate();
    const navegarASeccion = useNavegarASeccion();
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);

    const irAPerfil = () => {
        if (esNegocio && sucursalId) {
            navegarASeccion(`/negocios/${sucursalId}`);
            return;
        }
        navigate(`/marketplace/usuario/${usuarioId}`);
    };

    const etiquetaEditado = editado && (
        <span className="ml-1.5 text-xs font-normal italic text-slate-500">
            (editada)
        </span>
    );

    // El perfil personal está bloqueado en Modo Comercial (ModoPersonalEstrictoGuard).
    // Si la identidad mostrada es de persona (no negocio), no ofrecemos un click
    // que solo produce un toast de "sección no disponible".
    if (!esNegocio && modoActivo === 'comercial') {
        return (
            <span data-testid={`comentarista-${usuarioId}`} className="text-left">
                {displayName ?? nombre}
                {etiquetaEditado}
            </span>
        );
    }

    return (
        <button
            type="button"
            data-testid={`comentarista-${usuarioId}`}
            onClick={irAPerfil}
            className="text-left lg:cursor-pointer lg:hover:underline"
        >
            {displayName ?? nombre}
            {etiquetaEditado}
        </button>
    );
}

export default BotonComentarista;
