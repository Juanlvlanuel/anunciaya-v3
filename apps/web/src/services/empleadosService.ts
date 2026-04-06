/**
 * empleadosService.ts
 * ====================
 * Servicio para llamadas API del módulo de Empleados — Business Studio.
 *
 * NOTA: El interceptor en api.ts agrega ?sucursalId= automáticamente.
 *
 * Ubicación: apps/web/src/services/empleadosService.ts
 */

import { get, post, put, patch, del } from './api';
import type {
	EmpleadoResumen,
	EmpleadoDetalle,
	KPIsEmpleados,
	CrearEmpleadoInput,
	ActualizarEmpleadoInput,
	HorarioEmpleado,
} from '../types/empleados';

// --- KPIs ---

export async function obtenerKPIs() {
	return get<KPIsEmpleados>('/business/empleados/kpis');
}

// --- CRUD ---

export async function obtenerEmpleados(params: {
	busqueda?: string;
	activo?: boolean;
	limit?: number;
	offset?: number;
}) {
	const query = new URLSearchParams();
	if (params.busqueda) query.set('busqueda', params.busqueda);
	if (params.activo !== undefined) query.set('activo', String(params.activo));
	if (params.limit) query.set('limit', String(params.limit));
	if (params.offset) query.set('offset', String(params.offset));

	const qs = query.toString();
	return get<{ empleados: EmpleadoResumen[]; total: number }>(`/business/empleados${qs ? `?${qs}` : ''}`);
}

export async function obtenerDetalle(id: string) {
	return get<EmpleadoDetalle>(`/business/empleados/${id}`);
}

export async function crearEmpleado(datos: CrearEmpleadoInput) {
	return post<EmpleadoResumen>('/business/empleados', datos);
}

export async function actualizarEmpleado(id: string, datos: ActualizarEmpleadoInput) {
	return put<{ message: string }>(`/business/empleados/${id}`, datos);
}

export async function toggleActivo(id: string, activo: boolean) {
	return patch<{ message: string }>(`/business/empleados/${id}/activo`, { activo });
}

export async function eliminarEmpleado(id: string) {
	return del<{ message: string }>(`/business/empleados/${id}`);
}

// --- Horarios ---

export async function actualizarHorarios(id: string, horarios: HorarioEmpleado[]) {
	return put<{ message: string }>(`/business/empleados/${id}/horarios`, { horarios });
}

// --- Revocación remota ---

export async function revocarSesion(id: string) {
	return post<{ message: string }>(`/business/empleados/${id}/revocar-sesion`, {});
}
