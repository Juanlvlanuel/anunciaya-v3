/**
 * metricas/VistaUsuarios.tsx
 * ==========================
 * Pestaña ③ "Usuarios y comunidad": la base de usuarios finales. KPIs (total, nuevos, activos, %
 * verificados) + registros por mes + reparto personal/comercial + top ciudades. Solo super y gerente
 * (el vendedor no entra; la pestaña no se le muestra). Alcance por jerarquía+región lo aplica el backend.
 *
 * Ubicación: apps/admin/src/components/metricas/VistaUsuarios.tsx
 */

import { Users, UserPlus, PieChart, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetricasUsuarios } from '../../hooks/queries/useMetricas';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { Ranking, CabeceraCard, TooltipMetricas, CursorBarra, GAP_BARRAS, COLOR, EJE_PROPS, ejeXDe, etiquetaPunto, FMT_NUM, BarraMetricas, KpiInline, FilaKpisInline, type NavMetricas } from './piezas';

export function VistaUsuarios({ nav }: { nav: NavMetricas }) {
  const { data, isLoading, isError } = useMetricasUsuarios(nav.periodo);
  const kpis = data?.kpis;

  // Barra superior (tabs + selector) SIEMPRE visible; los KPIs aparecen al cargar los datos.
  const barra = (
    <BarraMetricas {...nav}>
      {kpis && (
        <FilaKpisInline>
          <KpiInline testid="metricas-usuarios-total" etiqueta="Usuarios" valor={FMT_NUM.format(kpis.total.valor)} />
          <KpiInline testid="metricas-usuarios-nuevos" etiqueta="Nuevos" valor={FMT_NUM.format(kpis.nuevos.valor)} />
          <KpiInline testid="metricas-usuarios-activos" etiqueta="Activos" valor={FMT_NUM.format(kpis.activos.valor)} acento="ok" />
        </FilaKpisInline>
      )}
    </BarraMetricas>
  );

  if (isLoading) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="cargando" icono={Users} titulo="Cargando usuarios…" /></div>;
  }
  if (isError || !data) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="error" icono={Users} titulo="No se pudieron cargar las métricas." descripcion="Revisa tu conexión e inténtalo de nuevo." /></div>;
  }

  const { serieRegistros, distribucion, topCiudades } = data;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {barra}

      {/* 3 columnas: gráfica de registros · tipo de cuenta · usuarios por ciudad. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:gap-5">
        {/* Usuarios nuevos — header calcado del de "Negocios en riesgo"; el chart se ancla al fondo
            (mt-auto) para igualar el alto de la columna derecha SIN agrandar la gráfica. */}
        <section data-testid="metricas-grafica-registros" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
          <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
              <UserPlus size={17} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-semibold text-texto">Usuarios nuevos</span>
              <span className="text-[12px] text-texto-3">Cuántos se registraron cada mes</span>
            </span>
          </header>
          <div className="mt-auto p-4">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={serieRegistros} barCategoryGap={GAP_BARRAS} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeXDe(serieRegistros)} />
                  <YAxis allowDecimals={false} {...EJE_PROPS} />
                  <Tooltip content={<TooltipMetricas tipo="numero" />} cursor={<CursorBarra />} />
                  <Bar dataKey="registros" name="Registros" fill={COLOR.marca} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        <DistribucionTipo personal={distribucion.personal} comercial={distribucion.comercial} />
        <Ranking
          testid="metricas-top-ciudades"
          icono={MapPin}
          titulo="Usuarios por ciudad"
          subtitulo="Dónde están registrados"
          items={topCiudades.map((c) => ({ etiqueta: c.ciudad, valor: c.total }))}
          vacioTexto="Aún no hay usuarios con ciudad registrada."
          unidad="usuarios"
        />
      </div>
    </div>
  );
}

function DistribucionTipo({ personal, comercial }: { personal: number; comercial: number }) {
  const total = personal + comercial;
  const pctPersonal = total > 0 ? (personal / total) * 100 : 0;
  const pctComercial = total > 0 ? (comercial / total) * 100 : 0;
  return (
    <section data-testid="metricas-distribucion-tipo" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel">
      <CabeceraCard Icono={PieChart} titulo="Tipo de cuenta" subtitulo="Personal vs. comercial" />
      <div className="flex flex-col gap-3.5 p-4 2xl:p-5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-superficie-2">
          <div className="h-full" style={{ width: `${pctPersonal}%`, background: COLOR.marca }} />
          <div className="h-full" style={{ width: `${pctComercial}%`, background: COLOR.marca2 }} />
        </div>
        <div className="flex flex-col gap-2">
          <Leyenda color={COLOR.marca} etiqueta="Personal" valor={personal} pct={pctPersonal} />
          <Leyenda color={COLOR.marca2} etiqueta="Comercial" valor={comercial} pct={pctComercial} />
        </div>
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
