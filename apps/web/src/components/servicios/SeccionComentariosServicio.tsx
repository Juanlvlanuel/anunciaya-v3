/**
 * SeccionComentariosServicio.tsx
 * ==============================
 * Comentarios públicos (hilos de 1 nivel) de una publicación de Servicios:
 * título "Comentarios (N)" + lista + input, usada en el detalle
 * (`PaginaServicio.tsx`) y en el modal de comentarios móvil
 * (`ModalComentariosServicio.tsx`). Compone `ListaComentariosServicio` +
 * `InputComentarioServicio` (separados para poder colocarlos aparte en
 * otros layouts — ver `ModalComentariosServicio.tsx` en escritorio, donde
 * el input queda fijo al fondo y la lista scrollea con el cuerpo). Mismo
 * patrón que `SeccionComentariosMarketplace.tsx`.
 *
 * Ubicación: apps/web/src/components/servicios/SeccionComentariosServicio.tsx
 */

import { useMemo } from 'react';
import { useSeccionComentariosServicio } from './useSeccionComentariosServicio';
import { ListaComentariosServicio } from './ListaComentariosServicio';
import { InputComentarioServicio } from './InputComentarioServicio';
import type { PublicacionDetalle } from '../../types/servicios';

interface SeccionComentariosServicioProps {
    publicacion: PublicacionDetalle;
}

export function SeccionComentariosServicio({ publicacion }: SeccionComentariosServicioProps) {
    const publicacionId = publicacion.id;
    const duenoId = publicacion.oferente.id;

    const { comentarios, isLoading } = useSeccionComentariosServicio({
        publicacionId,
        duenoId,
    });

    const total = useMemo(
        () => comentarios.reduce((acc, c) => acc + 1 + c.respuestas.length, 0),
        [comentarios]
    );

    if (isLoading) return null;

    return (
        <div data-testid="seccion-comentarios-servicio" className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
                Comentarios
                {total > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-500">({total})</span>
                )}
            </h2>

            <ListaComentariosServicio publicacionId={publicacionId} duenoId={duenoId} />

            <InputComentarioServicio publicacionId={publicacionId} className="pt-1" />
        </div>
    );
}

export default SeccionComentariosServicio;
