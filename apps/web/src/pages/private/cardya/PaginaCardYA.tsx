/**
 * PaginaCardYA.tsx - Página principal de CardYA
 * ================================================================
 * Sistema de lealtad y recompensas. Muestra billeteras, recompensas
 * e historial de transacciones.
 * 
 * Ubicación: apps/web/src/pages/private/cardya/PaginaCardYA.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { Wallet, Gift, Clock, Ticket } from 'lucide-react';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { useCardyaStore } from '../../../stores/useCardyaStore';

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
    const [tabActiva, setTabActivaInterno] = useState<TabCardYA>('billeteras');
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);

    // Wrapper de setTabActiva que resetea scroll al top
    const setTabActiva = (tab: TabCardYA) => {
        setTabActivaInterno(tab);
        if (mainScrollRef?.current) {
            mainScrollRef.current.scrollTo({ top: 0 });
        }
    };

    // Filtro de negocio (compartido entre banner móvil y TablaHistorial)
    const [negocioFiltro, setNegocioFiltro] = useState<string>('todos');

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
    const [voucherGenerado, setVoucherGenerado] = useState<Voucher | null>(null);
    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<Transaccion | null>(null);
    const [voucherSeleccionado, setVoucherSeleccionado] = useState<Voucher | null>(null);

    // Datos del store
    const {
        billeteras,
        recompensas,
        vouchers: vouchersHistorial,
        historialCompras,
        cargarTodo,
        cargarHistorialCompras,
        cargarVouchers,
        canjearRecompensa,
        cancelarVoucher,
    } = useCardyaStore();

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
        descripcion: `Compra por $${c.montoCompra.toFixed(2)}`,
        montoCompra: c.montoCompra,
        sucursalNombre: c.sucursalNombre ?? undefined,
        multiplicador: c.multiplicadorAplicado ?? undefined,
        empleadoNombre: c.empleadoNombre ?? undefined,
    }));

    // Inyectar CSS para carousel
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = ESTILO_CAROUSEL;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    // Carga inicial
    useEffect(() => {
        cargarTodo();
    }, []);

    // Lazy loading: cargar datos al cambiar de tab
    useEffect(() => {
        if (tabActiva === 'historial' && historialCompras.length === 0) {
            cargarHistorialCompras();
        }
        if (tabActiva === 'vouchers' && vouchersHistorial.length === 0) {
            cargarVouchers();
        }
    }, [tabActiva]);

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

        const resultado = await canjearRecompensa({
            recompensaId: recompensaACanjear.id,
        });

        if (resultado) {
            setVoucherGenerado(resultado);
        }
        setRecompensaACanjear(null);
    };

    // =============================================================================
    // SECCIONES DE CONTENIDO
    // =============================================================================

    const seccionBilleteras = (
        <div>
            {billeteras.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
                    <Wallet className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 mb-2">Sin billeteras</h3>
                    <p className="text-sm text-slate-400">No tienes billeteras activas</p>
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

    const seccionRecompensas = (
        <div>
            {recompensas.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
                    <Gift className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 mb-2">Sin recompensas</h3>
                    <p className="text-sm text-slate-400">No hay recompensas disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-4 2xl:gap-5">
                    {recompensas
                        .filter((r) => negocioFiltro === 'todos' || r.negocioNombre === negocioFiltro)
                        .map((recompensa) => (
                            <CardRecompensaCliente
                                key={recompensa.id}
                                recompensa={recompensa}
                                onCanjear={handleCanjearRecompensa}
                            />
                        ))}
                </div>
            )}
        </div>
    );

    const seccionHistorial = (
        <div>
            <TablaHistorialCompras
                transacciones={transacciones}
                onClickTransaccion={setTransaccionSeleccionada}
                stickyTop={headerHeight}
                negocioFiltro={negocioFiltro}
            />
        </div>
    );

    const seccionVouchers = (
        <div>
            <TablaHistorialVouchers vouchers={vouchersHistorial} onClickVoucher={setVoucherSeleccionado} stickyTop={headerHeight} negocioFiltro={negocioFiltro} />
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
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2.5 shrink-0">
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
                                    <div className="shrink-0">
                                        <DropdownNegocio
                                            negocios={billeteras.map((b) => b.negocioNombre).sort()}
                                            valor={negocioFiltro}
                                            onChange={setNegocioFiltro}
                                        />
                                    </div>
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
                                        <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                                            Tus{' '}
                                            <span className="font-bold text-white">recompensas</span>
                                            {' '}y beneficios
                                        </h1>
                                        <div className="flex items-center justify-center gap-3 mt-1.5">
                                            <div
                                                className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))' }}
                                            />
                                            <span className="text-xs 2xl:text-[13px] font-semibold text-amber-400/70 uppercase tracking-[3px]">
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
                                            <span className="text-[10px] 2xl:text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                Pts Totales
                                            </span>
                                        </div>
                                        <div className="w-1 h-16 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent)' }} />
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white leading-none">
                                                {negociosActivos}
                                            </span>
                                            <span className="text-[10px] 2xl:text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                Negocios
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── TABS ── */}
                            <div className="flex items-center">
                                <div
                                    className="cardya-tabs flex lg:flex-none overflow-x-auto flex-1"
                                >
                                    {TABS_CONFIG.map(({ id, label, Icono }) => (
                                        <button
                                            key={id}
                                            onClick={() => setTabActiva(id)}
                                            className="
                                        flex items-center gap-1 lg:gap-2.5 px-2.5 lg:px-7 2xl:px-9 py-2.5 lg:py-3.5
                                        text-[13px] lg:text-base 2xl:text-[17px] cursor-pointer
                                        transition-all duration-200 relative whitespace-nowrap shrink-0
                                    "
                                            style={{
                                                color: tabActiva === id ? '#f59e0b' : 'rgba(255,255,255,0.50)',
                                                fontWeight: tabActiva === id ? 700 : 500,
                                                background: 'transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (tabActiva !== id) {
                                                    e.currentTarget.style.color = 'rgba(245,158,11,0.7)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (tabActiva !== id) {
                                                    e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
                                                }
                                            }}
                                        >
                                            <Icono className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-[22px] 2xl:h-[22px]" strokeWidth={2} />
                                            <span>{label}</span>
                                            {tabActiva === id && (
                                                <div
                                                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-400"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {/* Dropdown desktop — alineado a la derecha en la fila de tabs */}
                                <div className="hidden lg:flex items-center ml-auto pr-6 2xl:pr-8">
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
            <div className={`max-w-7xl mx-auto px-4 lg:px-6 2xl:px-8 lg:py-6 ${tabActiva === 'historial' || tabActiva === 'vouchers' ? 'py-0' : 'py-4'}`}>
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
                    await cancelarVoucher(v.id);
                    setVoucherSeleccionado(null);
                }}
            />

        </div>
    );
}

export default PaginaCardYA;