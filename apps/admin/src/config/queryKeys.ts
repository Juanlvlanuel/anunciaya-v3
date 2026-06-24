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

/** Filtros que entran en la clave de la lista de usuarios. */
export interface FiltrosUsuariosKey {
  busqueda?: string;
  estado?: string;
  tipo?: string;
  ciudadId?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la lista del equipo. */
export interface FiltrosEquipoKey {
  busqueda?: string;
  rol?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la lista de vendedores. */
export interface FiltrosVendedoresKey {
  busqueda?: string;
  estado?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la cartera de un vendedor. */
export interface FiltrosCarteraKey {
  estadoPago?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la bitácora financiera (eventos de pago). */
export interface FiltrosSuscripcionesKey {
  busqueda?: string;
  tipo?: string;
  origen?: string;
  negocioId?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la lista de recibos. */
export interface FiltrosRecibosKey {
  busqueda?: string;
  negocioId?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave del catálogo de ciudades. */
export interface FiltrosCiudadesKey {
  busqueda?: string;
  regionId?: string;
  estado?: string;
  activa?: string;
}

/** Filtros que entran en la clave de la lista de publicidad. */
export interface FiltrosPublicidadKey {
  busqueda?: string;
  estado?: string;
  carrusel?: string;
  origen?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

/** Filtros que entran en la clave de la bitácora de auditoría. */
export interface FiltrosAuditoriaKey {
  actorId?: string;
  accion?: string;
  entidadTipo?: string;
  entidadId?: string;
  desde?: string;
  hasta?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

export const queryKeys = {
  resumen: {
    all: () => ['resumen'] as const,
  },
  metricas: {
    all: () => ['metricas'] as const,
    crecimiento: (periodo: string) => ['metricas', 'crecimiento', periodo] as const,
    adopcion: (periodo: string) => ['metricas', 'adopcion', periodo] as const,
    usuarios: (periodo: string) => ['metricas', 'usuarios', periodo] as const,
  },
  negocios: {
    all: () => ['negocios'] as const,
    conteo: () => ['negocios', 'conteo'] as const,
    lista: (filtros: FiltrosNegociosKey) => ['negocios', 'lista', filtros] as const,
    detalle: (id: string) => ['negocios', 'detalle', id] as const,
    vendedores: () => ['negocios', 'vendedores'] as const,
    ciudades: () => ['negocios', 'ciudades'] as const,
    catalogoCiudades: () => ['negocios', 'catalogo-ciudades'] as const,
    pagos: (id: string) => ['negocios', 'pagos', id] as const,
    sucursales: (id: string) => ['negocios', 'sucursales', id] as const,
    sucursal: (id: string, sucursalId: string) => ['negocios', 'sucursal', id, sucursalId] as const,
  },
  usuarios: {
    all: () => ['usuarios'] as const,
    conteo: () => ['usuarios', 'conteo'] as const,
    porCiudad: () => ['usuarios', 'por-ciudad'] as const,
    lista: (filtros: FiltrosUsuariosKey) => ['usuarios', 'lista', filtros] as const,
    detalle: (id: string) => ['usuarios', 'detalle', id] as const,
  },
  suscripciones: {
    all: () => ['suscripciones'] as const,
    lista: (filtros: FiltrosSuscripcionesKey) => ['suscripciones', 'lista', filtros] as const,
    detalle: (id: string) => ['suscripciones', 'detalle', id] as const,
  },
  recibos: {
    all: () => ['recibos'] as const,
    lista: (filtros: FiltrosRecibosKey) => ['recibos', 'lista', filtros] as const,
  },
  auditoria: {
    all: () => ['auditoria'] as const,
    lista: (filtros: FiltrosAuditoriaKey) => ['auditoria', 'lista', filtros] as const,
    detalle: (id: string) => ['auditoria', 'detalle', id] as const,
    actores: () => ['auditoria', 'actores'] as const,
  },
  publicidad: {
    all: () => ['publicidad'] as const,
    conteo: () => ['publicidad', 'conteo'] as const,
    kpis: () => ['publicidad', 'kpis'] as const,
    lista: (filtros: FiltrosPublicidadKey) => ['publicidad', 'lista', filtros] as const,
    detalle: (id: string) => ['publicidad', 'detalle', id] as const,
  },
  equipo: {
    all: () => ['equipo'] as const,
    conteo: () => ['equipo', 'conteo'] as const,
    lista: (filtros: FiltrosEquipoKey) => ['equipo', 'lista', filtros] as const,
    detalle: (id: string) => ['equipo', 'detalle', id] as const,
    ciudades: (regionId?: string) => ['equipo', 'ciudades', regionId ?? 'todas'] as const,
  },
  vendedores: {
    all: () => ['vendedores'] as const,
    conteo: () => ['vendedores', 'conteo'] as const,
    lista: (filtros: FiltrosVendedoresKey) => ['vendedores', 'lista', filtros] as const,
    detalle: (id: string) => ['vendedores', 'detalle', id] as const,
    cartera: (id: string, filtros: FiltrosCarteraKey) => ['vendedores', 'cartera', id, filtros] as const,
    comisiones: (id: string) => ['vendedores', 'comisiones', id] as const,
    pagos: (id: string) => ['vendedores', 'pagos', id] as const,
    datosCobro: (id: string) => ['vendedores', 'datos-cobro', id] as const,
    efectivo: (id: string) => ['vendedores', 'efectivo', id] as const,
  },
  ciudades: {
    all: () => ['ciudades'] as const,
    lista: (filtros: FiltrosCiudadesKey) => ['ciudades', 'lista', filtros] as const,
    regiones: () => ['ciudades', 'regiones'] as const,
  },
  territorios: {
    all: () => ['territorios'] as const,
    zonas: (ciudadId?: string) => ['territorios', 'zonas', ciudadId ?? 'todas'] as const,
    ciudades: () => ['territorios', 'ciudades'] as const,
    vendedores: () => ['territorios', 'vendedores'] as const,
    marcas: () => ['territorios', 'marcas'] as const,
    marcasEquipo: (ciudadId?: string) => ['territorios', 'marcas-equipo', ciudadId ?? 'todas'] as const,
    negociosMapa: (ciudadId?: string) => ['territorios', 'negocios', ciudadId ?? 'todas'] as const,
  },
  configuracion: {
    all: () => ['configuracion'] as const,
    lista: () => ['configuracion', 'lista'] as const,
  },
  regiones: {
    all: () => ['regiones'] as const,
  },
  mantenimiento: {
    all: () => ['mantenimiento'] as const,
    salud: () => ['mantenimiento', 'salud'] as const,
    logs: (nivel: string) => ['mantenimiento', 'logs', nivel] as const,
    crons: () => ['mantenimiento', 'crons'] as const,
    cronPreview: (id: string) => ['mantenimiento', 'cron-preview', id] as const,
    reconcile: () => ['mantenimiento', 'reconcile'] as const,
    reconcileLog: () => ['mantenimiento', 'reconcile-log'] as const,
  },
} as const;

export default queryKeys;
