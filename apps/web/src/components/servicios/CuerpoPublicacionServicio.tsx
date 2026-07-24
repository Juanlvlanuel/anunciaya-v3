/**
 * CuerpoPublicacionServicio.tsx
 * ===============================
 * Cuerpo de una publicación de Servicios SIN el header (avatar/nombre —
 * eso lo pinta el propio `ModalComentariosServicio.tsx`): título, precio,
 * chips (tipo, modalidad/tipoEmpleo, categoría, urgente), descripción
 * completa, galería y contador de vistas. Puramente presentacional.
 *
 * Mismo contenido que muestra `CardServicioFeed.tsx` en su cuerpo, pero
 * extraído aparte para reusarse en el modal de comentarios de escritorio
 * (`ModalComentariosServicio.tsx`), donde el cuerpo scrollea junto con los
 * comentarios — mismo patrón que `CuerpoArticuloMarketplace.tsx`/
 * `CuerpoPublicacionNegocio.tsx`.
 *
 * Ubicación: apps/web/src/components/servicios/CuerpoPublicacionServicio.tsx
 */

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
import { Briefcase, Search, Wrench } from 'lucide-react';
import { GaleriaServicio } from './GaleriaServicio';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    modalidadLabel,
    labelCategoria,
} from '../../utils/servicios';
import type { PublicacionDetalle, TipoEmpleo } from '../../types/servicios';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;

const ETIQUETA_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio tiempo',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Eventual',
};

interface CuerpoPublicacionServicioProps {
    publicacion: PublicacionDetalle;
}

export function CuerpoPublicacionServicio({ publicacion }: CuerpoPublicacionServicioProps) {
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';
    const tonoPrecio = esVacante ? 'text-sky-700' : esOfrece ? 'text-emerald-700' : 'text-amber-700';
    const etiquetaPrecio = esVacante ? 'Sueldo' : esOfrece ? 'Precio' : 'Presupuesto';

    const badgeTipo = esVacante
        ? { label: 'VACANTE', Icono: Briefcase, clase: 'bg-sky-600 text-white' }
        : esOfrece
          ? { label: 'SERVICIO', Icono: Wrench, clase: 'bg-emerald-600 text-white' }
          : { label: 'SOLICITUD', Icono: Search, clase: 'bg-amber-500 text-white' };

    const metaSecundaria = esVacante && publicacion.tipoEmpleo
        ? ETIQUETA_TIPO_EMPLEO[publicacion.tipoEmpleo]
        : modalidadLabel(publicacion.modalidad);

    return (
        <>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="min-w-0 text-lg font-bold text-slate-900 leading-snug">
                    {publicacion.titulo}
                </h3>
                <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tracking-wide ${badgeTipo.clase}`}
                >
                    <badgeTipo.Icono className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {badgeTipo.label}
                </span>
            </div>

            <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    {etiquetaPrecio}
                </span>
                <span className={`text-2xl font-extrabold tabular-nums ${tonoPrecio}`}>
                    {precioMostrar}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                    {metaSecundaria}
                </span>
                {!esVacante && publicacion.categoria && (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                        {labelCategoria(publicacion.categoria)}
                    </span>
                )}
                {publicacion.urgente && (
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-sm font-bold text-red-600">
                        Urgente
                    </span>
                )}
                {publicacion.zonasAproximadas[0] && (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                        {publicacion.zonasAproximadas[0]}
                    </span>
                )}
            </div>

            {publicacion.descripcion && (
                <p className="text-[15px] font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {publicacion.descripcion}
                </p>
            )}

            <GaleriaServicio publicacion={publicacion} />

            <div className="flex items-center gap-1.5 text-base text-slate-600 font-semibold">
                <Eye className="h-5 w-5" />
                {publicacion.totalVistas} vistas
            </div>
        </>
    );
}

export default CuerpoPublicacionServicio;
