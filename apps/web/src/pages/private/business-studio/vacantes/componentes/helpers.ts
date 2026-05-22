/**
 * helpers.ts
 * ===========
 * Funciones puras para formato y derivación de estado del módulo Vacantes.
 * Sin dependencias de React, listas para reuso en otros componentes.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/helpers.ts
 */

import type {
    DiaSemanaCodigo,
    PrecioServicio,
    TipoEmpleo,
    ModalidadServicio,
    EstadoPublicacion,
} from '../../../../../types/servicios';

// =============================================================================
// LABELS
// =============================================================================

export const TIPO_EMPLEO_LABEL: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'Tiempo completo',
    'medio-tiempo': 'Medio turno',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Por día',
};

export const TIPO_EMPLEO_SUBLABEL: Record<TipoEmpleo, string> = {
    'tiempo-completo': '48 hrs / sem',
    'medio-tiempo': '24 hrs / sem',
    'por-proyecto': 'Plazo definido',
    'eventual': 'Pago por jornada',
};

export const MODALIDAD_LABEL: Record<ModalidadServicio, string> = {
    presencial: 'Presencial',
    remoto: 'Remoto',
    hibrido: 'Híbrido',
};

export const MODALIDAD_SUBLABEL: Record<ModalidadServicio, string> = {
    presencial: 'En la sucursal',
    remoto: 'Desde casa',
    hibrido: 'Mezcla de ambos',
};

/**
 * Etiqueta corta del día (3 letras) usada para chips visuales del
 * selector de días Y para la serialización del campo `horario`.
 *
 * Sprint 9.3: antes era 1 letra (L M X J V S D) con la convención
 * española de usar "X" para Miércoles. Se cambió a 3 letras uniforme
 * (Lun Mar Mié Jue Vie Sáb Dom) porque visualmente es más claro y
 * elimina la sorpresa del "X" para usuarios no familiarizados con
 * la convención. El parser legacy (`CODIGO_POR_LETRA` en HorarioYDias)
 * mantiene soporte para "X" y demás 1-letra para no romper vacantes
 * publicadas antes del cambio.
 */
export const DIA_CORTO: Record<DiaSemanaCodigo, string> = {
    lun: 'Lun',
    mar: 'Mar',
    mie: 'Mié',
    jue: 'Jue',
    vie: 'Vie',
    sab: 'Sáb',
    dom: 'Dom',
};

/**
 * @deprecated alias de `DIA_CORTO` (antes diferían: corto=1 letra,
 * full=3 letras). Ahora son iguales; este alias se mantiene por
 * compatibilidad con código que aún lo importa.
 */
export const DIA_FULL = DIA_CORTO;

export const DIAS_ORDEN: DiaSemanaCodigo[] = [
    'lun',
    'mar',
    'mie',
    'jue',
    'vie',
    'sab',
    'dom',
];

// =============================================================================
// ESTADO UI — derivado en cliente
// =============================================================================

/** Estado mostrado en UI: añade 'por-expirar' al set del backend. */
export type EstadoVacanteUI =
    | 'activa'
    | 'pausada'
    | 'cerrada'
    | 'por-expirar'
    | 'eliminada';

const MS_DIA = 86_400_000;

/** Días restantes hasta `expiraAt`, mínimo 0. */
export function diasRestantesVacante(
    expiraAtISO: string,
    ahora: Date = new Date(),
): number {
    const diff = new Date(expiraAtISO).getTime() - ahora.getTime();
    return Math.max(0, Math.ceil(diff / MS_DIA));
}

/**
 * Calcula el estado a mostrar en UI:
 *   - 'por-expirar' si está activa y le quedan ≤ 5 días
 *   - Si no, el `estado` tal cual
 */
export function estadoUiVacante(
    estado: EstadoPublicacion,
    expiraAt: string,
    ahora: Date = new Date(),
): EstadoVacanteUI {
    if (estado === 'activa' && diasRestantesVacante(expiraAt, ahora) <= 5) {
        return 'por-expirar';
    }
    return estado;
}

// =============================================================================
// PRECIO
// =============================================================================

function fmtMonto(n: number): string {
    return '$' + n.toLocaleString('es-MX');
}

