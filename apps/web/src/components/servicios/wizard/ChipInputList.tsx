/**
 * ChipInputList.tsx
 * ===================
 * Input que captura una lista de strings cortos (zonas, skills, requisitos)
 * y los muestra como chips removibles. Usado en varios pasos del wizard:
 *   - Paso 2 → skills (servicio-persona)
 *   - Paso 2 → requisitos (vacante-empresa, futuro Sprint 8 BS)
 *   - Paso 3 → zonas aproximadas
 *
 * Comportamiento:
 *   - Enter o click en "Agregar" inserta el valor (con trim, dedupe case-insensitive)
 *   - Click en X de un chip lo elimina
 *   - Bloquea cuando alcanza `max`
 *
 * Ubicación: apps/web/src/components/servicios/wizard/ChipInputList.tsx
 */

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { notificar } from '../../../utils/notificaciones';

interface ChipInputListProps {
    label: string;
    helper: string;
    placeholder: string;
    items: string[];
    max: number;
    onChange: (items: string[]) => void;
    /** Prefijo del data-testid: `wizard-${testid}-input`, `-agregar`, `-chip-N` */
    testid: string;
}

export function ChipInputList({
    label,
    helper,
    placeholder,
    items,
    max,
    onChange,
    testid,
}: ChipInputListProps) {
    const [valor, setValor] = useState('');

    function agregar() {
        const v = valor.trim();
        if (!v) return;
        if (items.length >= max) {
            notificar.advertencia(`Máximo ${max} entradas.`);
            return;
        }
        if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
            notificar.info('Ya está en la lista.');
            return;
        }
        onChange([...items, v]);
        setValor('');
    }

    function eliminar(idx: number) {
        onChange(items.filter((_, i) => i !== idx));
    }

    return (
        <div>
            <label className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">
                {label}
            </label>
            <p className="text-[13px] lg:text-[12px] 2xl:text-sm text-slate-600 font-medium mb-2 lg:mb-2.5 leading-snug">
                {helper}
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    data-testid={`wizard-${testid}-input`}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            agregar();
                        }
                    }}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 lg:px-4 py-2.5 lg:py-3 text-base lg:text-sm 2xl:text-base text-slate-900 placeholder:text-slate-500 font-medium outline-none focus:border-sky-500"
                />
                <button
                    type="button"
                    data-testid={`wizard-${testid}-agregar`}
                    onClick={agregar}
                    className="px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] lg:text-[14px] 2xl:text-sm lg:cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Agregar
                </button>
            </div>
            {items.length > 0 && (
                <div className="mt-2.5 lg:mt-3 flex flex-wrap gap-1.5 lg:gap-2">
                    {items.map((it, idx) => (
                        <span
                            key={`${it}-${idx}`}
                            data-testid={`wizard-${testid}-chip-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full bg-slate-200 text-slate-800 text-[13px] lg:text-[12px] 2xl:text-sm font-semibold"
                        >
                            {it}
                            <button
                                type="button"
                                onClick={() => eliminar(idx)}
                                aria-label={`Quitar ${it}`}
                                className="w-4 h-4 grid place-items-center rounded-full hover:bg-slate-400/50 lg:cursor-pointer"
                            >
                                <X className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <p className="mt-1.5 lg:mt-2 text-[12px] lg:text-[11px] 2xl:text-sm text-slate-500 font-medium tabular-nums">
                {items.length}/{max}
            </p>
        </div>
    );
}

export default ChipInputList;
