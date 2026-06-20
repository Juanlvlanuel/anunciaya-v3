/**
 * resumenService.ts
 * =================
 * Llamada a la API del Panel para el módulo "Resumen / inicio" = el tablero de bienvenida (KPIs +
 * cola de pendientes). Solo lectura. Reusa el axios del Panel (`api`), que adjunta el token, renueva
 * ante 401 y agrega `?regionId=` automáticamente (lente de región del superadmin).
 *
 * Endpoint:
 *   GET /admin/resumen → KPIs + pendientes, scoped por rol en el backend.
 *
 * Ubicación: apps/admin/src/services/resumenService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS (camelCase — el backend ya transforma snake → camel)
// =============================================================================

/** Un KPI del tablero. La clave decide etiqueta/formato/sección destino (ver SeccionResumen). */
export interface KpiResumen {
  clave: string;
  valor: number;
}

export interface ItemEfectivoPendiente {
  embajadorId: string;
  usuarioId: string | null;
  nombre: string;
  saldo: number;
}

export interface EfectivoPendiente {
  items: ItemEfectivoPendiente[];
  totalVendedores: number;
  monto: number;
}

export interface NegocioEnGracia {
  id: string;
  nombre: string;
  fechaLimiteGracia: string | null;
  /** ceil((límite − ahora) / día). 0 = vence hoy; negativo = ya pasó el límite. */
  diasRestantes: number | null;
  ciudad: string | null;
  vendedorNombre: string | null;
}

export interface ListaEnGracia {
  items: NegocioEnGracia[];
  total: number;
}

export interface PendientesResumen {
  efectivo: EfectivoPendiente;
  gracia: ListaEnGracia;
  contador: number;
}

export interface ResumenPanel {
  rol: string;
  kpis: KpiResumen[];
  pendientes: PendientesResumen;
}

const VACIO: ResumenPanel = {
  rol: '',
  kpis: [],
  pendientes: {
    efectivo: { items: [], totalVendedores: 0, monto: 0 },
    gracia: { items: [], total: 0 },
    contador: 0,
  },
};

// =============================================================================
// LLAMADA
// =============================================================================

export async function obtenerResumen(): Promise<ResumenPanel> {
  const { data } = await api.get<RespuestaAPI<ResumenPanel>>('/admin/resumen');
  return data.data ?? VACIO;
}
