import { Icon } from './icons';

interface FABProps {
  label?: string;
  onClick?: () => void;
  /** Si es true, no se posiciona absolute — úsalo dentro de un contenedor flex/absolute propio. */
  inline?: boolean;
  /** Altura desde el bottom — controlar manualmente cuando el BottomNav aparece/desaparece. */
  bottomClass?: string;
}

/**
 * FAB Publicar — pill con ícono en burbuja interna, sombra teñida sky.
 * En móvil: `bottom-20` cuando el BottomNav está visible, `bottom-4` cuando se oculta.
 * En desktop: pegado a la columna izquierda del MainLayout (lo coloca el padre).
 */
export function FAB({ label = 'Publicar', onClick, inline, bottomClass = 'bottom-20' }: FABProps) {
  const button = (
    <button
      onClick={onClick}
      className="flex items-center gap-2 pl-3 pr-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40 font-semibold hover:shadow-lg hover:shadow-sky-500/50 transition"
    >
      <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center">
        <Icon.Plus size={16} />
      </span>
      {label}
    </button>
  );

  if (inline) return button;
  return <div className={`absolute right-4 ${bottomClass} z-30 transition-all`}>{button}</div>;
}
