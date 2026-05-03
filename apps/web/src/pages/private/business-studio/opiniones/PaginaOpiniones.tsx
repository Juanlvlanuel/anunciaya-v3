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
 * - Actualizaciones optimistas al responder (React Query onMutate/onError)
 * - Caché automático por sucursal vía React Query (staleTime global 2 min)
 * - Responsive (móvil, laptop, desktop)
 *
 * DATOS: React Query — hooks/queries/useResenas.ts
 *   useResenasLista()  → trae TODAS las reseñas (filtrado en memoria con useMemo)
 *   useResenasKPIs()   → KPIs del módulo
 *   useResponderResena() → mutación con update optimista + rollback automático
 *
 * CREADO: Febrero 2026 - Sprint 4 Módulo Opiniones
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    MessageSquare,
    Search,
    Star,
    Clock,
    CheckCircle2,
    AlertCircle,
    PencilLine,
    X,
    Check,
    Inbox,
} from 'lucide-react';
import { useResenasLista, useResenasKPIs, useResponderResena } from '../../../../hooks/queries/useResenas';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import { ModalResponder } from './ModalResponder';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { ResenaBS } from '../../../../types/resenas';

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

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Formato largo: "Hoy" / "Ayer" / "03 Abril 2026" */
function formatearFechaLarga(fecha: string | null): string {
    if (!fecha) return '';
    const ahora = new Date();
    const f = new Date(fecha);
    const diffDias = Math.floor((ahora.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';

    const dia = String(f.getDate()).padStart(2, '0');
    const mes = MESES_LARGOS[f.getMonth()];
    const anio = f.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_CARACTERES_RESPUESTA = 500;

const TEMPLATES_RESPUESTA = [
    {
        label: 'Agradecimiento',
        texto: '¡Muchas gracias por tu reseña! Nos alegra saber que tuviste una buena experiencia. ¡Te esperamos pronto!',
    },
    {
        label: 'Disculpa',
        texto: 'Lamentamos mucho que tu experiencia no haya sido la mejor. Nos gustaría conocer más detalles para mejorar. ¿Podrías contactarnos?',
    },
    {
        label: 'Invitación',
        texto: '¡Gracias por compartir tu opinión! Esperamos verte pronto de nuevo. ¡Tenemos nuevas sorpresas para ti!',
    },
];

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type FiltroEstado = 'todas' | 'pendientes';

// =============================================================================
// ESTADO VACÍO CONTEXTUAL
// =============================================================================

function EstadoVacioOpiniones({
    busqueda,
    filtroEstrellas,
    filtroEstado,
}: {
    busqueda?: string;
    filtroEstrellas?: number | null;
    filtroEstado?: FiltroEstado;
}) {
    let titulo: string;
    let subtitulo: string;

    if (busqueda) {
        titulo = 'Sin resultados';
        subtitulo = 'Prueba con otro término de búsqueda';
    } else if (filtroEstrellas !== null && filtroEstrellas !== undefined) {
        titulo = `Sin reseñas de ${filtroEstrellas} ${filtroEstrellas === 1 ? 'estrella' : 'estrellas'}`;
        subtitulo = 'Prueba cambiando el filtro de estrellas';
    } else if (filtroEstado === 'pendientes') {
        titulo = 'Sin reseñas pendientes';
        subtitulo = 'Todas las reseñas están respondidas';
    } else {
        titulo = 'No hay reseñas aún';
        subtitulo = 'Tus clientes aún no han dejado opiniones';
    }

    return (
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-8 lg:p-6 2xl:p-8 text-center">
            <MessageSquare className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-1">{titulo}</h3>
            <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium">{subtitulo}</p>
        </div>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaOpiniones() {
    // ─── Datos del negocio (para el card de respuesta) ────────────────────────
    const nombreNegocio = useAuthStore((s) => s.usuario?.nombreNegocio ?? null);
    const logoNegocio = useAuthStore((s) => s.usuario?.logoNegocio ?? null);

    // ─── Queries — datos del servidor ─────────────────────────────────────────
    const listaQuery = useResenasLista();
    const kpisQuery = useResenasKPIs();
    const responderMutation = useResponderResena();

    // ─── Aliases ──────────────────────────────────────────────────────────────
    const resenas = listaQuery.data ?? [];
    const kpis = kpisQuery.data ?? null;
    const loading = listaQuery.isPending || kpisQuery.isPending;
    const respondiendo = responderMutation.isPending;

    // Filtros locales
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
    const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null); // null = todas, 1-5
    const [busqueda, setBusqueda] = useState('');

    // Reset filtros al cambiar de sucursal — los filtros pueden no dar resultados en la nueva.
    const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
    useEffect(() => {
        setFiltroEstado('todas');
        setFiltroEstrellas(null);
        setBusqueda('');
    }, [sucursalActiva]);

    // URL params
    const [searchParams, setSearchParams] = useSearchParams();
    const [resenaIdPendiente, setResenaIdPendiente] = useState(() => searchParams.get('resenaId') || '');

    // Detectar nuevos deep links cuando ya estamos en la página
    useEffect(() => {
        const nuevoId = searchParams.get('resenaId');
        if (nuevoId) {
            setResenaIdPendiente(nuevoId);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    // Modal (solo móvil)
    const [modalResponder, setModalResponder] = useState(false);
    const [resenaSeleccionada, setResenaSeleccionada] = useState<ResenaBS | null>(null);

    // Panel detalle inline (desktop)
    const [resenaActivaId, setResenaActivaId] = useState<string | null>(null);
    const [textoResponderInline, setTextoResponderInline] = useState('');
    const [modoEdicionInline, setModoEdicionInline] = useState(false);

    // Abrir reseña desde URL (notificaciones)
    useEffect(() => {
        if (!resenaIdPendiente || resenas.length === 0) return;
        const resena = resenas.find((r) => r.id === resenaIdPendiente);
        if (resena) {
            setResenaSeleccionada(resena);
            setModalResponder(true);
        } else {
            notificar.info('Esta reseña ya no está disponible');
        }
        setResenaIdPendiente('');
    }, [resenaIdPendiente, resenas]);

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
    // VISTA SPLIT (desktop): reseña activa derivada de resenaActivaId
    // =========================================================================

    const resenaActiva = useMemo(
        () => resenasFiltradas.find((r) => r.id === resenaActivaId) ?? null,
        [resenasFiltradas, resenaActivaId]
    );

    // Auto-seleccionar primera reseña si no hay ninguna activa
    useEffect(() => {
        if (resenaActivaId !== null) return;
        if (resenasFiltradas.length > 0) {
            setResenaActivaId(resenasFiltradas[0].id);
        }
    }, [resenasFiltradas, resenaActivaId]);

    // Si la reseña activa ya no existe en el dataset (borrada), resetear
    useEffect(() => {
        if (resenaActivaId === null) return;
        if (resenas.length === 0 || !resenas.some((r) => r.id === resenaActivaId)) {
            setResenaActivaId(null);
        }
    }, [resenas, resenaActivaId]);

    // Reset texto + modoEdicion cuando cambia la reseña activa
    useEffect(() => {
        setTextoResponderInline('');
        setModoEdicionInline(false);
    }, [resenaActivaId]);

    // =========================================================================
    // INFINITE SCROLL MÓVIL (slice local, 12 por tanda)
    // =========================================================================

    const RESENAS_POR_PAGINA = 12;
    const [resenasCargadas, setResenasCargadas] = useState(RESENAS_POR_PAGINA);
    const observerRef = useRef<HTMLDivElement | null>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    const resenasMostradas = useMemo(() => {
        if (isMobile) return resenasFiltradas.slice(0, resenasCargadas);
        return resenasFiltradas;
    }, [resenasFiltradas, resenasCargadas, isMobile]);

    const hayMasResenas = isMobile && resenasCargadas < resenasFiltradas.length;

    const cargarMasResenas = useCallback(() => {
        if (isMobile && resenasCargadas < resenasFiltradas.length) {
            setResenasCargadas(prev => Math.min(prev + RESENAS_POR_PAGINA, resenasFiltradas.length));
        }
    }, [isMobile, resenasCargadas, resenasFiltradas.length]);

    // Reset al cambiar filtros
    useEffect(() => {
        setResenasCargadas(RESENAS_POR_PAGINA);
    }, [filtroEstado, filtroEstrellas, busqueda]);

    // IntersectionObserver
    useEffect(() => {
        if (!isMobile || !hayMasResenas) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) cargarMasResenas();
            },
            { root: null, rootMargin: '100px', threshold: 0.1 }
        );

        const el = observerRef.current;
        if (el) observer.observe(el);

        return () => { if (el) observer.unobserve(el); };
    }, [isMobile, hayMasResenas, cargarMasResenas]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const abrirResponder = useCallback((resena: ResenaBS) => {
        setResenaSeleccionada(resena);
        setModalResponder(true);
    }, []);

    const handleResponder = useCallback(async (resenaId: string, texto: string): Promise<boolean> => {
        try {
            await responderMutation.mutateAsync({ resenaId, texto });
            notificar.exito('Respuesta enviada');
            return true;
        } catch {
            notificar.error('Error al enviar respuesta');
            return false;
        }
    }, [responderMutation]);

    /** Enviar respuesta desde el panel inline (desktop) */
    const enviarRespuestaInline = useCallback(async () => {
        if (!resenaActiva || !textoResponderInline.trim()) return;
        const ok = await handleResponder(resenaActiva.id, textoResponderInline.trim());
        if (ok) {
            setTextoResponderInline('');
            setModoEdicionInline(false);
        }
    }, [resenaActiva, textoResponderInline, handleResponder]);

    /** Iniciar edición de respuesta existente en el panel inline */
    const iniciarEdicionInline = useCallback(() => {
        if (!resenaActiva?.respuesta) return;
        setTextoResponderInline(resenaActiva.respuesta.texto ?? '');
        setModoEdicionInline(true);
    }, [resenaActiva]);

    /** Toggle filtro de estrellas (click en barra distribución) */
    const toggleFiltroEstrellas = (estrellas: number) => {
        setFiltroEstrellas((prev) => prev === estrellas ? null : estrellas);
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
                    <div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
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
                            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                                Reseñas de tus clientes
                            </p>
                        </div>
                    </div>

                    {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
                    <div className="mt-5 lg:mt-0 overflow-x-auto lg:overflow-visible lg:flex-1">
                        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">

                            {/* Promedio ⭐ */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 flex-1 min-w-0 h-13 2xl:h-16 lg:flex-none lg:shrink-0 lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #fffbeb, #fff)',
                                    border: '2px solid #fcd34d',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)', boxShadow: '0 3px 8px rgba(245,158,11,0.25)' }}
                                >
                                    <Star className="w-4 h-4 text-amber-800 fill-amber-800" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">
                                        {loading ? '—' : (kpis?.promedio?.toFixed(1) ?? '0.0')}
                                    </div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Promedio</div>
                                </div>
                            </div>

                            {/* Total */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 w-[26%] h-13 2xl:h-16 lg:w-auto lg:flex-none lg:shrink-0 lg:min-w-[110px] 2xl:min-w-[140px]"
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
                                    <MessageSquare className="w-4 h-4 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">
                                        {loading ? '—' : (kpis?.total ?? 0)}
                                    </div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Total</div>
                                </div>
                            </div>

                            {/* Pendientes */}
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 flex-1 min-w-0 h-13 2xl:h-16 lg:flex-none lg:shrink-0 lg:min-w-[110px] 2xl:min-w-[140px]"
                                style={{
                                    background: 'linear-gradient(135deg, #fff7ed, #fff)',
                                    border: '2px solid #fdba74',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)', boxShadow: '0 3px 8px rgba(234,88,12,0.25)' }}
                                >
                                    <AlertCircle className="w-4 h-4 text-orange-800" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-orange-800">
                                        {loading ? '—' : (kpis?.pendientes ?? 0)}
                                    </div>
                                    <div className="text-sm lg:text-[11px] 2xl:text-sm font-semibold mt-0.5 text-slate-600">
                                        Pendientes
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ============================================================= */}
                {/* CARD FILTROS (separado)                                        */}
                {/* ============================================================= */}

                <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14 overflow-visible flex flex-col gap-2 2xl:gap-3">
                    {/* Búsqueda */}
                    <Input
                        id="input-busqueda-resenas"
                        name="input-busqueda-resenas"
                        icono={<Search className="w-4 h-4 text-slate-600" />}
                        placeholder="Buscar por nombre o texto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
                        elementoDerecha={busqueda ? (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="p-1 rounded-full text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                                <X className="w-[18px] h-[18px]" />
                            </button>
                        ) : undefined}
                    />

                    {/* Chips: estrellas (izq) + Todas/Pendientes (der) */}
                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                        {/* Segmented control de estrellas — izquierda */}
                        <div className="flex items-center gap-0.5 bg-slate-200 rounded-lg p-1 shrink-0 h-11 lg:h-10 2xl:h-11">
                            {[5, 4, 3, 2, 1].map((estrellas) => {
                                const activo = filtroEstrellas === estrellas;
                                return (
                                    <button
                                        key={estrellas}
                                        onClick={() => toggleFiltroEstrellas(estrellas)}
                                        className={`px-2.5 h-full font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all text-sm lg:text-sm 2xl:text-base ${
                                            activo
                                                ? 'text-white shadow-sm'
                                                : 'text-slate-700 hover:bg-white/60'
                                        }`}
                                        style={activo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
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
                                onClick={() => toggleFiltroEstrellas(filtroEstrellas)}
                                className="shrink-0 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
                                aria-label="Limpiar filtro de estrellas"
                                data-testid="btn-limpiar-filtro-estrellas"
                            >
                                <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Todas + Pendientes — derecha (oculto en móvil) */}
                        <div className="hidden lg:flex items-center lg:gap-1.5 2xl:gap-2 overflow-x-auto shrink-0 ml-auto">
                            {/* Todas */}
                            <button
                                onClick={() => { setFiltroEstado('todas'); setFiltroEstrellas(null); }}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
                                    filtroEstado === 'todas' && filtroEstrellas === null
                                        ? 'text-white border-slate-700 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                }`}
                                style={filtroEstado === 'todas' && filtroEstrellas === null ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                            >
                                <MessageSquare className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                Todas {kpis ? `(${kpis.total})` : ''}
                            </button>

                            {/* Pendientes */}
                            <button
                                onClick={() => setFiltroEstado((prev) => prev === 'pendientes' ? 'todas' : 'pendientes')}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
                                    filtroEstado === 'pendientes'
                                        ? 'text-white border-slate-700 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                }`}
                                style={filtroEstado === 'pendientes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                            >
                                <AlertCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                Pendientes {kpis ? `(${kpis.pendientes})` : ''}
                            </button>
                        </div>
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
                    <EstadoVacioOpiniones
                        busqueda={busqueda}
                        filtroEstrellas={filtroEstrellas}
                        filtroEstado={filtroEstado}
                    />
                ) : (
                    <>
                    {/* Desktop: Split view — lista compacta izq + panel detalle der */}
                    <div className="hidden lg:flex gap-3 2xl:gap-4 h-[46vh] 2xl:h-[56vh]">
                        {/* ─── Aside: lista compacta ─── */}
                        <aside className="w-[340px] 2xl:w-[400px] shrink-0 bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden flex flex-col">
                            <div
                                className="flex items-center px-4 py-2.5 border-b-2 border-slate-300 shrink-0 h-[60px]"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                            >
                                <span className="text-base 2xl:text-lg font-bold text-white">
                                    {resenasFiltradas.length} {resenasFiltradas.length === 1 ? 'Reseña' : 'Reseñas'}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {resenasFiltradas.map((r) => {
                                    const activa = r.id === resenaActivaId;
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => setResenaActivaId(r.id)}
                                            className={`w-full text-left p-3 border-b-2 border-slate-300 cursor-pointer transition-colors border-l-4 ${
                                                activa
                                                    ? 'bg-blue-100 border-l-blue-500'
                                                    : 'border-l-transparent hover:bg-slate-100'
                                            }`}
                                            data-testid={`item-resena-${r.id}`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                {r.autor.avatarUrl ? (
                                                    <img
                                                        src={r.autor.avatarUrl}
                                                        alt={r.autor.nombre}
                                                        className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center text-white text-sm 2xl:text-base font-bold shrink-0 shadow-md"
                                                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                                    >
                                                        {obtenerIniciales(r.autor.nombre)}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <h4 className="font-bold text-sm 2xl:text-base text-slate-900 truncate">
                                                            {r.autor.nombre}
                                                        </h4>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <span className="text-sm 2xl:text-base font-bold text-slate-900 tabular-nums">
                                                                {r.rating?.toFixed(1) ?? '—'}
                                                            </span>
                                                            <Star className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-amber-500 fill-amber-500" strokeWidth={0} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] 2xl:text-sm text-slate-600 mt-0.5 line-clamp-2 font-medium leading-snug">
                                                        {r.texto || <span className="italic">Sin comentario</span>}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-1.5 mt-1.5">
                                                        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] 2xl:text-sm px-2 py-0.5 rounded-full font-bold ${r.respuesta ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {r.respuesta ? <><CheckCircle2 className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />Respondida</> : <><Clock className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />Pendiente</>}
                                                        </span>
                                                        <span className="text-xs 2xl:text-sm text-slate-600 font-medium truncate">
                                                            {formatearFechaLarga(r.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        {/* ─── Main: panel detalle ─── */}
                        <main className="flex-1 bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden flex flex-col relative">
                            {resenaActiva ? (
                                <>
                                    {/* Header slate — avatar + nombre + badge + fecha + rating */}
                                    <div
                                        className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b-2 border-slate-300 h-[60px]"
                                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                                    >
                                        {resenaActiva.autor.avatarUrl ? (
                                            <img
                                                src={resenaActiva.autor.avatarUrl}
                                                alt={resenaActiva.autor.nombre}
                                                className="w-12 h-12 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div
                                                className="w-12 h-12 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center text-white text-base lg:text-xs 2xl:text-sm font-bold shrink-0 shadow-md"
                                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                            >
                                                {obtenerIniciales(resenaActiva.autor.nombre)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base 2xl:text-lg font-bold text-white truncate">
                                                {resenaActiva.autor.nombre}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-lg 2xl:text-xl font-bold text-white tabular-nums">
                                                {resenaActiva.rating?.toFixed(1) ?? '—'}
                                            </span>
                                            <Star className="w-5 h-5 2xl:w-6 2xl:h-6 text-amber-400 fill-amber-400" strokeWidth={0} />
                                        </div>
                                    </div>


                                    {/* Zona scrolleable con contenido */}
                                    <div className="flex-1 overflow-y-auto p-3 2xl:p-4 pt-6 2xl:pt-8 pb-20">
                                        <div className="space-y-6 2xl:space-y-8">
                                            {/* Burbuja cliente (izquierda) — estilo chat balanceado */}
                                            {resenaActiva.texto && (
                                                <div className="flex items-end gap-2">
                                                    {resenaActiva.autor.avatarUrl ? (
                                                        <img
                                                            src={resenaActiva.autor.avatarUrl}
                                                            alt={resenaActiva.autor.nombre}
                                                            className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full object-cover shrink-0"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center text-white text-lg lg:text-sm 2xl:text-base font-bold shrink-0 shadow-md"
                                                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                                        >
                                                            {obtenerIniciales(resenaActiva.autor.nombre)}
                                                        </div>
                                                    )}
                                                    <div className="max-w-[75%] bg-slate-100 border-2 border-slate-300 rounded-2xl rounded-bl-none shadow-sm p-3 2xl:p-4">
                                                        {typeof resenaActiva.rating === 'number' && (
                                                            <div className="flex gap-0.5 mb-1.5 pb-1.5 border-b-2 border-slate-300">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <Star
                                                                        key={s}
                                                                        className={`w-4 h-4 ${s <= (resenaActiva.rating ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300 fill-slate-300'}`}
                                                                        strokeWidth={0}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className="text-sm 2xl:text-base font-medium text-slate-800 leading-relaxed">
                                                            {resenaActiva.texto}
                                                        </p>
                                                        <div className="flex justify-end mt-1">
                                                            <span className="text-sm font-medium text-slate-600">
                                                                {formatearFecha(resenaActiva.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Burbuja negocio (derecha) — estilo chat */}
                                            {resenaActiva.respuesta && !modoEdicionInline && (
                                                <div className="flex items-end justify-end gap-2">
                                                    <div className="max-w-[65%] bg-blue-100 border-2 border-blue-300 rounded-2xl rounded-br-none shadow-sm p-3 2xl:p-4">
                                                        <p className="text-sm 2xl:text-base font-medium text-slate-700 leading-relaxed">
                                                            {resenaActiva.respuesta.texto}
                                                        </p>
                                                        <div className="flex justify-end mt-1">
                                                            <span className="text-sm font-medium text-blue-600">
                                                                {formatearFecha(resenaActiva.respuesta.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {logoNegocio ? (
                                                        <img
                                                            src={logoNegocio}
                                                            alt={nombreNegocio ?? 'Negocio'}
                                                            className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full object-cover shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg lg:text-sm 2xl:text-base font-bold shrink-0 shadow-md">
                                                            {nombreNegocio?.charAt(0).toUpperCase() ?? 'N'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Form inline (si no hay respuesta O está editando) */}
                                            {(!resenaActiva.respuesta || modoEdicionInline) && (
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                                        <span className="text-sm font-semibold text-slate-600 shrink-0">
                                                            Respuestas rápidas:
                                                        </span>
                                                        {TEMPLATES_RESPUESTA.map((t) => (
                                                            <button
                                                                key={t.label}
                                                                type="button"
                                                                onClick={() => setTextoResponderInline(t.texto)}
                                                                disabled={respondiendo}
                                                                className="px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                {t.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="relative">
                                                        <textarea
                                                            id="respuesta-inline"
                                                            name="respuestaInline"
                                                            value={textoResponderInline}
                                                            onChange={(e) => setTextoResponderInline(e.target.value.slice(0, MAX_CARACTERES_RESPUESTA))}
                                                            placeholder="Escribe tu respuesta..."
                                                            rows={5}
                                                            disabled={respondiendo}
                                                            className="w-full px-3 py-2 pr-10 border-2 border-slate-300 rounded-lg text-base font-medium text-slate-800 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:opacity-50"
                                                            data-testid="textarea-respuesta-inline"
                                                        />
                                                        {(modoEdicionInline || textoResponderInline.length > 0) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTextoResponderInline('');
                                                                    if (modoEdicionInline) setModoEdicionInline(false);
                                                                }}
                                                                disabled={respondiendo}
                                                                aria-label="Cancelar"
                                                                title="Cancelar"
                                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                                                                data-testid="btn-cancelar-respuesta-inline"
                                                            >
                                                                <X className="w-4 h-4" strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-start mt-1">
                                                        <span className={`text-sm font-medium ${textoResponderInline.length >= MAX_CARACTERES_RESPUESTA ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                                                            {textoResponderInline.length}/{MAX_CARACTERES_RESPUESTA}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* FAB flotante — siempre visible, actúa como OK/Aceptar */}
                                    {(() => {
                                        const modoVer = !!resenaActiva.respuesta && !modoEdicionInline;
                                        const modoActualizar = !!resenaActiva.respuesta && modoEdicionInline;
                                        const textoLimpio = textoResponderInline.trim();
                                        const sinCambios = !textoLimpio ||
                                            (modoActualizar && textoLimpio === resenaActiva.respuesta?.texto);
                                        const onClickFab = () => {
                                            if (respondiendo) return;
                                            if (modoVer) { iniciarEdicionInline(); return; }
                                            // Modo crear o actualizar
                                            if (sinCambios) {
                                                // Sin texto nuevo → cerrar edición (si aplicable) o no hacer nada
                                                if (modoActualizar) {
                                                    setModoEdicionInline(false);
                                                    setTextoResponderInline('');
                                                }
                                                return;
                                            }
                                            enviarRespuestaInline();
                                        };
                                        const ariaLabel = modoVer
                                            ? 'Editar respuesta'
                                            : sinCambios
                                                ? 'Aceptar'
                                                : modoActualizar
                                                    ? 'Actualizar respuesta'
                                                    : 'Enviar respuesta';
                                        return (
                                            <button
                                                type="button"
                                                onClick={onClickFab}
                                                aria-label={ariaLabel}
                                                className="absolute bottom-4 right-4 z-10 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer active:scale-95 text-white hover:brightness-110 transition-all"
                                                style={{
                                                    background: 'linear-gradient(135deg, #475569, #334155)',
                                                    boxShadow: '0 6px 18px rgba(15,23,42,0.35)',
                                                }}
                                                data-testid="btn-fab-respuesta-inline"
                                            >
                                                {respondiendo
                                                    ? <Spinner tamanio="sm" color="white" />
                                                    : modoVer
                                                        ? <PencilLine className="w-6 h-6" strokeWidth={2.5} />
                                                        : <Check className="w-7 h-7" strokeWidth={3} />
                                                }
                                            </button>
                                        );
                                    })()}
                                </>
                            ) : (
                                /* Empty state */
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <Inbox className="w-16 h-16 text-slate-300 mb-3" />
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Selecciona una reseña</h3>
                                    <p className="text-sm text-slate-600 font-medium">
                                        Elige una reseña de la lista para ver el detalle y responder
                                    </p>
                                </div>
                            )}
                        </main>
                    </div>

                    {/* Móvil: lista compacta estilo sidebar — al click abre modal */}
                    <div className="lg:hidden bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
                        {resenasMostradas.map((resena) => (
                            <button
                                key={resena.id}
                                onClick={() => abrirResponder(resena)}
                                className="w-full text-left p-3 border-b-2 border-slate-300 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors"
                                data-testid={`item-resena-movil-${resena.id}`}
                            >
                                <div className="flex items-center gap-3">
                                    {resena.autor.avatarUrl ? (
                                        <img
                                            src={resena.autor.avatarUrl}
                                            alt={resena.autor.nombre}
                                            className="w-14 h-14 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div
                                            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md"
                                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                        >
                                            {obtenerIniciales(resena.autor.nombre)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-base text-slate-900 truncate">
                                                {resena.autor.nombre}
                                            </h4>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-base font-bold text-slate-900 tabular-nums">
                                                    {resena.rating?.toFixed(1) ?? '—'}
                                                </span>
                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" strokeWidth={0} />
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2 font-medium leading-snug">
                                            {resena.texto || <span className="italic">Sin comentario</span>}
                                        </p>
                                        <div className="flex items-center justify-between gap-2 mt-2">
                                            <span className={`shrink-0 inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full font-bold ${resena.respuesta ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {resena.respuesta ? <><CheckCircle2 className="w-3.5 h-3.5" />Respondida</> : <><Clock className="w-3.5 h-3.5" />Pendiente</>}
                                            </span>
                                            <span className="text-sm text-slate-600 font-medium truncate">
                                                {formatearFechaLarga(resena.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {hayMasResenas && (
                            <div ref={observerRef} className="w-full h-20 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                            </div>
                        )}
                    </div>
                    </>
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