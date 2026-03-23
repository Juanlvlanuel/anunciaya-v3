/**
 * ofertas-codigo.spec.ts
 * =======================
 * Tests E2E para Promociones (BS):
 * - Modal crear oferta/cupón
 * - Toggle Oferta/Cupón
 * - Tabs (Detalles/Ajustes/Enviar a)
 * - Filtro visibilidad
 *
 * PRE-REQUISITO:
 * - Frontend + Backend corriendo
 * - JWT_SECRET en apps/api/.env
 *
 * EJECUTAR: cd apps/web && JWT_SECRET=<secret> pnpm test:e2e
 *
 * UBICACIÓN: apps/web/e2e/ofertas-codigo.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// JWT_SECRET se pasa como variable de entorno al ejecutar:
// JWT_SECRET=<secret> pnpm test:e2e

// =============================================================================
// DATOS DE PRUEBA
// =============================================================================

const USUARIO_COMERCIAL = {
  id: 'b8bed800-703d-48eb-bc4c-f77450a05735',
  correo: 'vj.juan.24@gmail.com',
  negocioId: '0ce3b74e-8d33-485e-a144-b5def59a29fb',
  sucursalId: '41165179-a32a-4e37-a3cf-6e0e08bb9850',
};

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;

// =============================================================================
// HELPER: Login via JWT inyectado en localStorage
// =============================================================================

async function loginComercial(page: Page) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET no configurado');

  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign(
    {
      usuarioId: USUARIO_COMERCIAL.id,
      correo: USUARIO_COMERCIAL.correo,
      perfil: 'personal',
      membresia: 1,
      modoActivo: 'comercial',
      sucursalAsignada: null,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Ir a la app primero para tener acceso al dominio
  await page.goto(BASE_URL);

  // Inyectar token + usuario en localStorage
  await page.evaluate(({ token, usuario }) => {
    localStorage.setItem('ay_access_token', token);
    localStorage.setItem('ay_refresh_token', token);
    localStorage.setItem('ay_usuario', JSON.stringify({
      usuarioId: usuario.id,
      correo: usuario.correo,
      nombre: 'Test Comercial',
      perfil: 'personal',
      membresia: 1,
      modoActivo: 'comercial',
      negocioId: usuario.negocioId,
      sucursalActiva: usuario.sucursalId,
      sucursalAsignada: null,
    }));
  }, { token, usuario: USUARIO_COMERCIAL });

  // Recargar para que la app tome el token
  await page.goto(`${BASE_URL}/business-studio/ofertas`);
  await page.waitForTimeout(2000);
}

// =============================================================================
// TESTS: MODAL DE OFERTAS (BS Promociones)
// =============================================================================

test.describe('BS Promociones — Modal Oferta/Cupón', () => {
  test.skip(!JWT_SECRET, 'JWT_SECRET no configurado');
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('debe abrir modal y mostrar toggle Oferta/Cupón', async ({ page }) => {
    await loginComercial(page);

    // Click en "+ Nueva Promoción"
    const btnCrear = page.locator('[data-testid="btn-nueva-promocion-desktop"]');
    await btnCrear.click();
    await page.waitForTimeout(500);

    // Toggle visibilidad debe existir
    await expect(page.locator('[data-testid="toggle-visibilidad"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-visibilidad-publico"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-visibilidad-privado"]')).toBeAttached();
  });

  test('debe cambiar a modo Cupón y mostrar tabs', async ({ page }) => {
    await loginComercial(page);

    const btnCrear = page.locator('[data-testid="btn-nueva-promocion-desktop"]');
    await btnCrear.click();
    await page.waitForTimeout(500);

    // Click en toggle Cupón
    await page.locator('[data-testid="btn-visibilidad-privado"]').click();
    await page.waitForTimeout(300);

    // Debe mostrar tabs
    await expect(page.locator('[data-testid="tabs-oferta"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-oferta"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-exclusiva"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-clientes"]')).toBeAttached();

    // Header debe decir "Nuevo cupón"
    await expect(page.getByText('Nuevo cupón')).toBeAttached();
  });

  test('debe mostrar tab Ajustes con preview y flujo', async ({ page }) => {
    await loginComercial(page);

    const btnCrear = page.locator('[data-testid="btn-nueva-promocion-desktop"]');
    await btnCrear.click();
    await page.waitForTimeout(500);

    // Cambiar a cupón
    await page.locator('[data-testid="btn-visibilidad-privado"]').click();
    await page.waitForTimeout(300);

    // Ir a tab Ajustes
    await page.locator('[data-testid="tab-exclusiva"]').click();
    await page.waitForTimeout(300);

    // Campos deben existir
    await expect(page.locator('[data-testid="input-motivo-exclusiva"]')).toBeAttached();
    await expect(page.locator('[data-testid="input-limite-por-usuario"]')).toBeAttached();

    // Preview notificación debe existir
    await expect(page.getByText('Preview notificación')).toBeAttached();
    await expect(page.getByText('¿Cómo funciona?')).toBeAttached();
  });

  test('debe mostrar tab Clientes con dropdowns y lista', async ({ page }) => {
    await loginComercial(page);

    const btnCrear = page.locator('[data-testid="btn-nueva-promocion-desktop"]');
    await btnCrear.click();
    await page.waitForTimeout(500);

    // Cambiar a cupón
    await page.locator('[data-testid="btn-visibilidad-privado"]').click();
    await page.waitForTimeout(300);

    // Ir a tab Enviar a
    await page.locator('[data-testid="tab-clientes"]').click();
    await page.waitForTimeout(1000); // esperar carga de clientes

    // Búsqueda y dropdowns deben existir
    await expect(page.locator('[data-testid="input-buscar-cliente"]')).toBeAttached();
    await expect(page.locator('[data-testid="dropdown-nivel"]')).toBeAttached();
    await expect(page.locator('[data-testid="dropdown-actividad"]')).toBeAttached();

    // Info pill debe existir
    await expect(page.getByText('Cada cliente recibirá un código único')).toBeAttached();
  });

  test('botón Crear debe estar deshabilitado sin campos mínimos', async ({ page }) => {
    await loginComercial(page);

    const btnCrear = page.locator('[data-testid="btn-nueva-promocion-desktop"]');
    await btnCrear.click();
    await page.waitForTimeout(500);

    // Botón guardar debe estar deshabilitado
    const btnGuardar = page.locator('[data-testid="btn-guardar-oferta"]');
    await expect(btnGuardar).toBeDisabled();
  });
});

// =============================================================================
// TESTS: FILTRO VISIBILIDAD (solo desktop)
// =============================================================================

test.describe('BS Promociones — Filtro Visibilidad', () => {
  test.skip(!JWT_SECRET, 'JWT_SECRET no configurado');

  test('debe mostrar dropdown de visibilidad en desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginComercial(page);

    const dropdown = page.locator('[data-testid="dropdown-visibilidad"]');
    await expect(dropdown).toBeAttached();

    // Abrir dropdown
    await dropdown.click();
    await page.waitForTimeout(300);

    // Opciones
    await expect(page.locator('[data-testid="filtro-visibilidad-todos"]')).toBeAttached();
    await expect(page.locator('[data-testid="filtro-visibilidad-publico"]')).toBeAttached();
    await expect(page.locator('[data-testid="filtro-visibilidad-privado"]')).toBeAttached();
  });
});

// =============================================================================
// TESTS: MIS CUPONES (vista cliente)
// =============================================================================

test.describe('Mis Cupones — Vista Cliente', () => {
  test.skip(!JWT_SECRET, 'JWT_SECRET no configurado');

  test('debe acceder a la página Mis Cupones', async ({ page }) => {
    if (!JWT_SECRET) return;

    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        usuarioId: USUARIO_COMERCIAL.id,
        correo: USUARIO_COMERCIAL.correo,
        perfil: 'personal',
        membresia: 0,
        modoActivo: 'personal',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await page.goto(BASE_URL);
    await page.evaluate(({ token, id, correo }) => {
      localStorage.setItem('ay_access_token', token);
      localStorage.setItem('ay_refresh_token', token);
      localStorage.setItem('ay_usuario', JSON.stringify({
        usuarioId: id, correo, nombre: 'Test', perfil: 'personal', membresia: 0, modoActivo: 'personal',
      }));
    }, { token, id: USUARIO_COMERCIAL.id, correo: USUARIO_COMERCIAL.correo });

    await page.goto(`${BASE_URL}/mis-cupones`);
    await page.waitForTimeout(2000);

    // Tabs deben existir
    await expect(page.locator('[data-testid="tabs-cupones"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-activos"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-usados"]')).toBeAttached();
    await expect(page.locator('[data-testid="tab-historial"]')).toBeAttached();
  });
});
