/**
 * queryKeys.ts
 * =============
 * Claves centralizadas de React Query para el Panel Admin (espejo del patrón de
 * apps/web). Una sola fuente para construir e invalidar queries.
 *
 * Ubicación: apps/admin/src/config/queryKeys.ts
 */

/** Filtros que entran en la clave de la lista de negocios. */
export interface FiltrosNegociosKey {
  busqueda?: string;
  estadoPago?: string;
  vendedorId?: string;
  ciudad?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

export const queryKeys = {
  negocios: {
    all: () => ['negocios'] as const,
    lista: (filtros: FiltrosNegociosKey) => ['negocios', 'lista', filtros] as const,
    detalle: (id: string) => ['negocios', 'detalle', id] as const,
    vendedores: () => ['negocios', 'vendedores'] as const,
    ciudades: () => ['negocios', 'ciudades'] as const,
  },
} as const;

export default queryKeys;
