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

import { useState, useMemo, useEffect } from 'react';
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
import { useOfertas } from '../../../../hooks/useOfertas';
import { useZonaHoraria } from '../../../../hooks/useZonaHoraria';
import { Boton } from '../../../../components/ui/Boton';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { CardOferta } from './CardOferta';
import { ModalOferta } from './ModalOferta';
import { ModalDuplicarOferta } from './ModalDuplicarOferta';
import { obtenerSucursalesNegocio } from '../../../../services/negociosService';
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
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaOfertas() {
    const { usuario } = useAuthStore();
    const { ofertas, loading, crear, actualizar, eliminar, duplicar } = useOfertas();
    const { compararConHoy } = useZonaHoraria();

    // Estados UI
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
    const [ofertaEditando, setOfertaEditando] = useState<Oferta | null>(null);
    const [ofertaDuplicando, setOfertaDuplicando] = useState<Oferta | null>(null);
    const [totalSucursales, setTotalSucursales] = useState(0);
    const [paginaActual, setPaginaActual] = useState(0); // Bloque actual (0, 1, 2...)
    const [previewAbierto, setPreviewAbierto] = useState(false); // Detectar preview

    // Filtros
    const [filtros, setFiltros] = useState<FiltrosLocales>({
        busqueda: '',
        tipo: 'todos',
        estado: 'todos',
    });

    // Determinar si es dueño (para decidir si mostrar modal de sucursales)
    const esDueno = !usuario?.sucursalAsignada;

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
    // SISTEMA PAGINACIÓN POR BLOQUES
    // ===========================================================================

    const ofertasMostradas = useMemo(() => {
        const inicio = paginaActual * OFERTAS_POR_PAGINA;
        const fin = inicio + OFERTAS_POR_PAGINA;
        return ofertasOrdenadas.slice(inicio, fin);
    }, [ofertasOrdenadas, paginaActual]);

    const hayMas = paginaActual * OFERTAS_POR_PAGINA + OFERTAS_POR_PAGINA < ofertasOrdenadas.length;
    const hayAnterior = paginaActual > 0;

    const avanzar = () => {
        if (hayMas) {
            setPaginaActual(prev => prev + 1);
        }
    };

    const retroceder = () => {
        if (hayAnterior) {
            setPaginaActual(prev => prev - 1);
        }
    };

    // Resetear página al cambiar filtros
    useEffect(() => {
        setPaginaActual(0);
    }, [filtros]);

    // ===========================================================================
    // DETECTAR PREVIEW ABIERTO (ultra responsivo)
    // ===========================================================================

    useEffect(() => {
        const checkPreview = () => {
            // Método 1: Buscar texto "Previa:"
            const textoPrevia = document.body.innerText.includes('Previa:');

            // Método 2: Buscar clase 2xl:w-[700px] (la clase del panel preview)
            const clasePreview = document.querySelector('.\\32xl\\:w-\\[700px\\]');

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
        // Si es dueño → Abrir modal (sin importar cantidad de sucursales)
        if (esDueno) {
            setOfertaDuplicando(oferta);
            setModalDuplicarAbierto(true);
        } else {
            // Si es gerente → Duplicar directo en su sucursal
            await duplicar(oferta.id, {
                sucursalesIds: [oferta.sucursalId]
            });
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
        <div className="bg-linear-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-3 lg:p-1.5 2xl:p-3">
            {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">
                {/* KPIs Compactos - Scroll horizontal en móvil, grid en laptop/desktop */}
                <div className="overflow-x-auto lg:overflow-visible">
                    <div className="flex lg:grid lg:grid-cols-5 gap-1.5 lg:gap-2 2xl:gap-3 pb-1 lg:pb-0">
                        {/* Total - NO clickeable */}
                        <div className="shrink-0 lg:shrink bg-white rounded-lg lg:rounded-xl 2xl:rounded-xl shadow-md border border-slate-200 px-2 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 min-w-[105px] lg:min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2">
                                    <div className="p-1 lg:p-1 2xl:p-1.5 bg-blue-100 rounded-lg">
                                        <Tag className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                                    </div>
                                    <span className="text-xs lg:text-sm 2xl:text-base font-semibold text-slate-600">Total</span>
                                </div>
                                <span className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-slate-900">{estadisticas.total}</span>
                            </div>
                        </div>

                        {/* Activas - Clickeable */}
                        <button
                            onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'activa' ? 'todos' : 'activa' }))}
                            className={`shrink-0 lg:shrink bg-white rounded-lg lg:rounded-xl 2xl:rounded-xl shadow-md border-2 px-2 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 text-left transition-all hover:scale-[1.02] min-w-[105px] lg:min-w-0 ${filtros.estado === 'activa'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2">
                                    <div className="p-1 lg:p-1 2xl:p-1.5 bg-emerald-100 rounded-lg">
                                        <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600" />
                                    </div>
                                    <span className="text-xs lg:text-sm 2xl:text-base font-semibold text-slate-600">Activas</span>
                                </div>
                                <span className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-emerald-600">{estadisticas.activas}</span>
                            </div>
                        </button>

                        {/* Inactivas - Clickeable */}
                        <button
                            onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'inactiva' ? 'todos' : 'inactiva' }))}
                            className={`shrink-0 lg:shrink bg-white rounded-lg lg:rounded-xl 2xl:rounded-xl shadow-md border-2 px-2 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 text-left transition-all hover:scale-[1.02] min-w-[105px] lg:min-w-0 ${filtros.estado === 'inactiva'
                                ? 'border-red-500 ring-2 ring-red-500/20'
                                : 'border-slate-200 hover:border-red-300'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2">
                                    <div className="p-1 lg:p-1 2xl:p-1.5 bg-red-100 rounded-lg">
                                        <PauseCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-red-600" />
                                    </div>
                                    <span className="text-xs lg:text-sm 2xl:text-base font-semibold text-slate-600">Inactivas</span>
                                </div>
                                <span className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-red-600">{estadisticas.inactivas}</span>
                            </div>
                        </button>

                        {/* Próximas - Clickeable */}
                        <button
                            onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'proxima' ? 'todos' : 'proxima' }))}
                            className={`shrink-0 lg:shrink bg-white rounded-lg lg:rounded-xl 2xl:rounded-xl shadow-md border-2 px-2 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 text-left transition-all hover:scale-[1.02] min-w-[105px] lg:min-w-0 ${filtros.estado === 'proxima'
                                ? 'border-amber-500 ring-2 ring-amber-500/20'
                                : 'border-slate-200 hover:border-amber-300'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2">
                                    <div className="p-1 lg:p-1 2xl:p-1.5 bg-amber-100 rounded-lg">
                                        <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-600" />
                                    </div>
                                    <span className="text-xs lg:text-sm 2xl:text-base font-semibold text-slate-600">Próximas</span>
                                </div>
                                <span className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-amber-600">{estadisticas.proximas}</span>
                            </div>
                        </button>

                        {/* Vencidas - Clickeable */}
                        <button
                            onClick={() => setFiltros(prev => ({ ...prev, estado: prev.estado === 'vencida' ? 'todos' : 'vencida' }))}
                            className={`shrink-0 lg:shrink bg-white rounded-lg lg:rounded-xl 2xl:rounded-xl shadow-md border-2 px-2 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 text-left transition-all hover:scale-[1.02] min-w-[105px] lg:min-w-0 ${filtros.estado === 'vencida'
                                ? 'border-slate-500 ring-2 ring-slate-500/20'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 lg:gap-1.5 2xl:gap-2">
                                    <div className="p-1 lg:p-1 2xl:p-1.5 bg-slate-100 rounded-lg">
                                        <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
                                    </div>
                                    <span className="text-xs lg:text-sm 2xl:text-base font-semibold text-slate-600">Vencidas</span>
                                </div>
                                <span className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-slate-600">{estadisticas.vencidas}</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Barra de búsqueda + Filtros + Botón agregar */}
                <div className="bg-white rounded-xl lg:rounded-2xl 2xl:rounded-2xl shadow-md border border-slate-200 p-3 lg:p-2.5 2xl:p-3">
                    <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                        {/* Búsqueda */}
                        <div className="flex-1">
                            <Input
                                id="input-busqueda-ofertas"
                                name="input-busqueda-ofertas"
                                icono={<Search className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" />}
                                placeholder="Buscar por título..."
                                value={filtros.busqueda}
                                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                                className="w-full text-sm lg:text-xs 2xl:text-sm"
                            />
                        </div>

                        {/* Botón agregar */}
                        <Boton
                            variante="primario"
                            iconoIzquierda={<Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />}
                            onClick={handleCrear}
                            className="shrink-0"
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
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-xs lg:text-sm font-medium transition-all ${filtros.tipo === value
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}

                            {/* Limpiar filtros si hay activos */}
                            {hayFiltrosActivos && (
                                <button
                                    onClick={limpiarFiltros}
                                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full lg:rounded-lg text-xs lg:text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 2xl:gap-7 mt-10 lg:mt-8 2xl:mt-12">
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

                        {/* FAB Superior - Volver (encima del de abajo) */}
                        {hayAnterior && (
                            <div className={`fixed right-6 2xl:right-1/2 bottom-24 z-40 transition-transform duration-75 group ${previewAbierto ? 'lg:right-[375px] 2xl:translate-x-[500px]' : '2xl:translate-x-[900px]'
                                }`}>
                                <button
                                    onClick={retroceder}
                                    className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center"
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
                        )}

                        {/* FAB Inferior - Ver más */}
                        {hayMas && (
                            <div className={`fixed right-6 2xl:right-1/2 bottom-6 z-40 transition-transform duration-75 group ${previewAbierto ? 'lg:right-[375px] 2xl:translate-x-[500px]' : '2xl:translate-x-[900px]'
                                }`}>
                                <button
                                    onClick={avanzar}
                                    className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center"
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