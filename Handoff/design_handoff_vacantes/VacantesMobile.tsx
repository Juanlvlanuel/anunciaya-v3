/**
 * VacantesMobile.tsx — Vista compacta para viewports < 1024px (sin `lg:`).
 *
 * No incluye el detalle ni el form: en móvil esos se abren como página
 * dedicada (rutas) o como sheet completo. Aquí solo la lista.
 */

import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';
import {
  PillTipoEmpleo,
  PillModalidad,
  PillEstado,
  SalarioTexto,
} from './VacanteAtoms';
import { uiEstado, calcularKpis } from './helpers';
import type { Vacante } from './types';

interface Props {
  vacantes: Vacante[];
  onAbrir: (id: string) => void;
  onNueva: () => void;
}

export function VacantesMobile({ vacantes, onAbrir, onNueva }: Props) {
  const kpis = calcularKpis(vacantes);

  return (
    <div className="relative pb-24">
      <header className="flex items-center gap-3 px-1 py-3">
        <div className="w-10 h-10 rounded-lg bg-slate-900 text-white grid place-items-center">
          <Icon icon={ICONOS.vacante} className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">
            Vacantes
          </h1>
          <p className="text-[12.5px] text-slate-500">
            {kpis.total} publicadas · {kpis.conversaciones} conversaciones
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <MiniStat tono="emerald" icon={ICONOS.cheque} num={kpis.activas}    label="Activas" />
        <MiniStat tono="violet"  icon={ICONOS.chat}   num={kpis.conversaciones} label="Conversaciones" />
      </div>

      {vacantes.map((v) => {
        const est = uiEstado(v);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onAbrir(v.id)}
            className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 mb-2.5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold leading-tight text-slate-900">
                  {v.titulo}
                </div>
                <div className="flex items-center gap-1 text-[12.5px] text-slate-500 mt-0.5">
                  <Icon icon={ICONOS.sucursal} className="w-3 h-3" />
                  <span className="truncate">{v.sucursalNombre}</span>
                </div>
              </div>
              <PillEstado estado={est} />
            </div>
            <div className="flex gap-1.5 flex-wrap my-2.5">
              <PillTipoEmpleo tipoEmpleo={v.tipoEmpleo} />
              <PillModalidad modalidad={v.modalidad} />
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
              <SalarioTexto precio={v.precio} tipoEmpleo={v.tipoEmpleo} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[13px] font-bold">
                <Icon icon={ICONOS.chat} className="w-3 h-3" />
                {v.totalMensajes}
              </span>
            </div>
          </button>
        );
      })}

      {/* FAB */}
      <button
        type="button"
        onClick={onNueva}
        aria-label="Nueva vacante"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-slate-900 text-white grid place-items-center shadow-xl hover:bg-slate-800 transition-colors"
      >
        <Icon icon={ICONOS.nuevo} className="w-6 h-6" />
      </button>
    </div>
  );
}

function MiniStat({
  tono, icon, num, label,
}: {
  tono: 'emerald' | 'violet';
  icon: string;
  num: number;
  label: string;
}) {
  const tonos = {
    emerald: { wrap: 'border-emerald-200 bg-emerald-50', ic: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-700' },
    violet:  { wrap: 'border-violet-200  bg-violet-50',  ic: 'bg-violet-100  text-violet-700',  num: 'text-violet-700' },
  }[tono];
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${tonos.wrap}`}>
      <div className={`w-8 h-8 rounded-lg grid place-items-center ${tonos.ic}`}>
        <Icon icon={icon} className="w-4 h-4" />
      </div>
      <div>
        <div className={`text-[18px] font-extrabold leading-none tabular-nums ${tonos.num}`}>
          {num}
        </div>
        <div className="text-[12px] font-semibold text-slate-600 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
