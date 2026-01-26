// Tipos compartidos entre frontend y backend

// Tipo base para todas las entidades
export interface EntidadBase {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

// Respuesta estándar de la API
export interface RespuestaAPI<T = unknown> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
  errores?: string[];
}

// Paginación
export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface RespuestaPaginada<T> extends RespuestaAPI<T[]> {
  paginacion: Paginacion;
}
