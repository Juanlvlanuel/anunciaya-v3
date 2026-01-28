import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NotificacionesProviderConInicializador as NotificacionesProvider } from './utils/notificaciones';
import './config/i18n';
import App from './App';
import './index.css';
import { iniciarSincronizacionTokens } from './stores/useAuthStore'; // ← AGREGAR ESTA LÍNEA

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Iniciar sincronización de tokens entre pestañas ← AGREGAR ESTE COMENTARIO
iniciarSincronizacionTokens(); // ← AGREGAR ESTA LÍNEA

// ==========================================
// Registrar Service Worker de ScanYA PWA
// ==========================================
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-scanya.js', { scope: '/scanya/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope);
        
        // Verificar actualizaciones cada 1 hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[PWA] Error registrando Service Worker:', error);
      });
  });
} else if (import.meta.env.DEV) {
  console.log('[PWA] Service Worker no registrado (desarrollo o HTTP)');
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