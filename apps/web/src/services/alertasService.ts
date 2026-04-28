/**
 * alertasService.ts
 * ==================
 * Servicio para llamadas API del módulo de Alertas — Business Studio.
 *
 * NOTA: El interceptor en api.ts agrega ?sucursalId= automáticamente.
 *
 * Ubicación: apps/web/src/services/alertasService.ts
 */

import { get, put, del } from './api';
import type {
	AlertaCompleta,
	AlertaKPIs,
	ConfiguracionAlerta,
	FiltrosAlertas,
	RespuestaAlertasPaginada,
} from '../types/alertas';

// --- Alertas CRUD ---

export async function obtenerAlertas(filtros: FiltrosAlertas) {
	const params = new URLSearchParams();
	if (filtros.tipo) params.set('tipo', filtros.tipo);
	if (filtros.categoria) params.set('categoria', filtros.categoria);
	if (filtros.severidad) params.set('severidad', filtros.severidad);
	if (filtros.leida !== undefined) params.set('leida', String(filtros.leida));
	if (filtros.resuelta !== undefined) params.set('resuelta', String(filtros.resuelta));
	if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
	params.set('pagina', String(filtros.pagina));
	params.set('porPagina', String(filtros.porPagina));

	const query = params.toString();
	return get<RespuestaAlertasPaginada>(`/business/alertas${query ? `?${query}` : ''}`);
}

export async function obtenerAlerta(id: string) {
	return get<AlertaCompleta>(`/business/alertas/${id}`);
}

export async function obtenerKPIs() {
	return get<AlertaKPIs>('/business/alertas/kpis');
}

export async function contarNoLeidas() {
	return get<{ total: number }>('/business/alertas/no-leidas');
}

export async function marcarLeida(id: string) {
	return put<{ message: string }>(`/business/alertas/${id}/leida`, {});
}

export async function marcarResuelta(id: string) {
	return put<{ message: string }>(`/business/alertas/${id}/resuelta`, {});
}

export async function marcarTodasLeidas(filtros?: { categoria?: string; severidad?: string }) {
	return put<{ afectadas: number }>('/business/alertas/marcar-todas-leidas', filtros ?? {});
}

// --- Configuración ---

export async function obtenerConfiguracion() {
	return get<ConfiguracionAlerta[]>('/business/alertas/configuracion');
}

export async function actualizarConfiguracion(
	tipo: string,
	activo: boolean,
	umbrales: Record<string, number>
) {
	return put<{ message: string }>(`/business/alertas/configuracion/${tipo}`, { activo, umbrales });
}

// --- Eliminación ---

export async function eliminarAlerta(id: string) {
	return del<{ message: string }>(`/business/alertas/${id}`);
}

export async function eliminarAlertasResueltas() {
	return del<{ ocultadas: number }>('/business/alertas/resueltas');
}
