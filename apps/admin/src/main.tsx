import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { aplicarTemaInicial } from './utils/tema';
import { inicializarPWAInstallPanel } from './stores/usePWAInstallPanelStore';
import { inicializarSentryPanel } from './config/sentry';
import './index.css';

// Error tracking (solo en producción; inerte en dev). Lo antes posible.
inicializarSentryPanel();

// MapLibre emite "Expected value to be of type number, but found null" al parsear tiles del estilo
// base de OpenFreeMap (features de calles/edificios sin una propiedad numérica que una capa del
// estilo evalúa). Es BENIGNO —el mapa se dibuja igual— pero ruidoso al volar entre ciudades; el
// estilo es remoto y no lo controlamos, así que silenciamos solo ese mensaje exacto.
const RUIDO_MAPLIBRE = 'Expected value to be of type number, but found null';
function silenciarRuidoMapLibre(metodo: 'warn' | 'error') {
  const original = console[metodo].bind(console);
  console[metodo] = (...args: unknown[]) => {
    const primero = args[0];
    const texto = typeof primero === 'string' ? primero : primero instanceof Error ? primero.message : '';
    if (texto.includes(RUIDO_MAPLIBRE)) return;
    original(...args);
  };
}
silenciarRuidoMapLibre('warn');
silenciarRuidoMapLibre('error');

// Aplica el tema guardado (o la preferencia del sistema) antes del primer render
// para evitar un parpadeo claro→oscuro.
aplicarTemaInicial();

// PWA: registrar el service worker para que el Panel sea instalable (standalone)
// y se auto-actualice en cada deploy sin reinstalar (mismo mecanismo que apps/web).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Cuando un SW NUEVO toma el control (tras publicar cambios), recargar UNA sola
  // vez. Solo si ya había un SW controlando (no en la primera instalación).
  if (navigator.serviceWorker.controller) {
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando) return;
      recargando = true;
      window.location.reload();
    });
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-panel.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA Panel] Service Worker registrado:', registration.scope);
        // Buscar versión nueva del SW: cada 30 min y al volver al primer plano,
        // para que la última versión se aplique pronto.
        const buscarActualizacion = () => registration.update().catch(() => {});
        setInterval(buscarActualizacion, 30 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') buscarActualizacion();
        });
      })
      .catch((error) => {
        console.error('[PWA Panel] Error registrando Service Worker:', error);
      });
  });
}

// Capturar `beforeinstallprompt` cuanto antes para poder ofrecer la instalación.
inicializarPWAInstallPanel();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
