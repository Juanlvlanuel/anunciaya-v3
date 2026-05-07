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

import { useState, useCallback, useMemo } from 'react';
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
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { useGuardados } from '../../hooks/useGuardados';
import { useCrearPregunta } from '../../hooks/queries/useMarketplace';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    formatearPrecio,
} from '../../utils/marketplace';
import { ModalImagenes } from '../ui/ModalImagenes';
import { notificar } from '../../utils/notificaciones';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

// =============================================================================
// PROPS
// =============================================================================

interface CardArticuloFeedProps {
    articulo: ArticuloFeedInfinito;
    /** Callback opcional cuando el usuario hace click en "Hacer pregunta" sin sesión. */
    onAuthRequerido?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

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

export function CardArticuloFeed({ articulo, onAuthRequerido }: CardArticuloFeedProps) {
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';

    const { guardado, loading, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articulo.id,
    });

    const crearPregunta = useCrearPregunta();

    // ─── Estado local ────────────────────────────────────────────────────────
    const [indiceFoto, setIndiceFoto] = useState(articulo.fotoPortadaIndex ?? 0);
    const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);
    const [descripcionExpandida, setDescripcionExpandida] = useState(false);
    const [textoPregunta, setTextoPregunta] = useState('');
    const [errorPregunta, setErrorPregunta] = useState<string | null>(null);
    const [preguntaEnviada, setPreguntaEnviada] = useState(false);

    // ─── Derivados ───────────────────────────────────────────────────────────
    const fotos = articulo.fotos ?? [];
    const fotoActual = fotos[indiceFoto] ?? null;
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

    const masPreguntas = Math.max(
        0,
        (articulo.totalPreguntasRespondidas ?? 0) - articulo.topPreguntas.length
    );

    // Señal de actividad inline (al estilo de la CardArticulo original).
    const senalActividad: { icono: React.ReactNode; texto: string } | null = (() => {
        if ((articulo.viendo ?? 0) >= 3) {
            return {
                icono: <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${articulo.viendo} personas viendo ahora`,
            };
        }
        if ((articulo.vistas24h ?? 0) >= 10) {
            return {
                icono: <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${articulo.vistas24h} vistas hoy`,
            };
        }
        if (articulo.totalGuardados >= 5) {
            return {
                icono: <Heart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${articulo.totalGuardados} personas lo guardaron`,
            };
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

    const handleToggleGuardado = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            toggleGuardado();
        },
        [toggleGuardado]
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
                    setTextoPregunta('');
                    setPreguntaEnviada(true);
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
            className="overflow-hidden bg-white lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-sm"
        >
            {/* ─── HEADER: avatar + vendedor + tiempo ─────────────────────── */}
            <header className="flex items-center gap-3 px-4 py-3">
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
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-sm font-bold text-white ring-2 ring-slate-100">
                            {iniciales}
                        </div>
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        data-testid={`card-feed-nombre-${articulo.id}`}
                        onClick={irAlPerfilVendedor}
                        className="block truncate text-left text-sm font-bold text-slate-900 hover:underline lg:cursor-pointer"
                    >
                        {nombreVendedor}
                    </button>
                    <p className="truncate text-xs text-slate-500">
                        {articulo.ciudad} · hace {tiempo}
                    </p>
                </div>

                <button
                    type="button"
                    data-testid={`card-feed-guardar-${articulo.id}`}
                    onClick={handleToggleGuardado}
                    disabled={loading}
                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                    className={`shrink-0 rounded-full p-2 transition-colors lg:cursor-pointer ${guardado
                            ? 'text-rose-500 hover:bg-rose-50'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-rose-500'
                        }`}
                >
                    <Heart
                        className="h-5 w-5"
                        strokeWidth={2}
                        fill={guardado ? 'currentColor' : 'none'}
                    />
                </button>
            </header>

            {/* ─── CUERPO: título + precio + descripción ──────────────────── */}
            <button
                type="button"
                onClick={irAlDetalle}
                className="block w-full px-4 pb-3 text-left lg:cursor-pointer"
            >
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                        {formatearPrecio(articulo.precio)}
                    </span>
                    {articulo.aceptaOfertas && (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Acepta ofertas
                        </span>
                    )}
                    <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {condicionLabel}
                    </span>
                </div>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">
                    {articulo.titulo}
                </h3>
                {articulo.descripcion && (
                    <p
                        className={`mt-1 text-sm leading-relaxed text-slate-600 ${descripcionExpandida ? '' : 'line-clamp-3'
                            }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setDescripcionExpandida((v) => !v);
                        }}
                    >
                        {articulo.descripcion}
                    </p>
                )}
            </button>

            {/* ─── GALERÍA + THUMBNAILS LATERALES (lg+) ───────────────────── */}
            <div className="flex">
                {/* Galería principal — proporción 16:9 horizontal */}
                <div
                    className="relative aspect-[16/9] flex-1 bg-slate-100 lg:cursor-pointer"
                    onClick={irAlDetalle}
                >
                    {fotoActual ? (
                        <img
                            src={fotoActual}
                            alt={`${articulo.titulo} — foto ${indiceFoto + 1}`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImageOff className="h-12 w-12" strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Flechas (solo desktop con multi-imagen) */}
                    {tieneMultiples && (
                        <>
                            <button
                                type="button"
                                onClick={fotoAnterior}
                                data-testid={`card-feed-foto-prev-${articulo.id}`}
                                aria-label="Foto anterior"
                                className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-transform hover:scale-105 lg:flex lg:cursor-pointer"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            <button
                                type="button"
                                onClick={fotoSiguiente}
                                data-testid={`card-feed-foto-next-${articulo.id}`}
                                aria-label="Foto siguiente"
                                className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-transform hover:scale-105 lg:flex lg:cursor-pointer"
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

                {/* Thumbnails laterales (solo desktop con multi-imagen) */}
                {tieneMultiples && (
                    <div className="hidden w-24 shrink-0 flex-col gap-2 overflow-y-auto bg-slate-50 p-2 lg:flex">
                        {fotos.map((url, i) => (
                            <button
                                type="button"
                                key={`${url}-${i}`}
                                onClick={(e) => seleccionarFoto(e, i)}
                                data-testid={`card-feed-thumb-${articulo.id}-${i}`}
                                aria-label={`Ver foto ${i + 1}`}
                                className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-md border-2 transition-all lg:cursor-pointer ${i === indiceFoto
                                        ? 'border-teal-500 ring-2 ring-teal-200'
                                        : 'border-transparent opacity-70 hover:opacity-100'
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

            {/* ─── FOOTER: distancia + actividad ──────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                {distancia && (
                    <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        {distancia}
                    </span>
                )}
                {senalActividad ? (
                    <span className="flex items-center gap-1 text-teal-600">
                        {senalActividad.icono}
                        {senalActividad.texto}
                    </span>
                ) : (
                    <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        {articulo.totalVistas} vistas
                    </span>
                )}
            </div>

            {/* ─── COMENTARIOS INLINE (top 2 preguntas respondidas) ───────── */}
            <div className="border-t border-slate-100 px-4 py-3">
                {articulo.topPreguntas.length > 0 && (
                    <div className="space-y-3">
                        {articulo.topPreguntas.map((p) => (
                            <div key={p.id} className="text-sm">
                                <div className="flex gap-2">
                                    {p.comprador.avatarUrl ? (
                                        <img
                                            src={p.comprador.avatarUrl}
                                            alt={p.comprador.nombre}
                                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                                            {(p.comprador.nombre ?? '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 rounded-2xl bg-slate-100 px-3 py-1.5">
                                        <p className="text-xs font-bold text-slate-900">
                                            {p.comprador.nombre}
                                        </p>
                                        <p className="text-sm text-slate-700">{p.pregunta}</p>
                                    </div>
                                </div>
                                <div className="mt-1.5 ml-9 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm text-slate-800">
                                    <p className="text-xs font-bold text-teal-700">
                                        {nombreVendedor.split(' ')[0]} respondió
                                    </p>
                                    <p>{p.respuesta}</p>
                                </div>
                            </div>
                        ))}

                        {masPreguntas > 0 && (
                            <button
                                type="button"
                                data-testid={`card-feed-ver-mas-preguntas-${articulo.id}`}
                                onClick={irAlDetalle}
                                className="text-sm font-semibold text-teal-700 hover:underline lg:cursor-pointer"
                            >
                                Ver {masPreguntas}{' '}
                                {masPreguntas === 1 ? 'pregunta más' : 'preguntas más'}
                            </button>
                        )}
                    </div>
                )}

                {/* Input "Hacer una pregunta..." funcional */}
                {puedeMostrarInput && !preguntaEnviada && (
                    <form
                        onSubmit={handleEnviarPregunta}
                        className={`${articulo.topPreguntas.length > 0 ? 'mt-3' : ''}`}
                    >
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 transition-colors focus-within:border-teal-400 focus-within:bg-white">
                            <MessageCircle
                                className="h-4 w-4 shrink-0 text-slate-400"
                                strokeWidth={2}
                            />
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
                                className="flex-1 bg-transparent py-1.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid={`card-feed-enviar-pregunta-${articulo.id}`}
                                disabled={
                                    crearPregunta.isPending ||
                                    textoPregunta.trim().length < PREGUNTA_MIN
                                }
                                aria-label="Enviar pregunta"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-teal-600 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40 lg:cursor-pointer"
                            >
                                {crearPregunta.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2} />
                                )}
                            </button>
                        </div>

                        {/* Estado: contador + error */}
                        <div className="mt-1 flex items-center justify-between px-3 text-[11px]">
                            {errorPregunta ? (
                                <span className="flex items-center gap-1 text-rose-600">
                                    <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                                    {errorPregunta}
                                </span>
                            ) : (
                                <span className="text-slate-400">
                                    {textoPregunta.length > 0
                                        ? `${textoPregunta.length}/${PREGUNTA_MAX}`
                                        : ''}
                                </span>
                            )}
                        </div>
                    </form>
                )}

                {/* Estado: pregunta enviada */}
                {puedeMostrarInput && preguntaEnviada && (
                    <div
                        data-testid={`card-feed-pregunta-enviada-${articulo.id}`}
                        className={`flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 ${articulo.topPreguntas.length > 0 ? 'mt-3' : ''
                            }`}
                    >
                        <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            strokeWidth={2.5}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-emerald-900">
                                Pregunta enviada
                            </p>
                            <p className="text-xs text-emerald-700">
                                {nombreVendedor.split(' ')[0]} te avisará cuando responda.
                            </p>
                        </div>
                    </div>
                )}

                {/* Modo Comercial — bloqueado */}
                {!esDueno && enModoComercial && (
                    <div
                        className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 ${articulo.topPreguntas.length > 0 ? 'mt-3' : ''
                            }`}
                    >
                        Cambia a modo Personal para hacer preguntas en MarketPlace.
                    </div>
                )}
            </div>

            {/* ─── MODAL AVATAR ───────────────────────────────────────────── */}
            {modalAvatarAbierto && articulo.vendedor.avatarUrl && (
                <ModalImagenes
                    isOpen={modalAvatarAbierto}
                    onClose={() => setModalAvatarAbierto(false)}
                    images={[articulo.vendedor.avatarUrl]}
                    initialIndex={0}
                />
            )}
        </article>
    );
}

export default CardArticuloFeed;
