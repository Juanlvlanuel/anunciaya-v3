/**
 * metricasService.ts
 * ==================
 * Llamadas a la API del Panel para el módulo "Métricas" = la vista de análisis (tendencias +
 * desgloses). Solo lectura. Reusa el axios del Panel (`api`), que adjunta el token, renueva ante 401
 * y agrega `?regionId=` automáticamente (lente de región del superadmin).
 *
 * Endpoints (una llamada por pestaña; el front carga solo la activa):
 *   GET /admin/metricas/crecimiento?meses=N  → KPIs + series de altas/bajas e ingresos + top vendedores.
 *   GET /admin/metricas/adopcion?meses=N      → uso de la app (negocios + clientes) + en-riesgo.
 *   GET /admin/metricas/usuarios?meses=N      → base de usuarios (super + gerente).
 *
 * Tipos en camelCase (el backend ya transforma snake → camel). Reflejan los del service del backend.
 *
 * Ubicación: apps/admin/src/services/metricasService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// PERIODO (preset por meses o rango por fechas)
// =============================================================================

export type PeriodoSel =
  | { tipo: 'preset'; meses: number }
  | { tipo: 'rango'; desde: string; hasta: string }; // fechas YYYY-MM-DD

/** Params que viajan al backend según el tipo de periodo. */
function paramsDe(p: PeriodoSel): Record<string, string | number> {
  return p.tipo === 'rango' ? { desde: p.desde, hasta: p.hasta } : { meses: p.meses };
}

/** Clave estable del periodo para la queryKey de React Query. */
export function clavePeriodo(p: PeriodoSel): string {
  return p.tipo === 'rango' ? `r${p.desde}_${p.hasta}` : `m${p.meses}`;
}

// =============================================================================
// TIPOS COMPARTIDOS
// =============================================================================

/** Un KPI con su valor del periodo y el del periodo anterior (el front calcula la variación). */
export interface KpiMetrica {
  valor: number;
  anterior: number | null;
}

// =============================================================================
// ① CRECIMIENTO Y DINERO
// =============================================================================

export interface PuntoCrecimiento {
  mes: string; // 'YYYY-MM'
  altas: number;
  bajas: number;
}

export interface PuntoIngresos {
  mes: string;
  tarjeta: number;
  efectivo: number;
  transferencia: number;
  otro: number;
}

export interface TopVendedor {
  usuarioId: string;
  nombre: string;
  avatarUrl: string | null;
  region: string | null;
  gerente: string | null;
  activos: number;
}

export interface MetricasCrecimiento {
  rol: string;
  kpis: {
    negociosActivos: KpiMetrica;
    altas: KpiMetrica;
    churn: KpiMetrica;
    ingresos: KpiMetrica;
  };
  series: {
    crecimiento: PuntoCrecimiento[];
    ingresos: PuntoIngresos[];
  };
  topVendedores: TopVendedor[] | null;
}

const VACIO_CRECIMIENTO: MetricasCrecimiento = {
  rol: '',
  kpis: {
    negociosActivos: { valor: 0, anterior: null },
    altas: { valor: 0, anterior: 0 },
    churn: { valor: 0, anterior: 0 },
    ingresos: { valor: 0, anterior: 0 },
  },
  series: { crecimiento: [], ingresos: [] },
  topVendedores: null,
};

export async function obtenerCrecimiento(periodo: PeriodoSel): Promise<MetricasCrecimiento> {
  const { data } = await api.get<RespuestaAPI<MetricasCrecimiento>>('/admin/metricas/crecimiento', { params: paramsDe(periodo) });
  return data.data ?? VACIO_CRECIMIENTO;
}

// =============================================================================
// ② ADOPCIÓN DE LA APP
// =============================================================================

export interface NegocioEnRiesgo {
  negocioId: string;
  nombre: string;
  logoUrl: string | null;
  diasSinUsar: number | null;
  clientes: number;
}

export interface MetricasAdopcion {
  rol: string;
  negocios: {
    activosEnApp: KpiMetrica;
    totalQuePagan: number;
  };
  clientes: {
    total: number;
    activos: KpiMetrica;
    inactivos: number;
  };
  serieClientesActivos: { mes: string; activos: number }[];
  /** `total` = todos los negocios en riesgo (badge); `items` = los primeros N (lista con scroll). */
  enRiesgo: { total: number; items: NegocioEnRiesgo[] };
}

const VACIO_ADOPCION: MetricasAdopcion = {
  rol: '',
  negocios: { activosEnApp: { valor: 0, anterior: 0 }, totalQuePagan: 0 },
  clientes: { total: 0, activos: { valor: 0, anterior: 0 }, inactivos: 0 },
  serieClientesActivos: [],
  enRiesgo: { total: 0, items: [] },
};

export async function obtenerAdopcion(periodo: PeriodoSel): Promise<MetricasAdopcion> {
  const { data } = await api.get<RespuestaAPI<MetricasAdopcion>>('/admin/metricas/adopcion', { params: paramsDe(periodo) });
  return data.data ?? VACIO_ADOPCION;
}

// =============================================================================
// ③ USUARIOS Y COMUNIDAD  (super + gerente)
// =============================================================================

export interface MetricasUsuarios {
  rol: string;
  kpis: {
    total: KpiMetrica;
    nuevos: KpiMetrica;
    activos: KpiMetrica;
    verificadosPct: KpiMetrica;
  };
  serieRegistros: { mes: string; registros: number }[];
  distribucion: { personal: number; comercial: number };
  topCiudades: { ciudad: string; total: number }[];
}

const VACIO_USUARIOS: MetricasUsuarios = {
  rol: '',
  kpis: {
    total: { valor: 0, anterior: null },
    nuevos: { valor: 0, anterior: 0 },
    activos: { valor: 0, anterior: null },
    verificadosPct: { valor: 0, anterior: null },
  },
  serieRegistros: [],
  distribucion: { personal: 0, comercial: 0 },
  topCiudades: [],
};

export async function obtenerUsuariosMetricas(periodo: PeriodoSel): Promise<MetricasUsuarios> {
  const { data } = await api.get<RespuestaAPI<MetricasUsuarios>>('/admin/metricas/usuarios', { params: paramsDe(periodo) });
  return data.data ?? VACIO_USUARIOS;
}
