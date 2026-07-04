export type AppAyuda = 'anunciaya' | 'scanya';
export type AudienciaAyuda = 'cliente' | 'comerciante';

export interface AyudaArticulo {
  id: string;
  categoriaId: string;
  slug: string;
  pregunta: string;
  respuesta: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  duracionSeg: number | null;
  orden: number;
  compartiblePublico: boolean;
  vistas: number;
}

export interface AyudaCategoria {
  id: string;
  nombre: string;
  icono: string | null;
  orden: number;
  articulos: AyudaArticulo[];
}

export type CentroAyuda = AyudaCategoria[];
