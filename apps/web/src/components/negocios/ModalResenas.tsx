/**
 * ============================================================================
 * COMPONENTE: ModalResenas (v7 - Layout horizontal estilo Booking/Google)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalResenas.tsx
 *
 * CAMBIOS EN ESTA VERSIÓN:
 * - ✅ Layout horizontal: stats arriba (rating + barras) + lista debajo
 * - ✅ Acento dorado unificado con SeccionResenas
 * - ✅ Card de reseña estilo "fila" (nombre + rating a los extremos)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Pencil, PencilLine, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrapper local: ícono migrado a Iconify manteniendo el nombre familiar.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePortalTarget } from '../../hooks/usePortalTarget';
import { useAuthStore } from '../../stores/useAuthStore';

// =============================================================================
// TIPOS DE ORDENAMIENTO
// =============================================================================

type OrdenResenas = 'recientes' | 'mejores' | 'peores' | 'con_respuesta';

const ETIQUETAS_ORDEN: Record<OrdenResenas, string> = {
    recientes: 'Más recientes',
    mejores: 'Mejor calificadas',
    peores: 'Peores primero',
    con_respuesta: 'Con respuesta',
};

// =============================================================================
// TIPOS
// =============================================================================

interface Resena {
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };
    respuestaNegocio?: {
        texto: string;
        fecha: string;
        negocioNombre: string;
        negocioLogo: string | null;
        sucursalNombre?: string | null;
    } | null;
}

interface ModalResenasProps {
    abierto: boolean;
    onCerrar: () => void;
    resenas: Resena[];
    promedioRating?: number;
    onEscribirResena?: () => void;
    onEditarResena?: (resena: Resena) => void;
    resenaDestacadaId?: string | null;
}

interface Distribucion {
    estrellas: number;
    cantidad: number;
    porcentaje: number;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaRelativa = (fecha: string | null): string => {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaResena = new Date(fecha);
    const diffMs = ahora.getTime() - fechaResena.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `hace ${diffDias} días`;
    if (diffDias < 30) return `hace ${Math.floor(diffDias / 7)} sem`;
    if (diffDias < 365) return `hace ${Math.floor(diffDias / 30)} meses`;
    return `hace ${Math.floor(diffDias / 365)} años`;
};

const GRADIENT_DORADO = 'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #d4a017 100%)';
const GRADIENT_DORADO_BARRAS = 'linear-gradient(90deg, #facc15 0%, #eab308 50%, #ca8a04 100%)';

// =============================================================================
// COMPONENTE: PanelStats (horizontal - rating + barras + chips)
// =============================================================================

interface PanelStatsProps {
    promedioRating?: number;
    totalResenas: number;
    distribucion: Distribucion[];
    filtroEstrellas: number | null;
    onToggleFiltro: (estrellas: number) => void;
    orden: OrdenResenas;
    onCambiarOrden: (orden: OrdenResenas) => void;
    compacto?: boolean;
}

function PanelStats({
    promedioRating,
    totalResenas,
    distribucion,
    filtroEstrellas,
    onToggleFiltro,
    orden,
    onCambiarOrden,
    compacto = false,
}: PanelStatsProps) {
    const [dropdownOrdenAbierto, setDropdownOrdenAbierto] = useState(false);
    const dropdownOrdenRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!dropdownOrdenAbierto) return;
        const handler = (e: MouseEvent) => {
            if (!dropdownOrdenRef.current?.contains(e.target as Node)) {
                setDropdownOrdenAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOrdenAbierto]);

    return (
        <div className={`${compacto ? 'p-3' : 'p-3 2xl:p-4'} bg-slate-100 border-b-2 border-slate-300 shrink-0`}>
            {/* Fila: rating grande + divisor + barras */}
            <div className={`flex items-center ${compacto ? 'gap-3' : 'gap-3 2xl:gap-5'}`}>
                {/* Rating prominente */}
                <div className={`text-center shrink-0 flex flex-col items-center justify-center ${compacto ? 'w-24' : 'w-28 2xl:w-32'}`}>
                    <div className={`font-black text-slate-800 leading-none ${compacto ? 'text-4xl' : 'text-4xl 2xl:text-5xl'}`}>
                        {promedioRating?.toFixed(1) ?? '—'}
                    </div>
                    <div className="flex gap-0.5 mt-1.5 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => {
                            const activa = promedioRating && s <= Math.round(promedioRating);
                            return (
                                <Star
                                    key={s}
                                    className={`${compacto ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5 2xl:w-4 2xl:h-4'} ${
                                        activa ? 'fill-yellow-500 text-yellow-500' : 'text-slate-300'
                                    }`}
                                    strokeWidth={activa ? 0 : 2}
                                    style={activa ? undefined : { fill: '#fff' }}
                                />
                            );
                        })}
                    </div>
                    <span className={`font-semibold text-slate-600 ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                        {totalResenas} {totalResenas === 1 ? 'reseña' : 'reseñas'}
                    </span>
                </div>

                {/* Divisor vertical */}
                <div className="w-px self-stretch bg-slate-300 shrink-0" />

                {/* Barras distribución */}
                <div className={`flex-1 flex flex-col justify-center ${compacto ? 'gap-1' : 'gap-1 2xl:gap-1.5'}`}>
                    {distribucion.map(({ estrellas, cantidad, porcentaje }) => (
                        <div key={estrellas} className="flex items-center gap-2">
                            <span className={`w-3 font-bold text-slate-700 shrink-0 ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                                {estrellas}
                            </span>
                            <Star
                                className="w-3 h-3 fill-yellow-500 text-yellow-500 shrink-0"
                                strokeWidth={0}
                            />
                            <div className={`flex-1 bg-white rounded-full overflow-hidden border border-slate-300 ${compacto ? 'h-2' : 'h-2 2xl:h-2.5'}`}>
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${porcentaje}%`, background: GRADIENT_DORADO_BARRAS }}
                                />
                            </div>
                            <span className={`text-right font-semibold text-slate-600 shrink-0 tabular-nums ${compacto ? 'w-8 text-sm' : 'w-10 text-sm lg:text-[11px] 2xl:text-sm'}`}>
                                {cantidad}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Segmented control de filtros + dropdown ordenar */}
            <div className={`flex items-center gap-2 ${compacto ? 'mt-3' : 'mt-3 2xl:mt-4 flex-wrap'}`}>
                {!compacto && (
                    <span className="self-center mr-0.5 font-semibold text-slate-600 text-sm lg:text-[11px] 2xl:text-sm">
                        Filtrar:
                    </span>
                )}

                {/* Zona scrolleable horizontal (solo móvil) para evitar clippeo del dropdown */}
                <div className={`flex items-center gap-2 ${compacto ? 'flex-1 min-w-0 flex-nowrap overflow-x-auto' : 'contents'}`}>
                    {/* Segmented control: estrellas */}
                    <div className="flex items-center gap-0.5 bg-slate-200 rounded-xl p-1 shrink-0">
                        {[5, 4, 3, 2, 1].map((estrellas) => {
                            const activo = filtroEstrellas === estrellas;
                            return (
                                <button
                                    key={estrellas}
                                    onClick={() => onToggleFiltro(estrellas)}
                                    className={`px-2.5 py-1 font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'} ${
                                        activo
                                            ? 'text-white shadow-sm'
                                            : 'text-slate-700 hover:bg-white/60'
                                    }`}
                                    style={activo ? { background: GRADIENT_DORADO } : undefined}
                                    data-testid={`filtro-estrellas-${estrellas}`}
                                >
                                    {estrellas} <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Botón limpiar circular */}
                    {filtroEstrellas !== null && (
                        <button
                            onClick={() => onToggleFiltro(filtroEstrellas)}
                            className="shrink-0 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
                            aria-label="Limpiar filtro"
                            data-testid="btn-limpiar-filtro"
                        >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    )}
                </div>

                {/* Dropdown Ordenar (fuera del overflow para que el menu no se clippee) */}
                <div ref={dropdownOrdenRef} className={`relative shrink-0 ${compacto ? '' : 'ml-auto'}`}>
                    <button
                        onClick={() => setDropdownOrdenAbierto((p) => !p)}
                        className={`flex items-center cursor-pointer transition-colors ${
                            compacto
                                ? 'w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 justify-center'
                                : 'gap-1.5 px-2.5 py-1 font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm lg:text-[11px] 2xl:text-sm'
                        }`}
                        aria-label={compacto ? `Ordenar reseñas: ${ETIQUETAS_ORDEN[orden]}` : undefined}
                        data-testid="btn-ordenar-resenas"
                    >
                        <ArrowUpDown className={compacto ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} strokeWidth={compacto ? 2.5 : 2} />
                        {!compacto && (
                            <>
                                <span className="truncate max-w-[120px]">{ETIQUETAS_ORDEN[orden]}</span>
                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${dropdownOrdenAbierto ? 'rotate-180' : ''}`} />
                            </>
                        )}
                    </button>
                    {dropdownOrdenAbierto && (
                        <div className="absolute z-30 right-0 mt-1.5 w-52 bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                            <div className="py-1">
                                {(Object.keys(ETIQUETAS_ORDEN) as OrdenResenas[]).map((opt) => {
                                    const activo = orden === opt;
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => { onCambiarOrden(opt); setDropdownOrdenAbierto(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer ${compacto ? 'text-sm' : 'text-sm lg:text-[13px] 2xl:text-sm'} ${
                                                activo
                                                    ? 'bg-yellow-50 text-yellow-800 font-bold'
                                                    : 'text-slate-700 font-medium hover:bg-slate-100'
                                            }`}
                                            data-testid={`opcion-orden-${opt}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-yellow-500' : 'bg-slate-200'}`}>
                                                {activo && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </div>
                                            <span className="truncate">{ETIQUETAS_ORDEN[opt]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE: CardResena (fila horizontal)
// =============================================================================

interface CardResenaProps {
    resena: Resena;
    compacto?: boolean;
    esPropia?: boolean;
    onEditar?: () => void;
}

function CardResena({ resena, compacto = false, esPropia = false, onEditar }: CardResenaProps) {
    const [expandido, setExpandido] = useState(false);
    const textoLargo = resena.texto && resena.texto.length > 180;

    return (
        <div className={`bg-gray-200 rounded-xl ${compacto ? 'p-3' : 'p-3 2xl:p-4'}`}>
            {/* ═══════════ HEADER: avatar + nombre/fecha (izq) + rating (der) ═══════════ */}
            <div className={`flex items-center ${compacto ? 'gap-3' : 'gap-3 2xl:gap-4'}`}>
                {/* Avatar */}
                {resena.autor.avatarUrl ? (
                    <img
                        src={resena.autor.avatarUrl}
                        alt={resena.autor.nombre}
                        className={`rounded-full object-cover shrink-0 ${compacto ? 'w-11 h-11' : 'w-11 h-11 2xl:w-12 2xl:h-12'}`}
                    />
                ) : (
                    <div
                        className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${
                            compacto ? 'w-11 h-11 text-base' : 'w-11 h-11 2xl:w-12 2xl:h-12 text-base 2xl:text-lg'
                        }`}
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)' }}
                    >
                        {resena.autor.nombre.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Nombre + fecha */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-slate-900 truncate ${compacto ? 'text-base' : 'text-base lg:text-sm 2xl:text-base'}`}>
                            {resena.autor.nombre}
                        </h4>
                        {esPropia && onEditar && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditar(); }}
                                className="text-yellow-600 hover:text-yellow-700 cursor-pointer shrink-0"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <p className={`font-medium text-slate-600 ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                        {formatearFechaRelativa(resena.createdAt)}
                    </p>
                </div>

                {/* Rating: número grande + 1 estrella */}
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`font-bold text-slate-900 tabular-nums ${compacto ? 'text-xl' : 'text-xl lg:text-lg 2xl:text-xl'}`}>
                        {resena.rating?.toFixed(1) ?? '—'}
                    </span>
                    <Star
                        className={`${compacto ? 'w-5 h-5' : 'w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5'} text-yellow-500 fill-yellow-500`}
                        strokeWidth={0}
                    />
                </div>
            </div>

            {/* ═══════════ TEXTO DE LA RESEÑA ═══════════ */}
            {resena.texto && (
                <div className={`${compacto ? 'mt-2.5' : 'mt-2.5 2xl:mt-3'}`}>
                    <p className={`text-slate-700 font-medium leading-relaxed ${compacto ? 'text-sm' : 'text-sm lg:text-[13px] 2xl:text-sm'} ${
                        !expandido && textoLargo ? 'line-clamp-3' : ''
                    }`}>
                        {resena.texto}
                    </p>
                    {textoLargo && (
                        <button
                            onClick={() => setExpandido(!expandido)}
                            className={`text-yellow-700 hover:text-yellow-900 mt-1 font-bold cursor-pointer ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}
                        >
                            {expandido ? 'Ver menos' : 'Ver más'}
                        </button>
                    )}
                </div>
            )}

            {/* ═══════════ RESPUESTA DEL NEGOCIO (burbuja de chat) ═══════════
                Paleta slate + accent amber (consistente con header dorado del modal TC-6). */}
            {resena.respuestaNegocio && (
                <div className="mt-3 flex justify-end">
                    <div className={`max-w-[92%] bg-slate-100 border-2 border-amber-300 rounded-2xl rounded-br-sm shadow-sm ${compacto ? 'p-3' : 'p-3 2xl:p-3'}`}>
                        {/* Header: avatar + nombre/sucursal + fecha */}
                        <div className={`flex items-center ${compacto ? 'gap-3 mb-2' : 'gap-3 mb-2'}`}>
                            {resena.respuestaNegocio.negocioLogo ? (
                                <img
                                    src={resena.respuestaNegocio.negocioLogo}
                                    alt={resena.respuestaNegocio.negocioNombre}
                                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-amber-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-base font-bold shrink-0 ring-2 ring-amber-200">
                                    {resena.respuestaNegocio.negocioNombre?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <span className={`block text-slate-900 font-semibold truncate ${compacto ? 'text-sm' : 'text-sm lg:text-[13px] 2xl:text-sm'}`}>
                                    {resena.respuestaNegocio.negocioNombre}
                                </span>
                                {resena.respuestaNegocio.sucursalNombre && (
                                    <span className={`block text-slate-600 font-medium truncate ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                                        {resena.respuestaNegocio.sucursalNombre}
                                    </span>
                                )}
                            </div>
                            <span className={`text-slate-500 font-medium shrink-0 self-start ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                                {formatearFechaRelativa(resena.respuestaNegocio.fecha)}
                            </span>
                        </div>
                        <p className={`text-slate-700 font-medium leading-relaxed ml-[52px] ${compacto ? 'text-sm' : 'text-sm lg:text-[13px] 2xl:text-sm'}`}>
                            {resena.respuestaNegocio.texto}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE: EmptyState
// =============================================================================

function EmptyState({ onLimpiar }: { onLimpiar: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center ring-2 ring-yellow-200">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" strokeWidth={0} />
            </div>
            <p className="text-slate-600 text-sm font-semibold">No se encontraron reseñas</p>
            <button
                onClick={onLimpiar}
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 font-bold cursor-pointer"
            >
                Limpiar filtros
            </button>
        </div>
    );
}

// =============================================================================
// COMPONENTE: BotonEscribirResena
// =============================================================================

function BotonEscribirResena({ onClick, compacto: _compacto = false }: { onClick: () => void; compacto?: boolean }) {
    return (
        <button
            onClick={onClick}
            aria-label="Escribir reseña"
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer active:scale-95 text-white hover:brightness-110 transition-all"
            style={{ background: 'linear-gradient(135deg, #475569, #334155)', boxShadow: '0 6px 18px rgba(15,23,42,0.35)' }}
        >
            <PencilLine className="w-6 h-6" strokeWidth={2.5} />
        </button>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalResenas({
    abierto,
    onCerrar,
    resenas,
    promedioRating,
    onEscribirResena,
    onEditarResena,
    resenaDestacadaId,
}: ModalResenasProps) {
    const { esMobile } = useBreakpoint();

    // Detectar si el modal se renderizará contenido en un wrapper (preview BS, ChatYA)
    // para aplicar altura fija proporcional al wrapper. Necesaria porque el layout interno
    // usa flex-1 min-h-0 para la lista de reseñas, que colapsa con altura auto.
    // Modo normal: h-[80vh]! (altura del viewport como otros modales).
    // Modo contenido: h-[80%]! (80% del wrapper — igualado a los otros modales y deja aire arriba
    // para sentir el patrón "bottom sheet" que se desliza).
    const portalTarget = usePortalTarget();
    const esContenido = portalTarget !== document.body;
    const clasesAltura = esContenido ? 'h-[90%]! max-h-[90%]!' : 'h-[80vh]!';
    const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null);
    const [orden, setOrden] = useState<OrdenResenas>('recientes');
    const [resenaHighlight, setResenaHighlight] = useState<string | null>(null);
    const [listaLista, setListaLista] = useState(false);
    const usuarioId = useAuthStore((state) => state.usuario?.id);

    // Esperar a que el modal termine su animación antes de animar las reseñas
    useEffect(() => {
        if (abierto) {
            setListaLista(false);
            const t = setTimeout(() => setListaLista(true), 280);
            return () => clearTimeout(t);
        }
        setListaLista(false);
    }, [abierto]);

    // Deep link: scroll a la reseña destacada cuando el modal se abre
    useEffect(() => {
        if (abierto && resenaDestacadaId && resenaDestacadaId !== 'abrir') {
            const buscandoId = `resena-${resenaDestacadaId}`;
            let intentos = 0;
            const maxIntentos = 20;

            const intervalo = setInterval(() => {
                intentos++;
                const el = document.getElementById(buscandoId);
                if (el) {
                    clearInterval(intervalo);
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setResenaHighlight(resenaDestacadaId);
                    setTimeout(() => setResenaHighlight(null), 3000);
                } else if (intentos >= maxIntentos) {
                    clearInterval(intervalo);
                }
            }, 100);

            return () => clearInterval(intervalo);
        }
    }, [abierto, resenaDestacadaId]);

    const resenasFiltradas = useMemo(() => {
        let resultado = filtroEstrellas
            ? resenas.filter((r) => r.rating === filtroEstrellas)
            : [...resenas];

        const tiempo = (f: string | null) => f ? new Date(f).getTime() : 0;

        switch (orden) {
            case 'recientes':
                resultado.sort((a, b) => tiempo(b.createdAt) - tiempo(a.createdAt));
                break;
            case 'mejores':
                resultado.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || tiempo(b.createdAt) - tiempo(a.createdAt));
                break;
            case 'peores':
                resultado.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0) || tiempo(b.createdAt) - tiempo(a.createdAt));
                break;
            case 'con_respuesta':
                resultado = resultado.filter((r) => !!r.respuestaNegocio);
                resultado.sort((a, b) => tiempo(b.createdAt) - tiempo(a.createdAt));
                break;
        }

        return resultado;
    }, [resenas, filtroEstrellas, orden]);

    const distribucion: Distribucion[] = [5, 4, 3, 2, 1].map((estrellas) => ({
        estrellas,
        cantidad: resenas.filter((r) => r.rating === estrellas).length,
        porcentaje: resenas.length > 0
            ? (resenas.filter((r) => r.rating === estrellas).length / resenas.length) * 100
            : 0,
    }));

    const toggleFiltro = (estrellas: number) => {
        setFiltroEstrellas(filtroEstrellas === estrellas ? null : estrellas);
    };

    const handleEscribirResena = () => {
        onCerrar();
        onEscribirResena?.();
    };

    const resaltadoClass = 'ring-2 ring-yellow-400 bg-yellow-50 rounded-xl shadow-lg shadow-yellow-200/50 transition-all duration-500';

    // Contenido compartido: header + stats panel + lista de reseñas
    const contenidoInterno = (compacto: boolean) => (
        <>
            {/* Panel de stats horizontal */}
            <PanelStats
                promedioRating={promedioRating}
                totalResenas={resenas.length}
                distribucion={distribucion}
                filtroEstrellas={filtroEstrellas}
                onToggleFiltro={toggleFiltro}
                orden={orden}
                onCambiarOrden={setOrden}
                compacto={compacto}
            />

            {/* Lista vertical de reseñas + FAB flotante */}
            <div className="flex-1 relative min-h-0">
                <div className="absolute inset-0 overflow-y-auto">
                    <div
                        key={`${filtroEstrellas ?? 'all'}-${orden}-${listaLista ? '1' : '0'}`}
                        className={`space-y-2.5 ${compacto ? 'px-3 pt-3 pb-20' : 'px-3 2xl:px-4 pt-3 pb-20'}`}
                    >
                        {resenasFiltradas.length > 0 ? (
                            listaLista && resenasFiltradas.map((resena, idx) => (
                                <div
                                    key={resena.id}
                                    id={`resena-${resena.id}`}
                                    className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${resenaHighlight === resena.id ? resaltadoClass : 'transition-all duration-500'}`}
                                    style={{ animationDelay: `${Math.min(idx * 70, 600)}ms`, animationFillMode: 'backwards' }}
                                >
                                    <CardResena
                                        resena={resena}
                                        compacto={compacto}
                                        esPropia={resena.autor.id === usuarioId}
                                        onEditar={() => onEditarResena?.(resena)}
                                    />
                                </div>
                            ))
                        ) : (
                            <EmptyState onLimpiar={() => setFiltroEstrellas(null)} />
                        )}
                    </div>
                </div>

                {/* FAB flotante */}
                {onEscribirResena && listaLista && (
                    <div className="absolute bottom-4 right-4 z-10 animate-in zoom-in-50 duration-300">
                        <BotonEscribirResena onClick={handleEscribirResena} compacto={compacto} />
                    </div>
                )}
            </div>
        </>
    );

    // =========================================================================
    // MÓVIL: ModalBottom
    // =========================================================================
    if (esMobile) {
        return (
            <ModalBottom
                abierto={abierto}
                onCerrar={onCerrar}
                titulo="Reseñas"
                iconoTitulo={<Star className="w-5 h-5 text-white" />}
                mostrarHeader={false}
                headerOscuro
                sinScrollInterno={true}
                alturaMaxima="lg"
                className={clasesAltura}
            >
                {/* Header dorado */}
                <div
                    className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                    style={{ background: GRADIENT_DORADO }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
                    <div className="relative flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-white fill-white" strokeWidth={0} />
                        </div>
                        <h3 className="text-white font-bold text-lg tracking-tight">
                            Reseñas ({resenas.length})
                        </h3>
                    </div>
                </div>

                {contenidoInterno(true)}
            </ModalBottom>
        );
    }

    // =========================================================================
    // DESKTOP: Modal centrado, layout horizontal
    // =========================================================================
    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            mostrarHeader={false}
            ancho="md"
            paddingContenido="none"
            className="flex flex-col h-[75vh]! lg:h-[85vh]! 2xl:h-[80vh]!"
        >
            {/* Header dorado */}
            <div
                className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
                style={{ background: GRADIENT_DORADO }}
            >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2 2xl:gap-3">
                        <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white fill-white" strokeWidth={0} />
                        </div>
                        <h3 className="text-white font-bold text-base 2xl:text-lg tracking-tight">
                            Reseñas ({resenas.length})
                        </h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {contenidoInterno(false)}
        </Modal>
    );
}

export default ModalResenas;
