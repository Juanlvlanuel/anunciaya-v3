/**
 * coyo-filtro-caso-a.test.ts
 * ============================
 * Tests del helper `tituloMencionadoEnTexto` del orquestador de Coyo.
 *
 * Este helper detecta si Gemini "mencionó" un ítem en su redacción
 * (chequeando si al menos un token significativo del título del ítem
 * aparece en el texto). Es la base del filtro CASO A v2: items que
 * el buscador trajo pero Gemini ignoró semánticamente en su texto se
 * limpian para mantener consistencia visual texto ↔ tarjetas.
 *
 * Cobertura:
 *  - POSITIVOS: títulos cuya palabra principal aparece en el texto
 *    (Gemini sí los mencionó) → debe devolver true (mantener).
 *  - NEGATIVOS: títulos cuyas palabras NO aparecen en el texto
 *    (Gemini los ignoró) → debe devolver false (filtrar).
 *  - Casos límite: títulos vacíos, stopwords, números, acentos,
 *    capitalización.
 *
 * EJECUTAR: pnpm --filter api exec vitest run src/__tests__/coyo-filtro-caso-a.test.ts
 *
 * Doc maestro: docs/arquitectura/Home_Coyo.md §Filtro CASO A v2.
 *
 * UBICACIÓN: apps/api/src/__tests__/coyo-filtro-caso-a.test.ts
 */

import { describe, it, expect } from 'vitest';
import { tituloMencionadoEnTexto } from '../services/coyo/orquestador';

// =============================================================================
// CASOS POSITIVOS — Gemini SÍ mencionó el item (debe devolver true)
// =============================================================================

describe('tituloMencionadoEnTexto — mencionado (debe devolver true)', () => {
    it('caso real "Plomería Express" mencionada por nombre completo', () => {
        const texto =
            'Para echarle una mano a tu casa, en la ciudad tenemos a Plomería Express, que está abierto y tiene un rating de 4 con 8 reseñas.';
        expect(tituloMencionadoEnTexto('Plomería Express', texto)).toBe(true);
    });

    it('caso real "Plomería residencial 24h" mencionada solo por "Plomería"', () => {
        const texto =
            'También hay un servicio de Plomería residencial 24h en la ciudad.';
        expect(tituloMencionadoEnTexto('Plomería residencial 24h', texto)).toBe(
            true,
        );
    });

    it('caso real "Mariscos El Capitán" mencionado por nombre', () => {
        const texto =
            '¡Claro! En tu ciudad encontré Mariscos El Capitán. Tiene 4.5 de rating con 28 reseñas, pero ahorita está cerrado.';
        expect(tituloMencionadoEnTexto('Mariscos El Capitán', texto)).toBe(true);
    });

    it('caso real "Farmacia San Ángel" mencionada completa', () => {
        const texto =
            'Claro que sí, encontré Farmacia San Ángel en tu ciudad, con un rating de 4.2 y 15 reseñas.';
        expect(tituloMencionadoEnTexto('Farmacia San Ángel', texto)).toBe(true);
    });

    it('Gemini menciona solo el apellido del negocio ("Brujo" sin "Pollos El")', () => {
        // Heurística: con UN solo token significativo basta.
        const texto = 'Te recomiendo "El Brujo", está cerquita de la marina.';
        expect(tituloMencionadoEnTexto('Pollos El Brujo', texto)).toBe(true);
    });

    it('Gemini menciona el negocio con mayúsculas distintas', () => {
        const texto = 'En la ciudad encontré PLOMERÍA EXPRESS, está abierto.';
        expect(tituloMencionadoEnTexto('Plomería Express', texto)).toBe(true);
    });

    it('Gemini menciona sin acentos cuando el título tiene acentos', () => {
        const texto = 'Mira lo que encontre: Farmacia San Angel, abierta ahorita.';
        expect(tituloMencionadoEnTexto('Farmacia San Ángel', texto)).toBe(true);
    });

    it('Gemini menciona con acentos cuando el título no los tiene', () => {
        const texto = 'En tu ciudad tienes "Tacos el Güero", abierto ahorita.';
        expect(tituloMencionadoEnTexto('Tacos el Guero', texto)).toBe(true);
    });

    it('título de oferta con tokens repetidos en texto', () => {
        const texto =
            '¡Mira, hay una oferta de zapatos en Zapatería Peñasco, vence mañana!';
        expect(tituloMencionadoEnTexto('Zapatos y tenis para hombre', texto)).toBe(
            true,
        );
    });
});

// =============================================================================
// CASOS NEGATIVOS — Gemini NO mencionó el item (debe devolver false)
// =============================================================================

