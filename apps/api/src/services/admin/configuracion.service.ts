/**
 * admin/configuracion.service.ts
 * ==============================
 * Lecturas de la sección "Configuración" del Panel Admin (módulo 9). Es el "panel de control" de los
 * valores dinámicos del negocio que el SuperAdmin ajusta sin tocar código (viven en `configuracion_sistema`).
 *
 * A diferencia del helper interno `services/configuracion.service.ts` (que LEE por clave con cache para
 * el resto del backend), aquí exponemos para la UI del Panel:
 *   1. CATÁLOGO de claves editables (allow-list con su meta: etiqueta, tipo, categoría, unidad, min/max,
 *      default). En v1: trial, gracia y la escalera de comisiones.
 *   2. listarConfiguracion() — une el catálogo con los valores de BD (default si la clave no está sembrada),
 *      para pintar la pantalla aunque la migración aún no haya corrido.
 *
 * La ESCRITURA (actualizar un valor) vive en `configuracion-acciones.service.ts` (Fase 2).
 * El acceso es SOLO superadmin (la ruta va bajo el gate global de superadmin en routes/admin/index.ts).
 *
 * Ubicación: apps/api/src/services/admin/configuracion.service.ts
 */

import { inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { configuracionSistema } from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

/** Un tramo de la escalera de comisiones: # de negocios activos → monto por activo/mes. */
export interface TramoEscalera {
    min: number;            // # de activos desde (inclusive)
    max: number | null;     // hasta (inclusive); null = sin tope superior
    montoPorActivo: number; // $ por negocio activo en ese tramo
}

/** Tipos de valor soportados en la UI de Configuración (subconjunto de configuracion_sistema.tipo). */
export type TipoConfig = 'numero' | 'json';

/** Meta de una clave editable (el "catálogo"). */
interface ClaveCatalogo {
    clave: string;
    etiqueta: string;
    descripcion: string;
    tipo: TipoConfig;
    categoria: string;
    unidad: string | null;
    min: number | null;   // valor_minimo (solo para 'numero')
    max: number | null;   // valor_maximo
    porDefecto: string;   // valor default (crudo, como se guarda en BD)
}

/** Una fila editable que devuelve la pantalla (catálogo + valor actual). */
export interface ConfigFila {
    clave: string;
    etiqueta: string;
    descripcion: string;
    tipo: TipoConfig;
    categoria: string;
    unidad: string | null;
    min: number | null;
    max: number | null;
    /** Valor actual (de BD si existe; si no, el default del catálogo). Crudo (string). */
    valor: string;
    /** true si la clave ya está sembrada en BD; false si se muestra su default del catálogo. */
    sembrado: boolean;
    actualizadoEn: string | null;
}

// =============================================================================
// CATÁLOGO DE CLAVES EDITABLES (v1)
// =============================================================================

/** Escalera de comisiones por defecto (ejemplo; el super la ajusta desde la pantalla). */
export const ESCALERA_DEFAULT: TramoEscalera[] = [
    { min: 0, max: 9, montoPorActivo: 0 },
    { min: 10, max: 24, montoPorActivo: 30 },
    { min: 25, max: null, montoPorActivo: 50 },
];

/** Allow-list de lo que la pantalla puede editar en v1. Las claves se sirven en este orden. */
export const CONFIG_EDITABLE: ClaveCatalogo[] = [
    {
        clave: 'comision_escalera',
        etiqueta: 'Escalera de comisiones',
        descripcion: 'Tramos por número de negocios activos → monto fijo por activo al mes. La comisión recurrente del vendedor = # activos × monto del tramo.',
        tipo: 'json',
        categoria: 'pagos',
        unidad: null,
        min: null,
        max: null,
        porDefecto: JSON.stringify(ESCALERA_DEFAULT),
    },
    {
        clave: 'comision_alta_monto',
        etiqueta: 'Comisión de alta',
        descripcion: 'Pago único al vendedor cuando un negocio que firmó concreta su primer pago (alta vendida).',
        tipo: 'numero',
        categoria: 'pagos',
        unidad: 'MXN',
        min: 0,
        max: 10000,
        porDefecto: '400',
    },
    {
        clave: 'trial_duracion_dias',
        etiqueta: 'Duración del trial',
        descripcion: 'Días de prueba gratis de un negocio nuevo antes del primer cobro.',
        tipo: 'numero',
        categoria: 'trials',
        unidad: 'días',
        min: 0,
        max: 90,
        porDefecto: '14',
    },
    {
        clave: 'periodo_gracia_cobro_dias',
        etiqueta: 'Periodo de gracia de cobro',
        descripcion: 'Días que un negocio sigue activo tras un cobro fallido antes de suspenderse.',
        tipo: 'numero',
        categoria: 'pagos',
        unidad: 'días',
        min: 0,
        max: 60,
        porDefecto: '14',
    },
];

// =============================================================================
// LECTURA PARA LA UI
// =============================================================================

/**
 * Lista los valores editables (catálogo) con su valor actual de BD. Si una clave aún no está sembrada,
 * devuelve su default del catálogo (`sembrado=false`) para que la pantalla se pinte igual. Solo super.
 */
export async function listarConfiguracion(): Promise<ConfigFila[]> {
    const claves = CONFIG_EDITABLE.map((c) => c.clave);
    const filas = await db
        .select({
            clave: configuracionSistema.clave,
            valor: configuracionSistema.valor,
            updatedAt: configuracionSistema.updatedAt,
        })
        .from(configuracionSistema)
        .where(inArray(configuracionSistema.clave, claves));

    const porClave = new Map(filas.map((f) => [f.clave, f]));

    return CONFIG_EDITABLE.map((c) => {
        const f = porClave.get(c.clave);
        return {
            clave: c.clave,
            etiqueta: c.etiqueta,
            descripcion: c.descripcion,
            tipo: c.tipo,
            categoria: c.categoria,
            unidad: c.unidad,
            min: c.min,
            max: c.max,
            valor: f?.valor ?? c.porDefecto,
            sembrado: !!f,
            actualizadoEn: f?.updatedAt ?? null,
        };
    });
}
