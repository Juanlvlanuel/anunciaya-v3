/**
 * CardServicio.tsx
 * =================
 * Card UNIVERSAL del feed de Servicios. Renderiza con el mismo layout y
 * misma altura las 3 variantes (`servicio-persona`, `solicito`,
 * `vacante-empresa`) — Sprint 9.3.
 *
 * Decisión de diseño:
 *   - Todos los cards tienen la MISMA estructura visual:
 *       foto · badge tipo · título (2 líneas) · precio + meta · ubicación.
 *   - La fuente de la imagen y el badge varían según `publicacion.tipo`,
 *     pero las dimensiones y el orden de la información se mantienen.
 *   - Sin avatar/nombre del oferente porque el feed no trae `oferente`
 *     embebido (solo `usuarioId`). Esa info aparece en el detalle.
 *
 * Antes había 2 componentes distintos (`CardServicio` y `CardVacante`)
 * con layouts radicalmente diferentes — el resultado eran cards con
 * alturas e imágenes desiguales en el grid "Cerca de ti".
 *
 * Ubicación: apps/web/src/components/servicios/CardServicio.tsx
 */

import { Briefcase, MapPin, Search, Wrench } from 'lucide-react';
import type {
    PublicacionServicio,
    TipoEmpleo,
} from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearTiempoRelativo,
    formatearDistancia,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';

// Mapeo local — coincide con `etiquetaTipoEmpleo` de Vacantes BS.
const ETIQUETA_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio tiempo',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Eventual',
};

interface CardServicioProps {
    publicacion: PublicacionServicio;
    /** Distancia en metros desde el GPS del usuario. */
    distanciaMetros?: number | null;
    onClick?: () => void;
}

export function CardServicio({
    publicacion,
    distanciaMetros = null,
    onClick,
}: CardServicioProps) {
    // ─── Datos derivados según tipo ─────────────────────────────────────
    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esSolicito = publicacion.tipo === 'solicito';
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    );

    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const distancia = formatearDistancia(distanciaMetros);
    const zona =
        publicacion.zonasAproximadas[0] ?? publicacion.ciudad.split(',')[0];
    const ubicacion = distancia
        ? `${distancia} · ${tiempo}`
        : zona
          ? `${zona} · ${tiempo}`
          : tiempo;

    const metaSecundaria = esVacante && publicacion.tipoEmpleo
        ? ETIQUETA_TIPO_EMPLEO[publicacion.tipoEmpleo]
        : modalidadLabel(publicacion.modalidad);

    // Configuración del badge tipo (esquina superior izq de la foto).
    const badgeTipo = esVacante
        ? {
              label: 'VACANTE',
              Icono: Briefcase,
              clase: 'bg-sky-600 text-white',
          }
        : esSolicito
          ? {
                label: 'SOLICITO',
                Icono: Search,
                clase: 'bg-amber-500 text-white',
            }
          : {
                label: 'SERVICIO',
                Icono: Wrench,
                clase: 'bg-white/95 text-slate-800',
            };

    // Configuración del placeholder cuando no hay foto.
    const placeholder = esVacante
        ? { Icono: Briefcase, gradient: 'from-sky-100 to-sky-200', color: 'text-sky-400' }
        : esSolicito
          ? { Icono: Search, gradient: 'from-amber-50 to-amber-100', color: 'text-amber-400' }
          : { Icono: Wrench, gradient: 'from-slate-100 to-slate-200', color: 'text-slate-400' };

    return (
        <article
            data-testid={`card-servicio-${publicacion.id}`}
            onClick={onClick}
            className="group rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-sm cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col"
        >
            {/* ── Foto (aspect-[4/3] fijo para alturas idénticas) ─── */}
            <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                {fotoUrl ? (
                    <img
                        src={fotoUrl}
                        alt={publicacion.titulo}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div
                        className={
                            'absolute inset-0 grid place-items-center bg-linear-to-br ' +
                            placeholder.gradient
                        }
                    >
                        <placeholder.Icono
                            className={'w-12 h-12 ' + placeholder.color}
                            strokeWidth={1.5}
                        />
                    </div>
                )}

                {/* Badge tipo — esquina superior izquierda */}
                <span
                    aria-hidden
                    className={
                        'absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider backdrop-blur-sm shadow-sm ' +
                        badgeTipo.clase
                    }
                >
                    <badgeTipo.Icono className="w-3 h-3" strokeWidth={2.5} />
                    {badgeTipo.label}
                </span>
            </div>

            {/* ── Info — misma estructura para todos ───────────────── */}
            <div className="p-3 flex-1 flex flex-col">
                {/* Título: 2 líneas reservadas para que todos tengan misma altura */}
                <h3 className="text-[14px] font-semibold text-slate-900 leading-tight line-clamp-2 min-h-[36px]">
                    {publicacion.titulo}
                </h3>

                {/* Precio destacado + meta secundaria (modalidad / tipo empleo) */}
                <div className="mt-1.5 flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[14px] font-extrabold text-sky-700 truncate tabular-nums">
                        {formatearPrecioServicio(publicacion.precio)}
                    </span>
                    <span
                        aria-hidden
                        className="text-slate-300 text-[11px] shrink-0"
                    >
                        ·
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 truncate">
                        {metaSecundaria}
                    </span>
                </div>

                {/* Ubicación: distancia·tiempo o zona·tiempo */}
                <div className="mt-auto pt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{ubicacion}</span>
                </div>
            </div>
        </article>
    );
}

export default CardServicio;
