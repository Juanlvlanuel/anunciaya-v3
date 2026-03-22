# Reglas de Testing — AnunciaYA v3.0

> **Propósito:** Estándares obligatorios para testing automatizado. Aplica a todos los módulos nuevos y existentes.
> **Complemento:** CLAUDE.md contiene el resumen. Este documento tiene el detalle completo.

---

## 1. Tipos de Test

| Tipo | Framework | Ubicación | Qué prueba | Cuándo usarlo |
|------|-----------|-----------|------------|---------------|
| **API Test** | Vitest | `apps/api/src/__tests__/` | Endpoints backend, lógica de negocio | Todo módulo con endpoints |
| **E2E Test** | Playwright | `apps/web/e2e/` | Flujos de UI en navegador real | Flujos críticos de cada módulo |

---

## 2. Comandos

```bash
# API Tests (desde apps/api)
cd apps/api && pnpm test          # Ejecutar una vez
cd apps/api && pnpm test:watch    # Modo watch (re-ejecuta al guardar)

# E2E Tests (desde apps/web, requiere frontend + backend corriendo)
cd apps/web && JWT_SECRET=<secret> pnpm test:e2e

# Limpiar usuarios de prueba (opcional)
cd apps/api && LIMPIAR_DATOS_TEST=true pnpm test
```

---

## 3. `data-testid` — Regla Obligatoria

**Todo componente interactivo DEBE incluir `data-testid` desde su creación.** Esto permite que Playwright encuentre elementos sin depender de clases CSS o texto visible.

### 3.1 Convención de nombres

```
data-testid="contexto-elemento"        → Elemento único
data-testid="contexto-${id}"           → Elemento dinámico (listas)
data-testid="contexto-accion"          → Botón de acción
```

### 3.2 Elementos que SIEMPRE necesitan `data-testid`

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Botones de acción | `btn-{accion}` | `data-testid="btn-guardar"` |
| Inputs/textarea | `input-{campo}` | `data-testid="input-nombre"` |
| Items de lista | `{entidad}-${id}` | `data-testid="conversacion-${id}"` |
| Modales/overlays | `modal-{nombre}` | `data-testid="modal-confirmar"` |
| Menú contextual opciones | `menu-{opcion}` | `data-testid="menu-editar"` |
| Contenedores principales | `{modulo}-{seccion}` | `data-testid="chatya-overlay"` |
| Tabs/filtros | `tab-{nombre}` | `data-testid="tab-canjes"` |

### 3.3 Elementos que NO necesitan `data-testid`

- Texto estático (títulos, labels, descripciones)
- Iconos decorativos
- Divs de layout/spacing
- Elementos que no se interactúan ni se verifican

### 3.4 Ejemplos por componente

```tsx
// Formulario
<form data-testid="form-crear-cupon">
  <input data-testid="input-codigo" placeholder="Código" />
  <input data-testid="input-descuento" placeholder="Descuento" />
  <button data-testid="btn-crear">Crear cupón</button>
</form>

// Lista con items dinámicos
<div data-testid="lista-cupones">
  {cupones.map((c) => (
    <div key={c.id} data-testid={`cupon-${c.id}`}>
      <button data-testid={`btn-editar-${c.id}`}>Editar</button>
      <button data-testid={`btn-eliminar-${c.id}`}>Eliminar</button>
    </div>
  ))}
</div>

// Modal
<div data-testid="modal-confirmar-eliminar">
  <button data-testid="btn-confirmar">Sí, eliminar</button>
  <button data-testid="btn-cancelar">Cancelar</button>
</div>

// Menú contextual
<div data-testid="menu-contextual">
  <button data-testid="menu-editar">Editar</button>
  <button data-testid="menu-duplicar">Duplicar</button>
  <button data-testid="menu-eliminar">Eliminar</button>
</div>
```

---

## 4. Estructura de Archivos de Test

### 4.1 API Tests

```
apps/api/
├── src/
│   └── __tests__/
│       ├── helpers.ts           → Tokens, usuarios, HTTP requests (reutilizable)
│       ├── chatya.test.ts       → Tests de ChatYA (41 tests)
│       ├── cupones.test.ts      → Tests de Cupones (futuro)
│       └── alertas.test.ts      → Tests de Alertas (futuro)
└── vitest.config.ts             → Configuración Vitest
```

### 4.2 E2E Tests

```
apps/web/
├── e2e/
│   ├── chatya.spec.ts           → E2E ChatYA (10 tests)
│   ├── cupones.spec.ts          → E2E Cupones (futuro)
│   └── alertas.spec.ts          → E2E Alertas (futuro)
└── playwright.config.ts         → Configuración Playwright
```

