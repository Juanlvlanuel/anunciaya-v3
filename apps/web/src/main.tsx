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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <NotificacionesProvider>  {/* ← AGREGAR ESTO */}
        <App />
      </NotificacionesProvider>  {/* ← AGREGAR ESTO */}
    </GoogleOAuthProvider>
  </React.StrictMode>
);