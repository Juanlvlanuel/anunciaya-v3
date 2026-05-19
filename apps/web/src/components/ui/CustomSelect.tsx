/**
 * CustomSelect.tsx — Dropdown estilizado consistente con Business Studio.
 *
 * Reemplaza al `<select>` nativo en formularios donde el sistema visual
 * lo amerite (mejor accesibilidad, look uniforme, opciones con hint, etc.).
 *
 * Características:
 *  · Trigger con chevron animado (rotate-180 al abrir)
 *  · Menú con radio-dot + label + hint opcional
 *  · Hover slate-100, seleccionado con radio lleno + font-semibold
 *  · Click-fuera + ESC cierran
 *  · Accesible (listbox / option / aria-expanded / aria-selected)
 *  · Genérico tipado — el `value` y `onChange` infieren el tipo correcto
 *
 * Uso:
 *   type Unidad = 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto';
 *   <CustomSelect<Unidad>
 *     value={unidad}
 *     onChange={setUnidad}
 *     options={[
 *       { value: 'mes-rango', label: '/mes (rango)' },
 *       { value: 'mes-fijo',  label: '/mes (fijo)' },
 *     ]}
 *   />
 *
 * Ubicación: apps/web/src/components/ui/CustomSelect.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
    value: T;
    label: string;
    /** Texto secundario alineado a la derecha. Opcional. */
    hint?: string;
    disabled?: boolean;
}

interface Props<T extends string> {
    value: T | null;
    options: SelectOption<T>[];
    onChange: (value: T) => void;
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
    /** ID para asociar con un `<label htmlFor>` externo. */
    id?: string;
    /** data-testid para el botón trigger. */
    testId?: string;
    /** Ancho fijo del menú (default: full width del trigger). */
    className?: string;
}

export function CustomSelect<T extends string>({
    value,
    options,
    onChange,
    placeholder = 'Seleccionar...',
    ariaLabel,
    disabled,
    id,
    testId,
    className = '',
}: Props<T>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // click-outside + escape
    useEffect(() => {
        if (!open) return;
        const onDown = (ev: MouseEvent) => {
            if (ref.current && !ref.current.contains(ev.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const selected = options.find((o) => o.value === value);

    return (
        <div
            ref={ref}
            className={
                'relative w-full ' +
                (disabled ? 'opacity-50 pointer-events-none ' : '') +
                className
            }
        >
            <button
                id={id}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                data-testid={testId}
                className={
                    'w-full flex items-center gap-2 px-3.5 py-2.5 text-left ' +
                    'text-base lg:text-sm 2xl:text-base font-medium text-slate-900 ' +
                    'bg-white border-2 rounded-lg lg:cursor-pointer ' +
                    'hover:border-slate-400 ' +
                    (open
                        ? 'border-slate-900 ring-2 ring-slate-900/15'
                        : 'border-slate-300')
                }
            >
                <span
                    className={
                        'flex-1 truncate ' +
                        (selected ? '' : 'text-slate-500 font-medium')
                    }
                >
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    className={
                        'w-4 h-4 text-slate-500 shrink-0 transition-transform ' +
                        (open ? 'rotate-180' : '')
                    }
                    strokeWidth={2}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-20 top-[calc(100%+6px)] left-0 right-0 max-h-[280px] overflow-y-auto p-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {options.map((opt) => {
                        const isSel = opt.value === value;
                        return (
                            <li key={opt.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSel}
                                    disabled={opt.disabled}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                    data-testid={
                                        testId ? `${testId}-opt-${opt.value}` : undefined
                                    }
                                    className={
                                        'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left text-base lg:text-sm 2xl:text-base lg:cursor-pointer ' +
                                        (isSel
                                            ? 'bg-slate-100 font-semibold text-slate-900'
                                            : 'font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900')
                                    }
                                >
                                    {/* radio dot */}
                                    <span
                                        className={
                                            'w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ' +
                                            (isSel
                                                ? 'border-slate-900'
                                                : 'border-slate-300')
                                        }
                                    >
                                        {isSel && (
                                            <span className="w-[7px] h-[7px] rounded-full bg-slate-900" />
                                        )}
                                    </span>
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {opt.hint && (
                                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                                            {opt.hint}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
