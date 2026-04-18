/**
 * TabEmpleados.tsx — Pestaña de Empleados del módulo Reportes BS
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, AlertTriangle, ArrowUp, ArrowDown, Users, DollarSign, Trophy, ShieldAlert } from 'lucide-react';
import { useReporteEmpleados } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { obtenerIniciales } from '../../../../../utils/obtenerIniciales';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import { PanelTitulo, formatearMonto, KpiCard } from './ReporteUI';

interface TabEmpleadosProps {
  fechaInicio: string;
  fechaFin: string;
  solo?: 'kpis' | 'body';
}

type CampoOrden = 'nombre' | 'totalTransacciones' | 'montoTotal' | 'ticketPromedio' | 'alertas';
type DireccionOrden = 'asc' | 'desc';

export function TabEmpleados({ fechaInicio, fechaFin, solo = 'body' }: TabEmpleadosProps) {
  const { data, isPending } = useReporteEmpleados(fechaInicio, fechaFin);
  const navigate = useNavigate();

  const [campoOrden, setCampoOrden] = useState<CampoOrden>('montoTotal');
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>('desc');

  const toggleOrden = (campo: CampoOrden) => {
    if (campoOrden === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setCampoOrden(campo);
      setDireccionOrden('desc');
    }
  };

  const abrirEmpleadoEnModulo = (nombre: string) => {
    navigate(`/business-studio/empleados?busqueda=${encodeURIComponent(nombre)}`);
  };

  // Empleados ordenados según el criterio seleccionado
  const empleadosOrdenados = useMemo(() => {
    if (!data?.empleados) return [];
    const copia = [...data.empleados];
    copia.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;
      switch (campoOrden) {
        case 'nombre':
          valorA = a.nombre.toLowerCase();
          valorB = b.nombre.toLowerCase();
          break;
        case 'totalTransacciones':
          valorA = a.totalTransacciones;
          valorB = b.totalTransacciones;
          break;
        case 'montoTotal':
          valorA = a.montoTotal;
          valorB = b.montoTotal;
          break;
        case 'ticketPromedio':
          valorA = a.ticketPromedio;
          valorB = b.ticketPromedio;
          break;
        case 'alertas':
          valorA = a.alertas;
          valorB = b.alertas;
          break;
      }
      if (valorA < valorB) return direccionOrden === 'asc' ? -1 : 1;
      if (valorA > valorB) return direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });
    return copia;
  }, [data, campoOrden, direccionOrden]);

  if (isPending) {
    if (solo === 'kpis') return null;
    return (
      <div className="flex items-center justify-center py-20" data-testid="reporte-empleados-loading">
        <Spinner />
      </div>
    );
  }

  if (!data || data.empleados.length === 0) {
    if (solo === 'kpis') return null;
    return (
      <div className="text-center py-16 text-slate-600 font-medium" data-testid="reporte-empleados-vacio">
        No hay empleados activos en este negocio
      </div>
    );
  }

  // KPIs calculados
  const totalEmpleados = data.empleados.length;
  const ventasTotales = data.empleados.reduce((acc, e) => acc + e.montoTotal, 0);
  const topVendedor = [...data.empleados].sort((a, b) => b.montoTotal - a.montoTotal)[0];
  // Si nadie tiene ventas en el período, no hay "mejor vendedor" que mostrar
  const hayMejorVendedor = topVendedor && topVendedor.montoTotal > 0;
  const alertasTotales = data.empleados.reduce((acc, e) => acc + e.alertas, 0);

  const IconoOrden = ({ campo }: { campo: CampoOrden }) => {
    if (campoOrden !== campo) return null;
    return direccionOrden === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  // ─── Solo KPIs ────────────────────────────────────────────────────────
  if (solo === 'kpis') {
    return (
      <CarouselKPI>
        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0" data-testid="reporte-empleados-kpis">
          <KpiCard
            icono={Users}
            label="Empleados"
            valor={totalEmpleados}
            color="blue"
            testId="reporte-metrica-total-empleados"
          />
          <KpiCard
            icono={DollarSign}
            label="Ventas totales"
            valor={formatearMonto(ventasTotales)}
            color="emerald"
            testId="reporte-metrica-ventas-totales"
          />
          <KpiCard
            icono={Trophy}
            label="Mejor vendedor"
            valor={hayMejorVendedor ? topVendedor.nombre.split(' ').slice(0, 2).join(' ') : '—'}
            color="amber"
            testId="reporte-metrica-top-vendedor"
          />
          <KpiCard
            icono={ShieldAlert}
            label="Alertas generadas"
            valor={alertasTotales}
            color={alertasTotales > 0 ? 'red' : 'slate'}
            testId="reporte-metrica-alertas"
          />
        </div>
      </CarouselKPI>
    );
  }

  // ─── Solo Body (tabla de desempeño) ──────────────────────────────────
  return (
    <>
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tabla-empleados">
        <PanelTitulo icono={UserCog} titulo="Desempeño por empleado" />

        {/* Desktop — tabla */}
        <div className="hidden lg:block">
          {/* Header con columnas clickeables */}
          <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: '1fr 100px 140px 140px 100px' }}>
            <button
              type="button"
              onClick={() => toggleOrden('nombre')}
              className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-9 flex items-center px-3 lg:cursor-pointer hover:bg-slate-400"
            >
              Empleado <span className="ml-1"><IconoOrden campo="nombre" /></span>
            </button>
            <button
              type="button"
              onClick={() => toggleOrden('totalTransacciones')}
              className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-9 flex items-center justify-center px-3 lg:cursor-pointer hover:bg-slate-400 whitespace-nowrap"
            >
              Ventas <span className="ml-1"><IconoOrden campo="totalTransacciones" /></span>
            </button>
            <button
              type="button"
              onClick={() => toggleOrden('montoTotal')}
              className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-9 flex items-center justify-center px-3 lg:cursor-pointer hover:bg-slate-400 whitespace-nowrap"
            >
              Total vendido <span className="ml-1"><IconoOrden campo="montoTotal" /></span>
            </button>
            <button
              type="button"
              onClick={() => toggleOrden('ticketPromedio')}
              className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-9 flex items-center justify-center px-3 lg:cursor-pointer hover:bg-slate-400 whitespace-nowrap"
            >
              Venta promedio <span className="ml-1"><IconoOrden campo="ticketPromedio" /></span>
            </button>
            <button
              type="button"
              onClick={() => toggleOrden('alertas')}
              className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-9 flex items-center justify-center px-3 lg:cursor-pointer hover:bg-slate-400 whitespace-nowrap"
            >
              Alertas <span className="ml-1"><IconoOrden campo="alertas" /></span>
            </button>
          </div>
          {empleadosOrdenados.map((e, i) => {
            const noClickeable = e.esDueno || e.inactivo;
            const claseFila = `w-full text-left grid gap-px ${noClickeable ? '' : 'lg:cursor-pointer hover:bg-slate-200'} ${e.inactivo ? 'opacity-60' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`;
            const contenidoFila = (
              <>
                <div className="flex items-center gap-2 px-3 py-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {e.fotoUrl ? (
                      <img src={e.fotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-indigo-700">{obtenerIniciales(e.nombre)}</span>
                    )}
                  </div>
                  <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{e.nombre}</span>
                  {e.esDueno && (
                    <span className="shrink-0 text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 rounded-md">
                      Dueño
                    </span>
                  )}
                  {e.inactivo && (
                    <span className="shrink-0 text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-slate-700 bg-slate-200 border border-slate-400 px-1.5 py-0.5 rounded-md">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{e.totalTransacciones}</div>
                <div className="flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{formatearMonto(e.montoTotal)}</div>
                <div className="flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{formatearMonto(e.ticketPromedio)}</div>
                <div className="flex items-center justify-center">
                  {e.alertas > 0 ? (
                    <span className="flex items-center gap-1 text-sm lg:text-xs 2xl:text-sm font-bold text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {e.alertas}
                    </span>
                  ) : (
                    <span className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600">0</span>
                  )}
                </div>
              </>
            );
            // Dueño y empleados inactivos NO son clickeables (no abren el módulo Empleados)
            if (noClickeable) {
              return (
                <div
                  key={e.empleadoId}
                  className={claseFila}
                  style={{ gridTemplateColumns: '1fr 100px 140px 140px 100px' }}
                  data-testid={`empleado-fila-${e.empleadoId}`}
                >
                  {contenidoFila}
                </div>
              );
            }
            return (
              <button
                key={e.empleadoId}
                type="button"
                onClick={() => abrirEmpleadoEnModulo(e.nombre)}
                className={claseFila}
                style={{ gridTemplateColumns: '1fr 100px 140px 140px 100px' }}
                data-testid={`empleado-fila-${e.empleadoId}`}
              >
                {contenidoFila}
              </button>
            );
          })}
        </div>

    </div>

      {/* Móvil — cards (fuera del box) */}
      <div className="lg:hidden space-y-2 mt-3">
        {empleadosOrdenados.map((e) => {
          const noClickeable = e.esDueno || e.inactivo;
          const claseCard = `w-full flex items-center gap-3 p-3 h-28 rounded-xl bg-white border-2 border-slate-300 text-left overflow-hidden ${noClickeable ? '' : 'cursor-pointer hover:border-slate-400 hover:shadow-sm'} ${e.inactivo ? 'opacity-60' : ''}`;
          const contenidoCard = (
            <>
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {e.fotoUrl ? (
                  <img src={e.fotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-indigo-700">{obtenerIniciales(e.nombre)}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-base font-bold text-slate-800 truncate">{e.nombre}</p>
                    {e.esDueno && (
                      <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 rounded-md">
                        Dueño
                      </span>
                    )}
                    {e.inactivo && (
                      <span className="shrink-0 text-[10px] font-bold text-slate-700 bg-slate-200 border border-slate-400 px-1.5 py-0.5 rounded-md">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatearMonto(e.montoTotal)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-slate-200 text-slate-700">
                    <DollarSign className="w-3 h-3" />
                    Prom. {formatearMonto(e.ticketPromedio)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                    <Trophy className="w-3 h-3" />
                    {e.totalTransacciones} ventas
                  </span>
                  {e.alertas > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3" />
                      {e.alertas}
                    </span>
                  )}
                </div>
              </div>
            </>
          );
          if (noClickeable) {
            return (
              <div
                key={e.empleadoId}
                className={claseCard}
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                data-testid={`empleado-card-${e.empleadoId}`}
              >
                {contenidoCard}
              </div>
            );
          }
          return (
            <button
              key={e.empleadoId}
              type="button"
              onClick={() => abrirEmpleadoEnModulo(e.nombre)}
              className={claseCard}
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              data-testid={`empleado-card-${e.empleadoId}`}
            >
              {contenidoCard}
            </button>
          );
        })}
      </div>
    </>
  );
}
