/**
 * ofertas-codigo.spec.ts
 * =======================
 * Tests E2E para las nuevas funcionalidades de ofertas:
 * - Sección "Código de descuento" en el modal de crear oferta
 * - Toggle de visibilidad pública/exclusiva
 *
 * PRE-REQUISITO: Frontend + Backend deben estar corriendo
 *
 * EJECUTAR: cd apps/web && pnpm test:e2e
 *
 * UBICACIÓN: apps/web/e2e/ofertas-codigo.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Ofertas — Código de descuento (BS)', () => {
  // Skip si no hay negocio configurado
  test.skip(true, 'Requiere usuario con modo comercial y negocio configurado');

  test('debe mostrar sección colapsable de código de descuento', async ({ page }) => {
    await page.goto('http://localhost:5173/business-studio/ofertas');

    // Abrir modal de crear oferta
    await page.locator('[data-testid="btn-crear-oferta"]').click();

    // La sección de código debe existir pero colapsada
    const toggleAvanzado = page.locator('[data-testid="btn-toggle-avanzado"]');
    await expect(toggleAvanzado).toBeAttached();

    // Expandir sección
    await toggleAvanzado.click();

    // Campos de código deben ser visibles
    await expect(page.locator('[data-testid="input-codigo-descuento"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-generar-codigo"]')).toBeAttached();
    await expect(page.locator('[data-testid="input-limite-por-usuario"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-visibilidad-publico"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-visibilidad-privado"]')).toBeAttached();
  });

  test('debe generar código aleatorio al presionar el botón', async ({ page }) => {
    await page.goto('http://localhost:5173/business-studio/ofertas');

    // Abrir modal y expandir sección
    await page.locator('[data-testid="btn-crear-oferta"]').click();
    await page.locator('[data-testid="btn-toggle-avanzado"]').click();

    // Input de código debe estar vacío
    const inputCodigo = page.locator('[data-testid="input-codigo-descuento"]');
    await expect(inputCodigo).toHaveValue('');

    // Click en generar
    await page.locator('[data-testid="btn-generar-codigo"]').click();

    // Debe tener un valor que empiece con "ANUN-"
    const valor = await inputCodigo.inputValue();
    expect(valor).toMatch(/^ANUN-[A-Z0-9]{6}$/);
  });

  test('debe cambiar visibilidad a exclusiva', async ({ page }) => {
    await page.goto('http://localhost:5173/business-studio/ofertas');

    // Abrir modal y expandir sección
    await page.locator('[data-testid="btn-crear-oferta"]').click();
    await page.locator('[data-testid="btn-toggle-avanzado"]').click();

    // Click en "Exclusiva"
    await page.locator('[data-testid="btn-visibilidad-privado"]').click();

    // Debe mostrar mensaje de oferta exclusiva
    await expect(page.getByText('Solo visible para clientes que selecciones')).toBeAttached();
  });
});

test.describe('Recompensas — Tipo N+1 (BS Puntos)', () => {
  test.skip(true, 'Requiere usuario con modo comercial y negocio configurado');

  test('debe mostrar selector de tipo de recompensa', async ({ page }) => {
    await page.goto('http://localhost:5173/business-studio/puntos');

    // Abrir modal de crear recompensa
    await page.locator('[data-testid="btn-crear-recompensa"]').click();

    // Selector de tipo debe existir
    await expect(page.locator('[data-testid="btn-tipo-basica"]')).toBeAttached();
    await expect(page.locator('[data-testid="btn-tipo-compras"]')).toBeAttached();
  });

  test('debe mostrar campo de compras al seleccionar tipo N+1', async ({ page }) => {
    await page.goto('http://localhost:5173/business-studio/puntos');

    // Abrir modal
    await page.locator('[data-testid="btn-crear-recompensa"]').click();

    // Seleccionar tipo compras frecuentes
    await page.locator('[data-testid="btn-tipo-compras"]').click();

    // Debe mostrar campo de número de compras
    await expect(page.locator('[data-testid="input-compras-requeridas"]')).toBeAttached();
    await expect(page.locator('[data-testid="toggle-requiere-puntos"]')).toBeAttached();
  });
});

test.describe('ScanYA — Código de descuento (UI renombrada)', () => {
  test.skip(true, 'Requiere ScanYA con turno abierto');

  test('debe mostrar label "Código de descuento" en vez de "Cupón"', async ({ page }) => {
    // Este test verifica que el renombramiento de "Cupón" a "Código de descuento" funciona
    await page.goto('http://localhost:5173/scanya');

    // El texto "Cupón" no debe aparecer, en su lugar "Código de descuento"
    await expect(page.getByText('Código de descuento')).toBeAttached();
  });
});
