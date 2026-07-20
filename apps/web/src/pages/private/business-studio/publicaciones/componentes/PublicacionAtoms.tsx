/**
 * PublicacionAtoms.tsx
 * ======================
 * Pills atómicos reutilizables del módulo Publicaciones. Calca
 * `VacanteAtoms.tsx` (mismo patrón: dot + label, sin border, B2B denso).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/componentes/PublicacionAtoms.tsx
 */

const CLASES_PILL_BASE =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold whitespace-nowrap';

const COLOR_ESTADO: Record<'activa' | 'archivada', { wrap: string; dot: string; label: string }> = {
    activa: {
        wrap: 'bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
        label: 'Activa',
    },
    archivada: {
        wrap: 'bg-slate-200 text-slate-700',
        dot: 'bg-slate-500',
        label: 'Archivada',
    },
};

export function PillEstadoPublicacion({ estado }: { estado: 'activa' | 'archivada' }) {
    const cfg = COLOR_ESTADO[estado];
    return (
        <span className={`${CLASES_PILL_BASE} ${cfg.wrap}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden />
            {cfg.label}
        </span>
    );
}
