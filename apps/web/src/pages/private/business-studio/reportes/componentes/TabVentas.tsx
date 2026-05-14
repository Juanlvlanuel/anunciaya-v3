/**
 * TabVentas.tsx — Pestaña de Ventas del módulo Reportes BS
 */

import { ShoppingBag, Receipt, XCircle } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const Calendar = (p: IconoWrapperProps) => <Icon icon={ICONOS.fechas} {...p} />;
const Wallet = (p: IconoWrapperProps) => <Icon icon={ICONOS.cartera} {...p} />;
const DollarSign = (p: IconoWrapperProps) => <Icon icon={ICONOS.dinero} {...p} />;
import { useReporteVentas } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import { PanelTitulo, TablaHeader, formatearMonto, KpiCard } from './ReporteUI';

interface TabVentasProps {
  fechaInicio: string;
  fechaFin: string;
  solo?: 'kpis' | 'body';
}

export function TabVentas({ fechaInicio, fechaFin, solo = 'body' }: TabVentasProps) {
  const { data, isPending } = useReporteVentas(fechaInicio, fechaFin);

  if (isPending) {
    if (solo === 'kpis') return null;
    return (
      <div className="flex items-center justify-center py-20" data-testid="reporte-ventas-loading">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    if (solo === 'kpis') return null;
    return (
      <div className="text-center py-16 text-slate-600 font-medium" data-testid="reporte-ventas-vacio">
        No hay datos de ventas para este período
      </div>
    );
  }

  const { metodosPago } = data;
  const totalPagos = metodosPago.total || 1;
  const pctEfectivo = Math.round((metodosPago.efectivo / totalPagos) * 100);
  const pctTarjeta = Math.round((metodosPago.tarjeta / totalPagos) * 100);
  const pctTransferencia = Math.round((metodosPago.transferencia / totalPagos) * 100);
  const pctSinEspecificar = Math.round((metodosPago.sinEspecificar / totalPagos) * 100);

  const confirmadas = data.tasaRevocacion.total - data.tasaRevocacion.revocadas;
  const ventaPromedio = confirmadas > 0 ? Math.round(metodosPago.total / confirmadas) : 0;

  // ─── Solo KPIs ────────────────────────────────────────────────────────
  if (solo === 'kpis') {
    return (
      <CarouselKPI>
        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0" data-testid="reporte-ventas-kpis">
          <KpiCard
            icono={DollarSign}
            label="Total vendido"
            valor={formatearMonto(metodosPago.total)}
            color="emerald"
            testId="reporte-metrica-total-vendido"
          />
          <KpiCard
            icono={ShoppingBag}
            label="Venta promedio"
            valor={formatearMonto(ventaPromedio)}
            color="emerald"
            testId="reporte-metrica-venta-promedio"
          />
          <KpiCard
            icono={Receipt}
            label="Transacciones"
            valor={confirmadas}
            color="violet"
            testId="reporte-metrica-transacciones"
          />
          <KpiCard
            icono={XCircle}
            label="Canceladas"
            valor={data.tasaRevocacion.revocadas}
            color="red"
            testId="reporte-metrica-canceladas"
          />
        </div>
      </CarouselKPI>
    );
  }

  // ─── Solo Body (tablas) ──────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 2xl:gap-3" data-testid="reporte-ventas">
        {/* 1. Ventas por día */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tabla-dias">
          <PanelTitulo icono={Calendar} titulo="Total vendido por día de la semana" />
          <TablaHeader columnas={['Día', 'Ventas', 'Transacciones']} />
          <div className="max-h-72 overflow-y-auto">
            {data.ventasPorDia.length > 0 ? data.ventasPorDia.map((d, i) => (
              <div key={d.dia} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{d.nombre}</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{formatearMonto(d.totalVentas)}</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{d.cantidad}</div>
              </div>
            )) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Sin datos</p>
            )}
          </div>
        </div>

        {/* 2. Métodos de pago */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tabla-metodos">
          <PanelTitulo icono={Wallet} titulo="Métodos de pago" />
          <TablaHeader columnas={['Método', 'Monto', '%']} />
          <div className="max-h-72 overflow-y-auto">
            {[
              { nombre: 'Efectivo', monto: metodosPago.efectivo, pct: pctEfectivo },
              { nombre: 'Tarjeta', monto: metodosPago.tarjeta, pct: pctTarjeta },
              { nombre: 'Transferencia', monto: metodosPago.transferencia, pct: pctTransferencia },
              ...(metodosPago.sinEspecificar > 0 ? [{ nombre: 'Sin especificar', monto: metodosPago.sinEspecificar, pct: pctSinEspecificar }] : []),
            ].map((m, i) => (
              <div key={m.nombre} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{m.nombre}</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{formatearMonto(m.monto)}</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Horarios pico */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid="reporte-tabla-horarios">
          <PanelTitulo icono={Clock} titulo="Horarios pico" />
          <TablaHeader columnas={['Hora', 'Ventas', 'Transacciones']} />
          <div className="max-h-72 overflow-y-auto">
            {data.horariosPico.length > 0 ? data.horariosPico.map((h, i) => (
              <div key={h.hora} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{h.hora}:00</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{formatearMonto(h.totalVentas)}</div>
                <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{h.cantidad}</div>
              </div>
            )) : (
              <p className="text-center py-6 text-slate-600 font-medium text-sm lg:text-[11px] 2xl:text-sm">Sin datos</p>
            )}
          </div>
        </div>
    </div>
  );
}
