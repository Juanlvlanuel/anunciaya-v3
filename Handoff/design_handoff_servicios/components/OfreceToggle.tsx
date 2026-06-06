import { Icon } from './icons';

export type OfreceMode = 'ofrezco' | 'solicito';

interface OfreceToggleProps {
  value: OfreceMode;
  onChange: (v: OfreceMode) => void;
  /** `embedded` = se usa DENTRO del header dark (estilo "pills sobre cristal"). */
  embedded?: boolean;
}

/**
 * Segmented control "Ofrezco / Solicito" — primera persona, conversacional.
 * Activo: gradient sky-600 → sky-700 + shadow teñida sky.
 * Inactivo: bg slate-100 (suelto) o transparente (embedded).
 */
export function OfreceToggle({ value, onChange, embedded }: OfreceToggleProps) {
  const items: Array<{ key: OfreceMode; label: string; icon: React.ReactNode }> = [
    { key: 'ofrezco', label: 'Ofrezco', icon: <Icon.Hand size={16} /> },
    { key: 'solicito', label: 'Solicito', icon: <Icon.Search size={15} /> },
  ];

  if (embedded) {
    return (
      <div
        role="tablist"
        aria-label="Modo"
        className="inline-flex p-1 rounded-full bg-white/10 backdrop-blur border border-white/10"
      >
        {items.map((it) => {
          const active = value === it.key;
          return (
            <button
              key={it.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(it.key)}
              className={
                'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition ' +
                (active
                  ? 'bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40'
                  : 'text-slate-200 hover:text-white')
              }
            >
              {it.icon}
              {it.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Modo"
      className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200"
    >
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={
              'flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-semibold transition ' +
              (active
                ? 'bg-gradient-to-b from-sky-600 to-sky-700 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-600 hover:text-slate-900')
            }
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
