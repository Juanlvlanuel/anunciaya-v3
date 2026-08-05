/**
 * dinamicas.test.ts
 * ==================
 * Tests de Dinámicas (Fase 1 — solo capa de datos y ciclo de vida).
 *
 * Cubre exclusivamente los módulos PUROS (sin conexión a BD), mismo criterio
 * que `marketplace-filtros.test.ts`: la máquina de estados
 * (`services/dinamicas/estados.ts`), la traducción de errores de Postgres
 * (`services/dinamicas/errores.ts`) y los schemas Zod
 * (`validations/dinamicas.schema.ts`). `dinamicas.service.ts` en sí importa
 * `db/index.js` (crea un Pool de Postgres real al importarse) — igual que
 * el resto del repo, este suite no monta un entorno de integración con BD,
 * así que no se importa directo aquí.
 *
 * EJECUTAR: cd apps/api && pnpm test -- dinamicas
 *
 * UBICACIÓN: apps/api/src/__tests__/dinamicas.test.ts
 */

import { describe, it, expect } from 'vitest';
import { puedeTransicionar, TRANSICIONES_VALIDAS, type EstadoDinamica } from '../services/dinamicas/estados';
import { esErrorBoletoDuplicado } from '../services/dinamicas/errores';
import { validarTextoDinamica } from '../services/dinamicas/filtros';
import {
    crearDinamicaSchema,
    editarBorradorDinamicaSchema,
    publicarDinamicaSchema,
    posponerDinamicaSchema,
    cancelarDinamicaSchema,
    reservarBoletoSchema,
    agregarParticipanteManualSchema,
} from '../validations/dinamicas.schema';

// =============================================================================
// 1. MÁQUINA DE ESTADOS
// =============================================================================

describe('puedeTransicionar — ciclo de vida de una Dinámica', () => {
    it('permite borrador → activa (publicar)', () => {
        expect(puedeTransicionar('borrador', 'activa')).toBe(true);
    });

    it('permite activa → pospuesta (posponer)', () => {
        expect(puedeTransicionar('activa', 'pospuesta')).toBe(true);
    });

    it('permite posponer de nuevo desde pospuesta (sin límite de veces)', () => {
        expect(puedeTransicionar('pospuesta', 'pospuesta')).toBe(true);
    });

    it('permite cancelar desde borrador', () => {
        expect(puedeTransicionar('borrador', 'cancelada')).toBe(true);
    });

    it('permite cancelar desde activa', () => {
        expect(puedeTransicionar('activa', 'cancelada')).toBe(true);
    });

    it('permite cancelar desde pospuesta', () => {
        expect(puedeTransicionar('pospuesta', 'cancelada')).toBe(true);
    });

    it('RECHAZA cancelar desde en_sorteo', () => {
        expect(puedeTransicionar('en_sorteo', 'cancelada')).toBe(false);
    });

    it('RECHAZA cancelar desde cerrada', () => {
        expect(puedeTransicionar('cerrada', 'cancelada')).toBe(false);
    });

    it('RECHAZA publicar dos veces (activa → activa)', () => {
        expect(puedeTransicionar('activa', 'activa')).toBe(false);
    });

    it('RECHAZA cualquier transición desde un estado terminal (cancelada)', () => {
        expect(puedeTransicionar('cancelada', 'activa')).toBe(false);
        expect(puedeTransicionar('cancelada', 'borrador')).toBe(false);
    });

    it('RECHAZA saltarse borrador (crear directo en activa no es una transición)', () => {
        expect(puedeTransicionar('borrador', 'en_sorteo')).toBe(false);
    });

    it('todo estado declarado en TRANSICIONES_VALIDAS es una clave conocida', () => {
        const estados: EstadoDinamica[] = ['borrador', 'activa', 'pospuesta', 'en_sorteo', 'cerrada', 'cancelada'];
        for (const estado of estados) {
            expect(TRANSICIONES_VALIDAS[estado]).toBeDefined();
        }
    });
});

// =============================================================================
// 2. TRADUCCIÓN DE ERRORES — UNIQUE (dinamica_id, numero_boleto)
// =============================================================================

