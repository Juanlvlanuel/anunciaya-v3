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

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePortalTarget } from '../../../hooks/usePortalTarget';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useAbrirWhatsApp } from '../../../hooks/useAbrirWhatsApp';
import { ModalAuthRequerido } from '../../../components/compartir/ModalAuthRequerido';
import { Modal } from '../../../components/ui/Modal';
import { ModalBottom } from '../../../components/ui/ModalBottom';
import { InputTelefono, normalizarTelefono } from '../../../components/ui/InputTelefono';
import { obtenerFotoPortada } from '../../../utils/marketplace';
import { useApartarArticulo } from '../../../hooks/queries/useMarketplace';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import {
    ChevronLeft,
    UserPlus,
    UserCheck,
    AlertCircle,
    PackageX,
    ShoppingBag,
    ShoppingCart,
    BadgeCheck,
    Ban,
    ShieldOff,
    Ticket,
    ImageIcon,
    Lock,
    Check,
    Trash2,
    X,
} from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
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
import { useAuthStore, type Usuario } from '../../../stores/useAuthStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import {
    useVendedorMarketplace,
    useVendedorPublicaciones,
} from '../../../hooks/queries/useMarketplace';
import { useDinamicasDeOrganizador } from '../../../hooks/queries/useDinamicas';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { CardDinamicaCompacta } from '../../../components/dinamicas/CardDinamicaCompacta';
import { Spinner } from '../../../components/ui/Spinner';
import Tooltip from '../../../components/ui/Tooltip';
import { ModalImagenes } from '../../../components/ui/ModalImagenes';
import { DropdownCompartir } from '../../../components/compartir';
import { notificar } from '../../../utils/notificaciones';
import { parsearFechaPostgres } from '../../../utils/marketplace';
import { emitirCuandoConectado } from '../../../services/socketService';
import type { ArticuloMarketplace, ArticuloFeed } from '../../../types/marketplace';
import { HeaderPublico } from '../../../components/public/HeaderPublico';
import { FooterPublico } from '../../../components/public/FooterPublico';

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
    const location = useLocation();
    // Mi Catálogo (2026-08-12) — link público compartible sin cuenta (ej. un
    // live de venta). Solo MarketPlace en modo 'vendo' + botón Apartar; sin
    // bloqueo/contactos/Dinámicas (no aplican a un visitante sin sesión).
    // La ruta PRIVADA (/marketplace/usuario/:id) sigue exactamente igual que
    // antes — perfil neutral completo para navegación interna de la app.
    if (location.pathname.startsWith('/p/marketplace')) {
        return <MiCatalogoPublico />;
    }
    return <PerfilVendedorPrivado />;
}

