/**
 * PaginaPerfilVendedor.tsx
 * =========================
 * Pantalla 3 (P3) — Perfil de Usuario en MarketPlace.
 *
 * Refactor v2 (Bucket C.3): el perfil es neutral — sirve tanto para
 * vendedores como para usuarios que solo comentaron en el feed (ej. el
 * `BotonComentarista` abre esta misma pantalla aunque la persona nunca haya
 * publicado nada).
 *
 *  - Si la persona ha publicado o vendido al menos un artículo → vista
 *    completa con KPIs + tabs + grid de publicaciones.
 *  - Si la persona solo es comentarista/comprador → solo Hero card sin
 *    KPIs ni tabs.
 *
 * URL canónica: /marketplace/usuario/:usuarioId.
 * URL legacy: /marketplace/vendedor/:usuarioId redirige a la canónica.
 *
 * Layout v3.2 — refinamiento UX:
 *  - Sin fondo propio: hereda el degradado azul global del MainLayout.
 *  - Header glass sticky con border-b-2 slate-300.
 *  - Hero card horizontal full-width:
 *      · Línea de acento brand (4px) superior (gradient teal→blue).
 *      · Avatar con RING GRADIENT brand (Instagram-style, p-[3px]) +
 *        status dot online en tiempo real (bottom-right, empalmado al
 *        círculo del avatar).
 *      · Verification check (BadgeCheck) al lado del nombre si vendedor.
 *      · Botón "Agregar a contactos" circular (solo icono UserPlus →
 *        UserCheck cuando ya es contacto) al lado derecho del nombre
 *        cuando NO es uno mismo. Persiste en `chat_contactos` y se
 *        sincroniza con la agenda del chat. Tooltip solo lg+ (TC-19).
 *      · KPIs en 2 LÍNEAS: icono+valor inline arriba, label debajo.
 *      · Botones de contacto APILADOS verticalmente:
 *          - WhatsApp con logo oficial (/whatsapp.webp) + verde brand.
 *          - ChatYA con gradient teal→blue (color marketplace, no negro).
 *      · En móvil se apila: avatar centrado, identidad, KPIs, botones.
 *  - Status online REAL via Socket.io (patrón ChatYA): se suscribe a
 *    `chatya:consultar-estado` y lee `useChatYAStore.estadosUsuarios`.
 *  - Tabs como segmented control con Dark Gradient (TC-7), counter
 *    como círculo full-rounded.
 *  - Grid de publicaciones con CardArticulo variant="compacta" (aspect 4/3).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P3)
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import {
    ChevronLeft,
    UserPlus,
    UserCheck,
    AlertCircle,
    PackageX,
    Zap,
    Package,
    ShoppingBag,
    Clock,
    BadgeCheck,
    Sparkles,
    Ban,
    ShieldOff,
    MessageCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useUiStore } from '../../../stores/useUiStore';
import {
    useVendedorMarketplace,
    useVendedorPublicaciones,
} from '../../../hooks/queries/useMarketplace';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { Spinner } from '../../../components/ui/Spinner';
import Tooltip from '../../../components/ui/Tooltip';
import { notificar } from '../../../utils/notificaciones';
import { parsearFechaPostgres } from '../../../utils/marketplace';
import { emitirCuandoConectado } from '../../../services/socketService';
import type { ArticuloMarketplace, ArticuloFeed } from '../../../types/marketplace';

// =============================================================================
// HELPERS
// =============================================================================

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DARK_GRADIENT = 'linear-gradient(135deg, #1e293b, #334155)';
const BRAND_ACCENT = 'linear-gradient(90deg, #14b8a6 0%, #2563eb 100%)';
const BRAND_ACCENT_DIAGONAL = 'linear-gradient(135deg, #14b8a6 0%, #2563eb 100%)';
// Azul brand de ChatYA — color sólido (mismo tono del header de VentanaChat).
// Usado en el botón ChatYA del perfil.
const CHATYA_BLUE = '#0B358F';

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
    const a = nombre.trim().charAt(0).toUpperCase();
    const b = apellidos.trim().charAt(0).toUpperCase();
    return `${a}${b}`;
}

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
    const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
    const conversaciones = useChatYAStore((s) => s.conversaciones);
    const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);

    // ─── Bloqueo de usuario (sistema reusado de ChatYA) ───────────────────────
    // El bloqueo es BIDIRECCIONAL en backend: si A bloquea a B, ninguno puede
    // mensajear al otro (existeBloqueo() chequea ambas direcciones).
    const bloqueados = useChatYAStore((s) => s.bloqueados);
    const cargarBloqueados = useChatYAStore((s) => s.cargarBloqueados);
    const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
    const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);

    // ─── Contactos (sistema de agenda persistente de ChatYA) ──────────────────
    // Antes esto era un "follow social" via useVotos — quedó deprecado porque
    // no tenía efecto real en la UX (no aparecía en la agenda del chat). Ahora
    // se conecta al sistema real de `chat_contactos`: agregar/quitar persiste
    // en BD y aparece de inmediato en la lista de contactos del chat.
    const contactos = useChatYAStore((s) => s.contactos);
    const cargarContactos = useChatYAStore((s) => s.cargarContactos);
    const agregarContacto = useChatYAStore((s) => s.agregarContacto);
    const eliminarContacto = useChatYAStore((s) => s.eliminarContacto);

    const [tabActiva, setTabActiva] = useState<'activa' | 'vendida'>('activa');
    const [accionBloqueoEnCurso, setAccionBloqueoEnCurso] = useState(false);
    const [accionContactoEnCurso, setAccionContactoEnCurso] = useState(false);

    const { data: perfil, isLoading: cargandoPerfil, isError } =
        useVendedorMarketplace(usuarioId);

    const esVendedor =
        !!perfil &&
        (perfil.kpis.publicacionesActivas > 0 || perfil.kpis.vendidos > 0);

    const { data: publicaciones, isFetching: cargandoPublicaciones } =
        useVendedorPublicaciones(esVendedor ? usuarioId : undefined, tabActiva);

    // ─── Estado online REAL via Socket.io (patrón ChatYA) ─────────────────────
    // Pide al servidor el estado actual del usuario perfilado y queda suscrito
    // a updates en `useChatYAStore.estadosUsuarios[usuarioId]`. El servidor
    // emite `chatya:estado-usuario` cuando cambia (conectar/ausentar/desconectar).
    const estadoUsuario = useChatYAStore((s) =>
        usuarioId ? s.estadosUsuarios[usuarioId] : undefined,
    );
    useEffect(() => {
        if (!usuarioId || !perfil) return;
        // No nos consultamos a nosotros mismos (sería ruido).
        if (usuarioActual?.id === usuarioId) return;
        const cancelar = emitirCuandoConectado('chatya:consultar-estado', usuarioId);
        return cancelar;
    }, [usuarioId, perfil, usuarioActual?.id]);

    // ─── Cargar lista de bloqueados al montar ─────────────────────────────────
    useEffect(() => {
        if (!usuarioActual) return;
        cargarBloqueados();
    }, [usuarioActual, cargarBloqueados]);

    // ─── Cargar lista de contactos personales al montar ──────────────────────
    // Necesario para saber si el perfilado ya está en la agenda del usuario
    // actual (define el estado del botón "Agregar a contactos").
    useEffect(() => {
        if (!usuarioActual) return;
        cargarContactos('personal');
    }, [usuarioActual, cargarContactos]);

    // Si el usuario perfilado está bloqueado por el actual. La P3 siempre
    // perfila a una persona — usamos el discriminador 'usuario' del bloqueo.
    const estaBloqueado =
        !!usuarioId &&
        bloqueados.some(
            (b) => b.tipo === 'usuario' && b.bloqueadoId === usuarioId,
        );

    // Si el usuario perfilado ya es contacto del actual (agenda personal).
    // La P3 siempre perfila a una persona en modo personal — sin sucursal.
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

    // Botón ← centralizado en el hook `useVolverAtras` — respeta historial
    // interno (idéntico a flecha nativa) con fallback a `/marketplace`
    // cuando se entra por URL directa.
    const handleVolver = useVolverAtras('/marketplace');

    const handleToggleBloqueo = async () => {
        if (!perfil || !usuarioActual || accionBloqueoEnCurso) return;
        if (usuarioActual.id === perfil.id) {
            notificar.advertencia('No puedes bloquearte a ti mismo');
            return;
        }
        setAccionBloqueoEnCurso(true);
        try {
            if (estaBloqueado) {
                const ok = await desbloquearUsuario(perfil.id);
                if (ok) {
                    notificar.exito(`Has desbloqueado a ${perfil.nombre}`);
                } else {
                    notificar.error('No se pudo desbloquear. Intenta de nuevo.');
                }
            } else {
                const ok = await bloquearUsuario({ tipo: 'usuario', bloqueadoId: perfil.id });
                if (ok) {
                    notificar.exito(`Has bloqueado a ${perfil.nombre}`);
                } else {
                    notificar.error('No se pudo bloquear. Intenta de nuevo.');
                }
            }
        } finally {
            setAccionBloqueoEnCurso(false);
        }
    };

    // ─── Toggle agregar/quitar de contactos (sistema real de ChatYA) ─────────
    // Mismo patrón que `PanelInfoContacto` y `VentanaChat`: pasa display
    // (nombre/avatar) para que la actualización optimista del store muestre
    // los datos correctos antes de que llegue la respuesta del backend.
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

    const handleWhatsApp = () => {
        if (!perfil?.telefono) return;
        const numero = perfil.telefono.replace(/[^\d]/g, '');
        const mensaje = `Hola ${perfil.nombre}, vi tu perfil en AnunciaYA`;
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEnviarMensaje = async () => {
        if (!perfil) return;
        if (!usuarioActual) {
            notificar.advertencia('Inicia sesión para enviar un mensaje');
            return;
        }

        // Si las conversaciones aún no están cargadas, las cargamos para
        // poder buscar duplicados antes de abrir un chat temporal nuevo.
        // (Mismo patrón que ListaConversaciones.handleChatDesdeContacto.)
        let convs = conversaciones;
        if (convs.length === 0) {
            await cargarConversaciones('personal');
            convs = useChatYAStore.getState().conversaciones;
        }

        // Buscar conversación existente con este usuario en modo personal
        // (sin negocio asociado — es chat persona↔persona).
        const convExistente = convs.find(
            (c) =>
                c.otroParticipante?.id === perfil.id &&
                !c.otroParticipante?.negocioNombre,
        );

        if (convExistente) {
            // Ya existía: abrir esa conversación (con su historial).
            abrirConversacion(convExistente.id);
        } else {
            // Primer contacto: abrir chat temporal sin contexto. La conversación
            // se materializa al enviar el primer mensaje. No sembramos card de
            // "Vienes del perfil de X" — se decidió que ese contexto no aporta
            // valor real (el iniciador ya sabe de dónde viene; el receptor no
            // gana nada con saber el medio). Las cards de contexto solo aplican
            // a artículos/ofertas específicas, no a contacto desde perfil.
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
                    contextoTipo: 'directo',
                },
            });
        }
        abrirChatYA();
    };

    if (cargandoPerfil) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !perfil) {
        return <Estado404 onVolver={() => navigate('/marketplace')} />;
    }

    const esUnoMismo = usuarioActual?.id === perfil.id;
    const articulos = publicaciones?.data ?? [];
    const totalActivos = perfil.kpis.publicacionesActivas;
    const totalVendidos = perfil.kpis.vendidos;
    const totalPublicacionesTab = tabActiva === 'activa' ? totalActivos : totalVendidos;
    const respondeRapido = perfil.kpis.tiempoRespuesta === '<1h';

    // Estado de presencia: 'conectado' | 'ausente' | 'desconectado' | undefined
    const estadoPresencia = estadoUsuario?.estado;

    return (
        <div data-testid="pagina-perfil-vendedor" className="min-h-full">
            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — Identidad teal del MarketPlace
                Replica patrón de PaginaMarketplace: fondo negro + glow teal
                sutil + grid pattern. El título "Perfil" lleva un icono
                gradient teal antes para tener coherencia visual con el resto
                del módulo (Market<teal>Place</teal> · Card<teal>YA</teal>).
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-30">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.07) 0%, transparent 50%)',
                            }}
                        />
                        {/* Grid pattern sutil */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        {/* Contenido del header — patrón MP:
                            izquierda: [← volver][icono teal][título] juntos
                            derecha: [menú] */}
                        <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5">
                            {/* Bloque izquierdo: volver + icono + Perfil | Nombre */}
                            <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                    data-testid="btn-volver-perfil"
                                    onClick={handleVolver}
                                    aria-label="Volver"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                                >
                                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                    }}
                                >
                                    <BadgeCheck
                                        className="h-[18px] w-[18px] text-black"
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <span className="ml-1.5 shrink-0 text-2xl font-extrabold tracking-tight text-white">
                                    Per<span className="text-teal-400">fil</span>
                                </span>

                                {/* Separador vertical */}
                                <span
                                    aria-hidden
                                    className="ml-2 h-7 w-[1.5px] shrink-0 rounded-full bg-white/50"
                                />

                                {/* Nombre del usuario (truncado en móvil si excede) */}
                                <span className="ml-1 min-w-0 truncate text-sm font-semibold text-white/85 lg:text-base">
                                    {perfil.nombre} {perfil.apellidos}
                                </span>
                            </div>

                            {/* Bloque derecho — botón Bloquear/Desbloquear inline.
                                Se oculta cuando el perfil es el del usuario
                                actual (no puedes bloquearte a ti mismo). */}
                            {!esUnoMismo && (
                                <Tooltip
                                    text={
                                        estaBloqueado
                                            ? 'Desbloquear usuario'
                                            : 'Bloquear usuario'
                                    }
                                    position="bottom"
                                    className="hidden lg:block"
                                >
                                    <button
                                        data-testid="btn-toggle-bloqueo"
                                        onClick={handleToggleBloqueo}
                                        disabled={accionBloqueoEnCurso}
                                        aria-label={
                                            estaBloqueado
                                                ? 'Desbloquear usuario'
                                                : 'Bloquear usuario'
                                        }
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-60 lg:cursor-pointer lg:hover:bg-white/10 ${
                                            estaBloqueado
                                                ? 'text-red-400 lg:hover:text-red-300'
                                                : 'text-white/50 lg:hover:text-white'
                                        }`}
                                    >
                                        {estaBloqueado ? (
                                            <ShieldOff
                                                className="h-5 w-5"
                                                strokeWidth={2.5}
                                            />
                                        ) : (
                                            <Ban
                                                className="h-5 w-5"
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                <div className="px-3 py-5 lg:px-0 lg:py-8">

                    <HeroCard
                        perfil={perfil}
                        esVendedor={esVendedor}
                        esUnoMismo={esUnoMismo}
                        estaBloqueado={estaBloqueado}
                        respondeRapido={respondeRapido}
                        estadoPresencia={estadoPresencia}
                        totalActivos={totalActivos}
                        totalVendidos={totalVendidos}
                        esContacto={esContacto}
                        accionContactoEnCurso={accionContactoEnCurso}
                        onToggleContacto={handleToggleContacto}
                        onWhatsApp={handleWhatsApp}
                        onEnviarMensaje={handleEnviarMensaje}
                    />

                    {esVendedor && (
                        <div className="mt-6">
                            <TabsSegmented
                                tabActiva={tabActiva}
                                totalActivos={totalActivos}
                                totalVendidos={totalVendidos}
                                onChange={setTabActiva}
                            />

                            <div className="mt-4">
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
                                        className="grid grid-cols-2 items-start gap-3 lg:grid-cols-4 lg:gap-4 2xl:grid-cols-5"
                                    >
                                        {articulos.map((a) =>
                                            tabActiva === 'vendida' ? (
                                                <CardConOverlayVendido
                                                    key={a.id}
                                                    articulo={aFeed(a)}
                                                />
                                            ) : (
                                                <CardArticulo
                                                    key={a.id}
                                                    articulo={aFeed(a)}
                                                    variant="compacta"
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

// =============================================================================
// HERO CARD
// =============================================================================

interface HeroCardProps {
    perfil: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
        ciudad: string | null;
        miembroDesde: string;
        telefono: string | null;
        kpis: {
            publicacionesActivas: number;
            vendidos: number;
            tiempoRespuesta: string;
        };
    };
    esVendedor: boolean;
    esUnoMismo: boolean;
    estaBloqueado: boolean;
    respondeRapido: boolean;
    estadoPresencia: 'conectado' | 'ausente' | 'desconectado' | undefined;
    totalActivos: number;
    totalVendidos: number;
    esContacto: boolean;
    accionContactoEnCurso: boolean;
    onToggleContacto: () => void;
    onWhatsApp: () => void;
    onEnviarMensaje: () => void;
}

function HeroCard({
    perfil,
    esVendedor,
    esUnoMismo,
    estaBloqueado,
    respondeRapido,
    estadoPresencia,
    totalActivos,
    totalVendidos,
    esContacto,
    accionContactoEnCurso,
    onToggleContacto,
    onWhatsApp,
    onEnviarMensaje,
}: HeroCardProps) {
    return (
        <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-linear-to-b from-white to-slate-300 shadow-md">
            {/* Línea de acento brand superior (4px) */}
            <div className="h-1" style={{ background: BRAND_ACCENT }} />

            <div className="flex flex-col items-center gap-3.5 p-4 text-center lg:flex-row lg:items-center lg:gap-6 lg:p-6 lg:text-left">

                {/* ─── Avatar con ring gradient + status dot bottom-right ──── */}
                <AvatarConAdornos
                    perfil={perfil}
                    estadoPresencia={estadoPresencia}
                />

                {/* ─── Identidad ───────────────────────────────────────────── */}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                        <h1
                            data-testid="nombre-vendedor"
                            className="text-xl font-extrabold tracking-tight text-slate-900 lg:text-xl 2xl:text-2xl"
                        >
                            {perfil.nombre} {perfil.apellidos}
                        </h1>
                        {esVendedor && (
                            <BadgeCheck
                                className="h-5 w-5 shrink-0 text-blue-600"
                                strokeWidth={2.5}
                                aria-label="Vendedor con publicaciones"
                            />
                        )}
                        {/* Botón Agregar/Quitar contacto — botón circular
                            solo icono al lado del nombre (estética coherente
                            con el botón Bloquear del header). El estado se
                            calcula contra `chat_contactos` (sistema real de
                            agenda de ChatYA — antes era un follow social
                            fantasma vía useVotos que no tenía efecto en UX).
                            Tooltip solo lg+ por la regla TC-19. */}
                        {!esUnoMismo && (
                            <Tooltip
                                text={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                                position="bottom"
                                className="hidden lg:block"
                            >
                                <button
                                    data-testid="btn-agregar-contacto"
                                    onClick={onToggleContacto}
                                    disabled={accionContactoEnCurso}
                                    aria-pressed={esContacto}
                                    aria-label={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform disabled:opacity-60 lg:h-9 lg:w-9 lg:cursor-pointer lg:hover:scale-105 lg:active:scale-95 ${
                                        esContacto
                                            ? 'bg-emerald-500'
                                            : 'bg-blue-600'
                                    }`}
                                >
                                    {esContacto ? (
                                        <UserCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} />
                                    ) : (
                                        <UserPlus className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} />
                                    )}
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-base font-medium text-slate-600 lg:justify-start lg:text-sm 2xl:text-base">
                        {perfil.ciudad && (
                            <>
                                <span className="font-semibold">{perfil.ciudad}</span>
                                <span className="h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                            </>
                        )}
                        <span>{formatearMiembroDesde(perfil.miembroDesde)}</span>
                    </p>

                    {esVendedor && respondeRapido && (
                        <div className="mt-2.5 flex justify-center lg:justify-start">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 lg:text-xs 2xl:text-sm">
                                <Zap className="h-4 w-4" strokeWidth={2.5} />
                                Suele responder rápido
                            </span>
                        </div>
                    )}
                </div>

                {/* ─── KPIs (2 líneas) ─────────────────────────────────────── */}
                {esVendedor && (
                    <KpiFila
                        activas={totalActivos}
                        vendidos={totalVendidos}
                        tiempoRespuesta={perfil.kpis.tiempoRespuesta}
                    />
                )}

                {/* ─── Botones contacto apilados verticalmente ─────────────── */}
                {/* Cuando hay bloqueo, ocultamos los botones de contacto (el
                    bloqueo es bidireccional en backend: tampoco enviarías
                    mensajes). El banner inferior explica el estado. */}
                {!esUnoMismo && !estaBloqueado && (
                    <div className="flex w-full flex-row gap-2 lg:w-auto lg:shrink-0 lg:flex-col">
                        {/* Mismo estilo que BarraContacto (P2 detalle):
                            WhatsApp con MessageCircle icon en gradient brand
                            (#22C55E → #15803D) y ChatYA con Dark Gradient
                            slate + logo oficial. Coherencia visual entre P2
                            y perfil del vendedor. */}
                        {perfil.telefono && (
                            <button
                                data-testid="btn-whatsapp-vendedor"
                                onClick={onWhatsApp}
                                aria-label="Contactar por WhatsApp"
                                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-[#22C55E] to-[#15803D] px-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01] lg:h-11 lg:flex-none lg:gap-2.5 lg:px-4 lg:cursor-pointer lg:min-w-[180px]"
                            >
                                <MessageCircle className="h-5 w-5 shrink-0 lg:h-6 lg:w-6" strokeWidth={2.5} />
                                WhatsApp
                            </button>
                        )}
                        <button
                            data-testid="btn-chatya-vendedor"
                            onClick={onEnviarMensaje}
                            aria-label="Contactar por ChatYA"
                            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-3 text-white shadow-md transition-transform hover:scale-[1.01] lg:h-11 lg:flex-none lg:px-4 lg:cursor-pointer lg:min-w-[180px]"
                        >
                            <img
                                src="/ChatYA.webp"
                                alt="ChatYA"
                                className="h-7 w-auto shrink-0 object-contain lg:h-9"
                            />
                        </button>
                    </div>
                )}
            </div>

            {/* Banner de bloqueado — se muestra cuando hay relación de bloqueo.
                Explica el estado y por qué no aparecen los botones de chat. */}
            {!esUnoMismo && estaBloqueado && (
                <div
                    data-testid="banner-usuario-bloqueado"
                    className="flex items-center gap-3 border-t-2 border-red-200 bg-red-50 px-5 py-3 lg:px-6"
                >
                    <Ban className="h-5 w-5 shrink-0 text-red-600" strokeWidth={2.5} />
                    <p className="text-sm font-semibold text-red-700 lg:text-[13px] 2xl:text-sm">
                        Has bloqueado a este usuario.{' '}
                        <span className="font-medium text-red-600">
                            No podrán enviarse mensajes mutuamente.
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// AVATAR CON ADORNOS — ring gradient + status dot
// =============================================================================

interface AvatarConAdornosProps {
    perfil: HeroCardProps['perfil'];
    estadoPresencia: 'conectado' | 'ausente' | 'desconectado' | undefined;
}

function AvatarConAdornos({
    perfil,
    estadoPresencia,
}: AvatarConAdornosProps) {
    const iniciales = obtenerIniciales(perfil.nombre, perfil.apellidos);

    // Color del status dot según estado de presencia.
    // - conectado → verde (emerald)
    // - ausente   → ámbar
    // - desconectado / undefined → no se muestra
    const dotColor =
        estadoPresencia === 'conectado'
            ? 'bg-emerald-500'
            : estadoPresencia === 'ausente'
                ? 'bg-amber-400'
                : null;

    return (
        <div className="relative shrink-0">
            {/* Ring gradient brand alrededor (estilo Instagram story) */}
            <div
                className="rounded-full p-[3px] shadow-md"
                style={{ background: BRAND_ACCENT_DIAGONAL }}
            >
                {/* Anillo blanco interior — separación visual entre gradient y avatar */}
                <div className="rounded-full bg-white p-[2px]">
                    <div className="h-[64px] w-[64px] overflow-hidden rounded-full bg-white lg:h-[84px] lg:w-[84px]">
                        {perfil.avatarUrl ? (
                            <img
                                src={perfil.avatarUrl}
                                alt={`Avatar de ${perfil.nombre}`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div
                                className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                                }}
                            >
                                {iniciales}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status dot — bottom-right, ligeramente empalmado sobre el
                círculo del avatar. El FAB Seguir se movió al lado del
                nombre, por eso esta esquina queda libre. */}
            {dotColor && (
                <span
                    aria-label={
                        estadoPresencia === 'conectado'
                            ? 'En línea'
                            : 'Ausente'
                    }
                    title={
                        estadoPresencia === 'conectado'
                            ? 'En línea'
                            : 'Ausente'
                    }
                    className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white lg:h-4 lg:w-4 lg:bottom-1.5 lg:right-1.5 ${dotColor}`}
                />
            )}
        </div>
    );
}

// =============================================================================
// KPI FILA — 2 líneas (icono+valor inline arriba, label debajo)
// =============================================================================

interface KpiFilaProps {
    activas: number;
    vendidos: number;
    tiempoRespuesta: string;
}

function KpiFila({ activas, vendidos, tiempoRespuesta }: KpiFilaProps) {
    return (
        // Glassmorphism: fondo blanco translúcido + backdrop-blur + borde claro.
        // Sobre el gradient del Hero (blanco→slate-100), el glass se nota:
        // los KPIs flotan visualmente con un acabado más rico.
        <div
            data-testid="kpis-vendedor"
            className="flex w-full shrink-0 divide-x divide-white/50 overflow-hidden rounded-xl border-2 border-white/70 bg-white/50 shadow-sm backdrop-blur-md lg:w-auto"
        >
            <Kpi
                icono={<Package className="h-5 w-5 shrink-0" strokeWidth={2} />}
                label="Publicaciones"
                valor={activas.toString()}
            />
            <Kpi
                icono={<ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={2} />}
                label="Vendidos"
                valor={vendidos.toString()}
            />
            <Kpi
                icono={<Clock className="h-5 w-5 shrink-0" strokeWidth={2} />}
                label="Respuesta"
                valor={tiempoRespuesta}
            />
        </div>
    );
}

interface KpiProps {
    icono: React.ReactNode;
    label: string;
    valor: string;
}

function Kpi({ icono, label, valor }: KpiProps) {
    return (
        // En móvil: padding ajustado y tamaños ligeramente menores para que
        // los 3 KPIs (Publicaciones / Vendidos / Respuesta) quepan en el
        // ancho del celular sin cortar la palabra más larga ("Publicaciones").
        // En desktop se conservan los tamaños originales.
        <div className="min-w-0 flex-1 px-2 py-2.5 text-center lg:min-w-[112px] lg:px-6">
            {/* Línea 1: icono + valor inline */}
            <div className="flex items-center justify-center gap-1 text-slate-800 lg:gap-1.5">
                <span className="text-slate-500">{icono}</span>
                <span className="text-lg font-bold lg:text-lg 2xl:text-xl">
                    {valor}
                </span>
            </div>
            {/* Línea 2: label */}
            <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-600 lg:text-[11px] 2xl:text-sm">
                {label}
            </div>
        </div>
    );
}

// =============================================================================
// TABS — segmented control con Dark Gradient (TC-7), counter círculo
// =============================================================================

interface TabsSegmentedProps {
    tabActiva: 'activa' | 'vendida';
    totalActivos: number;
    totalVendidos: number;
    onChange: (tab: 'activa' | 'vendida') => void;
}

function TabsSegmented({
    tabActiva,
    totalActivos,
    totalVendidos,
    onChange,
}: TabsSegmentedProps) {
    return (
        <div
            role="tablist"
            className="flex gap-1 rounded-xl border-2 border-slate-300 bg-slate-200 p-1 shadow-sm"
        >
            <TabPill
                activa={tabActiva === 'activa'}
                icono={<Package className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                label="Publicaciones"
                count={totalActivos}
                onClick={() => onChange('activa')}
                testId="tab-publicaciones"
            />
            <TabPill
                activa={tabActiva === 'vendida'}
                icono={<ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                label="Vendidos"
                count={totalVendidos}
                onClick={() => onChange('vendida')}
                testId="tab-vendidos"
            />
        </div>
    );
}

interface TabPillProps {
    activa: boolean;
    icono: React.ReactNode;
    label: string;
    count: number;
    onClick: () => void;
    testId: string;
}

function TabPill({ activa, icono, label, count, onClick, testId }: TabPillProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="tab"
            aria-selected={activa}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold lg:cursor-pointer lg:text-[13px] 2xl:text-sm ${
                activa
                    ? 'text-white shadow-md'
                    : 'text-slate-700 lg:hover:bg-slate-300'
            }`}
            style={activa ? { background: DARK_GRADIENT } : undefined}
        >
            {icono}
            {label}
            {/* Counter como círculo full-rounded */}
            <span
                className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    activa
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-300 text-slate-700'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

// =============================================================================
// CARDS Y ESTADOS
// =============================================================================

interface CardConOverlayVendidoProps {
    articulo: ArticuloFeed;
}

function CardConOverlayVendido({ articulo }: CardConOverlayVendidoProps) {
    return (
        <div className="relative">
            <CardArticulo articulo={articulo} variant="compacta" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/60">
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
    // Configuración por tab — icono, título y cuerpo cambian según contexto.
    // Patrón visual unificado con MarketPlace, Negocios, Ofertas, Mis Guardados:
    // halos animate-ping + sparkles decorativos + icono con gradient brand teal.
    const config =
        tab === 'activa'
            ? {
                  icono: (
                      <Package className="h-11 w-11 text-white" strokeWidth={2} />
                  ),
                  titulo: esUnoMismo
                      ? 'Aún no tienes publicaciones'
                      : 'Sin publicaciones activas',
                  cuerpo:
                      totalTab > 0
                          ? 'No hay más resultados para mostrar.'
                          : esUnoMismo
                              ? 'Publica tu primer artículo y empieza a vender hoy mismo.'
                              : 'Cuando publique algo nuevo, aparecerá aquí.',
              }
            : {
                  icono: (
                      <ShoppingBag
                          className="h-11 w-11 text-white"
                          strokeWidth={2}
                      />
                  ),
                  titulo: esUnoMismo
                      ? 'Aún no has vendido nada'
                      : 'Sin ventas registradas',
                  cuerpo:
                      totalTab > 0
                          ? 'No hay más resultados para mostrar.'
                          : 'Cuando se complete una venta, aparecerá aquí.',
              };

    return (
        <div
            data-testid={`estado-vacio-${tab}`}
            className="relative flex flex-col items-center px-6 pt-10 pb-12 text-center lg:pt-16 lg:pb-20"
        >
            {/* Sparkles decorativos */}
            <Sparkles
                className="absolute left-8 top-2 h-5 w-5 animate-pulse text-teal-400/70"
                style={{ animationDuration: '2.5s' }}
            />
            <Sparkles
                className="absolute right-10 top-10 h-4 w-4 animate-pulse text-teal-300/70"
                style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
            />

            {/* Icono con halos concéntricos pulsantes */}
            <div className="relative mb-6">
                <div
                    className="absolute inset-0 -m-5 animate-ping rounded-full bg-teal-300/40"
                    style={{ animationDuration: '2.4s' }}
                />
                <div
                    className="absolute inset-0 -m-2 animate-ping rounded-full bg-teal-400/40"
                    style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
                />
                <div
                    className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
                    style={{
                        background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                    }}
                >
                    {config.icono}
                </div>
            </div>

            {/* Títulos y descripción */}
            <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                {config.titulo}
            </h3>
            <p className="max-w-sm text-base text-slate-600">{config.cuerpo}</p>
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
                className="flex max-w-md flex-col items-center rounded-2xl border-2 border-slate-300 bg-white p-8 text-center shadow-md"
            >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <AlertCircle className="h-8 w-8 text-slate-600" strokeWidth={1.5} />
                </div>
                <h2 className="mb-2 text-lg font-bold text-slate-900">
                    Usuario no encontrado
                </h2>
                <p className="mb-5 text-sm font-medium text-slate-600">
                    Este usuario no existe o ya no está disponible.
                </p>
                <button
                    onClick={onVolver}
                    className="inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow-md lg:cursor-pointer lg:hover:brightness-110"
                    style={{ background: DARK_GRADIENT }}
                >
                    Volver al MarketPlace
                </button>
            </div>
        </div>
    );
}

export default PaginaPerfilVendedor;
