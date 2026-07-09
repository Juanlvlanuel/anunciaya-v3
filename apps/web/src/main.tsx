import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NotificacionesProviderConInicializador as NotificacionesProvider } from './utils/notificaciones';
import './config/i18n';
import App from './App';
import './index.css';
import { iniciarSincronizacionTokens } from './stores/useAuthStore'; // ← AGREGAR ESTA LÍNEA
import { inicializarPWAInstall } from './stores/usePWAInstallStore';
import { esHostScanYA } from './config/scanya';
import { inicializarSentryWeb } from './config/sentry';

// Error tracking (solo en producción; inerte en dev). Lo antes posible.
inicializarSentryWeb();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Iniciar sincronización de tokens entre pestañas
// ⚠️ NO iniciar en modo preview (iframe de Business Studio) para evitar ping-pong
const esPreviewIframe = new URLSearchParams(window.location.search).has('preview');
// En el subdominio de ScanYA (s.anunciaya.mx) el bundle corre en modo ScanYA-only:
// no se ofrece instalar AnunciaYA ni se registra su service worker.
const esSubdominioScanYA = esHostScanYA();

if (!esPreviewIframe) {
  iniciarSincronizacionTokens();
  // Capturar `beforeinstallprompt` cuanto antes para poder ofrecer la
  // instalación de la PWA principal (banner + ítem del menú).
  // En el subdominio de ScanYA NO aplica (ahí se instala ScanYA, no AnunciaYA).
  if (!esSubdominioScanYA) {
    inicializarPWAInstall();
  }
}

// ==========================================
// Registrar Service Worker de ScanYA / AnunciaYA PWA
// ==========================================
// SOLO en producción (build). En DESARROLLO un Service Worker registrado
// intercepta los módulos del dev server de Vite (`/node_modules/.vite/deps/…`)
// y, al tomar el control a mitad de la primera carga, puede devolver el
// index.html (MIME `text/html`) para un módulo JS → error "Expected a
// JavaScript-or-Wasm module script…" → pantalla en blanco la primera vez que
// se entra a una ruta (p. ej. ScanYA). Por eso en dev NO se registra y, además,
// se desregistra cualquier SW que haya quedado de una sesión previa.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD && location.protocol === 'https:') {
    // Cuando un Service Worker NUEVO toma el control (tras publicar cambios),
    // recargar UNA sola vez para mostrar la versión nueva. Solo si ya había un SW
    // controlando la página (así no se recarga en la primera instalación).
    if (navigator.serviceWorker.controller) {
      let recargando = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recargando) return;
        recargando = true;
        window.location.reload();
      });
    }

    window.addEventListener('load', () => {
      // Service Worker de AnunciaYA (PWA principal - scope raíz).
      // En el subdominio de ScanYA NO se registra: ahí la PWA es ScanYA.
      if (!esSubdominioScanYA) {
        navigator.serviceWorker
          .register('/sw-anunciaya.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA AnunciaYA] Service Worker registrado:', registration.scope);
            // Buscar versión nueva del SW: cada 30 min y cada vez que la PWA
            // vuelve al primer plano (así la última versión se aplica pronto).
            const buscarActualizacion = () => registration.update().catch(() => {});
            setInterval(buscarActualizacion, 30 * 60 * 1000);
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') buscarActualizacion();
            });
          })
          .catch((error) => {
            console.error('[PWA AnunciaYA] Error registrando Service Worker:', error);
          });
      }

      // Service Worker de ScanYA (PWA punto de venta - scope /scanya/)
      navigator.serviceWorker
        .register('/sw-scanya.js', { scope: '/scanya/' })
        .then((registration) => {
          console.log('[PWA ScanYA] Service Worker registrado:', registration.scope);

          // Buscar versión nueva del SW: cada 30 min y cada vez que la PWA vuelve
          // al primer plano (igual que AnunciaYA), para que la última versión se
          // aplique pronto sin reinstalar la app.
          const buscarActualizacion = () => registration.update().catch(() => {});
          setInterval(buscarActualizacion, 30 * 60 * 1000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') buscarActualizacion();
          });
        })
        .catch((error) => {
          console.error('[PWA ScanYA] Error registrando Service Worker:', error);
        });
    });
  } else {
    // DESARROLLO: asegurar que NO quede ningún SW interceptando el dev server.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <NotificacionesProvider>  {/* ← AGREGAR ESTO */}
        <App />
      </NotificacionesProvider>  {/* ← AGREGAR ESTO */}
    </GoogleOAuthProvider>
  </React.StrictMode>
);