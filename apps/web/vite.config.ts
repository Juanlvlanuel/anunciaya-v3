import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import fs from 'fs';

// Sube source maps a Sentry en el build de producción (Vercel) para que los
// stack traces muestren el código original, no el minificado. Solo se activa si
// están las variables SENTRY_AUTH_TOKEN + SENTRY_ORG (en dev/local no corre).
// El plugin inyecta el `release` (commit de Vercel) y borra los .map del output
// tras subirlos, así no se sirven públicamente.
const subirSourceMapsSentry = process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: 'anunciaya-web',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
    ]
  : [];

// Estampa un ID de build en el service worker de AnunciaYA para que su contenido
// cambie en cada deploy. Así el navegador detecta un SW "nuevo" y la PWA se
// auto-actualiza con CUALQUIER cambio publicado (no solo al tocar el propio SW).
function estamparBuildIdEnSW(): Plugin {
  return {
    name: 'estampar-build-id-sw',
    apply: 'build',
    closeBundle() {
      const buildId = Date.now().toString(36);
      const swPath = path.resolve(__dirname, 'dist/sw-anunciaya.js');
      try {
        const original = fs.readFileSync(swPath, 'utf8');
        const marcado = original.replace(
          /const BUILD_ID = '[^']*';/,
          `const BUILD_ID = '${buildId}';`,
        );
        fs.writeFileSync(swPath, marcado);
        console.log(`[sw] BUILD_ID estampado: ${buildId}`);
      } catch {
        /* si dist/sw-anunciaya.js no existe, no hacer nada */
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), estamparBuildIdEnSW(), ...subirSourceMapsSentry],
  // Genera source maps solo cuando se van a subir a Sentry (el plugin los borra
  // del output tras subirlos). En dev/local no se generan.
  build: {
    sourcemap: Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true,
    allowedHosts: ['synecologic-lila-divertive.ngrok-free.dev'],  // ← Agregar esto
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});