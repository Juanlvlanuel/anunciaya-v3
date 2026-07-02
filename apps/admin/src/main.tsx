import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { aplicarTemaInicial } from './utils/tema';
import { inicializarPWAInstallPanel } from './stores/usePWAInstallPanelStore';
import './index.css';

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

// PWA: registrar el service worker para que el Panel sea instalable (standalone).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-panel.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA Panel] Service Worker registrado:', registration.scope);
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
