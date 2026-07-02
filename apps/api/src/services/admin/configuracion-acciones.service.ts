/**
 * admin/configuracion-acciones.service.ts
 * ========================================
 * Acciones de ESCRITURA del módulo "Configuración" del Panel (Fase 2). El "tablero económico":
 * el SuperAdmin ajusta las palancas del modelo de negocio (escalera de comisiones, trial, gracia)
 * sin tocar código.
 *
 *   - actualizarConfig(clave, valor) — valida contra el catálogo (rango para números, forma de tramos
 *     para la escalera), hace UPSERT en `configuracion_sistema`, resetea la caché del helper interno
 *     (para que el resto del backend lea el valor nuevo de inmediato) y registra en admin_auditoria.
 *
 * Solo superadmin (la ruta va bajo el gate global de superadmin en routes/admin/index.ts).
 * La LECTURA (catálogo + listar) vive en `configuracion.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/configuracion-acciones.service.ts
 */

import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { configuracionSistema } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { resetearCacheConfig } from '../configuracion.service.js';
import { CONFIG_EDITABLE, type TramoEscalera, type TramoCiudades, type TramoPeriodo } from './configuracion.service.js';

export type ResultadoAccionConfig =
    | { ok: true; clave: string; etiqueta: string; valor: string }
    | { ok: false; status: number; mensaje: string };

type Validacion = { ok: true; valor: string } | { ok: false; mensaje: string };

// =============================================================================
// VALIDACIÓN POR TIPO
// =============================================================================

/** Valida un número entero (los valores numéricos de v1 son días) dentro del rango del catálogo. */
export function validarNumero(min: number | null, max: number | null, crudo: string): Validacion {
    const texto = String(crudo).trim();
    if (texto === '') return { ok: false, mensaje: 'El valor es obligatorio.' };
    const n = Number(texto); // ojo: Number('') === 0, por eso se descarta el vacío antes
    if (!Number.isFinite(n)) return { ok: false, mensaje: 'El valor debe ser un número.' };
    if (!Number.isInteger(n)) return { ok: false, mensaje: 'El valor debe ser un número entero de días.' };
    if (min !== null && n < min) return { ok: false, mensaje: `El valor no puede ser menor que ${min}.` };
    if (max !== null && n > max) return { ok: false, mensaje: `El valor no puede ser mayor que ${max}.` };
    return { ok: true, valor: String(n) };
}

/** Valida un texto libre (ej. teléfono de contacto): no vacío, sin exceder la longitud máxima del catálogo
 *  (max = # de caracteres para el tipo 'texto'). Recorta espacios de sobra. El front normaliza el uso. */
export function validarTexto(max: number | null, crudo: string): Validacion {
    const texto = String(crudo).trim();
    if (texto === '') return { ok: false, mensaje: 'El valor es obligatorio.' };
    if (max !== null && texto.length > max) return { ok: false, mensaje: `El valor no puede tener más de ${max} caracteres.` };
    return { ok: true, valor: texto };
}

/**
 * Valida la escalera de comisiones. Debe cubrir de 0 negocios en adelante SIN huecos ni solapes, para que
 * el cálculo de comisiones (Vendedores) siempre encuentre el tramo de cualquier número de activos:
 *   - al menos un tramo; el primero arranca en 0;
 *   - cada tramo: min entero ≥ 0, monto ≥ 0; el tope (max) es entero ≥ min, o vacío en el último;
 *   - cada tramo empieza justo donde terminó el anterior (min = max_anterior + 1);
 *   - solo el último tramo queda sin tope (max = null).
 * Reserializa la salida para guardar limpio (sin campos extra).
 */
