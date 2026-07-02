// Service Worker mínimo del Panel AnunciaYA
// Solo habilita el modo standalone (PWA instalable). No cachea nada.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No interceptar nada — el navegador maneja todas las peticiones.
});
