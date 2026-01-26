/**
 * ============================================================================
 * HOOK: useZonaHoraria
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useZonaHoraria.ts
 * 
 * PROPÓSITO:
 * Detectar y usar la zona horaria del usuario basándose en su ubicación GPS
 * 
 * FEATURES:
 * - Detecta zona horaria usando coordenadas GPS
 * - Fallback a zona horaria del navegador si no hay GPS
 * - Cache en localStorage para evitar recálculos
 * - Helpers para normalizar y comparar fechas
 * 
 * USO:
 * ```tsx
 * const { zonaHoraria, compararConHoy, normalizarFecha } = useZonaHoraria();
 * 
 * // Comparar si una fecha es anterior a hoy
 * const esFutura = compararConHoy('2026-01-15') > 0;
 * 
 * // Normalizar fecha al inicio del día en zona horaria local
 * const fechaNormalizada = normalizarFecha('2026-01-15T10:30:00Z');
 * ```
 * 
 * CREADO: Enero 2026 - Fix de problema de zonas horarias en ofertas
 */

import { useMemo } from 'react';
import { useGpsStore } from '../stores/useGpsStore';
import { detectarZonaHoraria } from '../utils/zonaHoraria';

// =============================================================================
// TIPOS
// =============================================================================

interface ZonaHorariaHook {
    /** Zona horaria detectada (IANA format) */
    zonaHoraria: string;

    /** Zona horaria en formato legible */
    zonaHorariaLegible: string;

    /** Normaliza una fecha al inicio del día en la zona horaria local */
    normalizarFecha: (fecha: string | Date) => Date;

    /** Compara una fecha con "hoy" (retorna -1: pasado, 0: hoy, 1: futuro) */
    compararConHoy: (fecha: string | Date) => number;

    /** Obtiene la fecha/hora actual en la zona horaria del usuario */
    obtenerAhora: () => Date;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const STORAGE_KEY = 'ay_zona_horaria';

const ZONA_HORARIA_LEGIBLE: Record<string, string> = {
    'America/Cancun': 'Cancún (UTC-5)',
    'America/Tijuana': 'Tijuana (UTC-8/-7)',
    'America/Hermosillo': 'Hermosillo (UTC-7)',
    'America/Mazatlan': 'Mazatlán (UTC-7/-6)',
    'America/Mexico_City': 'México Central (UTC-6/-5)',
};

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Obtiene zona horaria del localStorage o la detecta
 */
function obtenerZonaHorariaCacheada(
    latitud: number | null,
    longitud: number | null
): string {
    // Si hay coordenadas, detectar zona horaria
    if (latitud !== null && longitud !== null) {
        const zona = detectarZonaHoraria(latitud, longitud);

        // Guardar en cache
        try {
            localStorage.setItem(STORAGE_KEY, zona);
        } catch {
            // Ignorar errores de localStorage
        }

        return zona;
    }

    // Intentar obtener del cache
    try {
        const zonaCacheada = localStorage.getItem(STORAGE_KEY);
        if (zonaCacheada) {
            return zonaCacheada;
        }
    } catch {
        // Ignorar errores de localStorage
    }

    // Fallback: Obtener zona horaria del navegador
    const zonaNavegador = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Si es una zona de México, usarla
    if (zonaNavegador.startsWith('America/')) {
        return zonaNavegador;
    }

    // Fallback final: México Central (más común)
    return 'America/Mexico_City';
}

/**
 * Obtiene solo la parte de fecha (YYYY-MM-DD) manejando correctamente fechas UTC
 * 
 * IMPORTANTE: Fechas en formato ISO con medianoche UTC se interpretan como "el día X"
 * sin conversión de zona horaria, porque el backend las guarda así intencionalmente
 * para representar "el día X" independientemente de la zona horaria.
 */
function obtenerFechaEnZonaHoraria(fecha: string | Date, zonaHoraria: string): string {
    // Caso 1: Si es string sin hora (formato YYYY-MM-DD), retornar directamente
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
        return fecha.trim();
    }

    // Caso 2: PostgreSQL timestamp con medianoche UTC (2026-01-13 00:00:00+00)
    // Extraer solo la parte de fecha sin convertir zona horaria
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}\s00:00:00[+-]\d{2}$/.test(fecha.trim())) {
        return fecha.trim().split(' ')[0];
    }

    // Caso 3: ISO timestamp con medianoche UTC (2026-01-13T00:00:00Z o T00:00:00.000Z)
    // Extraer solo la parte de fecha sin convertir zona horaria
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(fecha.trim())) {
        return fecha.trim().split('T')[0];
    }

    // Caso 3.5: Timestamp con fin de día (23:59:59) - PostgreSQL o ISO
    // Representa "válido hasta el final de este día" - extraer fecha literal
    // Ejemplos: "2026-01-14 23:59:59+00" o "2026-01-14T23:59:59Z"
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}[\sT]23:59:59/.test(fecha.trim())) {
        return fecha.trim().split(/[\sT]/)[0];
    }

    // Caso 4: Fecha con hora diferente a medianoche - convertir a zona horaria
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;

    // Crear formatter para la zona horaria
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: zonaHoraria,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // Retorna formato YYYY-MM-DD
    return formatter.format(fechaObj);
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para manejo de zona horaria basado en ubicación GPS
 */
export function useZonaHoraria(): ZonaHorariaHook {
    const { latitud, longitud } = useGpsStore();

    // Detectar zona horaria (memoizado)
    const zonaHoraria = useMemo(() => {
        return obtenerZonaHorariaCacheada(latitud, longitud);
    }, [latitud, longitud]);

    // Nombre legible de la zona horaria
    const zonaHorariaLegible = useMemo(() => {
        return ZONA_HORARIA_LEGIBLE[zonaHoraria] || zonaHoraria;
    }, [zonaHoraria]);

    // Función para normalizar fechas
    const normalizarFecha = useMemo(() => {
        return (fecha: string | Date): Date => {
            // Obtener fecha en formato YYYY-MM-DD
            const fechaStr = obtenerFechaEnZonaHoraria(fecha, zonaHoraria);
            // Retornar como Date object al inicio del día
            return new Date(fechaStr + 'T00:00:00');
        };
    }, [zonaHoraria]);

    // Función para comparar con hoy
    const compararConHoy = useMemo(() => {
        return (fecha: string | Date): number => {
            // Obtener fecha actual en formato YYYY-MM-DD en la zona horaria del usuario
            const hoyStr = obtenerFechaEnZonaHoraria(new Date(), zonaHoraria);

            // Obtener fecha a comparar en formato YYYY-MM-DD en la zona horaria del usuario
            const fechaStr = obtenerFechaEnZonaHoraria(fecha, zonaHoraria);

            // Comparar strings directamente (YYYY-MM-DD permite comparación lexicográfica)
            if (fechaStr < hoyStr) return -1; // Pasado
            if (fechaStr > hoyStr) return 1;  // Futuro
            return 0; // Hoy
        };
    }, [zonaHoraria]);

    // Función para obtener ahora
    const obtenerAhora = useMemo(() => {
        return (): Date => {
            return new Date();
        };
    }, []);

    return {
        zonaHoraria,
        zonaHorariaLegible,
        normalizarFecha,
        compararConHoy,
        obtenerAhora,
    };
}

export default useZonaHoraria;