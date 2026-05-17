/**
 * Servicios · AnunciaYA — design tokens
 * Acento único: sky · Base: slate · Excepción: amber-50 solo en card "Solicito"
 */

export const colors = {
  sky: {
    50:  '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    900: '#0c4a6e',
  },
  slate: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  amber: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  emerald: {
    50:  '#ecfdf5',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

/** Gradient para CTAs y FAB */
export const gradients = {
  ctaSky: `linear-gradient(180deg, ${colors.sky[500]} 0%, ${colors.sky[700]} 100%)`,
  ctaSkyButton: 'bg-gradient-to-b from-sky-500 to-sky-700',
  toggleActive: 'bg-gradient-to-b from-sky-600 to-sky-700',
  avatarSky: 'bg-gradient-to-br from-sky-400 to-sky-700',
} as const;

/** Efectos del header dark */
export const headerEffects = {
  gridPattern: `
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
  `,
  gridSize: '32px 32px',
  glow: `radial-gradient(
    900px 220px at 95% -20%,
    rgba(2,132,199,0.22) 0%,
    rgba(2,132,199,0.07) 35%,
    transparent 70%
  )`,
  glowSmall: `radial-gradient(
    400px 140px at 88% -10%,
    rgba(2,132,199,0.28) 0%,
    rgba(2,132,199,0.07) 45%,
    transparent 75%
  )`,
} as const;

export const radii = {
  card: '1rem',       // 16px — rounded-2xl
  button: '9999px',   // pill
  input: '0.5rem',    // 8px — rounded-lg
  iconBox: '0.75rem', // 12px — rounded-xl (iconos en header)
} as const;

export const shadows = {
  card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  ctaSky: '0 4px 6px -1px rgb(14 165 233 / 0.30), 0 2px 4px -2px rgb(14 165 233 / 0.30)',
  fab: '0 6px 10px -2px rgb(14 165 233 / 0.40), 0 3px 6px -3px rgb(14 165 233 / 0.40)',
} as const;

export const spacing = {
  cardPad: { mobile: 12, desktop: 16 },      // p-3 / p-4
  gridGap: { mobile: 12, desktop: 16 },      // gap-3 / gap-4
  headerPadY: { mobile: 16, desktop: 20 },
  headerPadX: { mobile: 16, desktop: 32 },
} as const;

export const breakpoints = {
  lg: 1024,   // laptop
  xl2: 1536,  // desktop grande
} as const;

export const typography = {
  fontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  /** Título grande de pantalla */
  h1: {
    mobile: { size: 22, weight: 800, tracking: '-0.02em' },
    desktop: { size: 32, weight: 800, tracking: '-0.025em' },
  },
  /** Título de sección */
  h2: {
    mobile: { size: 17, weight: 800, tracking: '-0.015em' },
    desktop: { size: 18, weight: 800, tracking: '-0.015em' },
  },
  /** Body principal */
  body: {
    mobile: { size: 14, weight: 500, lineHeight: 1.55 },
    desktop: { size: 15, weight: 500, lineHeight: 1.6 },
  },
  /** Caption / meta */
  caption: { size: 12, weight: 600, lineHeight: 1.4 },
  /** Eyebrow uppercase */
  eyebrow: {
    size: 11, weight: 700, lineHeight: 1.4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
} as const;

/** Etiquetas de modalidad / tipo (para chips e iconos) */
export const enums = {
  modalidad: ['presencial', 'remoto', 'hibrido'] as const,
  tipo: ['servicio-persona', 'vacante-empresa', 'solicito'] as const,
  estado: ['activa', 'pausada'] as const,
  precioKind: ['fijo', 'hora', 'rango', 'mensual', 'a-convenir'] as const,
} as const;
