/**
 * equipoService.ts
 * =================
 * Llamadas a la API del Panel para la sección "Equipo y accesos" (Fase 1 — solo lectura).
 * Reusa el axios del Panel (`api`), que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/equipo         → tabla paginada + conteos por rol
 *   GET /admin/equipo/conteo  → total del alcance (badge del menú)
 *   GET /admin/equipo/:id     → ficha de un miembro del equipo
 *
 * Tipos camelCase — el backend ya transforma snake → camel.
 *
 * Ubicación: apps/admin/src/services/equipoService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export type RolEquipoFiltro = 'superadmin' | 'gerente' | 'vendedor';

export type OrdenEquipo = 'nombre_az' | 'nombre_za' | 'rol' | 'ultimo_acceso' | 'registro_recientes';

/** Conteos por rol. Array {rol,total} para que el middleware snake→camel no rompa keys. */
export interface ConteosRol {
  total: number;
  porRol: Array<{ rol: string; total: number }>;
}

export interface MiembroEquipoFila {
  id: string;
  nombre: string;
  correo: string;
  rolEquipo: string;          // superadmin | gerente | vendedor
  estadoCuenta: string;       // activo | suspendido | inactivo
  accesoActivo: boolean;
  pendienteActivar: boolean;
  revocado: boolean;          // ex-vendedor sin acceso al Panel (reactivable)
  ultimoAccesoPanel: string | null;
  createdAt: string | null;
  regionNombre: string | null;
  ciudades: string | null;
  codigoReferido: string | null;
  linkReferido: string | null;
  estadoEmbajador: string | null;
}

export interface ListaEquipo {
  items: MiembroEquipoFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosRol;
}

/** Ficha de una cuenta de equipo (resumen; la cartera/comisiones vive en Vendedores y comisiones). */
export interface MiembroEquipo extends MiembroEquipoFila {
  nombreSolo: string | null;
  apellidos: string | null;
  telefono: string | null;
  correoVerificado: boolean;
  panel2faHabilitado: boolean;
  regionId: string | null;
  negociosAtribuidos: number;
}

export interface ParametrosLista {
  busqueda?: string;
  rol?: string;
  orden?: OrdenEquipo;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarEquipo(params: ParametrosLista): Promise<ListaEquipo> {
  const { data } = await api.get<RespuestaAPI<ListaEquipo>>('/admin/equipo', { params });
  return (
    data.data ?? {
      items: [],
      total: 0,
      pagina: params.pagina,
      porPagina: params.porPagina,
      conteos: { total: 0, porRol: [] },
    }
  );
}

export async function obtenerMiembro(id: string): Promise<MiembroEquipo | null> {
  const { data } = await api.get<RespuestaAPI<MiembroEquipo>>(`/admin/equipo/${id}`);
  return data.data ?? null;
}

/** Total de cuentas de equipo del alcance (badge del menú). */
export async function contarEquipo(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/equipo/conteo');
  return data.data?.total ?? 0;
}

// =============================================================================
// ACCIONES (Fase 2) — alta de vendedor · revocar · cambiar ciudades
// =============================================================================

export interface CiudadCatalogo {
  id: string;
  nombre: string;
  estado: string;
  regionId: string | null;
}

export interface DatosAltaVendedor {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  codigoReferido: string;
  ciudadIds: string[];
}

export interface ResultadoAltaVendedor {
  usuarioId: string;
  promovido: boolean;
  correoEnviado: boolean;
}

/** Ciudades activas para el selector. El super filtra por la región elegida; el gerente usa la suya. */
export async function listarCiudades(regionId?: string): Promise<CiudadCatalogo[]> {
  const { data } = await api.get<RespuestaAPI<CiudadCatalogo[]>>('/admin/equipo/ciudades', {
    params: regionId ? { regionId } : {},
  });
  return data.data ?? [];
}

export interface CuentaSugerida {
  id: string;
  nombre: string;
  nombreSolo: string | null;
  apellidos: string | null;
  correo: string;
  telefono: string | null;
  rolEquipo: string | null; // si no es null, ya pertenece al equipo (no se puede promover)
}

/** Typeahead del alta: busca cuentas existentes por correo (para detectar/autocompletar una promoción). */
export async function buscarCuentas(correo: string): Promise<CuentaSugerida[]> {
  const { data } = await api.get<RespuestaAPI<CuentaSugerida[]>>('/admin/equipo/buscar-cuenta', { params: { correo } });
  return data.data ?? [];
}

/** Código de referido sugerido (único) derivado del nombre. */
export async function sugerirCodigo(nombre: string, apellidos: string): Promise<string> {
  const { data } = await api.get<RespuestaAPI<{ codigo: string }>>('/admin/equipo/sugerir-codigo', {
    params: { nombre, apellidos },
  });
  return data.data?.codigo ?? '';
}

/** Alta de vendedor (crea o promueve la cuenta + embajador + ciudades). */
export async function altaVendedor(datos: DatosAltaVendedor): Promise<ResultadoAltaVendedor | null> {
  const { data } = await api.post<RespuestaAPI<ResultadoAltaVendedor>>('/admin/equipo/vendedores', datos);
  return data.data ?? null;
}

/** Revoca el acceso de un vendedor (rol NULL + embajador inactivo; conserva la atribución). */
export async function revocarAcceso(id: string): Promise<void> {
  await api.post(`/admin/equipo/${id}/revocar`);
}

/** Reactiva a un vendedor o gerente revocado (vuelve a tener acceso). */
export async function reactivarAcceso(id: string): Promise<void> {
  await api.post(`/admin/equipo/${id}/reactivar`);
}

export interface DatosAltaGerente {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  regionId: string;
}

/** Alta de gerente (crea o promueve la cuenta + rol gerente + región). Solo superadmin. */
export async function altaGerente(datos: DatosAltaGerente): Promise<ResultadoAltaVendedor | null> {
  const { data } = await api.post<RespuestaAPI<ResultadoAltaVendedor>>('/admin/equipo/gerentes', datos);
  return data.data ?? null;
}

export interface DatosEditar {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
}

/** Corrige datos de la cuenta (nombre/apellidos/teléfono/correo) de un miembro. */
export async function editarDatos(id: string, datos: DatosEditar): Promise<{ correoEnviado?: boolean }> {
  const { data } = await api.patch<RespuestaAPI<{ correoEnviado?: boolean }>>(`/admin/equipo/${id}/datos`, datos);
  return data.data ?? {};
}

/** Reasigna la región de un gerente. Solo superadmin. */
export async function reasignarRegion(id: string, regionId: string): Promise<void> {
  await api.patch(`/admin/equipo/${id}/region`, { regionId });
}
