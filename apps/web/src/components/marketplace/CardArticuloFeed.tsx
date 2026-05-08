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

import { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    MapPin,
    Eye,
    Users,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Send,
    Loader2,
    AlertCircle,
    Smile,
    Frown,
} from 'lucide-react';
import { useGuardados } from '../../hooks/useGuardados';
import {
    useCrearPregunta,
    useEditarPreguntaPropia,
    useEliminarPreguntaMia,
} from '../../hooks/queries/useMarketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    formatearPrecio,
} from '../../utils/marketplace';
import { ModalImagenes } from '../ui/ModalImagenes';
import { BotonComentarista } from './BotonComentarista';
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
        @keyframes feedFloatUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-50px); }
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

const PREGUNTA_MIN = 5;
const PREGUNTA_MAX = 200;

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

    const crearPregunta = useCrearPregunta();
    const editarPregunta = useEditarPreguntaPropia();
    const eliminarPreguntaMia = useEliminarPreguntaMia();

    // ─── Estado local ────────────────────────────────────────────────────────
    const [indiceFoto, setIndiceFoto] = useState(articulo.fotoPortadaIndex ?? 0);
    const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);
    const [descripcionExpandida, setDescripcionExpandida] = useState(false);
    const [textoPregunta, setTextoPregunta] = useState('');
    const [errorPregunta, setErrorPregunta] = useState<string | null>(null);
    /**
     * Preguntas creadas en esta sesión (optimistic UI). Se mergean a
     * `articulo.topPreguntas` para que el usuario vea su pregunta inline
     * inmediatamente sin esperar refetch del feed.
     */
    const [preguntasOptimistas, setPreguntasOptimistas] = useState<typeof articulo.topPreguntas>([]);

    /**
     * Map de ediciones optimistas: id de pregunta → texto editado. Se aplica
     * sobre la lista renderizada para que el cambio se vea inmediatamente.
     * Se limpia cuando llega el refetch del feed con el texto actualizado.
     */
    const [edicionesOptimistas, setEdicionesOptimistas] = useState<Record<string, string>>({});

    /**
     * Set de ids de preguntas eliminadas optimistically. Se filtran del render
     * inmediatamente sin esperar al refetch.
     */
    const [eliminadasOptimistas, setEliminadasOptimistas] = useState<Set<string>>(new Set());

    /** Pregunta en modo edición (id) + texto temporal del input. */
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [textoEditando, setTextoEditando] = useState('');
    const [errorEditando, setErrorEditando] = useState<string | null>(null);

    /**
     * Si está expandida la lista de preguntas (mostrar todas vs top N).
     * En `modoModal` arranca true porque el usuario ya hizo click en
     * "Ver más" para llegar al modal — no tiene sentido pedirle otra vez.
     */
    const [preguntasExpandidas, setPreguntasExpandidas] = useState(modoModal);

    /** Estado para animar el heart al click + popup flotante (patrón CardNegocio). */
    const heartButtonRef = useRef<HTMLButtonElement>(null);
    const [heartBounce, setHeartBounce] = useState(false);
    const [likeAnimation, setLikeAnimation] = useState<'like' | 'unlike' | null>(null);
    const [likePosition, setLikePosition] = useState({ top: 0, left: 0 });

    // ─── Derivados ───────────────────────────────────────────────────────────
    const fotos = articulo.fotos ?? [];
    const tieneMultiples = fotos.length > 1;
    const distancia = formatearDistancia(articulo.distanciaMetros);
    const tiempo = formatearTiempoRelativo(articulo.createdAt);
    const condicionLabel = ETIQUETA_CONDICION[articulo.condicion] ?? articulo.condicion;

    const nombreVendedor = useMemo(
        () => `${articulo.vendedor.nombre} ${articulo.vendedor.apellidos}`.trim(),
        [articulo.vendedor.nombre, articulo.vendedor.apellidos]
    );
    const iniciales = obtenerIniciales(articulo.vendedor.nombre, articulo.vendedor.apellidos);

    // ¿El usuario actual es el dueño? Si lo es, ocultamos el input.
    const esDueno = !!usuario && usuario.id === articulo.vendedor.id;
    // Modo Comercial: bloqueado para preguntar (regla del marketplace).
    const enModoComercial = modoActivo === 'comercial';
    // Mostrar input si el visitante puede potencialmente preguntar.
    const puedeMostrarInput = !esDueno && !enModoComercial;

    /**
     * Lista final a renderizar:
     * - backend: respondidas + pendientes del feed.
     * - optimistas: preguntas creadas en esta sesión (no duplicadas).
     * - edicionesOptimistas: aplica el nuevo texto + marca editadaAt local.
     * - eliminadasOptimistas: filtra ids eliminados.
     */
    const preguntasARenderizar = useMemo(() => {
        const idsBackend = new Set(articulo.topPreguntas.map((p) => p.id));
        const optimistasUnicas = preguntasOptimistas.filter((p) => !idsBackend.has(p.id));
        const todas = [...articulo.topPreguntas, ...optimistasUnicas];
        return todas
            .filter((p) => !eliminadasOptimistas.has(p.id))
            .map((p) => {
                const textoEditado = edicionesOptimistas[p.id];
                if (textoEditado !== undefined) {
                    return {
                        ...p,
                        pregunta: textoEditado,
                        editadaAt: p.editadaAt ?? new Date().toISOString(),
                    };
                }
                return p;
            });
    }, [articulo.topPreguntas, preguntasOptimistas, edicionesOptimistas, eliminadasOptimistas]);

    /**
     * Lista visible (preview): primeras 2 en orden (respondidas primero por
     * el backend). Si está expandida, muestra todas. El click "Ver más"
     * expande inline sin navegar al detalle.
     */
    const MAX_PREGUNTAS_VISIBLES = 2;
    const { preguntasVisibles, preguntasOcultas } = useMemo(() => {
        if (preguntasExpandidas) {
            return { preguntasVisibles: preguntasARenderizar, preguntasOcultas: 0 };
        }
        const visibles = preguntasARenderizar.slice(0, MAX_PREGUNTAS_VISIBLES);
        return {
            preguntasVisibles: visibles,
            preguntasOcultas: preguntasARenderizar.length - visibles.length,
        };
    }, [preguntasARenderizar, preguntasExpandidas]);


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
        navigate(`/marketplace/vendedor/${articulo.vendedor.id}`);
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
            // Posicionar el popup arriba-izquierda del botón. Se ancla al borde
            // derecho del botón restando el ancho aproximado del popup, para
            // que no se salga de la pantalla cuando el botón está pegado al
            // edge derecho del card.
            if (heartButtonRef.current) {
                const rect = heartButtonRef.current.getBoundingClientRect();
                const POPUP_WIDTH_APROX = 130;
                setLikePosition({
                    top: rect.top - 50,
                    left: rect.right - POPUP_WIDTH_APROX,
                });
            }
            // Tipo de animación según el estado actual (antes del toggle).
            setLikeAnimation(guardado ? 'unlike' : 'like');
            setHeartBounce(true);
            toggleGuardado();
            setTimeout(() => setHeartBounce(false), 500);
            setTimeout(() => setLikeAnimation(null), 1500);
        },
        [toggleGuardado, guardado]
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

    const handleIniciarEdicion = useCallback((preguntaId: string, textoActual: string) => {
        setEditandoId(preguntaId);
        setTextoEditando(textoActual);
        setErrorEditando(null);
    }, []);

    const handleCancelarEdicion = useCallback(() => {
        setEditandoId(null);
        setTextoEditando('');
        setErrorEditando(null);
    }, []);

    const handleGuardarEdicion = useCallback(
        async (preguntaId: string) => {
            const texto = textoEditando.trim();
            if (texto.length < PREGUNTA_MIN) {
                setErrorEditando(`Escribe al menos ${PREGUNTA_MIN} caracteres`);
                return;
            }
            if (texto.length > PREGUNTA_MAX) {
                setErrorEditando(`Máximo ${PREGUNTA_MAX} caracteres`);
                return;
            }
            try {
                const respuesta = await editarPregunta.mutateAsync({
                    preguntaId,
                    articuloId: articulo.id,
                    pregunta: texto,
                });
                if (respuesta.success) {
                    setEdicionesOptimistas((prev) => ({ ...prev, [preguntaId]: texto }));
                    setEditandoId(null);
                    setTextoEditando('');
                    setErrorEditando(null);
                    notificar.exito('Pregunta actualizada');
                } else {
                    setErrorEditando(respuesta.message ?? 'No pudimos actualizar la pregunta');
                }
            } catch (err) {
                const error = err as { response?: { data?: { message?: string } } };
                setErrorEditando(
                    error.response?.data?.message ??
                    'No pudimos actualizar la pregunta. Intenta de nuevo.'
                );
            }
        },
        [textoEditando, editarPregunta, articulo.id]
    );

    const handleEliminarPropia = useCallback(
        async (preguntaId: string) => {
            // Optimistic: ocultar inmediatamente.
            setEliminadasOptimistas((prev) => new Set(prev).add(preguntaId));
            try {
                const respuesta = await eliminarPreguntaMia.mutateAsync({
                    preguntaId,
                    articuloId: articulo.id,
                });
                if (respuesta.success) {
                    notificar.exito('Pregunta eliminada');
                } else {
                    // Rollback si el backend rechaza.
                    setEliminadasOptimistas((prev) => {
                        const nuevo = new Set(prev);
                        nuevo.delete(preguntaId);
                        return nuevo;
                    });
                    notificar.error(respuesta.message ?? 'No pudimos eliminar la pregunta');
                }
            } catch {
                setEliminadasOptimistas((prev) => {
                    const nuevo = new Set(prev);
                    nuevo.delete(preguntaId);
                    return nuevo;
                });
                notificar.error('No pudimos eliminar la pregunta. Intenta de nuevo.');
            }
        },
        [eliminarPreguntaMia, articulo.id]
    );

    const handleEnviarPregunta = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const texto = textoPregunta.trim();

            // Auth gate
            if (!usuario) {
                if (onAuthRequerido) onAuthRequerido();
                else notificar.info('Inicia sesión para hacer una pregunta');
                return;
            }

            // Validación local
            if (texto.length < PREGUNTA_MIN) {
                setErrorPregunta(`Escribe al menos ${PREGUNTA_MIN} caracteres`);
                return;
            }
            if (texto.length > PREGUNTA_MAX) {
                setErrorPregunta(`Máximo ${PREGUNTA_MAX} caracteres`);
                return;
            }

            setErrorPregunta(null);

            try {
                const respuesta = await crearPregunta.mutateAsync({
                    articuloId: articulo.id,
                    pregunta: texto,
                });
                if (respuesta.success) {
                    // Optimistic UI: agregar inline inmediatamente como pendiente.
                    // El backend devuelve { id }; el resto lo armamos local con el
                    // perfil del usuario logueado.
                    const nuevaId =
                        (respuesta as { data?: { id?: string } }).data?.id ??
                        `optimistic-${Date.now()}`;
                    setPreguntasOptimistas((prev) => [
                        ...prev,
                        {
                            id: nuevaId,
                            pregunta: texto,
                            respuesta: null,
                            respondidaAt: null,
                            editadaAt: null,
                            createdAt: new Date().toISOString(),
                            comprador: {
                                id: usuario.id,
                                nombre: usuario.nombre ?? '',
                                apellidos: usuario.apellidos ?? '',
                                avatarUrl: usuario.avatarUrl ?? null,
                            },
                        },
                    ]);
                    setTextoPregunta('');
                    // Auto-expandir para que el usuario vea su nueva pregunta
                    // sin tener que clickear "Ver más" si ya hay >4 preguntas.
                    setPreguntasExpandidas(true);
                    notificar.exito('Pregunta enviada al vendedor');
                } else {
                    setErrorPregunta(respuesta.message ?? 'No pudimos enviar tu pregunta');
                }
            } catch (err) {
                const error = err as { response?: { data?: { message?: string } } };
                const mensaje =
                    error.response?.data?.message ??
                    'No pudimos enviar tu pregunta. Intenta de nuevo.';
                setErrorPregunta(mensaje);
            }
        },
        [textoPregunta, usuario, onAuthRequerido, crearPregunta, articulo.id]
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

                <button
                    ref={heartButtonRef}
                    type="button"
                    data-testid={`card-feed-guardar-${articulo.id}`}
                    onClick={handleToggleGuardado}
                    disabled={loading}
                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                    className={`relative shrink-0 rounded-full p-2 lg:cursor-pointer ${guardado
                            ? 'text-red-500 lg:hover:bg-red-100'
                            : 'text-slate-500 lg:hover:bg-slate-200 lg:hover:text-red-500'
                        }`}
                    style={{
                        animation: heartBounce
                            ? 'feedHeartBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)'
                            : undefined,
                    }}
                >
                    {/* Pulse ring de 1 sola pasada al momento del click */}
                    {heartBounce && (
                        <span
                            className="pointer-events-none absolute inset-1 rounded-full border-2 border-red-500/50"
                            style={{ animation: 'feedHeartRingPulse 0.6s ease-out' }}
                            aria-hidden="true"
                        />
                    )}
                    <Heart
                        className="h-7 w-7"
                        strokeWidth={2}
                        fill={guardado ? 'currentColor' : 'none'}
                    />
                </button>
            </header>

            {/* ─── CUERPO: título + precio + descripción ──────────────────── */}
            {/* Solo el título es link al detalle. Precio/chips son info,        */}
            {/* descripción es texto plano que expande/colapsa con click.        */}
            <div className={`px-4 ${modoModal ? 'pb-2' : 'pb-3'}`}>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                        {formatearPrecio(articulo.precio)}
                    </span>
                    {articulo.aceptaOfertas && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-700">
                            Acepta ofertas
                        </span>
                    )}
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-sm font-medium text-slate-700">
                        {condicionLabel}
                    </span>
                </div>
                <h3 className="mt-1.5">
                    <button
                        type="button"
                        data-testid={`card-feed-titulo-${articulo.id}`}
                        onClick={irAlDetalle}
                        className="line-clamp-2 block w-full text-left text-lg font-bold text-slate-900 leading-snug lg:cursor-pointer lg:hover:underline"
                    >
                        {articulo.titulo}
                    </button>
                </h3>
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

            {/* ─── GALERÍA + THUMBNAILS LATERALES (lg+) ───────────────────── */}
            <div className="flex">
                {/* Galería principal — proporción 16:9 horizontal */}
                <div
                    className={`group/galeria relative ${modoModal ? 'h-56 lg:h-64' : 'aspect-[4/3] lg:aspect-[2/1]'} flex-1 overflow-hidden bg-slate-100 lg:cursor-pointer touch-pan-y`}
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
                        <>
                            {/* Imagen ANTERIOR — asoma desde la izquierda al swipear → */}
                            {tieneMultiples && (
                                <img
                                    key={`prev-${indiceAnterior}`}
                                    src={fotos[indiceAnterior]}
                                    alt=""
                                    aria-hidden="true"
                                    draggable={false}
                                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                                    style={{
                                        transform: `translateX(calc(-100% + ${offsetPx}px))`,
                                        transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                        willChange: 'transform',
                                    }}
                                />
                            )}
                            {/* Imagen ACTUAL — sigue al dedo */}
                            <img
                                key={`curr-${indiceFoto}`}
                                src={fotos[indiceFoto]}
                                alt={`${articulo.titulo} — foto ${indiceFoto + 1}`}
                                draggable={false}
                                className="absolute inset-0 h-full w-full select-none object-cover"
                                style={{
                                    transform: `translateX(${offsetPx}px)`,
                                    transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                    willChange: 'transform',
                                }}
                            />
                            {/* Imagen SIGUIENTE — asoma desde la derecha al swipear ← */}
                            {tieneMultiples && (
                                <img
                                    key={`next-${indiceSiguiente}`}
                                    src={fotos[indiceSiguiente]}
                                    alt=""
                                    aria-hidden="true"
                                    draggable={false}
                                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                                    style={{
                                        transform: `translateX(calc(100% + ${offsetPx}px))`,
                                        transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                        willChange: 'transform',
                                    }}
                                />
                            )}
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
                    para mensajes; el usuario navega imágenes con swipe o flechas. */}
                {tieneMultiples && !modoModal && (
                    <div className="hidden w-24 shrink-0 flex-col gap-2 overflow-y-auto bg-slate-200 p-2 lg:flex">
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
                            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                            {distancia}
                        </span>
                    )}
                    {(articulo.totalPreguntasRespondidas ?? 0) > 0 && (
                        <>
                            {distancia && <span className="text-slate-400" aria-hidden>·</span>}
                            <span className="flex items-center gap-1.5">
                                <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                                {articulo.totalPreguntasRespondidas}
                            </span>
                        </>
                    )}
                    {(distancia || (articulo.totalPreguntasRespondidas ?? 0) > 0) && (
                        <span className="text-slate-400" aria-hidden>·</span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {articulo.totalVistas}
                    </span>
                </div>
                {senalActividad && senalActividad.tipo === 'guardados' && (
                    <span className="flex items-center gap-1.5 font-semibold text-red-600">
                        <Heart className="h-5 w-5 shrink-0" strokeWidth={2.5} fill="currentColor" />
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

            {/* ─── COMENTARIOS INLINE (todas las preguntas) ───────────────── */}
            {/* Respondidas primero, pendientes después (ya ordenadas en backend). */}
            {/* Pendientes (sin respuesta) se ven públicamente con indicador. */}
            {/* En modoModal: esta zona es la única scrolleable; el input vive */}
            {/* en su propio container fijo abajo (ver más adelante). */}
            <div className={modoModal ? 'flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-3' : 'px-4 py-3'}>
                {preguntasARenderizar.length > 0 && (
                    <div className="space-y-3">
                        {preguntasVisibles.map((p) => {
                            const respondida = !!p.respuesta;
                            const esMia = !!usuario && p.comprador.id === usuario.id;
                            const puedeGestionar = esMia && !respondida;
                            const enEdicion = editandoId === p.id;
                            return (
                                <div key={p.id} className="text-base">
                                    <div className="flex gap-2">
                                        {p.comprador.avatarUrl ? (
                                            <img
                                                src={p.comprador.avatarUrl}
                                                alt={p.comprador.nombre}
                                                className="h-7 w-7 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
                                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                            >
                                                {(p.comprador.nombre ?? '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 rounded-2xl bg-slate-200 px-3 py-2">
                                            <p className="text-base font-bold text-slate-900">
                                                <BotonComentarista
                                                    usuarioId={p.comprador.id}
                                                    nombre={p.comprador.nombre}
                                                    apellidos={p.comprador.apellidos}
                                                    avatarUrl={p.comprador.avatarUrl}
                                                    editado={!!p.editadaAt && !enEdicion}
                                                />
                                            </p>
                                            {enEdicion ? (
                                                <div className="mt-1">
                                                    <textarea
                                                        data-testid={`card-feed-edit-input-${p.id}`}
                                                        value={textoEditando}
                                                        onChange={(e) => {
                                                            setTextoEditando(e.target.value);
                                                            if (errorEditando) setErrorEditando(null);
                                                        }}
                                                        maxLength={PREGUNTA_MAX}
                                                        rows={2}
                                                        disabled={editarPregunta.isPending}
                                                        className="w-full resize-none rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-base font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                                                    />
                                                    {errorEditando && (
                                                        <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
                                                            <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                                                            {errorEditando}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-base text-slate-700">{p.pregunta}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Respuesta del vendedor o estado pendiente */}
                                    {respondida && !enEdicion && (
                                        <div className="mt-1.5 ml-9 flex gap-2">
                                            {/* Avatar del vendedor */}
                                            {articulo.vendedor.avatarUrl ? (
                                                <img
                                                    src={articulo.vendedor.avatarUrl}
                                                    alt={nombreVendedor}
                                                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
                                                    style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)' }}
                                                >
                                                    {(articulo.vendedor.nombre.charAt(0) +
                                                        articulo.vendedor.apellidos.charAt(0)).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 rounded-2xl bg-teal-100 px-3 py-2 text-base text-slate-800">
                                                <p className="text-base font-bold text-teal-700">
                                                    <BotonComentarista
                                                        usuarioId={articulo.vendedor.id}
                                                        nombre={articulo.vendedor.nombre}
                                                        apellidos={articulo.vendedor.apellidos}
                                                        avatarUrl={articulo.vendedor.avatarUrl}
                                                        displayName={articulo.vendedor.nombre.split(' ')[0]}
                                                    />
                                                </p>
                                                <p>{p.respuesta}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!respondida && !enEdicion && (
                                        <p className="mt-1 ml-9 text-sm font-medium italic text-slate-500">
                                            Pendiente de respuesta
                                        </p>
                                    )}

                                    {/* Acciones inline para mi propia pregunta pendiente */}
                                    {puedeGestionar && !enEdicion && (
                                        <div className="mt-1 ml-9 flex items-center gap-3 text-xs font-semibold">
                                            <button
                                                type="button"
                                                data-testid={`card-feed-editar-pregunta-${p.id}`}
                                                onClick={() => handleIniciarEdicion(p.id, p.pregunta)}
                                                className="text-slate-600 lg:cursor-pointer lg:hover:text-teal-700 lg:hover:underline"
                                            >
                                                Editar
                                            </button>
                                            <span className="text-slate-300" aria-hidden>·</span>
                                            <button
                                                type="button"
                                                data-testid={`card-feed-eliminar-pregunta-${p.id}`}
                                                onClick={() => handleEliminarPropia(p.id)}
                                                disabled={eliminarPreguntaMia.isPending}
                                                className="text-rose-600 disabled:opacity-50 lg:cursor-pointer lg:hover:text-rose-700 lg:hover:underline"
                                            >
                                                Borrar
                                            </button>
                                        </div>
                                    )}

                                    {/* Botones de modo edición */}
                                    {puedeGestionar && enEdicion && (
                                        <div className="mt-1.5 ml-9 flex items-center gap-2 text-xs font-semibold">
                                            <button
                                                type="button"
                                                data-testid={`card-feed-guardar-edicion-${p.id}`}
                                                onClick={() => handleGuardarEdicion(p.id)}
                                                disabled={
                                                    editarPregunta.isPending ||
                                                    textoEditando.trim().length < PREGUNTA_MIN
                                                }
                                                className="rounded-full bg-teal-600 px-3 py-1 text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 lg:cursor-pointer lg:hover:bg-teal-700"
                                            >
                                                {editarPregunta.isPending ? 'Guardando…' : 'Guardar'}
                                            </button>
                                            <button
                                                type="button"
                                                data-testid={`card-feed-cancelar-edicion-${p.id}`}
                                                onClick={handleCancelarEdicion}
                                                disabled={editarPregunta.isPending}
                                                className="rounded-full px-3 py-1 text-slate-600 lg:cursor-pointer lg:hover:bg-slate-200"
                                            >
                                                Cancelar
                                            </button>
                                            <span className="ml-auto text-slate-500">
                                                {textoEditando.length}/{PREGUNTA_MAX}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Botón "Ver N preguntas más" / "Ver menos" — patrón
                            Facebook. Solo aparece si hay preguntas ocultas o
                            si está expandido (para poder colapsar). */}
                        {!modoModal && preguntasOcultas > 0 && !preguntasExpandidas && (
                            <button
                                type="button"
                                data-testid={`card-feed-ver-mas-preguntas-${articulo.id}`}
                                onClick={() => {
                                    // Si hay callback del padre → abrir modal grande estilo
                                    // Facebook con toda la publicación. Sin callback →
                                    // fallback a expandir inline (comportamiento legacy
                                    // o cuando ya estamos dentro del modal).
                                    if (onAbrirDetalle) {
                                        onAbrirDetalle();
                                    } else {
                                        setPreguntasExpandidas(true);
                                    }
                                }}
                                className="text-sm font-semibold text-teal-700 lg:cursor-pointer lg:hover:underline"
                            >
                                Ver {preguntasOcultas}{' '}
                                {preguntasOcultas === 1 ? 'pregunta más' : 'preguntas más'}
                            </button>
                        )}
                        {!modoModal && preguntasExpandidas &&
                            preguntasARenderizar.length > MAX_PREGUNTAS_VISIBLES && (
                                <button
                                    type="button"
                                    data-testid={`card-feed-ver-menos-preguntas-${articulo.id}`}
                                    onClick={() => setPreguntasExpandidas(false)}
                                    className="text-sm font-semibold text-slate-600 lg:cursor-pointer lg:hover:underline"
                                >
                                    Ver menos
                                </button>
                            )}
                    </div>
                )}

            </div>

            {/* ─── INPUT + AVISO COMERCIAL (zona fija en modoModal) ────────── */}
            {/* En modoModal queda como footer pegado al fondo del modal. En  */}
            {/* el feed normal, fluye junto con el resto de la card.          */}
            {(puedeMostrarInput || (!esDueno && enModoComercial)) && (
                <div
                    className={
                        modoModal
                            ? 'shrink-0 border-t border-slate-200 bg-white px-4 py-3'
                            : `px-4 ${preguntasARenderizar.length > 0 ? 'pb-3' : 'pt-3 pb-3'}`
                    }
                >
                {/* Input "Hacer una pregunta..." funcional. Optimistic UI:
                    al enviar, la pregunta aparece inmediatamente en la lista
                    de arriba como "Pendiente de respuesta" — no hay card de
                    confirmación porque la confirmación es ver tu pregunta
                    inline. */}
                {puedeMostrarInput && (
                    <form
                        onSubmit={handleEnviarPregunta}
                    >
                        <div className="flex items-center gap-2.5 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-1 pr-1.5 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                            {/* Avatar prefix — usuario actual (FB pattern). Si no hay sesión,
                                se muestra el icono de chat genérico. */}
                            {usuario ? (
                                usuario.avatarUrl ? (
                                    <img
                                        src={usuario.avatarUrl}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
                                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                        aria-hidden="true"
                                    >
                                        {((usuario.nombre ?? '?').charAt(0) +
                                            (usuario.apellidos ?? '').charAt(0)).toUpperCase()}
                                    </div>
                                )
                            ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                                    <MessageCircle className="h-4 w-4" strokeWidth={2} />
                                </div>
                            )}
                            <input
                                type="text"
                                data-testid={`card-feed-input-pregunta-${articulo.id}`}
                                value={textoPregunta}
                                onChange={(e) => {
                                    setTextoPregunta(e.target.value);
                                    if (errorPregunta) setErrorPregunta(null);
                                }}
                                placeholder="Hacer una pregunta..."
                                maxLength={PREGUNTA_MAX}
                                disabled={crearPregunta.isPending}
                                className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid={`card-feed-enviar-pregunta-${articulo.id}`}
                                disabled={
                                    crearPregunta.isPending ||
                                    textoPregunta.trim().length < PREGUNTA_MIN
                                }
                                aria-label="Enviar pregunta"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                    textoPregunta.trim().length >= PREGUNTA_MIN && !crearPregunta.isPending
                                        ? 'bg-teal-600 text-white shadow-sm lg:hover:bg-teal-700'
                                        : 'bg-transparent text-slate-400'
                                }`}
                            >
                                {crearPregunta.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </div>

                        {/* Estado: contador + error */}
                        <div className="mt-1 flex items-center justify-between px-3 text-sm">
                            {errorPregunta ? (
                                <span className="flex items-center gap-1 text-rose-600">
                                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    {errorPregunta}
                                </span>
                            ) : (
                                <span className="text-slate-600">
                                    {textoPregunta.length > 0
                                        ? `${textoPregunta.length}/${PREGUNTA_MAX}`
                                        : ''}
                                </span>
                            )}
                        </div>
                    </form>
                )}

                {/* Modo Comercial — bloqueado */}
                {!esDueno && enModoComercial && (
                    <div
                        className={`rounded-xl border-2 border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 ${puedeMostrarInput ? 'mt-3' : ''
                            }`}
                    >
                        Cambia a modo Personal para hacer preguntas en MarketPlace.
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

            {/* ─── POPUP FLOTANTE AL GUARDAR (mismo patrón que CardNegocio) ── */}
            {likeAnimation && createPortal(
                <div
                    className={`fixed flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg ${
                        likeAnimation === 'like'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                    }`}
                    style={{
                        top: likePosition.top,
                        left: likePosition.left,
                        zIndex: 99999,
                        pointerEvents: 'none',
                        animation: 'feedFloatUp 1.5s ease-out forwards',
                    }}
                >
                    {likeAnimation === 'like' ? (
                        <>
                            <Smile className="w-5 h-5" />
                            <span className="text-sm font-medium">¡Gracias!</span>
                        </>
                    ) : (
                        <>
                            <Frown className="w-5 h-5" />
                            <span className="text-sm font-medium">¡Oh no!</span>
                        </>
                    )}
                </div>,
                document.body
            )}
        </article>
    );
}

export default CardArticuloFeed;
