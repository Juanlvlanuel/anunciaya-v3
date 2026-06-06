/**
 * Merge this snippet into your tailwind.config.ts under `theme.extend`.
 * It's purely additive — your existing tokens are preserved.
 */
import type { Config } from 'tailwindcss';

const serviciosTheme: Config['theme'] = {
  extend: {
    fontFamily: {
      // Add Inter as primary sans
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ],
    },
    backgroundImage: {
      // Header dark
      'ay-grid':
        'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
      'ay-glow':
        'radial-gradient(900px 220px at 95% -20%, rgba(2,132,199,0.22) 0%, rgba(2,132,199,0.07) 35%, transparent 70%)',
      'ay-glow-sm':
        'radial-gradient(400px 140px at 88% -10%, rgba(2,132,199,0.28) 0%, rgba(2,132,199,0.07) 45%, transparent 75%)',
      // Placeholder stripes for missing photos
      'stripe':
        'repeating-linear-gradient(135deg, #f1f5f9 0, #f1f5f9 14px, #e2e8f0 14px, #e2e8f0 16px)',
      // CTA gradient
      'cta-sky': 'linear-gradient(180deg, #0ea5e9 0%, #0369a1 100%)',
    },
    backgroundSize: {
      'ay-grid': '32px 32px',
    },
    boxShadow: {
      'cta-sky':
        '0 4px 6px -1px rgb(14 165 233 / 0.30), 0 2px 4px -2px rgb(14 165 233 / 0.30)',
      'fab-sky':
        '0 6px 10px -2px rgb(14 165 233 / 0.40), 0 3px 6px -3px rgb(14 165 233 / 0.40)',
    },
    screens: {
      // The brief specifies only TWO breakpoints
      lg: '1024px',
      '2xl': '1536px',
    },
  },
};

export default serviciosTheme;
