import { Icon } from '../icons';

type CategoryIcon = 'tool' | 'briefcase' | 'image' | 'user';

interface CardSolicitoProps {
  /** Icono representando la categoría — sin foto grande para este tipo. */
  categoryIcon?: CategoryIcon;
  titulo: string;        // "Busco: electricista"
  presupuesto: string;   // "$500–$800"
  zona: string;
  solicitanteNombre: string;
  tiempo: string;        // "hace 2h"
  onClick?: () => void;
}

const ICON_MAP: Record<CategoryIcon, React.ReactNode> = {
  tool: <Icon.Tool size={26} />,
  briefcase: <Icon.Briefcase size={26} />,
  image: <Icon.Image size={26} />,
  user: <Icon.User size={26} />,
};

/**
 * Card SOLICITO — fondo amber-50 muy sutil para diferenciar de ofertas.
 * **Única excepción** al sistema sky-only: amber es un "decorador" no un segundo acento.
 */
export function CardSolicito({
  categoryIcon = 'tool',
  titulo,
  presupuesto,
  zona,
  solicitanteNombre,
  tiempo,
  onClick,
}: CardSolicitoProps) {
  return (
    <article
      onClick={onClick}
      className="rounded-2xl overflow-hidden bg-amber-50/70 border border-amber-200/70 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 grid place-items-center text-amber-700 shrink-0">
            {ICON_MAP[categoryIcon]}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
              Solicito
            </span>
            <div className="mt-1 text-[14px] font-bold text-slate-900 leading-snug truncate">{titulo}</div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-700">Presupuesto {presupuesto}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <Icon.User size={11} /> {solicitanteNombre}
          </span>
          <span className="flex items-center gap-1">
            <Icon.Pin size={11} /> {zona} · {tiempo}
          </span>
        </div>
      </div>
    </article>
  );
}
