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

import { Store, Star } from 'lucide-react';
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
        abrirChatTemporal({
            id: `temp_${Date.now()}`,
            otroParticipante: {
                id: usuarioId,
                nombre,
                apellidos: '',
                avatarUrl: imagenPerfil ?? null,
                negocioNombre: nombre,
                negocioLogo: imagenPerfil,
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

                {/* Pill de estado Abierto/Cerrado — solo cuando viene del backend
                    (puede ser null si no hay horario configurado). */}
                {estaAbierto !== null && estaAbierto !== undefined && (
                    <span
                        className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold shadow-md backdrop-blur lg:right-3 lg:top-3 lg:gap-1.5 lg:px-3 lg:py-1 lg:text-sm ${
                            estaAbierto
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-900/70 text-white'
                        }`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full lg:h-2 lg:w-2 ${
                                estaAbierto ? 'bg-white' : 'bg-slate-300'
                            }`}
                        />
                        {estaAbierto ? 'Abierto' : 'Cerrado'}
                    </span>
                )}

                {/* Distancia abajo-izq sobre la foto */}
                {distanciaTexto && (
                    <span
                        data-testid={`card-negocio-distancia-${negocio.sucursalId}`}
                        className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-bold text-white shadow-md backdrop-blur lg:bottom-3 lg:left-3 lg:px-3 lg:py-1 lg:text-sm"
                    >
                        {distanciaTexto}
                    </span>
                )}

                {/* Rating abajo-der sobre la foto */}
                {tieneRating && (
                    <span
                        data-testid={`card-negocio-rating-${negocio.sucursalId}`}
                        className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-bold text-white shadow-md backdrop-blur lg:bottom-3 lg:right-3 lg:gap-1.5 lg:px-3 lg:py-1 lg:text-sm"
                    >
                        <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400 lg:h-4 lg:w-4"
                            strokeWidth={2}
                        />
                        <span>{rating!.toFixed(1)}</span>
                    </span>
                )}
            </div>

            {/* ── Panel info abajo ─────────────────────────────────────────── */}
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 p-3 lg:gap-2">
                {/* Línea 1: logo (avatar) + nombre del negocio */}
                <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                    {imagenPerfil ? (
                        <img
                            src={imagenPerfil}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover lg:h-10 lg:w-10"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600 lg:h-10 lg:w-10 lg:text-sm">
                            {obtenerIniciales(nombre) || <Store className="h-4 w-4" strokeWidth={2} />}
                        </div>
                    )}
                    <h3 className="truncate text-sm font-semibold text-slate-900 lg:text-lg">
                        {nombre}
                    </h3>
                </div>

                {/* Línea 2: logo de ChatYA clickeable, centrado horizontalmente.
                    Solo si hay usuarioId (sin él no podemos crear conversación).
                    Click stopPropagation para no triggear el onClick de la card. */}
                {usuarioId && (
                    <button
                        data-testid={`btn-chatya-card-negocio-${negocio.sucursalId}`}
                        onClick={handleChatYA}
                        aria-label={`Abrir ChatYA con ${nombre}`}
                        className="mx-auto inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
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
