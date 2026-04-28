/**
 * TabResenas.tsx — Pestaña de Reseñas del módulo Reportes BS
 */

import { Star, MessageSquare, MessageCircleWarning, Reply, Users } from 'lucide-react';
import { useReporteResenas } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import { PanelTitulo, TablaHeader, KpiCard, formatearSemana } from './ReporteUI';

interface TabResenasProps {
  fechaInicio: string;
  fechaFin: string;
  solo?: 'kpis' | 'body';
}

export function TabResenas({ fechaInicio, fechaFin, solo = 'body' }: TabResenasProps) {
  const { data, isPending } = useReporteResenas(fechaInicio, fechaFin);

  if (isPending) {
    if (solo === 'kpis') return null;
    return (
      <div className="flex items-center justify-center py-20" data-testid="reporte-resenas-loading">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    if (solo === 'kpis') return null;
    return (
      <div className="text-center py-16 text-slate-600 font-medium" data-testid="reporte-resenas-vacio">
        No hay datos de reseñas para este período
      </div>
    );
  }

  // ─── Solo KPIs ────────────────────────────────────────────────────────
  if (solo === 'kpis') {
    return (
      <CarouselKPI>
        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0" data-testid="reporte-resenas-kpis">
          <KpiCard
            icono={MessageSquare}
            label="Total reseñas"
            valor={data.totalResenas}
            color="blue"
            testId="reporte-metrica-total-resenas"
          />
          <KpiCard
            icono={MessageCircleWarning}
            label="Sin responder"
            valor={data.sinResponder}
            color="amber"
            testId="reporte-metrica-sin-responder"
          />
          <KpiCard
            icono={Reply}
            label="Tasa respuesta"
            valor={`${data.tasaRespuesta}%`}
            color="emerald"
            testId="reporte-metrica-tasa-respuesta"
          />
        </div>
      </CarouselKPI>
    );
  }

  // ─── Solo Body (tablas) ──────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 2xl:gap-3" data-testid="reporte-resenas">
        {/* Distribución de estrellas */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-distribucion-estrellas">
          <PanelTitulo icono={Star} titulo="Distribución de estrellas" />
          <TablaHeader columnas={['Rating', 'Cantidad', '%']} />
          <div className="divide-y-[1.5px] divide-slate-300">
            {[5, 4, 3, 2, 1].map((rating) => {
              const item = data.distribucionEstrellas.find((d) => d.rating === rating);
              return (
                <div key={rating} className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900">
                    {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                  </div>
                  <div className={`flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-semibold ${
                    rating >= 4 ? 'text-emerald-600' : rating === 3 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {item?.cantidad ?? 0}
                  </div>
                  <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">
                    {item?.porcentaje ?? 0}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tendencia de rating — siempre visible */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tendencia-rating">
          <PanelTitulo icono={Star} titulo="Tendencia de rating" />
          <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            {['Semana', 'Promedio', 'Reseñas'].map((col) => (
              <div key={col} className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-8 2xl:h-9 flex items-center px-3">
                {col}
              </div>
            ))}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y-[1.5px] divide-slate-300">
            {data.tendenciaRating.length > 0 ? (
              data.tendenciaRating.map((t) => (
                <div key={t.semana} className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                  <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900 whitespace-nowrap">{formatearSemana(t.semana)}</div>
                  <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-600">{(Math.round(t.promedio * 10) / 10)}★</div>
                  <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{t.cantidad}</div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Sin datos de tendencia en este período</p>
            )}
          </div>
        </div>

        {/* Respuestas por persona (dueño + empleados) — con avatares */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-respuestas-por-responder">
          <PanelTitulo icono={Users} titulo="Respuestas por persona" />
          {/* Header custom con las mismas columnas que las filas */}
          <div className="grid bg-slate-300 px-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 60px' }}>
            {['Persona', 'Total', 'Días'].map((col, idx) => (
              <div
                key={col}
                className={`text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-8 2xl:h-9 flex items-center ${idx > 0 ? 'justify-center' : ''}`}
              >
                {col}
              </div>
            ))}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y-[1.5px] divide-slate-300">
            {data.respuestasPorResponder.length > 0 ? (
              data.respuestasPorResponder.map((r) => (
                <div
                  key={r.id}
                  className="grid items-center px-3 py-3"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 60px' }}
                  data-testid={`responder-${r.id}`}
                >
                  {/* Columna 1: Badge arriba + nombre abajo */}
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2 overflow-hidden">
                    {r.esDueno && (
                      <span
                        className="self-start text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-white border border-indigo-300 px-1.5 py-0.5 rounded-md"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                      >
                        Dueño
                      </span>
                    )}
                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900 truncate">{r.nombre}</span>
                  </div>
                  {/* Columna 2: Respondidas */}
                  <div className="flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{r.respondidas}</div>
                  {/* Columna 3: Tiempo prom. */}
                  <div className="flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{r.tiempoPromDias}d</div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">
                Nadie ha respondido reseñas en este período
              </p>
            )}
          </div>
        </div>
    </div>
  );
}
