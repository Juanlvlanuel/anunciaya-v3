import { Icon } from './icons';

interface ChipProps {
  active?: boolean;
  icon?: React.ReactNode;
  /** Punto azul a la izquierda — usar para chips con valor seleccionado distinto de "Todos". */
  dot?: boolean;
  /** Botón X interno para chips de "Búsqueda reciente" / multi-selección removible. */
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
}

/**
 * Pill chip de filtro — `border-2 border-slate-300` por defecto.
 * Activo: bg-sky-100 + border-sky-500 + text-sky-700.
 */
export function Chip({ active, icon, dot, removable, onClick, onRemove, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition border-2 whitespace-nowrap ' +
        (active
          ? 'bg-sky-100 border-sky-500 text-sky-700'
          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400')
      }
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
      {icon}
      <span>{children}</span>
      {removable && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 opacity-70 hover:opacity-100"
          role="button"
          aria-label="Quitar"
        >
          <Icon.X size={12} />
        </span>
      )}
    </button>
  );
}
