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
import { ImageOff, Users } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const MessageCircle = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;
import { useGuardados } from '../../hooks/useGuardados';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    esArticuloNuevo,
    obtenerFotoPortada,
    formatearPrecio,
} from '../../utils/marketplace';
import type { ArticuloFeed } from '../../types/marketplace';

interface CardArticuloProps {
    articulo: ArticuloFeed;
    /**
     * Variante de altura. Por defecto 'feed' (aspect 1:1). En contextos
     * donde se necesita una grilla más densa con menos altura por card
     * (perfil de usuario, módulos de listado), usar 'compacta' (aspect 4:3).
     */
    variant?: 'feed' | 'compacta';
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
}

export function CardArticulo({
    articulo,
    variant = 'feed',
    altoFijo,
    ocultarBotonGuardar,
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
        const nPreguntas = articulo.totalPreguntasRespondidas ?? 0;
        if (nPreguntas >= 1) {
            return {
                icono: <MessageCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />,
                texto: `${nPreguntas} pregunta${nPreguntas > 1 ? 's' : ''} respondida${nPreguntas > 1 ? 's' : ''}`,
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

    const handleClickGuardar = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleGuardado();
    };

    return (
        <article
            data-testid={`card-articulo-${articulo.id}`}
            onClick={handleClickCard}
            className={`group min-w-0 cursor-pointer flex flex-col overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md ${
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
                        ? 'aspect-[3/2]'
                        : 'aspect-square'
                }`}
            >
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={articulo.titulo}
                        className="absolute inset-0 h-full w-full object-cover"
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
                        className={`absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full backdrop-blur-[10px] disabled:opacity-50 ${
                            guardado
                                ? 'border-2 border-amber-500 bg-white'
                                : 'border border-white/10 bg-black/25'
                        }`}
                    >
                        <Icon
                            icon={guardado ? ICONOS.guardar : 'ph:archive-box'}
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
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-slate-700">
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
                        className="flex min-h-[1.125rem] items-center gap-1 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600"
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
    );
}

export default CardArticulo;
