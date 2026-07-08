// Service Worker de AnunciaYA (PWA principal)
// ============================================
// Objetivo: que las actualizaciones publicadas se vean pronto, sin quedar
// atrapado en una versión vieja cacheada en la PWA instalada.
//
// Estrategia:
//  - Navegación (documento HTML): NETWORK-FIRST. Siempre trae el index.html
//    fresco de la red (así apunta a los bundles nuevos con hash). Sin conexión,
//    usa la última copia cacheada (offline básico).
//  - Bundles de Vite (/assets/…): CACHE-FIRST. Llevan hash en el nombre (cambia
//    en cada build), así que cachearlos es seguro y rápido.
//  - Todo lo demás (API en Render, R2, fuentes, imágenes, /scanya/…): PASS-THROUGH.
//  - skipWaiting + clients.claim: el SW nuevo toma control de inmediato.

// BUILD_ID lo reemplaza Vite en cada build (plugin `estamparBuildIdEnSW` en
// vite.config.ts). Al cambiar en cada deploy, el navegador ve un SW "nuevo" y
// dispara la auto-actualización de la PWA con cualquier cambio publicado.
const BUILD_ID = 'dev';
const CACHE = `anunciaya-app-${BUILD_ID}`;

self.addEventListener('install', () => {
  // Activar la versión nueva sin esperar a que se cierren las pestañas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar SOLO cachés viejas de esta app (no tocar la de ScanYA, que
      // comparte el mismo origen con su propio prefijo).
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('anunciaya-app-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Solo mismo origen. API (Render), R2 y cualquier cross-origin pasan directo.
  if (url.origin !== self.location.origin) return;

  // ScanYA tiene su propio service worker (scope /scanya/): no interferir.
  if (url.pathname.startsWith('/scanya')) return;

  // Navegación (documento HTML): network-first → versión siempre fresca.
  const esNavegacion =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (esNavegacion) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match('/index.html');
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Bundles con hash de Vite: cache-first (inmutables).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Resto (manifest, íconos, fuentes, imágenes públicas, …): no interceptar.
});

// ============================================================================
// WEB PUSH — notificaciones de ChatYA con la PWA en segundo plano
// ============================================================================
// El backend (push.service.ts) manda un JSON: { titulo, cuerpo, url, tag, badge }.
// Aquí se pinta la notificación del sistema (el SO decide sonido/vibración) y
// se actualiza el badge del ícono de la app (Android / PWA instalada).
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { cuerpo: event.data ? event.data.text() : '' };
  }

  const titulo = payload.titulo || 'AnunciaYA';
  const opciones = {
    body: payload.cuerpo || 'Tienes un mensaje nuevo',
    icon: '/icons/anunciaya-192.png',
    badge: '/icons/anunciaya-192.png',
    tag: payload.tag || undefined,
    // renotify: si llega otro mensaje del mismo chat (mismo tag), vuelve a avisar.
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/inicio' },
    vibrate: [150, 75, 150],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(titulo, opciones);
      // Badge numérico sobre el ícono de la app (no leídos totales).
      if (typeof payload.badge === 'number' && 'setAppBadge' in navigator) {
        try {
          if (payload.badge > 0) await navigator.setAppBadge(payload.badge);
          else await navigator.clearAppBadge();
        } catch {
          /* navegador sin soporte o sin permiso: ignorar */
        }
      }
    })(),
  );
});

// Al tocar la notificación: enfocar la app si ya está abierta, o abrirla.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/inicio';
  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const cliente of clientes) {
        if ('focus' in cliente) {
          await cliente.focus();
          // La app puede escuchar esto para abrir ChatYA en la conversación.
          cliente.postMessage({ type: 'PUSH_CLICK', url });
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })(),
  );
});

// La app pide actualizar/limpiar el badge del ícono (ej. al leer los mensajes).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SET_BADGE' && 'setAppBadge' in navigator) {
    const n = typeof data.count === 'number' ? data.count : 0;
    if (n > 0) navigator.setAppBadge(n).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  }
});
