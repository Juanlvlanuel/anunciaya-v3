// Service Worker de ScanYA PWA
// Maneja cache de assets y funcionalidad offline

const CACHE_NAME = 'scanya-v1';
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
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ScanYA SW] Cacheando assets estáticos');
      return cache.addAll(STATIC_ASSETS);
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
  // ESTRATEGIA 2: Assets Estáticos - Cache First
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
// PUSH NOTIFICATIONS (Futuro)
// ==========================================
self.addEventListener('push', (event) => {
  console.log('[ScanYA SW] Push recibido:', event.data?.text());
  
  const options = {
    body: event.data?.text() || 'Tienes una nueva notificación',
    icon: '/icons/scanya-192.png',
    badge: '/icons/scanya-badge.png',
    vibrate: [200, 100, 200],
    tag: 'scanya-notification',
    requireInteraction: false,
  };
  
  event.waitUntil(
    self.registration.showNotification('ScanYA', options)
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