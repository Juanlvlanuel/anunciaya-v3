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

import type { CategoriaClasificado, FiltroClasificado, PrecioServicio, TipoEmpleo } from '../types/servicios';

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
// TIPO DE EMPLEO — etiquetas legibles para vacantes
// =============================================================================

const TIPO_EMPLEO_LABEL: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio turno',
    'por-proyecto': 'Por proyecto',
    eventual: 'Eventual',
};

const TIPO_EMPLEO_SUBTITULO: Record<TipoEmpleo, string> = {
    'tiempo-completo': '48 hrs / sem',
    'medio-tiempo': '24 hrs / sem',
    'por-proyecto': 'Plazo definido',
    eventual: 'Pago por evento',
};

/** Etiqueta humana del tipo de empleo (vacante-empresa). Vacío si no aplica. */
export function etiquetaTipoEmpleo(tipoEmpleo: TipoEmpleo | null | undefined): string {
    if (!tipoEmpleo) return '';
    return TIPO_EMPLEO_LABEL[tipoEmpleo] ?? '';
}

/** Subtítulo del tipo de empleo (ej: "48 hrs / sem"). */
export function subtituloTipoEmpleo(tipoEmpleo: TipoEmpleo | null | undefined): string {
    if (!tipoEmpleo) return '';
    return TIPO_EMPLEO_SUBTITULO[tipoEmpleo] ?? '';
}

// =============================================================================
// FORMATO HUMANO DE HORARIO ESTRUCTURADO
// =============================================================================

/**
 * Mapeo de token (cualquier formato) → nombre largo en español.
 *
 * Sprint 9.3: el wizard de Vacantes serializa días con 3 letras
 * (`Lun · Mar · Mié`). Antes era 1 letra (`L · M · X`). Aceptamos
 * AMBOS formatos para no romper vacantes publicadas antes del cambio.
 */
const DIA_LARGO: Record<string, string> = {
    // Formato nuevo (3 letras) — Sprint 9.3+
    Lun: 'Lunes',
    Mar: 'Martes',
    Mié: 'Miércoles',
    Jue: 'Jueves',
    Vie: 'Viernes',
    Sáb: 'Sábado',
    Dom: 'Domingo',
    // Formato legacy (1 letra)
    L: 'Lunes',
    M: 'Martes',
    X: 'Miércoles',
    J: 'Jueves',
    V: 'Viernes',
    S: 'Sábado',
    D: 'Domingo',
};

/**
 * Orden canonical de los días (3 letras — formato nuevo). Los tokens
 * legacy de 1 letra se normalizan a este orden antes de operaciones
 * de orden/agrupación.
 */
const ORDEN_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/**
 * Normaliza cualquier token de día (1 letra o 3 letras) al canonical
 * de 3 letras. Si el token no es reconocido, lo devuelve tal cual
 * (sirve como pasarela neutra).
 */
const TOKEN_A_CANONICAL: Record<string, (typeof ORDEN_DIAS)[number]> = {
    Lun: 'Lun', Mar: 'Mar', Mié: 'Mié', Jue: 'Jue',
    Vie: 'Vie', Sáb: 'Sáb', Dom: 'Dom',
    L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue',
    V: 'Vie', S: 'Sáb', D: 'Dom',
};

function normalizarDia(token: string): string {
    return TOKEN_A_CANONICAL[token] ?? token;
}

/** Convierte "09:00" → "9 a.m." / "14:30" → "2:30 p.m." */
function formatearHora12(hora24: string): string {
    const [hhStr, mmStr] = hora24.split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (Number.isNaN(hh)) return hora24;
    const periodo = hh >= 12 ? 'p.m.' : 'a.m.';
    let hora12 = hh % 12;
    if (hora12 === 0) hora12 = 12;
    if (mm === 0) return `${hora12} ${periodo}`;
    return `${hora12}:${String(mm).padStart(2, '0')} ${periodo}`;
}

/**
 * Agrupa una lista de tokens de día (en cualquier formato: 1 letra
 * "L" o 3 letras "Lun") y devuelve la etiqueta legible:
 *   ['Lun','Mar','Mié','Jue','Vie'] → "Lunes a Viernes"  (3+ consecutivos)
 *   ['Lun','Mar']                   → "Lunes y Martes"   (2 días)
 *   ['Sáb']                         → "Sábado"           (1 día)
 *   ['Lun','Mié','Vie']             → "Lunes, Miércoles, Viernes"
 *
 * Sprint 9.3: normaliza los tokens a canonical antes de ordenar para
 * soportar tanto el formato nuevo (3 letras) como el legacy (1 letra)
 * sin que se mezclen y produzcan strings corruptos.
 */
