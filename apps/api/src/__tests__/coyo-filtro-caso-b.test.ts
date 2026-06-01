/**
 * coyo-filtro-caso-b.test.ts
 * ============================
 * Tests del helper `geminiRedactoComoSinResultados` del orquestador de
 * Coyo. Este helper detecta si Gemini redactó siguiendo el CASO B del
 * prompt ("no encontré X" + invitación a la comunidad) — cuando es
 * true Y el buscador trajo items, el orquestador los limpia para
 * mantener consistencia visual texto ↔ tarjetas.
 *
 * Cobertura:
 *  - Casos POSITIVOS: textos reales que Gemini ha escrito en CASO B y
 *    deben disparar el filtro.
 *  - Casos NEGATIVOS: textos de CASO A (Coyo SÍ encontró algo) que NO
 *    deben disparar el filtro.
 *  - Casos límite: solo una de las dos señales (negativa o invitación
 *    a la comunidad) no basta — se requieren AMBAS.
 *
 * Si más adelante se agrega una variante a los regex (porque Gemini
 * empieza a usar una frase nueva), AGREGAR el caso aquí también para
 * prevenir regresiones futuras.
 *
 * EJECUTAR: cd apps/api && pnpm test -- coyo-filtro-caso-b
 *
 * Doc maestro: docs/arquitectura/Home_Coyo.md
 *   §Filtro de consistencia texto-tarjeta.
 *
 * UBICACIÓN: apps/api/src/__tests__/coyo-filtro-caso-b.test.ts
 */

import { describe, it, expect } from 'vitest';
import { geminiRedactoComoSinResultados } from '../services/coyo/orquestador';

// =============================================================================
// CASOS POSITIVOS — Gemini siguió CASO B, el filtro DEBE disparar
// =============================================================================

