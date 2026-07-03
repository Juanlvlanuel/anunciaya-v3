/**
 * CardArticuloFeed.tsx
 * =====================
 * Card del feed estilo Facebook — rediseño v1.2 del MarketPlace.
 *
 * Diferencias con `CardArticulo` (la card original tipo Mercado Libre):
 *  - **Header de card**: avatar + nombre del vendedor + ciudad + tiempo relativo.
 *    Click en avatar → abre `ModalImagenes` con la foto. Click en nombre →
 *    navega al perfil del vendedor (P3).
 *  - **Multi-imágenes inline**: galería principal + thumbnails laterales en
 *    desktop. En móvil galería full-width con flechas/dots.
 *  - **Comentarios inline**: muestra las top 2 preguntas respondidas más
 *    recientes + input funcional para preguntar sin salir del feed.
 *  - **Layout**: ancho ~920px en desktop centrado, full-width en móvil.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Ubicación: apps/web/src/components/marketplace/CardArticuloFeed.tsx
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Send,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
import { useGuardados } from '../../hooks/useGuardados';
import { useSaveBubble } from '../../hooks/useSaveBubble';
import {
    useCrearComentario,
    useEditarComentario,
    useEliminarComentario,
} from '../../hooks/queries/useMarketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    etiquetaPrecioArticulo,
} from '../../utils/marketplace';
import { ModalImagenes } from '../ui/ModalImagenes';
import Tooltip from '../ui/Tooltip';
import { ComentarioItem, type UsuarioComentario } from './ComentarioItem';
import { notificar } from '../../utils/notificaciones';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

// =============================================================================
// PROPS
// =============================================================================

interface CardArticuloFeedProps {
    articulo: ArticuloFeedInfinito;
    /** Callback opcional cuando el usuario hace click en "Hacer pregunta" sin sesión. */
    onAuthRequerido?: () => void;
    /**
     * Callback opcional al hacer click en "Ver N preguntas más". Si se provee,
     * se llama y el padre decide qué hacer (típicamente abrir un modal con el
     * artículo). Si NO se provee, el botón cae al comportamiento previo
     * (expandir inline) — útil cuando ya estamos dentro del modal.
     */
    onAbrirDetalle?: () => void;
    /**
     * Cuando true, la card se renderiza para vivir dentro del modal:
     *  - El article ocupa toda la altura del contenedor (`h-full flex-col`).
     *  - Header / cuerpo / galería / footer son `shrink-0`.
     *  - La lista de preguntas es la única zona con scroll interno.
     *  - El input "Hacer una pregunta" queda fijo al fondo del modal.
     * Cuando false (default), la card mantiene el flujo normal del feed
     * (sin altura fija, sin scroll interno).
     */
    modoModal?: boolean;
    /**
     * Cuando true, NO se renderiza el sidebar de thumbnails laterales en
     * desktop, ni se reserva el espacio `lg:mr-24` para él en la galería
     * principal. Útil para previsualizaciones en contenedores estrechos
     * (vista previa del wizard de publicar P4) donde el sidebar
     * generaría scroll feo. El feed real lo deja en false para conservar
     * la navegación rápida por miniaturas.
     */
    ocultarThumbnailsLaterales?: boolean;
    /**
     * Sobreescribe las clases que definen el aspecto/altura de la galería
     * principal. Default: `aspect-[4/3] lg:aspect-[2/1]`. Útil en
     * previsualizaciones donde el card es angosto y se necesita más
     * altura vertical para que el sidebar de thumbnails muestre más
     * miniaturas sin scroll (ej. `lg:aspect-[4/3]`).
     */
    claseAspectoGaleria?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

