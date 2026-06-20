/**
 * BandejaPendientes.tsx
 * ======================
 * Bandeja de "Pendientes por resolver" (cola de trabajo, no notificaciones sociales): efectivo por
 * entregar + negocios en gracia. Scoped por rol. Datos REALES vía `useResumen` (comparte caché con
 * la SeccionResumen). Cada item es accionable: lleva a la sección que resuelve la tarea (deep-link).
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
import { useResumen } from '../../hooks/queries/useResumen';
import { useNavegacionPanel } from '../../stores/useNavegacionPanel';
import type { RolPanel } from '../../data/menuPanel';

interface BandejaPendientesProps {
  rol: RolPanel;
  variante: 'escritorio' | 'movil';
}

interface ItemBandeja {
  icono: string;
  titulo: string;
  subtitulo: string;
  ir: () => void;
}

const FMT_MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export function BandejaPendientes({ rol, variante }: BandejaPendientesProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto && variante === 'escritorio');
  const { data } = useResumen();
  const navegar = useNavegacionPanel((s) => s.navegar);

  const esVendedor = rol === 'vendedor';
  const p = data?.pendientes;
  const contador = p?.contador ?? 0;

  const irA = (seccion: string, filtros?: Parameters<typeof navegar>[1]) => {
    setAbierto(false);
    navegar(seccion, filtros);
  };

  const items: ItemBandeja[] = [];
  if (p) {
    if (esVendedor) {
      if (p.efectivo.monto > 0) {
        items.push({
          icono: 'comisiones',
          titulo: 'Efectivo por entregar',
          subtitulo: `${FMT_MONEDA.format(p.efectivo.monto)} sin entregar`,
          ir: () => irA('comisiones'),
        });
      }
    } else if (p.efectivo.totalVendedores > 0) {
      items.push({
        icono: 'comisiones',
        titulo: 'Efectivo por entregar',
        subtitulo: `${p.efectivo.totalVendedores} vendedor(es) · ${FMT_MONEDA.format(p.efectivo.monto)}`,
        ir: () => irA('comisiones'),
      });
    }
    if (p.gracia.total > 0) {
      items.push({
        icono: 'negocios',
        titulo: esVendedor ? 'Mis negocios en gracia' : 'Negocios en gracia',
        subtitulo: `${p.gracia.total} por suspenderse`,
        ir: () => irA('negocios', { negocios: { estadoPago: 'en_gracia' } }),
      });
    }
  }

  const lista = (
    <div className="rounded-[12px] border border-borde bg-superficie p-1.5 shadow-pop-panel">
      <div className="flex items-center justify-between px-2.5 py-1.5 text-sm font-semibold text-texto-3">
        <span>Pendientes por resolver</span>
        <span>{contador}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-2.5 py-5 text-center text-[13px] text-texto-4">Sin pendientes por ahora.</p>
      ) : (
        items.map((n, i) => {
          const Icono = iconoDeSeccion(n.icono);
          return (
            <button
              key={i}
              type="button"
              data-testid={`pendiente-item-${i}`}
              onClick={n.ir}
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
        })
      )}
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
          {contador > 0 && (
            <span className="txt-badge absolute -top-0.5 right-0.5 grid min-w-[16px] place-items-center rounded-full bg-peligro px-1 text-[9px] font-bold text-white">
              {contador > 9 ? '9+' : contador}
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
        {contador > 0 && (
          <span className="txt-badge absolute right-0 -top-0.5 grid min-w-[16px] place-items-center rounded-full border-2 border-[#0e0f13] bg-peligro px-1 text-[9px] font-bold text-white">
            {contador > 9 ? '9+' : contador}
          </span>
        )}
      </button>
      {abierto && <div className="animar-entrada absolute right-0 z-30 mt-2 w-[312px]">{lista}</div>}
    </div>
  );
}

export default BandejaPendientes;
