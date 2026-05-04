/**
 * FiltrosBuscador.tsx
 * ====================
 * Panel de filtros del buscador del MarketPlace.
 *
 * Variante:
 *  - "mobile": bottom sheet con backdrop, controlado por `abierto/onCerrar`.
 *  - "desktop": sidebar inline (siempre visible, sin backdrop).
 *
 * Filtros del Sprint 6:
 *  - Distancia (chips única, oculto si no hay GPS)
 *  - Precio (slider doble + presets)
 *  - Condición (chips múltiples)
 *
 * El filtro "Acepta ofertas" se omite en v1 (decisión documentada en
 * el reporte del sprint: como `aceptaOfertas` default es `true`, el filtro
 * casi siempre devolvería todo).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P5)
 * Sprint:      docs/prompts Marketplace/Sprint-6-Buscador.md
 *
 * Ubicación: apps/web/src/components/marketplace/FiltrosBuscador.tsx
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FiltrosBusquedaCliente } from '../../hooks/queries/useMarketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const DISTANCIAS_KM = [1, 3, 5, 10, 25, 50] as const;

const PRECIO_PRESETS = [
    { label: 'Menos de $500', min: 0, max: 500 },
    { label: '$500 - $1,000', min: 500, max: 1000 },
    { label: '$1,000 - $5,000', min: 1000, max: 5000 },
    { label: 'Más de $5,000', min: 5000, max: 999999 },
];

const CONDICIONES = [
    { valor: 'nuevo' as const, etiqueta: 'Nuevo' },
    { valor: 'seminuevo' as const, etiqueta: 'Seminuevo' },
    { valor: 'usado' as const, etiqueta: 'Usado' },
    { valor: 'para_reparar' as const, etiqueta: 'Para reparar' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface FiltrosBuscadorProps {
    variante: 'mobile' | 'desktop';
    abierto: boolean;
    onCerrar: () => void;
    filtros: FiltrosBusquedaCliente;
    onAplicar: (nuevos: FiltrosBusquedaCliente) => void;
    onLimpiar: () => void;
    /** Si no hay GPS, el filtro de distancia se oculta */
    tieneGps: boolean;
}

