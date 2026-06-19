/**
 * PanelAcordeon.tsx
 * =================
 * Panel de la sección Configuración con dos modos según el ancho:
 *  - HORIZONTAL (escritorio ≥1024px): cada sección es una franja vertical lado a lado. La activa se
 *    ensancha (`flex-1`) y muestra su contenido apilado; las inactivas quedan como tiras delgadas con
 *    el título escrito en vertical. Se expande hacia los lados, no hacia abajo.
 *  - VERTICAL (móvil <1024px): barra horizontal que se despliega hacia abajo (acordeón clásico).
 *
 * El padre controla cuál sección está activa (una a la vez). El acordeón crece con el contenido
 * (sin alto fijo): las tiras se estiran a la altura de la sección abierta. Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/PanelAcordeon.tsx
 */

import { type ComponentType, type ReactNode } from 'react';
import { ChevronDown, type LucideProps } from 'lucide-react';

const CUADRO_ICONO = 'grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde text-texto-3';

export function PanelAcordeon({
  id,
  titulo,
  Icono,
  resumen,
  activa,
  onActivar,
  horizontal,
  children,
}: {
  id: string;
  titulo: string;
  Icono: ComponentType<LucideProps>;
  resumen?: ReactNode;
  activa: boolean;
  onActivar: () => void;
  horizontal: boolean;
  children: ReactNode;
}) {
  // ---------- HORIZONTAL (escritorio) ----------
  if (horizontal) {
    // Tira colapsada: ícono · título en vertical · resumen en vertical.
    if (!activa) {
      return (
        <button
          type="button"
          onClick={onActivar}
          data-testid={`config-acordeon-${id}`}
          className="flex w-[132px] flex-none flex-col items-center gap-2.5 rounded-[12px] border border-borde bg-superficie-2 px-3 py-3.5 text-center transition hover:bg-marca-suave"
        >
          <span className={`${CUADRO_ICONO} bg-superficie`}>
            <Icono size={16} />
          </span>
          <span className="text-[13px] font-semibold leading-snug text-texto">{titulo}</span>
          {resumen != null && <span className="mt-auto text-[13px] text-texto-4">{resumen}</span>}
        </button>
      );
    }
    // Panel abierto (ensanchado): cabecera horizontal + contenido apilado.
    return (
      <div
        data-testid={`config-acordeon-${id}`}
        className="flex w-[600px] max-w-full shrink-0 flex-col overflow-hidden rounded-[12px] border border-borde bg-superficie shadow-tarjeta-panel"
      >
        <div className="flex flex-none items-center gap-3 border-b border-borde px-4 py-3">
          <span className={`${CUADRO_ICONO} bg-superficie-2`}>
            <Icono size={16} />
          </span>
          <h3 className="text-[13.5px] font-semibold text-texto">{titulo}</h3>
          {resumen != null && <span className="ml-auto text-[13px] text-texto-4">{resumen}</span>}
        </div>
        <div className="animar-entrada bg-superficie-2 p-3">{children}</div>
      </div>
    );
  }

  // ---------- VERTICAL (móvil) ----------
  return (
    <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie shadow-tarjeta-panel">
      <button
        type="button"
        onClick={onActivar}
        aria-expanded={activa}
        data-testid={`config-acordeon-${id}`}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${activa ? 'bg-superficie-2' : 'hover:bg-superficie-2'}`}
      >
        <span className={`${CUADRO_ICONO} bg-superficie-2`}>
          <Icono size={16} />
        </span>
        <h3 className="text-[13.5px] font-semibold text-texto">{titulo}</h3>
        <div className="ml-auto flex items-center gap-2.5">
          {resumen != null && <span className="text-[13px] text-texto-4">{resumen}</span>}
          <ChevronDown
            size={18}
            className={`shrink-0 text-texto-3 transition-transform duration-200 ${activa ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {activa && <div className="animar-entrada border-t border-borde bg-superficie-2 p-3">{children}</div>}
    </div>
  );
}

export default PanelAcordeon;
