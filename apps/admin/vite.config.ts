import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import fs from 'fs';

// Estampa un ID de build en el service worker del Panel para que su contenido
// cambie en cada deploy. Así el navegador detecta un SW "nuevo" y la PWA se
// auto-actualiza con CUALQUIER cambio publicado, sin reinstalar la app (mismo
// mecanismo que apps/web).
function estamparBuildIdEnSW(): Plugin {
  return {
    name: 'estampar-build-id-sw',
    apply: 'build',
    closeBundle() {
      const buildId = Date.now().toString(36);
      const swPath = path.resolve(__dirname, 'dist/sw-panel.js');
      try {
        const original = fs.readFileSync(swPath, 'utf8');
        const marcado = original.replace(
          /const BUILD_ID = '[^']*';/,
          `const BUILD_ID = '${buildId}';`,
        );
        fs.writeFileSync(swPath, marcado);
        console.log(`[sw] BUILD_ID estampado en dist/sw-panel.js: ${buildId}`);
      } catch {
        /* si dist/sw-panel.js no existe, no hacer nada */
      }
    },
  };
}

// Sube source maps a Sentry en el build de producción (Vercel) para que los
// stack traces muestren el código original. Solo se activa con SENTRY_AUTH_TOKEN
// + SENTRY_ORG (en dev/local no corre). Inyecta el `release` (commit de Vercel)
// y borra los .map del output tras subirlos, así no se sirven públicamente.
const subirSourceMapsSentry = process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: 'anunciaya-admin',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
    ]
  : [];

// Config espejo de apps/web. El Panel corre en el puerto 3100 (web usa 3000) y
// reusa el proxy /api → backend local para evitar CORS en desarrollo.
export default defineConfig({
  plugins: [react(), estamparBuildIdEnSW(), ...subirSourceMapsSentry],
  build: {
    sourcemap: Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 3100,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // El backend valida el header `Origin` y en dev su allowlist solo incluye
        // el puerto de la web (:3000), no el del Panel. Quitamos `Origin` en el
        // proxy para que la petición llegue al backend "sin origin", caso que su
        // CORS ya permite (igual que Postman/curl). Así NO hay que tocar apps/api;
        // en producción el dominio del Panel se sumará al CORS por separado.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
          });
        },
      },
    },
  },
});
