/**
 * vendedoresService.ts
 * ====================
 * Llamadas a la API del Panel para la sección "Vendedores y comisiones" — pieza A: la CARTERA
 * (Fase 1 · VER). Reusa el axios del Panel (`api`), que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/vendedores            → tabla paginada de la red + conteos por estado del embajador
 *   GET /admin/vendedores/conteo     → total del alcance (badge del menú)
 *   GET /admin/vendedores/:id        → ficha de un vendedor (:id = usuarios.id)
 *   GET /admin/vendedores/:id/cartera → negocios atribuidos al vendedor (con estado de membresía)
 *
 * Tipos camelCase — el backend ya transforma snake → camel.
 *
 * Ubicación: apps/admin/src/services/vendedoresService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export type EstadoEmbajador = 'activo' | 'inactivo' | 'suspendido';
export type OrdenVendedores = 'nombre_az' | 'nombre_za' | 'cartera_desc' | 'activos_desc';

/** Conteos por estado. Array {estado,total} para que el middleware snake→camel no rompa keys. */
export interface ConteosEstado {
  total: number;
  porEstado: Array<{ estado: string; total: number }>;
}

export interface VendedorFila {
  id: string;                // usuarios.id (la persona)
  embajadorId: string;
  nombre: string;
  correo: string;
  codigoReferido: string;
  linkReferido: string | null;
  estadoEmbajador: string;   // activo | inactivo | suspendido
  regionNombre: string | null;
  ciudades: string | null;
  negociosEnCartera: number;
  negociosActivos: number;
}

export interface ListaVendedores {
  items: VendedorFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface VendedorDetalle extends VendedorFila {
  nombreSolo: string | null;
  apellidos: string | null;
  telefono: string | null;
  altaEmbajador: string | null;
  gerenteNombre: string | null;
  ultimoAccesoPanel: string | null;
}

export interface NegocioCartera {
  id: string;
  nombre: string;
  logoUrl: string | null;
  ciudad: string | null;
  estadoPago: string;        // estado_membresia
  estadoAdmin: string;       // activo | suspendido | archivado
  metodoCobro: string;       // tarjeta | manual
  proximoCobro: string | null;
  vencimiento: string | null;
  alta: string | null;
  duenoNombre: string | null;
  duenoTelefono: string | null;
}

export interface CarteraVendedor {
  vendedor: VendedorDetalle;
  items: NegocioCartera[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

export interface ParametrosVendedores {
  busqueda?: string;
  estado?: string;
  orden?: OrdenVendedores;
  pagina: number;
  porPagina: number;
}

export interface ParametrosCartera {
  estadoPago?: string;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarVendedores(params: ParametrosVendedores): Promise<ListaVendedores> {
  const { data } = await api.get<RespuestaAPI<ListaVendedores>>('/admin/vendedores', { params });
  return (
    data.data ?? {
      items: [],
      total: 0,
      pagina: params.pagina,
      porPagina: params.porPagina,
      conteos: { total: 0, porEstado: [] },
    }
  );
}

/** Total de vendedores del alcance (badge del menú). */
export async function contarVendedores(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/vendedores/conteo');
  return data.data?.total ?? 0;
}

export async function obtenerVendedor(id: string): Promise<VendedorDetalle | null> {
  const { data } = await api.get<RespuestaAPI<VendedorDetalle>>(`/admin/vendedores/${id}`);
  return data.data ?? null;
}

export async function listarCartera(id: string, params: ParametrosCartera): Promise<CarteraVendedor | null> {
  const { data } = await api.get<RespuestaAPI<CarteraVendedor>>(`/admin/vendedores/${id}/cartera`, { params });
  return data.data ?? null;
}

// =============================================================================
// COMISIONES (Fase 2 · pieza B)
// =============================================================================

/** Una comisión devengada, con su desglose para la UI. */
export interface ComisionFila {
  id: string;
  periodo: string | null;        // 'YYYY-MM' (recurrente)
  tipo: string;                  // recurrente | alta
  monto: number;
  estado: string;                // pendiente | pagada | cancelada
  activos: number | null;
  montoUnitario: number | null;
  escalon: string | null;
  pagadaAt: string | null;
  creada: string | null;
}

export interface ResumenComisiones {
  devengado: number;
  pagado: number;
  pendiente: number;
}

export interface EstadoCuentaComisiones {
  vendedor: VendedorDetalle;
  items: ComisionFila[];
  resumen: ResumenComisiones;
}

/** Resumen que devuelve el recálculo del periodo. */
export interface ResumenDevengo {
  periodo: string;
  vendedoresProcesados: number;
  creadas: number;
  actualizadas: number;
  omitidasPagadas: number;
  totalDevengado: number;
}

/** Estado de cuenta de comisiones de un vendedor (devengado / pagado / pendiente). */
export async function listarComisiones(id: string): Promise<EstadoCuentaComisiones | null> {
  const { data } = await api.get<RespuestaAPI<EstadoCuentaComisiones>>(`/admin/vendedores/${id}/comisiones`);
  return data.data ?? null;
}

/** Recalcula/devenga las comisiones del periodo (solo super). Sin periodo → el mes en curso. */
export async function recalcularComisiones(periodo?: string): Promise<ResumenDevengo | null> {
  const { data } = await api.post<RespuestaAPI<ResumenDevengo>>(
    '/admin/vendedores/comisiones/recalcular',
    periodo ? { periodo } : {},
  );
  return data.data ?? null;
}
