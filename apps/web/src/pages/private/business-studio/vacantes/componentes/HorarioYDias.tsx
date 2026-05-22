/**
 * HorarioYDias.tsx
 * =================
 * Selector estructurado de horario laboral por bloques. Reemplaza el input
 * de texto libre del wizard de Vacantes.
 *
 * Cada bloque = un grupo de días que comparten el mismo horario. Permite
 * agregar múltiples bloques para casos como "L-V 9-18 | Sábado 10-14".
 *
 * Los días seleccionados en un bloque se deshabilitan en los otros (un día
 * solo puede pertenecer a UN horario). Al cambiar, emite:
 *   - horario: string serializado para BD (`varchar(150)`)
 *   - dias: union de todos los días con horario asignado
 *
 * Formato del string serializado:
 *   - 1 bloque:   "L · M · X · J · V de 09:00 a 18:00"
 *   - N bloques:  "L · M · X · J · V de 09:00 a 18:00 | S de 10:00 a 14:00"
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/HorarioYDias.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { DIAS_ORDEN, DIA_CORTO } from './helpers';
import type { DiaSemanaCodigo } from '../../../../../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Horarios disponibles en el dropdown: cada 30min de 06:00 a 23:30. */
const HORAS_OPCIONES: { value: string; label: string }[] = (() => {
    const arr: { value: string; label: string }[] = [];
    for (let h = 6; h <= 23; h++) {
        for (const m of [0, 30]) {
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            const v = `${hh}:${mm}`;
            arr.push({ value: v, label: v });
        }
    }
    return arr;
})();

// =============================================================================
// TIPOS
// =============================================================================

interface BloqueHorario {
    id: string;
    dias: DiaSemanaCodigo[];
    horaInicio: string;
    horaFin: string;
}

interface ValorHorario {
    /** String serializado para guardar en BD. */
    horario: string;
    /** Unión de todos los días seleccionados en cualquier bloque. */
    dias: DiaSemanaCodigo[];
}

interface HorarioYDiasProps {
    value: ValorHorario;
    onChange: (valor: ValorHorario) => void;
}

// =============================================================================
// SERIALIZACIÓN / PARSEO
// =============================================================================

function serializarBloques(bloques: BloqueHorario[]): ValorHorario {
    const bloquesValidos = bloques.filter(
        (b) => b.dias.length > 0 && b.horaInicio && b.horaFin,
    );
    const partes = bloquesValidos.map((b) => {
        const diasStr = DIAS_ORDEN.filter((d) => b.dias.includes(d))
            .map((d) => DIA_CORTO[d])
            .join(' · ');
        return `${diasStr} de ${b.horaInicio} a ${b.horaFin}`;
    });
    const diasUnion = Array.from(
        new Set(bloquesValidos.flatMap((b) => b.dias)),
    );
    return {
        horario: partes.join(' | '),
        dias: DIAS_ORDEN.filter((d) => diasUnion.includes(d)),
    };
}

/**
 * Intenta parsear el string de horario al formato estructurado. Si no matchea
 * el formato esperado, devuelve un bloque por defecto con el texto crudo
 * descartado (el usuario llena de cero).
 */
