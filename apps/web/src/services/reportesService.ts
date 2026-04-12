/**
 * reportesService.ts
 * ===================
 * Llamadas API para el módulo de Reportes (Business Studio)
 *
 * Ubicación: apps/web/src/services/reportesService.ts
 */

import { get, api } from './api';

export type TabReporte = 'ventas' | 'clientes' | 'empleados' | 'promociones' | 'resenas';

// ─── Tipos de respuesta ────────────────────────────────────────────────────

export interface ReporteVentas {
  horariosPico: { hora: number; totalVentas: number; cantidad: number }[];
  ventasPorDia: { dia: number; nombre: string; totalVentas: number; cantidad: number }[];
  tasaRevocacion: { total: number; revocadas: number; porcentaje: number };
  metodosPago: { efectivo: number; tarjeta: number; transferencia: number; sinEspecificar: number; total: number };
}

export interface ClienteTop {
  clienteId: string;
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  valor: number;
}

export interface ReporteClientes {
  topPorGasto: ClienteTop[];
  topPorFrecuencia: ClienteTop[];
  clientesEnRiesgo: number;
  clientesPerdidos: number;
  totalClientes: number;
  gastoPromedioPorCliente: number;
  tendenciaAdquisicion: { semana: string; nuevos: number }[];
}

export interface EmpleadoReporte {
  empleadoId: string;
  nombre: string;
  fotoUrl: string | null;
  totalTransacciones: number;
  montoTotal: number;
  ticketPromedio: number;
  alertas: number;
  /** true cuando la fila representa al dueño (ventas sin empleadoId). No es clickeable en UI. */
  esDueno?: boolean;
  /** true cuando el empleado ya no está operando (eliminado o desactivado) pero tiene ventas en el período. No clickeable. */
  inactivo?: boolean;
}

export interface ReporteEmpleados {
  empleados: EmpleadoReporte[];
}

export interface PromocionResumen {
  titulo: string;
  tipo: string;
  valor: string | null;
  imagen: string | null;
  descripcion: string | null;
  metrica: number;
  metricaLabel: string;
}

export interface ReportePromociones {
  funnelOfertas: { activas: number; vistas: number; clicks: number; shares: number; expiradas: number };
  mejorOferta: PromocionResumen | null;
  funnelCupones: { emitidos: number; canjeados: number; expirados: number; activos: number };
  mejorCupon: PromocionResumen | null;
  funnelRecompensas: { generados: number; canjeados: number; expirados: number; pendientes: number };
  mejorRecompensa: PromocionResumen | null;
  descuentoTotal: number;
  porVencer: number;
}

export interface RespuestaPorResponder {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  esDueno: boolean;
  respondidas: number;
  tiempoPromDias: number;
}

export interface ReporteResenas {
  distribucionEstrellas: { rating: number; cantidad: number; porcentaje: number }[];
  tendenciaRating: { semana: string; promedio: number; cantidad: number }[];
  sinResponder: number;
  totalResenas: number;
  tasaRespuesta: number;
  tiempoPromedioRespuestaDias: number;
  respuestasPorResponder: RespuestaPorResponder[];
}

// ─── Funciones API ─────────────────────────────────────────────────────────

export async function getReporte<T>(tab: TabReporte, periodo?: string, fechaInicio?: string, fechaFin?: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (periodo) params.set('periodo', periodo);
  if (fechaInicio) params.set('fechaInicio', fechaInicio);
  if (fechaFin) params.set('fechaFin', fechaFin);
  return get<T>(`/business/reportes?${params.toString()}`);
}

export interface ClienteInactivo {
  clienteId: string;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  correo: string | null;
  ultimaActividad: string | null;
  diasSinComprar: number;
  puntosDisponibles: number;
}

export async function getClientesInactivos(tipo: 'riesgo' | 'inactivos') {
  return get<ClienteInactivo[]>(`/business/reportes/clientes-inactivos?tipo=${tipo}`);
}

export async function descargarExcel(tab: TabReporte, periodo?: string, fechaInicio?: string, fechaFin?: string): Promise<void> {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (periodo) params.set('periodo', periodo);
  if (fechaInicio) params.set('fechaInicio', fechaInicio);
  if (fechaFin) params.set('fechaFin', fechaFin);

  const respuesta = await api.get(`/business/reportes/exportar?${params.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([respuesta.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_${tab}_${periodo || 'mes'}_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
