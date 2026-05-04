/**
 * PaginaPerfilVendedor.tsx
 * =========================
 * Pantalla 3 (P3) — Perfil del Vendedor en MarketPlace.
 *
 * Estructura (decisión post-plan: SIN portada decorativa, alineado con
 * estética profesional B2B Regla 13):
 *  - Header transparente flotante (← atrás, ⋯ menú con "Bloquear usuario").
 *  - Hero blanco con avatar circular grande + nombre + ciudad + miembro
 *    desde + 3 KPIs en fila inline (sin emojis, sin pastel saturados).
 *  - Botones: "Enviar mensaje" (dark gradient) + "Seguir vendedor"
 *    (blanco/borde). Si visitas tu propio perfil, ambos se ocultan.
 *  - Tabs Publicaciones (X) | Vendidos (X) con subrayado teal en activa.
 *  - Grid de cards estilo B (reusa CardArticulo del Sprint 2). En tab
 *    Vendidos se envuelve cada card con un overlay slate translúcido.
 *
 * "Seguir vendedor" en v1 solo registra el voto (entity_type='usuario',
 * tipo_accion='follow'). NO aparece en ningún lado del UI más allá del
 * estado del propio botón. Cuando se cree la tab "Vendedores" en
 * Mis Guardados (v1.1+), se materializa la lista.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P3)
 * Sprint:      docs/prompts Marketplace/Sprint-5-Perfil-Vendedor.md
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    MoreVertical,
    User,
    MessageSquare,
    UserPlus,
    UserCheck,
    AlertCircle,
    PackageX,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useVotos } from '../../../hooks/useVotos';
import {
    useVendedorMarketplace,
    useVendedorPublicaciones,
} from '../../../hooks/queries/useMarketplace';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import { parsearFechaPostgres } from '../../../utils/marketplace';
import type { ArticuloMarketplace, ArticuloFeed } from '../../../types/marketplace';

// =============================================================================
// HELPERS
// =============================================================================

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearMiembroDesde(timestamp: string): string {
    try {
        const d = parsearFechaPostgres(timestamp);
        if (isNaN(d.getTime())) return '';
        return `Miembro desde ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return '';
    }
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    return `${nombre.trim().charAt(0).toUpperCase()}${apellidos.trim().charAt(0).toUpperCase()}`;
}

/**
 * Convierte un `ArticuloMarketplace` (sin distancia) a `ArticuloFeed` para
 * pasarlo al `<CardArticulo>` que reusamos. La distancia es irrelevante en
 * este contexto (perfil del vendedor, no feed con GPS).
 */
