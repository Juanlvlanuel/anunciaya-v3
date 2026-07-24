/**
 * PaginaPerfilPrestador.tsx
 * ===========================
 * Perfil público de un prestador de Servicios (cualquier usuario con
 * publicaciones). Ruta: `/servicios/usuario/:usuarioId`.
 *
 * Accesible desde el botón "Ver perfil" del OferenteCard en la pantalla
 * de detalle de una publicación.
 *
 * Sprint 9.3 (iteración): rediseñado para igualar el patrón visual del
 * perfil de usuario en MarketPlace (`PaginaPerfilVendedor`) — hero card
 * horizontal con 2 columnas en desktop (identidad | KPIs + botones de
 * contacto), tabs underline segmented y grid de cards. Cambios respecto
 * al MP:
 *
 *  - Tema cromático SKY (no teal — convención cromática de Servicios).
 *  - Sin botón WhatsApp (el `PerfilPrestador` del backend no expone
 *    `telefono` — solo el detalle de la publicación lo trae).
 *  - KPIs: Publicaciones / Reseñas (rating o `—`) / Responde.
 *  - Tabs: Servicios activos / Reseñas (no Vendidos como MP).
 *  - max-w-[920px] para igualar al feed de Servicios.
 *
 * Estructura:
 *   - ServiciosHeader (negro, persistente) con onBack + pill "Perfil"
 *   - HeroCard: avatar con ring gradient sky + nombre + ciudad + KPIs
 *     + botones inline (ChatYA + Agregar contacto)
 *   - Tabs underline: Servicios activos · Reseñas
 *   - Contenido del tab activo (grid de cards o lista de reseñas)
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaPerfilPrestador.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    BadgeCheck,
    ChevronLeft,
    MapPin,
    MessageCircle,
    Package,
    Star,
    UserCheck,
    UserPlus,
    Wrench,
} from 'lucide-react';
import Tooltip from '../../../components/ui/Tooltip';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import {
    usePerfilPrestador,
    usePublicacionesDelPrestador,
    useResenasDelPrestador,
} from '../../../hooks/queries/useServicios';
import { CardServicio } from '../../../components/servicios/CardServicio';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import { emitirCuandoConectado } from '../../../services/socketService';
import { notificar } from '../../../utils/notificaciones';
import {
    formatearTiempoRelativo,
    obtenerNombreCorto,
    parsearFechaPostgres,
} from '../../../utils/servicios';
import type {
    PerfilPrestador,
    PublicacionServicio,
    ResenaServicio,
} from '../../../types/servicios';

type TabActivo = 'servicios' | 'resenas';

// =============================================================================
// HEADER — mismo patrón que el detalle de MarketPlace/Servicios y el
// perfil de MP (`PaginaPerfilVendedor.tsx`): fondo negro + glow sky +
// grid pattern + acentos, título "Perfil" fijo (sin nombre — ya vive en
// el HeroCard de abajo). Antes esta página reusaba el `ServiciosHeader`
// genérico (con "ServiciosLocales" + pill "Perfil"), inconsistente con
// el patrón "Detalle"/"Perfil" que usan las demás páginas de detalle.
// =============================================================================
function HeaderPerfilPrestador({ onBack }: { onBack: () => void }) {
    return (
        <div className="shrink-0 z-30 lg:sticky lg:top-0 lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
            <div
                className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                style={{ background: '#000000' }}
            >
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse at 85% 20%, rgba(2,132,199,0.10) 0%, transparent 55%)',
                    }}
                />
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        opacity: 0.08,
                        backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                          repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                    }}
                />
                <div
                    className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                    style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9 40%, #38bdf8 60%, transparent)' }}
                />
                <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                    style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9 40%, #38bdf8 60%, transparent)' }}
                />

                <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5 lg:px-4 lg:py-2.5 2xl:px-3 2xl:pt-4 2xl:pb-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <button
                            data-testid="btn-volver-perfil"
                            onClick={onBack}
                            aria-label="Volver"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                                background: 'linear-gradient(135deg, #38bdf8, #0369a1)',
                            }}
                        >
                            <BadgeCheck
                                className="h-[18px] w-[18px] text-white"
                                strokeWidth={2.5}
                            />
                        </div>
                        <span className="ml-1.5 shrink-0 text-2xl lg:text-xl 2xl:text-2xl font-extrabold tracking-tight text-white">
                            Perfil
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PaginaPerfilPrestador() {
    const { usuarioId } = useParams<{ usuarioId: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/servicios');
    const cuerpoRef = useScrollAppShell();
    const usuarioActual = useAuthStore((s) => s.usuario);

    // ChatYA: hook centralizado para "Enviar mensaje" + store para
    // agenda de contactos (contactos del hero card).
    const iniciarChatDirectoPersona = useIniciarChatDirectoPersona();
    const contactos = useChatYAStore((s) => s.contactos);
    const cargarContactos = useChatYAStore((s) => s.cargarContactos);
    const agregarContacto = useChatYAStore((s) => s.agregarContacto);
    const eliminarContacto = useChatYAStore((s) => s.eliminarContacto);

    const {
        data: perfil,
        isPending: cargandoPerfil,
        isError: errorPerfil,
    } = usePerfilPrestador(usuarioId);

    // ─── Estado online REAL vía Socket.io (mismo patrón que el perfil
    // de MarketPlace) — pide al servidor el estado actual del usuario
    // perfilado y queda suscrito a updates en
    // `useChatYAStore.estadosUsuarios[usuarioId]`.
    const estadoUsuario = useChatYAStore((s) =>
        usuarioId ? s.estadosUsuarios[usuarioId] : undefined,
    );
    useEffect(() => {
        if (!usuarioId || !perfil) return;
        if (usuarioActual?.id === usuarioId) return;
        const cancelar = emitirCuandoConectado('chatya:consultar-estado', usuarioId);
        return cancelar;
    }, [usuarioId, perfil, usuarioActual?.id]);

    const {
        data: publicaciones = [],
        isPending: cargandoPubs,
    } = usePublicacionesDelPrestador(usuarioId);

    const {
        data: resenas = [],
        isPending: cargandoResenas,
    } = useResenasDelPrestador(usuarioId);

    const [tab, setTab] = useState<TabActivo>('servicios');
    const [accionContactoEnCurso, setAccionContactoEnCurso] = useState(false);

    // Cargar lista de contactos personales al montar para saber si el
    // perfilado ya está en la agenda (estado del botón "Agregar a contactos").
    useEffect(() => {
        if (!usuarioActual) return;
        cargarContactos('personal');
    }, [usuarioActual, cargarContactos]);

    const esUnoMismo = usuarioActual?.id === perfil?.id;
    const contactoExistente =
        usuarioId
            ? contactos.find(
                  (c) =>
                      c.contactoId === usuarioId &&
                      c.tipo === 'personal' &&
                      c.sucursalId === null,
              )
            : undefined;
    const esContacto = !!contactoExistente;

    const handleToggleContacto = async () => {
        if (!perfil || !usuarioActual || accionContactoEnCurso) return;
        if (usuarioActual.id === perfil.id) return;
        setAccionContactoEnCurso(true);
        try {
            if (contactoExistente) {
                const ok = await eliminarContacto(contactoExistente.id);
                if (ok) {
                    notificar.exito(`${perfil.nombre} ya no está en tus contactos`);
                } else {
                    notificar.error('No se pudo quitar el contacto. Intenta de nuevo.');
                }
            } else {
                const creado = await agregarContacto(
                    {
                        contactoId: perfil.id,
                        tipo: 'personal',
                        sucursalId: null,
                        negocioId: null,
                    },
                    {
                        nombre: perfil.nombre,
                        apellidos: perfil.apellidos,
                        avatarUrl: perfil.avatarUrl,
                    },
                );
                if (creado) {
                    notificar.exito(`${perfil.nombre} agregado a tus contactos`);
                } else {
                    notificar.error('No se pudo agregar el contacto. Intenta de nuevo.');
                }
            }
        } finally {
            setAccionContactoEnCurso(false);
        }
    };

    const handleEnviarMensaje = async () => {
        if (!perfil) return;
        await iniciarChatDirectoPersona({
            usuarioId: perfil.id,
            nombre: perfil.nombre,
            apellidos: perfil.apellidos,
            avatarUrl: perfil.avatarUrl,
        });
    };

    if (cargandoPerfil) {
        return (
            <>
                <HeaderPerfilPrestador onBack={handleVolver} />
                <div className="flex-1 min-h-0 bg-transparent flex items-center justify-center py-20 lg:flex-none lg:min-h-full">
                    <Spinner tamanio="lg" />
                </div>
            </>
        );
    }

    if (errorPerfil || !perfil) {
        return (
            <>
                <HeaderPerfilPrestador onBack={handleVolver} />
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-transparent lg:flex-none lg:overflow-visible lg:min-h-full">
                    <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:max-w-[920px] 2xl:px-4">
                        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mb-4">
                                <AlertCircle
                                    className="w-7 h-7 text-amber-600"
                                    strokeWidth={1.75}
                                />
                            </div>
                            <h2 className="text-[18px] font-extrabold text-slate-900">
                                No encontramos a este usuario
                            </h2>
                            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                                Pudo haber eliminado su cuenta o cambiado su
                                privacidad. Vuelve al feed para ver otros
                                prestadores.
                            </p>
                            <button
                                onClick={handleVolver}
                                className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer"
                            >
                                Volver al feed
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`.trim();
    const nombreCorto = obtenerNombreCorto(perfil.nombre, perfil.apellidos);

    return (
        <>
            <HeaderPerfilPrestador onBack={handleVolver} />

            <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-transparent pb-32 lg:flex-none lg:overflow-visible">
                {/* Contenedor max 920px para igualar al feed de Servicios. */}
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:max-w-[920px] 2xl:px-4">
                    <div className="px-3 py-5 lg:px-0 lg:py-4">
                        <HeroCard
                            perfil={perfil}
                            nombreCompleto={nombreCompleto}
                            esUnoMismo={esUnoMismo}
                            esContacto={esContacto}
                            accionContactoEnCurso={accionContactoEnCurso}
                            onToggleContacto={handleToggleContacto}
                            onEnviarMensaje={handleEnviarMensaje}
                            estadoPresencia={estadoUsuario?.estado}
                        />

                        <div className="mt-6 lg:mt-3">
                            <TabsSegmented
                                tabActiva={tab}
                                totalServicios={perfil.totalPublicacionesActivas}
                                totalResenas={perfil.totalResenas}
                                onChange={setTab}
                            />

                            <div className="mt-4 lg:mt-2">
                                {tab === 'servicios' ? (
                                    <SeccionPublicaciones
                                        cargando={cargandoPubs}
                                        publicaciones={publicaciones}
                                        nombre={nombreCorto}
                                        onClick={(id) => navigate(`/servicios/${id}`)}
                                    />
                                ) : (
                                    <SeccionResenas
                                        cargando={cargandoResenas}
                                        resenas={resenas}
                                        nombre={nombreCorto}
                                        ratingPromedio={perfil.ratingPromedio}
                                        totalResenas={perfil.totalResenas}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// =============================================================================
// HERO CARD — 2 columnas (identidad | KPIs + botones)
// =============================================================================

interface HeroCardProps {
    perfil: PerfilPrestador;
    nombreCompleto: string;
    esUnoMismo: boolean;
    esContacto: boolean;
    accionContactoEnCurso: boolean;
    onToggleContacto: () => void;
    onEnviarMensaje: () => void;
    estadoPresencia: 'conectado' | 'ausente' | 'desconectado' | undefined;
}

function HeroCard({
    perfil,
    esUnoMismo,
    esContacto,
    accionContactoEnCurso,
    onToggleContacto,
    onEnviarMensaje,
    estadoPresencia,
}: HeroCardProps) {
    // `esPrestador` = tiene al menos una publicación activa (equivalente
    // al `esVendedor` del perfil MP). Decide si mostrar KPIs + badge
    // verificado o solo el bloque de identidad básico.
    const esPrestador = perfil.totalPublicacionesActivas > 0;
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:rounded-2xl lg:px-6 lg:py-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center lg:gap-6">
                {/* ── Columna izquierda: avatar + identidad ────────────────── */}
                {/* Fila (avatar a la izquierda, identidad a la derecha) en
                    TODAS las resoluciones — antes en móvil era columna
                    centrada; ahora usa el mismo acomodo que desktop. */}
                <div className="flex flex-row items-center gap-3 text-left">
                    <AvatarConRingSky perfil={perfil} estadoPresencia={estadoPresencia} />
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                        {/* Nombre en 1 sola línea en desktop + badge verificado
                            invertido al final (estilo Twitter/X con fondo
                            azul + palomita blanca). */}
                        <h1
                            data-testid="nombre-prestador"
                            className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-950 leading-tight lg:text-lg"
                        >
                            {perfil.nombre} {perfil.apellidos}
                            {esPrestador && (
                                <BadgeCheck
                                    className="h-5 w-5 shrink-0 fill-blue-500 text-white lg:h-[18px] lg:w-[18px]"
                                    strokeWidth={2.5}
                                    aria-label="Prestador con publicaciones"
                                />
                            )}
                        </h1>
                        {perfil.ciudad && (
                            <div className="mt-1 flex items-center gap-1.5 text-base font-medium text-slate-600 lg:mt-1 lg:text-sm">
                                <MapPin
                                    className="h-4 w-4 shrink-0 text-slate-500 lg:h-3.5 lg:w-3.5"
                                    strokeWidth={2}
                                />
                                {perfil.ciudad}
                            </div>
                        )}
                        <p className="mt-0.5 text-sm font-medium text-slate-500 lg:text-xs">
                            Miembro desde: {formatearMiembroDesde(perfil.miembroDesde)}
                        </p>
                    </div>
                </div>

                {/* ── Columna derecha: KPIs + botones de contacto ──────────── */}
                <div className="flex flex-col gap-3 lg:gap-2">
                    {esPrestador && (
                        <div
                            data-testid="kpis-prestador"
                            className="grid grid-cols-2 divide-x-2 divide-slate-300 overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100"
                        >
                            <KpiCard
                                icono={<Package className="h-5 w-5 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={String(perfil.totalPublicacionesActivas)}
                                label="Publicaciones"
                            />
                            <KpiCard
                                icono={<Star className="h-5 w-5 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={
                                    perfil.ratingPromedio !== null
                                        ? perfil.ratingPromedio.toFixed(1)
                                        : '—'
                                }
                                label={
                                    perfil.totalResenas === 1 ? 'Reseña' : 'Reseñas'
                                }
                            />
                        </div>
                    )}

                    {!esUnoMismo && (
                        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end lg:gap-4">
                            {/* ChatYA — logo brand INLINE (sin pill, sin
                                texto duplicado) con hover scale. Mismo
                                patrón que en el detalle de la publicación
                                y en el perfil de MarketPlace. */}
                            <button
                                type="button"
                                data-testid="btn-chatya-prestador"
                                onClick={onEnviarMensaje}
                                aria-label="Enviar mensaje por ChatYA"
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <img
                                    src="/ChatYA.webp"
                                    alt="ChatYA"
                                    className="h-9 lg:h-7 w-auto shrink-0 object-contain"
                                />
                            </button>
                            {/* Agregar contacto — icon-only sky con tooltip.
                                Mismo patrón inline que el logo de ChatYA. */}
                            <Tooltip
                                text={
                                    esContacto
                                        ? 'Quitar de contactos'
                                        : 'Agregar a contactos'
                                }
                                position="top"
                            >
                                <button
                                    type="button"
                                    data-testid="btn-agregar-contacto-prestador"
                                    onClick={onToggleContacto}
                                    disabled={accionContactoEnCurso}
                                    aria-pressed={esContacto}
                                    aria-label={
                                        esContacto
                                            ? 'Quitar de contactos'
                                            : 'Agregar a contactos'
                                    }
                                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60 lg:hover:scale-110"
                                >
                                    {esContacto ? (
                                        <UserCheck
                                            className="h-7 w-7 lg:h-6 lg:w-6 shrink-0 text-sky-600"
                                            strokeWidth={2.25}
                                        />
                                    ) : (
                                        <UserPlus
                                            className="h-7 w-7 lg:h-6 lg:w-6 shrink-0 text-sky-600"
                                            strokeWidth={2.25}
                                        />
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Avatar simple — círculo plano (sin ring gradient) ────────────────────
// Sprint 9.3 (iteración): se removió el ring gradient brand para alinear
// con el nuevo diseño del perfil (más limpio, menos decoración).

function AvatarConRingSky({
    perfil,
    estadoPresencia,
}: {
    perfil: PerfilPrestador;
    estadoPresencia: 'conectado' | 'ausente' | 'desconectado' | undefined;
}) {
    const iniciales = obtenerIniciales(perfil.nombre, perfil.apellidos);
    const [abierto, setAbierto] = useState(false);

    // Punto de estado — SIEMPRE visible: verde (conectado) / ámbar
    // (ausente) / gris (desconectado o aún sin respuesta del socket).
    const dotColor =
        estadoPresencia === 'conectado'
            ? 'bg-emerald-500'
            : estadoPresencia === 'ausente'
                ? 'bg-amber-400'
                : 'bg-slate-400';

    return (
        <div className="relative shrink-0">
            <div
                className={`h-[88px] w-[88px] overflow-hidden rounded-full shadow-md lg:h-14 lg:w-14 ${
                    perfil.avatarUrl ? 'lg:cursor-pointer' : ''
                }`}
                onClick={perfil.avatarUrl ? () => setAbierto(true) : undefined}
            >
                {perfil.avatarUrl ? (
                    <img
                        src={perfil.avatarUrl}
                        alt={`Avatar de ${perfil.nombre}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center text-2xl font-bold text-white lg:text-base"
                        style={{
                            background:
                                'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                        }}
                    >
                        {iniciales || '?'}
                    </div>
                )}
            </div>
            <span
                aria-label={
                    estadoPresencia === 'conectado'
                        ? 'En línea'
                        : estadoPresencia === 'ausente'
                            ? 'Ausente'
                            : 'Desconectado'
                }
                title={
                    estadoPresencia === 'conectado'
                        ? 'En línea'
                        : estadoPresencia === 'ausente'
                            ? 'Ausente'
                            : 'Desconectado'
                }
                className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white lg:h-3 lg:w-3 lg:bottom-0.5 lg:right-0.5 ${dotColor}`}
            />
            {abierto && perfil.avatarUrl && (
                <ModalImagenes
                    images={[perfil.avatarUrl]}
                    initialIndex={0}
                    isOpen={abierto}
                    onClose={() => setAbierto(false)}
                />
            )}
        </div>
    );
}

// ─── Celda de KPI (interna al grid del HeroCard) ──────────────────────────
// Sprint 9.3 (rediseño): estructura "alta + baja":
//   - Alta: valor grande arriba (jerarquía principal)
//   - Baja: icono + label en una sola línea horizontal abajo
// El bg + rounded vive en el grid contenedor (no en cada celda) para que
// las 2 columnas compartan el mismo bloque visual con un divisor entre
// ellas (divide-x-2). Mismo patrón que el perfil de MarketPlace.

interface KpiCardProps {
    icono: React.ReactNode;
    valor: string;
    label: string;
}

function KpiCard({ icono, valor, label }: KpiCardProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-center lg:py-1.5">
            <div className="text-xl font-black tracking-tight text-slate-950 leading-none lg:text-lg">
                {valor}
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 lg:text-xs">
                <span className="text-slate-500">{icono}</span>
                {label}
            </div>
        </div>
    );
}

// =============================================================================
// TABS — segmented underline (mismo patrón que perfil MP, color sky)
// =============================================================================

interface TabsSegmentedProps {
    tabActiva: TabActivo;
    totalServicios: number;
    totalResenas: number;
    onChange: (tab: TabActivo) => void;
}

function TabsSegmented({
    tabActiva,
    totalServicios,
    totalResenas,
    onChange,
}: TabsSegmentedProps) {
    return (
        <div role="tablist" className="flex gap-8 border-b-2 border-slate-300">
            <TabUnderline
                activa={tabActiva === 'servicios'}
                icono={<Wrench className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                label="Servicios"
                count={totalServicios}
                onClick={() => onChange('servicios')}
                testId="perfil-tab-servicios"
            />
            <TabUnderline
                activa={tabActiva === 'resenas'}
                icono={<Star className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                label="Reseñas"
                count={totalResenas}
                onClick={() => onChange('resenas')}
                testId="perfil-tab-resenas"
            />
        </div>
    );
}

interface TabUnderlineProps {
    activa: boolean;
    icono: React.ReactNode;
    label: string;
    count: number;
    onClick: () => void;
    testId: string;
}

function TabUnderline({ activa, icono, label, count, onClick, testId }: TabUnderlineProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="tab"
            aria-selected={activa}
            className={`relative -mb-0.5 inline-flex items-center gap-2.5 border-b-2 px-1 pb-3.5 pt-1.5 text-base font-bold transition-colors lg:cursor-pointer lg:pb-1.5 lg:pt-1 lg:text-lg ${
                activa
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
        >
            {icono}
            <span>{label}</span>
            <span
                className={`text-sm font-bold tabular-nums ${
                    activa ? 'text-sky-700' : 'text-slate-500'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

// =============================================================================
// SeccionPublicaciones — grid de cards de servicio
// =============================================================================

function SeccionPublicaciones({
    cargando,
    publicaciones,
    nombre,
    onClick,
}: {
    cargando: boolean;
    publicaciones: PublicacionServicio[];
    nombre: string;
    onClick: (id: string) => void;
}) {
    if (cargando) {
        return (
            <div className="py-12 flex justify-center">
                <Spinner tamanio="md" />
            </div>
        );
    }
    if (publicaciones.length === 0) {
        return (
            <EstadoVacio
                titulo="Sin servicios activos"
                mensaje={`${nombre} no tiene publicaciones activas en este momento.`}
            />
        );
    }
    return (
        <div
            data-testid="perfil-grid-publicaciones"
            className="grid grid-cols-2 auto-rows-fr gap-3 lg:grid-cols-3 lg:gap-4 2xl:grid-cols-4 [&>*]:h-full"
        >
            {publicaciones.map((p) => (
                <CardSegunTipoPerfil
                    key={p.id}
                    publicacion={p}
                    onClick={() => onClick(p.id)}
                />
            ))}
        </div>
    );
}

function CardSegunTipoPerfil({
    publicacion,
    onClick,
}: {
    publicacion: PublicacionServicio;
    onClick: () => void;
}) {
    // Sprint 9.3: `CardServicio` es universal — renderiza los 3 tipos
    // (servicio-persona / solicito / vacante-empresa) con el mismo
    // layout y misma altura. Mismo patrón que el feed de Servicios
    // (`PaginaServicios.tsx`). Antes se ramificaba a `CardVacante` para
    // las vacantes pero esa card era visualmente distinta (sin foto,
    // banner sky) y rompía la consistencia del grid.
    return <CardServicio publicacion={publicacion} onClick={onClick} />;
}

// =============================================================================
// SeccionResenas — promedio destacado + lista de reseñas
// =============================================================================

function calcularDistribucion(resenas: ResenaServicio[]): Record<1 | 2 | 3 | 4 | 5, number> {
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
    };
    for (const r of resenas) {
        const k = Math.min(5, Math.max(1, Math.round(r.rating))) as
            | 1
            | 2
            | 3
            | 4
            | 5;
        dist[k]++;
    }
    return dist;
}

function SeccionResenas({
    cargando,
    resenas,
    nombre,
    ratingPromedio,
    totalResenas,
}: {
    cargando: boolean;
    resenas: ResenaServicio[];
    nombre: string;
    ratingPromedio: number | null;
    totalResenas: number;
}) {
    const distribucion = calcularDistribucion(resenas);
    const maxDist = Math.max(1, ...Object.values(distribucion));
    if (cargando) {
        return (
            <div className="py-12 flex justify-center">
                <Spinner tamanio="md" />
            </div>
        );
    }
    if (resenas.length === 0) {
        return (
            <EstadoVacio
                titulo="Aún sin reseñas"
                mensaje={`Sé el primero en contratar a ${nombre} y déjale una reseña al terminar.`}
            />
        );
    }
    return (
        <div className="space-y-5">
            {/* Promedio destacado + distribución 5★-1★ */}
            {ratingPromedio !== null && (
                <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-5 lg:p-6">
                    <div className="flex items-start gap-4 lg:gap-6">
                        <div className="text-center shrink-0">
                            <div className="text-4xl lg:text-5xl font-extrabold text-slate-900 tabular-nums leading-none">
                                {ratingPromedio.toFixed(1)}
                            </div>
                            <FilaEstrellas
                                rating={ratingPromedio}
                                tamano="md"
                                extra="justify-center mt-1.5"
                            />
                            <p className="mt-2 text-[12px] text-slate-600 font-medium">
                                {totalResenas}{' '}
                                {totalResenas === 1 ? 'reseña' : 'reseñas'}
                            </p>
                        </div>
                        {/* Distribución de barras 5★→1★ */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                            {([5, 4, 3, 2, 1] as const).map((nivel) => {
                                const cant = distribucion[nivel];
                                const pct = (cant / maxDist) * 100;
                                return (
                                    <div
                                        key={nivel}
                                        className="flex items-center gap-2 text-[12px] font-semibold text-slate-700"
                                        data-testid={`distribucion-${nivel}`}
                                    >
                                        <span className="w-3 tabular-nums">
                                            {nivel}
                                        </span>
                                        <Star
                                            className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0"
                                            strokeWidth={1.5}
                                        />
                                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-[width] duration-500"
                                                style={{
                                                    width: `${pct}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-6 text-right text-slate-500 tabular-nums">
                                            {cant}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <p className="text-[12px] lg:text-[13px] text-slate-600 font-medium leading-snug mt-4 pt-3 border-t border-slate-200">
                        Basado en {totalResenas}{' '}
                        {totalResenas === 1
                            ? 'trabajo completado'
                            : 'trabajos completados'}{' '}
                        con vecinos de tu zona.
                    </p>
                </div>
            )}

            {/* Lista de reseñas */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden divide-y-2 divide-slate-200">
                {resenas.map((r) => (
                    <ItemResena key={r.id} resena={r} />
                ))}
            </div>
        </div>
    );
}

function ItemResena({ resena }: { resena: ResenaServicio }) {
    const nombre = obtenerNombreCorto(resena.autor.nombre, resena.autor.apellidos);
    const iniciales =
        (resena.autor.nombre[0] ?? '') + (resena.autor.apellidos[0] ?? '');
    const tiempo = formatearTiempoRelativo(resena.createdAt);

    return (
        <article
            data-testid={`resena-${resena.id}`}
            className="p-4 lg:p-5"
        >
            <div className="flex items-center gap-3 mb-2">
                {/* Avatar autor */}
                {resena.autor.avatarUrl ? (
                    <img
                        src={resena.autor.avatarUrl}
                        alt={nombre}
                        className="w-9 h-9 rounded-full object-cover shadow-sm border border-white"
                    />
                ) : (
                    <div
                        className="w-9 h-9 rounded-full grid place-items-center text-white font-bold text-sm shadow-sm"
                        style={{
                            background:
                                'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                        }}
                    >
                        {iniciales.toUpperCase() || '?'}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-sm lg:text-[13px] 2xl:text-sm">
                        <span className="font-bold text-slate-900">{nombre}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 font-medium">
                            {tiempo}
                        </span>
                    </div>
                    <FilaEstrellas rating={resena.rating} tamano="sm" />
                </div>
            </div>
            {resena.texto && (
                <p className="text-sm lg:text-[14px] 2xl:text-sm text-slate-700 font-medium leading-relaxed">
                    {resena.texto}
                </p>
            )}
            {resena.publicacionTitulo && (
                <div className="mt-2 text-sm lg:text-[12px] 2xl:text-sm text-slate-500 font-medium italic">
                    Sobre: {resena.publicacionTitulo}
                </div>
            )}
        </article>
    );
}

// =============================================================================
// FilaEstrellas + EstadoVacio
// =============================================================================

function FilaEstrellas({
    rating,
    tamano = 'sm',
    extra = '',
}: {
    rating: number;
    tamano?: 'sm' | 'md';
    extra?: string;
}) {
    const tam = tamano === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    return (
        <div className={`inline-flex items-center gap-0.5 ${extra}`} aria-label={`${rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((s) => {
                const lleno = s <= Math.round(rating);
                return (
                    <Star
                        key={s}
                        className={
                            tam +
                            ' ' +
                            (lleno
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300')
                        }
                        strokeWidth={1.5}
                    />
                );
            })}
        </div>
    );
}

function EstadoVacio({
    titulo,
    mensaje,
}: {
    titulo: string;
    mensaje: string;
}) {
    return (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 lg:py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-sky-50 grid place-items-center">
                <MessageCircle
                    className="w-7 h-7 text-sky-500"
                    strokeWidth={1.75}
                />
            </div>
            <h3 className="mt-4 text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                {titulo}
            </h3>
            <p className="mt-2 text-sm lg:text-[14px] 2xl:text-base text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
                {mensaje}
            </p>
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

const MESES_ES = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
];

function formatearMiembroDesde(iso: string): string {
    try {
        const d = parsearFechaPostgres(iso);
        return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return '—';
    }
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = nombre.trim().charAt(0).toUpperCase();
    const b = apellidos.trim().charAt(0).toUpperCase();
    return `${a}${b}`;
}

export default PaginaPerfilPrestador;