---

## 5. Cómo Crear Tests para un Módulo Nuevo

### 5.1 API Test — Paso a paso

1. Crear archivo `apps/api/src/__tests__/{modulo}.test.ts`
2. Importar helpers existentes:
   ```typescript
   import { crearUsuariosPrueba, TOKEN_USUARIO_1, request } from './helpers';
   ```
3. Estructura:
   ```typescript
   import { describe, it, expect, beforeAll, afterAll } from 'vitest';
   import { crearUsuariosPrueba, TOKEN_USUARIO_1, request } from './helpers';

   beforeAll(async () => {
     await crearUsuariosPrueba();
   });

   describe('Cupones', () => {
     it('debe crear un cupón', async () => {
       const { status, data } = await request('/cupones', {
         method: 'POST',
         token: TOKEN_USUARIO_1(),
         body: { codigo: 'TEST10', descuento: 10, tipo: 'porcentaje' },
       });
       expect(status).toBe(201);
       expect(data.success).toBe(true);
     });
   });
   ```

### 5.2 E2E Test — Paso a paso

1. Agregar `data-testid` a los componentes del módulo
2. Crear archivo `apps/web/e2e/{modulo}.spec.ts`
3. Estructura:
   ```typescript
   import { test, expect } from '@playwright/test';

   // Helper de login (reutilizar de chatya.spec.ts o extraer a archivo compartido)

   test.describe('Cupones BS', () => {
     test('debe crear un cupón', async ({ page }) => {
       await loginYNavegar(page, '/business-studio/cupones');

       await page.locator('[data-testid="btn-crear-cupon"]').click();
       await page.locator('[data-testid="input-codigo"]').fill('TEST10');
       await page.locator('[data-testid="btn-guardar"]').click();

       await expect(page.locator('[data-testid^="cupon-"]').first()).toBeAttached();
     });
   });
   ```

---

## 6. Qué Testear y Qué No

### 6.1 SÍ testear (alto valor)

- **CRUD completo** — crear, leer, actualizar, eliminar
- **Validaciones** — datos inválidos, campos requeridos, permisos
- **Flujos de negocio** — canjear cupón, revocar transacción, bloquear usuario
- **Edge cases** — duplicados, items eliminados, usuario no autorizado
- **Integraciones** — notificaciones al crear/eliminar, cleanup automático

### 6.2 NO testear (bajo valor, alto mantenimiento)

- Estilos CSS, colores, tamaños de fuente
- Animaciones, transiciones
- Gestos móviles (swipe, pinch, long press)
- Upload de archivos (requiere mocks complejos)
- GPS/geolocalización
- Socket.io en tiempo real entre múltiples usuarios

---

## 7. Usuarios de Prueba

Los tests usan 2 usuarios fijos en la BD local:

| ID | Nombre | Correo |
|----|--------|--------|
| `a0000000-0000-4000-a000-000000000001` | Test Usuario 1 E2E | test1@anunciaya.com |
| `a0000000-0000-4000-a000-000000000002` | Test Usuario 2 E2E | test2@anunciaya.com |

- Se crean automáticamente al ejecutar `pnpm test` en apps/api
- Se mantienen en la BD para que Playwright pueda usarlos
- Para limpiarlos: `LIMPIAR_DATOS_TEST=true pnpm test`

---

## 8. Patrón Playwright para ChatYA (CSS `hidden`)

ChatYA usa montaje persistente con CSS `hidden` para preservar estado. Esto causa que Playwright encuentre elementos duplicados en el DOM (uno visible, otro oculto).

**Solución aplicada:**
- Usar `data-testid` para selectores precisos
- Usar `dispatchEvent('click')` en lugar de `.click()` cuando Playwright reporta "element is not visible"
- Usar `toBeAttached()` en lugar de `toBeVisible()` para verificar existencia en DOM
- Usar `not.toHaveClass(/hidden/)` para verificar que un contenedor está activo

```typescript
// ✅ Funciona con CSS hidden
await page.locator('[data-testid="chatya-overlay"]').not.toHaveClass(/hidden/);
await page.locator('[data-testid^="conversacion-"]').first().dispatchEvent('click');
await expect(page.locator('[data-testid="chat-input"]')).toBeAttached();

// ❌ Falla con CSS hidden
await expect(page.locator('[data-testid="chatya-overlay"]')).toBeVisible();
await page.locator('[data-testid^="conversacion-"]').first().click();
```

Este patrón aplica a cualquier componente futuro que use montaje persistente con `hidden`.

---

**Este documento crece conforme se agregan tests a nuevos módulos.**