function parsearHorario(
    horario: string,
    diasFallback: DiaSemanaCodigo[],
): BloqueHorario[] {
    const partes = horario.split('|').map((p) => p.trim()).filter(Boolean);
    const bloques: BloqueHorario[] = [];

    // Mapeo retro-compatible: acepta tanto el formato nuevo (3 letras
    // "Lun", "Mar", "Mié", etc. — Sprint 9.3+) como el legacy de 1
    // letra ("L", "M", "X", "J", "V", "S", "D") usado en vacantes
    // creadas antes del cambio. El parser detecta cuál es por el largo
    // del token y mapea al código interno.
    const CODIGO_POR_LETRA: Record<string, DiaSemanaCodigo> = {
        // Formato nuevo — Sprint 9.3
        Lun: 'lun', Mar: 'mar', Mié: 'mie', Jue: 'jue',
        Vie: 'vie', Sáb: 'sab', Dom: 'dom',
        // Formato legacy — 1 letra con "X" para miércoles (vacantes
        // creadas antes del cambio Sprint 9.3, mantener para no romper)
        L: 'lun', M: 'mar', X: 'mie', J: 'jue',
        V: 'vie', S: 'sab', D: 'dom',
    };

    for (const parte of partes) {
        const match = parte.match(/^(.+?) de (\d{2}:\d{2}) a (\d{2}:\d{2})$/);
        if (!match) continue;
        const [, diasStr, ini, fin] = match;
        const dias = diasStr
            .split('·')
            .map((s) => s.trim())
            .map((letra) => CODIGO_POR_LETRA[letra])
            .filter((d): d is DiaSemanaCodigo => Boolean(d));
        if (dias.length > 0) {
            bloques.push({
                id: `b-${bloques.length}`,
                dias,
                horaInicio: ini,
                horaFin: fin,
            });
        }
    }

    if (bloques.length === 0) {
        // Sin match: bloque vacío hidratado con los días del fallback (si los hay)
        return [
            {
                id: 'b-0',
                dias: diasFallback,
                horaInicio: diasFallback.length > 0 ? '09:00' : '',
                horaFin: diasFallback.length > 0 ? '18:00' : '',
            },
        ];
    }

    return bloques;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function HorarioYDias({ value, onChange }: HorarioYDiasProps) {
    const [bloques, setBloques] = useState<BloqueHorario[]>(() =>
        parsearHorario(value.horario, value.dias),
    );

    // Re-hidratar si cambia el value desde fuera (ej. abrir wizard en modo edición)
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (hidratadoRef.current) return;
        hidratadoRef.current = true;
        setBloques(parsearHorario(value.horario, value.dias));
    }, [value.horario, value.dias]);

    // Emitir cambios al padre cada vez que cambian los bloques
    useEffect(() => {
        onChange(serializarBloques(bloques));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bloques]);

    const diasOcupadosPorIdx = useMemo(() => {
        return bloques.map((_, idx) =>
            bloques
                .filter((_, i) => i !== idx)
                .flatMap((b) => b.dias),
        );
    }, [bloques]);

    const actualizarBloque = (idx: number, parche: Partial<BloqueHorario>) => {
        setBloques((prev) =>
            prev.map((b, i) => (i === idx ? { ...b, ...parche } : b)),
        );
    };

    const toggleDia = (idx: number, d: DiaSemanaCodigo) => {
        setBloques((prev) =>
            prev.map((b, i) => {
                if (i !== idx) return b;
                const tiene = b.dias.includes(d);
                return {
                    ...b,
                    dias: tiene ? b.dias.filter((x) => x !== d) : [...b.dias, d],
                };
            }),
        );
    };

    const agregarBloque = () => {
        setBloques((prev) => [
            ...prev,
            {
                id: `b-${Date.now()}`,
                dias: [],
                horaInicio: '09:00',
                horaFin: '18:00',
            },
        ]);
    };

    const eliminarBloque = (idx: number) => {
        setBloques((prev) => prev.filter((_, i) => i !== idx));
    };

    const diasDisponiblesTotal = useMemo(
        () =>
            DIAS_ORDEN.filter(
                (d) => !bloques.flatMap((b) => b.dias).includes(d),
            ),
        [bloques],
    );

    return (
        // Sprint 9.3: space-y-3 → space-y-4 entre los bloques de horario
        // y el botón "Agregar otro" para evitar la sensación apretada
        // cuando hay 2+ bloques apilados.
        <div className="space-y-4" data-testid="horario-y-dias">
            {bloques.map((bloque, idx) => (
                <BloqueRow
                    key={bloque.id}
                    bloque={bloque}
                    diasOcupados={diasOcupadosPorIdx[idx]}
                    mostrarEliminar={bloques.length > 1}
                    onToggleDia={(d) => toggleDia(idx, d)}
                    onCambiarHoraInicio={(v) =>
                        actualizarBloque(idx, { horaInicio: v })
                    }
                    onCambiarHoraFin={(v) =>
                        actualizarBloque(idx, { horaFin: v })
                    }
                    onEliminar={() => eliminarBloque(idx)}
                    indice={idx}
                />
            ))}

            {diasDisponiblesTotal.length > 0 && (
                <button
                    type="button"
                    onClick={agregarBloque}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white border-2 border-dashed border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-100 hover:border-slate-400"
                    data-testid="btn-agregar-bloque-horario"
                >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    Agregar otro horario para días distintos
                </button>
            )}
        </div>
    );
}

