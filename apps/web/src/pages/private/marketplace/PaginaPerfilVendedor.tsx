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
    ShoppingBag,
    BadgeCheck,
    Ban,
    ShieldOff,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Package = (p: IconoWrapperProps) => <Icon icon={ICONOS.producto} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

/**
 * Logo de WhatsApp brand — SVG inline reutilizado de `BarraContacto.tsx`.
 * Color verde solid (`text-green-500`) heredado por `fill="currentColor"`.
 * Sprint 9.3 (iteración): el botón "WhatsApp" del hero del perfil ahora
 * usa este logo brand en vez del icono lucide genérico, igual que en el
 * detalle de la publicación.
 */
const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg
        className={`${className ?? 'h-7 w-7'} text-green-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);
import { useAuthStore } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
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

function formatearMiembroDesde(timestamp: string): string {
    // Sprint 9.3: el helper retorna SOLO la fecha ("Enero 2026"). El
    // prefijo "Miembro desde:" lo agrega el JSX para evitar duplicación.
    try {
        const d = parsearFechaPostgres(timestamp);
        if (isNaN(d.getTime())) return '';
        return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
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
    const iniciarChatDirectoPersona = useIniciarChatDirectoPersona();

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
        await iniciarChatDirectoPersona({
            usuarioId: perfil.id,
            nombre: perfil.nombre,
            apellidos: perfil.apellidos,
            avatarUrl: perfil.avatarUrl,
        });
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
            {/* Header sticky con su PROPIO wrapper `max-w-7xl` (mismo
                patrón que el detalle de MP — `PaginaArticuloMarketplace`).
                El body del perfil vive en su propio wrapper más compacto
                `max-w-[920px]` más abajo. */}
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
                                    Perfil
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

            {/* CONTENEDOR — max 920px para igualar al feed de MP */}
            <div className="lg:mx-auto lg:max-w-[920px] lg:px-4">
                <div className="px-3 py-5 lg:px-0 lg:py-8">

                    <HeroCard
                        perfil={perfil}
                        esVendedor={esVendedor}
                        esUnoMismo={esUnoMismo}
                        estaBloqueado={estaBloqueado}
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
                                        className="grid grid-cols-2 items-start gap-3 lg:grid-cols-3 lg:gap-4 2xl:grid-cols-4"
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
    estadoPresencia,
    totalActivos,
    totalVendidos,
    esContacto,
    accionContactoEnCurso,
    onToggleContacto,
    onWhatsApp,
    onEnviarMensaje,
}: HeroCardProps) {
    const hayAccionesContacto = !esUnoMismo && !estaBloqueado;
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-lg lg:rounded-3xl lg:px-8 lg:py-5">
            {/* ═══════════════════════════════════════════════════════════════
                Layout 2 columnas en desktop (Sprint 9.3 rediseño):
                  · Col izquierda: avatar grande + identidad apilados
                    verticalmente
                  · Col derecha: 3 KPI cards individuales arriba +
                    3 botones (grid 3 cols) abajo
                En móvil se apila vertical. Card wrapper más generoso
                (`p-6`/`lg:p-8`, `rounded-2xl`/`lg:rounded-3xl`).
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
                {/* ── Columna izquierda: avatar + identidad ──────────────────
                    En desktop la identidad va AL LADO del avatar
                    (flex-row); en móvil se apila vertical centrado.
                    Sprint 9.3 (iteración): antes era flex-col siempre
                    y el bloque de identidad caía debajo del avatar
                    incluso en desktop, desperdiciando ancho útil. */}
                <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:items-center lg:gap-5 lg:text-left">
                    <AvatarConAdornos
                        perfil={perfil}
                        estadoPresencia={estadoPresencia}
                    />
                    <div className="flex min-w-0 flex-1 flex-col items-center lg:items-start">
                        {/* Nombre dividido en 2 líneas: nombres arriba,
                            apellidos + badge verificado en la 2ª línea.
                            BadgeCheck invertido: fondo azul (`fill-blue-500`)
                            con palomita blanca (`text-white` sobre el
                            stroke del check), estilo "verified" tipo
                            Twitter/X. */}
                        <h1
                            data-testid="nombre-vendedor"
                            className="text-xl font-extrabold tracking-tight text-slate-950 leading-tight lg:text-2xl"
                        >
                            <span className="block">{perfil.nombre}</span>
                            <span className="flex items-center justify-center gap-1.5 lg:justify-start">
                                {perfil.apellidos}
                                {esVendedor && (
                                    <BadgeCheck
                                        className="h-5 w-5 shrink-0 fill-blue-500 text-white lg:h-6 lg:w-6"
                                        strokeWidth={2.5}
                                        aria-label="Vendedor con publicaciones"
                                    />
                                )}
                            </span>
                        </h1>
                        {/* Ciudad + miembro desde con separación visual
                            mayor del nombre (mt-6/mt-8) para que se
                            perciban como un bloque secundario distinto. */}
                        {perfil.ciudad && (
                            <div className="mt-6 flex items-center gap-1.5 text-base font-medium text-slate-600 lg:mt-8">
                                <MapPin
                                    className="h-4 w-4 shrink-0 text-slate-500"
                                    strokeWidth={2}
                                />
                                {perfil.ciudad}
                            </div>
                        )}
                        <p className="mt-0.5 text-sm font-medium text-slate-500">
                            Miembro desde: {formatearMiembroDesde(perfil.miembroDesde)}
                        </p>
                    </div>
                </div>

                {/* ── Columna derecha: KPIs (3 cards) + botones (3 cols) ───── */}
                <div className="flex flex-col gap-3 lg:gap-4">
                    {esVendedor && (
                        <div
                            data-testid="kpis-vendedor"
                            className="grid grid-cols-2 divide-x-2 divide-slate-300 overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100"
                        >
                            <KpiCard
                                icono={<Package className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={1.75} />}
                                valor={totalActivos.toString()}
                                label="Publicaciones"
                            />
                            <KpiCard
                                icono={<ShoppingBag className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={1.75} />}
                                valor={totalVendidos.toString()}
                                label="Vendidos"
                            />
                        </div>
                    )}

                    {hayAccionesContacto && (
                        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end lg:gap-4">
                            {/* WhatsApp + ChatYA: logos brand INLINE (sin
                                pill, sin texto duplicado) con hover scale.
                                Mismo patrón EXACTO que `BarraContacto.tsx`
                                del detalle de la publicación. */}
                            {perfil.telefono && (
                                <button
                                    type="button"
                                    data-testid="btn-whatsapp-vendedor"
                                    onClick={onWhatsApp}
                                    aria-label="Contactar por WhatsApp"
                                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                                >
                                    <WhatsAppIcon className="h-7 w-7" />
                                </button>
                            )}
                            <button
                                type="button"
                                data-testid="btn-chatya-vendedor"
                                onClick={onEnviarMensaje}
                                aria-label="Enviar mensaje por ChatYA"
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <img
                                    src="/ChatYA.webp"
                                    alt="ChatYA"
                                    className="h-9 w-auto shrink-0 object-contain"
                                />
                            </button>
                            {/* Agregar contacto — icon-only en tonos teal
                                (familia cromática de MarketPlace). Mismo
                                patrón inline que los logos brand (sin
                                fondo, hover scale). Tooltip describe la
                                acción al hover/focus. UserCheck cuando ya
                                es contacto, UserPlus cuando no. */}
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
                                    data-testid="btn-agregar-contacto"
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
                                            className="h-7 w-7 shrink-0 text-sky-600"
                                            strokeWidth={2.25}
                                        />
                                    ) : (
                                        <UserPlus
                                            className="h-7 w-7 shrink-0 text-sky-600"
                                            strokeWidth={2.25}
                                        />
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

            {/* Banner de bloqueado — debajo del grid si aplica. */}
            {!esUnoMismo && estaBloqueado && (
                <div
                    data-testid="banner-usuario-bloqueado"
                    className="mt-5 flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-100 px-4 py-3"
                >
                    <Ban className="h-5 w-5 shrink-0 text-red-700" strokeWidth={2.5} />
                    <p className="text-sm font-semibold text-red-800">
                        Has bloqueado a este usuario.{' '}
                        <span className="font-medium text-red-700">
                            No podrán enviarse mensajes mutuamente.
                        </span>
                    </p>
                </div>
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
// ellas (divide-x-2). Cada celda es solo el contenido centrado.

interface KpiCardProps {
    icono: React.ReactNode;
    valor: string;
    label: string;
}

function KpiCard({ icono, valor, label }: KpiCardProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-center lg:py-2.5">
            <div className="text-xl font-black tracking-tight text-slate-950 leading-none lg:text-2xl">
                {valor}
            </div>
            {/* Label en altas y bajas (Title Case) — Sprint 9.3:
                antes era UPPERCASE con tracking-wider, se cambió a
                Title Case porque se lee más natural en pantalla y
                permite tipografía un punto más grande sin saturar. */}
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 lg:text-base">
                <span className="text-slate-500">{icono}</span>
                {label}
            </div>
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

    // Sprint 9.3 (iteración): avatar simplificado — círculo plano con
    // fondo sky cuando no hay foto. Se removió el ring gradient brand
    // estilo Instagram (era demasiada decoración para un perfil
    // comercial de marketplace; el diseño nuevo prioriza claridad y
    // densidad de información).
    return (
        <div className="relative shrink-0">
            <div className="h-[88px] w-[88px] overflow-hidden rounded-full shadow-md lg:h-[104px] lg:w-[104px]">
                {perfil.avatarUrl ? (
                    <img
                        src={perfil.avatarUrl}
                        alt={`Avatar de ${perfil.nombre}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center text-2xl font-bold text-white lg:text-3xl"
                        style={{
                            // Tonos teal — familia cromática de MarketPlace.
                            background:
                                'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)',
                        }}
                    >
                        {iniciales}
                    </div>
                )}
            </div>

            {/* Status dot — bottom-right, ligeramente empalmado sobre el
                círculo del avatar. */}
            {dotColor && (
                <span
                    aria-label={
                        estadoPresencia === 'conectado' ? 'En línea' : 'Ausente'
                    }
                    title={
                        estadoPresencia === 'conectado' ? 'En línea' : 'Ausente'
                    }
                    className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white lg:h-4 lg:w-4 lg:bottom-1.5 lg:right-1.5 ${dotColor}`}
                />
            )}
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
            className="flex gap-8 border-b-2 border-slate-300"
        >
            <TabUnderline
                activa={tabActiva === 'activa'}
                icono={<Package className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                label="Publicaciones"
                count={totalActivos}
                onClick={() => onChange('activa')}
                testId="tab-publicaciones"
            />
            <TabUnderline
                activa={tabActiva === 'vendida'}
                icono={<ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                label="Vendidos"
                count={totalVendidos}
                onClick={() => onChange('vendida')}
                testId="tab-vendidos"
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

/**
 * Tab underline minimalista: texto + counter inline, sin contenedor de fondo.
 * Tab activa lleva texto teal-700 + underline teal-500 (4px) absoluto al
 * fondo, posicionado sobre el `border-b-2 slate-200` del tablist para tapar
 * esa zona. Tab inactiva en slate-500 con hover slate-700.
 * Patrón B2B clásico (Linear/Stripe/Notion).
 */
function TabUnderline({ activa, icono, label, count, onClick, testId }: TabUnderlineProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="tab"
            aria-selected={activa}
            className={`relative -mb-0.5 inline-flex items-center gap-2.5 border-b-2 px-1 pb-3.5 pt-1.5 text-base font-bold transition-colors lg:cursor-pointer lg:text-lg ${
                activa
                    ? 'border-teal-500 text-teal-700'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
        >
            {icono}
            <span>{label}</span>
            <span
                className={`text-sm font-bold tabular-nums ${
                    activa ? 'text-teal-700' : 'text-slate-500'
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