describe('esErrorBoletoDuplicado — condición de carrera del UNIQUE en dinamica_boletos', () => {
    it('detecta el código 23505 (unique_violation) de Postgres', () => {
        const errorPg = { code: '23505', message: 'duplicate key value violates unique constraint "dinamica_boletos_dinamica_numero_key"' };
        expect(esErrorBoletoDuplicado(errorPg)).toBe(true);
    });

    it('NO confunde otros códigos de error de Postgres', () => {
        expect(esErrorBoletoDuplicado({ code: '23503' })).toBe(false); // foreign_key_violation
        expect(esErrorBoletoDuplicado({ code: '22P02' })).toBe(false); // invalid_text_representation
    });

    it('no truena con errores sin código (Error genérico de JS)', () => {
        expect(esErrorBoletoDuplicado(new Error('algo más'))).toBe(false);
    });

    it('no truena con valores no-error (null, undefined, string)', () => {
        expect(esErrorBoletoDuplicado(null)).toBe(false);
        expect(esErrorBoletoDuplicado(undefined)).toBe(false);
        expect(esErrorBoletoDuplicado('boom')).toBe(false);
    });
});

// =============================================================================
// 3. VALIDACIÓN ZOD — crear Dinámica
// =============================================================================

function fechaFutura(diasDesdeAhora = 7): string {
    return new Date(Date.now() + diasDesdeAhora * 24 * 60 * 60 * 1000).toISOString();
}

function payloadValido(overrides: Record<string, unknown> = {}) {
    return {
        titulo: 'Rifa de una pantalla 55 pulgadas',
        descripcion: 'Rifo mi pantalla nueva, sellada, con caja y garantía vigente por un año.',
        fotosPremio: [{ url: 'https://r2.anunciaya.mx/dinamicas/foto1.jpg', tipo: 'imagen' }],
        tipoPremio: 'fisico',
        metodoSorteo: 'tombola',
        numeroTotalBoletos: 100,
        precioBoleto: 50,
        fechaLimiteInscripcion: fechaFutura(),
        ciudad: 'Puerto Peñasco',
        ...overrides,
    };
}

describe('crearDinamicaSchema', () => {
    it('acepta un payload válido de método tombola sin reglaDesempate', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido());
        expect(r.success).toBe(true);
    });

    it('acepta un borrador MÍNIMO — solo título + ciudad, sin más campos', () => {
        const r = crearDinamicaSchema.safeParse({
            titulo: 'Rifa que voy a completar después',
            ciudad: 'Puerto Peñasco',
        });
        expect(r.success).toBe(true);
    });

    it('RECHAZA un borrador sin título', () => {
        const r = crearDinamicaSchema.safeParse({ ciudad: 'Puerto Peñasco' });
        expect(r.success).toBe(false);
    });

    it('RECHAZA un borrador sin ciudad', () => {
        const r = crearDinamicaSchema.safeParse({ titulo: 'Rifa que voy a completar después' });
        expect(r.success).toBe(false);
    });

    it('acepta tabla_completa CON reglaDesempate', () => {
        const r = crearDinamicaSchema.safeParse(
            payloadValido({ metodoSorteo: 'tabla_completa', reglaDesempate: 'sorteo_instantaneo' }),
        );
        expect(r.success).toBe(true);
    });

    it('RECHAZA reglaDesempate en método tombola (solo aplica a tabla_completa)', () => {
        const r = crearDinamicaSchema.safeParse(
            payloadValido({ metodoSorteo: 'tombola', reglaDesempate: 'sorteo_instantaneo' }),
        );
        expect(r.success).toBe(false);
    });

    it('RECHAZA reglaDesempate en método carta_unica', () => {
        const r = crearDinamicaSchema.safeParse(
            payloadValido({ metodoSorteo: 'carta_unica', reglaDesempate: 'orden_inscripcion' }),
        );
        expect(r.success).toBe(false);
    });

    it('RECHAZA precioBoleto = 0 (una Dinámica gratuita no filtra participación real)', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ precioBoleto: 0 }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA precioBoleto negativo', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ precioBoleto: -10 }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA numeroTotalBoletos = 0', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ numeroTotalBoletos: 0 }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA sin fotos de evidencia del premio', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ fotosPremio: [] }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA fecha límite de inscripción en el pasado', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ fechaLimiteInscripcion: fechaFutura(-1) }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA tipoPremio fuera del enum', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ tipoPremio: 'criptomoneda' }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA metodoSorteo fuera del enum', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ metodoSorteo: 'rasca_y_gana' }));
        expect(r.success).toBe(false);
    });

    it('RECHAZA título demasiado corto', () => {
        const r = crearDinamicaSchema.safeParse(payloadValido({ titulo: 'Rifa' }));
        expect(r.success).toBe(false);
    });
});

