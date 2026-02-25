import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NotificacionesProviderConInicializador as NotificacionesProvider } from './utils/notificaciones';
import './config/i18n';
import App from './App';
import './index.css';
import { iniciarSincronizacionTokens } from './stores/useAuthStore'; // ← AGREGAR ESTA LÍNEA

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Iniciar sincronización de tokens entre pestañas
// ⚠️ NO iniciar en modo preview (iframe de Business Studio) para evitar ping-pong
const esPreviewIframe = new URLSearchParams(window.location.search).has('preview');
if (!esPreviewIframe) {
  iniciarSincronizacionTokens();
}

// ==========================================
// Registrar Service Worker de ScanYA PWA
// ==========================================
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    // Service Worker de AnunciaYA (PWA principal - scope raíz)
    navigator.serviceWorker
      .register('/sw-anunciaya.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA AnunciaYA] Service Worker registrado:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA AnunciaYA] Error registrando Service Worker:', error);
      });

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