// Keyframes inyectados una sola vez por sesión (mismo patrón que CardNegocio).
const FEED_HEART_STYLES_ID = '__cardArticuloFeed_heart_styles__';
if (typeof document !== 'undefined' && !document.getElementById(FEED_HEART_STYLES_ID)) {
    const style = document.createElement('style');
    style.id = FEED_HEART_STYLES_ID;
    style.textContent = `
        @keyframes feedHeartBounce {
            0% { transform: scale(1); }
            25% { transform: scale(1.35); }
            50% { transform: scale(0.9); }
            75% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        @keyframes feedHeartRingPulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.5); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

const ETIQUETA_CONDICION: Record<string, string> = {
    nuevo: 'Nuevo',
    seminuevo: 'Seminuevo',
    usado: 'Usado',
    para_reparar: 'Para reparar',
};

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardArticuloFeed({
    articulo,
    onAuthRequerido,
    onAbrirDetalle,
    modoModal = false,
    ocultarThumbnailsLaterales = false,
    claseAspectoGaleria,
}: CardArticuloFeedProps) {
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';

    const { guardado, loading, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articulo.id,
        // Estado inicial desde el feed — para que el corazón salga relleno al
        // cargar la página si el usuario ya tenía guardado este artículo.
        initialGuardado: articulo.guardado,
    });

    // `articulo.totalGuardados` ya viene actualizado del cache de React Query:
    // `useGuardados` aplica el optimistic update sobre el feed/detalle/perfil
    // del vendedor, así que cualquier render derivado (incluido el modal
    // estilo Facebook) ve el conteo correcto sin lógica local de delta.
    const totalGuardadosLocal = articulo.totalGuardados;

    const crearComentario = useCrearComentario();
    const editarComentario = useEditarComentario();
    const eliminarComentario = useEliminarComentario();

    // ─── Estado local ────────────────────────────────────────────────────────
    const [indiceFoto, setIndiceFoto] = useState(articulo.fotoPortadaIndex ?? 0);

    // Sincroniza el índice mostrado con el `fotoPortadaIndex` del artículo
    // cuando éste cambia desde afuera. Caso típico: la vista previa en vivo
    // del wizard de publicar (P4) — el usuario cambia la portada con el
    // botón estrella y el padre re-renderiza con un `articulo` nuevo cuyo
    // `fotoPortadaIndex` ya apunta a la foto seleccionada. Sin este efecto
    // el state interno se queda con el valor inicial del mount y la card
    // no refleja la portada nueva.
    //
    // En el feed real el prop no cambia entre renders, por lo que este
    // efecto no se dispara y el swipe local del usuario sigue siendo la
    // única fuente de cambios de `indiceFoto`.
    useEffect(() => {
        setIndiceFoto(articulo.fotoPortadaIndex ?? 0);
    }, [articulo.fotoPortadaIndex]);
    const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);
    const [descripcionExpandida, setDescripcionExpandida] = useState(false);
    const [textoComentario, setTextoComentario] = useState('');
    const [errorComentario, setErrorComentario] = useState<string | null>(null);

    /** Estado para animar el heart al click + popup flotante (patrón CardNegocio). */
    const heartButtonRef = useRef<HTMLButtonElement>(null);
    const [heartBounce, setHeartBounce] = useState(false);
    // Bubble flotante "¡Guardado!" / "Quitado" centralizado en hook.
    const { triggerSaveBubble, saveBubble } = useSaveBubble();

    // ─── Derivados ───────────────────────────────────────────────────────────
    const fotos = articulo.fotos ?? [];
    const tieneMultiples = fotos.length > 1;
    const distancia = formatearDistancia(articulo.distanciaMetros);
    const tiempo = formatearTiempoRelativo(articulo.createdAt);
    // `condicion` es opcional desde 2026-05-13. Si es null, no mostramos chip.
    const condicionLabel = articulo.condicion
        ? (ETIQUETA_CONDICION[articulo.condicion] ?? articulo.condicion)
        : null;

    const nombreVendedor = useMemo(
        () => `${articulo.vendedor.nombre} ${articulo.vendedor.apellidos}`.trim(),
        [articulo.vendedor.nombre, articulo.vendedor.apellidos]
    );
    const iniciales = obtenerIniciales(articulo.vendedor.nombre, articulo.vendedor.apellidos);

    // Modo Comercial: bloqueado para comentar (regla del marketplace).
    const enModoComercial = modoActivo === 'comercial';
    // El usuario puede comentar si está autenticado en modo personal. El dueño
    // también puede (sus comentarios llevan la etiqueta "Vendedor").
    const puedeComentar = !!usuario && !enModoComercial;

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    // Comentarios del feed (árbol de 1 nivel). Inline mostramos los primeros N
    // hilos; el resto se ve con "Ver más" (abre el modal/detalle). En modoModal
    // se muestran todos.
    const comentarios = articulo.topComentarios ?? [];
    const MAX_INLINE = 2;
    const comentariosInline = modoModal ? comentarios : comentarios.slice(0, MAX_INLINE);
    const hayMasContenido = !modoModal && comentarios.length > MAX_INLINE;


    // Señal de actividad inline. Tipo:
    //  - 'viendo' / 'vistas24h' → texto descriptivo en teal.
    //  - 'guardados' → corazón rojo + número, sin texto (consistente con el
    //    pattern de "likes" de redes sociales).
    type Senal =
        | { tipo: 'viendo' | 'vistas24h'; icono: React.ReactNode; texto: string }
        | { tipo: 'guardados'; total: number };
    const senalActividad: Senal | null = (() => {
        if ((articulo.viendo ?? 0) >= 3) {
            return {
                tipo: 'viendo',
                icono: <Users className="h-4 w-4 shrink-0" strokeWidth={2} />,
                texto: `${articulo.viendo} personas viendo ahora`,
            };
        }
        if ((articulo.vistas24h ?? 0) >= 10) {
            return {
                tipo: 'vistas24h',
                icono: <Eye className="h-4 w-4 shrink-0" strokeWidth={2} />,
                texto: `${articulo.vistas24h} vistas hoy`,
            };
        }
        if (totalGuardadosLocal >= 1) {
            return { tipo: 'guardados', total: totalGuardadosLocal };
        }
        return null;
    })();

    // ─── Handlers ────────────────────────────────────────────────────────────
    const irAlPerfilVendedor = useCallback(() => {
        navigate(`/marketplace/usuario/${articulo.vendedor.id}`);
    }, [navigate, articulo.vendedor.id]);

    const irAlDetalle = useCallback(() => {
        navigate(`/marketplace/articulo/${articulo.id}`);
    }, [navigate, articulo.id]);

    const fotoAnterior = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIndiceFoto((i) => (i === 0 ? fotos.length - 1 : i - 1));
    }, [fotos.length]);

    const fotoSiguiente = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIndiceFoto((i) => (i === fotos.length - 1 ? 0 : i + 1));
    }, [fotos.length]);

    const seleccionarFoto = useCallback((e: React.MouseEvent, indice: number) => {
        e.stopPropagation();
        setIndiceFoto(indice);
    }, []);

    // ─── Swipe moderno con translateX en vivo ────────────────────────────────
    // Mientras el usuario arrastra, la imagen se mueve con el dedo y la
    // adyacente (anterior o siguiente) se asoma desde el borde. Al soltar:
    // si pasó el umbral, anima hasta la siguiente/anterior y cambia índice;
    // si no, vuelve a 0 con animación.
    const galeriaWidthRef = useRef(0);
    const touchStartXRef = useRef(0);
    const touchDeltaXRef = useRef(0);
    const swipeOcurrioRef = useRef(false);
    const [offsetPx, setOffsetPx] = useState(0);
    const [enTransicion, setEnTransicion] = useState(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!tieneMultiples) return;
        touchStartXRef.current = e.touches[0].clientX;
        touchDeltaXRef.current = 0;
        swipeOcurrioRef.current = false;
        setEnTransicion(false);
        // Capturar el ancho del contenedor de la galería al iniciar el touch
        // para conocer cuánto desplazar al cambiar de imagen.
        const target = e.currentTarget as HTMLDivElement;
        galeriaWidthRef.current = target.getBoundingClientRect().width;
    }, [tieneMultiples]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!tieneMultiples) return;
        const dx = e.touches[0].clientX - touchStartXRef.current;
        touchDeltaXRef.current = dx;
        // Resistencia en los bordes (loop activo, así que es solo cosmético).
        setOffsetPx(dx);
    }, [tieneMultiples]);

    const handleTouchEnd = useCallback(() => {
        if (!tieneMultiples) return;
        const delta = touchDeltaXRef.current;
        const UMBRAL = 60;
        const ancho = galeriaWidthRef.current || window.innerWidth;
        touchDeltaXRef.current = 0;

        if (Math.abs(delta) < UMBRAL) {
            // Snap back
            setEnTransicion(true);
            setOffsetPx(0);
            setTimeout(() => setEnTransicion(false), 220);
            return;
        }

        swipeOcurrioRef.current = true;
        setEnTransicion(true);

        if (delta < 0) {
            // Swipe izquierda → siguiente. Anima hasta -ancho y luego cambia
            // índice y resetea offset (sin animación) para evitar el "salto".
            setOffsetPx(-ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceFoto((i) => (i === fotos.length - 1 ? 0 : i + 1));
                setOffsetPx(0);
            }, 220);
        } else {
            // Swipe derecha → anterior.
            setOffsetPx(ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceFoto((i) => (i === 0 ? fotos.length - 1 : i - 1));
                setOffsetPx(0);
            }, 220);
        }
    }, [tieneMultiples, fotos.length]);

    const handleClickGaleria = useCallback(() => {
        if (swipeOcurrioRef.current) {
            swipeOcurrioRef.current = false;
            return;
        }
        irAlDetalle();
    }, [irAlDetalle]);

    // Índices de imágenes adyacentes (loop) para renderizar en el track
    // y que se vean asomando durante el swipe.
    const indiceAnterior = fotos.length > 0
        ? (indiceFoto === 0 ? fotos.length - 1 : indiceFoto - 1)
        : 0;
    const indiceSiguiente = fotos.length > 0
        ? (indiceFoto === fotos.length - 1 ? 0 : indiceFoto + 1)
        : 0;

    const handleToggleGuardado = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            // Bubble flotante "¡Guardado!" / "Quitado" — usa el hook
            // centralizado `useSaveBubble` para mantener consistencia
            // cross-módulo con CardNegocio, CardArticulo, etc.
            triggerSaveBubble(e, guardado ? 'unsave' : 'save');
            setHeartBounce(true);
            toggleGuardado();
            setTimeout(() => setHeartBounce(false), 500);
        },
        [toggleGuardado, guardado, triggerSaveBubble]
    );

    const handleAvatarClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (articulo.vendedor.avatarUrl) {
            setModalAvatarAbierto(true);
        } else {
            // Sin avatar — el click del avatar va al perfil
            irAlPerfilVendedor();
        }
    }, [articulo.vendedor.avatarUrl, irAlPerfilVendedor]);

    /** Extrae { status, mensaje } de un error de Axios. */
    const leerError = (e: unknown) => {
        const err = e as { response?: { status?: number; data?: { message?: string } } };
        return { status: err?.response?.status, mensaje: err?.response?.data?.message };
    };

    // Crear comentario raíz (input del feed).
    const handleEnviarComentario = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const limpio = textoComentario.trim();

            if (!usuario) {
                if (onAuthRequerido) onAuthRequerido();
                else notificar.info('Inicia sesión para comentar');
                return;
            }
            if (limpio.length < TEXTO_MIN) {
                setErrorComentario(`Escribe al menos ${TEXTO_MIN} caracteres`);
                return;
            }
            setErrorComentario(null);
            try {
                await crearComentario.mutateAsync({ articuloId: articulo.id, texto: limpio });
                setTextoComentario('');
            } catch (err) {
                const { status, mensaje } = leerError(err);
                if (status === 422) setErrorComentario(mensaje ?? 'Contenido no permitido');
                else setErrorComentario(mensaje ?? 'No se pudo publicar el comentario');
            }
        },
        [textoComentario, usuario, onAuthRequerido, crearComentario, articulo.id]
    );

    // Responder a un hilo (lo dispara ComentarioItem).
    const handleResponderComentario = useCallback(
        async (parentId: string, texto: string): Promise<boolean> => {
            try {
                await crearComentario.mutateAsync({ articuloId: articulo.id, texto, parentId });
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo publicar la respuesta');
                return false;
            }
        },
        [crearComentario, articulo.id]
    );

    const handleEditarComentario = useCallback(
        async (id: string, texto: string): Promise<boolean> => {
            try {
                await editarComentario.mutateAsync({ comentarioId: id, articuloId: articulo.id, texto });
                notificar.exito('Comentario actualizado');
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo guardar');
                return false;
            }
        },
        [editarComentario, articulo.id]
    );

    const handleEliminarComentario = useCallback(
        (id: string) => {
            if (!confirm('¿Eliminar este comentario?')) return;
            eliminarComentario.mutate(
                { comentarioId: id, articuloId: articulo.id },
                {
                    onSuccess: () => notificar.exito('Comentario eliminado'),
                    onError: () => notificar.error('No se pudo eliminar el comentario'),
                }
            );
        },
        [eliminarComentario, articulo.id]
    );

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <article
            data-testid={`card-articulo-feed-${articulo.id}`}
            className={`overflow-hidden bg-white lg:rounded-xl lg:border-2 lg:border-slate-300 lg:shadow-sm ${
                modoModal ? 'flex h-full flex-col rounded-xl border-2 border-slate-300 shadow-sm' : ''
            }`}
        >
            {/* ─── HEADER: avatar + vendedor + tiempo ─────────────────────── */}
            <header className={`flex items-center gap-3 px-4 ${modoModal ? 'py-2' : 'py-3'}`}>
                <button
                    type="button"
                    data-testid={`card-feed-avatar-${articulo.id}`}
                    onClick={handleAvatarClick}
                    className="shrink-0 lg:cursor-pointer"
                    aria-label={`Avatar de ${nombreVendedor}`}
                >
                    {articulo.vendedor.avatarUrl ? (
                        <img
                            src={articulo.vendedor.avatarUrl}
                            alt={nombreVendedor}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-sm font-bold text-white ring-2 ring-slate-200">
                            {iniciales}
                        </div>
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        data-testid={`card-feed-nombre-${articulo.id}`}
                        onClick={irAlPerfilVendedor}
                        className="block truncate text-left text-base font-bold text-slate-900 leading-tight lg:cursor-pointer lg:hover:underline"
                    >
                        {nombreVendedor}
                    </button>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span className="truncate">{articulo.ciudad}</span>
                        <span className="h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                        <span className="shrink-0">hace {tiempo}</span>
                    </p>
                </div>

                <Tooltip
                    text={guardado ? 'Quitar de guardados' : 'Guardar publicación'}
                    position="bottom"
                    className="hidden lg:block"
                >
                    <button
                        ref={heartButtonRef}
                        type="button"
                        data-testid={`card-feed-guardar-${articulo.id}`}
                        onClick={handleToggleGuardado}
                        disabled={loading}
                        aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                        className={`relative shrink-0 grid place-items-center w-[38px] h-[38px] rounded-full bg-white overflow-visible disabled:opacity-50 transition-transform duration-200 lg:cursor-pointer lg:hover:scale-110 active:opacity-70 ${
                            guardado
                                ? 'border-2 border-amber-500'
                                : 'border-2 border-slate-300'
                        }`}
                        style={{
                            animation: heartBounce
                                ? 'feedHeartBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)'
                                : undefined,
                        }}
                    >
                        {/* Pulse ring amber respirando cuando guardado —
                            mismo patrón cross-módulo que CardNegocio,
                            CardArticulo y BookmarkGlass. */}
                        {guardado && (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-500/40"
                                style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
                            />
                        )}
                        <Icon
                            icon={ICONOS.guardar}
                            className="h-5 w-5"
                            style={{ color: guardado ? '#f59e0b' : '#94a3b8' }}
                        />
                    </button>
                </Tooltip>
            </header>

            {/* ─── CUERPO: título + precio + descripción ──────────────────── */}
            {/* Solo el título es link al detalle. Precio/chips son info,        */}
            {/* descripción es texto plano que expande/colapsa con click.        */}
            <div className={`px-4 ${modoModal ? 'pb-2' : 'pb-3'}`}>
                {/* Título primero — es lo que ancla al lector ("¿qué es esto?").
                    El precio queda debajo como el dato comercial principal. */}
                <h3>
                    <button
                        type="button"
                        data-testid={`card-feed-titulo-${articulo.id}`}
                        onClick={irAlDetalle}
                        className="line-clamp-2 block w-full text-left text-lg font-bold text-slate-900 leading-snug lg:cursor-pointer lg:hover:underline"
                    >
                        {articulo.titulo}
                    </button>
                </h3>
                {/* Precio + chips (unidad de venta, acepta ofertas, condición).
                    El precio usa `text-teal-700` — color de marca del MarketPlace,
                    diferenciado del negro del título pero sin caer en verde
                    "oferta/descuento" payaso. */}
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    {articulo.modo === 'busco' && (
                        <span className="self-center rounded-md bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700">
                            Se busca
                        </span>
                    )}
                    <span className="text-2xl font-extrabold text-teal-700">
                        {etiquetaPrecioArticulo(articulo)}
                    </span>
                    {articulo.modo === 'busco'
                        ? articulo.urgente && (
                              <span className="self-center rounded-md bg-red-100 px-2 py-0.5 text-sm font-bold text-red-600">
                                  Urgente
                              </span>
                          )
                        : (
                              <>
                                  {articulo.unidadVenta && (
                                      <span className="text-lg font-semibold text-teal-700/80 lg:text-xl">
                                          {articulo.unidadVenta}
                                      </span>
                                  )}
                                  {articulo.aceptaOfertas && (
                                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-700">
                                          Acepta ofertas
                                      </span>
                                  )}
                                  {condicionLabel && (
                                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-sm font-medium text-slate-700">
                                          {condicionLabel}
                                      </span>
                                  )}
                              </>
                          )}
                </div>
                {articulo.descripcion && !modoModal && (
                    <p
                        className={`mt-1.5 text-base font-medium leading-relaxed text-slate-600 ${
                            descripcionExpandida ? '' : 'line-clamp-3'
                        }`}
                        onClick={() => setDescripcionExpandida((v) => !v)}
                    >
                        {articulo.descripcion}
                    </p>
                )}
            </div>

            {/* ─── GALERÍA + THUMBNAILS LATERALES (lg+) ───────────────────────
                La galería principal define la altura del bloque vía
                `aspect-ratio` y reserva 96px a su derecha en desktop
                (`lg:mr-24`) para el sidebar de thumbnails. El sidebar usa
                `position: absolute` anclado a top/right/bottom del wrapper
                relative — así toma exactamente la altura de la galería y,
                si las miniaturas exceden ese alto, scrollea internamente
                con `overflow-y-auto`. Esto evita que el sidebar imponga su
                altura natural al contenedor en cards angostas (preview del
                wizard P4), donde la galería se veía estirada o el card
                quedaba con espacio blanco abajo.
            ───────────────────────────────────────────────────────────── */}
            <div className="relative">
                {/* Galería principal — proporción 4:3 móvil / 2:1 desktop.
                    `mr-24` en lg+ reserva espacio para el sidebar absolute. */}
                <div
                    className={`group/galeria relative ${modoModal ? 'h-56 lg:h-64' : (claseAspectoGaleria ?? 'aspect-[4/3] lg:aspect-[2/1]')} overflow-hidden bg-slate-100 lg:cursor-pointer touch-pan-y ${tieneMultiples && !modoModal && !ocultarThumbnailsLaterales ? 'lg:mr-24' : ''}`}
                    onClick={handleClickGaleria}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {fotos.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                            <ImageOff className="h-12 w-12" strokeWidth={1.5} />
                        </div>
                    ) : (
                        // Renderizamos prev/curr/next con KEYS ESTABLES por índice
                        // de foto (no por rol). Al avanzar indiceFoto, la imagen
                        // que era 'next' se promueve a 'curr' sin desmontar — solo
                        // cambia su transform. Esto elimina el flash de carga al
                        // hacer swipe, porque el navegador NO re-decodifica la
                        // imagen ya pintada (problema clásico de carruseles
                        // construidos con keys por rol).
                        <>
                            {fotos.map((foto, i) => {
                                if (!tieneMultiples && i !== indiceFoto) return null;

                                // Distancia mínima en cualquiera de las dos direcciones
                                // alrededor del carrusel (loop).
                                const distAtras = (indiceFoto - i + fotos.length) % fotos.length;
                                const distAdelante = (i - indiceFoto + fotos.length) % fotos.length;

                                let rol: 'prev' | 'curr' | 'next' | null = null;
                                if (i === indiceFoto) rol = 'curr';
                                else if (distAtras === 1) rol = 'prev';
                                else if (distAdelante === 1) rol = 'next';

                                if (!rol) return null;

                                const baseTransform = rol === 'prev' ? '-100%' : rol === 'next' ? '100%' : '0%';
                                const esCurr = rol === 'curr';

                                return (
                                    <img
                                        key={i}
                                        src={foto}
                                        alt={esCurr ? `${articulo.titulo} — foto ${i + 1}` : ''}
                                        aria-hidden={esCurr ? undefined : true}
                                        draggable={false}
                                        decoding="async"
                                        className={`absolute inset-0 h-full w-full select-none object-cover ${
                                            esCurr ? '' : 'pointer-events-none'
                                        }`}
                                        style={{
                                            transform: `translateX(calc(${baseTransform} + ${offsetPx}px))`,
                                            transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                            willChange: 'transform',
                                        }}
                                    />
                                );
                            })}
                        </>
                    )}

                    {/* Flechas (solo desktop con multi-imagen) */}
                    {tieneMultiples && (
                        <>
                            <button
                                type="button"
                                onClick={fotoAnterior}
                                data-testid={`card-feed-foto-prev-${articulo.id}`}
                                aria-label="Foto anterior"
                                className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md opacity-0 transition-all group-hover/galeria:opacity-100 lg:flex lg:cursor-pointer lg:hover:scale-105"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            <button
                                type="button"
                                onClick={fotoSiguiente}
                                data-testid={`card-feed-foto-next-${articulo.id}`}
                                aria-label="Foto siguiente"
                                className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md opacity-0 transition-all group-hover/galeria:opacity-100 lg:flex lg:cursor-pointer lg:hover:scale-105"
                            >
                                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                            </button>

                            {/* Contador de foto (esquina inf der) */}
                            <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white lg:hidden">
                                {indiceFoto + 1}/{fotos.length}
                            </span>

                            {/* Dots solo en móvil */}
                            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
                                {fotos.map((_, i) => (
                                    <span
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i === indiceFoto ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Thumbnails laterales (solo desktop con multi-imagen).
                    Ocultos en modoModal — el modal prioriza el espacio
                    para mensajes; el usuario navega imágenes con swipe o flechas.
                    Posicionado `absolute` para tomar el alto del wrapper
                    relative (= alto de la galería). Si las miniaturas
                    exceden ese alto, scrollean internamente con
                    `overflow-y-auto`. */}
                {tieneMultiples && !modoModal && !ocultarThumbnailsLaterales && (
                    <div className="absolute top-0 right-0 bottom-0 hidden w-24 flex-col gap-2 overflow-y-auto bg-slate-200 p-2 lg:flex">
                        {fotos.map((url, i) => (
                            <button
                                type="button"
                                key={`${url}-${i}`}
                                onClick={(e) => seleccionarFoto(e, i)}
                                data-testid={`card-feed-thumb-${articulo.id}-${i}`}
                                aria-label={`Ver foto ${i + 1}`}
                                className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-md border-2 lg:cursor-pointer ${i === indiceFoto
                                        ? 'border-teal-500 ring-2 ring-teal-200'
                                        : 'border-transparent opacity-70 lg:hover:opacity-100'
                                    }`}
                            >
                                <img
                                    src={url}
                                    alt={`Miniatura ${i + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── FOOTER: métricas básicas + señal social ────────────────── */}
            {/* Izquierda: distancia · preguntas · vistas (siempre visibles).  */}
            {/* Derecha: señal social en teal (viendo / vistas hoy / guardados */}
            {/* — solo cuando supera el umbral). NO reemplaza a vistas totales. */}
            <div className={`flex items-center justify-between gap-3 px-4 text-base font-medium text-slate-600 ${modoModal ? 'py-2' : 'py-3'}`}>
                <div className="flex items-center gap-3">
                    {distancia && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-5 w-5 shrink-0" strokeWidth={2} />
                            {distancia}
                        </span>
                    )}
                    {(articulo.totalComentarios ?? 0) > 0 && (
                        <>
                            {distancia && <span className="text-slate-400" aria-hidden>·</span>}
                            <span className="flex items-center gap-1.5">
                                <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                                {articulo.totalComentarios}
                            </span>
                        </>
                    )}
                    {(distancia || (articulo.totalComentarios ?? 0) > 0) && (
                        <span className="text-slate-400" aria-hidden>·</span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Eye className="h-5 w-5 shrink-0" strokeWidth={2} />
                        {articulo.totalVistas}
                    </span>
                </div>
                {senalActividad && senalActividad.tipo === 'guardados' && (
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <Bookmark className="h-5 w-5 shrink-0" strokeWidth={2.5} fill="currentColor" />
                        {senalActividad.total}
                    </span>
                )}
                {senalActividad && senalActividad.tipo !== 'guardados' && (
                    <span className="flex items-center gap-1.5 font-semibold text-teal-600">
                        {senalActividad.icono}
                        {senalActividad.texto}
                    </span>
                )}
            </div>

            {/* ─── COMENTARIOS INLINE (hilos de 1 nivel) ──────────────────────
                En modoModal esta zona es la única scrolleable; el input vive
                fijo abajo. Inline mostramos los primeros hilos; "Ver más" abre
                el detalle/modal con todo. */}
            <div className={modoModal ? 'flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-3' : 'px-4 py-3'}>
                {comentariosInline.length > 0 && (
                    <div className="space-y-3">
                        {comentariosInline.map((c) => (
                            <ComentarioItem
                                key={c.id}
                                comentario={c}
                                vendedorId={articulo.vendedor.id}
                                usuarioActual={usuarioActual}
                                puedeComentar={puedeComentar}
                                enviandoRespuesta={crearComentario.isPending}
                                onEditar={handleEditarComentario}
                                onEliminar={handleEliminarComentario}
                                onResponder={handleResponderComentario}
                            />
                        ))}

                        {/* "Ver más" — abre el modal/detalle si hay más hilos
                            de los que caben inline. */}
                        {hayMasContenido && (
                            <button
                                type="button"
                                data-testid={`card-feed-ver-mas-comentarios-${articulo.id}`}
                                onClick={() => {
                                    if (onAbrirDetalle) onAbrirDetalle();
                                    else irAlDetalle();
                                }}
                                className="text-sm font-semibold text-teal-700 lg:cursor-pointer lg:hover:underline"
                            >
                                Ver más
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ─── INPUT + AVISO COMERCIAL (zona fija en modoModal) ────────── */}
            {(puedeComentar || enModoComercial) && (
                <div
                    className={
                        modoModal
                            ? 'shrink-0 border-t border-slate-200 bg-white px-4 py-3'
                            : `px-4 ${comentarios.length > 0 ? 'pb-3' : 'pt-3 pb-3'}`
                    }
                >
                {puedeComentar && (
                    <form onSubmit={handleEnviarComentario}>
                        <div className="flex items-center gap-2.5">
                            {/* Avatar del usuario actual */}
                            {usuario && usuario.avatarUrl ? (
                                <img
                                    src={usuario.avatarUrl}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
                                />
                            ) : (
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-slate-200"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                    aria-hidden="true"
                                >
                                    {((usuario?.nombre ?? '?').charAt(0) +
                                        (usuario?.apellidos ?? '').charAt(0)).toUpperCase()}
                                </div>
                            )}

                            <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                                <input
                                    type="text"
                                    data-testid={`card-feed-input-comentario-${articulo.id}`}
                                    value={textoComentario}
                                    onChange={(e) => {
                                        setTextoComentario(e.target.value);
                                        if (errorComentario) setErrorComentario(null);
                                    }}
                                    placeholder="Escribe un comentario…"
                                    maxLength={TEXTO_MAX}
                                    disabled={crearComentario.isPending}
                                    className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    data-testid={`card-feed-enviar-comentario-${articulo.id}`}
                                    disabled={
                                        crearComentario.isPending ||
                                        textoComentario.trim().length < TEXTO_MIN
                                    }
                                    aria-label="Publicar comentario"
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                        textoComentario.trim().length >= TEXTO_MIN && !crearComentario.isPending
                                            ? 'bg-teal-600 text-white shadow-sm lg:hover:bg-teal-700'
                                            : 'bg-transparent text-slate-400'
                                    }`}
                                >
                                    {crearComentario.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                    ) : (
                                        <Send className="h-4 w-4" strokeWidth={2.5} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between px-3 text-sm">
                            {errorComentario ? (
                                <span className="flex items-center gap-1 text-rose-600">
                                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    {errorComentario}
                                </span>
                            ) : (
                                <span className="text-slate-600">
                                    {textoComentario.length > 0
                                        ? `${textoComentario.length}/${TEXTO_MAX}`
                                        : ''}
                                </span>
                            )}
                        </div>
                    </form>
                )}

                {/* Modo Comercial — bloqueado */}
                {enModoComercial && (
                    <div
                        className={`rounded-xl border-2 border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 ${puedeComentar ? 'mt-3' : ''}`}
                    >
                        Cambia a modo Personal para comentar en MarketPlace.
                    </div>
                )}
                </div>
            )}

            {/* ─── MODAL AVATAR ───────────────────────────────────────────── */}
            {modalAvatarAbierto && articulo.vendedor.avatarUrl && (
                <ModalImagenes
                    isOpen={modalAvatarAbierto}
                    onClose={() => setModalAvatarAbierto(false)}
                    images={[articulo.vendedor.avatarUrl]}
                    initialIndex={0}
                />
            )}

            {/* Bubble "¡Guardado!" / "Quitado" vía useSaveBubble — mismo
                patrón unificado que CardNegocio, CardArticulo y BookmarkGlass.
                El portal vive dentro del article para que se desmonte si
                el card se quita del DOM. */}
            {saveBubble}
        </article>
    );
}

export default CardArticuloFeed;
