/**
 * ============================================================================
 * PÁGINA: Ofertas (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/PaginaOfertas.tsx
 *
 * PROPÓSITO:
 * Página principal del módulo de ofertas en Business Studio
 * Lista de ofertas con CRUD completo
 *
 * FEATURES:
 * - Tabla desktop con header oscuro + cards horizontales móvil
 * - Filtros (búsqueda, tipo, estado)
 * - Ordenación por vistas, shares, clicks
 * - CRUD completo (Crear, Editar, Eliminar)
 * - Duplicar ofertas (todos los usuarios)
 * - Actualizaciones optimistas (React Query mutations)
 * - Responsive (móvil, laptop, desktop)
 *
 * ESTADO:
 *   - Servidor → React Query (hooks/queries/useOfertas.ts)
 *   - UI local → useState (filtros, orden, modales)
 *
 * REDISEÑO: Estandarización visual con Catálogo/Clientes/Transacciones
 * MIGRADO: React Query — Abril 2026
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Search,
    Tag,
    X,
    TrendingUp,
    Calendar,
    Clock,
    Percent,
    DollarSign,
    Gift,
    Truck,
    Sparkles,
    PauseCircle,
    Eye,
    EyeOff,
    Share2,
    MousePointerClick,
    Trash2,
    Copy,
    Flame,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Inbox,
    Layers,
    Megaphone,
    Ticket,
    Send,
    Ban,
    RefreshCw,
    CheckCircle2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../config/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import {
    useOfertasLista,
    useOfertasInvalidar,
    useCrearOferta,
    useActualizarOferta,
    useEliminarOferta,
    useDuplicarOferta,
} from '../../../../hooks/queries/useOfertas';
import { useZonaHoraria } from '../../../../hooks/useZonaHoraria';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { ModalImagenes } from '../../../../components/ui';
import Tooltip from '../../../../components/ui/Tooltip';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import { Boton } from '../../../../components/ui/Boton';
import { notificar } from '../../../../utils/notificaciones';
import { reenviarCupon } from '../../../../services/ofertasService';
import { ModalOferta } from './ModalOferta';
import { ModalDuplicarOferta } from './ModalDuplicarOferta';
import type { Oferta, TipoOferta, EstadoOferta, CrearOfertaInput, ActualizarOfertaInput } from '../../../../types/ofertas';

// =============================================================================
// TIPOS LOCALES
// =============================================================================

interface FiltrosLocales {
    busqueda: string;
    tipo: TipoOferta | 'todos';
    estado: EstadoOferta | 'todos';
    visibilidad: 'todos' | 'publico' | 'privado';
}

// =============================================================================
// TIPOS — Ordenación
// =============================================================================

type ColumnaOrden = 'vistas' | 'shares' | 'clicks';
type DireccionOrden = 'asc' | 'desc';
interface OrdenState {
    columna: ColumnaOrden;
    direccion: DireccionOrden;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const OFERTAS_POR_PAGINA = 12;

// =============================================================================
// CSS — Animación del icono del header + scroll oculto
// =============================================================================

const ESTILOS_CSS = `
  @keyframes ofertas-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .ofertas-icon-bounce {
    animation: ofertas-icon-bounce 2s ease-in-out infinite;
  }
  .ofe-carousel::-webkit-scrollbar { display: none; }
  .ofe-carousel { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// HOOK - DETECTAR MOBILE
// =============================================================================

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

// =============================================================================
// COMPONENTE: Header Ordenable (para tabla desktop)
// =============================================================================

function HeaderOrdenable({
    etiqueta,
    columna,
    ordenActual,
    onOrdenar,
}: {
    etiqueta: string;
    columna: ColumnaOrden;
    ordenActual: OrdenState | null;
    onOrdenar: (col: ColumnaOrden) => void;
}) {
    const activa = ordenActual?.columna === columna;
    return (
        <button
            onClick={() => onOrdenar(columna)}
            className="flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors group"
        >
            {etiqueta}
            {activa && ordenActual?.direccion === 'desc' && (
                <ChevronDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
            )}
            {activa && ordenActual?.direccion === 'asc' && (
                <ChevronUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
            )}
            {!activa && (
                <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white/80 group-hover:text-amber-300" />
            )}
        </button>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Retorna label legible del tipo de oferta */
function getLabelTipo(tipo: TipoOferta): string {
    switch (tipo) {
        case 'porcentaje': return 'Porcentaje';
        case 'monto_fijo': return 'Monto fijo';
        case '2x1': return '2x1';
        case '3x2': return '3x2';
        case 'envio_gratis': return 'Envío gratis';
        case 'regalo': return 'Regalo';
        case 'otro': return 'Otro';
    }
}

/** Retorna icono del tipo de oferta */
function getIconoTipo(tipo: TipoOferta) {
    switch (tipo) {
        case 'porcentaje': return Percent;
        case 'monto_fijo': return DollarSign;
        case '2x1':
        case '3x2': return Gift;
        case 'envio_gratis': return Truck;
        case 'regalo': return Gift;
        case 'otro': return Sparkles;
    }
}

/** Retorna colores para badge de tipo */
function getColoresTipo(tipo: TipoOferta): string {
    switch (tipo) {
        case 'porcentaje': return 'bg-indigo-100 text-indigo-700';
        case 'monto_fijo': return 'bg-emerald-100 text-emerald-700';
        case '2x1':
        case '3x2': return 'bg-amber-100 text-amber-700';
        case 'envio_gratis': return 'bg-sky-100 text-sky-700';
        case 'regalo': return 'bg-purple-100 text-purple-700';
        case 'otro': return 'bg-slate-200 text-slate-700';
    }
}

/** Formatea el valor de la oferta para display */
function formatearValor(tipo: string, valor: string | null): string {
    if (!valor) {
        switch (tipo) {
            case '2x1': return '2x1';
            case '3x2': return '3x2';
            case 'envio_gratis': return 'Envío gratis';
            default: return tipo.toUpperCase();
        }
    }
    switch (tipo) {
        case 'porcentaje': return `${valor}%`;
        case 'monto_fijo': return `$${valor}`;
        default: return valor;
    }
}

/** Formatea fecha a DD MMM */
function formatearFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    try {
        const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
        const partes = fechaStr.split('-');
        if (partes.length !== 3) return fecha;
        const dia = parseInt(partes[2], 10);
        const mes = parseInt(partes[1], 10);
        if (isNaN(dia) || isNaN(mes) || mes < 1 || mes > 12) return fecha;
        return `${dia} ${meses[mes - 1]}`;
    } catch {
        return fecha;
    }
}

