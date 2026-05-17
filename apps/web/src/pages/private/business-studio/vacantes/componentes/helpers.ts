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
    'medio-tiempo': 'Medio tiempo',
    'por-proyecto': 'Por proyecto',
    'eventual': 'Eventual',
};

export const TIPO_EMPLEO_SUBLABEL: Record<TipoEmpleo, string> = {
    'tiempo-completo': '40 hrs / sem',
    'medio-tiempo': '20 hrs / sem',
    'por-proyecto': 'Plazo definido',
    'eventual': 'Por evento o turno',
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

export const DIA_CORTO: Record<DiaSemanaCodigo, string> = {
    lun: 'L',
    mar: 'M',
    mie: 'X',
    jue: 'J',
    vie: 'V',
    sab: 'S',
    dom: 'D',
};

export const DIA_FULL: Record<DiaSemanaCodigo, string> = {
    lun: 'Lun',
    mar: 'Mar',
    mie: 'Mié',
    jue: 'Jue',
    vie: 'Vie',
    sab: 'Sáb',
    dom: 'Dom',
};

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
 *   - kind='a-convenir' → "A convenir"
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
            return 'A convenir';
    }
}

// =============================================================================
// DÍAS DE LA SEMANA — formato natural
// =============================================================================

const DIAS_LV: DiaSemanaCodigo[] = ['lun', 'mar', 'mie', 'jue', 'vie'];

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

    if (datos.requisitos.length < 3) {
        errores.requisitos = 'Agrega al menos 3 requisitos.';
    } else if (datos.requisitos.length > 20) {
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

    const precio = datos.precio;
    if (precio.kind === 'rango') {
        if (precio.min < 0 || precio.max < 0) {
            errores.precio = 'El salario no puede ser negativo.';
        } else if (precio.min >= precio.max) {
            errores.precio = 'El mínimo debe ser menor que el máximo.';
        }
    } else if (precio.kind !== 'a-convenir' && precio.monto < 0) {
        errores.precio = 'El salario no puede ser negativo.';
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
