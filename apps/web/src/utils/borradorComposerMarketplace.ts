/**
 * borradorComposerMarketplace.ts
 * ================================
 * Helpers para leer y descartar el borrador del composer de MarketPlace
 * desde fuera del hook `useComposerMarketplace`. Sirve principalmente al
 * `ComposerColapsado` MP (pill del feed) para mostrar la variante "tienes
 * un borrador" sin tener que montar el hook.
 *
 * Réplica 1:1 del de Servicios (`borradorComposerServicios.ts`) con el
 * shape específico de MP (sin modo/modalidad/budget, con precio simple,
 * condición, aceptaOfertas, unidadVenta).
 *
 * Mantiene sincronizado el namespace `'v1'` con el hook.
 *
 * Ubicación: apps/web/src/utils/borradorComposerMarketplace.ts
 */

import type { CondicionArticulo } from '../types/marketplace';

const CLAVE_DRAFT = 'aya:composer:marketplace:draft-v1';

export interface BorradorResumenMP {
    titulo: string;
    descripcion: string;
    /** String tal cual lo guardó el composer (vacío si no llenó). */
    precio: string;
    tieneFotos: boolean;
    cantidadFotos: number;
    /** URLs reales de las fotos subidas a R2. Cuando se descarta el
     *  borrador hay que dispararlas a `DELETE /marketplace/foto-huerfana`
     *  para no dejarlas residuales (el backend valida reference count
     *  antes de borrar de R2). */
    fotos: string[];
    condicion: CondicionArticulo | null;
    aceptaOfertas: boolean | null;
    unidadVenta: string;
    zonaAproximada: string;
}

/** Lee el borrador de creación. Devuelve null si no hay o si está
 *  intacto (sin ningún cambio significativo del usuario). */
export function leerBorradorMarketplace(): BorradorResumenMP | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CLAVE_DRAFT);
        if (!raw) return null;
        const d = JSON.parse(raw) as {
            titulo?: string;
            descripcion?: string;
            precio?: string;
            fotos?: string[];
            condicion?: CondicionArticulo | null;
            aceptaOfertas?: boolean | null;
            unidadVenta?: string;
            zonaAproximada?: string;
        };
        const titulo = d.titulo ?? '';
        const descripcion = d.descripcion ?? '';
        const precio = d.precio ?? '';
        const fotos = d.fotos ?? [];
        const cantidadFotos = fotos.length;
        const tieneFotos = cantidadFotos > 0;
        const unidadVenta = d.unidadVenta ?? '';
        const zonaAproximada = d.zonaAproximada ?? '';
        const estaIntacto =
            !titulo &&
            !descripcion &&
            !precio &&
            !tieneFotos &&
            d.condicion == null &&
            d.aceptaOfertas == null &&
            !unidadVenta &&
            !zonaAproximada;
        if (estaIntacto) return null;
        return {
            titulo,
            descripcion,
            precio,
            tieneFotos,
            cantidadFotos,
            fotos,
            condicion: d.condicion ?? null,
            aceptaOfertas: d.aceptaOfertas ?? null,
            unidadVenta,
            zonaAproximada,
        };
    } catch {
        return null;
    }
}

/** Elimina el borrador de creación. No toca borradores de edición
 *  (`edit-{id}`). Útil para el botón "Descartar" de la pill. */
export function descartarBorradorMarketplace() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CLAVE_DRAFT);
    } catch {
        /* noop */
    }
}
