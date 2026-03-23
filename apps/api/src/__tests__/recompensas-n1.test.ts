/**
 * recompensas-n1.test.ts
 * =======================
 * Tests para las nuevas funcionalidades de recompensas:
 * - Tipo 'compras_frecuentes' (N+1)
 * - Validaciones Zod con campos nuevos
 *
 * PRE-REQUISITO: La API debe estar corriendo (`pnpm dev` en apps/api)
 *
 * EJECUTAR: cd apps/api && pnpm test
 *
 * UBICACIÓN: apps/api/src/__tests__/recompensas-n1.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  crearRecompensaSchema,
  actualizarRecompensaSchema,
} from '../validations/puntos.schema';

// =============================================================================
// 1. CREAR RECOMPENSA — TIPO BÁSICA (comportamiento existente)
// =============================================================================

describe('Validaciones Zod — Crear recompensa básica', () => {
  it('debe crear recompensa básica por defecto', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Café gratis',
      puntosRequeridos: 100,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.tipo).toBe('basica');
      expect(resultado.data.requierePuntos).toBe(true);
    }
  });

  it('debe aceptar tipo basica explícito', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Postre gratis',
      puntosRequeridos: 50,
      tipo: 'basica',
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar nombre vacío', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: '',
      puntosRequeridos: 100,
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar puntos = 0', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Test',
      puntosRequeridos: 0,
    });
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 2. CREAR RECOMPENSA — TIPO COMPRAS FRECUENTES (N+1)
// =============================================================================

describe('Validaciones Zod — Crear recompensa por compras frecuentes', () => {
  it('debe aceptar recompensa con número de compras', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Sexta compra gratis',
      puntosRequeridos: 1, // Mínimo requerido por el schema
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 5,
      requierePuntos: false,
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.tipo).toBe('compras_frecuentes');
      expect(resultado.data.numeroComprasRequeridas).toBe(5);
      expect(resultado.data.requierePuntos).toBe(false);
    }
  });

  it('debe rechazar compras_frecuentes sin número de compras', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Falta compras',
      puntosRequeridos: 1,
      tipo: 'compras_frecuentes',
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar número de compras menor a 2', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Muy pocas',
      puntosRequeridos: 1,
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 1,
    });
    expect(resultado.success).toBe(false);
  });

  it('debe rechazar número de compras mayor a 1000', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Demasiadas',
      puntosRequeridos: 1,
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 1001,
    });
    expect(resultado.success).toBe(false);
  });

  it('debe aceptar requierePuntos = true (necesita puntos + compras)', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Combo completo',
      puntosRequeridos: 200,
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 10,
      requierePuntos: true,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar tipo inválido', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Tipo raro',
      puntosRequeridos: 100,
      tipo: 'acumulativo',
    });
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 3. ACTUALIZAR RECOMPENSA — CAMPOS NUEVOS
// =============================================================================

describe('Validaciones Zod — Actualizar recompensa con campos N+1', () => {
  it('debe aceptar cambio a tipo compras_frecuentes', () => {
    const resultado = actualizarRecompensaSchema.safeParse({
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 5,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar cambio de número de compras', () => {
    const resultado = actualizarRecompensaSchema.safeParse({
      numeroComprasRequeridas: 8,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar cambio de requierePuntos', () => {
    const resultado = actualizarRecompensaSchema.safeParse({
      requierePuntos: false,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar volver a tipo basica', () => {
    const resultado = actualizarRecompensaSchema.safeParse({
      tipo: 'basica',
      numeroComprasRequeridas: null,
    });
    expect(resultado.success).toBe(true);
  });
});

// =============================================================================
// 4. RECOMPENSAS — STOCK Y OPCIONES
// =============================================================================

describe('Validaciones Zod — Recompensa con stock y opciones', () => {
  it('debe aceptar stock null (ilimitado)', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Ilimitada',
      puntosRequeridos: 50,
      stock: null,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar stock positivo', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Limitada',
      puntosRequeridos: 50,
      stock: 10,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar recompensa completa N+1 con imagen y stock', () => {
    const resultado = crearRecompensaSchema.safeParse({
      nombre: 'Combo premium N+1',
      descripcion: 'Después de 5 compras, tu 6ta es gratis',
      puntosRequeridos: 1,
      imagenUrl: 'https://example.com/img.jpg',
      stock: 50,
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 5,
      requierePuntos: false,
      activa: true,
      orden: 1,
    });
    expect(resultado.success).toBe(true);
  });
});
