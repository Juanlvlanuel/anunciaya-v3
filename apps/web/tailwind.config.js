/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primario: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      // ─── Sección "Servicios" (Sprint 2, 15-may-2026) ─────────────────────
      // Tokens del handoff: design_handoff_servicios/tailwind.config.snippet.ts
      // No tocan otros módulos — son utilidades aditivas.
      backgroundImage: {
        // Header dark con grid blanco 8% y glow radial sky
        'ay-grid':
          'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        'ay-glow':
          'radial-gradient(900px 220px at 95% -20%, rgba(2,132,199,0.22) 0%, rgba(2,132,199,0.07) 35%, transparent 70%)',
        'ay-glow-sm':
          'radial-gradient(400px 140px at 88% -10%, rgba(2,132,199,0.28) 0%, rgba(2,132,199,0.07) 45%, transparent 75%)',
        // Placeholder de fotos faltantes (rayas diagonal slate)
        'stripe':
          'repeating-linear-gradient(135deg, #f1f5f9 0, #f1f5f9 14px, #e2e8f0 14px, #e2e8f0 16px)',
        // CTA principal de Servicios (gradient sky-500 → sky-700)
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
    },
  },
  plugins: [],
};
