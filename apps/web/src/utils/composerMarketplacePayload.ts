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

/**
 * Construye el payload para `POST /api/marketplace/articulos`.
 * Reglas:
 *   - `precio` se parsea desde string a entero positivo.
 *   - `descripcion` opcional: si está vacía, no se manda (el composer la deja
 *      como opcional en el backend MP, ya hecho en el sprint anterior).
 *   - `condicion` y `aceptaOfertas` opcionales (NULL = no aplica).
 *   - `unidadVenta` opcional (trim, undefined si vacío).
 *   - `confirmaciones` con la versión congelada.
 *   - `confirmadoPorUsuario` se inyecta desde fuera cuando el usuario eligió
 *      continuar tras una sugerencia de moderación (no acá).
 */
export function construirPayloadCrearMP(
    d: ComposerMarketplaceDraft,
): CrearArticuloPayload {
    const precio = parseEnteroPositivo(d.precio);
    if (precio === null) {
        // El composer ya valida esto antes de llamar — pero si por alguna
        // razón llegamos aquí con precio inválido, tirar error explícito
        // para detectar el bug rápido.
        throw new Error('El precio es obligatorio y debe ser un entero > 0.');
    }

    const descripcionTrim = d.descripcion.trim();
    const unidadVentaTrim = d.unidadVenta.trim();

    return {
        titulo: d.titulo.trim(),
        descripcion: descripcionTrim,
        precio,
        condicion: d.condicion ?? null,
        aceptaOfertas: d.aceptaOfertas ?? null,
        unidadVenta: unidadVentaTrim || null,
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonaAproximada: d.zonaAproximada.trim(),
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
 * Diferencias con el de crear:
 *   - NO se mandan las `confirmaciones` (en edición no se vuelve a mostrar
 *     el checklist; el valor original persiste intacto en BD — patrón
 *     idéntico al wizard previo).
 *   - El backend acepta `Partial<CrearArticuloPayload>`, pero mandamos todos
 *     los campos editables para que la edición sea una "foto completa" del
 *     estado actual del draft (más fácil de razonar que diffs parciales).
 */
export function construirPayloadEditarMP(
    d: ComposerMarketplaceDraft,
): ActualizarArticuloPayload {
    const precio = parseEnteroPositivo(d.precio);
    if (precio === null) {
        throw new Error('El precio es obligatorio y debe ser un entero > 0.');
    }

    const descripcionTrim = d.descripcion.trim();
    const unidadVentaTrim = d.unidadVenta.trim();

    return {
        titulo: d.titulo.trim(),
        descripcion: descripcionTrim,
        precio,
        condicion: d.condicion ?? null,
        aceptaOfertas: d.aceptaOfertas ?? null,
        unidadVenta: unidadVentaTrim || null,
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonaAproximada: d.zonaAproximada.trim(),
    };
}
