/**
 * resenas.ts
 * ===========
 * Tipos TypeScript para el módulo de Reseñas/Opiniones en Business Studio.
 *
 * UBICACIÓN: apps/web/src/types/resenas.ts
 */

// =============================================================================
// RESEÑA (perspectiva del negocio en Business Studio)
// =============================================================================

/**
 * Reseña de un cliente vista desde Business Studio.
 * Incluye datos del autor, sucursal y respuesta del negocio si existe.
 */
export interface ResenaBS {
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;

    // Sucursal donde se hizo la reseña
    sucursalId: string | null;
    sucursalNombre: string | null;

    // Cliente que escribió la reseña
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };

    // Respuesta del negocio (null si aún no responde)
    respuesta: {
        id: string;
        texto: string | null;
        createdAt: string | null;
    } | null;
}

// =============================================================================
// KPIs DE RESEÑAS
// =============================================================================

/**
 * KPIs para la página Opiniones de Business Studio.
 * Se muestran en la parte superior de la página.
 */
export interface KPIsResenas {
    promedio: number;           // Ej: 4.5
    total: number;              // Ej: 156
    pendientes: number;         // Ej: 12 (sin respuesta)
    distribucion: {
        estrellas5: number;
        estrellas4: number;
        estrellas3: number;
        estrellas2: number;
        estrellas1: number;
    };
}

// =============================================================================
// FILTROS
// =============================================================================

/**
 * Filtro de reseñas: todas o solo pendientes de respuesta
 */
export type FiltroResenas = 'todas' | 'pendientes';

// =============================================================================
// RESPUESTAS DEL BACKEND
// =============================================================================

export interface RespuestaResenasBS {
    success: boolean;
    message: string;
    data: ResenaBS[];
}

export interface RespuestaKPIsResenas {
    success: boolean;
    message: string;
    data: KPIsResenas;
}

export interface RespuestaResponderResena {
    success: boolean;
    message: string;
    data?: {
        id: string;
        texto: string;
        createdAt: string;
    };
}