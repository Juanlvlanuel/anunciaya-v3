/**
 * reportes.spec.ts
 * =================
 * Tests E2E para el módulo de Reportes — Business Studio.
 *
 * UBICACIÓN: apps/web/e2e/reportes.spec.ts
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

async function loginYNavegar(page: Page) {
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

  await page.goto(`${APP_URL}/business-studio/reportes`);
  await page.waitForLoadState('networkidle');

  // Si aparece el modal "Cambiar a modo Comercial", aceptarlo
  const btnCambiar = page.locator('button:has-text("Cambiar")');
  if (await btnCambiar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btnCambiar.click();
    await page.waitForLoadState('networkidle');
  }
}

// =============================================================================
// TESTS
// =============================================================================

test.describe('BS Reportes', () => {
  test('debe cargar la página de reportes', async ({ page }) => {
    await loginYNavegar(page);
    await expect(page.locator('[data-testid="pagina-reportes"]')).toBeAttached();
  });

  test('debe mostrar 5 tabs', async ({ page }) => {
    await loginYNavegar(page);
    await expect(page.locator('[data-testid="tab-ventas"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-clientes"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-empleados"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-promociones"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-resenas"]')).toBeAttached();
  });

  test('debe mostrar filtros de período', async ({ page }) => {
    await loginYNavegar(page);
    await expect(page.locator('[data-testid="reportes-periodos"]')).toBeAttached();
    await expect(page.locator('[data-testid="periodo-mes"]')).toBeAttached();
  });

  test('debe mostrar botón exportar', async ({ page }) => {
    await loginYNavegar(page);
    await expect(page.locator('[data-testid="btn-exportar"]')).toBeAttached();
  });

  test('tab Ventas debe cargar datos', async ({ page }) => {
    await loginYNavegar(page);
    // Ventas es el tab por defecto
    await expect(page.locator('[data-testid="reporte-ventas"]')).toBeAttached({ timeout: 10000 });
    await expect(page.locator('[data-testid="reporte-tabla-horarios"]')).toBeAttached();
    await expect(page.locator('[data-testid="reporte-tabla-dias"]')).toBeAttached();
  });

  test('tab Clientes debe cargar datos', async ({ page }) => {
    await loginYNavegar(page);
    await page.locator('[data-testid="tab-clientes"]').dispatchEvent('click');
    await expect(page.locator('[data-testid="reporte-clientes"]')).toBeAttached({ timeout: 10000 });
    await expect(page.locator('[data-testid="reporte-top-gasto"]')).toBeAttached();
  });

  test('tab Empleados debe cargar datos', async ({ page }) => {
    await loginYNavegar(page);
    await page.locator('[data-testid="tab-empleados"]').dispatchEvent('click');
    await expect(page.locator('[data-testid="reporte-empleados"]').or(page.locator('[data-testid="reporte-empleados-vacio"]'))).toBeAttached({ timeout: 10000 });
  });

  test('tab Promociones debe cargar datos', async ({ page }) => {
    await loginYNavegar(page);
    await page.locator('[data-testid="tab-promociones"]').dispatchEvent('click');
    await expect(page.locator('[data-testid="reporte-promociones"]')).toBeAttached({ timeout: 10000 });
    await expect(page.locator('[data-testid="reporte-funnel-cupones"]')).toBeAttached();
  });

  test('tab Reseñas debe cargar datos', async ({ page }) => {
    await loginYNavegar(page);
    await page.locator('[data-testid="tab-resenas"]').dispatchEvent('click');
    await expect(page.locator('[data-testid="reporte-resenas"]')).toBeAttached({ timeout: 10000 });
    await expect(page.locator('[data-testid="reporte-distribucion-estrellas"]')).toBeAttached();
  });

  test('cambiar período debe recargar datos sin error', async ({ page }) => {
    await loginYNavegar(page);
    await expect(page.locator('[data-testid="reporte-ventas"]')).toBeAttached({ timeout: 10000 });

    // Cambiar a 7 días
    await page.locator('[data-testid="periodo-semana"]').dispatchEvent('click');
    await page.waitForTimeout(500);

    // Debe seguir mostrando datos sin error
    await expect(page.locator('[data-testid="reporte-ventas"]')).toBeAttached();
    // No debe haber error boundary visible
    await expect(page.locator('text=Unexpected Application Error')).not.toBeVisible();
  });
});
