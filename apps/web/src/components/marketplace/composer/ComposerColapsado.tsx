/**
 * ComposerColapsado.tsx (MarketPlace)
 * =====================================
 * Pill colapsada del composer inline — vive arriba del feed de
 * MarketPlace. Al hacer clic llama `onExpandir`, que el orquestador
 * `<ComposerSection>` MP usa para cambiar a la variante expandida
 * (el `<ComposerMarketplace>` inline).
 *
 * Réplica del de Servicios con dos diferencias clave:
 *   - Placeholder fijo "¿Qué estás vendiendo hoy?" (no hay Ofrezco/Solicito).
 *   - Tonos teal en lugar de sky (identidad de la sección MP).
 *   - Set de íconos teaser ajustado: Fotos · Precio · Condición · Zona · Más.
 *
 * 2 variantes:
 *   - Sin borrador: pill estándar con placeholder.
 *   - Con borrador: muestra extracto + botones [Descartar] y [Continuar].
 *
 * En PC el composer se ESTIRA al alto del widget "Mis Publicaciones"
 * vecino (grid `lg:items-stretch`). Para llenar ese espacio visualmente
 * la variante por defecto agrega una fila de íconos abajo estilo
 * Facebook ("Agregar a tu publicación"). En móvil la fila se oculta y
 * el componente queda compacto.
 *
 * Ubicación: apps/web/src/components/marketplace/composer/ComposerColapsado.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Camera,
    ChevronRight,
    DollarSign,
    FileEdit,
    MapPin,
    MoreHorizontal,
    PenLine,
    Tags,
    Trash2,
} from 'lucide-react';
import {
    descartarBorradorMarketplace,
    leerBorradorMarketplace,
} from '../../../utils/borradorComposerMarketplace';
import {
    useEliminarFotoMarketplaceHuerfana,
    useMisArticulosMarketplace,
} from '../../../hooks/queries/useMarketplace';

interface ComposerColapsadoProps {
    /** Callback que el padre usa para expandir el composer in-place. */
    onExpandir: () => void;
    /** Cambia cuando el composer se cierra/publica/descarta — usado
     *  como tick para refrescar la lectura del borrador. */
    refreshKey: number;
}

const ICONOS_TEASER: { Icono: typeof Camera; label: string }[] = [
    { Icono: Camera, label: 'Fotos' },
    { Icono: DollarSign, label: 'Precio' },
    { Icono: Tags, label: 'Condición' },
    { Icono: MapPin, label: 'Zona' },
    { Icono: MoreHorizontal, label: 'Detalles' },
];

const PLACEHOLDER = '¿Qué estás vendiendo hoy?';

