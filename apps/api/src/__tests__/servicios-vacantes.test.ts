/**
 * servicios-vacantes.test.ts
 * ============================
 * Tests del schema Zod `crearVacanteSchema` y refines extendidos de
 * `crearPublicacionSchema` cuando `tipo='vacante-empresa'`. Sprint 8.
 *
 * Cubre:
 *   - crearVacanteSchema acepta vacante válida
 *   - crearVacanteSchema rechaza requisitos < 3 (mínimo) o > 20 (máximo)
 *   - crearVacanteSchema rechaza beneficios > 8
 *   - crearVacanteSchema rechaza tipoEmpleo inválido
 *   - crearPublicacionSchema rechaza tipo='vacante-empresa' sin sucursalId
 *   - crearPublicacionSchema rechaza tipo='vacante-empresa' sin tipoEmpleo
 *   - crearPublicacionSchema rechaza tipoEmpleo en tipo != 'vacante-empresa'
 *   - crearPublicacionSchema rechaza sucursalId en tipo != 'vacante-empresa'
 *   - crearPublicacionSchema rechaza beneficios en tipo != 'vacante-empresa'
 *   - listarVacantesQuerySchema acepta estados válidos (incluye 'cerrada')
 *
 * EJECUTAR: cd apps/api && pnpm test -- servicios-vacantes
 *
 * UBICACIÓN: apps/api/src/__tests__/servicios-vacantes.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    crearVacanteSchema,
    crearPublicacionSchema,
    listarVacantesQuerySchema,
} from '../validations/servicios.schema';

// =============================================================================
// Fixtures
// =============================================================================

function vacanteValida() {
    return {
        sucursalId: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Diseñador gráfico para imprenta',
        descripcion:
            'Buscamos diseñador con experiencia en branding y diseño editorial para clientes locales.',
        tipoEmpleo: 'tiempo-completo' as const,
        modalidad: 'hibrido' as const,
        precio: { kind: 'rango' as const, min: 12000, max: 18000, moneda: 'MXN' as const },
        requisitos: [
            'Manejo avanzado de Adobe Illustrator y Photoshop',
            'Portafolio comprobable',
            'Experiencia mínima 2 años',
        ],
        beneficios: ['Prestaciones de ley', 'Aguinaldo'],
        horario: '9:00 a 18:00',
        diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie'] as const,
        latitud: 31.3145,
        longitud: -113.5455,
        ciudad: 'Puerto Peñasco',
        zonasAproximadas: ['Centro'],
        confirmaciones: {
            legal: true,
            verdadera: true,
            coordinacion: true,
            version: 'v1-2026-05-17',
        },
    };
}

// Publicación válida con tipo='vacante-empresa' para el schema general
function publicacionVacanteValida() {
    const v = vacanteValida();
    return {
        modo: 'solicito' as const,
        tipo: 'vacante-empresa' as const,
        subtipo: 'vacante-empresa' as const,
        titulo: v.titulo,
        descripcion: v.descripcion,
        fotos: [],
        fotoPortadaIndex: 0,
        precio: v.precio,
        modalidad: v.modalidad,
        latitud: v.latitud,
        longitud: v.longitud,
        ciudad: v.ciudad,
        zonasAproximadas: v.zonasAproximadas,
        skills: [],
        requisitos: v.requisitos,
        horario: v.horario,
        diasSemana: [...v.diasSemana],
        sucursalId: v.sucursalId,
        tipoEmpleo: v.tipoEmpleo,
        beneficios: v.beneficios,
        confirmaciones: v.confirmaciones,
    };
}

// Servicio personal válido (tipo='servicio-persona') — sin campos de vacante
function servicioPersonalValido() {
    return {
        modo: 'ofrezco' as const,
        tipo: 'servicio-persona' as const,
        subtipo: 'servicio-personal' as const,
        titulo: 'Plomería residencial 24h',
        descripcion:
            'Servicio de plomería para casa habitación. Reparación de fugas e instalación.',
        fotos: [],
        fotoPortadaIndex: 0,
        precio: { kind: 'hora' as const, monto: 350 },
        modalidad: 'presencial' as const,
        latitud: 31.3145,
        longitud: -113.5455,
        ciudad: 'Puerto Peñasco',
        zonasAproximadas: ['Centro'],
        skills: ['Plomería'],
        requisitos: [],
        diasSemana: [],
        confirmaciones: {
            legal: true,
            verdadera: true,
            coordinacion: true,
            version: 'v2-2026-05-16',
        },
    };
}

// =============================================================================
// 1. crearVacanteSchema — casos felices
// =============================================================================

describe('crearVacanteSchema — casos felices', () => {
    it('acepta una vacante válida completa', () => {
        const result = crearVacanteSchema.safeParse(vacanteValida());
        expect(result.success).toBe(true);
    });

    it('acepta vacante sin horario ni diasSemana (campos opcionales)', () => {
        const { horario, diasSemana, ...sinHorario } = vacanteValida();
        void horario;
        void diasSemana;
        const result = crearVacanteSchema.safeParse(sinHorario);
        expect(result.success).toBe(true);
    });

    it('acepta vacante sin beneficios (opcional, default [])', () => {
        const { beneficios, ...sinBeneficios } = vacanteValida();
        void beneficios;
        const result = crearVacanteSchema.safeParse(sinBeneficios);
        expect(result.success).toBe(true);
    });

    it('acepta los 4 tipos de empleo válidos', () => {
        const tipos = ['tiempo-completo', 'medio-tiempo', 'por-proyecto', 'eventual'] as const;
        for (const tipoEmpleo of tipos) {
            const result = crearVacanteSchema.safeParse({
                ...vacanteValida(),
                tipoEmpleo,
            });
            expect(result.success).toBe(true);
        }
    });

    it('acepta los 5 kinds de precio en vacantes', () => {
        const variantes = [
            { kind: 'fijo', monto: 5000, moneda: 'MXN' },
            { kind: 'hora', monto: 250 },
            { kind: 'mensual', monto: 12000 },
            { kind: 'rango', min: 10000, max: 18000, moneda: 'MXN' },
            { kind: 'a-convenir' },
        ];
        for (const precio of variantes) {
            const result = crearVacanteSchema.safeParse({
                ...vacanteValida(),
                precio,
            });
            expect(result.success).toBe(true);
        }
    });
});

// =============================================================================
// 2. crearVacanteSchema — límites de campos
// =============================================================================

describe('crearVacanteSchema — límites de campos', () => {
    it('rechaza menos de 3 requisitos', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            requisitos: ['Solo uno'],
        });
        expect(result.success).toBe(false);
    });

    it('rechaza más de 20 requisitos', () => {
        const requisitos = Array.from(
            { length: 21 },
            (_, i) => `Requisito número ${i + 1} con texto válido`,
        );
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            requisitos,
        });
        expect(result.success).toBe(false);
    });

    it('rechaza más de 8 beneficios', () => {
        const beneficios = Array.from({ length: 9 }, (_, i) => `Beneficio ${i + 1}`);
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            beneficios,
        });
        expect(result.success).toBe(false);
    });

    it('rechaza beneficio con más de 100 caracteres', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            beneficios: ['a'.repeat(101)],
        });
        expect(result.success).toBe(false);
    });

    it('rechaza tipoEmpleo inválido', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            tipoEmpleo: 'freelance',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza sucursalId inválido (no es UUID)', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            sucursalId: 'no-es-uuid',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza si alguna confirmación es false', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            confirmaciones: {
                legal: true,
                verdadera: true,
                coordinacion: false,
                version: 'v1-2026-05-17',
            },
        });
        expect(result.success).toBe(false);
    });

    it('rechaza más de 7 días de la semana', () => {
        const result = crearVacanteSchema.safeParse({
            ...vacanteValida(),
            diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom', 'lun'],
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 3. crearPublicacionSchema — refines de vacante en el schema general
// =============================================================================

describe('crearPublicacionSchema — refines de vacante', () => {
    it('acepta tipo=vacante-empresa con sucursalId + tipoEmpleo', () => {
        const result = crearPublicacionSchema.safeParse(publicacionVacanteValida());
        expect(result.success).toBe(true);
    });

    it('rechaza tipo=vacante-empresa SIN sucursalId', () => {
        const datos = publicacionVacanteValida();
        delete (datos as Record<string, unknown>).sucursalId;
        const result = crearPublicacionSchema.safeParse(datos);
        expect(result.success).toBe(false);
    });

    it('rechaza tipo=vacante-empresa SIN tipoEmpleo', () => {
        const datos = publicacionVacanteValida();
        delete (datos as Record<string, unknown>).tipoEmpleo;
        const result = crearPublicacionSchema.safeParse(datos);
        expect(result.success).toBe(false);
    });

    it('rechaza sucursalId en tipo=servicio-persona', () => {
        const result = crearPublicacionSchema.safeParse({
            ...servicioPersonalValido(),
            sucursalId: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza tipoEmpleo en tipo=servicio-persona', () => {
        const result = crearPublicacionSchema.safeParse({
            ...servicioPersonalValido(),
            tipoEmpleo: 'tiempo-completo',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza beneficios no vacíos en tipo=servicio-persona', () => {
        const result = crearPublicacionSchema.safeParse({
            ...servicioPersonalValido(),
            beneficios: ['Algún beneficio'],
        });
        expect(result.success).toBe(false);
    });

    it('acepta beneficios vacíos en tipo=servicio-persona', () => {
        const result = crearPublicacionSchema.safeParse({
            ...servicioPersonalValido(),
            beneficios: [],
        });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// 4. listarVacantesQuerySchema — filtros de listado
// =============================================================================

describe('listarVacantesQuerySchema', () => {
    it('acepta query sin filtros (defaults)', () => {
        const result = listarVacantesQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(20);
            expect(result.data.offset).toBe(0);
        }
    });

    it('acepta estado=activa | pausada | cerrada', () => {
        for (const estado of ['activa', 'pausada', 'cerrada']) {
            const result = listarVacantesQuerySchema.safeParse({ estado });
            expect(result.success).toBe(true);
        }
    });

    it('rechaza estado=eliminada (no es filtro válido en BS)', () => {
        const result = listarVacantesQuerySchema.safeParse({ estado: 'eliminada' });
        expect(result.success).toBe(false);
    });

    it('coerce limit/offset de string a number (query strings)', () => {
        const result = listarVacantesQuerySchema.safeParse({
            limit: '30',
            offset: '60',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(30);
            expect(result.data.offset).toBe(60);
        }
    });

    it('rechaza limit > 100', () => {
        const result = listarVacantesQuerySchema.safeParse({ limit: 101 });
        expect(result.success).toBe(false);
    });
});
