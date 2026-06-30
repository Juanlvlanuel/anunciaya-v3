/**
 * BotonComentarista.tsx
 * ======================
 * Nombre clickeable de quien comentó. Un clic navega al perfil del usuario
 * (`/marketplace/usuario/:id`). El perfil maneja el caso "0 artículos" con una
 * vista mínima, así que funciona aunque la persona no haya publicado nada.
 *
 * Antes tenía un menú de clic derecho (Enviar mensaje / Ver perfil); se retiró
 * porque era redundante y poco descubrible: ahora "Contactar" (ChatYA) vive en
 * el menú ⋮ de cada comentario (ComentarioItem) y "Ver perfil" es justo este
 * clic. En móvil el clic derecho ni existía.
 *
 * Ubicación: apps/web/src/components/marketplace/BotonComentarista.tsx
 */

import { useNavigate } from 'react-router-dom';

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
}

export function BotonComentarista({
    usuarioId,
    nombre,
    displayName,
    editado = false,
}: BotonComentaristaProps) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            data-testid={`comentarista-${usuarioId}`}
            onClick={() => navigate(`/marketplace/usuario/${usuarioId}`)}
            className="text-left lg:cursor-pointer lg:hover:underline"
        >
            {displayName ?? nombre}
            {editado && (
                <span className="ml-1.5 text-xs font-normal italic text-slate-500">
                    (editada)
                </span>
            )}
        </button>
    );
}

export default BotonComentarista;
