/**
 * territoriosService.ts
 * =====================
 * Llamadas a la API del Panel para el módulo "Territorios" (mapa de la red de ventas).
 * Reusa el axios del Panel (`api`). Los 3 roles entran; el backend acota por rol.
 *
 * Endpoints (Fase 1 · VER):
 *   GET /admin/territorios/zonas   → zonas visibles para el rol (filtro ?ciudadId opcional)
 *
 * Ubicación: apps/admin/src/services/territoriosService.ts
 */

import { api, type RespuestaAPI } from './api';

export interface PoligonoGeoJSON {
  type: 'Polygon';
  coordinates: number[][][];
}

/** Una zona del territorio (partición de una ciudad asignada a un vendedor). */
export interface ZonaTerritorio {
  id: string;
  ciudadId: string;
  ciudadNombre: string | null;
  embajadorId: string | null;    // null = sin asignar
  vendedorNombre: string | null; // nombre del vendedor asignado (si hay)
  nombre: string;
  poligono: PoligonoGeoJSON;
  color: string | null;
  createdAt: string | null;
}

export interface FiltrosZonas {
  ciudadId?: string;
}

/** Zonas visibles para el rol (con filtro de ciudad opcional). */
export async function listarZonas(filtros: FiltrosZonas = {}): Promise<ZonaTerritorio[]> {
  const { data } = await api.get<RespuestaAPI<ZonaTerritorio[]>>('/admin/territorios/zonas', {
    params: { ciudadId: filtros.ciudadId || undefined },
  });
  return data.data ?? [];
}

/** Una ciudad sobre la que se pueden dibujar zonas. */
export interface CiudadAlcance {
  id: string;
  nombre: string;
  lat: number | null;
  lng: number | null;
}

/** Ciudades del alcance del rol (super = todas activas · gerente = su región). */
export async function listarCiudadesDelAlcance(): Promise<CiudadAlcance[]> {
  const { data } = await api.get<RespuestaAPI<CiudadAlcance[]>>('/admin/territorios/ciudades');
  return data.data ?? [];
}

/** Un vendedor asignable a una zona. */
export interface VendedorAsignable {
  embajadorId: string;
  nombre: string | null;
}

/** Vendedores asignables (super = todos · gerente = los de su región). */
export async function listarVendedoresAsignables(): Promise<VendedorAsignable[]> {
  const { data } = await api.get<RespuestaAPI<VendedorAsignable[]>>('/admin/territorios/vendedores');
  return data.data ?? [];
}

/** Una marca de un vendedor vista por gerente/super (solo lectura). */
export interface MarcaEquipo {
  id: string;
  lat: number;
  lng: number;
  tipo: TipoMarca;
  nota: string | null;
  vendedorNombre: string | null;
  negocioNombre: string | null;
  createdAt: string | null;
}

/** Marcas de los vendedores para gerente/super (lectura). ?ciudadId opcional (todas si se omite). */
export async function listarMarcasEquipo(ciudadId?: string): Promise<MarcaEquipo[]> {
  const { data } = await api.get<RespuestaAPI<MarcaEquipo[]>>('/admin/territorios/marcas-equipo', {
    params: { ciudadId: ciudadId || undefined },
  });
  return data.data ?? [];
}

/** Un negocio real de la app, para pintarlo en el mapa de territorios. */
export interface NegocioMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  estado: string;             // al_corriente / en_gracia / suspendido / cancelado
  embajadorId: string | null; // null = sin vendedor (auto-registrado)
  vendedorNombre: string | null;
}

/** Negocios reales para el mapa (alcance por rol en el backend). ?ciudadId opcional. */
export async function listarNegociosMapa(ciudadId?: string): Promise<NegocioMapa[]> {
  const { data } = await api.get<RespuestaAPI<NegocioMapa[]>>('/admin/territorios/negocios', {
    params: { ciudadId: ciudadId || undefined },
  });
  return data.data ?? [];
}

// =============================================================================
// ACCIONES (Fase 2)
// =============================================================================

export interface CrearZonaInput {
  ciudadId: string;
  nombre: string;
  poligono: PoligonoGeoJSON;
  color?: string;
  embajadorId?: string | null;
}

export interface EditarZonaInput {
  nombre?: string;
  poligono?: PoligonoGeoJSON;
  color?: string | null;
}

/** Crear una zona (polígono dibujado). */
export async function crearZona(datos: CrearZonaInput): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/territorios/zonas', datos);
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

/** Editar una zona (nombre / polígono / color). */
export async function editarZona(id: string, datos: EditarZonaInput): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/territorios/zonas/${id}`, datos);
  return data.data ?? { id };
}

/** Asignar / quitar (null) el vendedor de una zona. */
export async function asignarZona(id: string, embajadorId: string | null): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/territorios/zonas/${id}/vendedor`, { embajadorId });
  return data.data ?? { id };
}

/** Borrar una zona. */
export async function borrarZona(id: string): Promise<{ id: string }> {
  const { data } = await api.delete<RespuestaAPI<{ id: string }>>(`/admin/territorios/zonas/${id}`);
  return data.data ?? { id };
}

// =============================================================================
// MARCAS DEL VENDEDOR (G.2)
// =============================================================================

export type TipoMarca = 'visitado' | 'interesado' | 'cerrado' | 'sin_interes';

export interface MarcaTerritorio {
  id: string;
  lat: number;
  lng: number;
  tipo: TipoMarca;
  nota: string | null;
  negocioId: string | null;
  negocioNombre: string | null;
  createdAt: string | null;
}

/** Las marcas del vendedor (su capa personal). */
export async function listarMisMarcas(): Promise<MarcaTerritorio[]> {
  const { data } = await api.get<RespuestaAPI<MarcaTerritorio[]>>('/admin/territorios/marcas');
  return data.data ?? [];
}

/** Crear una marca (pin del vendedor). */
export async function crearMarca(datos: { lat: number; lng: number; tipo: TipoMarca; nota?: string; negocioId?: string | null }): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/territorios/marcas', datos);
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

/** Editar el estado, la nota, la posición (lat/lng) y/o el negocio ligado de una marca. */
export async function editarMarca(id: string, datos: { lat?: number; lng?: number; tipo?: TipoMarca; nota?: string | null; negocioId?: string | null }): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/territorios/marcas/${id}`, datos);
  return data.data ?? { id };
}

/** Borrar una marca. */
export async function borrarMarca(id: string): Promise<{ id: string }> {
  const { data } = await api.delete<RespuestaAPI<{ id: string }>>(`/admin/territorios/marcas/${id}`);
  return data.data ?? { id };
}