/** Badge de estado */
function getBadgeEstado(estado: EstadoOferta, cupones = false): { label: string; clases: string } {
    if (cupones) {
        switch (estado) {
            case 'activa': return { label: 'Activo', clases: 'bg-emerald-100 text-emerald-700' };
            case 'agotada': return { label: 'Usado', clases: 'bg-sky-100 text-sky-700' };
            case 'vencida': return { label: 'Vencido', clases: 'bg-amber-100 text-amber-700' };
            case 'inactiva': return { label: 'Revocado', clases: 'bg-red-100 text-red-700' };
            default: return { label: estado, clases: 'bg-slate-200 text-slate-600' };
        }
    }
    switch (estado) {
        case 'activa': return { label: 'Activa', clases: 'bg-emerald-100 text-emerald-700' };
        case 'proxima': return { label: 'Próxima', clases: 'bg-blue-100 text-blue-700' };
        case 'vencida': return { label: 'Vencida', clases: 'bg-amber-100 text-amber-700' };
        case 'agotada': return { label: 'Agotada', clases: 'bg-red-100 text-red-700' };
        case 'inactiva': return { label: 'Inactiva', clases: 'bg-slate-200 text-slate-600' };
    }
}

// =============================================================================
// COMPONENTE: FilaMovilOferta (card horizontal para móvil)
// =============================================================================

function FilaMovilOferta({
    oferta,
    estado,
    onEditar,
    onEliminar,
    onDuplicar,
    onReenviar,
    onRevocar,
    onImagenClick,
    esDueno,
    esCupones,
}: {
    oferta: Oferta;
    estado: EstadoOferta;
    onEditar: (oferta: Oferta) => void;
    onEliminar: (id: string, titulo: string) => void;
    onDuplicar: (oferta: Oferta) => void;
    onReenviar: (oferta: Oferta) => void;
    onRevocar: (oferta: Oferta) => void;
    onImagenClick?: (url: string) => void;
    esDueno: boolean;
    esCupones: boolean;
}) {
    const IconoTipo = getIconoTipo(oferta.tipo);
    const badgeEstado = getBadgeEstado(estado, esCupones);
    const valorFormateado = formatearValor(oferta.tipo, oferta.valor);
    const esTrending = (oferta.totalVistas || 0) > 50 || (oferta.totalClicks || 0) > 20;

    return (
        <div
            onClick={() => onEditar(oferta)}
            className={`w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!oferta.activo ? 'opacity-60' : ''}`}
        >
            {/* Imagen */}
            <div
                className={`w-[76px] h-[76px] rounded-lg shrink-0 overflow-hidden ${oferta.imagen ? 'cursor-pointer' : ''}`}
                onClick={(e) => { if (oferta.imagen && onImagenClick) { e.stopPropagation(); onImagenClick(oferta.imagen); } }}
            >
                {oferta.imagen ? (
                    <img src={oferta.imagen} alt={oferta.titulo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <IconoTipo className="w-10 h-10 text-slate-600" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
                {/* Nombre + Badge estado + Valor */}
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-slate-800 truncate">{oferta.titulo}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {esTrending && <Flame className="w-4 h-4 text-orange-500" />}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${badgeEstado.clases}`}>
                                {badgeEstado.label}
                            </span>
                        </div>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-600">{valorFormateado}</span>
                </div>

                {/* Stats + Acciones */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-lg font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <Eye className="w-6 h-6" />
                            {oferta.totalVistas || 0}
                        </span>
                        <span className="w-px h-4 bg-slate-400" />
                        <span className="flex items-center gap-1.5">
                            <MousePointerClick className="w-6 h-6" />
                            {oferta.totalClicks || 0}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {oferta.visibilidad === 'privado' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onReenviar(oferta); }}
                                    className="cursor-pointer text-blue-600"
                                >
                                    <Send className="w-6 h-6" />
                                </button>
                                {oferta.activo && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRevocar(oferta); }}
                                        className="cursor-pointer text-orange-600"
                                    >
                                        <Ban className="w-6 h-6" />
                                    </button>
                                )}
                            </>
                        )}
                        {esDueno && oferta.visibilidad !== 'privado' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDuplicar(oferta); }}
                                className="cursor-pointer text-emerald-600"
                            >
                                <Copy className="w-6 h-6" />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEliminar(oferta.id, oferta.titulo); }}
                            className="cursor-pointer text-red-600"
                        >
                            <Trash2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// ESTADO VACÍO CONTEXTUAL (helper)
// =============================================================================

