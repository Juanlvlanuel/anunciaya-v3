/**
 * ChipInputList.tsx (composer)
 * ==============================
 * Input + chips para listas cortas (zonas, skills, requisitos). Esta es
 * la versión del composer — el wizard original se eliminó en Fase 6 y
 * este reemplazo vive junto al composer para que la generalización a
 * MarketPlace lo pueda mover a `components/composer/` cuando se haga.
 *
 * Diferencias con la versión original del wizard:
 *   - El prefijo de `data-testid` se respeta tal cual (sin anteponer
 *     `wizard-`). Pásalo desde el caller en el formato que prefieras
 *     (ej. `composer-zonas`).
 *
 * Ubicación: apps/web/src/components/servicios/composer/ChipInputList.tsx
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
    /** Prefijo del data-testid: `${testid}-input`, `-agregar`, `-chip-N` */
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
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                {label}
            </label>
            <p className="text-[12px] text-slate-600 font-medium mb-2 leading-snug">
                {helper}
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    data-testid={`${testid}-input`}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            agregar();
                        }
                    }}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-500 font-medium outline-none focus:border-sky-500"
                />
                <button
                    type="button"
                    data-testid={`${testid}-agregar`}
                    onClick={agregar}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] lg:cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Agregar
                </button>
            </div>
            {items.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {items.map((it, idx) => (
                        <span
                            key={`${it}-${idx}`}
                            data-testid={`${testid}-chip-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 text-[13px] font-semibold"
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
            <p className="mt-1.5 text-[11px] text-slate-500 font-medium tabular-nums">
                {items.length}/{max}
            </p>
        </div>
    );
}

export default ChipInputList;
