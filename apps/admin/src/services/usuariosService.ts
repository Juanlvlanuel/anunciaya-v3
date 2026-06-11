/**
 * usuariosService.ts
 * ===================
 * Llamadas a la API del Panel para la sección Usuarios (Fase 1 — solo lectura).
 * Reusa el axios del Panel (`api`), que ya adjunta el token y renueva ante 401.
 *
 * Endpoints:
 *   GET /admin/usuarios       → tabla paginada + conteos por estado
 *   GET /admin/usuarios/:id   → expediente 360 (resumen)
 *
 * Tipos camelCase — el backend ya transforma snake → camel.
 *
 * Ubicación: apps/admin/src/services/usuariosService.ts
 */

import { api, type RespuestaAPI } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export type EstadoUsuario = 'activo' | 'suspendido' | 'inactivo';
export type TipoUsuario = 'personal' | 'comercial' | 'equipo' | 'vendedor';

export type OrdenUsuarios =
  | 'nombre_az'
  | 'nombre_za'
  | 'registro_recientes'
  | 'registro_antiguos'
  | 'ultima_conexion'
  | 'estado';

/** Conteos por estado. Array {estado,total} para que el middleware snake→camel no rompa keys. */
export interface ConteosEstado {
  total: number;
  porEstado: Array<{ estado: string; total: number }>;
}

export interface UsuarioFila {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  avatarUrl: string | null;
  perfil: string;
  estado: string;
  rolEquipo: string | null;
  esEmbajador: boolean;
  esDueno: boolean;
  ultimaConexion: string | null;
  createdAt: string | null;
}

export interface ListaUsuarios {
  items: UsuarioFila[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: ConteosEstado;
}

/** Diagnóstico de acceso: por qué una cuenta puede o no iniciar sesión. */
export interface DiagnosticoAcceso {
  correoVerificado: boolean;
  tieneContrasena: boolean;
  bloqueadoPorIntentos: boolean;
  bloqueadoHasta: string | null;
  intentosFallidos: number;
  requiereCambioContrasena: boolean;
  puedeIniciarSesion: boolean;
}

/** Los "sombreros" de la persona, en resumen (contadores, no listados). */
export interface SombrerosUsuario {
  esDueno: boolean;
  negocioId: string | null;
  negocioNombre: string | null;
  esEmpleado: boolean;
  totalEmpleos: number;
  esEmbajador: boolean;
  codigoReferido: string | null;
  rolEquipo: string | null;
  totalBilleterasPuntos: number;
  saldoPuntos: number;
  totalResenas: number;
}

/** Expediente 360 (resumen) de una persona. */
export interface UsuarioExpediente {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  nombreCompleto: string;
  correo: string;
  alias: string | null;
  telefono: string | null;
  ciudad: string | null;
  avatarUrl: string | null;
  genero: string | null;
  fechaNacimiento: string | null;
  createdAt: string | null;
  ultimaConexion: string | null;
  estado: string;
  perfil: string;
  membresia: number;
  tieneModoComercial: boolean;
  modoActivo: string;
  correoVerificado: boolean;
  correoVerificadoAt: string | null;
  telefonoVerificado: boolean;
  autenticadoPorGoogle: boolean;
  autenticadoPorFacebook: boolean;
  dobleFactorHabilitado: boolean;
  panel2faHabilitado: boolean;
  calificacionPromedio: string | null;
  totalCalificaciones: number;
  diagnostico: DiagnosticoAcceso;
  sombreros: SombrerosUsuario;
}

export interface ParametrosLista {
  busqueda?: string;
  estado?: string;
  tipo?: string;
  orden?: OrdenUsuarios;
  pagina: number;
  porPagina: number;
}

// =============================================================================
// LLAMADAS
// =============================================================================

export async function listarUsuarios(params: ParametrosLista): Promise<ListaUsuarios> {
  const { data } = await api.get<RespuestaAPI<ListaUsuarios>>('/admin/usuarios', { params });
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

export async function obtenerExpediente(id: string): Promise<UsuarioExpediente | null> {
  const { data } = await api.get<RespuestaAPI<UsuarioExpediente>>(`/admin/usuarios/${id}`);
  return data.data ?? null;
}

// =============================================================================
// ACCIONES (Fase 2) — soporte (super + gerente) y moderación (solo super)
// =============================================================================

/** Tipo de correo de acceso que se reenvió: crear (modelo C) o restablecer contraseña. */
export interface ResultadoEnvioAcceso {
  correoEnviado: boolean;
  tipo: 'crear' | 'restablecer';
}

export interface ResultadoCambioCorreo {
  correoEnviado: boolean;
}

/** Soporte: limpia el bloqueo por intentos fallidos. */
export async function desbloquearIntentos(id: string): Promise<void> {
  await api.post(`/admin/usuarios/${id}/desbloquear`);
}

/** Soporte: reenvía el código para crear/restablecer la contraseña. Devuelve si salió y de qué tipo. */
export async function enviarAcceso(id: string): Promise<ResultadoEnvioAcceso> {
  const { data } = await api.post<RespuestaAPI<ResultadoEnvioAcceso>>(`/admin/usuarios/${id}/enviar-acceso`);
  return data.data ?? { correoEnviado: false, tipo: 'crear' };
}

/** Soporte: corrige el correo de la cuenta y reenvía el código al correo nuevo. */
export async function cambiarCorreoUsuario(id: string, correoNuevo: string): Promise<ResultadoCambioCorreo> {
  const { data } = await api.patch<RespuestaAPI<{ correoEnviado: boolean }>>(`/admin/usuarios/${id}/correo`, { correoNuevo });
  return { correoEnviado: data.data?.correoEnviado ?? false };
}

/** Moderación (solo super): suspende el acceso a toda la app. Motivo obligatorio. */
export async function suspenderUsuario(id: string, motivo: string): Promise<void> {
  await api.post(`/admin/usuarios/${id}/suspender`, { motivo });
}

/** Moderación (solo super): reactiva la cuenta. Motivo opcional. */
export async function reactivarUsuario(id: string, motivo?: string): Promise<void> {
  await api.post(`/admin/usuarios/${id}/reactivar`, { motivo });
}
