/**
 * alertas.spec.ts
 * ================
 * Tests E2E para el módulo de Alertas — Business Studio.
 *
 * UBICACIÓN: apps/web/e2e/alertas.spec.ts
 *
 * REQUISITOS:
 * - API corriendo en localhost:4000
 * - Frontend corriendo en localhost:3000
 * - Usuario de prueba con negocio asociado
 * - JWT_SECRET en variable de entorno
 */

import { test, expect, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:4000/api';
const APP_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET!;

const USUARIO_1 = {
	id: 'b8bed800-703d-48eb-bc4c-f77450a05735',
	nombre: 'Juan Manuel',
	apellidos: 'Valenzuela Jabalera',
	correo: 'vj.juan.24@gmail.com',
};

const NEGOCIO_TEST_ID = '0ce3b74e-8d33-485e-a144-b5def59a29fb';
const SUCURSAL_TEST_ID = '41165179-a32a-4e37-a3cf-6e0e08bb9850';

// =============================================================================
// HELPERS
// =============================================================================

function generarTokenComercial(): string {
	return jwt.sign(
		{
			usuarioId: USUARIO_1.id,
			correo: USUARIO_1.correo,
			perfil: 'personal',
			membresia: 1,
			modoActivo: 'comercial',
			sucursalAsignada: null,
		},
		JWT_SECRET,
		{ expiresIn: '1h' }
	) as string;
}

async function loginComercial(page: Page) {
	const token = generarTokenComercial();
	await page.goto(APP_URL);

	await page.evaluate(({ token, usuario, negocioId, sucursalId }) => {
		localStorage.setItem('ay_access_token', token);
		localStorage.setItem('ay_refresh_token', token);
		localStorage.setItem('ay_usuario', JSON.stringify({
			id: usuario.id,
			nombre: usuario.nombre,
			apellidos: usuario.apellidos,
			correo: usuario.correo,
			perfil: 'personal',
			membresia: 1,
			correoVerificado: true,
			tieneModoComercial: true,
			modoActivo: 'comercial',
			negocioId,
			sucursalActiva: sucursalId,
			sucursalAsignada: null,
		}));
		localStorage.setItem('ay_ultima_actividad', Date.now().toString());
	}, { token, usuario: USUARIO_1, negocioId: NEGOCIO_TEST_ID, sucursalId: SUCURSAL_TEST_ID });

	await page.goto(`${APP_URL}/business-studio/alertas`);
	await page.waitForLoadState('networkidle');
}

// =============================================================================
// SETUP
// =============================================================================

test.beforeAll(async () => {
	const token = generarTokenComercial();
	const resp = await fetch(`${API_URL}/business/alertas`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = await resp.json();
	if (!data.data?.alertas?.length) {
		console.log('⚠️ No hay alertas de prueba. Ejecuta primero: cd apps/api && pnpm test');
	}
});

// =============================================================================
// TESTS
// =============================================================================

test.describe('Página de Alertas — Business Studio', () => {
	test('1. debe cargar la página y mostrar header', async ({ page }) => {
		await loginComercial(page);
		await expect(page.getByTestId('pagina-alertas')).toBeAttached({ timeout: 10000 });
		await expect(page.getByTestId('header-alertas')).toBeAttached({ timeout: 5000 });
	});

	test('2. debe mostrar KPIs cargados', async ({ page }) => {
		await loginComercial(page);
		await expect(page.getByTestId('kpis-alertas')).toBeAttached({ timeout: 10000 });
		await expect(page.getByTestId('kpi-total-alertas')).toBeAttached({ timeout: 5000 });
		await expect(page.getByTestId('kpi-no-leidas')).toBeAttached({ timeout: 5000 });
	});

	test('3. debe mostrar filtros', async ({ page }) => {
		await loginComercial(page);
		await expect(page.getByTestId('filtros-alertas')).toBeAttached({ timeout: 10000 });
		await expect(page.getByTestId('chip-categoria-todas')).toBeAttached();
	});

	test('4. debe abrir dropdown de categoría', async ({ page }) => {
		await loginComercial(page);
		await page.getByTestId('chip-categoria-todas').click();
		await expect(page.getByTestId('dropdown-cat-todas')).toBeAttached({ timeout: 3000 });
	});

	test('5. debe filtrar por categoría', async ({ page }) => {
		await loginComercial(page);
		await page.getByTestId('chip-categoria-todas').click();
		await page.getByTestId('chip-categoria-seguridad').click();
		await page.waitForTimeout(500);
	});

	test('6. debe buscar alertas por texto', async ({ page }) => {
		await loginComercial(page);
		const input = page.getByTestId('input-busqueda-alertas');
		await expect(input).toBeAttached({ timeout: 10000 });
		await input.fill('monto');
		await page.waitForTimeout(600);
	});

	test('7. desktop: debe mostrar tabla', async ({ page }) => {
		await loginComercial(page);
		await expect(page.getByTestId('tabla-alertas-desktop')).toBeAttached({ timeout: 10000 });
	});

	test('8. debe abrir modal detalle al click en alerta', async ({ page }) => {
		await loginComercial(page);
		const primeraFila = page.locator('[data-testid^="fila-alerta-"]').first();
		await expect(primeraFila).toBeAttached({ timeout: 10000 });
		await primeraFila.click();
		await expect(page.getByTestId('modal-detalle-alerta')).toBeAttached({ timeout: 5000 });
	});

	test('9. modal detalle debe mostrar botón marcar como resuelta', async ({ page }) => {
		await loginComercial(page);
		const primeraFila = page.locator('[data-testid^="fila-alerta-"]').first();
		await primeraFila.click();
		await expect(page.getByTestId('btn-detalle-marcar-resuelta')).toBeAttached({ timeout: 5000 });
	});

	test('10. modal detalle debe mostrar botón eliminar', async ({ page }) => {
		await loginComercial(page);
		const primeraFila = page.locator('[data-testid^="fila-alerta-"]').first();
		await primeraFila.click();
		await expect(page.getByTestId('btn-detalle-eliminar')).toBeAttached({ timeout: 5000 });
	});

	test('11. debe abrir modal de configuración', async ({ page }) => {
		await loginComercial(page);
		await page.getByTestId('btn-configuracion-alertas').click();
		await expect(page.getByTestId('modal-configuracion-alertas')).toBeAttached({ timeout: 5000 });
	});

	test('12. modal configuración debe mostrar tabs', async ({ page }) => {
		await loginComercial(page);
		await page.getByTestId('btn-configuracion-alertas').click();
		await expect(page.getByTestId('tabs-config-alertas')).toBeAttached({ timeout: 5000 });
		await expect(page.getByTestId('seccion-seguridad')).toBeAttached();
		await expect(page.getByTestId('seccion-operativa')).toBeAttached();
		await expect(page.getByTestId('seccion-rendimiento')).toBeAttached();
		await expect(page.getByTestId('seccion-engagement')).toBeAttached();
	});
});
