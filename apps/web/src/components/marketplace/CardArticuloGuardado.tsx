/**
 * CardArticuloGuardado.tsx
 * =========================
 * Variante del card de MarketPlace usado SOLO en MisGuardados (Sprint 9.3).
 *
 * Clona el layout de `CardServicio` (foto 4:3 + badges encima + info abajo
 * + ChatYA en footer) adaptado al modelo de datos de MP. Hace match visual
 * con los otros 3 tabs de MisGuardados (Servicios, Ofertas, Negocios) y
 * usa el mismo `acentoHover='rose'` para el contorno temático.
 *
 * Por qué no reusar `CardArticulo` con prop nueva:
 *   `CardArticulo` se usa en muchos contextos (feed, perfil vendedor,
 *   buscador, modal de detalle). Agregar este layout completo con prop
 *   condicional la convertiría en un componente "Frankenstein". Es más
 *   limpio tener un componente específico para MisGuardados.
 *
 * Botón ChatYA: hace fetch del detalle del artículo (qc.fetchQuery,
 * usa cache de React Query si ya está) y delega a `useIniciarChatMarketplace`.
 * Mismo patrón que el botón ChatYA del CardServicio en MisGuardados.
 *
 * Ubicación: apps/web/src/components/marketplace/CardArticuloGuardado.tsx
 */

import { useQueryClient } from '@tanstack/react-query';
import { MapPin, ShoppingBag } from 'lucide-react';

import { api } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatMarketplace } from '../../hooks/useIniciarChatMarketplace';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';
import { formatearPrecio, formatearTiempoRelativo } from '../../utils/marketplace';
import type {
    ArticuloFeed,
    ArticuloMarketplaceDetalle,
    CondicionArticulo,
} from '../../types/marketplace';

// =============================================================================
// MAPPINGS
// =============================================================================

const ETIQUETA_CONDICION: Record<CondicionArticulo, string> = {
    nuevo: 'NUEVO',
    seminuevo: 'SEMINUEVO',
    usado: 'USADO',
    para_reparar: 'PARA REPARAR',
};

// =============================================================================
// PROPS
// =============================================================================

interface CardArticuloGuardadoProps {
    articulo: ArticuloFeed;
    onClick?: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardArticuloGuardado({
    articulo,
    onClick,
}: CardArticuloGuardadoProps) {
    // ─── Datos derivados ────────────────────────────────────────────────
    const fotos = articulo.fotos ?? [];
    const idxPortada = Math.max(
        0,
        Math.min(articulo.fotoPortadaIndex ?? 0, fotos.length - 1),
    );
    const fotoUrl = fotos[idxPortada] ?? fotos[0] ?? null;
    const tiempo = formatearTiempoRelativo(articulo.createdAt);
    const condicionLabel = articulo.condicion
        ? ETIQUETA_CONDICION[articulo.condicion]
        : 'ARTÍCULO';

    // Meta secundaria: zona aproximada (si existe) o ciudad como fallback.
    const metaSecundaria = articulo.zonaAproximada || articulo.ciudad;

    // ─── Botón ChatYA (mismo patrón que CardServicio en MisGuardados) ──
    // El item guardado NO trae info del vendedor. Hacemos fetch del
    // detalle on-demand cuando el usuario toca el botón. React Query
    // cachea el resultado por staleTime, así que repeticiones rápidas
    // no pegan al backend de nuevo.
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const qc = useQueryClient();
    const iniciarChatMarketplace = useIniciarChatMarketplace();
    // En MP el item guardado trae `usuarioId` (dueño del artículo).
    // Mostramos ChatYA cuando el usuario actual NO es ese dueño.
    const mostrarChatYA =
        !!articulo.usuarioId
        && usuarioActualId !== articulo.usuarioId;

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

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <article
            data-testid={`card-articulo-guardado-${articulo.id}`}
            onClick={onClick}
            // Hover: border rose-400 + lift + shadow (mismo patrón que los
            // otros 3 tabs de MisGuardados con `acentoHover='rose'`).
            // Border-2 desde el inicio para evitar "jump" al hover.
            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm transition-all duration-200 lg:hover:-translate-y-0.5 lg:hover:border-rose-400 lg:hover:shadow-md"
        >
            {/* ── Foto (aspect 4:3 igual que CardServicio) ──────────────── */}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {fotoUrl ? (
                    <img
                        src={fotoUrl}
                        alt={articulo.titulo}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-slate-100 via-slate-200 to-slate-300">
                        <ShoppingBag
                            className="h-12 w-12 text-slate-400"
                            strokeWidth={1.5}
                        />
                    </div>
                )}

                {/* Badge "condición" — esquina sup-RIGHT (top-LEFT lo ocupa
                    el BookmarkGlass del padre en MisGuardados). Color
                    teal-600 — identidad visual de MarketPlace. */}
                <span
                    aria-hidden
                    className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white shadow-sm backdrop-blur-sm"
                >
                    <ShoppingBag className="h-3 w-3" strokeWidth={2.5} />
                    {condicionLabel}
                </span>
            </div>

            {/* ── Info ─────────────────────────────────────────────────── */}
            <div className="p-3 flex flex-col flex-1">
                {/* Título: hasta 2 líneas. */}
                <h3 className="line-clamp-2 text-base lg:text-[15px] 2xl:text-base font-bold leading-tight text-slate-900">
                    {articulo.titulo}
                </h3>

                {/* Precio destacado — teal-700 (identidad visual MP). */}
                <p className="mt-2 truncate text-sm lg:text-[13px] 2xl:text-base font-bold tabular-nums text-teal-700">
                    {formatearPrecio(articulo.precio)}
                    {articulo.unidadVenta && (
                        <span className="ml-1 text-xs font-medium text-teal-700/80">
                            {articulo.unidadVenta}
                        </span>
                    )}
                </p>

                {/* Footer (meta + ChatYA) — empujado al fondo con mt-auto
                    para que la altura sea uniforme en el grid. */}
                <div className="mt-auto pt-2">
                    {/* Meta: zona/ciudad · tiempo. */}
                    <div className="flex items-center gap-1 text-xs lg:text-[11px] 2xl:text-xs font-medium leading-tight text-slate-600">
                        {metaSecundaria && (
                            <>
                                <MapPin
                                    className="h-3 w-3 shrink-0 text-slate-500"
                                    strokeWidth={2.5}
                                />
                                <span className="truncate">{metaSecundaria}</span>
                                <span aria-hidden className="text-slate-400">
                                    ·
                                </span>
                            </>
                        )}
                        <span className="shrink-0 tabular-nums">{tiempo}</span>
                    </div>

                    {/* Botón ChatYA alineado a la DERECHA. Solo visible
                        cuando el usuario actual no es el vendedor. */}
                    {mostrarChatYA && (
                        <div className="mt-2 flex justify-end">
                            <button
                                data-testid={`btn-chatya-card-mp-${articulo.id}`}
                                onClick={handleChatYA}
                                aria-label="Contactar al vendedor por ChatYA"
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                            >
                                <img
                                    src="/ChatYA.webp"
                                    alt="ChatYA"
                                    className="h-9 w-auto lg:h-9"
                                />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

export default CardArticuloGuardado;
