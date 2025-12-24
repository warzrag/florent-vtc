// Service Worker pour Florent VTC PWA
const CACHE_NAME = 'florent-vtc-v1';
const STATIC_CACHE = 'florent-vtc-static-v1';

// Fichiers à mettre en cache lors de l'installation
const STATIC_FILES = [
  '/',
  '/index.html',
  '/reserver.html',
  '/logo-florent-vtc.svg',
  '/photo/tesla-face.jpg',
  '/photo/tesla-angle.jpg',
  '/photo/tesla-side.jpg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('[SW] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation terminée');
      return self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Ignorer les requêtes vers les APIs externes
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('maps.googleapis.com') ||
      url.hostname.includes('googletagmanager.com') ||
      url.hostname.includes('project-osrm.org') ||
      url.hostname.includes('wa.me')) {
    return;
  }

  // Stratégie pour les fichiers HTML : Network First (toujours essayer le réseau d'abord)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cloner la réponse pour la mettre en cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si le réseau échoue, utiliser le cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stratégie pour les ressources statiques : Cache First
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          // Ne pas mettre en cache les réponses invalides
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cloner la réponse pour la mettre en cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
  );
});

// Gestion des messages depuis le client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
