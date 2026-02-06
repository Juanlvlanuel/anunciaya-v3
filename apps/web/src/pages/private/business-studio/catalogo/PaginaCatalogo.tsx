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
 * - Lista con filtros (búsqueda, tipo, categoría, disponibilidad)
 * - CRUD completo (Crear, Editar, Eliminar)
 * - Duplicar a otras sucursales (solo dueños)
 * - Actualizaciones optimistas
 * - Responsive (móvil, laptop, desktop)
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Search,
    Package,
    ShoppingBag,
    Wrench,
    X,
    ChevronRight,
    Layers,
    Tag,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useArticulos } from '../../../../hooks/useArticulos';
import { Boton } from '../../../../components/ui/Boton';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { ModalImagenes } from '../../../../components/ui';
import { notificar } from '../../../../utils/notificaciones';
import { ModalArticulo } from './ModalArticulo';
import { ModalDuplicar } from './ModalDuplicar';
import { CardArticulo } from './CardArticulo';
import { obtenerSucursalesNegocio } from '../../../../services/negociosService';
import type { Articulo, FiltrosArticulos, CrearArticuloInput } from '../../../../types/articulos';

// =============================================================================
// CONSTANTES
// =============================================================================

const ARTICULOS_POR_PAGINA = 9; // Cargar 6 artículos a la vez

// =============================================================================
// CSS — Animación del icono del header (estilo Puntos)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes catalogo-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .catalogo-icon-bounce {
    animation: catalogo-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// HOOK - DETECTAR MOBILE
// =============================================================================