/**
 * Formatea un salario para mostrar en lista/detalle.
 *
 *   - kind='mensual' → "$1,500/mes"
 *   - kind='rango'   → "$1,500–$3,000/mes" (con unidad según tipoEmpleo)
 *   - kind='hora'    → "$X/hora"
 *   - kind='fijo' + tipoEmpleo='por-proyecto' → "$X por entrega"
 *   - kind='a-convenir' → "Sueldo a tratar"
 *
 * Sprint 9.3: "A convenir" → "Sueldo a tratar" (mismo término que el
 * toggle del slideover y el card del feed público — coherencia entre
 * todas las superficies). Las superficies que rendericen este string
 * para `kind='a-convenir'` deberían mostrarlo como BADGE (no texto
 * plano) para diferenciarlo visualmente de los montos numéricos.
 */
export function formatearPrecioVacante(
    precio: PrecioServicio,
    tipoEmpleo: TipoEmpleo | null,
): string {
    switch (precio.kind) {
        case 'mensual':
            return `${fmtMonto(precio.monto)}/mes`;
        case 'rango': {
            const sufijo = tipoEmpleo === 'por-proyecto' ? '/proyecto' : '/mes';
            return `${fmtMonto(precio.min)}–${fmtMonto(precio.max)}${sufijo}`;
        }
        case 'hora':
            return `${fmtMonto(precio.monto)}/hora`;
        case 'fijo': {
            const sufijo =
                tipoEmpleo === 'por-proyecto' ? 'por entrega' : 'por proyecto';
            return `${fmtMonto(precio.monto)} ${sufijo}`;
        }
        case 'a-convenir':
            return 'Sueldo a tratar';
    }
}

// =============================================================================
// DÍAS DE LA SEMANA — formato natural
// =============================================================================

const DIAS_LV: DiaSemanaCodigo[] = ['lun', 'mar', 'mie', 'jue', 'vie'];

/**
 * Mapeo de token corto a nombre largo legible. Acepta TANTO el formato
 * nuevo de 3 letras (Sprint 9.3+: "Lun", "Mar", "Mié"...) COMO el
 * legacy de 1 letra ("L", "M", "X"...) para no romper vacantes
 * publicadas antes del cambio. La función `expandirHorarioEstructurado`
 * lo usa para volver el string serializado a un texto legible.
 */
const CODIGO_LARGO_POR_LETRA: Record<string, string> = {
    // Formato nuevo (3 letras) — Sprint 9.3+. Los días ya vienen en
    // la forma larga; el mapeo es identidad pero lo dejamos explícito
    // para que el parser no devuelva null al encontrar "Lun" etc.
    Lun: 'Lun',
    Mar: 'Mar',
    Mié: 'Mié',
    Jue: 'Jue',
    Vie: 'Vie',
    Sáb: 'Sáb',
    Dom: 'Dom',
    // Formato legacy (1 letra) — vacantes creadas antes de Sprint 9.3
    L: 'Lun',
    M: 'Mar',
    X: 'Mié',
    J: 'Jue',
    V: 'Vie',
    S: 'Sáb',
    D: 'Dom',
};

/**
 * Expande el string serializado del wizard de horario al formato largo legible.
 *
 *   Input (nuevo Sprint 9.3) : "Lun · Mar · Mié de 09:00 a 18:00 | Sáb de 09:00 a 14:00"
 *   Input (legacy)           : "L · M · X · J · V de 09:00 a 18:00 | S de 09:00 a 14:00"
 *   Output (ambos)           : ["Lun · Mar · Mié · Jue · Vie de 09:00 a 18:00", "Sáb de 09:00 a 14:00"]
 *
 * Si el horario no matchea el formato estructurado del wizard (texto libre
 * legacy), devuelve `null` y el caller debe usar render fallback.
 */
export function expandirHorarioEstructurado(
    horario: string,
): string[] | null {
    const bloques = horario.split('|').map((b) => b.trim()).filter(Boolean);
    if (bloques.length === 0) return null;

    const expandidos: string[] = [];
    for (const bloque of bloques) {
        const m = bloque.match(/^(.+?) de (\d{2}:\d{2}) a (\d{2}:\d{2})$/);
        if (!m) return null;
        const [, diasStr, ini, fin] = m;
        const diasLargos = diasStr
            .split('·')
            .map((s) => s.trim())
            .map((token) => CODIGO_LARGO_POR_LETRA[token] ?? token)
            .join(' · ');
        expandidos.push(`${diasLargos} de ${ini} a ${fin}`);
    }
    return expandidos;
}

