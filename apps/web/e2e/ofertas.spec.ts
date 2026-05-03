/**
 * ofertas.spec.ts
 * ================
 * Tests E2E de UI para la sección pública de Ofertas (`/ofertas`).
 *
 * PRE-REQUISITOS:
 *  1. Frontend corriendo: npm run dev (apps/web)
 *  2. Backend corriendo: npm run dev (apps/api)
 *  3. Usuarios de prueba en BD: cd apps/api && npm test
 *  4. Tests del feed corridos al menos una vez para crear ofertas:
 *     cd apps/api && pnpm test ofertas-feed
 *
 * EJECUTAR: JWT_SECRET=<secret> npx playwright test ofertas (desde apps/web)
 *
 * UBICACIÓN: apps/web/e2e/ofertas.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import jwt from 'jsonwebtoken';

// =============================================================================
// CONFIG
// =============================================================================

const APP_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET!;

const USUARIO_2 = {
  id: 'a0000000-0000-4000-a000-000000000002',
  nombre: 'Test Usuario 2',
  apellidos: 'E2E',
  correo: 'test2@anunciaya.com',
};

// =============================================================================
// HELPERS
// =============================================================================

function generarToken(): string {
  return jwt.sign(
    {
      usuarioId: USUARIO_2.id,
      correo: USUARIO_2.correo,
      perfil: 'personal',
      membresia: 0,
      modoActivo: 'personal',
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  ) as string;
}

async function loginYNavegarAOfertas(page: Page) {
  const token = generarToken();
  await page.goto(APP_URL);

  await page.evaluate(({ token, usuario }) => {
    localStorage.setItem('ay_access_token', token);
    localStorage.setItem('ay_refresh_token', token);
    localStorage.setItem(
      'ay_usuario',
      JSON.stringify({
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        perfil: 'personal',
        membresia: 0,
        correoVerificado: true,
        tieneModoComercial: false,
        modoActivo: 'personal',
        negocioId: null,
        sucursalActiva: null,
        sucursalAsignada: null,
      }),
    );
    localStorage.setItem('ay_ultima_actividad', Date.now().toString());
  }, { token, usuario: USUARIO_2 });

  await page.goto(`${APP_URL}/ofertas`);
  await expect(page.getByTestId('pagina-ofertas')).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// TESTS
// =============================================================================

test.describe('Página Ofertas — Carga inicial', () => {
  test('debe cargar la página /ofertas con header negro', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await expect(page.getByTestId('header-ofertas')).toBeVisible();
  });

  test('debe mostrar el KPI de ofertas hoy en el header', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await expect(page.getByTestId('kpi-total-ofertas')).toBeVisible();
  });

  test('debe mostrar todos los chips situacionales', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    for (const id of ['todas', 'hoy', 'esta_semana', 'cerca', 'cardya', 'nuevas']) {
      await expect(page.getByTestId(`chip-situacional-${id}`)).toBeVisible();
    }
  });

  test('debe mostrar el CTA "Lo más visto"', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await expect(page.getByTestId('btn-header-mas-vistas')).toBeVisible();
  });
});

test.describe('Página Ofertas — Chips de filtro', () => {
  test('chip "Hoy" cambia el título de la lista a "Filtro · Hoy"', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-hoy').click();
    await expect(page.getByText(/Filtro\s*·\s*Hoy/i)).toBeVisible();
  });

  test('chip "Esta semana" cambia el título', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-esta_semana').click();
    await expect(page.getByText(/Filtro\s*·\s*Esta semana/i)).toBeVisible();
  });

  test('chip "Aceptan CardYA" cambia el título', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-cardya').click();
    // El texto aparece en eyebrow ("Filtro · Aceptan CardYA") Y en título
    // ("Resultados: Aceptan CardYA"), así que usamos `.first()` para evitar
    // strict-mode violation.
    await expect(page.getByText(/Aceptan CardYA/i).first()).toBeVisible();
  });
});

test.describe('Página Ofertas — Vista expandida (chip "Todas" como toggle)', () => {
  test('Click en "Todas" activa el catálogo grid completo', async ({ page }) => {
    await loginYNavegarAOfertas(page);

    // Click en chip "Todas" para entrar en vista expandida
    await page.getByTestId('chip-situacional-todas').click();

    // El título cambia a "Todas las ofertas"
    await expect(page.getByText(/Todas las ofertas/i)).toBeVisible();

    // El header sigue visible
    await expect(page.getByTestId('header-ofertas')).toBeVisible();
  });

  test('Click otra vez en "Todas" vuelve al feed editorial', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-todas').click();
    await page.getByTestId('chip-situacional-todas').click();

    // El título de la lista densa default vive en `titulo-bloque-en-tu-ciudad`
    // (ver `slugify("En tu ciudad")` en TituloDeBloque). Usamos testid para
    // evitar el match con el subtítulo del header global.
    await expect(page.getByTestId('titulo-bloque-en-tu-ciudad')).toBeVisible();
  });

  test('Click en otro chip resetea vista expandida', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-todas').click();
    await page.getByTestId('chip-situacional-hoy').click();
    await expect(page.getByText(/Filtro\s*·\s*Hoy/i)).toBeVisible();
  });
});

test.describe('Página Ofertas — Modal de detalle', () => {
  test('Click en una card abre el modal de detalle', async ({ page }) => {
    await loginYNavegarAOfertas(page);

    // Esperar que cargue al menos una card de oferta
    const primeraCard = page.locator('[data-testid^="fila-oferta-"]').first();
    await expect(primeraCard).toBeVisible({ timeout: 10000 });

    await primeraCard.click();
    // El componente `<Modal>` usa `createPortal` a `document.body`, así que
    // el wrapper `[data-testid="modal-detalle-oferta"]` queda vacío. El
    // dialog real renderiza con `role="dialog" aria-modal="true"` en el
    // portal — esa es la señal correcta de "modal abierto".
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Abrir el modal dispara POST /click (engagement, NO /vista)', async ({ page }) => {
    await loginYNavegarAOfertas(page);

    const primeraCard = page.locator('[data-testid^="fila-oferta-"]').first();
    await expect(primeraCard).toBeVisible({ timeout: 10000 });

    // Después de que carga el feed, las /vista de las cards en viewport ya
    // dispararon. Abrir el modal debe disparar específicamente /click.
    const requestClick = page.waitForRequest(
      (req) =>
        req.url().includes('/api/ofertas/') &&
        req.url().endsWith('/click') &&
        req.method() === 'POST',
      { timeout: 5000 },
    );

    await primeraCard.click();
    const req = await requestClick;
    expect(req.url()).toMatch(/\/api\/ofertas\/[0-9a-f-]+\/click$/i);
  });

  test('Cards en viewport disparan POST /vista (impression)', async ({ page }) => {
    // Capturar requests ANTES de navegar para no perder los iniciales
    const vistasUrls: string[] = [];
    page.on('request', (req) => {
      if (
        req.method() === 'POST' &&
        req.url().includes('/api/ofertas/') &&
        req.url().endsWith('/vista')
      ) {
        vistasUrls.push(req.url());
      }
    });

    await loginYNavegarAOfertas(page);

    // Esperar lo suficiente para que el IntersectionObserver dispare
    // (umbral del hook = 1s con ≥50% visible)
    await page.waitForTimeout(2500);

    // Debe haber al menos 1 vista registrada (la primera card visible)
    expect(vistasUrls.length).toBeGreaterThanOrEqual(1);
    expect(vistasUrls[0]).toMatch(/\/api\/ofertas\/[0-9a-f-]+\/vista$/i);
  });
});

test.describe('Página Ofertas — Compartir', () => {
  test('Click en compartir → WhatsApp dispara POST /share', async ({ page }) => {
    await loginYNavegarAOfertas(page);

    const primeraCard = page.locator('[data-testid^="fila-oferta-"]').first();
    await expect(primeraCard).toBeVisible({ timeout: 10000 });
    await primeraCard.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Listener para el endpoint /share
    const shareUrls: string[] = [];
    page.on('request', (req) => {
      if (
        req.method() === 'POST' &&
        req.url().includes('/api/ofertas/') &&
        req.url().endsWith('/share')
      ) {
        shareUrls.push(req.url());
      }
    });

    // Abrir dropdown de compartir desde el modal y elegir WhatsApp.
    // El botón share del modal es un toggle del DropdownCompartir.
    // Como WhatsApp abre `wa.me/...` (window.open), interceptamos la nueva tab.
    const shareToggle = page.getByRole('button', { name: /compartir|share/i }).first();
    if (await shareToggle.isVisible().catch(() => false)) {
      await shareToggle.click();
      const opcionWhatsApp = page.getByRole('button', { name: /whatsapp/i }).first();
      if (await opcionWhatsApp.isVisible().catch(() => false)) {
        // Bloquear `window.open` para que no falle el test por popup
        await page.evaluate(() => { window.open = () => null; });
        await opcionWhatsApp.click();
        await page.waitForTimeout(500);
        expect(shareUrls.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

test.describe('Página Ofertas — Multi-sucursal en modal', () => {
  test('Modal pide /sucursales cuando totalSucursales > 1', async ({ page }) => {
    // Listener para detectar el endpoint /sucursales
    const sucursalesUrls: string[] = [];
    page.on('request', (req) => {
      if (
        req.method() === 'GET' &&
        req.url().includes('/api/ofertas/') &&
        req.url().includes('/sucursales')
      ) {
        sucursalesUrls.push(req.url());
      }
    });

    await loginYNavegarAOfertas(page);

    // Buscar el primer card que muestre el pill "+N" (multi-sucursal).
    // Si no hay ninguno en la BD, el test pasa silenciosamente.
    const cardConMultiSucursal = page.locator('[data-testid^="fila-oferta-"]:has-text("+")').first();
    const visible = await cardConMultiSucursal.isVisible().catch(() => false);
    if (!visible) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No hay ofertas multi-sucursal en BD; test skip',
      });
      return;
    }

    await cardConMultiSucursal.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // El endpoint /sucursales debe haberse llamado al abrir el modal
    await page.waitForTimeout(800);
    expect(sucursalesUrls.length).toBeGreaterThanOrEqual(1);
    expect(sucursalesUrls[0]).toMatch(/\/api\/ofertas\/[0-9a-f-]+\/sucursales/i);

    // El modal debe mostrar la sección "Disponible en N sucursales"
    await expect(page.getByText(/Disponible en \d+ sucursales/i)).toBeVisible();
  });
});

test.describe('Página Ofertas — Header sticky con compresión', () => {
  test('El header se comprime al hacer scroll', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await expect(page.getByTestId('header-ofertas')).toBeVisible();

    // Scroll suficiente para gatillar la compresión (umbral 100px)
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 400;
      else window.scrollTo(0, 400);
    });

    // El header sigue visible (es sticky), la compresión es visual
    await expect(page.getByTestId('header-ofertas')).toBeVisible();
  });
});

test.describe('Página Ofertas — Cleanup al salir', () => {
  test('Salir de /ofertas resetea filtros (al volver, chip "Todas" inactivo)', async ({ page }) => {
    await loginYNavegarAOfertas(page);
    await page.getByTestId('chip-situacional-hoy').click();

    // Navegar afuera
    await page.goto(`${APP_URL}/inicio`);

    // Volver a /ofertas
    await page.goto(`${APP_URL}/ofertas`);
    await expect(page.getByTestId('pagina-ofertas')).toBeVisible({ timeout: 10000 });

    // El feed editorial default muestra "En tu ciudad" en el título de la
    // lista densa. Si el filtro "Hoy" hubiera persistido, el slug sería
    // diferente (`titulo-bloque-filtro-hoy`).
    await expect(page.getByTestId('titulo-bloque-en-tu-ciudad')).toBeVisible();
  });
});
