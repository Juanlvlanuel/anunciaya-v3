// Service Worker de ScanYA PWA
// Maneja cache de assets y funcionalidad offline

// BUILD_ID lo reemplaza Vite en cada build (plugin `estamparBuildIdEnSW` en
// vite.config.ts). Al cambiar en cada deploy, el navegador ve un SW "nuevo" y
// la PWA de ScanYA se auto-actualiza con cualquier cambio publicado, igual que
// AnunciaYA — sin tener que reinstalar la app.
const BUILD_ID = 'dev';
const CACHE_NAME = `scanya-${BUILD_ID}`;
const STATIC_ASSETS = [
  '/scanya/login',
  '/icons/scanya-192.png',
  '/icons/scanya-512.png',
];

// URL del backend (Render)
const API_BASE = 'https://anunciaya-api.onrender.com';

// ==========================================
// INSTALACIÓN - Cachear assets estáticos
// ==========================================
self.addEventListener('install', (event) => {
  console.log('[ScanYA SW] Instalando Service Worker...');
  
  // Tolerante a fallos: si un asset da 404 NO debe tumbar la instalación del SW
  // (un install fallido deja a la PWA sin SW y Chrome la marca como NO instalable).
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ScanYA SW] Cacheando assets estáticos');
      return Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
    })
  );

  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// ==========================================
// ACTIVACIÓN - Limpiar caches antiguos
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('[ScanYA SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[ScanYA SW] Eliminando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Tomar control de todas las páginas inmediatamente
  self.clients.claim();
});

// ==========================================
// FETCH - Estrategias de cache
// ==========================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo manejar requests dentro de /scanya o a la API
  if (!url.pathname.startsWith('/scanya') && !url.origin.includes('anunciaya-api')) {
    return;
  }
  
  // ==========================================
  // ESTRATEGIA 1: API Calls - Network First
  // ==========================================
  if (url.origin.includes('anunciaya-api') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      // Timeout de 35 segundos para cold starts de Render
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 35000)
        )
      ])
        .then((response) => {
          // Cachear respuestas exitosas de GET
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla o timeout, intentar desde cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[ScanYA SW] Usando respuesta cacheada para:', url.pathname);
              return cachedResponse;
            }
            // Si no hay cache, retornar error
            return new Response(
              JSON.stringify({ 
                error: 'Sin conexión y sin cache disponible',
                offline: true 
              }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }
  
  // ==========================================
  // ESTRATEGIA 2: Navegación (documento HTML) - Network First
  // ==========================================
  // El HTML de ScanYA (p. ej. /scanya/login) referencia los bundles con hash de
  // CADA build. Si se sirviera cacheado tras un deploy, apuntaría a /assets/[hash
  // viejo].js que ya no existen → el server devuelve index.html (text/html) para
  // ese módulo JS → error de MIME → PANTALLA EN BLANCO la primera vez (y al
  // refrescar la caché ya se actualizó en background). Network-first evita servir
  // HTML viejo: siempre trae el documento fresco; sin conexión, cae a la caché.
  const esNavegacion =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');
  if (esNavegacion) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((c) => c || caches.match('/scanya/login'))
        )
    );
    return;
  }

  // ==========================================
  // ESTRATEGIA 3: Assets Estáticos (íconos, etc.) - Cache First
  // ==========================================
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualizar cache en background
        fetch(event.request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {
          // Ignorar errores de actualización en background
        });
        return cachedResponse;
      }
      
      // Si no está en cache, traer de red y cachear
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// ==========================================
// PUSH NOTIFICATIONS — mensajes de ChatYA con ScanYA cerrada/congelada
// ==========================================
// El backend (push.service.ts) manda un JSON { titulo, cuerpo, url, tag, badge }.
// En móvil el sistema congela la app en 2º plano, así que este push es la única
// vía para avisar; despierta al SW sin depender de que ScanYA esté corriendo.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { cuerpo: event.data ? event.data.text() : '' };
  }

  const titulo = payload.titulo || 'ScanYA';
  const options = {
    body: payload.cuerpo || 'Tienes un mensaje nuevo',
    icon: '/icons/anunciaya-192.png',
    badge: '/icons/anunciaya-badge.png',
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    // ScanYA abre siempre su propia pantalla (ChatYA es flotante ahí), no la
    // url de AnunciaYA (/inicio?chat=...) que trae el payload.
    data: { url: '/scanya' },
    vibrate: [150, 75, 150],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(titulo, options);
      if (typeof payload.badge === 'number' && 'setAppBadge' in navigator) {
        try {
          if (payload.badge > 0) await navigator.setAppBadge(payload.badge);
          else await navigator.clearAppBadge();
        } catch {
          /* navegador sin soporte o sin permiso */
        }
      }
    })()
  );
});

// ==========================================
// NOTIFICATION CLICK
// ==========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[ScanYA SW] Notificación clickeada');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/scanya')
  );
});

// ==========================================
// SYNC (Background Sync - Futuro)
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-recordatorios') {
    console.log('[ScanYA SW] Sincronizando recordatorios...');
    event.waitUntil(syncRecordatorios());
  }
});

async function syncRecordatorios() {
  // Placeholder para sincronización de recordatorios offline
  console.log('[ScanYA SW] Sincronización de recordatorios pendiente...');
}

// ==========================================
// MESSAGE (Comunicación con la app)
// ==========================================
self.addEventListener('message', (event) => {
  console.log('[ScanYA SW] Mensaje recibido:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

console.log('[ScanYA SW] Service Worker cargado correctamente');