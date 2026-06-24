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
      },
      { id: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios', roles: ['superadmin', 'gerente'] },
      { id: 'suscripciones', etiqueta: 'Suscripciones', icono: 'suscripciones', roles: ['superadmin', 'gerente'] },
      {
        id: 'recibos',
        etiqueta: 'Recibos',
        icono: 'recibos',
        roles: ['superadmin', 'gerente', 'vendedor'],
        etiquetaPorRol: { vendedor: 'Mis recibos' },
      },
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
      {
        id: 'territorios',
        etiqueta: 'Territorios',
        icono: 'territorios',
        roles: ['superadmin', 'gerente', 'vendedor'],
        etiquetaPorRol: { vendedor: 'Mi territorio' },
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
      { id: 'equipo', etiqueta: 'Equipo y accesos', icono: 'equipo', roles: ['superadmin', 'gerente'] },
      { id: 'configuracion', etiqueta: 'Configuración', icono: 'configuracion', roles: ['superadmin'] },
      { id: 'auditoria', etiqueta: 'Auditoría', icono: 'auditoria', roles: ['superadmin', 'gerente'] },
      { id: 'mantenimiento', etiqueta: 'Mantenimiento', icono: 'mantenimiento', roles: ['superadmin'] },
    ],
  },
];

/** Etiquetas cortas para la barra inferior móvil. */
export const ETIQUETAS_CORTAS: Record<string, string> = {
  resumen: 'Resumen',
  metricas: 'Métricas',
  negocios: 'Cartera',
  comisiones: 'Comisiones',
  territorios: 'Territorio',
  usuarios: 'Usuarios',
  suscripciones: 'Subs',
  recibos: 'Recibos',
  publicidad: 'Ads',
  ciudades: 'Ciudades',
  auditoria: 'Auditoría',
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
