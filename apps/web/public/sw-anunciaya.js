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
