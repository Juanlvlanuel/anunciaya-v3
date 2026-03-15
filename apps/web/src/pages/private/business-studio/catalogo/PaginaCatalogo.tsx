/**
 * ============================================================================
 * PÁGINA: Catálogo (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/PaginaCatalogo.tsx
 *
 * PROPÓSITO:
 * Página principal del módulo de catálogo en Business Studio
 * Lista de productos y servicios con CRUD completo
 *
 * FEATURES:
 * - Tabla desktop con header oscuro + cards horizontales móvil
 * - Filtros (búsqueda, tipo, categoría)
 * - Ordenación por precio, vistas, ventas
 * - CRUD completo (Crear, Editar, Eliminar)
 * - Duplicar a otras sucursales (solo dueños)
 * - Actualizaciones optimistas
 * - Responsive (móvil, laptop, desktop)
 *
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 * REDISEÑO: Estandarización visual con Clientes/Transacciones
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Search,
    Package,
    ShoppingBag,
    Wrench,
    Layers,
    CheckCircle,
    XCircle,
    Star,
    Eye,
    EyeOff,
    Trash2,
    Tag,
    Copy,
    ShoppingCart,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Inbox,
    X,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useArticulos } from '../../../../hooks/useArticulos';
import { Boton } from '../../../../components/ui/Boton';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { ModalImagenes } from '../../../../components/ui';
import Tooltip from '../../../../components/ui/Tooltip';
import { ModalArticulo } from './ModalArticulo';
import { ModalDuplicar } from './ModalDuplicar';
import type { Articulo, FiltrosArticulos, CrearArticuloInput } from '../../../../types/articulos';

// =============================================================================
// CONSTANTES
// =============================================================================

const ARTICULOS_POR_PAGINA = 12;

// =============================================================================
// TIPOS — Ordenación
// =============================================================================

type ColumnaOrden = 'precio' | 'vistas' | 'ventas';
type DireccionOrden = 'asc' | 'desc';
interface OrdenState {
    columna: ColumnaOrden;
    direccion: DireccionOrden;
}

// =============================================================================
// CSS — Animación del icono del header + scroll oculto
// =============================================================================

const ESTILOS_CSS = `
  @keyframes catalogo-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .catalogo-icon-bounce {
    animation: catalogo-icon-bounce 2s ease-in-out infinite;
  }
  .cat-carousel::-webkit-scrollbar { display: none; }
  .cat-carousel { -ms-overflow-style: none; scrollbar-width: none; }
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
                <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" />
            )}
            {activa && ordenActual?.direccion === 'asc' && (
                <ChevronUp className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" />
            )}
            {!activa && (
                <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white/80 group-hover:text-amber-300" />
            )}
        </button>
    );
}

// =============================================================================
// COMPONENTE: FilaMovil (card horizontal para móvil)
// =============================================================================

function FilaMovil({
    articulo,
    onEditar,
    onEliminar,
    onDuplicar,
    onImagenClick,
    esDueno,
}: {
    articulo: Articulo;
    onEditar: (articulo: Articulo) => void;
    onEliminar: (id: string) => void;
    onDuplicar: (articulo: Articulo) => void;
    onImagenClick?: (url: string) => void;
    esDueno: boolean;
}) {
    const esTipoProducto = articulo.tipo === 'producto';
    const precioFormateado = articulo.precioDesde
        ? `Desde $${Number(articulo.precioBase).toFixed(0)}`
        : `$${Number(articulo.precioBase).toFixed(0)}`;

    return (
        <button
            onClick={() => onEditar(articulo)}
            className={`w-full flex items-stretch gap-3 p-3 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer text-left ${!articulo.disponible ? 'opacity-60' : ''}`}
        >
            {/* Imagen */}
            <div
                className="w-16 self-stretch rounded-lg shrink-0 overflow-hidden"
                onClick={(e) => {
                    if (articulo.imagenPrincipal && onImagenClick) {
                        e.stopPropagation();
                        onImagenClick(articulo.imagenPrincipal);
                    }
                }}
            >
                {articulo.imagenPrincipal ? (
                    <img src={articulo.imagenPrincipal} alt={articulo.nombre} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        {esTipoProducto
                            ? <Package className="w-5 h-5 text-slate-600" />
                            : <Wrench className="w-5 h-5 text-slate-600" />
                        }
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                {/* Nombre + Precio */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base font-bold text-slate-800 truncate">{articulo.nombre}</span>
                        {articulo.destacado && <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                    <span className="text-lg font-extrabold text-emerald-600 shrink-0">{precioFormateado}</span>
                </div>

                {/* Badge tipo + estado */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${esTipoProducto ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {esTipoProducto ? <Package className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                        {esTipoProducto ? 'Producto' : 'Servicio'}
                    </span>
                    {!articulo.disponible && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-slate-200 text-slate-600">
                            <EyeOff className="w-3.5 h-3.5" />
                            Oculto
                        </span>
                    )}
                </div>

                {/* Stats + Acciones */}
                <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
                        <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {articulo.totalVistas || 0} vistas
                        </span>
                        <span className="flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4" />
                            {articulo.totalVentas || 0} ventas
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {esDueno && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDuplicar(articulo); }}
                                className="cursor-pointer text-emerald-600"
                            >
                                <Copy className="w-6 h-6" />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEliminar(articulo.id); }}
                            className="cursor-pointer text-red-600"
                        >
                            <Trash2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </button>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCatalogo() {
    const { usuario } = useAuthStore();
    const { articulos, loading, crear, actualizar, eliminar, duplicar } = useArticulos();

    // Estados UI
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
    const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
    const [articuloDuplicando, setArticuloDuplicando] = useState<Articulo | null>(null);
    const [articulosCargados, setArticulosCargados] = useState(ARTICULOS_POR_PAGINA);
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number }>({ isOpen: false, images: [], initialIndex: 0 });

    // Ordenación
    const [orden, setOrden] = useState<OrdenState | null>(null);

    // Dropdown categoría
    const [dropdownCatAbierto, setDropdownCatAbierto] = useState(false);
    const dropdownCatRef = useRef<HTMLDivElement>(null);

    // Detectar si estamos en mobile
    const isMobile = useIsMobile();

    // Ref para Intersection Observer (sentinel del infinite scroll)
    const observerRef = useRef<HTMLDivElement>(null);

    // Filtros
    const [filtros, setFiltros] = useState<FiltrosArticulos>({
        busqueda: '',
        tipo: 'todos',
        categoria: 'todas',
        disponible: 'todos',
    });

    // Limpiar búsqueda al desmontar (navegar fuera)
    useEffect(() => {
        return () => setFiltros((prev) => ({ ...prev, busqueda: '' }));
    }, []);

    // Determinar si es dueño (puede duplicar a otras sucursales)
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
    // CATEGORÍAS ÚNICAS
    // ===========================================================================

    const categoriasUnicas = useMemo(() => {
        const categorias = new Set<string>();
        articulos.forEach((art) => {
            if (art.categoria && art.categoria !== 'General') {
                categorias.add(art.categoria);
            }
        });
        return Array.from(categorias).sort();
    }, [articulos]);

    // ===========================================================================
    // ESTADÍSTICAS RÁPIDAS
    // ===========================================================================

    const estadisticas = useMemo(() => {
        const productos = articulos.filter((a) => a.tipo === 'producto').length;
        const servicios = articulos.filter((a) => a.tipo === 'servicio').length;
        const disponibles = articulos.filter((a) => a.disponible === true).length;
        const noDisponibles = articulos.filter((a) => a.disponible === false).length;
        return { productos, servicios, disponibles, noDisponibles, total: articulos.length };
    }, [articulos]);

    // ===========================================================================
    // FILTRAR ARTÍCULOS
    // ===========================================================================

    const articulosFiltrados = useMemo(() => {
        return articulos.filter((art) => {
            if (filtros.busqueda && !art.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
            if (filtros.tipo !== 'todos' && art.tipo !== filtros.tipo) return false;
            if (filtros.categoria !== 'todas' && art.categoria !== filtros.categoria) return false;
            if (filtros.disponible !== 'todos') {
                if (art.disponible !== (filtros.disponible === true)) return false;
            }
            return true;
        });
    }, [articulos, filtros]);

    // ===========================================================================
    // ORDENAR ARTÍCULOS
    // ===========================================================================

    const articulosOrdenados = useMemo(() => {
        if (!orden) return articulosFiltrados;

        return [...articulosFiltrados].sort((a, b) => {
            let valorA: number, valorB: number;
            switch (orden.columna) {
                case 'precio':
                    valorA = Number(a.precioBase) || 0;
                    valorB = Number(b.precioBase) || 0;
                    break;
                case 'vistas':
                    valorA = a.totalVistas || 0;
                    valorB = b.totalVistas || 0;
                    break;
                case 'ventas':
                    valorA = a.totalVentas || 0;
                    valorB = b.totalVentas || 0;
                    break;
                default:
                    return 0;
            }
            return orden.direccion === 'asc' ? valorA - valorB : valorB - valorA;
        });
    }, [articulosFiltrados, orden]);

    // ===========================================================================
    // ARTÍCULOS MOSTRADOS (Mobile: infinite scroll)
    // ===========================================================================

    const articulosMostrados = useMemo(() => {
        if (isMobile) return articulosOrdenados.slice(0, articulosCargados);
        return articulosOrdenados;
    }, [articulosOrdenados, articulosCargados, isMobile]);

    const hayMas = isMobile && articulosCargados < articulosOrdenados.length;

    // Cerrar dropdown categoría al hacer click fuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (dropdownCatRef.current && !dropdownCatRef.current.contains(e.target as Node)) {
                setDropdownCatAbierto(false);
            }
        };
        if (dropdownCatAbierto) {
            document.addEventListener('mousedown', handleClickFuera);
            return () => document.removeEventListener('mousedown', handleClickFuera);
        }
    }, [dropdownCatAbierto]);

    // Resetear al cambiar filtros
    useEffect(() => {
        setArticulosCargados(ARTICULOS_POR_PAGINA);
    }, [filtros]);

    useEffect(() => {
        setArticulosCargados(ARTICULOS_POR_PAGINA);
    }, [isMobile]);

    // ===========================================================================
    // INTERSECTION OBSERVER - INFINITE SCROLL (SOLO MOBILE)
    // ===========================================================================

    const cargarMas = useCallback(() => {
        if (isMobile && articulosCargados < articulosOrdenados.length) {
            setArticulosCargados(prev => Math.min(prev + ARTICULOS_POR_PAGINA, articulosOrdenados.length));
        }
    }, [isMobile, articulosCargados, articulosOrdenados.length]);

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
    // HANDLERS
    // ===========================================================================

    const handleCrear = () => {
        setArticuloEditando(null);
        setModalAbierto(true);
    };

    const handleEditar = (articulo: Articulo) => {
        setArticuloEditando(articulo);
        setModalAbierto(true);
    };

    const handleEliminar = async (id: string) => {
        await eliminar(id);
    };

    const handleToggle = async (id: string, campo: 'disponible' | 'destacado', valor: boolean) => {
        await actualizar(id, { [campo]: valor });
    };

    const handleDuplicar = async (articulo: Articulo) => {
        if (esGerente && usuario?.sucursalAsignada) {
            await duplicar(articulo.id, { sucursalesIds: [usuario.sucursalAsignada] });
            return;
        }
        if (esDueno) {
            setArticuloDuplicando(articulo);
            setModalDuplicarAbierto(true);
        }
    };

    const limpiarFiltros = () => {
        setFiltros({ busqueda: '', tipo: 'todos', categoria: 'todas', disponible: 'todos' });
    };

    const alternarOrden = (columna: ColumnaOrden) => {
        setOrden(prev => {
            if (prev?.columna === columna) {
                return prev.direccion === 'desc'
                    ? { columna, direccion: 'asc' }
                    : null;
            }
            return { columna, direccion: 'desc' };
        });
    };

    const hayFiltrosActivos =
        filtros.busqueda ||
        filtros.tipo !== 'todos' ||
        filtros.categoria !== 'todas' ||
        filtros.disponible !== 'todos';

    // ===========================================================================
    // RENDER: LOADING
    // ===========================================================================

    if (loading) {
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
                    {/* Header con icono animado + Switch móvil */}
                    <div className="flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
                                boxShadow: '0 6px 20px rgba(8,145,178,0.4)',
                            }}
                        >
                            <div className="catalogo-icon-bounce">
                                <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Catálogo
                            </h1>
                            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium whitespace-nowrap">
                                Productos y servicios
                            </p>
                        </div>

                        {/* Switch tipo móvil — estilo Transacciones */}
                        <div className="lg:hidden shrink-0 ml-auto flex justify-end">
                            <div className="flex items-center bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300">
                                <Tooltip text="Todos" position="bottom" autoHide={1500}>
                                    <button
                                        onClick={() => setFiltros(prev => ({ ...prev, tipo: 'todos' }))}
                                        className={`h-10 w-10 flex items-center justify-center rounded-md transition-all cursor-pointer ${filtros.tipo === 'todos'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                                        }`}
                                        style={filtros.tipo === 'todos' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                    >
                                        <Layers className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Productos" position="bottom" autoHide={1500}>
                                    <button
                                        onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'producto' ? 'todos' : 'producto' }))}
                                        className={`h-10 w-10 flex items-center justify-center rounded-md transition-all cursor-pointer ${filtros.tipo === 'producto'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                                        }`}
                                        style={filtros.tipo === 'producto' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                    >
                                        <Package className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Servicios" position="bottom" autoHide={1500}>
                                    <button
                                        onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'servicio' ? 'todos' : 'servicio' }))}
                                        className={`h-10 w-10 flex items-center justify-center rounded-md transition-all cursor-pointer ${filtros.tipo === 'servicio'
                                            ? 'text-white shadow-md'
                                            : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                                        }`}
                                        style={filtros.tipo === 'servicio' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                    >
                                        <Wrench className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
                    <div className="mt-5 lg:mt-0 overflow-x-auto lg:overflow-visible lg:flex-1 cat-carousel">
                        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
                            {/* Total */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #eff6ff, #fff)',
                                    border: '2px solid #93c5fd',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', boxShadow: '0 3px 8px rgba(37,99,235,0.25)' }}
                                >
                                    <Layers className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">{estadisticas.total}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Total</div>
                                </div>
                            </div>

                            {/* Productos */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #ecfeff, #fff)',
                                    border: '2px solid #67e8f9',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #a5f3fc, #67e8f9)', boxShadow: '0 3px 8px rgba(6,182,212,0.25)' }}
                                >
                                    <Package className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-cyan-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-cyan-700">{estadisticas.productos}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Productos</div>
                                </div>
                            </div>

                            {/* Servicios */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #faf5ff, #fff)',
                                    border: '2px solid #d8b4fe',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #e9d5ff, #d8b4fe)', boxShadow: '0 3px 8px rgba(147,51,234,0.25)' }}
                                >
                                    <Wrench className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-purple-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-purple-700">{estadisticas.servicios}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Servicios</div>
                                </div>
                            </div>

                            {/* Disponibles */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                                    border: '2px solid #86efac',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                                >
                                    <CheckCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">{estadisticas.disponibles}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Disponibles</div>
                                </div>
                            </div>

                            {/* Ocultos */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #fef2f2, #fff)',
                                    border: '2px solid #fca5a5',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                                >
                                    <XCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">{estadisticas.noDisponibles}</div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Ocultos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================================================================= */}
                {/* FILTROS: Tipo (desktop) + Categoría + Búsqueda + Nuevo            */}
                {/* ================================================================= */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                        {/* Chips de tipo — solo desktop */}
                        <div className="hidden lg:flex flex-row gap-1.5 shrink-0">
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, tipo: 'todos' }))}
                                className={`flex items-center justify-center px-3 2xl:px-4 h-10 2xl:h-11 rounded-lg text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.tipo === 'todos'
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'producto' ? 'todos' : 'producto' }))}
                                className={`flex items-center justify-center gap-1 px-3 2xl:px-4 h-10 2xl:h-11 rounded-lg text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.tipo === 'producto'
                                    ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <Package className="w-3.5 h-3.5" />
                                Productos
                            </button>
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'servicio' ? 'todos' : 'servicio' }))}
                                className={`flex items-center justify-center gap-1 px-3 2xl:px-4 h-10 2xl:h-11 rounded-lg text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.tipo === 'servicio'
                                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <Wrench className="w-3.5 h-3.5" />
                                Servicios
                            </button>
                        </div>

                        {/* Móvil línea 1: Categoría + Nuevo | Desktop: Categoría inline */}
                        <div className="flex items-center gap-2 lg:contents">
                            {/* Dropdown de categoría */}
                            {categoriasUnicas.length > 0 && (
                            <>
                                <div className="hidden lg:block w-px h-6 bg-slate-300 shrink-0" />
                                <div ref={dropdownCatRef} className="relative flex-1 min-w-0 lg:flex-none lg:shrink-0">
                                    <button
                                        onClick={() => setDropdownCatAbierto(prev => !prev)}
                                        className={`flex items-center gap-1.5 w-full lg:w-48 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 transition-all cursor-pointer ${filtros.categoria !== 'todas'
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                                        }`}
                                    >
                                        <Tag className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        <span className="hidden lg:inline">{filtros.categoria === 'todas' ? 'Categoría' : filtros.categoria}</span>
                                        <span className="lg:hidden">{filtros.categoria === 'todas' ? 'Categoría' : filtros.categoria}</span>
                                        <ChevronDown className={`ml-auto w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 transition-transform ${dropdownCatAbierto ? 'rotate-180' : ''}`} />
                                    </button>

                                    {dropdownCatAbierto && (
                                        <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-1.5 w-44 lg:w-48 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                                            <button
                                                onClick={() => { setFiltros(prev => ({ ...prev, categoria: 'todas' })); setDropdownCatAbierto(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${filtros.categoria === 'todas' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${filtros.categoria === 'todas' ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                    {filtros.categoria === 'todas' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                                </div>
                                                Todas
                                            </button>
                                            {categoriasUnicas.map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => { setFiltros(prev => ({ ...prev, categoria: cat })); setDropdownCatAbierto(false); }}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${filtros.categoria === cat ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${filtros.categoria === cat ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                        {filtros.categoria === cat && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                                    </div>
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}


                            {/* Nuevo Artículo — móvil */}
                            <button
                                onClick={handleCrear}
                                className="lg:hidden shrink-0 flex items-center gap-1.5 h-11 px-3 rounded-lg text-base font-bold text-slate-600 border-2 border-slate-300 cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Artículo
                            </button>
                        </div>

                        {/* Móvil línea 2: Buscador | Desktop: Buscador + Nuevo */}
                        <div className="flex items-center gap-2 lg:flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                                <Input
                                    id="input-busqueda-catalogo"
                                    name="input-busqueda-catalogo"
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    icono={<Search className="w-4 h-4 text-slate-600" />}
                                    value={filtros.busqueda}
                                    onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
                                    className="h-11 lg:h-10 2xl:h-11 text-base lg:text-sm 2xl:text-base"
                                    elementoDerecha={filtros.busqueda ? (
                                        <button
                                            type="button"
                                            onClick={() => setFiltros((prev) => ({ ...prev, busqueda: '' }))}
                                            className="text-slate-600 hover:text-slate-800 cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    ) : undefined}
                                />
                            </div>
                            {/* Nuevo Artículo — desktop */}
                            <button
                                onClick={handleCrear}
                                className="hidden lg:flex shrink-0 items-center gap-1.5 h-10 2xl:h-11 px-4 2xl:px-5 rounded-lg text-sm 2xl:text-base font-bold text-slate-600 border-2 border-slate-300 cursor-pointer"
                                style={{
                                    background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                }}
                            >
                                <Plus className="w-4 h-4 2xl:w-4 2xl:h-4" />
                                Nuevo Artículo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between px-1 mt-3 lg:mt-2 2xl:mt-3 mb-1">
                    <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                        {hayFiltrosActivos
                            ? `${articulosOrdenados.length} de ${estadisticas.total} ${filtros.tipo === 'producto' ? 'productos' : filtros.tipo === 'servicio' ? 'servicios' : 'artículos'}`
                            : `${articulosOrdenados.length} ${filtros.tipo === 'producto' ? 'productos' : filtros.tipo === 'servicio' ? 'servicios' : 'artículos'}`
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
                            className="grid grid-cols-[minmax(0,1fr)_90px_100px_80px_80px_100px_70px_100px] 2xl:grid-cols-[minmax(0,1fr)_110px_120px_95px_95px_120px_85px_130px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-[11px] lg:text-[11px] 2xl:text-sm font-semibold text-white/80 uppercase tracking-wider"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                        >
                            <span>Artículo</span>
                            <span className="flex justify-center pr-5">Tipo</span>
                            <span className="flex justify-center pr-5">
                                <HeaderOrdenable etiqueta="PRECIO" columna="precio" ordenActual={orden} onOrdenar={alternarOrden} />
                            </span>
                            <span className="flex justify-center pr-5">
                                <HeaderOrdenable etiqueta="VISTAS" columna="vistas" ordenActual={orden} onOrdenar={alternarOrden} />
                            </span>
                            <span className="flex justify-center pr-5">
                                <HeaderOrdenable etiqueta="VENTAS" columna="ventas" ordenActual={orden} onOrdenar={alternarOrden} />
                            </span>
                            <span className="flex justify-center pr-5">Estado</span>
                            <span className="flex justify-center pr-5">Destacar</span>
                            <span className="flex justify-center pl-3">Acciones</span>
                        </div>

                        {/* Body scrolleable */}
                        <div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-390px)] overflow-y-auto bg-white">
                            {articulosOrdenados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                    <Inbox className="w-10 h-10 mb-2" />
                                    <p className="text-sm font-medium">
                                        {hayFiltrosActivos
                                            ? `No se encontraron ${filtros.tipo === 'producto' ? 'productos' : filtros.tipo === 'servicio' ? 'servicios' : 'artículos'}${filtros.categoria !== 'todas' ? ` en "${filtros.categoria}"` : ''}${filtros.busqueda ? ` con "${filtros.busqueda}"` : ''}`
                                            : 'Aún no tienes artículos en tu catálogo'
                                        }
                                    </p>
                                    {!hayFiltrosActivos && (
                                        <Boton variante="primario" iconoIzquierda={<Plus className="w-4 h-4" />} onClick={handleCrear} className="mt-3">
                                            Agregar Primer Artículo
                                        </Boton>
                                    )}
                                </div>
                            ) : (
                                articulosOrdenados.map((art, i) => {
                                    const esTipoProducto = art.tipo === 'producto';
                                    const precioFormateado = art.precioDesde
                                        ? `Desde $${Number(art.precioBase).toFixed(0)}`
                                        : `$${Number(art.precioBase).toFixed(0)}`;

                                    return (
                                        <div
                                            key={art.id}
                                            onClick={() => handleEditar(art)}
                                            className={`grid grid-cols-[minmax(0,1fr)_90px_100px_80px_80px_100px_70px_100px] 2xl:grid-cols-[minmax(0,1fr)_110px_120px_95px_95px_120px_85px_130px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-sm lg:text-xs 2xl:text-sm border-b border-slate-300 hover:bg-slate-200 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'} ${!art.disponible ? 'opacity-60' : ''}`}
                                        >
                                            {/* Artículo */}
                                            <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                                                <div
                                                    className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-lg shrink-0 overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                                                    onClick={(e) => { if (art.imagenPrincipal) { e.stopPropagation(); abrirImagenUnica(art.imagenPrincipal); } }}
                                                >
                                                    {art.imagenPrincipal ? (
                                                        <img src={art.imagenPrincipal} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                            {esTipoProducto
                                                                ? <Package className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4.5 2xl:h-4.5 text-slate-600" />
                                                                : <Wrench className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4.5 2xl:h-4.5 text-slate-600" />
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-800 truncate 2xl:text-[15px]">{art.nombre}</p>
                                                    {art.categoria && (
                                                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">{art.categoria}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tipo */}
                                            <div className="flex items-center justify-center">
                                                <span className={`inline-flex items-center gap-1 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${esTipoProducto ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {esTipoProducto ? <Package className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" /> : <Wrench className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />}
                                                    {esTipoProducto ? 'Prod' : 'Serv'}
                                                </span>
                                            </div>

                                            {/* Precio */}
                                            <div className="flex items-center justify-center">
                                                <span className="font-bold text-emerald-600 2xl:text-[15px]">{precioFormateado}</span>
                                            </div>

                                            {/* Vistas */}
                                            <div className="flex items-center justify-center text-slate-600 font-bold 2xl:text-[15px]">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                    {art.totalVistas || 0}
                                                </span>
                                            </div>

                                            {/* Ventas */}
                                            <div className="flex items-center justify-center text-slate-600 font-bold 2xl:text-[15px]">
                                                <span className="flex items-center gap-1">
                                                    <ShoppingCart className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                    {art.totalVentas || 0}
                                                </span>
                                            </div>

                                            {/* Estado */}
                                            <div className="flex items-center justify-center w-full">
                                                {art.disponible ? (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-green-100 text-green-700">
                                                        <CheckCircle className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                                                        <span className="hidden 2xl:inline">Visible</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-slate-200 text-slate-600">
                                                        <EyeOff className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                                                        <span className="hidden 2xl:inline">Oculto</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Destacar */}
                                            <div className="grid place-items-center">
                                                <Tooltip text={art.destacado ? 'Quitar destacado' : 'Destacar'}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggle(art.id, 'destacado', !art.destacado); }}
                                                        className="p-1.5 rounded-lg cursor-pointer hover:bg-amber-100"
                                                    >
                                                        <Star className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${art.destacado ? 'text-amber-500 fill-amber-500' : 'text-slate-600 hover:text-amber-500'}`} />
                                                    </button>
                                                </Tooltip>
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center justify-end gap-1 2xl:gap-1.5">
                                                <Tooltip text={art.disponible ? 'Ocultar' : 'Mostrar'}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggle(art.id, 'disponible', !art.disponible); }}
                                                        className="p-1.5 rounded-lg cursor-pointer hover:bg-green-100"
                                                    >
                                                        {art.disponible
                                                            ? <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-green-600" />
                                                            : <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 hover:text-green-600" />
                                                        }
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Eliminar">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEliminar(art.id); }}
                                                        className="p-1.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                    </button>
                                                </Tooltip>
                                                {esDueno && (
                                                    <Tooltip text="Duplicar">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicar(art); }}
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
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { col: 'precio' as ColumnaOrden, etiqueta: 'Precio' },
                                { col: 'vistas' as ColumnaOrden, etiqueta: 'Vistas' },
                                { col: 'ventas' as ColumnaOrden, etiqueta: 'Ventas' },
                            ]).map(({ col, etiqueta }) => {
                                const activa = orden?.columna === col;
                                return (
                                    <button
                                        key={col}
                                        onClick={() => alternarOrden(col)}
                                        className={`flex items-center justify-center gap-1.5 h-11 rounded-lg text-base font-semibold border-2 transition-all cursor-pointer ${activa
                                            ? 'text-white border-slate-700'
                                            : 'bg-white text-slate-600 border-slate-300'
                                        }`}
                                        style={activa ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                    >
                                        {etiqueta}
                                        {activa && orden?.direccion === 'desc' && <ChevronDown className="w-5 h-5 text-amber-400" />}
                                        {activa && orden?.direccion === 'asc' && <ChevronUp className="w-5 h-5 text-amber-400" />}
                                        {!activa && <ArrowUpDown className="w-4 h-4 text-slate-600" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cards */}
                        {articulosMostrados.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md border-2 border-slate-300 p-8 text-center">
                                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-base font-bold text-slate-800 mb-1">
                                    {hayFiltrosActivos ? 'Sin resultados' : 'Sin artículos'}
                                </p>
                                <p className="text-sm text-slate-600 font-medium">
                                    {hayFiltrosActivos
                                        ? `No se encontraron ${filtros.tipo === 'producto' ? 'productos' : filtros.tipo === 'servicio' ? 'servicios' : 'artículos'}${filtros.categoria !== 'todas' ? ` en "${filtros.categoria}"` : ''}${filtros.busqueda ? ` con "${filtros.busqueda}"` : ''}`
                                        : 'Aún no tienes artículos en tu catálogo'
                                    }
                                </p>
                                {!hayFiltrosActivos && (
                                    <Boton variante="primario" iconoIzquierda={<Plus className="w-5 h-5" />} onClick={handleCrear} className="mt-4">
                                        Agregar Primer Artículo
                                    </Boton>
                                )}
                            </div>
                        ) : (
                            articulosMostrados.map((articulo) => (
                                <FilaMovil
                                    key={articulo.id}
                                    articulo={articulo}
                                    onEditar={handleEditar}
                                    onEliminar={handleEliminar}
                                    onDuplicar={handleDuplicar}
                                    onImagenClick={abrirImagenUnica}
                                    esDueno={esDueno}
                                />
                            ))
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

                {modalAbierto && (
                    <ModalArticulo
                        articulo={articuloEditando}
                        categoriasExistentes={categoriasUnicas}
                        onGuardar={async (datos) => {
                            const exito = articuloEditando
                                ? await actualizar(articuloEditando.id, datos)
                                : await crear(datos as CrearArticuloInput);
                            if (exito) {
                                setModalAbierto(false);
                                setArticuloEditando(null);
                            }
                        }}
                        onCerrar={() => {
                            setModalAbierto(false);
                            setArticuloEditando(null);
                        }}
                    />
                )}

                {modalDuplicarAbierto && articuloDuplicando && (
                    <ModalDuplicar
                        articulo={articuloDuplicando}
                        onDuplicar={async (datos) => {
                            const exito = await duplicar(articuloDuplicando.id, datos);
                            if (exito) {
                                setModalDuplicarAbierto(false);
                                setArticuloDuplicando(null);
                            }
                        }}
                        onCerrar={() => {
                            setModalDuplicarAbierto(false);
                            setArticuloDuplicando(null);
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

export default PaginaCatalogo;
