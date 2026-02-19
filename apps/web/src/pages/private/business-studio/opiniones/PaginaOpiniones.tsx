/**
 * ============================================================================
 * PÁGINA: Opiniones (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/opiniones/PaginaOpiniones.tsx
 *
 * PROPÓSITO:
 * Página principal del módulo de Opiniones/Reseñas en Business Studio.
 * Permite a dueños y gerentes ver, filtrar y responder reseñas de clientes.
 *
 * FEATURES:
 * - Header con icono animado (patrón de Ofertas/Puntos)
 * - 3 KPIs: Promedio ⭐, Total, Pendientes (clickeable → filtra)
 * - Barra de distribución de calificaciones (clickeable → filtra por estrellas)
 * - Filtros: chips [Todas/Pendientes] + estrellas + buscador por nombre/texto
 * - Lista de tarjetas de reseña con badge de estado
 * - Respuestas existentes del negocio en fondo azul
 * - Modal para responder reseñas pendientes (ModalAdaptativo)
 * - Actualizaciones optimistas al responder
 * - Caché por sucursal (no recarga al navegar entre páginas)
 * - Responsive (móvil, laptop, desktop)
 *
 * PATRÓN CACHÉ: Mismo que PaginaOfertas / PaginaCatalogo
 *   useLayoutEffect → carga desde caché antes del primer paint (sin flash)
 *   useCallback → verifica caché primero, solo fetch si no hay o venció
 *
 * CREADO: Febrero 2026 - Sprint 4 Módulo Opiniones
 */

import { useState, useMemo, useEffect, useCallback, useLayoutEffect } from 'react';
import {
    MessageSquare,
    Search,
    Star,
    User,
    Clock,
    CheckCircle2,
    AlertCircle,
    Pencil,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useResenasStore } from '../../../../stores/useResenasStore';
import { obtenerResenas, obtenerKPIs, responderResena as enviarRespuesta } from '../../../../services/resenasService';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { ModalResponder } from './ModalResponder';
import type { ResenaBS, KPIsResenas } from '../../../../types/resenas';

// =============================================================================
// CSS — Animación del icono del header (patrón Ofertas/Puntos)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes opiniones-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .opiniones-icon-bounce {
    animation: opiniones-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// HELPERS
// =============================================================================

