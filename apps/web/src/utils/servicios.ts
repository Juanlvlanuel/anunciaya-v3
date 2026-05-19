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

const DIA_LARGO: Record<string, string> = {
    L: 'Lunes',
    M: 'Martes',
    X: 'Miércoles',
    J: 'Jueves',
    V: 'Viernes',
    S: 'Sábado',
    D: 'Domingo',
};

const ORDEN_DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

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
 * Agrupa una lista de códigos de día y devuelve la etiqueta legible:
 *   ['L','M','X','J','V'] → "Lunes a Viernes"  (3+ consecutivos)
 *   ['L','M']             → "Lunes y Martes"   (2 días)
 *   ['S']                 → "Sábado"           (1 día)
 *   ['L','X','V']         → "Lunes, Miércoles, Viernes" (no consecutivos)
 */
function formatearGrupoDias(diasCortos: string[]): string {
    if (diasCortos.length === 0) return '';
    const ordenados = [...diasCortos].sort(
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
        dias.forEach((d) => diasCubiertos.add(d));

        const diasFmt = formatearGrupoDias(dias);
        const iniFmt = formatearHora12(ini);
        const finFmt = formatearHora12(fin);
        lineas.push({ dias: diasFmt, horario: `${iniFmt} a ${finFmt}` });
    }

    // Días cerrados — los que no están cubiertos por ningún bloque
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
