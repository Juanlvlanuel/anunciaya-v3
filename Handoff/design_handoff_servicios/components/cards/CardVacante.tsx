import { Icon } from '../icons';

interface CardVacanteProps {
  logoUrl?: string;
  logoInitials: string;
  empresa: string;
  titulo: string;
  /** Ej. "$8,500 / mes" */
  salario: string;
  zona: string; // "Centro · TC"
  verificada?: boolean;
  onClick?: () => void;
}

/**
 * Card VACANTE-EMPRESA — borde sky-200, banda superior sky-50 con logo + badge verificado.
 * Sin foto de stock falsa — la identidad de marca lleva el peso visual.
 */
export function CardVacante({
  logoUrl,
  logoInitials,
  empresa,
  titulo,
  salario,
  zona,
  verificada = true,
  onClick,
}: CardVacanteProps) {
  return (
    <article
      onClick={onClick}
      className="rounded-2xl overflow-hidden bg-white border border-sky-200 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <div className="bg-sky-50 px-3 py-4 flex flex-col items-center relative">
        <div className="w-12 h-12 rounded-xl bg-white border border-sky-100 grid place-items-center text-sky-700 font-extrabold text-base shadow-sm overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt={empresa} className="w-full h-full object-cover" /> : logoInitials}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold text-slate-700">{empresa}</div>
        {verificada && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-bold">
            <Icon.Check size={9} strokeWidth={3} /> Verificado
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">{titulo}</div>
        <div className="mt-1.5">
          <span className="text-[15px] font-extrabold text-slate-900">{salario}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wider">
            <Icon.Briefcase size={10} /> Vacante
          </span>
          <span className="text-[11px] font-medium text-slate-500">{zona}</span>
        </div>
      </div>
    </article>
  );
}
