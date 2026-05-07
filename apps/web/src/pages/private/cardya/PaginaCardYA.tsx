/**
 * PaginaCardYA.tsx - Página principal de CardYA
 * ================================================================
 * Sistema de lealtad y recompensas. Muestra billeteras, recompensas
 * e historial de transacciones.
 * 
 * Ubicación: apps/web/src/pages/private/cardya/PaginaCardYA.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, Gift, Clock, Ticket, ChevronLeft, Bell } from 'lucide-react';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
// useCardyaStore eliminado — React Query maneja datos del servidor
import {
    useCardYABilleteras,
    useCardYARecompensas,
    useCardYAVouchers,
    useCardYAHistorialCompras,
    useCardYAHistorialCanjes,
    useCanjearRecompensa,
    useCancelarVoucher,
    useCardYASocket,
} from '../../../hooks/queries/useCardYA';
import { useUiStore } from '../../../stores/useUiStore';
import { notificar } from '../../../utils/notificaciones';

// Componentes
import CardBilletera from './componentes/CardBilletera';
import CardRecompensaCliente from './componentes/CardRecompensaCliente';
import TablaHistorialCompras from './componentes/TablaHistorialCompras';
import TablaHistorialVouchers from './componentes/TablaHistorialVouchers';
import ModalDetalleBilletera from './componentes/ModalDetalleBilletera';
import ModalConfirmarCanje from './componentes/ModalConfirmarCanje';
import ModalVoucherGenerado from './componentes/ModalVoucherGenerado';
import ModalDetalleTransaccion from './componentes/ModalDetalleTransaccion';
import ModalDetalleVoucher from './componentes/ModalDetalleVoucher';
import DropdownNegocio from './componentes/DropdownNegocio';
import DropdownFiltroEstado from './componentes/DropdownFiltroEstado';
import ModalDetalleRecompensa from './componentes/ModalDetalleRecompensa';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';

// Tipos
import type {
    BilleteraNegocio,
    DetalleNegocioBilletera,
    RecompensaDisponible,
    Transaccion,
    Voucher,
    TabCardYA,
} from '../../../types/cardya';
import * as cardyaService from '../../../services/cardyaService';

// =============================================================================
// CSS — ocultar scrollbar del carousel de KPIs
// =============================================================================

const ESTILO_CAROUSEL = `
  .cardya-carousel::-webkit-scrollbar { display: none; }
  .cardya-carousel { -ms-overflow-style: none; scrollbar-width: none; }
  .cardya-tabs::-webkit-scrollbar { display: none; }
  .cardya-tabs { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// CONFIGURACIÓN DE TABS
// =============================================================================

const TABS_CONFIG: { id: TabCardYA; label: string; Icono: typeof Wallet }[] = [
    { id: 'billeteras', label: 'Billeteras', Icono: Wallet },
    { id: 'recompensas', label: 'Recompensas', Icono: Gift },
    { id: 'vouchers', label: 'Vouchers', Icono: Ticket },
    { id: 'historial', label: 'Historial', Icono: Clock },
];

// =============================================================================
// (KPIs ahora están inline en el header Card Elegance)
// =============================================================================

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCardYA() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);
    const [tabActiva, setTabActivaInterno] = useState<TabCardYA>('billeteras');
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);

    // Wrapper de setTabActiva que resetea scroll al top
    const setTabActiva = (tab: TabCardYA) => {
        setTabActivaInterno(tab);
        setFiltroEstado('todos');
        if (mainScrollRef?.current) {
            mainScrollRef.current.scrollTo({ top: 0 });
        }
    };

    // Filtro de negocio (compartido entre banner móvil y TablaHistorial)
    const [negocioFiltro, setNegocioFiltro] = useState<string>('todos');

    // Filtro de estado (historial: todos/compra/canje | vouchers: todos/pendiente/usado/cancelado/expirado)
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');

    // Medir altura del header para filtros sticky
    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setHeaderHeight(entry.contentRect.height);
            }
        });
        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    // Estados de modales
    const [billeteraSeleccionada, setBilleteraSeleccionada] = useState<DetalleNegocioBilletera | null>(null);
    const [recompensaACanjear, setRecompensaACanjear] = useState<RecompensaDisponible | null>(null);
    const [recompensaDetalle, setRecompensaDetalle] = useState<RecompensaDisponible | null>(null);
    const [voucherGenerado, setVoucherGenerado] = useState<Voucher | null>(null);
    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<Transaccion | null>(null);
    const [voucherSeleccionado, setVoucherSeleccionado] = useState<Voucher | null>(null);
    const [recompensaDestacadaId, setRecompensaDestacadaId] = useState<string | null>(null);
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number }>({ isOpen: false, images: [], initialIndex: 0 });
    const abrirImagenUnica = (url: string) => setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 });
    const cerrarModalImagenes = () => setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });

    // React Query — datos del servidor
    const { data: billeteras = [] } = useCardYABilleteras();
    const { data: recompensas = [] } = useCardYARecompensas();
    const { data: vouchersHistorial = [] } = useCardYAVouchers();
    const { data: historialCompras = [], isPending: cargandoHistorialCompras } = useCardYAHistorialCompras();
    const { data: historialCanjes = [], isPending: cargandoHistorialCanjes } = useCardYAHistorialCanjes();
    const canjearMutation = useCanjearRecompensa();
    const cancelarMutation = useCancelarVoucher();
    useCardYASocket();

    // Ciudad manejada internamente por useCardYARecompensas (query key incluye ciudad del GPS)

    // KPIs calculados desde datos reales
    const puntosGlobales = billeteras.reduce((sum, b) => sum + b.puntosDisponibles, 0);
    const negociosActivos = billeteras.length;

    // Construir transacciones unificadas para TablaHistorialCompras
    const transacciones: Transaccion[] = historialCompras.map((c) => ({
        id: c.id,
        tipo: 'compra' as const,
        fecha: c.createdAt,
        negocioId: c.negocioId,
        negocioNombre: c.negocioNombre,
        negocioLogo: c.negocioLogo ?? null,
        puntos: c.puntosOtorgados,
        descripcion: c.concepto || 'Compra',
        montoCompra: c.montoCompra,
        sucursalNombre: c.sucursalNombre ?? undefined,
        multiplicador: c.multiplicadorAplicado ?? undefined,
        empleadoNombre: c.empleadoNombre ?? undefined,
        cuponTipo: c.cuponTipo ?? null,
        cuponValor: c.cuponValor ?? null,
        cuponValorTexto: c.cuponValorTexto ?? null,
        cuponTitulo: c.cuponTitulo ?? null,
        descuentoAplicado: c.descuentoAplicado ?? null,
    }));

    const transaccionesCanjes: Transaccion[] = historialCanjes.map((c) => ({
        id: c.id,
        tipo: 'canje' as const,
        fecha: c.usadoAt || c.createdAt,
        negocioId: c.negocioId,
        negocioNombre: c.negocioNombre,
        negocioLogo: c.negocioLogo ?? null,
        puntos: -c.puntosUsados,
        descripcion: `||Canje Voucher:|| ${c.recompensaNombre}`,
        empleadoNombre: c.canjeadoPorNombre ?? undefined,
    }));

    const transaccionesUnificadas: Transaccion[] = [...transacciones, ...transaccionesCanjes];

    // Inyectar CSS para carousel
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = ESTILO_CAROUSEL;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    // Carga manejada por React Query (useQuery con enabled)

    // Lazy loading manejado por React Query (enabled en cada query)

    // Recompensas se recargan automáticamente cuando cambia la ciudad (en query key)

    // Precarga en hover/touch ya no necesaria — React Query cachea automáticamente
    const precargarTab = (_id: TabCardYA) => { /* no-op: React Query maneja caché */ };

    // =========================================================================
    // DEEP LINK: Leer query params desde notificaciones
    // =========================================================================
    // Cuando el usuario llega desde una notificación con ?tab=xxx&id=xxx,
    // se activa el tab correcto y se abre el modal del recurso específico.
    // Después se limpian los params para no repetir al re-renderizar.
    // =========================================================================

    // Deep link: guardar tab e ID pendientes en state
    const [deepLinkTab, setDeepLinkTab] = useState<TabCardYA | null>(() => {
        const tab = searchParams.get('tab') as TabCardYA | null;
        const tabsValidos: TabCardYA[] = ['billeteras', 'recompensas', 'vouchers', 'historial'];
        return tab && tabsValidos.includes(tab) ? tab : null;
    });
    const [deepLinkId, setDeepLinkId] = useState(() => searchParams.get('id') || '');

    // Detectar nuevos deep links (cuando ya estamos en la página)
    useEffect(() => {
        const tab = searchParams.get('tab') as TabCardYA | null;
        const id = searchParams.get('id');
        const tabsValidos: TabCardYA[] = ['billeteras', 'recompensas', 'vouchers', 'historial'];

        if (tab && tabsValidos.includes(tab) && id) {
            // Para recompensas de sellos ya canjeadas: redirigir directo a vouchers
            if (tab === 'recompensas') {
                const recomp = recompensas.find((r) => r.id === id);
                if (recomp?.tipo === 'compras_frecuentes' && !recomp.desbloqueada) {
                    const voucherPendiente = vouchersHistorial.find(
                        (v) => v.recompensaId === id && v.estado === 'pendiente'
                    );
                    if (voucherPendiente) {
                        setDeepLinkTab('vouchers');
                        if (tabActiva !== 'vouchers') setTabActivaInterno('vouchers');
                        setDeepLinkId(voucherPendiente.id);
                        setSearchParams({}, { replace: true });
                        return;
                    }
                }
            }
            setDeepLinkTab(tab);
            if (tab !== tabActiva) setTabActivaInterno(tab);
            setDeepLinkId(id);
        } else if (tab && tabsValidos.includes(tab)) {
            setDeepLinkTab(tab);
            if (tab !== tabActiva) setTabActivaInterno(tab);
        }
        if (tab || id) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    // Procesar deep link: historial
    useEffect(() => {
        if (deepLinkTab !== 'historial' || !deepLinkId || transaccionesUnificadas.length === 0) return;
        const encontrada = transaccionesUnificadas.find((t) => t.id === deepLinkId);
        if (encontrada) {
            setTransaccionSeleccionada(encontrada);
        } else {
            notificar.info('Esta transacción ya no está disponible');
        }
        setDeepLinkId('');
        setDeepLinkTab(null);
    }, [deepLinkTab, deepLinkId, transaccionesUnificadas]);

    // Procesar deep link: vouchers
    useEffect(() => {
        if (deepLinkTab !== 'vouchers' || !deepLinkId || vouchersHistorial.length === 0) return;
        const encontrado = vouchersHistorial.find((v) => v.id === deepLinkId);
        if (encontrado) {
            setVoucherSeleccionado(encontrado);
        } else {
            notificar.info('Este voucher ya no está disponible');
        }
        setDeepLinkId('');
        setDeepLinkTab(null);
    }, [deepLinkTab, deepLinkId, vouchersHistorial]);

    // Procesar deep link: recompensas (abrir modal detalle)
    useEffect(() => {
        if (deepLinkTab !== 'recompensas' || !deepLinkId || recompensas.length === 0) return;
        const encontrada = recompensas.find((r) => r.id === deepLinkId);

        if (encontrada) {
            setRecompensaDetalle(encontrada);
            setRecompensaDestacadaId(deepLinkId);
            setTimeout(() => setRecompensaDestacadaId(null), 3000);
        } else {
            notificar.info('Esta recompensa ya no está disponible');
        }
        setDeepLinkId('');
        setDeepLinkTab(null);
    }, [deepLinkTab, deepLinkId, recompensas]);

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleClickBilletera = async (billetera: BilleteraNegocio) => {
        try {
            const respuesta = await cardyaService.getDetalleNegocio(billetera.negocioId);
            if (respuesta.success && respuesta.data) {
                setBilleteraSeleccionada(respuesta.data);
            }
        } catch (error) {
            console.error('Error cargando detalle:', error);
        }
    };

    const handleCanjearRecompensa = (recompensa: RecompensaDisponible) => {
        setRecompensaACanjear(recompensa);
    };

    const handleConfirmarCanje = async () => {
        if (!recompensaACanjear) return;

        try {
            const respuesta = await canjearMutation.mutateAsync({
                recompensaId: recompensaACanjear.id,
            });
            if (respuesta.data) {
                setVoucherGenerado(respuesta.data);
            }
        } catch {
            // Error ya notificado por la mutación
        }
        setRecompensaACanjear(null);
    };

    // =============================================================================
    // SECCIONES DE CONTENIDO
    // =============================================================================

    const seccionBilleteras = (
        <div>
            {billeteras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-24 h-24 rounded-full bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center ring-8 ring-amber-50 mb-6">
                        <Wallet className="w-12 h-12 lg:w-16 lg:h-16 text-amber-400" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Sin billeteras</h3>
                    <p className="text-base lg:text-lg font-medium text-gray-600 mt-1">No tienes billeteras activas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-4 2xl:gap-5">
                    {billeteras
                        .filter((b) => negocioFiltro === 'todos' || b.negocioNombre === negocioFiltro)
                        .map((billetera) => (
                            <CardBilletera
                                key={billetera.negocioId}
                                billetera={billetera}
                                onClick={handleClickBilletera}
                            />
                        ))}
                </div>
            )}
        </div>
    );

    const recompensasFiltradas = (() => {
        const porNegocio = negocioFiltro === 'todos'
            ? recompensas
            : recompensas.filter((r) => r.negocioNombre === negocioFiltro);

        const porTipo = filtroEstado === 'sellos'
            ? porNegocio.filter((r) => r.tipo === 'compras_frecuentes')
            : filtroEstado === 'puntos'
                ? porNegocio.filter((r) => r.tipo !== 'compras_frecuentes')
                : porNegocio;

        return [...porTipo].sort((a, b) => {
            // Agotadas al final
            if (a.estaAgotada && !b.estaAgotada) return 1;
            if (!a.estaAgotada && b.estaAgotada) return -1;

            const aEsSellos = a.tipo === 'compras_frecuentes';
            const bEsSellos = b.tipo === 'compras_frecuentes';
            const aPuede = aEsSellos ? (a.desbloqueada || false) : a.tienesPuntosSuficientes;
            const bPuede = bEsSellos ? (b.desbloqueada || false) : b.tienesPuntosSuficientes;

            // Canjeables primero
            if (aPuede && !bPuede) return -1;
            if (!aPuede && bPuede) return 1;

            // Por progreso descendente
            const aProgreso = aEsSellos
                ? (a.numeroComprasRequeridas || 0) > 0
                    ? (a.comprasAcumuladas || 0) / (a.numeroComprasRequeridas || 1)
                    : 0
                : (a.puntosRequeridos || 0) > 0
                    ? 1 - ((a.puntosFaltantes || 0) / (a.puntosRequeridos || 1))
                    : 0;
            const bProgreso = bEsSellos
                ? (b.numeroComprasRequeridas || 0) > 0
                    ? (b.comprasAcumuladas || 0) / (b.numeroComprasRequeridas || 1)
                    : 0
                : (b.puntosRequeridos || 0) > 0
                    ? 1 - ((b.puntosFaltantes || 0) / (b.puntosRequeridos || 1))
                    : 0;
            return bProgreso - aProgreso;
        });
    })();

    const seccionRecompensas = (
        <div>
            {recompensasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-24 h-24 rounded-full bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center ring-8 ring-amber-50 mb-6">
                        <Gift className="w-12 h-12 lg:w-16 lg:h-16 text-amber-400" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Sin recompensas</h3>
                    <p className="text-base lg:text-lg font-medium text-gray-600 mt-1">No hay recompensas disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-4 2xl:gap-5">
                    {recompensasFiltradas.map((recompensa) => (
                        <CardRecompensaCliente
                            key={recompensa.id}
                            recompensa={recompensa}
                            destacada={recompensa.id === recompensaDestacadaId}
                            onCanjear={handleCanjearRecompensa}
                            onVerDetalle={setRecompensaDetalle}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const seccionHistorial = (
        <div>
            {(cargandoHistorialCompras || cargandoHistorialCanjes) && historialCompras.length === 0 && historialCanjes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-600 mt-3 font-medium">Cargando historial...</p>
                </div>
            ) : (
                <TablaHistorialCompras
                    transacciones={transaccionesUnificadas}
                    onClickTransaccion={(tx) => {
                        if (tx.tipo === 'canje') {
                            const voucher = vouchersHistorial.find((v) => v.id === tx.id);
                            if (voucher) {
                                setVoucherSeleccionado(voucher);
                            }
                        } else {
                            setTransaccionSeleccionada(tx);
                        }
                    }}
                    stickyTop={headerHeight}
                    negocioFiltro={negocioFiltro}
                    filtroEstado={filtroEstado}
                />
            )}
        </div>
    );

    const seccionVouchers = (
        <div>
            <TablaHistorialVouchers vouchers={vouchersHistorial} onClickVoucher={setVoucherSeleccionado} onClickImagen={abrirImagenUnica} stickyTop={headerHeight} negocioFiltro={negocioFiltro} filtroEstado={filtroEstado} />
        </div>
    );

    return (
        <div className="min-h-full bg-transparent">

            {/* ===================================================================
                HEADER — CardYA Compact (Dark + Amber brand / Blue tabs)
                Sticky: se mantiene fijo al hacer scroll
            =================================================================== */}
            <div ref={headerRef} className="sticky top-0 z-20">
                {/* Móvil: full-width sin márgenes | Desktop: contenido centrado */}
                <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil amber arriba-derecha */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: 'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.07) 0%, transparent 50%)',
                            }}
                        />
                        {/* Grid pattern sutil */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        <div className="relative z-10">

                            {/* ═══════════════════════════════════════════════════
                            MOBILE HEADER (< lg) — Fijo, sin colapso
                        ═══════════════════════════════════════════════════ */}
                            <div className="lg:hidden">
                                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            data-testid="btn-volver-cardya"
                                            onClick={() => navigate('/inicio')}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                        >
                                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                        >
                                            <Wallet className="w-4.5 h-4.5 text-black" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-2xl font-extrabold text-white tracking-tight">
                                            Card<span className="text-amber-400">YA</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0 -mr-1 shrink-0">
                                        <DropdownFiltroEstado
                                            tabActiva={tabActiva}
                                            valor={filtroEstado}
                                            onChange={setFiltroEstado}
                                            compacto
                                        />
                                        <DropdownNegocio
                                            negocios={billeteras.map((b) => b.negocioNombre).sort()}
                                            valor={negocioFiltro}
                                            onChange={setNegocioFiltro}
                                            compacto
                                        />
                                        <button
                                            data-testid="btn-notificaciones-cardya"
                                            onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                                            aria-label="Notificaciones"
                                            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                        >
                                            <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                                            {cantidadNoLeidas > 0 && (
                                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                                    {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            data-testid="btn-menu-cardya"
                                            onClick={abrirMenuDrawer}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                        >
                                            <IconoMenuMorph />
                                        </button>
                                    </div>
                                </div>
                                {/* Subtítulo móvil */}
                                <div className="flex items-center justify-center gap-2.5 pb-2">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))' }}
                                    />
                                    <span className="text-base font-medium text-white/70 tracking-wide">
                                        Tus <span className="font-bold text-white">recompensas</span> y beneficios
                                    </span>
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.7), transparent)' }}
                                    />
                                </div>
                            </div>

                            {/* ═══════════════════════════════════════════════════
                            DESKTOP HEADER (>= lg) — layout original
                        ═══════════════════════════════════════════════════ */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-6 px-6 2xl:px-8 py-4 2xl:py-5">
                                    {/* Logo */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div
                                            className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                        >
                                            <Wallet className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-black" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">
                                                Card
                                            </span>
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-amber-400 tracking-tight">
                                                YA
                                            </span>
                                        </div>
                                    </div>

                                    {/* Centro: Título + subtítulo */}
                                    <div className="flex-1 text-center min-w-0">
                                        <h1 className="text-3xl 2xl:text-[34px] font-medium text-white/70 leading-tight truncate">
                                            Tus{' '}
                                            <span className="font-bold text-white">recompensas</span>
                                            {' '}y beneficios
                                        </h1>
                                        <div className="flex items-center justify-center gap-3 mt-1.5">
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))' }}
                                            />
                                            <span className="text-sm 2xl:text-base font-semibold text-amber-400/70 uppercase tracking-[3px]">
                                                programa de lealtad
                                            </span>
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.7), transparent)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* KPIs */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-amber-400 leading-none">
                                                {puntosGlobales.toLocaleString('es-MX')}
                                            </span>
                                            <span className="text-xs 2xl:text-sm font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                Pts Totales
                                            </span>
                                        </div>
                                        <div className="w-1 h-16 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent)' }} />
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white leading-none">
                                                {negociosActivos}
                                            </span>
                                            <span className="text-xs 2xl:text-sm font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                Negocios
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── TABS estilo CHIPS (alineado a Ofertas/MP/Negocios) ── */}
                            <div className="flex items-center px-3 pb-3 lg:px-0 lg:pb-0">
                                <div
                                    className="cardya-tabs flex items-center gap-2 lg:flex-none overflow-x-auto flex-1 -mx-3 px-3 lg:mx-0 lg:px-6 lg:py-3 2xl:px-8"
                                >
                                    {TABS_CONFIG.map(({ id, label, Icono }) => {
                                        const activo = tabActiva === id;
                                        return (
                                            <button
                                                key={id}
                                                data-testid={`tab-cardya-${id}`}
                                                onClick={() => setTabActiva(id)}
                                                onMouseEnter={() => { if (!activo) precargarTab(id); }}
                                                onTouchStart={() => { if (!activo) precargarTab(id); }}
                                                className={[
                                                    'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap',
                                                    activo
                                                        ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                                                        : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-amber-400/60',
                                                ].join(' ')}
                                            >
                                                <Icono className="w-4 h-4" strokeWidth={2.5} />
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Dropdown desktop — alineado a la derecha en la fila de tabs */}
                                <div className="hidden lg:flex items-center gap-2.5 ml-auto pr-6 2xl:pr-8">
                                    <DropdownFiltroEstado
                                        tabActiva={tabActiva}
                                        valor={filtroEstado}
                                        onChange={setFiltroEstado}
                                    />
                                    <DropdownNegocio
                                        negocios={billeteras.map((b) => b.negocioNombre).sort()}
                                        valor={negocioFiltro}
                                        onChange={setNegocioFiltro}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* =========================================================================
                CONTENIDO
            ========================================================================= */}
            <div className="max-w-7xl mx-auto px-4 lg:px-6 2xl:px-8 py-4 lg:py-6">
                {tabActiva === 'billeteras' && seccionBilleteras}
                {tabActiva === 'recompensas' && seccionRecompensas}
                {tabActiva === 'vouchers' && seccionVouchers}
                {tabActiva === 'historial' && seccionHistorial}
            </div>

            {/* =========================================================================
                MODALES
            ========================================================================= */}

            {/* Modal: Detalle de transacción */}
            <ModalDetalleTransaccion
                abierto={!!transaccionSeleccionada}
                onCerrar={() => setTransaccionSeleccionada(null)}
                transaccion={transaccionSeleccionada}
            />

            {/* Modal: Detalle de billetera */}
            <ModalDetalleBilletera
                abierto={!!billeteraSeleccionada}
                onCerrar={() => setBilleteraSeleccionada(null)}
                billetera={billeteraSeleccionada}
                onVerHistorial={(negocioNombre) => {
                    setNegocioFiltro(negocioNombre);
                    setTabActiva('historial');
                }}
            />

            {/* Modal: Detalle de recompensa */}
            <ModalDetalleRecompensa
                abierto={!!recompensaDetalle}
                onCerrar={() => setRecompensaDetalle(null)}
                recompensa={recompensaDetalle}
                onCanjear={handleCanjearRecompensa}
            />

            {/* Modal: Confirmar canje */}
            <ModalConfirmarCanje
                abierto={!!recompensaACanjear}
                onCerrar={() => setRecompensaACanjear(null)}
                recompensa={recompensaACanjear}
                puntosActuales={puntosGlobales}
                onConfirmar={handleConfirmarCanje}
            />

            {/* Modal: Voucher generado */}
            <ModalVoucherGenerado
                abierto={!!voucherGenerado}
                onCerrar={() => setVoucherGenerado(null)}
                voucher={voucherGenerado}
            />

            {/* Modal: Detalle de voucher (historial) */}
            <ModalDetalleVoucher
                abierto={!!voucherSeleccionado}
                onCerrar={() => setVoucherSeleccionado(null)}
                voucher={voucherSeleccionado}
                onCancelarVoucher={async (v) => {
                    try {
                        await cancelarMutation.mutateAsync(v.id);
                    } catch { /* Error ya notificado */ }
                    setVoucherSeleccionado(null);
                }}
            />

            {/* Modal: Imagen ampliada */}
            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={cerrarModalImagenes}
            />

        </div>
    );
}

export default PaginaCardYA;