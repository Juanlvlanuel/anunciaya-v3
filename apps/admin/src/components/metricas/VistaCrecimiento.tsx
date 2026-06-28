/**
 * metricas/VistaCrecimiento.tsx
 * =============================
 * Pestaña ① "Crecimiento y dinero": cómo crece AnunciaYA. KPIs (negocios activos, altas, churn,
 * ingresos) con variación vs. periodo anterior + serie altas/bajas por mes + ingresos por mes por
 * concepto + top vendedores (super/gerente). Alcance por rol lo aplica el backend.
 *
 * Ubicación: apps/admin/src/components/metricas/VistaCrecimiento.tsx
 */

import { Store, TrendingUp, TrendingDown, CircleDollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { RolPanel } from '../../data/menuPanel';
import type { PeriodoSel, TopVendedor } from '../../services/metricasService';
import { useMetricasCrecimiento } from '../../hooks/queries/useMetricas';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { AvatarNegocio } from '../negocios/avatares';
import {
  TarjetaKpi, GraficaCard, TooltipMetricas, CursorBarra, GAP_BARRAS, COLOR, EJE_PROPS, ejeXDe, etiquetaPunto,
} from './piezas';

const FMT_COMPACTO = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

export function VistaCrecimiento({ periodo, rol }: { periodo: PeriodoSel; rol: RolPanel }) {
  const { data, isLoading, isError } = useMetricasCrecimiento(periodo);
  const esVendedor = rol === 'vendedor';

  if (isLoading) {
    return <EstadoSeccion variante="cargando" icono={BarChart3} titulo="Cargando crecimiento…" />;
  }
  if (isError || !data) {
    return <EstadoSeccion variante="error" icono={BarChart3} titulo="No se pudieron cargar las métricas." descripcion="Revisa tu conexión e inténtalo de nuevo." />;
  }

  const { kpis, series, topVendedores } = data;
  // Barras DIVERGENTES: altas hacia arriba, bajas hacia abajo (negativo) → una sola columna por
  // periodo (mismo grosor que la de Ingresos) y lectura directa del crecimiento neto.
  const datosCrecimiento = series.crecimiento.map((p) => ({ mes: p.mes, altas: p.altas, bajas: -p.bajas }));
  const ejeX = ejeXDe(series.crecimiento); // misma granularidad para ambas gráficas

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 2xl:gap-4">
        <TarjetaKpi testid="metricas-kpi-negociosActivos" icono={Store} etiqueta={esVendedor ? 'Mi cartera' : 'Negocios activos'} kpi={kpis.negociosActivos} />
        <TarjetaKpi testid="metricas-kpi-altas" icono={TrendingUp} etiqueta="Altas" kpi={kpis.altas} sentido="positivo" />
        <TarjetaKpi testid="metricas-kpi-churn" icono={TrendingDown} etiqueta="Bajas" kpi={kpis.churn} sentido="negativo" />
        <TarjetaKpi testid="metricas-kpi-ingresos" icono={CircleDollarSign} etiqueta="Ingresos" kpi={kpis.ingresos} tipo="moneda" acento="ok" sentido="positivo" />
      </div>

      {/* Series */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:gap-5">
        <GraficaCard testid="metricas-grafica-crecimiento" titulo="Altas vs. bajas" subtitulo="Negocios nuevos y cancelados cada mes">
          <BarChart data={datosCrecimiento} stackOffset="sign" barCategoryGap={GAP_BARRAS} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeX} />
            <YAxis allowDecimals={false} {...EJE_PROPS} tickFormatter={(v: number) => String(Math.abs(v))} />
            <Tooltip content={<TooltipMetricas tipo="numero" />} cursor={<CursorBarra />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12.5 }} />
            <Bar dataKey="altas" name="Altas" fill={COLOR.marca} stackId="g" radius={[3, 3, 0, 0]} />
            <Bar dataKey="bajas" name="Bajas" fill={COLOR.danger} stackId="g" radius={[0, 0, 3, 3]} />
          </BarChart>
        </GraficaCard>

        <GraficaCard testid="metricas-grafica-ingresos" titulo="Ingresos" subtitulo="Cuánto cobraste, por forma de pago">
          <BarChart data={series.ingresos} barCategoryGap={GAP_BARRAS} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeX} />
            <YAxis width={50} tickFormatter={(v: number) => `$${FMT_COMPACTO.format(v)}`} {...EJE_PROPS} />
            <Tooltip content={<TooltipMetricas tipo="moneda" />} cursor={<CursorBarra />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12.5 }} />
            <Bar dataKey="tarjeta" stackId="i" name="Tarjeta" fill={COLOR.marca} />
            <Bar dataKey="efectivo" stackId="i" name="Efectivo" fill={COLOR.ok} />
            <Bar dataKey="transferencia" stackId="i" name="Transferencia" fill={COLOR.marca2} />
            <Bar dataKey="otro" stackId="i" name="Otro" fill={COLOR.gris} radius={[3, 3, 0, 0]} />
          </BarChart>
        </GraficaCard>
      </div>

      {/* Top vendedores (super/gerente) */}
      {topVendedores && <RankingVendedores items={topVendedores} />}
    </div>
  );
}

// =============================================================================
// Ranking de vendedores (avatar/foto real + nombre completo + región + gerente)
// =============================================================================

function RankingVendedores({ items }: { items: TopVendedor[] }) {
  const max = items.reduce((m, v) => Math.max(m, v.activos), 0) || 1;
  return (
    <section data-testid="metricas-top-vendedores" className="flex flex-col gap-3 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel 2xl:p-5">
      <h3 className="text-[14px] font-semibold text-texto">Vendedores con más negocios activos</h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-texto-4">Aún no hay vendedores con negocios activos.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((v, i) => (
            <li key={v.usuarioId} className="relative flex items-center gap-3 overflow-hidden rounded-[10px] border border-borde px-2.5 py-2">
              {/* Barra de fondo proporcional */}
              <div className="absolute inset-y-0 left-0 bg-marca-suave" style={{ width: `${(v.activos / max) * 100}%` }} aria-hidden />
              <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-superficie text-[11px] font-bold text-texto-3 shadow-tarjeta-panel">{i + 1}</span>
              <span className="relative shrink-0"><AvatarNegocio nombre={v.nombre} logoUrl={v.avatarUrl} tam={34} /></span>
              <span className="relative flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-medium text-texto">{v.nombre}</span>
                <span className="truncate text-[12px] text-texto-3">
                  {[v.region, v.gerente ? `Gerente: ${v.gerente}` : null].filter(Boolean).join(' · ') || 'Sin región asignada'}
                </span>
              </span>
              <span className="relative shrink-0 text-[14px] font-bold tabular-nums text-texto">
                {v.activos}
                <span className="ml-1 text-[12.5px] font-medium text-texto-3">negocios</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default VistaCrecimiento;
