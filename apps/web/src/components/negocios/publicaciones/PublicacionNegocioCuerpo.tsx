/**
 * PublicacionNegocioCuerpo.tsx
 * ===============================
 * Cuerpo visual COMPLETO de una publicación de negocio ya cargada — header
 * (`HeaderPublicacionNegocio`) + cuerpo (`CuerpoPublicacionNegocio`, que
 * también registra la vista). Puramente presentacional (recibe
 * `publicacion` ya resuelta, no hace fetching).
 *
 * Usado tal cual en `DetallePublicacionNegocioContenido.tsx` (header y
 * cuerpo fluyen juntos). El modal de comentarios en escritorio
 * (`ModalComentariosPublicacionNegocio.tsx`) en cambio usa las dos piezas
 * por separado, para fijar el header y dejar el cuerpo scrolleando junto
 * con los comentarios.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/PublicacionNegocioCuerpo.tsx
 */

import { HeaderPublicacionNegocio } from './HeaderPublicacionNegocio';
import { CuerpoPublicacionNegocio } from './CuerpoPublicacionNegocio';
import type { PublicacionNegocioDetalle } from '../../../types/negocioPublicaciones';

interface PublicacionNegocioCuerpoProps {
    publicacion: PublicacionNegocioDetalle;
}

export function PublicacionNegocioCuerpo({ publicacion }: PublicacionNegocioCuerpoProps) {
    return (
        <>
            <HeaderPublicacionNegocio publicacion={publicacion} />
            <CuerpoPublicacionNegocio publicacion={publicacion} />
        </>
    );
}

export default PublicacionNegocioCuerpo;
