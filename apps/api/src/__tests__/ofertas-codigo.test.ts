/**
 * ofertas-codigo.test.ts
 * =======================
 * Tests para ofertas exclusivas y validaciones Zod.
 * - Visibilidad (público/privado)
 * - Límite por usuario
 * - Asignación de usuarios
 * - Validación de código personal
 *
 * EJECUTAR: cd apps/api && pnpm test
 *
 * UBICACIÓN: apps/api/src/__tests__/ofertas-codigo.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  crearOfertaSchema,
  actualizarOfertaSchema,
  asignarOfertaSchema,
  validarCodigoSchema,
} from '../validations/ofertas.schema';

// =============================================================================
// 1. CREAR OFERTA — VISIBILIDAD Y EXCLUSIVIDAD
// =============================================================================

describe('Validaciones Zod — Crear oferta con visibilidad', () => {
  const ofertaBase = {
    titulo: 'Oferta de prueba',
    tipo: 'porcentaje' as const,
    valor: 20,
    fechaInicio: '2026-04-01T00:00:00Z',
    fechaFin: '2026-04-30T23:59:59Z',
    activo: true,
  };

  it('debe aceptar oferta pública por defecto', () => {
    const resultado = crearOfertaSchema.safeParse(ofertaBase);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.visibilidad).toBe('publico');
    }
  });

  it('debe aceptar visibilidad privada con usuarios asignados', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      visibilidad: 'privado',
      usuariosIds: ['a0000000-0000-4000-a000-000000000001'],
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar visibilidad privada sin usuarios asignados', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      visibilidad: 'privado',
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar visibilidad privada con array vacío', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      visibilidad: 'privado',
      usuariosIds: [],
    });
    expect(resultado.success).toBe(false);
  });

  it('debe aceptar múltiples usuarios para oferta privada', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      visibilidad: 'privado',
      usuariosIds: [
        'a0000000-0000-4000-a000-000000000001',
        'a0000000-0000-4000-a000-000000000002',
      ],
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar límite de usos por usuario', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      limiteUsosPorUsuario: 3,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.limiteUsosPorUsuario).toBe(3);
    }
  });

  it('debe rechazar límite de usos por usuario negativo', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      limiteUsosPorUsuario: -1,
    });
    expect(resultado.success).toBe(false);
  });

  it('debe aceptar motivo de asignación', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...ofertaBase,
      visibilidad: 'privado',
      usuariosIds: ['a0000000-0000-4000-a000-000000000001'],
      motivoAsignacion: 'Cliente VIP',
    });
    expect(resultado.success).toBe(true);
  });
});

// =============================================================================
// 2. ACTUALIZAR OFERTA
// =============================================================================

describe('Validaciones Zod — Actualizar oferta', () => {
  it('debe aceptar cambio de visibilidad', () => {
    const resultado = actualizarOfertaSchema.safeParse({
      visibilidad: 'privado',
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar cambio de límite por usuario', () => {
    const resultado = actualizarOfertaSchema.safeParse({
      limiteUsosPorUsuario: 5,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar visibilidad inválida', () => {
    const resultado = actualizarOfertaSchema.safeParse({
      visibilidad: 'secreto',
    });
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 3. ASIGNAR OFERTA A USUARIOS
// =============================================================================

describe('Validaciones Zod — Asignar oferta a usuarios', () => {
  it('debe aceptar asignación con 1 usuario', () => {
    const resultado = asignarOfertaSchema.safeParse({
      usuariosIds: ['a0000000-0000-4000-a000-000000000001'],
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar asignación con motivo', () => {
    const resultado = asignarOfertaSchema.safeParse({
      usuariosIds: ['a0000000-0000-4000-a000-000000000001'],
      motivo: 'Cliente VIP',
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar asignación sin usuarios', () => {
    const resultado = asignarOfertaSchema.safeParse({
      usuariosIds: [],
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar UUID inválido', () => {
    const resultado = asignarOfertaSchema.safeParse({
      usuariosIds: ['no-es-uuid'],
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar motivo muy largo', () => {
    const resultado = asignarOfertaSchema.safeParse({
      usuariosIds: ['a0000000-0000-4000-a000-000000000001'],
      motivo: 'X'.repeat(201),
    });
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 4. VALIDAR CÓDIGO PERSONAL
// =============================================================================

describe('Validaciones Zod — Validar código personal', () => {
  it('debe aceptar código válido con clienteId', () => {
    const resultado = validarCodigoSchema.safeParse({
      codigo: 'VIP-A3K9X',
      clienteId: 'a0000000-0000-4000-a000-000000000001',
    });
    expect(resultado.success).toBe(true);
  });

  it('debe transformar código a mayúsculas', () => {
    const resultado = validarCodigoSchema.safeParse({
      codigo: 'vip-a3k9x',
      clienteId: 'a0000000-0000-4000-a000-000000000001',
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.codigo).toBe('VIP-A3K9X');
    }
  });

  it('debe rechazar código vacío', () => {
    const resultado = validarCodigoSchema.safeParse({
      codigo: '',
      clienteId: 'a0000000-0000-4000-a000-000000000001',
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar clienteId inválido', () => {
    const resultado = validarCodigoSchema.safeParse({
      codigo: 'VIP-A3K9X',
      clienteId: 'no-uuid',
    });
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 5. TIPOS DE OFERTA — VALIDACIONES
// =============================================================================

describe('Validaciones Zod — Tipos de oferta', () => {
  const base = {
    titulo: 'Oferta test',
    fechaInicio: '2026-04-01T00:00:00Z',
    fechaFin: '2026-04-30T23:59:59Z',
  };

  it('porcentaje con valor 50%', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'porcentaje', valor: 50,
    });
    expect(resultado.success).toBe(true);
  });

  it('monto_fijo con valor $100', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'monto_fijo', valor: 100,
    });
    expect(resultado.success).toBe(true);
  });

  it('2x1 sin valor', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: '2x1',
    });
    expect(resultado.success).toBe(true);
  });

  it('envio_gratis sin valor', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'envio_gratis',
    });
    expect(resultado.success).toBe(true);
  });

  it('otro con valor texto', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'otro', valor: 'Postre gratis',
    });
    expect(resultado.success).toBe(true);
  });

  it('porcentaje rechaza valor > 100', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'porcentaje', valor: 150,
    });
    expect(resultado.success).toBe(false);
  });

  it('monto_fijo rechaza valor 0', () => {
    const resultado = crearOfertaSchema.safeParse({
      ...base, tipo: 'monto_fijo', valor: 0,
    });
    expect(resultado.success).toBe(false);
  });
});
