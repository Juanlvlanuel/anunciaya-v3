/**
 * DetallePublicacionNegocioContenido.tsx
 * =========================================
 * Cuerpo COMPARTIDO del detalle de una publicación de negocio: header
 * clickeable del negocio (logo expande, nombre → perfil), texto completo,
 * precio, galería swipeable de fotos, vistas y comentarios estilo Facebook
 * (reusa `SeccionComentariosPublicacionNegocio`).
 *
 * Layout:
 *  - Móvil: una sola card apilada (header → texto → precio → galería →
 *    vistas → comentarios), sin cambios respecto al diseño original.
 *  - Escritorio: 2 columnas independientes en flujo normal (sin
 *    `position:fixed`/`sticky`). La columna de comentarios tiene alto FIJO
 *    (`h-[700px]`) tanto vacía como llena — no se achica ni se agranda
 *    según el número de comentarios — con scroll interno propio
 *    (`SeccionComentariosPublicacionNegocio` ya trae `h-full flex flex-col`
 *    para esto: lista scrolleable arriba, input pegado abajo).
 *
 * Encapsula el data-fetching de la publicación a partir de un solo
 * `publicacionId` — el caller solo pone el chrome alrededor (página privada,
 * página pública). Los comentarios los resuelve `SeccionComentariosPublicacionNegocio`
 * por su cuenta (mismo componente que usa el modal del feed).
 *
 * Usado por:
 *  - `PaginaPublicacionNegocio.tsx` (página privada, deep-link — se llega
 *    aquí desde "Ver publicación" en el feed).
 *  - `PaginaPublicacionNegocioPublica.tsx` (página pública, compartir).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/DetallePublicacionNegocioContenido.tsx
 */

import { Loader2 } from 'lucide-react';
import { PublicacionNegocioCuerpo } from './PublicacionNegocioCuerpo';
import { SeccionComentariosPublicacionNegocio } from './SeccionComentariosPublicacionNegocio';
import { useGpsStore } from '../../../stores/useGpsStore';
import { usePublicacionNegocio, useRegistrarVistaPublicacionNegocio } from '../../../hooks/queries/useNegocioPublicaciones';

const TARJETA_CLASES = 'rounded-xl border-2 border-slate-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)]';

interface DetallePublicacionNegocioContenidoProps {
    publicacionId: string;
}

export function DetallePublicacionNegocioContenido({
    publicacionId,
}: DetallePublicacionNegocioContenidoProps) {
    const { latitud, longitud } = useGpsStore();

    const { data: publicacion, isLoading } = usePublicacionNegocio(publicacionId, { latitud, longitud });
    useRegistrarVistaPublicacionNegocio(publicacion);

    if (isLoading || !publicacion) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const contenidoIzquierda = <PublicacionNegocioCuerpo publicacion={publicacion} />;

    const contenidoComentarios = (
        <SeccionComentariosPublicacionNegocio
            publicacionId={publicacionId}
            negocioId={publicacion.negocioId}
            autorUsuarioId={publicacion.autorUsuarioId}
        />
    );

    return (
        <div data-testid="detalle-publicacion-negocio">
            {/* ── MÓVIL: una sola card apilada ── */}
            <div className={`space-y-4 p-3 lg:hidden ${TARJETA_CLASES}`}>
                {contenidoIzquierda}
                <div className="border-t-[1.5px] border-slate-300 pt-3">
                    {contenidoComentarios}
                </div>
            </div>

            {/* ── ESCRITORIO: 2 columnas independientes, flujo normal, MISMO
                alto fijo `h-[700px]` en ambas (vacías o llenas) — con
                scroll interno propio cada una, así no se desbalancean
                aunque el contenido de una sea más corto que el de la otra. */}
            <div className="hidden lg:flex lg:items-start lg:gap-6 2xl:gap-8">
                <div className={`scroll-discreto w-[560px] 2xl:w-[640px] shrink-0 h-[700px] space-y-4 overflow-y-auto p-5 ${TARJETA_CLASES}`}>
                    {contenidoIzquierda}
                </div>

                <div className={`min-w-0 flex-1 h-[700px] p-5 ${TARJETA_CLASES}`}>
                    {contenidoComentarios}
                </div>
            </div>
        </div>
    );
}

export default DetallePublicacionNegocioContenido;