export function validarEscalera(crudo: string): Validacion {
    let datos: unknown;
    try {
        datos = JSON.parse(crudo);
    } catch {
        return { ok: false, mensaje: 'La escalera no tiene un formato válido.' };
    }
    if (!Array.isArray(datos) || datos.length === 0) {
        return { ok: false, mensaje: 'La escalera debe tener al menos un tramo.' };
    }

    const tramos: TramoEscalera[] = [];
    for (const t of datos) {
        if (typeof t !== 'object' || t === null) {
            return { ok: false, mensaje: 'Cada tramo debe tener mínimo, tope y monto.' };
        }
        const min = (t as Record<string, unknown>).min;
        const max = (t as Record<string, unknown>).max;
        const monto = (t as Record<string, unknown>).montoPorActivo;
        if (!Number.isInteger(min) || (min as number) < 0) {
            return { ok: false, mensaje: 'El mínimo de cada tramo debe ser un entero ≥ 0.' };
        }
        if (max !== null && (!Number.isInteger(max) || (max as number) < (min as number))) {
            return { ok: false, mensaje: 'El tope de cada tramo debe ser un entero ≥ su mínimo (o vacío para "sin tope").' };
        }
        if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 0) {
            return { ok: false, mensaje: 'El monto por activo debe ser un número ≥ 0.' };
        }
        tramos.push({ min: min as number, max: max as number | null, montoPorActivo: monto });
    }

    if (tramos[0].min !== 0) {
        return { ok: false, mensaje: 'El primer tramo debe empezar en 0 negocios.' };
    }
    for (let i = 0; i < tramos.length; i++) {
        const esUltimo = i === tramos.length - 1;
        if (esUltimo) {
            if (tramos[i].max !== null) {
                return { ok: false, mensaje: 'El último tramo debe quedar sin tope (cubre de su mínimo en adelante).' };
            }
        } else {
            if (tramos[i].max === null) {
                return { ok: false, mensaje: 'Solo el último tramo puede quedar sin tope.' };
            }
            if (tramos[i + 1].min !== (tramos[i].max as number) + 1) {
                return { ok: false, mensaje: 'Los tramos no pueden dejar huecos ni encimarse: cada uno empieza justo donde termina el anterior.' };
            }
        }
    }

    return { ok: true, valor: JSON.stringify(tramos) };
}

/**
 * Valida el multiplicador por #ciudades de Publicidad. A diferencia de la escalera de comisiones,
 * empieza en 1 ciudad (no en 0) y su valor es un `factor` (multiplicador), no un monto. Reglas:
 *   - al menos un tramo; el primero arranca en 1;
 *   - cada tramo: min entero ≥ 1, factor ≥ 0; tope (max) entero ≥ min, o vacío en el último;
 *   - sin huecos ni solapes (min = max_anterior + 1); solo el último queda sin tope.
 */
export function validarTramosCiudades(crudo: string): Validacion {
    let datos: unknown;
    try {
        datos = JSON.parse(crudo);
    } catch {
        return { ok: false, mensaje: 'Los tramos no tienen un formato válido.' };
    }
    if (!Array.isArray(datos) || datos.length === 0) {
        return { ok: false, mensaje: 'Debe haber al menos un tramo.' };
    }

    const tramos: TramoCiudades[] = [];
    for (const t of datos) {
        if (typeof t !== 'object' || t === null) {
            return { ok: false, mensaje: 'Cada tramo debe tener desde, hasta y factor.' };
        }
        const min = (t as Record<string, unknown>).min;
        const max = (t as Record<string, unknown>).max;
        const factor = (t as Record<string, unknown>).factor;
        if (!Number.isInteger(min) || (min as number) < 1) {
            return { ok: false, mensaje: 'El "desde" de cada tramo debe ser un entero ≥ 1.' };
        }
        if (max !== null && (!Number.isInteger(max) || (max as number) < (min as number))) {
            return { ok: false, mensaje: 'El "hasta" debe ser un entero ≥ su "desde" (o vacío para "sin tope").' };
        }
        if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0) {
            return { ok: false, mensaje: 'El factor debe ser un número ≥ 0.' };
        }
        tramos.push({ min: min as number, max: max as number | null, factor });
    }

    if (tramos[0].min !== 1) {
        return { ok: false, mensaje: 'El primer tramo debe empezar en 1 ciudad.' };
    }
    for (let i = 0; i < tramos.length; i++) {
        const esUltimo = i === tramos.length - 1;
        if (esUltimo) {
            if (tramos[i].max !== null) {
                return { ok: false, mensaje: 'El último tramo debe quedar sin tope (cubre de su mínimo en adelante).' };
            }
        } else {
            if (tramos[i].max === null) {
                return { ok: false, mensaje: 'Solo el último tramo puede quedar sin tope.' };
            }
            if (tramos[i + 1].min !== (tramos[i].max as number) + 1) {
                return { ok: false, mensaje: 'Los tramos no pueden dejar huecos ni encimarse: cada uno empieza justo donde termina el anterior.' };
            }
        }
    }

    return { ok: true, valor: JSON.stringify(tramos) };
}

/**
 * Valida los periodos pagables por adelantado de Publicidad: cada opción es { meses ≥ 1, descuento 0–90 },
 * sin meses repetidos, y debe existir la opción de 1 mes (la base sin descuento). Se reordena por meses.
 */