function mensajeVacioOfertas({
    esCupones,
    busqueda,
    textoTipoFiltro,
    tipoFiltrado,
    estadoFiltrado,
    textoEstadoFiltro,
}: {
    esCupones: boolean;
    busqueda?: string;
    textoTipoFiltro: string;
    tipoFiltrado: boolean;
    estadoFiltrado: boolean;
    textoEstadoFiltro: string;
}): { titulo: string; subtitulo: string; mostrarCTA: boolean } {
    const label = esCupones ? 'cupones' : 'ofertas';

    if (busqueda) {
        return { titulo: 'Sin resultados', subtitulo: 'Prueba con otro término de búsqueda', mostrarCTA: false };
    }
    if (tipoFiltrado) {
        return { titulo: `Sin ${textoTipoFiltro}`, subtitulo: 'Prueba con otro tipo de promoción o quita el filtro', mostrarCTA: false };
    }
    if (estadoFiltrado) {
        return { titulo: `Sin ${label} ${textoEstadoFiltro}`, subtitulo: 'Prueba cambiando el filtro de estado', mostrarCTA: false };
    }
    return {
        titulo: `Aún no tienes ${label}`,
        subtitulo: 'Crea tu primera promoción para atraer más clientes',
        mostrarCTA: true,
    };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaOfertas() {
    const { usuario } = useAuthStore();
    const totalSucursales = useAuthStore((s) => s.totalSucursales);
    // React Query — datos del servidor
    const qc = useQueryClient();
    const { data: ofertas = [], isLoading } = useOfertasLista();
    const { invalidar: invalidarOfertas, actualizarLocal } = useOfertasInvalidar();
    const crearMutation = useCrearOferta();
    const actualizarMutation = useActualizarOferta();
    const eliminarMutation = useEliminarOferta();
    const duplicarMutation = useDuplicarOferta();
    const { compararConHoy } = useZonaHoraria();

    // Estados UI
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
    const [ofertaEditando, setOfertaEditando] = useState<Oferta | null>(null);
    const [ofertaDuplicando, setOfertaDuplicando] = useState<Oferta | null>(null);
    const [ofertasCargadas, setOfertasCargadas] = useState(OFERTAS_POR_PAGINA);
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number }>({ isOpen: false, images: [], initialIndex: 0 });
    const [visibilidadNueva, setVisibilidadNueva] = useState<'publico' | 'privado'>('publico');
    const [datosPrelleno, setDatosPrelleno] = useState<Record<string, string> | null>(null);

    // Ordenación
    const [orden, setOrden] = useState<OrdenState | null>(null);

    // Dropdown tipo
    const [dropdownTipoAbierto, setDropdownTipoAbierto] = useState(false);
    const dropdownTipoRef = useRef<HTMLDivElement>(null);

    // Dropdown estado
    const [dropdownEstadoAbierto, setDropdownEstadoAbierto] = useState(false);
    const dropdownEstadoRef = useRef<HTMLDivElement>(null);

    // Detectar si estamos en mobile
    const isMobile = useIsMobile();

    // Ref para Intersection Observer
    const observerRef = useRef<HTMLDivElement>(null);

    // Filtros
    const [filtros, setFiltros] = useState<FiltrosLocales>({
        busqueda: '',
        tipo: 'todos',
        estado: 'todos',
        visibilidad: 'publico',
    });

    const esCupones = filtros.visibilidad === 'privado';

    // Limpiar búsqueda al desmontar
    useEffect(() => {
        return () => setFiltros((prev) => ({ ...prev, busqueda: '' }));
    }, []);

    // Reset COMPLETO al cambiar de sucursal (jerarquía sucursal > toggle > filtros).
    // Resetea búsqueda, toggle (Ofertas/Cupones), tipo, estado — todo a default.
    useEffect(() => {
        setFiltros({ busqueda: '', tipo: 'todos', estado: 'todos', visibilidad: 'publico' });
    }, [usuario?.sucursalActiva]);

    // Determinar si es dueño o gerente
    const esDueno = !usuario?.sucursalAsignada;
    const esGerente = !!usuario?.sucursalAsignada;

    // ===========================================================================
    // HANDLERS PARA MODAL DE IMÁGENES
    // ===========================================================================

    const abrirImagenUnica = (url: string) => {
        setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 });
    };

    const cerrarModalImagenes = () => {
        setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });
    };

    // ===========================================================================
    // CALCULAR ESTADO DE OFERTA (CON ZONA HORARIA)
    // ===========================================================================

    const calcularEstado = (oferta: Oferta): EstadoOferta => {
        // Si el backend ya calculó el estado (incluye lógica de oferta_usuarios para cupones), usarlo
        if (oferta.estado) return oferta.estado;
        if (!oferta.activo) return 'inactiva';
        const comparacionInicio = compararConHoy(oferta.fechaInicio);
        const comparacionFin = compararConHoy(oferta.fechaFin);
        if (comparacionInicio > 0) return 'proxima';
        if (comparacionFin < 0) return 'vencida';
        if (oferta.limiteUsos !== null && oferta.usosActuales >= oferta.limiteUsos) return 'agotada';
        return 'activa';
    };

    // ===========================================================================
    // FILTRAR OFERTAS
    // ===========================================================================

    const ofertasFiltradas = useMemo(() => {
        return ofertas.filter((oferta) => {
            if (filtros.busqueda && !oferta.titulo.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
            if (filtros.tipo !== 'todos' && oferta.tipo !== filtros.tipo) return false;
            if (filtros.estado !== 'todos') {
                if (calcularEstado(oferta) !== filtros.estado) return false;
            }
            if (filtros.visibilidad !== 'todos') {
                const vis = oferta.visibilidad || 'publico';
                if (vis !== filtros.visibilidad) return false;
            }
            return true;
        });
    }, [ofertas, filtros]);

    // Tipos y estados únicos presentes en la sucursal activa Y en el tab actual (Ofertas vs Cupones).
    // Solo consideran ofertas con la misma visibilidad que el tab activo, así el dropdown nunca
    // muestra una opción que dejaría la tabla vacía. Se recalculan automáticamente al mutar
    // ofertas o cambiar de tab gracias a las dependencias.
    const tiposDisponibles = useMemo(() => {
        const tipos = new Set<TipoOferta>();
        ofertas.forEach((oferta) => {
            const vis = oferta.visibilidad || 'publico';
            if (vis !== filtros.visibilidad) return;
            if (oferta.tipo) tipos.add(oferta.tipo as TipoOferta);
        });
        return tipos;
    }, [ofertas, filtros.visibilidad]);

    const estadosDisponibles = useMemo(() => {
        const estados = new Set<EstadoOferta>();
        ofertas.forEach((oferta) => {
            const vis = oferta.visibilidad || 'publico';
            if (vis !== filtros.visibilidad) return;
            estados.add(calcularEstado(oferta));
        });
        return estados;
    }, [ofertas, filtros.visibilidad]);

    // ===========================================================================
    // ORDENAR OFERTAS
    // ===========================================================================

    const ofertasOrdenadas = useMemo(() => {
        const base = [...ofertasFiltradas].sort((a, b) => {
            const estadoA = calcularEstado(a);
            const estadoB = calcularEstado(b);

            if (esCupones) {
                // Cupones: Activo → Usado → Revocado
                const prioridadCupon: Record<string, number> = { activa: 0, agotada: 1, vencida: 2, inactiva: 3 };
                const pA = prioridadCupon[estadoA] ?? 2;
                const pB = prioridadCupon[estadoB] ?? 2;
                if (pA !== pB) return pA - pB;
                return new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime();
            }

            // Ofertas: orden original
            if (estadoA === 'inactiva' && estadoB !== 'inactiva') return -1;
            if (estadoA !== 'inactiva' && estadoB === 'inactiva') return 1;
            if (estadoA === 'vencida' && estadoB !== 'vencida' && estadoB !== 'inactiva') return -1;
            if (estadoA !== 'vencida' && estadoA !== 'inactiva' && estadoB === 'vencida') return 1;
            if (estadoA !== 'inactiva' && estadoA !== 'vencida' && estadoB !== 'inactiva' && estadoB !== 'vencida') {
                return new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime();
            }
            return 0;
        });

        if (!orden) return base;

        return base.sort((a, b) => {
            let valorA: number, valorB: number;
            switch (orden.columna) {
                case 'vistas': valorA = a.totalVistas || 0; valorB = b.totalVistas || 0; break;
                case 'shares': valorA = a.totalShares || 0; valorB = b.totalShares || 0; break;
                case 'clicks': valorA = a.totalClicks || 0; valorB = b.totalClicks || 0; break;
                default: return 0;
            }
            return orden.direccion === 'asc' ? valorA - valorB : valorB - valorA;
        });
    }, [ofertasFiltradas, orden, esCupones]);

    // ===========================================================================
    // OFERTAS MOSTRADAS (Mobile: infinite scroll)
    // ===========================================================================

    const ofertasMostradas = useMemo(() => {
        if (isMobile) return ofertasOrdenadas.slice(0, ofertasCargadas);
        return ofertasOrdenadas;
    }, [ofertasOrdenadas, ofertasCargadas, isMobile]);

    const hayMas = isMobile && ofertasCargadas < ofertasOrdenadas.length;

    // Cerrar dropdowns al hacer click fuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (dropdownTipoRef.current && !dropdownTipoRef.current.contains(e.target as Node)) {
                setDropdownTipoAbierto(false);
            }
        };
        if (dropdownTipoAbierto) {
            document.addEventListener('mousedown', handleClickFuera);
            return () => document.removeEventListener('mousedown', handleClickFuera);
        }
    }, [dropdownTipoAbierto]);

    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(e.target as Node)) {
                setDropdownEstadoAbierto(false);
            }
        };
        if (dropdownEstadoAbierto) {
            document.addEventListener('mousedown', handleClickFuera);
            return () => document.removeEventListener('mousedown', handleClickFuera);
        }
    }, [dropdownEstadoAbierto]);

    // Resetear al cambiar filtros
    useEffect(() => { setOfertasCargadas(OFERTAS_POR_PAGINA); }, [filtros]);
    useEffect(() => { setOfertasCargadas(OFERTAS_POR_PAGINA); }, [isMobile]);

    // ===========================================================================
    // INTERSECTION OBSERVER - INFINITE SCROLL (SOLO MOBILE)
    // ===========================================================================

    const cargarMas = useCallback(() => {
        if (isMobile && ofertasCargadas < ofertasOrdenadas.length) {
            setOfertasCargadas(prev => Math.min(prev + OFERTAS_POR_PAGINA, ofertasOrdenadas.length));
        }
    }, [isMobile, ofertasCargadas, ofertasOrdenadas.length]);

    useEffect(() => {
        if (!isMobile || !observerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hayMas) cargarMas();
            },
            { root: null, rootMargin: '100px', threshold: 0.1 }
        );
        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [isMobile, hayMas, cargarMas]);

    // ===========================================================================
    // ESTADÍSTICAS RÁPIDAS
    // ===========================================================================

    const estadisticas = useMemo(() => {
        const filtradas = ofertas.filter((o) => (o.visibilidad || 'publico') === (esCupones ? 'privado' : 'publico'));
        const activas = filtradas.filter((o) => calcularEstado(o) === 'activa').length;
        const proximas = filtradas.filter((o) => calcularEstado(o) === 'proxima').length;
        const vencidas = filtradas.filter((o) => calcularEstado(o) === 'vencida').length;
        const inactivas = filtradas.filter((o) => calcularEstado(o) === 'inactiva').length;
        const agotadas = filtradas.filter((o) => calcularEstado(o) === 'agotada').length;
        return { activas, proximas, vencidas, inactivas, agotadas, total: filtradas.length };
    }, [ofertas, esCupones]);

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const handleCrear = () => {
        setOfertaEditando(null);
        setVisibilidadNueva(filtros.visibilidad === 'privado' ? 'privado' : 'publico');
        setModalAbierto(true);
    };

    const handleEditar = (oferta: Oferta) => {
        setOfertaEditando(oferta);
        setModalAbierto(true);
    };

    const handleEliminar = async (id: string, titulo: string) => {
        const confirmado = await notificar.confirmar(`¿Eliminar "${titulo}"?`);
        if (!confirmado) return;
        try {
            await eliminarMutation.mutateAsync(id);
        } catch {
            // Error ya notificado por la mutación
        }
    };

    const handleReenviarCupon = async (oferta: Oferta) => {
        if (oferta.visibilidad !== 'privado') return;
        const confirmado = await notificar.confirmar(`¿Reenviar cupón "${oferta.titulo}" a todos los clientes asignados?`);
        if (!confirmado) return;
        try {
            const res = await reenviarCupon(oferta.id);
            if (res.success) notificar.exito(res.message || 'Cupón reenviado');
            else notificar.error(res.message || 'Error al reenviar');
        } catch {
            notificar.error('Error al reenviar cupón');
        }
    };

    const handleRevocarCupon = async (oferta: Oferta) => {
        if (oferta.visibilidad !== 'privado') return;
        const confirmado = await notificar.confirmar(`¿Revocar cupón "${oferta.titulo}" para todos los clientes? Ya no podrán canjearlo.`);
        if (!confirmado) return;
        try {
            const { revocarCuponMasivo } = await import('../../../../services/ofertasService');
            const res = await revocarCuponMasivo(oferta.id);
            if (res.success) {
                notificar.exito(res.message || 'Cupón revocado');
                actualizarLocal(prev => prev.map(o => o.id === oferta.id ? { ...o, activo: false, estado: 'inactiva' as const } : o));
                // invalidarOfertas ahora cubre lista, dashboard y negocios públicos.
                invalidarOfertas();
                // Lista de clientes asignados al cupón: el estado de cada cliente
                // cambia al revocar masivamente.
                qc.invalidateQueries({ queryKey: queryKeys.ofertas.clientesAsignados(oferta.id) });
            } else {
                notificar.error(res.message || 'Error al revocar');
            }
        } catch {
            notificar.error('Error al revocar cupón');
        }
    };

    const handleReactivarCupon = async (oferta: Oferta) => {
        if (oferta.visibilidad !== 'privado') return;
        const confirmado = await notificar.confirmar(`¿Reactivar cupón "${oferta.titulo}" para todos los clientes?`);
        if (!confirmado) return;
        try {
            const { reactivarCuponService } = await import('../../../../services/ofertasService');
            const res = await reactivarCuponService(oferta.id);
            if (res.success) {
                notificar.exito(res.message || 'Cupón reactivado');
                actualizarLocal(prev => prev.map(o => o.id === oferta.id ? { ...o, activo: true, estado: 'activa' as const } : o));
                invalidarOfertas();
                qc.invalidateQueries({ queryKey: queryKeys.ofertas.clientesAsignados(oferta.id) });
            } else {
                notificar.error(res.message || 'Error al reactivar');
            }
        } catch {
            notificar.error('Error al reactivar cupón');
        }
    };

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            await actualizarMutation.mutateAsync({ id, datos: { activo } });
        } catch {
            // Error ya notificado por la mutación
        }
    };

    const handleDuplicar = async (oferta: Oferta) => {
        if (esGerente && usuario?.sucursalAsignada) {
            try {
                await duplicarMutation.mutateAsync({ id: oferta.id, datos: { sucursalesIds: [usuario.sucursalAsignada] } });
            } catch { /* Error ya notificado */ }
            return;
        }
        if (esDueno) {
            // Dueño con 1 sola sucursal → duplicar directo sin modal
            if (totalSucursales <= 1 && usuario?.sucursalActiva) {
                try {
                    await duplicarMutation.mutateAsync({ id: oferta.id, datos: { sucursalesIds: [usuario.sucursalActiva] } });
                } catch { /* Error ya notificado */ }
                return;
            }
            setOfertaDuplicando(oferta);
            setModalDuplicarAbierto(true);
        }
    };

    const limpiarFiltros = () => {
        setFiltros(prev => ({ busqueda: '', tipo: 'todos', estado: 'todos', visibilidad: prev.visibilidad }));
    };

    const alternarOrden = (columna: ColumnaOrden) => {
        setOrden(prev => {
            if (prev?.columna === columna) {
                return prev.direccion === 'desc' ? { columna, direccion: 'asc' } : null;
            }
            return { columna, direccion: 'desc' };
        });
    };

    const hayFiltrosActivos =
        filtros.busqueda !== '' || filtros.tipo !== 'todos' || filtros.estado !== 'todos';

    // Texto dinámico del tipo para contador
    const textoVisibilidad = filtros.visibilidad === 'publico' ? 'ofertas' : filtros.visibilidad === 'privado' ? 'cupones' : 'promociones';
    const textoTipoFiltro = filtros.tipo !== 'todos' ? getLabelTipo(filtros.tipo as TipoOferta).toLowerCase() : textoVisibilidad;
    const textoEstadoFiltro = filtros.estado !== 'todos' ? getBadgeEstado(filtros.estado as EstadoOferta, esCupones).label.toLowerCase() + 's' : '';

    // ===========================================================================
    // RENDER: LOADING
    // ===========================================================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    // ===========================================================================
    // RENDER: PRINCIPAL
    // ===========================================================================

    return (
        <div className="p-3 lg:p-1.5 2xl:p-3">
            <style dangerouslySetInnerHTML={{ __html: ESTILOS_CSS }} />

            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

                {/* ================================================================= */}
                {/* HEADER + KPIs                                                     */}
                {/* ================================================================= */}

                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                    {/* Header con icono animado + Switch móvil estado */}
                    <div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
                        <div
                            className="hidden lg:flex items-center justify-center shrink-0"
                            style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: 'linear-gradient(135deg, #f43f5e, #fb7185, #fda4af)',
                                boxShadow: '0 6px 20px rgba(244,63,94,0.4)',
                            }}
                        >
                            <div className="ofertas-icon-bounce">
                                <Tag className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Promociones
                            </h1>
                            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium whitespace-nowrap">
                                Tus ofertas y cupones
                            </p>
                        </div>

                        {/* Toggle Ofertas / Cupones */}
                        <div className="hidden lg:flex items-center bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300 shrink-0">
                            <Tooltip text="Ofertas" position="bottom">
                                <button
                                    data-testid="toggle-ofertas"
                                    onClick={() => setFiltros(prev => ({ ...prev, visibilidad: 'publico' as const, tipo: 'todos' as const, estado: 'todos' as const }))}
                                    className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md cursor-pointer ${
                                        !esCupones ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'
                                    }`}
                                    style={!esCupones ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                >
                                    <Megaphone className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                </button>
                            </Tooltip>
                            <Tooltip text="Cupones" position="bottom">
                                <button
                                    data-testid="toggle-cupones"
                                    onClick={() => setFiltros(prev => ({ ...prev, visibilidad: 'privado' as const, tipo: 'todos' as const, estado: 'todos' as const }))}
                                    className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md cursor-pointer ${
                                        esCupones ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'
                                    }`}
                                    style={esCupones ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                >
                                    <Ticket className="w-4 h-4 2xl:w-5 2xl:h-5" />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Botón — solo móvil, visible en filtros */}
                    </div>

                    {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop (INFORMACIONALES) */}
                    <CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
                        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
                            {/* Total */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #eff6ff, #fff)',
                                    border: '2px solid #93c5fd',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', boxShadow: '0 3px 8px rgba(37,99,235,0.25)' }}
                                >
                                    {esCupones
                                        ? <Ticket className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                                        : <Megaphone className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                                    }
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">{estadisticas.total}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Total</div>
                                </div>
                            </div>

                            {/* Activas/Activos */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                                    border: '2px solid #86efac',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                                >
                                    <TrendingUp className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">{estadisticas.activas}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">{esCupones ? 'Activos' : 'Activas'}</div>
                                </div>
                            </div>

                            {/* Inactivas/Revocados — Usados (cupones) / Próximas (ofertas) */}
                            {esCupones ? (
                                <>
                                    {/* Usados — sky (completado positivamente, distinto de activo en emerald) */}
                                    <div
                                        className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                        style={{
                                            background: 'linear-gradient(135deg, #f0f9ff, #fff)',
                                            border: '2px solid #7dd3fc',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #bae6fd, #7dd3fc)', boxShadow: '0 3px 8px rgba(2,132,199,0.25)' }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-sky-700" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-sky-700">{estadisticas.agotadas}</div>
                                            <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Usados</div>
                                        </div>
                                    </div>

                                    {/* Revocados */}
                                    <div
                                        className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                        style={{
                                            background: 'linear-gradient(135deg, #fef2f2, #fff)',
                                            border: '2px solid #fca5a5',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                                        >
                                            <PauseCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">{estadisticas.inactivas}</div>
                                            <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Revocados</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Inactivas */}
                                    <div
                                        className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                        style={{
                                            background: 'linear-gradient(135deg, #fef2f2, #fff)',
                                            border: '2px solid #fca5a5',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                                        >
                                            <PauseCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">{estadisticas.inactivas}</div>
                                            <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Inactivas</div>
                                        </div>
                                    </div>

                                    {/* Próximas */}
                                    <div
                                        className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                        style={{
                                            background: 'linear-gradient(135deg, #fffbeb, #fff)',
                                            border: '2px solid #fcd34d',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(217,119,6,0.25)' }}
                                        >
                                            <Calendar className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">{estadisticas.proximas}</div>
                                            <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Próximas</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Vencidas/Vencidos — amber (advertencia, llegó a su fin) */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #fffbeb, #fff)',
                                    border: '2px solid #fcd34d',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(180,83,9,0.25)' }}
                                >
                                    <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">{estadisticas.vencidas}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">{esCupones ? 'Vencidos' : 'Vencidas'}</div>
                                </div>
                            </div>
                        </div>
                </CarouselKPI>
                </div>

                {/* ================================================================= */}
                {/* BOTÓN NUEVA OFERTA — solo móvil                                   */}
                {/* ================================================================= */}

                {/* ================================================================= */}
                {/* TOGGLE Ofertas/Cupones — solo móvil, fuera del contenedor         */}
                {/* ================================================================= */}

                <div className="lg:hidden flex w-full bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5">
                    <button
                        onClick={() => setFiltros(prev => ({ ...prev, visibilidad: 'publico' as const, tipo: 'todos' as const, estado: 'todos' as const }))}
                        className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg font-semibold text-sm cursor-pointer ${
                            !esCupones ? 'text-white shadow-md' : 'text-slate-700'
                        }`}
                        style={!esCupones ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                        <Megaphone className="w-4 h-4" />
                        Ofertas
                    </button>
                    <button
                        onClick={() => setFiltros(prev => ({ ...prev, visibilidad: 'privado' as const, tipo: 'todos' as const, estado: 'todos' as const }))}
                        className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg font-semibold text-sm cursor-pointer ${
                            esCupones ? 'text-white shadow-md' : 'text-slate-700'
                        }`}
                        style={esCupones ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                        <Ticket className="w-4 h-4" />
                        Cupones
                    </button>
                </div>

                {/* ================================================================= */}
                {/* FILTROS: Estado + Búsqueda + Nueva                                */}
                {/* ================================================================= */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                        {/* Filtros */}
                        <div className="flex items-center gap-2 lg:contents">
                            {/* Dropdown de estado */}
                            <div ref={dropdownEstadoRef} className="relative flex-1 lg:flex-none">
                                <button
                                    onClick={() => setDropdownEstadoAbierto(prev => !prev)}
                                    className={`flex items-center gap-1.5 w-full lg:w-40 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.estado !== 'todos'
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    {filtros.estado === 'todos'    && <Layers className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    {filtros.estado === 'activa'   && <TrendingUp className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    {filtros.estado === 'inactiva' && <PauseCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    {filtros.estado === 'proxima'  && <Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    {filtros.estado === 'vencida'  && <Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    {filtros.estado === 'agotada'  && <Tag className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    <span className="truncate">
                                        {filtros.estado === 'todos' ? 'Estado' : getBadgeEstado(filtros.estado as EstadoOferta, esCupones).label}
                                    </span>
                                    <ChevronDown className={`ml-auto w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 transition-transform shrink-0 ${dropdownEstadoAbierto ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdownEstadoAbierto && (
                                    <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-1.5 w-full lg:w-40 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                                        {(esCupones ? [
                                            { value: 'todos',    label: 'Todos',     icono: Layers },
                                            { value: 'activa',   label: 'Activos',   icono: TrendingUp },
                                            { value: 'agotada',  label: 'Usados',    icono: CheckCircle2 },
                                            { value: 'inactiva', label: 'Revocados', icono: PauseCircle },
                                            { value: 'vencida',  label: 'Vencidos',  icono: Clock },
                                        ] : [
                                            { value: 'todos',    label: 'Todos',     icono: Layers },
                                            { value: 'activa',   label: 'Activas',   icono: TrendingUp },
                                            { value: 'inactiva', label: 'Inactivas', icono: PauseCircle },
                                            { value: 'proxima',  label: 'Próximas',  icono: Calendar },
                                            { value: 'vencida',  label: 'Vencidas',  icono: Clock },
                                            { value: 'agotada',  label: 'Agotadas',  icono: Tag },
                                        ] as { value: EstadoOferta | 'todos'; label: string; icono: typeof Layers }[])
                                          .filter(({ value }) => value === 'todos' || estadosDisponibles.has(value as EstadoOferta))
                                          .map(({ value, label, icono: Icono }) => (
                                            <button
                                                key={value}
                                                onClick={() => { setFiltros(prev => ({ ...prev, estado: value as FiltrosLocales['estado'] })); setDropdownEstadoAbierto(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${filtros.estado === value ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                                            >
                                                <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${filtros.estado === value ? 'border-blue-500' : 'border-slate-300'}`}>
                                                    {filtros.estado === value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                </div>
                                                <Icono className="w-3.5 h-3.5 shrink-0" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Dropdown de tipo (solo desktop) */}
                            <div ref={dropdownTipoRef} className="relative hidden lg:block lg:flex-none">
                                <button
                                    onClick={() => setDropdownTipoAbierto(prev => !prev)}
                                    className={`flex items-center gap-1.5 w-full lg:w-48 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.tipo !== 'todos'
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    {filtros.tipo !== 'todos' ? (() => {
                                        const IconoActivo = getIconoTipo(filtros.tipo as TipoOferta);
                                        return <IconoActivo className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />;
                                    })() : <Tag className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                                    <span className="truncate">{filtros.tipo === 'todos' ? 'Tipo' : getLabelTipo(filtros.tipo as TipoOferta)}</span>
                                    <ChevronDown className={`ml-auto w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 transition-transform shrink-0 ${dropdownTipoAbierto ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdownTipoAbierto && (
                                    <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-1.5 w-full lg:w-48 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                                        <button
                                            onClick={() => { setFiltros(prev => ({ ...prev, tipo: 'todos' })); setDropdownTipoAbierto(false); }}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${filtros.tipo === 'todos' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                                        >
                                            <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${filtros.tipo === 'todos' ? 'border-blue-500' : 'border-slate-300'}`}>
                                                {filtros.tipo === 'todos' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                            </div>
                                            Todos
                                        </button>
                                        {([
                                            { value: 'porcentaje' as TipoOferta, icon: Percent },
                                            { value: 'monto_fijo' as TipoOferta, icon: DollarSign },
                                            { value: '2x1' as TipoOferta, icon: Gift },
                                            { value: '3x2' as TipoOferta, icon: Gift },
                                            { value: 'envio_gratis' as TipoOferta, icon: Truck },
                                            { value: 'otro' as TipoOferta, icon: Sparkles },
                                        ]).filter(({ value }) => tiposDisponibles.has(value)).map(({ value, icon: Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => { setFiltros(prev => ({ ...prev, tipo: value })); setDropdownTipoAbierto(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${filtros.tipo === value ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                                            >
                                                <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${filtros.tipo === value ? 'border-blue-500' : 'border-slate-300'}`}>
                                                    {filtros.tipo === value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                </div>
                                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                                {getLabelTipo(value)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Nuevo — móvil (estilo Catálogo) */}
                            <button
                                data-testid="btn-nueva-promocion"
                                onClick={handleCrear}
                                className="lg:hidden shrink-0 flex items-center gap-1.5 h-11 px-4 rounded-lg text-base font-bold text-white cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                            >
                                <Plus className="w-4 h-4" />
                                {esCupones ? 'Nuevo Cupón' : 'Nueva Oferta'}
                            </button>
                        </div>

                        {/* Móvil línea 2: Buscador | Desktop: Buscador + Nueva */}
                        <div className="flex items-center gap-2 lg:flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                                <Input
                                    id="input-busqueda-ofertas"
                                    name="input-busqueda-ofertas"
                                    type="text"
                                    placeholder="Buscar por título..."
                                    icono={<Search className="w-4 h-4 text-slate-600" />}
                                    value={filtros.busqueda}
                                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                                    className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
                                    elementoDerecha={filtros.busqueda ? (
                                        <button
                                            type="button"
                                            onClick={() => setFiltros((prev) => ({ ...prev, busqueda: '' }))}
                                            className="p-1 rounded-full text-red-600 hover:bg-red-100 cursor-pointer"
                                        >
                                            <X className="w-[18px] h-[18px]" />
                                        </button>
                                    ) : undefined}
                                />
                            </div>
                            {/* {esCupones ? 'Nuevo Cupón' : 'Nueva Oferta'} — desktop */}
                            <button
                                data-testid="btn-nueva-promocion-desktop"
                                onClick={handleCrear}
                                className="hidden lg:flex shrink-0 items-center gap-1.5 h-10 2xl:h-11 px-4 2xl:px-5 rounded-lg text-sm 2xl:text-base font-bold text-white cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                            >
                                <Plus className="w-4 h-4" />
                                {esCupones ? 'Nuevo Cupón' : 'Nueva Oferta'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between px-1 mt-3 lg:mt-2 2xl:mt-3 mb-1">
                    <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                        {hayFiltrosActivos
                            ? `${ofertasOrdenadas.length} de ${estadisticas.total} ${textoTipoFiltro}${textoEstadoFiltro ? ` ${textoEstadoFiltro}` : ''}`
                            : `${ofertasOrdenadas.length} ${textoTipoFiltro}`
                        }
                    </span>
                    {hayFiltrosActivos && (
                        <button
                            onClick={limpiarFiltros}
                            className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-semibold hover:text-red-700 cursor-pointer"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {/* ================================================================= */}
                {/* TABLA DESKTOP (≥lg)                                               */}
                {/* ================================================================= */}

                {!isMobile && (
                    <div
                        className="rounded-xl overflow-hidden border-2 border-slate-300"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                        {/* Header dark */}
                        <div
                            className={`grid ${esCupones
                                ? 'grid-cols-[minmax(0,1fr)_110px_110px_120px_120px] 2xl:grid-cols-[minmax(0,1fr)_130px_130px_140px_150px]'
                                : 'grid-cols-[minmax(0,1fr)_85px_80px_70px_70px_70px_95px_95px] 2xl:grid-cols-[minmax(0,1fr)_100px_95px_85px_85px_85px_115px_120px]'
                            } gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2 lg:py-2 2xl:py-2 h-12 items-center text-[11px] lg:text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider`}
                            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                        >
                            <span>{esCupones ? 'Cupón' : 'Oferta'}</span>
                            <span className="flex justify-center pr-5">Tipo</span>
                            <span className="flex justify-center pr-5">Estado</span>
                            {!esCupones && (
                                <>
                                    <span className="flex justify-center pr-5">
                                        <HeaderOrdenable etiqueta="VISTAS" columna="vistas" ordenActual={orden} onOrdenar={alternarOrden} />
                                    </span>
                                    <span className="flex justify-center pr-5">
                                        <HeaderOrdenable etiqueta="SHARES" columna="shares" ordenActual={orden} onOrdenar={alternarOrden} />
                                    </span>
                                    <span className="flex justify-center pr-5">
                                        <HeaderOrdenable etiqueta="CLICKS" columna="clicks" ordenActual={orden} onOrdenar={alternarOrden} />
                                    </span>
                                </>
                            )}
                            <span className="flex justify-center pr-5">Vigencia</span>
                            <span className="flex justify-center pl-3">Acciones</span>
                        </div>

                        {/* Body scrolleable */}
                        <div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-395px)] overflow-y-auto bg-white">
                            {ofertasOrdenadas.length === 0 ? (
                                (() => {
                                    const mensaje = mensajeVacioOfertas({
                                        esCupones,
                                        busqueda: filtros.busqueda,
                                        textoTipoFiltro,
                                        tipoFiltrado: filtros.tipo !== 'todos',
                                        estadoFiltrado: filtros.estado !== 'todos',
                                        textoEstadoFiltro,
                                    });
                                    return (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-600 text-center px-4">
                                            <Inbox className="w-10 h-10 mb-2" />
                                            <p className="text-sm font-semibold text-slate-700">{mensaje.titulo}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-1">{mensaje.subtitulo}</p>
                                            {mensaje.mostrarCTA && (
                                                <Boton variante="primario" iconoIzquierda={<Plus className="w-4 h-4" />} onClick={handleCrear} className="mt-3">
                                                    {esCupones ? 'Crear Primer Cupón' : 'Crear Primera Oferta'}
                                                </Boton>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : (
                                ofertasOrdenadas.map((oferta, i) => {
                                    const estado = calcularEstado(oferta);
                                    const badgeEstado = getBadgeEstado(estado, esCupones);
                                    const IconoTipo = getIconoTipo(oferta.tipo);
                                    const coloresTipo = getColoresTipo(oferta.tipo);
                                    const esTrending = (oferta.totalVistas || 0) > 50 || (oferta.totalClicks || 0) > 20;

                                    return (
                                        <div
                                            key={oferta.id}
                                            onClick={() => handleEditar(oferta)}
                                            className={`grid ${esCupones
                                                ? 'grid-cols-[minmax(0,1fr)_110px_110px_120px_120px] 2xl:grid-cols-[minmax(0,1fr)_130px_130px_140px_150px]'
                                                : 'grid-cols-[minmax(0,1fr)_85px_80px_70px_70px_70px_95px_95px] 2xl:grid-cols-[minmax(0,1fr)_100px_95px_85px_85px_85px_115px_120px]'
                                            } gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-xs 2xl:text-sm border-b border-slate-300 hover:bg-slate-200 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'} ${!oferta.activo ? 'opacity-60' : ''}`}
                                        >
                                            {/* Oferta: Imagen + Título + Valor */}
                                            <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                                                <div
                                                    className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={(e) => { if (oferta.imagen) { e.stopPropagation(); abrirImagenUnica(oferta.imagen); } }}
                                                >
                                                    {oferta.imagen ? (
                                                        <img src={oferta.imagen} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                            <IconoTipo className="w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex items-center gap-1.5">
                                                    <p className="font-semibold text-slate-800 truncate 2xl:text-[15px]">{oferta.titulo}</p>
                                                    {esTrending && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                                </div>
                                            </div>

                                            {/* Tipo */}
                                            <div className="flex items-center justify-center">
                                                <span className={`inline-flex items-center gap-1 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold whitespace-nowrap ${coloresTipo}`}>
                                                    <IconoTipo className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                                                    {formatearValor(oferta.tipo, oferta.valor)}
                                                </span>
                                            </div>

                                            {/* Estado */}
                                            <div className="flex items-center justify-center">
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${badgeEstado.clases}`}>
                                                    {badgeEstado.label}
                                                </span>
                                            </div>

                                            {!esCupones && (
                                                <>
                                                    {/* Vistas */}
                                                    <div className="flex items-center justify-center text-slate-600 font-bold 2xl:text-[15px]">
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                            {oferta.totalVistas || 0}
                                                        </span>
                                                    </div>

                                                    {/* Shares */}
                                                    <div className="flex items-center justify-center text-slate-600 font-bold 2xl:text-[15px]">
                                                        <span className="flex items-center gap-1">
                                                            <Share2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                            {oferta.totalShares || 0}
                                                        </span>
                                                    </div>

                                                    {/* Clicks */}
                                                    <div className="flex items-center justify-center text-slate-600 font-bold 2xl:text-[15px]">
                                                        <span className="flex items-center gap-1">
                                                            <MousePointerClick className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                            {oferta.totalClicks || 0}
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            {/* Fechas */}
                                            <div className="flex items-center justify-center text-slate-600 font-medium">
                                                <span className="text-sm lg:text-[11px] 2xl:text-sm">
                                                    {formatearFecha(oferta.fechaInicio)} - {formatearFecha(oferta.fechaFin)}
                                                </span>
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center justify-end gap-1 2xl:gap-1.5">
                                                {oferta.visibilidad !== 'privado' && (
                                                    <Tooltip text={oferta.activo ? 'Ocultar' : 'Mostrar'}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleActivo(oferta.id, !oferta.activo); }}
                                                            className="p-1.5 rounded-lg cursor-pointer hover:bg-green-100"
                                                        >
                                                            {oferta.activo
                                                                ? <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-700" />
                                                                : <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-700" />
                                                            }
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {/* Cupón: Revocar / Reactivar (no si está agotado/usado) */}
                                                {oferta.visibilidad === 'privado' && oferta.activo && oferta.estado !== 'agotada' && oferta.estado !== 'vencida' && (
                                                    <Tooltip text="Revocar cupón">
                                                        <button
                                                            data-testid={`btn-revocar-${oferta.id}`}
                                                            onClick={(e) => { e.stopPropagation(); handleRevocarCupon(oferta); }}
                                                            className="p-1.5 rounded-lg cursor-pointer text-orange-600 hover:bg-orange-100"
                                                        >
                                                            <Ban className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {oferta.visibilidad === 'privado' && !oferta.activo && (
                                                    <Tooltip text="Reactivar cupón">
                                                        <button
                                                            data-testid={`btn-reactivar-${oferta.id}`}
                                                            onClick={(e) => { e.stopPropagation(); handleReactivarCupon(oferta); }}
                                                            className="p-1.5 rounded-lg cursor-pointer text-emerald-600 hover:bg-emerald-100"
                                                        >
                                                            <RefreshCw className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {/* Eliminar */}
                                                <Tooltip text="Eliminar">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEliminar(oferta.id, oferta.titulo); }}
                                                        className="p-1.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                    </button>
                                                </Tooltip>
                                                {/* Cupón: Reenviar (no si está agotado/usado) */}
                                                {oferta.visibilidad === 'privado' && oferta.estado !== 'agotada' && oferta.estado !== 'vencida' && (
                                                    <Tooltip text="Reenviar cupón">
                                                        <button
                                                            data-testid={`btn-reenviar-${oferta.id}`}
                                                            onClick={(e) => { e.stopPropagation(); handleReenviarCupon(oferta); }}
                                                            className="p-1.5 rounded-lg cursor-pointer text-blue-600 hover:bg-blue-100"
                                                        >
                                                            <Send className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {esDueno && oferta.visibilidad !== 'privado' && (
                                                    <Tooltip text="Duplicar">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicar(oferta); }}
                                                            className="p-1.5 rounded-lg cursor-pointer text-emerald-600 hover:bg-emerald-100"
                                                        >
                                                            <Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ================================================================= */}
                {/* LISTA MOBILE (<lg)                                                */}
                {/* ================================================================= */}

                {isMobile && (
                    <div className="space-y-2">
                        {/* Chips de orden (móvil) */}
                        <div className="flex items-center bg-slate-800 rounded-xl border-2 border-slate-700 p-0.5 shadow-md">
                            {([
                                { col: 'vistas' as ColumnaOrden, etiqueta: 'Vistas' },
                                { col: 'shares' as ColumnaOrden, etiqueta: 'Shares' },
                                { col: 'clicks' as ColumnaOrden, etiqueta: 'Clicks' },
                            ]).map(({ col, etiqueta }) => {
                                const activa = orden?.columna === col;
                                return (
                                    <button
                                        key={col}
                                        onClick={() => alternarOrden(col)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${activa
                                            ? 'bg-slate-300 text-slate-900 shadow-md'
                                            : 'text-white lg:hover:bg-white/10'
                                        }`}
                                    >
                                        {etiqueta}
                                        {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                                        {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                                        {!activa && <ArrowUpDown className="w-4 h-4 text-white" strokeWidth={2.5} />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Lista */}
                        {ofertasMostradas.length === 0 ? (
                            (() => {
                                const mensaje = mensajeVacioOfertas({
                                    esCupones,
                                    busqueda: filtros.busqueda,
                                    textoTipoFiltro,
                                    tipoFiltrado: filtros.tipo !== 'todos',
                                    estadoFiltrado: filtros.estado !== 'todos',
                                    textoEstadoFiltro,
                                });
                                return (
                                    <div className="bg-white rounded-xl shadow-md border-2 border-slate-300 p-8 text-center">
                                        <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-base font-bold text-slate-800 mb-1">{mensaje.titulo}</p>
                                        <p className="text-sm text-slate-600 font-medium">{mensaje.subtitulo}</p>
                                        {mensaje.mostrarCTA && (
                                            <Boton variante="primario" iconoIzquierda={<Plus className="w-5 h-5" />} onClick={handleCrear} className="mt-4">
                                                {esCupones ? 'Crear Primer Cupón' : 'Crear Primera Oferta'}
                                            </Boton>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
                                <div className="divide-y-[1.5px] divide-slate-300">
                                    {ofertasMostradas.map((oferta) => (
                                        <FilaMovilOferta
                                            key={oferta.id}
                                            oferta={oferta}
                                            estado={calcularEstado(oferta)}
                                            onEditar={handleEditar}
                                            onEliminar={handleEliminar}
                                            onDuplicar={handleDuplicar}
                                            onReenviar={handleReenviarCupon}
                                            onRevocar={handleRevocarCupon}
                                            onImagenClick={abrirImagenUnica}
                                            esDueno={esDueno}
                                            esCupones={esCupones}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sentinel para Infinite Scroll */}
                        {hayMas && (
                            <div ref={observerRef} className="w-full h-20 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                            </div>
                        )}
                    </div>
                )}

                {/* ================================================================= */}
                {/* MODALES                                                           */}
                {/* ================================================================= */}

                <ModalOferta
                    abierto={modalAbierto}
                    onCerrar={() => {
                        setModalAbierto(false);
                        setOfertaEditando(null);
                        setDatosPrelleno(null);
                    }}
                    oferta={ofertaEditando}
                    visibilidadInicial={visibilidadNueva}
                    datosIniciales={datosPrelleno}
                    onRecargar={() => invalidarOfertas()}
                    onDuplicar={(ofertaOriginal) => {
                        if (ofertaOriginal.visibilidad === 'privado') {
                            // Cupón: transformar modal de consulta en creación sin cerrar
                            const ofertaImg = ofertaOriginal as Oferta & { imagen?: string; imagenUrl?: string; imagenPrincipal?: string };
                            setDatosPrelleno({
                                titulo: ofertaOriginal.titulo,
                                descripcion: ofertaOriginal.descripcion || '',
                                tipo: ofertaOriginal.tipo,
                                valor: ofertaOriginal.valor ? String(ofertaOriginal.valor) : '',
                                compraMinima: ofertaOriginal.compraMinima ? String(ofertaOriginal.compraMinima) : '0',
                                motivoAsignacion: '',
                                limiteUsosPorUsuario: ofertaOriginal.limiteUsosPorUsuario ? String(ofertaOriginal.limiteUsosPorUsuario) : '',
                                _imagenOriginal: ofertaImg.imagen || ofertaImg.imagenUrl || ofertaImg.imagenPrincipal || '',
                            });
                            setVisibilidadNueva('privado');
                            setOfertaEditando(null);
                        } else {
                            handleDuplicar(ofertaOriginal);
                        }
                    }}
                    onGuardar={async (datos) => {
                        try {
                            if (ofertaEditando) {
                                await actualizarMutation.mutateAsync({ id: ofertaEditando.id, datos: datos as ActualizarOfertaInput });
                            } else {
                                await crearMutation.mutateAsync(datos as CrearOfertaInput);
                            }
                            setModalAbierto(false);
                            setOfertaEditando(null);
                            setDatosPrelleno(null);
                        } catch {
                            // Error ya notificado por la mutación
                        }
                    }}
                />

                {modalDuplicarAbierto && ofertaDuplicando && (
                    <ModalDuplicarOferta
                        oferta={ofertaDuplicando}
                        onDuplicar={async (datos) => {
                            try {
                                await duplicarMutation.mutateAsync({ id: ofertaDuplicando.id, datos });
                                setModalDuplicarAbierto(false);
                                setOfertaDuplicando(null);
                            } catch {
                                // Error ya notificado por la mutación
                            }
                        }}
                        onCerrar={() => {
                            setModalDuplicarAbierto(false);
                            setOfertaDuplicando(null);
                        }}
                    />
                )}

                <ModalImagenes
                    images={modalImagenes.images}
                    initialIndex={modalImagenes.initialIndex}
                    isOpen={modalImagenes.isOpen}
                    onClose={cerrarModalImagenes}
                />
            </div>
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaOfertas;