/** Devuelve "L–V" / "Todos los días" / "Lun · Mié · Vie" / null. */
export function formatearDiasSemana(diasSemana?: DiaSemanaCodigo[]): string | null {
    if (!diasSemana || diasSemana.length === 0) return null;
    if (diasSemana.length === 7) return 'Todos los días';
    if (
        diasSemana.length === 5 &&
        DIAS_LV.every((d) => diasSemana.includes(d))
    ) {
        return 'L–V';
    }
    return DIAS_ORDEN
        .filter((d) => diasSemana.includes(d))
        .map((d) => DIA_FULL[d])
        .join(' · ');
}

// =============================================================================
// ETIQUETAS PÚBLICAS
// =============================================================================

export function etiquetaTipoEmpleo(tipoEmpleo: TipoEmpleo | null): string {
    if (!tipoEmpleo) return '';
    return TIPO_EMPLEO_LABEL[tipoEmpleo];
}

export function etiquetaModalidad(modalidad: ModalidadServicio): string {
    return MODALIDAD_LABEL[modalidad];
}

// =============================================================================
// VALIDACIÓN — espejo del backend
// =============================================================================

export interface ErroresVacante {
    titulo?: string;
    descripcion?: string;
    requisitos?: string;
    beneficios?: string;
    horario?: string;
    precio?: string;
    sucursalId?: string;
    confirmaciones?: string;
}

interface DatosValidacionVacante {
    sucursalId?: string;
    titulo: string;
    descripcion: string;
    requisitos: string[];
    beneficios: string[];
    horario?: string;
    precio: PrecioServicio;
    confirmacionesOk: boolean;
}

export function validarVacante(
    datos: DatosValidacionVacante,
): ErroresVacante {
    const errores: ErroresVacante = {};

    if (!datos.sucursalId) {
        errores.sucursalId = 'Selecciona una sucursal.';
    }

    const titulo = datos.titulo.trim();
    if (titulo.length < 10 || titulo.length > 80) {
        errores.titulo = 'El puesto debe tener entre 10 y 80 caracteres.';
    }

    const descripcion = datos.descripcion.trim();
    if (descripcion.length < 30 || descripcion.length > 500) {
        errores.descripcion =
            'La descripción debe tener entre 30 y 500 caracteres.';
    }

    // Requisitos opcionales — Sprint 9.3 alineó BS Vacantes con la
    // filosofía de "máxima flexibilidad al publicar" de MP/Servicios.
    // Si el negocio NO agrega requisitos, la vacante se publica sin esa
    // sección. Si agrega, se valida longitud individual y tope superior.
    if (datos.requisitos.length > 20) {
        errores.requisitos = 'Máximo 20 requisitos.';
    } else if (datos.requisitos.some((r) => r.length < 3 || r.length > 200)) {
        errores.requisitos =
            'Cada requisito debe tener entre 3 y 200 caracteres.';
    }

    if (datos.beneficios.length > 8) {
        errores.beneficios = 'Máximo 8 beneficios.';
    } else if (datos.beneficios.some((b) => b.length < 1 || b.length > 100)) {
        errores.beneficios =
            'Cada beneficio debe tener entre 1 y 100 caracteres.';
    }

    if (datos.horario && datos.horario.length > 150) {
        errores.horario = 'El horario tiene un máximo de 150 caracteres.';
    }

    // Salario opcional — Sprint 9.3 alineó BS Vacantes con la filosofía
    // de "máxima flexibilidad al publicar" de MP/Servicios. Si el rango
    // queda en 0/0 (o el monto en 0), el payload se normaliza a
    // `{kind: 'a-convenir'}` antes de enviarse al backend — ver
    // `normalizarPrecioVacanteParaPayload` en SlideoverNuevaVacante.tsx.
    // Aquí solo damos error cuando los datos son inconsistentes
    // (negativos, mínimo/máximo a medio llenar, min >= max).
    const precio = datos.precio;
    if (precio.kind === 'rango') {
        if (precio.min < 0 || precio.max < 0) {
            errores.precio = 'El salario no puede ser negativo.';
        } else if ((precio.min === 0) !== (precio.max === 0)) {
            errores.precio = 'Llena el mínimo y el máximo.';
        } else if (precio.min > 0 && precio.min >= precio.max) {
            errores.precio = 'El mínimo debe ser menor que el máximo.';
        }
    } else if (precio.kind !== 'a-convenir') {
        if (precio.monto < 0) {
            errores.precio = 'El salario no puede ser negativo.';
        }
    }

    if (!datos.confirmacionesOk) {
        errores.confirmaciones =
            'Confirma los tres puntos para poder publicar.';
    }

    return errores;
}

export function esFormularioVacanteValido(errores: ErroresVacante): boolean {
    return Object.keys(errores).length === 0;
}
