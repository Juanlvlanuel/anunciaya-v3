/**
 * BandejaPendientes.tsx
 * ======================
 * Bandeja de "Pendientes por resolver" (cola de trabajo, no notificaciones
 * sociales): efectivo por confirmar, negocios en gracia, vendedores con
 * faltante. Scoped por rol. Datos DEMO por ahora.
 *
 * `variante`:
 *  - 'escritorio' → botón blanco translúcido sobre la barra negra + dropdown.
 *  - 'movil'      → ícono inline (sin contorno) + panel con scrim.
 *
 * Ubicación: apps/admin/src/components/shell/BandejaPendientes.tsx
 */

import { useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { PENDIENTES_DEMO, type RolPanel } from '../../data/menuPanel';

interface BandejaPendientesProps {
  rol: RolPanel;
  variante: 'escritorio' | 'movil';
}

export function BandejaPendientes({ rol, variante }: BandejaPendientesProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto && variante === 'escritorio');
  const pendientes = PENDIENTES_DEMO[rol];
  if (!pendientes) return null;

  const lista = (
    <div className="rounded-[12px] border border-borde bg-superficie p-1.5 shadow-pop-panel">
      <div className="flex items-center justify-between px-2.5 py-1.5 text-sm font-semibold text-texto-3">
        <span>Pendientes por resolver</span>
        <span>{pendientes.contador}</span>
      </div>
      {pendientes.items.map((n, i) => {
        const Icono = iconoDeSeccion(n.icono);
        return (
          <button
            key={i}
            type="button"
            className="flex w-full items-start gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition hover:bg-marca-suave"
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-marca-suave text-marca">
              <Icono size={15} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-texto">{n.titulo}</span>
              <span className="text-[11px] text-texto-3">{n.subtitulo}</span>
            </span>
            <ChevronRight size={15} className="mt-1.5 shrink-0 text-texto-4" />
          </button>
        );
      })}
    </div>
  );

  if (variante === 'movil') {
    return (
      <>
        <button
          type="button"
          data-testid="pendientes-movil"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Pendientes por resolver"
          className="relative grid h-10 w-10 place-items-center text-white/80"
        >
          <Bell size={24} />
          {pendientes.contador > 0 && (
            <span className="txt-badge absolute -top-0.5 right-0.5 grid min-w-[16px] place-items-center rounded-full bg-peligro px-1 text-[9px] font-bold text-white">
              {pendientes.contador > 9 ? '9+' : pendientes.contador}
            </span>
          )}
        </button>
        {abierto && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAbierto(false)} />
            <div className="animar-entrada fixed inset-x-3 top-16 z-50">{lista}</div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="pendientes-escritorio"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Pendientes por resolver"
        className="relative grid h-10 w-10 place-items-center rounded-[10px] text-white/72 transition hover:bg-white/12 hover:text-white"
      >
        <Bell size={20} />
        {pendientes.contador > 0 && (
          <span className="txt-badge absolute right-0 -top-0.5 grid min-w-[16px] place-items-center rounded-full border-2 border-[#0e0f13] bg-peligro px-1 text-[9px] font-bold text-white">
            {pendientes.contador > 9 ? '9+' : pendientes.contador}
          </span>
        )}
      </button>
      {abierto && <div className="animar-entrada absolute right-0 z-30 mt-2 w-[312px]">{lista}</div>}
    </div>
  );
}

export default BandejaPendientes;
