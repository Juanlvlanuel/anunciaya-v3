/**
 * helpers.ts — funciones puras para formato y derivación de estado.
 * Sin dependencias de React, listas para reuso en SSR / tests.
 */

import type {
  Precio,
  Vacante,
  EstadoVacanteUI,
  DiaSemana,
  TipoEmpleo,
  Modalidad,
} from './types';

/* ============================================================
   Labels
   ============================================================ */
export const TIPO_EMPLEO_LABEL: Record<TipoEmpleo, string> = {
  'tiempo-completo': 'Tiempo completo',
  'medio-tiempo':    'Medio tiempo',
  'por-proyecto':    'Por proyecto',
  'eventual':        'Eventual',
};

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  presencial: 'Presencial',
  remoto:     'Remoto',
  hibrido:    'Híbrido',
};

export const ESTADO_LABEL: Record<EstadoVacanteUI, string> = {
  activa:        'Activa',
  pausada:       'Pausada',
  cerrada:       'Cerrada',
  'por-expirar': 'Por expirar',
};

export const DIA_CORTO: Record<DiaSemana, string> = {
  lun: 'L', mar: 'M', mie: 'X', jue: 'J', vie: 'V', sab: 'S', dom: 'D',
};

export const DIA_FULL: Record<DiaSemana, string> = {
  lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue',
  vie: 'Vie', sab: 'Sáb', dom: 'Dom',
};

export const DIAS_ORDEN: DiaSemana[] = [
  'lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom',
];

/* ============================================================
   Precio
   ============================================================ */
function fmtMonto(n: number): string {
  return '$' + n.toLocaleString('es-MX');
}

export interface PrecioFormateado {
  main: string;
  unit: string;
}

/**
 * Formatea un precio para mostrar en lista/detalle.
 * Cuando `kind === 'fijo'` + `tipoEmpleo === 'por-proyecto'` se usa
 * el texto editorial "por entrega" (caso típico: repartidor por entrega).
 */
export function formatPrecio(p: Precio, tipoEmpleo?: TipoEmpleo): PrecioFormateado {
  switch (p.kind) {
    case 'mensual':
      return { main: fmtMonto(p.monto), unit: '/mes' };
    case 'rango':
      return { main: `${fmtMonto(p.min)}–${fmtMonto(p.max)}`, unit: '/mes' };
    case 'a-convenir':
      return { main: 'A convenir', unit: '' };
    case 'hora':
      return { main: fmtMonto(p.monto), unit: '/hora' };
    case 'fijo': {
      const unit = tipoEmpleo === 'por-proyecto' ? 'por entrega' : 'por proyecto';
      return { main: fmtMonto(p.monto), unit };
    }
  }
}

/* ============================================================
   Estado derivado en UI
   ============================================================ */
const MS_DIA = 86_400_000;

export function diasParaExpirar(expiraAtISO: string, ahora: Date = new Date()): number {
  const diff = new Date(expiraAtISO).getTime() - ahora.getTime();
  return Math.max(0, Math.ceil(diff / MS_DIA));
}

/**
 * Calcula el estado a mostrar en UI:
 *  - 'por-expirar' si está activa y le quedan ≤ 5 días.
 *  - Si no, el `estado` tal cual.
 */
export function uiEstado(v: Vacante, ahora: Date = new Date()): EstadoVacanteUI {
  if (v.estado === 'activa' && diasParaExpirar(v.expiraAt, ahora) <= 5) {
    return 'por-expirar';
  }
  return v.estado;
}

/* ============================================================
   Días de la semana — formato natural
   ============================================================ */
const DIAS_LV: DiaSemana[] = ['lun', 'mar', 'mie', 'jue', 'vie'];

/** Devuelve "L–V" / "Todos los días" / "Lun · Mié · Vie" / null. */
export function formatDias(diasSemana?: DiaSemana[]): string | null {
  if (!diasSemana || diasSemana.length === 0) return null;
  if (diasSemana.length === 7) return 'Todos los días';
  if (diasSemana.length === 5 && DIAS_LV.every((d) => diasSemana.includes(d))) {
    return 'L–V';
  }
  return DIAS_ORDEN
    .filter((d) => diasSemana.includes(d))
    .map((d) => DIA_FULL[d])
    .join(' · ');
}

/* ============================================================
   KPIs (derivar del listado completo)
   ============================================================ */
export function calcularKpis(vacantes: Vacante[]): {
  total: number;
  activas: number;
  porExpirar: number;
  conversaciones: number;
} {
  const ahora = new Date();
  return {
    total:          vacantes.length,
    activas:        vacantes.filter((v) => v.estado === 'activa').length,
    porExpirar:     vacantes.filter((v) => uiEstado(v, ahora) === 'por-expirar').length,
    conversaciones: vacantes.reduce((s, v) => s + v.totalMensajes, 0),
  };
}

/* ============================================================
   Validación (espejo de las reglas del backend)
   ============================================================ */
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

export function validarVacante(input: {
  sucursalId?: string;
  titulo: string;
  descripcion: string;
  requisitos: string[];
  beneficios: string[];
  horario?: string;
  precio: Precio;
  confirmacionesOk: boolean;
}): ErroresVacante {
  const e: ErroresVacante = {};

  if (!input.sucursalId) {
    e.sucursalId = 'Selecciona una sucursal.';
  }

  const t = input.titulo.trim();
  if (t.length < 10 || t.length > 80) {
    e.titulo = 'El puesto debe tener entre 10 y 80 caracteres.';
  }

  const d = input.descripcion.trim();
  if (d.length < 30 || d.length > 500) {
    e.descripcion = 'La descripción debe tener entre 30 y 500 caracteres.';
  }

  if (input.requisitos.length < 3) {
    e.requisitos = 'Agrega al menos 3 requisitos.';
  } else if (input.requisitos.length > 20) {
    e.requisitos = 'Máximo 20 requisitos.';
  } else if (input.requisitos.some((r) => r.length < 3 || r.length > 200)) {
    e.requisitos = 'Cada requisito debe tener entre 3 y 200 caracteres.';
  }

  if (input.beneficios.length > 8) {
    e.beneficios = 'Máximo 8 beneficios.';
  } else if (input.beneficios.some((b) => b.length < 1 || b.length > 100)) {
    e.beneficios = 'Cada beneficio debe tener entre 1 y 100 caracteres.';
  }

  if (input.horario && input.horario.length > 150) {
    e.horario = 'El horario tiene un máximo de 150 caracteres.';
  }

  const p = input.precio;
  if (p.kind === 'rango') {
    if (p.min < 0 || p.max < 0) e.precio = 'El salario no puede ser negativo.';
    else if (p.min >= p.max)    e.precio = 'El mínimo debe ser menor que el máximo.';
  } else if (p.kind !== 'a-convenir' && p.monto < 0) {
    e.precio = 'El salario no puede ser negativo.';
  }

  if (!input.confirmacionesOk) {
    e.confirmaciones = 'Confirma los tres puntos para poder publicar.';
  }

  return e;
}

export function esFormularioValido(errores: ErroresVacante): boolean {
  return Object.keys(errores).length === 0;
}
