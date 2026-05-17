/**
 * PaginaVacantes.tsx
 * ====================
 * Página del módulo Vacantes en Business Studio (Sprint 8).
 *
 * Layout consistente con el resto de BS:
 *   - Header con ícono animado + título
 *   - 4 KPIs en CarouselKPI
 *   - Filtros: tabs estado + buscador + botón "Nueva vacante"
 *   - Vista dual: tabla desktop / cards mobile
 *   - Detalle inline (sin cambio de URL — estado interno)
 *   - Slideover lateral para crear / editar
 *
 * Estado interno (no URL):
 *   - tabActivo, busqueda, vacanteSeleccionada, slideoverAbierto, modoSlideover
 *
 * Servidor: React Query (`useVacantesBS`, `useKpisVacantesBS`, mutations).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/PaginaVacantes.tsx
 */

import { useEffect, useState } from 'react';
import { Briefcase, Search, Plus, X } from 'lucide-react';

import { useAuthStore } from '../../../../stores/useAuthStore';
import {
    useVacantesBS,
    useKpisVacantesBS,
    useCrearVacanteBS,
    useActualizarVacanteBS,
    useCambiarEstadoVacanteBS,
    useCerrarVacanteBS,
    useEliminarVacanteBS,
} from '../../../../hooks/queries/useVacantesBS';
import { usePerfilSucursales } from '../../../../hooks/queries/usePerfil';
import { notificar } from '../../../../utils/notificaciones';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';

import { KpiCardsVacantes } from './componentes/KpiCardsVacantes';
import { VacantesEmpty } from './componentes/VacantesEmpty';
import { TablaVacantes } from './componentes/TablaVacantes';
import { CardVacanteMobile } from './componentes/CardVacanteMobile';
import { VacanteDetalleInline } from './componentes/VacanteDetalleInline';
import {
    SlideoverNuevaVacante,
    type ModoSlideover,
    type SucursalOpcion,
} from './componentes/SlideoverNuevaVacante';

import type {
    Vacante,
    CrearVacanteInput,
    ActualizarVacanteInput,
} from '../../../../types/servicios';

// =============================================================================
// ESTILOS — ANIMACIÓN DEL ÍCONO HEADER (estética BS)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes vacantes-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .vacantes-icon-bounce {
    animation: vacantes-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type TabActivo = 'todas' | 'activa' | 'pausada' | 'cerrada';

