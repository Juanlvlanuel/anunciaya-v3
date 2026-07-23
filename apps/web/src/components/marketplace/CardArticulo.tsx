/**
 * CardArticulo.tsx
 * =================
 * Card del feed de MarketPlace — estilo B (imagen arriba + bloque blanco
 * abajo). Distinto del glassmorphism de CardNegocio porque:
 *  - El precio se lee mejor sobre fondo blanco.
 *  - Las fotos de usuarios son inconsistentes (mala iluminación, fondos
 *    variados); el glass se ve mal sobre ellas.
 *  - Diferenciación visual clara con la sección Negocios.
 *
 * Cumple Regla 13 de TOKENS_GLOBALES (estética profesional B2B):
 *  - Sin emojis como datos, sin tonos pastel saturados.
 *  - Iconos 14-16px sin círculo de fondo.
 *  - Color neutro slate + acento teal único.
 *  - Hover: shadow estática, sin scale ni elevación.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P1 Card del artículo)
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/components/marketplace/CardArticulo.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ImageOff, Users, ChevronRight, Pencil } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
import { useGuardados } from '../../hooks/useGuardados';
import { useSaveBubble } from '../../hooks/useSaveBubble';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatMarketplace } from '../../hooks/useIniciarChatMarketplace';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    esArticuloNuevo,
    obtenerFotoPortada,
    formatearPrecio,
} from '../../utils/marketplace';
import type { ArticuloFeed, ArticuloMarketplaceDetalle } from '../../types/marketplace';

interface CardArticuloProps {
    articulo: ArticuloFeed;
    /**
     * Variante de altura/estilo. Por defecto 'feed' (aspect 1:1). 'compacta'
     * para grillas densas (perfil de usuario). 'glass' — foto grande con
     * texto encima (mismo estilo "todo sobre la imagen" que `CardNegocio`
     * en la columna fija de escritorio), incluye ícono ChatYA de contacto
     * rápido — pensado para la columna "Recién publicado" de MarketPlace.
     */
    variant?: 'feed' | 'compacta' | 'glass';
    /**
     * Clases Tailwind opcionales para fijar la altura total del card (ej.
     * `h-[280px] lg:h-[340px]`). Cuando se pasa, el componente abandona el
     * `aspect-*` de la imagen y reparte el espacio en 60% imagen / 40%
     * panel — útil para que la card coincida en altura con otras cards
     * vecinas (Mis Guardados, donde MarketPlace convive con OfertaCard).
     */
    altoFijo?: string;
    /**
     * Si true, se omite el botón flotante de "guardar" (corazón sup-der)
     * que renderiza la card por defecto. Se usa cuando la vista padre
     * sobrepone su propio control — ej. Mis Guardados, donde el corazón
     * externo entra en modo selección múltiple en lugar de toggle
     * individual.
     */
    ocultarBotonGuardar?: boolean;
    /**
     * MisGuardados pasa `'rose'` para unificar el acento al rosa temático
     * de esa página: hover border-rose-400 + lift + scale en la imagen.
     * Default `undefined` mantiene el comportamiento histórico (sin hover
     * notable) en el resto de los contextos (feed, perfil del vendedor,
     * buscador).
     */
    acentoHover?: 'rose';
}