/**
 * Hook para detectar si estamos en mobile (< 1024px)
 * Actualiza automáticamente si cambia el tamaño de ventana
 */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Función para verificar tamaño
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        // Verificar al montar
        checkMobile();

        // Escuchar cambios de tamaño
        window.addEventListener('resize', checkMobile);

        // Limpiar listener al desmontar
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
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
    const [totalSucursales, setTotalSucursales] = useState(0);
    const [paginaActual, setPaginaActual] = useState(0); // Bloque actual (0, 1, 2...) - Solo para laptop/desktop
    const [articulosCargados, setArticulosCargados] = useState(ARTICULOS_POR_PAGINA); // Para mobile infinite scroll
    const [previewAbierto, setPreviewAbierto] = useState(false); // Detectar preview
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number; }>({ isOpen: false, images: [], initialIndex: 0 });

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

    // Determinar si es dueño (puede duplicar a otras sucursales)
    const esDueno = !usuario?.sucursalAsignada;

    // ===========================================================================
    // HANDLERS PARA MODAL DE IMÁGENES
    // ===========================================================================

    const abrirImagenUnica = (url: string) => {
        setModalImagenes({
            isOpen: true,
            images: [url],
            initialIndex: 0,
        });
    };

    const cerrarModalImagenes = () => {
        setModalImagenes({
            isOpen: false,
            images: [],
            initialIndex: 0,
        });
    };

    // ===========================================================================
    // CARGAR CANTIDAD DE SUCURSALES
    // ===========================================================================

    useEffect(() => {
        if (usuario?.negocioId && esDueno) {
            obtenerSucursalesNegocio(usuario.negocioId)
                .then((res) => {
                    if (res.success && res.data) {
                        setTotalSucursales(res.data.length);
                    }
                })
                .catch(() => setTotalSucursales(0));
        }
    }, [usuario?.negocioId, esDueno]);

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
            // Búsqueda por nombre
            if (
                filtros.busqueda &&
                !art.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())
            ) {
                return false;
            }

            // Filtro por tipo
            if (filtros.tipo !== 'todos' && art.tipo !== filtros.tipo) {
                return false;
            }

            // Filtro por categoría
            if (filtros.categoria !== 'todas' && art.categoria !== filtros.categoria) {
                return false;
            }

            // Filtro por disponibilidad
            if (filtros.disponible !== 'todos') {
                const disponibleBool = filtros.disponible === true;
                if (art.disponible !== disponibleBool) {
                    return false;
                }
            }

            return true;
        });
    }, [articulos, filtros]);

    // ===========================================================================
    // SISTEMA HÍBRIDO: INFINITE SCROLL (MOBILE) + PAGINACIÓN (DESKTOP)
    // ===========================================================================

    // Artículos mostrados según dispositivo
    const articulosMostrados = useMemo(() => {
        if (isMobile) {
            // MOBILE: Mostrar progresivamente según articulosCargados
            return articulosFiltrados.slice(0, articulosCargados);
        } else {
            // DESKTOP/LAPTOP: Paginación por bloques
            const inicio = paginaActual * ARTICULOS_POR_PAGINA;
            const fin = inicio + ARTICULOS_POR_PAGINA;
            return articulosFiltrados.slice(inicio, fin);
        }
    }, [articulosFiltrados, paginaActual, articulosCargados, isMobile]);

    // Control para laptop/desktop (paginación)
    const totalPaginas = Math.ceil(articulosFiltrados.length / ARTICULOS_POR_PAGINA);
    const hayMas = isMobile 
        ? articulosCargados < articulosFiltrados.length  // Mobile: hay más artículos sin cargar
        : paginaActual < totalPaginas - 1;               // Desktop: hay más páginas
    const hayAnterior = !isMobile && paginaActual > 0;   // Solo en desktop

    const avanzar = () => {
        if (hayMas && !isMobile) setPaginaActual(prev => prev + 1);
    };

    const retroceder = () => {
        if (hayAnterior) setPaginaActual(prev => prev - 1);
    };

    // Resetear al cambiar filtros
    useEffect(() => {
        setPaginaActual(0);
        setArticulosCargados(ARTICULOS_POR_PAGINA);
    }, [filtros]);

    // Resetear articulosCargados cuando cambie a mobile/desktop
    useEffect(() => {
        setArticulosCargados(ARTICULOS_POR_PAGINA);
    }, [isMobile]);

    // Detectar si el preview está abierto
    useEffect(() => {
        const checkPreview = () => {
            // Método 1: Buscar por texto "Vista Previa" o "Cerrar Preview"
            const textoPrevia = Array.from(document.querySelectorAll('*')).some(el =>
                el.textContent?.includes('Vista Previa') ||
                el.textContent?.includes('Cerrar Preview')
            );

            // Método 2: Buscar clases relacionadas con preview
            const clasePreview = document.querySelector('[class*="Previa"]') ||
                document.querySelector('[class*="preview"]');

            // Método 3: Detectar si el contenedor principal está reducido
            const main = document.querySelector('main');
            const anchoReducido = main && main.offsetWidth < window.innerWidth * 0.75;

            const estaAbierto = !!(textoPrevia || clasePreview || anchoReducido);

            setPreviewAbierto(estaAbierto);
        };

        // Verificar inmediatamente
        checkPreview();

        // Observer para cambios en el DOM
        const observer = new MutationObserver(checkPreview);

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        // Verificación ultrarrápida para respuesta instantánea
        const interval = setInterval(checkPreview, 25); // 25ms = instantáneo

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);

    // ===========================================================================
    // INTERSECTION OBSERVER - INFINITE SCROLL (SOLO MOBILE)
    // ===========================================================================

    // Cargar más artículos automáticamente en mobile cuando lleguemos al final
    const cargarMas = useCallback(() => {
        if (isMobile && articulosCargados < articulosFiltrados.length) {
            setArticulosCargados(prev => 
                Math.min(prev + ARTICULOS_POR_PAGINA, articulosFiltrados.length)
            );
        }
    }, [isMobile, articulosCargados, articulosFiltrados.length]);

    // Observer que detecta cuando el "sentinel" es visible
    useEffect(() => {
        if (!isMobile || !observerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Si el sentinel es visible y hay más artículos, cargar
                if (entries[0].isIntersecting && hayMas) {
                    cargarMas();
                }
            },
            {
                root: null,           // Viewport como root
                rootMargin: '100px',  // Activar 100px antes de llegar al final
                threshold: 0.1        // 10% visible
            }
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
        // Si hay más de 1 sucursal, mostrar modal para seleccionar
        if (totalSucursales >= 1) {
            setArticuloDuplicando(articulo);
            setModalDuplicarAbierto(true);
            return;
        }

        // Si hay 1 sola sucursal, duplicar directo en la misma
        if (usuario?.sucursalActiva) {
            const exito = await duplicar(articulo.id, {
                sucursalesIds: [usuario.sucursalActiva],
            });
            if (exito) {
                notificar.exito('Artículo duplicado correctamente');
            }
        }
    };

    const limpiarFiltros = () => {
        setFiltros({
            busqueda: '',
            tipo: 'todos',
            categoria: 'todas',
            disponible: 'todos',
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
        <div className="p-3 lg:p-1 2xl:p-3">
            {/* Inyectar estilos de animación */}
            <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

            {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-1 2xl:space-y-3">

                {/* ===================================================================== */}
                {/* HEADER + KPIs EN UNA FILA (DESKTOP) */}
                {/* ===================================================================== */}

                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                    {/* Header con icono animado */}
                    <div className="flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
                        {/* Contenedor del icono con gradiente */}
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
                                boxShadow: '0 6px 20px rgba(8,145,178,0.4)',
                            }}
                        >
                            {/* Bolsa de compras animada */}
                            <div className="catalogo-icon-bounce">
                                <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Catálogo
                            </h1>
                            <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                                Productos y servicios
                            </p>
                        </div>
                    </div>

                    {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
                    <div className="overflow-x-auto lg:overflow-visible lg:flex-1">
                        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
                            {/* Total - Resetear filtros */}
                            <button
                                onClick={limpiarFiltros}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${!hayFiltrosActivos ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
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
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Total</div>
                                </div>
                            </button>

                            {/* Productos */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'producto' ? 'todos' : 'producto' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.tipo === 'producto' ? 'ring-3 ring-cyan-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.tipo === 'producto' 
                                        ? 'linear-gradient(135deg, #67e8f9, #22d3ee)' 
                                        : 'linear-gradient(135deg, #ecfeff, #fff)',
                                    border: filtros.tipo === 'producto' ? '3px solid #06b6d4' : '2px solid #67e8f9',
                                    boxShadow: filtros.tipo === 'producto' 
                                        ? '0 4px 12px rgba(6,182,212,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
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
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Productos</div>
                                </div>
                            </button>

                            {/* Servicios */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, tipo: prev.tipo === 'servicio' ? 'todos' : 'servicio' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.tipo === 'servicio' ? 'ring-3 ring-purple-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.tipo === 'servicio' 
                                        ? 'linear-gradient(135deg, #d8b4fe, #c084fc)' 
                                        : 'linear-gradient(135deg, #faf5ff, #fff)',
                                    border: filtros.tipo === 'servicio' ? '3px solid #9333ea' : '2px solid #d8b4fe',
                                    boxShadow: filtros.tipo === 'servicio' 
                                        ? '0 4px 12px rgba(147,51,234,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
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
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Servicios</div>
                                </div>
                            </button>

                            {/* Disponibles */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, disponible: prev.disponible === true ? 'todos' : true }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.disponible === true ? 'ring-3 ring-green-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.disponible === true 
                                        ? 'linear-gradient(135deg, #86efac, #4ade80)' 
                                        : 'linear-gradient(135deg, #f0fdf4, #fff)',
                                    border: filtros.disponible === true ? '3px solid #22c55e' : '2px solid #86efac',
                                    boxShadow: filtros.disponible === true 
                                        ? '0 4px 12px rgba(34,197,94,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
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
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Disponibles</div>
                                </div>
                            </button>

                            {/* Ocultos */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, disponible: prev.disponible === false ? 'todos' : false }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2.5 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.disponible === false ? 'ring-3 ring-red-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.disponible === false 
                                        ? 'linear-gradient(135deg, #fca5a5, #f87171)' 
                                        : 'linear-gradient(135deg, #fef2f2, #fff)',
                                    border: filtros.disponible === false ? '3px solid #ef4444' : '2px solid #fca5a5',
                                    boxShadow: filtros.disponible === false 
                                        ? '0 4px 12px rgba(239,68,68,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
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
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Ocultos</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* BARRA DE BÚSQUEDA + FILTROS DE CATEGORÍA */}
                {/* ===================================================================== */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border border-slate-200 p-3 lg:p-2 2xl:p-3 mt-4 lg:mt-7 2xl:mt-14">
                    <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3 ">
                        {/* Búsqueda */}
                        <div className="flex-1">
                            <Input
                                id="input-busqueda-catalogo"
                                name="input-busqueda-catalogo"
                                type="text"
                                placeholder="Buscar por nombre..."
                                icono={<Search className="w-5 h-5" />}
                                value={filtros.busqueda}
                                onChange={(e) =>
                                    setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
                                }
                            />
                        </div>

                        {/* Botón Agregar */}
                        <Boton
                            variante="primario"
                            iconoIzquierda={<Plus className="w-4 h-4" />}
                            onClick={handleCrear}
                            className="shrink-0 cursor-pointer"
                        >
                            <span className="hidden lg:inline">Nuevo Artículo</span>
                            <span className="lg:hidden">Nuevo</span>
                        </Boton>
                    </div>

                    {/* Filtros de categoría - Scroll horizontal */}
                    <div className="mt-2 pt-2 border-t border-slate-100 overflow-x-auto">
                        <div className="flex gap-1.5 pb-1">
                        {/* Todas las categorías */}
                        <button
                            onClick={() => setFiltros(prev => ({ ...prev, categoria: 'todas' }))}
                            className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-sm lg:text-sm font-medium transition-all cursor-pointer ${filtros.categoria === 'todas'
                                    ? 'bg-blue-500 text-white lg:scale-105 shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Tag className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                            Todas
                        </button>

                        {/* Categorías dinámicas */}
                        {categoriasUnicas.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFiltros(prev => ({
                                    ...prev,
                                    categoria: prev.categoria === cat ? 'todas' : cat
                                }))}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-sm lg:text-sm font-medium transition-all cursor-pointer ${filtros.categoria === cat
                                        ? 'bg-blue-500 text-white lg:scale-105 shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}

                        {/* Limpiar filtros si hay activos */}
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-sm lg:text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                                Limpiar
                            </button>
                        )}
                        </div>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* LISTA DE ARTÍCULOS */}
                {/* ===================================================================== */}

                {articulosFiltrados.length === 0 ? (
                    <div className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-lg border border-slate-200 p-12 lg:p-8 2xl:p-12 text-center">
                        <Package className="w-16 h-16 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 text-lg lg:text-base 2xl:text-lg">
                            {hayFiltrosActivos
                                ? 'No se encontraron artículos con estos filtros'
                                : 'Aún no tienes artículos en tu catálogo'}
                        </p>
                        {!hayFiltrosActivos && (
                            <Boton variante="primario" iconoIzquierda={<Plus className="w-5 h-5" />} onClick={handleCrear} className="mt-4">
                                Agregar Primer Artículo
                            </Boton>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Grid Responsive - Móvil y Desktop */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 2xl:gap-7 mt-4 lg:mt-3 2xl:mt-4">
                            {articulosMostrados.map((articulo) => (
                                <CardArticulo
                                    key={articulo.id}
                                    articulo={articulo}
                                    onEditar={handleEditar}
                                    onEliminar={handleEliminar}
                                    onDuplicar={esDueno ? handleDuplicar : undefined}
                                    onToggle={handleToggle}
                                    onImagenClick={abrirImagenUnica}
                                />
                            ))}
                        </div>

                        {/* Sentinel para Infinite Scroll (solo mobile) */}
                        {isMobile && hayMas && (
                            <div 
                                ref={observerRef} 
                                className="w-full h-20 flex items-center justify-center"
                            >
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        )}

                        {/* FAB Superior - Volver (SOLO LAPTOP/DESKTOP) */}
                        {!isMobile && hayAnterior && createPortal(
                            <div className={`fixed right-16 2xl:right-1/2 bottom-24 z-50 transition-transform duration-75 group 
                                ${previewAbierto ? 'lg:right-[375px] 2xl:translate-x-[510px]' : 'lg:right-[47px] 2xl:translate-x-[890px]'
                                }`}>
                                <button
                                    onClick={retroceder}
                                    className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center cursor-pointer"
                                >
                                    <ChevronRight className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 -rotate-90 group-hover:-translate-y-0.5 transition-transform" />
                                </button>

                                {/* Tooltip a la izquierda */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                                    <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap relative">
                                        Anteriores
                                        {/* Puntita derecha */}
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-900"></div>
                                    </div>
                                </div>
                            </div>
                        ,
                            document.body
                        )}

                        {/* FAB Inferior - Ver más (SOLO LAPTOP/DESKTOP) */}
                        {!isMobile && hayMas && createPortal(
                            <div className={`fixed right-16 2xl:right-1/2 bottom-6 z-50 transition-transform duration-75 group 
                                ${previewAbierto ? 'lg:right-[375px] 2xl:translate-x-[510px]' : 'lg:right-[47px] 2xl:translate-x-[890px]'
                                }`}>
                                <button
                                    onClick={avanzar}
                                    className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center cursor-pointer"
                                >
                                    <ChevronRight className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rotate-90 group-hover:translate-y-0.5 transition-transform" />
                                </button>

                                {/* Tooltip a la izquierda */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                                    <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap relative">
                                        Siguientes
                                        {/* Puntita derecha */}
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-900"></div>
                                    </div>
                                </div>
                            </div>
                        ,
                            document.body
                        )}
                    </>
                )}

                {/* ===================================================================== */}
                {/* MODALES */}
                {/* ===================================================================== */}

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


                {/* ✅ Modal Universal de Imágenes */}
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