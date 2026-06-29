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

/** Una solicitud de pago manual por verificar (subset de la cola; el backend manda más campos). */
export interface SolicitudResumen {
  id: string;
  negocioId: string;
  negocioNombre: string;
  monto: string;
  creadoAt: string;
}

export interface SolicitudesResumen {
  items: SolicitudResumen[];
  total: number;
}

export interface ItemComisionPorPagar {
  embajadorId: string;
  usuarioId: string | null;
  nombre: string;
  monto: number;
}

export interface ComisionesPorPagar {
  items: ItemComisionPorPagar[];
  totalVendedores: number;
  monto: number;
}

export interface PendientesResumen {
  efectivo: EfectivoPendiente;
  gracia: ListaEnGracia;
  solicitudes: SolicitudesResumen;
  comisiones: ComisionesPorPagar;
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
    solicitudes: { items: [], total: 0 },
    comisiones: { items: [], totalVendedores: 0, monto: 0 },
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
