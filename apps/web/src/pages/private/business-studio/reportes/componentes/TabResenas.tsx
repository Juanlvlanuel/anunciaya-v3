/**
 * TabResenas.tsx — Pestaña de Reseñas del módulo Reportes BS
 */

import { Star, MessageSquare, MessageCircleWarning, Reply, Users } from 'lucide-react';
import { useReporteResenas } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { obtenerIniciales } from '../../../../../utils/obtenerIniciales';
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
          {[5, 4, 3, 2, 1].map((rating, i) => {
            const item = data.distribucionEstrellas.find((d) => d.rating === rating);
            return (
              <div key={rating} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">
                  {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                </div>
                <div className={`flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold ${
                  rating >= 4 ? 'text-emerald-600' : rating === 3 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {item?.cantidad ?? 0}
                </div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">
                  {item?.porcentaje ?? 0}%
                </div>
              </div>
            );
          })}
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
          <div className="max-h-64 overflow-y-auto">
            {data.tendenciaRating.length > 0 ? (
              data.tendenciaRating.map((t, i) => (
                <div key={t.semana} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                  <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 whitespace-nowrap">{formatearSemana(t.semana)}</div>
                  <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-600">{(Math.round(t.promedio * 10) / 10)}★</div>
                  <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{t.cantidad}</div>
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
          <TablaHeader columnas={['Responder', 'Respondidas', 'Tiempo prom.']} />
          <div className="max-h-64 overflow-y-auto">
            {data.respuestasPorResponder.length > 0 ? (
              data.respuestasPorResponder.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-2.5 px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                  data-testid={`responder-${r.id}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {r.fotoUrl ? (
                      <img src={r.fotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-indigo-700">{obtenerIniciales(r.nombre)}</span>
                    )}
                  </div>
                  {/* Nombre + badge */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{r.nombre}</span>
                    {r.esDueno && (
                      <span className="shrink-0 text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 rounded-md">
                        Dueño
                      </span>
                    )}
                  </div>
                  {/* Respondidas */}
                  <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600 shrink-0">{r.respondidas}</span>
                  {/* Tiempo */}
                  <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 shrink-0 w-12 lg:w-10 2xl:w-12 text-right">{r.tiempoPromDias}d</span>
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
