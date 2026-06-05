import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Config espejo de apps/web. El Panel corre en el puerto 3100 (web usa 3000) y
// reusa el proxy /api → backend local para evitar CORS en desarrollo.
export default defineConfig({
  plugins: [react()],
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
