/**
 * sucursalesService.ts
 * =====================
 * Servicio para llamadas API del módulo BS Sucursales.
 *
 * Ubicación: apps/web/src/services/sucursalesService.ts
 */

import { get, post, patch, del } from './api';
import type {
	SucursalResumen,
	KPIsSucursales,
	CrearSucursalInput,
	CrearGerenteInput,
	GerenteResumen,
} from '../types/sucursales';

// ============================================
// CRUD SUCURSALES
// ============================================

export function obtenerKPIs(negocioId: string) {
	return get<KPIsSucursales>(`/negocios/${negocioId}/sucursales/kpis`);
}

export function obtenerLista(negocioId: string, filtros?: { busqueda?: string; activa?: boolean }) {
	const params = new URLSearchParams();
	if (filtros?.busqueda) params.set('busqueda', filtros.busqueda);
	if (filtros?.activa !== undefined) params.set('activa', String(filtros.activa));
	const qs = params.toString();
	return get<SucursalResumen[]>(`/negocios/${negocioId}/sucursales/lista${qs ? `?${qs}` : ''}`);
}

export function crear(negocioId: string, datos: CrearSucursalInput) {
	return post<SucursalResumen>(`/negocios/${negocioId}/sucursales`, datos);
}

export function toggleActiva(sucursalId: string, activa: boolean) {
	return patch<{ success: boolean; message: string }>(`/negocios/sucursal/${sucursalId}/toggle-activa`, { activa });
}

export function eliminar(sucursalId: string) {
	return del<{ success: boolean; message: string }>(`/negocios/sucursal/${sucursalId}/eliminar`);
}

// ============================================
// GERENTES
// ============================================

export function obtenerGerente(sucursalId: string) {
	return get<GerenteResumen | null>(`/negocios/sucursal/${sucursalId}/gerente`);
}

export function crearGerente(sucursalId: string, datos: CrearGerenteInput) {
	return post<GerenteResumen>(`/negocios/sucursal/${sucursalId}/crear-gerente`, datos);
}

export function reenviarCredenciales(sucursalId: string) {
	return post<{ success: boolean; message: string }>(`/negocios/sucursal/${sucursalId}/reenviar-credenciales`, {});
}

export function revocarGerente(sucursalId: string) {
	return del<{ success: boolean; message: string }>(`/negocios/sucursal/${sucursalId}/revocar-gerente`);
}
