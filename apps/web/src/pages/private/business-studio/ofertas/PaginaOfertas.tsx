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
 * - Grid 3x2 (6 ofertas por página) con paginación
 * - Filtros (búsqueda, tipo, estado)
 * - CRUD completo (Crear, Editar, Eliminar)
 * - Duplicar ofertas (todos los usuarios)
 *   - Gerentes: Duplican en su sucursal (sin modal)
 *   - Dueños con 1 sucursal: Duplican en su sucursal (sin modal)
 *   - Dueños con 2+ sucursales: Modal para elegir sucursales destino
 * - Actualizaciones optimistas
 * - Responsive (móvil, laptop, desktop)
 * - Separación lateral (como Catálogo)
 * 
 * ACTUALIZADO: Enero 2026 - Sistema de Duplicación Universal
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Search,
    Tag,
    X,
    TrendingUp,
    Calendar,
    Clock,
    ChevronRight,
    Percent,
    DollarSign,
    Gift,
    Truck,
    Sparkles,
    PauseCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useUiStore } from '../../../../stores/useUiStore';
import { useOfertas } from '../../../../hooks/useOfertas';
import { useZonaHoraria } from '../../../../hooks/useZonaHoraria';
import { Boton } from '../../../../components/ui/Boton';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { CardOferta } from './CardOferta';
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
}

// =============================================================================
// CONFIGURACIÓN PAGINACIÓN
// =============================================================================

const OFERTAS_POR_PAGINA = 9; // Grid 3x2

// =============================================================================
// CSS — Animación del icono del header (estilo Puntos)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes ofertas-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .ofertas-icon-bounce {
    animation: ofertas-icon-bounce 2s ease-in-out infinite;
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

