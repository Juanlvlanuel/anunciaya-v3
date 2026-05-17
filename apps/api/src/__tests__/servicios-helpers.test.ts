/**
 * servicios-helpers.test.ts
 * ==========================
 * Tests de los helpers internos del módulo de Servicios:
 *
 *   - `pgArrayLiteral(arr)` — serializa arrays JS a literales PostgreSQL.
 *     Fixea bug real con Drizzle + arrays vacíos (generaba `()` en lugar
 *     de `'{}'`).
 *
 *   - `detectarSugerenciaSeccion(titulo, descripcion)` — heurística de
 *     moderación pasiva que detecta cuando el usuario quiere VENDER un
 *     objeto y debería irse a MarketPlace.
 *
 * Ambos son funciones puras — sin BD, sin red — ideales para unit tests.
 *
 * EJECUTAR: cd apps/api && pnpm test -- servicios-helpers
 *
 * UBICACIÓN: apps/api/src/__tests__/servicios-helpers.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    pgArrayLiteral,
    detectarSugerenciaSeccion,
} from '../services/servicios.service';

// =============================================================================
// 1. pgArrayLiteral — serializar arrays JS → literal PostgreSQL
// =============================================================================

describe('pgArrayLiteral', () => {
    it('serializa array vacío como "{}"', () => {
        expect(pgArrayLiteral([])).toBe('{}');
    });

    it('serializa array con un elemento', () => {
        expect(pgArrayLiteral(['Centro'])).toBe('{"Centro"}');
    });

    it('serializa array con varios elementos', () => {
        expect(pgArrayLiteral(['Centro', 'Las Conchas', 'Cholla Bay'])).toBe(
            '{"Centro","Las Conchas","Cholla Bay"}',
        );
    });

    it('escapa comillas dobles', () => {
        // Una comilla " → \"
        expect(pgArrayLiteral(['a"b'])).toBe('{"a\\"b"}');
    });

    it('escapa backslashes', () => {
        // Un backslash \ → \\
        expect(pgArrayLiteral(['c\\d'])).toBe('{"c\\\\d"}');
    });

    it('escapa backslash y comilla en el mismo string', () => {
        // \ y " → primero \ se duplica, luego " se escapa
        expect(pgArrayLiteral(['a"b', 'c\\d'])).toBe(
            '{"a\\"b","c\\\\d"}',
        );
    });

    it('maneja strings con espacios y caracteres unicode', () => {
        expect(pgArrayLiteral(['Plomería', 'Reparación de fugas'])).toBe(
            '{"Plomería","Reparación de fugas"}',
        );
    });

    it('maneja strings vacíos dentro del array', () => {
        expect(pgArrayLiteral([''])).toBe('{""}');
        expect(pgArrayLiteral(['', 'foo'])).toBe('{"","foo"}');
    });
});

// =============================================================================
// 2. detectarSugerenciaSeccion — heurística de moderación pasiva
// =============================================================================

describe('detectarSugerenciaSeccion', () => {
    describe('detecta venta de artículo → marketplace', () => {
        it('detecta "vendo" al inicio', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Vendo iPhone 13',
                    'Excelente estado, poco uso.',
                ),
            ).toBe('marketplace');
        });

        it('detecta "VENDO" en mayúsculas', () => {
            expect(
                detectarSugerenciaSeccion(
                    'VENDO televisor LG 55"',
                    'Funciona perfecto, casi nuevo.',
                ),
            ).toBe('marketplace');
        });

        it('detecta "remato" como sinónimo de venta', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Remato bicicleta',
                    'Urgente, me cambio de ciudad.',
                ),
            ).toBe('marketplace');
        });

        it('detecta "cambio por" (trueque típico de MP)', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Cambio por otro celular',
                    'Tengo Samsung A52, cambio por iPhone.',
                ),
            ).toBe('marketplace');
        });

        it('detecta "cambio x" (variante abreviada)', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Cambio x laptop',
                    'Tengo PC gamer, cambio x laptop.',
                ),
            ).toBe('marketplace');
        });

        it('detecta cuando la palabra está en la descripción, no en el título', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Aprovecha esta oportunidad',
                    'Vendo mi auto modelo 2018, kilometraje bajo.',
                ),
            ).toBe('marketplace');
        });
    });

    describe('NO detecta servicios genuinos', () => {
        it('"plomería 24h" no es venta', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Plomería 24h en Las Conchas',
                    'Servicio profesional de reparación de fugas e instalación.',
                ),
            ).toBe(null);
        });

        it('"fotógrafo de bodas" no es venta', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Fotógrafo para bodas',
                    'Cubro tu boda completa con dos cámaras y dron.',
                ),
            ).toBe(null);
        });

        it('"clases de inglés" no es venta', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Clases de inglés para niños',
                    'Maestra titulada, 10 años de experiencia.',
                ),
            ).toBe(null);
        });

        it('"busco fotógrafo" no es venta (modo solicito)', () => {
            expect(
                detectarSugerenciaSeccion(
                    'Busco fotógrafo para boda',
                    'Necesito fotógrafo profesional para mi boda en junio.',
                ),
            ).toBe(null);
        });

        it('palabras parecidas pero NO de venta no matchean', () => {
            // "vendaje", "vendedora" — no deberían matchear porque la
            // regex usa \b (word boundary) y "vendo|venta" requieren palabra
            // completa.
            expect(
                detectarSugerenciaSeccion(
                    'Aplicación de vendajes médicos',
                    'Enfermera certificada, atención a domicilio.',
                ),
            ).toBe(null);
        });
    });

    describe('casos edge', () => {
        it('retorna null cuando título y descripción están vacíos', () => {
            expect(detectarSugerenciaSeccion('', '')).toBe(null);
        });

        it('"venta" como palabra suelta sí matchea', () => {
            expect(
                detectarSugerenciaSeccion(
                    'En venta: mesa de comedor',
                    'Madera maciza, 6 sillas.',
                ),
            ).toBe('marketplace');
        });
    });
});
