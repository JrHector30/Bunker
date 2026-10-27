const CACHE_NAME = 'bunker-v2';

// Instalar y activar inmediatamente sin esperar
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Limpiar cachés viejos y tomar control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Fetch
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // No interceptar peticiones que no sean GET
  if (request.method !== 'GET') return;

  // 1. PÁGINAS HTML / NAVEGACIÓN: NETWORK-FIRST
  // Esto garantiza que con F5 siempre se obtenga la versión más reciente desplegada en Vercel,
  // evitando que la web quede en pantalla blanca por scripts antiguos borrados tras un nuevo deploy.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay internet (offline), responder con el caché guardado
          return caches.match(request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 2. RECURSOS ESTÁTICOS (JS, CSS, IMÁGENES): STALE-WHILE-REVALIDATE / NETWORK-FIRST
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
