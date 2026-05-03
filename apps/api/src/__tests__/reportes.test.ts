/**
 * reportes.test.ts
 * =================
 * Tests API para el módulo de Reportes — Business Studio.
 *
 * UBICACIÓN: apps/api/src/__tests__/reportes.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  crearUsuariosPrueba,
  crearNegocioPrueba,
  limpiarNegocioPrueba,
  limpiarDatosPrueba,
  TOKEN_COMERCIAL_1,
  TOKEN_USUARIO_2,
  SUCURSAL_TEST_ID,
  request,
  BASE_URL,
} from './helpers';

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

beforeAll(async () => {
  await crearUsuariosPrueba();
  await crearNegocioPrueba();
});

afterAll(async () => {
  if (process.env.LIMPIAR_DATOS_TEST === 'true') {
    await limpiarNegocioPrueba();
    await limpiarDatosPrueba();
  }
});

// =============================================================================
// AUTENTICACIÓN Y VALIDACIÓN
// =============================================================================

describe('Reportes — Autenticación', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request('/business/reportes?tab=ventas');
    expect(status).toBe(401);
  });

  it('debe retornar 403 sin negocio asociado', async () => {
    const { status } = await request('/business/reportes?tab=ventas', {
      token: TOKEN_USUARIO_2(),
    });
    expect(status).toBe(403);
  });

  it('debe retornar 400 con tab inválido', async () => {
    const { status, data } = await request('/business/reportes?tab=invalido', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(400);
    expect(data.success).toBe(false);
  });
});

// =============================================================================
// TAB VENTAS
// =============================================================================

describe('GET /api/business/reportes?tab=ventas', () => {
  it('debe retornar reporte de ventas con periodo por defecto', async () => {
    const { status, data } = await request('/business/reportes?tab=ventas', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.horariosPico).toBeDefined();
    expect(Array.isArray(reporte.horariosPico)).toBe(true);
    expect(reporte.ventasPorDia).toBeDefined();
    expect(Array.isArray(reporte.ventasPorDia)).toBe(true);
    expect(reporte.tasaRevocacion).toBeDefined();
    expect(reporte.metodosPago).toBeDefined();
  });

  it('debe aceptar filtro de periodo', async () => {
    const { status, data } = await request('/business/reportes?tab=ventas&periodo=semana', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe aceptar filtro de sucursal', async () => {
    const { status, data } = await request(`/business/reportes?tab=ventas&sucursalId=${SUCURSAL_TEST_ID}`, {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('debe retornar estructura correcta de tasaRevocacion', async () => {
    const { data } = await request('/business/reportes?tab=ventas', {
      token: TOKEN_COMERCIAL_1(),
    });
    const reporte = data.data as Record<string, unknown>;
    const tasa = reporte.tasaRevocacion as Record<string, unknown>;
    expect(typeof tasa.total).toBe('number');
    expect(typeof tasa.revocadas).toBe('number');
    expect(typeof tasa.porcentaje).toBe('number');
  });

  it('debe retornar estructura correcta de metodosPago', async () => {
    const { data } = await request('/business/reportes?tab=ventas', {
      token: TOKEN_COMERCIAL_1(),
    });
    const reporte = data.data as Record<string, unknown>;
    const metodos = reporte.metodosPago as Record<string, unknown>;
    expect(typeof metodos.efectivo).toBe('number');
    expect(typeof metodos.tarjeta).toBe('number');
    expect(typeof metodos.transferencia).toBe('number');
    expect(typeof metodos.total).toBe('number');
  });

  it('debe aceptar fechaInicio y fechaFin', async () => {
    const { status, data } = await request('/business/reportes?tab=ventas&fechaInicio=2026-03-30&fechaFin=2026-04-06T23:59:59', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.horariosPico).toBeDefined();
    expect(reporte.ventasPorDia).toBeDefined();
    expect(reporte.metodosPago).toBeDefined();
  });
});

// =============================================================================
// TAB CLIENTES
// =============================================================================

describe('GET /api/business/reportes?tab=clientes', () => {
  it('debe retornar reporte de clientes', async () => {
    const { status, data } = await request('/business/reportes?tab=clientes', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.topPorGasto).toBeDefined();
    expect(Array.isArray(reporte.topPorGasto)).toBe(true);
    expect(reporte.topPorFrecuencia).toBeDefined();
    expect(Array.isArray(reporte.topPorFrecuencia)).toBe(true);
    expect(typeof reporte.clientesEnRiesgo).toBe('number');
    expect(typeof reporte.clientesPerdidos).toBe('number');
    expect(typeof reporte.totalClientes).toBe('number');
    expect(typeof reporte.gastoPromedioPorCliente).toBe('number');
    expect(reporte.tendenciaAdquisicion).toBeDefined();
  });
});

// =============================================================================
// TAB EMPLEADOS
// =============================================================================

describe('GET /api/business/reportes?tab=empleados', () => {
  it('debe retornar reporte de empleados', async () => {
    const { status, data } = await request('/business/reportes?tab=empleados', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.empleados).toBeDefined();
    expect(Array.isArray(reporte.empleados)).toBe(true);
  });
});

// =============================================================================
// TAB PROMOCIONES
// =============================================================================

describe('GET /api/business/reportes?tab=promociones', () => {
  it('debe retornar reporte de promociones', async () => {
    const { status, data } = await request('/business/reportes?tab=promociones', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.funnelCupones).toBeDefined();
    expect(reporte.funnelRecompensas).toBeDefined();
    expect(typeof reporte.descuentoTotal).toBe('number');
    expect(typeof reporte.porVencer).toBe('number');
  });

  it('debe retornar estructura correcta de funnelCupones', async () => {
    const { data } = await request('/business/reportes?tab=promociones', {
      token: TOKEN_COMERCIAL_1(),
    });
    const reporte = data.data as Record<string, unknown>;
    const funnel = reporte.funnelCupones as Record<string, unknown>;
    expect(typeof funnel.emitidos).toBe('number');
    expect(typeof funnel.canjeados).toBe('number');
    expect(typeof funnel.expirados).toBe('number');
    expect(typeof funnel.activos).toBe('number');
  });
});

// =============================================================================
// TAB RESEÑAS
// =============================================================================

describe('GET /api/business/reportes?tab=resenas', () => {
  it('debe retornar reporte de reseñas', async () => {
    const { status, data } = await request('/business/reportes?tab=resenas', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const reporte = data.data as Record<string, unknown>;
    expect(reporte.distribucionEstrellas).toBeDefined();
    expect(Array.isArray(reporte.distribucionEstrellas)).toBe(true);
    expect(reporte.tendenciaRating).toBeDefined();
    expect(typeof reporte.sinResponder).toBe('number');
    expect(typeof reporte.totalResenas).toBe('number');
    expect(typeof reporte.tasaRespuesta).toBe('number');
    expect(typeof reporte.tiempoPromedioRespuestaDias).toBe('number');
  });
});

// =============================================================================
// EXPORTAR XLSX
// =============================================================================

describe('GET /api/business/reportes/exportar', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request('/business/reportes/exportar?tab=ventas');
    expect(status).toBe(401);
  });

  it('debe retornar 400 con tab inválido', async () => {
    const { status } = await request('/business/reportes/exportar?tab=invalido', {
      token: TOKEN_COMERCIAL_1(),
    });
    expect(status).toBe(400);
  });

  it('debe retornar archivo XLSX para tab ventas', async () => {
    const respuesta = await fetch(`${BASE_URL}/business/reportes/exportar?tab=ventas`, {
      headers: { Authorization: `Bearer ${TOKEN_COMERCIAL_1()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('spreadsheetml');
    expect(respuesta.headers.get('content-disposition')).toContain('attachment');

    const buffer = await respuesta.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('debe retornar archivo XLSX para tab clientes', async () => {
    const respuesta = await fetch(`${BASE_URL}/business/reportes/exportar?tab=clientes`, {
      headers: { Authorization: `Bearer ${TOKEN_COMERCIAL_1()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('spreadsheetml');
  });

  it('debe retornar archivo XLSX para tab empleados', async () => {
    const respuesta = await fetch(`${BASE_URL}/business/reportes/exportar?tab=empleados`, {
      headers: { Authorization: `Bearer ${TOKEN_COMERCIAL_1()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('spreadsheetml');
  });

  it('debe retornar archivo XLSX para tab promociones', async () => {
    const respuesta = await fetch(`${BASE_URL}/business/reportes/exportar?tab=promociones`, {
      headers: { Authorization: `Bearer ${TOKEN_COMERCIAL_1()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('spreadsheetml');
  });

  it('debe retornar archivo XLSX para tab resenas', async () => {
    const respuesta = await fetch(`${BASE_URL}/business/reportes/exportar?tab=resenas`, {
      headers: { Authorization: `Bearer ${TOKEN_COMERCIAL_1()}` },
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('spreadsheetml');
  });
});

// =============================================================================
// TODOS LOS PERÍODOS
// =============================================================================

describe('Reportes — Todos los períodos', () => {
  const periodos = ['hoy', 'semana', 'mes', '3meses', 'anio', 'todo'];

  for (const periodo of periodos) {
    it(`debe funcionar con periodo=${periodo}`, async () => {
      const { status, data } = await request(`/business/reportes?tab=ventas&periodo=${periodo}`, {
        token: TOKEN_COMERCIAL_1(),
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  }
});
