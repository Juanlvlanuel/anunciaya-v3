/**
 * menuPanel.ts
 * =============
 * Fuente de verdad del menú del Panel (calco de data.jsx del handoff, en español
 * y con las claves de rol del backend: superadmin / gerente / vendedor).
 *
 * - `roles`: qué roles ven el ítem.
 * - `etiquetaPorRol`: etiqueta alterna por rol (el vendedor ve "Mi cartera" / "Mis comisiones").
 * - `contadorPorRol`: contador opcional (datos DEMO hasta cablear datos reales).
 *
 * Las regiones y pendientes son DEMO (placeholders) hasta conectar datos reales.
 *
 * Ubicación: apps/admin/src/data/menuPanel.ts
 */

export type RolPanel = 'superadmin' | 'gerente' | 'vendedor';

export interface ItemMenu {
  id: string;
  etiqueta: string;
  icono: string;
  roles: RolPanel[];
  etiquetaPorRol?: Partial<Record<RolPanel, string>>;
  contadorPorRol?: Partial<Record<RolPanel, number>>;
}

export interface GrupoMenu {
  id: string;
  etiqueta: string;
  items: ItemMenu[];
}

export const GRUPOS_MENU: GrupoMenu[] = [
  {
    id: 'general',
    etiqueta: 'General',
    items: [
      { id: 'resumen', etiqueta: 'Resumen', icono: 'resumen', roles: ['superadmin', 'gerente', 'vendedor'] },
      { id: 'metricas', etiqueta: 'Métricas', icono: 'metricas', roles: ['superadmin', 'gerente', 'vendedor'] },
    ],
  },
  {
    id: 'operacion',
    etiqueta: 'Operación',
    items: [
      {
        id: 'negocios',
        etiqueta: 'Negocios',
        icono: 'negocios',
        roles: ['superadmin', 'gerente', 'vendedor'],
        etiquetaPorRol: { vendedor: 'Mi cartera' },
        contadorPorRol: { superadmin: 248, gerente: 64, vendedor: 19 },
      },
      { id: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios', roles: ['superadmin'] },
      { id: 'suscripciones', etiqueta: 'Suscripciones', icono: 'suscripciones', roles: ['superadmin', 'gerente'] },
    ],
  },
  {
    id: 'ventas',
    etiqueta: 'Red de ventas',
    items: [
      {
        id: 'comisiones',
        etiqueta: 'Vendedores y comisiones',
        icono: 'comisiones',
        roles: ['superadmin', 'gerente', 'vendedor'],
        etiquetaPorRol: { vendedor: 'Mis comisiones' },
      },
    ],
  },
  {
    id: 'crecimiento',
    etiqueta: 'Crecimiento',
    items: [
      { id: 'publicidad', etiqueta: 'Publicidad', icono: 'publicidad', roles: ['superadmin', 'gerente'] },
      { id: 'ciudades', etiqueta: 'Ciudades', icono: 'ciudades', roles: ['superadmin'] },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Administración',
    items: [
      { id: 'configuracion', etiqueta: 'Configuración', icono: 'configuracion', roles: ['superadmin'] },
      { id: 'equipo', etiqueta: 'Equipo y accesos', icono: 'equipo', roles: ['superadmin', 'gerente'] },
      { id: 'sistema', etiqueta: 'Sistema', icono: 'sistema', roles: ['superadmin'] },
    ],
  },
];

/** Etiquetas cortas para la barra inferior móvil. */
export const ETIQUETAS_CORTAS: Record<string, string> = {
  resumen: 'Resumen',
  metricas: 'Métricas',
  negocios: 'Cartera',
  comisiones: 'Comisiones',
  usuarios: 'Usuarios',
  suscripciones: 'Subs',
  publicidad: 'Ads',
  ciudades: 'Ciudades',
};

/** Devuelve los grupos visibles para un rol (oculta grupos sin ítems). */
export function gruposParaRol(rol: RolPanel): GrupoMenu[] {
  return GRUPOS_MENU.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.roles.includes(rol)),
  })).filter((g) => g.items.length > 0);
}

/** Lista plana de ítems visibles para un rol. */
export function itemsParaRol(rol: RolPanel): ItemMenu[] {
  return gruposParaRol(rol).flatMap((g) => g.items);
}

/** Etiqueta de un ítem según el rol (respeta etiquetaPorRol). */
export function etiquetaDe(item: ItemMenu, rol: RolPanel): string {
  return item.etiquetaPorRol?.[rol] ?? item.etiqueta;
}

// =============================================================================
// DATOS DEMO (placeholders hasta cablear datos reales)
// =============================================================================

export interface ItemPendiente {
  titulo: string;
  subtitulo: string;
  icono: string;
}

export interface PendientesRol {
  contador: number;
  items: ItemPendiente[];
}

export const PENDIENTES_DEMO: Record<RolPanel, PendientesRol> = {
  superadmin: {
    contador: 32,
    items: [
      { titulo: 'Efectivo por confirmar', subtitulo: '12 vendedores · $164,300 MXN', icono: 'comisiones' },
      { titulo: 'Negocios en gracia', subtitulo: '18 negocios por suspenderse', icono: 'negocios' },
      { titulo: 'Vendedores con faltante', subtitulo: '2 vendedores · $7,400 MXN', icono: 'usuarios' },
    ],
  },
  gerente: {
    contador: 9,
    items: [
      { titulo: 'Efectivo por confirmar', subtitulo: '3 vendedores · $28,600 MXN', icono: 'comisiones' },
      { titulo: 'Negocios en gracia', subtitulo: '5 negocios por suspenderse', icono: 'negocios' },
      { titulo: 'Vendedores con faltante', subtitulo: '1 vendedor · $3,200 MXN', icono: 'usuarios' },
    ],
  },
  vendedor: {
    contador: 2,
    items: [
      { titulo: 'Efectivo por entregar', subtitulo: '$3,200 MXN cobrados hoy', icono: 'comisiones' },
      { titulo: 'Negocio en gracia', subtitulo: '1 de tu cartera por suspenderse', icono: 'negocios' },
    ],
  },
};
