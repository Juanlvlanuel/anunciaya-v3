/**
 * VacantesEmpty.tsx — Estado vacío: primer pull-to-action para
 * negocios que aún no han publicado ninguna vacante.
 */

import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';

interface Props {
  onNuevaVacante: () => void;
}

export function VacantesEmpty({ onNuevaVacante }: Props) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl px-10 py-16 text-center">
      <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-linear-to-br from-sky-50 to-sky-100 grid place-items-center text-sky-700">
        <Icon icon={ICONOS.vacante} className="w-11 h-11" />
      </div>
      <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900 mb-2">
        Aún no tienes vacantes publicadas
      </h2>
      <p className="text-[15px] text-slate-600 leading-snug max-w-md mx-auto mb-6">
        Publica tu primera oferta de empleo y aparecerá en la sección <b>Servicios</b> de
        AnunciaYA para que los vecinos de Puerto Peñasco puedan contactarte directamente.
      </p>
      <button
        type="button"
        onClick={onNuevaVacante}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 text-white font-semibold text-[15px] lg:cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <Icon icon={ICONOS.nuevo} className="w-5 h-5" />
        Publicar primera vacante
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-3xl mx-auto mt-8">
        <Tip num={1} title="Alcance local">
          Tus vacantes solo se muestran a usuarios en Puerto Peñasco.
        </Tip>
        <Tip num={2} title="Contacto directo">
          Los candidatos te escriben por ChatYA o WhatsApp.
        </Tip>
        <Tip num={3} title="Sin comisiones">
          Publicar vacantes está incluido en tu membresía AnunciaYA.
        </Tip>
      </div>
    </div>
  );
}

function Tip({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3.5 text-left">
      <div className="flex items-center gap-2.5 mb-1 font-bold text-sky-700 text-sm">
        <span className="w-6 h-6 rounded-full bg-sky-600 text-white grid place-items-center text-xs font-extrabold">
          {num}
        </span>
        {title}
      </div>
      <p className="text-[13px] text-slate-600 leading-snug">{children}</p>
    </div>
  );
}
