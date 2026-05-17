/**
 * VacantesLista.tsx — Tabla densa B2B con tabs + buscador.
 * Diseñada para coexistir visualmente con Promociones, Empleados y Sucursales.
 */

import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';
import {
  PillTipoEmpleo,
  PillModalidad,
  PillEstado,
  SalarioTexto,
  VigenciaCell,
} from './VacanteAtoms';
import { diasParaExpirar, uiEstado } from './helpers';
import type { Vacante, FiltroVacantes } from './types';

interface Props {
  vacantes: Vacante[];
  onNueva: () => void;
  onVer: (id: string) => void;
  onEditar: (id: string) => void;
  onPausar: (id: string) => void;
  onReactivar: (id: string) => void;
  onEliminar: (id: string) => void;
}

const TABS: { id: FiltroVacantes; label: string }[] = [
  { id: 'todas',    label: 'Todas' },
  { id: 'activas',  label: 'Activas' },
  { id: 'pausadas', label: 'Pausadas' },
  { id: 'cerradas', label: 'Cerradas' },
];

export function VacantesLista({
  vacantes,
  onNueva, onVer, onEditar, onPausar, onReactivar, onEliminar,
}: Props) {
  const [tab, setTab] = useState<FiltroVacantes>('todas');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vacantes.filter((v) => {
      if (tab === 'activas'  && v.estado !== 'activa')  return false;
      if (tab === 'pausadas' && v.estado !== 'pausada') return false;
      if (tab === 'cerradas' && v.estado !== 'cerrada') return false;
      if (term && !v.titulo.toLowerCase().includes(term) &&
          !v.sucursalNombre.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [vacantes, tab, q]);

  return (
    <>
      {/* Toolbar — tabs + buscador + CTA */}
      <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl p-2.5 mb-4 shadow-xs">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                'px-4 py-2 rounded-lg text-sm font-semibold lg:cursor-pointer transition-colors ' +
                (tab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2.5 px-3.5 h-[38px] border border-slate-200 rounded-lg bg-white">
          <Icon icon={ICONOS.buscar} className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar vacante..."
            className="flex-1 outline-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={onNueva}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors"
        >
          <Icon icon={ICONOS.nuevo} className="w-4 h-4" />
          Nueva vacante
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <header
          className="grid items-center gap-x-4 px-5 py-3.5 bg-slate-900 text-white text-xs font-bold tracking-widest uppercase"
          style={{ gridTemplateColumns: '2.4fr 1.1fr 1fr 1.2fr 1.1fr 1fr 1fr 0.9fr' }}
        >
          <span>Vacante</span>
          <span>Tipo</span>
          <span>Modalidad</span>
          <span>Salario</span>
          <span>Conversaciones</span>
          <span>Estado</span>
          <span>Vigencia</span>
          <span className="text-right">Acciones</span>
        </header>

        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">
            No hay vacantes que coincidan con el filtro.
          </div>
        )}

        {filtered.map((v) => {
          const est = uiEstado(v);
          const dias = diasParaExpirar(v.expiraAt);
          return (
            <div
              key={v.id}
              className="grid items-center gap-x-4 px-5 py-3.5 border-t border-slate-200 hover:bg-slate-50 transition-colors"
              style={{ gridTemplateColumns: '2.4fr 1.1fr 1fr 1.2fr 1.1fr 1fr 1fr 0.9fr' }}
            >
              {/* Col 1 — Vacante */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
                  <Icon icon={ICONOS.vacante} className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[15px] text-slate-900 truncate">
                    {v.titulo}
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-0.5">
                    <Icon icon={ICONOS.sucursal} className="w-3 h-3" />
                    <span className="truncate">{v.sucursalNombre}</span>
                  </div>
                </div>
              </div>

              {/* Col 2-3 — Tipo / Modalidad */}
              <PillTipoEmpleo tipoEmpleo={v.tipoEmpleo} />
              <PillModalidad modalidad={v.modalidad} />

              {/* Col 4 — Salario */}
              <SalarioTexto precio={v.precio} tipoEmpleo={v.tipoEmpleo} />

              {/* Col 5 — Conversaciones */}
              <span className="font-bold text-[15px] tabular-nums text-slate-900">
                {v.totalMensajes}
              </span>

              {/* Col 6 — Estado */}
              <PillEstado estado={est} />

              {/* Col 7 — Vigencia */}
              <VigenciaCell diasParaExpirar={dias} estado={est} />

              {/* Col 8 — Acciones */}
              <div className="flex justify-end gap-1.5">
                <ActionBtn label="Ver" icon={ICONOS.vistas} onClick={() => onVer(v.id)} />
                <ActionBtn label="Editar" icon={ICONOS.editar} onClick={() => onEditar(v.id)} />
                {v.estado === 'pausada' ? (
                  <ActionBtn label="Reactivar" icon={ICONOS.reactivar} onClick={() => onReactivar(v.id)} />
                ) : v.estado === 'activa' ? (
                  <ActionBtn label="Pausar" icon={ICONOS.pausar} onClick={() => onPausar(v.id)} />
                ) : null}
                <ActionBtn
                  label="Eliminar"
                  icon={ICONOS.eliminar}
                  onClick={() => onEliminar(v.id)}
                  variant="danger"
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ActionBtn({
  label, icon, onClick, variant,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'danger';
}) {
  const base =
    'w-[30px] h-[30px] rounded-lg border grid place-items-center lg:cursor-pointer transition-colors';
  const cls =
    variant === 'danger'
      ? `${base} border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700`
      : `${base} border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900`;
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cls}>
      <Icon icon={icon} className="w-[15px] h-[15px]" />
    </button>
  );
}
