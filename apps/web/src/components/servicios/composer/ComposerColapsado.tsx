/**
 * ComposerColapsado.tsx
 * =======================
 * Pill colapsada del composer inline — vive arriba del feed de
 * Servicios. Al hacer clic llama `onExpandir`, que el orquestador
 * `<ComposerSection>` usa para cambiar a la variante expandida (el
 * `<ComposerServicios>` inline).
 *
 * 2 variantes:
 *   - Sin borrador: pill estándar con placeholder según modo.
 *   - Con borrador: muestra extracto + botones [Descartar] y [Continuar].
 *
 * En PC el composer se ESTIRA al alto del widget "Tus publicaciones"
 * vecino (grid `lg:items-stretch`). Para llenar ese espacio visualmente
 * la variante por defecto agrega una fila de íconos abajo estilo
 * Facebook ("Agregar a tu publicación"). En móvil la fila se oculta y
 * el componente queda compacto.
 *
 * Ubicación: apps/web/src/components/servicios/composer/ComposerColapsado.tsx
 */

import { useEffect, useState } from 'react';
import {
    ArrowRight,
    Camera,
    DollarSign,
    FileEdit,
    MapPin,
    PenLine,
    Tags,
    Trash2,
    Wrench,
} from 'lucide-react';
import {
    descartarBorradorServicios,
    leerBorradorServicios,
} from '../../../utils/borradorComposerServicios';
import { useEliminarFotoServicioHuerfana } from '../../../hooks/queries/useServicios';
import type { ModoServicio } from '../../../types/servicios';

interface ComposerColapsadoProps {
    /** Modo Ofrezco/Solicito como contexto del placeholder. */
    modoServiciosDefault: ModoServicio | null;
    /** Callback que el padre usa para expandir el composer in-place. */
    onExpandir: () => void;
    /** Cambia cuando el composer se cierra/publica/descarta — usado
     *  como tick para refrescar la lectura del borrador. */
    refreshKey: number;
}

const ICONOS_TEASER: { Icono: typeof Camera; label: string }[] = [
    { Icono: Camera, label: 'Fotos' },
    { Icono: Tags, label: 'Categoría' },
    { Icono: Wrench, label: 'Modalidad' },
    { Icono: DollarSign, label: 'Tarifa' },
    { Icono: MapPin, label: 'Zonas' },
];

