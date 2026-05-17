/**
 * queryKeys.ts
 * =============
 * Catálogo centralizado de query keys para React Query.
 * Cada módulo define sus keys aquí para evitar colisiones
 * y facilitar invalidaciones granulares.
 *
 * CONVENCIÓN:
 *   - all()          → invalida TODO el módulo
 *   - lista(...)     → invalida la lista paginada
 *   - detalle(id)    → invalida un registro específico
 *   - kpis(...)      → invalida métricas del módulo
 *
 * Ubicación: apps/web/src/config/queryKeys.ts
 */

export const queryKeys = {

  // ─── Business Studio — Dashboard ──────────────────────────────────────────
  dashboard: {
    all: () => ['dashboard'] as const,
    kpis: (sucursalId: string, periodo: string) =>
      ['dashboard', 'kpis', sucursalId, periodo] as const,
    ventas: (sucursalId: string, periodo: string) =>
      ['dashboard', 'ventas', sucursalId, periodo] as const,
    campanas: (sucursalId: string) =>
      ['dashboard', 'campanas', sucursalId] as const,
    interacciones: (sucursalId: string, periodo: string) =>
      ['dashboard', 'interacciones', sucursalId, periodo] as const,
    alertas: (sucursalId: string) =>
      ['dashboard', 'alertas', sucursalId] as const,
  },

  // ─── Business Studio — Mi Perfil ──────────────────────────────────────────
  perfil: {
    all: () => ['perfil'] as const,
    sucursal: (sucursalId: string) =>
      ['perfil', 'sucursal', sucursalId] as const,
    sucursales: (negocioId: string) =>
      ['perfil', 'sucursales', negocioId] as const,
    categorias: () => ['perfil', 'categorias'] as const,
    subcategorias: (categoriaId: number) =>
      ['perfil', 'subcategorias', categoriaId] as const,
  },

  // ─── Business Studio — Catálogo ───────────────────────────────────────────
  articulos: {
    all: () => ['articulos'] as const,
    porSucursal: (sucursalId: string) =>
      ['articulos', sucursalId] as const,
  },

  // ─── Business Studio — Promociones / Ofertas ──────────────────────────────
  ofertas: {
    all: () => ['ofertas'] as const,
    porSucursal: (sucursalId: string) =>
      ['ofertas', sucursalId] as const,
    clientesAsignados: (ofertaId: string) =>
      ['ofertas', 'clientesAsignados', ofertaId] as const,
  },

  // ─── Business Studio — Puntos ─────────────────────────────────────────────
  puntos: {
    all: () => ['puntos'] as const,
    configuracion: () => ['puntos', 'configuracion'] as const,
    recompensas: () => ['puntos', 'recompensas'] as const,
    estadisticas: (sucursalId: string, periodo: string) =>
      ['puntos', 'estadisticas', sucursalId, periodo] as const,
  },

  // ─── Business Studio — Transacciones ──────────────────────────────────────
  transacciones: {
    all: () => ['transacciones'] as const,
    kpis: (sucursalId: string, periodo: string) =>
      ['transacciones', 'kpis', sucursalId, periodo] as const,
    historial: (sucursalId: string, filtros?: Record<string, unknown>) =>
      ['transacciones', 'historial', sucursalId, filtros] as const,
    kpisCupones: (sucursalId: string, periodo: string) =>
      ['transacciones', 'kpisCupones', sucursalId, periodo] as const,
    kpisCanjes: (sucursalId: string, periodo: string) =>
      ['transacciones', 'kpisCanjes', sucursalId, periodo] as const,
    canjes: (sucursalId: string, filtros?: Record<string, unknown>) =>
      ['transacciones', 'canjes', sucursalId, filtros] as const,
    operadores: (sucursalId: string, tipo: 'ventas' | 'cupones' | 'canjes' = 'ventas') =>
      ['transacciones', 'operadores', sucursalId, tipo] as const,
  },

  // ─── Business Studio — Clientes ───────────────────────────────────────────
  clientes: {
    all: () => ['clientes'] as const,
    kpis: (sucursalId: string) =>
      ['clientes', 'kpis', sucursalId] as const,
    lista: (sucursalId: string, filtros?: Record<string, unknown>) =>
      ['clientes', 'lista', sucursalId, filtros] as const,
    // sucursalId va en el key porque el backend filtra visitas/total por
    // sucursal activa vía interceptor Axios. Sin esto, React Query sirve el
    // caché de la sucursal anterior al reabrir el modal tras switchear.
    // Para invalidar todas las sucursales de un cliente, usar el array
    // literal ['clientes', 'detalle', clienteId] (prefix matching).
    detalle: (clienteId: string, sucursalId: string) =>
      ['clientes', 'detalle', clienteId, sucursalId] as const,
    historial: (clienteId: string, sucursalId: string) =>
      ['clientes', 'historial', clienteId, sucursalId] as const,
    selector: (sucursalId: string) =>
      ['clientes', 'selector', sucursalId] as const,
  },

  // ─── Business Studio — Opiniones ──────────────────────────────────────────
  resenas: {
    all: () => ['resenas'] as const,
    lista: (sucursalId: string) =>
      ['resenas', 'lista', sucursalId] as const,
    kpis: (sucursalId: string) =>
      ['resenas', 'kpis', sucursalId] as const,
  },

  // ─── Business Studio — Alertas (módulo completo) ──────────────────────────
  alertas: {
    all: () => ['alertas'] as const,
    lista: (sucursalId: string, filtros?: Record<string, unknown>) =>
      ['alertas', 'lista', sucursalId, filtros] as const,
    kpis: (sucursalId: string) =>
      ['alertas', 'kpis', sucursalId] as const,
    configuracion: (sucursalId: string) =>
      ['alertas', 'configuracion', sucursalId] as const,
  },

  // ─── Business Studio — Empleados ──────────────────────────────────────────
  empleados: {
    all: () => ['empleados'] as const,
    kpis: (sucursalId: string) =>
      ['empleados', 'kpis', sucursalId] as const,
    lista: (sucursalId: string, filtros?: Record<string, unknown>) =>
      ['empleados', 'lista', sucursalId, filtros] as const,
    detalle: (empleadoId: string) =>
      ['empleados', 'detalle', empleadoId] as const,
  },

  // ─── Sección pública — Negocios ───────────────────────────────────────────
  negocios: {
    all: () => ['negocios'] as const,
    lista: (filtros?: Record<string, unknown>) =>
      ['negocios', 'lista', filtros] as const,
    detalle: (sucursalId: string) =>
      ['negocios', 'detalle', sucursalId] as const,
  },

  // ─── Sección pública — Feed de Ofertas ────────────────────────────────────
  // Distinto de `ofertas` (BS, CRUD por sucursal). El `nombre` permite
  // identificar bloques editoriales del feed: 'cerca', 'recientes',
  // 'populares', 'vencen_pronto', etc.
  ofertasFeed: {
    all: () => ['ofertasFeed'] as const,
    bloque: (nombre: string, filtros?: Record<string, unknown>) =>
      ['ofertasFeed', nombre, filtros] as const,
    sugerencias: (query: string, ciudad: string) =>
      ['ofertasFeed', 'sugerencias', query, ciudad] as const,
  },

  // ─── CardYA ───────────────────────────────────────────────────────────────
  cardya: {
    all: () => ['cardya'] as const,
    billeteras: (usuarioId: string) =>
      ['cardya', 'billeteras', usuarioId] as const,
    movimientos: (negocioId: string, filtros?: Record<string, unknown>) =>
      ['cardya', 'movimientos', negocioId, filtros] as const,
  },

  // ─── Business Studio — Reportes ────────────────────────────────────────────
  reportes: {
    all: () => ['reportes'] as const,
    tab: (sucursalId: string, tab: string, periodo: string) =>
      ['reportes', tab, sucursalId, periodo] as const,
  },

  // ─── Mis Cupones ──────────────────────────────────────────────────────────
  cupones: {
    all: () => ['cupones'] as const,
    lista: (usuarioId: string) =>
      ['cupones', 'lista', usuarioId] as const,
  },

  // ─── Sección pública — MarketPlace ────────────────────────────────────────
  // Compra-venta P2P de objetos físicos. El feed (recientes + cercanos) se
  // sirve desde un único endpoint, así que `feed` recibe los 3 filtros como
  // parte del key. Detalle individual y mis-articulos se sumarán en sprints
  // siguientes.
  marketplace: {
    all: () => ['marketplace'] as const,
    feed: (filtros: { ciudad: string; lat: number; lng: number }) =>
      ['marketplace', 'feed', filtros] as const,
    feedInfinito: (filtros: {
      ciudad: string;
      lat: number;
      lng: number;
      orden: 'recientes' | 'vistos' | 'cerca';
      precioMin?: number;
      precioMax?: number;
    }) => ['marketplace', 'feed-infinito', filtros] as const,
    articulo: (articuloId: string) =>
      ['marketplace', 'articulo', articuloId] as const,
    vendedor: (usuarioId: string) =>
      ['marketplace', 'vendedor', usuarioId] as const,
    vendedorPublicaciones: (
      usuarioId: string,
      estado: 'activa' | 'vendida',
      paginacion: { limit: number; offset: number }
    ) =>
      ['marketplace', 'vendedor', usuarioId, 'publicaciones', estado, paginacion] as const,
    /**
     * Mis publicaciones — listado paginado del dueño filtrado por estado.
     * `estado=undefined` significa "todos los no-eliminados". El sufijo
     * 'todos' en la key evita colisión con queries por estado específico.
     */
    misArticulos: (
      estado: 'activa' | 'pausada' | 'vendida' | undefined,
      paginacion: { limit: number; offset: number }
    ) =>
      ['marketplace', 'mis-articulos', estado ?? 'todos', paginacion] as const,
    sugerencias: (q: string, ciudad: string) =>
      ['marketplace', 'buscar', 'sugerencias', q, ciudad] as const,
    populares: (ciudad: string) =>
      ['marketplace', 'buscar', 'populares', ciudad] as const,
    preguntas: (articuloId: string) =>
      ['marketplace', 'preguntas', articuloId] as const,
  },

  // ─── Sección pública — Servicios ──────────────────────────────────────────
  // Sprint 1 backend + Sprint 2 frontend (May 2026). Mismo patrón que
  // `marketplace`. El feed sirve `{ recientes, cercanos }` desde un único
  // endpoint, con filtro opcional por `modo` (ofrezco/solicito).
  servicios: {
    all: () => ['servicios'] as const,
    feed: (filtros: {
      ciudad: string;
      lat: number;
      lng: number;
      modo?: 'ofrezco' | 'solicito';
    }) => ['servicios', 'feed', filtros] as const,
    feedInfinito: (filtros: {
      ciudad: string;
      lat: number;
      lng: number;
      modo?: 'ofrezco' | 'solicito';
      tipo?: 'servicio-persona' | 'vacante-empresa' | 'solicito';
      modalidad?: 'presencial' | 'remoto' | 'hibrido';
      orden: 'recientes' | 'cerca';
    }) => ['servicios', 'feed-infinito', filtros] as const,
    publicacion: (publicacionId: string) =>
      ['servicios', 'publicacion', publicacionId] as const,
    prestador: (usuarioId: string) =>
      ['servicios', 'prestador', usuarioId] as const,
    prestadorPublicaciones: (
      usuarioId: string,
      estado: 'activa' | 'pausada' = 'activa',
    ) =>
      ['servicios', 'prestador', usuarioId, 'publicaciones', estado] as const,
    prestadorResenas: (usuarioId: string) =>
      ['servicios', 'prestador', usuarioId, 'resenas'] as const,
    misPublicaciones: (
      estado: 'activa' | 'pausada' | undefined,
      paginacion: { limit: number; offset: number }
    ) =>
      ['servicios', 'mis-publicaciones', estado ?? 'todos', paginacion] as const,
    preguntas: (publicacionId: string) =>
      ['servicios', 'preguntas', publicacionId] as const,
    sugerencias: (q: string, ciudad: string) =>
      ['servicios', 'buscar', 'sugerencias', q, ciudad] as const,
  },

  // ─── Business Studio — Sucursales ────────────────────────────────────────
  sucursales: {
    all: () => ['sucursales'] as const,
    kpis: (negocioId: string) =>
      ['sucursales', 'kpis', negocioId] as const,
    lista: (negocioId: string, filtros?: Record<string, unknown>) =>
      ['sucursales', 'lista', negocioId, filtros] as const,
    detalle: (sucursalId: string) =>
      ['sucursales', 'detalle', sucursalId] as const,
    gerente: (sucursalId: string) =>
      ['sucursales', 'gerente', sucursalId] as const,
  },

} as const;
