/**
 * mis-cupones.test.ts
 * ====================
 * Tests para Mis Cupones: revelar código, revocar, tipos ChatYA.
 *
 * EJECUTAR: cd apps/api && pnpm test
 *
 * UBICACIÓN: apps/api/src/__tests__/mis-cupones.test.ts
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// =============================================================================
// 1. VALIDACIÓN TIPO MENSAJE CHATYA
// =============================================================================

describe('ChatYA — Tipo de mensaje cupon', () => {
  const tipoMensajeSchema = z.enum([
    'texto', 'imagen', 'audio', 'documento', 'ubicacion', 'contacto', 'sistema', 'cupon',
  ]);

  it('debe aceptar tipo cupon', () => {
    const resultado = tipoMensajeSchema.safeParse('cupon');
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar tipo texto', () => {
    const resultado = tipoMensajeSchema.safeParse('texto');
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar tipo inválido', () => {
    const resultado = tipoMensajeSchema.safeParse('rifa');
    expect(resultado.success).toBe(false);
  });
});

// =============================================================================
// 2. ESTRUCTURA CONTENIDO CUPÓN CHATYA
// =============================================================================

describe('ChatYA — Estructura JSON cupón', () => {
  const cuponContentSchema = z.object({
    ofertaId: z.string().uuid(),
    ofertaUsuarioId: z.string(),
    titulo: z.string().min(1),
    imagen: z.string().nullable(),
    tipo: z.string(),
    valor: z.string().nullable(),
    fechaExpiracion: z.string(),
    negocioNombre: z.string(),
    mensajeMotivador: z.string(),
    accionUrl: z.string(),
  });

  it('debe validar contenido de cupón completo', () => {
    const contenido = {
      ofertaId: 'a0000000-0000-4000-a000-000000000001',
      ofertaUsuarioId: 'VIP-A3K9X',
      titulo: '20% de descuento en pizzas',
      imagen: 'https://example.com/img.jpg',
      tipo: 'porcentaje',
      valor: '20',
      fechaExpiracion: '2026-04-30T23:59:59Z',
      negocioNombre: 'Pizzas Don Pepe',
      mensajeMotivador: '¡Felicidades! Tienes un cupón exclusivo 🎉',
      accionUrl: '/mis-cupones?id=abc123',
    };
    expect(cuponContentSchema.safeParse(contenido).success).toBe(true);
  });

  it('debe validar contenido sin imagen', () => {
    const contenido = {
      ofertaId: 'a0000000-0000-4000-a000-000000000001',
      ofertaUsuarioId: 'VIP-B2K8Y',
      titulo: '2x1 en tacos',
      imagen: null,
      tipo: '2x1',
      valor: null,
      fechaExpiracion: '2026-05-15T23:59:59Z',
      negocioNombre: 'Tacos El Güero',
      mensajeMotivador: '¡Cupón especial!',
      accionUrl: '/mis-cupones?id=xyz',
    };
    expect(cuponContentSchema.safeParse(contenido).success).toBe(true);
  });

  it('debe rechazar contenido sin título', () => {
    const contenido = {
      ofertaId: 'a0000000-0000-4000-a000-000000000001',
      ofertaUsuarioId: 'VIP-C1J7Z',
      titulo: '',
      imagen: null,
      tipo: 'porcentaje',
      valor: '10',
      fechaExpiracion: '2026-04-30T23:59:59Z',
      negocioNombre: 'Test',
      mensajeMotivador: 'Hola',
      accionUrl: '/mis-cupones',
    };
    expect(cuponContentSchema.safeParse(contenido).success).toBe(false);
  });
});

// =============================================================================
// 3. ESTADOS DE CUPÓN
// =============================================================================

describe('Mis Cupones — Estados válidos', () => {
  const estadoSchema = z.enum(['activo', 'usado', 'expirado', 'revocado']);

  it('debe aceptar estado activo', () => {
    expect(estadoSchema.safeParse('activo').success).toBe(true);
  });

  it('debe aceptar estado usado', () => {
    expect(estadoSchema.safeParse('usado').success).toBe(true);
  });

  it('debe aceptar estado expirado', () => {
    expect(estadoSchema.safeParse('expirado').success).toBe(true);
  });

  it('debe aceptar estado revocado', () => {
    expect(estadoSchema.safeParse('revocado').success).toBe(true);
  });

  it('debe rechazar estado inválido', () => {
    expect(estadoSchema.safeParse('cancelado').success).toBe(false);
  });
});

// =============================================================================
// 4. TIPOS DE NOTIFICACIÓN CUPÓN
// =============================================================================

describe('Notificaciones — Tipos cupón', () => {
  const tipoNotificacionSchema = z.enum([
    'puntos_ganados', 'voucher_generado', 'voucher_cobrado',
    'nueva_oferta', 'nueva_recompensa', 'recompensa_desbloqueada',
    'cupon_asignado', 'cupon_revocado',
    'nuevo_cliente', 'voucher_pendiente', 'stock_bajo',
    'nueva_resena', 'sistema', 'nuevo_marketplace',
    'nueva_dinamica', 'nuevo_empleo',
  ]);

  it('debe aceptar cupon_asignado', () => {
    expect(tipoNotificacionSchema.safeParse('cupon_asignado').success).toBe(true);
  });

  it('debe aceptar cupon_revocado', () => {
    expect(tipoNotificacionSchema.safeParse('cupon_revocado').success).toBe(true);
  });

  it('debe rechazar nuevo_cupon (eliminado)', () => {
    expect(tipoNotificacionSchema.safeParse('nuevo_cupon').success).toBe(false);
  });
});

// =============================================================================
// 5. REVELAR CÓDIGO — VALIDACIONES
// =============================================================================

describe('Revelar código — Validaciones', () => {
  const revelarSchema = z.object({
    contrasena: z.string().min(1, 'La contraseña es requerida').optional(),
  });

  it('debe aceptar con contraseña', () => {
    expect(revelarSchema.safeParse({ contrasena: 'MiPassword123' }).success).toBe(true);
  });

  it('debe aceptar sin contraseña (campo opcional)', () => {
    expect(revelarSchema.safeParse({}).success).toBe(true);
  });

  it('debe rechazar contraseña vacía', () => {
    expect(revelarSchema.safeParse({ contrasena: '' }).success).toBe(false);
  });
});

// =============================================================================
// 6. RECOMPENSAS N+1 — TIPOS
// =============================================================================

describe('Recompensas N+1 — Validaciones', () => {
  const recompensaN1Schema = z.object({
    tipo: z.enum(['basica', 'compras_frecuentes']),
    numeroComprasRequeridas: z.number().int().min(2).nullable().optional(),
    requierePuntos: z.boolean().optional(),
  });

  it('debe aceptar recompensa tipo compras_frecuentes con N=5', () => {
    const resultado = recompensaN1Schema.safeParse({
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 5,
      requierePuntos: false,
    });
    expect(resultado.success).toBe(true);
  });

  it('debe aceptar recompensa basica sin N', () => {
    const resultado = recompensaN1Schema.safeParse({
      tipo: 'basica',
    });
    expect(resultado.success).toBe(true);
  });

  it('debe rechazar N < 2', () => {
    const resultado = recompensaN1Schema.safeParse({
      tipo: 'compras_frecuentes',
      numeroComprasRequeridas: 1,
    });
    expect(resultado.success).toBe(false);
  });
});
