/**
 * ============================================================================
 * PÁGINA: Reportes (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/reportes/PaginaReportes.tsx
 *
 * Un solo filtro universal de fechas para todos los tabs.
 * Rangos rápidos + inputs de fecha para rango personalizado.
 */

import { useEffect, useState } from 'react';
import { BarChart3, Download, Loader2, DollarSign, Users, UserCog, Tag, Star } from 'lucide-react';
import { DatePicker } from '../../../../components/ui/DatePicker';
import { useReportesStore } from '../../../../stores/useReportesStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { RangoRapido } from '../../../../stores/useReportesStore';
import { descargarExcel } from '../../../../services/reportesService';
import type { TabReporte } from '../../../../services/reportesService';
import { notificar } from '../../../../utils/notificaciones';
import { TabVentas } from './componentes/TabVentas';
import { TabClientes } from './componentes/TabClientes';
import { TabEmpleados } from './componentes/TabEmpleados';
import { TabPromociones } from './componentes/TabPromociones';
import { TabResenas } from './componentes/TabResenas';

// =============================================================================
// CSS — Animación del icono del header
// =============================================================================

const estiloAnimacion = document.createElement('style');
estiloAnimacion.textContent = `
  @keyframes reportes-icon-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  .reportes-icon-pulse {
    animation: reportes-icon-pulse 2.5s ease-in-out infinite;
  }
`;
if (!document.querySelector('[data-reportes-style]')) {
  estiloAnimacion.setAttribute('data-reportes-style', '');
  document.head.appendChild(estiloAnimacion);
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const TABS_CONFIG: { id: TabReporte; etiqueta: string; icono: typeof DollarSign }[] = [
  { id: 'ventas', etiqueta: 'Ventas', icono: DollarSign },
  { id: 'clientes', etiqueta: 'Clientes', icono: Users },
  { id: 'empleados', etiqueta: 'Empleados', icono: UserCog },
  { id: 'promociones', etiqueta: 'Promociones', icono: Tag },
  { id: 'resenas', etiqueta: 'Reseñas', icono: Star },
];

const RANGOS_RAPIDOS: { id: RangoRapido; etiqueta: string }[] = [
  { id: '7d', etiqueta: '7 días' },
  { id: '30d', etiqueta: '30 días' },
  { id: '3m', etiqueta: '3 meses' },
  { id: '1a', etiqueta: '1 año' },
  { id: 'todo', etiqueta: 'Todo' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaReportes() {
  const { tabActivo, rangoActivo, fechaInicio, fechaFin, setTabActivo, setRangoRapido, setFechaInicio, setFechaFin, limpiar } = useReportesStore();
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    return () => limpiar();
  }, [limpiar]);

  // Reset al cambiar de sucursal (jerarquía sucursal > toggle > filtros).
  // Resetea tabActivo, rangoActivo, fechas — todo a default.
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
  useEffect(() => {
    limpiar();
  }, [sucursalActiva, limpiar]);

  const handleExportar = async () => {
    setExportando(true);
    try {
      await descargarExcel(tabActivo, undefined, fechaInicio, fechaFin);
      notificar.exito('Archivo descargado');
    } catch {
      notificar.error('Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-reportes">
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ── Row 1: Header (lg) + KPIs del tab activo — patrón Dashboard/Transacciones ─ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div
              className="reportes-icon-pulse flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
              }}
            >
              <BarChart3 className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Reportes
              </h1>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium lg:mt-0.5 -mt-0.5">
                Análisis detallado de tu negocio
              </p>
            </div>
          </div>

          {/* KPIs — móvil: arriba con mt-5; laptop: a la derecha del header con flex-1 */}
          <div className="mt-5 lg:mt-0 lg:flex-1 min-w-0" data-testid="reportes-kpis-wrapper">
            {tabActivo === 'ventas' && <TabVentas fechaInicio={fechaInicio} fechaFin={fechaFin} solo="kpis" />}
            {tabActivo === 'clientes' && <TabClientes fechaInicio={fechaInicio} fechaFin={fechaFin} solo="kpis" />}
            {tabActivo === 'empleados' && <TabEmpleados fechaInicio={fechaInicio} fechaFin={fechaFin} solo="kpis" />}
            {tabActivo === 'promociones' && <TabPromociones fechaInicio={fechaInicio} fechaFin={fechaFin} solo="kpis" />}
            {tabActivo === 'resenas' && <TabResenas fechaInicio={fechaInicio} fechaFin={fechaFin} solo="kpis" />}
          </div>
        </div>

        {/* ── Row 2: Tabs selector (lg: alineados a la derecha) ─────────── */}
        <div className="overflow-x-auto lg:flex lg:justify-end lg:mt-7 2xl:mt-14" data-testid="reportes-tabs">
          <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md w-fit">
            {TABS_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-1 lg:gap-1 2xl:gap-1.5 px-3 lg:px-3 2xl:px-4 h-10 lg:h-9 2xl:h-10 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold whitespace-nowrap shrink-0 lg:cursor-pointer ${
                  tabActivo === tab.id
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300'
                }`}
                style={tabActivo === tab.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                <tab.icono className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />
                {tab.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* ── Row 3: Filtro universal de fechas ─────────────────────────── */}
        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-3 lg:p-2 2xl:p-3 shadow-md" data-testid="reportes-filtros">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              {/* Fechas personalizadas con DatePicker */}
              <div className="flex items-center gap-1.5 flex-1 lg:flex-none">
                <DatePicker
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  placeholder="Desde"
                  maxDate={fechaFin}
                  centradoEnMovil
                  className="flex-1 lg:flex-none lg:w-48 2xl:w-52"
                />
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-500">a</span>
                <DatePicker
                  value={fechaFin}
                  onChange={setFechaFin}
                  placeholder="Hasta"
                  minDate={fechaInicio}
                  centradoEnMovil
                  className="flex-1 lg:flex-none lg:w-48 2xl:w-52"
                />
              </div>

              {/* Separador vertical — solo desktop */}
              <div className="hidden lg:block w-px h-6 bg-slate-300" />

              {/* Rangos rápidos como pill group (misma altura que datepickers) */}
              <div className="flex items-center bg-slate-100 rounded-lg border-2 border-slate-300 p-0.5 h-11 lg:h-10 2xl:h-11" data-testid="reportes-rangos">
                {RANGOS_RAPIDOS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRangoRapido(r.id)}
                    data-testid={`rango-${r.id}`}
                    className={`px-3 lg:px-2.5 2xl:px-3 h-full flex items-center rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold whitespace-nowrap shrink-0 lg:cursor-pointer ${
                      r.id === 'todo' ? 'hidden lg:flex' : 'flex'
                    } ${
                      rangoActivo === r.id
                        ? 'text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                    style={rangoActivo === r.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {r.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Exportar (misma altura que los otros elementos) */}
            <button
              onClick={handleExportar}
              disabled={exportando}
              data-testid="btn-exportar"
              className="shrink-0 flex items-center justify-center gap-1.5 h-11 lg:h-10 2xl:h-11 px-3 lg:px-2.5 2xl:px-3 rounded-lg text-sm lg:text-xs 2xl:text-sm font-bold text-white border-2 border-slate-800 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #1e293b, #334155)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              )}
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* ── Row 4: Body del tab activo (tablas, gráficos) ───────────────── */}
        <div data-testid="reportes-body-wrapper">
          {tabActivo === 'ventas' && <TabVentas fechaInicio={fechaInicio} fechaFin={fechaFin} solo="body" />}
          {tabActivo === 'clientes' && <TabClientes fechaInicio={fechaInicio} fechaFin={fechaFin} solo="body" />}
          {tabActivo === 'empleados' && <TabEmpleados fechaInicio={fechaInicio} fechaFin={fechaFin} solo="body" />}
          {tabActivo === 'promociones' && <TabPromociones fechaInicio={fechaInicio} fechaFin={fechaFin} solo="body" />}
          {tabActivo === 'resenas' && <TabResenas fechaInicio={fechaInicio} fechaFin={fechaFin} solo="body" />}
        </div>
      </div>
    </div>
  );
}
