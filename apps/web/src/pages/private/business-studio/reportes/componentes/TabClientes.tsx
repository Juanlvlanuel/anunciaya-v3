/**
 * TabClientes.tsx — Pestaña de Clientes del módulo Reportes BS
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Crown, ShoppingBag, AlertTriangle, UserX } from 'lucide-react';
import { useReporteClientes } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { obtenerIniciales } from '../../../../../utils/obtenerIniciales';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import { PanelTitulo, TablaHeader, formatearMonto, formatearSemana, KpiCard } from './ReporteUI';
import { ModalClientesInactivos } from './ModalClientesInactivos';

interface TabClientesProps {
  fechaInicio: string;
  fechaFin: string;
  solo?: 'kpis' | 'body';
}

export function TabClientes({ fechaInicio, fechaFin, solo = 'body' }: TabClientesProps) {
  const { data, isPending } = useReporteClientes(fechaInicio, fechaFin);
  const navigate = useNavigate();
  const [modalAbierto, setModalAbierto] = useState<'riesgo' | 'inactivos' | null>(null);

  // Navegar al módulo Clientes con filtro por nombre
  const abrirClienteEnModulo = (nombre: string, apellidos: string) => {
    const nombreCompleto = [nombre, apellidos].filter(Boolean).join(' ').trim();
    navigate(`/business-studio/clientes?busqueda=${encodeURIComponent(nombreCompleto)}`);
  };

  // Navegar al módulo Clientes sin filtro
  const abrirModuloClientes = () => {
    navigate('/business-studio/clientes');
  };

  if (isPending) {
    if (solo === 'kpis') return null;
    return (
      <div className="flex items-center justify-center py-20" data-testid="reporte-clientes-loading">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    if (solo === 'kpis') return null;
    return (
      <div className="text-center py-16 text-slate-600 font-medium" data-testid="reporte-clientes-vacio">
        No hay datos de clientes para este período
      </div>
    );
  }

  // ─── Solo KPIs ────────────────────────────────────────────────────────
  if (solo === 'kpis') {
    return (
      <>
        <CarouselKPI>
          <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0" data-testid="reporte-clientes-kpis">
            <KpiCard
              icono={Users}
              label="Clientes"
              valor={data.totalClientes}
              color="blue"
              onClick={abrirModuloClientes}
              testId="reporte-metrica-total-clientes"
            />
            <KpiCard
              icono={ShoppingBag}
              label="Compra promedio"
              valor={formatearMonto(data.gastoPromedioPorCliente)}
              color="emerald"
              testId="reporte-metrica-gasto-promedio"
            />
            <KpiCard
              icono={AlertTriangle}
              label="Clientes en riesgo"
              valor={data.clientesEnRiesgo}
              color="amber"
              onClick={() => setModalAbierto('riesgo')}
              disabled={data.clientesEnRiesgo === 0}
              testId="reporte-metrica-riesgo"
            />
            <KpiCard
              icono={UserX}
              label="Clientes inactivos"
              valor={data.clientesPerdidos}
              color="red"
              onClick={() => setModalAbierto('inactivos')}
              disabled={data.clientesPerdidos === 0}
              testId="reporte-metrica-perdidos"
            />
          </div>
        </CarouselKPI>
        {/* Modal vive con los KPIs porque los KPIs son los triggers */}
        {modalAbierto && (
          <ModalClientesInactivos
            abierto={modalAbierto !== null}
            onCerrar={() => setModalAbierto(null)}
            tipo={modalAbierto}
          />
        )}
      </>
    );
  }

  // ─── Solo Body (tablas) ──────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 2xl:gap-3" data-testid="reporte-clientes">
        {/* Top 10 por gasto */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-top-gasto">
          <PanelTitulo icono={Crown} titulo="Tus 10 mejores clientes (por dinero)" />
          <TablaHeader columnas={['Cliente', 'Ha gastado']} />
          <div className="max-h-72 overflow-y-auto divide-y-[1.5px] divide-slate-300">
            {data.topPorGasto.length > 0 ? data.topPorGasto.map((c) => (
              <button
                key={c.clienteId}
                type="button"
                onClick={() => abrirClienteEnModulo(c.nombre, c.apellidos)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-3 lg:cursor-pointer hover:bg-slate-50 transition-colors"
                data-testid={`top-gasto-${c.clienteId}`}
              >
                <div
                  className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                >
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-white">{obtenerIniciales(c.nombre)}</span>
                  )}
                </div>
                <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900 truncate flex-1">{c.nombre} {c.apellidos ?? ''}</span>
                <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600 shrink-0">{formatearMonto(c.valor)}</span>
              </button>
            )) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Aún no tienes clientes que te hayan comprado</p>
            )}
          </div>
        </div>

        {/* Top 10 por frecuencia */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-top-frecuencia">
          <PanelTitulo icono={Users} titulo="Tus 10 clientes más frecuentes" />
          <TablaHeader columnas={['Cliente', 'Veces que compró']} />
          <div className="max-h-72 overflow-y-auto divide-y-[1.5px] divide-slate-300">
            {data.topPorFrecuencia.length > 0 ? data.topPorFrecuencia.map((c) => (
              <button
                key={c.clienteId}
                type="button"
                onClick={() => abrirClienteEnModulo(c.nombre, c.apellidos)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-3 lg:cursor-pointer hover:bg-slate-50 transition-colors"
                data-testid={`top-frecuencia-${c.clienteId}`}
              >
                <div
                  className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                >
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-white">{obtenerIniciales(c.nombre)}</span>
                  )}
                </div>
                <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900 truncate flex-1">{c.nombre} {c.apellidos ?? ''}</span>
                <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600 shrink-0">{c.valor} {c.valor === 1 ? 'vez' : 'veces'}</span>
              </button>
            )) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Aún no tienes clientes que te hayan comprado</p>
            )}
          </div>
        </div>

        {/* Tendencia de adquisición */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tendencia-adquisicion">
          <PanelTitulo icono={TrendingUp} titulo="Clientes nuevos cada semana" />
          <TablaHeader columnas={['Semana', 'Clientes nuevos']} />
          <div className="max-h-72 overflow-y-auto divide-y-[1.5px] divide-slate-300">
            {data.tendenciaAdquisicion.length > 0 ? data.tendenciaAdquisicion.map((t) => (
              <div key={t.semana} className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-900">{formatearSemana(t.semana)}</div>
                <div className="flex items-center px-3 py-3 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{t.nuevos}</div>
              </div>
            )) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Sin clientes nuevos en este período</p>
            )}
          </div>
        </div>

    </div>
  );
}
