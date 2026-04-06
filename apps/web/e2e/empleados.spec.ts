/**
 * empleados.spec.ts
 * ==================
 * Tests E2E para el módulo de Empleados — Business Studio.
 *
 * UBICACIÓN: apps/web/e2e/empleados.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

const APP_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET!;

const USUARIO = {
	id: 'b8bed800-703d-48eb-bc4c-f77450a05735',
	nombre: 'Juan Manuel',
	apellidos: 'Valenzuela Jabalera',
	correo: 'vj.juan.24@gmail.com',
};

const NEGOCIO_ID = '0ce3b74e-8d33-485e-a144-b5def59a29fb';
const SUCURSAL_ID = '41165179-a32a-4e37-a3cf-6e0e08bb9850';

function generarToken(): string {
	return jwt.sign(
		{
			usuarioId: USUARIO.id,
			correo: USUARIO.correo,
			perfil: 'personal',
			membresia: 1,
			modoActivo: 'comercial',
			sucursalAsignada: null,
		},
		JWT_SECRET,
		{ expiresIn: '1h' }
	) as string;
}

async function login(page: Page) {
	const token = generarToken();
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
	}, { token, usuario: USUARIO, negocioId: NEGOCIO_ID, sucursalId: SUCURSAL_ID });

	await page.goto(`${APP_URL}/business-studio/empleados`);
	await page.waitForLoadState('networkidle');
}

test.describe('Página de Empleados — Business Studio', () => {
	test('1. debe cargar la página', async ({ page }) => {
		await login(page);
		await expect(page.getByTestId('pagina-empleados')).toBeAttached({ timeout: 10000 });
	});

	test('2. debe mostrar KPIs', async ({ page }) => {
		await login(page);
		await expect(page.getByTestId('kpis-empleados')).toBeAttached({ timeout: 10000 });
		await expect(page.getByTestId('kpi-total-empleados')).toBeAttached({ timeout: 5000 });
	});

	test('3. debe mostrar filtros', async ({ page }) => {
		await login(page);
		await expect(page.getByTestId('filtros-empleados')).toBeAttached({ timeout: 10000 });
		await expect(page.getByTestId('chip-todos')).toBeAttached();
		await expect(page.getByTestId('chip-activos')).toBeAttached();
	});

	test('4. debe mostrar botón crear empleado', async ({ page }) => {
		await login(page);
		await expect(page.getByTestId('btn-crear-empleado')).toBeAttached({ timeout: 10000 });
	});

	test('5. debe abrir modal de crear empleado', async ({ page }) => {
		await login(page);
		await page.getByTestId('btn-crear-empleado').click();
		await expect(page.getByTestId('modal-empleado')).toBeAttached({ timeout: 5000 });
		await expect(page.getByTestId('input-nombre-empleado')).toBeAttached();
		await expect(page.getByTestId('input-nick-empleado')).toBeAttached();
		await expect(page.getByTestId('input-pin-empleado')).toBeAttached();
	});

	test('6. desktop: debe mostrar tabla', async ({ page }) => {
		await login(page);
		await expect(page.getByTestId('tabla-empleados-desktop')).toBeAttached({ timeout: 10000 });
	});

	test('7. debe abrir detalle al click en empleado', async ({ page }) => {
		await login(page);
		const primeraFila = page.locator('[data-testid^="fila-empleado-"]').first();
		if (await primeraFila.isVisible()) {
			await primeraFila.click();
			await expect(page.getByTestId('modal-detalle-empleado')).toBeAttached({ timeout: 5000 });
		}
	});

	test('8. debe filtrar por estado activo', async ({ page }) => {
		await login(page);
		await page.getByTestId('chip-activos').click();
		await page.waitForTimeout(500);
	});

	test('9. debe buscar empleados', async ({ page }) => {
		await login(page);
		const input = page.getByTestId('input-busqueda-empleados');
		await expect(input).toBeAttached({ timeout: 10000 });
		await input.fill('carlos');
		await page.waitForTimeout(600);
	});
});