export function PaginaOfertas() {
    const { usuario } = useAuthStore();
    const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);
    const { ofertas, loading, crear, actualizar, eliminar, duplicar } = useOfertas();
    const { compararConHoy } = useZonaHoraria();

    // Estados UI
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
    const [ofertaEditando, setOfertaEditando] = useState<Oferta | null>(null);
    const [ofertaDuplicando, setOfertaDuplicando] = useState<Oferta | null>(null);
    const [paginaActual, setPaginaActual] = useState(0); // Bloque actual (0, 1, 2...) - Solo para laptop/desktop
    const [ofertasCargadas, setOfertasCargadas] = useState(OFERTAS_POR_PAGINA); // Para mobile infinite scroll

    // Detectar si estamos en mobile
    const isMobile = useIsMobile();

    // Ref para Intersection Observer (sentinel del infinite scroll)
    const observerRef = useRef<HTMLDivElement>(null);

    // Filtros
    const [filtros, setFiltros] = useState<FiltrosLocales>({
        busqueda: '',
        tipo: 'todos',
        estado: 'todos',
    });

    // Determinar si es dueño o gerente
    const esDueno = !usuario?.sucursalAsignada; // Dueño tiene sucursalAsignada null
    const esGerente = !!usuario?.sucursalAsignada; // Gerente tiene UUID

    // ===========================================================================
    // CALCULAR ESTADO DE OFERTA (CON ZONA HORARIA)
    // ===========================================================================

    const calcularEstado = (oferta: Oferta): EstadoOferta => {
        if (!oferta.activo) return 'inactiva';

        // Comparar fechas usando zona horaria del usuario
        const comparacionInicio = compararConHoy(oferta.fechaInicio);
        const comparacionFin = compararConHoy(oferta.fechaFin);

        // Si la fecha de inicio es futura (comparacionInicio > 0)
        if (comparacionInicio > 0) return 'proxima';

        // Si la fecha de fin ya pasó (comparacionFin < 0)
        if (comparacionFin < 0) return 'vencida';

        // Si alcanzó el límite de usos
        if (oferta.limiteUsos !== null && oferta.usosActuales >= oferta.limiteUsos) {
            return 'agotada';
        }

        // Si está entre fechas y tiene usos disponibles
        return 'activa';
    };

    // ===========================================================================
    // FILTRAR OFERTAS
    // ===========================================================================

    const ofertasFiltradas = useMemo(() => {
        return ofertas.filter((oferta) => {
            // Búsqueda por título
            if (
                filtros.busqueda &&
                !oferta.titulo.toLowerCase().includes(filtros.busqueda.toLowerCase())
            ) {
                return false;
            }

            // Filtro por tipo
            if (filtros.tipo !== 'todos' && oferta.tipo !== filtros.tipo) {
                return false;
            }

            // Filtro por estado
            if (filtros.estado !== 'todos') {
                const estado = calcularEstado(oferta);
                if (estado !== filtros.estado) {
                    return false;
                }
            }

            return true;
        });
    }, [ofertas, filtros]);

    // ===========================================================================
    // REORDENAR OFERTAS POR VENCIMIENTO
    // ===========================================================================

    const ofertasOrdenadas = useMemo(() => {
        return [...ofertasFiltradas].sort((a, b) => {
            const estadoA = calcularEstado(a);
            const estadoB = calcularEstado(b);

            // 1. Primero las inactivas
            if (estadoA === 'inactiva' && estadoB !== 'inactiva') return -1;
            if (estadoA !== 'inactiva' && estadoB === 'inactiva') return 1;

            // 2. Luego las vencidas
            if (estadoA === 'vencida' && estadoB !== 'vencida' && estadoB !== 'inactiva') return -1;
            if (estadoA !== 'vencida' && estadoA !== 'inactiva' && estadoB === 'vencida') return 1;

            // 3. Las demás (activa, proxima, agotada) se ordenan por fecha de vencimiento
            // Las más cercanas a vencer primero
            if (estadoA !== 'inactiva' && estadoA !== 'vencida' &&
                estadoB !== 'inactiva' && estadoB !== 'vencida') {
                return new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime();
            }

            return 0;
        });
    }, [ofertasFiltradas]);

    // ===========================================================================
    // SISTEMA HÍBRIDO: INFINITE SCROLL (MOBILE) + PAGINACIÓN (DESKTOP)
    // ===========================================================================

    // Ofertas mostradas según dispositivo
    const ofertasMostradas = useMemo(() => {
        if (isMobile) {
            // MOBILE: Mostrar progresivamente según ofertasCargadas
            return ofertasOrdenadas.slice(0, ofertasCargadas);
        } else {
            // DESKTOP/LAPTOP: Paginación por bloques
            const inicio = paginaActual * OFERTAS_POR_PAGINA;
            const fin = inicio + OFERTAS_POR_PAGINA;
            return ofertasOrdenadas.slice(inicio, fin);
        }
    }, [ofertasOrdenadas, paginaActual, ofertasCargadas, isMobile]);

    // Control para laptop/desktop (paginación)
    const hayMas = isMobile 
        ? ofertasCargadas < ofertasOrdenadas.length  // Mobile: hay más ofertas sin cargar
        : paginaActual * OFERTAS_POR_PAGINA + OFERTAS_POR_PAGINA < ofertasOrdenadas.length; // Desktop: hay más páginas
    const hayAnterior = !isMobile && paginaActual > 0;   // Solo en desktop

    const avanzar = () => {
        if (hayMas && !isMobile) {
            setPaginaActual(prev => prev + 1);
        }
    };

    const retroceder = () => {
        if (hayAnterior) {
            setPaginaActual(prev => prev - 1);
        }
    };

    // Resetear al cambiar filtros
    useEffect(() => {
        setPaginaActual(0);
        setOfertasCargadas(OFERTAS_POR_PAGINA);
    }, [filtros]);

    // Resetear ofertasCargadas cuando cambie a mobile/desktop
    useEffect(() => {
        setOfertasCargadas(OFERTAS_POR_PAGINA);
    }, [isMobile]);

    // ===========================================================================
    // INTERSECTION OBSERVER - INFINITE SCROLL (SOLO MOBILE)
    // ===========================================================================

    // Cargar más ofertas automáticamente en mobile cuando lleguemos al final
    const cargarMas = useCallback(() => {
        if (isMobile && ofertasCargadas < ofertasOrdenadas.length) {
            setOfertasCargadas(prev => 
                Math.min(prev + OFERTAS_POR_PAGINA, ofertasOrdenadas.length)
            );
        }
    }, [isMobile, ofertasCargadas, ofertasOrdenadas.length]);

    // Observer que detecta cuando el "sentinel" es visible
    useEffect(() => {
        if (!isMobile || !observerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Si el sentinel es visible y hay más ofertas, cargar
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
    // DETECTAR PREVIEW ABIERTO (ultra responsivo)
    // ===========================================================================


    // ===========================================================================
    // ESTADÍSTICAS RÁPIDAS
    // ===========================================================================

    const estadisticas = useMemo(() => {
        const activas = ofertas.filter((o) => calcularEstado(o) === 'activa').length;
        const proximas = ofertas.filter((o) => calcularEstado(o) === 'proxima').length;
        const vencidas = ofertas.filter((o) => calcularEstado(o) === 'vencida').length;
        const inactivas = ofertas.filter((o) => calcularEstado(o) === 'inactiva').length;

        return { activas, proximas, vencidas, inactivas, total: ofertas.length };
    }, [ofertas]);

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const handleCrear = () => {
        setOfertaEditando(null);
        setModalAbierto(true);
    };

    const handleEditar = (oferta: Oferta) => {
        setOfertaEditando(oferta);
        setModalAbierto(true);
    };

    const handleEliminar = async (id: string, titulo: string) => {
        const confirmado = await notificar.confirmar(
            `¿Eliminar "${titulo}"?`
        );

        if (confirmado) {
            await eliminar(id);
        }
    };

    const handleToggleActivo = async (id: string, activo: boolean) => {
        await actualizar(id, { activo });
    };

    const handleDuplicar = async (oferta: Oferta) => {
        // GERENTES: Duplicar directo en su sucursal asignada (sin modal)
        if (esGerente && usuario?.sucursalAsignada) {
            await duplicar(oferta.id, {
                sucursalesIds: [usuario.sucursalAsignada],
            });
            return;
        }

        // DUEÑOS: Abrir modal para seleccionar sucursales
        if (esDueno) {
            setOfertaDuplicando(oferta);
            setModalDuplicarAbierto(true);
        }
    };

    const limpiarFiltros = () => {
        setFiltros({
            busqueda: '',
            tipo: 'todos',
            estado: 'todos',
        });
    };

    const hayFiltrosActivos =
        filtros.busqueda !== '' || filtros.tipo !== 'todos' || filtros.estado !== 'todos';

    return (
        <div className="p-3 lg:p-1.5 2xl:p-3">
            {/* Inyectar estilos de animación */}
            <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

            {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

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
                                background: 'linear-gradient(135deg, #f43f5e, #fb7185, #fda4af)',
                                boxShadow: '0 6px 20px rgba(244,63,94,0.4)',
                            }}
                        >
                            {/* Tag animado */}
                            <div className="ofertas-icon-bounce">
                                <Tag className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Ofertas
                            </h1>
                            <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                                Promociones y descuentos
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
                                    <Tag className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">{estadisticas.total}</div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Total</div>
                                </div>
                            </button>

                            {/* Activas */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'activa' ? 'todos' : 'activa' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.estado === 'activa' ? 'ring-3 ring-emerald-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.estado === 'activa' 
                                        ? 'linear-gradient(135deg, #86efac, #4ade80)' 
                                        : 'linear-gradient(135deg, #f0fdf4, #fff)',
                                    border: filtros.estado === 'activa' ? '3px solid #22c55e' : '2px solid #86efac',
                                    boxShadow: filtros.estado === 'activa' 
                                        ? '0 4px 12px rgba(34,197,94,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                                >
                                    <TrendingUp className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">{estadisticas.activas}</div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Activas</div>
                                </div>
                            </button>

                            {/* Inactivas */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'inactiva' ? 'todos' : 'inactiva' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.estado === 'inactiva' ? 'ring-3 ring-red-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.estado === 'inactiva' 
                                        ? 'linear-gradient(135deg, #fca5a5, #f87171)' 
                                        : 'linear-gradient(135deg, #fef2f2, #fff)',
                                    border: filtros.estado === 'inactiva' ? '3px solid #ef4444' : '2px solid #fca5a5',
                                    boxShadow: filtros.estado === 'inactiva' 
                                        ? '0 4px 12px rgba(239,68,68,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                                >
                                    <PauseCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">{estadisticas.inactivas}</div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Inactivas</div>
                                </div>
                            </button>

                            {/* Próximas */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'proxima' ? 'todos' : 'proxima' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.estado === 'proxima' ? 'ring-3 ring-amber-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.estado === 'proxima' 
                                        ? 'linear-gradient(135deg, #fcd34d, #fbbf24)' 
                                        : 'linear-gradient(135deg, #fffbeb, #fff)',
                                    border: filtros.estado === 'proxima' ? '3px solid #f59e0b' : '2px solid #fcd34d',
                                    boxShadow: filtros.estado === 'proxima' 
                                        ? '0 4px 12px rgba(245,158,11,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(217,119,6,0.25)' }}
                                >
                                    <Calendar className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">{estadisticas.proximas}</div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Próximas</div>
                                </div>
                            </button>

                            {/* Vencidas */}
                            <button
                                onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'vencida' ? 'todos' : 'vencida' }))}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtros.estado === 'vencida' ? 'ring-3 ring-slate-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtros.estado === 'vencida' 
                                        ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)' 
                                        : 'linear-gradient(135deg, #f8fafc, #fff)',
                                    border: filtros.estado === 'vencida' ? '3px solid #64748b' : '2px solid #cbd5e1',
                                    boxShadow: filtros.estado === 'vencida' 
                                        ? '0 4px 12px rgba(100,116,139,0.4)' 
                                        : '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', boxShadow: '0 3px 8px rgba(100,116,139,0.25)' }}
                                >
                                    <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-600" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-slate-600">{estadisticas.vencidas}</div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Vencidas</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===================================================================== */}
                {/* BARRA DE BÚSQUEDA + FILTROS */}
                {/* ===================================================================== */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border border-slate-200 p-3 lg:p-2 2xl:p-3 mt-4 lg:mt-7 2xl:mt-14">
                    <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                        {/* Búsqueda */}
                        <div className="flex-1">
                            <Input
                                id="input-busqueda-ofertas"
                                name="input-busqueda-ofertas"
                                icono={<Search className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-400" />}
                                placeholder="Buscar por título..."
                                value={filtros.busqueda}
                                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                                className="w-full text-sm lg:text-xs 2xl:text-sm"
                            />
                        </div>

                        {/* Botón agregar */}
                        <Boton
                            variante="primario"
                            iconoIzquierda={<Plus className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />}
                            onClick={handleCrear}
                            className="shrink-0 cursor-pointer"
                        >
                            <span className="hidden lg:inline">Nueva Oferta</span>
                            <span className="lg:hidden">Nueva</span>
                        </Boton>
                    </div>

                    {/* Filtros de tipo - Scroll horizontal */}
                    <div className="mt-2 pt-2 border-t border-slate-100 overflow-x-auto">
                        <div className="flex gap-1.5 pb-1">
                            {[
                                { value: 'porcentaje', label: 'Porcentaje', icon: Percent },
                                { value: 'monto_fijo', label: 'Monto fijo', icon: DollarSign },
                                { value: '2x1', label: '2x1', icon: Gift },
                                { value: '3x2', label: '3x2', icon: Gift },
                                { value: 'envio_gratis', label: 'Envío gratis', icon: Truck },
                                { value: 'otro', label: 'Otro', icon: Sparkles },
                            ].map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setFiltros(prev => ({
                                        ...prev,
                                        tipo: prev.tipo === value ? 'todos' : value as TipoOferta
                                    }))}
                                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-sm lg:text-sm font-medium transition-all cursor-pointer ${filtros.tipo === value
                                        ? 'bg-blue-500 text-white lg:scale-105 shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                                    {label}
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

                {/* Lista de ofertas o estados vacíos */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                ) : ofertasFiltradas.length === 0 ? (
                    <div className="bg-white rounded-xl lg:rounded-2xl 2xl:rounded-2xl shadow-md border border-slate-200 p-8 lg:p-12 2xl:p-12 text-center">
                        <Tag className="w-12 h-12 lg:w-16 lg:h-16 2xl:w-16 2xl:h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg lg:text-xl 2xl:text-xl font-bold text-slate-800 mb-2">
                            {hayFiltrosActivos ? 'No hay ofertas con estos filtros' : 'No hay ofertas'}
                        </h3>
                        <p className="text-sm lg:text-base 2xl:text-base text-slate-500 mb-6">
                            {hayFiltrosActivos
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'Crea tu primera oferta para atraer más clientes'}
                        </p>
                        {!hayFiltrosActivos && (
                            <Boton
                                variante="primario"
                                tamanio="md"
                                onClick={handleCrear}
                                iconoIzquierda={<Plus className="w-5 h-5" />}
                            >
                                Crear primera oferta
                            </Boton>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Grid de cards 3x3 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 2xl:gap-7 mt-4 lg:mt-3 2xl:mt-4">
                            {ofertasMostradas.map((oferta) => (
                                <CardOferta
                                    key={oferta.id}
                                    oferta={oferta}
                                    estado={calcularEstado(oferta)}
                                    onEditar={handleEditar}
                                    onEliminar={handleEliminar}
                                    onToggleActivo={handleToggleActivo}
                                    onDuplicar={handleDuplicar}
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
                            <div className={`fixed right-6 2xl:right-1/2 bottom-24 z-50 transition-transform duration-75 group 
                                ${previewNegocioAbierto ? 'lg:right-[375px] 2xl:translate-x-[510px]' : 'lg:right-[47px] 2xl:translate-x-[890px]'
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
                            <div className={`fixed right-6 2xl:right-1/2 bottom-6 z-50 transition-transform duration-75 group 
                                ${previewNegocioAbierto ? 'lg:right-[375px] 2xl:translate-x-[510px]' : 'lg:right-[47px] 2xl:translate-x-[890px]'
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

                {/* Modal de crear/editar */}
                <ModalOferta
                    abierto={modalAbierto}
                    onCerrar={() => {
                        setModalAbierto(false);
                        setOfertaEditando(null);
                    }}
                    oferta={ofertaEditando}
                    onGuardar={async (datos) => {
                        const exito = ofertaEditando
                            ? await actualizar(ofertaEditando.id, datos as ActualizarOfertaInput)
                            : await crear(datos as CrearOfertaInput);

                        if (exito) {
                            setModalAbierto(false);
                            setOfertaEditando(null);
                        }
                    }}
                />

                {/* Modal de duplicar */}
                {modalDuplicarAbierto && ofertaDuplicando && (
                    <ModalDuplicarOferta
                        oferta={ofertaDuplicando}
                        onDuplicar={async (datos) => {
                            const exito = await duplicar(ofertaDuplicando.id, datos);
                            if (exito) {
                                setModalDuplicarAbierto(false);
                                setOfertaDuplicando(null);
                            }
                        }}
                        onCerrar={() => {
                            setModalDuplicarAbierto(false);
                            setOfertaDuplicando(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaOfertas;