/**
 * CardServicioReel.tsx
 * ======================
 * Card compacta de "Recién publicado" de Servicios — dos variantes, mismo
 * criterio que `CardArticulo.tsx` (MarketPlace, prop `variant`):
 *
 *  - `variant="compacta"` (default) — reel horizontal MÓVIL: foto arriba
 *    (aspect 4:3) + bloque blanco con título+precio + ChatYA centrado
 *    abajo. Ancho fijo `w-44 lg:w-52` para el scroll horizontal con snap.
 *  - `variant="glass"` — rail fijo vertical DESKTOP: foto full-bleed con
 *    gradiente, título+precio encima, barra de vidrio abajo con ChatYA +
 *    "Ver". Calcada 1:1 de `CardArticulo.tsx` (`variant='glass'`)/
 *    `CardNegocio.tsx` en su columna fija. `w-full` — vive dentro del
 *    contenedor `w-[300px] 2xl:w-[340px]` del rail.
 *
 * Universal para los 3 tipos de publicación (mismo criterio que
 * `CardServicio.tsx`): badge de tipo (VACANTE/SERVICIO/SOLICITUD) — en
 * `glass` reemplaza el badge "Recién" de MP, necesario aquí porque el
 * rail mezcla los 3 tipos y es la única señal visual para distinguirlos.
 *
 * Ubicación: apps/web/src/components/servicios/CardServicioReel.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, ChevronRight, ImageOff, Pencil, Search, Wrench } from 'lucide-react';
import { Icon, ICONOS } from '@/config/iconos';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIniciarChatServicio } from '../../hooks/useIniciarChatServicio';
import { useGuardados } from '../../hooks/useGuardados';
import { useSaveBubble } from '../../hooks/useSaveBubble';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';
import {
    formatearPrecioServicio,
    formatearPresupuesto,
    obtenerFotoPortada,
} from '../../utils/servicios';
import type { PublicacionFeed, PublicacionDetalle } from '../../types/servicios';

interface CardServicioReelProps {
    publicacion: PublicacionFeed;
    /** Default 'compacta' (reel horizontal móvil). 'glass' — rail fijo
     *  vertical de escritorio, foto full-bleed con gradiente. */
    variant?: 'compacta' | 'glass';
}

