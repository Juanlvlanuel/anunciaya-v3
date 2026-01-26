/**
 * dashboardService.ts
 * ====================
 * Servicio para las llamadas API del Dashboard de Business Studio
 * 
 * UBICACIÓN: apps/web/src/services/dashboardService.ts
 * 
 * NOTA: El interceptor en api.ts agrega ?sucursalId= automáticamente
 * cuando el usuario está en modo comercial.
 * 
 * ENDPOINTS:
 * - GET /api/business/dashboard/kpis
 * - GET /api/business/dashboard/ventas
 * - GET /api/business/dashboard/campanas
 * - GET /api/business/dashboard/interacciones
 * - GET /api/business/dashboard/resenas
 * - GET /api/business/dashboard/alertas
 * - PUT /api/business/dashboard/alertas/:id
 */

import { get, put } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export type Periodo = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio';
export type Tendencia = 'subida' | 'bajada' | 'igual';

export interface KPIBasico {
  valor: number;
  valorAnterior: number;
  porcentajeCambio: number;
  tendencia: Tendencia;
}

export interface KPIsData {
  ventas: KPIBasico & { miniGrafica: number[] };
  clientes: KPIBasico & { nuevos: number; recurrentes: number };
  transacciones: KPIBasico & {
    ticketPromedio: number;
    ticketMaximo: number;
    ticketMinimo: number;
  };
  cuponesCanjeados: KPIBasico;
  ofertasActivas: number;
  followers: number;
  likes: KPIBasico;
  rating: {
    valor: number;
    totalResenas: number;
  };
  vistas: KPIBasico;
}

export interface VentaDiaria {
  fecha: string;
  diaSemana: string;
  total: number;
  transacciones: number;
}

export interface EstadisticasVentas {
  promedioDiario: number;
  diaPico: string;
  mejorVenta: number;
  crecimiento: number;
}

export interface VentasData {
  ventas: VentaDiaria[];
  estadisticas: EstadisticasVentas;
}

export interface Campana {
  id: string;
  titulo: string;
  tipo: string;
  valor: number;
  fechaInicio: string;
  fechaFin: string;
  usosActuales: number;
  limiteUsos: number | null;
  tipoCampana: 'oferta' | 'cupon';
  expirada: boolean;
  // Métricas (ofertas)
  totalVistas: number;
  totalClicks: number;
  totalShares: number;
  imagen: string | null;
}

export interface Interaccion {
  tipo: 'venta' | 'cupon_canjeado' | 'like' | 'nuevo_seguidor' | 'compartido';
  id: string;
  titulo: string;
  descripcion: string;
  avatar: string | null;
  createdAt: string;
}

export interface Resena {
  id: string;
  rating: number;
  texto: string;
  createdAt: string;
  autor: {
    nombre: string;
    apellidos: string;
    avatar: string | null;
  };
}

export interface Alerta {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  descripcion: string;
  leida: boolean;
  createdAt: string;
}

export interface AlertasData {
  alertas: Alerta[];
  noLeidas: number;
}

// =============================================================================
// FUNCIONES
// =============================================================================

/**
 * Obtiene los KPIs del dashboard
 * @param periodo - Periodo de tiempo
 */
export async function obtenerKPIs(periodo: Periodo = 'semana') {
  return get<KPIsData>(`/business/dashboard/kpis?periodo=${periodo}`);
}

/**
 * Obtiene las ventas diarias para la gráfica
 * @param periodo - Periodo de tiempo
 */
export async function obtenerVentas(periodo: Periodo = 'semana') {
  return get<VentasData>(`/business/dashboard/ventas?periodo=${periodo}`);
}

/**
 * Obtiene las campañas activas
 * @param limite - Número máximo de campañas
 */
export async function obtenerCampanas(limite: number = 5) {
  return get<Campana[]>(`/business/dashboard/campanas?limite=${limite}`);
}

/**
 * Obtiene las interacciones recientes
 * @param limite - Número máximo de interacciones
 */
export async function obtenerInteracciones(limite: number = 10) {
  return get<Interaccion[]>(`/business/dashboard/interacciones?limite=${limite}`);
}

/**
 * Obtiene las reseñas recientes
 * @param limite - Número máximo de reseñas
 */
export async function obtenerResenas(limite: number = 5) {
  return get<Resena[]>(`/business/dashboard/resenas?limite=${limite}`);
}

/**
 * Obtiene las alertas recientes
 * @param limite - Número máximo de alertas
 */
export async function obtenerAlertas(limite: number = 5) {
  return get<AlertasData>(`/business/dashboard/alertas?limite=${limite}`);
}

/**
 * Marca una alerta como leída
 */
export async function marcarAlertaLeida(alertaId: string) {
  return put<{ message: string }>(`/business/dashboard/alertas/${alertaId}`);
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  obtenerKPIs,
  obtenerVentas,
  obtenerCampanas,
  obtenerInteracciones,
  obtenerResenas,
  obtenerAlertas,
  marcarAlertaLeida,
};