describe('editarBorradorDinamicaSchema', () => {
    it('acepta un patch parcial (solo título)', () => {
        const r = editarBorradorDinamicaSchema.safeParse({ titulo: 'Nuevo título de la rifa aquí' });
        expect(r.success).toBe(true);
    });

    it('acepta objeto vacío (no cambia nada)', () => {
        const r = editarBorradorDinamicaSchema.safeParse({});
        expect(r.success).toBe(true);
    });

    it('RECHAZA precioBoleto = 0 igual que al crear', () => {
        const r = editarBorradorDinamicaSchema.safeParse({ precioBoleto: 0 });
        expect(r.success).toBe(false);
    });
});

describe('posponerDinamicaSchema', () => {
    it('acepta una nueva fecha futura', () => {
        const r = posponerDinamicaSchema.safeParse({ nuevaFechaLimiteInscripcion: fechaFutura(3) });
        expect(r.success).toBe(true);
    });

    it('RECHAZA una fecha en el pasado', () => {
        const r = posponerDinamicaSchema.safeParse({ nuevaFechaLimiteInscripcion: fechaFutura(-3) });
        expect(r.success).toBe(false);
    });

    it('RECHAZA payload sin fecha', () => {
        const r = posponerDinamicaSchema.safeParse({});
        expect(r.success).toBe(false);
    });
});

describe('cancelarDinamicaSchema', () => {
    it('acepta cuerpo vacío (no se pide motivo)', () => {
        const r = cancelarDinamicaSchema.safeParse({});
        expect(r.success).toBe(true);
    });
});

// =============================================================================
// 4. MODERACIÓN REDUCIDA — dinamicas/filtros.ts
// =============================================================================

describe('validarTextoDinamica — filtro reducido (Fase 2)', () => {
    it('PERMITE "rifa" — vocabulario normal del módulo', () => {
        const r = validarTextoDinamica('Rifa de una pantalla', 'Rifo mi pantalla nueva sellada.');
        expect(r.valido).toBe(true);
    });

    it('PERMITE "sorteo", "boleto", "tómbola" y "cachito"', () => {
        for (const palabra of ['sorteo', 'boleto', 'tombola', 'cachito']) {
            const r = validarTextoDinamica(`Gran ${palabra} navideño`, 'Descripción de más de veinte caracteres.');
            expect(r.valido).toBe(true);
        }
    });

    it('PERMITE "subasta" — categoría excluida a propósito (solo esquema/adultos/ilegal quedan)', () => {
        const r = validarTextoDinamica('Subasta de un reloj', 'Descripción de más de veinte caracteres.');
        expect(r.valido).toBe(true);
    });

    it('RECHAZA la categoría esquema', () => {
        const r = validarTextoDinamica('Rifa con inversion garantizada', 'Descripción de más de veinte caracteres.');
        expect(r.valido).toBe(false);
        expect(r.categoria).toBe('esquema');
    });

    it('RECHAZA la categoría adultos', () => {
        const r = validarTextoDinamica('Rifa de contenido erotico', 'Descripción de más de veinte caracteres.');
        expect(r.valido).toBe(false);
        expect(r.categoria).toBe('adultos');
    });

    it('RECHAZA la categoría ilegal', () => {
        const r = validarTextoDinamica('Rifo una pistola', 'Descripción de más de veinte caracteres.');
        expect(r.valido).toBe(false);
        expect(r.categoria).toBe('ilegal');
    });

    it('texto limpio sin ninguna categoría es válido', () => {
        const r = validarTextoDinamica('Rifa de una bicicleta nueva', 'Bicicleta de montaña, rodada 29, seminueva.');
        expect(r.valido).toBe(true);
    });
});