function formatearGrupoDias(diasTokens: string[]): string {
    if (diasTokens.length === 0) return '';
    const ordenados = [...diasTokens]
        .map(normalizarDia)
        .filter((d, i, arr) => arr.indexOf(d) === i) // dedupe por canonical
        .sort(
            (a, b) =>
                ORDEN_DIAS.indexOf(a as (typeof ORDEN_DIAS)[number])
                - ORDEN_DIAS.indexOf(b as (typeof ORDEN_DIAS)[number]),
        );
    if (ordenados.length === 1) return DIA_LARGO[ordenados[0]];
    if (ordenados.length === 2) {
        return `${DIA_LARGO[ordenados[0]]} y ${DIA_LARGO[ordenados[1]]}`;
    }
    const indices = ordenados.map((d) =>
        ORDEN_DIAS.indexOf(d as (typeof ORDEN_DIAS)[number]),
    );
    const sonConsecutivos = indices.every(
        (idx, i) => i === 0 || idx === indices[i - 1] + 1,
    );
    if (sonConsecutivos) {
        return `${DIA_LARGO[ordenados[0]]} a ${DIA_LARGO[ordenados[ordenados.length - 1]]}`;
    }
    return ordenados.map((d) => DIA_LARGO[d]).join(', ');
}

/**
 * Línea de horario estructurada — el caller decide el styling (típicamente
 * `dias` en bold y `horario` en peso normal).
 */
export interface LineaHorario {
    dias: string;
    /** "9 a.m. a 6 p.m." o "Cerrado". */
    horario: string;
}

/**
 * Formatea un horario estructurado del wizard en líneas legibles.
 *
 *   Input  : "L · M · X · J · V de 09:00 a 18:00 | S de 09:00 a 14:00"
 *   Output : [
 *     { dias: "Lunes a Viernes", horario: "9 a.m. a 6 p.m." },
 *     { dias: "Sábado",          horario: "9 a.m. a 2 p.m." },
 *     { dias: "Domingo",         horario: "Cerrado" },
 *   ]
 *
 * Los días que no aparecen en ningún bloque se listan como "Cerrado" al final
 * (agrupados si son consecutivos). Si el formato del horario no es el
 * estructurado del wizard (texto libre legacy), devuelve un único objeto con
 * el texto íntegro en `dias` (sin separador) para que el caller pueda
 * mostrarlo igual.
 */
export function formatearHorarioLegible(
    horario: string | null | undefined,
): LineaHorario[] {
    if (!horario) return [];
    const bloques = horario
        .split('|')
        .map((b) => b.trim())
        .filter(Boolean);
    if (bloques.length === 0) return [];

    const lineas: LineaHorario[] = [];
    const diasCubiertos = new Set<string>();

    for (const bloque of bloques) {
        const m = bloque.match(/^(.+?) de (\d{2}:\d{2}) a (\d{2}:\d{2})$/);
        if (!m) {
            // Texto libre legacy → devolver tal cual sin separador
            return [{ dias: horario, horario: '' }];
        }
        const [, diasStr, ini, fin] = m;
        const dias = diasStr
            .split('·')
            .map((s) => s.trim())
            .filter(Boolean);
        // Sprint 9.3: normalizar a canonical (3 letras "Lun"...) antes
        // de meter al Set, así el cálculo de `diasCerrados` funciona
        // correctamente tanto si el bloque vino con formato nuevo
        // como con legacy.
        dias.forEach((d) => diasCubiertos.add(normalizarDia(d)));

        const diasFmt = formatearGrupoDias(dias);
        const iniFmt = formatearHora12(ini);
        const finFmt = formatearHora12(fin);
        lineas.push({ dias: diasFmt, horario: `${iniFmt} a ${finFmt}` });
    }

    // Días cerrados — los que no están cubiertos por ningún bloque.
    // `ORDEN_DIAS` ya está en canonical y `diasCubiertos` también
    // (gracias al `normalizarDia` arriba), así que el filtrado es exacto.
    const diasCerrados = ORDEN_DIAS.filter((d) => !diasCubiertos.has(d));
    if (diasCerrados.length > 0) {
        const grupoFmt = formatearGrupoDias([...diasCerrados]);
        lineas.push({ dias: grupoFmt, horario: 'Cerrado' });
    }

    return lineas;
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
 *   - { kind: 'a-convenir' }                     → "A tratar" o "Sueldo a tratar"
 *
 * Sprint 9.3: "A convenir" → "A tratar" / "Sueldo a tratar".
 *   - Cuando el card es una VACANTE (`esVacante: true`), devuelve
 *     "Sueldo a tratar" — mismo término que el toggle del slideover
 *     de BS Vacantes, coherente para el candidato.
 *   - En cualquier otro caso (servicio Ofrezco/Solicito de persona),
 *     devuelve "A tratar" — más versátil porque no asume que el
 *     intercambio es un sueldo (puede ser precio de servicio, etc.).
 *   "A tratar" y "Sueldo a tratar" son más cálidos y de uso común
 *   en México vs el formal "A convenir".
 */
export function formatearPrecioServicio(
    precio: PrecioServicio,
    opciones?: { esVacante?: boolean },
): string {
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
            return opciones?.esVacante ? 'Sueldo a tratar' : 'A tratar';
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
