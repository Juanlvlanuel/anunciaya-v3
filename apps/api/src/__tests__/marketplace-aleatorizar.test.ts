/**
 * marketplace-aleatorizar.test.ts
 * ================================
 * Tests del helper `aleatorizarCoordenada` del service de MarketPlace.
 *
 * Verifica la propiedad crítica de privacidad: ningún punto generado puede
 * caer fuera del círculo de 500m alrededor de la coordenada original. Si esto
 * fallara, la "ubicación aproximada" pública podría revelar más de lo
 * esperado.
 *
 * EJECUTAR: cd apps/api && pnpm test -- marketplace-aleatorizar
 *
 * UBICACIÓN: apps/api/src/__tests__/marketplace-aleatorizar.test.ts
 */

import { describe, it, expect } from 'vitest';
import { aleatorizarCoordenada } from '../services/marketplace.service';

// =============================================================================
// HELPER: distancia haversine en metros entre dos coordenadas
// =============================================================================

const RADIO_TIERRA_METROS = 6_371_000;

function distanciaHaversineMetros(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const toRad = (g: number) => (g * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return RADIO_TIERRA_METROS * c;
}

// =============================================================================
// 1. PROPIEDAD CRÍTICA — 100 puntos dentro del círculo de 500m
// =============================================================================

describe('aleatorizarCoordenada — privacidad de ubicación', () => {
    // Punto original: Centro de Manzanillo, Colima (caso del doc maestro)
    const LAT_ORIGINAL = 19.0522;
    const LNG_ORIGINAL = -104.3158;
    const RADIO_PERMITIDO_METROS = 500;
    // Tolerancia mínima por errores de punto flotante en haversine vs el
    // modelo plano usado en el helper (curvatura es despreciable a 500m).
    const TOLERANCIA_METROS = 1;

    it('genera 100 puntos todos dentro del círculo de 500m', () => {
        const fueraDelCirculo: Array<{
            iteracion: number;
            distancia: number;
            lat: number;
            lng: number;
        }> = [];

        for (let i = 0; i < 100; i++) {
            const aprox = aleatorizarCoordenada(LAT_ORIGINAL, LNG_ORIGINAL);
            const distancia = distanciaHaversineMetros(
                LAT_ORIGINAL,
                LNG_ORIGINAL,
                aprox.lat,
                aprox.lng
            );

            if (distancia > RADIO_PERMITIDO_METROS + TOLERANCIA_METROS) {
                fueraDelCirculo.push({
                    iteracion: i,
                    distancia,
                    lat: aprox.lat,
                    lng: aprox.lng,
                });
            }
        }

        expect(fueraDelCirculo).toEqual([]);
    });

    it('no devuelve siempre la misma coordenada (variabilidad)', () => {
        const muestras = Array.from({ length: 10 }, () =>
            aleatorizarCoordenada(LAT_ORIGINAL, LNG_ORIGINAL)
        );
        const latsUnicas = new Set(muestras.map((m) => m.lat));
        const lngsUnicas = new Set(muestras.map((m) => m.lng));

        expect(latsUnicas.size).toBeGreaterThan(1);
        expect(lngsUnicas.size).toBeGreaterThan(1);
    });

    it('al menos uno de 100 puntos cae lejos del centro (>100m)', () => {
        // Sanity check: si el RNG fallara y siempre regresara cerca del centro,
        // la "privacidad" sería falsa. Con distribución uniforme en disco la
        // probabilidad de que TODOS los 100 puntos caigan en el disco interior
        // de 100m es (100/500)² ^ 100 ≈ 0 (prácticamente imposible).
        let alMenosUnoLejos = false;

        for (let i = 0; i < 100; i++) {
            const aprox = aleatorizarCoordenada(LAT_ORIGINAL, LNG_ORIGINAL);
            const distancia = distanciaHaversineMetros(
                LAT_ORIGINAL,
                LNG_ORIGINAL,
                aprox.lat,
                aprox.lng
            );
            if (distancia > 100) {
                alMenosUnoLejos = true;
                break;
            }
        }

        expect(alMenosUnoLejos).toBe(true);
    });

    it('funciona en latitudes cercanas al ecuador y a los polos', () => {
        const latitudes = [0, 19.0522, 60, -45];

        for (const lat of latitudes) {
            for (let i = 0; i < 25; i++) {
                const aprox = aleatorizarCoordenada(lat, LNG_ORIGINAL);
                const distancia = distanciaHaversineMetros(
                    lat,
                    LNG_ORIGINAL,
                    aprox.lat,
                    aprox.lng
                );
                expect(distancia).toBeLessThanOrEqual(
                    RADIO_PERMITIDO_METROS + TOLERANCIA_METROS
                );
            }
        }
    });
});
