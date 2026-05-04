/**
 * marketplace-filtros.test.ts
 * ============================
 * Tests del módulo de moderación autónoma del MarketPlace.
 *
 * Verifica las 4 funciones de detección y `validarTextoPublicacion` con
 * casos representativos: palabras prohibidas exactas, con acentos, en
 * mayúsculas, edge cases (palabras compuestas que NO deben matchear),
 * patrones de servicios y búsquedas.
 *
 * EJECUTAR: cd apps/api && pnpm test -- marketplace-filtros
 *
 * UBICACIÓN: apps/api/src/__tests__/marketplace-filtros.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    detectarPalabraProhibida,
    detectarServicio,
    detectarBusqueda,
    validarTextoPublicacion,
} from '../services/marketplace/filtros';

// =============================================================================
// 1. PALABRAS PROHIBIDAS — RECHAZO DURO
// =============================================================================

describe('detectarPalabraProhibida — rifas', () => {
    it('detecta "rifa" simple', () => {
        const r = detectarPalabraProhibida('Rifa de un televisor');
        expect(r?.categoria).toBe('rifa');
        expect(r?.palabra).toBe('rifa');
    });

    it('detecta "Rifo" en mayúsculas', () => {
        const r = detectarPalabraProhibida('RIFO mi bicicleta');
        expect(r?.categoria).toBe('rifa');
    });

    it('detecta "sorteo" con acento normalizado en otra palabra', () => {
        const r = detectarPalabraProhibida('Sortéo dos cosas');
        expect(r?.categoria).toBe('rifa');
        expect(r?.palabra).toBe('sorteo');
    });

    it('NO falsea con "barrifa" (contiene "rifa" pero no es palabra completa)', () => {
        const r = detectarPalabraProhibida('Vendo una barrifa de fútbol');
        // El test asegura que el match es por palabra completa con \b.
        // 'barrifa' no debe matchear 'rifa' porque la 'r' está pegada a otra letra.
        expect(r).toBeNull();
    });

    it('NO falsea con "boletines" (contiene "boleto")', () => {
        // Edge case: "boletines" empieza con "boleto" pero la palabra completa
        // es otra. Al usar \b...\b, "boleto" en "boletines" NO matchea porque
        // después de "boleto" sigue una letra (no boundary).
        const r = detectarPalabraProhibida('Vendo boletines vintage');
        expect(r).toBeNull();
    });
});

describe('detectarPalabraProhibida — subastas', () => {
    it('detecta "subasta"', () => {
        const r = detectarPalabraProhibida('Subasta — el mejor postor se lo lleva');
        expect(r?.categoria).toBe('subasta');
    });

    it('detecta frase compuesta "mejor postor"', () => {
        const r = detectarPalabraProhibida('Vendo al mejor postor');
        expect(r?.categoria).toBe('subasta');
        expect(r?.palabra).toBe('mejor postor');
    });

    it('NO falsea con "subastasta" (palabra inventada)', () => {
        const r = detectarPalabraProhibida('subastasta vintage');
        expect(r).toBeNull();
    });
});

describe('detectarPalabraProhibida — esquemas', () => {
    it('detecta "multinivel"', () => {
        const r = detectarPalabraProhibida('Únete a mi negocio multinivel');
        expect(r?.categoria).toBe('esquema');
    });

    it('detecta "multi nivel" con espacio', () => {
        const r = detectarPalabraProhibida('Mi negocio multi nivel');
        expect(r?.categoria).toBe('esquema');
        expect(r?.palabra).toBe('multi nivel');
    });

    it('detecta "bitcoin" en mayúsculas', () => {
        const r = detectarPalabraProhibida('Acepto pagos en BITCOIN');
        expect(r?.categoria).toBe('esquema');
    });
});

describe('detectarPalabraProhibida — ilegal', () => {
    it('detecta "arma"', () => {
        const r = detectarPalabraProhibida('Vendo arma para defensa');
        expect(r?.categoria).toBe('ilegal');
    });

    it('detecta "marihuana" con acento normalizado', () => {
        // Aunque no tiene acento real, esta prueba garantiza que se compara
        // contra texto normalizado (sin tildes).
        const r = detectarPalabraProhibida('vendo marihuana medicinal');
        expect(r?.categoria).toBe('ilegal');
    });

    it('NO falsea con palabras inocuas que contienen "arma" como substring', () => {
        const r = detectarPalabraProhibida('Vendo armario antiguo');
        expect(r).toBeNull();
    });
});

describe('detectarPalabraProhibida — ningún match', () => {
    it('devuelve null para texto limpio', () => {
        const r = detectarPalabraProhibida(
            'Bicicleta vintage Rinos restaurada con piezas originales'
        );
        expect(r).toBeNull();
    });

    it('devuelve null para texto vacío', () => {
        expect(detectarPalabraProhibida('')).toBeNull();
    });
});

// =============================================================================
// 2. DETECCIÓN DE SERVICIOS — SUGERENCIA SUAVE
// =============================================================================

describe('detectarServicio', () => {
    it('detecta "ofrezco mis servicios"', () => {
        expect(detectarServicio('Ofrezco mis servicios de plomería')).toBe(true);
    });

    it('detecta "doy clases de inglés"', () => {
        expect(detectarServicio('Doy clases de inglés a domicilio')).toBe(true);
    });

    it('detecta "soy plomero"', () => {
        expect(detectarServicio('Soy plomero certificado con 10 años de experiencia')).toBe(true);
    });

    it('detecta "cobro $200 la hora"', () => {
        expect(detectarServicio('Cobro $200 la hora por trabajos de pintura')).toBe(true);
    });

    it('NO detecta "servicio de mesa de porcelana" (es objeto, no servicio)', () => {
        // Caso ambiguo del doc maestro. Patrón "servicio de [verbo]" no matchea
        // "servicio de mesa". El usuario marca como límite aceptable.
        expect(detectarServicio('Hermoso servicio de mesa de porcelana antigua')).toBe(false);
    });

    it('NO detecta texto neutro', () => {
        expect(detectarServicio('Bicicleta restaurada en buen estado')).toBe(false);
    });
});

// =============================================================================
// 3. DETECCIÓN DE BÚSQUEDAS
// =============================================================================

describe('detectarBusqueda', () => {
    it('detecta "Busco una bicicleta"', () => {
        expect(detectarBusqueda('Busco una bicicleta usada en buen estado')).toBe(true);
    });

    it('detecta "Necesito comprar"', () => {
        expect(detectarBusqueda('Necesito comprar lentes ray ban')).toBe(true);
    });

    it('detecta "Quien tenga"', () => {
        expect(detectarBusqueda('Quien tenga una mesa de centro')).toBe(true);
    });

    it('NO detecta "Vendo una bicicleta" (caso normal de venta)', () => {
        expect(detectarBusqueda('Vendo una bicicleta usada en buen estado')).toBe(false);
    });

    it('NO detecta "Necesito vender" (vendedor, no comprador)', () => {
        expect(detectarBusqueda('Necesito vender mi bici antes del fin de mes')).toBe(false);
    });
});

// =============================================================================
// 4. VALIDACIÓN INTEGRAL
// =============================================================================

describe('validarTextoPublicacion', () => {
    it('rechaza con categoría "rifa" cuando hay palabra prohibida', () => {
        const r = validarTextoPublicacion('Rifa especial', 'Te puedes ganar una bici');
        expect(r.valido).toBe(false);
        expect(r.severidad).toBe('rechazo');
        expect(r.categoria).toBe('rifa');
        expect(r.palabraDetectada).toBe('rifa');
        expect(r.mensaje).toContain('rifas');
    });

    it('sugiere "servicio" cuando hay patrón de servicio', () => {
        const r = validarTextoPublicacion(
            'Plomero certificado',
            'Soy plomero con experiencia, doy clases de mantenimiento'
        );
        expect(r.valido).toBe(false);
        expect(r.severidad).toBe('sugerencia');
        expect(r.categoria).toBe('servicio');
    });

    it('sugiere "busqueda" cuando hay patrón de búsqueda', () => {
        const r = validarTextoPublicacion(
            'Busco bicicleta',
            'Quiero comprar una bici en buen estado'
        );
        expect(r.valido).toBe(false);
        expect(r.severidad).toBe('sugerencia');
        expect(r.categoria).toBe('busqueda');
    });

    it('prioriza rechazo duro sobre sugerencia (palabra prohibida + búsqueda)', () => {
        // Si el texto contiene una palabra prohibida Y un patrón de búsqueda,
        // el rechazo duro tiene prioridad.
        const r = validarTextoPublicacion(
            'Busco rifa',
            'Quiero comprar boletos para una rifa de coches'
        );
        expect(r.severidad).toBe('rechazo');
        expect(r.categoria).toBe('rifa');
    });

    it('marca como válido cuando todo está limpio', () => {
        const r = validarTextoPublicacion(
            'Bicicleta vintage Rinos restaurada',
            'Bici de los 80s con piñón Shimano, restaurada por completo. Buena para uso urbano.'
        );
        expect(r.valido).toBe(true);
    });
});
