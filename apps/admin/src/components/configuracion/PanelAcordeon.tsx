/**
 * PanelAcordeon.tsx
 * =================
 * Panel colapsable (acordeón) de la sección Configuración. Barra horizontal clickeable
 * (ícono · título · resumen · chevron) que despliega su contenido — el mosaico de tarjetas
 * verticales. El estado abierto/cerrado lo controla el padre (varias secciones pueden estar
 * abiertas a la vez). Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/PanelAcordeon.tsx
 */

import { type ComponentType, type ReactNode } from 'react';
import { ChevronDown, type LucideProps } from 'lucide-react';

export function PanelAcordeon({
  id,
  titulo,
  Icono,
  resumen,
  abierto,
  onToggle,
  children,
}: {
  id: string;
  titulo: string;
  Icono: ComponentType<LucideProps>;
  resumen?: ReactNode;
  abierto: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie shadow-tarjeta-panel">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        data-testid={`config-acordeon-${id}`}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${abierto ? 'bg-superficie-2' : 'hover:bg-superficie-2'}`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie-2 text-texto-3">
          <Icono size={16} />
        </span>
        <h3 className="text-[13.5px] font-semibold text-texto">{titulo}</h3>
        <div className="ml-auto flex items-center gap-2.5">
          {resumen != null && <span className="text-[12px] text-texto-4">{resumen}</span>}
          <ChevronDown
            size={18}
            className={`shrink-0 text-texto-3 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {abierto && (
        <div className="animar-entrada border-t border-borde bg-superficie-2 p-3.5">{children}</div>
      )}
    </div>
  );
}

export default PanelAcordeon;
