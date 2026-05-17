/**
 * PaginaServicios.tsx
 * =====================
 * Feed visual de la sección Servicios — punto de entrada de la sección.
 *
 * Estructura (idéntica al patrón de PaginaMarketplace / PaginaOfertas / PaginaNegocios):
 *  - Wrapper `min-h-full bg-transparent` (hereda gradiente azul del MainLayout).
 *  - `<ServiciosHeader>` sticky con `max-w-7xl` y `rounded-b-3xl` en desktop.
 *    Contiene back + logo + título + toggle Ofrezco/Solicito + KPI.
 *  - Contenido en contenedor `lg:max-w-7xl` también.
 *  - Carrusel "Recién publicado" con snap horizontal.
 *  - Grid "Cerca de ti" (2 cols móvil / 3 cols lg / 4 cols 2xl).
 *  - FAB "+ Publicar".
 *
 * Estados:
 *  - Sin GPS o sin ciudad → mensaje accionable invitando a activar ubicación.
 *  - Loading → spinner centrado.
 *  - Error → bloque informativo.
 *  - Vacío → mensaje amistoso + CTA Publicar.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 * Handoff de diseño: design_handoff_servicios/screens/FeedScreen.tsx.
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaServicios.tsx
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    CornerRightDown,
    MapPin,
    Plus,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useServiciosFeed } from '../../../hooks/queries/useServicios';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import { OfreceToggle } from '../../../components/servicios/OfreceToggle';
import {
    chipAFiltroFeed,
    type FiltroChip,
} from '../../../components/servicios/ChipsFiltros';
import { CardServicio } from '../../../components/servicios/CardServicio';
import { CardVacante } from '../../../components/servicios/CardVacante';
import { CardHorizontal } from '../../../components/servicios/CardHorizontal';
import { FABPublicar } from '../../../components/servicios/FABPublicar';
import { ClasificadosWidget } from '../../../components/servicios/ClasificadosWidget';
import { Spinner } from '../../../components/ui/Spinner';
import type {
    PublicacionServicio,
    ModoServicio,
    FiltroClasificado,
} from '../../../types/servicios';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaServicios() {
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/inicio');

    // ─── Stores ────────────────────────────────────────────────────────────
    // CRÍTICO: la ciudad se lee del mismo store que usa el Navbar global
    // (`useGpsStore.ciudad.nombre`) para mantener consistencia con MarketPlace
    // y Ofertas. No usar `useAuthStore.usuario.ciudad`.
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const latitud = useGpsStore((s) => s.latitud);
    const longitud = useGpsStore((s) => s.longitud);
    const obtenerUbicacion = useGpsStore((s) => s.obtenerUbicacion);
    const cargandoGps = useGpsStore((s) => s.cargando);

    // Modo activo del usuario. En modo Comercial NO se muestra el FAB de
    // publicar — el comerciante publica desde Business Studio (BS Vacantes).
    // El feed/detalle/perfil del prestador SÍ son visibles en ambos modos.
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const esModoPersonal = modoActivo !== 'comercial';

    // Breakpoint para el widget Clasificados (1 col mobile / 2 cols desktop).
    const { esEscritorio } = useBreakpoint();

    // ─── Estado local ─────────────────────────────────────────────────────
    // `modo`   → filtro de modo (Ofrecen/Solicitan). `null` = "Todos" activo.
    // `filtro` → chip de filtro activo en el header (Todos/Presencial/...).
    //
    // Selección única coordinada: solo UN chip puede estar activo a la vez en
    // el carrusel móvil. Si seleccionas modo, filtro vuelve a 'todos'. Si
    // seleccionas un filtro de modalidad/tipo, modo vuelve a `null`.
    const [modo, setModo] = useState<ModoServicio | null>(null);
    const [filtro, setFiltro] = useState<FiltroChip>('todos');

    // Filtro del tag strip del widget Clasificados (tab interno del widget).
    // No se coordina con `modo`/`filtro` — opera dentro del bloque solicito.
    const [filtroClasificado, setFiltroClasificado] =
        useState<FiltroClasificado>('todos');

    const handleSetModo = (m: ModoServicio | null) => {
        setModo(m);
        setFiltro('todos');
    };
    const handleSetFiltro = (f: FiltroChip) => {
        setFiltro(f);
        setModo(null);
    };

    // Los chips secundarios se traducen a {tipo, modalidad} para el backend
    // cuando hay equivalente directo; los que aún no llegan al backend
    // (distancia/precio) se aplican client-side a nivel visual.
    const { tipo: tipoFiltrado, modalidad: modalidadFiltrada } = useMemo(
        () => chipAFiltroFeed(filtro),
        [filtro]
    );

    // ─── React Query — feed inicial ────────────────────────────────────────
    const { data, isLoading, isError, refetch } = useServiciosFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
        modo,
    });

    const recientesRaw = data?.recientes ?? [];
    const cercanosRaw = data?.cercanos ?? [];

    // Filtrado client-side de los chips secundarios (Sprint 2). El filtrado
    // profundo se moverá al backend en el Sprint 6 con el buscador potenciado.
    //
    // Los `tipo='solicito'` NO se muestran ni en "Recién publicado" ni en
    // "Cerca de ti" — viven aparte en `ClasificadosWidget` con estética
    // formal (card unificada + tag strip). Decisión UX 2026-05-16.
    const recientes = useMemo(() => {
        return recientesRaw.filter((p) => {
            if (p.tipo === 'solicito') return false;
            if (tipoFiltrado && p.tipo !== tipoFiltrado) return false;
            if (modalidadFiltrada && p.modalidad !== modalidadFiltrada) return false;
            return true;
        });
    }, [recientesRaw, tipoFiltrado, modalidadFiltrada]);

    const cercanos = useMemo(() => {
        return cercanosRaw.filter((p) => {
            if (p.tipo === 'solicito') return false;
            if (tipoFiltrado && p.tipo !== tipoFiltrado) return false;
            if (modalidadFiltrada && p.modalidad !== modalidadFiltrada) return false;
            return true;
        });
    }, [cercanosRaw, tipoFiltrado, modalidadFiltrada]);

    /** Solicitudes para la sección "Clasificados" al final del feed. Salen
     *  tanto de `recientes` como de `cercanos` (con dedupe por id) y respetan
     *  el filtro de modalidad cuando aplique.
     *
     *  Si el usuario seleccionó un chip de tipo concreto ("Servicio" o
     *  "Empleo"), los clasificados se ocultan: esos chips apuntan a tipos
     *  distintos a `solicito` y el usuario está buscando algo específico. */
    const clasificados = useMemo(() => {
        if (tipoFiltrado) return [];
        const mapa = new Map<string, typeof recientesRaw[number]>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (p.tipo !== 'solicito') continue;
            if (modalidadFiltrada && p.modalidad !== modalidadFiltrada) continue;
            // Filtro del tag strip del widget. 'todos' = sin filtro; 'urgente'
            // = solo urgentes; cualquier categoría = match exacto.
            if (filtroClasificado === 'urgente' && !p.urgente) continue;
            if (
                filtroClasificado !== 'todos' &&
                filtroClasificado !== 'urgente' &&
                p.categoria !== filtroClasificado
            )
                continue;
            mapa.set(p.id, p);
        }
        // Urgentes primero, luego por fecha de creación descendente.
        return Array.from(mapa.values()).sort((a, b) => {
            if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [recientesRaw, cercanosRaw, modalidadFiltrada, tipoFiltrado, filtroClasificado]);

    /** KPI "N pedidos hoy" del widget — cuenta TODOS los `solicito` únicos del
     *  feed sin aplicar el filtro del tag strip (el strip filtra la lista que se
     *  muestra, pero el KPI es agregado). */
    const totalClasificadosHoy = useMemo(() => {
        const ids = new Set<string>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (p.tipo === 'solicito') ids.add(p.id);
        }
        return ids.size;
    }, [recientesRaw, cercanosRaw]);

    /** KPI "N PUBLICACIONES" del header — dedupe por ID porque las mismas
     *  publicaciones pueden aparecer en recientes Y cercanos. */
    const totalPublicaciones = useMemo(() => {
        if (!data) return null;
        const ids = new Set<string>([
            ...recientes.map((p) => p.id),
            ...cercanos.map((p) => p.id),
        ]);
        return ids.size;
    }, [data, recientes, cercanos]);

    /** Navega al wizard. El FAB tiene speed-dial con 2 opciones que pre-rellenan
     *  el `modo`; el FeedVacio mantiene un solo botón sin modo (el wizard
     *  pregunta en su Paso 1). */
    const irAPublicar = () => navigate('/servicios/publicar');
    const irAPublicarOfrezco = () =>
        navigate('/servicios/publicar?modo=ofrezco');
    const irAPublicarSolicito = () =>
        navigate('/servicios/publicar?modo=solicito');

    // ─── Estado: sin GPS ──────────────────────────────────────────────────
    if (!ciudad || latitud === null || longitud === null) {
        return (
            <div className="min-h-full bg-transparent">
                <ServiciosHeader
                    onBack={handleVolver}
                    ciudad={ciudad}
                    totalPublicaciones={null}
                    filtroActivo={filtro}
                    onFiltroChange={handleSetFiltro}
                    modo={modo}
                    onModoChange={handleSetModo}
                />
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-20 h-20 rounded-full bg-sky-50 grid place-items-center mb-4">
                            <MapPin
                                className="w-7 h-7 text-sky-600"
                                strokeWidth={1.75}
                            />
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-900">
                            Activa tu ubicación
                        </h2>
                        <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                            Necesitamos saber dónde estás para mostrarte
                            servicios y personas cerca de ti.
                        </p>
                        <button
                            data-testid="btn-activar-gps-servicios"
                            onClick={() => obtenerUbicacion()}
                            disabled={cargandoGps}
                            className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky disabled:opacity-60 lg:cursor-pointer flex items-center gap-2"
                        >
                            {cargandoGps ? 'Buscando…' : 'Activar ubicación'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render principal ─────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-transparent">
            <ServiciosHeader
                onBack={handleVolver}
                ciudad={ciudad}
                totalPublicaciones={totalPublicaciones}
                filtroActivo={filtro}
                onFiltroChange={handleSetFiltro}
                modo={modo}
                onModoChange={handleSetModo}
            />

            {/* ── Toggle Ofrecen/Solicitan — SOLO DESKTOP. En móvil, los chips
                  "Ofrecen / Solicitan" viven al inicio del carrusel de chips
                  del header (ver ServiciosHeader → ChipsFiltros con `modo`).
                  Aquí el toggle es un bloque encimado al borde inferior del
                  header dark (mitad dentro, mitad fuera).
                  Altura del toggle ~38px → `-mt-[19px]` lo deja a la mitad.
                  `z-30` para que se vea sobre el header sticky (z-20).
                  Offset lateral (`lg:pl-[60px]`) alinea con el bloque
                  [icono + título "Servicios"] del header. ── */}
            <div className="hidden lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8 -mt-[19px] relative z-30 lg:block">
                <div className="lg:pl-[60px] 2xl:pl-[64px]">
                    <OfreceToggle value={modo} onChange={handleSetModo} />
                </div>
            </div>

            {/* ── Contenido ── */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                ) : isError ? (
                    <ErrorBloque onReintentar={() => refetch()} />
                ) : recientes.length === 0 &&
                  cercanos.length === 0 &&
                  clasificados.length === 0 ? (
                    <FeedVacio
                        onPublicar={esModoPersonal ? irAPublicar : null}
                        ciudad={ciudad}
                    />
                ) : (
                    <>
                        {/* Carrusel: Recién publicado */}
                        {recientes.length > 0 && (
                            <section className="px-4 lg:px-0 mt-5 lg:mt-6">
                                <TituloSeccion>
                                    Recién publicado en {ciudad.split(',')[0]}
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-carrusel-recientes"
                                    className="flex gap-3 lg:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x"
                                >
                                    {recientes.map((p) => (
                                        <CardHorizontal
                                            key={p.id}
                                            publicacion={p}
                                            onClick={() =>
                                                navigate(`/servicios/${p.id}`)
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Grid: Cerca de ti */}
                        {cercanos.length > 0 && (
                            <section className="px-4 lg:px-0 mt-6 lg:mt-8">
                                <TituloSeccion
                                    count={`${cercanos.length} resultado${cercanos.length === 1 ? '' : 's'}`}
                                >
                                    Cerca de ti
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-grid-cercanos"
                                    className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4"
                                >
                                    {cercanos.map((p) => (
                                        <CardSegunTipo
                                            key={p.id}
                                            publicacion={p}
                                            distanciaMetros={p.distanciaMetros}
                                            onClick={() =>
                                                navigate(`/servicios/${p.id}`)
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Clasificados: pedidos ("Busco X") como widget formal
                            con tag strip de categorías + KPI. Vive aparte del
                            feed principal. Decisión UX 2026-05-16.
                            TODO: cuando exista la ruta dedicada
                            `/servicios/clasificados`, agregar `onVerTodos`. */}
                        {totalClasificadosHoy > 0 && (
                            <div className="px-4 lg:px-0">
                                <ClasificadosWidget
                                    pedidos={clasificados}
                                    totalHoy={totalClasificadosHoy}
                                    filtroActivo={filtroClasificado}
                                    onFiltroChange={setFiltroClasificado}
                                    desktop={esEscritorio}
                                    onPedidoClick={(id) =>
                                        navigate(`/servicios/${id}`)
                                    }
                                    onPublicar={
                                        esModoPersonal
                                            ? irAPublicarSolicito
                                            : undefined
                                    }
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {esModoPersonal && (
                <FABPublicar
                    onOfrezco={irAPublicarOfrezco}
                    onSolicito={irAPublicarSolicito}
                />
            )}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function CardSegunTipo({
    publicacion,
    distanciaMetros,
    onClick,
}: {
    publicacion: PublicacionServicio & { distanciaMetros?: number | null };
    distanciaMetros?: number | null;
    onClick?: () => void;
}) {
    // Los `tipo='solicito'` ya no llegan aquí — viven en ClasificadosWidget.
    if (publicacion.tipo === 'vacante-empresa') {
        return <CardVacante publicacion={publicacion} onClick={onClick} />;
    }
    return (
        <CardServicio
            publicacion={publicacion}
            distanciaMetros={distanciaMetros}
            onClick={onClick}
        />
    );
}

function TituloSeccion({
    children,
    count,
}: {
    children: React.ReactNode;
    count?: string;
}) {
    return (
        <div className="flex items-end justify-between mb-2 lg:mb-3">
            <h2 className="text-[17px] lg:text-[18px] font-extrabold tracking-tight text-slate-900">
                {children}
            </h2>
            {count && (
                <span className="text-[12px] font-semibold text-slate-500">
                    {count}
                </span>
            )}
        </div>
    );
}

function ErrorBloque({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mb-4">
                <AlertCircle
                    className="w-7 h-7 text-amber-600"
                    strokeWidth={1.75}
                />
            </div>
            <h2 className="text-[18px] font-extrabold text-slate-900">
                No pudimos cargar el feed
            </h2>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                Revisa tu conexión y vuelve a intentarlo.
            </p>
            <button
                data-testid="btn-reintentar-servicios"
                onClick={onReintentar}
                className="mt-5 px-5 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-sm shadow-md lg:cursor-pointer hover:bg-slate-800"
            >
                Reintentar
            </button>
        </div>
    );
}

function FeedVacio({
    onPublicar,
    ciudad,
}: {
    /** Si es null (modo comercial) NO se muestra el CTA — el comerciante
     *  publica desde Business Studio → Vacantes, no desde aquí. */
    onPublicar: (() => void) | null;
    ciudad: string | null;
}) {
    return (
        <>
            <div
                data-testid="servicios-empty"
                className="relative mt-12 flex flex-col items-center px-6 text-center lg:mt-20 pb-32"
            >
                {/* Sparkles decorativos animados */}
                <Sparkles
                    className="absolute left-8 top-2 h-5 w-5 animate-pulse text-sky-400/70"
                    strokeWidth={2}
                    style={{ animationDuration: '2.5s' }}
                />
                <Sparkles
                    className="absolute right-10 top-10 h-4 w-4 animate-pulse text-sky-300/70"
                    strokeWidth={2}
                    style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
                />

                {/* Icono central con halos pulsantes */}
                <div className="relative mb-6">
                    <div
                        className="absolute inset-0 -m-5 animate-ping rounded-full bg-sky-300/40"
                        style={{ animationDuration: '2.4s' }}
                    />
                    <div
                        className="absolute inset-0 -m-2 animate-ping rounded-full bg-sky-400/40"
                        style={{
                            animationDuration: '2.4s',
                            animationDelay: '0.4s',
                        }}
                    />
                    <div
                        className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
                        style={{
                            background:
                                'linear-gradient(135deg, #38bdf8, #0369a1)',
                        }}
                    >
                        <Wrench
                            className="h-11 w-11 text-white"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                    ¡Sé el primero!
                </h3>
                <p className="max-w-sm text-base text-slate-600">
                    Aún no hay servicios en{' '}
                    <span className="font-bold text-slate-900">
                        {ciudad ?? 'tu zona'}
                    </span>
                    . Publica algo y empieza a conectar con tus vecinos hoy
                    mismo.
                </p>

                {/* CTA inline solo desktop — en móvil el FAB ya es visible.
                    Oculto en modo Comercial: el comerciante publica desde
                    Business Studio → Vacantes, no desde aquí. */}
                {onPublicar && (
                    <button
                        data-testid="btn-publicar-servicios-empty"
                        onClick={onPublicar}
                        className="mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] lg:inline-flex"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Publicar primer servicio
                    </button>
                )}
            </div>

            {/* Indicador animado apuntando al FAB — solo móvil cuando el feed
                está vacío. Mismo patrón que MarketPlace. */}
            <div
                data-testid="empty-state-arrow-fab-servicios"
                className="pointer-events-none fixed bottom-36 right-3 z-20 flex flex-col items-end gap-1 lg:hidden"
                style={{
                    animation: 'srv-arrow-bounce 1.4s ease-in-out infinite',
                }}
            >
                <span className="rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-3 py-1.5 text-sm font-bold text-white shadow-lg whitespace-nowrap">
                    ¡Publica aquí!
                </span>
                <CornerRightDown
                    className="h-8 w-8 text-slate-900 drop-shadow"
                    strokeWidth={3}
                />
                <style>{`
                    @keyframes srv-arrow-bounce {
                        0%, 100% { transform: translate(0, 0); }
                        50% { transform: translate(6px, 6px); }
                    }
                `}</style>
            </div>
        </>
    );
}

export default PaginaServicios;