function PerfilVendedorPrivado() {
    const { usuarioId } = useParams<{ usuarioId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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

    // Grupo de nivel superior: MarketPlace vs Dinámicas. Dentro de
    // MarketPlace, un sub-filtro aparte para En venta/Vendidas — antes eran
    // 3 tabs al mismo nivel (Publicaciones/Vendidos/Dinámicas organizadas),
    // pero mezclaba dos jerarquías distintas (sección vs estado del artículo).
    // Inicial desde `?tab=dinamicas` — ej. al llegar desde el link "ver
    // organizador" de una Dinámica, que quiere aterrizar directo en esa tab
    // en vez del default MarketPlace.
    const [grupoActivo, setGrupoActivo] = useState<'marketplace' | 'dinamicas'>(
        searchParams.get('tab') === 'dinamicas' ? 'dinamicas' : 'marketplace',
    );
    // 2026-08-15: separa por modo en vez de solo por estado — "Catálogo"
    // (vendo) y "Busco" (demandas) ya no se mezclan en un solo chip "En
    // venta". "Vendidas" solo se ofrece al dueño del perfil (ver JSX abajo).
    const [subFiltroMP, setSubFiltroMP] = useState<'vendo' | 'busco' | 'vendida'>('vendo');
    // Sub-filtro del grupo Dinámicas — mismo patrón que subFiltroMP, pero
    // client-side: a diferencia de MP (server-side por `subFiltroMP`), acá
    // ya tenemos las Dinámicas completas en una sola query (sin paginar por
    // estado), así que separar Activas/Cerradas es un filter() local.
    const [subFiltroDinamicas, setSubFiltroDinamicas] = useState<'activa' | 'cerrada'>('activa');
    const [accionBloqueoEnCurso, setAccionBloqueoEnCurso] = useState(false);
    const [accionContactoEnCurso, setAccionContactoEnCurso] = useState(false);
    // Apartar in-app (2026-08-12, selección múltiple 2026-08-15): mismo panel
    // que Mi Catálogo público, pero navegando dentro de la app — un usuario
    // logueado que llega al perfil de un vendedor (feed, comentarios, etc.)
    // también puede apartar sin salir, con sus datos autocompletados.
    const [seleccionadosApartar, setSeleccionadosApartar] = useState<Set<string>>(new Set());
    // Click en la card (fuera del círculo de selección) — detalle estilo
    // ModalDetalleItem de Negocios, adaptado a MarketPlace.
    const [articuloDetalle, setArticuloDetalle] = useState<ArticuloMarketplace | null>(null);

    const { data: perfil, isLoading: cargandoPerfil, isError } =
        useVendedorMarketplace(usuarioId);

    const esVendedor =
        !!perfil &&
        (perfil.kpis.publicacionesActivas > 0 || perfil.kpis.vendidos > 0);

    // Solo pide Publicaciones/Vendidos cuando el grupo activo es MarketPlace
    // — evita una request innecesaria mientras se ve el grupo Dinámicas.
    const estadoParaFetch = subFiltroMP === 'vendida' ? 'vendida' : 'activa';
    const modoParaFetch = subFiltroMP === 'vendida' ? undefined : subFiltroMP;
    const { data: publicaciones, isFetching: cargandoPublicaciones } =
        useVendedorPublicaciones(
            esVendedor && grupoActivo === 'marketplace' ? usuarioId : undefined,
            estadoParaFetch,
            undefined,
            modoParaFetch,
        );

    // ─── Dinámicas organizadas — 2do grupo junto a MarketPlace (no una
    // sección aparte). Perfil neutral: el grupo solo aparece si la persona
    // organizó/completó/canceló al menos una. ─────────────────────────────
    const { data: dinamicasOrganizador, isFetching: cargandoDinamicas } =
        useDinamicasDeOrganizador(usuarioId);
    const esOrganizador =
        !!dinamicasOrganizador &&
        (dinamicasOrganizador.dinamicas.length > 0 ||
            dinamicasOrganizador.insignia.completadas > 0 ||
            dinamicasOrganizador.insignia.canceladas > 0);

    // "Activas" agrupa todo lo que sigue en curso (activa/pospuesta/en_sorteo);
    // "Cerradas" es solo lo ya resuelto. `cancelada` nunca llega a esta lista
    // (ver `listarDinamicasDeOrganizador` sin `incluirCanceladas`).
    const dinamicasActivas = dinamicasOrganizador?.dinamicas.filter((d) => d.estado !== 'cerrada') ?? [];
    const dinamicasCerradas = dinamicasOrganizador?.dinamicas.filter((d) => d.estado === 'cerrada') ?? [];
    const dinamicasFiltradas = subFiltroDinamicas === 'activa' ? dinamicasActivas : dinamicasCerradas;

    // Si la persona NO tiene publicaciones/ventas pero sí organiza
    // Dinámicas, el grupo por defecto ('marketplace') no existiría — cambia
    // a 'dinamicas' apenas se sepa. Solo corre cuando estos booleans cambian
    // (una vez que las queries resuelven), no pelea con clicks del usuario.
    useEffect(() => {
        if (!esVendedor && esOrganizador) {
            setGrupoActivo((actual) => (actual === 'dinamicas' ? actual : 'dinamicas'));
        }
    }, [esVendedor, esOrganizador]);

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
    const cuerpoRef = useScrollAppShell();

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
    const totalActivosVendo = perfil.kpis.publicacionesActivasVendo;
    const totalActivosBusco = perfil.kpis.publicacionesActivasBusco;
    const totalVendidos = perfil.kpis.vendidos;
    const totalPublicacionesTab =
        subFiltroMP === 'vendo' ? totalActivosVendo
        : subFiltroMP === 'busco' ? totalActivosBusco
        : totalVendidos;

    // Estado de presencia: 'conectado' | 'ausente' | 'desconectado' | undefined
    const estadoPresencia = estadoUsuario?.estado;

    return (
        <div data-testid="pagina-perfil-vendedor" className="flex flex-col h-full lg:block lg:h-auto lg:min-h-full">
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
            <div className="shrink-0 z-30 lg:sticky lg:top-0">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.10) 0%, transparent 55%)',
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
                        {/* Línea de acento superior (teal) */}
                        <div
                            className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />
                        {/* Línea de acento inferior (teal) */}
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />

                        {/* Contenido del header — patrón MP:
                            izquierda: [← volver][icono teal][título] juntos
                            derecha: [menú] */}
                        <div className="relative z-10 flex items-center justify-between px-3 pt-4 pb-2.5 lg:px-4 lg:py-2.5 2xl:px-3 2xl:pt-4 2xl:pb-2.5">
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
                                        className="h-[18px] w-[18px] text-white"
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <span className="ml-1.5 shrink-0 text-2xl lg:text-xl 2xl:text-2xl font-extrabold tracking-tight text-white">
                                    {grupoActivo === 'dinamicas' ? 'Dinámicas' : esVendedor ? 'Catálogo' : 'Perfil'}
                                </span>
                            </div>

                            {/* Bloque derecho — compartir el link público de Mi
                                Catálogo (2026-08-12), tanto en tu propio perfil
                                como en el de alguien más que sí tenga catálogo
                                (2026-08-15: reemplaza ahí al botón Bloquear —
                                más útil de entrada; el bloqueo sigue disponible
                                desde el banner de abajo cuando ya está
                                bloqueado). Si es alguien más SIN catálogo
                                (solo comentarista), no hay nada que compartir —
                                se conserva el botón Bloquear como antes. Solo
                                en la tab MarketPlace: el link compartido es
                                el catálogo de venta, nunca incluye Dinámicas
                                — mostrarlo ahí confundiría (las rifas ya
                                tienen su propio share por card). */}
                            {esVendedor && grupoActivo === 'marketplace' && (
                                <Tooltip
                                    text={esUnoMismo ? 'Compartir mi Catálogo' : 'Compartir este catálogo'}
                                    position="bottom"
                                    className="hidden lg:block"
                                >
                                    <DropdownCompartir
                                        url={`${window.location.origin}/p/marketplace/usuario/${perfil.id}`}
                                        texto={`¡Mira ${esUnoMismo ? 'mi' : 'este'} catálogo en AnunciaYA! ${perfil.nombre} ${perfil.apellidos}`}
                                        titulo={esUnoMismo ? 'Mi Catálogo' : `Catálogo de ${perfil.nombre}`}
                                        variante="dark"
                                    />
                                </Tooltip>
                            )}
                            {!esUnoMismo && !(esVendedor && grupoActivo === 'marketplace') && (
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

            {/* CONTENEDOR — max 920px para igualar al feed de MP. Móvil: contenedor con scroll propio.
                2026-08-15: con selección de Apartar activa, se vuelve un grid
                `[1fr_320px]` dentro del MISMO `max-w-7xl`/padding que usa el
                header (arriba) — el sidebar (`PanelApartar` variante="grid",
                columna derecha, `sticky`) queda alineado por construcción de
                CSS al borde derecho del header, sin medir nada por JS; el
                contenido (columna izquierda) queda alineado al borde
                izquierdo del header de la misma forma. Sin selección, vuelve
                al contenedor de una sola columna angosto de siempre. */}
            <div
                ref={cuerpoRef}
                className={`flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24 lg:flex-none lg:overflow-visible lg:pb-0 lg:mx-auto lg:max-w-7xl lg:px-6 ${
                    seleccionadosApartar.size > 0
                        ? 'lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5 2xl:px-8'
                        : '2xl:max-w-[920px] 2xl:px-4'
                }`}
            >
                <div className="min-w-0">
                <div className="px-3 py-5 lg:px-0 lg:py-4">

                    <HeroCard
                        perfil={perfil}
                        esVendedor={esVendedor}
                        esOrganizador={esOrganizador}
                        grupoActivo={grupoActivo}
                        esUnoMismo={esUnoMismo}
                        estaBloqueado={estaBloqueado}
                        estadoPresencia={estadoPresencia}
                        totalActivos={totalActivos}
                        totalVendidos={totalVendidos}
                        totalCompletadas={dinamicasOrganizador?.insignia.completadas ?? 0}
                        totalCanceladas={dinamicasOrganizador?.insignia.canceladas ?? 0}
                        esContacto={esContacto}
                        accionContactoEnCurso={accionContactoEnCurso}
                        onToggleContacto={handleToggleContacto}
                        onWhatsApp={handleWhatsApp}
                        onEnviarMensaje={handleEnviarMensaje}
                        accionBloqueoEnCurso={accionBloqueoEnCurso}
                        onToggleBloqueo={handleToggleBloqueo}
                        panelApartarAbierto={seleccionadosApartar.size > 0}
                    />

                    {(esVendedor || esOrganizador) && (
                        <div className="mt-6 lg:mt-3">
                            <TabsGrupo
                                grupoActivo={grupoActivo}
                                mostrarMarketplace={esVendedor}
                                mostrarDinamicas={esOrganizador}
                                totalMarketplace={totalActivos + totalVendidos}
                                totalDinamicas={dinamicasOrganizador?.dinamicas.length ?? 0}
                                onChange={setGrupoActivo}
                            />

                            {grupoActivo === 'marketplace' && (
                                <div className="mt-3 flex items-center gap-2">
                                    <ChipSubFiltro
                                        activo={subFiltroMP === 'vendo'}
                                        label="Catálogo"
                                        count={totalActivosVendo}
                                        onClick={() => setSubFiltroMP('vendo')}
                                        testId="subfiltro-catalogo"
                                    />
                                    <ChipSubFiltro
                                        activo={subFiltroMP === 'busco'}
                                        label="Busco"
                                        count={totalActivosBusco}
                                        onClick={() => setSubFiltroMP('busco')}
                                        testId="subfiltro-busco"
                                    />
                                    {/* "Vendidas" es historial de ventas — solo le sirve al
                                        dueño para su propio control. Un visitante entra a
                                        ver el catálogo (qué ofrece/busca), no ventas ya
                                        cerradas. */}
                                    {esUnoMismo && (
                                        <ChipSubFiltro
                                            activo={subFiltroMP === 'vendida'}
                                            label="Vendidas"
                                            count={totalVendidos}
                                            onClick={() => setSubFiltroMP('vendida')}
                                            testId="subfiltro-vendidas"
                                        />
                                    )}
                                </div>
                            )}

                            {grupoActivo === 'dinamicas' && (
                                <div className="mt-3 flex items-center gap-2">
                                    <ChipSubFiltro
                                        activo={subFiltroDinamicas === 'activa'}
                                        label="Activas"
                                        count={dinamicasActivas.length}
                                        onClick={() => setSubFiltroDinamicas('activa')}
                                        testId="subfiltro-dinamicas-activas"
                                    />
                                    <ChipSubFiltro
                                        activo={subFiltroDinamicas === 'cerrada'}
                                        label="Cerradas"
                                        count={dinamicasCerradas.length}
                                        onClick={() => setSubFiltroDinamicas('cerrada')}
                                        testId="subfiltro-dinamicas-cerradas"
                                    />
                                </div>
                            )}

                            <div className="mt-4 lg:mt-2">
                                {grupoActivo === 'dinamicas' ? (
                                    cargandoDinamicas && !dinamicasOrganizador ? (
                                        <div className="flex min-h-40 items-center justify-center">
                                            <Spinner tamanio="md" />
                                        </div>
                                    ) : dinamicasFiltradas.length === 0 ? (
                                        <p className="py-16 text-center text-base text-slate-600">
                                            {subFiltroDinamicas === 'activa'
                                                ? 'No hay Dinámicas activas en este momento.'
                                                : 'Todavía no hay Dinámicas cerradas.'}
                                        </p>
                                    ) : (
                                        <div
                                            data-testid="grid-dinamicas"
                                            className={`grid grid-cols-2 items-start gap-3 lg:gap-4 2xl:grid-cols-4 ${
                                                // Con el sidebar de Apartar abierto, la columna de
                                                // contenido en Laptop es más angosta — 4 columnas
                                                // quedan muy apretadas, 3 respiran mejor.
                                                seleccionadosApartar.size > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
                                            }`}
                                        >
                                            {dinamicasFiltradas.map((d) => (
                                                <CardDinamicaCompacta key={d.id} dinamica={d} />
                                            ))}
                                        </div>
                                    )
                                ) : cargandoPublicaciones && articulos.length === 0 ? (
                                    <div className="flex min-h-40 items-center justify-center">
                                        <Spinner tamanio="md" />
                                    </div>
                                ) : articulos.length === 0 ? (
                                    <EstadoVacio
                                        tab={subFiltroMP}
                                        esUnoMismo={esUnoMismo}
                                        totalTab={totalPublicacionesTab}
                                    />
                                ) : (
                                    <div
                                        data-testid={`grid-${subFiltroMP}`}
                                        className={`grid grid-cols-2 items-start gap-3 lg:gap-4 2xl:grid-cols-4 ${
                                            seleccionadosApartar.size > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
                                        }`}
                                    >
                                        {articulos.map((a) =>
                                            subFiltroMP === 'vendida' ? (
                                                <CardConOverlayVendido
                                                    key={a.id}
                                                    articulo={aFeed(a)}
                                                />
                                            ) : subFiltroMP === 'vendo' && !esUnoMismo ? (
                                                <CardCatalogoVendedor
                                                    key={a.id}
                                                    articulo={a}
                                                    seleccionado={seleccionadosApartar.has(a.id)}
                                                    onToggleSeleccion={() =>
                                                        setSeleccionadosApartar((actual) => {
                                                            const siguiente = new Set(actual);
                                                            if (siguiente.has(a.id)) siguiente.delete(a.id);
                                                            else siguiente.add(a.id);
                                                            return siguiente;
                                                        })
                                                    }
                                                    onVerDetalle={() => setArticuloDetalle(a)}
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

                <PanelApartar
                    articulos={articulos}
                    seleccionados={seleccionadosApartar}
                    onQuitar={(id) =>
                        setSeleccionadosApartar((actual) => {
                            const siguiente = new Set(actual);
                            siguiente.delete(id);
                            return siguiente;
                        })
                    }
                    onLimpiar={() => setSeleccionadosApartar(new Set())}
                    usuarioActual={usuarioActual}
                    variante="grid"
                />
            </div>

            <ModalDetalleArticuloMarketplace
                articulo={articuloDetalle}
                vendedor={perfil}
                onCerrar={() => setArticuloDetalle(null)}
            />
        </div>
    );
}

// =============================================================================
// MI CATÁLOGO (público, 2026-08-12) — reemplaza al Perfil de Vendedor cuando
// se accede por /p/marketplace/usuario/:usuarioId. Link compartible sin
// cuenta (ej. durante un live de venta): solo publicaciones 'vendo', botón
// Apartar por artículo, sin bloqueo/contactos/Dinámicas.
// =============================================================================

function MiCatalogoPublico() {
    const { usuarioId } = useParams<{ usuarioId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChatDirectoPersona = useIniciarChatDirectoPersona();
    const { abrir: abrirWhatsApp, menu: menuWhatsApp } = useAbrirWhatsApp();
    // Sin useScrollAppShell: esta es una ruta pública bare (fuera de
    // MainLayout, sin BottomNav que coordinar) — scroll normal del documento.

    const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
    // Selección múltiple (2026-08-15): el visitante marca varias piezas del
    // catálogo y las manda en un solo formulario nombre+WhatsApp — pensado
    // para el caso del live (varias prendas de un jalón), en vez de repetir
    // el modal pieza por pieza.
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    // Click en la card (fuera del círculo de selección) — detalle estilo
    // ModalDetalleItem de Negocios, adaptado a MarketPlace.
    const [articuloDetalle, setArticuloDetalle] = useState<ArticuloMarketplace | null>(null);

    // Alineación del panel de Apartar (2026-08-16): en vez de calcularla con
    // fórmulas/números fijos (se desalineaban del catálogo real — cada uno
    // se calculaba por su cuenta), se MIDE directo dónde termina y dónde
    // arranca la tarjeta de identidad en pantalla, y el panel se coloca
    // justo ahí (misma orilla derecha, misma orilla superior) — siempre
    // coincide exacto sin importar tamaño de pantalla ni alto del header.
    const identidadRef = useRef<HTMLDivElement>(null);
    const [posicionPanel, setPosicionPanel] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        if (seleccionados.size === 0) return;
        const medir = () => {
            if (identidadRef.current) {
                const rect = identidadRef.current.getBoundingClientRect();
                setPosicionPanel({ left: rect.right + 16, top: rect.top });
            }
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, [seleccionados.size]);

    const { data: perfil, isLoading: cargandoPerfil, isError } = useVendedorMarketplace(usuarioId);
    const { data: publicaciones, isFetching: cargandoPublicaciones } = useVendedorPublicaciones(
        usuarioId,
        'activa',
        { limit: 50, offset: 0 },
        'vendo'
    );

    const handleWhatsApp = (e: MouseEvent<HTMLElement>) => {
        if (!perfil?.telefono) return;
        abrirWhatsApp(e, perfil.telefono, undefined, `Hola ${perfil.nombre}, vi tu catálogo en AnunciaYA`);
    };

    const handleToggleSeleccion = (articuloId: string) => {
        setSeleccionados((actual) => {
            const siguiente = new Set(actual);
            if (siguiente.has(articuloId)) siguiente.delete(articuloId);
            else siguiente.add(articuloId);
            return siguiente;
        });
    };

    const handleEnviarMensaje = async () => {
        if (!perfil) return;
        if (!usuarioActual) {
            setModalAuthAbierto(true);
            return;
        }
        await iniciarChatDirectoPersona({
            usuarioId: perfil.id,
            nombre: perfil.nombre,
            apellidos: perfil.apellidos,
            avatarUrl: perfil.avatarUrl,
        });
    };

    // Mismo shell que el resto de páginas públicas compartibles
    // (PaginaArticuloPublico, PaginaOfertaPublico): Header/Footer fijos +
    // `<main className="overflow-y-auto">` como único contenedor con scroll
    // (FooterPublico busca ese selector para el botón "Volver arriba").
    if (cargandoPerfil) {
        return (
            <div className="flex h-screen flex-col bg-app-degradado">
                <HeaderPublico />
                <main className="flex flex-1 items-center justify-center overflow-y-auto">
                    <Spinner tamanio="lg" />
                </main>
                <FooterPublico />
            </div>
        );
    }

    if (isError || !perfil) {
        return (
            <div className="flex h-screen flex-col bg-app-degradado">
                <HeaderPublico />
                <main className="flex flex-1 items-center overflow-y-auto">
                    <Estado404 onVolver={() => navigate('/')} />
                </main>
                <FooterPublico />
            </div>
        );
    }

    const articulos = publicaciones?.data ?? [];
    const iniciales = obtenerIniciales(perfil.nombre, perfil.apellidos);

    return (
        <div data-testid="pagina-mi-catalogo" className="flex h-screen flex-col bg-app-degradado">
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto">
                <div
                    className={`mx-auto px-3 py-4 lg:px-6 2xl:max-w-7xl 2xl:px-8 ${
                        // 2026-08-16: en Laptop, sin panel de apartar abierto,
                        // el bloque completo (tarjeta + cards) se angosta como
                        // caja propia (`max-w-[59rem]`, 80rem − 21rem) y se
                        // centra solo — antes usaba el mismo margen-derecha
                        // que con el panel abierto, dejando un hueco vacío
                        // sin sentido y todo corrido a la izquierda. Con el
                        // panel abierto se queda igual que ya funciona: caja
                        // completa (`max-w-7xl`) + margen-derecha en los
                        // hijos para dejarle campo al sidebar.
                        seleccionados.size > 0 ? 'lg:max-w-7xl' : 'lg:max-w-[59rem]'
                    }`}
                >
                    {/* Header — identidad del vendedor + contacto directo.
                        2026-08-15: achicado en Laptop (`lg:`) — antes crecía
                        respecto a móvil (texto/avatar más grandes en vez de
                        más chicos), quedando desproporcionado; en Full HD
                        (`2xl:`) se preserva el tamaño de siempre.
                        2026-08-16: la tarjeta NUNCA debe ser más ancha que
                        las cards de abajo. El margen `mr-[21rem]` SOLO se usa
                        con el panel de apartar abierto (Laptop y PC), para
                        correr el contenido a la izquierda y dejarle campo al
                        sidebar. Sin panel, no hace falta margen en ningún
                        caso — en Laptop la caja del contenedor (arriba) ya
                        se angosta sola y queda centrada; en PC se queda a su
                        ancho completo. */}
                    <div
                        ref={identidadRef}
                        className={`rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 shadow-lg lg:px-4 lg:py-3 2xl:px-6 2xl:py-4 ${
                            seleccionados.size > 0 ? 'lg:mr-[21rem] 2xl:mr-[21rem]' : '2xl:mr-0'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-md lg:h-11 lg:w-11 2xl:h-14 2xl:w-14">
                                {perfil.avatarUrl ? (
                                    <img src={perfil.avatarUrl} alt={perfil.nombre} className="h-full w-full object-cover" />
                                ) : (
                                    <div
                                        className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)' }}
                                    >
                                        {iniciales}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="flex items-center gap-1.5 text-lg font-extrabold text-slate-950 lg:text-base 2xl:text-xl">
                                    {perfil.nombre} {perfil.apellidos}
                                    <BadgeCheck className="h-5 w-5 shrink-0 fill-blue-500 text-white" strokeWidth={2.5} />
                                </h1>
                                <p className="text-sm font-semibold text-slate-500 lg:text-xs 2xl:text-sm">
                                    Mi Catálogo · {articulos.length} artículo{articulos.length === 1 ? '' : 's'}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                {perfil.telefono && (
                                    <button
                                        type="button"
                                        data-testid="btn-whatsapp-catalogo"
                                        onClick={handleWhatsApp}
                                        aria-label="Contactar por WhatsApp"
                                        className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                                    >
                                        <WhatsAppIcon className="h-8 w-8 lg:h-6 lg:w-6 2xl:h-7 2xl:w-7" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    data-testid="btn-chatya-catalogo"
                                    onClick={handleEnviarMensaje}
                                    aria-label="Enviar mensaje por ChatYA"
                                    className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                                >
                                    <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto shrink-0 object-contain lg:h-7 2xl:h-8" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid de artículos — selección múltiple: toca varias
                        piezas y mándalas juntas en un solo formulario.
                        2026-08-16: sin selección, el margen ya no hace falta
                        en ningún caso — la caja del contenedor (arriba) ya
                        se angosta sola y queda centrada en Laptop; en PC
                        sigue a su ancho completo (5 por fila). Con el panel
                        abierto, el margen sigue corriendo el contenido a la
                        izquierda para dejarle campo al sidebar (Laptop
                        siempre 4 por fila; PC baja de 5 a 4). */}
                    <div
                        className={`mt-4 ${
                            seleccionados.size > 0 ? 'pb-20 lg:mr-[21rem] 2xl:mr-[21rem]' : '2xl:mr-0'
                        }`}
                    >
                        {cargandoPublicaciones && articulos.length === 0 ? (
                            <div className="flex min-h-40 items-center justify-center">
                                <Spinner tamanio="md" />
                            </div>
                        ) : articulos.length === 0 ? (
                            <p className="py-16 text-center text-base font-medium text-slate-600">
                                Este catálogo todavía no tiene artículos.
                            </p>
                        ) : (
                            <div
                                data-testid="grid-mi-catalogo"
                                className={`grid grid-cols-2 items-start gap-3 lg:grid-cols-4 lg:gap-4 ${
                                    // PC (2xl): 5 por fila sin selección, 4
                                    // cuando el panel de apartar está abierto
                                    // (deja espacio real, no solo un
                                    // recorte). Laptop no cambia en ningún
                                    // caso (ya quedó bien así).
                                    seleccionados.size > 0 ? '2xl:grid-cols-4' : '2xl:grid-cols-5'
                                }`}
                            >
                                {articulos.map((a) => (
                                    <CardCatalogoVendedor
                                        key={a.id}
                                        articulo={a}
                                        seleccionado={seleccionados.has(a.id)}
                                        onToggleSeleccion={() => handleToggleSeleccion(a.id)}
                                        onVerDetalle={() => setArticuloDetalle(a)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <FooterPublico />

            <PanelApartar
                articulos={articulos}
                seleccionados={seleccionados}
                onQuitar={(id) => handleToggleSeleccion(id)}
                onLimpiar={() => setSeleccionados(new Set())}
                usuarioActual={null}
                posicion={posicionPanel}
            />

            <ModalDetalleArticuloMarketplace
                articulo={articuloDetalle}
                vendedor={perfil}
                onCerrar={() => setArticuloDetalle(null)}
            />

            <ModalAuthRequerido
                abierto={modalAuthAbierto}
                onCerrar={() => setModalAuthAbierto(false)}
                accion="chat"
                urlRetorno={location.pathname}
            />

            {menuWhatsApp}
        </div>
    );
}

interface CardCatalogoVendedorProps {
    articulo: ArticuloMarketplace;
    /** Selección múltiple (2026-08-15): SOLO el círculo la alterna — el
     *  resto de la card abre el detalle. Calca la interacción de
     *  "+Agregar" (card) vs click-en-card (detalle) del catálogo de
     *  Negocios (`PaginaCatalogoNegocio.tsx`). */
    seleccionado?: boolean;
    onToggleSeleccion?: () => void;
    /** Click en la card (fuera del círculo) — abre el modal de detalle. */
    onVerDetalle: () => void;
}

function CardCatalogoVendedor({ articulo, seleccionado, onToggleSeleccion, onVerDetalle }: CardCatalogoVendedorProps) {
    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const apartado = !!articulo.apartadoHasta && new Date(articulo.apartadoHasta) > new Date();
    const modoSeleccion = !!onToggleSeleccion;

    return (
        <div
            data-testid={modoSeleccion ? `card-seleccionable-${articulo.id}` : `card-catalogo-${articulo.id}`}
            className={`relative flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-md ${
                seleccionado ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-300'
            }`}
        >
            <button
                type="button"
                onClick={onVerDetalle}
                aria-label={`Ver detalle de ${articulo.titulo}`}
                className="flex flex-1 cursor-pointer flex-col text-left"
            >
                <div className="aspect-4/3 shrink-0 overflow-hidden bg-slate-200">
                    {fotoPortada ? (
                        <img src={fotoPortada.url} alt={articulo.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-slate-300" />
                        </div>
                    )}
                    {apartado && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-800">
                                <Lock className="h-3.5 w-3.5" />
                                Apartado
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                    <h4 className="min-h-[2.25rem] text-sm font-semibold text-slate-800 line-clamp-2 lg:min-h-[2.5rem]">
                        {articulo.titulo}
                    </h4>
                    <p className="mt-0.5 text-base font-bold text-emerald-600">
                        ${parseFloat(articulo.precio ?? '0').toFixed(2)}
                        {articulo.unidadVenta && <span className="text-xs font-medium text-slate-500"> {articulo.unidadVenta}</span>}
                    </p>
                </div>
            </button>

            {/* Círculo de selección — único elemento que alterna la selección;
                `stopPropagation` evita que el click también dispare el botón
                de detalle que envuelve el resto de la card. */}
            {!apartado && modoSeleccion && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSeleccion?.();
                    }}
                    data-testid={`checkbox-seleccion-${articulo.id}`}
                    aria-label={seleccionado ? 'Quitar de la selección' : 'Seleccionar'}
                    className={`absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 shadow-md ${
                        seleccionado
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-white bg-white/80 text-transparent hover:bg-white'
                    }`}
                >
                    <Check className="h-4 w-4" strokeWidth={3} />
                </button>
            )}
        </div>
    );
}

// =============================================================================
// MODAL DETALLE DE ARTÍCULO (2026-08-15) — calca el estilo visual de
// `ModalDetalleItem.tsx` (catálogo de Negocios): hero con gradiente,
// compartir+cerrar flotantes, badge de disponibilidad, título+categoría
// sobre la imagen, franja divisora, precio+contacto, descripción. Adaptado
// a MarketPlace: contacta al VENDEDOR (ChatYA directo + WhatsApp), no hay
// botón de agregar/apartar aquí — eso vive solo en el círculo de la card.
// =============================================================================

interface VendedorContacto {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    telefono: string | null;
}

interface ModalDetalleArticuloMarketplaceProps {
    articulo: ArticuloMarketplace | null;
    vendedor: VendedorContacto | undefined;
    onCerrar: () => void;
    /** Ver `ModalDetalleItem` — mismo patrón: si no se pasa, cae a un toast
     *  de error en vez de abrir el modal de auth. */
    onRequiereAuth?: () => void;
}

function ModalDetalleArticuloMarketplace({ articulo, vendedor, onCerrar, onRequiereAuth }: ModalDetalleArticuloMarketplaceProps) {
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChatDirectoPersona = useIniciarChatDirectoPersona();
    const { abrir: abrirWhatsApp, menu: menuWhatsApp } = useAbrirWhatsApp();
    const [imagenExpandida, setImagenExpandida] = useState(false);

    if (!articulo) return null;

    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const apartado = !!articulo.apartadoHasta && new Date(articulo.apartadoHasta) > new Date();

    const handleWhatsApp = (e: MouseEvent<HTMLElement>) => {
        if (!vendedor?.telefono) return;
        abrirWhatsApp(e, vendedor.telefono, undefined, `Hola, me interesa "${articulo.titulo}" que vi en tu catálogo de AnunciaYA`);
    };

    const handleChatYA = async () => {
        if (!vendedor) return;
        if (!usuarioActual) {
            if (onRequiereAuth) {
                onCerrar();
                onRequiereAuth();
                return;
            }
            notificar.error('Debes iniciar sesión para usar ChatYA');
            return;
        }
        await iniciarChatDirectoPersona({
            usuarioId: vendedor.id,
            nombre: vendedor.nombre,
            apellidos: vendedor.apellidos,
            avatarUrl: vendedor.avatarUrl,
        });
        onCerrar();
    };

    return (
        <>
            <Modal
                abierto={!!articulo}
                onCerrar={onCerrar}
                mostrarHeader={false}
                paddingContenido="none"
                ancho="sm"
                zIndice="z-75"
                discriminador="_modalDetalleArticuloMarketplace"
                className="min-w-[330px] max-w-[80vw] lg:max-w-sm 2xl:max-w-md"
            >
                {/* Imagen hero con overlay */}
                <div className="relative h-52 bg-slate-200 lg:h-60 2xl:h-72">
                    {fotoPortada ? (
                        <img
                            src={fotoPortada.url}
                            alt={articulo.titulo}
                            className="h-full w-full cursor-pointer object-cover"
                            onClick={() => setImagenExpandida(true)}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-16 w-16 text-slate-300 lg:h-12 lg:w-12 2xl:h-16 2xl:w-16" />
                        </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Compartir + cerrar */}
                    <div className="absolute right-3 top-3 flex gap-2">
                        <Tooltip text="Compartir" position="bottom">
                            <DropdownCompartir
                                url={`${window.location.origin}/p/articulo-marketplace/${articulo.id}`}
                                texto={`¡Mira esto en AnunciaYA!\n\n${articulo.titulo}`}
                                titulo={articulo.titulo}
                                variante="glass"
                            />
                        </Tooltip>
                        <Tooltip text="Cerrar" position="bottom">
                            <button
                                onClick={onCerrar}
                                aria-label="Cerrar modal"
                                className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-lg backdrop-blur-sm transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <X className="h-5 w-5 text-slate-700" />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Badge disponibilidad */}
                    <div className="absolute left-3 top-3 lg:left-2 lg:top-2 2xl:left-3 2xl:top-3">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shadow-lg lg:text-[11px] 2xl:text-sm ${
                                apartado ? 'bg-slate-700 text-white' : 'bg-emerald-500 text-white'
                            }`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full lg:h-1 lg:w-1 2xl:h-1.5 2xl:w-1.5 ${apartado ? 'bg-white/70' : 'bg-white animate-pulse'}`} />
                            {apartado ? 'Apartado' : 'Disponible'}
                        </span>
                    </div>

                    {/* Título + categoría */}
                    <div
                        className="absolute inset-x-0 bottom-0 cursor-pointer p-4 lg:p-3 2xl:p-4"
                        onClick={() => setImagenExpandida(true)}
                    >
                        <h2 className="line-clamp-2 text-xl font-bold leading-tight text-white drop-shadow-lg lg:text-base 2xl:text-xl">
                            {articulo.titulo}
                        </h2>
                        {articulo.categoriaNombre && (
                            <span className="mt-1.5 inline-block rounded-lg bg-white/20 px-2.5 py-0.5 text-sm font-medium text-white backdrop-blur-sm lg:text-[11px] 2xl:text-sm">
                                {articulo.categoriaNombre}
                            </span>
                        )}
                    </div>
                </div>

                {/* Franja divisora */}
                <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg, #1e293b, #334155, #1e293b)' }} />

                <div className={`flex-1 overflow-y-auto ${!articulo.descripcion ? 'min-h-48 lg:min-h-40 2xl:min-h-48' : ''}`}>
                    {/* Precio + contacto */}
                    <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-slate-200/60 p-3 lg:mx-3 lg:mt-3 2xl:mx-4 2xl:mt-4">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-emerald-600 lg:text-2xl 2xl:text-3xl">
                                ${parseFloat(articulo.precio ?? '0').toFixed(2)}
                            </span>
                            {articulo.unidadVenta && (
                                <span className="text-sm font-medium text-slate-600 lg:text-[11px] 2xl:text-sm">{articulo.unidadVenta}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {vendedor && (
                                <button onClick={handleChatYA} className="cursor-pointer hover:scale-110" aria-label="Contactar por ChatYA">
                                    <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
                                </button>
                            )}
                            {vendedor?.telefono && (
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-green-500 p-[6px] hover:scale-110"
                                    aria-label="Contactar por WhatsApp"
                                >
                                    <svg className="h-full w-full text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Descripción */}
                    {articulo.descripcion && (
                        <div className="mx-4 mt-3 pb-4 lg:mx-3 lg:mt-2.5 2xl:mx-4 2xl:mt-3">
                            <h4 className="mb-1.5 text-base font-bold text-slate-800 lg:text-sm 2xl:text-base">Descripción</h4>
                            <p className="text-sm font-medium leading-relaxed text-slate-600 lg:text-[11px] 2xl:text-sm">
                                {articulo.descripcion}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {fotoPortada && (
                <ModalImagenes
                    images={[fotoPortada.url]}
                    isOpen={imagenExpandida}
                    onClose={() => setImagenExpandida(false)}
                />
            )}
            {menuWhatsApp}
        </>
    );
}

// =============================================================================
// PANEL APARTAR (2026-08-15) — sidebar estilo "Tu pedido" de Negocios
// (PaginaCatalogoNegocio.tsx): sticky en desktop, ModalBottom en móvil.
// Reemplaza al modal centrado de una sola pieza. Un mismo panel sirve para:
//  - Catálogo público (sin cuenta): pide nombre + WhatsApp manual.
//  - Perfil privado in-app (usuarioActual presente): nombre se autocompleta
//    del perfil (no se pide), WhatsApp se precarga del perfil si existe.
// =============================================================================

interface PanelApartarProps {
    /** Catálogo completo cargado — se filtra por `seleccionados`. */
    articulos: ArticuloMarketplace[];
    seleccionados: Set<string>;
    onQuitar: (articuloId: string) => void;
    onLimpiar: () => void;
    /** Presente = perfil privado in-app (autocompleta datos). Null = catálogo
     *  público, SIEMPRE sin cuenta aunque el visitante esté logueado (por
     *  diseño — ver docs/arquitectura/Catalogo_MarketPlace_Apartado.md). */
    usuarioActual: Usuario | null;
    /** 'flotante' (default) — sidebar `fixed` porteado a document.body, para
     *  el catálogo público (sin columna de publicidad que esquivar). 'grid'
     *  — el desktop se renderiza SIN portal, como columna `sticky` normal:
     *  el caller lo coloca dentro de su propio `grid-cols-[1fr_320px]` para
     *  que quede perfectamente alineado al ancho del header (2026-08-15,
     *  `PerfilVendedorPrivado`). El móvil (FAB + hoja) siempre se portea,
     *  en ambas variantes. */
    variante?: 'flotante' | 'grid';
    /** Solo variante 'flotante' — posición medida en píxeles (borde derecho
     *  y orilla superior reales de la tarjeta de identidad), no una fórmula
     *  ni un valor fijo. Ver `MiCatalogoPublico`. */
    posicion?: { left: number; top: number } | null;
}

function PanelApartar({
    articulos,
    seleccionados,
    onQuitar,
    onLimpiar,
    usuarioActual,
    variante = 'flotante',
    posicion,
}: PanelApartarProps) {
    const items = articulos.filter((a) => seleccionados.has(a.id));
    const esInApp = !!usuarioActual;

    const [nombre, setNombre] = useState('');
    const [whatsapp, setWhatsapp] = useState(usuarioActual?.telefono ?? '');
    const [enviado, setEnviado] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [fallidos, setFallidos] = useState<string[]>([]);
    const [hojaAbierta, setHojaAbierta] = useState(false);
    const { mutateAsync: apartarArticulo } = useApartarArticulo();
    // Portal a document.body (2026-08-15): dentro de AY, `PerfilVendedorPrivado`
    // vive bajo `<main>` de MainLayout, que crea su propio stacking context
    // (position+z-index) — un `fixed` renderizado ahí queda ATRAPADO en ese
    // contexto y pierde contra hermanos de MainLayout como el `<aside>` de
    // publicidad (z-30), sin importar qué z-index le pongamos. Portear a
    // `document.body` saca al panel de ese árbol por completo (mismo patrón
    // que ya usan `Modal`/`ModalBottom` en el resto de la app). Se llama
    // ANTES del early-return de abajo — Rules of Hooks.
    const portalTarget = usePortalTarget();

    if (items.length === 0) return null;

    const nombreFinal = esInApp ? `${usuarioActual!.nombre} ${usuarioActual!.apellidos}`.trim() : nombre.trim();
    const { numero: whatsappDigitos } = normalizarTelefono(whatsapp);
    const esMultiple = items.length > 1;

    const handleEnviar = async () => {
        if (!esInApp && nombreFinal.length < 2) {
            notificar.error('Escribe tu nombre');
            return;
        }
        if (whatsappDigitos.length !== 10) {
            notificar.error('Escribe un WhatsApp válido (10 dígitos)');
            return;
        }
        setEnviando(true);
        const fallidosLocal: string[] = [];
        // Secuencial (no Promise.all): son pocas piezas por selección y así
        // evitamos ráfagas simultáneas contra el rate limit del endpoint.
        for (const articulo of items) {
            try {
                const data = await apartarArticulo({
                    articuloId: articulo.id,
                    nombreComprador: nombreFinal,
                    whatsappComprador: whatsapp.trim(),
                });
                if (!data.success) fallidosLocal.push(articulo.titulo);
            } catch {
                fallidosLocal.push(articulo.titulo);
            }
        }
        setEnviando(false);
        setFallidos(fallidosLocal);
        if (fallidosLocal.length < items.length) {
            setEnviado(true);
        } else {
            notificar.error('No se pudo enviar la solicitud, intenta de nuevo');
        }
    };

    const handleCerrarExito = () => {
        setEnviado(false);
        setFallidos([]);
        setHojaAbierta(false);
        onLimpiar();
    };

    const contenido = (
        <div className="flex flex-1 min-h-0 flex-col">
            {enviado ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <Lock className="h-8 w-8 text-emerald-600" strokeWidth={2} />
                    </div>
                    <p className="text-base font-semibold text-slate-800">
                        {esMultiple
                            ? `El vendedor revisará tus ${items.length - fallidos.length} solicitudes y te contactará por WhatsApp para confirmar.`
                            : 'El vendedor revisará tu solicitud y te contactará por WhatsApp para confirmar.'}
                    </p>
                    {fallidos.length > 0 && (
                        <p className="text-sm font-medium text-amber-600">
                            {fallidos.length === 1
                                ? `"${fallidos[0]}" ya no estaba disponible.`
                                : `${fallidos.length} artículos ya no estaban disponibles.`}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleCerrarExito}
                        data-testid="btn-cerrar-exito-apartar"
                        className="mt-2 h-11 w-full cursor-pointer rounded-xl bg-slate-800 text-sm font-bold text-white hover:bg-slate-900"
                    >
                        Cerrar
                    </button>
                </div>
            ) : (
                <>
                    {/* Cuerpo — lista de piezas, scroll propio */}
                    <div className="flex-1 min-h-0 space-y-3 overflow-y-auto overflow-x-hidden pt-3 pb-3">
                        {items.map((a) => {
                            const foto = obtenerFotoPortada(a.fotos, a.fotoPortadaIndex);
                            return (
                                <div
                                    key={a.id}
                                    className="flex items-start gap-2.5 border-b-2 border-slate-200 pb-3 last:border-0 last:pb-0"
                                    data-testid={`linea-apartar-${a.id}`}
                                >
                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-200">
                                        {foto ? (
                                            <img src={foto.url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <ImageIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold leading-snug text-slate-800">{a.titulo}</p>
                                        <p className="text-sm font-bold text-emerald-600">${parseFloat(a.precio ?? '0').toFixed(2)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onQuitar(a.id)}
                                        data-testid={`btn-quitar-apartar-${a.id}`}
                                        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-red-600 hover:bg-red-100"
                                        aria-label="Quitar de la selección"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer — datos de contacto + envío */}
                    <div className="-mx-4 shrink-0 border-t-2 border-slate-200 px-4 pt-3 pb-4">
                        {esInApp ? (
                            <p className="mb-2 text-sm font-medium text-slate-600">
                                Apartando como <span className="font-bold text-slate-800">{nombreFinal}</span>
                            </p>
                        ) : (
                            <>
                                <p className="mb-2 text-sm font-medium text-slate-600">
                                    Déjale tu nombre y WhatsApp al vendedor para que confirme el apartado.
                                </p>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Tu nombre"
                                    data-testid="input-nombre-apartar"
                                    className="mb-2 h-11 w-full rounded-lg border-2 border-slate-300 px-3 text-sm font-medium text-slate-800 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
                                />
                            </>
                        )}
                        <InputTelefono
                            value={whatsapp}
                            onChange={setWhatsapp}
                            prefijo="wa-apartar"
                            placeholder="Tu WhatsApp"
                            claseAlto="h-11"
                            claseTexto="text-sm"
                            variante="neutro"
                            testIdNumero="input-whatsapp-apartar"
                        />
                        <button
                            type="button"
                            onClick={handleEnviar}
                            disabled={enviando}
                            data-testid="btn-confirmar-apartar"
                            className="mt-3 h-11 w-full cursor-pointer rounded-xl bg-slate-800 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-60"
                        >
                            {enviando ? 'Enviando...' : esMultiple ? `Apartar ${items.length}` : 'Apartar'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    // Desktop — mismo contenido visual en ambas variantes; solo cambia el
    // contenedor: 'flotante' es `fixed` (porteado, catálogo público, sin
    // columna de publicidad que esquivar); 'grid' es un bloque `sticky`
    // normal SIN portal — el caller (`PerfilVendedorPrivado`) lo coloca como
    // segunda columna de su propio `grid-cols-[1fr_320px]` dentro del mismo
    // wrapper `max-w-7xl` que el header, así el borde derecho del sidebar
    // coincide con el borde derecho del header por construcción de CSS, sin
    // necesidad de medir nada por JS.
    const headerSidebar = (
        <div className="flex shrink-0 items-center gap-2.5 border-b-2 border-slate-200 px-4 pb-3 pt-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                <Lock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Apartar</h3>
            <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-800 px-1.5 text-xs font-bold text-white">
                {items.length}
            </span>
        </div>
    );

    const desktopSidebar =
        variante === 'grid' ? (
            // Mismo patrón que "Tu pedido" de PaginaCatalogoNegocio.tsx:
            // `sticky` + alto FIJO (no `max-h` dinámico) para que no cambie
            // de tamaño al hacer scroll. Dos diferencias necesarias frente a
            // Negocios (que usa `top-4` liso): (1) `lg:mt-4` — el HeroCard
            // arranca con `lg:py-4` de padding-top que el sidebar no tiene;
            // sin este margen quedaba ~16px más arriba que la card de datos
            // del usuario. (2) `lg:top-24` en vez de `top-4` — esta página
            // (a diferencia de la de Negocios) tiene su propio header oscuro
            // `sticky top-0`; con `top-4` el sidebar quedaría tapado detrás
            // de ese header al hacer scroll.
            <div
                data-testid="panel-apartar-desktop"
                className="hidden h-[475px] w-80 flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-xl lg:sticky lg:top-18 lg:mt-4 lg:flex 2xl:h-[740px]"
            >
                {headerSidebar}
                <div className="flex flex-1 min-h-0 flex-col px-4">{contenido}</div>
            </div>
        ) : (
            <div
                data-testid="panel-apartar-desktop"
                // 2026-08-15: alto FIJO (no `max-h` dinámico atado al
                // viewport) en ambas resoluciones — mismo criterio que la
                // variante 'grid' del privado, para que no cambie de tamaño
                // al hacer scroll ni salte entre valores.
                // 2026-08-16: la posición (izquierda Y arriba) YA NO se
                // calcula con fórmulas/números fijos (se desalineaban del
                // catálogo real) — se mide en vivo el borde derecho y la
                // orilla superior reales de la tarjeta de identidad
                // (`posicion`, `MiCatalogoPublico`) y se aplican directo por
                // `style`, así siempre coincide exacto con la tarjeta, sin
                // importar el ancho de pantalla ni el alto del header.
                className="fixed z-40 hidden h-[530px] w-80 flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-xl lg:flex 2xl:h-[740px]"
                style={posicion ? { left: posicion.left, top: posicion.top } : undefined}
            >
                {headerSidebar}
                <div className="flex flex-1 min-h-0 flex-col px-4">{contenido}</div>
            </div>
        );

    const mobilePortal = createPortal(
        <>
            {/* Móvil — FAB que abre la hoja inferior */}
            <button
                type="button"
                onClick={() => setHojaAbierta(true)}
                data-testid="btn-abrir-panel-apartar"
                className="fixed bottom-4 left-1/2 z-40 flex h-12 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-slate-800 px-5 text-sm font-bold text-white shadow-lg lg:hidden"
            >
                <Lock className="h-4 w-4" />
                Apartar · {items.length}
            </button>
            <ModalBottom
                abierto={hojaAbierta}
                onCerrar={() => setHojaAbierta(false)}
                mostrarHeader={false}
                headerOscuro
                alturaMaxima="xl"
                sinScrollInterno
            >
                <div
                    className="relative shrink-0 overflow-hidden rounded-t-3xl px-4 pb-3 pt-7"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', boxShadow: '0 4px 16px rgba(15,23,42,0.35)' }}
                >
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-white/5" />
                    <div className="relative flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15">
                            <Lock className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-lg font-bold text-white">
                            Apartar
                            <span className="text-sm font-semibold text-white/70">
                                · {items.length} artículo{items.length === 1 ? '' : 's'}
                            </span>
                        </h3>
                    </div>
                </div>
                <div className="flex flex-1 min-h-0 flex-col p-4">{contenido}</div>
            </ModalBottom>
        </>,
        portalTarget
    );

    if (variante === 'grid') {
        return (
            <>
                {desktopSidebar}
                {mobilePortal}
            </>
        );
    }

    // 'flotante': el desktop también se portea (mismo motivo que el móvil,
    // ver comentario de `portalTarget` arriba). `mobilePortal` ya es un
    // portal en sí mismo — no hace falta anidarlo dentro de otro.
    return (
        <>
            {createPortal(desktopSidebar, portalTarget)}
            {mobilePortal}
        </>
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
    esOrganizador: boolean;
    /** KPI mostrado depende de la tab activa (MarketPlace vs Dinámicas) —
     *  no ambos a la vez. */
    grupoActivo: 'marketplace' | 'dinamicas';
    esUnoMismo: boolean;
    estaBloqueado: boolean;
    estadoPresencia: 'conectado' | 'ausente' | 'desconectado' | undefined;
    totalActivos: number;
    totalVendidos: number;
    totalCompletadas: number;
    totalCanceladas: number;
    esContacto: boolean;
    accionContactoEnCurso: boolean;
    onToggleContacto: () => void;
    onWhatsApp: () => void;
    onEnviarMensaje: () => void;
    /** Solo se usan para el botón "Desbloquear" del banner — cuando es un
     *  vendedor con catálogo, el header ya no trae el toggle de bloqueo
     *  (2026-08-15: ese slot ahora es "Compartir catálogo"), así que el
     *  banner es el único lugar para revertirlo. */
    accionBloqueoEnCurso: boolean;
    onToggleBloqueo: () => void;
    /** 2026-08-15: con el sidebar de Apartar abierto, los KPIs de
     *  Publicaciones/Vendidos pasan a solo-ícono en Laptop (`lg:`) — ver
     *  `KpiCard`. */
    panelApartarAbierto?: boolean;
}

function HeroCard({
    perfil,
    esVendedor,
    esOrganizador,
    grupoActivo,
    esUnoMismo,
    estaBloqueado,
    estadoPresencia,
    totalActivos,
    totalVendidos,
    totalCompletadas,
    totalCanceladas,
    esContacto,
    accionContactoEnCurso,
    onToggleContacto,
    onWhatsApp,
    onEnviarMensaje,
    accionBloqueoEnCurso,
    onToggleBloqueo,
    panelApartarAbierto = false,
}: HeroCardProps) {
    const hayAccionesContacto = !esUnoMismo && !estaBloqueado;

    // WhatsApp + ChatYA + Agregar contacto — se renderizan en DOS lugares
    // posibles (columna derecha normal, o junto a "Miembro desde" cuando el
    // sidebar de Apartar deja angosta la columna derecha en Laptop; ver
    // ambos usos más abajo), nunca los dos visibles a la vez por breakpoint.
    // `sufijo` evita testids duplicados entre ambas copias del DOM.
    const renderBotonesContacto = (sufijo: string) => (
        <>
            {/* WhatsApp + ChatYA: logos brand INLINE (sin pill, sin texto
                duplicado) con hover scale. Mismo patrón EXACTO que
                `BarraContacto.tsx` del detalle de la publicación. */}
            {perfil.telefono && (
                <button
                    type="button"
                    data-testid={`btn-whatsapp-vendedor${sufijo}`}
                    onClick={onWhatsApp}
                    aria-label="Contactar por WhatsApp"
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                >
                    <WhatsAppIcon className="h-7 w-7 lg:h-6 lg:w-6" />
                </button>
            )}
            <button
                type="button"
                data-testid={`btn-chatya-vendedor${sufijo}`}
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
            {/* Agregar contacto — icon-only en tonos teal (familia
                cromática de MarketPlace). Mismo patrón inline que los logos
                brand (sin fondo, hover scale). Tooltip describe la acción al
                hover/focus. UserCheck cuando ya es contacto, UserPlus cuando
                no. */}
            <Tooltip
                text={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                position="top"
            >
                <button
                    type="button"
                    data-testid={`btn-agregar-contacto${sufijo}`}
                    onClick={onToggleContacto}
                    disabled={accionContactoEnCurso}
                    aria-pressed={esContacto}
                    aria-label={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60 lg:hover:scale-110"
                >
                    {esContacto ? (
                        <UserCheck className="h-7 w-7 lg:h-6 lg:w-6 shrink-0 text-sky-600" strokeWidth={2.25} />
                    ) : (
                        <UserPlus className="h-7 w-7 lg:h-6 lg:w-6 shrink-0 text-sky-600" strokeWidth={2.25} />
                    )}
                </button>
            </Tooltip>
        </>
    );

    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:rounded-2xl lg:px-6 lg:py-4">
            {/* ═══════════════════════════════════════════════════════════════
                Layout 2 columnas en desktop, compacto: avatar chico + nombre
                en 1 sola línea a la izquierda; KPIs + botones a la derecha.
                Identidad en FILA (avatar izquierda, texto derecha) en TODAS
                las resoluciones — antes en móvil era columna centrada.
                ═══════════════════════════════════════════════════════════ */}
            <div
                className={`grid grid-cols-1 gap-6 lg:items-center lg:gap-6 ${
                    // 2026-08-15: con el sidebar de Apartar abierto, en Laptop
                    // la columna derecha se queda sin nada (KPIs ocultos,
                    // botones de contacto movidos junto a "Miembro desde")
                    // — 1 sola columna, el nombre usa el ancho completo. En
                    // Desktop (`2xl:`) todo vuelve a su lugar de siempre.
                    panelApartarAbierto ? 'lg:grid-cols-1 2xl:grid-cols-2' : 'lg:grid-cols-2'
                }`}
            >
                {/* ── Columna izquierda: avatar + identidad, todo en 1 línea
                    en desktop (avatar chico + nombre + ciudad inline). ──── */}
                <div className="flex flex-row items-center gap-3 text-left">
                    <AvatarConAdornos
                        perfil={perfil}
                        estadoPresencia={estadoPresencia}
                    />
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                        {/* Nombre en 1 sola línea (nombre + apellidos +
                            badge verificado juntos). BadgeCheck invertido:
                            fondo azul (`fill-blue-500`) con palomita blanca,
                            estilo "verified" tipo Twitter/X. */}
                        <h1
                            data-testid="nombre-vendedor"
                            className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-950 leading-tight lg:text-lg"
                        >
                            {perfil.nombre} {perfil.apellidos}
                            {esVendedor && (
                                <BadgeCheck
                                    className="h-5 w-5 shrink-0 fill-blue-500 text-white lg:h-[18px] lg:w-[18px]"
                                    strokeWidth={2.5}
                                    aria-label="Vendedor con publicaciones"
                                />
                            )}
                        </h1>
                        {/* Ciudad + miembro desde — pegados al nombre. */}
                        {perfil.ciudad && (
                            <div className="mt-1 flex items-center gap-1.5 text-base font-medium text-slate-600 lg:mt-1 lg:text-sm">
                                <MapPin
                                    className="h-4 w-4 shrink-0 text-slate-500 lg:h-3.5 lg:w-3.5"
                                    strokeWidth={2}
                                />
                                {perfil.ciudad}
                            </div>
                        )}
                        {/* 2026-08-15: con el sidebar de Apartar abierto, en
                            Laptop los botones de contacto ya no caben en la
                            columna derecha (quedó angosta) — se muestran acá,
                            en la misma línea de "Miembro desde", alineados a
                            la derecha. En Desktop (`2xl:`) vuelven a su lugar
                            original de siempre (columna derecha). */}
                        <div
                            className={`mt-0.5 flex items-center gap-2 ${
                                panelApartarAbierto ? 'lg:justify-between' : ''
                            }`}
                        >
                            <p className="text-sm font-medium text-slate-500 lg:text-xs">
                                Miembro desde: {formatearMiembroDesde(perfil.miembroDesde)}
                            </p>
                            {hayAccionesContacto && panelApartarAbierto && (
                                <div className="hidden items-center gap-3 lg:flex 2xl:hidden">
                                    {renderBotonesContacto('-compacto')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Columna derecha: KPIs (3 cards) + botones (3 cols) ───── */}
                <div className="flex flex-col gap-3 lg:gap-2">
                    {esVendedor && grupoActivo === 'marketplace' && (
                        <div
                            data-testid="kpis-vendedor"
                            className={`grid grid-cols-2 divide-x-2 divide-slate-300 overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100 ${
                                // 2026-08-15: con el sidebar de Apartar abierto, en
                                // Laptop (`lg:`) se oculta todo el bloque de KPIs
                                // para dejarle el espacio limpio solo al nombre
                                // (que si no, se quiebra en 3 líneas). En Desktop
                                // (`2xl:`) hay espacio de sobra, vuelve a mostrarse.
                                panelApartarAbierto ? 'lg:hidden 2xl:grid' : ''
                            }`}
                        >
                            <KpiCard
                                icono={<Package className="h-5 w-5 text-teal-600 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={totalActivos.toString()}
                                label="Publicaciones"
                            />
                            <KpiCard
                                icono={<ShoppingBag className="h-5 w-5 text-emerald-600 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={totalVendidos.toString()}
                                label="Vendidos"
                            />
                        </div>
                    )}

                    {esOrganizador && grupoActivo === 'dinamicas' && (
                        <div
                            data-testid="kpis-organizador-dinamicas"
                            className={`grid grid-cols-2 divide-x-2 divide-slate-300 overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100 ${
                                // Mismo criterio que kpis-vendedor: si dejaste
                                // una selección de Apartar pendiente y te
                                // cambiaste a la tab Dinámicas, el sidebar
                                // sigue abierto — el espacio en Laptop sigue
                                // sin sobrar.
                                panelApartarAbierto ? 'lg:hidden 2xl:grid' : ''
                            }`}
                        >
                            <KpiCard
                                icono={<Ticket className="h-5 w-5 text-amber-600 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={totalCompletadas.toString()}
                                label="Completadas"
                            />
                            <KpiCard
                                icono={<Ban className="h-5 w-5 text-rose-500 lg:h-4 lg:w-4" strokeWidth={1.75} />}
                                valor={totalCanceladas.toString()}
                                label="Canceladas"
                            />
                        </div>
                    )}

                    {hayAccionesContacto && (
                        <div
                            className={`flex flex-wrap items-center justify-center gap-3 lg:justify-end lg:gap-4 ${
                                // Duplicados junto a "Miembro desde" en Laptop
                                // cuando el sidebar de Apartar está abierto —
                                // ver esa otra instancia arriba, en la columna
                                // izquierda. En Desktop vuelven aquí.
                                panelApartarAbierto ? 'lg:hidden 2xl:flex' : ''
                            }`}
                        >
                            {renderBotonesContacto('')}
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
                    <p className="flex-1 text-sm font-semibold text-red-800">
                        Has bloqueado a este usuario.{' '}
                        <span className="font-medium text-red-700">
                            No podrán enviarse mensajes mutuamente.
                        </span>
                    </p>
                    <button
                        type="button"
                        onClick={onToggleBloqueo}
                        disabled={accionBloqueoEnCurso}
                        data-testid="btn-desbloquear-banner"
                        className="h-9 shrink-0 cursor-pointer rounded-lg border-2 border-red-300 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                        Desbloquear
                    </button>
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
        <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-center lg:py-1.5">
            <div className="text-xl font-black tracking-tight text-slate-950 leading-none lg:text-lg">
                {valor}
            </div>
            {/* Label en altas y bajas (Title Case) — Sprint 9.3:
                antes era UPPERCASE con tracking-wider, se cambió a
                Title Case porque se lee más natural en pantalla y
                permite tipografía un punto más grande sin saturar. */}
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 lg:text-xs">
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

    // Color del status dot — SIEMPRE visible según estado de presencia.
    // - conectado → verde (emerald)
    // - ausente   → ámbar
    // - desconectado / undefined → gris
    const dotColor =
        estadoPresencia === 'conectado'
            ? 'bg-emerald-500'
            : estadoPresencia === 'ausente'
                ? 'bg-amber-400'
                : 'bg-slate-400';

    // Sprint 9.3 (iteración): avatar simplificado — círculo plano con
    // fondo sky cuando no hay foto. Se removió el ring gradient brand
    // estilo Instagram (era demasiada decoración para un perfil
    // comercial de marketplace; el diseño nuevo prioriza claridad y
    // densidad de información).
    const [abierto, setAbierto] = useState(false);

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

// =============================================================================
// TABS — segmented control con Dark Gradient (TC-7), counter círculo
// =============================================================================

interface TabsGrupoProps {
    grupoActivo: 'marketplace' | 'dinamicas';
    mostrarMarketplace: boolean;
    mostrarDinamicas: boolean;
    totalMarketplace: number;
    totalDinamicas: number;
    onChange: (grupo: 'marketplace' | 'dinamicas') => void;
}

/** 2 tabs de nivel superior — MarketPlace vs Dinámicas. El estado del
 *  artículo (En venta/Vendidas) es un sub-filtro aparte, no otra tab al
 *  mismo nivel (mezclaba sección con estado). */
function TabsGrupo({
    grupoActivo,
    mostrarMarketplace,
    mostrarDinamicas,
    totalMarketplace,
    totalDinamicas,
    onChange,
}: TabsGrupoProps) {
    return (
        <div
            role="tablist"
            className="flex gap-4 overflow-x-auto border-b-2 border-slate-300 lg:gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            {mostrarMarketplace && (
                <TabUnderline
                    activa={grupoActivo === 'marketplace'}
                    icono={<ShoppingCart className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                    label="MarketPlace"
                    count={totalMarketplace}
                    onClick={() => onChange('marketplace')}
                    testId="tab-marketplace"
                />
            )}
            {mostrarDinamicas && (
                <TabUnderline
                    activa={grupoActivo === 'dinamicas'}
                    icono={<Ticket className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
                    label="Dinámicas"
                    count={totalDinamicas}
                    onClick={() => onChange('dinamicas')}
                    testId="tab-dinamicas"
                    acento="amber"
                />
            )}
        </div>
    );
}

interface ChipSubFiltroProps {
    activo: boolean;
    label: string;
    count: number;
    onClick: () => void;
    testId: string;
}

/** Sub-filtro dentro del grupo MarketPlace (En venta/Vendidas) — chip
 *  redondeado, mismo patrón que `ChipsFiltrosFeed.tsx` (variant clara). */
function ChipSubFiltro({ activo, label, count, onClick, testId }: ChipSubFiltroProps) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            aria-pressed={activo}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold lg:cursor-pointer ${
                activo
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 lg:hover:border-teal-400 lg:hover:text-teal-700'
            }`}
        >
            <span>{label}</span>
            <span className={`tabular-nums ${activo ? 'text-white/80' : 'text-slate-400'}`}>
                {count}
            </span>
        </button>
    );
}

interface TabUnderlineProps {
    activa: boolean;
    icono: React.ReactNode;
    label: React.ReactNode;
    count: number;
    onClick: () => void;
    testId: string;
    /** Color de acento cuando la tab está activa — 'teal' (default, Publicaciones/Vendidos)
     *  o 'amber' (Dinámicas, misma identidad ámbar que el resto del módulo). */
    acento?: 'teal' | 'amber';
}

/**
 * Tab underline minimalista: texto + counter inline, sin contenedor de fondo.
 * Tab activa lleva texto teal-700 + underline teal-500 (4px) absoluto al
 * fondo, posicionado sobre el `border-b-2 slate-200` del tablist para tapar
 * esa zona. Tab inactiva en slate-500 con hover slate-700.
 * Patrón B2B clásico (Linear/Stripe/Notion).
 */
function TabUnderline({ activa, icono, label, count, onClick, testId, acento = 'teal' }: TabUnderlineProps) {
    const colorActivo = acento === 'amber'
        ? { borde: 'border-amber-500', texto: 'text-amber-700' }
        : { borde: 'border-teal-500', texto: 'text-teal-700' };

    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="tab"
            aria-selected={activa}
            className={`relative -mb-0.5 inline-flex shrink-0 items-center gap-2.5 border-b-2 px-1 pb-3.5 pt-1.5 text-base font-bold whitespace-nowrap transition-colors lg:cursor-pointer lg:pb-1.5 lg:pt-1 lg:text-lg ${
                activa
                    ? `${colorActivo.borde} ${colorActivo.texto}`
                    : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
        >
            {icono}
            <span>{label}</span>
            <span
                className={`text-sm font-bold tabular-nums ${
                    activa ? colorActivo.texto : 'text-slate-500'
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
    tab: 'vendo' | 'busco' | 'vendida';
    esUnoMismo: boolean;
    totalTab: number;
}

function EstadoVacio({ tab, esUnoMismo, totalTab }: EstadoVacioProps) {
    // Configuración por tab — icono, título y cuerpo cambian según contexto.
    // Patrón visual unificado con MarketPlace, Negocios, Ofertas, Mis Guardados:
    // halos animate-ping + sparkles decorativos + icono con gradient brand teal.
    const configPorTab = {
        vendo: {
            icono: <Package className="h-11 w-11 text-white" strokeWidth={2} />,
            titulo: esUnoMismo
                ? 'Aún no tienes artículos en tu catálogo'
                : 'Sin artículos en el catálogo',
            cuerpo:
                totalTab > 0
                    ? 'No hay más resultados para mostrar.'
                    : esUnoMismo
                        ? 'Publica tu primer artículo y empieza a vender hoy mismo.'
                        : 'Cuando publique algo nuevo, aparecerá aquí.',
        },
        busco: {
            icono: <ShoppingCart className="h-11 w-11 text-white" strokeWidth={2} />,
            titulo: esUnoMismo
                ? 'Aún no tienes búsquedas publicadas'
                : 'Sin búsquedas activas',
            cuerpo:
                totalTab > 0
                    ? 'No hay más resultados para mostrar.'
                    : esUnoMismo
                        ? 'Publica qué buscas y la comunidad te puede ayudar.'
                        : 'Cuando publique una búsqueda, aparecerá aquí.',
        },
        vendida: {
            icono: <ShoppingBag className="h-11 w-11 text-white" strokeWidth={2} />,
            titulo: esUnoMismo ? 'Aún no has vendido nada' : 'Sin ventas registradas',
            cuerpo:
                totalTab > 0
                    ? 'No hay más resultados para mostrar.'
                    : 'Cuando se complete una venta, aparecerá aquí.',
        },
    };
    const config = configPorTab[tab];

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
