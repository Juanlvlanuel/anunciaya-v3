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

/** Tipos de valor soportados en la UI de Configuración (subconjunto de configuracion_sistema.tipo).
 *  'json' = escalera de comisiones · 'tramos_ciudades' = multiplicador por #ciudades · 'periodos_meses' =
 *  meses pagables por adelantado + descuento, ambos de Publicidad. */
export type TipoConfig = 'numero' | 'json' | 'tramos_ciudades' | 'periodos_meses';

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

/** Un tramo del multiplicador por # de ciudades de Publicidad: a más ciudades, mayor factor. */
export interface TramoCiudades {
    min: number;        // desde N ciudades (inclusive)
    max: number | null; // hasta (inclusive); null = sin tope (solo el último tramo)
    factor: number;     // multiplicador del precio base del carrusel
}

/** Multiplicador por ciudades por defecto (el super lo ajusta desde "Publicidad" en Configuración). */
export const TRAMOS_CIUDADES_DEFAULT: TramoCiudades[] = [
    { min: 1, max: 1, factor: 1 },
    { min: 2, max: 3, factor: 1.8 },
    { min: 4, max: 6, factor: 2.5 },
    { min: 7, max: null, factor: 3 },
];

/** Una opción de meses pagables por adelantado de Publicidad (con su descuento por volumen de tiempo). */
export interface TramoPeriodo {
    meses: number;      // cuántos meses se pagan de una
    descuento: number;  // % de descuento de esa opción (0–90)
}

/** Periodos por defecto (el super los ajusta desde "Publicidad" en Configuración). */
export const PERIODOS_DEFAULT: TramoPeriodo[] = [
    { meses: 1, descuento: 0 },
    { meses: 3, descuento: 10 },
    { meses: 6, descuento: 15 },
    { meses: 12, descuento: 25 },
];

/** Allow-list de lo que la pantalla puede editar en v1. Las claves se sirven en este orden. */
export const CONFIG_EDITABLE: ClaveCatalogo[] = [
    {
        clave: 'comision_escalera',
        etiqueta: 'Escalera de comisiones',
        descripcion: 'Comisión mensual del vendedor por negocio activo, según el tramo.',
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
        descripcion: 'Pago único al vendedor cuando su negocio hace el primer pago.',
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
        descripcion: 'Días gratis de un negocio nuevo antes del primer cobro.',
        tipo: 'numero',
        categoria: 'trials',
        unidad: 'días',
        min: 0,
        max: 90,
        porDefecto: '14',
    },
    {
        clave: 'periodo_gracia_cobro_dias',
        etiqueta: 'Periodo de gracia',
        descripcion: 'Días activo tras un cobro fallido antes de suspenderse.',
        tipo: 'numero',
        categoria: 'pagos',
        unidad: 'días',
        min: 0,
        max: 60,
        porDefecto: '14',
    },
    // ─── Publicidad (módulo 7) — el super fija precios y reglas de la pauta ───────
    {
        clave: 'publicidad_precio_anuncios',
        etiqueta: 'Precio · Anuncios',
        descripcion: 'Precio base por 1 ciudad.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'MXN',
        min: 0,
        max: 100000,
        porDefecto: '300',
    },
    {
        clave: 'publicidad_precio_patrocinadores',
        etiqueta: 'Precio · Patrocinadores',
        descripcion: 'Precio base por 1 ciudad.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'MXN',
        min: 0,
        max: 100000,
        porDefecto: '800',
    },
    {
        clave: 'publicidad_precio_fundadores',
        etiqueta: 'Precio · Fundadores',
        descripcion: 'Precio base por 1 ciudad.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'MXN',
        min: 0,
        max: 100000,
        porDefecto: '500',
    },
    {
        clave: 'publicidad_tramos_ciudades',
        etiqueta: 'Multiplicador por ciudades',
        descripcion: 'El precio sube según cuántas ciudades.',
        tipo: 'tramos_ciudades',
        categoria: 'publicidad',
        unidad: null,
        min: null,
        max: null,
        porDefecto: JSON.stringify(TRAMOS_CIUDADES_DEFAULT),
    },
    {
        clave: 'publicidad_combo_descuento',
        etiqueta: 'Descuento del combo',
        descripcion: 'Al llevar los 3 carruseles juntos.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: '%',
        min: 0,
        max: 90,
        porDefecto: '15',
    },
    {
        clave: 'publicidad_limite_ciudades',
        etiqueta: 'Máximo de ciudades',
        descripcion: 'Tope por anuncio.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'ciudades',
        min: 1,
        max: 100,
        porDefecto: '10',
    },
    {
        clave: 'publicidad_duracion_dias',
        etiqueta: 'Duración del anuncio',
        descripcion: 'Desde que se publica.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'días',
        min: 1,
        max: 365,
        porDefecto: '30',
    },
    {
        clave: 'publicidad_aviso_dias',
        etiqueta: 'Aviso antes de vencer',
        descripcion: 'Correo antes de vencer.',
        tipo: 'numero',
        categoria: 'publicidad',
        unidad: 'días',
        min: 0,
        max: 30,
        porDefecto: '3',
    },
    {
        clave: 'publicidad_periodos',
        etiqueta: 'Pago por adelantado',
        descripcion: 'Meses a pagar de una y su descuento.',
        tipo: 'periodos_meses',
        categoria: 'publicidad',
        unidad: null,
        min: null,
        max: null,
        porDefecto: JSON.stringify(PERIODOS_DEFAULT),
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