const TABS: { id: TabActivo; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'activa', label: 'Activas' },
    { id: 'pausada', label: 'Pausadas' },
    { id: 'cerrada', label: 'Cerradas' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaVacantes() {
    const usuario = useAuthStore((s) => s.usuario);

    // ---------------------------------------------------------------------------
    // Estado UI local (no se persiste en URL — decisión documentada)
    // ---------------------------------------------------------------------------
    const [tabActivo, setTabActivo] = useState<TabActivo>('todas');
    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [vacanteSeleccionada, setVacanteSeleccionada] =
        useState<Vacante | null>(null);
    const [slideoverAbierto, setSlideoverAbierto] = useState(false);
    const [modoSlideover, setModoSlideover] =
        useState<ModoSlideover>('crear');

    // Debounce búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            if (busquedaLocal !== busqueda) {
                setBusqueda(busquedaLocal);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [busquedaLocal, busqueda]);

    // Reset al cambiar de sucursal
    useEffect(() => {
        setBusquedaLocal('');
        setBusqueda('');
        setTabActivo('todas');
        setVacanteSeleccionada(null);
    }, [usuario?.sucursalActiva]);

    // ---------------------------------------------------------------------------
    // Server state — React Query
    // ---------------------------------------------------------------------------
    const kpisQuery = useKpisVacantesBS();
    const kpis = kpisQuery.data ?? null;

    const vacantesQuery = useVacantesBS({
        estado: tabActivo === 'todas' ? undefined : tabActivo,
        busqueda: busqueda || undefined,
        limit: 50,
    });
    const vacantes = vacantesQuery.data?.data ?? [];
    const cargandoVacantes = vacantesQuery.isPending;

    // Sucursales del negocio para el selector del slideover
    const sucursalesQuery = usePerfilSucursales();
    const sucursalesOpciones: SucursalOpcion[] = (
        sucursalesQuery.data ?? []
    ).map((s) => ({
        id: s.id as string,
        nombre: s.nombre as string,
        esPrincipal: !!s.esPrincipal,
    }));

    // ---------------------------------------------------------------------------
    // Mutations
    // ---------------------------------------------------------------------------
    const crearMutation = useCrearVacanteBS();
    const actualizarMutation = useActualizarVacanteBS();
    const cambiarEstadoMutation = useCambiarEstadoVacanteBS();
    const cerrarMutation = useCerrarVacanteBS();
    const eliminarMutation = useEliminarVacanteBS();

    // ---------------------------------------------------------------------------
    // Refrescar la vacante seleccionada cuando llega data nueva
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!vacanteSeleccionada) return;
        const refrescada = vacantes.find((v) => v.id === vacanteSeleccionada.id);
        if (refrescada && refrescada !== vacanteSeleccionada) {
            setVacanteSeleccionada(refrescada);
        }
    }, [vacantes, vacanteSeleccionada]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const abrirCrear = () => {
        setModoSlideover('crear');
        setSlideoverAbierto(true);
    };

    const abrirEditar = (vacante: Vacante) => {
        setModoSlideover({ tipo: 'editar', vacante });
        setSlideoverAbierto(true);
    };

    const cerrarSlideover = () => setSlideoverAbierto(false);

    const handleSubmitCrear = async (input: CrearVacanteInput) => {
        try {
            await crearMutation.mutateAsync(input);
            notificar.exito('Vacante publicada con éxito');
            cerrarSlideover();
        } catch {
            notificar.error('No pudimos publicar la vacante. Intenta de nuevo.');
        }
    };

    const handleSubmitEditar = async (
        id: string,
        cambios: ActualizarVacanteInput,
    ) => {
        try {
            await actualizarMutation.mutateAsync({ id, cambios });
            notificar.exito('Vacante actualizada');
            cerrarSlideover();
        } catch {
            notificar.error('No pudimos guardar los cambios.');
        }
    };

    const handlePausar = async (vacante: Vacante) => {
        const ok = await notificar.confirmar(
            '¿Pausar esta vacante?',
            'Dejará de aparecer en el feed público hasta que la reactives.',
        );
        if (!ok) return;
        try {
            await cambiarEstadoMutation.mutateAsync({
                id: vacante.id,
                estado: 'pausada',
            });
            notificar.exito('Vacante pausada');
        } catch {
            notificar.error('No pudimos pausar la vacante.');
        }
    };

    const handleReactivar = async (vacante: Vacante) => {
        const ok = await notificar.confirmar(
            '¿Reactivar esta vacante?',
            'Volverá a aparecer en el feed público de Servicios.',
        );
        if (!ok) return;
        try {
            await cambiarEstadoMutation.mutateAsync({
                id: vacante.id,
                estado: 'activa',
            });
            notificar.exito('Vacante reactivada');
        } catch {
            notificar.error('No pudimos reactivar la vacante.');
        }
    };

    const handleCerrar = async (vacante: Vacante) => {
        const ok = await notificar.confirmar(
            '¿Cerrar vacante?',
            'Esta acción es definitiva. La vacante queda archivada y ya no recibirá candidatos.',
        );
        if (!ok) return;
        try {
            await cerrarMutation.mutateAsync(vacante.id);
            notificar.exito('Vacante cerrada');
            // Si estamos viendo el detalle de la cerrada, refrescamos al estado nuevo
        } catch {
            notificar.error('No pudimos cerrar la vacante.');
        }
    };

    const handleEliminar = async (vacante: Vacante) => {
        const ok = await notificar.confirmar(
            '¿Eliminar definitivamente?',
            'No podrás recuperarla. Si solo quieres ocultarla del feed, mejor pausa o cierra la vacante.',
        );
        if (!ok) return;
        try {
            await eliminarMutation.mutateAsync(vacante.id);
            notificar.exito('Vacante eliminada');
            if (vacanteSeleccionada?.id === vacante.id) {
                setVacanteSeleccionada(null);
            }
        } catch {
            notificar.error('No pudimos eliminar la vacante.');
        }
    };

    const handleVerEnFeedPublico = (vacante: Vacante) => {
        window.open(`/servicios/${vacante.id}`, '_blank');
    };

    const handleIrAConversaciones = (_vacante: Vacante) => {
        // TODO: integrar con ChatYA filtrando por contexto de vacante.
        // Por ahora avisamos al usuario que aún no está conectado.
        notificar.info(
            'Próximamente podrás ver todos los chats de esta vacante desde aquí.',
        );
    };

    // ---------------------------------------------------------------------------
    // Render — detalle inline
    // ---------------------------------------------------------------------------
    if (vacanteSeleccionada) {
        return (
            <div
                className="p-3 lg:p-1.5 2xl:p-3"
                data-testid="pagina-vacantes"
            >
                <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto">
                    <VacanteDetalleInline
                        vacante={vacanteSeleccionada}
                        onVolver={() => setVacanteSeleccionada(null)}
                        onEditar={() => abrirEditar(vacanteSeleccionada)}
                        onPausar={() => handlePausar(vacanteSeleccionada)}
                        onReactivar={() => handleReactivar(vacanteSeleccionada)}
                        onCerrar={() => handleCerrar(vacanteSeleccionada)}
                        onEliminar={() => handleEliminar(vacanteSeleccionada)}
                        onIrAConversaciones={() =>
                            handleIrAConversaciones(vacanteSeleccionada)
                        }
                        onVerEnFeedPublico={() =>
                            handleVerEnFeedPublico(vacanteSeleccionada)
                        }
                    />
                </div>
                <SlideoverNuevaVacante
                    abierto={slideoverAbierto}
                    modo={modoSlideover}
                    sucursales={sucursalesOpciones}
                    enviando={
                        crearMutation.isPending || actualizarMutation.isPending
                    }
                    onClose={cerrarSlideover}
                    onSubmitCrear={handleSubmitCrear}
                    onSubmitEditar={handleSubmitEditar}
                />
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render — lista / empty
    // ---------------------------------------------------------------------------
    const sinVacantes =
        !cargandoVacantes &&
        vacantes.length === 0 &&
        tabActivo === 'todas' &&
        !busqueda;

    return (
        <div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-vacantes">
            <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">
                {/* ═══════════════════════════════════════════════════════════
                    HEADER + KPIs
                    ═══════════════════════════════════════════════════════════ */}
                <div
                    className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4"
                    data-testid="header-vacantes"
                >
                    {/* Ícono + Título (hidden móvil) */}
                    <div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 14,
                                background:
                                    'linear-gradient(135deg, #0ea5e9, #2563eb, #1d4ed8)',
                                boxShadow: '0 6px 20px rgba(14,165,233,0.4)',
                            }}
                        >
                            <Briefcase
                                className="w-6 h-6 text-white vacantes-icon-bounce"
                                strokeWidth={1.75}
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Vacantes
                            </h1>
                            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                                Publica y gestiona tus ofertas de empleo
                            </p>
                        </div>
                    </div>

                    {/* KPIs */}
                    <KpiCardsVacantes kpis={kpis} />
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    FILTROS — tabs + buscador + botón
                    ═══════════════════════════════════════════════════════════ */}
                {!sinVacantes && (
                    <div
                        className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14"
                        data-testid="filtros-vacantes"
                    >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
                            {/* Chips estado (desktop) */}
                            <div className="hidden lg:flex items-center gap-1.5">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setTabActivo(tab.id)}
                                        className={`px-3 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 lg:cursor-pointer ${
                                            tabActivo === tab.id
                                                ? 'text-white border-slate-700 shadow-sm'
                                                : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                                        }`}
                                        style={
                                            tabActivo === tab.id
                                                ? {
                                                        background:
                                                            'linear-gradient(135deg, #1e293b, #334155)',
                                                  }
                                                : undefined
                                        }
                                        data-testid={`tab-${tab.id}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Búsqueda */}
                            <div className="flex-1">
                                <Input
                                    value={busquedaLocal}
                                    onChange={(ev) =>
                                        setBusquedaLocal(ev.target.value)
                                    }
                                    placeholder="Buscar vacante..."
                                    className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
                                    icono={<Search className="w-4 h-4 text-slate-600" />}
                                    elementoDerecha={
                                        busquedaLocal ? (
                                            <button
                                                type="button"
                                                onClick={() => setBusquedaLocal('')}
                                                className="p-1 rounded-full text-red-600 hover:bg-red-100 lg:cursor-pointer"
                                                aria-label="Limpiar búsqueda"
                                            >
                                                <X className="w-[18px] h-[18px]" />
                                            </button>
                                        ) : undefined
                                    }
                                    data-testid="input-busqueda-vacantes"
                                />
                            </div>

                            {/* Botón "Nueva vacante" */}
                            <button
                                type="button"
                                onClick={abrirCrear}
                                className="flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white lg:cursor-pointer shrink-0"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #1e293b, #334155)',
                                }}
                                data-testid="btn-crear-vacante"
                            >
                                <Plus className="w-4 h-4" />
                                Nueva vacante
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    SEGMENTED CONTROL MOBILE
                    ═══════════════════════════════════════════════════════════ */}
                {!sinVacantes && (
                    <div className="lg:hidden flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 mt-3">
                        {TABS.map((tab) => {
                            const activo = tabActivo === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setTabActivo(tab.id)}
                                    className={`flex-1 flex items-center justify-center h-10 rounded-lg text-sm font-semibold ${
                                        activo ? 'text-white shadow-md' : 'text-slate-700'
                                    }`}
                                    style={
                                        activo
                                            ? {
                                                    background:
                                                        'linear-gradient(135deg, #1e293b, #334155)',
                                              }
                                            : undefined
                                    }
                                    data-testid={`tab-mobile-${tab.id}`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    CONTENIDO
                    ═══════════════════════════════════════════════════════════ */}
                {cargandoVacantes ? (
                    <div className="flex justify-center py-20">
                        <Spinner />
                    </div>
                ) : sinVacantes ? (
                    <VacantesEmpty onPublicar={abrirCrear} />
                ) : vacantes.length === 0 ? (
                    <div
                        className="bg-white border border-slate-200 rounded-2xl px-5 py-10 text-center"
                        data-testid="vacantes-sin-resultados"
                    >
                        <p className="text-slate-600 text-base font-semibold">
                            Sin resultados
                        </p>
                        <p className="text-slate-600 text-sm font-medium mt-1">
                            {busqueda
                                ? 'Prueba con otro término de búsqueda'
                                : 'No hay vacantes con ese filtro'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile: lista de cards */}
                        <div className="lg:hidden mt-3">
                            {vacantes.map((vacante) => (
                                <CardVacanteMobile
                                    key={vacante.id}
                                    vacante={vacante}
                                    onClick={() => setVacanteSeleccionada(vacante)}
                                />
                            ))}
                        </div>

                        {/* Desktop: tabla */}
                        <div className="hidden lg:block mt-3">
                            <TablaVacantes
                                vacantes={vacantes}
                                onVer={(v) => setVacanteSeleccionada(v)}
                                onEditar={abrirEditar}
                                onPausar={handlePausar}
                                onReactivar={handleReactivar}
                                onEliminar={handleEliminar}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SLIDEOVER (montado al final del árbol)
                ═══════════════════════════════════════════════════════════════ */}
            <SlideoverNuevaVacante
                abierto={slideoverAbierto}
                modo={modoSlideover}
                sucursales={sucursalesOpciones}
                enviando={
                    crearMutation.isPending || actualizarMutation.isPending
                }
                onClose={cerrarSlideover}
                onSubmitCrear={handleSubmitCrear}
                onSubmitEditar={handleSubmitEditar}
            />
        </div>
    );
}
