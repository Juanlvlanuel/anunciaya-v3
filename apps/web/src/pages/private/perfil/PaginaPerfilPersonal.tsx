/**
 * PaginaPerfilPersonal.tsx
 * =========================
 * "Mi Perfil" en Modo Personal (apps/web, FUERA de Business Studio). Contenedor de la cuenta
 * del usuario. Su contenido principal de cara a la beta es la sección **Membresía / Pagos**,
 * desde donde un dueño —incluso suspendido, que baja a modo personal— ve el estado de su
 * membresía comercial, sus recibos, recupera su tarjeta (Customer Portal) y paga de forma
 * manual (transferencia + comprobante). Ver docs/arquitectura/Mi_Perfil.md.
 *
 * El header replica el patrón de las demás secciones (CardYA, Mis Guardados, Mis
 * Publicaciones): sticky de marca con tile en gradiente, título, subtítulo y, en móvil,
 * botones de notificaciones + menú.
 *
 * Ubicación: apps/web/src/pages/private/perfil/PaginaPerfilPersonal.tsx
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { ArrowRightLeft, Ban, Banknote, CalendarCheck, CheckCircle, ChevronDown, ChevronLeft, CreditCard, Download, ExternalLink, FileText, IdCard, Landmark, Loader2, Shield, User, XCircle, type LucideIcon } from 'lucide-react';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';
import { useUiStore } from '@/stores/useUiStore';
import { useNotificacionesStore } from '@/stores/useNotificacionesStore';
import { IconoMenuMorph } from '@/components/ui/IconoMenuMorph';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useMiMembresia } from '../../../hooks/queries/useMiMembresia';
import { cambiarAPagoManual, cambiarATarjeta, crearSesionPortal, obtenerUrlReciboMembresia } from '../../../services/membresiaService';
import type { EstadoMembresia, ReciboMembresia, SolicitudRechazada } from '../../../services/membresiaService';
import notificar from '../../../utils/notificaciones';
import SeccionPagoManual from './components/SeccionPagoManual';
import SeccionMiPublicidad from './components/SeccionMiPublicidad';
import TabDatosPersonales from './components/TabDatosPersonales';
import TabSeguridad from './components/TabSeguridad';
import Tooltip from '@/components/ui/Tooltip';

// Campana migrada a Iconify (igual que las demás secciones).
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;

// =============================================================================
// TABS (patrón de chips de CardYA / Mis Guardados)
// =============================================================================

type TabPerfil = 'membresia' | 'datos' | 'seguridad';

const TABS_PERFIL: { id: TabPerfil; label: string; Icono: LucideIcon }[] = [
    { id: 'datos', label: 'Datos Personales', Icono: IdCard },
    { id: 'seguridad', label: 'Seguridad', Icono: Shield },
    { id: 'membresia', label: 'Membresía y Pagos', Icono: CreditCard },
];

// =============================================================================
// HELPERS DE PRESENTACIÓN
// =============================================================================

/** Dark Gradient de Marca (TC-7) — botones de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const ESTADO_INFO: Record<EstadoMembresia, { texto: string; clase: string }> = {
    al_corriente: { texto: 'Al corriente', clase: 'bg-emerald-100 text-emerald-700' },
    en_gracia: { texto: 'Pago pendiente', clase: 'bg-amber-100 text-amber-700' },
    suspendido: { texto: 'Suspendido', clase: 'bg-red-100 text-red-700' },
    cancelado: { texto: 'Cancelado', clase: 'bg-slate-200 text-slate-600' },
};

const CONCEPTO_TEXTO: Record<ReciboMembresia['concepto'], string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    cortesia: 'Cortesía',
    tarjeta: 'Tarjeta',
};

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Formato estándar de tokens (regla 12): "DD Mes AAAA" con mes completo en mayúscula.
function formatearFecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatearMonto(monto: string | null): string {
    if (monto === null) return '—';
    const n = Number(monto);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function formatearFolio(folio: number | null): string {
    if (folio === null) return 'S/F';
    return `#${String(folio).padStart(5, '0')}`;
}

/** Fila "Etiqueta — valor" en una sola línea para la tarjeta de estado. Título con mayor peso. */
function Dato({ label, valor, acento }: { label: string; valor: string; acento?: 'amber' }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="text-sm font-bold text-slate-700">{label}</span>
            <span className={`text-sm font-medium text-right ${acento === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>
                {valor}
            </span>
        </div>
    );
}

// =============================================================================
// PÁGINA
// =============================================================================

export default function PaginaPerfilPersonal() {
    const handleVolver = useVolverAtras('/inicio');
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

    const queryClient = useQueryClient();
    const { data, isPending, isError, refetch } = useMiMembresia();
    const [searchParams] = useSearchParams();
    // Permite aterrizar directo en una pestaña vía ?tab= (p. ej. al volver de Stripe tras pagar/renovar
    // publicidad → ?tab=pagos abre "Membresía y Pagos", donde está "Tu publicidad").
    const [tabActivo, setTabActivo] = useState<TabPerfil>(() => (searchParams.get('tab') === 'pagos' ? 'membresia' : 'datos'));
    const [descargandoId, setDescargandoId] = useState<string | null>(null);
    // Acordeón del historial: id del movimiento (rechazo o pago anulado) cuyo motivo está desplegado;
    // uno a la vez, mantiene la lista limpia.
    const [detalleHistorialId, setDetalleHistorialId] = useState<string | null>(null);

    // Resaltado del historial: al llegar desde una notificación de pago (?movId=), se resalta ese
    // movimiento unos segundos y se hace scroll hacia él. Se limpia solo (no ensucia la vista).
    const [movResaltado, setMovResaltado] = useState<string | null>(null);
    useEffect(() => {
        const movId = searchParams.get('movId');
        if (!movId || isPending) return;
        setMovResaltado(movId);
        const tScroll = setTimeout(() => {
            document
                .querySelector(`[data-testid="recibo-${movId}"], [data-testid="rechazo-${movId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        const tLimpiar = setTimeout(() => setMovResaltado(null), 3500);
        return () => { clearTimeout(tScroll); clearTimeout(tLimpiar); };
    }, [searchParams, isPending]);
    const [abriendoPortal, setAbriendoPortal] = useState(false);
    const [confirmarManual, setConfirmarManual] = useState(false);
    const [confirmarTarjeta, setConfirmarTarjeta] = useState(false);
    const [procesandoCobro, setProcesandoCobro] = useState(false);

    // El tab "Membresía y Pagos" solo aparece si el usuario tiene negocio comercial o
    // publicidad pagada/vigente; un usuario puramente personal no lo ve. Mientras carga
    // (data aún undefined) se oculta hasta confirmarlo.
    const mostrarMembresia = !!data && (data.tieneNegocio || data.publicidad.length > 0);
    // El label del tab cambia según el tipo de cuenta: "Membresía y Pagos" para cuentas
    // comerciales (con negocio); solo "Pagos" para cuentas personales que únicamente anuncian.
    const tabsVisibles = TABS_PERFIL
        .filter((t) => t.id !== 'membresia' || mostrarMembresia)
        .map((t) => (t.id === 'membresia' && !data?.tieneNegocio ? { ...t, label: 'Pagos' } : t));
    const tabActivoEfectivo: TabPerfil = tabActivo === 'membresia' && !mostrarMembresia ? 'datos' : tabActivo;

    async function activarTarjeta() {
        if (procesandoCobro) return;
        setProcesandoCobro(true);
        try {
            const res = await cambiarATarjeta();
            if (res.success && res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                notificar.error(res.message || 'No se pudo activar el cobro con tarjeta');
                setProcesandoCobro(false);
            }
        } catch {
            notificar.error('No se pudo activar el cobro con tarjeta');
            setProcesandoCobro(false);
        }
    }

    async function confirmarCambioManual() {
        if (procesandoCobro) return;
        setProcesandoCobro(true);
        try {
            const res = await cambiarAPagoManual();
            if (res.success) {
                notificar.exito(res.data?.advertencia || 'Cambiaste a pago por transferencia.');
                queryClient.invalidateQueries({ queryKey: queryKeys.membresia.mi() });
                setConfirmarManual(false);
            } else {
                notificar.error(res.message || 'No se pudo cambiar el método de cobro');
            }
        } catch {
            notificar.error('No se pudo cambiar el método de cobro');
        } finally {
            setProcesandoCobro(false);
        }
    }

    async function abrirPortal() {
        if (abriendoPortal) return;
        setAbriendoPortal(true);
        try {
            const res = await crearSesionPortal();
            if (res.success && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                notificar.error(res.message || 'No se pudo abrir el portal de pagos');
                setAbriendoPortal(false);
            }
        } catch {
            notificar.error('No se pudo abrir el portal de pagos');
            setAbriendoPortal(false);
        }
        // Si la redirección tuvo éxito no reseteamos: la página se descarga.
    }

    async function descargarRecibo(recibo: ReciboMembresia) {
        if (descargandoId) return;
        setDescargandoId(recibo.id);
        try {
            const res = await obtenerUrlReciboMembresia(recibo.id);
            if (res.success && res.data?.reciboUrl) {
                window.open(res.data.reciboUrl, '_blank', 'noopener,noreferrer');
            } else {
                notificar.error(res.message || 'No se pudo descargar el recibo');
            }
        } catch {
            notificar.error('No se pudo descargar el recibo');
        } finally {
            setDescargandoId(null);
        }
    }

    return (
        <div className="min-h-full bg-transparent">
            {/* ── Header sticky — patrón CardYA / Mis Guardados / Mis Publicaciones ── */}
            <div className="sticky top-0 z-20">
                <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow azul */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(37,99,235,0.10) 0%, transparent 50%)' }}
                        />
                        {/* Grid pattern */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        <div className="relative z-10">
                            {/* ══ MOBILE HEADER ══ */}
                            <div className="lg:hidden">
                                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            data-testid="btn-volver-perfil"
                                            onClick={handleVolver}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                                        >
                                            <User className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-2xl font-extrabold text-white tracking-tight">
                                            Mi <span className="text-blue-400">Perfil</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0 -mr-1 shrink-0">
                                        <button
                                            data-testid="btn-notificaciones-perfil"
                                            onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                                            aria-label="Notificaciones"
                                            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                                            {cantidadNoLeidas > 0 && (
                                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                                    {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            data-testid="btn-menu-perfil"
                                            onClick={abrirMenuDrawer}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <IconoMenuMorph />
                                        </button>
                                    </div>
                                </div>
                                {/* Subtítulo móvil */}
                                <div className="flex items-center justify-center gap-2.5 pb-3">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.7))' }}
                                    />
                                    <span className="text-base font-light text-white/70 tracking-wide">
                                        Tu <span className="font-bold text-white">cuenta</span> y membresía
                                    </span>
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, rgba(37,99,235,0.7), transparent)' }}
                                    />
                                </div>
                            </div>

                            {/* ══ DESKTOP HEADER ══ */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-6 px-6 2xl:px-8 py-4 2xl:py-5">
                                    {/* Izquierda: flecha + logo + título */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            data-testid="btn-volver-perfil-desktop"
                                            onClick={handleVolver}
                                            aria-label="Volver al inicio"
                                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                                        >
                                            <User className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">Mi&nbsp;</span>
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-blue-400 tracking-tight">Perfil</span>
                                        </div>
                                    </div>

                                    {/* Centro: subtítulo */}
                                    <div className="flex-1 text-center min-w-0">
                                        <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                                            Tu <span className="font-bold text-white">cuenta</span> y membresía
                                        </h1>
                                        <div className="flex items-center justify-center gap-3 mt-1.5">
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.7))' }}
                                            />
                                            <span className="text-sm 2xl:text-base font-semibold text-blue-400/70 uppercase tracking-[3px]">
                                                membresía y pagos
                                            </span>
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, rgba(37,99,235,0.7), transparent)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Derecha: equilibra el bloque izquierdo para centrar el subtítulo */}
                                    <div className="w-[180px] shrink-0" aria-hidden="true" />
                                </div>
                            </div>

                            {/* ── TABS estilo CHIPS (alineado a CardYA / Mis Guardados) ── */}
                            <div className="flex items-center px-3 pb-3 lg:px-0 lg:pb-0">
                                <div className="flex items-center gap-2 lg:flex-none overflow-x-auto flex-1 -mx-3 px-3 lg:mx-0 lg:px-6 lg:py-3 2xl:px-8 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                                    {tabsVisibles.map(({ id, label, Icono }) => {
                                        const activo = tabActivoEfectivo === id;
                                        return (
                                            <button
                                                key={id}
                                                data-testid={`tab-perfil-${id}`}
                                                onClick={() => setTabActivo(id)}
                                                className={[
                                                    'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap',
                                                    activo
                                                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                                                        : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-blue-400/60',
                                                ].join(' ')}
                                            >
                                                <Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Contenido ── */}
            <div className="p-4 lg:p-6 2xl:p-8 lg:max-w-5xl lg:mx-auto">
                {tabActivoEfectivo === 'membresia' && (
                <section data-testid="seccion-membresia">
                    {/* Loading */}
                    {isPending && (
                        <div className="flex items-center justify-center py-12 text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    )}

                    {/* Error */}
                    {isError && (
                        <div className="rounded-xl bg-white border border-slate-300 shadow-sm p-5 text-center">
                            <p className="text-sm font-medium text-slate-600 mb-3">No se pudo cargar tu membresía.</p>
                            <button
                                onClick={() => refetch()}
                                className="text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* Sin negocio: si tiene publicidad muestra sus campañas; si no, el aviso. */}
                    {!isPending && !isError && data && !data.tieneNegocio && (
                        data.publicidad.length > 0 ? (
                            <SeccionMiPublicidad publicidad={data.publicidad} />
                        ) : (
                            <div
                                data-testid="membresia-sin-negocio"
                                className="rounded-xl bg-white border border-slate-300 shadow-sm p-6 text-center"
                            >
                                <p className="text-sm font-medium text-slate-700">No tienes una membresía comercial.</p>
                                <p className="text-sm font-medium text-slate-600 mt-1">
                                    Cuando registres tu negocio, aquí verás el estado de tu membresía y tus recibos.
                                </p>
                            </div>
                        )
                    )}

                    {/* Con negocio — layout de 2 columnas en desktop (estado+acciones / recibos) */}
                    {!isPending && !isError && data?.tieneNegocio && data.negocio && (
                        <div className="lg:grid lg:grid-cols-5 lg:gap-6 space-y-4 lg:space-y-0">
                            {/* ── Columna principal ── */}
                            <div className="lg:col-span-3 space-y-4">
                                {/* Tarjeta de estado */}
                                <div
                                    data-testid="membresia-estado"
                                    className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden"
                                >
                                    {/* Encabezado: logo + negocio + badge */}
                                    <div className="flex items-start justify-between gap-3 p-5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Logo del negocio (fallback: inicial sobre gradiente azul) */}
                                            {data.negocio.logoUrl ? (
                                                <img
                                                    src={data.negocio.logoUrl}
                                                    alt={data.negocio.nombre}
                                                    className="w-12 h-12 rounded-lg object-cover border border-slate-300 shrink-0"
                                                />
                                            ) : (
                                                <div
                                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md"
                                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                                >
                                                    {data.negocio.nombre.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm lg:text-[11px] 2xl:text-sm uppercase tracking-wide text-slate-600 font-semibold mb-0.5">
                                                    Tu membresía
                                                </p>
                                                <p className="text-lg font-bold text-slate-800 truncate">
                                                    {data.negocio.nombre}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            data-testid="membresia-badge-estado"
                                            className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold ${
                                                ESTADO_INFO[data.negocio.estadoMembresia]?.clase ??
                                                ESTADO_INFO.cancelado.clase
                                            }`}
                                        >
                                            {ESTADO_INFO[data.negocio.estadoMembresia]?.texto ??
                                                data.negocio.estadoMembresia}
                                        </span>
                                    </div>

                                    {/* Datos (lista: etiqueta — valor) */}
                                    <div className="px-5 py-3 border-t border-slate-200 divide-y divide-slate-200">
                                        <Dato
                                            label="Método de cobro"
                                            valor={data.negocio.metodoCobro === 'tarjeta' ? 'Tarjeta (automático)' : 'Efectivo, transferencia o depósito'}
                                        />
                                        {data.negocio.estadoMembresia === 'en_gracia' ? (
                                            <Dato
                                                label="Pagar antes de"
                                                valor={formatearFecha(data.negocio.fechaLimiteGracia)}
                                                acento="amber"
                                            />
                                        ) : (
                                            <Dato
                                                label={data.negocio.metodoCobro === 'tarjeta' ? 'Próximo cobro' : 'Vigencia hasta'}
                                                valor={formatearFecha(
                                                    data.negocio.fechaProximoCobro ?? data.negocio.fechaVencimiento,
                                                )}
                                            />
                                        )}
                                        <Dato
                                            label="Cliente desde"
                                            valor={formatearFecha(data.negocio.fechaAlta)}
                                        />
                                    </div>

                                    {/* Acciones de cobro */}
                                    {data.negocio.estadoMembresia !== 'cancelado' && (() => {
                                        const neg = data.negocio!;
                                        const urgente =
                                            neg.estadoMembresia === 'en_gracia' || neg.estadoMembresia === 'suspendido';
                                        const esTarjeta = neg.metodoCobro === 'tarjeta';

                                        // Primaria (dark gradient, full): solo recuperación urgente con tarjeta.
                                        const primaria =
                                            esTarjeta && neg.puedeAbrirPortal && urgente
                                                ? { label: 'Actualizar tarjeta y reintentar pago', onClick: abrirPortal, cargando: abriendoPortal }
                                                : null;

                                        // Secundarias (botones iguales en fila, textos cortos).
                                        type Accion = { key: string; label: string; Icono: LucideIcon; onClick: () => void; cargando?: boolean };
                                        const secundarias: Accion[] = [];
                                        if (esTarjeta) {
                                            if (neg.puedeAbrirPortal && !urgente) {
                                                secundarias.push({ key: 'portal', label: 'Actualizar tarjeta', Icono: CreditCard, onClick: abrirPortal, cargando: abriendoPortal });
                                            }
                                            secundarias.push({ key: 'amanual', label: 'Desactivar cobro automático', Icono: Ban, onClick: () => setConfirmarManual(true) });
                                        } else {
                                            secundarias.push({ key: 'atarjeta', label: 'Activar cobro automático', Icono: CreditCard, onClick: () => setConfirmarTarjeta(true), cargando: procesandoCobro });
                                        }

                                        return (
                                            <div className="px-5 pb-5 space-y-2">
                                                {primaria && (
                                                    <button
                                                        data-testid="btn-portal-pago"
                                                        onClick={primaria.onClick}
                                                        disabled={primaria.cargando}
                                                        style={{ background: GRADIENTE_MARCA }}
                                                        className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer text-white shadow-md disabled:opacity-60 disabled:cursor-default"
                                                    >
                                                        {primaria.cargando ? <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />}
                                                        {primaria.label}
                                                    </button>
                                                )}
                                                <div className="flex flex-col lg:flex-row gap-2">
                                                    {secundarias.map((a) => (
                                                        <button
                                                            key={a.key}
                                                            data-testid={
                                                                a.key === 'amanual' ? 'btn-cambiar-a-manual'
                                                                : a.key === 'atarjeta' ? 'btn-activar-tarjeta'
                                                                : 'btn-portal-pago'
                                                            }
                                                            onClick={a.onClick}
                                                            disabled={a.cargando}
                                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200 disabled:opacity-60 disabled:cursor-default"
                                                        >
                                                            {a.cargando ? <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <a.Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />}
                                                            {a.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Pagar / adelantar por transferencia. Acumula sobre la vigencia; con
                                    tarjeta, el cobro automático retoma después. Disponible salvo cancelado. */}
                                {data.negocio.estadoMembresia !== 'cancelado' && (
                                    <SeccionPagoManual
                                        solicitudPendiente={data.solicitudPendiente}
                                        ultimoRechazo={data.ultimoRechazo}
                                    />
                                )}
                            </div>

                            {/* ── Columna lateral: historial de pagos (recibos + rechazos) ── */}
                            <div className="lg:col-span-2">
                                <div className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                        <FileText className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-500" strokeWidth={2} />
                                        <p className="text-sm font-bold text-slate-800">Historial de pagos</p>
                                    </div>
                                    {(() => {
                                        type ItemHist =
                                            | { kind: 'recibo'; fecha: string | null; recibo: ReciboMembresia }
                                            | { kind: 'rechazo'; fecha: string | null; rechazo: SolicitudRechazada };
                                        const items: ItemHist[] = [
                                            ...data.recibos.map((r) => ({ kind: 'recibo' as const, fecha: r.fechaPago, recibo: r })),
                                            ...data.solicitudesRechazadas.map((s) => ({ kind: 'rechazo' as const, fecha: s.fecha, rechazo: s })),
                                        ].sort((a, b) => new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime());

                                        if (items.length === 0) {
                                            return (
                                                <div className="p-6 text-center text-sm font-medium text-slate-600">
                                                    Aún no tienes pagos.
                                                </div>
                                            );
                                        }
                                        return (
                                            <ul className="divide-y divide-slate-200 max-h-[38rem] overflow-y-auto">
                                                {items.map((it) =>
                                                    it.kind === 'recibo' ? (
                                                        (() => {
                                                            const mostrarDetalle = it.recibo.anulado && !!it.recibo.motivoAnulacion;
                                                            const expandido = detalleHistorialId === it.recibo.id;
                                                            return (
                                                                <li
                                                                    key={`r-${it.recibo.id}`}
                                                                    data-testid={`recibo-${it.recibo.id}`}
                                                                    className={`px-4 py-3 transition-colors ${movResaltado === it.recibo.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-semibold text-slate-800">
                                                                                    {formatearFolio(it.recibo.folio)}
                                                                                </span>
                                                                                {it.recibo.anulado ? (
                                                                                    <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                                                                                        Anulado
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                                                                                        <CheckCircle className="w-3 h-3" strokeWidth={2.5} /> Pagado
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                                                                                {CONCEPTO_TEXTO[it.recibo.concepto] ?? it.recibo.concepto} ·{' '}
                                                                                {formatearFecha(it.recibo.fechaPago)}
                                                                            </p>
                                                                            {mostrarDetalle && (
                                                                                <button
                                                                                    data-testid={`recibo-detalles-${it.recibo.id}`}
                                                                                    onClick={() => setDetalleHistorialId(expandido ? null : it.recibo.id)}
                                                                                    aria-expanded={expandido}
                                                                                    className="inline-flex items-center gap-1 mt-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 lg:hover:text-red-800 cursor-pointer"
                                                                                >
                                                                                    {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                                                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-semibold text-slate-700 shrink-0">
                                                                            {formatearMonto(it.recibo.monto)}
                                                                        </span>
                                                                        <Tooltip text="Descargar recibo" position="top">
                                                                            <button
                                                                                data-testid={`recibo-descargar-${it.recibo.id}`}
                                                                                onClick={() => descargarRecibo(it.recibo)}
                                                                                disabled={descargandoId === it.recibo.id}
                                                                                aria-label="Descargar recibo"
                                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 lg:hover:text-slate-700 lg:hover:bg-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-default shrink-0"
                                                                            >
                                                                                {descargandoId === it.recibo.id ? (
                                                                                    <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />
                                                                                ) : (
                                                                                    <Download className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                                                                                )}
                                                                            </button>
                                                                        </Tooltip>
                                                                    </div>
                                                                    {mostrarDetalle && expandido && (
                                                                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-700 mt-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                                                                            Motivo: {it.recibo.motivoAnulacion}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            );
                                                        })()
                                                    ) : (
                                                        (() => {
                                                            const expandido = detalleHistorialId === it.rechazo.id;
                                                            return (
                                                                <li
                                                                    key={`x-${it.rechazo.id}`}
                                                                    data-testid={`rechazo-${it.rechazo.id}`}
                                                                    className={`px-4 py-3 transition-colors ${movResaltado === it.rechazo.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <span className="inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                                                                                <XCircle className="w-3 h-3" strokeWidth={2.5} /> Rechazado
                                                                            </span>
                                                                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-1">
                                                                                Transferencia · {formatearFecha(it.rechazo.fecha)}
                                                                            </p>
                                                                            {it.rechazo.motivo && (
                                                                                <button
                                                                                    data-testid={`rechazo-detalles-${it.rechazo.id}`}
                                                                                    onClick={() => setDetalleHistorialId(expandido ? null : it.rechazo.id)}
                                                                                    aria-expanded={expandido}
                                                                                    className="inline-flex items-center gap-1 mt-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 lg:hover:text-red-800 cursor-pointer"
                                                                                >
                                                                                    {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                                                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-semibold text-slate-500 line-through shrink-0">
                                                                            {formatearMonto(it.rechazo.monto)}
                                                                        </span>
                                                                        <Tooltip text="Ver comprobante" position="top">
                                                                            <a
                                                                                href={it.rechazo.comprobanteUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                aria-label="Ver comprobante"
                                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 lg:hover:text-slate-700 lg:hover:bg-slate-200 cursor-pointer shrink-0"
                                                                            >
                                                                                <ExternalLink className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                                                                            </a>
                                                                        </Tooltip>
                                                                    </div>
                                                                    {it.rechazo.motivo && expandido && (
                                                                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-700 mt-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                                                                            Motivo: {it.rechazo.motivo}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            );
                                                        })()
                                                    ),
                                                )}
                                            </ul>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Publicidad del usuario, además de su membresía (si compró anuncios) */}
                    {!isPending && !isError && data?.tieneNegocio && data.publicidad.length > 0 && (
                        <div className="mt-6">
                            <SeccionMiPublicidad publicidad={data.publicidad} />
                        </div>
                    )}
                </section>
                )}

                {tabActivoEfectivo === 'datos' && <TabDatosPersonales />}

                {tabActivoEfectivo === 'seguridad' && <TabSeguridad />}
            </div>

            {/* Modal: confirmar cancelación del cobro automático (tarjeta → manual) */}
            <ModalAdaptativo
                abierto={confirmarManual}
                onCerrar={() => !procesandoCobro && setConfirmarManual(false)}
                titulo="Desactivar cobro automático"
                iconoTitulo={<Ban className="w-5 h-5 text-slate-600" strokeWidth={2} />}
                ancho="md"
            >
                <div data-testid="modal-confirmar-manual" className="space-y-4">
                    <p className="text-sm font-medium text-slate-600">
                        Dejarás de pagar con tarjeta automática.
                    </p>

                    {/* Fecha de vigencia destacada */}
                    <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 border border-slate-300 px-3 py-2.5">
                        <CalendarCheck className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0" strokeWidth={2} />
                        <p className="text-sm font-medium text-slate-700">
                            Activa hasta el{' '}
                            <span className="font-bold text-slate-800">
                                {formatearFecha(
                                    data?.negocio?.fechaProximoCobro ?? data?.negocio?.fechaVencimiento ?? null,
                                )}
                            </span>
                        </p>
                    </div>

                    {/* Métodos con los que podrá pagar */}
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Después podrás pagar con:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { Icono: ArrowRightLeft, label: 'Transferencia' },
                                { Icono: Banknote, label: 'Efectivo' },
                                { Icono: Landmark, label: 'Depósito en banco' },
                            ].map(({ Icono, label }) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700"
                                >
                                    <Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" strokeWidth={2} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => setConfirmarManual(false)}
                            disabled={procesandoCobro}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200 disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="btn-confirmar-manual"
                            onClick={confirmarCambioManual}
                            disabled={procesandoCobro}
                            style={{ background: GRADIENTE_MARCA }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer text-white shadow-md disabled:opacity-60 disabled:cursor-default"
                        >
                            {procesandoCobro && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                            Sí, cambiar
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* Modal: activar tarjeta — aclara el "periodo gratis" de Stripe cuando hay vigencia pagada */}
            {data?.negocio && (() => {
                const vencISO = data.negocio.fechaProximoCobro ?? data.negocio.fechaVencimiento;
                const vigenciaFutura = !!vencISO && new Date(vencISO).getTime() > Date.now();
                return (
                    <ModalAdaptativo
                        abierto={confirmarTarjeta}
                        onCerrar={() => !procesandoCobro && setConfirmarTarjeta(false)}
                        titulo="Activar cobro automático"
                        iconoTitulo={<CreditCard className="w-5 h-5 text-slate-600" strokeWidth={2} />}
                        ancho="md"
                    >
                        <div data-testid="modal-confirmar-tarjeta" className="space-y-4">
                            {vigenciaFutura ? (
                                <>
                                    <p className="text-sm font-medium text-slate-600">
                                        Vas a activar el cobro automático con tarjeta.
                                    </p>
                                    <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 border border-slate-300 px-3 py-2.5">
                                        <CalendarCheck className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0" strokeWidth={2} />
                                        <p className="text-sm font-medium text-slate-700">
                                            No se te cobrará hasta el{' '}
                                            <span className="font-bold text-slate-800">{formatearFecha(vencISO)}</span> — ya
                                            tienes esa vigencia pagada.
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">
                                        Stripe puede mostrarlo como “periodo gratis”; es normal: no es un cargo nuevo, solo
                                        guarda tu tarjeta para el próximo cobro.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-slate-600">
                                    Vas a activar el cobro automático con tarjeta. Se realizará el cobro de tu membresía al
                                    confirmar.
                                </p>
                            )}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setConfirmarTarjeta(false)}
                                    disabled={procesandoCobro}
                                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    data-testid="btn-confirmar-tarjeta"
                                    onClick={activarTarjeta}
                                    disabled={procesandoCobro}
                                    style={{ background: GRADIENTE_MARCA }}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer text-white shadow-md disabled:opacity-60 disabled:cursor-default"
                                >
                                    {procesandoCobro && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </ModalAdaptativo>
                );
            })()}
        </div>
    );
}
