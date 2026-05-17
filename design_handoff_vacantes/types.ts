/**
 * types.ts — Tipos compartidos del módulo Vacantes (AnunciaYA Business Studio)
 *
 * Coinciden con el schema de `servicios_publicaciones` filtrado por
 * `tipo = 'vacante-empresa'`. No mutar sin alinear con el backend.
 */

/* ============================================================
   Enums de dominio
   ============================================================ */
export type TipoEmpleo =
  | 'tiempo-completo'
  | 'medio-tiempo'
  | 'por-proyecto'
  | 'eventual';

export type Modalidad = 'presencial' | 'remoto' | 'hibrido';

export type EstadoVacante = 'activa' | 'pausada' | 'cerrada';

/** "Por expirar" NO es un estado de BD — se deriva en UI cuando
 *  `estado === 'activa' && diasParaExpirar <= 5`. */
export type EstadoVacanteUI = EstadoVacante | 'por-expirar';

export type DiaSemana =
  | 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

/* ============================================================
   Precio (discriminated union — schema fiel a BD)
   ============================================================ */
export type Precio =
  | { kind: 'mensual';    monto: number }
  | { kind: 'rango';      min: number; max: number; moneda: 'MXN' }
  | { kind: 'hora';       monto: number }
  | { kind: 'fijo';       monto: number }
  | { kind: 'a-convenir' };

/* ============================================================
   Entidades
   ============================================================ */
export interface Sucursal {
  id: string;
  nombre: string;
  esMatriz: boolean;
}

export interface Vacante {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  titulo: string;
  descripcion: string;
  tipoEmpleo: TipoEmpleo;
  modalidad: Modalidad;
  precio: Precio;
  requisitos: string[];
  beneficios: string[];
  horario?: string;
  diasSemana?: DiaSemana[];
  estado: EstadoVacante;
  totalVistas: number;
  totalMensajes: number;
  totalGuardados: number;
  /** ISO 8601 */
  expiraAt: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface KpisVacantes {
  total: number;
  activas: number;
  porExpirar: number;
  conversaciones: number;
}

/* ============================================================
   Input para crear/editar
   ============================================================ */
export interface CrearVacanteInput {
  sucursalId: string;
  titulo: string;
  descripcion: string;
  tipoEmpleo: TipoEmpleo;
  modalidad: Modalidad;
  precio: Precio;
  requisitos: string[];
  beneficios: string[];
  horario?: string;
  diasSemana?: DiaSemana[];
  confirmaciones: {
    legal: true;
    verdadera: true;
    coordinacion: true;
    version: 'v1-2026-05-17';
  };
}

/* ============================================================
   Filtros / tabs de la lista
   ============================================================ */
export type FiltroVacantes = 'todas' | 'activas' | 'pausadas' | 'cerradas';
