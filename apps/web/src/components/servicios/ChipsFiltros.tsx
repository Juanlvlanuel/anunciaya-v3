/**
 * ChipsFiltros.tsx
 * =================
 * Filtros del feed de Servicios. Selección única (un chip activo a la vez).
 *
 * Estilo idéntico al `ChipsFiltrosFeed` de MarketPlace y Ofertas: **pills
 * aisladas** con `border-2 rounded-full px-3.5 py-1.5 text-sm`. Mismo tamaño
 * en PC y móvil. Sin container pill conjunto.
 *
 * Set base reducido a 5 opciones:
 *   Todos · Presencial · Remoto · Servicio · Empleo
 *
 * Opcionalmente (solo móvil), si se pasan `modo` y `onModoChange`, los chips
 * "Ofrecen" y "Solicitan" se renderizan AL INICIO del carrusel — funcionan
 * como modo (no como filtro, son ejes independientes). En desktop el toggle
 * Ofrecen/Solicitan vive como bloque encimado al header.
 *
 * Ubicación: apps/web/src/components/servicios/ChipsFiltros.tsx
 */

import { Briefcase, Hand, MapPin, Search, SlidersHorizontal, Wifi, Wrench } from 'lucide-react';
import type {
    ModalidadServicio,
    ModoServicio,
    TipoPublicacion,
} from '../../types/servicios';

export type FiltroChip =
    | 'todos'
    | 'presencial'
    | 'remoto'
    | 'servicio'
    | 'empleo';

interface ChipsFiltrosProps {
    activo: FiltroChip;
    onChange: (f: FiltroChip) => void;
    /**
     * - `light` (default): pills aisladas blancas con borde slate sobre fondo claro.
     * - `dark`: pills sobre cristal `bg-white/5` borde `white/15`, activo
     *   sky-500. Mismo patrón que MP variant dark.
     */
    variant?: 'light' | 'dark';
    /**
     * Si se pasa junto con `onModoChange`, renderiza chips "Ofrecen" y
     * "Solicitan" en el carrusel — DESPUÉS del chip "Todos" pero antes de los
     * filtros de modalidad/tipo. Usado en el header móvil donde el toggle
     * vive aquí en lugar de como bloque encimado al header.
     *
     * `null` = ningún chip de modo activo (estado "Todos").
     */
    modo?: ModoServicio | null;
    onModoChange?: (m: ModoServicio | null) => void;
}

interface OpcionChip {
    key: FiltroChip;
    label: string;
    Icono: typeof MapPin;
}

const OPCIONES_FILTRO: OpcionChip[] = [
    { key: 'todos', label: 'Todos', Icono: SlidersHorizontal },
    { key: 'presencial', label: 'Presencial', Icono: MapPin },
    { key: 'remoto', label: 'Remoto', Icono: Wifi },
    { key: 'servicio', label: 'Servicio', Icono: Wrench },
    { key: 'empleo', label: 'Empleo', Icono: Briefcase },
];

export function ChipsFiltros({
    activo,
    onChange,
    variant = 'light',
    modo,
    onModoChange,
}: ChipsFiltrosProps) {
    const incluyeModo = modo !== undefined && onModoChange !== undefined;
    // El chip "Todos" siempre va primero (índice 0 de OPCIONES_FILTRO).
    // Lo activamos solo si: filtro='todos' Y (no hay modo, o modo=null).
    const [chipTodos, ...chipsFiltro] = OPCIONES_FILTRO;
    const todosActivo =
        activo === 'todos' && (!incluyeModo || modo === null);

    return (
        <div
            data-testid="servicios-chips-filtros"
            className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        >
            {/* "Todos" — siempre primero. Por default es el único activo. */}
            <BotonChip
                activo={todosActivo}
                onClick={() => onChange(chipTodos.key)}
                Icono={chipTodos.Icono}
                label={chipTodos.label}
                testId={`chip-filtro-${chipTodos.key}`}
                variant={variant}
            />

            {/* Chips de modo — solo móvil (cuando se pasan modo y onModoChange). */}
            {incluyeModo && (
                <>
                    <BotonChip
                        activo={modo === 'ofrezco'}
                        onClick={() => onModoChange!('ofrezco')}
                        Icono={Hand}
                        label="Ofrecen"
                        testId="chip-modo-ofrezco"
                        variant={variant}
                    />
                    <BotonChip
                        activo={modo === 'solicito'}
                        onClick={() => onModoChange!('solicito')}
                        Icono={Search}
                        label="Solicitan"
                        testId="chip-modo-solicito"
                        variant={variant}
                    />
                </>
            )}

            {/* Resto de filtros (Presencial, Remoto, Servicio, Empleo). */}
            {chipsFiltro.map((op) => (
                <BotonChip
                    key={op.key}
                    activo={activo === op.key}
                    onClick={() => onChange(op.key)}
                    Icono={op.Icono}
                    label={op.label}
                    testId={`chip-filtro-${op.key}`}
                    variant={variant}
                />
            ))}
        </div>
    );
}

export default ChipsFiltros;

// =============================================================================
// Subcomponente — BotonChip (pill aislada con icono + label)
// =============================================================================

interface BotonChipProps {
    activo: boolean;
    onClick: () => void;
    Icono: typeof MapPin;
    label: string;
    testId: string;
    variant: 'light' | 'dark';
}

function BotonChip({
    activo,
    onClick,
    Icono,
    label,
    testId,
    variant,
}: BotonChipProps) {
    const clasesActivo =
        variant === 'dark'
            ? 'border-sky-400 bg-sky-500 text-white shadow-md shadow-sky-500/20'
            : 'border-sky-600 bg-sky-600 text-white shadow-sm';
    const clasesInactivo =
        variant === 'dark'
            ? 'border-white/15 bg-white/5 text-slate-200 lg:hover:border-sky-400/60 lg:hover:bg-white/10 lg:hover:text-white'
            : 'border-slate-300 bg-white text-slate-700 lg:hover:border-sky-400 lg:hover:text-sky-700';

    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            aria-pressed={activo}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition lg:cursor-pointer ${
                activo ? clasesActivo : clasesInactivo
            }`}
        >
            <Icono className="h-4 w-4" strokeWidth={2.5} />
            <span>{label}</span>
        </button>
    );
}

// =============================================================================
// Helper: traduce el FiltroChip al filtro real del feed
// =============================================================================

/**
 * 'todos' devuelve undefined para que el backend no aplique filtro.
 */
export function chipAFiltroFeed(chip: FiltroChip): {
    tipo?: TipoPublicacion;
    modalidad?: ModalidadServicio;
} {
    switch (chip) {
        case 'todos':
            return {};
        case 'presencial':
        case 'remoto':
            return { modalidad: chip };
        case 'servicio':
            return { tipo: 'servicio-persona' };
        case 'empleo':
            return { tipo: 'vacante-empresa' };
    }
}
