/**
 * metricas/VistaCrecimiento.tsx
 * =============================
 * Pestaña ① "Crecimiento y dinero": cómo crece AnunciaYA. KPIs (negocios activos, altas, churn,
 * ingresos) con variación vs. periodo anterior + serie altas/bajas por mes + ingresos por mes por
 * concepto + top vendedores (super/gerente). Alcance por rol lo aplica el backend.
 *
 * Ubicación: apps/admin/src/components/metricas/VistaCrecimiento.tsx
 */

import { BarChart3, Store, CircleDollarSign, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RolPanel } from '../../data/menuPanel';
import type { TopVendedor } from '../../services/metricasService';
import { useMetricasCrecimiento } from '../../hooks/queries/useMetricas';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { AvatarNegocio } from '../negocios/avatares';
import {
  TooltipMetricas, CursorBarra, GAP_BARRAS, COLOR, EJE_PROPS, ejeXDe, etiquetaPunto,
  BarraMetricas, KpiInline, FilaKpisInline, FMT_NUM, FMT_MONEDA, CabeceraCard, type NavMetricas,
} from './piezas';

const FMT_COMPACTO = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

export function VistaCrecimiento({ nav, rol }: { nav: NavMetricas; rol: RolPanel }) {
  const { data, isLoading, isError } = useMetricasCrecimiento(nav.periodo);
  const esVendedor = rol === 'vendedor';
  const kpis = data?.kpis;

  // Barra superior (tabs + selector) SIEMPRE visible; los KPIs aparecen cuando ya cargaron los datos.
  const barra = (
    <BarraMetricas {...nav}>
      {kpis && (
        <FilaKpisInline>
          <KpiInline testid="metricas-kpi-negociosActivos" etiqueta={esVendedor ? 'Mi cartera' : 'Negocios activos'} etiquetaCorta={esVendedor ? undefined : 'Neg. Activos'} valor={FMT_NUM.format(kpis.negociosActivos.valor)} />
          <KpiInline testid="metricas-kpi-altas" etiqueta="Altas" valor={FMT_NUM.format(kpis.altas.valor)} />
          <KpiInline testid="metricas-kpi-churn" etiqueta="Bajas" valor={FMT_NUM.format(kpis.churn.valor)} />
          <KpiInline testid="metricas-kpi-ingresos" etiqueta="Ingresos" valor={FMT_MONEDA.format(kpis.ingresos.valor)} acento="ok" />
        </FilaKpisInline>
      )}
    </BarraMetricas>
  );

  if (isLoading) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="cargando" icono={BarChart3} titulo="Cargando crecimiento…" /></div>;
  }
  if (isError || !data) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="error" icono={BarChart3} titulo="No se pudieron cargar las métricas." descripcion="Revisa tu conexión e inténtalo de nuevo." /></div>;
  }

  const { series, topVendedores } = data;
  // Barras DIVERGENTES: altas hacia arriba, bajas hacia abajo (negativo) → una sola columna por
  // periodo (mismo grosor que la de Ingresos) y lectura directa del crecimiento neto.
  const datosCrecimiento = series.crecimiento.map((p) => ({ mes: p.mes, altas: p.altas, bajas: -p.bajas }));
  const ejeX = ejeXDe(series.crecimiento); // misma granularidad para ambas gráficas

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {barra}

      {/* Series (2 gráficas) + ranking de vendedores → 3 columnas, aprovechando todo el ancho. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:gap-5">
        <section data-testid="metricas-grafica-crecimiento" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
          <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
              <Store size={17} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-semibold text-texto">Altas vs. bajas</span>
              <span className="text-[12px] text-texto-3">Negocios nuevos y cancelados cada mes</span>
            </span>
          </header>
          <div className="mt-auto p-4">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={datosCrecimiento} stackOffset="sign" barCategoryGap={GAP_BARRAS} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeX} />
                  <YAxis allowDecimals={false} {...EJE_PROPS} tickFormatter={(v: number) => String(Math.abs(v))} />
                  <Tooltip content={<TooltipMetricas tipo="numero" />} cursor={<CursorBarra />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12.5 }} />
                  <Bar dataKey="altas" name="Altas" fill={COLOR.marca} stackId="g" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="bajas" name="Bajas" fill={COLOR.danger} stackId="g" radius={[0, 0, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section data-testid="metricas-grafica-ingresos" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
          <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
              <CircleDollarSign size={17} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-semibold text-texto">Ingresos</span>
              <span className="text-[12px] text-texto-3">Cuánto cobraste, por forma de pago</span>
            </span>
          </header>
          <div className="mt-auto p-4">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
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
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Top vendedores (super/gerente) — 3ª columna */}
        {topVendedores && <RankingVendedores items={topVendedores} />}
      </div>
    </div>
  );
}

// =============================================================================
// Ranking de vendedores (avatar/foto real + nombre completo + región + gerente)
// =============================================================================

function RankingVendedores({ items }: { items: TopVendedor[] }) {
  const max = items.reduce((m, v) => Math.max(m, v.activos), 0) || 1;
  return (
    <section data-testid="metricas-top-vendedores" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
      <CabeceraCard Icono={Award} titulo="Vendedores con más negocios activos" subtitulo="Ranking por negocios activos" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 2xl:p-5">
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
      </div>
    </section>
  );
}

export default VistaCrecimiento;