export function ComposerColapsado({
    modoServiciosDefault,
    onExpandir,
    refreshKey,
}: ComposerColapsadoProps) {
    const [borrador, setBorrador] = useState(() => leerBorradorServicios());
    const eliminarHuerfanaMutation = useEliminarFotoServicioHuerfana();

    useEffect(() => {
        setBorrador(leerBorradorServicios());
    }, [refreshKey]);

    const placeholder =
        modoServiciosDefault === 'solicito'
            ? '¿Qué necesitas hoy?'
            : modoServiciosDefault === 'ofrezco'
              ? '¿Qué servicio ofreces?'
              : '¿Qué ofreces o necesitas hoy?';

    function descartar(e: React.MouseEvent) {
        e.stopPropagation();
        // Si el borrador tiene fotos subidas a R2, dispararlas como
        // huérfanas antes de borrar el localStorage. Fire-and-forget —
        // el backend valida reference count, así que si alguna ya está
        // en una publicación creada queda protegida.
        if (borrador && borrador.fotos.length > 0) {
            for (const url of borrador.fotos) {
                eliminarHuerfanaMutation.mutate(url);
            }
        }
        descartarBorradorServicios();
        setBorrador(null);
    }

    // ─── Variante con borrador ─────────────────────────────────────────
    // Mismo layout exacto que la variante por defecto (pill + chips), con
    // un overlay semitransparente que cubre TODO el card indicando que
    // hay una publicación en progreso. Por debajo se ve el composer
    // "fantasma" como pista de lo que continúa.
    if (borrador) {
        const resumen =
            borrador.titulo.trim() || borrador.descripcion.trim();
        return (
            <div
                data-testid="composer-colapsado-borrador"
                className="relative lg:h-full"
            >
                {/* ── Card base (idéntica a variante sin borrador) ───── */}
                <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm lg:h-full lg:flex lg:flex-col">
                    <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4">
                        <div
                            aria-hidden
                            className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"
                        >
                            <PenLine
                                className="h-5 w-5 lg:h-6 lg:w-6"
                                strokeWidth={2.25}
                            />
                        </div>
                        <span className="flex-1 text-left text-[16px] lg:text-[18px] text-slate-500 font-medium truncate">
                            {placeholder}
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
                    "borrador pendiente"). PC: blanco transparente para
                    dejar ver el composer fantasma detrás. */}
                <div
                    role="button"
                    tabIndex={0}
                    data-testid="composer-colapsado-continuar"
                    onClick={onExpandir}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onExpandir();
                        }
                    }}
                    className="absolute inset-0 rounded-2xl border-2 border-amber-400 lg:border-slate-300 bg-amber-50 lg:bg-white/40 flex items-center lg:flex-col lg:items-center lg:justify-center gap-2 px-3 py-2 lg:px-4 lg:py-3 lg:cursor-pointer hover:bg-amber-100/90 lg:hover:bg-white/60"
                >
                    {/* Móvil: ícono + texto en una línea a la izquierda */}
                    <div className="flex-1 min-w-0 lg:flex-none">
                        <div className="inline-flex items-center gap-1.5 lg:gap-2 text-amber-800 lg:text-slate-700">
                            <FileEdit
                                className="h-4 w-4 lg:h-5 lg:w-5 shrink-0"
                                strokeWidth={2.25}
                            />
                            <span className="text-[14px] lg:text-[15px] font-semibold truncate">
                                Borrador en progreso
                            </span>
                        </div>
                        {resumen && (
                            <div className="hidden lg:block text-[15px] lg:text-[16px] font-bold text-slate-800 text-center line-clamp-2 px-4 mt-1 drop-shadow-sm">
                                {resumen}
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 lg:mt-1">
                        <button
                            type="button"
                            aria-label="Descartar borrador"
                            data-testid="composer-colapsado-descartar"
                            onClick={descartar}
                            className="inline-flex items-center justify-center gap-1.5 h-8 w-8 lg:h-9 lg:w-auto lg:px-3 rounded-lg border-2 border-amber-300 lg:border-slate-300 bg-white lg:bg-white/60 text-amber-800 lg:text-slate-700 text-[13px] font-semibold hover:border-red-400 hover:text-red-600 hover:bg-red-50 lg:hover:bg-white/90 lg:cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                            <span className="hidden lg:inline">Descartar</span>
                        </button>
                        <button
                            type="button"
                            aria-label="Continuar publicación"
                            data-testid="composer-colapsado-continuar-arrow"
                            onClick={(e) => {
                                e.stopPropagation();
                                onExpandir();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 h-8 w-8 lg:h-9 lg:w-auto lg:px-4 rounded-lg bg-linear-to-b from-amber-500 to-amber-600 lg:bg-none lg:border-2 lg:border-slate-300 lg:bg-white/60 text-white lg:text-slate-800 text-[13px] font-bold hover:brightness-110 lg:hover:brightness-100 lg:hover:bg-white/90 lg:hover:border-slate-400 shadow-sm lg:shadow-none lg:cursor-pointer"
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
            data-testid="composer-colapsado"
            className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm lg:h-full lg:flex lg:flex-col"
        >
            {/* Pill arriba */}
            <div className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-4">
                <div
                    aria-hidden
                    className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"
                >
                    <PenLine
                        className="h-5 w-5 lg:h-6 lg:w-6"
                        strokeWidth={2.25}
                    />
                </div>
                <button
                    type="button"
                    data-testid="composer-colapsado-input"
                    onClick={onExpandir}
                    className="flex-1 text-left text-[16px] lg:text-[18px] text-slate-500 font-medium hover:text-slate-700 lg:cursor-pointer truncate"
                >
                    {placeholder}
                </button>
                <button
                    type="button"
                    aria-label="Agregar fotos"
                    data-testid="composer-colapsado-camara"
                    onClick={onExpandir}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-sky-100 hover:text-sky-700 lg:cursor-pointer lg:hidden"
                >
                    <Camera className="h-5 w-5" strokeWidth={2} />
                </button>
            </div>

            {/* Spacer + fila de íconos teaser — solo PC, estira el alto.
                Cada ícono actúa como un atajo: al click expande el composer.
                Labels visibles en 2xl+. */}
            <div className="hidden lg:flex flex-1 flex-col justify-end p-3 pt-0">
                <div className="rounded-xl border-2 border-slate-200 bg-slate-100 px-2 py-2">
                    <div className="flex items-center gap-1">
                        {ICONOS_TEASER.map((it) => (
                            <button
                                key={it.label}
                                type="button"
                                onClick={onExpandir}
                                aria-label={it.label}
                                data-testid={`composer-teaser-${it.label.toLowerCase()}`}
                                className="group flex-1 flex items-center justify-center px-3 py-2 rounded-full bg-white border-2 border-slate-300 text-slate-800 hover:text-sky-700 hover:border-sky-500 lg:cursor-pointer text-[14px] font-semibold"
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

export default ComposerColapsado;