export function FiltrosBuscador({
    variante,
    abierto,
    onCerrar,
    filtros,
    onAplicar,
    onLimpiar,
    tieneGps,
}: FiltrosBuscadorProps) {
    // Estado local — al abrir, sincroniza con los filtros aplicados.
    const [borrador, setBorrador] = useState<FiltrosBusquedaCliente>(filtros);

    useEffect(() => {
        if (abierto) setBorrador(filtros);
    }, [abierto, filtros]);

    // Bloquear scroll del body en mobile
    useEffect(() => {
        if (variante !== 'mobile' || !abierto) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [variante, abierto]);

    const handleAplicar = () => {
        onAplicar(borrador);
        if (variante === 'mobile') onCerrar();
    };

    const handleLimpiar = () => {
        setBorrador({ q: filtros.q, ordenar: filtros.ordenar });
        onLimpiar();
    };

    // ─── Render común de los controles ────────────────────────────────────
    const Controles = (
        <div className="space-y-5">
            {/* Distancia (oculto si no hay GPS) */}
            {tieneGps && (
                <Bloque titulo="Distancia">
                    <div className="flex flex-wrap gap-2">
                        {DISTANCIAS_KM.map((km) => (
                            <button
                                key={km}
                                data-testid={`chip-distancia-${km}`}
                                onClick={() =>
                                    setBorrador((b) => ({
                                        ...b,
                                        distanciaMaxKm:
                                            b.distanciaMaxKm === km ? undefined : km,
                                    }))
                                }
                                aria-pressed={borrador.distanciaMaxKm === km}
                                className={chipClase(borrador.distanciaMaxKm === km)}
                            >
                                {km} km
                            </button>
                        ))}
                    </div>
                </Bloque>
            )}

            {/* Precio */}
            <Bloque titulo="Precio">
                <div className="flex flex-wrap gap-2">
                    {PRECIO_PRESETS.map((preset) => {
                        const activo =
                            borrador.precioMin === preset.min &&
                            borrador.precioMax === preset.max;
                        return (
                            <button
                                key={preset.label}
                                data-testid={`preset-precio-${preset.min}-${preset.max}`}
                                onClick={() =>
                                    setBorrador((b) => ({
                                        ...b,
                                        precioMin: activo ? undefined : preset.min,
                                        precioMax: activo ? undefined : preset.max,
                                    }))
                                }
                                aria-pressed={activo}
                                className={chipClase(activo)}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>

                {/* Custom: precio min/max manual */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <InputNumero
                        label="Mínimo"
                        value={borrador.precioMin}
                        onChange={(v) => setBorrador((b) => ({ ...b, precioMin: v }))}
                        placeholder="0"
                    />
                    <InputNumero
                        label="Máximo"
                        value={borrador.precioMax}
                        onChange={(v) => setBorrador((b) => ({ ...b, precioMax: v }))}
                        placeholder="999999"
                    />
                </div>
            </Bloque>

            {/* Condición */}
            <Bloque titulo="Condición">
                <div className="flex flex-wrap gap-2">
                    {CONDICIONES.map((c) => {
                        const activo = borrador.condicion?.includes(c.valor) ?? false;
                        return (
                            <button
                                key={c.valor}
                                data-testid={`chip-condicion-filtro-${c.valor}`}
                                onClick={() =>
                                    setBorrador((b) => ({
                                        ...b,
                                        condicion: toggleEnArray(b.condicion ?? [], c.valor),
                                    }))
                                }
                                aria-pressed={activo}
                                className={chipClase(activo)}
                            >
                                {c.etiqueta}
                            </button>
                        );
                    })}
                </div>
            </Bloque>
        </div>
    );

    // ─── Render según variante ────────────────────────────────────────────
    if (variante === 'desktop') {
        return (
            <aside
                data-testid="sidebar-filtros-desktop"
                className="sticky top-4 w-64 shrink-0 rounded-xl border-2 border-slate-200 bg-white p-4 2xl:w-72"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">Filtros</h2>
                    <button
                        data-testid="btn-limpiar-filtros-desktop"
                        onClick={handleLimpiar}
                        className="cursor-pointer text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                        Limpiar
                    </button>
                </div>
                {Controles}
                <button
                    data-testid="btn-aplicar-filtros-desktop"
                    onClick={handleAplicar}
                    className="mt-5 w-full cursor-pointer rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                >
                    Aplicar filtros
                </button>
            </aside>
        );
    }

    // ─── Mobile bottom sheet ──────────────────────────────────────────────
    if (!abierto) return null;
    return (
        <div
            data-testid="bottom-sheet-filtros-mobile"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onCerrar}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-4"
            >
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                    <h2 className="text-base font-bold text-slate-900">Filtros</h2>
                    <button
                        data-testid="btn-cerrar-filtros-mobile"
                        onClick={onCerrar}
                        aria-label="Cerrar filtros"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </div>
                <div className="px-4 pt-4">{Controles}</div>
                <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
                    <button
                        data-testid="btn-limpiar-filtros-mobile"
                        onClick={handleLimpiar}
                        className="flex-1 cursor-pointer rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                        Limpiar
                    </button>
                    <button
                        data-testid="btn-aplicar-filtros-mobile"
                        onClick={handleAplicar}
                        className="flex-1 cursor-pointer rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function Bloque({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{titulo}</h3>
            {children}
        </div>
    );
}

function chipClase(activo: boolean): string {
    return [
        'cursor-pointer rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors',
        activo
            ? 'border-teal-500 bg-teal-50 text-teal-900'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ].join(' ');
}

interface InputNumeroProps {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
}

function InputNumero({ label, value, onChange, placeholder }: InputNumeroProps) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-600">{label}</label>
            <div className="mt-0.5 flex items-center rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 focus-within:border-teal-500">
                <span className="text-xs text-slate-400">$</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={999999}
                    value={value ?? ''}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 7);
                        onChange(raw === '' ? undefined : parseInt(raw, 10));
                    }}
                    placeholder={placeholder}
                    className="ml-1 w-full bg-transparent text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
            </div>
        </div>
    );
}

function toggleEnArray<T>(arr: T[], item: T): T[] {
    if (arr.includes(item)) return arr.filter((x) => x !== item);
    return [...arr, item];
}

export default FiltrosBuscador;
