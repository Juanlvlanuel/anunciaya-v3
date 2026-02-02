/**
 * GraficaVentas.tsx
 * ==================
 * Gráfica de ventas con Recharts (área + línea)
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaVentas.tsx
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import type { VentasData } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface GraficaVentasProps {
  datos: VentasData | null;
  vertical?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalizarMes(fechaFormateada: string): string {
  // Formato esperado: "24 ene" o "24-ene"
  // Separamos por espacio o guión y capitalizamos el mes
  const partes = fechaFormateada.split(/[\s-]/);
  if (partes.length === 2) {
    const dia = partes[0];
    const mes = partes[1].charAt(0).toUpperCase() + partes[1].slice(1);
    return `${dia} ${mes}`;
  }
  return fechaFormateada;
}

function formatearDiaSemana(fecha: Date): string {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias[fecha.getUTCDay()];
}

// =============================================================================
// TOOLTIP PERSONALIZADO
// =============================================================================

function TooltipPersonalizado({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-slate-200 p-2.5 min-w-[120px]">
      <p className="text-xs text-slate-500 mb-0.5">{data.diaSemana} {label}</p>
      <p className="text-lg font-black text-slate-800">
        ${data.total.toLocaleString('es-MX')}
      </p>
      <p className="text-xs text-slate-400">
        {data.transacciones} transacciones
      </p>
    </div>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function GraficaVentas({ datos, vertical = false }: GraficaVentasProps) {
  const ventas = datos?.ventas ?? [];
  const estadisticas = datos?.estadisticas;

  // Formatear datos para Recharts
  const datosGrafica = ventas.map((v) => {
    const fechaObj = new Date(v.fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short',
      timeZone: 'UTC'
    });
    
    return {
      ...v,
      fecha: capitalizarMes(fechaFormateada), // "24 Ene"
      diaSemana: formatearDiaSemana(fechaObj) // "Sáb"
    };
  });

  const crecimientoPositivo = (estadisticas?.crecimiento ?? 0) >= 0;
  
  // Formatear "Mejor día" en español si viene del backend
  const mejorDiaFormateado = estadisticas?.diaPico 
    ? capitalizarMes(estadisticas.diaPico) 
    : '';

  // =========================================================================
  // MODO VERTICAL - Layout compacto para sidebar
  // =========================================================================
  if (vertical) {
    return (
      <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-3 lg:p-2.5 2xl:p-3 h-full shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col">
        {/* Header con icono */}
        <div className="flex items-center justify-between mb-2 lg:mb-1.5 2xl:mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-4.5 2xl:h-4.5 text-blue-600" />
            </div>
            <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">Ventas del Periodo</h3>
          </div>
          <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500">Evolución diaria</span>
        </div>

        {/* Estadísticas en fila compacta */}
        {estadisticas && (
          <div className="flex items-center justify-between gap-2 mb-3 lg:mb-2 2xl:mb-3 pb-2 border-b border-slate-100">
            <div>
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500">Prom/día</p>
              <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
                ${estadisticas.promedioDiario.toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500">Mejor día</p>
              <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
                {mejorDiaFormateado}
              </p>
            </div>
            <div className={`flex items-center gap-0.5 px-2 py-1 lg:px-1.5 lg:py-0.5 2xl:px-2 2xl:py-1 rounded-full ${
              crecimientoPositivo ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {crecimientoPositivo ? (
                <TrendingUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
              )}
              <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold">
                {crecimientoPositivo ? '+' : ''}{estadisticas.crecimiento}%
              </span>
            </div>
          </div>
        )}

        {/* Gráfica vertical (más alta) */}
        {datosGrafica.length > 0 ? (
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={datosGrafica}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentasVertical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  dy={5}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<TooltipPersonalizado />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#colorVentasVertical)"
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Calendar className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mb-2 opacity-50" />
            <p className="text-xs lg:text-[10px] 2xl:text-xs text-center">No hay datos de ventas</p>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MODO HORIZONTAL (original)
  // =========================================================================

  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-3 lg:p-2.5 2xl:p-3 h-full shadow-lg hover:shadow-2xl transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-2 2xl:mb-3">
        <div>
          <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">Ventas del Periodo</h3>
          <p className="text-sm lg:text-xs 2xl:text-sm text-slate-500">Evolución diaria</p>
        </div>

        {/* Estadísticas rápidas */}
        {estadisticas && (
          <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
            <div className="text-right">
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500">Promedio/día</p>
              <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
                ${estadisticas.promedioDiario.toLocaleString('es-MX')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500">Mejor día</p>
              <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
                {mejorDiaFormateado}
              </p>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1.5 lg:px-2 lg:py-1 2xl:px-2.5 2xl:py-1.5 rounded-full ${
              crecimientoPositivo ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {crecimientoPositivo ? (
                <TrendingUp className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
              ) : (
                <TrendingDown className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
              )}
              <span className="text-sm lg:text-xs 2xl:text-sm font-bold">
                {crecimientoPositivo ? '+' : ''}{estadisticas.crecimiento}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gráfica */}
      {datosGrafica.length > 0 ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={datosGrafica}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#colorVentas)"
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Estado vacío */
        <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
          <Calendar className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 mb-2 opacity-50" />
          <p className="text-sm lg:text-xs 2xl:text-sm">No hay datos de ventas para este periodo</p>
        </div>
      )}
    </div>
  );
}