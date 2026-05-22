/**
 * CardNegocioCompacto.tsx
 * ========================
 * Card vertical compacta de negocio para colecciones personales (Mis Guardados).
 *
 * Distinta de:
 *  - `CardNegocio.tsx` (768 líneas) — card del feed principal con preview, drag,
 *    filtros, etc.
 *  - `CardNegocioDetallado.tsx` (478 líneas) — card horizontal glassmorphism con
 *    badges Abierto/distancia/calificación + acciones ChatYA + WhatsApp +
 *    "Ver Perfil" inline.
 *
 * Diseño deliberadamente sobrio para Guardados:
 *  - Layout vertical: foto/logo arriba (aspect 4:3) + panel info abajo.
 *  - Mismas dimensiones que las otras cards de Guardados (`max-w-[270px]`,
 *    `h-[280px]` móvil / `h-[340px]` lg+) para que el grid se vea uniforme
 *    al cambiar de tab Negocios → Ofertas → Marketplace.
 *  - Sin botones de acción dentro de la card. El bookmark glass es responsabilidad
 *    del padre (igual patrón que `CardArticulo` en Guardados Marketplace).
 *  - Click en cualquier parte → navega al perfil del negocio.
 *
 * Doc: `docs/estandares/PATRON_BUSCADOR_SECCION.md` no aplica. Patrón visual
 * heredado del grid de Guardados Marketplace + Ofertas.
 *
 * Ubicación: apps/web/src/components/negocios/CardNegocioCompacto.tsx
 */

import { MapPin, Star, Store } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';

// =============================================================================
// TIPOS
// =============================================================================