function formatearFecha(fecha: string | null): string {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaResena = new Date(fecha);
    const diffDias = Math.floor((ahora.getTime() - fechaResena.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias}d`;
    return fechaResena.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type FiltroEstado = 'todas' | 'pendientes';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaOpiniones() {
    const { usuario, hidratado } = useAuthStore();

    // Store de caché
    const {
        getResenas,
        getKPIs,
        setDatos,
        actualizarResena,
        actualizarKPIs,
    } = useResenasStore();

    // Estado local
    const [resenas, setResenas] = useState<ResenaBS[]>([]);
    const [kpis, setKpis] = useState<KPIsResenas | null>(null);
    const [loading, setLoading] = useState(false);
    const [respondiendo, setRespondiendo] = useState(false);

    // Filtros locales
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
    const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null); // null = todas, 1-5
    const [busqueda, setBusqueda] = useState('');

    // Modal
    const [modalResponder, setModalResponder] = useState(false);
    const [resenaSeleccionada, setResenaSeleccionada] = useState<ResenaBS | null>(null);

    // Sucursal activa
    const sucursalId = usuario?.sucursalActiva || usuario?.sucursalAsignada || '';

    // =========================================================================
    // CACHÉ PRE-PAINT (elimina flash al navegar entre páginas)
    // =========================================================================

    useLayoutEffect(() => {
        if (!sucursalId) return;

        try {
            const resenasCache = getResenas(sucursalId);
            const kpisCache = getKPIs(sucursalId);

            if (resenasCache && resenasCache.length > 0) {
                setResenas(resenasCache);
            }
            if (kpisCache) {
                setKpis(kpisCache);
            }
        } catch (err) {
            console.warn('[PaginaOpiniones] Error al leer caché:', err);
        }
    }, [sucursalId, getResenas, getKPIs]);

    // =========================================================================
    // CARGAR DATOS (con caché)
    // =========================================================================

    const cargarDatos = useCallback(async (forzarRecarga = false) => {
        if (!sucursalId) return;

        // Verificar caché primero
        if (!forzarRecarga) {
            const resenasCache = getResenas(sucursalId);
            const kpisCache = getKPIs(sucursalId);

            if (resenasCache && kpisCache) {
                setResenas(resenasCache);
                setKpis(kpisCache);
                setLoading(false);
                return; // ← SALIR SIN HACER FETCH
            }
        }

        // No hay caché válida → Fetch desde backend
        try {
            setLoading(true);

            // Cargar TODO en paralelo (siempre todas las reseñas, filtrado es local)
            const [resReseñas, resKPIs] = await Promise.all([
                obtenerResenas(false), // false = traer TODAS, filtrado local
                obtenerKPIs(),
            ]);

            if (resReseñas.success && resReseñas.data && resKPIs.success && resKPIs.data) {
                // Guardar en caché
                setDatos(sucursalId, resReseñas.data, resKPIs.data);

                // Actualizar estado local
                setResenas(resReseñas.data);
                setKpis(resKPIs.data);
            }
        } catch (err) {
            console.error('[PaginaOpiniones] Error al cargar:', err);
            notificar.error('Error al cargar opiniones');
        } finally {
            setLoading(false);
        }
    }, [sucursalId, getResenas, getKPIs, setDatos]);

    // Trigger: cargar al montar o cambiar sucursal
    useEffect(() => {
        if (!hidratado) return;
        if (usuario?.modoActivo === 'comercial' && !usuario.sucursalActiva && !usuario.sucursalAsignada) return;

        cargarDatos();
    }, [hidratado, sucursalId, cargarDatos]);

    // =========================================================================
    // FILTRADO LOCAL (todo en useMemo, sin ir al backend)
    // =========================================================================

    const resenasFiltradas = useMemo(() => {
        let resultado = resenas;

        // Filtro: pendientes
        if (filtroEstado === 'pendientes') {
            resultado = resultado.filter((r) => !r.respuesta);
        }

        // Filtro: estrellas
        if (filtroEstrellas !== null) {
            resultado = resultado.filter((r) => r.rating === filtroEstrellas);
        }

        // Filtro: búsqueda
        if (busqueda.trim()) {
            const termino = busqueda.toLowerCase();
            resultado = resultado.filter(
                (r) =>
                    r.autor.nombre.toLowerCase().includes(termino) ||
                    r.texto?.toLowerCase().includes(termino)
            );
        }

        return resultado;
    }, [resenas, filtroEstado, filtroEstrellas, busqueda]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const abrirResponder = useCallback((resena: ResenaBS) => {
        setResenaSeleccionada(resena);
        setModalResponder(true);
    }, []);

    const handleResponder = useCallback(async (resenaId: string, texto: string): Promise<boolean> => {
        setRespondiendo(true);

        // 1. Guardar estado previo para rollback
        const resenasAnterior = resenas;
        const kpisAnterior = kpis;

        // 2. Actualización optimista
        const respuestaTemp = {
            id: 'temp-' + Date.now(),
            texto,
            createdAt: new Date().toISOString(),
        };

        // Actualizar local
        setResenas((prev) =>
            prev.map((r) => r.id === resenaId ? { ...r, respuesta: respuestaTemp } : r)
        );
        setKpis((prev) =>
            prev ? { ...prev, pendientes: Math.max(0, prev.pendientes - 1) } : null
        );

        // Actualizar caché
        if (sucursalId) {
            actualizarResena(sucursalId, resenaId, { respuesta: respuestaTemp });
            if (kpis) {
                actualizarKPIs(sucursalId, { pendientes: Math.max(0, kpis.pendientes - 1) });
            }
        }

        try {
            // 3. Enviar al backend
            const resultado = await enviarRespuesta(resenaId, texto);

            if (resultado.success && resultado.data) {
                // 4. Reemplazar datos temporales con los reales
                const respuestaReal = {
                    id: resultado.data.id,
                    texto: resultado.data.texto,
                    createdAt: resultado.data.createdAt,
                };

                setResenas((prev) =>
                    prev.map((r) => r.id === resenaId ? { ...r, respuesta: respuestaReal } : r)
                );
                if (sucursalId) {
                    actualizarResena(sucursalId, resenaId, { respuesta: respuestaReal });
                }

                notificar.exito('Respuesta enviada');
                setRespondiendo(false);
                return true;
            } else {
                throw new Error('Error al responder');
            }
        } catch (err) {
            // 5. Rollback
            console.error('[PaginaOpiniones] Error al responder:', err);
            setResenas(resenasAnterior);
            setKpis(kpisAnterior);

            // Rollback caché: invalidar para que recargue fresco
            if (sucursalId) {
                useResenasStore.getState().invalidarCache(sucursalId);
            }

            notificar.error('Error al enviar respuesta');
            setRespondiendo(false);
            return false;
        }
    }, [resenas, kpis, sucursalId, actualizarResena, actualizarKPIs]);

    /** Toggle filtro de estrellas (click en barra distribución) */
    const toggleFiltroEstrellas = (estrellas: number) => {
        setFiltroEstrellas((prev) => prev === estrellas ? null : estrellas);
    };

    const hayFiltrosActivos = filtroEstado !== 'todas' || filtroEstrellas !== null || busqueda.trim() !== '';

    const limpiarFiltros = () => {
        setFiltroEstado('todas');
        setFiltroEstrellas(null);
        setBusqueda('');
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div className="p-3 lg:p-1.5 2xl:p-3">
            {/* Inyectar estilos de animación */}
            <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

            {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

                {/* ============================================================= */}
                {/* HEADER + KPIs EN UNA FILA (DESKTOP)                            */}
                {/* ============================================================= */}

                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                    {/* Header con icono animado */}
                    <div className="flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #fcd34d)',
                                boxShadow: '0 6px 20px rgba(245,158,11,0.4)',
                            }}
                        >
                            <div className="opiniones-icon-bounce">
                                <MessageSquare className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Opiniones
                            </h1>
                            <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                                Reseñas de tus clientes
                            </p>
                        </div>
                    </div>

                    {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
                    <div className="overflow-x-auto lg:overflow-visible lg:flex-1">
                        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">

                            {/* Promedio ⭐ */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #fffbeb, #fff)',
                                    border: '2px solid #fcd34d',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)', boxShadow: '0 3px 8px rgba(245,158,11,0.25)' }}
                                >
                                    <Star className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-800 fill-amber-800" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">
                                        {loading ? '—' : (kpis?.promedio?.toFixed(1) ?? '0.0')}
                                    </div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Promedio</div>
                                </div>
                            </div>

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
                                    <MessageSquare className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">
                                        {loading ? '—' : (kpis?.total ?? 0)}
                                    </div>
                                    <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Total</div>
                                </div>
                            </div>

                            {/* Pendientes (clickeable → filtra) */}
                            <button
                                onClick={() => setFiltroEstado((prev) => prev === 'pendientes' ? 'todas' : 'pendientes')}
                                className={`flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 transition-all hover:-translate-y-0.5 cursor-pointer h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${filtroEstado === 'pendientes' ? 'ring-3 ring-orange-500 lg:scale-105' : ''}`}
                                style={{
                                    background: filtroEstado === 'pendientes'
                                        ? 'linear-gradient(135deg, #fdba74, #fb923c)'
                                        : 'linear-gradient(135deg, #fff7ed, #fff)',
                                    border: filtroEstado === 'pendientes' ? '3px solid #f97316' : '2px solid #fdba74',
                                    boxShadow: filtroEstado === 'pendientes'
                                        ? '0 4px 12px rgba(249,115,22,0.4)'
                                        : '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)', boxShadow: '0 3px 8px rgba(234,88,12,0.25)' }}
                                >
                                    <AlertCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-orange-800" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-orange-800">
                                        {loading ? '—' : (kpis?.pendientes ?? 0)}
                                    </div>
                                    <div className={`text-[12px] lg:text-[10px] 2xl:text-[14px] font-semibold mt-0.5 ${filtroEstado === 'pendientes' ? 'text-white' : 'text-slate-500'}`}>
                                        Pendientes
                                    </div>
                                </div>
                            </button>

                        </div>
                    </div>
                </div>

                {/* ============================================================= */}
                {/* CARD FILTROS (separado)                                        */}
                {/* ============================================================= */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg border border-slate-300 p-3 lg:p-2 2xl:p-3 mt-4 lg:mt-7 2xl:mt-14">
                    {/* Búsqueda */}
                    <div className="mb-2 lg:mb-1.5 2xl:mb-2">
                        <Input
                            id="input-busqueda-resenas"
                            name="input-busqueda-resenas"
                            icono={<Search className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 text-slate-400" />}
                            placeholder="Buscar por nombre o texto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full text-sm lg:text-xs 2xl:text-sm"
                        />
                    </div>

                    {/* Chips: estado + estrellas */}
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 overflow-x-auto pt-2 border-t border-slate-200 pb-0.5">
                        {/* Todas */}
                        <button
                            onClick={() => { setFiltroEstado('todas'); setFiltroEstrellas(null); }}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-full text-sm lg:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
                                filtroEstado === 'todas' && filtroEstrellas === null
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                            Todas {kpis ? `(${kpis.total})` : ''}
                        </button>

                        {/* Pendientes */}
                        <button
                            onClick={() => setFiltroEstado((prev) => prev === 'pendientes' ? 'todas' : 'pendientes')}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-full text-sm lg:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
                                filtroEstado === 'pendientes'
                                    ? 'bg-orange-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                        >
                            <AlertCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                            Pendientes {kpis ? `(${kpis.pendientes})` : ''}
                        </button>

                        {/* Separador */}
                        <div className="w-px h-6 bg-slate-300 shrink-0" />

                        {/* Filtros por estrellas */}
                        {[5, 4, 3, 2, 1].map((n) => {
                            const activo = filtroEstrellas === n;
                            const cantidad = kpis?.distribucion[`estrellas${n}` as keyof typeof kpis.distribucion] ?? 0;
                            return (
                                <button
                                    key={n}
                                    onClick={() => toggleFiltroEstrellas(n)}
                                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 rounded-full text-sm lg:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
                                        activo
                                            ? 'bg-amber-500 text-white shadow-lg ring-2 ring-amber-300'
                                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                    }`}
                                >
                                    <Star className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${activo ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}`} />
                                    {n}
                                    <span className={`text-xs lg:text-[10px] 2xl:text-xs font-semibold ${activo ? 'text-amber-100' : 'text-amber-500'}`}>
                                        ({cantidad})
                                    </span>
                                </button>
                            );
                        })}

                        {/* Limpiar */}
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 rounded-full text-sm lg:text-xs 2xl:text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                            >
                                ✕ Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* ============================================================= */}
                {/* CARD LISTA DE RESEÑAS (con scroll)                            */}
                {/* ============================================================= */}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                ) : resenasFiltradas.length === 0 ? (
                    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg border border-slate-300 p-8 lg:p-6 2xl:p-8 text-center">
                        <MessageSquare className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-1">
                            {hayFiltrosActivos
                                ? 'No hay reseñas con estos filtros'
                                : 'No hay reseñas aún'}
                        </h3>
                        <p className="text-sm lg:text-xs 2xl:text-sm text-slate-500">
                            {hayFiltrosActivos
                                ? 'Intenta ajustar los filtros'
                                : 'Tus clientes aún no han dejado opiniones'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg border border-slate-300 overflow-hidden">
                        <div className="overflow-y-auto max-h-[50vh] lg:max-h-[42vh] 2xl:max-h-[61vh] p-3 lg:p-2.5 2xl:p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-2 2xl:gap-2.5">
                                {resenasFiltradas.map((resena) => (
                                    <div
                                        key={resena.id}
                                        className={`bg-slate-50 rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4 ${
                                            resena.respuesta
                                                ? 'border border-slate-300'
                                                : 'border-2 border-orange-300 bg-orange-50/30'
                                        }`}
                                    >
                                        {/* Header: avatar + info + badge */}
                                        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 mb-2.5 lg:mb-2 2xl:mb-2.5">
                                            {resena.autor.avatarUrl ? (
                                                <img
                                                    src={resena.autor.avatarUrl}
                                                    alt={resena.autor.nombre}
                                                    className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                                    <User className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm lg:text-xs 2xl:text-sm text-slate-900">
                                                        {resena.autor.nombre}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] lg:text-[10px] 2xl:text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                                            resena.respuesta
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                : 'bg-orange-100 text-orange-800 border border-orange-300'
                                                        }`}
                                                    >
                                                        {resena.respuesta ? (
                                                            <span className="flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Respondida
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 ${
                                                                    resena.rating && s <= resena.rating
                                                                        ? 'text-amber-500 fill-amber-500'
                                                                        : 'text-slate-300'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    {resena.sucursalNombre && (
                                                        <>
                                                            <span className="text-[10px] text-slate-300">·</span>
                                                            <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400">
                                                                {resena.sucursalNombre}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="text-[10px] text-slate-300">·</span>
                                                    <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400">
                                                        {formatearFecha(resena.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {resena.texto && (
                                            <p className="ml-13 lg:ml-10.5 2xl:ml-13 text-sm lg:text-xs 2xl:text-sm text-slate-700 italic leading-relaxed mb-2.5 lg:mb-2 2xl:mb-2.5">
                                                "{resena.texto}"
                                            </p>
                                        )}

                                        {resena.respuesta && (
                                            <div className="ml-13 lg:ml-10.5 2xl:ml-13 p-3 lg:p-2.5 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg bg-blue-100/70 border-l-3 border-blue-500">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                        <span className="text-white text-[9px] lg:text-[8px] 2xl:text-[9px] font-bold">N</span>
                                                    </div>
                                                    <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-blue-800">
                                                        Tu respuesta
                                                    </span>
                                                    <button
                                                        onClick={() => abrirResponder(resena)}
                                                        className="flex items-center gap-1 text-blue-600 text-[11px] lg:text-[10px] 2xl:text-[11px] font-semibold cursor-pointer hover:text-blue-800 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Editar
                                                    </button>
                                                    <span className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-blue-400 ml-auto">
                                                        {formatearFecha(resena.respuesta.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-700 leading-relaxed">
                                                    {resena.respuesta.texto}
                                                </p>
                                            </div>
                                        )}

                                        {!resena.respuesta && (
                                            <div className="ml-13 lg:ml-10.5 2xl:ml-13 mt-1">
                                                <button
                                                    onClick={() => abrirResponder(resena)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-lg lg:rounded-md 2xl:rounded-lg text-xs lg:text-[11px] 2xl:text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-colors cursor-pointer"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                                                    Responder
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ================================================================= */}
            {/* MODAL RESPONDER                                                    */}
            {/* ================================================================= */}

            <ModalResponder
                abierto={modalResponder}
                onCerrar={() => {
                    setModalResponder(false);
                    setResenaSeleccionada(null);
                }}
                resena={resenaSeleccionada}
                onEnviar={handleResponder}
                respondiendo={respondiendo}
            />
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default PaginaOpiniones;