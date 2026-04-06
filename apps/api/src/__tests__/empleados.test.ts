/**
 * empleados.test.ts
 * ==================
 * Tests API para el módulo de Empleados — Business Studio.
 *
 * UBICACIÓN: apps/api/src/__tests__/empleados.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	crearUsuariosPrueba,
	crearNegocioPrueba,
	limpiarNegocioPrueba,
	TOKEN_COMERCIAL_1,
	NEGOCIO_TEST_ID,
	SUCURSAL_TEST_ID,
	request,
} from './helpers';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// VARIABLES
// =============================================================================

let empleadoId: string;

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

beforeAll(async () => {
	await crearUsuariosPrueba();
	await crearNegocioPrueba();
	// Limpiar empleados de prueba anteriores
	await db.execute(sql`DELETE FROM empleados WHERE nombre LIKE 'Test Empleado%'`);
});

afterAll(async () => {
	// Limpiar empleados creados en tests
	await db.execute(sql`DELETE FROM empleados WHERE nombre LIKE 'Test Empleado%'`);
});

// =============================================================================
// GET /api/business/empleados/kpis
// =============================================================================

describe('GET /api/business/empleados/kpis', () => {
	it('401 sin token', async () => {
		const { status } = await request('/business/empleados/kpis', {});
		expect(status).toBe(401);
	});

	it('debe retornar KPIs con estructura correcta', async () => {
		const { status, data } = await request('/business/empleados/kpis', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);
		expect(data.success).toBe(true);
		const kpis = data.data as any;
		expect(kpis).toHaveProperty('total');
		expect(kpis).toHaveProperty('activos');
		expect(kpis).toHaveProperty('inactivos');
		expect(kpis).toHaveProperty('promedioCalificacion');
		expect(typeof kpis.total).toBe('number');
	});
});

// =============================================================================
// POST /api/business/empleados
// =============================================================================

describe('POST /api/business/empleados', () => {
	it('401 sin token', async () => {
		const { status } = await request('/business/empleados', { method: 'POST', body: {} });
		expect(status).toBe(401);
	});

	it('400 datos incompletos', async () => {
		const { status, data } = await request('/business/empleados', {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: { nombre: 'Test' },
		});
		expect(status).toBe(400);
		expect(data.success).toBe(false);
	});

	it('400 PIN inválido (no 4 dígitos)', async () => {
		const { status } = await request('/business/empleados', {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: {
				nombre: 'Test Empleado PIN',
				nick: 'testpin',
				pinAcceso: '12',
				sucursalId: SUCURSAL_TEST_ID,
			},
		});
		expect(status).toBe(400);
	});

	it('debe crear empleado correctamente', async () => {
		const { status, data } = await request('/business/empleados', {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: {
				nombre: 'Test Empleado Crear',
				nick: 'testempleado1',
				pinAcceso: '1234',
				sucursalId: SUCURSAL_TEST_ID,
				especialidad: 'Cajero',
				puedeRegistrarVentas: true,
				puedeProcesarCanjes: false,
			},
		});
		expect(status).toBe(201);
		expect(data.success).toBe(true);
		expect((data.data as any).nombre).toBe('Test Empleado Crear');
		expect((data.data as any).nick).toBe('testempleado1');
		empleadoId = (data.data as any).id;
	});

	it('409 nick duplicado', async () => {
		const { status, data } = await request('/business/empleados', {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: {
				nombre: 'Test Empleado Duplicado',
				nick: 'testempleado1',
				pinAcceso: '5678',
				sucursalId: SUCURSAL_TEST_ID,
			},
		});
		expect(status).toBe(409);
		expect(data.error).toContain('nick');
	});
});

// =============================================================================
// GET /api/business/empleados
// =============================================================================

describe('GET /api/business/empleados', () => {
	it('debe listar empleados', async () => {
		const { status, data } = await request('/business/empleados', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);
		expect(data.success).toBe(true);
		expect((data.data as any)).toHaveProperty('empleados');
		expect((data.data as any)).toHaveProperty('total');
		expect(Array.isArray((data.data as any).empleados)).toBe(true);
	});

	it('debe filtrar por búsqueda', async () => {
		const { data } = await request('/business/empleados?busqueda=testempleado1', { token: TOKEN_COMERCIAL_1() });
		expect((data.data as any).empleados.length).toBeGreaterThanOrEqual(1);
		expect((data.data as any).empleados[0].nick).toBe('testempleado1');
	});

	it('debe filtrar por activo', async () => {
		const { data } = await request('/business/empleados?activo=true', { token: TOKEN_COMERCIAL_1() });
		const todosActivos = (data.data as any).empleados.every((e: { activo: boolean }) => e.activo === true);
		expect(todosActivos).toBe(true);
	});
});

// =============================================================================
// GET /api/business/empleados/:id
// =============================================================================

describe('GET /api/business/empleados/:id', () => {
	it('debe retornar detalle completo', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}`, { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(200);
		expect((data.data as any).nombre).toBe('Test Empleado Crear');
		expect((data.data as any)).toHaveProperty('permisos');
		expect((data.data as any)).toHaveProperty('horarios');
		expect((data.data as any)).toHaveProperty('estadisticas');
		expect((data.data as any).permisos.puedeRegistrarVentas).toBe(true);
		expect((data.data as any).permisos.puedeProcesarCanjes).toBe(false);
	});

	it('404 empleado inexistente', async () => {
		const { status } = await request('/business/empleados/00000000-0000-0000-0000-000000000000', { token: TOKEN_COMERCIAL_1() });
		expect(status).toBe(404);
	});
});

// =============================================================================
// PUT /api/business/empleados/:id
// =============================================================================

describe('PUT /api/business/empleados/:id', () => {
	it('debe actualizar nombre y permisos', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: {
				nombre: 'Test Empleado Actualizado',
				puedeProcesarCanjes: true,
			},
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('409 nick duplicado al actualizar', async () => {
		// Crear otro empleado
		const { data: data2 } = await request('/business/empleados', {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: {
				nombre: 'Test Empleado Otro',
				nick: 'testempleado2',
				pinAcceso: '9999',
				sucursalId: SUCURSAL_TEST_ID,
			},
		});

		// Intentar cambiar nick al que ya existe
		const { status } = await request(`/business/empleados/${(data2.data as any).id}`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: { nick: 'testempleado1' },
		});
		expect(status).toBe(409);
	});
});

// =============================================================================
// PATCH /api/business/empleados/:id/activo
// =============================================================================

describe('PATCH /api/business/empleados/:id/activo', () => {
	it('debe desactivar empleado', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}/activo`, {
			method: 'PATCH',
			token: TOKEN_COMERCIAL_1(),
			body: { activo: false },
		});
		expect(status).toBe(200);
		expect(data.message).toContain('desactivado');
	});

	it('debe reactivar empleado', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}/activo`, {
			method: 'PATCH',
			token: TOKEN_COMERCIAL_1(),
			body: { activo: true },
		});
		expect(status).toBe(200);
		expect(data.message).toContain('activado');
	});
});

// =============================================================================
// PUT /api/business/empleados/:id/horarios
// =============================================================================

describe('PUT /api/business/empleados/:id/horarios', () => {
	it('debe guardar horarios', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}/horarios`, {
			method: 'PUT',
			token: TOKEN_COMERCIAL_1(),
			body: {
				horarios: [
					{ diaSemana: 1, horaEntrada: '09:00', horaSalida: '18:00' },
					{ diaSemana: 2, horaEntrada: '09:00', horaSalida: '18:00' },
					{ diaSemana: 3, horaEntrada: '09:00', horaSalida: '14:00' },
				],
			},
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('detalle debe incluir horarios guardados', async () => {
		const { data } = await request(`/business/empleados/${empleadoId}`, { token: TOKEN_COMERCIAL_1() });
		expect((data.data as any).horarios.length).toBe(3);
	});
});

// =============================================================================
// POST /api/business/empleados/:id/revocar-sesion
// =============================================================================

describe('POST /api/business/empleados/:id/revocar-sesion', () => {
	it('debe revocar sesiones', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}/revocar-sesion`, {
			method: 'POST',
			token: TOKEN_COMERCIAL_1(),
			body: {},
		});
		expect(status).toBe(200);
		expect(data.message).toContain('revocadas');
	});
});

// =============================================================================
// DELETE /api/business/empleados/:id
// =============================================================================

describe('DELETE /api/business/empleados/:id', () => {
	it('debe eliminar empleado', async () => {
		const { status, data } = await request(`/business/empleados/${empleadoId}`, {
			method: 'DELETE',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('404 al intentar eliminar de nuevo', async () => {
		const { status } = await request(`/business/empleados/${empleadoId}`, {
			method: 'DELETE',
			token: TOKEN_COMERCIAL_1(),
		});
		expect(status).toBe(404);
	});
});
