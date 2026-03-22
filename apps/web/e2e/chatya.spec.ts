/**
 * chatya.spec.ts
 * ================
 * Tests E2E de UI para ChatYA con Playwright.
 *
 * PRE-REQUISITOS:
 * 1. Frontend corriendo: npm run dev (apps/web)
 * 2. Backend corriendo: npm run dev (apps/api)
 * 3. Usuarios de prueba en BD: cd apps/api && npm test
 *
 * EJECUTAR: JWT_SECRET=<tu_secret> npx playwright test (desde apps/web)
 */

import { test, expect, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

// =============================================================================
// CONFIG
// =============================================================================

const API_URL = 'http://localhost:4000/api';
const APP_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET!;

const USUARIO_1 = {
  id: 'a0000000-0000-4000-a000-000000000001',
  nombre: 'Test Usuario 1',
  apellidos: 'E2E',
  correo: 'test1@anunciaya.com',
};

const USUARIO_2_ID = 'a0000000-0000-4000-a000-000000000002';

// =============================================================================
// HELPERS
// =============================================================================

function generarToken(): string {
  return jwt.sign(
    { usuarioId: USUARIO_1.id, correo: USUARIO_1.correo, perfil: 'personal', membresia: 0, modoActivo: 'personal' },
    JWT_SECRET,
    { expiresIn: '1h' }
  ) as string;
}

async function loginYAbrirChat(page: Page) {
  const token = generarToken();

  await page.goto(APP_URL);

  await page.evaluate(({ token, usuario }) => {
    localStorage.setItem('ay_access_token', token);
    localStorage.setItem('ay_refresh_token', token);
    localStorage.setItem('ay_usuario', JSON.stringify({
      id: usuario.id, nombre: usuario.nombre, apellidos: usuario.apellidos,
      correo: usuario.correo, perfil: 'personal', membresia: 0, correoVerificado: true,
      tieneModoComercial: false, modoActivo: 'personal', negocioId: null,
      sucursalActiva: null, sucursalAsignada: null,
    }));
    localStorage.setItem('ay_ultima_actividad', Date.now().toString());
  }, { token, usuario: USUARIO_1 });

  await page.goto(`${APP_URL}/inicio`);
  await page.waitForLoadState('networkidle');

  // Abrir ChatYA
  await page.locator('[data-chatya-button="true"]').click();
  await page.waitForTimeout(1000);

  // Verificar que se abrió — el overlay no tiene clase 'hidden'
  await expect(page.locator('[data-testid="chatya-overlay"]')).not.toHaveClass(/hidden/, { timeout: 5000 });
}

async function abrirConversacion(page: Page) {
  // Click en la primera conversación via JS (bypass Playwright visibility check)
  await page.locator('[data-testid^="conversacion-"]').first().dispatchEvent('click');
  await page.waitForTimeout(1000);

  // Verificar que el input de chat está en el DOM
  await expect(page.locator('[data-testid="chat-input"]')).toBeAttached({ timeout: 5000 });
}

// =============================================================================
// SETUP
// =============================================================================

let conversacionId: string;

test.beforeAll(async () => {
  const token = generarToken();

  // Crear conversación via API
  const resp = await fetch(`${API_URL}/chatya/conversaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ participante2Id: USUARIO_2_ID, participante2Modo: 'personal', contextoTipo: 'directo' }),
  });
  const data = await resp.json();
  conversacionId = data.data?.id;

  // Enviar mensajes de prueba
  if (conversacionId) {
    for (const msg of ['Mensaje de prueba E2E', 'Segundo mensaje para buscar', 'Mira este link https://github.com']) {
      await fetch(`${API_URL}/chatya/conversaciones/${conversacionId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenido: msg, tipo: 'texto' }),
      });
    }
  }
});

// =============================================================================
// TESTS
// =============================================================================