// =============================================================================
// BLOQUE INDIVIDUAL
// =============================================================================

function BloqueRow({
    bloque,
    diasOcupados,
    mostrarEliminar,
    onToggleDia,
    onCambiarHoraInicio,
    onCambiarHoraFin,
    onEliminar,
    indice,
}: {
    bloque: BloqueHorario;
    diasOcupados: DiaSemanaCodigo[];
    mostrarEliminar: boolean;
    onToggleDia: (d: DiaSemanaCodigo) => void;
    onCambiarHoraInicio: (v: string) => void;
    onCambiarHoraFin: (v: string) => void;
    onEliminar: () => void;
    indice: number;
}) {
    const horaFinInvalida =
        bloque.horaInicio &&
        bloque.horaFin &&
        bloque.horaFin <= bloque.horaInicio;

    return (
        <div className="rounded-lg border-2 border-slate-300 bg-white p-3 space-y-2.5">
            {/* Chips de días */}
            <div className="flex gap-1.5">
                {DIAS_ORDEN.map((d) => {
                    const activo = bloque.dias.includes(d);
                    const deshabilitado = diasOcupados.includes(d);
                    return (
                        <button
                            key={d}
                            type="button"
                            onClick={() => !deshabilitado && onToggleDia(d)}
                            disabled={deshabilitado}
                            className={
                                'flex-1 h-10 rounded-lg text-sm font-bold border-2 lg:cursor-pointer disabled:cursor-not-allowed ' +
                                (activo
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : deshabilitado
                                        ? 'bg-slate-200 text-slate-400 border-slate-300'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500')
                            }
                            title={
                                deshabilitado
                                    ? 'Este día ya está en otro horario'
                                    : undefined
                            }
                            data-testid={`bloque-${indice}-dia-${d}`}
                        >
                            {DIA_CORTO[d]}
                        </button>
                    );
                })}
            </div>

            {/* Dropdowns hora inicio/fin + botón eliminar */}
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <CustomSelect
                        value={bloque.horaInicio || null}
                        onChange={onCambiarHoraInicio}
                        options={HORAS_OPCIONES}
                        placeholder="Hora inicio"
                        testId={`bloque-${indice}-hora-inicio`}
                    />
                </div>
                <span className="text-sm font-semibold text-slate-600 shrink-0">
                    a
                </span>
                <div className="flex-1">
                    <CustomSelect
                        value={bloque.horaFin || null}
                        onChange={onCambiarHoraFin}
                        options={HORAS_OPCIONES}
                        placeholder="Hora fin"
                        testId={`bloque-${indice}-hora-fin`}
                    />
                </div>
                {mostrarEliminar && (
                    <button
                        type="button"
                        onClick={onEliminar}
                        className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 lg:cursor-pointer shrink-0"
                        aria-label="Eliminar bloque"
                        data-testid={`bloque-${indice}-eliminar`}
                    >
                        <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                )}
            </div>

            {horaFinInvalida && (
                <p className="text-sm lg:text-[11px] 2xl:text-sm text-rose-600 font-medium">
                    La hora fin debe ser mayor que la hora inicio.
                </p>
            )}
        </div>
    );
}