function aFeed(a: ArticuloMarketplace): ArticuloFeed {
    return { ...a, distanciaMetros: null };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaPerfilVendedor() {
    const { usuarioId } = useParams<{ usuarioId: string }>();
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);

    const [tabActiva, setTabActiva] = useState<'activa' | 'vendida'>('activa');
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { data: perfil, isLoading: cargandoPerfil, isError } =
        useVendedorMarketplace(usuarioId);
    const { data: publicaciones, isFetching: cargandoPublicaciones } =
        useVendedorPublicaciones(usuarioId, tabActiva);

    // ─── Seguir vendedor ──────────────────────────────────────────────────────
    const { followed, loading: cargandoSeguir, toggleFollow } = useVotos({
        entityType: 'usuario',
        entityId: usuarioId ?? '',
    });

    // ─── Cerrar menú con click fuera ──────────────────────────────────────────
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleVolver = () => navigate(-1);

    const handleBloquear = () => {
        setMenuAbierto(false);
        notificar.info('Próximamente disponible');
    };

    const handleEnviarMensaje = () => {
        if (!perfil) return;
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }
        abrirChatTemporal({
            id: `temp_vendedor_${perfil.id}_${Date.now()}`,
            otroParticipante: {
                id: perfil.id,
                nombre: perfil.nombre,
                apellidos: perfil.apellidos,
                avatarUrl: perfil.avatarUrl,
            },
            datosCreacion: {
                participante2Id: perfil.id,
                participante2Modo: 'personal',
                contextoTipo: 'vendedor_marketplace',
            },
        });
    };

    // ─── Estados ──────────────────────────────────────────────────────────────

    if (cargandoPerfil) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !perfil) {
        return (
            <Estado404
                onVolver={() => navigate('/marketplace')}
            />
        );
    }

    const esUnoMismo = usuarioActual?.id === perfil.id;
    const articulos = publicaciones?.data ?? [];
    const totalActivos = perfil.kpis.publicacionesActivas;
    const totalVendidos = perfil.kpis.vendidos;
    const totalPublicacionesTab = tabActiva === 'activa' ? totalActivos : totalVendidos;

    return (
        <div data-testid="pagina-perfil-vendedor" className="min-h-full bg-slate-50">
            {/* ════════════════════════════════════════════════════════════════
                HEADER TRANSPARENTE FLOTANTE
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="flex items-center justify-between px-3 py-3">
                        <button
                            data-testid="btn-volver-perfil"
                            onClick={handleVolver}
                            aria-label="Volver"
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div className="text-sm font-semibold text-slate-700">
                            Perfil del vendedor
                        </div>
                        <div className="relative" ref={menuRef}>
                            <button
                                data-testid="btn-menu-perfil-vendedor"
                                onClick={() => setMenuAbierto((v) => !v)}
                                aria-label="Más opciones"
                                aria-haspopup="menu"
                                aria-expanded={menuAbierto}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                            >
                                <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            {menuAbierto && (
                                <div
                                    data-testid="menu-mas-opciones-vendedor"
                                    role="menu"
                                    className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                                >
                                    <button
                                        data-testid="opcion-bloquear-usuario"
                                        onClick={handleBloquear}
                                        className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        Bloquear usuario
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                HERO — avatar + identidad + KPIs
            ════════════════════════════════════════════════════════════════ */}
            <div className="bg-white">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="px-4 py-6 lg:py-8">
                        <div className="flex flex-col items-center text-center">
                            {/* Avatar */}
                            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md lg:h-28 lg:w-28">
                                {perfil.avatarUrl ? (
                                    <img
                                        src={perfil.avatarUrl}
                                        alt={`Avatar de ${perfil.nombre}`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-slate-300 text-2xl font-semibold text-slate-700">
                                        {obtenerIniciales(perfil.nombre, perfil.apellidos) || (
                                            <User className="h-12 w-12" strokeWidth={2} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Nombre + ubicación + miembro desde */}
                            <h1
                                data-testid="nombre-vendedor"
                                className="mt-3 text-xl font-bold text-slate-900 lg:text-2xl"
                            >
                                {perfil.nombre} {perfil.apellidos}
                            </h1>
                            {perfil.ciudad && (
                                <p className="text-sm text-slate-600">{perfil.ciudad}</p>
                            )}
                            <p className="mt-0.5 text-xs text-slate-500">
                                {formatearMiembroDesde(perfil.miembroDesde)}
                            </p>
                        </div>

                        {/* KPIs */}
                        <KpiFila
                            activas={totalActivos}
                            vendidos={totalVendidos}
                            tiempoRespuesta={perfil.kpis.tiempoRespuesta}
                        />

                        {/* Botones (ocultos si es uno mismo) */}
                        {!esUnoMismo && (
                            <div className="mx-auto mt-5 flex max-w-md flex-col gap-2 lg:flex-row lg:max-w-2xl">
                                <button
                                    data-testid="btn-enviar-mensaje-vendedor"
                                    onClick={handleEnviarMensaje}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
                                >
                                    <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                                    Enviar mensaje
                                </button>
                                <button
                                    data-testid="btn-seguir-vendedor"
                                    onClick={toggleFollow}
                                    disabled={cargandoSeguir}
                                    aria-pressed={followed}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                                        followed
                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {followed ? (
                                        <UserCheck className="h-4 w-4" strokeWidth={2.5} />
                                    ) : (
                                        <UserPlus className="h-4 w-4" strokeWidth={2.5} />
                                    )}
                                    {followed ? 'Siguiendo' : 'Seguir vendedor'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                TABS + GRID
            ════════════════════════════════════════════════════════════════ */}
            <div className="border-t border-slate-200 bg-white">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="flex">
                        <TabBoton
                            activa={tabActiva === 'activa'}
                            label={`Publicaciones (${totalActivos})`}
                            onClick={() => setTabActiva('activa')}
                            testId="tab-publicaciones"
                        />
                        <TabBoton
                            activa={tabActiva === 'vendida'}
                            label={`Vendidos (${totalVendidos})`}
                            onClick={() => setTabActiva('vendida')}
                            testId="tab-vendidos"
                        />
                    </div>
                </div>
            </div>

            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                <div className="px-3 py-5 lg:px-0">
                    {cargandoPublicaciones && articulos.length === 0 ? (
                        <div className="flex min-h-40 items-center justify-center">
                            <Spinner tamanio="md" />
                        </div>
                    ) : articulos.length === 0 ? (
                        <EstadoVacio
                            tab={tabActiva}
                            esUnoMismo={esUnoMismo}
                            totalTab={totalPublicacionesTab}
                        />
                    ) : (
                        <div
                            data-testid={`grid-${tabActiva}`}
                            className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 2xl:grid-cols-5"
                        >
                            {articulos.map((a) =>
                                tabActiva === 'vendida' ? (
                                    <CardConOverlayVendido
                                        key={a.id}
                                        articulo={aFeed(a)}
                                    />
                                ) : (
                                    <CardArticulo key={a.id} articulo={aFeed(a)} />
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface KpiFilaProps {
    activas: number;
    vendidos: number;
    tiempoRespuesta: string;
}

function KpiFila({ activas, vendidos, tiempoRespuesta }: KpiFilaProps) {
    return (
        <div
            data-testid="kpis-vendedor"
            className="mx-auto mt-5 flex max-w-md justify-center divide-x divide-slate-200 rounded-xl border-2 border-slate-200 bg-white"
        >
            <Kpi label="Publicaciones" valor={activas.toString()} />
            <Kpi label="Vendidos" valor={vendidos.toString()} />
            <Kpi label="Respuesta" valor={tiempoRespuesta} />
        </div>
    );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
    return (
        <div className="flex-1 px-3 py-3 text-center">
            <div className="text-lg font-bold text-slate-900 lg:text-xl">{valor}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
                {label}
            </div>
        </div>
    );
}

interface TabBotonProps {
    activa: boolean;
    label: string;
    onClick: () => void;
    testId: string;
}

function TabBoton({ activa, label, onClick, testId }: TabBotonProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            aria-pressed={activa}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activa
                    ? 'border-teal-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
            {label}
        </button>
    );
}

interface CardConOverlayVendidoProps {
    articulo: ArticuloFeed;
}

function CardConOverlayVendido({ articulo }: CardConOverlayVendidoProps) {
    return (
        <div className="relative">
            <CardArticulo articulo={articulo} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-700/55">
                <div className="flex flex-col items-center gap-1 text-white">
                    <PackageX className="h-8 w-8" strokeWidth={1.5} />
                    <span className="text-base font-extrabold tracking-wider">
                        VENDIDO
                    </span>
                </div>
            </div>
        </div>
    );
}

interface EstadoVacioProps {
    tab: 'activa' | 'vendida';
    esUnoMismo: boolean;
    totalTab: number;
}

function EstadoVacio({ tab, esUnoMismo, totalTab }: EstadoVacioProps) {
    const titulo =
        tab === 'activa'
            ? esUnoMismo
                ? 'Aún no tienes publicaciones activas'
                : 'Sin publicaciones activas'
            : esUnoMismo
                ? 'Aún no has vendido nada'
                : 'Sin ventas registradas';
    const cuerpo =
        totalTab > 0
            ? 'No hay más resultados para mostrar.'
            : 'Cuando publique algo nuevo, aparecerá aquí.';

    return (
        <div
            data-testid={`estado-vacio-${tab}`}
            className="mx-auto max-w-md rounded-xl border-2 border-slate-200 bg-white p-8 text-center"
        >
            <h3 className="mb-2 text-base font-semibold text-slate-900">{titulo}</h3>
            <p className="text-sm text-slate-600">{cuerpo}</p>
        </div>
    );
}

interface Estado404Props {
    onVolver: () => void;
}

function Estado404({ onVolver }: Estado404Props) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
            <div
                data-testid="estado-vendedor-404"
                className="flex max-w-md flex-col items-center text-center"
            >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">
                    Vendedor no encontrado
                </h2>
                <p className="mb-5 text-sm text-slate-600">
                    Este vendedor no existe o ya no está disponible.
                </p>
                <button
                    onClick={onVolver}
                    className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md"
                >
                    Volver al MarketPlace
                </button>
            </div>
        </div>
    );
}

export default PaginaPerfilVendedor;
