/**
 * CuerpoPublicacionNegocio.tsx
 * ===============================
 * Cuerpo de una publicación de negocio SIN el header (ver
 * `HeaderPublicacionNegocio.tsx`): texto completo, precio, galería
 * swipeable de fotos y contador de vistas. Puramente presentacional.
 *
 * El registro de la vista NO vive aquí — lo dispara el contenedor
 * (`DetallePublicacionNegocioContenido.tsx` / `ModalComentariosPublicacionNegocio.tsx`)
 * vía `useRegistrarVistaPublicacionNegocio`, para que cuente igual aunque el
 * contenedor no llegue a montar este componente (ej. el modal de
 * comentarios en móvil, que solo muestra comentarios).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/CuerpoPublicacionNegocio.tsx
 */

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { GaleriaPublicacionNegocio } from './GaleriaPublicacionNegocio';
import { formatearPrecio } from '../../../utils/marketplace';
import type { PublicacionNegocioDetalle } from '../../../types/negocioPublicaciones';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;

interface CuerpoPublicacionNegocioProps {
    publicacion: PublicacionNegocioDetalle;
}

export function CuerpoPublicacionNegocio({ publicacion }: CuerpoPublicacionNegocioProps) {
    const fotos = publicacion.fotos ?? [];

    return (
        <>
            {/* Texto completo */}
            <p className="text-[15px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                {publicacion.texto}
            </p>

            {/* Precio */}
            {publicacion.precio && (
                <span className="inline-block text-xl font-extrabold text-blue-700 tabular-nums">
                    {formatearPrecio(publicacion.precio)}
                </span>
            )}

            {/* Galería: foto grande deslizable + thumbnails abajo */}
            <GaleriaPublicacionNegocio fotos={fotos} fotoPortadaIndex={publicacion.fotoPortadaIndex} />

            <div className="flex items-center gap-1.5 text-base text-slate-600 font-semibold">
                <Eye className="h-5 w-5" />
                {publicacion.totalVistas} vistas
            </div>
        </>
    );
}

export default CuerpoPublicacionNegocio;
