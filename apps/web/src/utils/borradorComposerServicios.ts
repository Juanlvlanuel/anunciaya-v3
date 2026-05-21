/**
 * borradorComposerServicios.ts
 * ==============================
 * Helpers para leer y descartar el borrador del composer de Servicios
 * desde fuera del hook `useComposerServicios`. Sirve principalmente al
 * ComposerColapsado (pill del feed) para mostrar la variante "tienes un
 * borrador" sin tener que montar el hook.
 *
 * Mantiene sincronizado el namespace `'v3'` con el hook.
 *
 * Ubicación: apps/web/src/utils/borradorComposerServicios.ts
 */

const CLAVE_DRAFT = 'aya:composer:servicios:draft-v3';

export interface BorradorResumen {
    titulo: string;
    descripcion: string;
    tieneFotos: boolean;
    cantidadFotos: number;
    /** URLs reales de las fotos subidas a R2. Cuando se descarta el
     *  borrador hay que dispararlas a `DELETE /servicios/foto-huerfana`
     *  para no dejarlas residuales (el backend valida reference count
     *  antes de borrar de R2). */
    fotos: string[];
    modo: 'ofrezco' | 'solicito' | null;
    categoria: string | null;
    modalidad: string | null;
    budgetMin: string;
    budgetMax: string;
    zonas: string[];
    urgente: boolean;
}

/** Lee el borrador de creación. Devuelve null si no hay o si está
 *  intacto (sin ningún cambio significativo del usuario). */
export function leerBorradorServicios(): BorradorResumen | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CLAVE_DRAFT);
        if (!raw) return null;
        const d = JSON.parse(raw) as {
            titulo?: string;
            descripcion?: string;
            modo?: 'ofrezco' | 'solicito' | null;
            categoria?: string | null;
            fotos?: string[];
            urgente?: boolean;
            modalidad?: string | null;
            budgetMin?: string;
            budgetMax?: string;
            zonasAproximadas?: string[];
        };
        const titulo = d.titulo ?? '';
        const descripcion = d.descripcion ?? '';
        const fotos = d.fotos ?? [];
        const cantidadFotos = fotos.length;
        const tieneFotos = cantidadFotos > 0;
        const budgetMin = d.budgetMin ?? '';
        const budgetMax = d.budgetMax ?? '';
        const zonas = d.zonasAproximadas ?? [];
        const urgente = !!d.urgente;
        const estaIntacto =
            !titulo &&
            !descripcion &&
            !d.categoria &&
            !tieneFotos &&
            !urgente &&
            !d.modalidad &&
            !budgetMin &&
            !budgetMax &&
            zonas.length === 0;
        if (estaIntacto) return null;
        return {
            titulo,
            descripcion,
            tieneFotos,
            cantidadFotos,
            fotos,
            modo: d.modo ?? null,
            categoria: d.categoria ?? null,
            modalidad: d.modalidad ?? null,
            budgetMin,
            budgetMax,
            zonas,
            urgente,
        };
    } catch {
        return null;
    }
}

/** Elimina el borrador de creación. No toca borradores de edición
 *  (`edit-{id}`). Útil para el botón "Descartar" de la pill. */
export function descartarBorradorServicios() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(CLAVE_DRAFT);
    } catch {
        /* noop */
    }
}
