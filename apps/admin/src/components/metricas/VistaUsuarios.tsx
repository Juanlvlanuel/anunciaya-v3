/**
 * metricas/VistaUsuarios.tsx
 * ==========================
 * Pestaña ③ "Usuarios y comunidad": la base de usuarios finales. KPIs (total, nuevos, activos, %
 * verificados) + registros por mes + reparto personal/comercial + top ciudades. Solo super y gerente
 * (el vendedor no entra; la pestaña no se le muestra). Alcance por jerarquía+región lo aplica el backend.
 *
 * Ubicación: apps/admin/src/components/metricas/VistaUsuarios.tsx
 */

import { Users, UserPlus, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { PeriodoSel } from '../../services/metricasService';
import { useMetricasUsuarios } from '../../hooks/queries/useMetricas';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { TarjetaKpi, GraficaCard, Ranking, TooltipMetricas, CursorBarra, GAP_BARRAS, COLOR, EJE_PROPS, ejeXDe, etiquetaPunto, FMT_NUM } from './piezas';

export function VistaUsuarios({ periodo }: { periodo: PeriodoSel }) {
  const { data, isLoading, isError } = useMetricasUsuarios(periodo);

  if (isLoading) {
    return <EstadoSeccion variante="cargando" icono={Users} titulo="Cargando usuarios…" />;
  }
  if (isError || !data) {
    return <EstadoSeccion variante="error" icono={Users} titulo="No se pudieron cargar las métricas." descripcion="Revisa tu conexión e inténtalo de nuevo." />;
  }

  const { kpis, serieRegistros, distribucion, topCiudades } = data;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 2xl:gap-4">
        <TarjetaKpi testid="metricas-usuarios-total" icono={Users} etiqueta="Usuarios" kpi={kpis.total} />
        <TarjetaKpi testid="metricas-usuarios-nuevos" icono={UserPlus} etiqueta="Nuevos" kpi={kpis.nuevos} sentido="positivo" />
        <TarjetaKpi testid="metricas-usuarios-activos" icono={UserCheck} etiqueta="Activos" kpi={kpis.activos} acento="ok" />
      </div>

      {/* Gráfico (mitad izquierda) + Tipo de cuenta y Usuarios por ciudad apilados (mitad derecha) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:gap-5">
        <GraficaCard testid="metricas-grafica-registros" titulo="Usuarios nuevos" subtitulo="Cuántos se registraron cada mes" alto={300}>
          <BarChart data={serieRegistros} barCategoryGap={GAP_BARRAS} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeXDe(serieRegistros)} />
            <YAxis allowDecimals={false} {...EJE_PROPS} />
            <Tooltip content={<TooltipMetricas tipo="numero" />} cursor={<CursorBarra />} />
            <Bar dataKey="registros" name="Registros" fill={COLOR.marca} radius={[3, 3, 0, 0]} />
          </BarChart>
        </GraficaCard>
        <div className="flex flex-col gap-4 2xl:gap-5">
          <DistribucionTipo personal={distribucion.personal} comercial={distribucion.comercial} />
          <Ranking
            testid="metricas-top-ciudades"
            titulo="Usuarios por ciudad"
            items={topCiudades.map((c) => ({ etiqueta: c.ciudad, valor: c.total }))}
            vacioTexto="Aún no hay usuarios con ciudad registrada."
            unidad="usuarios"
          />
        </div>
      </div>
    </div>
  );
}

function DistribucionTipo({ personal, comercial }: { personal: number; comercial: number }) {
  const total = personal + comercial;
  const pctPersonal = total > 0 ? (personal / total) * 100 : 0;
  const pctComercial = total > 0 ? (comercial / total) * 100 : 0;
  return (
    <section data-testid="metricas-distribucion-tipo" className="flex flex-col gap-3.5 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel 2xl:p-5">
      <h3 className="text-[14px] font-semibold text-texto">Tipo de cuenta</h3>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-superficie-2">
        <div className="h-full" style={{ width: `${pctPersonal}%`, background: COLOR.marca }} />
        <div className="h-full" style={{ width: `${pctComercial}%`, background: COLOR.marca2 }} />
      </div>
      <div className="flex flex-col gap-2">
        <Leyenda color={COLOR.marca} etiqueta="Personal" valor={personal} pct={pctPersonal} />
        <Leyenda color={COLOR.marca2} etiqueta="Comercial" valor={comercial} pct={pctComercial} />
      </div>
    </section>
  );
}

function Leyenda({ color, etiqueta, valor, pct }: { color: string; etiqueta: string; valor: number; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-texto-2">{etiqueta}</span>
      <span className="font-semibold text-texto tabular-nums">{FMT_NUM.format(valor)}</span>
      <span className="w-10 text-right text-texto-4 tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

export default VistaUsuarios;
