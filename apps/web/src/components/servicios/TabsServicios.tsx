/**
 * TabsServicios.tsx
 * ===================
 * Segmented control de 4 tabs para la sección Servicios:
 *
 *   Todos · Vacantes · Servicios · Solicitudes
 *
 * Reemplaza el sistema previo de chips Servicio/Empleo + Ofrecen/Solicitan,
 * que mezclaba 2 ejes (tipo + modo) y generaba confusión. Cada tab agrupa
 * un único `tipo` de publicación con su layout y filtros propios:
 *
 *   - Vacantes    → `tipo='vacante-empresa'`  (empleos formales de negocios).
 *   - Servicios   → `tipo='servicio-persona'` (gente que ofrece su trabajo).
 *   - Solicitudes → `tipo='solicito'`         (gente que busca contratar).
 *
 * Orden Sprint 9.3: Vacantes va primero porque es la rama "comercial"
 * (publicada por negocios desde BS) y suele tener menos publicaciones —
 * dándole prioridad visual evita que quede sepultada al fondo. Luego
 * Servicios y Solicitudes (las ramas de usuario personal) siguiendo el
 * orden natural ofrezco → solicito.
 *
 * Estilo: pill blanco con borde slate, 4 segmentos. El activo usa fondo
 * sky (acento de marca de Servicios) sobre texto blanco. Inactivo: texto
 * slate-700 + hover sutil.
 *
 * Ubicación: apps/web/src/components/servicios/TabsServicios.tsx
 */

import { Briefcase, HelpCircle, Wrench } from 'lucide-react';

export type TabServicios = 'todos' | 'servicios' | 'solicitudes' | 'vacantes';

interface OpcionTab {
    key: TabServicios;
    label: string;
    Icono: typeof Wrench;
}

// 'todos' ya NO es un chip clickeable — es el estado por defecto (ningún
// chip activo). Click en un chip activo lo desactiva y vuelve a 'todos'.
const TABS: OpcionTab[] = [
    { key: 'vacantes', label: 'Vacantes', Icono: Briefcase },
    { key: 'servicios', label: 'Servicios', Icono: Wrench },
    { key: 'solicitudes', label: 'Solicitudes', Icono: HelpCircle },
];

interface TabsServiciosProps {
    activa: TabServicios;
    onChange: (t: TabServicios) => void;
    /** Conteo por tab para mostrar un badge con el total. Opcional. */
    conteos?: Partial<Record<TabServicios, number>>;
    /**
     * - `light` (default): pill blanco con borde slate sobre fondo claro.
     * - `dark`: pills aisladas sobre cristal `bg-white/5` con borde `white/15`,
     *   activa sky-500. Mismo patrón que el `ChipsFiltros` previo (dark) para
     *   integrarse al header sticky negro de Servicios.
     */
    variant?: 'light' | 'dark';
}

export function TabsServicios({
    activa,
    onChange,
    conteos,
    variant = 'light',
}: TabsServiciosProps) {
    if (variant === 'dark') {
        // Variante dark: pills aisladas estilo `ChipsFiltros` previo. Sin
        // contenedor pill conjunto — cada tab es una píldora independiente con
        // border-2 y rounded-full.
        return (
            <div
                data-testid="tabs-servicios"
                className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            >
                {TABS.map(({ key, label, Icono }) => {
                    const isActiva = activa === key;
                    const conteo = conteos?.[key];
                    return (
                        <button
                            key={key}
                            type="button"
                            data-testid={`tab-${key}`}
                            onClick={() => onChange(isActiva ? 'todos' : key)}
                            aria-pressed={isActiva}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition lg:cursor-pointer ${
                                isActiva
                                    ? 'border-sky-400 bg-sky-500 text-white shadow-md shadow-sky-500/20'
                                    : 'border-white/15 bg-white/5 text-slate-200 lg:hover:border-sky-400/60 lg:hover:bg-white/10 lg:hover:text-white'
                            }`}
                        >
                            <Icono className="h-4 w-4" strokeWidth={2.5} />
                            <span>{label}</span>
                            {conteo !== undefined && (
                                <span
                                    className={`ml-0.5 rounded-full px-1.5 text-[11px] font-bold ${
                                        isActiva
                                            ? 'bg-white/25 text-white'
                                            : 'bg-white/10 text-slate-300'
                                    }`}
                                >
                                    {conteo}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Variant light (default): segmented control pill blanco.
    return (
        <div
            data-testid="tabs-servicios"
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1 shadow-sm"
        >
            {TABS.map(({ key, label, Icono }) => {
                const isActiva = activa === key;
                const conteo = conteos?.[key];
                return (
                    <button
                        key={key}
                        type="button"
                        data-testid={`tab-${key}`}
                        onClick={() => onChange(isActiva ? 'todos' : key)}
                        aria-pressed={isActiva}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap lg:cursor-pointer ${
                            isActiva
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-700 lg:hover:bg-slate-100'
                        }`}
                    >
                        <Icono className="h-4 w-4" strokeWidth={2.5} />
                        <span>{label}</span>
                        {conteo !== undefined && (
                            <span
                                className={`ml-0.5 rounded-full px-1.5 text-[11px] font-bold ${
                                    isActiva
                                        ? 'bg-white/25 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                                {conteo}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default TabsServicios;
