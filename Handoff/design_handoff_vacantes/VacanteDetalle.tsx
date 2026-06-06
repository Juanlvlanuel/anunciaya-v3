/**
 * VacanteDetalle.tsx — Vista de una vacante con sidebar de Actividad
 * y Acciones rápidas. NO contiene lista de candidatos: AnunciaYA solo
 * conecta — las conversaciones se gestionan en ChatYA.
 */

import { Icon } from '@iconify/react';
import { ICONOS } from './iconos';
import {
  PillTipoEmpleo,
  PillModalidad,
  PillEstado,
  SalarioTexto,
} from './VacanteAtoms';
import { formatDias, uiEstado } from './helpers';
import type { Vacante } from './types';

interface Props {
  vacante: Vacante;
  onVolver: () => void;
  onEditar: () => void;
  onPausar: () => void;
  onReactivar: () => void;
  onCerrar: () => void;
  onIrAConversaciones: () => void;
  onVerEnFeedPublico: () => void;
}

export function VacanteDetalle({
  vacante: v,
  onVolver, onEditar, onPausar, onReactivar, onCerrar,
  onIrAConversaciones, onVerEnFeedPublico,
}: Props) {
  const est = uiEstado(v);
  const diasStr = formatDias(v.diasSemana);

  return (
    <>
      {/* Volver + breadcrumb */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <Icon icon={ICONOS.chevron_l} className="w-4 h-4" />
          Volver
        </button>
        <span className="text-sm text-slate-500">
          Vacantes <Icon icon={ICONOS.chevron_r} className="w-3 h-3 inline mx-1" /> {v.titulo}
        </span>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Card principal */}
        <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <header className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1.5">
              <Icon icon={ICONOS.sucursal} className="w-3.5 h-3.5" />
              <span>{v.sucursalNombre} · Puerto Peñasco</span>
            </div>
            <h2 className="text-[26px] font-extrabold tracking-tight text-slate-900 mb-2">
              {v.titulo}
            </h2>
            <div className="flex flex-wrap gap-2 items-center">
              <PillEstado estado={est} />
              <PillTipoEmpleo tipoEmpleo={v.tipoEmpleo} />
              <PillModalidad modalidad={v.modalidad} />
              <SalarioTexto precio={v.precio} tipoEmpleo={v.tipoEmpleo} size="md" />
            </div>
          </header>

          <Section title="Descripción">
            <p className="text-[15px] text-slate-700 leading-relaxed">{v.descripcion}</p>
          </Section>

          <Section title="Requisitos">
            <ChecklistVerde items={v.requisitos} />
          </Section>

          {v.beneficios.length > 0 && (
            <Section title="Beneficios">
              <ChecklistVerde items={v.beneficios} />
            </Section>
          )}

          {(v.horario || diasStr) && (
            <Section title="Horario y días">
              <div className="flex gap-6 flex-wrap text-[15px] text-slate-700">
                {v.horario && (
                  <div className="inline-flex items-center gap-2">
                    <Icon icon={ICONOS.horario} className="w-4 h-4 text-slate-500" />
                    <b className="text-slate-900">{v.horario}</b>
                  </div>
                )}
                {diasStr && (
                  <div className="inline-flex items-center gap-2">
                    <Icon icon={ICONOS.calendario} className="w-4 h-4 text-slate-500" />
                    <b className="text-slate-900">{diasStr}</b>
                  </div>
                )}
              </div>
            </Section>
          )}

          <div className="flex gap-2 items-center px-6 py-4 border-t border-slate-200">
            <ButtonGhost icon={ICONOS.editar} onClick={onEditar}>Editar</ButtonGhost>
            {v.estado === 'pausada' ? (
              <ButtonGhost icon={ICONOS.reactivar} onClick={onReactivar}>Reactivar</ButtonGhost>
            ) : (
              <ButtonGhost icon={ICONOS.pausar} onClick={onPausar}>Pausar</ButtonGhost>
            )}
            {v.estado !== 'cerrada' && (
              <button
                type="button"
                onClick={onCerrar}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm lg:cursor-pointer hover:bg-rose-100 transition-colors"
              >
                <Icon icon={ICONOS.cerrar} className="w-4 h-4" />
                Cerrar vacante
              </button>
            )}
          </div>
        </article>

        {/* Sidebar — Actividad + Acciones rápidas */}
        <aside className="space-y-3">
          <SideCard title="Actividad">
            <ActividadItem
              icon={ICONOS.vistas}
              num={v.totalVistas}
              label="Vistas totales"
            />
            <ActividadItem
              icon={ICONOS.chat}
              num={v.totalMensajes}
              label="Conversaciones iniciadas"
              sub="Candidatos que te escribieron"
            />
            <ActividadItem
              icon={ICONOS.guardar}
              num={v.totalGuardados}
              label="Guardados"
            />
          </SideCard>

          <SideCard title="Acciones rápidas">
            <QuickAction
              icon={ICONOS.chat}
              title="Ver mis conversaciones"
              sub="Abre ChatYA con candidatos de esta vacante"
              onClick={onIrAConversaciones}
            />
            <QuickAction
              icon={ICONOS.vistas}
              title="Ver en feed público"
              sub="Cómo se ve tu vacante en Servicios"
              onClick={onVerEnFeedPublico}
            />
          </SideCard>
        </aside>
      </div>
    </>
  );
}

/* ============================================================
   Locales
   ============================================================ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-5 border-t border-slate-200 first:border-t-0">
      <h3 className="text-[12px] font-bold tracking-widest uppercase text-slate-600 mb-2.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChecklistVerde({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0 mt-0.5">
            <Icon icon={ICONOS.cheque} className="w-3 h-3" />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ButtonGhost({
  icon, onClick, children,
}: {
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <Icon icon={icon} className="w-[15px] h-[15px]" />
      {children}
    </button>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <header className="px-5 py-4 border-b border-slate-200">
        <h3 className="text-[13px] font-bold tracking-widest uppercase text-slate-600">
          {title}
        </h3>
      </header>
      <div>{children}</div>
    </div>
  );
}

function ActividadItem({
  icon, num, label, sub,
}: {
  icon: string;
  num: number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 grid place-items-center shrink-0">
        <Icon icon={icon} className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-extrabold leading-none tabular-nums tracking-tight text-slate-900">
          {num}
        </div>
        <div className="text-[13px] text-slate-500 mt-0.5">
          {label}
          {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon, title, sub, onClick,
}: {
  icon: string;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-4 border-t border-slate-200 first:border-t-0 text-left lg:cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
        <Icon icon={icon} className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <strong className="block text-sm font-bold text-slate-900">{title}</strong>
        <span className="block text-[12.5px] text-slate-500 mt-0.5">{sub}</span>
      </span>
      <Icon icon={ICONOS.chevron_r} className="w-4 h-4 text-slate-400" />
    </button>
  );
}
