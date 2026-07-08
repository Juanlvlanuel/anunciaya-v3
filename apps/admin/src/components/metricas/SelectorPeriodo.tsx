/**
 * metricas/SelectorPeriodo.tsx
 * ============================
 * Selector de periodo de Métricas: presets rápidos (Último mes · 3/6/12/24 meses) + rango por fechas
 * específicas (2 calendarios `SelectorFecha`). Devuelve un `PeriodoSel` (preset | rango).
 *
 * El cierre del menú usa un OVERLAY por z-index (no click-fuera): el calendario de `SelectorFecha` se
 * renderiza en un portal (z-60) por ENCIMA del overlay (z-20) y del menú (z-30), así interactuar con el
 * calendario no cierra el menú; un clic en cualquier otro lado sí cae en el overlay y cierra.
 *
 * Ubicación: apps/admin/src/components/metricas/SelectorPeriodo.tsx
 */

import { useState } from 'react';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';
import { SelectorFecha } from '../ui/SelectorFecha';
import type { PeriodoSel } from '../../services/metricasService';

const PRESETS: { meses: number; etiqueta: string }[] = [
  { meses: 1, etiqueta: 'Último mes' },
  { meses: 3, etiqueta: 'Últimos 3 meses' },
  { meses: 6, etiqueta: 'Últimos 6 meses' },
  { meses: 12, etiqueta: 'Últimos 12 meses' },
  { meses: 24, etiqueta: 'Últimos 24 meses' },
];

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtCorto(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  return new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}
function etiquetaActual(p: PeriodoSel): string {
  if (p.tipo === 'rango') return `${fmtCorto(p.desde)} – ${fmtCorto(p.hasta)}`;
  return PRESETS.find((x) => x.meses === p.meses)?.etiqueta ?? `Últimos ${p.meses} meses`;
}

export function SelectorPeriodo({ valor, onCambiar }: { valor: PeriodoSel; onCambiar: (p: PeriodoSel) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState(valor.tipo === 'rango' ? valor.desde : '');
  const [hasta, setHasta] = useState(valor.tipo === 'rango' ? valor.hasta : '');

  const elegirPreset = (meses: number) => { onCambiar({ tipo: 'preset', meses }); setAbierto(false); };
  const aplicarRango = () => {
    if (!desde || !hasta) return;
    onCambiar({ tipo: 'rango', desde, hasta });
    setAbierto(false);
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        data-testid="metricas-selector-periodo"
        data-open={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-borde bg-superficie-2 px-3.5 py-2.5 text-[13px] font-medium text-texto transition hover:bg-marca-suave"
      >
        <CalendarRange size={16} className="text-texto-3" />
        <span>{etiquetaActual(valor)}</span>
        <ChevronDown size={15} className={`text-texto-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <>
          {/* Overlay de cierre (por debajo del menú y del portal del calendario). */}
          <div className="fixed inset-0 z-20" onClick={() => setAbierto(false)} aria-hidden />

          <div className="animar-entrada absolute left-1/2 -translate-x-1/2 lg:left-auto lg:right-0 lg:translate-x-0 top-[calc(100%+6px)] z-30 w-[286px] rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel">
            {/* Presets */}
            {PRESETS.map((p) => {
              const activo = valor.tipo === 'preset' && valor.meses === p.meses;
              return (
                <button
                  key={p.meses}
                  type="button"
                  data-testid={`metricas-periodo-${p.meses}`}
                  data-sel={activo}
                  onClick={() => elegirPreset(p.meses)}
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-texto transition hover:bg-marca-suave"
                >
                  <span className="flex-1">{p.etiqueta}</span>
                  <Check size={15} className={`shrink-0 text-marca ${activo ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })}

            <div className="mx-1 my-1.5 h-px bg-borde" />

            {/* Rango por fechas */}
            <div className="px-1.5 pb-1 pt-0.5">
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-texto-4">Fechas específicas</p>
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-[12px] text-texto-3">
                  Desde
                  <SelectorFecha value={desde} onChange={setDesde} maxDate={hasta || hoyISO()} placeholder="Inicio" testid="metricas-periodo-desde" />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-texto-3">
                  Hasta
                  <SelectorFecha value={hasta} onChange={setHasta} minDate={desde || undefined} maxDate={hoyISO()} placeholder="Fin" testid="metricas-periodo-hasta" />
                </label>
                <button
                  type="button"
                  data-testid="metricas-periodo-aplicar"
                  disabled={!desde || !hasta}
                  onClick={aplicarRango}
                  className="mt-1 rounded-[9px] bg-marca px-3 py-2 text-[12.5px] font-semibold text-marca-contraste transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Aplicar rango
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SelectorPeriodo;
