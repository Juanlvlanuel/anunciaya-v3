/**
 * composerMarketplacePayload.ts
 * ===============================
 * Helpers de construcción del payload que el composer MarketPlace manda al
 * backend (`POST /api/marketplace/articulos` y `PUT /api/marketplace/articulos/:id`).
 *
 * Reemplaza a las funciones embebidas en `PaginaPublicarArticulo.tsx` (wizard
 * MP). Mismo contrato con el backend — sólo cambia el origen del draft.
 *
 * Versión del checklist legal — se persiste en BD para auditoría. Cuando
 * el contenido de las 4 confirmaciones cambie, subir esta versión para
 * que los registros viejos queden trazables.
 *
 * Ubicación: apps/web/src/utils/composerMarketplacePayload.ts
 */

import type { ComposerMarketplaceDraft } from '../hooks/useComposerMarketplace';
import { parseEnteroPositivo } from '../hooks/useComposerMarketplace';
import type {
    CrearArticuloPayload,
    ActualizarArticuloPayload,
} from '../hooks/queries/useMarketplace';

/** Versión semántica del checklist legal MP. Mantener sincronizada con la
 *  constante `CHECKLIST_VERSION` que el wizard usaba (`v1-2026-05-13`).
 *  Subir cuando cambie el texto visible de las 4 confirmaciones. */
export const VERSION_CONFIRMACIONES_MP_COMPOSER = 'v1-2026-05-13';

/** Versión del checklist legal de una BÚSQUEDA (modo='busco'). Distinto de la
 *  venta: no existe "en mi poder". Ver Marketplace_Busco.md §6. */
export const VERSION_CONFIRMACIONES_MP_BUSCO = 'v1-busco-2026-07-02';

/**
 * Construye el payload para `POST /api/marketplace/articulos`.
 *
 * Ramifica por `modo`:
 *   - 'vendo': precio obligatorio, condición/ofertas/unidad opcionales, ≥1 foto,
 *     checklist de venta (licito/enPoder/honesto/seguro).
 *   - 'busco': sin precio; presupuesto {min,max} opcional; urgente; sin
 *     condición/ofertas/unidad; checklist de búsqueda (licito/real/seguro).
 *
 * `confirmadoPorUsuario` se inyecta desde fuera cuando el usuario eligió
 * continuar tras una sugerencia de moderación (no acá).
 */
export function construirPayloadCrearMP(
    d: ComposerMarketplaceDraft,
): CrearArticuloPayload {
    const descripcionTrim = d.descripcion.trim();
    // El checkbox unifica las 4 confirmaciones al mismo valor; tomamos una
    // como el flag "aceptado".
    const aceptado = d.confirmaciones.licito;

    // Campos comunes a ambos modos.
    const base = {
        modo: d.modo,
        titulo: d.titulo.trim(),
        descripcion: descripcionTrim,
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonaAproximada: d.zonaAproximada.trim(),
    };

    if (d.modo === 'busco') {
        const min = parseEnteroPositivo(d.presupuestoMin);
        const max = parseEnteroPositivo(d.presupuestoMax);
        const presupuesto =
            min !== null && max !== null ? { min, max } : undefined;
        return {
            ...base,
            presupuesto,
            urgente: d.urgente,
            confirmaciones: {
                licito: aceptado,
                real: aceptado,
                seguro: aceptado,
                version: VERSION_CONFIRMACIONES_MP_BUSCO,
            },
        };
    }

    // modo === 'vendo'
    const precio = parseEnteroPositivo(d.precio);
    if (precio === null) {
        // El composer ya valida esto antes de llamar — pero si por alguna
        // razón llegamos aquí con precio inválido, tirar error explícito.
        throw new Error('El precio es obligatorio y debe ser un entero > 0.');
    }
    const unidadVentaTrim = d.unidadVenta.trim();
    return {
        ...base,
        precio,
        condicion: d.condicion ?? null,
        aceptaOfertas: d.aceptaOfertas ?? null,
        unidadVenta: unidadVentaTrim || null,
        confirmaciones: {
            licito: d.confirmaciones.licito,
            enPoder: d.confirmaciones.enPoder,
            honesto: d.confirmaciones.honesto,
            seguro: d.confirmaciones.seguro,
            version: VERSION_CONFIRMACIONES_MP_COMPOSER,
        },
    };
}

/**
 * Construye el payload para `PUT /api/marketplace/articulos/:id`.
 *
 * NO se mandan las `confirmaciones` (en edición no se vuelve a mostrar el
 * checklist; el valor original persiste en BD). El `modo` no se edita.
 * Ramifica los campos editables según el modo del draft.
 */
export function construirPayloadEditarMP(
    d: ComposerMarketplaceDraft,
): ActualizarArticuloPayload {
    const base = {
        titulo: d.titulo.trim(),
        descripcion: d.descripcion.trim(),
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonaAproximada: d.zonaAproximada.trim(),
    };

    if (d.modo === 'busco') {
        const min = parseEnteroPositivo(d.presupuestoMin);
        const max = parseEnteroPositivo(d.presupuestoMax);
        const presupuesto =
            min !== null && max !== null ? { min, max } : undefined;
        return {
            ...base,
            presupuesto,
            urgente: d.urgente,
        };
    }

    const precio = parseEnteroPositivo(d.precio);
    if (precio === null) {
        throw new Error('El precio es obligatorio y debe ser un entero > 0.');
    }
    const unidadVentaTrim = d.unidadVenta.trim();
    return {
        ...base,
        precio,
        condicion: d.condicion ?? null,
        aceptaOfertas: d.aceptaOfertas ?? null,
        unidadVenta: unidadVentaTrim || null,
    };
}