export function CardServicioReel({ publicacion, variant = 'compacta' }: CardServicioReelProps) {
    const navigate = useNavigate();

    const esVacante = publicacion.tipo === 'vacante-empresa';
    const esOfrece = publicacion.modo === 'ofrezco';

    const fotoPortada = obtenerFotoPortada(publicacion.fotos, publicacion.fotoPortadaIndex)
        ?? (esVacante ? publicacion.sucursalPortada ?? null : null);

    const precioMostrar = (esVacante || esOfrece)
        ? formatearPrecioServicio(publicacion.precio, { esVacante })
        : publicacion.presupuesto
          ? formatearPresupuesto(publicacion.presupuesto)
          : 'A tratar';
    const tonoPrecio = esVacante ? 'text-sky-700' : esOfrece ? 'text-emerald-700' : 'text-amber-700';
    // Gradiente del badge de precio (variant='glass') — mismo acento que
    // el badge de tipo: sky vacante, emerald servicio, amber solicito.
    const gradientePrecio = esVacante
        ? 'linear-gradient(135deg, #38bdf8, #0369a1)'
        : esOfrece
          ? 'linear-gradient(135deg, #34d399, #047857)'
          : 'linear-gradient(135deg, #fbbf24, #b45309)';

    const badgeTipo = esVacante
        ? { label: 'VACANTE', Icono: Briefcase, clase: 'bg-sky-600 text-white' }
        : esOfrece
          ? { label: 'SERVICIO', Icono: Wrench, clase: 'bg-emerald-600 text-white' }
          : { label: 'SOLICITUD', Icono: Search, clase: 'bg-amber-500 text-white' };

    const handleClickCard = () => {
        navigate(`/servicios/${publicacion.id}`);
    };

    // ChatYA — on-demand: `PublicacionFeed` no trae todo lo que pide
    // `useIniciarChatServicio` (necesita el detalle completo con oferente),
    // así que al presionar se hace fetch (cacheado por React Query, un
    // segundo click no vuelve a pegarle al backend). Mismo patrón que
    // `CardArticulo` (glass)/`CardServicio`.
    const usuarioActualId = useAuthStore((s) => s.usuario?.id ?? null);
    const qc = useQueryClient();
    const iniciarChatServicio = useIniciarChatServicio();
    // Vacantes se editan desde Business Studio, no desde aquí.
    const esPropia = !esVacante
        && !!publicacion.usuarioId
        && usuarioActualId === publicacion.usuarioId;
    const mostrarChatYA = !!publicacion.usuarioId
        && usuarioActualId !== publicacion.usuarioId;

    const handleEditarPropia = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/servicios?editar=${publicacion.id}`, { replace: true });
    };

    // Guardar — solo en variant='glass' (mismo criterio que CardArticulo/
    // CardNegocio en su columna fija). `PublicacionFeed` no trae el estado
    // de guardado por-usuario (solo el detalle lo tiene) — arranca en
    // `false` y se corrige solo tras el primer toggle, igual que cualquier
    // card que no reciba `initialGuardado` real.
    const { guardado, loading: guardadoLoading, toggleGuardado } = useGuardados({
        entityType: 'servicio',
        entityId: publicacion.id,
    });
    const { triggerSaveBubble, saveBubble } = useSaveBubble();
    const handleClickGuardar = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSaveBubble(e, guardado ? 'unsave' : 'save');
        toggleGuardado();
    };

    const handleChatYA = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            const detalle = await qc.fetchQuery({
                queryKey: queryKeys.servicios.publicacion(publicacion.id),
                queryFn: async (): Promise<PublicacionDetalle | null> => {
                    const response = await api.get<{
                        success: boolean;
                        data: PublicacionDetalle;
                    }>(`/servicios/publicaciones/${publicacion.id}`);
                    return response.data.success ? response.data.data : null;
                },
                staleTime: 60 * 1000,
            });
            if (!detalle) {
                notificar.error('No se pudo cargar la publicación');
                return;
            }
            await iniciarChatServicio(detalle);
        } catch {
            notificar.error('No se pudo iniciar el chat');
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // VARIANT GLASS — rail fijo desktop
    // ─────────────────────────────────────────────────────────────────────
    if (variant === 'glass') {
        return (
            <>
            {saveBubble}
            <article
                data-testid={`card-servicio-reel-${publicacion.id}`}
                onClick={handleClickCard}
                className="group relative h-60 @[96rem]:h-[220px] w-full cursor-pointer overflow-hidden rounded-2xl shadow-md transition-shadow duration-300 lg:hover:shadow-xl"
            >
                <div className="absolute inset-0 bg-slate-200">
                    {fotoPortada ? (
                        <img
                            src={fotoPortada}
                            alt={publicacion.titulo}
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
                    criterio que CardArticulo/CardNegocio). */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 32%, rgba(0,0,0,0.08) 55%, transparent 72%)',
                    }}
                />

                {/* Badge de tipo — reemplaza el badge "Recién" de MP: acá
                    hace falta distinguir VACANTE/SERVICIO/SOLICITUD porque
                    el rail mezcla los 3 tipos. */}
                <span
                    data-testid={`badge-tipo-reel-${publicacion.id}`}
                    className={`absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] 2xl:text-xs font-bold uppercase tracking-wide shadow-sm ${badgeTipo.clase}`}
                >
                    <badgeTipo.Icono className="h-3 w-3" strokeWidth={2.5} />
                    {badgeTipo.label}
                </span>

                {/* Guardar — esquina sup-der, calcado 1:1 de CardArticulo/CardNegocio. */}
                <button
                    type="button"
                    data-testid={`btn-guardar-reel-${publicacion.id}`}
                    onClick={handleClickGuardar}
                    disabled={guardadoLoading}
                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar publicación'}
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

                {/* Texto + barra de contacto — absolutos abajo, sobre el gradiente. */}
                <div className="absolute bottom-[3px] left-0 right-0 z-10 px-3 pb-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white drop-shadow-md">
                            {publicacion.titulo}
                        </span>
                        <span
                            className="shrink-0 rounded-full px-2.5 py-1 text-sm font-extrabold text-white shadow-sm"
                            style={{ background: gradientePrecio }}
                        >
                            {precioMostrar}
                        </span>
                    </div>

                    {/* Barra de vidrio — ChatYA (contacto rápido) + Ver.
                        Padding/tamaños calcados 1:1 de CardArticulo/CardNegocio. */}
                    <div className="mt-1 flex items-center justify-between rounded-[14px] border border-white/12 bg-white/10 py-1.5 pl-3.5 pr-[5px] backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            {mostrarChatYA && (
                                <button
                                    type="button"
                                    data-testid={`btn-chatya-card-servicio-reel-${publicacion.id}`}
                                    onClick={handleChatYA}
                                    aria-label="Contactar por ChatYA"
                                    className="flex cursor-pointer items-center border-0 bg-transparent p-0 active:opacity-70"
                                >
                                    <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                                </button>
                            )}
                            {esPropia && (
                                <button
                                    type="button"
                                    data-testid={`btn-editar-propia-reel-${publicacion.id}`}
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
                            data-testid={`btn-ver-reel-${publicacion.id}`}
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

    // ─────────────────────────────────────────────────────────────────────
    // VARIANT COMPACTA (default) — reel horizontal móvil
    // ─────────────────────────────────────────────────────────────────────
    return (
        <article
            data-testid={`card-servicio-reel-${publicacion.id}`}
            onClick={handleClickCard}
            className="group w-44 shrink-0 cursor-pointer snap-start overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-transform hover:scale-[1.02] lg:w-52 lg:cursor-pointer"
        >
            {/* Foto */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={publicacion.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <badgeTipo.Icono className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                )}

                <span
                    aria-hidden
                    className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-sm ${badgeTipo.clase}`}
                >
                    <badgeTipo.Icono className="h-3 w-3" strokeWidth={2.5} />
                    {badgeTipo.label}
                </span>
            </div>

            {/* Info: título + precio */}
            <div className="px-2.5 pt-2.5 text-left">
                <h3 className="truncate text-sm font-bold leading-tight text-slate-900">
                    {publicacion.titulo}
                </h3>
                <div className={`truncate text-base font-bold leading-tight tabular-nums ${tonoPrecio}`}>
                    {precioMostrar}
                </div>
            </div>

            {/* ChatYA — centrado horizontalmente */}
            {mostrarChatYA && (
                <div className="flex justify-center px-2.5 pb-2.5 pt-1.5">
                    <button
                        type="button"
                        data-testid={`btn-chatya-card-servicio-reel-${publicacion.id}`}
                        onClick={handleChatYA}
                        aria-label="Contactar por ChatYA"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                    >
                        <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                    </button>
                </div>
            )}
        </article>
    );
}

export default CardServicioReel;
