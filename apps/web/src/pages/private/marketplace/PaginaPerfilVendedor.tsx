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
 * Layout v4 (2026-08-16) — header oscuro unificado, calca el patrón de
 * Mis Guardados/CardYA (antes: tarjeta blanca de identidad + KPIs + 2
 * niveles de tabs/chips separados, que se comían casi la mitad del alto):
 *  - Sin fondo propio: hereda el degradado azul global del MainLayout.
 *  - Header oscuro sticky, 2 renglones:
 *      · Renglón 1 — volver + avatar chico (con status dot online real
 *        vía Socket.io, patrón ChatYA) + nombre/badge verificado + ciudad,
 *        y a la derecha WhatsApp + ChatYA + "Agregar a contactos"
 *        (UserPlus/UserCheck, persiste en `chat_contactos`) + Compartir
 *        catálogo o Bloquear según el caso.
 *      · Renglón 2 — chips unificados (`ChipUnificado`): Catálogo/Busco/
 *        Vendidas (dueño) + Dinámicas, aplanando lo que antes eran 2
 *        niveles de tabs/sub-filtros en una sola fila.
 *  - Sin KPIs (Publicaciones/Vendidos se quitaron: el conteo ya vive en
 *    cada chip).
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
import { useGuardados } from '../../../hooks/useGuardados';
import {
    ChevronLeft,
    UserPlus,
    UserCheck,
    AlertCircle,
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
import { useIniciarChatMarketplace } from '../../../hooks/useIniciarChatMarketplace';
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
    // Zoom del avatar en el header — click para ver la foto en grande.
    const [avatarModalAbierto, setAvatarModalAbierto] = useState(false);

    // Posición del sidebar de Apartar (2026-08-17): es `fixed` (ver
    // PanelApartar) — un `right` fijo por Tailwind no sirve aquí porque esta
    // página vive dentro de MainLayout, con una columna de publicidad de
    // ancho variable a la derecha; sin medir, el sidebar podía quedar
    // encima de esa columna en vez de a su izquierda. Se mide el borde
    // derecho y la orilla superior reales de la grilla de cards.
    const cardsRef = useRef<HTMLDivElement>(null);
    const [posicionSidebar, setPosicionSidebar] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        if (seleccionadosApartar.size === 0) return;
        const medir = () => {
            if (cardsRef.current) {
                const rect = cardsRef.current.getBoundingClientRect();
                // +16 = el `lg:py-4` del div interior (`cardsRef` está en el
                // wrapper de afuera, que no tiene padding propio) — sin esto
                // el sidebar quedaba 16px más arriba que las cards reales.
                setPosicionSidebar({ left: rect.right + 16, top: rect.top + 16 });
            }
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, [seleccionadosApartar.size]);

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
            mensaje: `Hola ${perfil.nombre}, vi tu catálogo en AnunciaYA. `,
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

                        {/* Contenido del header — 2026-08-16: UNIFICADO en un
                            solo bloque oscuro (calca el patrón de Mis
                            Guardados/CardYA). Antes: identidad+KPIs vivían en
                            un HeroCard blanco aparte + 2 filas de chips
                            separadas (grupo MarketPlace/Dinámicas, y dentro
                            de MarketPlace otra fila Catálogo/Busco/Vendidas)
                            — entre header+card+2 filas de chips se comía casi
                            la mitad del alto antes de ver la primera fila de
                            cards. Ahora: 1 renglón de identidad+contacto, 1
                            renglón de chips (grupo y sub-filtro aplanados a
                            un solo nivel — ChipUnificado). Los KPIs
                            (Publicaciones/Vendidos) se quitaron: el conteo ya
                            se ve en cada chip, y "Vendidos" no aportaba
                            confianza real en un vendedor chico. */}
                        <div className="relative z-10 px-3 pt-3 pb-2.5 lg:px-4 lg:py-2.5 2xl:px-3 2xl:pt-3 2xl:pb-2.5">
                            {/* Renglón 1 — volver + avatar + nombre/ciudad + contacto.
                                items-start (2026-08-16): el bloque de texto ahora
                                tiene 3 líneas (nombre/ciudad/íconos) y se alinea
                                arriba contra el avatar, no centrado contra él. */}
                            <div className="flex items-start gap-2">
                                <button
                                    data-testid="btn-volver-perfil"
                                    onClick={handleVolver}
                                    aria-label="Volver"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-white/50 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                                >
                                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                </button>

                                {/* Avatar — agrandado (2026-08-17, ahora a la
                                    par del alto que ocupan nombre+íconos) +
                                    anillo animado (conic-gradient girando,
                                    igual que el sidebar de la vista pública)
                                    + status dot. */}
                                <div className="relative shrink-0 h-16 w-16 lg:h-16 lg:w-16">
                                    <div
                                        className="absolute inset-0 animate-spin rounded-full"
                                        style={{
                                            background: 'conic-gradient(from 0deg, #2dd4bf, #38bdf8, #a855f7, #f97316, #2dd4bf)',
                                            animationDuration: '3s',
                                        }}
                                    />
                                    <div className="absolute inset-[3px] rounded-full bg-black" />
                                    <div
                                        className={`absolute inset-[6px] overflow-hidden rounded-full ${
                                            perfil.avatarUrl ? 'lg:cursor-pointer' : ''
                                        }`}
                                        onClick={perfil.avatarUrl ? () => setAvatarModalAbierto(true) : undefined}
                                    >
                                        {perfil.avatarUrl ? (
                                            <img
                                                src={perfil.avatarUrl}
                                                alt={perfil.nombre}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
                                                style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)' }}
                                            >
                                                {obtenerIniciales(perfil.nombre, perfil.apellidos)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Sobre el borde de la FOTO (inset-[6px]),
                                        no de la esquina del anillo — antes
                                        quedaba flotando en el hueco del
                                        anillo animado. 2026-08-17: el badge
                                        de Verificado vive AQUÍ siempre que es
                                        vendedor (antes solo en tu propio
                                        perfil; el resto veía el check junto
                                        al nombre — se unificó, ya no hay
                                        badge junto al nombre en ningún caso).
                                        El puntito de en línea/ausente solo
                                        aplica a perfiles que NO son
                                        vendedores. */}
                                    {esVendedor ? (
                                        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white lg:h-6 lg:w-6">
                                            <BadgeCheck className="h-full w-full fill-blue-500 text-white" strokeWidth={2.5} />
                                        </span>
                                    ) : (
                                        <span
                                            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-black lg:bottom-0.5 lg:right-0.5 lg:h-3.5 lg:w-3.5 ${
                                                estadoPresencia === 'conectado'
                                                    ? 'bg-emerald-500'
                                                    : estadoPresencia === 'ausente'
                                                        ? 'bg-amber-400'
                                                        : 'bg-slate-400'
                                            }`}
                                        />
                                    )}
                                    {avatarModalAbierto && perfil.avatarUrl && (
                                        <ModalImagenes
                                            images={[perfil.avatarUrl]}
                                            initialIndex={0}
                                            isOpen={avatarModalAbierto}
                                            onClose={() => setAvatarModalAbierto(false)}
                                        />
                                    )}
                                </div>

                                {/* Nombre + ciudad — agrandados (2026-08-16) —
                                    y debajo, el contacto directo (WhatsApp/
                                    ChatYA/Agregar contacto), que antes vivía
                                    a la derecha del renglón. */}
                                <div className={`min-w-0 flex-1 lg:flex-none ${esUnoMismo ? 'self-center' : ''}`}>
                                    {/* 2026-08-17: en tu propio perfil no
                                        salen los íconos de contacto (no te
                                        contactas a ti mismo) — sin ellos, el
                                        nombre en 1 sola línea se ve muy
                                        angosto/desbalanceado contra el
                                        avatar. Ahí (solo ahí) se fuerza a 2
                                        líneas y el bloque completo se centra
                                        verticalmente contra el avatar
                                        (`self-center` arriba); en el perfil
                                        de alguien más se queda la estructura
                                        de siempre (1 línea truncada + íconos
                                        debajo, alineado arriba). El check de
                                        Verificado ya no va aquí en NINGÚN
                                        caso — se unificó en el propio avatar
                                        (ver más arriba), tanto en tu perfil
                                        como en el de alguien más. */}
                                    <h1 className="flex items-center gap-1.5 text-xl font-extrabold leading-tight tracking-tight text-white lg:text-lg">
                                        {esUnoMismo ? (
                                            <span className="flex flex-col">
                                                <span className="truncate">{perfil.nombre}</span>
                                                <span className="truncate">{perfil.apellidos}</span>
                                            </span>
                                        ) : (
                                            <span className="truncate">
                                                {perfil.nombre} {perfil.apellidos}
                                            </span>
                                        )}
                                    </h1>
                                    {!esUnoMismo && !estaBloqueado && (
                                        <div className="mt-1 flex items-center gap-1">
                                            {perfil.telefono && (
                                                <button
                                                    type="button"
                                                    data-testid="btn-whatsapp-vendedor"
                                                    onClick={handleWhatsApp}
                                                    aria-label="Contactar por WhatsApp"
                                                    className="flex h-10 w-10 items-center justify-center rounded-lg lg:cursor-pointer lg:hover:bg-white/10"
                                                >
                                                    <WhatsAppIcon className="h-7 w-7" />
                                                </button>
                                            )}
                                            <Tooltip text="ChatYA" position="bottom" className="shrink-0">
                                                <button
                                                    type="button"
                                                    data-testid="btn-chatya-vendedor"
                                                    onClick={handleEnviarMensaje}
                                                    aria-label="Enviar mensaje por ChatYA"
                                                    className="flex h-10 w-10 items-center justify-center rounded-lg lg:cursor-pointer lg:hover:bg-white/10"
                                                >
                                                    <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-7 w-auto object-contain" />
                                                </button>
                                            </Tooltip>
                                            <Tooltip
                                                text={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                                                position="bottom"
                                                className="shrink-0"
                                            >
                                                <button
                                                    type="button"
                                                    data-testid="btn-agregar-contacto"
                                                    onClick={handleToggleContacto}
                                                    disabled={accionContactoEnCurso}
                                                    aria-pressed={esContacto}
                                                    aria-label={esContacto ? 'Quitar de contactos' : 'Agregar a contactos'}
                                                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white/50 disabled:opacity-60 lg:cursor-pointer lg:hover:bg-white/10 lg:hover:text-white"
                                                >
                                                    {esContacto ? (
                                                        <UserCheck className="h-7 w-7" strokeWidth={2.25} />
                                                    ) : (
                                                        <UserPlus className="h-7 w-7" strokeWidth={2.25} />
                                                    )}
                                                </button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>

                                {/* Chips en el renglón 1 — solo laptop/PC, en
                                    la franja vacía entre el nombre y los
                                    íconos de la derecha (2026-08-16). En
                                    móvil no hay ese espacio: se quedan abajo,
                                    en su propio renglón (ver más abajo). */}
                                {(esVendedor || esOrganizador) && (
                                    <div
                                        className="hidden flex-1 items-center justify-center gap-2 self-center overflow-x-auto lg:flex [&::-webkit-scrollbar]:hidden"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {esVendedor && (
                                            <>
                                                <ChipUnificado
                                                    activo={grupoActivo === 'marketplace' && subFiltroMP === 'vendo'}
                                                    label="Catálogo"
                                                    count={totalActivosVendo}
                                                    onClick={() => { setGrupoActivo('marketplace'); setSubFiltroMP('vendo'); }}
                                                    testId="chip-catalogo-desktop"
                                                />
                                                {esUnoMismo && (
                                                    <ChipUnificado
                                                        activo={grupoActivo === 'marketplace' && subFiltroMP === 'vendida'}
                                                        label="Vendidas"
                                                        count={totalVendidos}
                                                        onClick={() => { setGrupoActivo('marketplace'); setSubFiltroMP('vendida'); }}
                                                        testId="chip-vendidas-desktop"
                                                    />
                                                )}
                                            </>
                                        )}
                                        {esOrganizador && (
                                            <>
                                                <ChipUnificado
                                                    activo={grupoActivo === 'dinamicas' && subFiltroDinamicas === 'activa'}
                                                    label="Dinámicas"
                                                    count={dinamicasActivas.length}
                                                    onClick={() => { setGrupoActivo('dinamicas'); setSubFiltroDinamicas('activa'); }}
                                                    testId="chip-dinamicas-desktop"
                                                />
                                                <ChipUnificado
                                                    activo={grupoActivo === 'dinamicas' && subFiltroDinamicas === 'cerrada'}
                                                    label="Cerradas"
                                                    count={dinamicasCerradas.length}
                                                    onClick={() => { setGrupoActivo('dinamicas'); setSubFiltroDinamicas('cerrada'); }}
                                                    testId="chip-dinamicas-cerradas-desktop"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Compartir el link público de Mi Catálogo
                                    (2026-08-12) — tanto en tu propio perfil
                                    como en el de alguien más que sí tenga
                                    catálogo. Si es alguien más SIN catálogo
                                    (solo comentarista), no hay nada que
                                    compartir — se conserva el botón Bloquear.
                                    Solo en la tab MarketPlace: el link
                                    compartido nunca incluye Dinámicas. */}
                                {/* 2026-08-17: `Tooltip` en móvil ignora su
                                    `className` (regresa `children` sin
                                    envolver, ver Tooltip.tsx) — el
                                    `hidden lg:block` de abajo nunca ocultó el
                                    ícono real en móvil, solo su tooltip.
                                    Ahora el `hidden lg:block` envuelve por
                                    FUERA del propio `Tooltip`. Esta copia de
                                    escritorio queda oculta en móvil; la
                                    copia de móvil vive en el renglón 2. */}
                                {esVendedor && grupoActivo === 'marketplace' && (
                                    <div className="hidden shrink-0 lg:block">
                                        <Tooltip
                                            text={esUnoMismo ? 'Compartir mi Catálogo' : 'Compartir este catálogo'}
                                            position="bottom"
                                        >
                                            <DropdownCompartir
                                                url={`${window.location.origin}/p/marketplace/usuario/${perfil.id}`}
                                                texto={`¡Mira ${esUnoMismo ? 'mi' : 'este'} catálogo en AnunciaYA! ${perfil.nombre} ${perfil.apellidos}`}
                                                titulo={esUnoMismo ? 'Mi Catálogo' : `Catálogo de ${perfil.nombre}`}
                                                variante="dark"
                                            />
                                        </Tooltip>
                                    </div>
                                )}
                                {!esUnoMismo && !(esVendedor && grupoActivo === 'marketplace') && (
                                    <div className="hidden shrink-0 lg:block">
                                        <Tooltip
                                            text={estaBloqueado ? 'Desbloquear usuario' : 'Bloquear usuario'}
                                            position="bottom"
                                        >
                                            <button
                                                data-testid="btn-toggle-bloqueo"
                                                onClick={handleToggleBloqueo}
                                                disabled={accionBloqueoEnCurso}
                                                aria-label={estaBloqueado ? 'Desbloquear usuario' : 'Bloquear usuario'}
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:opacity-60 lg:cursor-pointer lg:hover:bg-white/10 ${
                                                    estaBloqueado
                                                        ? 'text-red-400 lg:hover:text-red-300'
                                                        : 'text-white/50 lg:hover:text-white'
                                                }`}
                                            >
                                                {estaBloqueado ? (
                                                    <ShieldOff className="h-5 w-5" strokeWidth={2.5} />
                                                ) : (
                                                    <Ban className="h-5 w-5" strokeWidth={2.5} />
                                                )}
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>

                            {/* Renglón 2 — solo móvil (`lg:hidden`): en
                                laptop/PC los mismos chips ya viven arriba,
                                en el renglón 1. Chips alineados a la
                                izquierda (2026-08-17, antes centrados); el
                                ícono de Compartir/Bloquear —oculto en móvil
                                hasta ahora, solo vivía en el renglón 1 de
                                escritorio— se agrega aquí, a la derecha, al
                                mismo nivel que los chips. */}
                            {(esVendedor || esOrganizador) && (
                                <div className="mt-2 flex items-center justify-between gap-2 lg:hidden">
                                    <div
                                        className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
                                        {esVendedor && (
                                            <>
                                                <ChipUnificado
                                                    activo={grupoActivo === 'marketplace' && subFiltroMP === 'vendo'}
                                                    label="Catálogo"
                                                    count={totalActivosVendo}
                                                    onClick={() => { setGrupoActivo('marketplace'); setSubFiltroMP('vendo'); }}
                                                    testId="chip-catalogo"
                                                />
                                                {esUnoMismo && (
                                                    <ChipUnificado
                                                        activo={grupoActivo === 'marketplace' && subFiltroMP === 'vendida'}
                                                        label="Vendidas"
                                                        count={totalVendidos}
                                                        onClick={() => { setGrupoActivo('marketplace'); setSubFiltroMP('vendida'); }}
                                                        testId="chip-vendidas"
                                                    />
                                                )}
                                            </>
                                        )}
                                        {esOrganizador && (
                                            <>
                                                <ChipUnificado
                                                    activo={grupoActivo === 'dinamicas' && subFiltroDinamicas === 'activa'}
                                                    label="Dinámicas"
                                                    count={dinamicasActivas.length}
                                                    onClick={() => { setGrupoActivo('dinamicas'); setSubFiltroDinamicas('activa'); }}
                                                    testId="chip-dinamicas"
                                                />
                                                <ChipUnificado
                                                    activo={grupoActivo === 'dinamicas' && subFiltroDinamicas === 'cerrada'}
                                                    label="Cerradas"
                                                    count={dinamicasCerradas.length}
                                                    onClick={() => { setGrupoActivo('dinamicas'); setSubFiltroDinamicas('cerrada'); }}
                                                    testId="chip-dinamicas-cerradas"
                                                />
                                            </>
                                        )}
                                    </div>

                                    {esVendedor && grupoActivo === 'marketplace' && (
                                        <DropdownCompartir
                                            url={`${window.location.origin}/p/marketplace/usuario/${perfil.id}`}
                                            texto={`¡Mira ${esUnoMismo ? 'mi' : 'este'} catálogo en AnunciaYA! ${perfil.nombre} ${perfil.apellidos}`}
                                            titulo={esUnoMismo ? 'Mi Catálogo' : `Catálogo de ${perfil.nombre}`}
                                            variante="dark"
                                        />
                                    )}
                                    {!esUnoMismo && !(esVendedor && grupoActivo === 'marketplace') && (
                                        <button
                                            data-testid="btn-toggle-bloqueo-movil"
                                            onClick={handleToggleBloqueo}
                                            disabled={accionBloqueoEnCurso}
                                            aria-label={estaBloqueado ? 'Desbloquear usuario' : 'Bloquear usuario'}
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:opacity-60 ${
                                                estaBloqueado ? 'text-red-400' : 'text-white/50'
                                            }`}
                                        >
                                            {estaBloqueado ? (
                                                <ShieldOff className="h-5 w-5" strokeWidth={2.5} />
                                            ) : (
                                                <Ban className="h-5 w-5" strokeWidth={2.5} />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR — max 920px para igualar al feed de MP. Móvil: contenedor con scroll propio.
                2026-08-17: `PanelApartar` volvió a ser `fixed` (porteado a
                document.body, ver su comentario) — ya no es una columna
                real del grid, así que aquí solo queda reservarle margen-
                derecha al contenido cuando hay selección, para que las
                cards no queden debajo de él. Sin selección, vuelve al
                contenedor de una sola columna angosto de siempre. */}
            <div
                ref={cuerpoRef}
                className={`flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24 lg:flex-none lg:overflow-visible lg:pb-0 lg:mx-auto lg:max-w-7xl lg:px-6 ${
                    seleccionadosApartar.size > 0 ? '2xl:px-8' : '2xl:max-w-[920px] 2xl:px-4'
                }`}
            >
                <div ref={cardsRef} className={`min-w-0 ${seleccionadosApartar.size > 0 ? 'lg:mr-[19rem] 2xl:mr-[21rem]' : ''}`}>
                <div className="px-3 py-5 lg:px-0 lg:py-4">

                    {/* 2026-08-16: HeroCard y TabsGrupo se quitaron de aquí —
                        la identidad+contacto y los chips de grupo/sub-filtro
                        ahora viven arriba, en el header oscuro unificado.
                        2026-08-17: el sub-filtro Activas/Cerradas de
                        Dinámicas también se subió al header (chips
                        "Dinámicas"/"Cerradas" junto a Catálogo/Vendidas) —
                        aquí ya solo queda el grid de contenido. */}
                    {(esVendedor || esOrganizador) && (
                        <div>
                            <div className="mt-4 lg:mt-0">
                                {grupoActivo === 'dinamicas' ? (
                                    cargandoDinamicas && !dinamicasOrganizador ? (
                                        <div className="flex min-h-40 items-center justify-center">
                                            <Spinner tamanio="md" />
                                        </div>
                                    ) : dinamicasFiltradas.length === 0 ? (
                                        <EstadoVacio
                                            tab={subFiltroDinamicas === 'activa' ? 'dinamicas_activa' : 'dinamicas_cerrada'}
                                            esUnoMismo={esUnoMismo}
                                            totalTab={0}
                                        />
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
                    posicion={posicionSidebar}
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
    // Zoom del avatar en el sidebar — click para ver la foto en grande.
    const [avatarModalAbierto, setAvatarModalAbierto] = useState(false);

    // Alineación del sidebar de Apartar (2026-08-17): es `fixed` (siempre
    // visible, no depende de un contenedor con scroll — ver PanelApartar),
    // así que su posición ya no la resuelve el layout solo. Se MIDE la
    // orilla superior real de la grilla de cards y se aplica directo por
    // `style`, igual patrón que se usaba antes de la versión "grid".
    const cardsRef = useRef<HTMLDivElement>(null);
    const [posicionSidebar, setPosicionSidebar] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        if (seleccionados.size === 0) return;
        const medir = () => {
            if (cardsRef.current) {
                const rect = cardsRef.current.getBoundingClientRect();
                setPosicionSidebar({ left: rect.right + 16, top: rect.top });
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
        // Esta página pública es "bare" (sin MainLayout) — no tiene montado
        // el panel flotante de ChatYA. `iniciarChatDirectoPersona` deja la
        // conversación lista en el store global (persiste entre rutas);
        // navegar al perfil privado monta MainLayout (y ChatYA con él) y la
        // conversación aparece ya abierta.
        await iniciarChatDirectoPersona({
            usuarioId: perfil.id,
            nombre: perfil.nombre,
            apellidos: perfil.apellidos,
            avatarUrl: perfil.avatarUrl,
            mensaje: `Hola ${perfil.nombre}, vi tu catálogo en AnunciaYA. `,
        });
        navigate(`/marketplace/usuario/${perfil.id}`);
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

            <div className="flex flex-1 min-h-0">
                {/* Sidebar izquierdo — identidad del vendedor, SOLO Laptop/PC
                    (2026-08-17, reemplaza al header horizontal de arriba en
                    estas resoluciones — fijo, no scrollea con las cards). En
                    móvil no hay espacio para un sidebar fijo: ahí se
                    conserva el header horizontal de siempre, dentro de
                    `<main>` más abajo. */}
                <aside
                    className="relative hidden shrink-0 flex-col overflow-hidden lg:flex lg:w-56 2xl:w-64"
                    style={{ background: '#000000' }}
                >
                    {/* Glow teal */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.14) 0%, transparent 60%)' }}
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
                    {/* Línea de acento — borde derecho (equivalente vertical
                        de las líneas sup/inf del header horizontal de antes) */}
                    <div
                        className="pointer-events-none absolute bottom-0 right-0 top-0 w-[3px]"
                        style={{ background: 'linear-gradient(180deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                    />

                    <div className="relative z-10 flex flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-6 2xl:gap-5 2xl:px-5 2xl:py-8">
                        {/* Avatar — anillo animado (conic-gradient girando
                            detrás, `animate-spin`) + badge de Verificado
                            sobre el contorno (esquina inf-der), click para
                            ver en grande. El avatar y el badge van en capas
                            SEPARADAS del anillo (no dentro de él) para que
                            solo el color gire, nunca la foto. */}
                        <div className="relative h-20 w-20 shrink-0 2xl:h-24 2xl:w-24">
                            <div
                                className="absolute inset-0 animate-spin rounded-full"
                                style={{
                                    background: 'conic-gradient(from 0deg, #2dd4bf, #38bdf8, #a855f7, #f97316, #2dd4bf)',
                                    animationDuration: '3s',
                                }}
                            />
                            <div className="absolute inset-[3px] rounded-full bg-black" />
                            <div
                                className={`absolute inset-[6px] overflow-hidden rounded-full ${
                                    perfil.avatarUrl ? 'lg:cursor-pointer' : ''
                                }`}
                                onClick={perfil.avatarUrl ? () => setAvatarModalAbierto(true) : undefined}
                            >
                                {perfil.avatarUrl ? (
                                    <img src={perfil.avatarUrl} alt={perfil.nombre} className="h-full w-full object-cover" />
                                ) : (
                                    <div
                                        className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)' }}
                                    >
                                        {iniciales}
                                    </div>
                                )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-white 2xl:h-7 2xl:w-7">
                                <BadgeCheck className="h-full w-full fill-blue-500 text-white" strokeWidth={2.5} />
                            </span>
                        </div>
                        {avatarModalAbierto && perfil.avatarUrl && (
                            <ModalImagenes
                                images={[perfil.avatarUrl]}
                                initialIndex={0}
                                isOpen={avatarModalAbierto}
                                onClose={() => setAvatarModalAbierto(false)}
                            />
                        )}

                        {/* Nombre — FORZADO a 2 líneas (nombre / apellidos
                            en bloques separados), centrado. El badge de
                            Verificado se movió al avatar (arriba). */}
                        <div className="flex w-full flex-col items-center gap-0.5 text-center">
                            <span className="text-sm font-extrabold leading-snug text-white 2xl:text-base">
                                {perfil.nombre}
                            </span>
                            <span className="text-sm font-extrabold leading-snug text-white 2xl:text-base">
                                {perfil.apellidos}
                            </span>
                        </div>

                        {/* Contacto directo */}
                        <div className="flex items-center gap-3">
                            {perfil.telefono && (
                                <button
                                    type="button"
                                    data-testid="btn-whatsapp-catalogo"
                                    onClick={handleWhatsApp}
                                    aria-label="Contactar por WhatsApp"
                                    className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                                >
                                    <WhatsAppIcon className="h-7 w-7" />
                                </button>
                            )}
                            <button
                                type="button"
                                data-testid="btn-chatya-catalogo"
                                onClick={handleEnviarMensaje}
                                aria-label="Enviar mensaje por ChatYA"
                                className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <img src="/ChatYA.webp" alt="ChatYA" className="h-8 w-auto shrink-0 object-contain" />
                            </button>
                        </div>

                        {/* "Mi Catálogo" — mismo lenguaje visual (icono con
                            gradiente teal + texto bicolor) que antes vivía en
                            el header horizontal, ahora apilado y centrado
                            para el sidebar vertical. `mt-auto` (2026-08-17):
                            lo empuja hasta abajo del sidebar en vez de
                            quedar pegado justo debajo del contacto. */}
                        <div className="mt-auto flex flex-col items-center gap-2 pb-2 text-center">
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-md 2xl:h-16 2xl:w-16"
                                style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
                            >
                                <ShoppingBag className="h-7 w-7 text-white 2xl:h-8 2xl:w-8" strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-extrabold tracking-tight text-white 2xl:text-2xl">
                                Mi <span className="text-teal-400">Catálogo</span>
                            </span>
                            <span className="text-sm font-bold text-white/50">
                                {articulos.length} artículo{articulos.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    {/* Header horizontal oscuro — SOLO móvil (`lg:hidden`);
                        en Laptop/PC la identidad vive en el sidebar de la
                        izquierda de arriba. */}
                    <div className="relative mt-1 overflow-hidden shadow-lg lg:hidden" style={{ background: '#000000' }}>
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.10) 0%, transparent 55%)' }}
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
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />

                        <div className="relative z-10 px-4 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-md">
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
                                    <h1 className="flex items-center gap-1.5 text-lg font-extrabold text-white">
                                        {perfil.nombre} {perfil.apellidos}
                                        <BadgeCheck className="h-5 w-5 shrink-0 fill-blue-500 text-white" strokeWidth={2.5} />
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-1">
                                        {perfil.telefono && (
                                            <button
                                                type="button"
                                                data-testid="btn-whatsapp-catalogo"
                                                onClick={handleWhatsApp}
                                                aria-label="Contactar por WhatsApp"
                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70"
                                            >
                                                <WhatsAppIcon className="h-8 w-8" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            data-testid="btn-chatya-catalogo"
                                            onClick={handleEnviarMensaje}
                                            aria-label="Enviar mensaje por ChatYA"
                                            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70"
                                        >
                                            <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto shrink-0 object-contain" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-md"
                                        style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
                                    >
                                        <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-2xl font-extrabold tracking-tight text-white">
                                            Mi <span className="text-teal-400">Catálogo</span>
                                        </span>
                                        <span className="text-sm font-bold text-white/50">
                                            {articulos.length} artículo{articulos.length === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2026-08-17: `min-h-full` en este bloque — llena
                        SIEMPRE el alto visible de `<main>` aunque haya pocos
                        artículos. El footer vive FUERA de este bloque (más
                        abajo, como hermano), así que cuando el contenido es
                        corto el total (bloque + footer) sigue siendo más
                        alto que lo visible → hace falta scroll para llegar
                        al footer, en vez de que quede pegado justo debajo de
                        las últimas cards. (Ojo: si el footer se mete DENTRO
                        de este `div` o el contenido lleva `flex-1`, el
                        bloque se estira para tragarse el hueco y el footer
                        vuelve a quedar visible sin scroll — ya pasó una vez.) */}
                    <div className="min-h-full">
                        <div
                            className={`mx-auto w-full px-3 py-4 lg:px-6 2xl:max-w-[1536px] 2xl:px-8 ${
                                // 2026-08-17: en Laptop, la caja se ENSANCHA
                                // la misma cantidad que el margen de abajo
                                // cuando hay selección (+19rem) — así el
                                // contenido se recorre a la izquierda en vez
                                // de encogerse. En PC (`2xl:`) la caja queda
                                // SIEMPRE en el ancho ancho (1536px, el mismo
                                // que antes solo se usaba con el sidebar
                                // abierto) — mismo tamaño de card con o sin
                                // sidebar, no solo mismo mecanismo de
                                // desplazamiento.
                                seleccionados.size > 0 ? 'lg:max-w-[89rem]' : 'lg:max-w-[70rem]'
                            }`}
                        >
                            <div
                                ref={cardsRef}
                                className={seleccionados.size > 0 ? 'lg:mr-[19rem] 2xl:mr-[21rem]' : ''}
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
                                        className={`grid grid-cols-2 items-start gap-3 lg:gap-3 2xl:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] ${
                                            // 2026-08-17: en PC (`2xl:`) ya no
                                            // se fija un número de columnas —
                                            // `auto-fill`/`minmax` deja el
                                            // TAMAÑO del card constante
                                            // (228px mínimo) y la cantidad
                                            // por fila sale sola según el
                                            // espacio disponible: ~6 sin
                                            // sidebar, ~5 con el sidebar
                                            // abierto (el margen de abajo
                                            // reduce el espacio, no el
                                            // tamaño). Laptop sigue con
                                            // número fijo (el truco de
                                            // ensanchar la caja ya deja el
                                            // tamaño constante ahí).
                                            seleccionados.size > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
                                        }`}
                                    >
                                        {articulos.map((a) => (
                                            <CardCatalogoVendedor
                                                key={a.id}
                                                articulo={a}
                                                seleccionado={seleccionados.has(a.id)}
                                                onToggleSeleccion={() => handleToggleSeleccion(a.id)}
                                                onVerDetalle={() => setArticuloDetalle(a)}
                                                ocultarGuardar
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <PanelApartar
                                articulos={articulos}
                                seleccionados={seleccionados}
                                onQuitar={(id) => handleToggleSeleccion(id)}
                                onLimpiar={() => setSeleccionados(new Set())}
                                usuarioActual={null}
                                posicion={posicionSidebar}
                            />
                        </div>
                    </div>

                    <FooterPublico />
                </main>
            </div>

            <ModalDetalleArticuloMarketplace
                articulo={articuloDetalle}
                vendedor={perfil}
                onCerrar={() => setArticuloDetalle(null)}
                onRequiereAuth={() => setModalAuthAbierto(true)}
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
    /** Selección múltiple: el botón "Apartar" full-width la alterna — el
     *  resto de la card (imagen/título/precio) abre el detalle. Calca la
     *  interacción de "+Agregar" (botón) vs click-en-card (detalle) del
     *  catálogo de Negocios (`PaginaCatalogoNegocio.tsx`). */
    seleccionado?: boolean;
    onToggleSeleccion?: () => void;
    /** Click en la card (fuera del círculo) — abre el modal de detalle. */
    onVerDetalle: () => void;
    /** true en el catálogo público (`MiCatalogoPublico`, 2026-08-16): ahí
     *  nunca hay usuario logueado (por diseño, ver
     *  Catalogo_MarketPlace_Apartado.md), así que "Guardar" no aplica. */
    ocultarGuardar?: boolean;
}

function CardCatalogoVendedor({ articulo, seleccionado, onToggleSeleccion, onVerDetalle, ocultarGuardar }: CardCatalogoVendedorProps) {
    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const apartado = !!articulo.apartadoHasta && new Date(articulo.apartadoHasta) > new Date();
    const modoSeleccion = !!onToggleSeleccion;
    const { guardado, loading: guardandoEnCurso, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articulo.id,
        initialGuardado: articulo.guardado,
    });

    return (
        <div
            data-testid={modoSeleccion ? `card-seleccionable-${articulo.id}` : `card-catalogo-${articulo.id}`}
            className={`relative flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-md ${
                seleccionado ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-300'
            }`}
        >
            {/* Imagen — tocar abre el detalle completo (calca el patrón de
                `PaginaCatalogoNegocio.tsx`: `div` con onClick, no un
                `<button>` envolvente, para poder anidar el botón "Apartar"
                sin botón-dentro-de-botón). */}
            <div
                onClick={onVerDetalle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onVerDetalle();
                    }
                }}
                aria-label={`Ver detalle de ${articulo.titulo}`}
                className="aspect-4/3 shrink-0 cursor-pointer overflow-hidden bg-slate-200"
            >
                {fotoPortada ? (
                    <img src={fotoPortada.url} alt={articulo.titulo} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-slate-300" />
                    </div>
                )}
                {apartado && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-800">
                            <Lock className="h-3.5 w-3.5" />
                            Apartado
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-3">
                <h4
                    onClick={onVerDetalle}
                    className="min-h-[2.25rem] cursor-pointer text-sm font-semibold text-slate-800 line-clamp-2 lg:min-h-[2.5rem]"
                >
                    {articulo.titulo}
                </h4>
                <p className="mt-0.5 text-base font-bold text-emerald-600">
                    ${parseFloat(articulo.precio ?? '0').toFixed(2)}
                    {articulo.unidadVenta && <span className="text-xs font-medium text-slate-500"> {articulo.unidadVenta}</span>}
                </p>

                {/* Apartar — full-width, calca "+Agregar" del catálogo de
                    Negocios (`PaginaCatalogoNegocio.tsx`); reemplaza al
                    círculo pequeño de la esquina (2026-08-17). Cuando el
                    artículo ya está apartado, se muestra igual pero
                    deshabilitado (texto "Apartado") — así todas las cards de
                    la fila quedan al mismo nivel, con o sin bloqueo. */}
                {modoSeleccion && (
                    <div className="mt-auto pt-2">
                        {apartado ? (
                            <button
                                type="button"
                                disabled
                                data-testid={`btn-apartar-${articulo.id}`}
                                className="flex h-9 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-slate-200 text-sm font-bold text-slate-500"
                            >
                                <Lock className="h-4 w-4" />
                                Apartado
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSeleccion?.();
                                }}
                                data-testid={`btn-apartar-${articulo.id}`}
                                aria-pressed={seleccionado}
                                className={`flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-colors ${
                                    seleccionado
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-slate-800 text-white hover:bg-slate-900'
                                }`}
                            >
                                {seleccionado ? (
                                    <>
                                        <Check className="h-4 w-4" strokeWidth={3} />
                                        Seleccionado
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4" />
                                        Apartar
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Guardar — esquina sup-der, mismo estilo glass (amber cuando
                guardado) que el resto de las cards de MarketPlace
                (`CardArticulo`). `stopPropagation` por la misma razón que
                el círculo de selección. Oculto en el catálogo público
                (`ocultarGuardar`), donde no hay usuario logueado. */}
            {!ocultarGuardar && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleGuardado();
                    }}
                    disabled={guardandoEnCurso}
                    data-testid={`btn-guardar-${articulo.id}`}
                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                    aria-pressed={guardado}
                    className={`absolute right-2 top-2 flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full overflow-visible backdrop-blur-[10px] disabled:opacity-50 ${
                        guardado ? 'border-2 border-amber-500 bg-white' : 'border border-white/10 bg-black/25'
                    }`}
                >
                    {guardado && (
                        <span
                            aria-hidden
                            className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-500/40"
                            style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
                        />
                    )}
                    <Icon icon={ICONOS.guardar} className="h-5 w-5" style={{ color: guardado ? '#f59e0b' : 'white' }} />
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
// botón de agregar/apartar aquí — eso vive solo en el botón "Apartar" de la card.
// =============================================================================

interface VendedorContacto {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    telefono: string | null;
    /** Necesario para armar el `ArticuloMarketplaceDetalle` que pide
     *  `useIniciarChatMarketplace` (2026-08-17) — ambos callers pasan
     *  `perfil`, que ya lo trae. */
    ciudad: string | null;
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
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChatMarketplace = useIniciarChatMarketplace();
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
        // Esta página pública es "bare" (sin MainLayout) — no tiene montado
        // el panel flotante de ChatYA para mostrar la conversación recién
        // abierta. `iniciarChatMarketplace` sí la deja lista en el store
        // global (Zustand, persiste entre rutas) — con card de contexto del
        // artículo + mensaje precargado, igual que en el detalle del feed
        // normal (2026-08-17). Navegar a la versión privada del perfil
        // monta MainLayout (y con él, ChatYA) y la conversación aparece ya
        // abierta.
        await iniciarChatMarketplace({ ...articulo, vendedor });
        onCerrar();
        navigate(`/marketplace/usuario/${vendedor.id}`);
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
    /** Clase Tailwind para la posición `fixed` en desktop (right/top) —
     *  2026-08-17: vuelve a ser `fixed` (relativo al viewport, SIEMPRE
     *  visible) en vez de `sticky` (relativo a su contenedor en el grid).
     *  Con `sticky` + `items-start`, si el catálogo tenía pocos artículos
     *  (o el propio sidebar era más alto que la columna de cards) el
     *  "carril" donde se podía pegar terminaba antes de llegar al footer —
     *  el sidebar se despegaba y desaparecía a medio scroll, que es
     *  justo lo que no se quería. `fixed` no tiene ese problema: nunca se
     *  mueve del viewport pase lo que pase con el contenido. Cada página
     *  pasa su propio offset porque tienen headers de distinta altura por
     *  encima (Navbar+header oscuro en la privada, solo HeaderPublico en
     *  la pública). */
    claseFijo?: string;
    /** Posición medida en píxeles (borde derecho y orilla superior reales
     *  de la grilla de cards, vía `getBoundingClientRect()`) — si se pasa,
     *  alinea el sidebar ahí (`left`/`top` por `style`) en vez de usar los
     *  valores fijos de `claseFijo`. Es el mismo patrón que ya se usaba
     *  antes de la versión "grid": adivinar un `right`/`top` fijo por
     *  Tailwind se desalinea apenas cambia algo alrededor (ej. la vista
     *  privada tiene una columna de publicidad de ancho variable — un
     *  `right-8` fijo puede quedar encima de esa columna en vez de a la
     *  izquierda). `null`/`undefined` = usar `claseFijo` mientras no haya
     *  medición (ej. el primer render). */
    posicion?: { left: number; top: number } | null;
}

function PanelApartar({
    articulos,
    seleccionados,
    onQuitar,
    onLimpiar,
    usuarioActual,
    claseFijo = 'lg:right-6 lg:top-40 2xl:right-8',
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
                                <p className="mb-2 text-sm font-medium text-slate-600 whitespace-nowrap">
                                    Deja tu nombre y WhatsApp para confirmar.
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

    // `fixed` + alto FIJO (no `max-h` dinámico) para que no cambie de
    // tamaño ni desaparezca al hacer scroll (2026-08-17, ver comentario en
    // `PanelApartarProps.claseFijo`). Ancho angosto solo en Laptop (`lg:`,
    // 2026-08-16): en PC (`2xl:`) vuelve a su ancho de siempre. Porteado a
    // `document.body` — dentro de AY, `PerfilVendedorPrivado` vive bajo el
    // `<main>` de MainLayout, que crea su propio stacking context
    // (position+z-index): un `fixed` renderizado ahí queda atrapado debajo
    // del `<aside>` de publicidad (z-30) sin importar el z-index que se le
    // ponga. Portear al body lo saca de ese árbol (mismo patrón que
    // `Modal`/`ModalBottom`). En la pública no hay ese problema, pero
    // portear ahí también es inofensivo.
    const desktopSidebar = (
        <div
            data-testid="panel-apartar-desktop"
            className={`fixed z-40 hidden h-[440px] w-80 flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-xl lg:flex lg:w-72 2xl:h-[700px] 2xl:w-80 ${claseFijo}`}
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

    return (
        <>
            {createPortal(desktopSidebar, portalTarget)}
            {mobilePortal}
        </>
    );
}

// =============================================================================
// CHIP UNIFICADO — filtro dentro del header oscuro (2026-08-16)
// =============================================================================
// Reemplaza a HeroCard + TabsGrupo + TabUnderline: antes la identidad vivía
// en una tarjeta blanca aparte y los filtros en 2 niveles/2 filas (grupo
// MarketPlace/Dinámicas arriba, sub-filtro Catálogo/Busco/Vendidas abajo).
// Ahora la identidad se movió al header oscuro (ver el JSX de arriba) y
// AMBOS niveles de filtro se aplanaron en una sola fila de chips, mismo
// componente para los 4 (Catálogo/Busco/Vendidas/Dinámicas) — variante
// oscura de `ChipSubFiltro` (que sigue viva más abajo, para Activas/
// Cerradas dentro de Dinámicas, sobre fondo blanco).

interface ChipUnificadoProps {
    activo: boolean;
    label: string;
    count: number;
    onClick: () => void;
    testId: string;
}

function ChipUnificado({ activo, label, count, onClick, testId }: ChipUnificadoProps) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            aria-pressed={activo}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap lg:cursor-pointer ${
                activo
                    ? 'border-teal-400 bg-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:border-teal-400/60 hover:bg-white/10 hover:text-white'
            }`}
        >
            <span>{label}</span>
            <span className={`tabular-nums ${activo ? 'text-white/80' : 'text-slate-400'}`}>
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
    // 2026-08-17: el overlay ahora vive DENTRO de `CardArticulo`
    // (`overlayVendido`), scopeado solo a la imagen — el `<div>` externo
    // que oscurecía la card completa (título/precio incluidos) se sentía
    // más invasivo que el pill de "Apartado" en Mi Catálogo.
    return <CardArticulo articulo={articulo} variant="compacta" overlayVendido />;
}

interface EstadoVacioProps {
    tab: 'vendo' | 'busco' | 'vendida' | 'dinamicas_activa' | 'dinamicas_cerrada';
    esUnoMismo: boolean;
    totalTab: number;
}

function EstadoVacio({ tab, esUnoMismo, totalTab }: EstadoVacioProps) {
    // Configuración por tab — icono, título y cuerpo cambian según contexto.
    // Patrón visual unificado con MarketPlace, Negocios, Ofertas, Mis Guardados:
    // halos animate-ping + sparkles decorativos + icono con gradient brand teal.
    // 2026-08-17: extendido a Dinámicas (activa/cerrada) — antes su "vacío"
    // era un simple párrafo gris, sin el mismo lenguaje visual que los otros
    // 2 chips (Catálogo/Vendidas).
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
        dinamicas_activa: {
            icono: <Ticket className="h-11 w-11 text-white" strokeWidth={2} />,
            titulo: esUnoMismo ? 'Aún no tienes Dinámicas activas' : 'Sin Dinámicas activas',
            cuerpo: esUnoMismo
                ? 'Organiza una rifa y compártela con tu comunidad.'
                : 'Cuando organice una Dinámica, aparecerá aquí.',
        },
        dinamicas_cerrada: {
            icono: <Lock className="h-11 w-11 text-white" strokeWidth={2} />,
            titulo: 'Todavía no hay Dinámicas cerradas',
            cuerpo: 'Aquí aparecerán una vez que se cierren.',
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
