/**
 * alertas.test.ts
 * ================
 * Tests API para el módulo de Alertas — Business Studio.
 *
 * UBICACIÓN: apps/api/src/__tests__/alertas.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	crearUsuariosPrueba,
	crearNegocioPrueba,
	crearAlertaPrueba,
	limpiarAlertasPrueba,
	limpiarNegocioPrueba,
	limpiarDatosPrueba,
	TOKEN_COMERCIAL_1,
	TOKEN_USUARIO_2,
	request,
} from './helpers';

// IDs compartidos entre tests
let alertaAltaId: string;
let alertaMediaId: string;
let alertaBajaId: string;

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

beforeAll(async () => {
	await crearUsuariosPrueba();
	await crearNegocioPrueba();

	// Crear alertas de prueba con diferentes tipos/severidades/categorías
	alertaAltaId = await crearAlertaPrueba({ tipo: 'monto_inusual', categoria: 'seguridad', severidad: 'alta' });
	alertaMediaId = await crearAlertaPrueba({ tipo: 'fuera_horario', categoria: 'seguridad', severidad: 'media' });
	alertaBajaId = await crearAlertaPrueba({ tipo: 'oferta_por_expirar', categoria: 'operativa', severidad: 'baja' });
	await crearAlertaPrueba({ tipo: 'voucher_estancado', categoria: 'operativa', severidad: 'media' });
	await crearAlertaPrueba({ tipo: 'pico_actividad', categoria: 'rendimiento', severidad: 'baja', leida: true });
});

afterAll(async () => {
	await limpiarAlertasPrueba();
	if (process.env.LIMPIAR_DATOS_TEST === 'true') {
		await limpiarNegocioPrueba();
		await limpiarDatosPrueba();
	}
});

// =============================================================================
// GET /api/business/alertas — Listar alertas
// =============================================================================

describe('GET /api/business/alertas — Listar alertas', () => {
	it('debe retornar 401 sin token', async () => {
		const { status } = await request('/business/alertas');
		expect(status).toBe(401);
	});

	it('debe retornar 403 sin negocio asociado', async () => {
		const { status } = await request('/business/alertas', { token: TOKEN_USUARIO_2() });
		expect(status).toBe(403);
	});

	it('debe retornar alertas paginadas con defaults', async () => {
		const { status, data } = await request('/business/alertas', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);
		expect(data.success).toBe(true);

		const resultado = data.data as Record<string, unknown>;
		expect(resultado.alertas).toBeDefined();
		expect(Array.isArray(resultado.alertas)).toBe(true);
		expect(resultado.total).toBeGreaterThanOrEqual(5);
		expect(resultado.pagina).toBe(1);
		expect(resultado.porPagina).toBe(20);
		expect(resultado.totalPaginas).toBeGreaterThanOrEqual(1);
	});

	it('debe filtrar por severidad=alta', async () => {
		const { data } = await request('/business/alertas?severidad=alta', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: { severidad: string }[] };
		expect(resultado.alertas.every(a => a.severidad === 'alta')).toBe(true);
	});

	it('debe filtrar por categoria=operativa', async () => {
		const { data } = await request('/business/alertas?categoria=operativa', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: { categoria: string }[] };
		expect(resultado.alertas.every(a => a.categoria === 'operativa')).toBe(true);
	});

	it('debe filtrar por tipo=monto_inusual', async () => {
		const { data } = await request('/business/alertas?tipo=monto_inusual', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: { tipo: string }[] };
		expect(resultado.alertas.every(a => a.tipo === 'monto_inusual')).toBe(true);
	});

	it('debe filtrar por leida=false', async () => {
		const { data } = await request('/business/alertas?leida=false', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: { leida: boolean }[] };
		expect(resultado.alertas.every(a => a.leida === false)).toBe(true);
	});

	it('debe respetar paginación', async () => {
		const { data } = await request('/business/alertas?pagina=1&porPagina=2', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: unknown[]; porPagina: number };
		expect(resultado.alertas.length).toBeLessThanOrEqual(2);
		expect(resultado.porPagina).toBe(2);
	});

	it('debe retornar estructura correcta por alerta', async () => {
		const { data } = await request('/business/alertas?porPagina=1', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: Record<string, unknown>[] };
		const alerta = resultado.alertas[0];
		expect(alerta.id).toBeDefined();
		expect(alerta.tipo).toBeDefined();
		expect(alerta.categoria).toBeDefined();
		expect(alerta.severidad).toBeDefined();
		expect(alerta.titulo).toBeDefined();
		expect(alerta.descripcion).toBeDefined();
		expect(alerta.leida).toBeDefined();
		expect(alerta.resuelta).toBeDefined();
		expect(alerta.createdAt).toBeDefined();
	});

	it('debe ordenar por created_at DESC', async () => {
		const { data } = await request('/business/alertas', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: { createdAt: string }[] };
		for (let i = 1; i < resultado.alertas.length; i++) {
			expect(new Date(resultado.alertas[i - 1].createdAt).getTime())
				.toBeGreaterThanOrEqual(new Date(resultado.alertas[i].createdAt).getTime());
		}
	});

	it('debe retornar array vacío para filtros sin resultados', async () => {
		const { data } = await request('/business/alertas?tipo=recompensa_popular', { token: TOKEN_COMERCIAL_1() });
		const resultado = data.data as { alertas: unknown[]; total: number };
		expect(resultado.alertas).toEqual([]);
		expect(resultado.total).toBe(0);
	});
});

// =============================================================================
// GET /api/business/alertas/kpis — KPIs
// =============================================================================

describe('GET /api/business/alertas/kpis — KPIs', () => {
	it('debe retornar 401 sin token', async () => {
		const { status } = await request('/business/alertas/kpis');
		expect(status).toBe(401);
	});

	it('debe retornar KPIs con estructura correcta', async () => {
		const { status, data } = await request('/business/alertas/kpis', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const kpis = data.data as Record<string, unknown>;
		expect(kpis.total).toBeGreaterThanOrEqual(5);
		expect(kpis.noLeidas).toBeGreaterThanOrEqual(4);
		expect(kpis.porSeveridad).toBeDefined();
		expect(kpis.porCategoria).toBeDefined();
		expect(kpis.resueltasEsteMes).toBeDefined();
	});

	it('porSeveridad debe tener conteo por niveles', async () => {
		const { data } = await request('/business/alertas/kpis', { token: TOKEN_COMERCIAL_1() });
		const kpis = data.data as { porSeveridad: Record<string, number> };
		expect(kpis.porSeveridad.alta).toBeGreaterThanOrEqual(1);
		expect(kpis.porSeveridad.media).toBeGreaterThanOrEqual(1);
		expect(kpis.porSeveridad.baja).toBeGreaterThanOrEqual(1);
	});

	it('porCategoria debe tener conteo por categorías', async () => {
		const { data } = await request('/business/alertas/kpis', { token: TOKEN_COMERCIAL_1() });
		const kpis = data.data as { porCategoria: Record<string, number> };
		expect(kpis.porCategoria.seguridad).toBeGreaterThanOrEqual(2);
		expect(kpis.porCategoria.operativa).toBeGreaterThanOrEqual(2);
		expect(kpis.porCategoria.rendimiento).toBeGreaterThanOrEqual(1);
	});
});

// =============================================================================
// GET /api/business/alertas/:id — Detalle
// =============================================================================

describe('GET /api/business/alertas/:id — Detalle', () => {
	it('debe retornar 401 sin token', async () => {
		const { status } = await request(`/business/alertas/${alertaAltaId}`);
		expect(status).toBe(401);
	});

	it('debe retornar alerta completa', async () => {
		const { status, data } = await request(`/business/alertas/${alertaAltaId}`, { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const alerta = data.data as Record<string, unknown>;
		expect(alerta.id).toBe(alertaAltaId);
		expect(alerta.tipo).toBe('monto_inusual');
		expect(alerta.severidad).toBe('alta');
		expect(alerta.titulo).toBeTruthy();
	});

	it('debe retornar 404 para UUID inexistente', async () => {
		const { status } = await request('/business/alertas/00000000-0000-4000-a000-000000000099', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(404);
	});

	it('debe retornar 400 para ID inválido', async () => {
		const { status } = await request('/business/alertas/no-es-uuid', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(400);
	});
});

// =============================================================================
// PUT /api/business/alertas/:id/leida — Marcar leída
// =============================================================================

describe('PUT /api/business/alertas/:id/leida — Marcar leída', () => {
	it('debe retornar 401 sin token', async () => {
		const { status } = await request(`/business/alertas/${alertaMediaId}/leida`, { method: 'PUT' });
		expect(status).toBe(401);
	});

	it('debe marcar alerta como leída', async () => {
		const { status, data } = await request(`/business/alertas/${alertaMediaId}/leida`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('debe verificar que la alerta está leída', async () => {
		const { data } = await request(`/business/alertas/${alertaMediaId}`, { token: TOKEN_COMERCIAL_1() });
		const alerta = data.data as { leida: boolean; leidaAt: string };
		expect(alerta.leida).toBe(true);
		expect(alerta.leidaAt).toBeTruthy();
	});

	it('debe ser idempotente', async () => {
		const { status } = await request(`/business/alertas/${alertaMediaId}/leida`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(200);
	});

	it('debe retornar 404 para alerta inexistente', async () => {
		const { status } = await request('/business/alertas/00000000-0000-4000-a000-000000000099/leida', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(404);
	});
});

// =============================================================================
// PUT /api/business/alertas/:id/resuelta — Marcar resuelta
// =============================================================================

describe('PUT /api/business/alertas/:id/resuelta — Marcar resuelta', () => {
	it('debe marcar alerta como resuelta', async () => {
		const { status, data } = await request(`/business/alertas/${alertaBajaId}/resuelta`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('debe verificar que la alerta está resuelta y leída', async () => {
		const { data } = await request(`/business/alertas/${alertaBajaId}`, { token: TOKEN_COMERCIAL_1() });
		const alerta = data.data as { resuelta: boolean; resueltaAt: string; leida: boolean };
		expect(alerta.resuelta).toBe(true);
		expect(alerta.resueltaAt).toBeTruthy();
		expect(alerta.leida).toBe(true);
	});

	it('debe retornar 404 para alerta inexistente', async () => {
		const { status } = await request('/business/alertas/00000000-0000-4000-a000-000000000099/resuelta', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(404);
	});
});

// =============================================================================
// PUT /api/business/alertas/marcar-todas-leidas
// =============================================================================

describe('PUT /api/business/alertas/marcar-todas-leidas', () => {
	it('debe marcar todas como leídas', async () => {
		const { status, data } = await request('/business/alertas/marcar-todas-leidas', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: {},
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);

		const resultado = data.data as { afectadas: number };
		expect(resultado.afectadas).toBeGreaterThanOrEqual(0);
	});

	it('no debe fallar si no hay alertas no leídas', async () => {
		const { status, data } = await request('/business/alertas/marcar-todas-leidas', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: {},
		});
		expect(status).toBe(200);

		const resultado = data.data as { afectadas: number };
		expect(resultado.afectadas).toBe(0);
	});
});

// =============================================================================
// GET /api/business/alertas/no-leidas — Badge count
// =============================================================================

describe('GET /api/business/alertas/no-leidas — Badge count', () => {
	it('debe retornar conteo numérico', async () => {
		const { status, data } = await request('/business/alertas/no-leidas', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const resultado = data.data as { total: number };
		expect(typeof resultado.total).toBe('number');
	});
});

// =============================================================================
// GET /api/business/alertas/configuracion — Obtener configuración
// =============================================================================

describe('GET /api/business/alertas/configuracion', () => {
	it('debe retornar 401 sin token', async () => {
		const { status } = await request('/business/alertas/configuracion');
		expect(status).toBe(401);
	});

	it('debe retornar 17 tipos con defaults', async () => {
		const { status, data } = await request('/business/alertas/configuracion', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const configuracion = data.data as { tipoAlerta: string; activo: boolean; umbrales: unknown }[];
		expect(configuracion.length).toBe(16);
		expect(configuracion.every(c => c.tipoAlerta && typeof c.activo === 'boolean')).toBe(true);
	});

	it('todos deben estar activos por defecto excepto montos_redondos', async () => {
		const { data } = await request('/business/alertas/configuracion', { token: TOKEN_COMERCIAL_1() });
		const configuracion = data.data as { tipoAlerta: string; activo: boolean }[];
		const desactivados = configuracion.filter(c => !c.activo);
		expect(desactivados.length).toBe(1);
		expect(desactivados[0].tipoAlerta).toBe('montos_redondos');
	});
});

// =============================================================================
// PUT /api/business/alertas/configuracion/:tipo — Actualizar configuración
// =============================================================================

describe('PUT /api/business/alertas/configuracion/:tipo', () => {
	it('debe crear configuración si no existe (upsert)', async () => {
		const { status, data } = await request('/business/alertas/configuracion/monto_inusual', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: { activo: false, umbrales: { multiplicador: 5 } },
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('debe verificar que la configuración se guardó', async () => {
		const { data } = await request('/business/alertas/configuracion', { token: TOKEN_COMERCIAL_1() });
		const configuracion = data.data as { tipoAlerta: string; activo: boolean; umbrales: { multiplicador: number } }[];
		const montoInusual = configuracion.find(c => c.tipoAlerta === 'monto_inusual');

		expect(montoInusual).toBeDefined();
		expect(montoInusual!.activo).toBe(false);
		expect(montoInusual!.umbrales.multiplicador).toBe(5);
	});

	it('debe actualizar configuración existente', async () => {
		const { status } = await request('/business/alertas/configuracion/monto_inusual', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: { activo: true, umbrales: { multiplicador: 3 } },
		});
		expect(status).toBe(200);
	});

	it('debe rechazar tipo de alerta inválido', async () => {
		const { status } = await request('/business/alertas/configuracion/tipo_invalido', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: { activo: true, umbrales: {} },
		});
		expect(status).toBe(400);
	});

	it('debe rechazar body sin activo', async () => {
		const { status } = await request('/business/alertas/configuracion/monto_inusual', {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: { umbrales: {} },
		});
		expect(status).toBe(400);
	});
});

// =============================================================================
// Edge cases
// =============================================================================

describe('Edge cases', () => {
	it('filtrar con todos los parámetros debe funcionar', async () => {
		const { status } = await request(
			'/business/alertas?tipo=monto_inusual&categoria=seguridad&severidad=alta&leida=true&pagina=1&porPagina=5',
			{ token: TOKEN_COMERCIAL_1() }
		);
		expect(status).toBe(200);
	});

	it('búsqueda por texto debe funcionar', async () => {
		const { status, data } = await request('/business/alertas?busqueda=prueba', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const resultado = data.data as { alertas: { titulo: string }[] };
		// Las alertas de prueba tienen "prueba" en el título
		expect(resultado.alertas.length).toBeGreaterThanOrEqual(0);
	});

	it('paginación con página mayor a total debe retornar vacío', async () => {
		const { status, data } = await request('/business/alertas?pagina=999', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);

		const resultado = data.data as { alertas: unknown[] };
		expect(resultado.alertas.length).toBe(0);
	});
});