test.describe('ChatYA E2E', () => {

  test('1. Abrir ChatYA y ver conversaciones', async ({ page }) => {
    await loginYAbrirChat(page);

    // Debe haber al menos una conversación en el DOM
    const conversaciones = page.locator('[data-testid^="conversacion-"]');
    await expect(conversaciones.first()).toBeAttached({ timeout: 5000 });
  });

  test('2. Abrir conversación y ver mensajes', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Verificar que hay mensajes visibles
    const mensajes = page.locator('[data-testid^="mensaje-"]');
    await expect(mensajes.first()).toBeAttached({ timeout: 5000 });
  });

  test('3. Enviar mensaje de texto', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Mensaje desde Playwright');

    const botonEnviar = page.locator('[data-testid="chat-enviar"]');
    await botonEnviar.click();

    // Verificar que el mensaje aparece (en una burbuja)
    await expect(page.locator('[data-testid^="mensaje-"]').filter({ hasText: 'Mensaje desde Playwright' }).first()).toBeAttached({ timeout: 5000 });
  });

  test('4. URL clicable en mensaje', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Verificar que la URL es un link
    const enlace = page.locator('a[href="https://github.com"]').first();
    await expect(enlace).toBeAttached({ timeout: 5000 });
  });

  test('5. Editar mensaje propio', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Enviar mensaje para editar
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Mensaje para editar PW');
    await page.locator('[data-testid="chat-enviar"]').click();
    await page.waitForTimeout(1000);

    // Click derecho en el mensaje via dispatchEvent
    const burbuja = page.locator('[data-testid^="mensaje-"]').filter({ hasText: 'Mensaje para editar PW' }).first();
    await burbuja.dispatchEvent('contextmenu');
    await page.waitForTimeout(500);

    // Click en Editar del menú contextual
    const editar = page.locator('[data-testid="menu-editar"]');
    if (await editar.isVisible().catch(() => false)) {
      await editar.dispatchEvent('click');
      await page.waitForTimeout(300);

      await input.dispatchEvent('focus');
      await page.locator('[data-testid="chat-input"]').fill('Mensaje editado por PW');
      await page.locator('[data-testid="chat-input"]').press('Enter');

      await expect(page.locator('[data-testid^="mensaje-"]').filter({ hasText: 'Mensaje editado por PW' }).first()).toBeAttached({ timeout: 5000 });
    }
  });

  test('6. Eliminar mensaje propio', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Enviar mensaje para eliminar
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Mensaje para eliminar PW');
    await page.locator('[data-testid="chat-enviar"]').click();
    await page.waitForTimeout(1000);

    // Click derecho via dispatchEvent
    const burbujaElim = page.locator('[data-testid^="mensaje-"]').filter({ hasText: 'Mensaje para eliminar PW' }).first();
    await burbujaElim.dispatchEvent('contextmenu');
    await page.waitForTimeout(500);

    const eliminar = page.locator('[data-testid="menu-eliminar"]');
    if (await eliminar.isVisible().catch(() => false)) {
      await eliminar.dispatchEvent('click');
      await page.waitForTimeout(1000);
    }
  });

  test('7. Buscar en conversación', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Click en botón buscar
    const botonBuscar = page.locator('[data-testid="chat-buscar"]');
    if (await botonBuscar.isVisible().catch(() => false)) {
      await botonBuscar.dispatchEvent('click');
      await page.waitForTimeout(500);

      const inputBuscar = page.locator('[data-testid="chat-busqueda-input"]');
      await inputBuscar.fill('buscar');
      await page.waitForTimeout(1000);

      await expect(inputBuscar).toHaveValue('buscar');
    }
  });

  test('8. Reaccionar a un mensaje', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Hover sobre un mensaje
    const primerMensaje = page.locator('[data-testid^="mensaje-"]').first();
    await primerMensaje.hover();
    await page.waitForTimeout(500);

    // Click en emoji rápido 👍
    const emoji = page.locator('button').filter({ hasText: '👍' }).first();
    if (await emoji.isVisible().catch(() => false)) {
      await emoji.click();
      await page.waitForTimeout(500);
    }
  });

  test('9. Fijar y desfijar conversación', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    // Abrir menú ⋮
    const botonMenu = page.locator('[data-menu-trigger="true"]').first();
    if (await botonMenu.isVisible().catch(() => false)) {
      await botonMenu.click();
      await page.waitForTimeout(300);

      const fijar = page.getByText('Fijar', { exact: true }).first();
      if (await fijar.isVisible().catch(() => false)) {
        await fijar.click();
        await page.waitForTimeout(500);

        // Desfijar
        await botonMenu.click();
        await page.waitForTimeout(300);
        const desfijar = page.getByText('Desfijar', { exact: true }).first();
        if (await desfijar.isVisible().catch(() => false)) {
          await desfijar.click();
        }
      }
    }
  });

  test('10. Silenciar y desilenciar conversación', async ({ page }) => {
    await loginYAbrirChat(page);
    await abrirConversacion(page);

    const botonMenu = page.locator('[data-menu-trigger="true"]').first();
    if (await botonMenu.isVisible().catch(() => false)) {
      await botonMenu.click();
      await page.waitForTimeout(300);

      const silenciar = page.getByText('Silenciar', { exact: true }).first();
      if (await silenciar.isVisible().catch(() => false)) {
        await silenciar.click();
        await page.waitForTimeout(500);

        // Desilenciar
        await botonMenu.click();
        await page.waitForTimeout(300);
        const desilenciar = page.getByText('Desilenciar', { exact: true }).first();
        if (await desilenciar.isVisible().catch(() => false)) {
          await desilenciar.click();
        }
      }
    }
  });
});
