/**
 * CardItemCoyo.tsx — Tarjeta de resultado dentro del carrusel "Coyo encontró
 * esto" del feed. Tamaño FIJO (w-48 lg:w-52 h-60) para que todas midan igual
 * sin importar qué chips traiga el item. Click → detalle del item.
 *
 * Reemplaza visualmente a la antigua fila densa `TarjetaItemCoyo` (que vivía
 * inline en PaginaInicio). Conserva su navegación (rutaDetalleItemCoyo), su
 * `data-testid` y las reglas de visibilidad de chips ricos (rating solo si
 * hay reseñas, etc.).
 *
 * Ubicación: apps/web/src/components/home/CardItemCoyo.tsx
 */

import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, BadgeCheck, Clock, Image as ImageIcon } from 'lucide-react';
import type { ItemCoyo } from '../../types/preguntasComunidad';
import { rutaDetalleItemCoyo } from './navegacionCoyo';

const TIPO_LABEL: Record<ItemCoyo['tipo'], string> = {
    negocio: 'Negocio',
    oferta: 'Oferta',
    marketplace: 'Venta',
    servicio: 'Servicio',
};

/**
 * Etiqueta del badge. MarketPlace distingue venta vs demanda ('busco') — una
 * publicación 'busco' NO es una venta, así que el badge dice "Se busca".
 */
function etiquetaTipo(item: ItemCoyo): string {
    if (item.tipo === 'marketplace' && item.mpModo === 'busco') return 'Se busca';
    return TIPO_LABEL[item.tipo];
}

/**
 * Chips ricos por tipo. Solo se muestra el chip si el dato vino no-nulo y,
 * para ratings, solo si hay reseñas reales (totalResenas > 0) — un negocio
 * sin reseñas tiene rating=0 por default y mostrar "0.0" lo hacía ver mal
 * calificado en lugar de "sin calificar".
 */
function ChipsRicos({ item }: { item: ItemCoyo }) {
    const chips: React.ReactNode[] = [];

    if (item.rating !== null && item.totalResenas !== null && item.totalResenas > 0) {
        chips.push(
            <span key="r" className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>
                    {item.rating.toFixed(1)}
                    <span className="text-slate-600"> ({item.totalResenas})</span>
                </span>
            </span>,
        );
    }
    if (item.verificado === true) {
        chips.push(
            <span key="v" className="inline-flex items-center gap-1">
                <BadgeCheck className="w-3 h-3 text-blue-600 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>Verificado</span>
            </span>,
        );
    }
    if (item.estaAbierto !== null) {
        chips.push(
            <span key="a" className={`inline-flex items-center gap-1 ${item.estaAbierto ? 'text-emerald-600' : 'text-slate-600'}`}>
                <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>{item.estaAbierto ? 'Abierto' : 'Cerrado'}</span>
            </span>,
        );
    }
    if (item.negocioRating !== null && item.negocioRating > 0) {
        chips.push(
            <span key="nr" className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>{item.negocioRating.toFixed(1)}</span>
            </span>,
        );
    }
    if (item.diasParaVencer !== null) {
        const d = item.diasParaVencer;
        const txt = d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`;
        chips.push(
            <span key="d" className="inline-flex items-center gap-1 text-amber-600">
                <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span>{txt}</span>
            </span>,
        );
    }
    if (item.condicion) {
        chips.push(
            <span key="c" className="capitalize text-slate-600">
                {item.condicion.replace('_', ' ')}
            </span>,
        );
    }
    if (item.aceptaOfertas === true) {
        chips.push(
            <span key="ao" className="text-blue-600">
                Negociable
            </span>,
        );
    }

    if (chips.length === 0) return null;
    return (
        <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
            {chips}
        </div>
    );
}

function ImagenItem({ url, alt }: { url: string | null; alt: string }) {
    const [error, setError] = useState(false);
    const mostrar = !!url && !error;
    return (
        <div
            className="relative h-28 shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: 'repeating-linear-gradient(135deg, #e2e8f0 0 8px, #eef2f6 8px 16px)' }}
        >
            {mostrar ? (
                <img src={url} alt={alt} className="w-full h-full object-cover" onError={() => setError(true)} />
            ) : (
                <ImageIcon className="w-5 h-5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
            )}
        </div>
    );
}

interface CardItemCoyoProps {
    item: ItemCoyo;
}

function CardItemCoyoBase({ item }: CardItemCoyoProps) {
    const navigate = useNavigate();

    // Oferta: se abre como modal SOBRE el Home (evento que escucha
    // ModalOfertaCoyo) en lugar de navegar a /ofertas, para que el back cierre
    // el modal y regrese a /inicio — consistente con los otros destinos, que
    // muestran el detalle y vuelven al Home. Ver ModalOfertaCoyo.tsx.
    const handleClick = () => {
        if (item.tipo === 'oferta') {
            window.dispatchEvent(new CustomEvent('coyo:abrir-oferta', { detail: item.id }));
            return;
        }
        navigate(rutaDetalleItemCoyo(item));
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            data-testid={`coyo-tarjeta-${item.tipo}-${item.id}`}
            aria-label={`Ver ${item.titulo}`}
            className="group/card shrink-0 w-48 lg:w-52 h-60 flex flex-col text-left bg-white rounded-xl overflow-hidden ring-1 ring-slate-300 shadow-sm lg:hover:shadow-md lg:hover:ring-blue-300 lg:cursor-pointer active:scale-[0.99] transition-all duration-200"
        >
            <div className="relative">
                <ImagenItem url={item.imagen} alt={item.titulo} />
                <span
                    className="absolute top-2 left-2 inline-flex items-center text-sm lg:text-[11px] 2xl:text-sm font-bold text-white rounded-md px-2 py-0.5 shadow-sm"
                    style={{ background: 'rgba(15,23,42,0.82)' }}
                >
                    {etiquetaTipo(item)}
                </span>
                {item.logo && (
                    <img
                        src={item.logo}
                        alt=""
                        aria-hidden="true"
                        className="absolute bottom-2 left-2 h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-sm"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                )}
            </div>
            <div className="flex-1 min-h-0 p-3 flex flex-col gap-1">
                <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 lg:group-hover/card:text-blue-700">
                    {item.titulo}
                </p>
                {item.subtitulo && <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600 truncate">{item.subtitulo}</p>}
                <div className="mt-auto">
                    <ChipsRicos item={item} />
                </div>
            </div>
        </button>
    );
}

export const CardItemCoyo = memo(CardItemCoyoBase);
export default CardItemCoyo;
