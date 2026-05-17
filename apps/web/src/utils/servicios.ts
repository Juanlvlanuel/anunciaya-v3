/**
 * servicios.ts (utils)
 * =====================
 * Helpers de formato y parseo para el módulo Servicios.
 *
 * - Re-exporta los helpers genéricos de `utils/marketplace.ts`
 *   (`formatearTiempoRelativo`, `formatearDistancia`, etc.) porque son
 *   neutros y aplican igual a Servicios.
 * - Agrega lo único específico: `formatearPrecioServicio` para la
 *   discriminated union de precio (fijo/hora/mensual/rango/a-convenir).
 *
 * Si en el futuro se quiere mover los helpers genéricos a `utils/comun.ts`
 * o similar, este archivo seguirá siendo la fachada para los consumidores
 * de Servicios — no romperá ningún import.
 *
 * Ubicación: apps/web/src/utils/servicios.ts
 */

import type { CategoriaClasificado, FiltroClasificado, PrecioServicio } from '../types/servicios';

// =============================================================================
// RE-EXPORTS de helpers genéricos
// =============================================================================

export {
    parsearFechaPostgres,
    formatearDistancia,
    formatearTiempoRelativo,
    formatearUltimaConexion,
    obtenerFotoPortada,
    obtenerNombreCorto,
} from './marketplace';

import { parsearFechaPostgres } from './marketplace';

const DIA_EN_MS = 24 * 60 * 60 * 1000;

/**
 * Devuelve true si la publicación se creó en las últimas 24h. Usado para
 * mostrar un badge "Nuevo" en cards del feed.
 */
export function esPublicacionNueva(createdAt: string): boolean {
    const fecha = parsearFechaPostgres(createdAt);
    return Date.now() - fecha.getTime() < DIA_EN_MS;
}

// =============================================================================
// FORMATO DE PRECIO (discriminated union)
// =============================================================================

/**
 * Formatea un precio de Servicios a string corto para cards y detalle.
 *
 * Ejemplos:
 *   - { kind: 'fijo',       monto: 350 }         → "$350"
 *   - { kind: 'hora',       monto: 250 }         → "$250/h"
 *   - { kind: 'mensual',    monto: 8500 }        → "$8,500 / mes"
 *   - { kind: 'rango',      min: 300, max: 500 } → "$300–$500"
 *   - { kind: 'a-convenir' }                     → "A convenir"
 */
export function formatearPrecioServicio(precio: PrecioServicio): string {
    switch (precio.kind) {
        case 'fijo':
            return `$${precio.monto.toLocaleString('es-MX')}`;
        case 'hora':
            return `$${precio.monto.toLocaleString('es-MX')}/h`;
        case 'mensual':
            return `$${precio.monto.toLocaleString('es-MX')} / mes`;
        case 'rango':
            return `$${precio.min.toLocaleString('es-MX')}–$${precio.max.toLocaleString('es-MX')}`;
        case 'a-convenir':
            return 'A convenir';
    }
}

/**
 * Formatea presupuesto del modo "Solicito" — siempre rango.
 */
export function formatearPresupuesto(presupuesto: {
    min: number;
    max: number;
}): string {
    return `$${presupuesto.min.toLocaleString('es-MX')}–$${presupuesto.max.toLocaleString('es-MX')}`;
}

// =============================================================================
// HELPERS DE MODALIDAD
// =============================================================================

/**
 * Capitaliza modalidad para mostrar como chip ("Presencial", "Remoto", "Híbrido").
 */
export function modalidadLabel(modalidad: 'presencial' | 'remoto' | 'hibrido'): string {
    switch (modalidad) {
        case 'presencial':
            return 'Presencial';
        case 'remoto':
            return 'Remoto';
        case 'hibrido':
            return 'Híbrido';
    }
}

// =============================================================================
// HELPERS DE CATEGORÍA (widget Clasificados)
// =============================================================================

/**
 * Mapea categoría de BD (lowercase, kebab-case) → label con tildes para UI.
 * Las pseudo-categorías UI 'todos' y 'urgente' se manejan aquí también para
 * facilitar el render del tag strip del widget.
 */
export function labelCategoria(filtro: FiltroClasificado): string {
    switch (filtro) {
        case 'todos':
            return 'Todos';
        case 'urgente':
            return 'Urgente';
        case 'hogar':
            return 'Hogar';
        case 'cuidados':
            return 'Cuidados';
        case 'eventos':
            return 'Eventos';
        case 'belleza-bienestar':
            return 'Belleza y bienestar';
        case 'empleo':
            return 'Empleo';
        case 'otros':
            return 'Otros';
    }
}

/**
 * Tono visual para el eyebrow de categoría dentro de una fila de pedido.
 * Rojo si es urgente, slate neutro en cualquier otra categoría.
 *
 * Token §6 — badges de estado: solo `bg-*-100 text-*-700`, sin borde.
 * Token §2 — fondos de color: mínimo variante `-100` (nunca `-50`).
 */
export function tonoCategoria(
    categoria: CategoriaClasificado | null,
    urgente: boolean,
): string {
    if (urgente) return 'bg-red-100 text-red-700';
    if (!categoria) return 'bg-slate-100 text-slate-700';
    return 'bg-slate-100 text-slate-700';
}
