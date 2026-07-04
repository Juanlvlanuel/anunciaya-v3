export type TabAudiencia = 'app' | 'negocio' | 'scanya';

interface OpcionTab {
  key: TabAudiencia;
  label: string;
}

interface TabsAudienciaProps {
  activa: TabAudiencia;
  onChange: (t: TabAudiencia) => void;
  opciones: OpcionTab[];
}

/**
 * Segmented control de audiencia. Mismo estilo slate que el toggle
 * "Comunidad · Mis preguntas" del Home (`SegmentoFeed` en PaginaInicio):
 * contenedor slate-200 + pill activo con gradiente slate oscuro.
 */
export function TabsAudiencia({ activa, onChange, opciones }: TabsAudienciaProps) {
  return (
    <div
      data-testid="ayuda-tabs-audiencia"
      className="flex gap-1 self-start overflow-x-auto rounded-full border-2 border-slate-300 bg-slate-200 p-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {opciones.map(({ key, label }) => {
        const on = activa === key;
        return (
          <button
            key={key}
            type="button"
            data-testid={`ayuda-tab-${key}`}
            onClick={() => onChange(key)}
            aria-pressed={on}
            className={`inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-sm font-bold lg:cursor-pointer ${
              on ? 'text-white shadow-sm' : 'text-slate-600'
            }`}
            style={on ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
