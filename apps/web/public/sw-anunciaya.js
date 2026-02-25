// Service Worker mínimo de AnunciaYA
// Solo para habilitar modo standalone (PWA)
// No cachea nada — es solo desarrollo

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No interceptar nada — dejar que el navegador maneje todo
});