describe('geminiRedactoComoSinResultados — CASO B (debe devolver true)', () => {
    it('caso reproducido "agua purificadora" (no encontré + deja tu pregunta + comunidad)', () => {
        const texto =
            '¡Hola! Fíjate que ahorita no encontré nada de agua purificadora en el catálogo. Pero si quieres, deja aquí tu pregunta para que la comunidad te ayude a encontrarla.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "laptops" (no encontré + deja tu pregunta + comunidad)', () => {
        const texto =
            '¡Híjole! Para laptops no encontré nada ahorita en el catálogo del pueblo. Pero si quieres, deja tu pregunta para que la comunidad te pueda ayudar, ¿va?';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "plomero" (no encontré + deja tu pregunta + vecinos)', () => {
        const texto =
            'Híjole, por ahora no encontré plomeros ofreciendo sus servicios aquí en tu ciudad. Pero si quieres, deja tu pregunta para que los vecinos te echen una mano.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "pizza" (no encontré + deja tu pregunta + comunidad + echa una mano)', () => {
        const texto =
            'Híjole, por ahora no encontré negocios de pizza aquí en tu ciudad. Pero si quieres, deja tu pregunta y la comunidad te echa una mano para ver dónde hay.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "electricista" (no encontré + deja tu pregunta + comunidad)', () => {
        const texto =
            'Ay, mira, busqué rapidito y no encontré ningún electricista registrado ahorita en tu ciudad. Pero no te preocupes, puedes dejar tu pregunta para que la comunidad te ayude.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "aires acondicionados" v1 (no encontré + dejar pregunta INFINITIVO + algún vecino + echa la mano)', () => {
        const texto =
            '¡Hola! Fíjate que por ahora no encontré negocios ni servicios para arreglar aires acondicionados en tu ciudad. Pero puedes dejar tu pregunta y seguro algún vecino te echa la mano con eso.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    it('caso reproducido "aires acondicionados" v2 (no encontré + deja tu pregunta + comunidad)', () => {
        const texto =
            '¡Ay, para arreglar aires acondicionados no encontré nada ahorita en tu ciudad! Pero deja tu pregunta para que la comunidad te ayude.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(true);
    });

    // ─── Variantes sintéticas para cubrir más patrones ────────────────────

    it('variante: "ahorita no" + invitación a comunidad', () => {
        expect(
            geminiRedactoComoSinResultados(
                'Ahorita no hay nada de eso en tu ciudad. Deja tu pregunta y la comunidad te ayuda.',
            ),
        ).toBe(true);
    });

    it('variante: "todavía no" + algún vecino', () => {
        expect(
            geminiRedactoComoSinResultados(
                'Todavía no aparece nada con esa búsqueda. Pero algún vecino te puede orientar — deja tu pregunta.',
            ),
        ).toBe(true);
    });

    it('variante: "sin resultados" + echar una mano', () => {
        expect(
            geminiRedactoComoSinResultados(
                'Sin resultados por ahora en tu ciudad. Algún vecino te puede echar una mano — deja tu pregunta.',
            ),
        ).toBe(true);
    });

    it('variante: "no hay" + dejar tu pregunta (infinitivo)', () => {
        expect(
            geminiRedactoComoSinResultados(
                'Por ahora no hay nada de eso aquí. Puedes dejar tu pregunta para que la comunidad responda.',
            ),
        ).toBe(true);
    });

    it('variante: "no apareció" + comunidad', () => {
        expect(
            geminiRedactoComoSinResultados(
                'No apareció ningún negocio así en tu ciudad. La comunidad te puede ayudar — deja tu pregunta.',
            ),
        ).toBe(true);
    });

    it('variante: "no encontré" + "alguien te puede"', () => {
        expect(
            geminiRedactoComoSinResultados(
                'No encontré nada con esa búsqueda ahorita. Pero alguien te puede orientar si dejas la pregunta.',
            ),
        ).toBe(true);
    });

    it('variante: "no encontré" + "alguien te pueda"', () => {
        expect(
            geminiRedactoComoSinResultados(
                'No encontré resultados ahorita. Deja tu pregunta para que alguien te pueda ayudar.',
            ),
        ).toBe(true);
    });

    it('variante: vecino (singular, sin "algún") te + echa mano', () => {
        expect(
            geminiRedactoComoSinResultados(
                'No encontré nada. Un vecino te puede echar mano si dejas tu pregunta.',
            ),
        ).toBe(true);
    });
});

// =============================================================================
// CASOS NEGATIVOS — Gemini siguió CASO A, el filtro NO debe disparar
// =============================================================================

describe('geminiRedactoComoSinResultados — CASO A (debe devolver false)', () => {
    it('caso reproducido "mariscos" (afirmativo, encontré)', () => {
        const texto =
            '¡Claro que sí! Mira, encontré Mariscos El Capitán, tiene un 4.5 de rating con 28 reseñas, aunque ahorita no está abierto.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('caso reproducido "mariscos v2" (en tu ciudad + encontré)', () => {
        const texto =
            'Aquí en tu ciudad encontré Mariscos El Capitán; tienen un rating de 4.5 con 28 reseñas, pero ahorita no está abierto.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('caso reproducido "Laptop HP" (encontré + datos ricos)', () => {
        const texto =
            '¡Hola! Ahorita encontré una Laptop HP 15" Intel Core i5 8GB RAM en $8,500, es usada y aceptan ofertas.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('caso reproducido "plomeros encontrados" (CASO A con 2 áreas)', () => {
        const texto =
            '¡Claro que sí! En tu ciudad encontré Plomería Express, tiene 4 de rating con 8 reseñas, pero ahorita está cerrado. También hay un servicio de Plomería residencial 24h.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('caso reproducido "farmacia" (encontré + datos ricos)', () => {
        const texto =
            'Claro que sí, encontré Farmacia San Ángel en tu ciudad, con un rating de 4.2 y 15 reseñas. Nada más te aviso que ahorita está cerrada, ¿eh?';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('caso reproducido "tacos" (3 áreas, CASO A puro)', () => {
        const texto =
            '¡Claro que sí! Mira, tienes "Tacos el Guero", aunque ahorita está cerrado. También hay una oferta de "Tacos" en Imprenta FindUS, ¡con 5 estrellas de rating y 31 días para que aproveches!';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('CASO A con matización: "no encontré X pero sí Y" (sin invitación a comunidad)', () => {
        // Riesgo principal del fix: que filtremos respuestas que mezclan
        // negativa con afirmativa. La heurística doble lo previene porque
        // este texto NO menciona comunidad/vecino/echa mano/deja pregunta.
        const texto =
            'No encontré laptops nuevas, pero sí encontré estas usadas que te pueden interesar.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('CASO A con "no está abierto ahorita" en frase afirmativa', () => {
        // "ahorita no" aparece pero el sentido es positivo
        const texto =
            'Encontré Mariscos El Capitán, aunque ahorita no está abierto pero abre a las 6 PM.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });
});

// =============================================================================
// CASOS LÍMITE — solo UNA señal (no AMBAS) → no debe disparar
// =============================================================================

describe('geminiRedactoComoSinResultados — solo una señal (debe devolver false)', () => {
    it('solo señal negativa, sin invitación a comunidad', () => {
        // "no encontré" pero no hay "deja tu pregunta", "comunidad", "vecino", etc.
        const texto = 'No encontré ningún resultado con esa búsqueda.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('solo invitación a comunidad, sin señal negativa', () => {
        // Hay "deja tu pregunta" pero ningún "no encontré"/"no hay"/etc.
        const texto =
            'Te recomiendo dejar tu pregunta para que la comunidad te dé recomendaciones también.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('texto vacío', () => {
        expect(geminiRedactoComoSinResultados('')).toBe(false);
    });

    it('texto solo con espacios', () => {
        expect(geminiRedactoComoSinResultados('   \n  ')).toBe(false);
    });

    it('texto que menciona "comunidad" pero NO es CASO B (sin negativa)', () => {
        const texto =
            'Encontré un negocio muy querido por la comunidad: La Panadería del Centro.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });

    it('texto que menciona "vecino" pero NO es CASO B (sin negativa)', () => {
        const texto =
            'Mira, este negocio lo recomienda mucho un vecino que conoce la zona.';
        expect(geminiRedactoComoSinResultados(texto)).toBe(false);
    });
});

// =============================================================================
// INSENSIBILIDAD A MAYÚSCULAS/MINÚSCULAS Y ACENTOS
// =============================================================================

describe('geminiRedactoComoSinResultados — variaciones de capitalización', () => {
    it('matchea con texto en MAYÚSCULAS', () => {
        expect(
            geminiRedactoComoSinResultados(
                'NO ENCONTRÉ NADA. DEJA TU PREGUNTA PARA QUE LA COMUNIDAD TE AYUDE.',
            ),
        ).toBe(true);
    });

    it('matchea con texto en MiNuScUlAs MixTaS', () => {
        expect(
            geminiRedactoComoSinResultados(
                'No ENcontré NaDa. DeJa Tu PreGunTa Y La CoMUniDad Te AyuDa.',
            ),
        ).toBe(true);
    });

    it('matchea con acentos faltantes en "encontre"', () => {
        // Gemini a veces omite acentos cuando ya cubrió la regla en otra parte
        expect(
            geminiRedactoComoSinResultados(
                'No encontre nada ahorita. Deja tu pregunta para que la comunidad te ayude.',
            ),
        ).toBe(true);
    });
});
