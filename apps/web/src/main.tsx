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
// Registrar Service Worker de ScanYA PWA
// ==========================================
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    // Service Worker de AnunciaYA (PWA principal - scope raíz).
    // En el subdominio de ScanYA NO se registra: ahí la PWA es ScanYA.
    if (!esSubdominioScanYA) {
      navigator.serviceWorker
        .register('/sw-anunciaya.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA AnunciaYA] Service Worker registrado:', registration.scope);
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
        
        // Verificar actualizaciones cada 1 hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[PWA ScanYA] Error registrando Service Worker:', error);
      });
  });
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