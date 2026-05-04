/**
 * marketplace.ts (utils)
 * =======================
 * Helpers de formato y parseo para el módulo MarketPlace.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/utils/marketplace.ts
 */

// =============================================================================
// PARSEO DE FECHA POSTGRES
// =============================================================================

/**
 * El backend devuelve timestamps en formato Postgres con dos diferencias vs
 * ISO 8601:
 *  1. Espacio en lugar de `T` separando fecha y hora.
 *  2. Offset corto `+00` en lugar de `+00:00`.
 *
 * Chrome y Firefox toleran ambas variantes con `new Date(...)`, pero Safari
 * (iOS y macOS) las rechaza y devuelve `Invalid Date`. Eso resulta en strings
 * tipo "hace NaN meses" en cards del feed para usuarios de Apple.
 *
 * Esta función normaliza el string a ISO 8601 estricto antes de construir
 * el `Date`.
 *
 * @param postgresTimestamp - String con formato Postgres del backend
 * @returns `Date` válido en cualquier navegador
 */
export function parsearFechaPostgres(postgresTimestamp: string): Date {
    // 1. Espacio → 'T'. 2. Offset "+HH" o "-HH" sin minutos → "+HH:00".
    const isoLike = postgresTimestamp
        .replace(' ', 'T')
        .replace(/([+-]\d{2})$/, '$1:00');
    return new Date(isoLike);
}

// =============================================================================
// FORMATO DE DISTANCIA
// =============================================================================

/**
 * Formatea una distancia en metros a un string corto para mostrar en cards.
 *
 * Ejemplos:
 *   - 600     → "600m"
 *   - 1234    → "1.2km"
 *   - 12500   → "12km"
 *   - null    → ""
 */
export function formatearDistancia(metros: number | null): string {
    if (metros === null || metros === undefined) return '';
    if (metros < 1000) return `${Math.round(metros)}m`;
    const km = metros / 1000;
    if (km < 10) return `${km.toFixed(1)}km`;
    return `${Math.round(km)}km`;
}

// =============================================================================
// FORMATO DE TIEMPO RELATIVO
// =============================================================================

const MIN_EN_MS = 60 * 1000;
const HORA_EN_MS = 60 * MIN_EN_MS;
const DIA_EN_MS = 24 * HORA_EN_MS;

/**
 * Devuelve un string corto tipo "hace X" para mostrar bajo el título de la
 * card. Acepta tanto formato Postgres como ISO.
 *
 * Ejemplos:
 *   - hace 30s     (<1min)
 *   - hace 5min    (<1h)
 *   - hace 3h      (<24h)
 *   - hace 6d      (<30d)
 *   - hace 2 meses (>=30d)
 */
export function formatearTiempoRelativo(timestamp: string): string {
    const fecha = parsearFechaPostgres(timestamp);
    const ahora = Date.now();
    const diff = ahora - fecha.getTime();

    if (diff < MIN_EN_MS) return 'hace un momento';
    if (diff < HORA_EN_MS) {
        const min = Math.floor(diff / MIN_EN_MS);
        return `hace ${min}min`;
    }
    if (diff < DIA_EN_MS) {
        const horas = Math.floor(diff / HORA_EN_MS);
        return `hace ${horas}h`;
    }
    const dias = Math.floor(diff / DIA_EN_MS);
    if (dias < 30) return `hace ${dias}d`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
}

// =============================================================================
// FORMATO DE ÚLTIMA CONEXIÓN DEL VENDEDOR
// =============================================================================

/**
 * Formatea `usuarios.ultima_conexion` para la mini-bio del vendedor en P2.
 *
 * Rangos:
 *   < 5 min   → "Activa ahora"
 *   < 60 min  → "Activa hace X minutos"
 *   < 24h     → "Activa hace X horas"
 *   < 7 días  → "Activa hace X días"
 *   >= 7 días → null (no aporta confianza, no se muestra)
 *   null      → null
 */
export function formatearUltimaConexion(ultimaConexion: string | null | undefined): string | null {
    if (!ultimaConexion) return null;
    const fecha = parsearFechaPostgres(ultimaConexion);
    const diff = Date.now() - fecha.getTime();

    if (diff < 5 * MIN_EN_MS) return 'Activa ahora';
    if (diff < HORA_EN_MS) {
        const min = Math.floor(diff / MIN_EN_MS);
        return `Activa hace ${min} minuto${min !== 1 ? 's' : ''}`;
    }
    if (diff < DIA_EN_MS) {
        const horas = Math.floor(diff / HORA_EN_MS);
        return `Activa hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    }
    const dias = Math.floor(diff / DIA_EN_MS);
    if (dias < 7) return `Activa hace ${dias} día${dias !== 1 ? 's' : ''}`;
    return null;
}

// =============================================================================
// HELPERS DE ARTÍCULO
// =============================================================================

/**
 * Devuelve true si el artículo se publicó en las últimas 24h.
 * Usado para mostrar el badge "Nuevo" en cards del feed.
 */
export function esArticuloNuevo(createdAt: string): boolean {
    const fecha = parsearFechaPostgres(createdAt);
    return Date.now() - fecha.getTime() < DIA_EN_MS;
}

/**
 * Devuelve la URL de la foto portada del artículo.
 * Si `fotoPortadaIndex` está fuera de rango, cae a `fotos[0]`. Si no hay
 * fotos, devuelve null.
 */
export function obtenerFotoPortada(
    fotos: string[],
    fotoPortadaIndex: number
): string | null {
    if (fotos.length === 0) return null;
    if (fotoPortadaIndex >= 0 && fotoPortadaIndex < fotos.length) {
        return fotos[fotoPortadaIndex];
    }
    return fotos[0];
}

// =============================================================================
// FORMATO DE PRECIO
// =============================================================================

/**
 * Formatea precio en MXN para mostrar en cards y detalle.
 * Backend devuelve string con 2 decimales (ej: "2800.00"). En el feed solo
 * mostramos enteros (los decimales no aportan al precio P2P de objetos
 * usados — siempre se redondean al peso).
 *
 * Ejemplo: "2800.00" → "$2,800"
 */
export function formatearPrecio(precio: string | number): string {
    const num = typeof precio === 'string' ? parseFloat(precio) : precio;
    if (isNaN(num)) return '$0';
    return `$${Math.round(num).toLocaleString('es-MX')}`;
}
