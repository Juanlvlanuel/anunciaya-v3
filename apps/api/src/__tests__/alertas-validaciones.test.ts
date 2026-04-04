/**
 * alertas-validaciones.test.ts
 * ==============================
 * Tests de validación Zod para el módulo de Alertas.
 * No requieren BD ni API corriendo.
 *
 * UBICACIÓN: apps/api/src/__tests__/alertas-validaciones.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
	filtrosAlertasSchema,
	actualizarConfiguracionSchema,
	alertaIdSchema,
	tipoAlertaParamSchema,
} from '../validations/alertas.schema';

// =============================================================================
// Validaciones Zod — Filtros de alertas
// =============================================================================

describe('Validaciones Zod — Filtros de alertas', () => {
	it('debe aceptar query vacío con defaults', () => {
		const resultado = filtrosAlertasSchema.safeParse({});
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.pagina).toBe(1);
			expect(resultado.data.porPagina).toBe(20);
		}
	});

	it('debe parsear pagina como número', () => {
		const resultado = filtrosAlertasSchema.safeParse({ pagina: '3' });
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.pagina).toBe(3);
		}
	});

	it('debe aceptar severidad válida', () => {
		const resultado = filtrosAlertasSchema.safeParse({ severidad: 'alta' });
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar severidad inválida', () => {
		const resultado = filtrosAlertasSchema.safeParse({ severidad: 'critica' });
		expect(resultado.success).toBe(false);
	});

	it('debe aceptar categoría válida', () => {
		const resultado = filtrosAlertasSchema.safeParse({ categoria: 'seguridad' });
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar categoría inválida', () => {
		const resultado = filtrosAlertasSchema.safeParse({ categoria: 'otra' });
		expect(resultado.success).toBe(false);
	});

	it('debe coercionar leida string a boolean', () => {
		const resultado = filtrosAlertasSchema.safeParse({ leida: 'true' });
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.leida).toBe(true);
		}
	});

	it('debe limitar porPagina a máximo 50', () => {
		const resultado = filtrosAlertasSchema.safeParse({ porPagina: '100' });
		expect(resultado.success).toBe(false);
	});

	it('debe rechazar porPagina 0', () => {
		const resultado = filtrosAlertasSchema.safeParse({ porPagina: '0' });
		expect(resultado.success).toBe(false);
	});

	it('debe aceptar tipo válido', () => {
		const resultado = filtrosAlertasSchema.safeParse({ tipo: 'monto_inusual' });
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar tipo inválido', () => {
		const resultado = filtrosAlertasSchema.safeParse({ tipo: 'tipo_inexistente' });
		expect(resultado.success).toBe(false);
	});

	it('debe aceptar búsqueda con texto', () => {
		const resultado = filtrosAlertasSchema.safeParse({ busqueda: 'monto' });
		expect(resultado.success).toBe(true);
	});
});

// =============================================================================
// Validaciones Zod — Configuración de alertas
// =============================================================================

describe('Validaciones Zod — Configuración de alertas', () => {
	it('debe aceptar activo boolean + umbrales válidos', () => {
		const resultado = actualizarConfiguracionSchema.safeParse({
			activo: true,
			umbrales: { multiplicador: 5 },
		});
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar activo no-boolean', () => {
		const resultado = actualizarConfiguracionSchema.safeParse({
			activo: 'si',
			umbrales: {},
		});
		expect(resultado.success).toBe(false);
	});

	it('debe aceptar umbrales vacíos', () => {
		const resultado = actualizarConfiguracionSchema.safeParse({
			activo: false,
			umbrales: {},
		});
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar umbrales con valores negativos', () => {
		const resultado = actualizarConfiguracionSchema.safeParse({
			activo: true,
			umbrales: { multiplicador: -1 },
		});
		expect(resultado.success).toBe(false);
	});

	it('debe usar umbrales vacíos por defecto si no se envían', () => {
		const resultado = actualizarConfiguracionSchema.safeParse({ activo: true });
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.umbrales).toEqual({});
		}
	});
});

// =============================================================================
// Validaciones Zod — Parámetros UUID
// =============================================================================

describe('Validaciones Zod — alertaIdSchema', () => {
	it('debe aceptar UUID válido', () => {
		const resultado = alertaIdSchema.safeParse({ id: 'a0000000-0000-4000-a000-000000000001' });
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar ID no UUID', () => {
		const resultado = alertaIdSchema.safeParse({ id: 'no-es-uuid' });
		expect(resultado.success).toBe(false);
	});
});

// =============================================================================
// Validaciones Zod — tipoAlertaParamSchema
// =============================================================================

describe('Validaciones Zod — tipoAlertaParamSchema', () => {
	it('debe aceptar tipo válido', () => {
		const resultado = tipoAlertaParamSchema.safeParse({ tipo: 'caida_ventas' });
		expect(resultado.success).toBe(true);
	});

	it('debe rechazar tipo inválido', () => {
		const resultado = tipoAlertaParamSchema.safeParse({ tipo: 'tipo_falso' });
		expect(resultado.success).toBe(false);
	});
});
