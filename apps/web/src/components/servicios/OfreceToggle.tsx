/**
 * OfreceToggle.tsx
 * ==================
 * Filtro principal del feed de Servicios — segmented control "Ofrecen /
 * Solicitan" con **container pill negro** (estilo cristal del header dark
 * pero con fondo sólido para vivir sobre el gradient azul de la página).
 *
 * Estructura:
 *   ┌─────────────────────────────────────┐  ← container pill `bg-slate-900`
 *   │ [🤚 Ofrecen]   [🔍 Solicitan]       │
 *   └─────────────────────────────────────┘
 *
 * - Activo: gradient sky-500 → sky-700 + shadow teñida sky.
 * - Inactivo: solo texto `text-slate-300`, sin fondo individual (vive sobre
 *   el cristal del container).
 *
 * Etiquetas por default en 3ª persona porque el toggle filtra publicaciones
 * de terceros — la acción de publicar vive en el FAB Publicar (speed-dial).
 *
 * Ubicación: apps/web/src/components/servicios/OfreceToggle.tsx
 */

import { Hand, Search } from 'lucide-react';
import type { ModoServicio } from '../../types/servicios';

interface OfreceToggleProps {
    /** `null` = ningún chip activo (estado "Todos"). */
    value: ModoServicio | null;
    onChange: (v: ModoServicio) => void;
    /** Labels custom. Default = 3ª persona ("Ofrecen / Solicitan"). */
    labels?: { ofrezco: string; solicito: string };
}

const LABELS_DEFAULT = { ofrezco: 'Ofrecen', solicito: 'Solicitan' };

export function OfreceToggle({
    value,
    onChange,
    labels = LABELS_DEFAULT,
}: OfreceToggleProps) {
    const items: Array<{
        key: ModoServicio;
        label: string;
        Icono: typeof Hand;
    }> = [
        { key: 'ofrezco', label: labels.ofrezco, Icono: Hand },
        { key: 'solicito', label: labels.solicito, Icono: Search },
    ];

    return (
        <div
            data-testid="servicios-toggle"
            role="tablist"
            aria-label="Filtrar por Ofrecen o Solicitan"
            className="inline-flex p-1 rounded-full bg-slate-900 border border-slate-800 shadow-md"
        >
            {items.map((it) => {
                const esActivo = value === it.key;
                const Icono = it.Icono;
                return (
                    <button
                        type="button"
                        key={it.key}
                        data-testid={`servicios-toggle-${it.key}`}
                        role="tab"
                        aria-selected={esActivo}
                        onClick={() => onChange(it.key)}
                        className={
                            'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition lg:cursor-pointer ' +
                            (esActivo
                                ? 'bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40'
                                : 'text-slate-300 hover:text-white')
                        }
                    >
                        <Icono className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
}

export default OfreceToggle;
