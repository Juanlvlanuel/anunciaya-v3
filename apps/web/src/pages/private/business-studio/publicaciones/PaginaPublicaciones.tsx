/**
 * PaginaPublicaciones.tsx
 * =========================
 * Página del módulo Publicaciones en Business Studio: administración de las
 * publicaciones libres del feed de Negocios (crear, editar, archivar, KPIs).
 *
 * Layout consistente con el resto de BS (calca `PaginaVacantes.tsx`), pero
 * más liviano: el composer de crear/editar YA existe (`ComposerSection` del
 * feed público de Negocios, que soporta `modo='crear'|'editar'`), así que
 * no se construye un slideover propio ni una vista de detalle inline — el
 * texto+fotos+precio de una publicación ya se ve completo en la fila/card.
 *
 * Layout:
 *   - Header con ícono animado + título
 *   - 4 KPIs en CarouselKPI
 *   - Filtros: tabs estado + buscador + botón "Nueva publicación"
 *   - Vista dual: tabla desktop / cards mobile
 *   - `<ComposerSection>` montado al final, lee `?crear=1` / `?editar=<id>`
 *
 * Estado interno (no URL, salvo crear/editar que sí van en query params
 * para que el composer los intercepte): tabActivo, busqueda
 *
 * Servidor: React Query (`useMisPublicacionesNegocioBS`,
 * `useKpisPublicacionesNegocioBS`, `useArchivarPublicacionNegocio`).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/PaginaPublicaciones.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Search, Plus, X } from 'lucide-react';

import { useAuthStore } from '../../../../stores/useAuthStore';
import {
    useMisPublicacionesNegocioBS,
    useKpisPublicacionesNegocioBS,
} from '../../../../hooks/queries/useNegocioPublicacionesBS';
import { useArchivarPublicacionNegocio } from '../../../../hooks/queries/useNegocioPublicaciones';
import { notificar } from '../../../../utils/notificaciones';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { ComposerSection } from '../../../../components/negocios/publicaciones/composer/ComposerSection';

import { KpiCardsPublicaciones } from './componentes/KpiCardsPublicaciones';
import { PublicacionesEmpty } from './componentes/PublicacionesEmpty';
import { TablaPublicaciones } from './componentes/TablaPublicaciones';
import { FilaPublicacionMobile } from './componentes/FilaPublicacionMobile';

import type { PublicacionNegocioBSRow } from '../../../../types/negocioPublicaciones';

// =============================================================================
// ESTILOS — ANIMACIÓN DEL ÍCONO HEADER (estética BS)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes publicaciones-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .publicaciones-icon-bounce {
    animation: publicaciones-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type TabActivo = 'todas' | 'activa' | 'archivada';

const TABS: { id: TabActivo; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'activa', label: 'Activas' },
    { id: 'archivada', label: 'Archivadas' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaPublicaciones() {
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);

    // ---------------------------------------------------------------------------
    // Estado UI local
    // ---------------------------------------------------------------------------
    const [tabActivo, setTabActivo] = useState<TabActivo>('todas');
    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [busqueda, setBusqueda] = useState('');

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
    }, [usuario?.sucursalActiva]);

    // ---------------------------------------------------------------------------
    // Server state — React Query
    // ---------------------------------------------------------------------------
    const kpisQuery = useKpisPublicacionesNegocioBS();
    const kpis = kpisQuery.data ?? null;

    const publicacionesQuery = useMisPublicacionesNegocioBS({
        estado: tabActivo === 'todas' ? undefined : tabActivo,
        busqueda: busqueda || undefined,
        limite: 50,
    });
    const publicaciones = publicacionesQuery.data?.publicaciones ?? [];
    const cargandoPublicaciones = publicacionesQuery.isPending;

    const archivarMutation = useArchivarPublicacionNegocio();

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const abrirCrear = () => navigate('/business-studio/publicaciones?crear=1');

    const abrirEditar = (publicacion: PublicacionNegocioBSRow) =>
        navigate(`/business-studio/publicaciones?editar=${publicacion.id}`);

    const handleArchivar = async (publicacion: PublicacionNegocioBSRow) => {
        const ok = await notificar.confirmar(
            '¿Archivar publicación?',
            'Dejará de mostrarse en el feed público de Negocios. Podrás seguir viéndola aquí en la pestaña "Archivadas".',
        );
        if (!ok) return;
        try {
            await archivarMutation.mutateAsync({ publicacionId: publicacion.id });
            notificar.exito('Publicación archivada');
        } catch {
            notificar.error('No pudimos archivar la publicación.');
        }
    };

    const handleVerEnFeedPublico = (publicacion: PublicacionNegocioBSRow) => {
        window.open(`/p/negocio-post/${publicacion.id}`, '_blank');
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    const sinPublicaciones =
        !cargandoPublicaciones &&
        publicaciones.length === 0 &&
        tabActivo === 'todas' &&
        !busqueda;

    return (
        <div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-publicaciones">
            <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
            <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">
                {/* ═══════════════════════════════════════════════════════════
                    HEADER + KPIs
                    ═══════════════════════════════════════════════════════════ */}
                <div
                    className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4"
                    data-testid="header-publicaciones"
                >
                    <div className="hidden lg:flex items-center gap-3 shrink-0 mb-3 lg:mb-0">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 14,
                                background: 'linear-gradient(135deg, #0ea5e9, #2563eb, #1d4ed8)',
                                boxShadow: '0 6px 20px rgba(14,165,233,0.4)',
                            }}
                        >
                            <Newspaper
                                className="w-6 h-6 text-white publicaciones-icon-bounce"
                                strokeWidth={1.75}
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Publicaciones
                            </h1>
                            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                                Comparte novedades en el feed de Negocios
                            </p>
                        </div>
                    </div>

                    {/* KPIs */}
                    <KpiCardsPublicaciones kpis={kpis} />
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    FILTROS — tabs + buscador + botón
                    ═══════════════════════════════════════════════════════════ */}
                {!sinPublicaciones && (
                    <div
                        className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14"
                        data-testid="filtros-publicaciones"
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
                                                ? { background: 'linear-gradient(135deg, #1e293b, #334155)' }
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
                                    onChange={(ev) => setBusquedaLocal(ev.target.value)}
                                    placeholder="Buscar publicación..."
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
                                    data-testid="input-busqueda-publicaciones"
                                />
                            </div>

                            {/* Botón "Nueva publicación" */}
                            <button
                                type="button"
                                onClick={abrirCrear}
                                className="flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white lg:cursor-pointer shrink-0"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                                data-testid="btn-crear-publicacion"
                            >
                                <Plus className="w-4 h-4" />
                                Nueva publicación
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    SEGMENTED CONTROL MOBILE
                    ═══════════════════════════════════════════════════════════ */}
                {!sinPublicaciones && (
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
                                            ? { background: 'linear-gradient(135deg, #1e293b, #334155)' }
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
                {cargandoPublicaciones ? (
                    <div className="flex justify-center py-20">
                        <Spinner />
                    </div>
                ) : sinPublicaciones ? (
                    <PublicacionesEmpty onPublicar={abrirCrear} />
                ) : publicaciones.length === 0 ? (
                    <div
                        className="bg-white border border-slate-200 rounded-2xl px-5 py-10 text-center"
                        data-testid="publicaciones-sin-resultados"
                    >
                        <p className="text-slate-600 text-base font-semibold">Sin resultados</p>
                        <p className="text-slate-600 text-sm font-medium mt-1">
                            {busqueda
                                ? 'Prueba con otro término de búsqueda'
                                : 'No hay publicaciones con ese filtro'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile: lista "tabla unida" — mismo patrón que Promociones/Empleados */}
                        <div
                            className="lg:hidden mt-3 bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden"
                            data-testid="lista-publicaciones-movil"
                        >
                            <div className="divide-y-[1.5px] divide-slate-300">
                                {publicaciones.map((publicacion) => (
                                    <FilaPublicacionMobile
                                        key={publicacion.id}
                                        publicacion={publicacion}
                                        onEditar={() => abrirEditar(publicacion)}
                                        onArchivar={() => handleArchivar(publicacion)}
                                        onVerEnFeedPublico={() => handleVerEnFeedPublico(publicacion)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Desktop: tabla */}
                        <div className="hidden lg:block mt-3">
                            <TablaPublicaciones
                                publicaciones={publicaciones}
                                onEditar={abrirEditar}
                                onArchivar={handleArchivar}
                                onVerEnFeedPublico={handleVerEnFeedPublico}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                COMPOSER (crear/editar) — montado al final del árbol, lee
                ?crear=1 / ?editar=<id> de la URL actual.
                ═══════════════════════════════════════════════════════════════ */}
            <ComposerSection />
        </div>
    );
}
