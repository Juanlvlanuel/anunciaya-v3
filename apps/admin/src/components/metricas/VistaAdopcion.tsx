/**
 * metricas/VistaAdopcion.tsx
 * ==========================
 * Pestaña ② "Adopción de la app": ¿les sirve la app? Dos lados — NEGOCIOS (cuántos de los que pagan
 * usan ScanYA + lista de en-riesgo para atender) y CLIENTES (totales/activos/inactivos + curva de
 * engagement). "Usar la app" = venta ScanYA confirmada; ventana de actividad = 30 días.
 *
 * Ubicación: apps/admin/src/components/metricas/VistaAdopcion.tsx
 */

import { Smartphone, AlertTriangle, ChevronRight, UserCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetricasAdopcion } from '../../hooks/queries/useMetricas';
import { useNavegacionPanel } from '../../stores/useNavegacionPanel';
import { AvatarNegocio } from '../negocios/avatares';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { TooltipMetricas, COLOR, EJE_PROPS, ejeXDe, etiquetaPunto, FMT_NUM, BarraMetricas, KpiInline, FilaKpisInline, type NavMetricas } from './piezas';

function textoDias(dias: number | null): string {
  if (dias === null) return 'Nunca ha usado la app';
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}

export function VistaAdopcion({ nav }: { nav: NavMetricas }) {
  const { data, isLoading, isError } = useMetricasAdopcion(nav.periodo);
  const navegar = useNavegacionPanel((s) => s.navegar);

  // Barra superior (tabs + selector) SIEMPRE visible; los KPIs aparecen al cargar los datos.
  const barra = (
    <BarraMetricas {...nav}>
      {data && (
        <FilaKpisInline>
          <KpiInline testid="metricas-adopcion-usan" etiqueta="Usan la app" valor={`${FMT_NUM.format(data.negocios.activosEnApp.valor)}/${FMT_NUM.format(data.negocios.totalQuePagan)}`} />
          <KpiInline testid="metricas-adopcion-clientes-total" etiqueta="Clientes" valor={FMT_NUM.format(data.clientes.total)} />
          <KpiInline testid="metricas-adopcion-clientes-activos" etiqueta="Activos" valor={FMT_NUM.format(data.clientes.activos.valor)} acento="ok" />
          <KpiInline testid="metricas-adopcion-clientes-inactivos" etiqueta="Inactivos" valor={FMT_NUM.format(data.clientes.inactivos)} />
        </FilaKpisInline>
      )}
    </BarraMetricas>
  );

  if (isLoading) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="cargando" icono={Smartphone} titulo="Cargando adopción…" /></div>;
  }
  if (isError || !data) {
    return <div className="flex flex-col gap-5 lg:gap-6">{barra}<EstadoSeccion variante="error" icono={Smartphone} titulo="No se pudieron cargar las métricas." descripcion="Revisa tu conexión e inténtalo de nuevo." /></div>;
  }

  const { serieClientesActivos, enRiesgo } = data;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {barra}

      {/* PC: 2 columnas de igual alto — Negocios en riesgo (izq) + gráfica (der). Móvil: apilado (gráfica arriba). */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:gap-5">
      {/* Clientes activos (PC: derecha). Header calcado del de "Negocios en riesgo"; el chart
          se ancla al fondo (mt-auto) para igualar el alto del otro card SIN agrandar la gráfica. */}
      <section data-testid="metricas-grafica-clientes" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel lg:order-2">
        <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <UserCheck size={17} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-semibold text-texto">Clientes activos</span>
            <span className="text-[12px] text-texto-3">Cuántos clientes compraron cada mes</span>
          </span>
        </header>
        <div className="mt-auto p-4">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={serieClientesActivos} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={COLOR.grid} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickFormatter={etiquetaPunto} {...ejeXDe(serieClientesActivos)} />
                <YAxis allowDecimals={false} {...EJE_PROPS} />
                <Tooltip content={<TooltipMetricas tipo="numero" />} />
                <Line type="monotone" dataKey="activos" name="Clientes activos" stroke={COLOR.marca} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Negocios en riesgo (PC: izquierda) */}
      <section data-testid="metricas-en-riesgo" className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel lg:order-1">
        <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
            <AlertTriangle size={17} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-semibold text-texto">Negocios en riesgo</span>
            <span className="text-[12px] text-texto-3">Pagan pero no usan la app — conviene contactarlos</span>
          </span>
          {enRiesgo.total > 0 && (
            <span className="grid min-w-[22px] shrink-0 place-items-center rounded-full bg-marca-suave px-1.5 text-[11px] font-semibold text-marca">
              {enRiesgo.total}
            </span>
          )}
        </header>

        {enRiesgo.total === 0 ? (
          <div className="px-4 py-7 text-center text-[13px] text-texto-3">Todos los negocios que pagan están usando la app. 🎉</div>
        ) : (
          <ul className="flex max-h-[600px] flex-col overflow-y-auto p-1.5">
            {enRiesgo.items.map((n) => (
              <li key={n.negocioId}>
                <button
                  type="button"
                  data-testid={`metricas-riesgo-${n.negocioId}`}
                  onClick={() => navegar('negocios', { negocios: { resaltarId: n.negocioId } })}
                  className="group flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-marca-suave"
                >
                  <AvatarNegocio nombre={n.nombre} logoUrl={n.logoUrl} tam={36} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium text-texto">{n.nombre}</span>
                    <span className="truncate text-[12px] text-texto-3">{textoDias(n.diasSinUsar)}</span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] text-texto-3">
                    {FMT_NUM.format(n.clientes)} {n.clientes === 1 ? 'cliente' : 'clientes'}
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-texto-4 opacity-0 transition group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

export default VistaAdopcion;