// =============================================================================
// 5. VALIDACIÓN ZOD — publicar Dinámica (checklist legal)
// =============================================================================

function confirmacionesValidas(overrides: Record<string, unknown> = {}) {
    return {
        premioReal: true,
        pagoFueraApp: true,
        resultadoHonesto: true,
        version: 'v1-2026-08-03',
        ...overrides,
    };
}

describe('publicarDinamicaSchema', () => {
    it('acepta las 3 confirmaciones en true', () => {
        const r = publicarDinamicaSchema.safeParse({ confirmaciones: confirmacionesValidas() });
        expect(r.success).toBe(true);
    });

    it('RECHAZA si falta aceptar premioReal', () => {
        const r = publicarDinamicaSchema.safeParse({
            confirmaciones: confirmacionesValidas({ premioReal: false }),
        });
        expect(r.success).toBe(false);
    });

    it('RECHAZA si falta aceptar pagoFueraApp', () => {
        const r = publicarDinamicaSchema.safeParse({
            confirmaciones: confirmacionesValidas({ pagoFueraApp: false }),
        });
        expect(r.success).toBe(false);
    });

    it('RECHAZA si falta aceptar resultadoHonesto', () => {
        const r = publicarDinamicaSchema.safeParse({
            confirmaciones: confirmacionesValidas({ resultadoHonesto: false }),
        });
        expect(r.success).toBe(false);
    });

    it('RECHAZA sin version', () => {
        const r = publicarDinamicaSchema.safeParse({
            confirmaciones: confirmacionesValidas({ version: '' }),
        });
        expect(r.success).toBe(false);
    });
});

// =============================================================================
// 6. VALIDACIÓN ZOD — boletos (Fase 3)
// =============================================================================
//
// Las reglas de negocio en tiempo de ejecución (número dentro de rango de
// `numeroTotalBoletos`, estado de la Dinámica, fecha límite no vencida) viven
// en `dinamicas.service.ts` — que importa `db/index.js` (Pool real) — así
// que, mismo criterio que el resto de este archivo, no se cubren aquí con
// tests de integración. Solo se cubre la forma del payload (Zod).

describe('reservarBoletoSchema', () => {
    it('acepta un número de boleto entero positivo', () => {
        const r = reservarBoletoSchema.safeParse({ numeroBoleto: 42 });
        expect(r.success).toBe(true);
    });

    it('RECHAZA número de boleto 0', () => {
        const r = reservarBoletoSchema.safeParse({ numeroBoleto: 0 });
        expect(r.success).toBe(false);
    });

    it('RECHAZA número de boleto negativo', () => {
        const r = reservarBoletoSchema.safeParse({ numeroBoleto: -5 });
        expect(r.success).toBe(false);
    });

    it('RECHAZA número de boleto no entero', () => {
        const r = reservarBoletoSchema.safeParse({ numeroBoleto: 3.5 });
        expect(r.success).toBe(false);
    });

    it('RECHAZA payload sin numeroBoleto', () => {
        const r = reservarBoletoSchema.safeParse({});
        expect(r.success).toBe(false);
    });
});

describe('agregarParticipanteManualSchema', () => {
    it('acepta numeroBoleto + nombreManual + telefonoManual', () => {
        const r = agregarParticipanteManualSchema.safeParse({
            numeroBoleto: 7,
            nombreManual: 'Doña Lupita',
            telefonoManual: '6381234567',
        });
        expect(r.success).toBe(true);
    });

    it('RECHAZA sin nombreManual', () => {
        const r = agregarParticipanteManualSchema.safeParse({
            numeroBoleto: 7,
            telefonoManual: '6381234567',
        });
        expect(r.success).toBe(false);
    });

    it('RECHAZA sin telefonoManual', () => {
        const r = agregarParticipanteManualSchema.safeParse({
            numeroBoleto: 7,
            nombreManual: 'Doña Lupita',
        });
        expect(r.success).toBe(false);
    });

    it('RECHAZA nombreManual vacío', () => {
        const r = agregarParticipanteManualSchema.safeParse({
            numeroBoleto: 7,
            nombreManual: '',
            telefonoManual: '6381234567',
        });
        expect(r.success).toBe(false);
    });
});