export interface CardNegocioCompactoProps {
    negocio: {
        sucursalId: string;
        usuarioId?: string;
        nombre: string;
        /** Logo / imagen de perfil del negocio. Se muestra como avatar pequeño
         *  junto al nombre. Si no hay galería, también se usa como foto grande
         *  (fallback). */
        imagenPerfil?: string;
        /** Foto de perfil de la SUCURSAL (avatar del chat). Fallback al logo. */
        fotoPerfil?: string | null;
        sucursalNombre?: string;
        esPrincipal?: boolean;
        totalSucursales?: number;
        /** Galería del negocio. Si tiene fotos, la primera se usa como foto
         *  grande arriba (foto del local/fachada/producto). Si no hay,
         *  fallback a `imagenPerfil` o gradient con ícono. */
        galeria?: Array<{ url: string; titulo?: string }>;
        estaAbierto?: boolean | null;
        distanciaKm?: number | null;
        calificacionPromedio?: string | number;
        totalCalificaciones?: number;
    };
    onClick: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Iniciales del nombre del negocio para fallback del avatar (max 2 letras). */
function obtenerIniciales(nombre: string): string {
    return nombre
        .split(' ')
        .filter((p) => p.length > 0)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardNegocioCompacto({ negocio, onClick }: CardNegocioCompactoProps) {
    const {
        nombre,
        imagenPerfil,
        galeria,
        estaAbierto,
        usuarioId,
        calificacionPromedio,
    } = negocio;

    // Foto grande: prioridad galería (foto del local) → imagenPerfil (logo)
    // → gradient con ícono. La idea es que cuando hay foto del local se vea
    // distinta del logo pequeño que va al lado del nombre.
    const fotoGrande = galeria?.[0]?.url ?? imagenPerfil ?? null;

    // Rating como número (el backend a veces lo manda como string Decimal).
    const rating =
        calificacionPromedio !== undefined && calificacionPromedio !== null
            ? Number(calificacionPromedio)
            : null;
    const tieneRating = rating !== null && !Number.isNaN(rating) && rating > 0;

    // Distancia formateada (m o km).
    const distanciaTexto =
        negocio.distanciaKm !== null && negocio.distanciaKm !== undefined
            ? negocio.distanciaKm < 1
                ? `${Math.round(negocio.distanciaKm * 1000)} m`
                : `${negocio.distanciaKm.toFixed(1)} km`
            : null;

    // Handler ChatYA — mismo patrón que `CardNegocioDetallado.handleChat`.
    // Solo se muestra el botón si tenemos `usuarioId` (sin él no hay con quién
    // crear la conversación).
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);
    const handleChatYA = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!usuarioId) return;
        // Sufijo de sucursal — mismo criterio del header del chat: solo si >1
        // sucursales, y para la principal usar "Matriz" en lugar del nombre del
        // negocio (que sería duplicado en el header).
        const sucursalParaHeader =
            (negocio.totalSucursales ?? 1) > 1
                ? (negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre)
                : undefined;
        // Avatar: foto de perfil de la SUCURSAL (no el logo del negocio).
        // Fallback al logo si la sucursal aún no tiene foto subida.
        const avatarSucursal = negocio.fotoPerfil ?? imagenPerfil ?? null;
        abrirChatTemporal({
            id: `temp_${Date.now()}`,
            otroParticipante: {
                id: usuarioId,
                nombre,
                apellidos: '',
                avatarUrl: avatarSucursal,
                negocioNombre: nombre,
                negocioLogo: avatarSucursal ?? undefined,
                sucursalNombre: sucursalParaHeader || undefined,
            },
            datosCreacion: {
                participante2Id: usuarioId,
                participante2Modo: 'comercial',
                participante2SucursalId: negocio.sucursalId,
                contextoTipo: 'negocio',
            },
        });
        abrirChatYA();
    };

    return (
        <article
            data-testid={`card-negocio-compacto-${negocio.sucursalId}`}
            onClick={onClick}
            className="group relative flex h-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-300 bg-white lg:h-[340px] lg:hover:border-rose-400 lg:hover:shadow-md"
        >
            {/* ── Foto grande del negocio ──────────────────────────────────── */}
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-200">
                {fotoGrande ? (
                    <img
                        src={fotoGrande}
                        alt={nombre}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
                        <Store className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
                    </div>
                )}

                {/* Sprint 9.3 (iteración):
                      - Tamaños intermedios entre el original (`text-xs` con
                        escalado lg) y el ultra-compacto (`text-[11px]`):
                        `text-xs` (12px) uniforme + `px-2.5 py-1` + iconos
                        `h-3.5 w-3.5` + `gap-1.5`.
                      - Icono MapPin agregado al badge de distancia
                        (igualando el patrón del CardServicio).
                      - Posiciones inf intercambiadas: rating ahora
                        inf-IZQ, distancia inf-DER (antes era al revés). */}

                {/* Pill de estado Abierto/Cerrado — esquina sup-der */}
                {estaAbierto !== null && estaAbierto !== undefined && (
                    <span
                        className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur ${
                            estaAbierto
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-900/70 text-white'
                        }`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                estaAbierto ? 'bg-white' : 'bg-slate-300'
                            }`}
                        />
                        {estaAbierto ? 'Abierto' : 'Cerrado'}
                    </span>
                )}

                {/* Rating — esquina inf-IZQ sobre la foto */}
                {tieneRating && (
                    <span
                        data-testid={`card-negocio-rating-${negocio.sucursalId}`}
                        className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur"
                    >
                        <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            strokeWidth={2.5}
                        />
                        <span className="tabular-nums">{rating!.toFixed(1)}</span>
                    </span>
                )}

                {/* Distancia — esquina inf-DER sobre la foto, con icono
                    MapPin igual al patrón del badge distancia de CardServicio. */}
                {distanciaTexto && (
                    <span
                        data-testid={`card-negocio-distancia-${negocio.sucursalId}`}
                        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur"
                    >
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                        <span className="tabular-nums">{distanciaTexto}</span>
                    </span>
                )}
            </div>

            {/* ── Panel info abajo ─────────────────────────────────────────── */}
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 p-3 lg:gap-2">
                {/* Línea 1: avatar + nombre del negocio + subtítulo de sucursal
                    (Sprint 9.3 — iteración): se agregó una segunda línea con
                    el label de sucursal ("Matriz" si es la principal, o el
                    nombre de la sucursal secundaria) usando el mismo patrón
                    visual que CardServicio en MisGuardados.
                      - Nombre: `font-bold` (antes `font-semibold`).
                      - Sucursal: `text-xs slate-600 font-medium` debajo. */}
                {(() => {
                    // Label de sucursal: "Matriz" si esPrincipal o
                    // sucursalNombre coincide con convenciones, sino el
                    // nombre propio.
                    const labelSucursal = (() => {
                        if (negocio.esPrincipal) return 'Matriz';
                        if (negocio.sucursalNombre === 'Principal') return 'Matriz';
                        if (negocio.sucursalNombre
                            && negocio.sucursalNombre !== nombre) {
                            return negocio.sucursalNombre;
                        }
                        return 'Matriz';
                    })();
                    return (
                        <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                            {imagenPerfil ? (
                                <img
                                    src={imagenPerfil}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full border-2 border-slate-200 object-cover lg:h-10 lg:w-10"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-linear-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 lg:h-10 lg:w-10 lg:text-sm">
                                    {obtenerIniciales(nombre) || <Store className="h-4 w-4" strokeWidth={2} />}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm lg:text-[14px] 2xl:text-base font-bold text-slate-900 leading-tight">
                                    {nombre}
                                </h3>
                                <div className="truncate text-xs lg:text-[11px] 2xl:text-xs font-medium text-slate-600 leading-tight mt-0.5">
                                    {labelSucursal}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Línea 2: logo de ChatYA clickeable, alineado a la derecha
                    (Sprint 9.3 — iteración: antes estaba centrado con
                    `mx-auto`, movido a `ml-auto` para que quede pegado al
                    borde derecho y deje libre el espacio a la izquierda).
                    Solo si hay usuarioId (sin él no podemos crear conversación).
                    Click stopPropagation para no triggear el onClick de la card. */}
                {usuarioId && (
                    <button
                        data-testid={`btn-chatya-card-negocio-${negocio.sucursalId}`}
                        onClick={handleChatYA}
                        aria-label={`Abrir ChatYA con ${nombre}`}
                        className="ml-auto inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                    >
                        <img
                            src="/ChatYA.webp"
                            alt="ChatYA"
                            className="h-9 w-auto lg:h-9"
                        />
                    </button>
                )}
            </div>
        </article>
    );
}

export default CardNegocioCompacto;