export function validarPeriodos(crudo: string): Validacion {
    let datos: unknown;
    try {
        datos = JSON.parse(crudo);
    } catch {
        return { ok: false, mensaje: 'Los periodos no tienen un formato válido.' };
    }
    if (!Array.isArray(datos) || datos.length === 0) {
        return { ok: false, mensaje: 'Debe haber al menos un periodo.' };
    }

    const periodos: TramoPeriodo[] = [];
    const vistos = new Set<number>();
    for (const t of datos) {
        if (typeof t !== 'object' || t === null) {
            return { ok: false, mensaje: 'Cada periodo debe tener meses y descuento.' };
        }
        const meses = (t as Record<string, unknown>).meses;
        const descuento = (t as Record<string, unknown>).descuento;
        if (!Number.isInteger(meses) || (meses as number) < 1) {
            return { ok: false, mensaje: 'Los meses deben ser un entero ≥ 1.' };
        }
        if (vistos.has(meses as number)) {
            return { ok: false, mensaje: 'No repitas el mismo número de meses.' };
        }
        vistos.add(meses as number);
        if (typeof descuento !== 'number' || !Number.isFinite(descuento) || descuento < 0 || descuento > 90) {
            return { ok: false, mensaje: 'El descuento de cada periodo debe estar entre 0 y 90%.' };
        }
        periodos.push({ meses: meses as number, descuento });
    }

    periodos.sort((a, b) => a.meses - b.meses);
    if (periodos[0].meses !== 1) {
        return { ok: false, mensaje: 'Debe existir la opción de 1 mes (la base, normalmente sin descuento).' };
    }

    return { ok: true, valor: JSON.stringify(periodos) };
}

// =============================================================================
// ACTUALIZAR UN VALOR
// =============================================================================

export async function actualizarConfig(
    panel: UsuarioPanel,
    clave: string,
    valorCrudo: unknown,
): Promise<ResultadoAccionConfig> {
    const cat = CONFIG_EDITABLE.find((c) => c.clave === clave);
    if (!cat) return { ok: false, status: 404, mensaje: 'Ese valor no es configurable.' };
    if (typeof valorCrudo !== 'string') {
        return { ok: false, status: 400, mensaje: 'Falta el valor a guardar.' };
    }

    // Valor anterior (para la auditoría): el que se mostraría hoy (BD si existe; si no, el default del catálogo).
    const [prev] = await db
        .select({ valor: configuracionSistema.valor })
        .from(configuracionSistema)
        .where(eq(configuracionSistema.clave, clave))
        .limit(1);
    const valorPrevio = prev?.valor ?? cat.porDefecto;

    // Validación según el tipo declarado en el catálogo.
    const v =
        cat.tipo === 'numero' ? validarNumero(cat.min, cat.max, valorCrudo)
        : cat.tipo === 'texto' ? validarTexto(cat.max, valorCrudo)
        : cat.tipo === 'tramos_ciudades' ? validarTramosCiudades(valorCrudo)
        : cat.tipo === 'periodos_meses' ? validarPeriodos(valorCrudo)
        : validarEscalera(valorCrudo);
    if (!v.ok) return { ok: false, status: 400, mensaje: v.mensaje };
    const valorNuevo = v.valor;

    // Nada que hacer si no cambió (evita escritura y entrada de auditoría redundantes).
    if (valorNuevo === valorPrevio) {
        return { ok: true, clave, etiqueta: cat.etiqueta, valor: valorNuevo };
    }

    // UPSERT: inserta con la metadata del catálogo si la clave aún no estaba sembrada; si ya existe, solo
    // actualiza el valor + auditoría de quién/cuándo.
    const ahora = new Date().toISOString();
    await db
        .insert(configuracionSistema)
        .values({
            clave: cat.clave,
            valor: valorNuevo,
            tipo: cat.tipo,
            descripcion: cat.descripcion,
            categoria: cat.categoria,
            unidad: cat.unidad,
            valorMinimo: cat.min !== null ? String(cat.min) : null,
            valorMaximo: cat.max !== null ? String(cat.max) : null,
            actualizadoPor: panel.usuarioId,
            updatedAt: ahora,
        })
        .onConflictDoUpdate({
            target: configuracionSistema.clave,
            set: { valor: valorNuevo, actualizadoPor: panel.usuarioId, updatedAt: ahora },
        });

    // El helper interno cachea 5 min; al limpiar, el resto del backend (cobros, gracia, etc.) lee el valor nuevo ya.
    resetearCacheConfig();

    // Auditoría: entidad_id es uuid → la clave va en los snapshots, no en entidad_id.
    await registrarAuditoria(panel, {
        accion: 'config_actualizar',
        entidadTipo: 'configuracion',
        entidadId: null,
        datosPrevios: { clave, valor: valorPrevio },
        datosNuevos: { clave, valor: valorNuevo },
        motivo: null,
    });

    return { ok: true, clave, etiqueta: cat.etiqueta, valor: valorNuevo };
}