describe('tituloMencionadoEnTexto — NO mencionado (debe devolver false)', () => {
    it('caso real reproducido "Contadora Fernanda" cuando Gemini menciona solo plomerías', () => {
        // Caso del bug: pregunta "quien me ayuda con la casa?" → Gemini
        // menciona Plomería Express y Plomería residencial 24h. Contadora
        // Fernanda matcheó por categoría "Servicios" pero Gemini la ignoró.
        const texto =
            'Para echarle una mano a tu casa, en la ciudad tenemos a Plomería Express, que está abierto y tiene un rating de 4 con 8 reseñas. También hay un servicio de Plomería residencial 24h.';
        expect(tituloMencionadoEnTexto('Contadora Fernanda', texto)).toBe(false);
    });

    it('título "Laptop HP 15..." no aparece cuando Gemini habla de tacos', () => {
        const texto =
            '¡Claro! Mira, tienes "Tacos el Guero", aunque ahorita está cerrado.';
        expect(
            tituloMencionadoEnTexto('Laptop HP 15" Intel Core i5 8GB RAM', texto),
        ).toBe(false);
    });

    it('título "Bicicleta de montaña" no aparece cuando Gemini habla de farmacia', () => {
        const texto =
            'En tu ciudad encontré Farmacia San Ángel, con un rating de 4.2.';
        expect(
            tituloMencionadoEnTexto(
                'Bicicleta de montaña Trek aluminio rodada 26',
                texto,
            ),
        ).toBe(false);
    });

    it('título sin tokens en común con el texto', () => {
        expect(
            tituloMencionadoEnTexto(
                'Zapatería Especializada',
                'Mira, hay un restaurante muy bueno cerca.',
            ),
        ).toBe(false);
    });

    it('título que comparte solo stopwords con el texto', () => {
        // "El Capitán" sin "Mariscos" → solo tokens >3 letras descartando
        // stopwords son ["capitan"]. Si el texto no menciona "capitán",
        // no debe matchear.
        expect(
            tituloMencionadoEnTexto(
                'El Capitán',
                'Mira, en tu ciudad hay un mercado muy bueno por la avenida.',
            ),
        ).toBe(false);
    });
});

// =============================================================================
// CASOS LÍMITE
// =============================================================================

describe('tituloMencionadoEnTexto — casos límite (mantener: true)', () => {
    it('título vacío → no podemos decidir, mantener', () => {
        expect(tituloMencionadoEnTexto('', 'cualquier texto')).toBe(true);
    });

    it('texto vacío → no podemos decidir, mantener', () => {
        expect(tituloMencionadoEnTexto('Mariscos El Capitán', '')).toBe(true);
    });

    it('título solo con stopwords → no hay tokens distintivos, mantener', () => {
        // Edge case improbable pero defensivo: si el título solo tiene
        // palabras como "El", "La", "De", no podemos distinguirlo del
        // resto del lenguaje, mejor mantener.
        expect(tituloMencionadoEnTexto('El La De', 'cualquier texto')).toBe(true);
    });

    it('título solo con números → no son tokens distintivos, mantener', () => {
        expect(tituloMencionadoEnTexto('123 456', 'cualquier texto')).toBe(true);
    });

    it('título con tokens muy cortos (≤3 letras)', () => {
        // Tokens de 3 letras o menos se descartan ("HP", "i5", "8GB"
        // serían descartados, pero "Laptop" se queda).
        const texto = 'Encontré una Laptop usada.';
        expect(tituloMencionadoEnTexto('Laptop HP i5 8GB', texto)).toBe(true);
    });

    it('título con caracteres especiales (comillas, puntos)', () => {
        // El sanitizado quita caracteres no-letra y no-número.
        const texto = 'Tienes una Laptop HP 15 en venta.';
        expect(tituloMencionadoEnTexto('Laptop HP 15"', texto)).toBe(true);
    });
});

// =============================================================================
// CASOS ANTI-FALSO-POSITIVO (clave para evitar regresiones)
// =============================================================================

describe('tituloMencionadoEnTexto — anti-falsos-positivos', () => {
    it('texto que menciona "casa" (singular) NO matchea título con "casas" (plural)', () => {
        // El helper busca tokens del título DENTRO del texto (no al revés).
        // Si el título tiene "casas" pero el texto solo dice "casa", el
        // token "casas" no está como substring en "casa" → devuelve false.
        // Trade-off conocido: si Gemini parafrasea sin usar palabras
        // del título, el ítem se filtra (preferible quedarse corto a
        // mostrar ítems irrelevantes).
        expect(
            tituloMencionadoEnTexto(
                'Casas del Sol',
                'Mira, en tu casa puedes recibir paquetes con FedEx.',
            ),
        ).toBe(false);
    });

    it('título con primer token genérico solo es válido si SUS otros tokens están', () => {
        // "Servicios Móviles Express" → tokens significativos:
        // ["servicios", "moviles", "express"]. Si el texto menciona
        // "express" basta para matchear. Caso útil para evitar perder
        // negocios cuyo primer token es genérico.
        expect(
            tituloMencionadoEnTexto(
                'Servicios Móviles Express',
                'En la ciudad tenemos Express muy querido.',
            ),
        ).toBe(true);
    });
});