export function CardArticulo({
    articulo,
    variant = 'feed',
    altoFijo,
    ocultarBotonGuardar,
    acentoHover,
}: CardArticuloProps) {
    const navigate = useNavigate();
    // `articulo.guardado` viene del backend cuando el visitante está
    // autenticado (feed infinito + publicaciones del vendedor). Lo pasamos
    // como `initialGuardado` para que el corazón se vea correcto desde el
    // primer render, sin esperar fetch adicional.
    const { guardado, loading, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articulo.id,
        initialGuardado: articulo.guardado,
    });

    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const esNuevo = esArticuloNuevo(articulo.createdAt);
    const distancia = formatearDistancia(articulo.distanciaMetros);
    const tiempo = formatearTiempoRelativo(articulo.createdAt);

    // Señal de actividad — una sola línea, en orden de prioridad.
    const senalActividad: { icono: React.ReactNode; texto: string } | null = (() => {
        if ((articulo.viendo ?? 0) >= 3) {
            return {
                icono: <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${articulo.viendo} personas viendo ahora`,
            };
        }
        if (articulo.totalGuardados >= 5) {
            return {
                icono: <Icon icon={ICONOS.guardar} className="h-3.5 w-3.5 shrink-0" />,
                texto: `${articulo.totalGuardados} personas lo guardaron`,
            };
        }
        const nComentarios = articulo.totalComentarios ?? 0;
        if (nComentarios >= 1) {
            return {
                icono: <MessageCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${nComentarios} comentario${nComentarios > 1 ? 's' : ''}`,
            };
        }
        if ((articulo.vistas24h ?? 0) >= 20) {
            return {
                icono: <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `Visto ${articulo.vistas24h} veces hoy`,
            };
        }
        return null;
    })();

    const handleClickCard = () => {
        navigate(`/marketplace/articulo/${articulo.id}`);
    };

    // ─── ChatYA (solo variant='glass') — mismo patrón que
    // `CardArticuloGuardado`: el tipo del feed (`ArticuloFeed`) no trae los
    // datos completos del vendedor que pide `useIniciarChatMarketplace`
    // (teléfono, ciudad, etc.), así que se hace fetch on-demand del detalle
    // al presionar el ícono — React Query cachea, así que un segundo click
    // no vuelve a pegarle al backend. ──────────────────────────────────────
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const qc = useQueryClient();
    const iniciarChatMarketplace = useIniciarChatMarketplace();
    const mostrarChatYA = !!articulo.usuarioId && usuarioActualId !== articulo.usuarioId;
    // Es tu propia publicación — ChatYA no aplica (no te contactas a ti
    // mismo). En su lugar mostramos un acceso directo a editar, para que
    // ese espacio de la barra de vidrio no quede vacío/raro.
    const esPropia = !!articulo.usuarioId && usuarioActualId === articulo.usuarioId;
    const handleEditarPropia = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/marketplace?editar=${articulo.id}`);
    };
    const handleChatYA = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            const detalle = await qc.fetchQuery({
                queryKey: queryKeys.marketplace.articulo(articulo.id),
                queryFn: async (): Promise<ArticuloMarketplaceDetalle | null> => {
                    const response = await api.get<{
                        success: boolean;
                        data: ArticuloMarketplaceDetalle;
                    }>(`/marketplace/articulos/${articulo.id}`);
                    return response.data.success ? response.data.data : null;
                },
                staleTime: 60 * 1000,
            });
            if (!detalle) {
                notificar.error('No se pudo cargar el artículo');
                return;
            }
            await iniciarChatMarketplace(detalle);
        } catch {
            notificar.error('No se pudo iniciar el chat');
        }
    };

    const { triggerSaveBubble, saveBubble } = useSaveBubble();
    const handleClickGuardar = (e: React.MouseEvent) => {
        e.stopPropagation();
        // El estado que pasamos al bubble es el QUE VA A QUEDAR después
        // del toggle (no el actual). Si `guardado=false` ahora, el
        // click lo pasa a true → mostrar "¡Guardado!".
        triggerSaveBubble(e, guardado ? 'unsave' : 'save');
        toggleGuardado();
    };

    // ── Variant 'glass' — "todo sobre la imagen", mismo estilo que
    // `CardNegocio` en la columna fija de escritorio: foto grande de fondo,
    // gradiente para legibilidad, solo título + precio encima (no toda la
    // info del artículo), y una barra de vidrio abajo con ChatYA de
    // contacto rápido + botón "Ver". ─────────────────────────────────────
    if (variant === 'glass') {
        return (
            <>
                {saveBubble}
                <article
                    data-testid={`card-articulo-${articulo.id}`}
                    onClick={handleClickCard}
                    className="group relative h-60 @5xl:h-[210px] @[96rem]:h-[220px] w-full cursor-pointer overflow-hidden rounded-2xl shadow-md transition-shadow duration-300 lg:hover:shadow-xl"
                >
                    <div className="absolute inset-0 bg-slate-200">
                        {fotoPortada ? (
                            <img
                                src={fotoPortada}
                                alt={articulo.titulo}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>

                    {/* Gradiente — legibilidad del texto sobre la foto (mismo
                        criterio que CardNegocio). */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 32%, rgba(0,0,0,0.08) 55%, transparent 72%)',
                        }}
                    />

                    {esNuevo && (
                        <span
                            data-testid={`badge-recien-${articulo.id}`}
                            className="absolute left-2 top-2 z-10 inline-flex items-center rounded-md bg-teal-500 px-1.5 py-0.5 text-[10px] 2xl:text-xs font-bold uppercase tracking-wide text-white shadow-sm"
                        >
                            Recién
                        </span>
                    )}

                    {!ocultarBotonGuardar && (
                        <button
                            type="button"
                            data-testid={`btn-guardar-${articulo.id}`}
                            onClick={handleClickGuardar}
                            disabled={loading}
                            aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                            aria-pressed={guardado}
                            className={`absolute right-1.5 top-1.5 z-10 flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full backdrop-blur-[10px] overflow-visible disabled:opacity-50 ${
                                guardado
                                    ? 'border-2 border-amber-500 bg-white'
                                    : 'border border-white/10 bg-black/25'
                            }`}
                        >
                            {guardado && (
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-500/40"
                                    style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
                                />
                            )}
                            <Icon
                                icon={ICONOS.guardar}
                                className="w-5 h-5"
                                style={{ color: guardado ? '#f59e0b' : 'white' }}
                            />
                        </button>
                    )}

                    {/* Texto + barra de contacto — absolutos abajo, sobre el gradiente. */}
                    <div className="absolute bottom-[3px] left-0 right-0 z-10 px-3 pb-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white drop-shadow-md">
                                {articulo.titulo}
                            </span>
                            {/* Badge de precio — acento teal de marca (no solo
                                texto blanco), le da personalidad propia frente
                                al título neutro. */}
                            <span
                                className="shrink-0 rounded-full px-2.5 py-1 text-sm font-extrabold text-white shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
                            >
                                {formatearPrecio(articulo.precio)}
                                {articulo.unidadVenta && (
                                    <span className="ml-0.5 text-xs font-semibold text-white/85">
                                        {articulo.unidadVenta}
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Barra de vidrio — ChatYA (contacto rápido) + Ver.
                            Padding/tamaños calcados 1:1 de CardNegocio. */}
                        <div className="mt-1 flex items-center justify-between rounded-[14px] border border-white/12 bg-white/10 py-1.5 pl-3.5 pr-[5px] backdrop-blur-xl">
                            <div className="flex items-center gap-2">
                                {mostrarChatYA && (
                                    <button
                                        type="button"
                                        data-testid={`btn-chatya-${articulo.id}`}
                                        onClick={handleChatYA}
                                        aria-label="Contactar por ChatYA"
                                        className="flex cursor-pointer items-center border-0 bg-transparent p-0 active:opacity-70"
                                    >
                                        <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                                    </button>
                                )}
                                {/* Es tuya — ChatYA no aplica; en su lugar,
                                    acceso directo a editar (mismo destino que
                                    "Mis Publicaciones" → Editar). */}
                                {esPropia && (
                                    <button
                                        type="button"
                                        data-testid={`btn-editar-propia-${articulo.id}`}
                                        onClick={handleEditarPropia}
                                        aria-label="Ver o editar tu publicación"
                                        className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-bold text-white active:opacity-70"
                                    >
                                        <Pencil className="h-4 w-4" strokeWidth={2.5} />
                                        Editar
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                data-testid={`btn-ver-${articulo.id}`}
                                onClick={(e) => { e.stopPropagation(); handleClickCard(); }}
                                className="flex cursor-pointer items-center gap-1 rounded-[10px] border-0 px-3.5 py-[7px] text-[13px] font-bold text-white active:scale-95 transition-transform"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', boxShadow: '0 3px 14px rgba(15,23,42,0.50)' }}
                            >
                                Ver
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </article>
            </>
        );
    }

    return (
        <>
        {/* Bubble flotante "¡Guardado!" / "Quitado" renderizado vía
            createPortal a document.body — vive fuera del <article> para
            que el portal no se desmonte si el card se re-renderiza. */}
        {saveBubble}
        <article
            data-testid={`card-articulo-${articulo.id}`}
            onClick={handleClickCard}
            className={`group min-w-0 cursor-pointer flex flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md ${
                acentoHover === 'rose'
                    ? 'transition-all duration-200 lg:hover:-translate-y-0.5 lg:hover:border-rose-400 lg:hover:shadow-lg'
                    : ''
            } ${
                altoFijo
                    ? altoFijo
                    : variant === 'compacta'
                    ? ''
                    : 'h-full'
            }`}
        >
            {/* ── Imagen portada — aspect según variant.
                Imagen con `absolute inset-0` para que NO esté en el flujo
                y la altura intrínseca de fotos verticales NO empuje al
                contenedor. El padre tiene `aspect-ratio` fijo + `overflow-hidden`
                — la imagen se ajusta dentro vía `object-cover`. ──────── */}
            <div
                className={`relative w-full overflow-hidden bg-slate-200 ${
                    altoFijo
                        ? 'h-[60%] shrink-0'
                        : variant === 'compacta'
                        ? 'aspect-3/2'
                        : 'aspect-square'
                }`}
            >
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={articulo.titulo}
                        className={`absolute inset-0 h-full w-full object-cover ${
                            acentoHover === 'rose'
                                ? 'transition-transform duration-300 group-hover:scale-105'
                                : ''
                        }`}
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                )}

                {/* Badge "RECIÉN" (publicación <24h). Posición dinámica:
                      - Sup-IZQ por default (el corazón propio vive en sup-der).
                      - Sup-DER cuando `ocultarBotonGuardar=true` (Mis Guardados
                        pone su `BookmarkGlass` en sup-izq, así no se empalman).
                    Texto distinto de "Nuevo" para no chocar con la condición
                    "nuevo" del artículo. */}
                {esNuevo && (
                    <span
                        data-testid={`badge-recien-${articulo.id}`}
                        className={`absolute top-2 inline-flex items-center rounded-md bg-teal-500 px-1.5 py-0.5 text-[10px] 2xl:text-xs font-bold uppercase tracking-wide text-white shadow-sm ${
                            ocultarBotonGuardar ? 'right-2' : 'left-2'
                        }`}
                    >
                        Recién
                    </span>
                )}

                {/* Botón ❤️ guardar ─ esquina sup-der. Estilo glass oscuro
                    (mismo patrón que `BookmarkGlass` de Mis Guardados): el
                    corazón rojo sobre vidrio translúcido se lee bien sobre
                    fotos claras y oscuras. Se oculta cuando la vista padre
                    sobrepone su propio control de selección (ej. Mis
                    Guardados con modo selección múltiple). */}
                {!ocultarBotonGuardar && (
                    <button
                        data-testid={`btn-guardar-${articulo.id}`}
                        onClick={handleClickGuardar}
                        disabled={loading}
                        aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                        aria-pressed={guardado}
                        className={`absolute right-2 top-2 flex w-[38px] h-[38px] cursor-pointer items-center justify-center rounded-full backdrop-blur-[10px] overflow-visible disabled:opacity-50 ${
                            guardado
                                ? 'border-2 border-amber-500 bg-white'
                                : 'border border-white/10 bg-black/25'
                        }`}
                    >
                        {/* Pulse ring amber respirando cuando guardado —
                            mismo patrón visual que CardNegocio del feed y
                            BookmarkGlass de MisGuardados para coherencia
                            cross-módulo. */}
                        {guardado && (
                            <span
                                aria-hidden
                                className="absolute -inset-1 rounded-full border-2 border-amber-500/40 pointer-events-none"
                                style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
                            />
                        )}
                        <Icon
                            icon={ICONOS.guardar}
                            className="h-5 w-5"
                            style={{ color: guardado ? '#f59e0b' : 'white' }}
                        />
                    </button>
                )}
            </div>

            {/* ── Bloque blanco abajo. En 'feed' usa flex-1 para igualar
                altura cuando la grilla estira; en 'compacta' tiene altura
                natural (no estira) para evitar bloque blanco al final.
                `min-w-0` asegura que el `truncate` del título funcione: sin
                él, los grid items por default tienen `min-width: auto` y un
                título largo puede empujar el ancho de la columna. ── */}
            <div
                className={`flex min-w-0 flex-col gap-1 px-3 py-2.5 ${
                    altoFijo || variant !== 'compacta' ? 'flex-1' : ''
                }`}
            >
                {/* Orden de información idéntico al feed público
                    (CardArticuloFeed): título → precio → descripción.
                    Mantiene el ojo del comprador en "qué es" antes que "cuánto cuesta". */}

                {/* Título (truncate 1 línea en compacta para densidad) */}
                <div className="truncate text-base font-bold leading-snug text-slate-900">
                    {articulo.titulo}
                </div>

                {/* Precio + unidad de venta opcional ($15 c/u).
                    Color teal-700 — identidad visual del precio en el módulo. */}
                <div className="text-lg font-bold leading-tight text-teal-700">
                    {formatearPrecio(articulo.precio)}
                    {articulo.unidadVenta && (
                        <span className="ml-1 text-sm font-medium text-teal-700/80">
                            {articulo.unidadVenta}
                        </span>
                    )}
                </div>

                {/* Descripción — siempre reserva 2 líneas de altura aunque
                    el texto sea corto, para que todos los cards del grid
                    midan lo mismo sin importar la longitud de su descripción. */}
                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-slate-700">
                    {articulo.descripcion}
                </p>

                {/* Distancia + tiempo (gris, más sutil) */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    {distancia && (
                        <>
                            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                            <span>{distancia}</span>
                            <span aria-hidden>·</span>
                        </>
                    )}
                    <span>{tiempo}</span>
                </div>

                {/* Señal de actividad — solo en variant 'feed'. En 'compacta'
                    (perfil de usuario) la omitimos para igualar altura entre
                    cards: en grilla densa la señal de "X personas guardaron"
                    aporta poco y desbalancea las alturas. */}
                {variant === 'feed' && (
                    <div
                        data-testid={`actividad-${articulo.id}`}
                        className="flex min-h-4.5 items-center gap-1 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600"
                    >
                        {senalActividad ? (
                            <>
                                {senalActividad.icono}
                                <span>{senalActividad.texto}</span>
                            </>
                        ) : (
                            <span aria-hidden>&nbsp;</span>
                        )}
                    </div>
                )}
            </div>
        </article>
        </>
    );
}

export default CardArticulo;
