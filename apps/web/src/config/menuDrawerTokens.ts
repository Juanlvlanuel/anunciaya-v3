/**
 * menuDrawerTokens.ts
 * =====================
 * Tokens compartidos entre `DrawerDesktop` y `MenuDrawer` (móvil).
 *
 * El handoff (`design_handoff_menu_drawer/README.md`) define dos paletas que
 * cambian con el modo activo: Personal (azul) y Comercial (naranja). Ambos
 * drawers leen estas paletas para aplicar el cross-fade entre modos via CSS
 * custom properties (`--paper`, `--ink`, `--accent`, `--accent-soft`, `--rule`,
 * `--muted`).
 *
 * Ubicación: apps/web/src/config/menuDrawerTokens.ts
 */

export type ModoDrawer = 'personal' | 'comercial';

export interface PaletaDrawer {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  /**
   * Fondo del accent para superficies (indicador deslizable, avatar). Puede
   * ser un color sólido o un linear-gradient. En modo comercial se usa un
   * degradado blanco → naranja para suavizar la entrada del color de marca.
   */
  accentBg: string;
  accentSoft: string;
  rule: string;
}

export const PALETAS_DRAWER: Record<ModoDrawer, PaletaDrawer> = {
  personal: {
    paper: '#F5F7FE',
    ink: '#0E1F5C',
    muted: 'rgba(14,31,92,0.55)',
    accent: '#2244C8',
    accentBg: '#2244C8',
    accentSoft: 'rgba(34,68,200,0.10)',
    rule: 'rgba(14,31,92,0.08)',
  },
  // Paleta idéntica a personal por decisión de producto: ambos modos
  // comparten la misma identidad cromática (azul). El cambio de modo se
  // percibe por el indicador deslizable, los ítems de la lista y el tab
  // activo — no por una recoloreada completa de la card.
  comercial: {
    paper: '#F5F7FE',
    ink: '#0E1F5C',
    muted: 'rgba(14,31,92,0.55)',
    accent: '#2244C8',
    accentBg: '#2244C8',
    accentSoft: 'rgba(34,68,200,0.10)',
    rule: 'rgba(14,31,92,0.08)',
  },
};

export const COLORES_SHARED_DRAWER = {
  statusOnline: '#4CC777',
  statusSuccess: '#2D9C5F',
  signoutRed: '#C53D3D',
  tabInactiveBg: 'rgba(255,255,255,0.08)',
  tabInactiveFg: 'rgba(255,255,255,0.60)',
  tabInactiveBorder: 'rgba(255,255,255,0.12)',
  tabInactiveHoverBg: 'rgba(255,255,255,0.14)',
  tabInactiveHoverFg: 'rgba(255,255,255,0.85)',
  chevronIdle: 'rgba(0,0,0,0.25)',
} as const;

/**
 * Devuelve el objeto `style` con las CSS custom properties listas para
 * aplicar al contenedor raíz del drawer. Las paletas se animan por el
 * navegador via `transition: background-color/color/border-color 280ms ease`
 * sobre los elementos que consumen las vars.
 */
export function paletaACssVars(
  paleta: PaletaDrawer,
): Record<string, string> {
  return {
    '--paper': paleta.paper,
    '--ink': paleta.ink,
    '--muted': paleta.muted,
    '--accent': paleta.accent,
    '--accent-soft': paleta.accentSoft,
    '--rule': paleta.rule,
  };
}
