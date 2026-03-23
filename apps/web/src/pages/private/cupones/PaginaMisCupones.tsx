/**
 * PaginaMisCupones.tsx
 * =====================
 * Página "Mis Cupones" — vista cliente.
 * Estructura similar a CardYA con identidad visual emerald/teal.
 *
 * 3 tabs: Activos | Usados | Historial
 *
 * UBICACIÓN: apps/web/src/pages/private/cupones/PaginaMisCupones.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Gift, CheckCircle, Clock } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import { obtenerMisCupones } from '../../../services/misCuponesService';
import type { CuponCliente } from '../../../services/misCuponesService';
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
`;

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaMisCupones() {
    const [tabActivo, setTabActivo] = useState<TabCupones>('activos');
    const [cupones, setCupones] = useState<CuponCliente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [cuponSeleccionado, setCuponSeleccionado] = useState<CuponCliente | null>(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    // Deep link desde notificación
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cuponId = params.get('id');
        if (cuponId) {
            // Abrir modal del cupón específico cuando se carguen
            const buscarYAbrir = () => {
                const cupon = cupones.find(c => c.cuponId === cuponId || c.ofertaId === cuponId);
                if (cupon) {
                    setCuponSeleccionado(cupon);
                    setModalAbierto(true);
                    window.history.replaceState({}, '', window.location.pathname);
                }
            };
            if (!cargando) buscarYAbrir();
        }
    }, [cupones, cargando]);

    // Cargar cupones
    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await obtenerMisCupones();
            if (res.success && Array.isArray(res.data)) {
                setCupones(res.data);
            }
        } catch {
            notificar.error('Error al cargar cupones');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

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
            <div className="flex flex-col min-h-screen bg-slate-50">

                {/* ── Header dark ── */}
                <div
                    className="relative overflow-hidden shrink-0"
                    style={{
                        background: '#000000',
                        backgroundImage: 'radial-gradient(ellipse at 85% 20%, rgba(16,185,129,0.07) 0%, transparent 50%)',
                    }}
                >
                    {/* Grid pattern sutil */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    />

                    <div className="relative px-4 lg:px-6 2xl:px-8 pt-6 lg:pt-5 2xl:pt-6 pb-0">
                        {/* Top: Logo + Título + KPIs */}
                        <div className="flex items-center gap-3 lg:gap-4 2xl:gap-5 mb-4 lg:mb-3 2xl:mb-4">
                            {/* Logo */}
                            <div
                                className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}
                            >
                                <Ticket className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
                            </div>

                            <div className="flex-1">
                                <h1 className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold text-white tracking-tight">Mis Cupones</h1>
                                <p className="text-sm lg:text-xs 2xl:text-sm text-white/50 font-medium">Tus descuentos exclusivos</p>
                            </div>

                            {/* KPIs desktop */}
                            <div className="hidden lg:flex items-center gap-4 2xl:gap-6">
                                <div className="text-right">
                                    <p className="text-2xl lg:text-xl 2xl:text-2xl font-black text-emerald-400">{totalActivos}</p>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/50 font-semibold">Activos</p>
                                </div>
                                <div className="w-px h-8 bg-white/20" />
                                <div className="text-right">
                                    <p className="text-2xl lg:text-xl 2xl:text-2xl font-black text-white/60">{totalUsados}</p>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/50 font-semibold">Usados</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex" data-testid="tabs-cupones">
                            {TABS.map(tab => {
                                const Icono = tab.icono;
                                const esActivo = tabActivo === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        data-testid={`tab-${tab.id}`}
                                        onClick={() => setTabActivo(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 py-3 lg:py-2.5 2xl:py-3 text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer relative ${
                                            esActivo ? 'text-emerald-400' : 'text-white/40 hover:text-white/60'
                                        }`}
                                    >
                                        <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        {tab.label}
                                        {tab.id === 'activos' && totalActivos > 0 && (
                                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 rounded-full">{totalActivos}</span>
                                        )}
                                        {esActivo && (
                                            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-emerald-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 p-4 lg:p-6 2xl:p-8">
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
