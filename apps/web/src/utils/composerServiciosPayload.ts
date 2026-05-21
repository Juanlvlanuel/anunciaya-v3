/**
 * composerServiciosPayload.ts
 * =============================
 * Helpers de construcción del payload que el composer manda al backend
 * (`POST /api/servicios/publicaciones` y `PUT /api/servicios/publicaciones/:id`).
 *
 * Reemplaza a las funciones `construirPayload` / `construirPayloadEdicion`
 * que vivían embebidas en `PaginaPublicarServicio.tsx` (wizard). Mismo
 * contrato con el backend — sólo cambia el origen del draft.
 *
 * Versión del checklist legal — se persiste en BD para auditoría. Cuando
 * el contenido de las 3 confirmaciones cambie, subir esta versión para
 * que los registros viejos queden trazables.
 *
 * Ubicación: apps/web/src/utils/composerServiciosPayload.ts
 */

import type { ComposerServiciosDraft } from '../hooks/useComposerServicios';
import {
    parseEntero,
    subtipoPorCategoria,
    tipoPorModo,
} from '../hooks/useComposerServicios';
import type { PrecioServicio } from '../types/servicios';

/** Versión semántica del checklist legal. Subir cuando cambie el texto
 *  visible de las 3 confirmaciones. */
export const VERSION_CONFIRMACIONES_COMPOSER = 'v3-2026-05-20';

/**
 * Construye el payload para `POST /api/servicios/publicaciones`.
 * Reglas:
 *   - modo='solicito' → presupuesto={min,max} si ambos llenos, sino null.
 *     precio siempre {kind:'a-convenir'}.
 *   - modo='ofrezco'  → precio={kind:'rango', min, max} si ambos llenos.
 *     Si solo uno: {kind:'fijo', monto}. Si ninguno: {kind:'a-convenir'}.
 *     presupuesto siempre undefined.
 */
export function construirPayloadCrear(
    d: ComposerServiciosDraft,
): Record<string, unknown> {
    const esSolicito = d.modo === 'solicito';
    const min = parseEntero(d.budgetMin);
    const max = parseEntero(d.budgetMax);

    let precio: PrecioServicio;
    let presupuesto: { min: number; max: number } | undefined;

    if (esSolicito) {
        precio = { kind: 'a-convenir' };
        presupuesto =
            min !== null && max !== null ? { min, max } : undefined;
    } else {
        if (min !== null && max !== null) {
            precio =
                min === max
                    ? { kind: 'fijo', monto: min, moneda: 'MXN' }
                    : { kind: 'rango', min, max, moneda: 'MXN' };
        } else if (min !== null) {
            precio = { kind: 'fijo', monto: min, moneda: 'MXN' };
        } else if (max !== null) {
            precio = { kind: 'fijo', monto: max, moneda: 'MXN' };
        } else {
            precio = { kind: 'a-convenir' };
        }
        presupuesto = undefined;
    }

    // Descripción opcional: si está vacía, no la mandamos (backend la
    // acepta como undefined). Si el usuario escribió algo, trim + envío.
    const descripcionTrim = d.descripcion.trim();
    // Modalidad opcional: si no eligió, default 'presencial' (el backend
    // también tiene el mismo default desde Sprint 9).
    const modalidadFinal = d.modalidad ?? 'presencial';

    return {
        modo: d.modo,
        tipo: tipoPorModo(d.modo),
        subtipo: subtipoPorCategoria(d.categoria, d.modo),
        titulo: d.titulo.trim(),
        descripcion: descripcionTrim || undefined,
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        precio,
        modalidad: modalidadFinal,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonasAproximadas: d.zonasAproximadas,
        skills: [],
        requisitos: [],
        horario: undefined,
        diasSemana: [],
        presupuesto,
        categoria: esSolicito ? (d.categoria ?? undefined) : undefined,
        urgente: esSolicito ? d.urgente : false,
        confirmaciones: {
            legal: d.confirmaciones.legal,
            verdadera: d.confirmaciones.verdadera,
            coordinacion: d.confirmaciones.coordinacion,
            version: VERSION_CONFIRMACIONES_COMPOSER,
        },
    };
}

/**
 * Construye el payload para `PUT /api/servicios/publicaciones/:id`.
 * Manda solo los campos editables — modo/tipo/subtipo NO se editan, esos
 * los rechaza el backend.
 */
export function construirPayloadEditar(
    d: ComposerServiciosDraft,
): Record<string, unknown> {
    const esSolicito = d.modo === 'solicito';
    const min = parseEntero(d.budgetMin);
    const max = parseEntero(d.budgetMax);

    let precio: PrecioServicio;
    let presupuesto: { min: number; max: number } | null = null;

    if (esSolicito) {
        precio = { kind: 'a-convenir' };
        presupuesto = min !== null && max !== null ? { min, max } : null;
    } else {
        if (min !== null && max !== null) {
            precio =
                min === max
                    ? { kind: 'fijo', monto: min, moneda: 'MXN' }
                    : { kind: 'rango', min, max, moneda: 'MXN' };
        } else if (min !== null) {
            precio = { kind: 'fijo', monto: min, moneda: 'MXN' };
        } else if (max !== null) {
            precio = { kind: 'fijo', monto: max, moneda: 'MXN' };
        } else {
            precio = { kind: 'a-convenir' };
        }
    }

    const descripcionTrim = d.descripcion.trim();
    const modalidadFinal = d.modalidad ?? 'presencial';

    return {
        titulo: d.titulo.trim(),
        descripcion: descripcionTrim || undefined,
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        precio,
        modalidad: modalidadFinal,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonasAproximadas: d.zonasAproximadas,
        presupuesto,
    };
}
