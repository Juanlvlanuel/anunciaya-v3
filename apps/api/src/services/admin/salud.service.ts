/**
 * admin/salud.service.ts
 * =======================
 * "Salud del sistema" del módulo Mantenimiento (Panel Admin).
 *
 * Hace un ping ligero a cada servicio del que depende el backend (Base de datos,
 * Redis, Almacenamiento R2 y Stripe) y reporta su estado + latencia. Es de SOLO
 * lectura: no modifica nada, solo observa.
 *
 * Cada ping va envuelto en un timeout para que un servicio caído no cuelgue la
 * respuesta del Panel. Los 4 corren en paralelo.
 *
 * Ubicación: apps/api/src/services/admin/salud.service.ts
 */

import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { pool } from '../../db/index.js';
import { redis } from '../../db/redis.js';
import { r2Client, r2Config } from '../../config/r2.js';
import { stripe } from '../../config/stripe.js';

// =============================================================================
// TIPOS
// =============================================================================

export type IdServicio = 'bd' | 'redis' | 'r2' | 'stripe';
export type EstadoServicio = 'operativo' | 'lento' | 'caido';

export interface SaludServicio {
    id: IdServicio;
    nombre: string;
    estado: EstadoServicio;
    /** Latencia en ms del ping; null si el servicio está caído */
    latenciaMs: number | null;
    /** Mensaje del error cuando el estado es 'caido' */
    detalle?: string;
}

export interface SaludSistema {
    generadoEn: string;
    servicios: SaludServicio[];
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Si el ping responde pero tarda más que esto, se marca 'lento' (ámbar). */
const UMBRAL_LENTO_MS = 1500;

/** Tope por ping: si no responde en este tiempo, se considera 'caido'. */
const TIMEOUT_MS = 5000;

// =============================================================================
// HELPERS
// =============================================================================

/** Resuelve la promesa o rechaza al cumplirse el timeout (lo que ocurra primero). */
async function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
    let temporizador: ReturnType<typeof setTimeout>;
    const limite = new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(() => rechazar(new Error(`Sin respuesta en ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promesa, limite]);
    } finally {
        clearTimeout(temporizador!);
    }
}

/** Ejecuta el ping de un servicio y lo traduce a estado + latencia. */
async function medir(
    id: IdServicio,
    nombre: string,
    accion: () => Promise<unknown>,
): Promise<SaludServicio> {
    const inicio = Date.now();
    try {
        await conTimeout(accion(), TIMEOUT_MS);
        const latenciaMs = Date.now() - inicio;
        return {
            id,
            nombre,
            estado: latenciaMs > UMBRAL_LENTO_MS ? 'lento' : 'operativo',
            latenciaMs,
        };
    } catch (error) {
        return {
            id,
            nombre,
            estado: 'caido',
            latenciaMs: null,
            detalle: error instanceof Error ? error.message : String(error),
        };
    }
}

// =============================================================================
// SALUD DEL SISTEMA
// =============================================================================

/**
 * Pinguea los 4 servicios en paralelo y devuelve el reporte de salud.
 * - BD     → `SELECT 1`
 * - Redis  → `PING`
 * - R2     → listar 1 objeto del bucket
 * - Stripe → consultar el balance de la cuenta
 */
export async function obtenerSaludSistema(): Promise<SaludSistema> {
    const servicios = await Promise.all([
        medir('bd', 'Base de datos', () => pool.query('SELECT 1')),
        medir('redis', 'Redis', () => redis.ping()),
        medir('r2', 'Almacenamiento R2', () =>
            r2Client.send(new ListObjectsV2Command({ Bucket: r2Config.bucketName, MaxKeys: 1 })),
        ),
        medir('stripe', 'Stripe', () => stripe.balance.retrieve()),
    ]);

    return {
        generadoEn: new Date().toISOString(),
        servicios,
    };
}