export function ComposerColapsado({
    onExpandir,
    refreshKey,
}: ComposerColapsadoProps) {
    const [borrador, setBorrador] = useState(() => leerBorradorMarketplace());
    const eliminarHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();

    // Conteo liviano de publicaciones activas del usuario — alimenta el
    // chip "Mis publicaciones · N" del header. `limit: 1` minimiza el
    // payload (solo necesitamos `paginacion.total`). React Query lo
    // cachea junto con las demás queries del módulo.
    const { data: activasData } = useMisArticulosMarketplace('activa', {
        limit: 1,
        offset: 0,
    });
    const totalActivas = activasData?.paginacion.total ?? 0;

    useEffect(() => {
        setBorrador(leerBorradorMarketplace());
    }, [refreshKey]);

    function descartar(e: React.MouseEvent) {
        e.stopPropagation();
        // Si el borrador tiene fotos subidas a R2, dispararlas como
        // huérfanas antes de borrar el localStorage. Fire-and-forget —
        // el backend valida reference count, así que si alguna ya está
        // en un artículo creado queda protegida.
        if (borrador && borrador.fotos.length > 0) {
            for (const url of borrador.fotos) {
                eliminarHuerfanaMutation.mutate(url);
            }
        }
        descartarBorradorMarketplace();
        setBorrador(null);
    }

    // ─── Variante con borrador ─────────────────────────────────────────
    // Mismo layout exacto que la variante por defecto (pill + chips), con
    // un overlay semitransparente que cubre TODO el card indicando que
    // hay un borrador en progreso. Por debajo se ve el composer "fantasma"
    // como pista de lo que continúa.
    if (borrador) {
        return (
            <div
                data-testid="composer-mp-colapsado-borrador"
                className="relative lg:h-full"
            >
                {/* ── Card base (idéntica a variante sin borrador) ───── */}
                <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm lg:h-full lg:flex lg:flex-col">
                    <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4">
                        <div
                            aria-hidden
                            className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700"
                        >
                            <PenLine
                                className="h-5 w-5 lg:h-6 lg:w-6"
                                strokeWidth={2.25}
                            />
                        </div>
                        <span className="flex-1 text-left text-[16px] lg:text-[18px] text-slate-500 font-medium truncate">
                            {PLACEHOLDER}
                        </span>
                        <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 lg:hidden"
                        >
                            <Camera className="h-5 w-5" strokeWidth={2} />
                        </span>
                    </div>
                    <div className="hidden lg:flex flex-1 flex-col justify-end p-3 pt-0">
                        <div className="rounded-xl border-2 border-slate-300 bg-slate-100 px-2 py-2">
                            <div className="flex items-center gap-1">
                                {ICONOS_TEASER.map((it) => (
                                    <span
                                        key={it.label}
                                        aria-hidden
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-slate-300 text-slate-800 text-[14px] font-semibold"
                                    >
                                        <it.Icono
                                            className="h-5 w-5"
                                            strokeWidth={2}
                                        />
                                        <span className="hidden 2xl:inline">
                                            {it.label}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Overlay sobre TODO el card ──────────────────────
                    Móvil: amber sólido (se distingue claro como
                    "borrador pendiente"). PC: tinte teal casi opaco
                    (`bg-teal-50/95 backdrop-blur-sm`) — NO amber porque
                    en PC el amber satura visualmente, y NO blanco
                    transparente porque dejaba los pills del fantasma
                    encimados con los botones del overlay. */}
                <div
                    role="button"
                    tabIndex={0}
                    data-testid="composer-mp-colapsado-continuar"
                    onClick={onExpandir}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onExpandir();
                        }
                    }}
                    className="absolute inset-0 rounded-2xl border-2 border-amber-400 lg:border-teal-300 bg-amber-50 lg:bg-teal-50/95 lg:backdrop-blur-sm flex items-center lg:flex-col lg:items-center lg:justify-center gap-2 px-3 py-2 lg:px-4 lg:py-3 lg:cursor-pointer hover:bg-amber-100/90 lg:hover:bg-teal-100/95"
                >
                    {/* Móvil: ícono + texto en una línea a la izquierda */}
                    <div className="flex-1 min-w-0 lg:flex-none">
                        <div className="inline-flex items-center gap-1.5 lg:gap-2 text-amber-800 lg:text-teal-800">
                            <FileEdit
                                className="h-4 w-4 lg:h-5 lg:w-5 shrink-0"
                                strokeWidth={2.25}
                            />
                            <span className="text-[14px] lg:text-[15px] font-semibold truncate">
                                Borrador en progreso
                            </span>
                        </div>
                    </div>

                    {/* Botones — PC: Descartar blanco neutro + Continuar
                        teal primario destacado (sólidos para que se lean
                        claros sobre el tinte teal del overlay). */}
                    <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 lg:mt-1">
                        <button
                            type="button"
                            aria-label="Descartar borrador"
                            data-testid="composer-mp-colapsado-descartar"
                            onClick={descartar}
                            className="inline-flex items-center justify-center gap-1.5 h-8 w-8 lg:h-9 lg:w-auto lg:px-3 rounded-lg border-2 border-amber-300 lg:border-slate-300 bg-white text-amber-800 lg:text-slate-700 text-[13px] font-semibold hover:border-red-400 hover:text-red-600 hover:bg-red-50 lg:cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                            <span className="hidden lg:inline">Descartar</span>
                        </button>
                        <button
                            type="button"
                            aria-label="Continuar publicación"
                            data-testid="composer-mp-colapsado-continuar-arrow"
                            onClick={(e) => {
                                e.stopPropagation();
                                onExpandir();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 h-8 w-8 lg:h-9 lg:w-auto lg:px-4 rounded-lg bg-linear-to-b from-amber-500 to-amber-600 lg:bg-linear-to-b lg:from-teal-500 lg:to-teal-700 text-white text-[13px] font-bold hover:brightness-110 shadow-sm lg:cursor-pointer"
                        >
                            <span className="hidden lg:inline">Continuar</span>
                            <ArrowRight
                                className="h-4 w-4"
                                strokeWidth={2.5}
                            />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Variante por defecto ──────────────────────────────────────────
    return (
        <div
            data-testid="composer-mp-colapsado"
            className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm lg:h-full lg:flex lg:flex-col"
        >
            {/* Pill arriba */}
            <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4">
                <div
                    aria-hidden
                    className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700"
                >
                    <PenLine
                        className="h-5 w-5 lg:h-6 lg:w-6"
                        strokeWidth={2.25}
                    />
                </div>
                <button
                    type="button"
                    data-testid="composer-mp-colapsado-input"
                    onClick={onExpandir}
                    className="flex-1 text-left text-[16px] lg:text-[18px] text-slate-500 font-medium hover:text-slate-700 lg:cursor-pointer truncate"
                >
                    {PLACEHOLDER}
                </button>
                {/* Chip atajo a Mis publicaciones (reemplaza al widget
                    lateral que existía antes). Solo aparece si el usuario
                    tiene alguna publicación activa. En móvil compacta a
                    ícono + contador; en PC expande el label completo. */}
                <MisPublicacionesChip total={totalActivas} />
                <button
                    type="button"
                    aria-label="Agregar fotos"
                    data-testid="composer-mp-colapsado-camara"
                    onClick={onExpandir}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-teal-100 hover:text-teal-700 lg:cursor-pointer lg:hidden"
                >
                    <Camera className="h-5 w-5" strokeWidth={2} />
                </button>
            </div>

            {/* Spacer + fila de íconos teaser — solo PC, estira el alto. */}
            <div className="hidden lg:flex flex-1 flex-col justify-end p-3 pt-0">
                <div className="rounded-xl border-2 border-slate-200 bg-slate-100 px-2 py-2">
                    <div className="flex items-center gap-1">
                        {ICONOS_TEASER.map((it) => (
                            <button
                                key={it.label}
                                type="button"
                                onClick={onExpandir}
                                aria-label={it.label}
                                data-testid={`composer-mp-teaser-${it.label.toLowerCase()}`}
                                className="group flex-1 flex items-center justify-center px-3 py-2 rounded-full bg-white border-2 border-slate-300 text-slate-800 hover:text-teal-700 hover:border-teal-500 lg:cursor-pointer text-[14px] font-semibold"
                            >
                                <span className="inline-flex items-center gap-2 transition-transform duration-150 group-hover:scale-110">
                                    <it.Icono
                                        className="h-5 w-5"
                                        strokeWidth={2}
                                    />
                                    <span className="hidden 2xl:inline">
                                        {it.label}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

/**
 * Chip atajo a `/mis-publicaciones`. Reemplaza al widget lateral
 * `MisArticulosWidget` que existía en el primer cut del Sprint 9.2 — la
 * decisión final fue mantener el composer full-width al ancho del feed
 * y exponer el atajo como botón compacto dentro del header de la pill.
 *
 * Si el usuario no tiene publicaciones activas, no se renderiza nada
 * (evita ruido visual hasta que tenga al menos una publicación).
 */
function MisPublicacionesChip({ total }: { total: number }) {
    const navigate = useNavigate();
    if (total === 0) return null;
    return (
        <button
            type="button"
            data-testid="composer-mp-colapsado-mis-pubs"
            aria-label={`Mis publicaciones · ${total} ${total === 1 ? 'activa' : 'activas'}`}
            onClick={(e) => {
                e.stopPropagation();
                navigate('/mis-publicaciones');
            }}
            className="inline-flex items-center gap-1.5 h-9 lg:h-10 px-2.5 lg:px-3.5 rounded-full bg-teal-50 border-2 border-teal-200 text-teal-800 text-[13px] lg:text-[14px] font-semibold hover:bg-teal-100 hover:border-teal-300 lg:cursor-pointer shrink-0"
        >
            <FileEdit className="h-4 w-4" strokeWidth={2.25} />
            <span className="hidden lg:inline">Mis publicaciones</span>
            <span className="tabular-nums">{total}</span>
            <ChevronRight
                className="h-3.5 w-3.5 hidden lg:inline"
                strokeWidth={2.5}
            />
        </button>
    );
}

export default ComposerColapsado;
