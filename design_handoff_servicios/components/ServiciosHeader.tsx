import { Icon } from './icons';

interface ServiciosHeaderProps {
  /** Subtítulo decorativo. La palabra "personas" se resalta en sky-400. */
  subtitle?: string;
  /** Para desktop: contenido al lado del subtítulo (típicamente el toggle). */
  children?: React.ReactNode;
  variant?: 'mobile' | 'desktop';
  onBack?: () => void;
}

/**
 * Header sticky dark con grid pattern + glow radial sky.
 * Acento principal "cios" en sky-400.
 *
 *   <ServiciosHeader variant="desktop">
 *     <OfreceToggle ... embedded />
 *   </ServiciosHeader>
 */
export function ServiciosHeader({
  subtitle = 'Encuentra personas que ayudan',
  children,
  variant = 'mobile',
  onBack,
}: ServiciosHeaderProps) {
  const parts = subtitle.split('personas');

  if (variant === 'desktop') {
    return (
      <div className="relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-ay-grid bg-[length:32px_32px]" />
        <div className="absolute inset-0 bg-ay-glow" />
        <div className="relative px-8 py-5 flex items-center gap-6">
          <button onClick={onBack} className="text-slate-300 hover:text-white transition" aria-label="Volver">
            <Icon.ChevL size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 grid place-items-center shadow-md shadow-sky-500/30">
              <Icon.Tool size={22} className="text-white" />
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">
              Servi<span className="text-sky-400">cios</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center gap-3 max-w-md">
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-sky-500/70" />
            <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-slate-300 whitespace-nowrap">
              {parts[0]}
              <span className="text-sky-400">personas</span>
              {parts[1]}
            </div>
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-sky-500/70" />
          </div>
          <div>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black overflow-hidden">
      <div className="absolute inset-0 bg-ay-grid bg-[length:32px_32px] opacity-90" />
      <div className="absolute inset-0 bg-ay-glow-sm" />
      <div className="relative px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-300" aria-label="Volver">
            <Icon.ChevL size={22} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 grid place-items-center shadow-md shadow-sky-500/30">
            <Icon.Tool size={20} className="text-white" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            Servi<span className="text-sky-400">cios</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/70" />
          <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-slate-300">
            {parts[0]}
            <span className="text-sky-400">personas</span>
            {parts[1]}
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/70" />
        </div>
      </div>
    </div>
  );
}
