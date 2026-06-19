/**
 * MenuAcciones.tsx
 * ================
 * Menú de acciones por fila (botón "⋯" + dropdown) para las pestañas Ciudades y
 * Regiones. Cierra al hacer clic fuera. Tokens del Panel.
 *
 * Ubicación: apps/admin/src/components/ciudades/MenuAcciones.tsx
 */

import { useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';

export interface AccionMenu {
  etiqueta: string;
  icono?: ReactNode;
  onClick: () => void;
  peligro?: boolean;
}

export function MenuAcciones({ acciones, testid }: { acciones: AccionMenu[]; testid?: string }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        data-testid={testid}
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        aria-label="Acciones"
        className="grid h-8 w-8 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
      >
        <MoreVertical size={16} />
      </button>
      {abierto && (
        <div className="animar-entrada absolute right-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel">
          {acciones.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAbierto(false);
                a.onClick();
              }}
              className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition hover:bg-marca-suave ${
                a.peligro ? 'text-peligro' : 'text-texto'
              }`}
            >
              {a.icono && <span className={a.peligro ? 'text-peligro' : 'text-texto-3'}>{a.icono}</span>}
              <span className="flex-1 truncate">{a.etiqueta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuAcciones;
