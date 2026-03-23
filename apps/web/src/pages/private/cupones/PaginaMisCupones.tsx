/**
 * PaginaMisCupones.tsx
 * =====================
 * Página "Mis Cupones" — vista cliente.
 * Estructura idéntica a CardYA con identidad visual emerald/teal.
 *
 * 3 tabs: Activos | Usados | Historial
 *
 * UBICACIÓN: apps/web/src/pages/private/cupones/PaginaMisCupones.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, Gift, CheckCircle, Clock, ChevronLeft, Menu } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import type { CuponCliente } from '../../../services/misCuponesService';
import { useUiStore } from '../../../stores/useUiStore';
import { useMisCuponesStore } from '../../../stores/useMisCuponesStore';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import CardCupon from './componentes/CardCupon';
import ModalDetalleCupon from './componentes/ModalDetalleCupon';

// =============================================================================
// TIPOS
// =============================================================================

type TabCupones = 'activos' | 'usados' | 'historial';

const TABS: { id: TabCupones; label: string; icono: React.ComponentType<{ className?: string }> }[] = [
    { id: 'activos', label: 'Activos', icono: Gift },
    { id: 'usados', label: 'Usados', icono: CheckCircle },
    { id: 'historial', label: 'Historial', icono: Clock },
];

// =============================================================================
// ESTILOS CSS
// =============================================================================

const ESTILOS = `
  @keyframes cupones-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.3); }
    50% { box-shadow: 0 0 30px rgba(16,185,129,0.5); }
  }
  .cupones-tabs::-webkit-scrollbar { display: none; }
  .cupones-tabs { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaMisCupones() {
    const navigate = useNavigate();
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);
    const headerRef = useRef<HTMLDivElement>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const cupones = useMisCuponesStore((s) => s.cupones);
    const cargando = useMisCuponesStore((s) => s.cargando);
    const cargarCupones = useMisCuponesStore((s) => s.cargarCupones);
    const iniciarListener = useMisCuponesStore((s) => s.iniciarListener);

    const [tabActivo, setTabActivoInterno] = useState<TabCupones>('activos');
    const [cuponSeleccionado, setCuponSeleccionado] = useState<CuponCliente | null>(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    const setTabActivo = (tab: TabCupones) => {
        setTabActivoInterno(tab);
        if (mainScrollRef?.current) {
            mainScrollRef.current.scrollTo({ top: 0 });
        }
    };

    // Carga inicial + listener socket para actualizaciones en tiempo real
    useEffect(() => {
        cargarCupones();
        const detener = iniciarListener();
        return detener;
    }, []);

    // Deep link desde notificación (reacciona a cambios en searchParams)
    useEffect(() => {
        const cuponId = searchParams.get('id');
        if (cuponId && !cargando && cupones.length > 0) {
            const cupon = cupones.find(c => c.cuponId === cuponId || c.ofertaId === cuponId);
            if (cupon) {
                // Cambiar al tab correcto según estado
                if (cupon.estado === 'activo') setTabActivoInterno('activos');
                else if (cupon.estado === 'usado') setTabActivoInterno('usados');
                else setTabActivoInterno('historial');
                setCuponSeleccionado(cupon);
                setModalAbierto(true);
            }
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, cupones, cargando]);

    // Filtrar por tab
    const cuponesFiltrados = cupones.filter(c => {
        if (tabActivo === 'activos') return c.estado === 'activo';
        if (tabActivo === 'usados') return c.estado === 'usado';
        return c.estado === 'expirado' || c.estado === 'revocado';
    });

    // KPIs
    const totalActivos = cupones.filter(c => c.estado === 'activo').length;
    const totalUsados = cupones.filter(c => c.estado === 'usado').length;

    const handleVerDetalle = (cupon: CuponCliente) => {
        setCuponSeleccionado(cupon);
        setModalAbierto(true);
    };

    return (
        <>
            <style>{ESTILOS}</style>
            <div className="min-h-full bg-transparent">

                {/* ── Header sticky — mismo patrón que CardYA ── */}
                <div ref={headerRef} className="sticky top-0 z-20">
                    <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
                        <div
                            className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                            style={{ background: '#000000' }}
                        >
                            {/* Glow sutil emerald */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(16,185,129,0.07) 0%, transparent 50%)' }}
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

                                {/* ══ MOBILE HEADER (< lg) ══ */}
                                <div className="lg:hidden">
                                    <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                data-testid="btn-volver-cupones"
                                                onClick={() => navigate('/inicio')}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                            >
                                                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                                            </button>
                                            <div
                                                className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                            >
                                                <Ticket className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                                            </div>
                                            <span className="text-2xl font-extrabold text-white tracking-tight">
                                                Mis <span className="text-emerald-400">Cupones</span>
                                            </span>
                                        </div>
                                        <button
                                            data-testid="btn-menu-cupones"
                                            onClick={abrirMenuDrawer}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                                        >
                                            <Menu className="w-6 h-6" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    {/* Subtítulo móvil */}
                                    <div className="flex items-center justify-center gap-2.5 pb-2">
                                        <div
                                            className="h-0.5 w-14 rounded-full"
                                            style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.7))' }}
                                        />
                                        <span className="text-base font-light text-white/70 tracking-wide">
                                            Tus <span className="font-bold text-white">descuentos</span> exclusivos
                                        </span>
                                        <div
                                            className="h-0.5 w-14 rounded-full"
                                            style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.7), transparent)' }}
                                        />
                                    </div>
                                </div>

                                {/* ══ DESKTOP HEADER (>= lg) ══ */}
                                <div className="hidden lg:block">
                                    <div className="flex items-center justify-between gap-6 px-6 2xl:px-8 py-4 2xl:py-5">
                                        {/* Logo */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div
                                                className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                            >
                                                <Ticket className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex items-baseline">
                                                <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">
                                                    Mis{' '}
                                                </span>
                                                <span className="text-2xl 2xl:text-3xl font-extrabold text-emerald-400 tracking-tight">
                                                    Cupones
                                                </span>
                                            </div>
                                        </div>

                                        {/* Centro: Subtítulo */}
                                        <div className="flex-1 text-center min-w-0">
                                            <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                                                Tus{' '}
                                                <span className="font-bold text-white">descuentos</span>
                                                {' '}exclusivos
                                            </h1>
                                            <div className="flex items-center justify-center gap-3 mt-1.5">
                                                <div
                                                    className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.7))' }}
                                                />
                                                <span className="text-xs 2xl:text-[13px] font-semibold text-emerald-400/70 uppercase tracking-[3px]">
                                                    cuponera digital
                                                </span>
                                                <div
                                                    className="h-0.5 w-20 2xl:w-24 rounded-full"
                                                    style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.7), transparent)' }}
                                                />
                                            </div>
                                        </div>

                                        {/* KPIs */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl 2xl:text-3xl font-extrabold text-emerald-400 leading-none">
                                                    {totalActivos}
                                                </span>
                                                <span className="text-[10px] 2xl:text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                    Activos
                                                </span>
                                            </div>
                                            <div className="w-1 h-16 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent)' }} />
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl 2xl:text-3xl font-extrabold text-white leading-none">
                                                    {totalUsados}
                                                </span>
                                                <span className="text-[10px] 2xl:text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">
                                                    Usados
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── TABS ── */}
                                <div className="flex items-center">
                                    <div className="cupones-tabs flex lg:flex-none overflow-x-auto flex-1">
                                        {TABS.map(tab => {
                                            const Icono = tab.icono;
                                            const esActivo = tabActivo === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    data-testid={`tab-${tab.id}`}
                                                    onClick={() => setTabActivo(tab.id)}
                                                    className="flex items-center gap-1.5 lg:gap-2.5 px-2 lg:px-7 2xl:px-9 py-2.5 lg:py-3.5 text-sm lg:text-base 2xl:text-[17px] cursor-pointer relative whitespace-nowrap shrink-0"
                                                    style={{
                                                        color: esActivo ? '#10b981' : 'rgba(255,255,255,0.50)',
                                                        fontWeight: esActivo ? 700 : 500,
                                                        background: 'transparent',
                                                    }}
                                                >
                                                    <Icono className="w-4.5 h-4.5 lg:w-5 lg:h-5 2xl:w-[22px] 2xl:h-[22px]" />
                                                    {tab.label}
                                                    {tab.id === 'activos' && totalActivos > 0 && (
                                                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 rounded-full">{totalActivos}</span>
                                                    )}
                                                    {esActivo && (
                                                        <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-4 lg:p-6 2xl:p-8 lg:max-w-7xl lg:mx-auto">
                    {cargando ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner tamanio="lg" />
                        </div>
                    ) : cuponesFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
                                <Ticket className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-lg font-bold text-slate-700">
                                {tabActivo === 'activos' ? 'No tienes cupones activos' : tabActivo === 'usados' ? 'No has usado cupones' : 'Sin historial'}
                            </p>
                            <p className="text-sm text-slate-600 font-medium mt-1">
                                {tabActivo === 'activos' ? 'Cuando un negocio te envíe un cupón, aparecerá aquí' : 'Los cupones expirados y revocados aparecerán aquí'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-3 2xl:gap-4">
                            {cuponesFiltrados.map(cupon => (
                                <CardCupon
                                    key={cupon.cuponId}
                                    cupon={cupon}
                                    onVerDetalle={handleVerDetalle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal detalle */}
            <ModalDetalleCupon
                abierto={modalAbierto}
                onCerrar={() => { setModalAbierto(false); setCuponSeleccionado(null); }}
                cupon={cuponSeleccionado}
            />
        </>
    );
}
